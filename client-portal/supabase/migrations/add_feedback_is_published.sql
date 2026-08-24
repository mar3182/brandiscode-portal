-- Migration: Add is_published column to feedback table
-- Run in Supabase SQL Editor

ALTER TABLE feedback
  ADD COLUMN IF NOT EXISTS is_published BOOLEAN DEFAULT false;
