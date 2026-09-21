"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  getSessionById,
  updateSession,
  deleteSession,
  duplicateSession,
  getPlayers,
  getTasks,
  addSessionTask,
  updateSessionTask,
  removeSessionTask,
  type SessionInput,
} from "@/lib/api";
import { getTagColor } from "@/lib/tagColors";
import type { Session, SessionStatus, SessionPart, SessionTask, SessionTeam, Player, Task } from "@/types";

const STATUS_OPTIONS: { key: SessionStatus; label: string }[] = [
  { key: "planificada", label: "Planificada" },
  { key: "realizada", label: "Realizada" },
  { key: "plantilla", label: "Plantilla" },
];

const PARTS: { key: SessionPart; label: string; short: string; bar: string }[] = [
  { key: "inicial", label: "Parte inicial", short: "Activación", bar: "bg-sky-500" },
  { key: "principal", label: "Parte principal", short: "Principal", bar: "bg-emerald-500" },
  { key: "final", label: "Parte final", short: "Vuelta a la calma", bar: "bg-amber-500" },
];

const TEAM_COLORS = [
  { bg: "bg-sky-500", dot: "bg-sky-500" },
  { bg: "bg-rose-500", dot: "bg-rose-500" },
  { bg: "bg-amber-500", dot: "bg-amber-500" },
  { bg: "bg-violet-500", dot: "bg-violet-500" },
];
const TEAM_LETTERS = ["A", "B", "C", "D"];

function newTeam(index: number): SessionTeam {
  return {
    id: crypto.randomUUID(),
    name: `Equipo ${TEAM_LETTERS[index]}`,
    color: TEAM_COLORS[index % TEAM_COLORS.length].bg,
    player_ids: [],
  };
}

function playerLabel(p: Player): string {
  return `${p.full_name}${p.squad_number != null ? ` (${p.squad_number})` : ""}`;
}

