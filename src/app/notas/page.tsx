"use client";

import { useState, useEffect } from "react";
import { getNotes, createNote, updateNote, deleteNote, setItemStatus, removeItemStatus, getItemStatuses } from "@/lib/api";
import type { ItemStatus } from "@/lib/api";
import type { Note, NoteType } from "@/types";
import { StatusMenu, StatusBadge } from "@/components/ui/StatusMenu";


const NOTE_TYPE_LABELS: Record<NoteType, { label: string; color: string; accent: string; icon: string }> = {
  free: { label: "Libre", color: "bg-cyan-900/50 text-cyan-400", accent: "#22d3ee", icon: "📝" },
  post_session: { label: "Post-sesión", color: "bg-violet-900/50 text-violet-400", accent: "#a78bfa", icon: "🏋️" },
  post_match: { label: "Post-partido", color: "bg-orange-900/50 text-orange-400", accent: "#fb923c", icon: "⚽" },
};

export default function NotasPage() {
  const [notes, setNotes] = useState<Note[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState<NoteType | "all">("all");
  const [sortOrder, setSortOrder] = useState<"desc" | "asc">("desc");
  const [adding, setAdding] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newContent, setNewContent] = useState("");
  const [newType, setNewType] = useState<NoteType>("free");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editContent, setEditContent] = useState("");
  const [editType, setEditType] = useState<NoteType>("free");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [itemStatuses, setItemStatuses] = useState<Map<string, ItemStatus>>(new Map());
  const [statusMenu, setStatusMenu] = useState<{x: number; y: number; id: string; title: string} | null>(null);

  const load = async () => {
    try {
      const data = await getNotes();
      setNotes(data);
    } catch (err) {
      console.error("Error loading notes:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    getItemStatuses("note").then(setItemStatuses).catch(console.error);
  }, []);

  const handleContextMenu = (e: React.MouseEvent, id: string, title: string) => {
    e.preventDefault();
    setStatusMenu({ x: e.clientX, y: e.clientY, id, title });
  };

  const handleSetStatus = async (status: ItemStatus) => {
    if (!statusMenu) return;
    try {
      await setItemStatus("note", statusMenu.id, statusMenu.title, status);
      setItemStatuses(prev => new Map(prev).set(statusMenu.id, status));
    } catch (err) { console.error("Error setting status:", err); }
    setStatusMenu(null);
  };

  const handleRemoveStatus = async () => {
    if (!statusMenu) return;
    try {
      await removeItemStatus("note", statusMenu.id);
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
    if (!newTitle.trim()) return;
    try {
      await createNote(newTitle.trim(), newContent.trim(), newType);
      setNewTitle("");
      setNewContent("");
      setNewType("free");
      setAdding(false);
      await load();
    } catch (err) {
      console.error("Error creating note:", err);
    }
  };

  const handleUpdate = async (id: string) => {
    try {
      await updateNote(id, {
        title: editTitle.trim(),
        content: editContent.trim(),
        note_type: editType,
      });
      setEditingId(null);
      await load();
    } catch (err) {
      console.error("Error updating note:", err);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("¿Eliminar esta nota?")) return;
    try {
      await deleteNote(id);
      await load();
    } catch (err) {
      console.error("Error deleting note:", err);
    }
  };

  const filtered = notes
    .filter((n) => {
      const matchSearch =
        n.title.toLowerCase().includes(search.toLowerCase()) ||
        n.content.toLowerCase().includes(search.toLowerCase());
      const matchType = typeFilter === "all" || n.note_type === typeFilter;
      return matchSearch && matchType;
    })
    .sort((a, b) => {
      const da = new Date(a.created_at).getTime();
      const db = new Date(b.created_at).getTime();
      return sortOrder === "desc" ? db - da : da - db;
    });

  /* ── Sidebar data ── */
  const totalNotes = notes.length;
  const typeCounts = notes.reduce<Record<string, number>>((acc, n) => {
    acc[n.note_type] = (acc[n.note_type] || 0) + 1;
    return acc;
  }, {});
  const typeEntries = Object.entries(typeCounts).sort((a, b) => b[1] - a[1]);
  const favoriteIds = Array.from(itemStatuses.entries()).filter(([, s]) => s === "favorite").map(([id]) => id);
  const recentNotes = [...notes].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()).slice(0, 5);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-gray-400">Cargando notas...</p>
      </div>
    );
  }

  return (
    <div className="flex gap-6">
      {/* ── Main content ── */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold text-gray-200">Notas</h1>
          <button
            onClick={() => setAdding(true)}
            className="px-4 py-2 bg-cyan-600 text-white rounded-lg text-sm font-medium hover:bg-cyan-700 transition-colors"
          >
            + Nueva nota
          </button>
        </div>

        {/* Filter tabs */}
        <div className="flex gap-2 mb-4">
          <button
            onClick={() => setTypeFilter("all")}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
              typeFilter === "all" ? "bg-cyan-600 text-white" : "bg-[#1a1d27] border border-[#2a2d37] text-gray-400 hover:border-cyan-400"
            }`}
          >
            Todas
          </button>
          {(Object.keys(NOTE_TYPE_LABELS) as NoteType[]).map((nt) => {
            const info = NOTE_TYPE_LABELS[nt];
            return (
              <button
                key={nt}
                onClick={() => setTypeFilter(nt)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors flex items-center gap-1.5 ${
                  typeFilter === nt ? info.color + " ring-1 ring-current" : "bg-[#1a1d27] border border-[#2a2d37] text-gray-400 hover:border-cyan-400"
                }`}
              >
                <span>{info.icon}</span>
                {info.label}
              </button>
            );
          })}
        </div>

        {/* Search + sort */}
        <div className="flex gap-3 mb-6">
          <input
            type="text"
            placeholder="Buscar notas..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="flex-1 px-4 py-2 border border-[#2a2d37] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-cyan-300 focus:border-cyan-300 bg-[#22252f]"
          />
          <select
            value={sortOrder}
            onChange={(e) => setSortOrder(e.target.value as "desc" | "asc")}
            className="px-3 py-2 border border-[#2a2d37] rounded-lg text-sm text-gray-400 bg-[#1a1d27]"
          >
            <option value="desc">Más recientes</option>
            <option value="asc">Más antiguas</option>
          </select>
        </div>

        {/* Formulario de creación */}
        {adding && (
          <div className="bg-[#1a1d27] rounded-xl border border-[#2a2d37] p-4 mb-4">
            <div className="flex gap-2 mb-2">
              <input
                autoFocus
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                placeholder="Título de la nota"
                className="flex-1 px-3 py-2 border border-[#2a2d37] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-cyan-300 bg-[#22252f]"
              />
              <select
                value={newType}
                onChange={(e) => setNewType(e.target.value as NoteType)}
                className="px-3 py-2 border border-[#2a2d37] rounded-lg text-sm bg-[#1a1d27]"
              >
                <option value="free">Libre</option>
                <option value="post_session">Post-sesión</option>
                <option value="post_match">Post-partido</option>
              </select>
            </div>
            <textarea
              value={newContent}
              onChange={(e) => setNewContent(e.target.value)}
              placeholder="Contenido de la nota..."
              rows={5}
              className="w-full px-3 py-2 border border-[#2a2d37] rounded-lg text-sm mb-3 focus:outline-none focus:ring-2 focus:ring-cyan-300 resize-none bg-[#22252f]"
            />
            <div className="flex gap-2">
              <button
                onClick={handleCreate}
                className="px-3 py-1.5 bg-cyan-600 text-white rounded text-sm hover:bg-cyan-700"
              >
                Crear
              </button>
              <button
                onClick={() => { setAdding(false); setNewTitle(""); setNewContent(""); }}
                className="px-3 py-1.5 bg-[#22252f] text-gray-400 rounded text-sm hover:bg-[#2a2d37]"
              >
                Cancelar
              </button>
            </div>
          </div>
        )}

        {/* Note cards */}
        {filtered.length === 0 ? (
          <div className="bg-[#1a1d27] rounded-xl border border-[#2a2d37] p-8 text-center text-gray-400">
            <p className="text-lg font-medium mb-2">Sin notas</p>
            <p className="text-sm">
              Crea tu primera nota. Tipos: libre, post-sesión, post-partido.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {filtered.map((note) => {
              const badge = NOTE_TYPE_LABELS[note.note_type];
              const isFavorite = favoriteIds.includes(note.id);
              return editingId === note.id ? (
                <div key={note.id} className="col-span-1 md:col-span-2 bg-[#1a1d27] rounded-xl border border-[#2a2d37] p-4">
                  <div className="flex gap-2 mb-2">
                    <input
                      autoFocus
                      value={editTitle}
                      onChange={(e) => setEditTitle(e.target.value)}
                      className="flex-1 px-3 py-2 border border-[#2a2d37] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-cyan-300 bg-[#22252f]"
                    />
                    <select
                      value={editType}
                      onChange={(e) => setEditType(e.target.value as NoteType)}
                      className="px-3 py-2 border border-[#2a2d37] rounded-lg text-sm bg-[#1a1d27]"
                    >
                      <option value="free">Libre</option>
                      <option value="post_session">Post-sesión</option>
                      <option value="post_match">Post-partido</option>
                    </select>
                  </div>
                  <textarea
                    value={editContent}
                    onChange={(e) => setEditContent(e.target.value)}
                    rows={5}
                    className="w-full px-3 py-2 border border-[#2a2d37] rounded-lg text-sm mb-3 focus:outline-none focus:ring-2 focus:ring-cyan-300 resize-none bg-[#22252f]"
                  />
                  <div className="flex gap-2">
                    <button onClick={() => handleUpdate(note.id)} className="px-3 py-1.5 bg-cyan-600 text-white rounded text-sm">Guardar</button>
                    <button onClick={() => setEditingId(null)} className="px-3 py-1.5 bg-[#22252f] text-gray-400 rounded text-sm">Cancelar</button>
                  </div>
                </div>
              ) : (
                <div
                  key={note.id}
                  className="bg-[#1a1d27] rounded-xl border border-[#2a2d37] overflow-hidden group hover:border-[#353840] transition-colors"
                  onContextMenu={(e) => handleContextMenu(e, note.id, note.title)}
                >
                  {/* Color accent bar */}
                  <div className="h-1" style={{ backgroundColor: badge.accent }} />
                  <div className="p-4">
                    {/* Header */}
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex items-center gap-2 min-w-0 flex-1">
                        <span className="text-lg flex-shrink-0">{badge.icon}</span>
                        <h3
                          className="font-semibold text-gray-200 text-sm cursor-pointer hover:text-cyan-400 truncate"
                          onClick={() => setExpandedId(expandedId === note.id ? null : note.id)}
                        >
                          {note.title}
                        </h3>
                      </div>
                      <div className="flex items-center gap-1 flex-shrink-0">
                        {isFavorite && <span className="text-red-400 text-xs">★</span>}
                        {itemStatuses.has(note.id) && <StatusBadge status={itemStatuses.get(note.id)!} />}
                      </div>
                    </div>

                    {/* Badge + date */}
                    <div className="flex items-center gap-2 mb-2">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium ${badge.color}`}>
                        {badge.label}
                      </span>
                      <span className="text-[10px] text-gray-600">
                        {new Date(note.created_at).toLocaleDateString("es-ES")}
                      </span>
                    </div>

                    {/* Content preview */}
                    {note.content && (
                      <p className={`text-xs text-gray-500 ${expandedId === note.id ? "whitespace-pre-wrap" : "line-clamp-3"}`}>
                        {note.content}
                      </p>
                    )}

                    {/* Actions */}
                    <div className="flex gap-1 mt-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={() => {
                          setEditingId(note.id);
                          setEditTitle(note.title);
                          setEditContent(note.content || "");
                          setEditType(note.note_type);
                        }}
                        className="px-2 py-1 text-xs text-gray-500 hover:text-cyan-400 hover:bg-cyan-900/20 rounded"
                      >
                        Editar
                      </button>
                      <button
                        onClick={() => handleDelete(note.id)}
                        className="px-2 py-1 text-xs text-gray-500 hover:text-red-400 hover:bg-red-900/20 rounded"
                      >
                        Eliminar
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ── Right sidebar ── */}
      <div className="w-72 flex-shrink-0 space-y-4">
        {/* Resumen */}
        <div className="bg-[#1a1d27] rounded-xl border border-[#2a2d37] p-4">
          <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Resumen</h3>
          <div className="grid grid-cols-2 gap-3">
            <div className="text-center">
              <p className="text-2xl font-bold text-gray-200">{totalNotes}</p>
              <p className="text-[10px] text-gray-500 uppercase">Notas</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-gray-200">{favoriteIds.length}</p>
              <p className="text-[10px] text-gray-500 uppercase">Favoritas</p>
            </div>
          </div>
        </div>

        {/* Tipos de nota - donut chart */}
        <div className="bg-[#1a1d27] rounded-xl border border-[#2a2d37] p-4">
          <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Tipos de nota</h3>
          {totalNotes > 0 ? (
            <div className="flex items-center justify-center mb-3">
              <svg viewBox="0 0 120 120" className="w-28 h-28">
                {(() => {
                  const colors: Record<string, string> = { free: "#22d3ee", post_session: "#a78bfa", post_match: "#fb923c" };
                  let startAngle = 0;
                  return typeEntries.map(([type, count]) => {
                    const pct = count / totalNotes;
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
                    return <path key={type} d={path} fill={colors[type] || "#6b7280"} opacity={0.8} />;
                  });
                })()}
                <circle cx="60" cy="60" r="22" fill="#1a1d27" />
                <text x="60" y="57" textAnchor="middle" fill="#d4d4d8" fontSize="14" fontWeight="bold">{totalNotes}</text>
                <text x="60" y="70" textAnchor="middle" fill="#6b7280" fontSize="7">notas</text>
              </svg>
            </div>
          ) : null}
          <div className="space-y-1.5">
            {(Object.keys(NOTE_TYPE_LABELS) as NoteType[]).map((nt) => {
              const info = NOTE_TYPE_LABELS[nt];
              const count = typeCounts[nt] || 0;
              return (
                <div key={nt} className="flex items-center gap-2 text-xs">
                  <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: info.accent }} />
                  <span className="text-gray-400 flex items-center gap-1">
                    <span>{info.icon}</span>
                    {info.label}
                  </span>
                  <span className="text-gray-600 ml-auto">{count}</span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Notas recientes */}
        <div className="bg-[#1a1d27] rounded-xl border border-[#2a2d37] p-4">
          <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Notas recientes</h3>
          {recentNotes.length === 0 ? (
            <p className="text-xs text-gray-600">Sin notas</p>
          ) : (
            <div className="space-y-2">
              {recentNotes.map((n) => {
                const info = NOTE_TYPE_LABELS[n.note_type];
                return (
                  <div key={n.id} className="flex items-center gap-2">
                    <span className="text-sm flex-shrink-0">{info.icon}</span>
                    <div className="min-w-0 flex-1">
                      <p className="text-xs text-gray-300 truncate">{n.title}</p>
                      <p className="text-[10px] text-gray-600">{new Date(n.created_at).toLocaleDateString("es-ES")}</p>
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
