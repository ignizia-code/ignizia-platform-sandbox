# Community

A collective intelligence discussion platform where team members post topics, comment, and receive AI-driven analysis of the discussion thread. Designed to surface insights and evidence from across the organization.

---

## What it does

- Displays a list of **discussion topics** fetched from Supabase
- Allows users to open a topic and read/write **comments** in a threaded view
- Each comment is analyzed by AI for sentiment, relevance, and evidence classification
- Batch analysis runs across all comments in a topic to surface key themes and patterns
- **User profiles** are accessible per commenter, showing their role and contribution history
- **Topic Info** panel shows metadata and AI-generated topic summary

---

## Key files

| File | Purpose |
|---|---|
| `CommunityPage.tsx` | Root orchestrator; manages navigation state between list, detail, topic info, and user profile views |
| `TopicList.tsx` | Renders the list of all topics with comment counts |
| `TopicDetail.tsx` | Full comment thread for a selected topic; handles posting and AI analysis |
| `TopicInfo.tsx` | Metadata panel for a topic: description, participants, AI summary |
| `UserProfile.tsx` | Profile card for a community contributor |

---

## Architecture & data flow

```
CommunityPage.tsx  (manages selectedTopic, view panel state)
    │
    ├─► TopicList        ←── GET /api/topics (list all topics)
    │
    ├─► TopicDetail
    │       ├── POST /api/comments      (analyze single comment)
    │       ├── POST /api/comments-batch (analyze all comments in topic)
    │       └── GET/POST /api/topic     (topic CRUD)
    │
    ├─► TopicInfo        (renders topic metadata + AI summary)
    └─► UserProfile      (renders contributor profile card)
```

A session-based user ID is generated and stored in `sessionStorage` to track the current user's contributions without requiring authentication.

---

## API integrations

| Route | Purpose |
|---|---|
| `GET /api/topics` | Fetch all topics |
| `GET/POST /api/topic` | Get or create a single topic |
| `POST /api/comments` | Analyze a single comment (sentiment, classification) |
| `POST /api/comments-batch` | Batch-analyze all comments in a topic |
| `POST /api/topic-analysis` | AI-generated summary and insight extraction for an entire topic thread |

---

## Data

- **Topics and comments** are stored in Supabase (tables: `topics`, `comments` — managed via the API routes)
- User IDs are session-based (stored in `sessionStorage`) — no authentication required in the current prototype

---

## Current status & known gaps

- No authentication — any role can post under any user session
- Topic deletion is supported (handled in `CommunityPage.tsx` via `handleTopicDeleted`) but UI confirmation flow may need hardening
- AI analysis is per-request; there is no background indexing or caching of analysis results

---

## How to extend

- **Add topic categories/tags**: extend the `Topic` type in `types/community.ts` and add a filter UI to `TopicList.tsx`
- **Add real authentication**: replace the session-based user ID with a Supabase Auth session
- **Add reactions**: extend `TopicDetail.tsx` with a reaction API route and Supabase table
- **Persist AI analysis**: cache comment analysis results back to Supabase so they do not need to be re-run on every view
