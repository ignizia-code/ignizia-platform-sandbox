# Executive Strategy Studio — User Journey Story

*This document describes a single, end-to-end simulation of a leader using the Executive Strategy Studio. It is intended to be compared against the platform architecture definition so that gaps, inconsistencies, or improvement opportunities can be identified and translated into implementation.*

---

## Persona

**Maya** is a plant manager overseeing a factory with multiple production lines (A, B, C), quality and safety, logistics, and workforce. She uses the Executive Strategy Studio to set and propagate strategic goals, understand where adoption is strong or blocked, and take action at an executive level without micromanaging.

---

## Part 1: Landing and First Strategy

Maya opens the app and navigates to **Executive Strategy Studio**. She sees the main layout: a **header** with the title "Executive Strategy Studio," her role badge ("Plant Manager"), context ("Factory · Lines A–C"), and a **Reset demo data** button. She knows she can wipe all strategies and chat history to start fresh; new strategies will get fresh demo propagation data.

The screen is split into two columns. On the **left**, the **Strategy Copilot** chat: a collapsible **sidebar** (History) lists her past conversations; each chat shows a title and whether it’s linked to a strategy (checkmark) or still "New strategy." She can click **New** to start a brand‑new conversation. The main chat area has a **text input** and a **Send** button. She can press **Enter** to send. If the input is empty, she sees a **suggestion prompt** ("Try: …") that pre-fills the input with an example goal (e.g. "Increase overall factory throughput by 12% without increasing overtime").

She types a goal in her own words, e.g. *"Cut defect rate by 25% on the cardbox line with stable safety"*, and clicks **Send**. The **user message** appears in a chat bubble (the UI cycles through four brand accent colors for user bubbles). The copilot shows a **thinking** state (bouncing dots). At the same time, on the **right** column — the **Strategy Board** — a **skeleton placeholder card** appears: it has a **shimmer** animation, **pulsing** skeleton blocks that mimic the shape of a strategy card (badges, title, hero metric, compact metric tiles), and **sparkle particles** (small stars in brand colors) that rise and fade, signaling that the AI is "cooking" the strategy. The animation runs for at least **1.5–2 seconds** even if the API responds faster, so the transition feels intentional.

When the AI responds, the skeleton **exits** (scale/slide animation) and a **real strategy card** appears on the Strategy Board. The **assistant message** appears in the chat in a neutral grey bubble. The new strategy is linked to this chat: the sidebar chat title updates, and the chat now has an **objectiveId** so future messages in this conversation will **refine** this strategy rather than create another one. The **conversation history** (all messages in this chat) is sent with every request so the copilot stays context-aware.

---

## Part 2: Strategy Board — Overview

The **Strategy Board** shows one card per strategy. Each card displays:

- **Stage** (e.g. Designing, Validated, Rehearsing, On Hold) and **risk** (Low/Medium/High), plus an **AI confidence** pill (e.g. 82%).
- The **strategy name** and a **circular progress** ring (current % vs target %).
- An **Edit with AI** button (pencil icon) that, when clicked, **opens the chat sidebar** and **switches to the chat that created this strategy** (or creates a continuation chat if none exists), so Maya can elaborate in natural language to change the strategy.
- A **hero metric block** (one of four lenses: **Throughput**, **Cost**, **Quality & Safety**, **People**) with a colored accent, icon, value, and short detail. The hero has a subtle **shimmer** and **icon glow** animation.
- **Three compact metric tiles** for the other lenses. **Clicking a tile** switches the **focused metric** for **this card only**; the hero block animates (exit/enter) to show the selected lens. Each strategy card keeps its **own selected lens** (e.g. one card on Throughput, another on Cost). The compact tiles have **hover** effects (border/glow in that metric’s brand color).

If there are **no strategies** and no loading skeleton, the board shows an **empty state**: an icon and copy like "Your strategies will appear here." If there are strategies but the **search** filters them out, a message like "No strategies match …" is shown. When there are **two or more** strategies, a **search bar** appears above the list so Maya can filter by strategy name.

Maya **clicks a strategy card** (the card itself, not Edit). The view **transitions** to the **strategy detail** (focus mode): the overview is replaced by a dedicated page for that single strategy.

---

## Part 3: Strategy Detail — Narrative and Controls

