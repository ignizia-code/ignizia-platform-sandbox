# Strategy Studio — Architecture Gap List

*Maps the current [Executive Strategy Studio User Story](EXECUTIVE_STRATEGY_STUDIO_USER_STORY.md) against the IGNIZIA platform architecture. Each gap has three columns: what the story describes today, what the architecture expects, and the exact product fix. Use this document to prioritize and track implementation work that connects Strategy Studio to the rest of the platform.*

---

## How to use this document

1. Read the **Propagation model foundation** first — it defines the anchoring decisions for Phase 1 (personas, departments, relationships, storage).
2. Work through **Priority 1 to 5** in order; each builds on the previous.
3. Address **Remaining gaps** once the top five are stable.
4. Use the **Summary table** at the end for quick scanning and sprint planning.

---

## Propagation model foundation (Phase 1 anchor)

Strategy Studio propagation must **not** depend on freeform roles created in Talent Studio for this phase. Anchor the first real propagation model on **fixed product personas** and a **canonical department layer** with a **typed relationship vocabulary**. Strategy Studio access in the architecture is **persona-based**: plant or business unit managers handle local strategy and execution, line or team managers handle team rollouts, and PeopleOps-style users track adoption and workforce readiness. Custom roles from Talent Studio do **not** participate in the first propagation engine; if they appear, treat them as unmapped custom roles with no hardcoded relationship logic.

### Persona nodes

Stable system personas. Not editable org roles.

| Persona | Strategy role | Notes |
|---------|---------------|-------|
| **Plant Manager** | Owns local strategy; approves scale decisions; monitors adoption and stability; receives escalations from Operations Manager and Line Manager. | Strategy authoring and approval. |
| **Operations Manager** | Translates strategy into execution; owns rollout across production; depends on Procurement for materials and sensors, on HR for workforce readiness; gated by Quality and Safety readiness. | Execution and rollout ownership. |
| **Line Manager** | Executes team or line rollout; manages local adoption; depends on Operations Manager direction, HR readiness and training, Procurement when material or equipment issues block rollout. | Team-level execution. |
| **HR Manager** | Owns workforce readiness, training coverage, adoption health, capability gaps, and team readiness; blocks rollout when readiness is incomplete. | Readiness and adoption. |
| **Procurement** | Owns materials, vendor, and supply dependencies; blocks rollout when parts, tooling, or sensors are missing. | Supply and materials gate. |
| **Leather Cutter** | Execution persona only: receives change, training, and task updates; can generate feedback or adoption signals; does **not** author or approve strategy. | Impacted and feedback only. |

### Department layer

Canonical and fixed for Phase 1. Does not wait for every possible department in product settings.

- **Production and Operations**
- **Quality and Safety**
- **Workforce and HR**
- **Procurement and Materials**

This set aligns with the architecture's repeated tie to operations, workforce readiness, compliance, and cross-functional dependencies. Talent Studio already treats HR, compliance, and operations as its main workforce intelligence actors.

### Relationship vocabulary

Fixed set used for all edges in the propagation graph.

| Relationship | Direction example |
|-------------|-------------------|
| **owns** | Plant Manager *owns* the strategy |
| **approves** | Plant Manager *approves* scale decision |
| **executes** | Line Manager *executes* team rollout |
| **depends on** | Operations Manager *depends on* Procurement |
| **is blocked by** | Line Manager *is blocked by* HR (training incomplete) |
| **is impacted by** | Leather Cutter *is impacted by* the strategy |
| **requires training from** | Line Manager *requires training from* HR Manager |
| **requires readiness from** | Operations Manager *requires readiness from* Quality and Safety |
| **escalates to** | Operations Manager *escalates to* Plant Manager |
| **provides feedback to** | Leather Cutter *provides feedback to* Line Manager |

The org view must show **why** a persona or department is linked to the strategy, **what role** they play in propagation, and **what relationship type** connects them. This aligns with Talent influence and dependency mapping, and Enterprise Design Studio role, authority, and workflow dependency model.

### Implementation direction

No Supabase. No local database.

