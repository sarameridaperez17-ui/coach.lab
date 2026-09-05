// ============================================
// TacticalBoardEditor — Renderizado del campo
// ============================================

import type { FieldPerspective } from './types';

// Field dimensions in meters (official FIFA)
const FIELD_W = 105;
const FIELD_H = 68;
const PENALTY_AREA_W = 40.32;
const PENALTY_AREA_H = 16.5;
const GOAL_AREA_W = 18.32;
const GOAL_AREA_H = 5.5;
const CENTER_RADIUS = 9.15;
const PENALTY_SPOT = 11;
const PENALTY_ARC_RADIUS = 9.15;
const CORNER_ARC = 1;
const GOAL_W = 7.32;
const GOAL_DEPTH = 2.44;

// Returns the visible rectangle of the field in meters for each perspective
export function getFieldViewport(perspective: FieldPerspective): {
  x: number;
  y: number;
  w: number;
  h: number;
} {
  switch (perspective) {
    case 'full':
      return { x: 0, y: 0, w: FIELD_W, h: FIELD_H };
    case 'half':
      return { x: FIELD_W / 2, y: 0, w: FIELD_W / 2, h: FIELD_H };
    case 'third':
      return { x: FIELD_W * 2 / 3, y: 0, w: FIELD_W / 3, h: FIELD_H };
    case 'area':
      return { x: FIELD_W - PENALTY_AREA_H - 5, y: (FIELD_H - PENALTY_AREA_W) / 2 - 5, w: PENALTY_AREA_H + 10, h: PENALTY_AREA_W + 10 };
    case 'reduced':
      return { x: FIELD_W / 4, y: FIELD_H / 8, w: FIELD_W / 2, h: FIELD_H * 3 / 4 };
    default:
      return { x: 0, y: 0, w: FIELD_W, h: FIELD_H };
  }
}

// Convert field meters to canvas pixels
export function fieldToCanvas(
  fx: number,
  fy: number,
  canvasW: number,
  canvasH: number,
  viewport: { x: number; y: number; w: number; h: number },
  zoom: number,
  panX: number,
  panY: number
): { x: number; y: number } {
  const padding = 20;
  const drawW = canvasW - padding * 2;
  const drawH = canvasH - padding * 2;
  const scaleX = drawW / viewport.w;
  const scaleY = drawH / viewport.h;
  const scale = Math.min(scaleX, scaleY) * zoom;
  const offsetX = (canvasW - viewport.w * scale) / 2 + panX;
  const offsetY = (canvasH - viewport.h * scale) / 2 + panY;
  return {
    x: (fx - viewport.x) * scale + offsetX,
    y: (fy - viewport.y) * scale + offsetY,
  };
}

// Convert canvas pixels to field meters
export function canvasToField(
  cx: number,
  cy: number,
  canvasW: number,
  canvasH: number,
  viewport: { x: number; y: number; w: number; h: number },
  zoom: number,
  panX: number,
  panY: number
): { x: number; y: number } {
  const padding = 20;
  const drawW = canvasW - padding * 2;
  const drawH = canvasH - padding * 2;
  const scaleX = drawW / viewport.w;
  const scaleY = drawH / viewport.h;
  const scale = Math.min(scaleX, scaleY) * zoom;
  const offsetX = (canvasW - viewport.w * scale) / 2 + panX;
  const offsetY = (canvasH - viewport.h * scale) / 2 + panY;
  return {
    x: (cx - offsetX) / scale + viewport.x,
    y: (cy - offsetY) / scale + viewport.y,
  };
}

export function getScale(
  canvasW: number,
  canvasH: number,
  viewport: { x: number; y: number; w: number; h: number },
  zoom: number
): number {
  const padding = 20;
  const drawW = canvasW - padding * 2;
  const drawH = canvasH - padding * 2;
  const scaleX = drawW / viewport.w;
  const scaleY = drawH / viewport.h;
  return Math.min(scaleX, scaleY) * zoom;
}

