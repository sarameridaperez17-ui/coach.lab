"use client";

import Link from "next/link";
import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import {
  getModelStats,
  globalSearch,
  getRecentNotes,
  getRecentModifications,
} from "@/lib/api";
import type { SearchResult, RecentModification } from "@/lib/api";
import type { Note } from "@/types";

const QUICK_ACCESS = [
  {
    href: "/modelo-de-juego",
    title: "Modelo de juego",
    description: "Principios, subprincipios y comportamientos organizados por contexto y fase.",
    icon: "◈",
    color: "bg-emerald-50 border-emerald-200 hover:border-emerald-400",
  },
  {
    href: "/sistemas",
    title: "Sistemas",
    description: "Estructuras posicionales, variantes y relación con el modelo de juego.",
    icon: "⬢",
    color: "bg-indigo-50 border-indigo-200 hover:border-indigo-400",
  },
  {
    href: "/conceptos-tacticos",
    title: "Conceptos tácticos",
    description: "Biblioteca de conceptos transversales: cuadrado, giro, 3ª mujer...",
    icon: "◆",
    color: "bg-amber-50 border-amber-200 hover:border-amber-400",
  },
  {
    href: "/posiciones",
    title: "Posiciones",
    description: "Perfiles de las 12 posiciones con comportamientos por zona y fase.",
    icon: "◉",
    color: "bg-blue-50 border-blue-200 hover:border-blue-400",
  },
  {
    href: "/tareas",
    title: "Tareas",
    description: "Ejercicios vinculados a principios del modelo de juego.",
    icon: "▣",
    color: "bg-purple-50 border-purple-200 hover:border-purple-400",
  },
  {
    href: "/abp",
    title: "ABP",
    description: "Estrategias ofensivas y defensivas a balón parado.",
    icon: "◎",
    color: "bg-orange-50 border-orange-200 hover:border-orange-400",
  },
  {
    href: "/glosario",
    title: "Diccionario táctico",
    description: "Terminología propia con definiciones y vínculos.",
    icon: "▤",
    color: "bg-rose-50 border-rose-200 hover:border-rose-400",
  },
  {
    href: "/notas",
    title: "Notas",
    description: "Reflexiones y diario del entrenador con etiquetas inteligentes.",
    icon: "▥",
    color: "bg-cyan-50 border-cyan-200 hover:border-cyan-400",
  },
];

const TYPE_COLORS: Record<string, string> = {
  principle: "bg-emerald-100 text-emerald-700",
  sub_principle: "bg-emerald-50 text-emerald-600",
  behavior: "bg-emerald-50 text-emerald-600",
  tactical_concept: "bg-amber-100 text-amber-700",
  glossary: "bg-rose-100 text-rose-700",
  note: "bg-cyan-100 text-cyan-700",
  task: "bg-purple-100 text-purple-700",
  system: "bg-indigo-100 text-indigo-700",
  abp: "bg-orange-100 text-orange-700",
};

const NOTE_TYPE_LABELS: Record<string, string> = {
  reflection: "Reflexión",
  tactical: "Táctica",
  training: "Entrenamiento",
  match: "Partido",
  general: "General",
};

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "hace un momento";
  if (mins < 60) return `hace ${mins} min`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `hace ${hours}h`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `hace ${days}d`;
  return new Date(dateStr).toLocaleDateString("es-ES", { day: "numeric", month: "short" });
}

