import { supabase } from "./supabase";
import type {
  TeamContext,
  GamePhase,
  BlockHeight,
  Principle,
  SubPrinciple,
  Behavior,
  BehaviorType,
  TacticalConcept,
  GlossaryTerm,
  Note,
  NoteType,
  Position,
  FieldZone,
  PositionBehavior,
  Task,
  ContentType,
  GameSystem,
  GameSystemPosition,
  GameSystemVariant,
  ABPStrategy,
  ABPType,
} from "@/types";

// ============================================
// DATOS BASE (read-only, cargados una vez)
// ============================================

export async function getTeamContexts(): Promise<TeamContext[]> {
  const { data, error } = await supabase
    .from("team_contexts")
    .select("*")
    .eq("archived", false)
    .order("position");
  if (error) throw error;
  return data ?? [];
}

export async function getGamePhases(): Promise<GamePhase[]> {
  const { data, error } = await supabase
    .from("game_phases")
    .select("*")
    .order("position");
  if (error) throw error;
  return data ?? [];
}

export async function getBlockHeights(): Promise<BlockHeight[]> {
  const { data, error } = await supabase
    .from("block_heights")
    .select("*")
    .order("position");
  if (error) throw error;
  return data ?? [];
}

// ============================================
// PRINCIPIOS
// ============================================

export async function getPrinciples(gamePhaseId: string): Promise<Principle[]> {
  const { data, error } = await supabase
    .from("principles")
    .select(`
      *,
      principle_contexts(team_context_id),
      sub_principles(
        *,
        behaviors(
          *,
          behavior_contexts(team_context_id),
          behavior_block_heights(block_height_id)
        )
      )
    `)
    .eq("game_phase_id", gamePhaseId)
    .eq("archived", false)
    .order("position");
  if (error) throw error;
  return data ?? [];
}

export async function createPrinciple(
  name: string,
  gamePhaseId: string,
  contextIds: string[]
): Promise<Principle> {
  // Obtener posición máxima
  const { data: existing } = await supabase
    .from("principles")
    .select("position")
    .eq("game_phase_id", gamePhaseId)
    .order("position", { ascending: false })
    .limit(1);
  const nextPos = existing && existing.length > 0 ? existing[0].position + 1 : 0;

  const { data, error } = await supabase
    .from("principles")
    .insert({ name, game_phase_id: gamePhaseId, position: nextPos })
    .select()
    .single();
  if (error) throw error;

  // Vincular contextos
  if (contextIds.length > 0) {
    const links = contextIds.map((cid) => ({
      principle_id: data.id,
      team_context_id: cid,
    }));
    await supabase.from("principle_contexts").insert(links);
  }

  return data;
}

export async function updatePrinciple(
  id: string,
  updates: { name?: string; description?: string }
): Promise<void> {
  const { error } = await supabase.from("principles").update(updates).eq("id", id);
  if (error) throw error;
}

export async function deletePrinciple(id: string): Promise<void> {
  const { error } = await supabase
    .from("principles")
    .update({ archived: true })
    .eq("id", id);
  if (error) throw error;
}

// ============================================
// SUBPRINCIPIOS
// ============================================

