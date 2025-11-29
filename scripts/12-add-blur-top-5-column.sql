-- Add blur_top_5 column to tournaments table
ALTER TABLE tournaments ADD COLUMN IF NOT EXISTS blur_top_5 BOOLEAN DEFAULT false;

-- Add comment explaining the column
COMMENT ON COLUMN tournaments.blur_top_5 IS 'When true, the top 5 positions on the leaderboard are blurred for all users until admin reveals them';
