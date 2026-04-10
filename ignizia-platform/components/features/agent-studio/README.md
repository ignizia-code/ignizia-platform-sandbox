# Agent Studio

A visual editor for building deterministic AI agent workflows. Users design pipelines of model calls and conditional logic nodes, connected by typed edges, and can run the pipeline to see execution results.

Product spec: [`Docs/agent-studio.md`](../../../Docs/agent-studio.md)

---

## What it does

- **Visual canvas**: drag-and-drop canvas for building agent pipelines; nodes are positioned freely and connected with edges
- **Node types**:
  - `model-call` — calls an LLM with a configurable prompt and output schema (JSON)
  - `conditional` — branches execution based on a condition evaluated against the previous node's output (supports `==`, `!=`, `exists`, `contains`)
- **Edge types**: `default`, `true` (conditional true branch), `false` (conditional false branch)
- **Run panel**: executes the pipeline node by node, showing intermediate outputs and the final result
- **Node editor**: click any node to open a side panel for editing its name, description, prompt, output schema, condition, and connections

---

## Key files

| File | Purpose |
|---|---|
| `AgentStudio.tsx` | The entire Agent Studio — canvas rendering, node CRUD, connection management, run engine, and node editor panel (~2,000 lines) |
| `index.ts` | Barrel export |

---

## Architecture & data flow

```
app/dashboard/ (via PortalPage.tsx or direct embed)
    │
    └─► AgentStudio.tsx
            │
            ├─► Canvas (DOM/SVG)     — node positioning, connection drawing
            │
            ├─► Node editor panel   — edit selected node properties
            │
            └─► Run engine
                    │
                    └── POST /api/execute-model
                            (executes a model-call node with its prompt + input data)
```

The run engine processes nodes in topological order. For each `model-call` node, it sends the node's prompt (with upstream node outputs injected) to `/api/execute-model`. For `conditional` nodes, it evaluates the condition against the previous output and routes execution down the correct branch.

---

## API integrations

| Route | Purpose |
|---|---|
| `POST /api/execute-model` | Runs a single model-call node; accepts a prompt and input context, returns the LLM output |

---

## Data

- **Current state**: all pipeline state (nodes, edges, positions) is **in-memory only** — there is no save/load functionality yet
- Execution results are stored in component state for the duration of the session

---

## Current status & known gaps

- No persistence — pipelines are lost on page refresh
- No import/export of pipeline definitions
- The canvas uses a custom DOM/SVG implementation (same approach as Workflow Builder)
- Only two node types are supported; a `loop`, `map`, or `tool-call` node type would be natural extensions
- Execution is sequential; parallel branch execution is not yet supported

---

## How to extend

- **Add persistence**: create a `agent_pipelines` Supabase table; add save/load UI to the studio toolbar
- **Add a new node type**: add the interface to the union type `WorkflowNode`, add a renderer case in the canvas, and handle execution in the run engine
- **Add tool-call nodes**: nodes that call external APIs or IGNIZIA's own `/api/` routes as pipeline steps
- **Add parallel execution**: allow branches downstream of a `conditional` or `fork` node to execute concurrently
