# Talent Studio Enhancement — Feature Blueprint

This document captures the product and engineering specification for enhancing
Talent Studio with an editable organizational hierarchy, interactive skill
requirements, and gap analysis. The sections below describe the desired data
model, user flows, and logic. An optional agent-friendly prompt is provided in
an appendix for teams using AI assistants.

---

## 1) Organized blueprint of what you want

### A. The core shift: from “view-only intelligence” → “editable organizational graph”

Right now:

* Employees, roles, skills are **in-memory constants + client state**
* “team” and “department” are **strings** on Employee and Role
* Employee skills are **generated from role requirements**, not user-authored

You want:

* A **real hierarchy** (Department → Team → Role → Employee)
* CRUD for:

  * Departments, teams, members
  * Employee skills (manual + planned/training)
  * Skill requirements at **Role / Team / Department**
* Computed intelligence:

  * Coverage, gaps, risk
  * Hiring and training recommendations

---

### B. Data model you need (minimal-but-correct)

Introduce normalized entities (still client-only for now, but shaped like a real DB model):

**Department**

* id, name, description?
* requiredSkills: `{ skillId, targetHolders, minLevel, importance }[]` (optional)

**Team**

* id, departmentId, name
* requiredSkills: same structure (optional)

**Role**

* keep your Role model but add:

  * teamId (replace string team)
  * optional: `minIncumbents` / `targetHeadcount`
  * improve requirement shape: `{ skillId, importance, minLevel, targetHolders }`

**Employee**

* add:

  * teamId (replace string team)
  * roleId or title mapping (prefer roleId long-term)
  * location stays (shop floor area)
* **skills become truly user-editable**:

  * source: `'verified' | 'self' | 'inferred' | 'planned'`
  * level: 1–5
  * planned?: boolean (keep)
  * lastValidated?: date

**Skill**

* keep canonical ID-based model ✅

---

### C. Crucial product decision (recommended)

**Stop forcing employee skills to be derived from role requirements.**

Instead:

* Keep inference as a *suggestion* (“Add inferred skills from role template”)
* But store employee skills as the source of truth (editable)

This unlocks:

* training plans
* internal mobility
* real gap analysis (not circular)

---

### D. UI additions that fit your current page

Add a new mode/tab inside Talent Studio:

#### 1) “Org Builder” (Hierarchy + CRUD)

Two-pane layout:

* Left: expandable tree (Departments → Teams → Roles → Employees)
* Right: detail panel (edit form + related insights)

Inline actions:

* “+ Department”, “+ Team”, “+ Role”, “+ Employee”
* Drag & drop (optional later): move employee between teams, move team between departments

#### 2) “Requirements & Gaps” (computed layer)

Let user set requirements at:

* Department, Team, Role

Then compute:

* Coverage strength per node
* Skill gaps per node
* Hiring/training recommendations

#### 3) “Skills Explorer”

Filters:

* by department/team/role
* show skill heatmap/table

---

### E. Gap logic (keep it simple, but solid)

For any node (Role/Team/Department), a requirement says:

`need(skillId, minLevel, targetHolders, importance)`

Compute:

* `availableHolders = count(employees in scope with skillId and level >= minLevel and not planned)`
* `plannedHolders = count(... planned)`
* `gapNow = max(0, targetHolders - availableHolders)`
* `gapFuture = max(0, targetHolders - (availableHolders + plannedHolders))`

Risk:

* High if importance=3 and gapNow>0
* Medium if importance=3 and gapNow==0 but availableHolders==1 (single point)
* Low otherwise

Recommendations:

* If there are employees with level = minLevel-1: suggest training
* If none: suggest external hire
* If other teams have surplus holders: suggest internal mobility

---

## Appendix: AI‑Agent Prompt (optional)

The following text can be used by an AI coding agent if you prefer to generate
implementation code automatically. It is not required to read or follow for a
human developer.


