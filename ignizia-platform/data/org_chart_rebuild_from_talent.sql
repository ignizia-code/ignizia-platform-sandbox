-- ============================================================================
-- DEPRECATED: use data/org_chart_fix_one_go.sql instead.
-- ============================================================================
-- Rebuild Org Chart Projection from Canonical Talent Tables
-- ----------------------------------------------------------------------------
-- Use when org_nodes/org_edges are stale or contain old mock structure.
-- Canonical source of truth remains:
--   - talent_departments
--   - talent_roles
--   - talent_employees
--
-- This script:
-- 1) Normalizes role -> department assignment for known O*NET roles
-- 2) Clears projected role/employee nodes and related edges
-- 3) Recreates role nodes under correct departments (Chief Executives under root)
-- 4) Recreates employee nodes as child nodes under each role (linked by talent_employee_id)
-- 5) Rebuilds reports_to edges for role hierarchy
-- ============================================================================

BEGIN;

DO $$
DECLARE
  v_org_id uuid := '00000000-0000-0000-0000-000000000001'::uuid;
  v_root_id uuid;
BEGIN
  -- Ensure projection-link columns exist
  ALTER TABLE public.org_nodes ADD COLUMN IF NOT EXISTS entity_type text null;
  ALTER TABLE public.org_nodes ADD COLUMN IF NOT EXISTS talent_department_id text null;
  ALTER TABLE public.org_nodes ADD COLUMN IF NOT EXISTS talent_role_id text null;
  ALTER TABLE public.org_nodes ADD COLUMN IF NOT EXISTS talent_employee_id text null;

  SELECT id
  INTO v_root_id
  FROM public.org_nodes
  WHERE org_id = v_org_id
    AND node_type = 'root'
  ORDER BY created_at ASC
  LIMIT 1;

  IF v_root_id IS NULL THEN
    INSERT INTO public.org_nodes (
      org_id, parent_id, node_type, entity_type, name, description, metadata, display_order, is_vacant, headcount, updated_at
    ) VALUES (
      v_org_id, NULL, 'root', 'organization', 'Factory One',
      'Reference manufacturing organization', '{}'::jsonb, 0, false, 1, now()
    )
    RETURNING id INTO v_root_id;
  END IF;

  -- Keep root normalized
  UPDATE public.org_nodes
  SET
    entity_type = 'organization',
    updated_at = now()
  WHERE id = v_root_id;

  -- Normalize known role -> department mapping so projection is logical.
  -- You can adjust these dept IDs later if your org model changes.
  UPDATE public.talent_roles
  SET
    department_id = CASE
      WHEN onet_soc_code = '11-1011.00' THEN NULL       -- Chief Executives (root-level leadership)
      WHEN onet_soc_code = '11-1021.00' THEN 'dept-1'   -- General and Operations Managers
      WHEN onet_soc_code = '11-3121.00' THEN 'dept-6'   -- Human Resources Managers
      WHEN onet_soc_code = '17-2112.03' THEN 'dept-1'   -- Manufacturing Engineers
      WHEN onet_soc_code = '41-4011.00' THEN 'dept-5'   -- Sales reps (mapped to Procurement)
      WHEN onet_soc_code = '41-4012.00' THEN 'dept-5'   -- Sales reps (technical/scientific)
      WHEN onet_soc_code = '51-9195.03' THEN 'dept-1'   -- Stone Cutters and Carvers, Manufacturing
      WHEN onet_soc_code = '51-9195.05' THEN 'dept-1'   -- Potters, Manufacturing
      ELSE department_id
    END,
    updated_at = now()
  WHERE org_id = v_org_id;

  -- Clear old projected role/employee nodes (and their edges) only.
  DELETE FROM public.org_nodes
  WHERE org_id = v_org_id
    AND (
      (entity_type = 'employee')
      OR (node_type = 'position')
      OR (entity_type = 'role')
      OR (node_type = 'role')
    );

  -- Recreate role nodes from canonical talent_roles.
  INSERT INTO public.org_nodes (
    org_id,
    parent_id,
    node_type,
    entity_type,
    name,
    description,
    metadata,
    display_order,
    is_vacant,
    headcount,
    talent_role_id,
    updated_at
  )
  SELECT
    r.org_id,
    CASE
      WHEN r.onet_soc_code = '11-1011.00' THEN v_root_id
      ELSE d.id
    END AS parent_id,
    'role' AS node_type,
    'role' AS entity_type,
    r.name,
    NULLIF(r.description, ''),
    '{}'::jsonb,
    row_number() OVER (
      PARTITION BY CASE
        WHEN r.onet_soc_code = '11-1011.00' THEN v_root_id
        ELSE d.id
      END
      ORDER BY r.name, r.role_id
    ) - 1,
    false,
    1,
    r.role_id,
    now()
  FROM public.talent_roles r
  LEFT JOIN public.org_nodes d
    ON d.org_id = r.org_id
   AND d.node_type = 'department'
   AND d.talent_department_id = r.department_id
  WHERE r.org_id = v_org_id
    AND (
      r.onet_soc_code = '11-1011.00'
      OR d.id IS NOT NULL
    );

  -- Recreate employee nodes under their canonical role.
  INSERT INTO public.org_nodes (
    org_id,
    parent_id,
    node_type,
    entity_type,
    name,
    description,
    metadata,
    display_order,
    is_vacant,
    headcount,
    talent_employee_id,
    updated_at
  )
  SELECT
    e.org_id,
    role_node.id AS parent_id,
    'position' AS node_type,
    'employee' AS entity_type,
    e.name,
    COALESCE(role_row.name, 'Employee role'),
    '{}'::jsonb,
    row_number() OVER (PARTITION BY e.role_id ORDER BY e.name, e.employee_id) - 1,
    false,
    1,
    e.employee_id,
    now()
  FROM public.talent_employees e
  JOIN public.org_nodes role_node
    ON role_node.org_id = e.org_id
   AND role_node.talent_role_id = e.role_id
  LEFT JOIN public.talent_roles role_row
    ON role_row.org_id = e.org_id
   AND role_row.role_id = e.role_id
  WHERE e.org_id = v_org_id;

  -- Rebuild role reporting edges only.
  DELETE FROM public.org_edges
  WHERE org_id = v_org_id
    AND edge_type = 'reports_to'
    AND source_id IN (
      SELECT id FROM public.org_nodes
      WHERE org_id = v_org_id
        AND node_type = 'role'
    );

  -- Target hierarchy:
  -- General and Operations Managers -> Chief Executives
  -- Human Resources Managers -> Chief Executives
  -- Manufacturing Engineers -> General and Operations Managers
  -- Remaining normal roles -> General and Operations Managers
  INSERT INTO public.org_edges (org_id, source_id, target_id, edge_type, metadata)
  SELECT
    v_org_id,
    src.id,
    tgt.id,
    'reports_to',
    '{}'::jsonb
  FROM public.org_nodes src
  JOIN public.talent_roles src_role
    ON src_role.org_id = src.org_id
   AND src_role.role_id = src.talent_role_id
  JOIN public.org_nodes tgt
    ON tgt.org_id = src.org_id
   AND tgt.talent_role_id = (
     CASE
       WHEN src_role.onet_soc_code = '11-1021.00' THEN 'onet-11-1011.00'
       WHEN src_role.onet_soc_code = '11-3121.00' THEN 'onet-11-1011.00'
       WHEN src_role.onet_soc_code = '17-2112.03' THEN 'onet-11-1021.00'
       WHEN src_role.onet_soc_code IN ('41-4011.00', '41-4012.00', '51-9195.03', '51-9195.05') THEN 'onet-11-1021.00'
       ELSE NULL
     END
   )
  WHERE src.org_id = v_org_id
    AND src.node_type = 'role'
    AND src.talent_role_id IS NOT NULL
    AND src.talent_role_id <> 'onet-11-1011.00'
    AND (
      src_role.onet_soc_code IN (
        '11-1021.00',
        '11-3121.00',
        '17-2112.03',
        '41-4011.00',
        '41-4012.00',
        '51-9195.03',
        '51-9195.05'
      )
    )
  ON CONFLICT (source_id, target_id, edge_type) DO NOTHING;
END $$;

COMMIT;

-- ============================================================================
-- Quick verification
-- ----------------------------------------------------------------------------
-- SELECT node_type, entity_type, name, talent_role_id, talent_employee_id, parent_id
-- FROM public.org_nodes
-- WHERE org_id = '00000000-0000-0000-0000-000000000001'
-- ORDER BY
--   CASE node_type WHEN 'root' THEN 0 WHEN 'department' THEN 1 WHEN 'role' THEN 2 WHEN 'position' THEN 3 ELSE 9 END,
--   display_order,
--   name;
-- ============================================================================
