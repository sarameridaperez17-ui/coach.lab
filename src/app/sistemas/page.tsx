"use client";

import { useState, useEffect, useCallback } from "react";
import {
  getGameSystems,
  createGameSystem,
  updateGameSystem,
  deleteGameSystem,
  saveSystemPositions,
  createSystemVariant,
  deleteSystemVariant,
} from "@/lib/api";
import type { GameSystem, GameSystemVariant } from "@/types";

const DEFAULT_POSITIONS = [
  { player_index: 1, label: "PT", x: 50, y: 93 },
  { player_index: 2, label: "LI", x: 20, y: 75 },
  { player_index: 3, label: "CT", x: 40, y: 78 },
  { player_index: 4, label: "CT", x: 60, y: 78 },
  { player_index: 5, label: "LD", x: 80, y: 75 },
  { player_index: 6, label: "MC", x: 35, y: 55 },
  { player_index: 7, label: "MC", x: 50, y: 50 },
  { player_index: 8, label: "MC", x: 65, y: 55 },
  { player_index: 9, label: "EI", x: 15, y: 30 },
  { player_index: 10, label: "DC", x: 50, y: 25 },
  { player_index: 11, label: "ED", x: 85, y: 30 },
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
  const [editingLabel, setEditingLabel] = useState<number | null>(null);
  const [labelInput, setLabelInput] = useState("");

  // Variantes
  const [variantName, setVariantName] = useState("");
  const [addingVariant, setAddingVariant] = useState(false);

  // Crear nuevo
  const [creating, setCreating] = useState(false);

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
  }, [load]);

  // Seleccionar un sistema y cargar sus datos al panel
  const selectSystem = useCallback((sys: GameSystem) => {
    setSelectedId(sys.id);
    setFormName(sys.name);
    setFormDesc(sys.description || "");
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
    const svg = e.currentTarget;
    const rect = svg.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;
    setPlayers((prev) =>
      prev.map((p) =>
        p.player_index === dragging
          ? { ...p, x: Math.max(2, Math.min(98, x)), y: Math.max(2, Math.min(98, y)) }
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

  const handleLabelSave = async (playerIndex: number) => {
    setPlayers((prev) =>
      prev.map((p) =>
        p.player_index === playerIndex ? { ...p, label: labelInput.trim() || p.label } : p
      )
    );
    setEditingLabel(null);
    // Auto-save
    if (selectedId) {
      const updated = players.map((p) =>
        p.player_index === playerIndex ? { ...p, label: labelInput.trim() || p.label } : p
      );
      try {
        await saveSystemPositions(selectedId, updated);
      } catch (err) {
        console.error("Error saving label:", err);
      }
    }
  };

  const selectedSystem = systems.find((s) => s.id === selectedId);
  const selectedVariants: GameSystemVariant[] = selectedSystem?.variants ?? [];

  if (loading) {
    return (
      <div className="max-w-6xl flex items-center justify-center h-64">
        <p className="text-gray-400">Cargando sistemas...</p>
      </div>
    );
  }

  return (
    <div className="max-w-6xl">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-200">Sistemas de juego</h1>
        <button
          onClick={() => {
            setCreating(true);
            setSelectedId(null);
            setFormName("");
            setFormDesc("");
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
            <button
              key={sys.id}
              onClick={() => selectSystem(sys)}
              className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                selectedId === sys.id
                  ? "bg-indigo-600 text-white"
                  : "bg-[#1a1d27] border border-[#2a2d37] text-gray-300 hover:border-indigo-300"
              }`}
            >
              {sys.name}
            </button>
          ))}
        </div>
      )}

      {/* Contenido principal */}
      {(selectedId || creating) ? (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Campograma */}
          <div className="lg:col-span-2">
            <div className="bg-[#1a1d27] rounded-xl border border-[#2a2d37] p-4">
              <h3 className="text-sm font-medium text-gray-500 uppercase tracking-wide mb-3">
                Campograma — arrastra las jugadoras · doble-clic para cambiar etiqueta
              </h3>
              <svg
                viewBox="0 0 100 140"
                className="w-full rounded-lg select-none"
                style={{ background: "#2d8a4e" }}
                onMouseMove={handleMouseMove}
                onMouseUp={handleMouseUp}
                onMouseLeave={handleMouseUp}
              >
                {/* Campo */}
                <rect x="2" y="2" width="96" height="136" rx="1" fill="none" stroke="rgba(255,255,255,0.5)" strokeWidth="0.4" />
                <line x1="2" y1="70" x2="98" y2="70" stroke="rgba(255,255,255,0.5)" strokeWidth="0.3" />
                <circle cx="50" cy="70" r="12" fill="none" stroke="rgba(255,255,255,0.5)" strokeWidth="0.3" />
                <circle cx="50" cy="70" r="0.6" fill="rgba(255,255,255,0.5)" />
                <rect x="18" y="2" width="64" height="22" fill="none" stroke="rgba(255,255,255,0.5)" strokeWidth="0.3" />
                <rect x="30" y="2" width="40" height="8" fill="none" stroke="rgba(255,255,255,0.5)" strokeWidth="0.3" />
                <circle cx="50" cy="16" r="0.5" fill="rgba(255,255,255,0.5)" />
                <rect x="18" y="116" width="64" height="22" fill="none" stroke="rgba(255,255,255,0.5)" strokeWidth="0.3" />
                <rect x="30" y="130" width="40" height="8" fill="none" stroke="rgba(255,255,255,0.5)" strokeWidth="0.3" />
                <circle cx="50" cy="124" r="0.5" fill="rgba(255,255,255,0.5)" />

                {/* Jugadoras */}
                {players.map((player) => {
                  const fieldY = (player.y / 100) * 136 + 2;
                  const fieldX = (player.x / 100) * 96 + 2;
                  return (
                    <g
                      key={player.player_index}
                      onMouseDown={() => handleMouseDown(player.player_index)}
                      onDoubleClick={() => {
                        setEditingLabel(player.player_index);
                        setLabelInput(player.label);
                      }}
                      style={{ cursor: "grab" }}
                    >
                      <circle
                        cx={fieldX}
                        cy={fieldY}
                        r="3.5"
                        fill={dragging === player.player_index ? "#818cf8" : "#4f46e5"}
                        stroke="white"
                        strokeWidth="0.5"
                      />
                      <text
                        x={fieldX}
                        y={fieldY + 1.2}
                        textAnchor="middle"
                        fill="white"
                        fontSize="2.8"
                        fontWeight="bold"
                        style={{ pointerEvents: "none" }}
                      >
                        {player.label}
                      </text>
                    </g>
                  );
                })}
              </svg>

              {/* Editar etiqueta jugadora */}
              {editingLabel !== null && (
                <div className="mt-3 flex items-center gap-2">
                  <span className="text-sm text-gray-500">Jugadora #{editingLabel}:</span>
                  <input
                    autoFocus
                    value={labelInput}
                    onChange={(e) => setLabelInput(e.target.value.toUpperCase().slice(0, 3))}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") handleLabelSave(editingLabel);
                      if (e.key === "Escape") setEditingLabel(null);
                    }}
                    className="w-20 px-2 py-1 border border-[#2a2d37] rounded text-sm text-center uppercase"
                    maxLength={3}
                  />
                  <button
                    onClick={() => handleLabelSave(editingLabel)}
                    className="px-2 py-1 bg-indigo-600 text-white rounded text-xs"
                  >
                    OK
                  </button>
                  <button
                    onClick={() => setEditingLabel(null)}
                    className="px-2 py-1 bg-[#22252f] text-gray-500 rounded text-xs"
                  >
                    Cancelar
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Panel lateral */}
          <div className="space-y-4">
            <div className="bg-[#1a1d27] rounded-xl border border-[#2a2d37] p-5">
              <h3 className="font-semibold text-gray-200 mb-3">
                {creating ? "Nuevo sistema" : "Sistema"}
              </h3>
              <input
                type="text"
                value={formName}
                onChange={(e) => setFormName(e.target.value)}
                placeholder="Ej: 1-4-3-3"
                className="w-full px-3 py-2 border border-[#2a2d37] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300 focus:border-indigo-300 mb-3"
              />
              <h4 className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">
                Descripción
              </h4>
              <textarea
                value={formDesc}
                onChange={(e) => setFormDesc(e.target.value)}
                placeholder="Describe las características principales del sistema..."
                rows={4}
                className="w-full px-3 py-2 border border-[#2a2d37] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300 focus:border-indigo-300 resize-none mb-3"
              />
              <div className="flex gap-2">
                {creating ? (
                  <>
                    <button
                      onClick={handleCreate}
                      className="px-3 py-1.5 bg-indigo-600 text-white rounded text-sm hover:bg-indigo-700"
                    >
                      Crear sistema
                    </button>
                    <button
                      onClick={() => setCreating(false)}
                      className="px-3 py-1.5 bg-[#22252f] text-gray-400 rounded text-sm hover:bg-[#2a2d37]"
                    >
                      Cancelar
                    </button>
                  </>
                ) : (
                  <>
                    <button
                      onClick={handleUpdateInfo}
                      className="px-3 py-1.5 bg-indigo-600 text-white rounded text-sm hover:bg-indigo-700"
                    >
                      Guardar
                    </button>
                    <button
                      onClick={() => selectedId && handleDelete(selectedId)}
                      className="px-3 py-1.5 bg-red-900/20 text-red-400 rounded text-sm hover:bg-red-900/30"
                    >
                      Eliminar
                    </button>
                  </>
                )}
              </div>
            </div>

            {/* Variantes — solo si estamos editando un sistema existente */}
            {selectedId && (
              <div className="bg-[#1a1d27] rounded-xl border border-[#2a2d37] p-5">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-semibold text-gray-200">Variantes</h3>
                  <button
                    onClick={() => setAddingVariant(true)}
                    className="text-sm text-indigo-600 hover:text-indigo-700 font-medium"
                  >
                    + Añadir
                  </button>
                </div>

                {addingVariant && (
                  <div className="mb-3">
                    <input
                      autoFocus
                      value={variantName}
                      onChange={(e) => setVariantName(e.target.value)}
                      placeholder="Nombre de la variante"
                      className="w-full px-3 py-2 border border-[#2a2d37] rounded-lg text-sm mb-2 focus:outline-none focus:ring-2 focus:ring-indigo-300"
                      onKeyDown={(e) => {
                        if (e.key === "Enter") handleAddVariant();
                        if (e.key === "Escape") { setAddingVariant(false); setVariantName(""); }
                      }}
                    />
                    <div className="flex gap-2">
                      <button
                        onClick={handleAddVariant}
                        className="px-2 py-1 bg-indigo-600 text-white rounded text-xs"
                      >
                        Crear
                      </button>
                      <button
                        onClick={() => { setAddingVariant(false); setVariantName(""); }}
                        className="px-2 py-1 bg-[#22252f] text-gray-500 rounded text-xs"
                      >
                        Cancelar
                      </button>
                    </div>
                  </div>
                )}

                {selectedVariants.length === 0 && !addingVariant ? (
                  <div className="border border-dashed border-[#2a2d37] rounded-lg p-4 text-center text-gray-400 text-sm">
                    Sin variantes definidas
                  </div>
                ) : (
                  <div className="space-y-2">
                    {selectedVariants.map((v) => (
                      <div
                        key={v.id}
                        className="flex items-center justify-between px-3 py-2 bg-[#22252f] rounded-lg group"
                      >
                        <span className="text-sm text-gray-300">{v.name}</span>
                        <button
                          onClick={() => handleDeleteVariant(v.id)}
                          className="text-xs text-gray-400 hover:text-red-600 opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          ✕
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className="bg-[#1a1d27] rounded-xl border border-[#2a2d37] p-8 text-center text-gray-400">
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
    </div>
  );
}
