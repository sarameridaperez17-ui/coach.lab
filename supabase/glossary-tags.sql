-- ============================================
-- coach.lab — Migración: Etiquetas del Diccionario Táctico
-- Ejecutar en Supabase SQL Editor
-- ============================================

-- 1. Etiquetas de comportamiento (multi-select, almacenado como texto separado por comas)
ALTER TABLE glossary_terms
ADD COLUMN IF NOT EXISTS behavior_tags TEXT DEFAULT '';

-- 2. Etiquetas de momento / fase de juego (multi-select, almacenado como texto separado por comas)
ALTER TABLE glossary_terms
ADD COLUMN IF NOT EXISTS moment_tags TEXT DEFAULT '';

-- Verificación
SELECT 'Migración etiquetas diccionario completada' AS resultado;
