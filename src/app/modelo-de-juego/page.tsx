"use client";

import { useState, useEffect, useCallback } from "react";
import {
  getTeamContexts,
  createTeamContext,
  updateTeamContext,
  deleteTeamContext,
  getGamePhases,
  getBlockHeights,
  getPrinciples,
  createPrinciple,
  updatePrinciple,
  deletePrinciple,
  duplicatePrinciple,
  createSubPrinciple,
  updateSubPrinciple,
  deleteSubPrinciple,
  createBehavior,
  updateBehavior,
  deleteBehavior,
  setItemStatus,
  removeItemStatus,
  getItemStatuses,
} from "@/lib/api";
import type { ItemStatus } from "@/lib/api";
import type {
  TeamContext,
  GamePhase,
  BlockHeight,
  Principle,
  BehaviorType,
} from "@/types";
import { StatusMenu, StatusBadge } from "@/components/ui/StatusMenu";


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
  const [itemStatuses, setItemStatuses] = useState<Map<string, ItemStatus>>(new Map());
  const [statusMenu, setStatusMenu] = useState<{x: number; y: number; id: string; title: string} | null>(null);

  // Context CRUD
  const [addingContext, setAddingContext] = useState(false);
  const [newContextName, setNewContextName] = useState("");
  const [newContextDesc, setNewContextDesc] = useState("");
  const [editingContextId, setEditingContextId] = useState<string | null>(null);
  const [editContextName, setEditContextName] = useState("");
  const [editContextDesc, setEditContextDesc] = useState("");

  // Relation modal
  const [relatingPrinciple, setRelatingPrinciple] = useState<Principle | null>(null);
  const [relTargetPhase, setRelTargetPhase] = useState("");
  const [relTargetContext, setRelTargetContext] = useState("");

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
    getItemStatuses("principle").then(setItemStatuses).catch(console.error);
  }, []);

  const handleContextMenu = (e: React.MouseEvent, id: string, title: string) => {
    e.preventDefault();
    setStatusMenu({ x: e.clientX, y: e.clientY, id, title });
  };

  const handleSetStatus = async (status: ItemStatus) => {
    if (!statusMenu) return;
    try {
      await setItemStatus("principle", statusMenu.id, statusMenu.title, status);
      setItemStatuses(prev => new Map(prev).set(statusMenu.id, status));
    } catch (err) { console.error("Error setting status:", err); }
    setStatusMenu(null);
  };

  const handleRemoveStatus = async () => {
    if (!statusMenu) return;
    try {
      await removeItemStatus("principle", statusMenu.id);
      setItemStatuses(prev => { const next = new Map(prev); next.delete(statusMenu.id); return next; });
    } catch (err) { console.error("Error removing status:", err); }
    setStatusMenu(null);
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

  // ---- Context CRUD handlers ----
  const handleCreateContext = async () => {
    if (!newContextName.trim()) return;
    try {
      const newCtx = await createTeamContext(newContextName.trim(), newContextDesc.trim());
      setContexts((prev) => [...prev, newCtx]);
      setNewContextName("");
      setNewContextDesc("");
      setAddingContext(false);
    } catch (err) { console.error("Error creating context:", err); }
  };

  const handleUpdateContext = async (id: string) => {
    try {
      await updateTeamContext(id, { name: editContextName.trim(), description: editContextDesc.trim() });
      setContexts((prev) => prev.map((c) => c.id === id ? { ...c, name: editContextName.trim(), description: editContextDesc.trim() } : c));
      setEditingContextId(null);
    } catch (err) { console.error("Error updating context:", err); }
  };

  const handleDeleteContext = async (id: string) => {
    if (!confirm("¿Eliminar este contexto de equipo?")) return;
    try {
      await deleteTeamContext(id);
      setContexts((prev) => prev.filter((c) => c.id !== id));
      if (selectedContext === id && contexts.length > 1) {
        setSelectedContext(contexts.find((c) => c.id !== id)?.id ?? "");
      }
    } catch (err) { console.error("Error deleting context:", err); }
  };

  // ---- Relation handler ----
  const handleDuplicatePrinciple = async () => {
    if (!relatingPrinciple || !relTargetPhase) return;
    try {
      await duplicatePrinciple(relatingPrinciple.id, relTargetPhase, relTargetContext ? [relTargetContext] : []);
      setRelatingPrinciple(null);
      await loadPrinciples();
    } catch (err) { console.error("Error duplicating principle:", err); }
  };

  // Phase icons
  const PHASE_ICONS: Record<string, React.ReactNode> = {
    "Fase ofensiva": (
      <svg width="16" height="16" viewBox="0 0 20 20" fill="none" stroke="#34d399" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M10 3v14M10 3l4 4M10 3L6 7" /><circle cx="10" cy="17" r="1.5" fill="#34d399" />
      </svg>
    ),
    "Fase defensiva": (
      <svg width="16" height="16" viewBox="0 0 20 20" fill="none" stroke="#60a5fa" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M10 2L3 5v5c0 4.5 3 7.5 7 9 4-1.5 7-4.5 7-9V5l-7-3z" /><path d="M10 5v11" />
      </svg>
    ),
    "Transición ofensiva": (
      <svg width="16" height="16" viewBox="0 0 20 20" fill="none" stroke="#fbbf24" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M4 16l6-6 6 6" /><path d="M10 10V3" /><path d="M7 5l3-3 3 3" />
      </svg>
    ),
    "Transición defensiva": (
      <svg width="16" height="16" viewBox="0 0 20 20" fill="none" stroke="#f87171" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M4 4l6 6 6-6" /><path d="M10 10v7" /><path d="M7 15l3 3 3-3" />
      </svg>
    ),
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
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-xs font-medium text-gray-500 uppercase tracking-wide">
            Contexto de equipo
          </h2>
          <button
            onClick={() => { setAddingContext(true); setNewContextName(""); setNewContextDesc(""); }}
            className="text-xs text-emerald-400 hover:text-emerald-300 font-medium flex items-center gap-1"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M12 5v14M5 12h14" /></svg>
            Nuevo contexto
          </button>
        </div>
        <div className="flex flex-wrap gap-2">
          {contexts.map((ctx) => (
            <div key={ctx.id} className="relative group">
              <button
                onClick={() => setSelectedContext(ctx.id)}
                onDoubleClick={() => {
                  setEditingContextId(ctx.id);
                  setEditContextName(ctx.name);
                  setEditContextDesc(ctx.description ?? "");
                }}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  selectedContext === ctx.id
                    ? "bg-emerald-600 text-white"
                    : "bg-[#1a1d27] border border-[#2a2d37] text-gray-300 hover:border-emerald-300"
                }`}
                title="Doble clic para editar"
              >
                {ctx.name}
              </button>
              {!ctx.is_default && (
                <button
                  onClick={() => handleDeleteContext(ctx.id)}
                  className="absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full bg-[#1a1d27] border border-[#2a2d37] text-gray-500 hover:text-rose-400 hover:border-rose-400 text-[10px] flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  ✕
                </button>
              )}
            </div>
          ))}
        </div>

        {/* Add context form */}
        {addingContext && (
          <div className="mt-3 bg-[#1a1d27] border border-[#2a2d37] rounded-lg p-3 flex flex-col gap-2">
            <input
              autoFocus
              value={newContextName}
              onChange={(e) => setNewContextName(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") handleCreateContext(); if (e.key === "Escape") setAddingContext(false); }}
              placeholder="Nombre del contexto (ej: Sub-17 España)"
              className="px-3 py-1.5 border border-[#2a2d37] rounded text-sm focus:outline-none focus:border-emerald-400"
            />
            <input
              value={newContextDesc}
              onChange={(e) => setNewContextDesc(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") handleCreateContext(); if (e.key === "Escape") setAddingContext(false); }}
              placeholder="Descripción breve (opcional)"
              className="px-3 py-1.5 border border-[#2a2d37] rounded text-sm focus:outline-none focus:border-emerald-400"
            />
            <div className="flex gap-2">
              <button onClick={handleCreateContext} className="px-3 py-1.5 bg-emerald-600 text-white rounded text-xs font-medium">Crear</button>
              <button onClick={() => setAddingContext(false)} className="text-xs text-gray-400">Cancelar</button>
            </div>
          </div>
        )}

        {/* Edit context modal */}
        {editingContextId && (
          <div className="mt-3 bg-[#1a1d27] border border-emerald-600/30 rounded-lg p-3 flex flex-col gap-2">
            <input
              autoFocus
              value={editContextName}
              onChange={(e) => setEditContextName(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") handleUpdateContext(editingContextId); if (e.key === "Escape") setEditingContextId(null); }}
              className="px-3 py-1.5 border border-[#2a2d37] rounded text-sm focus:outline-none focus:border-emerald-400"
            />
            <input
              value={editContextDesc}
              onChange={(e) => setEditContextDesc(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") handleUpdateContext(editingContextId); if (e.key === "Escape") setEditingContextId(null); }}
              placeholder="Descripción"
              className="px-3 py-1.5 border border-[#2a2d37] rounded text-sm focus:outline-none focus:border-emerald-400"
            />
            <div className="flex gap-2">
              <button onClick={() => handleUpdateContext(editingContextId)} className="px-3 py-1.5 bg-emerald-600 text-white rounded text-xs font-medium">Guardar</button>
              <button onClick={() => setEditingContextId(null)} className="text-xs text-gray-400">Cancelar</button>
            </div>
          </div>
        )}

        {activeContext && !editingContextId && (
          <p className="text-sm text-gray-500 mt-2">{activeContext.description}</p>
        )}
      </div>

      {/* Nivel 2: Fases del juego (sin ABP — tiene página propia) */}
      <div className="mb-6">
        <div className="flex border-b border-[#2a2d37]">
          {phases.filter((p) => p.name !== "ABP").map((phase) => (
            <button
              key={phase.id}
              onClick={() => setSelectedPhase(phase.id)}
              className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
                selectedPhase === phase.id
                  ? "border-emerald-600 text-emerald-600"
                  : "border-transparent text-gray-500 hover:text-gray-300"
              }`}
            >
              {PHASE_ICONS[phase.name] && <span className="flex-shrink-0">{PHASE_ICONS[phase.name]}</span>}
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
            onContextMenu={(e) => handleContextMenu(e, principle.id, principle.name)}
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
                {itemStatuses.has(principle.id) && <StatusBadge status={itemStatuses.get(principle.id)!} />}
                <button
                  onClick={() => {
                    setRelatingPrinciple(principle);
                    setRelTargetPhase("");
                    setRelTargetContext(selectedContext);
                  }}
                  className="text-xs text-violet-400 hover:text-violet-300 font-medium flex items-center gap-1"
                  title="Duplicar en otra fase o contexto"
                >
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M7 7h10v10" /><path d="M7 7L17 17" /></svg>
                  Relacionar
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

      {/* Modal: Relacionar principio */}
      {relatingPrinciple && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center" onClick={() => setRelatingPrinciple(null)}>
          <div className="bg-[#1a1d27] border border-[#2a2d37] rounded-xl p-6 w-full max-w-md" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-sm font-semibold text-gray-200 mb-1">Relacionar principio</h3>
            <p className="text-xs text-gray-500 mb-4">Se creará una copia independiente de <span className="text-emerald-400">&ldquo;{relatingPrinciple.name}&rdquo;</span> con sus subprincipios y comportamientos en la fase y contexto seleccionados.</p>

            <label className="text-xs text-gray-400 font-medium block mb-1.5">Fase destino</label>
            <div className="flex flex-wrap gap-2 mb-4">
              {phases.filter((p) => p.name !== "ABP").map((p) => (
                <button
                  key={p.id}
                  onClick={() => setRelTargetPhase(p.id)}
                  className={`px-3 py-1.5 rounded text-xs font-medium transition-colors ${
                    relTargetPhase === p.id
                      ? "bg-violet-600 text-white"
                      : "bg-[#22252f] border border-[#2a2d37] text-gray-400 hover:border-violet-400"
                  }`}
                >
                  {p.name}
                </button>
              ))}
            </div>

            <label className="text-xs text-gray-400 font-medium block mb-1.5">Contexto destino</label>
            <div className="flex flex-wrap gap-2 mb-5">
              {contexts.map((c) => (
                <button
                  key={c.id}
                  onClick={() => setRelTargetContext(c.id)}
                  className={`px-3 py-1.5 rounded text-xs font-medium transition-colors ${
                    relTargetContext === c.id
                      ? "bg-violet-600 text-white"
                      : "bg-[#22252f] border border-[#2a2d37] text-gray-400 hover:border-violet-400"
                  }`}
                >
                  {c.name}
                </button>
              ))}
            </div>

            <div className="flex justify-end gap-2">
              <button onClick={() => setRelatingPrinciple(null)} className="px-4 py-2 text-xs text-gray-400 hover:text-gray-300">Cancelar</button>
              <button
                onClick={handleDuplicatePrinciple}
                disabled={!relTargetPhase}
                className="px-4 py-2 bg-violet-600 text-white rounded-lg text-xs font-medium disabled:opacity-40"
              >
                Duplicar principio
              </button>
            </div>
          </div>
        </div>
      )}

      {statusMenu && (
        <StatusMenu
          x={statusMenu.x}
          y={statusMenu.y}
          currentStatus={itemStatuses.get(statusMenu.id) ?? null}
          onSelect={handleSetStatus}
          onRemove={handleRemoveStatus}
          onClose={() => setStatusMenu(null)}
        />
      )}
    </div>
  );
}
