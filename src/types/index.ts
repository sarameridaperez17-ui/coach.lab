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
  block_height_id: string | null;
  field_zone_id: string | null;
  youtube_url: string | null;
  position: number;
  archived: boolean;
  created_at: string;
  updated_at: string;
  // Relaciones cargadas
  game_phase?: GamePhase;
  field_zone?: FieldZone;
  principle_contexts?: PrincipleContext[];
  sub_principles?: SubPrinciple[];
  team_contexts?: TeamContext[];
}

export interface SubPrinciple {
  id: string;
  name: string;
  description: string;
  principle_id: string;
  youtube_url: string | null;
  position: number;
  archived: boolean;
  created_at: string;
  updated_at: string;
  // Relaciones cargadas
  principle?: Principle;
  behaviors?: Behavior[];
}

export type BehaviorType = 'individual' | 'relations' | 'collective';

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
  youtube_url: string | null;
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
  youtube_url: string | null;
  position: number;
  archived: boolean;
  created_at: string;
  updated_at: string;
  // Relaciones cargadas
  field_zone?: FieldZone;
  game_phase?: GamePhase;
}

// --- Equipo: Plantillas y Seguimiento de jugadoras ---

export type DominantFoot = "diestra" | "zurda" | "ambidiestra" | "";

export interface Player {
  id: string;
  full_name: string;
  birth_date: string | null; // YYYY-MM-DD
  position_id: string | null;
  dominant_foot: DominantFoot;
  photo_url: string | null;
  club: string;
  squad_number: number | null;
  height_cm: number | null;
  nationality: string;
  notes: string;
  archived: boolean;
  created_at: string;
  updated_at: string;
  // Relaciones cargadas
  position?: Position;
}

export type CallUpStatus = "seguimiento" | "pendiente" | "convocada" | "no_convocada";

export interface PlayerReport {
  id: string;
  player_id: string;
  report_date: string; // YYYY-MM-DD
  category: string;
  club: string;
  minutes_played: number | null;
  positions_played: string;
  rating: number | null;
  performance_notes: string;
  call_up_status: CallUpStatus;
  tournament: string;
  archived: boolean;
  created_at: string;
  updated_at: string;
}

// --- Glosario ---

export interface GlossaryTerm {
  id: string;
  term: string;
  definition: string;
  behavior_tags: string;
  moment_tags: string;
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
  rules: string; // "Normas de provocación"
  dimensions: string;
  num_players: string;
  duration_minutes: number;
  variants: string;
  objective: string;
  guidelines: string; // "Consignas"
  observations: string;
  image_url: string | null;
  content_type: ContentType[];
  youtube_url: string | null;
  // Variante de otra tarea — misma ficha, se muestran juntas en la
  // biblioteca pero se buscan/filtran de forma independiente.
  parent_task_id: string | null;
  archived: boolean;
  created_at: string;
  updated_at: string;
  // Relaciones cargadas
  principles?: Principle[];
  sub_principles?: SubPrinciple[];
  game_phases?: GamePhase[];
  positions?: Position[];
  field_zones?: FieldZone[];
  tags?: TaskTagValue[];
}

// Etiquetas de tareas — categorías fijas, valores configurables a mano
// desde el botón "Configuración" en Nueva tarea.
export type TaskTagCategory =
  | "tipo_tarea"
  | "situacion_juego"
  | "zona"
  | "fase_juego"
  | "momento_juego"
  | "principios_tacticos";

export interface TaskTagValue {
  id: string;
  category: TaskTagCategory;
  label: string;
  position: number;
  // Solo relevante para "momento_juego" y "principios_tacticos": apunta al
  // id del valor de "fase_juego" al que pertenece. "Fase del juego" es la
  // categoría matriz — sus valores no tienen parent_id.
  parent_id: string | null;
  archived: boolean;
  created_at: string;
  updated_at: string;
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

// --- Planificación ---

export type PlanningEventType = 'training' | 'gym' | 'match' | 'rest' | 'travel' | 'other';

export interface PlanningEvent {
  id: string;
  title: string;
  type: PlanningEventType;
  notes: string;
  date: string; // YYYY-MM-DD — fecha del evento, o fecha de inicio si es recurrente
  start_time: string | null; // HH:MM — vacío = evento de todo el día
  end_time: string | null;
  is_recurring: boolean;
  recurrence_days: number[] | null; // 0=lunes ... 6=domingo
  recurrence_until: string | null; // YYYY-MM-DD, null = sin fecha de fin
  excluded_dates: string[]; // fechas puntuales excluidas de una serie recurrente
  archived: boolean;
  created_at: string;
  updated_at: string;
}

// --- Sistemas de juego ---

export interface GameSystem {
  id: string;
  name: string;
  description: string;
  strong_spaces: string;
  weak_spaces: string;
  game_phase_id: string | null;
  archived: boolean;
  created_at: string;
  updated_at: string;
  // Relaciones cargadas
  positions?: GameSystemPosition[];
  variants?: GameSystemVariant[];
}

export interface GameSystemPosition {
  id: string;
  game_system_id: string;
  player_index: number;
  label: string;
  x: number;
  y: number;
}

export interface GameSystemVariant {
  id: string;
  game_system_id: string;
  name: string;
  description: string;
  created_at: string;
}

// --- ABP (Acciones a Balón Parado) ---

export type ABPType = 'offensive' | 'defensive';

export interface ABPStrategy {
  id: string;
  abp_type: ABPType;
  subtype: string;
  title: string;
  description: string;
  key_points: string;
  image_url: string;
  execution_type: string;
  target_zone: string;
  structure_type: string;
  protection_zone: string;
  is_favorite: boolean;
  archived: boolean;
  created_at: string;
  updated_at: string;
}

// --- Diagramas tácticos ---

export interface TacticalDiagram {
  id: string;
  entity_type: string;
  entity_id: string;
  title: string;
  board_state: Record<string, unknown>;
  position: number;
  created_at: string;
  updated_at: string;
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

// --- Sesiones ---

export type SessionStatus = "planificada" | "realizada" | "plantilla";
export type SessionPart = "inicial" | "principal" | "final";

export interface SessionTeam {
  id: string;
  name: string;
  color: string; // clase Tailwind, ej. "bg-sky-500"
  player_ids: string[];
}

export interface Session {
  id: string;
  name: string;
  session_date: string | null; // YYYY-MM-DD
  start_time: string | null; // HH:MM — la hora de fin se calcula, no se guarda
  match_day: string; // "+1 MD", "-3 MD", "MD"... o "" si no se ha definido
  status: SessionStatus;
  team_label: string;
  objective: string;
  notes: string;
  favorite: boolean;
  squad_player_ids: string[]; // convocatoria de la sesión
  archived: boolean;
  created_at: string;
  updated_at: string;
  // Relaciones cargadas
  session_tasks?: SessionTask[];
}

export interface SessionTask {
  id: string;
  session_id: string;
  task_id: string;
  part: SessionPart;
  position: number;
  // Duración de la tarea solo para esta sesión — independiente de
  // "duration_minutes" en la tarea maestra, editable al colocarla aquí.
  duration_minutes: number | null;
  teams: SessionTeam[];
  wildcards_inside: string[];
  wildcards_outside: string[];
  created_at: string;
  // Relación cargada
  task?: Task;
}
