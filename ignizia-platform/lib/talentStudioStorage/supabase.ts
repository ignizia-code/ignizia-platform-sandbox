import { supabase } from '@/lib/supabase/client';
import type {
  Role,
  Employee,
  Department,
  LearningResource,
  LearningPlan,
  OutboxRecord,
  Permit,
  Task,
  TaskRequirement,
  PermitSchema,
  CrewBlueprint,
  Project,
  PersonPermit,
  ComplianceTraining,
  TeamBuild,
  CapabilityConfig,
} from '@/components/features/talent-studio/v3/types';

export const DEFAULT_ORG_ID = '00000000-0000-0000-0000-000000000001';
const COLLECTIONS_TABLE = 'talent_studio_collections';
const DEPARTMENTS_TABLE = 'talent_departments';
const ROLES_TABLE = 'talent_roles';
const ROLE_REQUIREMENTS_TABLE = 'talent_role_requirements';
const EMPLOYEES_TABLE = 'talent_employees';
const EMPLOYEE_ASSERTIONS_TABLE = 'talent_employee_assertions';
const ROLE_DEPARTMENT_LINKS_TABLE = 'talent_role_department_links';

function isMissingColumnError(error: unknown, columnName: string): boolean {
  if (!error || typeof error !== 'object') return false;
  const maybe = error as { code?: string; message?: string };
  return (
    maybe.code === 'PGRST204' &&
    typeof maybe.message === 'string' &&
    maybe.message.includes(`'${columnName}'`)
  );
}

export interface TalentStudioPersistedState {
  departments: Department[];
  roles: Role[];
  employees: Employee[];
  resources: LearningResource[];
  plans: LearningPlan[];
  outbox: OutboxRecord[];
  permits: Permit[];
  tasks: Task[];
  taskRequirements: TaskRequirement[];
  permitSchemas: PermitSchema[];
  crewBlueprints: CrewBlueprint[];
  projects: Project[];
  personPermits: PersonPermit[];
  complianceTrainings: ComplianceTraining[];
  teamBuilds: TeamBuild[];
  publishedConfigs: CapabilityConfig[];
}

type AuxCollectionKey =
  | 'resources'
  | 'plans'
  | 'outbox'
  | 'permits'
  | 'tasks'
  | 'taskRequirements'
  | 'permitSchemas'
  | 'crewBlueprints'
  | 'projects'
  | 'personPermits'
  | 'complianceTrainings'
  | 'teamBuilds'
  | 'publishedConfigs';

const AUX_KEYS: AuxCollectionKey[] = [
  'resources',
  'plans',
  'outbox',
  'permits',
  'tasks',
  'taskRequirements',
  'permitSchemas',
  'crewBlueprints',
  'projects',
  'personPermits',
  'complianceTrainings',
  'teamBuilds',
  'publishedConfigs',
];

