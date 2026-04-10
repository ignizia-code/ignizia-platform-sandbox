'use client';

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import type {
  Initiative,
  InitiativeGuardrails,
  Objective,
  StrategyCopilotMessage,
} from '@/types';
import type { PropagationUnit } from '@/types/strategy';
import type { PropagationGraph } from '@/types/propagation';
import { loadAllObjectives, loadInitiativesByObjectiveId } from '@/lib/objectiveStorage';
import {
  createStrategyFromGoal,
  resetAllStrategyData,
  savePropagationUnits,
  seedPropagationUnits,
  saveObjective,
  saveInitiative,
} from '@/lib/strategyStorage';
import { expandStrategyPropagation } from '@/lib/propagation';
import PropagationOverlay from './OrgLensView';

// ---------------------------------------------------------------------------
// Constants & helpers
// ---------------------------------------------------------------------------

const DEFAULT_GUARDRAILS: InitiativeGuardrails = {
  maxSpeed: 2.5,
  maxErrorRate: 0.05,
  maxDropCount: 3,
  emergencyStopThreshold: 0.12,
};

const SUGGESTION_PROMPTS = [
  'Increase overall factory throughput by 12% without increasing overtime',
  'Cut defect rate by 25% on the cardbox line with stable safety',
  'Take 8% cost out of Line B while protecting quality and crew readiness',
];

type ExecLens = 'throughput' | 'cost' | 'safety' | 'people';

type ExecChat = {
  id: string;
  messages: StrategyCopilotMessage[];
  title: string;
  objectiveId: string | null;
  createdAt: number;
};

const EXEC_CHATS_KEY = 'exec-strategy:chats';

function loadExecChats(): ExecChat[] {
  try {
    const raw = typeof window !== 'undefined' ? localStorage.getItem(EXEC_CHATS_KEY) : null;
    if (!raw) return [];
    return JSON.parse(raw) as ExecChat[];
  } catch { return []; }
}

function saveExecChats(chats: ExecChat[]): void {
  try {
    if (typeof window !== 'undefined') localStorage.setItem(EXEC_CHATS_KEY, JSON.stringify(chats));
  } catch { /* ignore */ }
}

