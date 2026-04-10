'use client';

import React, { useState } from 'react';

const MOCK_RESPONSES: Record<string, string> = {
  'simulate running overtime saturday': 'Throughput +5%, Crew readiness -2%',
  'overtime saturday': 'Throughput +5%, Crew readiness -2%',
  'add shift': 'Throughput +3%, Latency -0.5h',
  'increase speed': 'Throughput +5%, Utilization +2%',
  default: 'Throughput +3%, Crew readiness -1%',
};

function getMockResponse(input: string): string {
  const lower = input.toLowerCase().trim();
  for (const [key, value] of Object.entries(MOCK_RESPONSES)) {
    if (key !== 'default' && lower.includes(key)) return value;
  }
  return MOCK_RESPONSES.default;
}

interface AskIgniziaSimulationProps {
  onResult?: (result: string) => void;
}

/**
 * Ask Ignizia simulation input - returns mock KPI changes.
 * Purely UI; no backend or Omniverse.
 */
export function AskIgniziaSimulation({ onResult }: AskIgniziaSimulationProps) {
  const [value, setValue] = useState('');
  const [result, setResult] = useState<string | null>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!value.trim()) return;
    const mock = getMockResponse(value);
    setResult(mock);
    onResult?.(mock);
  };

  return (
    <div className="flex items-center gap-2">
      <form onSubmit={handleSubmit} className="flex-1 flex gap-2 max-w-md">
        <input
          type="text"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder="Ask Ignizia simulation (e.g. simulate running overtime Saturday)"
          className="flex-1 px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 text-sm placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-action/50"
        />
        <button
          type="submit"
          className="px-4 py-2 rounded-lg bg-action text-white hover:bg-action/90 font-medium text-sm shrink-0"
        >
          Simulate
        </button>
      </form>
      {result && (
        <div className="px-3 py-1.5 rounded-lg bg-success/10 text-success text-sm font-medium">
          {result}
        </div>
      )}
    </div>
  );
}
