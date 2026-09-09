"use client";

import { useState, useEffect } from "react";
import { getTasks, createTask, updateTask, deleteTask, getGamePhases, setItemStatus, removeItemStatus, getItemStatuses, getTacticalDiagrams, saveTacticalDiagram } from "@/lib/api";
import type { ItemStatus } from "@/lib/api";
import type { Task, ContentType, GamePhase } from "@/types";
import { StatusMenu, StatusBadge } from "@/components/ui/StatusMenu";
import { TacticalBoardEditor } from "@/components/tactical-board";
import type { BoardState } from "@/components/tactical-board";


const CONTENT_LABELS: Record<ContentType, { label: string; color: string; accent: string }> = {
  tactical: { label: "Táctico", color: "bg-emerald-900/50 text-emerald-400", accent: "#34d399" },
  technical: { label: "Técnico", color: "bg-blue-900/50 text-blue-400", accent: "#60a5fa" },
  physical: { label: "Físico", color: "bg-orange-900/50 text-orange-400", accent: "#fb923c" },
  psychological: { label: "Psicológico", color: "bg-violet-900/50 text-violet-400", accent: "#a78bfa" },
};

const CONTENT_ICONS: Record<ContentType, string> = {
  tactical: "🎯",
  technical: "⚙️",
  physical: "💪",
  psychological: "🧠",
};

