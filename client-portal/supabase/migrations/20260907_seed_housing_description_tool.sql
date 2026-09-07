-- Seed data: Grant Leunis Makelaars access to the existing "Funda Tekst Generator" tool
-- This tool (slug: funda-tekst) already generates housing descriptions for Funda, social media, etc.
-- Do NOT create a duplicate "woningbeschrijving" tool — the real page lives at /dashboard/funda-tekst

INSERT INTO ai_tool_access (tool_id, client_id, access_type, monthly_token_limit, token_reset_day, access_granted_at)
SELECT 
  (SELECT id FROM ai_tools WHERE slug = 'funda-tekst'),
  '81762635-6e58-4731-b88a-9960bfe03983'::UUID,
  'production',
  500000,
  1,
  NOW()
WHERE (SELECT id FROM ai_tools WHERE slug = 'funda-tekst') IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM ai_tool_access 
    WHERE tool_id = (SELECT id FROM ai_tools WHERE slug = 'funda-tekst')
      AND client_id = '81762635-6e58-4731-b88a-9960bfe03983'::UUID
  );
