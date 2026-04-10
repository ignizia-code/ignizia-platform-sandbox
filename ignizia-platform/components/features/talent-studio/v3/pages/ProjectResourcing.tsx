import React, { useState, useMemo, useRef, useEffect } from 'react';
import { useApp } from '../store/AppContext';
import {
  Search, Users, ShieldCheck, Briefcase, Plus,
  Calendar, AlertCircle, CheckCircle2, X, Trophy,
  ChevronDown, ChevronUp, Sparkles, UserPlus, GraduationCap,
  ExternalLink, Crown, Target
} from 'lucide-react';
import { cn } from '../lib/utils';
import { Project, ProficiencyLevel, Employee } from '../types';

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

interface AISuggestion {
  id: string;
  icon: React.ComponentType<{ size?: number; className?: string }>;
  color: 'success' | 'warning' | 'danger';
  title: string;
  description: string;
  action: () => void;
  actionLabel: string;
}

type SkillMatchResult = 'met' | 'partial' | 'gap';

interface ApiProjectDemand {
  demandId: string;
  roleId: string;
  title?: string;
  requiredCount: number;
  skills: { skillId: string; minLevel: ProficiencyLevel; weight: number }[];
}

interface ApiProject {
  projectId: string;
  name: string;
  ownerId: string;
  description?: string;
  priority: Project['priority'];
  status: 'draft' | 'active' | 'paused' | 'complete';
  teamOrSite?: string;
  startDate?: string;
  endDate?: string;
  demands: ApiProjectDemand[];
  assignedEmployeeIds: string[];
  shortlistedEmployeeIds: string[];
}

interface RecommendationCandidate {
  employeeId: string;
  rank: number;
  score: number;
  reasoning?: {
    summary?: string;
    coverage?: number;
    strengths?: string[];
    gaps?: string[];
    risks?: string[];
  };
}

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

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

const SUGGESTION_ACCENT: Record<string, string> = {
  success: 'bg-success/10 text-success border-success/20',
  warning: 'bg-warning/10 text-warning border-warning/20',
  danger: 'bg-danger/10 text-danger border-danger/20',
};

