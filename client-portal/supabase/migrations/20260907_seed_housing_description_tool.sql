-- Seed data: Add "Woningbeschrijving" AI tool for Leunis Makelaars
-- This tool is for generating property descriptions (Funda, Instagram, Facebook, Brochure)

-- Insert the Woningbeschrijving tool
INSERT INTO ai_tools (slug, name, description, version, status, readiness_percentage, readiness_notes, published_at)
VALUES (
  'woningbeschrijving',
  'Woningbeschrijving Generator',
  'Genereer professionele woningbeschrijvingen voor Funda, Instagram, Facebook en brochures. Ondersteunt aanpassingen per marksegment en stijl.',
  '1.0.0',
  'production',
  95,
  'Fully tested and production-ready. Supports multiple formats and languages.',
  NOW()
)
ON CONFLICT (slug) DO NOTHING;

-- Grant access to Leunis Makelaars (client_id: 81762635-6e58-4731-b88a-9960bfe03983)
INSERT INTO ai_tool_access (tool_id, client_id, access_type, monthly_token_limit, token_reset_day, access_granted_at)
SELECT 
  (SELECT id FROM ai_tools WHERE slug = 'woningbeschrijving'),
  '81762635-6e58-4731-b88a-9960bfe03983'::UUID,
  'managed',
  500000,
  1,
  NOW()
WHERE (SELECT id FROM ai_tools WHERE slug = 'woningbeschrijving') IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM ai_tool_access 
    WHERE tool_id = (SELECT id FROM ai_tools WHERE slug = 'woningbeschrijving')
      AND client_id = '81762635-6e58-4731-b88a-9960bfe03983'::UUID
  );
