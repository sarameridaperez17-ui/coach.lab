"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import {
  getABPStrategies,
  createABPStrategy,
  updateABPStrategy,
  deleteABPStrategy,
} from "@/lib/api";
import type { ABPStrategy, ABPType } from "@/types";

// ── Constantes ─────────────────────────────────────────────────
const ABP_TYPES: { id: ABPType; name: string }[] = [
  { id: "offensive", name: "ABP Ofensivo" },
  { id: "defensive", name: "ABP Defensivo" },
];

const ABP_SUBTYPES: Record<string, { id: string; name: string }[]> = {
  offensive: [
    { id: "falta-indirecta-area", name: "Falta indirecta en área" },
    { id: "falta-profunda", name: "Falta profunda" },
    { id: "falta-lateral", name: "Falta lateral" },
    { id: "falta-alejada", name: "Falta alejada" },
    { id: "falta-frontal-directa", name: "Falta frontal directa" },
    { id: "falta-frontal-alejada", name: "Falta frontal alejada" },
    { id: "corner", name: "Córner" },
    { id: "saque-banda", name: "Saque de banda" },
    { id: "saque-centro", name: "Saque de centro" },
  ],
  defensive: [
    { id: "falta-indirecta-area-def", name: "Falta indirecta en área" },
    { id: "falta-profunda-def", name: "Falta profunda" },
    { id: "falta-lateral-def", name: "Falta lateral" },
    { id: "falta-alejada-def", name: "Falta alejada" },
    { id: "falta-frontal-directa-def", name: "Falta frontal directa" },
    { id: "falta-frontal-alejada-def", name: "Falta frontal alejada" },
    { id: "corner-def", name: "Córner" },
    { id: "saque-banda-def", name: "Saque de banda" },
    { id: "saque-centro-def", name: "Saque de centro" },
  ],
};

const EXECUTION_OPTIONS = ["Directo", "Corto", "Combinado"];
const TARGET_ZONE_OPTIONS = ["1º Palo", "2º Palo", "Zona central", "Frontal", "Punto de penalti", "Área pequeña", "Rechace"];
const STRUCTURE_OPTIONS = ["Zonal", "Individual", "Mixta"];
const PROTECTION_ZONE_OPTIONS = ["1º Palo", "2º Palo", "Zona central", "Frontal", "Punto de penalti", "Área pequeña", "Rechace"];

// All category filter options
const ALL_CATEGORIES = [
  "Falta indirecta en área", "Falta profunda", "Falta lateral", "Falta alejada",
  "Falta frontal directa", "Falta frontal alejada", "Córner", "Saque de banda", "Saque de centro",
];

