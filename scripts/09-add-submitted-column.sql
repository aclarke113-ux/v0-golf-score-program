-- Add submitted column to rounds table
ALTER TABLE rounds ADD COLUMN IF NOT EXISTS submitted BOOLEAN DEFAULT false;

-- Update existing rounds to be not submitted
UPDATE rounds SET submitted = false WHERE submitted IS NULL;
