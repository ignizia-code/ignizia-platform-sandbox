'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Workflow,
  WorkflowNode,
  WorkflowEdge,
  UserRole,
  USER_ROLES,
  WorkflowNodeMeta,
  WorkflowEdgeMeta,
  NodeCadence,
  NodeRecurrence,
  NodeMode,
  EdgeHandoffType,
  EdgeChannel,
} from '@/types';
import type { WorkflowMeta } from '@/types/workflow';
import WorkflowChat, { Message, FileAttachment } from './WorkflowChat';
import WorkflowAnalytics from './WorkflowAnalytics';
import WorkflowCollaborationPanel from './WorkflowCollaborationPanel';
import { useWorkflowCollaboration } from '@/lib/workflowCollaboration/useWorkflowCollaboration';
import { calculateWorkflowLayout, calculateIncrementalLayout, needsLayoutRecalculation } from '@/lib/workflowLayout';
import { classifySensitivity } from '@/lib/sensitivityClassifier';
import { loadPolicy, addSubmission, addAuditEvent } from '@/lib/governanceStorage';
import { requiresReview, filterAiSuggestion, isExternalAiSuggestion } from '@/lib/policyEnforcement';
import * as workflowSupabase from '@/lib/workflowStorage/supabase';
import { supabase } from '@/lib/supabase/client';
// gallery & cards used when no workflow is open
import WorkflowsGallery, { WorkflowTemplate } from './WorkflowsGallery';

interface WorkflowBuilderProps {
  userRole: UserRole;
}

const USER_ID_KEY = 'workflow_user_id';
const AI_CHAT_PREFIX = 'ai-chat:';
const WORKFLOW_HISTORY_PREFIX = 'workflow-history:';

// History checkpoint types
interface HistoryCheckpoint {
  id: string;
  timestamp: string;
  type: 'ai' | 'manual';
  description: string;
  nodeCount: number;
  edgeCount: number;
  workflowState: Workflow;
}

// Debounce timer for manual edits
let manualEditDebounceTimer: NodeJS.Timeout | null = null;
const MANUAL_EDIT_DEBOUNCE_MS = 3000; // 3 seconds of inactivity = commit manual changes

// Generate a unique ID
const generateId = (): string => {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
};

// Get or create user ID for this tab (stored in sessionStorage)
const getTabUserId = (): string => {
  if (typeof window === 'undefined') {
    return generateId();
  }
  let userId = sessionStorage.getItem(USER_ID_KEY);
  if (!userId) {
    userId = generateId();
    sessionStorage.setItem(USER_ID_KEY, userId);
  }
  return userId;
};

const defaultOwner: UserRole = 'Plant Manager';

// Initial default workflow shown when the app has no workflows yet (with v2 meta)
const INITIAL_DEFAULT_WORKFLOW: Workflow = {
  id: 'wf-leather-order-readiness-001',
  name: 'Leather Order Readiness',
  owner: 'Operations Manager',
  sharedWith: ['Leather Cutter', 'Line Manager', 'Plant Manager', 'Procurement'],
  nodes: [
    {
      id: 'n-order-received',
      name: 'New Order Received',
      position: { x: 80, y: 80 },
      meta: {
        mode: 'async',
        cadence: 'recurring',
        recurrence: 'perOrder',
        durationMins: 5,
        difficulty: 1,
        inputs: ['order notification'],
        outputs: ['order record'],
        tags: ['inbound', 'trigger'],
        assignedTo: ['Operations Manager'],
      },
    },
    {
      id: 'n-define-requirements',
      name: 'Define Order Requirements',
      position: { x: 380, y: 80 },
      meta: {
        mode: 'sync',
        cadence: 'once',
        durationMins: 30,
        difficulty: 2,
        inputs: ['order record'],
        outputs: ['order specs', 'material list'],
        tags: ['planning'],
        assignedTo: ['Operations Manager'],
        approver: ['Plant Manager'],
      },
    },
    {
      id: 'n-check-inventory',
      name: 'Check Leather Inventory',
      position: { x: 220, y: 240 },
      meta: {
        mode: 'sync',
        cadence: 'recurring',
        recurrence: 'daily',
        durationMins: 15,
        difficulty: 2,
        inputs: ['material list'],
        outputs: ['inventory status'],
        tags: ['inventory', 'material'],
        assignedTo: ['Procurement'],
      },
    },
    {
      id: 'n-validate-quality',
      name: 'Validate Leather Quality',
      position: { x: 80, y: 400 },
      meta: {
        mode: 'sync',
        cadence: 'recurring',
        recurrence: 'perOrder',
        durationMins: 45,
        difficulty: 3,
        inputs: ['inventory sample', 'quality spec'],
        outputs: ['quality report'],
        tags: ['quality', 'inspection'],
        assignedTo: ['Leather Cutter'],
        approver: ['Line Manager'],
      },
    },
    {
      id: 'n-request-vendor',
      name: 'Request Vendor Availability',
      position: { x: 380, y: 400 },
      meta: {
        mode: 'async',
        cadence: 'once',
        durationMins: 60,
        difficulty: 2,
        inputs: ['material list', 'quantity'],
        outputs: ['vendor request sent'],
        blockers: ['vendor response'],
        tags: ['procurement', 'external'],
        assignedTo: ['Procurement'],
      },
    },
    {
      id: 'n-confirm-delivery',
      name: 'Confirm Delivery Timeline',
      position: { x: 520, y: 560 },
      meta: {
        mode: 'async',
        cadence: 'once',
        durationMins: 20,
        difficulty: 2,
        inputs: ['vendor quote', 'vendor availability'],
        outputs: ['delivery date', 'commitment'],
        tags: ['procurement', 'scheduling'],
        assignedTo: ['Procurement'],
        approver: ['Operations Manager'],
      },
    },
    {
      id: 'n-check-capacity',
      name: 'Check Production Capacity',
      position: { x: 620, y: 240 },
      meta: {
        mode: 'sync',
        cadence: 'recurring',
        recurrence: 'weekly',
        durationMins: 20,
        difficulty: 2,
        inputs: ['order specs'],
        outputs: ['capacity status'],
        tags: ['capacity', 'planning'],
        assignedTo: ['Line Manager'],
      },
    },
    {
      id: 'n-review-workload',
      name: 'Review Line Workload',
      position: { x: 780, y: 400 },
      meta: {
        mode: 'sync',
        cadence: 'recurring',
        recurrence: 'daily',
        durationMins: 30,
        difficulty: 3,
        inputs: ['capacity status', 'schedule'],
        outputs: ['workload summary'],
        tags: ['line', 'scheduling'],
        assignedTo: ['Line Manager'],
        approver: ['Plant Manager'],
      },
    },
    {
      id: 'n-assess-readiness',
      name: 'Assess Production Readiness',
      position: { x: 380, y: 720 },
      meta: {
        mode: 'sync',
        cadence: 'once',
        durationMins: 45,
        difficulty: 4,
        inputs: ['quality report', 'delivery date', 'workload summary'],
        outputs: ['readiness decision'],
        tags: ['gate', 'decision'],
        assignedTo: ['Operations Manager', 'Line Manager'],
        approver: ['Plant Manager'],
      },
    },
    {
      id: 'n-approve',
      name: 'Approve Production Order',
      position: { x: 240, y: 900 },
      meta: {
        mode: 'sync',
        cadence: 'once',
        durationMins: 15,
        difficulty: 2,
        inputs: ['readiness decision'],
        outputs: ['approved order'],
        tags: ['approval', 'final'],
        assignedTo: ['Plant Manager'],
      },
    },
    {
      id: 'n-delay-reject',
      name: 'Delay or Reject Order',
      position: { x: 520, y: 900 },
      meta: {
        mode: 'sync',
        cadence: 'once',
        durationMins: 10,
        difficulty: 2,
        inputs: ['readiness decision'],
        outputs: ['rejection notice', 'reschedule'],
        tags: ['rejection', 'follow-up'],
        assignedTo: ['Operations Manager'],
      },
    },
  ],
  edges: [
    {
      id: 'e1-triggers',
      name: 'triggers',
      startNodeId: 'n-order-received',
      endNodeId: 'n-define-requirements',
      meta: { handoffType: 'sync', channel: 'system', slaMins: 5 },
    },
    {
      id: 'e2-material-check',
      name: 'requires material check',
      startNodeId: 'n-define-requirements',
      endNodeId: 'n-check-inventory',
      meta: { handoffType: 'sync', channel: 'system', slaMins: 15 },
    },
    {
      id: 'e3-quality-validation',
      name: 'needs quality validation',
      startNodeId: 'n-check-inventory',
      endNodeId: 'n-validate-quality',
      meta: { handoffType: 'sync', channel: 'inPerson', slaMins: 30, notes: 'Sample handoff to QC' },
    },
    {
      id: 'e4-insufficient-stock',
      name: 'insufficient stock',
      startNodeId: 'n-check-inventory',
      endNodeId: 'n-request-vendor',
      meta: { handoffType: 'async', channel: 'email', slaMins: 120, notes: 'Vendor request with specs' },
    },
    {
      id: 'e5-vendor-responds',
      name: 'vendor responds',
      startNodeId: 'n-request-vendor',
      endNodeId: 'n-confirm-delivery',
      meta: { handoffType: 'async', channel: 'email', slaMins: 480, notes: 'Quote and availability' },
    },
    {
      id: 'e6-capacity-check',
      name: 'requires capacity check',
      startNodeId: 'n-define-requirements',
      endNodeId: 'n-check-capacity',
      meta: { handoffType: 'sync', channel: 'system', slaMins: 10 },
    },
    {
      id: 'e7-floor-load',
      name: 'checks floor load',
      startNodeId: 'n-check-capacity',
      endNodeId: 'n-review-workload',
      meta: { handoffType: 'sync', channel: 'inPerson', slaMins: 60, notes: 'Line manager review' },
    },
    {
      id: 'e8-material-approved',
      name: 'material approved',
      startNodeId: 'n-validate-quality',
      endNodeId: 'n-assess-readiness',
      meta: { handoffType: 'sync', channel: 'system', slaMins: 15 },
    },
    {
      id: 'e9-delivery-confirmed',
      name: 'delivery confirmed',
      startNodeId: 'n-confirm-delivery',
      endNodeId: 'n-assess-readiness',
      meta: { handoffType: 'async', channel: 'slack', slaMins: 30 },
    },
    {
      id: 'e10-capacity-confirmed',
      name: 'capacity confirmed',
      startNodeId: 'n-review-workload',
      endNodeId: 'n-assess-readiness',
      meta: { handoffType: 'sync', channel: 'system', slaMins: 20 },
    },
    {
      id: 'e11-ready',
      name: 'ready to proceed',
      startNodeId: 'n-assess-readiness',
      endNodeId: 'n-approve',
      meta: { handoffType: 'sync', channel: 'inPerson', slaMins: 60, notes: 'Approval meeting' },
    },
    {
      id: 'e12-not-ready',
      name: 'not ready',
      startNodeId: 'n-assess-readiness',
      endNodeId: 'n-delay-reject',
      meta: { handoffType: 'sync', channel: 'email', slaMins: 120, notes: 'Notify customer and vendor' },
    },
  ],
  updatedByRole: 'Operations Manager',
  updatedAt: '2026-02-07T14:16:15.206Z',
  revision: 1,
};

// Create an empty workflow
const createEmptyWorkflow = (id: string, name: string, role: UserRole): Workflow => ({
  id,
  name,
  owner: role,
  sharedWith: [],
  nodes: [],
  edges: [],
  updatedByRole: role,
  updatedAt: new Date().toISOString(),
  revision: 0,
});

// Load AI chat history from localStorage
const loadAiChat = (workflowId: string): Message[] => {
  if (typeof window === 'undefined') {
    return [
      {
        id: 'welcome',
        role: 'assistant',
        content: "Hi! I'm here to help you build this workflow. Just describe the process as if you're explaining it to a new employee - start from the beginning and walk me through what happens.",
        timestamp: new Date().toISOString(),
      },
    ];
  }
  try {
    const stored = localStorage.getItem(AI_CHAT_PREFIX + workflowId);
    if (stored) {
      const parsed = JSON.parse(stored) as Message[];
      return parsed.map((m) => ({
        ...m,
        timestamp: m.timestamp, // Already a string from JSON
      }));
    }
  } catch (e) {
    console.error('Failed to load AI chat:', e);
  }
  // Return default welcome message
  return [
    {
      id: 'welcome',
      role: 'assistant',
      content: "Hi! I'm here to help you build this workflow. Just describe the process as if you're explaining it to a new employee - start from the beginning and walk me through what happens.",
      timestamp: new Date().toISOString(),
    },
  ];
};

// Save AI chat history to localStorage
const saveAiChat = (workflowId: string, messages: Message[]): void => {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(AI_CHAT_PREFIX + workflowId, JSON.stringify(messages));
  } catch (e) {
    console.error('Failed to save AI chat:', e);
  }
};

// Clear AI chat history from localStorage
const clearAiChat = (workflowId: string): void => {
  if (typeof window !== 'undefined') {
    localStorage.removeItem(AI_CHAT_PREFIX + workflowId);
  }
};

// Load workflow history from localStorage
const loadWorkflowHistory = (workflowId: string): HistoryCheckpoint[] => {
  if (typeof window === 'undefined') {
    return [];
  }
  try {
    const stored = localStorage.getItem(WORKFLOW_HISTORY_PREFIX + workflowId);
    if (stored) {
      return JSON.parse(stored) as HistoryCheckpoint[];
    }
  } catch (e) {
    console.error('Failed to load workflow history:', e);
  }
  return [];
};

// Save workflow history to localStorage
const saveWorkflowHistory = (workflowId: string, history: HistoryCheckpoint[]): void => {
  if (typeof window === 'undefined') return;
  try {
    // Keep only last 30 checkpoints to prevent localStorage overflow
    const trimmedHistory = history.slice(-30);
    localStorage.setItem(WORKFLOW_HISTORY_PREFIX + workflowId, JSON.stringify(trimmedHistory));
  } catch (e) {
    console.error('Failed to save workflow history:', e);
  }
};

// Add a checkpoint to workflow history
const addHistoryCheckpoint = (
  workflowId: string,
  type: 'ai' | 'manual',
  description: string,
  workflowState: Workflow
): HistoryCheckpoint[] => {
  const history = loadWorkflowHistory(workflowId);
  
  const checkpoint: HistoryCheckpoint = {
    id: generateId(),
    timestamp: new Date().toISOString(),
    type,
    description,
    nodeCount: workflowState.nodes.length,
    edgeCount: workflowState.edges.length,
    workflowState: JSON.parse(JSON.stringify(workflowState)), // Deep clone
  };
  
  const updatedHistory = [...history, checkpoint];
  saveWorkflowHistory(workflowId, updatedHistory);
  return updatedHistory;
};

