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
  EquipmentType,
  PlayerRole,
  FieldPerspective,
  Point,
  TeamColors,
} from "./types";
import { drawField, getFieldViewport, canvasToField, fieldToCanvas, getScale } from "./field-renderer";
import { drawObjects, hitTest, renderEquipmentIcon, DEFAULT_EQUIPMENT_COLOR } from "./object-renderer";
import type { ViewCtx } from "./object-renderer";

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

// ── Pestaña "Jugadores" ──
// 7 colores de jugadora + 3 de portera + 2 neutrales + 1 de staff.
const PLAYER_GROUPS: { role: PlayerRole; label: string; colors: string[] }[] = [
  {
    role: "jugador",
    label: "Jugadoras",
    colors: ["#3b82f6", "#ef4444", "#eab308", "#a855f7", "#f97316", "#22c55e", "#ec4899"],
  },
  { role: "portero", label: "Porteras", colors: ["#18181b", "#52525b", "#a1a1aa"] },
  { role: "neutral", label: "Neutral", colors: ["#2563eb", "#84cc16"] },
  { role: "staff", label: "Staff", colors: ["#f4f4f5"] },
];
const ALL_PLAYER_COLORS: { hex: string; role: PlayerRole }[] = PLAYER_GROUPS.flatMap((g) =>
  g.colors.map((hex) => ({ hex, role: g.role }))
);

// ── Pestaña "Material" ──
const MATERIAL_COLORS: { id: string; hex: string }[] = [
  { id: "amarillo", hex: "#eab308" },
  { id: "azul", hex: "#3b82f6" },
  { id: "naranja", hex: "#f97316" },
  { id: "rojo", hex: "#ef4444" },
];

interface MaterialCatalogItem {
  type: EquipmentType;
  category: string;
  label: string;
  colorable: boolean;
}

const MATERIAL_CATEGORIES = [
  "Conos",
  "Aros",
  "Maniquíes",
  "Rebotadores",
  "Otro material",
  "Vallas",
  "Picas",
  "Marcas",
  "Pelotas",
  "Porterías",
];

const MATERIAL_CATALOG: MaterialCatalogItem[] = [
  { type: "cono-anillo", category: "Conos", label: "Cono anillo", colorable: true },
  { type: "cono-disco", category: "Conos", label: "Cono disco", colorable: true },
  { type: "cono-piramide", category: "Conos", label: "Cono", colorable: true },
  { type: "aro-circulo", category: "Aros", label: "Aro", colorable: true },
  { type: "aro-hexagono", category: "Aros", label: "Aro hexagonal", colorable: true },
  { type: "maniqui-valla", category: "Maniquíes", label: "Muro de maniquíes", colorable: false },
  { type: "maniqui-poste", category: "Maniquíes", label: "Poste", colorable: false },
  { type: "maniqui-figura", category: "Maniquíes", label: "Maniquí", colorable: false },
  { type: "rebotador-portico", category: "Rebotadores", label: "Rebotador pórtico", colorable: false },
  { type: "rebotador-red", category: "Rebotadores", label: "Rebotador red", colorable: false },
  { type: "rebotador-cuadros", category: "Rebotadores", label: "Rebotador cuadros", colorable: false },
  { type: "disco-diana", category: "Otro material", label: "Diana", colorable: false },
  { type: "step", category: "Otro material", label: "Step", colorable: false },
  { type: "escalera-recta", category: "Otro material", label: "Escalera", colorable: false },
  { type: "escalera-cruz", category: "Otro material", label: "Escalera (cruz)", colorable: false },
  { type: "valla-agilidad", category: "Vallas", label: "Valla de agilidad", colorable: true },
  { type: "pica-recta", category: "Picas", label: "Pica", colorable: true },
  { type: "pica-bola", category: "Picas", label: "Pica con bola", colorable: true },
  { type: "pica-angular", category: "Picas", label: "Pica angular", colorable: true },
  { type: "marca-x", category: "Marcas", label: "Marca", colorable: true },
  { type: "balon-futbol", category: "Pelotas", label: "Balón de fútbol", colorable: false },
  { type: "balon-baloncesto", category: "Pelotas", label: "Balón de baloncesto", colorable: false },
  { type: "balon-americano", category: "Pelotas", label: "Balón de fútbol americano", colorable: false },
  { type: "balon-voleibol", category: "Pelotas", label: "Balón de voleibol", colorable: false },
  { type: "balon-beisbol", category: "Pelotas", label: "Balón de béisbol", colorable: false },
  { type: "balon-tenis", category: "Pelotas", label: "Balón de tenis", colorable: false },
  { type: "porteria-f11", category: "Porterías", label: "Portería F11", colorable: false },
  { type: "porteria-f7", category: "Porterías", label: "Portería F7", colorable: false },
  { type: "porteria-mini", category: "Porterías", label: "Mini portería", colorable: false },
  { type: "porteria-aim", category: "Porterías", label: "Portería de diana", colorable: false },
];

