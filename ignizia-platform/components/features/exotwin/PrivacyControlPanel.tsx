'use client';

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Lock, Eye, Settings } from 'lucide-react';

const STORAGE_KEY = 'exotwin-privacy-settings';

export type Visibility = 'private' | 'shared';

export interface PrivacySetting {
  key: string;
  label: string;
  visibility: Visibility;
  icon: React.ComponentType<{ className?: string }>;
}

const DEFAULT_SETTINGS: PrivacySetting[] = [
  { key: 'skills-passport', label: 'Skills Passport', visibility: 'shared', icon: Eye },
  { key: 'career-aspirations', label: 'Career Aspirations', visibility: 'private', icon: Lock },
  { key: 'coaching-signals', label: 'Coaching Signals', visibility: 'private', icon: Lock },
  { key: 'certifications', label: 'Certifications', visibility: 'shared', icon: Eye },
];

function loadSettings(): PrivacySetting[] {
  if (typeof window === 'undefined') return DEFAULT_SETTINGS;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_SETTINGS;
    const parsed = JSON.parse(raw) as Record<string, Visibility>;
    return DEFAULT_SETTINGS.map((s) => ({
      ...s,
      visibility: parsed[s.key] ?? s.visibility,
    }));
  } catch {
    return DEFAULT_SETTINGS;
  }
}

function saveSettings(settings: PrivacySetting[]) {
  if (typeof window === 'undefined') return;
  const map: Record<string, Visibility> = {};
  settings.forEach((s) => { map[s.key] = s.visibility; });
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(map));
}

export function PrivacyControlPanel() {
  const [settings, setSettings] = useState<PrivacySetting[]>(DEFAULT_SETTINGS);

  useEffect(() => {
    setSettings(loadSettings());
  }, []);

  const toggle = (key: string) => {
    setSettings((prev) => {
      const next = prev.map((s) =>
        s.key === key
          ? { ...s, visibility: (s.visibility === 'private' ? 'shared' : 'private') as Visibility }
          : s,
      );
      saveSettings(next);
      return next;
    });
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.5 }}
      className="rounded-2xl border border-slate-200 bg-card-light p-6 shadow-lg"
    >
      <div className="mb-6">
        <div className="inline-flex items-center gap-2 rounded-lg bg-primary/10 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide text-primary">
          <Settings className="h-3.5 w-3.5" />
          Visibility Settings
        </div>
        <h3 className="mt-2 text-lg font-bold text-slate-900">Employee Agency</h3>
        <p className="text-sm text-slate-500">You control what your twin shares</p>
      </div>

      <div className="space-y-3">
        {settings.map((s, i) => {
          const Icon = s.icon;
          return (
            <motion.div
              key={s.key}
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.55 + i * 0.05 }}
              className="flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50 px-4 py-3"
            >
              <span className="font-medium text-slate-900">{s.label}</span>
              <div className="flex items-center gap-3">
                <span
                  className={`text-sm font-medium ${
                    s.visibility === 'private' ? 'text-slate-500' : 'text-brand-blue'
                  }`}
                >
                  {s.visibility === 'private' ? 'Private' : 'Shared with Manager'}
                </span>
                <button
                  type="button"
                  role="switch"
                  aria-checked={s.visibility === 'shared'}
                  aria-label={`Toggle ${s.label} visibility`}
                  onClick={() => toggle(s.key)}
                  className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors focus:outline-none focus:ring-2 focus:ring-brand-blue/30 focus:ring-offset-2 ${
                    s.visibility === 'shared' ? 'bg-brand-blue' : 'bg-slate-300'
                  }`}
                >
                  <span
                    className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition ${
                      s.visibility === 'shared' ? 'translate-x-5' : 'translate-x-0.5'
                    }`}
                  />
                </button>
                <Icon
                  className={`h-4 w-4 shrink-0 ${
                    s.visibility === 'private' ? 'text-slate-500' : 'text-brand-blue'
                  }`}
                />
              </div>
            </motion.div>
          );
        })}
      </div>

      <p className="mt-4 text-xs text-slate-500">
        🔒 Private • 👁 Visible — Your data, your choice.
      </p>
    </motion.div>
  );
}
