-- ==========================================================================
-- Talent Studio Normalized Persistence
-- ==========================================================================
-- Run this in Supabase SQL Editor (Run mode, not Explain).
-- Replaces single-cell snapshot persistence with relational tables +
-- per-collection rows for non-core datasets.

CREATE TABLE IF NOT EXISTS talent_departments (
  org_id UUID NOT NULL,
  dept_id TEXT NOT NULL,
  name TEXT NOT NULL,
  description TEXT NULL,
  display_order INTEGER NOT NULL DEFAULT 0,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (org_id, dept_id)
);

CREATE TABLE IF NOT EXISTS talent_roles (
  org_id UUID NOT NULL,
  role_id TEXT NOT NULL,
  department_id TEXT NULL,
  name TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  is_hiring BOOLEAN NOT NULL DEFAULT FALSE,
  source TEXT NOT NULL DEFAULT 'manual',
  onet_soc_code TEXT NULL,
  onet_last_updated_at DATE NULL,
  synced_at TIMESTAMPTZ NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (org_id, role_id)
);

CREATE TABLE IF NOT EXISTS talent_role_department_links (
  org_id UUID NOT NULL,
  role_id TEXT NOT NULL,
  dept_id TEXT NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (org_id, role_id, dept_id)
);

CREATE TABLE IF NOT EXISTS talent_role_requirements (
  org_id UUID NOT NULL,
  role_id TEXT NOT NULL,
  skill_id TEXT NOT NULL,
  skill_name TEXT NULL,
  element_id TEXT NULL,
  min_level INTEGER NOT NULL,
  weight NUMERIC(8,3) NOT NULL DEFAULT 1,
  required BOOLEAN NOT NULL DEFAULT TRUE,
  importance NUMERIC(8,3) NULL,
  level NUMERIC(8,3) NULL,
  not_relevant BOOLEAN NOT NULL DEFAULT FALSE,
  onet_updated_at DATE NULL,
  source TEXT NOT NULL DEFAULT 'manual',
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (org_id, role_id, skill_id)
);

CREATE TABLE IF NOT EXISTS talent_employees (
  org_id UUID NOT NULL,
  employee_id TEXT NOT NULL,
  role_id TEXT NOT NULL,
  name TEXT NOT NULL,
  avatar_url TEXT NULL,
  workload TEXT NULL,
  allocation INTEGER NULL,
  privacy JSONB NOT NULL DEFAULT '{}'::jsonb,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (org_id, employee_id)
);

CREATE TABLE IF NOT EXISTS talent_employee_assertions (
  org_id UUID NOT NULL,
  assertion_id TEXT NOT NULL,
  person_id TEXT NOT NULL,
  skill_id TEXT NOT NULL,
  status TEXT NOT NULL,
  source TEXT NOT NULL,
  level INTEGER NOT NULL,
  confidence NUMERIC(4,3) NOT NULL DEFAULT 0,
  last_used_at TIMESTAMPTZ NULL,
  evidence_ids JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL,
  PRIMARY KEY (org_id, assertion_id)
);

CREATE TABLE IF NOT EXISTS talent_studio_collections (
  org_id UUID NOT NULL,
  collection TEXT NOT NULL,
  payload JSONB NOT NULL DEFAULT '[]'::jsonb,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (org_id, collection)
);

