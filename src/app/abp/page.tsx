"use client";

import { useState, useEffect, useCallback } from "react";
import {
  getABPStrategies,
  createABPStrategy,
  updateABPStrategy,
  deleteABPStrategy,
} from "@/lib/api";
import type { ABPStrategy, ABPType } from "@/types";

const ABP_TYPES: { id: ABPType; name: string }[] = [
  { id: "offensive", name: "ABP Ofensivo" },
  { id: "defensive", name: "ABP Defensivo" },
];

const ABP_SUBTYPES: Record<string, { id: string; name: string }[]> = {
  offensive: [
    { id: "falta-indirecta-area", name: "Falta indirecta dentro de área" },
    { id: "falta-profunda", name: "Falta profunda" },
    { id: "falta-lateral", name: "Falta lateral" },
    { id: "falta-alejada", name: "Falta alejada" },
    { id: "falta-frontal-directa", name: "Falta frontal directa" },
    { id: "falta-frontal-alejada", name: "Falta frontal alejada" },
    { id: "corner", name: "Córner" },
    { id: "saque-banda", name: "Saque de banda" },
    { id: "saque-centro", name: "Saque de centro" },
  ],
  defensive: [
    { id: "falta-indirecta-area-def", name: "Falta indirecta dentro de área" },
    { id: "falta-profunda-def", name: "Falta profunda" },
    { id: "falta-lateral-def", name: "Falta lateral" },
    { id: "falta-alejada-def", name: "Falta alejada" },
    { id: "falta-frontal-directa-def", name: "Falta frontal directa" },
    { id: "falta-frontal-alejada-def", name: "Falta frontal alejada" },
    { id: "corner-def", name: "Córner" },
    { id: "saque-banda-def", name: "Saque de banda" },
    { id: "saque-centro-def", name: "Saque de centro" },
  ],
};

