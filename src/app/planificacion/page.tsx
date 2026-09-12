"use client";

import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import {
  getPlanningEvents,
  createPlanningEvent,
  updatePlanningEvent,
  deletePlanningEvent,
} from "@/lib/api";
import type { PlanningEvent, PlanningEventType } from "@/types";

// ============================================
// Configuración de tipos de evento
// ============================================

const TYPE_CONFIG: Record<PlanningEventType, { label: string; icon: string; accent: string }> = {
  training: { label: "Entrenamiento", icon: "⚽", accent: "#34d399" },
  gym: { label: "Gimnasio", icon: "🏋️", accent: "#a78bfa" },
  match: { label: "Partido", icon: "🏆", accent: "#fb923c" },
  rest: { label: "Día libre", icon: "🌴", accent: "#94a3b8" },
  travel: { label: "Viaje", icon: "✈️", accent: "#38bdf8" },
  other: { label: "Otro", icon: "●", accent: "#fbbf24" },
};
const TYPE_ORDER: PlanningEventType[] = ["training", "gym", "match", "rest", "travel", "other"];

const WEEKDAY_SHORT = ["L", "M", "X", "J", "V", "S", "D"];
const WEEKDAY_LONG = ["Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado", "Domingo"];
const MONTH_LONG = [
  "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
  "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre",
];

const HOUR_START = 6;
const HOUR_END = 23; // última hora mostrada
const HOUR_HEIGHT = 52; // px por hora

// ============================================
// Utilidades de fecha (sin librerías externas)
// ============================================

function toISODate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function parseISODate(s: string): Date {
  const [y, m, d] = s.split("-").map(Number);
  return new Date(y, m - 1, d);
}

function startOfDay(d: Date): Date {
  const c = new Date(d);
  c.setHours(0, 0, 0, 0);
  return c;
}

function addDays(d: Date, n: number): Date {
  const c = new Date(d);
  c.setDate(c.getDate() + n);
  return c;
}

// Lunes=0 ... Domingo=6
function isoWeekday(d: Date): number {
  return (d.getDay() + 6) % 7;
}

function startOfWeek(d: Date): Date {
  return addDays(startOfDay(d), -isoWeekday(d));
}

function startOfMonth(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), 1);
}

function timeToMinutes(t: string): number {
  const [h, m] = t.split(":").map(Number);
  return h * 60 + m;
}

