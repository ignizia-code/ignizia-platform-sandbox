````markdown
# AI Workflow Builder — Prototype Overview

## 1. Prototype Goal

### Objective

Build a **voice-driven AI workflow co-pilot** that helps employees translate their *mental model* of a process into a structured workflow graph on a canvas.

This is **not automation-first**.
This is **mental model extraction first**.

The system should:

1. Extract the workflow from narrative.
2. Visualize it instantly.
3. Ask intelligent follow-up questions.
4. Iteratively converge to a faithful representation of the user’s mind.

---

## 2. Core User Story

> “As an employee, I want to describe how I do my work, and see it automatically turned into a visual workflow that I can refine.”

Example:
Manufacturing company:
Trigger → client places order
Goal → product delivered
Everything in between → sourcing, planning, assembly, QA, packaging, logistics

The system’s job:
Extract the invisible structure behind that story.

---

## 3. Entry Point

### User clicks: “Create Workflow”

They land on:

* Empty canvas (center)
* Instructions panel
* Chat panel (right)
* Microphone button

---

## 4. Initial Strategy: Narrative-First (Better than Template-First)

Instead of starting with templates:

### Instruction Prompt:

> “Describe the workflow as if you’re explaining it to a new employee on their first day. Start from when the process begins and walk through what happens until it’s finished.”

User records voice.

Goal of this phase:

* Capture high-level sequence
* Identify:
  * Trigger
  * Major phases
  * Roles
  * Outputs
  * Dependencies
  * Vocabulary used by employee

This is raw extraction — not precision yet.

---

## 5. System Architecture (Conceptual)

There are **3 continuous AI functions** running in a loop:

### 1️⃣ Extracting

**Purpose:** Convert user input → structured graph elements.

From narrative, extract:

* Nodes (steps)
* Edges (transitions)
* Triggers
* Decision points
* Roles
* Inputs
* Outputs
* Estimated durations
* Constraints

Every time AI concludes something:
→ It immediately updates the canvas.

This instant visual feedback is critical.

The user sees:
“Oh yes, that’s what I meant.”

---

### 2️⃣ Assessing

AI evaluates the graph continuously.

It asks:

* Are there missing gates?
* Is there an unrealistic sequence?
* Are there cycles?
* Is there no exception path?
* Are there unassigned responsibilities?
* Are inputs missing?
* Does something start without a trigger?
* Does something end without a deliverable?

This transforms AI from passive listener → process analyst.

---

### 3️⃣ Planning

AI chooses the **next best question**.

Not random.
Not generic.

The next question should:

* Reduce uncertainty
* Close the largest gap
* Increase structural clarity

Examples:

Instead of:

> “Can you add more details?”

Better:

> “After sourcing materials, does production begin immediately, or is there an approval step?”

Even better (suggestive intelligence):

> “In similar manufacturing workflows, there’s usually a sampling or quality approval before full production. Does that exist here?”

This makes the system:

* Helpful
* Context-aware
* Proactive

---

## 6. Interaction Model

The UI has 3 elements:

### 1. Canvas (center)

* AI modifies automatically
* User can manually edit:
  * Nodes
  * Connections
  * Metadata
* User changes are respected (AI must adapt)

### 2. Chat Panel (right)

Communication channel:

* AI text response
* AI audio response
* User text reply
* User audio reply

Conversation drives structure.

### 3. Voice Layer

Bi-directional:

* User speaks
* AI responds with voice (optional but powerful for immersion)

---

## 7. Workflow Creation Lifecycle (Prototype Flow)

### Step 1 – Narrative Collection

User explains process.
AI builds rough graph.

---

### Step 2 – Visual Reflection

AI says:

> “Here’s what I understood.”

Canvas auto-populates.

AI confirms:

> “Is this aligned with your process?”

---

### Step 3 – Refinement Loop

The loop continues until user says:

> “Yes, this represents the workflow.”

Each iteration:

1. Extract
2. Assess
3. Plan next question
4. Update graph live

---

## 8. What the AI Should Track (Metadata Model)

Each node should eventually have:

* Name
* Type (task, decision, trigger, milestone)
* Owner (role/person)
* Inputs
* Outputs
* Estimated time
* Tools used
* Dependencies
* Exception path
* KPIs (optional for later)

Prototype does not need full completeness.
But AI should aim to fill these gradually.

---

## 9. Intelligence Level (Important)

This feature is NOT just transcription → diagram.

It must behave like:

### A hybrid of:

* Process consultant
* Systems thinker
* Junior operations analyst

It should:

* Detect gaps
* Suggest improvements
* Challenge assumptions gently
* Offer patterns from similar industries

Example:

> “You mentioned production starts immediately after order confirmation. In most factories, capacity planning happens first. Does that occur here?”

This makes the system:
Valuable, not just reactive.

---

## 10. Completion Criteria

The loop stops when:

* No major structural holes
* All nodes connected
* Trigger defined
* End goal defined
* Exception paths clarified
* User confirms satisfaction

AI can suggest:

> “Based on the current structure, this workflow looks complete. Would you like to finalize it?”

User agrees → Workflow saved.

---

## 11. Why This Prototype Is Powerful

This is not about drawing flows.

It’s about:

* Externalizing tacit knowledge
* Structuring mental models
* Making invisible operational logic visible

This is extremely high leverage.

---

## 12. Prototype Scope (Keep It Focused)

For testing, you DO NOT need:

* Full metadata completeness
* Perfect NLP
* Deep industry modeling
* Multi-user collaboration
* Versioning

You only need:

1. Narrative → Graph
2. AI modifies canvas live
3. Question refinement loop
4. User confirmation

Everything else is future phase.

---

## 13. Core Design Principle

The canvas is not primary.

The conversation is primary.

The canvas is the visible memory of the conversation.

That’s a very important framing.

````
