// ============================================
// TacticalBoardEditor — Tipos
// ============================================

export type FieldPerspective = 'full' | 'half' | 'third' | 'area' | 'reduced';

export type ToolMode =
  | 'select'
  | 'player'
  | 'equipment'
  | 'line'
  | 'arrow'
  | 'curve'
  | 'dashed-line'
  | 'dashed-arrow'
  | 'zone'
  | 'text';

export type TeamId = 'A' | 'B' | 'neutral';

// Rol visual de un jugador colocado en el tablero — puramente cosmético
// (icono/paleta), no afecta a la lógica del editor.
export type PlayerRole = 'jugador' | 'portero' | 'neutral' | 'staff';

export type EquipmentType =
  // Conos
  | 'cono-anillo'
  | 'cono-disco'
  | 'cono-piramide'
  // Aros
  | 'aro-circulo'
  | 'aro-hexagono'
  // Maniquíes
  | 'maniqui-valla'
  | 'maniqui-poste'
  | 'maniqui-figura'
  // Rebotadores
  | 'rebotador-portico'
  | 'rebotador-red'
  | 'rebotador-cuadros'
  // Otro material
  | 'disco-diana'
  | 'step'
  | 'escalera-cruz'
  | 'escalera-recta'
  // Vallas de agilidad
  | 'valla-agilidad'
  // Picas
  | 'pica-recta'
  | 'pica-bola'
  | 'pica-angular'
  // Marca
  | 'marca-x'
  // Pelotas
  | 'balon-futbol'
  | 'balon-baloncesto'
  | 'balon-americano'
  | 'balon-voleibol'
  | 'balon-beisbol'
  | 'balon-tenis'
  // Porterías
  | 'porteria-f11'
  | 'porteria-f7'
  | 'porteria-mini'
  | 'porteria-aim'
  // Legado — tareas/ABP guardados antes de ampliar el material, se
  // siguen dibujando igual para no romper diagramas ya creados.
  | 'cone'
  | 'hurdle'
  | 'pole'
  | 'mini-goal'
  | 'goal'
  | 'ball'
  | 'ladder'
  | 'mannequin';

export interface Point {
  x: number;
  y: number;
}

// ── Board objects ──

export interface BoardPlayer {
  kind: 'player';
  id: string;
  x: number;
  y: number;
  number: number;
  label: string;
  team: TeamId; // legado — se mantiene por compatibilidad, ya no se usa para el color
  radius: number;
  // Nuevos — color e icono elegidos directamente en la pestaña "Jugadores"
  // (7 colores de jugadora + 3 de portera + 2 neutrales + 1 de staff).
  // Opcionales para que los tableros guardados antes sigan usando el
  // color de `team` tal cual.
  color?: string;
  role?: PlayerRole;
}

export interface BoardEquipment {
  kind: 'equipment';
  id: string;
  x: number;
  y: number;
  equipmentType: EquipmentType;
  rotation: number;
  scale: number;
  // Color elegido en la pestaña "Material" — solo aplica a las piezas
  // que existen en varios colores (conos, aros, picas, vallas, marcas).
  color?: string;
}

export interface BoardLine {
  kind: 'line';
  id: string;
  points: Point[];
  color: string;
  width: number;
  dashed: boolean;
  arrowEnd: boolean;
  curveControl?: Point; // quadratic bezier control point
}

export interface BoardZone {
  kind: 'zone';
  id: string;
  points: Point[];
  fillColor: string;
  fillOpacity: number;
  strokeColor: string;
  strokeWidth: number;
}

export interface BoardText {
  kind: 'text';
  id: string;
  x: number;
  y: number;
  text: string;
  fontSize: number;
  color: string;
  fontWeight: 'normal' | 'bold';
}

export type BoardObject =
  | BoardPlayer
  | BoardEquipment
  | BoardLine
  | BoardZone
  | BoardText;

// ── Board state ──

export interface TeamColors {
  A: { fill: string; stroke: string; text: string };
  B: { fill: string; stroke: string; text: string };
  neutral: { fill: string; stroke: string; text: string };
}

export interface BoardState {
  objects: BoardObject[];
  perspective: FieldPerspective;
  teamColors: TeamColors;
  fieldColor: string;
  lineColor: string;
}

// ── Props ──

export interface TacticalBoardEditorProps {
  initialState?: BoardState;
  onChange?: (state: BoardState) => void;
  width?: number;
  height?: number;
  readOnly?: boolean;
}
