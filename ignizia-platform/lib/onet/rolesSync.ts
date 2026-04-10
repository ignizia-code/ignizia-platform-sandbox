import 'server-only';

import type { Role, RoleSkillRequirement, TaskRequirement, CrewBlueprint, TeamBuild, LearningPlan } from '@/components/features/talent-studio/v3/types';
import {
  DEFAULT_ORG_ID,
  loadTalentStudioState,
  saveTalentStudioState,
  type TalentStudioPersistedState,
} from '@/lib/talentStudioStorage/supabase';
import { fetchAllRowsForTable } from '@/lib/onet/database';

export const SELECTED_ONET_OCCUPATION_TITLES = [
  'Chief Executives',
  'General and Operations Managers',
  'Human Resources Managers',
  'Manufacturing Engineers',
  'Potters, Manufacturing',
  'Sales Representatives, Wholesale and Manufacturing, Except Technical and Scientific Products',
  'Sales Representatives, Wholesale and Manufacturing, Technical and Scientific Products',
  'Stone Cutters and Carvers, Manufacturing',
] as const;

function resolveDepartmentIdForOnetRole(
  roleTitle: string,
  departmentIds: string[],
): string {
  const byPriority = (candidates: string[]): string | null => {
    for (const candidate of candidates) {
      const found = departmentIds.find((id) => id.toLowerCase().includes(candidate));
      if (found) return found;
    }
    return null;
  };

  const normalized = roleTitle.toLowerCase();
  if (normalized.includes('human resources')) {
    return byPriority(['hr', 'human', 'people']) ?? departmentIds[0] ?? 'dept-1';
  }
  if (normalized.includes('operations') || normalized.includes('manufacturing')) {
    return byPriority(['operation', 'production', 'manufacturing']) ?? departmentIds[0] ?? 'dept-1';
  }
  if (normalized.includes('sales')) {
    return byPriority(['sales', 'commercial']) ?? departmentIds[0] ?? 'dept-1';
  }
  return departmentIds[0] ?? 'dept-1';
}

type OnetOccupationRow = {
  onetsoc_code?: unknown;
  title?: unknown;
};

type OnetSkillRow = {
  onetsoc_code?: unknown;
  title?: unknown;
  element_id?: unknown;
  element_name?: unknown;
  scale_id?: unknown;
  data_value?: unknown;
  not_relevant?: unknown;
  date_updated?: unknown;
};

export type OnetRoleSyncResult = {
  roleCount: number;
  employeeCount: number;
  roles: Role[];
  employees: TalentStudioPersistedState['employees'];
  taskRequirements: TaskRequirement[];
  crewBlueprints: CrewBlueprint[];
  teamBuilds: TeamBuild[];
  plans: LearningPlan[];
};

function asString(value: unknown): string | null {
  return typeof value === 'string' && value.trim().length > 0 ? value.trim() : null;
}

function asNumber(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string' && value.trim().length > 0) {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  return null;
}

function clampToProficiencyLevel(levelOnSevenScale: number | null): RoleSkillRequirement['minLevel'] {
  if (levelOnSevenScale === null) return 3;
  const fiveScale = Math.round((levelOnSevenScale / 7) * 5);
  return Math.max(1, Math.min(5, fiveScale)) as RoleSkillRequirement['minLevel'];
}

function parseNotRelevantFlag(value: unknown): boolean {
  const raw = asString(value);
  if (!raw) return false;
  return raw.toUpperCase() === 'Y';
}

function stableIndexFromText(input: string, size: number): number {
  if (size <= 0) return 0;
  let hash = 0;
  for (let idx = 0; idx < input.length; idx += 1) {
    hash = (hash * 31 + input.charCodeAt(idx)) >>> 0;
  }
  return hash % size;
}

function remapRoleIds(roleIds: string[], newRoleIds: string[]): string[] {
  const deduped = [...new Set(roleIds)];
  if (deduped.length === 0 || newRoleIds.length === 0) return [];
  return deduped.map((roleId) => newRoleIds[stableIndexFromText(roleId, newRoleIds.length)]);
}

function mergeOnetSkillRowsToRequirements(rows: OnetSkillRow[]): RoleSkillRequirement[] {
  const byElement = new Map<string, RoleSkillRequirement>();

  for (const row of rows) {
    const elementId = asString(row.element_id);
    const elementName = asString(row.element_name);
    const scaleId = asString(row.scale_id);
    const dataValue = asNumber(row.data_value);
    const onetUpdatedAt = asString(row.date_updated) ?? undefined;
    const notRelevant = parseNotRelevantFlag(row.not_relevant);

    if (!elementId || !elementName) continue;

    const existing = byElement.get(elementId) ?? {
      skillId: elementId,
      skillName: elementName,
      source: 'onet',
      elementId,
      minLevel: 3,
      weight: 1,
      required: true,
      importance: undefined,
      level: undefined,
      notRelevant,
      onetUpdatedAt,
    };

    if (scaleId === 'IM' && dataValue !== null) {
      existing.importance = dataValue;
      existing.weight = Math.max(0.5, Math.min(5, Number(dataValue.toFixed(3))));
    }

    if (scaleId === 'LV' && dataValue !== null) {
      existing.level = dataValue;
      existing.minLevel = clampToProficiencyLevel(dataValue);
    }

    existing.required = !notRelevant;
    existing.notRelevant = notRelevant;
    existing.onetUpdatedAt = existing.onetUpdatedAt ?? onetUpdatedAt;

    byElement.set(elementId, existing);
  }

  return [...byElement.values()].sort((a, b) => {
    const aImportance = a.importance ?? -1;
    const bImportance = b.importance ?? -1;
    if (aImportance !== bImportance) return bImportance - aImportance;
    return (a.skillName ?? a.skillId).localeCompare(b.skillName ?? b.skillId);
  });
}

