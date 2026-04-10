# Ignite Exchange

The recognition, engagement, and organizational intelligence hub of the IGNIZIA platform. Surfaces peer recognition, idea sharing, team pulse surveys, collective sentiment analysis, and strategy influence tracking — creating a culture layer on top of the operational platform.

---

## What it does

- **Kudos Stream**: real-time feed of peer-to-peer recognition moments (e.g., "Alex gave Maria a Safety Champion kudos") with likes, shares, and comments
- **Recognition Badges Panel**: organizational recognition categories and badge types; shows recent badge recipients and distribution stats
- **Idea Post Card**: submit and browse team ideas; vote and comment to surface the best ones
- **Community Forum Grid**: a categorized forum view linking into the Community feature's discussion topics
- **Mentoring Credits Panel**: tracks mentoring activity — who is mentoring whom, hours logged, and credits earned
- **Organization Sentiment Map**: visual heatmap of organizational sentiment by team/domain (positive, neutral, at-risk indicators)
- **Strategy Influence Board**: shows how employee actions and team initiatives are connecting to the broader organizational strategy

---

## Key files

| File | Purpose |
|---|---|
| `KudosStream.tsx` | Real-time peer recognition feed |
| `RecognitionBadgesPanel.tsx` | Badge categories, types, and recent recipients |
| `IdeaPostCard.tsx` | Idea submission and browsing interface |
| `CommunityForumGrid.tsx` | Topic grid linking to Community discussions |
| `MentoringCreditsPanel.tsx` | Mentoring activity tracker |
| `OrganizationSentimentMap.tsx` | Team sentiment heatmap |
| `StrategyInfluenceBoard.tsx` | Strategy-to-action connection board |
| `PlaybookShareCards.tsx` | Shared playbook/best practice cards |

---

## Architecture & data flow

The Ignite Exchange components are **presentational** in the current prototype — they render from seeded mock data.

```
app/dashboard/ignite/page.tsx
    │
    └─► Ignite Exchange components
            │
            └─► Mock data seeded in each component file
```

---

## API integrations

- No direct API route calls in the current prototype
- Future: kudos will be written to Supabase; sentiment analysis will call an LLM API; strategy influence data will come from the Strategy Studio's propagation engine

---

## Data

- All kudos, badges, ideas, sentiment scores, and forum links are **hardcoded mock data** within each component file
- No Supabase reads/writes in the current state

---

## Current status & known gaps

- All components are in prototype/showcase state — data is hardcoded
- Kudos are not persisted; they reset on page refresh
- The Sentiment Map shows placeholder scores — no real sentiment analysis is running
- The Strategy Influence Board is a visual prototype with no live data connection to the Strategy Studio

---

## How to extend

- **Persist kudos**: create a `kudos` Supabase table; update `KudosStream.tsx` to fetch the latest kudos and post new ones
- **Connect sentiment to Community**: run the `/api/topic-analysis` route's sentiment output into the `OrganizationSentimentMap.tsx` for real scores by topic/team
- **Link Strategy Influence to Strategy Studio**: read propagation unit status from the Strategy Studio's storage and visualize the active/blocked units in `StrategyInfluenceBoard.tsx`
- **Add idea voting**: create an `ideas` Supabase table with a `votes` column; wire `IdeaPostCard.tsx` to read/write real vote counts
