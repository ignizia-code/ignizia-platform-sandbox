/**
 * Strategy Expansion Step
 *
 * Given a strategy (objective/initiative), builds propagation nodes and edges
 * from the canonical registry. Computes strategy relevance, blockers, readiness,
 * gates, and projected/actual impact per node.
 *
 * Persists only the generated propagation state in localStorage.
 */

import type {
  PropagationNode,
  PropagationEdge,
  PropagationGraph,
  PropagationGate,
  NodeState,
  PersonaId,
  DepartmentId,
} from '@/types/propagation';
import {
  PERSONAS,
  DEPARTMENTS,
  CANONICAL_RELATIONSHIPS,
  PERSONA_DEPARTMENT_RELATIONSHIPS,
  CANONICAL_GATES,
} from './registry';

// ---------------------------------------------------------------------------
// localStorage persistence
// ---------------------------------------------------------------------------

const GRAPH_KEY = 'strategy:propagation_graph';

function get<T>(key: string): T | null {
  try {
    const raw = typeof window !== 'undefined' ? localStorage.getItem(key) : null;
    return raw ? (JSON.parse(raw) as T) : null;
  } catch { return null; }
}

function set(key: string, value: unknown): void {
  try {
    if (typeof window !== 'undefined') localStorage.setItem(key, JSON.stringify(value));
  } catch { /* ignore */ }
}

export function loadPropagationGraph(strategyId: string): PropagationGraph | null {
  const all = get<Record<string, PropagationGraph>>(GRAPH_KEY) ?? {};
  return all[strategyId] ?? null;
}

export function savePropagationGraph(graph: PropagationGraph): void {
  const all = get<Record<string, PropagationGraph>>(GRAPH_KEY) ?? {};
  all[graph.strategyId] = graph;
  set(GRAPH_KEY, all);
}

export function clearAllPropagationGraphs(): void {
  try {
    if (typeof window !== 'undefined') localStorage.removeItem(GRAPH_KEY);
  } catch { /* ignore */ }
}

// ---------------------------------------------------------------------------
// UID helper
// ---------------------------------------------------------------------------