export async function loadTalentStudioState(
  orgId = DEFAULT_ORG_ID,
): Promise<TalentStudioPersistedState | null> {
  const [departmentsRes, rolesRes, reqsRes, employeesRes, assertionsRes, collectionsRes] = await Promise.all([
    supabase.from(DEPARTMENTS_TABLE).select('*').eq('org_id', orgId).order('display_order'),
    supabase.from(ROLES_TABLE).select('*').eq('org_id', orgId),
    supabase.from(ROLE_REQUIREMENTS_TABLE).select('*').eq('org_id', orgId),
    supabase.from(EMPLOYEES_TABLE).select('*').eq('org_id', orgId),
    supabase.from(EMPLOYEE_ASSERTIONS_TABLE).select('*').eq('org_id', orgId),
    supabase.from(COLLECTIONS_TABLE).select('collection, payload').eq('org_id', orgId),
  ]);

  const errors = [
    departmentsRes.error,
    rolesRes.error,
    reqsRes.error,
    employeesRes.error,
    assertionsRes.error,
    collectionsRes.error,
  ].filter(Boolean);
  if (errors.length > 0) {
    console.error('Failed to load talent studio state:', errors);
    return null;
  }

  const deptRows = departmentsRes.data ?? [];
  const roleRows = rolesRes.data ?? [];
  const reqRows = reqsRes.data ?? [];
  const empRows = employeesRes.data ?? [];
  const assertionRows = assertionsRes.data ?? [];
  const collectionRows = collectionsRes.data ?? [];

  if (
    deptRows.length === 0 &&
    roleRows.length === 0 &&
    empRows.length === 0 &&
    collectionRows.length === 0
  ) {
    return null;
  }

  const requirementsByRoleId = new Map<string, Role['requirements']>();
  reqRows.forEach((r) => {
    const req = {
      skillId: r.skill_id as string,
      skillName: (r.skill_name as string | null) ?? undefined,
      source: ((r.source as string | null) ?? 'manual') as Role['requirements'][number]['source'],
      elementId: (r.element_id as string | null) ?? undefined,
      minLevel: r.min_level as Role['requirements'][number]['minLevel'],
      weight: Number(r.weight ?? 1),
      required: Boolean(r.required ?? true),
      importance: typeof r.importance === 'number' ? r.importance : undefined,
      level: typeof r.level === 'number' ? r.level : undefined,
      notRelevant: Boolean(r.not_relevant ?? false),
      onetUpdatedAt: (r.onet_updated_at as string | null) ?? undefined,
    };
    const list = requirementsByRoleId.get(r.role_id as string) ?? [];
    list.push(req);
    requirementsByRoleId.set(r.role_id as string, list);
  });

  const assertionsByEmployeeId = new Map<string, Employee['assertions']>();
  assertionRows.forEach((a) => {
    const assertion = {
      id: a.assertion_id as string,
      personId: a.person_id as string,
      skillId: a.skill_id as string,
      status: a.status as Employee['assertions'][number]['status'],
      source: a.source as Employee['assertions'][number]['source'],
      level: Number(a.level) as Employee['assertions'][number]['level'],
      confidence: Number(a.confidence ?? 0),
      lastUsedAt: a.last_used_at as string | undefined,
      evidenceIds: (a.evidence_ids as string[]) ?? [],
      createdAt: a.created_at as string,
      updatedAt: a.updated_at as string,
    };
    const list = assertionsByEmployeeId.get(a.person_id as string) ?? [];
    list.push(assertion);
    assertionsByEmployeeId.set(a.person_id as string, list);
  });

  const departments: Department[] = deptRows.map((d) => ({
    id: d.dept_id as string,
    name: d.name as string,
    description: (d.description as string | null) ?? undefined,
  }));

  const roles: Role[] = roleRows.map((r) => ({
    id: r.role_id as string,
    name: r.name as string,
    description: (r.description as string) ?? '',
    departmentId: (r.department_id as string | null) ?? undefined,
    requirements: requirementsByRoleId.get(r.role_id as string) ?? [],
    isHiring: Boolean(r.is_hiring ?? false),
    source: ((r.source as string | null) ?? 'manual') as Role['source'],
    onetSocCode: (r.onet_soc_code as string | null) ?? undefined,
    onetLastUpdatedAt: (r.onet_last_updated_at as string | null) ?? undefined,
    syncedAt: (r.synced_at as string | null) ?? undefined,
  }));

  const employees: Employee[] = empRows.map((e) => ({
    id: e.employee_id as string,
    name: e.name as string,
    roleId: e.role_id as string,
    avatarUrl: (e.avatar_url as string | null) ?? undefined,
    workload: (e.workload as Employee['workload']) ?? undefined,
    allocation: typeof e.allocation === 'number' ? e.allocation : undefined,
    assertions: assertionsByEmployeeId.get(e.employee_id as string) ?? [],
    privacy: (e.privacy as Employee['privacy']) ?? {
      shareConfirmedSkills: true,
      shareUnconfirmedAiSkills: false,
      shareUnconfirmedImportedSkills: false,
      allowAiToAddSkills: true,
      visibility: 'org_visible',
    },
  }));

  const aux = new Map<string, unknown>(collectionRows.map((row) => [row.collection as string, row.payload]));
  return {
    departments,
    roles,
    employees,
    resources: (aux.get('resources') as LearningResource[]) ?? [],
    plans: (aux.get('plans') as LearningPlan[]) ?? [],
    outbox: (aux.get('outbox') as OutboxRecord[]) ?? [],
    permits: (aux.get('permits') as Permit[]) ?? [],
    tasks: (aux.get('tasks') as Task[]) ?? [],
    taskRequirements: (aux.get('taskRequirements') as TaskRequirement[]) ?? [],
    permitSchemas: (aux.get('permitSchemas') as PermitSchema[]) ?? [],
    crewBlueprints: (aux.get('crewBlueprints') as CrewBlueprint[]) ?? [],
    projects: (aux.get('projects') as Project[]) ?? [],
    personPermits: (aux.get('personPermits') as PersonPermit[]) ?? [],
    complianceTrainings: (aux.get('complianceTrainings') as ComplianceTraining[]) ?? [],
    teamBuilds: (aux.get('teamBuilds') as TeamBuild[]) ?? [],
    publishedConfigs: (aux.get('publishedConfigs') as CapabilityConfig[]) ?? [],
  };
}

