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

export type EquipmentType =
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
  team: TeamId;
  radius: number;
}

export interface BoardEquipment {
  kind: 'equipment';
  id: string;
  x: number;
  y: number;
  equipmentType: EquipmentType;
  rotation: number;
  scale: number;
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
