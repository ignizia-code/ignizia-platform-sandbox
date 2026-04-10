````plaintext
## 1) MVP Scope Town Hall
This featureshould be accesible from teh left pane after the dashboard and the portal links
Use sqllite file based database for the feature.
use gpt-5-nano ai.
all server actions need to be done through the serverless functions in the api folder.
### Community

* Topics (thread starter: text + optional media)
* Comments (chat-like timeline)

### AI

* Per-comment analysis (on post)
* Topic-level analysis (on demand, only when new comments exist)
* User-level analysis (on demand, only when new analyzed comments exist)
* Evidence mapping from labels → comments

No moderation automation, no recommendation engine, no social graph.

---

## 2) Data Model (minimal but complete)

### Topic

* `id`
* `creator_id`
* `starter_text`
* `starter_media_url?`
* `created_at`

### Comment

* `id`
* `topic_id`
* `author_id`
* `text`
* `created_at`

### CommentAnalysis (created when comment is posted)

* `comment_id` (PK)
* `topic_id`
* `author_id`
* `relevance` : `on_topic | loosely_related | off_topic`
* `tone` : `positive | neutral | negative | aggressive`
* `constructiveness` : `constructive | low_value | disruptive`
* `short_reason` (optional, 1 sentence)
* `model_version`
* `created_at`

### TopicAnalysisSnapshot (cached result)

* `topic_id` (PK)
* `computed_at`
* `based_on_last_comment_id` **or** `based_on_last_comment_created_at`
* `metrics_json` (counts, velocity)
* `ai_json` (sentiment, quality, focus summary)
* `model_version`

### UserProfileSnapshot (cached result)

* `user_id` (PK)
* `computed_at`
* `based_on_last_analyzed_comment_id` **or** `based_on_last_comment_analysis_created_at`
* `labels_json` (labels + evidence links)
* `model_version`

> Key idea: **no TTL**. Cache invalidation = “did something new happen?”

---

## 3) Interaction-based “freshness” signals (the core mechanism)

### For Topic Info freshness

You need a cheap query that tells you if the topic changed:

* `topic_last_comment_id` or `topic_last_comment_created_at`

Store/update this on every new comment (or compute via indexed query).

**Topic analysis is stale if:**

* `Topic.last_comment_id != TopicAnalysisSnapshot.based_on_last_comment_id`

This ensures:

* No new analyzed comments → don’t rerun
* 1 minute later a new comment is analyzed → rerun on next profile open

---

## 4) Runtime Flows

### A) Posting a comment (immediate trigger)

**Trigger:** `POST /topics/:id/comments`

Steps:

1. Save comment
2. Run **CommentAnalysis**
3. Save CommentAnalysis
4. Update “freshness pointers”:

   * Topic.last_comment_id
   * User.last_comment_analysis_id (for that author)

That’s it.

> This is the only mandatory real-time AI action in MVP.

---

### B) Opening Topic Info (on-demand analysis)

**Trigger:** user opens Topic Info page

Steps:

1. Fetch `TopicAnalysisSnapshot` (if exists) and show it immediately
2. Compare:

   * `Topic.last_comment_id` vs `Snapshot.based_on_last_comment_id`
3. If equal → snapshot is fresh → do nothing
4. If not equal → run a refresh:

   * show “Updating…” state
   * compute new analysis using latest comments
   * save snapshot with new `based_on_last_comment_id`
   * update UI

**Important UX rule (your requirement):**

* Show previous snapshot while loading the new one.

---

### C) Opening User Profile (on-demand analysis with transparency)

**Trigger:** user opens User Profile

Steps:

1. Fetch `UserProfileSnapshot` (if exists) and show it
2. Compare:

   * `User.last_comment_analysis_id` vs `Snapshot.based_on_last_analyzed_comment_id`
3. If equal → fresh → do nothing
4. If not equal → run refresh:

   * aggregate across that user’s CommentAnalysis records
   * produce a **single set of labels**
   * each label includes evidence comment IDs
   * save snapshot + update UI

**Transparency requirement:**

* Clicking a label displays the evidence comments (IDs → full comments)

---

## 5) What analyses exist in MVP (exact outputs)

### 5.1 Comment-level analysis (on post)

