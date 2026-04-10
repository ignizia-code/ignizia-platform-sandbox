import type { TalentStudioPersistedState } from '@/lib/talentStudioStorage/supabase';
import type { LearningPlan, LearningResource, ProficiencyLevel } from '@/components/features/talent-studio/v3/types';

export type EmployeeModule = {
  stepId: string;
  title: string;
  status: LearningPlan['steps'][number]['status'];
  estimatedHours: number | null;
  resourceType: LearningResource['type'] | 'unknown';
};

export type EmployeeCourse = {
  planId: string;
  title: string;
  status: LearningPlan['status'];
  totalModules: number;
  completedModules: number;
  modules: EmployeeModule[];
};

export function projectEmployeeCourses(
  personId: string,
  plans: LearningPlan[],
  resources: LearningResource[]
): EmployeeCourse[] {
  const courses = plans
    .filter((plan) => plan.personId === personId && plan.steps.length > 0)
    .map((plan) => {
      const modules: EmployeeModule[] = plan.steps.map((step) => {
        const resource = resources.find((item) => item.id === step.resourceId);
        return {
          stepId: step.id,
          title: resource?.title ?? `Module ${step.id.slice(0, 6)}`,
          status: step.status,
          estimatedHours: resource?.estimatedHours ?? null,
          resourceType: resource?.type ?? 'unknown',
        };
      });
      const completedModules = modules.filter((module) => module.status === 'done').length;
      return {
        planId: plan.id,
        title: plan.title,
        status: plan.status,
        totalModules: modules.length,
        completedModules,
        modules,
      };
    });

  return courses.sort((a, b) => {
    const aDone = a.status === 'completed' ? 1 : 0;
    const bDone = b.status === 'completed' ? 1 : 0;
    if (aDone !== bDone) return aDone - bDone;
    return a.title.localeCompare(b.title);
  });
}

export function updatePlanModuleProgress(
  state: TalentStudioPersistedState,
  args: {
    planId: string;
    stepId: string;
    markDone: boolean;
  }
): TalentStudioPersistedState {
  let completedPlanPersonId: string | null = null;
  let completedPlanRoleId: string | null = null;
  let completedPlanSteps: LearningPlan['steps'] = [];

  const plans = state.plans.map((plan) => {
    if (plan.id !== args.planId) return plan;

    const steps = plan.steps.map((step) => {
      if (step.id !== args.stepId) return step;
      if (args.markDone) {
        return { ...step, status: 'done' as const, completedAt: new Date().toISOString() };
      }
      return { ...step, status: 'todo' as const, completedAt: undefined };
    });

    const allDone = steps.every((step) => step.status === 'done');
    const anyStarted = steps.some((step) => step.status === 'done' || step.status === 'doing');
    const status: LearningPlan['status'] = allDone ? 'completed' : anyStarted ? 'in_progress' : 'assigned';
    const updatedPlan = { ...plan, steps, status, updatedAt: new Date().toISOString() };
    if (allDone) {
      completedPlanPersonId = updatedPlan.personId ?? null;
      completedPlanRoleId = updatedPlan.roleId ?? null;
      completedPlanSteps = updatedPlan.steps;
    }
    return updatedPlan;
  });

  let employees = state.employees;
  if (completedPlanPersonId) {
    const employee = employees.find((item) => item.id === completedPlanPersonId);
    const role = completedPlanRoleId ? state.roles.find((item) => item.id === completedPlanRoleId) : null;

    if (employee) {
      const nextAssertions = [...employee.assertions];
      let changed = false;

      completedPlanSteps.forEach((step) => {
        if (step.status !== 'done') return;
        step.targetSkills.forEach((skillId) => {
          const requirement = role?.requirements.find((item) => item.skillId === skillId);
          const targetLevel = (requirement?.minLevel ?? 3) as ProficiencyLevel;
          const idx = nextAssertions.findIndex((item) => item.skillId === skillId);
          if (idx >= 0) {
            const existing = nextAssertions[idx];
            if (existing.status !== 'confirmed' || existing.level < targetLevel) {
              nextAssertions[idx] = {
                ...existing,
                status: 'confirmed',
                level: Math.max(existing.level, targetLevel) as ProficiencyLevel,
                updatedAt: new Date().toISOString(),
              };
              changed = true;
            }
            return;
          }

          nextAssertions.push({
            id: crypto.randomUUID(),
            personId: employee.id,
            skillId,
            status: 'confirmed',
            source: 'training_completion',
            level: targetLevel,
            confidence: 1,
            evidenceIds: [],
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          });
          changed = true;
        });
      });

      if (changed) {
        employees = employees.map((item) =>
          item.id === employee.id ? { ...item, assertions: nextAssertions } : item
        );
      }
    }
  }

  return {
    ...state,
    plans,
    employees,
  };
}
