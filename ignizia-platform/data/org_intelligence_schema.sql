-- ==========================================================================
-- IGNIZIA Org Intelligence — Supabase Schema + Seed Data
-- Paste this entire script into the Supabase SQL Editor and run it.
-- ==========================================================================

-- 1. TABLES
-- ==========================================================================

CREATE TABLE IF NOT EXISTS org_nodes (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id        UUID NOT NULL DEFAULT '00000000-0000-0000-0000-000000000001',
  parent_id     UUID REFERENCES org_nodes(id) ON DELETE SET NULL,
  node_type     TEXT NOT NULL CHECK (node_type IN ('root', 'department', 'team', 'role', 'position')),
  entity_type   TEXT NULL CHECK (entity_type IN ('organization', 'department', 'role', 'employee', 'team', 'position')),
  name          TEXT NOT NULL,
  description   TEXT,
  manager_id    UUID REFERENCES org_nodes(id) ON DELETE SET NULL,
  talent_department_id TEXT NULL,
  talent_role_id TEXT NULL,
  talent_employee_id TEXT NULL,
  metadata      JSONB DEFAULT '{}',
  display_order INT DEFAULT 0,
  is_vacant     BOOLEAN DEFAULT false,
  headcount     INT DEFAULT 1,
  created_at    TIMESTAMPTZ DEFAULT now(),
  updated_at    TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS org_edges (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id        UUID NOT NULL DEFAULT '00000000-0000-0000-0000-000000000001',
  source_id     UUID NOT NULL REFERENCES org_nodes(id) ON DELETE CASCADE,
  target_id     UUID NOT NULL REFERENCES org_nodes(id) ON DELETE CASCADE,
  edge_type     TEXT NOT NULL CHECK (edge_type IN ('reports_to', 'manages', 'dotted_line', 'collaborates')),
  metadata      JSONB DEFAULT '{}',
  created_at    TIMESTAMPTZ DEFAULT now(),
  UNIQUE(source_id, target_id, edge_type)
);

CREATE TABLE IF NOT EXISTS org_activity_log (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id        UUID NOT NULL DEFAULT '00000000-0000-0000-0000-000000000001',
  action        TEXT NOT NULL,
  actor         TEXT NOT NULL DEFAULT 'ai',
  node_id       UUID REFERENCES org_nodes(id) ON DELETE SET NULL,
  before_state  JSONB,
  after_state   JSONB,
  summary       TEXT,
  created_at    TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS org_chat_history (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id        UUID NOT NULL DEFAULT '00000000-0000-0000-0000-000000000001',
  role          TEXT NOT NULL CHECK (role IN ('user', 'assistant', 'system')),
  content       TEXT NOT NULL,
  metadata      JSONB DEFAULT '{}',
  created_at    TIMESTAMPTZ DEFAULT now()
);

-- Backward-compatible additive columns for existing tables
ALTER TABLE org_nodes ADD COLUMN IF NOT EXISTS entity_type TEXT NULL;
ALTER TABLE org_nodes ADD COLUMN IF NOT EXISTS talent_department_id TEXT NULL;
ALTER TABLE org_nodes ADD COLUMN IF NOT EXISTS talent_role_id TEXT NULL;
ALTER TABLE org_nodes ADD COLUMN IF NOT EXISTS talent_employee_id TEXT NULL;
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'org_nodes_entity_type_check'
      AND conrelid = 'org_nodes'::regclass
  ) THEN
    ALTER TABLE org_nodes
      ADD CONSTRAINT org_nodes_entity_type_check
      CHECK (entity_type IS NULL OR entity_type IN ('organization', 'department', 'role', 'employee', 'team', 'position'));
  END IF;
END $$;

-- 2. INDEXES
-- ==========================================================================

CREATE INDEX IF NOT EXISTS idx_org_nodes_parent ON org_nodes(parent_id);
CREATE INDEX IF NOT EXISTS idx_org_nodes_org ON org_nodes(org_id);
CREATE INDEX IF NOT EXISTS idx_org_nodes_type ON org_nodes(node_type);
CREATE INDEX IF NOT EXISTS idx_org_nodes_entity_type ON org_nodes(entity_type);
CREATE UNIQUE INDEX IF NOT EXISTS idx_org_nodes_unique_talent_department
  ON org_nodes(org_id, talent_department_id)
  WHERE talent_department_id IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS idx_org_nodes_unique_talent_employee
  ON org_nodes(org_id, talent_employee_id)
  WHERE talent_employee_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_org_edges_source ON org_edges(source_id);
CREATE INDEX IF NOT EXISTS idx_org_edges_target ON org_edges(target_id);
CREATE INDEX IF NOT EXISTS idx_org_activity_log_org ON org_activity_log(org_id);
CREATE INDEX IF NOT EXISTS idx_org_activity_log_created ON org_activity_log(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_org_chat_org ON org_chat_history(org_id);
CREATE INDEX IF NOT EXISTS idx_org_chat_created ON org_chat_history(created_at);

-- 3. ROW LEVEL SECURITY (permissive for demo)
-- ==========================================================================

ALTER TABLE org_nodes ENABLE ROW LEVEL SECURITY;
ALTER TABLE org_edges ENABLE ROW LEVEL SECURITY;
ALTER TABLE org_activity_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE org_chat_history ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'org_nodes_allow_all' AND tablename = 'org_nodes') THEN
    CREATE POLICY org_nodes_allow_all ON org_nodes FOR ALL USING (true) WITH CHECK (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'org_edges_allow_all' AND tablename = 'org_edges') THEN
    CREATE POLICY org_edges_allow_all ON org_edges FOR ALL USING (true) WITH CHECK (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'org_activity_log_allow_all' AND tablename = 'org_activity_log') THEN
    CREATE POLICY org_activity_log_allow_all ON org_activity_log FOR ALL USING (true) WITH CHECK (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'org_chat_history_allow_all' AND tablename = 'org_chat_history') THEN
    CREATE POLICY org_chat_history_allow_all ON org_chat_history FOR ALL USING (true) WITH CHECK (true);
  END IF;
END
$$;

-- 4. SEED DATA — Organization Structure
-- ==========================================================================
-- This creates a realistic manufacturing org matching the existing Talent Studio seed data.
-- Structure: Root → Plant Manager (Alex) → Departments → Roles
-- Leadership: Alex (Plant Manager), Pedram (Operations Manager), Hana (HR Manager)
-- Position nodes link to talent_employees via talent_employee_id.

-- Clear any existing seed data (safe to re-run)
DELETE FROM org_edges WHERE org_id = '00000000-0000-0000-0000-000000000001';
DELETE FROM org_activity_log WHERE org_id = '00000000-0000-0000-0000-000000000001';
DELETE FROM org_chat_history WHERE org_id = '00000000-0000-0000-0000-000000000001';
DELETE FROM org_nodes WHERE org_id = '00000000-0000-0000-0000-000000000001';

-- 4a. Root node
INSERT INTO org_nodes (id, org_id, parent_id, node_type, name, description, display_order)
VALUES (
  'a0000000-0000-0000-0000-000000000001',
  '00000000-0000-0000-0000-000000000001',
  NULL,
  'root',
  'Factory One',
  'Reference manufacturing organization',
  0
);

-- 4b. Departments (under root)
INSERT INTO org_nodes (id, org_id, parent_id, node_type, name, description, display_order) VALUES
  ('d0000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000001', 'department', 'Production & Operations', 'Manufacturing lines, assembly, and production floor operations', 0),
  ('d0000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000001', 'department', 'Quality & Safety', 'Quality control, inspections, compliance, and workplace safety', 1),
  ('d0000000-0000-0000-0000-000000000003', '00000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000001', 'department', 'Maintenance', 'Equipment maintenance, repair, and preventive upkeep', 2),
  ('d0000000-0000-0000-0000-000000000004', '00000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000001', 'department', 'Logistics & Warehousing', 'Inventory management, warehousing, and material flow', 3),
  ('d0000000-0000-0000-0000-000000000005', '00000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000001', 'department', 'Procurement', 'Vendor relations, purchasing, and supply chain planning', 4),
  ('d0000000-0000-0000-0000-000000000006', '00000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000001', 'department', 'HR & Administration', 'People operations, payroll, and corporate administration', 5);

-- 4c. Roles under Production & Operations
INSERT INTO org_nodes (id, org_id, parent_id, node_type, name, description, display_order) VALUES
  ('e0000000-0000-0000-0000-000000000004', '00000000-0000-0000-0000-000000000001', 'd0000000-0000-0000-0000-000000000001', 'role', 'Site Manager', 'Oversees daily operations and safety at specific locations', 0),
  ('e0000000-0000-0000-0000-000000000006', '00000000-0000-0000-0000-000000000001', 'd0000000-0000-0000-0000-000000000001', 'role', 'Stitching Operator', 'Operates industrial sewing machines for leather and textile assembly', 1),
  ('e0000000-0000-0000-0000-000000000007', '00000000-0000-0000-0000-000000000001', 'd0000000-0000-0000-0000-000000000001', 'role', 'Cutting Machine Operator', 'Operates cutting machines for material preparation and pattern work', 2),
  ('e0000000-0000-0000-0000-000000000010', '00000000-0000-0000-0000-000000000001', 'd0000000-0000-0000-0000-000000000001', 'role', 'Production Supervisor', 'Supervises production line workers and ensures shift targets are met', 3);

-- 4d. Roles under Quality & Safety
INSERT INTO org_nodes (id, org_id, parent_id, node_type, name, description, display_order) VALUES
  ('e0000000-0000-0000-0000-000000000005', '00000000-0000-0000-0000-000000000001', 'd0000000-0000-0000-0000-000000000002', 'role', 'Compliance Officer', 'Ensures the organization adheres to legal and regulatory standards', 0),
  ('e0000000-0000-0000-0000-000000000008', '00000000-0000-0000-0000-000000000001', 'd0000000-0000-0000-0000-000000000002', 'role', 'Quality Inspector', 'Inspects products and processes to ensure quality standards are met', 1);

-- 4e. Roles under Maintenance
INSERT INTO org_nodes (id, org_id, parent_id, node_type, name, description, display_order) VALUES
  ('e0000000-0000-0000-0000-000000000009', '00000000-0000-0000-0000-000000000001', 'd0000000-0000-0000-0000-000000000003', 'role', 'Maintenance Technician', 'Performs preventive and corrective maintenance on production equipment', 0);

-- 4f. Roles under Logistics & Warehousing
INSERT INTO org_nodes (id, org_id, parent_id, node_type, name, description, display_order) VALUES
  ('e0000000-0000-0000-0000-000000000011', '00000000-0000-0000-0000-000000000001', 'd0000000-0000-0000-0000-000000000004', 'role', 'Warehouse Operator', 'Manages inventory receiving, storage, and dispatch operations', 0);

-- 4g. Roles under Procurement
INSERT INTO org_nodes (id, org_id, parent_id, node_type, name, description, display_order) VALUES
  ('e0000000-0000-0000-0000-000000000012', '00000000-0000-0000-0000-000000000001', 'd0000000-0000-0000-0000-000000000005', 'role', 'Procurement Specialist', 'Manages vendor relationships and purchasing for materials and equipment', 0);

-- 4h. Leadership roles
-- Plant Manager sits directly under root (oversees entire factory)
INSERT INTO org_nodes (id, org_id, parent_id, node_type, entity_type, name, description, display_order) VALUES
  ('e0000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000001', 'role', 'role', 'Plant Manager', 'Oversees all factory operations, departments, and strategic direction', 0);

-- Operations Manager under Production & Operations
INSERT INTO org_nodes (id, org_id, parent_id, node_type, entity_type, name, description, display_order) VALUES
  ('e0000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000001', 'd0000000-0000-0000-0000-000000000001', 'role', 'role', 'Operations Manager', 'Manages daily production workflows, supply chain coordination, and operational targets', 0);

-- HR Manager under HR & Administration
INSERT INTO org_nodes (id, org_id, parent_id, node_type, entity_type, name, description, display_order) VALUES
  ('e0000000-0000-0000-0000-000000000003', '00000000-0000-0000-0000-000000000001', 'd0000000-0000-0000-0000-000000000006', 'role', 'role', 'HR Manager', 'Oversees people operations, recruitment, training, and employee relations', 0);

-- 4h-b. Employee/position nodes for leadership (linked to talent_employees)
INSERT INTO org_nodes (id, org_id, parent_id, node_type, entity_type, name, description, talent_employee_id, display_order) VALUES
  ('p0000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001', 'e0000000-0000-0000-0000-000000000001', 'position', 'employee', 'Alex', 'Plant Manager', 'emp-lead-alex', 0),
  ('p0000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000001', 'e0000000-0000-0000-0000-000000000002', 'position', 'employee', 'Pedram', 'Operations Manager', 'emp-lead-pedram', 0),
  ('p0000000-0000-0000-0000-000000000003', '00000000-0000-0000-0000-000000000001', 'e0000000-0000-0000-0000-000000000003', 'position', 'employee', 'Hana', 'HR Manager', 'emp-lead-hana', 0);

-- 4i. Reporting edges
-- Leadership: Operations Manager and HR Manager report to Plant Manager
INSERT INTO org_edges (org_id, source_id, target_id, edge_type) VALUES
  ('00000000-0000-0000-0000-000000000001', 'e0000000-0000-0000-0000-000000000002', 'e0000000-0000-0000-0000-000000000001', 'reports_to'),
  ('00000000-0000-0000-0000-000000000001', 'e0000000-0000-0000-0000-000000000003', 'e0000000-0000-0000-0000-000000000001', 'reports_to');

-- Site Manager reports to Operations Manager
INSERT INTO org_edges (org_id, source_id, target_id, edge_type) VALUES
  ('00000000-0000-0000-0000-000000000001', 'e0000000-0000-0000-0000-000000000004', 'e0000000-0000-0000-0000-000000000002', 'reports_to');

-- Production floor roles report to Site Manager
INSERT INTO org_edges (org_id, source_id, target_id, edge_type) VALUES
  ('00000000-0000-0000-0000-000000000001', 'e0000000-0000-0000-0000-000000000006', 'e0000000-0000-0000-0000-000000000004', 'reports_to'),
  ('00000000-0000-0000-0000-000000000001', 'e0000000-0000-0000-0000-000000000007', 'e0000000-0000-0000-0000-000000000004', 'reports_to'),
  ('00000000-0000-0000-0000-000000000001', 'e0000000-0000-0000-0000-000000000010', 'e0000000-0000-0000-0000-000000000004', 'reports_to');

-- Compliance Officer reports to Plant Manager; Quality Inspector reports to Compliance Officer
INSERT INTO org_edges (org_id, source_id, target_id, edge_type) VALUES
  ('00000000-0000-0000-0000-000000000001', 'e0000000-0000-0000-0000-000000000005', 'e0000000-0000-0000-0000-000000000001', 'reports_to'),
  ('00000000-0000-0000-0000-000000000001', 'e0000000-0000-0000-0000-000000000008', 'e0000000-0000-0000-0000-000000000005', 'reports_to');

-- 4j. Seed activity log
INSERT INTO org_activity_log (org_id, action, actor, summary) VALUES
  ('00000000-0000-0000-0000-000000000001', 'seed', 'system', 'Initial organization structure created from seed data');

-- ==========================================================================
-- DONE. Your org_nodes, org_edges, org_activity_log, and org_chat_history
-- tables are now ready. The Org Intelligence feature will load from these.
-- ==========================================================================
