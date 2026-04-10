'use client';

import React, { useState } from 'react';
import PolicySnapshot from '@/components/features/governance/PolicySnapshot';
import ApprovalQueue from '@/components/features/governance/ApprovalQueue';
import AuditTrail from '@/components/features/governance/AuditTrail';
import PolicyWizard from '@/components/features/governance/PolicyWizard';

interface EvidenceDrawerProps {
  open: boolean;
  onClose: () => void;
  onRefresh?: () => void;
}

type DrawerTab = 'overview' | 'approvals' | 'audit' | 'policy';

const EvidenceDrawer: React.FC<EvidenceDrawerProps> = ({ open, onClose, onRefresh }) => {
  const [tab, setTab] = useState<DrawerTab>('overview');
  const [showPolicyWizard, setShowPolicyWizard] = useState(false);

  const tabs: { id: DrawerTab; label: string; icon: string }[] = [
    { id: 'overview', label: 'Dashboard', icon: 'dashboard' },
    { id: 'approvals', label: 'Approvals', icon: 'task_alt' },
    { id: 'audit', label: 'Audit Trail', icon: 'history' },
    { id: 'policy', label: 'Policy', icon: 'shield' },
  ];

  return (
    <>
      {/* Backdrop */}
      {open && (
        <div
          className="fixed inset-0 bg-black/30 backdrop-blur-sm z-40 transition-opacity"
          onClick={onClose}
        />
      )}

      {/* Drawer */}
      <div
        className={`fixed top-0 right-0 h-full w-full max-w-2xl bg-white dark:bg-slate-900 shadow-2xl z-50 transform transition-transform duration-300 ease-in-out ${
          open ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-800">
          <div className="flex items-center gap-3">
            <span className="material-icons-round text-accent">verified</span>
            <h2 className="font-bold text-lg text-slate-900 dark:text-white">
              Evidence &amp; Governance
            </h2>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <span className="material-icons-round text-slate-500">close</span>
          </button>
        </div>

        {/* Tab bar */}
        <div className="flex border-b border-slate-200 dark:border-slate-800 px-6">
          {tabs.map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`flex items-center gap-1.5 px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
                tab === t.id
                  ? 'border-accent text-primary dark:text-accent'
                  : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300'
              }`}
            >
              <span className="material-icons-round text-base">{t.icon}</span>
              {t.label}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto h-[calc(100%-8rem)]">
          {tab === 'overview' && (
            <div className="space-y-6 animate-in fade-in duration-300">
              <PolicySnapshot />
              <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-900/50 p-5">
                <h3 className="font-semibold text-slate-900 dark:text-white mb-2 text-sm">
                  Governance Summary
                </h3>
                <p className="text-sm text-slate-500 dark:text-slate-400 leading-relaxed">
                  This dashboard shows the current policy configuration, pending approvals, and a full
                  audit trail of all strategy decisions including objective activation, trial runs,
                  promotions, and rollbacks.
                </p>
              </div>
            </div>
          )}

          {tab === 'approvals' && (
            <div className="animate-in fade-in duration-300">
              <ApprovalQueue onRefresh={onRefresh} />
            </div>
          )}

          {tab === 'audit' && (
            <div className="animate-in fade-in duration-300">
              <AuditTrail />
            </div>
          )}

          {tab === 'policy' && (
            <div className="space-y-4 animate-in fade-in duration-300">
              <PolicySnapshot />
              {!showPolicyWizard ? (
                <button
                  onClick={() => setShowPolicyWizard(true)}
                  className="px-4 py-2 rounded-lg bg-primary text-white text-sm font-medium hover:bg-primary/90 transition-colors flex items-center gap-2"
                >
                  <span className="material-icons-round text-base">settings</span>
                  Configure Policy
                </button>
              ) : (
                <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900/60 p-4">
                  <PolicyWizard
                    userRole="Plant Manager"
                    onComplete={() => setShowPolicyWizard(false)}
                  />
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </>
  );
};

export default EvidenceDrawer;