The **detail view** opens with a **back** button (arrow) that returns to the overview. The **narrative band** at the top is a dark panel showing:

- The **strategy name** and a **rollout posture** badge (e.g. Scale selectively, Expand now).
- **Edit with AI** and **Propagation Map** buttons.
- A **narrative story** (one or two sentences) that explains: what the strategy is trying to change, expected enterprise effect, why the shown domains matter, current rollout posture, biggest blocker, strongest positive signal, and what leadership should focus on next.
- A compact **progress strip**: e.g. "X/Y areas active," a **bar of colored dots** (one per propagation unit by state), and **domain health dots** (green/orange/red/grey) for at-a-glance status.
- Three short **summary cells**: **Biggest blocker**, **Strongest signal**, **Leadership focus** (top critical action).

Maya can click **Propagation Map** to open an **overlay/section** that shows a **tree**: the **strategic goal** as root, then **domains** (e.g. Production Lines, Quality & Safety, Logistics, Workforce) as the next layer, then **units** (Line A, Line B, Quality Control, etc.) under each domain. Nodes use **health-based** styling (e.g. green border for healthy, red for blocked); problematic nodes have a subtle **float** animation. Clicking a **domain node** in the map **closes the map** and **expands that domain** in the Domains section below. Clicking **Edit with AI** from detail **returns her to the overview**, opens the chat sidebar, and selects the chat for this strategy so she can refine it in context.

---

## Part 4: Critical Now (Podium)

Below the narrative, a **Critical Now** label introduces a **podium** of three priority items (1st, 2nd, 3rd). The **first** is visually dominant (larger card, stronger accent, e.g. pink/danger); the **second** and **third** are smaller, supporting cards (e.g. orange/warning, slate). Each card shows:

- **Rank** (1st / 2nd / 3rd), **domain**, and an **icon** with a soft **breathing** animation.
- **Title** (what to do) and **consequence** (what happens if nothing is done).
- The **first** card also shows **impact area** and **if unresolved** (e.g. "Propagation stalls across …").
- A **primary CTA button** (e.g. "Approve Rollout," "Escalate Blocker") that **executes the action** (approve unit, assign owner, escalate blocker, prioritize expansion, or halt).

**Hovering** a podium card (for ~500 ms) opens an **Issue in focus** popup: a **centered overlay** that animates in (e.g. scale/rotate from below) and shows the same issue in more detail, with a **rank-colored accent bar** and a **close** control. Leaving the card or popup (with a short delay and grace period so the cursor can move to the popup) closes it. The podium cards have a **hover** effect (lift and scale) to suggest interactivity.

---

## Part 5: Domains and Unit-Level Actions

A **Domains** section lists **domain summary cards** (e.g. Production Lines, Quality & Safety, Logistics, Workforce). Each card shows **domain name**, **unit count**, a short **executive summary** (why it matters, current state, main issue, whether leadership attention is needed), and a **health** dot. **Only one domain** can be **expanded** at a time; clicking a domain toggles its expansion.

When expanded, **propagation units** are listed (e.g. Line A, Line B, Quality Control, Shift B Crew). Each unit shows:

- **State** (Active, In Progress, Not Started, On Hold) and **owner** (or "No owner assigned").
- **Readiness** indicators: approved, trained, equipped (check or empty).
- **Blockers** (if any), with **escalated** state shown.
- **Impact** (throughput %, defect %, cost %) when the unit is active and has results.
- A **Halt** button (pause icon) to put the unit on hold.

If this unit is the **target** of one of the top-three Critical Now actions, the unit card is **highlighted** (e.g. distinct background/ring). Actions from the podium or from the "remaining actions" list (e.g. Approve, Assign, Escalate, Prioritize) **update the unit** (and persistence) so the propagation state stays in sync.

---

## Part 6: Remaining Actions and Strategy Advisor

If there are **more than three** derived actions, a **"X more pending actions"** line appears with a **chevron**; clicking it **expands** to show the rest. Each row has a short **description** and a **button** that runs the same **executeAction** logic (approve, assign, escalate, prioritize, halt).

At the bottom of the detail view, the **Strategy Advisor** is a **compact copilot** for this strategy only (not the full chat). It shows:

