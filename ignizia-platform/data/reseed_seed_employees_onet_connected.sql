-- ==========================================================================
-- Re-seed canonical 13 employees and connect them to O*NET role graph
-- ==========================================================================
-- What this script does:
-- 1) Ensures O*NET roles already exist in talent_roles
-- 2) Upserts the 13 canonical employees into talent_employees
-- 3) Maps each employee to an existing O*NET role_id
-- 4) Rebuilds talent_employee_assertions from role requirements so assertions
--    are connected to current O*NET-based skill IDs (not legacy bucket IDs)
--
-- Safe behavior:
-- - Updates only the 13 canonical employee IDs (emp-1 ... emp-13)
-- - Deletes assertions only for those 13 people, then re-inserts connected ones
-- ==========================================================================

DO $$
DECLARE
  v_org_id UUID := '00000000-0000-0000-0000-000000000001';
  v_now TIMESTAMPTZ := now();
  v_onet_role_count INT;
BEGIN
  SELECT COUNT(*)
  INTO v_onet_role_count
  FROM public.talent_roles
  WHERE org_id = v_org_id
    AND (
      source = 'onet'
      OR onet_soc_code IS NOT NULL
      OR role_id LIKE 'onet-%'
    );

  IF v_onet_role_count = 0 THEN
    RAISE EXCEPTION 'No O*NET roles found for org_id=%; run Sync now first.', v_org_id;
  END IF;

  WITH seed_employees AS (
    SELECT *
    FROM (
      VALUES
        ('emp-1',  'Alice Chen',        'https://picsum.photos/seed/alice/200/200',   'At Capacity',   95,  '{"shareConfirmedSkills":true,"shareUnconfirmedAiSkills":false,"shareUnconfirmedImportedSkills":false,"allowAiToAddSkills":true,"visibility":"org_visible"}'::jsonb, 1),
        ('emp-2',  'Bob Smith',         'https://picsum.photos/seed/bob/200/200',     'Underutilized', 45,  '{"shareConfirmedSkills":true,"shareUnconfirmedAiSkills":true,"shareUnconfirmedImportedSkills":true,"allowAiToAddSkills":true,"visibility":"org_visible"}'::jsonb, 2),
        ('emp-3',  'Charlie Davis',     'https://picsum.photos/seed/charlie/200/200', 'Overloaded',    125, '{"shareConfirmedSkills":true,"shareUnconfirmedAiSkills":false,"shareUnconfirmedImportedSkills":false,"allowAiToAddSkills":true,"visibility":"org_visible"}'::jsonb, 3),
        ('emp-4',  'Diana Prince',      'https://picsum.photos/seed/diana/200/200',   'Balanced',      80,  '{"shareConfirmedSkills":true,"shareUnconfirmedAiSkills":false,"shareUnconfirmedImportedSkills":false,"allowAiToAddSkills":false,"visibility":"team_only"}'::jsonb, 4),
        ('emp-5',  'Eve Adams',         'https://picsum.photos/seed/eve/200/200',     'Balanced',      75,  '{"shareConfirmedSkills":true,"shareUnconfirmedAiSkills":true,"shareUnconfirmedImportedSkills":true,"allowAiToAddSkills":true,"visibility":"org_visible"}'::jsonb, 5),
        ('emp-6',  'Marco Rossi',       'https://picsum.photos/seed/marco/200/200',   'Overloaded',    118, '{"shareConfirmedSkills":true,"shareUnconfirmedAiSkills":true,"shareUnconfirmedImportedSkills":true,"allowAiToAddSkills":true,"visibility":"org_visible"}'::jsonb, 1),
        ('emp-7',  'Fatima Al-Rashid',  'https://picsum.photos/seed/fatima/200/200',  'Balanced',      85,  '{"shareConfirmedSkills":true,"shareUnconfirmedAiSkills":false,"shareUnconfirmedImportedSkills":false,"allowAiToAddSkills":true,"visibility":"org_visible"}'::jsonb, 2),
        ('emp-8',  'David Kim',         'https://picsum.photos/seed/davidk/200/200',  'At Capacity',   100, '{"shareConfirmedSkills":true,"shareUnconfirmedAiSkills":true,"shareUnconfirmedImportedSkills":true,"allowAiToAddSkills":true,"visibility":"org_visible"}'::jsonb, 3),
        ('emp-9',  'Sarah Nguyen',      'https://picsum.photos/seed/sarahng/200/200', 'At Capacity',   105, '{"shareConfirmedSkills":true,"shareUnconfirmedAiSkills":true,"shareUnconfirmedImportedSkills":true,"allowAiToAddSkills":true,"visibility":"org_visible"}'::jsonb, 4),
        ('emp-10', 'James Okafor',      'https://picsum.photos/seed/james/200/200',   'Underutilized', 50,  '{"shareConfirmedSkills":true,"shareUnconfirmedAiSkills":true,"shareUnconfirmedImportedSkills":true,"allowAiToAddSkills":true,"visibility":"org_visible"}'::jsonb, 5),
        ('emp-11', 'Lena Petrova',      'https://picsum.photos/seed/lena/200/200',    'Balanced',      70,  '{"shareConfirmedSkills":true,"shareUnconfirmedAiSkills":false,"shareUnconfirmedImportedSkills":false,"allowAiToAddSkills":true,"visibility":"org_visible"}'::jsonb, 1),
        ('emp-12', 'Tomas Garcia',      'https://picsum.photos/seed/tomas/200/200',   'Balanced',      82,  '{"shareConfirmedSkills":true,"shareUnconfirmedAiSkills":true,"shareUnconfirmedImportedSkills":true,"allowAiToAddSkills":true,"visibility":"org_visible"}'::jsonb, 2),
        ('emp-13', 'Aisha Mbeki',       'https://picsum.photos/seed/aisha/200/200',   'Underutilized', 55,  '{"shareConfirmedSkills":true,"shareUnconfirmedAiSkills":true,"shareUnconfirmedImportedSkills":true,"allowAiToAddSkills":true,"visibility":"org_visible"}'::jsonb, 3)
    ) AS t(employee_id, name, avatar_url, workload, allocation, privacy, role_slot)
  ),
  ranked_onet_roles AS (
    SELECT
      role_id,
      ROW_NUMBER() OVER (ORDER BY COALESCE(onet_soc_code, role_id), role_id) AS rn
    FROM public.talent_roles
    WHERE org_id = v_org_id
      AND (
        source = 'onet'
        OR onet_soc_code IS NOT NULL
        OR role_id LIKE 'onet-%'
      )
  ),
  mapped_employees AS (
    SELECT
      s.employee_id,
      s.name,
      s.avatar_url,
      s.workload,
      s.allocation,
      s.privacy,
      r.role_id
    FROM seed_employees s
    JOIN ranked_onet_roles r
      ON r.rn = ((s.role_slot - 1) % v_onet_role_count) + 1
  )
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
  SELECT
    v_org_id,
    m.employee_id,
    m.role_id,
    m.name,
    m.avatar_url,
    m.workload,
    m.allocation,
    m.privacy,
    v_now
  FROM mapped_employees m
  ON CONFLICT (org_id, employee_id) DO UPDATE
  SET
    role_id = EXCLUDED.role_id,
    name = EXCLUDED.name,
    avatar_url = EXCLUDED.avatar_url,
    workload = EXCLUDED.workload,
    allocation = EXCLUDED.allocation,
    privacy = EXCLUDED.privacy,
    updated_at = EXCLUDED.updated_at;

  DELETE FROM public.talent_employee_assertions
  WHERE org_id = v_org_id
    AND person_id IN (
      'emp-1', 'emp-2', 'emp-3', 'emp-4', 'emp-5', 'emp-6', 'emp-7',
      'emp-8', 'emp-9', 'emp-10', 'emp-11', 'emp-12', 'emp-13'
    );

  WITH target_employees AS (
    SELECT employee_id, role_id
    FROM public.talent_employees
    WHERE org_id = v_org_id
      AND employee_id IN (
        'emp-1', 'emp-2', 'emp-3', 'emp-4', 'emp-5', 'emp-6', 'emp-7',
        'emp-8', 'emp-9', 'emp-10', 'emp-11', 'emp-12', 'emp-13'
      )
  ),
  ranked_requirements AS (
    SELECT
      role_id,
      skill_id,
      COALESCE(min_level, 2) AS min_level,
      ROW_NUMBER() OVER (
        PARTITION BY role_id
        ORDER BY
          COALESCE(weight, 1) DESC,
          COALESCE(importance, 0) DESC,
          skill_id
      ) AS rn
    FROM public.talent_role_requirements
    WHERE org_id = v_org_id
      AND COALESCE(required, true) = true
  ),
  connected_assertions AS (
    SELECT
      te.employee_id AS person_id,
      rr.skill_id,
      GREATEST(1, LEAST(5, rr.min_level)) AS level,
      CONCAT('onet-', md5(te.employee_id || ':' || rr.skill_id)) AS assertion_id
    FROM target_employees te
    JOIN ranked_requirements rr
      ON rr.role_id = te.role_id
     AND rr.rn <= 8
  )
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
    c.assertion_id,
    c.person_id,
    c.skill_id,
    'confirmed',
    'imported',
    c.level,
    0.8,
    v_now,
    '[]'::jsonb,
    v_now,
    v_now
  FROM connected_assertions c
  ON CONFLICT (org_id, assertion_id) DO UPDATE
  SET
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
