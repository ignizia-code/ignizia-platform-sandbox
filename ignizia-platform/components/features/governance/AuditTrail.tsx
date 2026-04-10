'use client';

import React, { useState, useEffect } from 'react';
import type { AuditEvent } from '@/types';
import { loadAuditEvents } from '@/lib/governanceStorage';

const AuditTrail: React.FC = () => {
  const [events, setEvents] = useState<AuditEvent[]>([]);

  useEffect(() => {
    setEvents(loadAuditEvents().reverse());
  }, []);

  const getIcon = (type: AuditEvent['type']) => {
    switch (type) {
      case 'policy_change':
        return 'settings';
      case 'blocked_violation':
        return 'block';
      case 'approval_granted':
        return 'check_circle';
      case 'workflow_submitted':
        return 'send';
      case 'workflow_rejected':
        return 'cancel';
      case 'objective_activated':
        return 'flag';
      case 'trial_started':
        return 'science';
      case 'run_completed':
        return 'speed';
      case 'initiative_promoted':
        return 'rocket_launch';
      case 'initiative_rolled_back':
        return 'undo';
      default:
        return 'info';
    }
  };

  const getColor = (type: AuditEvent['type']) => {
    switch (type) {
      case 'policy_change':
        return 'bg-violet-100 dark:bg-violet-900/40 text-violet-700 dark:text-violet-300';
      case 'blocked_violation':
        return 'bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-300';
      case 'approval_granted':
      case 'initiative_promoted':
        return 'bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300';
      case 'workflow_submitted':
      case 'trial_started':
        return 'bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300';
      case 'workflow_rejected':
      case 'initiative_rolled_back':
        return 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300';
      case 'objective_activated':
        return 'bg-indigo-100 dark:bg-indigo-900/40 text-indigo-700 dark:text-indigo-300';
      case 'run_completed':
        return 'bg-sky-100 dark:bg-sky-900/40 text-sky-700 dark:text-sky-300';
      default:
        return 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300';
    }
  };

  if (events.length === 0) {
    return (
      <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-900/50 p-6">
        <h3 className="font-semibold text-slate-900 dark:text-white mb-2">Audit Trail</h3>
        <p className="text-sm text-slate-500 dark:text-slate-400">No events yet. Policy changes and approvals will appear here.</p>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900/50 overflow-hidden">
      <div className="p-4 border-b border-slate-200 dark:border-slate-700">
        <h3 className="font-semibold text-slate-900 dark:text-white">Audit Trail</h3>
      </div>
      <div className="max-h-64 overflow-y-auto">
        <ul className="divide-y divide-slate-100 dark:divide-slate-800">
          {events.map((ev) => (
            <li key={ev.id} className="p-4 flex gap-3">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${getColor(ev.type)}`}>
                <span className="material-icons-round text-sm">{getIcon(ev.type)}</span>
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium text-slate-900 dark:text-white capitalize">
                  {ev.type.replace(/_/g, ' ')}
                </div>
                <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  {new Date(ev.timestamp).toLocaleString()} • {ev.actor}
                </div>
                <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">{ev.details}</p>
                {ev.policyRule && (
                  <span className="inline-block mt-1 text-xs text-slate-500 dark:text-slate-500">Rule: {ev.policyRule}</span>
                )}
              </div>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
};

export default AuditTrail;
