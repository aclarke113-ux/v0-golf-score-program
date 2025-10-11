-- Add allow_spectator_chat column to tournaments table
ALTER TABLE tournaments
ADD COLUMN IF NOT EXISTS allow_spectator_chat BOOLEAN DEFAULT true;

-- Set default value for existing tournaments
UPDATE tournaments
SET allow_spectator_chat = true
WHERE allow_spectator_chat IS NULL;
