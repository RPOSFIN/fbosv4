-- Optional manual patch: align legacy followups table with FBOS API expectations.
-- Run in Supabase SQL Editor if GET /api/followups fails with missing next_followup.

ALTER TABLE IF EXISTS followups ADD COLUMN IF NOT EXISTS lead_id uuid;
ALTER TABLE IF EXISTS followups ADD COLUMN IF NOT EXISTS company_name text;
ALTER TABLE IF EXISTS followups ADD COLUMN IF NOT EXISTS contact_person text;
ALTER TABLE IF EXISTS followups ADD COLUMN IF NOT EXISTS next_followup date;
ALTER TABLE IF EXISTS followups ADD COLUMN IF NOT EXISTS followup_date date;
ALTER TABLE IF EXISTS followups ADD COLUMN IF NOT EXISTS status text DEFAULT 'Pending';
ALTER TABLE IF EXISTS followups ADD COLUMN IF NOT EXISTS notes text;
ALTER TABLE IF EXISTS followups ADD COLUMN IF NOT EXISTS created_by uuid;
ALTER TABLE IF EXISTS followups ADD COLUMN IF NOT EXISTS updated_by uuid;
ALTER TABLE IF EXISTS followups ADD COLUMN IF NOT EXISTS created_at timestamptz DEFAULT now();
ALTER TABLE IF EXISTS followups ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT now();

-- Backfill next_followup from legacy followup_date if present
UPDATE followups
SET next_followup = followup_date
WHERE next_followup IS NULL AND followup_date IS NOT NULL;

-- Optional FK (skip if leads table incompatible)
-- ALTER TABLE followups
--   ADD CONSTRAINT followups_lead_id_fkey
--   FOREIGN KEY (lead_id) REFERENCES leads(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_followups_next ON followups(next_followup);
