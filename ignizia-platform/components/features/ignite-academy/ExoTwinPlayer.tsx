'use client';

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { User, Cpu } from 'lucide-react';

const options = [
  'Inspect encoder',
  'Reset calibration',
  'Check torque limits',
];

interface ExoTwinPlayerProps {
  employeeName?: string;
  roleName?: string;
}

export function ExoTwinPlayer({
  employeeName = 'No employee selected',
  roleName = 'Select an employee to personalize this simulation',
}: ExoTwinPlayerProps) {
  const [selected, setSelected] = useState<string | null>(null);

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-2xl border border-slate-200 bg-card-light p-6 shadow-lg"
    >
      <div className="mb-4 flex items-center justify-between">
        <div className="inline-flex items-center gap-2 rounded-lg bg-primary/10 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide text-primary">
          Scenario: Line Calibration
        </div>
        <div className="flex items-center gap-2">
          <div className="flex h-6 w-6 items-center justify-center rounded-full bg-brand-blue/20">
            <Cpu className="h-3.5 w-3.5 text-brand-blue" />
          </div>
          <div className="flex h-6 w-6 items-center justify-center rounded-full bg-brand-green/20">
            <User className="h-3.5 w-3.5 text-brand-green" />
          </div>
        </div>
      </div>

      <div className="mb-6 rounded-xl border border-brand-blue/20 bg-brand-blue/5 p-4">
        <p className="text-sm text-slate-600">Learner: {employeeName}</p>
        <p className="text-xs text-slate-500">{roleName}</p>
        <p className="mt-2 text-sm font-medium text-slate-900">Twin prompt: What is the first check?</p>
      </div>

      <div className="space-y-2">
        {options.map((opt) => (
          <button
            key={opt}
            onClick={() => setSelected(opt)}
            className={`flex w-full items-center gap-3 rounded-xl border p-4 text-left transition-all ${
              selected === opt
                ? 'border-brand-green bg-brand-green/10'
                : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50'
            }`}
          >
            <span className="text-sm font-medium text-slate-900">{opt}</span>
          </button>
        ))}
      </div>

      <div className="mt-6 flex items-center gap-1">
        {[1, 2, 3, 4, 5].map((i) => (
          <span
            key={i}
            className={`h-2 w-2 rounded-full ${
              i <= 3 ? 'bg-brand-blue' : 'bg-slate-200'
            }`}
          />
        ))}
      </div>
    </motion.div>
  );
}
