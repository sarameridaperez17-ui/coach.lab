// ============================================
// Enfrentar sistemas — Motor de formaciones
// ============================================
// Genera estructuras iniciales coherentes a partir del nombre de un
// sistema (ej. "1-4-3-3") sin ningún tipo de análisis táctico automático.
// Solo posicionamiento nominal + ajuste de bloque para la línea defensiva.

export const FORMATIONS = [
  "1-4-3-3",
  "1-4-2-3-1",
  "1-4-4-2",
  "1-4-4-2 (rombo)",
  "1-3-4-3",
  "1-3-5-2",
  "1-5-4-1",
  "1-5-3-2",
] as const;

export type Formation = (typeof FORMATIONS)[number];
export type Side = "own" | "rival";
export type Posture = "attack" | "defense";
export type BlockHeight = "alto" | "medio" | "bajo";

export interface FormationPlayer {
  id: string;
  number: number;
  label: string; // PT, LI, CT, MC, DC... (mismo vocabulario que "Mis sistemas")
  x: number; // metros, 0-105 (0 = portería propia, 105 = portería rival)
  y: number; // metros, 0-68
}

// Mismas etiquetas de posición que "Mis sistemas" — editables por
// clic derecho sobre cada jugadora.
export const POSITION_LABELS = [
  "PT", "CT", "CL", "CC", "LT", "MC", "IN", "MP", "Ca", "EX", "DC", "DP",
];

const FIELD_W = 105;
const FIELD_H = 68;
const HALF = FIELD_W / 2;

// Profundidad de la línea defensiva (bloque compacto de ~0.35 unidades)
const BLOCK_DEPTH: Record<BlockHeight, number> = {
  bajo: 0.18,
  medio: 0.35,
  alto: 0.55,
};

// Rango de profundidad de la estructura ofensiva: el bloque también
// adelanta o retrasa el punto hasta el que empuja el equipo en ataque.
const ATTACK_DEPTH: Record<BlockHeight, [number, number]> = {
  bajo: [0.1, 1.05],
  medio: [0.12, 1.3],
  alto: [0.16, 1.5],
};

// Devuelve la profundidad (0-1, en unidades de "hasta el medio campo")
// de cada línea de campo (sin la portera) para una postura dada.
function lineDepths(count: number, posture: Posture, blockHeight: BlockHeight): number[] {
  const [depthMin, depthMax] =
    posture === "attack" ? ATTACK_DEPTH[blockHeight] : [BLOCK_DEPTH[blockHeight], BLOCK_DEPTH[blockHeight] + 0.35];

  if (count === 1) return [(depthMin + depthMax) / 2];
  return Array.from({ length: count }, (_, i) => depthMin + (i * (depthMax - depthMin)) / (count - 1));
}

function lineWidths(count: number): number[] {
  const margin = 8;
  const usable = FIELD_H - margin * 2;
  return Array.from({ length: count }, (_, j) => margin + ((j + 0.5) * usable) / count);
}

// Formaciones cuya estructura de líneas no se puede deducir del propio
// nombre (ej. el rombo reparte los 4 centrocampistas en 4 líneas: pivote,
// dos interiores y mediapunta, en vez de una línea plana de 4).
const CUSTOM_LINES: Partial<Record<Formation, number[]>> = {
  "1-4-4-2 (rombo)": [4, 1, 2, 1, 2],
};

export function parseFormationLines(formation: Formation): number[] {
  const custom = CUSTOM_LINES[formation];
  if (custom) return custom;
  return formation.split("-").slice(1).map(Number);
}

export interface TemplatePlayer {
  number: number;
  label: string;
  x: number;
  y: number;
}

// Etiqueta por defecto de cada puesto de una línea, según su rol
// (defensa / medio / ataque) y cuántas jugadoras hay en esa línea.
// "frac" (0=línea más retrasada del centro del campo, 1=más avanzada)
// distingue, cuando hay varias líneas de centrocampistas, el pivote
// de la mediapunta.
function labelsForLine(count: number, role: "defense" | "midfield" | "attack", frac: number): string[] {
  if (role === "defense") {
    switch (count) {
      case 3: return ["CT", "CC", "CT"];
      case 4: return ["LI", "CT", "CT", "LD"];
      case 5: return ["LI", "CT", "CC", "CT", "LD"];
      default: return Array(count).fill("CT");
    }
  }
  if (role === "attack") {
    switch (count) {
      case 1: return ["DC"];
      case 2: return ["DC", "DC"];
      case 3: return ["EI", "DC", "ED"];
      default: return Array(count).fill("DC");
    }
  }
  // midfield
  switch (count) {
    case 1: return [frac < 0.5 ? "MC" : "MP"];
    case 2: return frac >= 0.75 ? ["IN", "IN"] : ["MC", "MC"];
    case 3: return frac >= 0.75 ? ["EI", "MP", "ED"] : ["MC", "MC", "MC"];
    case 4: return ["EI", "MC", "MC", "ED"];
    case 5: return ["EI", "IN", "MC", "IN", "ED"];
    default: return Array(count).fill("MC");
  }
}

export function templateKey(formation: Formation, posture: Posture, blockHeight: BlockHeight): string {
  return `${formation}|${posture}|${blockHeight}`;
}

/**
 * Igual que generateFormation, pero primero comprueba si hay una
 * plantilla configurada a mano para (sistema, fase, bloque). Las
 * plantillas se guardan en orientación "propia" (ataca hacia la
 * derecha) y se espejan en X cuando side="rival".
 */
export function getFormationPositions(
  formation: Formation,
  side: Side,
  posture: Posture,
  blockHeight: BlockHeight,
  templates?: Map<string, TemplatePlayer[]>
): FormationPlayer[] {
  const tpl = templates?.get(templateKey(formation, posture, blockHeight));
  if (tpl && tpl.length > 0) {
    return tpl.map((p) => ({
      id: `${side}-${p.number}`,
      number: p.number,
      label: p.label,
      x: side === "own" ? p.x : FIELD_W - p.x,
      y: p.y,
    }));
  }
  return generateFormation(formation, side, posture, blockHeight);
}

export function generateFormation(
  formation: Formation,
  side: Side,
  posture: Posture,
  blockHeight: BlockHeight
): FormationPlayer[] {
  const lines = parseFormationLines(formation);
  const players: FormationPlayer[] = [];
  let number = 1;

  const toFieldX = (depthFromOwnGoal: number) =>
    side === "own" ? depthFromOwnGoal * HALF : FIELD_W - depthFromOwnGoal * HALF;

  // Portera
  players.push({ id: `${side}-${number}`, number, label: "PT", x: toFieldX(0.06), y: FIELD_H / 2 });
  number++;

  const midLines = lines.length - 2; // líneas de campo entre defensa y ataque
  lines.forEach((count, lineIndex) => {
    const depths = lineDepths(lines.length, posture, blockHeight);
    const widths = lineWidths(count);
    const depth = depths[lineIndex];
    const role = lineIndex === 0 ? "defense" : lineIndex === lines.length - 1 ? "attack" : "midfield";
    const frac = role === "midfield" && midLines > 1 ? (lineIndex - 1) / (midLines - 1) : 0.5;
    const labels = labelsForLine(count, role, frac);
    widths.forEach((y, idx) => {
      players.push({ id: `${side}-${number}`, number, label: labels[idx] ?? "MC", x: toFieldX(depth), y });
      number++;
    });
  });

  return players;
}
