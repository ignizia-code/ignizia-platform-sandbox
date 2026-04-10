'use client';

import React, { Suspense } from 'react';
import { motion } from 'framer-motion';
import { useRouter } from 'next/navigation';
import Sidebar from '@/components/layout/Sidebar';
import Header from '@/components/layout/Header';
import ChatBot from '@/components/chat/ChatBot';
import { DashboardProvider, useDashboard } from './DashboardContext';
import { MainSection } from '@/types';

const easeOutExpo = [0.22, 1, 0.36, 1] as const;

function DashboardLayoutContent({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const {
    userRole,
    isDarkMode,
    toggleDarkMode,
    timeframe,
    setTimeframe,
    view,
    setView,
    isSidebarCollapsed,
    toggleSidebar,
    handleLogout,
    currentSection,
    selectedPortalApp,
    setSelectedPortalApp,
    selectedFactoryCortexApp,
    setSelectedFactoryCortexApp,
    selectedIgniteApp,
    setSelectedIgniteApp,
    selectedGovernanceApp,
    setSelectedGovernanceApp,
  } = useDashboard();

  const handleSectionChange = (section: MainSection) => {
    const routes: Record<MainSection, string> = {
      Dashboard: '/dashboard',
      LivingOps: '/dashboard/portal',
      Community: '/dashboard/community',
      Analytics: '/dashboard/analytics',
      LearningHub: '/dashboard/learning-hub',
      TeamPulse: '/dashboard/team-pulse',
      Governance: '/dashboard/governance',
      Omniverse: '/Omniverse',
      CareerFlow: '/dashboard/career-flow',
      FactoryCortexStudio: '/dashboard',
      IgniteIntelligenceStudio: '/dashboard/ignite',
      IntelligenceGovernanceStudio: '/dashboard/governance-studio',
    };
    router.push(routes[section]);
  };

  return (
    <div className={`flex h-screen overflow-hidden ${isDarkMode ? 'dark' : ''}`}>
      <motion.div
        initial={{ x: -280, opacity: 0 }}
        animate={{ x: 0, opacity: 1 }}
        transition={{ duration: 0.5, delay: 0.1, ease: easeOutExpo }}
      >
        <Sidebar
          currentSection={currentSection}
          onSectionChange={handleSectionChange}
          isCollapsed={isSidebarCollapsed}
          onToggleCollapse={toggleSidebar}
          userRole={userRole}
          selectedPortalApp={selectedPortalApp}
          onPortalAppChange={setSelectedPortalApp}
          selectedFactoryCortexApp={selectedFactoryCortexApp}
          onFactoryCortexAppChange={setSelectedFactoryCortexApp}
          selectedIgniteApp={selectedIgniteApp}
          onIgniteAppChange={setSelectedIgniteApp}
          selectedGovernanceApp={selectedGovernanceApp}
          onGovernanceAppChange={setSelectedGovernanceApp}
        />
      </motion.div>
      <div className="flex-1 flex flex-col min-w-0 bg-background-light dark:bg-background-dark transition-colors duration-300">
        <motion.div
          initial={{ y: -60, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.4, delay: 0.2, ease: easeOutExpo }}
        >
          <Suspense fallback={<div className="h-14 shrink-0 bg-background-light dark:bg-background-dark border-b border-slate-200 dark:border-slate-700" />}>
            <Header
              onToggleDarkMode={toggleDarkMode}
              isDarkMode={isDarkMode}
              userRole={userRole || 'Leather Cutter'}
              onLogout={handleLogout}
              timeframe={timeframe}
              onTimeframeChange={setTimeframe}
              view={view}
              onViewChange={setView}
              mainSection={currentSection}
              selectedPortalApp={selectedPortalApp}
              onPortalAppChange={setSelectedPortalApp}
              selectedFactoryCortexApp={selectedFactoryCortexApp}
            />
          </Suspense>
        </motion.div>
        <motion.main
          className="flex-1 relative min-h-0 overflow-y-auto"
          initial={{ opacity: 0, scale: 0.98 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5, delay: 0.35, ease: 'easeOut' }}
        >
          {children}
        </motion.main>
      </div>
      <ChatBot
        timeframe={timeframe}
        view={view}
        mainSection={currentSection}
        portalApp={selectedPortalApp}
      />
    </div>
  );
}

export default function DashboardLayout({ 
  children 
}: { 
  children: React.ReactNode 
}) {
  return (
    <DashboardProvider>
      <DashboardLayoutContent>
        {children}
      </DashboardLayoutContent>
    </DashboardProvider>
  );
}
