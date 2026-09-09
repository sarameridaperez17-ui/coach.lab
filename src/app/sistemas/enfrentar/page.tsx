"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import {
  FORMATIONS,
  generateFormation,
  type Formation,
  type FormationPlayer,
  type BlockHeight,
} from "@/lib/formations";

type Matchup = "own-attack" | "rival-attack";

const FIELD_W = 105;
const FIELD_H = 68;

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

export default function EnfrentarSistemasPage() {
  const [ownAttack, setOwnAttack] = useState<Formation>("1-4-3-3");
  const [ownDefense, setOwnDefense] = useState<Formation>("1-4-4-2");
  const [rivalAttack, setRivalAttack] = useState<Formation>("1-4-2-3-1");
  const [rivalDefense, setRivalDefense] = useState<Formation>("1-4-4-2");
  const [matchup, setMatchup] = useState<Matchup>("own-attack");
  const [blockHeight, setBlockHeight] = useState<BlockHeight>("medio");

  const activeOwnFormation = matchup === "own-attack" ? ownAttack : ownDefense;
  const activeOwnPosture = matchup === "own-attack" ? "attack" : "defense";
  const activeRivalFormation = matchup === "own-attack" ? rivalDefense : rivalAttack;
  const activeRivalPosture = matchup === "own-attack" ? "defense" : "attack";

  const [ownPlayers, setOwnPlayers] = useState<FormationPlayer[]>([]);
  const [rivalPlayers, setRivalPlayers] = useState<FormationPlayer[]>([]);
  const [dragging, setDragging] = useState<{ side: "own" | "rival"; id: string } | null>(null);

  const regenerate = useCallback(() => {
    setOwnPlayers(generateFormation(activeOwnFormation, "own", activeOwnPosture, blockHeight));
    setRivalPlayers(generateFormation(activeRivalFormation, "rival", activeRivalPosture, blockHeight));
  }, [activeOwnFormation, activeOwnPosture, activeRivalFormation, activeRivalPosture, blockHeight]);

  useEffect(() => {
    regenerate();
  }, [regenerate]);

  const handleMouseDown = (side: "own" | "rival", id: string) => setDragging({ side, id });

  const handleMouseMove = (e: React.MouseEvent<SVGSVGElement>) => {
    if (!dragging) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * FIELD_W;
    const y = ((e.clientY - rect.top) / rect.height) * FIELD_H;
    const clampedX = Math.max(2, Math.min(FIELD_W - 2, x));
    const clampedY = Math.max(2, Math.min(FIELD_H - 2, y));
    const setter = dragging.side === "own" ? setOwnPlayers : setRivalPlayers;
    setter((prev) => prev.map((p) => (p.id === dragging.id ? { ...p, x: clampedX, y: clampedY } : p)));
  };

  const handleMouseUp = () => setDragging(null);

  const matchupLabel =
    matchup === "own-attack"
      ? `${activeOwnFormation} (ataque) vs ${activeRivalFormation} (defensa)`
      : `${activeRivalFormation} (ataque) vs ${activeOwnFormation} (defensa)`;

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
            <svg
              viewBox={`0 0 ${FIELD_W} ${FIELD_H}`}
              className="w-full rounded-lg select-none"
              style={{ background: "#1a5c2e" }}
              onMouseMove={handleMouseMove}
              onMouseUp={handleMouseUp}
              onMouseLeave={handleMouseUp}
            >
              <PitchMarkings />

              {rivalPlayers.map((p) => (
                <PlayerToken key={p.id} player={p} color="#e11d48" dragging={dragging?.id === p.id} onMouseDown={() => handleMouseDown("rival", p.id)} />
              ))}
              {ownPlayers.map((p) => (
                <PlayerToken key={p.id} player={p} color="#2563eb" dragging={dragging?.id === p.id} onMouseDown={() => handleMouseDown("own", p.id)} />
              ))}
            </svg>
            <div className="flex items-center gap-4 mt-3 text-xs text-muted">
              <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-blue-600" /> Equipo propio</span>
              <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-rose-600" /> Equipo rival</span>
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
            </div>
          </div>

          <div className="bg-surface rounded-xl border border-border overflow-hidden">
            <div className="px-4 py-3 border-b border-surface-hover">
              <h3 className="text-sm font-semibold text-foreground">Equipo rival</h3>
            </div>
            <div className="p-4 space-y-3">
              <FormationSelect label="Ataque" value={rivalAttack} onChange={setRivalAttack} />
              <FormationSelect label="Defensa" value={rivalDefense} onChange={setRivalDefense} />
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

          <div className="bg-surface rounded-xl border border-border overflow-hidden">
            <div className="px-4 py-3 border-b border-surface-hover">
              <h3 className="text-sm font-semibold text-foreground">Altura del bloque</h3>
            </div>
            <div className="p-4 flex gap-2">
              {BLOCK_OPTIONS.map((b) => (
                <button
                  key={b.value}
                  onClick={() => setBlockHeight(b.value)}
                  className={`flex-1 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
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
    </div>
  );
}

function PlayerToken({
  player,
  color,
  dragging,
  onMouseDown,
}: {
  player: FormationPlayer;
  color: string;
  dragging: boolean;
  onMouseDown: () => void;
}) {
  return (
    <g onMouseDown={onMouseDown} style={{ cursor: dragging ? "grabbing" : "grab" }}>
      <circle cx={player.x} cy={player.y} r="2.3" fill={color} stroke="white" strokeWidth="0.35" opacity={dragging ? 0.85 : 1} />
      <text x={player.x} y={player.y + 0.75} textAnchor="middle" fill="white" fontSize="2" fontWeight="bold" style={{ pointerEvents: "none" }}>
        {player.number}
      </text>
    </g>
  );
}

function PitchMarkings() {
  const stroke = "rgba(255,255,255,0.45)";
  return (
    <g stroke={stroke} strokeWidth="0.25" fill="none">
      <rect x="0.3" y="0.3" width={FIELD_W - 0.6} height={FIELD_H - 0.6} rx="0.5" />
      <line x1={FIELD_W / 2} y1="0" x2={FIELD_W / 2} y2={FIELD_H} />
      <circle cx={FIELD_W / 2} cy={FIELD_H / 2} r="9.15" />
      <circle cx={FIELD_W / 2} cy={FIELD_H / 2} r="0.4" fill={stroke} />

      {/* Left penalty area (own goal) */}
      <rect x="0" y={(FIELD_H - 40.32) / 2} width="16.5" height="40.32" />
      <rect x="0" y={(FIELD_H - 18.32) / 2} width="5.5" height="18.32" />
      <circle cx="11" cy={FIELD_H / 2} r="0.4" fill={stroke} />
      <path d={`M 16.5 ${FIELD_H / 2 - 7.75} A 9.15 9.15 0 0 1 16.5 ${FIELD_H / 2 + 7.75}`} />

      {/* Right penalty area (rival goal) */}
      <rect x={FIELD_W - 16.5} y={(FIELD_H - 40.32) / 2} width="16.5" height="40.32" />
      <rect x={FIELD_W - 5.5} y={(FIELD_H - 18.32) / 2} width="5.5" height="18.32" />
      <circle cx={FIELD_W - 11} cy={FIELD_H / 2} r="0.4" fill={stroke} />
      <path d={`M ${FIELD_W - 16.5} ${FIELD_H / 2 - 7.75} A 9.15 9.15 0 0 0 ${FIELD_W - 16.5} ${FIELD_H / 2 + 7.75}`} />

      {/* Goals */}
      <rect x="-2.44" y={(FIELD_H - 7.32) / 2} width="2.44" height="7.32" strokeDasharray="0.6 0.6" />
      <rect x={FIELD_W} y={(FIELD_H - 7.32) / 2} width="2.44" height="7.32" strokeDasharray="0.6 0.6" />

      {/* Corner arcs */}
      <path d="M 0 1 A 1 1 0 0 0 1 0" />
      <path d={`M ${FIELD_W - 1} 0 A 1 1 0 0 0 ${FIELD_W} 1`} />
      <path d={`M 0 ${FIELD_H - 1} A 1 1 0 0 1 1 ${FIELD_H}`} />
      <path d={`M ${FIELD_W} ${FIELD_H - 1} A 1 1 0 0 1 ${FIELD_W - 1} ${FIELD_H}`} />
    </g>
  );
}
