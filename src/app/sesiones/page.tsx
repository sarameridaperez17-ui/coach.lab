"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import { useRouter } from "next/navigation";
import { getSessions, deleteSession, duplicateSession, updateSession } from "@/lib/api";
import { getTagColor } from "@/lib/tagColors";
import type { Session, SessionStatus, SessionPart } from "@/types";

const STATUS_META: Record<SessionStatus, { label: string; badge: string }> = {
  planificada: { label: "Planificada", badge: "bg-blue-500/15 text-blue-400" },
  realizada: { label: "Realizada", badge: "bg-emerald-500/15 text-emerald-400" },
  plantilla: { label: "Plantilla", badge: "bg-amber-500/15 text-amber-400" },
};

const PART_META: { key: SessionPart; short: string; bar: string }[] = [
  { key: "inicial", short: "Activación", bar: "bg-sky-500" },
  { key: "principal", short: "Principal", bar: "bg-emerald-500" },
  { key: "final", short: "V. Calma", bar: "bg-amber-500" },
];

const TABS: { key: "todas" | SessionStatus; label: string }[] = [
  { key: "todas", label: "Todas" },
  { key: "planificada", label: "Planificadas" },
  { key: "realizada", label: "Realizadas" },
  { key: "plantilla", label: "Plantillas" },
];

const WEEKDAY_SHORT = ["L", "M", "X", "J", "V", "S", "D"];
const MONTH_LONG = [
  "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
  "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre",
];

function toISODate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function partMinutes(session: Session, part: SessionPart): number {
  return (session.session_tasks ?? [])
    .filter((st) => st.part === part && st.task)
    .reduce((sum, st) => sum + (st.task?.duration_minutes ?? 0), 0);
}

function totalMinutes(session: Session): number {
  return PART_META.reduce((sum, p) => sum + partMinutes(session, p.key), 0);
}

function formatDate(iso: string | null): string {
  if (!iso) return "Sin fecha";
  const [y, m, d] = iso.split("-");
  return `${d}/${m}/${y}`;
}

function MiniPitchIcon() {
  return (
    <svg viewBox="0 0 80 56" className="w-full h-full">
      <rect width="80" height="56" fill="#15803d" />
      <rect x="2" y="2" width="76" height="52" fill="none" stroke="#ffffff88" strokeWidth="1.5" />
      <line x1="40" y1="2" x2="40" y2="54" stroke="#ffffff88" strokeWidth="1.5" />
      <circle cx="40" cy="28" r="8" fill="none" stroke="#ffffff88" strokeWidth="1.5" />
      <rect x="2" y="16" width="10" height="24" fill="none" stroke="#ffffff88" strokeWidth="1.5" />
      <rect x="68" y="16" width="10" height="24" fill="none" stroke="#ffffff88" strokeWidth="1.5" />
    </svg>
  );
}

