/**
 * Workflow Analytics - Bottleneck & Responsibility Intelligence
 * 
 * Passive analytics feature that computes derived insights from workflow structure.
 * Does not modify workflow behavior, execution, or approval logic.
 */

import { Workflow, WorkflowNode, WorkflowEdge, UserRole } from '@/types';

// ============================================================================
// Type Definitions
// ============================================================================

export interface PersonBottleneck {
  person: UserRole;
  executionTaskCount: number;
  approvalTaskCount: number;
  totalTouchpoints: number;
  directBlockingCount: number;
  downstreamImpact: number;
  maxChainDepth: number;
}

export interface NodeResponsibility {
  nodeId: string;
  nodeName: string;
  dependencies: string[]; // upstream node IDs
  assignee: UserRole | null;
  approver: UserRole | null;
  blockedBy: UserRole[]; // all people from upstream nodes blocking this node
  blocksNodes: string[]; // downstream node IDs
}

export interface StructuralRiskSummary {
  mostCriticalBottleneck: {
    person: UserRole;
    downstreamImpact: number;
  } | null;
  longestApprovalChain: {
    length: number;
    path: string[]; // node IDs
  };
  singlePointsOfFailure: Array<{
    person: UserRole;
    pathCoverage: number; // percentage of paths they appear in
  }>;
  totalApprovalLayers: number;
}

export interface WorkflowAnalytics {
  personBottlenecks: PersonBottleneck[];
  nodeResponsibilities: NodeResponsibility[];
  structuralRisk: StructuralRiskSummary;
}

// ============================================================================
// Core Analytics Computation
// ============================================================================

/**
 * Compute all analytics for a workflow
 */
export function computeWorkflowAnalytics(workflow: Workflow): WorkflowAnalytics {
  const graph = buildDependencyGraph(workflow);
  const personBottlenecks = computePersonBottlenecks(workflow, graph);
  const nodeResponsibilities = computeNodeResponsibilities(workflow, graph);
  const structuralRisk = computeStructuralRisk(workflow, graph, personBottlenecks);

  return {
    personBottlenecks,
    nodeResponsibilities,
    structuralRisk,
  };
}

// ============================================================================
// Graph Construction
// ============================================================================

interface DependencyGraph {
  nodes: Map<string, WorkflowNode>;
  edges: Map<string, string[]>; // nodeId -> downstream nodeIds
  reverseEdges: Map<string, string[]>; // nodeId -> upstream nodeIds
  nodesByPerson: Map<UserRole, Set<string>>; // person -> nodeIds they touch
}

function buildDependencyGraph(workflow: Workflow): DependencyGraph {
  const nodes = new Map<string, WorkflowNode>();
  const edges = new Map<string, string[]>();
  const reverseEdges = new Map<string, string[]>();
  const nodesByPerson = new Map<UserRole, Set<string>>();

  // Index nodes
  workflow.nodes.forEach((node) => {
    nodes.set(node.id, node);
    edges.set(node.id, []);
    reverseEdges.set(node.id, []);

    // Track person involvement
    const assignees = node.meta?.assignedTo || [];
    const approvers = node.meta?.approver || [];
    [...assignees, ...approvers].forEach((person) => {
      if (!nodesByPerson.has(person)) {
        nodesByPerson.set(person, new Set());
      }
      nodesByPerson.get(person)!.add(node.id);
    });
  });

  // Build edge maps
  workflow.edges.forEach((edge) => {
    const downstream = edges.get(edge.startNodeId) || [];
    downstream.push(edge.endNodeId);
    edges.set(edge.startNodeId, downstream);

    const upstream = reverseEdges.get(edge.endNodeId) || [];
    upstream.push(edge.startNodeId);
    reverseEdges.set(edge.endNodeId, upstream);
  });

  return { nodes, edges, reverseEdges, nodesByPerson };
}

// ============================================================================
// Person Bottleneck Analytics
// ============================================================================

