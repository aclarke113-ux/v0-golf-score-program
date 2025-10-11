-- Add likes and comments support to posts table

-- Add likes column (array of player IDs who liked the post)
ALTER TABLE posts ADD COLUMN IF NOT EXISTS liked_by text[] DEFAULT '{}';

-- Create comments table
CREATE TABLE IF NOT EXISTS comments (
  id text PRIMARY KEY,
  post_id text NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  player_id text NOT NULL,
  player_name text NOT NULL,
  content text NOT NULL,
  timestamp timestamp with time zone DEFAULT now(),
  created_at timestamp with time zone DEFAULT now()
);

-- Add index for faster comment queries
CREATE INDEX IF NOT EXISTS idx_comments_post_id ON comments(post_id);
CREATE INDEX IF NOT EXISTS idx_comments_timestamp ON comments(timestamp DESC);
