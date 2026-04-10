import { useState, useMemo, useEffect } from 'react';
import { useApp } from '../store/AppContext';
import { 
  ArrowLeft, 
  Check, 
  AlertTriangle, 
  Briefcase, 
  Star, 
  ShieldCheck, 
  Clock, 
  Plus,
  Zap,
  CheckCircle2,
  XCircle,
  Sparkles,
  GraduationCap,
  Compass,
  Target,
  MapPin,
  ExternalLink,
  TrendingUp,
  ChevronDown,
  BookOpen,
  ArrowRight,
  Trash2,
} from 'lucide-react';
import { cn } from '../lib/utils';
import { SkillAssertion, ProficiencyLevel } from '../types';
import { Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer, Legend } from 'recharts';
import type { ChosenCareerPath } from '@/lib/career-flow/types';

export default function EmployeeProfile() {
  const { employees, roles, buckets, allSkills, runGapAnalysis, updateEmployee, generateLearningPlan, updateLearningPlan, resources, plans, setCurrentPage, params, deleteEmployee } = useApp();
  const { empId } = params;
  
  const employee = employees.find(e => e.id === empId);
  const [name, setName] = useState(employee?.name || '');
  const [targetRoleId, setTargetRoleId] = useState<string>(employee?.roleId || '');
  const [activeTab, setActiveTab] = useState<'skills' | 'learning' | 'settings'>('skills');
  const [isManagingSkills, setIsManagingSkills] = useState(false);
  const [aspirationRoleId, setAspirationRoleId] = useState<string>('');
  const [careerFlowPath, setCareerFlowPath] = useState<ChosenCareerPath | null>(null);
  const [isGeneratingPlan, setIsGeneratingPlan] = useState(false);
  const [justGenerated, setJustGenerated] = useState(false);
  const [viewingPlanId, setViewingPlanId] = useState<string | null>(null);
  const [isGeneratingCareerPlan, setIsGeneratingCareerPlan] = useState(false);
  const [expandPathSkills, setExpandPathSkills] = useState(false);
  const [expandLearningCareerSkills, setExpandLearningCareerSkills] = useState(false);
  const [expandPlanDetailSkills, setExpandPlanDetailSkills] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [planGenPhase, setPlanGenPhase] = useState<'building' | 'explain' | null>(null);
  const [planGenReason, setPlanGenReason] = useState('');
  const INITIAL_SKILLS_VISIBLE = 4;

  useEffect(() => {
    try {
      const stored = localStorage.getItem('ignizia_career_aspiration');
      if (stored) {
        const parsed: ChosenCareerPath = JSON.parse(stored);
        if (parsed.employeeId === empId) {
          setCareerFlowPath(parsed);
        }
      }
    } catch { /* ignore */ }
  }, [empId]);
  const [newSkill, setNewSkill] = useState<{ skillId: string; level: ProficiencyLevel; status: 'confirmed' | 'proposed'; notes: string }>({ 
    skillId: '', 
    level: 1, 
    status: 'confirmed', 
    notes: '' 
  });

  const employeePlans = useMemo(() => {
    return plans.filter(p => p.personId === empId);
  }, [plans, empId]);

  const analysis = useMemo(() => {
    if (!employee || !targetRoleId) return null;
    return runGapAnalysis(employee.id, targetRoleId);
  }, [employee, targetRoleId, employees, roles]);

  const aspirationAnalysis = useMemo(() => {
    if (!employee || !aspirationRoleId) return null;
    return runGapAnalysis(employee.id, aspirationRoleId);
  }, [employee, aspirationRoleId, employees, roles]);

  const provenanceCounts = useMemo(() => {
    if (!employee) return {};
    const counts: Record<string, number> = {};
    employee.assertions.filter(a => a.status !== 'rejected').forEach(a => {
      counts[a.source] = (counts[a.source] || 0) + 1;
    });
    return counts;
  }, [employee]);

  const fullGaps = useMemo(() => {
    if (!employee || !analysis) return [];
    return analysis.missingSkills.filter(gap =>
      !employee.assertions.find(a => a.skillId === gap.skillId && a.status !== 'rejected')
    );
  }, [employee, analysis]);

  if (!employee) return <div className="p-8 text-center text-slate-500">Employee not found</div>;

  const targetRole = roles.find(r => r.id === targetRoleId);
  const aspirationRole = roles.find(r => r.id === aspirationRoleId);
  const activeSkills = employee.assertions.filter(a => a.status !== 'rejected');
  const confirmedSkills = employee.assertions.filter(a => a.status === 'confirmed');
  const proposedSkills = employee.assertions.filter(a => a.status === 'proposed');

  const handleAssertionStatus = (skillId: string, status: 'confirmed' | 'rejected') => {
    let updatedAssertions;
    if (status === 'rejected') {
      updatedAssertions = employee.assertions.filter(a => a.skillId !== skillId);
    } else {
      updatedAssertions = employee.assertions.map(a => 
        a.skillId === skillId ? { ...a, status } : a
      );
    }
    updateEmployee({ ...employee, assertions: updatedAssertions });
  };

  const handleSaveName = () => {
    updateEmployee({ ...employee, name });
  };

  const handleCreatePlan = async (roleId: string = targetRoleId) => {
    setIsGeneratingPlan(true);
    setPlanGenPhase('building');
    setPlanGenReason('');
    const result = await generateLearningPlan(employee.id, roleId);
    if (!result.ok) {
      setIsGeneratingPlan(false);
      setPlanGenPhase(null);
      window.alert(result.error ?? 'Failed to generate learning plan.');
      return;
    }

    setPlanGenPhase('explain');
    setPlanGenReason(
      result.reason ??
        'IGNIZIA prioritized the highest-impact role gaps first to improve readiness efficiently.',
    );
    await new Promise((resolve) => setTimeout(resolve, 1700));
    setIsGeneratingPlan(false);
    setPlanGenPhase(null);
    setJustGenerated(true);
    setActiveTab('learning');
    setTimeout(() => setJustGenerated(false), 2000);
  };

  const updatePrivacy = (updates: Partial<typeof employee.privacy>) => {
    updateEmployee({
      ...employee,
      privacy: { ...employee.privacy, ...updates }
    });
  };

  const handleAddManualSkill = () => {
    if (!newSkill.skillId) return;
    
    const newAssertion: SkillAssertion = {
      id: crypto.randomUUID(),
      personId: employee.id,
      skillId: newSkill.skillId,
      status: newSkill.status,
      source: 'manual',
      level: newSkill.level,
      confidence: 1.0,
      evidenceIds: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    updateEmployee({
      ...employee,
      assertions: [...employee.assertions, newAssertion]
    });
    
    setIsManagingSkills(false);
    setNewSkill({ skillId: '', level: 1, status: 'confirmed', notes: '' });
  };

  return (
    <div className="space-y-8 pb-20">
      <style>{`
        @keyframes ignizia-fade-up {
          from { opacity: 0; transform: translateY(12px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes ignizia-bar-grow {
          from { width: 0%; }
        }
        @keyframes ignizia-shimmer {
          0% { background-position: -200% 0; }
          100% { background-position: 200% 0; }
        }
        @keyframes ignizia-sparkle-rise {
          0% { opacity: 0; transform: translateY(0) scale(0.5); }
          30% { opacity: 1; transform: translateY(-8px) scale(1); }
          100% { opacity: 0; transform: translateY(-24px) scale(0.3); }
        }
        @keyframes ignizia-pulse-ring {
          0% { transform: scale(1); opacity: 0.5; }
          50% { transform: scale(1.3); opacity: 0; }
          100% { transform: scale(1); opacity: 0; }
        }
        .ignizia-gen-btn:active { transform: scale(0.95); }
        .ignizia-gen-btn { transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1); }
        .ignizia-gen-btn:hover { transform: translateY(-1px); box-shadow: 0 4px 12px rgba(18, 123, 196, 0.3); }
      `}</style>

      {/* ── Plan Generation Overlay ── */}
      {isGeneratingPlan && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl p-10 flex flex-col items-center gap-5 max-w-sm w-full mx-4">
            <div className="relative">
              <div className="w-16 h-16 rounded-full bg-action/10 flex items-center justify-center">
                <Sparkles size={28} className="text-action animate-pulse" />
              </div>
              <div className="absolute inset-0 rounded-full border-2 border-action/30" style={{ animation: 'ignizia-pulse-ring 1.5s ease-out infinite' }} />
              <div className="absolute inset-0 rounded-full border-2 border-action/20" style={{ animation: 'ignizia-pulse-ring 1.5s ease-out 0.5s infinite' }} />
              {[0, 1, 2, 3, 4].map(i => (
                <div
                  key={i}
                  className="absolute text-brand-orange"
                  style={{
                    left: `${20 + Math.random() * 24}px`,
                    top: `${-4 + Math.random() * 8}px`,
                    animation: `ignizia-sparkle-rise 1.2s ease-out ${i * 0.25}s infinite`,
                  }}
                >
                  <Star size={8} className="fill-current" />
                </div>
              ))}
            </div>
            <div className="text-center">
              <h3 className="text-base font-bold text-slate-900 dark:text-slate-100 mb-1">
                {planGenPhase === 'explain' ? 'IGNIZIA selected high-impact skills' : 'IGNIZIA is building your plan'}
              </h3>
              <p className="text-xs text-slate-500">
                {planGenPhase === 'explain'
                  ? planGenReason
                  : 'Analyzing role gaps, current strengths, and best-fit learning modules...'}
              </p>
            </div>
            <div
              className="w-full h-1.5 rounded-full overflow-hidden"
              style={{
                background: 'linear-gradient(90deg, transparent, rgba(18,123,196,0.15), transparent)',
              }}
            >
              <div
                className="h-full rounded-full"
                style={{
                  background: 'linear-gradient(90deg, #127BC4, #2DC37C, #FAB61F, #127BC4)',
                  backgroundSize: '200% 100%',
                  animation: 'ignizia-shimmer 1.2s linear infinite',
                  width: '100%',
                }}
              />
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div className="flex items-center gap-4">
          <button onClick={() => setCurrentPage('employees')} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full text-slate-500 transition-colors">
            <ArrowLeft size={20} />
          </button>
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden border border-slate-200 dark:border-slate-700">
              <img src={employee.avatarUrl} alt={employee.name} className="w-full h-full object-cover" />
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2 group">
                <input 
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  onBlur={handleSaveName}
                  className="text-2xl font-bold text-slate-900 dark:text-slate-100 bg-transparent border-none focus:ring-0 p-0 w-full"
                  placeholder="Employee Name"
                />
              </div>
              <p className="text-slate-500 dark:text-slate-400">
                {roles.find(r => r.id === employee.roleId)?.name || 'No Role'}
              </p>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-lg">
            {['skills', 'learning', 'settings'].map((tab) => (
              <button 
                key={tab}
                onClick={() => setActiveTab(tab as any)}
                className={cn(
                  "px-4 py-1.5 rounded-md text-sm font-medium transition-all capitalize",
                  activeTab === tab ? "bg-white dark:bg-slate-700 text-action dark:text-action shadow-sm" : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200"
                )}
              >
                {tab}
              </button>
            ))}
          </div>
          <button
            type="button"
            onClick={async (e) => {
              e.preventDefault();
              if (isDeleting || !window.confirm(`Delete "${employee.name}" from Supabase? This removes them and all references (dev only).`)) return;
              setIsDeleting(true);
              const ok = await deleteEmployee(employee.id);
              setIsDeleting(false);
              if (!ok) window.alert('Delete failed.');
            }}
            disabled={isDeleting}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-medium text-danger bg-danger/10 hover:bg-danger/20 border border-danger/30 transition-colors disabled:opacity-50"
            title="Remove employee and all references from Supabase (dev)"
          >
            <Trash2 size={14} />
            Delete (dev)
          </button>
        </div>
      </div>

      {activeTab === 'skills' && (
        <div className="space-y-5">
          {/* ── Readiness Strip ── */}
          <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-5">
            <div className="flex items-center gap-5 flex-wrap">
              {analysis ? (
                <>
                  <div className="relative w-[72px] h-[72px] flex-shrink-0">
                    <svg viewBox="0 0 36 36" className="w-full h-full -rotate-90">
                      <circle cx="18" cy="18" r="15.9155" fill="none" strokeWidth="2.5"
                        className="stroke-slate-100 dark:stroke-slate-800" />
                      <circle cx="18" cy="18" r="15.9155" fill="none" strokeWidth="2.5"
                        stroke={analysis.overallReadiness >= 80 ? '#2DC37C' : analysis.overallReadiness >= 50 ? '#FAB61F' : '#E8347E'}
                        strokeDasharray={`${analysis.overallReadiness} 100`}
                        strokeLinecap="round"
                        className="transition-all duration-700" />
                    </svg>
                    <div className="absolute inset-0 flex flex-col items-center justify-center">
                      <span className="text-xl font-bold text-slate-900 dark:text-slate-100">{analysis.overallReadiness}%</span>
                      <span className="text-[7px] text-slate-400 uppercase font-bold tracking-wider">Ready</span>
                    </div>
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <Briefcase size={13} className="text-slate-400" />
                      <select
                        value={targetRoleId}
                        onChange={(e) => setTargetRoleId(e.target.value)}
                        className="text-sm border-none bg-transparent font-semibold text-slate-700 dark:text-slate-300 focus:ring-0 p-0 cursor-pointer"
                      >
                        {roles.map(r => (
                          <option key={r.id} value={r.id}>{r.name}</option>
                        ))}
                      </select>
                    </div>
                    <div className="flex items-center gap-3 text-xs">
                      <span className="font-bold text-success">{analysis.totalMatched} matched</span>
                      <span className="text-slate-200 dark:text-slate-700">|</span>
                      <span className={cn('font-bold', analysis.missingSkills.length > 0 ? 'text-danger' : 'text-success')}>
                        {analysis.missingSkills.length} gaps
                      </span>
                      <span className="text-slate-200 dark:text-slate-700">|</span>
                      <span className="text-slate-500">{activeSkills.length} total skills</span>
                    </div>
                    <div className="flex flex-wrap items-center gap-1.5 mt-2">
                      {Object.entries(provenanceCounts).map(([source, count]) => (
                        <span key={source} className="inline-flex items-center gap-1 text-[10px] text-slate-400 bg-slate-50 dark:bg-slate-800 px-2 py-0.5 rounded-full">
                          {source === 'manager_validated' && <ShieldCheck size={9} className="text-success" />}
                          {source === 'ai_inferred' && <Sparkles size={9} className="text-brand-orange" />}
                          {source === 'assessment' && <CheckCircle2 size={9} className="text-action" />}
                          {source === 'training_completion' && <GraduationCap size={9} className="text-primary" />}
                          {source === 'performance_signal' && <Star size={9} className="text-warning" />}
                          {source === 'imported' && <ArrowLeft size={9} className="text-slate-400" />}
                          {source === 'manual' && <Plus size={9} className="text-slate-400" />}
                          {count} {source.replace(/_/g, ' ')}
                        </span>
                      ))}
                    </div>
                  </div>
                </>
              ) : (
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <Briefcase size={14} className="text-slate-400" />
                    <select
                      value={targetRoleId}
                      onChange={(e) => setTargetRoleId(e.target.value)}
                      className="text-sm border-none bg-transparent font-semibold text-slate-700 dark:text-slate-300 focus:ring-0 p-0"
                    >
                      <option value="">Select a role...</option>
                      {roles.map(r => (
                        <option key={r.id} value={r.id}>{r.name}</option>
                      ))}
                    </select>
                  </div>
                </div>
              )}

              <div className="flex items-center gap-2 flex-shrink-0">
                {analysis && analysis.missingSkills.length > 0 && (
                  <button
                    onClick={() => {
                      void handleCreatePlan();
                    }}
                    disabled={isGeneratingPlan}
                    className="ignizia-gen-btn px-3 py-1.5 bg-action text-white text-xs font-bold rounded-lg flex items-center gap-1.5 disabled:opacity-50"
                  >
                    <Zap size={12} />
                    Generate Plan
                  </button>
                )}
                <button
                  onClick={() => setIsManagingSkills(true)}
                  className="px-3 py-1.5 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 text-xs font-bold rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors flex items-center gap-1.5"
                >
                  <Plus size={12} />
                  Add Skill
                </button>
              </div>
            </div>
          </div>

          {/* ── Skill Profile ── */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <span className="text-[11px] font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500">
                Skill Profile
              </span>
              <span className="text-[10px] font-bold text-action bg-action/10 px-1.5 py-0.5 rounded">
                {activeSkills.length}
              </span>
            </div>

            {activeSkills.length === 0 ? (
              <div className="bg-slate-50 dark:bg-slate-800/50 rounded-xl p-8 text-center">
                <p className="text-sm text-slate-400">No skills recorded yet</p>
                <button
                  onClick={() => setIsManagingSkills(true)}
                  className="mt-2 text-xs text-action hover:text-brand-blue font-bold"
                >
                  + Add first skill
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="flex flex-wrap gap-2">
                  {confirmedSkills.map((assertion) => {
                    const skill = allSkills.find(s => s.id === assertion.skillId);
                    const req = targetRole?.requirements.find(r => r.skillId === assertion.skillId);
                    const isPartialGap = req && assertion.level < req.minLevel;

                    return (
                      <div
                        key={assertion.id}
                        className={cn(
                          'inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl border text-xs font-medium transition-all hover:shadow-sm',
                          isPartialGap
                            ? 'bg-warning/5 border-warning/25 dark:bg-warning/10'
                            : 'bg-success/5 border-success/25 dark:bg-success/10'
                        )}
                      >
                        {isPartialGap
                          ? <AlertTriangle size={11} className="text-warning flex-shrink-0" />
                          : <Check size={11} className="text-success flex-shrink-0" />
                        }
                        <span className="text-slate-700 dark:text-slate-200 font-semibold">{skill?.name}</span>
                        <div className="flex gap-px ml-0.5">
                          {[1, 2, 3, 4, 5].map(l => (
                            <div
                              key={l}
                              className={cn(
                                'w-1 h-3 rounded-full',
                                l <= assertion.level
                                  ? isPartialGap ? 'bg-warning' : 'bg-success'
                                  : 'bg-slate-200 dark:bg-slate-700'
                              )}
                            />
                          ))}
                        </div>
                        {isPartialGap && req && (
                          <span className="text-[9px] text-warning/70 font-bold ml-0.5">→L{req.minLevel}</span>
                        )}
                      </div>
                    );
                  })}
                </div>

                {proposedSkills.length > 0 && (
                  <div>
                    <div className="flex items-center gap-1.5 mb-2 mt-1">
                      <Sparkles size={11} className="text-brand-orange" />
                      <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500">
                        AI Proposed
                      </span>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {proposedSkills.map((assertion) => {
                        const skill = allSkills.find(s => s.id === assertion.skillId);
                        return (
                          <div
                            key={assertion.id}
                            className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl border bg-action/5 border-action/25 dark:bg-action/10 text-xs font-medium"
                          >
                            <span className="text-slate-700 dark:text-slate-200 font-semibold">{skill?.name}</span>
                            <div className="flex gap-px ml-0.5">
                              {[1, 2, 3, 4, 5].map(l => (
                                <div
                                  key={l}
                                  className={cn(
                                    'w-1 h-3 rounded-full',
                                    l <= assertion.level ? 'bg-action' : 'bg-slate-200 dark:bg-slate-700'
                                  )}
                                />
                              ))}
                            </div>
                            <div className="flex gap-1 ml-1">
                              <button
                                onClick={() => handleAssertionStatus(assertion.skillId, 'confirmed')}
                                className="text-success hover:text-success/80 transition-colors"
                                title="Confirm"
                              >
                                <CheckCircle2 size={15} />
                              </button>
                              <button
                                onClick={() => handleAssertionStatus(assertion.skillId, 'rejected')}
                                className="text-danger hover:text-danger/80 transition-colors"
                                title="Reject"
                              >
                                <XCircle size={15} />
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* ── Role Gaps (completely missing skills) ── */}
          {fullGaps.length > 0 && (
            <div className="bg-danger/5 dark:bg-danger/8 border border-danger/15 rounded-xl p-4">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <AlertTriangle size={13} className="text-danger" />
                  <span className="text-[11px] font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500">
                    Missing for {targetRole?.name}
                  </span>
                  <span className="text-[10px] font-bold text-danger bg-danger/10 px-1.5 py-0.5 rounded">
                    {fullGaps.length}
                  </span>
                </div>
                <button
                  onClick={() => {
                    void handleCreatePlan();
                  }}
                  className="text-[11px] font-bold text-action hover:text-brand-blue transition-colors flex items-center gap-1"
                >
                  <Zap size={11} />
                  Generate Plan
                </button>
              </div>
              <div className="flex flex-wrap gap-2">
                {fullGaps.map(gap => {
                  const skill = allSkills.find(s => s.id === gap.skillId);
                  return (
                    <span
                      key={gap.skillId}
                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg border text-[11px] font-medium bg-danger/10 text-danger border-danger/20"
                    >
                      <XCircle size={10} />
                      {skill?.name}
                      <span className="opacity-60 ml-0.5">needs L{gap.minLevel}</span>
                    </span>
                  );
                })}
              </div>
            </div>
          )}

          {/* All matched */}
          {analysis && analysis.missingSkills.length === 0 && (
            <div className="bg-success/5 dark:bg-success/10 border border-success/20 rounded-xl p-4 flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-success/15 flex items-center justify-center flex-shrink-0">
                <CheckCircle2 size={16} className="text-success" />
              </div>
              <div>
                <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">Fully qualified</p>
                <p className="text-xs text-slate-500 dark:text-slate-400">{employee.name} meets all {targetRole?.name} requirements</p>
              </div>
            </div>
          )}

          {/* ── Career Path ── */}
          <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden">
            <div className="p-5">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <Compass size={14} className="text-brand-orange" />
                  <span className="text-[11px] font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500">
                    Career Path
                  </span>
                </div>
                {!careerFlowPath && (
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] text-slate-400">Compare role:</span>
                    <select
                      value={aspirationRoleId}
                      onChange={(e) => setAspirationRoleId(e.target.value)}
                      className="text-xs border-none bg-slate-50 dark:bg-slate-800 rounded-md py-1 pl-2 pr-6 font-medium text-slate-700 dark:text-slate-300 focus:ring-2 focus:ring-action"
                    >
                      <option value="">Choose aspiration...</option>
                      {roles.filter(r => r.id !== employee.roleId).map(r => (
                        <option key={r.id} value={r.id}>{r.name}</option>
                      ))}
                    </select>
                  </div>
                )}
              </div>

              {/* ── CareerFlow Aspiration (chosen via AI career discovery) ── */}
              {careerFlowPath && (
                <div className="space-y-5">
                  <div className="flex items-start gap-4">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-brand-blue/20 to-brand-green/20 flex items-center justify-center flex-shrink-0">
                      <Target size={18} className="text-brand-blue" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
                          {careerFlowPath.role.title}
                        </h3>
                        <span className={cn(
                          'px-2 py-0.5 rounded-full text-[10px] font-bold uppercase',
                          careerFlowPath.role.category === 'adjacent' ? 'bg-warning/10 text-warning'
                            : careerFlowPath.role.category === 'stretch' ? 'bg-action/10 text-action'
                              : 'bg-brand-pink/10 text-brand-pink'
                        )}>
                          {careerFlowPath.role.category}
                        </span>
                        <span className="text-xs font-bold text-success bg-success/10 px-2 py-0.5 rounded-full">
                          {careerFlowPath.role.matchScore}% Match
                        </span>
                      </div>
                      <p className="text-xs text-slate-500 mt-1 line-clamp-2">{careerFlowPath.role.reasoning}</p>
                    </div>
                  </div>

                  {/* Radar Chart */}
                  {careerFlowPath.deepDive?.skillComparison && careerFlowPath.deepDive.skillComparison.length > 0 && (
                    <div className="bg-slate-50/50 dark:bg-slate-800/30 rounded-xl p-4">
                      <div className="flex items-center gap-2 mb-3">
                        <TrendingUp size={12} className="text-slate-400" />
                        <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">
                          Skill Comparison
                        </span>
                      </div>
                      <div className="h-64">
                        <ResponsiveContainer width="100%" height="100%">
                          <RadarChart data={careerFlowPath.deepDive.skillComparison}>
                            <PolarGrid stroke="#e2e8f0" />
                            <PolarAngleAxis
                              dataKey="skill"
                              tick={{ fill: '#94a3b8', fontSize: 10 }}
                            />
                            <PolarRadiusAxis angle={30} domain={[0, 100]} tick={false} axisLine={false} />
                            <Radar
                              name="Your Level"
                              dataKey="userLevel"
                              stroke="#127BC4"
                              fill="#127BC4"
                              fillOpacity={0.25}
                              strokeWidth={2}
                            />
                            <Radar
                              name="Required Level"
                              dataKey="requiredLevel"
                              stroke="#FAB61F"
                              fill="#FAB61F"
                              fillOpacity={0.2}
                              strokeWidth={2}
                            />
                            <Legend
                              wrapperStyle={{ fontSize: '11px' }}
                            />
                          </RadarChart>
                        </ResponsiveContainer>
                      </div>

                      {/* Skills to develop — collapsed by default, show few then expand */}
                      {(() => {
                        const skillsToGrow = careerFlowPath.deepDive.skillComparison.filter(
                          s => s.requiredLevel > s.userLevel
                        );
                        if (skillsToGrow.length === 0) return null;
                        const visible = expandPathSkills ? skillsToGrow : skillsToGrow.slice(0, INITIAL_SKILLS_VISIBLE);
                        const hasMore = skillsToGrow.length > INITIAL_SKILLS_VISIBLE;
                        return (
                          <div className="mt-3 pt-3 border-t border-slate-200/60 dark:border-slate-700/40">
                            <div className="flex items-center gap-1.5 mb-2">
                              <Sparkles size={10} className="text-brand-orange" />
                              <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">
                                Skills to develop for this path
                              </span>
                              <span className="text-[10px] text-slate-400">({skillsToGrow.length})</span>
                            </div>
                            <div className="flex flex-wrap gap-1.5">
                              {visible.map(s => (
                                <span
                                  key={s.skill}
                                  className="inline-flex items-center gap-1 px-2 py-1 rounded-lg border text-[10px] font-medium bg-brand-orange/5 border-brand-orange/20 text-brand-orange"
                                >
                                  <TrendingUp size={9} />
                                  {s.skill}
                                  <span className="opacity-60">{s.userLevel}→{s.requiredLevel}</span>
                                </span>
                              ))}
                            </div>
                            {hasMore && (
                              <button
                                type="button"
                                onClick={() => setExpandPathSkills(!expandPathSkills)}
                                className="mt-2 text-[10px] font-bold text-action hover:text-brand-blue transition-colors flex items-center gap-0.5"
                              >
                                {expandPathSkills ? (
                                  <>Show less <ChevronDown size={10} className="rotate-180" /></>
                                ) : (
                                  <>Show all {skillsToGrow.length} <ChevronDown size={10} /></>
                                )}
                              </button>
                            )}
                          </div>
                        );
                      })()}
                    </div>
                  )}

                  {/* Actions */}
                  <div className="flex items-center gap-3 pt-2 border-t border-slate-100 dark:border-slate-800">
                    <button
                      onClick={() => {
                        window.location.href = '/dashboard/career-flow/results';
                      }}
                      className="text-[11px] font-bold text-action hover:text-brand-blue transition-colors flex items-center gap-1"
                    >
                      <ExternalLink size={10} />
                      Open in CareerFlow
                    </button>
                    <span className="text-slate-200 dark:text-slate-700">|</span>
                    <button
                      onClick={() => {
                        setCareerFlowPath(null);
                        localStorage.removeItem('ignizia_career_aspiration');
                      }}
                      className="text-[11px] font-bold text-slate-400 hover:text-slate-600 transition-colors"
                    >
                      Change Path
                    </button>
                  </div>
                </div>
              )}

              {/* ── Fallback: role-based aspiration selector ── */}
              {!careerFlowPath && !aspirationRoleId && (
                <div className="text-center py-6">
                  <Target size={28} className="mx-auto text-slate-200 dark:text-slate-700 mb-2" />
                  <p className="text-xs text-slate-400 mb-2">Choose a role above, or discover your ideal path in CareerFlow</p>
                  <button
                    onClick={() => { window.location.href = '/dashboard/career-flow'; }}
                    className="text-[11px] font-bold text-action hover:text-brand-blue transition-colors flex items-center gap-1 mx-auto"
                  >
                    <Sparkles size={10} />
                    Explore Career Paths
                  </button>
                </div>
              )}

              {!careerFlowPath && aspirationAnalysis && aspirationRole && (
                <div className="space-y-4">
                  <div className="flex items-center gap-4">
                    <div className="relative w-14 h-14 flex-shrink-0">
                      <svg viewBox="0 0 36 36" className="w-full h-full -rotate-90">
                        <circle cx="18" cy="18" r="15.9155" fill="none" strokeWidth="3"
                          className="stroke-slate-100 dark:stroke-slate-800" />
                        <circle cx="18" cy="18" r="15.9155" fill="none" strokeWidth="3"
                          stroke={aspirationAnalysis.overallReadiness >= 80 ? '#2DC37C' : aspirationAnalysis.overallReadiness >= 50 ? '#FAB61F' : '#E8347E'}
                          strokeDasharray={`${aspirationAnalysis.overallReadiness} 100`}
                          strokeLinecap="round"
                          className="transition-all duration-700" />
                      </svg>
                      <div className="absolute inset-0 flex items-center justify-center">
                        <span className="text-sm font-bold text-slate-900 dark:text-slate-100">{aspirationAnalysis.overallReadiness}%</span>
                      </div>
                    </div>
                    <div>
                      <p className="text-sm font-bold text-slate-900 dark:text-slate-100">
                        {aspirationAnalysis.overallReadiness >= 80 ? 'Strong fit' : aspirationAnalysis.overallReadiness >= 50 ? 'Growing toward' : 'Stretch goal'} for {aspirationRole.name}
                      </p>
                      <p className="text-xs text-slate-500 mt-0.5">
                        {aspirationAnalysis.totalMatched} of {aspirationAnalysis.totalRequired} skills ready · {aspirationAnalysis.missingSkills.length} to develop
                      </p>
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-1.5">
                    {aspirationRole.requirements.map(req => {
                      const skill = allSkills.find(s => s.id === req.skillId);
                      const assertion = employee.assertions.find(a => a.skillId === req.skillId && a.status !== 'rejected');
                      const isFullyMet = assertion && assertion.level >= req.minLevel;
                      const isPartiallyMet = assertion && assertion.level < req.minLevel;

                      return (
                        <span
                          key={req.skillId}
                          className={cn(
                            'inline-flex items-center gap-1 px-2 py-1 rounded-lg border text-[10px] font-medium',
                            isFullyMet
                              ? 'bg-success/10 border-success/20 text-success'
                              : isPartiallyMet
                                ? 'bg-warning/10 border-warning/20 text-warning'
                                : 'bg-danger/10 border-danger/20 text-danger'
                          )}
                        >
                          {isFullyMet ? <Check size={9} /> : isPartiallyMet ? <AlertTriangle size={9} /> : <XCircle size={9} />}
                          {skill?.name}
                          {isPartiallyMet && assertion && (
                            <span className="opacity-60">L{assertion.level}→L{req.minLevel}</span>
                          )}
                          {!assertion && (
                            <span className="opacity-60">L{req.minLevel}</span>
                          )}
                        </span>
                      );
                    })}
                  </div>

                  <div className="pt-2">
                    <button
                      onClick={async () => {
                        setTargetRoleId(aspirationRoleId);
                        if (aspirationAnalysis.missingSkills.length > 0) {
                          await handleCreatePlan(aspirationRoleId);
                        }
                      }}
                      className="text-[11px] font-bold text-action hover:text-brand-blue transition-colors flex items-center gap-1"
                    >
                      {aspirationAnalysis.missingSkills.length > 0 ? 'Generate plan for this path' : 'Already qualified'}
                      <ArrowLeft size={10} className="rotate-180" />
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {activeTab === 'learning' && (() => {
        const gapAnalysis = targetRoleId ? runGapAnalysis(employee.id, targetRoleId) : null;
        const hasUncoveredGaps =
          gapAnalysis &&
          gapAnalysis.missingSkills.length > 0 &&
          !employeePlans.some((p) => p.status !== 'completed');

        const pathSkillNames = (careerFlowPath?.deepDive?.skillComparison ?? [])
          .filter(s => s.requiredLevel > s.userLevel)
          .map(s => s.skill.toLowerCase());

        const isCareerPathSkill = (skillId: string) => {
          const skillName = allSkills.find(s => s.id === skillId)?.name?.toLowerCase() ?? '';
          return pathSkillNames.some(pName =>
            pName.split(/\s+/).some(w => w.length > 3 && skillName.includes(w)) ||
            skillName.split(/\s+/).some(w => w.length > 3 && pName.includes(w))
          );
        };

        const viewingPlan = viewingPlanId ? employeePlans.find(p => p.id === viewingPlanId) : null;

        /* ═══════════════════════════════════════════
           DETAIL VIEW — shown when a plan is selected
           ═══════════════════════════════════════════ */
        if (viewingPlan) {
          const completedSteps = viewingPlan.steps.filter(s => s.status === 'done').length;
          const progress = Math.round((completedSteps / viewingPlan.steps.length) * 100);
          const totalHours = viewingPlan.steps.reduce((sum, s) => {
            const r = resources.find(rr => rr.id === s.resourceId);
            return sum + (r?.estimatedHours ?? 0);
          }, 0);
          const doneHours = viewingPlan.steps.filter(s => s.status === 'done').reduce((sum, s) => {
            const r = resources.find(rr => rr.id === s.resourceId);
            return sum + (r?.estimatedHours ?? 0);
          }, 0);
          const isCareerPlan = viewingPlan.title.toLowerCase().includes('career');
          const accentColor = isCareerPlan ? 'brand-orange' : 'action';

          const planCareerSkills = new Set<string>();
          const planJobSkills = new Set<string>();
          viewingPlan.steps.forEach(step => {
            step.targetSkills.forEach(sid => {
              if (isCareerPathSkill(sid)) planCareerSkills.add(sid);
              else planJobSkills.add(sid);
            });
          });

          return (
            <div className="space-y-5" style={{ animation: 'ignizia-fade-up 0.35s ease-out' }}>
              {/* Back + Title */}
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setViewingPlanId(null)}
                  className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg text-slate-400 transition-colors"
                >
                  <ArrowLeft size={16} />
                </button>
                <div className="flex-1 min-w-0">
                  <h3 className="text-base font-bold text-slate-900 dark:text-slate-100 truncate">{viewingPlan.title}</h3>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className={cn(
                      'px-1.5 py-0.5 rounded text-[9px] font-bold uppercase',
                      viewingPlan.status === 'completed' ? 'bg-success/15 text-success' : `bg-${accentColor}/10 text-${accentColor}`,
                    )}>
                      {viewingPlan.status.replace('_', ' ')}
                    </span>
                    {isCareerPlan && (
                      <span className="inline-flex items-center gap-0.5 text-[9px] font-bold text-brand-orange bg-brand-orange/10 px-1.5 py-0.5 rounded">
                        <Compass size={7} />
                        Career Path
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Progress + Stats Strip */}
              <div className={cn(
                'rounded-xl p-5 border',
                isCareerPlan
                  ? 'bg-gradient-to-r from-brand-orange/5 to-brand-green/5 border-brand-orange/15'
                  : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800',
              )}>
                <div className="flex items-center gap-6 flex-wrap">
                  <div className="relative w-20 h-20 flex-shrink-0">
                    <svg viewBox="0 0 36 36" className="w-full h-full -rotate-90">
                      <circle cx="18" cy="18" r="15.9155" fill="none" strokeWidth="2.5"
                        className="stroke-slate-100 dark:stroke-slate-800" />
                      <circle cx="18" cy="18" r="15.9155" fill="none" strokeWidth="2.5"
                        stroke={progress >= 100 ? '#2DC37C' : isCareerPlan ? '#FAB61F' : '#127BC4'}
                        strokeDasharray={`${progress} 100`}
                        strokeLinecap="round"
                        style={{ animation: 'ignizia-bar-grow 1s ease-out 0.3s both' }} />
                    </svg>
                    <div className="absolute inset-0 flex flex-col items-center justify-center">
                      <span className="text-lg font-bold text-slate-900 dark:text-slate-100">{progress}%</span>
                      <span className="text-[8px] text-slate-400">complete</span>
                    </div>
                  </div>
                  <div className="flex-1 grid grid-cols-3 gap-4 min-w-0">
                    <div>
                      <p className="text-[10px] text-slate-400 uppercase tracking-wider">Steps</p>
                      <p className="text-lg font-bold text-slate-900 dark:text-slate-100">{completedSteps}<span className="text-sm text-slate-400">/{viewingPlan.steps.length}</span></p>
                    </div>
                    {totalHours > 0 && (
                      <div>
                        <p className="text-[10px] text-slate-400 uppercase tracking-wider">Hours</p>
                        <p className="text-lg font-bold text-slate-900 dark:text-slate-100">{doneHours}<span className="text-sm text-slate-400">/{totalHours}h</span></p>
                      </div>
                    )}
                    <div>
                      <p className="text-[10px] text-slate-400 uppercase tracking-wider">Skills</p>
                      <p className="text-lg font-bold text-slate-900 dark:text-slate-100">{planJobSkills.size + planCareerSkills.size}</p>
                    </div>
                  </div>
                </div>

                {/* Skill impact summary — collapsed by default */}
                {(() => {
                  const allPlanSkills = [...Array.from(planJobSkills), ...Array.from(planCareerSkills)];
                  if (allPlanSkills.length === 0) return null;
                  const visible = expandPlanDetailSkills ? allPlanSkills : allPlanSkills.slice(0, INITIAL_SKILLS_VISIBLE);
                  const hasMore = allPlanSkills.length > INITIAL_SKILLS_VISIBLE;
                  return (
                    <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800/50">
                      <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-2">Skills being developed ({allPlanSkills.length})</p>
                      <div className="flex flex-wrap gap-1.5">
                        {visible.map(sid => {
                          const isCareer = planCareerSkills.has(sid);
                          return (
                            <span
                              key={sid}
                              className={cn(
                                'inline-flex items-center gap-0.5 px-2 py-0.5 rounded text-[9px] font-medium border',
                                isCareer ? 'bg-brand-orange/8 text-brand-orange border-brand-orange/15' : 'bg-action/8 text-action border-action/15',
                              )}
                            >
                              {isCareer ? <Compass size={7} /> : <Briefcase size={7} />}
                              {allSkills.find(s => s.id === sid)?.name}
                            </span>
                          );
                        })}
                      </div>
                      {hasMore && (
                        <button
                          type="button"
                          onClick={() => setExpandPlanDetailSkills(!expandPlanDetailSkills)}
                          className="mt-1.5 text-[9px] font-bold text-action hover:text-brand-blue transition-colors flex items-center gap-0.5"
                        >
                          {expandPlanDetailSkills ? 'Show less' : `Show all ${allPlanSkills.length}`}
                          <ChevronDown size={9} className={expandPlanDetailSkills ? 'rotate-180' : ''} />
                        </button>
                      )}
                    </div>
                  );
                })()}
              </div>

              {/* Steps list */}
              <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden">
                <div className="px-4 py-3 border-b border-slate-100 dark:border-slate-800 flex items-center gap-2">
                  <BookOpen size={12} className={`text-${accentColor}`} />
                  <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Learning Steps</span>
                </div>
                <div className="divide-y divide-slate-50 dark:divide-slate-800/50">
                  {viewingPlan.steps.map((step, stepIdx) => {
                    const resource = resources.find(r => r.id === step.resourceId);
                    const stepCareerSkills = step.targetSkills.filter(sid => isCareerPathSkill(sid));
                    const stepJobSkills = step.targetSkills.filter(sid => !isCareerPathSkill(sid));

                    return (
                      <div
                        key={step.id}
                        className={cn(
                          'px-4 py-3.5 flex items-start gap-3 transition-all',
                          step.status === 'done' ? 'bg-success/3' : 'hover:bg-slate-50 dark:hover:bg-slate-800/30',
                        )}
                        style={{ animation: `ignizia-fade-up 0.3s ease-out ${stepIdx * 70}ms both` }}
                      >
                        <button
                          onClick={() => {
                            if (step.status === 'done') {
                              const newSteps = viewingPlan.steps.map(s =>
                                s.id === step.id ? { ...s, status: 'todo' as const, completedAt: undefined } : s,
                              );
                              updateLearningPlan({ ...viewingPlan, steps: newSteps, status: 'in_progress' });
                            } else {
                              const newSteps = viewingPlan.steps.map(s =>
                                s.id === step.id ? { ...s, status: 'done' as const, completedAt: new Date().toISOString() } : s,
                              );
                              const allDone = newSteps.every(s => s.status === 'done');
                              updateLearningPlan({ ...viewingPlan, steps: newSteps, status: allDone ? 'completed' : 'in_progress' });
                            }
                          }}
                          className={cn(
                            'mt-0.5 flex-shrink-0 w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all duration-200',
                            step.status === 'done' ? 'bg-success border-success' : 'border-slate-300 dark:border-slate-600 hover:border-action',
                          )}
                        >
                          {step.status === 'done' && <Check size={10} className="text-white" />}
                        </button>

                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <p className={cn(
                              'text-[13px] font-semibold truncate',
                              step.status === 'done' ? 'text-slate-400 line-through' : 'text-slate-900 dark:text-slate-100',
                            )}>
                              {resource?.title}
                            </p>
                          </div>
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-[9px] text-slate-400 bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded">
                              {resource?.type?.replace('_', ' ')}
                            </span>
                            {resource?.provider && (
                              <span className="text-[9px] text-slate-400">{resource.provider}</span>
                            )}
                            {resource?.estimatedHours && (
                              <span className="text-[9px] text-slate-400">{resource.estimatedHours}h</span>
                            )}
                          </div>
                          <div className="flex items-center gap-1.5 flex-wrap mt-1.5">
                            {stepJobSkills.map(sid => (
                              <span key={sid} className="inline-flex items-center gap-0.5 text-[9px] font-medium text-action bg-action/8 px-1.5 py-0.5 rounded">
                                <Briefcase size={7} /> {allSkills.find(s => s.id === sid)?.name}
                              </span>
                            ))}
                            {stepCareerSkills.map(sid => (
                              <span key={sid} className="inline-flex items-center gap-0.5 text-[9px] font-medium text-brand-orange bg-brand-orange/8 px-1.5 py-0.5 rounded border border-brand-orange/15">
                                <Compass size={7} /> {allSkills.find(s => s.id === sid)?.name}
                                {careerFlowPath && <span className="opacity-60 ml-0.5">→ {careerFlowPath.role.title}</span>}
                              </span>
                            ))}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {careerFlowPath && planCareerSkills.size > 0 && (
                  <div className="px-4 py-3 bg-brand-orange/5 border-t border-brand-orange/10 flex items-center gap-2">
                    <Sparkles size={11} className="text-brand-orange flex-shrink-0" />
                    <p className="text-[10px] text-brand-orange">
                      <span className="font-bold">{planCareerSkills.size} skill{planCareerSkills.size > 1 ? 's' : ''}</span> in this plan also advance your path to <span className="font-bold">{careerFlowPath.role.title}</span>
                    </p>
                  </div>
                )}
              </div>
            </div>
          );
        }

        /* ═══════════════════════════════════════════
           PLAN SELECTOR — compact cards, no checklist
           ═══════════════════════════════════════════ */
        return (
          <div className="space-y-5">
            {/* Success flash */}
            {justGenerated && (
              <div className="bg-success/10 border border-success/20 rounded-xl p-3 flex items-center gap-3" style={{ animation: 'ignizia-fade-up 0.4s ease-out' }}>
                <div className="w-8 h-8 rounded-full bg-success/15 flex items-center justify-center flex-shrink-0">
                  <CheckCircle2 size={16} className="text-success" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-success">Plan generated</p>
                  <p className="text-[10px] text-slate-500">Skill gaps matched with the best resources</p>
                </div>
              </div>
            )}

            {/* ── AI Recommendation ── */}
            {hasUncoveredGaps && gapAnalysis && (
              <div className="bg-action/5 dark:bg-action/10 border border-action/20 rounded-xl p-5" style={{ animation: 'ignizia-fade-up 0.4s ease-out 0.1s both' }}>
                <div className="flex items-center gap-2 mb-3">
                  <Sparkles size={14} className="text-brand-orange" />
                  <span className="text-[11px] font-bold uppercase tracking-widest text-slate-400">IGNIZIA recommends</span>
                </div>
                <p className="text-sm text-slate-700 dark:text-slate-300 mb-3">
                  <span className="font-bold text-danger">{gapAnalysis.missingSkills.length} gap{gapAnalysis.missingSkills.length > 1 ? 's' : ''}</span> for <span className="font-bold">{targetRole?.name}</span>
                </p>
                <div className="flex flex-wrap gap-1.5 mb-4">
                  {gapAnalysis.missingSkills.slice(0, 4).map((gap) => {
                    const skill = allSkills.find((s) => s.id === gap.skillId);
                    return (
                      <span key={gap.skillId} className="inline-flex items-center gap-0.5 px-2 py-1 rounded-lg border text-[11px] font-medium bg-danger/10 text-danger border-danger/20">
                        <AlertTriangle size={10} /> {skill?.name}
                      </span>
                    );
                  })}
                </div>
                <button onClick={() => {
                  void handleCreatePlan();
                }} disabled={isGeneratingPlan} className="ignizia-gen-btn px-4 py-2 bg-action text-white text-sm font-bold rounded-lg flex items-center gap-2 disabled:opacity-50">
                  <Zap size={14} /> Generate Learning Plan
                </button>
              </div>
            )}

            {/* ── All on track ── */}
            {employeePlans.length === 0 && !hasUncoveredGaps && (
              <div className="bg-success/5 dark:bg-success/10 border border-success/20 rounded-xl p-5 flex items-center gap-4">
                <div className="w-10 h-10 rounded-full bg-success/15 flex items-center justify-center flex-shrink-0">
                  <CheckCircle2 size={20} className="text-success" />
                </div>
                <div>
                  <h3 className="font-semibold text-slate-900 dark:text-slate-100 text-sm">All skills on track</h3>
                  <p className="text-xs text-slate-500">{employee.name} meets role requirements.</p>
                </div>
              </div>
            )}

            {/* ── Plan Selector Cards ── */}
            {employeePlans.length > 0 && (
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <GraduationCap size={13} className="text-action" />
                  <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Learning Plans</span>
                </div>
                <div className="grid gap-3" style={{ gridTemplateColumns: employeePlans.length === 1 ? '1fr' : 'repeat(auto-fill, minmax(280px, 1fr))' }}>
                  {employeePlans.map((plan, planIdx) => {
                    const completedSteps = plan.steps.filter(s => s.status === 'done').length;
                    const progress = Math.round((completedSteps / plan.steps.length) * 100);
                    const totalHours = plan.steps.reduce((sum, s) => {
                      const r = resources.find(rr => rr.id === s.resourceId);
                      return sum + (r?.estimatedHours ?? 0);
                    }, 0);
                    const isCareerPlan = plan.title.toLowerCase().includes('career');
                    const planCareerSkills = new Set<string>();
                    const planJobSkills = new Set<string>();
                    plan.steps.forEach(step => {
                      step.targetSkills.forEach(sid => {
                        if (isCareerPathSkill(sid)) planCareerSkills.add(sid);
                        else planJobSkills.add(sid);
                      });
                    });

                    return (
                      <button
                        key={plan.id}
                        onClick={() => setViewingPlanId(plan.id)}
                        className={cn(
                          'text-left rounded-xl border p-4 transition-all duration-300 hover:shadow-md group',
                          isCareerPlan
                            ? 'bg-gradient-to-br from-brand-orange/5 to-brand-green/5 border-brand-orange/20 hover:border-brand-orange/40'
                            : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-action/30',
                        )}
                        style={{ animation: `ignizia-fade-up 0.4s ease-out ${planIdx * 100}ms both` }}
                      >
                        <div className="flex items-start gap-3">
                          {/* Mini ring */}
                          <div className="relative w-12 h-12 flex-shrink-0">
                            <svg viewBox="0 0 36 36" className="w-full h-full -rotate-90">
                              <circle cx="18" cy="18" r="15.9155" fill="none" strokeWidth="3"
                                className="stroke-slate-100 dark:stroke-slate-800" />
                              <circle cx="18" cy="18" r="15.9155" fill="none" strokeWidth="3"
                                stroke={progress >= 100 ? '#2DC37C' : isCareerPlan ? '#FAB61F' : '#127BC4'}
                                strokeDasharray={`${progress} 100`}
                                strokeLinecap="round" />
                            </svg>
                            <div className="absolute inset-0 flex items-center justify-center">
                              <span className="text-[11px] font-bold text-slate-700 dark:text-slate-300">{progress}%</span>
                            </div>
                          </div>

                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 truncate">{plan.title}</h3>
                            </div>
                            <div className="flex items-center gap-2 mb-2">
                              <span className={cn(
                                'px-1.5 py-0.5 rounded text-[9px] font-bold uppercase',
                                plan.status === 'completed' ? 'bg-success/15 text-success'
                                  : isCareerPlan ? 'bg-brand-orange/10 text-brand-orange' : 'bg-action/10 text-action',
                              )}>
                                {plan.status.replace('_', ' ')}
                              </span>
                              <span className="text-[9px] text-slate-400">{plan.steps.length} steps{totalHours > 0 ? ` · ${totalHours}h` : ''}</span>
                              {planCareerSkills.size > 0 && planJobSkills.size > 0 && (
                                <span className="text-[8px] font-bold text-brand-green bg-brand-green/8 px-1.5 py-0.5 rounded">JOB + CAREER</span>
                              )}
                            </div>
                            {/* Skill tags */}
                            <div className="flex flex-wrap gap-1">
                              {Array.from(new Set(plan.steps.flatMap(s => s.targetSkills))).slice(0, 3).map(sid => {
                                const isCareer = isCareerPathSkill(sid);
                                return (
                                  <span key={sid} className={cn(
                                    'inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[8px] font-medium',
                                    isCareer ? 'bg-brand-orange/8 text-brand-orange' : 'bg-action/8 text-action',
                                  )}>
                                    {isCareer ? <Compass size={6} /> : <Briefcase size={6} />}
                                    {allSkills.find(s => s.id === sid)?.name}
                                  </span>
                                );
                              })}
                            </div>
                          </div>

                          <ArrowRight size={14} className="text-slate-300 group-hover:text-action transition-colors flex-shrink-0 mt-1" />
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* ── Career Path Plan Generator ── */}
            {careerFlowPath && careerFlowPath.deepDive?.skillComparison && (() => {
              const pathSkillsToGrow = careerFlowPath.deepDive.skillComparison.filter(
                s => s.requiredLevel > s.userLevel
              );
              if (pathSkillsToGrow.length === 0) return null;

              const coveredByPlans = pathSkillsToGrow.filter(ps => {
                return employeePlans.some(p =>
                  p.steps.some(step =>
                    step.targetSkills.some(sid => isCareerPathSkill(sid) && (() => {
                      const name = allSkills.find(s => s.id === sid)?.name?.toLowerCase() ?? '';
                      const pName = ps.skill.toLowerCase();
                      return pName.split(/\s+/).some(w => w.length > 3 && name.includes(w)) ||
                        name.split(/\s+/).some(w => w.length > 3 && pName.includes(w));
                    })())
                  )
                );
              });

              const notCovered = pathSkillsToGrow.filter(ps => !coveredByPlans.includes(ps));
              const hasExistingCareerPlan = employeePlans.some(p => p.title.toLowerCase().includes('career'));

              if (notCovered.length === 0 && !hasExistingCareerPlan) return null;

              return (
                <div
                  className="bg-gradient-to-r from-brand-orange/5 to-brand-green/5 border border-brand-orange/15 rounded-xl p-4"
                  style={{ animation: 'ignizia-fade-up 0.4s ease-out 0.2s both' }}
                >
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <Compass size={13} className="text-brand-orange" />
                      <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">
                        Career Path · {careerFlowPath.role.title}
                      </span>
                    </div>
                    {coveredByPlans.length > 0 && (
                      <span className="text-[9px] font-bold text-success bg-success/10 px-1.5 py-0.5 rounded">
                        {coveredByPlans.length} covered
                      </span>
                    )}
                  </div>

                  {coveredByPlans.length > 0 && (
                    <div className="mb-3">
                      <div className="flex flex-wrap gap-1.5">
                        {(expandLearningCareerSkills ? coveredByPlans : coveredByPlans.slice(0, INITIAL_SKILLS_VISIBLE)).map(s => (
                          <span key={s.skill} className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[9px] font-medium bg-success/10 text-success border border-success/15">
                            <CheckCircle2 size={7} /> {s.skill}
                          </span>
                        ))}
                      </div>
                      {coveredByPlans.length > INITIAL_SKILLS_VISIBLE && (
                        <button
                          type="button"
                          onClick={() => setExpandLearningCareerSkills(!expandLearningCareerSkills)}
                          className="mt-1.5 text-[9px] font-bold text-action hover:text-brand-blue transition-colors flex items-center gap-0.5"
                        >
                          {expandLearningCareerSkills ? 'Show less' : `Show all ${coveredByPlans.length} covered`}
                          <ChevronDown size={9} className={expandLearningCareerSkills ? 'rotate-180' : ''} />
                        </button>
                      )}
                    </div>
                  )}

                  {notCovered.length > 0 && (
                    <div>
                      <div className="flex items-center gap-1.5 mb-2">
                        <Sparkles size={10} className="text-brand-orange" />
                        <span className="text-[10px] font-semibold text-slate-500">
                          {notCovered.length} skill{notCovered.length > 1 ? 's' : ''} need a dedicated career path plan
                        </span>
                      </div>
                      <div className="flex flex-wrap gap-1.5 mb-1.5">
                        {(expandLearningCareerSkills ? notCovered : notCovered.slice(0, INITIAL_SKILLS_VISIBLE)).map(s => (
                          <span key={s.skill} className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[9px] font-medium bg-brand-orange/10 text-brand-orange border border-brand-orange/15">
                            <Target size={7} /> {s.skill}
                            <span className="opacity-50">{s.userLevel}→{s.requiredLevel}</span>
                          </span>
                        ))}
                      </div>
                      {notCovered.length > INITIAL_SKILLS_VISIBLE && (
                        <button
                          type="button"
                          onClick={() => setExpandLearningCareerSkills(!expandLearningCareerSkills)}
                          className="mb-3 text-[9px] font-bold text-action hover:text-brand-blue transition-colors flex items-center gap-0.5"
                        >
                          {expandLearningCareerSkills ? 'Show less' : `Show all ${notCovered.length} skills`}
                          <ChevronDown size={9} className={expandLearningCareerSkills ? 'rotate-180' : ''} />
                        </button>
                      )}
                      {notCovered.length <= INITIAL_SKILLS_VISIBLE && <div className="mb-3" />}

                      {!hasExistingCareerPlan && (
                        <button
                          onClick={() => {
                            setIsGeneratingCareerPlan(true);
                            setIsGeneratingPlan(true);
                            setTimeout(() => {
                              const careerPlanTitle = `Career Path: ${careerFlowPath.role.title}`;
                              const careerSteps = notCovered.slice(0, 5).map((skill, i) => {
                                const keywords = skill.skill.toLowerCase().split(/\s+/).filter(w => w.length > 3);
                                const matchedRes = resources.find(r =>
                                  keywords.some(kw => r.title.toLowerCase().includes(kw) || (r.description && r.description.toLowerCase().includes(kw)))
                                );
                                const skillIds = allSkills
                                  .filter(s => keywords.some(kw => s.name.toLowerCase().includes(kw)))
                                  .map(s => s.id);
                                return {
                                  id: `career-step-${i}`,
                                  resourceId: matchedRes?.id ?? resources[i % resources.length]?.id ?? 'res-1',
                                  targetSkills: skillIds.length > 0 ? skillIds : [allSkills[0]?.id ?? 'bucket-1-skill-1'],
                                  status: 'todo' as const,
                                };
                              });

                              const careerPlan = {
                                id: `career-plan-${Date.now()}`,
                                scope: 'person' as const,
                                personId: employee.id,
                                title: careerPlanTitle,
                                createdBy: 'ignizia-ai',
                                status: 'assigned' as const,
                                steps: careerSteps,
                                createdAt: new Date().toISOString(),
                                updatedAt: new Date().toISOString(),
                              };
                              updateLearningPlan(careerPlan);
                              setIsGeneratingPlan(false);
                              setIsGeneratingCareerPlan(false);
                              setJustGenerated(true);
                              setTimeout(() => setJustGenerated(false), 2000);
                            }, 1800);
                          }}
                          disabled={isGeneratingCareerPlan}
                          className="ignizia-gen-btn px-4 py-2 bg-brand-orange text-white text-sm font-bold rounded-lg flex items-center gap-2 disabled:opacity-50"
                        >
                          <Sparkles size={14} />
                          Generate Career Path Plan
                        </button>
                      )}
                    </div>
                  )}
                </div>
              );
            })()}
          </div>
        );
      })()}

      {activeTab === 'settings' && (
        <div className="bg-white dark:bg-slate-900 p-8 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm max-w-2xl">
          <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100 mb-6">Privacy & AI Controls</h2>
          <div className="space-y-8">
            <div className="flex items-center justify-between flex-wrap gap-4">
              <div>
                <p className="font-bold text-slate-900 dark:text-slate-100">Profile Visibility</p>
                <p className="text-sm text-slate-500 dark:text-slate-400">Who can see your skill profile and readiness scores.</p>
              </div>
              <select 
                value={employee.privacy.visibility}
                onChange={(e) => updatePrivacy({ visibility: e.target.value as any })}
                className="text-sm border-slate-200 dark:border-slate-700 rounded-lg bg-slate-50 dark:bg-slate-800 py-1.5 pl-3 pr-8 font-medium text-slate-700 dark:text-slate-300"
              >
                <option value="org_visible">Organization Wide</option>
                <option value="managers_only">Managers Only</option>
                <option value="private">Private</option>
              </select>
            </div>

            <div className="pt-6 border-t border-slate-100 dark:border-slate-800">
              <h3 className="font-bold text-slate-900 dark:text-slate-100 mb-4">AI Skill Inference</h3>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-action/10 dark:bg-action/20 text-action rounded-lg flex items-center justify-center">
                      <Zap size={20} />
                    </div>
                    <div>
                      <p className="text-sm font-bold text-slate-900 dark:text-slate-100">Allow AI Suggestions</p>
                      <p className="text-xs text-slate-500 dark:text-slate-400">AI will suggest new skills based on your work signals.</p>
                    </div>
                  </div>
                  <button 
                    onClick={() => updatePrivacy({ allowAiToAddSkills: !employee.privacy.allowAiToAddSkills })}
                    className={cn(
                      "w-12 h-6 rounded-full relative transition-colors",
                      employee.privacy.allowAiToAddSkills ? "bg-action" : "bg-slate-300 dark:bg-slate-700"
                    )}
                  >
                    <div className={cn(
                      "absolute top-1 w-4 h-4 bg-white rounded-full transition-all",
                      employee.privacy.allowAiToAddSkills ? "left-7" : "left-1"
                    )} />
                  </button>
                </div>
              </div>
            </div>

            <div className="pt-6 border-t border-slate-100 dark:border-slate-800">
              <h3 className="font-bold text-slate-900 dark:text-slate-100 mb-4">Restricted Domains</h3>
              <p className="text-sm text-slate-500 dark:text-slate-400 mb-4">Prevent AI from inferring skills in these sensitive domains.</p>
              <div className="flex flex-wrap gap-2">
                {['Emotional Intelligence', 'Conflict Resolution'].map(d => (
                  <span key={d} className="px-3 py-1 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 rounded-full text-xs font-bold border border-slate-200 dark:border-slate-700">
                    {d}
                  </span>
                ))}
                <button 
                  onClick={() => {
                    const domain = prompt('Enter domain to restrict:');
                    if (domain) alert(`Domain "${domain}" restricted for AI inference.`);
                  }}
                  className="px-3 py-1 bg-white dark:bg-slate-900 border border-dashed border-slate-300 dark:border-slate-700 text-slate-400 rounded-full text-xs font-bold hover:border-action/40 hover:text-action transition-colors"
                >
                  + Add Domain
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Manage Skills Modal */}
      {isManagingSkills && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl max-w-md w-full p-6">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100">Add Manual Skill</h2>
              <button onClick={() => setIsManagingSkills(false)} className="text-slate-400 hover:text-slate-600">
                <XCircle size={24} />
              </button>
            </div>
            
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-1">Skill</label>
                <select 
                  value={newSkill.skillId}
                  onChange={(e) => setNewSkill({ ...newSkill, skillId: e.target.value })}
                  className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm focus:ring-2 focus:ring-action text-slate-900 dark:text-slate-100"
                >
                  <option value="">Select a skill...</option>
                  {allSkills.map(s => (
                    <option key={s.id} value={s.id}>{s.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-1">Proficiency Level (1-5)</label>
                <input 
                  type="number"
                  min="1"
                  max="5"
                  value={newSkill.level}
                  onChange={(e) => setNewSkill({ ...newSkill, level: (parseInt(e.target.value) || 1) as ProficiencyLevel })}
                  className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm focus:ring-2 focus:ring-action text-slate-900 dark:text-slate-100"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-1">Status</label>
                <select 
                  value={newSkill.status}
                  onChange={(e) => setNewSkill({ ...newSkill, status: e.target.value as any })}
                  className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm focus:ring-2 focus:ring-action text-slate-900 dark:text-slate-100"
                >
                  <option value="confirmed">Validated / Confirmed</option>
                  <option value="proposed">Proposed (Needs Validation)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-1">Evidence Notes (Optional)</label>
                <textarea 
                  value={newSkill.notes}
                  onChange={(e) => setNewSkill({ ...newSkill, notes: e.target.value })}
                  className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm focus:ring-2 focus:ring-action h-24 resize-none text-slate-900 dark:text-slate-100"
                  placeholder="e.g. Completed external certification, demonstrated in previous role..."
                />
              </div>

              <div className="pt-4 flex gap-3">
                <button 
                  onClick={() => setIsManagingSkills(false)}
                  className="flex-1 py-2 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 font-bold rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
                >
                  Cancel
                </button>
                <button 
                  onClick={handleAddManualSkill}
                  disabled={!newSkill.skillId}
                  className="flex-1 py-2 bg-action text-white font-bold rounded-lg hover:bg-brand-blue disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  Add Skill
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
