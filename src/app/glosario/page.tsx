"use client";

import { useState, useEffect } from "react";
import {
  getGlossaryTerms,
  createGlossaryTerm,
  updateGlossaryTerm,
  deleteGlossaryTerm,
} from "@/lib/api";
import type { GlossaryTerm } from "@/types";

export default function GlosarioPage() {
  const [terms, setTerms] = useState<GlossaryTerm[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [letterFilter, setLetterFilter] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  const [newTerm, setNewTerm] = useState("");
  const [newDef, setNewDef] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTerm, setEditTerm] = useState("");
  const [editDef, setEditDef] = useState("");

  const load = async () => {
    try {
      const data = await getGlossaryTerms();
      setTerms(data);
    } catch (err) {
      console.error("Error loading glossary:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const handleCreate = async () => {
    if (!newTerm.trim()) return;
    try {
      await createGlossaryTerm(newTerm.trim(), newDef.trim());
      setNewTerm("");
      setNewDef("");
      setAdding(false);
      await load();
    } catch (err) {
      console.error("Error creating term:", err);
    }
  };

  const handleUpdate = async (id: string) => {
    try {
      await updateGlossaryTerm(id, { term: editTerm.trim(), definition: editDef.trim() });
      setEditingId(null);
      await load();
    } catch (err) {
      console.error("Error updating term:", err);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("¿Eliminar este término?")) return;
    try {
      await deleteGlossaryTerm(id);
      await load();
    } catch (err) {
      console.error("Error deleting term:", err);
    }
  };

  const filtered = terms.filter((t) => {
    const matchSearch =
      t.term.toLowerCase().includes(search.toLowerCase()) ||
      t.definition.toLowerCase().includes(search.toLowerCase());
    const matchLetter = !letterFilter || t.term.toUpperCase().startsWith(letterFilter);
    return matchSearch && matchLetter;
  });

  // Agrupar por letra inicial
  const grouped = filtered.reduce<Record<string, GlossaryTerm[]>>((acc, t) => {
    const letter = t.term.charAt(0).toUpperCase();
    if (!acc[letter]) acc[letter] = [];
    acc[letter].push(t);
    return acc;
  }, {});
  const sortedLetters = Object.keys(grouped).sort();

  if (loading) {
    return (
      <div className="max-w-5xl flex items-center justify-center h-64">
        <p className="text-gray-400">Cargando glosario...</p>
      </div>
    );
  }

  return (
    <div className="max-w-5xl">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Diccionario táctico</h1>
        <button
          onClick={() => setAdding(true)}
          className="px-4 py-2 bg-rose-600 text-white rounded-lg text-sm font-medium hover:bg-rose-700 transition-colors"
        >
          + Nuevo término
        </button>
      </div>

      {/* Búsqueda */}
      <div className="mb-4">
        <input
          type="text"
          placeholder="Buscar en el glosario..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full px-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-rose-300 focus:border-rose-300"
        />
      </div>

      {/* Filtro alfabético */}
      <div className="flex flex-wrap gap-1 mb-6">
        <button
          onClick={() => setLetterFilter(null)}
          className={`w-12 h-8 rounded text-sm font-medium transition-colors ${
            !letterFilter
              ? "bg-rose-600 text-white"
              : "bg-white border border-gray-200 text-gray-600 hover:border-rose-300"
          }`}
        >
          Todo
        </button>
        {"ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("").map((letter) => (
          <button
            key={letter}
            onClick={() => setLetterFilter(letterFilter === letter ? null : letter)}
            className={`w-8 h-8 rounded text-sm font-medium transition-colors ${
              letterFilter === letter
                ? "bg-rose-600 text-white"
                : "bg-white border border-gray-200 text-gray-600 hover:border-rose-300 hover:text-rose-600"
            }`}
          >
            {letter}
          </button>
        ))}
      </div>

      {/* Formulario de creación */}
      {adding && (
        <div className="bg-white rounded-xl border border-rose-200 p-4 mb-4">
          <input
            autoFocus
            value={newTerm}
            onChange={(e) => setNewTerm(e.target.value)}
            placeholder="Término (ej: profundidad, amplitud, fijar...)"
            className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm mb-2 focus:outline-none focus:ring-2 focus:ring-rose-300"
          />
          <textarea
            value={newDef}
            onChange={(e) => setNewDef(e.target.value)}
            placeholder="Definición..."
            rows={3}
            className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm mb-3 focus:outline-none focus:ring-2 focus:ring-rose-300 resize-none"
          />
          <div className="flex gap-2">
            <button
              onClick={handleCreate}
              className="px-3 py-1.5 bg-rose-600 text-white rounded text-sm hover:bg-rose-700"
            >
              Crear
            </button>
            <button
              onClick={() => { setAdding(false); setNewTerm(""); setNewDef(""); }}
              className="px-3 py-1.5 bg-gray-100 text-gray-600 rounded text-sm hover:bg-gray-200"
            >
              Cancelar
            </button>
          </div>
        </div>
      )}

      {/* Lista agrupada */}
      {filtered.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 p-8 text-center text-gray-400">
          <p className="text-lg font-medium mb-2">Sin términos</p>
          <p className="text-sm">
            Crea tu primer término del glosario para mantener una terminología consistente.
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {sortedLetters.map((letter) => (
            <div key={letter}>
              <h2 className="text-lg font-bold text-rose-600 mb-2 border-b border-gray-100 pb-1">
                {letter}
              </h2>
              <div className="space-y-2">
                {grouped[letter].map((t) => (
                  <div
                    key={t.id}
                    className="bg-white rounded-lg border border-gray-200 p-4 group"
                  >
                    {editingId === t.id ? (
                      <div>
                        <input
                          autoFocus
                          value={editTerm}
                          onChange={(e) => setEditTerm(e.target.value)}
                          className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm mb-2 focus:outline-none focus:ring-2 focus:ring-rose-300"
                        />
                        <textarea
                          value={editDef}
                          onChange={(e) => setEditDef(e.target.value)}
                          rows={3}
                          className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm mb-3 focus:outline-none focus:ring-2 focus:ring-rose-300 resize-none"
                        />
                        <div className="flex gap-2">
                          <button
                            onClick={() => handleUpdate(t.id)}
                            className="px-3 py-1.5 bg-rose-600 text-white rounded text-sm"
                          >
                            Guardar
                          </button>
                          <button
                            onClick={() => setEditingId(null)}
                            className="px-3 py-1.5 bg-gray-100 text-gray-600 rounded text-sm"
                          >
                            Cancelar
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-start justify-between">
                        <div>
                          <span className="font-semibold text-gray-900">{t.term}</span>
                          {t.definition && (
                            <p className="text-sm text-gray-500 mt-1">{t.definition}</p>
                          )}
                        </div>
                        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button
                            onClick={() => {
                              setEditingId(t.id);
                              setEditTerm(t.term);
                              setEditDef(t.definition || "");
                            }}
                            className="px-2 py-1 text-xs text-gray-500 hover:text-rose-600 hover:bg-rose-50 rounded"
                          >
                            Editar
                          </button>
                          <button
                            onClick={() => handleDelete(t.id)}
                            className="px-2 py-1 text-xs text-gray-500 hover:text-red-600 hover:bg-red-50 rounded"
                          >
                            Eliminar
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
