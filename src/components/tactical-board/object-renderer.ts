// ============================================
// TacticalBoardEditor — Renderizado de objetos
// ============================================

import type {
  BoardObject,
  BoardPlayer,
  BoardEquipment,
  BoardLine,
  BoardZone,
  BoardText,
  TeamColors,
  Point,
} from './types';
import { fieldToCanvas, getScale } from './field-renderer';

type ViewCtx = {
  ctx: CanvasRenderingContext2D;
  canvasW: number;
  canvasH: number;
  viewport: { x: number; y: number; w: number; h: number };
  zoom: number;
  panX: number;
  panY: number;
  teamColors: TeamColors;
  selectedId: string | null;
};

function fc(vctx: ViewCtx, fx: number, fy: number) {
  return fieldToCanvas(fx, fy, vctx.canvasW, vctx.canvasH, vctx.viewport, vctx.zoom, vctx.panX, vctx.panY);
}

function scale(vctx: ViewCtx) {
  return getScale(vctx.canvasW, vctx.canvasH, vctx.viewport, vctx.zoom);
}

// ── Player ──

function drawPlayer(vctx: ViewCtx, p: BoardPlayer) {
  const { ctx } = vctx;
  const pos = fc(vctx, p.x, p.y);
  const s = scale(vctx);
  const r = p.radius * s;
  const colors = vctx.teamColors[p.team];
  const selected = vctx.selectedId === p.id;

  // Shadow
  ctx.save();
  ctx.shadowColor = 'rgba(0,0,0,0.4)';
  ctx.shadowBlur = 4;
  ctx.shadowOffsetY = 2;

  // Circle fill
  ctx.beginPath();
  ctx.arc(pos.x, pos.y, r, 0, Math.PI * 2);
  ctx.fillStyle = colors.fill;
  ctx.fill();
  ctx.strokeStyle = colors.stroke;
  ctx.lineWidth = selected ? 3 : 1.5;
  ctx.stroke();
  ctx.restore();

  // Selection ring
  if (selected) {
    ctx.save();
    ctx.beginPath();
    ctx.arc(pos.x, pos.y, r + 4, 0, Math.PI * 2);
    ctx.strokeStyle = '#3b82f6';
    ctx.lineWidth = 2;
    ctx.setLineDash([4, 3]);
    ctx.stroke();
    ctx.restore();
  }

  // Number
  ctx.fillStyle = colors.text;
  ctx.font = `bold ${Math.max(10, r * 1.1)}px Arial`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(String(p.number), pos.x, pos.y + 1);

  // Label below
  if (p.label) {
    ctx.fillStyle = '#e5e7eb';
    ctx.font = `${Math.max(9, r * 0.7)}px Arial`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    ctx.fillText(p.label, pos.x, pos.y + r + 4);
  }
}

// ── Equipment ──

const EQUIPMENT_EMOJI: Record<string, string> = {
  cone: '▲',
  hurdle: '╫',
  pole: '│',
  ball: '⬤',
  mannequin: '♀',
  ladder: '═',
};