export default function TareasPage() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [phases, setPhases] = useState<GamePhase[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [contentFilter, setContentFilter] = useState<ContentType | "all">("all");
  const [adding, setAdding] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [itemStatuses, setItemStatuses] = useState<Map<string, ItemStatus>>(new Map());
  const [statusMenu, setStatusMenu] = useState<{x: number; y: number; id: string; title: string} | null>(null);

  // Form fields
  const [formName, setFormName] = useState("");
  const [formDesc, setFormDesc] = useState("");
  const [formRules, setFormRules] = useState("");
  const [formDimensions, setFormDimensions] = useState("");
  const [formPlayers, setFormPlayers] = useState("");
  const [formDuration, setFormDuration] = useState(15);
  const [formVariants, setFormVariants] = useState("");
  const [formContentType, setFormContentType] = useState<ContentType[]>(["tactical"]);
  const [formBoardState, setFormBoardState] = useState<BoardState | undefined>(undefined);
  const [showBoardEditor, setShowBoardEditor] = useState(false);

  const load = async () => {
    try {
      const [t, ph] = await Promise.all([getTasks(), getGamePhases()]);
      setTasks(t);
      setPhases(ph);
    } catch (err) {
      console.error("Error loading tasks:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    getItemStatuses("task").then(setItemStatuses).catch(console.error);
  }, []);

  const handleContextMenu = (e: React.MouseEvent, id: string, title: string) => {
    e.preventDefault();
    setStatusMenu({ x: e.clientX, y: e.clientY, id, title });
  };

  const handleSetStatus = async (status: ItemStatus) => {
    if (!statusMenu) return;
    try {
      await setItemStatus("task", statusMenu.id, statusMenu.title, status);
      setItemStatuses(prev => new Map(prev).set(statusMenu.id, status));
    } catch (err) { console.error("Error setting status:", err); }
    setStatusMenu(null);
  };

  const handleRemoveStatus = async () => {
    if (!statusMenu) return;
    try {
      await removeItemStatus("task", statusMenu.id);
      setItemStatuses(prev => { const next = new Map(prev); next.delete(statusMenu.id); return next; });
    } catch (err) { console.error("Error removing status:", err); }
    setStatusMenu(null);
  };

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("crear") === "1") {
      setAdding(true);
      window.history.replaceState({}, "", window.location.pathname);
    }
  }, []);

  const resetForm = () => {
    setFormName("");
    setFormDesc("");
    setFormRules("");
    setFormDimensions("");
    setFormPlayers("");
    setFormDuration(15);
    setFormVariants("");
    setFormContentType(["tactical"]);
    setFormBoardState(undefined);
    setShowBoardEditor(false);
  };

  const handleCreate = async () => {
    if (!formName.trim()) return;
    try {
      const created = await createTask({
        name: formName.trim(),
        description: formDesc.trim(),
        rules: formRules.trim(),
        dimensions: formDimensions.trim(),
        num_players: formPlayers.trim(),
        duration_minutes: formDuration,
        variants: formVariants.trim(),
        content_type: formContentType,
      });
      if (formBoardState && created?.id) {
        await saveTacticalDiagram("task", created.id, formBoardState as unknown as Record<string, unknown>, formName.trim()).catch(console.error);
      }
      resetForm();
      setAdding(false);
      await load();
    } catch (err) {
      console.error("Error creating task:", err);
    }
  };

  const handleUpdate = async (id: string) => {
    try {
      await updateTask(id, {
        name: formName.trim(),
        description: formDesc.trim(),
        rules: formRules.trim(),
        dimensions: formDimensions.trim(),
        num_players: formPlayers.trim(),
        duration_minutes: formDuration,
        variants: formVariants.trim(),
        content_type: formContentType,
      });
      if (formBoardState) {
        const existing = await getTacticalDiagrams("task", id).catch(() => []);
        await saveTacticalDiagram("task", id, formBoardState as unknown as Record<string, unknown>, formName.trim(), existing[0]?.id).catch(console.error);
      }
      setEditingId(null);
      resetForm();
      await load();
    } catch (err) {
      console.error("Error updating task:", err);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("¿Eliminar esta tarea?")) return;
    try {
      await deleteTask(id);
      await load();
    } catch (err) {
      console.error("Error deleting task:", err);
    }
  };

  const toggleContentType = (ct: ContentType) => {
    setFormContentType((prev) =>
      prev.includes(ct) ? prev.filter((c) => c !== ct) : [...prev, ct]
    );
  };

  const filtered = tasks.filter((t) => {
    const matchSearch =
      t.name.toLowerCase().includes(search.toLowerCase()) ||
      t.description?.toLowerCase().includes(search.toLowerCase());
    const matchContent =
      contentFilter === "all" || t.content_type?.includes(contentFilter);
    return matchSearch && matchContent;
  });

  /* ── Sidebar data ── */
  const totalTasks = tasks.length;
  const totalDuration = tasks.reduce((sum, t) => sum + (t.duration_minutes || 0), 0);
  const avgDuration = totalTasks > 0 ? Math.round(totalDuration / totalTasks) : 0;

  const contentCounts = tasks.reduce<Record<string, number>>((acc, t) => {
    (t.content_type || []).forEach(ct => { acc[ct] = (acc[ct] || 0) + 1; });
    return acc;
  }, {});

  const favoriteIds = Array.from(itemStatuses.entries()).filter(([, s]) => s === "favorite").map(([id]) => id);
  const recentTasks = [...tasks].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()).slice(0, 5);

  const TaskForm = ({ onSubmit, submitLabel }: { onSubmit: () => void; submitLabel: string }) => (
    <div className="bg-surface rounded-xl border border-border p-4 mb-4">
      <div className="grid grid-cols-2 gap-3 mb-3">
        <input
          autoFocus
          value={formName}
          onChange={(e) => setFormName(e.target.value)}
          placeholder="Nombre de la tarea"
          className="col-span-2 px-3 py-2 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-300 bg-surface-hover"
        />
        <textarea
          value={formDesc}
          onChange={(e) => setFormDesc(e.target.value)}
          placeholder="Descripción / objetivo"
          rows={2}
          className="col-span-2 px-3 py-2 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-300 resize-none bg-surface-hover"
        />
        <textarea
          value={formRules}
          onChange={(e) => setFormRules(e.target.value)}
          placeholder="Reglas"
          rows={2}
          className="px-3 py-2 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-300 resize-none bg-surface-hover"
        />
        <textarea
          value={formVariants}
          onChange={(e) => setFormVariants(e.target.value)}
          placeholder="Variantes"
          rows={2}
          className="px-3 py-2 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-300 resize-none bg-surface-hover"
        />
        <input
          value={formDimensions}
          onChange={(e) => setFormDimensions(e.target.value)}
          placeholder="Dimensiones (ej: 40x30m)"
          className="px-3 py-2 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-300 bg-surface-hover"
        />
        <input
          value={formPlayers}
          onChange={(e) => setFormPlayers(e.target.value)}
          placeholder="Jugadoras (ej: 8v8+2)"
          className="px-3 py-2 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-300 bg-surface-hover"
        />
        <div className="flex items-center gap-2">
          <label className="text-sm text-muted">Duración:</label>
          <input
            type="number"
            value={formDuration}
            onChange={(e) => setFormDuration(Number(e.target.value))}
            min={1}
            className="w-20 px-3 py-2 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-300 bg-surface-hover"
          />
          <span className="text-sm text-foreground-secondary">min</span>
        </div>
      </div>

      {/* Content type toggles */}
      <div className="mb-3">
        <label className="text-xs text-muted font-medium mb-1 block">Tipo de contenido</label>
        <div className="flex gap-2">
          {(Object.keys(CONTENT_LABELS) as ContentType[]).map((ct) => {
            const selected = formContentType.includes(ct);
            return (
              <button
                key={ct}
                onClick={() => toggleContentType(ct)}
                className={`px-3 py-1 rounded text-xs font-medium transition-colors ${
                  selected ? CONTENT_LABELS[ct].color : "bg-surface-hover text-foreground-secondary"
                }`}
              >
                {CONTENT_LABELS[ct].label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Tablero táctico */}
      <div className="mb-3">
        <button
          onClick={() => setShowBoardEditor(!showBoardEditor)}
          className="flex items-center gap-2 px-3 py-1.5 bg-surface-hover border border-border rounded-lg text-xs text-foreground-secondary hover:border-purple-400 hover:text-purple-400 transition-colors"
        >
          <span>⚽</span>
          <span>{showBoardEditor ? "Ocultar tablero táctico" : "Abrir tablero táctico"}</span>
        </button>
        {showBoardEditor && (
          <div className="mt-2">
            <TacticalBoardEditor
              initialState={formBoardState}
              onChange={(state) => setFormBoardState(state)}
            />
          </div>
        )}
      </div>

      <div className="flex gap-2">
        <button
          onClick={onSubmit}
          className="px-3 py-1.5 bg-purple-600 text-white rounded text-sm hover:bg-purple-700"
        >
          {submitLabel}
        </button>
        <button
          onClick={() => { setAdding(false); setEditingId(null); resetForm(); }}
          className="px-3 py-1.5 bg-surface-hover text-foreground-secondary rounded text-sm hover:bg-border"
        >
          Cancelar
        </button>
      </div>
    </div>
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-foreground-secondary">Cargando tareas...</p>
      </div>
    );
  }

  return (
    <div className="flex gap-6">
      {/* ── Main content ── */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold text-foreground">Tareas de entrenamiento</h1>
          <button
            onClick={() => { resetForm(); setAdding(true); }}
            className="px-4 py-2 bg-purple-600 text-white rounded-lg text-sm font-medium hover:bg-purple-700 transition-colors"
          >
            + Nueva tarea
          </button>
        </div>

        {/* Filter tabs */}
        <div className="flex gap-2 mb-4">
          <button
            onClick={() => setContentFilter("all")}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
              contentFilter === "all" ? "bg-purple-600 text-white" : "bg-surface border border-border text-foreground-secondary hover:border-purple-400"
            }`}
          >
            Todas
          </button>
          {(Object.keys(CONTENT_LABELS) as ContentType[]).map((ct) => (
            <button
              key={ct}
              onClick={() => setContentFilter(ct)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors flex items-center gap-1.5 ${
                contentFilter === ct ? CONTENT_LABELS[ct].color + " ring-1 ring-current" : "bg-surface border border-border text-foreground-secondary hover:border-purple-400"
              }`}
            >
              <span>{CONTENT_ICONS[ct]}</span>
              {CONTENT_LABELS[ct].label}
            </button>
          ))}
        </div>

        {/* Search */}
        <div className="mb-6">
          <input
            type="text"
            placeholder="Buscar tareas..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full px-4 py-2 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-300 focus:border-purple-300 bg-surface-hover"
          />
        </div>

        {/* Formulario crear */}
        {adding && <TaskForm onSubmit={handleCreate} submitLabel="Crear" />}

        {/* Task cards grid */}
        {filtered.length === 0 ? (
          <div className="bg-surface rounded-xl border border-border p-8 text-center text-foreground-secondary">
            <p className="text-lg font-medium mb-2">Sin tareas</p>
            <p className="text-sm">
              Crea tu primera tarea de entrenamiento vinculada a principios del modelo de juego.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {filtered.map((task) => {
              const primaryType = task.content_type?.[0] || "tactical";
              const isFavorite = favoriteIds.includes(task.id);
              return editingId === task.id ? (
                <div key={task.id} className="col-span-1 md:col-span-2">
                  <TaskForm onSubmit={() => handleUpdate(task.id)} submitLabel="Guardar" />
                </div>
              ) : (
                <div
                  key={task.id}
                  className="bg-surface rounded-xl border border-border overflow-hidden group hover:border-border-light transition-colors"
                  onContextMenu={(e) => handleContextMenu(e, task.id, task.name)}
                >
                  {/* Color accent bar */}
                  <div className="h-1" style={{ backgroundColor: CONTENT_LABELS[primaryType]?.accent || "#8b5cf6" }} />
                  <div className="p-4">
                    {/* Header */}
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex items-center gap-2 min-w-0 flex-1">
                        <span className="text-lg flex-shrink-0">{CONTENT_ICONS[primaryType] || "🎯"}</span>
                        <h3
                          className="font-semibold text-foreground text-sm cursor-pointer hover:text-purple-400 truncate"
                          onClick={() => setExpandedId(expandedId === task.id ? null : task.id)}
                        >
                          {task.name}
                        </h3>
                      </div>
                      <div className="flex items-center gap-1 flex-shrink-0">
                        {isFavorite && <span className="text-red-400 text-xs">★</span>}
                        {itemStatuses.has(task.id) && <StatusBadge status={itemStatuses.get(task.id)!} />}
                      </div>
                    </div>

                    {/* Type badges */}
                    <div className="flex items-center gap-1.5 mb-2">
                      {task.content_type?.map((ct) => (
                        <span
                          key={ct}
                          className={`px-2 py-0.5 rounded-full text-[10px] font-medium ${CONTENT_LABELS[ct]?.color ?? "bg-surface-hover text-muted"}`}
                        >
                          {CONTENT_LABELS[ct]?.label ?? ct}
                        </span>
                      ))}
                    </div>

                    {/* Info row */}
                    <div className="flex items-center gap-3 text-xs text-muted mb-2">
                      <span className="flex items-center gap-1">
                        <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                        {task.duration_minutes} min
                      </span>
                      {task.num_players && (
                        <span className="flex items-center gap-1">
                          <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                          {task.num_players}
                        </span>
                      )}
                      {task.dimensions && (
                        <span className="flex items-center gap-1">
                          <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" /></svg>
                          {task.dimensions}
                        </span>
                      )}
                    </div>

                    {/* Description */}
                    {task.description && (
                      <p className="text-xs text-muted line-clamp-2">{task.description}</p>
                    )}

                    {/* Expanded details */}
                    {expandedId === task.id && (
                      <div className="mt-3 pt-3 border-t border-surface-hover grid grid-cols-2 gap-3 text-sm">
                        {task.rules && (
                          <div>
                            <span className="text-[10px] font-medium text-muted uppercase">Reglas</span>
                            <p className="text-foreground-secondary mt-1 whitespace-pre-wrap text-xs">{task.rules}</p>
                          </div>
                        )}
                        {task.variants && (
                          <div>
                            <span className="text-[10px] font-medium text-muted uppercase">Variantes</span>
                            <p className="text-foreground-secondary mt-1 whitespace-pre-wrap text-xs">{task.variants}</p>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Actions */}
                    <div className="flex gap-1 mt-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={() => {
                          setEditingId(task.id);
                          setFormName(task.name);
                          setFormDesc(task.description || "");
                          setFormRules(task.rules || "");
                          setFormDimensions(task.dimensions || "");
                          setFormPlayers(task.num_players || "");
                          setFormDuration(task.duration_minutes);
                          setFormVariants(task.variants || "");
                          setFormContentType(task.content_type || ["tactical"]);
                        }}
                        className="px-2 py-1 text-xs text-muted hover:text-purple-400 hover:bg-purple-900/20 rounded"
                      >
                        Editar
                      </button>
                      <button
                        onClick={() => handleDelete(task.id)}
                        className="px-2 py-1 text-xs text-muted hover:text-red-400 hover:bg-red-900/20 rounded"
                      >
                        Eliminar
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ── Right sidebar ── */}
      <div className="w-72 flex-shrink-0 space-y-4">
        {/* Resumen */}
        <div className="bg-surface rounded-xl border border-border p-4">
          <h3 className="text-xs font-semibold text-muted uppercase tracking-wider mb-3">Resumen</h3>
          <div className="grid grid-cols-2 gap-3">
            <div className="text-center">
              <p className="text-2xl font-bold text-foreground">{totalTasks}</p>
              <p className="text-[10px] text-muted uppercase">Tareas</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-foreground">{totalDuration}</p>
              <p className="text-[10px] text-muted uppercase">Min totales</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-foreground">{avgDuration}</p>
              <p className="text-[10px] text-muted uppercase">Min promedio</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-foreground">{favoriteIds.length}</p>
              <p className="text-[10px] text-muted uppercase">Favoritas</p>
            </div>
          </div>
        </div>

        {/* Categorías */}
        <div className="bg-surface rounded-xl border border-border p-4">
          <h3 className="text-xs font-semibold text-muted uppercase tracking-wider mb-3">Categorías</h3>
          <div className="space-y-2">
            {(Object.keys(CONTENT_LABELS) as ContentType[]).map((ct) => {
              const count = contentCounts[ct] || 0;
              const pct = totalTasks > 0 ? Math.round((count / totalTasks) * 100) : 0;
              return (
                <div key={ct}>
                  <div className="flex items-center justify-between text-xs mb-1">
                    <span className="text-foreground-secondary flex items-center gap-1.5">
                      <span>{CONTENT_ICONS[ct]}</span>
                      {CONTENT_LABELS[ct].label}
                    </span>
                    <span className="text-muted">{count}</span>
                  </div>
                  <div className="w-full h-1.5 bg-surface-hover rounded-full overflow-hidden">
                    <div className="h-full rounded-full" style={{ width: `${pct}%`, backgroundColor: CONTENT_LABELS[ct].accent }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Últimas utilizadas */}
        <div className="bg-surface rounded-xl border border-border p-4">
          <h3 className="text-xs font-semibold text-muted uppercase tracking-wider mb-3">Últimas añadidas</h3>
          {recentTasks.length === 0 ? (
            <p className="text-xs text-muted">Sin tareas</p>
          ) : (
            <div className="space-y-2">
              {recentTasks.map((t) => {
                const ct = t.content_type?.[0] || "tactical";
                return (
                  <div key={t.id} className="flex items-center gap-2">
                    <span className="text-sm flex-shrink-0">{CONTENT_ICONS[ct] || "🎯"}</span>
                    <div className="min-w-0 flex-1">
                      <p className="text-xs text-foreground-secondary truncate">{t.name}</p>
                      <p className="text-[10px] text-muted">{t.duration_minutes} min</p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

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
