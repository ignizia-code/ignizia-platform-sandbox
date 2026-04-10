## Summary

- [ ] Describe the purpose of this change.
- [ ] Note any user-facing UI changes.

## IGNIZIA color checklist

- [ ] No new raw hex colors were added in components (ESLint will fail on `#[0-9a-fA-F]{3,6}`).
- [ ] Only IGNIZIA brand/semantic Tailwind classes are used for accents:
  - `bg-primary`, `bg-action`, `bg-success`, `bg-warning`, `bg-info`, `bg-danger`, `bg-highlight`, or `bg-brand-*`.
- [ ] No stock Tailwind accent classes were added (e.g. `bg-blue-500`, `text-rose-600`, `border-emerald-400`, etc.).
- [ ] New buttons/badges/chips use shared primitives (`Button`, `Badge`) where possible.

For reference, see `DESIGN_SYSTEM_COLORS.md`.

<!-- Human readable Summary
The author is prompted to:

Describe why the change exists (e.g. “Add export button to Talent Studio so users can download role lists”).
Call out any UI changes (e.g. “New ‘Export’ button in the roles toolbar; success toast after export”).
IGNIZIA color checklist
Before merging, the author (and reviewers) confirm design-system rules:

No raw hex
e.g. you must not add style={{ color: '#1a2b3c' }} or #[0-9a-fA-F]{3,6} in components — ESLint is set up to flag that.
Only IGNIZIA tokens
Use classes like bg-primary, bg-action, bg-success, bg-brand-blue, etc., not arbitrary Tailwind accent colors.
No stock Tailwind accents
e.g. don’t add bg-blue-500, text-rose-600, border-emerald-400; use the semantic/brand classes above.
Reuse shared UI
New buttons/badges/chips should use Button and Badge from components/ui/ where possible instead of custom styled elements.
So in short: it’s for making sure every PR has a clear summary and that UI changes follow the IGNIZIA design system (colors and components), with the checklist as a reminder and a gate before merge. -->