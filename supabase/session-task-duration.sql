-- ============================================
-- coach.lab — Sesiones: duración editable por tarea
-- ============================================
-- La duración que se ve y se suma en una sesión ya no depende del campo
-- "duration_minutes" de la tarea maestra (el que se pone en "Nueva tarea").
-- Cada session_tasks guarda su propia duración, independiente — se rellena
-- con la duración de la tarea al añadirla, pero luego se puede modificar
-- solo para esa sesión sin tocar la ficha original de la tarea.

ALTER TABLE session_tasks ADD COLUMN IF NOT EXISTS duration_minutes INTEGER;

-- Sesiones ya creadas antes de este cambio: rellenar con la duración de la
-- tarea maestra para que no aparezcan en 0.
UPDATE session_tasks st
SET duration_minutes = t.duration_minutes
FROM tasks t
WHERE st.task_id = t.id AND st.duration_minutes IS NULL;
