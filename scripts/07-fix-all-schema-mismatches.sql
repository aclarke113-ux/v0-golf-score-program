-- Comprehensive schema fix for all mismatches between database and code
-- This adds all missing columns that the code expects

-- Add missing columns to tournaments table
ALTER TABLE tournaments 
ADD COLUMN IF NOT EXISTS allow_spectator_chat BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS allow_spectator_feed BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS allow_spectator_betting BOOLEAN DEFAULT true;

-- Add missing columns to players table
ALTER TABLE players
ADD COLUMN IF NOT EXISTS tee_preference TEXT;

-- Add missing columns to groups table  
ALTER TABLE groups
ADD COLUMN IF NOT EXISTS starting_hole INTEGER;

-- Add missing columns to competition_entries table
ALTER TABLE competition_entries
ADD COLUMN IF NOT EXISTS group_id TEXT,
ADD COLUMN IF NOT EXISTS timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- Add indexes for better performance
CREATE INDEX IF NOT EXISTS idx_players_tournament ON players(tournament_id);
CREATE INDEX IF NOT EXISTS idx_courses_tournament ON courses(tournament_id);
CREATE INDEX IF NOT EXISTS idx_groups_tournament ON groups(tournament_id);
CREATE INDEX IF NOT EXISTS idx_rounds_player ON rounds(player_id);
CREATE INDEX IF NOT EXISTS idx_competitions_tournament ON competitions(tournament_id);
CREATE INDEX IF NOT EXISTS idx_messages_tournament ON messages(tournament_id);
CREATE INDEX IF NOT EXISTS idx_posts_tournament ON posts(tournament_id);
CREATE INDEX IF NOT EXISTS idx_auctions_tournament ON auctions(tournament_id);
CREATE INDEX IF NOT EXISTS idx_predictions_tournament ON predictions(tournament_id);
CREATE INDEX IF NOT EXISTS idx_player_credits_tournament ON player_credits(tournament_id);
CREATE INDEX IF NOT EXISTS idx_championships_tournament ON championships(tournament_id);
CREATE INDEX IF NOT EXISTS idx_notifications_player ON notifications(player_id);
