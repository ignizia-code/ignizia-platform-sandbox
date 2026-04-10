/**
 * Strategy Studio Types
 *
 * Data model for strategies, objectives, initiatives, Omniverse telemetry runs,
 * verdicts, guardrails, and evidence linkage.
 */

// ---------------------------------------------------------------------------
// Enums / unions
// ---------------------------------------------------------------------------

export type ObjectiveStatus = 'draft' | 'trial' | 'validated' | 'rolled_back';

export type InitiativeStatus =
  | 'idea'
  | 'trial_running'
  | 'trial_completed'
  | 'validated'
  | 'scaled'
  | 'rolled_back';

export type RecommendationPath = 'build' | 'buy' | 'partner';

export type VerdictOutcome = 'validated' | 'not_validated';

export type StrategyStatus = 'trial' | 'validated' | 'rolled_back';
export type StrategyStage = 'plan' | 'trial' | 'verdict';

// ---------------------------------------------------------------------------
// Core objects
// ---------------------------------------------------------------------------

export interface Strategy {
  id: string;
  objectiveId: string;
  initiativeId: string;
  name: string;
  description: string;
  status: StrategyStatus;
  stage?: StrategyStage;
  progressPercent: number;
  initiativeCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface Objective {
  id: string;
  name: string;
  description: string;
  targetPercent: number;
  currentPercent: number;
  status: ObjectiveStatus;
  createdAt: string;
  updatedAt: string;
}

export interface InitiativeGuardrails {
  maxSpeed: number;
  maxErrorRate: number;
  maxDropCount: number;
  emergencyStopThreshold: number;
}

export interface Initiative {
  id: string;
  objectiveId: string;
  name: string;
  description: string;
  type: string;
  status: InitiativeStatus;
  recommendedPath: RecommendationPath;
  guardrails: InitiativeGuardrails;
  aiSummary: string;
  automationLiftPercent: number;
  createdAt: string;
  updatedAt: string;
}

// ---------------------------------------------------------------------------
// Omniverse telemetry
// ---------------------------------------------------------------------------

export interface RunPayload {
  runId: string;
  initiativeId: string;
  startTime: string;
  endTime: string;
  conveyorSpeedAvg: number;
  conveyorSpeedMax: number;
  boxTotal: number;
  boxSuccess: number;
  boxDropped: number;
  overshootCount?: number;
  overshootDistance?: number;
}

export interface DerivedKpis {
  throughput: number;
  errorRate: number;
  dropPerMinute: number;
  automationLift: number;
  durationMinutes: number;
}

export interface Run {
  id: string;
  initiativeId: string;
  payload: RunPayload;
  derived: DerivedKpis;
  createdAt: string;
}

// ---------------------------------------------------------------------------
// Verdict & promotion
// ---------------------------------------------------------------------------

export interface Verdict {
  id: string;
  runId: string;
  initiativeId: string;
  outcome: VerdictOutcome;
  throughputDelta: number;
  errorRateValue: number;
  speedValue: number;
  reasoning: string;
  createdAt: string;
}

// ---------------------------------------------------------------------------
// Evidence linkage
// ---------------------------------------------------------------------------

export interface EvidenceLink {
  id: string;
  objectiveId: string;
  initiativeId: string;
  runId: string;
  policySnapshotId: string | null;
  auditEventIds: string[];
  createdAt: string;
}

// ---------------------------------------------------------------------------
// Portfolio-level progress
// ---------------------------------------------------------------------------

export interface ObjectiveProgress {
  objectiveId: string;
  trialContribution: number;
  validatedContribution: number;
  lastUpdated: string;
}

// ---------------------------------------------------------------------------
// Strategy Copilot chat messages
// ---------------------------------------------------------------------------

export interface StrategyCopilotMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
}

// ---------------------------------------------------------------------------
// Executive Propagation
// ---------------------------------------------------------------------------

export type PropagationState = 'not_started' | 'in_progress' | 'active' | 'validated' | 'on_hold';

export interface PropagationBlocker {
  text: string;
  escalated: boolean;
}

export interface PropagationUnit {
  id: string;
  strategyId: string;
  name: string;
  type: 'line' | 'department' | 'shift' | 'site';
  group: string;
  owner: string | null;
  state: PropagationState;
  readiness: {
    approved: boolean;
    trained: boolean;
    equipped: boolean;
  };
  blockers: PropagationBlocker[];
  impact: {
    throughputDelta: number;
    defectDelta: number;
    costDelta: number;
  } | null;
}
