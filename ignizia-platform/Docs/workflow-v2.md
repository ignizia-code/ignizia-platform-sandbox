# Workflow Builder v2 (MVP) — Feature Specification

A refined and structured version of the Workflow Builder spec with clearer
terminology and improved organization. This document builds on previous notes
and serves as the authoritative reference for the v2 implementation.

## Context

The Workflow Builder is a feature within the Workflow app of the Authoring
Applications codebase. Users can visually design directed workflows composed of
nodes (tasks/steps) and edges (directed connections). The workflow is persisted
as a single JSON document and rendered on a canvas as boxes and arrows. The
MVP is targeted at personal use, demos, and a two‑tab collaboration simulation.

---

# Core Concepts

## Workflow

A workflow represents a **real operational process**
(e.g. manufacturing, approvals, coordination).

A workflow consists of:

* **Nodes** → what happens
* **Edges** → how work flows
* **Metadata** → contextual information

Examples of metadata:

* Inputs / outputs
* Duration
* Sync vs async
* Cadence

---

# Data Model (Source of Truth)

## Workflow JSON

The entire workflow is stored as **one JSON object**.

Characteristics:

* **Fully overwritten on every edit**
* Stored in **localStorage**
* React state mirrors the JSON

### Root Fields

```
id
name
owner
sharedWith
nodes
edges
updatedByRole
updatedAt
revision
```

---

# Node

Each **node** represents one **task or step**.

### Required Fields

```
id (stable, unique)
name
```

### Optional Fields (meta)

```
inputs: string[]
outputs: string[]

cadence: "once" | "recurring"
recurrence?: "perOrder" | "daily" | "weekly" | "monthly"

mode: "sync" | "async"

durationMins?: number
difficulty?: 1 | 2 | 3 | 4 | 5

blockers: string[]
tags: string[]
```

All fields are **optional and editable later**.

---

# Edge

Each **edge** represents **directional flow / handoff** between nodes.

### Required Fields

```
id
name
startNodeId
endNodeId
```

### Optional Fields (meta)

```
handoffType: "sync" | "async"

channel?: "inPerson" | "slack" | "email" | "system"

slaMins?: number
notes?: string
```

---

# Graph Rules (MVP Law)

The workflow graph must obey the following rules:

* The graph is **directed**
* **Edges define relationships** (nodes do NOT store connections)
* **Self-loops are not allowed**
* **Floating edges are not allowed**

---

## Deletion Behavior

**Delete node**

→ Cascade delete **all connected edges**

**Delete edge**

→ Remove **only that edge**

---

## Rename Behavior

Renaming affects **name only**.

IDs:

* **Never change**
* Must remain **stable**

The workflow JSON must always remain **internally consistent**.

---

# Canvas UI

## Canvas Behavior

Nodes are rendered as:

* **Simple squares**

Edges are rendered as:

* **Arrows**

Layout rules:

* **View-only layout**
* **Node positions are NOT persisted**
* **Re-render everything on change**

Important:

This is **not a diagram editor**.
It is a **workflow definition tool**.

---

# Visual Context on Nodes (Badges)

Each node may display **up to 3 small badges**.

Recommended badges:

* **Mode** → `SYNC` / `ASYNC`
* **Duration** → `⏱ 45m`
* **Cadence** → `↻ weekly` (only if recurring)

All other metadata is edited in the **side panel**.

---

# Colors & Legend

## Color Strategy (MVP)

Primary visual dimension:

**Mode-based coloring**

* Sync nodes → one color
* Async nodes → another color

Optional:

* **Tag chips** shown on nodes (no full recolor)

## Legend

A small legend explaining:

* Node colors
* Badge meanings

Requirements:

* **Collapsible**
* **No complex interactions**

---

# Right-Side Properties Panel

A single **context-sensitive panel**.

## When a Node Is Selected

Allow editing:

* Node name
* All node metadata fields

Changes apply **immediately**.

## When an Edge Is Selected

Allow editing:

* Edge name
* Edge metadata fields

## When Nothing Is Selected

Show:

* Workflow information
* Legend

---

# Required User Interactions

The MVP must support:

* Create node
* Rename node
* Delete node
* Create edge (**select start → select end**)
* Rename edge
* Delete edge
* Select node/edge to edit properties

Not included:

* Drag persistence
* Animations beyond clarity

---

# Local Collaboration (Two Tabs Simulation)

## Identity (per tab)

Each browser tab generates:

```
userId
role
```

Stored in:

```
sessionStorage
```

Each tab behaves as an **independent user**.

---

# Shared Document

The workflow JSON is stored in:

```
localStorage
```

Using a single key:

```
workflow:<docId>
```

---

# Sync Behavior

## When a Tab Edits

1. Update React state
2. Overwrite full workflow JSON in localStorage
3. Increment `revision`
4. Update:

   * `updatedByRole`
   * `updatedAt`

## Other Tabs

Listen to the **storage event**.

When triggered:

1. Reload workflow JSON
2. Accept update **only if revision is newer**
3. Update UI immediately

---

# Conflict Handling

Strategy:

**Last write wins**

There is:

* No merge logic
* No conflict resolution

This is **intentional for the MVP**.

---

# Explicit Non-Goals (Do NOT Implement)

Do **not** implement:

* Backend APIs
* WebSockets
* BroadcastChannel
* CRDTs
* Merge resolution
* Undo / redo
* Permissions
* Comments
```
