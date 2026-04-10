/**
 * Personas data: seed definitions and in-memory store.
 * Replace with DB (e.g. Supabase) when ready; API routes use getPersonaById / listPersonas.
 */

import type { Persona } from '@/types';
import type { UserRole } from '@/types';

export const SEED_PERSONAS: Persona[] = [
  {
    id: 'maria-frontline',
    name: 'Maria',
    roleLabel: 'Frontline Operator (Assembly Line)',
    appRole: 'Leather Cutter',
    context:
      'Works on Line 3 Assembly. Uses Synapse via tablet during shifts. Participates in team-based drills in Ignite Academy. Medium digital literacy.',
    responsibilities: [
      'Executes SOP steps for assembly tasks',
      'Records cycle times and defects',
      'Responds to exceptions raised by Orchestrator',
      'Provides walkthrough videos and photos using Digitizer',
    ],
    goals: [
      'Complete shifts with zero safety issues',
      'Reduce rework and handoff friction',
      'Improve skill levels to qualify for "Senior Operator"',
      'Maintain high First-Time-Right performance',
    ],
    painPoints: [
      'SOPs sometimes outdated or unclear',
      'Coordination issues with maintenance team',
      'Hard to remember all steps for infrequent tasks',
      'Wants training but doesn\'t have time for classroom sessions',
    ],
    igniziaSupport: [
      'ExoTwin Cockpit: nudges, micro-lessons, Skills Passport updates',
      'Digitizer: quick capture of real process variations',
      'TwinOps Playground: sees simulations of upcoming changes',
      'Ignite Academy: scenario-based training tied to real tasks',
      'Orchestrator: ensures she only works when fully ready (permits, fatigue, tools, crew-readiness checks)',
    ],
    meta: { digitalLiteracy: 'medium', line: 'Line 3 Assembly' },
  },
  {
    id: 'plant-manager',
    name: 'Alex',
    roleLabel: 'Plant Manager',
    appRole: 'Plant Manager',
    context: 'Full site oversight and performance. Uses IGNIZIA for live KPIs, governance, and strategy alignment.',
    responsibilities: [
      'Site-wide performance and safety',
      'Strategic alignment with leadership',
      'Governance and compliance oversight',
    ],
    goals: [
      'Single source of truth for plant performance',
      'Proactive risk and deviation handling',
      'Align floor and leadership on one live view',
    ],
    painPoints: [
      'Data scattered across systems',
      'Delays between events and decisions',
    ],
    igniziaSupport: [
      'Control Tower and Leadership Dashboard',
      'Orchestrator and ExoTwin visibility',
      'Strategy and governance studios',
    ],
  },
  {
    id: 'ops-manager',
    name: 'Jordan',
    roleLabel: 'Operations Manager',
    appRole: 'Operations Manager',
    context: 'Process optimization and flow. Focus on throughput, quality, and coordination.',
    responsibilities: [
      'Process optimization and flow',
      'Cross-line coordination',
      'Quality and cycle time targets',
    ],
    goals: [
      'Optimize throughput and reduce rework',
      'Clear visibility into bottlenecks',
    ],
    painPoints: ['Handoffs and exceptions cause delays'],
    igniziaSupport: [
      'Workflow Builder and Orchestrator',
      'ExoTwin and Digitizer for process capture',
      'Analytics and Team Pulse',
    ],
  },
  {
    id: 'technical-team-lead',
    name: 'Diego',
    roleLabel: 'Technical Team Lead (Shift)',
    appRole: 'Line Manager',
    context:
      'Leads troubleshooting, changeovers, and daily technical execution on one shift. Coordinates technicians and operators in real time.',
    responsibilities: [
      'Owns shift-level technical execution',
      'Leads root-cause checks for downtime and defects',
      'Coordinates maintenance handoffs and recoveries',
      'Ensures SOP updates are applied on the line',
    ],
    goals: [
      'Reduce unplanned stops and restart losses',
      'Stabilize quality during changeovers',
      'Keep shift readiness visible and actionable',
    ],
    painPoints: [
      'Frequent interruptions from ad-hoc issues',
      'Hard to keep every team member aligned on latest SOP changes',
    ],
    igniziaSupport: [
      'Control Tower alerts for live shift signals',
      'Orchestrator for task sequencing and handoff checks',
      'ExoTwin cockpit for step-level guidance',
      'Strategy Studio (non-exec) for execution alignment',
    ],
    meta: { shift: 'B', digitalLiteracy: 'high' },
  },
  {
    id: 'line-manager',
    name: 'Sam',
    roleLabel: 'Line Manager',
    appRole: 'Line Manager',
    context: 'Direct team and output management. Day-to-day line execution and team readiness.',
    responsibilities: [
      'Team and output management',
      'SOP execution and readiness',
      'Escalations and handoffs',
    ],
    goals: [
      'Zero safety issues and high First-Time-Right',
      'Team skills and readiness visible',
    ],
    painPoints: ['Unclear SOPs and coordination with maintenance'],
    igniziaSupport: [
      'ExoTwin Cockpit and Ignite Academy',
      'Orchestrator permits and crew readiness',
      'Talent Studio and Skills Passport',
    ],
  },
  {
    id: 'hr-manager',
    name: 'Casey',
    roleLabel: 'HR Manager',
    appRole: 'HR Manager',
    context: 'Workforce readiness and well-being. Talent, training, and compliance.',
    responsibilities: [
      'Workforce readiness and well-being',
      'Training and compliance',
      'Talent and skills visibility',
    ],
    goals: [
      'Skills and readiness aligned to operations',
      'Training that fits the floor',
    ],
    painPoints: ['Classroom training doesn\'t fit shift patterns'],
    igniziaSupport: [
      'Talent Studio and Skills Passport',
      'Ignite Academy and ExoTwin',
      'Governance and policy visibility',
    ],
  },
  {
    id: 'workforce-readiness-partner',
    name: 'Taylor',
    roleLabel: 'HR Manager (Workforce Readiness)',
    appRole: 'HR Manager',
    context:
      'Partners with operations to close capability gaps, plan shift-safe training, and track workforce readiness for rollouts.',
    responsibilities: [
      'Maps capability gaps to shift demand',
      'Coordinates training windows with production constraints',
      'Tracks readiness risks across teams',
    ],
    goals: [
      'Increase coverage for critical skills',
      'Improve adoption quality for new process changes',
      'Prevent rollout delays caused by readiness gaps',
    ],
    painPoints: [
      'Training plans often conflict with production schedules',
      'Readiness data is fragmented across teams and tools',
    ],
    igniziaSupport: [
      'Talent Studio for capability planning',
      'Skills Passport for verified progression',
      'Ignite Academy for role-based micro-learning',
      'Strategy Studio (non-exec) for readiness alignment',
    ],
    meta: { focus: 'readiness', digitalLiteracy: 'medium' },
  },
  {
    id: 'procurement',
    name: 'Morgan',
    roleLabel: 'Procurement',
    appRole: 'Procurement',
    context: 'Materials sourcing and vendor management. Aligns supply with production.',
    responsibilities: [
      'Materials sourcing and vendor management',
      'Supply and demand alignment',
    ],
    goals: ['Visibility into demand and bottlenecks'],
    painPoints: ['Reactive ordering and lack of live demand signal'],
    igniziaSupport: [
      'Control Tower and workflow signals',
      'Orchestrator and production visibility',
    ],
  },
];

// In-memory store (keyed by persona id for "login as persona"; extend with user id when auth is added)
const personaById = new Map<string, Persona>();
SEED_PERSONAS.forEach((p) => personaById.set(p.id, p));

export function getPersonaById(id: string): Persona | null {
  return personaById.get(id) ?? null;
}

export function listPersonas(): Persona[] {
  return [...SEED_PERSONAS];
}

/** Resolve app role to a default persona id for backward compatibility with role-only login */
export function getDefaultPersonaIdForRole(role: UserRole): string {
  const found = SEED_PERSONAS.find((p) => p.appRole === role);
  return found?.id ?? SEED_PERSONAS[0]!.id;
}
