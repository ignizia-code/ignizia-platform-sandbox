import React, { useState, useMemo } from 'react';
import { useApp } from '../store/AppContext';
import { 
  TrendingUp, 
  TrendingDown, 
  AlertCircle, 
  DollarSign, 
  Users, 
  ArrowRight,
  BarChart3,
  Map,
  Briefcase,
  Clock,
  ShieldAlert,
  GraduationCap,
  Plus,
  ChevronRight
} from 'lucide-react';
import { cn } from '../lib/utils';
import { ProficiencyLevel } from '../types';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  Cell
} from 'recharts';

export default function WorkforcePlanning() {
  const { buckets, roles, employees, addOutboxRecord, runGapAnalysis, projects, allSkills, generateLearningPlan, addRole } = useApp();
  const [activeTab, setActiveTab] = useState<'heatmap' | 'forecast' | 'cost'>('heatmap');
  const [selectedDomainId, setSelectedDomainId] = useState<string | null>(null);
  const [selectedShortage, setSelectedShortage] = useState<string | null>(null);

  const heatmapData = useMemo(() => {
    return buckets.map(bucket => {
      let totalGaps = 0;
      let totalRequired = 0;

      employees.forEach(emp => {
        const analysis = runGapAnalysis(emp.id);
        if (analysis) {
          const bucketAnalysis = analysis.bucketAnalysis.find(b => b.bucketId === bucket.id);
          if (bucketAnalysis) {
            totalGaps += (bucketAnalysis.requiredCount - bucketAnalysis.matchedCount);
            totalRequired += bucketAnalysis.requiredCount;
          }
        }
      });

      return {
        id: bucket.id,
        name: bucket.name.split(' ')[0],
        fullName: bucket.name,
        gap: totalRequired > 0 ? Math.round((totalGaps / totalRequired) * 100) : 0,
        totalGaps,
        totalRequired
      };
    });
  }, [buckets, employees, runGapAnalysis]);

  const selectedDomain = heatmapData.find(d => d.id === selectedDomainId);

  const strategicRisks = useMemo(() => {
    return heatmapData
      .filter(d => d.gap > 0)
      .sort((a, b) => b.gap - a.gap)
      .slice(0, 3);
  }, [heatmapData]);

  const handlePublishConstraint = (domainName: string) => {
    addOutboxRecord('strategy_studio', 'WorkforceConstraintPublished', {
      domain: domainName,
      severity: 'high',
      timestamp: new Date().toISOString()
    });
  };

  const handleCreateCohortPlan = (domainName: string) => {
    alert(`Cohort learning plan generated for ${domainName} gaps.`);
  };

  const handleCreateLearningPlan = () => {
    if (!selectedShortage) return;
    const domain = buckets.find(b => b.id === selectedShortage);
    if (!domain) return;

    // Find employees who need skills in this domain
    let count = 0;
    employees.forEach(emp => {
      const analysis = runGapAnalysis(emp.id);
      if (analysis) {
        const bucketAnalysis = analysis.bucketAnalysis.find(b => b.bucketId === selectedShortage);
        if (bucketAnalysis && bucketAnalysis.missingSkills.length > 0) {
          generateLearningPlan(emp.id, emp.roleId);
          count++;
        }
      }
    });

    alert(`Created learning plans for ${count} employees to address ${domain.name} gaps.`);
  };

  const handleOpenHiringRequest = () => {
    if (!selectedShortage) return;
    const domain = buckets.find(b => b.id === selectedShortage);
    if (!domain) return;
    
    // Create a new role for hiring
    const newRole = {
      id: `role-hiring-${Date.now()}`,
      name: `External Hire: ${domain.name} Specialist`,
      department: 'Talent Acquisition',
      level: 'L3',
      description: `New role created to address critical shortage in ${domain.name}.`,
      requirements: domain.skills.slice(0, 3).map(s => ({
        skillId: s.id,
        minLevel: 3 as ProficiencyLevel,
        weight: 1,
        required: true
      })),
      isHiring: true
    };
    
    addRole(newRole as any);
    alert(`Hiring request opened. New role "${newRole.name}" added to Roles section.`);
  };

  const handleOpenStaffingRequest = (domainName: string) => {
    alert(`Staffing request opened for ${domainName} experts.`);
  };

  return (
    <div className="space-y-6 pb-20">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Workforce Planning</h1>
          <p className="text-slate-500 dark:text-slate-400 mt-1">Strategic foresight, gap heatmaps, and cost modeling for workforce transformation.</p>
        </div>
        <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-lg">
          {['heatmap', 'forecast', 'cost'].map((tab) => (
            <button 
              key={tab}
              onClick={() => setActiveTab(tab as any)}
              className={cn(
                "px-4 py-1.5 rounded-md text-sm font-medium transition-all capitalize",
                activeTab === tab ? "bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-400 shadow-sm" : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200"
              )}
            >
              {tab}
            </button>
          ))}
        </div>
      </div>

      {activeTab === 'heatmap' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-white dark:bg-slate-900 p-6 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
              <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100 mb-2">Critical Skill Gap Heatmap</h2>
              <p className="text-sm text-slate-500 dark:text-slate-400 mb-6">Click a domain to analyze drivers and take action.</p>
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={heatmapData}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                    <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#94a3b8' }} />
                    <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#94a3b8' }} />
                    <Tooltip 
                      cursor={{ fill: '#f8fafc' }}
                      contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)', backgroundColor: '#1e293b', color: '#f8fafc' }}
                    />
                    <Bar dataKey="gap" radius={[4, 4, 0, 0]} onClick={(data) => data?.id && setSelectedDomainId(data.id)} className="cursor-pointer">
                      {heatmapData.map((entry, index) => (
                        <Cell 
                          key={`cell-${index}`} 
                          fill={entry.gap > 35 ? '#ef4444' : entry.gap > 20 ? '#f59e0b' : '#6366f1'} 
                          stroke={selectedDomainId === entry.id ? '#1e293b' : 'none'}
                          strokeWidth={selectedDomainId === entry.id ? 2 : 0}
                        />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          <div className="lg:col-span-1 space-y-6">
            {selectedDomain ? (
              <div className="bg-white dark:bg-slate-900 p-6 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
                <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
                  <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100">{selectedDomain.fullName}</h2>
                  <span className={cn(
                    "px-2 py-0.5 rounded text-xs font-bold",
                    selectedDomain.gap > 35 ? "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400" : 
                    selectedDomain.gap > 20 ? "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400" : "bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400"
                  )}>
                    {selectedDomain.gap}% Gap
                  </span>
                </div>

                <div className="space-y-6">
                  <div>
                    <h3 className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-3">Gap Drivers</h3>
                    <div className="space-y-4">
                      <div className="p-3 bg-slate-50 dark:bg-slate-800/50 rounded-lg border border-slate-100 dark:border-slate-800">
                        <div className="text-xs font-bold text-slate-500 dark:text-slate-400 mb-2">Impacted Roles & Teams</div>
                        <div className="space-y-1">
                          <div className="flex justify-between text-sm">
                            <span className="text-slate-700 dark:text-slate-300">Senior Engineers</span>
                            <span className="font-bold text-red-600 dark:text-red-400">High</span>
                          </div>
                          <div className="flex justify-between text-sm">
                            <span className="text-slate-700 dark:text-slate-300">Platform Team</span>
                            <span className="font-bold text-amber-600 dark:text-amber-400">Medium</span>
                          </div>
                        </div>
                      </div>
                      
                      <div className="p-3 bg-slate-50 dark:bg-slate-800/50 rounded-lg border border-slate-100 dark:border-slate-800">
                        <div className="text-xs font-bold text-slate-500 dark:text-slate-400 mb-2">Top Missing Skills</div>
                        <div className="flex flex-wrap gap-2">
                          {allSkills
                            .filter(s => s.bucketId === selectedDomain.id)
                            .slice(0, 3)
                            .map(skill => (
                              <span key={skill.id} className="px-2 py-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 text-xs rounded-md">
                                {skill.name}
                              </span>
                            ))}
                        </div>
                      </div>
                    </div>
                  </div>

                  <div>
                    <h3 className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-3">Recommended Actions</h3>
                    <div className="space-y-2">
                      <button 
                        onClick={() => handleCreateCohortPlan(selectedDomain.fullName)}
                        className="w-full flex items-center justify-between p-3 bg-indigo-50 dark:bg-indigo-900/20 hover:bg-indigo-100 dark:hover:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 rounded-lg transition-colors text-sm font-bold"
                      >
                        <div className="flex items-center gap-2">
                          <GraduationCap size={16} />
                          Create Cohort Learning Plan
                        </div>
                        <ArrowRight size={16} />
                      </button>
                      <button 
                        onClick={() => handleOpenStaffingRequest(selectedDomain.fullName)}
                        className="w-full flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-800/50 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-lg transition-colors text-sm font-bold"
                      >
                        <div className="flex items-center gap-2">
                          <Users size={16} />
                          Open Staffing Request
                        </div>
                        <ArrowRight size={16} />
                      </button>
                      <button 
                        onClick={() => handlePublishConstraint(selectedDomain.fullName)}
                        className="w-full flex items-center justify-between p-3 bg-red-50 dark:bg-red-900/20 hover:bg-red-100 dark:hover:bg-red-900/30 text-red-700 dark:text-red-300 rounded-lg transition-colors text-sm font-bold"
                      >
                        <div className="flex items-center gap-2">
                          <ShieldAlert size={16} />
                          Publish Constraint Risk
                        </div>
                        <ArrowRight size={16} />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="bg-white dark:bg-slate-900 p-6 rounded-xl border border-dashed border-slate-300 dark:border-slate-700 shadow-sm text-center h-full flex flex-col items-center justify-center min-h-[400px]">
                <BarChart3 size={32} className="text-slate-300 dark:text-slate-600 mb-4" />
                <h3 className="text-lg font-medium text-slate-900 dark:text-slate-100">Select a Domain</h3>
                <p className="text-slate-500 dark:text-slate-400 mt-1 text-sm">
                  Click on a bar in the heatmap to view drivers and recommended actions.
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {activeTab === 'forecast' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 bg-white dark:bg-slate-900 p-6 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
            <div className="flex items-center justify-between mb-6 flex-wrap gap-4">
              <div>
                <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100">Demand vs Supply Forecast</h2>
                <p className="text-sm text-slate-500 dark:text-slate-400">Projected workforce readiness over the next 6 months.</p>
              </div>
              <button 
                onClick={() => {
                  addOutboxRecord('strategy_studio', 'WorkforceRiskPublished', {
                    timestamp: new Date().toISOString(),
                    shortage: 14
                  });
                  alert('Risk published to Strategy Studio.');
                }}
                className="px-4 py-2 bg-indigo-600 text-white text-sm font-bold rounded-lg hover:bg-indigo-700 transition-colors"
              >
                Publish Risk
              </button>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
              <div className="p-4 bg-red-50 dark:bg-red-900/20 rounded-xl border border-red-100 dark:border-red-900/30">
                <h3 className="text-xs font-bold text-red-800 dark:text-red-400 uppercase tracking-widest mb-4">Demand Drivers</h3>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-sm text-red-900 dark:text-red-200 font-medium">
                      <Briefcase size={16} /> Active Projects
                    </div>
                    <span className="font-bold text-red-700 dark:text-red-400">+{projects.length * 3} FTEs</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-sm text-red-900 dark:text-red-200 font-medium">
                      <Clock size={16} /> Expiring Certs
                    </div>
                    <span className="font-bold text-red-700 dark:text-red-400">+12 FTEs</span>
                  </div>
                </div>
              </div>

              <div className="p-4 bg-emerald-50 dark:bg-emerald-900/20 rounded-xl border border-emerald-100 dark:border-emerald-900/30">
                <h3 className="text-xs font-bold text-emerald-800 dark:text-emerald-400 uppercase tracking-widest mb-4">Supply Levers</h3>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-sm text-emerald-900 dark:text-emerald-200 font-medium">
                      <GraduationCap size={16} /> Active Learning Plans
                    </div>
                    <span className="font-bold text-emerald-700 dark:text-emerald-400">+8 FTEs</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-sm text-emerald-900 dark:text-emerald-200 font-medium">
                      <Users size={16} /> Internal Mobility
                    </div>
                    <span className="font-bold text-emerald-700 dark:text-emerald-400">+3 FTEs</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="p-6 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-200 dark:border-slate-700 text-center">
              <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100 mb-2">Net Shortage Summary</h3>
              <p className="text-slate-600 dark:text-slate-400 mb-4">
                Based on current demand drivers and supply levers, we project a net shortage of <span className="font-bold text-red-600 dark:text-red-400">14 FTEs</span> by Q3.
              </p>
              <button 
                onClick={() => setActiveTab('cost')}
                className="px-4 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 text-sm font-bold rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
              >
                Generate Remediation Plans
              </button>
            </div>
          </div>

          <div className="lg:col-span-1 space-y-6">
            <div className="bg-white dark:bg-slate-900 p-6 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
              <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100 mb-4">Top Strategic Risks</h2>
              <div className="space-y-4">
                {strategicRisks.map(risk => (
                  <div key={risk.id} className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-100 dark:border-red-900/30 rounded-lg">
                    <div className="flex items-center gap-2 text-red-700 dark:text-red-300 font-bold text-sm mb-1">
                      <AlertCircle size={16} />
                      {risk.fullName}
                    </div>
                    <p className="text-xs text-red-600/80 dark:text-red-400/80 mb-3">
                      High gap ({risk.gap}%) threatens upcoming project deliverables.
                    </p>
                    <button 
                      onClick={() => {
                        setSelectedDomainId(risk.id);
                        setActiveTab('heatmap');
                      }}
                      className="text-xs font-bold text-red-700 dark:text-red-400 hover:text-red-800 dark:hover:text-red-300 underline"
                    >
                      View Impact Analysis
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'cost' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-1 space-y-6">
            <div className="bg-white dark:bg-slate-900 p-6 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
              <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100 mb-4">Select Shortage to Solve</h2>
              <div className="space-y-2">
                {strategicRisks.map(risk => (
                  <button
                    key={risk.id}
                    onClick={() => setSelectedShortage(risk.id)}
                    className={cn(
                      "w-full flex items-center justify-between p-3 rounded-lg border text-left transition-colors",
                      selectedShortage === risk.id 
                        ? "bg-indigo-50 dark:bg-indigo-900/20 border-indigo-200 dark:border-indigo-900/50 text-indigo-900 dark:text-indigo-100" 
                        : "bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800"
                    )}
                  >
                    <div>
                      <div className="font-bold text-sm">{risk.fullName}</div>
                      <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{risk.gap}% Gap</div>
                    </div>
                    <ChevronRight size={16} className={selectedShortage === risk.id ? "text-indigo-500" : "text-slate-400"} />
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="lg:col-span-2">
            {selectedShortage ? (
              <div className="bg-white dark:bg-slate-900 p-6 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
                <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100 mb-6">Upskill vs. Hire Comparison</h2>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                  {/* Upskill Option */}
                  <div className="p-6 bg-indigo-50 dark:bg-indigo-900/20 rounded-xl border border-indigo-100 dark:border-indigo-900/30 relative overflow-hidden">
                    <div className="absolute top-0 right-0 bg-indigo-600 text-white text-[10px] font-bold px-3 py-1 rounded-bl-lg uppercase tracking-widest">
                      Recommended
                    </div>
                    <h3 className="text-lg font-bold text-indigo-900 dark:text-indigo-100 mb-4">Upskill Internal Talent</h3>
                    
                    <div className="space-y-4">
                      <div>
                        <div className="text-xs font-bold text-indigo-700 dark:text-indigo-400 uppercase tracking-widest mb-1">Estimated Cost</div>
                        <div className="text-2xl font-bold text-indigo-900 dark:text-indigo-100">$12,500</div>
                        <div className="text-xs text-indigo-600/80 dark:text-indigo-400/80">per employee</div>
                      </div>
                      
                      <div>
                        <div className="text-xs font-bold text-indigo-700 dark:text-indigo-400 uppercase tracking-widest mb-1">Time to Readiness</div>
                        <div className="text-lg font-bold text-indigo-900 dark:text-indigo-100">3-4 Months</div>
                      </div>

                      <div>
                        <div className="text-xs font-bold text-indigo-700 dark:text-indigo-400 uppercase tracking-widest mb-1">Risk Profile</div>
                        <div className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400 text-sm font-bold">
                          <TrendingDown size={16} /> Low Risk
                        </div>
                        <p className="text-xs text-indigo-600/80 dark:text-indigo-400/80 mt-1">Known cultural fit, higher retention.</p>
                      </div>
                    </div>

                    <button onClick={handleCreateLearningPlan} className="w-full mt-6 py-2 bg-indigo-600 text-white text-sm font-bold rounded-lg hover:bg-indigo-700 transition-colors">
                      Create Learning Plan
                    </button>
                  </div>

                  {/* Hire Option */}
                  <div className="p-6 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-200 dark:border-slate-700">
                    <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100 mb-4">Hire External Talent</h3>
                    
                    <div className="space-y-4">
                      <div>
                        <div className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest mb-1">Estimated Cost</div>
                        <div className="text-2xl font-bold text-slate-900 dark:text-slate-100">$45,000</div>
                        <div className="text-xs text-slate-500 dark:text-slate-400">recruiting + onboarding</div>
                      </div>
                      
                      <div>
                        <div className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest mb-1">Time to Readiness</div>
                        <div className="text-lg font-bold text-slate-900 dark:text-slate-100">6-8 Months</div>
                      </div>

                      <div>
                        <div className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest mb-1">Risk Profile</div>
                        <div className="flex items-center gap-1 text-amber-600 dark:text-amber-400 text-sm font-bold">
                          <TrendingUp size={16} /> High Risk
                        </div>
                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Unknown cultural fit, onboarding delay.</p>
                      </div>
                    </div>

                    <button onClick={handleOpenHiringRequest} className="w-full mt-6 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 text-sm font-bold rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors">
                      Open Hiring Request
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <div className="bg-white dark:bg-slate-900 border border-dashed border-slate-300 dark:border-slate-700 rounded-xl p-12 text-center h-full flex flex-col items-center justify-center min-h-[400px]">
                <DollarSign size={32} className="text-slate-300 dark:text-slate-600 mb-4" />
                <h3 className="text-lg font-medium text-slate-900 dark:text-slate-100">Select a Shortage</h3>
                <p className="text-slate-500 dark:text-slate-400 mt-1 text-sm max-w-sm mx-auto">
                  Choose a strategic risk from the list to compare the cost and time of upskilling versus hiring.
                </p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
