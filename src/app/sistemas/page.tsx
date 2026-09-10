"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import Link from "next/link";
import {
  getGameSystems,
  createGameSystem,
  updateGameSystem,
  deleteGameSystem,
  saveSystemPositions,
  createSystemVariant,
  deleteSystemVariant,
  setItemStatus,
  removeItemStatus,
  getItemStatuses,
  getTasks,
  getBookmarksByStatus,
} from "@/lib/api";
import type { ItemStatus, Bookmark } from "@/lib/api";
import type { GameSystem, GameSystemVariant, Task } from "@/types";
import { StatusMenu, StatusBadge } from "@/components/ui/StatusMenu";
import { Pitch, FIELD, clientToField } from "@/components/pitch";


// Position labels for right-click dropdown
const POSITION_LABELS = [
  "PT", "CT", "CL", "CC", "LT", "MC", "IN", "MP", "Ca", "EX", "DC", "DP",
];

// Coordenadas en metros — sistema maestro del componente <Pitch>
// (x=0 portería propia izda -> x=105 rival dcha, y=0..68).
const DEFAULT_POSITIONS = [
  { player_index: 1, label: "PT", x: 7.4, y: 34 },
  { player_index: 2, label: "LI", x: 26.3, y: 13.6 },
  { player_index: 3, label: "CT", x: 23.1, y: 27.2 },
  { player_index: 4, label: "CT", x: 23.1, y: 40.8 },
  { player_index: 5, label: "LD", x: 26.3, y: 54.4 },
  { player_index: 6, label: "MC", x: 47.3, y: 23.8 },
  { player_index: 7, label: "MC", x: 52.5, y: 34 },
  { player_index: 8, label: "MC", x: 47.3, y: 44.2 },
  { player_index: 9, label: "EI", x: 73.5, y: 10.2 },
  { player_index: 10, label: "DC", x: 78.8, y: 34 },
  { player_index: 11, label: "ED", x: 73.5, y: 57.8 },
];

