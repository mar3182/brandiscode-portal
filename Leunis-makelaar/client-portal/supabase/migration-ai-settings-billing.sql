-- Migration: AI settings + usage events for billing and governance

CREATE TABLE IF NOT EXISTS client_ai_settings (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  client_id UUID REFERENCES clients(id) ON DELETE CASCADE NOT NULL,
  ai_mode TEXT NOT NULL DEFAULT 'managed' CHECK (ai_mode IN ('byok', 'managed', 'hybrid')),
  provider TEXT NOT NULL DEFAULT 'openai' CHECK (provider IN ('openai', 'azure-openai', 'anthropic', 'github-models')),
  listing_generation_model TEXT,
  listing_refinement_model TEXT,
  social_generation_model TEXT,
  brochure_generation_model TEXT,
  managed_bundle TEXT,
  fair_use_limit INTEGER,
  warning_threshold INTEGER NOT NULL DEFAULT 80,
  api_key_encrypted TEXT,
  api_key_last4 TEXT,
  key_status TEXT NOT NULL DEFAULT 'unknown' CHECK (key_status IN ('unknown', 'valid', 'invalid')),
  updated_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (client_id)
);

CREATE TABLE IF NOT EXISTS ai_usage_events (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  client_id UUID REFERENCES clients(id) ON DELETE CASCADE NOT NULL,
  tool_name TEXT NOT NULL,
  provider TEXT NOT NULL,
  model TEXT NOT NULL,
  mode TEXT NOT NULL,
  input_tokens INTEGER,
  output_tokens INTEGER,
  estimated_cost NUMERIC(10, 4),
  request_status TEXT NOT NULL DEFAULT 'success' CHECK (request_status IN ('success', 'error')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_client_ai_settings_client_id ON client_ai_settings(client_id);

CREATE INDEX IF NOT EXISTS idx_ai_usage_events_client_id_created_at
  ON ai_usage_events(client_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_ai_usage_events_client_id_status_created_at
  ON ai_usage_events(client_id, request_status, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_ai_usage_events_client_provider_model
  ON ai_usage_events(client_id, provider, model);

ALTER TABLE client_ai_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_usage_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Clients read own ai settings" ON client_ai_settings;
DROP POLICY IF EXISTS "Clients read own ai usage events" ON ai_usage_events;

CREATE POLICY "Clients read own ai settings" ON client_ai_settings
  FOR SELECT USING (
    EXISTS (
      SELECT 1
      FROM client_users cu
      WHERE cu.client_id = client_ai_settings.client_id
        AND cu.email = auth.jwt() ->> 'email'
    )
  );

CREATE POLICY "Clients read own ai usage events" ON ai_usage_events
  FOR SELECT USING (
    EXISTS (
      SELECT 1
      FROM client_users cu
      WHERE cu.client_id = ai_usage_events.client_id
        AND cu.email = auth.jwt() ->> 'email'
    )
  );
