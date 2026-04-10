'use client';

import { useState, useCallback, useEffect, useMemo } from 'react';
import { useDashboard } from '../DashboardContext';
import { getIgniteConfigForRole } from '@/lib/ignite/roleConfig';
import type { UserRole } from '@/types';
import {
  ExoTwinIdentityCard,
  SkillsPassport,
  CareerPathBuilder,
  CoachingFeed,
  PrivatePlayground,
  PrivacyControlPanel,
  ExoTwinActivityTimeline,
  PortableCredentialsCard,
  TwinConfidenceMeter,
} from '@/components/features/exotwin';
import {
  ExoTwinPlayer,
  MicroLessonCardStack,
  PlaygroundScenarioPanel,
  TeamSessionBoard,
  SkillCortexTeamMap,
  TrainingTimeline,
  TrainingEvidencePanel,
  ScenarioLibrary,
  TrainingImpactPanel,
} from '@/components/features/ignite-academy';
import {
  KudosStream,
  RecognitionBadgesPanel,
  PulseSurveyWidget,
  IdeaPostCard,
  CommunityForumGrid,
  PlaybookShareCards,
  StrategyInfluenceBoard,
  ContributionActivityFeed,
  MentoringCreditsPanel,
  OrganizationSentimentMap,
} from '@/components/features/ignite-exchange';
import type { Employee, Role } from '@/components/features/talent-studio/v3/types';
import { ALL_SKILLS } from '@/components/features/talent-studio/v3/data/seed';
import {
  DEFAULT_ORG_ID,
  loadTalentStudioState,
  type TalentStudioPersistedState,
} from '@/lib/talentStudioStorage/supabase';
import {
  projectEmployeeCourses,
  updatePlanModuleProgress,
} from '@/lib/ignite/academyIntegration';
import { resolveSkillDisplayName } from '@/lib/skills/trustedSkills';

function computeReadiness(employee: Employee | null, role: Role | null): number {
  if (!employee || !role || role.requirements.length === 0) return 0;
  const coverage = role.requirements.map((requirement) => {
    const assertion = employee.assertions.find(
      (item) => item.skillId === requirement.skillId && item.status === 'confirmed'
    );
    if (!assertion) return 0;
    return Math.min(assertion.level / requirement.minLevel, 1);
  });

  const total = coverage.reduce((acc, value) => acc + value, 0);
  return Math.round((total / role.requirements.length) * 100);
}

