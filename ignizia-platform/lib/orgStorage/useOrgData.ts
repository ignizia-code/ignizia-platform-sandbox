'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import type { OrgNode, OrgEdge, OrgActivityLog, OrgChatMessage, OrgTree } from '@/types/org';
import {
  loadOrgTree,
  loadChatHistory,
  loadActivityLog,
  saveChatMessage,
  DEFAULT_ORG_ID,
} from './supabase';

interface UseOrgDataReturn {
  nodes: OrgNode[];
  edges: OrgEdge[];
  chatHistory: OrgChatMessage[];
  activityLog: OrgActivityLog[];
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  refreshChat: () => Promise<void>;
  addChatMessage: (role: 'user' | 'assistant', content: string, metadata?: Record<string, unknown>) => Promise<OrgChatMessage | null>;
  setOptimisticTree: (tree: OrgTree) => void;
}

export function useOrgData(orgId = DEFAULT_ORG_ID): UseOrgDataReturn {
  const [nodes, setNodes] = useState<OrgNode[]>([]);
  const [edges, setEdges] = useState<OrgEdge[]>([]);
  const [chatHistory, setChatHistory] = useState<OrgChatMessage[]>([]);
  const [activityLog, setActivityLog] = useState<OrgActivityLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const mounted = useRef(true);

  useEffect(() => {
    mounted.current = true;
    return () => { mounted.current = false; };
  }, []);

  const refresh = useCallback(async () => {
    try {
      const [tree, activity] = await Promise.all([
        loadOrgTree(orgId),
        loadActivityLog(orgId, 30),
      ]);
      if (!mounted.current) return;
      setNodes(tree.nodes);
      setEdges(tree.edges);
      setActivityLog(activity);
      setError(null);
    } catch (err) {
      if (!mounted.current) return;
      setError(String(err));
    }
  }, [orgId]);

  const refreshChat = useCallback(async () => {
    try {
      const history = await loadChatHistory(orgId, 100);
      if (mounted.current) setChatHistory(history);
    } catch (err) {
      console.error('Failed to refresh chat:', err);
    }
  }, [orgId]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const [tree, history, activity] = await Promise.all([
          loadOrgTree(orgId),
          loadChatHistory(orgId, 100),
          loadActivityLog(orgId, 30),
        ]);
        if (cancelled) return;
        setNodes(tree.nodes);
        setEdges(tree.edges);
        setChatHistory(history);
        setActivityLog(activity);
      } catch (err) {
        if (!cancelled) setError(String(err));
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [orgId]);

  const addChatMessage = useCallback(
    async (role: 'user' | 'assistant', content: string, metadata: Record<string, unknown> = {}) => {
      const msg = await saveChatMessage({ org_id: orgId, role, content, metadata });
      if (msg && mounted.current) {
        setChatHistory((prev) => [...prev, msg]);
      }
      return msg;
    },
    [orgId],
  );

  const setOptimisticTree = useCallback((tree: OrgTree) => {
    setNodes(tree.nodes);
    setEdges(tree.edges);
  }, []);

  return {
    nodes,
    edges,
    chatHistory,
    activityLog,
    loading,
    error,
    refresh,
    refreshChat,
    addChatMessage,
    setOptimisticTree,
  };
}