function newExecChat(): ExecChat {
  return {
    id: `echat-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
    messages: [],
    title: 'New strategy',
    objectiveId: null,
    createdAt: Date.now(),
  };
}

function mapStageLabel(status: Objective['status']): { label: string; cls: string } {
  switch (status) {
    case 'validated': return { label: 'Validated', cls: 'bg-success/10 text-success' };
    case 'trial': return { label: 'Rehearsing', cls: 'bg-warning/10 text-warning' };
    case 'rolled_back': return { label: 'On Hold', cls: 'bg-danger/10 text-danger' };
    default: return { label: 'Designing', cls: 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300' };
  }
}

function deriveRiskAndCost(init: Initiative | null): { risk: 'Low' | 'Medium' | 'High'; costBand: string } {
  if (!init) return { risk: 'Medium', costBand: '$0.8M–$1.2M' };
  const conservative = init.guardrails.maxErrorRate <= 0.05 && init.guardrails.maxDropCount <= 3 && init.guardrails.emergencyStopThreshold <= 0.12;
  const risk: 'Low' | 'Medium' | 'High' = conservative ? 'Low' : init.automationLiftPercent > 15 ? 'High' : 'Medium';
  const costBand = init.automationLiftPercent >= 18 ? '$1.5M–$2.0M' : init.automationLiftPercent >= 12 ? '$0.9M–$1.3M' : '$0.4M–$0.8M';
  return { risk, costBand };
}

const METRIC_COLORS: Record<ExecLens, { hex: string; tw: string }> = {
  throughput: { hex: '#06BAF6', tw: 'text-brand-blue' },
  cost: { hex: '#FAB61F', tw: 'text-brand-orange' },
  safety: { hex: '#2DC37C', tw: 'text-brand-green' },
  people: { hex: '#E8347E', tw: 'text-brand-pink' },
};

const STATE_META: Record<PropagationUnit['state'], { label: string; cls: string; dot: string }> = {
  active: { label: 'Active', cls: 'bg-success/10 text-success', dot: 'bg-success' },
  validated: { label: 'Validated', cls: 'bg-brand-blue/10 text-brand-blue', dot: 'bg-brand-blue' },
  in_progress: { label: 'In Progress', cls: 'bg-warning/10 text-warning', dot: 'bg-warning' },
  not_started: { label: 'Not Started', cls: 'bg-slate-100 dark:bg-slate-800 text-slate-500', dot: 'bg-slate-400' },
  on_hold: { label: 'On Hold', cls: 'bg-danger/10 text-danger', dot: 'bg-danger' },
};

const DOMAIN_ICONS: Record<string, string> = {
  'Production Lines': 'precision_manufacturing',
  'Quality & Safety': 'health_and_safety',
  'Logistics': 'local_shipping',
  'Workforce': 'groups',
};

const DOMAIN_RELEVANCE: Record<string, string> = {
  'Production Lines': 'Core value engine for this strategy — delivering early impact, but procurement delays are slowing full activation.',
  'Quality & Safety': 'Gateway to company-wide scale — expansion cannot proceed until compliance and certification are cleared.',
  'Logistics': 'Validates the strategy beyond production — adoption is healthy and reinforcing momentum.',
  'Workforce': 'Adoption is lagging — readiness gaps and missing accountability risk the entire rollout timeline.',
};

// ---------------------------------------------------------------------------
// Action derivation
// ---------------------------------------------------------------------------

interface DerivedAction {
  id: string;
  description: string;
  priority: 'high' | 'medium' | 'low';
  targetUnitId: string;
  targetUnitName: string;
  domain: string;
  type: 'approve' | 'assign' | 'unblock' | 'escalate' | 'halt' | 'prioritize';
  icon: string;
  cta: string;
  consequence: string;
}

function deriveActions(units: PropagationUnit[]): DerivedAction[] {
  const actions: DerivedAction[] = [];

  const domainGroups = new Map<string, PropagationUnit[]>();
  for (const u of units) {
    if (!domainGroups.has(u.group)) domainGroups.set(u.group, []);
    domainGroups.get(u.group)!.push(u);
  }

  for (const u of units) {
    if (u.state === 'on_hold') continue;

    for (const b of u.blockers) {
      if (!b.escalated) {
        actions.push({
          id: `act-esc-${u.id}-${b.text.slice(0, 8)}`,
          description: `Unblock ${u.group}: ${b.text.replace(/ — .*/, '')}`,
          priority: 'high',
          targetUnitId: u.id, targetUnitName: u.name, domain: u.group, type: 'escalate',
          icon: 'priority_high', cta: 'Escalate',
          consequence: `${u.group} propagation is stalled — this blocker prevents company-wide scale`,
        });
      }
    }

    if (u.owner === null && u.state !== 'validated') {
      actions.push({
        id: `act-assign-${u.id}`,
        description: `Assign accountability in ${u.group}`,
        priority: 'high',
        targetUnitId: u.id, targetUnitName: u.name, domain: u.group, type: 'assign',
        icon: 'person_add', cta: 'Assign',
        consequence: `No designated owner in ${u.group} — rollout has no point of accountability`,
      });
    }

    if (!u.readiness.approved && u.state === 'not_started') {
      actions.push({
        id: `act-approve-${u.id}`,
        description: `Authorize rollout in ${u.group}`,
        priority: 'high',
        targetUnitId: u.id, targetUnitName: u.name, domain: u.group, type: 'approve',
        icon: 'check_circle', cta: 'Approve',
        consequence: `${u.group} cannot begin adoption until leadership authorizes the rollout`,
      });
    }

    if (!u.readiness.trained && (u.state === 'in_progress' || u.state === 'active')) {
      actions.push({
        id: `act-train-${u.id}`,
        description: `Resolve readiness gap in ${u.group}`,
        priority: 'medium',
        targetUnitId: u.id, targetUnitName: u.name, domain: u.group, type: 'approve',
        icon: 'school', cta: 'Resolve',
        consequence: `${u.group} operating below readiness — increases risk of failure during scale`,
      });
    }
  }

  const activeWithImpact = units.filter((u) => (u.state === 'active' || u.state === 'validated') && u.impact);
  const notStarted = units.filter((u) => u.state === 'not_started');
  if (activeWithImpact.length > 0 && notStarted.length > 0) {
    const target = notStarted[0];
    actions.push({
      id: `act-expand-${target.id}`,
      description: `Expand strategy to ${target.group}`,
      priority: 'low',
      targetUnitId: target.id, targetUnitName: target.name, domain: target.group, type: 'prioritize',
      icon: 'trending_up', cta: 'Prioritize',
      consequence: `Active areas show strong results — delaying expansion misses the current momentum`,
    });
  }

  actions.sort((a, b) => {
    const pri = { high: 0, medium: 1, low: 2 };
    return pri[a.priority] - pri[b.priority];
  });

  return actions;
}

// ---------------------------------------------------------------------------
// Domain data derivation
// ---------------------------------------------------------------------------

interface DomainSummary {
  name: string;
  icon: string;
  units: PropagationUnit[];
  activeCount: number;
  blockedCount: number;
  notStartedCount: number;
  inProgressCount: number;
  totalCount: number;
  health: 'healthy' | 'at_risk' | 'blocked' | 'not_started';
  mainSignal: string;
  avgThroughput: number | null;
}

function deriveDomains(units: PropagationUnit[]): DomainSummary[] {
  const groups: Record<string, PropagationUnit[]> = {};
  for (const u of units) {
    if (!groups[u.group]) groups[u.group] = [];
    groups[u.group].push(u);
  }

  return Object.entries(groups).map(([name, domainUnits]) => {
    const activeCount = domainUnits.filter((u) => u.state === 'active' || u.state === 'validated').length;
    const blockedCount = domainUnits.filter((u) => u.blockers.some((b) => !b.escalated)).length;
    const notStartedCount = domainUnits.filter((u) => u.state === 'not_started').length;
    const inProgressCount = domainUnits.filter((u) => u.state === 'in_progress').length;

    let health: DomainSummary['health'] = 'not_started';
    if (blockedCount > 0) health = 'blocked';
    else if (activeCount > 0 && notStartedCount === 0) health = 'healthy';
    else if (inProgressCount > 0 || activeCount > 0) health = 'at_risk';

    let mainSignal = '';
    if (blockedCount > 0) mainSignal = `${blockedCount} blocker${blockedCount > 1 ? 's' : ''} active`;
    else if (activeCount === domainUnits.length) mainSignal = 'All units active';
    else if (notStartedCount > 0) mainSignal = `${notStartedCount} unit${notStartedCount > 1 ? 's' : ''} pending approval`;
    else if (inProgressCount > 0) mainSignal = `${inProgressCount} unit${inProgressCount > 1 ? 's' : ''} rolling out`;
    else mainSignal = 'On track';

    const impactUnits = domainUnits.filter((u) => u.impact);
    const avgThroughput = impactUnits.length > 0
      ? Math.round(impactUnits.reduce((s, u) => s + (u.impact?.throughputDelta ?? 0), 0) / impactUnits.length)
      : null;

    return {
      name, icon: DOMAIN_ICONS[name] ?? 'domain', units: domainUnits,
      activeCount, blockedCount, notStartedCount, inProgressCount,
      totalCount: domainUnits.length, health, mainSignal, avgThroughput,
    };
  });
}

function deriveRolloutPosture(counts: { active: number; in_progress: number; not_started: number; blocked: number; on_hold: number; validated: number }, total: number): { label: string; cls: string } {
  if (counts.blocked > 0) return { label: 'Blocked', cls: 'bg-danger/20 text-danger' };
  if (counts.active + counts.validated === total && total > 0) return { label: 'Complete', cls: 'bg-success/20 text-success' };
  if (counts.in_progress > counts.active) return { label: 'Expanding', cls: 'bg-brand-blue/20 text-brand-blue' };
  return { label: 'Stabilizing', cls: 'bg-warning/20 text-warning' };
}

function deriveNarrativeStory(dmns: DomainSummary[], units: PropagationUnit[]): string {
  const withImpact = dmns.filter((d) => d.avgThroughput !== null);
  const strongest = withImpact.length > 0
    ? [...withImpact].sort((a, b) => (b.avgThroughput ?? 0) - (a.avgThroughput ?? 0))[0]
    : null;

  const blockerDomain = dmns.find((d) => d.blockedCount > 0);
  const mainBlockerText = blockerDomain
    ? blockerDomain.units
        .flatMap((u) => u.blockers.filter((b) => !b.escalated).map((b) => b.text))
        .map((t) => t.replace(/ — .*/, '').toLowerCase())[0]
    : null;

  const weakest = dmns
    .filter((d) => d.health !== 'healthy' && d !== blockerDomain)
    .sort((a, b) => b.notStartedCount - a.notStartedCount)[0] ?? null;

  const parts: string[] = [];
  if (strongest) parts.push(`${strongest.name} delivering +${strongest.avgThroughput}% throughput.`);
  if (blockerDomain && mainBlockerText) parts.push(`Scale blocked by ${mainBlockerText}.`);
  else if (blockerDomain) parts.push(`${blockerDomain.name} has active blockers.`);
  if (weakest) parts.push(`${weakest.name} ${weakest.mainSignal.toLowerCase()}.`);

  return parts.join(' ') || 'Strategy rollout in progress across the organization.';
}

function deriveStrongestWeakest(dmns: DomainSummary[]): { strongest: string | null; weakest: string | null } {
  const withImpact = dmns.filter((d) => d.avgThroughput !== null);
  const sorted = [...withImpact].sort((a, b) => (b.avgThroughput ?? 0) - (a.avgThroughput ?? 0));
  const strongest = sorted[0]?.name ?? null;
  const weakest = dmns
    .filter((d) => d.health === 'blocked' || d.health === 'at_risk')
    .sort((a, b) => b.blockedCount - a.blockedCount || b.notStartedCount - a.notStartedCount)[0]?.name ?? null;
  return { strongest, weakest };
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

const SPARKLE_COLORS = ['#06BAF6', '#FAB61F', '#2DC37C', '#E8347E'];

function StrategySparkles() {
  const [sparkles, setSparkles] = useState<{ id: number; x: number; y: number; color: string; size: number; delay: number }[]>([]);

  useEffect(() => {
    let counter = 0;
    const spawn = () => {
      const batch = Array.from({ length: 3 }, () => ({
        id: counter++,
        x: 10 + Math.random() * 80,
        y: 40 + Math.random() * 50,
        color: SPARKLE_COLORS[Math.floor(Math.random() * SPARKLE_COLORS.length)],
        size: 6 + Math.random() * 8,
        delay: Math.random() * 0.3,
      }));
      setSparkles((prev) => [...prev.slice(-18), ...batch]);
    };
    spawn();
    const interval = setInterval(spawn, 700);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden">
      {sparkles.map((s) => (
        <svg key={s.id} className="exec-sparkle" style={{ left: `${s.x}%`, top: `${s.y}%`, width: s.size, height: s.size, animationDelay: `${s.delay}s` }} viewBox="0 0 24 24" fill={s.color}>
          <path d="M12 0l2.5 9.5L24 12l-9.5 2.5L12 24l-2.5-9.5L0 12l9.5-2.5z" />
        </svg>
      ))}
    </div>
  );
}

export default function ExecutiveStrategyStudio() {
  const [objectives, setObjectives] = useState<Objective[]>([]);
  const [selectedLens, setSelectedLens] = useState<Record<string, ExecLens>>({});
  const [transitioningId, setTransitioningId] = useState<string | null>(null);
  const [strategySearch, setStrategySearch] = useState('');

  const [studioView, setStudioView] = useState<'overview' | 'detail'>('overview');
  const [detailObjectiveId, setDetailObjectiveId] = useState<string | null>(null);

  const [propagationUnits, setPropagationUnits] = useState<PropagationUnit[]>([]);
  const [propagationGraph, setPropagationGraph] = useState<PropagationGraph | null>(null);
  const [expandedDomain, setExpandedDomain] = useState<string | null>(null);
  const [focusedActionId, setFocusedActionId] = useState<string | null>(null);
  const [showRemainingActions, setShowRemainingActions] = useState(false);
  const [showPropagationMap, setShowPropagationMap] = useState(false);
  const podiumCardRefs = useRef<Record<string, HTMLDivElement | null>>({});

  const [advisorInput, setAdvisorInput] = useState('');
  const [advisorResponse, setAdvisorResponse] = useState<string | null>(null);
  const [advisorLoading, setAdvisorLoading] = useState(false);
  const advisorEndRef = useRef<HTMLDivElement | null>(null);

  const [isCreatingStrategy, setIsCreatingStrategy] = useState(false);
  const createAnimStartRef = useRef<number>(0);

  const [chats, setChats] = useState<ExecChat[]>(() => {
    const loaded = loadExecChats();
    if (loaded.length) return loaded;
    const fresh = newExecChat();
    saveExecChats([fresh]);
    return [fresh];
  });
  const [activeChatId, setActiveChatId] = useState<string>(() => {
    const loaded = loadExecChats();
    return loaded[0]?.id ?? '';
  });
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [input, setInput] = useState('');
  const [isThinking, setIsThinking] = useState(false);
  const chatEndRef = useRef<HTMLDivElement | null>(null);
  const focusOpenTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const focusCloseTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const focusGraceRef = useRef(false);

  const activeChat = chats.find((c) => c.id === activeChatId) ?? null;
  const messages = activeChat?.messages ?? [];

  const refreshObjectives = useCallback(() => setObjectives(loadAllObjectives()), []);

  useEffect(() => { refreshObjectives(); }, [refreshObjectives]);
  useEffect(() => { chatEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages, isThinking]);

  const persistChats = useCallback((next: ExecChat[]) => {
    setChats(next);
    saveExecChats(next);
  }, []);

  // Build propagation context for LLM
  const buildPropagationContext = useCallback((objectiveId: string) => {
    const units = seedPropagationUnits(objectiveId);
    const domainList = deriveDomains(units);
    const impactUnits = units.filter((u) => u.impact);
    const avg = (key: 'throughputDelta' | 'defectDelta' | 'costDelta') =>
      impactUnits.length > 0
        ? Math.round(impactUnits.reduce((s, u) => s + (u.impact?.[key] ?? 0), 0) / impactUnits.length)
        : 0;

    const sw = deriveStrongestWeakest(domainList);

    const obj = objectives.find((o) => o.id === objectiveId);
    const graph = expandStrategyPropagation(objectiveId, obj?.name ?? 'Strategy');

    return {
      domains: domainList.map((d) => ({
        name: d.name, unitCount: d.totalCount, activeCount: d.activeCount,
        blockedCount: d.blockedCount, notStartedCount: d.notStartedCount,
        mainBlocker: d.units.flatMap((u) => u.blockers.filter((b) => !b.escalated).map((b) => b.text))[0] ?? null,
      })),
      totalUnits: units.length,
      activeUnits: units.filter((u) => u.state === 'active' || u.state === 'validated').length,
      blockedUnits: units.filter((u) => u.blockers.some((b) => !b.escalated)).length,
      aggregateImpact: impactUnits.length > 0 ? { throughput: avg('throughputDelta'), defect: avg('defectDelta'), cost: avg('costDelta') } : null,
      topBlockers: units.flatMap((u) => u.blockers.filter((b) => !b.escalated).map((b) => `${b.text} (${u.name})`)),
      unassignedAreas: units.filter((u) => u.owner === null).map((u) => u.name),
      strongestDomain: sw.strongest,
      weakestDomain: sw.weakest,
      personas: graph.nodes.filter((n) => n.type === 'persona').map((n) => ({
        label: n.label, state: n.state, blockers: n.blockers.map((b) => b.text),
        readiness: n.readiness, nextDecision: n.nextDecision,
      })),
      departments: graph.nodes.filter((n) => n.type === 'department').map((n) => ({
        label: n.label, state: n.state, blockers: n.blockers.map((b) => b.text),
        readiness: n.readiness, nextDecision: n.nextDecision,
      })),
      gates: graph.nodes.flatMap((n) => n.gates).map((g) => ({
        name: g.name, status: g.status, type: g.type, blockingReason: g.blockingReason,
      })),
    };
  }, [objectives]);

  // ----- handleSend -----
  const handleSend = async () => {
    const goal = input.trim();
    if (!goal || isThinking || !activeChatId) return;

    const now = Date.now();
    const userMsg: StrategyCopilotMessage = { id: `em-${now}-u`, role: 'user', content: goal, timestamp: new Date(now).toISOString() };

    const currentChat = chats.find((c) => c.id === activeChatId);
    const isRefine = !!(currentChat?.objectiveId);

    const updatedChats = chats.map((c) =>
      c.id === activeChatId
        ? { ...c, messages: [...c.messages, userMsg], title: c.title === 'New strategy' ? goal.slice(0, 36) + (goal.length > 36 ? '…' : '') : c.title }
        : c,
    );
    persistChats(updatedChats);
    setInput('');
    setIsThinking(true);

    if (!isRefine) {
      setIsCreatingStrategy(true);
      createAnimStartRef.current = Date.now();
    }

    let existingStrategy: { objectiveName: string; targetPercent: number; guardrails: InitiativeGuardrails; automationLiftPercent: number } | null = null;
    let propagationContext = null;
    if (isRefine && currentChat?.objectiveId) {
      const obj = objectives.find((o) => o.id === currentChat.objectiveId);
      const init = obj ? loadInitiativesByObjectiveId(obj.id)[0] : null;
      if (obj && init) {
        existingStrategy = {
          objectiveName: obj.name,
          targetPercent: obj.targetPercent,
          guardrails: init.guardrails,
          automationLiftPercent: init.automationLiftPercent,
        };
      }
      propagationContext = buildPropagationContext(currentChat.objectiveId);
    }

    try {
      const res = await fetch('/api/strategy-copilot', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [...(currentChat?.messages ?? []), userMsg].map((m) => ({ role: m.role, content: m.content })),
          existingStrategy,
          propagationContext,
        }),
      });

      if (!res.ok) throw new Error('API error');

      const data = await res.json();
      const parsed = data.parsed as
        | {
            action?: 'create' | 'refine';
            strategyName?: string;
            targetPercent?: number;
            guardrails?: InitiativeGuardrails;
            automationLiftPercent?: number;
            summary?: string;
          }
        | null;
      const plainText: string = (data.response || '').trim();

      // Helper to append an assistant message to the active chat
      const appendAssistantMessage = (content: string) => {
        const assistantMsg: StrategyCopilotMessage = {
          id: `em-${Date.now()}-a`,
          role: 'assistant',
          content,
          timestamp: new Date().toISOString(),
        };
        const finalChats = updatedChats.map((c) =>
          c.id === activeChatId ? { ...c, messages: [...c.messages, assistantMsg] } : c,
        );
        persistChats(finalChats);
      };

      const ensureMinAnim = async () => {
        if (!isRefine) {
          const elapsed = Date.now() - createAnimStartRef.current;
          const remaining = 1800 - elapsed;
          if (remaining > 0) await new Promise((r) => setTimeout(r, remaining));
          setIsCreatingStrategy(false);
        }
      };

      if (!isRefine && !parsed) {
        await ensureMinAnim();
        const reply = plainText || 'Here is my assessment based on the current strategy context.';
        appendAssistantMessage(reply);
      } else if (isRefine && currentChat?.objectiveId) {
        const applyRefine = (p: typeof parsed) => {
          if (!p) return;
          const obj = objectives.find((o) => o.id === currentChat!.objectiveId);
          const init = obj ? loadInitiativesByObjectiveId(obj.id)[0] : null;
          if (obj && init) {
            if (p.strategyName) obj.name = p.strategyName;
            if (p.targetPercent) obj.targetPercent = p.targetPercent;
            obj.updatedAt = new Date().toISOString();
            saveObjective(obj);
            if (p.guardrails) init.guardrails = { ...init.guardrails, ...p.guardrails };
            if (p.automationLiftPercent) init.automationLiftPercent = p.automationLiftPercent;
            init.updatedAt = new Date().toISOString();
            saveInitiative(init);
            refreshObjectives();
          }
        };

        if (parsed && (parsed.action === 'refine' || parsed.action === 'create' || parsed.targetPercent)) {
          applyRefine(parsed);
        } else if (!parsed) {
          // Last resort: extract target number from the user's message
          const targetMatch = goal.match(/(\d+)\s*%/);
          if (targetMatch) {
            const newTarget = parseInt(targetMatch[1], 10);
            if (newTarget > 0 && newTarget <= 100 && existingStrategy && newTarget !== existingStrategy.targetPercent) {
              applyRefine({ targetPercent: newTarget });
            }
          }
        }

        const didChange = parsed?.targetPercent || parsed?.guardrails || parsed?.automationLiftPercent || parsed?.strategyName;
        const reply = plainText || parsed?.summary || (didChange ? 'Strategy updated.' : 'Here is my assessment.');
        appendAssistantMessage(reply);
      } else if (parsed && parsed.action === 'create') {
        await ensureMinAnim();
        const { objective, initiative } = createStrategyFromGoal(parsed.strategyName || goal);
        if (parsed.targetPercent) { objective.targetPercent = parsed.targetPercent; saveObjective(objective); }
        if (parsed.guardrails) { initiative.guardrails = { ...initiative.guardrails, ...parsed.guardrails }; saveInitiative(initiative); }
        if (parsed.automationLiftPercent) { initiative.automationLiftPercent = parsed.automationLiftPercent; saveInitiative(initiative); }

        seedPropagationUnits(objective.id);
        expandStrategyPropagation(objective.id, parsed.strategyName || goal);
        refreshObjectives();

        const reply = plainText || parsed.summary || `Strategy created: "${objective.name}"`;
        const assistantMsg: StrategyCopilotMessage = {
          id: `em-${Date.now()}-a`,
          role: 'assistant',
          content: reply,
          timestamp: new Date().toISOString(),
        };
        const finalChats = updatedChats.map((c) =>
          c.id === activeChatId
            ? {
                ...c,
                messages: [...c.messages, assistantMsg],
                objectiveId: objective.id,
                title:
                  c.title === 'New strategy'
                    ? (parsed.strategyName || goal).slice(0, 36) +
                      ((parsed.strategyName || goal).length > 36 ? '…' : '')
                    : c.title,
              }
            : c,
        );
        persistChats(finalChats);
      } else {
        await ensureMinAnim();
        const reply = plainText || 'Here is my assessment based on the current strategy context.';
        appendAssistantMessage(reply);
      }
    } catch {
      setIsCreatingStrategy(false);
      if (isRefine && currentChat?.objectiveId) {
        const reply = 'Got it — I\'ve noted your refinement. The strategy has been updated accordingly.';
        const assistantMsg: StrategyCopilotMessage = {
          id: `em-${Date.now()}-a`,
          role: 'assistant',
          content: reply,
          timestamp: new Date().toISOString(),
        };
        const finalChats = updatedChats.map((c) =>
          c.id === activeChatId ? { ...c, messages: [...c.messages, assistantMsg] } : c,
        );
        persistChats(finalChats);
      } else {
        const { objective } = createStrategyFromGoal(goal);
        seedPropagationUnits(objective.id);
        expandStrategyPropagation(objective.id, goal);
        refreshObjectives();
        const reply = `Strategy created: "${objective.name}"\n\nYou can keep refining — tell me to adjust targets, change guardrails, or shift the budget.`;
        const assistantMsg: StrategyCopilotMessage = {
          id: `em-${Date.now()}-a`,
          role: 'assistant',
          content: reply,
          timestamp: new Date().toISOString(),
        };
        const finalChats = updatedChats.map((c) =>
          c.id === activeChatId
            ? {
                ...c,
                messages: [...c.messages, assistantMsg],
                objectiveId: objective.id,
                title: c.title === 'New strategy' ? goal.slice(0, 36) + (goal.length > 36 ? '…' : '') : c.title,
              }
            : c,
        );
        persistChats(finalChats);
      }
    }

    setIsThinking(false);
  };

  const handleNewChat = () => {
    const fresh = newExecChat();
    persistChats([...chats, fresh]);
    setActiveChatId(fresh.id);
    setInput('');
    setIsThinking(false);
  };

  const handleSelectChat = (id: string) => {
    setActiveChatId(id);
    setSidebarOpen(false);
    setInput('');
    setIsThinking(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); }
  };

  const handleEditWithAI = (objectiveId: string) => {
    if (studioView === 'detail') {
      setStudioView('overview');
      setDetailObjectiveId(null);
      setPropagationUnits([]);
      setPropagationGraph(null);
    }

    const existingChat = chats.find((c) => c.objectiveId === objectiveId);
    if (existingChat) {
      setActiveChatId(existingChat.id);
      setSidebarOpen(true);
    } else {
      const obj = objectives.find((o) => o.id === objectiveId);
      const fresh: ExecChat = {
        id: `echat-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
        messages: [{
          id: `em-${Date.now()}-sys`, role: 'assistant',
          content: `Continuing strategy: "${obj?.name ?? 'Unknown'}". What would you like to change?`,
          timestamp: new Date().toISOString(),
        }],
        title: obj?.name?.slice(0, 36) ?? 'Strategy edit',
        objectiveId,
        createdAt: Date.now(),
      };
      persistChats([...chats, fresh]);
      setActiveChatId(fresh.id);
      setSidebarOpen(true);
    }
  };

  const handleAdvisorAsk = async (question: string) => {
    if (!question.trim() || advisorLoading || !detailObjectiveId) return;
    setAdvisorLoading(true);
    setAdvisorInput('');

    const obj = objectives.find((o) => o.id === detailObjectiveId);
    const init = obj ? loadInitiativesByObjectiveId(obj.id)[0] : null;
    let existingStrategy: { objectiveName: string; targetPercent: number; guardrails: InitiativeGuardrails; automationLiftPercent: number } | null = null;
    if (obj && init) {
      existingStrategy = { objectiveName: obj.name, targetPercent: obj.targetPercent, guardrails: init.guardrails, automationLiftPercent: init.automationLiftPercent };
    }
    const propagationContext = buildPropagationContext(detailObjectiveId);

    try {
      const res = await fetch('/api/strategy-copilot', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [{ role: 'user', content: question }],
          existingStrategy,
          propagationContext,
        }),
      });
      if (!res.ok) throw new Error('API error');
      const data = await res.json();
      setAdvisorResponse((data.response || '').trim() || 'No assessment available.');
    } catch {
      setAdvisorResponse('Unable to reach the strategy advisor. Please try again.');
    }
    setAdvisorLoading(false);
    setTimeout(() => advisorEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' }), 100);
  };

  const handleResetDemoData = useCallback(() => {
    if (typeof window === 'undefined') return;
    if (!window.confirm('Remove all strategies and chat history? You can create new strategies and they will get fresh demo data.')) return;
    resetAllStrategyData();
    if (typeof window !== 'undefined') window.localStorage.removeItem(EXEC_CHATS_KEY);
    const fresh = newExecChat();
    saveExecChats([fresh]);
    setChats([fresh]);
    setActiveChatId(fresh.id);
    setObjectives([]);
    setSidebarOpen(false);
    setStudioView('overview');
    setDetailObjectiveId(null);
    setPropagationUnits([]);
    setPropagationGraph(null);
    setExpandedDomain(null);
    setFocusedActionId(null);
    setAdvisorResponse(null);
    setAdvisorInput('');
    setStrategySearch('');
    setIsCreatingStrategy(false);
  }, []);

  const handleOpenDetail = (objectiveId: string) => {
    const units = seedPropagationUnits(objectiveId);
    setPropagationUnits(units);
    const obj = objectives.find((o) => o.id === objectiveId);
    setPropagationGraph(expandStrategyPropagation(objectiveId, obj?.name ?? 'Strategic Goal'));
    setExpandedDomain(null);
    setFocusedActionId(null);
    setShowPropagationMap(false);
    setDetailObjectiveId(objectiveId);
    setAdvisorResponse(null);
    setAdvisorInput('');
    setStudioView('detail');
  };

  const handleBackToOverview = () => {
    setStudioView('overview');
    setDetailObjectiveId(null);
    setPropagationUnits([]);
    setPropagationGraph(null);
    setExpandedDomain(null);
    setFocusedActionId(null);
  };

  const updateUnit = (unitId: string, updater: (u: PropagationUnit) => PropagationUnit) => {
    setPropagationUnits((prev) => {
      const next = prev.map((u) => u.id === unitId ? updater({ ...u }) : u);
      if (detailObjectiveId) savePropagationUnits(detailObjectiveId, next);
      return next;
    });
  };

  const handleApprove = (unitId: string) => updateUnit(unitId, (u) => ({ ...u, state: u.state === 'not_started' ? 'in_progress' : u.state, readiness: { ...u.readiness, approved: true } }));
  const handleMarkTrained = (unitId: string) => updateUnit(unitId, (u) => ({ ...u, readiness: { ...u.readiness, trained: true } }));
  const handleAssign = (unitId: string) => { const name = window.prompt('Enter owner name:'); if (!name?.trim()) return; updateUnit(unitId, (u) => ({ ...u, owner: name.trim() })); };
  const handleEscalate = (unitId: string, blockerText: string) => updateUnit(unitId, (u) => ({ ...u, blockers: u.blockers.map((b) => b.text === blockerText ? { ...b, escalated: true } : b) }));
  const handlePrioritize = (unitId: string) => updateUnit(unitId, (u) => ({ ...u, readiness: { ...u.readiness, approved: true }, state: u.state === 'not_started' ? 'in_progress' : u.state }));
  const handleHalt = (unitId: string) => updateUnit(unitId, (u) => ({ ...u, state: 'on_hold' }));

  const executeAction = (action: DerivedAction) => {
    switch (action.type) {
      case 'approve': action.cta === 'Mark Trained' ? handleMarkTrained(action.targetUnitId) : handleApprove(action.targetUnitId); break;
      case 'assign': handleAssign(action.targetUnitId); break;
      case 'escalate': { const unit = propagationUnits.find((u) => u.id === action.targetUnitId); const blocker = unit?.blockers.find((b) => !b.escalated); if (blocker) handleEscalate(action.targetUnitId, blocker.text); break; }
      case 'prioritize': handlePrioritize(action.targetUnitId); break;
      case 'halt': handleHalt(action.targetUnitId); break;
    }
  };

  const filteredObjectives = objectives.filter((o) =>
    !strategySearch.trim() || o.name.toLowerCase().includes(strategySearch.toLowerCase()),
  );

  const suggestionIdx = chats.length % SUGGESTION_PROMPTS.length;

  // Detail view data
  const detailObjective = detailObjectiveId ? objectives.find((o) => o.id === detailObjectiveId) ?? null : null;
  const actions = useMemo(() => deriveActions(propagationUnits), [propagationUnits]);
  const domains = useMemo(() => deriveDomains(propagationUnits), [propagationUnits]);

  const stateCounts = useMemo(() => {
    const c = { active: 0, in_progress: 0, not_started: 0, blocked: 0, on_hold: 0, validated: 0 };
    for (const u of propagationUnits) {
      if (u.blockers.some((b) => !b.escalated)) c.blocked++;
      if (u.state === 'active' || u.state === 'validated') c.active++;
      else if (u.state === 'in_progress') c.in_progress++;
      else if (u.state === 'not_started') c.not_started++;
      else if (u.state === 'on_hold') c.on_hold++;
    }
    return c;
  }, [propagationUnits]);

  const criticalNow = actions.slice(0, 3);
  const remainingActions = actions.slice(3);
  const focusedAction = focusedActionId ? actions.find((action) => action.id === focusedActionId) ?? null : null;

  const narrativeStory = useMemo(() => deriveNarrativeStory(domains, propagationUnits), [domains, propagationUnits]);
  const strongestWeakest = useMemo(() => deriveStrongestWeakest(domains), [domains]);
  const mainBlocker = useMemo(
    () =>
      propagationUnits
        .flatMap((u) => u.blockers.filter((b) => !b.escalated).map((b) => ({ text: b.text, unit: u.name, domain: u.group })))
        [0] ?? null,
    [propagationUnits],
  );
  const strongestSignal = useMemo(() => {
    if (!strongestWeakest.strongest) return 'No strong adoption signal yet';
    const domain = domains.find((d) => d.name === strongestWeakest.strongest);
    if (!domain || domain.avgThroughput === null) return `${strongestWeakest.strongest} carrying the rollout`;
    return `${domain.name} delivering +${domain.avgThroughput}% throughput`;
  }, [domains, strongestWeakest]);

  const advisorChips = useMemo(() => {
    const chips: string[] = [];
    if (mainBlocker) chips.push(`What should I do about ${mainBlocker.text.replace(/ — .*/, '').toLowerCase()}?`);
    else chips.push('Should we scale this strategy now?');
    if (strongestWeakest.weakest) chips.push(`Why is ${strongestWeakest.weakest} lagging?`);
    else chips.push('What\'s the biggest risk?');
    chips.push('What should I prioritize next?');
    return chips;
  }, [mainBlocker, strongestWeakest]);

  const evidenceData = useMemo(() => {
    const impactUnits = propagationUnits.filter((u) => u.impact);
    if (impactUnits.length === 0) return null;

    const sorted = [...impactUnits].sort((a, b) => (b.impact?.throughputDelta ?? 0) - (a.impact?.throughputDelta ?? 0));
    const strongest = sorted[0];
    const blockerCount = propagationUnits.filter((u) => u.blockers.some((b) => !b.escalated)).length;
    const notStarted = propagationUnits.filter((u) => u.state === 'not_started');
    const allPositive = impactUnits.every((u) => (u.impact?.throughputDelta ?? 0) > 5);

    const reasonsToExpand: string[] = [];
    if (strongest) {
      const defectPart = strongest.impact!.defectDelta < 0 ? ` with ${Math.abs(strongest.impact!.defectDelta)}% fewer defects` : '';
      reasonsToExpand.push(`${strongest.name} shows +${strongest.impact!.throughputDelta}% throughput${defectPart}.`);
    }
    if (impactUnits.length > 1) {
      const other = impactUnits.find((u) => u !== strongest);
      if (other) reasonsToExpand.push(`${other.name} confirms the strategy works outside ${strongest?.group ?? 'primary domain'}.`);
    }

    const reasonsForCaution: string[] = [];
    const blockers = propagationUnits.flatMap((u) =>
      u.blockers.filter((b) => !b.escalated).map((b) => ({ text: b.text, group: u.group })),
    );
    if (blockers.length > 0) reasonsForCaution.push(`${blockers[0].text.replace(/ — .*/, '')} blocks scale to ${blockers[0].group}.`);
    const untrainedCount = propagationUnits.filter((u) => !u.readiness.trained && u.state !== 'not_started').length;
    if (untrainedCount > 0) reasonsForCaution.push(`Training incomplete in ${untrainedCount} area${untrainedCount > 1 ? 's' : ''}.`);
    if (notStarted.length > 0 && reasonsForCaution.length < 2) reasonsForCaution.push(`${notStarted.length} area${notStarted.length > 1 ? 's' : ''} not yet started.`);

    let confidence: 'High' | 'Medium' | 'Low';
    let decision: string;
    let summary: string;
    let nextMove: string;
    let confidenceExplanation: string;

    if (allPositive && blockerCount === 0) {
      confidence = 'High';
      decision = 'Expand now';
      summary = `All active areas are delivering measurable results. No unresolved blockers remain. The strategy is ready for broader rollout to ${notStarted.map((u) => u.name).join(' and ') || 'remaining areas'}.`;
      nextMove = `Authorize rollout for ${notStarted.map((u) => u.name).join(' and ') || 'remaining areas'} and assign owners immediately.`;
      confidenceExplanation = 'Strong performance across all active areas with no outstanding blockers.';
    } else if (blockerCount > 0) {
      confidence = 'Medium';
      decision = 'Scale selectively';
      const topBlocker = blockers[0];
      const holdAreas = notStarted.length > 0 ? notStarted.map((u) => u.name).join(' and ') : null;
      summary = `Expand only in healthy areas while holding broader rollout until ${topBlocker?.text.toLowerCase().replace(/ — .*/, '') ?? 'active blockers'} ${holdAreas ? `and ${holdAreas} readiness` : ''} are resolved.`;
      nextMove = `Unblock ${topBlocker?.text.replace(/ — .*/, '') ?? 'the top blocker'} in ${topBlocker?.group ?? 'the affected domain'} first.${holdAreas ? ` Keep ${holdAreas} on hold until ownership and readiness are confirmed.` : ''} Reassess broader scale after that.`;
      confidenceExplanation = `Results are strong in active areas, but ${blockerCount} scaling blocker${blockerCount > 1 ? 's' : ''} remain${blockerCount > 1 ? '' : 's'} unresolved.`;
    } else {
      confidence = 'Medium';
      decision = 'Hold and resolve';
      summary = 'Training gaps and pending approvals prevent safe expansion. Address readiness constraints before rolling out further.';
      nextMove = 'Complete training and approve pending areas before expanding. Assign ownership where missing.';
      confidenceExplanation = 'Positive signals exist, but readiness constraints still limit broader expansion.';
    }

    return { decision, confidence, summary, nextMove, confidenceExplanation, reasonsToExpand, reasonsForCaution };
  }, [propagationUnits]);

  const rolloutPosture = useMemo(() => deriveRolloutPosture(stateCounts, propagationUnits.length), [stateCounts, propagationUnits.length]);

  const graphSummary = useMemo(() => {
    if (!propagationGraph) return null;
    const nodes = propagationGraph.nodes;
    const blockedNodes = nodes.filter((n) => n.state === 'blocked');
    const liveNodes = nodes.filter((n) => n.state === 'live' || n.state === 'ready');
    const pendingGates = nodes.flatMap((n) => n.gates.filter((g) => g.status === 'pending' || g.status === 'blocked'));
    const totalGates = nodes.flatMap((n) => n.gates);
    const passedGates = totalGates.filter((g) => g.status === 'passed');
    return {
      blockedCount: blockedNodes.length,
      liveCount: liveNodes.length,
      totalNodes: nodes.length,
      pendingGateCount: pendingGates.length,
      totalGateCount: totalGates.length,
      passedGateCount: passedGates.length,
      topBlockedNode: blockedNodes[0] ?? null,
    };
  }, [propagationGraph]);

  useEffect(() => {
    if (focusedActionId && !actions.some((action) => action.id === focusedActionId)) {
      setFocusedActionId(null);
    }
  }, [actions, focusedActionId]);

  // =========================================================================
  // RENDER
  // =========================================================================

  return (
    <div className="h-full flex flex-col overflow-hidden">
      <style>{`
        @keyframes execShimmer { 0%{background-position:200% 0} 100%{background-position:-200% 0} }
        @keyframes heroEnter { 0%{opacity:0;transform:translateY(12px) scale(.97)} 100%{opacity:1;transform:translateY(0) scale(1)} }
        @keyframes heroExit { 0%{opacity:1;transform:translateY(0) scale(1)} 100%{opacity:0;transform:translateY(-8px) scale(.97)} }
        @keyframes compactEnter { 0%{opacity:0;transform:translateY(6px)} 100%{opacity:1;transform:translateY(0)} }
        @keyframes iconGlow { 0%{box-shadow:0 0 0 0 var(--glow)} 50%{box-shadow:0 0 16px 4px var(--glow)} 100%{box-shadow:0 0 0 0 var(--glow)} }
        @keyframes issueBreathPink { 0%,100%{box-shadow:0 0 8px 0 rgba(232,52,126,.12);transform:scale(1)} 50%{box-shadow:0 0 24px 4px rgba(232,52,126,.30);transform:scale(1.06)} }
        @keyframes issueBreathOrange { 0%,100%{box-shadow:0 0 6px 0 rgba(250,182,31,.10);transform:scale(1)} 50%{box-shadow:0 0 18px 3px rgba(250,182,31,.25);transform:scale(1.04)} }
        @keyframes issueBreathSlate { 0%,100%{box-shadow:0 0 4px 0 rgba(100,116,139,.08);transform:scale(1)} 50%{box-shadow:0 0 14px 2px rgba(100,116,139,.18);transform:scale(1.03)} }
        @keyframes nodeFloat { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-3px)} }
        .exec-hero-enter{animation:heroEnter .4s cubic-bezier(.22,1,.36,1) both}
        .exec-hero-exit{animation:heroExit .25s ease-in both}
        .exec-compact-enter{animation:compactEnter .35s cubic-bezier(.22,1,.36,1) both}
        .exec-icon-glow{animation:iconGlow 1.2s ease-out both}
        .exec-breath-pink{animation:issueBreathPink 2.6s ease-in-out infinite}
        .exec-breath-orange{animation:issueBreathOrange 2.8s ease-in-out infinite}
        .exec-breath-slate{animation:issueBreathSlate 3s ease-in-out infinite}
        .exec-podium-card{transition:transform .3s cubic-bezier(.22,1,.36,1),box-shadow .3s ease}
        .exec-podium-card:hover{transform:translateY(-6px) scale(1.03);box-shadow:0 20px 50px rgba(0,0,0,.12)}
        .exec-node-float{animation:nodeFloat 3s ease-in-out infinite}

        @keyframes skeletonShimmer {
          0% { background-position: 200% 0 }
          100% { background-position: -200% 0 }
        }
        @keyframes skeletonPulse {
          0%,100% { opacity: .55 }
          50% { opacity: .85 }
        }
        @keyframes sparkleRise {
          0% { opacity: 0; transform: translateY(0) scale(.5) rotate(0deg) }
          15% { opacity: 1; transform: translateY(-8px) scale(1) rotate(30deg) }
          80% { opacity: .6; transform: translateY(-36px) scale(.8) rotate(120deg) }
          100% { opacity: 0; transform: translateY(-50px) scale(.3) rotate(180deg) }
        }
        .exec-skeleton-shimmer {
          background: linear-gradient(105deg, rgba(148,163,184,.08) 0%, rgba(148,163,184,.22) 40%, rgba(255,255,255,.18) 50%, rgba(148,163,184,.22) 60%, rgba(148,163,184,.08) 100%);
          background-size: 200% 100%;
          animation: skeletonShimmer 2s ease-in-out infinite;
        }
        .exec-skeleton-pulse {
          animation: skeletonPulse 2s ease-in-out infinite;
        }
        .exec-sparkle {
          position: absolute;
          pointer-events: none;
          animation: sparkleRise 1.6s ease-out forwards;
        }
      `}</style>

      <AnimatePresence mode="wait">
        {studioView === 'overview' ? (
          <motion.div key="overview" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }} className="flex-1 min-h-0 flex flex-col">
            {/* ─── Header ─── */}
            <div className="flex items-center justify-between px-2 pb-3 flex-shrink-0 gap-2 flex-wrap">
              <h1 className="text-xl font-bold text-slate-900 dark:text-slate-50 flex items-center gap-2">
                <span className="material-icons-round text-accent">leaderboard</span>
                Executive Strategy Studio
              </h1>
              <div className="flex items-center gap-2 text-[11px] text-slate-500 dark:text-slate-400">
                <span className="hidden md:inline px-2 py-1 rounded-full bg-slate-100 dark:bg-slate-800 font-medium">Plant Manager</span>
                <span className="hidden md:inline px-2 py-1 rounded-full bg-slate-100 dark:bg-slate-800">Factory · Lines A–C</span>
                <button type="button" onClick={handleResetDemoData} className="px-2 py-1 rounded-lg border border-slate-200 dark:border-slate-600 text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-700 dark:hover:text-slate-300 transition-colors flex items-center gap-1.5" title="Clear all strategies and chats; new strategies get fresh demo data">
                  <span className="material-icons-round text-sm">restart_alt</span>
                  <span className="hidden sm:inline">Reset demo data</span>
                </button>
              </div>
            </div>

            {/* ─── Main grid ─── */}
            <div className="flex-1 min-h-0 grid grid-cols-1 xl:grid-cols-[minmax(0,1.1fr)_minmax(0,1.4fr)] gap-5">
              {/* LEFT COLUMN — Chat */}
              <div className="flex flex-col min-h-0">
                <div className="flex-1 min-h-0 border border-slate-200 dark:border-slate-700 rounded-2xl bg-white dark:bg-slate-900/70 overflow-hidden flex">
                  {/* Chat sidebar */}
                  <div className={`flex flex-col border-r border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/80 transition-all overflow-hidden ${sidebarOpen ? 'w-52 min-w-[13rem]' : 'w-0 min-w-0 border-0'}`}>
                    <div className="px-3 py-3 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between">
                      <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide">History</span>
                      <button type="button" onClick={() => setSidebarOpen(false)} className="p-1 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-400"><span className="material-icons-round text-base">chevron_left</span></button>
                    </div>
                    <div className="flex-1 overflow-y-auto py-1">
                      {chats.map((c) => (
                        <button key={c.id} type="button" onClick={() => handleSelectChat(c.id)}
                          className={`w-full text-left px-3 py-2 text-xs truncate flex items-center gap-2 transition-colors ${c.id === activeChatId ? 'bg-primary/10 text-primary' : 'text-slate-600 dark:text-slate-300 hover:bg-slate-200/60 dark:hover:bg-slate-700/60'}`}>
                          <span className="material-icons-round text-sm shrink-0">{c.objectiveId ? 'check_circle' : 'chat_bubble_outline'}</span>
                          <span className="truncate">{c.title}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                  {/* Chat main area */}
                  <div className="flex-1 min-w-0 flex flex-col">
                    <div className="px-4 py-3 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <button type="button" onClick={() => setSidebarOpen((o) => !o)} className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 shrink-0"><span className="material-icons-round text-lg">menu</span></button>
                        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-accent to-primary flex items-center justify-center shrink-0"><span className="material-icons-round text-white text-sm">auto_awesome</span></div>
                        <span className="font-semibold text-slate-900 dark:text-white text-sm truncate">Strategy Copilot</span>
                      </div>
                      <button type="button" onClick={handleNewChat} className="px-2.5 py-1.5 rounded-lg bg-primary/10 text-primary text-xs font-medium flex items-center gap-1 hover:bg-primary/20 transition-colors shrink-0"><span className="material-icons-round text-sm">add</span>New</button>
                    </div>
                    <div className="flex-1 min-h-0 overflow-y-auto px-4 py-4 space-y-3 bg-slate-50/50 dark:bg-slate-950/30">
                      {messages.length === 0 && !isThinking && (
                        <div className="flex flex-col items-center justify-center h-full gap-3 select-none">
                          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-brand-blue/20 to-brand-navy/10 flex items-center justify-center"><span className="material-icons-round text-2xl text-brand-blue/60">auto_awesome</span></div>
                          <p className="text-sm text-slate-400 dark:text-slate-500 font-medium">What&apos;s your next big move?</p>
                        </div>
                      )}
                      {messages.map((msg, idx) => {
                        const userMsgIndex = messages.slice(0, idx).filter((m) => m.role === 'user').length;
                        // Soft tint + left accent (common in chat UIs): light fill, colored left edge, dark text
                        const userBubbleColors = [
                          'bg-highlight/20 border border-slate-200 dark:border-slate-600 border-l-4 border-l-highlight text-slate-800 dark:text-slate-200 rounded-br-sm',
                          'bg-danger/15 border border-slate-200 dark:border-slate-600 border-l-4 border-l-danger text-slate-800 dark:text-slate-200 rounded-br-sm',
                          'bg-success/15 border border-slate-200 dark:border-slate-600 border-l-4 border-l-success text-slate-800 dark:text-slate-200 rounded-br-sm',
                          'bg-action/15 border border-slate-200 dark:border-slate-600 border-l-4 border-l-action text-slate-800 dark:text-slate-200 rounded-br-sm',
                        ];
                        const userBubbleCls = userBubbleColors[userMsgIndex % 4];
                        return (
                          <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'} animate-in fade-in slide-in-from-bottom-2 duration-300`}>
                            <div className={`max-w-[85%] px-4 py-2.5 rounded-2xl text-sm leading-relaxed whitespace-pre-wrap ${msg.role === 'user' ? userBubbleCls : 'bg-slate-100 dark:bg-slate-800/90 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 border-l-4 border-l-slate-300 dark:border-l-slate-600 rounded-bl-sm shadow-sm'}`}>{msg.content}</div>
                          </div>
                        );
                      })}
                      {isThinking && (
                        <div className="flex justify-start"><div className="bg-slate-100 dark:bg-slate-800/90 px-4 py-3 rounded-2xl rounded-bl-sm border border-slate-200 dark:border-slate-700 border-l-4 border-l-slate-300 dark:border-l-slate-600 shadow-sm"><div className="flex gap-1.5"><div className="w-2 h-2 bg-slate-400 dark:bg-slate-500 rounded-full animate-bounce" /><div className="w-2 h-2 bg-slate-400 dark:bg-slate-500 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }} /><div className="w-2 h-2 bg-slate-400 dark:bg-slate-500 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }} /></div></div></div>
                      )}
                      <div ref={chatEndRef} />
                    </div>
                    <div className="px-4 py-3 border-t border-slate-100 dark:border-slate-800">
                      {messages.length === 0 && (
                        <button type="button" onClick={() => setInput(SUGGESTION_PROMPTS[suggestionIdx])} className="mb-2 text-xs text-accent hover:text-primary transition-colors flex items-center gap-1">
                          <span className="material-icons-round text-sm">lightbulb</span>Try: &quot;{SUGGESTION_PROMPTS[suggestionIdx]}&quot;
                        </button>
                      )}
                      <div className="flex items-center gap-2">
                        <input type="text" value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={handleKeyDown} placeholder="Describe a strategic goal…" disabled={isThinking} className="flex-1 px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white text-sm placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-accent/40 transition-all disabled:opacity-50" />
                        <button type="button" onClick={handleSend} disabled={!input.trim() || isThinking} className="w-10 h-10 rounded-xl bg-primary hover:bg-primary/90 disabled:bg-slate-200 dark:disabled:bg-slate-700 text-white disabled:text-slate-400 flex items-center justify-center transition-all shadow-sm hover:shadow-md disabled:shadow-none"><span className="material-icons-round text-base">send</span></button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* RIGHT COLUMN — Strategy Board */}
              <div className="flex flex-col min-h-0">
                <div className="flex items-center justify-between gap-3 mb-3 flex-shrink-0">
                  <h2 className="text-sm font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide">Strategy Board</h2>
                  {objectives.length > 1 && (
                    <div className="relative">
                      <span className="material-icons-round text-base text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none">search</span>
                      <input type="text" value={strategySearch} onChange={(e) => setStrategySearch(e.target.value)} placeholder="Search…" className="pl-8 pr-3 py-1.5 w-44 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-xs text-slate-800 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-accent/30 transition-all" />
                    </div>
                  )}
                </div>
                <div className="flex-1 min-h-0 overflow-y-auto space-y-3 pr-1">
                  {/* Skeleton placeholder while AI creates a strategy */}
                  <AnimatePresence>
                    {isCreatingStrategy && (
                      <motion.div key="strategy-skeleton" initial={{ opacity: 0, y: 16, scale: 0.97 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: -10, scale: 0.97 }} transition={{ type: 'spring', stiffness: 300, damping: 28 }}
                        className="relative rounded-2xl border border-slate-200/60 dark:border-slate-700/60 bg-white dark:bg-card-dark p-5 shadow-sm overflow-hidden">
                        <div className="pointer-events-none absolute inset-0 exec-skeleton-shimmer" />
                        <div className="relative z-10">
                          <div className="flex items-center gap-2 mb-3">
                            <div className="h-5 w-16 rounded-full bg-slate-200 dark:bg-slate-700 exec-skeleton-pulse" />
                            <div className="h-5 w-20 rounded-full bg-slate-200 dark:bg-slate-700 exec-skeleton-pulse" style={{ animationDelay: '0.15s' }} />
                            <div className="h-5 w-14 rounded-full bg-slate-200 dark:bg-slate-700 exec-skeleton-pulse" style={{ animationDelay: '0.3s' }} />
                          </div>
                          <div className="h-5 w-3/4 rounded-lg bg-slate-200 dark:bg-slate-700 exec-skeleton-pulse mb-4" style={{ animationDelay: '0.1s' }} />
                          <div className="rounded-2xl bg-slate-100 dark:bg-slate-800 p-5 mb-2.5">
                            <div className="flex items-start gap-4">
                              <div className="w-12 h-12 rounded-xl bg-slate-200 dark:bg-slate-700 exec-skeleton-pulse" />
                              <div className="flex-1 space-y-2">
                                <div className="h-3 w-20 rounded bg-slate-200 dark:bg-slate-700 exec-skeleton-pulse" style={{ animationDelay: '0.2s' }} />
                                <div className="h-6 w-24 rounded bg-slate-200 dark:bg-slate-700 exec-skeleton-pulse" style={{ animationDelay: '0.25s' }} />
                                <div className="h-3 w-48 rounded bg-slate-200 dark:bg-slate-700 exec-skeleton-pulse" style={{ animationDelay: '0.35s' }} />
                              </div>
                            </div>
                          </div>
                          <div className="grid grid-cols-3 gap-2">
                            {[0, 1, 2].map((i) => (
                              <div key={i} className="flex items-center gap-2 rounded-xl bg-slate-50 dark:bg-slate-800/60 px-3 py-2.5">
                                <div className="w-8 h-8 rounded-lg bg-slate-200 dark:bg-slate-700 exec-skeleton-pulse" style={{ animationDelay: `${i * 0.12}s` }} />
                                <div className="space-y-1.5 flex-1">
                                  <div className="h-2.5 w-12 rounded bg-slate-200 dark:bg-slate-700 exec-skeleton-pulse" style={{ animationDelay: `${0.1 + i * 0.12}s` }} />
                                  <div className="h-3 w-16 rounded bg-slate-200 dark:bg-slate-700 exec-skeleton-pulse" style={{ animationDelay: `${0.15 + i * 0.12}s` }} />
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                        {/* Sparkle particles */}
                        <StrategySparkles />
                      </motion.div>
                    )}
                  </AnimatePresence>

                  {filteredObjectives.length === 0 && !objectives.length && !isCreatingStrategy && (
                    <div className="flex flex-col items-center justify-center h-full gap-3 select-none">
                      <div className="w-14 h-14 rounded-2xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center"><span className="material-icons-round text-3xl text-slate-300 dark:text-slate-600">insights</span></div>
                      <p className="text-sm text-slate-400 dark:text-slate-500">Your strategies will appear here</p>
                    </div>
                  )}
                  {filteredObjectives.length === 0 && objectives.length > 0 && (
                    <p className="text-sm text-slate-400 dark:text-slate-500 text-center py-8">No strategies match &quot;{strategySearch}&quot;</p>
                  )}
                  {filteredObjectives.map((obj) => {
                    const inits = loadInitiativesByObjectiveId(obj.id);
                    const primaryInit = inits[0] ?? null;
                    const stage = mapStageLabel(obj.status);
                    const guardrails = primaryInit?.guardrails ?? DEFAULT_GUARDRAILS;
                    const { risk, costBand } = deriveRiskAndCost(primaryInit);
                    const throughputLift = primaryInit?.automationLiftPercent ?? 10;
                    const qualityLift = 25;
                    const aiConfidence = 82;
                    const allMetrics = [
                      { id: 'throughput' as ExecLens, label: 'Throughput', icon: 'speed', value: `+${throughputLift}%`, detail: `AI projects ${throughputLift}% lift in 90 days. Error rate stays below ${(guardrails.maxErrorRate * 100).toFixed(0)}%.` },
                      { id: 'cost' as ExecLens, label: 'Cost', icon: 'account_balance', value: costBand, detail: 'Covers hardware, integration, 3-month ramp. OPEX neutral.' },
                      { id: 'safety' as ExecLens, label: 'Quality & Safety', icon: 'health_and_safety', value: `−${qualityLift}% defects`, detail: `Defect rate drops ${qualityLift}% inside guardrail limits.` },
                      { id: 'people' as ExecLens, label: 'People', icon: 'groups', value: 'Zero headcount change', detail: 'Crew shifts to AI co-pilot mode. Training included.' },
                    ];
                    const focusId = selectedLens[obj.id] ?? 'throughput';
                    const isTransitioning = transitioningId === obj.id;
                    const hero = allMetrics.find((m) => m.id === focusId)!;
                    const others = allMetrics.filter((m) => m.id !== focusId);
                    const heroColor = METRIC_COLORS[focusId];
                    const handleSwitch = (next: ExecLens) => { if (next === focusId) return; setTransitioningId(obj.id); setTimeout(() => { setSelectedLens((p) => ({ ...p, [obj.id]: next })); setTransitioningId(null); }, 250); };

                    return (
                      <div key={obj.id} className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-card-dark p-5 shadow-sm hover:border-accent/30 hover:shadow-md transition-all cursor-pointer" onClick={() => handleOpenDetail(obj.id)}>
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                              <span className={`px-2 py-0.5 rounded-full text-[11px] font-semibold uppercase tracking-wide ${stage.cls}`}>{stage.label}</span>
                              <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold uppercase bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">{risk} risk</span>
                              <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold uppercase bg-accent/10 text-accent">AI {aiConfidence}%</span>
                            </div>
                            <h3 className="text-base font-bold text-slate-900 dark:text-white">{obj.name}</h3>
                          </div>
                          <div className="flex items-center gap-2 shrink-0">
                            <button type="button" onClick={(e) => { e.stopPropagation(); handleEditWithAI(obj.id); }} className="p-1.5 rounded-lg hover:bg-primary/10 text-slate-400 hover:text-primary transition-colors" title="Edit with AI"><span className="material-icons-round text-lg">edit</span></button>
                            <svg viewBox="0 0 48 48" className="w-11 h-11">
                              <circle cx="24" cy="24" r="20" fill="none" stroke="currentColor" strokeWidth="3" className="text-slate-100 dark:text-slate-800" />
                              <circle cx="24" cy="24" r="20" fill="none" stroke="currentColor" strokeWidth="3" strokeDasharray={`${(obj.currentPercent / Math.max(obj.targetPercent || 1, 1)) * 125.6} 125.6`} strokeLinecap="round" transform="rotate(-90 24 24)" className={obj.status === 'validated' ? 'text-success' : 'text-accent'} />
                              <text x="24" y="27" textAnchor="middle" className="fill-slate-900 dark:fill-white font-bold" fontSize="12">{obj.currentPercent}%</text>
                            </svg>
                          </div>
                        </div>
                        <div className="mt-4 space-y-2.5" onClick={(e) => e.stopPropagation()}>
                          <div key={focusId} className={`relative overflow-hidden rounded-2xl bg-slate-800 text-white p-5 ${isTransitioning ? 'exec-hero-exit' : 'exec-hero-enter'}`} style={{ backgroundImage: `radial-gradient(ellipse 80% 60% at 80% 20%, ${heroColor.hex}33, transparent)` }}>
                            <div className="pointer-events-none absolute inset-0" style={{ background: 'linear-gradient(105deg,transparent 40%,rgba(255,255,255,.07) 45%,rgba(255,255,255,.13) 50%,rgba(255,255,255,.07) 55%,transparent 60%)', backgroundSize: '200% 100%', animation: 'execShimmer 3s ease-in-out infinite' }} />
                            <div className="relative z-10 flex items-start gap-4">
                              <div className="exec-icon-glow w-12 h-12 rounded-xl bg-white/10 backdrop-blur-sm flex items-center justify-center shrink-0" style={{ '--glow': `${heroColor.hex}66` } as React.CSSProperties}><span className={`material-icons-round text-2xl ${heroColor.tw}`}>{hero.icon}</span></div>
                              <div className="flex-1 min-w-0">
                                <div className="text-[11px] font-semibold uppercase tracking-widest mb-1" style={{ color: `${heroColor.hex}cc` }}>{hero.label}</div>
                                <div className="text-2xl font-extrabold tracking-tight leading-none">{hero.value}</div>
                                <div className="text-xs text-slate-300 leading-relaxed mt-1.5 max-w-md">{hero.detail}</div>
                              </div>
                              <div className="hidden sm:flex flex-col items-end gap-0.5 shrink-0 text-right">
                                <span className="text-[10px] uppercase tracking-wide text-slate-400">Guardrails</span>
                                <span className="text-[11px] text-slate-300">{(guardrails.maxErrorRate * 100).toFixed(0)}% err · {guardrails.maxDropCount} drops · E-stop {(guardrails.emergencyStopThreshold * 100).toFixed(0)}%</span>
                                <div className="mt-1 h-1 w-24 rounded-full bg-white/10 overflow-hidden"><div className="h-full rounded-full bg-gradient-to-r from-brand-green via-brand-orange to-brand-pink w-2/3" /></div>
                              </div>
                            </div>
                          </div>
                          <div className={`grid grid-cols-3 gap-2 ${isTransitioning ? '' : 'exec-compact-enter'}`}>
                            {others.map((m, idx) => {
                              const mc = METRIC_COLORS[m.id];
                              return (
                                <button key={m.id} type="button" onClick={() => handleSwitch(m.id)} className="group flex items-center gap-2.5 rounded-xl border bg-white dark:bg-slate-900/80 px-3 py-2.5 text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-action/50"
                                  style={{ animationDelay: `${idx * 80}ms`, borderColor: 'var(--cb, rgb(226 232 240))', backgroundColor: 'var(--cbg, white)', boxShadow: 'var(--cs, none)', transition: 'border-color .3s,background-color .3s,box-shadow .3s,transform .3s' }}
                                  onMouseEnter={(e) => { const el = e.currentTarget; el.style.setProperty('--cb', `${mc.hex}55`); el.style.setProperty('--cbg', `${mc.hex}0a`); el.style.setProperty('--cs', `0 4px 20px ${mc.hex}18`); el.style.transform = 'translateY(-2px)'; const iw = el.querySelector<HTMLElement>('[data-iw]'); const ic = el.querySelector<HTMLElement>('[data-ic]'); if (iw) { iw.style.boxShadow = `0 0 14px 3px ${mc.hex}40`; iw.style.backgroundColor = `${mc.hex}15`; iw.style.transform = 'scale(1.12)'; } if (ic) ic.style.color = mc.hex; }}
                                  onMouseLeave={(e) => { const el = e.currentTarget; el.style.setProperty('--cb', ''); el.style.setProperty('--cbg', ''); el.style.setProperty('--cs', ''); el.style.transform = ''; const iw = el.querySelector<HTMLElement>('[data-iw]'); const ic = el.querySelector<HTMLElement>('[data-ic]'); if (iw) { iw.style.boxShadow = ''; iw.style.backgroundColor = ''; iw.style.transform = ''; } if (ic) ic.style.color = ''; }}>
                                  <div data-iw="" className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0 bg-slate-100 dark:bg-slate-800" style={{ transition: 'box-shadow .4s,background-color .3s,transform .3s' }}><span data-ic="" className="material-icons-round text-base text-slate-400 dark:text-slate-500" style={{ transition: 'color .4s' }}>{m.icon}</span></div>
                                  <div className="min-w-0"><div className="text-[10px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide">{m.label}</div><div className="text-xs font-bold text-slate-900 dark:text-white truncate">{m.value}</div></div>
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </motion.div>
        ) : (
          /* ═══════════════════════════════════════════════════════════════
             DETAIL VIEW — Executive Propagation & Action Workspace  v4
             ═══════════════════════════════════════════════════════════════ */
          <motion.div key="detail" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0, y: 20 }} transition={{ duration: 0.5 }} className="flex-1 min-h-0 flex flex-col">

            {/* ─── NARRATIVE BAND ─── */}
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.5 }} className="relative flex-shrink-0 rounded-2xl bg-slate-800 overflow-hidden px-8 pt-6 pb-5 mb-6">
              <div className="pointer-events-none absolute inset-0" style={{ background: 'radial-gradient(ellipse 60% 50% at 90% 20%, rgba(255,255,255,0.06), transparent)' }} />
              <div className="relative z-10">
                <div className="flex items-center justify-between gap-4 mb-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <button type="button" onClick={handleBackToOverview} className="p-1.5 -ml-1.5 rounded-lg hover:bg-white/10 text-white/50 hover:text-white transition-colors shrink-0"><span className="material-icons-round text-lg">arrow_back</span></button>
                    <h1 className="text-2xl font-extrabold text-white tracking-tight leading-tight truncate">{detailObjective?.name}</h1>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className={`px-2.5 py-1 rounded-full text-[11px] font-bold uppercase tracking-wide ${rolloutPosture.cls}`}>{rolloutPosture.label}</span>
                    <button type="button" onClick={() => setShowPropagationMap((v) => !v)} className="px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white text-xs font-medium flex items-center gap-1.5 transition-colors backdrop-blur-sm">
                      <span className="material-icons-round text-sm">account_tree</span>{showPropagationMap ? 'Close Propagation' : 'Strategy Propagation'}
                    </button>
                    <button type="button" onClick={() => detailObjectiveId && handleEditWithAI(detailObjectiveId)} className="px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white text-xs font-medium flex items-center gap-1.5 transition-colors backdrop-blur-sm">
                      <span className="material-icons-round text-sm">auto_awesome</span>Edit with AI
                    </button>
                  </div>
                </div>
                <p className="text-sm text-slate-300/90 leading-relaxed max-w-3xl mb-3">{narrativeStory}</p>
                <div className="flex items-center gap-3 mb-3">
                  <span className="text-[11px] text-white/40 font-medium">
                    {graphSummary ? `${graphSummary.liveCount}/${graphSummary.totalNodes} nodes live` : `${stateCounts.active}/${propagationUnits.length} areas active`}
                  </span>
                  {graphSummary ? (
                    <div className="flex items-center gap-0.5 h-2 w-28 rounded-full overflow-hidden bg-white/10">
                      {propagationGraph!.nodes.map((n) => {
                        const col = n.state === 'live' || n.state === 'ready' ? 'bg-success' : n.state === 'blocked' ? 'bg-danger' : n.state === 'simulated' ? 'bg-brand-blue' : 'bg-slate-500';
                        return <div key={n.id} className={`flex-1 h-full ${col}`} />;
                      })}
                    </div>
                  ) : (
                    <div className="flex items-center gap-0.5 h-2 w-28 rounded-full overflow-hidden bg-white/10">
                      {propagationUnits.map((u) => (<div key={u.id} className={`flex-1 h-full ${STATE_META[u.state].dot}`} />))}
                    </div>
                  )}
                  {graphSummary && (
                    <span className="text-[11px] text-white/40 font-medium">
                      {graphSummary.passedGateCount}/{graphSummary.totalGateCount} gates passed
                    </span>
                  )}
                </div>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-3 border-t border-white/10 pt-3">
                  <div>
                    <p className="text-[10px] uppercase tracking-[0.22em] text-white/35 mb-1">Biggest blocker</p>
                    <p className="text-sm text-white/90 leading-relaxed">{mainBlocker ? `${mainBlocker.text.replace(/ — .*/, '')} in ${mainBlocker.domain}` : 'No active blocker right now'}</p>
                  </div>
                  <div>
                    <p className="text-[10px] uppercase tracking-[0.22em] text-white/35 mb-1">Strongest signal</p>
                    <p className="text-sm text-white/90 leading-relaxed">{strongestSignal}</p>
                  </div>
                  <div>
                    <p className="text-[10px] uppercase tracking-[0.22em] text-white/35 mb-1">Governance</p>
                    <p className="text-sm text-white/90 leading-relaxed">
                      {graphSummary
                        ? graphSummary.pendingGateCount > 0
                          ? `${graphSummary.pendingGateCount} gate${graphSummary.pendingGateCount !== 1 ? 's' : ''} pending`
                          : 'All gates cleared'
                        : 'Not assessed'}
                    </p>
                  </div>
                  <div>
                    <p className="text-[10px] uppercase tracking-[0.22em] text-white/35 mb-1">Leadership focus</p>
                    <p className="text-sm text-white/90 leading-relaxed">{criticalNow[0]?.description ?? 'Monitor rollout and readiness'}</p>
                  </div>
                </div>
              </div>
            </motion.div>

            {/* ─── Scrollable content ─── */}
            <div className="flex-1 min-h-0 overflow-y-auto px-1 pb-6">

              {/* Organization view is rendered as a fixed overlay at the component root */}

              {/* ─── PODIUM ─── */}
              {criticalNow.length > 0 ? (
                <div className="mb-8">
                  <span className="text-[11px] font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider px-1 block mb-2.5">Critical Now</span>
                  <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,0.85fr)_minmax(0,1.3fr)_minmax(0,0.85fr)] gap-4 items-end" style={{ perspective: 1200 }}>
                    {[criticalNow[1] ?? null, criticalNow[0], criticalNow[2] ?? null].map((action, colIdx) => {
                      if (!action) return <div key={`empty-${colIdx}`} />;
                      const rank = colIdx === 1 ? 1 : colIdx === 0 ? 2 : 3;
                      const isFirst = rank === 1;
                      const breathCls = isFirst ? 'exec-breath-pink' : rank === 2 ? 'exec-breath-orange' : 'exec-breath-slate';
                      const accentColor = isFirst ? 'bg-danger' : rank === 2 ? 'bg-warning' : 'bg-slate-400';
                      const iconBg = isFirst ? 'bg-danger/10 text-danger' : rank === 2 ? 'bg-warning/10 text-warning' : 'bg-slate-200 dark:bg-slate-700 text-slate-500';
                      const height = isFirst ? 'min-h-[320px]' : rank === 2 ? 'min-h-[240px]' : 'min-h-[200px]';
                      const titleSize = isFirst ? 'text-xl sm:text-2xl' : 'text-sm';
                      const iconSizeCls = isFirst ? 'w-14 h-14' : rank === 2 ? 'w-11 h-11' : 'w-9 h-9';
                      const iconTextCls = isFirst ? 'text-[26px]' : rank === 2 ? 'text-lg' : 'text-base';
                      const rankNum = isFirst ? 'text-[5rem]' : rank === 2 ? 'text-5xl' : 'text-4xl';
                      const pad = isFirst ? 'p-7' : 'p-5';
                      const isFocused = focusedActionId === action.id;

                      return (
                        <div
                          key={action.id}
                          ref={(el) => { podiumCardRefs.current[action.id] = el as HTMLDivElement | null; }}
                          onMouseEnter={() => {
                            if (focusOpenTimeoutRef.current) clearTimeout(focusOpenTimeoutRef.current);
                            if (focusCloseTimeoutRef.current) { clearTimeout(focusCloseTimeoutRef.current); focusCloseTimeoutRef.current = null; }
                            focusOpenTimeoutRef.current = setTimeout(() => {
                              focusGraceRef.current = true;
                              setFocusedActionId(action.id);
                              setExpandedDomain(action.domain);
                              setTimeout(() => { focusGraceRef.current = false; }, 700);
                            }, 500);
                          }}
                          onMouseLeave={() => {
                            if (focusOpenTimeoutRef.current) { clearTimeout(focusOpenTimeoutRef.current); focusOpenTimeoutRef.current = null; }
                            if (focusGraceRef.current) return;
                            if (focusCloseTimeoutRef.current) clearTimeout(focusCloseTimeoutRef.current);
                            focusCloseTimeoutRef.current = setTimeout(() => setFocusedActionId(null), 400);
                          }}
                          className={`exec-podium-card relative rounded-[24px] bg-slate-200/80 dark:bg-slate-800 overflow-hidden cursor-pointer ${height} flex flex-col shadow-md ${
                            isFocused ? 'ring-2 ring-slate-400 dark:ring-slate-500 shadow-xl' : ''
                          }`}
                        >
                          <div className={`absolute left-0 top-0 bottom-0 w-1 ${accentColor}`} />
                          <div className={`relative ${pad} flex flex-col flex-1`}>
                            <div className="flex items-start justify-between gap-2 mb-auto">
                              <div className="flex items-center gap-3">
                                <div className={`rounded-2xl flex items-center justify-center shrink-0 ${breathCls} ${iconBg} ${iconSizeCls}`}>
                                  <span className={`material-icons-round ${iconTextCls}`}>{action.icon}</span>
                                </div>
                                <div>
                                  <p className="text-[10px] uppercase tracking-[0.24em] text-slate-400">{rank === 1 ? '1st' : rank === 2 ? '2nd' : '3rd'}</p>
                                  <p className="text-xs font-medium text-slate-500 dark:text-slate-400">{action.domain}</p>
                                </div>
                              </div>
                              <span className={`leading-none font-black text-slate-200/60 dark:text-slate-700/60 select-none ${rankNum}`}>{rank}</span>
                            </div>
                            <div className={`mt-4 ${isFirst ? 'space-y-3' : 'space-y-2'}`}>
                              <h3 className={`font-black tracking-tight text-slate-900 dark:text-white leading-snug ${titleSize}`}>{action.description}</h3>
                              <p className={`text-slate-500 dark:text-slate-400 leading-relaxed ${isFirst ? 'text-sm' : 'text-xs'}`}>{action.consequence}</p>
                              {isFirst && (
                                <div className="grid grid-cols-2 gap-3 pt-2">
                                  <div>
                                    <p className="text-[10px] uppercase tracking-[0.2em] text-slate-400 mb-1">Impact area</p>
                                    <p className="text-xs text-slate-700 dark:text-slate-200">{action.targetUnitName} in {action.domain}</p>
                                  </div>
                                  <div>
                                    <p className="text-[10px] uppercase tracking-[0.2em] text-slate-400 mb-1">If unresolved</p>
                                    <p className="text-xs text-slate-600 dark:text-slate-400 italic">Propagation stalls across {action.domain}</p>
                                  </div>
                                </div>
                              )}
                            </div>
                            <div className="mt-auto pt-4">
                              <button type="button" onClick={(e) => { e.stopPropagation(); executeAction(action); }}
                                className={`w-full font-bold transition-all ${isFirst ? 'rounded-2xl bg-primary text-white py-3 text-sm hover:bg-primary/90 shadow-sm' : 'rounded-xl bg-white/90 dark:bg-slate-700 text-slate-700 dark:text-slate-200 py-2 text-xs hover:bg-white dark:hover:bg-slate-600 border border-slate-200 dark:border-slate-600'}`}>
                                {action.cta}
                              </button>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* Popup overlay */}
                  <AnimatePresence>
                    {focusedAction && (
                      <>
                        <motion.div
                          key="focus-backdrop"
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          exit={{ opacity: 0 }}
                          transition={{ duration: 0.25 }}
                          className="fixed inset-0 z-20 bg-black/25 backdrop-blur-[3px]"
                          onClick={() => setFocusedActionId(null)}
                        />
                        <motion.div
                          key="focus-card"
                          initial={{ opacity: 0, scale: 0.7, rotateX: 12, y: 60 }}
                          animate={{ opacity: 1, scale: 1, rotateX: 0, y: 0 }}
                          exit={{ opacity: 0, scale: 0.85, rotateX: 6, y: 30 }}
                          transition={{ type: 'spring', stiffness: 260, damping: 26 }}
                          className="fixed left-1/2 top-1/2 z-30 w-full max-w-lg -translate-x-1/2 -translate-y-1/2"
                          style={{ perspective: 1000 }}
                          onMouseEnter={() => {
                            focusGraceRef.current = false;
                            if (focusCloseTimeoutRef.current) { clearTimeout(focusCloseTimeoutRef.current); focusCloseTimeoutRef.current = null; }
                          }}
                          onMouseLeave={() => {
                            if (focusCloseTimeoutRef.current) clearTimeout(focusCloseTimeoutRef.current);
                            focusCloseTimeoutRef.current = setTimeout(() => setFocusedActionId(null), 350);
                          }}
                        >
                          <div className="relative overflow-hidden rounded-2xl bg-white dark:bg-slate-900 shadow-2xl ring-1 ring-slate-200 dark:ring-slate-700">
                            {(() => {
                              const idx = criticalNow.findIndex((a) => a.id === focusedAction.id);
                              const popupAccent = idx === 0 ? 'bg-danger' : idx === 1 ? 'bg-warning' : 'bg-slate-400';
                              return <div className={`absolute left-0 top-0 bottom-0 w-1.5 ${popupAccent}`} />;
                            })()}
                            <div className="p-6 pl-7">
                              <div className="flex items-start justify-between gap-4 mb-5">
                                <div className="min-w-0">
                                  <p className="text-[11px] font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-[0.2em] mb-1">Issue in focus</p>
                                  <h4 className="text-lg font-bold text-slate-900 dark:text-white leading-snug">{focusedAction.description}</h4>
                                  <p className="text-sm text-slate-500 dark:text-slate-400 mt-1.5">{focusedAction.domain} · {focusedAction.targetUnitName}</p>
                                </div>
                                <button type="button" onClick={() => setFocusedActionId(null)} className="p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors shrink-0" aria-label="Close"><span className="material-icons-round text-xl">close</span></button>
                              </div>
                              <div className="space-y-4">
                                <div>
                                  <p className="text-[11px] font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-[0.18em] mb-1.5">Why now</p>
                                  <p className="text-sm text-slate-700 dark:text-slate-200 leading-relaxed">{focusedAction.consequence}</p>
                                </div>
                                <div>
                                  <p className="text-[11px] font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-[0.18em] mb-1.5">Business area</p>
                                  <p className="text-sm text-slate-700 dark:text-slate-200 leading-relaxed">{DOMAIN_RELEVANCE[focusedAction.domain] ?? `${focusedAction.domain} is directly affected by this rollout.`}</p>
                                </div>
                                <div className="pt-2">
                                  <button type="button" onClick={() => executeAction(focusedAction)} className="w-full rounded-xl bg-primary px-4 py-3 text-sm font-bold text-white hover:bg-primary/90 transition-colors shadow-sm">{focusedAction.cta}</button>
                                </div>
                              </div>
                            </div>
                          </div>
                        </motion.div>
                      </>
                    )}
                  </AnimatePresence>
                </div>
              ) : (
                <div className="flex items-center gap-3 px-5 py-4 rounded-xl bg-success/5 mb-8">
                  <span className="material-icons-round text-lg text-success">check_circle</span>
                  <span className="text-sm font-medium text-success">All clear — no critical decisions needed right now</span>
                </div>
              )}

              {/* ─── DOMAINS ─── */}
              <div className="space-y-2.5 mb-8">
                <span className="text-[11px] font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider px-1">Domains</span>
                <div className="space-y-2">
                  {domains.map((domain, i) => {
                    const isExpanded = expandedDomain === domain.name;
                    const healthDot = domain.health === 'healthy' ? 'bg-success' : domain.health === 'blocked' ? 'bg-danger' : domain.health === 'at_risk' ? 'bg-warning' : 'bg-slate-400';
                    const expandedAccent = domain.health === 'healthy' ? 'border-l-success' : domain.health === 'blocked' ? 'border-l-danger' : domain.health === 'at_risk' ? 'border-l-warning' : 'border-l-slate-300';
                    const relevanceText = DOMAIN_RELEVANCE[domain.name] ?? domain.mainSignal;

                    return (
                      <motion.div key={domain.name} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.25, delay: 0.04 * i }}
                        className={`rounded-xl overflow-hidden transition-all ${isExpanded ? `bg-slate-50 dark:bg-slate-900/60 border-l-[3px] ${expandedAccent} shadow-md` : 'bg-slate-50/60 dark:bg-slate-900/40 hover:bg-slate-100/80 dark:hover:bg-slate-800/40 hover:shadow-sm'}`}>
                        <button type="button" onClick={() => setExpandedDomain(isExpanded ? null : domain.name)} className="w-full text-left px-5 py-4 flex items-center gap-4">
                          <div className="relative shrink-0">
                            <div className="w-10 h-10 rounded-lg bg-white dark:bg-slate-800 flex items-center justify-center shadow-sm"><span className="material-icons-round text-lg text-slate-600 dark:text-slate-300">{domain.icon}</span></div>
                            <div className={`absolute -top-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border-2 border-slate-50 dark:border-slate-900 ${healthDot}`} />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-0.5">
                              <h3 className="text-sm font-semibold text-slate-900 dark:text-white">{domain.name}</h3>
                              <span className="text-[11px] text-slate-400">{domain.totalCount} unit{domain.totalCount !== 1 ? 's' : ''}</span>
                            </div>
                            <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">{relevanceText}</p>
                          </div>
                          <span className={`material-icons-round text-slate-400 transition-transform shrink-0 ${isExpanded ? 'rotate-180' : ''}`}>expand_more</span>
                        </button>
                        <AnimatePresence>
                          {isExpanded && (
                            <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }} className="overflow-hidden">
                              <div className="border-t border-slate-100 dark:border-slate-800 px-5 py-4 space-y-2.5">
                                {domain.units.map((unit, ui) => {
                                  const sm = STATE_META[unit.state];
                                  const hasBlocker = unit.blockers.some((b) => !b.escalated);
                                  return (
                                    <motion.div key={unit.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.2, delay: ui * 0.04 }}
                                      className={`rounded-xl p-4 transition-all ${focusedAction?.targetUnitId === unit.id ? 'bg-slate-200/80 dark:bg-slate-700/80 ring-1 ring-slate-300 dark:ring-slate-600' : hasBlocker ? 'bg-danger/5' : 'bg-white dark:bg-slate-800/60'}`}>
                                      <div className="flex items-start justify-between gap-3">
                                        <div className="flex items-center gap-3 min-w-0 flex-1">
                                          <div className={`w-2 h-2 rounded-full shrink-0 ${sm.dot}`} />
                                          <div className="min-w-0 flex-1">
                                            <div className="flex items-center gap-2 flex-wrap">
                                              <span className="text-sm font-semibold text-slate-900 dark:text-white">{unit.name}</span>
                                              <span className={`px-1.5 py-0.5 rounded text-[10px] font-semibold uppercase ${sm.cls}`}>{sm.label}</span>
                                            </div>
                                            {unit.owner ? <span className="text-xs text-slate-500 dark:text-slate-400">{unit.owner}</span> : <span className="text-xs text-danger/70 italic">No owner assigned</span>}
                                          </div>
                                        </div>
                                        <div className="flex items-center gap-1.5 shrink-0">
                                          {(['approved', 'trained', 'equipped'] as const).map((r) => (
                                            <div key={r} className={`w-5 h-5 rounded flex items-center justify-center ${unit.readiness[r] ? 'bg-success/10' : 'bg-slate-100 dark:bg-slate-800'}`} title={`${r}: ${unit.readiness[r] ? 'Yes' : 'No'}`}>
                                              <span className={`material-icons-round text-xs ${unit.readiness[r] ? 'text-success' : 'text-slate-400'}`}>{r === 'approved' ? 'check_circle' : r === 'trained' ? 'school' : 'build'}</span>
                                            </div>
                                          ))}
                                          {unit.state !== 'on_hold' && unit.state !== 'validated' && (
                                            <button type="button" onClick={() => handleHalt(unit.id)} className="ml-1 p-1 rounded hover:bg-danger/10 text-slate-400 hover:text-danger transition-colors" title="Halt rollout"><span className="material-icons-round text-sm">pause_circle</span></button>
                                          )}
                                        </div>
                                      </div>
                                      {unit.blockers.length > 0 && (
                                        <div className="mt-2 space-y-1">
                                          {unit.blockers.map((b) => (
                                            <div key={b.text} className={`flex items-center gap-2 text-xs px-2 py-1 rounded ${b.escalated ? 'bg-warning/10 text-warning' : 'bg-danger/10 text-danger'}`}>
                                              <span className="material-icons-round text-sm">{b.escalated ? 'escalator_warning' : 'block'}</span>
                                              <span className="flex-1">{b.text}</span>
                                              {b.escalated && <span className="text-[10px] font-semibold uppercase">Escalated</span>}
                                            </div>
                                          ))}
                                        </div>
                                      )}
                                      {unit.impact && (
                                        <div className="mt-2 flex items-center gap-3 text-xs">
                                          <span className={`font-semibold ${unit.impact.throughputDelta > 0 ? 'text-success' : 'text-danger'}`}>{unit.impact.throughputDelta > 0 ? '+' : ''}{unit.impact.throughputDelta}% throughput</span>
                                          <span className="text-slate-300 dark:text-slate-600">·</span>
                                          <span className={`font-semibold ${unit.impact.defectDelta < 0 ? 'text-success' : 'text-danger'}`}>{unit.impact.defectDelta}% defects</span>
                                          <span className="text-slate-300 dark:text-slate-600">·</span>
                                          <span className={`font-semibold ${unit.impact.costDelta < 0 ? 'text-success' : 'text-warning'}`}>{unit.impact.costDelta}% cost</span>
                                        </div>
                                      )}
                                    </motion.div>
                                  );
                                })}
                              </div>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </motion.div>
                    );
                  })}
                </div>
              </div>

              {/* ─── PENDING ACTIONS ─── */}
              {remainingActions.length > 0 && (
                <div className="border-t border-slate-100 dark:border-slate-800 pt-3 mb-8">
                  <button type="button" onClick={() => setShowRemainingActions((v) => !v)} className="flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300 transition-colors">
                    <span className="font-medium">{remainingActions.length} more pending action{remainingActions.length !== 1 ? 's' : ''}</span>
                    <span className={`material-icons-round text-sm transition-transform ${showRemainingActions ? 'rotate-180' : ''}`}>expand_more</span>
                  </button>
                  <AnimatePresence>
                    {showRemainingActions && (
                      <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }} className="overflow-hidden">
                        <div className="mt-2 space-y-1.5">
                          {remainingActions.map((action) => (
                            <div key={action.id} className="flex items-center gap-3 px-4 py-2.5 rounded-lg bg-slate-50/70 dark:bg-slate-900/40">
                              <span className={`material-icons-round text-sm ${action.priority === 'medium' ? 'text-warning' : 'text-slate-400'}`}>{action.icon}</span>
                              <span className="text-xs text-slate-600 dark:text-slate-300 flex-1 truncate">{action.description}</span>
                              <button type="button" onClick={() => executeAction(action)} className="px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 text-[11px] font-semibold hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors shrink-0">{action.cta}</button>
                            </div>
                          ))}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              )}

              {/* ─── STRATEGY ADVISOR ─── */}
              <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, delay: 0.25 }} className="rounded-2xl bg-slate-100/80 dark:bg-slate-800/60 backdrop-blur-sm p-6">
                {!advisorResponse && !advisorLoading && (
                  <div className="text-center space-y-4">
                    <div className="flex items-center justify-center gap-2">
                      <span className="material-icons-round text-xl text-slate-400">psychology</span>
                      <p className="text-lg font-semibold text-slate-700 dark:text-slate-200 tracking-tight">Ask what to do next</p>
                    </div>
                    <div className="flex flex-wrap items-center justify-center gap-2">
                      {advisorChips.map((chip, ci) => (
                        <button key={ci} type="button" onClick={() => handleAdvisorAsk(chip)}
                          className="px-3.5 py-2 rounded-xl text-xs font-medium bg-white dark:bg-slate-700/80 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-600/60 hover:border-primary/40 hover:text-primary dark:hover:text-primary transition-all shadow-sm hover:shadow-md">
                          {chip}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {advisorLoading && (
                  <div className="flex items-center justify-center gap-3 py-6">
                    <div className="flex gap-1">
                      <div className="w-2 h-2 rounded-full bg-slate-400 animate-bounce" style={{ animationDelay: '0ms' }} />
                      <div className="w-2 h-2 rounded-full bg-slate-400 animate-bounce" style={{ animationDelay: '150ms' }} />
                      <div className="w-2 h-2 rounded-full bg-slate-400 animate-bounce" style={{ animationDelay: '300ms' }} />
                    </div>
                    <p className="text-sm text-slate-400">Analyzing strategy context...</p>
                  </div>
                )}

                {advisorResponse && !advisorLoading && (
                  <div className="space-y-4">
                    <div className="flex items-start gap-3">
                      <div className="w-8 h-8 rounded-xl bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
                        <span className="material-icons-round text-primary text-base">auto_awesome</span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-slate-700 dark:text-slate-200 leading-relaxed whitespace-pre-line">{advisorResponse}</p>
                      </div>
                    </div>
                    <button type="button" onClick={() => setAdvisorResponse(null)} className="text-xs text-slate-400 hover:text-primary transition-colors flex items-center gap-1">
                      <span className="material-icons-round text-sm">refresh</span>Ask another question
                    </button>
                  </div>
                )}

                {!advisorLoading && (
                  <div className={`flex items-center gap-2 ${advisorResponse ? 'mt-4 pt-4 border-t border-slate-200 dark:border-slate-700/50' : 'mt-3'}`}>
                    <input
                      type="text"
                      value={advisorInput}
                      onChange={(e) => setAdvisorInput(e.target.value)}
                      onKeyDown={(e) => { if (e.key === 'Enter') handleAdvisorAsk(advisorInput); }}
                      placeholder="Ask about this strategy..."
                      className="flex-1 bg-white dark:bg-slate-700/60 border border-slate-200 dark:border-slate-600/50 rounded-xl px-4 py-2.5 text-sm text-slate-800 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary/40 transition-all"
                    />
                    <button type="button" onClick={() => handleAdvisorAsk(advisorInput)} disabled={!advisorInput.trim()}
                      className="w-10 h-10 rounded-xl bg-primary text-white flex items-center justify-center shrink-0 disabled:opacity-40 hover:bg-primary/90 transition-all shadow-sm">
                      <span className="material-icons-round text-lg">arrow_upward</span>
                    </button>
                  </div>
                )}
                <div ref={advisorEndRef} />
              </motion.div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ─── PROPAGATION OVERLAY (fixed, full-screen) ─── */}
      <AnimatePresence>
        {showPropagationMap && propagationGraph && (
          <PropagationOverlay
            graph={propagationGraph}
            strategyName={detailObjective?.name ?? 'Strategic Goal'}
            onClose={() => setShowPropagationMap(false)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
