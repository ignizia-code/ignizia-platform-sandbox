import type { Workflow, WorkflowNode, TeamPolicy, SensitivityTag } from '../types';

export interface ViolationResult {
  violated: boolean;
  rule?: string;
  message?: string;
}

export interface FilterResult {
  allowed: boolean;
  blockedReason?: string;
  policyRule?: string;
}

const DEFAULT_TEAM_ID = 'default';

function getNodeSensitivity(node: WorkflowNode): SensitivityTag | null {
  return node.meta?.sensitivityTag ?? null;
}

function hasSensitiveNode(workflow: Workflow): boolean {
  return workflow.nodes.some((n) => getNodeSensitivity(n) === 'sensitive');
}

function hasCustomerFacingNode(workflow: Workflow): boolean {
  return workflow.nodes.some(
    (n) =>
      n.meta?.sensitivityCategories?.includes('Customer Facing') ||
      /\b(customer|client|email)\b/i.test(n.name)
  );
}

function hasFinanceNode(workflow: Workflow): boolean {
  return workflow.nodes.some(
    (n) =>
      n.meta?.sensitivityCategories?.includes('Finance') ||
      /\b(invoice|payroll|bank|credit|salary)\b/i.test(n.name)
  );
}

function workflowMatchesReviewCategories(workflow: Workflow, categories: string[]): boolean {
  if (categories.length === 0) return false;
  return workflow.nodes.some((n) =>
    (n.meta?.sensitivityCategories ?? []).some((c) => categories.includes(c))
  );
}

export function checkPolicyViolation(
  workflow: Workflow,
  policy: TeamPolicy | null
): ViolationResult {
  if (!policy || !policy.active) return { violated: false };

  // Tight + Sensitive + External AI blocked = hard block on publish (handled elsewhere)
  if (policy.dataControl === 'tight' && hasSensitiveNode(workflow) && !policy.externalAiAllowed) {
    return {
      violated: true,
      rule: 'Tight data control with sensitive data',
      message: 'Workflow contains sensitive data. External AI providers are blocked by company policy.',
    };
  }

  return { violated: false };
}

export function requiresReview(workflow: Workflow, policy: TeamPolicy | null): boolean {
  if (!policy || !policy.active) return false;
  if (policy.reviewRequiredCategories.length === 0) return false;

  return workflowMatchesReviewCategories(workflow, policy.reviewRequiredCategories);
}

export function filterAiSuggestion(
  suggestionType: 'external_ai' | 'internal_script' | 'approved_tool',
  workflow: Workflow,
  policy: TeamPolicy | null
): FilterResult {
  if (!policy || !policy.active) return { allowed: true };

  if (suggestionType === 'external_ai') {
    if (!policy.externalAiAllowed) {
      return {
        allowed: false,
        blockedReason: 'External AI providers are blocked by company policy.',
        policyRule: 'External data sharing',
      };
    }
    if (policy.dataControl === 'tight' && hasSensitiveNode(workflow)) {
      return {
        allowed: false,
        blockedReason: 'Sensitive data cannot be sent to external providers under tight control policy.',
        policyRule: 'External data sharing',
      };
    }
  }

  return { allowed: true };
}

export function isExternalAiSuggestion(suggestionText: string): boolean {
  const externalIndicators = [
    'chatgpt',
    'openai',
    'external api',
    'third party',
    'send to',
    'upload to',
    'call external',
  ];
  const lower = suggestionText.toLowerCase();
  return externalIndicators.some((ind) => lower.includes(ind));
}
