-- Añadir columna status a la tabla bookmarks existente
-- Valores posibles: working, paused, focus, favorite
ALTER TABLE bookmarks ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'working';

-- Actualizar el constraint para incluir solo valores válidos
ALTER TABLE bookmarks ADD CONSTRAINT bookmarks_status_check
  CHECK (status IN ('working', 'paused', 'focus', 'favorite'));
