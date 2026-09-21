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
    .reduce((sum, st) => sum + (st.duration_minutes ?? st.task?.duration_minutes ?? 0), 0);
}

function totalMinutes(session: Session): number {
  return PART_META.reduce((sum, p) => sum + partMinutes(session, p.key), 0);
}

function formatDate(iso: string | null): string {
  if (!iso) return "Sin fecha";
  const [y, m, d] = iso.split("-");
  return `${d}/${m}/${y}`;
}

const PART_ORDER: SessionPart[] = ["inicial", "principal", "final"];

// Todas las tareas de la sesión en orden (parte inicial → principal → final,
// y dentro de cada parte por su posición) — así "la primera tarea" es
// siempre la que de verdad abre la sesión.
function orderedTasks(session: Session) {
  return (session.session_tasks ?? [])
    .slice()
    .sort((a, b) =>
      a.part === b.part ? a.position - b.position : PART_ORDER.indexOf(a.part) - PART_ORDER.indexOf(b.part)
    );
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
  const [showTemplatesOnly, setShowTemplatesOnly] = useState(false);
  const [teamFilter, setTeamFilter] = useState("");
  const [sortBy, setSortBy] = useState<"fecha_desc" | "fecha_asc">("fecha_desc");
  const [openMenu, setOpenMenu] = useState<string | null>(null);
  const [slideIndex, setSlideIndex] = useState<Record<string, number>>({});
  const [calendarMonth, setCalendarMonth] = useState(() => new Date());
  // Filtro por periodo de fechas — un clic en el calendario rellena ambos
  // con el mismo día; los campos "Desde"/"Hasta" permiten un rango libre.
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

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

  // Botón directo para definir/quitar una sesión como plantilla, sin tener
  // que abrirla y tocar el desplegable de estado.
  const toggleTemplate = async (s: Session) => {
    const nextStatus: SessionStatus = s.status === "plantilla" ? "planificada" : "plantilla";
    await updateSession(s.id, { status: nextStatus });
    setSessions((prev) => prev.map((x) => (x.id === s.id ? { ...x, status: nextStatus } : x)));
  };

  const teamOptions = useMemo(
    () => Array.from(new Set(sessions.map((s) => s.team_label).filter(Boolean))).sort(),
    [sessions]
  );

  const filtered = useMemo(() => {
    let list = sessions;
    if (showTemplatesOnly) list = list.filter((s) => s.status === "plantilla");
    if (teamFilter) list = list.filter((s) => s.team_label === teamFilter);
    if (dateFrom) list = list.filter((s) => s.session_date && s.session_date >= dateFrom);
    if (dateTo) list = list.filter((s) => s.session_date && s.session_date <= dateTo);
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
  }, [sessions, showTemplatesOnly, teamFilter, dateFrom, dateTo, search, sortBy]);

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
          <div className="flex items-center gap-2 flex-shrink-0">
            <button
              onClick={() => setShowTemplatesOnly((v) => !v)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-semibold transition-colors border ${
                showTemplatesOnly
                  ? "bg-amber-500/15 border-amber-500/40 text-amber-400"
                  : "bg-surface border-border text-foreground-secondary hover:text-foreground"
              }`}
            >
              🗂 Sesiones plantilla
            </button>
            <button
              onClick={handleNewSession}
              className="flex items-center gap-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-sm font-semibold transition-colors"
            >
              + Nueva sesión
            </button>
          </div>
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
          <div className="flex items-center gap-1.5 bg-surface border border-border rounded-lg px-2 py-1">
            <span className="text-xs text-muted">Desde</span>
            <input
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              className="bg-transparent text-sm text-foreground focus:outline-none"
            />
            <span className="text-xs text-muted">Hasta</span>
            <input
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              className="bg-transparent text-sm text-foreground focus:outline-none"
            />
          </div>
          {(dateFrom || dateTo) && (
            <button
              onClick={() => { setDateFrom(""); setDateTo(""); }}
              className="flex items-center gap-1.5 px-3 py-2 bg-emerald-600/15 text-emerald-400 rounded-lg text-xs font-medium"
            >
              Ver todas ✕
            </button>
          )}
        </div>

        <p className="text-xs text-muted mb-3">
          {filtered.length} sesiones encontradas{showTemplatesOnly && " · solo plantillas"}
        </p>

        {filtered.length === 0 ? (
          <div className="bg-surface border border-border rounded-xl p-10 text-center text-muted text-sm">
            No hay sesiones que coincidan con la búsqueda.
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {filtered.map((s) => {
              const uniqueTags = Array.from(
                new Map(
                  (s.session_tasks ?? [])
                    .flatMap((st) => st.task?.tags ?? [])
                    .map((t) => [t.id, t])
                ).values()
              ).slice(0, 4);
              const total = totalMinutes(s);
              const tasks = orderedTasks(s);
              const taskCount = tasks.length;
              const hasMultiple = tasks.length > 1;
              const idx = Math.min(slideIndex[s.id] ?? 0, Math.max(tasks.length - 1, 0));
              const currentTask = tasks[idx]?.task;
              const goTo = (e: React.MouseEvent, delta: number) => {
                e.stopPropagation();
                setSlideIndex((prev) => ({ ...prev, [s.id]: (idx + delta + tasks.length) % tasks.length }));
              };

              return (
                <div
                  key={s.id}
                  onClick={() => router.push(`/sesiones/${s.id}`)}
                  className="bg-surface rounded-xl border border-border overflow-hidden hover:border-border-light transition-colors cursor-pointer flex flex-col"
                >
                  {/* Título, estado y MD */}
                  <div className="p-4 pb-2 min-h-[64px] flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <h3 className="font-semibold text-foreground text-sm truncate">{s.name}</h3>
                      <div className="flex flex-wrap items-center gap-1.5 mt-1.5">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${STATUS_META[s.status].badge}`}>
                          {STATUS_META[s.status].label}
                        </span>
                        {s.match_day && (
                          <span className="px-2 py-0.5 rounded-full bg-violet-500/15 text-violet-400 text-[10px] font-semibold">
                            {s.match_day}
                          </span>
                        )}
                      </div>
                    </div>
                    <button
                      onClick={(e) => { e.stopPropagation(); toggleFavorite(s); }}
                      title="Favorita"
                      className="text-base leading-none flex-shrink-0"
                    >
                      {s.favorite ? "⭐" : <span className="text-muted">☆</span>}
                    </button>
                  </div>

                  {/* Dibujo de la primera tarea, con flechas para ver el resto */}
                  <div className="relative">
                    {currentTask?.image_url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={currentTask.image_url} alt="" className="w-full h-36 object-cover" />
                    ) : (
                      <div className="w-full h-36 bg-surface-hover flex items-center justify-center">
                        <span className="text-muted text-xs">Sin dibujo</span>
                      </div>
                    )}
                    {hasMultiple && (
                      <>
                        <span className="absolute left-1.5 top-1.5 px-1.5 py-0.5 rounded bg-black/60 text-white text-[10px] font-bold">
                          {idx + 1}/{tasks.length}
                        </span>
                        <button
                          onClick={(e) => goTo(e, -1)}
                          className="absolute left-1.5 top-1/2 -translate-y-1/2 w-6 h-6 rounded-full bg-black/50 text-white flex items-center justify-center hover:bg-black/70 transition-colors"
                          title="Tarea anterior"
                        >
                          ‹
                        </button>
                        <button
                          onClick={(e) => goTo(e, 1)}
                          className="absolute right-1.5 top-1/2 -translate-y-1/2 w-6 h-6 rounded-full bg-black/50 text-white flex items-center justify-center hover:bg-black/70 transition-colors"
                          title="Tarea siguiente"
                        >
                          ›
                        </button>
                      </>
                    )}
                  </div>

                  <div className="p-4 pt-3 flex-1 flex flex-col">
                    <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1 text-[11px] text-muted mb-2">
                      <span>📅 {formatDate(s.session_date)}</span>
                      <span>⏱ {total} min</span>
                      {s.team_label && <span>👥 {s.team_label}</span>}
                    </div>
                    {uniqueTags.length > 0 && (
                      <div className="flex flex-wrap gap-1 mb-2">
                        {uniqueTags.map((t) => {
                          const c = getTagColor(t.id);
                          return (
                            <span key={t.id} className={`px-1.5 py-0.5 rounded-full text-[9px] font-medium ${c.bgSoft} ${c.text}`}>
                              {t.label}
                            </span>
                          );
                        })}
                      </div>
                    )}
                    {total > 0 && (
                      <div
                        className="h-1.5 rounded-full overflow-hidden flex bg-border mb-2"
                        title={PART_META.map((p) => `${p.short} ${partMinutes(s, p.key)}'`).join(" · ")}
                      >
                        {PART_META.map((p) => {
                          const m = partMinutes(s, p.key);
                          if (m === 0) return null;
                          return <div key={p.key} className={p.bar} style={{ width: `${(m / total) * 100}%` }} />;
                        })}
                      </div>
                    )}
                    <div className="flex items-center justify-between mt-auto pt-1">
                      <span className="text-[11px] text-muted">
                        {taskCount} tareas · {s.squad_player_ids.length} jugadoras
                      </span>
                      <div className="relative" onClick={(e) => e.stopPropagation()}>
                        <button
                          onClick={() => setOpenMenu(openMenu === s.id ? null : s.id)}
                          className="text-muted hover:text-foreground px-1"
                        >
                          ⋯
                        </button>
                        {openMenu === s.id && (
                          <div className="absolute right-0 bottom-6 z-10 bg-surface border border-border rounded-lg shadow-xl py-1 w-44">
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
                              onClick={() => { setOpenMenu(null); toggleTemplate(s); }}
                              className="w-full text-left px-3 py-1.5 text-sm text-amber-400 hover:bg-surface-hover"
                            >
                              {s.status === "plantilla" ? "Quitar de plantillas" : "Marcar como plantilla"}
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
              const isSelected = dateFrom === iso && dateTo === iso;
              return (
                <button
                  key={i}
                  onClick={() => {
                    if (isSelected) { setDateFrom(""); setDateTo(""); }
                    else { setDateFrom(iso); setDateTo(iso); }
                  }}
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
