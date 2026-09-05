"use client";

// ============================================
// TacticalBoardEditor — Componente principal
// ============================================

import { useState, useEffect, useRef, useCallback } from "react";
import type {
  TacticalBoardEditorProps,
  BoardState,
  BoardObject,
  BoardPlayer,
  BoardEquipment,
  BoardLine,
  BoardZone,
  BoardText,
  ToolMode,
  TeamId,
  EquipmentType,
  FieldPerspective,
  Point,
  TeamColors,
} from "./types";
import { drawField, getFieldViewport, canvasToField, fieldToCanvas, getScale } from "./field-renderer";
import { drawObjects, hitTest } from "./object-renderer";

// ── Defaults ──

const DEFAULT_TEAM_COLORS: TeamColors = {
  A: { fill: "#3b82f6", stroke: "#1d4ed8", text: "#ffffff" },
  B: { fill: "#ef4444", stroke: "#b91c1c", text: "#ffffff" },
  neutral: { fill: "#6b7280", stroke: "#4b5563", text: "#ffffff" },
};

const DEFAULT_STATE: BoardState = {
  objects: [],
  perspective: "full",
  teamColors: DEFAULT_TEAM_COLORS,
  fieldColor: "#1a472a",
  lineColor: "rgba(255,255,255,0.85)",
};

let _idCounter = 0;
function genId() {
  return `obj_${Date.now()}_${++_idCounter}`;
}

// ── Toolbar icons (SVG inline) ──

const TOOL_ICONS: Record<ToolMode, string> = {
  select: "↖",
  player: "●",
  equipment: "▲",
  line: "╱",
  arrow: "→",
  curve: "⌒",
  "dashed-line": "┄",
  "dashed-arrow": "⇢",
  zone: "▢",
  text: "T",
};

const TOOL_LABELS: Record<ToolMode, string> = {
  select: "Seleccionar",
  player: "Jugadora",
  equipment: "Equipamiento",
  line: "Línea",
  arrow: "Flecha",
  curve: "Curva",
  "dashed-line": "Línea discontinua",
  "dashed-arrow": "Flecha discontinua",
  zone: "Zona",
  text: "Texto",
};

const EQUIPMENT_ITEMS: { type: EquipmentType; label: string; icon: string }[] = [
  { type: "cone", label: "Cono", icon: "▲" },
  { type: "hurdle", label: "Valla", icon: "╫" },
  { type: "pole", label: "Pica", icon: "│" },
  { type: "ball", label: "Balón", icon: "⚽" },
  { type: "mini-goal", label: "Mini portería", icon: "⊡" },
  { type: "mannequin", label: "Maniquí", icon: "♀" },
  { type: "ladder", label: "Escalera", icon: "≡" },
];

const PERSPECTIVE_LABELS: Record<FieldPerspective, string> = {
  full: "Campo completo",
  half: "Medio campo",
  third: "Tercio",
  area: "Área",
  reduced: "Reducido",
};

const DRAW_COLORS = [
  "#ffffff",
  "#3b82f6",
  "#ef4444",
  "#f59e0b",
  "#10b981",
  "#8b5cf6",
  "#f43f5e",
  "#06b6d4",
];

// ── Component ──

