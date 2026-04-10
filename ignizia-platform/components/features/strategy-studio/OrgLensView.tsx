'use client';

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import type {
  PropagationGraph,
  PropagationNode,
  PropagationEdge,
} from '@/types/propagation';
import { RELATIONSHIP_LABELS } from '@/types/propagation';

// ---------------------------------------------------------------------------
// Node position map — fixed tier-based layout
// ---------------------------------------------------------------------------

interface NodePosition {
  x: number; // percentage of canvas width
  y: number; // percentage of canvas height
  tier: number;
}

const POSITION_MAP: Record<string, NodePosition> = {
  strategy:              { x: 50, y: 6,  tier: 0 },
  'pn-plant_manager':    { x: 50, y: 24, tier: 1 },
  'pn-operations_manager': { x: 28, y: 44, tier: 2 },
  'dn-quality_and_safety': { x: 72, y: 44, tier: 2 },
  'pn-line_manager':     { x: 22, y: 64, tier: 3 },
  'pn-hr_manager':       { x: 50, y: 64, tier: 3 },
  'pn-procurement':      { x: 78, y: 64, tier: 3 },
  'pn-leather_cutter':   { x: 50, y: 84, tier: 4 },
};

const DEPARTMENT_LABELS: Record<string, string> = {
  'pn-plant_manager': 'Production & Ops',
  'pn-operations_manager': 'Production & Ops',
  'pn-line_manager': 'Production & Ops',
  'pn-hr_manager': 'Workforce & HR',
  'pn-procurement': 'Procurement & Materials',
  'pn-leather_cutter': 'Production & Ops',
};

// ---------------------------------------------------------------------------
// State colors
// ---------------------------------------------------------------------------

const STATE_RING: Record<PropagationNode['state'], { ring: string; label: string; labelCls: string }> = {
  live:         { ring: 'ring-emerald-400',   label: 'Live',    labelCls: 'text-emerald-400' },
  ready:        { ring: 'ring-emerald-400/60', label: 'Ready',   labelCls: 'text-emerald-400/80' },
  blocked:      { ring: 'ring-red-400',        label: 'Blocked', labelCls: 'text-red-400' },
  unstable:     { ring: 'ring-amber-400',      label: 'Unstable', labelCls: 'text-amber-400' },
  simulated:    { ring: 'ring-blue-400',       label: 'Simulated', labelCls: 'text-blue-400' },
  not_assessed: { ring: 'ring-slate-500',      label: 'Waiting', labelCls: 'text-slate-500' },
};

const GATE_STATUS_COLORS: Record<string, string> = {
  passed: 'bg-emerald-500/15 text-emerald-400',
  pending: 'bg-amber-500/15 text-amber-400',
  blocked: 'bg-red-500/15 text-red-400',
  not_assessed: 'bg-slate-500/15 text-slate-400',
};

// ---------------------------------------------------------------------------
// Department promotion rule
// ---------------------------------------------------------------------------

function shouldPromoteDepartment(node: PropagationNode, allNodes: PropagationNode[]): boolean {
  if (node.type !== 'department') return false;
  if (node.state !== 'blocked' && node.state !== 'unstable') return false;
  const personaBlockerTexts = allNodes
    .filter((n) => n.type === 'persona')
    .flatMap((n) => n.blockers.map((b) => b.text));
  return node.blockers.some((b) => !personaBlockerTexts.includes(b.text));
}

// ---------------------------------------------------------------------------
// Edge color logic
// ---------------------------------------------------------------------------

const BLOCKED_EDGE_TYPES = new Set([
  'depends_on', 'is_blocked_by', 'requires_readiness_from', 'requires_training_from',
]);

