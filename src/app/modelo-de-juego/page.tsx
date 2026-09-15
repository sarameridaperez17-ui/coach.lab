"use client";

import { useState, useEffect, useCallback } from "react";
import {
  getTeamContexts,
  createTeamContext,
  updateTeamContext,
  deleteTeamContext,
  getGamePhases,
  getBlockHeights,
  getFieldZones,
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
  linkTaskToPrinciple,
  unlinkTaskFromPrinciple,
} from "@/lib/api";
import type { ItemStatus, Bookmark } from "@/lib/api";
import type {
  TeamContext,
  GamePhase,
  BlockHeight,
  FieldZone,
  Principle,
  SubPrinciple,
  Behavior,
  BehaviorType,
  Task,
} from "@/types";
import { StatusMenu, StatusBadge } from "@/components/ui/StatusMenu";
import { Pitch, FIELD } from "@/components/pitch";

// ============================================
// Ayudantes ya existentes en la página (sin cambios)
// ============================================

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
        className={`cursor-pointer hover:bg-surface-hover rounded px-1 -mx-1 ${className}`}
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
      className={`${dim} rounded overflow-hidden relative group/yt flex-shrink-0 border border-border hover:border-red-500/50 transition-colors`}
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
        className="flex-1 px-2 py-1 border border-border rounded text-xs focus:outline-none focus:border-red-400 bg-surface-hover text-foreground-secondary min-w-0"
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
          className="text-[10px] text-muted hover:text-red-400 flex-shrink-0"
          title="Quitar vídeo"
        >
          Quitar
        </button>
      )}
      <button onClick={onCancel} className="text-xs text-muted hover:text-foreground-secondary flex-shrink-0">✕</button>
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
          : "text-muted hover:text-red-400 hover:bg-red-900/20"
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
  individual: { label: "Individual", color: "bg-amber-900/50 text-amber-400 light:bg-amber-200 light:text-amber-900" },
  relations: { label: "Relaciones", color: "bg-sky-900/50 text-sky-400 light:bg-sky-200 light:text-sky-900" },
  collective: { label: "Colectivo", color: "bg-violet-900/50 text-violet-400 light:bg-violet-200 light:text-violet-900" },
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
const DEFAULT_PHASE_COLORS = PHASE_COLORS["Fase ofensiva"];

// ============================================
// NUEVO: zonas del campo — mismos conceptos que "Posiciones"
// ============================================

const ATTACK_ZONE_LABELS: Record<string, string> = { Z1: "Inicio", Z2: "Creación", Z3: "Progresión", Z4: "Finalización" };
const DEFENSE_ZONE_LABELS: Record<string, string> = { Z1: "Protección", Z2: "Contención", Z3: "Destrucción", Z4: "Orientación" };

function isOffensivePhaseName(name?: string): boolean {
  return !!name && /ofensiva/i.test(name) && !/defensiva/i.test(name);
}
function isDefensivePhaseName(name?: string): boolean {
  return !!name && /defensiva/i.test(name) && !/ofensiva/i.test(name);
}

function zoneConceptLabel(phaseName: string | undefined, zoneName: string): string {
  const z = zoneName.trim().toUpperCase();
  if (isOffensivePhaseName(phaseName)) return ATTACK_ZONE_LABELS[z] ?? z;
  if (isDefensivePhaseName(phaseName)) return DEFENSE_ZONE_LABELS[z] ?? z;
  return z;
}

// Selector de zona (Z1..Z4 + "Sin zona"), reutilizado al crear/editar un principio
function ZonePicker({
  zones,
  phaseName,
  value,
  onChange,
  accent,
}: {
  zones: FieldZone[];
  phaseName?: string;
  value: string | null;
  onChange: (v: string | null) => void;
  accent: string;
}) {
  const sorted = [...zones].sort((a, b) => a.position - b.position);
  return (
    <div className="flex flex-wrap gap-1.5">
      {sorted.map((z) => (
        <button
          key={z.id}
          type="button"
          onClick={() => onChange(z.id)}
          className="px-2.5 py-1 rounded-lg text-xs font-medium transition-colors"
          style={value === z.id ? { background: accent, color: "white" } : { background: "var(--surface-hover)", color: "var(--foreground-secondary)" }}
        >
          Z{z.position} · {zoneConceptLabel(phaseName, z.name)}
        </button>
      ))}
      <button
        type="button"
        onClick={() => onChange(null)}
        className="px-2.5 py-1 rounded-lg text-xs font-medium transition-colors"
        style={value === null ? { background: "var(--muted)", color: "var(--background)" } : { background: "var(--surface-hover)", color: "var(--muted)" }}
      >
        Sin zona
      </button>
    </div>
  );
}

// Etiqueta compacta de zona para tarjetas/paneles
function ZoneBadge({
  principle,
  zones,
  phaseName,
  accent,
}: {
  principle: Principle;
  zones: FieldZone[];
  phaseName?: string;
  accent: string;
}) {
  const zone = zones.find((z) => z.id === principle.field_zone_id);
  if (!zone) {
    return <span className="text-[10px] text-muted italic">Sin zona asignada</span>;
  }
  return (
    <span className="text-[10px] font-medium px-1.5 py-0.5 rounded-full" style={{ background: `${accent}1f`, color: accent }}>
      Zona {zone.position} · {zoneConceptLabel(phaseName, zone.name)}
    </span>
  );
}

// Mini campograma decorativo — resalta la zona de un principio (tarjetas y detalle)
function ZoneMiniMap({ zones, zoneId, accent }: { zones: FieldZone[]; zoneId: string | null; accent: string }) {
  const sorted = [...zones].sort((a, b) => a.position - b.position);
  const n = sorted.length || 4;
  const bandW = FIELD.W / n;
  const idx = zoneId ? sorted.findIndex((z) => z.id === zoneId) : -1;
  return (
    <Pitch className="rounded-md">
      {idx >= 0 && (
        <>
          <rect x={bandW * idx} y={0} width={bandW} height={FIELD.H} fill={accent} fillOpacity={0.22} />
          <circle cx={bandW * idx + bandW / 2} cy={FIELD.H / 2} r="3.2" fill={accent} stroke="white" strokeWidth="0.4" />
        </>
      )}
    </Pitch>
  );
}

