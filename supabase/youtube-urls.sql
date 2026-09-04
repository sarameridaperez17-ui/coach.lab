-- ============================================
-- coach.lab — Migración: YouTube URLs en principios, subprincipios y comportamientos
-- Ejecutar en Supabase SQL Editor ANTES de desplegar v15
-- ============================================

-- 1. Añadir youtube_url a principles
ALTER TABLE principles
ADD COLUMN IF NOT EXISTS youtube_url TEXT;

-- 2. Añadir youtube_url a sub_principles
ALTER TABLE sub_principles
ADD COLUMN IF NOT EXISTS youtube_url TEXT;

-- 3. Añadir youtube_url a behaviors
ALTER TABLE behaviors
ADD COLUMN IF NOT EXISTS youtube_url TEXT;

-- Verificación
SELECT 'Migración YouTube completada' AS resultado;
