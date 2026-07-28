[BRIEFING ISSUE #337 — Sprint 49, vague 3]

## ⚠ AVANT TOUT — ancrage d'exécution

```bash
cd /Users/herrh/VSProjects/MyTimeline/.claude/worktrees/sprint-47-start-5e5a53
git branch --show-current   # DOIT afficher : sprint/49
```

Worktree git, PAS /Users/herrh/VSProjects/MyTimeline. `cd` explicite au début de CHAQUE commande bash.
Si la branche n'est pas `sprint/49` → STOP, `STATUS: PARTIAL` + `BLOQUE_SUR: mauvaise branche`.

**Piège outillage :** `git diff` renvoie ~vide sous le proxy RTK. Utilise `rtk proxy git diff` ou redirige
vers un fichier. Ne conclus jamais « aucun changement » depuis un `git diff` vide.

## Issue #337 — [FEATURE] Contrôle de contraste automatisé sur les CTA (E2E)
`enhancement` · `epic:design` · `priority:P1` · `size:M` · `frontend` · `sprint-49`

### Pourquoi cette issue existe

Le Sprint 48 a livré **2 régressions visibles par l'utilisateur** que le harnais de tests n'a pas pu
attraper : 2 CTA primaires en **bleu sur bleu (contraste 1.00:1, illisibles)** et un bouton dont le texte
était **tronqué en plein mot**. Raisons techniques :
- les tests unitaires (`jsdom`) ne résolvent **ni la précédence des `@layer` CSS ni aucune mise en page** ;
- `next build` ne contrôle **aucun style à l'exécution** ;
- un relecteur humain ne peut pas deviner l'interaction de cascade entre deux fichiers CSS en lisant un diff.

Un test Playwright mesurant `getComputedStyle` (contraste réellement affiché) et `scrollWidth` vs
`clientWidth` (troncature) sur les boutons d'action est le **seul filet** capable d'attraper cette famille.

### Critères d'acceptation
1. Un test Playwright vérifie le **contraste calculé** (`getComputedStyle`) des CTA principaux de la landing
2. Un test Playwright détecte la **troncature de texte** (`scrollWidth` vs `clientWidth`) sur ces mêmes boutons
3. Le test **échoue** si un CTA repasse sous le seuil de contraste WCAG AA
4. Le test est **intégré à la suite E2E existante et documenté**

### Risques annoncés par l'issue
- Rester robuste au thème **clair ET sombre** (deux jeux de couleurs à couvrir).
- Éviter la flakiness liée au rendu des polices au chargement.

## Ce que la vague 1 et la vague 2 ont livré — ton terrain de mesure

| Issue | Commit | Ce que ça change pour toi |
|---|---|---|
| **#335** | `1a9ca6b` | `landing.css` + `animations.css` **entièrement sur tokens DS**, zéro littéral. `.cta-button` n'existe plus que dans `animations.css`, avec un seul `::after`. |
| **#336** | `cc2dc8f` | Bordures de contrôle sur `--color-rule-emphasis`, y compris via `globals.css:105` `--color-input`. |
| **#334** | `26a4225` | Burger + panneau `LandingMobileMenu.tsx`. **Nouveaux `data-testid`** : `landing-header-menu-toggle`, `landing-header-menu`, `landing-header-menu-close`, `landing-header-menu-overlay`. |

### 🎯 Valeurs de référence déjà MESURÉES par les autres agents — utilise-les comme oracle

- **CTA du héros : 4,71:1 au repos en clair.** Au-dessus d'AA, mais **sans marge**. L'agent #335 avertit :
  tout assombrissement du fond ou éclaircissement du texte le fera rougir. **C'est exactement ce que ton
  test doit attraper.**
- `.cta-button` au survol, après correction #335 : **5,26 / 6,70** en clair, **7,49 / 9,27** en sombre.
- Avant #335, le voile blanc du survol faisait tomber le CTA à **4,01:1** en clair — sous le seuil 4,5
  applicable à du 18 px non gras. **Ton test doit rougir sur ce cas** ; c'est un bon témoin de validation.
- Seuils WCAG AA : **4,5:1** pour du texte normal, **3:1** pour du texte large (≥ 18,66 px gras ou ≥ 24 px).
  Le CTA du héros est en **18 px non gras** → seuil **4,5**, pas 3. Ne te trompe pas de seuil.

## ⚠ Deux artefacts d'outillage rencontrés par d'autres agents — tu vas probablement les croiser

1. **`document.hidden === true` dans un panneau navigateur d'agent.** Dans cet état,
   `IntersectionObserver` **ne fire jamais** — le lead l'a prouvé avec un témoin de contrôle (une `<div>`
   200×200 avec options par défaut : **0 callback**). Conséquence directe : **les 7 sections de la landing
   restent à `opacity: 0`** et paraissent invisibles. **Ce n'est pas un bug applicatif établi.**
