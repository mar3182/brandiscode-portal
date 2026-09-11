-- Migration: Create funda_descriptions table for saving generated housing descriptions
-- This table stores all generated Funda-tekst results for client reference and admin oversight

-- 1. Create the table
CREATE TABLE IF NOT EXISTS funda_descriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  tool_id UUID NOT NULL REFERENCES ai_tools(id) ON DELETE CASCADE,
  access_id UUID REFERENCES ai_tool_access(id) ON DELETE SET NULL,
  
  -- Form data used for generation (adres, woningtype, etc.)
  form_data JSONB NOT NULL,
  
  -- Generated text content (all media formats)
  generated_text TEXT NOT NULL,
  media_format TEXT NOT NULL DEFAULT 'funda' CHECK (media_format IN ('funda', 'instagram', 'facebook', 'brochure')),
  
  -- Source type: 'manual' (user filled form) or 'synthetic' (AI-generated test data)
  source_type TEXT NOT NULL DEFAULT 'manual' CHECK (source_type IN ('manual', 'synthetic')),
  
  -- Label for synthetic/fictional properties
  synthetic_label TEXT,
  
  -- Images (base64 or URLs)
  images TEXT[],
  
  -- Metadata
  generation_key TEXT,
  token_count INTEGER DEFAULT 0,
  cost_eur NUMERIC(10, 4) DEFAULT 0,
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. Create indexes for fast queries
CREATE INDEX IF NOT EXISTS idx_funda_descriptions_client_id ON funda_descriptions(client_id);
CREATE INDEX IF NOT EXISTS idx_funda_descriptions_tool_id ON funda_descriptions(tool_id);
CREATE INDEX IF NOT EXISTS idx_funda_descriptions_created_at ON funda_descriptions(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_funda_descriptions_source_type ON funda_descriptions(source_type);
CREATE INDEX IF NOT EXISTS idx_funda_descriptions_media_format ON funda_descriptions(media_format);
-- Note: is_synthetic index is created after column is added (see step 3b)

-- 3. Add is_synthetic column if not exists (for backward compatibility)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'funda_descriptions' AND column_name = 'is_synthetic'
  ) THEN
    ALTER TABLE funda_descriptions ADD COLUMN is_synthetic BOOLEAN NOT NULL DEFAULT false;
  END IF;
END $$;

-- 3b. Create partial index on is_synthetic (after column exists)
CREATE INDEX IF NOT EXISTS idx_funda_descriptions_is_synthetic ON funda_descriptions(is_synthetic) WHERE is_synthetic = true;

-- 3c. Add is_admin column to clients if not exists (for admin policy)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'clients' AND column_name = 'is_admin'
  ) THEN
    ALTER TABLE clients ADD COLUMN is_admin BOOLEAN NOT NULL DEFAULT false;
  END IF;
END $$;

-- 4. Update is_synthetic based on source_type
UPDATE funda_descriptions 
SET is_synthetic = (source_type = 'synthetic'),
    synthetic_label = CASE WHEN source_type = 'synthetic' THEN '[FICTIEVE WONING - TESTDATA]' ELSE NULL END
WHERE is_synthetic IS NULL;

-- 5. Row Level Security
ALTER TABLE funda_descriptions ENABLE ROW LEVEL SECURITY;

-- 6. Admin policies (full access)
CREATE POLICY admin_funda_descriptions_all ON funda_descriptions
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM client_users cu
      JOIN clients c ON c.id = cu.client_id
      WHERE cu.user_id = auth.uid() AND c.is_admin = true
    )
  );

-- 7. Client policies (read/write own)
CREATE POLICY client_funda_descriptions_select ON funda_descriptions
  FOR SELECT USING (client_id = (SELECT client_id FROM client_users WHERE user_id = auth.uid()));

CREATE POLICY client_funda_descriptions_insert ON funda_descriptions
  FOR INSERT WITH CHECK (
    client_id = (SELECT client_id FROM client_users WHERE user_id = auth.uid())
  );

CREATE POLICY client_funda_descriptions_update ON funda_descriptions
  FOR UPDATE USING (client_id = (SELECT client_id FROM client_users WHERE user_id = auth.uid()));

-- 8. Trigger for updated_at
CREATE OR REPLACE FUNCTION update_funda_descriptions_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_funda_descriptions_updated_at ON funda_descriptions;
CREATE TRIGGER update_funda_descriptions_updated_at
  BEFORE UPDATE ON funda_descriptions
  FOR EACH ROW
  EXECUTE FUNCTION update_funda_descriptions_updated_at();
