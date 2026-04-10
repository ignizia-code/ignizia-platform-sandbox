## IGNIZIA Color System

This project uses a small, explicit set of brand colors and semantic roles so the UI stays visually consistent as new features are added.

### Brand palette (source of truth)

These values live in `tailwind.config.ts` under `theme.extend.colors.brand`:

- **Navy (brand.navy)**: `#063472`
- **Pink (brand.pink)**: `#E8347E`
- **Green (brand.green)**: `#2DC37C`
- **Blue (brand.blue)**: `#06BAF6`
- **Orange (brand.orange)**: `#FAB61F`
- **Yellow (brand.yellow)**: `#FAE934`

Use these via Tailwind classes such as:

- `bg-brand-navy`, `text-brand-navy`, `border-brand-navy`
- `bg-brand-blue/10` (soft backgrounds), `text-brand-pink`, etc.

### Semantic color roles

Most components should use **semantic roles** instead of referring directly to brand tokens:

- **Primary / Accent**
  - `primary` → brand navy (`#063472`) – headings, key brand elements.
  - `accent` / `action` → brand blue (`#06BAF6`) – primary call‑to‑action buttons and key interactive elements.
- **Feedback**
  - `success` → brand green (`#2DC37C`) – positive/confirming states.
  - `warning` → brand orange (`#FAB61F`) – caution, pending, needs attention.
  - `info` → brand blue (`#06BAF6`) – neutral informational highlights.
  - `danger` → brand pink (`#E8347E`) – destructive or high‑attention actions.
- **Highlights**
  - `highlight` → brand yellow (`#FAE934`) – small highlights, chips, badges.

In Tailwind, these are available as:

- `bg-primary`, `text-primary`
- `bg-action`, `text-action`, `border-action`
- `bg-success`, `text-success`, `bg-warning`, `text-warning`, etc.

### Neutrals

We continue to use Tailwind’s `slate-*` scale and existing theme neutrals:

- Backgrounds: `background-light`, `background-dark`
- Cards: `card-light`, `card-dark`

Prefer these over new arbitrary gray hex values.

### Usage guidelines

- **Do**:
  - Use `bg-action` / `text-action` for primary buttons and key CTAs.
  - Use `bg-primary` / `text-primary` for brand anchors like logos, key metrics, and navigation accents.
  - Use `bg-brand-*-10` style patterns (e.g. `bg-brand-blue/10`) for soft backgrounds on cards, chips, and badges.
  - Use shared components (buttons, badges, chips) that already encapsulate these choices.
- **Don’t**:
  - Add new raw hex colors directly in components.
  - Use stock Tailwind accent colors (`bg-blue-500`, `text-rose-600`, etc.) for brand or CTA elements.
  - Mix multiple unrelated accent families in the same view.

### Examples

- **Before**:
  - `className="bg-blue-500 hover:bg-blue-600 text-white ..."`
  - `className="text-rose-600 dark:text-rose-400 ..."`
  - `style={{ color: '#06BAF6' }}`
- **After**:
  - `className="bg-action hover:bg-brand-blue text-white ..."`
  - `className="text-danger dark:text-danger ..."`
  - Use a shared `Button` / `Badge` component wired to semantic roles.

### When introducing new UI

1. Pick a **semantic role** first (primary, secondary, success, warning, info, danger, highlight).
2. Use the corresponding Tailwind class (`bg-action`, `text-success`, `bg-warning/10`, etc.).
3. Prefer using an existing shared component over assembling color classes by hand.
4. If you think you need a new semantic role, update `tailwind.config.ts` and this document in the same PR.

