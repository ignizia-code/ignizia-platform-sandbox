'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { Users, Copy, Star } from 'lucide-react';
import { Button } from '@/components/ui';

const playbooks = [
  {
    title: 'Robot Calibration Workflow',
    author: 'Chen',
    replications: 12,
    teams: 5,
    rating: null,
  },
  {
    title: 'Robot Reset Playbook',
    author: 'Sam',
    replications: null,
    teams: 7,
    rating: 4.8,
  },
];

export function PlaybookShareCards() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.25 }}
      className="rounded-2xl border border-slate-200 bg-card-light p-6 shadow-lg"
    >
      <div className="mb-6 inline-flex items-center gap-2 rounded-lg bg-primary/10 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide text-primary">
        Playbook
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {playbooks.map((pb, i) => (
          <motion.div
            key={pb.title}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 + i * 0.05 }}
            className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm"
          >
            <h4 className="font-semibold text-slate-900">{pb.title}</h4>
            <p className="mt-1 text-xs text-slate-500">Created by: {pb.author}</p>
            <div className="mt-4 flex flex-wrap items-center gap-4 text-sm">
              {pb.replications != null && (
                <span className="flex items-center gap-1 text-slate-600">
                  <Copy className="h-4 w-4 text-brand-blue" />
                  Replications {pb.replications}
                </span>
              )}
              <span className="flex items-center gap-1 text-slate-600">
                <Users className="h-4 w-4 text-brand-green" />
                {pb.teams} teams
              </span>
              {pb.rating != null && (
                <span className="flex items-center gap-1 text-warning">
                  <Star className="h-4 w-4 fill-current" />
                  {pb.rating}
                </span>
              )}
            </div>
            <Button variant="primary" size="sm" className="mt-4">
              Open
            </Button>
          </motion.div>
        ))}
      </div>
    </motion.div>
  );
}
