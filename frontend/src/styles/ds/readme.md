# MyTimeline — Design System

The validated direction is **"Graphite"** (Direction B): a near-monochrome,
calm-neutral system for people who keep everything in view — closer to Notion
Calendar / Linear than to a template. Colour appears only as **event data** plus a
single **electric-blue accent** for *today / active*. Mono type carries everything
temporal. Full light + dark.

> Direction history lives in `Direction & Moodboard.html` (v1, almanac) and
> `Direction & Moodboard v2.html` (v2, the three productivity routes — Daylight /
> **Graphite** / Daybreak). v2 → Graphite was approved; this system implements it.

## The product

**MyTimeline** is a personal organisation assistant built around a **horizontal
timeline**: lanes = **products**, x-axis = **time**, events = **bars**. Users track
renewals, warranties, expiries and deadlines, grouped by category.

- **Product** — a named thing in a **category** (Vehicles / Insurance / Food /
  Medical), holding events.
- **Event** — `title`, `type` (`single` | `duration`), optional duration
  (value + unit), optional recurrence, `start`/`end`, and a user-chosen **colour**
  from the curated 12.
- Computed **status**: `expired` / `ongoing` / `upcoming`.
- Multilingual (FR / EN / ES / DE). Primary copy language is French; UI uses
  translation keys.

### Redesigned away from
Generic dark shadcn theme, purple→indigo gradient hero, gradient CTAs, rounded
shadowed feature cards. The new system rejects all of that.

## Sources given

- **Codebase (read-only, mounted):** `MyTimeline/` (Next.js `frontend/` + Java
  `backend/`). Key files: `frontend/src/components/calendar/TimelineCalendar.tsx`,
  `pages/HomePage.tsx`, `EventEditForm.tsx`, `products/ProductDrawer.tsx`,
  `types/{event,product}.ts`, `styles/globals.css`, `public/locales/**`.
- **Written brief:** "Design System — MyTimeline" (art-direction spec) from the
  kickoff message — anti-slop guardrails, palette/type options, component scope.

---

## CONTENT FUNDAMENTALS

- **Voice:** plain, calm, second-person ("your renewals", "in one view"). Speaks to
  organised people who want control, not hand-holding. Confident, never salesy.
- **Casing:** sentence case for UI labels and buttons ("New product", "Add event").
  **UPPERCASE + letter-spacing** is reserved for mono micro-labels (eyebrows,
  table headers, status badges, graduations) — that contrast is part of the
  identity.
- **Numbers, dates, durations, IDs:** always **mono**, tabular, ISO where it adds
  precision (`2026-05-14`, `14 d`, `1 px = 6 h`, `↻ every year`).
- **Emoji:** never, as UI. Status is carried by colour + a mono word, not a glyph.
- **Tone examples:** "Every renewal, warranty and deadline — in one view." ·
  "Insurance renewal → 14 May, every year." · empty/secondary text stays terse.

## VISUAL FOUNDATIONS

- **Colour:** calm neutrals (graphite ramp `#FCFCFD`→`#0B0C0E`); surfaces are real
  white on light, warm-anthracite on dark — never pure `#000`. **Primary = graphite**
  (near-black buttons; inverts to light on dark). **Accent = electric blue**
  (`#1170E4` / `#4D9BFF`) used sparingly for today/active/links. Status is
  desaturated and matte. Events draw from a **curated 12** (calendar-grade,
  AA-tuned both modes) — see `guidelines/colors-events.card.html`.
- **Type:** **Archivo** (display + UI — neutral technical grotesque, deliberately
  not Inter), **IBM Plex Mono** for everything temporal. Non-standard ~1.27 modular
  scale: **13 / 15 / 17 / 21 / 27 / 35 / 45 / 57**. Tight tracking on display,
  snug-to-normal leading in body.
- **Spacing:** base-4 with odd-preferred steps (3·5·7·11·13) to avoid the
  Tailwind-default rhythm. Magazine-ish: unequal columns, fine rules over boxes.
- **Borders & cards:** the system **prefers 1px hairline rules to cards**. When a
  card is used: 1px border, radius ≤ 10px, **no** heavy shadow. Radius ramp
  3/5/7/10/14; pill reserved for switches.
