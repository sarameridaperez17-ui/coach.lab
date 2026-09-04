-- ============================================
-- coach.lab — Schema SQL para Supabase
-- MVP: 25 tablas
-- ============================================

-- Extensión para generar UUIDs
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- BLOQUE MVP-1: MODELO DE JUEGO
-- ============================================

-- Contextos de equipo
CREATE TABLE team_contexts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  description TEXT DEFAULT '',
  position INTEGER NOT NULL DEFAULT 0,
  is_default BOOLEAN NOT NULL DEFAULT false,
  archived BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Fases del juego
CREATE TABLE game_phases (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  position INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Alturas de bloque
CREATE TABLE block_heights (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  position INTEGER NOT NULL DEFAULT 0
);

-- Principios
CREATE TABLE principles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  description TEXT DEFAULT '',
  game_phase_id UUID NOT NULL REFERENCES game_phases(id) ON DELETE CASCADE,
  position INTEGER NOT NULL DEFAULT 0,
  archived BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_principles_game_phase ON principles(game_phase_id);

-- Relación Principio ↔ Contexto de equipo
CREATE TABLE principle_contexts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  principle_id UUID NOT NULL REFERENCES principles(id) ON DELETE CASCADE,
  team_context_id UUID NOT NULL REFERENCES team_contexts(id) ON DELETE CASCADE,
  UNIQUE(principle_id, team_context_id)
);

CREATE INDEX idx_principle_contexts_principle ON principle_contexts(principle_id);
CREATE INDEX idx_principle_contexts_context ON principle_contexts(team_context_id);

-- Subprincipios
CREATE TABLE sub_principles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  description TEXT DEFAULT '',
  principle_id UUID NOT NULL REFERENCES principles(id) ON DELETE CASCADE,
  position INTEGER NOT NULL DEFAULT 0,
  archived BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_sub_principles_principle ON sub_principles(principle_id);

-- Comportamientos
CREATE TABLE behaviors (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  description TEXT DEFAULT '',
  type TEXT NOT NULL CHECK (type IN ('collective', 'by_line', 'individual')),
  sub_principle_id UUID NOT NULL REFERENCES sub_principles(id) ON DELETE CASCADE,
  position INTEGER NOT NULL DEFAULT 0,
  archived BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_behaviors_sub_principle ON behaviors(sub_principle_id);
CREATE INDEX idx_behaviors_type ON behaviors(type);

-- Relación Comportamiento ↔ Contexto de equipo
CREATE TABLE behavior_contexts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  behavior_id UUID NOT NULL REFERENCES behaviors(id) ON DELETE CASCADE,
  team_context_id UUID NOT NULL REFERENCES team_contexts(id) ON DELETE CASCADE,
  UNIQUE(behavior_id, team_context_id)
);

CREATE INDEX idx_behavior_contexts_behavior ON behavior_contexts(behavior_id);
CREATE INDEX idx_behavior_contexts_context ON behavior_contexts(team_context_id);

-- Relación Comportamiento ↔ Altura de bloque
CREATE TABLE behavior_block_heights (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  behavior_id UUID NOT NULL REFERENCES behaviors(id) ON DELETE CASCADE,
  block_height_id UUID NOT NULL REFERENCES block_heights(id) ON DELETE CASCADE,
  UNIQUE(behavior_id, block_height_id)
);

CREATE INDEX idx_behavior_block_heights_behavior ON behavior_block_heights(behavior_id);

-- ============================================
-- BLOQUE MVP-2: PERFILES DE POSICIÓN
-- ============================================

-- Posiciones
CREATE TABLE positions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  abbreviation TEXT NOT NULL,
  position INTEGER NOT NULL DEFAULT 0
);

-- Zonas del campo
CREATE TABLE field_zones (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  description TEXT DEFAULT '',
  position INTEGER NOT NULL DEFAULT 0
);

-- Comportamiento individual por posición + zona + fase + contexto
CREATE TABLE position_behaviors (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  position_id UUID NOT NULL REFERENCES positions(id) ON DELETE CASCADE,
  field_zone_id UUID NOT NULL REFERENCES field_zones(id) ON DELETE CASCADE,
  game_phase_id UUID NOT NULL REFERENCES game_phases(id) ON DELETE CASCADE,
  team_context_id UUID NOT NULL REFERENCES team_contexts(id) ON DELETE CASCADE,
  title TEXT NOT NULL DEFAULT '',
  details TEXT DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(position_id, field_zone_id, game_phase_id, team_context_id)
);