async function resolveSelectedOccupations(): Promise<Array<{ onetSocCode: string; title: string }>> {
  const occupationRows = (await fetchAllRowsForTable('occupation_data')).rows as OnetOccupationRow[];
  const wantedTitles = new Set(SELECTED_ONET_OCCUPATION_TITLES.map((title) => title.toLowerCase()));

  const selected = occupationRows
    .map((row) => {
      const title = asString(row.title);
      const onetSocCode = asString(row.onetsoc_code);
      if (!title || !onetSocCode) return null;
      return { title, onetSocCode };
    })
    .filter((row): row is { onetSocCode: string; title: string } => row !== null)
    .filter((row) => wantedTitles.has(row.title.toLowerCase()));

  const missing = SELECTED_ONET_OCCUPATION_TITLES.filter(
    (title) => !selected.some((row) => row.title.toLowerCase() === title.toLowerCase())
  );
  if (missing.length > 0) {
    throw new Error(`Could not resolve O*NET occupations for: ${missing.join(', ')}`);
  }

  return selected;
}

async function buildOnetRolesFromSelectedOccupations(departmentIds: string[]): Promise<Role[]> {
  const occupations = await resolveSelectedOccupations();
  const roles: Role[] = [];

  for (const occupation of occupations) {
    const skillRows = (await fetchAllRowsForTable('skills', {
      filters: [`onetsoc_code.eq.${occupation.onetSocCode}`],
    })).rows as OnetSkillRow[];
    const requirements = mergeOnetSkillRowsToRequirements(skillRows);
    const onetLastUpdatedAt = requirements.reduce<string | undefined>((latest, requirement) => {
      const candidate = requirement.onetUpdatedAt;
      if (!candidate) return latest;
      if (!latest) return candidate;
      return candidate > latest ? candidate : latest;
    }, undefined);

    roles.push({
      id: `onet-${occupation.onetSocCode}`,
      name: occupation.title,
      description: `Synced from O*NET occupation ${occupation.onetSocCode}.`,
      departmentId: resolveDepartmentIdForOnetRole(occupation.title, departmentIds),
      source: 'onet',
      onetSocCode: occupation.onetSocCode,
      onetLastUpdatedAt,
      syncedAt: new Date().toISOString(),
      isHiring: false,
      requirements,
    });
  }

  return roles;
}

function withRandomRoleAssignments(
  state: TalentStudioPersistedState,
  roleIds: string[]
): Omit<OnetRoleSyncResult, 'roleCount' | 'roles'> {
  const employees = state.employees.map((employee) => {
    const idx = stableIndexFromText(employee.id, roleIds.length);
    return { ...employee, roleId: roleIds[idx] };
  });

  const taskRequirements = state.taskRequirements.map((requirement) => ({
    ...requirement,
    roleIds: remapRoleIds(requirement.roleIds, roleIds),
  }));

  const crewBlueprints = state.crewBlueprints.map((blueprint) => ({
    ...blueprint,
    requiredRoles: blueprint.requiredRoles.map((role, idx) => ({
      ...role,
      roleId: roleIds[idx % roleIds.length],
    })),
  }));

  const teamBuilds = state.teamBuilds.map((build) => ({
    ...build,
    assignments: build.assignments.map((assignment) => ({
      ...assignment,
      roleId: roleIds[stableIndexFromText(assignment.employeeId, roleIds.length)],
    })),
  }));

  const plans = state.plans.map((plan) => {
    if (!plan.personId) {
      return {
        ...plan,
        roleId: plan.roleId ? roleIds[stableIndexFromText(plan.roleId, roleIds.length)] : undefined,
      };
    }

    const employee = employees.find((item) => item.id === plan.personId);
    return {
      ...plan,
      roleId: employee?.roleId ?? plan.roleId,
    };
  });

  return {
    employees,
    taskRequirements,
    crewBlueprints,
    teamBuilds,
    plans,
    employeeCount: employees.length,
  };
}

export async function runSelectedOnetRoleSync(orgId = DEFAULT_ORG_ID): Promise<OnetRoleSyncResult> {
  const state = await loadTalentStudioState(orgId);
  if (!state) {
    throw new Error('No existing Talent Studio state found in Supabase for the configured org.');
  }

  const departmentIds = state.departments.map((department) => department.id);
  const roles = await buildOnetRolesFromSelectedOccupations(departmentIds);
  if (roles.length === 0) {
    throw new Error('No O*NET roles were produced during sync.');
  }

  const roleIds = roles.map((role) => role.id);
  const normalized = withRandomRoleAssignments(state, roleIds);

  const nextState: TalentStudioPersistedState = {
    ...state,
    roles,
    employees: normalized.employees,
    taskRequirements: normalized.taskRequirements,
    crewBlueprints: normalized.crewBlueprints,
    teamBuilds: normalized.teamBuilds,
    plans: normalized.plans,
  };

  const saved = await saveTalentStudioState(nextState, orgId);
  if (!saved) {
    throw new Error('Failed saving synced O*NET roles to Supabase.');
  }

  return {
    roleCount: roles.length,
    roles,
    employees: normalized.employees,
    employeeCount: normalized.employeeCount,
    taskRequirements: normalized.taskRequirements,
    crewBlueprints: normalized.crewBlueprints,
    teamBuilds: normalized.teamBuilds,
    plans: normalized.plans,
  };
}