export async function saveTalentStudioState(
  payload: TalentStudioPersistedState,
  orgId = DEFAULT_ORG_ID,
): Promise<boolean> {
  const now = new Date().toISOString();

  // Departments
  const { error: depDeleteErr } = await supabase.from(DEPARTMENTS_TABLE).delete().eq('org_id', orgId);
  if (depDeleteErr) {
    console.error('Failed to clear departments:', depDeleteErr);
    return false;
  }
  const departmentRows = payload.departments.map((d, idx) => ({
    org_id: orgId,
    dept_id: d.id,
    name: d.name,
    description: d.description ?? null,
    display_order: idx,
    updated_at: now,
  }));
  if (departmentRows.length > 0) {
    const { error: depInsertErr } = await supabase.from(DEPARTMENTS_TABLE).insert(departmentRows);
    if (depInsertErr) {
      console.error('Failed to save departments:', depInsertErr);
      return false;
    }
  }

  // Roles
  const { error: roleDeleteErr } = await supabase.from(ROLES_TABLE).delete().eq('org_id', orgId);
  if (roleDeleteErr) {
    console.error('Failed to clear roles:', roleDeleteErr);
    return false;
  }
  const roleRowsWithOnetFields = payload.roles.map((r) => ({
    org_id: orgId,
    role_id: r.id,
    department_id: r.departmentId ?? null,
    name: r.name,
    description: r.description,
    is_hiring: Boolean(r.isHiring),
    source: r.source ?? 'manual',
    onet_soc_code: r.onetSocCode ?? null,
    onet_last_updated_at: r.onetLastUpdatedAt ?? null,
    synced_at: r.syncedAt ?? null,
    updated_at: now,
  }));
  const roleRowsLegacy = payload.roles.map((r) => ({
    org_id: orgId,
    role_id: r.id,
    department_id: r.departmentId ?? null,
    name: r.name,
    description: r.description,
    is_hiring: Boolean(r.isHiring),
    updated_at: now,
  }));
  if (roleRowsWithOnetFields.length > 0) {
    const { error: roleInsertErr } = await supabase.from(ROLES_TABLE).insert(roleRowsWithOnetFields);
    if (roleInsertErr) {
      if (
        isMissingColumnError(roleInsertErr, 'onet_last_updated_at') ||
        isMissingColumnError(roleInsertErr, 'source') ||
        isMissingColumnError(roleInsertErr, 'onet_soc_code') ||
        isMissingColumnError(roleInsertErr, 'synced_at')
      ) {
        const { error: legacyRoleInsertErr } = await supabase.from(ROLES_TABLE).insert(roleRowsLegacy);
        if (legacyRoleInsertErr) {
          console.error('Failed to save roles (legacy fallback):', legacyRoleInsertErr);
          return false;
        }
      } else {
        console.error('Failed to save roles:', roleInsertErr);
        return false;
      }
    }
  }

  const { error: reqDeleteErr } = await supabase.from(ROLE_REQUIREMENTS_TABLE).delete().eq('org_id', orgId);
  if (reqDeleteErr) {
    console.error('Failed to clear role requirements:', reqDeleteErr);
    return false;
  }
  const requirementRowsWithOnetFields = payload.roles.flatMap((r) =>
    r.requirements.map((req) => ({
      org_id: orgId,
      role_id: r.id,
      skill_id: req.skillId,
      skill_name: req.skillName ?? null,
      element_id: req.elementId ?? null,
      min_level: req.minLevel,
      weight: req.weight,
      required: req.required,
      importance: req.importance ?? null,
      level: req.level ?? null,
      not_relevant: req.notRelevant ?? false,
      onet_updated_at: req.onetUpdatedAt ?? null,
      source: req.source ?? 'manual',
      updated_at: now,
    })),
  );
  const requirementRowsLegacy = payload.roles.flatMap((r) =>
    r.requirements.map((req) => ({
      org_id: orgId,
      role_id: r.id,
      skill_id: req.skillId,
      min_level: req.minLevel,
      weight: req.weight,
      required: req.required,
      updated_at: now,
    })),
  );
  if (requirementRowsWithOnetFields.length > 0) {
    const { error: reqInsertErr } = await supabase.from(ROLE_REQUIREMENTS_TABLE).insert(requirementRowsWithOnetFields);
    if (reqInsertErr) {
      if (
        isMissingColumnError(reqInsertErr, 'importance') ||
        isMissingColumnError(reqInsertErr, 'skill_name') ||
        isMissingColumnError(reqInsertErr, 'element_id') ||
        isMissingColumnError(reqInsertErr, 'onet_updated_at') ||
        isMissingColumnError(reqInsertErr, 'source')
      ) {
        const { error: legacyReqInsertErr } = await supabase.from(ROLE_REQUIREMENTS_TABLE).insert(requirementRowsLegacy);
        if (legacyReqInsertErr) {
          console.error('Failed to save role requirements (legacy fallback):', legacyReqInsertErr);
          return false;
        }
      } else {
        console.error('Failed to save role requirements:', reqInsertErr);
        return false;
      }
    }
  }

  // Employees + assertions
  const { error: empDeleteErr } = await supabase.from(EMPLOYEES_TABLE).delete().eq('org_id', orgId);
  if (empDeleteErr) {
    console.error('Failed to clear employees:', empDeleteErr);
    return false;
  }
  const employeeRows = payload.employees.map((e) => ({
    org_id: orgId,
    employee_id: e.id,
    role_id: e.roleId,
    name: e.name,
    avatar_url: e.avatarUrl ?? null,
    workload: e.workload ?? null,
    allocation: e.allocation ?? null,
    privacy: e.privacy,
    updated_at: now,
  }));
  if (employeeRows.length > 0) {
    const { error: empInsertErr } = await supabase.from(EMPLOYEES_TABLE).insert(employeeRows);
    if (empInsertErr) {
      console.error('Failed to save employees:', empInsertErr);
      return false;
    }
  }

  const { error: assertionsDeleteErr } = await supabase.from(EMPLOYEE_ASSERTIONS_TABLE).delete().eq('org_id', orgId);
  if (assertionsDeleteErr) {
    console.error('Failed to clear employee assertions:', assertionsDeleteErr);
    return false;
  }
  const assertionRows = payload.employees.flatMap((e) =>
    e.assertions.map((a) => ({
      org_id: orgId,
      assertion_id: a.id,
      person_id: a.personId,
      skill_id: a.skillId,
      status: a.status,
      source: a.source,
      level: a.level,
      confidence: a.confidence,
      last_used_at: a.lastUsedAt ?? null,
      evidence_ids: a.evidenceIds,
      created_at: a.createdAt,
      updated_at: a.updatedAt,
    })),
  );
  if (assertionRows.length > 0) {
    const { error: assertionInsertErr } = await supabase.from(EMPLOYEE_ASSERTIONS_TABLE).insert(assertionRows);
    if (assertionInsertErr) {
      console.error('Failed to save employee assertions:', assertionInsertErr);
      return false;
    }
  }

  // Auxiliary collections as separate rows (not single giant payload cell)
  const auxRows = AUX_KEYS.map((key) => ({
    org_id: orgId,
    collection: key,
    payload: payload[key],
    updated_at: now,
  }));
  const { error: auxUpsertErr } = await supabase.from(COLLECTIONS_TABLE).upsert(auxRows, {
    onConflict: 'org_id,collection',
  });
  if (auxUpsertErr) {
    console.error('Failed to save auxiliary collections:', auxUpsertErr);
    return false;
  }

  return true;
}

