"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import {
  FORMATIONS,
  POSITION_LABELS,
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
  getSystemClashes,
  createSystemClash,
  deleteSystemClash,
  getFormationTemplates,
  saveFormationTemplate,
  deleteFormationTemplate,
  type SystemClash,
} from "@/lib/api";

type Matchup = "own-attack" | "rival-attack";

const BLOCK_OPTIONS: { value: BlockHeight; label: string }[] = [
  { value: "alto", label: "Alto" },
  { value: "medio", label: "Medio" },
  { value: "bajo", label: "Bajo" },
];

function FormationSelect({
  label,
  value,
  onChange,
}: {
  label: string;
  value: Formation;
  onChange: (v: Formation) => void;
}) {
  return (
    <div>
      <label className="text-[10px] text-muted uppercase tracking-wide font-medium block mb-1">{label}</label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value as Formation)}
        className="w-full px-3 py-2 border border-border rounded-lg text-sm bg-surface-hover text-foreground focus:outline-none focus:border-indigo-400"
      >
        {FORMATIONS.map((f) => (
          <option key={f} value={f}>{f}</option>
        ))}
      </select>
    </div>
  );
}

function ColorField({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <div className="flex-1 flex items-center justify-between gap-2 min-w-0">
      <label className="text-[10px] text-muted uppercase tracking-wide font-medium truncate">{label}</label>
      <input
        type="color"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-8 h-8 flex-shrink-0 rounded border border-border bg-transparent cursor-pointer"
      />
    </div>
  );
}

function BlockHeightPicker({ value, onChange }: { value: BlockHeight; onChange: (v: BlockHeight) => void }) {
  return (
    <div>
      <label className="text-[10px] text-muted uppercase tracking-wide font-medium block mb-1">Altura de bloque</label>
      <div className="flex gap-2">
        {BLOCK_OPTIONS.map((b) => (
          <button
            key={b.value}
            onClick={() => onChange(b.value)}
            className={`flex-1 px-2 py-1.5 rounded-lg text-xs font-medium transition-colors ${
              value === b.value ? "bg-indigo-600 text-white" : "bg-surface-hover border border-border text-foreground-secondary hover:border-indigo-300"
            }`}
          >
            {b.label}
          </button>
        ))}
      </div>
    </div>
  );
}

