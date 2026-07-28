[BRIEFING ISSUE #336 — Sprint 49, vague 1]

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

**#336 — [FEATURE] Dette WCAG AA sur les bordures de contrôle hors landing**
Labels : `enhancement`, `epic:design`, `priority:P1`, `size:M`, `frontend`, `sprint-49`

### Contexte

Le Sprint 48 a créé le bon token de couleur pour les bordures visibles (`--color-rule-emphasis`, issue
#293) car l'ancien token utilisé partout dans l'application ne respecte pas les normes d'accessibilité
(contraste insuffisant pour les personnes malvoyantes). Mais ce nouveau token n'a été appliqué qu'à la
section hero de la landing — le reste de l'application utilise encore l'ancien token non conforme.

### À faire (énoncé d'origine — **partiellement faux, voir la correction plus bas**)

`--color-rule-strong` (contraste mesuré **1.46:1**) sert de bordure fonctionnelle sur environ 30
occurrences dans l'application, toutes sous le seuil WCAG 1.4.11 (≥3:1). Le token conforme
`--color-rule-emphasis` (`#7A7E87`, contraste 3.97–4.81:1 selon le fond) existe déjà depuis le Sprint 48
mais n'est appliqué qu'au hero de la landing. Il faut migrer les occurrences restantes. Impact :
changement visuel large (bordures plus visibles partout) + des tests assertant `border-rule-strong` à
mettre à jour en conséquence.

### Critères d'acceptation

- [ ] Les occurrences de bordure **fonctionnelle** utilisent `--color-rule-emphasis` au lieu de `--color-rule-strong`
- [ ] Contraste des bordures fonctionnelles ≥ 3:1 (WCAG 1.4.11) sur tous les écrans concernés
- [ ] Les tests assertant `border-rule-strong` sont mis à jour
- [ ] Validation visuelle clair/sombre sur au moins les formulaires d'auth et un formulaire d'événement

## 🚨 CORRECTION DU CORPS DE L'ISSUE — mesuré au grep, pas supposé

Le corps de l'issue annonce que les formulaires `login` / `register` / `reset-password` /
`forgot-password` portent `border-rule-strong`. **C'est faux : ils en ont ZÉRO en TSX.**
Leurs bordures viennent de `frontend/src/styles/ds/components/core.css`, que l'issue **ne cite pas**.

Inventaire réel, mesuré par le lead sur `92c14c4` le 2026-07-28 :

**A. `border-rule-strong` en classes TSX — 19 occurrences**

| Fichier | Occurrences |
|---|---|
| `frontend/src/components/EventEditForm.tsx` | 13 |
| `frontend/src/components/shared/ConflictDialog.tsx` | 2 |
| `frontend/src/components/events/NewEventDrawer.tsx` | 2 |
| `frontend/src/components/shared/StateScreen.tsx` | 1 |
| `frontend/src/components/settings/mobile/BottomSheet.tsx` | 1 |

**B. `var(--color-rule-strong)` dans le CSS partagé du DS — 14 déclarations**

`frontend/src/styles/ds/components/core.css`, lignes **18, 34, 49, 71, 84, 100, 109, 123, 135, 154, 163,
183, 211, 220** — inputs, checkbox, radio, chips, tabs, cartes… **C'est par là que les formulaires d'auth
sont concernés.**

**Total = 33.** Le « ~30 » de l'issue tient ; le **chemin** annoncé, non.

### Ce que cette correction change pour toi

`core.css` est un fichier **partagé par toute l'application**. Y remplacer aveuglément les 14 déclarations
change les bordures de **tous les écrans d'un coup**, y compris là où la bordure est un **séparateur
décoratif** et non l'affordance d'un contrôle.

⇒ **Arbitre chaque déclaration, une par une :**
- La bordure **EST** la limite d'un contrôle (input non rempli, bouton outline, contour de
  checkbox/radio, chip focusable) → **`--color-rule-emphasis`**, seuil WCAG 1.4.11 applicable.
- La bordure est **décorative** (séparateur, filet de carte, trait de section) → **reste sur
  `--color-rule-strong`**, le seuil 3:1 ne s'y applique pas.

Le readme DS inliné plus bas tranche cette distinction (section sur les tiers de bordure). Lis-la
**avant** de toucher `core.css`, et **justifie ton arbitrage déclaration par déclaration** dans ton retour.

### Autre écart : le nombre de tests

L'issue annonce « 4 tests » à mettre à jour. Le grep n'en trouve qu'**un seul** :
`frontend/src/components/shared/StateScreen.test.tsx`. Cherche les autres avant de conclure (ils peuvent
asserter autrement, ou porter sur le CSS calculé) — mais **n'invente pas 3 tests pour faire coller le
chiffre de l'issue**. Si tu n'en trouves qu'un, dis-le.

### Le token cible existe déjà — ne le recrée pas

`--color-rule-emphasis` est défini dans `frontend/src/styles/ds/tokens/colors.css` **ligne 58** (clair) et
**ligne 106** (sombre), valant `var(--gray-450)` = `#7A7E87`. Il est **volontairement non inversé en
sombre**. Ratios déjà mesurés au S48 : **3.97:1** vs `bg` et **4.07:1** vs `surface` en clair,
**4.81:1** / **4.49:1** en sombre. `colors.css` est en **LECTURE SEULE** pour toi.

## Plan d'implémentation (mini-plan — ancrage vérifié sur `92c14c4` le 2026-07-28)

```yaml
issue_336:
  fichiers_cles:
    - "frontend/src/styles/ds/components/core.css"              # 14 déclarations — CIBLE PRINCIPALE, non citée par l'issue
    - "frontend/src/components/EventEditForm.tsx"               # 13 occurrences
    - "frontend/src/components/shared/ConflictDialog.tsx"       # 2
    - "frontend/src/components/events/NewEventDrawer.tsx"       # 2
    - "frontend/src/components/shared/StateScreen.tsx"          # 1
    - "frontend/src/components/settings/mobile/BottomSheet.tsx" # 1
    - "frontend/src/components/shared/StateScreen.test.tsx"     # 1 — LE test à mettre à jour
    - "frontend/src/styles/ds/a11y-audit.md"                    # §6 à mettre à jour après migration
  couches_touchees: ["frontend"]
  strategie_test: "unit (mise à jour des assertions) + contrôle navigateur clair/sombre sur auth + formulaire d'événement"
  ordre_ecriture: "trier core.css fonctionnel/décoratif (readme DS) → core.css → occurrences TSX → tests → §6 a11y-audit → contrôle navigateur"
  zod_dto_sync: "NON"
  possibly_done: false
  etat_reel_du_code: "(travail réel — le token cible existe depuis #293 mais n'est appliqué qu'au hero. 33 sites restants mesurés.)"
```

**Mise à jour documentaire attendue :** `frontend/src/styles/ds/a11y-audit.md` **§6** liste aujourd'hui
ces occurrences comme « ⚠️ Reste à traiter ». Après ta migration, cette section doit refléter l'état réel
— sinon le prochain sprint repart sur un inventaire périmé.

## Pièges du Sprint 48 qui s'appliquent DIRECTEMENT à cette issue

- **`PIT-S48-002` — attention aux remplacements en masse.** Une regex `\bborder-rule\b` matche aussi
  `border-rule-emphasis` : un `sed` naïf produira `border-rule-emphasis-emphasis`. Et Tailwind **scanne
  les commentaires** : un nom de classe laissé en commentaire est régénéré.
- **`PIT-S48-001` — un contraste se valide sur 4 fonds, pas 1** (`bg` et `surface`, en clair et en
  sombre). C'est ce qui a fait échouer le premier candidat de token au S48.
- **`PAT-S48-001` — pattern utile pour toi :** cascade et layout se testent **sans navigateur** via un
  parcours AST PostCSS. C'est le moyen d'écrire un test qui garantit qu'aucune bordure **fonctionnelle**
  ne retombe sur `rule-strong`. Cherche ce pattern dans `docs/memory/patterns.md` avant de réinventer.

## Contrat du Design System — c'est ton pack de domaine

> Aucun pack `br-design.md` n'existe dans `.ai-env/context-packs/` (lacune connue, follow-up ouvert).
> Le fichier ci-dessous, `frontend/src/styles/ds/readme.md`, **est** le contrat de référence. Sa section
> sur les **tiers de bordure** est ce qui tranche ton arbitrage fonctionnel/décoratif. Lis-la d'abord.

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
- **#335** — couleurs et doublons de `landing.css` : `frontend/src/styles/landing.css` + `frontend/src/styles/animations.css`

Ces périmètres sont **disjoints du tien** — vérifié au grep. Mais l'arbre de travail git est **partagé**.

⚠ **Ta zone et celle de #335 sont toutes deux sous `frontend/src/styles/`.** Ce sont des fichiers
différents, mais reste strictement dans les tiens : `ds/components/core.css`. Ne touche ni `landing.css`
ni `animations.css`, même si tu y vois une occurrence de `rule-strong`. S'il y en a une, **signale-la**
au lieu de la corriger — le lead arbitrera.

### Règles de commit en arbre partagé (impératif)

- **`git add` CIBLÉ sur tes fichiers uniquement. JAMAIS `git add -A`, JAMAIS `git add .`** — tu
  emporterais le travail en cours des deux autres subagents dans ton commit.
- Un seul commit logique, message gitmoji en français.
- Aucun `git rebase`, `git reset`, `git stash`, ni `git checkout` d'un autre fichier.
- Le SHA lu via `git rev-parse HEAD` après ton commit peut déjà avoir bougé (course entre subagents).
  Rapporte le SHA **de ton commit**
  (`git log -1 --format=%H -- frontend/src/styles/ds/components/core.css`), et signale un doute plutôt
  que d'affirmer.

### Fichiers formellement INTERDITS pour toi

- `frontend/src/styles/landing.css` et `frontend/src/styles/animations.css` (→ #335)
- `frontend/src/styles/ds/tokens/colors.css` — **lecture seule**. Le token `--color-rule-emphasis`
  existe déjà (l. 58 et 106) : tu l'**appliques**, tu ne le modifies pas et tu n'en crées pas d'autre.
- `frontend/src/components/timeline/**` et `frontend/package.json` (→ #69)
- `frontend/src/components/landing/**` (→ #334, vague 2)

Note : `frontend/src/styles/ds/components/timeline.css` contient 16 occurrences de `rule-strong`. Elles
sont **hors de ton périmètre** (l'issue dit « hors landing », et la frise est en pleine refonte par #69
en parallèle). Ne les touche pas — signale-les en `RECOMMAND_FOLLOWUP` si tu juges qu'elles relèvent de la
même dette.

## Designer

Pas de revue `ui-design` préalable : le token cible est déjà arbitré et livré (#293, Sprint 48). Ton
travail est une **migration**, pas une décision de charte.

**Mais l'issue elle-même prévient : « impact visuel large, à valider auprès du design avant merge ».**
Toutes les bordures de champs de l'application vont devenir plus contrastées. Si ton arbitrage
fonctionnel/décoratif sur `core.css` te laisse dans le doute sur plus de 2-3 déclarations, ne tranche pas
seul : signale `RECOMMAND_UI_DESIGN` avec la liste des cas litigieux. Le lead spawnera un `ui-design`
avant la PR.

## Contraintes

- **Branche cible : `sprint/49`** (déjà checkout — vérifie via le garde-fou en HEAD)
- **Commit :** 1 commit logique, gitmoji, message en **français**
- **Code en anglais, documentation et commits en français** (convention projet)
- **Tailwind CSS v4** — attention à la précédence des `@layer`
- **Tests obligatoires, inline :**
  ```bash
  ./scripts/test-quiet.sh frontend   # Vitest unitaires
  ```
  Scopes valides : `unit`/`backend` (défaut), `frontend`, `e2e`, `all`.
  Ce sprint est **100 % frontend** — ne lance pas la suite backend (Docker requis, aucun apport ici).
- **Pas de migration Flyway**, zéro fichier backend, `zod_dto_sync: NON`.

### ⚠ Le piège central de cette issue (mémoire projet, S48)

**« CI verte » ne prouve pas que la page est correcte.** Au Sprint 48, 2 CTA sont sortis invisibles
(contraste mesuré **1.00:1**) et 1 bouton avait son texte tronqué — avec une CI **entièrement verte**.
Raison : `jsdom` ne résout **ni la précédence des `@layer` CSS ni aucune mise en page réelle**.

Ton issue est **exactement** de cette famille : tu changes une couleur de bordure dans un CSS partagé,
et seul un rendu réel dira si le résultat est conforme et non régressif.

⇒ **Ouvre un vrai navigateur avant de déclarer terminé**, en **clair ET en sombre**, sur au minimum :
un formulaire d'auth (`login` ou `register`), un formulaire d'événement (`EventEditForm`), et un écran
avec checkbox/radio. **Mesure** les ratios obtenus (`getComputedStyle` + calcul WCAG), ne les suppose pas.

## Livrable attendu (format strict, MAX 500 tokens, style caveman — pas de prose)

```
RETOUR :
- commits: [SHA, ...]
- resume: <objectif atteint + fichiers clés + pitfalls rencontrés + résultat des tests>
- arbitrage core.css: <14 déclarations → fonctionnelle (migrée) | décorative (laissée)>, avec la raison
- inventaire final: <X/19 TSX migrées, Y/14 CSS migrées, Z laissées volontairement + pourquoi>
- tests mis a jour: <combien trouvés RÉELLEMENT vs les "4" annoncés par l'issue>
- controle navigateur: <écrans ouverts, ratios MESURÉS, clair + sombre>
- a11y-audit §6: <mis à jour OUI/NON>
- [MEMORY:*] signaux: <pitfall / pattern / décision — si applicables>
- recommandations suite: <RECOMMAND_* ou piège subtil ; ou "aucune" explicitement>
- RECOMMAND_FOLLOWUP: <découvertes NON-XS hors périmètre, avec triage estimé ; ou "aucun">
- ABSORBED: <découvertes XS corrigées au passage ; ou "aucune">
- STATUS: COMPLETED   ← en TOUTE DERNIÈRE LIGNE (ou STATUS: PARTIAL + BLOQUE_SUR: <raison>)
```

La dernière ligne doit être exactement `STATUS: COMPLETED` ou `STATUS: PARTIAL` — le lead la lit
programmatiquement pour détecter les crashs de subagent.

**Sois factuel sur ce qui manque.** Si un critère d'acceptation n'est pas rempli, dis-le et dis pourquoi.
Un `PARTIAL` honnête vaut mieux qu'un `COMPLETED` qui masque un critère non tenu. En particulier : si tu
laisses volontairement des déclarations sur `rule-strong` parce qu'elles sont décoratives, **c'est une
bonne décision** — dis-le explicitement plutôt que de laisser croire à une migration incomplète.