export default function ABPPage() {
  const [selectedType, setSelectedType] = useState<ABPType>("offensive");
  const [strategies, setStrategies] = useState<ABPStrategy[]>([]);
  const [loading, setLoading] = useState(true);

  // Modal state
  const [modalSubtype, setModalSubtype] = useState<string | null>(null);
  const [modalSubtypeName, setModalSubtypeName] = useState("");
  const [editingStrategy, setEditingStrategy] = useState<ABPStrategy | null>(null);

  // Form
  const [formTitle, setFormTitle] = useState("");
  const [formDesc, setFormDesc] = useState("");
  const [formKeyPoints, setFormKeyPoints] = useState("");

  const load = useCallback(async () => {
    try {
      const data = await getABPStrategies(selectedType);
      setStrategies(data);
    } catch (err) {
      console.error("Error loading ABP strategies:", err);
    } finally {
      setLoading(false);
    }
  }, [selectedType]);

  useEffect(() => {
    setLoading(true);
    load();
  }, [load]);

  const getStrategiesForSubtype = (subtypeId: string) =>
    strategies.filter((s) => s.subtype === subtypeId);

  const openModal = (subtypeId: string, subtypeName: string, strategy?: ABPStrategy) => {
    setModalSubtype(subtypeId);
    setModalSubtypeName(subtypeName);
    if (strategy) {
      setEditingStrategy(strategy);
      setFormTitle(strategy.title);
      setFormDesc(strategy.description || "");
      setFormKeyPoints(strategy.key_points || "");
    } else {
      setEditingStrategy(null);
      setFormTitle("");
      setFormDesc("");
      setFormKeyPoints("");
    }
  };

  const closeModal = () => {
    setModalSubtype(null);
    setEditingStrategy(null);
    setFormTitle("");
    setFormDesc("");
    setFormKeyPoints("");
  };

  const handleCreate = async () => {
    if (!modalSubtype || !formTitle.trim()) return;
    try {
      await createABPStrategy({
        abp_type: selectedType,
        subtype: modalSubtype,
        title: formTitle.trim(),
        description: formDesc.trim(),
        key_points: formKeyPoints.trim(),
      });
      closeModal();
      await load();
    } catch (err) {
      console.error("Error creating strategy:", err);
    }
  };

  const handleUpdate = async () => {
    if (!editingStrategy || !formTitle.trim()) return;
    try {
      await updateABPStrategy(editingStrategy.id, {
        title: formTitle.trim(),
        description: formDesc.trim(),
        key_points: formKeyPoints.trim(),
      });
      closeModal();
      await load();
    } catch (err) {
      console.error("Error updating strategy:", err);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("¿Eliminar esta estrategia?")) return;
    try {
      await deleteABPStrategy(id);
      await load();
    } catch (err) {
      console.error("Error deleting strategy:", err);
    }
  };

  if (loading) {
    return (
      <div className="max-w-6xl flex items-center justify-center h-64">
        <p className="text-gray-400">Cargando ABP...</p>
      </div>
    );
  }

  return (
    <div className="max-w-6xl">
      <h1 className="text-2xl font-bold text-gray-200 mb-6">Acciones a balón parado</h1>

      {/* Tipo ABP */}
      <div className="mb-6">
        <div className="flex border-b border-[#2a2d37]">
          {ABP_TYPES.map((type) => (
            <button
              key={type.id}
              onClick={() => setSelectedType(type.id)}
              className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
                selectedType === type.id
                  ? "border-orange-600 text-orange-400"
                  : "border-transparent text-gray-500 hover:text-gray-300"
              }`}
            >
              {type.name}
            </button>
          ))}
        </div>
      </div>

      {/* Subtipos */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {ABP_SUBTYPES[selectedType].map((subtype) => {
          const subtypeStrategies = getStrategiesForSubtype(subtype.id);
          return (
            <div
              key={subtype.id}
              className="bg-[#1a1d27] rounded-xl border border-[#2a2d37] p-5"
            >
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-semibold text-gray-200 text-sm">{subtype.name}</h3>
                <span className="text-xs text-gray-400">
                  {subtypeStrategies.length} {subtypeStrategies.length === 1 ? "estrategia" : "estrategias"}
                </span>
              </div>

              {/* Lista de estrategias existentes */}
              {subtypeStrategies.length > 0 && (
                <div className="space-y-2 mb-3">
                  {subtypeStrategies.map((strat) => (
                    <div
                      key={strat.id}
                      className="p-2 bg-orange-900/20 border border-orange-800/30 rounded-lg group cursor-pointer hover:border-orange-700 transition-colors"
                      onClick={() => openModal(subtype.id, subtype.name, strat)}
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-medium text-orange-300">{strat.title}</span>
                        <button
                          onClick={(e) => { e.stopPropagation(); handleDelete(strat.id); }}
                          className="text-[10px] text-gray-400 hover:text-red-600 opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          ✕
                        </button>
                      </div>
                      {strat.description && (
                        <p className="text-[10px] text-orange-400 mt-0.5 truncate">{strat.description}</p>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {/* Botón definir estrategia */}
              <button
                onClick={() => openModal(subtype.id, subtype.name)}
                className="w-full border border-dashed border-[#2a2d37] rounded-lg py-3 flex items-center justify-center hover:border-orange-700 hover:bg-orange-900/20 transition-colors"
              >
                <span className="text-sm text-gray-400">+ Definir estrategia</span>
              </button>
            </div>
          );
        })}
      </div>

      {/* Modal */}
      {modalSubtype && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-[#1a1d27] rounded-xl p-6 w-full max-w-lg shadow-xl">
            <h3 className="font-semibold text-gray-200 mb-1">
              {editingStrategy ? "Editar estrategia" : "Nueva estrategia"}
            </h3>
            <p className="text-sm text-gray-500 mb-4">
              {modalSubtypeName} · {selectedType === "offensive" ? "Ofensivo" : "Defensivo"}
            </p>

            <input
              autoFocus
              value={formTitle}
              onChange={(e) => setFormTitle(e.target.value)}
              placeholder="Título (ej: Córner al primer palo)"
              className="w-full px-3 py-2 border border-[#2a2d37] rounded-lg text-sm mb-2 focus:outline-none focus:ring-2 focus:ring-orange-300"
            />
            <textarea
              value={formDesc}
              onChange={(e) => setFormDesc(e.target.value)}
              placeholder="Descripción de la estrategia..."
              rows={3}
              className="w-full px-3 py-2 border border-[#2a2d37] rounded-lg text-sm mb-2 focus:outline-none focus:ring-2 focus:ring-orange-300 resize-none"
            />
            <textarea
              value={formKeyPoints}
              onChange={(e) => setFormKeyPoints(e.target.value)}
              placeholder="Puntos clave (uno por línea)..."
              rows={4}
              className="w-full px-3 py-2 border border-[#2a2d37] rounded-lg text-sm mb-4 focus:outline-none focus:ring-2 focus:ring-orange-300 resize-none"
            />

            <div className="flex gap-2 justify-end">
              <button
                onClick={closeModal}
                className="px-4 py-2 bg-[#22252f] text-gray-400 rounded-lg text-sm hover:bg-[#2a2d37]"
              >
                Cancelar
              </button>
              <button
                onClick={editingStrategy ? handleUpdate : handleCreate}
                className="px-4 py-2 bg-orange-600 text-white rounded-lg text-sm hover:bg-orange-700"
              >
                {editingStrategy ? "Guardar" : "Crear"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
