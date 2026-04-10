# Workflow Analytics - Bottleneck & Responsibility Intelligence

## Overview

The Workflow Analytics feature provides passive structural analysis of workflows to identify bottlenecks, overloaded personnel, and organizational risks. This is a read-only analytics layer that does not modify workflow behavior, execution, or approval logic.

## Features

### 1. Person Bottleneck Analysis

Analyzes each person involved in the workflow (as assignee or approver) and computes:

- **Execution Task Count**: Number of tasks assigned to this person for completion
- **Approval Task Count**: Number of tasks requiring this person's approval
- **Total Touchpoints**: Combined execution + approval tasks
- **Direct Blocking Count**: Number of tasks immediately waiting on this person
- **Downstream Impact**: Total number of tasks that depend (directly or indirectly) on this person's tasks
- **Max Chain Depth**: Longest dependency path that includes this person's tasks

**Default Sorting**: By Downstream Impact (descending), then Approval Task Count (descending)

### 2. Node Responsibility Clarity

For each workflow node, displays:

- **Node Name**: Task identifier
- **Dependencies**: Upstream nodes this task depends on
- **Assignee**: Person responsible for executing the task
- **Approver**: Person responsible for approving the task
- **Waiting On**: Specific person currently blocking this node
- **Blocks**: Downstream nodes that depend on this task

This view helps answer: "Why is this task waiting?" and "Who is responsible?"

### 3. Structural Risk Summary

Top-level indicators showing:

- **Most Critical Bottleneck**: Person with highest downstream impact
- **Longest Approval Chain**: Number of sequential approval layers in the workflow
- **Single Points of Failure**: People appearing in >50% of workflow paths
- **Total Approval Layers**: Maximum depth of sequential approvals

## Implementation Details

### Analytics Computation

All analytics are computed dynamically from the workflow DAG structure:

1. **Graph Construction**: Builds dependency graph with forward and reverse edges
2. **DAG Traversal**: Uses recursive traversal with cycle detection
3. **Downstream Impact**: Computed via depth-first search, avoiding double-counting
4. **Chain Depth**: Calculated using longest path algorithm
5. **Blocking Analysis**: Identifies immediate dependencies and approval requirements

### Performance Considerations

- Analytics are memoized using React's `useMemo` hook
- Recomputed only when workflow structure changes
- Efficient O(V + E) graph traversal algorithms
- Handles cycles gracefully with visited set tracking

### Data Flow

```
Workflow (nodes + edges)
  ↓
buildDependencyGraph()
  ↓
computePersonBottlenecks()
computeNodeResponsibilities()
computeStructuralRisk()
  ↓
WorkflowAnalytics UI Component
```

## Usage

### Accessing Analytics

1. Open a workflow in the Workflow Builder
2. Click the "Analytics" tab in the right panel
3. View the three analytical layers:
   - Structural Risk Summary (top banner)
   - Person Bottleneck Table (primary view)
   - Node Responsibility Table (secondary view)

### Interpreting Results

**High Downstream Impact**: Indicates a person whose delays will cascade to many other tasks

**High Approval Task Count**: Suggests potential approval bottleneck

**Single Point of Failure**: Person appears in majority of workflow paths - their absence blocks significant work

**Long Approval Chains**: May indicate over-centralized decision-making or bureaucratic overhead

### Sorting and Filtering

- Click column headers to sort tables
- Use filter inputs to search by person name or node name
- Tables support ascending/descending sort

## Key Questions Answered

1. **Who is overloaded?** → Check Total Touchpoints and Downstream Impact
2. **Who blocks the most work?** → Check Direct Blocking Count and Downstream Impact
3. **Why is this task waiting?** → Check "Waiting On" column in Node Responsibility table
4. **Is this workflow overly centralized?** → Check Single Points of Failure indicator

## Technical Architecture

### Files

- `lib/workflowAnalytics.ts`: Core analytics computation logic
- `components/features/workflow-builder/WorkflowAnalytics.tsx`: UI component
- `components/features/workflow-builder/WorkflowBuilder.tsx`: Integration point

### Key Functions

- `computeWorkflowAnalytics()`: Main entry point
- `buildDependencyGraph()`: Constructs graph data structures
- `computePersonBottlenecks()`: Analyzes person-level metrics
- `computeNodeResponsibilities()`: Analyzes node-level clarity
- `computeStructuralRisk()`: Computes top-level indicators

### Type Definitions

```typescript
interface PersonBottleneck {
  person: UserRole;
  executionTaskCount: number;
  approvalTaskCount: number;
  totalTouchpoints: number;
  directBlockingCount: number;
  downstreamImpact: number;
  maxChainDepth: number;
}

interface NodeResponsibility {
  nodeId: string;
  nodeName: string;
  dependencies: string[];
  assignee: UserRole | null;
  approver: UserRole | null;
  waitingOnPerson: UserRole | null;
  blocksNodes: string[];
}

interface StructuralRiskSummary {
  mostCriticalBottleneck: { person: UserRole; downstreamImpact: number } | null;
  longestApprovalChain: { length: number; path: string[] };
  singlePointsOfFailure: Array<{ person: UserRole; pathCoverage: number }>;
  totalApprovalLayers: number;
}
```

## Limitations

- Analytics are passive and do not suggest changes
- Does not simulate workflow execution
- Assumes all dependencies are accurately modeled
- Single point of failure threshold is fixed at 50%
- Does not account for task duration or priority

## Future Enhancements

Potential improvements (not currently implemented):

- Time-based analysis (considering task durations)
- Critical path highlighting
- What-if scenario analysis
- Export analytics to CSV/PDF
- Historical trend tracking
- Configurable risk thresholds