export async function upsertTalentDepartment(
  department: Department,
  orgId = DEFAULT_ORG_ID,
): Promise<boolean> {
  const now = new Date().toISOString();
  const row = {
    org_id: orgId,
    dept_id: department.id,
    name: department.name,
    description: department.description ?? null,
    updated_at: now,
  };
  const { error } = await supabase
    .from(DEPARTMENTS_TABLE)
    .upsert(row, { onConflict: 'org_id,dept_id' });
  if (error) {
    console.error('Failed to upsert department:', error);
    return false;
  }
  return true;
}

export async function upsertTalentRole(
  role: Role,
  orgId = DEFAULT_ORG_ID,
): Promise<boolean> {
  const now = new Date().toISOString();
  const roleRow = {
    org_id: orgId,
    role_id: role.id,
    department_id: role.departmentId ?? null,
    name: role.name,
    description: role.description,
    is_hiring: Boolean(role.isHiring),
    source: role.source ?? 'manual',
    onet_soc_code: role.onetSocCode ?? null,
    onet_last_updated_at: role.onetLastUpdatedAt ?? null,
    synced_at: role.syncedAt ?? null,
    updated_at: now,
  };
  const { error } = await supabase
    .from(ROLES_TABLE)
    .upsert(roleRow, { onConflict: 'org_id,role_id' });
  if (error) {
    console.error('Failed to upsert role:', error);
    return false;
  }

  if (role.departmentId) {
    const { error: linkErr } = await supabase
      .from(ROLE_DEPARTMENT_LINKS_TABLE)
      .upsert(
        {
          org_id: orgId,
          role_id: role.id,
          dept_id: role.departmentId,
          updated_at: now,
        },
        { onConflict: 'org_id,role_id,dept_id' },
      );
    if (linkErr && !isMissingColumnError(linkErr, 'updated_at')) {
      console.error('Failed to upsert role-department link:', linkErr);
      return false;
    }
  }
  return true;
}

