"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import { getTaskById, getTacticalDiagrams } from "@/lib/api";
import type { TaskTagCategory } from "@/types";
import { TaskEditorForm } from "@/components/tareas/TaskEditorForm";
import type { TaskEditorInitial } from "@/components/tareas/TaskEditorForm";
import type { BoardState } from "@/components/tactical-board";

// Edición de una tarea — mismo formulario que /tareas/nueva (TaskEditorForm),
// precargado con los datos existentes, para que crear y editar se vean
// siempre igual.
export default function EditarTareaPage() {
  const params = useParams();
  const id = params.id as string;
  const [initial, setInitial] = useState<TaskEditorInitial | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    if (!id) return;
    async function load() {
      try {
        const [task, diagrams] = await Promise.all([
          getTaskById(id),
          getTacticalDiagrams("task", id).catch(() => []),
        ]);
        const selectedTags: Partial<Record<TaskTagCategory, string>> = {};
        for (const tag of task.tags ?? []) {
          if (!selectedTags[tag.category]) selectedTags[tag.category] = tag.id;
        }
        setInitial({
          name: task.name,
          objective: task.objective || "",
          description: task.description || "",
          rules: task.rules || "",
          guidelines: task.guidelines || "",
          observations: task.observations || "",
          dimensions: task.dimensions || "",
          num_players: task.num_players || "",
          duration_minutes: task.duration_minutes,
          image_url: task.image_url,
          youtube_url: task.youtube_url,
          selectedTags,
          boardState: diagrams[0]?.board_state as unknown as BoardState | undefined,
          diagramId: diagrams[0]?.id,
        });
      } catch (err) {
        console.error("Error loading task:", err);
        setError(true);
      }
    }
    load();
  }, [id]);

  if (error) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-foreground-secondary">No se pudo cargar la tarea.</p>
      </div>
    );
  }

  if (!initial) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-foreground-secondary">Cargando tarea...</p>
      </div>
    );
  }

  return <TaskEditorForm taskId={id} initial={initial} />;
}