CREATE INDEX IF NOT EXISTS idx_talent_departments_updated_at
  ON talent_departments(updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_talent_roles_updated_at
  ON talent_roles(updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_talent_roles_onet_soc
  ON talent_roles(org_id, onet_soc_code);
CREATE INDEX IF NOT EXISTS idx_talent_role_department_links_role
  ON talent_role_department_links(org_id, role_id);
CREATE INDEX IF NOT EXISTS idx_talent_role_department_links_dept
  ON talent_role_department_links(org_id, dept_id);
CREATE INDEX IF NOT EXISTS idx_talent_employees_updated_at
  ON talent_employees(updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_talent_collections_updated_at
  ON talent_studio_collections(updated_at DESC);

ALTER TABLE talent_departments ENABLE ROW LEVEL SECURITY;
ALTER TABLE talent_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE talent_role_requirements ENABLE ROW LEVEL SECURITY;
ALTER TABLE talent_employees ENABLE ROW LEVEL SECURITY;
ALTER TABLE talent_employee_assertions ENABLE ROW LEVEL SECURITY;
ALTER TABLE talent_studio_collections ENABLE ROW LEVEL SECURITY;
ALTER TABLE talent_role_department_links ENABLE ROW LEVEL SECURITY;

ALTER TABLE talent_roles
  ADD COLUMN IF NOT EXISTS source TEXT NOT NULL DEFAULT 'manual',
  ADD COLUMN IF NOT EXISTS onet_soc_code TEXT NULL,
  ADD COLUMN IF NOT EXISTS onet_last_updated_at DATE NULL,
  ADD COLUMN IF NOT EXISTS synced_at TIMESTAMPTZ NULL;

ALTER TABLE talent_role_requirements
  ADD COLUMN IF NOT EXISTS skill_name TEXT NULL,
  ADD COLUMN IF NOT EXISTS element_id TEXT NULL,
  ADD COLUMN IF NOT EXISTS importance NUMERIC(8,3) NULL,
  ADD COLUMN IF NOT EXISTS level NUMERIC(8,3) NULL,
  ADD COLUMN IF NOT EXISTS not_relevant BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS onet_updated_at DATE NULL,
  ADD COLUMN IF NOT EXISTS source TEXT NOT NULL DEFAULT 'manual';

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE policyname = 'talent_departments_allow_all'
      AND tablename = 'talent_departments'
  ) THEN
    CREATE POLICY talent_departments_allow_all
      ON talent_departments FOR ALL
      USING (true) WITH CHECK (true);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE policyname = 'talent_roles_allow_all'
      AND tablename = 'talent_roles'
  ) THEN
    CREATE POLICY talent_roles_allow_all
      ON talent_roles FOR ALL
      USING (true) WITH CHECK (true);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE policyname = 'talent_role_requirements_allow_all'
      AND tablename = 'talent_role_requirements'
  ) THEN
    CREATE POLICY talent_role_requirements_allow_all
      ON talent_role_requirements FOR ALL
      USING (true) WITH CHECK (true);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE policyname = 'talent_employees_allow_all'
      AND tablename = 'talent_employees'
  ) THEN
    CREATE POLICY talent_employees_allow_all
      ON talent_employees FOR ALL
      USING (true) WITH CHECK (true);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE policyname = 'talent_employee_assertions_allow_all'
      AND tablename = 'talent_employee_assertions'
  ) THEN
    CREATE POLICY talent_employee_assertions_allow_all
      ON talent_employee_assertions FOR ALL
      USING (true) WITH CHECK (true);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE policyname = 'talent_role_department_links_allow_all'
      AND tablename = 'talent_role_department_links'
  ) THEN
    CREATE POLICY talent_role_department_links_allow_all
      ON talent_role_department_links FOR ALL
      USING (true) WITH CHECK (true);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE policyname = 'talent_studio_collections_allow_all'
      AND tablename = 'talent_studio_collections'
  ) THEN
    CREATE POLICY talent_studio_collections_allow_all
      ON talent_studio_collections FOR ALL
      USING (true) WITH CHECK (true);
  END IF;
END
$$;

