"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import {
  createTask,
  updateTask,
  saveTacticalDiagram,
  getTaskTagValues,
  createTaskTagValue,
  deleteTaskTagValue,
  setTaskTags,
} from "@/lib/api";
import type { TaskTagValue, TaskTagCategory } from "@/types";
import { TacticalBoardEditor } from "@/components/tactical-board";
import type { BoardState } from "@/components/tactical-board";

// "Fase del juego" es la categoría matriz/dominante: va primero, seguida
// de sus dos categorías dependientes (momento y principios, cada una
// filtrada por la fase elegida), y luego las categorías independientes.
const TAG_CATEGORIES: { key: TaskTagCategory; label: string }[] = [
  { key: "fase_juego", label: "Fase del juego" },
  { key: "momento_juego", label: "Momento del juego" },
  { key: "principios_tacticos", label: "Principios tácticos" },
  { key: "tipo_tarea", label: "Tipo de tarea" },
  { key: "situacion_juego", label: "Situación de juego" },
  { key: "zona", label: "Zona" },
];

// Categorías cuyos valores pertenecen a una fase concreta (parent_id).
const FASE_CHILD_CATEGORIES: TaskTagCategory[] = ["momento_juego", "principios_tacticos"];

// ── YouTube — mismo formato que en el resto de la web ───────────
function extractYoutubeId(url: string): string | null {
  if (!url) return null;
  const m = url.match(
    /(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|shorts\/))([A-Za-z0-9_-]{11})/
  );
  return m ? m[1] : null;
}

function YoutubeThumbnail({ url, onClick, size = "sm" }: { url: string; onClick: () => void; size?: "sm" | "md" }) {
  const videoId = extractYoutubeId(url);
  if (!videoId) return null;
  const dim = size === "sm" ? "h-8 w-14" : "h-10 w-16";
  return (
    <button
      onClick={(e) => { e.stopPropagation(); onClick(); }}
      className={`${dim} rounded overflow-hidden relative group/yt flex-shrink-0 border border-border hover:border-red-500/50 transition-colors`}
      title="Ver vídeo"
    >
      <img src={`https://img.youtube.com/vi/${videoId}/mqdefault.jpg`} alt="Video" className="w-full h-full object-cover" />
      <div className="absolute inset-0 flex items-center justify-center bg-black/30 group-hover/yt:bg-black/50 transition-colors">
        <svg width={size === "sm" ? "14" : "18"} height={size === "sm" ? "14" : "18"} viewBox="0 0 24 24" fill="white">
          <path d="M8 5v14l11-7z" />
        </svg>
      </div>
    </button>
  );
}

