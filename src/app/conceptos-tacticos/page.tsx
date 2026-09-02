"use client";

import { useState, useEffect } from "react";
import {
  getTacticalConcepts,
  createTacticalConcept,
  updateTacticalConcept,
  deleteTacticalConcept,
} from "@/lib/api";
import type { TacticalConcept } from "@/types";

export default function ConceptosTacticosPage() {
  const [concepts, setConcepts] = useState<TacticalConcept[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [adding, setAdding] = useState(false);
  const [newName, setNewName] = useState("");
  const [newDef, setNewDef] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editDef, setEditDef] = useState("");

  const load = async () => {
    try {
      const data = await getTacticalConcepts();
      setConcepts(data);
    } catch (err) {
      console.error("Error loading concepts:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const handleCreate = async () => {
    if (!newName.trim()) return;
    try {
      await createTacticalConcept(newName.trim(), newDef.trim());
      setNewName("");
      setNewDef("");
      setAdding(false);
      await load();
    } catch (err) {
      console.error("Error creating concept:", err);
    }
  };

  const handleUpdate = async (id: string) => {
    try {
      await updateTacticalConcept(id, { name: editName.trim(), definition: editDef.trim() });
      setEditingId(null);
      await load();
    } catch (err) {
      console.error("Error updating concept:", err);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("¿Eliminar este concepto?")) return;
    try {
      await deleteTacticalConcept(id);
      await load();
    } catch (err) {
      console.error("Error deleting concept:", err);
    }
  };

  const filtered = concepts.filter(
    (c) =>
      c.name.toLowerCase().includes(search.toLowerCase()) ||
      c.definition.toLowerCase().includes(search.toLowerCase())
  );

  if (loading) {
    return (
      <div className="max-w-5xl flex items-center justify-center h-64">
        <p className="text-gray-400">Cargando conceptos tácticos...</p>
      </div>
    );
  }

  return (
    <div className="max-w-5xl">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-200">Conceptos tácticos</h1>
        <button
          onClick={() => setAdding(true)}
          className="px-4 py-2 bg-amber-600 text-white rounded-lg text-sm font-medium hover:bg-amber-700 transition-colors"
        >
          + Nuevo concepto
        </button>
      </div>

      {/* Búsqueda */}
      <div className="mb-6">
        <input
          type="text"
          placeholder="Buscar conceptos..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full px-4 py-2 border border-[#2a2d37] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-300 focus:border-amber-300"
        />
      </div>

      {/* Formulario de creación */}
      {adding && (
        <div className="bg-[#1a1d27] rounded-xl border border-[#2a2d37] p-4 mb-4">
          <input
            autoFocus
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder="Nombre del concepto (ej: cuadrado, 3ª mujer...)"
            className="w-full px-3 py-2 border border-[#2a2d37] rounded-lg text-sm mb-2 focus:outline-none focus:ring-2 focus:ring-amber-300"
          />
          <textarea
            value={newDef}
            onChange={(e) => setNewDef(e.target.value)}
            placeholder="Definición..."
            rows={3}
            className="w-full px-3 py-2 border border-[#2a2d37] rounded-lg text-sm mb-3 focus:outline-none focus:ring-2 focus:ring-amber-300 resize-none"
          />
          <div className="flex gap-2">
            <button
              onClick={handleCreate}
              className="px-3 py-1.5 bg-amber-600 text-white rounded text-sm hover:bg-amber-700"
            >
              Crear
            </button>
            <button
              onClick={() => { setAdding(false); setNewName(""); setNewDef(""); }}
              className="px-3 py-1.5 bg-[#22252f] text-gray-400 rounded text-sm hover:bg-[#2a2d37]"
            >
              Cancelar
            </button>
          </div>
        </div>
      )}

      {/* Lista */}
      {filtered.length === 0 ? (
        <div className="bg-[#1a1d27] rounded-xl border border-[#2a2d37] p-8 text-center text-gray-400">
          <p className="text-lg font-medium mb-2">Sin conceptos tácticos</p>
          <p className="text-sm">
            Crea tu primer concepto táctico (cuadrado, giro, 3ª mujer, profundo...)
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((concept) => (
            <div
              key={concept.id}
              className="bg-[#1a1d27] rounded-xl border border-[#2a2d37] p-4 group"
            >
              {editingId === concept.id ? (
                <div>
                  <input
                    autoFocus
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    className="w-full px-3 py-2 border border-[#2a2d37] rounded-lg text-sm mb-2 focus:outline-none focus:ring-2 focus:ring-amber-300"
                  />
                  <textarea
                    value={editDef}
                    onChange={(e) => setEditDef(e.target.value)}
                    rows={3}
                    className="w-full px-3 py-2 border border-[#2a2d37] rounded-lg text-sm mb-3 focus:outline-none focus:ring-2 focus:ring-amber-300 resize-none"
                  />
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleUpdate(concept.id)}
                      className="px-3 py-1.5 bg-amber-600 text-white rounded text-sm hover:bg-amber-700"
                    >
                      Guardar
                    </button>
                    <button
                      onClick={() => setEditingId(null)}
                      className="px-3 py-1.5 bg-[#22252f] text-gray-400 rounded text-sm hover:bg-[#2a2d37]"
                    >
                      Cancelar
                    </button>
                  </div>
                </div>
              ) : (
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <h3 className="font-semibold text-gray-200">{concept.name}</h3>
                    {concept.definition && (
                      <p className="text-sm text-gray-500 mt-1">{concept.definition}</p>
                    )}
                  </div>
                  <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={() => {
                        setEditingId(concept.id);
                        setEditName(concept.name);
                        setEditDef(concept.definition || "");
                      }}
                      className="px-2 py-1 text-xs text-gray-500 hover:text-amber-600 hover:bg-amber-900/20 rounded"
                    >
                      Editar
                    </button>
                    <button
                      onClick={() => handleDelete(concept.id)}
                      className="px-2 py-1 text-xs text-gray-500 hover:text-red-600 hover:bg-red-900/20 rounded"
                    >
                      Eliminar
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
