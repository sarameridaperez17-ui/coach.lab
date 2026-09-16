-- ============================================
-- coach.lab — Migración: varios comportamientos por zona en Posiciones
-- ============================================
-- Antes solo se podía guardar UN comportamiento clave por posición + zona +
-- fase + contexto, porque una restricción UNIQUE lo impedía. Esto la elimina
-- (no borra ningún dato existente, solo permite añadir más filas) y añade:
--   - "archived" para poder borrar un comportamiento de forma reversible,
--     igual que el resto de la app (principios, tareas, etc.).
--   - "position" para poder ordenar varios comportamientos dentro de la
--     misma zona.

DO $$
DECLARE
  cname TEXT;
BEGIN
  SELECT conname INTO cname
  FROM pg_constraint
  WHERE conrelid = 'position_behaviors'::regclass AND contype = 'u';
  IF cname IS NOT NULL THEN
    EXECUTE format('ALTER TABLE position_behaviors DROP CONSTRAINT %I', cname);
  END IF;
END $$;

ALTER TABLE position_behaviors ADD COLUMN IF NOT EXISTS archived BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE position_behaviors ADD COLUMN IF NOT EXISTS position INTEGER NOT NULL DEFAULT 0;

-- Verificación
SELECT conname, contype FROM pg_constraint WHERE conrelid = 'position_behaviors'::regclass;
SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'position_behaviors' ORDER BY ordinal_position;
