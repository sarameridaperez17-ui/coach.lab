"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createTask, saveTacticalDiagram } from "@/lib/api";
import type { ContentType } from "@/types";
import { TacticalBoardEditor } from "@/components/tactical-board";
import type { BoardState } from "@/components/tactical-board";

const CONTENT_LABELS: Record<ContentType, { label: string; color: string; accent: string }> = {
  tactical: { label: "Táctico", color: "bg-emerald-900/50 text-emerald-400", accent: "#34d399" },
  technical: { label: "Técnico", color: "bg-blue-900/50 text-blue-400", accent: "#60a5fa" },
  physical: { label: "Físico", color: "bg-orange-900/50 text-orange-400", accent: "#fb923c" },
  psychological: { label: "Psicológico", color: "bg-violet-900/50 text-violet-400", accent: "#a78bfa" },
};

// Página independiente para crear una tarea — a pantalla completa (en vez de
// un formulario incrustado entre las tarjetas) para tener más espacio de
// trabajo, sobre todo con el tablero táctico.
export default function NuevaTareaPage() {
  const router = useRouter();

  const [name, setName] = useState("");
  const [desc, setDesc] = useState("");
  const [rules, setRules] = useState("");
  const [dimensions, setDimensions] = useState("");
  const [players, setPlayers] = useState("");
  const [duration, setDuration] = useState(15);
  const [variants, setVariants] = useState("");
  const [contentType, setContentType] = useState<ContentType[]>(["tactical"]);
  const [boardState, setBoardState] = useState<BoardState | undefined>(undefined);
  const [saving, setSaving] = useState(false);

  const toggleContentType = (ct: ContentType) => {
    setContentType((prev) =>
      prev.includes(ct) ? prev.filter((c) => c !== ct) : [...prev, ct]
    );
  };

  const handleCreate = async () => {
    if (!name.trim() || saving) return;
    setSaving(true);
    try {
      const created = await createTask({
        name: name.trim(),
        description: desc.trim(),
        rules: rules.trim(),
        dimensions: dimensions.trim(),
        num_players: players.trim(),
        duration_minutes: duration,
        variants: variants.trim(),
        content_type: contentType,
      });
      if (boardState && created?.id) {
        await saveTacticalDiagram(
          "task",
          created.id,
          boardState as unknown as Record<string, unknown>,
          name.trim()
        ).catch(console.error);
      }
      router.push("/tareas");
    } catch (err) {
      console.error("Error creating task:", err);
      setSaving(false);
    }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Nueva tarea de entrenamiento</h1>
          <p className="text-muted text-sm mt-1">
            Define todos los detalles de la tarea con espacio de sobra para el tablero táctico.
          </p>
        </div>
        <div className="flex gap-2 flex-shrink-0">
          <button
            onClick={() => router.push("/tareas")}
            className="px-4 py-2 bg-surface-hover text-foreground-secondary rounded-lg text-sm font-medium hover:bg-border transition-colors"
          >
            Cancelar
          </button>
          <button
            onClick={handleCreate}
            disabled={!name.trim() || saving}
            className="px-4 py-2 bg-purple-600 text-white rounded-lg text-sm font-medium hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {saving ? "Creando..." : "Crear tarea"}
          </button>
        </div>
      </div>

      <div className="bg-surface rounded-xl border border-border p-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-4">
          <input
            autoFocus
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Nombre de la tarea"
            className="lg:col-span-3 px-4 py-2.5 border border-border rounded-lg text-base focus:outline-none focus:ring-2 focus:ring-purple-300 bg-surface-hover"
          />
          <textarea
            value={desc}
            onChange={(e) => setDesc(e.target.value)}
            placeholder="Descripción / objetivo"
            rows={3}
            className="lg:col-span-3 px-4 py-2.5 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-300 resize-none bg-surface-hover"
          />
          <textarea
            value={rules}
            onChange={(e) => setRules(e.target.value)}
            placeholder="Reglas"
            rows={3}
            className="px-4 py-2.5 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-300 resize-none bg-surface-hover"
          />
          <textarea
            value={variants}
            onChange={(e) => setVariants(e.target.value)}
            placeholder="Variantes"
            rows={3}
            className="px-4 py-2.5 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-300 resize-none bg-surface-hover"
          />
          <div className="flex flex-col gap-3">
            <input
              value={dimensions}
              onChange={(e) => setDimensions(e.target.value)}
              placeholder="Dimensiones (ej: 40x30m)"
              className="px-4 py-2.5 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-300 bg-surface-hover"
            />
            <input
              value={players}
              onChange={(e) => setPlayers(e.target.value)}
              placeholder="Jugadoras (ej: 8v8+2)"
              className="px-4 py-2.5 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-300 bg-surface-hover"
            />
            <div className="flex items-center gap-2">
              <label className="text-sm text-muted">Duración:</label>
              <input
                type="number"
                value={duration}
                onChange={(e) => setDuration(Number(e.target.value))}
                min={1}
                className="w-24 px-3 py-2 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-300 bg-surface-hover"
              />
              <span className="text-sm text-foreground-secondary">min</span>
            </div>
          </div>
        </div>

        {/* Content type toggles */}
        <div className="mb-5">
          <label className="text-xs text-muted font-medium mb-1.5 block">Tipo de contenido</label>
          <div className="flex gap-2">
            {(Object.keys(CONTENT_LABELS) as ContentType[]).map((ct) => {
              const selected = contentType.includes(ct);
              return (
                <button
                  key={ct}
                  onClick={() => toggleContentType(ct)}
                  className={`px-3 py-1.5 rounded text-xs font-medium transition-colors ${
                    selected ? CONTENT_LABELS[ct].color : "bg-surface-hover text-foreground-secondary"
                  }`}
                >
                  {CONTENT_LABELS[ct].label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Tablero táctico — siempre visible, a todo el ancho disponible */}
        <div>
          <label className="text-xs text-muted font-medium mb-1.5 block">Tablero táctico</label>
          <TacticalBoardEditor initialState={boardState} onChange={(state) => setBoardState(state)} />
        </div>
      </div>
    </div>
  );
}
