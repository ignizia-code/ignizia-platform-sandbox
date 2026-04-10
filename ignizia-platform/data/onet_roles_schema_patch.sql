-- Safe incremental patch for existing Talent Studio schemas.
-- This does NOT drop existing tables/data.

ALTER TABLE public.talent_roles
  ADD COLUMN IF NOT EXISTS source TEXT NOT NULL DEFAULT 'manual',
  ADD COLUMN IF NOT EXISTS onet_soc_code TEXT NULL,
  ADD COLUMN IF NOT EXISTS onet_last_updated_at DATE NULL,
  ADD COLUMN IF NOT EXISTS synced_at TIMESTAMPTZ NULL;

ALTER TABLE public.talent_role_requirements
  ADD COLUMN IF NOT EXISTS skill_name TEXT NULL,
  ADD COLUMN IF NOT EXISTS element_id TEXT NULL,
  ADD COLUMN IF NOT EXISTS importance NUMERIC(8,3) NULL,
  ADD COLUMN IF NOT EXISTS level NUMERIC(8,3) NULL,
  ADD COLUMN IF NOT EXISTS not_relevant BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS onet_updated_at DATE NULL,
  ADD COLUMN IF NOT EXISTS source TEXT NOT NULL DEFAULT 'manual';

CREATE INDEX IF NOT EXISTS idx_talent_roles_onet_soc
  ON public.talent_roles(org_id, onet_soc_code);
