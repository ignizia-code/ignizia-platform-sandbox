# Portal (Living Ops)

The Portal is the application launcher and unified workspace hub of the IGNIZIA platform. It acts as a "Living Ops" shell that renders any of the platform's major feature modules inline — letting users switch between tools without leaving the page.

---

## What it does

- Receives a `selectedAppId` prop (from the Header's app switcher or navigation) and renders the corresponding feature module full-screen inside a card shell
- Supports switching between:
  - **Talent Studio** (`talent-studio`) → renders `TalentStudio` (ExpertSuite v3)
  - **Agent Studio** (`agent-studio`) → renders `AgentStudio`
  - **Workflow Builder** (`workflow`) → renders `WorkflowBuilder`
  - **Strategy Studio** (`strategy-studio`) → renders `ExecutiveStrategyStudio` (for Plant Manager / Operations Manager roles) or `StrategyStudio` (for other roles)
  - **Safe AI Governance** (`safe-ai-governance`) → renders the `PolicyWizard`
  - **Placeholder apps** (`enterprise-design-studio`, `intelligence`, `foundry`, `workbench`) → render a "coming soon" state

---

## Key files

| File | Purpose |
|---|---|
| `PortalPage.tsx` | Root component; receives `selectedAppId` and `userRole`, dispatches to the correct feature module |
| `index.ts` | Barrel export |

---

## Architecture & data flow

```
app/dashboard/portal/page.tsx
    │
    └─► PortalPage.tsx
            │
            ├─► TalentStudio           (selectedAppId === 'talent-studio')
            ├─► AgentStudio            (selectedAppId === 'agent-studio')
            ├─► WorkflowBuilder        (selectedAppId === 'workflow')
            ├─► ExecutiveStrategyStudio (selectedAppId === 'strategy-studio' + executive role)
            ├─► StrategyStudio         (selectedAppId === 'strategy-studio' + other roles)
            ├─► PolicyWizard           (selectedAppId === 'safe-ai-governance')
            └─► Placeholder UI         (selectedAppId === 'enterprise-design-studio' | 'intelligence' | 'foundry' | 'workbench')
```

The `selectedAppId` is passed from the parent page or the Header's app switcher. The Portal does not manage its own routing — it is a pure dispatcher.

---

## API integrations

The Portal itself makes no API calls. All API usage is handled by the feature modules it renders.

---

## Data

The Portal has no data of its own — it delegates entirely to the embedded feature module.

---

## Current status & known gaps

- Four placeholder app slots (`enterprise-design-studio`, `intelligence`, `foundry`, `workbench`) show a "coming soon" state — these are planned future modules
- The `selectedAppId` is currently a prop/state value from the parent — there is no URL-based deep linking to a specific app within the portal
- Role-based rendering for Strategy Studio is handled inline in `PortalPage.tsx` — if role logic grows, it should be extracted

---

## How to extend

- **Add a new app**: add a new `selectedAppId` case to the switch in `PortalPage.tsx` and import the feature module component
- **Enable deep linking**: replace prop-based `selectedAppId` with a URL query parameter (`/dashboard/portal?app=talent-studio`) so users can bookmark or share a specific app view
- **Add a home/launcher grid**: when no `selectedAppId` is set, render an app grid (icon + name for each available tool) instead of defaulting to Talent Studio
