/**
 * Canonical Propagation Registry — Phase 1
 *
 * Static definitions for personas, departments, and their canonical
 * relationships. This is the single source of truth for the propagation
 * graph structure. No database, no Supabase — pure code.
 */

import type { PersonaId, DepartmentId, RelationshipType } from '@/types/propagation';

// ---------------------------------------------------------------------------
// Persona definitions
// ---------------------------------------------------------------------------

export interface PersonaDef {
  id: PersonaId;
  label: string;
  icon: string;
  department: DepartmentId;
  strategyRole: string;
  canAuthorStrategy: boolean;
  canApproveStrategy: boolean;
}

export const PERSONAS: Record<PersonaId, PersonaDef> = {
  plant_manager: {
    id: 'plant_manager',
    label: 'Plant Manager',
    icon: 'factory',
    department: 'production_and_operations',
    strategyRole: 'Owns local strategy; approves scale decisions; monitors adoption and stability; receives escalations.',
    canAuthorStrategy: true,
    canApproveStrategy: true,
  },
  operations_manager: {
    id: 'operations_manager',
    label: 'Operations Manager',
    icon: 'engineering',
    department: 'production_and_operations',
    strategyRole: 'Translates strategy into execution; owns rollout across production; gated by Quality & Safety readiness.',
    canAuthorStrategy: false,
    canApproveStrategy: false,
  },
  line_manager: {
    id: 'line_manager',
    label: 'Line Manager',
    icon: 'supervisor_account',
    department: 'production_and_operations',
    strategyRole: 'Executes team/line rollout; manages local adoption; depends on Ops direction and HR readiness.',
    canAuthorStrategy: false,
    canApproveStrategy: false,
  },
  hr_manager: {
    id: 'hr_manager',
    label: 'HR Manager',
    icon: 'people',
    department: 'workforce_and_hr',
    strategyRole: 'Owns workforce readiness, training coverage, adoption health, capability gaps; blocks rollout when incomplete.',
    canAuthorStrategy: false,
    canApproveStrategy: false,
  },
  procurement: {
    id: 'procurement',
    label: 'Procurement',
    icon: 'inventory_2',
    department: 'procurement_and_materials',
    strategyRole: 'Owns materials, vendor, and supply dependencies; blocks rollout when parts, tooling, or sensors are missing.',
    canAuthorStrategy: false,
    canApproveStrategy: false,
  },
  leather_cutter: {
    id: 'leather_cutter',
    label: 'Leather Cutter',
    icon: 'content_cut',
    department: 'production_and_operations',
    strategyRole: 'Execution persona only: receives change, training, and task updates; provides feedback and adoption signals.',
    canAuthorStrategy: false,
    canApproveStrategy: false,
  },
};

// ---------------------------------------------------------------------------
// Department definitions
// ---------------------------------------------------------------------------

export interface DepartmentDef {
  id: DepartmentId;
  label: string;
  icon: string;
  description: string;
}

export const DEPARTMENTS: Record<DepartmentId, DepartmentDef> = {
  production_and_operations: {
    id: 'production_and_operations',
    label: 'Production & Operations',
    icon: 'precision_manufacturing',
    description: 'Core value engine — production lines, operational execution, and throughput delivery.',
  },
  quality_and_safety: {
    id: 'quality_and_safety',
    label: 'Quality & Safety',
    icon: 'health_and_safety',
    description: 'Gateway to scale — compliance, certification, safety standards, and quality assurance.',
  },
  workforce_and_hr: {
    id: 'workforce_and_hr',
    label: 'Workforce & HR',
    icon: 'groups',
    description: 'Workforce readiness — training, adoption health, capability gaps, and team readiness.',
  },
  procurement_and_materials: {
    id: 'procurement_and_materials',
    label: 'Procurement & Materials',
    icon: 'local_shipping',
    description: 'Supply chain gate — materials, vendor dependencies, and equipment availability.',
  },
};

// ---------------------------------------------------------------------------
// Canonical relationships (persona ↔ persona)
// ---------------------------------------------------------------------------

export interface CanonicalRelationship {
  sourcePersona: PersonaId;
  targetPersona: PersonaId;
  relationship: RelationshipType;
  context: string;
}

