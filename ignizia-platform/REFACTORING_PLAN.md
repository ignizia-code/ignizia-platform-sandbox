# Refactoring Plan: Next.js Best Practices

## Current State Assessment

This app was migrated from Vite + React to Next.js App Router but retains a client-side routing pattern that bypasses Next.js's strengths. Three components are severely bloated (3,000+ lines), and the organization mixes flat and nested structures inconsistently.

---

## Target Architecture

Following [Next.js App Router best practices](https://nextjs.org/docs/app/building-your-application/routing/colocation) and the [bulletproof-react](https://github.com/alan2207/bulletproof-react) structure:

```
app/                          # Next.js App Router
├── (dashboard)/             # Route group for dashboard layout
│   ├── layout.tsx           # Shared layout with sidebar
│   ├── page.tsx             # Dashboard home
│   ├── community/
│   │   └── page.tsx
│   ├── governance/
│   │   └── page.tsx
│   ├── portal/
│   │   └── page.tsx
│   └── omniverse/
│       └── page.tsx
├── api/                      # API routes (unchanged structure)
├── layout.tsx               # Root layout
└── globals.css

components/
├── ui/                      # Shared UI components (Button, Input, etc.)
├── layout/                  # Layout components (Sidebar, Header)
├── features/                # Feature-based components
│   ├── dashboard/
│   │   ├── index.tsx
│   │   └── components/
│   ├── community/
│   │   ├── index.tsx
│   │   └── components/
│   ├── governance/
│   │   ├── index.tsx
│   │   └── components/
│   ├── hr-board/
│   │   ├── index.tsx
│   │   ├── components/
│   │   ├── hooks/
│   │   └── types.ts
│   ├── workflow-builder/
│   │   ├── index.tsx
│   │   ├── components/
│   │   ├── hooks/
│   │   └── types.ts
│   └── agent-studio/
│       ├── index.tsx
│       ├── components/
│       ├── hooks/
│       └── types.ts
├── chat/
│   └── ChatBot.tsx
└── omniverse/
    └── components/

lib/
├── db.ts
├── utils/
│   ├── governanceStorage.ts
│   ├── policyEnforcement.ts
│   ├── sensitivityClassifier.ts
│   └── workflowLayout.ts
└── hooks/                   # Shared custom hooks

types/
├── index.ts                 # Main exports
├── user.ts                  # User-related types
├── dashboard.ts             # Dashboard types
├── community.ts             # Community types
├── governance.ts            # Governance types
├── workflow.ts              # Workflow builder types
└── api.ts                   # API types

hooks/                       # Global hooks (useAuth, etc.)
├── useAuth.ts
└── useDarkMode.ts

public/
└── models/
```

---

## Phase 1: Proper App Router Structure (HIGH PRIORITY)

### Problem
- `App.tsx` uses `useState` for section switching
- Only `/` and `/Omniverse` are real routes
- Defeats Next.js code-splitting, SSR, and deep linking

### Solution
Create route groups for different layouts:

```typescript
// app/(dashboard)/layout.tsx
// Shared layout with Sidebar + Header for dashboard sections

// app/(dashboard)/page.tsx
// Dashboard home

// app/(dashboard)/community/page.tsx
// Community page

// app/(dashboard)/governance/page.tsx
// Governance page

// app/(dashboard)/portal/page.tsx
// Portal page

// app/(dashboard)/hr/page.tsx
// HR Board page

// app/(dashboard)/workflow/page.tsx
// Workflow builder page

// app/(dashboard)/agent/page.tsx
// Agent studio page

// app/omniverse/page.tsx
// Omniverse viewer (no sidebar layout)
```

### Benefits
- Automatic code-splitting per route
- SSR/SSG where applicable
- Deep linking works naturally
- SEO-friendly
- Better caching

---

## Phase 2: Split Massive Components (HIGH PRIORITY)

### WorkflowBuilder.tsx (3,084 lines)
**Target structure:**
```
components/features/workflow-builder/
├── index.tsx                 # Main container (200 lines)
├── WorkflowCanvas.tsx        # Canvas rendering (400 lines)
├── WorkflowToolbar.tsx       # Toolbar UI (150 lines)
├── NodePalette.tsx          # Draggable nodes (200 lines)
├── PropertyPanel.tsx        # Node properties editor (300 lines)
├── components/
│   ├── WorkflowNode.tsx     # Individual node component
│   ├── WorkflowEdge.tsx     # Edge component
│   └── NodeTypes/           # Different node type components
│       ├── StartNode.tsx
│       ├── ProcessNode.tsx
│       ├── DecisionNode.tsx
│       └── EndNode.tsx
├── hooks/
│   ├── useWorkflow.ts       # Main workflow state hook
│   ├── useNodeDrag.ts       # Drag and drop logic
│   └── useWorkflowLayout.ts # Auto-layout logic
├── types.ts                 # Component-specific types
└── utils.ts                 # Helper functions
```

### HRBoard.tsx (3,012 lines)
**Target structure:**
```
components/features/hr-board/
├── index.tsx
├── SkillMatrix.tsx
├── RoleComparison.tsx
├── OccupationSearch.tsx
├── ResponsibilityMatcher.tsx
├── components/
│   ├── SkillCard.tsx
│   ├── RoleCard.tsx
│   └── ComparisonTable.tsx
├── hooks/
│   ├── useOccupations.ts
│   ├── useRoles.ts
│   └── useSkills.ts
├── types.ts
└── data/                    # Static data if needed
    └── role-definitions.ts
```

### AgentStudio.tsx (2,080 lines)
**Target structure:**
```
components/features/agent-studio/
├── index.tsx
├── AgentCanvas.tsx
├── AgentToolbar.tsx
├── AgentProperties.tsx
├── AgentTestPanel.tsx
├── components/
│   ├── AgentCard.tsx
│   ├── ToolNode.tsx
│   └── AgentFlow.tsx
├── hooks/
│   ├── useAgent.ts
│   └── useAgentExecution.ts
└── types.ts
```

---

## Phase 3: Component Organization (MEDIUM PRIORITY)

### Current Issues
- Mixed flat + nested structure
- Inconsistent naming (`AgentStudio` vs `PortalPage`)
- No clear separation between shared and feature components

### New Structure

```
components/
├── ui/                      # Reusable UI primitives
│   ├── Button.tsx
│   ├── Input.tsx
│   ├── Card.tsx
│   ├── Select.tsx
│   └── Modal.tsx
│
├── layout/                  # Layout-specific components
│   ├── Sidebar.tsx
│   ├── Header.tsx
│   └── MainLayout.tsx
│
├── features/                # Feature-based modules
│   ├── dashboard/
│   │   ├── index.tsx
│   │   ├── DashboardStats.tsx
│   │   ├── DashboardCharts.tsx
│   │   └── components/
│   │       └── StatCard.tsx
│   │
│   ├── community/
│   │   ├── index.tsx
│   │   ├── TopicList.tsx
│   │   ├── TopicDetail.tsx
│   │   ├── TopicInfo.tsx
│   │   ├── UserProfile.tsx
│   │   └── types.ts
│   │
│   ├── governance/
│   │   ├── index.tsx
│   │   ├── LeadershipDashboard.tsx
│   │   ├── ApprovalQueue.tsx
│   │   ├── AuditTrail.tsx
│   │   ├── ComplianceHealth.tsx
│   │   ├── PolicySnapshot.tsx
│   │   ├── PolicyWizard.tsx
│   │   └── types.ts
│   │
│   ├── portal/
│   │   ├── index.tsx
│   │   └── components/
│   │
│   ├── hr-board/           # Split from HRBoard.tsx
│   ├── workflow-builder/   # Split from WorkflowBuilder.tsx
│   └── agent-studio/       # Split from AgentStudio.tsx
│
├── chat/
│   ├── ChatBot.tsx
│   └── components/
│       └── ChatMessage.tsx
│
└── omniverse/
    ├── AppStream.tsx
    ├── StreamOnlyWindow.tsx
    └── OmniverseViewer.tsx
```

### Naming Conventions
- **Components:** PascalCase (e.g., `WorkflowCanvas.tsx`)
- **Folders:** kebab-case (e.g., `workflow-builder/`)
- **Hooks:** camelCase with `use` prefix (e.g., `useWorkflow.ts`)
- **Utilities:** camelCase (e.g., `formatDate.ts`)

---

## Phase 4: Type Organization (MEDIUM PRIORITY)

### Current Issues
- `/types.ts` (231 lines) mixed with `/types/sql.js.d.ts`
- Types scattered throughout components
- Inconsistent imports (`../types` vs `../../types`)

### New Structure

```
types/
├── index.ts                 # Re-export everything
├── user.ts                  # User, UserRole types
├── dashboard.ts             # Dashboard, Timeframe, View types
├── community.ts             # Topic, Comment types
├── governance.ts            # Policy, Approval types
├── workflow.ts              # Workflow, Node, Edge types
├── api.ts                   # API request/response types
└── global.d.ts              # Global declarations
```

### Usage Pattern
```typescript
// Instead of:
import { UserRole, Timeframe } from '../types';

// Use:
import { UserRole, Timeframe } from '@/types';
```

---

## Phase 5: Cleanup and Utilities (LOW PRIORITY)

### Tasks

1. **Remove unused code:**
   - Replace `lib/db.ts` stub with actual implementation or remove
   - Remove placeholder sections (Analytics, LearningHub, TeamPulse) or implement

2. **Add barrel exports:**
   ```typescript
   // components/features/community/index.ts
   export { CommunityPage } from './CommunityPage';
   export { TopicList } from './TopicList';
   export type { CommunityProps } from './types';
   ```

3. **Move SQL migrations:**
   ```
   data/
   ├── migrations/            # Move SQL files here
   ├── seed/                  # Seed data
   └── raw/                   # Role data
   ```

4. **Create shared hooks:**
   ```
   hooks/
   ├── useAuth.ts
   ├── useDarkMode.ts
   └── useLocalStorage.ts
   ```

5. **Consolidate utilities:**
   ```
   lib/
   ├── utils/
   │   ├── cn.ts             # Tailwind merge utility
   │   ├── date.ts           # Date formatting
   │   └── validation.ts     # Form validation
   ├── api/                  # API client utilities
   └── db.ts                 # Database layer
   ```

---

## Implementation Order

### Week 1: Foundation
1. ✅ Create this plan
2. Move to proper App Router structure with route groups
3. Update root layout and remove App.tsx routing
4. Test all routes work correctly

### Week 2: Component Refactoring
1. Split WorkflowBuilder.tsx
2. Split HRBoard.tsx
3. Split AgentStudio.tsx
4. Move components to feature folders

### Week 3: Types and Utilities
1. Reorganize types folder
2. Standardize all imports to use `@/` alias
3. Create shared hooks
4. Add barrel exports

### Week 4: Polish
1. Remove unused code
2. Add documentation
3. Update README
4. Final testing

---

## Success Metrics

- [ ] All components under 400 lines
- [ ] Consistent folder structure throughout
- [ ] All imports use `@/` alias
- [ ] No `'use client'` in page.tsx files
- [ ] Each route has its own page.tsx
- [ ] Types organized by domain
- [ ] Build passes with no errors
- [ ] All features work as before

---

## Notes

- **Preserve functionality:** Do not rewrite logic, only reorganize
- **Incremental changes:** One feature at a time
- **Test after each phase:** Run `npm run build` frequently
- **Git commits:** One logical change per commit with clear messages
- **Backup:** Current MIGRATION.md has valuable context, keep it
