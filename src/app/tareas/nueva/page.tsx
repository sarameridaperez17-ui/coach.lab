"use client";

import { TaskEditorForm } from "@/components/tareas/TaskEditorForm";

// Página independiente para crear una tarea — a pantalla completa (en vez de
// un formulario incrustado entre las tarjetas) para tener más espacio de
// trabajo, sobre todo con el tablero táctico. Mismo formulario que editar
// (TaskEditorForm), para que crear y editar luzcan siempre igual.
export default function NuevaTareaPage() {
  return <TaskEditorForm />;
}
