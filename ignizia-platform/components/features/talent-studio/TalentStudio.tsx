'use client';

import React, { useMemo, useState, useCallback, useEffect } from 'react';
import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import ExpertSuite from './v3/ExpertSuite';
import { AppProvider as ExpertAppProvider } from './v3/store/AppContext';

type SkillTrend = 'Rising' | 'Stable' | 'Declining';
type SkillCriticality = 'Emerging' | 'Core' | 'Legacy';

interface EmployeeSkill {
  skillId: string;
  level: 1 | 2 | 3 | 4 | 5;
  // planned skills represent training / future coverage
  planned?: boolean;
}

interface Skill {
  id: string;
  name: string;
  category: string;
  trend: SkillTrend;
  criticality: SkillCriticality;
}

type WorkloadLevel = 'Underutilized' | 'Balanced' | 'At Capacity' | 'Overloaded';

interface Employee {
  id: string;
  name: string;
  title: string;
  team: string; // Used for Line / Shift / Department
  location: string; // Used for Shop Floor Area
  skills: EmployeeSkill[];
  workload: WorkloadLevel;
  allocation: number; // percentage
}

interface RoleRequirement {
  skillId: string;
  importance: 1 | 2 | 3; // 1 = nice to have, 3 = critical
}

interface Role {
  id: string;
  name: string;
  team: string;
  level: 'Operator' | 'Lead' | 'Supervisor' | 'Technician';
  requirements: RoleRequirement[];
}

type AlertType =
  | 'Skill Gap'
  | 'Single Point of Failure'
  | 'Emerging Need'
  | 'Understaffed Shift'
  | 'Overload Risk';

interface Alert {
  id: string;
  type: AlertType;
  severity: 'Low' | 'Medium' | 'High';
  title: string;
  description: string;
  affectedRoles?: string[];
  affectedEmployees?: string[];
  skillsInvolved?: string[];
}

// --- V2 Org Graph (client-only, normalized) -----------------------------------

type SkillLevel = 1 | 2 | 3 | 4 | 5;
type RequirementImportance = 1 | 2 | 3; // 1 = nice to have, 3 = critical

interface Requirement {
  skillId: string;
  importance: RequirementImportance;
  minLevel: SkillLevel;
  targetHolders: number;
}

interface Department {
  id: string;
  name: string;
  description?: string;
  requiredSkills?: Requirement[];
}

interface Team {
  id: string;
  departmentId: string;
  name: string;
  requiredSkills?: Requirement[];
}

interface RoleV2 {
  id: string;
  name: string;
  teamId: string;
  level: Role['level'];
  requirements: Requirement[];
  minIncumbents?: number;
  targetHeadcount?: number;
}

type SkillSource = 'verified' | 'self' | 'inferred' | 'planned';

interface EmployeeSkillV2 {
  skillId: string;
  level: SkillLevel;
  planned?: boolean;
  source?: SkillSource;
  lastValidated?: string;
}

interface EmployeeV2 {
  id: string;
  name: string;
  title: string;
  teamId: string;
  roleId?: string;
  location: string;
  skills: EmployeeSkillV2[];
  workload: WorkloadLevel;
  allocation: number;
}

interface TalentStudioV2State {
  version: 2;
  departments: Department[];
  teams: Team[];
  roles: RoleV2[];
  employees: EmployeeV2[];
  customRoleSkillDetails: Record<string, { technical: string[]; behavioural: string[] }>;
}

export const TALENT_STUDIO_V2_STORAGE_KEY = 'TALENT_STUDIO_V2';

function slugifyId(input: string) {
  return input
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function inferDepartmentNameFromTeam(teamName: string) {
  const t = teamName.toLowerCase();
  if (t.includes('quality')) return 'Quality';
  if (t.includes('maintenance')) return 'Maintenance';
  if (t.includes('logistics') || t.includes('warehouse')) return 'Logistics';
  if (t.includes('compliance') || t.includes('safety')) return 'Compliance';
  if (t.includes('procurement') || t.includes('vendor') || t.includes('buyer')) return 'Procurement';
  if (t.includes('finance') || t.includes('account')) return 'Finance';
  if (t.includes('hr') || t.includes('payroll')) return 'HR';
  if (t.includes('admin') || t.includes('office')) return 'Admin';
  if (t.includes('floor') || t.includes('supervision') || t.includes('management')) return 'Operations';
  if (t.includes('shift')) return 'Production';
  if (t.includes('production') || t.includes('line') || t.includes('prep')) return 'Production';
  return 'General';
}

function requirementFromLegacy(req: RoleRequirement): Requirement {
  const importance = req.importance;
  const minLevel = (importance === 3 ? 3 : importance === 2 ? 2 : 1) as SkillLevel;
  const targetHolders = 1;
  return { skillId: req.skillId, importance, minLevel, targetHolders };
}

export function buildDemoTalentStudioV2(): TalentStudioV2State {
  const allTeamNames = Array.from(
    new Set([...ROLES.map((r) => r.team), ...EMPLOYEES.map((e) => e.team)]),
  ).sort();

  const deptNameByTeamName: Record<string, string> = {};
  allTeamNames.forEach((teamName) => {
    deptNameByTeamName[teamName] = inferDepartmentNameFromTeam(teamName);
  });

  const deptNames = Array.from(new Set(Object.values(deptNameByTeamName))).sort();
  const departments: Department[] = deptNames.map((name) => ({
    id: `d_${slugifyId(name)}`,
    name,
    description: undefined,
    requiredSkills: [],
  }));
  const deptIdByName = Object.fromEntries(departments.map((d) => [d.name, d.id]));

  const teams: Team[] = allTeamNames.map((name, idx) => {
    const deptName = deptNameByTeamName[name] ?? 'General';
    const baseId = `t_${slugifyId(name) || `team-${idx + 1}`}`;
    return {
      id: baseId,
      departmentId: deptIdByName[deptName] ?? departments[0]?.id ?? 'd_general',
      name,
      requiredSkills: [],
    };
  });
  const teamIdByName = Object.fromEntries(teams.map((t) => [t.name, t.id]));

  const roles: RoleV2[] = ROLES.map((r) => ({
    id: r.id,
    name: r.name,
    teamId: teamIdByName[r.team] ?? teamIdByName[teams[0]?.name ?? ''] ?? 't_unknown',
    level: r.level,
    requirements: r.requirements.map(requirementFromLegacy),
  }));
  const roleIdByName = Object.fromEntries(roles.map((r) => [r.name, r.id]));

  const employees: EmployeeV2[] = EMPLOYEES.map((e) => ({
    id: e.id,
    name: e.name,
    title: e.title,
    teamId: teamIdByName[e.team] ?? teamIdByName[teams[0]?.name ?? ''] ?? 't_unknown',
    roleId: roleIdByName[e.title],
    location: e.location,
    workload: e.workload,
    allocation: e.allocation,
    skills: e.skills.map((s) => ({
      skillId: s.skillId,
      level: s.level as SkillLevel,
      planned: s.planned,
      source: s.planned ? 'planned' : 'inferred',
    })),
  }));

  return {
    version: 2,
    departments,
    teams,
    roles,
    employees,
    customRoleSkillDetails: {},
  };
}

export function loadTalentStudioV2(): TalentStudioV2State | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.localStorage.getItem(TALENT_STUDIO_V2_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<TalentStudioV2State> | null;
    if (!parsed || parsed.version !== 2) return null;
    if (!Array.isArray(parsed.departments) || !Array.isArray(parsed.teams) || !Array.isArray(parsed.roles) || !Array.isArray(parsed.employees)) {
      return null;
    }
    return {
      version: 2,
      departments: parsed.departments as Department[],
      teams: parsed.teams as Team[],
      roles: parsed.roles as RoleV2[],
      employees: parsed.employees as EmployeeV2[],
      customRoleSkillDetails: (parsed.customRoleSkillDetails ?? {}) as TalentStudioV2State['customRoleSkillDetails'],
    };
  } catch {
    return null;
  }
}

function saveTalentStudioV2(state: TalentStudioV2State) {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(TALENT_STUDIO_V2_STORAGE_KEY, JSON.stringify(state));
  } catch {
    // ignore storage quota / private mode
  }
}

// --- Mock Data: Manufacturing Context -------------------------------------------

export const SKILLS: Skill[] = [
  { id: 's1', name: 'Industrial Sewing', category: 'Production', trend: 'Stable', criticality: 'Core' },
  { id: 's2', name: 'Leather Cutting', category: 'Production', trend: 'Declining', criticality: 'Core' },
  { id: 's3', name: 'Pattern Alignment', category: 'Production', trend: 'Stable', criticality: 'Core' },
  { id: 's4', name: 'Quality Inspection (ISO)', category: 'Quality', trend: 'Rising', criticality: 'Core' },
  { id: 's5', name: 'Machine Maintenance', category: 'Maintenance', trend: 'Rising', criticality: 'Core' },
  { id: 's6', name: 'CNC Operation', category: 'Production', trend: 'Rising', criticality: 'Emerging' },
  { id: 's7', name: 'Health & Safety (L2)', category: 'Compliance', trend: 'Stable', criticality: 'Core' },
  { id: 's8', name: 'Inventory Mgmt', category: 'Logistics', trend: 'Stable', criticality: 'Core' },
  { id: 's9', name: 'Forklift Operation', category: 'Logistics', trend: 'Stable', criticality: 'Core' },
  { id: 's10', name: 'ERP System Usage', category: 'Systems', trend: 'Rising', criticality: 'Emerging' },
  { id: 's11', name: 'Shift Supervision', category: 'Management', trend: 'Stable', criticality: 'Core' },
  { id: 's12', name: 'Automated Cutting', category: 'Production', trend: 'Rising', criticality: 'Emerging' },
  { id: 's13', name: 'Adhesive Application', category: 'Production', trend: 'Stable', criticality: 'Core' },
  { id: 's14', name: 'Lean Manufacturing', category: 'Process', trend: 'Rising', criticality: 'Core' },
  { id: 's15', name: 'Robotics Basic Maint.', category: 'Maintenance', trend: 'Rising', criticality: 'Emerging' },
  // New Skills for expanded use cases
  { id: 's16', name: 'Legacy Loom Repair', category: 'Maintenance', trend: 'Declining', criticality: 'Legacy' },
  { id: 's17', name: 'AI Visual Inspection', category: 'Quality', trend: 'Rising', criticality: 'Emerging' },
  { id: 's18', name: 'Chemical Handling', category: 'Compliance', trend: 'Stable', criticality: 'Core' },
  // Back-office / white-collar skills
  { id: 's19', name: 'Procurement & Purchasing', category: 'Procurement', trend: 'Stable', criticality: 'Core' },
  { id: 's20', name: 'Vendor & Supplier Relations', category: 'Procurement', trend: 'Stable', criticality: 'Core' },
  { id: 's21', name: 'Contract Negotiation', category: 'Procurement', trend: 'Rising', criticality: 'Core' },
  { id: 's22', name: 'Material Sourcing', category: 'Procurement', trend: 'Stable', criticality: 'Core' },
  { id: 's23', name: 'Supply Chain Planning', category: 'Logistics', trend: 'Rising', criticality: 'Core' },
  { id: 's24', name: 'Cost Accounting', category: 'Finance', trend: 'Stable', criticality: 'Core' },
  { id: 's25', name: 'HR & Payroll Admin', category: 'HR', trend: 'Stable', criticality: 'Core' },
  { id: 's26', name: 'Office & Document Admin', category: 'Admin', trend: 'Stable', criticality: 'Core' },
  { id: 's27', name: 'Compliance & Legal (Contracts)', category: 'Compliance', trend: 'Rising', criticality: 'Core' },
  { id: 's28', name: 'Demand Forecasting', category: 'Logistics', trend: 'Rising', criticality: 'Emerging' },
];

const ROLES: Role[] = [
  {
    id: 'r1',
    name: 'Stitching Operator',
    team: 'Production Line A',
    level: 'Operator',
    requirements: [
      { skillId: 's1', importance: 3 },
      { skillId: 's3', importance: 3 },
      { skillId: 's7', importance: 3 },
      { skillId: 's14', importance: 1 },
    ],
  },
  {
    id: 'r2',
    name: 'Cutting Machine Operator',
    team: 'Preparation Area',
    level: 'Operator',
    requirements: [
      { skillId: 's2', importance: 3 },
      { skillId: 's6', importance: 2 },
      { skillId: 's12', importance: 2 },
      { skillId: 's7', importance: 3 },
    ],
  },
  {
    id: 'r3',
    name: 'Quality Inspector',
    team: 'Quality Control',
    level: 'Technician',
    requirements: [
      { skillId: 's4', importance: 3 },
      { skillId: 's1', importance: 2 }, // Needs to know how to sew to check it
      { skillId: 's10', importance: 2 },
      { skillId: 's7', importance: 3 },
    ],
  },
  {
    id: 'r4',
    name: 'Maintenance Technician',
    team: 'Maintenance',
    level: 'Technician',
    requirements: [
      { skillId: 's5', importance: 3 },
      { skillId: 's15', importance: 2 },
      { skillId: 's7', importance: 3 },
      { skillId: 's10', importance: 1 },
      { skillId: 's16', importance: 2 },
    ],
  },
  {
    id: 'r5',
    name: 'Production Supervisor',
    team: 'Floor Management',
    level: 'Supervisor',
    requirements: [
      { skillId: 's11', importance: 3 },
      { skillId: 's14', importance: 3 },
      { skillId: 's10', importance: 3 },
      { skillId: 's7', importance: 3 },
    ],
  },
  {
    id: 'r6',
    name: 'Warehouse Operator',
    team: 'Logistics',
    level: 'Operator',
    requirements: [
      { skillId: 's8', importance: 3 },
      { skillId: 's9', importance: 3 },
      { skillId: 's7', importance: 3 },
    ],
  },
  // New Roles
  {
    id: 'r7',
    name: 'Chemical Safety Officer',
    team: 'Compliance',
    level: 'Technician',
    requirements: [
      { skillId: 's18', importance: 3 },
      { skillId: 's7', importance: 3 },
      { skillId: 's4', importance: 2 },
    ],
  },
  {
    id: 'r8',
    name: 'AI Systems Monitor',
    team: 'Quality Control',
    level: 'Technician',
    requirements: [
      { skillId: 's17', importance: 3 },
      { skillId: 's10', importance: 3 },
      { skillId: 's4', importance: 2 },
    ],
  },
  // Back-office / white-collar roles
  {
    id: 'r9',
    name: 'Procurement Specialist',
    team: 'Procurement',
    level: 'Technician',
    requirements: [
      { skillId: 's19', importance: 3 },
      { skillId: 's20', importance: 3 },
      { skillId: 's10', importance: 2 },
      { skillId: 's21', importance: 2 },
    ],
  },
  {
    id: 'r10',
    name: 'Buyer',
    team: 'Procurement',
    level: 'Operator',
    requirements: [
      { skillId: 's19', importance: 3 },
      { skillId: 's22', importance: 3 },
      { skillId: 's10', importance: 2 },
    ],
  },
  {
    id: 'r11',
    name: 'Vendor Relations Coordinator',
    team: 'Procurement',
    level: 'Technician',
    requirements: [
      { skillId: 's20', importance: 3 },
      { skillId: 's21', importance: 3 },
      { skillId: 's27', importance: 2 },
    ],
  },
  {
    id: 'r12',
    name: 'Supply Chain Planner',
    team: 'Supply Chain',
    level: 'Technician',
    requirements: [
      { skillId: 's23', importance: 3 },
      { skillId: 's28', importance: 2 },
      { skillId: 's10', importance: 3 },
      { skillId: 's8', importance: 1 },
    ],
  },
  {
    id: 'r13',
    name: 'Cost Accountant',
    team: 'Finance',
    level: 'Technician',
    requirements: [
      { skillId: 's24', importance: 3 },
      { skillId: 's10', importance: 3 },
      { skillId: 's19', importance: 1 },
    ],
  },
  {
    id: 'r14',
    name: 'HR & Payroll Coordinator',
    team: 'HR',
    level: 'Technician',
    requirements: [
      { skillId: 's25', importance: 3 },
      { skillId: 's10', importance: 2 },
      { skillId: 's26', importance: 2 },
    ],
  },
  {
    id: 'r15',
    name: 'Office Administrator',
    team: 'Admin',
    level: 'Operator',
    requirements: [
      { skillId: 's26', importance: 3 },
      { skillId: 's10', importance: 2 },
    ],
  },
];

