# Documentation Structure

Visual hierarchy of all documentation in the IGNIZIA platform. Use this as a map to find the right doc

---

## Tree view

```
ignizia-platform/
│
├── README.md                          ← Project overview, tech stack, quick start, doc index
├── DEVELOPMENT.md                     ← Full dev pipeline (internal: stack, data, deployment, AI tooling)
├── CONTRACTOR_GUIDE.md                ← External-safe onboarding (no internal sections)
├── AGENTS.md                          ← Rules for AI coding agents (design system, colors, QA)
├── DESIGN_SYSTEM_COLORS.md            ← Brand palette, semantic tokens, usage examples
├── REFACTORING_PLAN.md                ← Migration history (Vite → Next.js)
├── DOCS_STRUCTURE.md                  ← This file — documentation map
│
├── .github/
│   └── pull_request_template.md       ← PR checklist (colors, buttons, badges)
│
├── Docs/                              ← Product specs & implementation notes (table of contents: Docs/README.md)
│   ├── README.md                      ← Index of all Docs/ + feature README links
│   │
│   ├── Feature & product specs
│   ├── agent-studio.md
│   ├── community.md
│   ├── leadership-governance.md
│   ├── skill-based-hiring.md
│   ├── talent-studio-enhance.md
│   ├── talent-studio-data-model.md
│   ├── workflow.md
│   ├── workflow-v2.md
│   ├── workflow-analytics.md
│   ├── workflow-analytics-logic.md
│   ├── workflow-builder-collaboration-features.md
│   │
│   ├── Implementation plans & prototypes
│   ├── ai-workflow-builder.md
│   ├── ai-workflow-builder-implementation-plan.md
│   ├── omniverse-viewer-integration.md
│   ├── omniverse-platform-integration.md
│   ├── EXECUTIVE_STRATEGY_STUDIO_USER_STORY.md
│   └── STRATEGY_STUDIO_ARCHITECTURE_GAP_LIST.md
│
└── components/
    └── features/
        ├── dashboard/
        │   └── README.md              ← Control Tower, lenses, drill-down
        ├── community/
        │   └── README.md              ← Topics, comments, AI analysis
        ├── governance/
        │   └── README.md              ← Policy wizard, approval queue, audit
        ├── workflow-builder/
        │   └── README.md              ← DAG editor, AI co-pilot, collaboration
        ├── strategy-studio/
        │   └── README.md              ← Executive strategy, propagation, copilot
        ├── talent-studio/
        │   └── README.md              ← ExpertSuite v3, workforce intelligence
        ├── agent-studio/
        │   └── README.md              ← Deterministic agent pipelines
        ├── career-flow/
        │   └── README.md              ← Career discovery, role recommendations
        ├── exotwin/
        │   └── README.md              ← Digital twin, skills passport, coaching
        ├── ignite-academy/
        │   └── README.md              ← Micro-lessons, scenarios, team training
        ├── ignite-exchange/
        │   └── README.md              ← Kudos, recognition, sentiment
        └── portal/
            └── README.md              ← Living Ops app launcher
```

---

## By purpose


| Purpose                                    | Where to look                                                              |
| ------------------------------------------ | -------------------------------------------------------------------------- |
| **Start here / project overview**          | [README.md](README.md)                                                     |
| **How we develop (internal)**              | [DEVELOPMENT.md](DEVELOPMENT.md)                                           |
| **Onboard a contractor**                   | [CONTRACTOR_GUIDE.md](CONTRACTOR_GUIDE.md)                                 |
| **UI / design rules**                      | [AGENTS.md](AGENTS.md), [DESIGN_SYSTEM_COLORS.md](DESIGN_SYSTEM_COLORS.md) |
| **Product specs & design docs**            | [Docs/README.md](Docs/README.md) → then the specific `Docs/*.md` file      |
| **How a feature works / how to extend it** | `components/features/<name>/README.md`                                     |
| **PR checklist**                           | [.github/pull_request_template.md](.github/pull_request_template.md)       |
| **Migration history**                      | [REFACTORING_PLAN.md](REFACTORING_PLAN.md)                                 |


---

## Counts


| Location                 | Count                                                                                                     |
| ------------------------ | --------------------------------------------------------------------------------------------------------- |
| Root (`/`)               | 7 (README, DEVELOPMENT, CONTRACTOR_GUIDE, AGENTS, DESIGN_SYSTEM_COLORS, REFACTORING_PLAN, DOCS_STRUCTURE) |
| `.github/`               | 1                                                                                                         |
| `Docs/`                  | 17 (README + 16 spec/plan files)                                                                          |
| `components/features/*/` | 12 (one README per feature)                                                                               |
| **Total**                | **37** `.md` files                                                                                        |


