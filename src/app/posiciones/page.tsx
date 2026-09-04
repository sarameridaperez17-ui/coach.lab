"use client";

import { useState, useEffect, useCallback } from "react";
import {
  getTeamContexts,
  getGamePhases,
  getPositions,
  getFieldZones,
  getPositionBehaviors,
  upsertPositionBehavior,
  setItemStatus,
  removeItemStatus,
  getItemStatuses,
} from "@/lib/api";
import type { ItemStatus } from "@/lib/api";
import { StatusMenu, StatusBadge } from "@/components/ui/StatusMenu";
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

// Position coordinates on a vertical field
const POSITION_COORDS: Record<string, { x: number; y: number }> = {
  PT: { x: 50, y: 90 },
  CT: { x: 35, y: 75 },
  CL: { x: 35, y: 75 },
  CC: { x: 50, y: 75 },
  LT: { x: 15, y: 60 },
  Ca: { x: 85, y: 60 },
  EX: { x: 10, y: 40 },
  MC: { x: 40, y: 55 },
  IN: { x: 60, y: 45 },
  MP: { x: 50, y: 35 },
  DC: { x: 40, y: 20 },
  DP: { x: 60, y: 20 },
};

function FieldZoneMap({ posAbbr }: { posAbbr: string }) {
  const coords = POSITION_COORDS[posAbbr] ?? { x: 50, y: 50 };
  return (
    <svg viewBox="0 0 100 130" className="w-full rounded-lg" style={{ maxWidth: 200 }}>
      <rect x="0" y="0" width="100" height="130" rx="4" fill="#1a5c2e" />
      <rect x="5" y="5" width="90" height="120" fill="none" stroke="#2d8a4e" strokeWidth="0.5" />
      <line x1="5" y1="65" x2="95" y2="65" stroke="#2d8a4e" strokeWidth="0.5" />
      <circle cx="50" cy="65" r="12" fill="none" stroke="#2d8a4e" strokeWidth="0.5" />
      <circle cx="50" cy="65" r="1" fill="#2d8a4e" />
      <rect x="20" y="95" width="60" height="30" fill="none" stroke="#2d8a4e" strokeWidth="0.5" />
      <rect x="30" y="110" width="40" height="15" fill="none" stroke="#2d8a4e" strokeWidth="0.5" />
      <rect x="20" y="5" width="60" height="30" fill="none" stroke="#2d8a4e" strokeWidth="0.5" />
      <rect x="30" y="5" width="40" height="15" fill="none" stroke="#2d8a4e" strokeWidth="0.5" />
      <rect x="5" y="87" width="90" height="38" rx="2" fill="#166534" fillOpacity="0.3" stroke="#22c55e" strokeWidth="0.3" strokeDasharray="2" />
      <text x="92" y="108" textAnchor="end" fill="#4ade80" fontSize="5" fontWeight="bold" opacity="0.7">Z1</text>
      <rect x="5" y="43" width="90" height="44" rx="2" fill="#166534" fillOpacity="0.2" stroke="#22c55e" strokeWidth="0.3" strokeDasharray="2" />
      <text x="92" y="67" textAnchor="end" fill="#4ade80" fontSize="5" fontWeight="bold" opacity="0.7">Z2</text>
      <rect x="5" y="5" width="90" height="38" rx="2" fill="#166534" fillOpacity="0.15" stroke="#22c55e" strokeWidth="0.3" strokeDasharray="2" />
      <text x="92" y="26" textAnchor="end" fill="#4ade80" fontSize="5" fontWeight="bold" opacity="0.7">Z3</text>
      <circle cx={coords.x} cy={coords.y} r="6" fill="#3b82f6" stroke="white" strokeWidth="1" />
      <text x={coords.x} y={coords.y + 1.8} textAnchor="middle" fill="white" fontSize="4.5" fontWeight="bold">{posAbbr}</text>
    </svg>
  );
}

