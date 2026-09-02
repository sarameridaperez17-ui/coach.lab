"use client";

import { useState } from "react";
import { TEAM_CONTEXTS, GAME_PHASES, BLOCK_HEIGHTS } from "@/lib/seed-data";

export default function ModeloDeJuegoPage() {
  const [selectedContext, setSelectedContext] = useState(TEAM_CONTEXTS[0].id);
  const [selectedPhase, setSelectedPhase] = useState(GAME_PHASES[0].id);
  const [selectedBlock, setSelectedBlock] = useState<string | null>(null);

  const activeContext = TEAM_CONTEXTS.find((c) => c.id === selectedContext);
  const activePhase = GAME_PHASES.find((p) => p.id === selectedPhase);

  return (
    <div className="max-w-6xl">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Modelo de juego</h1>

      {/* Nivel 1: Contexto de equipo */}
      <div className="mb-6">
        <h2 className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-3">
          Contexto de equipo
        </h2>
        <div className="flex flex-wrap gap-2">
          {TEAM_CONTEXTS.map((ctx) => (
            <button
              key={ctx.id}
              onClick={() => setSelectedContext(ctx.id)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                selectedContext === ctx.id
                  ? "bg-emerald-600 text-white"
                  : "bg-white border border-gray-200 text-gray-700 hover:border-emerald-300"
              }`}
            >
              {ctx.name}
            </button>
          ))}
          <button className="px-4 py-2 rounded-lg text-sm font-medium bg-white border border-dashed border-gray-300 text-gray-400 hover:border-emerald-300 hover:text-emerald-600 transition-colors">
            + Nuevo contexto
          </button>
        </div>
        {activeContext && (
          <p className="text-sm text-gray-500 mt-2">{activeContext.description}</p>
        )}
      </div>

      {/* Nivel 2: Fases del juego */}
      <div className="mb-6">
        <div className="flex border-b border-gray-200">
          {GAME_PHASES.map((phase) => (
            <button
              key={phase.id}
              onClick={() => setSelectedPhase(phase.id)}
              className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
                selectedPhase === phase.id
                  ? "border-emerald-600 text-emerald-600"
                  : "border-transparent text-gray-500 hover:text-gray-700"
              }`}
            >
              {phase.name}
            </button>
          ))}
        </div>
      </div>

      {/* Nivel 3: Altura de bloque */}
      <div className="mb-8">
        <h2 className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-3">
          Altura de bloque rival
        </h2>
        <div className="flex gap-2">
          <button
            onClick={() => setSelectedBlock(null)}
            className={`px-3 py-1.5 rounded text-sm transition-colors ${
              selectedBlock === null
                ? "bg-gray-900 text-white"
                : "bg-white border border-gray-200 text-gray-600 hover:border-gray-400"
            }`}
          >
            Todos
          </button>
          {BLOCK_HEIGHTS.map((block) => (
            <button
              key={block.id}
              onClick={() => setSelectedBlock(block.id)}
              className={`px-3 py-1.5 rounded text-sm transition-colors ${
                selectedBlock === block.id
                  ? "bg-gray-900 text-white"
                  : "bg-white border border-gray-200 text-gray-600 hover:border-gray-400"
              }`}
            >
              {block.name}
            </button>
          ))}
        </div>
      </div>

      {/* Árbol de principios (placeholder) */}
      <div className="bg-white rounded-xl border border-gray-200 p-8">
        <div className="text-center text-gray-400">
          <p className="text-lg font-medium mb-2">
            {activeContext?.name} — {activePhase?.name}
          </p>
          <p className="text-sm">
            Aquí aparecerá el árbol: Principio → Subprincipio → Comportamientos
          </p>
          <button className="mt-4 px-4 py-2 bg-emerald-600 text-white rounded-lg text-sm font-medium hover:bg-emerald-700 transition-colors">
            + Crear primer principio
          </button>
        </div>
      </div>
    </div>
  );
}