function materialLabel(type: EquipmentType): string {
  return MATERIAL_CATALOG.find((m) => m.type === type)?.label ?? type;
}

// ── Pestaña "Campos" ──
const PERSPECTIVE_LABELS: Record<FieldPerspective, string> = {
  full: "Campo completo",
  half: "Medio campo",
  third: "Tercio de campo",
  area: "Área / portería",
  reduced: "Campo reducido",
};

const PERSPECTIVE_ICONS: Record<FieldPerspective, string> = {
  full: "▭",
  half: "▤",
  third: "▥",
  area: "⊓",
  reduced: "▢",
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

// Icono en miniatura de una pieza de material — dibuja con el mismo motor
// que el tablero, así lo que ves en el selector es igual a lo que se coloca.
function MaterialSwatchButton({
  type,
  color,
  active,
  onClick,
  label,
}: {
  type: EquipmentType;
  color: string;
  active: boolean;
  onClick: () => void;
  label: string;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (canvasRef.current) renderEquipmentIcon(canvasRef.current, type, color, 28);
  }, [type, color]);

  return (
    <button
      onClick={onClick}
      title={label}
      className="flex items-center justify-center rounded-lg aspect-square transition-colors"
      style={{
        background: "var(--surface-hover)",
        border: active ? "2px solid var(--accent-blue)" : "1px solid var(--border)",
      }}
    >
      <canvas ref={canvasRef} style={{ width: 28, height: 28 }} />
    </button>
  );
}

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
  const [drawColor, setDrawColor] = useState("#ffffff");
  const [drawWidth, setDrawWidth] = useState(2.5);
  const [nextNumber, setNextNumber] = useState(1);

  // Panel lateral: Jugadores / Material / Campos
  const [sidebarTab, setSidebarTab] = useState<"jugadores" | "material" | "campos">("jugadores");
  const [activePlayerColor, setActivePlayerColor] = useState(PLAYER_GROUPS[0].colors[0]);
  const [activePlayerRole, setActivePlayerRole] = useState<PlayerRole>("jugador");
  const [activeEquipment, setActiveEquipment] = useState<EquipmentType>("cono-anillo");
  const [activeMaterialColor, setActiveMaterialColor] = useState(MATERIAL_COLORS[0].hex);

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
    const allObjects = [...objects];
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
      const vctx: Omit<ViewCtx, "ctx" | "selectedId"> = { canvasW, canvasH, viewport, zoom, panX, panY, teamColors };
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
      const player: BoardPlayer = {
        kind: "player",
        id: genId(),
        x: fieldPos.x,
        y: fieldPos.y,
        number: nextNumber,
        label: "",
        team: activePlayerRole === "neutral" ? "neutral" : "A",
        radius: 1.4,
        color: activePlayerColor,
        role: activePlayerRole,
      };
      setObjects((prev) => [...prev, player]);
      setNextNumber((n) => n + 1);
      setSelectedId(player.id);
    } else if (tool === "equipment") {
      const colorable = MATERIAL_CATALOG.find((m) => m.type === activeEquipment)?.colorable;
      const eq: BoardEquipment = {
        kind: "equipment",
        id: genId(),
        x: fieldPos.x,
        y: fieldPos.y,
        equipmentType: activeEquipment,
        rotation: 0,
        scale: 1.2,
        color: colorable ? activeMaterialColor : undefined,
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
          {/* Tool buttons — jugadoras y material se eligen en el panel lateral */}
          <div className="flex items-center gap-0.5">
            {(Object.keys(TOOL_ICONS) as ToolMode[])
              .filter((t) => t !== "player" && t !== "equipment")
              .map((t) => (
                <button
                  key={t}
                  onClick={() => {
                    setTool(t);
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

      {/* ── Panel lateral (Jugadores / Material / Campos) + Canvas + Propiedades ── */}
      <div className="flex gap-2">
        {/* Panel lateral */}
        {!readOnly && (
          <div
            className="flex flex-col rounded-lg overflow-hidden"
            style={{ width: 216, flexShrink: 0, background: "var(--surface)", border: "1px solid var(--border)", maxHeight: canvasH }}
          >
            <div className="flex" style={{ borderBottom: "1px solid var(--border)" }}>
              {([
                { key: "jugadores", label: "Jugadoras" },
                { key: "material", label: "Material" },
                { key: "campos", label: "Campos" },
              ] as const).map((t) => (
                <button
                  key={t.key}
                  onClick={() => setSidebarTab(t.key)}
                  className="flex-1 text-[11px] font-medium py-2 transition-colors"
                  style={{
                    background: sidebarTab === t.key ? "var(--surface-hover)" : "transparent",
                    color: sidebarTab === t.key ? "var(--foreground)" : "var(--muted)",
                    borderBottom: sidebarTab === t.key ? "2px solid var(--accent-blue)" : "2px solid transparent",
                  }}
                >
                  {t.label}
                </button>
              ))}
            </div>

            <div className="flex-1 overflow-y-auto p-2">
              {sidebarTab === "jugadores" && (
                <div className="space-y-3">
                  {PLAYER_GROUPS.map((group) => (
                    <div key={group.role}>
                      <p className="text-[10px] font-semibold uppercase tracking-wide mb-1" style={{ color: "var(--muted)" }}>
                        {group.label}
                      </p>
                      <div className="grid grid-cols-5 gap-1.5">
                        {group.colors.map((hex) => {
                          const active = tool === "player" && activePlayerColor === hex && activePlayerRole === group.role;
                          return (
                            <button
                              key={hex}
                              onClick={() => {
                                setActivePlayerColor(hex);
                                setActivePlayerRole(group.role);
                                setTool("player");
                              }}
                              title={group.label}
                              className="rounded-full aspect-square transition-all"
                              style={{
                                background: hex,
                                border: active ? "2px solid var(--accent-blue)" : "1px solid var(--border)",
                                boxShadow: active ? "0 0 0 1px var(--accent-blue)" : "none",
                              }}
                            />
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {sidebarTab === "material" && (
                <div className="space-y-3">
                  {MATERIAL_CATEGORIES.map((cat) => {
                    const items = MATERIAL_CATALOG.filter((m) => m.category === cat);
                    return (
                      <div key={cat}>
                        <p className="text-[10px] font-semibold uppercase tracking-wide mb-1" style={{ color: "var(--muted)" }}>
                          {cat}
                        </p>
                        <div className="grid grid-cols-4 gap-1.5">
                          {items.flatMap((item) =>
                            item.colorable
                              ? MATERIAL_COLORS.map((c) => (
                                  <MaterialSwatchButton
                                    key={item.type + c.hex}
                                    type={item.type}
                                    color={c.hex}
                                    label={item.label}
                                    active={tool === "equipment" && activeEquipment === item.type && activeMaterialColor === c.hex}
                                    onClick={() => {
                                      setActiveEquipment(item.type);
                                      setActiveMaterialColor(c.hex);
                                      setTool("equipment");
                                    }}
                                  />
                                ))
                              : [
                                  <MaterialSwatchButton
                                    key={item.type}
                                    type={item.type}
                                    color={DEFAULT_EQUIPMENT_COLOR[item.type] || "#9ca3af"}
                                    label={item.label}
                                    active={tool === "equipment" && activeEquipment === item.type}
                                    onClick={() => {
                                      setActiveEquipment(item.type);
                                      setTool("equipment");
                                    }}
                                  />,
                                ]
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {sidebarTab === "campos" && (
                <div className="space-y-1.5">
                  {(Object.keys(PERSPECTIVE_LABELS) as FieldPerspective[]).map((p) => (
                    <button
                      key={p}
                      onClick={() => {
                        setPerspective(p);
                        setZoom(1);
                        setPanX(0);
                        setPanY(0);
                      }}
                      className="w-full flex items-center gap-2 rounded-lg px-2.5 py-2 text-xs text-left transition-colors"
                      style={{
                        background: perspective === p ? "var(--accent-blue)" : "var(--surface-hover)",
                        color: perspective === p ? "#fff" : "var(--foreground)",
                        border: "1px solid var(--border)",
                      }}
                    >
                      <span className="text-sm">{PERSPECTIVE_ICONS[p]}</span>
                      {PERSPECTIVE_LABELS[p]}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Canvas */}
        <div
          ref={containerRef}
          className="flex-1 rounded-lg overflow-hidden"
          style={{ border: "1px solid var(--border)", background: "var(--background)" }}
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
                  Color
                </label>
                <div className="grid grid-cols-7 gap-1">
                  {ALL_PLAYER_COLORS.map(({ hex, role }) => (
                    <button
                      key={hex}
                      onClick={() => updateObj(selectedObj.id, { color: hex, role })}
                      className="rounded-full aspect-square"
                      style={{
                        background: hex,
                        border:
                          (selectedObj as BoardPlayer).color === hex
                            ? "2px solid var(--accent-blue)"
                            : "1px solid var(--border)",
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
                  {materialLabel((selectedObj as BoardEquipment).equipmentType)}
                </span>
                {MATERIAL_CATALOG.find((m) => m.type === (selectedObj as BoardEquipment).equipmentType)?.colorable && (
                  <>
                    <label className="text-xs" style={{ color: "var(--muted)" }}>
                      Color
                    </label>
                    <div className="flex gap-1">
                      {MATERIAL_COLORS.map((c) => (
                        <button
                          key={c.hex}
                          onClick={() => updateObj(selectedObj.id, { color: c.hex })}
                          className="rounded-full"
                          style={{
                            width: 20,
                            height: 20,
                            background: c.hex,
                            border:
                              (selectedObj as BoardEquipment).color === c.hex
                                ? "2px solid var(--accent-blue)"
                                : "1px solid var(--border)",
                          }}
                        />
                      ))}
                    </div>
                  </>
                )}
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
            {tool === "player" && ` · #${nextNumber}`}
            {tool === "equipment" && ` · ${materialLabel(activeEquipment)}`}
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