- **"Ask what to do next"** and **three smart question chips** (e.g. "What should I do about [main blocker]?", "Why is [weakest domain] lagging?", "What should I prioritize next?") generated from the current propagation context.
- A **text input** and **send** button (or Enter). Submitting a question calls the **same strategy-copilot API** with **this strategy’s context** (existing strategy + propagation); the **response** is shown **inline** (with a small icon and "Ask another question" to clear). The advisor does **not** create or edit strategies — it only returns **decision brief–style** answers (recommendation, why, signals, blockers, tradeoffs, confidence) so the leader can decide without leaving the page.

---

## Part 7: Refining a Strategy via Chat

Maya goes **back to overview** and clicks **Edit with AI** on a strategy card (or from the detail header). The **sidebar** opens and the **chat for that strategy** is selected. She types something like *"Edit the strategy to make it 15% instead of 12"* and sends. The **full conversation history** is sent to the API. The copilot is in **refine** mode (existing strategy + propagation context provided). The **backend** is instructed to return **JSON** (action: "refine", targetPercent, etc.) when the user asks for a **change**; if the model returns only text, **fallbacks** (e.g. parsing "15%" from the message or response) still **apply the change**. The **strategy card** (target %, name, guardrails, etc.) **updates** in the Strategy Board and in detail view; the **assistant reply** in the chat can still include the reasoning (Recommendation, Why, Signals, Blockers, Tradeoffs, Confidence). So the leader both **sees the change applied** and gets an **explanation**. If she asks a **question** instead (e.g. "Why did you change it?" or "What’s the biggest risk?"), the copilot answers in **plain text** only (no JSON) and does not change the strategy.

---

## Part 8: Reset and Persistence

At any time, Maya can click **Reset demo data**. A **confirmation** explains that all strategies and chat history will be removed and that new strategies will get fresh demo data. On confirm, **all objectives, initiatives, propagation units, and exec chats** are cleared from storage; the UI resets to **one empty chat**, **overview** view, and **no strategies**. Creating a **new** strategy again triggers the same flow: AI creates it, propagation is **seeded** for that strategy, and opening it in detail shows the **coherent demo story** (e.g. Production as value engine, Quality as scale gate, Logistics healthy, Workforce lagging).

---

## Feature Checklist (for Architecture Comparison)

- [ ] Header: title, role/context, Reset demo data  
- [ ] Chat sidebar: History list, New chat, Select chat, link chat ↔ strategy (objectiveId)  
- [ ] Chat input: free text, Send, Enter to send, suggestion prompt ("Try: …")  
- [ ] User/assistant bubbles: user in rotating brand colors, assistant in grey; thinking state  
- [ ] Full conversation history sent with every request (context-aware refinement and Q&A)  
- [ ] Create strategy: AI returns JSON → new objective + initiative, seed propagation, link chat  
- [ ] Refine strategy: AI returns JSON (or fallback parse) → update objective/initiative, refresh UI  
- [ ] Strategy Board: list of strategy cards, search when ≥2 strategies, empty state, no-results state  
- [ ] Per-card: stage, risk, AI %, name, progress ring, Edit with AI, hero metric, compact metric tiles  
- [ ] Per-strategy metric focus: click tile to set hero lens; hero/compact animations; independent lens per card  
- [ ] Skeleton + sparkles when creating a new strategy (min ~1.5–2 s)  
- [ ] Click card → detail view; Back → overview  
- [ ] Detail: narrative band, rollout posture, Propagation Map, Edit with AI, story, progress strip, blocker/signal/focus cells  
- [ ] Propagation Map: tree (goal → domains → units), health styling, click domain → expand domain and close map  
- [ ] Critical Now: podium (1st large, 2nd/3rd smaller), hover → Issue in focus popup, CTAs execute action  
- [ ] Domains: expand one at a time, unit list with state/owner/readiness/blockers/impact, Halt, highlight if target of Critical Now  
- [ ] Remaining actions: expandable "X more pending actions," execute same actions  
- [ ] Strategy Advisor: smart chips, input, call API with strategy context, show inline answer, "Ask another question"  
- [ ] Execute actions: approve, assign owner, escalate blocker, prioritize, halt — update units and persistence  
- [ ] Persistence: objectives, initiatives, propagation units, exec chats (localStorage); new strategy seeds propagation  

---

*End of user journey story.*