const SUGGESTION_BTN: Record<string, string> = {
  success: 'bg-success text-white hover:bg-success/90',
  warning: 'bg-warning text-white hover:bg-warning/90',
  danger: 'bg-danger text-white hover:bg-danger/90',
};

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export default function ProjectResourcing() {
  const {
    allSkills,
    employees,
    roles,
  } = useApp();

  /* ---- state ---- */
  const [selectedProjectId, setSelectedProjectId] = useState('');
  const [isCreatingProject, setIsCreatingProject] = useState(false);
  const [viewMode, setViewMode] = useState<'search' | 'board'>('search');
  const [showRemaining, setShowRemaining] = useState(false);
  const [showAddSkill, setShowAddSkill] = useState(false);
  const [skillSearchTerm, setSkillSearchTerm] = useState('');
  const [podiumReady, setPodiumReady] = useState(false);
  const [staffingProjects, setStaffingProjects] = useState<ApiProject[]>([]);
  const [selectedDemandId, setSelectedDemandId] = useState('');
  const [recommendations, setRecommendations] = useState<RecommendationCandidate[]>([]);
  const [teamRecommendations, setTeamRecommendations] = useState<RecommendationCandidate[]>([]);
  const [isLoadingProjects, setIsLoadingProjects] = useState(false);
  const [isLoadingRecommendations, setIsLoadingRecommendations] = useState(false);

  const [newProject, setNewProject] = useState<Partial<Project>>({
    name: '',
    ownerId: '',
    priority: 'medium',
    teamOrSite: '',
    requiredSkills: [],
    requiredPermits: [],
    assignedEmployees: [],
    shortlistedEmployees: [],
  });

  const addSkillRef = useRef<HTMLDivElement>(null);

  const selectedApiProject = staffingProjects.find((p) => p.projectId === selectedProjectId);
  const selectedDemand = selectedApiProject?.demands.find((d) => d.demandId === selectedDemandId)
    ?? selectedApiProject?.demands[0];

  const selectedProject: Project | undefined = selectedApiProject
    ? {
        id: selectedApiProject.projectId,
        name: selectedApiProject.name,
        ownerId: selectedApiProject.ownerId,
        startDate: selectedApiProject.startDate,
        endDate: selectedApiProject.endDate,
        description: selectedApiProject.description,
        priority: selectedApiProject.priority,
        teamOrSite: selectedApiProject.teamOrSite,
        requiredSkills: selectedDemand?.skills.map((s) => ({ skillId: s.skillId, minLevel: s.minLevel })) ?? [],
        requiredPermits: [],
        assignedEmployees: selectedApiProject.assignedEmployeeIds,
        shortlistedEmployees: selectedApiProject.shortlistedEmployeeIds,
      }
    : undefined;

  /* ---- derived ---- */
  const filteredSkills = allSkills
    .filter((s) => s.name.toLowerCase().includes(skillSearchTerm.toLowerCase()))
    .slice(0, 12);

  const rankings = useMemo(() => {
    if (!selectedProject) return [];
    if (recommendations.length > 0) {
      return recommendations
        .map((r) => {
          const employee = employees.find((e) => e.id === r.employeeId);
          if (!employee) return null;
          return { employee, score: r.score };
        })
        .filter(Boolean) as { employee: Employee; score: number }[];
    }
    return [];
  }, [selectedProject, recommendations, employees]);

  const topThree = rankings.slice(0, 3);
  const remaining = rankings.slice(3);

  /* podium entrance animation */
  useEffect(() => {
    if (topThree.length > 0) {
      setPodiumReady(false);
      const t = setTimeout(() => setPodiumReady(true), 60);
      return () => clearTimeout(t);
    }
    setPodiumReady(false);
  }, [topThree.length, selectedProjectId]);

  const loadProjects = async (nextProjectId?: string) => {
    setIsLoadingProjects(true);
    try {
      const response = await fetch('/api/talent-studio/projects');
      if (!response.ok) return;
      const payload = (await response.json()) as { projects?: ApiProject[] };
      const nextProjects = payload.projects ?? [];
      setStaffingProjects(nextProjects);
      const targetProjectId = nextProjectId ?? selectedProjectId;
      const target = nextProjects.find((p) => p.projectId === targetProjectId) ?? nextProjects[0];
      if (target) {
        setSelectedProjectId(target.projectId);
        const firstDemand = target.demands[0];
        if (firstDemand) setSelectedDemandId(firstDemand.demandId);
      }
    } finally {
      setIsLoadingProjects(false);
    }
  };

  useEffect(() => {
    void loadProjects();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!selectedApiProject) return;
    if (!selectedDemandId && selectedApiProject.demands[0]) {
      setSelectedDemandId(selectedApiProject.demands[0].demandId);
    }
  }, [selectedApiProject, selectedDemandId]);

  useEffect(() => {
    const fetchRecommendations = async () => {
      if (!selectedProjectId || !selectedDemandId) {
        setRecommendations([]);
        setTeamRecommendations([]);
        return;
      }
      setIsLoadingRecommendations(true);
      try {
        const [indRes, teamRes] = await Promise.all([
          fetch('/api/talent-studio/recommend-staffing', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ projectId: selectedProjectId, demandId: selectedDemandId }),
          }),
          fetch('/api/talent-studio/recommend-team', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ projectId: selectedProjectId }),
          }),
        ]);
        if (indRes.ok) {
          const ind = (await indRes.json()) as { candidates?: RecommendationCandidate[] };
          setRecommendations(ind.candidates ?? []);
        } else {
          setRecommendations([]);
        }
        if (teamRes.ok) {
          const team = (await teamRes.json()) as { candidates?: RecommendationCandidate[] };
          setTeamRecommendations(team.candidates ?? []);
        } else {
          setTeamRecommendations([]);
        }
      } finally {
        setIsLoadingRecommendations(false);
      }
    };
    void fetchRecommendations();
  }, [selectedProjectId, selectedDemandId]);

  /* close add-skill popover on outside click */
  useEffect(() => {
    if (!showAddSkill) return;
    const handler = (e: MouseEvent) => {
      if (addSkillRef.current && !addSkillRef.current.contains(e.target as Node)) {
        setShowAddSkill(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [showAddSkill]);

  /* ---- AI suggestions ---- */
  const aiSuggestions = useMemo<AISuggestion[]>(() => {
    if (!selectedProject || rankings.length === 0) return [];
    const suggestions: AISuggestion[] = [];

    const bestUnassigned = rankings.find(
      (r) =>
        !selectedProject.assignedEmployees.includes(r.employee.id) &&
        !selectedProject.shortlistedEmployees.includes(r.employee.id),
    );
    if (bestUnassigned) {
      const matched = selectedProject.requiredSkills.filter(
        (rs) => getSkillMatch(bestUnassigned.employee, rs.skillId, rs.minLevel) === 'met',
      ).length;
      const reco = recommendations.find((item) => item.employeeId === bestUnassigned.employee.id);
      suggestions.push({
        id: 'assign-best',
        icon: UserPlus,
        color: 'success',
        title: `Assign ${bestUnassigned.employee.name}`,
        description: reco?.reasoning?.summary
          ?? `Best match (${bestUnassigned.score.toFixed(1)}) — covers ${matched}/${selectedProject.requiredSkills.length} skills`,
        action: () => void handleAssign(bestUnassigned.employee.id),
        actionLabel: 'Approve',
      });
    }

    const nearMiss = rankings.find((r) => {
      if (selectedProject.assignedEmployees.includes(r.employee.id)) return false;
      const gaps = selectedProject.requiredSkills.filter(
        (rs) => getSkillMatch(r.employee, rs.skillId, rs.minLevel) !== 'met',
      );
      return gaps.length > 0 && gaps.length <= 2 && r.score > 0;
    });
    if (nearMiss) {
      const gapCount = selectedProject.requiredSkills.filter(
        (rs) => getSkillMatch(nearMiss.employee, rs.skillId, rs.minLevel) !== 'met',
      ).length;
      const reco = recommendations.find((item) => item.employeeId === nearMiss.employee.id);
      suggestions.push({
        id: 'upskill',
        icon: GraduationCap,
        color: 'warning',
        title: `Upskill ${nearMiss.employee.name}`,
        description: reco?.reasoning?.gaps?.[0]
          ?? `${gapCount} skill gap${gapCount > 1 ? 's' : ''} — close to full coverage`,
        action: () => {},
        actionLabel: 'Create Plan',
      });
    }

    const uncovered = selectedProject.requiredSkills.filter(
      (rs) =>
        !rankings.some(
          (r) => getSkillMatch(r.employee, rs.skillId, rs.minLevel) === 'met',
        ),
    );
    if (uncovered.length > 0) {
      const skill = allSkills.find((s) => s.id === uncovered[0].skillId);
      suggestions.push({
        id: 'external',
        icon: ExternalLink,
        color: 'danger',
        title: skill ? `No coverage: ${skill.name}` : 'Uncovered skill',
        description: `${uncovered.length} skill${uncovered.length > 1 ? 's' : ''} not met internally — consider hiring`,
        action: () => {},
        actionLabel: 'Open Request',
      });
    }

    return suggestions;
  }, [rankings, selectedProject, allSkills, recommendations]);

  /* ---- handlers ---- */
  const handleCreateProject = async () => {
    if (!newProject.name || !newProject.ownerId) return;
    const owner = roles.find((r) => r.id === newProject.ownerId) ? newProject.ownerId : newProject.ownerId;
    const response = await fetch('/api/talent-studio/projects', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: newProject.name,
        ownerId: owner,
        startDate: newProject.startDate,
        endDate: newProject.endDate,
        priority: newProject.priority ?? 'medium',
        teamOrSite: newProject.teamOrSite,
        demands: [
          {
            roleId: roles[0]?.id ?? 'role-1',
            title: 'Primary demand',
            requiredCount: 1,
            skills: (newProject.requiredSkills ?? []).map((s) => ({
              skillId: s.skillId,
              minLevel: s.minLevel,
              weight: 1,
              source: 'project_override',
            })),
          },
        ],
      }),
    });
    if (response.ok) {
      const payload = (await response.json()) as { project?: ApiProject };
      await loadProjects(payload.project?.projectId);
      setIsCreatingProject(false);
      setNewProject({
        name: '', ownerId: '', priority: 'medium', teamOrSite: '',
        requiredSkills: [], requiredPermits: [], assignedEmployees: [], shortlistedEmployees: [],
      });
    }
  };

  const toggleRequiredSkill = async (skillId: string) => {
    if (!selectedDemand) return;
    const exists = selectedProject?.requiredSkills.some((rs) => rs.skillId === skillId);
    await fetch('/api/talent-studio/projects/demand-skills', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        demandId: selectedDemand.demandId,
        skillId,
        action: exists ? 'remove' : 'add',
      }),
    });
    await loadProjects(selectedProjectId);
  };

  const cycleSkillLevel = async (skillId: string) => {
    if (!selectedDemand) return;
    await fetch('/api/talent-studio/projects/demand-skills', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        demandId: selectedDemand.demandId,
        skillId,
        action: 'cycle',
      }),
    });
    await loadProjects(selectedProjectId);
  };

  const handleAssign = async (empId: string) => {
    if (!selectedProject || !selectedDemand) return;
    await fetch('/api/talent-studio/assignments', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        projectId: selectedProject.id,
        demandId: selectedDemand.demandId,
        employeeId: empId,
        action: 'assign',
      }),
    });
    await loadProjects(selectedProject.id);
  };

  const handleShortlist = async (empId: string) => {
    if (!selectedProject || !selectedDemand) return;
    await fetch('/api/talent-studio/assignments', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        projectId: selectedProject.id,
        demandId: selectedDemand.demandId,
        employeeId: empId,
        action: 'shortlist',
      }),
    });
    await loadProjects(selectedProject.id);
  };

  const handleUnassign = async (empId: string) => {
    if (!selectedProject || !selectedDemand) return;
    await fetch('/api/talent-studio/assignments', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        projectId: selectedProject.id,
        demandId: selectedDemand.demandId,
        employeeId: empId,
        action: 'unassign',
      }),
    });
    await loadProjects(selectedProject.id);
  };

  /* ---------------------------------------------------------------- */
  /*  Render                                                           */
  /* ---------------------------------------------------------------- */

  const podiumOrder =
    topThree.length >= 3
      ? [{ ...topThree[1], rank: 2 }, { ...topThree[0], rank: 1 }, { ...topThree[2], rank: 3 }]
      : topThree.length === 2
        ? [{ ...topThree[1], rank: 2 }, { ...topThree[0], rank: 1 }]
        : topThree.length === 1
          ? [{ ...topThree[0], rank: 1 }]
          : [];

  return (
    <div className="space-y-5 pb-10">
      {/* ============================================================ */}
      {/*  Header                                                       */}
      {/* ============================================================ */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">
            Project Resourcing
          </h1>
          <p className="text-slate-500 dark:text-slate-400 text-sm mt-0.5">
            Match the best talent to projects using validated skills.
          </p>
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          <select
            value={selectedProjectId}
            onChange={(e) => setSelectedProjectId(e.target.value)}
            className="px-4 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-sm font-semibold focus:ring-2 focus:ring-action/50 min-w-[200px] text-slate-900 dark:text-slate-100"
          >
            <option value="">Select a project...</option>
            {staffingProjects.map((p) => (
              <option key={p.projectId} value={p.projectId}>
                {p.name}
              </option>
            ))}
          </select>
          {selectedApiProject && (
            <select
              value={selectedDemandId}
              onChange={(e) => setSelectedDemandId(e.target.value)}
              className="px-4 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-sm font-semibold focus:ring-2 focus:ring-action/50 min-w-[200px] text-slate-900 dark:text-slate-100"
            >
              {selectedApiProject.demands.map((d) => (
                <option key={d.demandId} value={d.demandId}>
                  {roles.find((r) => r.id === d.roleId)?.name ?? d.title ?? d.roleId}
                </option>
              ))}
            </select>
          )}
          <button
            onClick={() => setIsCreatingProject(true)}
            className="flex items-center gap-2 px-4 py-2 bg-action text-white text-sm font-bold rounded-lg hover:bg-brand-blue transition-colors"
          >
            <Plus size={16} />
            New Project
          </button>
        </div>
      </div>
      {(isLoadingProjects || isLoadingRecommendations) && (
        <p className="text-xs text-slate-500 dark:text-slate-400">
          Updating staffing data and recommendations...
        </p>
      )}

      {/* ============================================================ */}
      {/*  Empty state                                                  */}
      {/* ============================================================ */}
      {!selectedProject && !isCreatingProject && (
        <div className="bg-white dark:bg-slate-900 border border-dashed border-slate-300 dark:border-slate-700 rounded-2xl p-16 text-center">
          <div className="w-14 h-14 bg-action/10 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <Briefcase size={26} className="text-action" />
          </div>
          <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
            Select or create a project
          </h3>
          <p className="text-slate-500 dark:text-slate-400 mt-1 max-w-sm mx-auto text-sm">
            Choose a project from the dropdown or create a new one to discover matching talent.
          </p>
        </div>
      )}

      {/* ============================================================ */}
      {/*  Project active                                               */}
      {/* ============================================================ */}
      {selectedProject && (
        <>
          {/* ---- Tabs + Requirements ---- */}
          <div className="space-y-3">
            <div className="flex items-center justify-between flex-wrap gap-3">
              <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-lg">
                {(['search', 'board'] as const).map((mode) => (
                  <button
                    key={mode}
                    onClick={() => setViewMode(mode)}
                    className={cn(
                      'px-4 py-1.5 rounded-md text-sm font-medium transition-all',
                      viewMode === mode
                        ? 'bg-white dark:bg-slate-700 text-action shadow-sm'
                        : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200',
                    )}
                  >
                    {mode === 'search' ? 'Find Talent' : 'Staffing Board'}
                  </button>
                ))}
              </div>

              {/* Project metadata compact */}
              <div className="flex items-center gap-4 text-xs text-slate-400 dark:text-slate-500">
                <span className="flex items-center gap-1">
                  <Calendar size={12} />
                  {selectedProject.startDate || 'TBD'} – {selectedProject.endDate || 'TBD'}
                </span>
                <span className="flex items-center gap-1">
                  <Users size={12} />
                  {selectedProject.teamOrSite || 'Global'}
                </span>
                <span
                  className={cn(
                    'px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-widest',
                    selectedProject.priority === 'critical'
                      ? 'bg-danger/10 text-danger'
                      : selectedProject.priority === 'high'
                        ? 'bg-warning/10 text-warning'
                        : 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400',
                  )}
                >
                  {selectedProject.priority}
                </span>
              </div>
            </div>

            {/* Requirements strip */}
            {viewMode === 'search' && (
              <div className="flex items-center flex-wrap gap-2">
                <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500 mr-1">
                  Requirements
                </span>
                {selectedProject.requiredSkills.map((rs) => {
                  const skill = allSkills.find((s) => s.id === rs.skillId);
                  return (
                    <div
                      key={rs.skillId}
                      className="inline-flex items-center gap-1.5 pl-3 pr-1.5 py-1 rounded-full bg-primary/8 border border-primary/15 text-slate-700 dark:text-slate-200 dark:bg-primary/15 dark:border-primary/25"
                    >
                      <span className="text-xs font-medium truncate max-w-[140px]">
                        {skill?.name}
                      </span>
                      <button
                        onClick={() => cycleSkillLevel(rs.skillId)}
                        className="px-1.5 py-0.5 rounded-md bg-action/20 text-action text-[10px] font-bold hover:bg-action/30 transition-colors"
                        title="Click to cycle level"
                      >
                        L{rs.minLevel}
                      </button>
                      <button
                        onClick={() => toggleRequiredSkill(rs.skillId)}
                        className="p-0.5 rounded-full hover:bg-danger/20 hover:text-danger text-slate-400 transition-colors"
                      >
                        <X size={12} />
                      </button>
                    </div>
                  );
                })}

                {/* Add skill popover */}
                <div className="relative" ref={addSkillRef}>
                  <button
                    onClick={() => setShowAddSkill(!showAddSkill)}
                    className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full border border-dashed border-slate-300 dark:border-slate-600 text-xs font-medium text-slate-500 dark:text-slate-400 hover:border-action hover:text-action transition-colors"
                  >
                    <Plus size={12} />
                    Add Skill
                  </button>
                  {showAddSkill && (
                    <div className="absolute top-full left-0 mt-2 w-72 bg-white dark:bg-slate-900 rounded-xl shadow-2xl border border-slate-200 dark:border-slate-700 z-30 p-3">
                      <div className="relative mb-2">
                        <Search
                          className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400"
                          size={14}
                        />
                        <input
                          type="text"
                          placeholder="Search skills..."
                          value={skillSearchTerm}
                          onChange={(e) => setSkillSearchTerm(e.target.value)}
                          className="w-full pl-8 pr-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs focus:ring-2 focus:ring-action/50 text-slate-900 dark:text-slate-100"
                          autoFocus
                        />
                      </div>
                      <div className="max-h-48 overflow-y-auto space-y-0.5">
                        {filteredSkills.map((skill) => {
                          const isSelected = selectedProject.requiredSkills.some(
                            (rs) => rs.skillId === skill.id,
                          );
                          if (isSelected) return null;
                          return (
                            <button
                              key={skill.id}
                              onClick={() => {
                                toggleRequiredSkill(skill.id);
                                setSkillSearchTerm('');
                              }}
                              className="w-full flex items-center justify-between p-2 rounded-lg text-xs hover:bg-action/10 text-slate-700 dark:text-slate-300 transition-colors text-left"
                            >
                              <span className="truncate">{skill.name}</span>
                              <Plus size={12} className="text-action flex-shrink-0 ml-2" />
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* ============================================================ */}
          {/*  Find Talent view                                             */}
          {/* ============================================================ */}
          {viewMode === 'search' && (
            <>
              {selectedProject.requiredSkills.length === 0 ? (
                <div className="text-center py-16">
                  <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-action/10 flex items-center justify-center">
                    <Target size={28} className="text-action" />
                  </div>
                  <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-100 mb-1">
                    Define what you need
                  </h3>
                  <p className="text-sm text-slate-500 dark:text-slate-400 max-w-xs mx-auto">
                    Add required skills above to discover the best-matching talent in your
                    organization.
                  </p>
                </div>
              ) : (
                <>
                  {/* ---- Podium ---- */}
                  <div className="pt-2">
                    <div className="flex items-center gap-2 mb-5">
                      <Trophy size={16} className="text-brand-orange" />
                      <span className="text-[11px] font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500">
                        Top Matches
                      </span>
                    </div>

                    <div className="flex items-end justify-center gap-4 lg:gap-6 px-2">
                      {podiumOrder.map((entry, idx) => {
                        const { employee, score, rank } = entry;
                        const role = roles.find((r) => r.id === employee.roleId);
                        const isAssigned = selectedProject.assignedEmployees.includes(employee.id);
                        const isShortlisted = selectedProject.shortlistedEmployees.includes(employee.id);
                        const isFirst = rank === 1;

                        const pedestalColor = isFirst
                          ? 'from-brand-orange to-brand-yellow'
                          : rank === 2
                            ? 'from-brand-blue to-brand-blue/80'
                            : 'from-slate-400 to-slate-500';

                        const pedestalPy = isFirst ? 'py-5' : rank === 2 ? 'py-3.5' : 'py-2.5';
                        const cardWidth = isFirst ? 'w-[280px]' : 'w-[220px]';
                        const avatarSize = isFirst ? 'w-16 h-16' : 'w-12 h-12';
                        const scoreSize = isFirst
                          ? 'w-14 h-14 text-xl'
                          : 'w-11 h-11 text-base';
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
                              isAssigned && 'ring-2 ring-success ring-offset-2 dark:ring-offset-slate-950',
                              podiumReady
                                ? 'opacity-100 translate-y-0 scale-100'
                                : 'opacity-0 translate-y-6 scale-95',
                            )}
                            style={{ transitionDelay: `${idx * 120}ms` }}
                          >
                            {/* Card body */}
                            <div
                              className={cn(
                                'bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 flex-1 flex flex-col',
                                isFirst && 'p-5',
                                'group hover:-translate-y-1 transition-transform duration-300',
                              )}
                            >
                              {/* Top: avatar + score */}
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
                                      <img
                                        src={employee.avatarUrl}
                                        alt={employee.name}
                                        className="w-full h-full object-cover"
                                      />
                                    </div>
                                    {isFirst && (
                                      <div className="absolute -top-2 -right-1 text-brand-orange">
                                        <Crown size={16} fill="currentColor" />
                                      </div>
                                    )}
                                  </div>
                                  <div className="min-w-0">
                                    <h3
                                      className={cn(
                                        'font-bold text-slate-900 dark:text-slate-100 truncate',
                                        isFirst ? 'text-base' : 'text-sm',
                                      )}
                                    >
                                      {employee.name}
                                    </h3>
                                    <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                                      {role?.name || 'No role'}
                                    </p>
                                    {isAssigned && (
                                      <span className="inline-block mt-0.5 px-1.5 py-0.5 bg-success/15 text-success text-[9px] font-bold rounded uppercase tracking-wider">
                                        Assigned
                                      </span>
                                    )}
                                    {isShortlisted && !isAssigned && (
                                      <span className="inline-block mt-0.5 px-1.5 py-0.5 bg-warning/15 text-warning text-[9px] font-bold rounded uppercase tracking-wider">
                                        Shortlisted
                                      </span>
                                    )}
                                  </div>
                                </div>
                                <div
                                  className={cn(
                                    'rounded-full flex items-center justify-center font-bold text-white flex-shrink-0',
                                    scoreSize,
                                    scoreBg,
                                  )}
                                >
                                  {score.toFixed(1)}
                                </div>
                              </div>

                              {/* Skill tags */}
                              <div className="flex flex-wrap gap-1 mb-3">
                                {selectedProject.requiredSkills.map((rs) => {
                                  const skill = allSkills.find((s) => s.id === rs.skillId);
                                  const match = getSkillMatch(employee, rs.skillId, rs.minLevel);
                                  return (
                                    <span
                                      key={rs.skillId}
                                      className={cn(
                                        'inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded border text-[10px] font-medium',
                                        MATCH_STYLES[match],
                                      )}
                                    >
                                      {MATCH_ICON[match]}
                                      <span className="truncate max-w-[80px]">{skill?.name}</span>
                                    </span>
                                  );
                                })}
                              </div>

                              {/* Badges */}
                              <div className="flex items-center gap-2 text-[10px] text-slate-400 dark:text-slate-500 mb-3">
                                <span className="flex items-center gap-0.5">
                                  <ShieldCheck size={10} className="text-success" />
                                  Authorized
                                </span>
                              </div>

                              {/* Actions */}
                              <div className="mt-auto flex items-center gap-2">
                                {!isAssigned ? (
                                  <>
                                    <button
                                      onClick={() => handleShortlist(employee.id)}
                                      disabled={isShortlisted}
                                      className="flex-1 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 text-[11px] font-bold hover:bg-slate-50 dark:hover:bg-slate-800 disabled:opacity-40 transition-colors"
                                    >
                                      {isShortlisted ? 'Shortlisted' : 'Shortlist'}
                                    </button>
                                    <button
                                      onClick={() => handleAssign(employee.id)}
                                      className="flex-1 py-1.5 rounded-lg bg-action text-white text-[11px] font-bold hover:bg-brand-blue transition-colors"
                                    >
                                      Assign
                                    </button>
                                  </>
                                ) : (
                                  <button
                                    onClick={() => handleUnassign(employee.id)}
                                    className="flex-1 py-1.5 rounded-lg border border-danger/30 text-danger text-[11px] font-bold hover:bg-danger/10 transition-colors"
                                  >
                                    Unassign
                                  </button>
                                )}
                              </div>
                            </div>

                            {/* Pedestal */}
                            <div
                              className={cn(
                                'flex items-center justify-center bg-gradient-to-b text-white font-bold transition-all duration-700 ease-out origin-bottom',
                                pedestalPy,
                                pedestalColor,
                                podiumReady ? 'scale-y-100 opacity-100' : 'scale-y-0 opacity-0',
                              )}
                              style={{ transitionDelay: `${idx * 120 + 300}ms` }}
                            >
                              <span className={cn(isFirst ? 'text-2xl' : 'text-lg')}>
                                {rank}
                              </span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* ---- AI Suggestions ---- */}
                  {aiSuggestions.length > 0 && (
                    <div className="pt-2">
                      <div className="flex items-center gap-2 mb-3">
                        <Sparkles size={14} className="text-brand-orange" />
                        <span className="text-[11px] font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500">
                          IGNIZIA Suggestions
                        </span>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                        {aiSuggestions.map((s) => (
                          <div
                            key={s.id}
                            className={cn(
                              'rounded-xl border p-4 flex flex-col gap-2 transition-all hover:shadow-md',
                              SUGGESTION_ACCENT[s.color],
                            )}
                          >
                            <div className="flex items-start gap-2.5">
                              <div
                                className={cn(
                                  'w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0',
                                  s.color === 'success'
                                    ? 'bg-success/20'
                                    : s.color === 'warning'
                                      ? 'bg-warning/20'
                                      : 'bg-danger/20',
                                )}
                              >
                                <s.icon size={16} />
                              </div>
                              <div className="min-w-0">
                                <h4 className="text-sm font-bold text-slate-900 dark:text-slate-100 truncate">
                                  {s.title}
                                </h4>
                                <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                                  {s.description}
                                </p>
                              </div>
                            </div>
                            <div className="flex items-center gap-2 mt-auto pt-1">
                              <button
                                onClick={s.action}
                                className={cn(
                                  'px-3 py-1.5 rounded-lg text-[11px] font-bold transition-colors',
                                  SUGGESTION_BTN[s.color],
                                )}
                              >
                                {s.actionLabel}
                              </button>
                              <button className="text-[11px] text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 font-medium transition-colors">
                                Skip
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {teamRecommendations.length > 0 && (
                    <div className="pt-2">
                      <div className="flex items-center gap-2 mb-3">
                        <Users size={14} className="text-brand-blue" />
                        <span className="text-[11px] font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500">
                          Team Proposal
                        </span>
                      </div>
                      <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-3 space-y-2">
                        {teamRecommendations.slice(0, 3).map((rec) => {
                          const emp = employees.find((e) => e.id === rec.employeeId);
                          if (!emp) return null;
                          return (
                            <div
                              key={rec.employeeId}
                              className="flex items-center justify-between gap-3 px-3 py-2 rounded-lg bg-slate-50 dark:bg-slate-800/60"
                            >
                              <div className="min-w-0">
                                <p className="text-sm font-semibold text-slate-900 dark:text-slate-100 truncate">
                                  #{rec.rank} {emp.name}
                                </p>
                                <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                                  {rec.reasoning?.summary ?? 'Team-fit recommendation'}
                                </p>
                              </div>
                              <span className="text-xs font-bold text-action">{rec.score.toFixed(2)}</span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* ---- Remaining Candidates ---- */}
                  {remaining.length > 0 && (
                    <div>
                      <button
                        onClick={() => setShowRemaining(!showRemaining)}
                        className="flex items-center gap-2 text-sm font-medium text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition-colors group"
                      >
                        {showRemaining ? (
                          <ChevronUp size={16} className="text-action" />
                        ) : (
                          <ChevronDown size={16} className="text-action" />
                        )}
                        <span>
                          {remaining.length} more candidate{remaining.length > 1 ? 's' : ''}
                        </span>
                      </button>

                      {showRemaining && (
                        <div className="mt-3 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden divide-y divide-slate-100 dark:divide-slate-800">
                          {remaining.map(({ employee, score }, idx) => {
                            const role = roles.find((r) => r.id === employee.roleId);
                            const isAssigned = selectedProject.assignedEmployees.includes(employee.id);
                            const isShortlisted = selectedProject.shortlistedEmployees.includes(employee.id);
                            const globalRank = idx + 4;

                            return (
                              <div
                                key={employee.id}
                                className="flex items-center gap-4 px-4 py-3 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors"
                              >
                                <span className="text-xs font-bold text-slate-400 w-5 text-center">
                                  #{globalRank}
                                </span>
                                <img
                                  src={employee.avatarUrl}
                                  alt={employee.name}
                                  className="w-8 h-8 rounded-full flex-shrink-0 border border-slate-200 dark:border-slate-700"
                                />
                                <div className="min-w-0 flex-1">
                                  <p className="text-sm font-semibold text-slate-900 dark:text-slate-100 truncate">
                                    {employee.name}
                                  </p>
                                  <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                                    {role?.name || 'No role'}
                                  </p>
                                </div>

                                {/* Compact skill chips */}
                                <div className="hidden md:flex items-center gap-1 flex-shrink-0">
                                  {selectedProject.requiredSkills.slice(0, 4).map((rs) => {
                                    const match = getSkillMatch(employee, rs.skillId, rs.minLevel);
                                    return (
                                      <span
                                        key={rs.skillId}
                                        className={cn(
                                          'w-2.5 h-2.5 rounded-full flex-shrink-0',
                                          match === 'met'
                                            ? 'bg-success'
                                            : match === 'partial'
                                              ? 'bg-warning'
                                              : 'bg-danger/40',
                                        )}
                                        title={allSkills.find((s) => s.id === rs.skillId)?.name}
                                      />
                                    );
                                  })}
                                </div>

                                <span className="text-sm font-bold text-slate-600 dark:text-slate-300 flex-shrink-0 w-10 text-right">
                                  {score.toFixed(1)}
                                </span>

                                {isAssigned && (
                                  <span className="text-[10px] font-bold text-success uppercase tracking-wider flex-shrink-0">
                                    Assigned
                                  </span>
                                )}
                                {isShortlisted && !isAssigned && (
                                  <span className="text-[10px] font-bold text-warning uppercase tracking-wider flex-shrink-0">
                                    Shortlisted
                                  </span>
                                )}

                                {!isAssigned && (
                                  <button
                                    onClick={() => handleAssign(employee.id)}
                                    className="px-3 py-1 rounded-lg bg-action/10 text-action text-[11px] font-bold hover:bg-action/20 transition-colors flex-shrink-0"
                                  >
                                    Assign
                                  </button>
                                )}
                                {isAssigned && (
                                  <button
                                    onClick={() => handleUnassign(employee.id)}
                                    className="px-3 py-1 rounded-lg bg-danger/10 text-danger text-[11px] font-bold hover:bg-danger/20 transition-colors flex-shrink-0"
                                  >
                                    Remove
                                  </button>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  )}
                </>
              )}
            </>
          )}

          {/* ============================================================ */}
          {/*  Staffing Board view                                          */}
          {/* ============================================================ */}
          {viewMode === 'board' && (
            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm p-6">
              <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100 mb-6">
                Staffing Board
              </h2>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Assigned */}
                <div className="bg-success/5 dark:bg-success/10 rounded-xl p-4 border border-success/20">
                  <h3 className="font-bold text-slate-900 dark:text-slate-100 mb-4 flex items-center justify-between">
                    Assigned
                    <span className="bg-success/15 text-success px-2 py-0.5 rounded text-xs font-bold">
                      {selectedProject.assignedEmployees.length}
                    </span>
                  </h3>
                  <div className="space-y-2">
                    {selectedProject.assignedEmployees.map((empId) => {
                      const emp = employees.find((e) => e.id === empId);
                      if (!emp) return null;
                      return (
                        <div
                          key={empId}
                          className="bg-white dark:bg-slate-900 p-3 rounded-lg border border-slate-200 dark:border-slate-800 shadow-sm flex items-center gap-3"
                        >
                          <img
                            src={emp.avatarUrl}
                            alt={emp.name}
                            className="w-8 h-8 rounded-full"
                          />
                          <div className="min-w-0 flex-1">
                            <p className="text-sm font-bold text-slate-900 dark:text-slate-100 truncate">
                              {emp.name}
                            </p>
                            <p className="text-xs text-slate-500 dark:text-slate-400 truncate">
                              {roles.find((r) => r.id === emp.roleId)?.name}
                            </p>
                          </div>
                        </div>
                      );
                    })}
                    {selectedProject.assignedEmployees.length === 0 && (
                      <p className="text-sm text-slate-500 dark:text-slate-400 italic text-center py-4">
                        No members assigned.
                      </p>
                    )}
                  </div>
                </div>

                {/* Shortlisted */}
                <div className="bg-warning/5 dark:bg-warning/10 rounded-xl p-4 border border-warning/20">
                  <h3 className="font-bold text-slate-900 dark:text-slate-100 mb-4 flex items-center justify-between">
                    Shortlisted
                    <span className="bg-warning/15 text-warning px-2 py-0.5 rounded text-xs font-bold">
                      {selectedProject.shortlistedEmployees.length}
                    </span>
                  </h3>
                  <div className="space-y-2">
                    {selectedProject.shortlistedEmployees.map((empId) => {
                      const emp = employees.find((e) => e.id === empId);
                      if (!emp) return null;
                      return (
                        <div
                          key={empId}
                          className="bg-white dark:bg-slate-900 p-3 rounded-lg border border-slate-200 dark:border-slate-800 shadow-sm flex items-center justify-between"
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            <img
                              src={emp.avatarUrl}
                              alt={emp.name}
                              className="w-8 h-8 rounded-full flex-shrink-0"
                            />
                            <p className="text-sm font-bold text-slate-900 dark:text-slate-100 truncate">
                              {emp.name}
                            </p>
                          </div>
                          <button
                            onClick={() => handleAssign(empId)}
                            className="text-xs font-bold text-action hover:text-brand-blue flex-shrink-0 ml-2"
                          >
                            Assign
                          </button>
                        </div>
                      );
                    })}
                    {selectedProject.shortlistedEmployees.length === 0 && (
                      <p className="text-sm text-slate-500 dark:text-slate-400 italic text-center py-4">
                        No candidates shortlisted.
                      </p>
                    )}
                  </div>
                </div>

                {/* Remaining Gaps */}
                <div className="bg-danger/5 dark:bg-danger/10 rounded-xl p-4 border border-danger/20">
                  <h3 className="font-bold text-slate-900 dark:text-slate-100 mb-4 flex items-center justify-between">
                    Remaining Gaps
                    <span className="bg-danger/15 text-danger px-2 py-0.5 rounded text-xs font-bold">
                      {
                        selectedProject.requiredSkills.filter((rs) => {
                          return !selectedProject.assignedEmployees.some((empId) => {
                            const emp = employees.find((e) => e.id === empId);
                            const assertion = emp?.assertions.find(
                              (a) => a.skillId === rs.skillId && a.status === 'confirmed',
                            );
                            return assertion && assertion.level >= rs.minLevel;
                          });
                        }).length
                      }
                    </span>
                  </h3>
                  <div className="space-y-2">
                    {selectedProject.requiredSkills.map((rs) => {
                      const skill = allSkills.find((s) => s.id === rs.skillId);
                      const isCovered = selectedProject.assignedEmployees.some((empId) => {
                        const emp = employees.find((e) => e.id === empId);
                        const assertion = emp?.assertions.find(
                          (a) => a.skillId === rs.skillId && a.status === 'confirmed',
                        );
                        return assertion && assertion.level >= rs.minLevel;
                      });
                      if (isCovered) return null;
                      return (
                        <div
                          key={rs.skillId}
                          className="bg-white dark:bg-slate-900 p-3 rounded-lg border border-danger/20 shadow-sm"
                        >
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-sm font-bold text-slate-900 dark:text-slate-100">
                              {skill?.name}
                            </span>
                            <span className="text-xs font-bold text-danger">L{rs.minLevel}</span>
                          </div>
                          <button
                            onClick={() => {
                              setViewMode('search');
                              setSkillSearchTerm(skill?.name || '');
                            }}
                            className="w-full py-1.5 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-bold rounded-lg hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
                          >
                            Find Talent
                          </button>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>
          )}
        </>
      )}

      {/* ============================================================ */}
      {/*  Create Project Modal                                         */}
      {/* ============================================================ */}
      {isCreatingProject && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl max-w-lg w-full p-6">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100">
                Create New Project
              </h2>
              <button
                onClick={() => setIsCreatingProject(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                <X size={24} />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-1">
                  Project Name
                </label>
                <input
                  type="text"
                  value={newProject.name}
                  onChange={(e) => setNewProject({ ...newProject, name: e.target.value })}
                  className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm focus:ring-2 focus:ring-action/50 text-slate-900 dark:text-slate-100"
                  placeholder="e.g. Q3 Platform Migration"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-1">
                  Owner
                </label>
                <select
                  value={newProject.ownerId}
                  onChange={(e) => setNewProject({ ...newProject, ownerId: e.target.value })}
                  className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm focus:ring-2 focus:ring-action/50 text-slate-900 dark:text-slate-100"
                >
                  <option value="">Select owner...</option>
                  {employees.map((e) => (
                    <option key={e.id} value={e.id}>
                      {e.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-1">
                    Start Date
                  </label>
                  <input
                    type="date"
                    value={newProject.startDate || ''}
                    onChange={(e) => setNewProject({ ...newProject, startDate: e.target.value })}
                    className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm focus:ring-2 focus:ring-action/50 text-slate-900 dark:text-slate-100"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-1">
                    End Date
                  </label>
                  <input
                    type="date"
                    value={newProject.endDate || ''}
                    onChange={(e) => setNewProject({ ...newProject, endDate: e.target.value })}
                    className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm focus:ring-2 focus:ring-action/50 text-slate-900 dark:text-slate-100"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-1">
                    Priority
                  </label>
                  <select
                    value={newProject.priority}
                    onChange={(e) =>
                      setNewProject({ ...newProject, priority: e.target.value as Project['priority'] })
                    }
                    className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm focus:ring-2 focus:ring-action/50 text-slate-900 dark:text-slate-100"
                  >
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                    <option value="critical">Critical</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-1">
                    Team / Site
                  </label>
                  <input
                    type="text"
                    value={newProject.teamOrSite || ''}
                    onChange={(e) => setNewProject({ ...newProject, teamOrSite: e.target.value })}
                    className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm focus:ring-2 focus:ring-action/50 text-slate-900 dark:text-slate-100"
                    placeholder="e.g. London Office"
                  />
                </div>
              </div>

              <div className="pt-4 flex gap-3">
                <button
                  onClick={() => setIsCreatingProject(false)}
                  className="flex-1 py-2 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 font-bold rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleCreateProject}
                  disabled={!newProject.name || !newProject.ownerId}
                  className="flex-1 py-2 bg-action text-white font-bold rounded-lg hover:bg-brand-blue disabled:opacity-40 transition-colors"
                >
                  Create Project
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
