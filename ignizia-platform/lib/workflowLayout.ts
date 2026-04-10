import { WorkflowNode, WorkflowEdge } from '../types';
import dagre from '@dagrejs/dagre';

export interface LayoutOptions {
  direction?: 'LR' | 'TB'; // Left-to-Right or Top-to-Bottom
  nodeWidth?: number;
  nodeHeight?: number;
  nodeSep?: number; // Horizontal separation between nodes
  edgeSep?: number; // Separation between edges
  rankSep?: number; // Vertical separation between ranks (layers)
  marginX?: number; // Margin around the graph
  marginY?: number;
}

export interface LayoutResult {
  nodes: WorkflowNode[];
  edges: WorkflowEdge[];
  width: number;
  height: number;
}

/**
 * Calculates optimal positions for workflow nodes using dagre layout algorithm.
 * This creates a directed graph layout where nodes flow logically based on edges.
 * 
 * @param nodes - Array of workflow nodes (positions will be calculated)
 * @param edges - Array of edges connecting nodes
 * @param options - Layout configuration options
 * @returns Nodes with calculated positions and graph dimensions
 */
export function calculateWorkflowLayout(
  nodes: WorkflowNode[],
  edges: WorkflowEdge[],
  options: LayoutOptions = {}
): LayoutResult {
  const {
    direction = 'LR', // Default: Left-to-Right (better for workflows)
    nodeWidth = 180,
    nodeHeight = 60,
    nodeSep = 120,
    edgeSep = 40,
    rankSep = 150,
    marginX = 50,
    marginY = 50,
  } = options;

  // Create a new directed graph using dagre's graphlib
  const g = new dagre.graphlib.Graph();

  // Set graph layout options
  g.setGraph({
    rankdir: direction,
    nodesep: nodeSep,
    edgesep: edgeSep,
    ranksep: rankSep,
    marginx: marginX,
    marginy: marginY,
  });

  // Default to assigning a new object as a label for each edge
  g.setDefaultEdgeLabel(() => ({}));

  // Add nodes to the graph
  nodes.forEach((node) => {
    g.setNode(node.id, {
      label: node.name,
      width: nodeWidth,
      height: nodeHeight,
    });
  });

  // Add edges to the graph
  edges.forEach((edge) => {
    // Only add edge if both nodes exist
    if (g.hasNode(edge.startNodeId) && g.hasNode(edge.endNodeId)) {
      g.setEdge(edge.startNodeId, edge.endNodeId, {
        label: edge.name,
      });
    }
  });

  // Calculate the layout
  dagre.layout(g);

  // Extract the calculated positions and update nodes
  const positionedNodes: WorkflowNode[] = nodes.map((node) => {
    const nodeInfo = g.node(node.id);
    if (nodeInfo) {
      return {
        ...node,
        position: {
          x: nodeInfo.x - nodeWidth / 2, // Center the node on the coordinate
          y: nodeInfo.y - nodeHeight / 2,
        },
      };
    }
    return node;
  });

  // Get the graph dimensions
  const graphInfo = g.graph();

  return {
    nodes: positionedNodes,
    edges,
    width: graphInfo.width || 0,
    height: graphInfo.height || 0,
  };
}

/**
 * Calculates layout for new nodes being added to an existing workflow.
 * Places new nodes relative to existing ones while maintaining flow logic.
 * 
 * @param existingNodes - Nodes already on the canvas
 * @param existingEdges - Edges already on the canvas
 * @param newNodes - New nodes to be added
 * @param newEdges - New edges to be added
 * @param options - Layout configuration
 * @returns Combined nodes and edges with positions
 */
export function calculateIncrementalLayout(
  existingNodes: WorkflowNode[],
  existingEdges: WorkflowEdge[],
  newNodes: WorkflowNode[],
  newEdges: WorkflowEdge[],
  options: LayoutOptions = {}
): LayoutResult {
  // Find the rightmost position of existing nodes
  let maxX = 0;
  existingNodes.forEach((node) => {
    if (node.position) {
      maxX = Math.max(maxX, node.position.x + 180); // 180 = estimated node width
    }
  });

  // Combine all nodes and edges for layout calculation
  const allNodes = [...existingNodes, ...newNodes];
  const allEdges = [...existingEdges, ...newEdges];

  // Calculate layout for the complete graph
  const result = calculateWorkflowLayout(allNodes, allEdges, {
    ...options,
    direction: 'LR',
  });

  // For incremental additions, we want to offset the new layout
  // to start where the existing nodes end, but dagre will recalculate everything
  // This ensures the whole workflow looks cohesive
  return result;
}

/**
 * Checks if a layout recalculation is needed.
 * Returns true if nodes have no positions or if new nodes/edges were added.
 */
export function needsLayoutRecalculation(
  nodes: WorkflowNode[],
  previousNodeCount: number,
  previousEdgeCount: number,
  currentEdgeCount: number
): boolean {
  // No positions set
  const hasUnpositionedNodes = nodes.some((node) => !node.position);
  
  // New nodes added
  const hasNewNodes = nodes.length !== previousNodeCount;
  
  // New edges added
  const hasNewEdges = currentEdgeCount !== previousEdgeCount;

  return hasUnpositionedNodes || hasNewNodes || hasNewEdges;
}