// Canonical skill set: only skills that appear in role requirements (roles are source of truth)
const SKILL_IDS_IN_ROLES = new Set(ROLES.flatMap((r) => r.requirements.map((req) => req.skillId)));
const SKILLS_CANONICAL: Skill[] = SKILLS.filter((s) => SKILL_IDS_IN_ROLES.has(s.id));

// Single source of truth: employee skills are derived from their role's requirements
function getSkillsForRole(roleName: string, employeeId: string): EmployeeSkill[] {
  const role = ROLES.find((r) => r.name === roleName);
  if (!role) return [];
  const variation = employeeId.split('').reduce((acc, c) => acc + c.charCodeAt(0), 0) % 2;
  return role.requirements.map((req) => {
    const base = 2 + req.importance;
    const level = Math.min(5, Math.max(1, base + variation)) as 1 | 2 | 3 | 4 | 5;
    return { skillId: req.skillId, level };
  });
}

// Role-level skill breakdown: Technical (Hard) and Behavioural (Soft) â€” for display in Roles table
const ROLE_SKILL_DETAILS: Record<string, { technical: string[]; behavioural: string[] }> = {
  'Stitching Operator': {
    technical: [
      'Industrial sewing machine operation (single & double needle)',
      'Stitch consistency & tension control',
      'Pattern alignment & seam accuracy',
      'Material handling (leather, fabric variants)',
      'Basic machine setup & adjustments',
      'Minor troubleshooting (needle breaks, thread issues)',
      'Visual quality self-inspection',
      'Health & Safety (L2)',
      'Ergonomics & safe workstation practices',
    ],
    behavioural: [
      'Manual dexterity & attention to detail',
      'Pace control under production targets',
      'Following SOPs precisely',
      'Consistency & reliability',
      'Basic communication with line supervisors',
      'Teamwork in line-based production',
      'Openness to cross-training',
    ],
  },
  'Cutting Machine Operator': {
    technical: [
      'Leather/material cutting machine operation',
      'Manual & automated cutting techniques',
      'Pattern reading & layout optimization',
      'Waste minimization techniques',
      'Blade/tool safety handling',
      'Machine calibration & setup',
      'Basic preventive maintenance',
      'Health & Safety (L2)',
    ],
    behavioural: [
      'Precision & spatial awareness',
      'Risk awareness & safety discipline',
      'Time management',
      'Focus during repetitive tasks',
      'Communication with stitching & prep teams',
      'Accountability for material usage',
    ],
  },
  'Quality Inspector': {
    technical: [
      'Visual & dimensional inspection',
      'ISO-based quality inspection methods',
      'Defect classification & reporting',
      'Measurement tools usage (calipers, gauges)',
      'Quality documentation & traceability',
      'Root-cause identification basics',
      'Health & Safety (L2)',
    ],
    behavioural: [
      'High attention to detail',
      'Objectivity & consistency',
      'Assertive communication (flagging issues)',
      'Documentation discipline',
      'Problem-solving mindset',
      'Ability to handle production pressure without bias',
    ],
  },
  'Maintenance Technician': {
    technical: [
      'Mechanical systems maintenance',
      'Electrical basics (motors, sensors)',
      'Machine troubleshooting & diagnostics',
      'Preventive & corrective maintenance',
      'Spare parts management',
      'Equipment safety lock-out/tag-out',
      'Technical documentation reading',
      'Health & Safety (L2)',
    ],
    behavioural: [
      'Analytical thinking',
      'Calm response under breakdown pressure',
      'Prioritization & decision-making',
      'Clear communication with production teams',
      'Ownership & accountability',
      'Knowledge sharing with operators',
    ],
  },
  'Production Supervisor': {
    technical: [
      'Shift supervision & workforce planning',
      'Production scheduling',
      'Lean manufacturing principles',
      'KPI tracking & reporting',
      'ERP system usage',
      'Basic quality & process control',
      'Health & Safety (L2)',
      'Incident & deviation reporting',
    ],
    behavioural: [
      'Leadership & people management',
      'Conflict resolution',
      'Coaching & performance feedback',
      'Decision-making under pressure',
      'Clear verbal communication',
      'Accountability enforcement',
      'Change management',
    ],
  },
  'Warehouse Operator': {
    technical: [
      'Inventory management procedures',
      'ERP inventory transactions',
      'Forklift operation & certification',
      'Picking, packing & labeling',
      'Stock rotation (FIFO/FEFO)',
      'Receiving & dispatch documentation',
      'Health & Safety (L2)',
    ],
    behavioural: [
      'Organization & accuracy',
      'Physical stamina',
      'Safety awareness',
      'Team coordination',
      'Time management',
      'Responsibility for stock integrity',
    ],
  },
  'Chemical Safety Officer': {
    technical: [
      'Chemical handling & storage protocols',
      'MSDS interpretation',
      'Regulatory compliance (local & international)',
      'Hazard identification & risk assessment',
      'PPE standards & enforcement',
      'Incident response & reporting',
      'Environmental safety basics',
      'Health & Safety (Advanced)',
    ],
    behavioural: [
      'High risk awareness',
      'Authority & confidence to enforce rules',
      'Clear documentation & reporting',
      'Training & instruction capability',
      'Integrity & compliance mindset',
      'Attention to regulatory detail',
    ],
  },
  'AI Systems Monitor': {
    technical: [
      'AI visual inspection system operation',
      'Model performance monitoring',
      'False positive / false negative analysis',
      'Data labeling & feedback loops',
      'ERP system integration',
      'Basic data analytics',
      'System troubleshooting',
      'Quality escalation protocols',
    ],
    behavioural: [
      'Analytical thinking',
      'Technical curiosity',
      'Attention to anomalies & trends',
      'Communication with IT / Quality teams',
      'Ownership of system accuracy',
      'Continuous improvement mindset',
    ],
  },
  'Procurement Specialist': {
    technical: [
      'Procurement & purchasing processes',
      'Vendor evaluation & selection',
      'Cost analysis & negotiation',
      'Contract review basics',
      'ERP procurement modules',
      'Compliance with sourcing policies',
      'Risk assessment (supplier dependency)',
    ],
    behavioural: [
      'Negotiation & persuasion',
      'Relationship management',
      'Analytical decision-making',
      'Ethics & compliance awareness',
      'Cross-functional communication',
      'Strategic thinking',
    ],
  },
  'Buyer': {
    technical: [
      'Purchase order processing',
      'Material sourcing',
      'ERP transactions',
      'Supplier communication',
      'Delivery tracking & follow-ups',
      'Cost comparison',
    ],
    behavioural: [
      'Attention to detail',
      'Time sensitivity',
      'Reliability & follow-through',
      'Communication clarity',
      'Coordination with planning & warehouse',
    ],
  },
  'Vendor Relations Coordinator': {
    technical: [
      'Supplier relationship management',
      'Contract negotiation support',
      'Performance tracking (OTD, quality)',
      'Documentation & correspondence',
      'ERP vendor records management',
    ],
    behavioural: [
      'Relationship building',
      'Diplomacy & tact',
      'Conflict resolution',
      'Professional communication',
      'Stakeholder alignment',
    ],
  },
  'Supply Chain Planner': {
    technical: [
      'Demand & supply planning',
      'Capacity planning',
      'ERP planning modules',
      'Forecast analysis',
      'Inventory optimization',
      'Scenario planning',
      'Risk mitigation planning',
    ],
    behavioural: [
      'Systems thinking',
      'Analytical reasoning',
      'Decision-making under uncertainty',
      'Cross-functional collaboration',
      'Communication of plans & tradeoffs',
    ],
  },
  'Cost Accountant': {
    technical: [
      'Cost accounting methodologies',
      'BOM & routing cost analysis',
      'Variance analysis',
      'ERP financial modules',
      'Budget tracking',
      'Financial reporting',
    ],
    behavioural: [
      'Analytical precision',
      'Confidentiality & integrity',
      'Business acumen',
      'Communication with non-finance teams',
      'Attention to detail',
    ],
  },
  'HR & Payroll Coordinator': {
    technical: [
      'Payroll processing',
      'HR administration',
      'Labor law compliance',
      'Employee records management',
      'ERP / HRIS systems',
      'Benefits administration',
    ],
    behavioural: [
      'Confidentiality & trustworthiness',
      'Empathy & professionalism',
      'Accuracy & deadline discipline',
      'Conflict sensitivity',
      'Clear communication',
    ],
  },
  'Office Administrator': {
    technical: [
      'Office & document administration',
      'Filing & record keeping',
      'Basic accounting/admin support',
      'ERP data entry',
      'Scheduling & coordination',
      'Procurement/admin support tasks',
    ],
    behavioural: [
      'Organization & multitasking',
      'Reliability',
      'Communication & coordination',
      'Problem solving',
      'Service mindset',
    ],
  },
};

// All skills available in the hiring canvas: SKILLS (core, with employee coverage) + role-level technical/behavioural details
type CanvasSkillItem = { id: string; name: string; category: string; source: 'core' | 'detail' };
const ALL_CANVAS_SKILLS: CanvasSkillItem[] = (() => {
  const core: CanvasSkillItem[] = SKILLS_CANONICAL.map((s) => ({
    id: s.id,
    name: s.name,
    category: s.category,
    source: 'core' as const,
  }));
  const detailByName: Map<string, 'Technical' | 'Behavioural'> = new Map();
  Object.values(ROLE_SKILL_DETAILS).forEach(({ technical, behavioural }) => {
    technical.forEach((n) => detailByName.set(n, 'Technical'));
    behavioural.forEach((n) => detailByName.set(n, 'Behavioural'));
  });
  const detail: CanvasSkillItem[] = Array.from(detailByName.entries()).map(([name]) => ({
    id: `detail:${name}`,
    name,
    category: detailByName.get(name)!,
    source: 'detail' as const,
  }));
  // Put core first so they appear before detail skills when no search
  return [...core, ...detail];
})();

const EMPLOYEES: Employee[] = [
  {
    id: 'e1',
    name: 'Maria Gonzalez',
    title: 'Production Supervisor',
    team: 'Morning Shift',
    location: 'Floor A',
    workload: 'Overloaded',
    allocation: 110,
    skills: getSkillsForRole('Production Supervisor', 'e1'),
  },
  {
    id: 'e2',
    name: 'David Chen',
    title: 'Stitching Operator',
    team: 'Morning Shift',
    location: 'Line 1',
    workload: 'Balanced',
    allocation: 90,
    skills: getSkillsForRole('Stitching Operator', 'e2'),
  },
  {
    id: 'e3',
    name: 'Sarah Smith',
    title: 'Quality Inspector',
    team: 'Morning Shift',
    location: 'QC Station',
    workload: 'At Capacity',
    allocation: 100,
    skills: getSkillsForRole('Quality Inspector', 'e3'),
  },
  {
    id: 'e4',
    name: 'Ahmed Hassan',
    title: 'Maintenance Technician',
    team: 'Rotating Shift',
    location: 'Workshop',
    workload: 'Overloaded',
    allocation: 120,
    skills: getSkillsForRole('Maintenance Technician', 'e4'),
  },
  {
    id: 'e5',
    name: 'Elena Rossi',
    title: 'Stitching Operator',
    team: 'Morning Shift',
    location: 'Line 2',
    workload: 'Balanced',
    allocation: 85,
    skills: getSkillsForRole('Stitching Operator', 'e5'),
  },
  {
    id: 'e6',
    name: 'James Wilson',
    title: 'Warehouse Operator',
    team: 'Morning Shift',
    location: 'Warehouse',
    workload: 'Underutilized',
    allocation: 60,
    skills: getSkillsForRole('Warehouse Operator', 'e6'),
  },
  {
    id: 'e7',
    name: 'Li Wei',
    title: 'Cutting Machine Operator',
    team: 'Morning Shift',
    location: 'Cutting Area',
    workload: 'Balanced',
    allocation: 95,
    skills: getSkillsForRole('Cutting Machine Operator', 'e7'),
  },
  {
    id: 'e8',
    name: 'Fatima Al-Sayed',
    title: 'Stitching Operator',
    team: 'Evening Shift',
    location: 'Line 1',
    workload: 'At Capacity',
    allocation: 100,
    skills: getSkillsForRole('Stitching Operator', 'e8'),
  },
  {
    id: 'e9',
    name: 'Robert MÃ¼ller',
    title: 'Production Supervisor',
    team: 'Evening Shift',
    location: 'Floor A',
    workload: 'Balanced',
    allocation: 90,
    skills: getSkillsForRole('Production Supervisor', 'e9'),
  },
  {
    id: 'e10',
    name: 'Ana Silva',
    title: 'Quality Inspector',
    team: 'Evening Shift',
    location: 'QC Station',
    workload: 'Balanced',
    allocation: 80,
    skills: getSkillsForRole('Quality Inspector', 'e10'),
  },
  {
    id: 'e11',
    name: 'Kenji Tanaka',
    title: 'Maintenance Technician',
    team: 'Night Shift',
    location: 'Workshop',
    workload: 'Underutilized', // Night shift maintenance might be quiet or waiting
    allocation: 50,
    skills: getSkillsForRole('Maintenance Technician', 'e11'),
  },
  {
    id: 'e12',
    name: 'Sofia Popov',
    title: 'Stitching Operator',
    team: 'Evening Shift',
    location: 'Line 2',
    workload: 'Balanced',
    allocation: 90,
    skills: getSkillsForRole('Stitching Operator', 'e12'),
  },
  {
    id: 'e13',
    name: 'Miguel Rodriguez',
    title: 'Cutting Machine Operator',
    team: 'Evening Shift',
    location: 'Cutting Area',
    workload: 'Balanced',
    allocation: 85,
    skills: getSkillsForRole('Cutting Machine Operator', 'e13'),
  },
  {
    id: 'e14',
    name: 'Emma Jones',
    title: 'Warehouse Operator',
    team: 'Evening Shift',
    location: 'Warehouse',
    workload: 'Balanced',
    allocation: 80,
    skills: getSkillsForRole('Warehouse Operator', 'e14'),
  },
  {
    id: 'e15',
    name: 'Lucas Dubois',
    title: 'Stitching Operator',
    team: 'Night Shift',
    location: 'Line 1',
    workload: 'At Capacity',
    allocation: 100,
    skills: getSkillsForRole('Stitching Operator', 'e15'),
  },
  {
    id: 'e16',
    name: 'Hana Kim',
    title: 'Stitching Operator',
    team: 'Night Shift',
    location: 'Line 1',
    workload: 'Balanced',
    allocation: 90,
    skills: getSkillsForRole('Stitching Operator', 'e16'),
  },
  // New Employees
  {
    id: 'e17',
    name: 'Liam O\'Connor',
    title: 'Stitching Operator', // Trainee
    team: 'Morning Shift',
    location: 'Line 1',
    workload: 'Underutilized',
    allocation: 60,
    skills: getSkillsForRole('Stitching Operator', 'e17'),
  },
  {
    id: 'e18',
    name: 'Eva Schmidt',
    title: 'Chemical Safety Officer',
    team: 'Compliance',
    location: 'Plant Wide',
    workload: 'At Capacity',
    allocation: 100,
    skills: getSkillsForRole('Chemical Safety Officer', 'e18'),
  },
  // Back-office / white-collar employees
  {
    id: 'e19',
    name: 'Priya Patel',
    title: 'Procurement Specialist',
    team: 'Procurement',
    location: 'Office',
    workload: 'At Capacity',
    allocation: 95,
    skills: getSkillsForRole('Procurement Specialist', 'e19'),
  },
  {
    id: 'e20',
    name: 'Marcus Johnson',
    title: 'Buyer',
    team: 'Procurement',
    location: 'Office',
    workload: 'Balanced',
    allocation: 85,
    skills: getSkillsForRole('Buyer', 'e20'),
  },
  {
    id: 'e21',
    name: 'Yuki Nakamura',
    title: 'Vendor Relations Coordinator',
    team: 'Procurement',
    location: 'HQ',
    workload: 'Balanced',
    allocation: 90,
    skills: getSkillsForRole('Vendor Relations Coordinator', 'e21'),
  },
  {
    id: 'e22',
    name: 'Olga Kowalski',
    title: 'Supply Chain Planner',
    team: 'Supply Chain',
    location: 'Office',
    workload: 'Overloaded',
    allocation: 105,
    skills: getSkillsForRole('Supply Chain Planner', 'e22'),
  },
  {
    id: 'e23',
    name: 'Thomas Berg',
    title: 'Cost Accountant',
    team: 'Finance',
    location: 'HQ',
    workload: 'At Capacity',
    allocation: 100,
    skills: getSkillsForRole('Cost Accountant', 'e23'),
  },
  {
    id: 'e24',
    name: 'Jennifer Walsh',
    title: 'HR & Payroll Coordinator',
    team: 'HR',
    location: 'Office',
    workload: 'Balanced',
    allocation: 80,
    skills: getSkillsForRole('HR & Payroll Coordinator', 'e24'),
  },
  {
    id: 'e25',
    name: 'Carlos Mendez',
    title: 'Office Administrator',
    team: 'Admin',
    location: 'Office',
    workload: 'At Capacity',
    allocation: 95,
    skills: getSkillsForRole('Office Administrator', 'e25'),
  },
  {
    id: 'e26',
    name: 'Aisha Okonkwo',
    title: 'Buyer',
    team: 'Procurement',
    location: 'Office',
    workload: 'Underutilized',
    allocation: 65,
    skills: getSkillsForRole('Buyer', 'e26'),
  },
  {
    id: 'e27',
    name: 'Dmitri Volkov',
    title: 'Supply Chain Planner',
    team: 'Supply Chain',
    location: 'Office',
    workload: 'Balanced',
    allocation: 88,
    skills: getSkillsForRole('Supply Chain Planner', 'e27'),
  },
  {
    id: 'e28',
    name: 'Rebecca Foster',
    title: 'Office Administrator',
    team: 'Admin',
    location: 'Office',
    workload: 'Balanced',
    allocation: 75,
    skills: getSkillsForRole('Office Administrator', 'e28'),
  },
];

