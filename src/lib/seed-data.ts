// ============================================
// coach.lab — Datos iniciales (seed)
// Estos datos se usarán primero en memoria
// y después se migrarán a Supabase
// ============================================

import type {
  TeamContext,
  GamePhase,
  BlockHeight,
  Position,
  FieldZone,
} from '@/types';

// --- Contextos de equipo ---

export const TEAM_CONTEXTS: TeamContext[] = [
  {
    id: 'ctx-1',
    name: 'Equipo dominador con balón',
    description: 'Posesión como herramienta principal. Dominio territorial mediante el control del balón.',
    position: 1,
    is_default: true,
    archived: false,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: 'ctx-2',
    name: 'Equipo dominador en transición',
    description: 'Fortaleza en los momentos de cambio de posesión. Velocidad y verticalidad como identidad.',
    position: 2,
    is_default: true,
    archived: false,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: 'ctx-3',
    name: 'Equipo equilibrado',
    description: 'Sin una vía dominante clara. Capacidad de adaptación según el rival y el momento.',
    position: 3,
    is_default: true,
    archived: false,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: 'ctx-4',
    name: 'Equipo de supervivencia',
    description: 'Prioridad en no recibir. Eficacia máxima con poca posesión.',
    position: 4,
    is_default: true,
    archived: false,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
];

// --- Fases del juego ---

export const GAME_PHASES: GamePhase[] = [
  { id: 'phase-1', name: 'Fase ofensiva', position: 1 },
  { id: 'phase-2', name: 'Fase defensiva', position: 2 },
  { id: 'phase-3', name: 'Transición ofensiva', position: 3 },
  { id: 'phase-4', name: 'Transición defensiva', position: 4 },
  { id: 'phase-5', name: 'ABP', position: 5 },
];

// --- Alturas de bloque ---

export const BLOCK_HEIGHTS: BlockHeight[] = [
  { id: 'block-1', name: 'Bloque alto', position: 1 },
  { id: 'block-2', name: 'Bloque medio', position: 2 },
  { id: 'block-3', name: 'Bloque bajo', position: 3 },
];

// --- Posiciones ---

export const POSITIONS: Position[] = [
  { id: 'pos-1', name: 'Portera', abbreviation: 'PT', position: 1 },
  { id: 'pos-2', name: 'Central', abbreviation: 'CT', position: 2 },
  { id: 'pos-3', name: 'Central lateral', abbreviation: 'CL', position: 3 },
  { id: 'pos-4', name: 'Central central', abbreviation: 'CC', position: 4 },
  { id: 'pos-5', name: 'Lateral', abbreviation: 'LT', position: 5 },
  { id: 'pos-6', name: 'Carrilera', abbreviation: 'Ca', position: 6 },
  { id: 'pos-7', name: 'Extremo', abbreviation: 'EX', position: 7 },
  { id: 'pos-8', name: 'Mediocentro', abbreviation: 'MC', position: 8 },
  { id: 'pos-9', name: 'Interior', abbreviation: 'IN', position: 9 },
  { id: 'pos-10', name: 'Mediapunta', abbreviation: 'MP', position: 10 },
  { id: 'pos-11', name: 'Delantera', abbreviation: 'DC', position: 11 },
  { id: 'pos-12', name: 'Doblepunta', abbreviation: 'DP', position: 12 },
];

// --- Zonas del campo ---

export const FIELD_ZONES: FieldZone[] = [
  {
    id: 'zone-1',
    name: 'Z1',
    description: 'Zona de inicio / Zona de protección',
    position: 1,
  },
  {
    id: 'zone-2',
    name: 'Z2',
    description: 'Zona de creación / Zona de destrucción',
    position: 2,
  },
  {
    id: 'zone-3',
    name: 'Z3',
    description: 'Zona de finalización / Zona de orientación',
    position: 3,
  },
];
