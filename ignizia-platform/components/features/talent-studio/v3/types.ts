export type ProficiencyLevel = 1 | 2 | 3 | 4 | 5;

export type SkillSource =
  | "manual"
  | "manager_validated"
  | "training_completion"
  | "assessment"
  | "project_evidence"
  | "performance_signal"
  | "imported"
  | "ai_inferred";

export type SkillAssertionStatus = "proposed" | "confirmed" | "rejected";

export type SkillVisibility =
  | "private"
  | "org_visible"
  | "managers_only"
  | "team_only";

export interface DetailedSkill {
  id: string;
  name: string;
  bucketId: string;
  description?: string;
  aiRestricted?: boolean;
}

export interface SkillBucket {
  id: string;
  name: string;
  description?: string;
  skills: DetailedSkill[];
}

export interface SkillEvidence {
  id: string;
  personId: string;
  skillId: string;
  type: SkillSource;
  title: string;
  issuedBy?: string;
  occurredAt: string;
  metadata?: Record<string, any>;
}

export interface SkillAssertion {
  id: string;
  personId: string;
  skillId: string;
  status: SkillAssertionStatus;
  source: SkillSource;
  level: ProficiencyLevel;
  confidence: number; // 0..1
  lastUsedAt?: string;
  evidenceIds: string[];
  createdAt: string;
  updatedAt: string;
}

export interface RoleSkillRequirement {
  skillId: string;
  minLevel: ProficiencyLevel;
  weight: number;
  required: boolean;
  skillName?: string;
  source?: "manual" | "onet";
  elementId?: string;
  importance?: number;
  level?: number;
  notRelevant?: boolean;
  onetUpdatedAt?: string;
}

export interface Department {
  id: string;
  name: string;
  description?: string;
}

export interface Role {
  id: string;
  name: string;
  description: string;
  departmentId?: string;
  requirements: RoleSkillRequirement[];
  isHiring?: boolean;
  source?: "manual" | "onet";
  onetSocCode?: string;
  onetLastUpdatedAt?: string;
  syncedAt?: string;
}

export type WorkloadLevel = 'Underutilized' | 'Balanced' | 'At Capacity' | 'Overloaded';

export interface Employee {
  id: string;
  name: string;
  roleId: string;
  avatarUrl?: string;
  workload?: WorkloadLevel;
  allocation?: number;
  assertions: SkillAssertion[];
  privacy: {
    shareConfirmedSkills: boolean;
    shareUnconfirmedAiSkills: boolean;
    shareUnconfirmedImportedSkills: boolean;
    allowAiToAddSkills: boolean;
    visibility: SkillVisibility;
  };
}

export interface LearningResource {
  id: string;
  type: "course" | "mentor" | "project" | "simulation_drill";
  title: string;
  description?: string;
  skillTags: string[];
  estimatedHours?: number;
  url?: string;
  provider?: string;
}

export interface LearningPlanStep {
  id: string;
  resourceId: string;
  targetSkills: string[];
  status: "todo" | "doing" | "done";
  completedAt?: string;
}

export interface LearningPlan {
  id: string;
  scope: "person" | "team" | "role";
  personId?: string;
  roleId?: string;
  teamId?: string;
  title: string;
  createdBy: string;
  status: "draft" | "assigned" | "in_progress" | "completed" | "verified";
  steps: LearningPlanStep[];
  createdAt: string;
  updatedAt: string;
}

export interface Task {
  id: string;
  name: string;
  description?: string;
  station?: string;
  location?: string;
  workflowId?: string;
  domainTags?: string[];
}

export interface TaskRequirement {
  taskId: string;
  roleIds: string[];
  requiredSkills: { skillId: string; minLevel: ProficiencyLevel }[];
  requiredPermits: string[];
}

export interface Permit {
  id: string;
  name: string;
  issuer?: string;
  isFrozen?: boolean;
}

export interface PersonPermit {
  id: string;
  personId: string;
  permitId: string;
  issuedAt: string;
  expiresAt: string;
  status: "valid" | "expiring" | "expired" | "pending" | "revoked";
  notes?: string;
  evidenceUrl?: string;
}

export interface ComplianceTraining {
  id: string;
  personId: string;
  permitId: string;
  status: "assigned" | "in_progress" | "completed";
  assignedAt: string;
  completedAt?: string;
}

export interface TeamBuild {
  id: string;
  blueprintId: string;
  name: string;
  assignments: { roleId: string; employeeId: string }[];
  status: "draft" | "validated" | "deployed";
  createdAt: string;
}

export interface PermitSchema {
  id: string;
  name: string;
  appliesToTaskIds: string[];
  requiredPermits: string[];
  requiredSkills: { skillId: string; minLevel: ProficiencyLevel; weight: number }[];
}

export interface CrewBlueprint {
  id: string;
  name: string;
  appliesToWorkflowId?: string;
  requiredRoles: { roleId: string; count: number }[];
  additionalConstraints?: string;
}

export interface Project {
  id: string;
  name: string;
  ownerId: string;
  startDate?: string;
  endDate?: string;
  description?: string;
  priority?: 'low' | 'medium' | 'high' | 'critical';
  teamOrSite?: string;
  requiredSkills: { skillId: string; minLevel: ProficiencyLevel }[];
  requiredPermits: string[];
  assignedEmployees: string[];
  shortlistedEmployees: string[];
}

export interface ProjectStaffingRequest {
  id: string;
  projectId: string;
  createdBy: string;
  requiredSkills: { skillId: string; minLevel: ProficiencyLevel; weight: number }[];
  requiredPermits: string[];
  createdAt: string;
}

export interface CapabilityConfig {
  id: string;
  version: string;
  publishedAt: string;
  tasks: Task[];
  requirements: TaskRequirement[];
}

export type OutboxTarget =
  | "foundry"
  | "orchestrator"
  | "factorymind"
  | "strategy_studio"
  | "ignite_exchange"
  | "traceworks_les";

export interface OutboxRecord {
  id: string;
  target: OutboxTarget;
  eventType: string;
  createdAt: string;
  payload: Record<string, any>;
  status: "pending" | "sent" | "failed";
}

export interface GapAnalysisResult {
  roleId: string;
  overallReadiness: number;
  totalRequired: number;
  totalMatched: number;
  missingSkills: { skillId: string; severity: number; minLevel: ProficiencyLevel }[];
  bucketAnalysis: {
    bucketId: string;
    bucketName: string;
    requiredCount: number;
    matchedCount: number;
    coverage: number;
    missingSkills: DetailedSkill[];
  }[];
}
