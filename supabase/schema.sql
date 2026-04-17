-- Brand is Code — Client Portal Database Schema
-- Run this in Supabase SQL Editor

-- Clients table
CREATE TABLE clients (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  company TEXT,
  phone TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Offertes (proposals)
CREATE TABLE offertes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  client_id UUID REFERENCES clients(id) ON DELETE CASCADE NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  total_amount NUMERIC(10,2) NOT NULL,
  status TEXT DEFAULT 'verstuurd' CHECK (status IN ('concept', 'verstuurd', 'bekeken', 'getekend', 'afgewezen')),
  pdf_path TEXT,
  signed_at TIMESTAMPTZ,
  signature_data TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Sprints (project phases)
CREATE TABLE sprints (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  offerte_id UUID REFERENCES offertes(id) ON DELETE CASCADE NOT NULL,
  number INTEGER NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  amount NUMERIC(10,2) NOT NULL,
  status TEXT DEFAULT 'gepland' CHECK (status IN ('gepland', 'actief', 'review', 'afgerond')),
  start_date DATE,
  end_date DATE,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Deliverables per sprint
CREATE TABLE deliverables (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  sprint_id UUID REFERENCES sprints(id) ON DELETE CASCADE NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  status TEXT DEFAULT 'todo' CHECK (status IN ('todo', 'in_progress', 'review', 'done')),
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Feedback messages
CREATE TABLE feedback (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  client_id UUID REFERENCES clients(id) ON DELETE CASCADE NOT NULL,
  sprint_id UUID REFERENCES sprints(id) ON DELETE SET NULL,
  message TEXT NOT NULL,
  rating INTEGER CHECK (rating >= 1 AND rating <= 5),
  is_read BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Row Level Security
ALTER TABLE clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE offertes ENABLE ROW LEVEL SECURITY;
ALTER TABLE sprints ENABLE ROW LEVEL SECURITY;
ALTER TABLE deliverables ENABLE ROW LEVEL SECURITY;
ALTER TABLE feedback ENABLE ROW LEVEL SECURITY;

-- Clients can only see their own data
CREATE POLICY "Clients see own profile" ON clients
  FOR SELECT USING (auth.jwt() ->> 'email' = email);

CREATE POLICY "Clients see own offertes" ON offertes
  FOR SELECT USING (
    client_id IN (SELECT id FROM clients WHERE email = auth.jwt() ->> 'email')
  );

CREATE POLICY "Clients see own sprints" ON sprints
  FOR SELECT USING (
    offerte_id IN (
      SELECT o.id FROM offertes o
      JOIN clients c ON c.id = o.client_id
      WHERE c.email = auth.jwt() ->> 'email'
    )
  );

CREATE POLICY "Clients see own deliverables" ON deliverables
  FOR SELECT USING (
    sprint_id IN (
      SELECT s.id FROM sprints s
      JOIN offertes o ON o.id = s.offerte_id
      JOIN clients c ON c.id = o.client_id
      WHERE c.email = auth.jwt() ->> 'email'
    )
  );

-- Clients can create feedback and see their own
CREATE POLICY "Clients create feedback" ON feedback
  FOR INSERT WITH CHECK (
    client_id IN (SELECT id FROM clients WHERE email = auth.jwt() ->> 'email')
  );

CREATE POLICY "Clients see own feedback" ON feedback
  FOR SELECT USING (
    client_id IN (SELECT id FROM clients WHERE email = auth.jwt() ->> 'email')
  );

-- Clients can update offerte signature
CREATE POLICY "Clients sign offertes" ON offertes
  FOR UPDATE USING (
    client_id IN (SELECT id FROM clients WHERE email = auth.jwt() ->> 'email')
  ) WITH CHECK (
    client_id IN (SELECT id FROM clients WHERE email = auth.jwt() ->> 'email')
  );

-- Indexes
CREATE INDEX idx_offertes_client ON offertes(client_id);
CREATE INDEX idx_sprints_offerte ON sprints(offerte_id);
CREATE INDEX idx_deliverables_sprint ON deliverables(sprint_id);
CREATE INDEX idx_feedback_client ON feedback(client_id);