| Artifact | What it contains |
|----------|-----------------|
| **Static seed file** | Persona definitions, department definitions, and canonical persona-to-persona and persona-to-department relationships using the vocabulary above. |
| **Static relationship types file** | The vocabulary as TypeScript constants and types. |
| **Strategy expansion step** | Given a selected strategy (objective and initiative), builds propagation **nodes** (personas and departments relevant to that strategy) and **edges** (typed relationships from the canonical registry). Computes strategy relevance, blockers, readiness, and approval and execution paths per node. |
| **localStorage persistence** | Persist only the **generated** strategy propagation state in localStorage, same pattern as existing seeded strategy data in `lib/strategyStorage.ts`. |

This keeps the system deterministic, easy to redesign, and easy to replace when real org data arrives. It avoids tying the propagation engine to freeform Talent Studio roles too early.

### Redesign basis for the organization view

The next redesign of propagation and the organization view should be based on:

- Persona nodes (the six fixed personas)
- Department nodes (the four canonical departments)
- Typed relationships (the fixed vocabulary)
- Strategy relevance per node (why this node is linked to this strategy)
- Blockers and readiness per node
- Approval and execution paths per node

Once this org-relation-aware propagation model is in place, it is stable enough to redesign the whole Strategy Studio organization view: four lenses, network and matrix views, evidence drawer, and cross-studio drilldowns.

---

## Priority 1: Real propagation data model (persona- and department-anchored)

**Current story**

The detail page shows "domains" and "units" under a strategy. Propagation is seeded demo data (`lib/strategyStorage.ts` `seedPropagationUnits`) with state, blockers, readiness flags, and impact. There is no formal model for why a node is linked or what relationship it has. There is no link to product personas or a fixed relationship vocabulary. The propagation model is a flat list of units grouped by department string, not a graph of typed relationships.

**Missing architecture interlock**

Strategic Context should drive objective propagation, tradeoffs, constraints, influence maps, dependency graphs, workforce readiness, and structural workflow links. Talent Studio owns influence and dependency mapping. Enterprise Design Studio owns role, authority, and workflow dependencies. Strategy Studio access is persona-based: plant or business unit managers handle local strategy and execution, line or team managers handle team rollouts, PeopleOps-style users track adoption and workforce readiness. Propagation should model who **owns**, **approves**, **executes**, **depends on**, or **is impacted by** a strategy, not just who exists in the org. The first propagation model should use **fixed product personas** and a **canonical department layer**, not freeform Talent Studio roles.

**Exact product fix**

1. Define **persona nodes**: Plant Manager, Operations Manager, Line Manager, HR Manager, Procurement, Leather Cutter. The Leather Cutter is execution and feedback only; it does not author or approve strategy.
2. Define **department nodes**: Production and Operations, Quality and Safety, Workforce and HR, Procurement and Materials.
3. Define a **fixed relationship vocabulary**: owns, approves, executes, depends on, is blocked by, is impacted by, requires training from, requires readiness from, escalates to, provides feedback to.
4. Create a **canonical relationship registry** in code: one static seed file for persona and department definitions plus their canonical relationships; one static file for the relationship type constants.
5. Implement a **strategy expansion step**: given a selected strategy, build propagation nodes (personas and departments relevant to that strategy) and edges (typed relationships from the canonical registry). Compute strategy relevance, blockers, readiness, and approval and execution paths per node.
6. Persist only the **generated strategy propagation state** in localStorage. No Supabase, no local database.
7. Do not let freeform Talent Studio roles drive propagation yet; treat them as unmapped custom roles with no hardcoded relationship logic.
8. The model should include strategy relevance per node, blockers and readiness per node, and approval and execution paths per node so the four-lens org view (Priority 2) can be built on top.

---

## Priority 2: Replace fake org tree with four-lens organization view

**Current story**

One Propagation Map: a tree (strategy to domains to units) with health-colored nodes and optional float animation. It answers "where" only. No labeled relationships, no "why," no grouping by role in propagation. Nodes are anonymous colored boxes with no explanation of how they relate to the strategy.

**Missing architecture interlock**

The org view should not be a single static tree. It should be explainable and multi-dimensional:

- **Alignment lens**: who must align for this strategy to move. From Talent influence mapping and role dependencies.
- **Dependency lens**: what workflows, roles, approvals, and systems this strategy changes. From Enterprise Design Studio and structural blueprinting.
- **Readiness lens**: who is ready, blocked, undertrained, missing permits, or overloaded. From Talent readiness and compliance logic.
- **Live footprint lens**: what is actually active now, what was simulated only, and what is in rollout. From TwinOps, Orchestrator, and Control Tower.

**Exact product fix**

1. Replace the single Propagation Map with a **four-lens organization view**: Alignment, Dependency, Readiness, Live footprint. Each lens is a tab or toggle, not a separate page.
2. Build on the **persona- and department-anchored propagation model** (Priority 1): nodes are personas and departments; edges use the fixed relationship vocabulary.
3. Use a **network view with labeled edges** (not anonymous lines) and **group nodes by role in propagation** (execution points, control points, readiness blockers, adoption influencers).
4. Offer a **matrix view** alternative for quick scanning (rows = nodes, columns = relationship attributes).
5. Every node shows: why it is linked, relationship type, current state (not assessed, simulated, ready, live, blocked, unstable), projected vs actual KPI delta, confidence or twin fidelity, top blocker and owner, next decision needed from leadership.
6. Where data from other studios is not yet available, show the field as "not connected" rather than hiding it, so the integration surface is visible from day one.

---

## Priority 3: Projected vs actual everywhere in detail mode

**Current story**

The detail view has status, narrative, and impact numbers on units (throughput, defect, and cost deltas). There is no explicit "expected vs actual" comparison and no explanation of where the delta comes from.

**Missing architecture interlock**

The platform is strong on closed-loop learning: strategy flows into simulation and execution, then Business Pulse and Control Tower compare actual outcomes back to the expected model. The executive view should answer three questions: what we expected to happen, what actually happened, and where the delta comes from.

**Exact product fix**

1. Add a **projected vs actual** comparison in detail mode at both the strategy level and the node or unit level.
2. Surface expected (or simulated) KPIs alongside actuals. Show the delta and a short "where the delta comes from" explanation (readiness, bottleneck, compliance, training gap, etc.).
3. For Phase 1, projected values can come from the strategy expansion step (seeded or AI-generated targets); actuals can be simulated or eventually fed from Business Pulse and Control Tower.
4. Make this a first-class block: either inside the narrative band, as a dedicated "Learning" section, or inline on each node card. The leader must see the loop, not just status.
5. When actuals are not yet connected, show "awaiting data" rather than hiding the block.

---

## Priority 4: Expose readiness and governance gates before actions

**Current story**

CTAs such as "Approve rollout," "Escalate blocker," "Assign owner," "Prioritize," and "Halt" are derived from units and executed directly in the UI. They update local state and persistence. There are no explicit gates, compliance checkpoints, or approval flows.

**Missing architecture interlock**

Controls own readiness, approvals, autonomy boundaries, compliance checkpoints, and rollout gates. Strategy Studio should surface those gates, not invent its own simplified action layer. The architecture expects that actions like "approve" resolve through the governance and controls layer, not through a direct state toggle.

**Exact product fix**

1. Before showing "Approve" or "Scale," display **readiness and governance gates**: which gates exist for this strategy or node, which are passed or pending, who owns the gate, and what is blocking.
2. Define a **gate model** (even if initially seeded or static): gate name, gate type (readiness, compliance, approval, autonomy), owner persona, status (passed, pending, blocked, not assessed), and blocking reason.
3. Actions like "Approve rollout" resolve to "pass this gate" or "request approval through Controls" so the leader sees the real control surface.
4. Integrate with the Controls and Governance layer where available; for Phase 1, a static or seeded gate set per strategy is acceptable.
5. Show gates visually in the org view (Priority 2) as gate icons or checkpoints on edges between nodes, not hidden inside unit cards.

---

## Priority 5: Cross-studio drilldowns (Strategy Studio as entry point)

**Current story**

The detail view has no links to other studios. The leader stays entirely inside Strategy Studio. There is no way to jump to Talent Studio, Enterprise Design Studio, Twin Playground, or Control Tower from a strategy or node context.

