"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import {
  getPlayers,
  createPlayer,
  updatePlayer,
  getPositions,
  getPlayerReports,
  getLatestPlayerReports,
  createPlayerReport,
  updatePlayerReport,
  deletePlayerReport,
} from "@/lib/api";
import type { PlayerInput, PlayerReportInput } from "@/lib/api";
import type { Player, PlayerReport, Position, DominantFoot, CallUpStatus } from "@/types";

// ── Seguimiento de jugadoras ────────────────────────────────────
// Página para el trabajo de Sandra en la selección española: no es para
// fichar jugadoras, es para hacer seguimiento de su nivel (minutos,
// posiciones, valoración, rendimiento) y ayudar a decidir si se convoca a
// una jugadora para los torneos internacionales.

const FOOT_LABELS: Record<Exclude<DominantFoot, "">, string> = {
  diestra: "Diestra",
  zurda: "Zurda",
  ambidiestra: "Ambidiestra",
};

const CALL_UP_CONFIG: Record<CallUpStatus, { label: string; color: string; accent: string }> = {
  convocada: { label: "Convocada", color: "bg-emerald-900/50 text-emerald-400", accent: "#34d399" },
  pendiente: { label: "Pendiente de decisión", color: "bg-amber-900/50 text-amber-400", accent: "#fbbf24" },
  seguimiento: { label: "En seguimiento", color: "bg-sky-900/50 text-sky-400", accent: "#38bdf8" },
  no_convocada: { label: "No convocada", color: "bg-rose-900/50 text-rose-400", accent: "#fb7185" },
};

const CATEGORY_SUGGESTIONS = ["Sub-15", "Sub-17", "Sub-19", "Sub-20", "Absoluta"];

function calcAge(birthDate: string | null): number | null {
  if (!birthDate) return null;
  const b = new Date(birthDate);
  if (Number.isNaN(b.getTime())) return null;
  const now = new Date();
  let age = now.getFullYear() - b.getFullYear();
  const m = now.getMonth() - b.getMonth();
  if (m < 0 || (m === 0 && now.getDate() < b.getDate())) age--;
  return age;
}

const EMPTY_PLAYER_FORM: PlayerInput = {
  full_name: "",
  birth_date: null,
  position_id: null,
  dominant_foot: "",
  photo_url: null,
  club: "",
  squad_number: null,
  height_cm: null,
  nationality: "",
  notes: "",
};

function emptyReportForm(): PlayerReportInput {
  return {
    player_id: "",
    report_date: new Date().toISOString().slice(0, 10),
    category: "",
    club: "",
    minutes_played: null,
    positions_played: "",
    rating: null,
    performance_notes: "",
    call_up_status: "seguimiento",
    tournament: "",
  };
}

