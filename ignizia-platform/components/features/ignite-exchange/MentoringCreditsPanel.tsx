'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { Clock, MessageCircle, BookOpen } from 'lucide-react';

const stats = [
  { label: 'Hours Mentored', value: 14, icon: Clock, color: 'text-brand-blue' },
  { label: 'Questions Answered', value: 21, icon: MessageCircle, color: 'text-brand-green' },
  { label: 'Playbooks Shared', value: 3, icon: BookOpen, color: 'text-brand-orange' },
];

export function MentoringCreditsPanel() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.4 }}
      className="rounded-2xl border border-slate-200 bg-card-light p-6 shadow-lg"
    >
      <div className="mb-6 inline-flex items-center gap-2 rounded-lg bg-primary/10 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide text-primary">
        Mentoring
      </div>

      <div className="mb-6 grid grid-cols-3 gap-4">
        {stats.map((s, i) => {
          const Icon = s.icon;
          return (
            <motion.div
              key={s.label}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.45 + i * 0.05 }}
              className={`rounded-xl border p-3 text-center ${
                i === 0 && 'border-brand-blue/30 bg-brand-blue/5'
              } ${i === 1 && 'border-success/30 bg-success/5'} ${i === 2 && 'border-brand-orange/30 bg-brand-orange/5'}`}
            >
              <Icon className={`mx-auto mb-1 h-5 w-5 ${s.color}`} />
              <p className="text-xl font-bold text-slate-900">{s.value}</p>
              <p className="text-[10px] text-slate-500">{s.label}</p>
            </motion.div>
          );
        })}
      </div>

      <div>
        <div className="mb-1 flex justify-between text-xs">
          <span className="text-slate-500">Credits Earned</span>
          <span className="font-medium text-slate-900">67%</span>
        </div>
        <div className="h-2 overflow-hidden rounded-full bg-slate-200">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: '67%' }}
            transition={{ duration: 0.8 }}
            className="h-full rounded-full bg-gradient-to-r from-brand-blue to-brand-green"
          />
        </div>
      </div>
    </motion.div>
  );
}
