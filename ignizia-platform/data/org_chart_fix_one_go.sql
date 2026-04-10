-- ============================================================================
-- ONE-GO ORG CHART FIX (logical hierarchy + employee restoration)
-- ----------------------------------------------------------------------------
-- Goal:
-- - Restore intended employee role assignments
-- - Rebuild org projection as:
--   Org -> Departments -> Roles -> Employees
-- - Add a small "junior-role under senior employee" proof path:
--   Pedram -> (Stone Cutters, Potters roles) -> assigned employees
-- - Keep canonical links intact:
--   org_nodes.talent_role_id, org_nodes.talent_employee_id
-- ============================================================================

BEGIN;

DO $$
DECLARE
  v_org_id uuid := '00000000-0000-0000-0000-000000000001'::uuid;
  v_root_id uuid;
  v_alex_node_id uuid;

  v_role_ce text;
  v_role_ops text;
  v_role_hr text;
  v_role_mfg text;
  v_role_sales_1 text;
  v_role_sales_2 text;
  v_role_stone text;
  v_role_potters text;

  v_pedram_node_id uuid;
BEGIN
  -- Resolve canonical role IDs from O*NET SOC (no hardcoded role_id assumptions).
  SELECT role_id INTO v_role_ce FROM public.talent_roles WHERE org_id = v_org_id AND onet_soc_code = '11-1011.00' LIMIT 1;
  SELECT role_id INTO v_role_ops FROM public.talent_roles WHERE org_id = v_org_id AND onet_soc_code = '11-1021.00' LIMIT 1;
  SELECT role_id INTO v_role_hr FROM public.talent_roles WHERE org_id = v_org_id AND onet_soc_code = '11-3121.00' LIMIT 1;
  SELECT role_id INTO v_role_mfg FROM public.talent_roles WHERE org_id = v_org_id AND onet_soc_code = '17-2112.03' LIMIT 1;
  SELECT role_id INTO v_role_sales_1 FROM public.talent_roles WHERE org_id = v_org_id AND onet_soc_code = '41-4011.00' LIMIT 1;
  SELECT role_id INTO v_role_sales_2 FROM public.talent_roles WHERE org_id = v_org_id AND onet_soc_code = '41-4012.00' LIMIT 1;
  SELECT role_id INTO v_role_stone FROM public.talent_roles WHERE org_id = v_org_id AND onet_soc_code = '51-9195.03' LIMIT 1;
  SELECT role_id INTO v_role_potters FROM public.talent_roles WHERE org_id = v_org_id AND onet_soc_code = '51-9195.05' LIMIT 1;

  IF v_role_ce IS NULL OR v_role_ops IS NULL OR v_role_hr IS NULL OR v_role_mfg IS NULL
     OR v_role_sales_1 IS NULL OR v_role_sales_2 IS NULL OR v_role_stone IS NULL OR v_role_potters IS NULL THEN
    RAISE EXCEPTION 'Missing one or more required O*NET roles. Verify talent_roles has SOC codes: 11-1011.00, 11-1021.00, 11-3121.00, 17-2112.03, 41-4011.00, 41-4012.00, 51-9195.03, 51-9195.05';
  END IF;

  -- Keep the 4 key employees exactly as requested.
  UPDATE public.talent_employees
  SET role_id = CASE
    WHEN lower(trim(name)) = 'alex' THEN v_role_ce
    WHEN lower(trim(name)) = 'pedram' THEN v_role_ops
    WHEN lower(trim(name)) IN ('alice', 'alice chen') THEN v_role_hr
    WHEN lower(trim(name)) IN ('bob', 'bob smith') THEN v_role_mfg
    ELSE role_id
  END,
  updated_at = now()
  WHERE org_id = v_org_id
    AND lower(trim(name)) IN ('alex', 'pedram', 'alice', 'alice chen', 'bob', 'bob smith');

  -- Remaining employees must be normal (non-leadership, non-technical-lead) roles.
  WITH normal_roles AS (
    SELECT *
    FROM (
      VALUES
        (1, v_role_sales_1),
        (2, v_role_sales_2),
        (3, v_role_stone),
        (4, v_role_potters)
    ) AS x(ord, role_id)
  ),
  to_reassign AS (
    SELECT
      e.employee_id,
      row_number() OVER (ORDER BY e.name, e.employee_id) AS rn
    FROM public.talent_employees e
    WHERE e.org_id = v_org_id
      AND e.role_id IN (v_role_ce, v_role_ops, v_role_hr, v_role_mfg)
      AND lower(trim(e.name)) NOT IN ('alex', 'pedram', 'alice', 'alice chen', 'bob', 'bob smith')
  )
  UPDATE public.talent_employees e
  SET
    role_id = nr.role_id,
    updated_at = now()
  FROM to_reassign tr
  JOIN normal_roles nr ON nr.ord = ((tr.rn - 1) % 4) + 1
  WHERE e.org_id = v_org_id
    AND e.employee_id = tr.employee_id;

  -- Ensure root exists.
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

  UPDATE public.org_nodes
  SET entity_type = CASE
      WHEN node_type = 'root' THEN 'organization'
      WHEN node_type = 'department' THEN 'department'
      WHEN node_type = 'role' THEN 'role'
      WHEN node_type = 'position' THEN 'employee'
      ELSE COALESCE(entity_type, 'role')
    END
  WHERE org_id = v_org_id;

  -- Remove stale role/employee projection nodes and their derived edges.
  DELETE FROM public.org_nodes
  WHERE org_id = v_org_id
    AND (node_type IN ('role', 'position') OR entity_type IN ('role', 'employee'));

  -- Recreate role layer under departments (Chief Executives directly under org root).
  INSERT INTO public.org_nodes (
    org_id, parent_id, node_type, entity_type, name, description, metadata,
    display_order, is_vacant, headcount, talent_role_id, updated_at
  )
  SELECT
    r.org_id,
    CASE WHEN r.role_id = v_role_ce THEN v_root_id ELSE dept.id END AS parent_id,
    'role',
    'role',
    r.name,
    NULLIF(r.description, ''),
    '{}'::jsonb,
    row_number() OVER (
      PARTITION BY CASE WHEN r.role_id = v_role_ce THEN v_root_id ELSE dept.id END
      ORDER BY r.name, r.role_id
    ) - 1,
    false,
    1,
    r.role_id,
    now()
  FROM public.talent_roles r
  LEFT JOIN public.org_nodes dept
    ON dept.org_id = r.org_id
   AND dept.node_type = 'department'
   AND dept.talent_department_id = r.department_id
  WHERE r.org_id = v_org_id
    AND (r.role_id = v_role_ce OR dept.id IS NOT NULL);

  -- Insert the 4 senior employees first.
  INSERT INTO public.org_nodes (
    org_id, parent_id, node_type, entity_type, name, description, metadata,
    display_order, is_vacant, headcount, talent_employee_id, updated_at
  )
  SELECT
    e.org_id,
    role_node.id,
    'position',
    'employee',
    e.name,
    role_row.name,
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
  JOIN public.talent_roles role_row
    ON role_row.org_id = e.org_id
   AND role_row.role_id = e.role_id
  WHERE e.org_id = v_org_id
    AND lower(trim(e.name)) IN ('alex', 'pedram', 'alice', 'alice chen', 'bob', 'bob smith');

  -- Senior chain: Chief Executives role -> Alex employee -> Operations/HR roles.
  SELECT n.id
  INTO v_alex_node_id
  FROM public.org_nodes n
  JOIN public.talent_employees e
    ON e.org_id = n.org_id
   AND e.employee_id = n.talent_employee_id
  WHERE n.org_id = v_org_id
    AND lower(trim(e.name)) = 'alex'
  LIMIT 1;

  IF v_alex_node_id IS NOT NULL THEN
    UPDATE public.org_nodes
    SET
      parent_id = v_alex_node_id,
      updated_at = now()
    WHERE org_id = v_org_id
      AND talent_role_id IN (v_role_ops, v_role_hr);
  END IF;

  -- Junior chain example: Operations role -> Pedram employee -> junior roles.
  SELECT n.id
  INTO v_pedram_node_id
  FROM public.org_nodes n
  JOIN public.talent_employees e
    ON e.org_id = n.org_id
   AND e.employee_id = n.talent_employee_id
  WHERE n.org_id = v_org_id
    AND lower(trim(e.name)) = 'pedram'
  LIMIT 1;

  IF v_pedram_node_id IS NOT NULL THEN
    WITH junior_roles AS (
      SELECT
        rn.id,
        row_number() OVER (ORDER BY tr.name, tr.role_id) - 1 AS ord
      FROM public.org_nodes rn
      JOIN public.talent_roles tr
        ON tr.org_id = rn.org_id
       AND tr.role_id = rn.talent_role_id
      WHERE rn.org_id = v_org_id
        AND tr.role_id IN (v_role_mfg, v_role_stone, v_role_potters)
    )
    UPDATE public.org_nodes rn
    SET
      parent_id = v_pedram_node_id,
      display_order = jr.ord,
      updated_at = now()
    FROM junior_roles jr
    WHERE rn.id = jr.id;
  END IF;

  -- Insert remaining employees under their roles.
  INSERT INTO public.org_nodes (
    org_id, parent_id, node_type, entity_type, name, description, metadata,
    display_order, is_vacant, headcount, talent_employee_id, updated_at
  )
  SELECT
    e.org_id,
    role_node.id,
    'position',
    'employee',
    e.name,
    role_row.name,
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
  JOIN public.talent_roles role_row
    ON role_row.org_id = e.org_id
   AND role_row.role_id = e.role_id
  WHERE e.org_id = v_org_id
    AND lower(trim(e.name)) NOT IN ('alex', 'pedram', 'alice', 'alice chen', 'bob', 'bob smith');

  -- Rebuild clean reporting edges (no noisy sideways links).
  DELETE FROM public.org_edges
  WHERE org_id = v_org_id
    AND edge_type = 'reports_to';

  -- Senior employee reporting
  INSERT INTO public.org_edges (org_id, source_id, target_id, edge_type, metadata)
  SELECT
    v_org_id,
    child_node.id,
    manager_node.id,
    'reports_to',
    '{}'::jsonb
  FROM public.talent_employees child_emp
  JOIN public.org_nodes child_node
    ON child_node.org_id = child_emp.org_id
   AND child_node.talent_employee_id = child_emp.employee_id
  JOIN public.talent_employees manager_emp
    ON manager_emp.org_id = child_emp.org_id
   AND (
     (lower(trim(child_emp.name)) = 'pedram' AND lower(trim(manager_emp.name)) = 'alex')
     OR (lower(trim(child_emp.name)) IN ('alice', 'alice chen') AND lower(trim(manager_emp.name)) = 'alex')
     OR (lower(trim(child_emp.name)) IN ('bob', 'bob smith') AND lower(trim(manager_emp.name)) = 'pedram')
   )
  JOIN public.org_nodes manager_node
    ON manager_node.org_id = manager_emp.org_id
   AND manager_node.talent_employee_id = manager_emp.employee_id
  WHERE child_emp.org_id = v_org_id
  ON CONFLICT (source_id, target_id, edge_type) DO NOTHING;
END $$;

COMMIT;

-- ============================================================================
-- Verification
-- ----------------------------------------------------------------------------
-- 1) Confirm key 4 assignments
-- SELECT e.name, e.role_id, r.name AS role_name, r.department_id
-- FROM talent_employees e
-- JOIN talent_roles r ON r.org_id = e.org_id AND r.role_id = e.role_id
-- WHERE e.org_id = '00000000-0000-0000-0000-000000000001'
--   AND lower(trim(e.name)) IN ('alex', 'pedram', 'alice', 'alice chen', 'bob', 'bob smith')
-- ORDER BY e.name;
--
-- 2) Confirm org tree projection rows
-- SELECT node_type, entity_type, name, talent_role_id, talent_employee_id, parent_id
-- FROM org_nodes
-- WHERE org_id = '00000000-0000-0000-0000-000000000001'
-- ORDER BY
--   CASE node_type WHEN 'root' THEN 0 WHEN 'department' THEN 1 WHEN 'role' THEN 2 WHEN 'position' THEN 3 ELSE 9 END,
--   display_order, name;
-- ============================================================================
