'use client';

import React from 'react';
import Image from 'next/image';
import { Button } from '@/components/ui/Button';
import type { Persona } from '@/types';

interface WelcomeScreenProps {
  persona: Persona;
  onEnter: () => void;
}

export default function WelcomeScreen({ persona, onEnter }: WelcomeScreenProps) {
  const supportItems = persona.igniziaSupport.slice(0, 4);
  const focusGoal = persona.goals[0];

  return (
    <div className="min-h-screen w-full flex items-center justify-center p-6 relative overflow-hidden">
      {/* Rich gradient background */}
      <div
        className="absolute inset-0 -z-10 bg-gradient-to-br from-slate-50 via-white to-brand-blue/5 dark:from-background-dark dark:via-slate-900 dark:to-primary/10"
        aria-hidden
      />
      <div
        className="absolute inset-0 -z-10 bg-[radial-gradient(ellipse_80%_50%_at_50%_-20%,theme(colors.brand.blue),transparent)] opacity-30 dark:opacity-20"
        aria-hidden
      />
      <div
        className="absolute top-0 left-1/4 w-[500px] h-[500px] -z-10 rounded-full bg-brand-blue/20 dark:bg-brand-blue/15 blur-[120px]"
        aria-hidden
      />
      <div
        className="absolute bottom-0 right-1/4 w-[400px] h-[400px] -z-10 rounded-full bg-primary/15 dark:bg-primary/20 blur-[100px]"
        aria-hidden
      />
      <div
        className="absolute top-1/2 left-1/2 w-[300px] h-[300px] -z-10 -translate-x-1/2 -translate-y-1/2 rounded-full bg-brand-pink/10 dark:bg-brand-pink/5 blur-[80px]"
        aria-hidden
      />

      <div className="w-full max-w-xl">
        {/* Header */}
        <div className="flex flex-col items-center text-center mb-12 auth-slide-up">
          <div className="relative mb-5">
            <div className="absolute -inset-1 rounded-2xl bg-gradient-to-br from-action/40 to-primary/30 dark:from-action/50 dark:to-primary/40 blur-lg opacity-80" />
            <div className="relative rounded-xl bg-white/90 dark:bg-slate-800/90 backdrop-blur-sm p-3 shadow-xl border border-white/60 dark:border-slate-600/50">
              <Image
                src="/ignizia-logo.png"
                alt=""
                width={44}
                height={44}
                className="object-contain"
              />
            </div>
          </div>
          <p className="text-xs font-bold text-action dark:text-brand-blue uppercase tracking-[0.3em] mb-2">
            Welcome back
          </p>
          <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight font-display bg-gradient-to-r from-primary via-primary to-action bg-clip-text text-transparent dark:from-white dark:via-slate-200 dark:to-action">
            {persona.name}
          </h1>
          <p className="text-base text-slate-500 dark:text-slate-400 mt-1 font-medium">
            {persona.roleLabel}
          </p>
        </div>

        {/* Support card */}
        <div className="auth-slide-up auth-slide-up-1">
          <div className="rounded-2xl bg-white/80 dark:bg-slate-800/80 backdrop-blur-xl border border-slate-200/60 dark:border-slate-600/50 shadow-2xl shadow-slate-200/50 dark:shadow-slate-900/50 overflow-hidden relative">
            <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-action/50 to-transparent" />
            <div className="relative overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-r from-action/15 via-brand-blue/10 to-transparent dark:from-action/20 dark:via-brand-blue/15" />
              <div className="relative border-l-4 border-action px-6 py-5">
                <h2 className="text-sm font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider">
                  How IGNIZIA supports you
                </h2>
              </div>
            </div>
            <ul className="px-6 py-6 space-y-4 relative">
              {supportItems.map((item, i) => (
                <li
                  key={i}
                  className="flex gap-4 text-sm text-slate-700 dark:text-slate-300 leading-relaxed"
                >
                  <span
                    className="shrink-0 w-2 h-2 rounded-full bg-action mt-1.5"
                    aria-hidden
                  />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Focus goal */}
        {focusGoal && (
          <div className="mt-6 auth-slide-up auth-slide-up-2">
            <div className="rounded-xl bg-gradient-to-r from-primary/10 to-action/10 dark:from-primary/15 dark:to-action/15 border border-primary/20 dark:border-primary/30 px-6 py-4">
              <p className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest mb-1.5">
                Your focus
              </p>
              <p className="text-base font-semibold text-primary dark:text-slate-200">
                {focusGoal}
              </p>
            </div>
          </div>
        )}

        {/* CTA */}
        <div className="mt-10 auth-slide-up auth-slide-up-3">
          <Button
            variant="primary"
            size="lg"
            fullWidth
            onClick={onEnter}
            className="font-semibold shadow-lg shadow-action/30 hover:shadow-xl hover:shadow-action/40 hover:scale-[1.02] active:scale-[0.98] transition-all duration-200"
          >
            Enter platform
          </Button>
        </div>
      </div>
    </div>
  );
}
