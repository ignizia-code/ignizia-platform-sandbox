# Strategy Studio (Executive Strategy Studio)

An executive-level strategic planning tool powered by an AI copilot. Leaders define objectives and initiatives (with numerical targets and operational guardrails), and the AI propagates the strategy across organizational domains, surfacing blockers, impact projections, and recommended focus areas.

Product specs: [`Docs/EXECUTIVE_STRATEGY_STUDIO_USER_STORY.md`](../../../Docs/EXECUTIVE_STRATEGY_STUDIO_USER_STORY.md), [`Docs/STRATEGY_STUDIO_ARCHITECTURE_GAP_LIST.md`](../../../Docs/STRATEGY_STUDIO_ARCHITECTURE_GAP_LIST.md)

---

## What it does

- **Strategy Copilot chat**: multi-turn conversation with an AI that understands executive language; responds in two modes:
  - **Format A (create/refine)**: returns a structured JSON strategy object (target %, guardrails, automation lift) when the leader requests a change
  - **Format B (question)**: returns a plain-text recommendation with reasoning, signals, tradeoffs, and confidence level
- **Objective management**: create and store named objectives (e.g., "Increase throughput by 12%") with associated initiatives
- **Initiative guardrails**: each initiative has operational safety limits (`maxSpeed`, `maxErrorRate`, `maxDropCount`, `emergencyStopThreshold`)
- **Org propagation**: the strategy is expanded across organizational units (domains, sub-units) using `lib/propagation/`; shows which areas are active, blocked, or not started
- **Org Lens View**: visual overlay (`OrgLensView.tsx`) showing the propagation state across the org chart, filterable by lens (throughput, cost, safety, people)
- **Evidence Drawer**: side panel showing supporting data and evidence for the current strategy

---

## Key files

| File | Purpose |
|---|---|
| `ExecutiveStrategyStudio.tsx` | Root component; manages the copilot chat, objective lifecycle, propagation state, and lens switching |
| `OrgLensView.tsx` | Visual org propagation overlay; renders domain blocks colored by status/impact |
| `EvidenceDrawer.tsx` | Slide-out panel showing evidence and supporting data for the active strategy |

---

## Architecture & data flow

```
app/dashboard/page.tsx (integrated into dashboard)
    │
    └─► ExecutiveStrategyStudio.tsx
            │
            ├─► POST /api/strategy-copilot
            │       (sends conversation history + existing strategy context + propagation state)
            │       (returns JSON strategy object or plain-text recommendation)
            │
            ├─► lib/strategyStorage.ts
            │       (createStrategyFromGoal, saveObjective, saveInitiative,
            │        savePropagationUnits, seedPropagationUnits, resetAllStrategyData)
            │
            ├─► lib/propagation/
            │       (expandStrategyPropagation → distributes strategy across org units)
            │
            ├─► lib/objectiveStorage.ts
            │       (loadAllObjectives, loadInitiativesByObjectiveId)
            │
            ├─► OrgLensView     (receives propagation graph, renders org overlay)
            └─► EvidenceDrawer  (receives active objective, renders evidence)
```

---

## API integrations

| Route | Purpose |
|---|---|
| `POST /api/strategy-copilot` | Multi-turn AI copilot; accepts conversation history, existing strategy context, and org propagation state; returns structured JSON or plain-text response |

The copilot uses `gpt-4.1-nano` and is designed to understand manufacturing/operations executive language.

---

## Data

| Storage | What |
|---|---|
| `localStorage` | Executive chat sessions (`exec-strategy:chats`), objectives, initiatives, propagation units (via `lib/strategyStorage.ts` and `lib/objectiveStorage.ts`) |

> Future work: migrate objectives and initiatives to Supabase for cross-session persistence.

---

## Key design decisions

- **Two-format AI response**: the copilot always returns either a JSON block (when the user wants to create or change a strategy) or plain text (when the user asks a question). This makes the UI predictable — it can always check for a parsed JSON object and render a strategy card if present
- **Propagation as context**: before each copilot call, the current propagation state (which domains are blocked, strongest/weakest domains, active blockers) is serialized and injected into the system prompt — the AI uses this as ground truth for its recommendations
- **Fallback extraction**: if the AI fails to return valid JSON for a numeric change, `tryExtractTargetFromText()` attempts to parse the target value from the natural language response

---

## Current status & known gaps

- Strategy and objective data is stored in `localStorage` — not persistent across devices or sessions
- The propagation logic in `lib/propagation/` seeds mock org unit data; real org data integration is pending
- The Org Lens View uses placeholder org unit shapes — a full org chart visualization is a future milestone

---

## How to extend

- **Migrate to Supabase**: create `objectives`, `initiatives`, and `propagation_units` tables; update `lib/strategyStorage.ts` and `lib/objectiveStorage.ts` accordingly
- **Add a new lens**: extend the `ExecLens` type and add the corresponding filter logic in `OrgLensView.tsx`
- **Connect real org data**: replace the seeded propagation units in `lib/propagation/` with data fetched from the Talent Studio or an HR system integration
