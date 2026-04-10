'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { useCareer } from '@/lib/career-flow/context/CareerContext';
import { motion } from 'framer-motion';
import { Sparkles, ArrowRight, User, Briefcase, Target } from 'lucide-react';
import { Button } from '@/components/ui';

const CareerFlowHome: React.FC = () => {
  const router = useRouter();
  const { profile, suggestedRoles } = useCareer();

  const handleStartDiscovery = () => {
    router.push('/dashboard/career-flow/onboarding');
  };

  const handleViewResults = () => {
    router.push('/dashboard/career-flow/results');
  };

  const hasCompletedOnboarding = profile.name && profile.currentTitle && suggestedRoles.length > 0;

  return (
    <div className="min-h-full bg-background-light dark:bg-slate-900">
      <div className="max-w-4xl mx-auto px-4 py-12">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-12"
        >
          <div className="w-20 h-20 bg-gradient-to-br from-brand-blue to-brand-green rounded-2xl mx-auto mb-6 flex items-center justify-center shadow-lg shadow-brand-blue/20">
            <Sparkles className="w-10 h-10 text-white" />
          </div>
          <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-4">
            Career Flow
          </h1>
          <p className="text-lg text-gray-600 dark:text-gray-400 max-w-2xl mx-auto">
            Discover your next career move with AI-powered insights and personalized roadmaps. 
            Get tailored recommendations based on your skills, experience, and aspirations.
          </p>
        </motion.div>

        {hasCompletedOnboarding ? (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white dark:bg-slate-800 rounded-3xl shadow-xl p-8 mb-8"
          >
            <div className="flex items-center gap-4 mb-6">
              <div className="w-12 h-12 bg-brand-green/10 rounded-xl flex items-center justify-center">
                <User className="w-6 h-6 text-brand-green" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                  Welcome back, {profile.name}!
                </h2>
                <p className="text-gray-500 dark:text-gray-400">
                  {profile.currentTitle} • {profile.yearsOfExperience} years experience
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
              <div className="bg-slate-50 dark:bg-slate-700/50 rounded-xl p-4">
                <div className="flex items-center gap-2 mb-2">
                  <Briefcase className="w-4 h-4 text-brand-blue" />
                  <span className="text-sm font-medium text-gray-600 dark:text-gray-400">Skills</span>
                </div>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">{profile.skills.length}</p>
                <p className="text-xs text-gray-500">Total skills tracked</p>
              </div>
              <div className="bg-slate-50 dark:bg-slate-700/50 rounded-xl p-4">
                <div className="flex items-center gap-2 mb-2">
                  <Target className="w-4 h-4 text-brand-pink" />
                  <span className="text-sm font-medium text-gray-600 dark:text-gray-400">Interests</span>
                </div>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">{profile.interests.length}</p>
                <p className="text-xs text-gray-500">Areas of interest</p>
              </div>
              <div className="bg-slate-50 dark:bg-slate-700/50 rounded-xl p-4">
                <div className="flex items-center gap-2 mb-2">
                  <Sparkles className="w-4 h-4 text-brand-orange" />
                  <span className="text-sm font-medium text-gray-600 dark:text-gray-400">Matches</span>
                </div>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">{suggestedRoles.length}</p>
                <p className="text-xs text-gray-500">Career paths found</p>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-4">
              <Button
                onClick={handleViewResults}
                className="flex-1 gap-2"
                size="lg"
                variant="primary"
              >
                <Sparkles className="w-5 h-5" />
                View My Career Paths
                <ArrowRight className="w-5 h-5" />
              </Button>
              <Button
                onClick={handleStartDiscovery}
                className="flex-1 bg-white dark:bg-slate-700 border-2 border-gray-200 dark:border-slate-600 text-gray-700 dark:text-gray-300 hover:border-action hover:text-action dark:hover:border-action dark:hover:text-action"
                size="lg"
                variant="secondary"
              >
                Update My Profile
              </Button>
            </div>
          </motion.div>
        ) : (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white dark:bg-slate-800 rounded-3xl shadow-xl p-8 text-center"
          >
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
              Start Your Career Discovery
            </h2>
            <p className="text-gray-600 dark:text-gray-400 mb-8 max-w-lg mx-auto">
              Answer a few questions about your background, skills, and aspirations. 
              Our AI will analyze your profile and suggest personalized career paths.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
              {[
                { step: 1, title: 'Tell us about yourself', desc: 'Your experience and background' },
                { step: 2, title: 'Share your skills', desc: 'What you bring to the table' },
                { step: 3, title: 'Get AI insights', desc: 'Personalized career paths' },
              ].map((item) => (
                <div key={item.step} className="bg-slate-50 dark:bg-slate-700/50 rounded-xl p-4 text-left">
                  <div className="w-8 h-8 bg-action text-white rounded-lg flex items-center justify-center font-bold mb-3">
                    {item.step}
                  </div>
                  <h3 className="font-semibold text-gray-900 dark:text-white mb-1">{item.title}</h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400">{item.desc}</p>
                </div>
              ))}
            </div>

            <Button
              onClick={handleStartDiscovery}
              size="lg"
              variant="primary"
              className="gap-2 mx-auto"
            >
              <Sparkles className="w-5 h-5" />
              Start Career Discovery
              <ArrowRight className="w-5 h-5" />
            </Button>
          </motion.div>
        )}
      </div>
    </div>
  );
};

export default CareerFlowHome;
