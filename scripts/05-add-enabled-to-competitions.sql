-- Add 'enabled' column to competitions table
-- This column tracks whether a competition (Closest to Pin or Longest Drive) is active for a specific hole

ALTER TABLE competitions
ADD COLUMN IF NOT EXISTS enabled BOOLEAN NOT NULL DEFAULT true;

-- Add comment to explain the column
COMMENT ON COLUMN competitions.enabled IS 'Whether this competition is currently active/enabled for the hole';
