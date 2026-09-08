-- ============================================================================
-- Evaluation MVP Migration
-- Created: 2026-09-08
-- Purpose: Support Leunis customer evaluation MVP
--   - Structured per-result evaluations (ai_tool_evaluations)
--   - Cost acknowledgement audit trail (ai_billing_consent)
-- ============================================================================

-- ============================================================================
-- 1. ai_tool_evaluations — Structured per-result evaluations
-- ============================================================================
CREATE TABLE IF NOT EXISTS ai_tool_evaluations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  tool_id UUID NOT NULL REFERENCES ai_tools(id) ON DELETE CASCADE,
  result_session_id TEXT NOT NULL,
  channel TEXT NOT NULL CHECK (channel IN ('funda', 'instagram', 'facebook', 'brochure')),
  score_factual_accuracy INTEGER NOT NULL CHECK (score_factual_accuracy BETWEEN 1 AND 5),
  score_completeness INTEGER NOT NULL CHECK (score_completeness BETWEEN 1 AND 5),
  score_leunis_style INTEGER NOT NULL CHECK (score_leunis_style BETWEEN 1 AND 5),
  score_channel_fit INTEGER NOT NULL CHECK (score_channel_fit BETWEEN 1 AND 5),
  score_activation INTEGER NOT NULL CHECK (score_activation BETWEEN 1 AND 5),
  score_readability INTEGER NOT NULL CHECK (score_readability BETWEEN 1 AND 5),
  free_comment TEXT,
  generated_text_sample TEXT,
  input_sample JSONB,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(client_id, tool_id, result_session_id, channel)
);

-- Index for admin read view (client + tool lookups)
CREATE INDEX IF NOT EXISTS idx_ai_tool_evaluations_client_id ON ai_tool_evaluations(client_id);
CREATE INDEX IF NOT EXISTS idx_ai_tool_evaluations_tool_id ON ai_tool_evaluations(tool_id);
CREATE INDEX IF NOT EXISTS idx_ai_tool_evaluations_created_at ON ai_tool_evaluations(created_at DESC);

-- ============================================================================
-- 2. ai_billing_consent — Cost acknowledgement audit trail
-- ============================================================================
CREATE TABLE IF NOT EXISTS ai_billing_consent (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  tool_id UUID NOT NULL REFERENCES ai_tools(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id),
  acknowledgement_text TEXT NOT NULL,
  acknowledged_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(client_id, tool_id)
);

-- Index for consent lookups
CREATE INDEX IF NOT EXISTS idx_ai_billing_consent_client_tool ON ai_billing_consent(client_id, tool_id);

-- ============================================================================
-- 3. Row Level Security — ai_tool_evaluations
-- ============================================================================
ALTER TABLE ai_tool_evaluations ENABLE ROW LEVEL SECURITY;

-- Admin: full access
CREATE POLICY admin_ai_tool_evaluations_all ON ai_tool_evaluations
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM client_users cu
      WHERE cu.email = current_setting('app.current_admin_email', true)
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM client_users cu
      WHERE cu.email = current_setting('app.current_admin_email', true)
    )
  );

-- Clients: INSERT their own, SELECT their own
CREATE POLICY client_ai_tool_evaluations_insert ON ai_tool_evaluations
  FOR INSERT
  WITH CHECK (client_id = (
    SELECT client_id FROM client_users WHERE email = auth.uid()::text
  ));

CREATE POLICY client_ai_tool_evaluations_select ON ai_tool_evaluations
  FOR SELECT
  USING (client_id = (
    SELECT client_id FROM client_users WHERE email = auth.uid()::text
  ));

-- ============================================================================
-- 4. Row Level Security — ai_billing_consent
-- ============================================================================
ALTER TABLE ai_billing_consent ENABLE ROW LEVEL SECURITY;

-- Admin: full access
CREATE POLICY admin_ai_billing_consent_all ON ai_billing_consent
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM client_users cu
      WHERE cu.email = current_setting('app.current_admin_email', true)
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM client_users cu
      WHERE cu.email = current_setting('app.current_admin_email', true)
    )
  );

-- Clients: INSERT only (audit trail — no client SELECT)
CREATE POLICY client_ai_billing_consent_insert ON ai_billing_consent
  FOR INSERT
  WITH CHECK (client_id = (
    SELECT client_id FROM client_users WHERE email = auth.uid()::text
  ));

-- ============================================================================
-- 5. Seed: Ensure funda-tekst tool exists for Leunis (if not already)
-- ============================================================================
INSERT INTO ai_tools (slug, name, description, version, status, readiness_percentage)
VALUES (
  'funda-tekst',
  'Funda Tekst Generator',
  'Genereert professionele Funda-advertentieteksten in de stijl van Leunis Makelaars',
  '1.0.0',
  'production',
  100
)
ON CONFLICT (slug) DO NOTHING;

-- Seed: Grant Leunis access to funda-tekst (if not already)
INSERT INTO ai_tool_access (tool_id, client_id, access_type, monthly_token_limit, access_granted_at)
VALUES (
  (SELECT id FROM ai_tools WHERE slug = 'funda-tekst'),
  '81762635-6e58-4731-b88a-9960bfe03983',
  'production',
  500000,
  now()
)
ON CONFLICT (tool_id, client_id) DO NOTHING;
