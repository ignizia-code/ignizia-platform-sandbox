'use client';

import React, { useState, useEffect, createContext, useContext, ReactNode } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { UserRole, Timeframe, DashboardView, MainSection } from '@/types';

interface DashboardContextType {
  userRole: UserRole | null;
  setUserRole: (role: UserRole | null) => void;
  loggedEmployee: { id: string; name: string; roleName?: string } | null;
  setLoggedEmployee: (employee: { id: string; name: string; roleName?: string } | null) => void;
  isDarkMode: boolean;
  toggleDarkMode: () => void;
  timeframe: Timeframe;
  setTimeframe: (timeframe: Timeframe) => void;
  view: DashboardView;
  setView: (view: DashboardView) => void;
  isSidebarCollapsed: boolean;
  toggleSidebar: () => void;
  handleLogout: () => void;
  currentSection: MainSection;
  selectedPortalApp: string | null;
  setSelectedPortalApp: (appId: string | null) => void;
  selectedFactoryCortexApp: string | null;
  setSelectedFactoryCortexApp: (appId: string | null) => void;
  selectedIgniteApp: string | null;
  setSelectedIgniteApp: (appId: string | null) => void;
  selectedGovernanceApp: string | null;
  setSelectedGovernanceApp: (appId: string | null) => void;
}

const DashboardContext = createContext<DashboardContextType | undefined>(undefined);

export function useDashboard() {
  const context = useContext(DashboardContext);
  if (context === undefined) {
    throw new Error('useDashboard must be used within a DashboardProvider');
  }
  return context;
}

interface DashboardProviderProps {
  children: ReactNode;
}

export function DashboardProvider({ children }: DashboardProviderProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [userRole, setUserRoleState] = useState<UserRole | null>(null);
  const [loggedEmployee, setLoggedEmployeeState] = useState<{ id: string; name: string; roleName?: string } | null>(null);
  const setUserRole = (role: UserRole | null) => {
    setUserRoleState(role);
    try {
      if (role) {
        localStorage.setItem('userRole', role);
      } else {
        localStorage.removeItem('userRole');
      }
    } catch {
      // ignore
    }
  };
  const setLoggedEmployee = (employee: { id: string; name: string; roleName?: string } | null) => {
    setLoggedEmployeeState(employee);
    try {
      if (employee) {
        localStorage.setItem('loggedEmployee', JSON.stringify(employee));
        localStorage.setItem('loggedEmployeeId', employee.id);
      } else {
        localStorage.removeItem('loggedEmployee');
        localStorage.removeItem('loggedEmployeeId');
      }
    } catch {
      // ignore
    }
  };
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [timeframe, setTimeframe] = useState<Timeframe>('Week');
  const [view, setView] = useState<DashboardView>('Dashboard');
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [selectedPortalApp, setSelectedPortalApp] = useState<string | null>('talent-studio');
  const [selectedFactoryCortexApp, setSelectedFactoryCortexApp] = useState<string | null>('control-tower');
  const [selectedIgniteApp, setSelectedIgniteApp] = useState<string | null>('exotwin');
  const [selectedGovernanceApp, setSelectedGovernanceApp] = useState<string | null>('registry');

  // Hydrate user role from localStorage on dashboard routes so leadership gating works.
  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      const saved = localStorage.getItem('userRole') as UserRole | null;
      if (saved) {
        setUserRoleState(saved);
      }
      const savedEmployee = localStorage.getItem('loggedEmployee');
      if (savedEmployee) {
        setLoggedEmployeeState(JSON.parse(savedEmployee) as { id: string; name: string; roleName?: string });
      }
    } catch {
      // ignore
    }
  }, []);

  // Determine current section based on pathname
  const getCurrentSection = (): MainSection => {
    const lowerPath = pathname.toLowerCase();
    if (lowerPath.startsWith('/dashboard/career-flow')) return 'CareerFlow';
    if (lowerPath.startsWith('/dashboard/portal')) return 'LivingOps';
    if (lowerPath.startsWith('/dashboard/community')) return 'Community';
    if (lowerPath.startsWith('/dashboard/analytics')) return 'Analytics';
    if (lowerPath.startsWith('/dashboard/learning-hub')) return 'LearningHub';
    if (lowerPath.startsWith('/dashboard/team-pulse')) return 'TeamPulse';
    if (lowerPath.startsWith('/dashboard/governance-studio')) return 'IntelligenceGovernanceStudio';
    if (lowerPath.startsWith('/dashboard/governance')) return 'Governance';
    if (lowerPath.startsWith('/dashboard/ignite')) return 'IgniteIntelligenceStudio';
    if (lowerPath.startsWith('/omniverse')) return 'Omniverse';
    if (lowerPath.startsWith('/dashboard')) return 'FactoryCortexStudio';
    return 'FactoryCortexStudio';
  };

  const currentSection = getCurrentSection();

  const toggleDarkMode = () => {
    setIsDarkMode(!isDarkMode);
    document.documentElement.classList.toggle('dark');
  };

  const handleLogout = () => {
    setUserRole(null);
    setLoggedEmployee(null);
    try {
      localStorage.removeItem('userRole');
      localStorage.removeItem('loggedEmployee');
      localStorage.removeItem('loggedEmployeeId');
    } catch {
      // ignore
    }
    router.push('/');
  };

  const toggleSidebar = () => {
    setIsSidebarCollapsed(!isSidebarCollapsed);
  };

  const contextValue: DashboardContextType = {
    userRole,
    setUserRole,
    loggedEmployee,
    setLoggedEmployee,
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
  };

  return (
    <DashboardContext.Provider value={contextValue}>
      {children}
    </DashboardContext.Provider>
  );
}
