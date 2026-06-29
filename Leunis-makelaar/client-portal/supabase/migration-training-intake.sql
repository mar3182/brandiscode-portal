-- Migration: Training intake flow for Copilot workshops

CREATE TABLE IF NOT EXISTS training_intakes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  client_id UUID REFERENCES clients(id) ON DELETE CASCADE NOT NULL,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'submitted', 'reviewed', 'planned')),
  training_duration TEXT CHECK (training_duration IN ('2u', '3u')),
  preferred_datetime TIMESTAMPTZ,
  preferred_time_note TEXT,
  contact_person TEXT,
  contact_email TEXT,
  focus_area TEXT NOT NULL DEFAULT 'huizenbeschrijvingen-agent',
  privacy_constraints TEXT,
  data_usage_consent BOOLEAN NOT NULL DEFAULT false,
  communication_channel TEXT CHECK (communication_channel IN ('portal', 'email', 'whatsapp')),
  communication_email TEXT,
  communication_whatsapp TEXT,
  communication_consent BOOLEAN NOT NULL DEFAULT false,
  communication_notes TEXT,
  portal_notifications_enabled BOOLEAN NOT NULL DEFAULT false,
  trainer_notes TEXT,
  submitted_at TIMESTAMPTZ,
  reviewed_at TIMESTAMPTZ,
  planned_at TIMESTAMPTZ,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_by UUID,
  updated_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (client_id)
);

CREATE TABLE IF NOT EXISTS training_intake_members (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  intake_id UUID REFERENCES training_intakes(id) ON DELETE CASCADE NOT NULL,
  client_id UUID REFERENCES clients(id) ON DELETE CASCADE NOT NULL,
  full_name TEXT,
  role TEXT,
  top_tasks TEXT[] NOT NULL DEFAULT '{}'::text[],
  bottleneck TEXT,
  kpi_goal TEXT,
  digital_skill SMALLINT CHECK (digital_skill BETWEEN 1 AND 5),
  ai_experience TEXT,
  prompt_data_boundary TEXT,
  training_day_availability TEXT,
  sort_order INTEGER NOT NULL DEFAULT 0,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS training_sessions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  intake_id UUID REFERENCES training_intakes(id) ON DELETE CASCADE NOT NULL,
  client_id UUID REFERENCES clients(id) ON DELETE CASCADE NOT NULL,
  status TEXT NOT NULL DEFAULT 'proposed' CHECK (status IN ('proposed', 'confirmed', 'completed', 'cancelled')),
  session_start TIMESTAMPTZ,
  session_end TIMESTAMPTZ,
  proposed_duration_hours SMALLINT CHECK (proposed_duration_hours IN (2, 3)),
  location_or_link TEXT,
  agenda TEXT,
  admin_notes TEXT,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_by UUID,
  updated_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_training_intakes_client_id ON training_intakes(client_id);
CREATE INDEX IF NOT EXISTS idx_training_intakes_status ON training_intakes(status);
CREATE INDEX IF NOT EXISTS idx_training_members_intake_id ON training_intake_members(intake_id);
CREATE INDEX IF NOT EXISTS idx_training_members_client_id ON training_intake_members(client_id);
CREATE INDEX IF NOT EXISTS idx_training_sessions_intake_id ON training_sessions(intake_id);
CREATE INDEX IF NOT EXISTS idx_training_sessions_client_id ON training_sessions(client_id);

ALTER TABLE training_intakes ENABLE ROW LEVEL SECURITY;
ALTER TABLE training_intake_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE training_sessions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Clients read own training intakes" ON training_intakes;
DROP POLICY IF EXISTS "Clients create own training intakes" ON training_intakes;
DROP POLICY IF EXISTS "Clients update own training intakes" ON training_intakes;
DROP POLICY IF EXISTS "Clients read own training members" ON training_intake_members;
DROP POLICY IF EXISTS "Clients manage own training members" ON training_intake_members;
DROP POLICY IF EXISTS "Clients read own training sessions" ON training_sessions;

CREATE POLICY "Clients read own training intakes" ON training_intakes
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM client_users cu
      WHERE cu.client_id = training_intakes.client_id
        AND cu.email = auth.jwt() ->> 'email'
    )
  );

CREATE POLICY "Clients create own training intakes" ON training_intakes
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM client_users cu
      WHERE cu.client_id = training_intakes.client_id
        AND cu.email = auth.jwt() ->> 'email'
    )
  );

CREATE POLICY "Clients update own training intakes" ON training_intakes
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM client_users cu
      WHERE cu.client_id = training_intakes.client_id
        AND cu.email = auth.jwt() ->> 'email'
    )
  ) WITH CHECK (
    EXISTS (
      SELECT 1 FROM client_users cu
      WHERE cu.client_id = training_intakes.client_id
        AND cu.email = auth.jwt() ->> 'email'
    )
  );

CREATE POLICY "Clients read own training members" ON training_intake_members
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM client_users cu
      WHERE cu.client_id = training_intake_members.client_id
        AND cu.email = auth.jwt() ->> 'email'
    )
  );

CREATE POLICY "Clients manage own training members" ON training_intake_members
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM client_users cu
      WHERE cu.client_id = training_intake_members.client_id
        AND cu.email = auth.jwt() ->> 'email'
    )
  ) WITH CHECK (
    EXISTS (
      SELECT 1 FROM client_users cu
      WHERE cu.client_id = training_intake_members.client_id
        AND cu.email = auth.jwt() ->> 'email'
    )
  );

CREATE POLICY "Clients read own training sessions" ON training_sessions
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM client_users cu
      WHERE cu.client_id = training_sessions.client_id
        AND cu.email = auth.jwt() ->> 'email'
    )
  );
