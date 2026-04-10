# Workflow Builder (MVP) — Feature Specification

## Overview

This document outlines the requirements and design for the Workflow Builder
feature inside the Workflow app of the Authoring Applications codebase. The
primary goal of the MVP is to provide a simple, visual graph editor for
creating directed workflows with local persistence and simulated collaboration.

## Context

The Workflow Builder allows users to compose a workflow as a directed graph
using nodes and edges. The graph is persisted as JSON and rendered on a canvas
within the existing Workflow application. The MVP is intended for personal use,
demonstrations, and local collaboration between browser tabs.

## Core Concepts

* A **workflow** is a directed graph made of **nodes** and **edges**.
* **Nodes** represent tasks or steps; **edges** represent directional flow.
* The workflow document is the single source of truth and is stored as one
  JSON object.

### Data Model (Source of Truth)

The workflow JSON holds two arrays and minimal metadata:

```
{
  id,
  name,
  owner,
  sharedWith,
  nodes: [ ... ],
  edges: [ ... ],
  updatedByRole,
  updatedAt,
  revision
}
```

#### Node

* `id` – stable, unique identifier
* `name` – editable label

Additional metadata may be added later but is omitted in MVP.

#### Edge

* `id` – stable, unique identifier
* `name` – editable label
* `startNodeId` / `endNodeId`

Edges define relationships; nodes do not store connection information.

### Graph Rules (MVP Law)

* The graph is directed.
* Self‑loops are not permitted.
* Floating edges are forbidden: deleting a node cascades to remove its edges.
* Renaming affects only the `name` field; IDs never change.
* The JSON document must remain internally consistent at all times.

## Canvas & UI (MVP Scope)

The canvas should render:

* Nodes as simple squares.
* Edges as arrows.

Layout information is not saved; there are no x/y coordinates in the JSON. The
canvas can auto‑position nodes and center itself, re‑rendering on every
change. Appearance and placement are purely for clarity; this is not a diagram
editor.

### User Interactions

Minimum UI actions required:

* Create / rename / delete nodes
* Create / rename / delete edges (select start, then end)

Drag‑and‑drop persistence or animations are out of scope.

## Workflow Persistence

Every edit overwrites the entire workflow JSON in `localStorage`. No partial
updates, diffing, or patching are performed; this simplicity is acceptable for
an MVP.

## Local Collaboration (Two Tabs Simulation)

Collaboration is simulated using browser storage.

* Each tab represents a separate user with its own `userId` and role stored in
  `sessionStorage`.
* The shared workflow document is kept in `localStorage` under a key such as
  `workflow:<docId>`.
* Metadata fields like `updatedByRole` and `updatedAt` (plus an optional
  revision counter) should accompany the workflow JSON.

### Sync Mechanism

When a tab edits the workflow:

1. Update React state.
2. Overwrite the workflow JSON in localStorage.

Other open tabs listen for the storage event, reload the JSON, and update the
UI immediately. Storage events do not fire in the originating tab; last write
wins. A simple revision number can be added to ignore stale updates if desired.

## Explicit Non‑Goals (Do NOT Implement)

* backend APIs or WebSockets
* BroadcastChannel or CRDTs
* merge conflict resolution, undo/redo, permissions, comments
* real‑time cursors, layout persistence, complex graph validation

This is an MVP; keep the implementation brutal and simple.

## Output Expectation

The delivered feature should include:

* canvas UI with workflow editing capabilities
* complete workflow logic as described above
* local collaboration via storage
* clean integration into the existing Workflow app

Code quality should prioritize readability, explicitness, and ease of change.
When in doubt, choose the simplest working solution.

## Final Guiding Principle

If it works, is understandable, and ships fast — it’s correct. Do not over‑engineer.

Overwrite the full workflow JSON in localStorage

When another tab is open:

Listen to the browser storage event

Reload workflow JSON from localStorage

Update UI immediately

Notes:

Storage events do not fire in the same tab

Last write wins

This is acceptable and expected

Optional safety:

Use a simple revision number to ignore stale updates

Explicit Non-Goals (Do NOT Implement)

Do NOT implement:

backend APIs

WebSockets

BroadcastChannel

CRDTs

merge conflict resolution

undo/redo

permissions

comments

real-time cursors

layout persistence

complex graph validation

This is an MVP. Keep it brutal and simple.

Output Expectation

You must:

implement the canvas UI

implement all workflow logic

implement local collaboration via storage

integrate cleanly into the existing Workflow app

Code should be:

readable

boring

explicit

easy to change later

If a choice is ambiguous, choose the simplest working solution.

Final Guiding Principle

If it works, is understandable, and ships fast — it’s correct.

Do not over-engineer.
````
