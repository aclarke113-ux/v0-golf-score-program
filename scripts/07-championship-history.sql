-- Championship winners tracking
CREATE TABLE IF NOT EXISTS championship_winners (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  competition_id UUID NOT NULL REFERENCES competitions(id) ON DELETE CASCADE,
  player_id UUID NOT NULL REFERENCES players(id) ON DELETE CASCADE,
  year INTEGER NOT NULL,
  winning_score INTEGER NOT NULL,
  photo_url TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(competition_id, year)
);

-- Add current champion field to competitions
ALTER TABLE competitions ADD COLUMN IF NOT EXISTS current_champion_id UUID REFERENCES players(id);
ALTER TABLE competitions ADD COLUMN IF NOT EXISTS champion_photo_url TEXT;

-- Indexes
CREATE INDEX IF NOT EXISTS idx_championship_winners_competition ON championship_winners(competition_id, year DESC);
CREATE INDEX IF NOT EXISTS idx_championship_winners_player ON championship_winners(player_id);

-- RLS Policies
ALTER TABLE championship_winners ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Competition members can view championship history"
  ON championship_winners FOR SELECT
  USING (
    competition_id IN (
      SELECT competition_id FROM competition_members WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Competition admins can manage championship history"
  ON championship_winners FOR ALL
  USING (
    competition_id IN (
      SELECT c.id FROM competitions c
      LEFT JOIN competition_admins ca ON ca.competition_id = c.id
      WHERE c.created_by = auth.uid() OR ca.user_id = auth.uid()
    )
  );

-- Function to get player championship count
CREATE OR REPLACE FUNCTION get_player_championship_count(p_player_id UUID, p_competition_id UUID)
RETURNS INTEGER AS $$
BEGIN
  RETURN (
    SELECT COUNT(*)::INTEGER
    FROM championship_winners
    WHERE player_id = p_player_id AND competition_id = p_competition_id
  );
END;
$$ LANGUAGE plpgsql;