**Missing architecture interlock**

Strategy Studio should sit on top of Strategic Context, Business Pulse, Talent, Enterprise Design Studio, TwinOps, Governance, and Synapse. It should feel like the executive entry point into the platform, not a disconnected dashboard.

**Exact product fix**

1. Add **direct drilldown links** from Strategy Studio: from the narrative band, from org view nodes, and from the evidence drawer (see Remaining Gaps below).
2. Drilldown targets: **Open in Twin Playground** (scoped to this strategy or slice), **Open in Talent view** (influence and readiness for this strategy), **Open in Workflow or Design view** (EDS structural blueprint), **Open in live execution** (Orchestrator or Control Tower).
3. Each node in the four-lens org view should support "Open in [Studio]" so the leader moves from strategy to structure, simulation, or execution in one click.
4. For Phase 1, drilldowns can navigate to the existing studio routes with query parameters or context state; full deep-linking and scoped views are a follow-up.
5. Show drilldown links with studio icons and short labels (e.g. the Talent Studio icon plus "Readiness") so the leader knows what they are opening.

---

## Remaining gaps

### Gap 6: Bridge from strategy to structure

**Current story**

The detail view has unit cards and executive actions. There is no visible structural design layer: no workflow blueprints, role changes, escalation chains, or compliance checkpoints derived from the strategy.

**Missing architecture interlock**

The architecture expects strategy to feed Enterprise Design Studio so leadership intent becomes workflow blueprints, role changes, escalation chains, compliance checkpoints, and execution design. Strategy does not just propagate downward; it reshapes the operational structure.

**Exact product fix**

Add an explicit link from strategy to Enterprise Design Studio's structural design layer. Where possible, pre-fill or suggest workflow and role changes from the strategy context. Show a "structural impact" section or indicator on the detail page that answers: what workflows, roles, or approval chains does this strategy change?

---

### Gap 7: Simulation proof layer

**Current story**

The detail view has only the Propagation Map. There is no "test this before rollout" interaction, no scenario results, no assumptions, and no projected impact from simulation.

**Missing architecture interlock**

Twin Playground is meant to be a first-class surface that can be launched from anywhere, with scoped slices across spatial, operational, and workforce dimensions. The architecture expects simulation to be a prerequisite or companion to rollout, not an afterthought.

**Exact product fix**

Add a "Test before rollout" entry point from Strategy Studio into Twin Playground with a strategy-scoped scenario and projected impact. Show simulation status and results in the org view (Live footprint lens). If Twin Playground is not yet connected, show a "simulation not run" state on relevant nodes so the gap is visible.

---

### Gap 8: Workforce and adoption depth

**Current story**

The current story mentions blockers and readiness flags on units, but these are simple boolean fields (approved, trained, equipped). There is no influence mapping, collaboration readiness, training gap analysis, compliance exposure, shift-level readiness, or adoption resistance data.

**Missing architecture interlock**

The architecture wants deeper workforce intelligence: influence mapping, collaboration readiness, training gaps, compliance exposure, shift-level readiness, and adoption resistance. These are not optional extras; they are part of the core propagation logic. Talent Studio manages team readiness, training, compliance exposure, influence maps, dependency graphs, and workforce constraints.

**Exact product fix**

Pull readiness and influence data from Talent Studio into the propagation model. Surface training gaps, compliance exposure, and adoption signals on persona and department nodes in the Readiness and Alignment lenses. For Phase 1, extend the seeded propagation data to include richer readiness fields (training coverage percentage, compliance status, adoption sentiment) rather than simple booleans.

---

### Gap 9: Upward change loop (Commons to strategy)

**Current story**

The current story is top-down only. The leader sets a strategy, it propagates, and the leader monitors. There is no upward feedback path: no indication that workforce signals, cultural feedback, or adoption resistance changed the strategy.

**Missing architecture interlock**

The architecture says Commons and cultural signals should visibly feed strategy and show employees that their feedback changed the plan. The loop must be bidirectional for trust, adoption, and continuous improvement.

**Exact product fix**

