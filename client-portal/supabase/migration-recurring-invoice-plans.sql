-- Migration: recurring invoice plans for monthly subscriptions

CREATE TABLE IF NOT EXISTS recurring_invoice_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL UNIQUE REFERENCES clients(id) ON DELETE CASCADE,
  enabled BOOLEAN NOT NULL DEFAULT FALSE,
  title TEXT,
  description TEXT,
  amount NUMERIC(10,2),
  btw_percentage NUMERIC(5,2) NOT NULL DEFAULT 21.00,
  due_days INTEGER NOT NULL DEFAULT 14,
  send_to TEXT,
  last_generated_month TEXT,
  last_generated_at TIMESTAMPTZ,
  created_by UUID,
  updated_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE recurring_invoice_plans ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_recurring_invoice_plans_enabled
  ON recurring_invoice_plans(enabled);

CREATE INDEX IF NOT EXISTS idx_recurring_invoice_plans_client
  ON recurring_invoice_plans(client_id);
