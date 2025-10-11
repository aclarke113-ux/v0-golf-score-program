-- Replaced old social feed schema with no-op since tables already exist

-- Posts, comments, and likes tables already exist in the database
-- with the correct schema (posts, comments tables)
-- This file is kept for backwards compatibility but does nothing

SELECT 'Social feed tables already exist' AS status;