export async function createSubPrinciple(
  name: string,
  principleId: string
): Promise<SubPrinciple> {
  const { data: existing } = await supabase
    .from("sub_principles")
    .select("position")
    .eq("principle_id", principleId)
    .order("position", { ascending: false })
    .limit(1);
  const nextPos = existing && existing.length > 0 ? existing[0].position + 1 : 0;

  const { data, error } = await supabase
    .from("sub_principles")
    .insert({ name, principle_id: principleId, position: nextPos })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function updateSubPrinciple(
  id: string,
  updates: { name?: string; description?: string }
): Promise<void> {
  const { error } = await supabase.from("sub_principles").update(updates).eq("id", id);
  if (error) throw error;
}

export async function deleteSubPrinciple(id: string): Promise<void> {
  const { error } = await supabase
    .from("sub_principles")
    .update({ archived: true })
    .eq("id", id);
  if (error) throw error;
}

// ============================================
// COMPORTAMIENTOS
// ============================================

export async function createBehavior(
  name: string,
  type: BehaviorType,
  subPrincipleId: string
): Promise<Behavior> {
  const { data: existing } = await supabase
    .from("behaviors")
    .select("position")
    .eq("sub_principle_id", subPrincipleId)
    .order("position", { ascending: false })
    .limit(1);
  const nextPos = existing && existing.length > 0 ? existing[0].position + 1 : 0;

  const { data, error } = await supabase
    .from("behaviors")
    .insert({
      name,
      type,
      sub_principle_id: subPrincipleId,
      position: nextPos,
    })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function updateBehavior(
  id: string,
  updates: { name?: string; description?: string; type?: BehaviorType }
): Promise<void> {
  const { error } = await supabase.from("behaviors").update(updates).eq("id", id);
  if (error) throw error;
}

export async function deleteBehavior(id: string): Promise<void> {
  const { error } = await supabase
    .from("behaviors")
    .update({ archived: true })
    .eq("id", id);
  if (error) throw error;
}

// ============================================
// CONCEPTOS TÁCTICOS
// ============================================

export async function getTacticalConcepts(): Promise<TacticalConcept[]> {
  const { data, error } = await supabase
    .from("tactical_concepts")
    .select("*")
    .eq("archived", false)
    .order("name");
  if (error) throw error;
  return data ?? [];
}

export async function createTacticalConcept(
  name: string,
  definition: string
): Promise<TacticalConcept> {
  const { data, error } = await supabase
    .from("tactical_concepts")
    .insert({ name, definition })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function updateTacticalConcept(
  id: string,
  updates: { name?: string; definition?: string }
): Promise<void> {
  const { error } = await supabase.from("tactical_concepts").update(updates).eq("id", id);
  if (error) throw error;
}

export async function deleteTacticalConcept(id: string): Promise<void> {
  const { error } = await supabase
    .from("tactical_concepts")
    .update({ archived: true })
    .eq("id", id);
  if (error) throw error;
}

// ============================================
// GLOSARIO
// ============================================

export async function getGlossaryTerms(): Promise<GlossaryTerm[]> {
  const { data, error } = await supabase
    .from("glossary_terms")
    .select("*")
    .eq("archived", false)
    .order("term");
  if (error) throw error;
  return data ?? [];
}

export async function createGlossaryTerm(
  term: string,
  definition: string
): Promise<GlossaryTerm> {
  const { data, error } = await supabase
    .from("glossary_terms")
    .insert({ term, definition })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function updateGlossaryTerm(
  id: string,
  updates: { term?: string; definition?: string }
): Promise<void> {
  const { error } = await supabase.from("glossary_terms").update(updates).eq("id", id);
  if (error) throw error;
}

export async function deleteGlossaryTerm(id: string): Promise<void> {
  const { error } = await supabase
    .from("glossary_terms")
    .update({ archived: true })
    .eq("id", id);
  if (error) throw error;
}

// ============================================
// NOTAS
// ============================================

export async function getNotes(): Promise<Note[]> {
  const { data, error } = await supabase
    .from("notes")
    .select("*, note_tags(*)")
    .eq("archived", false)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data ?? [];
}

export async function createNote(
  title: string,
  content: string,
  noteType: NoteType
): Promise<Note> {
  const { data, error } = await supabase
    .from("notes")
    .insert({ title, content, note_type: noteType })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function updateNote(
  id: string,
  updates: { title?: string; content?: string; note_type?: NoteType }
): Promise<void> {
  const { error } = await supabase.from("notes").update(updates).eq("id", id);
  if (error) throw error;
}

export async function deleteNote(id: string): Promise<void> {
  const { error } = await supabase
    .from("notes")
    .update({ archived: true })
    .eq("id", id);
  if (error) throw error;
}

// ============================================
// POSICIONES
// ============================================

export async function getPositions(): Promise<Position[]> {
  const { data, error } = await supabase
    .from("positions")
    .select("*")
    .order("position");
  if (error) throw error;
  return data ?? [];
}

export async function getFieldZones(): Promise<FieldZone[]> {
  const { data, error } = await supabase
    .from("field_zones")
    .select("*")
    .order("position");
  if (error) throw error;
  return data ?? [];
}

export async function getPositionBehaviors(
  positionId: string,
  contextId: string
): Promise<PositionBehavior[]> {
  const { data, error } = await supabase
    .from("position_behaviors")
    .select("*")
    .eq("position_id", positionId)
    .eq("team_context_id", contextId);
  if (error) throw error;
  return data ?? [];
}

export async function upsertPositionBehavior(
  positionId: string,
  fieldZoneId: string,
  gamePhaseId: string,
  contextId: string,
  title: string,
  details: string
): Promise<PositionBehavior> {
  // Buscar existente
  const { data: existing } = await supabase
    .from("position_behaviors")
    .select("id")
    .eq("position_id", positionId)
    .eq("field_zone_id", fieldZoneId)
    .eq("game_phase_id", gamePhaseId)
    .eq("team_context_id", contextId)
    .limit(1);

  if (existing && existing.length > 0) {
    const { data, error } = await supabase
      .from("position_behaviors")
      .update({ title, details })
      .eq("id", existing[0].id)
      .select()
      .single();
    if (error) throw error;
    return data;
  } else {
    const { data, error } = await supabase
      .from("position_behaviors")
      .insert({
        position_id: positionId,
        field_zone_id: fieldZoneId,
        game_phase_id: gamePhaseId,
        team_context_id: contextId,
        title,
        details,
      })
      .select()
      .single();
    if (error) throw error;
    return data;
  }
}

// ============================================
// TAREAS DE ENTRENAMIENTO
// ============================================

export async function getTasks(): Promise<Task[]> {
  const { data, error } = await supabase
    .from("tasks")
    .select(`
      *,
      task_principles(principle_id),
      task_game_phases(game_phase_id)
    `)
    .eq("archived", false)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data ?? [];
}

export async function createTask(task: {
  name: string;
  description: string;
  rules: string;
  dimensions: string;
  num_players: string;
  duration_minutes: number;
  variants: string;
  content_type: ContentType[];
}): Promise<Task> {
  const { data, error } = await supabase
    .from("tasks")
    .insert(task)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function updateTask(
  id: string,
  updates: Partial<{
    name: string;
    description: string;
    rules: string;
    dimensions: string;
    num_players: string;
    duration_minutes: number;
    variants: string;
    content_type: ContentType[];
    youtube_url: string | null;
  }>
): Promise<void> {
  const { error } = await supabase.from("tasks").update(updates).eq("id", id);
  if (error) throw error;
}

export async function deleteTask(id: string): Promise<void> {
  const { error } = await supabase
    .from("tasks")
    .update({ archived: true })
    .eq("id", id);
  if (error) throw error;
}

// ============================================
// SISTEMAS DE JUEGO
// ============================================

export async function getGameSystems(): Promise<GameSystem[]> {
  const { data, error } = await supabase
    .from("game_systems")
    .select(`
      *,
      game_system_positions(*),
      game_system_variants(*)
    `)
    .eq("archived", false)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []).map((s) => ({
    ...s,
    positions: s.game_system_positions,
    variants: s.game_system_variants,
  })) as GameSystem[];
}

export async function createGameSystem(
  name: string,
  description: string,
  players: { player_index: number; label: string; x: number; y: number }[]
): Promise<GameSystem> {
  const { data, error } = await supabase
    .from("game_systems")
    .insert({ name, description })
    .select()
    .single();
  if (error) throw error;

  if (players.length > 0) {
    const rows = players.map((p) => ({
      game_system_id: data.id,
      ...p,
    }));
    await supabase.from("game_system_positions").insert(rows);
  }

  return data;
}

export async function updateGameSystem(
  id: string,
  updates: { name?: string; description?: string }
): Promise<void> {
  const { error } = await supabase.from("game_systems").update(updates).eq("id", id);
  if (error) throw error;
}

export async function deleteGameSystem(id: string): Promise<void> {
  const { error } = await supabase
    .from("game_systems")
    .update({ archived: true })
    .eq("id", id);
  if (error) throw error;
}

export async function saveSystemPositions(
  systemId: string,
  players: { player_index: number; label: string; x: number; y: number }[]
): Promise<void> {
  // Borrar posiciones existentes y reinsertar
  await supabase
    .from("game_system_positions")
    .delete()
    .eq("game_system_id", systemId);

  if (players.length > 0) {
    const rows = players.map((p) => ({
      game_system_id: systemId,
      ...p,
    }));
    const { error } = await supabase.from("game_system_positions").insert(rows);
    if (error) throw error;
  }
}

export async function createSystemVariant(
  systemId: string,
  name: string,
  description: string
): Promise<GameSystemVariant> {
  const { data, error } = await supabase
    .from("game_system_variants")
    .insert({ game_system_id: systemId, name, description })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function deleteSystemVariant(id: string): Promise<void> {
  const { error } = await supabase
    .from("game_system_variants")
    .delete()
    .eq("id", id);
  if (error) throw error;
}

// ============================================
// ABP — ACCIONES A BALÓN PARADO
// ============================================

export async function getABPStrategies(
  abpType: ABPType
): Promise<ABPStrategy[]> {
  const { data, error } = await supabase
    .from("abp_strategies")
    .select("*")
    .eq("abp_type", abpType)
    .eq("archived", false)
    .order("subtype")
    .order("created_at");
  if (error) throw error;
  return data ?? [];
}

export async function createABPStrategy(strategy: {
  abp_type: ABPType;
  subtype: string;
  title: string;
  description: string;
  key_points: string;
}): Promise<ABPStrategy> {
  const { data, error } = await supabase
    .from("abp_strategies")
    .insert(strategy)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function updateABPStrategy(
  id: string,
  updates: { title?: string; description?: string; key_points?: string }
): Promise<void> {
  const { error } = await supabase.from("abp_strategies").update(updates).eq("id", id);
  if (error) throw error;
}

export async function deleteABPStrategy(id: string): Promise<void> {
  const { error } = await supabase
    .from("abp_strategies")
    .update({ archived: true })
    .eq("id", id);
  if (error) throw error;
}

// ============================================
// ESTADÍSTICAS (conteos para Home)
// ============================================

export async function getModelStats(): Promise<{
  principles: number;
  subPrinciples: number;
  tasks: number;
  notes: number;
}> {
  const [pRes, spRes, tRes, nRes] = await Promise.all([
    supabase.from("principles").select("id", { count: "exact", head: true }).eq("archived", false),
    supabase.from("sub_principles").select("id", { count: "exact", head: true }).eq("archived", false),
    supabase.from("tasks").select("id", { count: "exact", head: true }).eq("archived", false),
    supabase.from("notes").select("id", { count: "exact", head: true }).eq("archived", false),
  ]);
  return {
    principles: pRes.count ?? 0,
    subPrinciples: spRes.count ?? 0,
    tasks: tRes.count ?? 0,
    notes: nRes.count ?? 0,
  };
}
