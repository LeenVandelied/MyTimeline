[BRIEFING ISSUE #334 — Sprint 49, vague 2]

## ⚠ AVANT TOUT — ancrage d'exécution

```bash
cd /Users/herrh/VSProjects/MyTimeline/.claude/worktrees/sprint-47-start-5e5a53
git branch --show-current   # DOIT afficher : sprint/49
```

Worktree git, PAS /Users/herrh/VSProjects/MyTimeline. `cd` explicite au début de CHAQUE commande bash.
Si la branche n'est pas `sprint/49` → STOP, `STATUS: PARTIAL` + `BLOQUE_SUR: mauvaise branche`.

**Piège outillage :** `git diff` renvoie ~vide sous le proxy RTK. Utilise `rtk proxy git diff` ou redirige
vers un fichier. Ne conclus jamais « aucun changement » depuis un `git diff` vide.

## Issue #334 — [BUG] Header de la landing non responsive — scroll horizontal sur mobile
`bug` · `epic:design` · `priority:P1` · `size:M` · `frontend` · `sprint-49`

À **375 px** de large, la landing garde un **scroll horizontal de 173 px**. Cause consignée dans l'issue :
le groupe `flex items-center space-x-4` de `HeaderSection.tsx:52` (`LanguageSelector` + Connexion +
Inscription) demande **299 px**, le logo `text-3xl` **234 px**, soit **533 px** pour **343 px**
réellement disponibles. Le header déborde sur **tout viewport < ~565 px**.

Défaut **pré-existant** (mêmes classes sur `origin/dev` avant le Sprint 48), mais c'est lui qui bloque la
validation mobile de la landing refaite : **c'est le critère d'acceptation n°8 de #56 resté non rempli**.

### Critères d'acceptation
1. Aucun scroll horizontal sur la landing à 375 px de large
2. Le header reste **utilisable** : logo + accès connexion/inscription + sélecteur de langue
3. Le critère d'acceptation n°8 de #56 est validé
4. Comportement vérifié sur au moins 2 largeurs mobiles (375 px et 390 px)

## Décision de design — DÉJÀ ARBITRÉE, ne la rejoue pas

Un agent `ui-design` a tranché pendant la vague 1. **Verdict : APPROUVÉ.** Rapport intégral :
`docs/memory/sprints/sprint-49/design-334-verdict.md` — **lis-le, il contient la spec complète.**

**Solution retenue :** burger sous `md` + CTA « Inscription » maintenu visible + logo responsive.
- logo `text-lg sm:text-xl md:text-3xl`
- groupe droit `< md` = `[Inscription]` + `[burger 44×44]`
- le burger ouvre un panneau off-canvas contenant : les 3 ancres nav, « Connexion », `LanguageSelector`
- à `md:` et au-dessus, le header actuel reste **inchangé**

**Budget à 375 px** (343 dispo) : logo ~140 + 8 + Inscription ~125 (allemand) + 8 + 44 = **~325 px**.

**Pistes écartées, avec la raison — ne les ré-instruis pas :**
- *Masquage seul sous `md`* : le seul accès restant à `/login` serait `FooterSection.tsx:81`, en bas de
  page → **critère 2 non rempli**.
- *Réduction du logo seule* : le groupe fait 299 px sur 343 ; même logo à 0 px, ça casse en allemand.
- *Burger total (Inscription cachée)* : supprime le seul CTA primaire du header, marge non nécessaire.

### Spec issue de la revue design

- **Breakpoint** : `md` (768 px), cohérent avec la nav existante `hidden … md:flex`
  (`HeaderSection.tsx:40`). **Aucun breakpoint custom.**
- **Visible à 375 px** : logo, « Inscription » (`h-11`, ≥ 44 px), burger 44×44.
- **Composant** : **aucun réutilisable tel quel.** `frontend/src/components/dashboard/MobileDrawer.tsx`
  est couplé au dashboard (logout, thème, clés `dashboard.mobile.drawer`).
  → créer `frontend/src/components/landing/LandingMobileMenu.tsx` **calqué** dessus (overlay `z-40` +
  panneau `z-50` + `role="dialog"` `aria-modal` `aria-labelledby`) et **réutiliser**
  `frontend/src/components/timeline/useFocusTrap.ts` (signature `(ref, active, onEscape?)`).
  **Généraliser `MobileDrawer` est hors périmètre** → consigne-le en `[MEMORY:decision]`, ne le fais pas.
- **Tokens DS, par rôle** (aucun hex inline) : panneau = `bg-surface`, séparation = `border-rule`
  (décoratif), texte = `text-ink` / `text-ink-muted`, CTA = accent + encre sur accent, survol = teinte
  accent douce, overlay = noir translucide (cf. `MobileDrawer:48`), motion 200 ms sans rebond
  (DS 120–280 ms, `--ease-quart`).
- **a11y** : burger `aria-expanded` + `aria-controls` + `aria-label` (icône seule), cible `h-11 w-11` ;
  focus-trap + Escape + clic overlay + restauration du focus (via `useFocusTrap`) ; bouton fermer 44×44 ;
  tabulation logo → Inscription → burger → (ouvert) contenu ; focus visible 2 px accent offset 2 ;
  fermeture au clic sur une ancre.
- **i18n** : nouvelles clés `common.landing.navigation.menuOpen` / `menuClose` / `menuTitle` dans les
  **4 locales** (`frontend/public/locales/{fr,en,es,de}/common.json` — chemin **vérifié** par le lead).
  Réutiliser `common.login.title` et `common.landing.buttons.register`. **Zéro chaîne en dur.**
- **testids** : `landing-header-menu-toggle`, `landing-header-menu`, `landing-header-menu-close`,
  `landing-header-menu-overlay`.

**Header partagé ? NON** — `HeaderSection` n'est importé que par
`frontend/src/components/pages/HomePage.tsx:38`. Le risque de propagation signalé par l'issue est écarté.

### ⚠ Ce que la revue design N'A PAS vérifié — à ta charge

L'agent `ui-design` le déclare lui-même :
- **Les largeurs 234 px (logo) et 299 px (groupe) sont reprises de l'issue, PAS re-mesurées** — aucun
  navigateur n'ouvert. Les estimations `de`/`es` sont des extrapolations. **RE-MESURE-LES** avant de t'y
  fier : tout le budget de 325 px en dépend, et la marge annoncée en allemand n'est que de ~18 px.
- `.claude/rules-jit/ux-patterns.md` **n'existe pas** dans ce dépôt (vérifié). Ne le cherche pas.
- Le rendu clair/sombre du panneau n'a pas été vérifié.

## État du code livré par la vague 1 — lis ceci avant de coder

**#335 (`1a9ca6b`) a réécrit `frontend/src/styles/landing.css` et `animations.css`.** Ils sont désormais
**entièrement sur tokens DS**, zéro littéral. Conséquences pour toi :

- **`.nav-link` est propre** et n'est utilisé que par `HeaderSection.tsx`. Les occurrences dans
  `AppShell` sont des `data-testid`, pas la classe. (Constaté par l'agent #335.)
- **Style les liens du panneau par tokens, pas via `.nav-link`** — la revue design le demande
  explicitement.
- `.cta-button` ne vit plus que dans `animations.css`, avec un seul `::after`.
- **N'ajoute aucun littéral de couleur** dans ces fichiers : un test AST
  (`frontend/src/styles/__tests__/landing-palette.test.ts`) les verrouille et rougira.

**#336 (`cc2dc8f`) a migré les bordures de contrôle** vers `--color-rule-emphasis`, y compris via
`globals.css:105` `--color-input`. Un second test AST
(`frontend/src/styles/__tests__/control-border-tier.test.ts`) verrouille le tier des contrôles : si tu
poses une bordure de contrôle sur `rule-strong`, **il rougira**.

## ⚠ Question ouverte, non résolue — ne la prends PAS pour acquise

L'agent #335 a signalé en P1 que **la landing serait invisible au chargement** (`useSectionAnimation`
ajoute `.visible` en impératif puis `unobserve` ; un re-render effacerait la classe).

**Le lead a enquêté : NON ÉTABLI.** Le mécanisme avancé est contredit par le code (les 7 sections ont un
`className` **littéral statique** — React ne réécrit pas un attribut dont la prop n'a pas changé, et la
chaîne de rendu n'a ni rendu conditionnel ni `key` variable). Et la mesure du lead est confondue :
`document.hidden === true` dans son panneau, où un **témoin de contrôle** obtient 0 callback —
`IntersectionObserver` ne fire pas dans un onglet masqué.

**Pour toi :** `HeaderSection` **n'est PAS** une `.section-animation` (les 7 sections concernées sont
Hero, Features, HowItWorks, TimelinePreview, Testimonial, MobileApp, Cta). **Ton travail n'est pas
bloqué.** Mais si tu observes une landing vide en navigateur, **ce n'est probablement pas ta régression** :
vérifie `document.hidden` et le nombre de sections portant `.visible` avant de conclure, et **ne
« corrige » pas `useSectionAnimation`** — c'est hors de ton périmètre et la cause n'est pas établie.

## Plan d'implémentation

```yaml
issue_334:
  fichiers_cles:
    - "frontend/src/components/landing/HeaderSection.tsx"          # vérifié, 67 l. — groupe `flex items-center space-x-4` à l.52
    - "frontend/src/components/landing/LandingMobileMenu.tsx"      # À CRÉER
    - "frontend/src/components/landing/HeaderSection.test.tsx"     # vérifié — assertions sur `hidden md:flex` à mettre à jour
    - "frontend/src/components/dashboard/MobileDrawer.tsx"         # vérifié — MODÈLE, lecture seule
    - "frontend/src/components/timeline/useFocusTrap.ts"           # vérifié — à RÉUTILISER
    - "frontend/public/locales/{fr,en,es,de}/common.json"          # vérifié — 4 locales
  couches_touchees: ["frontend"]
  strategie_test: "unit + E2E (375 et 390) + contrôle navigateur clair/sombre"
  ordre_ecriture: "re-mesurer les largeurs → LandingMobileMenu → HeaderSection → i18n 4 locales → tests → E2E → contrôle navigateur"
  zod_dto_sync: "NON"
  possibly_done: false
```

## Contrat du Design System — ton pack de domaine

> Aucun pack `br-design.md` n'existe dans `.ai-env/context-packs/`. Le fichier ci-dessous,
> `frontend/src/styles/ds/readme.md`, **est** le contrat de référence.

---
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

---

## Triage

Taille: M
Modèle: opus
Effort: high

## Context-pack domaine (lire EN PRIORITE avant tout code)

<!-- ===== cp-frontend.md ===== -->
# Context-pack : Frontend MyTimeline (Next.js 15 App Router / React 18)

> À charger pour TOUTE tâche frontend. Décrit la stack RÉELLE (scan code, sprint 9).
> Versions = source de vérité `frontend/package.json`. Ce pack ne réplique pas les
> valeurs mineures : en cas de doute, relire le `package.json`.

## Stack réelle (versions du package.json)

- **Next.js `^15.2.4`** — App Router, dev `next dev --turbopack`, build `next build`.
- **React `^18.3.1`** + React DOM 18.3.1. ⚠ **PAS React 19** malgré `@types/react@^19`.
- **TypeScript `^5`** strict (`strict: true`, `noEmit`), alias `@/* → src/*`, `@/app/* → app/*`.
- **TanStack Query `^5.101.2`** (+ devtools) — état serveur. API v5 STRICT (forme objet, `gcTime`).
- **Zod `^3.24.2`** — validation + inférence de types.
- **React Hook Form `^7.54.2`** + `@hookform/resolvers@^4` (zodResolver).
- **next-intl `^4.0.2`** — i18n, 4 locales `['fr','en','es','de']`, `localePrefix: 'always'`.
- **Tailwind `^4.0.12`** (`@tailwindcss/postcss`) + `tailwind.config.ts` minimal + `postcss.config.mjs`.
- **shadcn/ui** style `new-york`, `rsc: true`, icônes **lucide-react**, Radix (dialog, select, popover, dropdown, checkbox, label, slot).
- **axios `^1.8.1`** (client HTTP), **react-hot-toast** (toasts globaux), **next-themes** (clair/sombre), **framer-motion**, **dayjs**, **react-colorful**.
- Tests : **Vitest `^2.1.9`** + **RTL `^16`** + jest-dom (jsdom). **Playwright `^1.61`** configuré ET peuplé (`frontend/e2e/` contient ≥9 specs : `golden-path`, `categories`, `products`, `settings-*` — MAJ S33, l'ancienne note « e2e vide » était périmée S9). Storybook 8 présent.

## Structure `frontend/`

- **`app/`** (App Router, PAS `src/app/`) : `layout.tsx` (root, Server Component), `app/[locale]/` avec `dashboard/ login/ register/ forgot-password/ reset-password/ home/ privacy/ terms/`.
- **`i18n.ts`** (racine) : `getRequestConfig`, charge les messages depuis **`public/locales/<locale>/<namespace>.json`** (fichiers par namespace : `auth common dashboard errors legal products register validation`).
- **`middleware.ts`** : `next-intl/middleware`, `localePrefix: 'always'`, matcher exclut `api|_next|*.*`.
- **`src/components/`** : `ui/` (shadcn : button, card, dialog, select, form, input, spinner, dropdown-menu, popover, language-selector…), `calendar/`, `pages/`, `products/`, + composants métier (`EventContent`, `EventEditForm`, `Testimonial*`, `theme-provider`).
- **`src/contexts/`** : `AuthContext.tsx` (source unique du user), `QueryProvider.tsx`.
- **`src/services/`** : `apiClient.ts` (axios + intercepteurs), `authService.ts`, `eventService.ts`, `productService.ts`.
- **`src/hooks/`** : `useAuth.ts`, `useCurrentUser.ts`, `useProductsWithEvents.ts`.
- **`src/lib/`** : `schemas/auth.ts` (Zod), `query-keys.ts`, `utils.ts`.
- **`src/types/`** : `auth.ts` `user.ts` `event.ts` `product.ts` (schémas Zod + types, ré-exports).
- **`src/styles/`** : `globals.css` `landing.css` `animations.css` + **`ds/`** (design tokens Graphite).

## Conventions

- **Server Components par défaut** ; `'use client'` UNIQUEMENT si hooks/état/handlers (ex. `AuthContext`, `QueryProvider`, `useCurrentUser`). Le root `layout.tsx` reste serveur ; `QueryProvider` isole `QueryClientProvider` côté client.
- **TypeScript strict** : zéro `any`, zéro `as` non justifié.
- **État serveur = TanStack Query v5** (forme objet `useQuery({ queryKey, queryFn })`, `gcTime` pas `cacheTime`). Query keys centralisées : `src/lib/query-keys.ts` (factory hiérarchique par domaine, `as const`). NE PAS éparpiller les clés en littéraux → invalidations qui ratent leur cible. `QueryClient` créé via `useState` (une instance/durée de vie, jamais au niveau module en App Router).
- **Auth = `AuthContext` source UNIQUE du user** (`useAuth()`). **#135 / DEC-S9-002** : PII (email, name) N'EST PLUS en `localStorage`. Session = cookie **JWT HttpOnly** (invisible JS). Restauration au montage par **re-fetch `GET /api/auth/me`** (`withCredentials`), `loading:true` le temps du re-fetch (pas de flash anonyme). `logout` ne purge aucun storage. `useCurrentUser` NE refait PAS d'appel `/me` : sa `queryFn` relit le user d'`AuthContext` (anti double-fetch). **Ne jamais réintroduire de PII persistée** → renvoyer vers DEC-S9-002.
- **Sécurité logs** : ne JAMAIS logger l'objet axios brut (`error.config.data` = body → password en clair ; `error.config.headers` = Authorization/cookies). Utiliser un extracteur assaini (`safeErrorMessage`) — cf. `AuthContext`, `apiClient`.
- **Formulaires = RHF + Zod** via `zodResolver`. Deux familles de schémas : « bruts » `*Schema` (service, parse payload, sans message) et factories i18n `create*Schema(t)` (form, messages traduits). Le token/param hors formulaire n'entre pas dans le schéma form (cf. reset-password).
- **Redirections auth localisées** : construire l'URL avec la locale courante (`/${locale}/login`) — `localePrefix: 'always'` casse tout chemin non préfixé.

## Sync Zod ↔ DTO backend (piège récurrent)

Les schémas Zod front doivent rester alignés sur les DTO backend (Spring Boot). Désalignement = strip silencieux ou ZodError runtime.
- `.nullable()` pour un champ nullable backend ; `.optional()` pour un champ absent. JAMAIS `.nullish()` en code manuel.
- Endpoint paginé : `paginatedSchema(itemSchema)`, jamais `schema.array()` (le body est `{items,total,page,size}`).
- Contraintes alignées BR-AUT-003 : username 3..20, email valide, password ≥ 6. Le client ne doit PAS surcontraindre le contrat backend (ex. reset ≠ register).
- DTO connus : login `{username,password}`, register `{name,username,email,password}`, forgot `{email}`, reset `{token,newPassword}`, `/auth/me` → `UserSchema {id(uuid),name,username,email,role}`.
- ⚠ Il n'existe PAS de règle `.claude/rules-jit/zod-dto-sync.md` à ce jour — appliquer cette checklist directement.

## i18n (next-intl 4)

- `useTranslations("namespace")` — JAMAIS de strings FR hardcodées. Pas de `t("key",{ns})` : un `useTranslations` par namespace.
- Messages = `public/locales/<locale>/<namespace>.json` (mock/validation data en JSON, pas de FR inline).
- Zod i18n : factory `create*Schema(t)` (option `useMemo` côté form pour stabilité).

## Design system « Graphite » (`src/styles/ds/`)

- Direction B validée (S6, source projet Claude Design) : quasi-monochrome, accent bleu électrique unique pour *today/active*, type mono (Archivo display/ui + IBM Plex Mono) via `next/font` self-hosté (variables `--font-display/--font-mono`). Clair + sombre complets.
- Tokens : `ds/tokens/` (`colors base spacing typography fonts`) + `ds/components/`, `ds/timeline.css`, `ds/i18n.css`, `ds/a11y-audit.md`, `ds/readme.md`.
- **Theme-aware** : chaque composant doit fonctionner clair ET sombre (`next-themes`). Consulter `ds/readme.md` avant de créer un composant.
- Éviter les hex inline → passer par les tokens CSS du DS.

## Accessibilité

- Spinners : `role="status"` + `aria-label` + `<span class="sr-only">`.
- Tables : `aria-label`, `scope="col"`. Interactifs custom : `role` + `tabIndex` + `onKeyDown` (Enter/Space) + `focus:ring-2`.
- Cf. `src/styles/ds/a11y-audit.md`.

## Tests (Vitest + RTL) — pièges

- **`React.use()` N'EXISTE PAS en React 18.3.1** (PIT-S8-005) — ne pas s'appuyer dessus dans code ou tests.
- **`useSearchParams` exige un `<Suspense>`** englobant (PAT-S8-004).
- **`next build` en CI attrape des erreurs invisibles aux tests RTL** (types/build strict, `ignoreBuildErrors:false`) — un run vitest vert ne garantit pas le build.
- Setup `vitest.setup.ts` : jest-dom, cleanup RTL, mocks `next/font/google`, `next/navigation`, `matchMedia`. `useAuth` hors `<AuthProvider>` lève.
- Objectif : run vitest sans ligne stderr. `act()` warning → test `async` + `await waitFor(...)`. Logs d'erreur intentionnels → `vi.spyOn(console,'error').mockImplementation(()=>{})` + `mockRestore()`.
- ✅ `frontend/e2e/` PEUPLÉ (≥9 specs Playwright : golden-path, categories, products, settings-{account,mobile,navigation,preferences,profile,security}). Vérifier la couverture réelle d'un parcours avant d'ajouter — les nouveaux `data-testid` doivent être référencés dans une spec (sinon coverage-e2e MAJEUR).

## Références

- `docs/memory/decisions.md` (DEC-S9-002 : PII hors localStorage), `docs/memory/patterns.md`, `docs/memory/pitfalls.md` (PIT-S8-005, PAT-S8-004).
- `frontend/src/styles/ds/readme.md` (charte Graphite), `ds/a11y-audit.md`.

<!-- CACHE_CONTROL_BREAKPOINT -->

## Dépendances intra-sprint

**Vague 1 terminée côté design** — tu construis dessus :
- **#335** (`1a9ca6b`) — `landing.css` + `animations.css` sur tokens DS. **COMPLETED.**
- **#336** (`cc2dc8f`) — bordures de contrôle sur `--color-rule-emphasis`. **PARTIAL** (un critère de
  validation navigateur non tenu, sans impact sur toi).

**#69** (virtualisation de la frise) **tourne encore en parallèle** sur
`frontend/src/components/timeline/**` + `frontend/package.json`. Périmètre disjoint du tien — sauf
`useFocusTrap.ts`, qui vit sous `components/timeline/` : **tu le LIS et l'IMPORTES, tu ne le MODIFIES
pas.** S'il ne convient pas tel quel, signale-le, ne le patche pas.

**#337** (vague 3) écrira un E2E mesurant le contraste des CTA de la landing et la troncature de texte.
Tes `data-testid` seront ses points d'ancrage — pose-les exactement comme spécifié.

### Règles de commit en arbre partagé (impératif)
- **`git add` CIBLÉ. JAMAIS `git add -A`, JAMAIS `git add .`** — #69 travaille dans le même arbre.
- 1 seul commit logique, gitmoji, message en **français**.
- Aucun `git rebase`, `git reset`, `git stash`, ni `git checkout` d'un autre fichier.
- Rapporte le SHA **de ton commit** :
  `git log -1 --format=%H -- frontend/src/components/landing/HeaderSection.tsx`.

### Fichiers INTERDITS pour toi
- `frontend/src/components/timeline/**` (→ #69) — `useFocusTrap.ts` en **lecture seule**
- `frontend/package.json` (→ #69) — si le menu exige une dépendance, **arrête-toi et signale-le**
- `frontend/src/hooks/useSectionAnimation.ts` — cause non établie, hors périmètre (cf. HEAD)
- `frontend/src/styles/ds/tokens/colors.css` — lecture seule
- `frontend/src/components/dashboard/MobileDrawer.tsx` — **modèle à copier, pas à généraliser**

`frontend/src/styles/landing.css` t'est ouvert (#335 a fini), mais **n'y ajoute aucun littéral de
couleur** : le test AST le verrouille.

## Contraintes

- Branche cible : `sprint/49` (déjà checkout)
- **Code en anglais, documentation et commits en français**
- **TypeScript strict** — pas de `any`, pas de `@ts-ignore` non justifié
- **Tailwind CSS v4** — attention à la précédence des `@layer`
- **i18n obligatoire** : `next-intl`, **4 locales** (`fr`, `en`, `es`, `de`). Une clé ajoutée en `fr`
  seul est un travail incomplet.
- Tests inline OBLIGATOIRES :
  `./scripts/test-quiet.sh frontend` puis `./scripts/test-quiet.sh e2e`.
  Scopes : `unit`/`backend` (défaut), `frontend`, `e2e`, `all`. **Ne lance pas la suite backend.**
- Aucune migration Flyway, zéro fichier backend.

## ⚠ Le piège central de ce sprint (mémoire projet, S48)

**« CI verte » ne prouve pas que la page est correcte.** Au S48, 2 CTA sont sortis invisibles (contraste
1.00:1) et 1 bouton avait son texte tronqué — CI **entièrement verte**. `jsdom` ne résout **ni la
précédence des `@layer` ni aucune mise en page réelle**. Ton issue est **littéralement un bug de mise en
page** : jsdom ne peut pas la valider.

⇒ **Contrôle navigateur obligatoire avant de déclarer terminé**, avec l'assertion décisive :

```js
document.documentElement.scrollWidth <= document.documentElement.clientWidth
```

À vérifier à **375 px ET 390 px**, en **`fr` ET `de`** (« Registrieren » est le pire cas, marge ~18 px),
et en **clair ET sombre** pour le panneau. Si la marge ne passe pas en allemand, la revue design prévoit
le repli : `px-3` sur le CTA, puis logo `text-base`.

**Note d'environnement** : si ton panneau navigateur a `document.hidden === true`, `IntersectionObserver`
n'y fire pas et la landing apparaîtra vide — c'est un artefact d'outillage, pas ta régression (le lead
l'a rencontré). Le `scrollWidth`/`clientWidth`, lui, reste mesurable dans cet état.

## Livrable attendu (format strict, MAX 500 tokens, style caveman — pas de prose)

```
RETOUR :
- commits: [SHA, ...]
- resume: <objectif atteint + fichiers clés + pitfalls + résultat des tests>
- criteres: 1..4 → OK / NON + raison courte pour chaque non rempli
- largeurs RE-MESUREES: <logo, groupe, total à 375px — en fr ET de. Les 234/299 de l'issue tenaient-ils ?>
- scrollWidth vs clientWidth: <valeurs mesurées à 375 et 390, fr et de>
- i18n: <clés ajoutées × 4 locales — confirme les 4, pas seulement fr>
- a11y: <focus-trap, Escape, aria-expanded, cibles 44x44 — ce que tu as VÉRIFIÉ vs écrit>
- controle navigateur: <ce que tu as réellement ouvert et observé, clair + sombre>
- [MEMORY:*] signaux: <pitfall / pattern / décision — si applicables>
- recommandations suite: <RECOMMAND_* ou piège subtil ; ou "aucune" explicitement>
- RECOMMAND_FOLLOWUP: <découvertes NON-XS hors périmètre + triage estimé ; ou "aucun">
- ABSORBED: <découvertes XS corrigées au passage ; ou "aucune">
- STATUS: COMPLETED   ← TOUTE DERNIÈRE LIGNE (ou STATUS: PARTIAL + BLOQUE_SUR: <raison>)
```

Dernière ligne exactement `STATUS: COMPLETED` ou `STATUS: PARTIAL` — le lead la lit programmatiquement.

**Sois factuel sur ce qui manque.** Un `PARTIAL` honnête vaut mieux qu'un `COMPLETED` qui masque un
critère non tenu. Ne qualifie pas ton travail d'« excellent » ou « parfait » — décris ce qu'il fait et ce
que tu as mesuré.

**Follow-up connu, à NE PAS absorber :** `LanguageSelector`
(`frontend/src/components/ui/language-selector.tsx:27`) a un déclencheur `h-9 w-9` = 36 px, sous les
44 px requis en mobile. Défaut **existant et partagé avec le dashboard** → issue dédiée au triage de
clôture. Signale-le, ne le corrige pas ici.
