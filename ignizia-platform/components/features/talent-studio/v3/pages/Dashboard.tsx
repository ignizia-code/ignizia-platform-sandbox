import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { useApp } from '../store/AppContext';
import {
  Users, TrendingUp, AlertTriangle, ShieldAlert,
  CheckCircle2, X, Sparkles, UserPlus,
  GraduationCap, ArrowRightLeft,
  ChevronRight, Activity, Compass, Zap
} from 'lucide-react';
import { cn } from '../lib/utils';
import { computeDashboardIntel, DashboardRecommendation, RoleRisk, SPOFSkill } from '../lib/dashboard-intel';
import type { ChosenCareerPath } from '@/lib/career-flow/types';

type SkillMatchResult = 'met' | 'partial' | 'gap';

const MATCH_STYLES: Record<SkillMatchResult, string> = {
  met: 'bg-success/15 text-success border-success/25',
  partial: 'bg-warning/15 text-warning border-warning/25',
  gap: 'bg-danger/15 text-danger border-danger/25',
};

const REC_CFG: Record<string, {
  icon: React.ComponentType<{ size?: number; className?: string }>;
  label: string;
  gradient: string;
  accent: string;
  btnClass: string;
  dotColor: string;
}> = {
  backup: { icon: ShieldAlert, label: 'Cross-Train', gradient: 'from-brand-red/12 to-brand-red/4', accent: 'text-brand-red', btnClass: 'bg-brand-red hover:bg-brand-red/90 text-white', dotColor: 'bg-brand-red' },
  move: { icon: ArrowRightLeft, label: 'Move', gradient: 'from-action/12 to-action/4', accent: 'text-action', btnClass: 'bg-action hover:bg-action/90 text-white', dotColor: 'bg-action' },
  upskill: { icon: GraduationCap, label: 'Upskill', gradient: 'from-brand-green/12 to-brand-green/4', accent: 'text-brand-green', btnClass: 'bg-brand-green hover:bg-brand-green/90 text-white', dotColor: 'bg-brand-green' },
  hire: { icon: UserPlus, label: 'Hire', gradient: 'from-brand-orange/12 to-brand-orange/4', accent: 'text-brand-orange', btnClass: 'bg-brand-orange hover:bg-brand-orange/90 text-white', dotColor: 'bg-brand-orange' },
  rebalance: { icon: Activity, label: 'Rebalance', gradient: 'from-info/12 to-info/4', accent: 'text-info', btnClass: 'bg-info hover:bg-info/90 text-white', dotColor: 'bg-info' },
};