-- Backfill from legacy single-payload table, if it exists.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.tables
    WHERE table_schema = 'public'
      AND table_name = 'talent_studio_states'
  ) THEN
    INSERT INTO talent_departments (org_id, dept_id, name, description, display_order, updated_at)
    SELECT
      t.org_id,
      d.item->>'id',
      d.item->>'name',
      d.item->>'description',
      (d.ord - 1)::int,
      now()
    FROM talent_studio_states t
    CROSS JOIN LATERAL jsonb_array_elements(COALESCE(t.payload->'departments', '[]'::jsonb)) WITH ORDINALITY AS d(item, ord)
    ON CONFLICT (org_id, dept_id) DO UPDATE
      SET name = EXCLUDED.name,
          description = EXCLUDED.description,
          display_order = EXCLUDED.display_order,
          updated_at = now();

    INSERT INTO talent_roles (
      org_id,
      role_id,
      department_id,
      name,
      description,
      is_hiring,
      source,
      onet_soc_code,
      onet_last_updated_at,
      synced_at,
      updated_at
    )
    SELECT
      t.org_id,
      r.item->>'id',
      NULLIF(r.item->>'departmentId', ''),
      r.item->>'name',
      COALESCE(r.item->>'description', ''),
      COALESCE((r.item->>'isHiring')::boolean, false),
      COALESCE(r.item->>'source', 'manual'),
      NULLIF(r.item->>'onetSocCode', ''),
      CASE
        WHEN r.item ? 'onetLastUpdatedAt' AND NULLIF(r.item->>'onetLastUpdatedAt', '') IS NOT NULL
          THEN (r.item->>'onetLastUpdatedAt')::date
        ELSE NULL
      END,
      CASE
        WHEN r.item ? 'syncedAt' AND NULLIF(r.item->>'syncedAt', '') IS NOT NULL
          THEN (r.item->>'syncedAt')::timestamptz
        ELSE NULL
      END,
      now()
    FROM talent_studio_states t
    CROSS JOIN LATERAL jsonb_array_elements(COALESCE(t.payload->'roles', '[]'::jsonb)) AS r(item)
    ON CONFLICT (org_id, role_id) DO UPDATE
      SET department_id = EXCLUDED.department_id,
          name = EXCLUDED.name,
          description = EXCLUDED.description,
          is_hiring = EXCLUDED.is_hiring,
          source = EXCLUDED.source,
          onet_soc_code = EXCLUDED.onet_soc_code,
          onet_last_updated_at = EXCLUDED.onet_last_updated_at,
          synced_at = EXCLUDED.synced_at,
          updated_at = now();

    INSERT INTO talent_role_requirements (
      org_id,
      role_id,
      skill_id,
      skill_name,
      element_id,
      min_level,
      weight,
      required,
      importance,
      level,
      not_relevant,
      onet_updated_at,
      source,
      updated_at
    )
    SELECT
      t.org_id,
      r.item->>'id',
      req.item->>'skillId',
      NULLIF(req.item->>'skillName', ''),
      NULLIF(req.item->>'elementId', ''),
      COALESCE((req.item->>'minLevel')::int, 0),
      COALESCE((req.item->>'weight')::numeric, 1),
      COALESCE((req.item->>'required')::boolean, true),
      CASE
        WHEN req.item ? 'importance' THEN (req.item->>'importance')::numeric
        ELSE NULL
      END,
      CASE
        WHEN req.item ? 'level' THEN (req.item->>'level')::numeric
        ELSE NULL
      END,
      COALESCE((req.item->>'notRelevant')::boolean, false),
      CASE
        WHEN req.item ? 'onetUpdatedAt' AND NULLIF(req.item->>'onetUpdatedAt', '') IS NOT NULL
          THEN (req.item->>'onetUpdatedAt')::date
        ELSE NULL
      END,
      COALESCE(req.item->>'source', 'manual'),
      now()
    FROM talent_studio_states t
    CROSS JOIN LATERAL jsonb_array_elements(COALESCE(t.payload->'roles', '[]'::jsonb)) AS r(item)
    CROSS JOIN LATERAL jsonb_array_elements(COALESCE(r.item->'requirements', '[]'::jsonb)) AS req(item)
    ON CONFLICT (org_id, role_id, skill_id) DO UPDATE
      SET skill_name = EXCLUDED.skill_name,
          element_id = EXCLUDED.element_id,
          min_level = EXCLUDED.min_level,
          weight = EXCLUDED.weight,
          required = EXCLUDED.required,
          importance = EXCLUDED.importance,
          level = EXCLUDED.level,
          not_relevant = EXCLUDED.not_relevant,
          onet_updated_at = EXCLUDED.onet_updated_at,
          source = EXCLUDED.source,
          updated_at = now();

    INSERT INTO talent_employees (org_id, employee_id, role_id, name, avatar_url, workload, allocation, privacy, updated_at)
    SELECT
      t.org_id,
      e.item->>'id',
      e.item->>'roleId',
      e.item->>'name',
      e.item->>'avatarUrl',
      e.item->>'workload',
      CASE
        WHEN e.item ? 'allocation' THEN (e.item->>'allocation')::int
        ELSE NULL
      END,
      COALESCE(e.item->'privacy', '{}'::jsonb),
      now()
    FROM talent_studio_states t
    CROSS JOIN LATERAL jsonb_array_elements(COALESCE(t.payload->'employees', '[]'::jsonb)) AS e(item)
    ON CONFLICT (org_id, employee_id) DO UPDATE
      SET role_id = EXCLUDED.role_id,
          name = EXCLUDED.name,
          avatar_url = EXCLUDED.avatar_url,
          workload = EXCLUDED.workload,
          allocation = EXCLUDED.allocation,
          privacy = EXCLUDED.privacy,
          updated_at = now();

    INSERT INTO talent_employee_assertions (
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
      t.org_id,
      a.item->>'id',
      a.item->>'personId',
      a.item->>'skillId',
      a.item->>'status',
      a.item->>'source',
      COALESCE((a.item->>'level')::int, 0),
      COALESCE((a.item->>'confidence')::numeric, 0),
      CASE
        WHEN a.item ? 'lastUsedAt' AND NULLIF(a.item->>'lastUsedAt', '') IS NOT NULL
          THEN (a.item->>'lastUsedAt')::timestamptz
        ELSE NULL
      END,
      COALESCE(a.item->'evidenceIds', '[]'::jsonb),
      COALESCE((a.item->>'createdAt')::timestamptz, now()),
      COALESCE((a.item->>'updatedAt')::timestamptz, now())
    FROM talent_studio_states t
    CROSS JOIN LATERAL jsonb_array_elements(COALESCE(t.payload->'employees', '[]'::jsonb)) AS e(item)
    CROSS JOIN LATERAL jsonb_array_elements(COALESCE(e.item->'assertions', '[]'::jsonb)) AS a(item)
    ON CONFLICT (org_id, assertion_id) DO UPDATE
      SET person_id = EXCLUDED.person_id,
          skill_id = EXCLUDED.skill_id,
          status = EXCLUDED.status,
          source = EXCLUDED.source,
          level = EXCLUDED.level,
          confidence = EXCLUDED.confidence,
          last_used_at = EXCLUDED.last_used_at,
          evidence_ids = EXCLUDED.evidence_ids,
          created_at = EXCLUDED.created_at,
          updated_at = EXCLUDED.updated_at;

    INSERT INTO talent_studio_collections (org_id, collection, payload, updated_at)
    SELECT
      t.org_id,
      k.collection,
      COALESCE(t.payload->k.collection, '[]'::jsonb),
      now()
    FROM talent_studio_states t
    CROSS JOIN (
      VALUES
        ('resources'),
        ('plans'),
        ('outbox'),
        ('permits'),
        ('tasks'),
        ('taskRequirements'),
        ('permitSchemas'),
        ('crewBlueprints'),
        ('projects'),
        ('personPermits'),
        ('complianceTrainings'),
        ('teamBuilds'),
        ('publishedConfigs')
    ) AS k(collection)
    ON CONFLICT (org_id, collection) DO UPDATE
      SET payload = EXCLUDED.payload,
          updated_at = now();
  END IF;
END
$$;

-- Optional cleanup after rollout:
-- DROP TABLE IF EXISTS talent_studio_states;
