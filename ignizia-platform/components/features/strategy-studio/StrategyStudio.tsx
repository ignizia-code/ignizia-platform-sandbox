'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import type {
  Strategy,
  Objective,
  Initiative,
  Run,
  Verdict,
  RunPayload,
  StrategyCopilotMessage,
  StrategyStage,
} from '@/types';
import {
  loadStrategies,
  createStrategyFromGoal,
  saveStrategies,
  loadObjectiveById,
  loadInitiativeById,
  saveObjective,
  saveInitiative,
  loadRuns,
  loadVerdicts,
  addRun,
  evaluateRun,
  promoteInitiative,
  rollbackInitiative,
  resetAllStrategyData,
} from '@/lib/strategyStorage';
import { addAuditEvent } from '@/lib/governanceStorage';
import EvidenceDrawer from './EvidenceDrawer';
import { useRouter } from 'next/navigation';

type StoryStep = 'plan' | 'trial' | 'verdict';

type StudioView = 'home' | 'detail';

const SAMPLE_PAYLOAD: RunPayload = {
  runId: '',
  initiativeId: '',
  startTime: new Date(Date.now() - 0.2 * 60_000).toISOString(),
  endTime: new Date().toISOString(),
  conveyorSpeedAvg: 1.8,
  conveyorSpeedMax: 2.3,
  boxTotal: 4,
  boxSuccess: 1,
  boxDropped: 3,
  overshootCount: 2,
};

const EXAMPLE_PROMPTS = [
  'Increase floor automation by 10% without increasing defects',
  'Reduce conveyor downtime by 15% through predictive maintenance',
  'Improve packing line throughput by 20% with smarter batching',
  'Cut defect rate by 25% on the cardbox line',
  'Optimize energy use on the main conveyor by 12%',
];

type CopilotChat = {
  id: string;
  messages: StrategyCopilotMessage[];
  title: string;
  strategyId: string | null;
  suggestionPrompt: string;
  createdAt: number;
};

const COPILOT_CHATS_KEY = 'strategy:copilot_chats';