export default function ABPPage() {
  const [selectedType, setSelectedType] = useState<ABPType>("offensive");
  const [strategies, setStrategies] = useState<ABPStrategy[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterText, setFilterText] = useState("");

  // Modal state
  const [modalSubtype, setModalSubtype] = useState<string | null>(null);
  const [modalSubtypeName, setModalSubtypeName] = useState("");
  const [editingStrategy, setEditingStrategy] = useState<ABPStrategy | null>(null);

  // Form fields
  const [formTitle, setFormTitle] = useState("");
  const [formDesc, setFormDesc] = useState("");
  const [formKeyPoints, setFormKeyPoints] = useState("");
  const [formImageUrl, setFormImageUrl] = useState("");
  const [formExecution, setFormExecution] = useState("");
  const [formTargetZone, setFormTargetZone] = useState("");
  const [formStructure, setFormStructure] = useState("");
  const [formProtectionZone, setFormProtectionZone] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Selected category for detail view
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  // Quick filters
  const [qfCategory, setQfCategory] = useState("");
  const [qfExecution, setQfExecution] = useState("");
  const [qfTargetZone, setQfTargetZone] = useState("");
  const [qfStructure, setQfStructure] = useState("");
  const [qfProtectionZone, setQfProtectionZone] = useState("");

  const load = useCallback(async () => {
    try {
      const data = await getABPStrategies(selectedType);
      setStrategies(data);
    } catch (err) {
      console.error("Error loading ABP strategies:", err);
    } finally {
      setLoading(false);
    }
  }, [selectedType]);

  useEffect(() => {
    setLoading(true);
    load();
  }, [load]);

  const getStrategiesForSubtype = (subtypeId: string) =>
    strategies.filter((s) => s.subtype === subtypeId);

  const openModal = (subtypeId: string, subtypeName: string, strategy?: ABPStrategy) => {
    setModalSubtype(subtypeId);
    setModalSubtypeName(subtypeName);
    if (strategy) {
      setEditingStrategy(strategy);
      setFormTitle(strategy.title);
      setFormDesc(strategy.description || "");
      setFormKeyPoints(strategy.key_points || "");
      setFormImageUrl(strategy.image_url || "");
      setFormExecution(strategy.execution_type || "");
      setFormTargetZone(strategy.target_zone || "");
      setFormStructure(strategy.structure_type || "");
      setFormProtectionZone(strategy.protection_zone || "");
    } else {
      setEditingStrategy(null);
      setFormTitle("");
      setFormDesc("");
      setFormKeyPoints("");
      setFormImageUrl("");
      setFormExecution("");
      setFormTargetZone("");
      setFormStructure("");
      setFormProtectionZone("");
    }
  };

  const closeModal = () => {
    setModalSubtype(null);
    setEditingStrategy(null);
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onloadend = () => {
      setFormImageUrl(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleCreate = async () => {
    if (!modalSubtype || !formTitle.trim()) return;
    try {
      await createABPStrategy({
        abp_type: selectedType,
        subtype: modalSubtype,
        title: formTitle.trim(),
        description: formDesc.trim(),
        key_points: formKeyPoints.trim(),
        image_url: formImageUrl,
        execution_type: selectedType === "offensive" ? formExecution : "",
        target_zone: selectedType === "offensive" ? formTargetZone : "",
        structure_type: selectedType === "defensive" ? formStructure : "",
        protection_zone: selectedType === "defensive" ? formProtectionZone : "",
      });
      closeModal();
      await load();
    } catch (err) {
      console.error("Error creating strategy:", err);
    }
  };

  const handleUpdate = async () => {
    if (!editingStrategy || !formTitle.trim()) return;
    try {
      await updateABPStrategy(editingStrategy.id, {
        title: formTitle.trim(),
        description: formDesc.trim(),
        key_points: formKeyPoints.trim(),
        image_url: formImageUrl,
        execution_type: selectedType === "offensive" ? formExecution : editingStrategy.execution_type,
        target_zone: selectedType === "offensive" ? formTargetZone : editingStrategy.target_zone,
        structure_type: selectedType === "defensive" ? formStructure : editingStrategy.structure_type,
        protection_zone: selectedType === "defensive" ? formProtectionZone : editingStrategy.protection_zone,
      });
      closeModal();
      await load();
    } catch (err) {
      console.error("Error updating strategy:", err);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("¿Eliminar esta estrategia?")) return;
    try {
      await deleteABPStrategy(id);
      await load();
    } catch (err) {
      console.error("Error deleting strategy:", err);
    }
  };

  const toggleFavorite = async (strat: ABPStrategy) => {
    try {
      await updateABPStrategy(strat.id, { is_favorite: !strat.is_favorite });
      await load();
    } catch (err) {
      console.error("Error toggling favorite:", err);
    }
  };

  // Filtered strategies for search bar
  const filteredStrategies = filterText
    ? strategies.filter(s =>
        s.title.toLowerCase().includes(filterText.toLowerCase()) ||
        (s.description?.toLowerCase().includes(filterText.toLowerCase()))
      )
    : [];

  // Recent strategies
  const recentStrategies = [...strategies]
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    .slice(0, 5);

  // Favorite strategies
  const favoriteStrategies = strategies.filter(s => s.is_favorite);

  // Sidebar counts — dynamic per selected type
  const currentTypeCount = strategies.length;

  // Pattern counts
  const executionCounts = EXECUTION_OPTIONS.map(opt => ({
    label: opt,
    count: strategies.filter(s => s.execution_type === opt).length,
  }));
  const targetZoneCounts = TARGET_ZONE_OPTIONS.map(opt => ({
    label: opt,
    count: strategies.filter(s => s.target_zone === opt).length,
  }));
  const structureCounts = STRUCTURE_OPTIONS.map(opt => ({
    label: opt,
    count: strategies.filter(s => s.structure_type === opt).length,
  }));
  const protectionZoneCounts = PROTECTION_ZONE_OPTIONS.map(opt => ({
    label: opt,
    count: strategies.filter(s => s.protection_zone === opt).length,
  }));

  // Quick filter logic
  const hasQuickFilter = qfCategory || qfExecution || qfTargetZone || qfStructure || qfProtectionZone;
  const quickFilterResults = hasQuickFilter
    ? strategies.filter(s => {
        const subtypeInfo = ABP_SUBTYPES[selectedType].find(st => st.id === s.subtype);
        if (qfCategory && subtypeInfo?.name !== qfCategory) return false;
        if (qfExecution && s.execution_type !== qfExecution) return false;
        if (qfTargetZone && s.target_zone !== qfTargetZone) return false;
        if (qfStructure && s.structure_type !== qfStructure) return false;
        if (qfProtectionZone && s.protection_zone !== qfProtectionZone) return false;
        return true;
      })
    : [];

  // Selected category
  const selectedCatSubtype = ABP_SUBTYPES[selectedType].find(s => s.id === selectedCategory);
  const selectedCatStrategies = selectedCategory ? getStrategiesForSubtype(selectedCategory) : [];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-gray-400">Cargando ABP...</p>
      </div>
    );
  }

  return (
    <div className="flex gap-6">
      {/* LEFT: Main content */}
      <div className="flex-1 min-w-0">
        <h1 className="text-2xl font-bold text-gray-200 mb-6">Acciones a balón parado</h1>

        {/* Tipo ABP tabs — sin iconos */}
        <div className="mb-6">
          <div className="flex border-b border-[#2a2d37]">
            {ABP_TYPES.map((type) => (
              <button
                key={type.id}
                onClick={() => { setSelectedType(type.id); setSelectedCategory(null); }}
                className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
                  selectedType === type.id
                    ? "border-orange-500 text-orange-400"
                    : "border-transparent text-gray-500 hover:text-gray-300"
                }`}
              >
                {type.name}
              </button>
            ))}
          </div>
        </div>

        {/* Search bar */}
        <div className="mb-6">
          <div className="relative">
            <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <circle cx="11" cy="11" r="8" /><path d="M21 21l-4.35-4.35" />
            </svg>
            <input
              type="text"
              value={filterText}
              onChange={(e) => setFilterText(e.target.value)}
              placeholder="Buscar estrategia..."
              className="w-full pl-10 pr-3 py-2 bg-[#1a1d27] border border-[#2a2d37] rounded-lg text-sm text-gray-300 focus:outline-none focus:border-orange-400"
            />
          </div>
          {filterText && (
            <div className="mt-2 bg-[#1a1d27] border border-[#2a2d37] rounded-lg overflow-hidden">
              {filteredStrategies.length === 0 ? (
                <p className="px-4 py-3 text-xs text-gray-500">Sin resultados para &ldquo;{filterText}&rdquo;</p>
              ) : (
                filteredStrategies.map(strat => (
                  <div
                    key={strat.id}
                    className="px-4 py-2 border-b border-[#22252f] last:border-0 hover:bg-[#22252f] cursor-pointer"
                    onClick={() => { setSelectedCategory(strat.subtype); setFilterText(""); }}
                  >
                    <p className="text-xs font-medium text-orange-300">{strat.title}</p>
                    <p className="text-[10px] text-gray-500">{ABP_SUBTYPES[selectedType].find(s => s.id === strat.subtype)?.name}</p>
                  </div>
                ))
              )}
            </div>
          )}
        </div>

        {/* Category cards or detail view */}
        {selectedCategory && selectedCatSubtype ? (
          <div>
            <button
              onClick={() => setSelectedCategory(null)}
              className="text-xs text-gray-400 hover:text-gray-300 mb-4 flex items-center gap-1"
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M19 12H5M12 19l-7-7 7-7" /></svg>
              Volver a categorías
            </button>
            <div className="mb-4">
              <h2 className="text-lg font-semibold text-gray-200">{selectedCatSubtype.name}</h2>
              <p className="text-xs text-gray-500">{selectedCatStrategies.length} estrategias</p>
            </div>

            <div className="space-y-3">
              {selectedCatStrategies.map(strat => (
                <div key={strat.id} className="bg-[#1a1d27] rounded-xl border border-[#2a2d37] p-4 group">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <h3 className="text-sm font-semibold text-orange-300">{strat.title}</h3>
                      <button
                        onClick={() => toggleFavorite(strat)}
                        className={`text-sm transition-colors ${strat.is_favorite ? "text-yellow-400" : "text-gray-600 hover:text-yellow-400"}`}
                        title={strat.is_favorite ? "Quitar de favoritos" : "Marcar como favorito"}
                      >
                        {strat.is_favorite ? "★" : "☆"}
                      </button>
                    </div>
                    <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button onClick={() => openModal(selectedCategory!, selectedCatSubtype.name, strat)} className="text-xs text-gray-400 hover:text-orange-400">Editar</button>
                      <button onClick={() => handleDelete(strat.id)} className="text-xs text-gray-400 hover:text-red-500">✕</button>
                    </div>
                  </div>
                  {strat.description && <p className="text-xs text-gray-400 mb-2">{strat.description}</p>}
                  {strat.image_url && (
                    <img src={strat.image_url} alt={strat.title} className="w-full max-h-48 object-contain rounded-lg bg-[#22252f] mb-2" />
                  )}
                  {/* Tags */}
                  <div className="flex flex-wrap gap-1.5 mt-2">
                    {strat.execution_type && <span className="px-2 py-0.5 rounded-full bg-orange-900/30 text-orange-300 text-[10px]">{strat.execution_type}</span>}
                    {strat.target_zone && <span className="px-2 py-0.5 rounded-full bg-blue-900/30 text-blue-300 text-[10px]">{strat.target_zone}</span>}
                    {strat.structure_type && <span className="px-2 py-0.5 rounded-full bg-purple-900/30 text-purple-300 text-[10px]">{strat.structure_type}</span>}
                    {strat.protection_zone && <span className="px-2 py-0.5 rounded-full bg-emerald-900/30 text-emerald-300 text-[10px]">{strat.protection_zone}</span>}
                  </div>
                  {strat.key_points && (
                    <div className="bg-[#22252f] rounded-lg p-3 mt-2">
                      <p className="text-[10px] text-gray-500 uppercase tracking-wide mb-1">Puntos clave</p>
                      <p className="text-xs text-gray-300 whitespace-pre-line">{strat.key_points}</p>
                    </div>
                  )}
                </div>
              ))}
              <button
                onClick={() => openModal(selectedCategory!, selectedCatSubtype.name)}
                className="w-full py-4 border-2 border-dashed border-[#2a2d37] rounded-xl text-sm font-medium text-gray-400 hover:border-orange-400 hover:text-orange-400 transition-colors"
              >
                + Definir estrategia
              </button>
            </div>
          </div>
        ) : (
          /* Category cards — sin iconos */
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {ABP_SUBTYPES[selectedType].map((subtype) => {
              const count = getStrategiesForSubtype(subtype.id).length;
              return (
                <button
                  key={subtype.id}
                  onClick={() => setSelectedCategory(subtype.id)}
                  className="bg-[#1a1d27] rounded-xl border border-[#2a2d37] p-4 text-left hover:border-orange-500/40 hover:bg-orange-900/5 transition-colors group"
                >
                  <h3 className="text-sm font-semibold text-gray-200 mb-1 group-hover:text-orange-300 transition-colors">{subtype.name}</h3>
                  <p className="text-xs text-gray-500">
                    {count} {count === 1 ? "estrategia" : "estrategias"}
                  </p>
                </button>
              );
            })}
          </div>
        )}

        {/* Estrategias recientes */}
        {!selectedCategory && strategies.length > 0 && (
          <div className="mt-6">
            <h2 className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-3">Estrategias recientes</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {recentStrategies.map(strat => {
                const subtypeInfo = ABP_SUBTYPES[selectedType].find(s => s.id === strat.subtype);
                return (
                  <div
                    key={strat.id}
                    className="bg-[#1a1d27] rounded-lg border border-[#2a2d37] p-3 hover:border-orange-500/30 cursor-pointer transition-colors"
                    onClick={() => setSelectedCategory(strat.subtype)}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <p className="text-xs font-medium text-orange-300">{strat.title}</p>
                      <button
                        onClick={(e) => { e.stopPropagation(); toggleFavorite(strat); }}
                        className={`text-sm ${strat.is_favorite ? "text-yellow-400" : "text-gray-600 hover:text-yellow-400"}`}
                      >
                        {strat.is_favorite ? "★" : "☆"}
                      </button>
                    </div>
                    <p className="text-[10px] text-gray-500">{subtypeInfo?.name}</p>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Estrategias favoritas */}
        {!selectedCategory && favoriteStrategies.length > 0 && (
          <div className="mt-6">
            <h2 className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-3">Estrategias favoritas</h2>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {favoriteStrategies.map(strat => {
                const subtypeInfo = ABP_SUBTYPES[selectedType].find(s => s.id === strat.subtype);
                return (
                  <div
                    key={strat.id}
                    className="bg-[#1a1d27] rounded-xl border border-yellow-500/20 p-3 hover:border-yellow-500/40 cursor-pointer transition-colors"
                    onClick={() => setSelectedCategory(strat.subtype)}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-[10px] text-orange-400 font-medium uppercase">{subtypeInfo?.name}</span>
                      <span className="text-yellow-400 text-xs">★</span>
                    </div>
                    <p className="text-xs font-semibold text-gray-200 mb-1">{strat.title}</p>
                    {strat.image_url && (
                      <img src={strat.image_url} alt={strat.title} className="w-full h-20 object-contain rounded bg-[#22252f] mb-1.5" />
                    )}
                    <div className="flex flex-wrap gap-1">
                      {strat.execution_type && <span className="px-1.5 py-0.5 rounded-full bg-orange-900/30 text-orange-300 text-[9px]">{strat.execution_type}</span>}
                      {strat.target_zone && <span className="px-1.5 py-0.5 rounded-full bg-blue-900/30 text-blue-300 text-[9px]">{strat.target_zone}</span>}
                      {strat.structure_type && <span className="px-1.5 py-0.5 rounded-full bg-purple-900/30 text-purple-300 text-[9px]">{strat.structure_type}</span>}
                      {strat.protection_zone && <span className="px-1.5 py-0.5 rounded-full bg-emerald-900/30 text-emerald-300 text-[9px]">{strat.protection_zone}</span>}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ── Filtro de acciones rápidas ───────────────────────────── */}
        <div className="mt-8 bg-[#1a1d27] rounded-xl border border-[#2a2d37] p-4">
          <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">Filtro de acciones rápidas</h2>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-4">
            {/* F1: Categorías */}
            <div>
              <label className="text-[10px] text-gray-500 uppercase tracking-wider block mb-1">Categoría</label>
              <select
                value={qfCategory}
                onChange={(e) => setQfCategory(e.target.value)}
                className="w-full px-2 py-1.5 bg-[#22252f] border border-[#2a2d37] rounded text-xs text-gray-300 focus:outline-none focus:border-orange-400"
              >
                <option value="">Todas</option>
                {ALL_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            {/* F2: Ejecución */}
            <div>
              <label className="text-[10px] text-gray-500 uppercase tracking-wider block mb-1">Ejecución</label>
              <select
                value={qfExecution}
                onChange={(e) => setQfExecution(e.target.value)}
                className="w-full px-2 py-1.5 bg-[#22252f] border border-[#2a2d37] rounded text-xs text-gray-300 focus:outline-none focus:border-orange-400"
              >
                <option value="">Todas</option>
                {EXECUTION_OPTIONS.map(o => <option key={o} value={o}>{o}</option>)}
              </select>
            </div>
            {/* F3: Zona objetivo */}
            <div>
              <label className="text-[10px] text-gray-500 uppercase tracking-wider block mb-1">Zona objetivo</label>
              <select
                value={qfTargetZone}
                onChange={(e) => setQfTargetZone(e.target.value)}
                className="w-full px-2 py-1.5 bg-[#22252f] border border-[#2a2d37] rounded text-xs text-gray-300 focus:outline-none focus:border-orange-400"
              >
                <option value="">Todas</option>
                {TARGET_ZONE_OPTIONS.map(o => <option key={o} value={o}>{o}</option>)}
              </select>
            </div>
            {/* F4: Estructura */}
            <div>
              <label className="text-[10px] text-gray-500 uppercase tracking-wider block mb-1">Estructura</label>
              <select
                value={qfStructure}
                onChange={(e) => setQfStructure(e.target.value)}
                className="w-full px-2 py-1.5 bg-[#22252f] border border-[#2a2d37] rounded text-xs text-gray-300 focus:outline-none focus:border-orange-400"
              >
                <option value="">Todas</option>
                {STRUCTURE_OPTIONS.map(o => <option key={o} value={o}>{o}</option>)}
              </select>
            </div>
            {/* F5: Zona de protección */}
            <div>
              <label className="text-[10px] text-gray-500 uppercase tracking-wider block mb-1">Zona protección</label>
              <select
                value={qfProtectionZone}
                onChange={(e) => setQfProtectionZone(e.target.value)}
                className="w-full px-2 py-1.5 bg-[#22252f] border border-[#2a2d37] rounded text-xs text-gray-300 focus:outline-none focus:border-orange-400"
              >
                <option value="">Todas</option>
                {PROTECTION_ZONE_OPTIONS.map(o => <option key={o} value={o}>{o}</option>)}
              </select>
            </div>
          </div>
          {hasQuickFilter && (
            <div>
              <div className="flex items-center justify-between mb-2">
                <p className="text-xs text-gray-400">{quickFilterResults.length} resultado{quickFilterResults.length !== 1 ? "s" : ""}</p>
                <button
                  onClick={() => { setQfCategory(""); setQfExecution(""); setQfTargetZone(""); setQfStructure(""); setQfProtectionZone(""); }}
                  className="text-[10px] text-orange-400 hover:text-orange-300"
                >
                  Limpiar filtros
                </button>
              </div>
              {quickFilterResults.length > 0 ? (
                <div className="space-y-2">
                  {quickFilterResults.map(strat => {
                    const subtypeInfo = ABP_SUBTYPES[selectedType].find(s => s.id === strat.subtype);
                    return (
                      <div key={strat.id} className="bg-[#22252f] rounded-lg p-3 flex items-center gap-3">
                        {strat.image_url && (
                          <img src={strat.image_url} alt="" className="w-12 h-12 object-contain rounded bg-[#1a1d27]" />
                        )}
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-medium text-orange-300">{strat.title}</p>
                          <p className="text-[10px] text-gray-500">{subtypeInfo?.name}</p>
                          <div className="flex flex-wrap gap-1 mt-1">
                            {strat.execution_type && <span className="px-1.5 py-0.5 rounded-full bg-orange-900/30 text-orange-300 text-[9px]">{strat.execution_type}</span>}
                            {strat.target_zone && <span className="px-1.5 py-0.5 rounded-full bg-blue-900/30 text-blue-300 text-[9px]">{strat.target_zone}</span>}
                            {strat.structure_type && <span className="px-1.5 py-0.5 rounded-full bg-purple-900/30 text-purple-300 text-[9px]">{strat.structure_type}</span>}
                            {strat.protection_zone && <span className="px-1.5 py-0.5 rounded-full bg-emerald-900/30 text-emerald-300 text-[9px]">{strat.protection_zone}</span>}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <p className="text-xs text-gray-500 text-center py-3">Sin estrategias que coincidan con los filtros</p>
              )}
            </div>
          )}
        </div>
      </div>

      {/* RIGHT: Sidebar */}
      <div className="w-72 flex-shrink-0 space-y-4">
        {/* Resumen ABP — dinámico */}
        <div className="bg-[#1a1d27] rounded-xl border border-[#2a2d37] overflow-hidden">
          <div className="px-4 py-3 border-b border-[#22252f]">
            <h3 className="text-sm font-semibold text-gray-200">
              Resumen {selectedType === "offensive" ? "ABP Ofensivo" : "ABP Defensivo"}
            </h3>
          </div>
          <div className="p-4 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs text-gray-400">Total estrategias</span>
              <span className="text-sm font-bold text-orange-400">{currentTypeCount}</span>
            </div>
            <div className="pt-2 border-t border-[#22252f]">
              <p className="text-[10px] text-gray-500 uppercase tracking-wide mb-2">Por categoría</p>
              {ABP_SUBTYPES[selectedType]
                .filter(s => getStrategiesForSubtype(s.id).length > 0)
                .map(s => (
                  <div key={s.id} className="flex items-center justify-between mb-1">
                    <span className="text-xs text-gray-400">{s.name}</span>
                    <span className="text-xs text-orange-400">{getStrategiesForSubtype(s.id).length}</span>
                  </div>
                ))
              }
              {ABP_SUBTYPES[selectedType].filter(s => getStrategiesForSubtype(s.id).length > 0).length === 0 && (
                <p className="text-xs text-gray-600">Sin estrategias aún</p>
              )}
            </div>
          </div>
        </div>

        {/* Patrones creados */}
        <div className="bg-[#1a1d27] rounded-xl border border-[#2a2d37] overflow-hidden">
          <div className="px-4 py-3 border-b border-[#22252f]">
            <h3 className="text-sm font-semibold text-gray-200">Patrones creados</h3>
          </div>
          <div className="p-4 space-y-3">
            {selectedType === "offensive" ? (
              <>
                <div>
                  <p className="text-[10px] text-gray-500 uppercase tracking-wide mb-1.5">Ejecución</p>
                  {executionCounts.map(({ label, count }) => (
                    <div key={label} className="flex items-center justify-between mb-1">
                      <span className="text-xs text-gray-400">{label}</span>
                      <span className="text-xs text-orange-400 font-medium">{count}</span>
                    </div>
                  ))}
                </div>
                <div className="pt-2 border-t border-[#22252f]">
                  <p className="text-[10px] text-gray-500 uppercase tracking-wide mb-1.5">Zona objetivo</p>
                  {targetZoneCounts.map(({ label, count }) => (
                    <div key={label} className="flex items-center justify-between mb-1">
                      <span className="text-xs text-gray-400">{label}</span>
                      <span className="text-xs text-orange-400 font-medium">{count}</span>
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <>
                <div>
                  <p className="text-[10px] text-gray-500 uppercase tracking-wide mb-1.5">Estructura</p>
                  {structureCounts.map(({ label, count }) => (
                    <div key={label} className="flex items-center justify-between mb-1">
                      <span className="text-xs text-gray-400">{label}</span>
                      <span className="text-xs text-orange-400 font-medium">{count}</span>
                    </div>
                  ))}
                </div>
                <div className="pt-2 border-t border-[#22252f]">
                  <p className="text-[10px] text-gray-500 uppercase tracking-wide mb-1.5">Zona de protección</p>
                  {protectionZoneCounts.map(({ label, count }) => (
                    <div key={label} className="flex items-center justify-between mb-1">
                      <span className="text-xs text-gray-400">{label}</span>
                      <span className="text-xs text-orange-400 font-medium">{count}</span>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Modal */}
      {modalSubtype && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={closeModal}>
          <div className="bg-[#1a1d27] rounded-xl p-6 w-full max-w-lg shadow-xl border border-[#2a2d37] max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <h3 className="font-semibold text-gray-200 mb-1">
              {editingStrategy ? "Editar estrategia" : "Nueva estrategia"}
            </h3>
            <p className="text-sm text-gray-500 mb-4">
              {modalSubtypeName} · {selectedType === "offensive" ? "Ofensivo" : "Defensivo"}
            </p>

            <input
              autoFocus
              value={formTitle}
              onChange={(e) => setFormTitle(e.target.value)}
              placeholder="Título (ej: Córner al primer palo)"
              className="w-full px-3 py-2 bg-[#22252f] border border-[#2a2d37] rounded-lg text-sm text-gray-200 mb-2 focus:outline-none focus:border-orange-400"
            />
            <textarea
              value={formDesc}
              onChange={(e) => setFormDesc(e.target.value)}
              placeholder="Descripción de la estrategia..."
              rows={3}
              className="w-full px-3 py-2 bg-[#22252f] border border-[#2a2d37] rounded-lg text-sm text-gray-200 mb-2 focus:outline-none focus:border-orange-400 resize-none"
            />
            <textarea
              value={formKeyPoints}
              onChange={(e) => setFormKeyPoints(e.target.value)}
              placeholder="Puntos clave (uno por línea)..."
              rows={3}
              className="w-full px-3 py-2 bg-[#22252f] border border-[#2a2d37] rounded-lg text-sm text-gray-200 mb-3 focus:outline-none focus:border-orange-400 resize-none"
            />

            {/* Imagen */}
            <div className="mb-3">
              <label className="text-[10px] text-gray-500 uppercase tracking-wider block mb-1">Imagen de la acción</label>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="px-3 py-1.5 bg-[#22252f] border border-[#2a2d37] rounded-lg text-xs text-gray-400 hover:border-orange-400 hover:text-orange-400 transition-colors"
                >
                  Subir imagen
                </button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleImageUpload}
                  className="hidden"
                />
                {formImageUrl && (
                  <button
                    onClick={() => setFormImageUrl("")}
                    className="text-xs text-red-400 hover:text-red-300"
                  >
                    Quitar
                  </button>
                )}
              </div>
              {formImageUrl && (
                <img src={formImageUrl} alt="Preview" className="mt-2 w-full max-h-32 object-contain rounded-lg bg-[#22252f]" />
              )}
            </div>

            {/* Etiquetas según tipo */}
            {selectedType === "offensive" ? (
              <div className="space-y-3 mb-4">
                <div>
                  <label className="text-[10px] text-gray-500 uppercase tracking-wider block mb-1">Ejecución</label>
                  <div className="flex gap-2">
                    {EXECUTION_OPTIONS.map(opt => (
                      <button
                        key={opt}
                        onClick={() => setFormExecution(formExecution === opt ? "" : opt)}
                        className={`px-3 py-1.5 rounded-lg text-xs transition-colors ${
                          formExecution === opt
                            ? "bg-orange-600 text-white"
                            : "bg-[#22252f] border border-[#2a2d37] text-gray-400 hover:border-orange-400"
                        }`}
                      >
                        {opt}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="text-[10px] text-gray-500 uppercase tracking-wider block mb-1">Zona objetivo</label>
                  <div className="flex flex-wrap gap-1.5">
                    {TARGET_ZONE_OPTIONS.map(opt => (
                      <button
                        key={opt}
                        onClick={() => setFormTargetZone(formTargetZone === opt ? "" : opt)}
                        className={`px-2.5 py-1 rounded-lg text-xs transition-colors ${
                          formTargetZone === opt
                            ? "bg-blue-600 text-white"
                            : "bg-[#22252f] border border-[#2a2d37] text-gray-400 hover:border-blue-400"
                        }`}
                      >
                        {opt}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              <div className="space-y-3 mb-4">
                <div>
                  <label className="text-[10px] text-gray-500 uppercase tracking-wider block mb-1">Estructura</label>
                  <div className="flex gap-2">
                    {STRUCTURE_OPTIONS.map(opt => (
                      <button
                        key={opt}
                        onClick={() => setFormStructure(formStructure === opt ? "" : opt)}
                        className={`px-3 py-1.5 rounded-lg text-xs transition-colors ${
                          formStructure === opt
                            ? "bg-purple-600 text-white"
                            : "bg-[#22252f] border border-[#2a2d37] text-gray-400 hover:border-purple-400"
                        }`}
                      >
                        {opt}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="text-[10px] text-gray-500 uppercase tracking-wider block mb-1">Zona de protección</label>
                  <div className="flex flex-wrap gap-1.5">
                    {PROTECTION_ZONE_OPTIONS.map(opt => (
                      <button
                        key={opt}
                        onClick={() => setFormProtectionZone(formProtectionZone === opt ? "" : opt)}
                        className={`px-2.5 py-1 rounded-lg text-xs transition-colors ${
                          formProtectionZone === opt
                            ? "bg-emerald-600 text-white"
                            : "bg-[#22252f] border border-[#2a2d37] text-gray-400 hover:border-emerald-400"
                        }`}
                      >
                        {opt}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}

            <div className="flex gap-2 justify-end">
              <button onClick={closeModal} className="px-4 py-2 text-xs text-gray-400 hover:text-gray-300">Cancelar</button>
              <button
                onClick={editingStrategy ? handleUpdate : handleCreate}
                className="px-4 py-2 bg-orange-600 text-white rounded-lg text-xs font-medium hover:bg-orange-700"
              >
                {editingStrategy ? "Guardar" : "Crear"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
