-- ============================================
-- coach.lab — Migración: zonas pintadas en "Enfrentar sistemas"
-- Ejecutar en Supabase SQL Editor
-- ============================================

ALTER TABLE system_clashes
  ADD COLUMN IF NOT EXISTS zones JSONB NOT NULL DEFAULT '[]'::jsonb;

SELECT 'Migración system_clashes.zones completada' AS resultado;