Outputs:

* relevance (w.r.t topic starter + optionally last N comments)
* tone
* constructiveness
* optional short_reason

**This powers everything else.**

---

### 5.2 Topic-level analysis (on Topic Info open, only if new comments exist)

#### Non-AI metrics (cheap)

* comment_count
* unique_participants
* comment_velocity (e.g. comments in last 1h / 24h)
* time_to_first_reply

#### AI summary (small)

* sentiment: positive/neutral/negative/mixed
* quality: low/medium/high
* focus_score: 0–1 (how on-topic the discussion is)

**How to compute focus_score in MVP**
Use the stored `CommentAnalysis.relevance` distribution:

* on_topic=1, loosely=0.5, off_topic=0
* weighted average over last N comments

This keeps AI usage minimal: the heavy lifting already happened per comment.

---

### 5.3 User-level analysis (on Profile open, only if new analyzed comments exist)

#### Labels (keep 6–8 max)

Derived mostly from CommentAnalysis aggregates + evidence mapping:

Example labels:

* Constructive contributor
* Often off-topic
* Frequently negative tone
* Often disruptive/aggressive
* Low-value commenter
* Balanced participant (optional)

Each label object:

* key
* score (0–100)
* description (1 line)
* evidence_comment_ids (top 5–20)
* evidence_summary per comment (optional: “on-topic + constructive”)

**Evidence selection rule (MVP simple):**

* choose most recent comments that match the condition
* or highest confidence (if you add confidence later)

---

## 6) Evidence mapping (how you guarantee transparency)

You have two ways; MVP can start with the simplest:

### Option 1 (recommended MVP): rule-based evidence mapping

Label conditions:

* Constructive contributor → constructiveness=constructive AND relevance=on_topic
* Often off-topic → relevance=off_topic
* Frequently negative tone → tone=negative OR aggressive
* Low-value → constructiveness=low_value
* Disruptive → constructiveness=disruptive OR tone=aggressive

Evidence = comments that matched.

This is transparent and debuggable.

### Option 2 (later): LLM-generated labels + citations

Keep for v2. Rule-based gets you shipped.

---

## 7) API Endpoints (minimal set)

### Comments

* `POST /topics/:topicId/comments`
  → saves comment + runs CommentAnalysis

### Topic analysis

* `GET /topics/:topicId/analysis`
  → returns snapshot + `is_stale` boolean
* `POST /topics/:topicId/analysis/refresh`
  → recompute and update snapshot (called by UI if stale)

### User profile analysis

* `GET /users/:userId/profile-analysis`
  → returns snapshot + `is_stale`
* `POST /users/:userId/profile-analysis/refresh`
  → recompute snapshot

### Evidence drilldown

* `GET /comments?ids=...` (or a batch endpoint)
  → used when clicking a label to show comment details

---

## 8) UI/UX (MVP behavior)

### Topic Info panel

* Shows snapshot (if exists)
* If stale:

  * show “Updating analysis…” indicator
  * keep old snapshot visible
  * auto-refresh and swap when done
* If no snapshot yet:

  * show loading skeleton then result

### User profile

* Shows label chips/cards + scores
* If stale: same stale-while-revalidate behavior
* Clicking a label:

  * opens a panel listing evidence comments
  * each evidence comment shows its per-comment labels (relevance/tone/constructive)

---

## 9) Performance / Cost MVP decisions

### Keep AI usage minimal

* AI runs **once per comment** (small input)
* Topic/user analyses mostly aggregate existing labels
* Topic “AI summary” can be:

  * either derived from aggregates
  * or one lightweight LLM call summarizing last N comments (optional)

### Batch limits

* Topic refresh reads last N comments (e.g. 50–200)
* User refresh reads last N analyzed comments (e.g. 200–500)
* If user has more, compute aggregates over all, but evidence from recent N

---

## 10) MVP delivery checklist

**Phase 1: Core**

* Topics + comments
* CommentAnalysis on post
* Store analysis + pointers (topic last comment, user last analyzed comment)

**Phase 2: On-demand views**

* Topic info page with stale check + refresh
* User profile labels with stale check + refresh

**Phase 3: Transparency**

* Label → evidence comments view
* Show per-comment labels inline

````
