-- ============================================================================
-- AI Tool Testing Workflow Infrastructure
-- Created: 2026-09-04
-- Purpose: Complete admin testing workflow for AI tools (funda-tekst, funda-multi, verfijn-tekst)
-- Includes: Tool management, client access control, evaluations, feedback, billing, and usage tracking
-- ============================================================================

-- ============================================================================
-- 1. ai_tools - AI tool definitions
-- ============================================================================
CREATE TABLE ai_tools (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  version TEXT DEFAULT '1.0.0',
  status TEXT NOT NULL DEFAULT 'development' CHECK (status IN ('development', 'beta', 'production', 'archived')),
  readiness_percentage INTEGER NOT NULL DEFAULT 0 CHECK (readiness_percentage >= 0 AND readiness_percentage <= 100),
  readiness_notes TEXT,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  published_at TIMESTAMP WITH TIME ZONE,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- ============================================================================
-- 2. ai_tool_access - Client access to tools
-- ============================================================================
CREATE TABLE ai_tool_access (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tool_id UUID NOT NULL REFERENCES ai_tools(id) ON DELETE CASCADE,
  client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  access_type TEXT NOT NULL DEFAULT 'testing' CHECK (access_type IN ('testing', 'beta', 'production')),
  monthly_token_limit INTEGER DEFAULT 500000,
  token_reset_day INTEGER DEFAULT 1 CHECK (token_reset_day >= 1 AND token_reset_day <= 31),
  token_reset_date TIMESTAMP WITH TIME ZONE,
  access_granted_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  access_revoked_at TIMESTAMP WITH TIME ZONE,
  reason_for_access TEXT,
  created_by UUID REFERENCES auth.users(id),
  admin_notes TEXT,
  UNIQUE(tool_id, client_id),
  CHECK (access_revoked_at IS NULL OR access_revoked_at >= access_granted_at)
);

-- ============================================================================
-- 3. ai_evals - Evaluation rounds
-- ============================================================================
CREATE TABLE ai_evals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tool_id UUID NOT NULL REFERENCES ai_tools(id) ON DELETE CASCADE,
  eval_name TEXT NOT NULL,
  eval_type TEXT NOT NULL DEFAULT 'quality' CHECK (eval_type IN ('quality', 'performance', 'user-experience', 'accuracy')),
  description TEXT,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'active', 'completed', 'archived')),
  total_samples INTEGER DEFAULT 0,
  passed_samples INTEGER DEFAULT 0,
  avg_score INTEGER,
  pass_rate INTEGER,
  feedback_summary TEXT,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  completed_at TIMESTAMP WITH TIME ZONE
);

