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

  const regenerate = useCallback(() => {
    setOwnPlayers(generateFormation(activeOwnFormation, "own", activeOwnPosture, ownBlockHeight));
    setRivalPlayers(generateFormation(activeRivalFormation, "rival", activeRivalPosture, rivalBlockHeight));
  }, [activeOwnFormation, activeOwnPosture, activeRivalFormation, activeRivalPosture, ownBlockHeight, rivalBlockHeight]);

  useEffect(() => {
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
              <button
                onClick={regenerate}
                className="px-3 py-1.5 bg-surface-hover border border-border rounded-lg text-xs font-medium text-foreground-secondary hover:border-indigo-400 transition-colors"
              >
                Reiniciar
              </button>
            </div>
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