// Add auto-layout checkpoint with batching - replaces last auto-layout if consecutive
const addOrReplaceAutoLayoutCheckpoint = (
  workflowId: string,
  workflowState: Workflow,
  currentHistory: HistoryCheckpoint[]
): HistoryCheckpoint[] => {
  const AUTO_LAYOUT_DESCRIPTION = 'Auto-layout applied to workflow';
  
  // Check if the last checkpoint was also an auto-layout
  const lastCheckpoint = currentHistory[currentHistory.length - 1];
  const isLastAutoLayout = lastCheckpoint && 
    lastCheckpoint.type === 'manual' && 
    lastCheckpoint.description === AUTO_LAYOUT_DESCRIPTION;
  
  const newCheckpoint: HistoryCheckpoint = {
    id: generateId(),
    timestamp: new Date().toISOString(),
    type: 'manual',
    description: AUTO_LAYOUT_DESCRIPTION,
    nodeCount: workflowState.nodes.length,
    edgeCount: workflowState.edges.length,
    workflowState: JSON.parse(JSON.stringify(workflowState)), // Deep clone
  };
  
  let updatedHistory: HistoryCheckpoint[];
  if (isLastAutoLayout) {
    // Replace the last checkpoint instead of adding a new one
    updatedHistory = [...currentHistory.slice(0, -1), newCheckpoint];
  } else {
    // Add as new checkpoint
    updatedHistory = [...currentHistory, newCheckpoint];
  }
  
  saveWorkflowHistory(workflowId, updatedHistory);
  return updatedHistory;
};

// Clear workflow history from localStorage
const clearWorkflowHistory = (workflowId: string): void => {
  if (typeof window !== 'undefined') {
    localStorage.removeItem(WORKFLOW_HISTORY_PREFIX + workflowId);
  }
};

// Deep compare two workflows (nodes and edges including meta)
const workflowDataEqual = (a: Workflow, b: Workflow): boolean => {
  return JSON.stringify({ nodes: a.nodes, edges: a.edges }) ===
         JSON.stringify({ nodes: b.nodes, edges: b.edges });
};

// Node positions type (also persisted on each node as node.position)
interface NodePositions {
  [nodeId: string]: { x: number; y: number };
}

// Node dimensions
const NODE_WIDTH = 140;
const NODE_HEIGHT = 60;

// Mode-based colors (v2) - white background with colored borders
const NODE_COLOR_SYNC = 'border-2 border-blue-600 dark:border-blue-500 bg-white dark:bg-slate-800 text-slate-900 dark:text-white';
const NODE_COLOR_ASYNC = 'border-2 border-amber-600 dark:border-amber-500 bg-white dark:bg-slate-800 text-slate-900 dark:text-white';
const NODE_COLOR_DEFAULT = 'border-2 border-slate-400 dark:border-slate-500 bg-white dark:bg-slate-800 text-slate-900 dark:text-white';

// Calculate the best connection points between two nodes
// For dynamic nodes, we use approximate dimensions for connection point calculation
const APPROX_NODE_WIDTH = 120;
const APPROX_NODE_HEIGHT = 60;

const getConnectionPoints = (
  startPos: { x: number; y: number },
  endPos: { x: number; y: number }
): { start: { x: number; y: number; side: string }; end: { x: number; y: number; side: string } } => {
  // Calculate center points
  const startCenter = { x: startPos.x + APPROX_NODE_WIDTH / 2, y: startPos.y + APPROX_NODE_HEIGHT / 2 };
  const endCenter = { x: endPos.x + APPROX_NODE_WIDTH / 2, y: endPos.y + APPROX_NODE_HEIGHT / 2 };

  // Calculate direction vector
  const dx = endCenter.x - startCenter.x;
  const dy = endCenter.y - startCenter.y;

  // Define connection points for each side
  const sides = {
    top: { x: APPROX_NODE_WIDTH / 2, y: 0 },
    bottom: { x: APPROX_NODE_WIDTH / 2, y: APPROX_NODE_HEIGHT },
    left: { x: 0, y: APPROX_NODE_HEIGHT / 2 },
    right: { x: APPROX_NODE_WIDTH, y: APPROX_NODE_HEIGHT / 2 },
  };

  let startSide: string;
  let endSide: string;

  // Determine best sides based on relative positions
  const absDx = Math.abs(dx);
  const absDy = Math.abs(dy);

  if (absDx > absDy) {
    // Horizontal connection preferred
    if (dx > 0) {
      startSide = 'right';
      endSide = 'left';
    } else {
      startSide = 'left';
      endSide = 'right';
    }
  } else {
    // Vertical connection preferred
    if (dy > 0) {
      startSide = 'bottom';
      endSide = 'top';
    } else {
      startSide = 'top';
      endSide = 'bottom';
    }
  }

  return {
    start: {
      x: startPos.x + sides[startSide as keyof typeof sides].x,
      y: startPos.y + sides[startSide as keyof typeof sides].y,
      side: startSide,
    },
    end: {
      x: endPos.x + sides[endSide as keyof typeof sides].x,
      y: endPos.y + sides[endSide as keyof typeof sides].y,
      side: endSide,
    },
  };
};

// Generate bezier curve path based on connection sides
const generateEdgePath = (
  start: { x: number; y: number; side: string },
  end: { x: number; y: number; side: string },
  offset: { x: number; y: number }
): string => {
  const sx = start.x + offset.x;
  const sy = start.y + offset.y;
  const ex = end.x + offset.x;
  const ey = end.y + offset.y;

  // Calculate control point offset based on distance
  const distance = Math.sqrt(Math.pow(ex - sx, 2) + Math.pow(ey - sy, 2));
  const controlOffset = Math.min(80, distance / 2);

  // Determine control point directions based on sides
  let sc = { x: sx, y: sy };
  let ec = { x: ex, y: ey };

  switch (start.side) {
    case 'top': sc = { x: sx, y: sy - controlOffset }; break;
    case 'bottom': sc = { x: sx, y: sy + controlOffset }; break;
    case 'left': sc = { x: sx - controlOffset, y: sy }; break;
    case 'right': sc = { x: sx + controlOffset, y: sy }; break;
  }

  switch (end.side) {
    case 'top': ec = { x: ex, y: ey - controlOffset }; break;
    case 'bottom': ec = { x: ex, y: ey + controlOffset }; break;
    case 'left': ec = { x: ex - controlOffset, y: ey }; break;
    case 'right': ec = { x: ex + controlOffset, y: ey }; break;
  }

  return `M ${sx} ${sy} C ${sc.x} ${sc.y}, ${ec.x} ${ec.y}, ${ex} ${ey}`;
};

