-- Update handicap_used for Day 2 rounds to match current player handicaps
-- This allows admins to update handicaps between days without affecting Day 1 scores

UPDATE rounds
SET handicap_used = players.handicap
FROM players
WHERE rounds.player_id = players.id
  AND rounds.day = 2
  AND rounds.handicap_used != players.handicap;

-- Display updated rounds
SELECT 
  p.name as player_name,
  r.day,
  r.handicap_used as new_handicap,
  r.submitted
FROM rounds r
JOIN players p ON r.player_id = p.id
WHERE r.day = 2
ORDER BY p.name;
