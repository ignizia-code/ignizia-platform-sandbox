'use client';

import React, { useState, useEffect } from 'react';
import type { TeamPolicy, DataControlLevel, ReviewCategory, UserRole } from '@/types';
import { loadPolicy, savePolicy, addAuditEvent } from '@/lib/governanceStorage';

const REVIEW_CATEGORIES: ReviewCategory[] = ['Legal', 'Customer Facing', 'Finance', 'HR', 'Procurement'];
const APPROVED_TOOLS = ['Excel', 'Outlook', 'SAP', 'ERP', 'Slack', 'Teams', 'Google Sheets'];

interface PolicyWizardProps {
  userRole: UserRole;
  onComplete?: () => void;
}

type WizardStep = 'intro' | 'data' | 'external' | 'tools' | 'review' | 'scope' | 'done';

const PolicyWizard: React.FC<PolicyWizardProps> = ({ userRole, onComplete }) => {
  const [step, setStep] = useState<WizardStep>('intro');
  const [dataControl, setDataControl] = useState<DataControlLevel>('tight');
  const [externalAiAllowed, setExternalAiAllowed] = useState(false);
  const [approvedTools, setApprovedTools] = useState<string[]>(['Excel', 'Outlook', 'SAP']);
  const [reviewCategories, setReviewCategories] = useState<ReviewCategory[]>(['Customer Facing', 'Finance']);
  const [teamName, setTeamName] = useState('Logistics');
  const [existingPolicy, setExistingPolicy] = useState<TeamPolicy | null>(null);

  useEffect(() => {
    setExistingPolicy(loadPolicy());
  }, [step]);

  const toggleTool = (tool: string) => {
    setApprovedTools((prev) =>
      prev.includes(tool) ? prev.filter((t) => t !== tool) : [...prev, tool]
    );
  };

  const toggleReviewCategory = (cat: ReviewCategory) => {
    setReviewCategories((prev) =>
      prev.includes(cat) ? prev.filter((c) => c !== cat) : [...prev, cat]
    );
  };

  const handleActivate = () => {
    const policy: TeamPolicy = {
      id: `policy-${Date.now()}`,
      teamId: 'default',
      teamName,
      dataControl,
      externalAiAllowed,
      approvedTools,
      reviewRequiredCategories: reviewCategories,
      autonomyLevel: dataControl === 'tight' ? 'restricted' : dataControl === 'moderate' ? 'review' : 'full',
      createdAt: new Date().toISOString(),
      createdBy: userRole,
      active: true,
    };
    savePolicy(policy);
    addAuditEvent({
      timestamp: new Date().toISOString(),
      type: 'policy_change',
      actor: userRole,
      details: `Policy activated for ${teamName}: data=${dataControl}, externalAI=${externalAiAllowed}`,
    });
    setStep('done');
    onComplete?.();
  };

  const renderStep = () => {
    switch (step) {
      case 'intro':
        return (
          <div className="space-y-6">
            <div className="flex items-center gap-3 p-4 rounded-xl bg-violet-50 dark:bg-violet-950/30 border border-violet-200 dark:border-violet-800">
              <span className="material-icons-round text-3xl text-violet-600 dark:text-violet-400">shield</span>
              <div>
                <h3 className="font-semibold text-slate-900 dark:text-white">Strategy: Safe AI for Sensitive Work</h3>
                <p className="text-sm text-slate-600 dark:text-slate-400">
                  Define clear rules and guardrails for your team's AI usage. This policy will protect sensitive data and ensure appropriate review.
                </p>
              </div>
            </div>
            <p className="text-slate-600 dark:text-slate-400">
              To enable safe AI for sensitive work, let&apos;s define clear rules for your team. You&apos;ll answer a few questions about data posture, allowed tools, and review requirements.
            </p>
            <button
              onClick={() => setStep('data')}
              className="px-4 py-2 rounded-lg bg-violet-600 text-white font-medium hover:bg-violet-700 transition-colors"
            >
              Start configuration
            </button>
          </div>
        );

      case 'data':
        return (
          <div className="space-y-6">
            <h3 className="font-semibold text-slate-900 dark:text-white">Data Posture</h3>
            <p className="text-sm text-slate-600 dark:text-slate-400">
              How strict should data handling be? Tight control blocks external AI and enforces mandatory review for sensitive data.
            </p>
            <div className="space-y-3">
              {(['relaxed', 'moderate', 'tight'] as DataControlLevel[]).map((level) => (
                <button
                  key={level}
                  type="button"
                  onClick={() => setDataControl(level)}
                  className={`w-full text-left px-4 py-3 rounded-xl border transition-all ${
                    dataControl === level
                      ? 'border-violet-500 bg-violet-50 dark:bg-violet-950/30 dark:border-violet-600'
                      : 'border-slate-200 dark:border-slate-700 hover:border-slate-300'
                  }`}
                >
                  <span className="font-medium capitalize">{level}</span>
                  <span className="block text-xs text-slate-500 mt-1">
                    {level === 'relaxed' && 'Allow external AI, minimal restrictions'}
                    {level === 'moderate' && 'Internal AI preferred, some external allowed'}
                    {level === 'tight' && 'No external data transfer, mandatory review for sensitive'}
                  </span>
                </button>
              ))}
            </div>
            <div className="flex gap-3">
              <button onClick={() => setStep('intro')} className="px-4 py-2 text-slate-600 dark:text-slate-400 hover:underline">
                Back
              </button>
              <button onClick={() => setStep('external')} className="px-4 py-2 rounded-lg bg-violet-600 text-white font-medium hover:bg-violet-700">
                Next
              </button>
            </div>
          </div>
        );

      case 'external':
        return (
          <div className="space-y-6">
            <h3 className="font-semibold text-slate-900 dark:text-white">External AI Providers</h3>
            <p className="text-sm text-slate-600 dark:text-slate-400">
              Should employees be allowed to send data to third-party AI providers (e.g. ChatGPT, external APIs)?
            </p>
            <div className="flex gap-4">
              <button
                type="button"
                onClick={() => setExternalAiAllowed(true)}
                className={`flex-1 px-4 py-3 rounded-xl border font-medium ${
                  externalAiAllowed ? 'border-violet-500 bg-violet-50 dark:bg-violet-950/30' : 'border-slate-200 dark:border-slate-700'
                }`}
              >
                Yes
              </button>
              <button
                type="button"
                onClick={() => setExternalAiAllowed(false)}
                className={`flex-1 px-4 py-3 rounded-xl border font-medium ${
                  !externalAiAllowed ? 'border-violet-500 bg-violet-50 dark:bg-violet-950/30' : 'border-slate-200 dark:border-slate-700'
                }`}
              >
                No
              </button>
            </div>
            <div className="flex gap-3">
              <button onClick={() => setStep('data')} className="px-4 py-2 text-slate-600 dark:text-slate-400 hover:underline">Back</button>
              <button onClick={() => setStep('tools')} className="px-4 py-2 rounded-lg bg-violet-600 text-white font-medium hover:bg-violet-700">Next</button>
            </div>
          </div>
        );

      case 'tools':
        return (
          <div className="space-y-6">
            <h3 className="font-semibold text-slate-900 dark:text-white">Approved Tools</h3>
            <p className="text-sm text-slate-600 dark:text-slate-400">
              Select tools that are approved for workflow automation and AI integration.
            </p>
            <div className="flex flex-wrap gap-2">
              {APPROVED_TOOLS.map((tool) => (
                <button
                  key={tool}
                  type="button"
                  onClick={() => toggleTool(tool)}
                  className={`px-3 py-2 rounded-lg text-sm font-medium border transition-all ${
                    approvedTools.includes(tool)
                      ? 'border-violet-500 bg-violet-100 dark:bg-violet-900/40 text-violet-800 dark:text-violet-200'
                      : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400'
                  }`}
                >
                  {tool}
                </button>
              ))}
            </div>
            <div className="flex gap-3">
              <button onClick={() => setStep('external')} className="px-4 py-2 text-slate-600 dark:text-slate-400 hover:underline">Back</button>
              <button onClick={() => setStep('review')} className="px-4 py-2 rounded-lg bg-violet-600 text-white font-medium hover:bg-violet-700">Next</button>
            </div>
          </div>
        );

      case 'review':
        return (
          <div className="space-y-6">
            <h3 className="font-semibold text-slate-900 dark:text-white">Review Required Categories</h3>
            <p className="text-sm text-slate-600 dark:text-slate-400">
              Workflows involving these categories must be submitted for leader approval before activation.
            </p>
            <div className="flex flex-wrap gap-2">
              {REVIEW_CATEGORIES.map((cat) => (
                <button
                  key={cat}
                  type="button"
                  onClick={() => toggleReviewCategory(cat)}
                  className={`px-3 py-2 rounded-lg text-sm font-medium border transition-all ${
                    reviewCategories.includes(cat)
                      ? 'border-amber-500 bg-amber-100 dark:bg-amber-900/40 text-amber-800 dark:text-amber-200'
                      : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
            <div className="flex gap-3">
              <button onClick={() => setStep('tools')} className="px-4 py-2 text-slate-600 dark:text-slate-400 hover:underline">Back</button>
              <button onClick={() => setStep('scope')} className="px-4 py-2 rounded-lg bg-violet-600 text-white font-medium hover:bg-violet-700">Next</button>
            </div>
          </div>
        );

      case 'scope':
        return (
          <div className="space-y-6">
            <h3 className="font-semibold text-slate-900 dark:text-white">Policy Scope</h3>
            <p className="text-sm text-slate-600 dark:text-slate-400">For MVP, this policy applies to a single team.</p>
            <label className="block">
              <span className="text-sm font-medium text-slate-700 dark:text-slate-300">Team name</span>
              <input
                type="text"
                value={teamName}
                onChange={(e) => setTeamName(e.target.value)}
                className="mt-2 w-full px-4 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
                placeholder="e.g. Logistics"
              />
            </label>
            <div className="rounded-xl border border-slate-200 dark:border-slate-700 p-4 space-y-2">
              <div className="text-sm font-medium text-slate-900 dark:text-white">Summary</div>
              <ul className="text-sm text-slate-600 dark:text-slate-400 space-y-1">
                <li>• Data control: <span className="capitalize font-medium">{dataControl}</span></li>
                <li>• External AI: {externalAiAllowed ? 'Allowed' : 'Blocked'}</li>
                <li>• Approved tools: {approvedTools.join(', ')}</li>
                <li>• Review required: {reviewCategories.join(', ') || 'None'}</li>
                <li>• Scope: {teamName} team</li>
              </ul>
            </div>
            <div className="flex gap-3">
              <button onClick={() => setStep('review')} className="px-4 py-2 text-slate-600 dark:text-slate-400 hover:underline">Back</button>
              <button onClick={handleActivate} className="px-4 py-2 rounded-lg bg-emerald-600 text-white font-medium hover:bg-emerald-700">
                Activate policy
              </button>
            </div>
          </div>
        );

      case 'done':
        return (
          <div className="space-y-6">
            <div className="flex items-center gap-3 p-4 rounded-xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800">
              <span className="material-icons-round text-3xl text-emerald-600 dark:text-emerald-400">check_circle</span>
              <div>
                <h3 className="font-semibold text-slate-900 dark:text-white flex items-center gap-2">
                  Policy active
                  <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-emerald-200 dark:bg-emerald-800 text-emerald-800 dark:text-emerald-200">
                    Active
                  </span>
                </h3>
                <p className="text-sm text-slate-600 dark:text-slate-400">
                  Your policy for {teamName} is now active. Employees will see guardrails when building workflows with sensitive data.
                </p>
              </div>
            </div>
            <button
              onClick={() => setStep('intro')}
              className="px-4 py-2 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800"
            >
              Configure another policy
            </button>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="max-w-xl mx-auto p-8">
      <div className="mb-8">
        <h2 className="text-xl font-bold text-slate-900 dark:text-white">Policy Configuration Wizard</h2>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Define AI governance for your team</p>
      </div>
      {renderStep()}
    </div>
  );
};

export default PolicyWizard;