Surface "feedback that changed this strategy" or "signals from the workforce" in the narrative or a dedicated section. Link to the Commons or feedback source where applicable. Show the Leather Cutter persona's "provides feedback to" edge in the org view so the upward loop is structurally visible, not just a concept.

---

### Gap 10: Strategy-level options (priorities, Build / Buy / Partner)

**Current story**

The current story supports create, refine, and monitor for one strategy at a time. There is no ranked priority view across strategies and no Build, Buy, or Partner decision layer.

**Missing architecture interlock**

The architecture says Strategy Studio should also support ranked priorities and a Build / Buy / Partner layer. Strategy is not just one objective at a time; it is a portfolio with tradeoffs, rankings, and sourcing decisions.

**Exact product fix**

Add a strategy-level view or section for portfolio priorities (drag-to-rank or explicit priority field per strategy) and Build / Buy / Partner options (a tag or decision field per strategy). This extends the Strategy Board from a flat list to a prioritized portfolio view.

---

### Gap 11: Node click evidence drawer

**Current story**

Clicking a node in the Propagation Map can expand a domain or close the map. There is no dedicated evidence panel, no upstream or downstream dependency view, and no aggregated context for a single node.

**Missing architecture interlock**

The leader needs to see why a node is linked and what evidence supports it: upstream and downstream dependencies, related workflows, related teams and training gaps, simulation status, governance gates, and actual signals from Business Pulse.

**Exact product fix**

When the user clicks a node in the four-lens organization view, open a **right-side evidence drawer** containing:

- Why this node is linked (relationship type and strategy relevance).
- Upstream and downstream dependencies (from the propagation graph edges).
- Related workflows (from Enterprise Design Studio, when connected).
- Related teams and training gaps (from Talent Studio or seeded readiness data).
- Simulation status (from Twin Playground, when connected).
- Governance gates (from Controls, when connected; or seeded gate data).
- Actual signals from Business Pulse (when connected).
- Cross-studio drilldown links: Open in Twin Playground, Open in Talent view, Open in Workflow or Design view, Open in live execution.

For Phase 1, populate the drawer from the canonical propagation model and seeded data. Fields that require external studio connections show "not connected" until integration is available.

---

## Summary table

| # | Gap | One-line fix |
|---|-----|-------------|
| 1 | Propagation model is demo and fake | Anchor on fixed personas (Plant Manager, Operations Manager, Line Manager, HR Manager, Procurement, Leather Cutter) and canonical departments; typed relationship vocabulary; static seed plus expansion step; persist only generated propagation in localStorage; no Supabase or DB; no freeform Talent roles in Phase 1. |
| 2 | Single org tree, no "why" | Replace with four-lens org view (Alignment, Dependency, Readiness, Live footprint); network plus matrix; labeled edges; nodes show role, state, projected vs actual, blocker, next decision. |
| 3 | No projected vs actual | Add projected vs actual comparison in detail (strategy plus nodes); integrate Business Pulse and Control Tower; show delta and cause. |
| 4 | Lightweight CTAs, no gates | Surface readiness and governance gates from Controls before actions; tie Approve and Scale to real gates. |
| 5 | No cross-studio entry | Add drilldowns: Twin Playground, Talent view, Workflow or Design view, live execution; evidence drawer with "Open in Studio." |
| 6 | No strategy to structure bridge | Link strategy to EDS; show or suggest workflow blueprints, role changes, compliance checkpoints. |
| 7 | No simulation proof | Add "Test before rollout" with Twin Playground; show simulation status and results in org view. |
| 8 | Shallow workforce and adoption | Pull influence, readiness, training, compliance, adoption from Talent into propagation and Readiness and Alignment lenses. |
| 9 | Top-down only | Surface Commons and cultural feedback that changed strategy; upward loop visible to leader and employees. |
| 10 | No priorities or Build Buy Partner | Add strategy-level ranked priorities and Build Buy Partner layer to the journey. |
| 11 | Node click has no evidence | On node click, open evidence drawer: why linked, dependencies, workflows, teams, simulation, gates, Business Pulse signals plus drilldowns. |

---

*End of gap list. Next step: implement Priority 1 (propagation model foundation) then Priority 2 (four-lens org view). The remaining gaps layer on top of those two.*
