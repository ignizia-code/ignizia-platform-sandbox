-- ============================================================================
-- Talent Studio Project Resourcing (Normalized)
-- ============================================================================
-- Creates normalized project staffing + recommendation tables.

CREATE TABLE IF NOT EXISTS talent_projects (
  org_id UUID NOT NULL,
  project_id TEXT NOT NULL,
  name TEXT NOT NULL,
  owner_id TEXT NOT NULL,
  description TEXT NULL,
  priority TEXT NOT NULL DEFAULT 'medium',
  team_or_site TEXT NULL,
  status TEXT NOT NULL DEFAULT 'draft',
  start_date DATE NULL,
  end_date DATE NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (org_id, project_id),
  CONSTRAINT talent_projects_priority_check CHECK (priority IN ('low', 'medium', 'high', 'critical')),
  CONSTRAINT talent_projects_status_check CHECK (status IN ('draft', 'active', 'paused', 'complete'))
);

CREATE TABLE IF NOT EXISTS talent_project_role_demands (
  org_id UUID NOT NULL,
  demand_id TEXT NOT NULL,
  project_id TEXT NOT NULL,
  role_id TEXT NOT NULL,
  title TEXT NULL,
  required_count INTEGER NOT NULL DEFAULT 1,
  seniority TEXT NULL,
  constraints JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (org_id, demand_id),
  CONSTRAINT talent_project_role_demands_required_count_check CHECK (required_count > 0),
  CONSTRAINT talent_project_role_demands_project_fk
    FOREIGN KEY (org_id, project_id)
    REFERENCES talent_projects(org_id, project_id)
    ON DELETE CASCADE,
  CONSTRAINT talent_project_role_demands_role_fk
    FOREIGN KEY (org_id, role_id)
    REFERENCES talent_roles(org_id, role_id)
    ON DELETE RESTRICT
);

