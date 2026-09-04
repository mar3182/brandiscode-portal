-- Brand is Code — Client Slug Migration
-- Voeg een unieke slug toe aan elke client voor URL routing

-- 1. Voeg slug kolom toe (als hij nog niet bestaat)
ALTER TABLE clients ADD COLUMN IF NOT EXISTS slug TEXT;

-- 2. Maak index voor betere query performance (als hij nog niet bestaat)
CREATE INDEX IF NOT EXISTS idx_clients_slug ON clients(slug);

-- 3. Controleer of er al clients met slug bestaan
-- SELECT id, company, slug FROM clients WHERE slug IS NOT NULL;

-- 4. Genereer unieke slugs op basis van company naam
-- "Leunis Makelaars" → "leunis-makelaars"
-- Voeg '_1', '_2' etc. toe als slug al bestaat
WITH generated AS (
  SELECT 
    id,
    LOWER(
      REGEXP_REPLACE(
        REGEXP_REPLACE(LOWER(COALESCE(company, '')), '[^a-z0-9\s-]', '', 'g'),
        '\s+', '-', 'g'
      )
    ) as base_slug
  FROM clients
  WHERE slug IS NULL AND COALESCE(company, '') != ''
),
numbered AS (
  SELECT 
    g.id,
    g.base_slug,
    ROW_NUMBER() OVER (PARTITION BY g.base_slug ORDER BY g.id) as rn
  FROM generated g
)
UPDATE clients c
SET slug = n.base_slug || CASE 
  WHEN n.rn > 1 THEN '_' || (n.rn - 1)
  ELSE ''
END
FROM numbered n
WHERE c.id = n.id;

-- 5. Voeg UNIQUE constraint toe nadat alle slugs zijn ingevuld
-- (alleen uitvoeren als alle clients een slug hebben)
-- ALTER TABLE clients ADD CONSTRAINT clients_slug_unique UNIQUE (slug);

-- Voorbeeld: hoe een nieuwe client een slug krijgt bij aanmaak
-- INSERT INTO clients (email, name, company, slug)
-- VALUES (
--   'contact@voorbeeld.nl',
--   'Jan Jansen',
--   'Voorbeeld Bedrijf',
--   'voorbeeld-bedrijf'
-- );
