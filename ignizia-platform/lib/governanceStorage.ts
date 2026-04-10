import type { TeamPolicy, WorkflowSubmission, AuditEvent } from '../types';

const POLICY_KEY = 'governance:policy:default';
const SUBMISSIONS_KEY = 'governance:submissions';
const AUDIT_KEY = 'governance:audit';

export function loadPolicy(): TeamPolicy | null {
  try {
    const stored = typeof window !== 'undefined' ? localStorage.getItem(POLICY_KEY) : null;
    if (stored) return JSON.parse(stored) as TeamPolicy;
  } catch (e) {
    console.error('Failed to load policy:', e);
  }
  return null;
}

export function savePolicy(policy: TeamPolicy): void {
  try {
    if (typeof window !== 'undefined') {
      localStorage.setItem(POLICY_KEY, JSON.stringify(policy));
    }
  } catch (e) {
    console.error('Failed to save policy:', e);
  }
}

export function loadSubmissions(): WorkflowSubmission[] {
  try {
    const stored = typeof window !== 'undefined' ? localStorage.getItem(SUBMISSIONS_KEY) : null;
    if (stored) return JSON.parse(stored) as WorkflowSubmission[];
  } catch (e) {
    console.error('Failed to load submissions:', e);
  }
  return [];
}

export function saveSubmissions(submissions: WorkflowSubmission[]): void {
  try {
    if (typeof window !== 'undefined') {
      localStorage.setItem(SUBMISSIONS_KEY, JSON.stringify(submissions));
    }
  } catch (e) {
    console.error('Failed to save submissions:', e);
  }
}

export function addSubmission(sub: WorkflowSubmission): void {
  const list = loadSubmissions();
  list.push(sub);
  saveSubmissions(list);
}

export function updateSubmissionStatus(
  id: string,
  status: 'approved' | 'rejected'
): WorkflowSubmission | null {
  const list = loadSubmissions();
  const idx = list.findIndex((s) => s.id === id);
  if (idx >= 0) {
    list[idx].status = status;
    saveSubmissions(list);
    return list[idx];
  }
  return null;
}

export function loadAuditEvents(): AuditEvent[] {
  try {
    const stored = typeof window !== 'undefined' ? localStorage.getItem(AUDIT_KEY) : null;
    if (stored) return JSON.parse(stored) as AuditEvent[];
  } catch (e) {
    console.error('Failed to load audit events:', e);
  }
  return [];
}

export function saveAuditEvents(events: AuditEvent[]): void {
  try {
    if (typeof window !== 'undefined') {
      const trimmed = events.slice(-100);
      localStorage.setItem(AUDIT_KEY, JSON.stringify(trimmed));
    }
  } catch (e) {
    console.error('Failed to save audit events:', e);
  }
}

export function addAuditEvent(event: Omit<AuditEvent, 'id'>): void {
  const list = loadAuditEvents();
  const newEvent: AuditEvent = {
    ...event,
    id: `audit-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
  };
  list.push(newEvent);
  saveAuditEvents(list);
}
