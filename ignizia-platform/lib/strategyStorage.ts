import type {
  Strategy,
  Objective,
  Initiative,
  Run,
  RunPayload,
  DerivedKpis,
  Verdict,
  EvidenceLink,
  ObjectiveProgress,
} from '@/types';
import type { PropagationUnit } from '@/types/strategy';
import { addAuditEvent, loadPolicy } from './governanceStorage';
import {
  loadObjectiveById as loadObjectiveByIdFromStorage,
  loadInitiativeById as loadInitiativeByIdFromStorage,
  saveObjective as saveObjectiveToStorage,
  saveInitiative as saveInitiativeToStorage,
  resetAllObjectiveData,
} from './objectiveStorage';
import { clearAllPropagationGraphs } from './propagation';

// ---------------------------------------------------------------------------
// Storage keys (execution artifacts only)
// ---------------------------------------------------------------------------

const STRATEGIES_KEY = 'strategy:strategies';
const RUNS_KEY = 'strategy:runs';
const VERDICTS_KEY = 'strategy:verdicts';
const EVIDENCE_KEY = 'strategy:evidence';
const PROGRESS_KEY = 'strategy:progress';

function uid(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

function get<T>(key: string): T | null {
  try {
    const raw = typeof window !== 'undefined' ? localStorage.getItem(key) : null;
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}

function set(key: string, value: unknown): void {
  try {
    if (typeof window !== 'undefined') {
      localStorage.setItem(key, JSON.stringify(value));
    }
  } catch (e) {
    console.error(`Failed to save ${key}:`, e);
  }
}

// ---------------------------------------------------------------------------
// Strategies (top-level list)
// ---------------------------------------------------------------------------

export function loadStrategies(): Strategy[] {
  return get<Strategy[]>(STRATEGIES_KEY) ?? [];
}

export function saveStrategies(strategies: Strategy[]): void {
  set(STRATEGIES_KEY, strategies);
}

export function createStrategyFromGoal(goal: string): {
  strategy: Strategy;
  objective: Objective;
  initiative: Initiative;
} {
  const objId = `obj-${uid()}`;
  const initId = `init-${uid()}`;
  const stratId = `strat-${uid()}`;
  const now = new Date().toISOString();

  const objective: Objective = {
    id: objId,
    name: goal,
    description: `Raise the share of AI-controlled manufacturing steps within approved guardrails — "${goal}"`,
    targetPercent: 10,
    currentPercent: 0,
    status: 'trial',
    createdAt: now,
    updatedAt: now,
  };

  const initiative: Initiative = {
    id: initId,
    objectiveId: objId,
    name: 'Conveyor AI speed optimization — cardboxes packing line',
    description:
      'Use AI to dynamically control conveyor belt speed, maximizing throughput while keeping error rate and drop count within safe guardrails.',
    type: 'Physical automation + AI controller',
    status: 'idea',
    recommendedPath: 'build',
    guardrails: {
      maxSpeed: 2.5,
      maxErrorRate: 0.05,
      maxDropCount: 3,
      emergencyStopThreshold: 0.12,
    },
    aiSummary:
      'Based on your goal, I recommend optimizing the cardboxes packing conveyor with an AI speed controller. The controller adjusts belt speed in real-time to maximize throughput while respecting drop-rate guardrails. A Build approach is recommended since the control logic is proprietary to your line layout.',
    automationLiftPercent: 10,
    createdAt: now,
    updatedAt: now,
  };

  const strategy: Strategy = {
    id: stratId,
    objectiveId: objId,
    initiativeId: initId,
    name: goal,
    description: objective.description,
    status: 'trial',
    stage: 'plan',
    progressPercent: 0,
    initiativeCount: 1,
    createdAt: now,
    updatedAt: now,
  };

  saveObjectiveToStorage(objective);
  saveInitiativeToStorage(initiative);

  const strategies = loadStrategies();
  strategies.push(strategy);
  saveStrategies(strategies);

  addAuditEvent({
    timestamp: now,
    type: 'objective_activated',
    actor: 'Strategy Copilot',
    details: `Strategy created: "${goal}" — objective and initiative generated`,
    objectiveId: objId,
  });

  return { strategy, objective, initiative };
}

// ---------------------------------------------------------------------------
// Objectives & Initiatives — re-export from objectiveStorage for backward compatibility
// ---------------------------------------------------------------------------

export { loadObjectiveById, loadAllObjectives, saveObjective } from './objectiveStorage';
export { loadInitiativeById, loadInitiativesByObjectiveId, saveInitiative } from './objectiveStorage';

export function loadObjective(): Objective | null {
  const strategies = loadStrategies();
  if (strategies.length === 0) return null;
  const last = strategies[strategies.length - 1];
  return loadObjectiveByIdFromStorage(last.objectiveId);
}

export function loadInitiative(): Initiative | null {
  const strategies = loadStrategies();
  if (strategies.length === 0) return null;
  const last = strategies[strategies.length - 1];
  return loadInitiativeByIdFromStorage(last.initiativeId);
}

// ---------------------------------------------------------------------------
// Runs
// ---------------------------------------------------------------------------

export function loadRuns(): Run[] {
  return get<Run[]>(RUNS_KEY) ?? [];
}

export function saveRuns(runs: Run[]): void {
  set(RUNS_KEY, runs);
}

export function computeDerivedKpis(payload: RunPayload): DerivedKpis {
  const start = new Date(payload.startTime).getTime();
  const end = new Date(payload.endTime).getTime();
  const durationMinutes = Math.max((end - start) / 60_000, 0.01);

  const throughput = payload.boxTotal / durationMinutes;
  const errorRate = payload.boxTotal > 0 ? payload.boxDropped / payload.boxTotal : 0;
  const dropPerMinute = payload.boxDropped / durationMinutes;

  return {
    throughput: Math.round(throughput * 100) / 100,
    errorRate: Math.round(errorRate * 10000) / 10000,
    dropPerMinute: Math.round(dropPerMinute * 100) / 100,
    automationLift: 10,
    durationMinutes: Math.round(durationMinutes * 100) / 100,
  };
}

export function addRun(payload: RunPayload): Run {
  const derived = computeDerivedKpis(payload);
  const run: Run = {
    id: payload.runId || `run-${uid()}`,
    initiativeId: payload.initiativeId,
    payload,
    derived,
    createdAt: new Date().toISOString(),
  };

  const runs = loadRuns();
  runs.push(run);
  saveRuns(runs);

  addAuditEvent({
    timestamp: new Date().toISOString(),
    type: 'run_completed',
    actor: 'Omniverse',
    details: `Run ${run.id} completed — throughput ${derived.throughput} boxes/min, error rate ${(derived.errorRate * 100).toFixed(2)}%`,
    initiativeId: payload.initiativeId,
    runId: run.id,
  });

  return run;
}

// ---------------------------------------------------------------------------
// Verdicts
// ---------------------------------------------------------------------------

export function loadVerdicts(): Verdict[] {
  return get<Verdict[]>(VERDICTS_KEY) ?? [];
}

export function saveVerdicts(verdicts: Verdict[]): void {
  set(VERDICTS_KEY, verdicts);
}

export function evaluateRun(run: Run, initiative: Initiative): Verdict {
  const { derived } = run;
  const { guardrails } = initiative;

  const withinErrorRate = derived.errorRate <= guardrails.maxErrorRate;
  const withinDrops = derived.dropPerMinute <= guardrails.maxDropCount;
  const improved = derived.throughput > 0;

  const outcome = withinErrorRate && withinDrops && improved ? 'validated' : 'not_validated';

  const reasons: string[] = [];
  if (!withinErrorRate)
    reasons.push(`Error rate ${(derived.errorRate * 100).toFixed(2)}% exceeds limit ${(guardrails.maxErrorRate * 100).toFixed(1)}%`);
  if (!withinDrops)
    reasons.push(`Drop rate ${derived.dropPerMinute}/min exceeds limit ${guardrails.maxDropCount}/min`);
  if (!improved)
    reasons.push('No throughput improvement detected');
  if (outcome === 'validated')
    reasons.push('All guardrails met — safe speed achieved with acceptable error rate');

  const verdict: Verdict = {
    id: `verdict-${uid()}`,
    runId: run.id,
    initiativeId: initiative.id,
    outcome,
    throughputDelta: derived.throughput,
    errorRateValue: derived.errorRate,
    speedValue: run.payload.conveyorSpeedAvg,
    reasoning: reasons.join('. '),
    createdAt: new Date().toISOString(),
  };

  const verdicts = loadVerdicts();
  verdicts.push(verdict);
  saveVerdicts(verdicts);

  return verdict;
}

// ---------------------------------------------------------------------------
// Promote / rollback (accept specific objective and initiative)
// ---------------------------------------------------------------------------

export function promoteInitiative(obj: Objective, init: Initiative): { objective: Objective; initiative: Initiative; strategy: Strategy } | null {
  init.status = 'validated';
  init.updatedAt = new Date().toISOString();
  saveInitiativeToStorage(init);

  obj.status = 'validated';
  obj.currentPercent = Math.min(obj.targetPercent, obj.currentPercent + init.automationLiftPercent);
  obj.updatedAt = new Date().toISOString();
  saveObjectiveToStorage(obj);

  const progress: ObjectiveProgress = {
    objectiveId: obj.id,
    trialContribution: 0,
    validatedContribution: init.automationLiftPercent,
    lastUpdated: new Date().toISOString(),
  };
  set(PROGRESS_KEY, progress);

  const strategies = loadStrategies();
  const stratIdx = strategies.findIndex(s => s.objectiveId === obj.id);
  let strategy: Strategy;
  if (stratIdx >= 0) {
    strategies[stratIdx].status = 'validated';
    strategies[stratIdx].stage = 'verdict';
    strategies[stratIdx].progressPercent = obj.currentPercent;
    strategies[stratIdx].updatedAt = new Date().toISOString();
    strategy = strategies[stratIdx];
    saveStrategies(strategies);
  } else {
    strategy = strategies[0];
  }

  addAuditEvent({
    timestamp: new Date().toISOString(),
    type: 'initiative_promoted',
    actor: 'Leader',
    details: `Initiative "${init.name}" promoted to validated — objective progress now ${obj.currentPercent}%`,
    objectiveId: obj.id,
    initiativeId: init.id,
  });

  addEvidence(obj.id, init.id, loadRuns().filter(r => r.initiativeId === init.id).at(-1)?.id ?? '');

  return { objective: obj, initiative: init, strategy };
}

export function rollbackInitiative(obj: Objective, init: Initiative): { objective: Objective; initiative: Initiative; strategy: Strategy } | null {
  init.status = 'rolled_back';
  init.updatedAt = new Date().toISOString();
  saveInitiativeToStorage(init);

  obj.status = 'rolled_back';
  obj.currentPercent = 0;
  obj.updatedAt = new Date().toISOString();
  saveObjectiveToStorage(obj);

  const strategies = loadStrategies();
  const stratIdx = strategies.findIndex(s => s.objectiveId === obj.id);
  let strategy: Strategy;
  if (stratIdx >= 0) {
    strategies[stratIdx].status = 'rolled_back';
    strategies[stratIdx].stage = 'verdict';
    strategies[stratIdx].progressPercent = 0;
    strategies[stratIdx].updatedAt = new Date().toISOString();
    strategy = strategies[stratIdx];
    saveStrategies(strategies);
  } else {
    strategy = strategies[0];
  }

  addAuditEvent({
    timestamp: new Date().toISOString(),
    type: 'initiative_rolled_back',
    actor: 'Leader',
    details: `Initiative "${init.name}" rolled back`,
    objectiveId: obj.id,
    initiativeId: init.id,
  });

  return { objective: obj, initiative: init, strategy };
}

// ---------------------------------------------------------------------------
// Evidence links
// ---------------------------------------------------------------------------

export function loadEvidence(): EvidenceLink[] {
  return get<EvidenceLink[]>(EVIDENCE_KEY) ?? [];
}

function addEvidence(objectiveId: string, initiativeId: string, runId: string): void {
  const list = loadEvidence();
  const policy = loadPolicy();
  const link: EvidenceLink = {
    id: `ev-${uid()}`,
    objectiveId,
    initiativeId,
    runId,
    policySnapshotId: policy?.id ?? null,
    auditEventIds: [],
    createdAt: new Date().toISOString(),
  };
  list.push(link);
  set(EVIDENCE_KEY, list);
}

// ---------------------------------------------------------------------------
// Progress
// ---------------------------------------------------------------------------

export function loadProgress(): ObjectiveProgress | null {
  return get<ObjectiveProgress>(PROGRESS_KEY);
}

// ---------------------------------------------------------------------------
// Propagation units (executive workspace)
// ---------------------------------------------------------------------------

const PROPAGATION_KEY = 'strategy:propagation';

export function loadPropagationUnits(strategyId: string): PropagationUnit[] {
  const all = get<Record<string, PropagationUnit[]>>(PROPAGATION_KEY) ?? {};
  return all[strategyId] ?? [];
}

export function savePropagationUnits(strategyId: string, units: PropagationUnit[]): void {
  const all = get<Record<string, PropagationUnit[]>>(PROPAGATION_KEY) ?? {};
  all[strategyId] = units;
  set(PROPAGATION_KEY, all);
}

export function seedPropagationUnits(objectiveId: string): PropagationUnit[] {
  const existing = loadPropagationUnits(objectiveId);
  if (existing.length > 0) return existing;

  const units: PropagationUnit[] = [
    // Production Lines — value engine
    { id: `pu-${uid()}`, strategyId: objectiveId, name: 'Line A', type: 'line', group: 'Production Lines', owner: 'J. Martinez', state: 'active', readiness: { approved: true, trained: true, equipped: true }, blockers: [], impact: { throughputDelta: 14, defectDelta: -22, costDelta: -3 } },
    { id: `pu-${uid()}`, strategyId: objectiveId, name: 'Line B', type: 'line', group: 'Production Lines', owner: 'R. Chen', state: 'in_progress', readiness: { approved: true, trained: true, equipped: false }, blockers: [{ text: 'Sensor procurement delayed 2 weeks', escalated: false }], impact: null },
    { id: `pu-${uid()}`, strategyId: objectiveId, name: 'Line C', type: 'line', group: 'Production Lines', owner: null, state: 'not_started', readiness: { approved: false, trained: false, equipped: false }, blockers: [], impact: null },
    // Quality & Safety — the scale gate
    { id: `pu-${uid()}`, strategyId: objectiveId, name: 'Quality Control', type: 'department', group: 'Quality & Safety', owner: 'S. Patel', state: 'in_progress', readiness: { approved: true, trained: false, equipped: true }, blockers: [], impact: null },
    { id: `pu-${uid()}`, strategyId: objectiveId, name: 'Safety Compliance', type: 'department', group: 'Quality & Safety', owner: 'M. Dubois', state: 'not_started', readiness: { approved: false, trained: false, equipped: false }, blockers: [{ text: 'ISO re-certification pending — blocks company-wide scale', escalated: false }], impact: null },
    // Logistics — healthy, validates the strategy outside production
    { id: `pu-${uid()}`, strategyId: objectiveId, name: 'Warehouse Ops', type: 'department', group: 'Logistics', owner: 'K. Yamamoto', state: 'active', readiness: { approved: true, trained: true, equipped: true }, blockers: [], impact: { throughputDelta: 8, defectDelta: -9, costDelta: -5 } },
    // Workforce — lagging adoption
    { id: `pu-${uid()}`, strategyId: objectiveId, name: 'Shift B Crew', type: 'shift', group: 'Workforce', owner: 'A. Novak', state: 'in_progress', readiness: { approved: true, trained: false, equipped: true }, blockers: [{ text: 'Training schedule conflict with night rotation', escalated: false }], impact: null },
    { id: `pu-${uid()}`, strategyId: objectiveId, name: 'Shift C Crew', type: 'shift', group: 'Workforce', owner: null, state: 'not_started', readiness: { approved: false, trained: false, equipped: false }, blockers: [], impact: null },
  ];

  savePropagationUnits(objectiveId, units);
  return units;
}

// ---------------------------------------------------------------------------
// Full reset
// ---------------------------------------------------------------------------

export function resetAllStrategyData(): void {
  resetAllObjectiveData();
  clearAllPropagationGraphs();
  const keys = [
    STRATEGIES_KEY,
    RUNS_KEY,
    VERDICTS_KEY,
    EVIDENCE_KEY,
    PROGRESS_KEY,
    PROPAGATION_KEY,
  ];
  keys.forEach((k) => {
    try {
      if (typeof window !== 'undefined') localStorage.removeItem(k);
    } catch {
      // ignore
    }
  });
}
