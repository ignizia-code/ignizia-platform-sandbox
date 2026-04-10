# Talent Service Extraction — Phase 1

This document defines the first non-breaking extraction step for Talent Studio backend logic.

## Goal

Move Talent backend execution to a separate repo/service while keeping the frontend API contract unchanged.

- Frontend keeps calling `"/api/talent-studio/*"` in this repo.
- These routes can proxy to an external Talent service when enabled.
- If proxy is not enabled, current local behavior remains unchanged.

## Runtime Toggle

Set this environment variable in the frontend app deployment:

- `TALENT_SERVICE_BASE_URL=https://your-talent-service-host`

When the value is present and valid, Talent routes in this repo forward requests to:

- `TALENT_SERVICE_BASE_URL + request.pathname + request.search`

When unset or invalid, handlers execute local logic as before.

## Route Contract Kept Stable

Phase 1 proxy wiring is applied to:

- `app/api/talent-studio/assignments/route.ts`
- `app/api/talent-studio/delete-employee/route.ts`
- `app/api/talent-studio/generate-learning-plan/route.ts`
- `app/api/talent-studio/recommend-team/route.ts`
- `app/api/talent-studio/recommend-staffing/route.ts`
- `app/api/talent-studio/projects/route.ts`
- `app/api/talent-studio/projects/[projectId]/route.ts`
- `app/api/talent-studio/projects/demand-skills/route.ts`

Shared proxy helper:

- `app/api/talent-studio/_shared/proxy.ts`

## New Talent Service Repo (Suggested Skeleton)

Use a separate repository with route parity:

- `src/routes/talent-studio/assignments`
- `src/routes/talent-studio/delete-employee`
- `src/routes/talent-studio/generate-learning-plan`
- `src/routes/talent-studio/recommend-team`
- `src/routes/talent-studio/recommend-staffing`
- `src/routes/talent-studio/projects`
- `src/routes/talent-studio/projects/:projectId`
- `src/routes/talent-studio/projects/demand-skills`

Extract these logic modules first:

- `lib/talentStudioStorage/supabase.ts`
- `lib/talentStudioStaffing/service.ts`
- `lib/talentStudioStaffing/recommendations.ts`
- `lib/talentStudioStaffing/telemetry.ts`

## Cutover Plan

1. Stand up the new service with matching routes and response shapes.
2. Run contract tests against both local and external service targets.
3. Set `TALENT_SERVICE_BASE_URL` in dev/staging and validate UI flows.
4. Roll to production with rollback path: unset `TALENT_SERVICE_BASE_URL`.

## Supabase Note

Phase 1 intentionally keeps current Supabase access/data-fetch behavior unchanged to avoid breaking existing flows.
