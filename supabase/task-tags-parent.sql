-- ============================================
-- coach.lab — Migración: jerarquía Fase del juego → Momento / Principios
-- ============================================
-- "Fase del juego" pasa a ser la categoría matriz/dominante: cada valor de
-- "momento_juego" y "principios_tacticos" pertenece a UNA fase concreta
-- (parent_id), y al elegir una fase en Nueva tarea solo se ofrecen los
-- momentos/principios configurados para esa fase. El resto de categorías
-- (tipo_tarea, situacion_juego, zona, y la propia fase_juego) no usan
-- parent_id — queda NULL.

ALTER TABLE task_tag_values ADD COLUMN IF NOT EXISTS parent_id UUID REFERENCES task_tag_values(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS idx_task_tag_values_parent ON task_tag_values(parent_id);

-- Verificación
SELECT column_name FROM information_schema.columns WHERE table_name = 'task_tag_values' ORDER BY ordinal_position;