2. **`innerHeight` ≠ `clientHeight`** dans ces mêmes panneaux (946 vs 812) → un `fixed inset-y-0` paraît
   dépasser l'écran.

**Playwright n'a pas ce problème** : il pilote un vrai contexte de rendu, onglet visible. C'est
précisément pour ça que ton test a de la valeur là où les autres harnais échouent.

## 🚩 EXIGENCE SPÉCIFIQUE DU LEAD — assertion de visibilité obligatoire

L'agent #335 a signalé en P1 que la landing serait **invisible au chargement** (`useSectionAnimation`
ajoute `.visible` en impératif puis `unobserve`). **Le lead a enquêté : NON ÉTABLI** — le mécanisme
avancé (un re-render React effacerait `className`) est contredit par le code, les 7 sections portant un
`className` **littéral statique**, et la mesure était confondue par l'artefact n°1 ci-dessus.

**La question reste ouverte, et ton test est le moyen de la trancher.**

⇒ **Avant toute mesure de contraste, ton spec DOIT asserter que la section contenant le CTA est
réellement visible** (`opacity` calculée > 0 et boîte non nulle). Deux raisons :
- mesurer un contraste sur un élément à `opacity: 0` produit un résultat qui ne veut rien dire ;
- si l'assertion **rougit sous Playwright** (onglet visible, viewport réel), alors le bug « landing
  invisible » est **confirmé** et cesse d'être une hypothèse.

**Rapporte explicitement ce que cette assertion donne.** C'est un livrable attendu de ta mission, au même
titre que le test de contraste. **Ne « corrige » pas `useSectionAnimation.ts`** — hors périmètre.

## Plan d'implémentation

```yaml
issue_337:
  fichiers_cles:
    - "frontend/e2e/"                                    # 15 specs existants — ÉTENDRE, ne pas remplacer
    - "frontend/e2e/support/"                            # helpers partagés — y placer le calcul de contraste
    - "frontend/src/components/landing/"                 # cible des mesures (lecture)
    - "docs/memory/sprints/sprint-47/e2e-local-runbook.md" # RECETTE DE LANCEMENT LOCAL — lis-la en premier
  couches_touchees: ["frontend"]
  strategie_test: "E2E Playwright (getComputedStyle + scrollWidth/clientWidth), clair ET sombre"
  ordre_ecriture: "runbook → helper de contraste (relative luminance WCAG) → assertion de visibilité → spec CTA clair → spec CTA sombre → troncature → doc"
  zod_dto_sync: "NON"
  possibly_done: false
```

**Le helper de contraste doit implémenter la luminance relative WCAG 2.x correctement** (linéarisation
sRGB, pas une moyenne naïve de canaux) et **résoudre le fond composité** — un `rgba()` sur un parent doit
être aplati contre la couleur effective derrière, sinon tu mesureras un contraste faux.

## 🔧 Lancement de la suite E2E en local — recette VÉRIFIÉE, lis-la avant de conclure « stack down »

Deux agents de ce sprint ont conclu « E2E non exécutables, backend down ». **Le lead a vérifié : Docker
répond (29.2.1) et les images `mytimeline-backend`, `mytimeline-frontend`, `postgres:16` sont DÉJÀ en
cache.** Le blocage venait d'un *build* qui repartait chercher des métadonnées sur Docker Hub.

**Runbook complet : `docs/memory/sprints/sprint-47/e2e-local-runbook.md`** (suite complète verte,
49/49 en 38 s). Quatre réglages non devinables, dont **deux produisent une erreur qui accuse la mauvaise
cause** :

