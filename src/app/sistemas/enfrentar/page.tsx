"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import {
  FORMATIONS,
  generateFormation,
  type Formation,
  type FormationPlayer,
  type BlockHeight,
} from "@/lib/formations";
import { Pitch, FIELD, clientToField } from "@/components/pitch";
import {
  getSystemClashes,
  createSystemClash,
  deleteSystemClash,
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

  // Situaciones guardadas
  const [savedClashes, setSavedClashes] = useState<SystemClash[]>([]);
  const [saveOpen, setSaveOpen] = useState(false);
  const [saveName, setSaveName] = useState("");
  const [saveNotes, setSaveNotes] = useState("");
  const [savingClash, setSavingClash] = useState(false);

  useEffect(() => {
    getSystemClashes().then(setSavedClashes).catch(console.error);
  }, []);

  const regenerate = useCallback(() => {
    setOwnPlayers(generateFormation(activeOwnFormation, "own", activeOwnPosture, ownBlockHeight));
    setRivalPlayers(generateFormation(activeRivalFormation, "rival", activeRivalPosture, rivalBlockHeight));
  }, [activeOwnFormation, activeOwnPosture, activeRivalFormation, activeRivalPosture, ownBlockHeight, rivalBlockHeight]);

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
      </div>

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
                <PlayerToken key={p.id} player={p} fillColor={rivalFillColor} textColor={rivalTextColor} dragging={dragging?.id === p.id} onMouseDown={() => handleMouseDown("rival", p.id)} />
              ))}
              {ownPlayers.map((p) => (
                <PlayerToken key={p.id} player={p} fillColor={ownFillColor} textColor={ownTextColor} dragging={dragging?.id === p.id} onMouseDown={() => handleMouseDown("own", p.id)} />
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
    </div>
  );
}

function PlayerToken({
  player,
  fillColor,
  textColor,
  dragging,
  onMouseDown,
}: {
  player: FormationPlayer;
  fillColor: string;
  textColor: string;
  dragging: boolean;
  onMouseDown: () => void;
}) {
  return (
    <g onMouseDown={onMouseDown} style={{ cursor: dragging ? "grabbing" : "grab" }}>
      <circle cx={player.x} cy={player.y} r="2.3" fill={fillColor} stroke="white" strokeWidth="0.35" opacity={dragging ? 0.85 : 1} />
      <text x={player.x} y={player.y + 0.75} textAnchor="middle" fill={textColor} fontSize="2" fontWeight="bold" style={{ pointerEvents: "none" }}>
        {player.number}
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
          <circle cx={p.x} cy={p.y} r="2.3" fill={clash.rival_fill_color} stroke="white" strokeWidth="0.35" />
          <text x={p.x} y={p.y + 0.75} textAnchor="middle" fill={clash.rival_text_color} fontSize="2" fontWeight="bold">{p.number}</text>
        </g>
      ))}
      {clash.own_players.map((p) => (
        <g key={`o${p.id}`}>
          <circle cx={p.x} cy={p.y} r="2.3" fill={clash.own_fill_color} stroke="white" strokeWidth="0.35" />
          <text x={p.x} y={p.y + 0.75} textAnchor="middle" fill={clash.own_text_color} fontSize="2" fontWeight="bold">{p.number}</text>
        </g>
      ))}
    </Pitch>
  );
}

