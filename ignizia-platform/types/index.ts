/**
 * Main Types Barrel Export
 * 
 * Import from this file for all types:
 * import { UserRole, Topic, Workflow } from '@/types';
 */

// User types
export type { UserRole, User } from './user';
export { USER_ROLES, LEADERSHIP_ROLES, isLeadershipRole } from './user';

// Persona types
export type { Persona } from './persona';

// Dashboard types
export type { 
  Timeframe, 
  DashboardView, 
  MainSection, 
  MetricData, 
  ChartPoint 
} from './dashboard';

// Governance types
export type { 
  DataControlLevel, 
  SensitivityTag, 
  ReviewCategory, 
  TeamPolicy, 
  WorkflowSubmission, 
  AuditEvent 
} from './governance';

// Community types
export type { 
  CommentRelevance, 
  CommentTone, 
  CommentConstructiveness,
  TopicSentiment,
  TopicQuality,
  Topic, 
  Comment, 
  CommentAnalysis, 
  CommentWithAnalysis,
  TopicMetrics,
  TopicAISummary,
  TopicAnalysisSnapshot,
  UserLabel,
  UserProfileSnapshot
} from './community';

// Strategy types
export type {
  ObjectiveStatus,
  InitiativeStatus,
  RecommendationPath,
  VerdictOutcome,
  StrategyStage,
  StrategyStatus,
  Strategy,
  Objective,
  InitiativeGuardrails,
  Initiative,
  RunPayload,
  DerivedKpis,
  Run,
  Verdict,
  EvidenceLink,
  ObjectiveProgress,
  StrategyCopilotMessage,
  PropagationState,
  PropagationBlocker,
  PropagationUnit,
} from './strategy';

// Workflow types
export type { 
  WorkflowNodePosition,
  NodeCadence,
  NodeRecurrence,
  NodeMode,
  WorkflowNodeMeta,
  WorkflowNode,
  EdgeHandoffType,
  EdgeChannel,
  WorkflowEdgeMeta,
  WorkflowEdge,
  WorkflowMeta,
  Workflow
} from './workflow';
