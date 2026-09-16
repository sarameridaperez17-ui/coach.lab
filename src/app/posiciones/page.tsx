"use client";

import { useState, useEffect, useCallback } from "react";
import {
  getTeamContexts,
  getGamePhases,
  getPositions,
  getFieldZones,
  getPositionBehaviors,
  createPositionBehavior,
  updatePositionBehavior,
  deletePositionBehavior,
  setItemStatus,
  removeItemStatus,
  getItemStatuses,
} from "@/lib/api";
import type { ItemStatus } from "@/lib/api";
import { StatusMenu, StatusBadge } from "@/components/ui/StatusMenu";
import { Pitch, FIELD } from "@/components/pitch";
import type {
  TeamContext,
  GamePhase,
  Position,
  FieldZone,
  PositionBehavior,
} from "@/types";

// ── ADN estático por posición ──────────────────────────────────
interface PositionADN {
  funcion: string;
  interacciones: string[];
  momentos: string[];
}

const POSITION_ADN: Record<string, PositionADN> = {
  PT: {
    funcion: "Iniciar - Conectar - Parar.",
    interacciones: ["CT", "LT", "MC"],
    momentos: ["Inicio", "Progresión", "Transición defensiva"],
  },
  CT: {
    funcion: "Dar continuidad - Atraer y superar - sostener",
    interacciones: ["PT", "MC", "LT"],
    momentos: ["Inicio", "Progresión", "Pérdida"],
  },
  CL: {
    funcion: "Proporcionar amplitud - Progresar - Equilibrar.",
    interacciones: ["CC", "LT/CA", "IN"],
    momentos: ["Inicio", "Progresión", "Transición defensiva"],
  },
  CC: {
    funcion: "Organizar - Conectar - Proteger.",
    interacciones: ["CL", "MC", "PT"],
    momentos: ["Inicio", "Pérdida", "Defensa de profundidad"],
  },
  LT: {
    funcion: "Dar amplitud - Progresar - Equilibrar.",
    interacciones: ["EX", "IN", "CT"],
    momentos: ["Progresión", "Último tercio", "Pérdida"],
  },
  Ca: {
    funcion: "Garantizar amplitud - Atacar espacio - Ajustar.",
    interacciones: ["CL", "IN", "DC"],
    momentos: ["Progresión", "Último tercio", "Transición defensiva"],
  },
  MC: {
    funcion: "Dar continuidad - Conectar - Equilibrar.",
    interacciones: ["CT", "IN", "MP"],
    momentos: ["Inicio", "Progresión", "Pérdida"],
  },
  IN: {
    funcion: "Ocupar y conectar - Generar ventajas - Llegar área.",
    interacciones: ["MC", "EX/CA", "DC"],
    momentos: ["Progresión", "Último tercio", "Finalización"],
  },
  MP: {
    funcion: "Recibir entre líneas - Amenazar profundidad - Generar ventajas.",
    interacciones: ["IN", "EX", "DC"],
    momentos: ["Último tercio", "Creación", "Finalización"],
  },
  EX: {
    funcion: "Fijar y estirar - Atacar espacios - Generar duelos.",
    interacciones: ["LT", "IN", "DC"],
    momentos: ["Desequilibrio", "Último tercio", "Finalización"],
  },
  DC: {
    funcion: "Fijar y estirar - Ofrecer apoyos - Atacar espacios.",
    interacciones: ["MP", "EX", "IN"],
    momentos: ["Fijar progresión", "Último tercio", "Meter goles"],
  },
  DP: {
    funcion: "Fijar y dividir - Generar diferentes alturas - Atacar espacios.",
    interacciones: ["MP", "EX/CA", "IN"],
    momentos: ["Último tercio", "Meter goles", "Transición ofensiva"],
  },
};

// Coordenadas de cada posición en el sistema maestro en metros del <Pitch>
// (x=0 portería propia -> x=105 rival, y=0..68).
const POSITION_COORDS: Record<string, { x: number; y: number }> = {
  PT: { x: 10.5, y: 34 },
  CT: { x: 26.3, y: 23.8 },
  CL: { x: 26.3, y: 23.8 },
  CC: { x: 26.3, y: 34 },
  LT: { x: 42, y: 10.2 },
  Ca: { x: 42, y: 57.8 },
  EX: { x: 63, y: 6.8 },
  MC: { x: 47.3, y: 27.2 },
  IN: { x: 57.8, y: 40.8 },
  MP: { x: 68.3, y: 34 },
  DC: { x: 84, y: 27.2 },
  DP: { x: 84, y: 40.8 },
};