export default function SesionesPage() {
  const router = useRouter();
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [tab, setTab] = useState<"todas" | SessionStatus>("todas");
  const [teamFilter, setTeamFilter] = useState("");
  const [sortBy, setSortBy] = useState<"fecha_desc" | "fecha_asc">("fecha_desc");
  const [openMenu, setOpenMenu] = useState<string | null>(null);
  const [calendarMonth, setCalendarMonth] = useState(() => new Date());
  const [calendarDay, setCalendarDay] = useState<string | null>(null);

  const load = useCallback(() => {
    getSessions().then(setSessions).catch((err) => console.error("Error al cargar sesiones:", err));
  }, []);

  useEffect(() => {
    getSessions()
      .then(setSessions)
      .catch((err) => console.error("Error al cargar sesiones:", err))
      .finally(() => setLoading(false));
  }, []);

  const handleNewSession = async () => {
    router.push("/sesiones/nueva");
  };

  const handleDuplicate = async (s: Session) => {
    const created = await duplicateSession(s.id, `${s.name} (copia)`);
    load();
    router.push(`/sesiones/${created.id}`);
  };

  const handleDelete = async (s: Session) => {
    if (!confirm(`¿Eliminar "${s.name}"? Esta acción se puede deshacer solo por soporte.`)) return;
    await deleteSession(s.id);
    load();
  };

  const toggleFavorite = async (s: Session) => {
    await updateSession(s.id, { favorite: !s.favorite });
    setSessions((prev) => prev.map((x) => (x.id === s.id ? { ...x, favorite: !x.favorite } : x)));
  };

  const teamOptions = useMemo(
    () => Array.from(new Set(sessions.map((s) => s.team_label).filter(Boolean))).sort(),
    [sessions]
  );

  const filtered = useMemo(() => {
    let list = sessions;
    if (tab !== "todas") list = list.filter((s) => s.status === tab);
    if (teamFilter) list = list.filter((s) => s.team_label === teamFilter);
    if (calendarDay) list = list.filter((s) => s.session_date === calendarDay);
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      list = list.filter(
        (s) =>
          s.name.toLowerCase().includes(q) ||
          s.objective.toLowerCase().includes(q) ||
          s.team_label.toLowerCase().includes(q)
      );
    }
    return [...list].sort((a, b) => {
      const da = a.session_date ?? "0000-00-00";
      const db = b.session_date ?? "0000-00-00";
      return sortBy === "fecha_desc" ? db.localeCompare(da) : da.localeCompare(db);
    });
  }, [sessions, tab, teamFilter, calendarDay, search, sortBy]);

  const stats = useMemo(
    () => ({
      total: sessions.length,
      planificadas: sessions.filter((s) => s.status === "planificada").length,
      realizadas: sessions.filter((s) => s.status === "realizada").length,
      plantillas: sessions.filter((s) => s.status === "plantilla").length,
    }),
    [sessions]
  );

  const proximaSesion = useMemo(() => {
    const today = toISODate(new Date());
    return sessions
      .filter((s) => s.status === "planificada" && s.session_date && s.session_date >= today)
      .sort((a, b) => (a.session_date ?? "").localeCompare(b.session_date ?? ""))[0];
  }, [sessions]);

  const ultimasSesiones = useMemo(() => [...sessions].slice(0, 4), [sessions]);

  // --- Calendario mensual ---
  const calendarCells = useMemo(() => {
    const year = calendarMonth.getFullYear();
    const month = calendarMonth.getMonth();
    const first = new Date(year, month, 1);
    const startOffset = (first.getDay() + 6) % 7; // lunes=0
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const cells: (Date | null)[] = [];
    for (let i = 0; i < startOffset; i++) cells.push(null);
    for (let d = 1; d <= daysInMonth; d++) cells.push(new Date(year, month, d));
    return cells;
  }, [calendarMonth]);

  const sessionsByDate = useMemo(() => {
    const map = new Map<string, Session[]>();
    for (const s of sessions) {
      if (!s.session_date) continue;
      const arr = map.get(s.session_date) ?? [];
      arr.push(s);
      map.set(s.session_date, arr);
    }
    return map;
  }, [sessions]);

  const todayISO = toISODate(new Date());

  if (loading) {
    return <div className="text-muted text-sm">Cargando sesiones…</div>;
  }

  return (
    <div className="flex gap-6">
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Sesiones</h1>
            <p className="text-muted mt-1">Diseña, organiza y gestiona tus sesiones de entrenamiento.</p>
          </div>
          <button
            onClick={handleNewSession}
            className="flex items-center gap-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-sm font-semibold transition-colors flex-shrink-0"
          >
            + Nueva sesión
          </button>
        </div>

        {/* Búsqueda y filtros */}
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Buscar sesiones…"
          className="w-full bg-surface border border-border rounded-lg px-4 py-2.5 text-sm text-foreground placeholder:text-muted mb-3 focus:outline-none focus:border-emerald-500"
        />
        <div className="flex items-center gap-3 mb-4">
          <select
            value={teamFilter}
            onChange={(e) => setTeamFilter(e.target.value)}
            className="bg-surface border border-border rounded-lg px-3 py-2 text-sm text-foreground focus:outline-none focus:border-emerald-500"
          >
            <option value="">Equipo: Todos</option>
            {teamOptions.map((t) => (
              <option key={t} value={t}>{t}</option>
            ))}
          </select>
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as typeof sortBy)}
            className="bg-surface border border-border rounded-lg px-3 py-2 text-sm text-foreground focus:outline-none focus:border-emerald-500"
          >
            <option value="fecha_desc">Ordenar por: Fecha (recientes)</option>
            <option value="fecha_asc">Ordenar por: Fecha (antiguas)</option>
          </select>
          {calendarDay && (
            <button
              onClick={() => setCalendarDay(null)}
              className="flex items-center gap-1.5 px-3 py-2 bg-emerald-600/15 text-emerald-400 rounded-lg text-xs font-medium"
            >
              {formatDate(calendarDay)} ✕
            </button>
          )}
        </div>

        {/* Tabs */}
        <div className="flex items-center gap-1 mb-5 bg-surface border border-border rounded-lg p-1 w-fit">
          {TABS.map((t) => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`px-3.5 py-1.5 rounded-md text-sm font-medium transition-colors ${
                tab === t.key ? "bg-emerald-600 text-white" : "text-foreground-secondary hover:text-foreground"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        <p className="text-xs text-muted mb-3">{filtered.length} sesiones encontradas</p>

        {filtered.length === 0 ? (
          <div className="bg-surface border border-border rounded-xl p-10 text-center text-muted text-sm">
            No hay sesiones que coincidan con la búsqueda.
          </div>
        ) : (
          <div className="space-y-3">
            {filtered.map((s) => {
              const uniqueTags = Array.from(
                new Map(
                  (s.session_tasks ?? [])
                    .flatMap((st) => st.task?.tags ?? [])
                    .map((t) => [t.id, t])
                ).values()
              ).slice(0, 4);
              const total = totalMinutes(s);
              const taskCount = (s.session_tasks ?? []).length;

              return (
                <div
                  key={s.id}
                  onClick={() => router.push(`/sesiones/${s.id}`)}
                  className="flex gap-4 bg-surface border border-border rounded-xl p-4 hover:border-emerald-500/40 transition-colors cursor-pointer"
                >
                  <div className="w-28 h-20 rounded-lg overflow-hidden flex-shrink-0">
                    <MiniPitchIcon />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <h3 className="font-bold text-foreground truncate">{s.name}</h3>
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold flex-shrink-0 ${STATUS_META[s.status].badge}`}>
                        {STATUS_META[s.status].label}
                      </span>
                    </div>
                    {s.objective && <p className="text-sm text-foreground-secondary truncate mb-1.5">{s.objective}</p>}
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted mb-2">
                      <span>📅 {formatDate(s.session_date)}</span>
                      <span>⏱ {total} min</span>
                      {s.team_label && <span>👥 {s.team_label}</span>}
                      <span>▣ {taskCount} tareas</span>
                      <span>🧍 {s.squad_player_ids.length} jugadoras</span>
                    </div>
                    {uniqueTags.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 mb-2">
                        {uniqueTags.map((t) => {
                          const c = getTagColor(t.id);
                          return (
                            <span key={t.id} className={`px-2 py-0.5 rounded-full text-[10px] font-medium ${c.bg} ${c.text}`}>
                              {t.label}
                            </span>
                          );
                        })}
                      </div>
                    )}
                    {total > 0 && (
                      <div className="flex items-center gap-2">
                        <div className="flex-1 h-1.5 rounded-full overflow-hidden flex bg-border">
                          {PART_META.map((p) => {
                            const m = partMinutes(s, p.key);
                            if (m === 0) return null;
                            return <div key={p.key} className={p.bar} style={{ width: `${(m / total) * 100}%` }} />;
                          })}
                        </div>
                        <div className="flex items-center gap-2 text-[10px] text-muted flex-shrink-0">
                          {PART_META.map((p) => (
                            <span key={p.key}>{p.short} {partMinutes(s, p.key)}&apos;</span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                  <div className="flex flex-col items-end gap-2 flex-shrink-0" onClick={(e) => e.stopPropagation()}>
                    <button onClick={() => toggleFavorite(s)} title="Favorita" className="text-lg leading-none">
                      {s.favorite ? "⭐" : <span className="text-muted">☆</span>}
                    </button>
                    <div className="relative">
                      <button
                        onClick={() => setOpenMenu(openMenu === s.id ? null : s.id)}
                        className="text-muted hover:text-foreground px-1"
                      >
                        ⋯
                      </button>
                      {openMenu === s.id && (
                        <div className="absolute right-0 top-6 z-10 bg-surface border border-border rounded-lg shadow-xl py-1 w-36">
                          <button
                            onClick={() => { setOpenMenu(null); router.push(`/sesiones/${s.id}`); }}
                            className="w-full text-left px-3 py-1.5 text-sm text-foreground-secondary hover:bg-surface-hover"
                          >
                            Abrir
                          </button>
                          <button
                            onClick={() => { setOpenMenu(null); handleDuplicate(s); }}
                            className="w-full text-left px-3 py-1.5 text-sm text-foreground-secondary hover:bg-surface-hover"
                          >
                            Duplicar
                          </button>
                          <button
                            onClick={() => { setOpenMenu(null); handleDelete(s); }}
                            className="w-full text-left px-3 py-1.5 text-sm text-rose-400 hover:bg-surface-hover"
                          >
                            Eliminar
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Sidebar */}
      <div className="w-72 flex-shrink-0 space-y-4">
        <div className="bg-surface rounded-xl border border-border p-4">
          <h3 className="text-xs font-semibold text-muted uppercase tracking-wider mb-3">1. Resumen</h3>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <p className="text-2xl font-bold text-foreground">{stats.total}</p>
              <p className="text-[10px] text-muted uppercase tracking-wide">Sesiones</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-blue-400">{stats.planificadas}</p>
              <p className="text-[10px] text-muted uppercase tracking-wide">Planificadas</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-emerald-400">{stats.realizadas}</p>
              <p className="text-[10px] text-muted uppercase tracking-wide">Realizadas</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-amber-400">{stats.plantillas}</p>
              <p className="text-[10px] text-muted uppercase tracking-wide">Plantillas</p>
            </div>
          </div>
        </div>

        {proximaSesion && (
          <div className="bg-surface rounded-xl border border-border p-4">
            <h3 className="text-xs font-semibold text-muted uppercase tracking-wider mb-3">2. Próxima sesión</h3>
            <div className="flex gap-3 mb-3">
              <div className="w-16 h-12 rounded-lg overflow-hidden flex-shrink-0">
                <MiniPitchIcon />
              </div>
              <div className="min-w-0">
                <p className="text-[10px] text-muted uppercase">{formatDate(proximaSesion.session_date)}</p>
                <p className="font-bold text-foreground truncate">{proximaSesion.name}</p>
                <p className="text-xs text-foreground-secondary truncate">{proximaSesion.objective}</p>
              </div>
            </div>
            <button
              onClick={() => router.push(`/sesiones/${proximaSesion.id}`)}
              className="w-full py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-sm font-semibold transition-colors"
            >
              Abrir sesión →
            </button>
          </div>
        )}

        <div className="bg-surface rounded-xl border border-border p-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-xs font-semibold text-muted uppercase tracking-wider">3. Calendario</h3>
            <div className="flex items-center gap-1">
              <button
                onClick={() => setCalendarMonth(new Date(calendarMonth.getFullYear(), calendarMonth.getMonth() - 1, 1))}
                className="text-muted hover:text-foreground px-1"
              >
                ‹
              </button>
              <span className="text-xs font-medium text-foreground-secondary w-24 text-center">
                {MONTH_LONG[calendarMonth.getMonth()]} {calendarMonth.getFullYear()}
              </span>
              <button
                onClick={() => setCalendarMonth(new Date(calendarMonth.getFullYear(), calendarMonth.getMonth() + 1, 1))}
                className="text-muted hover:text-foreground px-1"
              >
                ›
              </button>
            </div>
          </div>
          <div className="grid grid-cols-7 gap-1 text-center">
            {WEEKDAY_SHORT.map((d) => (
              <span key={d} className="text-[10px] text-muted font-medium">{d}</span>
            ))}
            {calendarCells.map((date, i) => {
              if (!date) return <span key={i} />;
              const iso = toISODate(date);
              const daySessions = sessionsByDate.get(iso) ?? [];
              const isToday = iso === todayISO;
              const isSelected = iso === calendarDay;
              return (
                <button
                  key={i}
                  onClick={() => setCalendarDay(isSelected ? null : iso)}
                  className={`relative aspect-square rounded-md text-xs flex items-center justify-center ${
                    isSelected
                      ? "bg-emerald-600 text-white font-semibold"
                      : isToday
                      ? "border border-emerald-500 text-foreground"
                      : "text-foreground-secondary hover:bg-surface-hover"
                  }`}
                >
                  {date.getDate()}
                  {daySessions.length > 0 && (
                    <span
                      className={`absolute bottom-0.5 w-1 h-1 rounded-full ${
                        daySessions.some((s) => s.status === "realizada") ? "bg-emerald-400" : "bg-blue-400"
                      }`}
                    />
                  )}
                </button>
              );
            })}
          </div>
        </div>

        <div className="bg-surface rounded-xl border border-border p-4">
          <h3 className="text-xs font-semibold text-muted uppercase tracking-wider mb-3">4. Últimas sesiones</h3>
          <div className="space-y-2.5">
            {ultimasSesiones.map((s) => (
              <button
                key={s.id}
                onClick={() => router.push(`/sesiones/${s.id}`)}
                className="flex items-center justify-between w-full text-left"
              >
                <div className="min-w-0">
                  <p className="text-sm font-medium text-foreground truncate">{s.name}</p>
                  <p className="text-[11px] text-muted">{formatDate(s.session_date)} · {totalMinutes(s)} min</p>
                </div>
                <span className={`px-2 py-0.5 rounded-full text-[9px] font-semibold flex-shrink-0 ${STATUS_META[s.status].badge}`}>
                  {STATUS_META[s.status].label}
                </span>
              </button>
            ))}
            {ultimasSesiones.length === 0 && <p className="text-xs text-muted italic">Aún no hay sesiones.</p>}
          </div>
        </div>
      </div>
    </div>
  );
}
