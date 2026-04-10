````plaintext
Agent Studio – MVP Agent Designer & AI Builder

### Goal

Build an **Agent Studio page** that allows users to create, modify, and test AI agents as **deterministic workflows** composed of model-call nodes and simple conditional logic.

The system must support:

* Manual drag-and-drop workflow design
* AI-assisted workflow creation via natural language
* Reusable templates
* Structured outputs for downstream logic

This is an **MVP**. Keep the system simple, composable, and easy to extend later.

---

## 1. Agent Studio Entry Experience

### Required Features

* **Templates Gallery**

  * List of prebuilt agent templates
  * Each template can be:

    * Tried (read-only)
    * Cloned and edited
* **Create Agent**

  * From scratch
  * From template
  * Using AI (natural language builder)

---

## 2. Core Concept: Agent Workflow

An agent is a **workflow (DAG)** of connected nodes.

Each workflow has:

* A single **entry point**
* A deterministic execution order
* A shared execution context

---

## 3. Node Types (MVP Only)

### 3.1 Model Call Node (Primary Node Type)

Each node represents a single LLM call.

**Node properties**

* `id`
* `name`
* `description`
* `prompt`
* `output_schema` (JSON)
* `inputs` (references to upstream node outputs)

**Behavior**

* Prompt can reference previous outputs using simple templating
  Example:

  ```
  {{nodes.extract_intent.intent}}
  ```
* Node output must conform to the defined JSON schema

---

### 3.2 Conditional Node (If / Else)

Used to create branching workflows.

**Properties**

* Input: JSON path from a previous node
* Condition:

  * `==`
  * `!=`
  * `exists`
  * `contains`
* Branches:

  * `true`
  * `false`

**Example**

```json
{
  "condition": "$.intent.type == 'refund'",
  "true_branch": "refund_flow",
  "false_branch": "support_flow"
}
```

Keep logic simple. No loops or custom code.

---

## 4. Output Schema (Critical for MVP)

* Each model node must define an output JSON schema
* Output schema:

  * Is visible to downstream nodes
  * Is used by conditional nodes
* Schema can be:

  * Manually written
  * Auto-suggested by AI (optional)

No advanced validation required in MVP.

---

## 5. Agent Designer UI (Manual Builder)

### Required

* Drag-and-drop canvas
* Nodes can be:

  * Added
  * Connected
  * Edited
* Connections define execution order
* Clear visual distinction between:

  * Model nodes
  * Conditional nodes

No need for:

* Parallel execution
* Loops
* Advanced node types

---

## 6. AI-Powered Agent Builder (Conversational)

### Purpose

Allow users to describe an agent in natural language and have the system **propose** a workflow.

### Behavior

* AI acts as a **workflow architect**, not an autonomous builder
* The AI must:

  1. Ask clarifying questions if needed
  2. Propose:

     * Nodes
     * Prompts
     * Output schemas
     * Conditional logic
  3. Show a preview of the proposed workflow
  4. Apply changes only after user confirmation

### Capabilities

* Add / rename nodes
* Suggest prompts
* Suggest output schemas
* Add conditionals
* Modify existing workflows conversationally

No requirement for perfect workflows. Iteration is expected.

---

## 7. Execution & Testing (MVP Lite)

### Required

* “Run / Preview” mode
* User provides sample input
* Execution runs node-by-node
* Display:

  * Each node’s output
  * Errors (if any)

### Error Handling

* On failure:

  * Stop execution
  * Show raw error and model output

No retries, fallbacks, or recovery logic in MVP.

---

## 8. Agent States

Minimum required states:

* Draft
* Preview/Test

Publishing can be a no-op or placeholder.

---

## 9. Non-Goals (Explicitly Out of Scope for MVP)

Do NOT implement:

* Loops
* Parallel execution
* Multi-agent orchestration
* Tool/function calling
* Scheduling
* Permissions
* Versioning
* Human-in-the-loop steps

---

## Success Criteria

The feature is successful if a user can:

1. Start from a template or scratch
2. Build a multi-step agent with conditionals
3. Use AI to generate or modify workflows
4. Test the agent and inspect structured outputs
5. Understand and control the workflow visually

````
