'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle2, Shield, Link2, ChevronDown, Copy, Check, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui';

interface Credential {
  id: string;
  name: string;
  expiry: string;
  issuer: string;
  verified?: boolean;
}

const credentials: Credential[] = [
  { id: 'c1', name: 'Robotics Calibration', expiry: 'Dec 2026', issuer: 'IGNIZIA Workforce', verified: true },
  { id: 'c2', name: 'Safety Compliance', expiry: 'Dec 2025', issuer: 'IGNIZIA Workforce', verified: true },
  { id: 'c3', name: 'Assembly Operations', expiry: 'Jun 2026', issuer: 'IGNIZIA Workforce', verified: true },
];

export function PortableCredentialsCard() {
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [verifyingId, setVerifyingId] = useState<string | null>(null);
  const [verifiedIds, setVerifiedIds] = useState<Set<string>>(new Set(credentials.map((c) => c.id)));

  const handleCopy = (id: string, name: string) => {
    const url = `https://credentials.ignizia.demo/verify/${id}`;
    void navigator.clipboard.writeText(url);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleVerify = (id: string) => {
    setVerifyingId(id);
    setTimeout(() => {
      setVerifiedIds((prev) => new Set(prev).add(id));
      setVerifyingId(null);
    }, 1200);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.6 }}
      className="rounded-2xl border border-slate-200 bg-card-light p-6 shadow-lg"
    >
      <div className="mb-6">
        <div className="inline-flex items-center gap-2 rounded-lg bg-primary/10 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide text-primary">
          <Shield className="h-3.5 w-3.5" />
          Verified Skills
        </div>
        <h3 className="mt-2 text-lg font-bold text-slate-900">Portable Credentials</h3>
        <p className="text-sm text-slate-500">Verifiable workforce credentials</p>
      </div>

      <div className="space-y-3">
        {credentials.map((c, i) => {
          const isExpanded = expandedId === c.id;
          const isVerified = verifiedIds.has(c.id);
          const isVerifying = verifyingId === c.id;
          const justCopied = copiedId === c.id;
          return (
            <motion.div
              key={c.id}
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.65 + i * 0.05 }}
              className={`rounded-xl border overflow-hidden ${
                isExpanded ? 'border-brand-blue/30 bg-brand-blue/5' : 'border-slate-200 bg-slate-50'
              }`}
            >
              <button
                type="button"
                onClick={() => setExpandedId(isExpanded ? null : c.id)}
                className="flex w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-slate-100/80"
              >
                <CheckCircle2 className="h-5 w-5 shrink-0 text-success" />
                <span className="flex-1 font-medium text-slate-900">{c.name}</span>
                <ChevronDown
                  className={`h-4 w-4 shrink-0 text-slate-400 transition-transform ${
                    isExpanded ? 'rotate-180' : ''
                  }`}
                />
              </button>
              <AnimatePresence>
                {isExpanded && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="border-t border-slate-200/80 bg-white"
                  >
                    <div className="px-4 py-3 space-y-2 text-sm text-slate-600">
                      <p>Expires: {c.expiry}</p>
                      <p>Issuer: {c.issuer}</p>
                      <p className="flex items-center gap-1.5 text-success">
                        <Shield className="h-4 w-4" />
                        {isVerified ? 'Blockchain verified' : 'Verification pending'}
                      </p>
                    </div>
                    <div className="flex flex-wrap gap-2 px-4 pb-3">
                      <Button
                        variant="secondary"
                        size="sm"
                        className="gap-1.5"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleCopy(c.id, c.name);
                        }}
                      >
                        {justCopied ? (
                          <Check className="h-4 w-4 text-success" />
                        ) : (
                          <Copy className="h-4 w-4" />
                        )}
                        {justCopied ? 'Copied!' : 'Copy link'}
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="gap-1.5"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleVerify(c.id);
                        }}
                        disabled={isVerifying || isVerified}
                      >
                        {isVerifying ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : isVerified ? (
                          <Check className="h-4 w-4 text-success" />
                        ) : (
                          <Shield className="h-4 w-4" />
                        )}
                        {isVerifying ? 'Verifying...' : isVerified ? 'Verified' : 'Verify'}
                      </Button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          );
        })}
      </div>

      <div className="mt-6 flex flex-wrap items-center gap-4 rounded-xl border border-brand-blue/20 bg-brand-blue/5 px-4 py-3">
        <div className="flex items-center gap-2 text-sm">
          <Shield className="h-4 w-4 text-brand-blue" />
          <span className="text-slate-700">Blockchain Verified</span>
        </div>
        <div className="flex items-center gap-2 text-sm">
          <Link2 className="h-4 w-4 text-brand-green" />
          <span className="text-slate-700">Portable Across Sites</span>
        </div>
      </div>
    </motion.div>
  );
}
