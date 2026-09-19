-- ============================================
-- coach.lab — Migración: variantes de tarea
-- ============================================
-- Una variante es una tarea normal (mismo formulario, propios campos y
-- etiquetas) pero ligada a una tarea "madre" vía parent_task_id. En la
-- biblioteca se muestran juntas en el mismo recuadro (con flechas para
-- pasar de una a otra), pero cada una se busca/filtra de forma
-- independiente por sus propios datos.

ALTER TABLE tasks ADD COLUMN IF NOT EXISTS parent_task_id UUID REFERENCES tasks(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS idx_tasks_parent ON tasks(parent_task_id);

-- Verificación
SELECT column_name FROM information_schema.columns WHERE table_name = 'tasks' ORDER BY ordinal_position;