CREATE INDEX idx_position_behaviors_position ON position_behaviors(position_id);
CREATE INDEX idx_position_behaviors_context ON position_behaviors(team_context_id);

-- ============================================
-- BLOQUE MVP-3: GLOSARIO
-- ============================================

CREATE TABLE glossary_terms (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  term TEXT NOT NULL,
  definition TEXT DEFAULT '',
  archived BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE glossary_links (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  glossary_term_id UUID NOT NULL REFERENCES glossary_terms(id) ON DELETE CASCADE,
  entity_type TEXT NOT NULL CHECK (entity_type IN ('principle', 'sub_principle', 'behavior', 'task', 'tactical_concept')),
  entity_id UUID NOT NULL,
  UNIQUE(glossary_term_id, entity_type, entity_id)
);

CREATE INDEX idx_glossary_links_term ON glossary_links(glossary_term_id);
CREATE INDEX idx_glossary_links_entity ON glossary_links(entity_type, entity_id);

-- ============================================
-- BLOQUE MVP-3b: CONCEPTOS TÁCTICOS
-- ============================================

CREATE TABLE tactical_concepts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  definition TEXT DEFAULT '',
  archived BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE tactical_concept_links (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tactical_concept_id UUID NOT NULL REFERENCES tactical_concepts(id) ON DELETE CASCADE,
  entity_type TEXT NOT NULL CHECK (entity_type IN ('principle', 'sub_principle', 'behavior', 'task')),
  entity_id UUID NOT NULL,
  UNIQUE(tactical_concept_id, entity_type, entity_id)
);

CREATE INDEX idx_tactical_concept_links_concept ON tactical_concept_links(tactical_concept_id);

-- ============================================
-- BLOQUE MVP-4: TAREAS DE ENTRENAMIENTO
-- ============================================

CREATE TABLE tasks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  description TEXT DEFAULT '',
  rules TEXT DEFAULT '',
  dimensions TEXT DEFAULT '',
  num_players TEXT DEFAULT '',
  duration_minutes INTEGER DEFAULT 0,
  variants TEXT DEFAULT '',
  content_type TEXT[] DEFAULT '{}',
  youtube_url TEXT,
  archived BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Relación Tarea ↔ Principio
CREATE TABLE task_principles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  task_id UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  principle_id UUID NOT NULL REFERENCES principles(id) ON DELETE CASCADE,
  UNIQUE(task_id, principle_id)
);

CREATE INDEX idx_task_principles_task ON task_principles(task_id);
CREATE INDEX idx_task_principles_principle ON task_principles(principle_id);

-- Relación Tarea ↔ Subprincipio
CREATE TABLE task_sub_principles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  task_id UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  sub_principle_id UUID NOT NULL REFERENCES sub_principles(id) ON DELETE CASCADE,
  UNIQUE(task_id, sub_principle_id)
);

CREATE INDEX idx_task_sub_principles_task ON task_sub_principles(task_id);

-- Relación Tarea ↔ Fase del juego
CREATE TABLE task_game_phases (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  task_id UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  game_phase_id UUID NOT NULL REFERENCES game_phases(id) ON DELETE CASCADE,
  UNIQUE(task_id, game_phase_id)
);

CREATE INDEX idx_task_game_phases_task ON task_game_phases(task_id);

-- Relación Tarea ↔ Posiciones implicadas
CREATE TABLE task_positions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  task_id UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  position_id UUID NOT NULL REFERENCES positions(id) ON DELETE CASCADE,
  UNIQUE(task_id, position_id)
);

CREATE INDEX idx_task_positions_task ON task_positions(task_id);

-- Relación Tarea ↔ Zonas del campo
CREATE TABLE task_field_zones (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  task_id UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  field_zone_id UUID NOT NULL REFERENCES field_zones(id) ON DELETE CASCADE,
  UNIQUE(task_id, field_zone_id)
);

CREATE INDEX idx_task_field_zones_task ON task_field_zones(task_id);

-- ============================================
-- BLOQUE MVP-5: NOTAS
-- ============================================

