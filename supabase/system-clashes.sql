-- ============================================
-- coach.lab — Migración: Situaciones guardadas de "Enfrentar sistemas"
-- Ejecutar en Supabase SQL Editor
-- ============================================

CREATE TABLE IF NOT EXISTS system_clashes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  notes TEXT DEFAULT '',
  own_attack TEXT NOT NULL,
  own_defense TEXT NOT NULL,
  rival_attack TEXT NOT NULL,
  rival_defense TEXT NOT NULL,
  matchup TEXT NOT NULL, -- 'own-attack' | 'rival-attack'
  own_block_height TEXT NOT NULL,
  rival_block_height TEXT NOT NULL,
  own_fill_color TEXT NOT NULL DEFAULT '#2563eb',
  own_text_color TEXT NOT NULL DEFAULT '#ffffff',
  rival_fill_color TEXT NOT NULL DEFAULT '#e11d48',
  rival_text_color TEXT NOT NULL DEFAULT '#ffffff',
  own_players JSONB NOT NULL,
  rival_players JSONB NOT NULL,
  archived BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_system_clashes_archived ON system_clashes(archived);

-- RLS
ALTER TABLE system_clashes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "system_clashes_all" ON system_clashes;
CREATE POLICY "system_clashes_all" ON system_clashes
  FOR ALL USING (true) WITH CHECK (true);

-- Verificación
SELECT 'Migración system_clashes completada' AS resultado;