export default function IgnitePage() {
  const { selectedIgniteApp, loggedEmployee, userRole } = useDashboard();
  const employeeWithAppRole = loggedEmployee as (typeof loggedEmployee & { appRole?: UserRole }) | null;
  const effectiveRole: UserRole = (userRole ?? employeeWithAppRole?.appRole ?? 'Leather Cutter') as UserRole;
  const igniteConfig = useMemo(() => getIgniteConfigForRole(effectiveRole), [effectiveRole]);

  const [talentState, setTalentState] = useState<TalentStudioPersistedState | null>(null);
  const [isLoadingTalentState, setIsLoadingTalentState] = useState(true);
  const [syncError, setSyncError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string | null>(null);

  const [preselectedScenarioId, setPreselectedScenarioId] = useState<string | null>(null);
  const handleStartSimulation = useCallback((scenarioId: string) => {
    setPreselectedScenarioId(scenarioId);
    const el = document.getElementById('private-playground');
    el?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setIsLoadingTalentState(true);
      setSyncError(null);
      const loaded = await loadTalentStudioState(DEFAULT_ORG_ID);
      if (cancelled) return;
      if (!loaded) {
        setTalentState(null);
        setSyncError('Could not load Talent Studio data from Supabase.');
        setIsLoadingTalentState(false);
        return;
      }
      setTalentState(loaded);
      setIsLoadingTalentState(false);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const employees = talentState?.employees ?? [];
  const roles = talentState?.roles ?? [];
  const resources = talentState?.resources ?? [];
  const plans = talentState?.plans ?? [];

  useEffect(() => {
    if (employees.length === 0) return;
    if (!igniteConfig.canSwitchEmployee) {
      if (loggedEmployee?.id && employees.some((e) => e.id === loggedEmployee.id)) {
        setSelectedEmployeeId(loggedEmployee.id);
      } else if (!selectedEmployeeId) {
        setSelectedEmployeeId(employees[0]?.id ?? null);
      }
      return;
    }
    if (loggedEmployee?.id && employees.some((e) => e.id === loggedEmployee.id) && selectedEmployeeId === null) {
      setSelectedEmployeeId(loggedEmployee.id);
      return;
    }
    if (!selectedEmployeeId) setSelectedEmployeeId(employees[0]?.id ?? null);
  }, [employees, selectedEmployeeId, loggedEmployee?.id, igniteConfig.canSwitchEmployee]);

  const selectedEmployee = useMemo(
    () => employees.find((employee) => employee.id === selectedEmployeeId) ?? null,
    [employees, selectedEmployeeId]
  );
  const selectedRole = useMemo(
    () =>
      roles.find((role) => role.id === selectedEmployee?.roleId) ??
      null,
    [roles, selectedEmployee?.roleId]
  );
  const readinessPercent = useMemo(
    () => computeReadiness(selectedEmployee, selectedRole),
    [selectedEmployee, selectedRole]
  );

  const selectedEmployeeCourses = useMemo(() => {
    if (!selectedEmployee) return [];
    return projectEmployeeCourses(selectedEmployee.id, plans, resources);
  }, [selectedEmployee, plans, resources]);

  const selectedEmployeeSkills = useMemo(() => {
    if (!selectedEmployee) return [];
    return selectedEmployee.assertions
      .filter((assertion) => assertion.status === 'confirmed')
      .sort((a, b) => b.level - a.level)
      .slice(0, 8)
      .map((assertion) => {
        const resolvedFromSeed = ALL_SKILLS.find((skill) => skill.id === assertion.skillId)?.name;
        const resolvedFromRole = selectedRole?.requirements.find((r) => r.skillId === assertion.skillId)?.skillName;
        const rawName = resolvedFromSeed ?? resolvedFromRole ?? assertion.skillId;
        const skillName = resolveSkillDisplayName(typeof rawName === 'string' ? rawName : String(rawName), assertion.skillId);
        const needsGrowth =
          selectedRole?.requirements.some(
            (requirement) => requirement.skillId === assertion.skillId && requirement.minLevel > assertion.level
          ) ?? false;

        return {
          name: skillName,
          mastery: Math.min(100, assertion.level * 20),
          lastPracticed: assertion.lastUsedAt
            ? new Date(assertion.lastUsedAt).toLocaleDateString()
            : 'No activity log',
          nextPractice: needsGrowth ? 'Recommended: practice this week' : 'Maintained',
          decay: needsGrowth ? `${(selectedRole?.requirements.find((item) => item.skillId === assertion.skillId)?.minLevel ?? assertion.level) - assertion.level} level gap` : null,
        };
      });
  }, [selectedEmployee, selectedRole]);

  const activeGrowthPath = useMemo(() => {
    if (!selectedEmployee) return 'No active path';
    const activePlan = plans.find((plan) => plan.personId === selectedEmployee.id && plan.status !== 'completed');
    return activePlan?.title ?? 'No active path';
  }, [plans, selectedEmployee]);

  const handleToggleAcademyModule = async (planId: string, stepId: string, markDone: boolean) => {
    if (!talentState) return;
    const nextState = updatePlanModuleProgress(talentState, { planId, stepId, markDone });
    setTalentState(nextState);
    setIsSaving(true);
    setSyncError(null);

    const response = await fetch('/api/talent-studio/state', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', 'x-org-id': DEFAULT_ORG_ID },
      body: JSON.stringify({ orgId: DEFAULT_ORG_ID, state: nextState }),
    });
    const ok = response.ok;
    setIsSaving(false);
    if (!ok) {
      setSyncError('Failed to persist Academy progress to Supabase.');
    }
  };

  const employeeIdentity = (
    <div className="mb-8 rounded-xl border border-slate-200 bg-card-light p-4">
      <div className="mb-2 flex items-center justify-between">
        <h3 className="text-sm font-semibold text-slate-900">Employee Context</h3>
        {isSaving ? (
          <span className="text-xs text-action">Saving progress...</span>
        ) : (
          <span className="text-xs text-slate-500">Source: Talent Studio (Supabase)</span>
        )}
      </div>
      {igniteConfig.canSwitchEmployee && employees.length > 1 && (
        <div className="mb-3">
          <label htmlFor="ignite-employee-select" className="mb-1 block text-xs font-medium text-slate-600">
            View as
          </label>
          <select
            id="ignite-employee-select"
            value={selectedEmployeeId ?? ''}
            onChange={(e) => setSelectedEmployeeId(e.target.value || null)}
            className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-primary focus:outline-none dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100"
          >
            {employees.map((emp) => (
              <option key={emp.id} value={emp.id}>
                {emp.name} {emp.id === loggedEmployee?.id ? '(you)' : ''}
              </option>
            ))}
          </select>
        </div>
      )}
      <div className="rounded-lg border border-slate-200 bg-white px-3 py-2">
        <div className="text-sm font-medium text-slate-900">{selectedEmployee?.name ?? 'No logged-in employee detected'}</div>
        <div className="text-xs text-slate-500">{selectedRole?.name ?? 'Unknown role'}</div>
      </div>
      {syncError && <p className="mt-2 text-xs text-danger">{syncError}</p>}
      {isLoadingTalentState && <p className="mt-2 text-xs text-slate-500">Loading employee data...</p>}
      {!isLoadingTalentState && !selectedEmployee && (
        <p className="mt-2 text-xs text-warning">No logged-in employee context was found.</p>
      )}
    </div>
  );

  if (selectedIgniteApp === 'exchange') {
    return (
      <div className="min-h-full bg-background-light">
        <div className="relative mx-auto max-w-6xl px-4 py-8 md:px-6 lg:px-8">
          <div className="mb-8 grid gap-6 lg:grid-cols-[1fr_320px]">
            <KudosStream />
            <RecognitionBadgesPanel />
          </div>
          <div className="mb-8">
            <PulseSurveyWidget variant={igniteConfig.canSwitchEmployee ? 'team' : 'personal'} />
          </div>
          <div className="mb-8">
            <IdeaPostCard />
          </div>
          <div className="mb-8">
            <CommunityForumGrid />
          </div>
          <div className="mb-8">
            <PlaybookShareCards />
          </div>
          {igniteConfig.exchange.showStrategyInfluenceBoard && (
            <div className="mb-8">
              <StrategyInfluenceBoard />
            </div>
          )}
          <div className="mb-8 grid gap-6 lg:grid-cols-2">
            <ContributionActivityFeed />
            <MentoringCreditsPanel />
          </div>
          {igniteConfig.exchange.showOrganizationSentimentMap && (
            <div className="mb-8">
              <OrganizationSentimentMap />
            </div>
          )}
        </div>
      </div>
    );
  }

  if (selectedIgniteApp === 'academy') {
    return (
      <div className="min-h-full bg-background-light">
        <div className="relative mx-auto max-w-6xl px-4 py-8 md:px-6 lg:px-8">
          {employeeIdentity}
          <div className="mb-8">
            <ExoTwinPlayer
              employeeName={selectedEmployee?.name}
              roleName={selectedRole?.name}
            />
          </div>
          <div className="mb-8">
            <MicroLessonCardStack
              courses={selectedEmployeeCourses}
              onToggleModuleStatus={handleToggleAcademyModule}
            />
          </div>
          <div className="mb-8">
            <PlaygroundScenarioPanel />
          </div>
          {igniteConfig.academy.showTeamSessionBoard && (
            <div className="mb-8">
              <TeamSessionBoard />
            </div>
          )}
          {igniteConfig.academy.showSkillCortexTeamMap && (
            <div className="mb-8">
              <SkillCortexTeamMap />
            </div>
          )}
          <div className="mb-8 grid gap-6 lg:grid-cols-2">
            <TrainingTimeline />
            <TrainingEvidencePanel />
          </div>
          <div className="mb-8">
            <ScenarioLibrary />
          </div>
          <div className="mb-8">
            <TrainingImpactPanel />
          </div>
        </div>
      </div>
    );
  }

  if (selectedIgniteApp !== 'exotwin') {
    return (
      <div className="p-8">
        <h2 className="mb-2 text-2xl font-bold text-slate-900 dark:text-white">Ignite</h2>
        <p className="text-slate-500 dark:text-slate-400">
          This page is a placeholder. Content coming soon.
        </p>
      </div>
    );
  }

  return (
    <div className="min-h-full bg-background-light">
      <div className="relative mx-auto max-w-6xl px-4 py-8 md:px-6 lg:px-8">
        {employeeIdentity}
        {/* ExoTwin Identity Card + Twin Confidence Meter */}
        <div className="mb-8 grid gap-6 lg:grid-cols-[1fr_320px]">
          <ExoTwinIdentityCard
            employeeName={selectedEmployee?.name}
            roleName={selectedRole?.name}
            readinessPercent={readinessPercent}
            growthPathLabel={activeGrowthPath}
          />
          <TwinConfidenceMeter />
        </div>

        {/* 3. Skills Passport */}
        <div id="skills-passport" className="mb-8 scroll-mt-8">
          <SkillsPassport skills={selectedEmployeeSkills} />
        </div>

        {/* 4. Career Path Builder */}
        <div id="career-path-builder" className="mb-8 scroll-mt-8">
          <CareerPathBuilder />
        </div>

        {/* 5. Coaching Feed + 6. Private Playground */}
        <div className="mb-8 grid gap-6 lg:grid-cols-2">
          <CoachingFeed onStartSimulation={handleStartSimulation} />
          <div id="private-playground" className="scroll-mt-8">
            <PrivatePlayground preselectedScenarioId={preselectedScenarioId} />
          </div>
        </div>

        {/* 7. Privacy Controls + 8. Activity Timeline */}
        <div className="mb-8 grid gap-6 lg:grid-cols-2">
          <PrivacyControlPanel />
          <ExoTwinActivityTimeline />
        </div>

        {/* 9. Portable Credentials */}
        <div className="mb-8">
          <PortableCredentialsCard />
        </div>
      </div>
    </div>
  );
}
