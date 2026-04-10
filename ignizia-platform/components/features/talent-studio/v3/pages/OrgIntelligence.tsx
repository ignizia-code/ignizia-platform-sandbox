'use client';

import React, { useState, useMemo, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Building2, Send, Sparkles, ChevronUp, ChevronDown,
  Activity, CheckCircle2, MessageSquare, Loader2, X,
} from 'lucide-react';
import { cn } from '../lib/utils';
import { useOrgData } from '@/lib/orgStorage/useOrgData';
import OrgChart from '../components/OrgChart';
import OrgNodeDetail from '../components/OrgNodeDetail';
import type { OrgNode } from '@/types/org';
import { useApp } from '../store/AppContext';
import type { ProficiencyLevel } from '../types';

interface LocalMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: number;
  actions?: { type: string; summary: string; nodeId?: string; nodeIds?: string[] }[];
}

export default function OrgIntelligence() {
  const { departments, roles, employees, setCurrentPage, setParams } = useApp();
  const {
    nodes,
    edges,
    chatHistory,
    activityLog,
    loading,
    refresh,
    addChatMessage,
  } = useOrgData();

  const [messages, setMessages] = useState<LocalMessage[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [selectedNode, setSelectedNode] = useState<OrgNode | null>(null);
  const [highlightIds, setHighlightIds] = useState<string[]>([]);
  const [animatingIds, setAnimatingIds] = useState<Set<string>>(new Set());
  const [chatExpanded, setChatExpanded] = useState(false);
  const [activityExpanded, setActivityExpanded] = useState(false);
  const [canEditOrg, setCanEditOrg] = useState(false);

  const inputRef = useRef<HTMLInputElement>(null);
  const chatScrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const role = window.localStorage.getItem('userRole');
    setCanEditOrg(role === 'HR Manager');
  }, []);

  // Load persisted chat history on mount
  useEffect(() => {
    if (chatHistory.length > 0 && messages.length === 0) {
      const loaded: LocalMessage[] = chatHistory
        .filter((m) => m.role !== 'system')
        .map((m) => ({
          id: m.id,
          role: m.role as 'user' | 'assistant',
          content: m.content,
          timestamp: new Date(m.created_at).getTime(),
        }));
      setMessages(loaded);
    }
  }, [chatHistory]); // eslint-disable-line react-hooks/exhaustive-deps

  // Auto-scroll chat
  useEffect(() => {
    chatScrollRef.current?.scrollTo({ top: chatScrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages, chatExpanded]);

  const smartChips = useMemo(() => {
    if (nodes.length === 0) {
      return [
        'Build our org: Production, Quality, Maintenance, HR, Procurement',
        'Start from a manufacturing template',
        'We are a tech company with 4 teams',
      ];
    }
    if (messages.length === 0) {
      return [
        'Show me who reports to whom',
        'Where do we have gaps?',
        'Suggest improvements',
      ];
    }
    return [
      'Add a new role',
      'Show reporting structure',
      'Suggest improvements to simplify the org',
    ];
  }, [nodes.length, messages.length]);

  const normalizeName = useCallback((value: string) => value.toLowerCase().replace(/&/g, 'and').replace(/\s+/g, ' ').trim(), []);

  const appDeptHealth = useMemo(() => {
    return departments.map((dept) => {
      const dRoles = roles.filter((r) => r.departmentId === dept.id);
      const dEmps = employees.filter((e) => dRoles.some((r) => r.id === e.roleId));
      const allReqs = dRoles.flatMap((r) => r.requirements);
      if (allReqs.length === 0) {
        return { dept, empCount: dEmps.length, coverage: 100, status: 'green' as const };
      }

      const uniqueSkills = new Map<string, ProficiencyLevel>();
      allReqs.forEach((req) => {
        const existing = uniqueSkills.get(req.skillId);
        if (!existing || req.minLevel > existing) uniqueSkills.set(req.skillId, req.minLevel);
      });

      let metCount = 0;
      uniqueSkills.forEach((minLevel, skillId) => {
        const hasCoverage = dEmps.some((emp) =>
          emp.assertions.some(
            (x) => x.skillId === skillId && x.status === 'confirmed' && x.level >= minLevel,
          ));
        if (hasCoverage) metCount++;
      });
      const coverage = Math.round((metCount / Math.max(uniqueSkills.size, 1)) * 100);
      const status = coverage >= 80 ? 'green' as const : coverage >= 50 ? 'amber' as const : 'red' as const;
      return { dept, empCount: dEmps.length, coverage, status };
    });
  }, [departments, roles, employees]);

  const departmentHealthByNodeId = useMemo(() => {
    const map: Record<string, { empCount: number; coverage: number; status: 'green' | 'amber' | 'red' }> = {};
    const orgDeptNodes = nodes.filter((n) => n.node_type === 'department');
    orgDeptNodes.forEach((node) => {
      const nodeName = normalizeName(node.name);
      const match = appDeptHealth.find((d) => {
        const deptName = normalizeName(d.dept.name);
        return deptName === nodeName || deptName.includes(nodeName) || nodeName.includes(deptName);
      });
      if (match) {
        map[node.id] = {
          empCount: match.empCount,
          coverage: match.coverage,
          status: match.status,
        };
      }
    });
    return map;
  }, [nodes, appDeptHealth, normalizeName]);

  const getMappedDeptIdForNode = useCallback((node: OrgNode): string | null => {
    if (node.node_type !== 'department') return null;
    const nodeName = normalizeName(node.name);
    const match = appDeptHealth.find((d) => {
      const deptName = normalizeName(d.dept.name);
      return deptName === nodeName || deptName.includes(nodeName) || nodeName.includes(deptName);
    });
    return match?.dept.id ?? null;
  }, [appDeptHealth, normalizeName]);

  const handleSend = useCallback(async (text?: string) => {
    if (!canEditOrg) return;
    const content = (text || input).trim();
    if (!content || isLoading) return;

    const userMsg: LocalMessage = {
      id: crypto.randomUUID(),
      role: 'user',
      content,
      timestamp: Date.now(),
    };
    setMessages((prev) => [...prev, userMsg]);
    setInput('');
    setIsLoading(true);
    setChatExpanded(true);

    await addChatMessage('user', content);

    try {
      const apiMessages = [...messages, userMsg].map((m) => ({
        role: m.role,
        content: m.content,
      }));

      const res = await fetch('/api/org-builder', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: apiMessages,
          actorRole: canEditOrg ? 'HR Manager' : 'read_only',
        }),
      });

      const data = await res.json();
      const aiContent = data.text || 'I understand. Let me help you with that.';

      const aiMsg: LocalMessage = {
        id: crypto.randomUUID(),
        role: 'assistant',
        content: aiContent,
        timestamp: Date.now(),
        actions: data.actions,
      };
      setMessages((prev) => [...prev, aiMsg]);

      await addChatMessage('assistant', aiContent, {
        actions: data.actions,
        highlights: data.highlights,
        summary: data.summary,
      });

      // Highlight referenced nodes
      if (data.highlights?.length > 0) {
        setHighlightIds(data.highlights);
        setTimeout(() => setHighlightIds([]), 4000);
      }

      // Animate newly created nodes
      if (data.actions?.length > 0) {
        const newIds = new Set<string>();
        data.actions.forEach((a: { type: string; nodeId?: string; nodeIds?: string[] }) => {
          if (a.type === 'create_node' && a.nodeId) newIds.add(a.nodeId);
          if (a.type === 'bulk_create' && a.nodeIds) a.nodeIds.forEach((id: string) => newIds.add(id));
        });
        if (newIds.size > 0) {
          setAnimatingIds(newIds);
          setTimeout(() => setAnimatingIds(new Set()), 3000);
        }
      }

      // Refresh org data from Supabase
      await refresh();
    } catch {
      const errMsg: LocalMessage = {
        id: crypto.randomUUID(),
        role: 'assistant',
        content: 'I encountered an issue processing that. Could you rephrase?',
        timestamp: Date.now(),
      };
      setMessages((prev) => [...prev, errMsg]);
    } finally {
      setIsLoading(false);
    }
  }, [canEditOrg, input, isLoading, messages, addChatMessage, refresh]);

  const handleNodeClick = useCallback((node: OrgNode) => {
    setSelectedNode(node);
  }, []);

  const handleNodeNavigate = useCallback((nodeId: string) => {
    const node = nodes.find((n) => n.id === nodeId);
    if (node) setSelectedNode(node);
  }, [nodes]);

  const handleOpenDepartmentGaps = useCallback((node: OrgNode) => {
    const deptId = getMappedDeptIdForNode(node);
    setCurrentPage('workforce-gaps');
    setParams(deptId ? { deptId } : {});
  }, [getMappedDeptIdForNode, setCurrentPage, setParams]);

  const handleRefreshAndClose = useCallback(() => {
    refresh();
    setSelectedNode(null);
  }, [refresh]);

  // Keep selected node reference fresh
  const freshSelectedNode = useMemo(
    () => selectedNode ? nodes.find((n) => n.id === selectedNode.id) || null : null,
    [selectedNode, nodes],
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-180px)]">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="flex flex-col items-center gap-3"
        >
          <Loader2 size={28} className="text-action animate-spin" />
          <span className="text-sm text-slate-500 dark:text-slate-400">Loading organization...</span>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-[calc(100vh-180px)]">
      {/* Header */}
      <div className="flex items-center justify-between mb-3 flex-shrink-0">
        <div>
          <h1 className="text-xl font-bold text-slate-900 dark:text-slate-100">Org Intelligence</h1>
          <p className="text-slate-500 dark:text-slate-400 text-xs mt-0.5">
            AI-powered organizational design workspace
          </p>
        </div>
        <div className="flex items-center gap-3 text-[11px] text-slate-400 font-medium">
          <span className="flex items-center gap-1">
            <Building2 size={11} /> {nodes.filter(n => n.node_type === 'department').length} depts
          </span>
          <span className="flex items-center gap-1">
            <Activity size={11} /> {nodes.length} nodes
          </span>
        </div>
      </div>

      {/* Main chart area */}
      <div className="flex-1 relative bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden">
        <OrgChart
          nodes={nodes}
          edges={edges}
          highlightIds={highlightIds}
          animatingIds={animatingIds}
          selectedNodeId={freshSelectedNode?.id ?? null}
          departmentHealthByNodeId={departmentHealthByNodeId}
          onNodeClick={handleNodeClick}
          className="w-full h-full"
        />

        {/* Node detail panel */}
        <AnimatePresence>
          {freshSelectedNode && (
            <OrgNodeDetail
              key={freshSelectedNode.id}
              node={freshSelectedNode}
              allNodes={nodes}
              edges={edges}
              activityLog={activityLog}
              departmentHealth={departmentHealthByNodeId[freshSelectedNode.id] ?? null}
              onClose={() => setSelectedNode(null)}
              onRefresh={handleRefreshAndClose}
              onNavigate={handleNodeNavigate}
              onOpenGaps={() => handleOpenDepartmentGaps(freshSelectedNode)}
              readOnly={!canEditOrg}
            />
          )}
        </AnimatePresence>

        {/* Applied changes toast */}
        <AnimatePresence>
          {animatingIds.size > 0 && (
            <motion.div
              initial={{ y: -40, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: -40, opacity: 0 }}
              className="absolute top-3 left-1/2 -translate-x-1/2 z-20"
            >
              <div className="flex items-center gap-2 px-4 py-2 bg-success/10 border border-success/20 rounded-full backdrop-blur-sm">
                <CheckCircle2 size={14} className="text-success" />
                <span className="text-xs font-medium text-success">Changes applied to org chart</span>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Activity feed strip */}
      {activityLog.length > 0 && (
        <div className="flex-shrink-0 mt-2">
          <button
            onClick={() => setActivityExpanded(!activityExpanded)}
            className="flex items-center gap-2 px-3 py-1.5 text-[11px] text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300 transition-colors"
          >
            <Activity size={11} />
            <span className="font-medium">Recent Activity</span>
            {activityExpanded ? <ChevronDown size={11} /> : <ChevronUp size={11} />}
          </button>
          <AnimatePresence>
            {activityExpanded && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="overflow-hidden"
              >
                <div className="flex gap-2 px-3 pb-2 overflow-x-auto">
                  {activityLog.slice(0, 8).map((a) => (
                    <div
                      key={a.id}
                      className="flex-shrink-0 flex items-center gap-1.5 px-2.5 py-1 bg-slate-50 dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 text-[10px] text-slate-500 dark:text-slate-400"
                    >
                      <CheckCircle2 size={10} className="text-success flex-shrink-0" />
                      <span className="truncate max-w-[180px]">{a.summary}</span>
                    </div>
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}

      {/* AI command bar */}
      <div className="flex-shrink-0 mt-2">
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden">
          {/* Chat messages area (expandable) */}
          <AnimatePresence>
            {canEditOrg && chatExpanded && messages.length > 0 && (
              <motion.div
                initial={{ height: 0 }}
                animate={{ height: 200 }}
                exit={{ height: 0 }}
                className="overflow-hidden border-b border-slate-100 dark:border-slate-800"
              >
                <div className="flex items-center justify-between px-4 pt-2 pb-1">
                  <div className="flex items-center gap-1.5">
                    <MessageSquare size={11} className="text-action" />
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Conversation</span>
                  </div>
                  <button onClick={() => setChatExpanded(false)} className="w-5 h-5 rounded flex items-center justify-center hover:bg-slate-100 dark:hover:bg-slate-800">
                    <X size={11} className="text-slate-400" />
                  </button>
                </div>
                <div ref={chatScrollRef} className="h-[168px] overflow-y-auto px-4 pb-2 space-y-2">
                  {messages.map((msg) => (
                    <div key={msg.id} className={cn('flex', msg.role === 'user' ? 'justify-end' : 'justify-start')}>
                      {msg.role === 'assistant' && (
                        <div className="max-w-[85%]">
                          <div className="flex items-center gap-1 mb-0.5">
                            <Sparkles size={9} className="text-action" />
                            <span className="text-[9px] font-bold text-action uppercase tracking-wider">IGNIZIA</span>
                          </div>
                          <div className="bg-slate-50 dark:bg-slate-800 rounded-xl rounded-bl-md px-3 py-2 text-xs text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 whitespace-pre-wrap leading-relaxed">
                            {msg.content}
                          </div>
                          {msg.actions && msg.actions.length > 0 && (
                            <div className="flex flex-wrap gap-1 mt-1">
                              {msg.actions.filter(a => a.summary).map((a, i) => (
                                <span key={i} className="inline-flex items-center gap-1 px-2 py-0.5 bg-success/10 text-success text-[9px] font-medium rounded-full">
                                  <CheckCircle2 size={8} /> {a.summary}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>
                      )}
                      {msg.role === 'user' && (
                        <div className="max-w-[80%] bg-brand-blue/10 text-brand-blue rounded-xl rounded-br-md px-3 py-2 text-xs border border-brand-blue/20">
                          {msg.content}
                        </div>
                      )}
                    </div>
                  ))}
                  {isLoading && (
                    <div className="flex justify-start">
                      <div className="bg-slate-50 dark:bg-slate-800 rounded-xl rounded-bl-md px-3 py-2 border border-slate-200 dark:border-slate-700">
                        <div className="flex items-center gap-1.5">
                          <Sparkles size={10} className="text-action animate-pulse" />
                          <div className="flex gap-1">
                            <div className="w-1.5 h-1.5 rounded-full bg-slate-400 animate-bounce" style={{ animationDelay: '0ms' }} />
                            <div className="w-1.5 h-1.5 rounded-full bg-slate-400 animate-bounce" style={{ animationDelay: '150ms' }} />
                            <div className="w-1.5 h-1.5 rounded-full bg-slate-400 animate-bounce" style={{ animationDelay: '300ms' }} />
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Smart chips */}
          <div className="px-3 pt-2 pb-1.5 flex gap-1.5 overflow-x-auto">
            {canEditOrg && messages.length > 0 && !chatExpanded && (
              <button
                onClick={() => setChatExpanded(true)}
                className="flex-shrink-0 px-2.5 py-1 rounded-full bg-action/10 text-[11px] font-medium text-action border border-action/20 hover:bg-action/20 transition-colors"
              >
                <MessageSquare size={10} className="inline mr-1" />
                {messages.length} messages
              </button>
            )}
            {canEditOrg && smartChips.map((chip) => (
              <button
                key={chip}
                onClick={() => handleSend(chip)}
                disabled={isLoading}
                className="flex-shrink-0 px-2.5 py-1 rounded-full bg-slate-100 dark:bg-slate-800 text-[11px] font-medium text-slate-600 dark:text-slate-300 hover:bg-action/10 hover:text-action border border-slate-200 dark:border-slate-700 transition-colors disabled:opacity-40"
              >
                {chip}
              </button>
            ))}
          </div>

          {/* Input */}
          <div className="px-3 pb-3 pt-1">
            <div className="flex items-center gap-2">
              {canEditOrg ? (
                <>
                  <div className="flex-1 relative">
                    <input
                      ref={inputRef}
                      type="text"
                      value={input}
                      onChange={(e) => setInput(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                      onFocus={() => messages.length > 0 && setChatExpanded(true)}
                      placeholder={nodes.length === 0 ? 'Describe your organization to get started...' : 'Ask AI to update your org, or ask a question...'}
                      className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm focus:ring-2 focus:ring-action/50 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 pr-10"
                      disabled={isLoading}
                    />
                    <Sparkles size={12} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-300 dark:text-slate-600" />
                  </div>
                  <button
                    onClick={() => handleSend()}
                    disabled={!input.trim() || isLoading}
                    className="w-10 h-10 rounded-xl bg-action text-white flex items-center justify-center hover:bg-brand-blue disabled:opacity-40 transition-colors flex-shrink-0"
                  >
                    {isLoading ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
                  </button>
                </>
              ) : (
                <div className="w-full px-4 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs text-slate-500 dark:text-slate-400">
                  Read-only view. HR Manager role is required to edit organization structure.
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