- **Border tiers — decorative vs functional (#293).** Three tokens, and the
  choice is an accessibility decision, not a taste one:

  | Token | Light / dark | vs `bg` · `surface` | Use for |
  |---|---|---|---|
  | `--color-rule` | `#E6E7EB` / `#20232A` | 1.21 · 1.24 (light) | **Decorative** separators: hairlines, dividers, card and image frames — anything whose removal costs no information. |
  | `--color-rule-strong` | `#D1D3D9` / `#2E323A` | 1.46 · 1.50 (light) | **Decorative, emphasised**: nested panels, table gridlines that need to read a step stronger. |
  | `--color-rule-emphasis` | `#7A7E87` (`--gray-450`), same both modes | 3.97 · 4.07 light · 4.81 · 4.49 dark | **Functional**: the border IS the affordance — outline buttons, unfilled inputs, checkbox/radio outlines, focusable chips. |

  WCAG 2.1 **1.4.11 Non-text Contrast** requires **≥3:1** for the visual boundary
  of a control. `rule` and `rule-strong` are far below it and are *meant* to be:
  they carry no state. Whenever a border is the only thing telling the user a
  control exists, use `rule-emphasis`.

  Two rules of thumb:
  - **Do not reach for a text token** (`ink-muted`, `ink-faint`) to get a visible
    border. That was the S39 stopgap in `HeroSection` and it is now removed —
    it couples control chrome to the text ramp and overshoots to ~6:1.
  - `rule-emphasis` is **not inverted in dark**. `--gray-450` is the one ramp step
    clearing 3:1 against both light surfaces (`#FCFCFD`/`#FFFFFF`) and both dark
    ones (`#0B0C0E`/`#131519`); it also stays below `ink-muted` in both modes, so
    border-quieter-than-text still holds. Re-measure all four ratios before
    retuning it.
- **Elevation:** shadows are subtle and rare (`--shadow-xs…lg`); popovers/modals
  get `md`/`lg`, resting surfaces get a hairline. No glow, no aurora.
- **Motion:** `cubic-bezier(.32,.72,0,1)`, **no bounce**, 120–280ms. Micro-
  interactions 160ms. Timeline favours momentum scroll + smooth graduation changes.
- **Hover / press / focus:** hover = surface-2 fill or one-step-darker primary;
  selected = accent-soft tint; **focus is strong and marked** — `2px` accent
  outline at `2px` offset (never the browser ring).
- **Imagery / texture:** none by default — no gradients-as-decoration, no
  glassmorphism, no grain, no blobs. The interface is the texture.

## ICONOGRAPHY

- **Custom identity set:** the `Icon` component (`components/icons/Icon.jsx`) ships
  ~18 bespoke marks at **stroke 1.5** — timeline, event, duration, milestone,
  today, recurrence, minimap, ruler, deadline, reminder (not in Lucide) plus
  filter/archive/search and the four category marks. Use `<Icon name="today" />`.
  See `components/icons/icons.card.html`.
- **Fallback set: Lucide, stroke `1.5`** (never the default 2px — that 2px is part
  of the "AI slop" look the brief rejects) for anything outside the custom set.
- **Brand glyph:** a custom calendar frame holding two event bars (accent + faint),
  i.e. the product in one mark — `Icon name="logo"` / `guidelines/brand-wordmark.card.html`.
- **Emoji / unicode as icons:** not used. The only "glyphs" allowed in product copy
  are the recurrence mark `↻` and timeline arrows, set in mono.
- **No PNG icon assets** were carried over (the codebase's marketing SVGs are from
  the rejected design). Category icons (car / shield / utensils / heart) are Lucide.

---

## INDEX / manifest

**Root**
- `styles.css` — single entry point (`@import`s tokens + components). Link this.
- `Direction & Moodboard.html`, `Direction & Moodboard v2.html` — direction docs.
- `SKILL.md` — Agent-Skill front matter for downloadable use.
- `readme.md` — this file.

**`tokens/`** — `fonts.css` (Archivo + IBM Plex Mono via Google Fonts),
`colors.css` (Graphite, light + `.dark`), `typography.css` (scale), `spacing.css`
(spacing/radius/shadow/motion/z), `base.css` (resets, focus, scrollbars).

**`components/`** (runtime namespace `window.MyTimelineDesignSystem_2b7a7a`)
- `icons/` — **Icon** (+ `iconNames`) — the custom identity icon set
- `buttons/` — **Button**, **IconButton**
- `forms/` — **Input**, **Textarea**, **Select**, **Checkbox**, **Radio**, **Switch**
- `display/` — **Badge**, **Tag**, **Avatar**, **Card**
- `feedback/` — **Toast**, **Tooltip**, **Dialog**
- `navigation/` — **Tabs**
- `timeline/` — **TimelineRuler**, **TimelineLane**, **TimelineEventBar**,
  **TimelineCursor**, **TimelineMinimap**, **TimelineZoomControls**, **DateStamp**,
  **EventPill**, **RecurrenceBadge**
- Component styles ship via `components/core.css` + `components/timeline.css`.
- Each directory has a `*.card.html` specimen (Design System tab → "Components").

**`guidelines/`** — foundation cards: Colors (neutrals, primary/accent, status,
event palette, dark surfaces), Type (display, body, mono, scale), Spacing (scale,
radius, elevation+motion), Brand (wordmark, principles).

**`ui_kits/timeline-app/`** — interactive recreation: `index.html` (shell + load),
`kit.jsx` (icons, date helpers, component re-exports), `app.jsx` (screens + state),
`data.js` (sample products/events). Login → timeline board (ruler, lanes, event
bars, today cursor, minimap, zoom) → list view → add-product dialog with an event
builder → event-detail dialog. Light/dark toggle in the sidebar.

## Audit notes / readiness

**Fixed in audit:** light-mode status colours (success/warning/info) retuned to meet
**WCAG AA (≥4.5:1)** as small text on white (were 3.4–4.5:1 → now 4.76–5.42:1);
`Tooltip` reveals on **keyboard focus** (`:focus-within`); **`prefers-reduced-motion`**
guard added. **`Select` now has full keyboard nav** (↑/↓/Home/End/Enter/Esc +
type-ahead, `aria-activedescendant` listbox pattern). **`Dialog` now traps Tab focus,
focuses the first control on open, closes on Escape, and restores focus to the
trigger on close.**

**Ready to use as-is for:** prototypes, mocks, internal tools, and as the visual
foundation for the production rewrite. Tokens, light/dark, and all 26 components
render cleanly; `check_design_system` reports no issues.

**Notes for production:**
- `Select` and `Dialog` are **hand-rolled with keyboard a11y built in** (no npm
  dependency). They're solid for app use; if you'd rather lean on the audited
  Radix primitives already in the codebase, the props line up 1:1.
- **`--color-ink-faint`** (~2.8:1 on white) is a **decorative/faint tier** by design
  (eyebrows, placeholders, disabled hints) — do **not** use it for essential text.
- **`--color-rule` / `--color-rule-strong`** are likewise a **decorative tier**
  (1.2–1.5:1). Control boundaries take **`--color-rule-emphasis`** (≥3.97:1 both
  modes, #293) — see *Borders & cards* above.
- Component styling ships as plain CSS classes (`components/*.css`); there is no
  Tailwind/CSS-Modules build step — fine for these artifacts, scope per your stack
  for production.
- **Fonts are not yet vendored** — they load via Google `@import` (works online). I
  can't fetch the `.woff2` binaries from this environment; drop the Archivo +
  IBM Plex Mono `.woff2` files into `tokens/` (or attach them) and I'll wire up
  local `@font-face` for fully-offline use.

## Caveats / next steps

- **Fonts load via Google Fonts `@import`** (Archivo + IBM Plex Mono are the real
  finals, not stand-ins). No local `@font-face` binaries are bundled, so the
  compiler reports "Fonts: (none)" — harmless. ABC Diatype / Berkeley Mono are
  optional licensed upgrades named in the brief.
- **Icon direction note:** the brief's *almanac* icon ideas (compass rose, sextant,
  hourglass) belonged to the rejected v1 direction; they'd clash with Graphite, so
  the custom `Icon` set is clean geometric timeline/temporal marks instead. Happy to
  add more marks on request.
- The `_ds_bundle.js` runtime is compiled automatically; component cards and the UI
  kit mount against it.
