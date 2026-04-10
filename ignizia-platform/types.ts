// Re-export User and Persona from types/ (auth & persona)
export type { User } from './types/user';
export type { Persona } from './types/persona';

export type UserRole =
  | 'Plant Manager'
  | 'Operations Manager'
  | 'Line Manager'
  | 'HR Manager'
  | 'Leather Cutter'
  | 'Procurement';

export const USER_ROLES: UserRole[] = [
  'Plant Manager',
  'Operations Manager',
  'Line Manager',
  'HR Manager',
  'Leather Cutter',
  'Procurement',
];

export type Timeframe = 'Day' | 'Week' | 'Month' | 'Year';
export type DashboardView = 'Dashboard' | 'Scene';

// Top-level main sections controlled by the left sidebar
export type MainSection =
  | 'Dashboard'
  | 'LivingOps'
  | 'Community'
  | 'Analytics'
  | 'LearningHub'
  | 'TeamPulse'
  | 'Governance'
  | 'Omniverse'
  | 'FactoryCortexStudio'
  | 'IgniteIntelligenceStudio'
  | 'IntelligenceGovernanceStudio'
  | 'CareerFlow';

// Leadership roles that can access governance dashboard
export const LEADERSHIP_ROLES: UserRole[] = ['Plant Manager', 'Operations Manager', 'HR Manager'];
export function isLeadershipRole(role: UserRole): boolean {
  return LEADERSHIP_ROLES.includes(role);
}

// Governance & AI Policy types
export type DataControlLevel = 'relaxed' | 'moderate' | 'tight';
export type SensitivityTag = 'public' | 'internal' | 'sensitive';
export type ReviewCategory = 'Legal' | 'Customer Facing' | 'Finance' | 'HR' | 'Procurement';

export interface TeamPolicy {
  id: string;
  teamId: string;
  teamName: string;
  dataControl: DataControlLevel;
  externalAiAllowed: boolean;
  approvedTools: string[];
  reviewRequiredCategories: ReviewCategory[];
  autonomyLevel: 'full' | 'review' | 'restricted';
  createdAt: string;
  createdBy: string;
  active: boolean;
}

export interface WorkflowSubmission {
  id: string;
  workflowId: string;
  workflowName: string;
  submittedBy: string;
  submittedAt: string;
  status: 'pending_review' | 'approved' | 'rejected';
  reviewRequiredReason: string;
  sensitivitySummary?: { tag: SensitivityTag; nodeCount: number }[];
}

export interface AuditEvent {
  id: string;
  timestamp: string;
  type:
    | 'policy_change'
    | 'blocked_violation'
    | 'approval_granted'
    | 'workflow_submitted'
    | 'workflow_rejected'
    | 'objective_activated'
    | 'trial_started'
    | 'run_completed'
    | 'initiative_promoted'
    | 'initiative_rolled_back';
  actor: string;
  details: string;
  policyRule?: string;
  objectiveId?: string;
  initiativeId?: string;
  runId?: string;
}

// Strategy types
export type ObjectiveStatus = 'draft' | 'trial' | 'validated' | 'rolled_back';
export type InitiativeStatus = 'idea' | 'trial_running' | 'trial_completed' | 'validated' | 'scaled' | 'rolled_back';
export type RecommendationPath = 'build' | 'buy' | 'partner';
export type VerdictOutcome = 'validated' | 'not_validated';
export type StrategyStatus = 'trial' | 'validated' | 'rolled_back';
export type StrategyStage = 'plan' | 'trial' | 'verdict';

export interface Strategy {
  id: string;
  objectiveId: string;
  initiativeId: string;
  name: string;
  description: string;
  status: StrategyStatus;
  /**
   * UI story stage for this strategy in Strategy Studio
   * (plan -> trial -> verdict). This is separate from
   * portfolio status and can be reset for demo flows.
   */
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

export interface EvidenceLink {
  id: string;
  objectiveId: string;
  initiativeId: string;
  runId: string;
  policySnapshotId: string | null;
  auditEventIds: string[];
  createdAt: string;
}

export interface ObjectiveProgress {
  objectiveId: string;
  trialContribution: number;
  validatedContribution: number;
  lastUpdated: string;
}

export interface StrategyCopilotMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
}

