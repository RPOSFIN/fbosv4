-- Patch profiles table for auth compatibility (safe re-run)
ALTER TABLE IF EXISTS profiles ADD COLUMN IF NOT EXISTS is_active boolean NOT NULL DEFAULT true;
ALTER TABLE IF EXISTS profiles ADD COLUMN IF NOT EXISTS full_name text;
ALTER TABLE IF EXISTS profiles ADD COLUMN IF NOT EXISTS role text DEFAULT 'viewer';
ALTER TABLE IF EXISTS profiles ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT now();

-- Ensure profile row auto-creation trigger exists
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, role, is_active)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)),
    COALESCE((NEW.raw_user_meta_data->>'role')::text, 'viewer'),
    true
  )
  ON CONFLICT (id) DO UPDATE
    SET email = EXCLUDED.email,
        updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
