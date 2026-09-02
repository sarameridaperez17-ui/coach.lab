"use client";

import { useState } from "react";
import { GAME_PHASES } from "@/lib/seed-data";

const INITIAL_POSITIONS = [
  { id: 1, label: "PT", x: 50, y: 93 },
  { id: 2, label: "CL", x: 20, y: 75 },
  { id: 3, label: "CT", x: 40, y: 78 },
  { id: 4, label: "CC", x: 60, y: 78 },
  { id: 5, label: "LT", x: 80, y: 75 },
  { id: 6, label: "MC", x: 35, y: 55 },
  { id: 7, label: "IN", x: 50, y: 50 },
  { id: 8, label: "IN", x: 65, y: 55 },
  { id: 9, label: "EX", x: 15, y: 30 },
  { id: 10, label: "MP", x: 50, y: 35 },
  { id: 11, label: "DC", x: 75, y: 25 },
];

export default function SistemasPage() {
  const [selectedPhase, setSelectedPhase] = useState(GAME_PHASES[0].id);
  const [players, setPlayers] = useState(INITIAL_POSITIONS);
  const [dragging, setDragging] = useState<number | null>(null);

  const handleMouseDown = (id: number) => {
    setDragging(id);
  };

  const handleMouseMove = (e: React.MouseEvent<SVGSVGElement>) => {
    if (dragging === null) return;
    const svg = e.currentTarget;
    const rect = svg.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;
    setPlayers((prev) =>
      prev.map((p) =>
        p.id === dragging
          ? { ...p, x: Math.max(2, Math.min(98, x)), y: Math.max(2, Math.min(98, y)) }
          : p
      )
    );
  };

  const handleMouseUp = () => {
    setDragging(null);
  };

  return (
    <div className="max-w-6xl">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Sistemas de juego</h1>
        <button className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 transition-colors">
          + Nuevo sistema
        </button>
      </div>

      {/* Fase del juego */}
      <div className="mb-6">
        <div className="flex border-b border-gray-200">
          {GAME_PHASES.filter((p) => p.name !== "ABP").map((phase) => (
            <button
              key={phase.id}
              onClick={() => setSelectedPhase(phase.id)}
              className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
                selectedPhase === phase.id
                  ? "border-indigo-600 text-indigo-600"
                  : "border-transparent text-gray-500 hover:text-gray-700"
              }`}
            >
              {phase.name}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Campograma */}
        <div className="lg:col-span-2">
          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <h3 className="text-sm font-medium text-gray-500 uppercase tracking-wide mb-3">
              Campograma — arrastra las jugadoras
            </h3>
            <svg
              viewBox="0 0 100 140"
              className="w-full rounded-lg select-none"
              style={{ background: "#2d8a4e" }}
              onMouseMove={handleMouseMove}
              onMouseUp={handleMouseUp}
              onMouseLeave={handleMouseUp}
            >
              {/* Campo */}
              <rect x="2" y="2" width="96" height="136" rx="1" fill="none" stroke="rgba(255,255,255,0.5)" strokeWidth="0.4" />
              {/* Línea central */}
              <line x1="2" y1="70" x2="98" y2="70" stroke="rgba(255,255,255,0.5)" strokeWidth="0.3" />
              {/* Círculo central */}
              <circle cx="50" cy="70" r="12" fill="none" stroke="rgba(255,255,255,0.5)" strokeWidth="0.3" />
              <circle cx="50" cy="70" r="0.6" fill="rgba(255,255,255,0.5)" />
              {/* Área grande arriba */}
              <rect x="18" y="2" width="64" height="22" fill="none" stroke="rgba(255,255,255,0.5)" strokeWidth="0.3" />
              {/* Área pequeña arriba */}
              <rect x="30" y="2" width="40" height="8" fill="none" stroke="rgba(255,255,255,0.5)" strokeWidth="0.3" />
              {/* Punto penal arriba */}
              <circle cx="50" cy="16" r="0.5" fill="rgba(255,255,255,0.5)" />
              {/* Área grande abajo */}
              <rect x="18" y="116" width="64" height="22" fill="none" stroke="rgba(255,255,255,0.5)" strokeWidth="0.3" />
              {/* Área pequeña abajo */}
              <rect x="30" y="130" width="40" height="8" fill="none" stroke="rgba(255,255,255,0.5)" strokeWidth="0.3" />
              {/* Punto penal abajo */}
              <circle cx="50" cy="124" r="0.5" fill="rgba(255,255,255,0.5)" />

              {/* Jugadoras */}
              {players.map((player) => {
                const fieldY = (player.y / 100) * 136 + 2;
                const fieldX = (player.x / 100) * 96 + 2;
                return (
                  <g
                    key={player.id}
                    onMouseDown={() => handleMouseDown(player.id)}
                    style={{ cursor: "grab" }}
                  >
                    <circle
                      cx={fieldX}
                      cy={fieldY}
                      r="3.5"
                      fill={dragging === player.id ? "#818cf8" : "#4f46e5"}
                      stroke="white"
                      strokeWidth="0.5"
                    />
                    <text
                      x={fieldX}
                      y={fieldY + 1.2}
                      textAnchor="middle"
                      fill="white"
                      fontSize="2.8"
                      fontWeight="bold"
                      style={{ pointerEvents: "none" }}
                    >
                      {player.label}
                    </text>
                  </g>
                );
              })}
            </svg>
          </div>
        </div>

        {/* Panel lateral */}
        <div className="space-y-4">
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <h3 className="font-semibold text-gray-900 mb-3">Sistema</h3>
            <input
              type="text"
              placeholder="Ej: 1-4-3-3"
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300 focus:border-indigo-300 mb-3"
            />
            <h4 className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">
              Descripción
            </h4>
            <textarea
              placeholder="Describe las características principales del sistema..."
              rows={4}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300 focus:border-indigo-300 resize-none"
            />
          </div>

          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold text-gray-900">Variantes</h3>
              <button className="text-sm text-indigo-600 hover:text-indigo-700 font-medium">
                + Añadir
              </button>
            </div>
            <div className="border border-dashed border-gray-200 rounded-lg p-4 text-center text-gray-400 text-sm">
              Sin variantes definidas
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
