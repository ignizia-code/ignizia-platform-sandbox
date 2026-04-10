import React, { useState, useMemo } from 'react';
import { useApp } from '../store/AppContext';
import {
  BookOpen,
  Users,
  Target,
  Plus,
  CheckCircle2,
  Clock,
  PlayCircle,
  X,
  Info,
  ArrowRight,
  Sparkles,
  AlertCircle,
  GraduationCap,
  ChevronRight,
  Briefcase,
  Zap,
  TrendingUp,
  ChevronDown,
} from 'lucide-react';
import { cn } from '../lib/utils';
import { LearningResource } from '../types';

/* ------------------------------------------------------------------ */
/*  Constants                                                          */
/* ------------------------------------------------------------------ */

const RESOURCE_ACCENT: Record<string, { bg: string; text: string; icon: React.ReactNode }> = {
  course: { bg: 'bg-action/10 border-action/20', text: 'text-action', icon: <BookOpen size={16} /> },
  mentor: { bg: 'bg-success/10 border-success/20', text: 'text-success', icon: <Users size={16} /> },
  project: { bg: 'bg-warning/10 border-warning/20', text: 'text-warning', icon: <Briefcase size={16} /> },
  simulation_drill: { bg: 'bg-danger/10 border-danger/20', text: 'text-danger', icon: <Target size={16} /> },
};

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export default function LearningHub() {
  const {
    resources,
    plans,
    updateLearningPlan,
    employees,
    roles,
    addResource,
    allSkills,
    runGapAnalysis,
    generateLearningPlan,
    setCurrentPage,
    setParams,
  } = useApp();

  const [selectedResource, setSelectedResource] = useState<LearningResource | null>(null);
  const [dismissedEmpIds, setDismissedEmpIds] = useState<Set<string>>(new Set());
  const [showAllPlans, setShowAllPlans] = useState(false);
  const [isAddingResource, setIsAddingResource] = useState(false);
  const [newResource, setNewResource] = useState({
    title: '',
    description: '',
    type: 'course' as LearningResource['type'],
    skillTags: [] as string[],
  });

  /* ---- Gap Intelligence ---- */
  const gapInsights = useMemo(() => {
    return employees
      .map((emp) => {
        const role = roles.find((r) => r.id === emp.roleId);
        if (!role || role.requirements.length === 0) return null;

        const analysis = runGapAnalysis(emp.id, emp.roleId);
        if (!analysis || analysis.missingSkills.length === 0) return null;

        const hasActivePlan = plans.some(
          (p) => p.personId === emp.id && p.status !== 'completed',
        );
        const topGapSkill = allSkills.find((s) => s.id === analysis.missingSkills[0]?.skillId);
        const recommendedResource = resources.find((r) =>
          r.skillTags.includes(analysis.missingSkills[0]?.skillId),
        );

        return {
          employee: emp,
          role,
          analysis,
          hasActivePlan,
          topGapSkill,
          recommendedResource,
        };
      })
      .filter((x): x is NonNullable<typeof x> => x !== null)
      .sort((a, b) => b.analysis.missingSkills.length - a.analysis.missingSkills.length);
  }, [employees, roles, plans, resources, allSkills]);

  const needsAttention = gapInsights.filter(
    (g) => !g.hasActivePlan && !dismissedEmpIds.has(g.employee.id),
  );

  /* ---- Metrics ---- */
  const activePlans = plans.filter((p) => p.status !== 'completed');
  const allSteps = plans.flatMap((p) => p.steps);
  const doneSteps = allSteps.filter((s) => s.status === 'done').length;
  const avgProgress = allSteps.length > 0 ? Math.round((doneSteps / allSteps.length) * 100) : 0;

  /* ---- Plan step completion ---- */
  const completeNextStep = (planId: string) => {
    const plan = plans.find((p) => p.id === planId);
    if (!plan) return;
    const nextStep = plan.steps.find((s) => s.status !== 'done');
    if (!nextStep) return;

    const newSteps = plan.steps.map((s) =>
      s.id === nextStep.id
        ? { ...s, status: 'done' as const, completedAt: new Date().toISOString() }
        : s,
    );
    const allDone = newSteps.every((s) => s.status === 'done');
    updateLearningPlan({ ...plan, steps: newSteps, status: allDone ? 'completed' : 'in_progress' });
  };

  const undoStep = (planId: string, stepId: string) => {
    const plan = plans.find((p) => p.id === planId);
    if (!plan) return;
    const newSteps = plan.steps.map((s) =>
      s.id === stepId ? { ...s, status: 'todo' as const, completedAt: undefined } : s,
    );
    updateLearningPlan({ ...plan, steps: newSteps, status: 'in_progress' });
  };

  /* ---- Resource handlers ---- */
  const handleAddResource = () => {
    if (!newResource.title) return;
    addResource({
      id: crypto.randomUUID(),
      ...newResource,
      skillTags: newResource.skillTags.length > 0 ? newResource.skillTags : [allSkills[0]?.id || ''],
      estimatedHours: 4,
      provider: 'Internal Academy',
    });
    setIsAddingResource(false);
    setNewResource({ title: '', description: '', type: 'course', skillTags: [] });
  };

  const visiblePlans = showAllPlans ? activePlans : activePlans.slice(0, 3);

  /* ---------------------------------------------------------------- */
  /*  Render                                                           */
  /* ---------------------------------------------------------------- */
  return (
    <div className="space-y-6 pb-10">
      {/* ============================================================ */}
      {/*  Header                                                       */}
      {/* ============================================================ */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Learning Hub</h1>
        <p className="text-slate-500 dark:text-slate-400 text-sm mt-0.5">
          AI-powered upskilling pathways across your workforce.
        </p>
      </div>

      {/* ============================================================ */}
      {/*  Metrics Strip                                                */}
      {/* ============================================================ */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-4 flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-danger/10 flex items-center justify-center flex-shrink-0">
            <AlertCircle size={18} className="text-danger" />
          </div>
          <div>
            <p className="text-xl font-bold text-slate-900 dark:text-slate-100">
              {gapInsights.filter((g) => !g.hasActivePlan).length}
            </p>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">Need upskilling</p>
          </div>
        </div>
        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-4 flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-action/10 flex items-center justify-center flex-shrink-0">
            <GraduationCap size={18} className="text-action" />
          </div>
          <div>
            <p className="text-xl font-bold text-slate-900 dark:text-slate-100">{activePlans.length}</p>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">Active plans</p>
          </div>
        </div>
        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-4 flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-success/10 flex items-center justify-center flex-shrink-0">
            <TrendingUp size={18} className="text-success" />
          </div>
          <div>
            <p className="text-xl font-bold text-slate-900 dark:text-slate-100">{avgProgress}%</p>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">Avg progress</p>
          </div>
        </div>
        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-4 flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-warning/10 flex items-center justify-center flex-shrink-0">
            <BookOpen size={18} className="text-warning" />
          </div>
          <div>
            <p className="text-xl font-bold text-slate-900 dark:text-slate-100">{resources.length}</p>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">Resources</p>
          </div>
        </div>
      </div>

      {/* ============================================================ */}
      {/*  AI Learning Advisor                                          */}
      {/* ============================================================ */}
      <div>
        <div className="flex items-center gap-2 mb-3">
          <Sparkles size={14} className="text-brand-orange" />
          <span className="text-[11px] font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500">
            IGNIZIA Learning Advisor
          </span>
        </div>

        {needsAttention.length === 0 ? (
          <div className="bg-success/5 dark:bg-success/10 border border-success/20 rounded-xl p-6 flex items-center gap-4">
            <div className="w-10 h-10 rounded-full bg-success/15 flex items-center justify-center flex-shrink-0">
              <CheckCircle2 size={20} className="text-success" />
            </div>
            <div>
              <h3 className="font-semibold text-slate-900 dark:text-slate-100 text-sm">
                All caught up
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Every employee either meets their role requirements or has an active learning plan.
              </p>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            {needsAttention.map((insight) => {
              const { employee, role, analysis, topGapSkill, recommendedResource } = insight;
              const gapCount = analysis.missingSkills.length;
              const severity = gapCount >= 3 ? 'danger' : gapCount >= 2 ? 'warning' : 'success';
              const borderColor =
                severity === 'danger'
                  ? 'border-l-danger'
                  : severity === 'warning'
                    ? 'border-l-warning'
                    : 'border-l-success';

              return (
                <div
                  key={employee.id}
                  className={cn(
                    'bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-4 border-l-4 transition-all hover:shadow-md',
                    borderColor,
                  )}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                      <img
                        src={employee.avatarUrl}
                        alt={employee.name}
                        className="w-10 h-10 rounded-full flex-shrink-0 border border-slate-200 dark:border-slate-700"
                      />
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h4 className="font-bold text-sm text-slate-900 dark:text-slate-100 truncate">
                            {employee.name}
                          </h4>
                          <span className="text-[10px] text-slate-500 dark:text-slate-400">
                            {role.name}
                          </span>
                        </div>

                        {/* Gap tags */}
                        <div className="flex flex-wrap gap-1 mt-1.5">
                          {analysis.missingSkills.slice(0, 3).map((gap) => {
                            const skill = allSkills.find((s) => s.id === gap.skillId);
                            const assertion = employee.assertions.find(
                              (a) => a.skillId === gap.skillId && a.status === 'confirmed',
                            );
                            return (
                              <span
                                key={gap.skillId}
                                className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded border text-[10px] font-medium bg-danger/10 text-danger border-danger/20"
                              >
                                <AlertCircle size={9} />
                                <span className="truncate max-w-[100px]">{skill?.name}</span>
                                {assertion && (
                                  <span className="opacity-70">
                                    L{assertion.level}→L{gap.minLevel}
                                  </span>
                                )}
                                {!assertion && <span className="opacity-70">needs L{gap.minLevel}</span>}
                              </span>
                            );
                          })}
                          {analysis.missingSkills.length > 3 && (
                            <span className="text-[10px] text-slate-400 self-center">
                              +{analysis.missingSkills.length - 3} more
                            </span>
                          )}
                        </div>

                        {/* Recommended resource */}
                        {recommendedResource && (
                          <div className="flex items-center gap-1.5 mt-2 text-[11px] text-slate-500 dark:text-slate-400">
                            <BookOpen size={11} className="text-action flex-shrink-0" />
                            <span className="truncate">
                              Recommended: <span className="font-medium text-slate-700 dark:text-slate-300">{recommendedResource.title}</span>
                              {recommendedResource.estimatedHours && (
                                <span className="text-slate-400"> · {recommendedResource.estimatedHours}h</span>
                              )}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <button
                        onClick={() => generateLearningPlan(employee.id, employee.roleId)}
                        className="px-3 py-1.5 rounded-lg bg-action text-white text-[11px] font-bold hover:bg-brand-blue transition-colors"
                      >
                        Generate Plan
                      </button>
                      <button
                        onClick={() =>
                          setDismissedEmpIds((prev) => new Set([...prev, employee.id]))
                        }
                        className="text-[11px] text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 font-medium transition-colors"
                      >
                        Skip
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ============================================================ */}
      {/*  Active Plans                                                 */}
      {/* ============================================================ */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <GraduationCap size={14} className="text-action" />
            <span className="text-[11px] font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500">
              Active Plans
            </span>
            {activePlans.length > 0 && (
              <span className="text-[10px] font-bold text-action bg-action/10 px-1.5 py-0.5 rounded">
                {activePlans.length}
              </span>
            )}
          </div>
        </div>

        {activePlans.length === 0 ? (
          <div className="bg-slate-50 dark:bg-slate-900/50 border border-dashed border-slate-200 dark:border-slate-700 rounded-xl p-6 text-center">
            <p className="text-sm text-slate-500 dark:text-slate-400">
              No active plans yet. Use the advisor above to generate learning paths from skill gaps.
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {visiblePlans.map((plan) => {
              const emp = employees.find((e) => e.id === plan.personId);
              const role = roles.find((r) => r.id === emp?.roleId);
              const completed = plan.steps.filter((s) => s.status === 'done').length;
              const total = plan.steps.length;
              const progress = total > 0 ? Math.round((completed / total) * 100) : 0;
              const nextStep = plan.steps.find((s) => s.status !== 'done');
              const nextResource = nextStep
                ? resources.find((r) => r.id === nextStep.resourceId)
                : null;

              return (
                <div
                  key={plan.id}
                  className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-4 flex items-center gap-4 flex-wrap"
                >
                  {/* Employee */}
                  <button
                    onClick={() => {
                      setCurrentPage('employee-profile');
                      setParams({ empId: emp?.id || '' });
                    }}
                    className="flex items-center gap-2.5 flex-shrink-0 group"
                  >
                    <img
                      src={emp?.avatarUrl}
                      alt={emp?.name}
                      className="w-9 h-9 rounded-full border border-slate-200 dark:border-slate-700"
                    />
                    <div className="text-left">
                      <p className="text-sm font-bold text-slate-900 dark:text-slate-100 group-hover:text-action transition-colors truncate max-w-[120px]">
                        {emp?.name}
                      </p>
                      <p className="text-[10px] text-slate-400 truncate max-w-[120px]">
                        {role?.name}
                      </p>
                    </div>
                  </button>

                  {/* Progress */}
                  <div className="flex-1 min-w-[140px]">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs text-slate-500 dark:text-slate-400 truncate max-w-[160px]">
                        {plan.title}
                      </span>
                      <span className="text-xs font-bold text-slate-700 dark:text-slate-300 flex-shrink-0 ml-2">
                        {progress}%
                      </span>
                    </div>
                    <div className="h-1.5 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                      <div
                        className={cn(
                          'h-full rounded-full transition-all duration-500',
                          progress >= 100
                            ? 'bg-success'
                            : progress >= 50
                              ? 'bg-action'
                              : 'bg-warning',
                        )}
                        style={{ width: `${progress}%` }}
                      />
                    </div>
                  </div>

                  {/* Step dots */}
                  <div className="hidden md:flex items-center gap-1 flex-shrink-0">
                    {plan.steps.map((step) => (
                      <button
                        key={step.id}
                        onClick={() =>
                          step.status === 'done'
                            ? undoStep(plan.id, step.id)
                            : completeNextStep(plan.id)
                        }
                        title={resources.find((r) => r.id === step.resourceId)?.title}
                        className={cn(
                          'w-5 h-5 rounded-full flex items-center justify-center transition-all text-[8px] font-bold',
                          step.status === 'done'
                            ? 'bg-success/15 text-success hover:bg-success/25'
                            : 'bg-slate-100 dark:bg-slate-800 text-slate-400 hover:bg-action/15 hover:text-action',
                        )}
                      >
                        {step.status === 'done' ? '✓' : '○'}
                      </button>
                    ))}
                  </div>

                  {/* Next action */}
                  {nextStep && nextResource ? (
                    <button
                      onClick={() => completeNextStep(plan.id)}
                      className="px-3 py-1.5 rounded-lg bg-action/10 text-action text-[11px] font-bold hover:bg-action/20 transition-colors flex-shrink-0 flex items-center gap-1"
                    >
                      <Zap size={11} />
                      Complete: {nextResource.title.length > 18 ? nextResource.title.slice(0, 18) + '…' : nextResource.title}
                    </button>
                  ) : (
                    <span className="px-3 py-1.5 rounded-lg bg-success/10 text-success text-[11px] font-bold flex-shrink-0 flex items-center gap-1">
                      <CheckCircle2 size={11} />
                      Done
                    </span>
                  )}
                </div>
              );
            })}
            {activePlans.length > 3 && (
              <button
                onClick={() => setShowAllPlans(!showAllPlans)}
                className="flex items-center gap-1.5 text-sm text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 font-medium transition-colors"
              >
                <ChevronDown
                  size={14}
                  className={cn(
                    'text-action transition-transform',
                    showAllPlans && 'rotate-180',
                  )}
                />
                {showAllPlans ? 'Show less' : `Show ${activePlans.length - 3} more`}
              </button>
            )}
          </div>
        )}
      </div>

      {/* ============================================================ */}
      {/*  Resource Library                                             */}
      {/* ============================================================ */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <BookOpen size={14} className="text-warning" />
            <span className="text-[11px] font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500">
              Resource Library
            </span>
          </div>
          <button
            onClick={() => setIsAddingResource(true)}
            className="flex items-center gap-1 px-3 py-1.5 rounded-lg border border-dashed border-slate-300 dark:border-slate-600 text-xs font-medium text-slate-500 dark:text-slate-400 hover:border-action hover:text-action transition-colors"
          >
            <Plus size={12} />
            Add Resource
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {resources.map((resource) => {
            const accent = RESOURCE_ACCENT[resource.type] || RESOURCE_ACCENT.course;
            return (
              <button
                key={resource.id}
                onClick={() => setSelectedResource(resource)}
                className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-4 text-left hover:shadow-md hover:border-action/30 transition-all group"
              >
                {/* Type badge */}
                <div className="flex items-center justify-between mb-3">
                  <span
                    className={cn(
                      'inline-flex items-center gap-1 px-2 py-0.5 rounded-md border text-[10px] font-bold uppercase tracking-wider',
                      accent.bg,
                      accent.text,
                    )}
                  >
                    {accent.icon}
                    {resource.type.replace('_', ' ')}
                  </span>
                  {resource.estimatedHours && (
                    <span className="text-[10px] text-slate-400 flex items-center gap-0.5">
                      <Clock size={10} />
                      {resource.estimatedHours}h
                    </span>
                  )}
                </div>

                {/* Title */}
                <h4 className="text-sm font-bold text-slate-900 dark:text-slate-100 group-hover:text-action transition-colors line-clamp-2 mb-2">
                  {resource.title}
                </h4>

                {/* Skill impact tags */}
                <div className="flex flex-wrap gap-1 mb-3">
                  {resource.skillTags.slice(0, 2).map((skillId) => {
                    const skill = allSkills.find((s) => s.id === skillId);
                    return (
                      <span
                        key={skillId}
                        className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded border text-[9px] font-medium bg-primary/8 text-primary/80 border-primary/15 dark:bg-primary/15 dark:text-slate-300 dark:border-primary/25"
                      >
                        <TrendingUp size={8} />
                        <span className="truncate max-w-[70px]">{skill?.name}</span>
                      </span>
                    );
                  })}
                  {resource.skillTags.length > 2 && (
                    <span className="text-[9px] text-slate-400 self-center">
                      +{resource.skillTags.length - 2}
                    </span>
                  )}
                </div>

                {/* Provider */}
                <p className="text-[10px] text-slate-400 dark:text-slate-500 truncate">
                  {resource.provider}
                </p>
              </button>
            );
          })}
        </div>
      </div>

      {/* ============================================================ */}
      {/*  Add Resource Modal                                           */}
      {/* ============================================================ */}
      {isAddingResource && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl max-w-md w-full p-6">
            <div className="flex justify-between items-center mb-5">
              <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100">Add Resource</h2>
              <button
                onClick={() => setIsAddingResource(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                <X size={20} />
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-1">
                  Title
                </label>
                <input
                  type="text"
                  value={newResource.title}
                  onChange={(e) => setNewResource({ ...newResource, title: e.target.value })}
                  className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm focus:ring-2 focus:ring-action/50 text-slate-900 dark:text-slate-100"
                  placeholder="e.g. Advanced Data Analytics"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-1">
                  Description
                </label>
                <textarea
                  value={newResource.description}
                  onChange={(e) => setNewResource({ ...newResource, description: e.target.value })}
                  className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm focus:ring-2 focus:ring-action/50 min-h-[80px] text-slate-900 dark:text-slate-100"
                  placeholder="Describe the learning objectives..."
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-1">
                  Type
                </label>
                <select
                  value={newResource.type}
                  onChange={(e) =>
                    setNewResource({ ...newResource, type: e.target.value as LearningResource['type'] })
                  }
                  className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm focus:ring-2 focus:ring-action/50 text-slate-900 dark:text-slate-100"
                >
                  <option value="course">Course</option>
                  <option value="mentor">Mentorship</option>
                  <option value="project">Project</option>
                  <option value="simulation_drill">Simulation Drill</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-1">
                  Target Skills
                </label>
                <div className="flex flex-wrap gap-1.5 max-h-28 overflow-y-auto p-2 border border-slate-100 dark:border-slate-800 rounded-lg bg-slate-50 dark:bg-slate-800/50">
                  {allSkills.slice(0, 12).map((skill) => (
                    <button
                      key={skill.id}
                      onClick={() => {
                        const tags = newResource.skillTags.includes(skill.id)
                          ? newResource.skillTags.filter((id) => id !== skill.id)
                          : [...newResource.skillTags, skill.id];
                        setNewResource({ ...newResource, skillTags: tags });
                      }}
                      className={cn(
                        'text-[10px] font-bold px-2 py-1 rounded-full border transition-all',
                        newResource.skillTags.includes(skill.id)
                          ? 'bg-action border-action text-white'
                          : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 hover:border-action/50',
                      )}
                    >
                      {skill.name}
                    </button>
                  ))}
                </div>
              </div>
              <div className="flex gap-3 pt-2">
                <button
                  onClick={() => setIsAddingResource(false)}
                  className="flex-1 py-2 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 font-bold rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleAddResource}
                  disabled={!newResource.title}
                  className="flex-1 py-2 bg-action text-white font-bold rounded-lg hover:bg-brand-blue disabled:opacity-40 transition-colors"
                >
                  Create Resource
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/*  Resource Detail Modal                                        */}
      {/* ============================================================ */}
      {selectedResource && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between sticky top-0 bg-white dark:bg-slate-900 z-10">
              <div className="flex items-center gap-3">
                <div
                  className={cn(
                    'w-10 h-10 rounded-lg flex items-center justify-center border',
                    RESOURCE_ACCENT[selectedResource.type]?.bg || 'bg-action/10 border-action/20',
                    RESOURCE_ACCENT[selectedResource.type]?.text || 'text-action',
                  )}
                >
                  {selectedResource.type === 'course' ? (
                    <BookOpen size={20} />
                  ) : selectedResource.type === 'mentor' ? (
                    <Users size={20} />
                  ) : selectedResource.type === 'simulation_drill' ? (
                    <Target size={20} />
                  ) : (
                    <Briefcase size={20} />
                  )}
                </div>
                <div>
                  <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100">
                    {selectedResource.title}
                  </h2>
                  <p className="text-xs text-slate-500 dark:text-slate-400 uppercase font-bold tracking-widest">
                    {selectedResource.type.replace('_', ' ')} · {selectedResource.provider}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setSelectedResource(null)}
                className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full text-slate-400 transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            <div className="p-6 space-y-6">
              <div>
                <h3 className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-2">
                  Description
                </h3>
                <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
                  {selectedResource.description}
                </p>
              </div>

              <div>
                <h3 className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-3">
                  Skill Impact
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {selectedResource.skillTags.map((skillId) => {
                    const skill = allSkills.find((s) => s.id === skillId);
                    return (
                      <div
                        key={skillId}
                        className="p-3 bg-action/5 dark:bg-action/10 rounded-xl border border-action/15"
                      >
                        <div className="flex items-center gap-2 text-action font-bold text-sm mb-1.5">
                          <CheckCircle2 size={14} />
                          {skill?.name}
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="h-1.5 flex-1 bg-action/15 rounded-full overflow-hidden">
                            <div className="h-full bg-action w-3/4 rounded-full" />
                          </div>
                          <span className="text-[10px] font-bold text-action">+1 Level</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="bg-slate-50 dark:bg-slate-800/50 p-4 rounded-xl border border-slate-100 dark:border-slate-700">
                <div className="flex items-start gap-3">
                  <Info className="text-action mt-0.5 flex-shrink-0" size={18} />
                  <div>
                    <h4 className="font-bold text-slate-900 dark:text-slate-100 text-sm">
                      Professional Development Journey
                    </h4>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                      Completing this resource provides validated evidence for proficiency advancement
                      and unlocks advanced modules in the pathway.
                    </p>
                  </div>
                </div>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => {
                    alert(
                      `Launching ${selectedResource.title}...\nRedirecting to internal learning management system.`,
                    );
                    setSelectedResource(null);
                  }}
                  className="flex-1 py-2.5 bg-action text-white font-bold rounded-xl hover:bg-brand-blue transition-all flex items-center justify-center gap-2 text-sm"
                >
                  <PlayCircle size={18} />
                  Launch Resource
                </button>
                <button
                  onClick={() => {
                    alert(`${selectedResource.title} added to your personal development plan.`);
                    setSelectedResource(null);
                  }}
                  className="px-5 py-2.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 font-bold rounded-xl hover:bg-slate-50 dark:hover:bg-slate-700 transition-all text-sm"
                >
                  Add to Plan
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
