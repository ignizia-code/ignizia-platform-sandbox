-- ==========================================================================
-- Seed leadership login employees for employee-based auth
-- ==========================================================================
-- Creates/upserts:
--   - Alex   (Plant Manager login identity)
--   - Pedram (Operations Manager login identity)
--   - Hana   (HR Manager login identity)
--
-- Note:
-- - App access role is resolved in code from employee name + role title.
-- - These rows are inserted into talent_employees so they are first-class
--   employees in Talent Studio and Ignite.
-- - Alex is explicitly mapped to O*NET role "Chief Executives".
-- - Pedram is explicitly mapped to O*NET role "General and Operations Managers".
-- - Hana is explicitly mapped to O*NET role "Human Resources Managers".
-- ==========================================================================

DO $$
DECLARE
  v_org_id UUID := '00000000-0000-0000-0000-000000000001';
  v_now TIMESTAMPTZ := now();
  v_role_alex TEXT;
  v_role_pedram TEXT;
  v_role_hr TEXT;
BEGIN
  SELECT role_id
  INTO v_role_alex
  FROM public.talent_roles
  WHERE org_id = v_org_id
    AND (
      lower(name) = 'chief executives'
      OR lower(name) LIKE 'chief executives%'
      OR onet_soc_code = '11-1011.00'
    )
  ORDER BY
    CASE
      WHEN onet_soc_code = '11-1011.00' THEN 0
      WHEN lower(name) = 'chief executives' THEN 1
      ELSE 2
    END,
    updated_at DESC
  LIMIT 1;

  SELECT role_id
  INTO v_role_pedram
  FROM public.talent_roles
  WHERE org_id = v_org_id
    AND (
      lower(name) = 'general and operations managers'
      OR lower(name) LIKE 'general and operations managers%'
      OR onet_soc_code = '11-1021.00'
    )
  ORDER BY
    CASE
      WHEN onet_soc_code = '11-1021.00' THEN 0
      WHEN lower(name) = 'general and operations managers' THEN 1
      ELSE 2
    END,
    updated_at DESC
  LIMIT 1;

  SELECT role_id
  INTO v_role_hr
  FROM public.talent_roles
  WHERE org_id = v_org_id
    AND (
      lower(name) = 'human resources managers'
      OR lower(name) LIKE 'human resources managers%'
      OR onet_soc_code = '11-3121.00'
    )
  ORDER BY
    CASE
      WHEN onet_soc_code = '11-3121.00' THEN 0
      WHEN lower(name) = 'human resources managers' THEN 1
      ELSE 2
    END,
    updated_at DESC
  LIMIT 1;

  IF v_role_alex IS NULL THEN
    RAISE EXCEPTION 'Required O*NET role not found: Chief Executives (11-1011.00). Run O*NET role sync first, then retry.';
  END IF;

  IF v_role_pedram IS NULL THEN
    RAISE EXCEPTION 'Required O*NET role not found: General and Operations Managers (11-1021.00). Run O*NET role sync first, then retry.';
  END IF;

  IF v_role_hr IS NULL THEN
    RAISE EXCEPTION 'Required O*NET role not found: Human Resources Managers (11-3121.00). Run O*NET role sync first, then retry.';
  END IF;

  INSERT INTO public.talent_employees (
    org_id,
    employee_id,
    role_id,
    name,
    avatar_url,
    workload,
    allocation,
    privacy,
    updated_at
  )
  VALUES
    (
      v_org_id,
      'emp-lead-alex',
      v_role_alex,
      'Alex',
      'https://picsum.photos/seed/alex-manager/200/200',
      'At Capacity',
      92,
      '{"shareConfirmedSkills":true,"shareUnconfirmedAiSkills":false,"shareUnconfirmedImportedSkills":false,"allowAiToAddSkills":true,"visibility":"org_visible"}'::jsonb,
      v_now
    ),
    (
      v_org_id,
      'emp-lead-pedram',
      v_role_pedram,
      'Pedram',
      'https://picsum.photos/seed/pedram-ops/200/200',
      'Balanced',
      84,
      '{"shareConfirmedSkills":true,"shareUnconfirmedAiSkills":false,"shareUnconfirmedImportedSkills":false,"allowAiToAddSkills":true,"visibility":"org_visible"}'::jsonb,
      v_now
    ),
    (
      v_org_id,
      'emp-lead-hana',
      v_role_hr,
      'Hana',
      'https://picsum.photos/seed/hana-hr/200/200',
      'Balanced',
      78,
      '{"shareConfirmedSkills":true,"shareUnconfirmedAiSkills":false,"shareUnconfirmedImportedSkills":false,"allowAiToAddSkills":true,"visibility":"org_visible"}'::jsonb,
      v_now
    )
  ON CONFLICT (org_id, employee_id) DO UPDATE SET
    role_id = EXCLUDED.role_id,
    name = EXCLUDED.name,
    avatar_url = EXCLUDED.avatar_url,
    workload = EXCLUDED.workload,
    allocation = EXCLUDED.allocation,
    privacy = EXCLUDED.privacy,
    updated_at = EXCLUDED.updated_at;

  -- Rebuild assertions for these leadership employees from their assigned role requirements.
  DELETE FROM public.talent_employee_assertions
  WHERE org_id = v_org_id
    AND person_id IN ('emp-lead-alex', 'emp-lead-pedram', 'emp-lead-hana');

  INSERT INTO public.talent_employee_assertions (
    org_id,
    assertion_id,
    person_id,
    skill_id,
    status,
    source,
    level,
    confidence,
    last_used_at,
    evidence_ids,
    created_at,
    updated_at
  )
  SELECT
    v_org_id,
    concat('assert-', person.employee_id, '-', rr.skill_id),
    person.employee_id,
    rr.skill_id,
    'confirmed',
    'imported',
    GREATEST(1, LEAST(5, rr.min_level)),
    0.9,
    v_now,
    '[]'::jsonb,
    v_now,
    v_now
  FROM public.talent_employees person
  JOIN LATERAL (
    SELECT r.skill_id, r.min_level
    FROM public.talent_role_requirements r
    WHERE r.org_id = v_org_id
      AND r.role_id = person.role_id
      AND COALESCE(r.required, true) = true
    ORDER BY COALESCE(r.weight, 1) DESC, COALESCE(r.importance, 0) DESC, r.skill_id
    LIMIT 8
  ) rr ON true
  WHERE person.org_id = v_org_id
    AND person.employee_id IN ('emp-lead-alex', 'emp-lead-pedram', 'emp-lead-hana')
  ON CONFLICT (org_id, assertion_id) DO UPDATE SET
    person_id = EXCLUDED.person_id,
    skill_id = EXCLUDED.skill_id,
    status = EXCLUDED.status,
    source = EXCLUDED.source,
    level = EXCLUDED.level,
    confidence = EXCLUDED.confidence,
    last_used_at = EXCLUDED.last_used_at,
    evidence_ids = EXCLUDED.evidence_ids,
    created_at = EXCLUDED.created_at,
    updated_at = EXCLUDED.updated_at;
END $$;

