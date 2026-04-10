'use client';

import React, { useState, useRef, useEffect } from 'react';
import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import { UserRole, Timeframe, DashboardView, MainSection } from '@/types';
import TimeframeSelector from '@/components/ui/TimeframeSelector';
import ViewSelector from '@/components/ui/ViewSelector';
import { AskIgniziaSimulation } from '@/components/features/dashboard/shared';

const LIVINGOPS_APPS: { id: string; label: string }[] = [
  { id: 'talent-studio', label: 'Talent Studio' },
  { id: 'strategy-studio', label: 'Strategy Studio' },
  { id: 'agent-studio', label: 'Agent Studio' },
  { id: 'workbench', label: 'Workbench' },
  { id: 'workflow', label: 'Workflow Builder' },
  { id: 'enterprise-design-studio', label: 'Enterprise Design Studio' },
  { id: 'intelligence', label: 'Intelligence' },
  { id: 'foundry', label: 'Foundry' },
  { id: 'safe-ai-governance', label: 'Safe AI Governance' },
];

const TALENT_STUDIO_VIEWS = [
  { id: 'expert' as const, label: 'Expert Suite' },
];

interface HeaderProps {
  onToggleDarkMode: () => void;
  isDarkMode: boolean;
  userRole: UserRole;
  onLogout: () => void;
  timeframe: Timeframe;
  onTimeframeChange: (timeframe: Timeframe) => void;
  view: DashboardView;
  onViewChange: (view: DashboardView) => void;
  mainSection: MainSection;
  selectedPortalApp?: string | null;
  onPortalAppChange?: (appId: string) => void;
  selectedFactoryCortexApp?: string | null;
}