function YoutubeIconButton({ hasVideo, onClick }: { hasVideo: boolean; onClick: () => void }) {
  return (
    <button
      onClick={(e) => { e.stopPropagation(); onClick(); }}
      className={`flex-shrink-0 p-1 rounded transition-colors ${
        hasVideo ? "text-red-400 hover:text-red-300 hover:bg-red-900/20" : "text-muted hover:text-red-400 hover:bg-red-900/20"
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

function YoutubeUrlInput({ currentUrl, onSave, onCancel }: { currentUrl: string | null; onSave: (url: string | null) => void; onCancel: () => void }) {
  const [draft, setDraft] = useState(currentUrl ?? "");
  return (
    <div className="flex items-center gap-2 mt-1" onClick={(e) => e.stopPropagation()}>
      <input
        autoFocus
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") { const val = draft.trim(); onSave(val ? val : null); }
          if (e.key === "Escape") onCancel();
        }}
        placeholder="https://youtube.com/watch?v=..."
        className="flex-1 px-2 py-1 border border-border rounded text-xs focus:outline-none focus:border-red-400 bg-surface-hover text-foreground-secondary min-w-0"
      />
      <button onClick={() => { const val = draft.trim(); onSave(val ? val : null); }} className="px-2 py-1 bg-red-600 text-white rounded text-[10px] font-medium flex-shrink-0">
        OK
      </button>
      {currentUrl && (
        <button onClick={() => onSave(null)} className="text-[10px] text-muted hover:text-red-400 flex-shrink-0" title="Quitar vídeo">Quitar</button>
      )}
      <button onClick={onCancel} className="text-xs text-muted hover:text-foreground-secondary flex-shrink-0">✕</button>
    </div>
  );
}

export interface TaskEditorInitial {
  name: string;
  objective: string;
  description: string;
  rules: string;
  guidelines: string;
  observations: string;
  dimensions: string;
  num_players: string;
  duration_minutes: number;
  image_url: string | null;
  youtube_url: string | null;
  selectedTags: Partial<Record<TaskTagCategory, string>>;
  boardState?: BoardState;
  diagramId?: string;
}

// Formulario de tarea compartido — lo usan tanto /tareas/nueva como
// /tareas/[id]/editar, para que crear y editar sean siempre el mismo
// diseño (antes divergían y la edición se veía con el formato antiguo).
export function TaskEditorForm({ taskId, initial }: { taskId?: string; initial?: TaskEditorInitial }) {
  const router = useRouter();
  const isEdit = !!taskId;

  const [name, setName] = useState(initial?.name ?? "");
  const [objective, setObjective] = useState(initial?.objective ?? "");
  const [desc, setDesc] = useState(initial?.description ?? "");
  const [rules, setRules] = useState(initial?.rules ?? ""); // Normas de provocación
  const [guidelines, setGuidelines] = useState(initial?.guidelines ?? ""); // Consignas
  const [observations, setObservations] = useState(initial?.observations ?? "");
  const [dimensions, setDimensions] = useState(initial?.dimensions ?? "");
  const [players, setPlayers] = useState(initial?.num_players ?? "");
  const [duration, setDuration] = useState(initial?.duration_minutes ?? 15);
  const [boardState, setBoardState] = useState<BoardState | undefined>(initial?.boardState);
  const [saving, setSaving] = useState(false);

  // Imagen subida desde archivo
  const [imageUrl, setImageUrl] = useState<string | null>(initial?.image_url ?? null);
  const imageInputRef = useRef<HTMLInputElement>(null);

  // Vídeo de YouTube
  const [youtubeUrl, setYoutubeUrl] = useState<string | null>(initial?.youtube_url ?? null);
  const [youtubeEditing, setYoutubeEditing] = useState(false);
  const [playingVideoUrl, setPlayingVideoUrl] = useState<string | null>(null);

  // Etiquetas — una selección (o ninguna) por categoría. "Fase del juego"
  // es la categoría matriz: al elegirla, "Momento del juego" y "Principios
  // tácticos" solo ofrecen los valores configurados para esa fase.
  const [tagValues, setTagValues] = useState<TaskTagValue[]>([]);
  const [selectedTags, setSelectedTags] = useState<Partial<Record<TaskTagCategory, string>>>(initial?.selectedTags ?? {});
  const [configOpen, setConfigOpen] = useState(false);
  const [configCategory, setConfigCategory] = useState<TaskTagCategory>("fase_juego");
  // Fase que se está configurando, solo aplica a las categorías dependientes.
  const [configFaseId, setConfigFaseId] = useState("");
  const [newTagDraft, setNewTagDraft] = useState("");

  const faseValues = tagValues.filter((v) => v.category === "fase_juego");

  useEffect(() => {
    getTaskTagValues().then(setTagValues).catch((err) => console.error("Error loading tag values:", err));
  }, []);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onloadend = () => setImageUrl(reader.result as string);
    reader.readAsDataURL(file);
  };

  // Cambia la categoría activa en el modal de Configuración — si es una
  // dependiente de fase, preselecciona una fase para gestionar sus valores.
  const handleSelectConfigCategory = (category: TaskTagCategory) => {
    setConfigCategory(category);
    if (FASE_CHILD_CATEGORIES.includes(category)) {
      setConfigFaseId((prev) => (faseValues.some((f) => f.id === prev) ? prev : faseValues[0]?.id ?? ""));
    }
  };

  // Al cambiar de fase, las selecciones de momento y principios dejan de
  // ser válidas (pertenecían a otra fase) y se limpian.
  const handleSelectFase = (faseId: string) => {
    setSelectedTags((prev) => ({ ...prev, fase_juego: faseId, momento_juego: "", principios_tacticos: "" }));
  };

  const handleAddTagValue = async () => {
    const label = newTagDraft.trim();
    if (!label) return;
    const isFaseChild = FASE_CHILD_CATEGORIES.includes(configCategory);
    if (isFaseChild && !configFaseId) return;
    try {
      const siblings = tagValues.filter((v) =>
        v.category === configCategory && (isFaseChild ? v.parent_id === configFaseId : true)
      );
      await createTaskTagValue(configCategory, label, siblings.length, isFaseChild ? configFaseId : null);
      setNewTagDraft("");
      const data = await getTaskTagValues();
      setTagValues(data);
    } catch (err) {
      console.error("Error creating tag value:", err);
    }
  };

  // Borra un valor — si es una fase, también archiva sus momentos y
  // principios asociados (el archivado es lógico, no hay ON DELETE CASCADE
  // que se dispare solo con marcar archived).
  const handleDeleteTagValue = async (v: TaskTagValue) => {
    try {
      const idsToRemove = [v.id];
      if (v.category === "fase_juego") {
        idsToRemove.push(...tagValues.filter((c) => c.parent_id === v.id).map((c) => c.id));
      }
      await Promise.all(idsToRemove.map((id) => deleteTaskTagValue(id)));
      setSelectedTags((prev) => {
        const next = { ...prev };
        for (const key of Object.keys(next) as TaskTagCategory[]) {
          const val = next[key];
          if (val && idsToRemove.includes(val)) delete next[key];
        }
        return next;
      });
      if (idsToRemove.includes(configFaseId)) setConfigFaseId(faseValues.find((f) => f.id !== v.id)?.id ?? "");
      const data = await getTaskTagValues();
      setTagValues(data);
    } catch (err) {
      console.error("Error deleting tag value:", err);
    }
  };

  const handleSave = async () => {
    if (!name.trim() || saving) return;
    setSaving(true);
    try {
      const payload = {
        name: name.trim(),
        description: desc.trim(),
        rules: rules.trim(),
        dimensions: dimensions.trim(),
        num_players: players.trim(),
        duration_minutes: duration,
        variants: "",
        content_type: [],
        objective: objective.trim(),
        guidelines: guidelines.trim(),
        observations: observations.trim(),
        image_url: imageUrl,
        youtube_url: youtubeUrl,
      };
      const id = isEdit ? taskId! : (await createTask(payload)).id;
      if (isEdit) await updateTask(id, payload);
      if (boardState) {
        await saveTacticalDiagram(
          "task",
          id,
          boardState as unknown as Record<string, unknown>,
          name.trim(),
          initial?.diagramId
        ).catch(console.error);
      }
      const tagIds = Object.values(selectedTags).filter((v): v is string => !!v);
      await setTaskTags(id, tagIds).catch(console.error);
      router.push("/tareas");
    } catch (err) {
      console.error("Error saving task:", err);
      setSaving(false);
    }
  };

  // Panel de Configuración: valores de la categoría activa, con su fase si aplica.
  const configIsFaseChild = FASE_CHILD_CATEGORIES.includes(configCategory);
  const configBlocked = configIsFaseChild && !configFaseId;
  const configList = tagValues.filter(
    (v) => v.category === configCategory && (configIsFaseChild ? v.parent_id === configFaseId : true)
  );

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">{isEdit ? "Editar tarea" : "Nueva tarea de entrenamiento"}</h1>
          <p className="text-muted text-sm mt-1">
            Define todos los detalles de la tarea con espacio de sobra para el tablero táctico.
          </p>
        </div>
        <div className="flex gap-2 flex-shrink-0">
          <button
            onClick={() => setConfigOpen(true)}
            className="flex items-center gap-1.5 px-4 py-2 bg-surface-hover border border-border rounded-lg text-sm font-medium text-foreground-secondary hover:border-purple-400 hover:text-purple-400 transition-colors"
          >
            <span>⚙</span> Configuración
          </button>
          <button
            onClick={() => router.push("/tareas")}
            className="px-4 py-2 bg-surface-hover text-foreground-secondary rounded-lg text-sm font-medium hover:bg-border transition-colors"
          >
            Cancelar
          </button>
          <button
            onClick={handleSave}
            disabled={!name.trim() || saving}
            className="px-4 py-2 bg-purple-600 text-white rounded-lg text-sm font-medium hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {saving ? "Guardando..." : isEdit ? "Guardar cambios" : "Crear tarea"}
          </button>
        </div>
      </div>

      <div className="bg-surface rounded-xl border border-border p-6">
        <input
          autoFocus
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Nombre de la tarea"
          className="w-full px-4 py-2.5 border border-border rounded-lg text-base focus:outline-none focus:ring-2 focus:ring-purple-300 bg-surface-hover mb-3"
        />

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 mb-3">
          <div>
            <label className="text-[10px] text-muted uppercase tracking-wide font-medium block mb-1">Objetivo</label>
            <textarea
              value={objective}
              onChange={(e) => setObjective(e.target.value)}
              placeholder="¿Qué se busca entrenar con esta tarea?"
              rows={3}
              className="w-full px-3 py-2.5 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-300 resize-none bg-surface-hover"
            />
          </div>
          <div>
            <label className="text-[10px] text-muted uppercase tracking-wide font-medium block mb-1">Descripción</label>
            <textarea
              value={desc}
              onChange={(e) => setDesc(e.target.value)}
              placeholder="Cómo se desarrolla la tarea..."
              rows={3}
              className="w-full px-3 py-2.5 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-300 resize-none bg-surface-hover"
            />
          </div>
          <div>
            <label className="text-[10px] text-muted uppercase tracking-wide font-medium block mb-1">Normas de provocación</label>
            <textarea
              value={rules}
              onChange={(e) => setRules(e.target.value)}
              placeholder="Reglas para provocar el comportamiento buscado..."
              rows={3}
              className="w-full px-3 py-2.5 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-300 resize-none bg-surface-hover"
            />
          </div>
          <div>
            <label className="text-[10px] text-muted uppercase tracking-wide font-medium block mb-1">Consignas</label>
            <textarea
              value={guidelines}
              onChange={(e) => setGuidelines(e.target.value)}
              placeholder="Consignas para las jugadoras..."
              rows={3}
              className="w-full px-3 py-2.5 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-300 resize-none bg-surface-hover"
            />
          </div>
          <div className="lg:col-span-2">
            <label className="text-[10px] text-muted uppercase tracking-wide font-medium block mb-1">Observaciones</label>
            <textarea
              value={observations}
              onChange={(e) => setObservations(e.target.value)}
              placeholder="Observaciones..."
              rows={2}
              className="w-full px-3 py-2.5 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-300 resize-none bg-surface-hover"
            />
          </div>
        </div>

        {/* Minutos / Dimensiones / Jugadoras */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-3 mb-4">
          <div className="flex items-center gap-2">
            <label className="text-sm text-muted flex-shrink-0">Duración:</label>
            <input
              type="number"
              value={duration}
              onChange={(e) => setDuration(Number(e.target.value))}
              min={1}
              className="w-24 px-3 py-2 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-300 bg-surface-hover"
            />
            <span className="text-sm text-foreground-secondary">min</span>
          </div>
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
        </div>

        {/* Imagen */}
        <div className="mb-4">
          <label className="text-xs text-muted font-medium mb-1.5 block">Imagen</label>
          <div className="flex items-center gap-3">
            {imageUrl && (
              <img src={imageUrl} alt="" className="h-16 w-24 object-cover rounded-lg border border-border" />
            )}
            <button
              onClick={() => imageInputRef.current?.click()}
              className="px-3 py-1.5 bg-surface-hover border border-border rounded-lg text-xs text-foreground-secondary hover:border-purple-400 hover:text-purple-400 transition-colors"
            >
              {imageUrl ? "Cambiar imagen" : "Subir imagen"}
            </button>
            <input ref={imageInputRef} type="file" accept="image/*" onChange={handleImageUpload} className="hidden" />
            {imageUrl && (
              <button onClick={() => setImageUrl(null)} className="text-xs text-red-400 hover:text-red-300">Quitar</button>
            )}
          </div>
        </div>

        {/* Vídeo de YouTube — mismo formato que el resto de la web */}
        <div className="mb-5">
          <label className="text-xs text-muted font-medium mb-1.5 block">Vídeo de YouTube</label>
          <div className="flex items-center gap-2">
            {youtubeUrl && <YoutubeThumbnail url={youtubeUrl} onClick={() => setPlayingVideoUrl(youtubeUrl)} size="md" />}
            <YoutubeIconButton hasVideo={!!youtubeUrl} onClick={() => setYoutubeEditing(true)} />
            {!youtubeUrl && !youtubeEditing && <span className="text-xs text-muted">Sin vídeo enlazado</span>}
          </div>
          {youtubeEditing && (
            <YoutubeUrlInput
              currentUrl={youtubeUrl}
              onSave={(url) => { setYoutubeUrl(url); setYoutubeEditing(false); }}
              onCancel={() => setYoutubeEditing(false)}
            />
          )}
        </div>

        {/* Etiquetas — el tipo de contenido de la tarea ahora son estas 6 clasificaciones,
            una fila de desplegables. "Fase del juego" es la categoría matriz: al elegirla,
            "Momento del juego" y "Principios tácticos" solo ofrecen sus valores para esa fase. */}
        <div className="mb-5 pt-5 border-t border-border">
          <h3 className="text-sm font-semibold text-foreground mb-3">Etiquetas</h3>
          <div className="flex flex-wrap gap-3">
            {TAG_CATEGORIES.map((cat) => {
              const isFaseChild = FASE_CHILD_CATEGORIES.includes(cat.key);
              const selectedFaseId = selectedTags.fase_juego ?? "";
              const values = isFaseChild
                ? tagValues.filter((v) => v.category === cat.key && v.parent_id === selectedFaseId)
                : tagValues.filter((v) => v.category === cat.key);
              const waitingForFase = isFaseChild && !selectedFaseId;
              const disabled = waitingForFase || values.length === 0;
              const placeholder = waitingForFase
                ? "Selecciona antes una fase"
                : values.length === 0
                ? "Sin opciones"
                : "Sin seleccionar";
              return (
                <div key={cat.key} className="flex-1 min-w-[160px]">
                  <label className="text-[10px] text-muted uppercase tracking-wide font-medium block mb-1">{cat.label}</label>
                  <select
                    value={selectedTags[cat.key] ?? ""}
                    onChange={(e) => (cat.key === "fase_juego" ? handleSelectFase(e.target.value) : setSelectedTags((prev) => ({ ...prev, [cat.key]: e.target.value })))}
                    disabled={disabled}
                    className="w-full px-3 py-2 bg-surface-hover border border-border rounded-lg text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-purple-300 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <option value="">{placeholder}</option>
                    {values.map((v) => (
                      <option key={v.id} value={v.id}>{v.label}</option>
                    ))}
                  </select>
                </div>
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

      {/* Modal: Configuración de etiquetas */}
      {configOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-surface rounded-xl w-full max-w-2xl shadow-xl max-h-[85vh] overflow-hidden flex">
            <div className="w-56 flex-shrink-0 border-r border-border p-3 space-y-1 overflow-y-auto">
              <h3 className="text-xs font-semibold text-muted uppercase tracking-wide px-2 mb-2">Categorías</h3>
              {TAG_CATEGORIES.map((cat) => (
                <button
                  key={cat.key}
                  onClick={() => handleSelectConfigCategory(cat.key)}
                  className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors ${
                    configCategory === cat.key ? "bg-purple-600/20 text-purple-400 font-medium" : "text-foreground-secondary hover:bg-surface-hover"
                  }`}
                >
                  {cat.label}
                  {FASE_CHILD_CATEGORIES.includes(cat.key) && (
                    <span className="block text-[10px] text-muted font-normal">↳ según la fase</span>
                  )}
                </button>
              ))}
            </div>
            <div className="flex-1 min-w-0 p-5 flex flex-col">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold text-foreground">{TAG_CATEGORIES.find((c) => c.key === configCategory)?.label}</h3>
                <button onClick={() => setConfigOpen(false)} className="text-muted hover:text-foreground-secondary text-sm">✕</button>
              </div>

              {configIsFaseChild && (
                <div className="mb-4">
                  <label className="text-[10px] text-muted uppercase tracking-wide font-medium block mb-1">Fase del juego</label>
                  {faseValues.length === 0 ? (
                    <p className="text-sm text-amber-400">
                      Primero crea al menos una fase en &ldquo;Fase del juego&rdquo; — sus momentos y principios se configuran por fase.
                    </p>
                  ) : (
                    <select
                      value={configFaseId}
                      onChange={(e) => setConfigFaseId(e.target.value)}
                      className="w-full px-3 py-2 bg-surface-hover border border-border rounded-lg text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-purple-300"
                    >
                      {faseValues.map((f) => (
                        <option key={f.id} value={f.id}>{f.label}</option>
                      ))}
                    </select>
                  )}
                </div>
              )}

              <div className="flex-1 min-h-0 overflow-y-auto space-y-1.5 mb-4">
                {configBlocked ? null : configList.length === 0 ? (
                  <p className="text-sm text-muted italic">Sin valores todavía. Añade el primero abajo.</p>
                ) : (
                  configList.map((v) => (
                    <div key={v.id} className="flex items-center justify-between px-3 py-2 bg-surface-hover rounded-lg">
                      <span className="text-sm text-foreground-secondary">{v.label}</span>
                      <button onClick={() => handleDeleteTagValue(v)} className="text-xs text-muted hover:text-red-400">Eliminar</button>
                    </div>
                  ))
                )}
              </div>
              {!configBlocked && (
                <div className="flex gap-2">
                  <input
                    value={newTagDraft}
                    onChange={(e) => setNewTagDraft(e.target.value)}
                    onKeyDown={(e) => { if (e.key === "Enter") handleAddTagValue(); }}
                    placeholder="Nuevo valor..."
                    className="flex-1 px-3 py-2 bg-surface-hover border border-border rounded-lg text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-purple-300"
                  />
                  <button onClick={handleAddTagValue} className="px-4 py-2 bg-purple-600 text-white rounded-lg text-sm hover:bg-purple-700">
                    Añadir
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Modal: reproductor de YouTube */}
      {playingVideoUrl && (
        <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4" onClick={() => setPlayingVideoUrl(null)}>
          <div className="relative w-[92vw] max-w-[1600px]" onClick={(e) => e.stopPropagation()}>
            <button
              onClick={() => setPlayingVideoUrl(null)}
              className="absolute -top-10 right-0 text-white/70 hover:text-white text-sm font-medium flex items-center gap-1"
            >
              Cerrar ✕
            </button>
            <div className="relative w-full" style={{ paddingBottom: "56.25%" }}>
              <iframe
                className="absolute inset-0 w-full h-full rounded-xl"
                src={`https://www.youtube.com/embed/${extractYoutubeId(playingVideoUrl)}?autoplay=1&rel=0`}
                allow="autoplay; encrypted-media"
                allowFullScreen
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
