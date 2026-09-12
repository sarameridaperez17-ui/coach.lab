-- ============================================
-- coach.lab — Migración: Planificación (calendario de sesiones)
-- ============================================

CREATE TABLE IF NOT EXISTS planning_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('training', 'gym', 'match', 'rest', 'travel', 'other')),
  notes TEXT DEFAULT '',
  date DATE NOT NULL, -- fecha del evento, o fecha de inicio si es recurrente
  start_time TIME,
  end_time TIME,
  is_recurring BOOLEAN NOT NULL DEFAULT false,
  recurrence_days SMALLINT[], -- 0=lunes ... 6=domingo
  recurrence_until DATE, -- null = sin fecha de fin
  excluded_dates DATE[] NOT NULL DEFAULT '{}', -- ocurrencias puntuales eliminadas de una serie
  archived BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_planning_events_date ON planning_events(date);
CREATE INDEX IF NOT EXISTS idx_planning_events_archived ON planning_events(archived);

-- RLS
ALTER TABLE planning_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "planning_events_all" ON planning_events;
CREATE POLICY "planning_events_all" ON planning_events
  FOR ALL USING (true) WITH CHECK (true);

-- Verificación
SELECT 'Migración planning_events completada' AS resultado;
