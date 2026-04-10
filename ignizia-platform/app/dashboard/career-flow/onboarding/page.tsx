'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useRouter } from 'next/navigation';
import { useCareer } from '@/lib/career-flow/context/CareerContext';
import { suggestSkills } from '@/lib/career-flow/actions/ai';
import { Sparkles, Briefcase, User, Plus, X, Loader2, Heart, Check } from 'lucide-react';
import { SEED_EMPLOYEES, SEED_ROLES } from '@/components/features/talent-studio/v3/data/seed';

const steps = [
  { id: 'basics', title: 'Let\'s get to know you' },
  { id: 'history', title: 'Your career journey' },
  { id: 'skills', title: 'Your superpowers' },
  { id: 'interests', title: 'What excites you?' },
  { id: 'aspirations', title: 'What matters most' },
];

export default function OnboardingForm() {
  const router = useRouter();
  const { profile, setProfile } = useCareer();
  const [currentStep, setCurrentStep] = useState(0);
  const [isLoadingSkills, setIsLoadingSkills] = useState(false);
  const [suggestedSkills, setSuggestedSkills] = useState<string[]>([]);
  const [newSkill, setNewSkill] = useState('');
  const [newRoleTitle, setNewRoleTitle] = useState('');
  const [newRoleCompany, setNewRoleCompany] = useState('');
  const [newInterest, setNewInterest] = useState('');
  const [showEmployeeSuggestions, setShowEmployeeSuggestions] = useState(false);

  const matchingEmployees = SEED_EMPLOYEES.filter(emp =>
    profile.name.trim().length > 0 &&
    emp.name.toLowerCase().includes(profile.name.toLowerCase().trim()) &&
    emp.id !== profile.employeeId
  );

  const commonInterests = [
    'Technology', 'Healthcare', 'Finance', 'Education', 'Arts & Design',
    'Science', 'Environment', 'Social Impact', 'Entrepreneurship', 'Research',
    'Data & Analytics', 'Marketing', 'Operations', 'Strategy', 'Innovation',
    'Helping Others', 'Creative Work', 'Problem Solving', 'Leadership', 'Learning'
  ];

  useEffect(() => {
    if (currentStep === 2 && profile.currentTitle && suggestedSkills.length === 0) {
      fetchSkills();
    }
  }, [currentStep, profile.currentTitle]);

  const fetchSkills = async () => {
    setIsLoadingSkills(true);
    const result = await suggestSkills(profile.currentTitle);
    if (result.success) {
      setSuggestedSkills(result.skills);
    }
    setIsLoadingSkills(false);
  };

  const handleNext = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      router.push('/dashboard/career-flow/analyzing');
    }
  };

  const handleBack = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const toggleSkill = (skill: string) => {
    const newSkills = profile.skills.includes(skill)
      ? profile.skills.filter(s => s !== skill)
      : [...profile.skills, skill];
    setProfile({ ...profile, skills: newSkills });
  };

  const addSkill = () => {
    if (newSkill.trim() && !profile.skills.includes(newSkill.trim())) {
      setProfile({ ...profile, skills: [...profile.skills, newSkill.trim()] });
      setNewSkill('');
    }
  };

  const addPastRole = () => {
    if (newRoleTitle.trim() && newRoleCompany.trim()) {
      setProfile({
        ...profile,
        pastRoles: [...profile.pastRoles, { title: newRoleTitle.trim(), company: newRoleCompany.trim() }],
      });
      setNewRoleTitle('');
      setNewRoleCompany('');
    }
  };

  const removePastRole = (index: number) => {
    setProfile({
      ...profile,
      pastRoles: profile.pastRoles.filter((_, i) => i !== index),
    });
  };

  const toggleInterest = (interest: string) => {
    const currentInterests = profile.interests || [];
    const newInterests = currentInterests.includes(interest)
      ? currentInterests.filter(i => i !== interest)
      : [...currentInterests, interest];
    setProfile({ ...profile, interests: newInterests });
  };

  const addInterest = () => {
    const currentInterests = profile.interests || [];
    if (newInterest.trim() && !currentInterests.includes(newInterest.trim())) {
      setProfile({ ...profile, interests: [...currentInterests, newInterest.trim()] });
      setNewInterest('');
    }
  };

  const canProceed = () => {
    switch (currentStep) {
      case 0:
        return profile.name.trim() && profile.currentTitle.trim() && profile.yearsOfExperience > 0;
      case 1:
        return true;
      case 2:
        return (profile.skills || []).length > 0;
      case 3:
        return (profile.interests || []).length > 0;
      case 4:
        return true;
      default:
        return false;
    }
  };

  return (
    <div className="min-h-screen bg-[#FAFAFA] flex items-center justify-center p-4">
      <div className="w-full max-w-2xl">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-3xl shadow-xl p-8 md:p-12"
        >
          <div className="mb-8">
            <div className="flex items-center gap-2 mb-6">
              {steps.map((step, index) => (
                <div
                  key={step.id}
                  className={`h-2 flex-1 rounded-full transition-colors ${
                    index <= currentStep ? 'bg-[#089DCD]' : 'bg-gray-200'
                  }`}
                />
              ))}
            </div>
            <AnimatePresence mode="wait">
              <motion.h1
                key={currentStep}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="text-3xl font-bold text-gray-900"
              >
                {steps[currentStep].title}
              </motion.h1>
            </AnimatePresence>
          </div>

          <AnimatePresence mode="wait">
            <motion.div
              key={currentStep}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.3 }}
            >
              {currentStep === 0 && (
                <div className="space-y-6">
                  <div className="relative">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      <User className="inline w-4 h-4 mr-2" />
                      Your Name
                    </label>
                    <div className="relative">
                      <input
                        type="text"
                        value={profile.name}
                        onChange={(e) => {
                          setProfile({ ...profile, name: e.target.value, employeeId: undefined });
                          setShowEmployeeSuggestions(true);
                        }}
                        onFocus={() => profile.name.trim().length > 0 && setShowEmployeeSuggestions(true)}
                        onBlur={() => setTimeout(() => setShowEmployeeSuggestions(false), 200)}
                        className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-[#089DCD] focus:ring-2 focus:ring-[#089DCD]/20 outline-none transition-all"
                        placeholder="Start typing your name..."
                      />
                      {profile.employeeId && (
                        <span className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1 text-xs font-medium text-emerald-600 bg-emerald-50 px-2 py-1 rounded-full">
                          <Check className="w-3 h-3" /> Linked
                        </span>
                      )}
                    </div>
                    {showEmployeeSuggestions && !profile.employeeId && matchingEmployees.length > 0 && (
                      <div className="absolute z-20 top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-xl shadow-lg max-h-48 overflow-auto">
                        {matchingEmployees.map(emp => {
                          const empRole = SEED_ROLES.find(r => r.id === emp.roleId);
                          return (
                            <button
                              key={emp.id}
                              onMouseDown={(e) => e.preventDefault()}
                              onClick={() => {
                                setProfile({
                                  ...profile,
                                  name: emp.name,
                                  employeeId: emp.id,
                                  currentTitle: profile.currentTitle || empRole?.name || '',
                                });
                                setShowEmployeeSuggestions(false);
                              }}
                              className="w-full text-left px-4 py-3 hover:bg-[#089DCD]/5 transition-colors flex items-center gap-3 border-b border-gray-50 last:border-0"
                            >
                              <img src={emp.avatarUrl} alt={emp.name} className="w-8 h-8 rounded-full object-cover border border-gray-100" />
                              <div>
                                <p className="font-medium text-gray-900 text-sm">{emp.name}</p>
                                <p className="text-xs text-gray-500">{empRole?.name || 'No Role'}</p>
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      <Briefcase className="inline w-4 h-4 mr-2" />
                      Current Job Title
                    </label>
                    <input
                      type="text"
                      value={profile.currentTitle}
                      onChange={(e) => setProfile({ ...profile, currentTitle: e.target.value })}
                      className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-[#089DCD] focus:ring-2 focus:ring-[#089DCD]/20 outline-none transition-all"
                      placeholder="Software Engineer"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Years of Experience
                    </label>
                    <input
                      type="number"
                      min="0"
                      max="50"
                      value={profile.yearsOfExperience || ''}
                      onChange={(e) => setProfile({ ...profile, yearsOfExperience: parseInt(e.target.value) || 0 })}
                      className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-[#089DCD] focus:ring-2 focus:ring-[#089DCD]/20 outline-none transition-all"
                      placeholder="5"
                    />
                  </div>
                </div>
              )}

              {currentStep === 1 && (
                <div className="space-y-6">
                  <div className="bg-gray-50 rounded-xl p-4 space-y-4">
                    <h3 className="font-medium text-gray-900">Add Past Role</h3>
                    <div className="grid grid-cols-2 gap-3">
                      <input
                        type="text"
                        value={newRoleTitle}
                        onChange={(e) => setNewRoleTitle(e.target.value)}
                        className="px-4 py-3 rounded-xl border border-gray-200 focus:border-[#089DCD] focus:ring-2 focus:ring-[#089DCD]/20 outline-none"
                        placeholder="Job Title"
                      />
                      <input
                        type="text"
                        value={newRoleCompany}
                        onChange={(e) => setNewRoleCompany(e.target.value)}
                        className="px-4 py-3 rounded-xl border border-gray-200 focus:border-[#089DCD] focus:ring-2 focus:ring-[#089DCD]/20 outline-none"
                        placeholder="Company"
                      />
                    </div>
                    <button
                      onClick={addPastRole}
                      className="w-full py-3 rounded-xl border-2 border-dashed border-gray-300 text-gray-600 hover:border-[#089DCD] hover:text-[#089DCD] transition-colors flex items-center justify-center gap-2"
                    >
                      <Plus className="w-4 h-4" />
                      Add Role
                    </button>
                  </div>
                  
                  {profile.pastRoles.length > 0 && (
                    <div className="space-y-2">
                      {profile.pastRoles.map((role, index) => (
                        <motion.div
                          key={index}
                          initial={{ opacity: 0, y: -10 }}
                          animate={{ opacity: 1, y: 0 }}
                          className="flex items-center justify-between bg-white border border-gray-200 rounded-xl px-4 py-3"
                        >
                          <div>
                            <span className="font-medium text-gray-900">{role.title}</span>
                            <span className="text-gray-500"> at </span>
                            <span className="text-gray-700">{role.company}</span>
                          </div>
                          <button
                            onClick={() => removePastRole(index)}
                            className="text-gray-400 hover:text-red-500 transition-colors"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </motion.div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {currentStep === 2 && (
                <div className="space-y-6">
                  {isLoadingSkills ? (
                    <div className="flex flex-col items-center justify-center py-12">
                      <motion.div
                        animate={{ scale: [1, 1.2, 1] }}
                        transition={{ repeat: Infinity, duration: 1.5 }}
                      >
                        <Sparkles className="w-12 h-12 text-[#089DCD]" />
                      </motion.div>
                      <p className="mt-4 text-gray-600">Analyzing your profile...</p>
                    </div>
                  ) : (
                    <>
                      <div className="flex flex-wrap gap-2">
                        {suggestedSkills.map((skill, index) => (
                          <motion.button
                            key={skill}
                            initial={{ opacity: 0, scale: 0.8 }}
                            animate={{ opacity: 1, scale: 1 }}
                            transition={{ delay: index * 0.05 }}
                            onClick={() => toggleSkill(skill)}
                            className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${
                              profile.skills.includes(skill)
                                ? 'bg-[#089DCD] text-white'
                                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                            }`}
                          >
                            {skill}
                          </motion.button>
                        ))}
                      </div>
                      
                      <div className="flex gap-2">
                        <input
                          type="text"
                          value={newSkill}
                          onChange={(e) => setNewSkill(e.target.value)}
                          onKeyPress={(e) => e.key === 'Enter' && addSkill()}
                          className="flex-1 px-4 py-3 rounded-xl border border-gray-200 focus:border-[#089DCD] focus:ring-2 focus:ring-[#089DCD]/20 outline-none"
                          placeholder="Add a custom skill"
                        />
                        <button
                          onClick={addSkill}
                          className="px-6 py-3 bg-[#089DCD] text-white rounded-xl hover:bg-[#078ab5] transition-colors"
                        >
                          <Plus className="w-5 h-5" />
                        </button>
                      </div>
                      
                      {profile.skills.length > 0 && (
                        <div className="pt-4 border-t border-gray-200">
                          <p className="text-sm text-gray-600 mb-2">Selected skills:</p>
                          <div className="flex flex-wrap gap-2">
                            {profile.skills.map((skill) => (
                              <span
                                key={skill}
                                className="inline-flex items-center gap-1 px-3 py-1 bg-[#089DCD]/10 text-[#089DCD] rounded-full text-sm"
                              >
                                {skill}
                                <button
                                  onClick={() => toggleSkill(skill)}
                                  className="hover:text-[#078ab5]"
                                >
                                  <X className="w-3 h-3" />
                                </button>
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                    </>
                  )}
                </div>
              )}

              {currentStep === 3 && (
                <div className="space-y-6">
                  <p className="text-gray-600 mb-4">
                    Select topics and industries that excite you. This helps us find roles that match your passions.
                  </p>
                  
                  <div className="flex flex-wrap gap-2">
                    {commonInterests.map((interest, index) => (
                      <motion.button
                        key={interest}
                        initial={{ opacity: 0, scale: 0.8 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: index * 0.03 }}
                        onClick={() => toggleInterest(interest)}
                        className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${
                          (profile.interests || []).includes(interest)
                            ? 'bg-[#BA2C69] text-white'
                            : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                        }`}
                      >
                        <Heart className={`inline w-3 h-3 mr-1 ${(profile.interests || []).includes(interest) ? 'fill-current' : ''}`} />
                        {interest}
                      </motion.button>
                    ))}
                  </div>
                  
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={newInterest}
                      onChange={(e) => setNewInterest(e.target.value)}
                      onKeyPress={(e) => e.key === 'Enter' && addInterest()}
                      className="flex-1 px-4 py-3 rounded-xl border border-gray-200 focus:border-[#BA2C69] focus:ring-2 focus:ring-[#BA2C69]/20 outline-none"
                      placeholder="Add a custom interest"
                    />
                    <button
                      onClick={addInterest}
                      className="px-6 py-3 bg-[#BA2C69] text-white rounded-xl hover:bg-[#a02558] transition-colors"
                    >
                      <Plus className="w-5 h-5" />
                    </button>
                  </div>
                  
                  {(profile.interests || []).length > 0 && (
                    <div className="pt-4 border-t border-gray-200">
                      <p className="text-sm text-gray-600 mb-2">Selected interests:</p>
                      <div className="flex flex-wrap gap-2">
                        {(profile.interests || []).map((interest) => (
                          <span
                            key={interest}
                            className="inline-flex items-center gap-1 px-3 py-1 bg-[#BA2C69]/10 text-[#BA2C69] rounded-full text-sm"
                          >
                            <Heart className="w-3 h-3 fill-current" />
                            {interest}
                            <button
                              onClick={() => toggleInterest(interest)}
                              className="hover:text-[#a02558]"
                            >
                              <X className="w-3 h-3" />
                            </button>
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {currentStep === 4 && (
                <div className="space-y-8">
                  <div>
                    <div className="flex justify-between items-center mb-3">
                      <label className="text-sm font-medium text-gray-700">Salary Growth</label>
                      <span className="text-sm text-[#089DCD] font-medium">{profile.aspirations.salary}%</span>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="100"
                      value={profile.aspirations.salary}
                      onChange={(e) => setProfile({
                        ...profile,
                        aspirations: { ...profile.aspirations, salary: parseInt(e.target.value) }
                      })}
                      className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-[#089DCD]"
                    />
                    <div className="flex justify-between text-xs text-gray-500 mt-1">
                      <span>Stability</span>
                      <span>Maximize Earnings</span>
                    </div>
                  </div>

                  <div>
                    <div className="flex justify-between items-center mb-3">
                      <label className="text-sm font-medium text-gray-700">Work-Life Balance</label>
                      <span className="text-sm text-[#D0C02D] font-medium">{profile.aspirations.workLifeBalance}%</span>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="100"
                      value={profile.aspirations.workLifeBalance}
                      onChange={(e) => setProfile({
                        ...profile,
                        aspirations: { ...profile.aspirations, workLifeBalance: parseInt(e.target.value) }
                      })}
                      className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-[#D0C02D]"
                    />
                    <div className="flex justify-between text-xs text-gray-500 mt-1">
                      <span>Work-First</span>
                      <span>Life-First</span>
                    </div>
                  </div>

                  <div>
                    <div className="flex justify-between items-center mb-3">
                      <label className="text-sm font-medium text-gray-700">Leadership</label>
                      <span className="text-sm text-[#089DCD] font-medium">{profile.aspirations.leadership}%</span>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="100"
                      value={profile.aspirations.leadership}
                      onChange={(e) => setProfile({
                        ...profile,
                        aspirations: { ...profile.aspirations, leadership: parseInt(e.target.value) }
                      })}
                      className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-[#089DCD]"
                    />
                    <div className="flex justify-between text-xs text-gray-500 mt-1">
                      <span>Individual Contributor</span>
                      <span>People Manager</span>
                    </div>
                  </div>
                </div>
              )}
            </motion.div>
          </AnimatePresence>

          <div className="flex gap-4 mt-10">
            {currentStep > 0 && (
              <button
                onClick={handleBack}
                className="px-6 py-3 rounded-xl border border-gray-200 text-gray-700 hover:bg-gray-50 transition-colors"
              >
                Back
              </button>
            )}
            <button
              onClick={handleNext}
              disabled={!canProceed()}
              className="flex-1 px-6 py-3 rounded-xl bg-[#089DCD] text-white font-medium hover:bg-[#078ab5] disabled:bg-gray-300 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2"
            >
              {currentStep === steps.length - 1 ? (
                <>
                  <Sparkles className="w-4 h-4" />
                  Discover My Path
                </>
              ) : (
                'Continue'
              )}
            </button>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
