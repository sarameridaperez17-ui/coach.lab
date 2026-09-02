-- ============================================
-- coach.lab — Tablas para Sistemas de Juego y ABP
-- Ejecutar en Supabase SQL Editor
-- ============================================

-- ========== SISTEMAS DE JUEGO ==========

CREATE TABLE IF NOT EXISTS game_systems (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,                         -- ej: "1-4-3-3", "1-4-4-2"
  description TEXT DEFAULT '',
  game_phase_id UUID REFERENCES game_phases(id),  -- fase asociada (opcional)
  archived BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Posiciones de jugadoras dentro de un sistema (11 filas por sistema)
CREATE TABLE IF NOT EXISTS game_system_positions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  game_system_id UUID NOT NULL REFERENCES game_systems(id) ON DELETE CASCADE,
  player_index INT NOT NULL,                  -- 1-11
  label TEXT NOT NULL DEFAULT '',              -- ej: "PT", "MC", "EX"
  x DOUBLE PRECISION NOT NULL DEFAULT 50,     -- posición X (0-100)
  y DOUBLE PRECISION NOT NULL DEFAULT 50,     -- posición Y (0-100)
  UNIQUE(game_system_id, player_index)
);

-- Variantes de un sistema
CREATE TABLE IF NOT EXISTS game_system_variants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  game_system_id UUID NOT NULL REFERENCES game_systems(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ========== ACCIONES A BALÓN PARADO ==========

CREATE TABLE IF NOT EXISTS abp_strategies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  abp_type TEXT NOT NULL CHECK (abp_type IN ('offensive', 'defensive')),
  subtype TEXT NOT NULL,                      -- ej: "corner", "falta-lateral"
  title TEXT NOT NULL,
  description TEXT DEFAULT '',
  key_points TEXT DEFAULT '',                 -- puntos clave separados por línea
  archived BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- ========== DISABLE RLS ==========

ALTER TABLE game_systems DISABLE ROW LEVEL SECURITY;
ALTER TABLE game_system_positions DISABLE ROW LEVEL SECURITY;
ALTER TABLE game_system_variants DISABLE ROW LEVEL SECURITY;
ALTER TABLE abp_strategies DISABLE ROW LEVEL SECURITY;

-- ========== TRIGGERS updated_at ==========

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ language 'plpgsql';

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'set_updated_at_game_systems') THEN
    CREATE TRIGGER set_updated_at_game_systems
      BEFORE UPDATE ON game_systems
      FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'set_updated_at_abp_strategies') THEN
    CREATE TRIGGER set_updated_at_abp_strategies
      BEFORE UPDATE ON abp_strategies
      FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
  END IF;
END $$;
