-- Add spectator permission columns to tournaments table
ALTER TABLE tournaments
ADD COLUMN IF NOT EXISTS allow_spectator_chat boolean DEFAULT true,
ADD COLUMN IF NOT EXISTS allow_spectator_feed boolean DEFAULT true,
ADD COLUMN IF NOT EXISTS allow_spectator_betting boolean DEFAULT true;

-- Update existing tournaments to have default values
UPDATE tournaments
SET 
  allow_spectator_chat = COALESCE(allow_spectator_chat, true),
  allow_spectator_feed = COALESCE(allow_spectator_feed, true),
  allow_spectator_betting = COALESCE(allow_spectator_betting, true);