export default function SesionDetailPage() {
  const params = useParams();
  const id = params.id as string;
  const router = useRouter();

  const [session, setSession] = useState<Session | null>(null);
  const [players, setPlayers] = useState<Player[]>([]);
  const [allTasks, setAllTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [name, setName] = useState("");
  const [squadModalOpen, setSquadModalOpen] = useState(false);
  const [taskPickerPart, setTaskPickerPart] = useState<SessionPart | null>(null);
  const [teamBuilderFor, setTeamBuilderFor] = useState<SessionTask | null>(null);

  useEffect(() => {
    Promise.all([getSessionById(id), getPlayers(), getTasks()])
      .then(([s, p, t]) => {
        setSession(s);
        setName(s.name);
        setPlayers(p);
        setAllTasks(t);
      })
      .catch((err) => console.error("Error al cargar la sesión:", err))
      .finally(() => setLoading(false));
  }, [id]);

  const saveField = useCallback(
    async (patch: Partial<SessionInput>) => {
      await updateSession(id, patch);
      setSession((prev) => (prev ? { ...prev, ...patch } : prev));
    },
    [id]
  );

  const handlePrint = () => window.print();

  const handleDuplicate = async () => {
    if (!session) return;
    const created = await duplicateSession(session.id, `${session.name} (copia)`);
    router.push(`/sesiones/${created.id}`);
  };

  const handleDelete = async () => {
    if (!session) return;
    if (!confirm(`¿Eliminar "${session.name}"?`)) return;
    await deleteSession(session.id);
    router.push("/sesiones");
  };

  const addTaskToPart = async (task: Task, part: SessionPart) => {
    if (!session) return;
    const siblingCount = (session.session_tasks ?? []).filter((st) => st.part === part).length;
    const created = await addSessionTask({ session_id: session.id, task_id: task.id, part, position: siblingCount });
    const withTask: SessionTask = { ...created, task };
    setSession((prev) => (prev ? { ...prev, session_tasks: [...(prev.session_tasks ?? []), withTask] } : prev));
    setTaskPickerPart(null);
  };

  const moveTask = async (st: SessionTask, direction: -1 | 1) => {
    if (!session) return;
    const siblings = (session.session_tasks ?? [])
      .filter((x) => x.part === st.part)
      .sort((a, b) => a.position - b.position);
    const idx = siblings.findIndex((x) => x.id === st.id);
    const targetIdx = idx + direction;
    if (targetIdx < 0 || targetIdx >= siblings.length) return;
    const other = siblings[targetIdx];
    await Promise.all([
      updateSessionTask(st.id, { position: other.position }),
      updateSessionTask(other.id, { position: st.position }),
    ]);
    setSession((prev) => {
      if (!prev) return prev;
      const next = (prev.session_tasks ?? []).map((x) => {
        if (x.id === st.id) return { ...x, position: other.position };
        if (x.id === other.id) return { ...x, position: st.position };
        return x;
      });
      return { ...prev, session_tasks: next };
    });
  };

  const removeTask = async (st: SessionTask) => {
    if (!confirm("¿Quitar esta tarea de la sesión?")) return;
    await removeSessionTask(st.id);
    setSession((prev) =>
      prev ? { ...prev, session_tasks: (prev.session_tasks ?? []).filter((x) => x.id !== st.id) } : prev
    );
  };

  const saveTeams = async (st: SessionTask, teams: SessionTeam[], wIn: string[], wOut: string[]) => {
    await updateSessionTask(st.id, { teams, wildcards_inside: wIn, wildcards_outside: wOut });
    setSession((prev) =>
      prev
        ? {
            ...prev,
            session_tasks: (prev.session_tasks ?? []).map((x) =>
              x.id === st.id ? { ...x, teams, wildcards_inside: wIn, wildcards_outside: wOut } : x
            ),
          }
        : prev
    );
    setTeamBuilderFor(null);
  };

  const saveSquad = async (ids: string[]) => {
    await saveField({ squad_player_ids: ids });
    setSquadModalOpen(false);
  };

  const partMinutes = useCallback(
    (part: SessionPart) =>
      (session?.session_tasks ?? [])
        .filter((st) => st.part === part && st.task)
        .reduce((sum, st) => sum + (st.task?.duration_minutes ?? 0), 0),
    [session]
  );

  const totalMinutes = useMemo(() => PARTS.reduce((sum, p) => sum + partMinutes(p.key), 0), [partMinutes]);

  const squadPlayers = useMemo(
    () => players.filter((p) => session?.squad_player_ids.includes(p.id)),
    [players, session]
  );

  if (loading || !session) {
    return <div className="text-muted text-sm">Cargando sesión…</div>;
  }

  return (
    <div>
      {/* ===== Vista interactiva (oculta al imprimir) ===== */}
      <div className="print:hidden">
        <button onClick={() => router.push("/sesiones")} className="text-sm text-muted hover:text-foreground mb-4">
          ← Sesiones
        </button>

        <div className="flex items-start justify-between gap-4 mb-6 flex-wrap">
          <div className="flex-1 min-w-[280px]">
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              onBlur={() => name.trim() && name !== session.name && saveField({ name: name.trim() })}
              className="text-2xl font-bold text-foreground bg-transparent border-b border-transparent hover:border-border focus:border-emerald-500 focus:outline-none w-full"
            />
            <div className="flex flex-wrap items-center gap-2 mt-2.5">
              <select
                value={session.status}
                onChange={(e) => saveField({ status: e.target.value as SessionStatus })}
                className="bg-surface border border-border rounded-lg px-2.5 py-1.5 text-xs text-foreground focus:outline-none focus:border-emerald-500"
              >
                {STATUS_OPTIONS.map((s) => (
                  <option key={s.key} value={s.key}>{s.label}</option>
                ))}
              </select>
              <input
                type="date"
                value={session.session_date ?? ""}
                onChange={(e) => saveField({ session_date: e.target.value || null })}
                className="bg-surface border border-border rounded-lg px-2.5 py-1.5 text-xs text-foreground focus:outline-none focus:border-emerald-500"
              />
              <input
                defaultValue={session.team_label}
                onBlur={(e) => e.target.value !== session.team_label && saveField({ team_label: e.target.value })}
                placeholder="Equipo (ej. Primer equipo)"
                className="bg-surface border border-border rounded-lg px-2.5 py-1.5 text-xs text-foreground placeholder:text-muted focus:outline-none focus:border-emerald-500 w-44"
              />
              <button onClick={() => saveField({ favorite: !session.favorite })} className="text-lg leading-none px-1">
                {session.favorite ? "⭐" : <span className="text-muted">☆</span>}
              </button>
            </div>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            <button
              onClick={handlePrint}
              className="px-3.5 py-2 bg-surface border border-border rounded-lg text-sm text-foreground-secondary hover:text-foreground transition-colors"
            >
              🖨 Imprimir
            </button>
            <button
              onClick={handleDuplicate}
              className="px-3.5 py-2 bg-surface border border-border rounded-lg text-sm text-foreground-secondary hover:text-foreground transition-colors"
            >
              Duplicar
            </button>
            <button
              onClick={handleDelete}
              className="px-3.5 py-2 bg-surface border border-border rounded-lg text-sm text-rose-400 hover:bg-rose-500/10 transition-colors"
            >
              Eliminar
            </button>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4 mb-6">
          <textarea
            defaultValue={session.objective}
            onBlur={(e) => e.target.value !== session.objective && saveField({ objective: e.target.value })}
            placeholder="Objetivo de la sesión…"
            rows={2}
            className="bg-surface border border-border rounded-lg px-3 py-2 text-sm text-foreground placeholder:text-muted focus:outline-none focus:border-emerald-500 resize-none"
          />
          <textarea
            defaultValue={session.notes}
            onBlur={(e) => e.target.value !== session.notes && saveField({ notes: e.target.value })}
            placeholder="Notas…"
            rows={2}
            className="bg-surface border border-border rounded-lg px-3 py-2 text-sm text-foreground placeholder:text-muted focus:outline-none focus:border-emerald-500 resize-none"
          />
        </div>

        {/* Convocatoria */}
        <div className="bg-surface border border-border rounded-xl p-4 mb-6">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-semibold text-foreground">Convocatoria ({squadPlayers.length} jugadoras)</h3>
            <button
              onClick={() => setSquadModalOpen(true)}
              className="text-xs text-emerald-400 hover:text-emerald-300 font-medium"
            >
              Editar convocatoria
            </button>
          </div>
          {squadPlayers.length === 0 ? (
            <p className="text-xs text-muted italic">
              Sin convocatoria definida — añádela para poder repartir equipos en cada tarea.
            </p>
          ) : (
            <div className="flex flex-wrap gap-1.5">
              {squadPlayers.map((p) => (
                <span key={p.id} className="px-2 py-0.5 rounded-full bg-surface-hover text-foreground-secondary text-[11px]">
                  {playerLabel(p)}
                </span>
              ))}
            </div>
          )}
        </div>

        {/* Partes */}
        <div className="space-y-5">
          {PARTS.map((part) => {
            const tasks = (session.session_tasks ?? [])
              .filter((st) => st.part === part.key)
              .sort((a, b) => a.position - b.position);
            return (
              <div key={part.key} className="bg-surface border border-border rounded-xl p-4">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <span className={`w-2 h-2 rounded-full ${part.bar}`} />
                    <h3 className="font-semibold text-foreground">{part.label}</h3>
                    <span className="text-xs text-muted">{part.short} · {partMinutes(part.key)} min</span>
                  </div>
                  <button
                    onClick={() => setTaskPickerPart(part.key)}
                    className="text-xs px-2.5 py-1 bg-emerald-600/15 text-emerald-400 rounded-lg font-medium hover:bg-emerald-600/25"
                  >
                    + Añadir tarea
                  </button>
                </div>
                {tasks.length === 0 ? (
                  <p className="text-xs text-muted italic">Sin tareas en esta parte.</p>
                ) : (
                  <div className="space-y-2">
                    {tasks.map((st, i) => {
                      const task = st.task;
                      const teamCount = st.teams.length;
                      return (
                        <div key={st.id} className="flex items-center gap-3 bg-background rounded-lg px-3 py-2">
                          <div className="flex flex-col">
                            <button
                              disabled={i === 0}
                              onClick={() => moveTask(st, -1)}
                              className="text-muted hover:text-foreground disabled:opacity-20 text-xs leading-none"
                            >
                              ▲
                            </button>
                            <button
                              disabled={i === tasks.length - 1}
                              onClick={() => moveTask(st, 1)}
                              className="text-muted hover:text-foreground disabled:opacity-20 text-xs leading-none"
                            >
                              ▼
                            </button>
                          </div>
                          <div className="w-14 h-10 rounded-md overflow-hidden flex-shrink-0 bg-surface-hover">
                            {task?.image_url ? (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img src={task.image_url} alt="" className="w-full h-full object-cover" />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center text-muted text-[9px]">Sin dibujo</div>
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-foreground truncate">{task?.name ?? "Tarea eliminada"}</p>
                            <div className="flex flex-wrap items-center gap-2 mt-0.5">
                              <span className="text-[11px] text-muted">{task?.duration_minutes ?? 0} min</span>
                              {(task?.tags ?? []).slice(0, 3).map((t) => {
                                const c = getTagColor(t.id);
                                return (
                                  <span key={t.id} className={`px-1.5 py-0.5 rounded-full text-[9px] font-medium ${c.bg} ${c.text}`}>
                                    {t.label}
                                  </span>
                                );
                              })}
                            </div>
                          </div>
                          <button
                            onClick={() => setTeamBuilderFor(st)}
                            className={`text-xs px-2.5 py-1 rounded-lg font-medium flex-shrink-0 ${
                              teamCount > 0
                                ? "bg-violet-500/15 text-violet-400 hover:bg-violet-500/25"
                                : "bg-surface-hover text-foreground-secondary hover:text-foreground"
                            }`}
                          >
                            {teamCount > 0 ? `${teamCount} equipo${teamCount > 1 ? "s" : ""}` : "Equipos"}
                          </button>
                          <button
                            onClick={() => removeTask(st)}
                            className="text-muted hover:text-rose-400 flex-shrink-0 px-1"
                            title="Quitar"
                          >
                            ✕
                          </button>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        <div className="mt-5 text-right text-sm text-foreground-secondary">
          Duración total: <span className="font-bold text-foreground">{totalMinutes} min</span>
        </div>
      </div>

      {/* ===== Vista de impresión ===== */}
      <div className="hidden print:block p-8 text-black">
        <h1 className="text-2xl font-bold mb-1">{session.name}</h1>
        <p className="text-sm mb-4">
          {session.session_date ?? "Sin fecha"} · {session.team_label || "—"} · {totalMinutes} min
        </p>
        {session.objective && <p className="text-sm mb-1"><strong>Objetivo:</strong> {session.objective}</p>}
        {session.notes && <p className="text-sm mb-1"><strong>Notas:</strong> {session.notes}</p>}
        {squadPlayers.length > 0 && (
          <p className="text-sm mb-4">
            <strong>Convocatoria ({squadPlayers.length}):</strong> {squadPlayers.map(playerLabel).join(", ")}
          </p>
        )}
        {PARTS.map((part) => {
          const tasks = (session.session_tasks ?? [])
            .filter((st) => st.part === part.key)
            .sort((a, b) => a.position - b.position);
          if (tasks.length === 0) return null;
          return (
            <div key={part.key} className="mb-4 break-inside-avoid">
              <h2 className="text-lg font-bold border-b border-black mb-2">
                {part.label} — {partMinutes(part.key)} min
              </h2>
              {tasks.map((st) => (
                <div key={st.id} className="mb-3 break-inside-avoid">
                  <p className="font-semibold">
                    {st.task?.name} <span className="font-normal">({st.task?.duration_minutes} min · {st.task?.dimensions} · {st.task?.num_players})</span>
                  </p>
                  {st.task?.description && <p className="text-sm">{st.task.description}</p>}
                  {(st.teams.length > 0 || st.wildcards_inside.length > 0 || st.wildcards_outside.length > 0) && (
                    <div className="text-sm mt-1">
                      {st.teams.map((t) => (
                        <p key={t.id}>
                          <strong>{t.name}:</strong>{" "}
                          {t.player_ids.map((pid) => players.find((p) => p.id === pid)?.full_name ?? "?").join(", ") || "—"}
                        </p>
                      ))}
                      {st.wildcards_inside.length > 0 && (
                        <p><strong>Comodines (dentro):</strong> {st.wildcards_inside.map((pid) => players.find((p) => p.id === pid)?.full_name ?? "?").join(", ")}</p>
                      )}
                      {st.wildcards_outside.length > 0 && (
                        <p><strong>Comodines (fuera):</strong> {st.wildcards_outside.map((pid) => players.find((p) => p.id === pid)?.full_name ?? "?").join(", ")}</p>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          );
        })}
      </div>

      {/* Modales */}
      {squadModalOpen && (
        <SquadModal
          players={players}
          selected={session.squad_player_ids}
          onSave={saveSquad}
          onClose={() => setSquadModalOpen(false)}
        />
      )}
      {taskPickerPart && (
        <TaskPickerModal
          tasks={allTasks}
          onPick={(task) => addTaskToPart(task, taskPickerPart)}
          onClose={() => setTaskPickerPart(null)}
        />
      )}
      {teamBuilderFor && (
        <TeamBuilderModal
          sessionTask={teamBuilderFor}
          squadPlayers={squadPlayers}
          onSave={(teams, wIn, wOut) => saveTeams(teamBuilderFor, teams, wIn, wOut)}
          onClose={() => setTeamBuilderFor(null)}
        />
      )}
    </div>
  );
}

// ============================================
// Modal: convocatoria de la sesión
// ============================================
function SquadModal({
  players,
  selected,
  onSave,
  onClose,
}: {
  players: Player[];
  selected: string[];
  onSave: (ids: string[]) => void;
  onClose: () => void;
}) {
  const [draft, setDraft] = useState<string[]>(selected);
  const [search, setSearch] = useState("");

  const filtered = players.filter((p) => p.full_name.toLowerCase().includes(search.toLowerCase()));

  const toggle = (id: string) =>
    setDraft((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));

  return (
    <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
      <div className="bg-surface border border-border rounded-xl w-full max-w-md max-h-[80vh] flex flex-col">
        <div className="p-4 border-b border-border">
          <h3 className="font-semibold text-foreground mb-2">Convocatoria ({draft.length} seleccionadas)</h3>
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar jugadora…"
            className="w-full bg-background border border-border rounded-lg px-3 py-1.5 text-sm text-foreground placeholder:text-muted focus:outline-none focus:border-emerald-500"
          />
        </div>
        <div className="flex-1 overflow-y-auto p-2">
          {filtered.map((p) => (
            <label key={p.id} className="flex items-center gap-2.5 px-2.5 py-2 rounded-lg hover:bg-surface-hover cursor-pointer">
              <input type="checkbox" checked={draft.includes(p.id)} onChange={() => toggle(p.id)} className="accent-emerald-600" />
              <span className="text-sm text-foreground">{playerLabel(p)}</span>
              {p.position && <span className="text-[10px] text-muted ml-auto">{p.position.abbreviation}</span>}
            </label>
          ))}
          {filtered.length === 0 && <p className="text-xs text-muted italic px-2.5 py-2">Sin resultados.</p>}
        </div>
        <div className="p-3 border-t border-border flex justify-end gap-2">
          <button onClick={onClose} className="px-3.5 py-1.5 text-sm text-foreground-secondary hover:text-foreground">
            Cancelar
          </button>
          <button
            onClick={() => onSave(draft)}
            className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-sm font-semibold"
          >
            Guardar
          </button>
        </div>
      </div>
    </div>
  );
}

// ============================================
// Modal: elegir tarea de la biblioteca
// ============================================
function TaskPickerModal({
  tasks,
  onPick,
  onClose,
}: {
  tasks: Task[];
  onPick: (task: Task) => void;
  onClose: () => void;
}) {
  const [search, setSearch] = useState("");
  const filtered = tasks.filter(
    (t) =>
      !t.parent_task_id &&
      (t.name.toLowerCase().includes(search.toLowerCase()) ||
        (t.tags ?? []).some((tag) => tag.label.toLowerCase().includes(search.toLowerCase())))
  );

  return (
    <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
      <div className="bg-surface border border-border rounded-xl w-full max-w-lg max-h-[80vh] flex flex-col">
        <div className="p-4 border-b border-border">
          <h3 className="font-semibold text-foreground mb-2">Añadir tarea</h3>
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por nombre o etiqueta…"
            className="w-full bg-background border border-border rounded-lg px-3 py-1.5 text-sm text-foreground placeholder:text-muted focus:outline-none focus:border-emerald-500"
            autoFocus
          />
        </div>
        <div className="flex-1 overflow-y-auto p-2">
          {filtered.map((t) => (
            <button
              key={t.id}
              onClick={() => onPick(t)}
              className="w-full text-left flex items-center justify-between gap-2 px-2.5 py-2 rounded-lg hover:bg-surface-hover"
            >
              <div className="min-w-0">
                <p className="text-sm font-medium text-foreground truncate">{t.name}</p>
                <div className="flex flex-wrap gap-1 mt-0.5">
                  {(t.tags ?? []).slice(0, 3).map((tag) => {
                    const c = getTagColor(tag.id);
                    return (
                      <span key={tag.id} className={`px-1.5 py-0.5 rounded-full text-[9px] font-medium ${c.bg} ${c.text}`}>
                        {tag.label}
                      </span>
                    );
                  })}
                </div>
              </div>
              <span className="text-xs text-muted flex-shrink-0">{t.duration_minutes} min</span>
            </button>
          ))}
          {filtered.length === 0 && <p className="text-xs text-muted italic px-2.5 py-2">Sin resultados.</p>}
        </div>
        <div className="p-3 border-t border-border flex justify-end">
          <button onClick={onClose} className="px-3.5 py-1.5 text-sm text-foreground-secondary hover:text-foreground">
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
}

// ============================================
// Modal: reparto de equipos y comodines de una tarea
// ============================================
type Assignment = { type: "team"; id: string } | { type: "in" } | { type: "out" } | null;

function TeamBuilderModal({
  sessionTask,
  squadPlayers,
  onSave,
  onClose,
}: {
  sessionTask: SessionTask;
  squadPlayers: Player[];
  onSave: (teams: SessionTeam[], wildcardsInside: string[], wildcardsOutside: string[]) => void;
  onClose: () => void;
}) {
  const [teams, setTeams] = useState<SessionTeam[]>(sessionTask.teams.length > 0 ? sessionTask.teams : [newTeam(0), newTeam(1)]);
  const [wIn, setWIn] = useState<string[]>(sessionTask.wildcards_inside);
  const [wOut, setWOut] = useState<string[]>(sessionTask.wildcards_outside);

  const setTeamCount = (n: number) => {
    setTeams((prev) => {
      if (n <= prev.length) return prev.slice(0, n);
      const next = [...prev];
      while (next.length < n) next.push(newTeam(next.length));
      return next;
    });
  };

  const getAssignment = (pid: string): Assignment => {
    const t = teams.find((tm) => tm.player_ids.includes(pid));
    if (t) return { type: "team", id: t.id };
    if (wIn.includes(pid)) return { type: "in" };
    if (wOut.includes(pid)) return { type: "out" };
    return null;
  };

  const setAssignment = (pid: string, target: Assignment) => {
    setTeams((prev) => prev.map((t) => ({ ...t, player_ids: t.player_ids.filter((x) => x !== pid) })));
    setWIn((prev) => prev.filter((x) => x !== pid));
    setWOut((prev) => prev.filter((x) => x !== pid));
    if (target?.type === "team") {
      setTeams((prev) => prev.map((t) => (t.id === target.id ? { ...t, player_ids: [...t.player_ids, pid] } : t)));
    } else if (target?.type === "in") {
      setWIn((prev) => [...prev, pid]);
    } else if (target?.type === "out") {
      setWOut((prev) => [...prev, pid]);
    }
  };

  const toggle = (pid: string, target: Assignment) => {
    const current = getAssignment(pid);
    const same =
      current?.type === target?.type && (current?.type !== "team" || (current as { id: string }).id === (target as { id: string })?.id);
    setAssignment(pid, same ? null : target);
  };

  const renameTeam = (teamId: string, name: string) =>
    setTeams((prev) => prev.map((t) => (t.id === teamId ? { ...t, name } : t)));

  return (
    <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
      <div className="bg-surface border border-border rounded-xl w-full max-w-2xl max-h-[85vh] flex flex-col">
        <div className="p-4 border-b border-border">
          <h3 className="font-semibold text-foreground mb-1">Equipos — {sessionTask.task?.name}</h3>
          <p className="text-xs text-muted mb-3">
            Elige cuántos equipos hay y toca el botón de cada jugadora para asignarla (equipo, comodín dentro o fuera).
          </p>
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted">Nº de equipos:</span>
            {[1, 2, 3, 4].map((n) => (
              <button
                key={n}
                onClick={() => setTeamCount(n)}
                className={`w-7 h-7 rounded-lg text-xs font-semibold ${
                  teams.length === n ? "bg-emerald-600 text-white" : "bg-background text-foreground-secondary hover:text-foreground"
                }`}
              >
                {n}
              </button>
            ))}
          </div>
          <div className="flex flex-wrap gap-2 mt-2.5">
            {teams.map((t) => (
              <div key={t.id} className="flex items-center gap-1.5">
                <span className={`w-2.5 h-2.5 rounded-full ${t.color}`} />
                <input
                  value={t.name}
                  onChange={(e) => renameTeam(t.id, e.target.value)}
                  className="bg-background border border-border rounded-md px-2 py-1 text-xs text-foreground w-24 focus:outline-none focus:border-emerald-500"
                />
              </div>
            ))}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-2">
          {squadPlayers.length === 0 ? (
            <p className="text-xs text-muted italic px-3 py-4">
              Primero define la convocatoria de la sesión para poder repartir equipos.
            </p>
          ) : (
            squadPlayers.map((p) => {
              const current = getAssignment(p.id);
              return (
                <div key={p.id} className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg hover:bg-surface-hover">
                  <span className="text-sm text-foreground flex-1 min-w-0 truncate">{playerLabel(p)}</span>
                  <div className="flex items-center gap-1 flex-shrink-0">
                    {teams.map((t, i) => {
                      const active = current?.type === "team" && current.id === t.id;
                      return (
                        <button
                          key={t.id}
                          onClick={() => toggle(p.id, { type: "team", id: t.id })}
                          title={t.name}
                          className={`w-6 h-6 rounded-full text-[10px] font-bold flex items-center justify-center ${
                            active ? `${t.color} text-white` : "bg-background text-muted hover:text-foreground"
                          }`}
                        >
                          {TEAM_LETTERS[i]}
                        </button>
                      );
                    })}
                    <button
                      onClick={() => toggle(p.id, { type: "in" })}
                      title="Comodín dentro"
                      className={`px-1.5 h-6 rounded-full text-[9px] font-bold ${
                        current?.type === "in" ? "bg-emerald-500 text-white" : "bg-background text-muted hover:text-foreground"
                      }`}
                    >
                      IN
                    </button>
                    <button
                      onClick={() => toggle(p.id, { type: "out" })}
                      title="Comodín fuera"
                      className={`px-1.5 h-6 rounded-full text-[9px] font-bold ${
                        current?.type === "out" ? "bg-amber-500 text-white" : "bg-background text-muted hover:text-foreground"
                      }`}
                    >
                      OUT
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>

        <div className="p-3 border-t border-border flex justify-end gap-2">
          <button onClick={onClose} className="px-3.5 py-1.5 text-sm text-foreground-secondary hover:text-foreground">
            Cancelar
          </button>
          <button
            onClick={() => onSave(teams, wIn, wOut)}
            className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-sm font-semibold"
          >
            Guardar
          </button>
        </div>
      </div>
    </div>
  );
}
