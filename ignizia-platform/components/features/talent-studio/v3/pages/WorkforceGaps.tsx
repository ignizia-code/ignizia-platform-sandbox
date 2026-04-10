import React, { useState, useMemo, useEffect } from 'react';
import { useApp } from '../store/AppContext';
import {
  CheckCircle2, AlertCircle, X, Trophy, ChevronDown, ChevronUp,
  Sparkles, UserPlus, GraduationCap, ExternalLink, Crown,
  Users, ArrowRight, Scan, TrendingUp
} from 'lucide-react';
import { cn } from '../lib/utils';
import { Employee, ProficiencyLevel, Department } from '../types';

type SkillMatchResult = 'met' | 'partial' | 'gap';

function getSkillMatch(
  employee: Employee,
  skillId: string,
  minLevel: ProficiencyLevel,
): SkillMatchResult {
  const a = employee.assertions.find(
    (x) => x.skillId === skillId && x.status === 'confirmed',
  );
  if (!a) return 'gap';
  return a.level >= minLevel ? 'met' : 'partial';
}

const MATCH_STYLES: Record<SkillMatchResult, string> = {
  met: 'bg-success/15 text-success border-success/25',
  partial: 'bg-warning/15 text-warning border-warning/25',
  gap: 'bg-danger/15 text-danger border-danger/25',
};

const MATCH_ICON: Record<SkillMatchResult, React.ReactNode> = {
  met: <CheckCircle2 size={10} />,
  partial: <AlertCircle size={10} />,
  gap: <X size={10} />,
};

interface GapRecommendation {
  id: string;
  type: 'move' | 'upskill' | 'hire';
  icon: React.ComponentType<{ size?: number; className?: string }>;
  accentColor: 'action' | 'brand-orange' | 'brand-green';
  title: string;
  reasoning: string;
  gapContext: string;
  impact: string;
  alternativeNote?: string;
  actionLabel: string;
  action: () => void;
}

const MARKET_SUGGESTIONS: Record<string, { skillName: string; reason: string }[]> = {
  'dept-1': [
    { skillName: 'AI Systems Monitoring', reason: 'Trending in manufacturing — 40% of comparable roles now require this (WEF Future of Jobs 2025)' },
  ],
  'dept-2': [
    { skillName: 'Statistical Process Control', reason: 'ISO 9001:2025 revisions emphasize SPC as core competency for quality teams' },
  ],
  'dept-4': [
    { skillName: 'Automated Warehouse Systems', reason: 'Industry shift toward AMR-based logistics — early adopters see 30% throughput gains' },
  ],
};

