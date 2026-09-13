-- ============================================
-- coach.lab — Migración: Principios ↔ Zona del campo
-- ============================================
-- Añade la relación FASE → ZONA → PRINCIPIO que pide el rediseño de
-- "Modelo de juego". Aditiva: no borra ni reescribe nada existente,
-- solo añade la columna (por defecto sin asignar) y sitúa el único
-- principio que la propia especificación usa como ejemplo real
-- ("Amenazar espalda" -> Zona 3, Progresión).

ALTER TABLE principles ADD COLUMN IF NOT EXISTS field_zone_id UUID REFERENCES field_zones(id);

UPDATE principles
SET field_zone_id = (SELECT id FROM field_zones WHERE name = 'Z3')
WHERE name = 'AMENAZAR ESPALDA'
  AND game_phase_id = (SELECT id FROM game_phases WHERE name = 'Fase ofensiva');

-- Verificación
SELECT p.name, fz.name AS zona FROM principles p LEFT JOIN field_zones fz ON fz.id = p.field_zone_id WHERE p.field_zone_id IS NOT NULL;
