"use client";

import { useState } from "react";
import { POSITIONS, FIELD_ZONES, GAME_PHASES, TEAM_CONTEXTS } from "@/lib/seed-data";

export default function PosicionesPage() {
  const [selectedPosition, setSelectedPosition] = useState(POSITIONS[0].id);
  const [selectedContext, setSelectedContext] = useState(TEAM_CONTEXTS[0].id);

  const activePosition = POSITIONS.find((p) => p.id === selectedPosition);

  return (
    <div className="max-w-6xl">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Perfiles de posición</h1>

      {/* Selector de contexto */}
      <div className="mb-6">
        <h2 className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-3">
          Contexto de equipo
        </h2>
        <div className="flex flex-wrap gap-2">
          {TEAM_CONTEXTS.map((ctx) => (
            <button
              key={ctx.id}
              onClick={() => setSelectedContext(ctx.id)}
              className={`px-3 py-1.5 rounded text-sm transition-colors ${
                selectedContext === ctx.id
                  ? "bg-emerald-600 text-white"
                  : "bg-white border border-gray-200 text-gray-600 hover:border-emerald-300"
              }`}
            >
              {ctx.name}
            </button>
          ))}
        </div>
      </div>

      {/* Grid de posiciones */}
      <div className="mb-8">
        <h2 className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-3">
          Posición
        </h2>
        <div className="grid grid-cols-4 md:grid-cols-6 lg:grid-cols-12 gap-2">
          {POSITIONS.map((pos) => (
            <button
              key={pos.id}
              onClick={() => setSelectedPosition(pos.id)}
              className={`p-3 rounded-lg text-center transition-colors ${
                selectedPosition === pos.id
                  ? "bg-blue-600 text-white"
                  : "bg-white border border-gray-200 text-gray-700 hover:border-blue-300"
              }`}
            >
              <span className="block text-lg font-bold">{pos.abbreviation}</span>
              <span className="block text-[10px] mt-0.5 leading-tight">{pos.name}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Matriz zona × fase */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="p-4 border-b border-gray-200 bg-gray-50">
          <h3 className="font-semibold text-gray-900">
            {activePosition?.name}{" "}
            <span className="text-gray-400 font-normal">({activePosition?.abbreviation})</span>
          </h3>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200">
                <th className="p-3 text-left text-gray-500 font-medium w-20">Zona</th>
                {GAME_PHASES.filter((p) => p.name !== "ABP").map((phase) => (
                  <th key={phase.id} className="p-3 text-left text-gray-500 font-medium">
                    {phase.name}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {FIELD_ZONES.map((zone) => (
                <tr key={zone.id} className="border-b border-gray-100 last:border-0">
                  <td className="p-3">
                    <span className="inline-block px-2 py-1 bg-gray-100 rounded font-bold text-gray-700">
                      {zone.name}
                    </span>
                    <p className="text-[10px] text-gray-400 mt-1">{zone.description}</p>
                  </td>
                  {GAME_PHASES.filter((p) => p.name !== "ABP").map((phase) => (
                    <td key={phase.id} className="p-3 text-gray-400 text-xs">
                      <button className="w-full h-16 border border-dashed border-gray-200 rounded-lg hover:border-blue-300 hover:bg-blue-50 transition-colors flex items-center justify-center">
                        + Definir
                      </button>
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
