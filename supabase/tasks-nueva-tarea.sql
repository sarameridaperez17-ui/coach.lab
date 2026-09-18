-- ============================================
-- coach.lab — Migración: rediseño de "Nueva tarea"
-- ============================================
-- Nuevos campos de texto (objetivo, consignas, observaciones), imagen
-- subida desde archivo, y un sistema de etiquetas configurable manualmente
-- (tipo de tarea, situación de juego, zona, fase del juego, momento del
-- juego, principios tácticos) — independiente del resto del modelo de
-- juego, pensado para clasificar tareas con etiquetas simples que Sandra
-- da de alta ella misma desde el botón "Configuración".

ALTER TABLE tasks ADD COLUMN IF NOT EXISTS objective TEXT DEFAULT '';
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS guidelines TEXT DEFAULT ''; -- consignas
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS observations TEXT DEFAULT '';
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS image_url TEXT; -- imagen subida desde archivo (Base64)
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS youtube_url TEXT; -- ya existía, por si acaso

-- Valores de cada categoría de etiqueta (los da de alta Sandra manualmente)
CREATE TABLE IF NOT EXISTS task_tag_values (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  category TEXT NOT NULL, -- 'tipo_tarea' | 'situacion_juego' | 'zona' | 'fase_juego' | 'momento_juego' | 'principios_tacticos'
  label TEXT NOT NULL,
  position INTEGER NOT NULL DEFAULT 0,
  archived BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_task_tag_values_category ON task_tag_values(category);

-- Etiquetas asignadas a cada tarea (varias por categoría, varias categorías)
CREATE TABLE IF NOT EXISTS task_tag_links (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  task_id UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  tag_value_id UUID NOT NULL REFERENCES task_tag_values(id) ON DELETE CASCADE,
  UNIQUE(task_id, tag_value_id)
);

CREATE INDEX IF NOT EXISTS idx_task_tag_links_task ON task_tag_links(task_id);
CREATE INDEX IF NOT EXISTS idx_task_tag_links_value ON task_tag_links(tag_value_id);

CREATE TRIGGER trg_task_tag_values_updated BEFORE UPDATE ON task_tag_values FOR EACH ROW EXECUTE FUNCTION update_updated_at();

ALTER TABLE task_tag_values DISABLE ROW LEVEL SECURITY;
ALTER TABLE task_tag_links DISABLE ROW LEVEL SECURITY;

-- Verificación
SELECT column_name FROM information_schema.columns WHERE table_name = 'tasks' ORDER BY ordinal_position;
SELECT table_name FROM information_schema.tables WHERE table_name IN ('task_tag_values', 'task_tag_links');
