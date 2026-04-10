'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { BookOpen, MessageCircle, Award, Lightbulb } from 'lucide-react';

const activities = [
  { person: 'Alex', action: 'shared a playbook', icon: BookOpen, color: 'text-brand-blue' },
  { person: 'Maria', action: 'answered a question', icon: MessageCircle, color: 'text-brand-green' },
  { person: 'Chen', action: 'received kudos', icon: Award, color: 'text-warning' },
  { person: 'Sam', action: 'posted improvement idea', icon: Lightbulb, color: 'text-brand-orange' },
];

export function ContributionActivityFeed() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.35 }}
      className="rounded-2xl border border-slate-200 bg-card-light p-6 shadow-lg"
    >
      <div className="mb-6 inline-flex items-center gap-2 rounded-lg bg-primary/10 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide text-primary">
        Community Activity
      </div>

      <div className="space-y-3">
        {activities.map((a, i) => {
          const Icon = a.icon;
          return (
            <motion.div
              key={`${a.person}-${i}`}
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.4 + i * 0.05 }}
              className="flex items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3"
            >
              <div className={`flex h-8 w-8 items-center justify-center rounded-lg bg-slate-100 ${a.color}`}>
                <Icon className={`h-4 w-4 ${a.color}`} />
              </div>
              <div>
                <span className="font-medium text-slate-900">{a.person}</span>
                <span className="text-slate-600"> {a.action}</span>
              </div>
            </motion.div>
          );
        })}
      </div>
    </motion.div>
  );
}