// ── YouTube helpers ────────────────────────────────────────────
function extractYoutubeId(url: string): string | null {
  if (!url) return null;
  const m = url.match(
    /(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|shorts\/))([A-Za-z0-9_-]{11})/
  );
  return m ? m[1] : null;
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

  // Status system
  const [statusMap, setStatusMap] = useState<Map<string, ItemStatus>>(new Map());
  const [statusMenu, setStatusMenu] = useState<{ x: number; y: number; posId: string; posName: string } | null>(null);

  // Modal para editar celda
  const [editCell, setEditCell] = useState<{
    zoneId: string;
    phaseId: string;
  } | null>(null);
  const [cellTitle, setCellTitle] = useState("");
  const [cellDetails, setCellDetails] = useState("");

  // YouTube state
  const [editingYoutubeCell, setEditingYoutubeCell] = useState<string | null>(null); // "zoneId__phaseId"
  const [youtubeUrlInput, setYoutubeUrlInput] = useState("");
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

  const getBehaviorForCell = (zoneId: string, phaseId: string) => {
    return behaviors.find(
      (b) => b.field_zone_id === zoneId && b.game_phase_id === phaseId
    );
  };

  const handleSaveCell = async () => {
    if (!editCell || !cellTitle.trim()) return;
    try {
      await upsertPositionBehavior(
        selectedPosition,
        editCell.zoneId,
        editCell.phaseId,
        selectedContext,
        cellTitle.trim(),
        cellDetails.trim()
      );
      setEditCell(null);
      setCellTitle("");
      setCellDetails("");
      await loadBehaviors();
    } catch (err) {
      console.error("Error saving cell:", err);
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
      if (z === "Z2") return "Creación / Progresión";
      if (z === "Z3") return "Finalización";
    } else if (isDefensivePhase) {
      if (z === "Z1") return "Protección";
      if (z === "Z2") return "Destrucción";
      if (z === "Z3") return "Orientación";
    }
    return "";
  };

  if (loading) {
    return (
      <div className="max-w-7xl flex items-center justify-center h-64">
        <p className="text-gray-400">Cargando posiciones...</p>
      </div>
    );
  }

  return (
    <div className="max-w-7xl">
      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-200">Perfiles de posición</h1>
          <p className="text-gray-500 text-sm mt-1">Define, estructura y consulta los perfiles de rendimiento por posición del campo.</p>
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
                      : "bg-[#1a1d27] border border-[#2a2d37] text-gray-300 hover:border-blue-700"
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
          <h2 className="text-xl font-semibold text-gray-200 mb-4">
            {activePosition?.name} ({activePosition?.abbreviation})
          </h2>

          {/* Phase tabs */}
          <div className="mb-6">
            <div className="flex gap-1 border-b border-[#2a2d37]">
              {displayPhases.map((phase) => (
                <button
                  key={phase.id}
                  onClick={() => setSelectedPhase(phase.id)}
                  className={`px-4 py-2.5 text-sm font-medium transition-colors relative ${
                    selectedPhase === phase.id
                      ? "text-emerald-400"
                      : "text-gray-500 hover:text-gray-300"
                  }`}
                >
                  {phase.name}
                  {selectedPhase === phase.id && (
                    <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-emerald-400 rounded-full" />
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* Behavior matrix for selected phase */}
          <div className="bg-[#1a1d27] rounded-xl border border-[#2a2d37] overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-[#2a2d37]">
                    <th className="p-3 text-left text-gray-500 font-medium w-20">Zona</th>
                    <th className="p-3 text-left text-gray-500 font-medium">Comportamientos clave</th>
                    <th className="p-3 text-left text-gray-500 font-medium">Principios relacionados</th>
                    <th className="p-3 text-left text-gray-500 font-medium">Indicadores</th>
                  </tr>
                </thead>
                <tbody>
                  {zones.map((zone) => {
                    const cell = getBehaviorForCell(zone.id, selectedPhase);
                    const details = cell?.details ?? "";
                    const detailLines = details ? details.split("\n").filter(Boolean) : [];
                    const cellKey = `${zone.id}__${selectedPhase}`;
                    return (
                      <tr key={zone.id} className="border-b border-[#22252f] last:border-0 align-top">
                        <td className="p-3">
                          <span className="text-[10px] text-gray-500 uppercase tracking-wider font-medium">
                            Zona {zone.name}
                          </span>
                          <p className="text-xs text-gray-300 mt-0.5 leading-tight">
                            {getZoneDisplayName(zone.name)}
                          </p>
                        </td>
                        <td className="p-3">
                          {cell ? (
                            <div>
                              {/* Behavior lines with YouTube icon inline */}
                              {(() => {
                                const ytMatch = (cell.details || "").match(/__YOUTUBE__=(.*)/);
                                const ytUrl = ytMatch ? ytMatch[1] : null;
                                const hasYt = !!ytUrl && !!extractYoutubeId(ytUrl);
                                // Filter out __YOUTUBE__ lines from display
                                const cleanDetails = detailLines.filter((l) => !l.startsWith("__YOUTUBE__="));
                                return (
                                  <>
                                    <ul className="space-y-1">
                                      <li className="text-xs text-gray-300 flex items-center gap-1.5">
                                        <span className="text-gray-500 mt-0.5">·</span>
                                        <span className="flex-1">{cell.title}</span>
                                        {/* YouTube icon — same as modelo-de-juego */}
                                        {editingYoutubeCell === cellKey ? (
                                          <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                                            <input
                                              autoFocus
                                              value={youtubeUrlInput}
                                              onChange={(e) => setYoutubeUrlInput(e.target.value)}
                                              onKeyDown={(e) => {
                                                if (e.key === "Enter") {
                                                  const val = youtubeUrlInput.trim();
                                                  const newDetails = (cell.details || "").replace(/\n?__YOUTUBE__=.*/, "")
                                                    + (val ? `\n__YOUTUBE__=${val}` : "");
                                                  upsertPositionBehavior(
                                                    selectedPosition, zone.id, selectedPhase, selectedContext,
                                                    cell.title, newDetails.trim()
                                                  ).then(() => loadBehaviors());
                                                  setEditingYoutubeCell(null);
                                                  setYoutubeUrlInput("");
                                                }
                                                if (e.key === "Escape") { setEditingYoutubeCell(null); setYoutubeUrlInput(""); }
                                              }}
                                              placeholder="https://youtube.com/watch?v=..."
                                              className="w-40 px-2 py-1 border border-[#2a2d37] rounded text-xs focus:outline-none focus:border-red-400 bg-[#22252f] text-gray-300"
                                            />
                                          </div>
                                        ) : (
                                          <button
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              if (hasYt) {
                                                setPlayingVideoUrl(ytUrl!);
                                              } else {
                                                setEditingYoutubeCell(cellKey);
                                                setYoutubeUrlInput(ytUrl || "");
                                              }
                                            }}
                                            onContextMenu={(e) => {
                                              if (hasYt) {
                                                e.preventDefault();
                                                e.stopPropagation();
                                                setEditingYoutubeCell(cellKey);
                                                setYoutubeUrlInput(ytUrl || "");
                                              }
                                            }}
                                            className={`flex-shrink-0 p-1 rounded transition-colors ${
                                              hasYt
                                                ? "text-red-400 hover:text-red-300 hover:bg-red-900/20"
                                                : "text-gray-600 hover:text-red-400 hover:bg-red-900/20"
                                            }`}
                                            title={hasYt ? "Ver vídeo (clic derecho para editar)" : "Añadir vídeo"}
                                          >
                                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                              <path d="M22.54 6.42a2.78 2.78 0 0 0-1.94-2C18.88 4 12 4 12 4s-6.88 0-8.6.46a2.78 2.78 0 0 0-1.94 2A29 29 0 0 0 1 11.75a29 29 0 0 0 .46 5.33A2.78 2.78 0 0 0 3.4 19.13C5.12 19.55 12 19.55 12 19.55s6.88 0 8.6-.46a2.78 2.78 0 0 0 1.94-2 29 29 0 0 0 .46-5.25 29 29 0 0 0-.46-5.42z" />
                                              <polygon points="9.75 15.02 15.5 11.75 9.75 8.48 9.75 15.02" />
                                            </svg>
                                          </button>
                                        )}
                                      </li>
                                      {cleanDetails.slice(0, 2).map((line, i) => (
                                        <li key={i} className="text-xs text-gray-300 flex items-start gap-1.5">
                                          <span className="text-gray-500 mt-0.5">·</span>
                                          <span className="flex-1">{line}</span>
                                        </li>
                                      ))}
                                    </ul>
                                    <button
                                      onClick={() => {
                                        setEditCell({ zoneId: zone.id, phaseId: selectedPhase });
                                        setCellTitle(cell.title);
                                        setCellDetails(cell.details || "");
                                      }}
                                      className="text-emerald-500 text-[11px] mt-2 hover:text-emerald-400"
                                    >
                                      + Ver más
                                    </button>
                                  </>
                                );
                              })()}
                            </div>
                          ) : (
                            <button
                              onClick={() => {
                                setEditCell({ zoneId: zone.id, phaseId: selectedPhase });
                                setCellTitle("");
                                setCellDetails("");
                              }}
                              className="text-xs text-gray-500 hover:text-emerald-400 transition-colors"
                            >
                              + Definir comportamiento
                            </button>
                          )}
                        </td>
                        <td className="p-3">
                          <p className="text-xs text-gray-500 italic">Sin vincular</p>
                        </td>
                        <td className="p-3">
                          <p className="text-xs text-gray-500 italic">Sin definir</p>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Add custom phase button */}
          <button className="w-full mt-4 py-3 border border-dashed border-[#2a2d37] rounded-xl text-sm text-gray-500 hover:border-emerald-500/40 hover:text-emerald-400 transition-colors">
            + Añadir fase personalizada
          </button>
        </div>

        {/* Right sidebar */}
        <div className="w-72 flex-shrink-0 space-y-4">
          {/* ADN DE LA POSICIÓN */}
          <div className="bg-[#1a1d27] rounded-xl border border-[#2a2d37] p-4">
            <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">
              ADN DE LA POSICIÓN
            </h3>
            {currentADN ? (
              <div className="space-y-4">
                {/* Función */}
                <div>
                  <span className="text-[10px] font-semibold text-emerald-400 uppercase tracking-wider">Función</span>
                  <p className="text-xs text-gray-300 mt-1 leading-relaxed">{currentADN.funcion}</p>
                </div>
                {/* Interacciones Clave */}
                <div>
                  <span className="text-[10px] font-semibold text-emerald-400 uppercase tracking-wider">Interacciones Clave</span>
                  <ul className="mt-1 space-y-0.5">
                    {currentADN.interacciones.map((item, i) => (
                      <li key={i} className="text-xs text-gray-300 flex items-start gap-1.5">
                        <span className="text-gray-500 mt-0.5">·</span>
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
                      <li key={i} className="text-xs text-gray-300 flex items-start gap-1.5">
                        <span className="text-gray-500 mt-0.5">·</span>
                        {item}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            ) : (
              <p className="text-xs text-gray-500 italic">Sin datos de ADN para esta posición</p>
            )}
          </div>

          {/* Mapa de zonas */}
          <div className="bg-[#1a1d27] rounded-xl border border-[#2a2d37] p-4">
            <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">
              Mapa de zonas
            </h3>
            <FieldZoneMap posAbbr={activePosition?.abbreviation ?? "MC"} />
          </div>

          {/* Tareas asociadas */}
          <div className="bg-[#1a1d27] rounded-xl border border-[#2a2d37] p-4">
            <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">
              Tareas asociadas
            </h3>
            <p className="text-xs text-gray-500 text-center py-4">
              Sin tareas vinculadas a esta posición
            </p>
            <p className="text-[10px] text-gray-600 text-center">
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
          <div className="bg-[#1a1d27] rounded-xl p-6 w-full max-w-md shadow-xl">
            <h3 className="font-semibold text-gray-200 mb-1">
              Definir comportamiento
            </h3>
            <p className="text-xs text-gray-500 mb-4">
              {activePosition?.name} — {zones.find((z) => z.id === editCell.zoneId)?.name} — {activePhase?.name}
            </p>
            <input
              autoFocus
              value={cellTitle}
              onChange={(e) => setCellTitle(e.target.value)}
              placeholder="Título del comportamiento"
              className="w-full px-3 py-2 bg-[#22252f] border border-[#2a2d37] rounded-lg text-sm text-gray-200 mb-2 focus:outline-none focus:ring-2 focus:ring-blue-500/40"
            />
            <textarea
              value={cellDetails}
              onChange={(e) => setCellDetails(e.target.value)}
              placeholder="Detalles (uno por línea)..."
              rows={4}
              className="w-full px-3 py-2 bg-[#22252f] border border-[#2a2d37] rounded-lg text-sm text-gray-200 mb-4 focus:outline-none focus:ring-2 focus:ring-blue-500/40 resize-none"
            />
            <div className="flex gap-2 justify-end">
              <button
                onClick={() => setEditCell(null)}
                className="px-4 py-2 bg-[#22252f] text-gray-400 rounded-lg text-sm hover:bg-[#2a2d37]"
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
