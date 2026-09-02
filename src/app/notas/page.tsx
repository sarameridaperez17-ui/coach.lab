"use client";

import { useState, useEffect } from "react";
import { getNotes, createNote, updateNote, deleteNote, toggleBookmark, getBookmarkedIds } from "@/lib/api";
import type { Note, NoteType } from "@/types";


const NOTE_TYPE_LABELS: Record<NoteType, { label: string; color: string }> = {
  free: { label: "Libre", color: "bg-cyan-900/50 text-cyan-400" },
  post_session: { label: "Post-sesión", color: "bg-violet-900/50 text-violet-400" },
  post_match: { label: "Post-partido", color: "bg-orange-900/50 text-orange-400" },
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
  const [bookmarkedIds, setBookmarkedIds] = useState<Set<string>>(new Set());

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
    getBookmarkedIds("note").then(setBookmarkedIds).catch(console.error);
  }, []);

  const handleToggleBookmark = async (id: string, title: string) => {
    const added = await toggleBookmark("note", id, title);
    setBookmarkedIds(prev => {
      const next = new Set(prev);
      if (added) next.add(id); else next.delete(id);
      return next;
    });
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

  if (loading) {
    return (
      <div className="max-w-5xl flex items-center justify-center h-64">
        <p className="text-gray-400">Cargando notas...</p>
      </div>
    );
  }

  return (
    <div className="max-w-5xl">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-200">Notas</h1>
        <button
          onClick={() => setAdding(true)}
          className="px-4 py-2 bg-cyan-600 text-white rounded-lg text-sm font-medium hover:bg-cyan-700 transition-colors"
        >
          + Nueva nota
        </button>
      </div>

      {/* Filtros */}
      <div className="flex gap-3 mb-6">
        <input
          type="text"
          placeholder="Buscar notas..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="flex-1 px-4 py-2 border border-[#2a2d37] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-cyan-300 focus:border-cyan-300"
        />
        <select
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value as NoteType | "all")}
          className="px-3 py-2 border border-[#2a2d37] rounded-lg text-sm text-gray-400 bg-[#1a1d27]"
        >
          <option value="all">Todos los tipos</option>
          <option value="free">Libre</option>
          <option value="post_session">Post-sesión</option>
          <option value="post_match">Post-partido</option>
        </select>
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
              className="flex-1 px-3 py-2 border border-[#2a2d37] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-cyan-300"
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
            className="w-full px-3 py-2 border border-[#2a2d37] rounded-lg text-sm mb-3 focus:outline-none focus:ring-2 focus:ring-cyan-300 resize-none"
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

      {/* Lista */}
      {filtered.length === 0 ? (
        <div className="bg-[#1a1d27] rounded-xl border border-[#2a2d37] p-8 text-center text-gray-400">
          <p className="text-lg font-medium mb-2">Sin notas</p>
          <p className="text-sm">
            Crea tu primera nota. Tipos: libre, post-sesión, post-partido.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((note) => {
            const badge = NOTE_TYPE_LABELS[note.note_type];
            return (
              <div
                key={note.id}
                className="bg-[#1a1d27] rounded-xl border border-[#2a2d37] p-4 group"
              >
                {editingId === note.id ? (
                  <div>
                    <div className="flex gap-2 mb-2">
                      <input
                        autoFocus
                        value={editTitle}
                        onChange={(e) => setEditTitle(e.target.value)}
                        className="flex-1 px-3 py-2 border border-[#2a2d37] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-cyan-300"
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
                      className="w-full px-3 py-2 border border-[#2a2d37] rounded-lg text-sm mb-3 focus:outline-none focus:ring-2 focus:ring-cyan-300 resize-none"
                    />
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleUpdate(note.id)}
                        className="px-3 py-1.5 bg-cyan-600 text-white rounded text-sm"
                      >
                        Guardar
                      </button>
                      <button
                        onClick={() => setEditingId(null)}
                        className="px-3 py-1.5 bg-[#22252f] text-gray-400 rounded text-sm"
                      >
                        Cancelar
                      </button>
                    </div>
                  </div>
                ) : (
                  <div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <h3
                          className="font-semibold text-gray-200 cursor-pointer hover:text-cyan-600"
                          onClick={() =>
                            setExpandedId(expandedId === note.id ? null : note.id)
                          }
                        >
                          {note.title}
                        </h3>
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-medium ${badge.color}`}
                        >
                          {badge.label}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-gray-400">
                          {new Date(note.created_at).toLocaleDateString("es-ES")}
                        </span>
                        <div className="flex items-center gap-1">
                          <button
                            onClick={(e) => { e.stopPropagation(); handleToggleBookmark(note.id, note.title); }}
                            className="text-lg hover:scale-110 transition-transform"
                            title={bookmarkedIds.has(note.id) ? "Quitar de Continuar trabajando" : "Añadir a Continuar trabajando"}
                          >
                            {bookmarkedIds.has(note.id) ? <span className="text-amber-400">★</span> : <span className="text-gray-600">☆</span>}
                          </button>
                          <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button
                              onClick={() => {
                                setEditingId(note.id);
                                setEditTitle(note.title);
                                setEditContent(note.content || "");
                                setEditType(note.note_type);
                              }}
                              className="px-2 py-1 text-xs text-gray-500 hover:text-cyan-600 hover:bg-cyan-900/20 rounded"
                            >
                              Editar
                            </button>
                            <button
                              onClick={() => handleDelete(note.id)}
                              className="px-2 py-1 text-xs text-gray-500 hover:text-red-600 hover:bg-red-900/20 rounded"
                            >
                              Eliminar
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                    {expandedId === note.id && note.content && (
                      <p className="text-sm text-gray-400 mt-2 whitespace-pre-wrap">
                        {note.content}
                      </p>
                    )}
                    {expandedId !== note.id && note.content && (
                      <p className="text-sm text-gray-400 mt-1 truncate">{note.content}</p>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
