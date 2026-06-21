-- FinanceOS: link orphaned demo rows, add owner scoping, enable RLS on family tables

UPDATE public.family_members
SET family_id = (SELECT id FROM public.families ORDER BY created_at LIMIT 1)
WHERE family_id IS NULL;

UPDATE public.investments
SET family_id = (SELECT id FROM public.families ORDER BY created_at LIMIT 1)
WHERE family_id IS NULL;

UPDATE public.borrowings
SET family_id = (SELECT id FROM public.families ORDER BY created_at LIMIT 1)
WHERE family_id IS NULL;

ALTER TABLE public.families
  ADD COLUMN IF NOT EXISTS owner_user_id uuid REFERENCES auth.users(id);

CREATE OR REPLACE FUNCTION public.family_accessible(family_uuid uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
  SELECT family_uuid IS NULL
    OR EXISTS (
      SELECT 1
      FROM public.families f
      WHERE f.id = family_uuid
        AND (f.owner_user_id IS NULL OR f.owner_user_id = (SELECT auth.uid()))
    );
$$;

DROP POLICY IF EXISTS public_read_borrowings ON public.borrowings;
DROP POLICY IF EXISTS public_read_family_members ON public.family_members;
DROP POLICY IF EXISTS public_read_investments ON public.investments;

CREATE POLICY families_select ON public.families
  FOR SELECT TO anon, authenticated
  USING (owner_user_id IS NULL OR owner_user_id = (SELECT auth.uid()));

CREATE POLICY families_insert ON public.families
  FOR INSERT TO authenticated
  WITH CHECK (owner_user_id = (SELECT auth.uid()));

CREATE POLICY families_update ON public.families
  FOR UPDATE TO authenticated
  USING (owner_user_id = (SELECT auth.uid()))
  WITH CHECK (owner_user_id = (SELECT auth.uid()));

CREATE POLICY families_delete ON public.families
  FOR DELETE TO authenticated
  USING (owner_user_id = (SELECT auth.uid()));

CREATE POLICY family_members_select ON public.family_members
  FOR SELECT TO anon, authenticated
  USING (public.family_accessible(family_id));

CREATE POLICY family_members_insert ON public.family_members
  FOR INSERT TO authenticated
  WITH CHECK (family_id IS NOT NULL AND public.family_accessible(family_id));

CREATE POLICY family_members_update ON public.family_members
  FOR UPDATE TO authenticated
  USING (family_id IS NOT NULL AND public.family_accessible(family_id));

CREATE POLICY family_members_delete ON public.family_members
  FOR DELETE TO authenticated
  USING (family_id IS NOT NULL AND public.family_accessible(family_id));

CREATE POLICY income_select ON public.income
  FOR SELECT TO anon, authenticated
  USING (public.family_accessible(family_id));

CREATE POLICY income_write ON public.income
  FOR ALL TO authenticated
  USING (public.family_accessible(family_id))
  WITH CHECK (public.family_accessible(family_id));

CREATE POLICY expenses_select ON public.expenses
  FOR SELECT TO anon, authenticated
  USING (public.family_accessible(family_id));

CREATE POLICY expenses_write ON public.expenses
  FOR ALL TO authenticated
  USING (public.family_accessible(family_id))
  WITH CHECK (public.family_accessible(family_id));

CREATE POLICY investments_select ON public.investments
  FOR SELECT TO anon, authenticated
  USING (public.family_accessible(family_id));

CREATE POLICY investments_write ON public.investments
  FOR ALL TO authenticated
  USING (public.family_accessible(family_id))
  WITH CHECK (public.family_accessible(family_id));

CREATE POLICY borrowings_select ON public.borrowings
  FOR SELECT TO anon, authenticated
  USING (public.family_accessible(family_id));

CREATE POLICY borrowings_write ON public.borrowings
  FOR ALL TO authenticated
  USING (public.family_accessible(family_id))
  WITH CHECK (public.family_accessible(family_id));

CREATE POLICY protection_policies_select ON public.protection_policies
  FOR SELECT TO anon, authenticated
  USING (public.family_accessible(family_id));

CREATE POLICY protection_policies_write ON public.protection_policies
  FOR ALL TO authenticated
  USING (public.family_accessible(family_id))
  WITH CHECK (public.family_accessible(family_id));

CREATE POLICY goals_select ON public.goals
  FOR SELECT TO anon, authenticated
  USING (public.family_accessible(family_id));

CREATE POLICY goals_write ON public.goals
  FOR ALL TO authenticated
  USING (public.family_accessible(family_id))
  WITH CHECK (public.family_accessible(family_id));

CREATE POLICY engine_snapshots_select ON public.engine_snapshots
  FOR SELECT TO anon, authenticated
  USING (public.family_accessible(family_id));

CREATE POLICY engine_snapshots_write ON public.engine_snapshots
  FOR ALL TO authenticated
  USING (public.family_accessible(family_id))
  WITH CHECK (public.family_accessible(family_id));

CREATE POLICY networth_snapshots_select ON public.networth_snapshots
  FOR SELECT TO anon, authenticated
  USING (public.family_accessible(family_id));

CREATE POLICY networth_snapshots_write ON public.networth_snapshots
  FOR ALL TO authenticated
  USING (public.family_accessible(family_id))
  WITH CHECK (public.family_accessible(family_id));

CREATE POLICY financial_health_scores_select ON public.financial_health_scores
  FOR SELECT TO anon, authenticated
  USING (public.family_accessible(family_id));

CREATE POLICY financial_health_scores_write ON public.financial_health_scores
  FOR ALL TO authenticated
  USING (public.family_accessible(family_id))
  WITH CHECK (public.family_accessible(family_id));

ALTER TABLE public.families ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.family_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.income ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.investments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.borrowings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.protection_policies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.goals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.engine_snapshots ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.networth_snapshots ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.financial_health_scores ENABLE ROW LEVEL SECURITY;

REVOKE EXECUTE ON FUNCTION public.rls_auto_enable() FROM anon, authenticated;