const Header: React.FC<HeaderProps> = ({
  onToggleDarkMode,
  isDarkMode,
  userRole,
  onLogout,
  timeframe,
  onTimeframeChange,
  view,
  onViewChange,
  mainSection,
  selectedPortalApp = null,
  onPortalAppChange,
  selectedFactoryCortexApp = null,
}) => {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [portalAppDropdownOpen, setPortalAppDropdownOpen] = useState(false);
  const [portalViewDropdownOpen, setPortalViewDropdownOpen] = useState(false);
  const portalAppDropdownRef = useRef<HTMLDivElement>(null);
  const portalViewDropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;
      const inAppDropdown = portalAppDropdownRef.current?.contains(target);
      const inViewDropdown = portalViewDropdownRef.current?.contains(target);
      if (!inAppDropdown) setPortalAppDropdownOpen(false);
      if (!inViewDropdown) setPortalViewDropdownOpen(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const titleBySection: Record<MainSection, string> = {
    Dashboard: 'Control Tower',
    LivingOps: 'LivingOps',
    Community: 'Community',
    Analytics: 'Analytics',
    LearningHub: 'Learning Hub',
    TeamPulse: 'Team Pulse',
    Governance: 'Leadership Dashboard',
    Omniverse: 'Omniverse',
    CareerFlow: 'Career Flow',
    FactoryCortexStudio: 'FactoryCortex Studio',
    IgniteIntelligenceStudio: 'Ignite Intelligence Studio',
    IntelligenceGovernanceStudio: 'Intelligence Governance Studio',
  };

  const subtitleBySection: Record<MainSection, string> = {
    Dashboard: 'Monitoring site cohesion and readiness metrics.',
    LivingOps: 'Gateway to tools, links, and experiences across your ecosystem.',
    Community: 'Discussions and collective intelligence.',
    Analytics: 'Deep-dive into performance, patterns, and leading indicators.',
    LearningHub: 'Track capability building, learning journeys, and impact.',
    TeamPulse: 'Follow sentiment, trust, and human signals across the floor.',
    Governance: 'Governance, compliance, and approval oversight.',
    Omniverse: '3D visualization and simulation.',
    CareerFlow: 'AI-powered career path discovery and personalized roadmaps.',
    FactoryCortexStudio: 'Digitizer, Live Twin, Orchestrator, Control Tower.',
    IgniteIntelligenceStudio: 'ExoTwin, Academy, Exchange.',
    IntelligenceGovernanceStudio: 'Registry, Standards, Controls, Assurance.',
  };

  const title = titleBySection[mainSection];
  const subtitle = subtitleBySection[mainSection];

  const isLivingOps = mainSection === 'LivingOps';
  const portalAppFromUrl = searchParams?.get('app');
  const effectivePortalApp = portalAppFromUrl ?? selectedPortalApp ?? 'talent-studio';
  const portalAppLabel = LIVINGOPS_APPS.find((a) => a.id === effectivePortalApp)?.label ?? effectivePortalApp;
  const portalViewParam = searchParams?.get('view') ?? 'control';
  const portalViewLabel = TALENT_STUDIO_VIEWS.find((v) => v.id === portalViewParam)?.label ?? TALENT_STUDIO_VIEWS[0].label;

  const setPortalApp = (appId: string) => {
    onPortalAppChange?.(appId);
    const params = new URLSearchParams();
    params.set('app', appId);
    if (appId === 'talent-studio') params.set('view', 'expert');
    router.push(`/dashboard/portal?${params.toString()}`);
    setPortalAppDropdownOpen(false);
  };

  const setPortalView = (viewId: string) => {
    const params = new URLSearchParams(searchParams?.toString() ?? '');
    params.set('view', viewId);
    router.push(`${pathname ?? '/dashboard/portal'}?${params.toString()}`);
    setPortalViewDropdownOpen(false);
  };

  return (
    <header className="h-20 flex-shrink-0 flex items-center justify-between px-8 bg-white/90 dark:bg-slate-900/90 backdrop-blur-xl z-10 border-b border-slate-200/50 dark:border-slate-800/50 sticky top-0">
      <div className="flex-shrink-0">
        {isLivingOps ? (
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xl font-bold text-slate-900 dark:text-white tracking-tight">LivingOps</span>
            <>
              <span className="text-slate-400 dark:text-slate-500" aria-hidden>›</span>
              <div className="relative" ref={portalAppDropdownRef}>
                  <button
                    type="button"
                    onClick={() => setPortalAppDropdownOpen((o) => !o)}
                    className="flex items-center gap-1.5 text-xl font-bold text-slate-900 dark:text-white tracking-tight hover:text-primary dark:hover:text-primary transition-colors cursor-pointer"
                  >
                    {portalAppLabel}
                    <svg
                      className={`w-4 h-4 text-slate-500 dark:text-slate-400 transition-transform ${portalAppDropdownOpen ? 'rotate-180' : ''}`}
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </button>
                  {portalAppDropdownOpen && (
                    <div className="absolute top-full mt-1 left-0 bg-white dark:bg-slate-800 rounded-lg shadow-lg border border-slate-200 dark:border-slate-700 overflow-hidden z-50 min-w-[11rem]">
                      {LIVINGOPS_APPS.map((app) => (
                        <button
                          key={app.id}
                          type="button"
                          onClick={() => setPortalApp(app.id)}
                          className={`w-full px-3 py-2 text-left text-sm font-medium transition-colors ${
                            effectivePortalApp === app.id
                              ? 'bg-action text-white'
                              : 'text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700/60'
                          }`}
                        >
                          {app.label}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
            </>
            {effectivePortalApp === 'talent-studio' && (
              <>
                <span className="text-slate-400 dark:text-slate-500" aria-hidden>›</span>
                <span className="text-xl font-bold text-slate-900 dark:text-white tracking-tight">Expert Suite</span>
              </>
            )}
          </div>
        ) : (
          <>
            <div className="flex items-center gap-4 flex-1 min-w-0">
              <div className="flex items-center gap-2 shrink-0">
                <h1 className="text-xl font-bold text-slate-900 dark:text-white tracking-tight">
                  {title}
                </h1>
                <span className="px-2 py-0.5 bg-slate-100 dark:bg-slate-800 text-[10px] font-bold text-slate-500 dark:text-slate-400 rounded-md uppercase tracking-wider border border-slate-200 dark:border-slate-700">
                  {userRole}
                </span>
              </div>
              {mainSection === 'FactoryCortexStudio' && selectedFactoryCortexApp === 'control-tower' && (
                <AskIgniziaSimulation />
              )}
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 font-medium">
              {subtitle}
            </p>
          </>
        )}
      </div>
      
      <div className="flex items-center gap-4">
        {/* Global Controls Group */}
        <div className="flex items-center bg-white/30 dark:bg-slate-900/30 p-1 rounded-full">
          {(mainSection === 'Dashboard' || mainSection === 'FactoryCortexStudio') && (
            <>
              <ViewSelector current={view} onChange={onViewChange} />
              <TimeframeSelector current={timeframe} onChange={onTimeframeChange} />
            </>
          )}

          {/* <div className="relative group hidden lg:block ml-3">
            <span className="material-icons-round absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 text-[18px] group-focus-within:text-slate-600 dark:group-focus-within:text-slate-300 transition-colors">search</span>
            <input
              className="pl-11 pr-5 py-2 rounded-full border-none bg-slate-100 dark:bg-slate-800/60 text-[13px] focus:ring-2 focus:ring-slate-200 dark:focus:ring-slate-700 outline-none w-56 transition-all placeholder:text-slate-500 text-slate-700 dark:text-slate-200 shadow-[inset_0_1px_2px_rgba(0,0,0,0.03)]"
              placeholder="Search..."
              type="text"
            />
          </div> */}
        </div>

        <div className="flex items-center gap-2 border-l border-slate-200 dark:border-slate-700 pl-4">
          <button 
            onClick={onToggleDarkMode}
            className="py-2 px-3 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 bg-white dark:bg-slate-800 rounded-full border border-slate-200 dark:border-slate-700 hover:shadow-md transition-all active:scale-90"
            title="Toggle Theme"
          >
            <span className="material-icons-round text-xl">{isDarkMode ? 'light_mode' : 'dark_mode'}</span>
          </button>

          <button 
            onClick={onLogout}
            className="py-2 px-3 text-slate-400 hover:text-danger dark:hover:text-danger bg-white dark:bg-slate-800 rounded-full border border-slate-200 dark:border-slate-700 hover:shadow-md transition-all active:scale-90"
            title="Logout"
          >
            <span className="material-icons-round text-xl">logout</span>
          </button>
          
          <div className="w-10 h-10 rounded-full bg-action/10 ring-2 ring-white dark:ring-slate-800 flex items-center justify-center overflow-hidden shadow-sm cursor-pointer border border-slate-200 dark:border-slate-700 ml-2 hover:scale-105 transition-transform">
            <img
              alt="User Profile"
              className="w-full h-full object-cover"
              src={`https://picsum.photos/seed/${userRole.replace(' ', '')}/100/100`}
            />
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;
