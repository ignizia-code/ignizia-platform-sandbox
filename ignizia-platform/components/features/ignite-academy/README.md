# Ignite Academy

The learning and training platform within IGNIZIA. Surfaces bite-sized learning content, scenario-based training, team learning sessions, and an AI-powered ExoTwin player — all mapped to real skill gaps identified in the Talent Studio.

---

## What it does

- **Micro-Lesson Card Stack**: horizontally scrollable cards for short learning modules (e.g., "Torque Safety — 3 min") with progress tracking and start/resume actions
- **Training Evidence Panel**: view and log evidence of completed training — certifications, observations, assessments
- **Scenario Library**: browse a catalog of workplace scenarios for practice (e.g., robot shutdown procedures, sensor calibration)
- **Playground Scenario Panel**: launch a private practice session based on a selected scenario
- **Team Session Board**: schedule and manage team-wide training sessions; see who has completed what
- **Skill Cortex Team Map**: visual map of the team's collective skill coverage, highlighting strengths and gaps
- **ExoTwin Player**: an AI-powered interactive trainer that guides the employee through a scenario as their personal digital twin

---

## Key files

| File | Purpose |
|---|---|
| `MicroLessonCardStack.tsx` | Horizontally scrollable micro-lesson cards with progress bars |
| `TrainingEvidencePanel.tsx` | Evidence logging and certification tracking |
| `ScenarioLibrary.tsx` | Scenario catalog browser |
| `PlaygroundScenarioPanel.tsx` | Interactive scenario practice environment |
| `TeamSessionBoard.tsx` | Team training session management board |
| `SkillCortexTeamMap.tsx` | Visual team skill coverage map |
| `ExoTwinPlayer.tsx` | AI-guided interactive training player |
| `index.ts` | Barrel export |

---

## Architecture & data flow

The Ignite Academy components are **presentational** in the current prototype — they render from seeded mock data and do not call API routes or Supabase directly.

```
app/dashboard/learning-hub/page.tsx
    │
    └─► Ignite Academy components
            │
            └─► Mock data seeded in each component file
```

---

## API integrations

- No direct API route calls in the current prototype
- Future: the ExoTwin Player will call an LLM API to generate adaptive training dialogue; lesson completion will write to Supabase

---

## Data

- All lesson content, scenario descriptions, team session data, and skill map data is **hardcoded mock data** within each component file
- No Supabase reads/writes in the current state

---

## Current status & known gaps

- All components are in prototype/showcase state — data is hardcoded
- No learning progress persistence — progress resets on page refresh
- The ExoTwin Player does not yet use an LLM for real adaptive responses
- Skill Cortex Team Map and Team Session Board use placeholder team members

---

## How to extend

- **Persist lesson progress**: create a `learning_progress` Supabase table keyed by `employee_id` + `lesson_id`; update `MicroLessonCardStack.tsx` to read/write real progress
- **Connect to Talent Studio gaps**: dynamically surface lessons in the Micro-Lesson stack that are mapped to the employee's identified skill gaps from the Talent Studio
- **Add AI to ExoTwin Player**: create a `/api/exotwin-player` route that takes the current scenario context and the employee's last message, and returns the next training prompt/response
- **Add scenario completion tracking**: record scenario completions in Supabase and surface them in the Training Evidence Panel and Skills Passport
