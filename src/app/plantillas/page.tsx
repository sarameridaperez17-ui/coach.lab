"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import {
  getPlayers,
  createPlayer,
  updatePlayer,
  deletePlayer,
  getPositions,
  setItemStatus,
  removeItemStatus,
  getItemStatuses,
} from "@/lib/api";
import type { ItemStatus, PlayerInput } from "@/lib/api";
import type { Player, Position, DominantFoot } from "@/types";
import { StatusMenu, StatusBadge } from "@/components/ui/StatusMenu";

const FOOT_LABELS: Record<Exclude<DominantFoot, "">, string> = {
  diestra: "Diestra",
  zurda: "Zurda",
  ambidiestra: "Ambidiestra",
};

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

const EMPTY_FORM: PlayerInput = {
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

export default function PlantillasPage() {
  const [players, setPlayers] = useState<Player[]>([]);
  const [positions, setPositions] = useState<Position[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [positionFilter, setPositionFilter] = useState<string | "all">("all");

  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<PlayerInput>(EMPTY_FORM);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [itemStatuses, setItemStatuses] = useState<Map<string, ItemStatus>>(new Map());
  const [statusMenu, setStatusMenu] = useState<{ x: number; y: number; id: string; title: string } | null>(null);

  const load = useCallback(async () => {
    try {
      const [pl, pos] = await Promise.all([getPlayers(), getPositions()]);
      setPlayers(pl);
      setPositions(pos);
    } catch (err) {
      console.error("Error loading players:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
    getItemStatuses("player").then(setItemStatuses).catch(console.error);
  }, [load]);

  const openCreate = () => {
    setEditingId(null);
    setForm(EMPTY_FORM);
    setModalOpen(true);
  };

  const openEdit = (p: Player) => {
    setEditingId(p.id);
    setForm({
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
    setModalOpen(true);
  };

  const closeModal = () => {
    setModalOpen(false);
    setEditingId(null);
    setForm(EMPTY_FORM);
  };

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onloadend = () => setForm((f) => ({ ...f, photo_url: reader.result as string }));
    reader.readAsDataURL(file);
  };

  const handleSave = async () => {
    if (!form.full_name.trim()) return;
    try {
      const payload: PlayerInput = { ...form, full_name: form.full_name.trim() };
      if (editingId) {
        await updatePlayer(editingId, payload);
      } else {
        await createPlayer(payload);
      }
      closeModal();
      await load();
    } catch (err) {
      console.error("Error saving player:", err);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("¿Eliminar esta jugadora de la plantilla?")) return;
    try {
      await deletePlayer(id);
      await load();
    } catch (err) {
      console.error("Error deleting player:", err);
    }
  };

  const handleSetStatus = async (status: ItemStatus) => {
    if (!statusMenu) return;
    try {
      await setItemStatus("player", statusMenu.id, statusMenu.title, status);
      setItemStatuses((prev) => new Map(prev).set(statusMenu.id, status));
    } catch (err) { console.error("Error setting status:", err); }
    setStatusMenu(null);
  };

  const handleRemoveStatus = async () => {
    if (!statusMenu) return;
    try {
      await removeItemStatus("player", statusMenu.id);
      setItemStatuses((prev) => { const m = new Map(prev); m.delete(statusMenu.id); return m; });
    } catch (err) { console.error("Error removing status:", err); }
    setStatusMenu(null);
  };

  const filtered = players.filter((p) => {
    const matchSearch = p.full_name.toLowerCase().includes(search.toLowerCase()) || p.club.toLowerCase().includes(search.toLowerCase());
    const matchPos = positionFilter === "all" || p.position_id === positionFilter;
    return matchSearch && matchPos;
  });

  const avgAge = (() => {
    const ages = players.map((p) => calcAge(p.birth_date)).filter((a): a is number => a !== null);
    return ages.length > 0 ? Math.round((ages.reduce((s, a) => s + a, 0) / ages.length) * 10) / 10 : null;
  })();

  const byPosition = positions.map((pos) => ({
    pos,
    count: players.filter((p) => p.position_id === pos.id).length,
  })).filter((x) => x.count > 0);

  const clubs = Array.from(new Set(players.map((p) => p.club).filter(Boolean)));

  if (loading) {
    return (
      <div className="max-w-7xl flex items-center justify-center h-64">
        <p className="text-foreground-secondary">Cargando plantilla...</p>
      </div>
    );
  }

  return (
    <div className="max-w-7xl">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Plantillas</h1>
          <p className="text-muted text-sm mt-1">Registro de jugadoras — sobre todo de club — con su información general.</p>
        </div>
        <button
          onClick={openCreate}
          className="px-4 py-2 bg-teal-600 text-white rounded-lg text-sm font-medium hover:bg-teal-700 transition-colors"
        >
          + Nueva jugadora
        </button>
      </div>

      <div className="flex gap-6">
        {/* Main content */}
        <div className="flex-1 min-w-0">
          {/* Position filter */}
          <div className="flex gap-2 mb-4 flex-wrap">
            <button
              onClick={() => setPositionFilter("all")}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                positionFilter === "all" ? "bg-teal-600 text-white" : "bg-surface border border-border text-foreground-secondary hover:border-teal-400"
              }`}
            >
              Todas
            </button>
            {positions.map((pos) => (
              <button
                key={pos.id}
                onClick={() => setPositionFilter(pos.id)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                  positionFilter === pos.id ? "bg-teal-600 text-white" : "bg-surface border border-border text-foreground-secondary hover:border-teal-400"
                }`}
              >
                {pos.abbreviation}
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
              className="w-full px-4 py-2 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-300 focus:border-teal-300 bg-surface-hover"
            />
          </div>

          {/* Player cards */}
          {filtered.length === 0 ? (
            <div className="bg-surface rounded-xl border border-border p-8 text-center text-foreground-secondary">
              <p className="text-lg font-medium mb-2">Sin jugadoras</p>
              <p className="text-sm">Añade tu primera jugadora a la plantilla.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {filtered.map((p) => {
                const age = calcAge(p.birth_date);
                return (
                  <div
                    key={p.id}
                    className="bg-surface rounded-xl border border-border overflow-hidden group hover:border-border-light transition-colors"
                    onContextMenu={(e) => { e.preventDefault(); setStatusMenu({ x: e.clientX, y: e.clientY, id: p.id, title: p.full_name }); }}
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
                        <div className="flex items-start justify-between gap-1">
                          <h3 className="font-semibold text-foreground text-sm truncate">{p.full_name}</h3>
                          {itemStatuses.has(p.id) && <StatusBadge status={itemStatuses.get(p.id)!} />}
                        </div>
                        <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                          {p.position && (
                            <span className="px-1.5 py-0.5 rounded bg-teal-900/40 text-teal-400 text-[10px] font-medium">
                              {p.position.abbreviation}
                            </span>
                          )}
                          {age !== null && <span className="text-[10px] text-muted">{age} años</span>}
                          {p.squad_number !== null && <span className="text-[10px] text-muted">· #{p.squad_number}</span>}
                        </div>
                        {p.club && <p className="text-xs text-muted mt-1 truncate">{p.club}</p>}
                        {p.dominant_foot && (
                          <p className="text-[10px] text-muted mt-0.5">{FOOT_LABELS[p.dominant_foot]}</p>
                        )}
                      </div>
                    </div>
                    {p.notes && <p className="px-4 pb-2 text-xs text-muted line-clamp-2">{p.notes}</p>}
                    <div className="flex gap-1 px-4 pb-3 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button onClick={() => openEdit(p)} className="px-2 py-1 text-xs text-muted hover:text-teal-400 hover:bg-teal-900/20 rounded">Editar</button>
                      <button onClick={() => handleDelete(p.id)} className="px-2 py-1 text-xs text-muted hover:text-red-400 hover:bg-red-900/20 rounded">Eliminar</button>
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
            <h3 className="text-xs font-semibold text-muted uppercase tracking-wider mb-3">Resumen</h3>
            <div className="grid grid-cols-2 gap-3">
              <div className="text-center">
                <p className="text-2xl font-bold text-foreground">{players.length}</p>
                <p className="text-[10px] text-muted uppercase">Jugadoras</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-foreground">{avgAge ?? "—"}</p>
                <p className="text-[10px] text-muted uppercase">Edad media</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-foreground">{clubs.length}</p>
                <p className="text-[10px] text-muted uppercase">Clubes</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-foreground">{byPosition.length}</p>
                <p className="text-[10px] text-muted uppercase">Posiciones</p>
              </div>
            </div>
          </div>

          <div className="bg-surface rounded-xl border border-border p-4">
            <h3 className="text-xs font-semibold text-muted uppercase tracking-wider mb-3">Por posición</h3>
            {byPosition.length === 0 ? (
              <p className="text-xs text-muted">Sin datos todavía</p>
            ) : (
              <div className="space-y-2">
                {byPosition.map(({ pos, count }) => {
                  const pct = players.length > 0 ? Math.round((count / players.length) * 100) : 0;
                  return (
                    <div key={pos.id}>
                      <div className="flex items-center justify-between text-xs mb-1">
                        <span className="text-foreground-secondary">{pos.abbreviation}</span>
                        <span className="text-muted">{count}</span>
                      </div>
                      <div className="w-full h-1.5 bg-surface-hover rounded-full overflow-hidden">
                        <div className="h-full rounded-full bg-teal-400" style={{ width: `${pct}%` }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Modal crear/editar */}
      {modalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-surface rounded-xl p-6 w-full max-w-lg shadow-xl max-h-[90vh] overflow-y-auto">
            <h3 className="font-semibold text-foreground mb-4">{editingId ? "Editar jugadora" : "Nueva jugadora"}</h3>

            {/* Foto */}
            <div className="flex items-center gap-3 mb-4">
              <div className="w-16 h-16 rounded-full bg-surface-hover border border-border overflow-hidden flex items-center justify-center flex-shrink-0">
                {form.photo_url ? (
                  <img src={form.photo_url} alt="" className="w-full h-full object-cover" />
                ) : (
                  <span className="text-xl text-muted">👤</span>
                )}
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="px-3 py-1.5 bg-surface-hover border border-border rounded-lg text-xs text-foreground-secondary hover:border-teal-400 hover:text-teal-400 transition-colors"
                >
                  Subir foto
                </button>
                <input ref={fileInputRef} type="file" accept="image/*" onChange={handlePhotoUpload} className="hidden" />
                {form.photo_url && (
                  <button onClick={() => setForm((f) => ({ ...f, photo_url: null }))} className="text-xs text-red-400 hover:text-red-300">
                    Quitar
                  </button>
                )}
              </div>
            </div>

            <input
              autoFocus
              value={form.full_name}
              onChange={(e) => setForm((f) => ({ ...f, full_name: e.target.value }))}
              placeholder="Nombre completo"
              className="w-full px-3 py-2 bg-surface-hover border border-border rounded-lg text-sm text-foreground mb-2 focus:outline-none focus:ring-2 focus:ring-teal-300"
            />

            <div className="grid grid-cols-2 gap-2 mb-2">
              <div>
                <label className="text-[10px] text-muted uppercase tracking-wide font-medium block mb-1">Fecha de nacimiento</label>
                <input
                  type="date"
                  value={form.birth_date ?? ""}
                  onChange={(e) => setForm((f) => ({ ...f, birth_date: e.target.value || null }))}
                  className="w-full px-3 py-2 bg-surface-hover border border-border rounded-lg text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-teal-300"
                />
              </div>
              <div>
                <label className="text-[10px] text-muted uppercase tracking-wide font-medium block mb-1">Posición</label>
                <select
                  value={form.position_id ?? ""}
                  onChange={(e) => setForm((f) => ({ ...f, position_id: e.target.value || null }))}
                  className="w-full px-3 py-2 bg-surface-hover border border-border rounded-lg text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-teal-300"
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
                    onClick={() => setForm((f) => ({ ...f, dominant_foot: f.dominant_foot === foot ? "" : foot }))}
                    className={`px-3 py-1.5 rounded text-xs font-medium transition-colors ${
                      form.dominant_foot === foot ? "bg-teal-900/50 text-teal-400" : "bg-surface-hover text-foreground-secondary"
                    }`}
                  >
                    {FOOT_LABELS[foot]}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2 mb-2">
              <input
                value={form.club}
                onChange={(e) => setForm((f) => ({ ...f, club: e.target.value }))}
                placeholder="Club"
                className="px-3 py-2 bg-surface-hover border border-border rounded-lg text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-teal-300"
              />
              <input
                value={form.nationality}
                onChange={(e) => setForm((f) => ({ ...f, nationality: e.target.value }))}
                placeholder="Nacionalidad"
                className="px-3 py-2 bg-surface-hover border border-border rounded-lg text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-teal-300"
              />
            </div>

            <div className="grid grid-cols-2 gap-2 mb-2">
              <input
                type="number"
                value={form.squad_number ?? ""}
                onChange={(e) => setForm((f) => ({ ...f, squad_number: e.target.value ? Number(e.target.value) : null }))}
                placeholder="Dorsal"
                className="px-3 py-2 bg-surface-hover border border-border rounded-lg text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-teal-300"
              />
              <input
                type="number"
                value={form.height_cm ?? ""}
                onChange={(e) => setForm((f) => ({ ...f, height_cm: e.target.value ? Number(e.target.value) : null }))}
                placeholder="Altura (cm)"
                className="px-3 py-2 bg-surface-hover border border-border rounded-lg text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-teal-300"
              />
            </div>

            <textarea
              value={form.notes}
              onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
              placeholder="Notas..."
              rows={2}
              className="w-full px-3 py-2 bg-surface-hover border border-border rounded-lg text-sm text-foreground mb-4 focus:outline-none focus:ring-2 focus:ring-teal-300 resize-none"
            />

            <div className="flex gap-2 justify-end">
              <button onClick={closeModal} className="px-4 py-2 bg-surface-hover text-foreground-secondary rounded-lg text-sm hover:bg-border">
                Cancelar
              </button>
              <button onClick={handleSave} className="px-4 py-2 bg-teal-600 text-white rounded-lg text-sm hover:bg-teal-700">
                {editingId ? "Guardar" : "Crear"}
              </button>
            </div>
          </div>
        </div>
      )}

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
