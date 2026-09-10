// ============================================
// Campograma maestro — especificación de diseño ÚNICA
// ============================================
// Toda representación sobre el campo de coach.lab (SVG <Pitch> o el
// canvas del editor táctico) parte de estas mismas constantes. Cambiar
// aquí el número de rayas, los verdes o el grosor de línea afecta a
// todos los módulos a la vez.

/** Dimensiones FIFA en metros — sistema de coordenadas maestro. */
export const FIELD = {
  W: 105,
  H: 68,
  PA_DEPTH: 16.5, // área grande — fondo
  PA_WIDTH: 40.32, // área grande — ancho
  GA_DEPTH: 5.5, // área pequeña — fondo
  GA_WIDTH: 18.32, // área pequeña — ancho
  CENTER_R: 9.15,
  PEN_SPOT: 11,
  PEN_ARC_R: 9.15,
  CORNER_R: 1,
  GOAL_W: 7.32,
  GOAL_DEPTH: 2.44,
} as const;

export const PITCH_DESIGN = {
  STRIPE_COUNT: 9,
  STRIPE_LIGHT: "#489e37",
  STRIPE_DARK: "#3a8c30",
  LINE: "#ffffff",
  LINE_OPACITY: 0.9,
  LINE_WIDTH_M: 0.3, // grosor de línea en metros de campo
  NET_OPACITY: 0.4,
  NET_VERTICALS: 4,
  NET_HORIZONTALS: 5,
} as const;

/** Media cuerda del semicírculo del área que sobresale del área grande. */
export const ARC_HALF = Math.sqrt(
  FIELD.PEN_ARC_R ** 2 - (FIELD.PA_DEPTH - FIELD.PEN_SPOT) ** 2
);
