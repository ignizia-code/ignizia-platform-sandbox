'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { useCareer } from '@/lib/career-flow/context/CareerContext';
import RoleDetailsSidebar from '@/components/features/career-flow/RoleDetailsSidebar';
import { Sparkles, ArrowRight, TrendingUp, Zap, Compass } from 'lucide-react';

const categoryConfig = {
  adjacent: {
    label: 'Adjacent Paths',
    description: 'Natural next steps from your current role',
    color: '#CD9319',
    icon: TrendingUp,
  },
  stretch: {
    label: 'Stretch Goals',
    description: 'Ambitious moves requiring new skills',
    color: '#089DCD',
    icon: Zap,
  },
  wildcard: {
    label: 'Wildcards',
    description: 'Creative pivots leveraging your strengths',
    color: '#BA2C69',
    icon: Compass,
  },
};

export default function DashboardPage() {
  const router = useRouter();
  const { profile, suggestedRoles, setSelectedRole } = useCareer();

  useEffect(() => {
    if (suggestedRoles.length === 0) {
      router.push('/dashboard/career-flow/onboarding');
    }
  }, [suggestedRoles, router]);

  const handleRoleClick = (role: typeof suggestedRoles[0]) => {
    setSelectedRole(role);
  };

  const groupedRoles = {
    adjacent: suggestedRoles.filter(r => r.category === 'adjacent'),
    stretch: suggestedRoles.filter(r => r.category === 'stretch'),
    wildcard: suggestedRoles.filter(r => r.category === 'wildcard'),
  };

  if (suggestedRoles.length === 0) {
    return null;
  }

  return (
    <>
      <RoleDetailsSidebar />
    <div className="min-h-screen bg-[#FAFAFA]">
      <header className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 bg-gradient-to-br from-[#089DCD] to-[#259F67] rounded-xl flex items-center justify-center">
              <Sparkles className="w-5 h-5 text-white" />
            </div>
            <h1 className="text-xl font-bold text-gray-900">CareerFlow</h1>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-sm text-gray-600">Hello, {profile.name}</span>
            <button
              onClick={() => router.push('/dashboard/career-flow/onboarding')}
              className="text-sm text-[#089DCD] hover:underline"
            >
              Edit Profile
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-12"
        >
          <h2 className="text-4xl font-bold text-gray-900 mb-4">
            Your Career Opportunities
          </h2>
          <p className="text-lg text-gray-600 max-w-2xl">
            Based on your profile as a <span className="font-semibold text-gray-900">{profile.currentTitle}</span> with{' '}
            <span className="font-semibold text-gray-900">{profile.yearsOfExperience} years</span> of experience
            {profile.interests && profile.interests.length > 0 && (
              <>
                , interested in{' '}
                <span className="font-semibold text-[#BA2C69]">
                  {profile.interests.slice(0, 3).join(', ')}
                  {profile.interests.length > 3 && ` +${profile.interests.length - 3} more`}
                </span>
              </>
            )},
            we've identified these personalized paths for you.
          </p>
        </motion.div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {(Object.keys(groupedRoles) as Array<keyof typeof groupedRoles>).map((category, categoryIndex) => {
            const config = categoryConfig[category];
            const Icon = config.icon;
            const roles = groupedRoles[category];

            return (
              <motion.div
                key={category}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: categoryIndex * 0.1 }}
                className="space-y-4"
              >
                <div className="flex items-center gap-3 mb-6">
                  <div
                    className="w-10 h-10 rounded-xl flex items-center justify-center"
                    style={{ backgroundColor: `${config.color}15` }}
                  >
                    <Icon className="w-5 h-5" style={{ color: config.color }} />
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900">{config.label}</h3>
                    <p className="text-sm text-gray-500">{config.description}</p>
                  </div>
                </div>

                <div className="space-y-4">
                  {roles.map((role, roleIndex) => (
                    <motion.button
                      key={role.id}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: categoryIndex * 0.1 + roleIndex * 0.05 }}
                      onClick={() => handleRoleClick(role)}
                      className="w-full text-left bg-white rounded-2xl p-6 shadow-sm hover:shadow-lg border border-gray-100 transition-all group"
                    >
                      <div className="flex items-start justify-between mb-3">
                        <h4 className="font-semibold text-gray-900 text-lg group-hover:text-[#089DCD] transition-colors">
                          {role.title}
                        </h4>
                        <div
                          className="px-3 py-1 rounded-full text-sm font-medium"
                          style={{
                            backgroundColor: `${config.color}15`,
                            color: config.color,
                          }}
                        >
                          {role.matchScore}% Match
                        </div>
                      </div>
                      <p className="text-gray-600 text-sm leading-relaxed mb-4">
                        {role.reasoning}
                      </p>
                      <div className="flex items-center text-[#089DCD] text-sm font-medium">
                        Explore Path
                        <ArrowRight className="w-4 h-4 ml-1 group-hover:translate-x-1 transition-transform" />
                      </div>
                    </motion.button>
                  ))}
                </div>
              </motion.div>
            );
          })}
        </div>
      </main>
    </div>
    </>
  );
}
