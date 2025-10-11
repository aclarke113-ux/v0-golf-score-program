-- Replaced old RLS policies with no-op script since app doesn't use Supabase auth

-- This app uses simple password-based authentication, not Supabase auth.users
-- RLS is not needed for this schema
-- This file is kept for backwards compatibility but does nothing

SELECT 'RLS not needed for this app - using simple auth' AS status;
