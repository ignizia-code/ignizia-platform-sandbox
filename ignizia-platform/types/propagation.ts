/**
 * Propagation Model — Phase 1
 *
 * Anchored on fixed product personas and canonical departments with a typed
 * relationship vocabulary. Does NOT depend on freeform Talent Studio roles.
 */

// ---------------------------------------------------------------------------
// Relationship vocabulary
// ---------------------------------------------------------------------------

export const RELATIONSHIP_TYPES = [
  'owns',
  'approves',
  'executes',
  'depends_on',
  'is_blocked_by',
  'is_impacted_by',
  'requires_training_from',
  'requires_readiness_from',
  'escalates_to',
  'provides_feedback_to',
] as const;

export type RelationshipType = (typeof RELATIONSHIP_TYPES)[number];

export const RELATIONSHIP_LABELS: Record<RelationshipType, string> = {
  owns: 'Owns',
  approves: 'Approves',
  executes: 'Executes',
  depends_on: 'Depends on',
  is_blocked_by: 'Is blocked by',
  is_impacted_by: 'Is impacted by',
  requires_training_from: 'Requires training from',
  requires_readiness_from: 'Requires readiness from',
  escalates_to: 'Escalates to',
  provides_feedback_to: 'Provides feedback to',
};

// ---------------------------------------------------------------------------
// Persona and department identifiers
// ---------------------------------------------------------------------------

export const PERSONA_IDS = [
  'plant_manager',
  'operations_manager',
  'line_manager',
  'hr_manager',
  'procurement',
  'leather_cutter',
] as const;

export type PersonaId = (typeof PERSONA_IDS)[number];

export const DEPARTMENT_IDS = [
  'production_and_operations',
  'quality_and_safety',
  'workforce_and_hr',
  'procurement_and_materials',
] as const;

export type DepartmentId = (typeof DEPARTMENT_IDS)[number];

// ---------------------------------------------------------------------------
// Node types
// ---------------------------------------------------------------------------

export type PropagationNodeType = 'persona' | 'department';

export type NodeState =
  | 'not_assessed'
  | 'simulated'
  | 'ready'
  | 'live'
  | 'blocked'
  | 'unstable';

export interface PropagationNode {
  id: string;
  type: PropagationNodeType;
  personaId?: PersonaId;
  departmentId?: DepartmentId;
  label: string;
  icon: string;
  state: NodeState;
  strategyRelevance: string;
  owner: string | null;
  readiness: {
    approved: boolean;
    trained: boolean;
    equipped: boolean;
    complianceStatus: 'passed' | 'pending' | 'blocked' | 'not_assessed';
    trainingCoverage: number;
    adoptionSentiment: 'positive' | 'neutral' | 'resistant' | 'unknown';
  };
  blockers: { text: string; escalated: boolean }[];
  projectedImpact: { throughputDelta: number; defectDelta: number; costDelta: number } | null;
  actualImpact: { throughputDelta: number; defectDelta: number; costDelta: number } | null;
  nextDecision: string | null;
  gates: PropagationGate[];
}

// ---------------------------------------------------------------------------
// Edge type
// ---------------------------------------------------------------------------

export interface PropagationEdge {
  id: string;
  sourceId: string;
  targetId: string;
  relationship: RelationshipType;
  context: string;
}

// ---------------------------------------------------------------------------
// Gate model
// ---------------------------------------------------------------------------

export type GateType = 'readiness' | 'compliance' | 'approval' | 'autonomy';
export type GateStatus = 'passed' | 'pending' | 'blocked' | 'not_assessed';

export interface PropagationGate {
  id: string;
  name: string;
  type: GateType;
  ownerPersonaId: PersonaId;
  status: GateStatus;
  blockingReason: string | null;
}

// ---------------------------------------------------------------------------
// Full propagation graph for a strategy
// ---------------------------------------------------------------------------

export type OrgLens = 'alignment' | 'dependency' | 'readiness' | 'footprint';

export interface PropagationGraph {
  strategyId: string;
  nodes: PropagationNode[];
  edges: PropagationEdge[];
  generatedAt: string;
}
