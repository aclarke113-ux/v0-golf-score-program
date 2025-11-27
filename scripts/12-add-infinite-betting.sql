-- Add infinite_betting column to tournaments table
ALTER TABLE tournaments
ADD COLUMN IF NOT EXISTS infinite_betting BOOLEAN DEFAULT false;

-- Update existing tournaments to have infinite_betting as false by default
UPDATE tournaments
SET infinite_betting = COALESCE(infinite_betting, false);
