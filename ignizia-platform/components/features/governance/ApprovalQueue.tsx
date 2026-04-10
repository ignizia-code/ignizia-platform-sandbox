'use client';

import React, { useState, useEffect } from 'react';
import type { WorkflowSubmission } from '@/types';
import { loadSubmissions, updateSubmissionStatus, addAuditEvent } from '@/lib/governanceStorage';

interface ApprovalQueueProps {
  onRefresh?: () => void;
}

const ApprovalQueue: React.FC<ApprovalQueueProps> = ({ onRefresh }) => {
  const [submissions, setSubmissions] = useState<WorkflowSubmission[]>([]);

  const refresh = () => {
    setSubmissions(loadSubmissions().filter((s) => s.status === 'pending_review'));
  };

  useEffect(() => {
    refresh();
  }, []);

  const handleApprove = (id: string) => {
    const sub = updateSubmissionStatus(id, 'approved');
    if (sub) {
      addAuditEvent({
        timestamp: new Date().toISOString(),
        type: 'approval_granted',
        actor: 'Leader',
        details: `Approved workflow "${sub.workflowName}" submitted by ${sub.submittedBy}`,
      });
      refresh();
      onRefresh?.();
    }
  };

  const handleReject = (id: string) => {
    const sub = updateSubmissionStatus(id, 'rejected');
    if (sub) {
      addAuditEvent({
        timestamp: new Date().toISOString(),
        type: 'workflow_rejected',
        actor: 'Leader',
        details: `Rejected workflow "${sub.workflowName}" submitted by ${sub.submittedBy}`,
      });
      refresh();
      onRefresh?.();
    }
  };

  if (submissions.length === 0) {
    return (
      <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-900/50 p-6">
        <h3 className="font-semibold text-slate-900 dark:text-white mb-2">Approval Queue</h3>
        <p className="text-sm text-slate-500 dark:text-slate-400">No workflows pending review.</p>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900/50 overflow-hidden">
      <div className="p-4 border-b border-slate-200 dark:border-slate-700">
        <h3 className="font-semibold text-slate-900 dark:text-white">Approval Queue</h3>
        <p className="text-xs text-slate-500 dark:text-slate-400">{submissions.length} workflow(s) pending</p>
      </div>
      <ul className="divide-y divide-slate-200 dark:divide-slate-700">
        {submissions.map((sub) => (
          <li key={sub.id} className="p-4 flex items-center justify-between gap-4">
            <div>
              <div className="font-medium text-slate-900 dark:text-white">{sub.workflowName}</div>
              <div className="text-xs text-slate-500 dark:text-slate-400">
                Submitted by {sub.submittedBy} • {new Date(sub.submittedAt).toLocaleDateString()}
              </div>
              {sub.reviewRequiredReason && (
                <div className="text-xs text-amber-600 dark:text-amber-400 mt-1">{sub.reviewRequiredReason}</div>
              )}
            </div>
            <div className="flex gap-2 flex-shrink-0">
              <button
                onClick={() => handleReject(sub.id)}
                className="px-3 py-1.5 rounded-lg text-sm font-medium border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                Reject
              </button>
              <button
                onClick={() => handleApprove(sub.id)}
                className="px-3 py-1.5 rounded-lg text-sm font-medium bg-emerald-600 text-white hover:bg-emerald-700"
              >
                Approve and Activate
              </button>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
};

export default ApprovalQueue;
