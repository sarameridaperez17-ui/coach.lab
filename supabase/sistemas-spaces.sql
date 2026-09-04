-- ============================================
-- coach.lab — Migración: Espacios fuertes/débiles en sistemas de juego
-- Ejecutar en Supabase SQL Editor ANTES de desplegar v16
-- ============================================

-- 1. Añadir strong_spaces a game_systems
ALTER TABLE game_systems
ADD COLUMN IF NOT EXISTS strong_spaces TEXT DEFAULT '';

-- 2. Añadir weak_spaces a game_systems
ALTER TABLE game_systems
ADD COLUMN IF NOT EXISTS weak_spaces TEXT DEFAULT '';

-- Verificación
SELECT 'Migración sistemas-spaces completada' AS resultado;
