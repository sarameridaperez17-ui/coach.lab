"use client";

import type { MouseEvent as ReactMouseEvent, ReactNode } from "react";
import { FIELD, PITCH_DESIGN, ARC_HALF } from "./design";

// ============================================
// Pitch — Campograma táctico maestro de coach.lab
// ============================================
// DISEÑO BASE fijo (no cambia entre módulos): terreno de juego apaisado
// con proporciones FIFA, rayas de corte, marcajes blancos y porterías con
// red. El CONTENIDO DINÁMICO (jugadoras, flechas, zonas...) se pasa como
// `children` y se posiciona con el MISMO sistema de coordenadas: metros,
// 0..105 en el eje portería-portería y 0..68 de banda a banda.

export { FIELD } from "./design";

const PAD_X = PITCH_DESIGN.GOAL_VIS_DEPTH + 2;
const PAD_Y = 2;
const VB_MIN_X = -PAD_X;
const VB_MIN_Y = -PAD_Y;
const VB_W = FIELD.W + PAD_X * 2;
const VB_H = FIELD.H + PAD_Y * 2;
const VIEWBOX = `${VB_MIN_X} ${VB_MIN_Y} ${VB_W} ${VB_H}`;

const STRIPE_COUNT = PITCH_DESIGN.STRIPE_COUNT;
const STRIPE_LIGHT = PITCH_DESIGN.STRIPE_LIGHT;
const STRIPE_DARK = PITCH_DESIGN.STRIPE_DARK;
const LINE = PITCH_DESIGN.LINE;
const LINE_OPACITY = PITCH_DESIGN.LINE_OPACITY;
const LW = PITCH_DESIGN.LINE_WIDTH_M;

const CX = FIELD.W / 2;
const CY = FIELD.H / 2;

/** Puntero del navegador → coordenadas de campo en metros (0..105, 0..68). */
export function clientToField(svg: SVGSVGElement, clientX: number, clientY: number) {
  const r = svg.getBoundingClientRect();
  return {
    x: ((clientX - r.left) / r.width) * VB_W + VB_MIN_X,
    y: ((clientY - r.top) / r.height) * VB_H + VB_MIN_Y,
  };
}

const GOAL_DEPTH = PITCH_DESIGN.GOAL_VIS_DEPTH;
const GOAL_LW = PITCH_DESIGN.GOAL_LINE_WIDTH_M;

function Goal({ line, dir }: { line: number; dir: 1 | -1 }) {
  const top = CY - FIELD.GOAL_W / 2;
  const outer = line + dir * GOAL_DEPTH;
  const x0 = Math.min(line, outer);
  const verticals = PITCH_DESIGN.NET_VERTICALS;
  const horizontals = PITCH_DESIGN.NET_HORIZONTALS;
  // color del tema: se ve tanto en modo día como noche (portería fuera del campo)
  return (
    <g stroke="var(--foreground)">
      <rect
        x={x0}
        y={top}
        width={GOAL_DEPTH}
        height={FIELD.GOAL_W}
        fill="none"
        strokeOpacity={0.85}
        strokeWidth={GOAL_LW}
        strokeLinejoin="round"
      />
      <g strokeOpacity={PITCH_DESIGN.NET_OPACITY} strokeWidth={GOAL_LW * 0.5} fill="none">
        {Array.from({ length: verticals }, (_, i) => {
          const gx = line + (dir * GOAL_DEPTH * (i + 1)) / (verticals + 1);
          return <line key={`v${i}`} x1={gx} y1={top} x2={gx} y2={top + FIELD.GOAL_W} />;
        })}
        {Array.from({ length: horizontals }, (_, i) => {
          const gy = top + (FIELD.GOAL_W * (i + 1)) / (horizontals + 1);
          return <line key={`h${i}`} x1={line} y1={gy} x2={outer} y2={gy} />;
        })}
      </g>
    </g>
  );
}

