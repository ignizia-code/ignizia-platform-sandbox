'use client';

import React, { useState } from 'react';

export interface SimulationOption {
  id: string;
  label: string;
  mockResult: string;
}

const DEFAULT_OPTIONS: SimulationOption[] = [
  { id: 'overtime', label: 'Add overtime shift', mockResult: '+3% throughput, -0.5h latency' },
  { id: 'machine', label: 'Increase machine speed 5%', mockResult: '+5% throughput, +2% utilization' },
  { id: 'defects', label: 'Reduce defects 2%', mockResult: '-2% rework rate, +1% first-time-right' },
];

export interface SimulationModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  options?: SimulationOption[];
}

/**
 * Cosmetic simulation modal - returns mock results on option select.
 * No real calculations; hardcoded mock responses.
 */
export function SimulationModal({
  isOpen,
  onClose,
  title = 'Simulate Scenario',
  options = DEFAULT_OPTIONS,
}: SimulationModalProps) {
  const [selectedResult, setSelectedResult] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSelect = (opt: SimulationOption) => {
    setSelectedResult(opt.mockResult);
  };

  const handleClose = () => {
    setSelectedResult(null);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 animate-in fade-in duration-200">
      <div className="bg-white dark:bg-card-dark rounded-2xl shadow-xl border border-slate-200 dark:border-slate-700 max-w-md w-full p-6 animate-in zoom-in-95 duration-200">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-bold text-slate-900 dark:text-slate-100">{title}</h3>
          <button
            onClick={handleClose}
            className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500"
          >
            <span className="material-icons-round text-lg">close</span>
          </button>
        </div>
        <p className="text-sm text-slate-500 dark:text-slate-400 mb-4">
          Select a scenario to see simulated impact (mock results).
        </p>
        <div className="space-y-2">
          {options.map((opt) => (
            <button
              key={opt.id}
              onClick={() => handleSelect(opt)}
              className="w-full text-left px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 hover:border-action hover:bg-action/5 dark:hover:bg-action/10 transition-colors"
            >
              <span className="font-medium text-slate-800 dark:text-slate-200">{opt.label}</span>
            </button>
          ))}
        </div>
        {selectedResult && (
          <div className="mt-4 p-4 rounded-xl bg-success/10 border border-success/20 text-success dark:bg-success/20 dark:text-success">
            <div className="text-xs font-semibold uppercase mb-1">Simulated result</div>
            <div className="font-medium">{selectedResult}</div>
          </div>
        )}
        <div className="mt-6 flex justify-end">
          <button
            onClick={handleClose}
            className="px-4 py-2 rounded-lg bg-primary text-white hover:bg-primary/90 font-medium"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
