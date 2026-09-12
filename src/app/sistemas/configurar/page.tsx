"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import {
  FORMATIONS,
  getFormationPositions,
  templateKey,
  type Formation,
  type FormationPlayer,
  type BlockHeight,
  type Posture,
  type TemplatePlayer,
} from "@/lib/formations";
import { Pitch, FIELD, clientToField } from "@/components/pitch";
import {
  getFormationTemplates,
  saveFormationTemplate,
  deleteFormationTemplate,
} from "@/lib/api";

const BLOCK_OPTIONS: { value: BlockHeight; label: string }[] = [
  { value: "alto", label: "Alto" },
  { value: "medio", label: "Medio" },
  { value: "bajo", label: "Bajo" },
];

export default function ConfigurarPosicionesPage() {
  const [formation, setFormation] = useState<Formation>("1-4-3-3");
  const [posture, setPosture] = useState<Posture>("attack");
  const [blockHeight, setBlockHeight] = useState<BlockHeight>("medio");

  const [templates, setTemplates] = useState<Map<string, TemplatePlayer[]>>(new Map());
  const [players, setPlayers] = useState<FormationPlayer[]>([]);
  const [dragging, setDragging] = useState<string | null>(null);
  const draggingRef = useRef<string | null>(null);
  const [saving, setSaving] = useState(false);

  const loadTemplates = useCallback(async () => {
    const list = await getFormationTemplates();
    const m = new Map<string, TemplatePlayer[]>();
    list.forEach((t) =>
      m.set(templateKey(t.formation as Formation, t.posture as Posture, t.block_height as BlockHeight), t.players)
    );
    setTemplates(m);
    return m;
  }, []);

  useEffect(() => {
    loadTemplates().catch(console.error);
  }, [loadTemplates]);

  useEffect(() => {
    setPlayers(getFormationPositions(formation, "own", posture, blockHeight, templates));
  }, [formation, posture, blockHeight, templates]);

  const hasTemplate = templates.has(templateKey(formation, posture, blockHeight));

  const handleMouseDown = (id: string) => {
    draggingRef.current = id;
    setDragging(id);
  };

  const handleMouseMove = (e: React.MouseEvent<SVGSVGElement>) => {
    const id = draggingRef.current;
    if (!id) return;
    const { x, y } = clientToField(e.currentTarget, e.clientX, e.clientY);
    const cx = Math.max(2, Math.min(FIELD.W - 2, x));
    const cy = Math.max(2, Math.min(FIELD.H - 2, y));
    setPlayers((prev) => prev.map((p) => (p.id === id ? { ...p, x: cx, y: cy } : p)));
  };

  const handleMouseUp = () => {
    draggingRef.current = null;
    setDragging(null);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await saveFormationTemplate(
        formation,
        posture,
        blockHeight,
        players.map((p) => ({ number: p.number, x: p.x, y: p.y }))
      );
      await loadTemplates();
    } catch (err) {
      console.error("Error saving template:", err);
    } finally {
      setSaving(false);
    }
  };

  const handleReset = async () => {
    try {
      await deleteFormationTemplate(formation, posture, blockHeight);
      const m = await loadTemplates();
      setPlayers(getFormationPositions(formation, "own", posture, blockHeight, m));
    } catch (err) {
      console.error("Error resetting template:", err);
    }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Sistemas de juego</h1>
          <div className="flex items-center gap-4 mt-2 text-sm">
            <Link href="/sistemas" className="text-muted hover:text-foreground-secondary">Mis sistemas</Link>
            <Link href="/sistemas/enfrentar" className="text-muted hover:text-foreground-secondary">Enfrentar sistemas</Link>
            <span className="text-indigo-400 font-medium border-b-2 border-indigo-400 pb-0.5">Configurar posiciones</span>
          </div>
        </div>
      </div>

      <p className="text-sm text-foreground-secondary mb-4 max-w-2xl">
        Ajusta la posición exacta de cada sistema, fase y altura de bloque. El cambio se aplica automáticamente en
        &ldquo;Enfrentar sistemas&rdquo; siempre que se use esa combinación — no se guarda como situación ni archivo nuevo.
      </p>

      <div className="flex gap-6">
        {/* CAMPO */}
        <div className="flex-1 min-w-0">
          <div className="bg-surface rounded-xl border border-border p-4">
            <div className="flex items-center justify-between mb-3">
              <p className="text-sm font-medium text-foreground-secondary flex items-center gap-2">
                {formation} · {posture === "attack" ? "ataque" : "defensa"} · bloque {blockHeight}
                {hasTemplate && (
                  <span className="text-[10px] text-emerald-400 font-semibold">● PERSONALIZADO</span>
                )}
              </p>
              <div className="flex items-center gap-2">
                <button
                  onClick={handleSave}
                  disabled={saving}
                  className="px-3 py-1.5 bg-indigo-600 text-white rounded-lg text-xs font-medium hover:bg-indigo-700 disabled:opacity-40 transition-colors"
                >
                  {saving ? "Guardando..." : "Guardar posición"}
                </button>
                {hasTemplate && (
                  <button
                    onClick={handleReset}
                    className="px-3 py-1.5 bg-surface-hover border border-border rounded-lg text-xs font-medium text-foreground-secondary hover:border-red-400 transition-colors"
                  >
                    Restablecer
                  </button>
                )}
              </div>
            </div>
            <Pitch
              className="rounded-lg"
              onMouseMove={handleMouseMove}
              onMouseUp={handleMouseUp}
              onMouseLeave={handleMouseUp}
            >
              {players.map((p) => (
                <g
                  key={p.id}
                  onMouseDown={() => handleMouseDown(p.id)}
                  style={{ cursor: dragging === p.id ? "grabbing" : "grab" }}
                >
                  <circle
                    cx={p.x}
                    cy={p.y}
                    r="2.6"
                    fill="#4f46e5"
                    stroke="white"
                    strokeWidth="0.4"
                    opacity={dragging === p.id ? 0.85 : 1}
                  />
                  <text
                    x={p.x}
                    y={p.y + 0.9}
                    textAnchor="middle"
                    fill="white"
                    fontSize="2.2"
                    fontWeight="bold"
                    style={{ pointerEvents: "none" }}
                  >
                    {p.number}
                  </text>
                </g>
              ))}
            </Pitch>
          </div>
        </div>

        {/* CONFIGURACIÓN */}
        <div className="w-72 flex-shrink-0 space-y-4">
          <div className="bg-surface rounded-xl border border-border overflow-hidden">
            <div className="px-4 py-3 border-b border-surface-hover">
              <h3 className="text-sm font-semibold text-foreground">Sistema</h3>
            </div>
            <div className="p-4 space-y-3">
              <select
                value={formation}
                onChange={(e) => setFormation(e.target.value as Formation)}
                className="w-full px-3 py-2 border border-border rounded-lg text-sm bg-surface-hover text-foreground focus:outline-none focus:border-indigo-400"
              >
                {FORMATIONS.map((f) => (
                  <option key={f} value={f}>{f}</option>
                ))}
              </select>

              <div>
                <label className="text-[10px] text-muted uppercase tracking-wide font-medium block mb-1">Fase</label>
                <div className="flex gap-2">
                  <button
                    onClick={() => setPosture("attack")}
                    className={`flex-1 px-2 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                      posture === "attack" ? "bg-indigo-600 text-white" : "bg-surface-hover border border-border text-foreground-secondary hover:border-indigo-300"
                    }`}
                  >
                    Ataque
                  </button>
                  <button
                    onClick={() => setPosture("defense")}
                    className={`flex-1 px-2 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                      posture === "defense" ? "bg-indigo-600 text-white" : "bg-surface-hover border border-border text-foreground-secondary hover:border-indigo-300"
                    }`}
                  >
                    Defensa
                  </button>
                </div>
              </div>

              <div>
                <label className="text-[10px] text-muted uppercase tracking-wide font-medium block mb-1">Altura de bloque</label>
                <div className="flex gap-2">
                  {BLOCK_OPTIONS.map((b) => (
                    <button
                      key={b.value}
                      onClick={() => setBlockHeight(b.value)}
                      className={`flex-1 px-2 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                        blockHeight === b.value ? "bg-indigo-600 text-white" : "bg-surface-hover border border-border text-foreground-secondary hover:border-indigo-300"
                      }`}
                    >
                      {b.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {templates.size > 0 && (
            <div className="bg-surface rounded-xl border border-border overflow-hidden">
              <div className="px-4 py-3 border-b border-surface-hover">
                <h3 className="text-sm font-semibold text-foreground">Personalizados ({templates.size})</h3>
              </div>
              <div className="p-3 space-y-1 max-h-64 overflow-y-auto">
                {Array.from(templates.keys()).map((k) => {
                  const [f, p, b] = k.split("|");
                  const active = k === templateKey(formation, posture, blockHeight);
                  return (
                    <button
                      key={k}
                      onClick={() => {
                        setFormation(f as Formation);
                        setPosture(p as Posture);
                        setBlockHeight(b as BlockHeight);
                      }}
                      className={`w-full text-left px-2 py-1.5 rounded text-xs transition-colors ${
                        active ? "bg-surface-hover text-foreground" : "text-foreground-secondary hover:bg-surface-hover"
                      }`}
                    >
                      {f} · {p === "attack" ? "ataque" : "defensa"} · {b}
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
