-- Add is_admin and is_spectator columns to players table
ALTER TABLE players
ADD COLUMN IF NOT EXISTS is_admin BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS is_spectator BOOLEAN DEFAULT FALSE;

-- Create index for faster admin lookups
CREATE INDEX IF NOT EXISTS idx_players_is_admin ON players(is_admin) WHERE is_admin = TRUE;
CREATE INDEX IF NOT EXISTS idx_players_is_spectator ON players(is_spectator) WHERE is_spectator = TRUE;
