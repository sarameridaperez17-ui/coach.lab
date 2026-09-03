"use client";

import { useState, useEffect, useCallback } from "react";
import {
  getTeamContexts,
  getGamePhases,
  getBlockHeights,
  getPrinciples,
  createPrinciple,
  updatePrinciple,
  deletePrinciple,
  createSubPrinciple,
  updateSubPrinciple,
  deleteSubPrinciple,
  createBehavior,
  updateBehavior,
  deleteBehavior,
  toggleBookmark,
  getBookmarkedIds,
} from "@/lib/api";
import type {
  TeamContext,
  GamePhase,
  BlockHeight,
  Principle,
  BehaviorType,
} from "@/types";


// ---- Inline edit component ----
function InlineEdit({
  value,
  onSave,
  className = "",
}: {
  value: string;
  onSave: (v: string) => void;
  className?: string;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);

  if (!editing) {
    return (
      <span
        onDoubleClick={() => {
          setDraft(value);
          setEditing(true);
        }}
        className={`cursor-pointer hover:bg-[#22252f] rounded px-1 -mx-1 ${className}`}
        title="Doble clic para editar"
      >
        {value}
      </span>
    );
  }

  return (
    <input
      autoFocus
      value={draft}
      onChange={(e) => setDraft(e.target.value)}
      onBlur={() => {
        if (draft.trim() && draft !== value) onSave(draft.trim());
        setEditing(false);
      }}
      onKeyDown={(e) => {
        if (e.key === "Enter") {
          if (draft.trim() && draft !== value) onSave(draft.trim());
          setEditing(false);
        }
        if (e.key === "Escape") setEditing(false);
      }}
      className={`border border-emerald-400 rounded px-1 -mx-1 outline-none ${className}`}
    />
  );
}

// ---- Behavior type badge ----
const BEHAVIOR_LABELS: Record<BehaviorType, { label: string; color: string }> = {
  collective: { label: "Colectivo", color: "bg-violet-900/50 text-violet-400" },
  by_line: { label: "Por líneas", color: "bg-sky-900/50 text-sky-400" },
  individual: { label: "Individual", color: "bg-amber-900/50 text-amber-400" },
};

