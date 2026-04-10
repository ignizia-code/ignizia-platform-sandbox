'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { ThumbsUp, Repeat2, MessageCircle } from 'lucide-react';

const kudos = [
  {
    from: 'Alex',
    to: 'Maria',
    badge: 'Safety Champion',
    badgeColor: 'bg-warning/20 text-warning border-warning/30',
    message: 'Robot shutdown tip saved our shift.',
    likes: 14,
    shares: 3,
    comments: 6,
  },
  {
    from: 'Chen',
    to: 'Sam',
    badge: 'Mentoring',
    badgeColor: 'bg-brand-blue/20 text-brand-blue border-brand-blue/30',
    message: 'Guided calibration walkthrough.',
    likes: 9,
    shares: 0,
    comments: 2,
  },
  {
    from: 'Fatima',
    to: 'Alex',
    badge: 'Workflow Fix',
    badgeColor: 'bg-success/20 text-success border-success/30',
    message: 'Streamlined sensor check sequence.',
    likes: 22,
    shares: 5,
    comments: 8,
  },
];

export function KudosStream() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-2xl border border-slate-200 bg-card-light p-6 shadow-lg"
    >
      <div className="mb-6 inline-flex items-center gap-2 rounded-lg bg-primary/10 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide text-primary">
        Kudos Stream
      </div>

      <div className="space-y-4">
        {kudos.map((k, i) => (
          <motion.div
            key={`${k.from}-${k.to}-${i}`}
            initial={{ opacity: 0, x: -8 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.05 + i * 0.05 }}
            className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm"
          >
            <div className="mb-2 flex items-center justify-between">
              <span className="text-sm font-medium text-slate-900">
                {k.from} → {k.to}
              </span>
              <span
                className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold ${k.badgeColor}`}
              >
                {k.badge}
              </span>
            </div>
            <p className="mb-4 text-sm text-slate-600">&quot;{k.message}&quot;</p>
            <div className="flex items-center gap-4 text-xs text-slate-500">
              <span className="flex items-center gap-1">
                <ThumbsUp className="h-3.5 w-3.5" />
                {k.likes}
              </span>
              {k.shares > 0 && (
                <span className="flex items-center gap-1">
                  <Repeat2 className="h-3.5 w-3.5" />
                  {k.shares}
                </span>
              )}
              <span className="flex items-center gap-1">
                <MessageCircle className="h-3.5 w-3.5" />
                {k.comments}
              </span>
            </div>
          </motion.div>
        ))}
      </div>
    </motion.div>
  );
}
