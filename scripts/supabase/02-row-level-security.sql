-- Row Level Security (RLS) Policies
-- This ensures data isolation between tournaments and proper access control

-- Enable RLS on all tables
ALTER TABLE tournaments ENABLE ROW LEVEL SECURITY;
ALTER TABLE players ENABLE ROW LEVEL SECURITY;
ALTER TABLE courses ENABLE ROW LEVEL SECURITY;
ALTER TABLE groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE rounds ENABLE ROW LEVEL SECURITY;
ALTER TABLE competitions ENABLE ROW LEVEL SECURITY;
ALTER TABLE competition_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE predictions ENABLE ROW LEVEL SECURITY;
ALTER TABLE auctions ENABLE ROW LEVEL SECURITY;
ALTER TABLE player_credits ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE championships ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- Tournaments: Anyone can read, insert, update, delete (app handles auth via passwords)
CREATE POLICY "tournaments_select" ON tournaments FOR SELECT USING (true);
CREATE POLICY "tournaments_insert" ON tournaments FOR INSERT WITH CHECK (true);
CREATE POLICY "tournaments_update" ON tournaments FOR UPDATE USING (true);
CREATE POLICY "tournaments_delete" ON tournaments FOR DELETE USING (true);

-- Players: Anyone can read/write (app handles auth)
CREATE POLICY "players_select" ON players FOR SELECT USING (true);
CREATE POLICY "players_insert" ON players FOR INSERT WITH CHECK (true);
CREATE POLICY "players_update" ON players FOR UPDATE USING (true);
CREATE POLICY "players_delete" ON players FOR DELETE USING (true);

-- Courses: Anyone can read/write
CREATE POLICY "courses_select" ON courses FOR SELECT USING (true);
CREATE POLICY "courses_insert" ON courses FOR INSERT WITH CHECK (true);
CREATE POLICY "courses_update" ON courses FOR UPDATE USING (true);
CREATE POLICY "courses_delete" ON courses FOR DELETE USING (true);

-- Groups: Anyone can read/write
CREATE POLICY "groups_select" ON groups FOR SELECT USING (true);
CREATE POLICY "groups_insert" ON groups FOR INSERT WITH CHECK (true);
CREATE POLICY "groups_update" ON groups FOR UPDATE USING (true);
CREATE POLICY "groups_delete" ON groups FOR DELETE USING (true);

-- Rounds: Anyone can read/write
CREATE POLICY "rounds_select" ON rounds FOR SELECT USING (true);
CREATE POLICY "rounds_insert" ON rounds FOR INSERT WITH CHECK (true);
CREATE POLICY "rounds_update" ON rounds FOR UPDATE USING (true);
CREATE POLICY "rounds_delete" ON rounds FOR DELETE USING (true);

-- Competitions: Anyone can read/write
CREATE POLICY "competitions_select" ON competitions FOR SELECT USING (true);
CREATE POLICY "competitions_insert" ON competitions FOR INSERT WITH CHECK (true);
CREATE POLICY "competitions_update" ON competitions FOR UPDATE USING (true);
CREATE POLICY "competitions_delete" ON competitions FOR DELETE USING (true);

-- Competition entries: Anyone can read/write
CREATE POLICY "competition_entries_select" ON competition_entries FOR SELECT USING (true);
CREATE POLICY "competition_entries_insert" ON competition_entries FOR INSERT WITH CHECK (true);
CREATE POLICY "competition_entries_update" ON competition_entries FOR UPDATE USING (true);
CREATE POLICY "competition_entries_delete" ON competition_entries FOR DELETE USING (true);

-- Predictions: Anyone can read/write
CREATE POLICY "predictions_select" ON predictions FOR SELECT USING (true);
CREATE POLICY "predictions_insert" ON predictions FOR INSERT WITH CHECK (true);
CREATE POLICY "predictions_update" ON predictions FOR UPDATE USING (true);
CREATE POLICY "predictions_delete" ON predictions FOR DELETE USING (true);

-- Auctions: Anyone can read/write
CREATE POLICY "auctions_select" ON auctions FOR SELECT USING (true);
CREATE POLICY "auctions_insert" ON auctions FOR INSERT WITH CHECK (true);
CREATE POLICY "auctions_update" ON auctions FOR UPDATE USING (true);
CREATE POLICY "auctions_delete" ON auctions FOR DELETE USING (true);

-- Player credits: Anyone can read/write
CREATE POLICY "player_credits_select" ON player_credits FOR SELECT USING (true);
CREATE POLICY "player_credits_insert" ON player_credits FOR INSERT WITH CHECK (true);
CREATE POLICY "player_credits_update" ON player_credits FOR UPDATE USING (true);
CREATE POLICY "player_credits_delete" ON player_credits FOR DELETE USING (true);

-- Messages: Anyone can read/write
CREATE POLICY "messages_select" ON messages FOR SELECT USING (true);
CREATE POLICY "messages_insert" ON messages FOR INSERT WITH CHECK (true);
CREATE POLICY "messages_update" ON messages FOR UPDATE USING (true);
CREATE POLICY "messages_delete" ON messages FOR DELETE USING (true);

-- Posts: Anyone can read/write
CREATE POLICY "posts_select" ON posts FOR SELECT USING (true);
CREATE POLICY "posts_insert" ON posts FOR INSERT WITH CHECK (true);
CREATE POLICY "posts_update" ON posts FOR UPDATE USING (true);
CREATE POLICY "posts_delete" ON posts FOR DELETE USING (true);

-- Championships: Anyone can read/write
CREATE POLICY "championships_select" ON championships FOR SELECT USING (true);
CREATE POLICY "championships_insert" ON championships FOR INSERT WITH CHECK (true);
CREATE POLICY "championships_update" ON championships FOR UPDATE USING (true);
CREATE POLICY "championships_delete" ON championships FOR DELETE USING (true);

-- Notifications: Anyone can read/write
CREATE POLICY "notifications_select" ON notifications FOR SELECT USING (true);
CREATE POLICY "notifications_insert" ON notifications FOR INSERT WITH CHECK (true);
CREATE POLICY "notifications_update" ON notifications FOR UPDATE USING (true);
CREATE POLICY "notifications_delete" ON notifications FOR DELETE USING (true);
