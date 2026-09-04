-- ============================================
-- coach.lab — Bookmarks (Continuar trabajando)
-- ============================================

CREATE TABLE IF NOT EXISTS bookmarks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  item_type TEXT NOT NULL,        -- 'principle', 'sub_principle', 'behavior', 'tactical_concept', 'glossary', 'note', 'task', 'system', 'abp'
  item_id UUID NOT NULL,
  item_title TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(item_type, item_id)
);

CREATE INDEX idx_bookmarks_created ON bookmarks(created_at DESC);
