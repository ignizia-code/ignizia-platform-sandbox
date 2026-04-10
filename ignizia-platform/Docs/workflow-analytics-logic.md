# Workflow Analytics Logic Documentation

## Overview

The Workflow Analytics feature provides passive intelligence about workflow structure, identifying bottlenecks, responsibility clarity, and structural risks. It analyzes the workflow graph without modifying execution or approval logic.

## Core Concepts

### Workflow Structure

The analytics engine operates on a directed acyclic graph (DAG) where:
- **Nodes** represent tasks/activities in the workflow
- **Edges** represent dependencies between tasks
- **People** (roles) are assigned to nodes as either:
  - **Assignees** (`assignedTo`): Execute the task
  - **Approvers** (`approver`): Review and approve the task

### Data Sources

Analytics are computed from the following workflow metadata:

```typescript
WorkflowNode {
  id: string
  name: string
  meta?: {
    assignedTo?: UserRole[]    // Who executes this task
    approver?: UserRole[]       // Who approves this task
  }
}

WorkflowEdge {
  startNodeId: string          // Upstream node
  endNodeId: string            // Downstream node (depends on start)
}
```

---

## Analytics Components

### 1. Person Bottleneck Analysis

Identifies individuals who are critical to workflow progress based on their involvement and impact.

#### Metrics Computed

**Execution Task Count**
- Number of nodes where the person is an assignee
- Indicates direct workload

**Approval Task Count**
- Number of nodes where the person is an approver
- Indicates review/approval burden

**Total Touchpoints**
- Sum of execution + approval tasks
- Overall involvement in the workflow

**Direct Blocking Count**
- Number of immediate downstream nodes blocked by this person's tasks
- Calculated by counting outgoing edges from all nodes they touch
- **Example:** If Alice owns Node A, and A connects to B and C, her Direct Blocking = 2

**Downstream Impact** ⭐ (Primary Sort Key)
- Total number of nodes that transitively depend on this person's tasks
- Computed via depth-first traversal from all touched nodes
- Excludes the person's own nodes from the count
- Higher values indicate greater workflow dependency
- **Example:** If Alice owns Node A, and A→B→C→D plus A→E→F, her Impact = 5 (B,C,D,E,F)
- **Key Difference from Block:** Block counts only immediate connections (1 hop), Impact counts ALL downstream nodes (recursive)

**Why Impact Matters More:**
```
Scenario 1: Alice owns Node A
  A → B (Block=1, Impact=1)

Scenario 2: Alice owns Node X  
  X → Y → Z → ... → (20 more nodes)
  (Block=1, Impact=20)
```
Both have Block=1, but Alice in Scenario 2 is a much bigger bottleneck because her delay cascades to 20 nodes!

**Max Chain Depth**
- Longest sequential path from any of the person's nodes to a leaf node
- Indicates how far their delays can propagate

#### How It's Affected by Workflow Structure

| Workflow Change | Impact on Metrics |
|----------------|-------------------|
| Add node assigned to person | ↑ Execution count, ↑ Touchpoints, ↑ Downstream impact |
| Add approval to person | ↑ Approval count, ↑ Touchpoints, ↑ Downstream impact |
| Add edge from person's node | ↑ Direct blocking, ↑ Downstream impact |
| Remove person from node | ↓ All metrics |
| Add parallel path (no person) | No change (person not involved) |
| Add serial dependency after person | ↑ Downstream impact, ↑ Max chain depth |

#### Example

```
Node A (assigned: Alice) → Node B → Node C
                        ↘ Node D → Node E

Alice's metrics:
- Execution: 1 (Node A)
- Approval: 0
- Touchpoints: 1
- Direct Blocking: 2 (B and D)
- Downstream Impact: 4 (B, C, D, E)
- Max Chain Depth: 3 (A → B → C or A → D → E)
```

---

### 2. Node Responsibility Clarity

Provides visibility into each node's dependencies, assignments, and blocking relationships.

#### Metrics Computed

**Dependencies**
- List of upstream node IDs that must complete first
- Derived from reverse edge map

**Assignee**
- Primary person responsible for executing the task
- Takes first element from `assignedTo` array

**Approver**
- Primary person responsible for approving the task
- Takes first element from `approver` array

**Blocks Nodes**
- List of downstream node IDs that depend on this node
- Derived from forward edge map

#### How It's Affected by Workflow Structure

| Workflow Change | Impact |
|----------------|--------|
| Add edge to node | ↑ Dependencies |
| Add edge from node | ↑ Blocks count |
| Assign person to node | Sets Assignee |
| Add approver to node | Sets Approver |
| Remove edge | ↓ Dependencies/Blocks |

#### Example

```
Node A (Alice, approver: Bob) → Node B (Charlie) → Node C (Diana)

Node B metrics:
- Dependencies: [A]
- Assignee: Charlie
- Approver: null
- Waiting On: Bob (from Node A's approver)
- Blocks: [C]
```

---

### 3. Structural Risk Summary

High-level indicators of workflow fragility and complexity.

#### Metrics Computed

**Most Critical Bottleneck**
- Person with the highest downstream impact
- Automatically selected from sorted person bottlenecks
- Shows person name and impact count

**Longest Approval Chain**
- Maximum number of sequential approval nodes in any path
- Computed by:
  1. Finding all root nodes (no dependencies)
  2. Traversing to find longest path
  3. Filtering path to only approval nodes
- Indicates approval overhead and delay risk

**Single Points of Failure**
- People who touch ≥50% of all workflow nodes
- Calculated as: `(touchpoints / total nodes) * 100`
- Sorted by path coverage percentage
- Indicates concentration risk

**Total Approval Layers**
- Maximum sequential depth of approval nodes
- Different from longest chain: counts approval depth, not path length
- Indicates bureaucratic complexity