export default function HomePage() {
  const router = useRouter();
  const [stats, setStats] = useState({ principles: 0, subPrinciples: 0, tasks: 0, notes: 0 });

  // Search
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searching, setSearching] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Recent
  const [recentNotes, setRecentNotes] = useState<Note[]>([]);
  const [recentMods, setRecentMods] = useState<RecentModification[]>([]);

  useEffect(() => {
    getModelStats()
      .then(setStats)
      .catch((err) => console.error("Error loading stats:", err));
    getRecentNotes(3)
      .then(setRecentNotes)
      .catch((err) => console.error("Error loading recent notes:", err));
    getRecentModifications(3)
      .then(setRecentMods)
      .catch((err) => console.error("Error loading recent mods:", err));
  }, []);

  // Click outside to close search
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
        setSearchOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const handleSearchChange = (value: string) => {
    setSearchQuery(value);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (!value.trim()) {
      setSearchResults([]);
      setSearchOpen(false);
      return;
    }
    setSearching(true);
    setSearchOpen(true);
    debounceRef.current = setTimeout(async () => {
      try {
        const results = await globalSearch(value);
        setSearchResults(results);
      } catch (err) {
        console.error("Search error:", err);
      } finally {
        setSearching(false);
      }
    }, 300);
  };

  return (
    <div className="max-w-5xl">
      {/* Header + Search */}
      <div className="flex items-start justify-between mb-10">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">
            coach<span className="text-emerald-600">.lab</span>
          </h1>
          <p className="text-gray-500 mt-2">
            Tu base de conocimiento. Tu metodología. Tu identidad.
          </p>
        </div>

        {/* Global Search */}
        <div ref={searchRef} className="relative w-80">
          <div className="relative">
            <svg
              className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              type="text"
              placeholder="Buscar en todo el modelo..."
              value={searchQuery}
              onChange={(e) => handleSearchChange(e.target.value)}
              onFocus={() => { if (searchQuery.trim()) setSearchOpen(true); }}
              className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-300 focus:border-emerald-300 bg-white"
            />
          </div>

          {/* Search Results Dropdown */}
          {searchOpen && (
            <div className="absolute top-full mt-1 w-full bg-white rounded-lg border border-gray-200 shadow-lg z-50 max-h-80 overflow-y-auto">
              {searching ? (
                <div className="p-4 text-center text-sm text-gray-400">Buscando...</div>
              ) : searchResults.length === 0 ? (
                <div className="p-4 text-center text-sm text-gray-400">Sin resultados para &ldquo;{searchQuery}&rdquo;</div>
              ) : (
                searchResults.map((r) => (
                  <button
                    key={`${r.type}-${r.id}`}
                    onClick={() => {
                      setSearchOpen(false);
                      setSearchQuery("");
                      router.push(r.href);
                    }}
                    className="w-full text-left px-4 py-3 hover:bg-gray-50 border-b border-gray-50 last:border-b-0 transition-colors"
                  >
                    <div className="flex items-center gap-2">
                      <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded ${TYPE_COLORS[r.type] ?? "bg-gray-100 text-gray-600"}`}>
                        {r.label}
                      </span>
                      <span className="text-sm font-medium text-gray-900 truncate">{r.title}</span>
                    </div>
                    {r.subtitle && (
                      <p className="text-xs text-gray-400 mt-0.5 truncate pl-0.5">{r.subtitle}</p>
                    )}
                  </button>
                ))
              )}
            </div>
          )}
        </div>
      </div>

      {/* Quick access grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {QUICK_ACCESS.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className={`block p-6 rounded-xl border-2 transition-all ${item.color}`}
          >
            <div className="text-2xl mb-3">{item.icon}</div>
            <h2 className="text-lg font-semibold text-gray-900">{item.title}</h2>
            <p className="text-sm text-gray-600 mt-1">{item.description}</p>
          </Link>
        ))}
      </div>

      {/* Stats */}
      <div className="mt-10 p-6 bg-white rounded-xl border border-gray-200">
        <h3 className="text-sm font-medium text-gray-500 uppercase tracking-wide mb-4">
          Resumen del modelo
        </h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
          <div>
            <p className="text-2xl font-bold text-gray-900">{stats.principles}</p>
            <p className="text-sm text-gray-500">Principios</p>
          </div>
          <div>
            <p className="text-2xl font-bold text-gray-900">{stats.subPrinciples}</p>
            <p className="text-sm text-gray-500">Subprincipios</p>
          </div>
          <div>
            <p className="text-2xl font-bold text-gray-900">{stats.tasks}</p>
            <p className="text-sm text-gray-500">Tareas</p>
          </div>
          <div>
            <p className="text-2xl font-bold text-gray-900">{stats.notes}</p>
            <p className="text-sm text-gray-500">Notas</p>
          </div>
        </div>
      </div>

      {/* Notas recientes */}
      <div className="mt-8">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-medium text-gray-500 uppercase tracking-wide">
            Notas recientes
          </h3>
          <Link href="/notas" className="text-xs text-emerald-600 hover:text-emerald-700 font-medium">
            Ver todas →
          </Link>
        </div>
        {recentNotes.length === 0 ? (
          <p className="text-sm text-gray-400 bg-white rounded-xl border border-gray-200 p-6 text-center">
            Aún no hay notas. Crea tu primera nota en la sección de Notas.
          </p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {recentNotes.map((note) => (
              <Link
                key={note.id}
                href="/notas"
                className="block bg-white rounded-xl border border-gray-200 p-4 hover:border-cyan-300 transition-colors"
              >
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-cyan-100 text-cyan-700">
                    {NOTE_TYPE_LABELS[note.note_type] ?? note.note_type}
                  </span>
                  <span className="text-[10px] text-gray-400">
                    {timeAgo(note.created_at)}
                  </span>
                </div>
                <h4 className="text-sm font-semibold text-gray-900 truncate">{note.title}</h4>
                {note.content && (
                  <p className="text-xs text-gray-500 mt-1 line-clamp-2">{note.content}</p>
                )}
              </Link>
            ))}
          </div>
        )}
      </div>

      {/* Modificaciones recientes */}
      <div className="mt-8 mb-8">
        <h3 className="text-sm font-medium text-gray-500 uppercase tracking-wide mb-4">
          Modificaciones recientes
        </h3>
        {recentMods.length === 0 ? (
          <p className="text-sm text-gray-400 bg-white rounded-xl border border-gray-200 p-6 text-center">
            Aún no hay modificaciones registradas.
          </p>
        ) : (
          <div className="bg-white rounded-xl border border-gray-200 divide-y divide-gray-100">
            {recentMods.map((mod) => (
              <Link
                key={mod.id}
                href={mod.href}
                className="flex items-center justify-between px-5 py-3.5 hover:bg-gray-50 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-gray-100 text-gray-600">
                    {mod.type}
                  </span>
                  <span className="text-sm text-gray-900">{mod.title}</span>
                </div>
                <span className="text-xs text-gray-400 whitespace-nowrap ml-4">
                  {timeAgo(mod.updated_at)}
                </span>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