function minutesToLabel(min: number): string {
  const h = Math.floor(min / 60);
  const m = min % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

// ============================================
// Expansión de ocurrencias (eventos puntuales + recurrentes)
// ============================================

interface Occurrence {
  event: PlanningEvent;
  date: string; // fecha ISO de esta aparición concreta
}

function expandOccurrences(events: PlanningEvent[], rangeStart: Date, rangeEnd: Date): Occurrence[] {
  const out: Occurrence[] = [];
  for (const ev of events) {
    if (!ev.is_recurring) {
      const d = parseISODate(ev.date);
      if (d >= rangeStart && d <= rangeEnd) out.push({ event: ev, date: ev.date });
      continue;
    }
    const days = ev.recurrence_days ?? [];
    if (days.length === 0) continue;
    const seriesStart = parseISODate(ev.date);
    const seriesEnd = ev.recurrence_until ? parseISODate(ev.recurrence_until) : null;
    const excluded = new Set(ev.excluded_dates ?? []);
    const iterStart = seriesStart > rangeStart ? seriesStart : rangeStart;
    const iterEnd = seriesEnd && seriesEnd < rangeEnd ? seriesEnd : rangeEnd;
    for (let d = new Date(iterStart); d <= iterEnd; d = addDays(d, 1)) {
      if (!days.includes(isoWeekday(d))) continue;
      const iso = toISODate(d);
      if (excluded.has(iso)) continue;
      out.push({ event: ev, date: iso });
    }
  }
  return out.sort((a, b) => {
    if (a.date !== b.date) return a.date.localeCompare(b.date);
    return (a.event.start_time ?? "").localeCompare(b.event.start_time ?? "");
  });
}

// Reparto de columnas para eventos con horario solapado dentro de un mismo día
function layoutTimedEvents(occs: Occurrence[]) {
  const timed = occs
    .filter((o) => o.event.start_time && o.event.end_time)
    .map((o) => ({ ...o, startMin: timeToMinutes(o.event.start_time!), endMin: timeToMinutes(o.event.end_time!) }))
    .sort((a, b) => a.startMin - b.startMin);

  const colEnds: number[] = [];
  const withCol = timed.map((o) => {
    let col = colEnds.findIndex((end) => end <= o.startMin);
    if (col === -1) {
      col = colEnds.length;
      colEnds.push(o.endMin);
    } else {
      colEnds[col] = o.endMin;
    }
    return { ...o, col };
  });
  const totalCols = colEnds.length || 1;
  return withCol.map((o) => ({ ...o, totalCols }));
}

type ViewMode = "week" | "month";

interface ModalState {
  mode: "create" | "edit";
  event?: PlanningEvent;
  occurrenceDate?: string; // fecha concreta clicada (relevante para series recurrentes)
}

const emptyForm = () => ({
  title: "",
  type: "training" as PlanningEventType,
  date: toISODate(new Date()),
  startTime: "",
  endTime: "",
  notes: "",
  isRecurring: false,
  recurrenceDays: new Set<number>(),
  recurrenceUntil: "",
});

export default function PlanificacionPage() {
  const [events, setEvents] = useState<PlanningEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<ViewMode>("week");
  const [cursor, setCursor] = useState<Date>(() => startOfDay(new Date()));
  const [modal, setModal] = useState<ModalState | null>(null);
  const [dayPanel, setDayPanel] = useState<string | null>(null); // fecha ISO del panel de día (vista mes)
  const [saving, setSaving] = useState(false);
  const [deleteScope, setDeleteScope] = useState(false); // elección "solo este día / toda la serie"

  const [form, setForm] = useState(emptyForm());

  const load = useCallback(async () => {
    try {
      const data = await getPlanningEvents();
      setEvents(data);
    } catch (err) {
      console.error("Error loading planning events:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  // ---- Rango visible ----
  const weekStart = useMemo(() => startOfWeek(cursor), [cursor]);
  const weekDays = useMemo(() => Array.from({ length: 7 }, (_, i) => addDays(weekStart, i)), [weekStart]);

  const monthStart = useMemo(() => startOfMonth(cursor), [cursor]);
  const monthGridStart = useMemo(() => startOfWeek(monthStart), [monthStart]);
  const monthGridDays = useMemo(() => Array.from({ length: 42 }, (_, i) => addDays(monthGridStart, i)), [monthGridStart]);

  const rangeStart = view === "week" ? weekStart : monthGridStart;
  const rangeEnd = view === "week" ? addDays(weekStart, 6) : addDays(monthGridStart, 41);

  const occurrences = useMemo(() => expandOccurrences(events, rangeStart, rangeEnd), [events, rangeStart, rangeEnd]);

  const occByDate = useMemo(() => {
    const map = new Map<string, Occurrence[]>();
    for (const occ of occurrences) {
      const list = map.get(occ.date) ?? [];
      list.push(occ);
      map.set(occ.date, list);
    }
    return map;
  }, [occurrences]);

  // ---- Navegación ----
  const goPrev = () => setCursor((c) => (view === "week" ? addDays(c, -7) : new Date(c.getFullYear(), c.getMonth() - 1, 1)));
  const goNext = () => setCursor((c) => (view === "week" ? addDays(c, 7) : new Date(c.getFullYear(), c.getMonth() + 1, 1)));
  const goToday = () => setCursor(startOfDay(new Date()));

  const rangeLabel = view === "week"
    ? (() => {
        const end = addDays(weekStart, 6);
        const sameMonth = weekStart.getMonth() === end.getMonth();
        const startLabel = `${weekStart.getDate()}${sameMonth ? "" : ` ${MONTH_LONG[weekStart.getMonth()].slice(0, 3)}`}`;
        return `${startLabel} – ${end.getDate()} ${MONTH_LONG[end.getMonth()]} ${end.getFullYear()}`;
      })()
    : `${MONTH_LONG[monthStart.getMonth()]} ${monthStart.getFullYear()}`;

  // ---- Modal: abrir/cerrar ----
  const openCreate = (date: string, startTime = "") => {
    setForm({
      ...emptyForm(),
      date,
      startTime,
      endTime: startTime ? minutesToLabel(timeToMinutes(startTime) + 60) : "",
    });
    setDeleteScope(false);
    setModal({ mode: "create" });
  };

  const openEdit = (event: PlanningEvent, occurrenceDate: string) => {
    setForm({
      title: event.title,
      type: event.type,
      date: event.date,
      startTime: event.start_time ?? "",
      endTime: event.end_time ?? "",
      notes: event.notes ?? "",
      isRecurring: event.is_recurring,
      recurrenceDays: new Set(event.recurrence_days ?? []),
      recurrenceUntil: event.recurrence_until ?? "",
    });
    setDeleteScope(false);
    setModal({ mode: "edit", event, occurrenceDate });
  };

  const closeModal = () => {
    setModal(null);
    setDeleteScope(false);
  };

  const toggleRecurrenceDay = (day: number) => {
    setForm((f) => {
      const next = new Set(f.recurrenceDays);
      if (next.has(day)) next.delete(day);
      else next.add(day);
      return { ...f, recurrenceDays: next };
    });
  };

  // ---- Guardar ----
  const handleSave = async () => {
    if (!form.title.trim() || saving) return;
    if (form.isRecurring && form.recurrenceDays.size === 0) return;
    setSaving(true);
    try {
      const payload = {
        title: form.title.trim(),
        type: form.type,
        notes: form.notes.trim(),
        date: form.date,
        start_time: form.startTime || null,
        end_time: form.endTime || null,
        is_recurring: form.isRecurring,
        recurrence_days: form.isRecurring ? Array.from(form.recurrenceDays).sort((a, b) => a - b) : null,
        recurrence_until: form.isRecurring ? (form.recurrenceUntil || null) : null,
        excluded_dates: modal?.event?.excluded_dates ?? [],
        archived: false,
      };
      if (modal?.mode === "edit" && modal.event) {
        await updatePlanningEvent(modal.event.id, payload);
      } else {
        await createPlanningEvent(payload);
      }
      await load();
      closeModal();
    } catch (err) {
      console.error("Error saving planning event:", err);
    } finally {
      setSaving(false);
    }
  };

  // ---- Borrar ----
  const handleDeleteClick = async () => {
    if (!modal?.event) return;
    if (modal.event.is_recurring) {
      setDeleteScope(true);
      return;
    }
    if (!confirm("¿Eliminar este evento?")) return;
    try {
      await deletePlanningEvent(modal.event.id);
      await load();
      closeModal();
    } catch (err) {
      console.error("Error deleting event:", err);
    }
  };

  const handleDeleteOccurrence = async () => {
    if (!modal?.event || !modal.occurrenceDate) return;
    try {
      const nextExcluded = [...(modal.event.excluded_dates ?? []), modal.occurrenceDate];
      await updatePlanningEvent(modal.event.id, { excluded_dates: nextExcluded });
      await load();
      closeModal();
    } catch (err) {
      console.error("Error deleting occurrence:", err);
    }
  };

  const handleDeleteSeries = async () => {
    if (!modal?.event) return;
    if (!confirm("Esto eliminará todas las repeticiones de esta serie. ¿Continuar?")) return;
    try {
      await deletePlanningEvent(modal.event.id);
      await load();
      closeModal();
    } catch (err) {
      console.error("Error deleting series:", err);
    }
  };

  return (
    <div>
      {/* Encabezado */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Planificación</h1>
          <div className="flex items-center gap-4 mt-2 text-sm">
            <button
              onClick={() => setView("week")}
              className={view === "week" ? "text-teal-400 font-medium border-b-2 border-teal-400 pb-0.5" : "text-muted hover:text-foreground-secondary"}
            >
              Semana
            </button>
            <button
              onClick={() => setView("month")}
              className={view === "month" ? "text-teal-400 font-medium border-b-2 border-teal-400 pb-0.5" : "text-muted hover:text-foreground-secondary"}
            >
              Mes
            </button>
          </div>
        </div>
        <button
          onClick={() => openCreate(toISODate(new Date()))}
          className="px-4 py-2 bg-teal-600 text-white rounded-lg text-sm font-medium hover:bg-teal-700 transition-colors"
        >
          + Nuevo evento
        </button>
      </div>

      {/* Barra de navegación de fechas */}
      <div className="flex items-center justify-between bg-surface border border-border rounded-lg px-4 py-2 mb-4">
        <button onClick={goPrev} className="w-7 h-7 flex items-center justify-center rounded hover:bg-surface-hover text-foreground-secondary">‹</button>
        <div className="flex items-center gap-3">
          <h2 className="text-sm font-semibold text-foreground capitalize">{rangeLabel}</h2>
          <button onClick={goToday} className="px-2.5 py-1 text-xs rounded-md border border-border text-foreground-secondary hover:border-teal-400 hover:text-teal-400 transition-colors">
            Hoy
          </button>
        </div>
        <button onClick={goNext} className="w-7 h-7 flex items-center justify-center rounded hover:bg-surface-hover text-foreground-secondary">›</button>
      </div>

      {/* Leyenda de tipos */}
      <div className="flex flex-wrap items-center gap-3 mb-4">
        {TYPE_ORDER.map((t) => (
          <span key={t} className="flex items-center gap-1.5 text-xs text-foreground-secondary">
            <span className="w-2.5 h-2.5 rounded-full" style={{ background: TYPE_CONFIG[t].accent }} />
            {TYPE_CONFIG[t].label}
          </span>
        ))}
      </div>

      {loading ? (
        <p className="text-sm text-muted">Cargando...</p>
      ) : view === "week" ? (
        <WeekView days={weekDays} occByDate={occByDate} onSlotClick={openCreate} onEventClick={openEdit} />
      ) : (
        <MonthView days={monthGridDays} monthRef={monthStart} occByDate={occByDate} onDayClick={(iso) => setDayPanel(iso)} />
      )}

      {/* Panel de día (vista mes) */}
      {dayPanel && (
        <DayPanel
          date={dayPanel}
          occurrences={occByDate.get(dayPanel) ?? []}
          onClose={() => setDayPanel(null)}
          onAdd={() => {
            openCreate(dayPanel);
            setDayPanel(null);
          }}
          onEdit={(ev, occDate) => {
            openEdit(ev, occDate);
            setDayPanel(null);
          }}
        />
      )}

      {/* Modal crear/editar evento */}
      {modal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50" onClick={closeModal}>
          <div
            className="bg-surface rounded-xl p-6 w-full max-w-md shadow-xl border border-border max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="font-semibold text-foreground mb-4">{modal.mode === "edit" ? "Editar evento" : "Nuevo evento"}</h3>

            {modal.mode === "edit" && modal.event?.is_recurring && !deleteScope && (
              <p className="text-xs text-teal-400 rounded-lg px-3 py-2 mb-3" style={{ background: "#2dd4bf1a" }}>
                Esto forma parte de una serie recurrente. Los cambios se aplican a todas sus repeticiones.
              </p>
            )}

            {deleteScope ? (
              <div className="space-y-2">
                <p className="text-sm text-foreground-secondary mb-3">
                  ¿Quieres eliminar solo esta aparición
                  {modal.occurrenceDate ? ` (${parseISODate(modal.occurrenceDate).toLocaleDateString("es-ES")})` : ""} o toda la serie recurrente?
                </p>
                <button onClick={handleDeleteOccurrence} className="w-full px-3 py-2 bg-surface-hover border border-border rounded-lg text-sm text-foreground hover:border-red-400">
                  Eliminar solo este día
                </button>
                <button onClick={handleDeleteSeries} className="w-full px-3 py-2 bg-red-600 text-white rounded-lg text-sm hover:bg-red-700">
                  Eliminar toda la serie
                </button>
                <button onClick={() => setDeleteScope(false)} className="w-full px-3 py-2 text-sm text-foreground-secondary">
                  Cancelar
                </button>
              </div>
            ) : (
              <>
                <input
                  autoFocus
                  value={form.title}
                  onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                  placeholder="Título (ej. Sesión táctica, Gimnasio piernas...)"
                  className="w-full px-3 py-2 bg-surface-hover border border-border rounded-lg text-sm text-foreground mb-3 focus:outline-none focus:border-teal-400"
                />

                <div className="flex flex-wrap gap-1.5 mb-3">
                  {TYPE_ORDER.map((t) => (
                    <button
                      key={t}
                      onClick={() => setForm((f) => ({ ...f, type: t }))}
                      className="px-2.5 py-1.5 rounded-lg text-xs font-medium flex items-center gap-1.5 transition-colors"
                      style={
                        form.type === t
                          ? { background: `${TYPE_CONFIG[t].accent}22`, color: TYPE_CONFIG[t].accent, boxShadow: `inset 0 0 0 1.5px ${TYPE_CONFIG[t].accent}` }
                          : { background: "var(--surface-hover)", color: "var(--foreground-secondary)" }
                      }
                    >
                      <span>{TYPE_CONFIG[t].icon}</span>
                      {TYPE_CONFIG[t].label}
                    </button>
                  ))}
                </div>

                <div className="grid grid-cols-2 gap-2 mb-1">
                  <label className="block">
                    <span className="text-xs text-muted mb-1 block">{form.isRecurring ? "A partir de" : "Fecha"}</span>
                    <input
                      type="date"
                      value={form.date}
                      onChange={(e) => setForm((f) => ({ ...f, date: e.target.value }))}
                      className="w-full px-2.5 py-1.5 bg-surface-hover border border-border rounded-lg text-sm text-foreground focus:outline-none focus:border-teal-400"
                    />
                  </label>
                  <div />
                  <label className="block">
                    <span className="text-xs text-muted mb-1 block">Hora inicio</span>
                    <input
                      type="time"
                      value={form.startTime}
                      onChange={(e) => setForm((f) => ({ ...f, startTime: e.target.value }))}
                      className="w-full px-2.5 py-1.5 bg-surface-hover border border-border rounded-lg text-sm text-foreground focus:outline-none focus:border-teal-400"
                    />
                  </label>
                  <label className="block">
                    <span className="text-xs text-muted mb-1 block">Hora fin</span>
                    <input
                      type="time"
                      value={form.endTime}
                      onChange={(e) => setForm((f) => ({ ...f, endTime: e.target.value }))}
                      className="w-full px-2.5 py-1.5 bg-surface-hover border border-border rounded-lg text-sm text-foreground focus:outline-none focus:border-teal-400"
                    />
                  </label>
                </div>
                <p className="text-[10px] text-muted mb-3">Deja las horas en blanco para un evento de todo el día.</p>

                <label className="flex items-center gap-2 mb-3 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={form.isRecurring}
                    onChange={(e) => setForm((f) => ({ ...f, isRecurring: e.target.checked }))}
                    className="accent-teal-500"
                  />
                  <span className="text-sm text-foreground-secondary">Se repite</span>
                </label>

                {form.isRecurring && (
                  <div className="mb-3 p-3 bg-surface-hover border border-border rounded-lg space-y-2">
                    <div className="flex gap-1.5">
                      {WEEKDAY_SHORT.map((label, i) => (
                        <button
                          key={i}
                          onClick={() => toggleRecurrenceDay(i)}
                          className={`w-8 h-8 rounded-full text-xs font-medium transition-colors ${
                            form.recurrenceDays.has(i) ? "bg-teal-600 text-white" : "bg-surface border border-border text-foreground-secondary hover:border-teal-400"
                          }`}
                        >
                          {label}
                        </button>
                      ))}
                    </div>
                    <label className="block">
                      <span className="text-xs text-muted mb-1 block">Hasta (opcional)</span>
                      <input
                        type="date"
                        value={form.recurrenceUntil}
                        onChange={(e) => setForm((f) => ({ ...f, recurrenceUntil: e.target.value }))}
                        className="w-full px-2.5 py-1.5 bg-surface border border-border rounded-lg text-sm text-foreground focus:outline-none focus:border-teal-400"
                      />
                    </label>
                  </div>
                )}

                <textarea
                  value={form.notes}
                  onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
                  placeholder="Notas (opcional)"
                  rows={2}
                  className="w-full px-3 py-2 bg-surface-hover border border-border rounded-lg text-sm text-foreground mb-4 focus:outline-none focus:border-teal-400 resize-none"
                />

                <div className="flex items-center gap-2">
                  <button
                    onClick={handleSave}
                    disabled={!form.title.trim() || saving || (form.isRecurring && form.recurrenceDays.size === 0)}
                    className="px-4 py-2 bg-teal-600 text-white rounded-lg text-sm font-medium hover:bg-teal-700 disabled:opacity-40"
                  >
                    {saving ? "Guardando..." : "Guardar"}
                  </button>
                  <button onClick={closeModal} className="px-4 py-2 text-sm text-foreground-secondary">
                    Cancelar
                  </button>
                  {modal.mode === "edit" && (
                    <button onClick={handleDeleteClick} className="ml-auto px-3 py-2 text-sm text-red-400 hover:text-red-300">
                      Eliminar
                    </button>
                  )}
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ============================================
// Vista semanal
// ============================================

function WeekView({
  days,
  occByDate,
  onSlotClick,
  onEventClick,
}: {
  days: Date[];
  occByDate: Map<string, Occurrence[]>;
  onSlotClick: (date: string, startTime?: string) => void;
  onEventClick: (event: PlanningEvent, occurrenceDate: string) => void;
}) {
  const today = toISODate(new Date());
  const hours = Array.from({ length: HOUR_END - HOUR_START + 1 }, (_, i) => HOUR_START + i);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: Math.max(0, (8 - HOUR_START) * HOUR_HEIGHT - 20) });
  }, []);

  return (
    <div className="bg-surface border border-border rounded-xl overflow-hidden">
      {/* Cabecera de días */}
      <div className="grid" style={{ gridTemplateColumns: "56px repeat(7, 1fr)" }}>
        <div className="border-b border-r border-border" />
        {days.map((d) => {
          const iso = toISODate(d);
          const isToday = iso === today;
          return (
            <div key={iso} className={`border-b border-border px-2 py-2 text-center ${isToday ? "bg-teal-500/10" : ""}`}>
              <p className="text-[10px] text-muted uppercase">{WEEKDAY_LONG[isoWeekday(d)].slice(0, 3)}</p>
              <p className={`text-sm font-semibold ${isToday ? "text-teal-400" : "text-foreground"}`}>{d.getDate()}</p>
            </div>
          );
        })}
      </div>

      {/* Fila de eventos de todo el día */}
      <div className="grid" style={{ gridTemplateColumns: "56px repeat(7, 1fr)" }}>
        <div className="border-b border-r border-border flex items-center justify-center text-[10px] text-muted">Día</div>
        {days.map((d) => {
          const iso = toISODate(d);
          const allDay = (occByDate.get(iso) ?? []).filter((o) => !o.event.start_time || !o.event.end_time);
          return (
            <div key={iso} className="border-b border-border p-1 space-y-1 min-h-[32px]">
              {allDay.map((o) => (
                <button
                  key={`${o.event.id}-${o.date}`}
                  onClick={() => onEventClick(o.event, o.date)}
                  className="w-full text-left px-1.5 py-0.5 rounded text-[10px] font-medium truncate block"
                  style={{ background: `${TYPE_CONFIG[o.event.type].accent}22`, color: TYPE_CONFIG[o.event.type].accent }}
                >
                  {TYPE_CONFIG[o.event.type].icon} {o.event.title}
                </button>
              ))}
            </div>
          );
        })}
      </div>

      {/* Cuadrícula horaria */}
      <div ref={scrollRef} className="overflow-y-auto max-h-[600px]">
        <div className="grid" style={{ gridTemplateColumns: "56px repeat(7, 1fr)" }}>
          <div>
            {hours.map((h) => (
              <div key={h} style={{ height: HOUR_HEIGHT }} className="border-r border-b border-border text-[10px] text-muted text-right pr-1.5 pt-0.5">
                {String(h).padStart(2, "0")}:00
              </div>
            ))}
          </div>

          {days.map((d) => {
            const iso = toISODate(d);
            const timed = layoutTimedEvents(occByDate.get(iso) ?? []);
            return (
              <div
                key={iso}
                className="relative border-r border-border"
                style={{ height: HOUR_HEIGHT * hours.length }}
                onClick={(e) => {
                  const rect = e.currentTarget.getBoundingClientRect();
                  const y = e.clientY - rect.top;
                  const totalMin = HOUR_START * 60 + (y / HOUR_HEIGHT) * 60;
                  const rounded = Math.round(totalMin / 30) * 30;
                  onSlotClick(iso, minutesToLabel(rounded));
                }}
              >
                {hours.map((h) => (
                  <div key={h} className="border-b border-border" style={{ height: HOUR_HEIGHT }} />
                ))}
                {timed.map((o) => {
                  const top = ((o.startMin - HOUR_START * 60) / 60) * HOUR_HEIGHT;
                  const height = Math.max(20, ((o.endMin - o.startMin) / 60) * HOUR_HEIGHT);
                  const width = 100 / o.totalCols;
                  const left = o.col * width;
                  const accent = TYPE_CONFIG[o.event.type].accent;
                  return (
                    <button
                      key={`${o.event.id}-${o.date}`}
                      onClick={(e) => {
                        e.stopPropagation();
                        onEventClick(o.event, o.date);
                      }}
                      className="absolute rounded-md px-1.5 py-0.5 text-left overflow-hidden text-[10px] leading-tight"
                      style={{
                        top,
                        height,
                        left: `${left}%`,
                        width: `calc(${width}% - 3px)`,
                        background: `${accent}26`,
                        borderLeft: `3px solid ${accent}`,
                        color: accent,
                      }}
                    >
                      <span className="font-semibold block truncate">{o.event.title}</span>
                      <span className="block truncate opacity-80">
                        {o.event.start_time}–{o.event.end_time}
                      </span>
                    </button>
                  );
                })}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ============================================
// Vista mensual
// ============================================

function MonthView({
  days,
  monthRef,
  occByDate,
  onDayClick,
}: {
  days: Date[];
  monthRef: Date;
  occByDate: Map<string, Occurrence[]>;
  onDayClick: (iso: string) => void;
}) {
  const today = toISODate(new Date());
  const currentMonth = monthRef.getMonth();

  return (
    <div className="bg-surface border border-border rounded-xl overflow-hidden">
      <div className="grid grid-cols-7">
        {WEEKDAY_LONG.map((d) => (
          <div key={d} className="px-2 py-2 text-center text-[10px] font-semibold text-muted uppercase border-b border-border">
            {d.slice(0, 3)}
          </div>
        ))}
      </div>
      <div className="grid grid-cols-7">
        {days.map((d) => {
          const iso = toISODate(d);
          const isToday = iso === today;
          const inMonth = d.getMonth() === currentMonth;
          const dayOccs = occByDate.get(iso) ?? [];
          const visible = dayOccs.slice(0, 3);
          const extra = dayOccs.length - visible.length;
          return (
            <div
              key={iso}
              onClick={() => onDayClick(iso)}
              className={`min-h-[96px] border-b border-r border-border p-1.5 cursor-pointer hover:bg-surface-hover transition-colors ${!inMonth ? "opacity-40" : ""}`}
            >
              <span
                className={`inline-flex items-center justify-center w-5 h-5 rounded-full text-xs ${
                  isToday ? "bg-teal-600 text-white font-semibold" : "text-foreground-secondary"
                }`}
              >
                {d.getDate()}
              </span>
              <div className="mt-1 space-y-0.5">
                {visible.map((o) => (
                  <div
                    key={`${o.event.id}-${o.date}`}
                    className="px-1 py-0.5 rounded text-[9px] font-medium truncate"
                    style={{ background: `${TYPE_CONFIG[o.event.type].accent}22`, color: TYPE_CONFIG[o.event.type].accent }}
                  >
                    {o.event.start_time ? `${o.event.start_time} ` : ""}
                    {o.event.title}
                  </div>
                ))}
                {extra > 0 && <p className="text-[9px] text-muted px-1">+{extra} más</p>}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ============================================
// Panel de día (usado desde la vista mensual)
// ============================================

function DayPanel({
  date,
  occurrences,
  onClose,
  onAdd,
  onEdit,
}: {
  date: string;
  occurrences: Occurrence[];
  onClose: () => void;
  onAdd: () => void;
  onEdit: (event: PlanningEvent, occurrenceDate: string) => void;
}) {
  const d = parseISODate(date);
  const label = `${WEEKDAY_LONG[isoWeekday(d)]} ${d.getDate()} de ${MONTH_LONG[d.getMonth()]}`;
  const sorted = [...occurrences].sort((a, b) => (a.event.start_time ?? "").localeCompare(b.event.start_time ?? ""));

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50" onClick={onClose}>
      <div className="bg-surface rounded-xl p-6 w-full max-w-sm shadow-xl border border-border max-h-[85vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-foreground capitalize">{label}</h3>
          <button onClick={onClose} className="text-muted hover:text-foreground">
            ✕
          </button>
        </div>

        {sorted.length === 0 ? (
          <p className="text-sm text-muted mb-4">Sin eventos este día.</p>
        ) : (
          <div className="space-y-2 mb-4">
            {sorted.map((o) => {
              const accent = TYPE_CONFIG[o.event.type].accent;
              return (
                <button
                  key={`${o.event.id}-${o.date}`}
                  onClick={() => onEdit(o.event, o.date)}
                  className="w-full text-left px-3 py-2 rounded-lg flex items-center gap-2 hover:brightness-110 transition"
                  style={{ background: `${accent}18`, borderLeft: `3px solid ${accent}` }}
                >
                  <span>{TYPE_CONFIG[o.event.type].icon}</span>
                  <div className="min-w-0">
                    <p className="text-sm font-medium truncate" style={{ color: accent }}>
                      {o.event.title}
                    </p>
                    {(o.event.start_time || o.event.end_time) && (
                      <p className="text-[10px] text-muted">
                        {o.event.start_time ?? "?"} – {o.event.end_time ?? "?"}
                      </p>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        )}

        <button onClick={onAdd} className="w-full px-3 py-2 bg-teal-600 text-white rounded-lg text-sm font-medium hover:bg-teal-700">
          + Añadir evento
        </button>
      </div>
    </div>
  );
}
