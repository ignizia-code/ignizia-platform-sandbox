'use client';

import React, { useMemo, useState, useCallback, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import dagre from '@dagrejs/dagre';
import {
  Building2, Users, Briefcase, ChevronDown, ChevronRight,
  User, AlertCircle, GripVertical,
} from 'lucide-react';
import { cn } from '../lib/utils';
import type { OrgNode, OrgEdge } from '@/types/org';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface LayoutNode {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  node: OrgNode;
  childCount: number;
}

interface LayoutEdge {
  id: string;
  sourceX: number;
  sourceY: number;
  targetX: number;
  targetY: number;
  edge?: OrgEdge;
  isReporting: boolean;
}

interface OrgChartProps {
  nodes: OrgNode[];
  edges: OrgEdge[];
  highlightIds?: string[];
  animatingIds?: Set<string>;
  selectedNodeId?: string | null;
  departmentHealthByNodeId?: Record<string, { empCount: number; coverage: number; status: 'green' | 'amber' | 'red' }>;
  onNodeClick?: (node: OrgNode) => void;
  onNodeDoubleClick?: (node: OrgNode) => void;
  className?: string;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const NODE_WIDTH = 200;
const NODE_HEIGHT = 72;
const NODE_SEP = 40;
const RANK_SEP = 80;

const TYPE_ICONS: Record<string, React.ReactNode> = {
  root: <Building2 size={14} />,
  organization: <Building2 size={14} />,
  department: <Building2 size={13} />,
  team: <Users size={13} />,
  role: <Briefcase size={13} />,
  position: <User size={13} />,
  employee: <User size={13} />,
};

const TYPE_COLORS: Record<string, { bg: string; border: string; icon: string; text: string }> = {
  root: { bg: 'bg-primary/10 dark:bg-primary/20', border: 'border-primary/35', icon: 'text-primary', text: 'text-primary dark:text-brand-blue' },
  organization: { bg: 'bg-primary/10 dark:bg-primary/20', border: 'border-primary/35', icon: 'text-primary', text: 'text-primary dark:text-brand-blue' },
  department: { bg: 'bg-brand-blue/10 dark:bg-brand-blue/15', border: 'border-brand-blue/30', icon: 'text-brand-blue', text: 'text-slate-900 dark:text-slate-100' },
  team: { bg: 'bg-brand-green/10 dark:bg-brand-green/15', border: 'border-brand-green/30', icon: 'text-brand-green', text: 'text-slate-900 dark:text-slate-100' },
  role: { bg: 'bg-warning/10 dark:bg-warning/15', border: 'border-warning/30', icon: 'text-warning', text: 'text-slate-900 dark:text-slate-100' },
  position: { bg: 'bg-highlight/10 dark:bg-highlight/20', border: 'border-highlight/40', icon: 'text-highlight', text: 'text-slate-800 dark:text-slate-100' },
  employee: { bg: 'bg-highlight/10 dark:bg-highlight/20', border: 'border-highlight/40', icon: 'text-highlight', text: 'text-slate-800 dark:text-slate-100' },
};

function getVisualType(node: OrgNode): string {
  if (node.entity_type) return node.entity_type;
  if (node.node_type === 'root') return 'organization';
  if (node.node_type === 'position') return 'employee';
  return node.node_type;
}

// ---------------------------------------------------------------------------
// SVG path builder (quadratic bezier)
// ---------------------------------------------------------------------------

function buildPath(x1: number, y1: number, x2: number, y2: number): string {
  const midY = (y1 + y2) / 2;
  return `M ${x1} ${y1} C ${x1} ${midY} ${x2} ${midY} ${x2} ${y2}`;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function OrgChart({
  nodes,
  edges,
  highlightIds = [],
  animatingIds,
  selectedNodeId = null,
  departmentHealthByNodeId = {},
  onNodeClick,
  onNodeDoubleClick,
  className,
}: OrgChartProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [dragging, setDragging] = useState(false);
  const [isPanning, setIsPanning] = useState(false);
  const dragStart = useRef({ x: 0, y: 0, panX: 0, panY: 0 });
  const panRafRef = useRef<number | null>(null);
  const pendingPanRef = useRef<{ x: number; y: number } | null>(null);
  const lastAutoFitSignatureRef = useRef<string>('');
  const [hoveredNode, setHoveredNode] = useState<string | null>(null);
  const highlightSet = useMemo(() => new Set(highlightIds), [highlightIds]);

  // Collect all collapsed descendants so we can hide them
  const hiddenIds = useMemo(() => {
    const hidden = new Set<string>();
    const childMap = new Map<string | null, OrgNode[]>();
    nodes.forEach((n) => {
      const list = childMap.get(n.parent_id) ?? [];
      list.push(n);
      childMap.set(n.parent_id, list);
    });

    function hideChildren(parentId: string) {
      (childMap.get(parentId) ?? []).forEach((c) => {
        hidden.add(c.id);
        hideChildren(c.id);
      });
    }

    collapsed.forEach((id) => hideChildren(id));
    return hidden;
  }, [collapsed, nodes]);

  const visibleNodes = useMemo(() => nodes.filter((n) => !hiddenIds.has(n.id)), [nodes, hiddenIds]);

  // Build the child count map (for showing "+N" on collapsed nodes)
  const childCountMap = useMemo(() => {
    const map = new Map<string, number>();
    nodes.forEach((n) => {
      if (n.parent_id) {
        map.set(n.parent_id, (map.get(n.parent_id) ?? 0) + 1);
      }
    });
    return map;
  }, [nodes]);

  // Compute layout using dagre
  const { layoutNodes, layoutEdges, graphWidth, graphHeight } = useMemo(() => {
    const g = new dagre.graphlib.Graph();
    g.setGraph({
      rankdir: 'TB',
      nodesep: NODE_SEP,
      edgesep: 20,
      ranksep: RANK_SEP,
      marginx: 60,
      marginy: 60,
    });
    g.setDefaultEdgeLabel(() => ({}));

    visibleNodes.forEach((node) => {
      g.setNode(node.id, { label: node.name, width: NODE_WIDTH, height: NODE_HEIGHT });
    });

    // Use parent_id hierarchy for layout edges
    const visibleIds = new Set(visibleNodes.map((n) => n.id));
    visibleNodes.forEach((node) => {
      if (node.parent_id && visibleIds.has(node.parent_id)) {
        g.setEdge(node.parent_id, node.id);
      }
    });

    dagre.layout(g);

    const layoutNodes: LayoutNode[] = visibleNodes.map((node) => {
      const info = g.node(node.id);
      return {
        id: node.id,
        x: (info?.x ?? 0) - NODE_WIDTH / 2,
        y: (info?.y ?? 0) - NODE_HEIGHT / 2,
        width: NODE_WIDTH,
        height: NODE_HEIGHT,
        node,
        childCount: childCountMap.get(node.id) ?? 0,
      };
    });

    const nodePositions = new Map(layoutNodes.map((ln) => [ln.id, { cx: ln.x + NODE_WIDTH / 2, cy: ln.y + NODE_HEIGHT / 2, bottom: ln.y + NODE_HEIGHT, top: ln.y }]));

    // Build parent-child edges (hierarchy lines)
    const layoutEdges: LayoutEdge[] = [];
    visibleNodes.forEach((node) => {
      if (node.parent_id && visibleIds.has(node.parent_id)) {
        const src = nodePositions.get(node.parent_id);
        const tgt = nodePositions.get(node.id);
        if (src && tgt) {
          layoutEdges.push({
            id: `hier-${node.parent_id}-${node.id}`,
            sourceX: src.cx,
            sourceY: src.bottom,
            targetX: tgt.cx,
            targetY: tgt.top,
            isReporting: false,
          });
        }
      }
    });

    // Add explicit reporting edges (dotted overlay).
    // Data stores reports_to as child -> manager, but visually we draw manager -> child.
    edges.filter((e) => e.edge_type === 'reports_to').forEach((e) => {
      if (visibleIds.has(e.source_id) && visibleIds.has(e.target_id)) {
        const reportNode = nodePositions.get(e.source_id);
        const managerNode = nodePositions.get(e.target_id);
        if (managerNode && reportNode) {
          const alreadyHasHierarchy = visibleNodes.some(
            (n) => n.id === e.source_id && n.parent_id === e.target_id,
          );
          if (!alreadyHasHierarchy) {
            layoutEdges.push({
              id: `report-${e.id}`,
              sourceX: managerNode.cx,
              sourceY: managerNode.bottom,
              targetX: reportNode.cx,
              targetY: reportNode.top,
              edge: e,
              isReporting: true,
            });
          }
        }
      }
    });

    const info = g.graph();
    return {
      layoutNodes,
      layoutEdges,
      graphWidth: info.width ?? 800,
      graphHeight: info.height ?? 600,
    };
  }, [visibleNodes, edges, childCountMap]);

  // Auto-fit on first render or when nodes change significantly
  const graphSignature = useMemo(
    () =>
      `${layoutNodes.length}|${layoutEdges.length}|${layoutNodes
        .map((n) => `${n.id}:${n.x}:${n.y}`)
        .join(';')}`,
    [layoutNodes, layoutEdges.length],
  );

  useEffect(() => {
    if (!containerRef.current || layoutNodes.length === 0) return;
    if (lastAutoFitSignatureRef.current === graphSignature) return;
    const rect = containerRef.current.getBoundingClientRect();
    const scaleX = (rect.width - 40) / graphWidth;
    const scaleY = (rect.height - 40) / graphHeight;
    const newZoom = Math.min(Math.max(Math.min(scaleX, scaleY), 0.3), 1.2);
    setZoom(newZoom);
    setPan({
      x: (rect.width - graphWidth * newZoom) / 2,
      y: 20,
    });
    lastAutoFitSignatureRef.current = graphSignature;
  }, [graphHeight, graphSignature, graphWidth, layoutNodes.length]);

  // Focus selected node with immersive zoom
  useEffect(() => {
    if (!selectedNodeId || !containerRef.current || dragging || isPanning) return;
    const target = layoutNodes.find((n) => n.id === selectedNodeId);
    if (!target) return;
    const rect = containerRef.current.getBoundingClientRect();
    const focusZoom = Math.min(Math.max(zoom < 1 ? 1 : zoom, 1), 1.25);
    const targetCenterX = target.x + target.width / 2;
    const targetCenterY = target.y + target.height / 2;
    const x = rect.width / 2 - targetCenterX * focusZoom;
    const y = rect.height / 2 - targetCenterY * focusZoom;
    setZoom(focusZoom);
    setPan({ x, y });
  }, [selectedNodeId, layoutNodes, dragging, isPanning, zoom]);

  // Pan handlers
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (e.button !== 0) return;
    setDragging(true);
    setIsPanning(true);
    dragStart.current = { x: e.clientX, y: e.clientY, panX: pan.x, panY: pan.y };
  }, [pan]);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!dragging) return;
    pendingPanRef.current = {
      x: dragStart.current.panX + (e.clientX - dragStart.current.x),
      y: dragStart.current.panY + (e.clientY - dragStart.current.y),
    };

    if (panRafRef.current !== null) return;
    panRafRef.current = requestAnimationFrame(() => {
      if (pendingPanRef.current) {
        setPan(pendingPanRef.current);
      }
      panRafRef.current = null;
    });
  }, [dragging]);

  const handleMouseUp = useCallback(() => {
    setDragging(false);
    setIsPanning(false);
    if (panRafRef.current !== null) {
      cancelAnimationFrame(panRafRef.current);
      panRafRef.current = null;
    }
    if (pendingPanRef.current) {
      setPan(pendingPanRef.current);
      pendingPanRef.current = null;
    }
  }, []);

  const handleWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? -0.08 : 0.08;
    setZoom((z) => Math.min(Math.max(z + delta, 0.2), 2));
  }, []);

  const toggleCollapse = useCallback((nodeId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setCollapsed((prev) => {
      const next = new Set(prev);
      if (next.has(nodeId)) next.delete(nodeId);
      else next.add(nodeId);
      return next;
    });
  }, []);

  const fitView = useCallback(() => {
    if (!containerRef.current || layoutNodes.length === 0) return;
    const rect = containerRef.current.getBoundingClientRect();
    const scaleX = (rect.width - 40) / graphWidth;
    const scaleY = (rect.height - 40) / graphHeight;
    const newZoom = Math.min(Math.max(Math.min(scaleX, scaleY), 0.3), 1.2);
    setZoom(newZoom);
    setPan({ x: (rect.width - graphWidth * newZoom) / 2, y: 20 });
  }, [graphWidth, graphHeight, layoutNodes.length]);

  // Connected nodes for dimming
  const connectedToHovered = useMemo(() => {
    if (!hoveredNode) return null;
    const s = new Set<string>([hoveredNode]);
    edges.forEach((e) => {
      if (e.source_id === hoveredNode) s.add(e.target_id);
      if (e.target_id === hoveredNode) s.add(e.source_id);
    });
    // Also add parent/children
    const node = nodes.find((n) => n.id === hoveredNode);
    if (node?.parent_id) s.add(node.parent_id);
    nodes.filter((n) => n.parent_id === hoveredNode).forEach((n) => s.add(n.id));
    return s;
  }, [hoveredNode, edges, nodes]);

  useEffect(() => {
    return () => {
      if (panRafRef.current !== null) {
        cancelAnimationFrame(panRafRef.current);
      }
    };
  }, []);

  if (nodes.length === 0) {
    return (
      <div className={cn('flex flex-col items-center justify-center h-full text-center px-8', className)}>
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5 }}
          className="flex flex-col items-center"
        >
          <div className="w-20 h-20 rounded-3xl bg-action/10 flex items-center justify-center mb-5">
            <Building2 size={36} className="text-action" />
          </div>
          <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100 mb-2">
            Design Your Organization
          </h3>
          <p className="text-sm text-slate-500 dark:text-slate-400 max-w-sm leading-relaxed">
            Describe your company structure in the conversation below and watch it come to life. Or start from a template.
          </p>
        </motion.div>
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className={cn('relative overflow-hidden select-none', dragging ? 'cursor-grabbing' : 'cursor-grab', className)}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
      onWheel={handleWheel}
    >
      {/* Toolbar */}
      <div className="absolute top-3 right-3 z-20 flex items-center gap-1.5">
        <button onClick={fitView} className="px-2.5 py-1.5 rounded-lg bg-white/90 dark:bg-slate-800/90 border border-slate-200 dark:border-slate-700 text-[11px] font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 backdrop-blur-sm transition-colors">
          Fit
        </button>
        <button onClick={() => setZoom(z => Math.min(z + 0.15, 2))} className="w-7 h-7 rounded-lg bg-white/90 dark:bg-slate-800/90 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 flex items-center justify-center hover:bg-slate-50 dark:hover:bg-slate-700 backdrop-blur-sm text-sm transition-colors">+</button>
        <button onClick={() => setZoom(z => Math.max(z - 0.15, 0.2))} className="w-7 h-7 rounded-lg bg-white/90 dark:bg-slate-800/90 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 flex items-center justify-center hover:bg-slate-50 dark:hover:bg-slate-700 backdrop-blur-sm text-sm transition-colors">−</button>
        <span className="text-[10px] text-slate-400 ml-1 font-mono">{Math.round(zoom * 100)}%</span>
      </div>

      {/* Canvas */}
      <div
        style={{
          transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
          transformOrigin: '0 0',
          transition: isPanning ? 'none' : 'transform 460ms cubic-bezier(0.22, 1, 0.36, 1)',
          width: graphWidth,
          height: graphHeight,
          position: 'relative',
        }}
      >
        {/* SVG connectors */}
        <svg
          style={{ position: 'absolute', top: 0, left: 0, width: graphWidth, height: graphHeight, pointerEvents: 'none' }}
          className="overflow-visible"
        >
          <defs>
            <marker id="arrowhead" markerWidth="8" markerHeight="6" refX="8" refY="3" orient="auto">
              <path d="M 0 0 L 8 3 L 0 6 Z" className="fill-slate-300 dark:fill-slate-600" />
            </marker>
            <marker id="arrowhead-report" markerWidth="8" markerHeight="6" refX="8" refY="3" orient="auto">
              <path d="M 0 0 L 8 3 L 0 6 Z" className="fill-brand-blue/50" />
            </marker>
          </defs>
        <AnimatePresence initial={false}>
            {layoutEdges.map((le) => (
              <motion.path
                key={le.id}
                d={buildPath(le.sourceX, le.sourceY, le.targetX, le.targetY)}
                fill="none"
                strokeWidth={le.isReporting ? 1.5 : 1.5}
                strokeDasharray={le.isReporting ? '6 4' : undefined}
                markerEnd={le.isReporting ? 'url(#arrowhead-report)' : 'url(#arrowhead)'}
                className={le.isReporting ? 'stroke-brand-blue/40' : 'stroke-slate-300 dark:stroke-slate-600'}
                initial={false}
                animate={{ pathLength: 1, opacity: 1 }}
                exit={{ pathLength: 0, opacity: 0 }}
                transition={{ duration: isPanning ? 0 : 0.5, ease: 'easeInOut' }}
              />
            ))}
          </AnimatePresence>
        </svg>

        {/* Nodes */}
        <AnimatePresence initial={false}>
          {layoutNodes.map((ln) => {
            const visualType = getVisualType(ln.node);
            const colors = TYPE_COLORS[visualType] || TYPE_COLORS.role;
            const isHighlighted = highlightSet.has(ln.id);
            const isAnimating = animatingIds?.has(ln.id);
            const isSelected = selectedNodeId === ln.id;
            const isCollapsed = collapsed.has(ln.id);
            const hasChildren = ln.childCount > 0;
            const isDimmed = connectedToHovered && !connectedToHovered.has(ln.id);
            const deptHealth = departmentHealthByNodeId[ln.id];
            const healthDot =
              deptHealth?.status === 'green'
                ? 'bg-success'
                : deptHealth?.status === 'amber'
                  ? 'bg-warning'
                  : 'bg-danger';

            return (
              <motion.div
                key={ln.id}
                initial={false}
                animate={{
                  opacity: isDimmed ? 0.35 : 1,
                  scale: 1,
                  x: ln.x,
                  y: ln.y,
                }}
                exit={{ opacity: 0, scale: 0.7, transition: { duration: 0.2 } }}
                transition={
                  isPanning
                    ? { duration: 0 }
                    : { type: 'spring', stiffness: 200, damping: 25, mass: 0.8 }
                }
                className={cn(
                  'absolute rounded-xl border px-3 py-2.5 cursor-pointer transition-shadow',
                  colors.bg,
                  colors.border,
                  (visualType === 'organization' || visualType === 'root') &&
                    'shadow-lg shadow-brand-blue/25 ring-1 ring-brand-blue/20',
                  isHighlighted && 'ring-2 ring-brand-blue/50 shadow-lg shadow-brand-blue/10',
                  isSelected && 'ring-2 ring-action/50 shadow-xl shadow-action/15',
                  isAnimating && 'ring-2 ring-action/40 shadow-lg shadow-action/10',
                  !isDimmed && 'hover:shadow-md',
                )}
                style={{ width: NODE_WIDTH, height: NODE_HEIGHT }}
                onClick={() => onNodeClick?.(ln.node)}
                onDoubleClick={() => onNodeDoubleClick?.(ln.node)}
                onMouseEnter={() => setHoveredNode(ln.id)}
                onMouseLeave={() => setHoveredNode(null)}
              >
                {/* Animating pulse ring */}
                {isAnimating && (
                  <motion.div
                    className="absolute inset-0 rounded-xl border-2 border-action/30"
                    initial={{ opacity: 0.8, scale: 1 }}
                    animate={{ opacity: 0, scale: 1.08 }}
                    transition={{ duration: 1.2, repeat: 2 }}
                  />
                )}
                {isSelected && (
                  <motion.div
                    className="absolute inset-0 rounded-xl border-2 border-action/35"
                    initial={{ opacity: 0.8, scale: 1 }}
                    animate={{ opacity: 0, scale: 1.12 }}
                    transition={{ duration: 1.3, repeat: Infinity, ease: 'easeOut' }}
                  />
                )}

                <div className="flex items-start gap-2 h-full">
                  <div className={cn('w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5', colors.icon, `${colors.bg}`)}>
                    {TYPE_ICONS[visualType] || <Briefcase size={13} />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1">
                      <span className={cn('text-xs font-semibold truncate', colors.text)}>
                        {ln.node.name}
                      </span>
                      {ln.node.is_vacant && (
                        <AlertCircle size={10} className="text-danger flex-shrink-0" />
                      )}
                    </div>
                    <span className="text-[10px] text-slate-400 dark:text-slate-500 capitalize">
                      {visualType}
                    </span>
                  </div>
                  {hasChildren && (
                    <button
                      onClick={(e) => toggleCollapse(ln.id, e)}
                      className="w-5 h-5 rounded flex items-center justify-center hover:bg-slate-200/60 dark:hover:bg-slate-600/40 flex-shrink-0 mt-0.5 transition-colors"
                    >
                      {isCollapsed ? <ChevronRight size={12} className="text-slate-400" /> : <ChevronDown size={12} className="text-slate-400" />}
                    </button>
                  )}
                </div>

                {/* Department health summary (bridged from Workforce Gaps data) */}
                {visualType === 'department' && deptHealth && (
                  <div className="mt-1.5 flex items-center gap-2 text-[10px] text-slate-500 dark:text-slate-400">
                    <span className={cn('w-2 h-2 rounded-full', healthDot)} />
                    <span className="flex items-center gap-1">
                      <Users size={9} />
                      {deptHealth.empCount}
                    </span>
                    <span>{deptHealth.coverage}% covered</span>
                  </div>
                )}

                {/* Collapsed badge */}
                {isCollapsed && ln.childCount > 0 && (
                  <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 bg-action text-white text-[9px] font-bold rounded-full px-1.5 py-0.5 leading-none shadow-sm">
                    +{ln.childCount}
                  </div>
                )}
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>
    </div>
  );
}
