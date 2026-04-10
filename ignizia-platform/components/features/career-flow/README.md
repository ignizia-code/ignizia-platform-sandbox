# Career Flow

A multi-step, AI-powered career discovery tool that helps employees identify their next career move, get personalized role recommendations, and understand the skills gap between their current position and their target.

---

## What it does

- **Home**: landing page that shows the user's current profile status and directs them to start or continue the discovery flow
- **Onboarding**: multi-step form collecting the user's current role, skills, experience, and career aspirations
- **Analyzing**: loading/processing page shown while the AI analyzes the user's profile against available roles
- **Results**: displays AI-recommended roles with match scores, skill gap breakdowns, and a personalized development roadmap

---

## Key files

| File | Purpose |
|---|---|
| `CareerFlowHome.tsx` | Entry point; shows profile summary if onboarding is complete, or prompts to start |
| `RoleDetailsSidebar.tsx` | Slide-out panel showing full detail for a selected suggested role: requirements, gap analysis, and next steps |
| `index.ts` | Barrel export |

App Router pages (in `app/dashboard/career-flow/`):

| File | Route | Purpose |
|---|---|---|
| `app/dashboard/career-flow/page.tsx` | `/dashboard/career-flow` | Renders `CareerFlowHome` |
| `app/dashboard/career-flow/onboarding/page.tsx` | `/dashboard/career-flow/onboarding` | Multi-step onboarding form |
| `app/dashboard/career-flow/analyzing/page.tsx` | `/dashboard/career-flow/analyzing` | AI analysis loading state |
| `app/dashboard/career-flow/results/page.tsx` | `/dashboard/career-flow/results` | Role recommendations and gap analysis |

---

## Architecture & data flow

```
/dashboard/career-flow          → CareerFlowHome
/dashboard/career-flow/onboarding → Onboarding form
        │  (on submit)
        ▼
/dashboard/career-flow/analyzing  → triggers AI analysis via lib/career-flow/actions/ai.ts
        │
        └── POST (server action) → OpenAI → role recommendations
        ▼
/dashboard/career-flow/results    → RoleDetailsSidebar (on role select)
```

State flows through `lib/career-flow/context/CareerContext.tsx`:
- `profile` — the user's current role, skills, and experience (set during onboarding)
- `suggestedRoles` — AI-generated role recommendations (set after analysis)
- `selectedRole` — the role currently selected in the results view

---

## API integrations

AI analysis is performed via a **Next.js Server Action** in `lib/career-flow/actions/ai.ts` (not an API route) — it runs server-side when called from the analyzing page.

---

## Data

- All career flow state (`profile`, `suggestedRoles`, `selectedRole`) is managed in **React Context** (`CareerContext`)
- State is **not persisted** between sessions — refreshing the page resets the flow
- `CareerFlowHome` detects whether onboarding is complete by checking `profile.name`, `profile.currentTitle`, and whether `suggestedRoles.length > 0`

---

## Current status & known gaps

- No persistence — career profiles and results are lost on page refresh
- No authentication — the profile is anonymous (no user ID linked to a Supabase record)
- The `analyzing` page shows a loading state but the actual AI call mechanics should be verified for error handling edge cases

---

## How to extend

- **Persist profiles**: create a `career_profiles` and `career_recommendations` table in Supabase; save/load via the Supabase client
- **Link to Talent Studio**: pull the user's current skills from the Talent Studio employee profile instead of requiring manual input during onboarding
- **Add learning path integration**: after showing role recommendations, deep-link to relevant courses in the Ignite Academy for each skill gap
