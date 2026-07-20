-- Migration: Guard communication_notes as admin-only while keeping client consent editable
-- Doel:
-- 1) clients mogen communication_consent aanpassen op hun eigen intake
-- 2) communication_notes mag niet door clients aangepast worden
-- 3) admin routes blijven werken via service role

CREATE OR REPLACE FUNCTION public.prevent_client_communication_notes_update()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Alleen blokkeren voor reguliere client-gebruikers (gekoppeld via client_users).
  IF EXISTS (
    SELECT 1
    FROM client_users cu
    WHERE cu.client_id = NEW.client_id
      AND cu.email = auth.jwt() ->> 'email'
  ) THEN
    IF NEW.communication_notes IS DISTINCT FROM OLD.communication_notes THEN
      RAISE EXCEPTION 'communication_notes mag alleen door admin worden aangepast';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_prevent_client_communication_notes_update ON training_intakes;

CREATE TRIGGER trg_prevent_client_communication_notes_update
BEFORE UPDATE ON training_intakes
FOR EACH ROW
EXECUTE FUNCTION public.prevent_client_communication_notes_update();
