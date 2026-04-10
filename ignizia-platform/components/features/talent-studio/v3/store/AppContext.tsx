import React, { createContext, useContext, useState, useEffect, useMemo, useRef } from 'react';
import { 
  Role, Employee, SkillBucket, DetailedSkill, GapAnalysisResult, Department,
  LearningResource, LearningPlan, OutboxRecord, OutboxTarget,
  Permit, Task, TaskRequirement, PermitSchema, CrewBlueprint,
  SkillAssertion, SkillEvidence, Project, PersonPermit, ComplianceTraining, TeamBuild, CapabilityConfig,
  ProficiencyLevel
} from '../types';
import { 
  SKILL_BUCKETS, SEED_ROLES, SEED_EMPLOYEES, ALL_SKILLS, SEED_DEPARTMENTS,
  SEED_RESOURCES, SEED_PERMITS, SEED_TASKS, SEED_TASK_REQUIREMENTS,
  SEED_PERMIT_SCHEMAS, SEED_CREW_BLUEPRINTS, SEED_PERSON_PERMITS
} from '../data/seed';
import {
  DEFAULT_ORG_ID,
  loadTalentStudioState,
  type TalentStudioPersistedState,
} from '@/lib/talentStudioStorage/supabase';

const uuidv4 = () => crypto.randomUUID();
const readinessKey = (employeeId: string, roleId: string) => `${employeeId}::${roleId}`;

interface ReadinessScore {
  employee_id: string;
  role_id: string;
  readiness_score: number;
}

interface AppContextType {
  buckets: SkillBucket[];
  roles: Role[];
  employees: Employee[];
  departments: Department[];
  allSkills: DetailedSkill[];
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
  
  // Navigation
  currentPage: string;
  setCurrentPage: (page: string) => void;
  params: Record<string, string>;
  setParams: (params: Record<string, string>) => void;
  
  // Actions
  addRole: (role: Role) => void;
  updateRole: (role: Role) => void;
  addEmployee: (employee: Employee) => void;
  updateEmployee: (employee: Employee) => void;
  deleteEmployee: (employeeId: string) => Promise<boolean>;
  addResource: (resource: LearningResource) => void;
  updateResource: (resource: LearningResource) => void;
  createLearningPlan: (plan: Partial<LearningPlan>) => void;
  updateLearningPlan: (plan: LearningPlan) => void;
  addBlueprint: (blueprint: CrewBlueprint) => void;
  updateBlueprint: (blueprint: CrewBlueprint) => void;
  addProject: (project: Project) => void;
  updateProject: (project: Project) => void;
  addOutboxRecord: (target: OutboxTarget, eventType: string, payload: any) => void;
  generateLearningPlan: (
    employeeId: string,
    roleId: string
  ) => Promise<{ ok: boolean; reason?: string; error?: string }>;
  syncOnetRoles: () => Promise<{ ok: boolean; message?: string; error?: string }>;
  
  // Capability Actions
  addTask: (task: Task) => void;
  updateTask: (task: Task) => void;
  updateTaskRequirement: (req: TaskRequirement) => void;
  publishCapabilityConfig: (config: CapabilityConfig) => void;
  
  // Readiness Actions
  updatePermit: (permit: Permit) => void;
  addPersonPermit: (permit: PersonPermit) => void;
  updatePersonPermit: (permit: PersonPermit) => void;
  addComplianceTraining: (training: Omit<ComplianceTraining, 'id' | 'assignedAt'>) => void;
  updateComplianceTraining: (training: ComplianceTraining) => void;
  addTeamBuild: (build: TeamBuild) => void;
  updateTeamBuild: (build: TeamBuild) => void;
  
