-- training_slots: admin biedt meerdere tijdsloten aan per intake
-- klant kiest één slot → wordt een training_session (confirmed)

CREATE TABLE IF NOT EXISTS training_slots (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  intake_id     UUID NOT NULL REFERENCES training_intakes(id) ON DELETE CASCADE,
  client_id     UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  slot_start    TIMESTAMPTZ NOT NULL,
  slot_end      TIMESTAMPTZ,
  location_or_link TEXT,
  is_selected   BOOLEAN NOT NULL DEFAULT false,
  selected_at   TIMESTAMPTZ,
  session_id    UUID REFERENCES training_sessions(id) ON DELETE SET NULL,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Index voor snel opzoeken per intake
CREATE INDEX IF NOT EXISTS training_slots_intake_id_idx ON training_slots(intake_id);
CREATE INDEX IF NOT EXISTS training_slots_client_id_idx ON training_slots(client_id);

-- RLS: admin (service role) mag alles
-- client mag alleen eigen slots zien + is_selected updaten via API

ALTER TABLE training_slots ENABLE ROW LEVEL SECURITY;

-- Admin/service role bypasses RLS automatically
-- Client: can read their own slots
CREATE POLICY "clients_can_read_own_slots"
  ON training_slots FOR SELECT
  USING (
    client_id IN (
      SELECT client_id FROM client_users
      WHERE email = auth.email()
    )
  );