export default function Dashboard() {
  const { roles, employees, departments, allSkills, getExpertRanking, generateLearningPlan, setCurrentPage, setParams } = useApp();

  const intel = useMemo(
    () => computeDashboardIntel(employees, roles, departments, allSkills, getExpertRanking),
    [employees, roles, departments, allSkills, getExpertRanking],
  );

  const [ready, setReady] = useState(false);
  const [actionedRecs, setActionedRecs] = useState<Set<string>>(new Set());
  const [approvedRecs, setApprovedRecs] = useState<Set<string>>(new Set());
  const [fadingRecs, setFadingRecs] = useState<Set<string>>(new Set());
  const [slidePanel, setSlidePanel] = useState<{ type: 'role' | 'spof' | 'workload'; data: RoleRisk | SPOFSkill | null } | null>(null);
  const [careerPaths, setCareerPaths] = useState<ChosenCareerPath[]>([]);

  useEffect(() => { const t = setTimeout(() => setReady(true), 60); return () => clearTimeout(t); }, []);

  useEffect(() => {
    try {
      const raw = localStorage.getItem('ignizia_career_aspiration');
      if (raw) {
        const parsed = JSON.parse(raw);
        setCareerPaths(Array.isArray(parsed) ? parsed : [parsed]);
      }
    } catch { /* no career data */ }
  }, []);

  const handleApprove = useCallback((rec: DashboardRecommendation) => {
    setApprovedRecs(prev => new Set(prev).add(rec.id));
    if ((rec.type === 'backup' || rec.type === 'upskill') && rec.employeeId && rec.roleId) {
      generateLearningPlan(rec.employeeId, rec.roleId);
    }
    setTimeout(() => {
      setFadingRecs(prev => new Set(prev).add(rec.id));
      setTimeout(() => {
        setActionedRecs(prev => new Set(prev).add(rec.id));
        setFadingRecs(prev => { const n = new Set(prev); n.delete(rec.id); return n; });
        setApprovedRecs(prev => { const n = new Set(prev); n.delete(rec.id); return n; });
      }, 400);
    }, 800);
  }, [generateLearningPlan]);

  const handleSkip = useCallback((rec: DashboardRecommendation) => {
    setFadingRecs(prev => new Set(prev).add(rec.id));
    setTimeout(() => {
      setActionedRecs(prev => new Set(prev).add(rec.id));
      setFadingRecs(prev => { const n = new Set(prev); n.delete(rec.id); return n; });
    }, 400);
  }, []);

  const getCareerNote = useCallback((rec: DashboardRecommendation): string | null => {
    if (rec.type !== 'upskill' || !rec.employeeId) return null;
    const cp = careerPaths.find(c => c.employeeId === rec.employeeId);
    if (!cp) return null;
    return `Advances toward ${cp.role?.title || 'career goal'}`;
  }, [careerPaths]);

  const activeRecs = intel.recommendations.filter(r => !actionedRecs.has(r.id));
  const heroRecs = activeRecs.slice(0, 3);
  const queueRecs = activeRecs.slice(3, 8);

  const topAlerts = useMemo(() => {
    const alerts: { id: string; type: 'spof' | 'role' | 'workload'; label: string; severity: 'critical' | 'warning' | 'info'; data: RoleRisk | SPOFSkill | null }[] = [];
    intel.spofSkills.slice(0, 3).forEach(s => alerts.push({
      id: `spof-${s.skillId}`, type: 'spof', label: `${s.skillName} — only ${s.holderName.split(' ')[0]}`,
      severity: 'critical', data: s,
    }));
    intel.roleRisks.filter(r => r.riskLevel === 'High').slice(0, 2).forEach(r => alerts.push({
      id: `role-${r.roleId}`, type: 'role', label: `${r.roleName} — ${r.gapCount} gap${r.gapCount > 1 ? 's' : ''}`,
      severity: 'warning', data: r,
    }));
    if (intel.overloadedCount > 0) alerts.push({
      id: 'workload', type: 'workload', label: `${intel.overloadedCount} overloaded`,
      severity: 'info', data: null,
    });
    return alerts.slice(0, 5);
  }, [intel]);

  const navigateToEmployee = (empId: string) => {
    const exists = employees.find(e => e.id === empId);
    if (exists) {
      setParams({ empId });
      setCurrentPage('employee-profile');
    }
  };

  return (
    <div className="h-full flex flex-col overflow-hidden">
      <style>{`
        @keyframes db-up { from { opacity:0; transform:translateY(16px) } to { opacity:1; transform:translateY(0) } }
        @keyframes db-scale { from { opacity:0; transform:scale(0.92) } to { opacity:1; transform:scale(1) } }
        @keyframes db-slide { from { opacity:0; transform:translateX(20px) } to { opacity:1; transform:translateX(0) } }
        @keyframes db-fade-out { from { opacity:1; transform:scale(1) } to { opacity:0; transform:scale(0.95) translateX(-12px) } }
        @keyframes db-approved { 0% { box-shadow: 0 0 0 0 rgba(37,195,117,0.3) } 50% { box-shadow: 0 0 20px 4px rgba(37,195,117,0.15) } 100% { box-shadow: 0 0 0 0 transparent } }
        @keyframes db-sparkle { 0% { opacity:0; transform:translateY(0) scale(.5) } 40% { opacity:1; transform:translateY(-10px) scale(1) } 100% { opacity:0; transform:translateY(-22px) scale(.3) } }
        @keyframes db-glow { 0%,100% { opacity:.4 } 50% { opacity:1 } }
      `}</style>

      {/* ── Header with inline KPIs ── */}
      <div className={cn('flex items-end justify-between mb-8 flex-shrink-0 transition-all duration-500', ready ? 'opacity-100' : 'opacity-0 translate-y-3')}>
        <div>
          <div className="flex items-center gap-3 mb-1">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-brand-blue to-brand-navy flex items-center justify-center shadow-lg shadow-brand-blue/20">
              <Sparkles size={17} className="text-white" />
            </div>
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Workforce Command Center</h1>
          </div>
          <p className="text-slate-400 text-sm ml-12">What needs your attention today</p>
        </div>

        {/* Inline KPIs */}
        <div className="flex items-center gap-6">
          {[
            { v: `${intel.avgReadiness}%`, l: 'Readiness', c: intel.avgReadiness >= 70 ? 'text-success' : 'text-warning' },
            { v: `${intel.orgCoverage}%`, l: 'Coverage', c: intel.orgCoverage >= 70 ? 'text-success' : 'text-warning' },
            { v: String(intel.spofCount), l: 'SPOFs', c: intel.spofCount > 0 ? 'text-danger' : 'text-success' },
            { v: String(intel.overloadedCount), l: 'Overloaded', c: intel.overloadedCount > 0 ? 'text-warning' : 'text-success' },
          ].map((kpi, i) => (
            <div key={kpi.l} className="text-right" style={ready ? { animation: `db-up 0.4s ease-out ${0.15 + i * 0.08}s both` } : {}}>
              <p className={cn('text-2xl font-bold leading-none tracking-tight', kpi.c)}>{kpi.v}</p>
              <p className="text-[10px] font-medium text-slate-400 uppercase tracking-wider mt-0.5">{kpi.l}</p>
            </div>
          ))}
        </div>
      </div>

      {/* ── Main Content ── */}
      <div className="flex-1 flex flex-col min-h-0 gap-6">

        {/* ── Hero: Top 3 AI Recommendations (Podium Style) ── */}
        <div className={cn('flex-shrink-0 transition-all duration-500', ready ? 'opacity-100' : 'opacity-0')}>
          <div className="flex items-center gap-2 mb-4">
            <Sparkles size={14} className="text-brand-blue" style={ready ? { animation: 'db-glow 2s ease-in-out infinite' } : {}} />
            <h2 className="text-xs font-bold text-slate-500 uppercase tracking-[0.15em]">IGNIZIA Recommends</h2>
            {activeRecs.length > 3 && (
              <span className="ml-auto text-[10px] text-slate-400 font-medium">+{activeRecs.length - 3} more</span>
            )}
          </div>

          {heroRecs.length > 0 ? (
            <div className="flex gap-4 items-stretch">
              {heroRecs.map((rec, idx) => {
                const cfg = REC_CFG[rec.type];
                const RecIcon = cfg.icon;
                const isApproved = approvedRecs.has(rec.id);
                const isFading = fadingRecs.has(rec.id);
                const career = getCareerNote(rec);
                const isHero = idx === 0;

                return (
                  <div
                    key={rec.id}
                    className={cn(
                      'relative rounded-2xl transition-all overflow-hidden bg-white',
                      isHero ? 'flex-[1.3] border border-slate-200 shadow-lg' : 'flex-1 border border-slate-100',
                      !isApproved && !isFading && 'hover:shadow-xl hover:-translate-y-1',
                    )}
                    style={{
                      ...(ready && !isApproved && !isFading ? { animation: `db-scale 0.5s ease-out ${0.2 + idx * 0.12}s both` } : {}),
                      ...(isApproved ? { animation: 'db-approved 0.8s ease-out both' } : {}),
                      ...(isFading ? { animation: 'db-fade-out 0.4s ease-in both' } : {}),
                    }}
                  >
                    {/* Accent strip */}
                    <div className={cn('h-1 w-full bg-gradient-to-r', cfg.gradient)} />

                    <div className={cn('flex flex-col', isHero ? 'p-6' : 'p-5')}>
                      {/* Approved overlay */}
                      {isApproved && (
                        <div className="absolute inset-0 bg-white/85 flex items-center justify-center z-10 rounded-2xl backdrop-blur-[2px]">
                          <div className="flex items-center gap-2 text-success">
                            <CheckCircle2 size={22} />
                            <span className="text-sm font-bold">Approved</span>
                          </div>
                          {[0, 1, 2].map(i => (
                            <Sparkles key={i} size={12} className="text-brand-orange absolute" style={{ left: `${40 + i * 15}%`, top: '20%', animation: `db-sparkle 0.8s ease-out ${i * 0.12}s both` }} />
                          ))}
                        </div>
                      )}

                      {/* Header row */}
                      <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-2.5">
                          <div className={cn('rounded-xl bg-gradient-to-br flex items-center justify-center', cfg.gradient, isHero ? 'w-10 h-10' : 'w-8 h-8')}>
                            <RecIcon size={isHero ? 18 : 15} className={cfg.accent} />
                          </div>
                          <div>
                            <span className={cn('text-[10px] font-bold uppercase tracking-wider block', cfg.accent)}>{cfg.label}</span>
                            <span className="text-[9px] text-slate-400 capitalize">{rec.urgency}</span>
                          </div>
                        </div>
                        <div className={cn('w-2 h-2 rounded-full animate-pulse', rec.urgency === 'critical' ? 'bg-danger shadow-[0_0_8px_theme(colors.danger)]' : rec.urgency === 'high' ? 'bg-warning shadow-[0_0_8px_theme(colors.warning)]' : 'bg-info')} />
                      </div>

                      {/* Title */}
                      <h3 className={cn('font-semibold text-slate-900 leading-snug mb-2.5', isHero ? 'text-[15px]' : 'text-[13px]')}>
                        {rec.title}
                      </h3>

                      {/* Reasoning */}
                      <p className={cn('text-slate-500 leading-relaxed mb-3', isHero ? 'text-xs line-clamp-3' : 'text-[11px] line-clamp-2')}>
                        {rec.reasoning}
                      </p>

                      {career && (
                        <div className="flex items-center gap-1.5 mb-3 text-[10px] text-brand-orange font-medium">
                          <Compass size={10} /> {career}
                        </div>
                      )}

                      <div className="flex items-center gap-1.5 mb-4 mt-auto">
                        <TrendingUp size={11} className="text-success flex-shrink-0" />
                        <span className="text-[11px] text-success font-medium line-clamp-1">{rec.impact}</span>
                      </div>

                      {/* CTAs */}
                      {!isApproved && (
                        <div className="flex items-center gap-2">
                          <button onClick={() => handleApprove(rec)} className={cn('text-xs font-semibold rounded-xl transition-all shadow-sm', cfg.btnClass, isHero ? 'px-5 py-2.5' : 'px-4 py-2')}>
                            Approve
                          </button>
                          <button onClick={() => handleSkip(rec)} className="text-xs font-medium px-3 py-2 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-50 transition-colors">
                            Skip
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="flex items-center justify-center py-12 bg-success/5 rounded-2xl border border-success/15">
              <CheckCircle2 size={24} className="text-success mr-3" />
              <span className="text-sm font-semibold text-success">All clear — no actions needed</span>
            </div>
          )}
        </div>

        {/* ── Bottom Row: Attention Signals + Queue ── */}
        <div className={cn('flex-1 grid grid-cols-12 gap-5 min-h-0 transition-all duration-500', ready ? 'opacity-100' : 'opacity-0 translate-y-2')}>

          {/* ── Left: Attention Signals ── */}
          <div className="col-span-7 flex flex-col min-h-0" style={ready ? { animation: 'db-up 0.5s ease-out 0.4s both' } : {}}>
            <h2 className="text-xs font-bold text-slate-500 uppercase tracking-[0.15em] mb-3 flex items-center gap-2">
              <AlertTriangle size={12} className="text-danger" />
              Needs Attention
            </h2>

            <div className="flex-1 overflow-y-auto space-y-2 pr-1 scrollbar-thin">
              {topAlerts.map((alert, idx) => (
                <button
                  key={alert.id}
                  onClick={() => {
                    if (alert.type === 'spof') setSlidePanel({ type: 'spof', data: alert.data as SPOFSkill });
                    else if (alert.type === 'role') setSlidePanel({ type: 'role', data: alert.data as RoleRisk });
                    else setSlidePanel({ type: 'workload', data: null });
                  }}
                  className="w-full flex items-center gap-3 px-4 py-3 rounded-xl bg-white border border-slate-100 hover:shadow-md hover:-translate-y-0.5 transition-all text-left group"
                  style={ready ? { animation: `db-up 0.4s ease-out ${0.45 + idx * 0.07}s both` } : {}}
                >
                  <div className={cn(
                    'w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0',
                    alert.severity === 'critical' ? 'bg-danger/10' : alert.severity === 'warning' ? 'bg-warning/10' : 'bg-info/10',
                  )}>
                    {alert.type === 'spof' && <AlertTriangle size={15} className="text-danger" />}
                    {alert.type === 'role' && <Users size={15} className="text-warning" />}
                    {alert.type === 'workload' && <Zap size={15} className="text-info" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-slate-800 truncate">{alert.label}</p>
                    <p className="text-[10px] text-slate-400 uppercase tracking-wider">
                      {alert.type === 'spof' ? 'Single point of failure' : alert.type === 'role' ? 'Exposed role' : 'Workload imbalance'}
                    </p>
                  </div>
                  <ChevronRight size={14} className="text-slate-300 group-hover:text-brand-blue transition-colors flex-shrink-0" />
                </button>
              ))}

              {topAlerts.length === 0 && (
                <div className="flex items-center justify-center py-8 text-slate-300">
                  <CheckCircle2 size={20} className="mr-2" />
                  <span className="text-sm font-medium">No critical alerts</span>
                </div>
              )}

              {/* Workload health strip */}
              <div className="mt-3 px-4 py-3 rounded-xl bg-white border border-slate-100" style={ready ? { animation: 'db-up 0.4s ease-out 0.7s both' } : {}}>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.15em] mb-2">Workload Balance</p>
                <div className="flex items-center gap-1 h-3 rounded-full overflow-hidden bg-slate-100 mb-2">
                  {(['Overloaded', 'At Capacity', 'Balanced', 'Underutilized'] as const).map(level => {
                    const count = intel.workloadDistribution[level].length;
                    const pct = intel.totalEmployees > 0 ? (count / intel.totalEmployees) * 100 : 0;
                    if (pct === 0) return null;
                    const c = { Overloaded: 'bg-danger', 'At Capacity': 'bg-warning', Balanced: 'bg-success', Underutilized: 'bg-info' };
                    return <div key={level} className={cn('h-full rounded-full', c[level])} style={{ width: `${Math.max(pct, 5)}%` }} />;
                  })}
                </div>
                <div className="flex gap-4">
                  {(['Overloaded', 'At Capacity', 'Balanced', 'Underutilized'] as const).map(level => {
                    const count = intel.workloadDistribution[level].length;
                    const c = { Overloaded: 'text-danger', 'At Capacity': 'text-warning', Balanced: 'text-success', Underutilized: 'text-info' };
                    const d = { Overloaded: 'bg-danger', 'At Capacity': 'bg-warning', Balanced: 'bg-success', Underutilized: 'bg-info' };
                    return (
                      <div key={level} className="flex items-center gap-1">
                        <div className={cn('w-1.5 h-1.5 rounded-full', d[level])} />
                        <span className={cn('text-[10px] font-medium', c[level])}>{count}</span>
                        <span className="text-[10px] text-slate-400">{level === 'At Capacity' ? 'Capacity' : level}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>

          {/* ── Right: Action Queue ── */}
          <div className="col-span-5 flex flex-col min-h-0" style={ready ? { animation: 'db-up 0.5s ease-out 0.5s both' } : {}}>
            <h2 className="text-xs font-bold text-slate-500 uppercase tracking-[0.15em] mb-3">
              Action Queue
            </h2>

            <div className="flex-1 overflow-y-auto space-y-1.5 pr-1 scrollbar-thin">
              {queueRecs.map((rec, idx) => {
                const cfg = REC_CFG[rec.type];
                const RecIcon = cfg.icon;
                return (
                  <div
                    key={rec.id}
                    className="flex items-center gap-3 px-3 py-2.5 rounded-xl bg-white border border-slate-100 hover:shadow-sm transition-all group"
                    style={ready ? { animation: `db-slide 0.3s ease-out ${0.55 + idx * 0.06}s both` } : {}}
                  >
                    <div className={cn('w-6 h-6 rounded-md flex items-center justify-center flex-shrink-0 bg-gradient-to-br', cfg.gradient)}>
                      <RecIcon size={12} className={cfg.accent} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium text-slate-700 truncate">{rec.title}</p>
                    </div>
                    <div className="flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
                      <button onClick={() => handleApprove(rec)} className="text-[10px] font-semibold text-success hover:underline">Approve</button>
                      <span className="text-slate-200">·</span>
                      <button onClick={() => handleSkip(rec)} className="text-[10px] text-slate-400 hover:underline">Skip</button>
                    </div>
                  </div>
                );
              })}

              {queueRecs.length === 0 && activeRecs.length <= 3 && (
                <div className="flex flex-col items-center justify-center py-8 text-slate-300">
                  <Sparkles size={20} className="mb-2" />
                  <span className="text-xs font-medium">Queue is clear</span>
                </div>
              )}

              {/* Department Overview */}
              {intel.departmentHealth.length > 0 && (
                <div className="mt-3">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.15em] mb-2">Departments</p>
                  <div className="space-y-1.5">
                    {intel.departmentHealth.map(dh => (
                      <div key={dh.departmentId} className="flex items-center gap-3 px-3 py-2 rounded-lg bg-slate-50/80">
                        <div className={cn('w-2 h-2 rounded-full flex-shrink-0', dh.riskLevel === 'critical' ? 'bg-danger' : dh.riskLevel === 'at-risk' ? 'bg-warning' : 'bg-success')} />
                        <span className="text-xs font-medium text-slate-700 flex-1 truncate">{dh.departmentName}</span>
                        <span className="text-[10px] text-slate-400">{dh.employeeCount} people</span>
                        <span className={cn('text-[10px] font-bold', dh.coveragePercent >= 80 ? 'text-success' : dh.coveragePercent >= 50 ? 'text-warning' : 'text-danger')}>
                          {dh.coveragePercent}%
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ── Slide-in Detail Panel ── */}
      {slidePanel && (
        <>
          <div className="fixed inset-0 bg-black/15 z-40 backdrop-blur-[2px]" onClick={() => setSlidePanel(null)} />
          <div className="fixed right-0 top-0 bottom-0 w-[380px] bg-white shadow-2xl z-50 flex flex-col" style={{ animation: 'db-slide 0.25s ease-out both' }}>
            <div className="flex items-center justify-between px-6 py-5 border-b border-slate-100">
              <h3 className="text-base font-bold text-slate-900">
                {slidePanel.type === 'role' ? (slidePanel.data as RoleRisk).roleName :
                 slidePanel.type === 'spof' ? (slidePanel.data as SPOFSkill).skillName :
                 'Workload Overview'}
              </h3>
              <button onClick={() => setSlidePanel(null)} className="w-8 h-8 rounded-lg hover:bg-slate-100 flex items-center justify-center text-slate-400 hover:text-slate-600 transition-colors">
                <X size={16} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">
              {/* Role detail */}
              {slidePanel.type === 'role' && (() => {
                const rr = slidePanel.data as RoleRisk;
                const role = roles.find(r => r.id === rr.roleId);
                const assignedEmps = employees.filter(e => rr.assignedEmployees.includes(e.id));
                return (
                  <>
                    <div className="flex items-center gap-2">
                      <span className={cn('text-xs font-bold px-2 py-1 rounded-md border', rr.riskLevel === 'High' ? 'bg-danger/10 text-danger border-danger/20' : rr.riskLevel === 'Medium' ? 'bg-warning/10 text-warning border-warning/20' : 'bg-success/10 text-success border-success/20')}>{rr.riskLevel} Risk</span>
                      <span className="text-xs text-slate-400">{rr.departmentName}</span>
                    </div>

                    <div className="grid grid-cols-3 gap-3">
                      {[
                        { v: `${rr.coveragePercent}%`, l: 'Coverage', c: 'text-slate-900' },
                        { v: String(rr.gapCount), l: 'Gaps', c: 'text-danger' },
                        { v: String(rr.spofCount), l: 'SPOFs', c: 'text-warning' },
                      ].map(m => (
                        <div key={m.l} className="text-center p-3 bg-slate-50 rounded-xl">
                          <p className={cn('text-xl font-bold', m.c)}>{m.v}</p>
                          <p className="text-[10px] text-slate-400 uppercase mt-0.5">{m.l}</p>
                        </div>
                      ))}
                    </div>

                    {role && (
                      <div>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Skill Requirements</p>
                        <div className="space-y-1.5">
                          {role.requirements.map(req => {
                            const skill = allSkills.find(s => s.id === req.skillId);
                            const holders = assignedEmps.filter(e => e.assertions.some(a => a.skillId === req.skillId && a.status === 'confirmed' && a.level >= req.minLevel));
                            const matchType: SkillMatchResult = holders.length > 0 ? 'met' : assignedEmps.some(e => e.assertions.some(a => a.skillId === req.skillId && a.status === 'confirmed')) ? 'partial' : 'gap';
                            return (
                              <div key={req.skillId} className={cn('flex items-center justify-between px-3 py-2 rounded-lg border text-xs', MATCH_STYLES[matchType])}>
                                <span className="font-medium">{skill?.name || req.skillId}</span>
                                <span className="font-bold">L{req.minLevel} · {holders.length}/{assignedEmps.length}</span>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    {assignedEmps.length > 0 && (
                      <div>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Assigned</p>
                        {assignedEmps.map(emp => (
                          <button key={emp.id} onClick={() => { setSlidePanel(null); navigateToEmployee(emp.id); }} className="flex items-center gap-3 w-full text-left px-3 py-2 rounded-lg hover:bg-slate-50 transition-colors mb-1">
                            <div className="w-7 h-7 rounded-full bg-brand-blue/10 text-brand-blue flex items-center justify-center text-xs font-bold">{emp.name.charAt(0)}</div>
                            <span className="text-xs font-medium text-slate-800">{emp.name}</span>
                            <span className="text-[10px] text-slate-400 ml-auto">{emp.workload || 'Balanced'}</span>
                          </button>
                        ))}
                      </div>
                    )}
                  </>
                );
              })()}

              {/* SPOF detail */}
              {slidePanel.type === 'spof' && (() => {
                const spof = slidePanel.data as SPOFSkill;
                return (
                  <>
                    <div className="flex items-center gap-2 text-danger">
                      <AlertTriangle size={16} />
                      <span className="text-xs font-bold uppercase tracking-wider">Single Point of Failure</span>
                    </div>

                    <div className="bg-danger/5 border border-danger/15 rounded-xl p-4">
                      <p className="text-[10px] text-slate-400 uppercase mb-2">Only held by</p>
                      <button onClick={() => { setSlidePanel(null); navigateToEmployee(spof.holderId); }} className="flex items-center gap-3 hover:opacity-80 transition-opacity">
                        <div className="w-9 h-9 rounded-full bg-danger/15 text-danger flex items-center justify-center text-sm font-bold">{spof.holderName.charAt(0)}</div>
                        <div>
                          <p className="text-sm font-semibold text-slate-900">{spof.holderName}</p>
                          <p className="text-xs text-slate-500">Level {spof.holderLevel}</p>
                        </div>
                      </button>
                    </div>

                    {spof.bestBackup && (
                      <div className="bg-brand-green/5 border border-brand-green/15 rounded-xl p-4">
                        <p className="text-[10px] font-bold text-brand-green uppercase tracking-wider mb-2">Best Backup</p>
                        <button onClick={() => { setSlidePanel(null); navigateToEmployee(spof.bestBackup!.employeeId); }} className="flex items-center gap-3 hover:opacity-80 transition-opacity mb-2">
                          <div className="w-9 h-9 rounded-full bg-brand-green/15 text-brand-green flex items-center justify-center text-sm font-bold">{spof.bestBackup.employeeName.charAt(0)}</div>
                          <div>
                            <p className="text-sm font-semibold text-slate-900">{spof.bestBackup.employeeName}</p>
                            <p className="text-xs text-slate-500">{spof.bestBackup.currentLevel > 0 ? `Currently L${spof.bestBackup.currentLevel}` : 'Has related skills'}</p>
                          </div>
                        </button>
                        {spof.bestBackup.relatedSkills.length > 0 && (
                          <div className="flex flex-wrap gap-1">
                            {spof.bestBackup.relatedSkills.map(s => (
                              <span key={s} className="text-[10px] font-medium px-2 py-0.5 rounded-md bg-brand-green/10 text-brand-green">{s}</span>
                            ))}
                          </div>
                        )}
                      </div>
                    )}

                    <div>
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Required by</p>
                      {spof.requiredByRoles.map(rr => (
                        <div key={rr.roleId} className="flex items-center justify-between px-3 py-2 bg-slate-50 rounded-lg mb-1">
                          <span className="text-xs font-medium text-slate-700">{rr.roleName}</span>
                          <span className="text-[10px] text-slate-400">Min L{rr.minLevel}</span>
                        </div>
                      ))}
                    </div>
                  </>
                );
              })()}

              {/* Workload detail */}
              {slidePanel.type === 'workload' && (
                <>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Flagged Employees</p>
                  {[...intel.workloadDistribution.Overloaded, ...intel.workloadDistribution.Underutilized].map(emp => {
                    const role = roles.find(r => r.id === emp.roleId);
                    const isOl = emp.workload === 'Overloaded';
                    return (
                      <button key={emp.id} onClick={() => { setSlidePanel(null); navigateToEmployee(emp.id); }} className="flex items-center gap-3 w-full text-left px-3 py-3 rounded-xl bg-white border border-slate-100 hover:shadow-sm transition-all mb-2">
                        <div className={cn('w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white', isOl ? 'bg-danger' : 'bg-info')}>{emp.name.charAt(0)}</div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-slate-800">{emp.name}</p>
                          <p className="text-[10px] text-slate-400">{role?.name}</p>
                        </div>
                        <div className="text-right">
                          <p className={cn('text-sm font-bold', isOl ? 'text-danger' : 'text-info')}>{emp.allocation}%</p>
                          <p className={cn('text-[10px] font-medium', isOl ? 'text-danger' : 'text-info')}>{emp.workload}</p>
                        </div>
                      </button>
                    );
                  })}
                </>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
