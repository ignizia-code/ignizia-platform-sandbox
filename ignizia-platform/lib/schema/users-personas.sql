-- Users & Personas schema (for reference; current app uses in-memory store until Supabase).
-- When migrating to Supabase/Postgres, create these tables and point API to them.

-- Personas: role-based profiles (Maria, Plant Manager, etc.)
CREATE TABLE IF NOT EXISTS personas (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  role_label TEXT NOT NULL,
  app_role TEXT NOT NULL,
  context TEXT,
  responsibilities JSONB DEFAULT '[]',
  goals JSONB DEFAULT '[]',
  pain_points JSONB DEFAULT '[]',
  ignizia_support JSONB DEFAULT '[]',
  meta JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Users: one user can be linked to one persona (login resolves to user → persona)
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  email TEXT UNIQUE,
  persona_id TEXT NOT NULL REFERENCES personas(id),
  display_name TEXT,
  avatar_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_users_persona ON users(persona_id);
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
