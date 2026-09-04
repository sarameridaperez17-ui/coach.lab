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
  getBookmarksByStatus,
  getTasks,
} from "@/lib/api";
import type { ItemStatus, Bookmark } from "@/lib/api";
import type {
  TeamContext,
  GamePhase,
  BlockHeight,
  Principle,
  BehaviorType,
  Task,
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

// ---- YouTube helpers ----
function extractYoutubeId(url: string): string | null {
  if (!url) return null;
  const patterns = [
    /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/|youtube\.com\/shorts\/)([a-zA-Z0-9_-]{11})/,
    /^([a-zA-Z0-9_-]{11})$/,
  ];
  for (const p of patterns) {
    const m = url.match(p);
    if (m) return m[1];
  }
  return null;
}

function YoutubeThumbnail({ url, onClick, size = "sm" }: { url: string; onClick: () => void; size?: "sm" | "md" }) {
  const videoId = extractYoutubeId(url);
  if (!videoId) return null;
  const dim = size === "sm" ? "h-8 w-14" : "h-10 w-16";
  return (
    <button
      onClick={(e) => { e.stopPropagation(); onClick(); }}
      className={`${dim} rounded overflow-hidden relative group/yt flex-shrink-0 border border-[#2a2d37] hover:border-red-500/50 transition-colors`}
      title="Ver vídeo"
    >
      <img
        src={`https://img.youtube.com/vi/${videoId}/mqdefault.jpg`}
        alt="Video"
        className="w-full h-full object-cover"
      />
      <div className="absolute inset-0 flex items-center justify-center bg-black/30 group-hover/yt:bg-black/50 transition-colors">
        <svg width={size === "sm" ? "14" : "18"} height={size === "sm" ? "14" : "18"} viewBox="0 0 24 24" fill="white">
          <path d="M8 5v14l11-7z" />
        </svg>
      </div>
    </button>
  );
}

function YoutubeUrlInput({
  currentUrl,
  onSave,
  onCancel,
}: {
  currentUrl: string | null;
  onSave: (url: string | null) => void;
  onCancel: () => void;
}) {
  const [draft, setDraft] = useState(currentUrl ?? "");
  return (
    <div className="flex items-center gap-2 mt-1" onClick={(e) => e.stopPropagation()}>
      <input
        autoFocus
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            const val = draft.trim();
            onSave(val ? val : null);
          }
          if (e.key === "Escape") onCancel();
        }}
        placeholder="https://youtube.com/watch?v=..."
        className="flex-1 px-2 py-1 border border-[#2a2d37] rounded text-xs focus:outline-none focus:border-red-400 bg-[#22252f] text-gray-300 min-w-0"
      />
      <button
        onClick={() => { const val = draft.trim(); onSave(val ? val : null); }}
        className="px-2 py-1 bg-red-600 text-white rounded text-[10px] font-medium flex-shrink-0"
      >
        OK
      </button>
      {currentUrl && (
        <button
          onClick={() => onSave(null)}
          className="text-[10px] text-gray-500 hover:text-red-400 flex-shrink-0"
          title="Quitar vídeo"
        >
          Quitar
        </button>
      )}
      <button onClick={onCancel} className="text-xs text-gray-500 hover:text-gray-300 flex-shrink-0">✕</button>
    </div>
  );
}

// YouTube icon button (small play icon to add/edit video)
function YoutubeIconButton({ hasVideo, onClick }: { hasVideo: boolean; onClick: () => void }) {
  return (
    <button
      onClick={(e) => { e.stopPropagation(); onClick(); }}
      className={`flex-shrink-0 p-1 rounded transition-colors ${
        hasVideo
          ? "text-red-400 hover:text-red-300 hover:bg-red-900/20"
          : "text-gray-600 hover:text-red-400 hover:bg-red-900/20"
      }`}
      title={hasVideo ? "Editar vídeo" : "Añadir vídeo"}
    >
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M22.54 6.42a2.78 2.78 0 0 0-1.94-2C18.88 4 12 4 12 4s-6.88 0-8.6.46a2.78 2.78 0 0 0-1.94 2A29 29 0 0 0 1 11.75a29 29 0 0 0 .46 5.33A2.78 2.78 0 0 0 3.4 19.13C5.12 19.55 12 19.55 12 19.55s6.88 0 8.6-.46a2.78 2.78 0 0 0 1.94-2 29 29 0 0 0 .46-5.25 29 29 0 0 0-.46-5.42z" />
        <polygon points="9.75 15.02 15.5 11.75 9.75 8.48 9.75 15.02" />
      </svg>
    </button>
  );
}

