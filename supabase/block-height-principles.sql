-- ============================================
-- coach.lab — Migración: Block height en principios + renombrar tipos de comportamiento
-- Ejecutar en Supabase SQL Editor ANTES de desplegar v14
-- ============================================

-- 1. Añadir block_height_id a la tabla principles (nullable FK)
ALTER TABLE principles
ADD COLUMN IF NOT EXISTS block_height_id UUID REFERENCES block_heights(id) ON DELETE SET NULL;

-- 2. Añadir block_height_id a la tabla sub_principles (nullable FK)
ALTER TABLE sub_principles
ADD COLUMN IF NOT EXISTS block_height_id UUID REFERENCES block_heights(id) ON DELETE SET NULL;

-- 3. Eliminar la CHECK constraint antigua de behaviors.type
--    (El nombre del constraint puede variar; esto cubre ambos casos)
ALTER TABLE behaviors DROP CONSTRAINT IF EXISTS behaviors_type_check;
ALTER TABLE behaviors DROP CONSTRAINT IF EXISTS behaviors_check;

-- 4. Crear nueva CHECK constraint con 'relations' en lugar de 'by_line'
ALTER TABLE behaviors ADD CONSTRAINT behaviors_type_check
  CHECK (type IN ('collective', 'relations', 'individual'));

-- 5. Renombrar datos existentes: 'by_line' → 'relations'
UPDATE behaviors
SET type = 'relations'
WHERE type = 'by_line';

-- 6. Índices para búsquedas rápidas por block_height_id
CREATE INDEX IF NOT EXISTS idx_principles_block_height ON principles(block_height_id);
CREATE INDEX IF NOT EXISTS idx_sub_principles_block_height ON sub_principles(block_height_id);

-- Verificación
SELECT 'Migración completada' AS resultado,
       (SELECT count(*) FROM behaviors WHERE type = 'relations') AS behaviors_renombrados,
       (SELECT count(*) FROM behaviors WHERE type = 'by_line') AS behaviors_pendientes;
