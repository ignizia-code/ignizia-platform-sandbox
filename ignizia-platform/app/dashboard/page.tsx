'use client';

import Dashboard from '@/components/features/dashboard/Dashboard';
import { useDashboard } from './DashboardContext';

export default function DashboardPage() {
  const { timeframe, view, userRole, selectedFactoryCortexApp } = useDashboard();
  if (selectedFactoryCortexApp === 'control-tower') {
    return <Dashboard timeframe={timeframe} view={view} userRole={userRole} />;
  }
  const title =
    selectedFactoryCortexApp === 'digitizer'
      ? 'Digitizer'
      : selectedFactoryCortexApp === 'live-twin'
        ? 'Live Twin'
        : selectedFactoryCortexApp === 'orchestrator'
          ? 'Orchestrator'
          : 'FactoryCortex Studio';
  return (
    <div className="p-8">
      <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">{title}</h2>
      <p className="text-slate-500 dark:text-slate-400">This page is a placeholder. Content coming soon.</p>
    </div>
  );
}