// ---- Behavior type badge ----
const BEHAVIOR_LABELS: Record<BehaviorType, { label: string; color: string }> = {
  individual: { label: "Individual", color: "bg-amber-900/50 text-amber-400" },
  relations: { label: "Relaciones", color: "bg-sky-900/50 text-sky-400" },
  collective: { label: "Colectivo", color: "bg-violet-900/50 text-violet-400" },
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

// Phase accent colors for sidebar
const PHASE_COLORS: Record<string, { accent: string; bg: string; border: string }> = {
  "Fase ofensiva": { accent: "#34d399", bg: "rgba(52,211,153,0.08)", border: "rgba(52,211,153,0.2)" },
  "Fase defensiva": { accent: "#60a5fa", bg: "rgba(96,165,250,0.08)", border: "rgba(96,165,250,0.2)" },
  "Transición ofensiva": { accent: "#fbbf24", bg: "rgba(251,191,36,0.08)", border: "rgba(251,191,36,0.2)" },
  "Transición defensiva": { accent: "#f87171", bg: "rgba(248,113,113,0.08)", border: "rgba(248,113,113,0.2)" },
};

export default function ModeloDeJuegoPage() {
  const [contexts, setContexts] = useState<TeamContext[]>([]);
  const [phases, setPhases] = useState<GamePhase[]>([]);
  const [blocks, setBlocks] = useState<BlockHeight[]>([]);
  const [principles, setPrinciples] = useState<Principle[]>([]);
  const [allPhasePrinciples, setAllPhasePrinciples] = useState<Record<string, Principle[]>>({});

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
  const [newBehaviorType, setNewBehaviorType] = useState<BehaviorType>("individual");
  const [itemStatuses, setItemStatuses] = useState<Map<string, ItemStatus>>(new Map());
  const [statusMenu, setStatusMenu] = useState<{x: number; y: number; id: string; title: string} | null>(null);

  // Sidebar data
  const [favoriteTasks, setFavoriteTasks] = useState<Task[]>([]);
  const [allTasks, setAllTasks] = useState<Task[]>([]);

  // Context CRUD
  const [addingContext, setAddingContext] = useState(false);
  const [newContextName, setNewContextName] = useState("");
  const [newContextDesc, setNewContextDesc] = useState("");
  const [editingContextId, setEditingContextId] = useState<string | null>(null);
  const [editContextName, setEditContextName] = useState("");
  const [editContextDesc, setEditContextDesc] = useState("");

  // YouTube state
  const [editingYoutubeId, setEditingYoutubeId] = useState<string | null>(null); // id of item being edited
  const [editingYoutubeLevel, setEditingYoutubeLevel] = useState<"principle" | "sub" | "behavior" | null>(null);
  const [playingVideoUrl, setPlayingVideoUrl] = useState<string | null>(null); // url for modal player

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

  // Load sidebar data: favorite bookmarks + all tasks
  useEffect(() => {
    async function loadSidebarData() {
      try {
        const [bookmarks, tasks] = await Promise.all([
          getBookmarksByStatus("favorite"),
          getTasks(),
        ]);
        // Filter bookmarks to get task IDs that are favorites
        const favTaskIds = new Set(
          bookmarks
            .filter((b: Bookmark) => b.item_type === "task")
            .map((b: Bookmark) => b.item_id)
        );
        setAllTasks(tasks);
        setFavoriteTasks(tasks.filter((t: Task) => favTaskIds.has(t.id)));
      } catch (err) {
        console.error("Error loading sidebar data:", err);
      }
    }
    loadSidebarData();
  }, []);

  // Load all phase principles for "relations" sidebar section
  useEffect(() => {
    async function loadAllPhases() {
      if (phases.length === 0) return;
      const result: Record<string, Principle[]> = {};
      await Promise.all(
        phases.filter(p => p.name !== "ABP").map(async (phase) => {
          try {
            const data = await getPrinciples(phase.id);
            result[phase.id] = data;
          } catch { /* ignore */ }
        })
      );
      setAllPhasePrinciples(result);
    }
    loadAllPhases();
  }, [phases]);

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
      // Also update allPhasePrinciples for sidebar counts
      setAllPhasePrinciples(prev => ({ ...prev, [selectedPhase]: data }));
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
      await createPrinciple(newPrincipleName.trim(), selectedPhase, [selectedContext], selectedBlock);
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

  // YouTube URL save handlers
  const handleSaveYoutubeUrl = async (level: "principle" | "sub" | "behavior", id: string, url: string | null) => {
    try {
      if (level === "principle") await updatePrinciple(id, { youtube_url: url });
      else if (level === "sub") await updateSubPrinciple(id, { youtube_url: url });
      else await updateBehavior(id, { youtube_url: url });
      setEditingYoutubeId(null);
      setEditingYoutubeLevel(null);
      await loadPrinciples();
    } catch (err) { console.error("Error saving YouTube URL:", err); }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-gray-400">Cargando modelo de juego...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <p className="text-red-500 font-medium mb-2">Error de conexión</p>
          <p className="text-gray-400 text-sm">{error}</p>
        </div>
      </div>
    );
  }

  const activeContext = contexts.find((c) => c.id === selectedContext);
  const activePhase = phases.find((p) => p.id === selectedPhase);
  const phaseColors = activePhase ? (PHASE_COLORS[activePhase.name] ?? { accent: "#34d399", bg: "rgba(52,211,153,0.08)", border: "rgba(52,211,153,0.2)" }) : { accent: "#34d399", bg: "rgba(52,211,153,0.08)", border: "rgba(52,211,153,0.2)" };

  // Filter principles by context AND block height
  const filteredPrinciples = principles.filter((p) => {
    const ctxIds = p.principle_contexts?.map((pc) => pc.team_context_id) ?? [];
    const ctxOk = ctxIds.length === 0 || ctxIds.includes(selectedContext);
    // Block height filter: if a block is selected, show only principles for that block (or unassigned)
    const blockOk = !selectedBlock || !p.block_height_id || p.block_height_id === selectedBlock;
    return ctxOk && blockOk;
  });

  // --- Sidebar computed data ---
  const totalPrinciples = filteredPrinciples.length;
  const totalSubPrinciples = filteredPrinciples.reduce((sum, p) => sum + (p.sub_principles?.filter(sp => !sp.archived)?.length ?? 0), 0);
  const totalBehaviors = filteredPrinciples.reduce((sum, p) => {
    return sum + (p.sub_principles?.filter(sp => !sp.archived) ?? []).reduce((s2, sp) => s2 + (sp.behaviors?.filter(b => !b.archived)?.length ?? 0), 0);
  }, 0);

  // Relations: count principles in other phases
  const otherPhases = phases.filter(p => p.name !== "ABP" && p.id !== selectedPhase);
  const phaseRelations = otherPhases.map(p => {
    const pPrinciples = allPhasePrinciples[p.id] ?? [];
    return {
      phase: p,
      principleCount: pPrinciples.length,
      subPrincipleCount: pPrinciples.reduce((s, pr) => s + (pr.sub_principles?.filter(sp => !sp.archived)?.length ?? 0), 0),
    };
  });

  // Favorite tasks for this phase
  const phaseTaskIds = new Set(
    allTasks
      .filter(t => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const tgp = (t as any).task_game_phases as Array<{game_phase_id: string}> | undefined;
        return tgp?.some(tp => tp.game_phase_id === selectedPhase);
      })
      .map(t => t.id)
  );
  const phaseFavTasks = favoriteTasks.filter(t => phaseTaskIds.has(t.id));
  // If no phase-specific favorites, show general favorites (up to 5)
  const sidebarTasks = phaseFavTasks.length > 0 ? phaseFavTasks.slice(0, 5) : favoriteTasks.slice(0, 5);

  return (
    <div className="flex gap-6">
      {/* ===== LEFT: Main content ===== */}
      <div className="flex-1 min-w-0">
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

        {/* Nivel 2: Fases del juego (sin ABP) */}
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
              <div className="p-4 border-b border-[#22252f]">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="w-2 h-2 rounded-full bg-emerald-500" />
                    <InlineEdit
                      value={principle.name}
                      onSave={(v) => {
                        updatePrinciple(principle.id, { name: v }).then(loadPrinciples);
                      }}
                      className="font-semibold text-gray-200"
                    />
                    {principle.youtube_url && (
                      <YoutubeThumbnail url={principle.youtube_url} onClick={() => setPlayingVideoUrl(principle.youtube_url!)} />
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    {itemStatuses.has(principle.id) && <StatusBadge status={itemStatuses.get(principle.id)!} />}
                    <YoutubeIconButton
                      hasVideo={!!principle.youtube_url}
                      onClick={() => {
                        setEditingYoutubeId(principle.id);
                        setEditingYoutubeLevel("principle");
                      }}
                    />
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
                {editingYoutubeId === principle.id && editingYoutubeLevel === "principle" && (
                  <div className="px-4 pb-2">
                    <YoutubeUrlInput
                      currentUrl={principle.youtube_url}
                      onSave={(url) => handleSaveYoutubeUrl("principle", principle.id, url)}
                      onCancel={() => { setEditingYoutubeId(null); setEditingYoutubeLevel(null); }}
                    />
                  </div>
                )}
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
                          {sub.youtube_url && (
                            <YoutubeThumbnail url={sub.youtube_url} onClick={() => setPlayingVideoUrl(sub.youtube_url!)} size="sm" />
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          <YoutubeIconButton
                            hasVideo={!!sub.youtube_url}
                            onClick={() => {
                              setEditingYoutubeId(sub.id);
                              setEditingYoutubeLevel("sub");
                            }}
                          />
                          <button
                            onClick={() => {
                              setAddingBehaviorTo(sub.id);
                              setNewBehaviorName("");
                              setNewBehaviorType("individual");
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

                      {editingYoutubeId === sub.id && editingYoutubeLevel === "sub" && (
                        <div className="ml-5 mb-2">
                          <YoutubeUrlInput
                            currentUrl={sub.youtube_url}
                            onSave={(url) => handleSaveYoutubeUrl("sub", sub.id, url)}
                            onCancel={() => { setEditingYoutubeId(null); setEditingYoutubeLevel(null); }}
                          />
                        </div>
                      )}

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
                              <div key={behavior.id} className="py-1.5 group">
                                <div className="flex items-center justify-between">
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
                                    {behavior.youtube_url && (
                                      <YoutubeThumbnail url={behavior.youtube_url} onClick={() => setPlayingVideoUrl(behavior.youtube_url!)} size="sm" />
                                    )}
                                  </div>
                                  <div className="flex items-center gap-1">
                                    <span className="opacity-0 group-hover:opacity-100 transition-opacity">
                                      <YoutubeIconButton
                                        hasVideo={!!behavior.youtube_url}
                                        onClick={() => {
                                          setEditingYoutubeId(behavior.id);
                                          setEditingYoutubeLevel("behavior");
                                        }}
                                      />
                                    </span>
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
                                </div>
                                {editingYoutubeId === behavior.id && editingYoutubeLevel === "behavior" && (
                                  <div className="ml-3 mt-1">
                                    <YoutubeUrlInput
                                      currentUrl={behavior.youtube_url}
                                      onSave={(url) => handleSaveYoutubeUrl("behavior", behavior.id, url)}
                                      onCancel={() => { setEditingYoutubeId(null); setEditingYoutubeLevel(null); }}
                                    />
                                  </div>
                                )}
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
                              <option value="individual">Individual</option>
                              <option value="relations">Relaciones</option>
                              <option value="collective">Colectivo</option>
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
              + Nuevo principio para {activeContext?.name} — {activePhase?.name}{selectedBlock ? ` — ${blocks.find(b => b.id === selectedBlock)?.name ?? ""}` : ""}
            </button>
          )}
        </div>
      </div>

      {/* ===== RIGHT: Sidebar ===== */}
      <div className="w-72 flex-shrink-0 space-y-4">
        {/* Resumen de la fase */}
        <div className="rounded-xl border overflow-hidden" style={{ borderColor: phaseColors.border, backgroundColor: phaseColors.bg }}>
          <div className="px-4 py-3 border-b" style={{ borderColor: phaseColors.border }}>
            <div className="flex items-center gap-2">
              {activePhase && PHASE_ICONS[activePhase.name]}
              <h3 className="text-sm font-semibold text-gray-200">
                {activePhase?.name ?? "Fase"}
              </h3>
            </div>
            <p className="text-xs text-gray-500 mt-1">Resumen de la fase seleccionada</p>
          </div>
          <div className="p-4 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs text-gray-400">Principios</span>
              <span className="text-sm font-bold" style={{ color: phaseColors.accent }}>{totalPrinciples}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-xs text-gray-400">Subprincipios</span>
              <span className="text-sm font-bold" style={{ color: phaseColors.accent }}>{totalSubPrinciples}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-xs text-gray-400">Comportamientos</span>
              <span className="text-sm font-bold" style={{ color: phaseColors.accent }}>{totalBehaviors}</span>
            </div>
            {/* Behavior type breakdown */}
            {totalBehaviors > 0 && (
              <div className="pt-2 border-t" style={{ borderColor: phaseColors.border }}>
                <p className="text-[10px] text-gray-500 uppercase tracking-wide mb-2">Por tipo</p>
                {(["individual", "relations", "collective"] as BehaviorType[]).map(type => {
                  const count = filteredPrinciples.reduce((sum, p) => {
                    return sum + (p.sub_principles?.filter(sp => !sp.archived) ?? []).reduce((s2, sp) => {
                      return s2 + (sp.behaviors?.filter(b => !b.archived && b.type === type)?.length ?? 0);
                    }, 0);
                  }, 0);
                  if (count === 0) return null;
                  const badge = BEHAVIOR_LABELS[type];
                  return (
                    <div key={type} className="flex items-center justify-between mb-1">
                      <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${badge.color}`}>{badge.label}</span>
                      <span className="text-xs text-gray-400">{count}</span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Relación con otras fases */}
        <div className="bg-[#1a1d27] rounded-xl border border-[#2a2d37] overflow-hidden">
          <div className="px-4 py-3 border-b border-[#22252f]">
            <h3 className="text-sm font-semibold text-gray-200 flex items-center gap-2">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#a78bfa" strokeWidth="2" strokeLinecap="round">
                <path d="M7 7h10v10" /><path d="M7 7L17 17" />
              </svg>
              Relación con otras fases
            </h3>
          </div>
          <div className="p-4 space-y-3">
            {phaseRelations.map(({ phase, principleCount, subPrincipleCount }) => (
              <button
                key={phase.id}
                onClick={() => setSelectedPhase(phase.id)}
                className="w-full text-left group"
              >
                <div className="flex items-center gap-2 mb-1">
                  {PHASE_ICONS[phase.name] && <span className="flex-shrink-0 opacity-60 group-hover:opacity-100 transition-opacity">{PHASE_ICONS[phase.name]}</span>}
                  <span className="text-xs font-medium text-gray-300 group-hover:text-gray-100 transition-colors">{phase.name}</span>
                </div>
                <div className="flex items-center gap-3 pl-6">
                  <span className="text-[10px] text-gray-500">{principleCount} principios</span>
                  <span className="text-[10px] text-gray-500">{subPrincipleCount} subprincipios</span>
                </div>
              </button>
            ))}
            {phaseRelations.length === 0 && (
              <p className="text-xs text-gray-500">No hay otras fases disponibles</p>
            )}
          </div>
        </div>

        {/* Tareas destacadas */}
        <div className="bg-[#1a1d27] rounded-xl border border-[#2a2d37] overflow-hidden">
          <div className="px-4 py-3 border-b border-[#22252f]">
            <h3 className="text-sm font-semibold text-gray-200 flex items-center gap-2">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#f87171" strokeWidth="2" strokeLinecap="round">
                <path d="M12 2l3.09 6.26L22 9.27l-5 4.87L18.18 21 12 17.27 5.82 21 7 14.14l-5-4.87 6.91-1.01L12 2z" />
              </svg>
              Tareas destacadas
            </h3>
            <p className="text-[10px] text-gray-500 mt-0.5">
              {phaseFavTasks.length > 0
                ? `Tareas favoritas de ${activePhase?.name}`
                : "Tareas marcadas como favoritas"}
            </p>
          </div>
          <div className="p-3">
            {sidebarTasks.length > 0 ? (
              <div className="space-y-2">
                {sidebarTasks.map(task => (
                  <div key={task.id} className="bg-[#22252f] rounded-lg px-3 py-2 group">
                    <p className="text-xs font-medium text-gray-300 line-clamp-2">{task.name}</p>
                    {task.duration_minutes > 0 && (
                      <p className="text-[10px] text-gray-500 mt-1">{task.duration_minutes} min</p>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-4">
                <p className="text-xs text-gray-500">Sin tareas favoritas</p>
                <p className="text-[10px] text-gray-600 mt-1">Marca tareas con ★ para verlas aquí</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Modal: YouTube player */}
      {playingVideoUrl && (() => {
        const vid = extractYoutubeId(playingVideoUrl);
        if (!vid) return null;
        return (
          <div
            className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4"
            onClick={() => setPlayingVideoUrl(null)}
          >
            <div className="relative w-full max-w-3xl" onClick={(e) => e.stopPropagation()}>
              <button
                onClick={() => setPlayingVideoUrl(null)}
                className="absolute -top-10 right-0 text-white/70 hover:text-white text-sm font-medium flex items-center gap-1"
              >
                Cerrar ✕
              </button>
              <div className="relative w-full" style={{ paddingBottom: "56.25%" }}>
                <iframe
                  className="absolute inset-0 w-full h-full rounded-xl"
                  src={`https://www.youtube.com/embed/${vid}?autoplay=1&rel=0`}
                  allow="autoplay; encrypted-media"
                  allowFullScreen
                />
              </div>
            </div>
          </div>
        );
      })()}

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
