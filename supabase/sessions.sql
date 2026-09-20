-- ============================================
-- coach.lab — ENTRENAMIENTO: Sesiones
-- ============================================
-- "sessions" es la sesión de entrenamiento en sí: nombre, fecha, estado
-- (planificada/realizada/plantilla), equipo/etiqueta libre, objetivo,
-- notas y la convocatoria (jugadoras de la plantilla seleccionadas para
-- esa sesión — el pool del que luego se sacan los equipos por tarea).
-- "session_tasks" son las tareas colocadas dentro de una sesión, cada una
-- en una parte (inicial/principal/final) con su propio reparto de equipos
-- (hasta 4, con nombre y color) y comodines (dentro/fuera del juego).
-- Las tareas en sí no se modifican — session_tasks solo referencia la
-- tarea maestra, así que reutilizarla en varias sesiones no la duplica.

CREATE TABLE IF NOT EXISTS sessions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  session_date DATE,
  status TEXT NOT NULL DEFAULT 'planificada', -- 'planificada' | 'realizada' | 'plantilla'
  team_label TEXT DEFAULT '', -- ej. "Primer equipo", "Sub-19"...
  objective TEXT DEFAULT '',
  notes TEXT DEFAULT '',
  favorite BOOLEAN NOT NULL DEFAULT false,
  squad_player_ids UUID[] NOT NULL DEFAULT '{}', -- convocatoria de la sesión
  archived BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_sessions_archived ON sessions(archived);
CREATE INDEX IF NOT EXISTS idx_sessions_date ON sessions(session_date);
CREATE INDEX IF NOT EXISTS idx_sessions_status ON sessions(status);

CREATE TABLE IF NOT EXISTS session_tasks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  session_id UUID NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
  task_id UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  part TEXT NOT NULL, -- 'inicial' | 'principal' | 'final'
  position INTEGER NOT NULL DEFAULT 0,
  teams JSONB NOT NULL DEFAULT '[]', -- [{id,name,color,player_ids:[]}] — 1 a 4 equipos
  wildcards_inside UUID[] NOT NULL DEFAULT '{}', -- comodines dentro del juego
  wildcards_outside UUID[] NOT NULL DEFAULT '{}', -- comodines fuera del juego
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_session_tasks_session ON session_tasks(session_id);
CREATE INDEX IF NOT EXISTS idx_session_tasks_task ON session_tasks(task_id);

CREATE TRIGGER trg_sessions_updated BEFORE UPDATE ON sessions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

ALTER TABLE sessions DISABLE ROW LEVEL SECURITY;
ALTER TABLE session_tasks DISABLE ROW LEVEL SECURITY;

-- Verificación
SELECT table_name FROM information_schema.tables WHERE table_name IN ('sessions', 'session_tasks');
