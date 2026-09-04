"use client";

import { useState, useEffect } from "react";
import {
  getTacticalConcepts,
  createTacticalConcept,
  updateTacticalConcept,
  deleteTacticalConcept,
  setItemStatus,
  removeItemStatus,
  getItemStatuses,
  getBookmarksByStatus,
} from "@/lib/api";
import type { ItemStatus, Bookmark } from "@/lib/api";
import type { TacticalConcept } from "@/types";
import { StatusMenu, StatusBadge } from "@/components/ui/StatusMenu";

/* ── Category icons ── */
const CATEGORY_ICONS: Record<string, string> = {
  ofensivo: "⚔️",
  defensivo: "🛡️",
  transición: "🔄",
  posicional: "📐",
  individual: "👤",
  colectivo: "👥",
  general: "📋",
};

function getCategoryFromName(name: string): string {
  const lower = name.toLowerCase();
  if (lower.includes("press") || lower.includes("defens") || lower.includes("recuper") || lower.includes("cobertura") || lower.includes("bascula")) return "defensivo";
  if (lower.includes("transic")) return "transición";
  if (lower.includes("posicion") || lower.includes("espacio") || lower.includes("amplitud") || lower.includes("profundidad")) return "posicional";
  if (lower.includes("individual") || lower.includes("1v1") || lower.includes("regate") || lower.includes("conducción")) return "individual";
  if (lower.includes("colectiv") || lower.includes("combinac")) return "colectivo";
  if (lower.includes("ataque") || lower.includes("ofensiv") || lower.includes("finaliz") || lower.includes("progres") || lower.includes("superioridad")) return "ofensivo";
  return "general";
}

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
  const [itemStatuses, setItemStatuses] = useState<Map<string, ItemStatus>>(new Map());
  const [statusMenu, setStatusMenu] = useState<{x: number; y: number; id: string; title: string} | null>(null);
  const [favBookmarks, setFavBookmarks] = useState<Bookmark[]>([]);

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
    getItemStatuses("tactical_concept").then(setItemStatuses).catch(console.error);
    getBookmarksByStatus("favorite").then(b => setFavBookmarks(b.filter(bk => bk.item_type === "tactical_concept"))).catch(console.error);
  }, []);

  const handleContextMenu = (e: React.MouseEvent, id: string, title: string) => {
    e.preventDefault();
    setStatusMenu({ x: e.clientX, y: e.clientY, id, title });
  };

  const handleSetStatus = async (status: ItemStatus) => {
    if (!statusMenu) return;
    try {
      await setItemStatus("tactical_concept", statusMenu.id, statusMenu.title, status);
      setItemStatuses(prev => new Map(prev).set(statusMenu.id, status));
    } catch (err) { console.error("Error setting status:", err); }
    setStatusMenu(null);
  };

  const handleRemoveStatus = async () => {
    if (!statusMenu) return;
    try {
      await removeItemStatus("tactical_concept", statusMenu.id);
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

  /* ── Sidebar data ── */
  const categoryMap = concepts.reduce<Record<string, number>>((acc, c) => {
    const cat = getCategoryFromName(c.name);
    acc[cat] = (acc[cat] || 0) + 1;
    return acc;
  }, {});
  const categoryEntries = Object.entries(categoryMap).sort((a, b) => b[1] - a[1]);
  const totalConcepts = concepts.length;

  // Concepto destacado = first favorite concept found
  const highlightedConcept = concepts.find(c => favBookmarks.some(b => b.item_id === c.id)) || (concepts.length > 0 ? concepts[0] : null);

  // Últimos añadidos (by created_at desc)
  const recentConcepts = [...concepts].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()).slice(0, 5);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-gray-400">Cargando conceptos tácticos...</p>
      </div>
    );
  }

  return (
    <div className="flex gap-6">
      {/* ── Main content ── */}
      <div className="flex-1 min-w-0">
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
            className="w-full px-4 py-2 border border-[#2a2d37] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-300 focus:border-amber-300 bg-[#22252f]"
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
              className="w-full px-3 py-2 border border-[#2a2d37] rounded-lg text-sm mb-2 focus:outline-none focus:ring-2 focus:ring-amber-300 bg-[#22252f]"
            />
            <textarea
              value={newDef}
              onChange={(e) => setNewDef(e.target.value)}
              placeholder="Definición..."
              rows={3}
              className="w-full px-3 py-2 border border-[#2a2d37] rounded-lg text-sm mb-3 focus:outline-none focus:ring-2 focus:ring-amber-300 resize-none bg-[#22252f]"
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

        {/* Table */}
        {filtered.length === 0 ? (
          <div className="bg-[#1a1d27] rounded-xl border border-[#2a2d37] p-8 text-center text-gray-400">
            <p className="text-lg font-medium mb-2">Sin conceptos tácticos</p>
            <p className="text-sm">
              Crea tu primer concepto táctico (cuadrado, giro, 3ª mujer, profundo...)
            </p>
          </div>
        ) : (
          <div className="bg-[#1a1d27] rounded-xl border border-[#2a2d37] overflow-hidden">
            {/* Table header */}
            <div className="grid grid-cols-[40px_1fr_180px_80px] gap-2 px-4 py-2.5 border-b border-[#2a2d37] text-xs text-gray-500 font-medium uppercase tracking-wider">
              <span></span>
              <span>Concepto</span>
              <span>Categoría</span>
              <span className="text-center">Estado</span>
            </div>
            {/* Table rows */}
            <div className="divide-y divide-[#22252f]">
              {filtered.map((concept) => {
                const cat = getCategoryFromName(concept.name);
                const icon = CATEGORY_ICONS[cat] || "📋";
                return editingId === concept.id ? (
                  <div key={concept.id} className="px-4 py-3">
                    <input
                      autoFocus
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      className="w-full px-3 py-2 border border-[#2a2d37] rounded-lg text-sm mb-2 focus:outline-none focus:ring-2 focus:ring-amber-300 bg-[#22252f]"
                    />
                    <textarea
                      value={editDef}
                      onChange={(e) => setEditDef(e.target.value)}
                      rows={3}
                      className="w-full px-3 py-2 border border-[#2a2d37] rounded-lg text-sm mb-3 focus:outline-none focus:ring-2 focus:ring-amber-300 resize-none bg-[#22252f]"
                    />
                    <div className="flex gap-2">
                      <button onClick={() => handleUpdate(concept.id)} className="px-3 py-1.5 bg-amber-600 text-white rounded text-sm hover:bg-amber-700">Guardar</button>
                      <button onClick={() => setEditingId(null)} className="px-3 py-1.5 bg-[#22252f] text-gray-400 rounded text-sm hover:bg-[#2a2d37]">Cancelar</button>
                    </div>
                  </div>
                ) : (
                  <div
                    key={concept.id}
                    className="grid grid-cols-[40px_1fr_180px_80px] gap-2 px-4 py-3 items-center hover:bg-[#22252f]/50 transition-colors group cursor-default"
                    onContextMenu={(e) => handleContextMenu(e, concept.id, concept.name)}
                  >
                    {/* Icon */}
                    <div className="flex items-center justify-center text-lg">{icon}</div>
                    {/* Name + definition */}
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-gray-200 text-sm">{concept.name}</span>
                      </div>
                      {concept.definition && (
                        <p className="text-xs text-gray-500 mt-0.5 truncate">{concept.definition}</p>
                      )}
                    </div>
                    {/* Category badge */}
                    <div>
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-amber-900/30 text-amber-400 capitalize">{cat}</span>
                    </div>
                    {/* Status + actions */}
                    <div className="flex items-center justify-center gap-1">
                      {itemStatuses.has(concept.id) && <StatusBadge status={itemStatuses.get(concept.id)!} />}
                      <div className="flex gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={() => { setEditingId(concept.id); setEditName(concept.name); setEditDef(concept.definition || ""); }}
                          className="p-1 text-xs text-gray-500 hover:text-amber-400 rounded"
                          title="Editar"
                        >
                          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>
                        </button>
                        <button
                          onClick={() => handleDelete(concept.id)}
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
        {/* Concepto destacado */}
        {highlightedConcept && (
          <div className="bg-[#1a1d27] rounded-xl border border-[#2a2d37] p-4">
            <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Concepto destacado</h3>
            <div className="flex items-start gap-3">
              <span className="text-2xl">{CATEGORY_ICONS[getCategoryFromName(highlightedConcept.name)] || "📋"}</span>
              <div className="min-w-0">
                <p className="text-sm font-semibold text-gray-200">{highlightedConcept.name}</p>
                {highlightedConcept.definition && (
                  <p className="text-xs text-gray-500 mt-1 line-clamp-3">{highlightedConcept.definition}</p>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Distribución por categorías */}
        <div className="bg-[#1a1d27] rounded-xl border border-[#2a2d37] p-4">
          <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Distribución por categorías</h3>
          {categoryEntries.length === 0 ? (
            <p className="text-xs text-gray-600">Sin datos</p>
          ) : (
            <div className="space-y-2">
              {categoryEntries.map(([cat, count]) => {
                const pct = totalConcepts > 0 ? Math.round((count / totalConcepts) * 100) : 0;
                return (
                  <div key={cat}>
                    <div className="flex items-center justify-between text-xs mb-1">
                      <span className="text-gray-400 capitalize flex items-center gap-1.5">
                        <span>{CATEGORY_ICONS[cat] || "📋"}</span>
                        {cat}
                      </span>
                      <span className="text-gray-500">{count} <span className="text-gray-600">({pct}%)</span></span>
                    </div>
                    <div className="w-full h-1.5 bg-[#22252f] rounded-full overflow-hidden">
                      <div className="h-full bg-amber-600/60 rounded-full" style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Conexiones del modelo */}
        <div className="bg-[#1a1d27] rounded-xl border border-[#2a2d37] p-4">
          <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Conexiones del modelo</h3>
          {totalConcepts > 0 ? (
            <div className="flex items-center justify-center">
              <svg viewBox="0 0 120 120" className="w-28 h-28">
                {(() => {
                  const colors = ["#d97706", "#f59e0b", "#92400e", "#78350f", "#fbbf24", "#b45309", "#fcd34d"];
                  let startAngle = 0;
                  return categoryEntries.map(([cat, count], i) => {
                    const pct = count / totalConcepts;
                    const angle = pct * 360;
                    const endAngle = startAngle + angle;
                    const largeArc = angle > 180 ? 1 : 0;
                    const r = 40;
                    const cx = 60, cy = 60;
                    const x1 = cx + r * Math.cos((Math.PI / 180) * (startAngle - 90));
                    const y1 = cy + r * Math.sin((Math.PI / 180) * (startAngle - 90));
                    const x2 = cx + r * Math.cos((Math.PI / 180) * (endAngle - 90));
                    const y2 = cy + r * Math.sin((Math.PI / 180) * (endAngle - 90));
                    const path = `M ${cx} ${cy} L ${x1} ${y1} A ${r} ${r} 0 ${largeArc} 1 ${x2} ${y2} Z`;
                    startAngle = endAngle;
                    return <path key={cat} d={path} fill={colors[i % colors.length]} opacity={0.8} />;
                  });
                })()}
                <circle cx="60" cy="60" r="22" fill="#1a1d27" />
                <text x="60" y="57" textAnchor="middle" fill="#d4d4d8" fontSize="14" fontWeight="bold">{totalConcepts}</text>
                <text x="60" y="70" textAnchor="middle" fill="#6b7280" fontSize="7">conceptos</text>
              </svg>
            </div>
          ) : (
            <p className="text-xs text-gray-600 text-center">Sin datos</p>
          )}
          <div className="mt-3 space-y-1">
            {categoryEntries.slice(0, 4).map(([cat, count], i) => {
              const colors = ["#d97706", "#f59e0b", "#92400e", "#78350f"];
              return (
                <div key={cat} className="flex items-center gap-2 text-xs">
                  <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: colors[i % colors.length] }} />
                  <span className="text-gray-400 capitalize">{cat}</span>
                  <span className="text-gray-600 ml-auto">{count}</span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Últimos añadidos */}
        <div className="bg-[#1a1d27] rounded-xl border border-[#2a2d37] p-4">
          <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Últimos añadidos</h3>
          {recentConcepts.length === 0 ? (
            <p className="text-xs text-gray-600">Sin conceptos</p>
          ) : (
            <div className="space-y-2">
              {recentConcepts.map((c) => (
                <div key={c.id} className="flex items-center gap-2">
                  <span className="text-sm">{CATEGORY_ICONS[getCategoryFromName(c.name)] || "📋"}</span>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs text-gray-300 truncate">{c.name}</p>
                    <p className="text-[10px] text-gray-600">{new Date(c.created_at).toLocaleDateString("es-ES")}</p>
                  </div>
                </div>
              ))}
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
