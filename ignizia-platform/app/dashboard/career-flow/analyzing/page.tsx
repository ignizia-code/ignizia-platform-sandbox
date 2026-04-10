'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { useCareer } from '@/lib/career-flow/context/CareerContext';
import { suggestCareerRoles } from '@/lib/career-flow/actions/ai';
import { Brain, Compass, Target, Sparkles, TrendingUp, Users } from 'lucide-react';

const statusMessages = [
  { icon: Brain, text: 'Analyzing your skills and experience...' },
  { icon: Compass, text: 'Mapping your profile to 50,000+ career paths...' },
  { icon: Target, text: 'Identifying high-potential opportunities...' },
  { icon: Users, text: 'Comparing with successful career transitions...' },
  { icon: TrendingUp, text: 'Forecasting market demand and growth...' },
  { icon: Sparkles, text: 'Crafting your personalized recommendations...' },
];

export default function AnalyzingPage() {
  const router = useRouter();
  const { profile, setSuggestedRoles } = useCareer();
  const [currentStatus, setCurrentStatus] = useState(0);
  const [isComplete, setIsComplete] = useState(false);

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentStatus((prev) => {
        if (prev >= statusMessages.length - 1) {
          return prev;
        }
        return prev + 1;
      });
    }, 1500);

    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const analyzeProfile = async () => {
      const result = await suggestCareerRoles(profile);
      if (result.success) {
        setSuggestedRoles(result.roles);
        setIsComplete(true);
        setTimeout(() => {
          router.push('/dashboard/career-flow/results');
        }, 1000);
      }
    };

    analyzeProfile();
  }, [profile, setSuggestedRoles, router]);

  return (
    <div className="min-h-screen bg-[#FAFAFA] flex items-center justify-center p-4">
      <div className="text-center max-w-2xl">
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="relative mb-12"
        >
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 20, repeat: Infinity, ease: 'linear' }}
            className="absolute inset-0 flex items-center justify-center"
          >
            <div className="w-48 h-48 border-2 border-dashed border-[#089DCD]/20 rounded-full" />
          </motion.div>
          <motion.div
            animate={{ rotate: -360 }}
            transition={{ duration: 15, repeat: Infinity, ease: 'linear' }}
            className="absolute inset-0 flex items-center justify-center"
          >
            <div className="w-36 h-36 border-2 border-dashed border-[#259F67]/20 rounded-full" />
          </motion.div>
          <motion.div
            animate={{ scale: [1, 1.1, 1] }}
            transition={{ duration: 2, repeat: Infinity }}
            className="w-24 h-24 bg-gradient-to-br from-[#089DCD] to-[#259F67] rounded-2xl mx-auto flex items-center justify-center shadow-lg shadow-[#089DCD]/20"
          >
            <Sparkles className="w-12 h-12 text-white" />
          </motion.div>
        </motion.div>

        <AnimatePresence mode="wait">
          <motion.div
            key={isComplete ? 'complete' : currentStatus}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="space-y-4"
          >
            {isComplete ? (
              <>
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  className="w-16 h-16 bg-[#259F67] rounded-full mx-auto flex items-center justify-center"
                >
                  <Target className="w-8 h-8 text-white" />
                </motion.div>
                <h2 className="text-3xl font-bold text-gray-900">Analysis Complete!</h2>
                <p className="text-gray-600">Your personalized career paths are ready.</p>
              </>
            ) : (
              <>
                <h2 className="text-3xl font-bold text-gray-900">Analyzing Your Profile</h2>
                <div className="h-20 flex items-center justify-center">
                  {statusMessages.map((status, index) => {
                    const Icon = status.icon;
                    const isActive = index === currentStatus;
                    const isPast = index < currentStatus;
                    
                    return (
                      <motion.div
                        key={index}
                        initial={false}
                        animate={{
                          opacity: isActive ? 1 : isPast ? 0.3 : 0,
                          scale: isActive ? 1 : 0.9,
                          x: isActive ? 0 : isPast ? -20 : 20,
                        }}
                        className={`absolute flex items-center gap-3 ${isActive ? 'block' : 'hidden'}`}
                      >
                        <Icon className={`w-6 h-6 ${isActive ? 'text-[#089DCD]' : 'text-gray-400'}`} />
                        <span className="text-lg text-gray-700">{status.text}</span>
                      </motion.div>
                    );
                  })}
                </div>
              </>
            )}
          </motion.div>
        </AnimatePresence>

        {!isComplete && (
          <div className="mt-8 flex justify-center gap-2">
            {statusMessages.map((_, index) => (
              <motion.div
                key={index}
                className={`h-1 rounded-full transition-all ${
                  index <= currentStatus ? 'bg-[#089DCD] w-8' : 'bg-gray-200 w-2'
                }`}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