// --- Derived insights ---------------------------------------------------------

const getSkillById = (id: string) => SKILLS.find((s) => s.id === id)!;

// Shows only the first skill; full list in modal on row click
function RoleSkillPreview({ technical, behavioural }: { technical: string[]; behavioural: string[] }) {
  const total = technical.length + behavioural.length;
  const first = technical[0] ?? behavioural[0];
  if (total === 0) return <span className="text-slate-400 text-[11px]">â€”</span>;
  return (
    <span className="text-[11px] text-slate-700 dark:text-slate-200">
      â€¢ {first}
      {total > 1 && <span className="text-slate-500 dark:text-slate-400"> +{total - 1} more</span>}
    </span>
  );
}

export const computeSkillCoverage = (canonicalSkills: Skill[], employees: EmployeeV2[]) => {
  return canonicalSkills.map((skill) => {
    const holders = employees.filter((e) =>
      e.skills.some((s) => s.skillId === skill.id && s.level >= 3 && !s.planned),
    );
    const strongHolders = holders.filter((e) =>
      e.skills.some((s) => s.skillId === skill.id && s.level >= 4 && !s.planned),
    );
    return {
      skill,
      holdersCount: holders.length,
      strongHoldersCount: strongHolders.length,
    };
  });
};

export const computeRoleRisk = (employees: EmployeeV2[], roles: RoleV2[]) => {
  return roles.map((role) => {
    const incumbents = employees.filter((e) => e.roleId === role.id || e.title === role.name);
    const scopeEmployees = employees.filter((e) => e.teamId === role.teamId);
    const requiredSkills = role.requirements.filter((r) => r.importance === 3);

    const gaps = requiredSkills.filter((req) => {
      const availableHolders = scopeEmployees.filter((e) =>
        e.skills.some((s) => s.skillId === req.skillId && s.level >= req.minLevel && !s.planned),
      ).length;
      return Math.max(0, req.targetHolders - availableHolders) > 0;
    });

    const singlePoints = requiredSkills.filter((req) => {
      const availableHolders = scopeEmployees.filter((e) =>
        e.skills.some((s) => s.skillId === req.skillId && s.level >= req.minLevel && !s.planned),
      ).length;
      return availableHolders === 1;
    });

    const overallRisk =
      gaps.length > 0 || incumbents.length === 0 ? 'High' : singlePoints.length > 0 ? 'Medium' : 'Low';

    return {
      role,
      incumbents,
      gaps,
      singlePoints,
      overallRisk,
    };
  });
};

export const computeAlerts = (
  employees: EmployeeV2[],
  roles: RoleV2[],
  canonicalSkills: Skill[],
  teamNameById: Record<string, string>,
): Alert[] => {
  const coverage = computeSkillCoverage(canonicalSkills, employees);
  const roleRisk = computeRoleRisk(employees, roles);

  const alerts: Alert[] = [];

  // 1. Skill coverage alerts
  coverage.forEach(({ skill, holdersCount, strongHoldersCount }) => {
    // Generalized Maintenance Alert
    if (skill.category === 'Maintenance' && holdersCount <= 2) {
       alerts.push({
        id: `main-risk-${skill.id}`,
        type: 'Skill Gap',
        severity: 'High',
        title: `Critical shortage: ${skill.name}`,
        description: `Rising demand for ${skill.category.toLowerCase()}, but only ${holdersCount} technicians available. Risk of downtime.`,
        skillsInvolved: [skill.name],
      });
    }

    // Emerging Tech Alert
    if (skill.criticality === 'Emerging' && holdersCount === 0) {
      alerts.push({
        id: `gap-${skill.id}`,
        type: 'Emerging Need',
        severity: 'Medium',
        title: `No coverage for new tech: "${skill.name}"`,
        description:
          'We have new machinery (e.g. AI/Robotics) but no skilled operators. Plan training now.',
        skillsInvolved: [skill.name],
      });
    } else if (skill.criticality === 'Core' && holdersCount <= 1) {
      const isProductionSkill = ['Production', 'Quality', 'Maintenance', 'Logistics'].includes(skill.category);
      alerts.push({
        id: `core-gap-${skill.id}`,
        type: 'Single Point of Failure',
        severity: 'High',
        title: isProductionSkill ? `Production risk: Single "${skill.name}" expert` : `Single point of failure: "${skill.name}"`,
        description: isProductionSkill
          ? 'If this person is sick, that production step stops. Cross-train immediately.'
          : 'Only one person holds this critical skill. Plan backup or cross-training.',
        skillsInvolved: [skill.name],
      });
    }

    // Legacy Attrition Alert
    if (skill.criticality === 'Legacy' && skill.trend === 'Declining' && holdersCount <= 2) {
      alerts.push({
        id: `legacy-risk-${skill.id}`,
        type: 'Skill Gap',
        severity: 'Medium',
        title: `Losing tribal knowledge: "${skill.name}"`,
        description: 'Legacy skill holders are declining. Ensure knowledge transfer before retirement.',
        skillsInvolved: [skill.name],
      });
    }
  });

  // 2. Shift / Line Coverage Logic
  const uniqueTeamIds = Array.from(new Set(employees.map((e) => e.teamId)));
  const getTeamName = (teamId: string) => teamNameById[teamId] ?? 'Unknown';

  const productionShiftTeamIds = uniqueTeamIds.filter((teamId) => {
    const name = getTeamName(teamId);
    return (
      name.includes('Shift') ||
      name === 'Production Line A' ||
      name === 'Preparation Area' ||
      name === 'Quality Control' ||
      name === 'Floor Management' ||
      name === 'Logistics'
    );
  });

  productionShiftTeamIds.forEach((teamId) => {
    const name = getTeamName(teamId);
    const shiftEmployees = employees.filter((e) => e.teamId === teamId);
    if (shiftEmployees.length === 0) return;

    // Check for Supervisor (production shifts only)
    const supervisors = shiftEmployees.filter((e) => e.title === 'Production Supervisor');
    if (shiftEmployees.length > 3 && supervisors.length === 0) {
      alerts.push({
        id: `no-sup-${teamId}`,
        type: 'Understaffed Shift',
        severity: 'High',
        title: `${name} lacks Supervision`,
        description: 'Shift is running with active staff but no supervisor on floor. Safety/Compliance risk.',
        affectedRoles: ['Production Supervisor'],
      });
    }
  });

  uniqueTeamIds.forEach((teamId) => {
    const name = getTeamName(teamId);
    const shiftEmployees = employees.filter((e) => e.teamId === teamId);
    if (shiftEmployees.length === 0) return;

    // Check for QA (Night Shift specific rule only)
    const qa = shiftEmployees.filter((e) => e.title === 'Quality Inspector');
    if (name.includes('Night') && qa.length === 0) {
      alerts.push({
        id: `night-qa-${teamId}`,
        type: 'Understaffed Shift',
        severity: 'High',
        title: `${name} lacks Quality Inspection`,
        description: 'Production is running at night but no skilled QA inspector is rostered.',
        affectedRoles: ['Quality Inspector'],
      });
    }
  });
  
  const cuttingOperators = employees.filter(e => e.title === 'Cutting Machine Operator');
  const skilledCutting = cuttingOperators.filter((e) =>
    e.skills.some((s) => s.skillId === 's12' && s.level >= 3 && !s.planned),
  ); // Automated Cutting
  
  if (skilledCutting.length <= 1) {
       alerts.push({
        id: 'cutting-cert',
        type: 'Skill Gap',
        severity: 'Medium',
        title: 'Only one skilled operator for Automated Cutting',
        description: 'Bottle-neck risk at the preparation stage. Train 2 more operators.',
        affectedRoles: ['Cutting Machine Operator'],
        skillsInvolved: ['Automated Cutting'],
      });
  }


  // 3. Overload Logic
  const overloaded = employees.filter((e) => e.workload === 'Overloaded');
  if (overloaded.length > 0) {
    alerts.push({
      id: 'overload-risk',
      type: 'Overload Risk',
      severity: 'High',
      title: 'Safety Risk: Overloaded Staff',
      description:
        'Key technicians and supervisors are >110% utilized. Fatigue increases accident risk in factory setting.',
      affectedEmployees: overloaded.map((e) => e.name),
    });
  }

  return alerts;
};

// --- Small presentational helpers --------------------------------------------

const severityColor: Record<Alert['severity'], string> = {
  High: 'bg-[#eb2d7c]/10 text-[#eb2d7c] border-[#eb2d7c]/20 dark:bg-[#eb2d7c]/20 dark:text-[#ff6ba3] dark:border-[#eb2d7c]/40',
  Medium:
    'bg-[#feea22]/10 text-[#eb5110] border-[#feea22]/20 dark:bg-[#feea22]/20 dark:text-[#feea22] dark:border-[#feea22]/40',
  Low: 'bg-[#25c375]/10 text-[#25c375] border-[#25c375]/20 dark:bg-[#25c375]/20 dark:text-[#25c375] dark:border-[#25c375]/40',
};

const workloadChipColor: Record<WorkloadLevel, string> = {
  Underutilized:
    'bg-[#01bff5]/10 text-[#01bff5] border-[#01bff5]/20 dark:bg-[#01bff5]/20 dark:text-[#01bff5] dark:border-[#01bff5]/40',
  Balanced:
    'bg-[#25c375]/10 text-[#25c375] border-[#25c375]/20 dark:bg-[#25c375]/20 dark:text-[#25c375] dark:border-[#25c375]/40',
  'At Capacity':
    'bg-[#feea22]/10 text-[#eb5110] border-[#feea22]/20 dark:bg-[#feea22]/20 dark:text-[#feea22] dark:border-[#feea22]/40',
  Overloaded:
    'bg-[#eb2d7c]/10 text-[#eb2d7c] border-[#eb2d7c]/20 dark:bg-[#eb2d7c]/20 dark:text-[#ff6ba3] dark:border-[#eb2d7c]/40',
};

const riskBadgeColor: Record<string, string> = {
  High: 'bg-[#eb2d7c]/10 text-[#eb2d7c] border-[#eb2d7c]/20 dark:bg-[#eb2d7c]/30 dark:text-[#ff6ba3] dark:border-[#eb2d7c]/50',
  Medium:
    'bg-[#feea22]/10 text-[#eb5110] border-[#feea22]/20 dark:bg-[#feea22]/30 dark:text-[#feea22] dark:border-[#feea22]/50',
  Low: 'bg-[#25c375]/10 text-[#25c375] border-[#25c375]/20 dark:bg-[#25c375]/30 dark:text-[#25c375] dark:border-[#25c375]/50',
};

const trendPillColor: Record<SkillTrend, string> = {
  Rising:
    'bg-[#25c375]/10 text-[#25c375] border-[#25c375]/20 dark:bg-[#25c375]/20 dark:text-[#25c375] dark:border-[#25c375]/40',
  Stable:
    'bg-slate-50 text-slate-600 border-slate-100 dark:bg-slate-800/60 dark:text-slate-200 dark:border-slate-700',
  Declining:
    'bg-[#eb2d7c]/10 text-[#eb2d7c] border-[#eb2d7c]/20 dark:bg-[#eb2d7c]/20 dark:text-[#ff6ba3] dark:border-[#eb2d7c]/40',
};

const criticalityPillColor: Record<SkillCriticality, string> = {
  Emerging:
    'bg-[#01bff5]/10 text-[#01bff5] border-[#01bff5]/20 dark:bg-[#01bff5]/30 dark:text-[#01bff5] dark:border-[#01bff5]/50',
  Core: 'bg-slate-50 text-slate-700 border-slate-100 dark:bg-slate-800/60 dark:text-slate-100 dark:border-slate-600',
  Legacy:
    'bg-slate-50 text-slate-500 border-slate-100 dark:bg-slate-900/40 dark:text-slate-400 dark:border-slate-800',
};

type WidgetId = 'employees' | 'roles' | 'singlePoints';
type WidgetSize = 'full' | 'half';

interface WidgetConfig {
  id: WidgetId;
  size: WidgetSize;
}

// overview, alerts, skills moved to Control Tower HR Manager lenses
const DEFAULT_WIDGET_ORDER: WidgetConfig[] = [
  { id: 'employees', size: 'full' },
  { id: 'roles', size: 'full' },
  { id: 'singlePoints', size: 'full' },
];

type SortColumn = 'name' | 'allocation';

