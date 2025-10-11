-- Add date column to groups table
ALTER TABLE groups ADD COLUMN IF NOT EXISTS date DATE;

-- Add comment to explain the column
COMMENT ON COLUMN groups.date IS 'The date when the group is scheduled to play';
