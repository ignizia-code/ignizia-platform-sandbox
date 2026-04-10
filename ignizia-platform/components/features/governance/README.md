# Governance

The leadership governance layer for safe AI usage and policy enforcement across the organization. Allows leaders to set data-handling policies, review and approve AI-generated content, track an audit trail, and monitor compliance health.

---

## What it does

- **Policy Wizard**: multi-step wizard for leaders to define their team's AI usage policy — data control level, approved tools, external AI permissions, review categories, and team scope
- **Approval Queue**: pending AI-generated content items that require a leader's sign-off before being applied
- **Audit Trail**: chronological log of all policy changes and approval decisions
- **Compliance Health**: dashboard showing how well the team is adhering to the current policy
- **Policy Snapshot**: read-only summary card of the active policy for quick reference

For the broader governance studio page (Workflow Builder integration), see `components/features/workflow-builder/README.md`.

---

## Key files

| File | Purpose |
|---|---|
| `PolicyWizard.tsx` | Multi-step policy creation/edit wizard (steps: intro → data → external → tools → review → scope → done) |
| `ApprovalQueue.tsx` | Displays pending items awaiting leader approval; handles approve/reject actions |
| `AuditTrail.tsx` | Chronological log of all governance events |
| `ComplianceHealth.tsx` | Compliance score card and breakdown by policy dimension |
| `PolicySnapshot.tsx` | Read-only active policy summary |

---

## Architecture & data flow

```
app/dashboard/governance/page.tsx
    │
    └─► LeadershipDashboard.tsx  (top-level governance page component)
            │
            ├─► PolicyWizard     → lib/governanceStorage.ts (savePolicy, loadPolicy)
            ├─► ApprovalQueue    → lib/governanceStorage.ts (addSubmission, addAuditEvent)
            ├─► AuditTrail       → lib/governanceStorage.ts (loadAuditEvents)
            ├─► ComplianceHealth → lib/governanceStorage.ts (loadPolicy)
            └─► PolicySnapshot   → lib/governanceStorage.ts (loadPolicy)
```

---

## Policy enforcement in Workflow Builder

The governance policy is enforced in the Workflow Builder via `lib/policyEnforcement.ts`:
- `requiresReview(node)` — checks if a workflow node needs leader sign-off based on the active policy
- `filterAiSuggestion(suggestion, policy)` — filters out AI-generated workflow suggestions that violate the policy
- `isExternalAiSuggestion(suggestion)` — detects if a workflow suggestion came from an external AI source

This enforces the governance policy across the product without requiring the Workflow Builder to know about policy logic directly.

---

## API integrations

The Governance feature does not call the Next.js API routes directly — it uses `lib/governanceStorage.ts` for all reads and writes.

---

## Data

- **Policy data** is currently stored in **localStorage** via `lib/governanceStorage.ts`
- **Audit events** are also stored in localStorage per session

> Future work: migrate `governanceStorage.ts` to Supabase for persistence across devices and sessions.

---

## Current status & known gaps

- Policy persistence is localStorage-based — data is lost on browser clear or when accessing from a different device
- No role-based access control — any user can access the governance wizard in the current prototype
- Compliance Health scores are derived from the local policy state, not from actual workflow usage data

---

## How to extend

- **Migrate storage to Supabase**: create a `governance_policies` table and update `lib/governanceStorage.ts` to use Supabase CRUD
- **Add role gating**: show the Policy Wizard only to users with a leader role (requires authentication)
- **Wire compliance data**: connect `ComplianceHealth.tsx` to real workflow execution and approval metrics from Supabase
