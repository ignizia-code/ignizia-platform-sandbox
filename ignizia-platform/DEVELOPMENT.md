# IGNIZIA Platform — Development Guide

This document is the single source of truth for how the IGNIZIA platform is built, run, and deployed. It answers the questions every new team member, engineering reviewer, or stakeholder should know before touching the codebase.

> **Internal / external marking convention used in this file:**
> Sections marked with 🔒 **INTERNAL** contain information that is for the core team only and should be removed before sharing with contractors or external reviewers. The file `CONTRACTOR_GUIDE.md` is a pre-cleaned external-safe version of this document.

---

## Table of Contents

1. [Languages & Frameworks](#1-languages--frameworks)
2. [Development Environment Setup](#2-development-environment-setup)
3. [Environment Variables & Secrets](#3-environment-variables--secrets)
4. [Architecture Overview](#4-architecture-overview)
5. [Data Storage](#5-data-storage)
6. [API Layer](#6-api-layer)
7. [Deployment Pipeline](#7-deployment-pipeline)
8. [Coding Standards](#8-coding-standards)
9. [Comment Policy](#9-comment-policy)
10. [Design System](#10-design-system)
11. [AI-Assisted Development Process](#11-ai-assisted-development-process)
12. [Security Practices](#12-security-practices)
13. [Contractor Contribution Guide](#13-contractor-contribution-guide)

---

## 1. Languages & Frameworks

| Layer | Technology | Version | Why |
|---|---|---|---|
| Language | TypeScript | ~5.8 | Strict typing catches errors at build time; consistent across the entire repo |
| Framework | Next.js (App Router) | ^15.0 | File-system routing, serverless API routes, and SSR/SSG — all in one |
| UI runtime | React | ^19 | Latest concurrent features; used with Next.js |
| Styling | Tailwind CSS | ^3.4 | Utility-first CSS with a custom IGNIZIA design token system |
| AI / LLM | Vercel AI SDK (`ai`) + `@ai-sdk/openai` | ^6 | Streaming LLM responses; compatible with Next.js edge and serverless routes |
| AI / LLM (direct) | OpenAI SDK (`openai`) | ^6 | Used directly in API routes that need fine-grained response control |
| Database client | `@supabase/supabase-js` | ^2 | Connects to Supabase (PostgreSQL); used in both server-side API routes and client-side lib utilities |
| Charting | Recharts | ^3 | Composable chart components for analytics and dashboards |
| Animation | Framer Motion | ^12 | Page transitions and interactive UI animations |
| Icons | Lucide React | ^0.574 | Consistent SVG icon set |
| 3D / WebGL | `@react-three/fiber`, `@react-three/drei`, `three` | ^9, ^10, ^0.182 | Powers the Omniverse 3D viewer |
| Omniverse streaming | `@nvidia/omniverse-webrtc-streaming-library` | 5.6.0 | NVIDIA Omniverse WebRTC client for live simulation streaming |
| Graph layout | `@dagrejs/dagre`, `@dagrejs/graphlib` | ^2, ^3 | DAG layout engine for the Workflow Builder |
| Validation | Zod | ^4 | Runtime schema validation for API inputs |

### Fonts & iconography loaded via CDN
- **Inter** (Google Fonts) — primary display and body font
- **Material Icons Round** (Google CDN) — supplementary icons in certain UI panels

---

## 2. Development Environment Setup

### Prerequisites

- **Node.js** v20 or later (LTS recommended)
- **npm** v10 or later (comes with Node 20)
- A code editor — **Cursor** is the team's standard (see section 11)
- Git

### Local setup steps

```bash
# 1. Clone the repository
git clone <repo-url>
cd ignizia-platform

# 2. Install dependencies
npm install

# 3. Set up environment variables
cp .env.example .env.local
# Edit .env.local and fill in the required keys (see section 3)

# 4. Start the development server
npm run dev
# App runs at http://localhost:3000
```

### Useful commands

| Command | What it does |
|---|---|
| `npm run dev` | Start local dev server with Turbopack (fast refresh) |
| `npm run build` | Production build |
| `npm run start` | Serve the production build locally |
| `npm run lint` | Run ESLint across the codebase |
| `npx tsc --noEmit` | Type-check without emitting files — **run this before finishing any task** |

---

## 3. Environment Variables & Secrets

> 🔒 **INTERNAL** — The information in this section identifies where secrets live and what they control. Remove this section before sharing with external parties.

### Required variables

Create a `.env.local` file at the project root (never commit this file — it is covered by `.gitignore`).

| Variable | Required by | Purpose |
|---|---|---|
| `OPENAI_API_KEY` | All `app/api/` routes | Authenticates calls to the OpenAI API (LLM completions, transcription, TTS) |
| `NEXT_PUBLIC_SUPABASE_URL` | `lib/supabase/client.ts` | Supabase project URL — safe to expose to the browser (it is the project's public endpoint) |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | `lib/supabase/client.ts` | Supabase anonymous/public key — safe to expose to the browser; Row-Level Security policies control access |

### Where to find the values

> 🔒 **INTERNAL** — Keys are stored in the team's shared secure environment (ask Anthony for access). The OpenAI key is in the OpenAI dashboard under the IGNIZIA project. Supabase keys are in the Supabase dashboard → Project Settings → API.

### What not to commit

- `.env.local` — local secrets
- Any file containing an actual API key or password
- The Supabase service-role key (this has admin privileges and must never appear in the codebase)

---

## 4. Architecture Overview

The platform is a **Next.js App Router** application. The diagram below shows how the main layers relate:

```
┌──────────────────────────────────────────────────────────────────┐
│  Browser                                                         │
│  React 19 components  ◄──►  React Context (global state)        │
│  components/features/**    DashboardContext, CareerContext, etc. │
└───────────────┬──────────────────────────────────────────────────┘
                │ HTTP (fetch / Vercel AI SDK streaming)
┌───────────────▼──────────────────────────────────────────────────┐
│  Next.js App Router  (app/)                                      │
│  ├── /dashboard/**   — page components (route group)            │
│  ├── /Omniverse      — standalone Omniverse page                │
│  └── /api/**         — serverless route handlers                │
│       ├── Calls OpenAI (LLM, transcription, TTS)                │
│       ├── Reads/writes Supabase                                  │
│       └── Fetches NVIDIA Omniverse run metrics                  │
└───────────────┬──────────────────────────────────────────────────┘
                │ Supabase JS client
┌───────────────▼──────────────────────────────────────────────────┐
│  Supabase (hosted PostgreSQL)                                    │
│  lib/supabase/client.ts — singleton client                       │
│  lib/workflowStorage/supabase.ts — CRUD helpers                 │
│  lib/governanceStorage.ts, strategyStorage.ts, etc.             │
└──────────────────────────────────────────────────────────────────┘
                                    │
                       ┌────────────▼──────────────┐
                       │  External services         │
                       │  • OpenAI API              │
                       │  • NVIDIA Omniverse        │
                       └───────────────────────────┘
```

### Key structural conventions

```
app/                   # Routes only — no business logic
  dashboard/           # All dashboard pages share the Sidebar+Header layout
  api/                 # Serverless functions; each sub-folder = one endpoint

components/
  ui/                  # Reusable primitives (Button, Badge, etc.)
  layout/              # App shell (Sidebar, Header)
  features/<name>/     # Self-contained feature modules
    README.md          # What this feature does, its architecture, data, and gaps

lib/                   # Shared utilities, storage helpers, hooks
types/                 # Domain TypeScript types (centralized)
```

### State management

There is no global state library (no Redux, no Zustand). State is managed with:
- **React Context** for cross-component sharing within a feature (`DashboardContext`, `CareerContext`, `AppContext` in Talent Studio v3)
- **Local component state** (`useState`, `useReducer`) for UI-local state
- **Supabase** as the persistence layer for data that must survive page reloads

---

## 5. Data Storage

### Primary database: Supabase (PostgreSQL)

All persistent data lives in **Supabase** — a hosted PostgreSQL service.

- **Client singleton**: `lib/supabase/client.ts`  
  Uses `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY`.

- **Access pattern**: the Supabase client is used in two places:
  1. **`lib/` storage helpers** (e.g., `lib/workflowStorage/supabase.ts`) — called from client components
  2. **`app/api/` route handlers** — server-side access with the same anonymous key

- **Known tables** confirmed in the codebase:
  - Detailed Talent Studio relationship map: [`Docs/talent-studio-data-model.md`](Docs/talent-studio-data-model.md)

| Table | Managed by | Contents |
|---|---|---|
| `workflows` | `lib/workflowStorage/supabase.ts` | Workflow nodes, edges, metadata, ownership, sharing, revision history |
| `talent_departments` | `lib/talentStudioStorage/supabase.ts` | Department records used for role grouping |
| `talent_roles` | `lib/talentStudioStorage/supabase.ts` | Role records (manual and O*NET sourced), including sync metadata |
| `talent_role_requirements` | `lib/talentStudioStorage/supabase.ts` | Skill requirements per role (min level, weight, O*NET importance/level fields) |
| `talent_employees` | `lib/talentStudioStorage/supabase.ts` | Employee profile rows and role assignment |
| `talent_employee_assertions` | `lib/talentStudioStorage/supabase.ts` | Employee-to-skill assertion records |
| `talent_studio_collections` | `lib/talentStudioStorage/supabase.ts` | Keyed JSON payload collections (`plans`, `resources`, `tasks`, etc.) |
| `talent_studio_states` | `data/talent_studio_state_migration.sql` | Legacy snapshot table used only for migration/backfill |

> 🔒 **INTERNAL** — Additional tables (for governance policies, objectives, strategies, etc.) exist in the Supabase project but storage helpers for them (`governanceStorage.ts`, `strategyStorage.ts`, `objectiveStorage.ts`) may still be using in-memory state or local storage in the current prototype phase. Table schema is managed directly via the Supabase Dashboard — there are no migration files in the repo.

### Row-Level Security (RLS)

Supabase RLS policies control which rows each user can read or write. This is the primary data access control mechanism — the anonymous key alone does not grant unrestricted access.

### Legacy stub: sql.js (SQLite)

`lib/db.ts` is a **no-op stub** — all functions return empty results. It was the original approach (browser-side SQLite) and has been superseded by Supabase. It will be removed once the remaining storage modules are fully migrated.

### Transient / in-memory state

Some data that does not need to persist between sessions (e.g., analytics previews, local form drafts) is kept in React state only and is not stored in any database.

---

## 6. API Layer

All API endpoints live under `app/api/` as Next.js Route Handlers (serverless functions on Vercel).

| Endpoint | Method | External service | Purpose |
|---|---|---|---|
| `/api/chatbot` | POST | OpenAI (`gpt-5-nano`) | General-purpose IGNIZIA chat assistant; accepts a user message and optional system prompt |
| `/api/strategy-copilot` | POST | OpenAI (`gpt-4.1-nano`) | Executive Strategy Studio AI; generates/refines strategy JSON and plain-text explanations |
| `/api/ai-builder` | POST | OpenAI | AI workflow builder co-pilot — builds workflow node structures from natural language |
| `/api/org-builder` | POST | OpenAI | Org chart / structure generation from natural language |
| `/api/workflow-extract` | POST | OpenAI | Extracts structured workflow steps from free-form text |
| `/api/execute-model` | POST | OpenAI | Runs a model with custom parameters (used by Agent Studio) |
| `/api/comments` | POST | OpenAI | Analyzes a single community comment for sentiment, relevance, and evidence |
| `/api/comments-batch` | POST | OpenAI | Batch version of the comment analysis route |
| `/api/topic` | GET/POST | Supabase | Single discussion topic CRUD |
| `/api/topics` | GET | Supabase | List all discussion topics |
| `/api/topic-analysis` | POST | OpenAI | AI analysis of a community topic thread |
| `/api/user-profile-analysis` | POST | OpenAI | Analyzes a user profile for skills, gaps, and recommendations |
| `/api/transcribe` | POST | OpenAI Whisper | Transcribes audio input to text (used in voice workflow builder) |
| `/api/text-to-speech` | POST | OpenAI TTS | Converts text to speech audio (used in AI co-pilot responses) |
| `/api/omniverse/run-metrics` | GET | NVIDIA Omniverse | Fetches live run metrics from the Omniverse simulation server |

### Error handling convention

All API routes follow the pattern:
```typescript
try {
  // ... logic ...
  return NextResponse.json({ data });
} catch (error) {
  console.error('Route name error:', error);
  return NextResponse.json({ error: 'message', details: String(error) }, { status: 500 });
}
```

---

## 7. Deployment Pipeline

The platform is deployed to **Vercel** (serverless hosting) via **GitHub Actions**.

```
Developer machine
      │
      │  git push origin main
      ▼
GitHub repository (main branch)
      │
      │  Triggers .github/workflows/deploy.yml
      ▼
GitHub Actions runner
      │  Rewrites commit author to "Vercel Deploy <ignizia.ai@gmail.com>"
      │  (required to satisfy Vercel's deploy ownership check)
      │  git push --force-with-lease → main
      ▼
Vercel
      │  Detects push → runs `next build` → deploys
      ▼
Production URL (ignizia.vercel.app or custom domain)
```

### Key points

- **Trigger**: any push to `main` or `master`
- **Build command**: `next build` (runs automatically on Vercel)
- **Output**: `standalone` mode (`next.config.ts` sets `output: 'standalone'`)
- **Secrets on Vercel**: environment variables (`OPENAI_API_KEY`, Supabase keys) must be configured in the Vercel project dashboard under Settings → Environment Variables
- There is **no staging environment** currently; every merge to `main` goes straight to production

> 🔒 **INTERNAL** — The Vercel project is owned by the team Gmail account (`ignizia.ai@gmail.com`). Ask Anthony for access.

---

## 8. Coding Standards

### Naming conventions

| Item | Convention | Example |
|---|---|---|
| React components | PascalCase | `WorkflowCanvas.tsx` |
| Feature folders | kebab-case | `workflow-builder/` |
| Hooks | camelCase with `use` prefix | `useWorkflowCollaboration.ts` |
| Utility functions / files | camelCase | `formatDate.ts`, `workflowLayout.ts` |
| Types / interfaces | PascalCase | `WorkflowNode`, `UserProfile` |
| Constants | SCREAMING_SNAKE_CASE | `MAX_RETRIES` |

### Imports

Always use the `@/` path alias — never use relative `../../../` chains:

```typescript
// correct
import { Button } from '@/components/ui';
import { supabase } from '@/lib/supabase/client';

// incorrect
import { Button } from '../../../components/ui';
```

### TypeScript

- `strict: true` is enabled — no `any` casts without justification
- `noEmit: true` — the build catches type errors; always run `npx tsc --noEmit` before finishing a task
- `moduleResolution: "bundler"` — use modern import paths (no `.js` extensions on TypeScript files)

### ESLint

The project extends `next/core-web-vitals`. Key overrides:
- `react-hooks/exhaustive-deps` — off (team decision; hooks are managed manually)
- `react/no-unescaped-entities` — off
- `@next/next/no-img-element` — off

Run linting: `npm run lint`

### Design system enforcement

- **No raw hex colors** in component files (`#1a2b3c` etc.)
- **No stock Tailwind accent classes** (`bg-blue-500`, `text-rose-600`, etc.)
- Use only brand tokens (`bg-brand-blue`, `text-brand-green`) and semantic roles (`bg-primary`, `text-success`, etc.)
- See [DESIGN_SYSTEM_COLORS.md](DESIGN_SYSTEM_COLORS.md) for the full reference

### General hygiene

- Keep each component file focused on a single responsibility
- Co-locate styles, state, and logic within the feature module folder
- Shared primitives go in `components/ui/` — do not duplicate button/badge patterns
- Every feature module folder has (or will have) a `README.md`

---

## 9. Comment Policy

Comments in code should explain **why**, not **what**. The code itself shows what is happening; comments are for intent that cannot be expressed in the code.

**Write comments for:**
- Non-obvious architectural trade-offs ("We intentionally refetch here instead of caching because the Omniverse metrics change every 5 seconds")
- Workarounds for external library bugs or quirks
- Business logic rules that have no other documentation home

**Do not write comments for:**
- Narrating what the code does line by line (`// increment counter`)
- Describing imports (`// Import the module`)
- Documenting straightforward function calls

This keeps the codebase readable and avoids stale comments that contradict the actual code.

---

## 10. Design System

The IGNIZIA design system is shared across the entire platform.

| Resource | Purpose |
|---|---|
| [`DESIGN_SYSTEM_COLORS.md`](DESIGN_SYSTEM_COLORS.md) | Brand palette, semantic roles, before/after class examples |
| [`tailwind.config.ts`](tailwind.config.ts) | Source of truth for all color tokens (`theme.extend.colors`) |
| [`components/ui/Button.tsx`](components/ui/Button.tsx) | Shared button component — use for all CTAs |
| [`components/ui/Badge.tsx`](components/ui/Badge.tsx) | Shared badge/chip component — use for status labels |
| [`AGENTS.md`](AGENTS.md) | Full rules for agents and developers building UI |

**Reference files for visual patterns:**
- `components/features/auth/LoginPage.tsx` — hero layout, logo, branding
- `components/layout/Sidebar.tsx` — app shell nav with IGNIZIA branding
- `components/layout/Header.tsx` — top nav with primary accents

---

## 11. AI-Assisted Development Process

> 🔒 **INTERNAL** — This section describes the internal development workflow. It should not be shared with contractors or external reviewers as it reveals tooling preferences and IP management practices.

The team uses a **two-agent collaborative loop** to develop features efficiently and safely:

### Tools in use

| Tool | Role | Access |
|---|---|---|
| **Cursor IDE** (claude model for complex tasks, auto for quick tasks) | Code implementation — writes, edits, and reviews code directly in the codebase | Codebase only |
| **ChatGPT** (via SharePoint + architecture document) | Context + requirements — has access to the full product architecture document and meeting notes | Product docs, no codebase access |
| **Google AI Studio** | Converts high-level prompts into structured implementation plans before handing off to Cursor | Intermediary |

### The loop

1. **Context building**: ChatGPT is given the architecture document and any relevant meeting notes or screenshots. It produces a full-context requirements brief.
2. **Plan generation**: Google AI Studio (or ChatGPT) turns the brief into a structured implementation plan — listing files to touch, component structure, data flow.
3. **Implementation**: The plan is pasted into Cursor as a long structured prompt. Cursor implements against the codebase.
4. **Review & iteration**: The output is reviewed; discrepancies are flagged back to ChatGPT to refine the plan, then Cursor re-implements. Multiple cycles reduce blind spots.
5. **QA**: `npx tsc --noEmit` and `npm run lint` are run before marking any task complete.

### Why this works

Cursor only sees what it needs (the code), while ChatGPT holds the broader product context. This keeps IP-sensitive product decisions out of the AI coding layer, and reduces hallucinated implementations because Cursor works from a concrete, reviewed plan.

### Important caution

Long, structured, context-rich prompts produce significantly better results than short vague ones. Before starting any non-trivial Cursor task, invest time in writing the full context into the prompt.

---

## 12. Security Practices

### Secrets management
- All API keys and credentials live in `.env.local` — this file is git-ignored and never committed
- `.env.example` documents which variables are required but contains no real values
- The Supabase **anonymous key** is intentionally public (it is safe to expose to browsers); Supabase Row-Level Security policies enforce data access rules
- The Supabase **service-role key** has admin privileges — it must never appear in any file in the repository

### What goes to GitHub
The repository is hosted on GitHub. The following must never be committed:
- `.env.local` or any file with real credentials
- Private keys or tokens of any kind
- Internal product documents or architecture files that contain IP (those stay in SharePoint)

### Dependency security
- Dependencies are managed via `npm`; run `npm audit` periodically to check for known vulnerabilities
- Keep dependencies reasonably up to date, especially security-critical ones (OpenAI SDK, Supabase client)

### Contractor access model
> 🔒 **INTERNAL** — When bringing in external contractors: grant them access to the GitHub repository (read/write on their working branch only, not `main`). Do **not** share the Supabase dashboard, Vercel dashboard, OpenAI keys, or any internal architecture documents. Contractors get `CONTRACTOR_GUIDE.md` and a scoped `.env.local` with a dev-only OpenAI key and a read-only Supabase key for a staging environment (to be set up when needed).

---

## 13. Contractor Contribution Guide

This section is extracted and expanded in [`CONTRACTOR_GUIDE.md`](CONTRACTOR_GUIDE.md). The full external-safe version lives there.

### Summary for internal reference

When a contractor joins:

1. Share `CONTRACTOR_GUIDE.md` (not this file)
2. Give them repository access on a named feature branch only
3. Provide a scoped `.env.local` (dev-only keys, no production credentials)
4. Scope their work to a single feature module — they do not need access to `lib/supabase/client.ts` configuration, Vercel, or the Supabase dashboard
5. All PRs go through the standard PR template in `.github/pull_request_template.md`
6. Code review by a core team member before merge to `main`

### What contractors can safely see
- The full codebase (it is the product — they need to see it to contribute)
- `CONTRACTOR_GUIDE.md`, `DESIGN_SYSTEM_COLORS.md`, `AGENTS.md`, feature `README.md` files
- Their assigned feature module's `Docs/` entry (if one exists)

### What contractors should NOT see
- This document (remove the 🔒 INTERNAL sections)
- Internal architecture documents or SharePoint materials
- Production Supabase or Vercel dashboards
- The internal AI tooling process (section 11)
