/**
 * Governance & AI Policy Types
 */

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
