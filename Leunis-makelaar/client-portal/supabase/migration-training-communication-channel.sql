-- Migration: Communication preference fields for training intake
-- Gebruik: alleen uitvoeren op bestaande omgevingen waar migration-training-intake.sql
-- al is uitgevoerd (production/staging). Nieuwe omgevingen krijgen alle kolommen
-- via migration-training-intake.sql — deze migratie is dan een no-op (IF NOT EXISTS).
-- Dekt: channel, email, whatsapp, consent, notes, portal_notifications.
-- migration-training-communication-preferences.sql is vervallen (redundant, verwijderd 2026-06-29).

ALTER TABLE training_intakes
  ADD COLUMN IF NOT EXISTS communication_channel TEXT CHECK (communication_channel IN ('portal', 'email', 'whatsapp')),
  ADD COLUMN IF NOT EXISTS communication_email TEXT,
  ADD COLUMN IF NOT EXISTS communication_whatsapp TEXT,
  ADD COLUMN IF NOT EXISTS communication_consent BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS communication_notes TEXT,
  ADD COLUMN IF NOT EXISTS portal_notifications_enabled BOOLEAN NOT NULL DEFAULT false;