function loadCopilotChats(): CopilotChat[] {
  try {
    const raw = typeof window !== 'undefined' ? localStorage.getItem(COPILOT_CHATS_KEY) : null;
    if (!raw) return [];
    const parsed = JSON.parse(raw) as CopilotChat[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function saveCopilotChats(chats: CopilotChat[]): void {
  try {
    if (typeof window !== 'undefined') {
      localStorage.setItem(COPILOT_CHATS_KEY, JSON.stringify(chats));
    }
  } catch {
    // ignore
  }
}

function createNewChat(): CopilotChat {
  const idx = loadCopilotChats().length % EXAMPLE_PROMPTS.length;
  return {
    id: `chat-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
    messages: [],
    title: 'New chat',
    strategyId: null,
    suggestionPrompt: EXAMPLE_PROMPTS[idx],
    createdAt: Date.now(),
  };
}

// ---------------------------------------------------------------------------
// Simulated copilot conversation for the demo
// ---------------------------------------------------------------------------

function buildCopilotConversation(goal: string): StrategyCopilotMessage[] {
  const now = Date.now();
  return [
    {
      id: `msg-${now}-1`,
      role: 'user',
      content: goal,
      timestamp: new Date(now).toISOString(),
    },
    {
      id: `msg-${now}-2`,
      role: 'assistant',
      content: `Great objective. I'll analyze your manufacturing line data to build a strategy around "${goal}".\n\nBefore I proceed — does this apply to all packing lines, or should I scope it to a specific line (e.g. cardboxes)?`,
      timestamp: new Date(now + 1500).toISOString(),
    },
    {
      id: `msg-${now}-3`,
      role: 'user',
      content: 'Focus on the cardboxes packing line for now.',
      timestamp: new Date(now + 4000).toISOString(),
    },
    {
      id: `msg-${now}-4`,
      role: 'assistant',
      content: `Got it. I'm creating a strategy focused on the cardboxes packing line with an AI conveyor speed controller.\n\n**Strategy created in Trial mode** — you can review the plan, run a digital twin trial in Omniverse, and evaluate the results before promoting to production.`,
      timestamp: new Date(now + 6000).toISOString(),
    },
  ];
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

const StrategyStudio: React.FC = () => {
  const router = useRouter();

  // Top-level state
  const [studioView, setStudioView] = useState<StudioView>('home');
  const [strategies, setStrategies] = useState<Strategy[]>([]);

  // Copilot chat state — multiple chats with sidebar
  const [chats, setChats] = useState<CopilotChat[]>(() => {
    const loaded = loadCopilotChats();
    if (loaded.length === 0) {
      const initial = createNewChat();
      saveCopilotChats([initial]);
      return [initial];
    }
    return loaded;
  });
  const [activeChatId, setActiveChatId] = useState<string | null>(() => {
    const loaded = loadCopilotChats();
    return loaded[0]?.id ?? null;
  });
  const [copilotInput, setCopilotInput] = useState('');
  const [copilotStreaming, setCopilotStreaming] = useState(false);
  const [copilotStreamIdx, setCopilotStreamIdx] = useState(0);
  const [chatSidebarOpen, setChatSidebarOpen] = useState(false);
  const copilotEndRef = useRef<HTMLDivElement>(null);

  const activeChat = chats.find((c) => c.id === activeChatId) ?? null;
  const copilotMessages = activeChat?.messages ?? [];

  // Selected strategy detail state
  const [selectedStrategy, setSelectedStrategy] = useState<Strategy | null>(null);
  const [objective, setObjective] = useState<Objective | null>(null);
  const [initiative, setInitiative] = useState<Initiative | null>(null);
  const [runs, setRuns] = useState<Run[]>([]);
  const [latestVerdict, setLatestVerdict] = useState<Verdict | null>(null);
  const [step, setStep] = useState<StoryStep>('plan');
  const [initiativeExpanded, setInitiativeExpanded] = useState(false);

  // Trial input state
  const [inputMode, setInputMode] = useState<'form' | 'json'>('form');
  const [jsonInput, setJsonInput] = useState('');
  const [formSpeed, setFormSpeed] = useState('1.8');
  const [formSpeedMax, setFormSpeedMax] = useState('2.3');
  const [formBoxTotal, setFormBoxTotal] = useState('4');
  const [formBoxSuccess, setFormBoxSuccess] = useState('1');
  const [formBoxDropped, setFormBoxDropped] = useState('3');
  const [formDuration, setFormDuration] = useState('0.2');

  // Evidence drawer
  const [drawerOpen, setDrawerOpen] = useState(false);

  // Omniverse run metrics (populated once when a new run completes — not continuously)
  const [lastOmniRunId, setLastOmniRunId] = useState<string | null>(null);
  const [omniThroughput, setOmniThroughput] = useState<number | null>(null);
  const [omniTimestamp, setOmniTimestamp] = useState<string | null>(null);
  const lastAppliedRunIdRef = useRef<string | null>(null);

  // Animation
  const [animateVerdict, setAnimateVerdict] = useState(false);
  const verdictRef = useRef<HTMLDivElement>(null);

  // ---------------------------------------------------------------------------
  // Helpers to persist per-strategy stage (plan/trial/verdict)
  // ---------------------------------------------------------------------------

  const persistStrategyStage = useCallback((strategyId: string, stage: StrategyStage) => {
    setStrategies(prev => {
      const updated = prev.map((s) => (s.id === strategyId ? { ...s, stage } : s));
      saveStrategies(updated);
      return updated;
    });
  }, []);

  // ---------------------------------------------------------------------------
  // Bootstrap — load existing strategies from storage
  // ---------------------------------------------------------------------------

  useEffect(() => {
    const existing = loadStrategies();
    setStrategies(existing);
  }, []);

  // Poll Omniverse run metrics when on trial step — update form only when a NEW run completes
  useEffect(() => {
    if (step !== 'trial') return;

    const poll = async () => {
      try {
        const res = await fetch('/api/omniverse/run-metrics');
        const data = (await res.json()) as {
          runId?: string;
          durationSeconds?: number;
          conveyorSpeedAvg?: number;
          conveyorSpeedMax?: number;
          boxTotal?: number;
          boxSuccess?: number;
          boxDropped?: number;
          throughputBoxesPerMinute?: number;
          timestamp?: string;
        };
        if (!data?.runId) return;

        // Only apply when we see a new run — don't overwrite manual edits
        if (data.runId === lastAppliedRunIdRef.current) return;
        lastAppliedRunIdRef.current = data.runId;

        setLastOmniRunId(data.runId);
        if (data.throughputBoxesPerMinute != null) setOmniThroughput(data.throughputBoxesPerMinute);
        if (data.timestamp) {
          const d = new Date(data.timestamp);
          setOmniTimestamp(d.toLocaleString(undefined, { dateStyle: 'short', timeStyle: 'short' }));
        }

        // Omniverse sends speed in cm/s (180 = 1.8 m/s); duration in seconds
        if (data.conveyorSpeedAvg != null) setFormSpeed((data.conveyorSpeedAvg / 100).toFixed(2));
        if (data.conveyorSpeedMax != null) setFormSpeedMax((data.conveyorSpeedMax / 100).toFixed(2));
        if (data.boxTotal != null) setFormBoxTotal(String(data.boxTotal));
        if (data.boxSuccess != null) setFormBoxSuccess(String(data.boxSuccess));
        if (data.boxDropped != null) setFormBoxDropped(String(data.boxDropped));
        if (data.durationSeconds != null) setFormDuration((data.durationSeconds / 60).toFixed(2));
      } catch {
        // ignore
      }
    };

    poll();
    const interval = setInterval(poll, 2500);
    return () => clearInterval(interval);
  }, [step]);

  // Auto-scroll copilot chat
  useEffect(() => {
    copilotEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [copilotMessages]);

  // ---------------------------------------------------------------------------
  // Streaming simulation for copilot messages
  // ---------------------------------------------------------------------------

  useEffect(() => {
    if (!copilotStreaming) return;

    const pendingMessages = copilotMessages.filter((_, i) => i >= copilotStreamIdx);
    if (pendingMessages.length === 0) {
      setCopilotStreaming(false);
      return;
    }

    const nextMsg = copilotMessages[copilotStreamIdx];
    if (!nextMsg) {
      setCopilotStreaming(false);
      return;
    }

    const delay = nextMsg.role === 'user' ? 600 : 1200;
    const timer = setTimeout(() => {
      setCopilotStreamIdx(prev => prev + 1);
    }, delay);

    return () => clearTimeout(timer);
  }, [copilotStreaming, copilotStreamIdx, copilotMessages]);

  // When streaming is complete and the last message is the final assistant message, create the strategy
  useEffect(() => {
    if (copilotStreaming && copilotStreamIdx >= copilotMessages.length && copilotMessages.length > 0 && activeChatId) {
      setCopilotStreaming(false);
      const lastMsg = copilotMessages[copilotMessages.length - 1];
      if (lastMsg.role === 'assistant' && lastMsg.content.includes('Strategy created')) {
        const userGoal = copilotMessages[0]?.content || EXAMPLE_PROMPTS[0];
        const result = createStrategyFromGoal(userGoal);
        setStrategies(loadStrategies());
        setSelectedStrategy(result.strategy);
        setObjective(result.objective);
        setInitiative(result.initiative);
        // Associate strategy with this chat
        setChats((prev) => {
          const next = prev.map((c) =>
            c.id === activeChatId
              ? {
                  ...c,
                  messages: copilotMessages,
                  strategyId: result.strategy.id,
                  title: c.title === 'New chat' ? userGoal.slice(0, 40) + (userGoal.length > 40 ? '…' : '') : c.title,
                }
              : c
          );
          saveCopilotChats(next);
          return next;
        });
      }
    }
  }, [copilotStreaming, copilotStreamIdx, copilotMessages, activeChatId]);

  // ---------------------------------------------------------------------------
  // Copilot actions
  // ---------------------------------------------------------------------------

  const handleCopilotSend = () => {
    const goal = copilotInput.trim();
    if (!goal || copilotStreaming || !activeChatId) return;

    const conversation = buildCopilotConversation(goal);
    setChats((prev) => {
      const next = prev.map((c) =>
        c.id === activeChatId
          ? {
              ...c,
              messages: conversation,
              title: c.title === 'New chat' ? goal.slice(0, 40) + (goal.length > 40 ? '…' : '') : c.title,
            }
          : c
      );
      saveCopilotChats(next);
      return next;
    });
    setCopilotStreamIdx(0);
    setCopilotStreaming(true);
    setCopilotInput('');
  };

  const handleNewChat = () => {
    const newChat = createNewChat();
    setChats((prev) => {
      const next = [...prev, newChat];
      saveCopilotChats(next);
      return next;
    });
    setActiveChatId(newChat.id);
    setCopilotStreamIdx(0);
    setCopilotStreaming(false);
    setCopilotInput('');
  };

  const handleSelectChat = (chatId: string) => {
    const chat = chats.find((c) => c.id === chatId);
    setActiveChatId(chatId);
    setCopilotStreamIdx(chat?.messages.length ?? 0);
    setCopilotStreaming(false);
    setCopilotInput('');
    setChatSidebarOpen(false);
  };

  const handleCopilotKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleCopilotSend();
    }
  };

  // ---------------------------------------------------------------------------
  // Strategy card click — open detail view
  // ---------------------------------------------------------------------------

  const openStrategy = useCallback((strat: Strategy) => {
    setSelectedStrategy(strat);

    // Load per-strategy objective and initiative (not global)
    const loadedObj = loadObjectiveById(strat.objectiveId);
    const nowIso = new Date().toISOString();
    const objectiveStatus: Objective['status'] =
      strat.status === 'validated'
        ? 'validated'
        : strat.status === 'rolled_back'
          ? 'rolled_back'
          : 'trial';

    const objectiveForStrategy: Objective = loadedObj
      ? { ...loadedObj, currentPercent: strat.progressPercent, status: objectiveStatus, updatedAt: nowIso }
      : {
          id: strat.objectiveId,
          name: strat.name,
          description: strat.description ?? strat.name,
          targetPercent: 10,
          currentPercent: strat.progressPercent,
          status: objectiveStatus,
          createdAt: nowIso,
          updatedAt: nowIso,
        };

    setObjective(objectiveForStrategy);

    let init = loadInitiativeById(strat.initiativeId);
    if (!init) {
      // Fallback for migrated/legacy strategies
      init = {
        id: strat.initiativeId,
        objectiveId: strat.objectiveId,
        name: 'Conveyor AI speed optimization — cardboxes packing line',
        description:
          'Use AI to dynamically control conveyor belt speed, maximizing throughput while keeping error rate and drop count within safe guardrails.',
        type: 'Physical automation + AI controller',
        status: 'idea',
        recommendedPath: 'build',
        guardrails: { maxSpeed: 2.5, maxErrorRate: 0.05, maxDropCount: 3, emergencyStopThreshold: 0.12 },
        aiSummary:
          'Based on your goal, I recommend optimizing the cardboxes packing conveyor with an AI speed controller.',
        automationLiftPercent: 10,
        createdAt: nowIso,
        updatedAt: nowIso,
      };
      saveInitiative(init);
    }
    setInitiative(init);

    // For stage logic, look only at runs & verdicts for this strategy's initiative.
    const allRuns = loadRuns();
    const runsForThis = allRuns.filter((r) => r.initiativeId === strat.initiativeId);
    setRuns(runsForThis);

    const allVerdicts = loadVerdicts();
    const verdictsForThis = allVerdicts.filter((v) => v.initiativeId === strat.initiativeId);
    if (verdictsForThis.length > 0) {
      setLatestVerdict(verdictsForThis[verdictsForThis.length - 1]);
    } else {
      setLatestVerdict(null);
    }

    const hasRuns = runsForThis.length > 0;
    const hasVerdict = verdictsForThis.length > 0;

    // Prefer the persisted UI stage on the strategy when available,
    // but upgrade to verdict if we now have a verdict for this initiative.
    let nextStep: StoryStep;
    if (strat.stage) {
      nextStep = strat.stage === 'plan' || strat.stage === 'trial' || strat.stage === 'verdict' ? strat.stage : 'plan';
      if (hasVerdict) {
        nextStep = 'verdict';
      }
    } else if (strat.status === 'validated' || objectiveForStrategy.status === 'validated') {
      nextStep = 'verdict';
    } else if (!hasRuns && !hasVerdict) {
      nextStep = 'plan';
    } else if (hasRuns && !hasVerdict) {
      nextStep = 'trial';
    } else {
      nextStep = 'verdict';
    }
    setStep(nextStep);

    setInitiativeExpanded(false);
    setStudioView('detail');
  }, []);

  // ---------------------------------------------------------------------------
  // Actions
  // ---------------------------------------------------------------------------

  const refresh = useCallback(() => {
    const strats = loadStrategies();
    setStrategies(strats);
    if (selectedStrategy) {
      const obj = loadObjectiveById(selectedStrategy.objectiveId);
      const init = loadInitiativeById(selectedStrategy.initiativeId);
      if (obj) setObjective(obj);
      if (init) setInitiative(init);
    }
    setRuns(loadRuns());
    const v = loadVerdicts();
    if (v.length > 0) setLatestVerdict(v[v.length - 1]);
  }, [selectedStrategy]);

  const handleStartTrial = () => {
    if (!initiative) return;
    const updated = { ...initiative, status: 'trial_running' as const, updatedAt: new Date().toISOString() };
    saveInitiative(updated);
    setInitiative(updated);
    setStep('trial');
    if (selectedStrategy) {
      persistStrategyStage(selectedStrategy.id, 'trial');
    }
    addAuditEvent({
      timestamp: new Date().toISOString(),
      type: 'trial_started',
      actor: 'Leader',
      details: `Trial started for initiative "${initiative.name}"`,
      initiativeId: initiative.id,
      objectiveId: initiative.objectiveId,
    });
  };

  const handleSubmitRun = () => {
    if (!initiative) return;

    let payload: RunPayload;

    if (inputMode === 'json') {
      try {
        payload = JSON.parse(jsonInput) as RunPayload;
      } catch {
        alert('Invalid JSON. Please paste a valid RunPayload.');
        return;
      }
    } else {
      const now = new Date();
      const durationMs = parseFloat(formDuration) * 60_000;
      payload = {
        runId: '',
        initiativeId: initiative.id,
        startTime: new Date(now.getTime() - durationMs).toISOString(),
        endTime: now.toISOString(),
        conveyorSpeedAvg: parseFloat(formSpeed) || 0,
        conveyorSpeedMax: parseFloat(formSpeedMax) || 0,
        boxTotal: parseInt(formBoxTotal) || 0,
        boxSuccess: parseInt(formBoxSuccess) || 0,
        boxDropped: parseInt(formBoxDropped) || 0,
      };
    }

    payload.initiativeId = initiative.id;

    const run = addRun(payload);
    const verdict = evaluateRun(run, initiative);

    const updatedInit = {
      ...initiative,
      status: 'trial_completed' as const,
      updatedAt: new Date().toISOString(),
    };
    saveInitiative(updatedInit);
    setInitiative(updatedInit);
    setLatestVerdict(verdict);
    setRuns(loadRuns().filter((r) => r.initiativeId === initiative.id));
    setStep('verdict');
    if (selectedStrategy) {
      persistStrategyStage(selectedStrategy.id, 'verdict');
    }
    setAnimateVerdict(true);
    setTimeout(() => verdictRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' }), 100);
  };

  const handlePromote = () => {
    if (!objective || !initiative) return;
    const result = promoteInitiative(objective, initiative);
    if (result) {
      setObjective(result.objective);
      setInitiative(result.initiative);
      setSelectedStrategy(result.strategy);
      setStrategies(loadStrategies());
    }
  };

  const handleRollback = () => {
    if (!objective || !initiative) return;
    const result = rollbackInitiative(objective, initiative);
    if (result) {
      setObjective(result.objective);
      setInitiative(result.initiative);
      setSelectedStrategy(result.strategy);
      setStrategies(loadStrategies());
    }
  };

  const handleReset = () => {
    resetAllStrategyData();
    setStrategies([]);
    setSelectedStrategy(null);
    setObjective(null);
    setInitiative(null);
    setRuns([]);
    setLatestVerdict(null);
    const freshChat = createNewChat();
    setChats([freshChat]);
    setActiveChatId(freshChat.id);
    saveCopilotChats([freshChat]);
    setCopilotInput('');
    setCopilotStreaming(false);
    setCopilotStreamIdx(0);
    setStep('plan');
    setStudioView('home');
    setAnimateVerdict(false);
    setInitiativeExpanded(false);
  };

  const handleBackToHome = () => {
    setStudioView('home');
    setSelectedStrategy(null);
    setStrategies(loadStrategies());
  };

  // ---------------------------------------------------------------------------
  // Status helpers
  // ---------------------------------------------------------------------------

  const statusColor = (s: string) => {
    switch (s) {
      case 'validated':
        return 'bg-success/10 dark:bg-success/15 text-success';
      case 'trial':
      case 'trial_running':
      case 'trial_completed':
        return 'bg-warning/10 dark:bg-warning/15 text-warning';
      case 'rolled_back':
        return 'bg-danger/10 dark:bg-danger/15 text-danger';
      default:
        return 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400';
    }
  };

  // ---------------------------------------------------------------------------
  // Render: HOME view — copilot + strategy cards
  // ---------------------------------------------------------------------------

  const renderHome = () => {
    const hasStrategies = strategies.length > 0;
    const visibleMessages = copilotMessages.slice(0, copilotStreamIdx);

    return (
      <div className="flex-1 flex flex-col px-8 py-6 gap-8 max-w-5xl mx-auto w-full">
        {/* Strategy Copilot */}
        <div className="flex-shrink-0 flex gap-0">
          {/* Chat sidebar */}
          <div
            className={`flex flex-col border border-slate-200 dark:border-slate-700 rounded-l-2xl bg-slate-50 dark:bg-slate-900/80 transition-all overflow-hidden ${
              chatSidebarOpen ? 'w-56 min-w-[14rem]' : 'w-0 min-w-0 border-0 opacity-0'
            }`}
          >
            <div className="px-3 py-3 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide">
                Chats
              </span>
              <button
                onClick={() => setChatSidebarOpen(false)}
                className="p-1 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-500"
                aria-label="Close sidebar"
              >
                <span className="material-icons-round text-lg">chevron_left</span>
              </button>
            </div>
            <div className="flex-1 overflow-y-auto py-2 max-h-64">
              {chats.map((chat) => (
                <button
                  key={chat.id}
                  onClick={() => handleSelectChat(chat.id)}
                  className={`w-full text-left px-3 py-2.5 text-sm truncate flex items-center gap-2 transition-colors ${
                    chat.id === activeChatId
                      ? 'bg-primary/10 dark:bg-primary/20 text-primary'
                      : 'hover:bg-slate-200/60 dark:hover:bg-slate-700/60 text-slate-700 dark:text-slate-300'
                  }`}
                >
                  <span className="material-icons-round text-base shrink-0">
                    {chat.strategyId ? 'check_circle' : 'chat_bubble_outline'}
                  </span>
                  <span className="truncate">{chat.title}</span>
                </button>
              ))}
            </div>
          </div>
          <div
            className={`flex-1 border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900/60 overflow-hidden min-w-0 ${
              chatSidebarOpen ? 'rounded-r-2xl border-l-0' : 'rounded-2xl'
            }`}
          >
            {/* Copilot header */}
            <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between gap-3">
              <div className="flex items-center gap-3 min-w-0">
                <button
                  onClick={() => setChatSidebarOpen((o) => !o)}
                  className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 shrink-0"
                  aria-label="Toggle chat history"
                >
                  <span className="material-icons-round text-lg">menu</span>
                </button>
                <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-accent to-primary flex items-center justify-center shrink-0">
                  <span className="material-icons-round text-white text-lg">auto_awesome</span>
                </div>
                <div className="min-w-0">
                  <h2 className="font-bold text-slate-900 dark:text-white text-base">Strategy Copilot</h2>
                  <p className="text-xs text-slate-500 dark:text-slate-400 truncate">
                    Describe your goal — I&apos;ll create a strategy with guardrails and a trial plan
                  </p>
                </div>
              </div>
              <button
                onClick={handleNewChat}
                className="shrink-0 px-3 py-2 rounded-xl bg-primary/10 dark:bg-primary/20 text-primary hover:bg-primary/20 dark:hover:bg-primary/30 text-sm font-medium flex items-center gap-2 transition-colors"
              >
                <span className="material-icons-round text-lg">add</span>
                New chat
              </button>
            </div>

            {/* Chat area */}
            {visibleMessages.length > 0 && (
              <div className="px-6 py-4 space-y-3 max-h-72 overflow-y-auto bg-slate-50/50 dark:bg-slate-950/30">
                {visibleMessages.map((msg) => (
                  <div
                    key={msg.id}
                    className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'} animate-in fade-in slide-in-from-bottom-2 duration-300`}
                  >
                    <div
                      className={`max-w-md px-4 py-2.5 rounded-2xl text-sm leading-relaxed whitespace-pre-wrap ${
                        msg.role === 'user'
                          ? 'bg-primary text-white rounded-br-sm'
                          : 'bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 border border-slate-200 dark:border-slate-700 rounded-bl-sm shadow-sm'
                      }`}
                    >
                      {msg.content}
                    </div>
                  </div>
                ))}
                {copilotStreaming && copilotStreamIdx < copilotMessages.length && (
                  <div className="flex justify-start">
                    <div className="bg-white dark:bg-slate-800 px-4 py-3 rounded-2xl rounded-bl-sm border border-slate-200 dark:border-slate-700 shadow-sm">
                      <div className="flex gap-1.5">
                        <div className="w-2 h-2 bg-accent rounded-full animate-bounce" />
                        <div className="w-2 h-2 bg-accent rounded-full animate-bounce" style={{ animationDelay: '0.1s' }} />
                        <div className="w-2 h-2 bg-accent rounded-full animate-bounce" style={{ animationDelay: '0.2s' }} />
                      </div>
                    </div>
                  </div>
                )}
                <div ref={copilotEndRef} />
              </div>
            )}

            {/* Input area */}
            <div className="px-6 py-4 border-t border-slate-100 dark:border-slate-800">
              {visibleMessages.length === 0 && (
                <button
                  onClick={() => setCopilotInput(activeChat?.suggestionPrompt ?? EXAMPLE_PROMPTS[0])}
                  className="mb-3 text-xs text-accent hover:text-primary dark:hover:text-accent/80 transition-colors flex items-center gap-1.5"
                >
                  <span className="material-icons-round text-sm">lightbulb</span>
                  Try: &quot;{activeChat?.suggestionPrompt ?? EXAMPLE_PROMPTS[0]}&quot;
                </button>
              )}
              <div className="flex items-center gap-3">
                <input
                  type="text"
                  value={copilotInput}
                  onChange={(e) => setCopilotInput(e.target.value)}
                  onKeyDown={handleCopilotKeyPress}
                  placeholder="Describe your strategic goal..."
                  disabled={copilotStreaming}
                  className="flex-1 px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white text-sm placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-accent/40 transition-all disabled:opacity-50"
                />
                <button
                  onClick={handleCopilotSend}
                  disabled={!copilotInput.trim() || copilotStreaming}
                  className="w-11 h-11 rounded-xl bg-primary hover:bg-primary/90 disabled:bg-slate-200 dark:disabled:bg-slate-700 text-white disabled:text-slate-400 flex items-center justify-center transition-all shadow-sm hover:shadow-md disabled:shadow-none"
                >
                  <span className="material-icons-round text-lg">send</span>
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Strategy cards list */}
        {hasStrategies ? (
          <div className="space-y-3">
            <h3 className="text-sm font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide">
              Your Strategies
            </h3>
            {strategies.map((strat) => (
              <button
                key={strat.id}
                onClick={() => openStrategy(strat)}
                className="w-full text-left rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900/60 p-5 hover:border-accent/40 dark:hover:border-accent/30 hover:shadow-md transition-all group"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1.5">
                      <span
                        className={`px-2 py-0.5 rounded-full text-[11px] font-semibold uppercase tracking-wide ${statusColor(strat.status)}`}
                      >
                        {strat.status.replace(/_/g, ' ')}
                      </span>
                      <span className="text-xs text-slate-400 dark:text-slate-500">
                        {strat.initiativeCount} initiative{strat.initiativeCount !== 1 ? 's' : ''} in trial
                      </span>
                    </div>
                    <h4 className="text-base font-bold text-slate-900 dark:text-white group-hover:text-primary dark:group-hover:text-accent transition-colors">
                      {strat.name}
                    </h4>
                  </div>
                  <div className="flex items-center gap-3 flex-shrink-0">
                    {/* Progress ring */}
                    <svg viewBox="0 0 48 48" className="w-12 h-12">
                      <circle
                        cx="24" cy="24" r="20"
                        fill="none" stroke="currentColor" strokeWidth="3"
                        className="text-slate-100 dark:text-slate-800"
                      />
                      <circle
                        cx="24" cy="24" r="20"
                        fill="none" stroke="currentColor" strokeWidth="3"
                        strokeDasharray={`${(strat.progressPercent / 10) * 125.6} 125.6`}
                        strokeLinecap="round"
                        transform="rotate(-90 24 24)"
                        className={strat.status === 'validated' ? 'text-success' : 'text-accent'}
                      />
                      <text
                        x="24" y="27"
                        textAnchor="middle"
                        className="fill-slate-900 dark:fill-white font-bold"
                        fontSize="12"
                      >
                        {strat.progressPercent}%
                      </text>
                    </svg>
                    <span className="material-icons-round text-slate-300 dark:text-slate-600 group-hover:text-accent transition-colors">
                      chevron_right
                    </span>
                  </div>
                </div>
              </button>
            ))}
          </div>
        ) : (
          !copilotStreaming && visibleMessages.length === 0 && (
            <div className="text-center py-12">
              <span className="material-icons-round text-5xl text-slate-200 dark:text-slate-700 mb-4 block">
                insights
              </span>
              <p className="text-slate-400 dark:text-slate-500 text-sm max-w-sm mx-auto">
                No strategies yet. Use the Strategy Copilot above to describe your goal and create your first AI-powered strategy.
              </p>
            </div>
          )
        )}
      </div>
    );
  };

  // ---------------------------------------------------------------------------
  // Render: DETAIL view — Plan / Trial / Verdict for a selected strategy
  // ---------------------------------------------------------------------------

  const renderDetail = () => {
    if (!selectedStrategy || !objective || !initiative) return null;

    const latestRun = runs[runs.length - 1] ?? null;
    const steps: StoryStep[] = ['plan', 'trial', 'verdict'];
    const currentIdx = steps.indexOf(step);

    return (
      <div className="flex-1 flex flex-col px-8 py-6 max-w-5xl mx-auto w-full">
        {/* Back button + strategy header */}
        <div className="flex items-start gap-4 mb-6">
          <button
            onClick={handleBackToHome}
            className="mt-1 w-8 h-8 rounded-lg flex items-center justify-center hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <span className="material-icons-round text-slate-500">arrow_back</span>
          </button>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <span
                className={`px-2 py-0.5 rounded-full text-[11px] font-semibold uppercase tracking-wide ${statusColor(objective.status)}`}
              >
                {objective.status.replace(/_/g, ' ')}
              </span>
            </div>
            <h2 className="text-xl font-bold text-slate-900 dark:text-white">
              {objective.name}
            </h2>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
              Target: +{objective.targetPercent}% · Progress: {objective.currentPercent}%
            </p>
          </div>
          {/* Progress ring */}
          <svg viewBox="0 0 64 64" className="w-16 h-16 flex-shrink-0">
            <circle
              cx="32" cy="32" r="27"
              fill="none" stroke="currentColor" strokeWidth="4"
              className="text-slate-100 dark:text-slate-800"
            />
            <circle
              cx="32" cy="32" r="27"
              fill="none" stroke="currentColor" strokeWidth="4"
              strokeDasharray={`${(objective.currentPercent / objective.targetPercent) * 169.6} 169.6`}
              strokeLinecap="round"
              transform="rotate(-90 32 32)"
              className={objective.status === 'validated' ? 'text-success' : 'text-accent'}
            />
            <text
              x="32" y="36"
              textAnchor="middle"
              className="fill-slate-900 dark:fill-white font-bold"
              fontSize="14"
            >
              {objective.currentPercent}%
            </text>
          </svg>
        </div>

        {/* Step indicator */}
        <div className="flex items-center gap-4 mb-6">
          {steps.map((s, i) => (
            <React.Fragment key={s}>
              {i > 0 && <div className="flex-1 h-px bg-slate-200 dark:bg-slate-700" />}
              <div className="flex items-center gap-2">
                <div
                  className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
                    s === step
                      ? 'bg-primary text-white shadow-lg shadow-primary/30'
                      : i < currentIdx
                        ? 'bg-success text-white'
                        : 'bg-slate-200 dark:bg-slate-700 text-slate-500 dark:text-slate-400'
                  }`}
                >
                  {i < currentIdx ? (
                    <span className="material-icons-round text-sm">check</span>
                  ) : (
                    i + 1
                  )}
                </div>
                <span
                  className={`text-sm font-medium capitalize ${
                    s === step
                      ? 'text-primary dark:text-accent'
                      : i < currentIdx
                        ? 'text-success'
                        : 'text-slate-400 dark:text-slate-500'
                  }`}
                >
                  {s}
                </span>
              </div>
            </React.Fragment>
          ))}
        </div>

        {/* Main content card */}
        <div className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900/60 overflow-hidden flex-1">
          {/* ---- PLAN ---- */}
          {step === 'plan' && (
            <div className="p-6 space-y-6 animate-in fade-in duration-500">
              {/* AI recommendation */}
              <div className="rounded-xl bg-gradient-to-br from-accent/5 to-primary/5 dark:from-accent/10 dark:to-primary/5 border border-accent/20 dark:border-accent/15 p-5">
                <div className="flex items-start gap-3">
                  <span className="material-icons-round text-accent text-xl mt-0.5">psychology</span>
                  <div>
                    <h4 className="font-semibold text-slate-900 dark:text-white text-sm mb-1">
                      AI Recommended Plan
                    </h4>
                    <p className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed">
                      {initiative.aiSummary}
                    </p>
                  </div>
                </div>
              </div>

              {/* Initiative card (collapsed by default) */}
              <div className="rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden">
                <button
                  onClick={() => setInitiativeExpanded(!initiativeExpanded)}
                  className="w-full flex items-center justify-between px-5 py-4 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <span className="material-icons-round text-accent">precision_manufacturing</span>
                    <div className="text-left">
                      <h4 className="font-semibold text-slate-900 dark:text-white text-sm">{initiative.name}</h4>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className={`px-1.5 py-0.5 rounded text-[10px] font-semibold uppercase ${statusColor(initiative.status)}`}>
                          {initiative.status.replace(/_/g, ' ')}
                        </span>
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-accent/10 dark:bg-accent/15 text-primary dark:text-accent font-semibold uppercase">
                          {initiative.recommendedPath}
                        </span>
                      </div>
                    </div>
                  </div>
                  <span className="material-icons-round text-slate-400">
                    {initiativeExpanded ? 'expand_less' : 'expand_more'}
                  </span>
                </button>

                {initiativeExpanded && (
                  <div className="px-5 pb-5 space-y-4 border-t border-slate-100 dark:border-slate-800 pt-4 animate-in fade-in slide-in-from-top-2 duration-300">
                    <p className="text-sm text-slate-600 dark:text-slate-400">{initiative.description}</p>

                    {/* Guardrails */}
                    <div>
                      <h5 className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-2 flex items-center gap-1">
                        <span className="material-icons-round text-warning text-sm">shield</span>
                        Guardrails
                      </h5>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                        {([
                          { label: 'Max speed', value: `${initiative.guardrails.maxSpeed} m/s` },
                          { label: 'Max error rate', value: `${(initiative.guardrails.maxErrorRate * 100).toFixed(1)}%` },
                          { label: 'Max drops/min', value: `${initiative.guardrails.maxDropCount}` },
                          { label: 'E-stop', value: `${(initiative.guardrails.emergencyStopThreshold * 100).toFixed(0)}%` },
                        ] as const).map((g) => (
                          <div key={g.label} className="rounded-lg border border-slate-200 dark:border-slate-700 p-2.5 text-center">
                            <div className="text-base font-bold text-slate-900 dark:text-white">{g.value}</div>
                            <div className="text-[10px] text-slate-500 dark:text-slate-400 font-medium">{g.label}</div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* CTA */}
              {strategies.some((s) => s.id !== selectedStrategy?.id && s.stage === 'trial') ? (
                <div className="space-y-2">
                  <p className="text-sm text-slate-600 dark:text-slate-400">
                    Another strategy is in trial. Complete or roll back that trial first.
                  </p>
                  <button
                    disabled
                    className="px-6 py-3 rounded-xl bg-slate-200 dark:bg-slate-700 text-slate-500 dark:text-slate-400 font-semibold cursor-not-allowed flex items-center gap-2"
                  >
                    <span className="material-icons-round text-base">play_arrow</span>
                    Start Trial
                  </button>
                </div>
              ) : (
                <button
                  onClick={handleStartTrial}
                  className="px-6 py-3 rounded-xl bg-primary text-white font-semibold hover:bg-primary/90 transition-colors shadow-lg shadow-primary/20 flex items-center gap-2"
                >
                  <span className="material-icons-round text-base">play_arrow</span>
                  Start Trial
                </button>
              )}
            </div>
          )}

          {/* ---- TRIAL ---- */}
          {step === 'trial' && (
            <div className="p-6 space-y-6 animate-in fade-in duration-500">
              <div className="flex items-center gap-3 p-4 rounded-xl bg-warning/5 dark:bg-warning/5 border border-warning/20 dark:border-warning/15">
                <span className="material-icons-round text-warning text-xl">science</span>
                <div>
                  <h4 className="font-semibold text-slate-900 dark:text-white text-sm">Trial in Progress</h4>
                  <p className="text-xs text-slate-600 dark:text-slate-400">
                    Launch your Omniverse rehearsal, run the scene, then submit results below.
                  </p>
                </div>
              </div>

              <button
                onClick={async () => {
                  const speed = parseFloat(formSpeed) || 1.8;
                  const { setConveyorSpeed, DEFAULT_CONVEYOR_PATH } = await import('@/lib/omniverseBus');
                  setConveyorSpeed(speed, DEFAULT_CONVEYOR_PATH);
                  router.push('/Omniverse');
                }}
                className="px-4 py-2.5 rounded-xl bg-primary text-white font-medium hover:bg-primary/90 transition-colors flex items-center gap-2 text-sm"
              >
                <span className="material-icons-round text-base">view_in_ar</span>
                Launch Omniverse Session
              </button>

              {lastOmniRunId && (
                <div className="p-3 rounded-lg bg-success/5 dark:bg-success/5 border border-success/20 text-xs text-slate-600 dark:text-slate-400">
                  <span className="font-medium text-success">Last run from Omniverse</span>
                  {omniTimestamp && <span className="ml-2">{omniTimestamp}</span>}
                  {omniThroughput != null && (
                    <span className="ml-2">• {omniThroughput.toFixed(1)} boxes/min</span>
                  )}
                </div>
              )}

              {/* Submit run */}
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <h4 className="text-sm font-semibold text-slate-900 dark:text-white">Submit Run Results</h4>
                  <div className="ml-auto flex rounded-lg border border-slate-200 dark:border-slate-700 overflow-hidden text-xs">
                    <button
                      onClick={() => setInputMode('form')}
                      className={`px-3 py-1.5 font-medium transition-colors ${
                        inputMode === 'form'
                          ? 'bg-primary text-white'
                          : 'text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800'
                      }`}
                    >
                      Manual Entry
                    </button>
                    <button
                      onClick={() => setInputMode('json')}
                      className={`px-3 py-1.5 font-medium transition-colors ${
                        inputMode === 'json'
                          ? 'bg-primary text-white'
                          : 'text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800'
                      }`}
                    >
                      JSON Paste
                    </button>
                  </div>
                </div>

                {inputMode === 'form' ? (
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                    {([
                      { label: 'Avg speed (m/s)', value: formSpeed, set: setFormSpeed },
                      { label: 'Max speed (m/s)', value: formSpeedMax, set: setFormSpeedMax },
                      { label: 'Total boxes', value: formBoxTotal, set: setFormBoxTotal },
                      { label: 'Successful boxes', value: formBoxSuccess, set: setFormBoxSuccess },
                      { label: 'Dropped boxes', value: formBoxDropped, set: setFormBoxDropped },
                      { label: 'Duration (min)', value: formDuration, set: setFormDuration },
                    ] as const).map(({ label, value, set: setter }) => (
                      <label key={label} className="block">
                        <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wide">
                          {label}
                        </span>
                        <input
                          type="text"
                          value={value}
                          onChange={(e) => setter(e.target.value)}
                          className="mt-1 w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white text-sm"
                        />
                      </label>
                    ))}
                  </div>
                ) : (
                  <div>
                    <textarea
                      value={jsonInput}
                      onChange={(e) => setJsonInput(e.target.value)}
                      placeholder={JSON.stringify(SAMPLE_PAYLOAD, null, 2)}
                      rows={8}
                      className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white font-mono text-xs leading-relaxed"
                    />
                    <button
                      onClick={() =>
                        setJsonInput(
                          JSON.stringify(
                            { ...SAMPLE_PAYLOAD, runId: `run-${Date.now()}`, initiativeId: initiative.id },
                            null,
                            2,
                          ),
                        )
                      }
                      className="mt-2 text-xs text-primary dark:text-accent hover:underline"
                    >
                      Paste sample payload
                    </button>
                  </div>
                )}

                <div className="mt-4 flex flex-wrap gap-3 items-center">
                  <button
                    type="button"
                    onClick={async () => {
                      const speed = parseFloat(formSpeed) || 1.8;
                      const { setConveyorSpeed, DEFAULT_CONVEYOR_PATH } = await import('@/lib/omniverseBus');
                      setConveyorSpeed(speed, DEFAULT_CONVEYOR_PATH);
                    }}
                    className="px-4 py-2.5 rounded-xl bg-action/10 text-action dark:bg-action/20 dark:text-action border border-action/30 hover:bg-action/20 dark:hover:bg-action/30 transition-colors flex items-center gap-2 text-sm font-medium"
                  >
                    <span className="material-icons-round text-base">speed</span>
                    Send Speed to Omniverse
                  </button>
                  <button
                    onClick={handleSubmitRun}
                    className="px-5 py-2.5 rounded-xl bg-success text-white font-semibold hover:bg-success/90 transition-colors shadow-lg shadow-success/20 flex items-center gap-2 text-sm"
                  >
                    <span className="material-icons-round text-base">check_circle</span>
                    Submit Run &amp; Evaluate
                  </button>
                </div>

                {/* Allow going back to Plan if no run has been submitted yet for this strategy */}
                {runs.length === 0 && selectedStrategy && (
                  <button
                    type="button"
                    onClick={() => {
                      setStep('plan');
                      persistStrategyStage(selectedStrategy.id, 'plan');
                    }}
                    className="mt-3 text-xs text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 inline-flex items-center gap-1"
                  >
                    <span className="material-icons-round text-sm">arrow_back</span>
                    Back to Plan (no run yet)
                  </button>
                )}
              </div>

              {runs.length > 0 && (
                <div>
                  <h4 className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-2">
                    Previous runs ({runs.length})
                  </h4>
                  <div className="space-y-2 max-h-32 overflow-y-auto">
                    {runs.map((r) => (
                      <div key={r.id} className="flex items-center gap-3 text-xs px-3 py-2 rounded-lg bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-700/50">
                        <span className="font-mono text-slate-500 dark:text-slate-400 truncate">{r.id}</span>
                        <span className="text-slate-700 dark:text-slate-300">{r.derived.throughput} box/min</span>
                        <span className="text-slate-700 dark:text-slate-300">{(r.derived.errorRate * 100).toFixed(2)}% err</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ---- VERDICT ---- */}
          {step === 'verdict' && latestVerdict && latestRun && (
            <div
              ref={verdictRef}
              className={`p-6 space-y-6 ${animateVerdict ? 'animate-in fade-in slide-in-from-bottom-4 duration-700' : ''}`}
            >
              {/* Verdict banner */}
              <div
                className={`rounded-xl p-5 flex items-start gap-4 ${
                  latestVerdict.outcome === 'validated'
                    ? 'bg-success/5 dark:bg-success/10 border border-success/20 dark:border-success/15'
                    : 'bg-danger/5 dark:bg-danger/10 border border-danger/20 dark:border-danger/15'
                }`}
              >
                <span
                  className={`material-icons-round text-3xl ${
                    latestVerdict.outcome === 'validated' ? 'text-success' : 'text-danger'
                  }`}
                >
                  {latestVerdict.outcome === 'validated' ? 'verified' : 'gpp_bad'}
                </span>
                <div>
                  <h4 className="font-bold text-slate-900 dark:text-white text-base">
                    {latestVerdict.outcome === 'validated'
                      ? 'Validated — Safe speed achieved'
                      : 'Not Validated — Guardrails exceeded'}
                  </h4>
                  <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
                    {latestVerdict.reasoning}
                  </p>
                </div>
              </div>

              {/* Initiative drill-down (KPIs hidden until expanded) */}
              <div className="rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden">
                <button
                  onClick={() => setInitiativeExpanded(!initiativeExpanded)}
                  className="w-full flex items-center justify-between px-5 py-4 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <span className="material-icons-round text-accent">precision_manufacturing</span>
                    <span className="font-semibold text-slate-900 dark:text-white text-sm">{initiative.name}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-slate-500 dark:text-slate-400">
                      {latestRun.derived.throughput} box/min · {(latestRun.derived.errorRate * 100).toFixed(2)}% err
                    </span>
                    <span className="material-icons-round text-slate-400">
                      {initiativeExpanded ? 'expand_less' : 'expand_more'}
                    </span>
                  </div>
                </button>

                {initiativeExpanded && (
                  <div className="px-5 pb-5 border-t border-slate-100 dark:border-slate-800 pt-4 animate-in fade-in slide-in-from-top-2 duration-300">
                    <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                      {([
                        { label: 'Throughput', value: `${latestRun.derived.throughput}`, unit: 'box/min', icon: 'speed', alert: false },
                        {
                          label: 'Error Rate',
                          value: `${(latestRun.derived.errorRate * 100).toFixed(2)}%`,
                          unit: `limit ${(initiative.guardrails.maxErrorRate * 100).toFixed(1)}%`,
                          icon: 'warning',
                          alert: latestRun.derived.errorRate > initiative.guardrails.maxErrorRate,
                        },
                        {
                          label: 'Drops/min',
                          value: `${latestRun.derived.dropPerMinute}`,
                          unit: `limit ${initiative.guardrails.maxDropCount}`,
                          icon: 'trending_down',
                          alert: latestRun.derived.dropPerMinute > initiative.guardrails.maxDropCount,
                        },
                        { label: 'Avg Speed', value: `${latestRun.payload.conveyorSpeedAvg}`, unit: 'm/s', icon: 'conveyor_belt', alert: false },
                        { label: 'Duration', value: `${latestRun.derived.durationMinutes}`, unit: 'min', icon: 'timer', alert: false },
                      ]).map((kpi) => (
                        <div
                          key={kpi.label}
                          className={`rounded-xl border p-3 text-center ${
                            kpi.alert
                              ? 'border-danger/30 dark:border-danger/20 bg-danger/5 dark:bg-danger/5'
                              : 'border-slate-200 dark:border-slate-700'
                          }`}
                        >
                          <span className={`material-icons-round text-lg ${kpi.alert ? 'text-danger' : 'text-slate-400'}`}>
                            {kpi.icon}
                          </span>
                          <div className="text-xl font-bold text-slate-900 dark:text-white mt-1">{kpi.value}</div>
                          <div className="text-[10px] text-slate-500 dark:text-slate-400 font-medium">{kpi.label}</div>
                          <div className="text-[10px] text-slate-400 dark:text-slate-500">{kpi.unit}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Action buttons */}
              {initiative.status !== 'validated' && initiative.status !== 'rolled_back' && (
                <div className="flex gap-3">
                  <button
                    onClick={handlePromote}
                    disabled={latestVerdict.outcome !== 'validated'}
                    className="px-5 py-2.5 rounded-xl bg-success text-white font-semibold hover:bg-success/90 disabled:opacity-40 disabled:cursor-not-allowed transition-colors shadow-lg shadow-success/20 flex items-center gap-2 text-sm"
                  >
                    <span className="material-icons-round text-base">rocket_launch</span>
                    Promote to Validated
                  </button>
                  <button
                    onClick={handleRollback}
                    className="px-5 py-2.5 rounded-xl border border-danger/30 dark:border-danger/20 text-danger font-medium hover:bg-danger/5 transition-colors flex items-center gap-2 text-sm"
                  >
                    <span className="material-icons-round text-base">undo</span>
                    Roll Back
                  </button>
                </div>
              )}

              {/* Post-promotion message */}
              {initiative.status === 'validated' && (
                <div className="rounded-xl bg-success/5 dark:bg-success/10 border border-success/20 dark:border-success/15 p-4 flex items-center gap-3">
                  <span className="material-icons-round text-success text-xl">check_circle</span>
                  <div>
                    <div className="font-semibold text-success text-sm">Initiative promoted — Objective updated</div>
                    <div className="text-xs text-success/80">
                      Floor automation progress is now {objective.currentPercent}% toward the +{objective.targetPercent}% target.
                    </div>
                  </div>
                </div>
              )}
              {initiative.status === 'rolled_back' && (
                <div className="rounded-xl bg-danger/5 dark:bg-danger/10 border border-danger/20 dark:border-danger/15 p-4 flex items-center gap-3">
                  <span className="material-icons-round text-danger text-xl">cancel</span>
                  <div>
                    <div className="font-semibold text-danger text-sm">Initiative rolled back</div>
                    <div className="text-xs text-danger/80">
                      This initiative has been rolled back. Reset the demo to try again.
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    );
  };

  // ---------------------------------------------------------------------------
  // Main render
  // ---------------------------------------------------------------------------

  return (
    <div className="min-h-full flex flex-col">
      {/* Top bar */}
      <div className="flex items-center justify-between px-8 pt-6 pb-2">
        <h1 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
          <span className="material-icons-round text-accent">timeline</span>
          Strategy Studio
        </h1>
        <div className="flex items-center gap-2">
          <button
            onClick={handleReset}
            className="px-3 py-1.5 rounded-lg text-xs font-medium border border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            Reset demo
          </button>
          <button
            onClick={() => setDrawerOpen(true)}
            className="px-4 py-2 rounded-lg text-sm font-medium bg-slate-900 dark:bg-white text-white dark:text-slate-900 hover:bg-slate-800 dark:hover:bg-slate-100 transition-colors flex items-center gap-2"
          >
            <span className="material-icons-round text-base">verified</span>
            Evidence &amp; Governance
          </button>
        </div>
      </div>

      {/* View router */}
      {studioView === 'home' ? renderHome() : renderDetail()}

      {/* Evidence drawer (default closed) */}
      <EvidenceDrawer open={drawerOpen} onClose={() => setDrawerOpen(false)} onRefresh={refresh} />
    </div>
  );
};

export default StrategyStudio;