  // Analysis
  runGapAnalysis: (employeeId: string, targetRoleId?: string) => GapAnalysisResult | null;
  getExpertRanking: (skillIds: string[]) => { employee: Employee; score: number }[];
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [departments, setDepartments] = useState<Department[]>(SEED_DEPARTMENTS);
  const [roles, setRoles] = useState<Role[]>(SEED_ROLES);
  const [employees, setEmployees] = useState<Employee[]>(SEED_EMPLOYEES);
  const [resources, setResources] = useState<LearningResource[]>(SEED_RESOURCES);
  const [plans, setPlans] = useState<LearningPlan[]>([]);
  const [outbox, setOutbox] = useState<OutboxRecord[]>([]);
  const [permits, setPermits] = useState<Permit[]>(SEED_PERMITS);
  const [tasks, setTasks] = useState<Task[]>(SEED_TASKS);
  const [taskRequirements, setTaskRequirements] = useState<TaskRequirement[]>(SEED_TASK_REQUIREMENTS);
  const [permitSchemas, setPermitSchemas] = useState<PermitSchema[]>(SEED_PERMIT_SCHEMAS);
  const [crewBlueprints, setCrewBlueprints] = useState<CrewBlueprint[]>(SEED_CREW_BLUEPRINTS);
  const [projects, setProjects] = useState<Project[]>([]);
  const [personPermits, setPersonPermits] = useState<PersonPermit[]>(SEED_PERSON_PERMITS);
  const [complianceTrainings, setComplianceTrainings] = useState<ComplianceTraining[]>([]);
  const [teamBuilds, setTeamBuilds] = useState<TeamBuild[]>([]);
  const [publishedConfigs, setPublishedConfigs] = useState<CapabilityConfig[]>([]);
  const [readinessByPair, setReadinessByPair] = useState<Record<string, number>>({});

  const [currentPage, setCurrentPage] = useState('dashboard');
  const [params, setParams] = useState<Record<string, string>>({});
  const [storageHydrated, setStorageHydrated] = useState(false);
  const persistTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const mergedAllSkills = useMemo<DetailedSkill[]>(() => {
    const byId = new Map<string, DetailedSkill>();
    for (const skill of ALL_SKILLS) {
      byId.set(skill.id, skill);
    }
    for (const role of roles) {
      for (const requirement of role.requirements) {
        if (!byId.has(requirement.skillId)) {
          byId.set(requirement.skillId, {
            id: requirement.skillId,
            name: requirement.skillName ?? requirement.skillId,
            bucketId: 'onet-synced',
            description: role.source === 'onet' ? `Imported from O*NET role ${role.name}.` : undefined,
          });
        }
      }
    }
    return [...byId.values()];
  }, [roles]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const persisted = await loadTalentStudioState(DEFAULT_ORG_ID);
      if (!persisted || cancelled) {
        setStorageHydrated(true);
        return;
      }
      setDepartments(persisted.departments ?? SEED_DEPARTMENTS);
      setRoles(persisted.roles ?? SEED_ROLES);
      setEmployees(persisted.employees ?? SEED_EMPLOYEES);
      setResources(persisted.resources ?? SEED_RESOURCES);
      setPlans(persisted.plans ?? []);
      setOutbox(persisted.outbox ?? []);
      setPermits(persisted.permits ?? SEED_PERMITS);
      setTasks(persisted.tasks ?? SEED_TASKS);
      setTaskRequirements(persisted.taskRequirements ?? SEED_TASK_REQUIREMENTS);
      setPermitSchemas(persisted.permitSchemas ?? SEED_PERMIT_SCHEMAS);
      setCrewBlueprints(persisted.crewBlueprints ?? SEED_CREW_BLUEPRINTS);
      setProjects(persisted.projects ?? []);
      setPersonPermits(persisted.personPermits ?? SEED_PERSON_PERMITS);
      setComplianceTrainings(persisted.complianceTrainings ?? []);
      setTeamBuilds(persisted.teamBuilds ?? []);
      setPublishedConfigs(persisted.publishedConfigs ?? []);
      setStorageHydrated(true);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const refreshReadinessScores = async (forceRecalcIfEmpty = true): Promise<void> => {
    try {
      const response = await fetch(`/api/talent-studio/readiness-scores?orgId=${DEFAULT_ORG_ID}`, {
        method: 'GET',
        headers: { 'x-org-id': DEFAULT_ORG_ID },
      });
      if (!response.ok) return;
      const payload = (await response.json()) as { scores?: ReadinessScore[] };
      if ((payload.scores?.length ?? 0) === 0 && forceRecalcIfEmpty) {
        await fetch('/api/talent-studio/readiness-scores/recalculate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'x-org-id': DEFAULT_ORG_ID },
          body: JSON.stringify({ orgId: DEFAULT_ORG_ID }),
        });
        await refreshReadinessScores(false);
        return;
      }
      const next: Record<string, number> = {};
      (payload.scores ?? []).forEach((row) => {
        next[readinessKey(row.employee_id, row.role_id)] = Number(row.readiness_score);
      });
      setReadinessByPair(next);
    } catch {
      // Readiness scores are a derived view; ignore transient failures.
    }
  };

