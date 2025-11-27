-- Disable RLS on tournaments table to allow all operations
-- The app handles authentication separately through tournament passwords

ALTER TABLE tournaments DISABLE ROW LEVEL SECURITY;
