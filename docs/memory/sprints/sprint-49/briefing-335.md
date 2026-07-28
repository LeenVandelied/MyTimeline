[BRIEFING ISSUE #335 — Sprint 49, vague 1]

## ⚠ AVANT TOUT — ancrage d'exécution (lire en premier, ne pas sauter)

Tu travailles dans un **worktree git**, PAS dans le dépôt principal.

```
cd /Users/herrh/VSProjects/MyTimeline/.claude/worktrees/sprint-47-start-5e5a53
```

**Fais ce `cd` explicitement en tout début de session**, avant toute commande. Un subagent qui
part sur `/Users/herrh/VSProjects/MyTimeline` lit un autre arbre de fichiers et produit un faux KO.

Garde-fou à exécuter et vérifier avant d'écrire la moindre ligne :

```bash
cd /Users/herrh/VSProjects/MyTimeline/.claude/worktrees/sprint-47-start-5e5a53
git branch --show-current   # DOIT afficher : sprint/49
git rev-parse HEAD          # base de départ : 92c14c4e32f6549b19efe6b925271f89b2b99747
```

Si la branche n'est pas `sprint/49` → **STOP**, retourne `STATUS: PARTIAL` + `BLOQUE_SUR: mauvaise branche`.

**Piège outillage :** `git diff` renvoie une sortie ~vide sous le proxy RTK de ce poste. Utilise
`rtk proxy git diff` ou redirige vers un fichier puis lis-le. Ne conclus jamais « aucun changement »
depuis un `git diff` vide.

## Issue

**#335 — [FEATURE] `landing.css` : couleurs hors palette Graphite et règles dupliquées**
Labels : `enhancement`, `epic:design`, `priority:P1`, `size:M`, `frontend`, `sprint-49`

### Contexte

La landing page migrée sur le Design System au Sprint 48 (#56) a bien retiré les couleurs hardcodées du
code TSX des composants. Mais un fichier CSS séparé continue d'injecter des couleurs hors charte, et deux
règles CSS existent en double avec des animations qui se superposent visuellement.

### À faire

`frontend/src/styles/landing.css` contient des couleurs hexadécimales **hors palette Graphite** —
`#8B5CF6` et `#4F46E5` (violet/indigo), `#374151`, `#4B5563`, `#6D28D9` — utilisées par `.feature-card`,
`.timeline-preview`, `.testimonial-card`, `.card-gradient-border`, `.nav-link`, classes appliquées sur les
sections de la landing. Ces couleurs sont **theme-blind** : elles ne suivent pas le mode clair/sombre.
C'est pour cela que le critère n°3 de #56 (« aucune couleur hardcodée ») n'est rempli que côté TSX.

S'y ajoutent 2 duplications de règles :
- `.section-animation` définie à la fois dans `animations.css:4` et `landing.css:167`
- `.cta-button` définie à la fois dans `landing.css:47` et `animations.css:59`, chacune avec un
  pseudo-élément de brillance différent, qui s'animent **simultanément** (effet visuel indésirable).

### Critères d'acceptation

- [ ] Plus aucune couleur hex hors palette Graphite dans `landing.css`
- [ ] Toutes les couleurs de `landing.css` utilisent les tokens DS et suivent le thème clair/sombre
- [ ] `.section-animation` n'existe qu'à un seul endroit
- [ ] `.cta-button` n'existe qu'à un seul endroit, un seul effet de brillance visible
- [ ] Le critère n°3 de #56 est validé aussi côté CSS

### Risque annoncé par l'issue

Remplacer les couleurs peut changer visuellement les cartes/testimonials — à valider avec une capture
avant/après. La fusion des règles dupliquées doit **choisir** laquelle des deux brillances garder,
et justifier le choix.

## Plan d'implémentation (mini-plan — ancrage vérifié au grep sur `92c14c4` le 2026-07-28)

```yaml
issue_335:
  fichiers_cles:
    - "frontend/src/styles/landing.css"          # vérifié, 222 l. — 5 hex hors palette
    - "frontend/src/styles/animations.css"       # vérifié, 76 l. — porte les 2 doublons
    - "frontend/src/styles/ds/tokens/colors.css" # vérifié, 4.5K — LECTURE SEULE, source des tokens
    - "frontend/src/styles/ds/readme.md"         # vérifié, 11.9K — contrat DS, inliné plus bas
  couches_touchees: ["frontend"]
  strategie_test: "unit (AST PostCSS, cf. PAT-S48-001) + contrôle navigateur clair/sombre"
  risque_regression: |
    Inventaire hex VÉRIFIÉ (lignes exactes) dans landing.css :
      #8B5CF6  → l. 8, 158, 200
      #4F46E5  → l. 8, 158, 200
      #374151  → l. 28, 130, 183
      #4B5563  → l. 34, 136
      #6D28D9  → l. 142
      #fff     → l. 202, 203      (à traiter aussi : theme-blind par définition)
    Doublons CONFIRMÉS aux lignes annoncées :
      .section-animation   → animations.css:4   ET landing.css:167   (+ .visible : :10 / :173)
      .cta-button          → landing.css:47     ET animations.css:59
      les 2 brillances DIFFÈRENT : landing.css utilise ::before (l. 54, 70),
      animations.css utilise ::after (l. 64, 75). Ce ne sont pas des doublons identiques —
      en supprimer un CHANGE le rendu. Choisis, justifie, et vérifie en navigateur.
  ordre_ecriture: "inventaire hex → mapping vers tokens DS → dédoublonnage (choisir UNE brillance, justifier) → contrôle navigateur clair+sombre"
  zod_dto_sync: "NON"
  possibly_done: false
  etat_reel_du_code: "(travail réel — les 5 hex et les 2 doublons sont présents aux lignes annoncées sur 92c14c4.)"
```

## Pièges du Sprint 48 qui s'appliquent DIRECTEMENT à cette issue

Ces 4 pièges viennent d'être payés au sprint précédent sur exactement ces fichiers. Les ignorer, c'est
les repayer.

- **`PIT-S48-001` — un contraste se valide sur 4 fonds, pas 1.** Il faut vérifier chaque couleur contre
  `bg` **et** `surface`, en clair **et** en sombre. Une valeur unique pour les deux modes ne passe
  généralement pas : au S48, `gray-500 #5E626B` donnait 2.99:1 sur `surface` sombre (sous le seuil 3:1)
  et `gray-400 #969AA3` échouait en clair (2.75:1). La contrainte serrée est **`bg` en clair** et
  **`surface` en sombre**. Un token de couleur doit donc souvent être **découplé clair/sombre**.
- **`PIT-S48-002` — Tailwind scanne les commentaires.** Si tu laisses un nom de classe supprimé dans un
  commentaire, Tailwind le régénère. Et une regex `\bborder-rule\b` matche aussi `border-rule-emphasis` :
  attention aux remplacements en masse.
- **`PIT-S48-003` — un `reveal-on-scroll` sans repli rend la page invisible.** `.section-animation` est
  précisément ce mécanisme. Si tu touches à sa définition ou à sa fusion, assure-toi qu'un utilisateur
  sans `IntersectionObserver` (ou avec `prefers-reduced-motion`) voit quand même le contenu.
- **`PIT-S48-005` — `asChild` (Radix) remonte `overflow` et la cascade sur le `<a>` fusionné.** C'est ce
  qui a produit les 2 régressions visuelles du S48. `.cta-button` est appliqué sur des boutons de la
  landing susceptibles d'être en `asChild` : vérifie le rendu réel, pas seulement le CSS.
- **`PAT-S48-001` — pattern utile pour toi :** on peut tester cascade et layout **sans navigateur** via
  un parcours AST PostCSS. C'est le moyen d'écrire un test unitaire qui garantit « plus aucun hex hors
  palette dans `landing.css` » et « `.cta-button` n'est déclaré qu'une fois ». Cherche ce pattern dans
  `docs/memory/patterns.md` avant de réinventer.

## Contrat du Design System — c'est ton pack de domaine

> Aucun pack `br-design.md` n'existe dans `.ai-env/context-packs/` (lacune connue, follow-up ouvert).
> Le fichier ci-dessous, `frontend/src/styles/ds/readme.md`, **est** le contrat de référence : tiers de
> couleur, comportement clair/sombre, règles de bordure. Lis-le avant de choisir le moindre token.

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

Tu es en **vague 1**, lancé **en parallèle** de deux autres subagents :
- **#69** — virtualisation de la frise : `frontend/src/components/timeline/**` + `frontend/package.json`
- **#336** — dette WCAG bordures : `frontend/src/styles/ds/components/core.css` + 5 composants de formulaire

Ces périmètres sont **disjoints du tien** — vérifié au grep. Mais l'arbre de travail git est **partagé**.

**Deux issues dépendent de ton résultat :**
- **#334** (vague 2) touchera `HeaderSection.tsx` **et** `landing.css` (`.nav-link`). Elle attend que tu
  aies fini pour éviter le conflit. Laisse `landing.css` dans un état propre et cohérent.
- **#337** (vague 3) écrira un test E2E qui **mesure le contraste réel des CTA de la landing**. Si tu
  laisses un CTA sous le seuil WCAG AA, ce test le rougira. Autant le régler maintenant.

### Règles de commit en arbre partagé (impératif)

- **`git add` CIBLÉ sur tes fichiers uniquement. JAMAIS `git add -A`, JAMAIS `git add .`** — tu
  emporterais le travail en cours des deux autres subagents dans ton commit.
- Un seul commit logique, message gitmoji en français.
- Aucun `git rebase`, `git reset`, `git stash`, ni `git checkout` d'un autre fichier.
- Le SHA lu via `git rev-parse HEAD` après ton commit peut déjà avoir bougé (course entre subagents).
  Rapporte le SHA **de ton commit** (`git log -1 --format=%H -- frontend/src/styles/landing.css`), et
  signale un doute plutôt que d'affirmer.

### Fichiers formellement INTERDITS pour toi

- `frontend/src/styles/ds/components/core.css` (→ #336)
- `frontend/src/styles/ds/tokens/colors.css` — **lecture seule**. Le token dont tu as besoin existe
  probablement déjà ; si tu penses devoir en **créer** un, c'est une décision de design → signale-le en
  `RECOMMAND_UI_DESIGN` plutôt que de l'ajouter unilatéralement.
- `frontend/src/components/timeline/**` et `frontend/package.json` (→ #69)
- `frontend/src/components/landing/**` (→ #334, vague 2) — tu travailles sur le **CSS**, pas sur les
  composants. Si un remplacement de couleur t'oblige à toucher un `.tsx` de `landing/`, **arrête-toi** et
  signale-le : c'est un chevauchement avec #334, à arbitrer par le lead.

Tes fichiers, à toi seul : `frontend/src/styles/landing.css` et `frontend/src/styles/animations.css`.

## Designer

Pas de revue `ui-design` préalable sur cette issue : tu ne crées **aucun** composant ni écran, tu
remplaces des valeurs par les tokens **existants** du DS. Le contrat est le readme DS inliné ci-dessus.

**Mais** : si le mapping d'une couleur n'est pas évident (aucun token n'a le rôle sémantique voulu), ne
choisis pas au hasard le token le plus proche visuellement — signale `RECOMMAND_UI_DESIGN` avec la liste
des couleurs ambiguës. Un violet `#8B5CF6` sur une `.feature-card` n'a pas d'équivalent direct dans une
palette quasi-monochrome : c'est exactement le cas qui mérite un arbitrage, pas une devinette.

## Contraintes

- **Branche cible : `sprint/49`** (déjà checkout — vérifie via le garde-fou en HEAD)
- **Commit :** 1 commit logique, gitmoji, message en **français**
- **Code en anglais, documentation et commits en français** (convention projet)
- **Tailwind CSS v4** — attention à la précédence des `@layer` (c'est la cause racine des régressions S48)
- **Tests obligatoires, inline :**
  ```bash
  ./scripts/test-quiet.sh frontend   # Vitest unitaires
  ```
  Scopes valides : `unit`/`backend` (défaut), `frontend`, `e2e`, `all`.
  Ce sprint est **100 % frontend** — ne lance pas la suite backend (Docker requis, aucun apport ici).
- **Pas de migration Flyway**, zéro fichier backend, `zod_dto_sync: NON`.

### ⚠ Le piège central de cette issue (mémoire projet, S48)

**« CI verte » ne prouve pas que la page est correcte.** Au Sprint 48, sur **ces fichiers exactement**,
2 CTA sont sortis invisibles (contraste mesuré **1.00:1**, texte bleu sur fond bleu) et 1 bouton avait son
texte tronqué en plein mot — avec une CI **entièrement verte**. Raison : `jsdom` ne résout **ni la
précédence des `@layer` CSS ni aucune mise en page réelle**, et `next build` ne contrôle aucun style à
l'exécution.

⇒ **Ouvre un vrai navigateur avant de déclarer terminé.** Vérifie la landing en **clair ET en sombre** :
les cartes, les testimonials, les CTA, l'effet de brillance après dédoublonnage, et la révélation au
scroll. Rapporte des **ratios de contraste mesurés** (chiffres), pas « ça a l'air bon ».

## Livrable attendu (format strict, MAX 500 tokens, style caveman — pas de prose)

```
RETOUR :
- commits: [SHA, ...]
- resume: <objectif atteint + fichiers clés + pitfalls rencontrés + résultat des tests>
- mapping couleurs: <hex d'origine → token DS retenu>, une ligne par couleur, avec le ratio mesuré
- dedoublonnage: <brillance retenue (::before ou ::after) + POURQUOI ; où vit désormais chaque règle>
- controle navigateur: <ce que tu as réellement ouvert et observé, clair + sombre>
- [MEMORY:*] signaux: <pitfall / pattern / décision — si applicables>
- recommandations suite: <RECOMMAND_* ou piège subtil ; ou "aucune" explicitement>
- RECOMMAND_FOLLOWUP: <découvertes NON-XS hors périmètre, avec triage estimé ; ou "aucun">
- ABSORBED: <découvertes XS corrigées au passage ; ou "aucune">
- STATUS: COMPLETED   ← en TOUTE DERNIÈRE LIGNE (ou STATUS: PARTIAL + BLOQUE_SUR: <raison>)
```

La dernière ligne doit être exactement `STATUS: COMPLETED` ou `STATUS: PARTIAL` — le lead la lit
programmatiquement pour détecter les crashs de subagent.

**Sois factuel sur ce qui manque.** Si un critère d'acceptation n'est pas rempli, dis-le et dis pourquoi.
Un `PARTIAL` honnête vaut mieux qu'un `COMPLETED` qui masque un critère non tenu.