CREATE TABLE notes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title TEXT DEFAULT '',
  content TEXT DEFAULT '',
  note_type TEXT NOT NULL DEFAULT 'free' CHECK (note_type IN ('free', 'post_session', 'post_match')),
  archived BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Etiquetas inteligentes
CREATE TABLE note_tags (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  note_id UUID NOT NULL REFERENCES notes(id) ON DELETE CASCADE,
  tag_type TEXT NOT NULL CHECK (tag_type IN (
    'principle', 'sub_principle', 'game_phase', 'position',
    'team_context', 'tactical_concept', 'field_zone',
    'block_height', 'content_type'
  )),
  tag_entity_id UUID,
  tag_label TEXT NOT NULL
);

CREATE INDEX idx_note_tags_note ON note_tags(note_id);
CREATE INDEX idx_note_tags_type ON note_tags(tag_type);
CREATE INDEX idx_note_tags_entity ON note_tags(tag_entity_id);

-- ============================================
-- MULTIMEDIA (transversal)
-- ============================================

CREATE TABLE attachments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  file_name TEXT NOT NULL,
  file_url TEXT NOT NULL,
  file_type TEXT NOT NULL CHECK (file_type IN ('image', 'diagram', 'pdf', 'video')),
  entity_type TEXT NOT NULL,
  entity_id UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_attachments_entity ON attachments(entity_type, entity_id);

-- ============================================
-- FUNCIÓN: auto-actualizar updated_at
-- ============================================

CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Aplicar trigger a todas las tablas con updated_at
CREATE TRIGGER trg_team_contexts_updated BEFORE UPDATE ON team_contexts FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_game_phases_updated BEFORE UPDATE ON game_phases FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_principles_updated BEFORE UPDATE ON principles FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_sub_principles_updated BEFORE UPDATE ON sub_principles FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_behaviors_updated BEFORE UPDATE ON behaviors FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_position_behaviors_updated BEFORE UPDATE ON position_behaviors FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_glossary_terms_updated BEFORE UPDATE ON glossary_terms FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_tactical_concepts_updated BEFORE UPDATE ON tactical_concepts FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_tasks_updated BEFORE UPDATE ON tasks FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_notes_updated BEFORE UPDATE ON notes FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================
-- DATOS INICIALES (SEED)
-- ============================================

-- Contextos de equipo
INSERT INTO team_contexts (name, description, position, is_default) VALUES
  ('Equipo dominador con balón', 'Posesión como herramienta principal. Dominio territorial mediante el control del balón.', 1, true),
  ('Equipo dominador en transición', 'Fortaleza en los momentos de cambio de posesión. Velocidad y verticalidad como identidad.', 2, true),
  ('Equipo equilibrado', 'Sin una vía dominante clara. Capacidad de adaptación según el rival y el momento.', 3, true),
  ('Equipo de supervivencia', 'Prioridad en no recibir. Eficacia máxima con poca posesión.', 4, true);

-- Fases del juego
INSERT INTO game_phases (name, position) VALUES
  ('Fase ofensiva', 1),
  ('Fase defensiva', 2),
  ('Transición ofensiva', 3),
  ('Transición defensiva', 4),
  ('ABP', 5);

-- Alturas de bloque
INSERT INTO block_heights (name, position) VALUES
  ('Bloque alto', 1),
  ('Bloque medio', 2),
  ('Bloque bajo', 3);

-- Posiciones
INSERT INTO positions (name, abbreviation, position) VALUES
  ('Portera', 'PT', 1),
  ('Central', 'CT', 2),
  ('Central lateral', 'CL', 3),
  ('Central central', 'CC', 4),
  ('Lateral', 'LT', 5),
  ('Carrilera', 'Ca', 6),
  ('Extremo', 'EX', 7),
  ('Mediocentro', 'MC', 8),
  ('Interior', 'IN', 9),
  ('Mediapunta', 'MP', 10),
  ('Delantera', 'DC', 11),
  ('Doblepunta', 'DP', 12);

-- Zonas del campo
INSERT INTO field_zones (name, description, position) VALUES
  ('Z1', 'Zona de inicio / Zona de protección', 1),
  ('Z2', 'Zona de creación / Zona de destrucción', 2),
  ('Z3', 'Zona de finalización / Zona de orientación', 3);
