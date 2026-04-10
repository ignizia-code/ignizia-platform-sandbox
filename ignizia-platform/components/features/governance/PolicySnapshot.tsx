'use client';

import React from 'react';
import type { TeamPolicy } from '@/types';
import { loadPolicy } from '@/lib/governanceStorage';

const PolicySnapshot: React.FC = () => {
  const [policy, setPolicy] = React.useState<TeamPolicy | null>(null);

  React.useEffect(() => {
    setPolicy(loadPolicy());
  }, []);

  if (!policy) {
    return (
      <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-900/50 p-6">
        <h3 className="font-semibold text-slate-900 dark:text-white mb-2">Policy Snapshot</h3>
        <p className="text-sm text-slate-500 dark:text-slate-400">No policy configured. Go to LivingOps → Strategy: Safe AI for Sensitive Work to set one up.</p>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900/50 p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold text-slate-900 dark:text-white">Laws of the Team</h3>
        {policy.active && (
          <span className="px-2 py-1 rounded-full text-xs font-medium bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300">
            Active
          </span>
        )}
      </div>
      <dl className="space-y-2 text-sm">
        <div>
          <dt className="text-slate-500 dark:text-slate-400">Scope</dt>
          <dd className="font-medium text-slate-900 dark:text-white">{policy.teamName}</dd>
        </div>
        <div>
          <dt className="text-slate-500 dark:text-slate-400">Data control</dt>
          <dd className="font-medium text-slate-900 dark:text-white capitalize">{policy.dataControl}</dd>
        </div>
        <div>
          <dt className="text-slate-500 dark:text-slate-400">External AI</dt>
          <dd className="font-medium text-slate-900 dark:text-white">{policy.externalAiAllowed ? 'Allowed' : 'Blocked'}</dd>
        </div>
        <div>
          <dt className="text-slate-500 dark:text-slate-400">Approved tools</dt>
          <dd className="font-medium text-slate-900 dark:text-white">{policy.approvedTools.join(', ') || 'None'}</dd>
        </div>
        <div>
          <dt className="text-slate-500 dark:text-slate-400">Review required</dt>
          <dd className="font-medium text-slate-900 dark:text-white">{policy.reviewRequiredCategories.join(', ') || 'None'}</dd>
        </div>
      </dl>
    </div>
  );
};

export default PolicySnapshot;