```text
You are a senior product engineer working in a Next.js App Router project. There is an existing client component `TalentStudio.tsx` (React + Tailwind). Currently, the app is view-only: it uses in-memory constants `EMPLOYEES`, `ROLES`, `SKILLS`, and computes skill coverage, risk, alerts, and a “Hire for Skills” canvas. Teams/departments are NOT normalized — they are strings (Employee.team, Role.team). Employee skills are not manually authored; they are derived from role requirements via `getSkillsForRole(roleName, employeeId)` with deterministic variation.

Goal: Enhance Talent Studio to support an editable organizational hierarchy with interactive CRUD, manual skill entry, and requirements-based gap detection at role/team/department levels — all still client-side (no backend yet), but architected cleanly as if it could later be persisted.

Constraints:
- Use React client component + hooks
- Use Tailwind for UI (no MUI/Chakra)
- Keep existing dashboard sections working (alerts, role risk, coverage, etc.) but refactor logic as needed
- Do not introduce a backend; store everything in React state (optionally LocalStorage for persistence)
- Keep Skill model canonical (skillId references to SKILLS)
- Provide clean types/interfaces and helper functions; avoid massive monolithic component logic

Deliverables:
1) Data model refactor:
   - Introduce normalized entities:
     - Department { id, name, description?, requiredSkills?: Requirement[] }
     - Team { id, departmentId, name, requiredSkills?: Requirement[] }
     - Role { id, name, teamId, level, requirements: Requirement[] } (refactor RoleRequirement → Requirement)
     - Employee { id, name, title, roleId?, teamId, location, workload, allocation, skills: EmployeeSkill[] }
   - Define `Requirement` as:
     - { skillId: string, importance: 1|2|3, minLevel: 1|2|3|4|5, targetHolders: number }
   - Extend `EmployeeSkill` to include:
     - { skillId, level, planned?: boolean, source?: 'verified'|'self'|'inferred'|'planned', lastValidated?: string }
   - Provide migration logic from old constants:
     - Create initial Departments/Teams inferred from existing strings
     - Map Role.team string → Team.id
     - Map Employee.team string → Team.id
     - Preserve Employee.title and Role.name matching for now, but support roleId going forward

2) UI: Add a new “Org Builder” mode inside Talent Studio:
   - Add top-level tabs (or segmented control): 
     - “Control Tower” (existing dashboard)
     - “Org Builder” (new)
     - “Requirements & Gaps” (new)
   - Org Builder layout:
     - Left pane: hierarchical tree view (Departments → Teams → Roles → Employees)
       - Expand/collapse nodes
       - Each node has a small “+” action relevant to its level (add team under dept, add role under team, add employee under team, etc.)
     - Right pane: details editor for selected node:
       - Department: edit name/description, edit Department requirements list
       - Team: edit name, move to another department, edit Team requirements list
       - Role: edit name, level, team assignment, edit Role requirements list (skill pickers + minLevel + targetHolders + importance)
       - Employee: edit name/title/location/team/role; manually edit employee skills (add/remove, change level, mark planned, set source)
   - Add modals or inline forms for CRUD. Keep UX consistent with existing style (rounded cards, icons, etc.)

3) Requirements & Gaps screen:
   - Allow selecting a scope (Department or Team or Role) and display:
     - Requirements table (skill, importance, minLevel, targetHolders)
     - Coverage metrics:
       - availableHolders (level>=minLevel and not planned)
       - plannedHolders
       - gapNow, gapFuture
     - Risk indicator: High/Medium/Low using:
       - High if importance=3 and gapNow>0
       - Medium if importance=3 and gapNow==0 and availableHolders==1 (single point)
       - Low otherwise
   - Show “Recommendations”:
     - “Train X” if employees in scope have level==minLevel-1 for the missing skill
     - “Internal move candidate Y from Team Z” if other teams have surplus holders (availableHolders > targetHolders) for that skill
     - Else “Hire externally”
   - Keep the implementation deterministic and explainable (no black-box AI).

4) Refactor existing analytics to use normalized model:
   - Update computeSkillCoverage to compute by:
     - whole company AND optionally per department/team
   - Update role risk computation:
     - Use Role.requirements (importance=3 and minLevel) and check holders within that role’s team scope (or across company, pick one and document)
   - Ensure existing “Hire for Skills” canvas still works:
     - It should match against Employee.skills (manual + planned rules), not only inferred role skills
     - If you still support inferred skills, mark them source='inferred' and allow user to “Accept” them into verified/self

5) State management:
   - Create a small internal store pattern (without external libs):
     - useReducer with actions for CRUD and updates OR separate useState + helper updaters
   - Optional persistence:
     - Save/load state from LocalStorage with a version key (e.g. TALENT_STUDIO_V2)
     - Provide a “Reset to demo data” button

6) Provide code output:
   - Add/modify types, seed data, and helper functions in the same file OR split into small local modules (if allowed in this task)
   - Ensure UI compiles and works
   - Keep the styling clean with Tailwind, no new UI library dependencies

Implementation details to include:
- Skill picker should search SKILLS by name/category and store skillId
- Requirements editor should validate:
  - targetHolders >= 1
  - minLevel within 1..5
- Employee skills editor should prevent duplicate skillId entries
- Provide utility functions:
  - getEmployeesInTeam(teamId), getEmployeesInDepartment(deptId)
  - computeCoverageForScope(employeesInScope, requirements)
  - computeGapsAndRisk(requirements, employeesInScope)
  - recommendActions(requirements, allEmployees, scopeEmployees, teams, departments)

Output only the code changes and brief developer notes on what was refactored.
```

---

## 3) Optional “nice-to-haves” you can tell the agent later (don’t block v1)

* Drag & drop org movement
* Skill heatmap (skills × teams)
* What-if simulation (remove employee / add headcount)
* Import/export JSON

````