function edgeColor(edge: PropagationEdge, nodeMap: Map<string, PropagationNode>): { stroke: string; dashed: boolean } {
  const source = nodeMap.get(edge.sourceId);
  const target = nodeMap.get(edge.targetId);
  const eitherBlocked = source?.state === 'blocked' || target?.state === 'blocked';
  if (eitherBlocked && BLOCKED_EDGE_TYPES.has(edge.relationship)) {
    return { stroke: 'rgba(248,113,113,0.6)', dashed: true };
  }
  const eitherLive = source?.state === 'live' || source?.state === 'ready'
    || target?.state === 'live' || target?.state === 'ready';
  if (eitherLive) return { stroke: 'rgba(255,255,255,0.18)', dashed: false };
  return { stroke: 'rgba(255,255,255,0.08)', dashed: false };
}

// ---------------------------------------------------------------------------
// SVG path builder (quadratic bezier)
// ---------------------------------------------------------------------------

function buildPath(
  x1: number, y1: number, x2: number, y2: number,
): string {
  const cx = (x1 + x2) / 2;
  const cy = (y1 + y2) / 2;
  const offsetY = Math.abs(y2 - y1) * 0.15;
  return `M ${x1} ${y1} Q ${cx} ${cy - offsetY} ${x2} ${y2}`;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

// ---------------------------------------------------------------------------
// CSS keyframes injected once
// ---------------------------------------------------------------------------

const OVERLAY_STYLES = `
@keyframes propBlockedPulse {
  0%, 100% { box-shadow: 0 0 0 0 rgba(248,113,113,0); }
  50% { box-shadow: 0 0 12px 4px rgba(248,113,113,0.25); }
}
@keyframes propEdgeDash {
  to { stroke-dashoffset: -20; }
}
.prop-blocked-pulse { animation: propBlockedPulse 2.4s ease-in-out infinite; }
.prop-edge-dash { animation: propEdgeDash 1.2s linear infinite; }
`;

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface PropagationOverlayProps {
  graph: PropagationGraph;
  strategyName: string;
  onClose: () => void;
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export default function PropagationOverlay({ graph, strategyName, onClose }: PropagationOverlayProps) {
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [hoveredNodeId, setHoveredNodeId] = useState<string | null>(null);
  const canvasRef = useRef<HTMLDivElement>(null);
  const graphLayerRef = useRef<HTMLDivElement>(null);
  const strategyNodeRef = useRef<HTMLDivElement>(null);
  const nodeIconRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const [canvasSize, setCanvasSize] = useState({ width: 0, height: 0 });
  const [anchors, setAnchors] = useState<Record<string, { x: number; y: number }>>({});

  const nodeMap = useMemo(() => {
    const m = new Map<string, PropagationNode>();
    for (const n of graph.nodes) m.set(n.id, n);
    return m;
  }, [graph.nodes]);

  const visibleNodes = useMemo(() => {
    const personas = graph.nodes.filter((n) => n.type === 'persona');
    const promotedDepts = graph.nodes.filter((n) => shouldPromoteDepartment(n, graph.nodes));
    return [...personas, ...promotedDepts];
  }, [graph.nodes]);

  const visibleNodeIds = useMemo(() => new Set(visibleNodes.map((n) => n.id)), [visibleNodes]);

  const visibleEdges = useMemo(
    () => graph.edges.filter((e) => visibleNodeIds.has(e.sourceId) && visibleNodeIds.has(e.targetId)),
    [graph.edges, visibleNodeIds],
  );

  const selectedNode = useMemo(
    () => (selectedNodeId ? nodeMap.get(selectedNodeId) ?? null : null),
    [selectedNodeId, nodeMap],
  );

  const selectedEdges = useMemo(() => {
    if (!selectedNodeId) return [];
    return visibleEdges.filter((e) => e.sourceId === selectedNodeId || e.targetId === selectedNodeId);
  }, [visibleEdges, selectedNodeId]);

  const selectedDownstreamEdges = useMemo(() => {
    if (!selectedNodeId) return [];
    return visibleEdges.filter((e) => e.sourceId === selectedNodeId);
  }, [visibleEdges, selectedNodeId]);

  const connectedToSelected = useMemo(() => {
    if (!selectedNodeId) return new Set<string>();
    const ids = new Set<string>();
    ids.add(selectedNodeId);
    for (const e of selectedDownstreamEdges) {
      ids.add(e.sourceId);
      ids.add(e.targetId);
    }
    return ids;
  }, [selectedNodeId, selectedDownstreamEdges]);

  const hoveredDownstreamEdges = useMemo(() => {
    if (!hoveredNodeId || selectedNodeId) return [];
    return visibleEdges.filter((e) => e.sourceId === hoveredNodeId);
  }, [hoveredNodeId, selectedNodeId, visibleEdges]);

  const connectedToHovered = useMemo(() => {
    if (!hoveredNodeId) return new Set<string>();
    const ids = new Set<string>();
    ids.add(hoveredNodeId);
    for (const e of hoveredDownstreamEdges) {
      ids.add(e.sourceId);
      ids.add(e.targetId);
    }
    return ids;
  }, [hoveredNodeId, hoveredDownstreamEdges]);

  const selectedLabelRanks = useMemo(() => {
    if (!selectedNodeId) return new Map<string, { index: number; total: number }>();
    const connected = selectedDownstreamEdges
      .sort((a, b) => a.id.localeCompare(b.id));
    const out = new Map<string, { index: number; total: number }>();
    connected.forEach((e, index) => out.set(e.id, { index, total: connected.length }));
    return out;
  }, [selectedNodeId, selectedDownstreamEdges]);

  const hoveredLabelRanks = useMemo(() => {
    if (!hoveredNodeId || selectedNodeId) return new Map<string, { index: number; total: number }>();
    const connected = hoveredDownstreamEdges
      .sort((a, b) => a.id.localeCompare(b.id));
    const out = new Map<string, { index: number; total: number }>();
    connected.forEach((e, index) => out.set(e.id, { index, total: connected.length }));
    return out;
  }, [hoveredNodeId, selectedNodeId, hoveredDownstreamEdges]);

  // Escape handler
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (e.key === 'Escape') {
      if (selectedNodeId) setSelectedNodeId(null);
      else onClose();
    }
  }, [selectedNodeId, onClose]);

  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  // Inject styles
  useEffect(() => {
    const id = 'prop-overlay-styles';
    if (document.getElementById(id)) return;
    const style = document.createElement('style');
    style.id = id;
    style.textContent = OVERLAY_STYLES;
    document.head.appendChild(style);
  }, []);

  // Track canvas size for zoom pan calculations.
  useEffect(() => {
    const measure = () => {
      const el = canvasRef.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      setCanvasSize({ width: rect.width, height: rect.height });
    };
    measure();
    window.addEventListener('resize', measure);
    return () => window.removeEventListener('resize', measure);
  }, []);

  // Measure anchors in graph-layer coordinates so zoom transforms do not desync lines.
  useEffect(() => {
    const measureAnchors = () => {
      const layerEl = graphLayerRef.current;
      if (!layerEl) return;
      const layerRect = layerEl.getBoundingClientRect();
      if (layerRect.width === 0 || layerRect.height === 0) return;

      const next: Record<string, { x: number; y: number }> = {};

      const strategyRect = strategyNodeRef.current?.getBoundingClientRect();
      if (strategyRect) {
        next.strategy = {
          x: ((strategyRect.left + strategyRect.width / 2 - layerRect.left) / layerRect.width) * 100,
          y: ((strategyRect.top + strategyRect.height / 2 - layerRect.top) / layerRect.height) * 100,
        };
      }

      for (const n of visibleNodes) {
        const iconRect = nodeIconRefs.current[n.id]?.getBoundingClientRect();
        if (!iconRect) continue;
        next[n.id] = {
          x: ((iconRect.left + iconRect.width / 2 - layerRect.left) / layerRect.width) * 100,
          y: ((iconRect.top + iconRect.height / 2 - layerRect.top) / layerRect.height) * 100,
        };
      }
      setAnchors(next);
    };

    const raf = requestAnimationFrame(measureAnchors);
    const t = window.setTimeout(measureAnchors, 120);
    window.addEventListener('resize', measureAnchors);
    return () => {
      cancelAnimationFrame(raf);
      window.clearTimeout(t);
      window.removeEventListener('resize', measureAnchors);
    };
  }, [visibleNodes]);

  const camera = useMemo(() => {
    if (!selectedNode) return { x: 0, y: 0, scale: 1 };
    const pos = POSITION_MAP[selectedNode.id];
    if (!pos || canvasSize.width === 0 || canvasSize.height === 0) return { x: 0, y: 0, scale: 1 };

    const nodeX = (pos.x / 100) * canvasSize.width;
    const nodeY = (pos.y / 100) * canvasSize.height;
    const targetX = canvasSize.width * 0.5;
    const targetY = canvasSize.height * 0.42;

    const rawX = targetX - nodeX;
    const rawY = targetY - nodeY;

    return {
      x: clamp(rawX, -canvasSize.width * 0.2, canvasSize.width * 0.2),
      y: clamp(rawY, -canvasSize.height * 0.15, canvasSize.height * 0.15),
      scale: 1.12,
    };
  }, [selectedNode, canvasSize]);

  return (
    <motion.div
      key="prop-overlay"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.4 }}
      className="fixed inset-0 z-50 flex items-center justify-center"
    >
      {/* Backdrop */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.35 }}
        className="absolute inset-0 bg-slate-950/90 backdrop-blur-md"
        onClick={() => { if (selectedNodeId) setSelectedNodeId(null); else onClose(); }}
      />

      {/* Close button */}
      <motion.button
        type="button"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.3 }}
        onClick={onClose}
        className="absolute top-6 right-6 z-[60] p-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-white/50 hover:text-white transition-all"
      >
        <span className="material-icons-round text-xl">close</span>
      </motion.button>

      {/* Title */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.15, duration: 0.4 }}
        className="absolute top-6 left-8 z-[55]"
      >
        <p className="text-[10px] uppercase tracking-[0.25em] text-white/30 font-medium mb-1">Strategy Propagation</p>
        <h2 className="text-lg font-bold text-white/90 tracking-tight">{strategyName}</h2>
      </motion.div>

      {/* Graph canvas */}
      <div ref={canvasRef} className="relative w-full max-w-4xl mx-auto" style={{ height: '80vh', maxHeight: 700 }}>
        <motion.div
          ref={graphLayerRef}
          className="absolute inset-0"
          animate={{ x: camera.x, y: camera.y, scale: camera.scale }}
          transition={{ type: 'spring', stiffness: 170, damping: 26 }}
        >
          {/* SVG edges */}
          <svg className="absolute inset-0 w-full h-full pointer-events-none" viewBox="0 0 100 100" preserveAspectRatio="none">
            <defs>
              <radialGradient id="strategyGlow">
                <stop offset="0%" stopColor="rgba(255,255,255,0.06)" />
                <stop offset="100%" stopColor="transparent" />
              </radialGradient>
            </defs>
            <circle cx={POSITION_MAP.strategy.x} cy={POSITION_MAP.strategy.y} r="12" fill="url(#strategyGlow)" />

            {/* Strategy-to-PlantManager connector */}
            <motion.path
              d={buildPath(
                anchors.strategy?.x ?? POSITION_MAP.strategy.x,
                (anchors.strategy?.y ?? POSITION_MAP.strategy.y) + 2.4,
                anchors['pn-plant_manager']?.x ?? POSITION_MAP['pn-plant_manager'].x,
                (anchors['pn-plant_manager']?.y ?? POSITION_MAP['pn-plant_manager'].y) - 2.2,
              )}
              fill="none"
              stroke="rgba(255,255,255,0.15)"
              strokeWidth={0.2}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.55, duration: 0.35 }}
            />

            {visibleEdges.map((edge) => {
              const srcPos = anchors[edge.sourceId] ?? POSITION_MAP[edge.sourceId];
              const tgtPos = anchors[edge.targetId] ?? POSITION_MAP[edge.targetId];
              if (!srcPos || !tgtPos) return null;

              const { stroke, dashed } = edgeColor(edge, nodeMap);
              const isConnectedToSelection = selectedNodeId && edge.sourceId === selectedNodeId;
              const isConnectedToHover = !selectedNodeId && hoveredNodeId && edge.sourceId === hoveredNodeId;
              const dimmed = (selectedNodeId && !isConnectedToSelection) || (hoveredNodeId && !selectedNodeId && !isConnectedToHover);

              const finalStroke = isConnectedToSelection
                ? stroke.replace(/[\d.]+\)$/, '0.8)')
                : isConnectedToHover
                  ? stroke.replace(/[\d.]+\)$/, '0.5)')
                  : stroke;

              const x1 = srcPos.x;
              const y1 = srcPos.y;
              const x2 = tgtPos.x;
              const y2 = tgtPos.y;

              const mx = (x1 + x2) / 2;
              const my = (y1 + y2) / 2 - Math.abs(y2 - y1) * 0.075;
              const rank = isConnectedToSelection
                ? selectedLabelRanks.get(edge.id)
                : isConnectedToHover
                  ? hoveredLabelRanks.get(edge.id)
                  : undefined;
              const centeredIndex = rank ? rank.index - (rank.total - 1) / 2 : 0;
              const dx = x2 - x1;
              const dy = y2 - y1;
              const length = Math.max(Math.hypot(dx, dy), 0.001);
              const nx = dy / length;
              const ny = -dx / length;
              const labelSpread = 1.2;
              const lx = mx + nx * centeredIndex * labelSpread;
              const ly = my + ny * centeredIndex * labelSpread;

              return (
                <g key={edge.id}>
                  <motion.path
                    d={buildPath(x1, y1, x2, y2)}
                    fill="none"
                    stroke={finalStroke}
                    strokeWidth={isConnectedToSelection ? 0.32 : 0.22}
                    strokeDasharray={dashed ? '1 0.7' : undefined}
                    className={dashed ? 'prop-edge-dash' : undefined}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: dimmed ? 0.15 : 1 }}
                    transition={{ delay: 0.55, duration: 0.35 }}
                  />
                  {(isConnectedToHover || isConnectedToSelection) && (
                    <text x={lx} y={ly} textAnchor="middle" className="fill-white/60 text-[1.1px] font-medium">
                      {RELATIONSHIP_LABELS[edge.relationship]}
                    </text>
                  )}
                </g>
              );
            })}
          </svg>

          {/* Strategy node */}
          <motion.div
            initial={{ opacity: 0, scale: 0.5 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            transition={{ type: 'spring', stiffness: 200, damping: 24, delay: 0.1 }}
            className="absolute -translate-x-1/2 -translate-y-1/2 z-10"
            style={{ left: '50%', top: '6%' }}
          >
            <div ref={strategyNodeRef} className="px-6 py-3 rounded-2xl bg-white/10 backdrop-blur-sm border border-white/10 text-center">
              <p className="text-sm font-bold text-white tracking-tight">{strategyName}</p>
            </div>
          </motion.div>

          {/* Persona + promoted department nodes */}
          {visibleNodes.map((node) => {
            const pos = POSITION_MAP[node.id];
            if (!pos) return null;

            const sc = STATE_RING[node.state];
            const isSelected = selectedNodeId === node.id;
            const isHovered = hoveredNodeId === node.id;
            const isPromotedDept = node.type === 'department';
            const deptLabel = !isPromotedDept ? DEPARTMENT_LABELS[node.id] : undefined;

            let dimOpacity = 1;
            if (selectedNodeId && !isSelected && !connectedToSelected.has(node.id)) dimOpacity = 0.3;
            else if (hoveredNodeId && !selectedNodeId && !isHovered && !connectedToHovered.has(node.id)) dimOpacity = 0.5;

            return (
              <motion.div
                key={node.id}
                initial={{ opacity: 0, scale: 0.7, y: 20 }}
                animate={{ opacity: dimOpacity, scale: isSelected ? 1.08 : isHovered ? 1.05 : 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.9 }}
                transition={{ type: 'spring', stiffness: 200, damping: 24, delay: 0.1 + pos.tier * 0.1 }}
                className="absolute -translate-x-1/2 -translate-y-1/2 z-10 cursor-pointer select-none"
                style={{ left: `${pos.x}%`, top: `${pos.y}%` }}
                onClick={(e) => { e.stopPropagation(); setSelectedNodeId(isSelected ? null : node.id); }}
                onMouseEnter={() => setHoveredNodeId(node.id)}
                onMouseLeave={() => setHoveredNodeId(null)}
              >
                <div className="flex flex-col items-center gap-1.5">
                  {/* Icon circle */}
                  <div ref={(el) => { nodeIconRefs.current[node.id] = el; }} className={`relative w-12 h-12 rounded-full flex items-center justify-center ring-2 transition-all duration-200 ${
                    isSelected ? 'ring-white bg-white/15 shadow-lg shadow-white/10' : `${sc.ring} bg-white/5`
                  } ${node.state === 'blocked' ? 'prop-blocked-pulse' : ''} ${isPromotedDept ? 'border border-dashed border-white/20' : ''}`}>
                    <span className={`material-icons-round text-xl ${
                      node.state === 'blocked' ? 'text-red-400' :
                      node.state === 'live' || node.state === 'ready' ? 'text-emerald-400' :
                      'text-slate-400'
                    }`}>{node.icon}</span>
                  </div>
                  {/* Name */}
                  <p className="text-[11px] font-semibold text-white text-center leading-tight max-w-[100px]">{node.label}</p>
                  {/* State */}
                  <span className={`text-[9px] font-semibold uppercase tracking-wide ${sc.labelCls}`}>{sc.label}</span>
                  {/* Department context (non-promoted personas only) */}
                  {deptLabel && <span className="text-[8px] text-white/25 font-medium">{deptLabel}</span>}
                  {/* Promoted dept accent */}
                  {isPromotedDept && <span className="text-[8px] text-white/30 font-medium flex items-center gap-0.5"><span className="material-icons-round text-[9px]">shield</span>Gate</span>}
                  {/* Blocker badge */}
                  {node.blockers.length > 0 && !isPromotedDept && (
                    <div className="absolute -top-0.5 -right-0.5 w-3.5 h-3.5 rounded-full bg-red-500 flex items-center justify-center">
                      <span className="text-white text-[7px] font-black">!</span>
                    </div>
                  )}
                </div>
              </motion.div>
            );
          })}
        </motion.div>
      </div>

      {/* Evidence drawer */}
      <AnimatePresence>
        {selectedNode && (
          <EvidenceDrawer
            node={selectedNode}
            edges={selectedEdges}
            allNodes={graph.nodes}
            onClose={() => setSelectedNodeId(null)}
          />
        )}
      </AnimatePresence>
    </motion.div>
  );
}

