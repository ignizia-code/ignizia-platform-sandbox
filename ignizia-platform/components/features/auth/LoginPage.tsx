'use client';

import React, { useState, useEffect } from 'react';
import Image from 'next/image';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, Zap, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import ParticleGrid from './ParticleGrid';
import SystemBootOverlay from './SystemBootOverlay';
import type { User } from '@/types';

type LoginEmployee = {
  id: string;
  name: string;
  roleId: string;
  roleName: string;
};

interface LoginPageProps {
  onLogin: (user: User, employee: LoginEmployee) => void;
}

const easeOutExpo = [0.22, 1, 0.36, 1] as const;

export default function LoginPage({ onLogin }: LoginPageProps) {
  const [employees, setEmployees] = useState<LoginEmployee[]>([]);
  const [query, setQuery] = useState('');
  const [selectedEmployee, setSelectedEmployee] = useState<LoginEmployee | null>(null);
  const [showRolePreview, setShowRolePreview] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [transitionData, setTransitionData] = useState<{ user: User; employee: LoginEmployee } | null>(null);

  const roleResponsibilitiesByRoleName: Record<string, string[]> = {
    'chief executives': [
      'Set site direction and strategic priorities',
      'Approve major operational and investment decisions',
      'Review plant-wide performance, risk, and compliance',
      'Align leadership teams on quarterly execution goals',
    ],
    'general and operations managers': [
      'Coordinate day-to-day cross-functional factory operations',
      'Track throughput, quality, and delivery performance',
      'Resolve escalations across production and support teams',
      'Drive process discipline and continuous improvement',
    ],
    'human resources managers': [
      'Lead workforce planning and staffing',
      'Oversee training, readiness, and performance cycles',
      'Manage employee relations and policy adherence',
      'Coordinate with operations on capability gaps',
    ],
    'manufacturing engineers': [
      'Optimize manufacturing process flows and standards',
      'Improve reliability, yield, and cycle time performance',
      'Design and validate process changes on the floor',
      'Support technical problem solving during incidents',
    ],
    'sales representatives, wholesale and manufacturing': [
      'Manage customer demand and account communication',
      'Translate order signals into production-relevant priorities',
      'Coordinate commitments with operations and planning',
      'Maintain forecast quality and pipeline clarity',
    ],
    'sales representatives, wholesale and manufacturing, technical and scientific products': [
      'Own technical customer relationships and order quality',
      'Validate specs and feasibility with operations',
      'Coordinate delivery expectations and issue resolution',
      'Support demand planning accuracy for technical lines',
    ],
    'stone cutters and carvers, manufacturing': [
      'Execute cutting and shaping tasks to specification',
      'Maintain precision, safety, and material efficiency',
      'Perform quality checks during production steps',
      'Escalate defects and tool issues promptly',
    ],
    'potters, manufacturing': [
      'Run forming and finishing operations to standard',
      'Ensure output consistency and quality compliance',
      'Maintain equipment readiness and workspace safety',
      'Coordinate handoffs with upstream and downstream teams',
    ],
  };

  const getRoleResponsibilities = (roleName: string): string[] => {
    const normalizedRoleName = roleName.trim().toLowerCase();
    if (roleResponsibilitiesByRoleName[normalizedRoleName]) {
      return roleResponsibilitiesByRoleName[normalizedRoleName];
    }
    if (normalizedRoleName.startsWith('sales representatives, wholesale and manufacturing')) {
      return roleResponsibilitiesByRoleName['sales representatives, wholesale and manufacturing']!;
    }
    return [
      'Execute role tasks according to approved standards',
      'Collaborate across teams to maintain operational flow',
      'Escalate risks and blockers early with clear context',
      'Continuously improve quality, safety, and delivery outcomes',
    ];
  };

  useEffect(() => {
    fetch('/api/auth/employees')
      .then((res) => res.json())
      .then((data: LoginEmployee[]) => {
        setEmployees(data);
      })
      .catch(() => setError('Could not load employee directory'))
      .finally(() => setLoading(false));
  }, []);

  const suggestions = query.trim()
    ? employees.filter((employee) => employee.name.toLowerCase().includes(query.trim().toLowerCase())).slice(0, 8)
    : employees.slice(0, 8);

  const handleContinueLogin = async () => {
    if (!selectedEmployee) return;
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ employeeId: selectedEmployee.id }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? 'Login failed');
      }
      const { user, employee } = await res.json();

      // Check for reduced motion preference
      const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      if (prefersReducedMotion) {
        onLogin(user, employee);
        return;
      }

      // Start cinematic transition
      setTransitionData({ user, employee });
      setIsTransitioning(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed');
    } finally {
      setSubmitting(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedEmployee) return;
    setShowSuggestions(false);
    setShowRolePreview(true);
  };

  return (
    <>
      <motion.div
        className="min-h-screen w-full flex items-center justify-center p-6 relative overflow-hidden bg-slate-950"
        animate={
          isTransitioning
            ? { opacity: 0, scale: 0.95, y: -20 }
            : { opacity: 1, scale: 1, y: 0 }
        }
        transition={
          isTransitioning
            ? { duration: 0.4, ease: 'easeIn' }
            : { duration: 0 }
        }
      >
        {/* Particle grid background */}
        <ParticleGrid />

        {/* Circuit grid pattern overlay */}
        <div className="absolute inset-0 -z-[1] login-grid-pattern" aria-hidden="true" />

        {/* Subtle radial gradients for depth */}
        <div
          className="absolute inset-0 bg-[radial-gradient(ellipse_60%_40%_at_50%_-10%,rgba(6,186,246,0.1),transparent)]"
          aria-hidden="true"
        />
        <div
          className="absolute inset-0 bg-[radial-gradient(ellipse_40%_40%_at_80%_80%,rgba(6,52,114,0.12),transparent)]"
          aria-hidden="true"
        />

        <div className="w-full max-w-sm relative z-10">
          {/* Brand block */}
          <motion.div
            className="flex flex-col items-center text-center mb-12"
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, ease: easeOutExpo }}
          >
            <div className="relative mb-6">
              <div className="absolute -inset-4 rounded-3xl bg-brand-blue/10 blur-2xl" aria-hidden="true" />
              <div className="relative rounded-2xl bg-slate-900/90 backdrop-blur-sm p-4 shadow-2xl border border-slate-700/50 logo-glow">
                <Image
                  src="/ignizia-logo.png"
                  alt="IGNIZIA"
                  width={64}
                  height={64}
                  className="object-contain"
                />
              </div>
            </div>
            <h1 className="text-5xl font-extrabold tracking-tight font-display text-white">
              IGNIZIA
            </h1>
            <p className="text-xs text-brand-blue mt-3 tracking-[0.3em] uppercase font-medium">
              The Living Intelligence Platform
            </p>
            {/* Animated divider line */}
            <motion.div
              className="mt-4 h-px bg-gradient-to-r from-transparent via-brand-blue/40 to-transparent"
              initial={{ width: 0 }}
              animate={{ width: 60 }}
              transition={{ duration: 0.8, delay: 0.5, ease: easeOutExpo }}
            />
          </motion.div>

          {/* Form card */}
          <motion.form
            onSubmit={handleSubmit}
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.15, ease: easeOutExpo }}
          >
            <div className="rounded-2xl bg-slate-900/80 backdrop-blur-xl border border-slate-700/50 shadow-2xl shadow-black/30 p-6 relative overflow-hidden">
              {/* Top accent line */}
              <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-brand-blue/50 to-transparent" />

              {loading ? (
                <div className="space-y-4">
                  <div className="h-4 w-24 rounded-lg bg-slate-700 animate-pulse" />
                  <div className="h-12 rounded-xl bg-slate-800 animate-pulse" />
                </div>
              ) : (
                <AnimatePresence mode="wait">
                  {!showRolePreview ? (
                    <motion.div
                      key="search"
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -20 }}
                      transition={{ duration: 0.3 }}
                      className="space-y-2"
                    >
                      <label htmlFor="employee-login" className="block text-sm font-medium text-slate-300">
                        Sign in as employee
                      </label>
                      <div className="relative">
                        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none" />
                        <input
                          id="employee-login"
                          value={query}
                          onChange={(event) => {
                            setQuery(event.target.value);
                            setSelectedEmployee(null);
                            setShowSuggestions(true);
                          }}
                          onFocus={() => setShowSuggestions(true)}
                          placeholder="Start typing a name..."
                          className="w-full rounded-xl border border-slate-600 bg-slate-800 pl-9 pr-3 py-2.5 text-sm text-white placeholder:text-slate-500 focus:border-brand-blue focus:outline-none focus:ring-1 focus:ring-brand-blue/30 transition-colors"
                          autoComplete="off"
                        />
                        {showSuggestions && suggestions.length > 0 && (
                          <div className="absolute z-30 mt-1 max-h-60 w-full overflow-y-auto rounded-xl border border-slate-700 bg-slate-800 shadow-xl shadow-black/40">
                            {suggestions.map((employee) => (
                              <button
                                key={employee.id}
                                type="button"
                                onMouseDown={(event) => event.preventDefault()}
                                onClick={() => {
                                  setSelectedEmployee(employee);
                                  setQuery(employee.name);
                                  setShowSuggestions(false);
                                }}
                                className="w-full border-b border-slate-700/50 px-3 py-2 text-left text-sm last:border-b-0 hover:bg-brand-blue/10 transition-colors"
                              >
                                <div className="font-medium text-white">{employee.name}</div>
                                <div className="text-xs text-slate-400">
                                  {employee.roleName}
                                </div>
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                      {selectedEmployee && (
                        <p className="text-xs text-slate-400">
                          Selected <span className="font-semibold text-white">{selectedEmployee.name}</span>{' '}
                          <span className="text-brand-blue">({selectedEmployee.roleName})</span>
                        </p>
                      )}
                    </motion.div>
                  ) : (
                    <motion.div
                      key="preview"
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: 20 }}
                      transition={{ duration: 0.3 }}
                      className="space-y-4"
                    >
                      <div>
                        <p className="text-xs font-bold text-brand-blue uppercase tracking-wider">
                          Role preview
                        </p>
                        <h2 className="mt-1 text-xl font-bold text-white">
                          {selectedEmployee?.name}
                        </h2>
                        <p className="text-sm text-brand-blue/80">
                          {selectedEmployee?.roleName}
                        </p>
                      </div>

                      <div className="rounded-xl border-l-2 border-brand-blue/40 bg-slate-800/60 p-4">
                        <p className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3">
                          Core responsibilities
                        </p>
                        <ul className="space-y-2.5">
                          {getRoleResponsibilities(selectedEmployee?.roleName ?? '').map((item, i) => (
                            <motion.li
                              key={item}
                              className="flex items-start gap-2.5 text-sm text-slate-300"
                              initial={{ opacity: 0, x: -10 }}
                              animate={{ opacity: 1, x: 0 }}
                              transition={{ duration: 0.3, delay: i * 0.08 }}
                            >
                              <Zap size={14} className="mt-0.5 text-brand-blue shrink-0" />
                              <span>{item}</span>
                            </motion.li>
                          ))}
                        </ul>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              )}

              {error && (
                <p
                  className="mt-3 text-sm text-danger flex items-center gap-2"
                  role="alert"
                >
                  <span className="inline-block w-1.5 h-1.5 rounded-full bg-danger" />
                  {error}
                </p>
              )}

              {!showRolePreview ? (
                <Button
                  type="submit"
                  variant="primary"
                  size="lg"
                  fullWidth
                  className="mt-6 font-semibold shadow-lg shadow-brand-blue/20 hover:shadow-xl hover:shadow-brand-blue/30 hover:scale-[1.02] active:scale-[0.98] transition-all duration-200"
                  disabled={loading || submitting || !selectedEmployee}
                >
                  Review role
                </Button>
              ) : (
                <div className="mt-6 flex gap-2">
                  <Button
                    type="button"
                    variant="secondary"
                    size="lg"
                    fullWidth
                    onClick={() => setShowRolePreview(false)}
                    disabled={submitting}
                    className="border-slate-600 bg-slate-800 text-slate-200 hover:bg-slate-700"
                  >
                    <ArrowLeft size={16} className="mr-1.5" />
                    Back
                  </Button>
                  <Button
                    type="button"
                    variant="primary"
                    size="lg"
                    fullWidth
                    onClick={handleContinueLogin}
                    disabled={submitting || !selectedEmployee}
                    className="font-semibold shadow-lg shadow-brand-blue/20 hover:shadow-xl hover:shadow-brand-blue/30 hover:scale-[1.02] active:scale-[0.98] transition-all duration-200"
                  >
                    {submitting ? 'Signing in\u2026' : 'Enter platform'}
                  </Button>
                </div>
              )}
            </div>
          </motion.form>

          <motion.p
            className="mt-8 text-center text-xs text-slate-600 tracking-widest uppercase"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.3, ease: easeOutExpo }}
          >
            Your employee role powers your experience
          </motion.p>
        </div>
      </motion.div>

      {/* Cinematic boot transition overlay */}
      <AnimatePresence>
        {isTransitioning && selectedEmployee && transitionData && (
          <SystemBootOverlay
            employeeName={selectedEmployee.name}
            roleName={selectedEmployee.roleName}
            onComplete={() => {
              onLogin(transitionData.user, transitionData.employee);
            }}
          />
        )}
      </AnimatePresence>
    </>
  );
}
