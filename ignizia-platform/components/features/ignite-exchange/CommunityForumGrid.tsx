'use client';

import React from 'react';
import { motion } from 'framer-motion';

const topics = [
  { name: 'Robot Diagnostics', count: 42, color: 'border-l-brand-blue' },
  { name: 'Safety Protocols', count: 18, color: 'border-l-success' },
  { name: 'Line Optimization', count: 26, color: 'border-l-warning' },
  { name: 'Maintenance Tips', count: 31, color: 'border-l-brand-orange' },
];

const thread = {
  topic: 'Robot Diagnostics',
  posts: [
    { author: 'Alex', text: 'Encoder drift after reset?' },
    { author: 'Maria', text: 'Check torque alignment first.' },
  ],
};

export function CommunityForumGrid() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.2 }}
      className="rounded-2xl border border-slate-200 bg-card-light p-6 shadow-lg"
    >
      <div className="mb-6 inline-flex items-center gap-2 rounded-lg bg-primary/10 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide text-primary">
        Topics
      </div>

      <div className="mb-6 grid grid-cols-2 gap-3">
        {topics.map((t, i) => (
          <motion.div
            key={t.name}
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.25 + i * 0.05 }}
            className={`rounded-xl border border-slate-200 border-l-4 bg-slate-50 px-4 py-3 ${t.color}`}
          >
            <p className="font-medium text-slate-900">{t.name}</p>
            <p className="text-lg font-bold text-slate-600">{t.count}</p>
          </motion.div>
        ))}
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-4">
        <p className="mb-3 font-semibold text-slate-900">{thread.topic}</p>
        <div className="space-y-2">
          {thread.posts.map((p, i) => (
            <div key={i} className="flex gap-2 text-sm">
              <span className="font-medium text-brand-blue">{p.author}</span>
              <span className="text-slate-600">{p.text}</span>
            </div>
          ))}
        </div>
      </div>
    </motion.div>
  );
}