// ---------------------------------------------------------------------------
// Evidence Drawer
// ---------------------------------------------------------------------------

function EvidenceDrawer({
  node,
  edges,
  allNodes,
  onClose,
}: {
  node: PropagationNode;
  edges: PropagationEdge[];
  allNodes: PropagationNode[];
  onClose: () => void;
}) {
  const sc = STATE_RING[node.state];
  const upstreamEdges = edges.filter((e) => e.targetId === node.id);
  const downstreamEdges = edges.filter((e) => e.sourceId === node.id);

  return (
    <motion.div
      key="evidence-drawer"
      initial={{ x: 400, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      exit={{ x: 400, opacity: 0 }}
      transition={{ type: 'spring', stiffness: 260, damping: 30 }}
      className="fixed right-0 top-0 bottom-0 w-[380px] z-[60] bg-slate-900/95 backdrop-blur-xl border-l border-white/10 overflow-hidden flex flex-col"
    >
      {/* Header */}
      <div className="px-6 py-5 border-b border-white/5 shrink-0">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="flex items-center gap-2.5 mb-2">
              <div className={`w-9 h-9 rounded-full flex items-center justify-center ring-2 ${sc.ring} bg-white/5`}>
                <span className={`material-icons-round text-lg ${
                  node.state === 'blocked' ? 'text-red-400' :
                  node.state === 'live' || node.state === 'ready' ? 'text-emerald-400' :
                  'text-slate-400'
                }`}>{node.icon}</span>
              </div>
              <div>
                <h4 className="text-sm font-bold text-white">{node.label}</h4>
                <span className={`text-[10px] font-semibold uppercase tracking-wide ${sc.labelCls}`}>{sc.label}</span>
              </div>
            </div>
          </div>
          <button type="button" onClick={onClose} className="p-1.5 rounded-lg hover:bg-white/10 text-white/40 hover:text-white transition-colors">
            <span className="material-icons-round text-base">close</span>
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto px-6 py-5 space-y-6">
        {/* Why linked */}
        <Section title="Why linked">
          <p className="text-xs text-white/70 leading-relaxed">{node.strategyRelevance}</p>
        </Section>

        {/* Upstream */}
        {upstreamEdges.length > 0 && (
          <Section title="Upstream">
            <div className="space-y-1.5">
              {upstreamEdges.map((e) => {
                const source = allNodes.find((n) => n.id === e.sourceId);
                return (
                  <div key={e.id} className="flex items-center gap-2 text-xs">
                    <span className="material-icons-round text-sm text-white/30">{source?.icon ?? 'circle'}</span>
                    <span className="text-white/80">{source?.label ?? 'Unknown'}</span>
                    <span className="px-1.5 py-0.5 rounded-full bg-white/8 text-white/50 text-[9px] font-medium">{RELATIONSHIP_LABELS[e.relationship]}</span>
                  </div>
                );
              })}
            </div>
          </Section>
        )}

        {/* Downstream */}
        {downstreamEdges.length > 0 && (
          <Section title="Downstream">
            <div className="space-y-1.5">
              {downstreamEdges.map((e) => {
                const target = allNodes.find((n) => n.id === e.targetId);
                return (
                  <div key={e.id} className="flex items-center gap-2 text-xs">
                    <span className="material-icons-round text-sm text-white/30">{target?.icon ?? 'circle'}</span>
                    <span className="text-white/80">{target?.label ?? 'Unknown'}</span>
                    <span className="px-1.5 py-0.5 rounded-full bg-white/8 text-white/50 text-[9px] font-medium">{RELATIONSHIP_LABELS[e.relationship]}</span>
                  </div>
                );
              })}
            </div>
          </Section>
        )}

        {/* Readiness */}
        <Section title="Readiness">
          <div className="grid grid-cols-2 gap-2.5">
            <ReadinessItem label="Approved" value={node.readiness.approved} icon="check_circle" />
            <ReadinessItem label="Trained" value={node.readiness.trained} icon="school" />
            <ReadinessItem label="Equipped" value={node.readiness.equipped} icon="build" />
            <div className="flex items-center gap-1.5">
              <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded ${GATE_STATUS_COLORS[node.readiness.complianceStatus]}`}>
                {node.readiness.complianceStatus.replace('_', ' ')}
              </span>
            </div>
          </div>
          <div className="mt-3">
            <div className="flex items-center justify-between text-[10px] text-white/40 mb-1">
              <span>Training coverage</span>
              <span className="font-semibold text-white/70">{node.readiness.trainingCoverage}%</span>
            </div>
            <div className="w-full h-1.5 rounded-full bg-white/10 overflow-hidden">
              <div
                className={`h-full rounded-full transition-all ${
                  node.readiness.trainingCoverage >= 80 ? 'bg-emerald-400' : node.readiness.trainingCoverage >= 50 ? 'bg-amber-400' : 'bg-red-400'
                }`}
                style={{ width: `${node.readiness.trainingCoverage}%` }}
              />
            </div>
          </div>
        </Section>

        {/* Governance gates */}
        {node.gates.length > 0 && (
          <Section title="Governance gates">
            <div className="space-y-2">
              {node.gates.map((gate) => (
                <div key={gate.id} className="flex items-center justify-between py-1.5">
                  <div className="flex items-center gap-2 text-xs">
                    <span className="material-icons-round text-sm text-white/30">
                      {gate.type === 'compliance' ? 'gavel' : gate.type === 'approval' ? 'how_to_reg' : 'verified'}
                    </span>
                    <span className="text-white/80">{gate.name}</span>
                  </div>
                  <span className={`px-1.5 py-0.5 rounded text-[10px] font-semibold ${GATE_STATUS_COLORS[gate.status]}`}>
                    {gate.status.replace('_', ' ')}
                  </span>
                </div>
              ))}
            </div>
          </Section>
        )}

        {/* Projected vs actual */}
        {(node.projectedImpact || node.actualImpact) && (
          <Section title="Projected vs actual">
            <div className="space-y-2">
              {(['throughputDelta', 'defectDelta', 'costDelta'] as const).map((key) => {
                const projected = node.projectedImpact?.[key] ?? null;
                const actual = node.actualImpact?.[key] ?? null;
                const label = key === 'throughputDelta' ? 'Throughput' : key === 'defectDelta' ? 'Defects' : 'Cost';
                const delta = projected !== null && actual !== null ? actual - projected : null;
                return (
                  <div key={key} className="flex items-center justify-between text-xs">
                    <span className="text-white/40">{label}</span>
                    <div className="flex items-center gap-2.5">
                      {projected !== null && <span className="text-white/30">{projected > 0 ? '+' : ''}{projected}%</span>}
                      {actual !== null && <span className="font-semibold text-white/80">{actual > 0 ? '+' : ''}{actual}%</span>}
                      {delta !== null && (
                        <span className={`px-1 py-0.5 rounded text-[9px] font-semibold ${
                          Math.abs(delta) < 2 ? 'bg-emerald-500/15 text-emerald-400' : delta < 0 ? 'bg-red-500/15 text-red-400' : 'bg-amber-500/15 text-amber-400'
                        }`}>
                          {delta >= 0 ? '+' : ''}{delta}%
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </Section>
        )}

        {/* Blockers */}
        {node.blockers.length > 0 && (
          <Section title="Blockers">
            <div className="space-y-1.5">
              {node.blockers.map((b) => (
                <div key={b.text} className={`flex items-start gap-2 text-xs px-3 py-2 rounded-lg ${b.escalated ? 'bg-amber-500/10 text-amber-400' : 'bg-red-500/10 text-red-400'}`}>
                  <span className="material-icons-round text-sm mt-0.5 shrink-0">{b.escalated ? 'escalator_warning' : 'block'}</span>
                  <span className="flex-1 leading-relaxed">{b.text}</span>
                </div>
              ))}
            </div>
          </Section>
        )}

        {/* Next decision */}
        {node.nextDecision && (
          <Section title="Next decision">
            <p className="text-xs text-white/70 leading-relaxed">{node.nextDecision}</p>
          </Section>
        )}

        {/* Cross-studio drilldowns */}
        <Section title="Explore further">
          <div className="flex flex-wrap gap-1.5">
            <DrilldownChip icon="science" label="Twin Playground" />
            <DrilldownChip icon="groups" label="Talent View" />
            <DrilldownChip icon="schema" label="Workflow Design" />
            <DrilldownChip icon="monitoring" label="Live Execution" />
          </div>
        </Section>
      </div>
    </motion.div>
  );
}

// ---------------------------------------------------------------------------
// Small helpers
// ---------------------------------------------------------------------------

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="text-[9px] uppercase tracking-[0.22em] text-white/30 font-medium mb-2">{title}</p>
      {children}
    </div>
  );
}

function ReadinessItem({ label, value, icon }: { label: string; value: boolean; icon: string }) {
  return (
    <div className="flex items-center gap-1.5 text-xs">
      <span className={`material-icons-round text-sm ${value ? 'text-emerald-400' : 'text-white/20'}`}>{icon}</span>
      <span className={value ? 'text-white/80' : 'text-white/30'}>{label}</span>
    </div>
  );
}

function DrilldownChip({ icon, label }: { icon: string; label: string }) {
  return (
    <button type="button" className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[10px] font-medium bg-white/5 text-white/50 hover:bg-white/10 hover:text-white/80 transition-all border border-white/5">
      <span className="material-icons-round text-xs">{icon}</span>
      {label}
    </button>
  );
}
