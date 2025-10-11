-- Add tee time fields to groups table
ALTER TABLE groups ADD COLUMN IF NOT EXISTS tee_time TIMESTAMPTZ;
ALTER TABLE groups ADD COLUMN IF NOT EXISTS starting_hole INTEGER DEFAULT 1 CHECK (starting_hole IN (1, 10));

-- Create tee time notifications table
CREATE TABLE IF NOT EXISTS tee_time_notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id UUID NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
  notification_type VARCHAR(20) NOT NULL CHECK (notification_type IN ('24_hours', '1_hour', '10_minutes')),
  scheduled_for TIMESTAMPTZ NOT NULL,
  sent BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_tee_notifications_scheduled ON tee_time_notifications(scheduled_for, sent);
CREATE INDEX IF NOT EXISTS idx_tee_notifications_group ON tee_time_notifications(group_id);

-- RLS for tee time notifications
ALTER TABLE tee_time_notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Competition members can view tee time notifications"
  ON tee_time_notifications FOR SELECT
  USING (
    group_id IN (
      SELECT g.id FROM groups g
      JOIN competitions c ON g.competition_id = c.id
      JOIN competition_members cm ON cm.competition_id = c.id
      WHERE cm.user_id = auth.uid()
    )
  );

-- Function to create tee time notifications
CREATE OR REPLACE FUNCTION create_tee_time_notifications()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.tee_time IS NOT NULL THEN
    -- Delete old notifications for this group
    DELETE FROM tee_time_notifications WHERE group_id = NEW.id;
    
    -- Create 24 hour notification
    IF NEW.tee_time > NOW() + INTERVAL '24 hours' THEN
      INSERT INTO tee_time_notifications (group_id, notification_type, scheduled_for)
      VALUES (NEW.id, '24_hours', NEW.tee_time - INTERVAL '24 hours');
    END IF;
    
    -- Create 1 hour notification
    IF NEW.tee_time > NOW() + INTERVAL '1 hour' THEN
      INSERT INTO tee_time_notifications (group_id, notification_type, scheduled_for)
      VALUES (NEW.id, '1_hour', NEW.tee_time - INTERVAL '1 hour');
    END IF;
    
    -- Create 10 minute notification
    IF NEW.tee_time > NOW() + INTERVAL '10 minutes' THEN
      INSERT INTO tee_time_notifications (group_id, notification_type, scheduled_for)
      VALUES (NEW.id, '10_minutes', NEW.tee_time - INTERVAL '10 minutes');
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_create_tee_time_notifications
AFTER INSERT OR UPDATE OF tee_time ON groups
FOR EACH ROW EXECUTE FUNCTION create_tee_time_notifications();
