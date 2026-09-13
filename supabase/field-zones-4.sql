-- ============================================
-- coach.lab — Migración: Zonas del campo, de 3 a 4
-- ============================================
-- Añade Z4 y reubica el contenido existente para que no cambie de
-- significado al insertar una zona nueva en medio del esquema:
--   Z3 (cualquier fase)             -> Z4  (antes Finalización/Orientación)
--   Z2 en fases/transiciones defensivas -> Z3  (antes Destrucción)
--   Z1 y Z2 en fases/transiciones ofensivas no se tocan.

-- 1. Crear Z4 si no existe
INSERT INTO field_zones (name, description, position)
SELECT 'Z4', 'Zona de finalización / Zona de orientación', 4
WHERE NOT EXISTS (SELECT 1 FROM field_zones WHERE name = 'Z4');

-- 2. Mover position_behaviors de Z3 (cualquier fase) -> Z4
UPDATE position_behaviors
SET field_zone_id = (SELECT id FROM field_zones WHERE name = 'Z4')
WHERE field_zone_id = (SELECT id FROM field_zones WHERE name = 'Z3');

-- 3. Mover position_behaviors de Z2 en fases defensivas -> Z3
UPDATE position_behaviors
SET field_zone_id = (SELECT id FROM field_zones WHERE name = 'Z3')
WHERE field_zone_id = (SELECT id FROM field_zones WHERE name = 'Z2')
  AND game_phase_id IN (
    SELECT id FROM game_phases WHERE name IN ('Fase defensiva', 'Transición defensiva')
  );

-- 4. Actualizar descripciones al nuevo esquema de 4 zonas
UPDATE field_zones SET description = 'Zona de inicio / Zona de protección' WHERE name = 'Z1';
UPDATE field_zones SET description = 'Zona de creación / Zona de contención' WHERE name = 'Z2';
UPDATE field_zones SET description = 'Zona de progresión / Zona de destrucción' WHERE name = 'Z3';

-- Verificación
SELECT name, description, position FROM field_zones ORDER BY position;