function computePersonBottlenecks(
  workflow: Workflow,
  graph: DependencyGraph
): PersonBottleneck[] {
  const people = new Set<UserRole>();
  
  // Collect all people involved
  workflow.nodes.forEach((node) => {
    (node.meta?.assignedTo || []).forEach((p) => people.add(p));
    (node.meta?.approver || []).forEach((p) => people.add(p));
  });

  const bottlenecks: PersonBottleneck[] = [];

  people.forEach((person) => {
    const executionTasks = new Set<string>();
    const approvalTasks = new Set<string>();

    workflow.nodes.forEach((node) => {
      if (node.meta?.assignedTo?.includes(person)) {
        executionTasks.add(node.id);
      }
      if (node.meta?.approver?.includes(person)) {
        approvalTasks.add(node.id);
      }
    });

    const touchedNodes = new Set([...executionTasks, ...approvalTasks]);
    const directBlockingCount = computeDirectBlocking(person, graph);
    const downstreamImpact = computeDownstreamImpact(touchedNodes, graph);
    const maxChainDepth = computeMaxChainDepth(touchedNodes, graph);

    bottlenecks.push({
      person,
      executionTaskCount: executionTasks.size,
      approvalTaskCount: approvalTasks.size,
      totalTouchpoints: touchedNodes.size,
      directBlockingCount,
      downstreamImpact,
      maxChainDepth,
    });
  });

  // Sort by downstream impact (desc), then approval count (desc)
  bottlenecks.sort((a, b) => {
    if (b.downstreamImpact !== a.downstreamImpact) {
      return b.downstreamImpact - a.downstreamImpact;
    }
    return b.approvalTaskCount - a.approvalTaskCount;
  });

  return bottlenecks;
}

function computeDirectBlocking(person: UserRole, graph: DependencyGraph): number {
  const personNodes = graph.nodesByPerson.get(person) || new Set();
  let blockingCount = 0;

  personNodes.forEach((nodeId) => {
    const downstream = graph.edges.get(nodeId) || [];
    blockingCount += downstream.length;
  });

  return blockingCount;
}

function computeDownstreamImpact(
  touchedNodes: Set<string>,
  graph: DependencyGraph
): number {
  const allDownstream = new Set<string>();

  // For each touched node, traverse downstream and collect all reachable nodes
  touchedNodes.forEach((nodeId) => {
    traverseDownstream(nodeId, graph, allDownstream);
  });

  // Remove the original touched nodes from the count
  touchedNodes.forEach((nodeId) => allDownstream.delete(nodeId));

  return allDownstream.size;
}

function traverseDownstream(
  nodeId: string,
  graph: DependencyGraph,
  visited: Set<string>
): void {
  const downstream = graph.edges.get(nodeId) || [];
  
  downstream.forEach((childId) => {
    if (!visited.has(childId)) {
      visited.add(childId);
      traverseDownstream(childId, graph, visited);
    }
  });
}

function computeMaxChainDepth(
  touchedNodes: Set<string>,
  graph: DependencyGraph
): number {
  let maxDepth = 0;

  touchedNodes.forEach((nodeId) => {
    const depth = computeNodeDepth(nodeId, graph, new Set());
    maxDepth = Math.max(maxDepth, depth);
  });

  return maxDepth;
}

function computeNodeDepth(
  nodeId: string,
  graph: DependencyGraph,
  visiting: Set<string>
): number {
  // Cycle detection
  if (visiting.has(nodeId)) {
    return 0;
  }

  visiting.add(nodeId);
  const downstream = graph.edges.get(nodeId) || [];
  
  if (downstream.length === 0) {
    visiting.delete(nodeId);
    return 1;
  }

  let maxChildDepth = 0;
  downstream.forEach((childId) => {
    const childDepth = computeNodeDepth(childId, graph, visiting);
    maxChildDepth = Math.max(maxChildDepth, childDepth);
  });

  visiting.delete(nodeId);
  return 1 + maxChildDepth;
}

// ============================================================================
// Node Responsibility Analytics
// ============================================================================

function computeNodeResponsibilities(
  workflow: Workflow,
  graph: DependencyGraph
): NodeResponsibility[] {
  return workflow.nodes.map((node) => {
    const dependencies = graph.reverseEdges.get(node.id) || [];
    const blocksNodes = graph.edges.get(node.id) || [];

    const assignee = node.meta?.assignedTo?.[0] || null;
    const approver = node.meta?.approver?.[0] || null;
    
    // Get all people from upstream nodes (both assignees and approvers)
    const blockedBy: UserRole[] = [];
    dependencies.forEach((upstreamId) => {
      const upstreamNode = graph.nodes.get(upstreamId);
      if (upstreamNode?.meta?.approver) {
        blockedBy.push(...upstreamNode.meta.approver);
      }
      if (upstreamNode?.meta?.assignedTo) {
        blockedBy.push(...upstreamNode.meta.assignedTo);
      }
    });
    // Remove duplicates
    const uniqueBlockedBy = Array.from(new Set(blockedBy));

    return {
      nodeId: node.id,
      nodeName: node.name,
      dependencies,
      assignee,
      approver,
      blockedBy: uniqueBlockedBy,
      blocksNodes,
    };
  });
}

