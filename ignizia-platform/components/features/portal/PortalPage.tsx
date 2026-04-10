'use client';

import React from 'react';
import TalentStudio from '@/components/features/talent-studio/TalentStudio';
import AgentStudio from '@/components/features/agent-studio/AgentStudio';
import WorkflowBuilder from '@/components/features/workflow-builder/WorkflowBuilder';
import PolicyWizard from '@/components/features/governance/PolicyWizard';
import { StrategyStudio, ExecutiveStrategyStudio } from '@/components/features/strategy-studio';
import { UserRole } from '@/types';

interface PortalPageProps {
  userRole: UserRole;
  selectedAppId?: string;
}

const PortalPage: React.FC<PortalPageProps> = ({ userRole, selectedAppId = 'talent-studio' }) => {
  return (
    <div className="h-full w-full p-8 animate-in fade-in duration-500">
      <div className="h-full w-full bg-white dark:bg-card-dark rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700/60 overflow-y-auto overflow-x-hidden">
        <div className={`w-full h-full ${selectedAppId === 'workflow' ? '' : 'p-8'}`}>
          {selectedAppId === 'talent-studio' ? (
            <TalentStudio />
          ) : selectedAppId === 'agent-studio' ? (
            <AgentStudio />
          ) : selectedAppId === 'workflow' ? (
            <WorkflowBuilder userRole={userRole} />
          ) : selectedAppId === 'strategy-studio' ? (
            userRole === 'Plant Manager' || userRole === 'Operations Manager' ? (
              <ExecutiveStrategyStudio />
            ) : (
              <StrategyStudio />
            )
          ) : selectedAppId === 'safe-ai-governance' ? (
            <div className="p-8">
              <PolicyWizard userRole={userRole} />
            </div>
          ) : selectedAppId === 'enterprise-design-studio' ||
            selectedAppId === 'intelligence' ||
            selectedAppId === 'foundry' ||
            selectedAppId === 'workbench' ? (
            <div className="h-full w-full flex items-center justify-center p-8">
              <div className="max-w-lg w-full text-center border border-dashed border-slate-200 dark:border-slate-700 rounded-2xl py-10 px-6">
                <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-50 mb-2">
                  {selectedAppId === 'enterprise-design-studio'
                    ? 'Enterprise Design Studio'
                    : selectedAppId === 'intelligence'
                      ? 'Intelligence'
                      : selectedAppId === 'foundry'
                        ? 'Foundry'
                        : 'Workbench'}{' '}
                  — Coming soon
                </h3>
                <p className="text-sm text-slate-500 dark:text-slate-400">
                  This page is a placeholder. Content coming soon.
                </p>
              </div>
            </div>
          ) : (
            <div className="h-full w-full flex items-center justify-center">
              <div className="max-w-lg w-full text-center border border-dashed border-slate-200 dark:border-slate-700 rounded-2xl py-10 px-6">
                <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-50 mb-2">
                  Application workspace coming soon
                </h3>
                <p className="text-sm text-slate-500 dark:text-slate-400 mb-3">
                  For this prototype, <span className="font-semibold">Talent Studio</span>, <span className="font-semibold">Strategy Studio</span>, <span className="font-semibold">Agent Studio</span>, and <span className="font-semibold">Workflow Builder</span> are available.
                </p>
                <p className="text-xs text-slate-400 dark:text-slate-500">
                  Switch to an available app in the sidebar to explore.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default PortalPage;

