-- ============================================
-- coach.lab — Migración: Tablero Táctico (diagramas)
-- Ejecutar en Supabase SQL Editor
-- ============================================

-- Tabla para almacenar diagramas tácticos (compartida entre ABP, Tareas, etc.)
CREATE TABLE IF NOT EXISTS tactical_diagrams (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_type TEXT NOT NULL, -- 'abp_strategy', 'task', 'game_system', 'note'
  entity_id UUID NOT NULL,
  title TEXT DEFAULT '',
  board_state JSONB NOT NULL DEFAULT '{}',
  position INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Índice para buscar diagramas por entidad
CREATE INDEX IF NOT EXISTS idx_tactical_diagrams_entity
  ON tactical_diagrams(entity_type, entity_id);

-- RLS
ALTER TABLE tactical_diagrams ENABLE ROW LEVEL SECURITY;

-- Política de acceso público (misma lógica que el resto de tablas)
DROP POLICY IF EXISTS "tactical_diagrams_all" ON tactical_diagrams;
CREATE POLICY "tactical_diagrams_all" ON tactical_diagrams
  FOR ALL USING (true) WITH CHECK (true);

-- Verificación
SELECT 'Migración tablero táctico completada' AS resultado;
