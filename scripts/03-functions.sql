-- Replaced old functions with updated_at trigger for tournaments

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Add updated_at triggers to tables that have updated_at column
DROP TRIGGER IF EXISTS set_updated_at_tournaments ON public.tournaments;
CREATE TRIGGER set_updated_at_tournaments
  BEFORE UPDATE ON public.tournaments
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

DROP TRIGGER IF EXISTS set_updated_at_players ON public.players;
CREATE TRIGGER set_updated_at_players
  BEFORE UPDATE ON public.players
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

DROP TRIGGER IF EXISTS set_updated_at_rounds ON public.rounds;
CREATE TRIGGER set_updated_at_rounds
  BEFORE UPDATE ON public.rounds
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

DROP TRIGGER IF EXISTS set_updated_at_player_credits ON public.player_credits;
CREATE TRIGGER set_updated_at_player_credits
  BEFORE UPDATE ON public.player_credits
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

SELECT 'Updated_at triggers created successfully' AS status;