export const CANONICAL_RELATIONSHIPS: CanonicalRelationship[] = [
  // Plant Manager relationships
  { sourcePersona: 'plant_manager', targetPersona: 'operations_manager', relationship: 'owns', context: 'Sets strategic direction that Operations Manager translates into execution' },
  { sourcePersona: 'plant_manager', targetPersona: 'line_manager', relationship: 'approves', context: 'Approves scale decisions and rollout expansion at team level' },

  // Operations Manager relationships
  { sourcePersona: 'operations_manager', targetPersona: 'line_manager', relationship: 'owns', context: 'Directs team/line rollout and sets execution priorities' },
  { sourcePersona: 'operations_manager', targetPersona: 'procurement', relationship: 'depends_on', context: 'Requires materials, sensors, and tooling to proceed with rollout' },
  { sourcePersona: 'operations_manager', targetPersona: 'hr_manager', relationship: 'requires_readiness_from', context: 'Cannot scale without workforce readiness and completed training' },
  { sourcePersona: 'operations_manager', targetPersona: 'plant_manager', relationship: 'escalates_to', context: 'Escalates blockers and cross-functional conflicts to Plant Manager' },

  // Line Manager relationships
  { sourcePersona: 'line_manager', targetPersona: 'leather_cutter', relationship: 'executes', context: 'Deploys strategy changes to execution-level workers' },
  { sourcePersona: 'line_manager', targetPersona: 'hr_manager', relationship: 'requires_training_from', context: 'Needs training programs completed before team adoption' },
  { sourcePersona: 'line_manager', targetPersona: 'procurement', relationship: 'is_blocked_by', context: 'Blocked when materials or equipment are unavailable' },
  { sourcePersona: 'line_manager', targetPersona: 'operations_manager', relationship: 'escalates_to', context: 'Escalates team-level issues and adoption blockers' },

  // HR Manager relationships
  { sourcePersona: 'hr_manager', targetPersona: 'line_manager', relationship: 'owns', context: 'Owns training schedules, capability assessments, and readiness sign-off' },

  // Procurement relationships
  { sourcePersona: 'procurement', targetPersona: 'operations_manager', relationship: 'provides_feedback_to', context: 'Reports supply status, delays, and vendor constraints' },

  // Leather Cutter relationships
  { sourcePersona: 'leather_cutter', targetPersona: 'line_manager', relationship: 'provides_feedback_to', context: 'Provides adoption signals, resistance feedback, and task-level issues' },
  { sourcePersona: 'leather_cutter', targetPersona: 'hr_manager', relationship: 'provides_feedback_to', context: 'Provides training effectiveness feedback and capability gaps' },
];

// ---------------------------------------------------------------------------
// Canonical department relationships (persona ↔ department)
// ---------------------------------------------------------------------------

export interface PersonaDepartmentRelationship {
  personaId: PersonaId;
  departmentId: DepartmentId;
  relationship: RelationshipType;
  context: string;
}

export const PERSONA_DEPARTMENT_RELATIONSHIPS: PersonaDepartmentRelationship[] = [
  { personaId: 'operations_manager', departmentId: 'quality_and_safety', relationship: 'requires_readiness_from', context: 'Rollout gated by Quality & Safety certification and compliance' },
  { personaId: 'operations_manager', departmentId: 'procurement_and_materials', relationship: 'depends_on', context: 'Execution depends on material and sensor availability from Procurement' },
  { personaId: 'line_manager', departmentId: 'workforce_and_hr', relationship: 'requires_training_from', context: 'Team rollout requires workforce training and readiness clearance' },
  { personaId: 'hr_manager', departmentId: 'quality_and_safety', relationship: 'requires_readiness_from', context: 'Training programs must align with safety and compliance requirements' },
  { personaId: 'plant_manager', departmentId: 'production_and_operations', relationship: 'owns', context: 'Owns strategic direction for production and operational execution' },
  { personaId: 'plant_manager', departmentId: 'quality_and_safety', relationship: 'approves', context: 'Approves compliance waivers and safety certification decisions' },
];

// ---------------------------------------------------------------------------
// Canonical gates
// ---------------------------------------------------------------------------

export interface CanonicalGate {
  name: string;
  type: 'readiness' | 'compliance' | 'approval' | 'autonomy';
  ownerPersonaId: PersonaId;
  departmentId: DepartmentId;
  description: string;
}

export const CANONICAL_GATES: CanonicalGate[] = [
  { name: 'Safety Certification', type: 'compliance', ownerPersonaId: 'plant_manager', departmentId: 'quality_and_safety', description: 'ISO/safety re-certification must be cleared before company-wide scale' },
  { name: 'Workforce Readiness', type: 'readiness', ownerPersonaId: 'hr_manager', departmentId: 'workforce_and_hr', description: 'Training coverage and capability gaps must be resolved' },
  { name: 'Material Availability', type: 'readiness', ownerPersonaId: 'procurement', departmentId: 'procurement_and_materials', description: 'All required sensors, parts, and tooling must be procured' },
  { name: 'Scale Approval', type: 'approval', ownerPersonaId: 'plant_manager', departmentId: 'production_and_operations', description: 'Plant Manager must approve broader rollout to additional lines' },
  { name: 'Quality Gate', type: 'compliance', ownerPersonaId: 'operations_manager', departmentId: 'quality_and_safety', description: 'Defect rate and quality metrics must meet threshold before expansion' },
];