let counter = 0;
function uid(): string {
  return `${Date.now()}-${(counter++).toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
}

// ---------------------------------------------------------------------------
// Seed data for demo scenarios
// ---------------------------------------------------------------------------

interface SeedScenario {
  personaStates: Partial<Record<PersonaId, { state: NodeState; owner: string | null; blockers: { text: string; escalated: boolean }[] }>>;
  departmentStates: Partial<Record<DepartmentId, { state: NodeState; blockers: { text: string; escalated: boolean }[] }>>;
  gateOverrides: Record<string, 'passed' | 'pending' | 'blocked'>;
}

const DEFAULT_SCENARIO: SeedScenario = {
  personaStates: {
    plant_manager: { state: 'live', owner: 'Maya Torres', blockers: [] },
    operations_manager: { state: 'live', owner: 'J. Martinez', blockers: [] },
    line_manager: { state: 'ready', owner: 'R. Chen', blockers: [{ text: 'Sensor procurement delayed 2 weeks', escalated: false }] },
    hr_manager: { state: 'blocked', owner: 'L. Nguyen', blockers: [{ text: 'Training schedule conflict with night rotation', escalated: false }] },
    procurement: { state: 'blocked', owner: 'K. Yamamoto', blockers: [{ text: 'Sensor vendor lead time extended to 4 weeks', escalated: false }] },
    leather_cutter: { state: 'not_assessed', owner: null, blockers: [] },
  },
  departmentStates: {
    production_and_operations: { state: 'live', blockers: [] },
    quality_and_safety: { state: 'blocked', blockers: [{ text: 'ISO re-certification pending — blocks company-wide scale', escalated: false }] },
    workforce_and_hr: { state: 'blocked', blockers: [{ text: 'Training coverage at 60% — below threshold', escalated: false }] },
    procurement_and_materials: { state: 'blocked', blockers: [{ text: 'Sensor procurement delayed', escalated: false }] },
  },
  gateOverrides: {
    'Safety Certification': 'blocked',
    'Workforce Readiness': 'pending',
    'Material Availability': 'blocked',
    'Scale Approval': 'pending',
    'Quality Gate': 'passed',
  },
};

// ---------------------------------------------------------------------------
// Expansion engine
// ---------------------------------------------------------------------------

export function expandStrategyPropagation(strategyId: string, strategyName: string): PropagationGraph {
  const existing = loadPropagationGraph(strategyId);
  if (existing) return existing;

  const scenario = DEFAULT_SCENARIO;
  const nodes: PropagationNode[] = [];
  const edges: PropagationEdge[] = [];

  // Build persona nodes
  for (const persona of Object.values(PERSONAS)) {
    const scenarioState = scenario.personaStates[persona.id];
    const gates = buildGatesForPersona(persona.id, scenario.gateOverrides);

    const node: PropagationNode = {
      id: `pn-${persona.id}`,
      type: 'persona',
      personaId: persona.id,
      label: persona.label,
      icon: persona.icon,
      state: scenarioState?.state ?? 'not_assessed',
      strategyRelevance: buildPersonaRelevance(persona.id, strategyName),
      owner: scenarioState?.owner ?? null,
      readiness: buildPersonaReadiness(persona.id, scenarioState?.state ?? 'not_assessed'),
      blockers: scenarioState?.blockers ?? [],
      projectedImpact: buildProjectedImpact(persona.id),
      actualImpact: buildActualImpact(persona.id),
      nextDecision: buildNextDecision(persona.id, scenarioState?.state ?? 'not_assessed', scenarioState?.blockers ?? []),
      gates,
    };
    nodes.push(node);
  }

  // Build department nodes
  for (const dept of Object.values(DEPARTMENTS)) {
    const scenarioState = scenario.departmentStates[dept.id];
    const gates = buildGatesForDepartment(dept.id, scenario.gateOverrides);

    const node: PropagationNode = {
      id: `dn-${dept.id}`,
      type: 'department',
      departmentId: dept.id,
      label: dept.label,
      icon: dept.icon,
      state: scenarioState?.state ?? 'not_assessed',
      strategyRelevance: dept.description,
      owner: null,
      readiness: buildDepartmentReadiness(dept.id, scenarioState?.state ?? 'not_assessed'),
      blockers: scenarioState?.blockers ?? [],
      projectedImpact: buildDeptProjectedImpact(dept.id),
      actualImpact: buildDeptActualImpact(dept.id),
      nextDecision: buildDeptNextDecision(dept.id, scenarioState?.state ?? 'not_assessed', scenarioState?.blockers ?? []),
      gates,
    };
    nodes.push(node);
  }

  // Build persona-to-persona edges
  for (const rel of CANONICAL_RELATIONSHIPS) {
    edges.push({
      id: `e-${uid()}`,
      sourceId: `pn-${rel.sourcePersona}`,
      targetId: `pn-${rel.targetPersona}`,
      relationship: rel.relationship,
      context: rel.context,
    });
  }

  // Build persona-to-department edges
  for (const rel of PERSONA_DEPARTMENT_RELATIONSHIPS) {
    edges.push({
      id: `e-${uid()}`,
      sourceId: `pn-${rel.personaId}`,
      targetId: `dn-${rel.departmentId}`,
      relationship: rel.relationship,
      context: rel.context,
    });
  }

  const graph: PropagationGraph = {
    strategyId,
    nodes,
    edges,
    generatedAt: new Date().toISOString(),
  };

  savePropagationGraph(graph);
  return graph;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function buildPersonaRelevance(pid: PersonaId, strategyName: string): string {
  const map: Record<PersonaId, string> = {
    plant_manager: `Owns "${strategyName}" — sets direction, approves scale, and monitors enterprise adoption.`,
    operations_manager: `Translates "${strategyName}" into production execution — owns rollout, depends on procurement and HR readiness.`,
    line_manager: `Executes "${strategyName}" at team level — manages line adoption and surfaces blockers.`,
    hr_manager: `Gates "${strategyName}" through workforce readiness — training, capability gaps, and adoption health.`,
    procurement: `Gates "${strategyName}" through supply readiness — materials, sensors, and vendor availability.`,
    leather_cutter: `Impacted by "${strategyName}" — receives new tasks, training requirements, and provides adoption feedback.`,
  };
  return map[pid];
}

function buildPersonaReadiness(pid: PersonaId, state: NodeState): PropagationNode['readiness'] {
  const readinessMap: Record<PersonaId, PropagationNode['readiness']> = {
    plant_manager: { approved: true, trained: true, equipped: true, complianceStatus: 'passed', trainingCoverage: 100, adoptionSentiment: 'positive' },
    operations_manager: { approved: true, trained: true, equipped: true, complianceStatus: 'passed', trainingCoverage: 95, adoptionSentiment: 'positive' },
    line_manager: { approved: true, trained: true, equipped: false, complianceStatus: 'pending', trainingCoverage: 80, adoptionSentiment: 'neutral' },
    hr_manager: { approved: true, trained: false, equipped: true, complianceStatus: 'pending', trainingCoverage: 60, adoptionSentiment: 'neutral' },
    procurement: { approved: true, trained: true, equipped: false, complianceStatus: 'not_assessed', trainingCoverage: 100, adoptionSentiment: 'neutral' },
    leather_cutter: { approved: false, trained: false, equipped: false, complianceStatus: 'not_assessed', trainingCoverage: 30, adoptionSentiment: 'unknown' },
  };
  return readinessMap[pid] ?? { approved: false, trained: false, equipped: false, complianceStatus: 'not_assessed' as const, trainingCoverage: 0, adoptionSentiment: 'unknown' as const };
}

function buildDepartmentReadiness(did: DepartmentId, _state: NodeState): PropagationNode['readiness'] {
  const map: Record<DepartmentId, PropagationNode['readiness']> = {
    production_and_operations: { approved: true, trained: true, equipped: true, complianceStatus: 'passed', trainingCoverage: 90, adoptionSentiment: 'positive' },
    quality_and_safety: { approved: false, trained: false, equipped: true, complianceStatus: 'blocked', trainingCoverage: 50, adoptionSentiment: 'neutral' },
    workforce_and_hr: { approved: true, trained: false, equipped: true, complianceStatus: 'pending', trainingCoverage: 60, adoptionSentiment: 'neutral' },
    procurement_and_materials: { approved: true, trained: true, equipped: false, complianceStatus: 'not_assessed', trainingCoverage: 100, adoptionSentiment: 'neutral' },
  };
  return map[did];
}

function buildProjectedImpact(pid: PersonaId): PropagationNode['projectedImpact'] {
  const map: Partial<Record<PersonaId, { throughputDelta: number; defectDelta: number; costDelta: number }>> = {
    plant_manager: { throughputDelta: 12, defectDelta: -25, costDelta: -8 },
    operations_manager: { throughputDelta: 14, defectDelta: -22, costDelta: -5 },
    line_manager: { throughputDelta: 10, defectDelta: -18, costDelta: -3 },
  };
  return map[pid] ?? null;
}

function buildActualImpact(pid: PersonaId): PropagationNode['actualImpact'] {
  const map: Partial<Record<PersonaId, { throughputDelta: number; defectDelta: number; costDelta: number }>> = {
    plant_manager: { throughputDelta: 11, defectDelta: -15, costDelta: -4 },
    operations_manager: { throughputDelta: 14, defectDelta: -22, costDelta: -3 },
  };
  return map[pid] ?? null;
}

function buildDeptProjectedImpact(did: DepartmentId): PropagationNode['projectedImpact'] {
  const map: Partial<Record<DepartmentId, { throughputDelta: number; defectDelta: number; costDelta: number }>> = {
    production_and_operations: { throughputDelta: 14, defectDelta: -22, costDelta: -5 },
    procurement_and_materials: { throughputDelta: 0, defectDelta: 0, costDelta: -2 },
  };
  return map[did] ?? null;
}

function buildDeptActualImpact(did: DepartmentId): PropagationNode['actualImpact'] {
  if (did === 'production_and_operations') return { throughputDelta: 11, defectDelta: -15, costDelta: -3 };
  return null;
}

function buildNextDecision(pid: PersonaId, state: NodeState, blockers: { text: string }[]): string | null {
  if (state === 'blocked' && blockers.length > 0) return `Resolve: ${blockers[0].text}`;
  const map: Partial<Record<PersonaId, string | undefined>> = {
    plant_manager: state === 'live' ? 'Decide whether to approve broader rollout' : undefined,
    line_manager: state === 'ready' ? 'Confirm team readiness and begin line rollout' : undefined,
    leather_cutter: 'Awaiting training assignment and task changes',
  };
  return map[pid] ?? null;
}

function buildDeptNextDecision(did: DepartmentId, state: NodeState, blockers: { text: string }[]): string | null {
  if (state === 'blocked' && blockers.length > 0) return `Resolve: ${blockers[0].text}`;
  if (did === 'quality_and_safety') return 'Complete ISO re-certification to unblock scale';
  if (did === 'workforce_and_hr' && state !== 'ready') return 'Raise training coverage above 80% threshold';
  return null;
}

function buildGatesForPersona(pid: PersonaId, overrides: Record<string, string>): PropagationGate[] {
  return CANONICAL_GATES
    .filter((g) => g.ownerPersonaId === pid)
    .map((g) => ({
      id: `gate-${uid()}`,
      name: g.name,
      type: g.type,
      ownerPersonaId: g.ownerPersonaId,
      status: (overrides[g.name] as PropagationGate['status']) ?? 'not_assessed',
      blockingReason: overrides[g.name] === 'blocked' ? g.description : null,
    }));
}

function buildGatesForDepartment(did: DepartmentId, overrides: Record<string, string>): PropagationGate[] {
  return CANONICAL_GATES
    .filter((g) => g.departmentId === did)
    .map((g) => ({
      id: `gate-${uid()}`,
      name: g.name,
      type: g.type,
      ownerPersonaId: g.ownerPersonaId,
      status: (overrides[g.name] as PropagationGate['status']) ?? 'not_assessed',
      blockingReason: overrides[g.name] === 'blocked' ? g.description : null,
    }));
}