function PitchBase() {
  const stripeH = FIELD.H / STRIPE_COUNT;
  return (
    <g>
      {/* Césped con rayas de corte */}
      {Array.from({ length: STRIPE_COUNT }, (_, i) => (
        <rect
          key={i}
          x={0}
          y={i * stripeH}
          width={FIELD.W}
          height={stripeH}
          fill={i % 2 === 0 ? STRIPE_LIGHT : STRIPE_DARK}
        />
      ))}

      {/* Marcajes */}
      <g stroke={LINE} strokeOpacity={LINE_OPACITY} strokeWidth={LW} fill="none" strokeLinecap="round">
        <rect x={0} y={0} width={FIELD.W} height={FIELD.H} />
        <line x1={CX} y1={0} x2={CX} y2={FIELD.H} />
        <circle cx={CX} cy={CY} r={FIELD.CENTER_R} />
        <circle cx={CX} cy={CY} r={0.4} fill={LINE} fillOpacity={LINE_OPACITY} stroke="none" />

        {/* Área izquierda */}
        <rect x={0} y={CY - FIELD.PA_WIDTH / 2} width={FIELD.PA_DEPTH} height={FIELD.PA_WIDTH} />
        <rect x={0} y={CY - FIELD.GA_WIDTH / 2} width={FIELD.GA_DEPTH} height={FIELD.GA_WIDTH} />
        <circle cx={FIELD.PEN_SPOT} cy={CY} r={0.4} fill={LINE} fillOpacity={LINE_OPACITY} stroke="none" />
        <path d={`M ${FIELD.PA_DEPTH} ${CY - ARC_HALF} A ${FIELD.PEN_ARC_R} ${FIELD.PEN_ARC_R} 0 0 1 ${FIELD.PA_DEPTH} ${CY + ARC_HALF}`} />

        {/* Área derecha */}
        <rect x={FIELD.W - FIELD.PA_DEPTH} y={CY - FIELD.PA_WIDTH / 2} width={FIELD.PA_DEPTH} height={FIELD.PA_WIDTH} />
        <rect x={FIELD.W - FIELD.GA_DEPTH} y={CY - FIELD.GA_WIDTH / 2} width={FIELD.GA_DEPTH} height={FIELD.GA_WIDTH} />
        <circle cx={FIELD.W - FIELD.PEN_SPOT} cy={CY} r={0.4} fill={LINE} fillOpacity={LINE_OPACITY} stroke="none" />
        <path d={`M ${FIELD.W - FIELD.PA_DEPTH} ${CY - ARC_HALF} A ${FIELD.PEN_ARC_R} ${FIELD.PEN_ARC_R} 0 0 0 ${FIELD.W - FIELD.PA_DEPTH} ${CY + ARC_HALF}`} />

        {/* Córners */}
        <path d={`M 0 ${FIELD.CORNER_R} A ${FIELD.CORNER_R} ${FIELD.CORNER_R} 0 0 0 ${FIELD.CORNER_R} 0`} />
        <path d={`M ${FIELD.W - FIELD.CORNER_R} 0 A ${FIELD.CORNER_R} ${FIELD.CORNER_R} 0 0 0 ${FIELD.W} ${FIELD.CORNER_R}`} />
        <path d={`M 0 ${FIELD.H - FIELD.CORNER_R} A ${FIELD.CORNER_R} ${FIELD.CORNER_R} 0 0 1 ${FIELD.CORNER_R} ${FIELD.H}`} />
        <path d={`M ${FIELD.W} ${FIELD.H - FIELD.CORNER_R} A ${FIELD.CORNER_R} ${FIELD.CORNER_R} 0 0 1 ${FIELD.W - FIELD.CORNER_R} ${FIELD.H}`} />
      </g>

      {/* Porterías con red */}
      <Goal line={0} dir={-1} />
      <Goal line={FIELD.W} dir={1} />
    </g>
  );
}

interface PitchProps {
  children?: ReactNode;
  className?: string;
  onMouseMove?: (e: ReactMouseEvent<SVGSVGElement>) => void;
  onMouseUp?: (e: ReactMouseEvent<SVGSVGElement>) => void;
  onMouseLeave?: (e: ReactMouseEvent<SVGSVGElement>) => void;
}

export function Pitch({ children, className, onMouseMove, onMouseUp, onMouseLeave }: PitchProps) {
  return (
    <svg
      viewBox={VIEWBOX}
      preserveAspectRatio="xMidYMid meet"
      className={`w-full select-none ${className ?? ""}`}
      onMouseMove={onMouseMove}
      onMouseUp={onMouseUp}
      onMouseLeave={onMouseLeave}
    >
      <PitchBase />
      {children}
    </svg>
  );
}
