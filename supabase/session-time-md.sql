-- ============================================
-- coach.lab — Sesiones: hora de inicio y Match Day
-- ============================================
-- "start_time" es la hora de inicio del entrenamiento (HH:MM); la hora de
-- fin se calcula en la app sumando la duración de las tareas, no se guarda.
-- "match_day" es la etiqueta de Match Day (+1 MD, -3 MD, MD...) de la
-- sesión respecto al partido.

ALTER TABLE sessions ADD COLUMN IF NOT EXISTS start_time TEXT;
ALTER TABLE sessions ADD COLUMN IF NOT EXISTS match_day TEXT DEFAULT '';
