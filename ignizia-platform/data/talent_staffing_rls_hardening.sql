-- ============================================================================
-- Talent Staffing RLS hardening
-- ============================================================================
-- Replaces allow-all policies with org-scoped policies.

CREATE OR REPLACE FUNCTION talent_current_org_id()
RETURNS UUID
LANGUAGE plpgsql
STABLE
AS $$
DECLARE
  claims JSONB;
  org TEXT;
BEGIN
  claims := nullif(current_setting('request.jwt.claims', true), '')::jsonb;
  org := claims->>'org_id';
  IF org IS NULL OR org = '' THEN
    RETURN '00000000-0000-0000-0000-000000000001'::uuid;
  END IF;
  RETURN org::uuid;
END;
$$;

DO $$
DECLARE
  t TEXT;
BEGIN
  FOR t IN
    SELECT unnest(ARRAY[
      'talent_projects',
      'talent_project_role_demands',
      'talent_project_demand_skills',
      'talent_project_assignments',
      'talent_project_shortlists',
      'talent_recommendation_runs',
      'talent_recommendation_candidates'
    ])
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I_allow_all ON %I', t, t);
    EXECUTE format('DROP POLICY IF EXISTS %I_org_scope ON %I', t, t);
    EXECUTE format(
      'CREATE POLICY %I_org_scope ON %I FOR ALL USING (org_id = talent_current_org_id()) WITH CHECK (org_id = talent_current_org_id())',
      t, t
    );
  END LOOP;
END
$$;
