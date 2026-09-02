// ============================================
// coach.lab — Tipos de datos del MVP
// ============================================

// --- Modelo de juego ---

export interface TeamContext {
  id: string;
  name: string;
  description: string;
  position: number;
  is_default: boolean;
  archived: boolean;
  created_at: string;
  updated_at: string;
}

export interface GamePhase {
  id: string;
  name: string;
  position: number;
}

export interface BlockHeight {
  id: string;
  name: string;
  position: number;
}

export interface PrincipleContext {
  team_context_id: string;
}

export interface Principle {
  id: string;
  name: string;
  description: string;
  game_phase_id: string;
  position: number;
  archived: boolean;
  created_at: string;
  updated_at: string;
  // Relaciones cargadas
  game_phase?: GamePhase;
  principle_contexts?: PrincipleContext[];
  sub_principles?: SubPrinciple[];
  team_contexts?: TeamContext[];
}

export interface SubPrinciple {
  id: string;
  name: string;
  description: string;
  principle_id: string;
  position: number;
  archived: boolean;
  created_at: string;
  updated_at: string;
  // Relaciones cargadas
  principle?: Principle;
  behaviors?: Behavior[];
}

export type BehaviorType = 'collective' | 'by_line' | 'individual';

export interface BehaviorBlockHeight {
  block_height_id: string;
}

export interface BehaviorContext {
  team_context_id: string;
}

export interface Behavior {
  id: string;
  name: string;
  description: string;
  type: BehaviorType;
  sub_principle_id: string;
  position: number;
  archived: boolean;
  created_at: string;
  updated_at: string;
  // Relaciones cargadas
  sub_principle?: SubPrinciple;
  behavior_contexts?: BehaviorContext[];
  behavior_block_heights?: BehaviorBlockHeight[];
  team_contexts?: TeamContext[];
  block_heights?: BlockHeight[];
}

// --- Perfiles de posición ---

export interface Position {
  id: string;
  name: string;
  abbreviation: string;
  position: number;
}

export interface FieldZone {
  id: string;
  name: string;
  description: string;
  position: number;
}

export interface PositionBehavior {
  id: string;
  position_id: string;
  field_zone_id: string;
  game_phase_id: string;
  team_context_id: string;
  title: string;
  details: string;
  created_at: string;
  updated_at: string;
  // Relaciones cargadas
  field_zone?: FieldZone;
  game_phase?: GamePhase;
}

// --- Glosario ---

export interface GlossaryTerm {
  id: string;
  term: string;
  definition: string;
  archived: boolean;
  created_at: string;
  updated_at: string;
}

export type LinkableEntityType =
  | 'principle'
  | 'sub_principle'
  | 'behavior'
  | 'task'
  | 'tactical_concept';

export interface GlossaryLink {
  id: string;
  glossary_term_id: string;
  entity_type: LinkableEntityType;
  entity_id: string;
}

// --- Conceptos tácticos ---

export interface TacticalConcept {
  id: string;
  name: string;
  definition: string;
  archived: boolean;
  created_at: string;
  updated_at: string;
}

// --- Tareas de entrenamiento ---

export type ContentType = 'tactical' | 'technical' | 'physical' | 'psychological';

export interface Task {
  id: string;
  name: string;
  description: string;
  rules: string;
  dimensions: string;
  num_players: string;
  duration_minutes: number;
  variants: string;
  content_type: ContentType[];
  youtube_url: string | null;
  archived: boolean;
  created_at: string;
  updated_at: string;
  // Relaciones cargadas
  principles?: Principle[];
  sub_principles?: SubPrinciple[];
  game_phases?: GamePhase[];
  positions?: Position[];
  field_zones?: FieldZone[];
}

// --- Notas ---

export type NoteType = 'free' | 'post_session' | 'post_match';

export type TagType =
  | 'principle'
  | 'sub_principle'
  | 'game_phase'
  | 'position'
  | 'team_context'
  | 'tactical_concept'
  | 'field_zone'
  | 'block_height'
  | 'content_type';

export interface NoteTag {
  id: string;
  note_id: string;
  tag_type: TagType;
  tag_entity_id: string | null;
  tag_label: string;
}

export interface Note {
  id: string;
  title: string;
  content: string;
  note_type: NoteType;
  archived: boolean;
  created_at: string;
  updated_at: string;
  // Relaciones cargadas
  tags?: NoteTag[];
}

// --- Multimedia ---

export type AttachmentFileType = 'image' | 'diagram' | 'pdf' | 'video';

export interface Attachment {
  id: string;
  file_name: string;
  file_url: string;
  file_type: AttachmentFileType;
  entity_type: string;
  entity_id: string;
  created_at: string;
}
