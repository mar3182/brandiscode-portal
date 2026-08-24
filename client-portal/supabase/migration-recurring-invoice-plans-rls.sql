-- Migration: RLS policies voor recurring_invoice_plans
-- De tabel heeft ENABLE ROW LEVEL SECURITY maar géén policies.
-- Dit betekent dat klanten hun eigen plan niet kunnen lezen.

-- Admin policy: volledige toegang (service role omzeilt RLS, maar dit is expliciet)
CREATE POLICY "Admin full access on recurring_invoice_plans"
  ON recurring_invoice_plans
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- Client policy: klanten kunnen alleen hun eigen plan lezen
CREATE POLICY "Clients see own recurring_invoice_plan"
  ON recurring_invoice_plans
  FOR SELECT
  USING (
    client_id IN (
      SELECT id FROM client_users
      WHERE email = auth.jwt() ->> 'email'
    )
  );
