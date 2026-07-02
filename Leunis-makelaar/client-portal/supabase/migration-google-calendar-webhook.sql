-- Migration: Google Calendar webhook koppeling voor training_sessions
-- Doel:
-- 1. Externe Google events idempotent koppelen aan training_sessions
-- 2. Watch channel + sync token persistent opslaan voor incremental sync

ALTER TABLE training_sessions
  ADD COLUMN IF NOT EXISTS google_calendar_id TEXT,
  ADD COLUMN IF NOT EXISTS google_event_id TEXT,
  ADD COLUMN IF NOT EXISTS google_attendee_email TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS idx_training_sessions_google_event_unique
  ON training_sessions (google_calendar_id, google_event_id)
  WHERE google_calendar_id IS NOT NULL AND google_event_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_training_sessions_google_attendee_email
  ON training_sessions (google_attendee_email)
  WHERE google_attendee_email IS NOT NULL;

CREATE TABLE IF NOT EXISTS google_calendar_watch_state (
  calendar_id TEXT PRIMARY KEY,
  channel_id TEXT,
  resource_id TEXT,
  resource_uri TEXT,
  sync_token TEXT,
  expiration TIMESTAMPTZ,
  last_message_number BIGINT,
  last_synced_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE google_calendar_watch_state ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admin manage google calendar watch state" ON google_calendar_watch_state;
DROP POLICY IF EXISTS "Service role manage google calendar watch state" ON google_calendar_watch_state;
CREATE POLICY "Service role manage google calendar watch state"
  ON google_calendar_watch_state
  FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

CREATE INDEX IF NOT EXISTS idx_google_calendar_watch_state_channel_id
  ON google_calendar_watch_state (channel_id)
  WHERE channel_id IS NOT NULL;