export default function SeguimientoPage() {
  const [players, setPlayers] = useState<Player[]>([]);
  const [positions, setPositions] = useState<Position[]>([]);
  const [latestByPlayer, setLatestByPlayer] = useState<Map<string, PlayerReport>>(new Map());
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<CallUpStatus | "all">("all");

  // Modal: alta/edición de jugadora
  const [playerModalOpen, setPlayerModalOpen] = useState(false);
  const [editingPlayerId, setEditingPlayerId] = useState<string | null>(null);
  const [playerForm, setPlayerForm] = useState<PlayerInput>(EMPTY_PLAYER_FORM);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Panel de detalle / seguimiento de una jugadora
  const [detailPlayer, setDetailPlayer] = useState<Player | null>(null);
  const [reports, setReports] = useState<PlayerReport[]>([]);
  const [reportFormOpen, setReportFormOpen] = useState(false);
  const [editingReportId, setEditingReportId] = useState<string | null>(null);
  const [reportForm, setReportForm] = useState<PlayerReportInput>(emptyReportForm());

  const load = useCallback(async () => {
    try {
      const [pl, pos, latest] = await Promise.all([getPlayers(), getPositions(), getLatestPlayerReports()]);
      setPlayers(pl);
      setPositions(pos);
      const map = new Map<string, PlayerReport>();
      for (const r of latest) {
        if (!map.has(r.player_id)) map.set(r.player_id, r); // ya viene ordenado por fecha desc
      }
      setLatestByPlayer(map);
    } catch (err) {
      console.error("Error loading seguimiento:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  /* ── Jugadora: alta / edición ── */
  const openCreatePlayer = () => {
    setEditingPlayerId(null);
    setPlayerForm(EMPTY_PLAYER_FORM);
    setPlayerModalOpen(true);
  };

  const openEditPlayer = (p: Player) => {
    setEditingPlayerId(p.id);
    setPlayerForm({
      full_name: p.full_name,
      birth_date: p.birth_date,
      position_id: p.position_id,
      dominant_foot: p.dominant_foot,
      photo_url: p.photo_url,
      club: p.club,
      squad_number: p.squad_number,
      height_cm: p.height_cm,
      nationality: p.nationality,
      notes: p.notes,
    });
    setPlayerModalOpen(true);
  };

  const closePlayerModal = () => {
    setPlayerModalOpen(false);
    setEditingPlayerId(null);
    setPlayerForm(EMPTY_PLAYER_FORM);
  };

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onloadend = () => setPlayerForm((f) => ({ ...f, photo_url: reader.result as string }));
    reader.readAsDataURL(file);
  };

  const handleSavePlayer = async () => {
    if (!playerForm.full_name.trim()) return;
    try {
      const payload: PlayerInput = { ...playerForm, full_name: playerForm.full_name.trim() };
      if (editingPlayerId) {
        const updated = await updatePlayer(editingPlayerId, payload);
        if (detailPlayer?.id === editingPlayerId) setDetailPlayer({ ...detailPlayer, ...updated });
      } else {
        await createPlayer(payload);
      }
      closePlayerModal();
      await load();
    } catch (err) {
      console.error("Error saving player:", err);
    }
  };

  /* ── Panel de seguimiento ── */
  const openDetail = async (p: Player) => {
    setDetailPlayer(p);
    setReportFormOpen(false);
    setEditingReportId(null);
    setReportForm(emptyReportForm());
    try {
      const data = await getPlayerReports(p.id);
      setReports(data);
    } catch (err) {
      console.error("Error loading reports:", err);
    }
  };

  const closeDetail = () => {
    setDetailPlayer(null);
    setReports([]);
    setReportFormOpen(false);
    setEditingReportId(null);
  };

  const openNewReport = () => {
    setEditingReportId(null);
    setReportForm(emptyReportForm());
    setReportFormOpen(true);
  };

  const openEditReport = (r: PlayerReport) => {
    setEditingReportId(r.id);
    setReportForm({
      player_id: r.player_id,
      report_date: r.report_date,
      category: r.category,
      club: r.club,
      minutes_played: r.minutes_played,
      positions_played: r.positions_played,
      rating: r.rating,
      performance_notes: r.performance_notes,
      call_up_status: r.call_up_status,
      tournament: r.tournament,
    });
    setReportFormOpen(true);
  };

  const handleSaveReport = async () => {
    if (!detailPlayer) return;
    try {
      if (editingReportId) {
        await updatePlayerReport(editingReportId, reportForm);
      } else {
        await createPlayerReport({ ...reportForm, player_id: detailPlayer.id });
      }
      setReportFormOpen(false);
      setEditingReportId(null);
      setReportForm(emptyReportForm());
      const data = await getPlayerReports(detailPlayer.id);
      setReports(data);
      const latest = await getLatestPlayerReports();
      const map = new Map<string, PlayerReport>();
      for (const r of latest) if (!map.has(r.player_id)) map.set(r.player_id, r);
      setLatestByPlayer(map);
    } catch (err) {
      console.error("Error saving report:", err);
    }
  };

  const handleDeleteReport = async (id: string) => {
    if (!detailPlayer) return;
    if (!confirm("¿Eliminar este informe de seguimiento?")) return;
    try {
      await deletePlayerReport(id);
      const data = await getPlayerReports(detailPlayer.id);
      setReports(data);
      const latest = await getLatestPlayerReports();
      const map = new Map<string, PlayerReport>();
      for (const r of latest) if (!map.has(r.player_id)) map.set(r.player_id, r);
      setLatestByPlayer(map);
    } catch (err) {
      console.error("Error deleting report:", err);
    }
  };

  /* ── Filtros ── */
  const filtered = players.filter((p) => {
    const matchSearch = p.full_name.toLowerCase().includes(search.toLowerCase()) || p.club.toLowerCase().includes(search.toLowerCase());
    const latest = latestByPlayer.get(p.id);
    const matchStatus = statusFilter === "all" || latest?.call_up_status === statusFilter;
    return matchSearch && matchStatus;
  });

  const statusCounts = (Object.keys(CALL_UP_CONFIG) as CallUpStatus[]).reduce<Record<string, number>>((acc, s) => {
    acc[s] = Array.from(latestByPlayer.values()).filter((r) => r.call_up_status === s).length;
    return acc;
  }, {});

  if (loading) {
    return (
      <div className="max-w-7xl flex items-center justify-center h-64">
        <p className="text-foreground-secondary">Cargando seguimiento...</p>
      </div>
    );
  }

  return (
    <div className="max-w-7xl">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Seguimiento de jugadoras</h1>
          <p className="text-muted text-sm mt-1">
            Nivel, minutos, posiciones y valoración a lo largo del tiempo — para decidir convocatorias, no para fichajes.
          </p>
        </div>
        <button
          onClick={openCreatePlayer}
          className="px-4 py-2 bg-sky-600 text-white rounded-lg text-sm font-medium hover:bg-sky-700 transition-colors"
        >
          + Nueva jugadora
        </button>
      </div>

      <div className="flex gap-6">
        {/* Main content */}
        <div className="flex-1 min-w-0">
          {/* Status filter */}
          <div className="flex gap-2 mb-4 flex-wrap">
            <button
              onClick={() => setStatusFilter("all")}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                statusFilter === "all" ? "bg-sky-600 text-white" : "bg-surface border border-border text-foreground-secondary hover:border-sky-400"
              }`}
            >
              Todas
            </button>
            {(Object.keys(CALL_UP_CONFIG) as CallUpStatus[]).map((s) => (
              <button
                key={s}
                onClick={() => setStatusFilter(s)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors flex items-center gap-1.5 ${
                  statusFilter === s ? CALL_UP_CONFIG[s].color + " ring-1 ring-current" : "bg-surface border border-border text-foreground-secondary hover:border-sky-400"
                }`}
              >
                {CALL_UP_CONFIG[s].label}
                <span className="text-muted">{statusCounts[s] || 0}</span>
              </button>
            ))}
          </div>

          {/* Search */}
          <div className="mb-6">
            <input
              type="text"
              placeholder="Buscar por nombre o club..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full px-4 py-2 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-sky-300 focus:border-sky-300 bg-surface-hover"
            />
          </div>

          {filtered.length === 0 ? (
            <div className="bg-surface rounded-xl border border-border p-8 text-center text-foreground-secondary">
              <p className="text-lg font-medium mb-2">Sin jugadoras</p>
              <p className="text-sm">Añade una jugadora para empezar a hacerle seguimiento.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {filtered.map((p) => {
                const age = calcAge(p.birth_date);
                const latest = latestByPlayer.get(p.id);
                return (
                  <button
                    key={p.id}
                    onClick={() => openDetail(p)}
                    className="text-left bg-surface rounded-xl border border-border overflow-hidden hover:border-sky-400/60 transition-colors"
                  >
                    <div className="p-4 flex gap-3">
                      <div className="w-14 h-14 rounded-full bg-surface-hover border border-border flex-shrink-0 overflow-hidden flex items-center justify-center">
                        {p.photo_url ? (
                          <img src={p.photo_url} alt={p.full_name} className="w-full h-full object-cover" />
                        ) : (
                          <span className="text-lg text-muted">{p.full_name.charAt(0).toUpperCase()}</span>
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <h3 className="font-semibold text-foreground text-sm truncate">{p.full_name}</h3>
                        <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                          {p.position && (
                            <span className="px-1.5 py-0.5 rounded bg-sky-900/40 text-sky-400 text-[10px] font-medium">{p.position.abbreviation}</span>
                          )}
                          {age !== null && <span className="text-[10px] text-muted">{age} años</span>}
                        </div>
                        {p.club && <p className="text-xs text-muted mt-1 truncate">{p.club}</p>}
                      </div>
                    </div>
                    <div className="px-4 pb-3">
                      {latest ? (
                        <div className="flex items-center justify-between">
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium ${CALL_UP_CONFIG[latest.call_up_status].color}`}>
                            {CALL_UP_CONFIG[latest.call_up_status].label}
                          </span>
                          {latest.rating !== null && (
                            <span className="text-[10px] text-muted">Valoración: <span className="text-foreground-secondary font-medium">{latest.rating}/10</span></span>
                          )}
                        </div>
                      ) : (
                        <p className="text-[10px] text-muted italic">Sin informes todavía</p>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Sidebar */}
        <div className="w-72 flex-shrink-0 space-y-4">
          <div className="bg-surface rounded-xl border border-border p-4">
            <h3 className="text-xs font-semibold text-muted uppercase tracking-wider mb-3">Resumen</h3>
            <div className="grid grid-cols-2 gap-3">
              <div className="text-center">
                <p className="text-2xl font-bold text-foreground">{players.length}</p>
                <p className="text-[10px] text-muted uppercase">Jugadoras</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-emerald-400">{statusCounts.convocada || 0}</p>
                <p className="text-[10px] text-muted uppercase">Convocadas</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-amber-400">{statusCounts.pendiente || 0}</p>
                <p className="text-[10px] text-muted uppercase">Pendientes</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-sky-400">{statusCounts.seguimiento || 0}</p>
                <p className="text-[10px] text-muted uppercase">En seguimiento</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Modal: alta/edición de jugadora */}
      {playerModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-surface rounded-xl p-6 w-full max-w-lg shadow-xl max-h-[90vh] overflow-y-auto">
            <h3 className="font-semibold text-foreground mb-4">{editingPlayerId ? "Editar jugadora" : "Nueva jugadora"}</h3>

            <div className="flex items-center gap-3 mb-4">
              <div className="w-16 h-16 rounded-full bg-surface-hover border border-border overflow-hidden flex items-center justify-center flex-shrink-0">
                {playerForm.photo_url ? (
                  <img src={playerForm.photo_url} alt="" className="w-full h-full object-cover" />
                ) : (
                  <span className="text-xl text-muted">👤</span>
                )}
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="px-3 py-1.5 bg-surface-hover border border-border rounded-lg text-xs text-foreground-secondary hover:border-sky-400 hover:text-sky-400 transition-colors"
                >
                  Subir foto
                </button>
                <input ref={fileInputRef} type="file" accept="image/*" onChange={handlePhotoUpload} className="hidden" />
                {playerForm.photo_url && (
                  <button onClick={() => setPlayerForm((f) => ({ ...f, photo_url: null }))} className="text-xs text-red-400 hover:text-red-300">
                    Quitar
                  </button>
                )}
              </div>
            </div>

            <input
              autoFocus
              value={playerForm.full_name}
              onChange={(e) => setPlayerForm((f) => ({ ...f, full_name: e.target.value }))}
              placeholder="Nombre completo"
              className="w-full px-3 py-2 bg-surface-hover border border-border rounded-lg text-sm text-foreground mb-2 focus:outline-none focus:ring-2 focus:ring-sky-300"
            />

            <div className="grid grid-cols-2 gap-2 mb-2">
              <div>
                <label className="text-[10px] text-muted uppercase tracking-wide font-medium block mb-1">Fecha de nacimiento</label>
                <input
                  type="date"
                  value={playerForm.birth_date ?? ""}
                  onChange={(e) => setPlayerForm((f) => ({ ...f, birth_date: e.target.value || null }))}
                  className="w-full px-3 py-2 bg-surface-hover border border-border rounded-lg text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-sky-300"
                />
              </div>
              <div>
                <label className="text-[10px] text-muted uppercase tracking-wide font-medium block mb-1">Posición</label>
                <select
                  value={playerForm.position_id ?? ""}
                  onChange={(e) => setPlayerForm((f) => ({ ...f, position_id: e.target.value || null }))}
                  className="w-full px-3 py-2 bg-surface-hover border border-border rounded-lg text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-sky-300"
                >
                  <option value="">Sin especificar</option>
                  {positions.map((pos) => (
                    <option key={pos.id} value={pos.id}>{pos.abbreviation} — {pos.name}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="mb-2">
              <label className="text-[10px] text-muted uppercase tracking-wide font-medium block mb-1">Pierna dominante</label>
              <div className="flex gap-2">
                {(["diestra", "zurda", "ambidiestra"] as const).map((foot) => (
                  <button
                    key={foot}
                    onClick={() => setPlayerForm((f) => ({ ...f, dominant_foot: f.dominant_foot === foot ? "" : foot }))}
                    className={`px-3 py-1.5 rounded text-xs font-medium transition-colors ${
                      playerForm.dominant_foot === foot ? "bg-sky-900/50 text-sky-400" : "bg-surface-hover text-foreground-secondary"
                    }`}
                  >
                    {FOOT_LABELS[foot]}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2 mb-2">
              <input
                value={playerForm.club}
                onChange={(e) => setPlayerForm((f) => ({ ...f, club: e.target.value }))}
                placeholder="Club actual"
                className="px-3 py-2 bg-surface-hover border border-border rounded-lg text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-sky-300"
              />
              <input
                value={playerForm.nationality}
                onChange={(e) => setPlayerForm((f) => ({ ...f, nationality: e.target.value }))}
                placeholder="Nacionalidad"
                className="px-3 py-2 bg-surface-hover border border-border rounded-lg text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-sky-300"
              />
            </div>

            <textarea
              value={playerForm.notes}
              onChange={(e) => setPlayerForm((f) => ({ ...f, notes: e.target.value }))}
              placeholder="Notas..."
              rows={2}
              className="w-full px-3 py-2 bg-surface-hover border border-border rounded-lg text-sm text-foreground mb-4 focus:outline-none focus:ring-2 focus:ring-sky-300 resize-none"
            />

            <div className="flex gap-2 justify-end">
              <button onClick={closePlayerModal} className="px-4 py-2 bg-surface-hover text-foreground-secondary rounded-lg text-sm hover:bg-border">
                Cancelar
              </button>
              <button onClick={handleSavePlayer} className="px-4 py-2 bg-sky-600 text-white rounded-lg text-sm hover:bg-sky-700">
                {editingPlayerId ? "Guardar" : "Crear"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Panel de seguimiento de una jugadora */}
      {detailPlayer && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-surface rounded-xl w-full max-w-2xl shadow-xl max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-border flex items-start justify-between gap-3">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-14 h-14 rounded-full bg-surface-hover border border-border overflow-hidden flex items-center justify-center flex-shrink-0">
                  {detailPlayer.photo_url ? (
                    <img src={detailPlayer.photo_url} alt={detailPlayer.full_name} className="w-full h-full object-cover" />
                  ) : (
                    <span className="text-lg text-muted">{detailPlayer.full_name.charAt(0).toUpperCase()}</span>
                  )}
                </div>
                <div className="min-w-0">
                  <h3 className="font-semibold text-foreground truncate">{detailPlayer.full_name}</h3>
                  <p className="text-xs text-muted">
                    {detailPlayer.position?.abbreviation ?? "Sin posición"}
                    {calcAge(detailPlayer.birth_date) !== null && ` · ${calcAge(detailPlayer.birth_date)} años`}
                    {detailPlayer.club && ` · ${detailPlayer.club}`}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                <button onClick={() => openEditPlayer(detailPlayer)} className="text-xs text-muted hover:text-sky-400">Editar jugadora</button>
                <button onClick={closeDetail} className="text-muted hover:text-foreground-secondary text-sm">✕</button>
              </div>
            </div>

            <div className="p-6">
              <div className="flex items-center justify-between mb-3">
                <h4 className="text-sm font-semibold text-foreground">Informes de seguimiento</h4>
                {!reportFormOpen && (
                  <button onClick={openNewReport} className="px-3 py-1.5 bg-sky-600 text-white rounded-lg text-xs font-medium hover:bg-sky-700">
                    + Nuevo informe
                  </button>
                )}
              </div>

              {/* Formulario de informe */}
              {reportFormOpen && (
                <div className="bg-surface-hover rounded-lg border border-border p-4 mb-4">
                  <div className="grid grid-cols-2 gap-2 mb-2">
                    <div>
                      <label className="text-[10px] text-muted uppercase tracking-wide font-medium block mb-1">Fecha</label>
                      <input
                        type="date"
                        value={reportForm.report_date}
                        onChange={(e) => setReportForm((f) => ({ ...f, report_date: e.target.value }))}
                        className="w-full px-3 py-2 bg-surface border border-border rounded-lg text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-sky-300"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] text-muted uppercase tracking-wide font-medium block mb-1">Categoría</label>
                      <input
                        list="category-suggestions"
                        value={reportForm.category}
                        onChange={(e) => setReportForm((f) => ({ ...f, category: e.target.value }))}
                        placeholder="Sub-19, Absoluta..."
                        className="w-full px-3 py-2 bg-surface border border-border rounded-lg text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-sky-300"
                      />
                      <datalist id="category-suggestions">
                        {CATEGORY_SUGGESTIONS.map((c) => <option key={c} value={c} />)}
                      </datalist>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2 mb-2">
                    <input
                      value={reportForm.club}
                      onChange={(e) => setReportForm((f) => ({ ...f, club: e.target.value }))}
                      placeholder="Club/equipo en ese momento"
                      className="px-3 py-2 bg-surface border border-border rounded-lg text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-sky-300"
                    />
                    <input
                      value={reportForm.tournament}
                      onChange={(e) => setReportForm((f) => ({ ...f, tournament: e.target.value }))}
                      placeholder="Torneo / convocatoria de referencia"
                      className="px-3 py-2 bg-surface border border-border rounded-lg text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-sky-300"
                    />
                  </div>

                  <div className="grid grid-cols-3 gap-2 mb-2">
                    <input
                      type="number"
                      value={reportForm.minutes_played ?? ""}
                      onChange={(e) => setReportForm((f) => ({ ...f, minutes_played: e.target.value ? Number(e.target.value) : null }))}
                      placeholder="Minutos jugados"
                      className="px-3 py-2 bg-surface border border-border rounded-lg text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-sky-300"
                    />
                    <input
                      value={reportForm.positions_played}
                      onChange={(e) => setReportForm((f) => ({ ...f, positions_played: e.target.value }))}
                      placeholder="Posiciones (ej: MC, IN)"
                      className="px-3 py-2 bg-surface border border-border rounded-lg text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-sky-300"
                    />
                    <input
                      type="number"
                      min={1}
                      max={10}
                      value={reportForm.rating ?? ""}
                      onChange={(e) => setReportForm((f) => ({ ...f, rating: e.target.value ? Number(e.target.value) : null }))}
                      placeholder="Valoración (1-10)"
                      className="px-3 py-2 bg-surface border border-border rounded-lg text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-sky-300"
                    />
                  </div>

                  <textarea
                    value={reportForm.performance_notes}
                    onChange={(e) => setReportForm((f) => ({ ...f, performance_notes: e.target.value }))}
                    placeholder="Información de rendimiento / observaciones..."
                    rows={3}
                    className="w-full px-3 py-2 bg-surface border border-border rounded-lg text-sm text-foreground mb-2 focus:outline-none focus:ring-2 focus:ring-sky-300 resize-none"
                  />

                  <div className="mb-3">
                    <label className="text-[10px] text-muted uppercase tracking-wide font-medium block mb-1">Estado de convocatoria</label>
                    <div className="flex gap-2 flex-wrap">
                      {(Object.keys(CALL_UP_CONFIG) as CallUpStatus[]).map((s) => (
                        <button
                          key={s}
                          onClick={() => setReportForm((f) => ({ ...f, call_up_status: s }))}
                          className={`px-3 py-1.5 rounded text-xs font-medium transition-colors ${
                            reportForm.call_up_status === s ? CALL_UP_CONFIG[s].color : "bg-surface text-foreground-secondary"
                          }`}
                        >
                          {CALL_UP_CONFIG[s].label}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="flex gap-2 justify-end">
                    <button
                      onClick={() => { setReportFormOpen(false); setEditingReportId(null); setReportForm(emptyReportForm()); }}
                      className="px-3 py-1.5 bg-surface text-foreground-secondary rounded-lg text-xs hover:bg-border"
                    >
                      Cancelar
                    </button>
                    <button onClick={handleSaveReport} className="px-3 py-1.5 bg-sky-600 text-white rounded-lg text-xs hover:bg-sky-700">
                      {editingReportId ? "Guardar informe" : "Añadir informe"}
                    </button>
                  </div>
                </div>
              )}

              {/* Timeline de informes */}
              {reports.length === 0 ? (
                <p className="text-sm text-muted italic text-center py-6">Sin informes de seguimiento todavía.</p>
              ) : (
                <div className="space-y-2">
                  {reports.map((r) => (
                    <div key={r.id} className="rounded-lg border border-border p-3">
                      <div className="flex items-center justify-between gap-2 mb-1.5">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-xs font-medium text-foreground">
                            {new Date(r.report_date + "T00:00:00").toLocaleDateString("es-ES", { day: "numeric", month: "short", year: "numeric" })}
                          </span>
                          {r.category && <span className="text-[10px] text-muted">· {r.category}</span>}
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium ${CALL_UP_CONFIG[r.call_up_status].color}`}>
                            {CALL_UP_CONFIG[r.call_up_status].label}
                          </span>
                        </div>
                        <div className="flex items-center gap-1 flex-shrink-0">
                          <button onClick={() => openEditReport(r)} className="text-[10px] text-muted hover:text-sky-400 px-1.5 py-0.5">Editar</button>
                          <button onClick={() => handleDeleteReport(r.id)} className="text-[10px] text-muted hover:text-red-400 px-1.5 py-0.5">Eliminar</button>
                        </div>
                      </div>
                      <div className="flex items-center gap-3 text-xs text-muted mb-1 flex-wrap">
                        {r.club && <span>{r.club}</span>}
                        {r.minutes_played !== null && <span>{r.minutes_played} min</span>}
                        {r.positions_played && <span>{r.positions_played}</span>}
                        {r.rating !== null && <span className="text-foreground-secondary font-medium">Valoración: {r.rating}/10</span>}
                        {r.tournament && <span>· {r.tournament}</span>}
                      </div>
                      {r.performance_notes && <p className="text-xs text-foreground-secondary whitespace-pre-wrap">{r.performance_notes}</p>}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