export default function WorkforceGaps() {
  const {
    allSkills,
    getExpertRanking,
    employees,
    roles,
    departments,
    generateLearningPlan,
    params,
  } = useApp();

  const [selectedDeptId, setSelectedDeptId] = useState('');
  const [focusedGapIdx, setFocusedGapIdx] = useState(0);
  const [showRemaining, setShowRemaining] = useState(false);
  const [podiumReady, setPodiumReady] = useState(false);
  const [dismissedSuggestions, setDismissedSuggestions] = useState<string[]>([]);

  const selectedDept = departments.find((d) => d.id === selectedDeptId);

  const deptRoles = useMemo(
    () => roles.filter((r) => r.departmentId === selectedDeptId),
    [roles, selectedDeptId],
  );

  const deptEmployees = useMemo(
    () => employees.filter((e) => deptRoles.some((r) => r.id === e.roleId)),
    [employees, deptRoles],
  );

  const aggregatedRequirements = useMemo(() => {
    const reqMap = new Map<string, { skillId: string; minLevel: ProficiencyLevel; roleNames: string[] }>();
    deptRoles.forEach((role) => {
      role.requirements.forEach((req) => {
        const existing = reqMap.get(req.skillId);
        if (!existing || req.minLevel > existing.minLevel) {
          reqMap.set(req.skillId, {
            skillId: req.skillId,
            minLevel: req.minLevel,
            roleNames: existing ? [...existing.roleNames, role.name] : [role.name],
          });
        } else {
          existing.roleNames.push(role.name);
        }
      });
    });
    return Array.from(reqMap.values());
  }, [deptRoles]);

  const skillCoverage = useMemo(() => {
    return aggregatedRequirements.map((req) => {
      const covered = deptEmployees.filter((emp) => {
        const a = emp.assertions.find(
          (x) => x.skillId === req.skillId && x.status === 'confirmed' && x.level >= req.minLevel,
        );
        return !!a;
      }).length;
      const total = deptEmployees.length;
      return { ...req, covered, total };
    });
  }, [aggregatedRequirements, deptEmployees]);

  const gaps = useMemo(() => {
    return skillCoverage
      .filter((sc) => sc.covered < sc.total || sc.covered === 0)
      .sort((a, b) => a.covered - b.covered);
  }, [skillCoverage]);

  const focusedGap = gaps[focusedGapIdx] || null;

  const rankings = useMemo(() => {
    if (!focusedGap) return [];
    return getExpertRanking([focusedGap.skillId]);
  }, [focusedGap, getExpertRanking]);

  const topThree = rankings.slice(0, 3);
  const remaining = rankings.slice(3);

  useEffect(() => {
    if (topThree.length > 0) {
      setPodiumReady(false);
      const t = setTimeout(() => setPodiumReady(true), 60);
      return () => clearTimeout(t);
    }
    setPodiumReady(false);
  }, [topThree.length, selectedDeptId, focusedGapIdx]);

  useEffect(() => {
    setFocusedGapIdx(0);
    setPodiumReady(false);
  }, [selectedDeptId]);

  useEffect(() => {
    if (!params.deptId) return;
    if (departments.some((d) => d.id === params.deptId)) {
      setSelectedDeptId(params.deptId);
    }
  }, [params.deptId, departments]);

  const deptHealth = useMemo(() => {
    return departments.map((dept) => {
      const dRoles = roles.filter((r) => r.departmentId === dept.id);
      const dEmps = employees.filter((e) => dRoles.some((r) => r.id === e.roleId));
      const allReqs = dRoles.flatMap((r) => r.requirements);
      if (allReqs.length === 0) return { dept, empCount: dEmps.length, coverage: 100, status: 'green' as const };

      const uniqueSkills = new Map<string, ProficiencyLevel>();
      allReqs.forEach((req) => {
        const existing = uniqueSkills.get(req.skillId);
        if (!existing || req.minLevel > existing) uniqueSkills.set(req.skillId, req.minLevel);
      });

      let metCount = 0;
      uniqueSkills.forEach((minLevel, skillId) => {
        const hasCoverage = dEmps.some((emp) => {
          const a = emp.assertions.find(
            (x) => x.skillId === skillId && x.status === 'confirmed' && x.level >= minLevel,
          );
          return !!a;
        });
        if (hasCoverage) metCount++;
      });
      const coverage = Math.round((metCount / uniqueSkills.size) * 100);
      const status = coverage >= 80 ? 'green' as const : coverage >= 50 ? 'amber' as const : 'red' as const;
      return { dept, empCount: dEmps.length, coverage, status };
    });
  }, [departments, roles, employees]);

  const aiRecommendations = useMemo<GapRecommendation[]>(() => {
    if (!focusedGap || !selectedDept) return [];
    const recs: GapRecommendation[] = [];
    const gapSkill = allSkills.find((s) => s.id === focusedGap.skillId);
    const gapSkillName = gapSkill?.name || 'this skill';

    const otherDeptCandidates = employees
      .filter((emp) => !deptRoles.some((r) => r.id === emp.roleId))
      .map((emp) => {
        const a = emp.assertions.find(
          (x) => x.skillId === focusedGap.skillId && x.status === 'confirmed',
        );
        return { emp, level: a?.level || 0 };
      })
      .filter((c) => c.level >= focusedGap.minLevel)
      .sort((a, b) => b.level - a.level);

    if (otherDeptCandidates.length > 0) {
      const best = otherDeptCandidates[0];
      const bestRole = roles.find((r) => r.id === best.emp.roleId);
      const bestDept = departments.find((d) => d.id === bestRole?.departmentId);
      const sameDeptCount = employees.filter((e) => e.roleId === best.emp.roleId).length;

      recs.push({
        id: 'move-talent',
        type: 'move',
        icon: UserPlus,
        accentColor: 'action',
        title: `Move ${best.emp.name}`,
        reasoning: `${best.emp.name} has ${gapSkillName} at L${best.level}, which meets the L${focusedGap.minLevel} requirement. Currently in ${bestDept?.name || 'another department'}${sameDeptCount > 1 ? ` with ${sameDeptCount - 1} other employee(s) covering similar skills, so disruption risk is low` : ''}.`,
        gapContext: `${selectedDept.name} has ${focusedGap.covered}/${focusedGap.total} coverage for ${gapSkillName}`,
        impact: `Immediately closes the ${gapSkillName} gap and strengthens ${selectedDept.name} readiness`,
        alternativeNote: otherDeptCandidates.length > 1 ? `${otherDeptCandidates.length - 1} other candidate(s) available from other departments` : undefined,
        actionLabel: 'Approve Move',
        action: () => {},
      });
    }

    const nearMissCandidates = deptEmployees
      .map((emp) => {
        const a = emp.assertions.find(
          (x) => x.skillId === focusedGap.skillId && x.status === 'confirmed',
        );
        return { emp, level: a?.level || 0, gap: focusedGap.minLevel - (a?.level || 0) };
      })
      .filter((c) => c.level > 0 && c.level < focusedGap.minLevel)
      .sort((a, b) => a.gap - b.gap);

    if (nearMissCandidates.length > 0) {
      const best = nearMissCandidates[0];
      recs.push({
        id: 'upskill',
        type: 'upskill',
        icon: GraduationCap,
        accentColor: 'brand-orange',
        title: `Upskill ${best.emp.name}`,
        reasoning: `${best.emp.name} already has ${gapSkillName} at L${best.level}, just ${best.gap} level(s) below the L${focusedGap.minLevel} requirement. A targeted learning plan can close this gap without organizational disruption.`,
        gapContext: `${gapSkillName} gap in ${selectedDept.name}`,
        impact: `Grows internal capability and retains institutional knowledge within ${selectedDept.name}`,
        actionLabel: 'Create Plan',
        action: () => {
          const role = deptRoles.find((r) =>
            r.requirements.some((req) => req.skillId === focusedGap.skillId),
          );
          if (role) generateLearningPlan(best.emp.id, role.id);
        },
      });
    }

    const noInternalCoverage = employees.every((emp) => {
      const a = emp.assertions.find(
        (x) => x.skillId === focusedGap.skillId && x.status === 'confirmed',
      );
      return !a || a.level < focusedGap.minLevel - 1;
    });

    if (noInternalCoverage || (otherDeptCandidates.length === 0 && nearMissCandidates.length === 0)) {
      const shadowCandidates = deptEmployees.filter((emp) => {
        const a = emp.assertions.find(
          (x) => x.skillId === focusedGap.skillId && x.status === 'confirmed',
        );
        return a && a.level >= 1;
      });

      recs.push({
        id: 'hire-external',
        type: 'hire',
        icon: ExternalLink,
        accentColor: 'brand-green',
        title: `Hire for ${gapSkillName}`,
        reasoning: `No internal candidate has ${gapSkillName} above L${Math.max(focusedGap.minLevel - 2, 1)}. The department needs L${focusedGap.minLevel}. External hiring is the fastest path to close this critical gap.`,
        gapContext: `Zero viable internal coverage for ${gapSkillName} at the required level`,
        impact: `${shadowCandidates.length > 0 ? `${shadowCandidates.length} current employee(s) could shadow the new hire to build internal capability over time` : 'New hire brings immediate capability and can mentor the team'}`,
        actionLabel: 'Draft Listing',
        action: () => {},
      });
    }

    return recs;
  }, [focusedGap, selectedDept, employees, deptEmployees, deptRoles, allSkills, departments, roles, generateLearningPlan]);

  const STATUS_DOT: Record<string, string> = {
    green: 'bg-success',
    amber: 'bg-warning',
    red: 'bg-danger',
  };

  const ACCENT_STYLES: Record<string, { card: string; btn: string; icon: string }> = {
    action: {
      card: 'bg-action/5 border-action/15 dark:bg-action/10 dark:border-action/20',
      btn: 'bg-action text-white hover:bg-brand-blue',
      icon: 'bg-action/15',
    },
    'brand-orange': {
      card: 'bg-brand-orange/5 border-brand-orange/15 dark:bg-brand-orange/10 dark:border-brand-orange/20',
      btn: 'bg-brand-orange text-white hover:bg-brand-orange/90',
      icon: 'bg-brand-orange/15',
    },
    'brand-green': {
      card: 'bg-brand-green/5 border-brand-green/15 dark:bg-brand-green/10 dark:border-brand-green/20',
      btn: 'bg-brand-green text-white hover:bg-brand-green/90',
      icon: 'bg-brand-green/15',
    },
  };

  const podiumOrder =
    topThree.length >= 3
      ? [{ ...topThree[1], rank: 2 }, { ...topThree[0], rank: 1 }, { ...topThree[2], rank: 3 }]
      : topThree.length === 2
        ? [{ ...topThree[1], rank: 2 }, { ...topThree[0], rank: 1 }]
        : topThree.length === 1
          ? [{ ...topThree[0], rank: 1 }]
          : [];

  return (
    <div className="space-y-5 pb-6">
      <style>{`
        @keyframes wg-fade-up {
          from { opacity: 0; transform: translateY(12px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes wg-shimmer {
          0% { background-position: -200% 0; }
          100% { background-position: 200% 0; }
        }
      `}</style>

      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">
          Workforce Gaps
        </h1>
        <p className="text-slate-500 dark:text-slate-400 text-sm mt-0.5">
          Close capability gaps with internal mobility, upskilling, or targeted hiring
        </p>
      </div>

      {/* Department Selector */}
      <div className="flex gap-3 overflow-x-auto pb-1">
        {deptHealth.map((dh, idx) => {
          const isSelected = dh.dept.id === selectedDeptId;
          return (
            <button
              key={dh.dept.id}
              onClick={() => setSelectedDeptId(dh.dept.id)}
              className={cn(
                'flex-shrink-0 rounded-xl border px-4 py-3 text-left transition-all duration-300 min-w-[180px]',
                isSelected
                  ? 'bg-white dark:bg-slate-900 border-action/40 shadow-lg shadow-action/10 ring-1 ring-action/20'
                  : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 hover:shadow-sm',
              )}
              style={{ animation: `wg-fade-up 0.4s ease-out ${idx * 60}ms both` }}
            >
              <div className="flex items-center justify-between mb-1.5">
                <span className={cn(
                  'text-sm font-bold truncate',
                  isSelected ? 'text-action' : 'text-slate-900 dark:text-slate-100',
                )}>
                  {dh.dept.name}
                </span>
                <span className={cn('w-2 h-2 rounded-full flex-shrink-0 ml-2', STATUS_DOT[dh.status])} />
              </div>
              <div className="flex items-center gap-3 text-[11px] text-slate-500 dark:text-slate-400">
                <span className="flex items-center gap-1">
                  <Users size={11} />
                  {dh.empCount}
                </span>
                <span>{dh.coverage}% covered</span>
              </div>
              {isSelected && (
                <div className="mt-2 h-0.5 rounded-full bg-action/30 overflow-hidden">
                  <div
                    className="h-full rounded-full bg-action transition-all duration-700"
                    style={{ width: `${dh.coverage}%` }}
                  />
                </div>
              )}
            </button>
          );
        })}
      </div>

      {/* Empty State */}
      {!selectedDept && (
        <div className="bg-white dark:bg-slate-900 border border-dashed border-slate-300 dark:border-slate-700 rounded-2xl p-16 text-center">
          <div className="w-14 h-14 bg-action/10 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <Scan size={26} className="text-action" />
          </div>
          <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
            Select a department
          </h3>
          <p className="text-slate-500 dark:text-slate-400 mt-1 max-w-sm mx-auto text-sm">
            Choose a department above to see capability gaps and intelligent recommendations.
          </p>
        </div>
      )}

      {/* Department Selected */}
      {selectedDept && (
        <>
          {/* Requirements Strip */}
          <div className="flex items-start flex-wrap gap-2">
            <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500 mr-1 mt-1.5">
              Requirements
            </span>
            {skillCoverage.map((sc) => {
              const skill = allSkills.find((s) => s.id === sc.skillId);
              const coverageColor =
                sc.covered >= sc.total ? 'bg-success/20 text-success border-success/30'
                : sc.covered > 0 ? 'bg-warning/20 text-warning border-warning/30'
                : 'bg-danger/20 text-danger border-danger/30';
              return (
                <div
                  key={sc.skillId}
                  className="inline-flex items-center gap-1.5 pl-3 pr-2 py-1 rounded-full bg-primary/8 border border-primary/15 text-slate-700 dark:text-slate-200 dark:bg-primary/15 dark:border-primary/25"
                >
                  <span className="text-xs font-medium truncate max-w-[140px]">
                    {skill?.name}
                  </span>
                  <span className="px-1.5 py-0.5 rounded-md bg-action/20 text-action text-[10px] font-bold">
                    L{sc.minLevel}
                  </span>
                  <span className={cn('px-1.5 py-0.5 rounded-md text-[10px] font-bold border', coverageColor)}>
                    {sc.covered}/{sc.total}
                  </span>
                </div>
              );
            })}

            {/* AI Market Suggestions */}
            {MARKET_SUGGESTIONS[selectedDeptId]?.filter((ms) => !dismissedSuggestions.includes(ms.skillName)).map((ms) => (
              <div
                key={ms.skillName}
                className="inline-flex items-center gap-1.5 pl-2 pr-1 py-1 rounded-full bg-brand-orange/10 border border-brand-orange/25 text-brand-orange"
              >
                <Sparkles size={12} className="flex-shrink-0 animate-pulse" />
                <span className="text-xs font-medium truncate max-w-[160px]">
                  {ms.skillName}
                </span>
                <button
                  className="px-1.5 py-0.5 rounded-md bg-brand-orange/20 text-[10px] font-bold hover:bg-brand-orange/30 transition-colors"
                  title={ms.reason}
                >
                  Accept
                </button>
                <button
                  onClick={() => setDismissedSuggestions((prev) => [...prev, ms.skillName])}
                  className="p-0.5 rounded-full hover:bg-danger/20 hover:text-danger text-brand-orange/60 transition-colors"
                >
                  <X size={12} />
                </button>
              </div>
            ))}
          </div>

          {gaps.length === 0 ? (
            <div className="text-center py-12">
              <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-success/10 flex items-center justify-center">
                <CheckCircle2 size={28} className="text-success" />
              </div>
              <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-100 mb-1">
                Full coverage
              </h3>
              <p className="text-sm text-slate-500 dark:text-slate-400 max-w-xs mx-auto">
                {selectedDept.name} has all required skills covered. Keep monitoring for changes.
              </p>
            </div>
          ) : (
            <>
              {/* Gap Focus Tabs */}
              <div className="flex items-center gap-2 overflow-x-auto pb-1">
                <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500 mr-1 flex-shrink-0">
                  Focus Gap
                </span>
                {gaps.map((g, idx) => {
                  const skill = allSkills.find((s) => s.id === g.skillId);
                  const isActive = idx === focusedGapIdx;
                  return (
                    <button
                      key={g.skillId}
                      onClick={() => setFocusedGapIdx(idx)}
                      className={cn(
                        'flex-shrink-0 px-3 py-1.5 rounded-lg text-xs font-medium transition-all border',
                        isActive
                          ? 'bg-danger/10 text-danger border-danger/25 shadow-sm'
                          : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-800 hover:border-slate-300',
                      )}
                    >
                      {skill?.name} <span className="font-bold ml-1">({g.covered}/{g.total})</span>
                    </button>
                  );
                })}
              </div>

              {/* Main Content: Podium + Recommendations */}
              <div className="flex flex-col lg:flex-row gap-5">
                {/* Podium Section */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-5">
                    <Trophy size={16} className="text-brand-orange" />
                    <span className="text-[11px] font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500">
                      Best Internal Candidates
                    </span>
                  </div>

                  <div className="flex items-end justify-center gap-4 lg:gap-6 px-2">
                    {podiumOrder.map((entry, idx) => {
                      const { employee, score, rank } = entry;
                      const empRole = roles.find((r) => r.id === employee.roleId);
                      const empDept = departments.find((d) => d.id === empRole?.departmentId);
                      const isFromOtherDept = empRole?.departmentId !== selectedDeptId;
                      const isFirst = rank === 1;

                      const pedestalColor = isFirst
                        ? 'from-brand-orange to-brand-yellow'
                        : rank === 2
                          ? 'from-brand-blue to-brand-blue/80'
                          : 'from-slate-400 to-slate-500';

                      const pedestalPy = isFirst ? 'py-5' : rank === 2 ? 'py-3.5' : 'py-2.5';
                      const cardWidth = isFirst ? 'w-[280px]' : 'w-[220px]';
                      const avatarSize = isFirst ? 'w-16 h-16' : 'w-12 h-12';
                      const scoreSize = isFirst ? 'w-14 h-14 text-xl' : 'w-11 h-11 text-base';
                      const scoreBg = isFirst
                        ? 'bg-brand-orange shadow-lg shadow-brand-orange/25'
                        : rank === 2
                          ? 'bg-brand-blue shadow-md shadow-brand-blue/20'
                          : 'bg-slate-500';

                      return (
                        <div
                          key={employee.id}
                          className={cn(
                            'flex flex-col rounded-2xl overflow-hidden shadow-md transition-all duration-500 ease-out flex-shrink-0',
                            cardWidth,
                            podiumReady
                              ? 'opacity-100 translate-y-0 scale-100'
                              : 'opacity-0 translate-y-6 scale-95',
                          )}
                          style={{ transitionDelay: `${idx * 120}ms` }}
                        >
                          <div
                            className={cn(
                              'bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 flex-1 flex flex-col',
                              isFirst && 'p-5',
                              'group hover:-translate-y-1 transition-transform duration-300',
                            )}
                          >
                            <div className="flex items-start justify-between mb-3">
                              <div className="flex items-center gap-3">
                                <div className="relative flex-shrink-0">
                                  <div
                                    className={cn(
                                      'rounded-full overflow-hidden border-2',
                                      avatarSize,
                                      isFirst
                                        ? 'border-brand-orange'
                                        : rank === 2
                                          ? 'border-brand-blue'
                                          : 'border-slate-300 dark:border-slate-600',
                                    )}
                                  >
                                    <img src={employee.avatarUrl} alt={employee.name} className="w-full h-full object-cover" />
                                  </div>
                                  {isFirst && (
                                    <div className="absolute -top-2 -right-1 text-brand-orange">
                                      <Crown size={16} fill="currentColor" />
                                    </div>
                                  )}
                                </div>
                                <div className="min-w-0">
                                  <h3 className={cn('font-bold text-slate-900 dark:text-slate-100 truncate', isFirst ? 'text-base' : 'text-sm')}>
                                    {employee.name}
                                  </h3>
                                  <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                                    {empRole?.name || 'No role'}
                                  </p>
                                  {isFromOtherDept && empDept && (
                                    <span className="inline-flex items-center gap-0.5 mt-0.5 px-1.5 py-0.5 bg-action/10 text-action text-[9px] font-bold rounded">
                                      <ArrowRight size={8} />
                                      {empDept.name}
                                    </span>
                                  )}
                                </div>
                              </div>
                              <div className={cn('rounded-full flex items-center justify-center font-bold text-white flex-shrink-0', scoreSize, scoreBg)}>
                                {score.toFixed(1)}
                              </div>
                            </div>

                            {focusedGap && (
                              <div className="flex flex-wrap gap-1 mb-3">
                                {aggregatedRequirements.slice(0, 6).map((req) => {
                                  const skill = allSkills.find((s) => s.id === req.skillId);
                                  const match = getSkillMatch(employee, req.skillId, req.minLevel);
                                  return (
                                    <span
                                      key={req.skillId}
                                      className={cn(
                                        'inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded border text-[10px] font-medium',
                                        MATCH_STYLES[match],
                                        req.skillId === focusedGap.skillId && 'ring-1 ring-offset-1 ring-slate-400',
                                      )}
                                    >
                                      {MATCH_ICON[match]}
                                      <span className="truncate max-w-[80px]">{skill?.name}</span>
                                    </span>
                                  );
                                })}
                              </div>
                            )}

                            <div className="mt-auto flex items-center gap-2">
                              <button className="flex-1 py-1.5 rounded-lg bg-action text-white text-[11px] font-bold hover:bg-brand-blue transition-colors">
                                {isFromOtherDept ? 'Approve Move' : 'View Profile'}
                              </button>
                            </div>
                          </div>

                          <div
                            className={cn(
                              'flex items-center justify-center bg-gradient-to-b text-white font-bold transition-all duration-700 ease-out origin-bottom',
                              pedestalPy,
                              pedestalColor,
                              podiumReady ? 'scale-y-100 opacity-100' : 'scale-y-0 opacity-0',
                            )}
                            style={{ transitionDelay: `${idx * 120 + 300}ms` }}
                          >
                            <span className={cn(isFirst ? 'text-2xl' : 'text-lg')}>{rank}</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* Remaining */}
                  {remaining.length > 0 && (
                    <div className="mt-4">
                      <button
                        onClick={() => setShowRemaining(!showRemaining)}
                        className="flex items-center gap-2 text-sm font-medium text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition-colors"
                      >
                        {showRemaining ? <ChevronUp size={16} className="text-action" /> : <ChevronDown size={16} className="text-action" />}
                        <span>{remaining.length} more candidate{remaining.length > 1 ? 's' : ''}</span>
                      </button>

                      {showRemaining && (
                        <div className="mt-3 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden divide-y divide-slate-100 dark:divide-slate-800 max-h-64 overflow-y-auto">
                          {remaining.map(({ employee, score }, idx) => {
                            const empRole = roles.find((r) => r.id === employee.roleId);
                            const empDept = departments.find((d) => d.id === empRole?.departmentId);
                            const isFromOtherDept = empRole?.departmentId !== selectedDeptId;
                            return (
                              <div key={employee.id} className="flex items-center gap-4 px-4 py-3 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                                <span className="text-xs font-bold text-slate-400 w-5 text-center">#{idx + 4}</span>
                                <img src={employee.avatarUrl} alt={employee.name} className="w-8 h-8 rounded-full flex-shrink-0 border border-slate-200 dark:border-slate-700" />
                                <div className="min-w-0 flex-1">
                                  <p className="text-sm font-semibold text-slate-900 dark:text-slate-100 truncate">{employee.name}</p>
                                  <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                                    {empRole?.name}{isFromOtherDept && empDept ? ` · ${empDept.name}` : ''}
                                  </p>
                                </div>
                                {focusedGap && (
                                  <div className="hidden md:flex items-center gap-1 flex-shrink-0">
                                    {aggregatedRequirements.slice(0, 4).map((req) => {
                                      const match = getSkillMatch(employee, req.skillId, req.minLevel);
                                      return (
                                        <span
                                          key={req.skillId}
                                          className={cn(
                                            'w-2.5 h-2.5 rounded-full flex-shrink-0',
                                            match === 'met' ? 'bg-success' : match === 'partial' ? 'bg-warning' : 'bg-danger/40',
                                          )}
                                          title={allSkills.find((s) => s.id === req.skillId)?.name}
                                        />
                                      );
                                    })}
                                  </div>
                                )}
                                <span className="text-sm font-bold text-slate-600 dark:text-slate-300 flex-shrink-0 w-10 text-right">{score.toFixed(1)}</span>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* AI Recommendations Panel */}
                <div className="lg:w-[380px] flex-shrink-0">
                  <div className="flex items-center gap-2 mb-4">
                    <Sparkles size={14} className="text-brand-orange" />
                    <span className="text-[11px] font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500">
                      IGNIZIA Recommendations
                    </span>
                  </div>

                  <div className="space-y-3 max-h-[520px] overflow-y-auto pr-1">
                    {aiRecommendations.map((rec, idx) => {
                      const styles = ACCENT_STYLES[rec.accentColor];
                      return (
                        <div
                          key={rec.id}
                          className={cn('rounded-xl border p-4 transition-all hover:shadow-md', styles.card)}
                          style={{ animation: `wg-fade-up 0.4s ease-out ${idx * 100 + 200}ms both` }}
                        >
                          <div className="flex items-start gap-3 mb-3">
                            <div className={cn('w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0', styles.icon)}>
                              <rec.icon size={18} />
                            </div>
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-2 mb-0.5">
                                <span className={cn(
                                  'text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded',
                                  rec.type === 'move' ? 'bg-action/15 text-action'
                                    : rec.type === 'upskill' ? 'bg-brand-orange/15 text-brand-orange'
                                    : 'bg-brand-green/15 text-brand-green',
                                )}>
                                  {rec.type === 'move' ? 'Internal Move' : rec.type === 'upskill' ? 'Upskill' : 'External Hire'}
                                </span>
                              </div>
                              <h4 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                                {rec.title}
                              </h4>
                            </div>
                          </div>

                          <p className="text-[11px] text-slate-600 dark:text-slate-300 leading-relaxed mb-2">
                            {rec.reasoning}
                          </p>

                          <div className="space-y-1 mb-3">
                            <div className="flex items-start gap-1.5 text-[10px] text-slate-500 dark:text-slate-400">
                              <TrendingUp size={10} className="flex-shrink-0 mt-0.5 text-brand-green" />
                              <span>{rec.impact}</span>
                            </div>
                            {rec.alternativeNote && (
                              <div className="flex items-start gap-1.5 text-[10px] text-slate-400 dark:text-slate-500">
                                <Users size={10} className="flex-shrink-0 mt-0.5" />
                                <span>{rec.alternativeNote}</span>
                              </div>
                            )}
                          </div>

                          <div className="flex items-center gap-2">
                            <button
                              onClick={rec.action}
                              className={cn('px-3 py-1.5 rounded-lg text-[11px] font-bold transition-colors', styles.btn)}
                            >
                              {rec.actionLabel}
                            </button>
                            <button className="text-[11px] text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 font-medium transition-colors">
                              Dismiss
                            </button>
                          </div>
                        </div>
                      );
                    })}

                    {aiRecommendations.length === 0 && focusedGap && (
                      <div className="text-center py-8 text-sm text-slate-400">
                        Analyzing gap data...
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </>
          )}
        </>
      )}
    </div>
  );
}