// Cuartos del campo (mismo sistema de coordenadas maestro).
const ZONES = [
  { id: "Z1", x0: 0, x1: FIELD.W / 4, opacity: 0.32 },
  { id: "Z2", x0: FIELD.W / 4, x1: (FIELD.W / 4) * 2, opacity: 0.24 },
  { id: "Z3", x0: (FIELD.W / 4) * 2, x1: (FIELD.W / 4) * 3, opacity: 0.18 },
  { id: "Z4", x0: (FIELD.W / 4) * 3, x1: FIELD.W, opacity: 0.12 },
];

function FieldZoneMap({ posAbbr }: { posAbbr: string }) {
  const coords = POSITION_COORDS[posAbbr] ?? { x: FIELD.W / 2, y: FIELD.H / 2 };
  return (
    <div style={{ maxWidth: 320 }}>
      <Pitch className="rounded-lg">
        {ZONES.map((z) => (
          <g key={z.id}>
            <rect
              x={z.x0}
              y={0}
              width={z.x1 - z.x0}
              height={FIELD.H}
              fill="#166534"
              fillOpacity={z.opacity}
              stroke="#22c55e"
              strokeWidth="0.3"
              strokeDasharray="1.6"
            />
            <text x={z.x0 + 2.5} y={6} fill="#bbf7d0" fontSize="3.4" fontWeight="bold" opacity="0.85">{z.id}</text>
          </g>
        ))}
        <circle cx={coords.x} cy={coords.y} r="4" fill="#3b82f6" stroke="white" strokeWidth="0.6" />
        <text x={coords.x} y={coords.y + 1.3} textAnchor="middle" fill="white" fontSize="3.2" fontWeight="bold" style={{ pointerEvents: "none" }}>{posAbbr}</text>
      </Pitch>
    </div>
  );
}

// ── YouTube helpers — mismo formato que Modelo de juego ────────
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

// ── Campograma de conceptos por posición ───────────────────────
// Constantes de relleno del <Pitch> (ver PAD_X/PAD_Y en components/pitch/Pitch.tsx)
// — necesarias para alinear la capa HTML de conceptos exactamente sobre las
// bandas del campo, ya que el <svg> incluye margen extra para las porterías.
const PITCH_PAD_X = 5.6; // GOAL_VIS_DEPTH (3.6) + 2
const PITCH_PAD_Y = 2;
const PITCH_VB_W = FIELD.W + PITCH_PAD_X * 2;
const PITCH_VB_H = FIELD.H + PITCH_PAD_Y * 2;

