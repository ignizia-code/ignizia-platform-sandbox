# Project Resourcing Contracts and Mapping

This document captures the current `Project Resourcing` contract and the target normalized contract used by the new staffing APIs.

## Current Runtime Contract

Current source of truth for projects in runtime state:

- `components/features/talent-studio/v3/types.ts` (`Project`)
- `components/features/talent-studio/v3/store/AppContext.tsx` (`projects` state)
- `lib/talentStudioStorage/supabase.ts` (`talent_studio_collections`, `collection='projects'`)

Current project payload shape (JSON array in `talent_studio_collections.payload`):

```ts
type Project = {
  id: string;
  name: string;
  ownerId: string;
  startDate?: string;
  endDate?: string;
  description?: string;
  priority?: 'low' | 'medium' | 'high' | 'critical';
  teamOrSite?: string;
  requiredSkills: { skillId: string; minLevel: 1 | 2 | 3 | 4 | 5 }[];
  requiredPermits: string[];
  assignedEmployees: string[];
  shortlistedEmployees: string[];
}
```

## Current Read/Write Flow

- UI edits happen in `ProjectResourcing.tsx` (`addProject`, `updateProject`).
- `AppContext` persists the full snapshot after debounce.
- Persistence adapter upserts JSON collections row for `projects`.

## Limitations in Current Contract

- Projects are persisted as JSON blobs, not relational records.
- Assignment and shortlist semantics are not tied to specific role demand rows.
- `requiredSkills` is project-level only; no explicit project role/function demand model.

## Target Normalized Contract

### `talent_projects`

Core project metadata.

- `org_id`, `project_id`, `name`, `owner_id`, `priority`, `team_or_site`, `description`
- `start_date`, `end_date`, `status`, timestamps

### `talent_project_role_demands`

Demand rows per project for O*NET role/function staffing needs.

- `org_id`, `demand_id`, `project_id`, `role_id`
- `required_count`, `seniority`, `constraints` (JSON), timestamps

### `talent_project_demand_skills`

Optional demand-level skill overrides/extensions.

- `org_id`, `demand_id`, `skill_id`, `min_level`, `weight`, `source`

### `talent_project_assignments`

Employee assignments bound to a specific demand.

- `org_id`, `assignment_id`, `project_id`, `demand_id`, `employee_id`
- `status`, `assigned_by`, timestamps

### `talent_project_shortlists`

Candidate shortlist rows bound to demand.

- `org_id`, `shortlist_id`, `project_id`, `demand_id`, `employee_id`
- `reason`, timestamps

### Recommendation persistence

- `talent_recommendation_runs`: request/response metadata and model provenance.
- `talent_recommendation_candidates`: ranked candidate rows with structured reasoning.

## Migration Mapping (Legacy -> Normalized)

Given a legacy `Project` record:

- `Project.id` -> `talent_projects.project_id`
- `Project.requiredSkills[]` -> one default role-demand skill set:
  - create synthetic `demand_id` per project if no explicit role demand exists
  - write rows into `talent_project_demand_skills`
- `Project.assignedEmployees[]` -> `talent_project_assignments` rows (`status='assigned'`)
- `Project.shortlistedEmployees[]` -> `talent_project_shortlists` rows

Legacy rows can be migrated with a one-time script and then served from normalized tables.
