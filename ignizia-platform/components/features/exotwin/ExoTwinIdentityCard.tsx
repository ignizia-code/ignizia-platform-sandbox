'use client';

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { User, Cpu, TrendingUp, RefreshCw } from 'lucide-react';
import { Badge } from '@/components/ui';
import { Button } from '@/components/ui';

const TWIN_MODES = ['Coaching', 'Career', 'Skills'] as const;
type TwinMode = (typeof TWIN_MODES)[number];

const STATUS_MESSAGES = [
  'Analyzing profile...',
  'Syncing skills data...',
  'Updating growth path...',
  'Ready',
];

function scrollToSection(id: string) {
  const el = document.getElementById(id);
  el?.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

interface ExoTwinIdentityCardProps {
  employeeName?: string;
  roleName?: string;
  readinessPercent?: number;
  growthPathLabel?: string;
}

export function ExoTwinIdentityCard({
  employeeName = 'No employee selected',
  roleName = 'Select an employee to load profile',
  readinessPercent = 0,
  growthPathLabel = 'No active path',
}: ExoTwinIdentityCardProps) {
  const [twinMode, setTwinMode] = useState<TwinMode>('Coaching');
  const [statusIndex, setStatusIndex] = useState(0);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const statusMessage = STATUS_MESSAGES[statusIndex];

  const handleRefresh = () => {
    setIsRefreshing(true);
    setStatusIndex(0);
    const interval = setInterval(() => {
      setStatusIndex((i) => {
        if (i >= STATUS_MESSAGES.length - 1) {
          clearInterval(interval);
          setIsRefreshing(false);
          return STATUS_MESSAGES.length - 1;
        }
        return i + 1;
      });
    }, 800);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className="relative overflow-hidden rounded-2xl border border-slate-200 bg-card-light p-6 shadow-lg"
    >
      <div className="relative flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
        {/* Worker side */}
        <div className="flex items-center gap-4">
          <div className="relative">
            <div className="h-20 w-20 overflow-hidden rounded-2xl border-2 border-brand-blue/30 bg-slate-100">
              <div className="flex h-full w-full items-center justify-center">
                <User className="h-10 w-10 text-slate-500" />
              </div>
            </div>
            <div className="absolute -bottom-1 -right-1 h-6 w-6 rounded-full border-2 border-white bg-success shadow-sm" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-slate-900">{employeeName}</h3>
            <p className="text-sm text-slate-500">{roleName}</p>
            <div className="mt-2 flex flex-wrap gap-1.5">
              <Badge variant="success">Learning</Badge>
              <Badge variant="info">Coaching</Badge>
            </div>
          </div>
        </div>

        {/* Connection / Twin link */}
        <div className="hidden md:flex items-center gap-2 text-brand-blue/70">
          <span className="h-px w-8 bg-gradient-to-r from-transparent to-brand-blue/50" />
          <Cpu className="h-5 w-5 animate-pulse" />
          <span className="h-px w-8 bg-gradient-to-l from-transparent to-brand-blue/50" />
        </div>

        {/* AI Twin side */}
        <div className="flex flex-col gap-3 rounded-xl border border-brand-blue/20 bg-brand-blue/5 p-4">
          <div className="flex items-center gap-4">
            <div className="relative">
              <div className="flex h-16 w-16 items-center justify-center rounded-xl border border-brand-blue/30 bg-brand-blue/10">
                <Cpu className="h-8 w-8 text-brand-blue" />
              </div>
              <motion.div
                animate={{ opacity: [0.5, 1, 0.5] }}
                transition={{ duration: 2, repeat: Infinity }}
                className="absolute inset-0 rounded-xl ring-2 ring-brand-blue/30 ring-offset-2 ring-offset-white"
              />
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-brand-blue/80">AI ExoTwin</p>
              <p className="text-sm font-medium text-slate-900">Twin Mode: {twinMode}</p>
              <p className="text-xs text-slate-500">{statusMessage}</p>
            </div>
          </div>
          {/* Twin mode selector */}
          <div className="flex flex-wrap gap-1.5">
            {TWIN_MODES.map((mode) => (
              <button
                key={mode}
                type="button"
                onClick={() => setTwinMode(mode)}
                className={`rounded-lg px-2.5 py-1 text-xs font-medium transition-colors ${
                  twinMode === mode
                    ? 'bg-brand-blue text-white'
                    : 'bg-white/80 text-slate-600 hover:bg-brand-blue/10 hover:text-brand-blue'
                }`}
              >
                {mode}
              </button>
            ))}
          </div>
          <Button
            variant="ghost"
            size="sm"
            className="gap-1.5 text-xs"
            onClick={handleRefresh}
            disabled={isRefreshing}
          >
            <RefreshCw className={`h-3.5 w-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
            {isRefreshing ? 'Syncing...' : 'Refresh'}
          </Button>
        </div>
      </div>

      {/* Skill readiness ring - clickable */}
      <div className="relative mt-6 flex flex-wrap items-center gap-6 border-t border-slate-200 pt-6">
        <button
          type="button"
          onClick={() => scrollToSection('skills-passport')}
          className="flex flex-1 min-w-[140px] items-center gap-2 rounded-lg p-1 -m-1 transition-colors hover:bg-slate-100 focus:outline-none focus:ring-2 focus:ring-brand-blue/30 focus:ring-offset-1"
          aria-label="Jump to Skills Passport"
        >
          <div className="h-2 flex-1 min-w-[120px] overflow-hidden rounded-full bg-slate-200">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${Math.max(0, Math.min(100, readinessPercent))}%` }}
              transition={{ duration: 1, delay: 0.3 }}
              className="h-full rounded-full bg-gradient-to-r from-brand-blue to-brand-green"
            />
          </div>
          <span className="text-xs font-medium text-slate-500">Skills</span>
        </button>
        <button
          type="button"
          onClick={() => scrollToSection('career-path-builder')}
          className="flex items-center gap-2 rounded-lg p-1 -m-1 text-left transition-colors hover:bg-slate-100 focus:outline-none focus:ring-2 focus:ring-brand-blue/30 focus:ring-offset-1"
          aria-label="Jump to Career Path Builder"
        >
          <TrendingUp className="h-4 w-4 text-brand-green shrink-0" />
          <span className="text-sm text-slate-600">Growth Path:</span>
          <span className="text-sm font-medium text-brand-blue">{growthPathLabel}</span>
        </button>
      </div>
    </motion.div>
  );
}
