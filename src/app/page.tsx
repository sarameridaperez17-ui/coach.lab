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

const TYPE_COLORS: Record<string, string> = {
  principle: "bg-emerald-900/50 text-emerald-400",
  sub_principle: "bg-emerald-900/40 text-emerald-400",
  behavior: "bg-emerald-900/40 text-emerald-400",
  tactical_concept: "bg-amber-900/50 text-amber-400",
  glossary: "bg-rose-900/50 text-rose-400",
  note: "bg-cyan-900/50 text-cyan-400",
  task: "bg-purple-900/50 text-purple-400",
  system: "bg-indigo-900/50 text-indigo-400",
  abp: "bg-orange-900/50 text-orange-400",
};

const NOTE_TYPE_LABELS: Record<string, string> = {
  reflection: "Reflexion",
  tactical: "Tactica",
  training: "Entrenamiento",
  match: "Partido",
  general: "General",
};

const QUOTES = [
  "El conocimiento se construye. La identidad se entrena. El rendimiento es la consecuencia.",
  "Lo que no se entrena con intencion, no aparece en competicion.",
  "El modelo de juego no es un documento. Es una forma de entender el futbol.",
  "Cada decision tactica tiene un porque. Si no lo tiene, no es tactica.",
  "La coherencia entre lo que piensas, entrenas y juegas define tu identidad.",
];

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "ahora";
  if (mins < 60) return `hace ${mins} min`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `hace ${hours}h`;
  const days = Math.floor(hours / 24);
  if (days === 1) return "ayer";
  if (days < 7) return `hace ${days}d`;
  return new Date(dateStr).toLocaleDateString("es-ES", { day: "numeric", month: "short" });
}

function formatTime(dateStr: string): string {
  return new Date(dateStr).toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit" });
}

function groupModsByDate(mods: RecentModification[]): Record<string, RecentModification[]> {
  const groups: Record<string, RecentModification[]> = {};
  for (const mod of mods) {
    const d = new Date(mod.updated_at);
    const now = new Date();
    const diff = Math.floor((now.getTime() - d.getTime()) / 86400000);
    let label = "Hoy";
    if (diff === 1) label = "Ayer";
    else if (diff > 1) label = `Hace ${diff} dias`;
    if (!groups[label]) groups[label] = [];
    groups[label].push(mod);
  }
  return groups;
}

// Simulated data for sections not yet connected
const SIMULATED_PROGRESS = {
  principles: { pct: 78, progressLabel: "del modelo definido" },
  subPrinciples: { pct: 72, progressLabel: "del modelo definido" },
  behaviors: { pct: 68, progressLabel: "del modelo definido" },
  tasks: { pct: 64, progressLabel: "del modelo vinculado" },
  notes: { pct: 0, progressLabel: "" },
};

const SIMULATED_CONTEXTS = [
  { name: "Dominador con balon", color: "bg-emerald-500", principles: 8, tasks: 12 },
  { name: "Dominador sin balon", color: "bg-blue-500", principles: 7, tasks: 10 },
  { name: "Rival en bloque bajo", color: "bg-amber-500", principles: 9, tasks: 14 },
  { name: "Rival en presion alta", color: "bg-orange-500", principles: 8, tasks: 11 },
  { name: "Partido igualado", color: "bg-purple-500", principles: 6, tasks: 9 },
];

const SIMULATED_RADAR = [
  { label: "Fase ofensiva", pct: 80 },
  { label: "Fase defensiva", pct: 70 },
  { label: "Transiciones", pct: 75 },
  { label: "ABP", pct: 60 },
  { label: "Principios transversales", pct: 85 },
];

