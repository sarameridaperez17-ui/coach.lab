"use client";

import { useState, useEffect } from "react";
import {
  getGlossaryTerms,
  createGlossaryTerm,
  updateGlossaryTerm,
  deleteGlossaryTerm,
  setItemStatus,
  removeItemStatus,
  getItemStatuses,
} from "@/lib/api";
import type { ItemStatus } from "@/lib/api";
import type { GlossaryTerm } from "@/types";
import { StatusMenu, StatusBadge } from "@/components/ui/StatusMenu";

/* ── Term categories (inferred from definition keywords) ── */
const TERM_CATEGORIES: Record<string, { label: string; color: string }> = {
  ofensivo: { label: "Ofensivo", color: "bg-emerald-900/40 text-emerald-400" },
  defensivo: { label: "Defensivo", color: "bg-red-900/40 text-red-400" },
  transición: { label: "Transición", color: "bg-blue-900/40 text-blue-400" },
  posicional: { label: "Posicional", color: "bg-amber-900/40 text-amber-400" },
  general: { label: "General", color: "bg-gray-700/40 text-gray-400" },
};

function inferCategory(term: string, definition: string): string {
  const text = `${term} ${definition}`.toLowerCase();
  if (text.includes("press") || text.includes("defens") || text.includes("recuper") || text.includes("marca") || text.includes("cobertura") || text.includes("repliegue")) return "defensivo";
  if (text.includes("transic") || text.includes("contrataque") || text.includes("contraataque")) return "transición";
  if (text.includes("posicion") || text.includes("espacio") || text.includes("zona") || text.includes("amplitud") || text.includes("profundidad") || text.includes("intervalo")) return "posicional";
  if (text.includes("ataque") || text.includes("ofensiv") || text.includes("finaliz") || text.includes("gol") || text.includes("progres") || text.includes("superioridad") || text.includes("desmarque")) return "ofensivo";
  return "general";
}

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
  const [itemStatuses, setItemStatuses] = useState<Map<string, ItemStatus>>(new Map());
  const [statusMenu, setStatusMenu] = useState<{x: number; y: number; id: string; title: string} | null>(null);

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
    getItemStatuses("glossary").then(setItemStatuses).catch(console.error);
  }, []);

  const handleContextMenu = (e: React.MouseEvent, id: string, title: string) => {
    e.preventDefault();
    setStatusMenu({ x: e.clientX, y: e.clientY, id, title });
  };

  const handleSetStatus = async (status: ItemStatus) => {
    if (!statusMenu) return;
    try {
      await setItemStatus("glossary", statusMenu.id, statusMenu.title, status);
      setItemStatuses(prev => new Map(prev).set(statusMenu.id, status));
    } catch (err) { console.error("Error setting status:", err); }
    setStatusMenu(null);
  };

  const handleRemoveStatus = async () => {
    if (!statusMenu) return;
    try {
      await removeItemStatus("glossary", statusMenu.id);
      setItemStatuses(prev => { const next = new Map(prev); next.delete(statusMenu.id); return next; });
    } catch (err) { console.error("Error removing status:", err); }
    setStatusMenu(null);
  };

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("crear") === "1") {
      setAdding(true);
      window.history.replaceState({}, "", window.location.pathname);
    }
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

  /* ── Sidebar data ── */
  const catCounts = terms.reduce<Record<string, number>>((acc, t) => {
    const cat = inferCategory(t.term, t.definition);
    acc[cat] = (acc[cat] || 0) + 1;
    return acc;
  }, {});
  const catEntries = Object.entries(catCounts).sort((a, b) => b[1] - a[1]);

  // Términos más utilizados (favorites from statuses)
  const favoriteTermIds = Array.from(itemStatuses.entries()).filter(([, s]) => s === "favorite").map(([id]) => id);
  const favoriteTerms = terms.filter(t => favoriteTermIds.includes(t.id));

  // Últimos añadidos
  const recentTerms = [...terms].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()).slice(0, 5);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-gray-400">Cargando diccionario...</p>
      </div>
    );
  }

  return (
    <div className="flex gap-6">
      {/* ── Main content ── */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold text-gray-200">Diccionario táctico</h1>
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
            placeholder="Buscar en el diccionario..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full px-4 py-2 border border-[#2a2d37] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-rose-300 focus:border-rose-300 bg-[#22252f]"
          />
        </div>

        {/* Filtro alfabético */}
        <div className="flex flex-wrap gap-1 mb-6">
          <button
            onClick={() => setLetterFilter(null)}
            className={`w-12 h-7 rounded text-xs font-medium transition-colors ${
              !letterFilter
                ? "bg-rose-600 text-white"
                : "bg-[#1a1d27] border border-[#2a2d37] text-gray-400 hover:border-rose-400"
            }`}
          >
            Todo
          </button>
          {"ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("").map((letter) => (
            <button
              key={letter}
              onClick={() => setLetterFilter(letterFilter === letter ? null : letter)}
              className={`w-7 h-7 rounded text-xs font-medium transition-colors ${
                letterFilter === letter
                  ? "bg-rose-600 text-white"
                  : "bg-[#1a1d27] border border-[#2a2d37] text-gray-400 hover:border-rose-400 hover:text-rose-400"
              }`}
            >
              {letter}
            </button>
          ))}
        </div>

        {/* Formulario de creación */}
        {adding && (
          <div className="bg-[#1a1d27] rounded-xl border border-[#2a2d37] p-4 mb-4">
            <input
              autoFocus
              value={newTerm}
              onChange={(e) => setNewTerm(e.target.value)}
              placeholder="Término (ej: profundidad, amplitud, fijar...)"
              className="w-full px-3 py-2 border border-[#2a2d37] rounded-lg text-sm mb-2 focus:outline-none focus:ring-2 focus:ring-rose-300 bg-[#22252f]"
            />
            <textarea
              value={newDef}
              onChange={(e) => setNewDef(e.target.value)}
              placeholder="Definición..."
              rows={3}
              className="w-full px-3 py-2 border border-[#2a2d37] rounded-lg text-sm mb-3 focus:outline-none focus:ring-2 focus:ring-rose-300 resize-none bg-[#22252f]"
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
                className="px-3 py-1.5 bg-[#22252f] text-gray-400 rounded text-sm hover:bg-[#2a2d37]"
              >
                Cancelar
              </button>
            </div>
          </div>
        )}

        {/* Table */}
        {filtered.length === 0 ? (
          <div className="bg-[#1a1d27] rounded-xl border border-[#2a2d37] p-8 text-center text-gray-400">
            <p className="text-lg font-medium mb-2">Sin términos</p>
            <p className="text-sm">
              Crea tu primer término del diccionario para mantener una terminología consistente.
            </p>
          </div>
        ) : (
          <div className="bg-[#1a1d27] rounded-xl border border-[#2a2d37] overflow-hidden">
            {/* Table header */}
            <div className="grid grid-cols-[1fr_120px_1fr_80px] gap-2 px-4 py-2.5 border-b border-[#2a2d37] text-xs text-gray-500 font-medium uppercase tracking-wider">
              <span>Término</span>
              <span>Categoría</span>
              <span>Descripción breve</span>
              <span className="text-center">Estado</span>
            </div>
            {/* Table rows */}
            <div className="divide-y divide-[#22252f]">
              {filtered.map((t) => {
                const cat = inferCategory(t.term, t.definition);
                const catInfo = TERM_CATEGORIES[cat] || TERM_CATEGORIES.general;
                return editingId === t.id ? (
                  <div key={t.id} className="px-4 py-3">
                    <input
                      autoFocus
                      value={editTerm}
                      onChange={(e) => setEditTerm(e.target.value)}
                      className="w-full px-3 py-2 border border-[#2a2d37] rounded-lg text-sm mb-2 focus:outline-none focus:ring-2 focus:ring-rose-300 bg-[#22252f]"
                    />
                    <textarea
                      value={editDef}
                      onChange={(e) => setEditDef(e.target.value)}
                      rows={3}
                      className="w-full px-3 py-2 border border-[#2a2d37] rounded-lg text-sm mb-3 focus:outline-none focus:ring-2 focus:ring-rose-300 resize-none bg-[#22252f]"
                    />
                    <div className="flex gap-2">
                      <button onClick={() => handleUpdate(t.id)} className="px-3 py-1.5 bg-rose-600 text-white rounded text-sm">Guardar</button>
                      <button onClick={() => setEditingId(null)} className="px-3 py-1.5 bg-[#22252f] text-gray-400 rounded text-sm">Cancelar</button>
                    </div>
                  </div>
                ) : (
                  <div
                    key={t.id}
                    className="grid grid-cols-[1fr_120px_1fr_80px] gap-2 px-4 py-3 items-center hover:bg-[#22252f]/50 transition-colors group cursor-default"
                    onContextMenu={(e) => handleContextMenu(e, t.id, t.term)}
                  >
                    {/* Term name */}
                    <div className="min-w-0">
                      <span className="font-medium text-gray-200 text-sm">{t.term}</span>
                    </div>
                    {/* Category */}
                    <div>
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium ${catInfo.color}`}>{catInfo.label}</span>
                    </div>
                    {/* Short definition */}
                    <div className="min-w-0">
                      <p className="text-xs text-gray-500 truncate">{t.definition || "—"}</p>
                    </div>
                    {/* Status + actions */}
                    <div className="flex items-center justify-center gap-1">
                      {itemStatuses.has(t.id) && <StatusBadge status={itemStatuses.get(t.id)!} />}
                      <div className="flex gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={() => { setEditingId(t.id); setEditTerm(t.term); setEditDef(t.definition || ""); }}
                          className="p-1 text-xs text-gray-500 hover:text-rose-400 rounded"
                          title="Editar"
                        >
                          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>
                        </button>
                        <button
                          onClick={() => handleDelete(t.id)}
                          className="p-1 text-xs text-gray-500 hover:text-red-400 rounded"
                          title="Eliminar"
                        >
                          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* ── Right sidebar ── */}
      <div className="w-72 flex-shrink-0 space-y-4">
        {/* Categorías */}
        <div className="bg-[#1a1d27] rounded-xl border border-[#2a2d37] p-4">
          <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Categorías</h3>
          <div className="space-y-2">
            {catEntries.map(([cat, count]) => {
              const info = TERM_CATEGORIES[cat] || TERM_CATEGORIES.general;
              return (
                <div key={cat} className="flex items-center justify-between">
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium ${info.color}`}>{info.label}</span>
                  <span className="text-xs text-gray-500">{count}</span>
                </div>
              );
            })}
            <div className="pt-2 border-t border-[#22252f] flex items-center justify-between">
              <span className="text-xs text-gray-400 font-medium">Total</span>
              <span className="text-xs text-gray-300 font-semibold">{terms.length}</span>
            </div>
          </div>
        </div>

        {/* Términos más utilizados (favorites) */}
        <div className="bg-[#1a1d27] rounded-xl border border-[#2a2d37] p-4">
          <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Términos destacados</h3>
          {favoriteTerms.length === 0 ? (
            <p className="text-xs text-gray-600">Marca términos como favoritos con clic derecho</p>
          ) : (
            <div className="space-y-2">
              {favoriteTerms.slice(0, 5).map((t) => (
                <div key={t.id} className="flex items-center gap-2">
                  <span className="text-xs text-rose-400">★</span>
                  <span className="text-xs text-gray-300 truncate">{t.term}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Últimos añadidos */}
        <div className="bg-[#1a1d27] rounded-xl border border-[#2a2d37] p-4">
          <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Últimos añadidos</h3>
          {recentTerms.length === 0 ? (
            <p className="text-xs text-gray-600">Sin términos</p>
          ) : (
            <div className="space-y-2">
              {recentTerms.map((t) => {
                const cat = inferCategory(t.term, t.definition);
                const info = TERM_CATEGORIES[cat] || TERM_CATEGORIES.general;
                return (
                  <div key={t.id} className="flex items-center justify-between">
                    <div className="min-w-0 flex-1">
                      <p className="text-xs text-gray-300 truncate">{t.term}</p>
                      <p className="text-[10px] text-gray-600">{new Date(t.created_at).toLocaleDateString("es-ES")}</p>
                    </div>
                    <span className={`px-1.5 py-0.5 rounded text-[9px] font-medium ${info.color} flex-shrink-0`}>{info.label}</span>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

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
