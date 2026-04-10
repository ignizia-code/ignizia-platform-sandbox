# IGNIZIA Platform — Contractor Onboarding Guide

Welcome to the IGNIZIA platform. This guide gives you everything you need to set up your development environment, understand the codebase, and contribute code that meets the project's standards.

---

## Table of Contents

1. [What is IGNIZIA?](#1-what-is-ignizia)
2. [Tech Stack](#2-tech-stack)
3. [Development Environment Setup](#3-development-environment-setup)
4. [Environment Variables](#4-environment-variables)
5. [Repository Structure](#5-repository-structure)
6. [Architecture Overview](#6-architecture-overview)
7. [Coding Standards](#7-coding-standards)
8. [Comment Policy](#8-comment-policy)
9. [Design System](#9-design-system)
10. [Pull Request Process](#10-pull-request-process)
11. [Working on a Feature Module](#11-working-on-a-feature-module)
12. [Getting Help](#12-getting-help)

---

## 1. What is IGNIZIA?

IGNIZIA is an enterprise intelligence platform for workforce management, strategic planning, workflow automation, and organizational governance. It consists of roughly 12 distinct feature modules — each self-contained under `components/features/<name>/`.

As a contractor you will be scoped to **one or two specific feature modules**. You do not need to understand the entire platform to contribute effectively.

---

## 2. Tech Stack

| Layer | Technology | Version |
|---|---|---|
| Language | TypeScript (strict) | ~5.8 |
| Framework | Next.js App Router | ^15.0 |
| UI | React 19, Tailwind CSS 3.4 | ^19, ^3.4 |
| AI / LLM | Vercel AI SDK, OpenAI SDK | ^6 |
| Database | Supabase (PostgreSQL) | ^2 |
| Charting | Recharts | ^3 |
| Animation | Framer Motion | ^12 |
| Icons | Lucide React | ^0.574 |
| 3D / WebGL | React Three Fiber, Three.js | ^9, ^0.182 |
| Graph layout | Dagre | ^2 |
| Validation | Zod | ^4 |
| Hosting | Vercel | — |

---

## 3. Development Environment Setup

### Prerequisites

- **Node.js** v20 or later
- **npm** v10 or later
- Git

### Setup

```bash
# 1. Clone the repository (your team lead will give you access to the correct branch)
git clone <repo-url>
cd ignizia-platform

# 2. Install dependencies
npm install

# 3. Set up environment variables (see section 4)
cp .env.example .env.local
# Fill in the values provided by your team lead

# 4. Start the development server
npm run dev
# App runs at http://localhost:3000
```

### Useful commands

| Command | What it does |
|---|---|
| `npm run dev` | Start local dev server with fast refresh |
| `npm run build` | Production build (catches build-time errors) |
| `npm run lint` | Run ESLint |
| `npx tsc --noEmit` | Type-check without emitting — **run before submitting a PR** |

---

## 4. Environment Variables

You will receive a `.env.local` file from your team lead. It contains the variables needed to run the project locally. **Never commit this file.**

The required variables are:

| Variable | Purpose |
|---|---|
| `OPENAI_API_KEY` | API key for OpenAI (LLM features, transcription, text-to-speech) |
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase public anonymous key |

If you get an error about a missing environment variable, ask your team lead.

---

## 5. Repository Structure

```
ignizia-platform/
├── app/                        # Next.js App Router pages and API routes
│   ├── dashboard/              # All dashboard pages (share Sidebar + Header layout)
│   └── api/                    # Serverless API route handlers
│
├── components/
│   ├── ui/                     # Shared primitives: Button, Badge, etc.
│   ├── layout/                 # App shell: Sidebar, Header
│   └── features/               # Self-contained feature modules ← your work lives here
│       ├── dashboard/
│       ├── community/
│       ├── governance/
│       ├── workflow-builder/
│       ├── strategy-studio/
│       ├── talent-studio/
│       ├── agent-studio/
│       ├── career-flow/
│       ├── exotwin/
│       ├── ignite-academy/
│       ├── ignite-exchange/
│       └── portal/
│
├── lib/                        # Shared utilities, Supabase helpers, hooks
├── types/                      # Shared TypeScript type definitions
├── Docs/                       # Product specifications and design notes
└── public/                     # Static assets (logo, SVGs)
```

Each feature folder under `components/features/` contains a `README.md` that explains what that module does, its key files, and how to extend it. Start there for any feature you are assigned to.

---

## 6. Architecture Overview

```
Browser (React 19)
  │
  ├── components/features/**   — Feature UI components
  ├── React Context             — Shared state within features
  │
  └── HTTP fetch / AI SDK streaming
        │
        ▼
  app/api/**  (Next.js serverless route handlers on Vercel)
        │
        ├── OpenAI API   — LLM completions, Whisper transcription, TTS
        └── Supabase     — PostgreSQL read/write
```

### How pages work

- Pages live in `app/dashboard/<page-name>/page.tsx`
- They import and render components from `components/features/<feature-name>/`
- The shared layout (sidebar + header) is applied automatically via `app/dashboard/layout.tsx`

### How API routes work

- Each folder under `app/api/` exports `GET` and/or `POST` handler functions
- They run serverless on Vercel — no persistent server process
- They call external services (OpenAI, Supabase) using keys from environment variables

### State management

- No Redux or Zustand — the project uses React Context for cross-component state
- Persistent data is stored in Supabase; transient state stays in React

---

## 7. Coding Standards

### Naming conventions

| Item | Convention | Example |
|---|---|---|
| React components | PascalCase | `WorkflowCanvas.tsx` |
| Feature folders | kebab-case | `workflow-builder/` |
| Hooks | camelCase + `use` prefix | `useWorkflowCollaboration.ts` |
| Utility functions | camelCase | `formatDate.ts` |
| Types / interfaces | PascalCase | `WorkflowNode`, `UserProfile` |

### Imports — always use the `@/` alias

```typescript
// correct
import { Button } from '@/components/ui';
import { supabase } from '@/lib/supabase/client';

// incorrect — never use relative paths like this
import { Button } from '../../../components/ui';
```

### TypeScript

- `strict: true` is enabled — avoid `any` unless absolutely necessary
- Run `npx tsc --noEmit` before every PR — the CI will fail if types are broken

### ESLint

Run `npm run lint` before submitting. Fix all reported errors. Warnings can be left with a comment explaining why.

### File length

Keep component files focused. If a file grows beyond ~300 lines, consider splitting into sub-components within the same feature folder.

---

## 8. Comment Policy

Write comments to explain **why**, not **what**. The code shows what is happening; comments are for intent that cannot be expressed in the code.

**Good comments:**
- Explain a non-obvious trade-off
- Document a workaround for a known library bug
- Describe a business rule that has no other documentation

**Avoid:**
- `// Import the module`
- `// Increment the counter`
- `// Return the result`

---

## 9. Design System

The IGNIZIA design system uses a custom Tailwind token set. **You must follow it exactly** — raw hex colors and stock Tailwind accent classes are not allowed.

### Key rule

| Allowed | Not allowed |
|---|---|
| `bg-brand-blue`, `text-brand-green` | `#1a2b3c`, `rgb(...)` |
| `bg-primary`, `text-success`, `bg-warning/10` | `bg-blue-500`, `text-rose-600` |
| `bg-background-light`, `bg-card-dark` | Custom inline styles for colors |

### Shared UI components

Before building any button, badge, or chip from scratch, check `components/ui/`:
- `Button` — covers primary, secondary, ghost, danger, and success CTAs
- `Badge` — covers info, success, warning, danger, and neutral status chips

### Reference files

These are the canonical examples of correct brand usage in the UI:
- `components/features/auth/LoginPage.tsx` — hero, logo, branding
- `components/layout/Sidebar.tsx` — nav shell
- `components/layout/Header.tsx` — top bar

### Full reference

Read [`DESIGN_SYSTEM_COLORS.md`](DESIGN_SYSTEM_COLORS.md) before writing any styles. Read [`AGENTS.md`](AGENTS.md) for the complete set of UI rules.

---

## 10. Pull Request Process

1. Work on a named branch, not directly on `main` (e.g., `feature/talent-studio-gap-fix`)
2. Before opening a PR:
   - Run `npx tsc --noEmit` — zero type errors required
   - Run `npm run lint` — fix all errors
   - Run `npm run build` — build must pass
3. Open a PR against `main`; the PR template (`.github/pull_request_template.md`) will populate automatically — fill in every checkbox
4. A core team member will review and may request changes before merging
5. Do not merge your own PR

### PR checklist highlights

The PR template includes specific checks for:
- No raw hex color values in component files
- Only IGNIZIA brand/semantic Tailwind classes used
- Shared `Button`/`Badge` primitives used for new CTAs
- TypeScript build passing

---

## 11. Working on a Feature Module

Each feature module lives in `components/features/<name>/` and has:
- A `README.md` — start here to understand the feature
- An `index.ts` — barrel exports for the feature's public interface
- Component files, sub-folders for complex features
- Any feature-specific hooks, utilities, or types co-located in the folder

### Steps when starting on a feature

1. Read the feature's `README.md`
2. Check `Docs/` for any product specification for that feature
3. Identify which `app/api/` routes the feature uses
4. Understand what data the feature reads/writes and where (Supabase? React Context?)
5. Make your changes in a branch, following the standards in section 7

### Do not touch

Unless explicitly asked to by your team lead:
- `lib/supabase/client.ts` — the database client configuration
- `tailwind.config.ts` — the design token definitions
- `app/layout.tsx` — the root layout
- `.github/workflows/deploy.yml` — the deployment pipeline
- Any `types/index.ts` global type file (coordinate with the team first)

---

## 12. Getting Help

- **Design questions**: read `DESIGN_SYSTEM_COLORS.md` first; then ask your team lead
- **Architecture questions**: read the feature's `README.md` and `Docs/` entry; then ask
- **Type errors**: run `npx tsc --noEmit` for the full error list; check the types in `types/`
- **Lint errors**: run `npm run lint`; most errors have a clear fix
- **Access issues** (Supabase, Vercel, etc.): contact your team lead — do not attempt to create accounts or change platform settings yourself