1. **CORS** — le profil `dev` fige `app.cors.allowed-origins=http://localhost:3000` **sans placeholder
   d'env**. Si le front tourne sur un autre port, `POST /api/auth/register` renvoie
   `403 Invalid CORS request` et `auth.setup.ts` throw *« rate-limit register 5/min/IP probable »* —
   **diagnostic trompeur, le rate-limit n'y est pour rien**. Override :
   `--app.cors.allowed-origins=http://localhost:3000,http://localhost:3100`.
2. **`--workers=1` obligatoire en local.** Sinon 4 specs `settings-*` rougissent sur un `toHaveValue`
   d'username (deux `pid` génèrent chacun leur identité). **Rien à voir avec le code testé.**
3. **Base `eventmanager_e2e`, PAS `eventmanager`.** La base de dev est figée à V6 avec des lignes que
   `V7__design_v3_schema.sql` rejette → reprise à froid impossible.
4. **Port `:3000` squatté** par le `next-server` d'un autre projet : avec `reuseExistingServer: true`,
   Playwright teste **la mauvaise app sans rien signaler**. Utiliser
   `PLAYWRIGHT_BASE_URL=http://localhost:3100`.

`SKIP_DELEGATION=1` est requis devant `npx playwright test` (hook `warn-test-delegation.sh`).

**Prends une baseline verte AVANT d'écrire ta spec** — toute spec rouge après ça est imputable au sprint.

### ⚠ Risque E2E connu, signalé par #69 et NON testé

`frontend/e2e/timeline.spec.ts` (#304) cible `timeline-resource-row` **par nom de produit**. Au-delà de
**60 produits**, la virtualisation verticale livrée par #69 s'active et la lane visée peut ne pas être
montée → `toHaveCount(1)` rougirait. Seuil : `LANE_VIRTUALIZATION_MIN_ROWS = 60` dans
`frontend/src/components/timeline/virtualization.ts`.

**Si tu vois cette spec rouge : ce n'est pas ta régression.** Rapporte-le précisément (compte de produits
observé, lane manquante) — c'est une information que le lead attend pour la Phase 6.

## Contrat du Design System — ton pack de domaine

> Aucun pack `br-design.md` n'existe dans `.ai-env/context-packs/`. Le fichier ci-dessous,
> `frontend/src/styles/ds/readme.md`, **est** le contrat de référence (tiers de couleur, seuils, modes).

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

**Tu es en dernière vague.** Les 4 autres issues sont livrées :
`#69` `09bfd27` (PARTIAL) · `#335` `1a9ca6b` (COMPLETED) · `#336` `cc2dc8f` (PARTIAL) ·
`#334` `26a4225` (PARTIAL).

**Un correctif typographique est en cours en parallèle de toi** : les 5 `h2` de la landing
(`CtaSection`, `FeaturesSection`, `HowItWorksSection`, `MobileAppSection`, `TestimonialSection`) sont en
`text-3xl` = **57 px** dans l'échelle DS (qui **écrase** celle de Tailwind), ce qui cause 29 px (fr) /
62 px (de) de débordement horizontal résiduel. Un agent traite ce point.

⇒ **Ne touche à aucun `h2` ni à aucun composant de `frontend/src/components/landing/`.** Tu ne fais que
**mesurer**. Si ton test constate un débordement de page, c'est attendu et déjà pris en charge — ne le
corrige pas, et ne fonde pas ton spec de troncature sur l'état transitoire de ces titres.

### Règles de commit en arbre partagé (impératif)
- **`git add` CIBLÉ sur `frontend/e2e/`. JAMAIS `git add -A`, JAMAIS `git add .`** — un autre agent écrit
  dans le même arbre.
- 1 seul commit logique, gitmoji, message en **français**.
- Aucun `git rebase`, `git reset`, `git stash`, ni `git checkout` d'un autre fichier.
- Rapporte le SHA **de ton commit** : `git log -1 --format=%H -- frontend/e2e/`.

### Fichiers INTERDITS pour toi
- `frontend/src/components/landing/**` — tu mesures, tu ne modifies pas (correctif `h2` en cours)
- `frontend/src/hooks/useSectionAnimation.ts` — cause non établie, hors périmètre
- `frontend/src/styles/**` — verrouillé par 2 tests AST (`landing-palette.test.ts`,
  `control-border-tier.test.ts`) ; y toucher les fera rougir