// Mismo formato de campograma que en Modelo de juego (bandas por zona sobre
// el campo), pero con los conceptos/comportamientos de cada zona listados en
// filas de texto dentro de su banda, en vez de en una fila de tabla.
function PositionConceptFieldMap({
  zones,
  behaviors,
  selectedPhase,
  getZoneDisplayName,
  accent,
  editingYoutubeCell,
  onToggleEditVideo,
  onSaveVideoInline,
  onCancelEditVideo,
  onEditBehavior,
  onAddBehavior,
}: {
  zones: FieldZone[];
  behaviors: PositionBehavior[];
  selectedPhase: string;
  getZoneDisplayName: (zoneName: string) => string;
  accent: string;
  editingYoutubeCell: string | null;
  onToggleEditVideo: (behaviorId: string) => void;
  onSaveVideoInline: (b: PositionBehavior, url: string | null) => void;
  onCancelEditVideo: () => void;
  onEditBehavior: (b: PositionBehavior) => void;
  onAddBehavior: (zoneId: string) => void;
}) {
  const sorted = [...zones].sort((a, b) => a.position - b.position);
  const n = sorted.length || 1;
  const bandW = FIELD.W / n;

  return (
    <div className="relative w-full">
      <Pitch className="rounded-lg">
        {sorted.map((z, i) => (
          <rect
            key={z.id}
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
        ))}
      </Pitch>

      {/* Capa HTML alineada sobre las bandas del campo, con los conceptos en filas */}
      <div
        className="absolute flex"
        style={{
          left: `${(PITCH_PAD_X / PITCH_VB_W) * 100}%`,
          right: `${(PITCH_PAD_X / PITCH_VB_W) * 100}%`,
          top: `${(PITCH_PAD_Y / PITCH_VB_H) * 100}%`,
          bottom: `${(PITCH_PAD_Y / PITCH_VB_H) * 100}%`,
        }}
      >
        {sorted.map((z, i) => {
          const cellBehaviors = behaviors.filter((b) => b.field_zone_id === z.id && b.game_phase_id === selectedPhase);
          return (
            <div
              key={z.id}
              className={`flex-1 min-w-0 h-full flex flex-col px-2 py-2 ${i > 0 ? "border-l border-dashed border-white/25" : ""}`}
            >
              <p
                className="text-center text-[9px] font-bold uppercase tracking-wide mb-1.5 flex-shrink-0"
                style={{ color: accent, textShadow: "0 1px 2px rgba(0,0,0,0.6)" }}
              >
                {getZoneDisplayName(z.name) || `Zona ${z.name}`}
              </p>
              <div className="flex-1 min-h-0 overflow-y-auto space-y-2">
                {cellBehaviors.map((b) => {
                  const detailLines = b.details ? b.details.split("\n").filter(Boolean) : [];
                  return (
                    <div key={b.id}>
                      <div className="relative">
                        <button
                          onClick={() => onEditBehavior(b)}
                          className="text-left text-[10px] font-semibold text-black bg-white/90 rounded pl-1 pr-5 py-0.5 leading-tight hover:bg-white transition-colors block w-full truncate"
                        >
                          {b.title}
                        </button>
                        {/* Vídeo — solo el logo de YouTube, en el extremo derecho del rectángulo del título */}
                        <span className="absolute right-0.5 top-1/2 -translate-y-1/2">
                          <YoutubeIconButton hasVideo={!!b.youtube_url} onClick={() => onToggleEditVideo(b.id)} />
                        </span>
                      </div>
                      {editingYoutubeCell === b.id && (
                        <div onClick={(e) => e.stopPropagation()} className="mt-1">
                          <YoutubeUrlInput
                            currentUrl={b.youtube_url}
                            onSave={(url) => onSaveVideoInline(b, url)}
                            onCancel={onCancelEditVideo}
                          />
                        </div>
                      )}
                      {detailLines.slice(0, 4).map((line, li) => (
                        <p key={li} className="text-[9px] text-white bg-black/35 rounded px-1 py-0.5 leading-snug mt-1">
                          · {line}
                        </p>
                      ))}
                    </div>
                  );
                })}
                <button
                  onClick={() => onAddBehavior(z.id)}
                  className="text-[9px] text-white/85 hover:text-white flex-shrink-0"
                  style={{ textShadow: "0 1px 2px rgba(0,0,0,0.6)" }}
                >
                  + Añadir comportamiento
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default function PosicionesPage() {
  const [contexts, setContexts] = useState<TeamContext[]>([]);
  const [phases, setPhases] = useState<GamePhase[]>([]);
  const [positions, setPositions] = useState<Position[]>([]);
  const [zones, setZones] = useState<FieldZone[]>([]);
  const [behaviors, setBehaviors] = useState<PositionBehavior[]>([]);

  // We still need a selectedContext internally for loading behaviors
  const [selectedContext, setSelectedContext] = useState("");
  const [selectedPosition, setSelectedPosition] = useState("");
  const [selectedPhase, setSelectedPhase] = useState("");
  const [loading, setLoading] = useState(true);

  // Vista: lista por zonas (tabla) o campograma de conceptos
  const [posView, setPosView] = useState<"lista" | "campo">("lista");

  // Status system
  const [statusMap, setStatusMap] = useState<Map<string, ItemStatus>>(new Map());
  const [statusMenu, setStatusMenu] = useState<{ x: number; y: number; posId: string; posName: string } | null>(null);

  // Modal para crear/editar un comportamiento — behaviorId null = uno nuevo
  // en esa zona/fase, behaviorId con valor = editando uno ya existente. Una
  // misma zona/fase puede tener varios comportamientos.
  const [editCell, setEditCell] = useState<{
    zoneId: string;
    phaseId: string;
    behaviorId: string | null;
  } | null>(null);
  const [cellTitle, setCellTitle] = useState("");
  const [cellDetails, setCellDetails] = useState("");
  const [cellYoutubeUrl, setCellYoutubeUrl] = useState<string | null>(null);
  const [modalYtEditing, setModalYtEditing] = useState(false);

  // YouTube state
  const [editingYoutubeCell, setEditingYoutubeCell] = useState<string | null>(null); // id del comportamiento
  const [playingVideoUrl, setPlayingVideoUrl] = useState<string | null>(null);

  useEffect(() => {
    async function loadBase() {
      try {
        const [ctx, ph, pos, zn, statuses] = await Promise.all([
          getTeamContexts(),
          getGamePhases(),
          getPositions(),
          getFieldZones(),
          getItemStatuses("position"),
        ]);
        setContexts(ctx);
        setPhases(ph);
        setPositions(pos);
        setZones(zn);
        setStatusMap(statuses);
        // Auto-select first context (hidden from UI but needed for data)
        if (ctx.length > 0) setSelectedContext(ctx[0].id);
        if (pos.length > 0) setSelectedPosition(pos[0].id);
        const displayPh = ph.filter((p: GamePhase) => p.name !== "ABP");
        if (displayPh.length > 0) setSelectedPhase(displayPh[0].id);
      } catch (err) {
        console.error("Error loading base data:", err);
      } finally {
        setLoading(false);
      }
    }
    loadBase();
  }, []);

  const loadBehaviors = useCallback(async () => {
    if (!selectedPosition || !selectedContext) return;
    try {
      const data = await getPositionBehaviors(selectedPosition, selectedContext);
      setBehaviors(data);
    } catch (err) {
      console.error("Error loading behaviors:", err);
    }
  }, [selectedPosition, selectedContext]);

  useEffect(() => {
    loadBehaviors();
  }, [loadBehaviors]);

  // Todos los comportamientos de una zona/fase, en el orden guardado —
  // una misma zona/fase puede tener varios.
  const getBehaviorsForCell = (zoneId: string, phaseId: string) => {
    return behaviors.filter(
      (b) => b.field_zone_id === zoneId && b.game_phase_id === phaseId
    );
  };

  // Abre el modal para AÑADIR un comportamiento nuevo a una zona — usado
  // tanto desde la tabla como desde el campograma de conceptos.
  const openNewBehaviorEditor = (zoneId: string) => {
    setEditCell({ zoneId, phaseId: selectedPhase, behaviorId: null });
    setCellTitle("");
    setCellDetails("");
    setCellYoutubeUrl(null);
  };

  // Abre el modal para EDITAR un comportamiento ya existente.
  const openExistingBehaviorEditor = (b: PositionBehavior) => {
    setEditCell({ zoneId: b.field_zone_id, phaseId: b.game_phase_id, behaviorId: b.id });
    setCellTitle(b.title);
    setCellDetails(b.details || "");
    setCellYoutubeUrl(b.youtube_url);
  };

  // Guarda solo el vídeo de un comportamiento ya existente, sin pasar por el
  // modal completo — usado por el icono de YouTube en la tabla y el campograma.
  const handleSaveVideoInline = (b: PositionBehavior, url: string | null) => {
    updatePositionBehavior(b.id, b.title, b.details, url).then(() => loadBehaviors());
    setEditingYoutubeCell(null);
  };

  const handleSaveCell = async () => {
    if (!editCell || !cellTitle.trim()) return;
    try {
      if (editCell.behaviorId) {
        await updatePositionBehavior(editCell.behaviorId, cellTitle.trim(), cellDetails.trim(), cellYoutubeUrl);
      } else {
        const nextPosition = getBehaviorsForCell(editCell.zoneId, editCell.phaseId).length;
        await createPositionBehavior(
          selectedPosition,
          editCell.zoneId,
          editCell.phaseId,
          selectedContext,
          cellTitle.trim(),
          cellDetails.trim(),
          cellYoutubeUrl,
          nextPosition
        );
      }
      setEditCell(null);
      setCellTitle("");
      setCellDetails("");
      setCellYoutubeUrl(null);
      setModalYtEditing(false);
      await loadBehaviors();
    } catch (err) {
      console.error("Error saving cell:", err);
    }
  };

  const handleDeleteBehavior = async () => {
    if (!editCell?.behaviorId) return;
    if (!confirm("¿Eliminar este comportamiento?")) return;
    try {
      await deletePositionBehavior(editCell.behaviorId);
      setEditCell(null);
      setCellTitle("");
      setCellDetails("");
      setCellYoutubeUrl(null);
      setModalYtEditing(false);
      await loadBehaviors();
    } catch (err) {
      console.error("Error deleting behavior:", err);
    }
  };

  const handleSetStatus = async (status: ItemStatus) => {
    if (!statusMenu) return;
    try {
      await setItemStatus("position", statusMenu.posId, statusMenu.posName, status);
      setStatusMap((prev) => new Map(prev).set(statusMenu.posId, status));
    } catch (err) {
      console.error("Error setting status:", err);
    }
    setStatusMenu(null);
  };

  const handleRemoveStatus = async () => {
    if (!statusMenu) return;
    try {
      await removeItemStatus("position", statusMenu.posId);
      setStatusMap((prev) => { const m = new Map(prev); m.delete(statusMenu.posId); return m; });
    } catch (err) {
      console.error("Error removing status:", err);
    }
    setStatusMenu(null);
  };

  const activePosition = positions.find((p) => p.id === selectedPosition);
  const displayPhases = phases.filter((p) => p.name !== "ABP");
  const activePhase = displayPhases.find((p) => p.id === selectedPhase);

  // Get ADN for active position
  const currentADN = activePosition ? POSITION_ADN[activePosition.abbreviation] : null;

  // Zone name mapping based on selected phase
  const isOffensivePhase = activePhase
    ? /ofensiva/i.test(activePhase.name) && !/defensiva/i.test(activePhase.name)
    : false;
  const isDefensivePhase = activePhase
    ? /defensiva/i.test(activePhase.name) && !/ofensiva/i.test(activePhase.name)
    : false;

  const getZoneDisplayName = (zoneName: string): string => {
    const z = zoneName.trim().toUpperCase();
    if (isOffensivePhase) {
      if (z === "Z1") return "Inicio";
      if (z === "Z2") return "Creación";
      if (z === "Z3") return "Progresión";
      if (z === "Z4") return "Finalización";
    } else if (isDefensivePhase) {
      if (z === "Z1") return "Protección";
      if (z === "Z2") return "Contención";
      if (z === "Z3") return "Destrucción";
      if (z === "Z4") return "Orientación";
    }
    return "";
  };

  if (loading) {
    return (
      <div className="max-w-7xl flex items-center justify-center h-64">
        <p className="text-foreground-secondary">Cargando posiciones...</p>
      </div>
    );
  }

  return (
    <div className="max-w-7xl">
      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Perfiles de posición</h1>
          <p className="text-muted text-sm mt-1">Define, estructura y consulta los perfiles de rendimiento por posición del campo.</p>
        </div>
      </div>

      <div className="flex gap-6">
        {/* Main content */}
        <div className="flex-1 min-w-0">
          {/* Grid de posiciones — 12 en una sola fila */}
          <div className="mb-6">
            <div className="flex gap-1.5" style={{ minWidth: 0 }}>
              {positions.map((pos) => (
                <button
                  key={pos.id}
                  onClick={() => setSelectedPosition(pos.id)}
                  onContextMenu={(e) => {
                    e.preventDefault();
                    setStatusMenu({ x: e.clientX, y: e.clientY, posId: pos.id, posName: pos.name });
                  }}
                  className={`flex-1 min-w-0 p-2 rounded-lg text-center transition-colors relative ${
                    selectedPosition === pos.id
                      ? "bg-blue-600 text-white"
                      : "bg-surface border border-border text-foreground-secondary hover:border-blue-700"
                  }`}
                >
                  <span className="block text-sm font-bold">{pos.abbreviation}</span>
                  <span className="block text-[8px] mt-0.5 leading-tight opacity-70 truncate">{pos.name}</span>
                  {statusMap.get(pos.id) && (
                    <div className="absolute -top-1 -right-1">
                      <StatusBadge status={statusMap.get(pos.id)!} />
                    </div>
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* Position name header */}
          <h2 className="text-xl font-semibold text-foreground mb-4">
            {activePosition?.name} ({activePosition?.abbreviation})
          </h2>

          {/* Phase tabs + toggle Lista/Campograma */}
          <div className="mb-6 flex items-end justify-between border-b border-border">
            <div className="flex gap-1">
              {displayPhases.map((phase) => (
                <button
                  key={phase.id}
                  onClick={() => setSelectedPhase(phase.id)}
                  className={`px-4 py-2.5 text-sm font-medium transition-colors relative ${
                    selectedPhase === phase.id
                      ? "text-emerald-400"
                      : "text-muted hover:text-foreground-secondary"
                  }`}
                >
                  {phase.name}
                  {selectedPhase === phase.id && (
                    <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-emerald-400 rounded-full" />
                  )}
                </button>
              ))}
            </div>
            <div className="flex gap-1 mb-2 flex-shrink-0">
              <button
                onClick={() => setPosView("lista")}
                className={`px-3 py-1 rounded-lg text-xs font-medium transition-colors ${posView === "lista" ? "bg-surface-hover text-foreground" : "text-muted hover:text-foreground-secondary"}`}
              >
                Lista
              </button>
              <button
                onClick={() => setPosView("campo")}
                className={`px-3 py-1 rounded-lg text-xs font-medium transition-colors ${posView === "campo" ? "bg-surface-hover text-foreground" : "text-muted hover:text-foreground-secondary"}`}
              >
                Campograma
              </button>
            </div>
          </div>

          {posView === "campo" ? (
            /* ===== Campograma de conceptos por zona ===== */
            <div className="bg-surface rounded-xl border border-border p-4">
              <div className="max-w-3xl mx-auto">
                <PositionConceptFieldMap
                  zones={zones}
                  behaviors={behaviors}
                  selectedPhase={selectedPhase}
                  getZoneDisplayName={getZoneDisplayName}
                  accent="#10b981"
                  editingYoutubeCell={editingYoutubeCell}
                  onToggleEditVideo={(behaviorId) => setEditingYoutubeCell(behaviorId)}
                  onSaveVideoInline={handleSaveVideoInline}
                  onCancelEditVideo={() => setEditingYoutubeCell(null)}
                  onEditBehavior={openExistingBehaviorEditor}
                  onAddBehavior={openNewBehaviorEditor}
                />
              </div>
            </div>
          ) : (
          <>
          {/* Behavior matrix for selected phase */}
          <div className="bg-surface rounded-xl border border-border overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border">
                    <th className="p-3 text-left text-muted font-medium w-20">Zona</th>
                    <th className="p-3 text-left text-muted font-medium">Comportamientos clave</th>
                    <th className="p-3 text-left text-muted font-medium">Principios relacionados</th>
                    <th className="p-3 text-left text-muted font-medium">Indicadores</th>
                  </tr>
                </thead>
                <tbody>
                  {zones.map((zone) => {
                    const cellBehaviors = getBehaviorsForCell(zone.id, selectedPhase);
                    return (
                      <tr key={zone.id} className="border-b border-surface-hover last:border-0 align-top">
                        <td className="p-3">
                          <span className="text-[10px] text-muted uppercase tracking-wider font-medium">
                            Zona {zone.name}
                          </span>
                          <p className="text-xs text-foreground-secondary mt-0.5 leading-tight">
                            {getZoneDisplayName(zone.name)}
                          </p>
                        </td>
                        <td className="p-3">
                          <div className="space-y-3">
                            {cellBehaviors.map((b) => {
                              const detailLines = b.details ? b.details.split("\n").filter(Boolean) : [];
                              return (
                                <div key={b.id}>
                                  <ul className="space-y-1">
                                    <li className="text-xs text-foreground-secondary flex items-center gap-1.5">
                                      <span className="text-muted mt-0.5">·</span>
                                      <span className="flex-1">{b.title}</span>
                                      {/* Vídeo — mismo formato que Modelo de juego: primer plano + icono de editar */}
                                      {b.youtube_url && (
                                        <YoutubeThumbnail url={b.youtube_url} onClick={() => setPlayingVideoUrl(b.youtube_url!)} size="md" />
                                      )}
                                      <YoutubeIconButton
                                        hasVideo={!!b.youtube_url}
                                        onClick={() => setEditingYoutubeCell(b.id)}
                                      />
                                    </li>
                                    {editingYoutubeCell === b.id && (
                                      <li onClick={(e) => e.stopPropagation()}>
                                        <YoutubeUrlInput
                                          currentUrl={b.youtube_url}
                                          onSave={(url) => handleSaveVideoInline(b, url)}
                                          onCancel={() => setEditingYoutubeCell(null)}
                                        />
                                      </li>
                                    )}
                                    {detailLines.slice(0, 2).map((line, i) => (
                                      <li key={i} className="text-xs text-foreground-secondary flex items-start gap-1.5">
                                        <span className="text-muted mt-0.5">·</span>
                                        <span className="flex-1">{line}</span>
                                      </li>
                                    ))}
                                  </ul>
                                  <button
                                    onClick={() => openExistingBehaviorEditor(b)}
                                    className="text-emerald-500 text-[11px] mt-1 hover:text-emerald-400"
                                  >
                                    + Ver más
                                  </button>
                                </div>
                              );
                            })}
                            <button
                              onClick={() => openNewBehaviorEditor(zone.id)}
                              className="text-xs text-muted hover:text-emerald-400 transition-colors block"
                            >
                              + Añadir comportamiento
                            </button>
                          </div>
                        </td>
                        <td className="p-3">
                          <p className="text-xs text-muted italic">Sin vincular</p>
                        </td>
                        <td className="p-3">
                          <p className="text-xs text-muted italic">Sin definir</p>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Add custom phase button */}
          <button className="w-full mt-4 py-3 border border-dashed border-border rounded-xl text-sm text-muted hover:border-emerald-500/40 hover:text-emerald-400 transition-colors">
            + Añadir fase personalizada
          </button>
          </>
          )}
        </div>

        {/* Right sidebar */}
        <div className="w-72 flex-shrink-0 space-y-4">
          {/* ADN DE LA POSICIÓN */}
          <div className="bg-surface rounded-xl border border-border p-4">
            <h3 className="text-xs font-semibold text-foreground-secondary uppercase tracking-wide mb-3">
              ADN DE LA POSICIÓN
            </h3>
            {currentADN ? (
              <div className="space-y-4">
                {/* Función */}
                <div>
                  <span className="text-[10px] font-semibold text-emerald-400 uppercase tracking-wider">Función</span>
                  <p className="text-xs text-foreground-secondary mt-1 leading-relaxed">{currentADN.funcion}</p>
                </div>
                {/* Interacciones Clave */}
                <div>
                  <span className="text-[10px] font-semibold text-emerald-400 uppercase tracking-wider">Interacciones Clave</span>
                  <ul className="mt-1 space-y-0.5">
                    {currentADN.interacciones.map((item, i) => (
                      <li key={i} className="text-xs text-foreground-secondary flex items-start gap-1.5">
                        <span className="text-muted mt-0.5">·</span>
                        {item}
                      </li>
                    ))}
                  </ul>
                </div>
                {/* Momentos de Mayor Impacto */}
                <div>
                  <span className="text-[10px] font-semibold text-emerald-400 uppercase tracking-wider">Momentos de Mayor Impacto</span>
                  <ul className="mt-1 space-y-0.5">
                    {currentADN.momentos.map((item, i) => (
                      <li key={i} className="text-xs text-foreground-secondary flex items-start gap-1.5">
                        <span className="text-muted mt-0.5">·</span>
                        {item}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            ) : (
              <p className="text-xs text-muted italic">Sin datos de ADN para esta posición</p>
            )}
          </div>

          {/* Mapa de zonas */}
          <div className="bg-surface rounded-xl border border-border p-4">
            <h3 className="text-xs font-semibold text-foreground-secondary uppercase tracking-wide mb-3">
              Mapa de zonas
            </h3>
            <FieldZoneMap posAbbr={activePosition?.abbreviation ?? "MC"} />
          </div>

          {/* Tareas asociadas */}
          <div className="bg-surface rounded-xl border border-border p-4">
            <h3 className="text-xs font-semibold text-foreground-secondary uppercase tracking-wide mb-3">
              Tareas asociadas
            </h3>
            <p className="text-xs text-muted text-center py-4">
              Sin tareas vinculadas a esta posición
            </p>
            <p className="text-[10px] text-muted text-center">
              Vincula tareas desde la página de tareas
            </p>
          </div>
        </div>
      </div>

      {/* Status context menu */}
      {statusMenu && (
        <StatusMenu
          x={statusMenu.x}
          y={statusMenu.y}
          currentStatus={statusMap.get(statusMenu.posId) ?? null}
          onSelect={handleSetStatus}
          onRemove={handleRemoveStatus}
          onClose={() => setStatusMenu(null)}
        />
      )}

      {/* Modal editar celda */}
      {editCell && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-surface rounded-xl p-6 w-full max-w-md shadow-xl">
            <h3 className="font-semibold text-foreground mb-1">
              {editCell.behaviorId ? "Editar comportamiento" : "Añadir comportamiento"}
            </h3>
            <p className="text-xs text-muted mb-4">
              {activePosition?.name} — {zones.find((z) => z.id === editCell.zoneId)?.name} — {activePhase?.name}
            </p>
            <input
              autoFocus
              value={cellTitle}
              onChange={(e) => setCellTitle(e.target.value)}
              placeholder="Título del comportamiento"
              className="w-full px-3 py-2 bg-surface-hover border border-border rounded-lg text-sm text-foreground mb-2 focus:outline-none focus:ring-2 focus:ring-blue-500/40"
            />
            <textarea
              value={cellDetails}
              onChange={(e) => setCellDetails(e.target.value)}
              placeholder="Detalles (uno por línea)..."
              rows={4}
              className="w-full px-3 py-2 bg-surface-hover border border-border rounded-lg text-sm text-foreground mb-2 focus:outline-none focus:ring-2 focus:ring-blue-500/40 resize-none"
            />
            <div className="mb-4">
              <label className="text-[10px] text-muted uppercase tracking-wide font-medium block mb-1.5">Vídeo de YouTube</label>
              <div className="flex items-center gap-2">
                {cellYoutubeUrl && (
                  <YoutubeThumbnail url={cellYoutubeUrl} onClick={() => setPlayingVideoUrl(cellYoutubeUrl)} size="md" />
                )}
                <YoutubeIconButton hasVideo={!!cellYoutubeUrl} onClick={() => setModalYtEditing(true)} />
                {!cellYoutubeUrl && <span className="text-xs text-muted">Sin vídeo enlazado</span>}
              </div>
              {modalYtEditing && (
                <YoutubeUrlInput
                  currentUrl={cellYoutubeUrl}
                  onSave={(url) => { setCellYoutubeUrl(url); setModalYtEditing(false); }}
                  onCancel={() => setModalYtEditing(false)}
                />
              )}
            </div>
            <div className="flex gap-2 justify-end items-center">
              {editCell.behaviorId && (
                <button
                  onClick={handleDeleteBehavior}
                  className="px-3 py-2 text-red-400 text-sm hover:text-red-300 mr-auto"
                >
                  Eliminar
                </button>
              )}
              <button
                onClick={() => { setEditCell(null); setModalYtEditing(false); }}
                className="px-4 py-2 bg-surface-hover text-foreground-secondary rounded-lg text-sm hover:bg-border"
              >
                Cancelar
              </button>
              <button
                onClick={handleSaveCell}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700"
              >
                Guardar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* YouTube video modal */}
      {playingVideoUrl && (
        <div
          className="fixed inset-0 bg-black/70 flex items-center justify-center z-50"
          onClick={() => setPlayingVideoUrl(null)}
        >
          <div
            className="relative w-full max-w-3xl mx-4"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => setPlayingVideoUrl(null)}
              className="absolute -top-10 right-0 text-white/70 hover:text-white text-sm"
            >
              Cerrar
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
