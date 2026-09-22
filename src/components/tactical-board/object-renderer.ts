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
  EquipmentType,
  Point,
} from './types';
import { fieldToCanvas, getScale } from './field-renderer';

export type ViewCtx = {
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

// "Muñeco" visto desde arriba — cuerpo ovalado del color elegido, cabeza
// negra arriba y manos (tono piel) a los lados. Centrado en (0,0); se usa
// tanto para colocar la jugadora en el campo como para el icono del
// selector de la pestaña "Jugadoras" (mismo dibujo en los dos sitios).
export function paintPlayerToken(ctx: CanvasRenderingContext2D, size: number, color: string) {
  const rx = size * 0.36;
  const ry = size * 0.5;
  const bodyCy = size * 0.04;

  ctx.save();

  // Manos (tono piel), a los lados del cuerpo — bien separadas para que no
  // queden a medio tapar por el óvalo del cuerpo (se dibuja después).
  const handRx = size * 0.1;
  const handRy = size * 0.14;
  const handOffset = rx + handRx * 1.2;
  ctx.fillStyle = '#e3ad82';
  ctx.beginPath();
  ctx.ellipse(-handOffset, bodyCy, handRx, handRy, -0.3, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.ellipse(handOffset, bodyCy, handRx, handRy, 0.3, 0, Math.PI * 2);
  ctx.fill();

  // Cuerpo — óvalo del color elegido
  ctx.beginPath();
  ctx.ellipse(0, bodyCy, rx, ry, 0, 0, Math.PI * 2);
  ctx.fillStyle = color;
  ctx.fill();
  ctx.strokeStyle = 'rgba(0,0,0,0.25)';
  ctx.lineWidth = Math.max(1, size * 0.02);
  ctx.stroke();

  // Cabeza — óvalo negro solapado en la parte de arriba del cuerpo
  const headR = size * 0.27;
  const headCy = bodyCy - ry * 0.55;
  ctx.beginPath();
  ctx.ellipse(0, headCy, headR * 0.9, headR, 0, 0, Math.PI * 2);
  ctx.fillStyle = '#161616';
  ctx.fill();
  // Brillo sutil para dar volumen
  ctx.beginPath();
  ctx.ellipse(-headR * 0.28, headCy - headR * 0.3, headR * 0.34, headR * 0.48, -0.4, 0, Math.PI * 2);
  ctx.fillStyle = 'rgba(255,255,255,0.14)';
  ctx.fill();

  ctx.restore();
}

function drawPlayer(vctx: ViewCtx, p: BoardPlayer) {
  const { ctx } = vctx;
  const pos = fc(vctx, p.x, p.y);
  const s = scale(vctx);
  const r = p.radius * s;
  const size = r * 2;
  const legacy = vctx.teamColors[p.team];
  const fill = p.color ?? legacy.fill;
  const selected = vctx.selectedId === p.id;

  // Shadow
  ctx.save();
  ctx.shadowColor = 'rgba(0,0,0,0.4)';
  ctx.shadowBlur = 4;
  ctx.shadowOffsetY = 2;
  ctx.translate(pos.x, pos.y);
  paintPlayerToken(ctx, size, fill);
  ctx.restore();

  // Selection ring
  if (selected) {
    ctx.save();
    ctx.beginPath();
    ctx.ellipse(pos.x, pos.y, r * 0.55 + 4, r * 0.75 + 4, 0, 0, Math.PI * 2);
    ctx.strokeStyle = '#3b82f6';
    ctx.lineWidth = 2;
    ctx.setLineDash([4, 3]);
    ctx.stroke();
    ctx.restore();
  }

  // Número — insignia pequeña en la esquina, no tapa el muñeco entero
  const badgeR = Math.max(3.5, r * 0.28);
  const badgeX = pos.x + r * 0.6;
  const badgeY = pos.y + r * 0.75;
  ctx.save();
  ctx.beginPath();
  ctx.arc(badgeX, badgeY, badgeR, 0, Math.PI * 2);
  ctx.fillStyle = '#ffffff';
  ctx.fill();
  ctx.strokeStyle = 'rgba(0,0,0,0.3)';
  ctx.lineWidth = 0.75;
  ctx.stroke();
  ctx.fillStyle = '#111827';
  ctx.font = `bold ${Math.max(5, badgeR * 1.15)}px Arial`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(String(p.number), badgeX, badgeY + 0.5);
  ctx.restore();

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

// Color por defecto de cada pieza cuando no es de las "colorables" (conos,
// aros, picas, vallas, marcas) o cuando un diagrama antiguo no trae color.
export const DEFAULT_EQUIPMENT_COLOR: Record<string, string> = {
  'cono-anillo': '#eab308',
  'cono-disco': '#eab308',
  'cono-piramide': '#f97316',
  'aro-circulo': '#3b82f6',
  'aro-hexagono': '#3b82f6',
  'valla-agilidad': '#eab308',
  'pica-recta': '#eab308',
  'pica-bola': '#eab308',
  'pica-angular': '#eab308',
  'marca-x': '#ef4444',
  'maniqui-valla': '#1d4ed8',
  'maniqui-poste': '#1d4ed8',
  'maniqui-figura': '#18181b',
  'rebotador-portico': '#b91c1c',
  'rebotador-red': '#71717a',
  'rebotador-cuadros': '#0d9488',
  'disco-diana': '#0ea5e9',
  step: '#27272a',
  'escalera-cruz': '#eab308',
  'escalera-recta': '#eab308',
  'porteria-f11': '#e5e7eb',
  'porteria-f7': '#e5e7eb',
  'porteria-mini': '#e5e7eb',
  'porteria-aim': '#e5e7eb',
  // legado
  cone: '#f59e0b',
  hurdle: '#ef4444',
  pole: '#a3a3a3',
  ball: '#fbbf24',
  mannequin: '#6b7280',
  ladder: '#22d3ee',
  'mini-goal': '#d4d4d8',
  goal: '#e5e7eb',
};

function drawRing(ctx: CanvasRenderingContext2D, rOuter: number, rInner: number, color: string) {
  ctx.beginPath();
  ctx.arc(0, 0, rOuter, 0, Math.PI * 2);
  ctx.arc(0, 0, rInner, 0, Math.PI * 2, true);
  ctx.fillStyle = color;
  ctx.fill('evenodd');
  ctx.strokeStyle = 'rgba(0,0,0,0.3)';
  ctx.lineWidth = 1;
  ctx.stroke();
}

function drawHexagonPath(ctx: CanvasRenderingContext2D, r: number) {
  ctx.beginPath();
  for (let i = 0; i < 6; i++) {
    const a = (Math.PI / 3) * i - Math.PI / 2;
    const x = Math.cos(a) * r;
    const y = Math.sin(a) * r;
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.closePath();
}

function drawMannequinFigure(ctx: CanvasRenderingContext2D, size: number, color: string) {
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.arc(0, -size * 0.32, size * 0.13, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(-size * 0.16, size * 0.35);
  ctx.lineTo(size * 0.16, size * 0.35);
  ctx.lineTo(size * 0.1, -size * 0.18);
  ctx.lineTo(-size * 0.1, -size * 0.18);
  ctx.closePath();
  ctx.fill();
}

function drawGoalFrame(ctx: CanvasRenderingContext2D, w: number, h: number, color: string, netColor?: string) {
  ctx.strokeStyle = color;
  ctx.lineWidth = Math.max(1.2, w * 0.03);
  ctx.strokeRect(-w / 2, -h / 2, w, h);
  ctx.strokeStyle = netColor ?? color;
  ctx.globalAlpha = 0.5;
  ctx.lineWidth = Math.max(0.5, w * 0.012);
  ctx.setLineDash([2, 2]);
  for (let x = -w / 2 + w * 0.15; x < w / 2; x += w * 0.22) {
    ctx.beginPath();
    ctx.moveTo(x, -h / 2);
    ctx.lineTo(x, h / 2);
    ctx.stroke();
  }
  ctx.setLineDash([]);
  ctx.globalAlpha = 1;
}

// Dibuja UNA pieza de material centrada en (0,0) — la usan tanto el tablero
// (con su transformación de campo→canvas) como la miniatura del selector de
// material (a tamaño de icono fijo), así el icono que eliges en "Material"
// es exactamente el mismo dibujo que se coloca luego en el campo.
export function paintEquipmentShape(
  ctx: CanvasRenderingContext2D,
  equipmentType: EquipmentType,
  size: number,
  color: string
) {
  switch (equipmentType) {
    // ── Conos ──
    case 'cono-anillo': {
      // Grosor mínimo del anillo — a tableros pequeños (campo completo muy
      // reducido) el hueco podía comerse casi todo el anillo y volverlo
      // invisible por el antialiasing.
      const rOuter = Math.max(4, size * 0.4);
      const rInner = Math.max(0, Math.min(rOuter - 1.5, size * 0.16));
      drawRing(ctx, rOuter, rInner, color);
      break;
    }
    case 'cono-disco':
      ctx.beginPath();
      ctx.arc(0, 0, size * 0.35, 0, Math.PI * 2);
      ctx.fillStyle = color;
      ctx.fill();
      ctx.strokeStyle = 'rgba(0,0,0,0.3)';
      ctx.lineWidth = 1;
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(0, 0, size * 0.09, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(255,255,255,0.5)';
      ctx.fill();
      break;
    case 'cono-piramide':
    case 'cone': // legado
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
      break;

    // ── Aros ──
    case 'aro-circulo':
      ctx.beginPath();
      ctx.arc(0, 0, size * 0.42, 0, Math.PI * 2);
      ctx.strokeStyle = color;
      ctx.lineWidth = Math.max(2, size * 0.09);
      ctx.stroke();
      break;
    case 'aro-hexagono':
      drawHexagonPath(ctx, size * 0.42);
      ctx.strokeStyle = color;
      ctx.lineWidth = Math.max(2, size * 0.09);
      ctx.stroke();
      break;

    // ── Maniquíes ──
    case 'maniqui-valla':
      for (let i = -1.5; i <= 1.5; i++) {
        ctx.save();
        ctx.translate(i * size * 0.22, 0);
        drawMannequinFigure(ctx, size * 0.75, color);
        ctx.restore();
      }
      break;
    case 'maniqui-poste':
      ctx.strokeStyle = color;
      ctx.lineWidth = Math.max(1.5, size * 0.06);
      ctx.beginPath();
      ctx.moveTo(0, size * 0.5);
      ctx.lineTo(0, -size * 0.3);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(0, -size * 0.55);
      ctx.lineTo(-size * 0.16, -size * 0.22);
      ctx.lineTo(size * 0.16, -size * 0.22);
      ctx.closePath();
      ctx.fillStyle = DEFAULT_EQUIPMENT_COLOR['cono-piramide'];
      ctx.fill();
      break;
    case 'maniqui-figura':
    case 'mannequin': // legado
      drawMannequinFigure(ctx, size, color);
      ctx.fillRect(-size * 0.22, size * 0.32, size * 0.44, size * 0.07);
      break;

    // ── Rebotadores ──
    case 'rebotador-portico':
    case 'rebotador-red':
    case 'rebotador-cuadros': {
      const w = size * 0.85;
      const h = size * 0.65;
      ctx.strokeStyle = color;
      ctx.lineWidth = Math.max(1.5, size * 0.06);
      ctx.strokeRect(-w / 2, -h / 2, w, h);
      ctx.lineWidth = Math.max(0.6, size * 0.02);
      ctx.globalAlpha = 0.7;
      const step = equipmentType === 'rebotador-cuadros' ? w / 3 : w / 5;
      for (let x = -w / 2 + step; x < w / 2; x += step) {
        ctx.beginPath();
        ctx.moveTo(x, -h / 2);
        ctx.lineTo(x, h / 2);
        ctx.stroke();
      }
      const stepY = equipmentType === 'rebotador-cuadros' ? h / 2 : h / 4;
      for (let y = -h / 2 + stepY; y < h / 2; y += stepY) {
        ctx.beginPath();
        ctx.moveTo(-w / 2, y);
        ctx.lineTo(w / 2, y);
        ctx.stroke();
      }
      ctx.globalAlpha = 1;
      break;
    }

    // ── Otro material ──
    case 'disco-diana':
      ctx.strokeStyle = color;
      ctx.lineWidth = Math.max(1.2, size * 0.05);
      ctx.beginPath();
      ctx.arc(0, 0, size * 0.38, 0, Math.PI * 2);
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(0, 0, size * 0.2, 0, Math.PI * 2);
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(0, 0, size * 0.06, 0, Math.PI * 2);
      ctx.fillStyle = color;
      ctx.fill();
      break;
    case 'step':
      ctx.fillStyle = color;
      ctx.fillRect(-size * 0.4, -size * 0.14, size * 0.8, size * 0.28);
      ctx.fillStyle = 'rgba(255,255,255,0.15)';
      ctx.fillRect(-size * 0.4, -size * 0.14, size * 0.8, size * 0.07);
      break;
    case 'escalera-cruz':
    case 'escalera-recta':
    case 'ladder': // legado
      ctx.strokeStyle = color;
      ctx.lineWidth = Math.max(1.5, size * 0.05);
      ctx.beginPath();
      ctx.moveTo(-size * 0.16, -size * 0.5);
      ctx.lineTo(-size * 0.16, size * 0.5);
      ctx.moveTo(size * 0.16, -size * 0.5);
      ctx.lineTo(size * 0.16, size * 0.5);
      ctx.stroke();
      for (let y = -size * 0.4; y <= size * 0.4; y += size * 0.2) {
        ctx.beginPath();
        if (equipmentType === 'escalera-cruz') {
          ctx.moveTo(-size * 0.16, y - size * 0.07);
          ctx.lineTo(size * 0.16, y + size * 0.07);
          ctx.moveTo(size * 0.16, y - size * 0.07);
          ctx.lineTo(-size * 0.16, y + size * 0.07);
        } else {
          ctx.moveTo(-size * 0.16, y);
          ctx.lineTo(size * 0.16, y);
        }
        ctx.stroke();
      }
      break;

    // ── Vallas de agilidad ──
    case 'valla-agilidad':
    case 'hurdle': // legado
      if (equipmentType === 'hurdle') {
        ctx.fillStyle = color;
        ctx.fillRect(-size * 0.45, -size * 0.1, size * 0.9, size * 0.2);
        ctx.fillRect(-size * 0.4, -size * 0.1, size * 0.08, size * 0.5);
        ctx.fillRect(size * 0.32, -size * 0.1, size * 0.08, size * 0.5);
      } else {
        ctx.strokeStyle = color;
        ctx.lineWidth = Math.max(1.5, size * 0.06);
        ctx.beginPath();
        ctx.moveTo(0, -size * 0.5);
        ctx.lineTo(0, size * 0.5);
        ctx.stroke();
        ctx.fillStyle = color;
        const arrow = (y: number, dir: 1 | -1) => {
          ctx.beginPath();
          ctx.moveTo(0, y);
          ctx.lineTo(-size * 0.12, y - dir * size * 0.16);
          ctx.lineTo(size * 0.12, y - dir * size * 0.16);
          ctx.closePath();
          ctx.fill();
        };
        arrow(-size * 0.5, -1);
        arrow(size * 0.5, 1);
      }
      break;

    // ── Picas ──
    case 'pica-recta':
    case 'pole': // legado
      ctx.strokeStyle = color;
      ctx.lineWidth = Math.max(1.5, size * 0.06);
      ctx.beginPath();
      ctx.moveTo(0, -size * 0.5);
      ctx.lineTo(0, size * 0.42);
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(0, size * 0.46, size * 0.07, 0, Math.PI * 2);
      ctx.fillStyle = color;
      ctx.fill();
      break;
    case 'pica-bola':
      ctx.strokeStyle = color;
      ctx.lineWidth = Math.max(1.5, size * 0.06);
      ctx.beginPath();
      ctx.moveTo(0, -size * 0.32);
      ctx.lineTo(0, size * 0.5);
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(0, -size * 0.42, size * 0.14, 0, Math.PI * 2);
      ctx.fillStyle = color;
      ctx.fill();
      break;
    case 'pica-angular':
      ctx.strokeStyle = color;
      ctx.lineWidth = Math.max(1.5, size * 0.06);
      ctx.beginPath();
      ctx.moveTo(-size * 0.2, -size * 0.5);
      ctx.lineTo(size * 0.2, size * 0.5);
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(-size * 0.2, -size * 0.5, size * 0.07, 0, Math.PI * 2);
      ctx.fillStyle = color;
      ctx.fill();
      break;

    // ── Marca ──
    case 'marca-x':
      ctx.strokeStyle = color;
      ctx.lineWidth = Math.max(2, size * 0.09);
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(-size * 0.3, -size * 0.3);
      ctx.lineTo(size * 0.3, size * 0.3);
      ctx.moveTo(size * 0.3, -size * 0.3);
      ctx.lineTo(-size * 0.3, size * 0.3);
      ctx.stroke();
      break;

    // ── Pelotas ──
    case 'balon-futbol':
    case 'ball': // legado
      ctx.beginPath();
      ctx.arc(0, 0, size * 0.35, 0, Math.PI * 2);
      ctx.fillStyle = '#fff';
      ctx.fill();
      ctx.strokeStyle = '#333';
      ctx.lineWidth = 1.5;
      ctx.stroke();
      ctx.beginPath();
      for (let i = 0; i < 5; i++) {
        const angle = ((i * 72 - 90) * Math.PI) / 180;
        const px = Math.cos(angle) * size * 0.18;
        const py = Math.sin(angle) * size * 0.18;
        if (i === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      }
      ctx.closePath();
      ctx.fillStyle = '#333';
      ctx.fill();
      break;
    case 'balon-baloncesto':
      ctx.beginPath();
      ctx.arc(0, 0, size * 0.35, 0, Math.PI * 2);
      ctx.fillStyle = '#ea580c';
      ctx.fill();
      ctx.strokeStyle = '#111';
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.moveTo(-size * 0.35, 0);
      ctx.lineTo(size * 0.35, 0);
      ctx.moveTo(0, -size * 0.35);
      ctx.lineTo(0, size * 0.35);
      ctx.arc(0, 0, size * 0.35, 0, Math.PI * 2);
      ctx.stroke();
      break;
    case 'balon-americano':
      ctx.save();
      ctx.scale(1, 0.62);
      ctx.beginPath();
      ctx.ellipse(0, 0, size * 0.42, size * 0.42, 0, 0, Math.PI * 2);
      ctx.fillStyle = '#92400e';
      ctx.fill();
      ctx.strokeStyle = '#fff';
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.moveTo(-size * 0.15, 0);
      ctx.lineTo(size * 0.15, 0);
      ctx.stroke();
      ctx.restore();
      break;
    case 'balon-voleibol':
      ctx.beginPath();
      ctx.arc(0, 0, size * 0.35, 0, Math.PI * 2);
      ctx.fillStyle = '#f8fafc';
      ctx.fill();
      ctx.strokeStyle = '#333';
      ctx.lineWidth = 1;
      ctx.stroke();
      ['#2563eb', '#eab308'].forEach((c, i) => {
        ctx.beginPath();
        ctx.arc(size * (i === 0 ? -0.1 : 0.12), size * (i === 0 ? -0.1 : 0.08), size * 0.14, 0, Math.PI * 1.4);
        ctx.strokeStyle = c;
        ctx.lineWidth = size * 0.06;
        ctx.stroke();
      });
      break;
    case 'balon-beisbol':
      ctx.beginPath();
      ctx.arc(0, 0, size * 0.3, 0, Math.PI * 2);
      ctx.fillStyle = '#fafaf9';
      ctx.fill();
      ctx.strokeStyle = '#333';
      ctx.lineWidth = 1;
      ctx.stroke();
      ctx.strokeStyle = '#dc2626';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.arc(-size * 0.06, 0, size * 0.22, -0.9, 0.9);
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(size * 0.06, 0, size * 0.22, Math.PI - 0.9, Math.PI + 0.9);
      ctx.stroke();
      break;
    case 'balon-tenis':
      ctx.beginPath();
      ctx.arc(0, 0, size * 0.24, 0, Math.PI * 2);
      ctx.fillStyle = '#d9f99d';
      ctx.fill();
      ctx.strokeStyle = '#fff';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.arc(0, 0, size * 0.24, -0.6, 2.2);
      ctx.stroke();
      break;

    // ── Porterías ──
    case 'porteria-f11':
    case 'goal': // legado
      drawGoalFrame(ctx, size * 1.1, size * 0.55, color);
      break;
    case 'porteria-f7':
      drawGoalFrame(ctx, size * 0.85, size * 0.45, color);
      break;
    case 'porteria-mini':
    case 'mini-goal': // legado
      drawGoalFrame(ctx, size * 0.6, size * 0.34, color);
      break;
    case 'porteria-aim': {
      const w = size * 0.85;
      const h = size * 0.48;
      drawGoalFrame(ctx, w, h, color);
      const cols = 3;
      const rows = 2;
      ctx.fillStyle = 'rgba(239,68,68,0.35)';
      const cw = w / cols;
      const ch = h / rows;
      [[0, 0], [2, 1]].forEach(([cx, cy]) => {
        ctx.fillRect(-w / 2 + cx * cw + 1, -h / 2 + cy * ch + 1, cw - 2, ch - 2);
      });
      break;
    }

    default:
      ctx.fillStyle = color;
      ctx.fillRect(-size * 0.3, -size * 0.3, size * 0.6, size * 0.6);
  }
}

// Icono en miniatura para el selector de "Material" — un canvas pequeño
// aparte del tablero, mismo dibujo exacto que `paintEquipmentShape`.
export function renderEquipmentIcon(
  canvas: HTMLCanvasElement,
  equipmentType: EquipmentType,
  color: string,
  px: number
) {
  const dpr = typeof window !== 'undefined' ? window.devicePixelRatio || 1 : 1;
  canvas.width = px * dpr;
  canvas.height = px * dpr;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  ctx.scale(dpr, dpr);
  ctx.clearRect(0, 0, px, px);
  ctx.save();
  ctx.translate(px / 2, px / 2);
  paintEquipmentShape(ctx, equipmentType, px * 0.78, color);
  ctx.restore();
}

// Icono en miniatura de un "muñeco" de jugadora — para el selector de la
// pestaña "Jugadoras" y el re-color en el panel de Propiedades.
export function renderPlayerIcon(canvas: HTMLCanvasElement, color: string, px: number) {
  const dpr = typeof window !== 'undefined' ? window.devicePixelRatio || 1 : 1;
  canvas.width = px * dpr;
  canvas.height = px * dpr;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  ctx.scale(dpr, dpr);
  ctx.clearRect(0, 0, px, px);
  ctx.save();
  ctx.translate(px / 2, px / 2);
  paintPlayerToken(ctx, px * 0.92, color);
  ctx.restore();
}

function drawEquipment(vctx: ViewCtx, eq: BoardEquipment) {
  const { ctx } = vctx;
  const pos = fc(vctx, eq.x, eq.y);
  const s = scale(vctx);
  // Tamaño mínimo — con el campo completo muy reducido (tablero estrecho)
  // el material podía quedar por debajo del píxel y desaparecer.
  const size = Math.max(8, eq.scale * s * 1.2);
  const selected = vctx.selectedId === eq.id;
  const color = eq.color || DEFAULT_EQUIPMENT_COLOR[eq.equipmentType] || '#9ca3af';

  ctx.save();
  ctx.translate(pos.x, pos.y);
  ctx.rotate((eq.rotation * Math.PI) / 180);

  paintEquipmentShape(ctx, eq.equipmentType, size, color);

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