function drawEquipment(vctx: ViewCtx, eq: BoardEquipment) {
  const { ctx } = vctx;
  const pos = fc(vctx, eq.x, eq.y);
  const s = scale(vctx);
  const size = eq.scale * s * 1.2;
  const selected = vctx.selectedId === eq.id;

  ctx.save();
  ctx.translate(pos.x, pos.y);
  ctx.rotate((eq.rotation * Math.PI) / 180);

  const colors: Record<string, string> = {
    cone: '#f59e0b',
    hurdle: '#ef4444',
    pole: '#a3a3a3',
    ball: '#fbbf24',
    mannequin: '#6b7280',
    ladder: '#22d3ee',
    'mini-goal': '#d4d4d8',
    goal: '#e5e7eb',
  };

  const color = colors[eq.equipmentType] || '#9ca3af';

  if (eq.equipmentType === 'cone') {
    ctx.beginPath();
    ctx.moveTo(0, -size * 0.6);
    ctx.lineTo(-size * 0.4, size * 0.4);
    ctx.lineTo(size * 0.4, size * 0.4);
    ctx.closePath();
    ctx.fillStyle = color;
    ctx.fill();
    ctx.strokeStyle = '#000';
    ctx.lineWidth = 1;
    ctx.stroke();
  } else if (eq.equipmentType === 'ball') {
    ctx.beginPath();
    ctx.arc(0, 0, size * 0.35, 0, Math.PI * 2);
    ctx.fillStyle = '#fff';
    ctx.fill();
    ctx.strokeStyle = '#333';
    ctx.lineWidth = 1.5;
    ctx.stroke();
    // Pentagon pattern
    ctx.beginPath();
    for (let i = 0; i < 5; i++) {
      const angle = (i * 72 - 90) * Math.PI / 180;
      const px = Math.cos(angle) * size * 0.18;
      const py = Math.sin(angle) * size * 0.18;
      if (i === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }
    ctx.closePath();
    ctx.fillStyle = '#333';
    ctx.fill();
  } else if (eq.equipmentType === 'hurdle') {
    ctx.fillStyle = color;
    ctx.fillRect(-size * 0.45, -size * 0.1, size * 0.9, size * 0.2);
    // Legs
    ctx.fillRect(-size * 0.4, -size * 0.1, size * 0.08, size * 0.5);
    ctx.fillRect(size * 0.32, -size * 0.1, size * 0.08, size * 0.5);
  } else if (eq.equipmentType === 'pole') {
    ctx.beginPath();
    ctx.arc(0, 0, size * 0.12, 0, Math.PI * 2);
    ctx.fillStyle = color;
    ctx.fill();
    ctx.strokeStyle = '#555';
    ctx.lineWidth = 1;
    ctx.stroke();
  } else if (eq.equipmentType === 'mini-goal') {
    ctx.strokeStyle = color;
    ctx.lineWidth = 2;
    ctx.strokeRect(-size * 0.5, -size * 0.3, size, size * 0.6);
    // Net pattern
    ctx.lineWidth = 0.5;
    ctx.setLineDash([2, 2]);
    for (let i = -size * 0.4; i < size * 0.5; i += size * 0.2) {
      ctx.beginPath();
      ctx.moveTo(i, -size * 0.3);
      ctx.lineTo(i, size * 0.3);
      ctx.stroke();
    }
    ctx.setLineDash([]);
  } else if (eq.equipmentType === 'mannequin') {
    // Body
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(0, -size * 0.3, size * 0.15, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillRect(-size * 0.08, -size * 0.15, size * 0.16, size * 0.45);
    // Base
    ctx.fillRect(-size * 0.2, size * 0.3, size * 0.4, size * 0.06);
  } else if (eq.equipmentType === 'ladder') {
    ctx.strokeStyle = color;
    ctx.lineWidth = 2;
    // Side rails
    ctx.beginPath();
    ctx.moveTo(-size * 0.15, -size * 0.5);
    ctx.lineTo(-size * 0.15, size * 0.5);
    ctx.moveTo(size * 0.15, -size * 0.5);
    ctx.lineTo(size * 0.15, size * 0.5);
    ctx.stroke();
    // Rungs
    for (let y = -size * 0.4; y <= size * 0.4; y += size * 0.2) {
      ctx.beginPath();
      ctx.moveTo(-size * 0.15, y);
      ctx.lineTo(size * 0.15, y);
      ctx.stroke();
    }
  } else {
    // Fallback: colored square
    ctx.fillStyle = color;
    ctx.fillRect(-size * 0.3, -size * 0.3, size * 0.6, size * 0.6);
  }

  // Selection indicator
  if (selected) {
    ctx.strokeStyle = '#3b82f6';
    ctx.lineWidth = 2;
    ctx.setLineDash([4, 3]);
    ctx.strokeRect(-size * 0.55, -size * 0.55, size * 1.1, size * 1.1);
    ctx.setLineDash([]);
  }

  ctx.restore();
}

// ── Line / Arrow / Curve ──

function drawLine(vctx: ViewCtx, line: BoardLine) {
  const { ctx } = vctx;
  if (line.points.length < 2) return;

  const pts = line.points.map((p) => fc(vctx, p.x, p.y));
  const selected = vctx.selectedId === line.id;

  ctx.save();
  ctx.strokeStyle = line.color;
  ctx.lineWidth = line.width;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  if (line.dashed) {
    ctx.setLineDash([8, 5]);
  }

  ctx.beginPath();
  ctx.moveTo(pts[0].x, pts[0].y);

  if (line.curveControl && pts.length === 2) {
    const cp = fc(vctx, line.curveControl.x, line.curveControl.y);
    ctx.quadraticCurveTo(cp.x, cp.y, pts[1].x, pts[1].y);
  } else {
    for (let i = 1; i < pts.length; i++) {
      ctx.lineTo(pts[i].x, pts[i].y);
    }
  }
  ctx.stroke();

  // Arrow head
  if (line.arrowEnd && pts.length >= 2) {
    const last = pts[pts.length - 1];
    let prev: Point;
    if (line.curveControl && pts.length === 2) {
      const cp = fc(vctx, line.curveControl.x, line.curveControl.y);
      // Tangent at end of quadratic bezier
      prev = { x: cp.x, y: cp.y };
    } else {
      prev = pts[pts.length - 2];
    }
    const angle = Math.atan2(last.y - prev.y, last.x - prev.x);
    const headLen = Math.max(10, line.width * 4);
    ctx.setLineDash([]);
    ctx.fillStyle = line.color;
    ctx.beginPath();
    ctx.moveTo(last.x, last.y);
    ctx.lineTo(
      last.x - headLen * Math.cos(angle - Math.PI / 6),
      last.y - headLen * Math.sin(angle - Math.PI / 6)
    );
    ctx.lineTo(
      last.x - headLen * Math.cos(angle + Math.PI / 6),
      last.y - headLen * Math.sin(angle + Math.PI / 6)
    );
    ctx.closePath();
    ctx.fill();
  }

  // Selection highlight
  if (selected) {
    ctx.strokeStyle = '#3b82f6';
    ctx.lineWidth = line.width + 3;
    ctx.globalAlpha = 0.3;
    ctx.setLineDash([]);
    ctx.beginPath();
    ctx.moveTo(pts[0].x, pts[0].y);
    if (line.curveControl && pts.length === 2) {
      const cp = fc(vctx, line.curveControl.x, line.curveControl.y);
      ctx.quadraticCurveTo(cp.x, cp.y, pts[1].x, pts[1].y);
    } else {
      for (let i = 1; i < pts.length; i++) {
        ctx.lineTo(pts[i].x, pts[i].y);
      }
    }
    ctx.stroke();
  }

  ctx.restore();
}

// ── Zone ──

function drawZone(vctx: ViewCtx, zone: BoardZone) {
  const { ctx } = vctx;
  if (zone.points.length < 3) return;

  const pts = zone.points.map((p) => fc(vctx, p.x, p.y));
  const selected = vctx.selectedId === zone.id;

  ctx.save();
  ctx.beginPath();
  ctx.moveTo(pts[0].x, pts[0].y);
  for (let i = 1; i < pts.length; i++) {
    ctx.lineTo(pts[i].x, pts[i].y);
  }
  ctx.closePath();

  ctx.globalAlpha = zone.fillOpacity;
  ctx.fillStyle = zone.fillColor;
  ctx.fill();

  ctx.globalAlpha = 1;
  ctx.strokeStyle = zone.strokeColor;
  ctx.lineWidth = zone.strokeWidth;
  ctx.stroke();

  if (selected) {
    ctx.strokeStyle = '#3b82f6';
    ctx.lineWidth = 2;
    ctx.setLineDash([4, 3]);
    ctx.stroke();
    ctx.setLineDash([]);
  }

  ctx.restore();
}

// ── Text ──

function drawText(vctx: ViewCtx, t: BoardText) {
  const { ctx } = vctx;
  const pos = fc(vctx, t.x, t.y);
  const s = scale(vctx);
  const selected = vctx.selectedId === t.id;

  ctx.save();
  const fontSize = t.fontSize * s * 0.15;
  ctx.font = `${t.fontWeight} ${Math.max(10, fontSize)}px Arial`;
  ctx.fillStyle = t.color;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(t.text, pos.x, pos.y);

  if (selected) {
    const metrics = ctx.measureText(t.text);
    const w = metrics.width + 8;
    const h = fontSize + 8;
    ctx.strokeStyle = '#3b82f6';
    ctx.lineWidth = 2;
    ctx.setLineDash([4, 3]);
    ctx.strokeRect(pos.x - w / 2, pos.y - h / 2, w, h);
    ctx.setLineDash([]);
  }

  ctx.restore();
}

// ── Main render ──

export function drawObjects(vctx: ViewCtx, objects: BoardObject[]) {
  // Draw order: zones → lines → equipment → players → text
  const zones = objects.filter((o) => o.kind === 'zone') as BoardZone[];
  const lines = objects.filter((o) => o.kind === 'line') as BoardLine[];
  const equips = objects.filter((o) => o.kind === 'equipment') as BoardEquipment[];
  const players = objects.filter((o) => o.kind === 'player') as BoardPlayer[];
  const texts = objects.filter((o) => o.kind === 'text') as BoardText[];

  zones.forEach((z) => drawZone(vctx, z));
  lines.forEach((l) => drawLine(vctx, l));
  equips.forEach((eq) => drawEquipment(vctx, eq));
  players.forEach((p) => drawPlayer(vctx, p));
  texts.forEach((t) => drawText(vctx, t));
}

// ── Hit testing ──

export function hitTest(
  vctx: Omit<ViewCtx, 'ctx' | 'selectedId'>,
  objects: BoardObject[],
  canvasX: number,
  canvasY: number
): BoardObject | null {
  // Test in reverse render order (top objects first)
  const ordered = [...objects].reverse();

  for (const obj of ordered) {
    switch (obj.kind) {
      case 'player': {
        const pos = fc(vctx as ViewCtx, obj.x, obj.y);
        const s = scale(vctx as ViewCtx);
        const r = obj.radius * s + 5;
        const dx = canvasX - pos.x;
        const dy = canvasY - pos.y;
        if (dx * dx + dy * dy <= r * r) return obj;
        break;
      }
      case 'equipment': {
        const pos = fc(vctx as ViewCtx, obj.x, obj.y);
        const s = scale(vctx as ViewCtx);
        const hitR = obj.scale * s * 0.7;
        const dx = canvasX - pos.x;
        const dy = canvasY - pos.y;
        if (dx * dx + dy * dy <= hitR * hitR) return obj;
        break;
      }
      case 'text': {
        const pos = fc(vctx as ViewCtx, obj.x, obj.y);
        const s = scale(vctx as ViewCtx);
        const hitR = obj.fontSize * s * 0.15 + 10;
        if (Math.abs(canvasX - pos.x) < hitR && Math.abs(canvasY - pos.y) < hitR * 0.6) return obj;
        break;
      }
      case 'line': {
        // Simple proximity test to line segments
        for (let i = 0; i < obj.points.length - 1; i++) {
          const a = fc(vctx as ViewCtx, obj.points[i].x, obj.points[i].y);
          const b = fc(vctx as ViewCtx, obj.points[i + 1].x, obj.points[i + 1].y);
          const dist = pointToSegmentDist(canvasX, canvasY, a.x, a.y, b.x, b.y);
          if (dist < obj.width + 6) return obj;
        }
        break;
      }
      case 'zone': {
        const pts = obj.points.map((p) => fc(vctx as ViewCtx, p.x, p.y));
        if (pointInPolygon(canvasX, canvasY, pts)) return obj;
        break;
      }
    }
  }
  return null;
}

function pointToSegmentDist(
  px: number, py: number,
  ax: number, ay: number,
  bx: number, by: number
): number {
  const abx = bx - ax;
  const aby = by - ay;
  const apx = px - ax;
  const apy = py - ay;
  const ab2 = abx * abx + aby * aby;
  if (ab2 === 0) return Math.hypot(apx, apy);
  let t = (apx * abx + apy * aby) / ab2;
  t = Math.max(0, Math.min(1, t));
  const projX = ax + t * abx;
  const projY = ay + t * aby;
  return Math.hypot(px - projX, py - projY);
}

function pointInPolygon(x: number, y: number, pts: Point[]): boolean {
  let inside = false;
  for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) {
    const xi = pts[i].x, yi = pts[i].y;
    const xj = pts[j].x, yj = pts[j].y;
    if ((yi > y) !== (yj > y) && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) {
      inside = !inside;
    }
  }
  return inside;
}
