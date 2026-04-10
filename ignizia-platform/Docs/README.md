# Docs — Table of Contents

This folder contains product specifications and implementation notes for the IGNIZIA platform. Entries are grouped by feature area; implementation plans appear under a separate section.

For developer onboarding, coding standards, and architecture documentation, see the root-level docs:
- [`DEVELOPMENT.md`](../DEVELOPMENT.md) — full development pipeline, tech stack, data storage, deployment, coding standards, security
- [`CONTRACTOR_GUIDE.md`](../CONTRACTOR_GUIDE.md) — external-safe onboarding guide for contractors
- [`DESIGN_SYSTEM_COLORS.md`](../DESIGN_SYSTEM_COLORS.md) — brand palette and design token reference
- [`AGENTS.md`](../AGENTS.md) — rules for AI coding agents

---

## Feature Module READMEs

Each feature module has a `README.md` that explains what it does, its architecture, data flow, API integrations, current status, and how to extend it.

| Module | README | Description |
|---|---|---|
| Dashboard | [`components/features/dashboard/README.md`](../components/features/dashboard/README.md) | Role-based intelligence monitoring (Control Tower) |
| Community | [`components/features/community/README.md`](../components/features/community/README.md) | Discussion topics, comment analysis, collective intelligence |
| Governance | [`components/features/governance/README.md`](../components/features/governance/README.md) | Policy management, approvals, audit trail, compliance |
| Workflow Builder | [`components/features/workflow-builder/README.md`](../components/features/workflow-builder/README.md) | Visual DAG workflow editor with AI co-pilot and collaboration |
| Strategy Studio | [`components/features/strategy-studio/README.md`](../components/features/strategy-studio/README.md) | Executive strategy planning with AI propagation |
| Talent Studio | [`components/features/talent-studio/README.md`](../components/features/talent-studio/README.md) | Full workforce intelligence suite (ExpertSuite v3) |
| Agent Studio | [`components/features/agent-studio/README.md`](../components/features/agent-studio/README.md) | Deterministic AI agent pipeline builder |
| Career Flow | [`components/features/career-flow/README.md`](../components/features/career-flow/README.md) | AI-powered career discovery and role recommendations |
| ExoTwin | [`components/features/exotwin/README.md`](../components/features/exotwin/README.md) | Personal AI digital twin — skills passport, career coaching, credentials |
| Ignite Academy | [`components/features/ignite-academy/README.md`](../components/features/ignite-academy/README.md) | Learning platform — micro-lessons, scenarios, team training |
| Ignite Exchange | [`components/features/ignite-exchange/README.md`](../components/features/ignite-exchange/README.md) | Recognition, kudos, pulse surveys, org sentiment |
| Portal | [`components/features/portal/README.md`](../components/features/portal/README.md) | Living Ops app launcher / unified workspace hub |

---

## Feature & Product Specifications

- [agent-studio.md](Docs/agent-studio.md): MVP spec for an Agent Studio page where
  users design deterministic agent workflows.
- [community.md](Docs/community.md): MVP spec for community topics, comment
  analysis, and evidence mapping.
- [leadership-governance.md](Docs/leadership-governance.md): Governance and
  policy layer design for safe AI usage and leader review flows.
- [skill-based-hiring.md](Docs/skill-based-hiring.md): Skills-first hiring and
  internal coverage canvas specification.
- [talent-studio-enhance.md](Docs/talent-studio-enhance.md): Blueprint for
  enhancing Talent Studio with an editable org graph and gap analysis.
- [talent-studio-data-model.md](Docs/talent-studio-data-model.md): Supabase data
  model for Talent Studio (tables, PKs, logical FKs, relationships, and migration guidance).
- [workflow.md](Docs/workflow.md): Feature specification for the Workflow
  Builder MVP (original version).
- [workflow-v2.md](Docs/workflow-v2.md): Refined, structured Workflow Builder v2
  specification.
- [workflow-analytics.md](Docs/workflow-analytics.md): Overview of workflow
  analytics features and UI.
- [workflow-analytics-logic.md](Docs/workflow-analytics-logic.md): Detailed
  analytics algorithms and metrics definitions.
- [workflow-builder-collaboration-features.md](Docs/workflow-builder-collaboration-features.md):
  Realtime collaboration MVP design (presence, chat, optional voice).

---

## Implementation Plans & Prototypes

- [ai-workflow-builder.md](Docs/ai-workflow-builder.md): Prototype overview and
  design for a voice-driven workflow co-pilot.
- [ai-workflow-builder-implementation-plan.md](Docs/ai-workflow-builder-implementation-plan.md):
  Detailed implementation plan and completed feature list for the AI Workflow
  Builder.
- [omniverse-viewer-integration.md](Docs/omniverse-viewer-integration.md): Plan to
  embed the Omniverse web viewer at `/Omniverse` (local stream-only integration).
- [omniverse-platform-integration.md](Docs/omniverse-platform-integration.md): API
  contract and platform-handling for Omniverse run metrics.
- [EXECUTIVE_STRATEGY_STUDIO_USER_STORY.md](Docs/EXECUTIVE_STRATEGY_STUDIO_USER_STORY.md):
  User stories for the Executive Strategy Studio.
- [STRATEGY_STUDIO_ARCHITECTURE_GAP_LIST.md](Docs/STRATEGY_STUDIO_ARCHITECTURE_GAP_LIST.md):
  Architecture gap analysis for the Strategy Studio.
- [talent-service-extraction-phase-1.md](Docs/talent-service-extraction-phase-1.md):
  Non-breaking phase-1 plan to extract Talent Studio backend into a separate service repo.
