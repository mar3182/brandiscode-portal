-- Migration: Facturen module

CREATE TABLE facturen (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  client_id UUID REFERENCES clients(id) ON DELETE CASCADE NOT NULL,
  sprint_id UUID REFERENCES sprints(id) ON DELETE SET NULL,
  factuur_nummer TEXT UNIQUE NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  amount NUMERIC(10,2) NOT NULL,
  btw_percentage NUMERIC(5,2) DEFAULT 21.00,
  status TEXT DEFAULT 'concept' CHECK (status IN ('concept', 'verstuurd', 'betaald', 'herinnering')),
  issue_date DATE DEFAULT CURRENT_DATE,
  due_date DATE,
  paid_at TIMESTAMPTZ,
  pdf_path TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Berekende kolommen als views (computed in app layer voor compatibiliteit)
-- btw_amount = ROUND(amount * btw_percentage / 100, 2)
-- total_amount = amount + btw_amount

ALTER TABLE facturen ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Clients see own facturen" ON facturen
  FOR SELECT USING (
    client_id IN (SELECT id FROM clients WHERE email = auth.jwt() ->> 'email')
  );

CREATE INDEX idx_facturen_client ON facturen(client_id);
CREATE INDEX idx_facturen_sprint ON facturen(sprint_id);
CREATE INDEX idx_facturen_status ON facturen(status);