  useEffect(() => {
    if (!storageHydrated) return;
    void refreshReadinessScores();
  }, [storageHydrated]);

  const persistedSnapshot = useMemo<TalentStudioPersistedState>(() => ({
    departments,
    roles,
    employees,
    resources,
    plans,
    outbox,
    permits,
    tasks,
    taskRequirements,
    permitSchemas,
    crewBlueprints,
    projects,
    personPermits,
    complianceTrainings,
    teamBuilds,
    publishedConfigs,
  }), [
    departments,
    roles,
    employees,
    resources,
    plans,
    outbox,
    permits,
    tasks,
    taskRequirements,
    permitSchemas,
    crewBlueprints,
    projects,
    personPermits,
    complianceTrainings,
    teamBuilds,
    publishedConfigs,
  ]);

  const persistTalentStateViaApi = async (state: TalentStudioPersistedState): Promise<void> => {
    try {
      const response = await fetch('/api/talent-studio/state', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', 'x-org-id': DEFAULT_ORG_ID },
        body: JSON.stringify({ orgId: DEFAULT_ORG_ID, state }),
      });
      if (response.ok) {
        void refreshReadinessScores();
      }
    } catch {
      // Keep UI responsive; persistence failures are handled server-side and on next refresh.
    }
  };

  useEffect(() => {
    if (!storageHydrated) return;
    if (persistTimerRef.current) {
      clearTimeout(persistTimerRef.current);
    }
    persistTimerRef.current = setTimeout(() => {
      void persistTalentStateViaApi(persistedSnapshot);
    }, 500);
    return () => {
      if (persistTimerRef.current) clearTimeout(persistTimerRef.current);
    };
  }, [persistedSnapshot, storageHydrated]);

  const addRole = (role: Role) => {
    setRoles([...roles, role]);
    addOutboxRecord('factorymind', 'RoleCreated', role);
  };

  const updateRole = (updatedRole: Role) => {
    setRoles(roles.map(r => r.id === updatedRole.id ? updatedRole : r));
    addOutboxRecord('factorymind', 'RoleUpdated', updatedRole);
  };

  const addEmployee = (emp: Employee) => {
    setEmployees([...employees, emp]);
    addOutboxRecord('traceworks_les', 'EmployeeCreated', emp);
  };
  
  const updateEmployee = (updatedEmp: Employee) => {
    setEmployees(employees.map(e => e.id === updatedEmp.id ? updatedEmp : e));
    addOutboxRecord('traceworks_les', 'EmployeeProfileUpdated', updatedEmp);
  };

  const deleteEmployee = async (employeeId: string): Promise<boolean> => {
    try {
      const res = await fetch('/api/talent-studio/delete-employee', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ employeeId }),
      });
      if (!res.ok) return false;
      const persisted = await loadTalentStudioState(DEFAULT_ORG_ID);
      if (persisted) {
        setDepartments(persisted.departments ?? SEED_DEPARTMENTS);
        setRoles(persisted.roles ?? SEED_ROLES);
        setEmployees(persisted.employees ?? SEED_EMPLOYEES);
        setResources(persisted.resources ?? SEED_RESOURCES);
        setPlans(persisted.plans ?? []);
        setOutbox(persisted.outbox ?? []);
        setPermits(persisted.permits ?? SEED_PERMITS);
        setTasks(persisted.tasks ?? SEED_TASKS);
        setTaskRequirements(persisted.taskRequirements ?? SEED_TASK_REQUIREMENTS);
        setPermitSchemas(persisted.permitSchemas ?? SEED_PERMIT_SCHEMAS);
        setCrewBlueprints(persisted.crewBlueprints ?? SEED_CREW_BLUEPRINTS);
        setProjects(persisted.projects ?? []);
        setPersonPermits(persisted.personPermits ?? SEED_PERSON_PERMITS);
        setComplianceTrainings(persisted.complianceTrainings ?? []);
        setTeamBuilds(persisted.teamBuilds ?? []);
        setPublishedConfigs(persisted.publishedConfigs ?? []);
      }
      void refreshReadinessScores();
      setCurrentPage('employees');
      setParams((p) => ({ ...p, empId: '' }));
      return true;
    } catch {
      return false;
    }
  };

  const addResource = (res: LearningResource) => {
    setResources([...resources, res]);
    addOutboxRecord('foundry', 'ResourceAdded', res);
  };

  const addBlueprint = (bp: CrewBlueprint) => {
    setCrewBlueprints([...crewBlueprints, bp]);
    addOutboxRecord('factorymind', 'CrewBlueprintCreated', bp);
  };

  const addOutboxRecord = (target: OutboxTarget, eventType: string, payload: any) => {
    const record: OutboxRecord = {
      id: uuidv4(),
      target,
      eventType,
      createdAt: new Date().toISOString(),
      payload,
      status: 'pending'
    };
    setOutbox(prev => [record, ...prev]);
  };

  const createLearningPlan = (plan: Partial<LearningPlan>) => {
    const newPlan: LearningPlan = {
      id: uuidv4(),
      title: plan.title || 'New Learning Plan',
      scope: plan.scope || 'person',
      personId: plan.personId,
      roleId: plan.roleId,
      teamId: plan.teamId,
      createdBy: 'system',
      status: 'assigned',
      steps: plan.steps || [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    setPlans(prev => [newPlan, ...prev]);
    addOutboxRecord('foundry', 'LearningPlanAssigned', newPlan);
  };

  const updateLearningPlan = (updatedPlan: LearningPlan) => {
    const exists = plans.some(p => p.id === updatedPlan.id);
    if (exists) {
      setPlans(plans.map(p => p.id === updatedPlan.id ? updatedPlan : p));
    } else {
      setPlans(prev => [updatedPlan, ...prev]);
    }
    
    if (updatedPlan.status === 'completed') {
      addOutboxRecord('foundry', 'LearningPlanCompleted', updatedPlan);
      
      // Automatically update employee skills when a plan is completed
      if (updatedPlan.personId) {
        const employee = employees.find(e => e.id === updatedPlan.personId);
        const role = updatedPlan.roleId ? roles.find(r => r.id === updatedPlan.roleId) : null;

        if (employee) {
          const newAssertions = [...employee.assertions];
          let changed = false;

          updatedPlan.steps.forEach(step => {
            if (step.status === 'done') {
              step.targetSkills.forEach(skillId => {
                const req = role?.requirements.find(r => r.skillId === skillId);
                const targetLevel = req ? req.minLevel : 3;

                const existingIdx = newAssertions.findIndex(a => a.skillId === skillId);
                if (existingIdx !== -1) {
                  if (newAssertions[existingIdx].status !== 'confirmed' || newAssertions[existingIdx].level < targetLevel) {
                    newAssertions[existingIdx] = {
                      ...newAssertions[existingIdx],
                      status: 'confirmed',
                      level: Math.max(newAssertions[existingIdx].level, targetLevel) as ProficiencyLevel,
                      updatedAt: new Date().toISOString()
                    };
                    changed = true;
                  }
                } else {
                  newAssertions.push({
                    id: uuidv4(),
                    personId: employee.id,
                    skillId,
                    status: 'confirmed',
                    source: 'training_completion',
                    level: targetLevel as ProficiencyLevel,
                    confidence: 1.0,
                    evidenceIds: [],
                    createdAt: new Date().toISOString(),
                    updatedAt: new Date().toISOString()
                  });
                  changed = true;
                }
              });
            }
          });

          if (changed) {
            updateEmployee({ ...employee, assertions: newAssertions });
          }
        }
      }
    } else {
      addOutboxRecord('foundry', 'LearningPlanUpdated', updatedPlan);
    }
  };

  const updateResource = (updatedRes: LearningResource) => {
    setResources(resources.map(r => r.id === updatedRes.id ? updatedRes : r));
    addOutboxRecord('foundry', 'ResourceUpdated', updatedRes);
  };

  const updateBlueprint = (updatedBp: CrewBlueprint) => {
    setCrewBlueprints(crewBlueprints.map(b => b.id === updatedBp.id ? updatedBp : b));
    addOutboxRecord('factorymind', 'CrewBlueprintUpdated', updatedBp);
  };

  const addTask = (task: Task) => {
    setTasks(prev => [...prev, task]);
    // Ensure requirement exists
    setTaskRequirements(prev => {
      if (prev.some(r => r.taskId === task.id)) return prev;
      return [...prev, { taskId: task.id, roleIds: [], requiredSkills: [], requiredPermits: [] }];
    });
    addOutboxRecord('factorymind', 'TaskCreated', task);
  };

  const updateTask = (updatedTask: Task) => {
    setTasks(prev => prev.map(t => t.id === updatedTask.id ? updatedTask : t));
    addOutboxRecord('factorymind', 'TaskUpdated', updatedTask);
  };

  const updateTaskRequirement = (updatedReq: TaskRequirement) => {
    setTaskRequirements(prev => {
      const exists = prev.some(r => r.taskId === updatedReq.taskId);
      if (exists) {
        return prev.map(r => r.taskId === updatedReq.taskId ? updatedReq : r);
      }
      return [...prev, updatedReq];
    });
    addOutboxRecord('factorymind', 'TaskRequirementUpdated', updatedReq);
  };

  const publishCapabilityConfig = (config: CapabilityConfig) => {
    setPublishedConfigs(prev => [config, ...prev]);
    addOutboxRecord('factorymind', 'CapabilityConfigPublished', config);
  };

  const addProject = (project: Project) => {
    setProjects([...projects, project]);
  };

  const updateProject = (updatedProject: Project) => {
    setProjects(projects.map(p => p.id === updatedProject.id ? updatedProject : p));
  };

  const generateLearningPlan = async (
    employeeId: string,
    roleId: string
  ): Promise<{ ok: boolean; reason?: string; error?: string }> => {
    const employee = employees.find(e => e.id === employeeId);
    const role = roles.find(r => r.id === roleId);
    if (!employee || !role) return { ok: false, error: 'Employee or role not found.' };

    const analysis = runGapAnalysis(employeeId, roleId);
    if (!analysis || analysis.missingSkills.length === 0) {
      return { ok: false, error: 'No missing skills for this role.' };
    }

    const activePlans = plans.filter(p => p.personId === employeeId && p.status !== 'completed');
    const skillsInActivePlans = new Set(activePlans.flatMap(p => p.steps.flatMap(s => s.targetSkills)));

    const missingCandidates = analysis.missingSkills
      .filter(m => !skillsInActivePlans.has(m.skillId))
      .map((m) => {
        const req = role.requirements.find((r) => r.skillId === m.skillId);
        const existing = employee.assertions.find((a) => a.skillId === m.skillId && a.status !== 'rejected');
        return {
          skillId: m.skillId,
          skillName: mergedAllSkills.find((s) => s.id === m.skillId)?.name ?? req?.skillName ?? m.skillId,
          minLevel: m.minLevel,
          currentLevel: existing?.level ?? 0,
          importance: req?.importance ?? null,
          severity: m.severity,
        };
      });

    if (missingCandidates.length === 0) {
      return { ok: false, error: 'All current gaps are already covered by active plans.' };
    }

    try {
      const response = await fetch('/api/talent-studio/generate-learning-plan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          employee: {
            id: employee.id,
            name: employee.name,
            currentRoleName: roles.find((r) => r.id === employee.roleId)?.name ?? 'Current role',
          },
          targetRole: {
            id: role.id,
            name: role.name,
            description: role.description,
          },
          missingSkills: missingCandidates,
          availableSkills: employee.assertions
            .filter((a) => a.status !== 'rejected')
            .map((a) => ({
              skillId: a.skillId,
              skillName: mergedAllSkills.find((s) => s.id === a.skillId)?.name ?? a.skillId,
              level: a.level,
              confidence: a.confidence,
              status: a.status,
            })),
          existingPlanSkillIds: [...skillsInActivePlans],
        }),
      });

      if (!response.ok) {
        const payload = await response.json().catch(() => ({}));
        return { ok: false, error: payload?.error ?? 'Failed to generate plan.' };
      }

      const payload = (await response.json()) as {
        title: string;
        reason: string;
        modules: Array<{
          title: string;
          description?: string;
          provider?: string;
          estimatedHours?: number;
          type?: LearningResource['type'];
          targetSkillIds: string[];
        }>;
      };

      if (!Array.isArray(payload.modules) || payload.modules.length === 0) {
        return { ok: false, error: 'AI returned an empty plan.' };
      }

      const nowIso = new Date().toISOString();
      const newResources: LearningResource[] = payload.modules.map((module) => ({
        id: uuidv4(),
        type: module.type ?? 'course',
        title: module.title,
        description: module.description,
        skillTags: module.targetSkillIds,
        estimatedHours: module.estimatedHours,
        provider: module.provider ?? 'IGNIZIA AI',
      }));

      const newPlan: LearningPlan = {
        id: uuidv4(),
        title: payload.title || `Impact Plan for ${role.name}`,
        personId: employeeId,
        roleId: roleId,
        scope: 'person',
        createdBy: 'ignizia-ai',
        status: 'assigned',
        steps: newResources.map((resource) => ({
          id: uuidv4(),
          resourceId: resource.id,
          targetSkills: resource.skillTags,
          status: 'todo' as const,
        })),
        createdAt: nowIso,
        updatedAt: nowIso,
      };

      setResources((prev) => [...newResources, ...prev]);
      setPlans((prev) => [newPlan, ...prev]);
      addOutboxRecord('foundry', 'LearningPlanAssigned', newPlan);
      return { ok: true, reason: payload.reason };
    } catch (error) {
      return { ok: false, error: error instanceof Error ? error.message : String(error) };
    }
  };

  const syncOnetRoles = async (): Promise<{ ok: boolean; message?: string; error?: string }> => {
    try {
      const response = await fetch('/api/onet/roles-sync', { method: 'POST' });
      const payload = await response.json();
      if (!response.ok || !payload?.ok) {
        return { ok: false, error: payload?.error ?? 'Failed to sync O*NET roles.' };
      }

      if (Array.isArray(payload.roles)) setRoles(payload.roles);
      if (Array.isArray(payload.employees)) setEmployees(payload.employees);
      if (Array.isArray(payload.taskRequirements)) setTaskRequirements(payload.taskRequirements);
      if (Array.isArray(payload.crewBlueprints)) setCrewBlueprints(payload.crewBlueprints);
      if (Array.isArray(payload.teamBuilds)) setTeamBuilds(payload.teamBuilds);
      if (Array.isArray(payload.plans)) setPlans(payload.plans);

      addOutboxRecord('factorymind', 'OnetRolesSynced', {
        roleCount: payload.roleCount,
        employeeCount: payload.employeeCount,
        syncedAt: payload.syncedAt,
      });
      return { ok: true, message: payload.message ?? 'O*NET roles synced.' };
    } catch (error) {
      return { ok: false, error: error instanceof Error ? error.message : String(error) };
    }
  };

  const updatePersonPermit = (updatedPermit: PersonPermit) => {
    setPersonPermits(prev => prev.map(p => p.id === updatedPermit.id ? updatedPermit : p));
    addOutboxRecord('orchestrator', 'PermitUpdated', updatedPermit);
  };

  const addPersonPermit = (newPermit: PersonPermit) => {
    setPersonPermits(prev => [...prev, newPermit]);
    addOutboxRecord('orchestrator', 'PermitCreated', newPermit);
  };

  const updatePermit = (updatedPermit: Permit) => {
    setPermits(prev => prev.map(p => p.id === updatedPermit.id ? updatedPermit : p));
    addOutboxRecord('orchestrator', 'PermitSchemaUpdated', updatedPermit);
  };

  const addComplianceTraining = (training: Omit<ComplianceTraining, 'id' | 'assignedAt'>) => {
    const newTraining: ComplianceTraining = {
      ...training,
      id: uuidv4(),
      assignedAt: new Date().toISOString()
    };
    setComplianceTrainings(prev => [...prev, newTraining]);
    addOutboxRecord('foundry', 'ComplianceTrainingAssigned', newTraining);
  };

  const updateComplianceTraining = (updatedTraining: ComplianceTraining) => {
    setComplianceTrainings(prev => prev.map(t => t.id === updatedTraining.id ? updatedTraining : t));
    addOutboxRecord('foundry', 'ComplianceTrainingUpdated', updatedTraining);
  };

  const addTeamBuild = (build: TeamBuild) => {
    setTeamBuilds(prev => [...prev, build]);
    addOutboxRecord('orchestrator', 'TeamBuildCreated', build);
  };

  const updateTeamBuild = (updatedBuild: TeamBuild) => {
    setTeamBuilds(prev => prev.map(b => b.id === updatedBuild.id ? updatedBuild : b));
    addOutboxRecord('orchestrator', 'TeamBuildUpdated', updatedBuild);
  };

  const runGapAnalysis = (employeeId: string, targetRoleId?: string): GapAnalysisResult | null => {
    const employee = employees.find(e => e.id === employeeId);
    if (!employee) return null;

    const roleId = targetRoleId || employee.roleId;
    const role = roles.find(r => r.id === roleId);
    if (!role) return null;

    // Only compare against skills that are relevant for this role (exclude notRelevant from O*NET)
    const relevantReqs = role.requirements.filter(req => req.notRelevant !== true);

    const missingSkills: GapAnalysisResult['missingSkills'] = [];
    relevantReqs.forEach(req => {
      const assertion = employee.assertions.find(a => a.skillId === req.skillId);

      if (!assertion || assertion.status === 'rejected') {
        const weight = req.weight || 1;
        missingSkills.push({ skillId: req.skillId, severity: weight * req.minLevel, minLevel: req.minLevel });
        return;
      }

      if (assertion.level < req.minLevel) {
        const weight = req.weight || 1;
        missingSkills.push({ skillId: req.skillId, severity: weight * (req.minLevel - assertion.level), minLevel: req.minLevel });
      }
    });

    const matchedCount = relevantReqs.length - missingSkills.length;
    const coverageRatio = relevantReqs.length === 0 ? 1 : matchedCount / relevantReqs.length;
    const fallbackReadiness = Math.round(Math.min(95, Math.max(35, 35 + coverageRatio * 60)));
    const finalScore =
      readinessByPair[readinessKey(employeeId, roleId)] ??
      fallbackReadiness;

    const bucketAnalysis = SKILL_BUCKETS.map(bucket => {
      const bucketSkillIds = bucket.skills.map(s => s.id);
      const requiredInBucket = relevantReqs.filter(req => bucketSkillIds.includes(req.skillId));
      
      if (requiredInBucket.length === 0) return null;

      const matchedInBucket = requiredInBucket.filter(req => {
        const a = employee.assertions.find(a => a.skillId === req.skillId);
        return a && a.status === 'confirmed' && a.level >= req.minLevel;
      });

      const missingInBucket = requiredInBucket.filter(req => {
        const a = employee.assertions.find(a => a.skillId === req.skillId);
        return !a || a.status !== 'confirmed' || a.level < req.minLevel;
      });

      return {
        bucketId: bucket.id,
        bucketName: bucket.name,
        requiredCount: requiredInBucket.length,
        matchedCount: matchedInBucket.length,
        coverage: Math.round((matchedInBucket.length / requiredInBucket.length) * 100),
        missingSkills: bucket.skills.filter(s => missingInBucket.some(m => m.skillId === s.id))
      };
    }).filter(Boolean) as GapAnalysisResult['bucketAnalysis'];

    if (bucketAnalysis.length === 0 && relevantReqs.length > 0) {
      const missingSkillsFallback = relevantReqs
        .filter(req => missingSkills.some(m => m.skillId === req.skillId))
        .map(req => mergedAllSkills.find(s => s.id === req.skillId))
        .filter(Boolean) as DetailedSkill[];

      bucketAnalysis.push({
        bucketId: 'onet-synced',
        bucketName: 'O*NET Synced Skills',
        requiredCount: relevantReqs.length,
        matchedCount: relevantReqs.length - missingSkills.length,
        coverage: Math.round(((relevantReqs.length - missingSkills.length) / relevantReqs.length) * 100),
        missingSkills: missingSkillsFallback,
      });
    }

    return {
      roleId,
      overallReadiness: finalScore,
      totalRequired: relevantReqs.length,
      totalMatched: matchedCount,
      missingSkills: missingSkills.sort((a, b) => b.severity - a.severity),
      bucketAnalysis
    };
  };

  const getExpertRanking = (skillIds: string[]) => {
    return employees.map(emp => {
      let score = 0;
      skillIds.forEach(sid => {
        const a = emp.assertions.find(a => a.skillId === sid && a.status === 'confirmed');
        if (a) {
          const lastUsed = a.lastUsedAt ? new Date(a.lastUsedAt) : new Date(0);
          const daysSinceUsed = (new Date().getTime() - lastUsed.getTime()) / (1000 * 3600 * 24);
          const recencyFactor = daysSinceUsed <= 30 ? 1.0 : 0.8;
          score += a.level * a.confidence * recencyFactor;
        }
      });
      return { employee: emp, score };
    }).sort((a, b) => b.score - a.score);
  };

  return (
    <AppContext.Provider value={{
      buckets: SKILL_BUCKETS,
      roles,
      employees,
      departments,
      allSkills: mergedAllSkills,
      resources,
      plans,
      outbox,
      permits,
      tasks,
      taskRequirements,
      permitSchemas,
      crewBlueprints,
      projects,
      personPermits,
      complianceTrainings,
      teamBuilds,
      publishedConfigs,
      currentPage,
      setCurrentPage,
      params,
      setParams,
      addRole,
      updateRole,
      addEmployee,
      updateEmployee,
      deleteEmployee,
      addResource,
      updateResource,
      addBlueprint,
      updateBlueprint,
      addProject,
      updateProject,
      addOutboxRecord,
      createLearningPlan,
      updateLearningPlan,
      generateLearningPlan,
      syncOnetRoles,
      addTask,
      updateTask,
      updateTaskRequirement,
      publishCapabilityConfig,
      updatePermit,
      addPersonPermit,
      updatePersonPermit,
      addComplianceTraining,
      updateComplianceTraining,
      addTeamBuild,
      updateTeamBuild,
      runGapAnalysis,
      getExpertRanking
    }}>
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const context = useContext(AppContext);
  if (context === undefined) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
}
