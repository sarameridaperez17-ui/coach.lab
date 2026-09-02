"use client";

import { useState, useEffect } from "react";
import { getTasks, createTask, updateTask, deleteTask, getGamePhases } from "@/lib/api";
import type { Task, ContentType, GamePhase } from "@/types";

const CONTENT_LABELS: Record<ContentType, { label: string; color: string }> = {
  tactical: { label: "Táctico", color: "bg-emerald-900/50 text-emerald-400" },
  technical: { label: "Técnico", color: "bg-blue-900/50 text-blue-400" },
  physical: { label: "Físico", color: "bg-orange-900/50 text-orange-400" },
  psychological: { label: "Psicológico", color: "bg-violet-900/50 text-violet-400" },
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

  // Form fields
  const [formName, setFormName] = useState("");
  const [formDesc, setFormDesc] = useState("");
  const [formRules, setFormRules] = useState("");
  const [formDimensions, setFormDimensions] = useState("");
  const [formPlayers, setFormPlayers] = useState("");
  const [formDuration, setFormDuration] = useState(15);
  const [formVariants, setFormVariants] = useState("");
  const [formContentType, setFormContentType] = useState<ContentType[]>(["tactical"]);

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
  };

  const handleCreate = async () => {
    if (!formName.trim()) return;
    try {
      await createTask({
        name: formName.trim(),
        description: formDesc.trim(),
        rules: formRules.trim(),
        dimensions: formDimensions.trim(),
        num_players: formPlayers.trim(),
        duration_minutes: formDuration,
        variants: formVariants.trim(),
        content_type: formContentType,
      });
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

  const TaskForm = ({ onSubmit, submitLabel }: { onSubmit: () => void; submitLabel: string }) => (
    <div className="bg-[#1a1d27] rounded-xl border border-[#2a2d37] p-4 mb-4">
      <div className="grid grid-cols-2 gap-3 mb-3">
        <input
          autoFocus
          value={formName}
          onChange={(e) => setFormName(e.target.value)}
          placeholder="Nombre de la tarea"
          className="col-span-2 px-3 py-2 border border-[#2a2d37] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-300"
        />
        <textarea
          value={formDesc}
          onChange={(e) => setFormDesc(e.target.value)}
          placeholder="Descripción / objetivo"
          rows={2}
          className="col-span-2 px-3 py-2 border border-[#2a2d37] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-300 resize-none"
        />
        <textarea
          value={formRules}
          onChange={(e) => setFormRules(e.target.value)}
          placeholder="Reglas"
          rows={2}
          className="px-3 py-2 border border-[#2a2d37] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-300 resize-none"
        />
        <textarea
          value={formVariants}
          onChange={(e) => setFormVariants(e.target.value)}
          placeholder="Variantes"
          rows={2}
          className="px-3 py-2 border border-[#2a2d37] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-300 resize-none"
        />
        <input
          value={formDimensions}
          onChange={(e) => setFormDimensions(e.target.value)}
          placeholder="Dimensiones (ej: 40x30m)"
          className="px-3 py-2 border border-[#2a2d37] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-300"
        />
        <input
          value={formPlayers}
          onChange={(e) => setFormPlayers(e.target.value)}
          placeholder="Jugadoras (ej: 8v8+2)"
          className="px-3 py-2 border border-[#2a2d37] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-300"
        />
        <div className="flex items-center gap-2">
          <label className="text-sm text-gray-500">Duración:</label>
          <input
            type="number"
            value={formDuration}
            onChange={(e) => setFormDuration(Number(e.target.value))}
            min={1}
            className="w-20 px-3 py-2 border border-[#2a2d37] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-300"
          />
          <span className="text-sm text-gray-400">min</span>
        </div>
      </div>

      {/* Content type toggles */}
      <div className="mb-3">
        <label className="text-xs text-gray-500 font-medium mb-1 block">Tipo de contenido</label>
        <div className="flex gap-2">
          {(Object.keys(CONTENT_LABELS) as ContentType[]).map((ct) => {
            const selected = formContentType.includes(ct);
            return (
              <button
                key={ct}
                onClick={() => toggleContentType(ct)}
                className={`px-3 py-1 rounded text-xs font-medium transition-colors ${
                  selected ? CONTENT_LABELS[ct].color : "bg-[#22252f] text-gray-400"
                }`}
              >
                {CONTENT_LABELS[ct].label}
              </button>
            );
          })}
        </div>
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
          className="px-3 py-1.5 bg-[#22252f] text-gray-400 rounded text-sm hover:bg-[#2a2d37]"
        >
          Cancelar
        </button>
      </div>
    </div>
  );

  if (loading) {
    return (
      <div className="max-w-5xl flex items-center justify-center h-64">
        <p className="text-gray-400">Cargando tareas...</p>
      </div>
    );
  }

  return (
    <div className="max-w-5xl">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-200">Tareas de entrenamiento</h1>
        <button
          onClick={() => { resetForm(); setAdding(true); }}
          className="px-4 py-2 bg-purple-600 text-white rounded-lg text-sm font-medium hover:bg-purple-700 transition-colors"
        >
          + Nueva tarea
        </button>
      </div>

      {/* Filtros */}
      <div className="flex gap-3 mb-6">
        <input
          type="text"
          placeholder="Buscar tareas..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="flex-1 px-4 py-2 border border-[#2a2d37] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-300 focus:border-purple-300"
        />
        <select
          value={contentFilter}
          onChange={(e) => setContentFilter(e.target.value as ContentType | "all")}
          className="px-3 py-2 border border-[#2a2d37] rounded-lg text-sm text-gray-400 bg-[#1a1d27]"
        >
          <option value="all">Todos los contenidos</option>
          <option value="tactical">Táctico</option>
          <option value="technical">Técnico</option>
          <option value="physical">Físico</option>
          <option value="psychological">Psicológico</option>
        </select>
      </div>

      {/* Formulario crear */}
      {adding && <TaskForm onSubmit={handleCreate} submitLabel="Crear" />}

      {/* Lista */}
      {filtered.length === 0 ? (
        <div className="bg-[#1a1d27] rounded-xl border border-[#2a2d37] p-8 text-center text-gray-400">
          <p className="text-lg font-medium mb-2">Sin tareas</p>
          <p className="text-sm">
            Crea tu primera tarea de entrenamiento vinculada a principios del modelo de juego.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((task) => (
            <div
              key={task.id}
              className="bg-[#1a1d27] rounded-xl border border-[#2a2d37] p-4 group"
            >
              {editingId === task.id ? (
                <TaskForm onSubmit={() => handleUpdate(task.id)} submitLabel="Guardar" />
              ) : (
                <div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <h3
                        className="font-semibold text-gray-200 cursor-pointer hover:text-purple-600"
                        onClick={() =>
                          setExpandedId(expandedId === task.id ? null : task.id)
                        }
                      >
                        {task.name}
                      </h3>
                      {task.content_type?.map((ct) => (
                        <span
                          key={ct}
                          className={`px-2 py-0.5 rounded-full text-[10px] font-medium ${CONTENT_LABELS[ct]?.color ?? "bg-[#22252f] text-gray-500"}`}
                        >
                          {CONTENT_LABELS[ct]?.label ?? ct}
                        </span>
                      ))}
                      <span className="text-xs text-gray-400">
                        {task.duration_minutes} min
                      </span>
                    </div>
                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
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
                        className="px-2 py-1 text-xs text-gray-500 hover:text-purple-600 hover:bg-purple-900/20 rounded"
                      >
                        Editar
                      </button>
                      <button
                        onClick={() => handleDelete(task.id)}
                        className="px-2 py-1 text-xs text-gray-500 hover:text-red-600 hover:bg-red-900/20 rounded"
                      >
                        Eliminar
                      </button>
                    </div>
                  </div>
                  {task.description && (
                    <p className="text-sm text-gray-400 mt-1 truncate">{task.description}</p>
                  )}
                  {expandedId === task.id && (
                    <div className="mt-3 grid grid-cols-2 gap-3 text-sm">
                      {task.rules && (
                        <div>
                          <span className="text-xs font-medium text-gray-500 uppercase">Reglas</span>
                          <p className="text-gray-300 mt-1 whitespace-pre-wrap">{task.rules}</p>
                        </div>
                      )}
                      {task.variants && (
                        <div>
                          <span className="text-xs font-medium text-gray-500 uppercase">Variantes</span>
                          <p className="text-gray-300 mt-1 whitespace-pre-wrap">{task.variants}</p>
                        </div>
                      )}
                      {task.dimensions && (
                        <div>
                          <span className="text-xs font-medium text-gray-500 uppercase">Dimensiones</span>
                          <p className="text-gray-300 mt-1">{task.dimensions}</p>
                        </div>
                      )}
                      {task.num_players && (
                        <div>
                          <span className="text-xs font-medium text-gray-500 uppercase">Jugadoras</span>
                          <p className="text-gray-300 mt-1">{task.num_players}</p>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
