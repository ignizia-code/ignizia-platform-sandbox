# IGNIZIA Platform

An enterprise-grade intelligence platform built on Next.js 15, covering workforce intelligence, workflow automation, AI-driven strategy, governance, community, and 3D simulation — all in one cohesive shell

---

## Documentation Index

| Document | Purpose |
|---|---|
| **[DOCS_STRUCTURE.md](DOCS_STRUCTURE.md)** | Map of all documentation — tree view and index by purpose |
| **[DEVELOPMENT.md](DEVELOPMENT.md)** | Full development pipeline: stack, architecture, data, deployment, coding standards, security |
| **[Docs/talent-studio-data-model.md](Docs/talent-studio-data-model.md)** | Talent Studio Supabase schema and relationship map (PK/FK/logical links) |
| **[Docs/talent-service-extraction-phase-1.md](Docs/talent-service-extraction-phase-1.md)** | Phase-1 extraction plan for moving Talent backend behind a separate service repo |
| **[CONTRACTOR_GUIDE.md](CONTRACTOR_GUIDE.md)** | External-safe onboarding guide for contractors and external reviewers |
| **[AGENTS.md](AGENTS.md)** | Rules for AI coding agents: design system, color constraints, QA checklist |
| **[DESIGN_SYSTEM_COLORS.md](DESIGN_SYSTEM_COLORS.md)** | Brand palette, semantic color tokens, usage examples |
| **[REFACTORING_PLAN.md](REFACTORING_PLAN.md)** | Completed migration history (Vite → Next.js App Router) |
| **[Docs/README.md](Docs/README.md)** | Index of all product specifications and feature design docs |

---

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 15 (App Router) |
| Language | TypeScript 5.8 (strict mode) |
| UI | React 19, Tailwind CSS 3.4 |
| AI / LLM | Vercel AI SDK v6, OpenAI SDK v6 |
| Database | Supabase (PostgreSQL) |
| Charts | Recharts v3 |
| Animation | Framer Motion v12 |
| Icons | Lucide React |
| 3D / WebGL | React Three Fiber, Three.js, NVIDIA Omniverse WebRTC |
| Graph layout | Dagre (workflow builder DAG) |
| Validation | Zod v4 |
| Hosting | Vercel |
| CI/CD | GitHub Actions |

---

## Repository Structure

```
ignizia-platform/
├── app/                        # Next.js App Router
│   ├── layout.tsx              # Root layout (fonts, global providers)
│   ├── page.tsx                # Root redirect
│   ├── globals.css
│   ├── dashboard/              # Dashboard route group (Sidebar + Header shell)
│   │   ├── layout.tsx
│   │   ├── page.tsx
│   │   ├── community/
│   │   ├── governance/
│   │   ├── governance-studio/
│   │   ├── analytics/
│   │   ├── learning-hub/
│   │   ├── team-pulse/
│   │   ├── portal/
│   │   ├── ignite/
│   │   └── career-flow/        # Multi-step career flow sub-route
│   ├── Omniverse/              # Standalone Omniverse page (no sidebar)
│   └── api/                    # Serverless API route handlers
│       ├── chatbot/
│       ├── ai-builder/
│       ├── org-builder/
│       ├── strategy-copilot/
│       ├── workflow-extract/
│       ├── execute-model/
│       ├── comments/
│       ├── comments-batch/
│       ├── topic/
│       ├── topic-analysis/
│       ├── topics/
│       ├── transcribe/
│       ├── text-to-speech/
│       ├── user-profile-analysis/
│       └── omniverse/run-metrics/
│
├── components/
│   ├── ui/                     # Shared primitives: Button, Badge, etc.
│   ├── layout/                 # Sidebar, Header
│   ├── chat/                   # ChatBot
│   ├── omniverse/              # Omniverse viewer components
│   └── features/               # Feature modules (see below)
│       ├── auth/
│       ├── dashboard/
│       ├── community/
│       ├── governance/
│       ├── workflow-builder/
│       ├── strategy-studio/
│       ├── talent-studio/      # Includes v3/ sub-module (ExpertSuite)
│       ├── agent-studio/
│       ├── career-flow/
│       ├── exotwin/
│       ├── ignite-academy/
│       ├── ignite-exchange/
│       └── portal/
│
├── lib/                        # Shared utilities and data access
│   ├── supabase/client.ts      # Supabase singleton
│   ├── workflowStorage/        # Workflow CRUD (Supabase)
│   ├── workflowCollaboration/
│   ├── propagation/
│   ├── career-flow/
│   ├── governanceStorage.ts
│   ├── strategyStorage.ts
│   ├── objectiveStorage.ts
│   ├── policyEnforcement.ts
│   ├── sensitivityClassifier.ts
│   └── db.ts                   # Legacy sql.js stub (being replaced by Supabase)
│
├── types/                      # Shared TypeScript type definitions
├── Docs/                       # Product specs and implementation notes
├── public/                     # Static assets (logo, SVGs)
├── .github/
│   ├── workflows/deploy.yml    # GitHub Actions → Vercel deploy trigger
│   └── pull_request_template.md
├── AGENTS.md
├── DESIGN_SYSTEM_COLORS.md
├── DEVELOPMENT.md
├── CONTRACTOR_GUIDE.md
├── REFACTORING_PLAN.md
├── tailwind.config.ts
├── tsconfig.json
├── next.config.ts
└── .env.example
```

---

## Feature Modules

| Module | Route | Description |
|---|---|---|
| Dashboard | `/dashboard` | Intelligence monitoring with role-based "lenses" |
| Community | `/dashboard/community` | Discussion topics, comment analysis, collective intelligence |
| Governance | `/dashboard/governance` | Policy management, approvals, audit trail, compliance |
| Workflow Builder | `/dashboard/governance-studio` | Visual DAG workflow builder with AI co-pilot and real-time collaboration |
| Strategy Studio | `/dashboard` (integrated) | Executive strategy planning and org lens views |
| Talent Studio v3 | `/dashboard` (integrated) | Full workforce intelligence suite (ExpertSuite) |
| Agent Studio | `/dashboard` (integrated) | Design deterministic agent workflows |
| Career Flow | `/dashboard/career-flow` | Multi-step career progression and analysis tool |
| ExoTwin | `/dashboard/portal` | Personal AI digital twin — skills passport, career coaching, credentials |
| Ignite Academy | `/dashboard/learning-hub` | Learning, micro-lessons, training scenarios, skill mapping |
| Ignite Exchange | `/dashboard/ignite` | Kudos, recognition, pulse surveys, org sentiment |
| Portal | `/dashboard/portal` | Gateway / "Living Ops" app launcher |
| Omniverse | `/Omniverse` | NVIDIA Omniverse 3D simulation viewer |

---

## Quick Start

```bash
# Install dependencies
npm install

# Copy environment template and fill in your keys
cp .env.example .env.local

# Start the development server
npm run dev

# Type-check without emitting
npx tsc --noEmit

# Build for production
npm run build
```

See [DEVELOPMENT.md](DEVELOPMENT.md) for the full setup guide, including required environment variables.

---

## Contributing

- Read [DEVELOPMENT.md](DEVELOPMENT.md) for coding standards, design system rules, and the PR process.
- External contributors: read [CONTRACTOR_GUIDE.md](CONTRACTOR_GUIDE.md) instead.
- Every PR is checked against the template in [`.github/pull_request_template.md`](.github/pull_request_template.md).