// Campograma central — 4 zonas de la fase activa con los principios ubicados dentro
function PrincipleFieldMap({
  zones,
  phaseName,
  accent,
  principlesByZone,
  selectedId,
  onSelect,
}: {
  zones: FieldZone[];
  phaseName?: string;
  accent: string;
  principlesByZone: Map<string, Principle[]>;
  selectedId: string | null;
  onSelect: (id: string) => void;
}) {
  const sorted = [...zones].sort((a, b) => a.position - b.position);
  const n = sorted.length || 1;
  const bandW = FIELD.W / n;
  return (
    <Pitch className="rounded-lg">
      {sorted.map((z, i) => (
        <g key={z.id}>
          <rect
            x={bandW * i}
            y={0}
            width={bandW}
            height={FIELD.H}
            fill={accent}
            fillOpacity={0.05 + i * 0.015}
            stroke={accent}
            strokeOpacity={0.4}
            strokeWidth="0.25"
            strokeDasharray="1.4"
          />
          <text x={bandW * i + bandW / 2} y={4.6} textAnchor="middle" fill={accent} fontSize="2.6" fontWeight="bold" opacity={0.9}>
            {zoneConceptLabel(phaseName, z.name).toUpperCase()}
          </text>
        </g>
      ))}
      {sorted.map((z, i) => {
        const list = principlesByZone.get(z.id) ?? [];
        return list.map((p, j) => {
          const cx = bandW * i + bandW / 2;
          const cy = (FIELD.H * (j + 1)) / (list.length + 1);
          const isSel = p.id === selectedId;
          const label = p.name.length > 18 ? `${p.name.slice(0, 17)}…` : p.name;
          return (
            <g key={p.id} onClick={() => onSelect(p.id)} style={{ cursor: "pointer" }}>
              {/* Zona de clic ampliada: cubre el punto y la etiqueta de debajo */}
              <rect x={cx - bandW / 2 + 0.5} y={cy - 4} width={bandW - 1} height={11} fill="transparent" />
              {isSel && <circle cx={cx} cy={cy} r="5.2" fill={accent} fillOpacity={0.25} style={{ pointerEvents: "none" }} />}
              <circle cx={cx} cy={cy} r="2.8" fill={isSel ? accent : "var(--surface)"} stroke={accent} strokeWidth="0.5" style={{ pointerEvents: "none" }} />
              {/* Fondo de la etiqueta — siempre claro, para que el texto negro se lea con nitidez sobre el césped */}
              <rect
                x={cx - (label.length * 0.68 + 1.3)}
                y={cy + 3.1}
                width={label.length * 1.36 + 2.6}
                height="3.6"
                rx="1.2"
                fill="white"
                fillOpacity="0.92"
                stroke={accent}
                strokeWidth={isSel ? 0.55 : 0.25}
                style={{ pointerEvents: "none" }}
              />
              <text
                x={cx}
                y={cy + 5.6}
                textAnchor="middle"
                fontSize="2.1"
                fontWeight={isSel ? "bold" : "normal"}
                fill="black"
                style={{ pointerEvents: "none" }}
              >
                {label}
              </text>
            </g>
          );
        });
      })}
    </Pitch>
  );
}

type DetailTab = "resumen" | "subprincipios" | "comportamientos" | "tareas" | "relaciones";
const DETAIL_TABS: { key: DetailTab; label: string }[] = [
  { key: "resumen", label: "Resumen" },
  { key: "subprincipios", label: "Subprincipios" },
  { key: "comportamientos", label: "Comportamientos" },
  { key: "tareas", label: "Tareas" },
  { key: "relaciones", label: "Relaciones" },
];