const QUICK_ACTIONS = [
  { label: "Nuevo principio", href: "/modelo-de-juego", color: "text-emerald-400" },
  { label: "Nueva tarea", href: "/tareas", color: "text-orange-400" },
  { label: "Nuevo concepto", href: "/conceptos-tacticos", color: "text-amber-400" },
  { label: "Nueva nota", href: "/notas", color: "text-cyan-400" },
  { label: "Nuevo sistema", href: "/sistemas", color: "text-indigo-400" },
  { label: "Nuevo ABP", href: "/abp", color: "text-rose-400" },
];

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

  // Quote
  const [quote] = useState(() => QUOTES[Math.floor(Math.random() * QUOTES.length)]);

  useEffect(() => {
    getModelStats().then(setStats).catch(console.error);
    getRecentNotes(3).then(setRecentNotes).catch(console.error);
    getRecentModifications(5).then(setRecentMods).catch(console.error);
  }, []);

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
    if (!value.trim()) { setSearchResults([]); setSearchOpen(false); return; }
    setSearching(true);
    setSearchOpen(true);
    debounceRef.current = setTimeout(async () => {
      try {
        const results = await globalSearch(value);
        setSearchResults(results);
      } catch (err) { console.error(err); }
      finally { setSearching(false); }
    }, 300);
  };

  const behaviors = stats.principles * 7; // simulated
  const modGroups = groupModsByDate(recentMods);
  const globalPct = SIMULATED_RADAR.reduce((a, b) => a + b.pct, 0) / SIMULATED_RADAR.length;

  return (
    <div className="max-w-7xl">
      {/* Header */}
      <div className="flex items-start justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-white">Hola, Sandra</h1>
          <p className="text-gray-500 text-sm mt-1">
            El conocimiento se construye. La identidad se entrena. El rendimiento es la consecuencia.
          </p>
        </div>
      </div>

      {/* Search bar */}
      <div ref={searchRef} className="relative mb-8">
        <div className="relative">
          <svg className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            type="text"
            placeholder="Buscar en coach.lab..."
            value={searchQuery}
            onChange={(e) => handleSearchChange(e.target.value)}
            onFocus={() => { if (searchQuery.trim()) setSearchOpen(true); }}
            className="w-full pl-11 pr-16 py-3 bg-[#1a1d27] border border-[#2a2d37] rounded-xl text-sm text-gray-200 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/40 focus:border-emerald-500/40"
          />
          <span className="absolute right-4 top-1/2 -translate-y-1/2 text-[10px] text-gray-600 bg-[#22252f] px-2 py-1 rounded border border-[#2a2d37]">
            Ctrl+K
          </span>
        </div>
        {searchOpen && (
          <div className="absolute top-full mt-1 w-full bg-[#1a1d27] rounded-xl border border-[#2a2d37] shadow-2xl z-50 max-h-80 overflow-y-auto">
            {searching ? (
              <div className="p-4 text-center text-sm text-gray-500">Buscando...</div>
            ) : searchResults.length === 0 ? (
              <div className="p-4 text-center text-sm text-gray-500">Sin resultados para &ldquo;{searchQuery}&rdquo;</div>
            ) : (
              searchResults.map((r) => (
                <button
                  key={`${r.type}-${r.id}`}
                  onClick={() => { setSearchOpen(false); setSearchQuery(""); router.push(r.href); }}
                  className="w-full text-left px-4 py-3 hover:bg-[#22252f] border-b border-[#22252f] last:border-b-0 transition-colors"
                >
                  <div className="flex items-center gap-2">
                    <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded ${TYPE_COLORS[r.type] ?? "bg-gray-800 text-gray-400"}`}>{r.label}</span>
                    <span className="text-sm font-medium text-gray-200 truncate">{r.title}</span>
                  </div>
                  {r.subtitle && <p className="text-xs text-gray-500 mt-0.5 truncate pl-0.5">{r.subtitle}</p>}
                </button>
              ))
            )}
          </div>
        )}
      </div>

      {/* Stats cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4 mb-8">
        {[
          { label: "Principios", value: stats.principles, color: "text-emerald-400", barColor: "bg-emerald-500", ...SIMULATED_PROGRESS.principles },
          { label: "Subprincipios", value: stats.subPrinciples, color: "text-blue-400", barColor: "bg-blue-500", ...SIMULATED_PROGRESS.subPrinciples },
          { label: "Comportamientos", value: behaviors, color: "text-amber-400", barColor: "bg-amber-500", ...SIMULATED_PROGRESS.behaviors },
          { label: "Tareas", value: stats.tasks, color: "text-orange-400", barColor: "bg-orange-500", ...SIMULATED_PROGRESS.tasks },
          { label: "Notas", value: stats.notes, color: "text-purple-400", barColor: "bg-purple-500", pct: 0, progressLabel: "", label2: stats.notes > 0 ? "Ultima: hoy" : "" },
        ].map((s) => (
          <div key={s.label} className="bg-[#1a1d27] rounded-xl border border-[#2a2d37] p-5">
            <p className={`text-xs font-semibold uppercase tracking-wide ${s.color}`}>{s.label}</p>
            <p className="text-3xl font-bold text-white mt-2">{s.value}</p>
            {s.pct > 0 && (
              <>
                <div className="w-full h-1 bg-[#2a2d37] rounded-full mt-3">
                  <div className={`h-1 rounded-full ${s.barColor}`} style={{ width: `${s.pct}%` }} />
                </div>
                <p className="text-[10px] text-gray-500 mt-1.5">{s.pct}% {s.progressLabel}</p>
              </>
            )}
            {"label2" in s && s.label2 && (
              <p className="text-[10px] text-gray-500 mt-3">{s.label2}</p>
            )}
          </div>
        ))}
      </div>

      {/* Middle row: 3 columns */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-8">
        {/* Continuar trabajando */}
        <div className="bg-[#1a1d27] rounded-xl border border-[#2a2d37] p-5">
          <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-4">Continuar trabajando</h3>
          {recentMods.length === 0 ? (
            <p className="text-sm text-gray-500 text-center py-4">Sin actividad reciente</p>
          ) : (
            <div className="space-y-3">
              {recentMods.slice(0, 3).map((mod) => (
                <Link
                  key={mod.id}
                  href={mod.href}
                  className="flex items-center gap-3 p-3 rounded-lg bg-[#22252f] hover:bg-[#2a2d37] transition-colors group"
                >
                  <div className="w-10 h-10 rounded-lg bg-emerald-500/10 flex items-center justify-center flex-shrink-0">
                    <span className="text-emerald-400 text-sm">
                      {mod.type === "Principio" ? "◈" : mod.type === "Sistema" ? "⬢" : mod.type === "Tarea" ? "▣" : mod.type === "ABP" ? "◎" : mod.type === "Nota" ? "▥" : mod.type === "Concepto tactico" ? "◆" : "▤"}
                    </span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-200 truncate">{mod.title}</p>
                    <p className="text-[10px] text-gray-500">{mod.type} · {timeAgo(mod.updated_at)}</p>
                  </div>
                  <svg className="w-4 h-4 text-gray-600 group-hover:text-gray-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </Link>
              ))}
            </div>
          )}
          {recentMods.length > 0 && (
            <p className="text-xs text-emerald-500 text-center mt-4 cursor-pointer hover:text-emerald-400">Ver todo</p>
          )}
        </div>

        {/* Ultimos cambios */}
        <div className="bg-[#1a1d27] rounded-xl border border-[#2a2d37] p-5">
          <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-4">Ultimos cambios</h3>
          {recentMods.length === 0 ? (
            <p className="text-sm text-gray-500 text-center py-4">Sin cambios registrados</p>
          ) : (
            <div className="space-y-4">
              {Object.entries(modGroups).map(([dateLabel, mods]) => (
                <div key={dateLabel}>
                  <p className="text-[10px] text-gray-500 font-semibold uppercase mb-2">{dateLabel}</p>
                  <div className="space-y-2">
                    {mods.map((mod) => (
                      <Link key={mod.id} href={mod.href} className="flex items-center justify-between hover:bg-[#22252f] rounded-lg px-2 py-1.5 transition-colors">
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-emerald-900/30 text-emerald-400">Actualizado</span>
                          <span className="text-sm text-gray-300 truncate">{mod.type}: {mod.title}</span>
                        </div>
                        <span className="text-[10px] text-gray-500 whitespace-nowrap ml-2">{formatTime(mod.updated_at)}</span>
                      </Link>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
          {recentMods.length > 0 && (
            <p className="text-xs text-emerald-500 text-center mt-4 cursor-pointer hover:text-emerald-400">Ver todos los cambios</p>
          )}
        </div>

        {/* Acceso rapido */}
        <div className="bg-[#1a1d27] rounded-xl border border-[#2a2d37] p-5">
          <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-4">Acceso rapido</h3>
          <div className="grid grid-cols-3 gap-3">
            {QUICK_ACTIONS.map((action) => (
              <Link
                key={action.label}
                href={action.href}
                className="flex flex-col items-center gap-2 p-3 rounded-lg bg-[#22252f] hover:bg-[#2a2d37] transition-colors group"
              >
                <div className={`w-10 h-10 rounded-full border-2 border-dashed border-[#353840] flex items-center justify-center group-hover:border-emerald-500/40 transition-colors`}>
                  <svg className={`w-5 h-5 ${action.color}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                </div>
                <span className="text-[10px] text-gray-400 text-center leading-tight">{action.label}</span>
              </Link>
            ))}
          </div>
        </div>
      </div>

      {/* Bottom row: 3 columns */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-8">
        {/* Resumen del modelo (radar simulado) */}
        <div className="bg-[#1a1d27] rounded-xl border border-[#2a2d37] p-5">
          <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-4">Resumen del modelo</h3>
          {/* Simulated radar as bars */}
          <div className="space-y-3 mb-4">
            {SIMULATED_RADAR.map((item) => (
              <div key={item.label}>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs text-gray-400">{item.label}</span>
                  <span className="text-xs text-gray-500">{item.pct}%</span>
                </div>
                <div className="w-full h-1.5 bg-[#2a2d37] rounded-full">
                  <div className="h-1.5 rounded-full bg-emerald-500" style={{ width: `${item.pct}%` }} />
                </div>
              </div>
            ))}
          </div>
          <div className="border-t border-[#2a2d37] pt-3 text-center">
            <p className="text-[10px] text-gray-500">Cobertura global del modelo</p>
            <p className="text-2xl font-bold text-emerald-400 mt-1">{Math.round(globalPct)}%</p>
          </div>
        </div>

        {/* Contextos */}
        <div className="bg-[#1a1d27] rounded-xl border border-[#2a2d37] p-5">
          <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-4">Contextos</h3>
          <div className="space-y-2.5">
            {SIMULATED_CONTEXTS.map((ctx) => (
              <div key={ctx.name} className="flex items-center gap-3 p-2 rounded-lg hover:bg-[#22252f] transition-colors">
                <div className={`w-2 h-2 rounded-full ${ctx.color} flex-shrink-0`} />
                <div className="flex-1">
                  <span className="text-sm text-gray-200">{ctx.name}</span>
                </div>
                <span className="text-[10px] text-gray-500">{ctx.principles} principios · {ctx.tasks} tareas</span>
              </div>
            ))}
          </div>
          <p className="text-xs text-emerald-500 text-center mt-4 cursor-pointer hover:text-emerald-400">Ver todos los contextos</p>
        </div>

        {/* Ultimas notas */}
        <div className="bg-[#1a1d27] rounded-xl border border-[#2a2d37] p-5">
          <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-4">Ultimas notas</h3>
          {recentNotes.length === 0 ? (
            <p className="text-sm text-gray-500 text-center py-4">Sin notas aun. Crea tu primera nota.</p>
          ) : (
            <div className="space-y-3">
              {recentNotes.map((note) => (
                <Link
                  key={note.id}
                  href="/notas"
                  className="flex items-start gap-3 p-3 rounded-lg hover:bg-[#22252f] transition-colors"
                >
                  <div className="w-8 h-8 rounded-lg bg-purple-500/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <span className="text-purple-400 text-xs">▥</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-200 truncate">{note.title}</p>
                    {note.content && (
                      <p className="text-[10px] text-gray-500 mt-0.5 truncate">{note.content.slice(0, 80)}...</p>
                    )}
                  </div>
                  <span className="text-[10px] text-gray-500 whitespace-nowrap flex-shrink-0">
                    {timeAgo(note.created_at)}
                  </span>
                </Link>
              ))}
            </div>
          )}
          <Link href="/notas" className="block text-xs text-emerald-500 text-center mt-4 hover:text-emerald-400">
            Ver todas las notas
          </Link>
        </div>
      </div>

      {/* Footer quote */}
      <div className="bg-[#1a1d27] rounded-xl border border-[#2a2d37] p-5 flex items-center justify-between mb-4">
        <div className="flex items-start gap-3">
          <span className="text-2xl text-emerald-500/30 leading-none">&ldquo;</span>
          <p className="text-sm text-gray-400 italic">{quote}</p>
        </div>
      </div>
    </div>
  );
}
