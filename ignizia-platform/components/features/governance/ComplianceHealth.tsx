'use client';

import React, { useState, useEffect } from 'react';
import { loadSubmissions, loadAuditEvents } from '@/lib/governanceStorage';

const ComplianceHealth: React.FC = () => {
  const [compliant, setCompliant] = useState(0);
  const [pending, setPending] = useState(0);
  const [blocked, setBlocked] = useState(0);

  useEffect(() => {
    const subs = loadSubmissions();
    const approved = subs.filter((s) => s.status === 'approved').length;
    const pendingReview = subs.filter((s) => s.status === 'pending_review').length;

    const audit = loadAuditEvents();
    const blockedCount = audit.filter((e) => e.type === 'blocked_violation').length;

    setCompliant(approved);
    setPending(pendingReview);
    setBlocked(blockedCount);
  }, []);

  return (
    <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900/50 p-6">
      <h3 className="font-semibold text-slate-900 dark:text-white mb-4">Compliance Health</h3>
      <div className="grid grid-cols-3 gap-4">
        <div className="rounded-lg bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 p-4 text-center">
          <div className="text-2xl font-bold text-emerald-700 dark:text-emerald-300">{compliant}</div>
          <div className="text-xs font-medium text-emerald-600 dark:text-emerald-400">Compliant Workflows</div>
        </div>
        <div className="rounded-lg bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 p-4 text-center">
          <div className="text-2xl font-bold text-amber-700 dark:text-amber-300">{pending}</div>
          <div className="text-xs font-medium text-amber-600 dark:text-amber-400">Pending Review</div>
        </div>
        <div className="rounded-lg bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 p-4 text-center">
          <div className="text-2xl font-bold text-red-700 dark:text-red-300">{blocked}</div>
          <div className="text-xs font-medium text-red-600 dark:text-red-400">Blocked Attempts</div>
        </div>
      </div>
    </div>
  );
};

export default ComplianceHealth;
