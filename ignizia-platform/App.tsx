'use client';

import React, { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';
import { usePathname, useRouter } from 'next/navigation';
import Sidebar from './components/layout/Sidebar';
import LeadershipDashboard from './components/features/governance/LeadershipDashboard';
import Header from './components/layout/Header';
import Dashboard from './components/features/dashboard/Dashboard';
import LoginPage from './components/features/auth/LoginPage';
import ChatBot from './components/chat/ChatBot';
import PortalPage from './components/features/portal/PortalPage';
import CommunityPage from './components/features/community/CommunityPage';
import { UserRole, User, Timeframe, DashboardView, MainSection } from './types';

const OmniverseViewerPage = dynamic(
  () => import('./components/omniverse/OmniverseViewerPage'),
  { ssr: false, loading: () => <div className="flex items-center justify-center h-full text-slate-500">Loading Omniverse…</div> }
);

function PlaceholderPage({ title }: { title: string }) {
  return (
    <div className="p-8">
      <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">{title}</h2>
      <p className="text-slate-500 dark:text-slate-400">This page is a placeholder. Content coming soon.</p>
    </div>
  );
}

const App: React.FC = () => {
  const pathname = usePathname();
  const router = useRouter();
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [userRole, setUserRole] = useState<UserRole | null>(null);
  const [hydrated, setHydrated] = useState(false);
  const [timeframe, setTimeframe] = useState<Timeframe>('Week');
  const [view, setView] = useState<DashboardView>('Dashboard');
  const [section, setSection] = useState<MainSection>('FactoryCortexStudio');
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [selectedPortalApp, setSelectedPortalApp] = useState<string | null>(null);
  const [selectedFactoryCortexApp, setSelectedFactoryCortexApp] = useState<string | null>('control-tower');
  const [selectedIgniteApp, setSelectedIgniteApp] = useState<string | null>(null);
  const [selectedGovernanceApp, setSelectedGovernanceApp] = useState<string | null>(null);

  const isOmniverseRoute = pathname === '/Omniverse';
  const currentSection: MainSection = isOmniverseRoute ? 'Omniverse' : section;

  useEffect(() => {
    try {
      const savedRole = localStorage.getItem('userRole') as UserRole | null;
      if (savedRole) setUserRole(savedRole);
    } catch {
      // ignore
    }
    setHydrated(true);
  }, []);

  const handleSectionChange = (newSection: MainSection) => {
    setSection(newSection);
    if (newSection === 'Omniverse') {
      router.push('/Omniverse');
    } else if (newSection === 'CareerFlow') {
      router.push('/dashboard/career-flow');
    } else if (newSection === 'LivingOps') {
      router.push('/dashboard/portal');
    } else if (newSection === 'Community') {
      router.push('/dashboard/community');
    } else if (newSection === 'Analytics') {
      router.push('/dashboard/analytics');
    } else if (newSection === 'LearningHub') {
      router.push('/dashboard/learning-hub');
    } else if (newSection === 'TeamPulse') {
      router.push('/dashboard/team-pulse');
    } else if (newSection === 'Governance') {
      router.push('/dashboard/governance');
    } else if (newSection === 'FactoryCortexStudio') {
      router.push('/dashboard');
    } else if (newSection === 'IgniteIntelligenceStudio') {
      router.push('/dashboard/ignite');
    } else if (newSection === 'IntelligenceGovernanceStudio') {
      router.push('/dashboard/governance-studio');
    } else {
      router.push('/');
    }
  };

  const toggleDarkMode = () => {
    setIsDarkMode(!isDarkMode);
    document.documentElement.classList.toggle('dark');
  };

  const handleLogin = (
    user: User,
    employee: { id: string; name: string; roleName: string }
  ) => {
    setUserRole(user.role);
    try {
      localStorage.setItem('userRole', user.role);
      localStorage.setItem('loggedEmployee', JSON.stringify(employee));
      localStorage.setItem('loggedEmployeeId', employee.id);
    } catch {
      // ignore
    }
    router.push('/dashboard');
  };

  const handleLogout = () => {
    setUserRole(null);
    try {
      localStorage.removeItem('userRole');
      localStorage.removeItem('loggedEmployee');
      localStorage.removeItem('loggedEmployeeId');
    } catch {
      // ignore
    }
  };

  if (!hydrated) return null;

  if (!userRole) {
    return <LoginPage onLogin={handleLogin} />;
  }

  const renderMainContent = () => {
    switch (section) {
      case 'LivingOps':
        return <PortalPage userRole={userRole} selectedAppId={selectedPortalApp ?? 'talent-studio'} />;
      case 'FactoryCortexStudio':
        if (selectedFactoryCortexApp === 'control-tower') {
          return <Dashboard timeframe={timeframe} view={view} userRole={userRole} />;
        }
        return <PlaceholderPage title={selectedFactoryCortexApp ?? 'FactoryCortex Studio'} />;
      case 'IgniteIntelligenceStudio':
        return <PlaceholderPage title={selectedIgniteApp ?? 'Ignite Intelligence Studio'} />;
      case 'IntelligenceGovernanceStudio':
        return <PlaceholderPage title={selectedGovernanceApp ?? 'Intelligence Governance Studio'} />;
      case 'Dashboard':
        return <Dashboard timeframe={timeframe} view={view} userRole={userRole} />;
      case 'Community':
        return <CommunityPage userRole={userRole} />;
      case 'Analytics':
        return (
          <div className="p-8">
            <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">Analytics</h2>
            <p className="text-slate-500 dark:text-slate-400">
              Analytics view is not yet configured. This is a placeholder.
            </p>
          </div>
        );
      case 'LearningHub':
        return (
          <div className="p-8">
            <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">Learning Hub</h2>
            <p className="text-slate-500 dark:text-slate-400">
              Learning Hub content will appear here.
            </p>
          </div>
        );
      case 'TeamPulse':
        return (
          <div className="p-8">
            <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">Team Pulse</h2>
            <p className="text-slate-500 dark:text-slate-400">
              Team Pulse metrics will be shown on this page.
            </p>
          </div>
        );
      case 'Governance':
        return <LeadershipDashboard />;
      case 'Omniverse':
        return <OmniverseViewerPage />;
      default:
        return <Dashboard timeframe={timeframe} view={view} userRole={userRole} />;
    }
  };

  return (
    <div className={`flex h-screen overflow-hidden ${isDarkMode ? 'dark' : ''} animate-in fade-in duration-700`}>
      <Sidebar
        currentSection={currentSection}
        onSectionChange={handleSectionChange}
        isCollapsed={isSidebarCollapsed}
        onToggleCollapse={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
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
      <div className="flex-1 flex flex-col min-w-0 bg-background-light dark:bg-background-dark transition-colors duration-300">
        <Header 
          onToggleDarkMode={toggleDarkMode} 
          isDarkMode={isDarkMode} 
          userRole={userRole}
          onLogout={handleLogout}
          timeframe={timeframe}
          onTimeframeChange={setTimeframe}
          view={view}
          onViewChange={setView}
          mainSection={currentSection}
        />
        <main className={`flex-1 relative min-h-0 ${isOmniverseRoute ? 'overflow-hidden' : 'overflow-y-auto'}`}>
          {/* Always keep Omniverse stream mounted so commands from Strategy Studio etc. can be sent */}
          <div
            className={isOmniverseRoute ? 'absolute inset-0 z-0' : 'absolute inset-0 -z-10 overflow-hidden'}
            style={{ visibility: isOmniverseRoute ? 'visible' : 'hidden', pointerEvents: isOmniverseRoute ? 'auto' : 'none' }}
            aria-hidden={!isOmniverseRoute}
          >
            <OmniverseViewerPage />
          </div>
          {!isOmniverseRoute && renderMainContent()}
        </main>
      </div>
      <ChatBot
        timeframe={timeframe}
        view={view}
        mainSection={currentSection}
        portalApp={selectedPortalApp}
      />
    </div>
  );
};

export default App;
