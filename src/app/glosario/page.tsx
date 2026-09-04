"use client";

import { useState, useEffect, useRef } from "react";
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

/* ── Tag definitions ── */
const BEHAVIOR_OPTIONS = [
  "Táctico individual",
  "Táctico relacional",
  "Táctico colectivo",
  "Estratégico",
  "Comunicación",
];

const MOMENT_OPTIONS = [
  "Fase ofensiva",
  "Fase defensiva",
  "Transición defensiva",
  "Transición ofensiva",
];

const BEHAVIOR_COLORS: Record<string, string> = {
  "Táctico individual": "bg-amber-900/40 text-amber-400 border-amber-800/40",
  "Táctico relacional": "bg-blue-900/40 text-blue-400 border-blue-800/40",
  "Táctico colectivo": "bg-emerald-900/40 text-emerald-400 border-emerald-800/40",
  "Estratégico": "bg-purple-900/40 text-purple-400 border-purple-800/40",
  "Comunicación": "bg-pink-900/40 text-pink-400 border-pink-800/40",
};

const MOMENT_COLORS: Record<string, string> = {
  "Fase ofensiva": "bg-emerald-900/40 text-emerald-400 border-emerald-800/40",
  "Fase defensiva": "bg-red-900/40 text-red-400 border-red-800/40",
  "Transición defensiva": "bg-orange-900/40 text-orange-400 border-orange-800/40",
  "Transición ofensiva": "bg-cyan-900/40 text-cyan-400 border-cyan-800/40",
};

function parseTags(csv: string): string[] {
  if (!csv) return [];
  return csv.split(",").map(s => s.trim()).filter(Boolean);
}

function tagsToCSV(tags: string[]): string {
  return tags.join(",");
}

