import React, { useState, useMemo, useCallback, useEffect } from 'react';
import { useApp } from '../store/AppContext';
import { 
  ShieldAlert, 
  ShieldCheck, 
  Users, 
  Lock, 
  Unlock, 
  AlertTriangle,
  ChevronRight,
  Plus,
  Settings,
  UserPlus,
  CheckCircle2,
  XCircle,
  Clock,
  FileText,
  Search,
  ArrowRight,
  GraduationCap,
  X
} from 'lucide-react';
import { cn } from '../lib/utils';

export default function ReadinessRisk() {
  const { 
    permits, 
    permitSchemas, 
    crewBlueprints, 
    tasks, 
    roles, 
    taskRequirements,
    addOutboxRecord, 
    addBlueprint, 
    employees, 
    runGapAnalysis,
    personPermits,
    updatePersonPermit,
    complianceTrainings,
    addComplianceTraining,
    updateComplianceTraining,
    teamBuilds,
    addTeamBuild,
    updatePermit,
    addPersonPermit,
    updateBlueprint,
    updateEmployee
  } = useApp();
  const [activeTab, setActiveTab] = useState<'permits' | 'blueprints' | 'gates' | 'admin'>('gates');
  const [buildingTeamFor, setBuildingTeamFor] = useState<string | null>(null);
  const [selectedTeamAssignments, setSelectedTeamAssignments] = useState<Record<string, string[]>>({}); // roleId -> employeeIds
  const [validationResult, setValidationResult] = useState<{
    status: 'pass' | 'risk' | 'fail';
    details: { employeeId: string; roleId: string; status: 'pass' | 'risk' | 'fail'; issues: string[] }[];
  } | null>(null);

  const [managingPermitId, setManagingPermitId] = useState<string | null>(null);
  const [editingBlueprintId, setEditingBlueprintId] = useState<string | null>(null);
  const [isAssigningTraining, setIsAssigningTraining] = useState(false);
  const [manualTraining, setManualTraining] = useState({ personId: '', permitId: '' });

  const gates = useMemo(() => {
    return crewBlueprints.map(bp => {
      // Find the latest team build for this blueprint
      const latestBuild = [...teamBuilds]
        .filter(b => b.blueprintId === bp.id)
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())[0];
      
      const issues: string[] = [];
      let status: 'blocked' | 'ready' = 'ready';

      if (!latestBuild) {
        status = 'blocked';
        issues.push('No team built yet for this blueprint.');
      } else {
        // Re-run validation logic for the latest build
        latestBuild.assignments.forEach(assignment => {
          const empId = assignment.employeeId;
          const roleId = assignment.roleId;
          
          const analysis = runGapAnalysis(empId, roleId);
          if (analysis && analysis.overallReadiness < 80) {
            issues.push(`Low Readiness: ${employees.find(e => e.id === empId)?.name} (${analysis.overallReadiness}%)`);
          }

          const empPermits = personPermits.filter(pp => pp.personId === empId);
          const safetyPermit = empPermits.find(pp => pp.permitId === 'p-1');
          if (!safetyPermit || safetyPermit.status === 'expired' || safetyPermit.status === 'revoked') {
            issues.push(`Permit Issue: ${employees.find(e => e.id === empId)?.name} (Safety L1)`);
          }
        });

        if (issues.length > 0) {
          status = 'blocked';
        }
      }

      return {
        id: bp.id,
        name: bp.name,
        status,
        issues
      };
    });
  }, [crewBlueprints, teamBuilds, employees, runGapAnalysis, personPermits]);

  const blockedCount = gates.filter(g => g.status === 'blocked').length;
  const [isViewingRules, setIsViewingRules] = useState(false);

  const expiringPermits = useMemo(() => {
    return personPermits.filter(p => {
      const expiry = new Date(p.expiresAt);
      const now = new Date();
      const diffDays = (expiry.getTime() - now.getTime()) / (1000 * 3600 * 24);
      return diffDays <= 30 && diffDays > 0;
    });
  }, [personPermits]);

  const criticalSkillGaps = useMemo(() => {
    let gaps = 0;
    employees.forEach(emp => {
      const analysis = runGapAnalysis(emp.id);
      if (analysis) {
        gaps += analysis.missingSkills.filter(s => s.severity >= 3).length;
      }
    });
    return gaps;
  }, [employees, runGapAnalysis]);

  const [gateDecisions, setGateDecisions] = useState<Record<string, 'block' | 'allow' | 'conditional'>>({});

  const rules = useMemo(() => {
    const generatedRules = [];
    
    // Rule 1: High-Risk Tasks
    generatedRules.push({
      name: 'High-Risk Tasks',
      description: 'Requires valid Safety L1 permit and active certification.',
      passed: personPermits.some(p => p.permitId === 'p-1' && new Date(p.expiresAt) > new Date())
    });

    // Rule 2: Blueprint constraints
    crewBlueprints.forEach(bp => {
      if (bp.additionalConstraints) {
        generatedRules.push({
          name: `Blueprint: ${bp.name}`,
          description: bp.additionalConstraints,
          passed: gates.find(g => g.id === bp.id)?.status === 'ready'
        });
      }
    });

    return generatedRules;
  }, [crewBlueprints, gates, permits]);

  const handlePublishGate = (gateId: string, decision: 'block' | 'allow' | 'conditional', reason: string) => {
    setGateDecisions(prev => ({ ...prev, [gateId]: decision }));
    addOutboxRecord('orchestrator', 'OrchestratorGateDecision', {
      gateId,
      decision,
      reason,
      timestamp: new Date().toISOString()
    });
  };

  const handleCreateBlueprint = () => {
    const id = crypto.randomUUID();
    const newBp = {
      id,
      name: 'New Strategic Crew Blueprint',
      appliesToWorkflowId: 'w-new',
      requiredRoles: [{ roleId: roles[0]?.id || '', count: 1 }],
      additionalConstraints: 'Standard safety protocols apply.'
    };
    addBlueprint(newBp as any);
    setEditingBlueprintId(id);
  };

  const handleViewRules = () => {
    setIsViewingRules(true);
  };

  const validateTeam = useCallback(() => {
    if (!buildingTeamFor) return;
    const blueprint = crewBlueprints.find(b => b.id === buildingTeamFor);
    if (!blueprint) return;

    const details: any[] = [];
    let overallStatus: 'pass' | 'risk' | 'fail' = 'pass';

    (Object.entries(selectedTeamAssignments) as [string, string[]][]).forEach(([roleKey, empIds]) => {
      const actualRoleId = roleKey.substring(0, roleKey.lastIndexOf('-'));
      empIds.forEach(empId => {
        const emp = employees.find(e => e.id === empId);
        const role = roles.find(r => r.id === actualRoleId);
        if (!emp || !role) return;

        const issues: string[] = [];
        let status: any = 'pass';

        // Check skills
        const analysis = runGapAnalysis(empId, actualRoleId);
        if (analysis && analysis.overallReadiness < 80) {
          status = 'risk';
          issues.push(`Low Readiness: ${analysis.overallReadiness}%`);
        }

        // Check permits dynamically based on role tasks
        const empPermits = personPermits.filter(pp => pp.personId === empId);
        const roleTasks = taskRequirements.filter(tr => tr.roleIds.includes(actualRoleId));
        const requiredPermitIds = Array.from(new Set(roleTasks.flatMap(tr => tr.requiredPermits)));
        
        // Always require Safety Level 1 for everyone in this demo
        if (!requiredPermitIds.includes('p-1')) requiredPermitIds.push('p-1');

        requiredPermitIds.forEach(pid => {
          const permit = permits.find(p => p.id === pid);
          const empPermit = empPermits.find(pp => pp.permitId === pid);
          
          if (!empPermit || empPermit.status === 'expired' || empPermit.status === 'revoked') {
            status = 'fail';
            issues.push(`Missing or Expired ${permit?.name || 'Required'} Permit`);
          } else if (empPermit.status === 'expiring' || empPermit.status === 'pending') {
            if (status !== 'fail') status = 'risk';
            issues.push(`${permit?.name || 'Required'} Permit Expiring or Pending`);
          }
        });

        if (status === 'fail') {
          overallStatus = 'fail';
        } else if (status === 'risk' && overallStatus !== 'fail') {
          overallStatus = 'risk';
        }

        details.push({ employeeId: empId, roleId: actualRoleId, status, issues });
      });
    });

    setValidationResult({ status: overallStatus, details });
  }, [buildingTeamFor, crewBlueprints, employees, roles, selectedTeamAssignments, personPermits, runGapAnalysis, permits, taskRequirements]);

  useEffect(() => {
    if (validationResult && buildingTeamFor) {
      validateTeam();
    }
  }, [personPermits, selectedTeamAssignments, validateTeam, buildingTeamFor]);

  const handleAssignCompliance = (empId: string, permitId: string) => {
    addComplianceTraining({
      personId: empId,
      permitId,
      status: 'assigned'
    });
  };

  const handleApprovePermit = (ppId: string) => {
    const pp = personPermits.find(p => p.id === ppId);
    if (pp) {
      updatePersonPermit({ ...pp, status: 'valid', notes: 'Approved by Supervisor' });
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Readiness & Risk</h1>
          <p className="text-slate-500 dark:text-slate-400 mt-1">Manage compliance, permit schemas, and crew readiness blueprints.</p>
        </div>
        <div className="flex items-center gap-4 flex-wrap">
          <button 
            onClick={handleViewRules}
            className="px-4 py-2 border border-slate-200 dark:border-slate-700 rounded-lg text-sm font-medium hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors flex items-center gap-2 text-slate-700 dark:text-slate-300"
          >
            <Lock size={16} />
            Rules
          </button>
          <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-lg">
            {['gates', 'blueprints', 'permits', 'admin'].map((tab) => (
              <button 
                key={tab}
                onClick={() => {
                  setActiveTab(tab as any);
                  setBuildingTeamFor(null);
                  setValidationResult(null);
                }}
                className={cn(
                  "px-4 py-1.5 rounded-md text-sm font-medium transition-all capitalize",
                  activeTab === tab ? "bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-400 shadow-sm" : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200"
                )}
              >
                {tab === 'admin' ? 'Admin Center' : tab}
              </button>
            ))}
          </div>
        </div>
      </div>

      {activeTab === 'gates' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Active Gates */}
            <div className="bg-white dark:bg-slate-900 p-6 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100">Readiness Gates</h2>
                {blockedCount > 0 && (
                  <span className="px-2 py-1 bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 text-xs font-bold rounded uppercase tracking-wider">
                    {blockedCount} Blocked
                  </span>
                )}
              </div>

              <div className="space-y-4">
                {gates.map(gate => (
                  <div key={gate.id} className={cn(
                    "p-4 border rounded-lg",
                    gate.status === 'blocked' ? "border-red-200 dark:border-red-900/50 bg-red-50 dark:bg-red-900/10" : "border-emerald-200 dark:border-emerald-900/50 bg-emerald-50 dark:bg-emerald-900/10"
                  )}>
                    <div className="flex items-start gap-3">
                      {gate.status === 'blocked' ? (
                        <ShieldAlert className="text-red-600 dark:text-red-400 mt-1" size={20} />
                      ) : (
                        <ShieldCheck className="text-emerald-600 dark:text-emerald-400 mt-1" size={20} />
                      )}
                      <div className="flex-1">
                        <h3 className="font-bold text-slate-900 dark:text-slate-100">{gate.name}</h3>
                        <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
                          {gate.status === 'blocked' ? 'Blocked: Requirements not satisfied.' : 'Ready: All requirements met.'}
                        </p>
                        {gate.issues.length > 0 && (
                          <div className="mt-3 flex flex-wrap gap-2">
                            {gate.issues.map((issue, idx) => (
                              <span key={idx} className="text-[10px] font-bold bg-white dark:bg-slate-800 text-red-600 dark:text-red-400 border border-red-200 dark:border-red-900/50 px-2 py-0.5 rounded">
                                {issue}
                              </span>
                            ))}
                          </div>
                        )}
                        <div className="mt-4 flex gap-2 flex-wrap">
                          {gateDecisions[gate.id] ? (
                            <span className={cn(
                              "px-3 py-1.5 rounded-md text-xs font-bold uppercase tracking-wider",
                              gateDecisions[gate.id] === 'block' ? "bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400" :
                              gateDecisions[gate.id] === 'allow' ? "bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400" :
                              "bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400"
                            )}>
                              Decision: {gateDecisions[gate.id]}
                            </span>
                          ) : (
                            <>
                              <button 
                                onClick={() => handlePublishGate(gate.id, 'allow', 'Manually approved')}
                                className="px-3 py-1.5 rounded-md text-xs font-bold bg-emerald-600 text-white hover:bg-emerald-700 transition-all"
                              >
                                Allow
                              </button>
                              <button 
                                onClick={() => handlePublishGate(gate.id, 'conditional', 'Approved with conditions')}
                                className="px-3 py-1.5 rounded-md text-xs font-bold bg-amber-500 text-white hover:bg-amber-600 transition-all"
                              >
                                Conditional
                              </button>
                              <button 
                                onClick={() => handlePublishGate(gate.id, 'block', 'Requirements not met')}
                                className="px-3 py-1.5 rounded-md text-xs font-bold bg-red-600 text-white hover:bg-red-700 transition-all"
                              >
                                Block
                              </button>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
                
                {gates.length === 0 && (
                  <div className="text-center py-8 text-slate-400 dark:text-slate-600 italic text-sm">
                    No active readiness gates.
                  </div>
                )}
              </div>
            </div>

            {/* Risk Summary */}
            <div className="bg-white dark:bg-slate-900 p-6 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
              <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100 mb-6">Compliance Risk Summary</h2>
              <div className="space-y-6">
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-slate-600 dark:text-slate-400">Expiring Permits (30d)</span>
                    <span className="text-sm font-bold text-amber-600 dark:text-amber-400">{expiringPermits.length}</span>
                  </div>
                  <div className="h-2 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                    <div className="h-full bg-amber-400" style={{ width: `${Math.min((expiringPermits.length / Math.max(permits.length, 1)) * 100, 100)}%` }} />
                  </div>
                </div>
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-slate-600 dark:text-slate-400">Critical Skill Gaps</span>
                    <span className="text-sm font-bold text-red-600 dark:text-red-400">{criticalSkillGaps}</span>
                  </div>
                  <div className="h-2 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                    <div className="h-full bg-red-500" style={{ width: `${Math.min((criticalSkillGaps / 20) * 100, 100)}%` }} />
                  </div>
                </div>
                
                <div className="pt-6 border-t border-slate-100 dark:border-slate-800">
                  <h3 className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-4">Upcoming Recertifications</h3>
                  <div className="space-y-3">
                    {expiringPermits.slice(0, 3).map(permit => {
                      const permitInfo = permits.find(p => p.id === permit.permitId);
                      const emp = employees.find(e => e.id === permit.personId);
                      return (
                        <div key={permit.id} className="flex items-center justify-between text-sm">
                          <div className="flex items-center gap-2 text-slate-700 dark:text-slate-300">
                            <div className="w-2 h-2 rounded-full bg-amber-400" />
                            <span>{permitInfo?.name} - {emp?.name}</span>
                          </div>
                          <span className="text-slate-400 dark:text-slate-500 text-xs">{new Date(permit.expiresAt).toLocaleDateString()}</span>
                        </div>
                      );
                    })}
                    {expiringPermits.length === 0 && (
                      <div className="text-sm text-slate-500 dark:text-slate-400 italic">No permits expiring soon.</div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'blueprints' && !buildingTeamFor && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {crewBlueprints.map(blueprint => (
            <div key={blueprint.id} className="bg-white dark:bg-slate-900 p-6 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm hover:border-indigo-300 dark:hover:border-indigo-500 transition-all group">
              <div className="flex items-start justify-between mb-4">
                <div className="w-10 h-10 bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400 rounded-lg flex items-center justify-center">
                  <Users size={20} />
                </div>
                <button 
                  onClick={() => setEditingBlueprintId(blueprint.id)}
                  className="text-slate-400 hover:text-indigo-600 transition-colors"
                >
                  <Settings size={18} />
                </button>
              </div>
              <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">{blueprint.name}</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 uppercase tracking-widest">Crew Readiness Blueprint</p>
              
              {teamBuilds.some(b => b.blueprintId === blueprint.id) && (
                <div className="mt-3 flex items-center gap-2 px-2 py-1 bg-slate-50 dark:bg-slate-800/50 rounded-lg border border-slate-100 dark:border-slate-800 w-fit">
                   <div className={cn(
                     "w-1.5 h-1.5 rounded-full",
                     gates.find(g => g.id === blueprint.id)?.status === 'ready' ? "bg-emerald-500" : "bg-amber-500"
                   )} />
                   <span className="text-[9px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest">
                     Published: {gates.find(g => g.id === blueprint.id)?.status}
                   </span>
                </div>
              )}
              
              <div className="mt-6 space-y-3">
                {blueprint.requiredRoles.map((rr, idx) => {
                  const role = roles.find(r => r.id === rr.roleId);
                  return (
                    <div key={`${rr.roleId}-${idx}`} className="flex items-center justify-between text-sm">
                      <span className="text-slate-600 dark:text-slate-400">{role?.name}</span>
                      <span className="font-bold text-slate-900 dark:text-slate-100">x{rr.count}</span>
                    </div>
                  );
                })}
              </div>

              <div className="mt-6 pt-6 border-t border-slate-100 dark:border-slate-800 flex gap-2">
                <button 
                  onClick={() => {
                    setBuildingTeamFor(blueprint.id);
                    const initialAssignments: Record<string, string[]> = {};
                    blueprint.requiredRoles.forEach((rr, idx) => {
                      initialAssignments[`${rr.roleId}-${idx}`] = [];
                    });
                    setSelectedTeamAssignments(initialAssignments);
                  }}
                  className="flex-1 py-2 bg-indigo-600 text-white text-xs font-bold rounded hover:bg-indigo-700 transition-colors flex items-center justify-center gap-2"
                >
                  <UserPlus size={14} />
                  Build Team
                </button>
                <button 
                  onClick={handleViewRules}
                  className="px-3 py-2 bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-bold rounded hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
                >
                  Rules
                </button>
              </div>
            </div>
          ))}
          <button 
            onClick={handleCreateBlueprint}
            className="border-2 border-dashed border-slate-200 dark:border-slate-700 rounded-xl flex flex-col items-center justify-center p-8 hover:bg-slate-50 dark:hover:bg-slate-800/50 hover:border-indigo-300 dark:hover:border-indigo-500 transition-all text-slate-400 dark:text-slate-500 hover:text-indigo-600 dark:hover:text-indigo-400"
          >
            <Plus size={32} className="mb-2" />
            <span className="font-medium">Create Blueprint</span>
          </button>
        </div>
      )}

      {activeTab === 'blueprints' && buildingTeamFor && (
        <div className="space-y-6">
          <div className="flex items-center gap-4">
            <button 
              onClick={() => {
                setBuildingTeamFor(null);
                setValidationResult(null);
              }}
              className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors"
            >
              <X className="text-slate-500" size={24} />
            </button>
            <div>
              <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100">
                Building Team: {crewBlueprints.find(b => b.id === buildingTeamFor)?.name}
              </h2>
              <p className="text-sm text-slate-500 dark:text-slate-400">Assign employees to required roles and validate readiness.</p>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2 space-y-6">
              {crewBlueprints.find(b => b.id === buildingTeamFor)?.requiredRoles.map((rr, idx) => {
                const role = roles.find(r => r.id === rr.roleId);
                const assignedIds = selectedTeamAssignments[`${rr.roleId}-${idx}`] || [];
                
                return (
                  <div key={`${rr.roleId}-${idx}`} className="bg-white dark:bg-slate-900 p-6 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-2">
                        <h3 className="font-bold text-slate-900 dark:text-slate-100">{role?.name}</h3>
                        <span className="text-xs text-slate-400 dark:text-slate-500 font-medium uppercase tracking-wider">
                          {assignedIds.length} of {rr.count} Assigned
                        </span>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {Array.from({ length: rr.count }).map((_, sIdx) => {
                        const assignedId = assignedIds[sIdx];
                        const emp = employees.find(e => e.id === assignedId);
                        
                        return (
                          <div key={sIdx} className="relative">
                            {assignedId ? (
                              <div className="flex items-center gap-3 p-3 border border-slate-200 dark:border-slate-700 rounded-lg bg-slate-50 dark:bg-slate-800/50">
                                <img src={emp?.avatarUrl} alt="" className="w-8 h-8 rounded-full" />
                                <div className="flex-1 min-w-0">
                                  <p className="text-sm font-bold text-slate-900 dark:text-slate-100 truncate">{emp?.name}</p>
                                  <p className="text-[10px] text-slate-500 dark:text-slate-400 truncate">{role?.name}</p>
                                </div>
                                <button 
                                  onClick={() => {
                                    const newArr = [...assignedIds];
                                    newArr.splice(sIdx, 1);
                                    setSelectedTeamAssignments(prev => ({ ...prev, [`${rr.roleId}-${idx}`]: newArr }));
                                    setValidationResult(null);
                                  }}
                                  className="text-slate-400 hover:text-red-500 transition-colors"
                                >
                                  <X size={16} />
                                </button>
                              </div>
                            ) : (
                              <select 
                                onChange={(e) => {
                                  const val = e.target.value;
                                  if (val) {
                                    const newArr = [...assignedIds];
                                    newArr[sIdx] = val;
                                    setSelectedTeamAssignments(prev => ({ ...prev, [`${rr.roleId}-${idx}`]: newArr }));
                                    setValidationResult(null);
                                  }
                                }}
                                className="w-full p-3 border border-dashed border-slate-300 dark:border-slate-700 rounded-lg text-sm text-slate-500 dark:text-slate-400 bg-transparent hover:border-indigo-400 hover:text-indigo-600 transition-all cursor-pointer appearance-none"
                              >
                                <option value="">+ Assign {role?.name}</option>
                                {employees
                                  .filter(e => e.roleId === rr.roleId && !Object.values(selectedTeamAssignments).flat().includes(e.id))
                                  .map(e => (
                                    <option key={e.id} value={e.id}>{e.name}</option>
                                  ))
                                }
                              </select>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}

              <div className="flex justify-end">
                <button 
                  onClick={validateTeam}
                  disabled={Object.values(selectedTeamAssignments).flat().length === 0}
                  className="px-6 py-3 bg-indigo-600 text-white font-bold rounded-xl hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-200 dark:shadow-none disabled:opacity-50 disabled:shadow-none flex items-center gap-2"
                >
                  <ShieldCheck size={20} />
                  Run Readiness Validation
                </button>
              </div>
            </div>

            <div className="lg:col-span-1">
              {validationResult ? (
                <div className="bg-white dark:bg-slate-900 p-6 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm sticky top-6">
                  <div className="flex items-center gap-3 mb-6">
                    <div className={cn(
                      "w-12 h-12 rounded-full flex items-center justify-center",
                      validationResult.status === 'pass' ? "bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400" :
                      validationResult.status === 'risk' ? "bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400" : "bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400"
                    )}>
                      {validationResult.status === 'pass' ? <CheckCircle2 size={24} /> :
                       validationResult.status === 'risk' ? <AlertTriangle size={24} /> : <XCircle size={24} />}
                    </div>
                    <div>
                      <h3 className="font-bold text-slate-900 dark:text-slate-100 uppercase tracking-wider text-sm">
                        Validation: {validationResult.status}
                      </h3>
                      <p className="text-xs text-slate-500 dark:text-slate-400">
                        {validationResult.status === 'pass' ? 'Team is ready for deployment.' : 
                         validationResult.status === 'risk' ? 'Team has manageable risks.' : 'Team is not ready.'}
                      </p>
                    </div>
                  </div>

                  <div className="space-y-4">
                    {validationResult.details.map((detail, idx) => {
                      const emp = employees.find(e => e.id === detail.employeeId);
                      return (
                        <div key={idx} className="p-4 rounded-lg border border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50">
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-sm font-bold text-slate-900 dark:text-slate-100">{emp?.name}</span>
                            <span className={cn(
                              "text-[10px] font-bold px-1.5 py-0.5 rounded uppercase",
                              detail.status === 'pass' ? "bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400" :
                              detail.status === 'risk' ? "bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400" : "bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400"
                            )}>
                              {detail.status}
                            </span>
                          </div>
                          {detail.issues.map((issue, iIdx) => (
                            <p key={iIdx} className="text-xs text-red-600 dark:text-red-400 flex items-center gap-1 mt-1">
                              <AlertTriangle size={12} />
                              {issue}
                            </p>
                          ))}
                          
                          {detail.status !== 'pass' && (
                            <div className="mt-4 pt-4 border-t border-slate-200 dark:border-slate-700 space-y-2">
                              <p className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest">Actionable Fixes</p>
                              <button 
                                onClick={() => handleAssignCompliance(detail.employeeId, 'p-1')}
                                className="w-full text-left px-2 py-1.5 text-[10px] font-bold text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 rounded flex items-center gap-2 transition-colors"
                              >
                                <GraduationCap size={12} />
                                Assign Compliance Training
                              </button>
                              <button className="w-full text-left px-2 py-1.5 text-[10px] font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded flex items-center gap-2 transition-colors">
                                <Clock size={12} />
                                Request Permit Renewal
                              </button>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>

                  {validationResult && (
                    <button 
                      onClick={() => {
                        addTeamBuild({
                          id: crypto.randomUUID(),
                          blueprintId: buildingTeamFor,
                          name: `Team for ${crewBlueprints.find(b => b.id === buildingTeamFor)?.name}`,
                          assignments: (Object.entries(selectedTeamAssignments) as [string, string[]][]).flatMap(([roleKey, empIds]) => {
                            const actualRoleId = roleKey.substring(0, roleKey.lastIndexOf('-'));
                            return empIds.map(empId => ({ roleId: actualRoleId, employeeId: empId }));
                          }),
                          status: 'deployed',
                          createdAt: new Date().toISOString()
                        });
                        setBuildingTeamFor(null);
                        setValidationResult(null);
                      }}
                      className={cn(
                        "w-full mt-6 py-3 text-white font-bold rounded-xl transition-all shadow-lg",
                        validationResult.status === 'pass' ? "bg-emerald-600 hover:bg-emerald-700 shadow-emerald-200 dark:shadow-none" : 
                        validationResult.status === 'risk' ? "bg-amber-600 hover:bg-amber-700 shadow-amber-200 dark:shadow-none" : "bg-slate-900 dark:bg-slate-800 hover:bg-slate-800 dark:hover:bg-slate-700 shadow-slate-200 dark:shadow-none"
                      )}
                    >
                      {validationResult.status === 'pass' ? 'Publish & Deploy Team' : 'Publish Readiness with Issues'}
                    </button>
                  )}
                </div>
              ) : (
                <div className="bg-slate-50 dark:bg-slate-800/50 p-8 rounded-xl border-2 border-dashed border-slate-200 dark:border-slate-700 text-center text-slate-400 dark:text-slate-600">
                  <ShieldCheck size={48} className="mx-auto mb-4 opacity-20" />
                  <p className="text-sm font-medium">Assign team members and run validation to see results.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {activeTab === 'admin' && (
        <div className="space-y-8">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2">
              <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
                <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between flex-wrap gap-4">
                  <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100">Employee Permit Management</h2>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                    <input 
                      type="text" 
                      placeholder="Search employees..." 
                      className="pl-10 pr-4 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-900 dark:text-slate-100"
                    />
                  </div>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse min-w-[600px]">
                    <thead>
                      <tr className="bg-slate-50 dark:bg-slate-800/50 border-b border-slate-100 dark:border-slate-800">
                        <th className="px-6 py-4 text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Employee</th>
                        <th className="px-6 py-4 text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Permit</th>
                        <th className="px-6 py-4 text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Status</th>
                        <th className="px-6 py-4 text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Expiry</th>
                        <th className="px-6 py-4 text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                      {personPermits.map(pp => {
                        const emp = employees.find(e => e.id === pp.personId);
                        const permit = permits.find(p => p.id === pp.permitId);
                        return (
                          <tr key={pp.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors text-slate-900 dark:text-slate-100">
                            <td className="px-6 py-4">
                              <div className="flex items-center gap-3">
                                <img src={emp?.avatarUrl} alt="" className="w-8 h-8 rounded-full" />
                                <span className="text-sm font-bold">{emp?.name}</span>
                              </div>
                            </td>
                            <td className="px-6 py-4 text-sm text-slate-600 dark:text-slate-400">{permit?.name}</td>
                            <td className="px-6 py-4">
                              <span className={cn(
                                "inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider",
                                pp.status === 'valid' ? "bg-emerald-100 dark:bg-emerald-900/30 text-emerald-800 dark:text-emerald-400" :
                                pp.status === 'expiring' ? "bg-amber-100 dark:bg-amber-900/30 text-amber-800 dark:text-amber-400" :
                                pp.status === 'pending' ? "bg-indigo-100 dark:bg-indigo-900/30 text-indigo-800 dark:text-indigo-400" : "bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-400"
                              )}>
                                {pp.status}
                              </span>
                            </td>
                            <td className="px-6 py-4 text-sm text-slate-500 dark:text-slate-400">
                              {new Date(pp.expiresAt).toLocaleDateString()}
                            </td>
                            <td className="px-6 py-4">
                              <div className="flex items-center gap-2">
                                {pp.status === 'pending' ? (
                                  <>
                                    <button 
                                      onClick={() => handleApprovePermit(pp.id)}
                                      className="p-1.5 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 rounded transition-colors"
                                      title="Approve"
                                    >
                                      <CheckCircle2 size={16} />
                                    </button>
                                    <button 
                                      onClick={() => {
                                        updatePersonPermit({ ...pp, status: 'revoked', notes: 'Denied by Supervisor' });
                                      }}
                                      className="p-1.5 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded transition-colors"
                                      title="Deny"
                                    >
                                      <XCircle size={16} />
                                    </button>
                                  </>
                                ) : (
                                  <button 
                                    onClick={() => {
                                      const newStatus = pp.status === 'valid' ? 'revoked' : 'valid';
                                      updatePersonPermit({ ...pp, status: newStatus as any });
                                    }}
                                    className="text-xs font-bold text-indigo-600 dark:text-indigo-400 hover:underline"
                                  >
                                    Toggle Status
                                  </button>
                                )}
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            <div className="lg:col-span-1 space-y-6">
              <div className="bg-white dark:bg-slate-900 p-6 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
                <div className="flex items-center justify-between mb-6 flex-wrap gap-2">
                  <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                    <GraduationCap className="text-indigo-600 dark:text-indigo-400" size={20} />
                    Compliance Training Queue
                  </h2>
                  <button 
                    onClick={() => {
                      setManualTraining({ personId: '', permitId: 'p-1' });
                      setIsAssigningTraining(true);
                    }}
                    className="px-3 py-1.5 bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400 text-[10px] font-bold rounded-lg hover:bg-indigo-100 dark:hover:bg-indigo-900/30 transition-colors flex items-center gap-1.5"
                  >
                    <Plus size={14} /> Assign Training
                  </button>
                </div>
                <div className="space-y-4">
                  {complianceTrainings.length === 0 && (
                    <p className="text-sm text-slate-400 dark:text-slate-600 italic text-center py-4">Queue is empty.</p>
                  )}
                  {complianceTrainings.map(ct => {
                    const emp = employees.find(e => e.id === ct.personId);
                    const permit = permits.find(p => p.id === ct.permitId);
                    return (
                      <div key={ct.id} className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-lg border border-slate-100 dark:border-slate-800">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-sm font-bold text-slate-900 dark:text-slate-100">{emp?.name}</span>
                          <span className={cn(
                            "text-[10px] font-bold uppercase",
                            ct.status === 'completed' ? "text-emerald-600 dark:text-emerald-400" : "text-amber-600 dark:text-amber-400"
                          )}>{ct.status}</span>
                        </div>
                        <p className="text-xs text-slate-600 dark:text-slate-400 mb-3">{permit?.name} Certification</p>
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] text-slate-400 dark:text-slate-500">Assigned: {new Date(ct.assignedAt).toLocaleDateString()}</span>
                          {ct.status === 'assigned' && (
                            <button 
                              onClick={() => {
                                updateComplianceTraining({ ...ct, status: 'completed', completedAt: new Date().toISOString() });
                                
                                // Update permit
                                const pp = personPermits.find(p => p.personId === ct.personId && p.permitId === ct.permitId);
                                if (pp) {
                                  updatePersonPermit({ ...pp, status: 'valid', notes: 'Training completed and auto-verified' });
                                } else {
                                  addPersonPermit({
                                    id: crypto.randomUUID(),
                                    personId: ct.personId,
                                    permitId: ct.permitId,
                                    status: 'valid',
                                    issuedAt: new Date().toISOString(),
                                    expiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(),
                                    notes: 'Issued via training completion'
                                  });
                                }
                              }}
                              className="text-[10px] font-bold text-indigo-600 dark:text-indigo-400 hover:underline"
                            >
                              Mark Complete
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="bg-indigo-900 dark:bg-indigo-950 text-white p-6 rounded-xl shadow-lg shadow-indigo-200 dark:shadow-none">
                <h3 className="font-bold mb-2">Admin Quick Tip</h3>
                <p className="text-sm text-indigo-100 dark:text-indigo-200 leading-relaxed">
                  As an Admin, you can override permit statuses or approve training completions. 
                  All actions are logged in the Orchestrator outbox for audit trails.
                </p>
                <div className="mt-4 flex items-center gap-2 text-xs font-bold text-indigo-300 dark:text-indigo-400">
                  <FileText size={14} />
                  View Audit Logs
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'permits' && (
        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse min-w-[600px]">
              <thead>
                <tr className="bg-slate-50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-800">
                  <th className="px-6 py-4 text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Permit Name</th>
                  <th className="px-6 py-4 text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Issuer</th>
                  <th className="px-6 py-4 text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Active Holders</th>
                  <th className="px-6 py-4 text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Status</th>
                  <th className="px-6 py-4 text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {permits.map((permit) => (
                  <tr key={permit.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors text-slate-900 dark:text-slate-100">
                    <td className="px-6 py-4 text-sm font-bold">{permit.name}</td>
                    <td className="px-6 py-4 text-sm text-slate-500 dark:text-slate-400">{permit.issuer}</td>
                    <td className="px-6 py-4 text-sm font-medium">24</td>
                    <td className="px-6 py-4">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-100 dark:bg-emerald-900/30 text-emerald-800 dark:text-emerald-400">
                        Active
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <button 
                        onClick={() => setManagingPermitId(permit.id)}
                        className="text-indigo-600 dark:text-indigo-400 hover:text-indigo-800 dark:hover:text-indigo-300 text-sm font-bold"
                      >
                        Manage
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Permit Management Modal */}
      {managingPermitId && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center z-[100] p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-xl w-full max-w-md overflow-hidden">
            <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
              <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100">Manage Permit: {permits.find(p => p.id === managingPermitId)?.name}</h3>
              <button onClick={() => setManagingPermitId(null)} className="text-slate-400 hover:text-slate-600">
                <X size={20} />
              </button>
            </div>
            <div className="p-6 space-y-6 text-slate-900 dark:text-slate-100">
              <div className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-100 dark:border-slate-800">
                <div>
                  <p className="text-sm font-bold">Freeze Permit Schema</p>
                  <p className="text-xs text-slate-500 dark:text-slate-400">Temporarily disable all issuance and validation for this permit.</p>
                </div>
                <button 
                  onClick={() => {
                    const p = permits.find(p => p.id === managingPermitId);
                    if (p) {
                      updatePermit({ ...p, isFrozen: !p.isFrozen });
                    }
                  }}
                  className={cn(
                    "px-4 py-2 rounded-lg text-xs font-bold transition-all",
                    permits.find(p => p.id === managingPermitId)?.isFrozen 
                      ? "bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-200" 
                      : "bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 hover:bg-red-200"
                  )}
                >
                  {permits.find(p => p.id === managingPermitId)?.isFrozen ? 'Unfreeze' : 'Freeze'}
                </button>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest">Audit Notes</label>
                <textarea 
                  placeholder="Reason for change..."
                  className="w-full p-3 border border-slate-200 dark:border-slate-700 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 h-24 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100"
                />
              </div>
            </div>
            <div className="p-6 bg-slate-50 dark:bg-slate-800/50 border-t border-slate-100 dark:border-slate-800 flex justify-end gap-3">
              <button 
                onClick={() => setManagingPermitId(null)}
                className="px-4 py-2 text-slate-600 dark:text-slate-400 text-sm font-bold hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-all"
              >
                Cancel
              </button>
              <button 
                onClick={() => {
                  setManagingPermitId(null);
                }}
                className="px-4 py-2 bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 rounded-lg text-sm font-bold hover:bg-slate-800 dark:hover:bg-slate-200 transition-all"
              >
                Save Changes
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Blueprint Editing Modal */}
      {editingBlueprintId && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center z-[100] p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-xl w-full max-w-2xl overflow-hidden">
            <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
              <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100">Edit Blueprint Settings</h3>
              <button onClick={() => setEditingBlueprintId(null)} className="text-slate-400 hover:text-slate-600">
                <X size={20} />
              </button>
            </div>
            <div className="p-6 space-y-6 max-h-[70vh] overflow-y-auto text-slate-900 dark:text-slate-100">
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest">Blueprint Name</label>
                <input 
                  type="text"
                  value={crewBlueprints.find(b => b.id === editingBlueprintId)?.name || ''}
                  onChange={(e) => {
                    const bp = crewBlueprints.find(b => b.id === editingBlueprintId);
                    if (bp) updateBlueprint({ ...bp, name: e.target.value });
                  }}
                  className="w-full p-3 border border-slate-200 dark:border-slate-700 rounded-lg text-sm font-bold focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white dark:bg-slate-800"
                />
              </div>

              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest">Required Roles</label>
                  <button 
                    onClick={() => {
                      const bp = crewBlueprints.find(b => b.id === editingBlueprintId);
                      if (bp) {
                        updateBlueprint({
                          ...bp,
                          requiredRoles: [...bp.requiredRoles, { roleId: roles[0].id, count: 1 }]
                        });
                      }
                    }}
                    className="text-xs font-bold text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1"
                  >
                    <Plus size={12} /> Add Role
                  </button>
                </div>
                
                <div className="space-y-3">
                  {crewBlueprints.find(b => b.id === editingBlueprintId)?.requiredRoles.map((rr, idx) => (
                    <div key={idx} className="flex items-center gap-3 p-3 bg-slate-50 dark:bg-slate-800/50 rounded-lg border border-slate-100 dark:border-slate-800 flex-wrap gap-4">
                      <select 
                        value={rr.roleId}
                        onChange={(e) => {
                          const bp = crewBlueprints.find(b => b.id === editingBlueprintId);
                          if (bp) {
                            const newRoles = [...bp.requiredRoles];
                            newRoles[idx] = { ...newRoles[idx], roleId: e.target.value };
                            updateBlueprint({ ...bp, requiredRoles: newRoles });
                          }
                        }}
                        className="flex-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded p-1.5 text-sm"
                      >
                        {roles.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
                      </select>
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-slate-400">Count:</span>
                        <input 
                          type="number"
                          min="1"
                          value={rr.count}
                          onChange={(e) => {
                            const bp = crewBlueprints.find(b => b.id === editingBlueprintId);
                            if (bp) {
                              const newRoles = [...bp.requiredRoles];
                              newRoles[idx] = { ...newRoles[idx], count: parseInt(e.target.value) || 1 };
                              updateBlueprint({ ...bp, requiredRoles: newRoles });
                            }
                          }}
                          className="w-16 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded p-1.5 text-sm text-center"
                        />
                      </div>
                      <button 
                        onClick={() => {
                          const bp = crewBlueprints.find(b => b.id === editingBlueprintId);
                          if (bp && bp.requiredRoles.length > 1) {
                            const newRoles = bp.requiredRoles.filter((_, i) => i !== idx);
                            updateBlueprint({ ...bp, requiredRoles: newRoles });
                          }
                        }}
                        className="text-slate-400 hover:text-red-500 transition-colors"
                      >
                        <X size={18} />
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest">Additional Constraints</label>
                <textarea 
                  value={crewBlueprints.find(b => b.id === editingBlueprintId)?.additionalConstraints || ''}
                  onChange={(e) => {
                    const bp = crewBlueprints.find(b => b.id === editingBlueprintId);
                    if (bp) updateBlueprint({ ...bp, additionalConstraints: e.target.value });
                  }}
                  placeholder="e.g. Requires at least one Senior Lead..."
                  className="w-full p-3 border border-slate-200 dark:border-slate-700 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 h-24 bg-white dark:bg-slate-800"
                />
              </div>
            </div>
            <div className="p-6 bg-slate-50 dark:bg-slate-800/50 border-t border-slate-100 dark:border-slate-800 flex justify-end">
              <button 
                onClick={() => setEditingBlueprintId(null)}
                className="px-6 py-2 bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 rounded-lg text-sm font-bold hover:bg-slate-800 dark:hover:bg-slate-200 transition-all"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Manual Training Assignment Modal */}
      {isAssigningTraining && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center z-[100] p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-xl w-full max-w-md overflow-hidden text-slate-900 dark:text-slate-100">
            <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
              <h3 className="text-lg font-bold">Assign Compliance Training</h3>
              <button onClick={() => setIsAssigningTraining(false)} className="text-slate-400 hover:text-slate-600">
                <X size={20} />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest">Select Employee</label>
                <select 
                  className="w-full p-3 border border-slate-200 dark:border-slate-700 rounded-lg text-sm bg-white dark:bg-slate-800"
                  value={manualTraining.personId}
                  onChange={(e) => setManualTraining(prev => ({ ...prev, personId: e.target.value }))}
                >
                  <option value="">Choose an employee...</option>
                  {employees.map(e => <option key={e.id} value={e.id}>{e.name}</option>)}
                </select>
              </div>
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest">Select Permit/Module</label>
                <select 
                  className="w-full p-3 border border-slate-200 dark:border-slate-700 rounded-lg text-sm bg-white dark:bg-slate-800"
                  value={manualTraining.permitId}
                  onChange={(e) => setManualTraining(prev => ({ ...prev, permitId: e.target.value }))}
                >
                  <option value="">Choose a requirement...</option>
                  {permits.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
              </div>
            </div>
            <div className="p-6 bg-slate-50 dark:bg-slate-800/50 border-t border-slate-100 dark:border-slate-800 flex justify-end gap-3">
              <button 
                onClick={() => setIsAssigningTraining(false)}
                className="px-4 py-2 text-slate-600 dark:text-slate-400 text-sm font-bold hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-all"
              >
                Cancel
              </button>
              <button 
                onClick={() => {
                  if (!manualTraining.personId || !manualTraining.permitId) {
                    alert('Please select both an employee and a training module.');
                    return;
                  }
                  addComplianceTraining({
                    personId: manualTraining.personId,
                    permitId: manualTraining.permitId,
                    status: 'assigned'
                  });
                  setIsAssigningTraining(false);
                  setManualTraining({ personId: '', permitId: '' });
                }}
                className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-bold hover:bg-indigo-700 transition-all"
              >
                Assign Training
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Authorization Rules Modal */}
      {isViewingRules && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center z-[100] p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-xl w-full max-w-md overflow-hidden text-slate-900 dark:text-slate-100">
            <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
              <h3 className="text-lg font-bold">Authorization Rules</h3>
              <button onClick={() => setIsViewingRules(false)} className="text-slate-400 hover:text-slate-600">
                <X size={20} />
              </button>
            </div>
            <div className="p-6 space-y-4 max-h-[60vh] overflow-y-auto">
              {rules.map((rule, idx) => (
                <div key={idx} className={cn(
                  "flex gap-3 p-3 rounded-lg border",
                  rule.passed ? "bg-emerald-50 dark:bg-emerald-900/20 border-emerald-100 dark:border-emerald-900/30" : "bg-red-50 dark:bg-red-900/20 border-red-100 dark:border-red-900/30"
                )}>
                  {rule.passed ? (
                    <ShieldCheck size={18} className="text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
                  ) : (
                    <ShieldAlert size={18} className="text-red-600 dark:text-red-400 shrink-0 mt-0.5" />
                  )}
                  <div>
                    <p className={cn(
                      "text-sm font-bold",
                      rule.passed ? "text-emerald-900 dark:text-emerald-100" : "text-red-900 dark:text-red-100"
                    )}>{rule.name}</p>
                    <p className={cn(
                      "text-xs mt-1",
                      rule.passed ? "text-emerald-700 dark:text-emerald-300" : "text-red-700 dark:text-red-300"
                    )}>{rule.description}</p>
                  </div>
                </div>
              ))}
            </div>
            <div className="p-6 bg-slate-50 dark:bg-slate-800/50 border-t border-slate-100 dark:border-slate-800 flex justify-end">
              <button 
                onClick={() => setIsViewingRules(false)}
                className="px-4 py-2 bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 rounded-lg text-sm font-bold hover:bg-slate-800 dark:hover:bg-slate-200 transition-all"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
