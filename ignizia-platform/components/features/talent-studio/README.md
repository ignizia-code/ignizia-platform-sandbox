# Talent Studio (ExpertSuite v3)

The workforce intelligence suite of the IGNIZIA platform. Provides a comprehensive multi-page application for understanding the organization's workforce — roles, skills, gaps, employees, capacity planning, and learning — all in one place.

Product spec: [`Docs/talent-studio-enhance.md`](../../../Docs/talent-studio-enhance.md), [`Docs/skill-based-hiring.md`](../../../Docs/skill-based-hiring.md)  
Data model reference: [`Docs/talent-studio-data-model.md`](../../../Docs/talent-studio-data-model.md)

---

## What it does

The Talent Studio is a self-contained multi-page application (`v3/ExpertSuite.tsx`) with its own navigation (`v3/components/Layout.tsx`) and global state (`v3/store/AppContext.tsx`). It contains the following pages:

| Page | Route key | Purpose |
|---|---|---|
| Dashboard | `dashboard` | Summary KPIs: workforce health, skill coverage, risk indicators |
| Roles Overview | `roles` | List of all organizational roles with skill requirements and fill rates |
| Role Detail | `role-detail` | Deep dive into a single role: requirements, current holders, gaps |
| Employees Overview | `employees` | Searchable employee directory with skill and readiness indicators |
| Employee Profile | `employee-profile` | Individual employee: skills, readiness, learning progress, gap analysis |
| Learning Hub | `learning` | Learning paths and resources mapped to role skill gaps |
| Workforce Planning | `planning` | Headcount planning, attrition risk, and capacity forecasts |
| Capability Architecture | `architecture` | Org-wide skill taxonomy and capability map |
| Project Resourcing | `resourcing` | Match employees to project needs by skill availability |
| Readiness & Risk | `readiness` | Workforce readiness scores and risk flagging by role/team |
| Workforce Gaps | `workforce-gaps` | Gap analysis: required vs. available skills across the org |
| Org Intelligence | `org-intelligence` | AI-driven insights about the organization structure and workforce patterns |
| Integrations & Outbox | `outbox` | Integration status and outbound data connections |
| Admin Settings | `settings` | Studio configuration settings |

---

## Key files

| File / folder | Purpose |
|---|---|
| `v3/ExpertSuite.tsx` | Root component; page router (switch on `currentPage` from AppContext) |
| `v3/store/AppContext.tsx` | Global state for the studio: current page, selected role/employee, navigation history |
| `v3/components/Layout.tsx` | Sub-shell layout with the studio's own sidebar navigation |
| `v3/components/Link.tsx` | Internal navigation link that updates `currentPage` in AppContext |
| `v3/pages/Dashboard.tsx` | Workforce summary KPI dashboard |
| `v3/pages/RolesOverview.tsx` | Roles list |
| `v3/pages/RoleDetail.tsx` | Single role deep-dive |
| `v3/pages/EmployeesOverview.tsx` | Employee directory |
| `v3/pages/EmployeeProfile.tsx` | Individual employee profile |
| `v3/pages/WorkforceGaps.tsx` | Gap analysis page |
| `v3/pages/OrgIntelligence.tsx` | AI org insights page |
| `v3/pages/WorkforcePlanning.tsx` | Headcount planning |
| `v3/pages/CapabilityArchitecture.tsx` | Skill taxonomy map |
| `v3/pages/ProjectResourcing.tsx` | Project-to-skill matching |
| `v3/pages/ReadinessRisk.tsx` | Readiness and risk indicators |
| `v3/pages/LearningHub.tsx` | Learning paths |
| `v3/pages/IntegrationsOutbox.tsx` | Integration status |
| `v3/data/seed.ts` | Seeded mock workforce data (employees, roles, skills) |
| `v3/types.ts` | TypeScript types specific to the v3 studio |
| `v3/lib/utils.ts` | Utility functions for the studio |
| `shared/` | Shared sub-components used across v3 pages (ProductionAlerts, FactorySkillsOverview, SkillsIntelligence) |

---

## Architecture & data flow

```
app/dashboard/page.tsx (or integrated panel)
    │
    └─► TalentStudio.tsx (entry wrapper)
            │
            └─► v3/ExpertSuite.tsx
                    │
                    ├─► AppContext (currentPage, selectedRole, selectedEmployee)
                    │
                    ├─► v3/components/Layout.tsx (studio sidebar nav)
                    │
                    └─► v3/pages/<ActivePage>.tsx
                            │
                            └── Supabase persistence (`lib/talentStudioStorage/supabase.ts`)
```

Navigation within the studio is **client-side only** — the URL does not change. `AppContext` manages the current page and selected entities. `Link.tsx` is a thin wrapper that calls `setCurrentPage` from context.

---

## API integrations

- `POST /api/user-profile-analysis` — used on the Employee Profile page to run an AI analysis of an employee's skill profile, identify gaps, and generate recommendations

---

## Data

- **Current state**: Talent Studio reads and writes persisted data through `lib/talentStudioStorage/supabase.ts`
- **Primary tables**: `talent_departments`, `talent_roles`, `talent_role_requirements`, `talent_employees`, `talent_employee_assertions`, `talent_studio_collections`
- **Legacy migration source**: `talent_studio_states` (backfill only; not runtime)
- **Role source**: Roles can be synced from O*NET into Supabase and then rendered from local DB cache
- **Fallback behavior**: if persistent load returns no data, in-memory seed data may still be used as bootstrap fallback

---

## Current status & known gaps

- Navigation is context-based (not URL-based) — deep linking to a specific page/employee/role is not supported
- Some UI components still include sample/mock visualization blocks while persistence is real
- The `shared/` components (`ProductionAlerts`, `FactorySkillsOverview`, `SkillsIntelligence`) are used across pages and may include additional sample values

---

## How to extend

- **Wire real data**: design a Supabase schema for `employees`, `roles`, `skills`, `employee_skills` tables; replace seed imports with Supabase queries
- **Add a new page**: create `v3/pages/NewPage.tsx`, add it to the switch in `ExpertSuite.tsx`, and add a nav link in `Layout.tsx`
- **Enable deep linking**: replace context-based navigation with Next.js dynamic route segments (e.g., `/dashboard/talent-studio/employees/[id]`)
- **Extend the AI analysis**: update the `/api/user-profile-analysis` prompt to include skill gap prioritization and recommended learning paths