#### How It's Affected by Workflow Structure

| Workflow Change | Impact |
|----------------|--------|
| Add approval node in series | ↑ Longest approval chain, ↑ Total layers |
| Add approval node in parallel | No change to chain/layers |
| Assign many nodes to one person | May create single point of failure |
| Remove approval from node | ↓ Approval chain, ↓ Total layers |
| Add nodes without approvals | Dilutes single point percentages |

#### Example

```
Workflow: A(approve) → B(approve) → C → D(approve)
         ↘ E → F

Structural Risk:
- Longest Approval Chain: 3 (A, B, D)
- Total Approval Layers: 3
- If Alice touches A, B, D, E (4/6 nodes = 67%): Single Point of Failure
```

---

## Graph Algorithms

### Dependency Graph Construction

```typescript
DependencyGraph {
  nodes: Map<nodeId, WorkflowNode>
  edges: Map<nodeId, downstreamNodeIds[]>      // Forward edges
  reverseEdges: Map<nodeId, upstreamNodeIds[]> // Backward edges
  nodesByPerson: Map<person, nodeIds[]>        // Person index
}
```

**Time Complexity**: O(N + E) where N = nodes, E = edges

### Downstream Impact Calculation

Uses depth-first search (DFS) with cycle detection:

```
1. For each node touched by person:
   2. Traverse all downstream paths
   3. Collect unique reachable nodes
4. Return count (excluding person's own nodes)
```

**Time Complexity**: O(N + E) per person

### Chain Depth Calculation

Recursive DFS with memoization:

```
depth(node) = 1 + max(depth(child) for child in downstream)
depth(leaf) = 1
```

**Time Complexity**: O(N + E) with cycle detection

---

## UI Display Logic

### Sorting and Filtering

**Person Bottleneck Table**
- Default sort: Downstream Impact (descending)
- Secondary sort: Approval Task Count (descending)
- Filter: Case-insensitive substring match on person name

**Node Responsibility Table**
- Default sort: Node Name (ascending)
- Filter: Case-insensitive substring match on node name or ID

### Responsive Behavior

- Tables use horizontal scroll for narrow panels
- Column headers abbreviated in compact view
- Badge indicators for counts (dependencies, blocks)
- Color coding:
  - Red: Blocking/critical
  - Amber: Waiting/pending
  - Blue: Informational
  - Orange: Risk indicators

---

## Performance Considerations

### Computation Triggers

Analytics are recomputed when:
- Workflow nodes change (add/remove/modify)
- Workflow edges change (add/remove)
- Node metadata changes (assignedTo, approver)

### Optimization

- **Memoization**: Results cached via `useMemo` hook
- **Incremental**: Only recomputes on workflow changes
- **Lazy**: Computed on-demand when Analytics tab is viewed
- **Efficient**: O(N + E) complexity for most operations

### Scalability

Tested with workflows up to:
- 100 nodes
- 200 edges
- 10 unique people

For larger workflows, consider:
- Pagination for tables
- Virtual scrolling
- Background computation with web workers

---

## Edge Cases

### Cycles in Workflow

- **Detection**: Visiting set tracks nodes in current path
- **Handling**: Returns 0 depth, breaks traversal
- **Impact**: Prevents infinite loops, may undercount metrics

### Multiple Assignees/Approvers

- **Current**: Takes first element from array
- **Future**: Could aggregate or show all

### Orphaned Nodes

- **No Dependencies**: Treated as root nodes
- **No Downstream**: Depth = 1, no blocking impact

### Empty Workflows

- **No Nodes**: All metrics return 0 or empty arrays
- **No People**: Empty bottleneck list
- **No Edges**: All nodes independent, no blocking

---

## Future Enhancements

### Potential Additions

1. **Time-based Analysis**
   - Incorporate `durationMins` from node metadata
   - Calculate critical path timing
   - Estimate total workflow duration

2. **Parallel Path Detection**
   - Identify opportunities for parallelization
   - Suggest workflow optimizations

3. **Historical Trends**
   - Track metrics over workflow revisions
   - Show improvement/degradation

4. **What-If Scenarios**
   - Simulate adding/removing nodes
   - Preview impact on metrics

5. **Export/Reporting**
   - Generate PDF reports
   - Export to CSV for external analysis

---

## API Reference

### Main Function

```typescript
computeWorkflowAnalytics(workflow: Workflow): WorkflowAnalytics
```

**Input**: Complete workflow object with nodes and edges

**Output**: 
```typescript
{
  personBottlenecks: PersonBottleneck[]
  nodeResponsibilities: NodeResponsibility[]
  structuralRisk: StructuralRiskSummary
}
```

### Type Definitions

See `lib/workflowAnalytics.ts` for complete type definitions.

---

## Troubleshooting

### Metrics Seem Wrong

1. **Check node metadata**: Ensure `assignedTo` and `approver` are set
2. **Verify edges**: Confirm dependencies are correctly defined
3. **Look for cycles**: Cycles can affect depth calculations
4. **Review filtering**: Active filters may hide relevant data

### Performance Issues

1. **Reduce workflow size**: Break into sub-workflows
2. **Simplify structure**: Remove unnecessary dependencies
3. **Check for cycles**: Cycles cause repeated traversals
4. **Clear browser cache**: Stale data may cause issues

### Missing Data

1. **No bottlenecks**: No people assigned to any nodes
2. **Zero impact**: Node has no downstream dependencies
3. **No waiting**: Node has no upstream dependencies
4. **Empty tables**: Check filter inputs

---

## Related Documentation

- [Workflow Builder Implementation](./ai-workflow-builder-implementation-plan.md)
- [Workflow Analytics UI](./workflow-analytics.md)
- [Workflow Types](../types/index.ts)