export default function EnfrentarSistemasPage() {
  const [ownAttack, setOwnAttack] = useState<Formation>("1-4-3-3");
  const [ownDefense, setOwnDefense] = useState<Formation>("1-4-4-2");
  const [rivalAttack, setRivalAttack] = useState<Formation>("1-4-2-3-1");
  const [rivalDefense, setRivalDefense] = useState<Formation>("1-4-4-2");
  const [matchup, setMatchup] = useState<Matchup>("own-attack");
  const [ownBlockHeight, setOwnBlockHeight] = useState<BlockHeight>("medio");
  const [rivalBlockHeight, setRivalBlockHeight] = useState<BlockHeight>("medio");

  const [ownFillColor, setOwnFillColor] = useState("#2563eb");
  const [ownTextColor, setOwnTextColor] = useState("#ffffff");
  const [rivalFillColor, setRivalFillColor] = useState("#e11d48");
  const [rivalTextColor, setRivalTextColor] = useState("#ffffff");

  const activeOwnFormation = matchup === "own-attack" ? ownAttack : ownDefense;
  const activeOwnPosture = matchup === "own-attack" ? "attack" : "defense";
  const activeRivalFormation = matchup === "own-attack" ? rivalDefense : rivalAttack;
  const activeRivalPosture = matchup === "own-attack" ? "defense" : "attack";

  const [ownPlayers, setOwnPlayers] = useState<FormationPlayer[]>([]);
  const [rivalPlayers, setRivalPlayers] = useState<FormationPlayer[]>([]);
  const [dragging, setDragging] = useState<{ side: "own" | "rival"; id: string } | null>(null);
  const draggingRef = useRef<{ side: "own" | "rival"; id: string } | null>(null);

  // Desplegable de etiqueta de posición (clic derecho), igual que en "Mis sistemas"
  const [labelDropdown, setLabelDropdown] = useState<{
    scope: "own" | "rival" | "cfg";
    id: string;
    x: number;
    y: number;
  } | null>(null);
  const labelDropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!labelDropdown) return;
    const handler = (e: MouseEvent) => {
      if (labelDropdownRef.current && !labelDropdownRef.current.contains(e.target as Node)) {
        setLabelDropdown(null);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [labelDropdown]);

  const handlePlayerContextMenu = (e: React.MouseEvent, scope: "own" | "rival" | "cfg", id: string) => {
    e.preventDefault();
    e.stopPropagation();
    setLabelDropdown({ scope, id, x: e.clientX, y: e.clientY });
  };

  const handleLabelSelect = (newLabel: string) => {
    if (!labelDropdown) return;
    const { scope, id } = labelDropdown;
    const updater = (prev: FormationPlayer[]) => prev.map((p) => (p.id === id ? { ...p, label: newLabel } : p));
    if (scope === "own") setOwnPlayers(updater);
    else if (scope === "rival") setRivalPlayers(updater);
    else setCfgPlayers(updater);
    setLabelDropdown(null);
  };

  // Situaciones guardadas
  const [savedClashes, setSavedClashes] = useState<SystemClash[]>([]);
  const [saveOpen, setSaveOpen] = useState(false);
  const [saveName, setSaveName] = useState("");
  const [saveNotes, setSaveNotes] = useState("");
  const [savingClash, setSavingClash] = useState(false);

  const [templates, setTemplates] = useState<Map<string, TemplatePlayer[]>>(new Map());

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
    getSystemClashes().then(setSavedClashes).catch(console.error);
    loadTemplates().catch(console.error);
  }, [loadTemplates]);

  // ---- Configurar posiciones (embebido, no es una situación/archivo) ----
  const [configuring, setConfiguring] = useState(false);
  const [cfgFormation, setCfgFormation] = useState<Formation>("1-4-3-3");
  const [cfgPosture, setCfgPosture] = useState<Posture>("attack");
  const [cfgBlockHeight, setCfgBlockHeight] = useState<BlockHeight>("medio");
  const [cfgPlayers, setCfgPlayers] = useState<FormationPlayer[]>([]);
  const [cfgDragging, setCfgDragging] = useState<string | null>(null);
  const cfgDraggingRef = useRef<string | null>(null);
  const [cfgSaving, setCfgSaving] = useState(false);

  useEffect(() => {
    setCfgPlayers(getFormationPositions(cfgFormation, "own", cfgPosture, cfgBlockHeight, templates));
  }, [cfgFormation, cfgPosture, cfgBlockHeight, templates]);

  const cfgHasTemplate = templates.has(templateKey(cfgFormation, cfgPosture, cfgBlockHeight));

  const cfgHandleMouseDown = (id: string) => {
    cfgDraggingRef.current = id;
    setCfgDragging(id);
  };

  const cfgHandleMouseMove = (e: React.MouseEvent<SVGSVGElement>) => {
    const id = cfgDraggingRef.current;
    if (!id) return;
    const { x, y } = clientToField(e.currentTarget, e.clientX, e.clientY);
    const cx = Math.max(2, Math.min(FIELD.W - 2, x));
    const cy = Math.max(2, Math.min(FIELD.H - 2, y));
    setCfgPlayers((prev) => prev.map((p) => (p.id === id ? { ...p, x: cx, y: cy } : p)));
  };

  const cfgHandleMouseUp = () => {
    cfgDraggingRef.current = null;
    setCfgDragging(null);
  };

  const cfgHandleSave = async () => {
    setCfgSaving(true);
    try {
      await saveFormationTemplate(
        cfgFormation,
        cfgPosture,
        cfgBlockHeight,
        cfgPlayers.map((p) => ({ number: p.number, label: p.label, x: p.x, y: p.y }))
      );
      await loadTemplates();
    } catch (err) {
      console.error("Error saving template:", err);
    } finally {
      setCfgSaving(false);
    }
  };

  const cfgHandleReset = async () => {
    try {
      await deleteFormationTemplate(cfgFormation, cfgPosture, cfgBlockHeight);
      const m = await loadTemplates();
      setCfgPlayers(getFormationPositions(cfgFormation, "own", cfgPosture, cfgBlockHeight, m));
    } catch (err) {
      console.error("Error resetting template:", err);
    }
  };

  const regenerate = useCallback(() => {
    setOwnPlayers(getFormationPositions(activeOwnFormation, "own", activeOwnPosture, ownBlockHeight, templates));
    setRivalPlayers(getFormationPositions(activeRivalFormation, "rival", activeRivalPosture, rivalBlockHeight, templates));
  }, [activeOwnFormation, activeOwnPosture, activeRivalFormation, activeRivalPosture, ownBlockHeight, rivalBlockHeight, templates]);

  // Al cargar una situación guardada se aplican sus posiciones exactas;
  // esta ref evita que la regeneración automática las sobrescriba.
  const suppressRegen = useRef(false);

  useEffect(() => {
    if (suppressRegen.current) {
      suppressRegen.current = false;
      return;
    }
    regenerate();
  }, [regenerate]);

  const handleMouseDown = (side: "own" | "rival", id: string) => {
    draggingRef.current = { side, id };
    setDragging({ side, id });
  };

  const handleMouseMove = (e: React.MouseEvent<SVGSVGElement>) => {
    const current = draggingRef.current;
    if (!current) return;
    const { x, y } = clientToField(e.currentTarget, e.clientX, e.clientY);
    const clampedX = Math.max(2, Math.min(FIELD.W - 2, x));
    const clampedY = Math.max(2, Math.min(FIELD.H - 2, y));
    const setter = current.side === "own" ? setOwnPlayers : setRivalPlayers;
    setter((prev) => prev.map((p) => (p.id === current.id ? { ...p, x: clampedX, y: clampedY } : p)));
  };

  const handleMouseUp = () => {
    draggingRef.current = null;
    setDragging(null);
  };

  const handleSaveClash = async () => {
    if (!saveName.trim() || savingClash) return;
    setSavingClash(true);
    try {
      await createSystemClash({
        name: saveName.trim(),
        notes: saveNotes.trim(),
        own_attack: ownAttack,
        own_defense: ownDefense,
        rival_attack: rivalAttack,
        rival_defense: rivalDefense,
        matchup,
        own_block_height: ownBlockHeight,
        rival_block_height: rivalBlockHeight,
        own_fill_color: ownFillColor,
        own_text_color: ownTextColor,
        rival_fill_color: rivalFillColor,
        rival_text_color: rivalTextColor,
        own_players: ownPlayers,
        rival_players: rivalPlayers,
      });
      const list = await getSystemClashes();
      setSavedClashes(list);
      setSaveOpen(false);
      setSaveName("");
      setSaveNotes("");
    } catch (err) {
      console.error("Error saving clash:", err);
    } finally {
      setSavingClash(false);
    }
  };

  const loadClash = (c: SystemClash) => {
    suppressRegen.current = true;
    setOwnAttack(c.own_attack as Formation);
    setOwnDefense(c.own_defense as Formation);
    setRivalAttack(c.rival_attack as Formation);
    setRivalDefense(c.rival_defense as Formation);
    setMatchup(c.matchup as Matchup);
    setOwnBlockHeight(c.own_block_height as BlockHeight);
    setRivalBlockHeight(c.rival_block_height as BlockHeight);
    setOwnFillColor(c.own_fill_color);
    setOwnTextColor(c.own_text_color);
    setRivalFillColor(c.rival_fill_color);
    setRivalTextColor(c.rival_text_color);
    setOwnPlayers(c.own_players);
    setRivalPlayers(c.rival_players);
  };

  const handleDeleteClash = async (id: string) => {
    if (!confirm("¿Eliminar esta situación guardada?")) return;
    try {
      await deleteSystemClash(id);
      setSavedClashes((prev) => prev.filter((c) => c.id !== id));
    } catch (err) {
      console.error("Error deleting clash:", err);
    }
  };

  const matchupLabel =
    matchup === "own-attack"
      ? `${activeOwnFormation} (ataque) vs ${activeRivalFormation} (defensa · bloque ${rivalBlockHeight})`
      : `${activeRivalFormation} (ataque) vs ${activeOwnFormation} (defensa · bloque ${ownBlockHeight})`;

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Enfrentar sistemas</h1>
          <div className="flex items-center gap-4 mt-2 text-sm">
            <Link href="/sistemas" className="text-muted hover:text-foreground-secondary">Mis sistemas</Link>
            <span className="text-indigo-400 font-medium border-b-2 border-indigo-400 pb-0.5">Enfrentar sistemas</span>
          </div>
        </div>
        <button
          onClick={() => setConfiguring((v) => !v)}
          className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
            configuring ? "bg-indigo-600 text-white" : "bg-surface-hover border border-border text-foreground-secondary hover:border-indigo-300"
          }`}
        >
          ⚙ Configurar posiciones
        </button>
      </div>

      {configuring ? (
        <div>
          <p className="text-sm text-foreground-secondary mb-4 max-w-2xl">
            Ajusta la posición exacta de cada sistema, fase y altura de bloque. El cambio se aplica automáticamente
            aquí siempre que se use esa combinación — no se guarda como situación ni archivo nuevo.
          </p>
          <div className="flex gap-6">
            <div className="flex-1 min-w-0">
              <div className="bg-surface rounded-xl border border-border p-4">
                <div className="flex items-center justify-between mb-3">
                  <p className="text-sm font-medium text-foreground-secondary flex items-center gap-2">
                    {cfgFormation} · {cfgPosture === "attack" ? "ataque" : "defensa"} · bloque {cfgBlockHeight}
                    {cfgHasTemplate && <span className="text-[10px] text-emerald-400 font-semibold">● PERSONALIZADO</span>}
                  </p>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={cfgHandleSave}
                      disabled={cfgSaving}
                      className="px-3 py-1.5 bg-indigo-600 text-white rounded-lg text-xs font-medium hover:bg-indigo-700 disabled:opacity-40 transition-colors"
                    >
                      {cfgSaving ? "Guardando..." : "Guardar posición"}
                    </button>
                    {cfgHasTemplate && (
                      <button
                        onClick={cfgHandleReset}
                        className="px-3 py-1.5 bg-surface-hover border border-border rounded-lg text-xs font-medium text-foreground-secondary hover:border-red-400 transition-colors"
                      >
                        Restablecer
                      </button>
                    )}
                  </div>
                </div>
                <Pitch
                  className="rounded-lg"
                  onMouseMove={cfgHandleMouseMove}
                  onMouseUp={cfgHandleMouseUp}
                  onMouseLeave={cfgHandleMouseUp}
                >
                  {cfgPlayers.map((p) => (
                    <g
                      key={p.id}
                      onMouseDown={() => cfgHandleMouseDown(p.id)}
                      onContextMenu={(e) => handlePlayerContextMenu(e, "cfg", p.id)}
                      style={{ cursor: cfgDragging === p.id ? "grabbing" : "grab" }}
                    >
                      <circle
                        cx={p.x}
                        cy={p.y}
                        r="2.8"
                        fill="#4f46e5"
                        stroke="white"
                        strokeWidth="0.4"
                        opacity={cfgDragging === p.id ? 0.85 : 1}
                      />
                      <text
                        x={p.x}
                        y={p.y + 0.8}
                        textAnchor="middle"
                        fill="white"
                        fontSize="2"
                        fontWeight="bold"
                        style={{ pointerEvents: "none" }}
                      >
                        {p.label}
                      </text>
                    </g>
                  ))}
                </Pitch>
              </div>
            </div>

            <div className="w-72 flex-shrink-0 space-y-4">
              <div className="bg-surface rounded-xl border border-border overflow-hidden">
                <div className="px-4 py-3 border-b border-surface-hover">
                  <h3 className="text-sm font-semibold text-foreground">Sistema</h3>
                </div>
                <div className="p-4 space-y-3">
                  <select
                    value={cfgFormation}
                    onChange={(e) => setCfgFormation(e.target.value as Formation)}
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
                        onClick={() => setCfgPosture("attack")}
                        className={`flex-1 px-2 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                          cfgPosture === "attack" ? "bg-indigo-600 text-white" : "bg-surface-hover border border-border text-foreground-secondary hover:border-indigo-300"
                        }`}
                      >
                        Ataque
                      </button>
                      <button
                        onClick={() => setCfgPosture("defense")}
                        className={`flex-1 px-2 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                          cfgPosture === "defense" ? "bg-indigo-600 text-white" : "bg-surface-hover border border-border text-foreground-secondary hover:border-indigo-300"
                        }`}
                      >
                        Defensa
                      </button>
                    </div>
                  </div>

                  <BlockHeightPicker value={cfgBlockHeight} onChange={setCfgBlockHeight} />
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
                      const active = k === templateKey(cfgFormation, cfgPosture, cfgBlockHeight);
                      return (
                        <button
                          key={k}
                          onClick={() => {
                            setCfgFormation(f as Formation);
                            setCfgPosture(p as Posture);
                            setCfgBlockHeight(b as BlockHeight);
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
      ) : (
      <>
      <div className="flex gap-6">
        {/* CAMPO — elemento principal */}
        <div className="flex-1 min-w-0">
          <div className="bg-surface rounded-xl border border-border p-4">
            <div className="flex items-center justify-between mb-3">
              <p className="text-sm font-medium text-foreground-secondary">{matchupLabel}</p>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setSaveOpen((v) => !v)}
                  className="px-3 py-1.5 bg-indigo-600 text-white rounded-lg text-xs font-medium hover:bg-indigo-700 transition-colors"
                >
                  Guardar situación
                </button>
                <button
                  onClick={regenerate}
                  className="px-3 py-1.5 bg-surface-hover border border-border rounded-lg text-xs font-medium text-foreground-secondary hover:border-indigo-400 transition-colors"
                >
                  Reiniciar
                </button>
              </div>
            </div>

            {saveOpen && (
              <div className="mb-3 p-3 bg-surface-hover border border-border rounded-lg space-y-2">
                <input
                  autoFocus
                  value={saveName}
                  onChange={(e) => setSaveName(e.target.value)}
                  placeholder="Nombre de la situación (ej. Salida de presión vs bloque alto)"
                  className="w-full px-3 py-1.5 border border-border rounded text-sm bg-surface focus:outline-none focus:border-indigo-400"
                />
                <textarea
                  value={saveNotes}
                  onChange={(e) => setSaveNotes(e.target.value)}
                  placeholder="Notas de análisis (opcional)"
                  rows={2}
                  className="w-full px-3 py-1.5 border border-border rounded text-sm bg-surface focus:outline-none focus:border-indigo-400 resize-none"
                />
                <div className="flex gap-2">
                  <button
                    onClick={handleSaveClash}
                    disabled={!saveName.trim() || savingClash}
                    className="px-3 py-1.5 bg-indigo-600 text-white rounded text-xs font-medium hover:bg-indigo-700 disabled:opacity-40"
                  >
                    {savingClash ? "Guardando..." : "Guardar"}
                  </button>
                  <button
                    onClick={() => setSaveOpen(false)}
                    className="px-3 py-1.5 text-xs text-foreground-secondary"
                  >
                    Cancelar
                  </button>
                </div>
              </div>
            )}

            <Pitch
              className="rounded-lg"
              onMouseMove={handleMouseMove}
              onMouseUp={handleMouseUp}
              onMouseLeave={handleMouseUp}
            >
              {rivalPlayers.map((p) => (
                <PlayerToken key={p.id} player={p} fillColor={rivalFillColor} textColor={rivalTextColor} dragging={dragging?.id === p.id} onMouseDown={() => handleMouseDown("rival", p.id)} onContextMenu={(e) => handlePlayerContextMenu(e, "rival", p.id)} />
              ))}
              {ownPlayers.map((p) => (
                <PlayerToken key={p.id} player={p} fillColor={ownFillColor} textColor={ownTextColor} dragging={dragging?.id === p.id} onMouseDown={() => handleMouseDown("own", p.id)} onContextMenu={(e) => handlePlayerContextMenu(e, "own", p.id)} />
              ))}
            </Pitch>
            <div className="flex items-center gap-4 mt-3 text-xs text-muted">
              <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full" style={{ background: ownFillColor }} /> Equipo propio</span>
              <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full" style={{ background: rivalFillColor }} /> Equipo rival</span>
            </div>
          </div>
        </div>

        {/* CONFIGURACIÓN */}
        <div className="w-80 flex-shrink-0 space-y-4">
          <div className="bg-surface rounded-xl border border-border overflow-hidden">
            <div className="px-4 py-3 border-b border-surface-hover">
              <h3 className="text-sm font-semibold text-foreground">Equipo propio</h3>
            </div>
            <div className="p-4 space-y-3">
              <FormationSelect label="Ataque" value={ownAttack} onChange={setOwnAttack} />
              <FormationSelect label="Defensa" value={ownDefense} onChange={setOwnDefense} />
              <BlockHeightPicker value={ownBlockHeight} onChange={setOwnBlockHeight} />
              <div className="pt-3 border-t border-surface-hover flex items-center gap-3">
                <ColorField label="Círculo" value={ownFillColor} onChange={setOwnFillColor} />
                <ColorField label="Dorsal" value={ownTextColor} onChange={setOwnTextColor} />
              </div>
            </div>
          </div>

          <div className="bg-surface rounded-xl border border-border overflow-hidden">
            <div className="px-4 py-3 border-b border-surface-hover">
              <h3 className="text-sm font-semibold text-foreground">Equipo rival</h3>
            </div>
            <div className="p-4 space-y-3">
              <FormationSelect label="Ataque" value={rivalAttack} onChange={setRivalAttack} />
              <FormationSelect label="Defensa" value={rivalDefense} onChange={setRivalDefense} />
              <BlockHeightPicker value={rivalBlockHeight} onChange={setRivalBlockHeight} />
              <div className="pt-3 border-t border-surface-hover flex items-center gap-3">
                <ColorField label="Círculo" value={rivalFillColor} onChange={setRivalFillColor} />
                <ColorField label="Dorsal" value={rivalTextColor} onChange={setRivalTextColor} />
              </div>
            </div>
          </div>

          <div className="bg-surface rounded-xl border border-border overflow-hidden">
            <div className="px-4 py-3 border-b border-surface-hover">
              <h3 className="text-sm font-semibold text-foreground">Enfrentamiento</h3>
            </div>
            <div className="p-4 space-y-2">
              <button
                onClick={() => setMatchup("own-attack")}
                className={`w-full px-3 py-2 rounded-lg text-sm text-left transition-colors ${
                  matchup === "own-attack" ? "bg-indigo-600 text-white" : "bg-surface-hover border border-border text-foreground-secondary hover:border-indigo-300"
                }`}
              >
                Nuestro ataque → Rival defensa
              </button>
              <button
                onClick={() => setMatchup("rival-attack")}
                className={`w-full px-3 py-2 rounded-lg text-sm text-left transition-colors ${
                  matchup === "rival-attack" ? "bg-indigo-600 text-white" : "bg-surface-hover border border-border text-foreground-secondary hover:border-indigo-300"
                }`}
              >
                Rival ataque → Nuestra defensa
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Situaciones guardadas */}
      {savedClashes.length > 0 && (
        <div className="mt-6">
          <h2 className="text-xs font-medium text-muted uppercase tracking-wide mb-3">Situaciones guardadas</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {savedClashes.map((c) => (
              <div
                key={c.id}
                onClick={() => loadClash(c)}
                className="bg-surface rounded-xl border border-border hover:border-indigo-300 p-3 cursor-pointer transition-colors"
              >
                <div className="flex items-center justify-between gap-2 mb-2">
                  <h3 className="text-sm font-semibold text-foreground truncate">{c.name}</h3>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDeleteClash(c.id);
                    }}
                    className="text-xs text-muted hover:text-red-400 flex-shrink-0"
                  >
                    ✕
                  </button>
                </div>
                <div className="pointer-events-none">
                  <ClashThumb clash={c} />
                </div>
                {c.notes && <p className="text-[10px] text-muted mt-1.5 line-clamp-2">{c.notes}</p>}
              </div>
            ))}
          </div>
        </div>
      )}
      </>
      )}

      {/* Desplegable de etiqueta de posición (clic derecho) */}
      {labelDropdown && (
        <div
          ref={labelDropdownRef}
          className="fixed z-50 bg-surface border border-border rounded-lg shadow-xl py-1 min-w-[120px]"
          style={{
            left: Math.min(labelDropdown.x, window.innerWidth - 140),
            top: Math.min(labelDropdown.y, window.innerHeight - 300),
          }}
        >
          <p className="text-[10px] text-muted uppercase tracking-wide font-medium px-3 py-1.5 border-b border-surface-hover">
            Posición
          </p>
          <div className="max-h-[240px] overflow-y-auto">
            {POSITION_LABELS.map((label) => {
              const source = labelDropdown.scope === "own" ? ownPlayers : labelDropdown.scope === "rival" ? rivalPlayers : cfgPlayers;
              const current = source.find((p) => p.id === labelDropdown.id);
              const isActive = current?.label === label;
              return (
                <button
                  key={label}
                  onClick={() => handleLabelSelect(label)}
                  className={`w-full text-left px-3 py-1.5 text-xs hover:bg-surface-hover transition-colors flex items-center justify-between ${
                    isActive ? "text-indigo-400 font-semibold" : "text-foreground-secondary"
                  }`}
                >
                  <span>{label}</span>
                  {isActive && <span className="text-indigo-400">✓</span>}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

function PlayerToken({
  player,
  fillColor,
  textColor,
  dragging,
  onMouseDown,
  onContextMenu,
}: {
  player: FormationPlayer;
  fillColor: string;
  textColor: string;
  dragging: boolean;
  onMouseDown: () => void;
  onContextMenu: (e: React.MouseEvent) => void;
}) {
  return (
    <g onMouseDown={onMouseDown} onContextMenu={onContextMenu} style={{ cursor: dragging ? "grabbing" : "grab" }}>
      <circle cx={player.x} cy={player.y} r="2.7" fill={fillColor} stroke="white" strokeWidth="0.35" opacity={dragging ? 0.85 : 1} />
      <text x={player.x} y={player.y + 0.75} textAnchor="middle" fill={textColor} fontSize="1.9" fontWeight="bold" style={{ pointerEvents: "none" }}>
        {player.label}
      </text>
    </g>
  );
}

// Miniatura de una situación guardada (solo lectura)
function ClashThumb({ clash }: { clash: SystemClash }) {
  return (
    <Pitch className="rounded-md">
      {clash.rival_players.map((p) => (
        <g key={`r${p.id}`}>
          <circle cx={p.x} cy={p.y} r="2.7" fill={clash.rival_fill_color} stroke="white" strokeWidth="0.35" />
          <text x={p.x} y={p.y + 0.75} textAnchor="middle" fill={clash.rival_text_color} fontSize="1.9" fontWeight="bold">{p.label}</text>
        </g>
      ))}
      {clash.own_players.map((p) => (
        <g key={`o${p.id}`}>
          <circle cx={p.x} cy={p.y} r="2.7" fill={clash.own_fill_color} stroke="white" strokeWidth="0.35" />
          <text x={p.x} y={p.y + 0.75} textAnchor="middle" fill={clash.own_text_color} fontSize="1.9" fontWeight="bold">{p.label}</text>
        </g>
      ))}
    </Pitch>
  );
}

