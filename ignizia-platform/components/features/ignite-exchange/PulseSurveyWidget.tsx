'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { Smile, Meh, Frown } from 'lucide-react';

const responses = [
  { icon: Smile, label: '😀', count: 48, color: 'text-success' },
  { icon: Meh, label: '😐', count: 16, color: 'text-warning' },
  { icon: Frown, label: '😟', count: 5, color: 'text-brand-pink' },
];

export interface PulseSurveyWidgetProps {
  /** When "personal", copy focuses on the user's response; when "team", on shift/team readiness. */
  variant?: 'personal' | 'team';
}

export function PulseSurveyWidget({ variant = 'team' }: PulseSurveyWidgetProps) {
  const isPersonal = variant === 'personal';
  const title = isPersonal ? 'Your response' : 'Shift Readiness';
  const participationLabel = isPersonal ? 'Your participation' : 'Participation';

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.1 }}
      className="rounded-2xl border border-slate-200 bg-card-light p-6 shadow-lg"
    >
      <div className="mb-6 inline-flex items-center gap-2 rounded-lg bg-primary/10 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide text-primary">
        {title}
      </div>

      <div className="mb-6 flex justify-around">
        {responses.map((r, i) => {
          const Icon = r.icon;
          return (
            <motion.div
              key={r.label}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.15 + i * 0.05 }}
              className="flex flex-col items-center gap-1"
            >
              <Icon className={`h-8 w-8 ${r.color}`} />
              <span className="text-2xl font-bold text-slate-900">{r.count}</span>
            </motion.div>
          );
        })}
      </div>

      <div>
        <div className="mb-1 flex justify-between text-xs">
          <span className="text-slate-500">{participationLabel}</span>
          <span className="font-medium text-slate-900">82%</span>
        </div>
        <div className="h-2 overflow-hidden rounded-full bg-slate-200">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: '82%' }}
            transition={{ duration: 0.8 }}
            className="h-full rounded-full bg-gradient-to-r from-brand-blue to-brand-green"
          />
        </div>
      </div>
    </motion.div>
  );
}
