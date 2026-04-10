-- ============================================================================
-- Safe Migration: Canonical Talent Model + Org Projection Links
-- ----------------------------------------------------------------------------
-- Goal:
-- 1) Keep talent_* as canonical records for departments/roles/employees.
-- 2) Make org_nodes/org_edges a projection with explicit links to canonical IDs.
-- 3) Backfill links without destructive table resets.
-- ============================================================================

DO $$
DECLARE
  v_org_id uuid := '00000000-0000-0000-0000-000000000001'::uuid;
  v_root_id uuid;
BEGIN
  -- Additive columns (safe if already applied)
  ALTER TABLE public.org_nodes ADD COLUMN IF NOT EXISTS entity_type text null;
  ALTER TABLE public.org_nodes ADD COLUMN IF NOT EXISTS talent_department_id text null;
  ALTER TABLE public.org_nodes ADD COLUMN IF NOT EXISTS talent_role_id text null;
  ALTER TABLE public.org_nodes ADD COLUMN IF NOT EXISTS talent_employee_id text null;

  -- Optional role multi-department links (canonical extension)
  CREATE TABLE IF NOT EXISTS public.talent_role_department_links (
    org_id uuid NOT NULL,
    role_id text NOT NULL,
    dept_id text NOT NULL,
    updated_at timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT talent_role_department_links_pkey PRIMARY KEY (org_id, role_id, dept_id)
  );

  CREATE INDEX IF NOT EXISTS idx_talent_role_department_links_role
    ON public.talent_role_department_links (org_id, role_id);
  CREATE INDEX IF NOT EXISTS idx_talent_role_department_links_dept
    ON public.talent_role_department_links (org_id, dept_id);

  -- Keep root generic and stable
  SELECT id
  INTO v_root_id
  FROM public.org_nodes
  WHERE org_id = v_org_id
    AND node_type = 'root'
  ORDER BY created_at ASC
  LIMIT 1;

  IF v_root_id IS NOT NULL THEN
    UPDATE public.org_nodes
    SET
      name = 'Factory One',
      entity_type = COALESCE(entity_type, 'organization'),
      updated_at = now()
    WHERE id = v_root_id;
  END IF;

  -- Backfill entity_type defaults from legacy node_type
  UPDATE public.org_nodes
  SET entity_type = CASE
      WHEN node_type = 'root' THEN 'organization'
      WHEN node_type = 'department' THEN 'department'
      WHEN node_type = 'role' THEN 'role'
      WHEN node_type = 'position' THEN 'employee'
      WHEN node_type = 'team' THEN 'team'
      ELSE 'position'
    END
  WHERE entity_type IS NULL;

  -- Backfill department links by normalized name
  UPDATE public.org_nodes n
  SET talent_department_id = d.dept_id
  FROM public.talent_departments d
  WHERE n.org_id = d.org_id
    AND n.org_id = v_org_id
    AND n.node_type = 'department'
    AND n.talent_department_id IS NULL
    AND lower(regexp_replace(n.name, '[^a-z0-9]+', '', 'g')) =
        lower(regexp_replace(d.name, '[^a-z0-9]+', '', 'g'));

  -- Backfill role links by direct role name match first
  UPDATE public.org_nodes n
  SET talent_role_id = r.role_id
  FROM public.talent_roles r
  WHERE n.org_id = r.org_id
    AND n.org_id = v_org_id
    AND n.node_type = 'role'
    AND n.talent_role_id IS NULL
    AND lower(regexp_replace(n.name, '[^a-z0-9]+', '', 'g')) =
        lower(regexp_replace(r.name, '[^a-z0-9]+', '', 'g'));

  -- Backfill employee links for person/position nodes by name
  UPDATE public.org_nodes n
  SET talent_employee_id = e.employee_id
  FROM public.talent_employees e
  WHERE n.org_id = e.org_id
    AND n.org_id = v_org_id
    AND n.node_type = 'position'
    AND n.talent_employee_id IS NULL
    AND lower(regexp_replace(n.name, '[^a-z0-9]+', '', 'g')) =
        lower(regexp_replace(e.name, '[^a-z0-9]+', '', 'g'));

  -- Seed canonical role-department links from legacy talent_roles.department_id
  INSERT INTO public.talent_role_department_links (org_id, role_id, dept_id, updated_at)
  SELECT r.org_id, r.role_id, r.department_id, now()
  FROM public.talent_roles r
  WHERE r.org_id = v_org_id
    AND r.department_id IS NOT NULL
  ON CONFLICT (org_id, role_id, dept_id) DO UPDATE
  SET updated_at = EXCLUDED.updated_at;
END $$;

-- ----------------------------------------------------------------------------
-- Validation queries (run manually)
-- ----------------------------------------------------------------------------
-- 1) Canonical records missing org node links:
-- SELECT 'department' AS entity, d.dept_id AS id
-- FROM talent_departments d
-- LEFT JOIN org_nodes n
--   ON n.org_id = d.org_id AND n.talent_department_id = d.dept_id
-- WHERE d.org_id = '00000000-0000-0000-0000-000000000001'::uuid
--   AND n.id IS NULL
-- UNION ALL
-- SELECT 'role' AS entity, r.role_id AS id
-- FROM talent_roles r
-- LEFT JOIN org_nodes n
--   ON n.org_id = r.org_id AND n.talent_role_id = r.role_id
-- WHERE r.org_id = '00000000-0000-0000-0000-000000000001'::uuid
--   AND n.id IS NULL
-- UNION ALL
-- SELECT 'employee' AS entity, e.employee_id AS id
-- FROM talent_employees e
-- LEFT JOIN org_nodes n
--   ON n.org_id = e.org_id AND n.talent_employee_id = e.employee_id
-- WHERE e.org_id = '00000000-0000-0000-0000-000000000001'::uuid
--   AND n.id IS NULL;
--
-- 2) Orphan projection links:
-- SELECT n.id, n.name, n.talent_department_id, n.talent_role_id, n.talent_employee_id
-- FROM org_nodes n
-- LEFT JOIN talent_departments d
--   ON d.org_id = n.org_id AND d.dept_id = n.talent_department_id
-- LEFT JOIN talent_roles r
--   ON r.org_id = n.org_id AND r.role_id = n.talent_role_id
-- LEFT JOIN talent_employees e
--   ON e.org_id = n.org_id AND e.employee_id = n.talent_employee_id
-- WHERE n.org_id = '00000000-0000-0000-0000-000000000001'::uuid
--   AND (
--     (n.talent_department_id IS NOT NULL AND d.dept_id IS NULL)
--     OR (n.talent_role_id IS NOT NULL AND r.role_id IS NULL)
--     OR (n.talent_employee_id IS NOT NULL AND e.employee_id IS NULL)
--   );