// Community types
export type CommentRelevance = 'on_topic' | 'loosely_related' | 'off_topic';
export type CommentTone = 'positive' | 'neutral' | 'negative' | 'aggressive';
export type CommentConstructiveness = 'constructive' | 'low_value' | 'disruptive';
export type TopicSentiment = 'positive' | 'neutral' | 'negative' | 'mixed';
export type TopicQuality = 'low' | 'medium' | 'high';

export interface Topic {
  id: string;
  creator_id: string;
  starter_text: string;
  starter_media_url?: string;
  created_at: string;
  last_comment_id?: string;
  last_comment_at?: string;
  comment_count?: number;
}

export interface Comment {
  id: string;
  topic_id: string;
  author_id: string;
  text: string;
  created_at: string;
}

export interface CommentAnalysis {
  comment_id: string;
  topic_id: string;
  author_id: string;
  relevance: CommentRelevance;
  tone: CommentTone;
  constructiveness: CommentConstructiveness;
  short_reason?: string;
  model_version: string;
  created_at: string;
}

export interface CommentWithAnalysis extends Comment {
  analysis?: CommentAnalysis;
}

export interface TopicMetrics {
  comment_count: number;
  unique_participants: number;
  comments_last_hour: number;
  comments_last_24h: number;
  time_to_first_reply_mins?: number;
}

export interface TopicAISummary {
  sentiment: TopicSentiment;
  quality: TopicQuality;
  focus_score: number; // 0-1
}

export interface TopicAnalysisSnapshot {
  topic_id: string;
  computed_at: string;
  based_on_last_comment_id?: string;
  metrics: TopicMetrics;
  ai_summary: TopicAISummary;
  model_version: string;
}

export interface UserLabel {
  key: string;
  score: number; // 0-100
  description: string;
  evidence_comment_ids: string[];
}

export interface UserProfileSnapshot {
  user_id: string;
  computed_at: string;
  based_on_last_analyzed_comment_id?: string;
  labels: UserLabel[];
  model_version: string;
}

// Workflow types – position persists layout across sessions (like Agent Studio)

export interface WorkflowNodePosition {
  x: number;
  y: number;
}

// Node optional meta (v2)
export type NodeCadence = 'once' | 'recurring';
export type NodeRecurrence = 'perOrder' | 'daily' | 'weekly' | 'monthly';
export type NodeMode = 'sync' | 'async';

export interface WorkflowNodeMeta {
  inputs?: string[];
  outputs?: string[];
  cadence?: NodeCadence;
  recurrence?: NodeRecurrence;
  mode?: NodeMode;
  durationMins?: number;
  difficulty?: 1 | 2 | 3 | 4 | 5;
  blockers?: string[];
  tags?: string[];
  /** Roles (people) assigned to complete this task; only from workflow owner + sharedWith */
  assignedTo?: UserRole[];
  /** Roles (people) who need to approve this node; only from workflow owner + sharedWith */
  approver?: UserRole[];
  /** Governance: sensitivity tagging from keyword detection */
  sensitivityTag?: SensitivityTag;
  sensitivityCategories?: ReviewCategory[];
  sensitivityConfirmed?: boolean;
  detectedKeywords?: string[];
}

export interface WorkflowNode {
  id: string;
  name: string;
  position?: WorkflowNodePosition;
  meta?: WorkflowNodeMeta;
}

// Edge optional meta (v2)
export type EdgeHandoffType = 'sync' | 'async';
export type EdgeChannel = 'inPerson' | 'slack' | 'email' | 'system';

export interface WorkflowEdgeMeta {
  handoffType?: EdgeHandoffType;
  channel?: EdgeChannel;
  slaMins?: number;
  notes?: string;
}

export interface WorkflowEdge {
  id: string;
  name: string;
  startNodeId: string;
  endNodeId: string;
  meta?: WorkflowEdgeMeta;
}

export interface Workflow {
  id: string;
  name: string;
  owner: UserRole;
  sharedWith: UserRole[];
  nodes: WorkflowNode[];
  edges: WorkflowEdge[];
  updatedByRole: string;
  updatedAt: string;
  revision: number;
}

export interface MetricData {
  label: string;
  value: string | number;
  change?: number;
  status?: 'optimal' | 'warning' | 'critical' | 'stable';
  subtext?: string;
}

export interface ChartPoint {
  x: string;
  y: number;
}
