-- Migration: Sprint goedkeuring/afwijzing + wachtwoord wijzigen features
-- Run dit in de Supabase SQL Editor

-- 1. Voeg 'afgewezen' toe als geldige sprint status
ALTER TABLE sprints DROP CONSTRAINT IF EXISTS sprints_status_check;
ALTER TABLE sprints ADD CONSTRAINT sprints_status_check 
  CHECK (status IN ('gepland', 'actief', 'review', 'afgerond', 'afgewezen'));

-- 2. Voeg kolommen toe voor client goedkeuring
ALTER TABLE sprints ADD COLUMN IF NOT EXISTS client_approved BOOLEAN DEFAULT NULL;
ALTER TABLE sprints ADD COLUMN IF NOT EXISTS client_approved_at TIMESTAMPTZ;
ALTER TABLE sprints ADD COLUMN IF NOT EXISTS client_feedback TEXT;

-- 3. RLS policy: klanten mogen sprints updaten (voor goedkeuring)
CREATE POLICY "Clients approve sprints" ON sprints
  FOR UPDATE USING (
    offerte_id IN (
      SELECT o.id FROM offertes o
      JOIN clients c ON c.id = o.client_id
      WHERE c.email = auth.jwt() ->> 'email'
    )
  ) WITH CHECK (
    offerte_id IN (
      SELECT o.id FROM offertes o
      JOIN clients c ON c.id = o.client_id
      WHERE c.email = auth.jwt() ->> 'email'
    )
  );
