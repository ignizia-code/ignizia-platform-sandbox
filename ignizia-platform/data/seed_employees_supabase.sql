-- ==========================================================================
-- Seed Talent Studio employees (Alice Chen and team) into Supabase
-- ==========================================================================
-- Source (canonical list): components/features/talent-studio/v3/data/seed.ts
--   export const SEED_EMPLOYEES: Employee[] = [ ... ]
-- Runtime: AppContext loads from Supabase (lib/talentStudioStorage/supabase.ts).
--   If DB is empty, it falls back to SEED_EMPLOYEES in memory.
--
-- Column format matches your DB: org_id, employee_id (text), role_id, name,
-- avatar_url, workload, allocation (int or null), privacy (jsonb), updated_at.
-- Single org for now: 00000000-0000-0000-0000-000000000001
--
-- Before running: run delete_non_seed_employees_supabase.sql to remove
-- the 3 test employees (e.g. "New Talent" with UUID ids).
-- ==========================================================================

DO $$
DECLARE
  v_org_id UUID := '00000000-0000-0000-0000-000000000001';
  v_now TIMESTAMPTZ := now();
BEGIN

-- --------------------------------------------------------------------------
-- talent_employees (13 people)
-- --------------------------------------------------------------------------
INSERT INTO talent_employees (org_id, employee_id, role_id, name, avatar_url, workload, allocation, privacy, updated_at)
VALUES
  (v_org_id, 'emp-1', 'role-1', 'Alice Chen', 'https://picsum.photos/seed/alice/200/200', 'At Capacity', 95, '{"shareConfirmedSkills":true,"shareUnconfirmedAiSkills":false,"shareUnconfirmedImportedSkills":false,"allowAiToAddSkills":true,"visibility":"org_visible"}'::jsonb, v_now),
  (v_org_id, 'emp-2', 'role-3', 'Bob Smith', 'https://picsum.photos/seed/bob/200/200', 'Underutilized', 45, '{"shareConfirmedSkills":true,"shareUnconfirmedAiSkills":true,"shareUnconfirmedImportedSkills":true,"allowAiToAddSkills":true,"visibility":"org_visible"}'::jsonb, v_now),
  (v_org_id, 'emp-3', 'role-4', 'Charlie Davis', 'https://picsum.photos/seed/charlie/200/200', 'Overloaded', 125, '{"shareConfirmedSkills":true,"shareUnconfirmedAiSkills":false,"shareUnconfirmedImportedSkills":false,"allowAiToAddSkills":true,"visibility":"org_visible"}'::jsonb, v_now),
  (v_org_id, 'emp-4', 'role-5', 'Diana Prince', 'https://picsum.photos/seed/diana/200/200', 'Balanced', 80, '{"shareConfirmedSkills":true,"shareUnconfirmedAiSkills":false,"shareUnconfirmedImportedSkills":false,"allowAiToAddSkills":false,"visibility":"team_only"}'::jsonb, v_now),
  (v_org_id, 'emp-5', 'role-2', 'Eve Adams', 'https://picsum.photos/seed/eve/200/200', 'Balanced', 75, '{"shareConfirmedSkills":true,"shareUnconfirmedAiSkills":true,"shareUnconfirmedImportedSkills":true,"allowAiToAddSkills":true,"visibility":"org_visible"}'::jsonb, v_now),
  (v_org_id, 'emp-6', 'role-6', 'Marco Rossi', 'https://picsum.photos/seed/marco/200/200', 'Overloaded', 118, '{"shareConfirmedSkills":true,"shareUnconfirmedAiSkills":true,"shareUnconfirmedImportedSkills":true,"allowAiToAddSkills":true,"visibility":"org_visible"}'::jsonb, v_now),
  (v_org_id, 'emp-7', 'role-8', 'Fatima Al-Rashid', 'https://picsum.photos/seed/fatima/200/200', 'Balanced', 85, '{"shareConfirmedSkills":true,"shareUnconfirmedAiSkills":false,"shareUnconfirmedImportedSkills":false,"allowAiToAddSkills":true,"visibility":"org_visible"}'::jsonb, v_now),
  (v_org_id, 'emp-8', 'role-9', 'David Kim', 'https://picsum.photos/seed/davidk/200/200', 'At Capacity', 100, '{"shareConfirmedSkills":true,"shareUnconfirmedAiSkills":true,"shareUnconfirmedImportedSkills":true,"allowAiToAddSkills":true,"visibility":"org_visible"}'::jsonb, v_now),
  (v_org_id, 'emp-9', 'role-10', 'Sarah Nguyen', 'https://picsum.photos/seed/sarahng/200/200', 'At Capacity', 105, '{"shareConfirmedSkills":true,"shareUnconfirmedAiSkills":true,"shareUnconfirmedImportedSkills":true,"allowAiToAddSkills":true,"visibility":"org_visible"}'::jsonb, v_now),
  (v_org_id, 'emp-10', 'role-11', 'James Okafor', 'https://picsum.photos/seed/james/200/200', 'Underutilized', 50, '{"shareConfirmedSkills":true,"shareUnconfirmedAiSkills":true,"shareUnconfirmedImportedSkills":true,"allowAiToAddSkills":true,"visibility":"org_visible"}'::jsonb, v_now),
  (v_org_id, 'emp-11', 'role-12', 'Lena Petrova', 'https://picsum.photos/seed/lena/200/200', 'Balanced', 70, '{"shareConfirmedSkills":true,"shareUnconfirmedAiSkills":false,"shareUnconfirmedImportedSkills":false,"allowAiToAddSkills":true,"visibility":"org_visible"}'::jsonb, v_now),
  (v_org_id, 'emp-12', 'role-7', 'Tomás García', 'https://picsum.photos/seed/tomas/200/200', 'Balanced', 82, '{"shareConfirmedSkills":true,"shareUnconfirmedAiSkills":true,"shareUnconfirmedImportedSkills":true,"allowAiToAddSkills":true,"visibility":"org_visible"}'::jsonb, v_now),
  (v_org_id, 'emp-13', 'role-6', 'Aisha Mbeki', 'https://picsum.photos/seed/aisha/200/200', 'Underutilized', 55, '{"shareConfirmedSkills":true,"shareUnconfirmedAiSkills":true,"shareUnconfirmedImportedSkills":true,"allowAiToAddSkills":true,"visibility":"org_visible"}'::jsonb, v_now)
