"use client";

import { useState, useEffect, useCallback } from "react";
import {
  getTeamContexts,
  getGamePhases,
  getPositions,
  getFieldZones,
  getPositionBehaviors,
  upsertPositionBehavior,
} from "@/lib/api";
import type {
  TeamContext,
  GamePhase,
  Position,
  FieldZone,
  PositionBehavior,
} from "@/types";

export default function PosicionesPage() {
  const [contexts, setContexts] = useState<TeamContext[]>([]);
  const [phases, setPhases] = useState<GamePhase[]>([]);
  const [positions, setPositions] = useState<Position[]>([]);
  const [zones, setZones] = useState<FieldZone[]>([]);
  const [behaviors, setBehaviors] = useState<PositionBehavior[]>([]);

  const [selectedContext, setSelectedContext] = useState("");
  const [selectedPosition, setSelectedPosition] = useState("");
  const [loading, setLoading] = useState(true);

  // Modal para editar celda
  const [editCell, setEditCell] = useState<{
    zoneId: string;
    phaseId: string;
  } | null>(null);
  const [cellTitle, setCellTitle] = useState("");
  const [cellDetails, setCellDetails] = useState("");

  useEffect(() => {
    async function loadBase() {
      try {
        const [ctx, ph, pos, zn] = await Promise.all([
          getTeamContexts(),
          getGamePhases(),
          getPositions(),
          getFieldZones(),
        ]);
        setContexts(ctx);
        setPhases(ph);
        setPositions(pos);
        setZones(zn);
        if (ctx.length > 0) setSelectedContext(ctx[0].id);
        if (pos.length > 0) setSelectedPosition(pos[0].id);
      } catch (err) {
        console.error("Error loading base data:", err);
      } finally {
        setLoading(false);
      }
    }
    loadBase();
  }, []);

  const loadBehaviors = useCallback(async () => {
    if (!selectedPosition || !selectedContext) return;
    try {
      const data = await getPositionBehaviors(selectedPosition, selectedContext);
      setBehaviors(data);
    } catch (err) {
      console.error("Error loading behaviors:", err);
    }
  }, [selectedPosition, selectedContext]);

  useEffect(() => {
    loadBehaviors();
  }, [loadBehaviors]);

  const getBehaviorForCell = (zoneId: string, phaseId: string) => {
    return behaviors.find(
      (b) => b.field_zone_id === zoneId && b.game_phase_id === phaseId
    );
  };

  const handleSaveCell = async () => {
    if (!editCell || !cellTitle.trim()) return;
    try {
      await upsertPositionBehavior(
        selectedPosition,
        editCell.zoneId,
        editCell.phaseId,
        selectedContext,
        cellTitle.trim(),
        cellDetails.trim()
      );
      setEditCell(null);
      setCellTitle("");
      setCellDetails("");
      await loadBehaviors();
    } catch (err) {
      console.error("Error saving cell:", err);
    }
  };

  const activePosition = positions.find((p) => p.id === selectedPosition);
  const displayPhases = phases.filter((p) => p.name !== "ABP");

  if (loading) {
    return (
      <div className="max-w-6xl flex items-center justify-center h-64">
        <p className="text-gray-400">Cargando posiciones...</p>
      </div>
    );
  }

  return (
    <div className="max-w-6xl">
      <h1 className="text-2xl font-bold text-gray-200 mb-6">Perfiles de posición</h1>

      {/* Contexto */}
      <div className="mb-6">
        <h2 className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-3">
          Contexto de equipo
        </h2>
        <div className="flex flex-wrap gap-2">
          {contexts.map((ctx) => (
            <button
              key={ctx.id}
              onClick={() => setSelectedContext(ctx.id)}
              className={`px-3 py-1.5 rounded text-sm transition-colors ${
                selectedContext === ctx.id
                  ? "bg-emerald-600 text-white"
                  : "bg-[#1a1d27] border border-[#2a2d37] text-gray-400 hover:border-emerald-300"
              }`}
            >
              {ctx.name}
            </button>
          ))}
        </div>
      </div>

      {/* Grid de posiciones */}
      <div className="mb-8">
        <h2 className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-3">
          Posición
        </h2>
        <div className="grid grid-cols-4 md:grid-cols-6 lg:grid-cols-12 gap-2">
          {positions.map((pos) => (
            <button
              key={pos.id}
              onClick={() => setSelectedPosition(pos.id)}
              className={`p-3 rounded-lg text-center transition-colors ${
                selectedPosition === pos.id
                  ? "bg-blue-600 text-white"
                  : "bg-[#1a1d27] border border-[#2a2d37] text-gray-300 hover:border-blue-700"
              }`}
            >
              <span className="block text-lg font-bold">{pos.abbreviation}</span>
              <span className="block text-[10px] mt-0.5 leading-tight">{pos.name}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Matriz zona x fase */}
      <div className="bg-[#1a1d27] rounded-xl border border-[#2a2d37] overflow-hidden">
        <div className="p-4 border-b border-[#2a2d37] bg-[#22252f]">
          <h3 className="font-semibold text-gray-200">
            {activePosition?.name}{" "}
            <span className="text-gray-400 font-normal">
              ({activePosition?.abbreviation})
            </span>
          </h3>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[#2a2d37]">
                <th className="p-3 text-left text-gray-500 font-medium w-20">Zona</th>
                {displayPhases.map((phase) => (
                  <th key={phase.id} className="p-3 text-left text-gray-500 font-medium">
                    {phase.name}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {zones.map((zone) => (
                <tr key={zone.id} className="border-b border-[#22252f] last:border-0">
                  <td className="p-3">
                    <span className="inline-block px-2 py-1 bg-[#22252f] rounded font-bold text-gray-300">
                      {zone.name}
                    </span>
                    {zone.description && (
                      <p className="text-[10px] text-gray-400 mt-1">{zone.description}</p>
                    )}
                  </td>
                  {displayPhases.map((phase) => {
                    const cell = getBehaviorForCell(zone.id, phase.id);
                    return (
                      <td key={phase.id} className="p-3">
                        {cell ? (
                          <button
                            onClick={() => {
                              setEditCell({ zoneId: zone.id, phaseId: phase.id });
                              setCellTitle(cell.title);
                              setCellDetails(cell.details || "");
                            }}
                            className="w-full text-left p-2 rounded-lg bg-blue-900/20 border border-blue-800/30 hover:border-blue-700 transition-colors"
                          >
                            <span className="text-xs font-medium text-blue-300">
                              {cell.title}
                            </span>
                            {cell.details && (
                              <p className="text-[10px] text-blue-400 mt-0.5 truncate">
                                {cell.details}
                              </p>
                            )}
                          </button>
                        ) : (
                          <button
                            onClick={() => {
                              setEditCell({ zoneId: zone.id, phaseId: phase.id });
                              setCellTitle("");
                              setCellDetails("");
                            }}
                            className="w-full h-16 border border-dashed border-[#2a2d37] rounded-lg hover:border-blue-700 hover:bg-blue-900/20 transition-colors flex items-center justify-center text-xs text-gray-400"
                          >
                            + Definir
                          </button>
                        )}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal editar celda */}
      {editCell && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-[#1a1d27] rounded-xl p-6 w-full max-w-md shadow-xl">
            <h3 className="font-semibold text-gray-200 mb-4">
              Definir comportamiento
            </h3>
            <input
              autoFocus
              value={cellTitle}
              onChange={(e) => setCellTitle(e.target.value)}
              placeholder="Título del comportamiento"
              className="w-full px-3 py-2 border border-[#2a2d37] rounded-lg text-sm mb-2 focus:outline-none focus:ring-2 focus:ring-blue-300"
            />
            <textarea
              value={cellDetails}
              onChange={(e) => setCellDetails(e.target.value)}
              placeholder="Detalles..."
              rows={4}
              className="w-full px-3 py-2 border border-[#2a2d37] rounded-lg text-sm mb-4 focus:outline-none focus:ring-2 focus:ring-blue-300 resize-none"
            />
            <div className="flex gap-2 justify-end">
              <button
                onClick={() => setEditCell(null)}
                className="px-4 py-2 bg-[#22252f] text-gray-400 rounded-lg text-sm hover:bg-[#2a2d37]"
              >
                Cancelar
              </button>
              <button
                onClick={handleSaveCell}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700"
              >
                Guardar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
