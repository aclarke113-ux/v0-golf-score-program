-- Replaced old schema with actual schema that matches the database

-- This script is idempotent and matches the actual database schema
-- All tables already exist, so this just ensures they have the correct structure

-- Tournaments table
CREATE TABLE IF NOT EXISTS tournaments (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  code TEXT UNIQUE,
  password TEXT,
  admin_password TEXT,
  scoring_type TEXT DEFAULT 'stableford',
  number_of_days INTEGER DEFAULT 2,
  has_pick3 BOOLEAN DEFAULT false,
  has_calcutta BOOLEAN DEFAULT false,
  has_play_around_day BOOLEAN DEFAULT false,
  calcutta_close_time TIMESTAMPTZ,
  allow_spectator_chat BOOLEAN DEFAULT false,
  allow_spectator_feed BOOLEAN DEFAULT false,
  allow_spectator_betting BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Players table
CREATE TABLE IF NOT EXISTS players (
  id TEXT PRIMARY KEY,
  tournament_id TEXT REFERENCES tournaments(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  password TEXT,
  handicap INTEGER DEFAULT 0,
  tee_preference TEXT,
  profile_picture TEXT,
  is_admin BOOLEAN DEFAULT false,
  is_spectator BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Courses table
CREATE TABLE IF NOT EXISTS courses (
  id TEXT PRIMARY KEY,
  tournament_id TEXT REFERENCES tournaments(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  holes JSONB NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Groups table
CREATE TABLE IF NOT EXISTS groups (
  id TEXT PRIMARY KEY,
  tournament_id TEXT REFERENCES tournaments(id) ON DELETE CASCADE,
  course_id TEXT REFERENCES courses(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  day INTEGER NOT NULL,
  date DATE,
  tee_time TIMESTAMPTZ,
  starting_hole INTEGER DEFAULT 1,
  player_ids TEXT[] DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Rounds table
CREATE TABLE IF NOT EXISTS rounds (
  id TEXT PRIMARY KEY,
  player_id TEXT REFERENCES players(id) ON DELETE CASCADE,
  group_id TEXT REFERENCES groups(id) ON DELETE CASCADE,
  day INTEGER NOT NULL,
  scores JSONB NOT NULL DEFAULT '[]',
  handicap_used INTEGER DEFAULT 0,
  submitted BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Messages table
CREATE TABLE IF NOT EXISTS messages (
  id TEXT PRIMARY KEY,
  tournament_id TEXT REFERENCES tournaments(id) ON DELETE CASCADE,
  player_id TEXT REFERENCES players(id) ON DELETE CASCADE,
  player_name TEXT,
  message TEXT NOT NULL,
  timestamp TIMESTAMPTZ DEFAULT NOW()
);

-- Posts table (social feed)
CREATE TABLE IF NOT EXISTS posts (
  id TEXT PRIMARY KEY,
  tournament_id TEXT REFERENCES tournaments(id) ON DELETE CASCADE,
  player_id TEXT REFERENCES players(id) ON DELETE CASCADE,
  player_name TEXT,
  content TEXT NOT NULL,
  media_url TEXT,
  media_type TEXT,
  liked_by TEXT[] DEFAULT '{}',
  timestamp TIMESTAMPTZ DEFAULT NOW()
);

-- Comments table
CREATE TABLE IF NOT EXISTS comments (
  id TEXT PRIMARY KEY,
  post_id TEXT REFERENCES posts(id) ON DELETE CASCADE,
  player_id TEXT REFERENCES players(id) ON DELETE CASCADE,
  player_name TEXT,
  content TEXT NOT NULL,
  timestamp TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Notifications table
CREATE TABLE IF NOT EXISTS notifications (
  id TEXT PRIMARY KEY,
  tournament_id TEXT REFERENCES tournaments(id) ON DELETE CASCADE,
  player_id TEXT REFERENCES players(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  read BOOLEAN DEFAULT false,
  timestamp TIMESTAMPTZ DEFAULT NOW()
);

-- Predictions table (Pick 3)
CREATE TABLE IF NOT EXISTS predictions (
  id TEXT PRIMARY KEY,
  tournament_id TEXT REFERENCES tournaments(id) ON DELETE CASCADE,
  player_id TEXT REFERENCES players(id) ON DELETE CASCADE,
  predicted_player_ids TEXT[] DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Auctions table (Calcutta)
CREATE TABLE IF NOT EXISTS auctions (
  id TEXT PRIMARY KEY,
  tournament_id TEXT REFERENCES tournaments(id) ON DELETE CASCADE,
  auctioned_player_id TEXT REFERENCES players(id) ON DELETE CASCADE,
  buyer_player_id TEXT REFERENCES players(id) ON DELETE SET NULL,
  amount INTEGER NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Player credits table
CREATE TABLE IF NOT EXISTS player_credits (
  id TEXT PRIMARY KEY,
  tournament_id TEXT REFERENCES tournaments(id) ON DELETE CASCADE,
  player_id TEXT REFERENCES players(id) ON DELETE CASCADE,
  credits INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Competitions table (longest drive, etc.)
CREATE TABLE IF NOT EXISTS competitions (
  id TEXT PRIMARY KEY,
  tournament_id TEXT REFERENCES tournaments(id) ON DELETE CASCADE,
  course_id TEXT REFERENCES courses(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  hole_number INTEGER,
  day INTEGER,
  enabled BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Competition entries table
CREATE TABLE IF NOT EXISTS competition_entries (
  id TEXT PRIMARY KEY,
  competition_id TEXT REFERENCES competitions(id) ON DELETE CASCADE,
  player_id TEXT REFERENCES players(id) ON DELETE CASCADE,
  group_id TEXT REFERENCES groups(id) ON DELETE CASCADE,
  distance REAL,
  timestamp TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Championships table (historical winners)
CREATE TABLE IF NOT EXISTS championships (
  id TEXT PRIMARY KEY,
  tournament_id TEXT REFERENCES tournaments(id) ON DELETE CASCADE,
  player_id TEXT REFERENCES players(id) ON DELETE CASCADE,
  year INTEGER NOT NULL,
  total_score INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_players_tournament ON players(tournament_id);
CREATE INDEX IF NOT EXISTS idx_courses_tournament ON courses(tournament_id);
CREATE INDEX IF NOT EXISTS idx_groups_tournament ON groups(tournament_id);
CREATE INDEX IF NOT EXISTS idx_rounds_player ON rounds(player_id);
CREATE INDEX IF NOT EXISTS idx_rounds_group ON rounds(group_id);
CREATE INDEX IF NOT EXISTS idx_messages_tournament ON messages(tournament_id);
CREATE INDEX IF NOT EXISTS idx_posts_tournament ON posts(tournament_id);
CREATE INDEX IF NOT EXISTS idx_comments_post ON comments(post_id);
CREATE INDEX IF NOT EXISTS idx_notifications_player ON notifications(player_id);
CREATE INDEX IF NOT EXISTS idx_predictions_tournament ON predictions(tournament_id);
CREATE INDEX IF NOT EXISTS idx_auctions_tournament ON auctions(tournament_id);
CREATE INDEX IF NOT EXISTS idx_player_credits_player ON player_credits(player_id);
CREATE INDEX IF NOT EXISTS idx_competitions_tournament ON competitions(tournament_id);
CREATE INDEX IF NOT EXISTS idx_competition_entries_competition ON competition_entries(competition_id);
CREATE INDEX IF NOT EXISTS idx_championships_tournament ON championships(tournament_id);