// Draw the football field
export function drawField(
  ctx: CanvasRenderingContext2D,
  canvasW: number,
  canvasH: number,
  viewport: { x: number; y: number; w: number; h: number },
  zoom: number,
  panX: number,
  panY: number,
  fieldColor: string,
  lineColor: string
) {
  // Helper to convert field coords to canvas coords
  const fc = (fx: number, fy: number) =>
    fieldToCanvas(fx, fy, canvasW, canvasH, viewport, zoom, panX, panY);

  const scale = getScale(canvasW, canvasH, viewport, zoom);
  const lw = Math.max(1, 0.12 * scale); // Line width scales with zoom

  // Background
  ctx.fillStyle = '#0f1117';
  ctx.fillRect(0, 0, canvasW, canvasH);

  // Field surface
  const topLeft = fc(0, 0);
  const botRight = fc(FIELD_W, FIELD_H);
  ctx.fillStyle = fieldColor;
  ctx.fillRect(topLeft.x, topLeft.y, botRight.x - topLeft.x, botRight.y - topLeft.y);

  ctx.strokeStyle = lineColor;
  ctx.lineWidth = lw;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  // Outer boundary
  const tl = fc(0, 0);
  const br = fc(FIELD_W, FIELD_H);
  ctx.strokeRect(tl.x, tl.y, br.x - tl.x, br.y - tl.y);

  // Center line
  const cl1 = fc(FIELD_W / 2, 0);
  const cl2 = fc(FIELD_W / 2, FIELD_H);
  ctx.beginPath();
  ctx.moveTo(cl1.x, cl1.y);
  ctx.lineTo(cl2.x, cl2.y);
  ctx.stroke();

  // Center circle
  const cc = fc(FIELD_W / 2, FIELD_H / 2);
  const ccEdge = fc(FIELD_W / 2 + CENTER_RADIUS, FIELD_H / 2);
  const ccR = ccEdge.x - cc.x;
  ctx.beginPath();
  ctx.arc(cc.x, cc.y, Math.abs(ccR), 0, Math.PI * 2);
  ctx.stroke();

  // Center spot
  ctx.beginPath();
  ctx.arc(cc.x, cc.y, Math.max(2, 0.2 * scale), 0, Math.PI * 2);
  ctx.fillStyle = lineColor;
  ctx.fill();

  // ── Left penalty area ──
  const lpaTL = fc(0, (FIELD_H - PENALTY_AREA_W) / 2);
  const lpaBR = fc(PENALTY_AREA_H, (FIELD_H + PENALTY_AREA_W) / 2);
  ctx.strokeRect(lpaTL.x, lpaTL.y, lpaBR.x - lpaTL.x, lpaBR.y - lpaTL.y);

  // Left goal area
  const lgaTL = fc(0, (FIELD_H - GOAL_AREA_W) / 2);
  const lgaBR = fc(GOAL_AREA_H, (FIELD_H + GOAL_AREA_W) / 2);
  ctx.strokeRect(lgaTL.x, lgaTL.y, lgaBR.x - lgaTL.x, lgaBR.y - lgaTL.y);

  // Left penalty spot
  const lps = fc(PENALTY_SPOT, FIELD_H / 2);
  ctx.beginPath();
  ctx.arc(lps.x, lps.y, Math.max(2, 0.2 * scale), 0, Math.PI * 2);
  ctx.fill();

  // Left penalty arc
  const lArcCenter = fc(PENALTY_SPOT, FIELD_H / 2);
  const lArcEdge = fc(PENALTY_SPOT + PENALTY_ARC_RADIUS, FIELD_H / 2);
  const lArcR = Math.abs(lArcEdge.x - lArcCenter.x);
  // Arc outside penalty area
  const lArcAngle = Math.acos(PENALTY_AREA_H / PENALTY_ARC_RADIUS);
  ctx.beginPath();
  ctx.arc(lArcCenter.x, lArcCenter.y, lArcR, -lArcAngle, lArcAngle);
  ctx.stroke();

  // ── Right penalty area ──
  const rpaTL = fc(FIELD_W - PENALTY_AREA_H, (FIELD_H - PENALTY_AREA_W) / 2);
  const rpaBR = fc(FIELD_W, (FIELD_H + PENALTY_AREA_W) / 2);
  ctx.strokeRect(rpaTL.x, rpaTL.y, rpaBR.x - rpaTL.x, rpaBR.y - rpaTL.y);

  // Right goal area
  const rgaTL = fc(FIELD_W - GOAL_AREA_H, (FIELD_H - GOAL_AREA_W) / 2);
  const rgaBR = fc(FIELD_W, (FIELD_H + GOAL_AREA_W) / 2);
  ctx.strokeRect(rgaTL.x, rgaTL.y, rgaBR.x - rgaTL.x, rgaBR.y - rgaTL.y);

  // Right penalty spot
  const rps = fc(FIELD_W - PENALTY_SPOT, FIELD_H / 2);
  ctx.beginPath();
  ctx.arc(rps.x, rps.y, Math.max(2, 0.2 * scale), 0, Math.PI * 2);
  ctx.fill();

  // Right penalty arc
  const rArcCenter = fc(FIELD_W - PENALTY_SPOT, FIELD_H / 2);
  const rArcEdge = fc(FIELD_W - PENALTY_SPOT - PENALTY_ARC_RADIUS, FIELD_H / 2);
  const rArcR = Math.abs(rArcCenter.x - rArcEdge.x);
  ctx.beginPath();
  ctx.arc(rArcCenter.x, rArcCenter.y, rArcR, Math.PI - lArcAngle, Math.PI + lArcAngle);
  ctx.stroke();

  // ── Corner arcs ──
  const corners = [
    [0, 0],
    [FIELD_W, 0],
    [0, FIELD_H],
    [FIELD_W, FIELD_H],
  ];
  const cornerAngles = [
    [0, Math.PI / 2],
    [Math.PI / 2, Math.PI],
    [-Math.PI / 2, 0],
    [Math.PI, Math.PI * 1.5],
  ];
  for (let i = 0; i < corners.length; i++) {
    const c = fc(corners[i][0], corners[i][1]);
    const cEdge = fc(corners[i][0] + CORNER_ARC, corners[i][1]);
    const cR = Math.abs(cEdge.x - c.x);
    ctx.beginPath();
    ctx.arc(c.x, c.y, cR, cornerAngles[i][0], cornerAngles[i][1]);
    ctx.stroke();
  }

  // ── Goals (drawn as net rectangles behind goal line) ──
  ctx.save();
  ctx.strokeStyle = lineColor;
  ctx.lineWidth = lw * 0.7;
  ctx.setLineDash([3, 3]);

  // Left goal
  const lgTL = fc(-GOAL_DEPTH, (FIELD_H - GOAL_W) / 2);
  const lgBR = fc(0, (FIELD_H + GOAL_W) / 2);
  ctx.strokeRect(lgTL.x, lgTL.y, lgBR.x - lgTL.x, lgBR.y - lgTL.y);

  // Right goal
  const rgTL = fc(FIELD_W, (FIELD_H - GOAL_W) / 2);
  const rgBR = fc(FIELD_W + GOAL_DEPTH, (FIELD_H + GOAL_W) / 2);
  ctx.strokeRect(rgTL.x, rgTL.y, rgBR.x - rgTL.x, rgBR.y - rgTL.y);

  ctx.restore();
}
