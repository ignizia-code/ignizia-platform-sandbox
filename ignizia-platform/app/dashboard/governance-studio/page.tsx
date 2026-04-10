'use client';

import { useDashboard } from '../DashboardContext';

export default function GovernanceStudioPage() {
  const { selectedGovernanceApp } = useDashboard();
  const title =
    selectedGovernanceApp === 'registry'
      ? 'Registry'
      : selectedGovernanceApp === 'standards'
        ? 'Standards'
        : selectedGovernanceApp === 'controls'
          ? 'Controls'
          : 'Assurance';
  return (
    <div className="p-8">
      <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">{title}</h2>
      <p className="text-slate-500 dark:text-slate-400">This page is a placeholder. Content coming soon.</p>
    </div>
  );
}
