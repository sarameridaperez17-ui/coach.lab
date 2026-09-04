-- ============================================
-- coach.lab — Migración: ABP v2 (imagen, etiquetas, favoritos)
-- Ejecutar en Supabase SQL Editor
-- ============================================

-- 1. Imagen de estrategia (URL de archivo subido)
ALTER TABLE abp_strategies
ADD COLUMN IF NOT EXISTS image_url TEXT DEFAULT '';

-- 2. Ejecución (ofensivas): Directo, Corto, Combinado
ALTER TABLE abp_strategies
ADD COLUMN IF NOT EXISTS execution_type TEXT DEFAULT '';

-- 3. Zona objetivo (ofensivas): 1º Palo, 2º Palo, Zona central, etc.
ALTER TABLE abp_strategies
ADD COLUMN IF NOT EXISTS target_zone TEXT DEFAULT '';

-- 4. Estructura (defensivas): Zonal, Individual, Mixta
ALTER TABLE abp_strategies
ADD COLUMN IF NOT EXISTS structure_type TEXT DEFAULT '';

-- 5. Zona de protección (defensivas)
ALTER TABLE abp_strategies
ADD COLUMN IF NOT EXISTS protection_zone TEXT DEFAULT '';

-- 6. Favorito
ALTER TABLE abp_strategies
ADD COLUMN IF NOT EXISTS is_favorite BOOLEAN DEFAULT false;

-- Verificación
SELECT 'Migración ABP v2 completada' AS resultado;
