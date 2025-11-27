-- Fix RLS policies for tournaments to allow anonymous creation
-- The app uses custom password authentication, not Supabase auth

-- Drop existing conflicting policies
DROP POLICY IF EXISTS "Authenticated users can create tournaments" ON tournaments;
DROP POLICY IF EXISTS "Anyone can update tournaments" ON tournaments;
DROP POLICY IF EXISTS "Anyone can view tournaments" ON tournaments;
DROP POLICY IF EXISTS "Anyone can delete tournaments" ON tournaments;

-- Ensure the basic policies exist and allow all operations
DROP POLICY IF EXISTS "tournaments_select" ON tournaments;
DROP POLICY IF EXISTS "tournaments_insert" ON tournaments;
DROP POLICY IF EXISTS "tournaments_update" ON tournaments;
DROP POLICY IF EXISTS "tournaments_delete" ON tournaments;

-- Create permissive policies that allow all operations without authentication
-- The app handles its own authentication via passwords
CREATE POLICY "tournaments_select" ON tournaments FOR SELECT USING (true);
CREATE POLICY "tournaments_insert" ON tournaments FOR INSERT WITH CHECK (true);
CREATE POLICY "tournaments_update" ON tournaments FOR UPDATE USING (true);
CREATE POLICY "tournaments_delete" ON tournaments FOR DELETE USING (true);
