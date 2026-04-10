---
name: impeccable-frontend-design
description: Apply Impeccable as the design reference for frontend features and visual/UI work. Use only when the user explicitly includes `/i-` in the request and the task involves frontend implementation, design, layout, styling, or visuals.
---

# Impeccable Frontend Design

## Activation Rule

Apply this skill only when both conditions are true:

1. The user message includes `/i-`.
2. The task involves frontend feature work or design/visual output.

If `/i-` is not present, do not apply this skill.

## Core Instruction

When active, treat **Impeccable** as the primary design reference for UI and frontend decisions.

## Workflow

1. Identify which UI area is changing (component, page, state, interaction).
2. Use Impeccable guidance to shape:
   - layout and spacing rhythm
   - typography hierarchy and readability
   - visual consistency (color, borders, elevation, icon usage)
   - interaction states (hover, focus, active, disabled, loading, empty, error)
   - accessibility (contrast, keyboard focus visibility, semantic structure)
3. Implement or propose frontend updates consistent with existing project design tokens/components.
4. Briefly explain how the change aligns with Impeccable.

## Output Expectations

- Prioritize clean, consistent, production-ready UI decisions.
- Prefer reusable component patterns over one-off styling.
- Keep visual changes cohesive with the surrounding product surface.

## Clarification Rule

If "Impeccable" references a private guide and details are not available in-repo, ask the user for the specific Impeccable rules or examples to follow before making major visual changes.