const TalentStudio: React.FC = () => {
  const [org, setOrg] = useState<TalentStudioV2State>(() => loadTalentStudioV2() ?? buildDemoTalentStudioV2());

  useEffect(() => {
    saveTalentStudioV2(org);
  }, [org]);

  const employees = org.employees;
  const roles = org.roles;
  const teams = org.teams;
  const departments = org.departments;

  const [widgetOrder, setWidgetOrder] = useState<WidgetConfig[]>(DEFAULT_WIDGET_ORDER);
  const [draggedWidget, setDraggedWidget] = useState<WidgetId | null>(null);
  const [isEditMode, setIsEditMode] = useState(false);
  const [sortColumn, setSortColumn] = useState<SortColumn>('name');
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const viewParam = searchParams?.get('view') ?? 'control';
  const activeMode: 'control' | 'org' | 'gaps' | 'expert' =
    viewParam === 'org' ? 'org' : viewParam === 'gaps' ? 'gaps' : viewParam === 'expert' ? 'expert' : 'control';
  const [roleSkillsModal, setRoleSkillsModal] = useState<{ name: string; team: string } | null>(null);
  const [skillsCanvasOpen, setSkillsCanvasOpen] = useState(false);
  const [canvasSkillSet, setCanvasSkillSet] = useState<{ skillId: string; importance: 1 | 2 | 3 }[]>([]);
  const [canvasSkillSearch, setCanvasSkillSearch] = useState('');
  const [canvasSkillDropdownOpen, setCanvasSkillDropdownOpen] = useState(false);
  const [canvasActionFeedback, setCanvasActionFeedback] = useState<string | null>(null);

  const [newRoleModalOpen, setNewRoleModalOpen] = useState(false);
  const [newRoleName, setNewRoleName] = useState('');
  const [newRoleTeam, setNewRoleTeam] = useState('');
  const [newRoleLevel, setNewRoleLevel] = useState<Role['level']>('Operator');
  const [newRoleSkillSet, setNewRoleSkillSet] = useState<{ skillId: string; importance: 1 | 2 | 3 }[]>([]);
  const [newRoleSkillSearch, setNewRoleSkillSearch] = useState('');
  const [newRoleSkillDropdownOpen, setNewRoleSkillDropdownOpen] = useState(false);
  const customRoleSkillDetails = org.customRoleSkillDetails;

  const roleSkillDetails = useMemo(
    () => ({
      ...ROLE_SKILL_DETAILS,
      ...customRoleSkillDetails,
    }),
    [customRoleSkillDetails],
  );

  const totalEmployees = employees.length;
  const totalRoles = roles.length;

  const teamNameById = useMemo(
    () => Object.fromEntries(teams.map((t) => [t.id, t.name])),
    [teams],
  );
  const getTeamName = useCallback((teamId: string) => teamNameById[teamId] ?? 'Unknown', [teamNameById]);

  const canonicalSkillIds = useMemo(
    () => new Set(roles.flatMap((r) => r.requirements.map((req) => req.skillId))),
    [roles],
  );
  const skillsCanonical = useMemo(
    () => SKILLS.filter((s) => canonicalSkillIds.has(s.id)),
    [canonicalSkillIds],
  );

  const skillCoverage = useMemo(
    () => computeSkillCoverage(skillsCanonical, employees),
    [skillsCanonical, employees],
  );
  const roleRisk = useMemo(() => computeRoleRisk(employees, roles), [employees, roles]);
  const alerts = useMemo(
    () => computeAlerts(employees, roles, skillsCanonical, teamNameById),
    [employees, roles, skillsCanonical, teamNameById],
  );

  const singlePointSkills = skillCoverage.filter((s) => s.holdersCount === 1);

  const topEmployeesByLoad = useMemo(() => {
    const sorted = [...employees];
    
    if (sortColumn === 'name') {
      sorted.sort((a, b) => a.name.localeCompare(b.name));
    } else if (sortColumn === 'allocation') {
      sorted.sort((a, b) => b.allocation - a.allocation);
    }
    
    return sorted.slice(0, 8);
  }, [employees, sortColumn]);

  const inferWorkloadFromAllocation = (allocation: number): WorkloadLevel => {
    if (allocation > 110) return 'Overloaded';
    if (allocation >= 95) return 'At Capacity';
    if (allocation < 70) return 'Underutilized';
    return 'Balanced';
  };

  const uniqueTeams = useMemo(() => [...teams].sort((a, b) => a.name.localeCompare(b.name)), [teams]);

  const baseEmployeeById: Record<string, EmployeeV2> = useMemo(() => {
    const demo = buildDemoTalentStudioV2();
    return Object.fromEntries(demo.employees.map((e) => [e.id, e]));
  }, []);

  const changedAllocations = employees.filter(
    (e) => baseEmployeeById[e.id] && baseEmployeeById[e.id].allocation !== e.allocation,
  ).length;
  const changedTeams = employees.filter(
    (e) => baseEmployeeById[e.id] && baseEmployeeById[e.id].teamId !== e.teamId,
  ).length;
  const plannedSkillsCount = employees.reduce(
    (acc, e) => acc + e.skills.filter((s) => s.planned).length,
    0,
  );

  const hasProposedChanges =
    changedAllocations > 0 || changedTeams > 0 || plannedSkillsCount > 0;

  const handleAllocationChange = (employeeId: string, allocation: number) => {
    setOrg((prev) => ({
      ...prev,
      employees: prev.employees.map((e) =>
        e.id === employeeId
          ? { ...e, allocation, workload: inferWorkloadFromAllocation(allocation) }
          : e,
      ),
    }));
  };

  const handleTeamChange = (employeeId: string, teamId: string) => {
    setOrg((prev) => ({
      ...prev,
      employees: prev.employees.map((e) => (e.id === employeeId ? { ...e, teamId } : e)),
    }));
  };

  const handlePlanSkillForEmployee = (employeeId: string, skillId: string) => {
    setOrg((prev) => ({
      ...prev,
      employees: prev.employees.map((e) => {
        if (e.id !== employeeId) return e;
        if (e.skills.some((s) => s.skillId === skillId)) return e;
        return {
          ...e,
          skills: [
            ...e.skills,
            {
              skillId,
              level: 3,
              planned: true,
              source: 'planned',
            },
          ],
        };
      }),
    }));
  };

  const resetProposedChanges = () => {
    setOrg(buildDemoTalentStudioV2());
  };

  const handleDragStart = useCallback((widgetId: WidgetId) => {
    if (!isEditMode) return;
    setDraggedWidget(widgetId);
  }, [isEditMode]);

  const handleDragOver = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    if (!isEditMode) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  }, [isEditMode]);

  const handleDrop = useCallback((targetWidgetId: WidgetId) => {
    if (!isEditMode || !draggedWidget || draggedWidget === targetWidgetId) {
      setDraggedWidget(null);
      return;
    }

    setWidgetOrder((prevOrder) => {
      const newOrder = [...prevOrder];
      const draggedIndex = newOrder.findIndex((w) => w.id === draggedWidget);
      const targetIndex = newOrder.findIndex((w) => w.id === targetWidgetId);

      // Swap positions
      [newOrder[draggedIndex], newOrder[targetIndex]] = [newOrder[targetIndex], newOrder[draggedIndex]];
      return newOrder;
    });

    setDraggedWidget(null);
  }, [isEditMode, draggedWidget]);

  const handleDragEnd = useCallback(() => {
    setDraggedWidget(null);
  }, []);

  const toggleWidgetSize = useCallback((widgetId: WidgetId) => {
    setWidgetOrder((prevOrder) =>
      prevOrder.map((w) =>
        w.id === widgetId ? { ...w, size: w.size === 'full' ? 'half' : 'full' } : w,
      ),
    );
  }, []);

  const findBackupCandidate = (skillId: string): EmployeeV2 | undefined => {
    const candidates = employees.filter(
      (e) => !e.skills.some((s) => s.skillId === skillId) && e.workload !== 'Overloaded',
    );
    // Prefer underutilized, then balanced
    return (
      candidates.find((c) => c.workload === 'Underutilized') ||
      candidates.find((c) => c.workload === 'Balanced') ||
      candidates[0]
    );
  };

  // --- Skills Canvas: internal coverage for target skill set -----------------
  const getCanvasSkillDisplayName = useCallback((skillId: string): string => {
    if (skillId.startsWith('detail:')) return skillId.slice(7);
    return getSkillById(skillId)?.name ?? skillId;
  }, []);

  const isCoreSkill = (skillId: string) => SKILLS.some((s) => s.id === skillId);

  const canvasFilteredSkills = useMemo(() => {
    const q = canvasSkillSearch.trim().toLowerCase();
    const selectedIds = new Set(canvasSkillSet.map((c) => c.skillId));
    return ALL_CANVAS_SKILLS.filter(
      (s) =>
        !selectedIds.has(s.id) &&
        (q === '' || s.name.toLowerCase().includes(q) || s.category.toLowerCase().includes(q)),
    );
  }, [canvasSkillSearch, canvasSkillSet]);

  const canvasCoverageByEmployee = useMemo(() => {
    if (canvasSkillSet.length === 0) return [];
    const coreReqs = canvasSkillSet.filter((r) => isCoreSkill(r.skillId));
    const totalWeight = coreReqs.reduce((acc, r) => acc + r.importance, 0);
    return employees.map((emp) => {
      let matchedWeight = 0;
      const matched: string[] = [];
      const gaps: string[] = [];
      canvasSkillSet.forEach((req) => {
        const displayName = getCanvasSkillDisplayName(req.skillId);
        if (req.skillId.startsWith('detail:')) {
          // Detail skills: no employee-level data; only used in job description, not in coverage table
          return;
        }
        const hasIt = emp.skills.some((s) => s.skillId === req.skillId && s.level >= 3 && !s.planned);
        if (hasIt) {
          matchedWeight += req.importance;
          matched.push(displayName);
        } else {
          gaps.push(displayName);
        }
      });
      const coveragePct = totalWeight > 0 ? Math.round((matchedWeight / totalWeight) * 100) : 0;
      return {
        employee: emp,
        coveragePct,
        matched,
        gaps,
        matchedWeight,
        totalWeight,
      };
    }).sort((a, b) => b.coveragePct - a.coveragePct);
  }, [employees, canvasSkillSet, getCanvasSkillDisplayName]);

  // --- New Role Builder: reuse full canvas skill list ------------------------
  const newRoleFilteredSkills = useMemo(() => {
    const q = newRoleSkillSearch.trim().toLowerCase();
    const selectedIds = new Set(newRoleSkillSet.map((r) => r.skillId));
    return ALL_CANVAS_SKILLS.filter(
      (s) =>
        !selectedIds.has(s.id) &&
        (q === '' || s.name.toLowerCase().includes(q) || s.category.toLowerCase().includes(q)),
    );
  }, [newRoleSkillSearch, newRoleSkillSet]);

  const addNewRoleSkill = (skillId: string, importance: 1 | 2 | 3 = 3) => {
    setNewRoleSkillSet((prev) => {
      if (prev.some((r) => r.skillId === skillId)) return prev;
      return [...prev, { skillId, importance }];
    });
    setNewRoleSkillDropdownOpen(false);
    setNewRoleSkillSearch('');
  };

  const setNewRoleSkillImportance = (skillId: string, importance: 1 | 2 | 3) => {
    setNewRoleSkillSet((prev) =>
      prev.map((r) => (r.skillId === skillId ? { ...r, importance } : r)),
    );
  };

  const removeNewRoleSkill = (skillId: string) => {
    setNewRoleSkillSet((prev) => prev.filter((r) => r.skillId !== skillId));
  };

  const resetNewRoleState = () => {
    setNewRoleName('');
    setNewRoleTeam(teams[0]?.id ?? '');
    setNewRoleLevel('Operator');
    setNewRoleSkillSet([]);
    setNewRoleSkillSearch('');
    setNewRoleSkillDropdownOpen(false);
  };

  const handleCreateNewRole = () => {
    const name = newRoleName.trim();
    if (!name || newRoleSkillSet.length === 0) return;

    const id = `custom-${Date.now()}`;
    const role: RoleV2 = {
      id,
      name,
      level: newRoleLevel,
      teamId: newRoleTeam || teams[0]?.id || 't_unknown',
      requirements: newRoleSkillSet.map((req) => ({
        skillId: req.skillId,
        importance: req.importance,
        minLevel: (req.importance === 3 ? 3 : req.importance === 2 ? 2 : 1) as SkillLevel,
        targetHolders: 1,
      })),
    };

    const technical: string[] = [];
    const behavioural: string[] = [];

    newRoleSkillSet.forEach((req) => {
      const displayName = getCanvasSkillDisplayName(req.skillId);
      const meta = ALL_CANVAS_SKILLS.find((s) => s.id === req.skillId);
      if (meta?.category === 'Behavioural') {
        behavioural.push(displayName);
      } else {
        technical.push(displayName);
      }
    });

    setOrg((prev) => ({
      ...prev,
      roles: [...prev.roles, role],
      customRoleSkillDetails: {
        ...prev.customRoleSkillDetails,
        [name]: { technical, behavioural },
      },
    }));

    setNewRoleModalOpen(false);
    resetNewRoleState();
  };

  const canvasInsight = useMemo(() => {
    if (canvasSkillSet.length === 0) return null;
    const full = canvasCoverageByEmployee.find((c) => c.coveragePct >= 100);
    const partial = canvasCoverageByEmployee.find((c) => c.coveragePct >= 80 && c.coveragePct < 100);
    const some = canvasCoverageByEmployee.find((c) => c.coveragePct >= 50);
    if (full) return { type: 'internal' as const, message: 'Role can be fully covered internally.', ref: full };
    if (partial) return { type: 'upskilling' as const, message: 'Partial upskilling could close the gap.', ref: partial };
    if (some) return { type: 'upskilling' as const, message: 'Upskilling or reassignment may reduce external hire need.', ref: some };
    return { type: 'external' as const, message: 'External hiring is recommended.', ref: null };
  }, [canvasSkillSet.length, canvasCoverageByEmployee]);

  const canvasRisks = useMemo(() => {
    const risks: { type: string; message: string; detail?: string }[] = [];
    if (canvasSkillSet.length === 0) return risks;
    canvasSkillSet.forEach((req) => {
      if (req.skillId.startsWith('detail:')) return;
      const holders = employees.filter((e) =>
        e.skills.some((s) => s.skillId === req.skillId && s.level >= 3 && !s.planned),
      );
      if (holders.length === 1) {
        const skill = getSkillById(req.skillId);
        risks.push({
          type: 'Single-point of failure',
          message: `Only one employee has "${skill.name}".`,
          detail: holders[0].name,
        });
      }
    });
    const topMatches = canvasCoverageByEmployee.slice(0, 5).filter((c) => c.coveragePct >= 50);
    const overloaded = topMatches.filter((c) => c.employee.workload === 'Overloaded');
    if (overloaded.length > 0) {
      risks.push({
        type: 'Overload risk',
        message: `Top internal match${overloaded.length > 1 ? 'es' : ''} already overloaded.`,
        detail: overloaded.map((c) => c.employee.name).join(', '),
      });
    }
    return risks;
  }, [canvasSkillSet, employees, canvasCoverageByEmployee]);

  const addCanvasSkill = (skillId: string, importance: 1 | 2 | 3 = 3) => {
    if (canvasSkillSet.some((c) => c.skillId === skillId)) return;
    setCanvasSkillSet((prev) => [...prev, { skillId, importance }]);
    setCanvasSkillSearch('');
    setCanvasSkillDropdownOpen(false);
  };

  const removeCanvasSkill = (skillId: string) => {
    setCanvasSkillSet((prev) => prev.filter((c) => c.skillId !== skillId));
  };

  const setCanvasSkillImportance = (skillId: string, importance: 1 | 2 | 3) => {
    setCanvasSkillSet((prev) => prev.map((c) => (c.skillId === skillId ? { ...c, importance } : c)));
  };

  const closeSkillsCanvas = () => {
    setSkillsCanvasOpen(false);
    setCanvasSkillSet([]);
    setCanvasSkillSearch('');
    setCanvasSkillDropdownOpen(false);
    setCanvasActionFeedback(null);
  };

  const showCanvasFeedback = (message: string) => {
    setCanvasActionFeedback(message);
    setTimeout(() => setCanvasActionFeedback(null), 3000);
  };

  const widgets: Record<WidgetId, { label: string; render: () => React.ReactNode }> = {
    employees: {
      label: 'Staffing & Allocation',
      render: () => (
        <div className="bg-white dark:bg-card-dark rounded-2xl border border-slate-200 dark:border-slate-700/80 shadow-sm lg:col-span-2">
          <div className="px-5 pt-4 pb-3 flex items-center justify-between">
            <div>
              <div className="text-xs font-semibold uppercase tracking-wide text-slate-400 mb-0.5">
                Staffing & Allocation
              </div>
              <div className="text-sm font-semibold text-slate-900 dark:text-slate-50">
                Shift Roster & Workload
              </div>
            </div>
            <div className="flex gap-1.5 text-[10px] text-slate-400">
              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-[#eb2d7c]/10 text-[#eb2d7c] dark:bg-[#eb2d7c]/20 dark:text-[#ff6ba3] border border-[#eb2d7c]/20 dark:border-[#eb2d7c]/40">
                <span className="h-1.5 w-1.5 rounded-full bg-[#eb2d7c]"></span>
                Overloaded
              </span>
              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-[#01bff5]/10 text-[#01bff5] dark:bg-[#01bff5]/20 dark:text-[#01bff5] border border-[#01bff5]/20 dark:border-[#01bff5]/40">
                <span className="h-1.5 w-1.5 rounded-full bg-[#01bff5]"></span>
                Available
              </span>
            </div>
          </div>
          <div className="overflow-x-auto border-t border-slate-100 dark:border-slate-800">
            <table className="min-w-full text-xs">
              <thead className="bg-slate-50/80 dark:bg-slate-900/70 text-slate-500 dark:text-slate-400">
                <tr>
                  <th className="text-left font-semibold px-5 py-2.5">Operator / Staff</th>
                  <th className="text-left font-semibold px-3 py-2.5">Role / Shift</th>
                  <th className="text-left font-semibold px-3 py-2.5 w-64">Skills</th>
                  <th className="text-left font-semibold px-3 py-2.5">Status</th>
                  <th 
                    onClick={() => setSortColumn(sortColumn === 'allocation' ? 'name' : 'allocation')}
                    className="text-left font-semibold px-3 py-2.5 cursor-pointer hover:text-slate-700 dark:hover:text-slate-300 transition-colors flex items-center gap-2 group"
                  >
                    Allocation
                    <span className={`inline-flex text-xs transition-transform ${sortColumn === 'allocation' ? 'opacity-100' : 'opacity-0 group-hover:opacity-50'}`}>
                      <span className="material-icons-round text-sm">
                        {sortColumn === 'allocation' ? 'unfold_more' : 'unfold_less'}
                      </span>
                    </span>
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {topEmployeesByLoad.map((e) => (
                  <tr key={e.id} className="hover:bg-slate-50/70 dark:hover:bg-slate-900/40 transition-colors">
                    <td className="px-5 py-2.5 align-top">
                      <div className="flex flex-col">
                        <span className="font-semibold text-slate-900 dark:text-slate-50">
                          {e.name}
                        </span>
                        <span className="text-[11px] text-slate-400">
                          {e.location}
                        </span>
                      </div>
                    </td>
                    <td className="px-3 py-2.5 align-top">
                      <div className="flex flex-col">
                        <span className="text-[12px] text-slate-800 dark:text-slate-100">
                          {e.title}
                        </span>
                        <div className="mt-0.5 flex items-center gap-1.5">
                          <span className="text-[11px] text-slate-400">{getTeamName(e.teamId)}</span>
                        </div>
                        <div className="mt-1">
                          <select
                            value={e.teamId}
                            onChange={(ev) => handleTeamChange(e.id, ev.target.value)}
                            className="text-[10px] border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 rounded-full px-2 py-0.5 text-slate-500 dark:text-slate-300 focus:outline-none focus:ring-1 focus:ring-primary/60"
                          >
                            {uniqueTeams.map((team) => (
                              <option key={team.id} value={team.id}>
                                Assign to {team.name}
                              </option>
                            ))}
                          </select>
                        </div>
                      </div>
                    </td>
                    <td className="px-3 py-2.5 align-top">
                      <div className="flex flex-wrap gap-1.5 max-w-xs">
                        {(() => {
                          const roleDetails = ROLE_SKILL_DETAILS[e.title];
                          const allRoleSkills = roleDetails
                            ? [...roleDetails.technical, ...roleDetails.behavioural]
                            : [];
                          const plannedDetailIds = new Set(
                            e.skills.filter((s) => s.skillId.startsWith('detail:')).map((s) => s.skillId),
                          );
                          const displayList = allRoleSkills.slice(0, 4);
                          const moreCount = Math.max(0, allRoleSkills.length - 4);
                          if (allRoleSkills.length === 0) {
                            return (
                              <>
                                {e.skills.slice(0, 4).map((s, idx) => {
                                  const name = s.skillId.startsWith('detail:') ? s.skillId.slice(7) : getSkillById(s.skillId)?.name ?? s.skillId;
                                  return (
                                    <span
                                      key={`${s.skillId}-${idx}`}
                                      className={`px-2 py-0.5 rounded-full border text-[10px] ${s.planned ? 'bg-indigo-50 text-indigo-700 border-indigo-100 dark:bg-indigo-900/30 dark:text-indigo-200 dark:border-indigo-900/60' : 'bg-slate-50 dark:bg-slate-900/50 border-slate-100 dark:border-slate-800 text-slate-600 dark:text-slate-300'}`}
                                    >
                                      {name}{s.planned ? ' (Plan)' : ''}
                                    </span>
                                  );
                                })}
                                {e.skills.length > 4 && <span className="text-[10px] text-slate-400">+{e.skills.length - 4} more</span>}
                              </>
                            );
                          }
                          return (
                            <>
                              {displayList.map((name, idx) => (
                                <span
                                  key={`${e.id}-${name}-${idx}`}
                                  className="px-2 py-0.5 rounded-full border text-[10px] bg-slate-50 dark:bg-slate-900/50 border-slate-100 dark:border-slate-800 text-slate-600 dark:text-slate-300"
                                >
                                  {name}
                                </span>
                              ))}
                              {plannedDetailIds.size > 0 && (
                                e.skills
                                  .filter((s) => s.skillId.startsWith('detail:'))
                                  .slice(0, 2)
                                  .map((s) => (
                                    <span
                                      key={s.skillId}
                                      className="px-2 py-0.5 rounded-full border text-[10px] bg-indigo-50 text-indigo-700 border-indigo-100 dark:bg-indigo-900/30 dark:text-indigo-200 dark:border-indigo-900/60"
                                    >
                                      {s.skillId.slice(7)}
                                      {s.planned ? ' (Plan)' : ''}
                                    </span>
                                  ))
                              )}
                              {moreCount > 0 && (
                                <span className="text-[10px] text-slate-400">
                                  +{moreCount} more
                                </span>
                              )}
                            </>
                          );
                        })()}
                      </div>
                      <div className="mt-1">
                        <select
                          defaultValue=""
                          onChange={(ev) => {
                            const skillId = ev.target.value;
                            if (!skillId) return;
                            handlePlanSkillForEmployee(e.id, skillId);
                            ev.target.value = '';
                          }}
                          className="text-[10px] border border-dashed border-slate-300 dark:border-slate-700 bg-white/80 dark:bg-slate-900/60 rounded-full px-2 py-0.5 text-slate-500 dark:text-slate-300 focus:outline-none focus:ring-1 focus:ring-primary/60 mt-1"
                        >
                          <option value="">
                            + Add skill / Train
                          </option>
                          {(() => {
                            const roleDetails = ROLE_SKILL_DETAILS[e.title];
                            const allRoleSkills = roleDetails
                              ? [...roleDetails.technical, ...roleDetails.behavioural]
                              : [];
                            const existingIds = new Set(e.skills.map((s) => s.skillId));
                            if (allRoleSkills.length > 0) {
                              return allRoleSkills
                                .filter((name) => !existingIds.has(`detail:${name}`))
                                .map((name) => (
                                  <option key={name} value={`detail:${name}`}>
                                    {name}
                                  </option>
                                ));
                            }
                            return ALL_CANVAS_SKILLS.filter((item) => !existingIds.has(item.id))
                              .slice(0, 20)
                              .map((item) => (
                                <option key={item.id} value={item.id}>
                                  {item.name}
                                </option>
                              ));
                          })()}
                        </select>
                      </div>
                    </td>
                    <td className="px-3 py-2.5 align-top">
                      <span
                        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full border text-[11px] ${workloadChipColor[e.workload]}`}
                      >
                        <span className="h-1.5 w-1.5 rounded-full bg-current"></span>
                        {e.workload}
                      </span>
                    </td>
                    <td className="px-3 py-2.5 align-top">
                      <div className="flex flex-col gap-1">
                        <span className="text-[12px] font-medium text-slate-900 dark:text-slate-50">
                          {e.allocation}%
                        </span>
                        <div className="w-full h-1.5 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                          <div
                            className={`h-full rounded-full ${
                              e.allocation > 110
                                ? 'bg-[#eb2d7c]'
                                : e.allocation >= 95
                                ? 'bg-[#feea22]'
                                : e.allocation < 70
                                ? 'bg-[#01bff5]'
                                : 'bg-[#25c375]'
                            }`}
                            style={{ width: `${Math.min(e.allocation, 130)}%` }}
                          ></div>
                        </div>
                        <input
                          type="range"
                          min={50}
                          max={130}
                          value={e.allocation}
                          onChange={(ev) => handleAllocationChange(e.id, Number(ev.target.value))}
                          className="mt-1 w-full accent-primary"
                        />
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="px-5 py-2.5 border-t border-slate-100 dark:border-slate-800 text-[11px] text-slate-400 dark:text-slate-500 flex items-center justify-between">
            <span>
              Showing {topEmployeesByLoad.length} of {EMPLOYEES.length} staff ranked by workload.
            </span>
            <span className="hidden md:inline">
              Adjust allocation to prevent burnout and ensure safety.
            </span>
          </div>
        </div>
      ),
    },
    roles: {
      label: 'Roles & Skill Coverage',
      render: () => (
        <div className="bg-white dark:bg-card-dark rounded-2xl border border-slate-200 dark:border-slate-700/80 shadow-sm p-5 lg:col-span-2">
          <div className="flex items-center justify-between mb-3">
            <div>
              <div className="text-xs font-semibold uppercase tracking-wide text-slate-400 mb-0.5">
                Role Coverage Matrix
              </div>
              <div className="text-sm font-semibold text-slate-900 dark:text-slate-50">
                Where is production exposed?
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setSkillsCanvasOpen(true)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary/10 text-primary hover:bg-primary/20 dark:bg-primary/20 dark:hover:bg-primary/30 text-xs font-semibold transition-colors"
              >
                <span className="material-icons-round text-[16px]">person_search</span>
                Hire for Skills
              </button>
              <button
                type="button"
                onClick={() => {
                  resetNewRoleState();
                  setNewRoleModalOpen(true);
                }}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-900 text-white hover:bg-slate-800 dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-slate-200 text-xs font-semibold transition-colors"
              >
                <span className="material-icons-round text-[16px]">add</span>
                Add Role
              </button>
              <span className="inline-flex items-center justify-center w-8 h-8 rounded-xl bg-slate-50 text-slate-600 dark:bg-slate-900/40 dark:text-slate-300">
                <span className="material-icons-round text-[18px]">table_view</span>
              </span>
            </div>
          </div>

          <div className="overflow-x-auto -mx-2 px-2">
            <table className="min-w-full text-xs">
              <thead className="bg-slate-50/80 dark:bg-slate-900/70 text-slate-500 dark:text-slate-400">
                <tr>
                  <th className="text-left font-semibold px-3 py-2.5">Production Role</th>
                  <th className="text-left font-semibold px-3 py-2.5">Area / Line</th>
                  <th className="text-left font-semibold px-3 py-2.5 w-48">Skills</th>
                  <th className="text-left font-semibold px-3 py-2.5">Risk Level</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {roleRisk.map((entry) => {
                  const details = roleSkillDetails[entry.role.name];
                  const technical = details?.technical ?? [];
                  const behavioural = details?.behavioural ?? [];
                  return (
                    <tr
                      key={entry.role.id}
                      onClick={() => setRoleSkillsModal({ name: entry.role.name, team: getTeamName(entry.role.teamId) })}
                      className="hover:bg-slate-50/70 dark:hover:bg-slate-900/40 transition-colors cursor-pointer"
                    >
                      <td className="px-3 py-2.5 align-top">
                        <div className="flex flex-col">
                          <span className="text-[12px] font-medium text-slate-900 dark:text-slate-50">
                            {entry.role.name}
                          </span>
                          <span className="text-[11px] text-slate-400">
                            {entry.role.level}
                          </span>
                        </div>
                      </td>
                      <td className="px-3 py-2.5 align-top">
                        <span className="text-[12px] text-slate-800 dark:text-slate-100">
                          {getTeamName(entry.role.teamId)}
                        </span>
                        <div className="text-[11px] text-slate-400">
                          {entry.incumbents.length === 0
                            ? 'Vacancy'
                            : `${entry.incumbents.length} active`}
                        </div>
                      </td>
                      <td className="px-3 py-2.5 align-top max-w-[12rem]">
                        <RoleSkillPreview technical={technical} behavioural={behavioural} />
                      </td>
                      <td className="px-3 py-2.5 align-top">
                        <div className="flex flex-col gap-1 items-start">
                          <span
                            className={`px-2 py-0.5 rounded-full border text-[11px] ${riskBadgeColor[entry.overallRisk]}`}
                          >
                            {entry.overallRisk} risk
                          </span>
                          {entry.gaps.length > 0 && (
                            <span className="text-[11px] text-rose-500 dark:text-rose-300">
                              {entry.gaps.length} skills missing coverage
                            </span>
                          )}
                          {entry.singlePoints.length > 0 && (
                            <span className="text-[11px] text-amber-500 dark:text-amber-200">
                              {entry.singlePoints.length} single-operator skills
                            </span>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div className="mt-3 pt-3 border-t border-slate-100 dark:border-slate-800 text-[11px] text-slate-400 dark:text-slate-500 flex flex-wrap items-center gap-2">
            <span>
              Use this to spot roles that are one resignation away from stopping production.
            </span>
          </div>
        </div>
      ),
    },
    singlePoints: {
      label: 'Single Points of Failure',
      render: () => (
        <div className="bg-white dark:bg-card-dark rounded-2xl border border-slate-200 dark:border-slate-700/80 shadow-sm p-5 flex flex-col h-full">
          <div className="flex items-center justify-between mb-3">
            <div>
              <div className="text-xs font-semibold uppercase tracking-wide text-slate-400 mb-0.5">
                Single Points of Failure
              </div>
              <div className="text-sm font-semibold text-slate-900 dark:text-slate-50">
                Skills with only 1 operator
              </div>
            </div>
            <span className="inline-flex items-center justify-center w-8 h-8 rounded-xl bg-[#eb2d7c]/10 text-[#eb2d7c] dark:bg-[#eb2d7c]/20 dark:text-[#ff6ba3]">
              <span className="material-icons-round text-[18px]">person_off</span>
            </span>
          </div>

          <div className="text-[11px] text-slate-500 dark:text-slate-400 mb-3">
            If these employees are absent, production capacity drops immediately.
          </div>

          <div className="space-y-2 overflow-y-auto pr-1">
            {singlePointSkills.slice(0, 8).map(({ skill, holdersCount }) => {
              if (holdersCount !== 1) return null;
              const holder = employees.find((e) =>
                e.skills.some((s) => s.skillId === skill.id && s.level >= 3 && !s.planned),
              );
              if (!holder) return null;

              const backupCandidate = findBackupCandidate(skill.id);

              return (
                <div
                  key={skill.id}
                  className="rounded-xl border border-[#eb2d7c]/20 dark:border-[#eb2d7c]/40 bg-[#eb2d7c]/5 dark:bg-[#eb2d7c]/10 px-3 py-2.5 flex flex-col gap-1.5"
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex flex-col">
                      <span className="text-[12px] font-semibold text-[#eb2d7c] dark:text-[#ff6ba3]">
                        {skill.name}
                      </span>
                      <span className="text-[11px] text-[#eb2d7c]/80 dark:text-[#ff6ba3]/80">
                        {skill.category} Â· {skill.criticality}
                      </span>
                    </div>
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-white/60 dark:bg-[#eb2d7c]/40 text-[#eb2d7c] dark:text-[#ff6ba3] border border-[#eb2d7c]/70 dark:border-[#eb2d7c]/60">
                      Single Holder
                    </span>
                  </div>
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex flex-col">
                      <span className="text-[11px] text-[#eb2d7c] dark:text-[#ff6ba3] font-medium">
                        {holder.name}
                      </span>
                      <span className="text-[11px] text-[#eb2d7c]/80 dark:text-[#ff6ba3]/80">
                        {holder.title} Â· {getTeamName(holder.teamId)}
                      </span>
                    </div>
                    {backupCandidate && (
                      <button
                        type="button"
                        onClick={() => handlePlanSkillForEmployee(backupCandidate.id, skill.id)}
                        className="ml-2 inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-[#eb2d7c] text-white text-[10px] hover:bg-[#d1246a] transition-colors"
                      >
                        <span className="material-icons-round text-[12px]">person_add</span>
                        Train backup: {backupCandidate.name}
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
            {singlePointSkills.length === 0 && (
              <div className="text-[11px] text-slate-500 dark:text-slate-400">
                No single points of failure detected for critical skills in this snapshot.
              </div>
            )}
          </div>

          <div className="mt-3 pt-3 border-t border-[#eb2d7c]/20 dark:border-[#eb2d7c]/40 text-[11px] text-[#eb2d7c] dark:text-[#ff6ba3]">
            Immediate Action: Schedule cross-training for these skills.
          </div>
        </div>
      ),
    },
  };

  // --- Org Builder: selection + CRUD -----------------------------------------

  type OrgNodeType = 'department' | 'team' | 'role' | 'employee';
  type OrgSelection = { type: OrgNodeType; id: string } | null;

  const [orgSelection, setOrgSelection] = useState<OrgSelection>(null);
  const [expandedDepartments, setExpandedDepartments] = useState<Record<string, boolean>>({});
  const [expandedTeams, setExpandedTeams] = useState<Record<string, boolean>>({});

  useEffect(() => {
    if (!orgSelection && departments[0]) {
      setOrgSelection({ type: 'department', id: departments[0].id });
    }
  }, [orgSelection, departments]);

  useEffect(() => {
    setExpandedDepartments((prev) => {
      const next = { ...prev };
      departments.forEach((d) => {
        if (next[d.id] === undefined) next[d.id] = true;
      });
      return next;
    });
  }, [departments]);

  const departmentById = useMemo(
    () => Object.fromEntries(departments.map((d) => [d.id, d])),
    [departments],
  );
  const teamById = useMemo(() => Object.fromEntries(teams.map((t) => [t.id, t])), [teams]);
  const roleById = useMemo(() => Object.fromEntries(roles.map((r) => [r.id, r])), [roles]);

  const teamsByDepartmentId = useMemo(() => {
    const map: Record<string, Team[]> = {};
    teams.forEach((t) => {
      map[t.departmentId] = map[t.departmentId] ?? [];
      map[t.departmentId].push(t);
    });
    Object.values(map).forEach((arr) => arr.sort((a, b) => a.name.localeCompare(b.name)));
    return map;
  }, [teams]);

  const rolesByTeamId = useMemo(() => {
    const map: Record<string, RoleV2[]> = {};
    roles.forEach((r) => {
      map[r.teamId] = map[r.teamId] ?? [];
      map[r.teamId].push(r);
    });
    Object.values(map).forEach((arr) => arr.sort((a, b) => a.name.localeCompare(b.name)));
    return map;
  }, [roles]);

  const employeesByTeamId = useMemo(() => {
    const map: Record<string, EmployeeV2[]> = {};
    employees.forEach((e) => {
      map[e.teamId] = map[e.teamId] ?? [];
      map[e.teamId].push(e);
    });
    Object.values(map).forEach((arr) => arr.sort((a, b) => a.name.localeCompare(b.name)));
    return map;
  }, [employees]);

  const switchMode = (mode: 'control' | 'org' | 'gaps' | 'expert') => {
    if (mode !== 'control') setSkillsCanvasOpen(false);
    const params = new URLSearchParams(searchParams?.toString() ?? '');
    params.set('view', mode);
    router.push(`${pathname ?? '/dashboard/portal'}?${params.toString()}`);
  };

  const upsertDepartment = (departmentId: string, patch: Partial<Department>) => {
    setOrg((prev) => ({
      ...prev,
      departments: prev.departments.map((d) => (d.id === departmentId ? { ...d, ...patch } : d)),
    }));
  };

  const upsertTeam = (teamId: string, patch: Partial<Team>) => {
    setOrg((prev) => ({
      ...prev,
      teams: prev.teams.map((t) => (t.id === teamId ? { ...t, ...patch } : t)),
    }));
  };

  const upsertRole = (roleId: string, patch: Partial<RoleV2>) => {
    setOrg((prev) => ({
      ...prev,
      roles: prev.roles.map((r) => (r.id === roleId ? { ...r, ...patch } : r)),
      employees: prev.employees.map((e) =>
        patch.teamId && e.roleId === roleId ? { ...e, teamId: patch.teamId } : e,
      ),
    }));
  };

  const upsertEmployee = (employeeId: string, patch: Partial<EmployeeV2>) => {
    setOrg((prev) => ({
      ...prev,
      employees: prev.employees.map((e) => (e.id === employeeId ? { ...e, ...patch } : e)),
    }));
  };

  const addDepartment = () => {
    const id = `d_${Date.now()}`;
    const dept: Department = { id, name: 'New Department', requiredSkills: [] };
    setOrg((prev) => ({ ...prev, departments: [...prev.departments, dept] }));
    setExpandedDepartments((prev) => ({ ...prev, [id]: true }));
    setOrgSelection({ type: 'department', id });
  };

  const addTeam = (departmentId: string) => {
    const id = `t_${Date.now()}`;
    const team: Team = { id, departmentId, name: 'New Team', requiredSkills: [] };
    setOrg((prev) => ({ ...prev, teams: [...prev.teams, team] }));
    setOrgSelection({ type: 'team', id });
  };

  const addRole = (teamId: string) => {
    const id = `custom-${Date.now()}`;
    const role: RoleV2 = { id, name: 'New Role', teamId, level: 'Operator', requirements: [] };
    setOrg((prev) => ({ ...prev, roles: [...prev.roles, role] }));
    setOrgSelection({ type: 'role', id });
  };

  const addEmployee = (teamId: string) => {
    const id = `e_${Date.now()}`;
    const emp: EmployeeV2 = {
      id,
      name: 'New Employee',
      title: 'Operator',
      teamId,
      location: 'Shop Floor',
      skills: [],
      allocation: 100,
      workload: inferWorkloadFromAllocation(100),
    };
    setOrg((prev) => ({ ...prev, employees: [...prev.employees, emp] }));
    setOrgSelection({ type: 'employee', id });
  };

  const deleteDepartment = (departmentId: string) => {
    const childTeams = teams.filter((t) => t.departmentId === departmentId);
    if (childTeams.length > 0) return;
    setOrg((prev) => ({ ...prev, departments: prev.departments.filter((d) => d.id !== departmentId) }));
    setOrgSelection(null);
  };

  const deleteTeam = (teamId: string) => {
    const hasEmployees = (employeesByTeamId[teamId] ?? []).length > 0;
    const hasRoles = (rolesByTeamId[teamId] ?? []).length > 0;
    if (hasEmployees || hasRoles) return;
    setOrg((prev) => ({ ...prev, teams: prev.teams.filter((t) => t.id !== teamId) }));
    setOrgSelection(null);
  };

  const deleteRole = (roleId: string) => {
    const incumbents = employees.filter((e) => e.roleId === roleId);
    if (incumbents.length > 0) return;
    setOrg((prev) => ({
      ...prev,
      roles: prev.roles.filter((r) => r.id !== roleId),
    }));
    setOrgSelection(null);
  };

  const deleteEmployee = (employeeId: string) => {
    setOrg((prev) => ({ ...prev, employees: prev.employees.filter((e) => e.id !== employeeId) }));
    setOrgSelection(null);
  };

  const selectedDepartment = orgSelection?.type === 'department' ? departmentById[orgSelection.id] : undefined;
  const selectedTeam = orgSelection?.type === 'team' ? teamById[orgSelection.id] : undefined;
  const selectedRole = orgSelection?.type === 'role' ? roleById[orgSelection.id] : undefined;
  const selectedEmployee = orgSelection?.type === 'employee' ? employees.find((e) => e.id === orgSelection.id) : undefined;

  const getEmployeesInTeam = useCallback(
    (teamId: string) => employees.filter((e) => e.teamId === teamId),
    [employees],
  );
  const getEmployeesInDepartment = useCallback(
    (departmentId: string) => {
      const teamIds = new Set((teamsByDepartmentId[departmentId] ?? []).map((t) => t.id));
      return employees.filter((e) => teamIds.has(e.teamId));
    },
    [employees, teamsByDepartmentId],
  );

  const computeCoverageForScope = (scopeEmployees: EmployeeV2[], requirements: Requirement[]) => {
    return requirements.map((req) => {
      const availableHolders = scopeEmployees.filter((e) =>
        e.skills.some((s) => s.skillId === req.skillId && s.level >= req.minLevel && !s.planned),
      ).length;
      const plannedHolders = scopeEmployees.filter((e) =>
        e.skills.some((s) => s.skillId === req.skillId && s.level >= req.minLevel && !!s.planned),
      ).length;
      const gapNow = Math.max(0, req.targetHolders - availableHolders);
      const gapFuture = Math.max(0, req.targetHolders - (availableHolders + plannedHolders));
      const risk =
        req.importance === 3 && gapNow > 0
          ? ('High' as const)
          : req.importance === 3 && gapNow === 0 && availableHolders === 1
          ? ('Medium' as const)
          : ('Low' as const);
      return { requirement: req, availableHolders, plannedHolders, gapNow, gapFuture, risk };
    });
  };

  const recommendActions = useCallback((
    requirement: Requirement,
    scopeEmployees: EmployeeV2[],
  ): { type: 'Train' | 'Internal move' | 'Hire'; message: string }[] => {
    const actions: { type: 'Train' | 'Internal move' | 'Hire'; message: string }[] = [];

    if (requirement.minLevel > 1) {
      const trainables = scopeEmployees.filter((e) =>
        e.skills.some(
          (s) => s.skillId === requirement.skillId && s.level === (requirement.minLevel - 1) && !s.planned,
        ),
      );
      if (trainables.length > 0) {
        actions.push({
          type: 'Train',
          message: `Train ${trainables
            .slice(0, 3)
            .map((t) => t.name)
            .join(', ')} to reach level ${requirement.minLevel}.`,
        });
      }
    }

    const holdersByTeam: Record<string, EmployeeV2[]> = {};
    employees.forEach((e) => {
      const hasSkill = e.skills.some(
        (s) => s.skillId === requirement.skillId && s.level >= requirement.minLevel && !s.planned,
      );
      if (!hasSkill) return;
      holdersByTeam[e.teamId] = holdersByTeam[e.teamId] ?? [];
      holdersByTeam[e.teamId].push(e);
    });
    const surplusTeam = Object.entries(holdersByTeam).find(([, holders]) => holders.length > requirement.targetHolders);
    if (surplusTeam) {
      const [teamId, holders] = surplusTeam;
      const candidate = holders.find((h) => h.workload !== 'Overloaded') ?? holders[0];
      if (candidate) {
        actions.push({
          type: 'Internal move',
          message: `Consider moving ${candidate.name} from ${getTeamName(teamId)} (surplus coverage).`,
        });
      }
    }

    if (actions.length === 0) {
      const skillName = getSkillById(requirement.skillId)?.name ?? requirement.skillId;
      actions.push({ type: 'Hire', message: `Hire externally for ${skillName} (min level ${requirement.minLevel}).` });
    }

    return actions;
  }, [employees, getTeamName]);

  const RequirementsEditor: React.FC<{
    requirements?: Requirement[];
    onChange: (next: Requirement[]) => void;
  }> = ({ requirements, onChange }) => {
    const list = requirements ?? [];
    const used = new Set(list.map((r) => r.skillId));
    const [q, setQ] = useState('');
    const filtered = SKILLS.filter(
      (s) =>
        !used.has(s.id) &&
        (q.trim() === '' ||
          s.name.toLowerCase().includes(q.trim().toLowerCase()) ||
          s.category.toLowerCase().includes(q.trim().toLowerCase())),
    ).slice(0, 12);

    return (
      <div className="space-y-3">
        <div className="flex items-center justify-between gap-2">
          <div className="text-xs font-semibold uppercase tracking-wide text-slate-400">Requirements</div>
        </div>
        <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 overflow-hidden">
          <div className="p-3 border-b border-slate-200 dark:border-slate-700">
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search skills to add..."
              className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-400"
            />
            {filtered.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-2">
                {filtered.map((s) => (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() =>
                      onChange([
                        ...list,
                        { skillId: s.id, importance: 3, minLevel: 3, targetHolders: 1 },
                      ])
                    }
                    className="inline-flex items-center gap-2 px-2.5 py-1.5 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
                  >
                    <span className="material-icons-round text-[16px]">add</span>
                    {s.name}
                    <span className="text-[10px] text-slate-400">{s.category}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
          <div className="divide-y divide-slate-100 dark:divide-slate-800">
            {list.length === 0 ? (
              <div className="p-3 text-sm text-slate-500 dark:text-slate-400">No requirements yet.</div>
            ) : (
              list.map((req) => {
                const skill = getSkillById(req.skillId);
                return (
                  <div key={req.skillId} className="p-3 grid grid-cols-1 md:grid-cols-12 gap-2 items-center">
                    <div className="md:col-span-5">
                      <div className="text-sm font-medium text-slate-900 dark:text-slate-50">
                        {skill?.name ?? req.skillId}
                      </div>
                      <div className="text-[11px] text-slate-400">{skill?.category ?? 'â€”'}</div>
                    </div>
                    <div className="md:col-span-2">
                      <label className="block text-[10px] font-semibold text-slate-400 mb-1">Importance</label>
                      <select
                        value={req.importance}
                        onChange={(e) =>
                          onChange(
                            list.map((r) =>
                              r.skillId === req.skillId
                                ? { ...r, importance: Number(e.target.value) as 1 | 2 | 3 }
                                : r,
                            ),
                          )
                        }
                        className="w-full px-2 py-1 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-xs"
                      >
                        <option value={1}>1</option>
                        <option value={2}>2</option>
                        <option value={3}>3</option>
                      </select>
                    </div>
                    <div className="md:col-span-2">
                      <label className="block text-[10px] font-semibold text-slate-400 mb-1">Min level</label>
                      <select
                        value={req.minLevel}
                        onChange={(e) =>
                          onChange(
                            list.map((r) =>
                              r.skillId === req.skillId
                                ? { ...r, minLevel: Number(e.target.value) as SkillLevel }
                                : r,
                            ),
                          )
                        }
                        className="w-full px-2 py-1 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-xs"
                      >
                        {[1, 2, 3, 4, 5].map((n) => (
                          <option key={n} value={n}>
                            {n}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="md:col-span-2">
                      <label className="block text-[10px] font-semibold text-slate-400 mb-1">Target</label>
                      <input
                        type="number"
                        min={1}
                        value={req.targetHolders}
                        onChange={(e) =>
                          onChange(
                            list.map((r) =>
                              r.skillId === req.skillId
                                ? { ...r, targetHolders: Math.max(1, Number(e.target.value) || 1) }
                                : r,
                            ),
                          )
                        }
                        className="w-full px-2 py-1 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-xs"
                      />
                    </div>
                    <div className="md:col-span-1 flex md:justify-end">
                      <button
                        type="button"
                        onClick={() => onChange(list.filter((r) => r.skillId !== req.skillId))}
                        className="inline-flex items-center justify-center w-9 h-9 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-500 hover:text-rose-600 hover:bg-rose-500/10 transition-colors"
                        aria-label="Remove requirement"
                      >
                        <span className="material-icons-round text-[18px]">delete</span>
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>
    );
  };

  const EmployeeSkillsEditor: React.FC<{ employee: EmployeeV2 }> = ({ employee }) => {
    const skills = employee.skills ?? [];
    const used = new Set(skills.map((s) => s.skillId));
    const [q, setQ] = useState('');
    const filtered = SKILLS.filter(
      (s) =>
        !used.has(s.id) &&
        (q.trim() === '' ||
          s.name.toLowerCase().includes(q.trim().toLowerCase()) ||
          s.category.toLowerCase().includes(q.trim().toLowerCase())),
    ).slice(0, 12);

    return (
      <div className="space-y-3">
        <div className="text-xs font-semibold uppercase tracking-wide text-slate-400">Employee skills</div>
        <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 overflow-hidden">
          <div className="p-3 border-b border-slate-200 dark:border-slate-700">
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search skills to add..."
              className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-400"
            />
            {filtered.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-2">
                {filtered.map((s) => (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() =>
                      upsertEmployee(employee.id, {
                        skills: [...skills, { skillId: s.id, level: 3, source: 'self' }],
                      })
                    }
                    className="inline-flex items-center gap-2 px-2.5 py-1.5 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
                  >
                    <span className="material-icons-round text-[16px]">add</span>
                    {s.name}
                    <span className="text-[10px] text-slate-400">{s.category}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
          <div className="divide-y divide-slate-100 dark:divide-slate-800">
            {skills.length === 0 ? (
              <div className="p-3 text-sm text-slate-500 dark:text-slate-400">No skills yet.</div>
            ) : (
              skills.map((es) => {
                const skill = getSkillById(es.skillId);
                return (
                  <div key={es.skillId} className="p-3 grid grid-cols-1 md:grid-cols-12 gap-2 items-center">
                    <div className="md:col-span-5">
                      <div className="text-sm font-medium text-slate-900 dark:text-slate-50">
                        {skill?.name ?? es.skillId}
                      </div>
                      <div className="text-[11px] text-slate-400">{skill?.category ?? 'â€”'}</div>
                    </div>
                    <div className="md:col-span-2">
                      <label className="block text-[10px] font-semibold text-slate-400 mb-1">Level</label>
                      <select
                        value={es.level}
                        onChange={(e) =>
                          upsertEmployee(employee.id, {
                            skills: skills.map((s) =>
                              s.skillId === es.skillId ? { ...s, level: Number(e.target.value) as SkillLevel } : s,
                            ),
                          })
                        }
                        className="w-full px-2 py-1 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-xs"
                      >
                        {[1, 2, 3, 4, 5].map((n) => (
                          <option key={n} value={n}>
                            {n}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="md:col-span-2">
                      <label className="block text-[10px] font-semibold text-slate-400 mb-1">Source</label>
                      <select
                        value={es.source ?? 'self'}
                        onChange={(e) =>
                          upsertEmployee(employee.id, {
                            skills: skills.map((s) =>
                              s.skillId === es.skillId ? { ...s, source: e.target.value as SkillSource } : s,
                            ),
                          })
                        }
                        className="w-full px-2 py-1 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-xs"
                      >
                        <option value="verified">verified</option>
                        <option value="self">self</option>
                        <option value="inferred">inferred</option>
                        <option value="planned">planned</option>
                      </select>
                    </div>
                    <div className="md:col-span-2">
                      <label className="block text-[10px] font-semibold text-slate-400 mb-1">Planned</label>
                      <select
                        value={es.planned ? 'yes' : 'no'}
                        onChange={(e) =>
                          upsertEmployee(employee.id, {
                            skills: skills.map((s) =>
                              s.skillId === es.skillId ? { ...s, planned: e.target.value === 'yes' } : s,
                            ),
                          })
                        }
                        className="w-full px-2 py-1 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-xs"
                      >
                        <option value="no">No</option>
                        <option value="yes">Yes</option>
                      </select>
                    </div>
                    <div className="md:col-span-1 flex md:justify-end">
                      <button
                        type="button"
                        onClick={() =>
                          upsertEmployee(employee.id, { skills: skills.filter((s) => s.skillId !== es.skillId) })
                        }
                        className="inline-flex items-center justify-center w-9 h-9 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-500 hover:text-rose-600 hover:bg-rose-500/10 transition-colors"
                        aria-label="Remove skill"
                      >
                        <span className="material-icons-round text-[18px]">delete</span>
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>
    );
  };

  // --- Requirements & Gaps view ----------------------------------------------

  type GapScope =
    | { kind: 'department'; id: string }
    | { kind: 'team'; id: string }
    | { kind: 'role'; id: string };

  const [gapScope, setGapScope] = useState<GapScope>(() => ({
    kind: 'department',
    id: departments[0]?.id ?? '',
  }));

  useEffect(() => {
    if (gapScope.id) return;
    if (departments[0]) setGapScope({ kind: 'department', id: departments[0].id });
  }, [gapScope.id, departments]);

  const gapScopeLabel = useMemo(() => {
    if (gapScope.kind === 'department') return departmentById[gapScope.id]?.name ?? 'Department';
    if (gapScope.kind === 'team') return teamById[gapScope.id]?.name ?? 'Team';
    return roleById[gapScope.id]?.name ?? 'Role';
  }, [gapScope, departmentById, teamById, roleById]);

  const gapRequirements = useMemo(() => {
    if (gapScope.kind === 'department') return departmentById[gapScope.id]?.requiredSkills ?? [];
    if (gapScope.kind === 'team') return teamById[gapScope.id]?.requiredSkills ?? [];
    return roleById[gapScope.id]?.requirements ?? [];
  }, [gapScope, departmentById, teamById, roleById]);

  const gapScopeEmployees = useMemo(() => {
    if (gapScope.kind === 'department') return getEmployeesInDepartment(gapScope.id);
    if (gapScope.kind === 'team') return getEmployeesInTeam(gapScope.id);
    return employees.filter((e) => e.roleId === gapScope.id);
  }, [gapScope, employees, getEmployeesInDepartment, getEmployeesInTeam]);

  const gapCoverage = useMemo(
    () => computeCoverageForScope(gapScopeEmployees, gapRequirements),
    [gapScopeEmployees, gapRequirements],
  );

  const gapRecommendations = useMemo(() => {
    const recs: { key: string; severity: 'High' | 'Medium' | 'Low'; lines: string[] }[] = [];
    gapCoverage.forEach((row) => {
      if (row.gapFuture <= 0 && row.risk === 'Low') return;
      const skillName = getSkillById(row.requirement.skillId)?.name ?? row.requirement.skillId;
      const actions = recommendActions(row.requirement, gapScopeEmployees);
      recs.push({
        key: row.requirement.skillId,
        severity: row.risk,
        lines: [`${skillName}: ${actions.map((a) => a.message).join(' ')}`],
      });
    });
    return recs;
  }, [gapCoverage, gapScopeEmployees, recommendActions]);

  const renderOrgBuilder = () => (
    <div className="min-h-full w-full p-8 animate-in fade-in duration-500">
      <div className="flex items-center justify-end gap-4 mb-6 flex-wrap">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => {
              resetProposedChanges();
              setOrgSelection(null);
            }}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
          >
            <span className="material-icons-round text-[16px]">restart_alt</span>
            Reset demo data
          </button>
          <button
            type="button"
            onClick={addDepartment}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900 text-xs font-semibold hover:bg-slate-800 dark:hover:bg-slate-200 transition-colors"
          >
            <span className="material-icons-round text-[16px]">add</span>
            Department
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1 bg-white dark:bg-card-dark rounded-2xl border border-slate-200 dark:border-slate-700/80 shadow-sm overflow-hidden">
          <div className="p-4 border-b border-slate-200 dark:border-slate-700">
            <div className="text-xs font-semibold uppercase tracking-wide text-slate-400">Hierarchy</div>
            <div className="text-sm font-semibold text-slate-900 dark:text-slate-50 mt-1">Departments â†’ Teams â†’ Roles â†’ Employees</div>
          </div>
          <div className="p-2">
            {departments.map((dept) => {
              const deptOpen = expandedDepartments[dept.id] ?? true;
              const deptTeams = teamsByDepartmentId[dept.id] ?? [];
              return (
                <div key={dept.id} className="mb-2">
                  <div className={`rounded-xl px-2 py-2 flex items-center justify-between gap-2 ${orgSelection?.type === 'department' && orgSelection.id === dept.id ? 'bg-primary/10' : 'hover:bg-slate-50 dark:hover:bg-slate-900/40'}`}>
                    <button
                      type="button"
                      onClick={() => setExpandedDepartments((prev) => ({ ...prev, [dept.id]: !deptOpen }))}
                      className="inline-flex items-center justify-center w-8 h-8 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300"
                      aria-label={deptOpen ? 'Collapse department' : 'Expand department'}
                    >
                      <span className="material-icons-round text-[18px]">{deptOpen ? 'expand_more' : 'chevron_right'}</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setOrgSelection({ type: 'department', id: dept.id })}
                      className="flex-1 text-left min-w-0"
                    >
                      <div className="text-sm font-semibold text-slate-900 dark:text-slate-50 truncate">{dept.name}</div>
                      <div className="text-[11px] text-slate-400 truncate">{deptTeams.length} team{deptTeams.length === 1 ? '' : 's'}</div>
                    </button>
                    <button
                      type="button"
                      onClick={() => addTeam(dept.id)}
                      className="inline-flex items-center justify-center w-8 h-8 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300"
                      aria-label="Add team"
                    >
                      <span className="material-icons-round text-[18px]">add</span>
                    </button>
                  </div>

                  {deptOpen && (
                    <div className="pl-8 mt-1 space-y-1">
                      {deptTeams.map((team) => {
                        const teamOpen = expandedTeams[team.id] ?? false;
                        const teamRoles = rolesByTeamId[team.id] ?? [];
                        const teamEmployees = employeesByTeamId[team.id] ?? [];
                        return (
                          <div key={team.id} className="rounded-xl">
                            <div className={`rounded-xl px-2 py-2 flex items-center justify-between gap-2 ${orgSelection?.type === 'team' && orgSelection.id === team.id ? 'bg-primary/10' : 'hover:bg-slate-50 dark:hover:bg-slate-900/40'}`}>
                              <button
                                type="button"
                                onClick={() => setExpandedTeams((prev) => ({ ...prev, [team.id]: !teamOpen }))}
                                className="inline-flex items-center justify-center w-8 h-8 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300"
                              >
                                <span className="material-icons-round text-[18px]">{teamOpen ? 'expand_more' : 'chevron_right'}</span>
                              </button>
                              <button
                                type="button"
                                onClick={() => setOrgSelection({ type: 'team', id: team.id })}
                                className="flex-1 text-left min-w-0"
                              >
                                <div className="text-sm font-medium text-slate-900 dark:text-slate-50 truncate">{team.name}</div>
                                <div className="text-[11px] text-slate-400 truncate">{teamRoles.length} roles Â· {teamEmployees.length} employees</div>
                              </button>
                              <div className="flex items-center gap-1">
                                <button
                                  type="button"
                                  onClick={() => addRole(team.id)}
                                  className="inline-flex items-center justify-center w-8 h-8 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300"
                                  aria-label="Add role"
                                >
                                  <span className="material-icons-round text-[18px]">badge</span>
                                </button>
                                <button
                                  type="button"
                                  onClick={() => addEmployee(team.id)}
                                  className="inline-flex items-center justify-center w-8 h-8 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300"
                                  aria-label="Add employee"
                                >
                                  <span className="material-icons-round text-[18px]">person_add</span>
                                </button>
                              </div>
                            </div>

                            {teamOpen && (
                              <div className="pl-8 mt-1 space-y-1">
                                <div className="text-[10px] font-semibold uppercase tracking-wide text-slate-400 px-2 mt-2">
                                  Roles
                                </div>
                                {teamRoles.map((r) => (
                                  <button
                                    key={r.id}
                                    type="button"
                                    onClick={() => setOrgSelection({ type: 'role', id: r.id })}
                                    className={`w-full text-left px-2 py-1.5 rounded-lg text-sm ${
                                      orgSelection?.type === 'role' && orgSelection.id === r.id
                                        ? 'bg-primary/10 text-slate-900 dark:text-slate-50'
                                        : 'hover:bg-slate-50 dark:hover:bg-slate-900/40 text-slate-700 dark:text-slate-200'
                                    }`}
                                  >
                                    {r.name}
                                    <span className="ml-2 text-[11px] text-slate-400">{r.level}</span>
                                  </button>
                                ))}
                                {teamRoles.length === 0 && (
                                  <div className="px-2 py-1.5 text-[11px] text-slate-400">No roles yet.</div>
                                )}

                                <div className="text-[10px] font-semibold uppercase tracking-wide text-slate-400 px-2 mt-3">
                                  Employees
                                </div>
                                {teamEmployees.map((e) => (
                                  <button
                                    key={e.id}
                                    type="button"
                                    onClick={() => setOrgSelection({ type: 'employee', id: e.id })}
                                    className={`w-full text-left px-2 py-1.5 rounded-lg text-sm ${
                                      orgSelection?.type === 'employee' && orgSelection.id === e.id
                                        ? 'bg-primary/10 text-slate-900 dark:text-slate-50'
                                        : 'hover:bg-slate-50 dark:hover:bg-slate-900/40 text-slate-700 dark:text-slate-200'
                                    }`}
                                  >
                                    {e.name}
                                    <span className="ml-2 text-[11px] text-slate-400">{e.title}</span>
                                  </button>
                                ))}
                                {teamEmployees.length === 0 && (
                                  <div className="px-2 py-1.5 text-[11px] text-slate-400">No employees yet.</div>
                                )}
                              </div>
                            )}
                          </div>
                        );
                      })}
                      {deptTeams.length === 0 && (
                        <div className="px-2 py-1.5 text-[11px] text-slate-400">No teams yet.</div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
            {departments.length === 0 && (
              <div className="p-4 text-sm text-slate-500 dark:text-slate-400">No departments yet.</div>
            )}
          </div>
        </div>

        <div className="lg:col-span-2 bg-white dark:bg-card-dark rounded-2xl border border-slate-200 dark:border-slate-700/80 shadow-sm p-5">
          {!orgSelection && (
            <div className="text-sm text-slate-500 dark:text-slate-400">
              Select a node on the left to edit details.
            </div>
          )}

          {selectedDepartment && (
            <div className="space-y-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="text-xs font-semibold uppercase tracking-wide text-slate-400">Department</div>
                  <div className="text-lg font-semibold text-slate-900 dark:text-slate-50 mt-1">{selectedDepartment.name}</div>
                </div>
                <button
                  type="button"
                  onClick={() => deleteDepartment(selectedDepartment.id)}
                  className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-200 disabled:opacity-50"
                  disabled={(teamsByDepartmentId[selectedDepartment.id] ?? []).length > 0}
                  title={(teamsByDepartmentId[selectedDepartment.id] ?? []).length > 0 ? 'Delete or move teams first' : 'Delete department'}
                >
                  <span className="material-icons-round text-[16px]">delete</span>
                  Delete
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1">Name</label>
                  <input
                    value={selectedDepartment.name}
                    onChange={(e) => upsertDepartment(selectedDepartment.id, { name: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1">Description</label>
                  <input
                    value={selectedDepartment.description ?? ''}
                    onChange={(e) => upsertDepartment(selectedDepartment.id, { description: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-sm"
                  />
                </div>
              </div>

              <RequirementsEditor
                requirements={selectedDepartment.requiredSkills}
                onChange={(next) => upsertDepartment(selectedDepartment.id, { requiredSkills: next })}
              />
            </div>
          )}

          {selectedTeam && (
            <div className="space-y-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="text-xs font-semibold uppercase tracking-wide text-slate-400">Team</div>
                  <div className="text-lg font-semibold text-slate-900 dark:text-slate-50 mt-1">{selectedTeam.name}</div>
                </div>
                <button
                  type="button"
                  onClick={() => deleteTeam(selectedTeam.id)}
                  className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-200 disabled:opacity-50"
                  disabled={(employeesByTeamId[selectedTeam.id] ?? []).length > 0 || (rolesByTeamId[selectedTeam.id] ?? []).length > 0}
                  title={(employeesByTeamId[selectedTeam.id] ?? []).length > 0 || (rolesByTeamId[selectedTeam.id] ?? []).length > 0 ? 'Delete roles/employees first' : 'Delete team'}
                >
                  <span className="material-icons-round text-[16px]">delete</span>
                  Delete
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1">Name</label>
                  <input
                    value={selectedTeam.name}
                    onChange={(e) => upsertTeam(selectedTeam.id, { name: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1">Department</label>
                  <select
                    value={selectedTeam.departmentId}
                    onChange={(e) => upsertTeam(selectedTeam.id, { departmentId: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-sm"
                  >
                    {departments.map((d) => (
                      <option key={d.id} value={d.id}>
                        {d.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <RequirementsEditor
                requirements={selectedTeam.requiredSkills}
                onChange={(next) => upsertTeam(selectedTeam.id, { requiredSkills: next })}
              />
            </div>
          )}

          {selectedRole && (
            <div className="space-y-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="text-xs font-semibold uppercase tracking-wide text-slate-400">Role</div>
                  <div className="text-lg font-semibold text-slate-900 dark:text-slate-50 mt-1">{selectedRole.name}</div>
                </div>
                <button
                  type="button"
                  onClick={() => deleteRole(selectedRole.id)}
                  className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-200 disabled:opacity-50"
                  disabled={employees.some((e) => e.roleId === selectedRole.id)}
                  title={employees.some((e) => e.roleId === selectedRole.id) ? 'Unassign employees first' : 'Delete role'}
                >
                  <span className="material-icons-round text-[16px]">delete</span>
                  Delete
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1">Name</label>
                  <input
                    value={selectedRole.name}
                    onChange={(e) => upsertRole(selectedRole.id, { name: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1">Level</label>
                  <select
                    value={selectedRole.level}
                    onChange={(e) => upsertRole(selectedRole.id, { level: e.target.value as RoleV2['level'] })}
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-sm"
                  >
                    <option value="Operator">Operator</option>
                    <option value="Lead">Lead</option>
                    <option value="Supervisor">Supervisor</option>
                    <option value="Technician">Technician</option>
                  </select>
                </div>
                <div className="md:col-span-2">
                  <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1">Team</label>
                  <select
                    value={selectedRole.teamId}
                    onChange={(e) => upsertRole(selectedRole.id, { teamId: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-sm"
                  >
                    {teams.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <RequirementsEditor
                requirements={selectedRole.requirements}
                onChange={(next) => upsertRole(selectedRole.id, { requirements: next })}
              />
            </div>
          )}

          {selectedEmployee && (
            <div className="space-y-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="text-xs font-semibold uppercase tracking-wide text-slate-400">Employee</div>
                  <div className="text-lg font-semibold text-slate-900 dark:text-slate-50 mt-1">{selectedEmployee.name}</div>
                </div>
                <button
                  type="button"
                  onClick={() => deleteEmployee(selectedEmployee.id)}
                  className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-200"
                >
                  <span className="material-icons-round text-[16px]">delete</span>
                  Delete
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1">Name</label>
                  <input
                    value={selectedEmployee.name}
                    onChange={(e) => upsertEmployee(selectedEmployee.id, { name: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1">Title</label>
                  <input
                    value={selectedEmployee.title}
                    onChange={(e) => upsertEmployee(selectedEmployee.id, { title: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1">Location</label>
                  <input
                    value={selectedEmployee.location}
                    onChange={(e) => upsertEmployee(selectedEmployee.id, { location: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1">Allocation (%)</label>
                  <input
                    type="number"
                    value={selectedEmployee.allocation}
                    onChange={(e) => handleAllocationChange(selectedEmployee.id, Number(e.target.value) || 0)}
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1">Team</label>
                  <select
                    value={selectedEmployee.teamId}
                    onChange={(e) => upsertEmployee(selectedEmployee.id, { teamId: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-sm"
                  >
                    {teams.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1">Role</label>
                  <select
                    value={selectedEmployee.roleId ?? ''}
                    onChange={(e) => upsertEmployee(selectedEmployee.id, { roleId: e.target.value || undefined })}
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-sm"
                  >
                    <option value="">Unassigned</option>
                    {roles.map((r) => (
                      <option key={r.id} value={r.id}>
                        {r.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <EmployeeSkillsEditor employee={selectedEmployee} />
            </div>
          )}
        </div>
      </div>
    </div>
  );

  const renderRequirementsGaps = () => (
    <div className="min-h-full w-full p-8 animate-in fade-in duration-500">
      <div className="flex items-center justify-end gap-4 mb-6 flex-wrap">
        <button
          type="button"
          onClick={() => resetProposedChanges()}
          className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
        >
          <span className="material-icons-round text-[16px]">restart_alt</span>
          Reset demo data
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1 space-y-4">
          <div className="bg-white dark:bg-card-dark rounded-2xl border border-slate-200 dark:border-slate-700/80 shadow-sm p-5 space-y-3">
            <div className="text-xs font-semibold uppercase tracking-wide text-slate-400">Scope</div>
            <div className="text-sm font-semibold text-slate-900 dark:text-slate-50">{gapScopeLabel}</div>
            <div className="space-y-2">
              <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400">Node</label>
              <select
                value={`${gapScope.kind}:${gapScope.id}`}
                onChange={(e) => {
                  const [kind, id] = e.target.value.split(':') as ['department' | 'team' | 'role', string];
                  setGapScope({ kind, id });
                }}
                className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-sm"
              >
                <optgroup label="Departments">
                  {departments.map((d) => (
                    <option key={d.id} value={`department:${d.id}`}>
                      {d.name}
                    </option>
                  ))}
                </optgroup>
                <optgroup label="Teams">
                  {teams.map((t) => (
                    <option key={t.id} value={`team:${t.id}`}>
                      {t.name}
                    </option>
                  ))}
                </optgroup>
                <optgroup label="Roles">
                  {roles.map((r) => (
                    <option key={r.id} value={`role:${r.id}`}>
                      {r.name}
                    </option>
                  ))}
                </optgroup>
              </select>
            </div>
            <div className="text-[11px] text-slate-500 dark:text-slate-400">
              Employees in scope: <span className="font-semibold">{gapScopeEmployees.length}</span>
            </div>
          </div>

          <div className="bg-white dark:bg-card-dark rounded-2xl border border-slate-200 dark:border-slate-700/80 shadow-sm p-5">
            {gapScope.kind === 'department' && (
              <RequirementsEditor
                requirements={departmentById[gapScope.id]?.requiredSkills}
                onChange={(next) => upsertDepartment(gapScope.id, { requiredSkills: next })}
              />
            )}
            {gapScope.kind === 'team' && (
              <RequirementsEditor
                requirements={teamById[gapScope.id]?.requiredSkills}
                onChange={(next) => upsertTeam(gapScope.id, { requiredSkills: next })}
              />
            )}
            {gapScope.kind === 'role' && (
              <RequirementsEditor
                requirements={roleById[gapScope.id]?.requirements}
                onChange={(next) => upsertRole(gapScope.id, { requirements: next })}
              />
            )}
          </div>
        </div>

        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white dark:bg-card-dark rounded-2xl border border-slate-200 dark:border-slate-700/80 shadow-sm p-5">
            <div className="flex items-center justify-between gap-2 mb-3">
              <div>
                <div className="text-xs font-semibold uppercase tracking-wide text-slate-400">Coverage</div>
                <div className="text-sm font-semibold text-slate-900 dark:text-slate-50">
                  Requirements vs holders (now vs planned)
                </div>
              </div>
            </div>

            {gapCoverage.length === 0 ? (
              <div className="text-sm text-slate-500 dark:text-slate-400">
                Add requirements for this node to see gaps.
              </div>
            ) : (
              <div className="overflow-x-auto -mx-2 px-2">
                <table className="min-w-full text-xs">
                  <thead className="bg-slate-50/80 dark:bg-slate-900/70 text-slate-500 dark:text-slate-400">
                    <tr>
                      <th className="text-left font-semibold px-3 py-2.5">Skill</th>
                      <th className="text-left font-semibold px-3 py-2.5">Importance</th>
                      <th className="text-left font-semibold px-3 py-2.5">Min level</th>
                      <th className="text-left font-semibold px-3 py-2.5">Target</th>
                      <th className="text-left font-semibold px-3 py-2.5">Available</th>
                      <th className="text-left font-semibold px-3 py-2.5">Planned</th>
                      <th className="text-left font-semibold px-3 py-2.5">Gap now</th>
                      <th className="text-left font-semibold px-3 py-2.5">Gap future</th>
                      <th className="text-left font-semibold px-3 py-2.5">Risk</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {gapCoverage.map((row) => {
                      const skill = getSkillById(row.requirement.skillId);
                      return (
                        <tr key={row.requirement.skillId} className="hover:bg-slate-50/70 dark:hover:bg-slate-900/40">
                          <td className="px-3 py-2.5">
                            <div className="text-[12px] font-medium text-slate-900 dark:text-slate-50">
                              {skill?.name ?? row.requirement.skillId}
                            </div>
                            <div className="text-[11px] text-slate-400">{skill?.category ?? 'â€”'}</div>
                          </td>
                          <td className="px-3 py-2.5">{row.requirement.importance}</td>
                          <td className="px-3 py-2.5">{row.requirement.minLevel}</td>
                          <td className="px-3 py-2.5">{row.requirement.targetHolders}</td>
                          <td className="px-3 py-2.5">{row.availableHolders}</td>
                          <td className="px-3 py-2.5">{row.plannedHolders}</td>
                          <td className={`px-3 py-2.5 ${row.gapNow > 0 ? 'text-rose-600 dark:text-rose-400 font-semibold' : ''}`}>{row.gapNow}</td>
                          <td className={`px-3 py-2.5 ${row.gapFuture > 0 ? 'text-amber-600 dark:text-amber-300 font-semibold' : ''}`}>{row.gapFuture}</td>
                          <td className="px-3 py-2.5">
                            <span className={`px-2 py-0.5 rounded-full border text-[11px] ${riskBadgeColor[row.risk]}`}>
                              {row.risk}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          <div className="bg-white dark:bg-card-dark rounded-2xl border border-slate-200 dark:border-slate-700/80 shadow-sm p-5">
            <div className="text-xs font-semibold uppercase tracking-wide text-slate-400 mb-2">Recommendations</div>
            {gapRecommendations.length === 0 ? (
              <div className="text-sm text-slate-500 dark:text-slate-400">No recommendations yet.</div>
            ) : (
              <div className="space-y-2">
                {gapRecommendations.map((rec) => (
                  <div key={rec.key} className={`rounded-xl border px-3 py-2.5 text-sm ${severityColor[rec.severity]}`}>
                    {rec.lines.map((l, idx) => (
                      <div key={idx}>{l}</div>
                    ))}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <>
      {newRoleModalOpen && (
        <div
          className="fixed inset-0 z-[190] flex items-center justify-center p-4 bg-black/50"
          onClick={() => {
            setNewRoleModalOpen(false);
            resetNewRoleState();
          }}
          role="dialog"
          aria-modal="true"
          aria-labelledby="new-role-modal-title"
        >
          <div
            className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-xl max-w-2xl w-full max-h-[85vh] flex flex-col overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200 dark:border-slate-700">
              <div>
                <h2
                  id="new-role-modal-title"
                  className="text-lg font-semibold text-slate-900 dark:text-slate-50"
                >
                  Add new role
                </h2>
                <p className="text-sm text-slate-500 dark:text-slate-400">
                  Define the role and its target skill set. Skills will be grouped into technical and
                  behavioural for the Role Coverage Matrix.
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setNewRoleModalOpen(false);
                  resetNewRoleState();
                }}
                className="p-2 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                aria-label="Close"
              >
                <span className="material-icons-round">close</span>
              </button>
            </div>

            <div className="px-5 py-4 space-y-4 overflow-y-auto flex-1">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="sm:col-span-2">
                  <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1">
                    Role name
                  </label>
                  <input
                    type="text"
                    value={newRoleName}
                    onChange={(e) => setNewRoleName(e.target.value)}
                    placeholder="e.g. Senior Stitching Operator"
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-900 text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-400"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1">
                    Level
                  </label>
                  <select
                    value={newRoleLevel}
                    onChange={(e) => setNewRoleLevel(e.target.value as Role['level'])}
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-900 text-sm text-slate-900 dark:text-slate-100"
                  >
                    <option value="Operator">Operator</option>
                    <option value="Lead">Lead</option>
                    <option value="Supervisor">Supervisor</option>
                    <option value="Technician">Technician</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="sm:col-span-2">
                  <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1">
                    Area / Line
                  </label>
                  <select
                    value={newRoleTeam}
                    onChange={(e) => setNewRoleTeam(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-900 text-sm text-slate-900 dark:text-slate-100"
                  >
                    {teams.map((team) => (
                      <option key={team.id} value={team.id}>
                        {team.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="bg-slate-50/70 dark:bg-slate-900/60 rounded-2xl border border-slate-200 dark:border-slate-700 p-4 space-y-3">
                <div className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                  Target skill set
                </div>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                  Add skills to build a skills-based job description. Set importance: must-have (3) or
                  nice-to-have (1).
                </p>

                <div className="relative">
                  <input
                    type="text"
                    value={newRoleSkillSearch}
                    onChange={(e) => {
                      setNewRoleSkillSearch(e.target.value);
                      setNewRoleSkillDropdownOpen(true);
                    }}
                    onFocus={() => setNewRoleSkillDropdownOpen(true)}
                    placeholder="Search skills..."
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 text-sm placeholder:text-slate-400"
                  />
                  {newRoleSkillDropdownOpen && (
                    <>
                      <div
                        className="fixed inset-0 z-10"
                        aria-hidden="true"
                        onClick={() => setNewRoleSkillDropdownOpen(false)}
                      />
                      <div className="absolute top-full left-0 right-0 mt-1 rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-900 shadow-lg z-20 max-h-64 overflow-y-auto">
                        {newRoleFilteredSkills.length === 0 ? (
                          <div className="px-3 py-4 text-xs text-slate-400">
                            No matching skills or all already added.
                          </div>
                        ) : (
                          newRoleFilteredSkills.map((item) => (
                            <button
                              key={item.id}
                              type="button"
                              onClick={() => addNewRoleSkill(item.id, 3)}
                              className="w-full text-left px-3 py-2 hover:bg-slate-50 dark:hover:bg-slate-800 flex items-center justify-between gap-2 text-sm"
                            >
                              <span className="text-slate-800 dark:text-slate-200">{item.name}</span>
                              <span className="text-[10px] text-slate-400">
                                {item.category}
                                {item.source === 'detail' ? ' (role detail)' : ''}
                              </span>
                            </button>
                          ))
                        )}
                      </div>
                    </>
                  )}
                </div>

                <div className="flex flex-wrap gap-2">
                  {newRoleSkillSet.map((req) => {
                    const displayName = getCanvasSkillDisplayName(req.skillId);
                    return (
                      <div
                        key={req.skillId}
                        className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-600"
                      >
                        <span className="text-xs font-medium text-slate-800 dark:text-slate-200">
                          {displayName}
                        </span>
                        <select
                          value={req.importance}
                          onChange={(e) =>
                            setNewRoleSkillImportance(
                              req.skillId,
                              Number(e.target.value) as 1 | 2 | 3,
                            )
                          }
                          className="text-[10px] rounded border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 py-0.5"
                          title="Importance"
                        >
                          <option value={1}>Nice-to-have</option>
                          <option value={2}>Preferred</option>
                          <option value={3}>Must-have</option>
                        </select>
                        <button
                          type="button"
                          onClick={() => removeNewRoleSkill(req.skillId)}
                          className="p-0.5 rounded text-slate-400 hover:text-rose-500 hover:bg-rose-500/10"
                          aria-label={`Remove ${displayName}`}
                        >
                          <span className="material-icons-round text-[14px]">close</span>
                        </button>
                      </div>
                    );
                  })}
                  {newRoleSkillSet.length === 0 && (
                    <span className="text-[11px] text-slate-400">
                      Add skills from the search above.
                    </span>
                  )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-3 border-t border-slate-200 dark:border-slate-700">
                  <div>
                    <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400 mb-1.5">
                      Technical
                    </h3>
                    <ul className="space-y-1 text-[11px] text-slate-700 dark:text-slate-200">
                      {newRoleSkillSet
                        .filter((req) => {
                          const meta = ALL_CANVAS_SKILLS.find((s) => s.id === req.skillId);
                          return meta?.category !== 'Behavioural';
                        })
                        .map((req) => {
                          const displayName = getCanvasSkillDisplayName(req.skillId);
                          return <li key={req.skillId}>â€¢ {displayName}</li>;
                        })}
                      {newRoleSkillSet.filter((req) => {
                        const meta = ALL_CANVAS_SKILLS.find((s) => s.id === req.skillId);
                        return meta?.category !== 'Behavioural';
                      }).length === 0 && <li className="text-slate-400">â€”</li>}
                    </ul>
                  </div>
                  <div>
                    <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400 mb-1.5">
                      Behavioural
                    </h3>
                    <ul className="space-y-1 text-[11px] text-slate-700 dark:text-slate-200">
                      {newRoleSkillSet
                        .filter((req) => {
                          const meta = ALL_CANVAS_SKILLS.find((s) => s.id === req.skillId);
                          return meta?.category === 'Behavioural';
                        })
                        .map((req) => {
                          const displayName = getCanvasSkillDisplayName(req.skillId);
                          return <li key={req.skillId}>â€¢ {displayName}</li>;
                        })}
                      {newRoleSkillSet.filter((req) => {
                        const meta = ALL_CANVAS_SKILLS.find((s) => s.id === req.skillId);
                        return meta?.category === 'Behavioural';
                      }).length === 0 && <li className="text-slate-400">â€”</li>}
                    </ul>
                  </div>
                </div>
              </div>
            </div>

            <div className="px-5 py-3 border-t border-slate-200 dark:border-slate-700 flex items-center justify-between">
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                New roles appear in the Role Coverage Matrix as high-risk vacancies until staffed.
              </p>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setNewRoleModalOpen(false);
                    resetNewRoleState();
                  }}
                  className="px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-600 text-xs font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleCreateNewRole}
                  disabled={!newRoleName.trim() || newRoleSkillSet.length === 0}
                  className="px-3 py-1.5 rounded-lg bg-primary text-white text-xs font-semibold hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed inline-flex items-center gap-1.5"
                >
                  <span className="material-icons-round text-[16px]">save</span>
                  Add role
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {roleSkillsModal && (() => {
        const details = roleSkillDetails[roleSkillsModal.name];
        const technical = details?.technical ?? [];
        const behavioural = details?.behavioural ?? [];
        return (
          <div
            className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/50"
            onClick={() => setRoleSkillsModal(null)}
            role="dialog"
            aria-modal="true"
            aria-labelledby="role-skills-modal-title"
          >
            <div
              className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-xl max-w-lg w-full max-h-[80vh] flex flex-col overflow-hidden"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200 dark:border-slate-700">
                <div>
                  <h2 id="role-skills-modal-title" className="text-lg font-semibold text-slate-900 dark:text-slate-50">
                    {roleSkillsModal.name}
                  </h2>
                  <p className="text-sm text-slate-500 dark:text-slate-400">{roleSkillsModal.team}</p>
                </div>
                <button
                  type="button"
                  onClick={() => setRoleSkillsModal(null)}
                  className="p-2 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                  aria-label="Close"
                >
                  <span className="material-icons-round">close</span>
                </button>
              </div>
              <div className="px-5 py-4 overflow-y-auto flex-1 space-y-4">
                <div>
                  <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400 mb-2">
                    Technical
                  </h3>
                  <ul className="list-none pl-0 space-y-1">
                    {technical.length === 0 ? (
                      <li className="text-sm text-slate-400">â€”</li>
                    ) : (
                      technical.map((item, i) => (
                        <li key={i} className="text-sm text-slate-700 dark:text-slate-200">â€¢ {item}</li>
                      ))
                    )}
                  </ul>
                </div>
                <div>
                  <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400 mb-2">
                    Behavioural
                  </h3>
                  <ul className="list-none pl-0 space-y-1">
                    {behavioural.length === 0 ? (
                      <li className="text-sm text-slate-400">â€”</li>
                    ) : (
                      behavioural.map((item, i) => (
                        <li key={i} className="text-sm text-slate-700 dark:text-slate-200">â€¢ {item}</li>
                      ))
                    )}
                  </ul>
                </div>
              </div>
            </div>
          </div>
        );
      })()}

      <ExpertAppProvider>
        <ExpertSuite />
      </ExpertAppProvider>

      {/* Legacy Ignizia View removed */}
    </>
  );
};

export default TalentStudio;

