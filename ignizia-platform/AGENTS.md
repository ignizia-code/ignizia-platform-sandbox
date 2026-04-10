## Agent Guide: Design & Branding

This repository uses a shared design system. **Always align with it before editing UI.**

### 1. Start here for colors

- **Primary reference**: [`DESIGN_SYSTEM_COLORS.md`](./DESIGN_SYSTEM_COLORS.md)  
  - Defines the IGNIZIA brand palette (`brand.navy`, `brand.blue`, etc.).  
  - Explains semantic roles (`primary`, `action`, `success`, `warning`, `info`, `danger`, `highlight`).  
  - Shows “before/after” class examples.

- **Tailwind source of truth**: [`tailwind.config.ts`](./tailwind.config.ts)  
  - `theme.extend.colors.brand.*` – raw hex values for brand colors.  
  - `primary`, `action`, `success`, `warning`, `info`, `danger`, `highlight`, `background-*`, `card-*`.

**Rules for agents:**

- Do **not** introduce new hex colors in components.  
- Do **not** use stock Tailwind accent classes like `bg-blue-500`, `text-rose-600`, etc.  
- Use only:
  - Brand tokens: `bg-brand-blue`, `text-brand-green`, `bg-brand-blue/10`, etc.  
  - Semantic roles: `bg-primary`, `text-primary`, `bg-action`, `text-success`, `bg-warning/10`, etc.  
  - Existing neutrals: `background-light/dark`, `card-light/dark`, `slate-*`.

ESLint is configured to enforce these constraints; if you get lint errors, check `DESIGN_SYSTEM_COLORS.md` and update your classes.

### 2. Shared UI components

- **Buttons & badges**: [`components/ui`](./components/ui)
  - `Button` – use for primary/secondary/ghost/danger/success CTAs instead of custom button styles.
  - `Badge` – use for small status/label chips with semantic variants (`info`, `success`, `warning`, `danger`, `neutral`).

When adding new CTAs, pills, or chips:

1. Prefer using `Button` / `Badge` over building a new pattern.  
2. If you must add a new variant, wire it to existing semantic colors in `tailwind.config.ts` and update `DESIGN_SYSTEM_COLORS.md`.

### 3. Layout & page-level patterns

- **Login & shell examples** (good references for brand usage):
  - `components/features/auth/LoginPage.tsx` – IGNIZIA hero, logo, and tagline.  
  - `components/layout/Sidebar.tsx` – app shell branding with IGNIZIA logo and wordmark.  
  - `components/layout/Header.tsx` – top nav, neutrals, and primary accents.

When implementing new pages:

- Mirror spacing, typography, and elevation patterns from these files.  
- Keep backgrounds simple (light: `background-light`, dark: `background-dark`) and use brand colors for **focus points only** (CTAs, metrics, key chips).

### 4. If you’re unsure

Before introducing any new visual pattern:

1. Re-read `DESIGN_SYSTEM_COLORS.md`.  
2. Reuse an existing pattern (card from Dashboard, pill from Talent Studio, button/badge from `components/ui`).  
3. Only extend the design system if necessary, and update both:
   - `tailwind.config.ts` (new semantic token), and  
   - `DESIGN_SYSTEM_COLORS.md` (documentation and examples).

### 5. Task Completion & Quality Assurance

To ensure no regression or type errors are introduced:

- **Always** run `npx tsc --noEmit` after building or completing a task.
- Address any TypeScript errors before finishing and reporting the task as complete.
- This helps catch errors that might not be visible in the immediate scope of changes.

