-- ============================================
-- coach.lab — Migración: Plantillas de posición por sistema/fase/bloque
-- Ejecutar en Supabase SQL Editor
-- ============================================
-- Guarda, por cada combinación (sistema, fase, altura de bloque), la
-- posición exacta de las 11 jugadoras que sustituye a la generación
-- automática en "Enfrentar sistemas". No está ligado a ningún equipo
-- (propio/rival) ni a ninguna "situación" guardada: es configuración
-- de base, en orientación "propia" (ataca hacia la derecha), y se
-- espeja automáticamente cuando el sistema se usa como rival.

CREATE TABLE IF NOT EXISTS formation_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  formation TEXT NOT NULL,
  posture TEXT NOT NULL, -- 'attack' | 'defense'
  block_height TEXT NOT NULL, -- 'alto' | 'medio' | 'bajo'
  players JSONB NOT NULL, -- [{ number, x, y }, ...] x11
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE (formation, posture, block_height)
);

CREATE INDEX IF NOT EXISTS idx_formation_templates_lookup
  ON formation_templates(formation, posture, block_height);

-- RLS
ALTER TABLE formation_templates ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "formation_templates_all" ON formation_templates;
CREATE POLICY "formation_templates_all" ON formation_templates
  FOR ALL USING (true) WITH CHECK (true);

-- Verificación
SELECT 'Migración formation_templates completada' AS resultado;