CREATE TABLE IF NOT EXISTS talent_project_demand_skills (
  org_id UUID NOT NULL,
  demand_id TEXT NOT NULL,
  skill_id TEXT NOT NULL,
  min_level INTEGER NOT NULL,
  weight NUMERIC(8,3) NOT NULL DEFAULT 1,
  source TEXT NOT NULL DEFAULT 'role_requirement',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (org_id, demand_id, skill_id),
  CONSTRAINT talent_project_demand_skills_min_level_check CHECK (min_level BETWEEN 1 AND 5),
  CONSTRAINT talent_project_demand_skills_fk
    FOREIGN KEY (org_id, demand_id)
    REFERENCES talent_project_role_demands(org_id, demand_id)
    ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS talent_project_assignments (
  org_id UUID NOT NULL,
  assignment_id TEXT NOT NULL,
  project_id TEXT NOT NULL,
  demand_id TEXT NOT NULL,
  employee_id TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'assigned',
  assigned_by TEXT NULL,
  reason TEXT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (org_id, assignment_id),
  CONSTRAINT talent_project_assignments_status_check CHECK (status IN ('assigned', 'confirmed', 'removed')),
  CONSTRAINT talent_project_assignments_project_fk
    FOREIGN KEY (org_id, project_id)
    REFERENCES talent_projects(org_id, project_id)
    ON DELETE CASCADE,
  CONSTRAINT talent_project_assignments_demand_fk
    FOREIGN KEY (org_id, demand_id)
    REFERENCES talent_project_role_demands(org_id, demand_id)
    ON DELETE CASCADE,
  CONSTRAINT talent_project_assignments_employee_fk
    FOREIGN KEY (org_id, employee_id)
    REFERENCES talent_employees(org_id, employee_id)
    ON DELETE RESTRICT
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_talent_project_assignments_active_unique
  ON talent_project_assignments(org_id, demand_id, employee_id)
  WHERE status <> 'removed';

CREATE TABLE IF NOT EXISTS talent_project_shortlists (
  org_id UUID NOT NULL,
  shortlist_id TEXT NOT NULL,
  project_id TEXT NOT NULL,
  demand_id TEXT NOT NULL,
  employee_id TEXT NOT NULL,
  reason TEXT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (org_id, shortlist_id),
  CONSTRAINT talent_project_shortlists_project_fk
    FOREIGN KEY (org_id, project_id)
    REFERENCES talent_projects(org_id, project_id)
    ON DELETE CASCADE,
  CONSTRAINT talent_project_shortlists_demand_fk
    FOREIGN KEY (org_id, demand_id)
    REFERENCES talent_project_role_demands(org_id, demand_id)
    ON DELETE CASCADE,
  CONSTRAINT talent_project_shortlists_employee_fk
    FOREIGN KEY (org_id, employee_id)
    REFERENCES talent_employees(org_id, employee_id)
    ON DELETE RESTRICT
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_talent_project_shortlists_unique
  ON talent_project_shortlists(org_id, demand_id, employee_id);

CREATE TABLE IF NOT EXISTS talent_recommendation_runs (
  org_id UUID NOT NULL,
  run_id TEXT NOT NULL,
  project_id TEXT NOT NULL,
  demand_id TEXT NULL,
  mode TEXT NOT NULL DEFAULT 'individual',
  model TEXT NOT NULL,
  prompt_version TEXT NOT NULL DEFAULT 'v1',
  deterministic_features JSONB NOT NULL DEFAULT '{}'::jsonb,
  input_snapshot JSONB NOT NULL DEFAULT '{}'::jsonb,
  summary JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_by TEXT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (org_id, run_id),
  CONSTRAINT talent_recommendation_runs_mode_check CHECK (mode IN ('individual', 'team')),
  CONSTRAINT talent_recommendation_runs_project_fk
    FOREIGN KEY (org_id, project_id)
    REFERENCES talent_projects(org_id, project_id)
    ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS talent_recommendation_candidates (
  org_id UUID NOT NULL,
  candidate_rec_id TEXT NOT NULL,
  run_id TEXT NOT NULL,
  employee_id TEXT NOT NULL,
  demand_id TEXT NULL,
  rank INTEGER NOT NULL,
  score NUMERIC(12,4) NOT NULL,
  reasoning JSONB NOT NULL DEFAULT '{}'::jsonb,
  risks JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (org_id, candidate_rec_id),
  CONSTRAINT talent_recommendation_candidates_rank_check CHECK (rank > 0),
  CONSTRAINT talent_recommendation_candidates_run_fk
    FOREIGN KEY (org_id, run_id)
    REFERENCES talent_recommendation_runs(org_id, run_id)
    ON DELETE CASCADE,
  CONSTRAINT talent_recommendation_candidates_employee_fk
    FOREIGN KEY (org_id, employee_id)
    REFERENCES talent_employees(org_id, employee_id)
    ON DELETE RESTRICT
);

CREATE INDEX IF NOT EXISTS idx_talent_projects_org_updated
  ON talent_projects(org_id, updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_talent_project_demands_project
  ON talent_project_role_demands(org_id, project_id);
CREATE INDEX IF NOT EXISTS idx_talent_project_demands_role
  ON talent_project_role_demands(org_id, role_id);
CREATE INDEX IF NOT EXISTS idx_talent_assignments_project
  ON talent_project_assignments(org_id, project_id, demand_id);
CREATE INDEX IF NOT EXISTS idx_talent_shortlists_project
  ON talent_project_shortlists(org_id, project_id, demand_id);
CREATE INDEX IF NOT EXISTS idx_talent_recommendation_candidates_rank
  ON talent_recommendation_candidates(org_id, run_id, rank);

ALTER TABLE talent_projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE talent_project_role_demands ENABLE ROW LEVEL SECURITY;
ALTER TABLE talent_project_demand_skills ENABLE ROW LEVEL SECURITY;
ALTER TABLE talent_project_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE talent_project_shortlists ENABLE ROW LEVEL SECURITY;
ALTER TABLE talent_recommendation_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE talent_recommendation_candidates ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE policyname = 'talent_projects_allow_all'
      AND tablename = 'talent_projects'
  ) THEN
    CREATE POLICY talent_projects_allow_all
      ON talent_projects FOR ALL
      USING (true) WITH CHECK (true);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE policyname = 'talent_project_role_demands_allow_all'
      AND tablename = 'talent_project_role_demands'
  ) THEN
    CREATE POLICY talent_project_role_demands_allow_all
      ON talent_project_role_demands FOR ALL
      USING (true) WITH CHECK (true);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE policyname = 'talent_project_demand_skills_allow_all'
      AND tablename = 'talent_project_demand_skills'
  ) THEN
    CREATE POLICY talent_project_demand_skills_allow_all
      ON talent_project_demand_skills FOR ALL
      USING (true) WITH CHECK (true);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE policyname = 'talent_project_assignments_allow_all'
      AND tablename = 'talent_project_assignments'
  ) THEN
    CREATE POLICY talent_project_assignments_allow_all
      ON talent_project_assignments FOR ALL
      USING (true) WITH CHECK (true);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE policyname = 'talent_project_shortlists_allow_all'
      AND tablename = 'talent_project_shortlists'
  ) THEN
    CREATE POLICY talent_project_shortlists_allow_all
      ON talent_project_shortlists FOR ALL
      USING (true) WITH CHECK (true);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE policyname = 'talent_recommendation_runs_allow_all'
      AND tablename = 'talent_recommendation_runs'
  ) THEN
    CREATE POLICY talent_recommendation_runs_allow_all
      ON talent_recommendation_runs FOR ALL
      USING (true) WITH CHECK (true);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE policyname = 'talent_recommendation_candidates_allow_all'
      AND tablename = 'talent_recommendation_candidates'
  ) THEN
    CREATE POLICY talent_recommendation_candidates_allow_all
      ON talent_recommendation_candidates FOR ALL
      USING (true) WITH CHECK (true);
  END IF;
END
$$;
