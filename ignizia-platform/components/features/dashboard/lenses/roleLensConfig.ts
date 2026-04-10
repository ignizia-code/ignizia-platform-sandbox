/**
 * Role-based lens configuration for Control Tower.
 * Each role has 5 lenses with titles and mock metric keys.
 */

import type { UserRole } from '@/types';

export interface LensConfig {
  title: string;
  metric1?: { label: string; value: string };
  metric2?: { label: string; value: string };
  chartData?: { name: string; value: number }[];
}

export const LENS_CONFIG_BY_ROLE: Record<UserRole, LensConfig[]> = {
  'Plant Manager': [
    { title: 'Team Cohesion & Psych Safety' },
    { title: 'Handoff & Coordination' },
    { title: 'Decision Cadence' },
    { title: 'Workforce Readiness & Trust' },
    { title: 'Learning Impact & ROI' },
  ],
  'Operations Manager': [
    { title: 'Throughput & Line Performance', metric1: { label: 'Throughput', value: '48 box/min' }, metric2: { label: 'Line Util', value: '87%' } },
    { title: 'Bottlenecks & Coordination Latency', metric1: { label: 'Latency', value: '2.1h' }, metric2: { label: 'Bottlenecks', value: '1' } },
    { title: 'Decision to Execution Lag', metric1: { label: 'Lag', value: '18h' }, metric2: { label: 'Action Ratio', value: '62%' } },
    { title: 'Crew Readiness', metric1: { label: 'Crew Ready', value: '94%' }, metric2: { label: 'Trust', value: '0.73' } },
    { title: 'Experiment Impact', metric1: { label: 'ROI', value: '+11%' }, metric2: { label: 'Adoption', value: '+9%' } },
  ],
  'Line Manager': [
    { title: 'Line Output KPIs', metric1: { label: 'Output', value: '92%' }, metric2: { label: 'Target', value: '95%' } },
    { title: 'Handoff Quality', metric1: { label: 'First-Time-Right', value: '91%' }, metric2: { label: 'Rework', value: '9%' } },
    { title: 'Decision Execution Speed', metric1: { label: 'Lag', value: '14h' }, metric2: { label: 'Briefing', value: '82%' } },
    { title: 'Crew Readiness', metric1: { label: 'Ready', value: '96%' }, metric2: { label: 'Trust', value: '0.75' } },
    { title: 'Training Coverage', metric1: { label: 'Retention', value: '85%' }, metric2: { label: 'Soft Skills', value: '+15%' } },
  ],
  'HR Manager': [
    { title: 'Workforce Readiness' },
    { title: 'Skills Intelligence' },
    { title: 'Factory Skills & Production Readiness' },
    { title: 'Psychological Safety & Trust' },
    { title: 'Learning Impact' },
  ],
  Procurement: [
    { title: 'Material Availability', metric1: { label: 'Availability', value: '94%' }, metric2: { label: 'Stock', value: 'OK' } },
    { title: 'Supplier Reliability', metric1: { label: 'On-Time', value: '96%' }, metric2: { label: 'Score', value: 'A' } },
    { title: 'Cost vs Budget', metric1: { label: 'Spend', value: '98%' }, metric2: { label: 'Variance', value: '-2%' } },
    { title: 'Procurement Cycle Time', metric1: { label: 'Cycle', value: '4.2d' }, metric2: { label: 'Lead', value: '3.1d' } },
    { title: 'Supply Risk Alerts', metric1: { label: 'Risks', value: '2' }, metric2: { label: 'Mitigated', value: '1' } },
  ],
  'Leather Cutter': [
    { title: 'Machine KPIs', metric1: { label: 'Uptime', value: '94%' }, metric2: { label: 'Util', value: '78%' } },
    { title: 'Production Rate', metric1: { label: 'Units/hr', value: '48' }, metric2: { label: 'Throughput', value: '92%' } },
    { title: 'Quality Defects', metric1: { label: 'Defect Rate', value: '2.1%' }, metric2: { label: 'Rework', value: '1.2%' } },
    { title: 'Safety Alerts', metric1: { label: 'Incidents', value: '0' }, metric2: { label: 'Near-Miss', value: '1' } },
    { title: 'Shift Task Queue', metric1: { label: 'Queue', value: '12' }, metric2: { label: 'Backlog', value: '3' } },
  ],
};

export function getLensesForRole(role: UserRole | null | undefined): LensConfig[] {
  const r = role ?? 'Plant Manager';
  return LENS_CONFIG_BY_ROLE[r] ?? LENS_CONFIG_BY_ROLE['Plant Manager'];
}