export default function SistemasPage() {
  const [systems, setSystems] = useState<GameSystem[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  // Campograma state
  const [players, setPlayers] = useState(DEFAULT_POSITIONS);
  const [dragging, setDragging] = useState<number | null>(null);

  // Form state
  const [formName, setFormName] = useState("");
  const [formDesc, setFormDesc] = useState("");
  const [formStrongSpaces, setFormStrongSpaces] = useState("");
  const [formWeakSpaces, setFormWeakSpaces] = useState("");

  // Position label dropdown (right-click on player)
  const [labelDropdown, setLabelDropdown] = useState<{
    playerIndex: number;
    x: number;
    y: number;
  } | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Variantes
  const [variantName, setVariantName] = useState("");
  const [addingVariant, setAddingVariant] = useState(false);

  // Crear nuevo
  const [creating, setCreating] = useState(false);
  const [itemStatuses, setItemStatuses] = useState<Map<string, ItemStatus>>(new Map());
  const [statusMenu, setStatusMenu] = useState<{x: number; y: number; id: string; title: string} | null>(null);

  // Sidebar data
  const [allTasks, setAllTasks] = useState<Task[]>([]);
  const [favTaskIds, setFavTaskIds] = useState<Set<string>>(new Set());

  const load = useCallback(async () => {
    try {
      const data = await getGameSystems();
      setSystems(data);
      return data;
    } catch (err) {
      console.error("Error loading systems:", err);
      return [];
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
    getItemStatuses("system").then(setItemStatuses).catch(console.error);
    getTasks().then(setAllTasks).catch(console.error);
    getBookmarksByStatus("favorite").then((bks: Bookmark[]) => {
      setFavTaskIds(new Set(bks.filter(b => b.item_type === "task").map(b => b.item_id)));
    }).catch(console.error);
  }, [load]);

  // Close dropdown on outside click
  useEffect(() => {
    if (!labelDropdown) return;
    const handleClick = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setLabelDropdown(null);
      }
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [labelDropdown]);

  const handleContextMenu = (e: React.MouseEvent, id: string, title: string) => {
    e.preventDefault();
    setStatusMenu({ x: e.clientX, y: e.clientY, id, title });
  };

  const handleSetStatus = async (status: ItemStatus) => {
    if (!statusMenu) return;
    try {
      await setItemStatus("system", statusMenu.id, statusMenu.title, status);
      setItemStatuses(prev => new Map(prev).set(statusMenu.id, status));
    } catch (err) { console.error("Error setting status:", err); }
    setStatusMenu(null);
  };

  const handleRemoveStatus = async () => {
    if (!statusMenu) return;
    try {
      await removeItemStatus("system", statusMenu.id);
      setItemStatuses(prev => { const next = new Map(prev); next.delete(statusMenu.id); return next; });
    } catch (err) { console.error("Error removing status:", err); }
    setStatusMenu(null);
  };

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("crear") === "1") {
      setCreating(true);
      window.history.replaceState({}, "", window.location.pathname);
    }
  }, []);

  // Seleccionar un sistema y cargar sus datos al panel
  const selectSystem = useCallback((sys: GameSystem) => {
    setSelectedId(sys.id);
    setFormName(sys.name);
    setFormDesc(sys.description || "");
    setFormStrongSpaces(sys.strong_spaces || "");
    setFormWeakSpaces(sys.weak_spaces || "");
    if (sys.positions && sys.positions.length > 0) {
      setPlayers(
        sys.positions
          .sort((a, b) => a.player_index - b.player_index)
          .map((p) => ({
            player_index: p.player_index,
            label: p.label,
            x: p.x,
            y: p.y,
          }))
      );
    } else {
      setPlayers(DEFAULT_POSITIONS);
    }
    setCreating(false);
  }, []);

  // Guardar posiciones automáticamente al soltar drag
  const handleSavePositions = useCallback(async () => {
    if (!selectedId) return;
    try {
      await saveSystemPositions(selectedId, players);
    } catch (err) {
      console.error("Error saving positions:", err);
    }
  }, [selectedId, players]);

  // Drag handlers
  const handleMouseDown = (idx: number) => setDragging(idx);

  const handleMouseMove = (e: React.MouseEvent<SVGSVGElement>) => {
    if (dragging === null) return;
    const { x, y } = clientToField(e.currentTarget, e.clientX, e.clientY);
    setPlayers((prev) =>
      prev.map((p) =>
        p.player_index === dragging
          ? { ...p, x: Math.max(2, Math.min(FIELD.W - 2, x)), y: Math.max(2, Math.min(FIELD.H - 2, y)) }
          : p
      )
    );
  };

  const handleMouseUp = () => {
    if (dragging !== null) {
      setDragging(null);
      handleSavePositions();
    }
  };

  // Right-click on player to change label
  const handlePlayerContextMenu = (e: React.MouseEvent, playerIndex: number) => {
    e.preventDefault();
    e.stopPropagation();
    setLabelDropdown({ playerIndex, x: e.clientX, y: e.clientY });
  };

  const handleLabelSelect = async (playerIndex: number, newLabel: string) => {
    const updated = players.map((p) =>
      p.player_index === playerIndex ? { ...p, label: newLabel } : p
    );
    setPlayers(updated);
    setLabelDropdown(null);
    if (selectedId) {
      try {
        await saveSystemPositions(selectedId, updated);
      } catch (err) {
        console.error("Error saving label:", err);
      }
    }
  };

  // CRUD
  const handleCreate = async () => {
    if (!formName.trim()) return;
    try {
      const sys = await createGameSystem(formName.trim(), formDesc.trim(), players);
      const data = await load();
      const created = data.find((s) => s.id === sys.id);
      if (created) selectSystem(created);
    } catch (err) {
      console.error("Error creating system:", err);
    }
  };

  const handleUpdateInfo = async () => {
    if (!selectedId || !formName.trim()) return;
    try {
      await updateGameSystem(selectedId, {
        name: formName.trim(),
        description: formDesc.trim(),
        strong_spaces: formStrongSpaces.trim(),
        weak_spaces: formWeakSpaces.trim(),
      });
      await load();
    } catch (err) {
      console.error("Error updating system:", err);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("¿Eliminar este sistema?")) return;
    try {
      await deleteGameSystem(id);
      if (selectedId === id) {
        setSelectedId(null);
        setFormName("");
        setFormDesc("");
        setFormStrongSpaces("");
        setFormWeakSpaces("");
        setPlayers(DEFAULT_POSITIONS);
      }
      await load();
    } catch (err) {
      console.error("Error deleting system:", err);
    }
  };

  const handleAddVariant = async () => {
    if (!selectedId || !variantName.trim()) return;
    try {
      await createSystemVariant(selectedId, variantName.trim(), "");
      setVariantName("");
      setAddingVariant(false);
      await load();
    } catch (err) {
      console.error("Error adding variant:", err);
    }
  };

  const handleDeleteVariant = async (varId: string) => {
    try {
      await deleteSystemVariant(varId);
      await load();
    } catch (err) {
      console.error("Error deleting variant:", err);
    }
  };

  const selectedSystem = systems.find((s) => s.id === selectedId);
  const selectedVariants: GameSystemVariant[] = selectedSystem?.variants ?? [];

  const systemFavTasks = allTasks.filter(t => favTaskIds.has(t.id)).slice(0, 5);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-foreground-secondary">Cargando sistemas...</p>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Sistemas de juego</h1>
          <div className="flex items-center gap-4 mt-2 text-sm">
            <span className="text-indigo-400 font-medium border-b-2 border-indigo-400 pb-0.5">Mis sistemas</span>
            <Link href="/sistemas/enfrentar" className="text-muted hover:text-foreground-secondary">Enfrentar sistemas</Link>
          </div>
        </div>
        <button
          onClick={() => {
            setCreating(true);
            setSelectedId(null);
            setFormName("");
            setFormDesc("");
            setFormStrongSpaces("");
            setFormWeakSpaces("");
            setPlayers(DEFAULT_POSITIONS);
          }}
          className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 transition-colors"
        >
          + Nuevo sistema
        </button>
      </div>

      {/* Lista de sistemas */}
      {systems.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-6">
          {systems.map((sys) => (
            <div key={sys.id} className="flex items-center gap-1" onContextMenu={(e) => handleContextMenu(e, sys.id, sys.name)}>
              <button
                onClick={() => selectSystem(sys)}
                className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                  selectedId === sys.id
                    ? "bg-indigo-600 text-white"
                    : "bg-surface border border-border text-foreground-secondary hover:border-indigo-300"
                }`}
              >
                {sys.name}
              </button>
              {itemStatuses.has(sys.id) && <StatusBadge status={itemStatuses.get(sys.id)!} />}
            </div>
          ))}
        </div>
      )}

      {/* Contenido principal */}
      {(selectedId || creating) ? (
        <div className="flex gap-6">
          {/* LEFT: Campograma */}
          <div className="flex-1 min-w-0">
            <div className="bg-surface rounded-xl border border-border p-4">
              <Pitch
                className="rounded-lg"
                onMouseMove={handleMouseMove}
                onMouseUp={handleMouseUp}
                onMouseLeave={handleMouseUp}
              >
                {players.map((player) => (
                  <g
                    key={player.player_index}
                    onMouseDown={() => handleMouseDown(player.player_index)}
                    onContextMenu={(e) => handlePlayerContextMenu(e, player.player_index)}
                    style={{ cursor: dragging === player.player_index ? "grabbing" : "grab" }}
                  >
                    <circle
                      cx={player.x}
                      cy={player.y}
                      r="3"
                      fill={dragging === player.player_index ? "#818cf8" : "#4f46e5"}
                      stroke="white"
                      strokeWidth="0.4"
                    />
                    <text
                      x={player.x}
                      y={player.y + 0.9}
                      textAnchor="middle"
                      fill="white"
                      fontSize="2.4"
                      fontWeight="bold"
                      style={{ pointerEvents: "none" }}
                    >
                      {player.label}
                    </text>
                  </g>
                ))}
              </Pitch>
            </div>
          </div>

          {/* RIGHT: Sidebar */}
          <div className="w-72 flex-shrink-0 space-y-4">
            {/* System info */}
            <div className="bg-surface rounded-xl border border-border overflow-hidden">
              <div className="px-4 py-3 border-b border-surface-hover">
                <h3 className="text-sm font-semibold text-foreground">
                  {creating ? "Nuevo sistema" : "Información del sistema"}
                </h3>
              </div>
              <div className="p-4">
                <label className="text-[10px] text-muted uppercase tracking-wide font-medium block mb-1">Nombre</label>
                <input
                  type="text"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  placeholder="Ej: 1-4-3-3"
                  className="w-full px-3 py-2 border border-border rounded-lg text-sm focus:outline-none focus:border-indigo-400 mb-3"
                />
                <label className="text-[10px] text-muted uppercase tracking-wide font-medium block mb-1">Espacios fuertes</label>
                <textarea
                  value={formStrongSpaces}
                  onChange={(e) => setFormStrongSpaces(e.target.value)}
                  placeholder="Espacios de superioridad del sistema..."
                  rows={2}
                  className="w-full px-3 py-2 border border-border rounded-lg text-sm focus:outline-none focus:border-indigo-400 resize-none mb-3"
                />
                <label className="text-[10px] text-muted uppercase tracking-wide font-medium block mb-1">Espacios débiles</label>
                <textarea
                  value={formWeakSpaces}
                  onChange={(e) => setFormWeakSpaces(e.target.value)}
                  placeholder="Espacios vulnerables del sistema..."
                  rows={2}
                  className="w-full px-3 py-2 border border-border rounded-lg text-sm focus:outline-none focus:border-indigo-400 resize-none mb-3"
                />
                <label className="text-[10px] text-muted uppercase tracking-wide font-medium block mb-1">Descripción</label>
                <textarea
                  value={formDesc}
                  onChange={(e) => setFormDesc(e.target.value)}
                  placeholder="Características principales del sistema..."
                  rows={3}
                  className="w-full px-3 py-2 border border-border rounded-lg text-sm focus:outline-none focus:border-indigo-400 resize-none mb-3"
                />
                <div className="flex gap-2">
                  {creating ? (
                    <>
                      <button onClick={handleCreate} className="px-3 py-1.5 bg-indigo-600 text-white rounded text-xs font-medium hover:bg-indigo-700">Crear sistema</button>
                      <button onClick={() => setCreating(false)} className="text-xs text-foreground-secondary">Cancelar</button>
                    </>
                  ) : (
                    <>
                      <button onClick={handleUpdateInfo} className="px-3 py-1.5 bg-indigo-600 text-white rounded text-xs font-medium hover:bg-indigo-700">Guardar</button>
                      <button onClick={() => selectedId && handleDelete(selectedId)} className="px-3 py-1.5 bg-red-900/20 text-red-400 rounded text-xs hover:bg-red-900/30">Eliminar</button>
                    </>
                  )}
                </div>
              </div>
            </div>

            {/* Variantes */}
            {selectedId && (
              <div className="bg-surface rounded-xl border border-border overflow-hidden">
                <div className="px-4 py-3 border-b border-surface-hover flex items-center justify-between">
                  <h3 className="text-sm font-semibold text-foreground">Variantes</h3>
                  <button
                    onClick={() => setAddingVariant(true)}
                    className="text-xs text-indigo-400 hover:text-indigo-300 font-medium"
                  >
                    + Añadir
                  </button>
                </div>
                <div className="p-3">
                  {addingVariant && (
                    <div className="mb-3">
                      <input
                        autoFocus
                        value={variantName}
                        onChange={(e) => setVariantName(e.target.value)}
                        placeholder="Nombre de la variante"
                        className="w-full px-3 py-1.5 border border-border rounded text-sm mb-2 focus:outline-none focus:border-indigo-400"
                        onKeyDown={(e) => {
                          if (e.key === "Enter") handleAddVariant();
                          if (e.key === "Escape") { setAddingVariant(false); setVariantName(""); }
                        }}
                      />
                      <div className="flex gap-2">
                        <button onClick={handleAddVariant} className="px-2 py-1 bg-indigo-600 text-white rounded text-xs">Crear</button>
                        <button onClick={() => { setAddingVariant(false); setVariantName(""); }} className="text-xs text-foreground-secondary">Cancelar</button>
                      </div>
                    </div>
                  )}
                  {selectedVariants.length === 0 && !addingVariant ? (
                    <p className="text-xs text-muted text-center py-3">Sin variantes definidas</p>
                  ) : (
                    <div className="space-y-1">
                      {selectedVariants.map((v) => (
                        <div key={v.id} className="flex items-center justify-between px-3 py-2 bg-surface-hover rounded-lg group">
                          <span className="text-xs text-foreground-secondary">{v.name}</span>
                          <button
                            onClick={() => handleDeleteVariant(v.id)}
                            className="text-xs text-foreground-secondary hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
                          >
                            ✕
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Tareas asociadas */}
            {selectedId && (
              <div className="bg-surface rounded-xl border border-border overflow-hidden">
                <div className="px-4 py-3 border-b border-surface-hover">
                  <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#f87171" strokeWidth="2" strokeLinecap="round">
                      <path d="M12 2l3.09 6.26L22 9.27l-5 4.87L18.18 21 12 17.27 5.82 21 7 14.14l-5-4.87 6.91-1.01L12 2z" />
                    </svg>
                    Tareas destacadas
                  </h3>
                </div>
                <div className="p-3">
                  {systemFavTasks.length > 0 ? (
                    <div className="space-y-2">
                      {systemFavTasks.map(task => (
                        <div key={task.id} className="bg-surface-hover rounded-lg px-3 py-2">
                          <p className="text-xs font-medium text-foreground-secondary line-clamp-2">{task.name}</p>
                          {task.duration_minutes > 0 && (
                            <p className="text-[10px] text-muted mt-1">{task.duration_minutes} min</p>
                          )}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-3">
                      <p className="text-xs text-muted">Sin tareas favoritas</p>
                      <p className="text-[10px] text-muted mt-1">Marca tareas con ★ para verlas aquí</p>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className="bg-surface rounded-xl border border-border p-8 text-center text-foreground-secondary">
          <p className="text-lg font-medium mb-2">
            {systems.length === 0 ? "Sin sistemas" : "Selecciona un sistema"}
          </p>
          <p className="text-sm">
            {systems.length === 0
              ? "Crea tu primer sistema de juego con el campograma interactivo."
              : "Haz clic en uno de los sistemas de arriba para editarlo."}
          </p>
        </div>
      )}

      {/* Position label dropdown (right-click on player) */}
      {labelDropdown && (
        <div
          ref={dropdownRef}
          className="fixed z-50 bg-surface border border-border rounded-lg shadow-xl py-1 min-w-[120px]"
          style={{
            left: Math.min(labelDropdown.x, window.innerWidth - 140),
            top: Math.min(labelDropdown.y, window.innerHeight - 300),
          }}
        >
          <p className="text-[10px] text-muted uppercase tracking-wide font-medium px-3 py-1.5 border-b border-surface-hover">
            Posición #{labelDropdown.playerIndex}
          </p>
          <div className="max-h-[240px] overflow-y-auto">
            {POSITION_LABELS.map((label) => {
              const current = players.find(p => p.player_index === labelDropdown.playerIndex);
              const isActive = current?.label === label;
              return (
                <button
                  key={label}
                  onClick={() => handleLabelSelect(labelDropdown.playerIndex, label)}
                  className={`w-full text-left px-3 py-1.5 text-xs hover:bg-surface-hover transition-colors flex items-center justify-between ${
                    isActive ? "text-indigo-400 font-semibold" : "text-foreground-secondary"
                  }`}
                >
                  <span>{label}</span>
                  {isActive && <span className="text-indigo-400">✓</span>}
                </button>
              );
            })}
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
