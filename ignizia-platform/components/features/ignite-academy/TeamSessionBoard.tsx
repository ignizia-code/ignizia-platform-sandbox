'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { CheckCircle2, Play, Circle } from 'lucide-react';

const participants = [
  { name: 'Maria', status: 'completed' },
  { name: 'Alex', status: 'practicing' },
  { name: 'Chen', status: 'in-session' },
  { name: 'Sam', status: 'completed' },
  { name: 'Fatima', status: 'practicing' },
];

export function TeamSessionBoard() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.15 }}
      className="rounded-2xl border border-slate-200 bg-card-light p-6 shadow-lg"
    >
      <div className="mb-4 inline-flex items-center gap-2 rounded-lg bg-primary/10 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide text-primary">
        Shift A — Session
      </div>

      <div className="mb-6">
        <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
          Participants
        </p>
        <div className="space-y-2">
          {participants.map((p, i) => {
            const Icon =
              p.status === 'completed'
                ? CheckCircle2
                : p.status === 'practicing'
                  ? Play
                  : Circle;
            const color =
              p.status === 'completed'
                ? 'text-success'
                : p.status === 'practicing'
                  ? 'text-brand-blue'
                  : 'text-brand-orange';
            return (
              <div key={p.name} className="flex items-center justify-between rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
                <span className="text-sm font-medium text-slate-900">{p.name}</span>
                <span className={`flex items-center gap-1.5 text-xs ${color}`}>
                  <Icon className="h-3.5 w-3.5" />
                  {p.status === 'completed' ? 'Completed' : p.status === 'practicing' ? 'Practicing' : 'In session'}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      <div className="mb-2">
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Scenario</p>
        <p className="font-medium text-slate-900">Line Failure Drill</p>
      </div>

      <div>
        <div className="mb-1 flex justify-between text-xs">
          <span className="text-slate-500">Session Progress</span>
          <span className="font-medium text-slate-900">80%</span>
        </div>
        <div className="h-2 overflow-hidden rounded-full bg-slate-200">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: '80%' }}
            transition={{ duration: 0.8 }}
            className="h-full rounded-full bg-gradient-to-r from-brand-blue to-brand-green"
          />
        </div>
      </div>
    </motion.div>
  );
}
