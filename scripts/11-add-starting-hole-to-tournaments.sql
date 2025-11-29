-- Add starting_hole column to tournaments table for shotgun starts
ALTER TABLE tournaments
ADD COLUMN IF NOT EXISTS starting_hole INTEGER DEFAULT 1;

-- Update existing tournaments to have starting hole 1
UPDATE tournaments
SET starting_hole = 1
WHERE starting_hole IS NULL;

-- Add comment explaining the column
COMMENT ON COLUMN tournaments.starting_hole IS 'Default starting hole for rounds (1-18), used for shotgun starts';
