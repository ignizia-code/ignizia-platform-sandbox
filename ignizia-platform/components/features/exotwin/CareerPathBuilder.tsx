'use client';

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { ChevronDown, Target } from 'lucide-react';
import { Badge } from '@/components/ui';

const roles = [
  { id: 'assembly', title: 'Assembly Worker', current: true },
  { id: 'maintenance', title: 'Maintenance Specialist', current: false },
  { id: 'robotics', title: 'Robotics Technician', current: false, selected: true },
  { id: 'supervisor', title: 'Automation Supervisor', current: false },
];

const targetDetails = {
  robotics: {
    readiness: 63,
    skills: ['Troubleshooting', 'Equipment Maintenance', 'Quality Control Analysis'],
  },
};

export function CareerPathBuilder() {
  const [expandedRole, setExpandedRole] = useState<string | null>('robotics');

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.2 }}
      className="rounded-2xl border border-slate-200 bg-card-light p-6 shadow-lg"
    >
      <div className="mb-6">
        <div className="inline-flex items-center gap-2 rounded-lg bg-primary/10 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide text-primary">
          <Target className="h-3.5 w-3.5" />
          Career Path Builder
        </div>
        <h3 className="mt-2 text-lg font-bold text-slate-900">Shape Your Growth</h3>
        <p className="text-sm text-slate-500">Interactive career trajectory map</p>
      </div>

      <div className="flex flex-col gap-2">
        {roles.map((role, i) => (
          <React.Fragment key={role.id}>
            <motion.button
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.25 + i * 0.05 }}
              onClick={() => setExpandedRole(expandedRole === role.id ? null : role.id)}
              className={`flex w-full items-center justify-between rounded-xl border p-4 text-left transition-all ${
                expandedRole === role.id
                  ? 'border-brand-blue/50 bg-brand-blue/10'
                  : 'border-slate-200 bg-slate-50 hover:border-slate-300 hover:bg-slate-100'
              } ${role.current ? 'ring-1 ring-brand-green/30' : ''}`}
            >
              <div className="flex items-center gap-3">
                <div
                  className={`flex h-10 w-10 items-center justify-center rounded-lg ${
                    role.current ? 'bg-brand-green/20 text-brand-green' : 'bg-slate-200 text-slate-500'
                  }`}
                >
                  <Target className="h-5 w-5" />
                </div>
                <div>
                  <span className="font-medium text-slate-900">{role.title}</span>
                  {role.current && (
                    <Badge variant="success" className="ml-2">
                      Current
                    </Badge>
                  )}
                  {role.selected && !role.current && (
                    <Badge variant="info" className="ml-2">
                      Target
                    </Badge>
                  )}
                </div>
              </div>
              <ChevronDown
                className={`h-5 w-5 text-slate-500 transition-transform ${expandedRole === role.id ? 'rotate-180' : ''}`}
              />
            </motion.button>
            {i < roles.length - 1 && (
              <div className="flex justify-center">
                <div className="h-4 w-0.5 bg-slate-300" />
              </div>
            )}
          </React.Fragment>
        ))}
      </div>

      {expandedRole === 'robotics' && (
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          className="mt-6 rounded-xl border border-brand-blue/20 bg-brand-blue/5 p-5"
        >
          <h4 className="mb-3 flex items-center gap-2 font-medium text-slate-900">
            <Target className="h-4 w-4 text-brand-blue" />
            Target Role: Robotics Technician
          </h4>
          <div className="mb-4 flex items-center gap-2">
            <div className="h-3 flex-1 overflow-hidden rounded-full bg-slate-200">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: '63%' }}
                transition={{ duration: 0.8 }}
                className="h-full rounded-full bg-brand-blue"
              />
            </div>
            <span className="text-sm font-bold text-brand-blue">63%</span>
            <span className="text-sm text-slate-500">Readiness</span>
          </div>
          <p className="mb-3 text-sm text-slate-600">Next steps:</p>
          <ul className="space-y-2">
            {targetDetails.robotics.skills.map((skill, j) => (
              <li key={j} className="flex items-center gap-2 text-sm text-slate-600">
                <span className="h-1.5 w-1.5 rounded-full bg-brand-blue" />
                {skill}
              </li>
            ))}
          </ul>
        </motion.div>
      )}
    </motion.div>
  );
}
