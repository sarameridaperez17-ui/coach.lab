-- ============================================
-- coach.lab — EQUIPO: Plantillas y Seguimiento de jugadoras
-- ============================================
-- "players" es el registro compartido de una jugadora (identidad + datos de
-- plantilla de club) — lo usa la página "Plantillas".
-- "player_reports" son las entradas de seguimiento en el tiempo (nivel,
-- minutos, valoración, convocatoria...) — las usa la página "Seguimiento de
-- jugadoras" para decidir convocatorias a selección, no para fichajes.
-- Ambas páginas comparten la misma tabla "players": una jugadora dada de
-- alta desde cualquiera de las dos aparece en ambas.

CREATE TABLE IF NOT EXISTS players (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  full_name TEXT NOT NULL,
  birth_date DATE,
  position_id UUID REFERENCES positions(id) ON DELETE SET NULL,
  dominant_foot TEXT DEFAULT '', -- 'diestra' | 'zurda' | 'ambidiestra' | ''
  photo_url TEXT, -- Base64 data URL
  club TEXT DEFAULT '',
  squad_number INTEGER,
  height_cm INTEGER,
  nationality TEXT DEFAULT '',
  notes TEXT DEFAULT '',
  archived BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_players_archived ON players(archived);
CREATE INDEX IF NOT EXISTS idx_players_position ON players(position_id);

-- Informe de seguimiento (una jugadora puede tener varios en el tiempo)
CREATE TABLE IF NOT EXISTS player_reports (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  player_id UUID NOT NULL REFERENCES players(id) ON DELETE CASCADE,
  report_date DATE NOT NULL DEFAULT CURRENT_DATE,
  category TEXT DEFAULT '', -- Sub-17 / Sub-19 / Sub-20 / Absoluta...
  club TEXT DEFAULT '', -- club/equipo en el momento del informe
  minutes_played INTEGER,
  positions_played TEXT DEFAULT '', -- ej: "MC, IN"
  rating INTEGER, -- valoración 1-10
  performance_notes TEXT DEFAULT '',
  call_up_status TEXT NOT NULL DEFAULT 'seguimiento', -- 'seguimiento' | 'pendiente' | 'convocada' | 'no_convocada'
  tournament TEXT DEFAULT '', -- torneo/convocatoria de referencia
  archived BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_player_reports_player ON player_reports(player_id);
CREATE INDEX IF NOT EXISTS idx_player_reports_archived ON player_reports(archived);

CREATE TRIGGER trg_players_updated BEFORE UPDATE ON players FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_player_reports_updated BEFORE UPDATE ON player_reports FOR EACH ROW EXECUTE FUNCTION update_updated_at();

ALTER TABLE players DISABLE ROW LEVEL SECURITY;
ALTER TABLE player_reports DISABLE ROW LEVEL SECURITY;

-- Verificación
SELECT table_name FROM information_schema.tables WHERE table_name IN ('players', 'player_reports');
