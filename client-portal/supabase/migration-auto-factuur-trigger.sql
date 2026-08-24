-- Migration: Auto-aanmaak concept factuur bij sprint goedkeuring
-- Voer uit in de Supabase SQL Editor
-- Idempotent: CREATE OR REPLACE FUNCTION + DROP/CREATE TRIGGER IF EXISTS

-- ─── 1. Trigger functie ───────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION auto_create_factuur_on_sprint_approval()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_client_id      UUID;
  v_factuur_exists BOOLEAN;
  v_factuur_nummer TEXT;
  v_title          TEXT;
BEGIN
  -- Alleen actief als client_approved net op TRUE wordt gezet
  -- (vorige waarde was NULL of FALSE, nieuwe waarde is TRUE)
  IF (NEW.client_approved IS NOT TRUE)
     OR (OLD.client_approved IS TRUE) THEN
    RETURN NEW;
  END IF;

  -- Haal client_id op via de offerte
  SELECT o.client_id
  INTO   v_client_id
  FROM   offertes o
  WHERE  o.id = NEW.offerte_id;

  IF v_client_id IS NULL THEN
    RETURN NEW;  -- offerte of client niet gevonden, sla over
  END IF;

  -- Idempotentie: bestaat er al een factuur voor deze sprint?
  SELECT EXISTS(
    SELECT 1 FROM facturen WHERE sprint_id = NEW.id
  ) INTO v_factuur_exists;

  IF v_factuur_exists THEN
    RETURN NEW;  -- al aangemaakt, niets doen
  END IF;

  -- Genereer uniek factuur nummer: AUTO-JJJJ-{eerste 8 tekens sprint UUID}
  v_factuur_nummer := 'AUTO-'
    || to_char(NOW() AT TIME ZONE 'Europe/Amsterdam', 'YYYY')
    || '-'
    || SUBSTRING(NEW.id::text, 1, 8);

  -- Bouw de titel op
  v_title := 'Sprint ' || NEW.number || ' — ' || NEW.title;

  -- Maak concept factuur aan
  -- ON CONFLICT DO NOTHING als extra veiligheid bij race conditions
  INSERT INTO facturen (
    client_id,
    sprint_id,
    factuur_nummer,
    title,
    amount,
    btw_percentage,
    status,
    due_date
  )
  VALUES (
    v_client_id,
    NEW.id,
    v_factuur_nummer,
    v_title,
    NEW.amount,
    21.00,
    'concept',
    NULL
  )
  ON CONFLICT (factuur_nummer) DO NOTHING;

  RETURN NEW;
END;
$$;

-- ─── 2. Trigger aanmaken (idempotent via DROP IF EXISTS) ──────────────────────

DROP TRIGGER IF EXISTS trg_auto_factuur_sprint_approval ON sprints;

CREATE TRIGGER trg_auto_factuur_sprint_approval
  AFTER UPDATE OF client_approved
  ON sprints
  FOR EACH ROW
  EXECUTE FUNCTION auto_create_factuur_on_sprint_approval();

-- ─── Verificatie ──────────────────────────────────────────────────────────────
-- Controleer of trigger is aangemaakt:
-- SELECT trigger_name, event_manipulation, action_timing
-- FROM information_schema.triggers
-- WHERE trigger_name = 'trg_auto_factuur_sprint_approval';