// ============================================================================
// Structural Risk Analytics
// ============================================================================

function computeStructuralRisk(
  workflow: Workflow,
  graph: DependencyGraph,
  personBottlenecks: PersonBottleneck[]
): StructuralRiskSummary {
  const mostCriticalBottleneck = personBottlenecks.length > 0
    ? {
        person: personBottlenecks[0].person,
        downstreamImpact: personBottlenecks[0].downstreamImpact,
      }
    : null;

  const longestApprovalChain = computeLongestApprovalChain(workflow, graph);
  const singlePointsOfFailure = computeSinglePointsOfFailure(workflow, graph, personBottlenecks);
  const totalApprovalLayers = computeTotalApprovalLayers(workflow, graph);

  return {
    mostCriticalBottleneck,
    longestApprovalChain,
    singlePointsOfFailure,
    totalApprovalLayers,
  };
}

function computeLongestApprovalChain(
  workflow: Workflow,
  graph: DependencyGraph
): { length: number; path: string[] } {
  let longestPath: string[] = [];
  let maxLength = 0;

  // Find all root nodes (no dependencies)
  const rootNodes = workflow.nodes.filter(
    (node) => (graph.reverseEdges.get(node.id) || []).length === 0
  );

  rootNodes.forEach((root) => {
    const path = findLongestPath(root.id, graph, new Set());
    if (path.length > maxLength) {
      maxLength = path.length;
      longestPath = path;
    }
  });

  // Filter to only approval nodes
  const approvalPath = longestPath.filter((nodeId) => {
    const node = graph.nodes.get(nodeId);
    return node?.meta?.approver && node.meta.approver.length > 0;
  });

  return {
    length: approvalPath.length,
    path: approvalPath,
  };
}

function findLongestPath(
  nodeId: string,
  graph: DependencyGraph,
  visiting: Set<string>
): string[] {
  if (visiting.has(nodeId)) {
    return [];
  }

  visiting.add(nodeId);
  const downstream = graph.edges.get(nodeId) || [];

  if (downstream.length === 0) {
    visiting.delete(nodeId);
    return [nodeId];
  }

  let longestChildPath: string[] = [];
  downstream.forEach((childId) => {
    const childPath = findLongestPath(childId, graph, visiting);
    if (childPath.length > longestChildPath.length) {
      longestChildPath = childPath;
    }
  });

  visiting.delete(nodeId);
  return [nodeId, ...longestChildPath];
}

function computeSinglePointsOfFailure(
  workflow: Workflow,
  graph: DependencyGraph,
  personBottlenecks: PersonBottleneck[]
): Array<{ person: UserRole; pathCoverage: number }> {
  const THRESHOLD = 0.5; // 50% threshold for single point of failure
  const totalNodes = workflow.nodes.length;

  return personBottlenecks
    .filter((bottleneck) => {
      const coverage = bottleneck.totalTouchpoints / totalNodes;
      return coverage >= THRESHOLD;
    })
    .map((bottleneck) => ({
      person: bottleneck.person,
      pathCoverage: (bottleneck.totalTouchpoints / totalNodes) * 100,
    }));
}

function computeTotalApprovalLayers(
  workflow: Workflow,
  graph: DependencyGraph
): number {
  // Find the longest sequential chain of nodes with approvers
  let maxLayers = 0;

  const rootNodes = workflow.nodes.filter(
    (node) => (graph.reverseEdges.get(node.id) || []).length === 0
  );

  rootNodes.forEach((root) => {
    const layers = countApprovalLayers(root.id, graph, new Set());
    maxLayers = Math.max(maxLayers, layers);
  });

  return maxLayers;
}

function countApprovalLayers(
  nodeId: string,
  graph: DependencyGraph,
  visiting: Set<string>
): number {
  if (visiting.has(nodeId)) {
    return 0;
  }

  visiting.add(nodeId);
  const node = graph.nodes.get(nodeId);
  const hasApprover = node?.meta?.approver && node.meta.approver.length > 0;
  const downstream = graph.edges.get(nodeId) || [];

  if (downstream.length === 0) {
    visiting.delete(nodeId);
    return hasApprover ? 1 : 0;
  }

  let maxChildLayers = 0;
  downstream.forEach((childId) => {
    const childLayers = countApprovalLayers(childId, graph, visiting);
    maxChildLayers = Math.max(maxChildLayers, childLayers);
  });

  visiting.delete(nodeId);
  return (hasApprover ? 1 : 0) + maxChildLayers;
}