ON CONFLICT (org_id, employee_id) DO UPDATE SET
  role_id = EXCLUDED.role_id,
  name = EXCLUDED.name,
  avatar_url = EXCLUDED.avatar_url,
  workload = EXCLUDED.workload,
  allocation = EXCLUDED.allocation,
  privacy = EXCLUDED.privacy,
  updated_at = EXCLUDED.updated_at;

-- --------------------------------------------------------------------------
-- talent_employee_assertions (skill assertions for each employee)
-- --------------------------------------------------------------------------
INSERT INTO talent_employee_assertions (org_id, assertion_id, person_id, skill_id, status, source, level, confidence, last_used_at, evidence_ids, created_at, updated_at)
VALUES
  -- Alice Chen (emp-1)
  (v_org_id, 'a1', 'emp-1', 'bucket-1-skill-1', 'confirmed', 'manager_validated', 4, 0.9, v_now, '[]'::jsonb, v_now, v_now),
  (v_org_id, 'a2', 'emp-1', 'bucket-1-skill-2', 'confirmed', 'manager_validated', 3, 0.8, v_now, '[]'::jsonb, v_now, v_now),
  (v_org_id, 'a3', 'emp-1', 'bucket-6-skill-1', 'confirmed', 'manager_validated', 4, 0.85, v_now, '[]'::jsonb, v_now, v_now),
  (v_org_id, 'a1-4', 'emp-1', 'bucket-2-skill-1', 'confirmed', 'assessment', 3, 0.85, v_now, '[]'::jsonb, v_now, v_now),
  (v_org_id, 'a1-5', 'emp-1', 'bucket-3-skill-2', 'confirmed', 'training_completion', 4, 0.9, v_now, '[]'::jsonb, v_now, v_now),
  (v_org_id, 'a1-6', 'emp-1', 'bucket-5-skill-1', 'confirmed', 'manager_validated', 3, 0.85, v_now, '[]'::jsonb, v_now, v_now),
  (v_org_id, 'a1-7', 'emp-1', 'bucket-8-skill-1', 'confirmed', 'assessment', 3, 0.85, v_now, '[]'::jsonb, v_now, v_now),
  (v_org_id, 'a1-8', 'emp-1', 'bucket-10-skill-1', 'confirmed', 'assessment', 3, 0.85, v_now, '[]'::jsonb, v_now, v_now),
  (v_org_id, 'a1-9', 'emp-1', 'bucket-7-skill-1', 'proposed', 'ai_inferred', 3, 0.7, v_now, '[]'::jsonb, v_now, v_now),
  -- Bob Smith (emp-2)
  (v_org_id, 'a4', 'emp-2', 'bucket-1-skill-1', 'confirmed', 'assessment', 2, 0.95, v_now, '[]'::jsonb, v_now, v_now),
  (v_org_id, 'a4-2', 'emp-2', 'bucket-8-skill-1', 'confirmed', 'assessment', 2, 0.9, v_now, '[]'::jsonb, v_now, v_now),
  (v_org_id, 'a4-3', 'emp-2', 'bucket-8-skill-2', 'confirmed', 'training_completion', 3, 0.85, v_now, '[]'::jsonb, v_now, v_now),
  (v_org_id, 'a4-4', 'emp-2', 'bucket-2-skill-2', 'proposed', 'ai_inferred', 2, 0.65, v_now, '[]'::jsonb, v_now, v_now),
  -- Charlie Davis (emp-3)
  (v_org_id, 'a5', 'emp-3', 'bucket-6-skill-1', 'confirmed', 'performance_signal', 5, 0.9, v_now, '[]'::jsonb, v_now, v_now),
  (v_org_id, 'a6', 'emp-3', 'bucket-6-skill-4', 'confirmed', 'training_completion', 4, 1.0, v_now, '[]'::jsonb, v_now, v_now),
  (v_org_id, 'a5-3', 'emp-3', 'bucket-11-skill-1', 'confirmed', 'assessment', 3, 0.85, v_now, '[]'::jsonb, v_now, v_now),
  (v_org_id, 'a5-4', 'emp-3', 'bucket-1-skill-1', 'confirmed', 'assessment', 3, 0.8, v_now, '[]'::jsonb, v_now, v_now),
  (v_org_id, 'a5-5', 'emp-3', 'bucket-7-skill-1', 'proposed', 'ai_inferred', 4, 0.7, v_now, '[]'::jsonb, v_now, v_now),
  -- Diana Prince (emp-4)
  (v_org_id, 'a7', 'emp-4', 'bucket-1-skill-9', 'confirmed', 'imported', 5, 0.8, v_now, '[]'::jsonb, v_now, v_now),
  (v_org_id, 'a8', 'emp-4', 'bucket-10-skill-1', 'confirmed', 'manager_validated', 5, 0.9, v_now, '[]'::jsonb, v_now, v_now),
  (v_org_id, 'a7-3', 'emp-4', 'bucket-10-skill-8', 'confirmed', 'manager_validated', 4, 0.9, v_now, '[]'::jsonb, v_now, v_now),
  (v_org_id, 'a7-4', 'emp-4', 'bucket-5-skill-3', 'confirmed', 'training_completion', 3, 0.85, v_now, '[]'::jsonb, v_now, v_now),
  -- Eve Adams (emp-5)
  (v_org_id, 'a9', 'emp-5', 'bucket-1-skill-1', 'confirmed', 'assessment', 3, 0.85, v_now, '[]'::jsonb, v_now, v_now),
  (v_org_id, 'a9-2', 'emp-5', 'bucket-1-skill-3', 'confirmed', 'assessment', 4, 0.8, v_now, '[]'::jsonb, v_now, v_now),
  (v_org_id, 'a9-3', 'emp-5', 'bucket-10-skill-1', 'confirmed', 'assessment', 3, 0.8, v_now, '[]'::jsonb, v_now, v_now),
  (v_org_id, 'a9-4', 'emp-5', 'bucket-10-skill-2', 'proposed', 'ai_inferred', 2, 0.6, v_now, '[]'::jsonb, v_now, v_now),
  -- Marco Rossi (emp-6)
  (v_org_id, 'a10-1', 'emp-6', 'bucket-12-skill-1', 'confirmed', 'manager_validated', 4, 0.95, v_now, '[]'::jsonb, v_now, v_now),
  (v_org_id, 'a10-2', 'emp-6', 'bucket-12-skill-3', 'confirmed', 'assessment', 3, 0.85, v_now, '[]'::jsonb, v_now, v_now),
  (v_org_id, 'a10-3', 'emp-6', 'bucket-13-skill-2', 'confirmed', 'training_completion', 2, 0.8, v_now, '[]'::jsonb, v_now, v_now),
  (v_org_id, 'a10-4', 'emp-6', 'bucket-12-skill-6', 'confirmed', 'assessment', 3, 0.8, v_now, '[]'::jsonb, v_now, v_now),
  -- Fatima Al-Rashid (emp-7)
  (v_org_id, 'a11-1', 'emp-7', 'bucket-13-skill-1', 'confirmed', 'manager_validated', 4, 0.9, v_now, '[]'::jsonb, v_now, v_now),
  (v_org_id, 'a11-2', 'emp-7', 'bucket-13-skill-5', 'confirmed', 'assessment', 3, 0.85, v_now, '[]'::jsonb, v_now, v_now),
  (v_org_id, 'a11-3', 'emp-7', 'bucket-13-skill-6', 'confirmed', 'training_completion', 2, 0.75, v_now, '[]'::jsonb, v_now, v_now),
  -- David Kim (emp-8)
  (v_org_id, 'a12-1', 'emp-8', 'bucket-12-skill-7', 'confirmed', 'manager_validated', 5, 0.95, v_now, '[]'::jsonb, v_now, v_now),
  (v_org_id, 'a12-2', 'emp-8', 'bucket-12-skill-8', 'confirmed', 'assessment', 4, 0.9, v_now, '[]'::jsonb, v_now, v_now),
  (v_org_id, 'a12-3', 'emp-8', 'bucket-13-skill-8', 'confirmed', 'training_completion', 3, 0.85, v_now, '[]'::jsonb, v_now, v_now),
  (v_org_id, 'a12-4', 'emp-8', 'bucket-12-skill-1', 'confirmed', 'project_evidence', 3, 0.7, v_now, '[]'::jsonb, v_now, v_now),
  -- Sarah Nguyen (emp-9)
  (v_org_id, 'a13-1', 'emp-9', 'bucket-6-skill-1', 'confirmed', 'manager_validated', 3, 0.85, v_now, '[]'::jsonb, v_now, v_now),
  (v_org_id, 'a13-2', 'emp-9', 'bucket-13-skill-4', 'confirmed', 'assessment', 4, 0.9, v_now, '[]'::jsonb, v_now, v_now),
  (v_org_id, 'a13-3', 'emp-9', 'bucket-12-skill-12', 'confirmed', 'assessment', 3, 0.85, v_now, '[]'::jsonb, v_now, v_now),
  (v_org_id, 'a13-4', 'emp-9', 'bucket-12-skill-1', 'confirmed', 'project_evidence', 2, 0.7, v_now, '[]'::jsonb, v_now, v_now),
  -- James Okafor (emp-10)
  (v_org_id, 'a14-1', 'emp-10', 'bucket-12-skill-10', 'confirmed', 'manager_validated', 4, 0.9, v_now, '[]'::jsonb, v_now, v_now),
  (v_org_id, 'a14-2', 'emp-10', 'bucket-12-skill-11', 'confirmed', 'assessment', 3, 0.85, v_now, '[]'::jsonb, v_now, v_now),
  -- Lena Petrova (emp-11)
  (v_org_id, 'a15-1', 'emp-11', 'bucket-9-skill-4', 'confirmed', 'manager_validated', 4, 0.9, v_now, '[]'::jsonb, v_now, v_now),
  (v_org_id, 'a15-2', 'emp-11', 'bucket-1-skill-5', 'confirmed', 'assessment', 3, 0.85, v_now, '[]'::jsonb, v_now, v_now),
  (v_org_id, 'a15-3', 'emp-11', 'bucket-10-skill-5', 'confirmed', 'assessment', 3, 0.85, v_now, '[]'::jsonb, v_now, v_now),
  -- Tomás García (emp-12)
  (v_org_id, 'a16-1', 'emp-12', 'bucket-12-skill-2', 'confirmed', 'manager_validated', 4, 0.9, v_now, '[]'::jsonb, v_now, v_now),
  (v_org_id, 'a16-2', 'emp-12', 'bucket-12-skill-4', 'confirmed', 'assessment', 3, 0.85, v_now, '[]'::jsonb, v_now, v_now),
  (v_org_id, 'a16-3', 'emp-12', 'bucket-12-skill-5', 'confirmed', 'training_completion', 2, 0.75, v_now, '[]'::jsonb, v_now, v_now),
  (v_org_id, 'a16-4', 'emp-12', 'bucket-12-skill-9', 'confirmed', 'project_evidence', 3, 0.7, v_now, '[]'::jsonb, v_now, v_now),
  -- Aisha Mbeki (emp-13)
  (v_org_id, 'a17-1', 'emp-13', 'bucket-12-skill-1', 'confirmed', 'assessment', 3, 0.8, v_now, '[]'::jsonb, v_now, v_now),
  (v_org_id, 'a17-2', 'emp-13', 'bucket-12-skill-3', 'confirmed', 'training_completion', 2, 0.75, v_now, '[]'::jsonb, v_now, v_now),
  (v_org_id, 'a17-3', 'emp-13', 'bucket-13-skill-1', 'proposed', 'ai_inferred', 2, 0.6, v_now, '[]'::jsonb, v_now, v_now)
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