const WorkflowBuilder: React.FC<WorkflowBuilderProps> = ({ userRole }) => {
  const [workflowsList, setWorkflowsList] = useState<WorkflowMeta[]>([]);
  const [workflowsListLoading, setWorkflowsListLoading] = useState(true);
  const [workflowsListError, setWorkflowsListError] = useState<string | null>(null);
  const [selectedWorkflowId, setSelectedWorkflowId] = useState<string | null>(null);
  const [workflow, setWorkflow] = useState<Workflow | null>(null);
  // display mode: gallery or editor
  const [viewMode, setViewMode] = useState<'gallery' | 'editor'>('gallery');
  const [workflowLoading, setWorkflowLoading] = useState(false);
  const [renamingWorkflowId, setRenamingWorkflowId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState('');
  const [sharePopoverOpen, setSharePopoverOpen] = useState(false);

  const visibleWorkflows = workflowsList.filter(
    (w) => w.owner === userRole || w.sharedWith.includes(userRole)
  );
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [selectedEdgeId, setSelectedEdgeId] = useState<string | null>(null);
  const [connectingFromNodeId, setConnectingFromNodeId] = useState<string | null>(null);
  const [hoveredNodeId, setHoveredNodeId] = useState<string | null>(null);
  const [nodePositions, setNodePositions] = useState<NodePositions>({});
  const [canvasOffset, setCanvasOffset] = useState({ x: 0, y: 0 });
  const [editingNodeId, setEditingNodeId] = useState<string | null>(null);
  const [editingEdgeId, setEditingEdgeId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [originalEditName, setOriginalEditName] = useState('');
  const [legendCollapsed, setLegendCollapsed] = useState(false);
  const [isCanvasFullView, setIsCanvasFullView] = useState(false);
  const [zoomLevel, setZoomLevel] = useState(1);
  // Local draft for comma-separated meta fields so typing commas is not lost (parsed on blur only)
  const [commaSepDrafts, setCommaSepDrafts] = useState<Record<string, string>>({});
  // AI Assistant tab state
  const [rightPanelTab, setRightPanelTab] = useState<'properties' | 'ai-assistant' | 'analytics' | 'collaboration'>('properties');
  // AI Assistant chat state
  const [aiChatMessages, setAiChatMessages] = useState<Message[]>([]);
  const [aiChatLoading, setAiChatLoading] = useState(false);
  // AI Assistant voice output state (persisted across tab switches)
  const [voiceOutputEnabled, setVoiceOutputEnabled] = useState(false);
  const autoAudioPlayersRef = useRef<{ [key: string]: HTMLAudioElement }>({});
  const autoPlayedMessageIdsRef = useRef<Set<string>>(new Set());
  const messageCountWhenEnabledRef = useRef<number>(0);
  // Workflow history state
  const [workflowHistory, setWorkflowHistory] = useState<HistoryCheckpoint[]>([]);
  const [showHistoryPanel, setShowHistoryPanel] = useState(false);
  // Governance: policy blocked banner (cleared when user sends new message)
  const [policyBlockedMessage, setPolicyBlockedMessage] = useState<string | null>(null);
  const [submitSuccess, setSubmitSuccess] = useState(false);
  // Import modal state
  const [showImportModal, setShowImportModal] = useState(false);
  const [importJsonText, setImportJsonText] = useState('');
  const [importError, setImportError] = useState('');
  // Right panel resize state
  const [rightPanelWidth, setRightPanelWidth] = useState(320); // 320px = w-80
  const [isResizingPanel, setIsResizingPanel] = useState(false);
  const resizeStartXRef = useRef(0);
  const resizeStartWidthRef = useRef(320);
  const isResizingPanelRef = useRef(false); // Track resizing with ref instead of state
  // Dropdown menu states
  const [showWorkflowAddDropdown, setShowWorkflowAddDropdown] = useState(false);
  const [showNodeAddDropdown, setShowNodeAddDropdown] = useState(false);
  // Workflow list pane collapse state
  const [isWorkflowListCollapsed, setIsWorkflowListCollapsed] = useState(false);
  // Actions dropdown menu state
  const [showActionsDropdown, setShowActionsDropdown] = useState(false);

  const ZOOM_MIN = 0.5;
  const ZOOM_MAX = 2;
  const screenToContent = useCallback(
    (screenX: number, screenY: number): { x: number; y: number } => {
      const rect = canvasRef.current?.getBoundingClientRect();
      if (!rect) return { x: 0, y: 0 };
      const cx = rect.left + rect.width / 2;
      const cy = rect.top + rect.height / 2;
      return {
        x: rect.width / 2 + (screenX - cx) / zoomLevel - canvasOffset.x,
        y: rect.height / 2 + (screenY - cy) / zoomLevel - canvasOffset.y,
      };
    },
    [zoomLevel, canvasOffset]
  );

  const canvasRef = useRef<HTMLDivElement>(null);
  const userId = useRef(getTabUserId());
  const nodePositionsRef = useRef<NodePositions>({});

  const collaboration = useWorkflowCollaboration({
    workflowId: selectedWorkflowId,
    userId: userId.current,
    displayName: userRole,
  });
  nodePositionsRef.current = nodePositions;

  // Drag state ref for smooth performance
  const dragStateRef = useRef({
    isDragging: false,
    draggedNodeId: null as string | null,
    dragOffsetX: 0,
    dragOffsetY: 0,
    initialNodePosX: 0,
    initialNodePosY: 0,
    initialMouseContentX: 0,
    initialMouseContentY: 0,
    isPanning: false,
    panStartX: 0,
    panStartY: 0,
    canvasOffsetX: 0,
    canvasOffsetY: 0,
  });

  // Calculate initial node positions (auto-layout)
  const calculatePositions = useCallback((nodes: WorkflowNode[], existingPositions: NodePositions): NodePositions => {
    const positions: NodePositions = { ...existingPositions };
    const cols = Math.max(1, Math.ceil(Math.sqrt(nodes.length)));
    const spacing = { x: 280, y: 200 };
    const offset = { x: 150, y: 100 };

    nodes.forEach((node, index) => {
      if (!positions[node.id]) {
        const col = index % cols;
        const row = Math.floor(index / cols);
        positions[node.id] = {
          x: offset.x + col * spacing.x,
          y: offset.y + row * spacing.y,
        };
      }
    });

    return positions;
  }, []);

  // Load workflows list from Supabase on mount and seed default if empty
  useEffect(() => {
    let cancelled = false;
    (async () => {
      setWorkflowsListLoading(true);
      setWorkflowsListError(null);
      try {
        const list = await workflowSupabase.loadWorkflowsList();
        if (cancelled) return;
        if (list.length === 0) {
          await workflowSupabase.saveWorkflow(INITIAL_DEFAULT_WORKFLOW);
          const again = await workflowSupabase.loadWorkflowsList();
          if (!cancelled) setWorkflowsList(again);
        } else {
          setWorkflowsList(list);
        }
      } catch (e) {
        if (!cancelled) setWorkflowsListError(e instanceof Error ? e.message : 'Failed to load workflows');
      } finally {
        if (!cancelled) setWorkflowsListLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  // when selection toggles we switch between gallery and editor view
  useEffect(() => {
    setViewMode(selectedWorkflowId ? 'editor' : 'gallery');
  }, [selectedWorkflowId]);

  // Load workflow when selection changes (Supabase + localStorage for chat/history)
  useEffect(() => {
    if (!selectedWorkflowId) {
      setWorkflow(null);
      setWorkflowLoading(false);
      setSelectedNodeId(null);
      setSelectedEdgeId(null);
      setConnectingFromNodeId(null);
      setNodePositions({});
      setAiChatMessages([]);
      return;
    }
    let cancelled = false;
    setWorkflowLoading(true);
    (async () => {
      try {
        const loaded = await workflowSupabase.loadWorkflowById(selectedWorkflowId);
        if (cancelled) return;
        if (loaded) {
          setWorkflow(loaded);
          setAiChatMessages(loadAiChat(loaded.id));
          setWorkflowHistory(loadWorkflowHistory(loaded.id));
        } else {
          setSelectedWorkflowId(null);
        }
      } finally {
        if (!cancelled) setWorkflowLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [selectedWorkflowId]);

  // Cleanup debounce timer when workflow changes or component unmounts
  useEffect(() => {
    return () => {
      if (manualEditDebounceTimer) {
        clearTimeout(manualEditDebounceTimer);
        manualEditDebounceTimer = null;
      }
    };
  }, [workflow?.id]);

  // Update positions when nodes change: prefer stored node.position, then prev, else auto-layout
  useEffect(() => {
    if (!workflow) return;
    const fromStoredOrPrev: NodePositions = {};
    workflow.nodes.forEach((n) => {
      const stored = n.position;
      if (stored && typeof stored.x === 'number' && typeof stored.y === 'number') {
        fromStoredOrPrev[n.id] = { x: stored.x, y: stored.y };
      }
    });
    setNodePositions((prev) => {
      const base = { ...fromStoredOrPrev };
      workflow.nodes.forEach((n) => {
        if (!base[n.id] && prev[n.id]) base[n.id] = prev[n.id];
      });
      return calculatePositions(workflow.nodes, base);
    });
  }, [workflow?.nodes, calculatePositions, workflow]);

  // Supabase Realtime: sync workflows list and current workflow across clients
  useEffect(() => {
    const channel = supabase
      .channel('workflows-realtime')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'workflows' },
        async (payload) => {
          if (payload.eventType === 'INSERT' || payload.eventType === 'UPDATE' || payload.eventType === 'DELETE') {
            const list = await workflowSupabase.loadWorkflowsList();
            setWorkflowsList(list);
          }
          const row = payload.new as Record<string, unknown> | null;
          const id = row?.id ?? (payload.old as Record<string, unknown>)?.id;
          if (id === selectedWorkflowId && (payload.eventType === 'INSERT' || payload.eventType === 'UPDATE') && row) {
            const rev = (row.revision as number) ?? 0;
            if (rev >= (workflow?.revision ?? 0)) {
              const w = await workflowSupabase.loadWorkflowById(id as string);
              if (w) {
                setWorkflow(w);
                setSelectedNodeId(null);
                setSelectedEdgeId(null);
                setConnectingFromNodeId(null);
              }
            }
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [selectedWorkflowId, workflow?.revision]);

  // when gallery template is selected
  const mergePositionsIntoNodes = useCallback(
    (w: Workflow, positions: NodePositions): Workflow => ({
      ...w,
      nodes: w.nodes.map((n) => ({
        ...n,
        position: positions[n.id] ?? n.position,
      })),
    }),
    []
  );

  // Update workflow and persist (only if data actually changed); always sync positions into nodes
  // Commit manual changes to history after debounce
  const commitManualChanges = useCallback((workflowState: Workflow) => {
    if (!workflowState) return;
    
    const prevHistory = loadWorkflowHistory(workflowState.id);
    const lastCheckpoint = prevHistory[prevHistory.length - 1];
    
    // Only create checkpoint if there are actual changes from the last checkpoint
    if (!lastCheckpoint || !workflowDataEqual(lastCheckpoint.workflowState, workflowState)) {
      // Check if the last checkpoint was also a manual checkpoint
      // If so, REPLACE it instead of adding a new one (batching manual edits)
      let updatedHistory: HistoryCheckpoint[];
      
      if (lastCheckpoint && lastCheckpoint.type === 'manual') {
        // Replace the last manual checkpoint with the new state
        const newCheckpoint: HistoryCheckpoint = {
          id: lastCheckpoint.id, // Keep the same ID
          timestamp: new Date().toISOString(), // Update timestamp
          type: 'manual',
          description: `Manual edit: ${workflowState.nodes.length} nodes, ${workflowState.edges.length} edges`,
          nodeCount: workflowState.nodes.length,
          edgeCount: workflowState.edges.length,
          workflowState: JSON.parse(JSON.stringify(workflowState)),
        };
        updatedHistory = [...prevHistory.slice(0, -1), newCheckpoint];
        saveWorkflowHistory(workflowState.id, updatedHistory);
      } else {
        // Last checkpoint was AI or none exists, create new manual checkpoint
        updatedHistory = addHistoryCheckpoint(
          workflowState.id,
          'manual',
          `Manual edit: ${workflowState.nodes.length} nodes, ${workflowState.edges.length} edges`,
          workflowState
        );
      }
      
      setWorkflowHistory(updatedHistory);
    }
  }, []);

  const updateWorkflow = useCallback(
    (updater: (prev: Workflow) => Workflow, skipManualCheckpoint: boolean = false) => {
      setWorkflow((prev) => {
        if (!prev) return prev;
        const updated = updater(prev);
        const withPositions = mergePositionsIntoNodes(updated, nodePositions);
        if (workflowDataEqual(prev, withPositions)) return prev;
        const withMeta: Workflow = {
          ...withPositions,
          updatedByRole: userRole,
          updatedAt: new Date().toISOString(),
          revision: prev.revision + 1,
        };
        workflowSupabase.saveWorkflow(withMeta).catch((e) => console.error('Failed to save workflow:', e));
        
        // Debounced manual edit tracking (only if not skipping)
        if (!skipManualCheckpoint) {
          if (manualEditDebounceTimer) {
            clearTimeout(manualEditDebounceTimer);
          }
          manualEditDebounceTimer = setTimeout(() => {
            commitManualChanges(withMeta);
          }, MANUAL_EDIT_DEBOUNCE_MS);
        }
        
        return withMeta;
      });
    },
    [userRole, nodePositions, mergePositionsIntoNodes, commitManualChanges]
  );

  // Workflow list operations
  const createWorkflow = async () => {
    const id = generateId();
    const name = `Workflow ${workflowsList.length + 1}`;
    const newWorkflow = createEmptyWorkflow(id, name, userRole);
    try {
      await workflowSupabase.saveWorkflow(newWorkflow);
      const list = await workflowSupabase.loadWorkflowsList();
      setWorkflowsList(list);
      setSelectedWorkflowId(id);
      setIsWorkflowListCollapsed(true);
      setViewMode('editor');
    } catch (e) {
      console.error('Failed to create workflow:', e);
    }
  };

  // Add the Leather Order Readiness demo as a new workflow (clone with new ids)
  const createDemoWorkflow = async () => {
    const nodeIdMap: Record<string, string> = {};
    const newNodes: WorkflowNode[] = INITIAL_DEFAULT_WORKFLOW.nodes.map((n) => {
      const newId = generateId();
      nodeIdMap[n.id] = newId;
      return {
        id: newId,
        name: n.name,
        ...(n.position && { position: { x: n.position.x, y: n.position.y } }),
        ...(n.meta && { meta: { ...n.meta } }),
      };
    });
    const newEdges: WorkflowEdge[] = INITIAL_DEFAULT_WORKFLOW.edges.map((e) => ({
      id: generateId(),
      name: e.name,
      startNodeId: nodeIdMap[e.startNodeId] ?? e.startNodeId,
      endNodeId: nodeIdMap[e.endNodeId] ?? e.endNodeId,
      ...(e.meta && { meta: { ...e.meta } }),
    }));
    const id = generateId();
    const newWorkflow: Workflow = {
      id,
      name: INITIAL_DEFAULT_WORKFLOW.name,
      owner: INITIAL_DEFAULT_WORKFLOW.owner,
      sharedWith: [...INITIAL_DEFAULT_WORKFLOW.sharedWith],
      nodes: newNodes,
      edges: newEdges,
      updatedByRole: userRole,
      updatedAt: new Date().toISOString(),
      revision: 0,
    };
    try {
      await workflowSupabase.saveWorkflow(newWorkflow);
      const list = await workflowSupabase.loadWorkflowsList();
      setWorkflowsList(list);
      setSelectedWorkflowId(id);
      setIsWorkflowListCollapsed(true);
      setViewMode('editor');
    } catch (e) {
      console.error('Failed to create demo workflow:', e);
    }
  };

  const deleteWorkflow = async (id: string) => {
    try {
      await workflowSupabase.deleteWorkflow(id);
      const list = await workflowSupabase.loadWorkflowsList();
      setWorkflowsList(list);
      if (selectedWorkflowId === id) {
        const remaining = list.filter((w) => w.owner === userRole || w.sharedWith.includes(userRole));
        setSelectedWorkflowId(remaining.length > 0 ? remaining[0].id : null);
      }
    } catch (e) {
      console.error('Failed to delete workflow:', e);
    }
  };

  // navigate back to gallery view
  const handleBackToGallery = () => {
    setSelectedWorkflowId(null);
    setViewMode('gallery');
    setIsWorkflowListCollapsed(false);
  };

  // create a workflow from one of the gallery templates
  const createWorkflowFromTemplate = async (template: WorkflowTemplate) => {
    const nodeIdMap: Record<string, string> = {};
    const newNodes: WorkflowNode[] = (template.workflow.nodes || []).map((n: any) => {
      const newId = generateId();
      nodeIdMap[n.id] = newId;
      return {
        ...n,
        id: newId,
      };
    });
    const newEdges: WorkflowEdge[] = (template.workflow.edges || []).map((e: any) => ({
      ...e,
      id: generateId(),
      startNodeId: nodeIdMap[e.startNodeId] ?? e.startNodeId,
      endNodeId: nodeIdMap[e.endNodeId] ?? e.endNodeId,
    }));
    const id = generateId();
    const newWorkflow: Workflow = {
      id,
      name: template.workflow.name || `Workflow ${workflowsList.length + 1}`,
      owner: template.workflow.owner,
      sharedWith: template.workflow.sharedWith ?? [],
      nodes: newNodes,
      edges: newEdges,
      updatedByRole: userRole,
      updatedAt: new Date().toISOString(),
      revision: 0,
    };
    try {
      await workflowSupabase.saveWorkflow(newWorkflow);
      const list = await workflowSupabase.loadWorkflowsList();
      setWorkflowsList(list);
      setSelectedWorkflowId(id);
      setIsWorkflowListCollapsed(true);
      setViewMode('editor');
    } catch (e) {
      console.error('failed to create workflow from template', e);
    }
  };


  const renameWorkflow = async (id: string, newName: string) => {
    const trimmed = newName.trim();
    setRenamingWorkflowId(null);
    setRenameValue('');
    if (!trimmed) return;
    const existing = workflowsList.find((w) => w.id === id);
    if (existing?.name === trimmed) return;
    try {
      const toUpdate = workflow?.id === id ? workflow : await workflowSupabase.loadWorkflowById(id);
      if (!toUpdate) return;
      const updated = { ...toUpdate, name: trimmed };
      await workflowSupabase.saveWorkflow(updated);
      if (workflow?.id === id) setWorkflow(updated);
      const list = await workflowSupabase.loadWorkflowsList();
      setWorkflowsList(list);
    } catch (e) {
      console.error('Failed to rename workflow:', e);
    }
  };

  const copyWorkflow = async (id: string) => {
    const source = await workflowSupabase.loadWorkflowById(id);
    if (!source) return;
    const nodeIdMap: Record<string, string> = {};
    const newNodes: WorkflowNode[] = source.nodes.map((n) => {
      const newId = generateId();
      nodeIdMap[n.id] = newId;
      return {
        id: newId,
        name: n.name,
        ...(n.position && { position: { x: n.position.x, y: n.position.y } }),
        ...(n.meta && { meta: { ...n.meta } }),
      };
    });
    const newEdges: WorkflowEdge[] = source.edges.map((e) => ({
      id: generateId(),
      name: e.name,
      startNodeId: nodeIdMap[e.startNodeId] ?? e.startNodeId,
      endNodeId: nodeIdMap[e.endNodeId] ?? e.endNodeId,
      ...(e.meta && { meta: { ...e.meta } }),
    }));
    const newId = generateId();
    const newName = `${source.name} copy`;
    const newWorkflow: Workflow = {
      id: newId,
      name: newName,
      owner: userRole,
      sharedWith: [],
      nodes: newNodes,
      edges: newEdges,
      updatedByRole: userRole,
      updatedAt: new Date().toISOString(),
      revision: 0,
    };
    try {
      await workflowSupabase.saveWorkflow(newWorkflow);
      const list = await workflowSupabase.loadWorkflowsList();
      setWorkflowsList(list);
      setSelectedWorkflowId(newId);
    } catch (e) {
      console.error('Failed to copy workflow:', e);
    }
  };

  const shareWorkflow = async (id: string, sharedWith: UserRole[]) => {
    try {
      const toUpdate = workflow?.id === id ? workflow : await workflowSupabase.loadWorkflowById(id);
      if (!toUpdate) return;
      const updated = { ...toUpdate, sharedWith };
      await workflowSupabase.saveWorkflow(updated);
      if (workflow?.id === id) setWorkflow(updated);
      const list = await workflowSupabase.loadWorkflowsList();
      setWorkflowsList(list);
    } catch (e) {
      console.error('Failed to share workflow:', e);
    }
  };

  // Node operations
  const createNode = (position?: { x: number; y: number }) => {
    if (!workflow) return;
    const newNode: WorkflowNode = {
      id: generateId(),
      name: `Node ${workflow.nodes.length + 1}`,
      ...(position && { position: { x: position.x, y: position.y } }),
    };
    if (position) {
      setNodePositions((prev) => ({ ...prev, [newNode.id]: position }));
    }
    updateWorkflow((prev) => ({
      ...prev,
      nodes: [...prev.nodes, newNode],
    }));
    return newNode.id;
  };

  const renameNode = (nodeId: string, newName: string) => {
    // Only update if the name actually changed
    if (newName.trim() && newName.trim() !== originalEditName) {
      updateWorkflow((prev) => ({
        ...prev,
        nodes: prev.nodes.map((n) => (n.id === nodeId ? { ...n, name: newName.trim() } : n)),
      }));
    }
    setEditingNodeId(null);
    setOriginalEditName('');
  };

  const deleteNode = (nodeId: string) => {
    updateWorkflow((prev) => ({
      ...prev,
      nodes: prev.nodes.filter((n) => n.id !== nodeId),
      edges: prev.edges.filter((e) => e.startNodeId !== nodeId && e.endNodeId !== nodeId),
    }));
    setSelectedNodeId(null);
    setConnectingFromNodeId(null);
    setNodePositions((prev) => {
      const newPositions = { ...prev };
      delete newPositions[nodeId];
      return newPositions;
    });
  };

  // Edge operations
  const createEdge = (startNodeId: string, endNodeId: string) => {
    if (!workflow || startNodeId === endNodeId) return;
    const exists = workflow.edges.some(
      (e) => e.startNodeId === startNodeId && e.endNodeId === endNodeId
    );
    if (exists) return;

    const newEdge: WorkflowEdge = {
      id: generateId(),
      name: '',
      startNodeId,
      endNodeId,
    };
    updateWorkflow((prev) => ({
      ...prev,
      edges: [...prev.edges, newEdge],
    }));
  };

  const renameEdge = (edgeId: string, newName: string) => {
    // Only update if the name actually changed
    if (newName.trim() !== originalEditName) {
      updateWorkflow((prev) => ({
        ...prev,
        edges: prev.edges.map((e) => (e.id === edgeId ? { ...e, name: newName.trim() } : e)),
      }));
    }
    setEditingEdgeId(null);
    setOriginalEditName('');
  };

  const deleteEdge = (edgeId: string) => {
    updateWorkflow((prev) => ({
      ...prev,
      edges: prev.edges.filter((e) => e.id !== edgeId),
    }));
    setSelectedEdgeId(null);
  };

  // Update node meta (apply immediately from panel)
  const updateNodeMeta = (nodeId: string, meta: Partial<WorkflowNodeMeta>) => {
    updateWorkflow((prev) => ({
      ...prev,
      nodes: prev.nodes.map((n) =>
        n.id === nodeId ? { ...n, meta: { ...n.meta, ...meta } } : n
      ),
    }));
  };

  // Update edge meta (apply immediately from panel)
  const updateEdgeMeta = (edgeId: string, meta: Partial<WorkflowEdgeMeta>) => {
    updateWorkflow((prev) => ({
      ...prev,
      edges: prev.edges.map((e) =>
        e.id === edgeId ? { ...e, meta: { ...e.meta, ...meta } } : e
      ),
    }));
  };

  // Handle node click
  const handleNodeClick = (nodeId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    
    if (connectingFromNodeId) {
      if (connectingFromNodeId !== nodeId) {
        createEdge(connectingFromNodeId, nodeId);
      }
      setConnectingFromNodeId(null);
    } else {
      setSelectedNodeId(nodeId);
      setSelectedEdgeId(null);
    }
  };

  // Handle connection button click
  const handleConnectionButtonClick = (nodeId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (connectingFromNodeId === nodeId) {
      setConnectingFromNodeId(null);
    } else {
      setConnectingFromNodeId(nodeId);
      setSelectedNodeId(null);
      setSelectedEdgeId(null);
    }
  };

  // Handle node double click for renaming
  const handleNodeDoubleClick = (nodeId: string, currentName: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingNodeId(nodeId);
    setEditName(currentName);
    setOriginalEditName(currentName);
  };

  // Handle edge click
  const handleEdgeClick = (edgeId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedEdgeId(edgeId);
    setSelectedNodeId(null);
    setConnectingFromNodeId(null);
  };

  // Handle edge double click for renaming
  const handleEdgeDoubleClick = (edgeId: string, currentName: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingEdgeId(edgeId);
    setEditName(currentName);
    setOriginalEditName(currentName);
  };

  // Handle canvas click
  const handleCanvasClick = () => {
    setSelectedNodeId(null);
    setSelectedEdgeId(null);
    setConnectingFromNodeId(null);
  };

  const handleCanvasWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    setZoomLevel((prev) => Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, prev * (1 - e.deltaY * 0.002))));
  };

  // Handle canvas double-click to create node
  const handleCanvasDoubleClick = (e: React.MouseEvent) => {
    // Only if clicking on canvas background
    if (e.target !== canvasRef.current && !(e.target as HTMLElement).classList.contains('canvas-background')) {
      return;
    }
    const content = screenToContent(e.clientX, e.clientY);
    const x = content.x - APPROX_NODE_WIDTH / 2;
    const y = content.y - APPROX_NODE_HEIGHT / 2;
    const newNodeId = createNode({ x, y });
    setSelectedNodeId(newNodeId ?? null);
  };

  // Handle canvas mouse down for panning
  const handleCanvasMouseDown = (e: React.MouseEvent) => {
    if (e.target === canvasRef.current || (e.target as HTMLElement).classList.contains('canvas-background')) {
      dragStateRef.current = {
        ...dragStateRef.current,
        isPanning: true,
        panStartX: e.clientX - canvasOffset.x,
        panStartY: e.clientY - canvasOffset.y,
      };
    }
  };

  // Handle node mouse down for dragging
  const handleNodeMouseDown = (nodeId: string, e: React.MouseEvent) => {
    if (connectingFromNodeId) return;
    e.stopPropagation();

    const position = nodePositions[nodeId];
    if (!position) return;
    const mouseContent = screenToContent(e.clientX, e.clientY);

    dragStateRef.current = {
      ...dragStateRef.current,
      isDragging: true,
      draggedNodeId: nodeId,
      dragOffsetX: 0,
      dragOffsetY: 0,
      initialNodePosX: position.x,
      initialNodePosY: position.y,
      initialMouseContentX: mouseContent.x,
      initialMouseContentY: mouseContent.y,
      isPanning: false,
      panStartX: 0,
      panStartY: 0,
      canvasOffsetX: canvasOffset.x,
      canvasOffsetY: canvasOffset.y,
    };
  };

  // Handle mouse move
  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    const state = dragStateRef.current;

    if (state.isDragging && state.draggedNodeId) {
      const content = screenToContent(e.clientX, e.clientY);
      const newX = content.x - state.initialMouseContentX + state.initialNodePosX;
      const newY = content.y - state.initialMouseContentY + state.initialNodePosY;
      setNodePositions((prev) => ({
        ...prev,
        [state.draggedNodeId!]: { x: newX, y: newY },
      }));
    } else if (state.isPanning) {
      setCanvasOffset({
        x: e.clientX - state.panStartX,
        y: e.clientY - state.panStartY,
      });
    }
  }, [screenToContent]);

  // Handle mouse up: persist node position after drag (like Agent Studio)
  const handleMouseUp = useCallback(() => {
    const state = dragStateRef.current;
    if (state.isDragging && state.draggedNodeId && workflow) {
      const positions = nodePositionsRef.current;
      setWorkflow((prev) => {
        if (!prev) return prev;
        const withPositions = mergePositionsIntoNodes(prev, positions);
        if (workflowDataEqual(prev, withPositions)) return prev;
        const withMeta: Workflow = {
          ...withPositions,
          updatedByRole: userRole,
          updatedAt: new Date().toISOString(),
          revision: prev.revision + 1,
        };
        workflowSupabase.saveWorkflow(withMeta).catch((e) => console.error('Failed to save workflow:', e));
        return withMeta;
      });
    }
    dragStateRef.current = {
      isDragging: false,
      draggedNodeId: null,
      dragOffsetX: 0,
      dragOffsetY: 0,
      initialNodePosX: 0,
      initialNodePosY: 0,
      initialMouseContentX: 0,
      initialMouseContentY: 0,
      isPanning: false,
      panStartX: 0,
      panStartY: 0,
      canvasOffsetX: 0,
      canvasOffsetY: 0,
    };
    isResizingPanelRef.current = false;
    setIsResizingPanel(false);
  }, [workflow, mergePositionsIntoNodes, userRole]);

  // Handle panel resize start
  const handlePanelResizeStart = (e: React.PointerEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.currentTarget.setPointerCapture(e.pointerId); // Capture pointer even if it leaves element
    isResizingPanelRef.current = true;
    setIsResizingPanel(true);
    resizeStartXRef.current = e.clientX;
    resizeStartWidthRef.current = rightPanelWidth;
  };

  // Handle panel resize move
  const handlePanelResizeMove = useCallback((e: PointerEvent) => {
    if (!isResizingPanelRef.current) return;
    const deltaX = resizeStartXRef.current - e.clientX; // Inverted because we're expanding left
    const newWidth = Math.max(320, Math.min(800, resizeStartWidthRef.current + deltaX));
    setRightPanelWidth(newWidth);
  }, []);

  // Add global pointer move and up listeners for panel resize (mounted once)
  useEffect(() => {
    window.addEventListener('pointermove', handlePanelResizeMove as EventListener);
    window.addEventListener('pointerup', handleMouseUp as EventListener);
    return () => {
      window.removeEventListener('pointermove', handlePanelResizeMove as EventListener);
      window.removeEventListener('pointerup', handleMouseUp as EventListener);
    };
  }, [handlePanelResizeMove, handleMouseUp]);

  // Export workflow JSON to clipboard
  const exportWorkflow = async () => {
    if (!workflow) return;
    
    try {
      const workflowJson = JSON.stringify(workflow, null, 2);
      await navigator.clipboard.writeText(workflowJson);
      alert('Workflow JSON copied to clipboard!');
    } catch (error) {
      console.error('Failed to copy to clipboard:', error);
      alert('Failed to copy to clipboard. Please try again.');
    }
  };

  // Import workflow from JSON text
  const importWorkflow = () => {
    if (!workflow || !importJsonText.trim()) return;
    
    try {
      setImportError('');
      const importedData = JSON.parse(importJsonText);
      
      // Validate the imported data has required workflow structure
      if (!importedData.nodes || !Array.isArray(importedData.nodes)) {
        throw new Error('Invalid workflow data: missing nodes array');
      }
      if (!importedData.edges || !Array.isArray(importedData.edges)) {
        throw new Error('Invalid workflow data: missing edges array');
      }
      
      // Create the imported workflow with current metadata
      const importedWorkflow: Workflow = {
        ...importedData,
        id: workflow.id, // Keep current workflow ID
        name: importedData.name || workflow.name,
        owner: workflow.owner,
        sharedWith: workflow.sharedWith,
        updatedByRole: userRole,
        updatedAt: new Date().toISOString(),
        revision: workflow.revision + 1,
      };
      
      // Clear any pending manual edit debounce
      if (manualEditDebounceTimer) {
        clearTimeout(manualEditDebounceTimer);
        manualEditDebounceTimer = null;
      }
      
      // Update workflow
      setWorkflow(importedWorkflow);
      workflowSupabase.saveWorkflow(importedWorkflow).catch((e) => console.error('Failed to save workflow:', e));
      
      // Update node positions from imported nodes
      const newPositions: NodePositions = {};
      importedWorkflow.nodes.forEach((node) => {
        if (node.position) {
          newPositions[node.id] = node.position;
        }
      });
      setNodePositions(newPositions);
      
      // Add to history as manual edit
      const updatedHistory = addHistoryCheckpoint(
        workflow.id,
        'manual',
        `Imported workflow: ${importedWorkflow.nodes.length} nodes, ${importedWorkflow.edges.length} edges`,
        importedWorkflow
      );
      setWorkflowHistory(updatedHistory);
      
      // Close modal and reset
      setShowImportModal(false);
      setImportJsonText('');
      setImportError('');
      
      // Reset selections
      setSelectedNodeId(null);
      setSelectedEdgeId(null);
      setConnectingFromNodeId(null);
      
      alert('Workflow imported successfully!');
    } catch (error) {
      console.error('Failed to import workflow:', error);
      setImportError(error instanceof Error ? error.message : 'Invalid JSON format');
    }
  };

  // Clear workflow
  const clearWorkflow = () => {
    if (!workflow) return;
    // Clear any pending manual edit debounce
    if (manualEditDebounceTimer) {
      clearTimeout(manualEditDebounceTimer);
      manualEditDebounceTimer = null;
    }
    updateWorkflow(() => createEmptyWorkflow(workflow.id, workflow.name, userRole));
    setSelectedNodeId(null);
    setSelectedEdgeId(null);
    setConnectingFromNodeId(null);
    setNodePositions({});
  };

  // Auto-layout workflow nodes using dagre
  const handleAutoLayout = useCallback(() => {
    if (!workflow || workflow.nodes.length === 0) return;

    // Calculate intelligent layout for the complete workflow
    const layoutResult = calculateWorkflowLayout(
      workflow.nodes,
      workflow.edges,
      {
        direction: 'LR', // Left-to-right flow
        nodeWidth: 200,
        nodeHeight: 80,
        nodeSep: 150,
        edgeSep: 50,
        rankSep: 300,
        marginX: 80,
        marginY: 80,
      }
    );

    // Update node positions state
    const newPositions: NodePositions = {};
    layoutResult.nodes.forEach((node) => {
      if (node.position) {
        newPositions[node.id] = node.position;
      }
    });
    setNodePositions(newPositions);

    // Update workflow with new positions (treat as manual edit)
    const updatedWorkflow: Workflow = {
      ...workflow,
      nodes: layoutResult.nodes,
      updatedByRole: userRole,
      updatedAt: new Date().toISOString(),
      revision: workflow.revision + 1,
    };

    setWorkflow(updatedWorkflow);
    workflowSupabase.saveWorkflow(updatedWorkflow).catch((e) => console.error('Failed to save workflow:', e));

    // Create history checkpoint for auto-layout with batching
    // This replaces the last auto-layout checkpoint if consecutive
    const updatedHistory = addOrReplaceAutoLayoutCheckpoint(
      workflow.id,
      updatedWorkflow,
      workflowHistory
    );
    setWorkflowHistory(updatedHistory);
  }, [workflow, userRole, workflowHistory]);

  // Handle AI suggestions - add nodes and edges from AI Assistant
  const handleAddSuggestions = useCallback((suggestedNodes: WorkflowNode[], suggestedEdges: WorkflowEdge[], replaceWorkflow?: boolean) => {
    if (!workflow || suggestedNodes.length === 0) return;

    // Run sensitivity classification on each new node
    const nodesWithSensitivity = suggestedNodes.map((node) => {
      const text = [node.name, ...(node.meta?.inputs ?? []), ...(node.meta?.outputs ?? [])].join(' ');
      const result = classifySensitivity(text);
      if (result) {
        return {
          ...node,
          meta: {
            ...node.meta,
            sensitivityTag: result.tag,
            sensitivityCategories: result.categories,
            detectedKeywords: result.detectedKeywords,
            sensitivityConfirmed: false,
          },
        };
      }
      return node;
    });

    // Use dagre to calculate intelligent layout for the complete workflow
    // This ensures new nodes flow logically based on edge connections
    const layoutResult = calculateWorkflowLayout(
      replaceWorkflow ? nodesWithSensitivity : [...workflow.nodes, ...nodesWithSensitivity],
      replaceWorkflow ? suggestedEdges : [...workflow.edges, ...suggestedEdges],
      {
        direction: 'LR', // Left-to-right flow (natural for workflows)
        nodeWidth: 200,
        nodeHeight: 80,
        nodeSep: 150,
        edgeSep: 50,
        rankSep: 200,
        marginX: 80,
        marginY: 80,
      }
    );

    // Extract positioned nodes
    const allPositionedNodes = layoutResult.nodes;
    
    // Update node positions state for all nodes (to reflect new layout)
    const newPositions: NodePositions = {};
    allPositionedNodes.forEach((node) => {
      if (node.position) {
        newPositions[node.id] = node.position;
      }
    });
    setNodePositions(newPositions);

    // Update workflow with AI changes
    const updatedWorkflow: Workflow = {
      ...workflow,
      nodes: allPositionedNodes,
      edges: layoutResult.edges,
      updatedByRole: userRole,
      updatedAt: new Date().toISOString(),
      revision: workflow.revision + 1,
    };
    
    setWorkflow(updatedWorkflow);
    workflowSupabase.saveWorkflow(updatedWorkflow).catch((e) => console.error('Failed to save workflow:', e));

    // Create history checkpoint for AI changes
    if (replaceWorkflow) {
      const description = `AI replaced workflow with ${nodesWithSensitivity.length} nodes`;
      const updatedHistory = addHistoryCheckpoint(
        workflow.id,
        'ai',
        description,
        updatedWorkflow
      );
      setWorkflowHistory(updatedHistory);
    } else {
      const nodeNames = nodesWithSensitivity.map(n => n.name).join(', ');
      const description = `AI added: ${nodeNames}`;
      const updatedHistory = addHistoryCheckpoint(
        workflow.id,
        'ai',
        description,
        updatedWorkflow
      );
      setWorkflowHistory(updatedHistory);
    }

    // Switch to properties tab so user can see the new nodes
    setRightPanelTab('properties');
  }, [workflow, userRole]);

  // Restore workflow to a specific checkpoint
  const restoreCheckpoint = useCallback((checkpoint: HistoryCheckpoint) => {
    if (!workflow) return;
    
    if (confirm(`Restore to checkpoint from ${new Date(checkpoint.timestamp).toLocaleString()}?\n\nThis will: ${checkpoint.description}\n\nCurrent changes will be preserved in history.`)) {
      // Restore the workflow state
      setWorkflow(checkpoint.workflowState);
      workflowSupabase.saveWorkflow(checkpoint.workflowState).catch((e) => console.error('Failed to save workflow:', e));
      
      // Add a new checkpoint for the restore action
      const description = `Restored to: ${checkpoint.description}`;
      const updatedHistory = addHistoryCheckpoint(
        workflow.id,
        'manual',
        description,
        checkpoint.workflowState
      );
      setWorkflowHistory(updatedHistory);
      
      // Reset selections
      setSelectedNodeId(null);
      setSelectedEdgeId(null);
      setConnectingFromNodeId(null);
    }
  }, [workflow]);

  // Handle sending message to AI Assistant
  const handleSendAiMessage = useCallback(async (text: string, files?: FileAttachment[]) => {
    if (!workflow || !text.trim()) return;

    setPolicyBlockedMessage(null);

    // Add user message
    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: text,
      files: files,
      timestamp: new Date().toISOString(),
    };

    const updatedMessages = [...aiChatMessages, userMessage];
    setAiChatMessages(updatedMessages);
    saveAiChat(workflow.id, updatedMessages);
    setAiChatLoading(true);

    try {
      const conversationHistory = updatedMessages.map((m) => ({
        role: m.role,
        content: m.content,
        files: m.files,
      }));

      const policy = loadPolicy();
      const response = await fetch('/api/workflow-extract', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          narrative: text,
          existingWorkflow: workflow,
          conversationHistory,
          files: files,
          policy: policy ? { externalAiAllowed: policy.externalAiAllowed, dataControl: policy.dataControl, approvedTools: policy.approvedTools } : null,
        }),
      });

      if (!response.ok) {
        throw new Error(`API request failed: ${response.statusText}`);
      }

      const data = await response.json();

      let assistantContent = data.conversationResponse;
      let suggestionsToInclude = data.suggestedNodes && data.suggestedNodes.length > 0
        ? { nodes: data.suggestedNodes, edges: data.suggestedEdges || [], replaceWorkflow: data.replaceWorkflow || false }
        : undefined;

      // Policy enforcement: block external AI suggestions when policy forbids it
      if (policy && !policy.externalAiAllowed) {
        const responseSuggestsExternal = isExternalAiSuggestion(data.conversationResponse || '') ||
          (text && isExternalAiSuggestion(text));
        const filterResult = filterAiSuggestion('external_ai', workflow, policy);
        if (responseSuggestsExternal && !filterResult.allowed) {
          setPolicyBlockedMessage(filterResult.blockedReason || 'Blocked by Team Policy on External Data Sharing.');
          suggestionsToInclude = undefined;
          assistantContent = (data.conversationResponse || '') +
            '\n\n⚠️ **Policy notice:** External AI suggestions were blocked. Use internal tools (Excel, SAP, internal scripts) instead.';
          addAuditEvent({
            timestamp: new Date().toISOString(),
            type: 'blocked_violation',
            actor: userRole,
            details: `Blocked external AI suggestion in workflow "${workflow.name}"`,
            policyRule: filterResult.policyRule,
          });
        }
      }

      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: assistantContent,
        timestamp: new Date().toISOString(),
      };

      if (suggestionsToInclude) {
        assistantMessage.suggestions = suggestionsToInclude;
      }

      const finalMessages = [...updatedMessages, assistantMessage];
      setAiChatMessages(finalMessages);
      saveAiChat(workflow.id, finalMessages);
    } catch (error) {
      console.error('Error extracting workflow:', error);
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: "I'm having trouble understanding that. Could you try describing it a bit differently?",
        timestamp: new Date().toISOString(),
      };
      const finalMessages = [...updatedMessages, errorMessage];
      setAiChatMessages(finalMessages);
      saveAiChat(workflow.id, finalMessages);
    } finally {
      setAiChatLoading(false);
    }
  }, [workflow, aiChatMessages]);

  // Render edge
  const renderEdge = (edge: WorkflowEdge) => {
    const startPos = nodePositions[edge.startNodeId];
    const endPos = nodePositions[edge.endNodeId];
    if (!startPos || !endPos) return null;

    // Get optimal connection points
    const { start, end } = getConnectionPoints(startPos, endPos);
    
    // Generate path
    const path = generateEdgePath(start, end, canvasOffset);

    const isSelected = selectedEdgeId === edge.id;
    
    // Calculate label position (midpoint)
    const midX = (start.x + end.x) / 2 + canvasOffset.x;
    const midY = (start.y + end.y) / 2 + canvasOffset.y;

    return (
      <g key={edge.id}>
        {/* Invisible wide path for easier clicking */}
        <path
          d={path}
          fill="none"
          stroke="transparent"
          strokeWidth={20}
          style={{ cursor: 'pointer' }}
          onClick={(e) => handleEdgeClick(edge.id, e)}
          onDoubleClick={(e) => handleEdgeDoubleClick(edge.id, edge.name, e)}
        />
        {/* Visible path */}
        <path
          d={path}
          fill="none"
          stroke={isSelected ? '#3b82f6' : '#94a3b8'}
          strokeWidth={isSelected ? 3 : 2}
          markerEnd="url(#arrowhead)"
          style={{ pointerEvents: 'none' }}
        />
        {/* Edge label */}
        {editingEdgeId === edge.id ? (
          <foreignObject x={midX - 50} y={midY - 14} width={100} height={28}>
            <input
              type="text"
              value={editName}
              onChange={(e) => setEditName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') renameEdge(edge.id, editName);
                if (e.key === 'Escape') {
                  setEditingEdgeId(null);
                  setOriginalEditName('');
                }
              }}
              onBlur={() => renameEdge(edge.id, editName)}
              autoFocus
              className="w-full h-full px-2 text-xs text-center bg-white border border-blue-400 rounded outline-none shadow-sm"
              onClick={(e) => e.stopPropagation()}
            />
          </foreignObject>
        ) : edge.name ? (
          <g
            style={{ cursor: 'pointer' }}
            onClick={(e) => handleEdgeClick(edge.id, e)}
            onDoubleClick={(e) => handleEdgeDoubleClick(edge.id, edge.name, e)}
          >
            <rect
              x={midX - 60}
              y={midY - 20}
              width={120}
              height={40}
              fill="white"
              stroke={isSelected ? '#3b82f6' : '#e2e8f0'}
              strokeWidth={1}
              rx={4}
            />
            <foreignObject
              x={midX - 60}
              y={midY - 20}
              width={120}
              height={40}
              style={{ overflow: 'hidden' }}
            >
              <div
                className="w-full h-full flex items-center justify-center px-1 py-0.5 box-border"
                style={{ pointerEvents: 'none' }}
              >
                <span
                  className="text-[11px] text-center text-slate-600 dark:text-slate-400 break-words leading-tight"
                  style={{ wordBreak: 'break-word' }}
                >
                  {edge.name}
                </span>
              </div>
            </foreignObject>
          </g>
        ) : null}
        {/* Delete button */}
        {isSelected && (
          <g
            style={{ cursor: 'pointer' }}
            onClick={(e) => {
              e.stopPropagation();
              deleteEdge(edge.id);
            }}
          >
            <circle cx={midX + 50} cy={midY} r={10} fill="#ef4444" />
            <text x={midX + 50} y={midY + 4} textAnchor="middle" fill="white" fontSize={14} fontWeight="bold">
              ×
            </text>
          </g>
        )}
      </g>
    );
  };

  // Render node (v2: mode-based color + badges)
  const renderNode = (node: WorkflowNode) => {
    const position = nodePositions[node.id];
    if (!position) return null;

    const x = position.x + canvasOffset.x;
    const y = position.y + canvasOffset.y;

    const isSelected = selectedNodeId === node.id;
    const isConnecting = connectingFromNodeId === node.id;
    const isHovered = hoveredNodeId === node.id;
    const showConnectionButton = isHovered || isConnecting;

    const mode = node.meta?.mode ?? 'sync';
    const baseBg =
      isConnecting
        ? 'border-2 border-amber-500 bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-lg shadow-amber-200 dark:shadow-amber-900/30'
        : isSelected
          ? mode === 'async'
            ? 'border-2 border-amber-500 bg-amber-50 dark:bg-slate-700 text-slate-900 dark:text-white shadow-lg shadow-amber-200 dark:shadow-amber-900/30'
            : 'border-2 border-blue-500 bg-blue-50 dark:bg-slate-700 text-slate-900 dark:text-white shadow-lg shadow-blue-200 dark:shadow-blue-900/30'
          : mode === 'async'
            ? NODE_COLOR_ASYNC
            : mode === 'sync'
              ? NODE_COLOR_SYNC
              : NODE_COLOR_DEFAULT;

    const badges: { label: string; key: string }[] = [];
    if (node.meta?.mode) badges.push({ label: node.meta.mode.toUpperCase(), key: 'mode' });
    if (node.meta?.durationMins != null) badges.push({ label: `⏱ ${node.meta.durationMins}m`, key: 'dur' });
    if (node.meta?.cadence === 'recurring' && node.meta?.recurrence)
      badges.push({ label: `↻ ${node.meta.recurrence}`, key: 'cadence' });
    const assigneeCount = node.meta?.assignedTo?.length ?? 0;
    const approverCount = node.meta?.approver?.length ?? 0;
    if (assigneeCount > 0) badges.push({ label: `👤 ${assigneeCount}`, key: 'assigned' });
    if (approverCount > 0) badges.push({ label: `✓ ${approverCount}`, key: 'approver' });
    if (node.meta?.sensitivityTag) badges.push({ label: `🛡 ${node.meta.sensitivityTag}`, key: 'sensitivity' });
    const displayBadges = badges.slice(0, 5);

    return (
      <div
        key={node.id}
        className={`absolute select-none transition-shadow duration-150 ${
          isConnecting
            ? 'ring-2 ring-amber-400 shadow-lg shadow-amber-200 dark:shadow-amber-900/30'
            : isSelected
              ? 'ring-2 ring-blue-500 shadow-lg shadow-blue-200 dark:shadow-blue-900/30'
              : 'shadow-md hover:shadow-lg'
        }`}
        style={{
          left: x,
          top: y,
          cursor: connectingFromNodeId ? 'pointer' : 'move',
        }}
        onMouseDown={(e) => handleNodeMouseDown(node.id, e)}
        onClick={(e) => handleNodeClick(node.id, e)}
        onDoubleClick={(e) => handleNodeDoubleClick(node.id, node.name, e)}
        onMouseEnter={() => setHoveredNodeId(node.id)}
        onMouseLeave={() => setHoveredNodeId(null)}
      >
        {/* Node body */}
        <div
          className={`rounded-lg flex flex-col items-center justify-center px-3 py-2 min-w-[120px] min-h-[50px] max-w-[200px] max-h-[150px] overflow-hidden ${baseBg}`}
        >
          {editingNodeId === node.id ? (
            <input
              type="text"
              value={editName}
              onChange={(e) => setEditName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') renameNode(node.id, editName);
                if (e.key === 'Escape') {
                  setEditingNodeId(null);
                  setOriginalEditName('');
                }
              }}
              onBlur={() => renameNode(node.id, editName)}
              autoFocus
              className="px-1 py-0.5 text-sm text-center text-slate-900 dark:text-white bg-transparent rounded border-none outline-none"
              onClick={(e) => e.stopPropagation()}
              onMouseDown={(e) => e.stopPropagation()}
            />
          ) : (
            <>
              <div className="text-sm font-medium text-center leading-tight break-words overflow-hidden">
                {node.name}
              </div>
              {displayBadges.length > 0 && (
                <div className="flex flex-wrap gap-0.5 justify-center mt-1 overflow-hidden">
                  {displayBadges.map((b) => (
                    <span
                      key={b.key}
                      className="text-[9px] px-1 py-0.5 rounded bg-slate-300 dark:bg-slate-600 text-slate-700 dark:text-slate-200 truncate"
                    >
                      {b.label}
                    </span>
                  ))}
                </div>
              )}
            </>
          )}
        </div>

        {/* Delete button (top-right) */}
        {isSelected && !isConnecting && (
          <button
            className="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-red-500 text-white flex items-center justify-center text-sm font-bold hover:bg-red-600 transition-colors shadow-md"
            onClick={(e) => {
              e.stopPropagation();
              deleteNode(node.id);
            }}
            onMouseDown={(e) => e.stopPropagation()}
          >
            ×
          </button>
        )}

        {/* Connection button (bottom-center) */}
        <button
          className={`absolute -bottom-3 left-1/2 -translate-x-1/2 w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all duration-150 ${
            isConnecting
              ? 'bg-amber-500 border-amber-600 text-white scale-110'
              : showConnectionButton
              ? 'bg-white dark:bg-slate-700 border-slate-300 dark:border-slate-500 text-slate-500 dark:text-slate-300 hover:border-amber-400 hover:text-amber-500 scale-100 opacity-100'
              : 'bg-white dark:bg-slate-700 border-slate-300 dark:border-slate-500 text-slate-400 scale-75 opacity-0'
          }`}
          onClick={(e) => handleConnectionButtonClick(node.id, e)}
          onMouseDown={(e) => e.stopPropagation()}
        >
          <span className="material-icons-round text-sm">
            {isConnecting ? 'close' : 'add'}
          </span>
        </button>
      </div>
    );
  };

  // if no workflow is selected, show gallery instead of canvas
  if (viewMode === 'gallery') {
    return (
      <WorkflowsGallery
        workflows={workflowsList}
        loading={workflowsListLoading}
        error={workflowsListError}
        visibleWorkflows={visibleWorkflows}
        selectedWorkflowId={selectedWorkflowId}
        onSelectWorkflow={setSelectedWorkflowId}
        onRenameWorkflow={renameWorkflow}
        onDuplicateWorkflow={copyWorkflow}
        onDeleteWorkflow={deleteWorkflow}
        onCreateFromScratch={createWorkflow}
        onCreateWithAI={() => {
          createWorkflow();
          setTimeout(() => setRightPanelTab('ai-assistant'), 100);
        }}
        onCreateDemo={createDemoWorkflow}
        onSelectTemplate={createWorkflowFromTemplate}
      />
    );
  }

  return (
    <div 
      className="relative flex h-full bg-slate-100 dark:bg-slate-900"
      style={{ cursor: isResizingPanel ? 'col-resize' : 'default' }}
    >
      {/* Left pane: Workflow list (hidden in full view) */}
      <div
        className={`flex-shrink-0 flex flex-col bg-white dark:bg-slate-800 border-r border-slate-200 dark:border-slate-700 transition-all duration-300 ${
          viewMode === 'editor' ? 'hidden' : isCanvasFullView ? 'hidden' : isWorkflowListCollapsed ? 'w-16' : 'w-64'
        }`}
      >
        <div className="p-3 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between">
          {!isWorkflowListCollapsed && (
            <h2 className="text-lg font-bold text-slate-900 dark:text-white">Workflows</h2>
          )}
          <button
            onClick={() => setIsWorkflowListCollapsed(!isWorkflowListCollapsed)}
            className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors ml-auto"
            title={isWorkflowListCollapsed ? 'Expand workflow list' : 'Collapse workflow list'}
          >
            <span className="material-icons-round text-lg text-slate-600 dark:text-slate-400">
              {isWorkflowListCollapsed ? 'chevron_right' : 'chevron_left'}
            </span>
          </button>
        </div>

        {/* Expanded state: full-width Add Workflow button with text and chevron */}
        {!isWorkflowListCollapsed && (
          <>
            <div className="p-3 border-b border-slate-200 dark:border-slate-700">
              <div className="relative">
                <button
                  onClick={() => setShowWorkflowAddDropdown(!showWorkflowAddDropdown)}
                  className="w-full px-3 py-2 bg-emerald-500 text-white rounded-lg text-sm font-medium hover:bg-emerald-600 transition-colors flex items-center justify-center gap-1.5"
                >
                  <span className="material-icons-round text-lg">add</span>
                  Add Workflow
                  <span className="material-icons-round text-lg ml-auto">
                    {showWorkflowAddDropdown ? 'expand_less' : 'expand_more'}
                  </span>
                </button>

                {showWorkflowAddDropdown && (
                  <div className="absolute top-full left-0 right-0 mt-1 bg-white dark:bg-slate-800 rounded-lg shadow-lg border border-slate-200 dark:border-slate-700 py-1 z-50">
                    <button
                      onClick={() => {
                        createWorkflow();
                        setShowWorkflowAddDropdown(false);
                      }}
                      className="w-full px-3 py-2 text-left hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors flex items-center gap-2 text-slate-900 dark:text-white"
                    >
                      <span className="material-icons-round text-lg text-emerald-500">edit</span>
                      <span className="text-sm font-medium">Manual</span>
                    </button>
                    <button
                      onClick={() => {
                        createWorkflow();
                        setTimeout(() => setRightPanelTab('ai-assistant'), 100);
                        setShowWorkflowAddDropdown(false);
                      }}
                      className="w-full px-3 py-2 text-left hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors flex items-center gap-2 text-slate-900 dark:text-white"
                    >
                      <span className="material-icons-round text-lg text-blue-500">auto_awesome</span>
                      <span className="text-sm font-medium">With AI</span>
                    </button>
                    <button
                      onClick={() => {
                        createDemoWorkflow();
                        setShowWorkflowAddDropdown(false);
                      }}
                      className="w-full px-3 py-2 text-left hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors flex items-center gap-2 text-slate-900 dark:text-white"
                    >
                      <span className="material-icons-round text-lg text-amber-500">science</span>
                      <span className="text-sm font-medium">Demo</span>
                    </button>
                  </div>
                )}
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-2">
              {workflowsListLoading ? (
                <p className="text-sm text-slate-500 dark:text-slate-400 px-2 py-4 text-center">
                  Loading workflows…
                </p>
              ) : workflowsListError ? (
                <p className="text-sm text-red-600 dark:text-red-400 px-2 py-4 text-center">
                  {workflowsListError}
                </p>
              ) : visibleWorkflows.length === 0 ? (
                <p className="text-sm text-slate-500 dark:text-slate-400 px-2 py-4 text-center">
                  No workflows yet. Create one to get started.
                </p>
              ) : (
                <ul className="space-y-1">
                  {visibleWorkflows.map((w) => (
                <li
                  key={w.id}
                  className={`group flex items-center gap-1 rounded-lg ${
                    selectedWorkflowId === w.id
                      ? 'bg-blue-100 dark:bg-blue-900/40 text-blue-800 dark:text-blue-200'
                      : 'hover:bg-slate-100 dark:hover:bg-slate-700/50'
                  }`}
                >
                  {renamingWorkflowId === w.id ? (
                    <input
                      type="text"
                      value={renameValue}
                      onChange={(e) => setRenameValue(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') renameWorkflow(w.id, renameValue);
                        if (e.key === 'Escape') {
                          setRenamingWorkflowId(null);
                          setRenameValue('');
                        }
                      }}
                      onBlur={() => renameWorkflow(w.id, renameValue)}
                      autoFocus
                      className="flex-1 min-w-0 px-2 py-1 text-sm rounded border border-blue-400 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                      onClick={(e) => e.stopPropagation()}
                    />
                  ) : (
                    <>
                      <button
                        onClick={() => setSelectedWorkflowId(w.id)}
                        onDoubleClick={(e) => {
                          e.stopPropagation();
                          setRenamingWorkflowId(w.id);
                          setRenameValue(w.name);
                        }}
                        className="flex-1 min-w-0 text-left px-3 py-2 text-sm font-medium truncate"
                      >
                        {w.name}
                      </button>
                      <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setRenamingWorkflowId(w.id);
                            setRenameValue(w.name);
                          }}
                          className="p-1 rounded hover:bg-slate-200 dark:hover:bg-slate-600 text-slate-500 dark:text-slate-400"
                          title="Rename"
                        >
                          <span className="material-icons-round text-sm">edit</span>
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            copyWorkflow(w.id);
                          }}
                          className="p-1 rounded hover:bg-slate-200 dark:hover:bg-slate-600 text-slate-500 dark:text-slate-400"
                          title="Duplicate"
                        >
                          <span className="material-icons-round text-sm">content_copy</span>
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            if (confirm(`Delete "${w.name}"?`)) deleteWorkflow(w.id);
                          }}
                          className="p-1 rounded hover:bg-red-100 dark:hover:bg-red-900/30 text-slate-500 hover:text-red-600 dark:text-slate-400"
                          title="Delete"
                        >
                          <span className="material-icons-round text-sm">delete</span>
                        </button>
                      </div>
                    </>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>
          </>
        )}

        {/* Collapsed state: compact green + button that still opens the dropdown */}
        {isWorkflowListCollapsed && (
          <div className="p-2 flex flex-col items-center">
            <div className="relative">
              <button
                onClick={() => setShowWorkflowAddDropdown(!showWorkflowAddDropdown)}
                className="p-2 rounded-full bg-emerald-500 text-white hover:bg-emerald-600 transition-colors"
                title="Add Workflow"
              >
                <span className="material-icons-round text-lg">add</span>
              </button>

              {showWorkflowAddDropdown && (
                <div className="absolute top-0 left-full ml-2 bg-white dark:bg-slate-800 rounded-lg shadow-lg border border-slate-200 dark:border-slate-700 py-1 z-50">
                  <button
                    onClick={() => {
                      createWorkflow();
                      setShowWorkflowAddDropdown(false);
                    }}
                    className="w-full px-3 py-2 text-left hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors flex items-center gap-2 text-slate-900 dark:text-white"
                  >
                    <span className="material-icons-round text-lg text-emerald-500">edit</span>
                    <span className="text-sm font-medium">Manual</span>
                  </button>
                  <button
                    onClick={() => {
                      createWorkflow();
                      setTimeout(() => setRightPanelTab('ai-assistant'), 100);
                      setShowWorkflowAddDropdown(false);
                    }}
                    className="w-full px-3 py-2 text-left hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors flex items-center gap-2 text-slate-900 dark:text-white"
                  >
                    <span className="material-icons-round text-lg text-blue-500">auto_awesome</span>
                    <span className="text-sm font-medium">With AI</span>
                  </button>
                  <button
                    onClick={() => {
                      createDemoWorkflow();
                      setShowWorkflowAddDropdown(false);
                    }}
                    className="w-full px-3 py-2 text-left hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors flex items-center gap-2 text-slate-900 dark:text-white"
                  >
                    <span className="material-icons-round text-lg text-amber-500">science</span>
                    <span className="text-sm font-medium">Demo</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Main area: Editor or placeholder (full viewport when zoomed) */}
      <div
        className={`flex flex-col min-w-0 ${
          isCanvasFullView ? 'fixed inset-0 z-10 bg-slate-100 dark:bg-slate-900' : 'flex-1 h-full'
        }`}
      >
        {workflow ? (
          <>
            {/* Exit full view button (only when canvas full view) */}
            {isCanvasFullView && (
              <button
                type="button"
                onClick={() => setIsCanvasFullView(false)}
                className="absolute top-4 right-4 z-20 p-2 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-600 text-slate-700 dark:text-slate-200 shadow-md hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
                title="Exit full view"
              >
                <span className="material-icons-round">fullscreen_exit</span>
              </button>
            )}

            {/* Toolbar (hidden in full view) */}
            {!isCanvasFullView && (
            <div className="flex items-center justify-between px-4 py-2 bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700">
              <div className="flex items-center gap-3">
                <button
                  onClick={handleBackToGallery}
                  className="p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
                  title="Back to gallery"
                >
                  <span className="material-icons-round text-lg text-slate-600 dark:text-slate-400">
                    arrow_back
                  </span>
                </button>
                <h2 className="text-base font-bold text-slate-900 dark:text-white">{workflow.name}</h2>
                
                {/* Primary Actions - Icon only */}
                <div className="flex items-center gap-1.5 ml-3">
                  <button
                    onClick={() => createNode()}
                    className="p-1.5 rounded-lg bg-emerald-500 text-white hover:bg-emerald-600 transition-colors"
                    title="Add Node"
                  >
                    <span className="material-icons-round text-base">add_circle</span>
                  </button>
                  <button
                    onClick={handleAutoLayout}
                    disabled={!workflow || workflow.nodes.length === 0}
                    className="p-1.5 rounded-lg bg-indigo-500 text-white hover:bg-indigo-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    title="Auto-Layout: Automatically arrange nodes"
                  >
                    <span className="material-icons-round text-base">auto_fix_high</span>
                  </button>
                </div>
              </div>
              
              {/* Right side: Icon bar + Actions dropdown */}
              <div className="flex items-center gap-1.5">
                {/* Share Icon */}
                <div className="relative">
                  <button
                    onClick={() => setSharePopoverOpen((o) => !o)}
                    className="p-1.5 rounded-lg bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors"
                    title="Share workflow"
                  >
                    <span className="material-icons-round text-base">person_add</span>
                  </button>
                  {sharePopoverOpen && (
                    <>
                      <div
                        className="fixed inset-0 z-10"
                        onClick={() => setSharePopoverOpen(false)}
                        aria-hidden
                      />
                      <div className="absolute right-0 top-full mt-1 z-20 w-56 py-2 px-3 bg-white dark:bg-slate-800 rounded-lg shadow-lg border border-slate-200 dark:border-slate-600">
                        <p className="text-xs font-medium text-slate-500 dark:text-slate-400 mb-2">
                          Visible to roles:
                        </p>
                        {USER_ROLES.filter((r) => r !== workflow.owner).map((role) => {
                          const checked = workflow.sharedWith.includes(role);
                          return (
                            <label
                              key={role}
                              className="flex items-center gap-2 py-1 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-700/50 rounded px-2 -mx-2"
                            >
                              <input
                                type="checkbox"
                                checked={checked}
                                onChange={(e) => {
                                  const next = e.target.checked
                                    ? [...workflow.sharedWith, role]
                                    : workflow.sharedWith.filter((r) => r !== role);
                                  shareWorkflow(workflow.id, next);
                                }}
                                className="rounded"
                              />
                              <span className="text-sm text-slate-700 dark:text-slate-300">{role}</span>
                            </label>
                          );
                        })}
                      </div>
                    </>
                  )}
                </div>
                
                {/* History Icon with Badge */}
                <button
                  onClick={() => setShowHistoryPanel(true)}
                  className="p-1.5 rounded-lg bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors relative"
                  title="View workflow history"
                >
                  <span className="material-icons-round text-base">history</span>
                  {workflowHistory.length > 0 && (
                    <span className="absolute -top-0.5 -right-0.5 bg-purple-500 text-white text-[10px] rounded-full w-4 h-4 flex items-center justify-center font-bold">
                      {workflowHistory.length}
                    </span>
                  )}
                </button>
                
                {/* Full View Icon */}
                <button
                  onClick={() => setIsCanvasFullView(true)}
                  className="p-1.5 rounded-lg bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors"
                  title="Canvas full view"
                >
                  <span className="material-icons-round text-base">open_in_full</span>
                </button>
                
                {/* Divider */}
                <div className="w-px h-6 bg-slate-300 dark:bg-slate-600 mx-0.5"></div>
                
                {/* Actions Dropdown Menu */}
                <div className="relative">
                  <button
                    onClick={() => setShowActionsDropdown(!showActionsDropdown)}
                    className="p-1.5 rounded-lg bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors"
                    title="More actions"
                  >
                    <span className="material-icons-round text-base">more_vert</span>
                  </button>
                  
                  {showActionsDropdown && (
                    <>
                      <div
                        className="fixed inset-0 z-10"
                        onClick={() => setShowActionsDropdown(false)}
                        aria-hidden
                      />
                      <div className="absolute right-0 top-full mt-1 z-20 w-56 py-1 bg-white dark:bg-slate-800 rounded-lg shadow-lg border border-slate-200 dark:border-slate-600">
                        <button
                          onClick={() => {
                            exportWorkflow();
                            setShowActionsDropdown(false);
                          }}
                          className="w-full px-4 py-2.5 text-left hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors flex items-center gap-3 text-slate-700 dark:text-slate-200"
                        >
                          <span className="material-icons-round text-lg text-slate-500">content_copy</span>
                          <span className="text-sm font-medium">Export JSON</span>
                        </button>
                        <button
                          onClick={() => {
                            setShowImportModal(true);
                            setShowActionsDropdown(false);
                          }}
                          className="w-full px-4 py-2.5 text-left hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors flex items-center gap-3 text-slate-700 dark:text-slate-200"
                        >
                          <span className="material-icons-round text-lg text-orange-500">content_paste</span>
                          <span className="text-sm font-medium">Import JSON</span>
                        </button>
                        
                        <div className="my-1 border-t border-slate-200 dark:border-slate-700"></div>
                        
                        {(() => {
                          const policy = loadPolicy();
                          const needsReview = requiresReview(workflow, policy);
                          return needsReview ? (
                            <button
                              onClick={() => {
                                const sub = {
                                  id: `sub-${Date.now()}`,
                                  workflowId: workflow.id,
                                  workflowName: workflow.name,
                                  submittedBy: userRole,
                                  submittedAt: new Date().toISOString(),
                                  status: 'pending_review' as const,
                                  reviewRequiredReason: 'Workflow contains Customer Facing or Finance data requiring leader approval.',
                                };
                                addSubmission(sub);
                                addAuditEvent({
                                  timestamp: new Date().toISOString(),
                                  type: 'workflow_submitted',
                                  actor: userRole,
                                  details: `Submitted "${workflow.name}" for leader review`,
                                });
                                setSubmitSuccess(true);
                                setTimeout(() => setSubmitSuccess(false), 3000);
                                setShowActionsDropdown(false);
                              }}
                              className="w-full px-4 py-2.5 text-left hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors flex items-center gap-3 text-slate-700 dark:text-slate-200"
                            >
                              <span className="material-icons-round text-lg text-amber-500">send</span>
                              <span className="text-sm font-medium">{submitSuccess ? 'Submitted!' : 'Submit for Review'}</span>
                            </button>
                          ) : (
                            <button
                              onClick={() => {
                                setSubmitSuccess(true);
                                setTimeout(() => setSubmitSuccess(false), 2000);
                                setShowActionsDropdown(false);
                              }}
                              className="w-full px-4 py-2.5 text-left hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors flex items-center gap-3 text-slate-700 dark:text-slate-200"
                            >
                              <span className="material-icons-round text-lg text-cyan-500">publish</span>
                              <span className="text-sm font-medium">{submitSuccess ? 'Published!' : 'Publish'}</span>
                            </button>
                          );
                        })()}
                        
                        <div className="my-1 border-t border-slate-200 dark:border-slate-700"></div>
                        
                        <button
                          onClick={() => {
                            clearWorkflow();
                            setShowActionsDropdown(false);
                          }}
                          className="w-full px-4 py-2.5 text-left hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors flex items-center gap-3 text-red-600 dark:text-red-400"
                        >
                          <span className="material-icons-round text-lg">delete_sweep</span>
                          <span className="text-sm font-medium">Clear Workflow</span>
                        </button>
                      </div>
                    </>
                  )}
                </div>
              </div>
            </div>
            )}

            {/* Connection mode indicator (hidden in full view) */}
            {!isCanvasFullView && connectingFromNodeId && (
              <div className="px-6 py-2 bg-amber-100 dark:bg-amber-900/30 text-amber-800 dark:text-amber-200 text-sm flex items-center gap-2">
                <span className="material-icons-round text-lg">arrow_forward</span>
                Click on another node to create a connection from &quot;
                {workflow.nodes.find((n) => n.id === connectingFromNodeId)?.name}&quot;
                <button
                  onClick={() => setConnectingFromNodeId(null)}
                  className="ml-auto px-2 py-1 text-xs bg-amber-200 dark:bg-amber-800 rounded hover:bg-amber-300 dark:hover:bg-amber-700"
                >
                  Cancel
                </button>
              </div>
            )}

            {/* Canvas */}
            <div
              ref={canvasRef}
              className="flex-1 relative overflow-hidden cursor-grab active:cursor-grabbing"
              onClick={handleCanvasClick}
              onDoubleClick={handleCanvasDoubleClick}
              onMouseDown={handleCanvasMouseDown}
              onMouseMove={handleMouseMove}
              onMouseUp={handleMouseUp}
              onMouseLeave={handleMouseUp}
              onWheel={handleCanvasWheel}
              style={{ userSelect: 'none' }}
            >
              {/* Zoomed content wrapper (scale from center); canvas-background so pan/double-click work */}
              <div
                className="canvas-background absolute inset-0 w-full h-full"
                style={{
                  transform: `scale(${zoomLevel})`,
                  transformOrigin: '50% 50%',
                }}
              >
                {/* Grid background */}
                <div
                  className="canvas-background absolute inset-0 pointer-events-none"
                  style={{
                    backgroundImage: 'radial-gradient(circle, #cbd5e1 1px, transparent 1px)',
                    backgroundSize: '24px 24px',
                    backgroundPosition: `${canvasOffset.x % 24}px ${canvasOffset.y % 24}px`,
                  }}
                />

                {/* SVG layer for edges */}
                <svg className="absolute inset-0 w-full h-full pointer-events-none" style={{ overflow: 'visible' }}>
                <defs>
                  <marker
                    id="arrowhead"
                    markerWidth="10"
                    markerHeight="7"
                    refX="9"
                    refY="3.5"
                    orient="auto"
                  >
                    <polygon points="0 0, 10 3.5, 0 7" fill="#94a3b8" />
                  </marker>
                </defs>
                <g style={{ pointerEvents: 'auto' }}>
                  {workflow.edges.map(renderEdge)}
                </g>
              </svg>

              {/* Nodes layer */}
              {workflow.nodes.map(renderNode)}

                {/* Empty state */}
                {workflow.nodes.length === 0 && (
                  <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                    <div className="text-center bg-white dark:bg-slate-800 rounded-2xl p-8 shadow-lg border border-slate-200 dark:border-slate-700">
                      <div className="w-16 h-16 rounded-2xl bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center mx-auto mb-4">
                        <span className="material-icons-round text-3xl text-emerald-500">account_tree</span>
                      </div>
                      <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-2">
                        Start Building Your Workflow
                      </h3>
                      <p className="text-sm text-slate-500 dark:text-slate-400 max-w-xs mb-4">
                        Double-click anywhere on the canvas to create a node, or use the &quot;Add Node&quot; button.
                      </p>
                      <div className="text-xs text-slate-400 dark:text-slate-500 space-y-1">
                        <p>• Hover over a node and click + to create edges</p>
                        <p>• Drag nodes to reposition them</p>
                        <p>• Scroll to zoom • Drag canvas to pan</p>
                        <p>• Double-click to rename nodes/edges</p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Status bar (hidden in full view) */}
            {!isCanvasFullView && (
            <div className="px-6 py-2 bg-white dark:bg-slate-800 border-t border-slate-200 dark:border-slate-700 text-xs text-slate-500 dark:text-slate-400 flex items-center gap-4">
              <span>Nodes: {workflow.nodes.length}</span>
              <span>Edges: {workflow.edges.length}</span>
              <span>Rev {workflow.revision}</span>
              <span>Updated by {workflow.updatedByRole}</span>
              <span className="ml-auto">
                Last updated: {new Date(workflow.updatedAt).toLocaleTimeString()}
              </span>
            </div>
            )}

            {/* History Panel Modal */}
            {showHistoryPanel && (
              <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
                <div className="bg-white dark:bg-slate-800 rounded-lg shadow-xl w-full max-w-2xl max-h-[80vh] flex flex-col m-4">
                  <div className="flex items-center justify-between p-4 border-b border-slate-200 dark:border-slate-700">
                    <h2 className="text-lg font-semibold text-slate-900 dark:text-white">
                      Workflow History
                    </h2>
                    <button
                      onClick={() => setShowHistoryPanel(false)}
                      className="p-1 hover:bg-slate-100 dark:hover:bg-slate-700 rounded"
                    >
                      <span className="material-icons-round text-slate-500">close</span>
                    </button>
                  </div>
                  
                  <div className="flex-1 overflow-y-auto p-4">
                    {workflowHistory.length === 0 ? (
                      <p className="text-center text-slate-500 dark:text-slate-400 py-8">
                        No history yet. Make changes to see checkpoints here.
                      </p>
                    ) : (
                      <div className="space-y-3">
                        {[...workflowHistory].reverse().map((checkpoint, index) => (
                          <div
                            key={checkpoint.id}
                            className="flex items-center gap-4 p-3 border border-slate-200 dark:border-slate-600 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700/50"
                          >
                            <div className="flex-shrink-0">
                              <span
                                className={`inline-flex items-center justify-center w-8 h-8 rounded-full text-sm font-medium ${
                                  checkpoint.type === 'ai'
                                    ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300'
                                    : 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300'
                                }`}
                              >
                                {workflowHistory.length - index}
                              </span>
                            </div>
                            
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium text-slate-900 dark:text-white truncate">
                                {checkpoint.description}
                              </p>
                              <p className="text-xs text-slate-500 dark:text-slate-400">
                                {new Date(checkpoint.timestamp).toLocaleString()} • {checkpoint.nodeCount} nodes, {checkpoint.edgeCount} edges
                              </p>
                              <span
                                className={`inline-block mt-1 text-xs px-2 py-0.5 rounded ${
                                  checkpoint.type === 'ai'
                                    ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30'
                                    : 'bg-purple-100 text-purple-700 dark:bg-purple-900/30'
                                }`}
                              >
                                {checkpoint.type === 'ai' ? 'AI' : 'Manual'}
                              </span>
                            </div>
                            
                            <button
                              onClick={() => restoreCheckpoint(checkpoint)}
                              className="flex-shrink-0 px-3 py-1.5 text-sm bg-slate-200 dark:bg-slate-600 hover:bg-slate-300 dark:hover:bg-slate-500 text-slate-700 dark:text-slate-200 rounded transition-colors"
                            >
                              Restore
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                  
                  <div className="p-4 border-t border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/50 rounded-b-lg">
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      Showing last {workflowHistory.length} checkpoints. Click &quot;Restore&quot; to revert to a previous state. Your current state will be saved as a new checkpoint.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Import Modal */}
            {showImportModal && (
              <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
                <div className="bg-white dark:bg-slate-800 rounded-lg shadow-xl w-full max-w-3xl max-h-[90vh] flex flex-col m-4">
                  <div className="flex items-center justify-between p-4 border-b border-slate-200 dark:border-slate-700">
                    <h2 className="text-lg font-semibold text-slate-900 dark:text-white">
                      Import Workflow JSON
                    </h2>
                    <button
                      onClick={() => {
                        setShowImportModal(false);
                        setImportJsonText('');
                        setImportError('');
                      }}
                      className="p-1 hover:bg-slate-100 dark:hover:bg-slate-700 rounded"
                    >
                      <span className="material-icons-round text-slate-500">close</span>
                    </button>
                  </div>
                  
                  <div className="flex-1 overflow-y-auto p-4">
                    <p className="text-sm text-slate-600 dark:text-slate-400 mb-4">
                      Paste your workflow JSON below. The imported workflow will replace the current one and be saved as a manual edit in the history.
                    </p>
                    
                    {importError && (
                      <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
                        <p className="text-sm text-red-600 dark:text-red-400">
                          <span className="font-medium">Error:</span> {importError}
                        </p>
                      </div>
                    )}
                    
                    <textarea
                      value={importJsonText}
                      onChange={(e) => setImportJsonText(e.target.value)}
                      placeholder="Paste JSON here..."
                      className="w-full h-64 px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-600 rounded-lg font-mono text-sm resize-none focus:outline-none focus:ring-2 focus:ring-orange-500"
                    />
                  </div>
                  
                  <div className="p-4 border-t border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/50 rounded-b-lg flex justify-end gap-3">
                    <button
                      onClick={() => {
                        setShowImportModal(false);
                        setImportJsonText('');
                        setImportError('');
                      }}
                      className="px-4 py-2 bg-slate-200 dark:bg-slate-600 text-slate-700 dark:text-slate-200 rounded-lg text-sm font-medium hover:bg-slate-300 dark:hover:bg-slate-500 transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={importWorkflow}
                      disabled={!importJsonText.trim()}
                      className="px-4 py-2 bg-orange-500 text-white rounded-lg text-sm font-medium hover:bg-orange-600 disabled:bg-slate-300 dark:disabled:bg-slate-600 disabled:cursor-not-allowed transition-colors flex items-center gap-1.5"
                    >
                      <span className="material-icons-round text-sm">download</span>
                      Import Workflow
                    </button>
                  </div>
                </div>
              </div>
            )}
          </>
        ) : workflowLoading && selectedWorkflowId ? (
          <div className="flex-1 flex items-center justify-center bg-slate-100 dark:bg-slate-900">
            <p className="text-slate-500 dark:text-slate-400">Loading workflow…</p>
          </div>
        ) : (
          <div className="flex-1 flex items-center justify-center bg-slate-100 dark:bg-slate-900">
            <div className="text-center max-w-md px-8">
              <div className="w-20 h-20 rounded-2xl bg-slate-200 dark:bg-slate-700 flex items-center justify-center mx-auto mb-6">
                <span className="material-icons-round text-4xl text-slate-400">account_tree</span>
              </div>
              <h3 className="text-xl font-semibold text-slate-900 dark:text-white mb-2">
                Select a Workflow
              </h3>
              <p className="text-slate-500 dark:text-slate-400 mb-6">
                Choose a workflow from the list to edit it, or use the &quot;Add Workflow&quot; button in the sidebar to get started.
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Right-side panel with tabs (hidden in full view) */}
      {workflow && !isCanvasFullView && (
        <div 
          className={`flex-shrink-0 flex flex-col bg-white dark:bg-slate-800 border-l border-slate-200 dark:border-slate-700 relative ${
            isResizingPanel ? 'select-none' : ''
          }`}
          style={{ width: `${rightPanelWidth}px` }}
        >
          {/* Resize handle */}
          <div
            className="absolute left-0 top-0 bottom-0 w-2 -ml-1 cursor-col-resize hover:bg-blue-400/20 transition-colors z-10 group"
            onPointerDown={handlePanelResizeStart}
            title="Drag to resize panel"
          >
            <div className="absolute left-1/2 -translate-x-1/2 top-1/2 -translate-y-1/2 w-1 h-16 bg-slate-300 dark:bg-slate-600 group-hover:bg-blue-500 rounded transition-colors" />
          </div>
          
          {/* Tabs */}
          <div className="flex border-b border-slate-200 dark:border-slate-700">
            <button
              onClick={() => setRightPanelTab('properties')}
              className={`flex-1 px-3 py-2 text-sm font-medium transition-colors ${
                rightPanelTab === 'properties'
                  ? 'text-blue-600 border-b-2 border-blue-600 bg-blue-50 dark:bg-blue-900/20'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
              }`}
              title={rightPanelWidth < 400 ? 'Properties' : ''}
            >
              <span className="flex items-center justify-center gap-2">
                <span className="material-icons-round text-base">tune</span>
                {rightPanelWidth >= 400 && <span>Properties</span>}
              </span>
            </button>
            <button
              onClick={() => setRightPanelTab('ai-assistant')}
              className={`flex-1 px-3 py-2 text-sm font-medium transition-colors ${
                rightPanelTab === 'ai-assistant'
                  ? 'text-blue-600 border-b-2 border-blue-600 bg-blue-50 dark:bg-blue-900/20'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
              }`}
              title={rightPanelWidth < 400 ? 'AI Assistant' : ''}
            >
              <span className="flex items-center justify-center gap-2">
                <span className="material-icons-round text-base">chat</span>
                {rightPanelWidth >= 400 && <span>AI Assistant</span>}
              </span>
            </button>
            <button
              onClick={() => setRightPanelTab('analytics')}
              className={`flex-1 px-3 py-2 text-sm font-medium transition-colors ${
                rightPanelTab === 'analytics'
                  ? 'text-blue-600 border-b-2 border-blue-600 bg-blue-50 dark:bg-blue-900/20'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
              }`}
              title={rightPanelWidth < 400 ? 'Analytics' : ''}
            >
              <span className="flex items-center justify-center gap-2">
                <span className="material-icons-round text-base">analytics</span>
                {rightPanelWidth >= 400 && <span>Analytics</span>}
              </span>
            </button>
            <button
              onClick={() => setRightPanelTab('collaboration')}
              className={`flex-1 px-3 py-2 text-sm font-medium transition-colors ${
                rightPanelTab === 'collaboration'
                  ? 'text-blue-600 border-b-2 border-blue-600 bg-blue-50 dark:bg-blue-900/20'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
              }`}
              title={rightPanelWidth < 400 ? 'Collaboration' : ''}
            >
              <span className="flex items-center justify-center gap-2">
                <span className="material-icons-round text-base">group</span>
                {rightPanelWidth >= 400 && <span>Collaboration</span>}
              </span>
            </button>
          </div>

          {/* Tab Content */}
          <div className="flex-1 overflow-y-auto">
            {rightPanelTab === 'collaboration' ? (
              <WorkflowCollaborationPanel
                onlineUsers={collaboration.onlineUsers}
                messages={collaboration.messages}
                sendMessage={collaboration.sendMessage}
                voiceActive={collaboration.voiceActive}
                voiceParticipants={collaboration.voiceParticipants}
                joinVoice={collaboration.joinVoice}
                leaveVoice={collaboration.leaveVoice}
                currentUserId={userId.current}
              />
            ) : rightPanelTab === 'analytics' ? (
              <WorkflowAnalytics workflow={workflow} />
            ) : rightPanelTab === 'ai-assistant' ? (
              <WorkflowChat
                messages={aiChatMessages}
                onSendMessage={handleSendAiMessage}
                onAddSuggestions={handleAddSuggestions}
                isLoading={aiChatLoading}
                policyBlockedMessage={policyBlockedMessage}
                voiceOutputEnabled={voiceOutputEnabled}
                onToggleVoiceOutput={() => setVoiceOutputEnabled(prev => {
                  const newValue = !prev;
                  if (newValue) {
                    messageCountWhenEnabledRef.current = aiChatMessages.length;
                  } else {
                    Object.values(autoAudioPlayersRef.current).forEach(audio => {
                      audio.pause();
                      audio.currentTime = 0;
                    });
                    autoAudioPlayersRef.current = {};
                  }
                  return newValue;
                })}
                autoAudioPlayersRef={autoAudioPlayersRef}
                autoPlayedMessageIdsRef={autoPlayedMessageIdsRef}
                messageCountWhenEnabledRef={messageCountWhenEnabledRef}
              />
            ) : selectedNodeId ? (
            (() => {
              const node = workflow.nodes.find((n) => n.id === selectedNodeId);
              if (!node) return null;
              const m = node.meta ?? {};
              const workflowPeople: UserRole[] = [
                ...new Set([workflow.owner, ...workflow.sharedWith]),
              ];
              const assignedTo = Array.isArray(m.assignedTo) ? m.assignedTo : [];
              const approver = Array.isArray(m.approver) ? m.approver : [];
              const toggleAssigned = (role: UserRole) => {
                const next = assignedTo.includes(role)
                  ? assignedTo.filter((r) => r !== role)
                  : [...assignedTo, role];
                updateNodeMeta(selectedNodeId, { assignedTo: next.length ? next : undefined });
              };
              const toggleApprover = (role: UserRole) => {
                const next = approver.includes(role)
                  ? approver.filter((r) => r !== role)
                  : [...approver, role];
                updateNodeMeta(selectedNodeId, { approver: next.length ? next : undefined });
              };
              const sensitivityResult = node.meta?.sensitivityTag
                ? { tag: node.meta.sensitivityTag, categories: node.meta.sensitivityCategories ?? [], keywords: node.meta.detectedKeywords ?? [] }
                : null;
              return (
                <div className="p-4 space-y-4">
                  <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300">Node</h3>
                  {sensitivityResult && (
                    <div className={`rounded-lg border p-3 ${
                      sensitivityResult.tag === 'sensitive'
                        ? 'bg-amber-50 dark:bg-amber-950/30 border-amber-200 dark:border-amber-800'
                        : 'bg-slate-50 dark:bg-slate-800/50 border-slate-200 dark:border-slate-700'
                    }`}>
                      <div className="flex items-start gap-2">
                        <span className="material-icons-round text-amber-600 dark:text-amber-400 text-lg flex-shrink-0">shield</span>
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-slate-800 dark:text-slate-200">
                            Detected &quot;{sensitivityResult.keywords.join(', ')}&quot; → {sensitivityResult.tag}
                            {sensitivityResult.categories.length > 0 && ` (${sensitivityResult.categories.join(', ')})`}
                          </p>
                          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Sensitive data has restricted AI options per policy.</p>
                          {!node.meta?.sensitivityConfirmed && (
                            <div className="flex gap-2 mt-2">
                              <button
                                type="button"
                                onClick={() => updateNodeMeta(selectedNodeId, { sensitivityConfirmed: true })}
                                className="text-xs px-2 py-1 rounded bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-200 dark:hover:bg-emerald-800"
                              >
                                Confirm
                              </button>
                              <button
                                type="button"
                                onClick={() => updateNodeMeta(selectedNodeId, { sensitivityTag: undefined, sensitivityCategories: undefined, detectedKeywords: undefined, sensitivityConfirmed: undefined })}
                                className="text-xs px-2 py-1 rounded bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-300"
                              >
                                Dismiss
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  )}
                  <div>
                    <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">Name</label>
                    <input
                      type="text"
                      value={node.name}
                      onChange={(e) =>
                        updateWorkflow((prev) => ({
                          ...prev,
                          nodes: prev.nodes.map((n) =>
                            n.id === selectedNodeId ? { ...n, name: e.target.value } : n
                          ),
                        }))
                      }
                      onBlur={() => {
                        const n = workflow?.nodes.find((x) => x.id === selectedNodeId);
                        if (!n) return;
                        const text = [n.name, ...(n.meta?.inputs ?? []), ...(n.meta?.outputs ?? [])].join(' ');
                        const result = classifySensitivity(text);
                        if (result) {
                          updateNodeMeta(selectedNodeId, {
                            sensitivityTag: result.tag,
                            sensitivityCategories: result.categories,
                            detectedKeywords: result.detectedKeywords,
                            sensitivityConfirmed: n.meta?.sensitivityConfirmed ?? false,
                          });
                        }
                      }}
                      className="w-full px-2 py-1.5 text-sm rounded border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">
                      Assigned to
                    </label>
                    <p className="text-xs text-slate-400 dark:text-slate-500 mb-2">
                      Person who will complete this task
                    </p>
                    <div className="space-y-1.5 max-h-40 overflow-y-auto rounded border border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-800/50 p-2">
                      {workflowPeople.length === 0 ? (
                        <span className="text-xs text-slate-500 dark:text-slate-400">
                          Share the workflow to assign people to nodes.
                        </span>
                      ) : (
                        workflowPeople.map((role) => (
                          <label
                            key={role}
                            className="flex items-center gap-2 cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-700/50 rounded px-2 py-1"
                          >
                            <input
                              type="checkbox"
                              checked={assignedTo.includes(role)}
                              onChange={() => toggleAssigned(role)}
                              className="rounded border-slate-300 dark:border-slate-600 text-blue-600 focus:ring-blue-500"
                            />
                            <span className="text-sm text-slate-700 dark:text-slate-300">{role}</span>
                          </label>
                        ))
                      )}
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">
                      Approver
                    </label>
                    <p className="text-xs text-slate-400 dark:text-slate-500 mb-2">
                      Person who needs to approve this node
                    </p>
                    <div className="space-y-1.5 max-h-40 overflow-y-auto rounded border border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-800/50 p-2">
                      {workflowPeople.length === 0 ? (
                        <span className="text-xs text-slate-500 dark:text-slate-400">
                          Share the workflow to assign approvers to nodes.
                        </span>
                      ) : (
                        workflowPeople.map((role) => (
                          <label
                            key={role}
                            className="flex items-center gap-2 cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-700/50 rounded px-2 py-1"
                          >
                            <input
                              type="checkbox"
                              checked={approver.includes(role)}
                              onChange={() => toggleApprover(role)}
                              className="rounded border-slate-300 dark:border-slate-600 text-emerald-600 focus:ring-emerald-500"
                            />
                            <span className="text-sm text-slate-700 dark:text-slate-300">{role}</span>
                          </label>
                        ))
                      )}
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">Mode</label>
                    <select
                      value={m.mode ?? ''}
                      onChange={(e) =>
                        updateNodeMeta(selectedNodeId, {
                          mode: (e.target.value || undefined) as NodeMode | undefined,
                        })
                      }
                      className="w-full px-2 py-1.5 text-sm rounded border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                    >
                      <option value="">—</option>
                      <option value="sync">Sync</option>
                      <option value="async">Async</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">Duration (mins)</label>
                    <input
                      type="number"
                      min={0}
                      value={m.durationMins ?? ''}
                      onChange={(e) =>
                        updateNodeMeta(selectedNodeId, {
                          durationMins: e.target.value === '' ? undefined : parseInt(e.target.value, 10),
                        })
                      }
                      className="w-full px-2 py-1.5 text-sm rounded border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">Cadence</label>
                    <select
                      value={m.cadence ?? ''}
                      onChange={(e) =>
                        updateNodeMeta(selectedNodeId, {
                          cadence: (e.target.value || undefined) as NodeCadence | undefined,
                        })
                      }
                      className="w-full px-2 py-1.5 text-sm rounded border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                    >
                      <option value="">—</option>
                      <option value="once">Once</option>
                      <option value="recurring">Recurring</option>
                    </select>
                  </div>
                  {m.cadence === 'recurring' && (
                    <div>
                      <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">Recurrence</label>
                      <select
                        value={m.recurrence ?? ''}
                        onChange={(e) =>
                          updateNodeMeta(selectedNodeId, {
                            recurrence: (e.target.value || undefined) as NodeRecurrence | undefined,
                          })
                        }
                        className="w-full px-2 py-1.5 text-sm rounded border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                      >
                        <option value="">—</option>
                        <option value="perOrder">Per order</option>
                        <option value="daily">Daily</option>
                        <option value="weekly">Weekly</option>
                        <option value="monthly">Monthly</option>
                      </select>
                    </div>
                  )}
                  <div>
                    <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">Difficulty (1–5)</label>
                    <select
                      value={m.difficulty ?? ''}
                      onChange={(e) =>
                        updateNodeMeta(selectedNodeId, {
                          difficulty: e.target.value === '' ? undefined : (parseInt(e.target.value, 10) as 1 | 2 | 3 | 4 | 5),
                        })
                      }
                      className="w-full px-2 py-1.5 text-sm rounded border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                    >
                      <option value="">—</option>
                      {([1, 2, 3, 4, 5] as const).map((d) => (
                        <option key={d} value={d}>{d}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">Inputs (comma-separated)</label>
                    <input
                      type="text"
                      value={
                        commaSepDrafts[`${selectedNodeId}:inputs`] ??
                        (Array.isArray(m.inputs) ? m.inputs.join(', ') : '')
                      }
                      onChange={(e) =>
                        setCommaSepDrafts((prev) => ({ ...prev, [`${selectedNodeId}:inputs`]: e.target.value }))
                      }
                      onBlur={(e) => {
                        const arr = e.target.value ? e.target.value.split(',').map((s) => s.trim()).filter(Boolean) : undefined;
                        updateNodeMeta(selectedNodeId, { inputs: arr });
                        setCommaSepDrafts((prev) => {
                          const next = { ...prev };
                          delete next[`${selectedNodeId}:inputs`];
                          return next;
                        });
                      }}
                      placeholder="e.g. order, specs"
                      className="w-full px-2 py-1.5 text-sm rounded border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">Outputs (comma-separated)</label>
                    <input
                      type="text"
                      value={
                        commaSepDrafts[`${selectedNodeId}:outputs`] ??
                        (Array.isArray(m.outputs) ? m.outputs.join(', ') : '')
                      }
                      onChange={(e) =>
                        setCommaSepDrafts((prev) => ({ ...prev, [`${selectedNodeId}:outputs`]: e.target.value }))
                      }
                      onBlur={(e) => {
                        const arr = e.target.value ? e.target.value.split(',').map((s) => s.trim()).filter(Boolean) : undefined;
                        updateNodeMeta(selectedNodeId, { outputs: arr });
                        setCommaSepDrafts((prev) => {
                          const next = { ...prev };
                          delete next[`${selectedNodeId}:outputs`];
                          return next;
                        });
                      }}
                      placeholder="e.g. report, status"
                      className="w-full px-2 py-1.5 text-sm rounded border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">Tags (comma-separated)</label>
                    <input
                      type="text"
                      value={
                        commaSepDrafts[`${selectedNodeId}:tags`] ??
                        (Array.isArray(m.tags) ? m.tags.join(', ') : '')
                      }
                      onChange={(e) =>
                        setCommaSepDrafts((prev) => ({ ...prev, [`${selectedNodeId}:tags`]: e.target.value }))
                      }
                      onBlur={(e) => {
                        const arr = e.target.value ? e.target.value.split(',').map((s) => s.trim()).filter(Boolean) : undefined;
                        updateNodeMeta(selectedNodeId, { tags: arr });
                        setCommaSepDrafts((prev) => {
                          const next = { ...prev };
                          delete next[`${selectedNodeId}:tags`];
                          return next;
                        });
                      }}
                      placeholder="e.g. quality, urgent"
                      className="w-full px-2 py-1.5 text-sm rounded border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">Blockers (comma-separated)</label>
                    <input
                      type="text"
                      value={
                        commaSepDrafts[`${selectedNodeId}:blockers`] ??
                        (Array.isArray(m.blockers) ? m.blockers.join(', ') : '')
                      }
                      onChange={(e) =>
                        setCommaSepDrafts((prev) => ({ ...prev, [`${selectedNodeId}:blockers`]: e.target.value }))
                      }
                      onBlur={(e) => {
                        const arr = e.target.value ? e.target.value.split(',').map((s) => s.trim()).filter(Boolean) : undefined;
                        updateNodeMeta(selectedNodeId, { blockers: arr });
                        setCommaSepDrafts((prev) => {
                          const next = { ...prev };
                          delete next[`${selectedNodeId}:blockers`];
                          return next;
                        });
                      }}
                      placeholder="e.g. approval, stock"
                      className="w-full px-2 py-1.5 text-sm rounded border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                    />
                  </div>
                </div>
              );
            })()
          ) : selectedEdgeId ? (
            (() => {
              const edge = workflow.edges.find((e) => e.id === selectedEdgeId);
              if (!edge) return null;
              const m = edge.meta ?? {};
              const startName = workflow.nodes.find((n) => n.id === edge.startNodeId)?.name ?? edge.startNodeId;
              const endName = workflow.nodes.find((n) => n.id === edge.endNodeId)?.name ?? edge.endNodeId;
              return (
                <div className="p-4 space-y-4">
                  <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300">Edge</h3>
                  <div>
                    <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">Name</label>
                    <input
                      type="text"
                      value={edge.name}
                      onChange={(e) =>
                        updateWorkflow((prev) => ({
                          ...prev,
                          edges: prev.edges.map((ed) =>
                            ed.id === selectedEdgeId ? { ...ed, name: e.target.value } : ed
                          ),
                        }))
                      }
                      className="w-full px-2 py-1.5 text-sm rounded border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                    />
                  </div>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    {startName} → {endName}
                  </p>
                  <div>
                    <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">Handoff type</label>
                    <select
                      value={m.handoffType ?? ''}
                      onChange={(e) =>
                        updateEdgeMeta(selectedEdgeId, {
                          handoffType: (e.target.value || undefined) as EdgeHandoffType | undefined,
                        })
                      }
                      className="w-full px-2 py-1.5 text-sm rounded border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                    >
                      <option value="">—</option>
                      <option value="sync">Sync</option>
                      <option value="async">Async</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">Channel</label>
                    <select
                      value={m.channel ?? ''}
                      onChange={(e) =>
                        updateEdgeMeta(selectedEdgeId, {
                          channel: (e.target.value || undefined) as EdgeChannel | undefined,
                        })
                      }
                      className="w-full px-2 py-1.5 text-sm rounded border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                    >
                      <option value="">—</option>
                      <option value="inPerson">In person</option>
                      <option value="slack">Slack</option>
                      <option value="email">Email</option>
                      <option value="system">System</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">SLA (mins)</label>
                    <input
                      type="number"
                      min={0}
                      value={m.slaMins ?? ''}
                      onChange={(e) =>
                        updateEdgeMeta(selectedEdgeId, {
                          slaMins: e.target.value === '' ? undefined : parseInt(e.target.value, 10),
                        })
                      }
                      className="w-full px-2 py-1.5 text-sm rounded border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">Notes</label>
                    <textarea
                      value={m.notes ?? ''}
                      onChange={(e) => updateEdgeMeta(selectedEdgeId, { notes: e.target.value || undefined })}
                      rows={3}
                      className="w-full px-2 py-1.5 text-sm rounded border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-white resize-y"
                    />
                  </div>
                </div>
              );
            })()
          ) : (
            <div className="p-4 space-y-4">
              <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300">Workflow</h3>
              <p className="text-sm text-slate-600 dark:text-slate-400">{workflow.name}</p>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Rev {workflow.revision} · Updated by {workflow.updatedByRole}
              </p>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {workflow.nodes.length} nodes · {workflow.edges.length} edges
              </p>

              {/* Legend (collapsible) */}
              <div className="border-t border-slate-200 dark:border-slate-600 pt-4">
                <button
                  type="button"
                  onClick={() => setLegendCollapsed((c) => !c)}
                  className="flex items-center justify-between w-full text-left text-sm font-medium text-slate-700 dark:text-slate-300"
                >
                  Legend
                  <span className="material-icons-round text-lg">
                    {legendCollapsed ? 'expand_more' : 'expand_less'}
                  </span>
                </button>
                {!legendCollapsed && (
                  <div className="mt-2 space-y-2 text-xs text-slate-600 dark:text-slate-400">
                    <p className="font-medium text-slate-700 dark:text-slate-300">Node colors</p>
                    <div className="flex items-center gap-2">
                      <span className="w-4 h-4 rounded bg-blue-600" />
                      Sync
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="w-4 h-4 rounded bg-amber-600" />
                      Async
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="w-4 h-4 rounded bg-slate-600" />
                      No mode
                    </div>
                    <p className="font-medium text-slate-700 dark:text-slate-300 pt-2">Badges (on nodes)</p>
                    <p>Mode: SYNC / ASYNC · Duration: ⏱ 45m · Cadence: ↻ weekly (if recurring)</p>
                  </div>
                )}
              </div>
            </div>
          )}
          </div>
        </div>
      )}
    </div>
  );
};

export default WorkflowBuilder;
