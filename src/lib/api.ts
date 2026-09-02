import { supabase } from "./supabase";
import type {
  TeamContext,
  GamePhase,
  BlockHeight,
  Principle,
  SubPrinciple,
  Behavior,
  BehaviorType,
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