export default function ModeloDeJuegoPage() {
  const [contexts, setContexts] = useState<TeamContext[]>([]);
  const [phases, setPhases] = useState<GamePhase[]>([]);
  const [blocks, setBlocks] = useState<BlockHeight[]>([]);
  const [principles, setPrinciples] = useState<Principle[]>([]);

  const [selectedContext, setSelectedContext] = useState<string>("");
  const [selectedPhase, setSelectedPhase] = useState<string>("");
  const [selectedBlock, setSelectedBlock] = useState<string | null>(null);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [newPrincipleName, setNewPrincipleName] = useState("");
  const [addingPrinciple, setAddingPrinciple] = useState(false);
  const [addingSubTo, setAddingSubTo] = useState<string | null>(null);
  const [newSubName, setNewSubName] = useState("");
  const [addingBehaviorTo, setAddingBehaviorTo] = useState<string | null>(null);
  const [newBehaviorName, setNewBehaviorName] = useState("");
  const [newBehaviorType, setNewBehaviorType] = useState<BehaviorType>("collective");
  const [bookmarkedIds, setBookmarkedIds] = useState<Set<string>>(new Set());

  // Load base data
  useEffect(() => {
    async function load() {
      try {
        const [ctx, ph, bh] = await Promise.all([
          getTeamContexts(),
          getGamePhases(),
          getBlockHeights(),
        ]);
        setContexts(ctx);
        setPhases(ph);
        setBlocks(bh);
        if (ctx.length > 0) setSelectedContext(ctx[0].id);
        if (ph.length > 0) setSelectedPhase(ph[0].id);
      } catch (err) {
        console.error("Error loading base data:", err);
        setError("No se pudo conectar con la base de datos. Verifica tu conexión y las credenciales de Supabase.");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  useEffect(() => {
    getBookmarkedIds("principle").then(setBookmarkedIds).catch(console.error);
  }, []);

  const handleToggleBookmark = async (id: string, title: string) => {
    const added = await toggleBookmark("principle", id, title);
    setBookmarkedIds(prev => {
      const next = new Set(prev);
      if (added) next.add(id); else next.delete(id);
      return next;
    });
  };

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("crear") === "1") {
      setAddingPrinciple(true);
      window.history.replaceState({}, "", window.location.pathname);
    }
  }, []);

  // Load principles when phase changes
  const loadPrinciples = useCallback(async () => {
    if (!selectedPhase) return;
    try {
      const data = await getPrinciples(selectedPhase);
      setPrinciples(data);
    } catch (err) {
      console.error("Error loading principles:", err);
    }
  }, [selectedPhase]);

  useEffect(() => {
    loadPrinciples();
  }, [loadPrinciples]);

  // ---- Handlers ----
  const handleCreatePrinciple = async () => {
    if (!newPrincipleName.trim()) return;
    try {
      await createPrinciple(newPrincipleName.trim(), selectedPhase, [selectedContext]);
      setNewPrincipleName("");
      setAddingPrinciple(false);
      await loadPrinciples();
    } catch (err) {
      console.error("Error creating principle:", err);
    }
  };

  const handleCreateSubPrinciple = async (principleId: string) => {
    if (!newSubName.trim()) return;
    try {
      await createSubPrinciple(newSubName.trim(), principleId);
      setNewSubName("");
      setAddingSubTo(null);
      await loadPrinciples();
    } catch (err) {
      console.error("Error creating sub-principle:", err);
    }
  };

  const handleCreateBehavior = async (subPrincipleId: string) => {
    if (!newBehaviorName.trim()) return;
    try {
      await createBehavior(newBehaviorName.trim(), newBehaviorType, subPrincipleId);
      setNewBehaviorName("");
      setAddingBehaviorTo(null);
      await loadPrinciples();
    } catch (err) {
      console.error("Error creating behavior:", err);
    }
  };

  if (loading) {
    return (
      <div className="max-w-6xl flex items-center justify-center h-64">
        <p className="text-gray-400">Cargando modelo de juego...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-6xl flex items-center justify-center h-64">
        <div className="text-center">
          <p className="text-red-500 font-medium mb-2">Error de conexión</p>
          <p className="text-gray-400 text-sm">{error}</p>
        </div>
      </div>
    );
  }

  const activeContext = contexts.find((c) => c.id === selectedContext);
  const activePhase = phases.find((p) => p.id === selectedPhase);

  // Filter principles by context
  const filteredPrinciples = principles.filter((p) => {
    const ctxIds = p.principle_contexts?.map((pc) => pc.team_context_id) ?? [];
    return ctxIds.length === 0 || ctxIds.includes(selectedContext);
  });

  return (
    <div className="max-w-6xl">
      <h1 className="text-2xl font-bold text-gray-200 mb-6">Modelo de juego</h1>

      {/* Nivel 1: Contexto de equipo */}
      <div className="mb-6">
        <h2 className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-3">
          Contexto de equipo
        </h2>
        <div className="flex flex-wrap gap-2">
          {contexts.map((ctx) => (
            <button
              key={ctx.id}
              onClick={() => setSelectedContext(ctx.id)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                selectedContext === ctx.id
                  ? "bg-emerald-600 text-white"
                  : "bg-[#1a1d27] border border-[#2a2d37] text-gray-300 hover:border-emerald-300"
              }`}
            >
              {ctx.name}
            </button>
          ))}
        </div>
        {activeContext && (
          <p className="text-sm text-gray-500 mt-2">{activeContext.description}</p>
        )}
      </div>

      {/* Nivel 2: Fases del juego */}
      <div className="mb-6">
        <div className="flex border-b border-[#2a2d37]">
          {phases.map((phase) => (
            <button
              key={phase.id}
              onClick={() => setSelectedPhase(phase.id)}
              className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
                selectedPhase === phase.id
                  ? "border-emerald-600 text-emerald-600"
                  : "border-transparent text-gray-500 hover:text-gray-300"
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
                : "bg-[#1a1d27] border border-[#2a2d37] text-gray-400 hover:border-[#353840]"
            }`}
          >
            Todos
          </button>
          {blocks.map((block) => (
            <button
              key={block.id}
              onClick={() => setSelectedBlock(block.id)}
              className={`px-3 py-1.5 rounded text-sm transition-colors ${
                selectedBlock === block.id
                  ? "bg-gray-900 text-white"
                  : "bg-[#1a1d27] border border-[#2a2d37] text-gray-400 hover:border-[#353840]"
              }`}
            >
              {block.name}
            </button>
          ))}
        </div>
      </div>

      {/* Árbol de principios */}
      <div className="space-y-4">
        {filteredPrinciples.map((principle) => (
          <div
            key={principle.id}
            className="bg-[#1a1d27] rounded-xl border border-[#2a2d37] overflow-hidden"
          >
            {/* Principio */}
            <div className="p-4 border-b border-[#22252f] flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span className="w-2 h-2 rounded-full bg-emerald-500" />
                <InlineEdit
                  value={principle.name}
                  onSave={(v) => {
                    updatePrinciple(principle.id, { name: v }).then(loadPrinciples);
                  }}
                  className="font-semibold text-gray-200"
                />
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={(e) => { e.stopPropagation(); handleToggleBookmark(principle.id, principle.name); }}
                  className="text-lg hover:scale-110 transition-transform"
                  title={bookmarkedIds.has(principle.id) ? "Quitar de Continuar trabajando" : "Añadir a Continuar trabajando"}
                >
                  {bookmarkedIds.has(principle.id) ? <span className="text-emerald-400">🔄</span> : <span className="text-gray-600">🔄</span>}
                </button>
                <button
                  onClick={() => {
                    setAddingSubTo(principle.id);
                    setNewSubName("");
                  }}
                  className="text-xs text-emerald-600 hover:text-emerald-700 font-medium"
                >
                  + Subprincipio
                </button>
                <button
                  onClick={() => {
                    if (confirm("¿Eliminar este principio?")) {
                      deletePrinciple(principle.id).then(loadPrinciples);
                    }
                  }}
                  className="text-xs text-gray-400 hover:text-red-500 ml-2"
                >
                  ✕
                </button>
              </div>
            </div>

            {/* Subprincipios */}
            <div className="divide-y divide-[#22252f]">
              {(principle.sub_principles ?? [])
                .filter((sp) => !sp.archived)
                .map((sub) => (
                  <div key={sub.id} className="pl-8 pr-4 py-3">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-300" />
                        <InlineEdit
                          value={sub.name}
                          onSave={(v) => {
                            updateSubPrinciple(sub.id, { name: v }).then(
                              loadPrinciples
                            );
                          }}
                          className="font-medium text-gray-300 text-sm"
                        />
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => {
                            setAddingBehaviorTo(sub.id);
                            setNewBehaviorName("");
                            setNewBehaviorType("collective");
                          }}
                          className="text-xs text-blue-400 hover:text-blue-700 font-medium"
                        >
                          + Comportamiento
                        </button>
                        <button
                          onClick={() => {
                            if (confirm("¿Eliminar este subprincipio?")) {
                              deleteSubPrinciple(sub.id).then(loadPrinciples);
                            }
                          }}
                          className="text-xs text-gray-400 hover:text-red-500"
                        >
                          ✕
                        </button>
                      </div>
                    </div>

                    {/* Comportamientos */}
                    <div className="pl-5 space-y-1">
                      {(sub.behaviors ?? [])
                        .filter((b) => !b.archived)
                        .filter((b) => {
                          if (!selectedBlock) return true;
                          const bhIds = b.behavior_block_heights?.map((bh) => bh.block_height_id) ?? [];
                          return bhIds.length === 0 || bhIds.includes(selectedBlock);
                        })
                        .map((behavior) => {
                          const badge = BEHAVIOR_LABELS[behavior.type];
                          return (
                            <div
                              key={behavior.id}
                              className="flex items-center justify-between py-1.5 group"
                            >
                              <div className="flex items-center gap-2">
                                <span className="w-1 h-1 rounded-full bg-gray-300" />
                                <InlineEdit
                                  value={behavior.name}
                                  onSave={(v) => {
                                    updateBehavior(behavior.id, { name: v }).then(
                                      loadPrinciples
                                    );
                                  }}
                                  className="text-sm text-gray-300"
                                />
                                <span
                                  className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${badge.color}`}
                                >
                                  {badge.label}
                                </span>
                              </div>
                              <button
                                onClick={() => {
                                  if (confirm("¿Eliminar este comportamiento?")) {
                                    deleteBehavior(behavior.id).then(loadPrinciples);
                                  }
                                }}
                                className="text-xs text-gray-400 hover:text-red-500 opacity-0 group-hover:opacity-100"
                              >
                                ✕
                              </button>
                            </div>
                          );
                        })}

                      {/* Form: nuevo comportamiento */}
                      {addingBehaviorTo === sub.id && (
                        <div className="flex items-center gap-2 pt-1">
                          <input
                            autoFocus
                            value={newBehaviorName}
                            onChange={(e) => setNewBehaviorName(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === "Enter") handleCreateBehavior(sub.id);
                              if (e.key === "Escape") setAddingBehaviorTo(null);
                            }}
                            placeholder="Nombre del comportamiento"
                            className="flex-1 px-2 py-1 border border-[#2a2d37] rounded text-sm focus:outline-none focus:border-blue-400"
                          />
                          <select
                            value={newBehaviorType}
                            onChange={(e) =>
                              setNewBehaviorType(e.target.value as BehaviorType)
                            }
                            className="px-2 py-1 border border-[#2a2d37] rounded text-xs bg-[#1a1d27]"
                          >
                            <option value="collective">Colectivo</option>
                            <option value="by_line">Por líneas</option>
                            <option value="individual">Individual</option>
                          </select>
                          <button
                            onClick={() => handleCreateBehavior(sub.id)}
                            className="px-2 py-1 bg-blue-600 text-white rounded text-xs"
                          >
                            Crear
                          </button>
                          <button
                            onClick={() => setAddingBehaviorTo(null)}
                            className="text-xs text-gray-400"
                          >
                            ✕
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                ))}

              {/* Form: nuevo subprincipio */}
              {addingSubTo === principle.id && (
                <div className="pl-8 pr-4 py-3 flex items-center gap-2">
                  <input
                    autoFocus
                    value={newSubName}
                    onChange={(e) => setNewSubName(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") handleCreateSubPrinciple(principle.id);
                      if (e.key === "Escape") setAddingSubTo(null);
                    }}
                    placeholder="Nombre del subprincipio"
                    className="flex-1 px-2 py-1 border border-[#2a2d37] rounded text-sm focus:outline-none focus:border-emerald-400"
                  />
                  <button
                    onClick={() => handleCreateSubPrinciple(principle.id)}
                    className="px-3 py-1 bg-emerald-600 text-white rounded text-xs"
                  >
                    Crear
                  </button>
                  <button
                    onClick={() => setAddingSubTo(null)}
                    className="text-xs text-gray-400"
                  >
                    ✕
                  </button>
                </div>
              )}
            </div>
          </div>
        ))}

        {/* Crear nuevo principio */}
        {addingPrinciple ? (
          <div className="bg-[#1a1d27] rounded-xl border border-[#2a2d37] p-4 flex items-center gap-2">
            <input
              autoFocus
              value={newPrincipleName}
              onChange={(e) => setNewPrincipleName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleCreatePrinciple();
                if (e.key === "Escape") setAddingPrinciple(false);
              }}
              placeholder="Nombre del principio"
              className="flex-1 px-3 py-2 border border-[#2a2d37] rounded-lg text-sm focus:outline-none focus:border-emerald-400"
            />
            <button
              onClick={handleCreatePrinciple}
              className="px-4 py-2 bg-emerald-600 text-white rounded-lg text-sm font-medium"
            >
              Crear
            </button>
            <button
              onClick={() => setAddingPrinciple(false)}
              className="text-gray-400 hover:text-gray-400"
            >
              ✕
            </button>
          </div>
        ) : (
          <button
            onClick={() => setAddingPrinciple(true)}
            className="w-full py-4 border-2 border-dashed border-[#2a2d37] rounded-xl text-sm font-medium text-gray-400 hover:border-emerald-300 hover:text-emerald-600 transition-colors"
          >
            + Nuevo principio para {activeContext?.name} — {activePhase?.name}
          </button>
        )}
      </div>
    </div>
  );
}
