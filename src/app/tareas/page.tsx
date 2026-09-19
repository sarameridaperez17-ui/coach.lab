"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  getTasks,
  createTask,
  updateTask,
  deleteTask,
  setItemStatus,
  removeItemStatus,
  getItemStatuses,
  getTaskTagValues,
  setTaskTags,
  getTacticalDiagrams,
  saveTacticalDiagram,
} from "@/lib/api";
import type { ItemStatus } from "@/lib/api";
import type { Task, TaskTagValue, TaskTagCategory } from "@/types";
import { StatusMenu, StatusBadge } from "@/components/ui/StatusMenu";
import { getTagColor } from "@/lib/tagColors";

// Mismo orden que en el editor de tareas: fase primero, luego sus
// dependientes, luego las categorías independientes.
const TAG_CATEGORIES: { key: TaskTagCategory; label: string }[] = [
  { key: "fase_juego", label: "Fase del juego" },
  { key: "momento_juego", label: "Momento del juego" },
  { key: "principios_tacticos", label: "Principios tácticos" },
  { key: "tipo_tarea", label: "Tipo de tarea" },
  { key: "situacion_juego", label: "Situación de juego" },
  { key: "zona", label: "Zona" },
];

export default function TareasPage() {
  const router = useRouter();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [tagValues, setTagValues] = useState<TaskTagValue[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [tagFilters, setTagFilters] = useState<Partial<Record<TaskTagCategory, string>>>({});
  const [itemStatuses, setItemStatuses] = useState<Map<string, ItemStatus>>(new Map());
  const [statusMenu, setStatusMenu] = useState<{ x: number; y: number; id: string; title: string } | null>(null);
  // Diapositiva actualmente mostrada por tarea "madre" (índice dentro de su
  // grupo madre+variantes) — navegación con flechas dentro del mismo recuadro.
  const [slideIndex, setSlideIndex] = useState<Record<string, number>>({});
  // Al eliminar una tarea madre con variantes, se pregunta cuál de ellas
  // pasa a ser la nueva madre (en vez de borrarlas todas).
  const [promoteModal, setPromoteModal] = useState<{ mother: Task; variants: Task[] } | null>(null);

  const load = useCallback(async () => {
    try {
      const [t, tv] = await Promise.all([getTasks(), getTaskTagValues()]);
      setTasks(t);
      setTagValues(tv);
    } catch (err) {
      console.error("Error loading tasks:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    Promise.all([getTasks(), getTaskTagValues()])
      .then(([t, tv]) => { setTasks(t); setTagValues(tv); })
      .catch((err) => console.error("Error loading tasks:", err))
      .finally(() => setLoading(false));
    getItemStatuses("task").then(setItemStatuses).catch(console.error);
  }, []);

  useEffect(() => {
    // La creación de tareas ahora vive en /tareas/nueva (página independiente,
    // a pantalla completa) — este enlace antiguo redirige ahí.
    const params = new URLSearchParams(window.location.search);
    if (params.get("crear") === "1") {
      router.replace("/tareas/nueva");
    }
  }, [router]);

  const handleContextMenu = (e: React.MouseEvent, id: string, title: string) => {
    e.preventDefault();
    setStatusMenu({ x: e.clientX, y: e.clientY, id, title });
  };

  const handleSetStatus = async (status: ItemStatus) => {
    if (!statusMenu) return;
    try {
      await setItemStatus("task", statusMenu.id, statusMenu.title, status);
      setItemStatuses((prev) => new Map(prev).set(statusMenu.id, status));
    } catch (err) { console.error("Error setting status:", err); }
    setStatusMenu(null);
  };

  const handleRemoveStatus = async () => {
    if (!statusMenu) return;
    try {
      await removeItemStatus("task", statusMenu.id);
      setItemStatuses((prev) => { const next = new Map(prev); next.delete(statusMenu.id); return next; });
    } catch (err) { console.error("Error removing status:", err); }
    setStatusMenu(null);
  };

  // Si se borra una tarea "madre" con variantes, se borran también sus
  // variantes (el archivado es lógico, no hay cascada automática al no ser
  // un DELETE real).
  // Si la tarea es una madre con variantes, no se borran de golpe: se
  // pregunta cuál de las variantes pasa a ser la nueva madre. Si es una
  // variante suelta (o una madre sin variantes), se borra normal.
  const handleDelete = async (task: Task) => {
    const children = tasks.filter((t) => t.parent_task_id === task.id);
    if (children.length > 0) {
      setPromoteModal({ mother: task, variants: children });
      return;
    }
    if (!confirm("¿Eliminar esta tarea?")) return;
    try {
      await deleteTask(task.id);
      await load();
    } catch (err) {
      console.error("Error deleting task:", err);
    }
  };

  // La variante elegida deja de tener padre (pasa a ser la madre); el resto
  // de variantes pasan a depender de ella; se borra la antigua madre.
  const handlePromoteAndDelete = async (newMother: Task) => {
    if (!promoteModal) return;
    const { mother, variants } = promoteModal;
    try {
      await updateTask(newMother.id, { parent_task_id: null });
      const others = variants.filter((v) => v.id !== newMother.id);
      await Promise.all(others.map((v) => updateTask(v.id, { parent_task_id: newMother.id })));
      await deleteTask(mother.id);
      setPromoteModal(null);
      await load();
    } catch (err) {
      console.error("Error promoting variant:", err);
    }
  };

  // Copia todos los campos, etiquetas y tablero táctico de una tarea a una
  // nueva, con el nombre indicado — usado tanto por Duplicar como por
  // Añadir variante.
  const cloneTaskInto = async (task: Task, name: string, parentTaskId: string | null) => {
    const created = await createTask({
      name,
      description: task.description,
      rules: task.rules,
      dimensions: task.dimensions,
      num_players: task.num_players,
      duration_minutes: task.duration_minutes,
      variants: task.variants,
      content_type: [],
      objective: task.objective,
      guidelines: task.guidelines,
      observations: task.observations,
      image_url: task.image_url,
      youtube_url: task.youtube_url,
      parent_task_id: parentTaskId,
    });
    const tagIds = (task.tags ?? []).map((t) => t.id);
    if (tagIds.length > 0) await setTaskTags(created.id, tagIds).catch(console.error);
    const diagrams = await getTacticalDiagrams("task", task.id).catch(() => []);
    if (diagrams[0]) {
      await saveTacticalDiagram("task", created.id, diagrams[0].board_state, name).catch(console.error);
    }
    return created;
  };

  // Duplica una tarea y abre directamente el panel de editar de la copia,
  // totalmente independiente (no aparece junto a la original).
  const handleDuplicate = async (task: Task) => {
    try {
      const created = await cloneTaskInto(task, `${task.name} (copia)`, null);
      router.push(`/tareas/${created.id}/editar`);
    } catch (err) {
      console.error("Error duplicating task:", err);
    }
  };

  // Añade una variante a una tarea "madre": parte siempre del formato y
  // texto de la madre (no de la diapositiva que se esté viendo), pero
  // ligada a ella — en la biblioteca se muestran juntas en el mismo
  // recuadro, aunque se buscan/filtran de forma independiente.
  const handleAddVariant = async (mother: Task) => {
    try {
      const variantCount = tasks.filter((t) => t.parent_task_id === mother.id).length;
      const created = await cloneTaskInto(mother, `${mother.name} (variante ${variantCount + 1})`, mother.id);
      router.push(`/tareas/${created.id}/editar`);
    } catch (err) {
      console.error("Error creating variant:", err);
    }
  };

  const hasActiveFilters = !!search || Object.values(tagFilters).some(Boolean);
  const clearFilters = () => { setSearch(""); setTagFilters({}); };

  // Una tarea (madre o variante) coincide con la búsqueda/filtros por sus
  // propios datos — así cada variante se busca de forma independiente,
  // aunque en la biblioteca se muestre dentro del recuadro de su madre.
  const taskMatches = (t: Task) => {
    const matchSearch =
      t.name.toLowerCase().includes(search.toLowerCase()) ||
      t.description?.toLowerCase().includes(search.toLowerCase());
    const matchTags = (Object.keys(tagFilters) as TaskTagCategory[]).every((cat) => {
      const filterId = tagFilters[cat];
      if (!filterId) return true;
      return (t.tags ?? []).some((tag) => tag.id === filterId);
    });
    return matchSearch && matchTags;
  };

  // Agrupa cada tarea "madre" (sin parent_task_id) con sus variantes, en el
  // mismo recuadro. El grupo aparece si al menos una diapositiva coincide
  // con la búsqueda/filtros; se muestra la diapositiva navegada a mano si
  // sigue coincidiendo, si no, la primera que coincida.
  const groups = tasks
    .filter((t) => !t.parent_task_id)
    .map((mother) => {
      const variantsOf = tasks
        .filter((t) => t.parent_task_id === mother.id)
        .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
      const slides = [mother, ...variantsOf];
      const matchingIndices = slides.map((s, i) => (taskMatches(s) ? i : -1)).filter((i) => i >= 0);
      return { mother, slides, matchingIndices };
    })
    .filter((g) => g.matchingIndices.length > 0);

  /* ── Sidebar data ── */
  const totalTasks = tasks.length;
  const totalDuration = tasks.reduce((sum, t) => sum + (t.duration_minutes || 0), 0);
  const avgDuration = totalTasks > 0 ? Math.round(totalDuration / totalTasks) : 0;
  const favoriteIds = Array.from(itemStatuses.entries()).filter(([, s]) => s === "favorite").map(([id]) => id);
  const recentTasks = [...tasks].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()).slice(0, 5);

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
            onClick={() => router.push("/tareas/nueva")}
            className="px-4 py-2 bg-purple-600 text-white rounded-lg text-sm font-medium hover:bg-purple-700 transition-colors"
          >
            + Nueva tarea
          </button>
        </div>

        {/* Search */}
        <div className="mb-4">
          <input
            type="text"
            placeholder="Buscar tareas..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full px-4 py-2 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-300 focus:border-purple-300 bg-surface-hover"
          />
        </div>

        {/* Filtro por etiquetas */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-1.5">
            <label className="text-xs text-muted font-medium">Filtrar por etiquetas</label>
            {hasActiveFilters && (
              <button onClick={clearFilters} className="text-xs text-purple-400 hover:text-purple-300">
                Limpiar filtros
              </button>
            )}
          </div>
          <div className="flex flex-wrap gap-3">
            {TAG_CATEGORIES.map((cat) => {
              const values = tagValues.filter((v) => v.category === cat.key);
              return (
                <div key={cat.key} className="flex-1 min-w-[150px]">
                  <select
                    value={tagFilters[cat.key] ?? ""}
                    onChange={(e) => setTagFilters((prev) => ({ ...prev, [cat.key]: e.target.value }))}
                    disabled={values.length === 0}
                    className="w-full px-3 py-2 bg-surface-hover border border-border rounded-lg text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-purple-300 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <option value="">{cat.label}: Todas</option>
                    {values.map((v) => (
                      <option key={v.id} value={v.id}>{v.label}</option>
                    ))}
                  </select>
                </div>
              );
            })}
          </div>
        </div>

        {/* Task cards grid — 3 por fila: título, imagen, etiquetas abajo.
            Cada recuadro es una tarea "madre" + sus variantes, navegables con flechas;
            cada diapositiva se busca/filtra por sus propios datos. */}
        {groups.length === 0 ? (
          <div className="bg-surface rounded-xl border border-border p-8 text-center text-foreground-secondary">
            <p className="text-lg font-medium mb-2">Sin tareas</p>
            <p className="text-sm">
              {tasks.length === 0
                ? "Crea tu primera tarea de entrenamiento."
                : "Ninguna tarea coincide con la búsqueda o los filtros."}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {groups.map(({ mother, slides, matchingIndices }) => {
              const manual = slideIndex[mother.id];
              const displayIndex = manual !== undefined && matchingIndices.includes(manual) ? manual : matchingIndices[0];
              const task = slides[displayIndex];
              const hasMultiple = slides.length > 1;
              const isFavorite = favoriteIds.includes(task.id);
              const goTo = (e: React.MouseEvent, delta: number) => {
                e.stopPropagation();
                setSlideIndex((prev) => ({ ...prev, [mother.id]: (displayIndex + delta + slides.length) % slides.length }));
              };
              return (
                <div
                  key={mother.id}
                  onClick={() => router.push(`/tareas/${task.id}/editar`)}
                  onContextMenu={(e) => handleContextMenu(e, task.id, task.name)}
                  className="bg-surface rounded-xl border border-border overflow-hidden group hover:border-border-light transition-colors cursor-pointer flex flex-col"
                >
                  {/* Título */}
                  <div className="p-4 pb-2 flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <h3 className="font-semibold text-foreground text-sm truncate">{task.name}</h3>
                      {hasMultiple && (
                        <p className="text-[10px] text-muted mt-0.5">
                          {displayIndex === 0 ? "Original" : `Variante ${displayIndex}`} · {displayIndex + 1}/{slides.length}
                        </p>
                      )}
                    </div>
                    <div className="flex items-center gap-1 flex-shrink-0">
                      {isFavorite && <span className="text-red-400 text-xs">★</span>}
                      {itemStatuses.has(task.id) && <StatusBadge status={itemStatuses.get(task.id)!} />}
                    </div>
                  </div>

                  {/* Imagen, con flechas para pasar de diapositiva si hay variantes */}
                  <div className="relative">
                    {task.image_url ? (
                      <img src={task.image_url} alt="" className="w-full h-36 object-cover" />
                    ) : (
                      <div className="w-full h-36 bg-surface-hover flex items-center justify-center">
                        <span className="text-muted text-xs">Sin imagen</span>
                      </div>
                    )}
                    {hasMultiple && (
                      <>
                        {/* Señal visible de variantes: total en el original, variante actual al navegar */}
                        <span
                          className="absolute left-1.5 top-1.5 px-1.5 py-0.5 rounded bg-purple-600 text-white text-[10px] font-bold shadow"
                          title={displayIndex === 0 ? `${slides.length - 1} variante(s)` : `Viendo la variante ${displayIndex} de ${slides.length - 1}`}
                        >
                          {displayIndex === 0 ? `V${slides.length - 1}` : `V${displayIndex}/${slides.length - 1}`}
                        </span>
                        <button
                          onClick={(e) => goTo(e, -1)}
                          className="absolute left-1.5 top-1/2 -translate-y-1/2 w-6 h-6 rounded-full bg-black/50 text-white flex items-center justify-center hover:bg-black/70 transition-colors"
                          title="Diapositiva anterior"
                        >
                          ‹
                        </button>
                        <button
                          onClick={(e) => goTo(e, 1)}
                          className="absolute right-1.5 top-1/2 -translate-y-1/2 w-6 h-6 rounded-full bg-black/50 text-white flex items-center justify-center hover:bg-black/70 transition-colors"
                          title="Siguiente diapositiva"
                        >
                          ›
                        </button>
                      </>
                    )}
                  </div>

                  <div className="p-4 pt-3 flex-1 flex flex-col">
                    {/* Etiquetas */}
                    <div className="flex flex-wrap gap-1 mb-3">
                      {(task.tags ?? []).length === 0 ? (
                        <span className="text-[10px] text-muted italic">Sin etiquetas</span>
                      ) : (
                        task.tags!.map((tag) => {
                          const color = getTagColor(tag.id);
                          return (
                            <span key={tag.id} className={`px-2 py-0.5 rounded-full ${color.bg} ${color.text} text-[10px] font-medium`}>
                              {tag.label}
                            </span>
                          );
                        })
                      )}
                    </div>

                    <div className="flex items-center gap-3 text-xs text-muted mt-auto">
                      <span className="flex items-center gap-1">
                        <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                        {task.duration_minutes} min
                      </span>
                      {task.num_players && <span>{task.num_players}</span>}
                      {task.dimensions && <span>{task.dimensions}</span>}
                    </div>

                    <div className="flex flex-wrap gap-1 max-h-0 group-hover:max-h-14 group-hover:mt-2 overflow-hidden transition-all duration-150">
                      <button
                        onClick={(e) => { e.stopPropagation(); router.push(`/tareas/${task.id}/editar`); }}
                        className="px-2 py-1 text-xs text-muted hover:text-purple-400 hover:bg-purple-900/20 rounded"
                      >
                        Editar
                      </button>
                      <button
                        onClick={(e) => { e.stopPropagation(); handleAddVariant(mother); }}
                        className="px-2 py-1 text-xs text-muted hover:text-purple-400 hover:bg-purple-900/20 rounded"
                      >
                        + Variante
                      </button>
                      <button
                        onClick={(e) => { e.stopPropagation(); handleDuplicate(task); }}
                        className="px-2 py-1 text-xs text-muted hover:text-purple-400 hover:bg-purple-900/20 rounded"
                      >
                        Duplicar
                      </button>
                      <button
                        onClick={(e) => { e.stopPropagation(); handleDelete(task); }}
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

        {/* Últimas añadidas */}
        <div className="bg-surface rounded-xl border border-border p-4">
          <h3 className="text-xs font-semibold text-muted uppercase tracking-wider mb-3">Últimas añadidas</h3>
          {recentTasks.length === 0 ? (
            <p className="text-xs text-muted">Sin tareas</p>
          ) : (
            <div className="space-y-2">
              {recentTasks.map((t) => (
                <div key={t.id} className="flex items-center gap-2">
                  <div className="min-w-0 flex-1">
                    <p className="text-xs text-foreground-secondary truncate">{t.name}</p>
                    <p className="text-[10px] text-muted">{t.duration_minutes} min</p>
                  </div>
                </div>
              ))}
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

      {/* Elegir qué variante pasa a ser la nueva madre al borrar la madre actual */}
      {promoteModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => setPromoteModal(null)}>
          <div className="bg-surface rounded-xl p-6 w-full max-w-md shadow-xl" onClick={(e) => e.stopPropagation()}>
            <h3 className="font-semibold text-foreground mb-1">Eliminar tarea madre</h3>
            <p className="text-xs text-muted mb-4">
              &ldquo;{promoteModal.mother.name}&rdquo; tiene {promoteModal.variants.length} variante{promoteModal.variants.length > 1 ? "s" : ""}.
              Elige cuál pasa a ser la nueva tarea madre — el resto seguirá como sus variantes.
            </p>
            <div className="space-y-1.5 mb-4">
              {promoteModal.variants.map((v) => (
                <button
                  key={v.id}
                  onClick={() => handlePromoteAndDelete(v)}
                  className="w-full text-left px-3 py-2 bg-surface-hover hover:bg-purple-900/20 hover:text-purple-400 rounded-lg text-sm text-foreground-secondary transition-colors"
                >
                  {v.name}
                </button>
              ))}
            </div>
            <div className="flex justify-end">
              <button
                onClick={() => setPromoteModal(null)}
                className="px-4 py-2 bg-surface-hover text-foreground-secondary rounded-lg text-sm hover:bg-border"
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