export async function upsertTalentEmployee(
  employee: Employee,
  orgId = DEFAULT_ORG_ID,
): Promise<boolean> {
  const now = new Date().toISOString();
  const employeeRow = {
    org_id: orgId,
    employee_id: employee.id,
    role_id: employee.roleId,
    name: employee.name,
    avatar_url: employee.avatarUrl ?? null,
    workload: employee.workload ?? null,
    allocation: employee.allocation ?? null,
    privacy: employee.privacy,
    updated_at: now,
  };
  const { error } = await supabase
    .from(EMPLOYEES_TABLE)
    .upsert(employeeRow, { onConflict: 'org_id,employee_id' });
  if (error) {
    console.error('Failed to upsert employee:', error);
    return false;
  }
  return true;
}

export async function reassignEmployeeRole(
  employeeId: string,
  newRoleId: string,
  orgId = DEFAULT_ORG_ID,
): Promise<boolean> {
  const { error } = await supabase
    .from(EMPLOYEES_TABLE)
    .update({
      role_id: newRoleId,
      updated_at: new Date().toISOString(),
    })
    .eq('org_id', orgId)
    .eq('employee_id', employeeId);
  if (error) {
    console.error('Failed to reassign employee role:', error);
    return false;
  }
  return true;
}

export async function deleteTalentDepartmentById(
  departmentId: string,
  orgId = DEFAULT_ORG_ID,
): Promise<boolean> {
  const { error } = await supabase
    .from(DEPARTMENTS_TABLE)
    .delete()
    .eq('org_id', orgId)
    .eq('dept_id', departmentId);
  if (error) {
    console.error('Failed to delete department:', error);
    return false;
  }
  return true;
}

export async function deleteTalentRoleById(
  roleId: string,
  orgId = DEFAULT_ORG_ID,
): Promise<boolean> {
  const { error } = await supabase
    .from(ROLES_TABLE)
    .delete()
    .eq('org_id', orgId)
    .eq('role_id', roleId);
  if (error) {
    console.error('Failed to delete role:', error);
    return false;
  }
  return true;
}

export async function deleteTalentEmployeeById(
  employeeId: string,
  orgId = DEFAULT_ORG_ID,
): Promise<boolean> {
  const { error } = await supabase
    .from(EMPLOYEES_TABLE)
    .delete()
    .eq('org_id', orgId)
    .eq('employee_id', employeeId);
  if (error) {
    console.error('Failed to delete employee:', error);
    return false;
  }
  return true;
}

/**
 * Removes an employee and all references from persisted state (dev/testing).
 * Loads state, strips the employee from employees + assertions and from any
 * collection that references them (plans, personPermits, complianceTrainings,
 * teamBuilds assignments, projects), then saves. Effect: employee never existed.
 */
export async function deleteEmployeeAndReferences(
  employeeId: string,
  orgId = DEFAULT_ORG_ID,
): Promise<boolean> {
  const state = await loadTalentStudioState(orgId);
  if (!state) return false;
  const idx = state.employees.findIndex((e) => e.id === employeeId);
  if (idx === -1) return false;

  const nextEmployees = state.employees.filter((e) => e.id !== employeeId);
  const nextPlans = (state.plans ?? []).filter((p) => p.personId !== employeeId);
  const nextPersonPermits = (state.personPermits ?? []).filter((pp) => pp.personId !== employeeId);
  const nextComplianceTrainings = (state.complianceTrainings ?? []).filter(
    (ct) => ct.personId !== employeeId,
  );
  const nextTeamBuilds = (state.teamBuilds ?? []).map((tb) => ({
    ...tb,
    assignments: tb.assignments.filter((a) => a.employeeId !== employeeId),
  }));
  const nextProjects = (state.projects ?? []).map((p) => ({
    ...p,
    assignedEmployees: (p.assignedEmployees ?? []).filter((id) => id !== employeeId),
    shortlistedEmployees: (p.shortlistedEmployees ?? []).filter((id) => id !== employeeId),
  }));

  const nextState: TalentStudioPersistedState = {
    ...state,
    employees: nextEmployees,
    plans: nextPlans,
    personPermits: nextPersonPermits,
    complianceTrainings: nextComplianceTrainings,
    teamBuilds: nextTeamBuilds,
    projects: nextProjects,
  };

  return saveTalentStudioState(nextState, orgId);
}
