-- Run in Supabase SQL Editor if profiles table is missing columns
ALTER TABLE IF EXISTS profiles ADD COLUMN IF NOT EXISTS is_active boolean NOT NULL DEFAULT true;
ALTER TABLE IF EXISTS profiles ADD COLUMN IF NOT EXISTS full_name text;
ALTER TABLE IF EXISTS profiles ADD COLUMN IF NOT EXISTS role text DEFAULT 'viewer';
ALTER TABLE IF EXISTS profiles ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT now();
