-- ============================================
-- coach.lab — Migración: vídeo de YouTube en comportamientos de posición
-- ============================================
-- Añade una columna youtube_url propia a position_behaviors, con el
-- mismo formato que ya usan principios/subprincipios/comportamientos
-- en Modelo de juego. Antes el enlace se escondía como una línea
-- "__YOUTUBE__=..." dentro del texto de "details" — este script
-- migra ese dato existente a la columna nueva y limpia la línea.

ALTER TABLE position_behaviors ADD COLUMN IF NOT EXISTS youtube_url TEXT;

UPDATE position_behaviors
SET
  youtube_url = substring(details FROM '__YOUTUBE__=(.*)'),
  details = trim(both E'\n' FROM regexp_replace(details, E'\n?__YOUTUBE__=.*', ''))
WHERE details ~ '__YOUTUBE__=';

-- Verificación
SELECT id, title, details, youtube_url FROM position_behaviors;