/* ── Multi-select dropdown ── */
function MultiSelect({
  label,
  options,
  selected,
  onChange,
  colorMap,
}: {
  label: string;
  options: string[];
  selected: string[];
  onChange: (tags: string[]) => void;
  colorMap: Record<string, string>;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const toggle = (opt: string) => {
    if (selected.includes(opt)) onChange(selected.filter(s => s !== opt));
    else onChange([...selected, opt]);
  };

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="w-full px-3 py-2 border border-[#2a2d37] rounded-lg text-sm text-left bg-[#22252f] hover:border-[#3a3d47] transition-colors flex items-center justify-between"
      >
        <span className="truncate">
          {selected.length === 0 ? (
            <span className="text-gray-500">{label}</span>
          ) : (
            <span className="text-gray-300">{selected.length} seleccionado{selected.length > 1 ? "s" : ""}</span>
          )}
        </span>
        <svg className={`w-4 h-4 text-gray-500 transition-transform ${open ? "rotate-180" : ""}`} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
      </button>
      {open && (
        <div className="absolute z-50 mt-1 w-full bg-[#1a1d27] border border-[#2a2d37] rounded-lg shadow-xl overflow-hidden">
          {options.map(opt => (
            <button
              key={opt}
              type="button"
              onClick={() => toggle(opt)}
              className={`w-full px-3 py-2 text-sm text-left flex items-center gap-2 transition-colors ${
                selected.includes(opt) ? "bg-[#22252f] text-white" : "text-gray-400 hover:bg-[#22252f]"
              }`}
            >
              <span className={`w-4 h-4 rounded border flex items-center justify-center flex-shrink-0 ${
                selected.includes(opt) ? "bg-rose-600 border-rose-600" : "border-[#3a3d47]"
              }`}>
                {selected.includes(opt) && (
                  <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>
                )}
              </span>
              <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium ${colorMap[opt] || "bg-gray-700/40 text-gray-400"}`}>{opt}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

/* ── Filter dropdown (single select, includes "Todos") ── */
function FilterSelect({
  label,
  options,
  value,
  onChange,
}: {
  label: string;
  options: string[];
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="px-3 py-2 border border-[#2a2d37] rounded-lg text-sm bg-[#22252f] text-gray-300 focus:outline-none focus:ring-2 focus:ring-rose-500/30"
    >
      <option value="">{label}</option>
      {options.map(opt => (
        <option key={opt} value={opt}>{opt}</option>
      ))}
    </select>
  );
}

export default function GlosarioPage() {
  const [terms, setTerms] = useState<GlossaryTerm[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [letterFilter, setLetterFilter] = useState<string | null>(null);
  const [behaviorFilter, setBehaviorFilter] = useState("");
  const [momentFilter, setMomentFilter] = useState("");
  const [adding, setAdding] = useState(false);
  const [newTerm, setNewTerm] = useState("");
  const [newDef, setNewDef] = useState("");
  const [newBehaviorTags, setNewBehaviorTags] = useState<string[]>([]);
  const [newMomentTags, setNewMomentTags] = useState<string[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTerm, setEditTerm] = useState("");
  const [editDef, setEditDef] = useState("");
  const [editBehaviorTags, setEditBehaviorTags] = useState<string[]>([]);
  const [editMomentTags, setEditMomentTags] = useState<string[]>([]);
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
      await createGlossaryTerm(
        newTerm.trim(),
        newDef.trim(),
        tagsToCSV(newBehaviorTags),
        tagsToCSV(newMomentTags)
      );
      setNewTerm("");
      setNewDef("");
      setNewBehaviorTags([]);
      setNewMomentTags([]);
      setAdding(false);
      await load();
    } catch (err) {
      console.error("Error creating term:", err);
    }
  };

  const handleUpdate = async (id: string) => {
    try {
      await updateGlossaryTerm(id, {
        term: editTerm.trim(),
        definition: editDef.trim(),
        behavior_tags: tagsToCSV(editBehaviorTags),
        moment_tags: tagsToCSV(editMomentTags),
      });
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

  /* ── Filtering ── */
  const filtered = terms.filter((t) => {
    const matchSearch =
      t.term.toLowerCase().includes(search.toLowerCase()) ||
      t.definition.toLowerCase().includes(search.toLowerCase());
    const matchLetter = !letterFilter || t.term.toUpperCase().startsWith(letterFilter);
    const matchBehavior = !behaviorFilter || parseTags(t.behavior_tags).includes(behaviorFilter);
    const matchMoment = !momentFilter || parseTags(t.moment_tags).includes(momentFilter);
    return matchSearch && matchLetter && matchBehavior && matchMoment;
  });

  /* ── Sidebar counts ── */
  const behaviorCounts: Record<string, number> = {};
  const momentCounts: Record<string, number> = {};
  terms.forEach(t => {
    parseTags(t.behavior_tags).forEach(tag => {
      behaviorCounts[tag] = (behaviorCounts[tag] || 0) + 1;
    });
    parseTags(t.moment_tags).forEach(tag => {
      momentCounts[tag] = (momentCounts[tag] || 0) + 1;
    });
  });

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

        {/* Búsqueda + filtros */}
        <div className="mb-4 space-y-3">
          <input
            type="text"
            placeholder="Buscar en el diccionario..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full px-4 py-2 border border-[#2a2d37] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-rose-300 focus:border-rose-300 bg-[#22252f]"
          />
          <div className="flex gap-3">
            <FilterSelect
              label="Comportamiento"
              options={BEHAVIOR_OPTIONS}
              value={behaviorFilter}
              onChange={setBehaviorFilter}
            />
            <FilterSelect
              label="Momento"
              options={MOMENT_OPTIONS}
              value={momentFilter}
              onChange={setMomentFilter}
            />
            {(behaviorFilter || momentFilter) && (
              <button
                onClick={() => { setBehaviorFilter(""); setMomentFilter(""); }}
                className="px-3 py-2 text-xs text-gray-400 hover:text-rose-400 transition-colors"
              >
                Limpiar filtros
              </button>
            )}
          </div>
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
            <div className="grid grid-cols-2 gap-3 mb-3">
              <MultiSelect
                label="Comportamiento"
                options={BEHAVIOR_OPTIONS}
                selected={newBehaviorTags}
                onChange={setNewBehaviorTags}
                colorMap={BEHAVIOR_COLORS}
              />
              <MultiSelect
                label="Momento"
                options={MOMENT_OPTIONS}
                selected={newMomentTags}
                onChange={setNewMomentTags}
                colorMap={MOMENT_COLORS}
              />
            </div>
            {/* Preview tags */}
            {(newBehaviorTags.length > 0 || newMomentTags.length > 0) && (
              <div className="flex flex-wrap gap-1 mb-3">
                {newBehaviorTags.map(tag => (
                  <span key={tag} className={`px-2 py-0.5 rounded-full text-[10px] font-medium ${BEHAVIOR_COLORS[tag]}`}>{tag}</span>
                ))}
                {newMomentTags.map(tag => (
                  <span key={tag} className={`px-2 py-0.5 rounded-full text-[10px] font-medium ${MOMENT_COLORS[tag]}`}>{tag}</span>
                ))}
              </div>
            )}
            <div className="flex gap-2">
              <button
                onClick={handleCreate}
                className="px-3 py-1.5 bg-rose-600 text-white rounded text-sm hover:bg-rose-700"
              >
                Crear
              </button>
              <button
                onClick={() => { setAdding(false); setNewTerm(""); setNewDef(""); setNewBehaviorTags([]); setNewMomentTags([]); }}
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
            {/* Table header: NOMBRE + ETIQUETAS + DESCRIPCIÓN + ESTADO */}
            <div className="grid grid-cols-[180px_1fr_1fr_80px] gap-2 px-4 py-2.5 border-b border-[#2a2d37] text-xs text-gray-500 font-medium uppercase tracking-wider">
              <span>Nombre</span>
              <span>Etiquetas</span>
              <span>Descripción</span>
              <span className="text-center">Estado</span>
            </div>
            {/* Table rows */}
            <div className="divide-y divide-[#22252f]">
              {filtered.map((t) => {
                const bTags = parseTags(t.behavior_tags);
                const mTags = parseTags(t.moment_tags);

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
                    <div className="grid grid-cols-2 gap-3 mb-3">
                      <MultiSelect
                        label="Comportamiento"
                        options={BEHAVIOR_OPTIONS}
                        selected={editBehaviorTags}
                        onChange={setEditBehaviorTags}
                        colorMap={BEHAVIOR_COLORS}
                      />
                      <MultiSelect
                        label="Momento"
                        options={MOMENT_OPTIONS}
                        selected={editMomentTags}
                        onChange={setEditMomentTags}
                        colorMap={MOMENT_COLORS}
                      />
                    </div>
                    {(editBehaviorTags.length > 0 || editMomentTags.length > 0) && (
                      <div className="flex flex-wrap gap-1 mb-3">
                        {editBehaviorTags.map(tag => (
                          <span key={tag} className={`px-2 py-0.5 rounded-full text-[10px] font-medium ${BEHAVIOR_COLORS[tag]}`}>{tag}</span>
                        ))}
                        {editMomentTags.map(tag => (
                          <span key={tag} className={`px-2 py-0.5 rounded-full text-[10px] font-medium ${MOMENT_COLORS[tag]}`}>{tag}</span>
                        ))}
                      </div>
                    )}
                    <div className="flex gap-2">
                      <button onClick={() => handleUpdate(t.id)} className="px-3 py-1.5 bg-rose-600 text-white rounded text-sm">Guardar</button>
                      <button onClick={() => setEditingId(null)} className="px-3 py-1.5 bg-[#22252f] text-gray-400 rounded text-sm">Cancelar</button>
                    </div>
                  </div>
                ) : (
                  <div
                    key={t.id}
                    className="grid grid-cols-[180px_1fr_1fr_80px] gap-2 px-4 py-3 items-center hover:bg-[#22252f]/50 transition-colors group cursor-default"
                    onContextMenu={(e) => handleContextMenu(e, t.id, t.term)}
                  >
                    {/* Nombre */}
                    <div className="min-w-0">
                      <span className="font-medium text-gray-200 text-sm">{t.term}</span>
                    </div>
                    {/* Etiquetas */}
                    <div className="flex flex-wrap gap-1 min-w-0">
                      {bTags.map(tag => (
                        <span key={tag} className={`px-2 py-0.5 rounded-full text-[10px] font-medium ${BEHAVIOR_COLORS[tag] || "bg-gray-700/40 text-gray-400"}`}>{tag}</span>
                      ))}
                      {mTags.map(tag => (
                        <span key={tag} className={`px-2 py-0.5 rounded-full text-[10px] font-medium ${MOMENT_COLORS[tag] || "bg-gray-700/40 text-gray-400"}`}>{tag}</span>
                      ))}
                      {bTags.length === 0 && mTags.length === 0 && (
                        <span className="text-[10px] text-gray-600">Sin etiquetas</span>
                      )}
                    </div>
                    {/* Descripción */}
                    <div className="min-w-0">
                      <p className="text-xs text-gray-500 truncate">{t.definition || "—"}</p>
                    </div>
                    {/* Estado (editar/borrar) */}
                    <div className="flex items-center justify-center gap-1">
                      {itemStatuses.has(t.id) && <StatusBadge status={itemStatuses.get(t.id)!} />}
                      <div className="flex gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={() => {
                            setEditingId(t.id);
                            setEditTerm(t.term);
                            setEditDef(t.definition || "");
                            setEditBehaviorTags(parseTags(t.behavior_tags));
                            setEditMomentTags(parseTags(t.moment_tags));
                          }}
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

          {/* Comportamiento */}
          <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-2">Comportamiento</p>
          <div className="space-y-1.5 mb-4">
            {BEHAVIOR_OPTIONS.map(opt => (
              <div key={opt} className="flex items-center justify-between">
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium ${BEHAVIOR_COLORS[opt]}`}>{opt}</span>
                <span className="text-xs text-gray-500 tabular-nums">{behaviorCounts[opt] || 0}</span>
              </div>
            ))}
          </div>

          {/* Momento */}
          <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-2">Momento</p>
          <div className="space-y-1.5">
            {MOMENT_OPTIONS.map(opt => (
              <div key={opt} className="flex items-center justify-between">
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium ${MOMENT_COLORS[opt]}`}>{opt}</span>
                <span className="text-xs text-gray-500 tabular-nums">{momentCounts[opt] || 0}</span>
              </div>
            ))}
          </div>

          <div className="pt-3 mt-3 border-t border-[#22252f] flex items-center justify-between">
            <span className="text-xs text-gray-400 font-medium">Total términos</span>
            <span className="text-xs text-gray-300 font-semibold">{terms.length}</span>
          </div>
        </div>

        {/* Últimos añadidos */}
        <div className="bg-[#1a1d27] rounded-xl border border-[#2a2d37] p-4">
          <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Últimos añadidos</h3>
          {recentTerms.length === 0 ? (
            <p className="text-xs text-gray-600">Sin términos</p>
          ) : (
            <div className="space-y-2">
              {recentTerms.map((t) => {
                const bTags = parseTags(t.behavior_tags);
                const mTags = parseTags(t.moment_tags);
                return (
                  <div key={t.id}>
                    <div className="flex items-center justify-between">
                      <p className="text-xs text-gray-300 truncate">{t.term}</p>
                      <p className="text-[10px] text-gray-600 flex-shrink-0 ml-2">{new Date(t.created_at).toLocaleDateString("es-ES")}</p>
                    </div>
                    {(bTags.length > 0 || mTags.length > 0) && (
                      <div className="flex flex-wrap gap-1 mt-1">
                        {bTags.slice(0, 2).map(tag => (
                          <span key={tag} className={`px-1.5 py-0.5 rounded text-[9px] font-medium ${BEHAVIOR_COLORS[tag]}`}>{tag}</span>
                        ))}
                        {mTags.slice(0, 2).map(tag => (
                          <span key={tag} className={`px-1.5 py-0.5 rounded text-[9px] font-medium ${MOMENT_COLORS[tag]}`}>{tag}</span>
                        ))}
                      </div>
                    )}
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