export default function TacticalBoardEditor({
  initialState,
  onChange,
  width = 900,
  height = 600,
  readOnly = false,
}: TacticalBoardEditorProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Board state
  const [objects, setObjects] = useState<BoardObject[]>(initialState?.objects || []);
  const [perspective, setPerspective] = useState<FieldPerspective>(initialState?.perspective || "full");
  const [teamColors, setTeamColors] = useState<TeamColors>(initialState?.teamColors || DEFAULT_TEAM_COLORS);
  const [fieldColor] = useState(initialState?.fieldColor || "#1a472a");
  const [lineColor] = useState(initialState?.lineColor || "rgba(255,255,255,0.85)");

  // Tool state
  const [tool, setTool] = useState<ToolMode>("select");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [activeTeam, setActiveTeam] = useState<TeamId>("A");
  const [activeEquipment, setActiveEquipment] = useState<EquipmentType>("cone");
  const [drawColor, setDrawColor] = useState("#ffffff");
  const [drawWidth, setDrawWidth] = useState(2.5);
  const [showEquipmentPanel, setShowEquipmentPanel] = useState(false);
  const [nextPlayerNumber, setNextPlayerNumber] = useState<Record<TeamId, number>>({ A: 1, B: 1, neutral: 1 });

  // Canvas interaction state
  const [zoom, setZoom] = useState(1);
  const [panX, setPanX] = useState(0);
  const [panY, setPanY] = useState(0);
  const [dragging, setDragging] = useState<{ id: string; offsetX: number; offsetY: number } | null>(null);
  const [drawing, setDrawing] = useState<Point[] | null>(null);
  const [isPanning, setIsPanning] = useState(false);
  const [panStart, setPanStart] = useState<{ x: number; y: number; px: number; py: number } | null>(null);

  // Canvas dimensions (responsive)
  const [canvasW, setCanvasW] = useState(width);
  const [canvasH, setCanvasH] = useState(height);

  // Responsive resize
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    const ro = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const w = entry.contentRect.width;
        if (w > 0) {
          setCanvasW(w);
          setCanvasH(Math.round(w * 0.62)); // ~field aspect ratio
        }
      }
    });
    ro.observe(container);
    return () => ro.disconnect();
  }, []);

  // Notify parent of changes
  useEffect(() => {
    onChange?.({ objects, perspective, teamColors, fieldColor, lineColor });
  }, [objects, perspective, teamColors, fieldColor, lineColor]);

  // ── Render loop ──
  const render = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    canvas.width = canvasW * dpr;
    canvas.height = canvasH * dpr;
    ctx.scale(dpr, dpr);

    const viewport = getFieldViewport(perspective);

    drawField(ctx, canvasW, canvasH, viewport, zoom, panX, panY, fieldColor, lineColor);

    const vctx = {
      ctx,
      canvasW,
      canvasH,
      viewport,
      zoom,
      panX,
      panY,
      teamColors,
      selectedId,
    };

    // Draw in-progress drawing
    let allObjects = [...objects];
    if (drawing && drawing.length >= 1 && (tool === "zone" || tool === "line" || tool === "arrow" || tool === "dashed-line" || tool === "dashed-arrow" || tool === "curve")) {
      if (tool === "zone" && drawing.length >= 3) {
        allObjects.push({
          kind: "zone",
          id: "__drawing__",
          points: drawing,
          fillColor: drawColor,
          fillOpacity: 0.15,
          strokeColor: drawColor,
          strokeWidth: 2,
        } as BoardZone);
      } else if (drawing.length >= 2) {
        allObjects.push({
          kind: "line",
          id: "__drawing__",
          points: drawing,
          color: drawColor,
          width: drawWidth,
          dashed: tool === "dashed-line" || tool === "dashed-arrow",
          arrowEnd: tool === "arrow" || tool === "dashed-arrow",
        } as BoardLine);
      }
    }

    drawObjects(vctx, allObjects);
  }, [objects, perspective, zoom, panX, panY, teamColors, fieldColor, lineColor, selectedId, canvasW, canvasH, drawing, tool, drawColor, drawWidth]);

  useEffect(() => {
    const frame = requestAnimationFrame(render);
    return () => cancelAnimationFrame(frame);
  }, [render]);

  // ── Mouse handlers ──

  const getCanvasPos = (e: React.MouseEvent): { x: number; y: number } => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    return {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    };
  };

  const viewport = getFieldViewport(perspective);

  const handleMouseDown = (e: React.MouseEvent) => {
    if (readOnly) return;
    const pos = getCanvasPos(e);

    // Middle click or space+click → pan
    if (e.button === 1 || (e.button === 0 && e.altKey)) {
      setIsPanning(true);
      setPanStart({ x: e.clientX, y: e.clientY, px: panX, py: panY });
      return;
    }

    if (e.button !== 0) return;

    const fieldPos = canvasToField(pos.x, pos.y, canvasW, canvasH, viewport, zoom, panX, panY);

    if (tool === "select") {
      const vctx = { canvasW, canvasH, viewport, zoom, panX, panY, teamColors } as any;
      const hit = hitTest(vctx, objects, pos.x, pos.y);
      if (hit) {
        setSelectedId(hit.id);
        const hitCanvas =
          hit.kind === "player" || hit.kind === "equipment" || hit.kind === "text"
            ? fieldToCanvas(hit.x, hit.y, canvasW, canvasH, viewport, zoom, panX, panY)
            : null;
        if (hitCanvas) {
          setDragging({ id: hit.id, offsetX: pos.x - hitCanvas.x, offsetY: pos.y - hitCanvas.y });
        }
      } else {
        setSelectedId(null);
      }
    } else if (tool === "player") {
      const number = nextPlayerNumber[activeTeam];
      const player: BoardPlayer = {
        kind: "player",
        id: genId(),
        x: fieldPos.x,
        y: fieldPos.y,
        number,
        label: "",
        team: activeTeam,
        radius: 1.4,
      };
      setObjects((prev) => [...prev, player]);
      setNextPlayerNumber((prev) => ({ ...prev, [activeTeam]: prev[activeTeam] + 1 }));
      setSelectedId(player.id);
    } else if (tool === "equipment") {
      const eq: BoardEquipment = {
        kind: "equipment",
        id: genId(),
        x: fieldPos.x,
        y: fieldPos.y,
        equipmentType: activeEquipment,
        rotation: 0,
        scale: 1.2,
      };
      setObjects((prev) => [...prev, eq]);
      setSelectedId(eq.id);
    } else if (tool === "text") {
      const label = prompt("Texto:");
      if (label) {
        const t: BoardText = {
          kind: "text",
          id: genId(),
          x: fieldPos.x,
          y: fieldPos.y,
          text: label,
          fontSize: 14,
          color: drawColor,
          fontWeight: "bold",
        };
        setObjects((prev) => [...prev, t]);
        setSelectedId(t.id);
      }
    } else if (
      tool === "line" ||
      tool === "arrow" ||
      tool === "dashed-line" ||
      tool === "dashed-arrow" ||
      tool === "curve" ||
      tool === "zone"
    ) {
      setDrawing((prev) => (prev ? [...prev, fieldPos] : [fieldPos]));
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (readOnly) return;

    if (isPanning && panStart) {
      setPanX(panStart.px + (e.clientX - panStart.x));
      setPanY(panStart.py + (e.clientY - panStart.y));
      return;
    }

    if (dragging) {
      const pos = getCanvasPos(e);
      const fieldPos = canvasToField(pos.x - dragging.offsetX, pos.y - dragging.offsetY, canvasW, canvasH, viewport, zoom, panX, panY);
      setObjects((prev) =>
        prev.map((obj) => {
          if (obj.id !== dragging.id) return obj;
          if (obj.kind === "player") return { ...obj, x: fieldPos.x, y: fieldPos.y } as BoardPlayer;
          if (obj.kind === "equipment") return { ...obj, x: fieldPos.x, y: fieldPos.y } as BoardEquipment;
          if (obj.kind === "text") return { ...obj, x: fieldPos.x, y: fieldPos.y } as BoardText;
          return obj;
        })
      );
    }
  };

  const handleMouseUp = () => {
    if (isPanning) {
      setIsPanning(false);
      setPanStart(null);
      return;
    }
    if (dragging) {
      setDragging(null);
    }
  };

  const handleDoubleClick = (e: React.MouseEvent) => {
    if (readOnly) return;
    // Finalize drawing
    if (drawing && drawing.length >= 2) {
      finalizeDrawing();
    }
  };

  const finalizeDrawing = () => {
    if (!drawing || drawing.length < 2) {
      setDrawing(null);
      return;
    }

    if (tool === "zone" && drawing.length >= 3) {
      const zone: BoardZone = {
        kind: "zone",
        id: genId(),
        points: [...drawing],
        fillColor: drawColor,
        fillOpacity: 0.15,
        strokeColor: drawColor,
        strokeWidth: 2,
      };
      setObjects((prev) => [...prev, zone]);
      setSelectedId(zone.id);
    } else if (tool === "curve" && drawing.length >= 2) {
      // Use midpoint as curve control
      const mid = {
        x: (drawing[0].x + drawing[drawing.length - 1].x) / 2,
        y: (drawing[0].y + drawing[drawing.length - 1].y) / 2 - 5,
      };
      const line: BoardLine = {
        kind: "line",
        id: genId(),
        points: [drawing[0], drawing[drawing.length - 1]],
        color: drawColor,
        width: drawWidth,
        dashed: false,
        arrowEnd: false,
        curveControl: mid,
      };
      setObjects((prev) => [...prev, line]);
      setSelectedId(line.id);
    } else {
      const line: BoardLine = {
        kind: "line",
        id: genId(),
        points: [...drawing],
        color: drawColor,
        width: drawWidth,
        dashed: tool === "dashed-line" || tool === "dashed-arrow",
        arrowEnd: tool === "arrow" || tool === "dashed-arrow",
      };
      setObjects((prev) => [...prev, line]);
      setSelectedId(line.id);
    }

    setDrawing(null);
  };

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (readOnly) return;

      if (e.key === "Delete" || e.key === "Backspace") {
        if (selectedId) {
          setObjects((prev) => prev.filter((o) => o.id !== selectedId));
          setSelectedId(null);
        }
      }
      if (e.key === "Escape") {
        if (drawing) {
          finalizeDrawing();
        } else {
          setSelectedId(null);
          setTool("select");
        }
      }
      if (e.key === "v" || e.key === "V") setTool("select");
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [selectedId, drawing, readOnly]);

  // Wheel zoom
  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? -0.1 : 0.1;
    setZoom((prev) => Math.max(0.5, Math.min(4, prev + delta)));
  };

  // Delete selected
  const deleteSelected = () => {
    if (selectedId) {
      setObjects((prev) => prev.filter((o) => o.id !== selectedId));
      setSelectedId(null);
    }
  };

  // Clear all
  const clearAll = () => {
    if (confirm("¿Eliminar todos los elementos del tablero?")) {
      setObjects([]);
      setSelectedId(null);
    }
  };

  // Export as image
  const exportImage = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const dataUrl = canvas.toDataURL("image/png");
    const link = document.createElement("a");
    link.download = "tactical-board.png";
    link.href = dataUrl;
    link.click();
  };

  // Get export data URL for parent
  const getDataUrl = (): string => {
    const canvas = canvasRef.current;
    if (!canvas) return "";
    return canvas.toDataURL("image/png");
  };

  // Selected object for properties panel
  const selectedObj = objects.find((o) => o.id === selectedId) || null;

  // Update selected object property
  const updateObj = (id: string, updates: Record<string, unknown>) => {
    setObjects((prev) =>
      prev.map((o) => {
        if (o.id !== id) return o;
        switch (o.kind) {
          case 'player': return { ...o, ...updates } as BoardPlayer;
          case 'equipment': return { ...o, ...updates } as BoardEquipment;
          case 'line': return { ...o, ...updates } as BoardLine;
          case 'zone': return { ...o, ...updates } as BoardZone;
          case 'text': return { ...o, ...updates } as BoardText;
          default: return o;
        }
      })
    );
  };

  // ── Render ──

  return (
    <div className="flex flex-col gap-2">
      {/* ── Toolbar ── */}
      {!readOnly && (
        <div className="flex items-center gap-1 p-2 rounded-lg" style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
          {/* Tool buttons */}
          <div className="flex items-center gap-0.5">
            {(Object.keys(TOOL_ICONS) as ToolMode[]).map((t) => (
              <button
                key={t}
                onClick={() => {
                  setTool(t);
                  if (t === "equipment") setShowEquipmentPanel(!showEquipmentPanel);
                  else setShowEquipmentPanel(false);
                  if (drawing) finalizeDrawing();
                }}
                title={TOOL_LABELS[t]}
                className="relative flex items-center justify-center rounded transition-colors"
                style={{
                  width: 34,
                  height: 34,
                  background: tool === t ? "var(--accent-blue)" : "transparent",
                  color: tool === t ? "#fff" : "var(--muted)",
                  fontSize: t === "text" ? 15 : 16,
                  fontWeight: t === "text" ? 700 : 400,
                }}
              >
                {TOOL_ICONS[t]}
              </button>
            ))}
          </div>

          <div className="w-px h-6 mx-1" style={{ background: "var(--border)" }} />

          {/* Team selector (when player tool) */}
          {tool === "player" && (
            <div className="flex items-center gap-1 mr-2">
              {(["A", "B", "neutral"] as TeamId[]).map((t) => (
                <button
                  key={t}
                  onClick={() => setActiveTeam(t)}
                  className="rounded-full transition-all"
                  style={{
                    width: 24,
                    height: 24,
                    background: teamColors[t].fill,
                    border: activeTeam === t ? "2px solid #fff" : "2px solid transparent",
                    boxShadow: activeTeam === t ? "0 0 0 2px var(--accent-blue)" : "none",
                  }}
                  title={t === "A" ? "Equipo A" : t === "B" ? "Equipo B" : "Neutral"}
                />
              ))}
            </div>
          )}

          {/* Draw color */}
          {(tool === "line" || tool === "arrow" || tool === "curve" || tool === "dashed-line" || tool === "dashed-arrow" || tool === "zone" || tool === "text") && (
            <div className="flex items-center gap-0.5 mr-2">
              {DRAW_COLORS.map((c) => (
                <button
                  key={c}
                  onClick={() => setDrawColor(c)}
                  className="rounded-full transition-all"
                  style={{
                    width: 18,
                    height: 18,
                    background: c,
                    border: drawColor === c ? "2px solid var(--accent-blue)" : "1px solid var(--border)",
                  }}
                />
              ))}
            </div>
          )}

          <div className="flex-1" />

          {/* Perspective selector */}
          <select
            value={perspective}
            onChange={(e) => {
              setPerspective(e.target.value as FieldPerspective);
              setZoom(1);
              setPanX(0);
              setPanY(0);
            }}
            className="text-xs rounded px-2 py-1"
            style={{
              background: "var(--surface-hover)",
              color: "var(--foreground)",
              border: "1px solid var(--border)",
            }}
          >
            {(Object.keys(PERSPECTIVE_LABELS) as FieldPerspective[]).map((p) => (
              <option key={p} value={p}>
                {PERSPECTIVE_LABELS[p]}
              </option>
            ))}
          </select>

          {/* Zoom controls */}
          <div className="flex items-center gap-1 ml-2">
            <button
              onClick={() => setZoom((z) => Math.max(0.5, z - 0.2))}
              className="text-xs rounded px-1.5 py-0.5"
              style={{ background: "var(--surface-hover)", color: "var(--foreground)", border: "1px solid var(--border)" }}
            >
              −
            </button>
            <span className="text-xs tabular-nums" style={{ color: "var(--muted)", minWidth: 36, textAlign: "center" }}>
              {Math.round(zoom * 100)}%
            </span>
            <button
              onClick={() => setZoom((z) => Math.min(4, z + 0.2))}
              className="text-xs rounded px-1.5 py-0.5"
              style={{ background: "var(--surface-hover)", color: "var(--foreground)", border: "1px solid var(--border)" }}
            >
              +
            </button>
            <button
              onClick={() => {
                setZoom(1);
                setPanX(0);
                setPanY(0);
              }}
              className="text-xs rounded px-1.5 py-0.5 ml-0.5"
              style={{ background: "var(--surface-hover)", color: "var(--muted)", border: "1px solid var(--border)" }}
              title="Reset vista"
            >
              ⟲
            </button>
          </div>

          <div className="w-px h-6 mx-1" style={{ background: "var(--border)" }} />

          {/* Actions */}
          <button
            onClick={deleteSelected}
            disabled={!selectedId}
            className="text-xs rounded px-2 py-1 transition-colors"
            style={{
              background: selectedId ? "var(--accent-red)" : "var(--surface-hover)",
              color: selectedId ? "#fff" : "var(--muted)",
              border: "1px solid var(--border)",
              opacity: selectedId ? 1 : 0.5,
            }}
          >
            🗑
          </button>
          <button
            onClick={clearAll}
            className="text-xs rounded px-2 py-1"
            style={{ background: "var(--surface-hover)", color: "var(--muted)", border: "1px solid var(--border)" }}
            title="Limpiar todo"
          >
            ✕
          </button>
          <button
            onClick={exportImage}
            className="text-xs rounded px-2 py-1"
            style={{ background: "var(--accent-green)", color: "#fff", border: "none" }}
            title="Exportar imagen"
          >
            📷
          </button>
        </div>
      )}

      {/* ── Equipment dropdown ── */}
      {showEquipmentPanel && !readOnly && (
        <div
          className="flex items-center gap-1 p-2 rounded-lg"
          style={{ background: "var(--surface)", border: "1px solid var(--border)" }}
        >
          <span className="text-xs mr-2" style={{ color: "var(--muted)" }}>
            Equipamiento:
          </span>
          {EQUIPMENT_ITEMS.map((eq) => (
            <button
              key={eq.type}
              onClick={() => {
                setActiveEquipment(eq.type);
                setTool("equipment");
              }}
              className="flex items-center gap-1 rounded px-2 py-1 text-xs transition-colors"
              style={{
                background: activeEquipment === eq.type && tool === "equipment" ? "var(--accent-blue)" : "var(--surface-hover)",
                color: activeEquipment === eq.type && tool === "equipment" ? "#fff" : "var(--foreground)",
                border: "1px solid var(--border)",
              }}
            >
              <span>{eq.icon}</span>
              <span>{eq.label}</span>
            </button>
          ))}
        </div>
      )}

      {/* ── Canvas + Properties panel ── */}
      <div className="flex gap-2">
        {/* Canvas */}
        <div
          ref={containerRef}
          className="flex-1 rounded-lg overflow-hidden"
          style={{ border: "1px solid var(--border)", background: "#0f1117" }}
        >
          <canvas
            ref={canvasRef}
            style={{
              width: canvasW,
              height: canvasH,
              cursor: isPanning
                ? "grabbing"
                : tool === "select"
                ? dragging
                  ? "grabbing"
                  : "default"
                : "crosshair",
            }}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
            onDoubleClick={handleDoubleClick}
            onWheel={handleWheel}
            onContextMenu={(e) => e.preventDefault()}
          />
        </div>

        {/* Properties panel */}
        {!readOnly && selectedObj && (
          <div
            className="rounded-lg p-3 flex flex-col gap-2"
            style={{
              width: 220,
              background: "var(--surface)",
              border: "1px solid var(--border)",
              flexShrink: 0,
            }}
          >
            <h4 className="text-xs font-semibold uppercase tracking-wide" style={{ color: "var(--muted)" }}>
              Propiedades
            </h4>

            {/* Player properties */}
            {selectedObj.kind === "player" && (
              <>
                <label className="text-xs" style={{ color: "var(--muted)" }}>
                  Número
                </label>
                <input
                  type="number"
                  value={(selectedObj as BoardPlayer).number}
                  onChange={(e) => updateObj(selectedObj.id, { number: parseInt(e.target.value) || 0 })}
                  className="rounded px-2 py-1 text-sm"
                  style={{
                    background: "var(--surface-hover)",
                    color: "var(--foreground)",
                    border: "1px solid var(--border)",
                  }}
                />
                <label className="text-xs" style={{ color: "var(--muted)" }}>
                  Etiqueta
                </label>
                <input
                  type="text"
                  value={(selectedObj as BoardPlayer).label}
                  onChange={(e) => updateObj(selectedObj.id, { label: e.target.value })}
                  placeholder="Nombre / posición"
                  className="rounded px-2 py-1 text-sm"
                  style={{
                    background: "var(--surface-hover)",
                    color: "var(--foreground)",
                    border: "1px solid var(--border)",
                  }}
                />
                <label className="text-xs" style={{ color: "var(--muted)" }}>
                  Equipo
                </label>
                <div className="flex gap-1">
                  {(["A", "B", "neutral"] as TeamId[]).map((t) => (
                    <button
                      key={t}
                      onClick={() => updateObj(selectedObj.id, { team: t })}
                      className="rounded-full"
                      style={{
                        width: 22,
                        height: 22,
                        background: teamColors[t].fill,
                        border:
                          (selectedObj as BoardPlayer).team === t
                            ? "2px solid #fff"
                            : "2px solid transparent",
                      }}
                    />
                  ))}
                </div>
              </>
            )}

            {/* Equipment properties */}
            {selectedObj.kind === "equipment" && (
              <>
                <label className="text-xs" style={{ color: "var(--muted)" }}>
                  Tipo
                </label>
                <span className="text-sm" style={{ color: "var(--foreground)" }}>
                  {EQUIPMENT_ITEMS.find((e) => e.type === (selectedObj as BoardEquipment).equipmentType)?.label}
                </span>
                <label className="text-xs" style={{ color: "var(--muted)" }}>
                  Rotación (°)
                </label>
                <input
                  type="range"
                  min={0}
                  max={360}
                  value={(selectedObj as BoardEquipment).rotation}
                  onChange={(e) => updateObj(selectedObj.id, { rotation: parseInt(e.target.value) })}
                />
                <label className="text-xs" style={{ color: "var(--muted)" }}>
                  Tamaño
                </label>
                <input
                  type="range"
                  min={0.5}
                  max={3}
                  step={0.1}
                  value={(selectedObj as BoardEquipment).scale}
                  onChange={(e) => updateObj(selectedObj.id, { scale: parseFloat(e.target.value) })}
                />
              </>
            )}

            {/* Line properties */}
            {selectedObj.kind === "line" && (
              <>
                <label className="text-xs" style={{ color: "var(--muted)" }}>
                  Color
                </label>
                <div className="flex gap-0.5">
                  {DRAW_COLORS.map((c) => (
                    <button
                      key={c}
                      onClick={() => updateObj(selectedObj.id, { color: c })}
                      className="rounded-full"
                      style={{
                        width: 16,
                        height: 16,
                        background: c,
                        border:
                          (selectedObj as BoardLine).color === c
                            ? "2px solid var(--accent-blue)"
                            : "1px solid var(--border)",
                      }}
                    />
                  ))}
                </div>
                <label className="text-xs" style={{ color: "var(--muted)" }}>
                  Grosor
                </label>
                <input
                  type="range"
                  min={1}
                  max={6}
                  step={0.5}
                  value={(selectedObj as BoardLine).width}
                  onChange={(e) => updateObj(selectedObj.id, { width: parseFloat(e.target.value) })}
                />
              </>
            )}

            {/* Zone properties */}
            {selectedObj.kind === "zone" && (
              <>
                <label className="text-xs" style={{ color: "var(--muted)" }}>
                  Color
                </label>
                <div className="flex gap-0.5">
                  {DRAW_COLORS.map((c) => (
                    <button
                      key={c}
                      onClick={() => updateObj(selectedObj.id, { fillColor: c, strokeColor: c })}
                      className="rounded-full"
                      style={{
                        width: 16,
                        height: 16,
                        background: c,
                        border:
                          (selectedObj as BoardZone).fillColor === c
                            ? "2px solid var(--accent-blue)"
                            : "1px solid var(--border)",
                      }}
                    />
                  ))}
                </div>
                <label className="text-xs" style={{ color: "var(--muted)" }}>
                  Opacidad
                </label>
                <input
                  type="range"
                  min={0.05}
                  max={0.5}
                  step={0.05}
                  value={(selectedObj as BoardZone).fillOpacity}
                  onChange={(e) => updateObj(selectedObj.id, { fillOpacity: parseFloat(e.target.value) })}
                />
              </>
            )}

            {/* Text properties */}
            {selectedObj.kind === "text" && (
              <>
                <label className="text-xs" style={{ color: "var(--muted)" }}>
                  Texto
                </label>
                <input
                  type="text"
                  value={(selectedObj as BoardText).text}
                  onChange={(e) => updateObj(selectedObj.id, { text: e.target.value })}
                  className="rounded px-2 py-1 text-sm"
                  style={{
                    background: "var(--surface-hover)",
                    color: "var(--foreground)",
                    border: "1px solid var(--border)",
                  }}
                />
                <label className="text-xs" style={{ color: "var(--muted)" }}>
                  Tamaño
                </label>
                <input
                  type="range"
                  min={8}
                  max={32}
                  value={(selectedObj as BoardText).fontSize}
                  onChange={(e) => updateObj(selectedObj.id, { fontSize: parseInt(e.target.value) })}
                />
                <label className="text-xs" style={{ color: "var(--muted)" }}>
                  Color
                </label>
                <div className="flex gap-0.5">
                  {DRAW_COLORS.map((c) => (
                    <button
                      key={c}
                      onClick={() => updateObj(selectedObj.id, { color: c })}
                      className="rounded-full"
                      style={{
                        width: 16,
                        height: 16,
                        background: c,
                        border:
                          (selectedObj as BoardText).color === c
                            ? "2px solid var(--accent-blue)"
                            : "1px solid var(--border)",
                      }}
                    />
                  ))}
                </div>
              </>
            )}

            <button
              onClick={deleteSelected}
              className="mt-2 text-xs rounded px-2 py-1.5 transition-colors"
              style={{ background: "rgba(239,68,68,0.2)", color: "#ef4444", border: "1px solid rgba(239,68,68,0.3)" }}
            >
              Eliminar elemento
            </button>
          </div>
        )}
      </div>

      {/* ── Status bar ── */}
      {!readOnly && (
        <div
          className="flex items-center justify-between px-3 py-1 rounded text-xs"
          style={{ background: "var(--surface)", color: "var(--muted)", border: "1px solid var(--border)" }}
        >
          <span>
            {TOOL_LABELS[tool]}
            {tool === "player" && ` · Equipo ${activeTeam} · #${nextPlayerNumber[activeTeam]}`}
            {tool === "equipment" && ` · ${EQUIPMENT_ITEMS.find((e) => e.type === activeEquipment)?.label}`}
          </span>
          <span>
            {objects.length} elemento{objects.length !== 1 ? "s" : ""} ·{" "}
            {PERSPECTIVE_LABELS[perspective]} · {Math.round(zoom * 100)}%
          </span>
          <span className="text-xs" style={{ color: "var(--border-light)" }}>
            Doble clic para finalizar dibujo · Alt+arrastrar para mover vista · Rueda para zoom
          </span>
        </div>
      )}
    </div>
  );
}
