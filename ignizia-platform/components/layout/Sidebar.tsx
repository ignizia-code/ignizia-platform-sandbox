'use client';

import React, { useState, useRef } from 'react';
import { createPortal } from 'react-dom';
import Image from 'next/image';
import { MainSection, UserRole, isLeadershipRole } from '@/types';
import {
  getLivingOpsAppsForRole,
  FACTORYCORTEX_APPS,
  IGNITE_APPS,
  GOVERNANCE_APPS,
} from '@/lib/navigation';
import { getDefaultIgniteAppForRole } from '@/lib/ignite/roleConfig';

interface SidebarProps {
  currentSection: MainSection;
  onSectionChange: (section: MainSection) => void;
  isCollapsed: boolean;
  onToggleCollapse: () => void;
  userRole?: UserRole | null;
  selectedPortalApp: string | null;
  onPortalAppChange: (appId: string | null) => void;
  selectedFactoryCortexApp?: string | null;
  onFactoryCortexAppChange?: (appId: string | null) => void;
  selectedIgniteApp?: string | null;
  onIgniteAppChange?: (appId: string | null) => void;
  selectedGovernanceApp?: string | null;
  onGovernanceAppChange?: (appId: string | null) => void;
}

const Sidebar: React.FC<SidebarProps> = ({
  currentSection,
  onSectionChange,
  isCollapsed,
  onToggleCollapse,
  userRole,
  selectedPortalApp,
  onPortalAppChange,
  selectedFactoryCortexApp = null,
  onFactoryCortexAppChange,
  selectedIgniteApp = null,
  onIgniteAppChange,
  selectedGovernanceApp = null,
  onGovernanceAppChange,
}) => {
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownButtonRef = useRef<HTMLButtonElement | null>(null);
  const [dropdownPosition, setDropdownPosition] = useState<{
    top: number;
    left: number;
    width: number;
  } | null>(null);

  const baseNavItems = [
    { id: 'LivingOps' as MainSection, label: 'LivingOps', icon: 'apps' },
    { id: 'FactoryCortexStudio' as MainSection, label: 'FactoryCortex Studio', icon: 'precision_manufacturing' },
    { id: 'IgniteIntelligenceStudio' as MainSection, label: 'Ignite Intelligence Studio', icon: 'auto_awesome' },
    { id: 'IntelligenceGovernanceStudio' as MainSection, label: 'Intelligence Governance Studio', icon: 'shield' },
    { id: 'Community' as MainSection, label: 'Community', icon: 'forum' },
    { id: 'Analytics' as MainSection, label: 'Analytics', icon: 'analytics' },
    { id: 'TeamPulse' as MainSection, label: 'Team Pulse', icon: 'people' },
    { id: 'CareerFlow' as MainSection, label: 'Career Flow', icon: 'trending_up' },
  ];
  const navItems = isLeadershipRole(userRole ?? ('' as UserRole))
    ? [...baseNavItems, { id: 'Omniverse' as MainSection, label: 'Omniverse', icon: 'view_in_ar' }]
    : [...baseNavItems, { id: 'Omniverse' as MainSection, label: 'Omniverse', icon: 'view_in_ar' }];

  const livingOpsApps = getLivingOpsAppsForRole(userRole ?? null);

  const currentNavItem = navItems.find((item) => item.id === currentSection);

  const handleMainSectionChange = (section: MainSection) => {
    if (section === 'LivingOps') {
      onPortalAppChange('talent-studio');
    } else if (section === 'FactoryCortexStudio') {
      onFactoryCortexAppChange?.('control-tower');
    } else if (section === 'IgniteIntelligenceStudio') {
      onIgniteAppChange?.(getDefaultIgniteAppForRole(userRole ?? null));
    } else if (section === 'IntelligenceGovernanceStudio') {
      onGovernanceAppChange?.('registry');
    } else {
      onPortalAppChange(null);
      onFactoryCortexAppChange?.(null);
      onIgniteAppChange?.(null);
      onGovernanceAppChange?.(null);
    }
    onSectionChange(section);
    setIsDropdownOpen(false);
  };

  return (
    <aside className={`flex-shrink-0 bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 flex flex-col h-screen transition-all duration-300 z-20 ${
      isCollapsed ? 'w-20' : 'w-64'
    }`}>
      <button
        onClick={onToggleCollapse}
        className="h-20 flex items-center justify-center px-4 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors cursor-pointer"
        title={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
      >
        <div className={`flex items-center gap-3 ${isCollapsed ? 'justify-center w-full' : ''}`}>
          <div className="flex items-center gap-2">
            <div className="relative w-12 h-12 rounded-2xl dark:bg-slate-800 flex-shrink-0 overflow-hidden">
              <Image
                src="/ignizia-logo.png"
                alt="IGNIZIA logo"
                fill
                sizes="40px"
                className="object-contain"
              />
            </div>
            {!isCollapsed && (
              <div className="flex flex-col text-left">
                <span className="font-bold text-lg tracking-tight text-slate-900 dark:text-white leading-tight">
                  IGNIZIA
                </span>
                <span className="text-[11px] uppercase tracking-[0.18em] text-slate-400 dark:text-slate-500 leading-tight">
                  Living Intelligence
                </span>
              </div>
            )}
          </div>
        </div>
      </button>
      
      <nav className={`flex-1 py-4 space-y-1 overflow-y-auto ${isCollapsed ? 'px-2' : 'px-4'}`}>
        {/* Main Section Dropdown (works in both expanded and collapsed states) */}
        <div className="relative mb-4">
          <button
            ref={dropdownButtonRef}
            type="button"
            onClick={() => {
              if (isDropdownOpen) {
                setIsDropdownOpen(false);
                setDropdownPosition(null);
              } else {
                if (dropdownButtonRef.current) {
                  const rect = dropdownButtonRef.current.getBoundingClientRect();
                  setDropdownPosition({
                    top: rect.bottom + 4,
                    left: isCollapsed ? rect.right + 8 : rect.left,
                    width: isCollapsed ? 224 : rect.width,
                  });
                }
                setIsDropdownOpen(true);
              }
            }}
            className={`w-full flex items-center px-3 py-3 rounded-lg transition-all ${
              isCollapsed
                ? 'justify-center bg-primary text-white shadow-lg'
                : 'justify-between bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-slate-100 hover:bg-slate-200 dark:hover:bg-slate-700'
            }`}
            title={isCollapsed ? currentNavItem?.label : undefined}
          >
            {isCollapsed ? (
              <span className="material-icons-round text-[20px]">
                {currentNavItem?.icon}
              </span>
            ) : (
              <>
                <div className="flex items-center gap-3">
                  <span className="material-icons-round text-[20px]">
                    {currentNavItem?.icon}
                  </span>
                  <span className="font-medium text-sm">{currentNavItem?.label}</span>
                </div>
                <span className="material-icons-round text-[20px]">
                  {isDropdownOpen ? 'expand_less' : 'expand_more'}
                </span>
              </>
            )}
          </button>
        </div>

        {/* LivingOps Sub-items */}
        {currentSection === 'LivingOps' && (
          <div className="space-y-1 pt-2">
            {!isCollapsed && (
              <div className="px-3 py-2 text-[10px] uppercase tracking-wider text-slate-400 font-bold">
                LivingOps Applications
              </div>
            )}
            {livingOpsApps.map((app) => {
              const isActive = selectedPortalApp === app.id;
              return (
                <button
                  key={app.id}
                  type="button"
                  onClick={() => onPortalAppChange(app.id)}
                  className={`w-full text-left flex items-center ${isCollapsed ? 'justify-center' : 'justify-between'} px-3 py-2.5 rounded-lg transition-all group ${
                    isActive
                      ? 'bg-primary text-white shadow-md'
                      : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-slate-100'
                  }`}
                  title={isCollapsed ? app.name : ''}
                >
                  {isCollapsed ? (
                    <span className="material-icons-round text-[18px] flex-shrink-0">{app.icon}</span>
                  ) : (
                    <>
                      <div className="flex items-center gap-3">
                        <span className="material-icons-round text-[18px] flex-shrink-0">{app.icon}</span>
                        <div className="flex flex-col">
                          <span className="font-medium text-xs">{app.name}</span>
                        </div>
                      </div>
                    </>
                  )}
                </button>
              );
            })}
          </div>
        )}

        {/* FactoryCortex Studio Sub-items */}
        {currentSection === 'FactoryCortexStudio' && (
          <div className="space-y-1 pt-2">
            {!isCollapsed && (
              <div className="px-3 py-2 text-[10px] uppercase tracking-wider text-slate-400 font-bold">
                FactoryCortex Studio
              </div>
            )}
            {FACTORYCORTEX_APPS.map((app) => {
              const isActive = selectedFactoryCortexApp === app.id;
              return (
                <button
                  key={app.id}
                  type="button"
                  onClick={() => onFactoryCortexAppChange?.(app.id)}
                  className={`w-full text-left flex items-center ${isCollapsed ? 'justify-center' : 'justify-between'} px-3 py-2.5 rounded-lg transition-all group ${
                    isActive
                      ? 'bg-primary text-white shadow-md'
                      : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-slate-100'
                  }`}
                  title={isCollapsed ? app.name : ''}
                >
                  {isCollapsed ? (
                    <span className="material-icons-round text-[18px] flex-shrink-0">{app.icon}</span>
                  ) : (
                    <>
                      <div className="flex items-center gap-3">
                        <span className="material-icons-round text-[18px] flex-shrink-0">{app.icon}</span>
                        <div className="flex flex-col">
                          <span className="font-medium text-xs">{app.name}</span>
                        </div>
                      </div>
                    </>
                  )}
                </button>
              );
            })}
          </div>
        )}

        {/* Ignite Intelligence Studio Sub-items */}
        {currentSection === 'IgniteIntelligenceStudio' && (
          <div className="space-y-1 pt-2">
            {!isCollapsed && (
              <div className="px-3 py-2 text-[10px] uppercase tracking-wider text-slate-400 font-bold">
                Ignite Intelligence Studio
              </div>
            )}
            {IGNITE_APPS.map((app) => {
              const isActive = selectedIgniteApp === app.id;
              return (
                <button
                  key={app.id}
                  type="button"
                  onClick={() => onIgniteAppChange?.(app.id)}
                  className={`w-full text-left flex items-center ${isCollapsed ? 'justify-center' : 'justify-between'} px-3 py-2.5 rounded-lg transition-all group ${
                    isActive
                      ? 'bg-primary text-white shadow-md'
                      : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-slate-100'
                  }`}
                  title={isCollapsed ? app.name : ''}
                >
                  {isCollapsed ? (
                    <span className="material-icons-round text-[18px] flex-shrink-0">{app.icon}</span>
                  ) : (
                    <>
                      <div className="flex items-center gap-3">
                        <span className="material-icons-round text-[18px] flex-shrink-0">{app.icon}</span>
                        <div className="flex flex-col">
                          <span className="font-medium text-xs">{app.name}</span>
                        </div>
                      </div>
                    </>
                  )}
                </button>
              );
            })}
          </div>
        )}

        {/* Intelligence Governance Studio Sub-items */}
        {currentSection === 'IntelligenceGovernanceStudio' && (
          <div className="space-y-1 pt-2">
            {!isCollapsed && (
              <div className="px-3 py-2 text-[10px] uppercase tracking-wider text-slate-400 font-bold">
                Intelligence Governance Studio
              </div>
            )}
            {GOVERNANCE_APPS.map((app) => {
              const isActive = selectedGovernanceApp === app.id;
              return (
                <button
                  key={app.id}
                  type="button"
                  onClick={() => onGovernanceAppChange?.(app.id)}
                  className={`w-full text-left flex items-center ${isCollapsed ? 'justify-center' : 'justify-between'} px-3 py-2.5 rounded-lg transition-all group ${
                    isActive
                      ? 'bg-primary text-white shadow-md'
                      : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-slate-100'
                  }`}
                  title={isCollapsed ? app.name : ''}
                >
                  {isCollapsed ? (
                    <span className="material-icons-round text-[18px] flex-shrink-0">{app.icon}</span>
                  ) : (
                    <>
                      <div className="flex items-center gap-3">
                        <span className="material-icons-round text-[18px] flex-shrink-0">{app.icon}</span>
                        <div className="flex flex-col">
                          <span className="font-medium text-xs">{app.name}</span>
                        </div>
                      </div>
                    </>
                  )}
                </button>
              );
            })}
          </div>
        )}
      </nav>

      {!isCollapsed && (
        <div className="p-4 mt-auto">
          <div className="bg-slate-50 dark:bg-slate-800/50 rounded-xl p-4 border border-slate-100 dark:border-slate-700/50">
            <div className="text-[10px] uppercase tracking-wider text-slate-400 font-bold mb-2">System Status</div>
            <div className="flex items-center gap-2">
              <span className="relative flex h-2.5 w-2.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
              </span>
              <span className="text-sm font-semibold text-slate-700 dark:text-slate-300">Operational</span>
            </div>
          </div>
        </div>
      )}
      {typeof window !== 'undefined' &&
        isDropdownOpen &&
        dropdownPosition &&
        createPortal(
          <div
            className="fixed z-50"
            style={{
              top: dropdownPosition.top,
              left: dropdownPosition.left,
              width: dropdownPosition.width,
            }}
          >
            <div className="bg-white dark:bg-slate-800 rounded-lg shadow-lg border border-slate-200 dark:border-slate-700 py-1 max-h-96 overflow-y-auto">
              {navItems.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => handleMainSectionChange(item.id)}
                  className={`w-full text-left flex items-center gap-3 px-3 py-2.5 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors ${
                    item.id === currentSection ? 'bg-primary/10 text-primary' : 'text-slate-700 dark:text-slate-300'
                  }`}
                >
                  <span className="material-icons-round text-[18px]">
                    {item.icon}
                  </span>
                  <span className="font-medium text-sm">{item.label}</span>
                </button>
              ))}
            </div>
          </div>,
          document.body
        )}
    </aside>
  );
};

export default Sidebar;