export default function ModeloDeJuegoPage() {
  const [contexts, setContexts] = useState<TeamContext[]>([]);
  const [phases, setPhases] = useState<GamePhase[]>([]);
  const [blocks, setBlocks] = useState<BlockHeight[]>([]);
  const [zones, setZones] = useState<FieldZone[]>([]);
  const [principles, setPrinciples] = useState<Principle[]>([]);
  const [allPhasePrinciples, setAllPhasePrinciples] = useState<Record<string, Principle[]>>({});

  const [selectedContext, setSelectedContext] = useState<string>("");
  const [selectedPhase, setSelectedPhase] = useState<string>("");
  const [selectedBlock, setSelectedBlock] = useState<string | null>(null);

  // NUEVO: vista campograma/mapa, principio seleccionado (panel) y en detalle (vista completa)
  const [topView, setTopView] = useState<"campo" | "mapa">("campo");
  const [selectedPrincipleId, setSelectedPrincipleId] = useState<string | null>(null);
  const [viewingPrincipleId, setViewingPrincipleId] = useState<string | null>(null);
  const [detailTab, setDetailTab] = useState<DetailTab>("resumen");
  const [newPrincipleZone, setNewPrincipleZone] = useState<string | null>(null);
  const [taskPickerOpen, setTaskPickerOpen] = useState(false);
  const [taskLinkBusy, setTaskLinkBusy] = useState(false);

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
  const [relTargetBlock, setRelTargetBlock] = useState<string | null>(null);

  // Load base data
  useEffect(() => {
    async function load() {
      try {
        const [ctx, ph, bh, zn] = await Promise.all([
          getTeamContexts(),
          getGamePhases(),
          getBlockHeights(),
          getFieldZones(),
        ]);
        setContexts(ctx);
        setPhases(ph);
        setBlocks(bh);
        setZones(zn);
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

  const reloadTasks = useCallback(async () => {
    try {
      const tasks = await getTasks();
      setAllTasks(tasks);
    } catch (err) {
      console.error("Error reloading tasks:", err);
    }
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

  // Al cambiar de fase, se cierra cualquier selección/detalle de la fase anterior
  useEffect(() => {
    setSelectedPrincipleId(null);
    setViewingPrincipleId(null);
    setDetailTab("resumen");
  }, [selectedPhase]);

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
      await createPrinciple(newPrincipleName.trim(), selectedPhase, [selectedContext], selectedBlock, newPrincipleZone);
      setNewPrincipleName("");
      setNewPrincipleZone(null);
      setAddingPrinciple(false);
      await loadPrinciples();
    } catch (err) {
      console.error("Error creating principle:", err);
    }
  };

  const handleSetPrincipleZone = async (principleId: string, zoneId: string | null) => {
    try {
      await updatePrinciple(principleId, { field_zone_id: zoneId });
      await loadPrinciples();
    } catch (err) {
      console.error("Error setting zone:", err);
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

  const handleDeletePrinciple = async (id: string) => {
    if (!confirm("¿Eliminar este principio?")) return;
    try {
      await deletePrinciple(id);
      if (viewingPrincipleId === id) setViewingPrincipleId(null);
      if (selectedPrincipleId === id) setSelectedPrincipleId(null);
      await loadPrinciples();
    } catch (err) {
      console.error("Error deleting principle:", err);
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
      await duplicatePrinciple(relatingPrinciple.id, relTargetPhase, relTargetContext ? [relTargetContext] : [], relTargetBlock);
      setRelatingPrinciple(null);
      await loadPrinciples();
    } catch (err) { console.error("Error duplicating principle:", err); }
  };

  // ---- Vínculo de tareas (nuevo) ----
  const handleLinkTask = async (taskId: string, principleId: string) => {
    setTaskLinkBusy(true);
    try {
      await linkTaskToPrinciple(taskId, principleId);
      await reloadTasks();
      setTaskPickerOpen(false);
    } catch (err) {
      console.error("Error linking task:", err);
    } finally {
      setTaskLinkBusy(false);
    }
  };

  const handleUnlinkTask = async (taskId: string, principleId: string) => {
    try {
      await unlinkTaskFromPrinciple(taskId, principleId);
      await reloadTasks();
    } catch (err) {
      console.error("Error unlinking task:", err);
    }
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
        <p className="text-foreground-secondary">Cargando modelo de juego...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <p className="text-red-500 font-medium mb-2">Error de conexión</p>
          <p className="text-foreground-secondary text-sm">{error}</p>
        </div>
      </div>
    );
  }

  const activeContext = contexts.find((c) => c.id === selectedContext);
  const activePhase = phases.find((p) => p.id === selectedPhase);
  const phaseColors = activePhase ? (PHASE_COLORS[activePhase.name] ?? DEFAULT_PHASE_COLORS) : DEFAULT_PHASE_COLORS;

  // Filter principles by context AND block height
  const filteredPrinciples = principles.filter((p) => {
    const ctxIds = p.principle_contexts?.map((pc) => pc.team_context_id) ?? [];
    const ctxOk = ctxIds.length === 0 || ctxIds.includes(selectedContext);
    // Block height filter: if a block is selected, show only principles for that block (or unassigned)
    const blockOk = !selectedBlock || !p.block_height_id || p.block_height_id === selectedBlock;
    return ctxOk && blockOk;
  });

  const viewingPrinciple = viewingPrincipleId ? filteredPrinciples.find((p) => p.id === viewingPrincipleId) ?? null : null;
  const selectedPrinciple = selectedPrincipleId ? filteredPrinciples.find((p) => p.id === selectedPrincipleId) ?? null : null;

  // Agrupación por zona para el campograma
  const sortedZones = [...zones].sort((a, b) => a.position - b.position);
  const principlesByZone = new Map<string, Principle[]>();
  const unassignedPrinciples: Principle[] = [];
  filteredPrinciples.forEach((p) => {
    if (p.field_zone_id) {
      const list = principlesByZone.get(p.field_zone_id) ?? [];
      list.push(p);
      principlesByZone.set(p.field_zone_id, list);
    } else {
      unassignedPrinciples.push(p);
    }
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

  // Tareas vinculadas a un principio en concreto (task_principles)
  const taskPrincipleIds = (t: Task): string[] =>
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ((t as any).task_principles as Array<{ principle_id: string }> | undefined)?.map((tp) => tp.principle_id) ?? [];
  const tasksForPrinciple = (principleId: string) => allTasks.filter((t) => taskPrincipleIds(t).includes(principleId));

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

  // Nº de tareas vinculadas a algún principio de esta fase (resumen de fase)
  const phasePrincipleIdSet = new Set(filteredPrinciples.map((p) => p.id));
  const linkedTaskCount = allTasks.filter((t) => taskPrincipleIds(t).some((pid) => phasePrincipleIdSet.has(pid))).length;

  const subCountFor = (p: Principle) => (p.sub_principles ?? []).filter((sp) => !sp.archived).length;
  const behCountFor = (p: Principle) =>
    (p.sub_principles ?? []).filter((sp) => !sp.archived).reduce((sum, sp) => sum + (sp.behaviors?.filter((b) => !b.archived)?.length ?? 0), 0);

  // ============================================
  // Vista de detalle completo de un principio
  // ============================================
  if (viewingPrinciple) {
    const allBehaviors: { behavior: Behavior; sub: SubPrinciple }[] = (viewingPrinciple.sub_principles ?? [])
      .filter((sp) => !sp.archived)
      .flatMap((sp) => (sp.behaviors ?? []).filter((b) => !b.archived).map((behavior) => ({ behavior, sub: sp })));
    const linkedTasks = tasksForPrinciple(viewingPrinciple.id);
    const linkableTasks = allTasks.filter((t) => !taskPrincipleIds(t).includes(viewingPrinciple.id));

    return (
      <div className="max-w-5xl">
        <button
          onClick={() => setViewingPrincipleId(null)}
          className="mb-4 text-sm text-muted hover:text-foreground-secondary flex items-center gap-1"
        >
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M19 12H5M12 19l-7-7 7-7" /></svg>
          Volver a {activePhase?.name}
        </button>

        <div className="flex items-center justify-between mb-1">
          <div className="flex items-center gap-3 min-w-0">
            <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: phaseColors.accent }} />
            <h1 className="text-xl font-bold text-foreground truncate">{viewingPrinciple.name}</h1>
            {itemStatuses.has(viewingPrinciple.id) && <StatusBadge status={itemStatuses.get(viewingPrinciple.id)!} />}
          </div>
          <button
            onClick={() => handleDeletePrinciple(viewingPrinciple.id)}
            className="text-xs text-foreground-secondary hover:text-red-500 flex-shrink-0"
          >
            Eliminar principio
          </button>
        </div>
        <div className="flex items-center gap-2 mb-5">
          {activePhase && PHASE_ICONS[activePhase.name]}
          <p className="text-xs text-muted">{activePhase?.name}</p>
          <span className="text-muted">·</span>
          <ZoneBadge principle={viewingPrinciple} zones={zones} phaseName={activePhase?.name} accent={phaseColors.accent} />
        </div>

        {/* Tabs */}
        <div className="flex gap-1 border-b border-border mb-5">
          {DETAIL_TABS.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setDetailTab(tab.key)}
              className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
                detailTab === tab.key ? "text-foreground" : "border-transparent text-muted hover:text-foreground-secondary"
              }`}
              style={detailTab === tab.key ? { borderColor: phaseColors.accent, color: phaseColors.accent } : {}}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Tab: Resumen */}
        {detailTab === "resumen" && (
          <div className="flex gap-6">
            <div className="flex-1 min-w-0 space-y-4">
              <div>
                <label className="text-[10px] text-muted uppercase tracking-wide font-medium block mb-1.5">Descripción</label>
                <textarea
                  defaultValue={viewingPrinciple.description}
                  onBlur={(e) => {
                    if (e.target.value !== viewingPrinciple.description) {
                      updatePrinciple(viewingPrinciple.id, { description: e.target.value }).then(loadPrinciples);
                    }
                  }}
                  placeholder="Describe qué busca este principio dentro de su zona..."
                  rows={3}
                  className="w-full px-3 py-2 border border-border rounded-lg text-sm bg-surface focus:outline-none resize-none"
                  style={{ borderColor: "var(--border)" }}
                />
              </div>
              <div>
                <label className="text-[10px] text-muted uppercase tracking-wide font-medium block mb-1.5">Vídeo de YouTube</label>
                <div className="flex items-center gap-2">
                  {viewingPrinciple.youtube_url && (
                    <YoutubeThumbnail url={viewingPrinciple.youtube_url} onClick={() => setPlayingVideoUrl(viewingPrinciple.youtube_url!)} size="md" />
                  )}
                  <YoutubeIconButton
                    hasVideo={!!viewingPrinciple.youtube_url}
                    onClick={() => { setEditingYoutubeId(viewingPrinciple.id); setEditingYoutubeLevel("principle"); }}
                  />
                  {!viewingPrinciple.youtube_url && <span className="text-xs text-muted">Sin vídeo enlazado</span>}
                </div>
                {editingYoutubeId === viewingPrinciple.id && editingYoutubeLevel === "principle" && (
                  <YoutubeUrlInput
                    currentUrl={viewingPrinciple.youtube_url}
                    onSave={(url) => handleSaveYoutubeUrl("principle", viewingPrinciple.id, url)}
                    onCancel={() => { setEditingYoutubeId(null); setEditingYoutubeLevel(null); }}
                  />
                )}
              </div>
              <div>
                <label className="text-[10px] text-muted uppercase tracking-wide font-medium block mb-1.5">Zona del campo</label>
                <ZonePicker
                  zones={zones}
                  phaseName={activePhase?.name}
                  value={viewingPrinciple.field_zone_id}
                  onChange={(zoneId) => handleSetPrincipleZone(viewingPrinciple.id, zoneId)}
                  accent={phaseColors.accent}
                />
              </div>
              <div className="grid grid-cols-3 gap-3 pt-2">
                <div className="bg-surface rounded-lg border border-border p-3 text-center">
                  <p className="text-lg font-bold" style={{ color: phaseColors.accent }}>{subCountFor(viewingPrinciple)}</p>
                  <p className="text-[10px] text-muted uppercase tracking-wide">Subprincipios</p>
                </div>
                <div className="bg-surface rounded-lg border border-border p-3 text-center">
                  <p className="text-lg font-bold" style={{ color: phaseColors.accent }}>{behCountFor(viewingPrinciple)}</p>
                  <p className="text-[10px] text-muted uppercase tracking-wide">Comportamientos</p>
                </div>
                <div className="bg-surface rounded-lg border border-border p-3 text-center">
                  <p className="text-lg font-bold" style={{ color: phaseColors.accent }}>{linkedTasks.length}</p>
                  <p className="text-[10px] text-muted uppercase tracking-wide">Tareas</p>
                </div>
              </div>
            </div>
            <div className="w-64 flex-shrink-0">
              <p className="text-[10px] text-muted uppercase tracking-wide font-medium mb-1.5">Representación táctica</p>
              <ZoneMiniMap zones={zones} zoneId={viewingPrinciple.field_zone_id} accent={phaseColors.accent} />
            </div>
          </div>
        )}

        {/* Tab: Subprincipios (árbol completo, igual que antes pero para un único principio) */}
        {detailTab === "subprincipios" && (
          <div className="bg-surface rounded-xl border border-border overflow-hidden">
            <div className="divide-y divide-surface-hover">
              {(viewingPrinciple.sub_principles ?? [])
                .filter((sp) => !sp.archived)
                .map((sub) => (
                  <div key={sub.id} className="px-4 py-3">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-300" />
                        <InlineEdit
                          value={sub.name}
                          onSave={(v) => { updateSubPrinciple(sub.id, { name: v }).then(loadPrinciples); }}
                          className="font-medium text-foreground-secondary text-sm"
                        />
                        {sub.youtube_url && (
                          <YoutubeThumbnail url={sub.youtube_url} onClick={() => setPlayingVideoUrl(sub.youtube_url!)} size="sm" />
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <YoutubeIconButton
                          hasVideo={!!sub.youtube_url}
                          onClick={() => { setEditingYoutubeId(sub.id); setEditingYoutubeLevel("sub"); }}
                        />
                        <button
                          onClick={() => { setAddingBehaviorTo(sub.id); setNewBehaviorName(""); setNewBehaviorType("individual"); }}
                          className="text-xs text-blue-400 hover:text-blue-700 font-medium"
                        >
                          + Comportamiento
                        </button>
                        <button
                          onClick={() => { if (confirm("¿Eliminar este subprincipio?")) { deleteSubPrinciple(sub.id).then(loadPrinciples); } }}
                          className="text-xs text-foreground-secondary hover:text-red-500"
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
                                  <span className="w-1 h-1 rounded-full bg-foreground-secondary" />
                                  <InlineEdit
                                    value={behavior.name}
                                    onSave={(v) => { updateBehavior(behavior.id, { name: v }).then(loadPrinciples); }}
                                    className="text-sm text-foreground-secondary"
                                  />
                                  <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${badge.color}`}>{badge.label}</span>
                                  {behavior.youtube_url && (
                                    <YoutubeThumbnail url={behavior.youtube_url} onClick={() => setPlayingVideoUrl(behavior.youtube_url!)} size="sm" />
                                  )}
                                </div>
                                <div className="flex items-center gap-1">
                                  <span className="opacity-0 group-hover:opacity-100 transition-opacity">
                                    <YoutubeIconButton
                                      hasVideo={!!behavior.youtube_url}
                                      onClick={() => { setEditingYoutubeId(behavior.id); setEditingYoutubeLevel("behavior"); }}
                                    />
                                  </span>
                                  <button
                                    onClick={() => { if (confirm("¿Eliminar este comportamiento?")) { deleteBehavior(behavior.id).then(loadPrinciples); } }}
                                    className="text-xs text-foreground-secondary hover:text-red-500 opacity-0 group-hover:opacity-100"
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
                            className="flex-1 px-2 py-1 border border-border rounded text-sm focus:outline-none focus:border-blue-400"
                          />
                          <select
                            value={newBehaviorType}
                            onChange={(e) => setNewBehaviorType(e.target.value as BehaviorType)}
                            className="px-2 py-1 border border-border rounded text-xs bg-surface"
                          >
                            <option value="individual">Individual</option>
                            <option value="relations">Relaciones</option>
                            <option value="collective">Colectivo</option>
                          </select>
                          <button onClick={() => handleCreateBehavior(sub.id)} className="px-2 py-1 bg-blue-600 text-white rounded text-xs">Crear</button>
                          <button onClick={() => setAddingBehaviorTo(null)} className="text-xs text-foreground-secondary">✕</button>
                        </div>
                      )}
                    </div>
                  </div>
                ))}

              {addingSubTo === viewingPrinciple.id ? (
                <div className="px-4 py-3 flex items-center gap-2">
                  <input
                    autoFocus
                    value={newSubName}
                    onChange={(e) => setNewSubName(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") handleCreateSubPrinciple(viewingPrinciple.id);
                      if (e.key === "Escape") setAddingSubTo(null);
                    }}
                    placeholder="Nombre del subprincipio"
                    className="flex-1 px-2 py-1 border border-border rounded text-sm focus:outline-none focus:border-emerald-400"
                  />
                  <button onClick={() => handleCreateSubPrinciple(viewingPrinciple.id)} className="px-3 py-1 bg-emerald-600 text-white rounded text-xs">Crear</button>
                  <button onClick={() => setAddingSubTo(null)} className="text-xs text-foreground-secondary">✕</button>
                </div>
              ) : (
                <button
                  onClick={() => { setAddingSubTo(viewingPrinciple.id); setNewSubName(""); }}
                  className="w-full px-4 py-3 text-left text-sm text-emerald-600 hover:bg-surface-hover transition-colors"
                >
                  + Añadir subprincipio
                </button>
              )}
            </div>
          </div>
        )}

        {/* Tab: Comportamientos (vista plana de todos los subprincipios) */}
        {detailTab === "comportamientos" && (
          <div className="bg-surface rounded-xl border border-border overflow-hidden divide-y divide-surface-hover">
            {allBehaviors.length === 0 ? (
              <p className="text-sm text-muted text-center py-8">Sin comportamientos definidos todavía.</p>
            ) : (
              allBehaviors.map(({ behavior, sub }) => {
                const badge = BEHAVIOR_LABELS[behavior.type];
                return (
                  <div key={behavior.id} className="px-4 py-3 flex items-center justify-between group">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium flex-shrink-0 ${badge.color}`}>{badge.label}</span>
                      <span className="text-sm text-foreground truncate">{behavior.name}</span>
                      <span className="text-[10px] text-muted flex-shrink-0">· {sub.name}</span>
                      {behavior.youtube_url && (
                        <YoutubeThumbnail url={behavior.youtube_url} onClick={() => setPlayingVideoUrl(behavior.youtube_url!)} size="sm" />
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        )}

        {/* Tab: Tareas */}
        {detailTab === "tareas" && (
          <div className="space-y-3">
            {linkedTasks.length === 0 ? (
              <p className="text-sm text-muted">Sin tareas vinculadas a este principio todavía.</p>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {linkedTasks.map((task) => (
                  <div key={task.id} className="bg-surface rounded-xl border border-border p-3 flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">{task.name}</p>
                      {task.duration_minutes > 0 && <p className="text-[10px] text-muted mt-0.5">{task.duration_minutes} min</p>}
                    </div>
                    <button
                      onClick={() => handleUnlinkTask(task.id, viewingPrinciple.id)}
                      className="text-xs text-muted hover:text-red-400 flex-shrink-0"
                    >
                      Quitar
                    </button>
                  </div>
                ))}
              </div>
            )}

            {taskPickerOpen ? (
              <div className="bg-surface rounded-xl border border-border p-3">
                {linkableTasks.length === 0 ? (
                  <p className="text-xs text-muted py-2">No hay más tareas disponibles para vincular.</p>
                ) : (
                  <div className="max-h-64 overflow-y-auto space-y-1">
                    {linkableTasks.map((task) => (
                      <button
                        key={task.id}
                        disabled={taskLinkBusy}
                        onClick={() => handleLinkTask(task.id, viewingPrinciple.id)}
                        className="w-full text-left px-3 py-2 rounded-lg text-sm text-foreground-secondary hover:bg-surface-hover disabled:opacity-40"
                      >
                        {task.name}
                      </button>
                    ))}
                  </div>
                )}
                <button onClick={() => setTaskPickerOpen(false)} className="text-xs text-muted hover:text-foreground-secondary mt-2">Cerrar</button>
              </div>
            ) : (
              <button
                onClick={() => setTaskPickerOpen(true)}
                className="text-sm font-medium hover:opacity-80"
                style={{ color: phaseColors.accent }}
              >
                + Vincular tarea existente
              </button>
            )}
          </div>
        )}

        {/* Tab: Relaciones */}
        {detailTab === "relaciones" && (
          <div className="space-y-4">
            <div className="bg-surface rounded-xl border border-border overflow-hidden">
              <div className="px-4 py-3 border-b border-surface-hover">
                <h3 className="text-sm font-semibold text-foreground">Principios por fase</h3>
              </div>
              <div className="p-4 grid grid-cols-3 gap-3">
                {phaseRelations.map(({ phase, principleCount, subPrincipleCount }) => (
                  <button key={phase.id} onClick={() => setSelectedPhase(phase.id)} className="text-left p-3 rounded-lg bg-surface-hover hover:brightness-110 transition">
                    <div className="flex items-center gap-1.5 mb-1">{PHASE_ICONS[phase.name]}<span className="text-xs font-medium text-foreground-secondary">{phase.name}</span></div>
                    <p className="text-[10px] text-muted">{principleCount} principios · {subPrincipleCount} subprincipios</p>
                  </button>
                ))}
              </div>
            </div>
            <button
              onClick={() => { setRelatingPrinciple(viewingPrinciple); setRelTargetPhase(""); setRelTargetContext(selectedContext); setRelTargetBlock(selectedBlock); }}
              className="px-4 py-2 rounded-lg text-sm font-medium text-white"
              style={{ background: phaseColors.accent }}
            >
              Duplicar en otra fase o contexto
            </button>
          </div>
        )}

        {/* Modales compartidos (vídeo, relacionar, estado) */}
        {playingVideoUrl && (() => {
          const vid = extractYoutubeId(playingVideoUrl);
          if (!vid) return null;
          return (
            <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4" onClick={() => setPlayingVideoUrl(null)}>
              <div className="relative w-full max-w-3xl" onClick={(e) => e.stopPropagation()}>
                <button onClick={() => setPlayingVideoUrl(null)} className="absolute -top-10 right-0 text-white/70 hover:text-white text-sm font-medium flex items-center gap-1">Cerrar ✕</button>
                <div className="relative w-full" style={{ paddingBottom: "56.25%" }}>
                  <iframe className="absolute inset-0 w-full h-full rounded-xl" src={`https://www.youtube.com/embed/${vid}?autoplay=1&rel=0`} allow="autoplay; encrypted-media" allowFullScreen />
                </div>
              </div>
            </div>
          );
        })()}

        {relatingPrinciple && (
          <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center" onClick={() => setRelatingPrinciple(null)}>
            <div className="bg-surface border border-border rounded-xl p-6 w-full max-w-md" onClick={(e) => e.stopPropagation()}>
              <h3 className="text-sm font-semibold text-foreground mb-1">Relacionar principio</h3>
              <p className="text-xs text-muted mb-4">Se creará una copia independiente de <span className="text-emerald-400">&ldquo;{relatingPrinciple.name}&rdquo;</span> con sus subprincipios y comportamientos en la fase, bloque y contexto seleccionados.</p>

              <label className="text-xs text-foreground-secondary font-medium block mb-1.5">Fase destino</label>
              <div className="flex flex-wrap gap-2 mb-4">
                {phases.filter((p) => p.name !== "ABP").map((p) => (
                  <button
                    key={p.id}
                    onClick={() => setRelTargetPhase(p.id)}
                    className={`px-3 py-1.5 rounded text-xs font-medium transition-colors ${relTargetPhase === p.id ? "bg-violet-600 text-white" : "bg-surface-hover border border-border text-foreground-secondary hover:border-violet-400"}`}
                  >
                    {p.name}
                  </button>
                ))}
              </div>

              <label className="text-xs text-foreground-secondary font-medium block mb-1.5">Bloque destino (opcional)</label>
              <div className="flex flex-wrap gap-2 mb-4">
                <button
                  onClick={() => setRelTargetBlock(null)}
                  className={`px-3 py-1.5 rounded text-xs font-medium transition-colors ${relTargetBlock === null ? "bg-violet-600 text-white" : "bg-surface-hover border border-border text-foreground-secondary hover:border-violet-400"}`}
                >
                  Sin especificar
                </button>
                {blocks.map((b) => (
                  <button
                    key={b.id}
                    onClick={() => setRelTargetBlock(b.id)}
                    className={`px-3 py-1.5 rounded text-xs font-medium transition-colors ${relTargetBlock === b.id ? "bg-violet-600 text-white" : "bg-surface-hover border border-border text-foreground-secondary hover:border-violet-400"}`}
                  >
                    {b.name}
                  </button>
                ))}
              </div>

              <label className="text-xs text-foreground-secondary font-medium block mb-1.5">Contexto destino</label>
              <div className="flex flex-wrap gap-2 mb-5">
                {contexts.map((c) => (
                  <button
                    key={c.id}
                    onClick={() => setRelTargetContext(c.id)}
                    className={`px-3 py-1.5 rounded text-xs font-medium transition-colors ${relTargetContext === c.id ? "bg-violet-600 text-white" : "bg-surface-hover border border-border text-foreground-secondary hover:border-violet-400"}`}
                  >
                    {c.name}
                  </button>
                ))}
              </div>

              <div className="flex justify-end gap-2">
                <button onClick={() => setRelatingPrinciple(null)} className="px-4 py-2 text-xs text-foreground-secondary hover:text-foreground-secondary">Cancelar</button>
                <button onClick={handleDuplicatePrinciple} disabled={!relTargetPhase} className="px-4 py-2 bg-violet-600 text-white rounded-lg text-xs font-medium disabled:opacity-40">Duplicar principio</button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  // ============================================
  // Vista principal: campograma + tarjetas + panel contextual
  // ============================================
  return (
    <div className="flex gap-6">
      {/* ===== LEFT: Main content ===== */}
      <div className="flex-1 min-w-0">
        <h1 className="text-2xl font-bold text-foreground mb-6">Modelo de juego</h1>

        {/* Nivel 1: Contexto de equipo */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-xs font-medium text-muted uppercase tracking-wide">
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
                      : "bg-surface border border-border text-foreground-secondary hover:border-emerald-300"
                  }`}
                  title="Doble clic para editar"
                >
                  {ctx.name}
                </button>
                {!ctx.is_default && (
                  <button
                    onClick={() => handleDeleteContext(ctx.id)}
                    className="absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full bg-surface border border-border text-muted hover:text-rose-400 hover:border-rose-400 text-[10px] flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    ✕
                  </button>
                )}
              </div>
            ))}
          </div>

          {/* Add context form */}
          {addingContext && (
            <div className="mt-3 bg-surface border border-border rounded-lg p-3 flex flex-col gap-2">
              <input
                autoFocus
                value={newContextName}
                onChange={(e) => setNewContextName(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") handleCreateContext(); if (e.key === "Escape") setAddingContext(false); }}
                placeholder="Nombre del contexto (ej: Sub-17 España)"
                className="px-3 py-1.5 border border-border rounded text-sm focus:outline-none focus:border-emerald-400"
              />
              <input
                value={newContextDesc}
                onChange={(e) => setNewContextDesc(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") handleCreateContext(); if (e.key === "Escape") setAddingContext(false); }}
                placeholder="Descripción breve (opcional)"
                className="px-3 py-1.5 border border-border rounded text-sm focus:outline-none focus:border-emerald-400"
              />
              <div className="flex gap-2">
                <button onClick={handleCreateContext} className="px-3 py-1.5 bg-emerald-600 text-white rounded text-xs font-medium">Crear</button>
                <button onClick={() => setAddingContext(false)} className="text-xs text-foreground-secondary">Cancelar</button>
              </div>
            </div>
          )}

          {/* Edit context modal */}
          {editingContextId && (
            <div className="mt-3 bg-surface border border-emerald-600/30 rounded-lg p-3 flex flex-col gap-2">
              <input
                autoFocus
                value={editContextName}
                onChange={(e) => setEditContextName(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") handleUpdateContext(editingContextId); if (e.key === "Escape") setEditingContextId(null); }}
                className="px-3 py-1.5 border border-border rounded text-sm focus:outline-none focus:border-emerald-400"
              />
              <input
                value={editContextDesc}
                onChange={(e) => setEditContextDesc(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") handleUpdateContext(editingContextId); if (e.key === "Escape") setEditingContextId(null); }}
                placeholder="Descripción"
                className="px-3 py-1.5 border border-border rounded text-sm focus:outline-none focus:border-emerald-400"
              />
              <div className="flex gap-2">
                <button onClick={() => handleUpdateContext(editingContextId)} className="px-3 py-1.5 bg-emerald-600 text-white rounded text-xs font-medium">Guardar</button>
                <button onClick={() => setEditingContextId(null)} className="text-xs text-foreground-secondary">Cancelar</button>
              </div>
            </div>
          )}

          {activeContext && !editingContextId && (
            <p className="text-sm text-muted mt-2">{activeContext.description}</p>
          )}
        </div>

        {/* Nivel 2: Fases del juego (sin ABP) + toggle Campograma/Mapa */}
        <div className="mb-6 flex items-center justify-between border-b border-border">
          <div className="flex">
            {phases.filter((p) => p.name !== "ABP").map((phase) => (
              <button
                key={phase.id}
                onClick={() => setSelectedPhase(phase.id)}
                className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
                  selectedPhase === phase.id
                    ? "border-emerald-600 text-emerald-600"
                    : "border-transparent text-muted hover:text-foreground-secondary"
                }`}
              >
                {PHASE_ICONS[phase.name] && <span className="flex-shrink-0">{PHASE_ICONS[phase.name]}</span>}
                {phase.name}
              </button>
            ))}
          </div>
          <div className="flex gap-1 mb-2 flex-shrink-0">
            <button
              onClick={() => setTopView("campo")}
              className={`px-3 py-1 rounded-lg text-xs font-medium transition-colors ${topView === "campo" ? "bg-surface-hover text-foreground" : "text-muted hover:text-foreground-secondary"}`}
            >
              Campograma
            </button>
            <button
              onClick={() => setTopView("mapa")}
              className={`px-3 py-1 rounded-lg text-xs font-medium transition-colors ${topView === "mapa" ? "bg-surface-hover text-foreground" : "text-muted hover:text-foreground-secondary"}`}
            >
              Mapa
            </button>
          </div>
        </div>

        {/* Nivel 3: Altura de bloque */}
        <div className="mb-6">
          <h2 className="text-xs font-medium text-muted uppercase tracking-wide mb-3">
            Altura de bloque rival
          </h2>
          <div className="flex gap-2">
            <button
              onClick={() => setSelectedBlock(null)}
              className={`px-3 py-1.5 rounded text-sm transition-colors ${
                selectedBlock === null
                  ? "bg-surface-hover text-foreground"
                  : "bg-surface border border-border text-foreground-secondary hover:border-border-light"
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
                    ? "bg-surface-hover text-foreground"
                    : "bg-surface border border-border text-foreground-secondary hover:border-border-light"
                }`}
              >
                {block.name}
              </button>
            ))}
          </div>
        </div>

        {topView === "mapa" ? (
          /* ===== Mapa global del modelo ===== */
          <div className="bg-surface rounded-xl border border-border p-6">
            <h2 className="text-sm font-semibold text-foreground mb-1">Mapa del modelo de juego</h2>
            <p className="text-xs text-muted mb-5">
              {activeContext?.name}
              {selectedBlock ? ` · ${blocks.find((b) => b.id === selectedBlock)?.name ?? ""}` : ""}
            </p>
            <div className="grid grid-cols-2 gap-4 max-w-2xl">
              {phases.filter((p) => p.name !== "ABP").map((phase) => {
                const list = (allPhasePrinciples[phase.id] ?? []).filter((p) => {
                  const ctxIds = p.principle_contexts?.map((pc) => pc.team_context_id) ?? [];
                  const ctxOk = ctxIds.length === 0 || ctxIds.includes(selectedContext);
                  const blockOk = !selectedBlock || !p.block_height_id || p.block_height_id === selectedBlock;
                  return ctxOk && blockOk;
                });
                const c = PHASE_COLORS[phase.name] ?? DEFAULT_PHASE_COLORS;
                return (
                  <button
                    key={phase.id}
                    onClick={() => { setSelectedPhase(phase.id); setTopView("campo"); }}
                    className="text-left rounded-xl border p-4 hover:brightness-110 transition flex flex-col h-64"
                    style={{ borderColor: c.border, backgroundColor: c.bg }}
                  >
                    <div className="flex items-center gap-2 mb-2 flex-shrink-0">
                      {PHASE_ICONS[phase.name]}
                      <span className="text-sm font-semibold" style={{ color: c.accent }}>{phase.name.toUpperCase()}</span>
                    </div>
                    <div className="flex-1 min-h-0 overflow-y-auto">
                      {list.length === 0 ? (
                        <p className="text-[11px] text-muted italic">Sin principios todavía</p>
                      ) : (
                        <ul className="space-y-1.5">
                          {list.map((p) => (
                            <li key={p.id} className="text-[11px] text-foreground-secondary">
                              <p className="truncate">• {p.name}</p>
                              {!selectedBlock && p.block_height_id && (
                                <p className="pl-2.5 text-[9px] text-muted truncate">
                                  {blocks.find((b) => b.id === p.block_height_id)?.name}
                                </p>
                              )}
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        ) : (
          <>
            {/* Campograma central con las 4 zonas de la fase activa */}
            <div className="bg-surface rounded-xl border border-border p-4 mb-3">
              <div className="max-w-lg mx-auto">
                <PrincipleFieldMap
                  zones={sortedZones}
                  phaseName={activePhase?.name}
                  accent={phaseColors.accent}
                  principlesByZone={principlesByZone}
                  selectedId={selectedPrincipleId}
                  onSelect={(id) => setSelectedPrincipleId((prev) => (prev === id ? null : id))}
                />
              </div>
            </div>

            {/* Información del principio seleccionado — entre el campograma y las tarjetas */}
            {selectedPrinciple && (
              <div className="rounded-xl border overflow-hidden mb-6" style={{ borderColor: phaseColors.border, backgroundColor: phaseColors.bg }}>
                <div className="px-4 py-3 border-b" style={{ borderColor: phaseColors.border }}>
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: phaseColors.accent }} />
                      <h3 className="text-sm font-semibold text-foreground truncate">{selectedPrinciple.name}</h3>
                      <ZoneBadge principle={selectedPrinciple} zones={zones} phaseName={activePhase?.name} accent={phaseColors.accent} />
                      {selectedPrinciple.youtube_url && (
                        <YoutubeThumbnail url={selectedPrinciple.youtube_url} onClick={() => setPlayingVideoUrl(selectedPrinciple.youtube_url!)} size="sm" />
                      )}
                      <YoutubeIconButton
                        hasVideo={!!selectedPrinciple.youtube_url}
                        onClick={() => { setEditingYoutubeId(selectedPrinciple.id); setEditingYoutubeLevel("principle"); }}
                      />
                    </div>
                    <button onClick={() => setSelectedPrincipleId(null)} className="text-muted hover:text-foreground-secondary flex-shrink-0 text-xs">✕</button>
                  </div>
                  {editingYoutubeId === selectedPrinciple.id && editingYoutubeLevel === "principle" && (
                    <YoutubeUrlInput
                      currentUrl={selectedPrinciple.youtube_url}
                      onSave={(url) => handleSaveYoutubeUrl("principle", selectedPrinciple.id, url)}
                      onCancel={() => { setEditingYoutubeId(null); setEditingYoutubeLevel(null); }}
                    />
                  )}
                </div>
                <div className="p-4 flex gap-6">
                  <div className="flex-1 min-w-0 space-y-3">
                    <p className="text-xs text-foreground-secondary">{selectedPrinciple.description || "Sin descripción todavía."}</p>
                    <div className="grid grid-cols-3 gap-4">
                      <div>
                        <p className="text-[10px] text-muted uppercase tracking-wide font-medium mb-1">Subprincipios ({subCountFor(selectedPrinciple)})</p>
                        {subCountFor(selectedPrinciple) === 0 ? (
                          <p className="text-xs text-muted italic">Sin subprincipios</p>
                        ) : (
                          <ul className="space-y-0.5">
                            {(selectedPrinciple.sub_principles ?? []).filter((s) => !s.archived).slice(0, 3).map((s) => (
                              <li key={s.id} className="text-xs text-foreground-secondary flex items-center gap-1.5">
                                <span className="text-muted">·</span>
                                <span className="flex-1">{s.name}</span>
                                {s.youtube_url && (
                                  <button
                                    onClick={() => setPlayingVideoUrl(s.youtube_url!)}
                                    className="flex-shrink-0 text-red-400 hover:text-red-300"
                                    title="Ver vídeo"
                                  >
                                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                      <path d="M22.54 6.42a2.78 2.78 0 0 0-1.94-2C18.88 4 12 4 12 4s-6.88 0-8.6.46a2.78 2.78 0 0 0-1.94 2A29 29 0 0 0 1 11.75a29 29 0 0 0 .46 5.33A2.78 2.78 0 0 0 3.4 19.13C5.12 19.55 12 19.55 12 19.55s6.88 0 8.6-.46a2.78 2.78 0 0 0 1.94-2 29 29 0 0 0 .46-5.25 29 29 0 0 0-.46-5.42z" />
                                      <polygon points="9.75 15.02 15.5 11.75 9.75 8.48 9.75 15.02" />
                                    </svg>
                                  </button>
                                )}
                              </li>
                            ))}
                          </ul>
                        )}
                      </div>
                      <div>
                        <p className="text-[10px] text-muted uppercase tracking-wide font-medium mb-1">Comportamientos ({behCountFor(selectedPrinciple)})</p>
                        {behCountFor(selectedPrinciple) === 0 ? (
                          <p className="text-xs text-muted italic">Sin comportamientos</p>
                        ) : (
                          <ul className="space-y-0.5">
                            {(selectedPrinciple.sub_principles ?? [])
                              .filter((s) => !s.archived)
                              .flatMap((s) => s.behaviors ?? [])
                              .filter((b) => !b.archived)
                              .slice(0, 3)
                              .map((b) => (
                                <li key={b.id} className="text-xs text-foreground-secondary flex items-start gap-1.5"><span className="text-muted">·</span>{b.name}</li>
                              ))}
                          </ul>
                        )}
                      </div>
                      <div>
                        <p className="text-[10px] text-muted uppercase tracking-wide font-medium mb-1">Tareas ({tasksForPrinciple(selectedPrinciple.id).length})</p>
                        {tasksForPrinciple(selectedPrinciple.id).length === 0 ? (
                          <p className="text-xs text-muted italic">Sin tareas vinculadas</p>
                        ) : (
                          <ul className="space-y-0.5">
                            {tasksForPrinciple(selectedPrinciple.id).slice(0, 3).map((t) => (
                              <li key={t.id} className="text-xs text-foreground-secondary flex items-start gap-1.5"><span className="text-muted">·</span>{t.name}</li>
                            ))}
                          </ul>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="w-36 flex-shrink-0 flex flex-col items-stretch gap-2">
                    <ZoneMiniMap zones={zones} zoneId={selectedPrinciple.field_zone_id} accent={phaseColors.accent} />
                    <button
                      onClick={() => { setViewingPrincipleId(selectedPrinciple.id); setDetailTab("resumen"); }}
                      className="py-2 rounded-lg text-white text-xs font-medium transition-opacity hover:opacity-90 flex items-center justify-center gap-1.5"
                      style={{ background: phaseColors.accent }}
                    >
                      Ver completo
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M5 12h14M13 6l6 6-6 6" /></svg>
                    </button>
                  </div>
                </div>
              </div>
            )}

            {unassignedPrinciples.length > 0 && (
              <div className="mb-6 flex flex-wrap items-center gap-2 text-xs text-muted">
                <span>Sin zona asignada:</span>
                {unassignedPrinciples.map((p) => (
                  <button
                    key={p.id}
                    onClick={() => setSelectedPrincipleId((prev) => (prev === p.id ? null : p.id))}
                    className={`px-2 py-1 rounded-full border transition-colors ${selectedPrincipleId === p.id ? "border-current" : "border-border hover:border-border-light"}`}
                    style={selectedPrincipleId === p.id ? { color: phaseColors.accent, borderColor: phaseColors.accent } : {}}
                  >
                    {p.name}
                  </button>
                ))}
              </div>
            )}

            {/* Tarjetas de principios */}
            <h2 className="text-xs font-medium text-muted uppercase tracking-wide mb-3">
              Principios de {activePhase?.name.toLowerCase()} ({filteredPrinciples.length})
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {filteredPrinciples.map((principle) => {
                const isSel = principle.id === selectedPrincipleId;
                return (
                  <div
                    key={principle.id}
                    onClick={() => setSelectedPrincipleId((prev) => (prev === principle.id ? null : principle.id))}
                    onContextMenu={(e) => handleContextMenu(e, principle.id, principle.name)}
                    className="text-left bg-surface rounded-xl border p-3 cursor-pointer transition-colors flex flex-col"
                    style={isSel ? { borderColor: phaseColors.accent } : { borderColor: "var(--border)" }}
                  >
                    <div style={{ maxWidth: 220 }} className="mb-2">
                      <ZoneMiniMap zones={zones} zoneId={principle.field_zone_id} accent={phaseColors.accent} />
                    </div>
                    <div className="flex items-center justify-between gap-2 mb-1">
                      <div className="flex items-center gap-1.5 min-w-0">
                        <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: phaseColors.accent }} />
                        <h3 className="text-sm font-semibold text-foreground truncate">{principle.name}</h3>
                      </div>
                      {itemStatuses.has(principle.id) && <StatusBadge status={itemStatuses.get(principle.id)!} />}
                    </div>
                    <p className="text-xs text-foreground-secondary line-clamp-2 mb-2">{principle.description || "Sin descripción"}</p>
                    <div className="mt-auto flex items-center justify-between gap-2">
                      <ZoneBadge principle={principle} zones={zones} phaseName={activePhase?.name} accent={phaseColors.accent} />
                      <span className="text-[10px] text-muted flex-shrink-0">
                        {subCountFor(principle)} sub · {behCountFor(principle)} comp · {tasksForPrinciple(principle.id).length} tareas
                      </span>
                    </div>
                  </div>
                );
              })}

              {/* Crear nuevo principio */}
              {addingPrinciple ? (
                <div className="bg-surface rounded-xl border border-border p-4 flex flex-col gap-2 md:col-span-2 lg:col-span-3">
                  <input
                    autoFocus
                    value={newPrincipleName}
                    onChange={(e) => setNewPrincipleName(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") handleCreatePrinciple();
                      if (e.key === "Escape") setAddingPrinciple(false);
                    }}
                    placeholder="Nombre del principio"
                    className="px-3 py-2 border border-border rounded-lg text-sm focus:outline-none focus:border-emerald-400"
                  />
                  <div>
                    <label className="text-[10px] text-muted uppercase tracking-wide font-medium block mb-1">Zona del campo</label>
                    <ZonePicker zones={zones} phaseName={activePhase?.name} value={newPrincipleZone} onChange={setNewPrincipleZone} accent={phaseColors.accent} />
                  </div>
                  <div className="flex gap-2">
                    <button onClick={handleCreatePrinciple} className="px-4 py-2 bg-emerald-600 text-white rounded-lg text-sm font-medium">Crear</button>
                    <button onClick={() => setAddingPrinciple(false)} className="text-foreground-secondary hover:text-foreground-secondary text-sm">Cancelar</button>
                  </div>
                </div>
              ) : (
                <button
                  onClick={() => setAddingPrinciple(true)}
                  className="py-4 border-2 border-dashed border-border rounded-xl text-sm font-medium text-foreground-secondary hover:border-emerald-300 hover:text-emerald-600 transition-colors"
                >
                  + Nuevo principio
                </button>
              )}
            </div>
          </>
        )}
      </div>

      {/* ===== RIGHT: Sidebar (siempre fija — no cambia al seleccionar un principio) ===== */}
      <div className="w-72 flex-shrink-0 space-y-4">
        <>
            {/* Resumen de la fase */}
            <div className="rounded-xl border overflow-hidden" style={{ borderColor: phaseColors.border, backgroundColor: phaseColors.bg }}>
              <div className="px-4 py-3 border-b" style={{ borderColor: phaseColors.border }}>
                <div className="flex items-center gap-2">
                  {activePhase && PHASE_ICONS[activePhase.name]}
                  <h3 className="text-sm font-semibold text-foreground">
                    {activePhase?.name ?? "Fase"}
                  </h3>
                </div>
                <p className="text-xs text-muted mt-1">Resumen de la fase seleccionada</p>
              </div>
              <div className="p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-foreground-secondary">Principios</span>
                  <span className="text-sm font-bold" style={{ color: phaseColors.accent }}>{totalPrinciples}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-foreground-secondary">Subprincipios</span>
                  <span className="text-sm font-bold" style={{ color: phaseColors.accent }}>{totalSubPrinciples}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-foreground-secondary">Comportamientos</span>
                  <span className="text-sm font-bold" style={{ color: phaseColors.accent }}>{totalBehaviors}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-foreground-secondary">Tareas relacionadas</span>
                  <span className="text-sm font-bold" style={{ color: phaseColors.accent }}>{linkedTaskCount}</span>
                </div>
                {/* Behavior type breakdown */}
                {totalBehaviors > 0 && (
                  <div className="pt-2 border-t" style={{ borderColor: phaseColors.border }}>
                    <p className="text-[10px] text-muted uppercase tracking-wide mb-2">Por tipo</p>
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
                          <span className="text-xs text-foreground-secondary">{count}</span>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>

            {/* Relación con otras fases */}
            <div className="bg-surface rounded-xl border border-border overflow-hidden">
              <div className="px-4 py-3 border-b border-surface-hover">
                <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
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
                      <span className="text-xs font-medium text-foreground-secondary group-hover:text-foreground transition-colors">{phase.name}</span>
                    </div>
                    <div className="flex items-center gap-3 pl-6">
                      <span className="text-[10px] text-muted">{principleCount} principios</span>
                      <span className="text-[10px] text-muted">{subPrincipleCount} subprincipios</span>
                    </div>
                  </button>
                ))}
                {phaseRelations.length === 0 && (
                  <p className="text-xs text-muted">No hay otras fases disponibles</p>
                )}
              </div>
            </div>

            {/* Tareas destacadas */}
            <div className="bg-surface rounded-xl border border-border overflow-hidden">
              <div className="px-4 py-3 border-b border-surface-hover">
                <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#f87171" strokeWidth="2" strokeLinecap="round">
                    <path d="M12 2l3.09 6.26L22 9.27l-5 4.87L18.18 21 12 17.27 5.82 21 7 14.14l-5-4.87 6.91-1.01L12 2z" />
                  </svg>
                  Tareas destacadas
                </h3>
                <p className="text-[10px] text-muted mt-0.5">
                  {phaseFavTasks.length > 0
                    ? `Tareas favoritas de ${activePhase?.name}`
                    : "Tareas marcadas como favoritas"}
                </p>
              </div>
              <div className="p-3">
                {sidebarTasks.length > 0 ? (
                  <div className="space-y-2">
                    {sidebarTasks.map(task => (
                      <div key={task.id} className="bg-surface-hover rounded-lg px-3 py-2 group">
                        <p className="text-xs font-medium text-foreground-secondary line-clamp-2">{task.name}</p>
                        {task.duration_minutes > 0 && (
                          <p className="text-[10px] text-muted mt-1">{task.duration_minutes} min</p>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-4">
                    <p className="text-xs text-muted">Sin tareas favoritas</p>
                    <p className="text-[10px] text-muted mt-1">Marca tareas con ★ para verlas aquí</p>
                  </div>
                )}
              </div>
            </div>
        </>
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
          <div className="bg-surface border border-border rounded-xl p-6 w-full max-w-md" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-sm font-semibold text-foreground mb-1">Relacionar principio</h3>
            <p className="text-xs text-muted mb-4">Se creará una copia independiente de <span className="text-emerald-400">&ldquo;{relatingPrinciple.name}&rdquo;</span> con sus subprincipios y comportamientos en la fase, bloque y contexto seleccionados.</p>

            <label className="text-xs text-foreground-secondary font-medium block mb-1.5">Fase destino</label>
            <div className="flex flex-wrap gap-2 mb-4">
              {phases.filter((p) => p.name !== "ABP").map((p) => (
                <button
                  key={p.id}
                  onClick={() => setRelTargetPhase(p.id)}
                  className={`px-3 py-1.5 rounded text-xs font-medium transition-colors ${
                    relTargetPhase === p.id
                      ? "bg-violet-600 text-white"
                      : "bg-surface-hover border border-border text-foreground-secondary hover:border-violet-400"
                  }`}
                >
                  {p.name}
                </button>
              ))}
            </div>

            <label className="text-xs text-foreground-secondary font-medium block mb-1.5">Bloque destino (opcional)</label>
            <div className="flex flex-wrap gap-2 mb-4">
              <button
                onClick={() => setRelTargetBlock(null)}
                className={`px-3 py-1.5 rounded text-xs font-medium transition-colors ${
                  relTargetBlock === null
                    ? "bg-violet-600 text-white"
                    : "bg-surface-hover border border-border text-foreground-secondary hover:border-violet-400"
                }`}
              >
                Sin especificar
              </button>
              {blocks.map((b) => (
                <button
                  key={b.id}
                  onClick={() => setRelTargetBlock(b.id)}
                  className={`px-3 py-1.5 rounded text-xs font-medium transition-colors ${
                    relTargetBlock === b.id
                      ? "bg-violet-600 text-white"
                      : "bg-surface-hover border border-border text-foreground-secondary hover:border-violet-400"
                  }`}
                >
                  {b.name}
                </button>
              ))}
            </div>

            <label className="text-xs text-foreground-secondary font-medium block mb-1.5">Contexto destino</label>
            <div className="flex flex-wrap gap-2 mb-5">
              {contexts.map((c) => (
                <button
                  key={c.id}
                  onClick={() => setRelTargetContext(c.id)}
                  className={`px-3 py-1.5 rounded text-xs font-medium transition-colors ${
                    relTargetContext === c.id
                      ? "bg-violet-600 text-white"
                      : "bg-surface-hover border border-border text-foreground-secondary hover:border-violet-400"
                  }`}
                >
                  {c.name}
                </button>
              ))}
            </div>

            <div className="flex justify-end gap-2">
              <button onClick={() => setRelatingPrinciple(null)} className="px-4 py-2 text-xs text-foreground-secondary hover:text-foreground-secondary">Cancelar</button>
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