- `frontend/src/components/timeline/**` et `frontend/package.json` — livrés par #69

**Ton périmètre : `frontend/e2e/` uniquement**, plus la documentation de ta méthode.

Si ton test a besoin d'un `data-testid` absent sur un CTA, **ne l'ajoute pas toi-même** dans le composant :
signale-le en `RECOMMAND_FOLLOWUP` et ancre-toi sur un sélecteur accessible (rôle + nom) en attendant.

## Contraintes

- Branche cible : `sprint/49` (déjà checkout)
- **Code en anglais, documentation et commits en français**
- **TypeScript strict** — pas de `any`, pas de `@ts-ignore` non justifié
- **i18n** : les libellés de CTA viennent de `next-intl` (4 locales). Ancre-toi sur des `data-testid` ou
  des rôles, **jamais sur du texte français en dur** — la suite tourne aussi en `en`/`es`/`de`.
- Tests inline OBLIGATOIRES : `./scripts/test-quiet.sh e2e` (et `frontend` si tu touches un helper unitaire).
  Scopes : `unit`/`backend` (défaut), `frontend`, `e2e`, `all`. **Ne lance pas la suite backend.**
- Aucune migration Flyway, zéro fichier backend.

### Anti-flakiness — exigences dures

- **Attendre `document.fonts.ready`** avant toute mesure : la métrique de troncature dépend du rendu de
  police, et une mesure prise avant le swap de font produit un faux positif intermittent.
- Couvrir **clair ET sombre** : un CTA peut passer en clair et échouer en sombre (`PIT-S48-001` — au S48,
  un contraste validé sur un seul fond a laissé passer une régression).
- **Valide ton test par mutation** : force temporairement un CTA sous le seuil et **vérifie que le test
  rougit**. Un test de contraste qui ne rougit jamais ne vaut rien — c'est exactement le défaut du
  harnais actuel que cette issue corrige. **Rapporte le résultat de ce test de mutation** ; sans lui, le
  critère 3 n'est pas démontré.

## Livrable attendu (format strict, MAX 500 tokens, style caveman — pas de prose)

```
RETOUR :
- commits: [SHA, ...]
- resume: <objectif atteint + fichiers créés + pitfalls + résultat des tests>
- criteres: 1..4 → OK / NON + raison courte pour chaque non rempli
- test de mutation: <ce que tu as cassé volontairement, le test a-t-il rougi ? OBLIGATOIRE>
- assertion de visibilite: <les sections landing sont-elles visibles sous Playwright ? opacity mesurée.
                            REND UN VERDICT sur le "landing invisible" : confirmé / infirmé / indécidable>
- ratios mesures: <par CTA, clair ET sombre, avec le seuil applicable (4,5 ou 3)>
- baseline E2E: <la suite était-elle verte AVANT ta spec ? combien passed/failed ?>
- suite E2E apres: <passed/failed ; si timeline.spec.ts rouge → compte de produits observé>
- [MEMORY:*] signaux: <pitfall / pattern / décision — si applicables>
- recommandations suite: <RECOMMAND_* ou piège subtil ; ou "aucune" explicitement>
- RECOMMAND_FOLLOWUP: <découvertes NON-XS hors périmètre + triage estimé ; ou "aucun">
- ABSORBED: <découvertes XS corrigées au passage ; ou "aucune">
- STATUS: COMPLETED   ← TOUTE DERNIÈRE LIGNE (ou STATUS: PARTIAL + BLOQUE_SUR: <raison>)
```

Dernière ligne exactement `STATUS: COMPLETED` ou `STATUS: PARTIAL` — le lead la lit programmatiquement.

**Sois factuel sur ce qui manque.** Un `PARTIAL` honnête vaut mieux qu'un `COMPLETED` qui masque un
critère non tenu. **Si tu ne parviens pas à monter la stack E2E malgré le runbook, dis-le avec les
commandes exactes et les erreurs exactes** — deux agents ont déjà buté dessus, et savoir précisément où
ça coince vaut plus qu'un test écrit mais jamais exécuté. Ne qualifie pas ton travail d'« excellent » ou
« parfait » — décris ce qu'il fait et ce que tu as mesuré.
