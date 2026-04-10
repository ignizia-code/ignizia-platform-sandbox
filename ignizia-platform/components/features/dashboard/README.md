# Dashboard (Control Tower)

The main intelligence monitoring hub of the IGNIZIA platform. Presents role-based "lenses" that surface the most relevant metrics and drill-down capabilities for each user type.

---

## What it does

- Renders a role-aware view (Plant Manager, HR Manager, Executive, etc.) that changes the layout, KPIs, and drill-down options shown
- Hosts a resizable **DrillDown Panel** that slides in from the right when a metric or card is selected
- Includes a **3D Scene view** that renders the Omniverse `ModelViewer` when the user switches to Scene mode
- Provides a **Simulation Modal** for running quick "what-if" scenario previews
- Uses `AdvancedLensCards` to render the key intelligence cards for each lens

---

## Key files

| File | Purpose |
|---|---|
| `Dashboard.tsx` | Root component; handles view mode (`Dashboard` vs `Scene`), panel resizing, and role dispatch |
| `lenses/ControlTowerRoleView.tsx` | Role-to-lens mapper; renders the correct lens layout per `UserRole` |
| `lenses/AdvancedLensCards.tsx` | Intelligence metric cards rendered inside each lens |
| `lenses/roleMockData.ts` | Mock KPI data seeded per role (used during prototype phase) |
| `lenses/useTalentStudioData.ts` | Hook that bridges talent data into the dashboard lens |
| `shared/DrillDownPanel.tsx` | Resizable right-side panel for metric drill-down |
| `shared/SimulationModal.tsx` | Modal for running quick simulations |
| `shared/AskIgniziaSimulation.tsx` | AI-assisted simulation query component |

---

## Architecture & data flow

```
app/dashboard/page.tsx
    │
    └─► Dashboard.tsx  (receives timeframe, view, userRole from DashboardContext)
            │
            ├─► ControlTowerRoleView  (role → lens layout)
            │       └─► AdvancedLensCards  (KPI cards per lens)
            │
            ├─► DrillDownPanel  (slides in on metric click)
            └─► SimulationModal  (on demand)
```

State is passed down from `app/dashboard/DashboardContext.tsx` which holds the global `timeframe`, `view`, and `userRole` selections made in the Header.

---

## API integrations

The Dashboard itself does not call API routes directly. Drill-down and simulation interactions may trigger calls through `AskIgniziaSimulation` which uses `/api/chatbot`.

---

## Data

- KPI data is currently **mock data** in `lenses/roleMockData.ts` — seeded per role
- The Scene view passes no data; it renders the `ModelViewer` component which connects to the Omniverse WebRTC stream
- No Supabase reads/writes from the Dashboard component directly

---

## Current status & known gaps

- KPI data is mock — future work is to wire real metrics from Supabase and operational data sources
- The HR Manager lens (`HRManagerControlTower`) is a second role variant alongside the base `ControlTowerRoleView`
- Role switching is UI-only; there is no authentication or session-based role assignment yet

---

## How to extend

- **Add a new lens**: add a new case to `ControlTowerRoleView.tsx` and create the corresponding card layout in `lenses/`
- **Wire real data**: replace mock data in `roleMockData.ts` with Supabase queries in `useTalentStudioData.ts` or a new dedicated hook
- **Add a new drill-down panel section**: extend `DrillDownPanel.tsx` with the new content type
