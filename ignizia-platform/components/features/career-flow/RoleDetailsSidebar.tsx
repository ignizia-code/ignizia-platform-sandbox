'use client';

import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useCareer } from '@/lib/career-flow/context/CareerContext';
import { getRoleDeepDive } from '@/lib/career-flow/actions/ai';
import { X, Clock, Target, TrendingUp, MapPin, Briefcase, Loader2, DollarSign, Activity, Sparkles, Check } from 'lucide-react';
import { Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer, Legend, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip } from 'recharts';

export default function RoleDetailsSidebar() {
  const { profile, selectedRole, setSelectedRole, roleDeepDive, setRoleDeepDive, chosenPath, setChosenPath, isLoading, setIsLoading } = useCareer();
  const [activeTab, setActiveTab] = useState<'overview' | 'roadmap' | 'day' | 'projection'>('overview');
  const [goalSet, setGoalSet] = useState(false);

  const isCurrentGoal = chosenPath?.role.id === selectedRole?.id && chosenPath?.employeeId === profile.employeeId;

  useEffect(() => {
    if (selectedRole && !roleDeepDive) {
      fetchDeepDive();
    }
  }, [selectedRole]);

  const fetchDeepDive = async () => {
    if (!selectedRole) return;
    
    setIsLoading(true);
    const result = await getRoleDeepDive(
      profile.currentTitle,
      selectedRole.title,
      profile.skills,
      profile.yearsOfExperience
    );
    
    if (result.success) {
      setRoleDeepDive({
        roleId: selectedRole.id,
        ...result.data,
      });
    }
    setIsLoading(false);
  };

  const closeSidebar = () => {
    setSelectedRole(null);
    setRoleDeepDive(null);
  };

  if (!selectedRole) return null;

  const categoryColors: Record<string, string> = {
    adjacent: 'var(--color-brand-orange)',
    stretch: 'var(--color-brand-blue)',
    wildcard: 'var(--color-brand-pink)',
  };

  const categoryLabels = {
    adjacent: 'Adjacent Path',
    stretch: 'Stretch Goal',
    wildcard: 'Wildcard',
  };

  return (
    <AnimatePresence>
      <motion.div
        key="overlay"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/30 z-40"
        onClick={closeSidebar}
      />
      <motion.div
        key="sidebar"
        initial={{ x: '100%' }}
        animate={{ x: 0 }}
        exit={{ x: '100%' }}
        transition={{ type: 'spring', damping: 25, stiffness: 200 }}
        className="fixed right-0 top-0 h-full w-full max-w-2xl bg-white shadow-2xl z-50 overflow-hidden flex flex-col"
      >
        <div className="flex items-center justify-between p-6 border-b border-gray-100">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <span
                className="px-3 py-1 rounded-full text-xs font-medium"
                style={{
                  backgroundColor: `${categoryColors[selectedRole.category]}15`,
                  color: categoryColors[selectedRole.category],
                }}
              >
                {categoryLabels[selectedRole.category]}
              </span>
              <span className="text-sm text-gray-500">{selectedRole.matchScore}% Match</span>
            </div>
            <h2 className="text-2xl font-bold text-gray-900">{selectedRole.title}</h2>
          </div>
          <div className="flex items-center gap-2">
            {profile.employeeId && roleDeepDive && (
              <button
                onClick={() => {
                  if (!profile.employeeId) return;
                  setChosenPath({
                    employeeId: profile.employeeId,
                    role: selectedRole,
                    deepDive: roleDeepDive,
                    chosenAt: new Date().toISOString(),
                  });
                  setGoalSet(true);
                  setTimeout(() => setGoalSet(false), 2000);
                }}
                disabled={isCurrentGoal || goalSet}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all ${
                  isCurrentGoal || goalSet
                    ? 'bg-emerald-50 text-emerald-600 border border-emerald-200'
                    : 'bg-gradient-to-r from-[#089DCD] to-[#259F67] text-white hover:shadow-md'
                }`}
              >
                {isCurrentGoal || goalSet ? (
                  <><Check className="w-4 h-4" /> Career Goal Set</>
                ) : (
                  <><Sparkles className="w-4 h-4" /> Set as Career Goal</>
                )}
              </button>
            )}
            <button
              onClick={closeSidebar}
              className="w-10 h-10 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center transition-colors"
            >
              <X className="w-5 h-5 text-gray-600" />
            </button>
          </div>
        </div>

        <div className="flex border-b border-gray-100">
          {[
            { id: 'overview', label: 'Overview', icon: Target },
            { id: 'roadmap', label: 'Roadmap', icon: MapPin },
            { id: 'day', label: 'Day in Life', icon: Clock },
            { id: 'projection', label: '5-Year Outlook', icon: TrendingUp },
          ].map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as typeof activeTab)}
                className={`flex-1 flex items-center justify-center gap-2 py-4 text-sm font-medium transition-colors border-b-2 ${
                  activeTab === tab.id
                    ? 'text-[#089DCD] border-[#089DCD]'
                    : 'text-gray-500 border-transparent hover:text-gray-700'
                }`}
              >
                <Icon className="w-4 h-4" />
                {tab.label}
              </button>
            );
          })}
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center h-full">
              <Loader2 className="w-10 h-10 text-[#089DCD] animate-spin mb-4" />
              <p className="text-gray-600">Generating your personalized roadmap...</p>
            </div>
          ) : roleDeepDive ? (
            <AnimatePresence mode="wait">
              {activeTab === 'overview' && (
                <motion.div
                  key="overview"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="space-y-6"
                >
                  <div className="bg-gray-50 rounded-2xl p-6">
                    <h3 className="font-semibold text-gray-900 mb-4">Why This Fits You</h3>
                    <p className="text-gray-600 leading-relaxed">{selectedRole.reasoning}</p>
                  </div>

                  <div>
                    <h3 className="font-semibold text-gray-900 mb-4">Skill Gap Analysis</h3>
                    <div className="h-80 bg-white rounded-2xl border border-gray-100 p-4">
                      <ResponsiveContainer width="100%" height="100%">
                        <RadarChart data={roleDeepDive.skillComparison}>
                          <PolarGrid stroke="#e5e5e5" />
                          <PolarAngleAxis dataKey="skill" tick={{ fill: '#666', fontSize: 12 }} />
                          <PolarRadiusAxis angle={30} domain={[0, 100]} tick={false} axisLine={false} />
                          <Radar
                            name="Your Level"
                            dataKey="userLevel"
                            stroke="var(--color-brand-blue)"
                            fill="var(--color-brand-blue)"
                            fillOpacity={0.3}
                            strokeWidth={2}
                          />
                          <Radar
                            name="Required Level"
                            dataKey="requiredLevel"
                            stroke="var(--color-brand-yellow)"
                            fill="var(--color-brand-yellow)"
                            fillOpacity={0.3}
                            strokeWidth={2}
                          />
                          <Legend />
                        </RadarChart>
                      </ResponsiveContainer>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                  <div className="bg-brand-blue/5 rounded-xl p-4">
                      <div className="flex items-center gap-2 mb-2">
                        <Briefcase className="w-5 h-5 text-brand-blue" />
                        <span className="font-medium text-gray-900">Transition Difficulty</span>
                      </div>
                      <p className="text-2xl font-bold text-brand-blue">
                        {selectedRole.category === 'adjacent' ? 'Easy' : selectedRole.category === 'stretch' ? 'Medium' : 'Hard'}
                      </p>
                    </div>
                    <div className="bg-brand-green/5 rounded-xl p-4">
                      <div className="flex items-center gap-2 mb-2">
                        <Activity className="w-5 h-5 text-brand-green" />
                        <span className="font-medium text-gray-900">Market Demand</span>
                      </div>
                      <p className="text-2xl font-bold text-brand-green">High</p>
                    </div>
                  </div>
                </motion.div>
              )}

              {activeTab === 'roadmap' && (
                <motion.div
                  key="roadmap"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="space-y-6"
                >
                  <div className="relative">
                    <div className="absolute left-6 top-0 bottom-0 w-0.5 bg-gray-200" />
                    {roleDeepDive.roadmap.map((phase, index) => (
                      <motion.div
                        key={index}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: index * 0.1 }}
                        className="relative pl-14 pb-8 last:pb-0"
                      >
                        <div
                          className="absolute left-4 w-4 h-4 rounded-full border-4 border-white shadow-md"
                          style={{
                            backgroundColor:
                              index === 0 ? '#089DCD' : index === 1 ? '#D0C02D' : '#259F67',
                          }}
                        />
                        <div className="bg-gray-50 rounded-xl p-5">
                          <div className="flex items-center justify-between mb-3">
                            <h4 className="font-semibold text-gray-900">{phase.phase}</h4>
                            <span className="text-sm text-gray-500">{phase.duration}</span>
                          </div>
                          <ul className="space-y-2">
                            {phase.actions.map((action, actionIndex) => (
                              <li key={actionIndex} className="flex items-start gap-2">
                                <div className="w-1.5 h-1.5 rounded-full bg-[#089DCD] mt-2 flex-shrink-0" />
                                <span className="text-gray-600">{action}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                </motion.div>
              )}

              {activeTab === 'day' && (
                <motion.div
                  key="day"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="space-y-4"
                >
                  {roleDeepDive.dayInLife.map((item, index) => (
                    <motion.div
                      key={index}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.05 }}
                      className="flex items-start gap-4 bg-white rounded-xl border border-gray-100 p-4"
                    >
                      <div className="w-16 text-sm font-medium text-[#089DCD]">{item.time}</div>
                      <div className="flex-1">
                        <p className="text-gray-700">{item.activity}</p>
                      </div>
                    </motion.div>
                  ))}
                </motion.div>
              )}

              {activeTab === 'projection' && (
                <motion.div
                  key="projection"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="space-y-6"
                >
                  <div className="h-80 bg-white rounded-2xl border border-gray-100 p-4">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={roleDeepDive.fiveYearProjection}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#e5e5e5" />
                        <XAxis dataKey="year" tick={{ fill: '#666' }} />
                        <YAxis tick={{ fill: '#666' }} tickFormatter={(value) => `${value / 1000}k`} />
                        <Tooltip
                          formatter={(value: number | undefined) => value ? [`$${value.toLocaleString()}`, ''] : ['', '']}
                          contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                        />
                        <Bar dataKey="currentPath.salary" name="Current Path" fill="#9ca3af" radius={[4, 4, 0, 0]} />
                        <Bar dataKey="newPath.salary" name="New Path" fill="#089DCD" radius={[4, 4, 0, 0]} />
                        <Legend />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>

                  <div className="grid grid-cols-1 gap-4">
                    {roleDeepDive.fiveYearProjection.map((year, index) => (
                      <motion.div
                        key={year.year}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.1 }}
                        className="bg-gray-50 rounded-xl p-4"
                      >
                        <div className="flex items-center justify-between mb-3">
                          <span className="font-semibold text-gray-900">Year {year.year}</span>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                          <div className="flex items-start gap-2">
                            <div className="w-3 h-3 rounded-full bg-gray-400 mt-1" />
                            <div>
                              <p className="text-sm text-gray-500">Current Path</p>
                              <p className="font-medium text-gray-900 flex items-center gap-1">
                                <DollarSign className="w-4 h-4" />
                                {year.currentPath.salary.toLocaleString()}
                              </p>
                              <p className="text-xs text-gray-500">{year.currentPath.marketDemand}</p>
                            </div>
                          </div>
                          <div className="flex items-start gap-2">
                            <div className="w-3 h-3 rounded-full bg-[#089DCD] mt-1" />
                            <div>
                              <p className="text-sm text-gray-500">New Path</p>
                              <p className="font-medium text-[#089DCD] flex items-center gap-1">
                                <DollarSign className="w-4 h-4" />
                                {year.newPath.salary.toLocaleString()}
                              </p>
                              <p className="text-xs text-gray-500">{year.newPath.marketDemand}</p>
                            </div>
                          </div>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          ) : null}
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