-- ============================================================================
-- 4. ai_eval_results - Individual test results
-- ============================================================================
CREATE TABLE ai_eval_results (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  eval_id UUID NOT NULL REFERENCES ai_evals(id) ON DELETE CASCADE,
  input_json JSONB NOT NULL,
  expected_output TEXT,
  actual_output TEXT,
  score INTEGER CHECK (score >= 0 AND score <= 100),
  passed BOOLEAN DEFAULT FALSE,
  evaluator_comment TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- ============================================================================
-- 5. ai_tool_feedback - Customer feedback
-- ============================================================================
CREATE TABLE ai_tool_feedback (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tool_id UUID NOT NULL REFERENCES ai_tools(id) ON DELETE CASCADE,
  client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  feedback_type TEXT NOT NULL CHECK (feedback_type IN ('bug', 'feature-request', 'quality', 'performance', 'ux')),
  rating INTEGER CHECK (rating >= 1 AND rating <= 5),
  comment TEXT NOT NULL,
  screenshot_url TEXT,
  generated_text_sample TEXT,
  input_sample TEXT,
  status TEXT NOT NULL DEFAULT 'new' CHECK (status IN ('new', 'reviewed', 'acknowledged', 'fixed', 'wontfix')),
  admin_response TEXT,
  admin_response_at TIMESTAMP WITH TIME ZONE,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- ============================================================================
-- 6. ai_usage_daily - Daily token tracking
-- ============================================================================
CREATE TABLE ai_usage_daily (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  tool_id UUID NOT NULL REFERENCES ai_tools(id) ON DELETE CASCADE,
  usage_date DATE NOT NULL,
  tokens_used INTEGER DEFAULT 0,
  request_count INTEGER DEFAULT 0,
  UNIQUE(client_id, tool_id, usage_date)
);

-- ============================================================================
-- 7. ai_billing - Monthly billing records
-- ============================================================================
CREATE TABLE ai_billing (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  tool_id UUID NOT NULL REFERENCES ai_tools(id) ON DELETE CASCADE,
  access_id UUID REFERENCES ai_tool_access(id),
  billing_period_start DATE NOT NULL,
  billing_period_end DATE NOT NULL,
  monthly_token_limit INTEGER DEFAULT 500000,
  tokens_used INTEGER DEFAULT 0,
  overage_tokens INTEGER DEFAULT 0,
  base_price_eur NUMERIC(10, 2) DEFAULT 49.00,
  overage_price_per_1k_tokens NUMERIC(10, 4) DEFAULT 0.01,
  overage_cost_eur NUMERIC(10, 2) DEFAULT 0.00,
  total_cost_eur NUMERIC(10, 2) DEFAULT 49.00,
  invoice_number TEXT UNIQUE,
  invoice_generated_at TIMESTAMP WITH TIME ZONE,
  invoice_pdf_url TEXT,
  invoice_emailed_at TIMESTAMP WITH TIME ZONE,
  payment_status TEXT NOT NULL DEFAULT 'pending' CHECK (payment_status IN ('pending', 'sent', 'paid', 'overdue', 'cancelled')),
  payment_date TIMESTAMP WITH TIME ZONE,
  triggered_by UUID REFERENCES auth.users(id),
  triggered_at TIMESTAMP WITH TIME ZONE,
  admin_notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- ============================================================================
-- Indexes for query performance
-- ============================================================================
CREATE INDEX idx_ai_tool_access_tool_id ON ai_tool_access(tool_id);
CREATE INDEX idx_ai_tool_access_client_id ON ai_tool_access(client_id);
CREATE INDEX idx_ai_tool_access_status ON ai_tool_access(status) WHERE access_revoked_at IS NULL;
CREATE INDEX idx_ai_evals_tool_id ON ai_evals(tool_id);
CREATE INDEX idx_ai_evals_status ON ai_evals(status);
CREATE INDEX idx_ai_eval_results_eval_id ON ai_eval_results(eval_id);
CREATE INDEX idx_ai_tool_feedback_tool_id ON ai_tool_feedback(tool_id);
CREATE INDEX idx_ai_tool_feedback_client_id ON ai_tool_feedback(client_id);
CREATE INDEX idx_ai_tool_feedback_status ON ai_tool_feedback(status);
CREATE INDEX idx_ai_usage_daily_client_id ON ai_usage_daily(client_id);
CREATE INDEX idx_ai_usage_daily_tool_id ON ai_usage_daily(tool_id);
CREATE INDEX idx_ai_usage_daily_date ON ai_usage_daily(usage_date);
CREATE INDEX idx_ai_billing_client_id ON ai_billing(client_id);
CREATE INDEX idx_ai_billing_tool_id ON ai_billing(tool_id);
CREATE INDEX idx_ai_billing_period_start ON ai_billing(billing_period_start);
CREATE INDEX idx_ai_billing_payment_status ON ai_billing(payment_status);

-- ============================================================================
-- Row-Level Security (RLS) Policies
-- ============================================================================

-- Enable RLS on all new tables
ALTER TABLE ai_tools ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_tool_access ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_evals ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_eval_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_tool_feedback ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_usage_daily ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_billing ENABLE ROW LEVEL SECURITY;

-- Admin email (Mary has full access)
-- Clients can view tools and submit feedback

-- ai_tools: Admin full access, clients can read production tools
CREATE POLICY admin_ai_tools_all ON ai_tools
  FOR ALL USING (auth.jwt() ->> 'email' = 'mary@brandiscode.com');

CREATE POLICY client_ai_tools_read ON ai_tools
  FOR SELECT USING (status = 'production');

-- ai_tool_access: Admin full access, clients can read own access
CREATE POLICY admin_ai_tool_access_all ON ai_tool_access
  FOR ALL USING (auth.jwt() ->> 'email' = 'mary@brandiscode.com');

CREATE POLICY client_ai_tool_access_read ON ai_tool_access
  FOR SELECT USING (
    client_id IN (
      SELECT client_id FROM client_users WHERE email = auth.jwt() ->> 'email'
    )
  );

-- ai_evals: Admin full access, clients cannot see
CREATE POLICY admin_ai_evals_all ON ai_evals
  FOR ALL USING (auth.jwt() ->> 'email' = 'mary@brandiscode.com');

-- ai_eval_results: Admin full access, clients cannot see
CREATE POLICY admin_ai_eval_results_all ON ai_eval_results
  FOR ALL USING (auth.jwt() ->> 'email' = 'mary@brandiscode.com');

-- ai_tool_feedback: Admin full access, clients can insert and read own feedback
CREATE POLICY admin_ai_tool_feedback_all ON ai_tool_feedback
  FOR ALL USING (auth.jwt() ->> 'email' = 'mary@brandiscode.com');

CREATE POLICY client_ai_tool_feedback_insert ON ai_tool_feedback
  FOR INSERT WITH CHECK (
    client_id IN (
      SELECT client_id FROM client_users WHERE email = auth.jwt() ->> 'email'
    )
  );

CREATE POLICY client_ai_tool_feedback_read ON ai_tool_feedback
  FOR SELECT USING (
    client_id IN (
      SELECT client_id FROM client_users WHERE email = auth.jwt() ->> 'email'
    )
  );

-- ai_usage_daily: Admin full access, clients can read own usage
CREATE POLICY admin_ai_usage_daily_all ON ai_usage_daily
  FOR ALL USING (auth.jwt() ->> 'email' = 'mary@brandiscode.com');

CREATE POLICY client_ai_usage_daily_read ON ai_usage_daily
  FOR SELECT USING (
    client_id IN (
      SELECT client_id FROM client_users WHERE email = auth.jwt() ->> 'email'
    )
  );

-- ai_billing: Admin full access, clients can read own billing (future: clients might see invoices)
CREATE POLICY admin_ai_billing_all ON ai_billing
  FOR ALL USING (auth.jwt() ->> 'email' = 'mary@brandiscode.com');

-- ============================================================================
-- Helper Functions
-- ============================================================================

-- Get total tokens used in a month for overage calculation
CREATE OR REPLACE FUNCTION get_tokens_used_this_month(
  p_client_id UUID,
  p_tool_id UUID
)
RETURNS INTEGER AS $$
  SELECT COALESCE(SUM(tokens_used), 0)::INTEGER
  FROM ai_usage_daily
  WHERE client_id = p_client_id
    AND tool_id = p_tool_id
    AND DATE_TRUNC('month', usage_date) = DATE_TRUNC('month', CURRENT_DATE);
$$ LANGUAGE SQL STABLE;

-- Calculate overage tokens and cost for a billing period
CREATE OR REPLACE FUNCTION calculate_ai_overage(
  p_client_id UUID,
  p_tool_id UUID,
  p_period_start DATE,
  p_period_end DATE
)
RETURNS TABLE (
  tokens_used INTEGER,
  overage_tokens INTEGER
) AS $$
  SELECT
    COALESCE(SUM(ad.tokens_used), 0)::INTEGER AS tokens_used,
    GREATEST(0, COALESCE(SUM(ad.tokens_used), 0) - 500000)::INTEGER AS overage_tokens
  FROM ai_usage_daily ad
  WHERE ad.client_id = p_client_id
    AND ad.tool_id = p_tool_id
    AND ad.usage_date >= p_period_start
    AND ad.usage_date <= p_period_end;
$$ LANGUAGE SQL STABLE;

-- ============================================================================
-- Sample Data (Initial AI Tools)
-- ============================================================================

INSERT INTO ai_tools (slug, name, description, version, status, readiness_percentage)
VALUES
  ('funda-tekst', 'Funda Tekst Generator', 'Generates property descriptions for real estate listings', '1.0.0', 'development', 0),
  ('funda-multi', 'Funda Multi Tool', 'Multi-language property description generation', '1.0.0', 'development', 0),
  ('verfijn-tekst', 'Tekst Verbetering', 'Refines and improves existing property descriptions', '1.0.0', 'development', 0)
ON CONFLICT (slug) DO NOTHING;
