# Audit CSS `@layer` — issue #340 (Sprint 53, Vague 2)

> Livrable principal de #340. Recense **toutes** les règles CSS hors `@layer` du frontend et
> tranche, **avec preuve**, si chacune écrase une utilitaire Tailwind **réellement écrite** dans
> le dépôt. Verrou de l'AC appliqué strictement : **pas de conflit démontré ⇒ pas de modification.**

Mesuré le 2026-07-29 sur `sprint/53` (base `40665fc`, #339).
Méthode : parse PostCSS des feuilles sources + compilation réelle de la chaîne
`globals.css` + `@tailwindcss/postcss` + croisement automatique des classes hors layer avec
**tous** les `className` du dépôt (extraction à accolades équilibrées, littéraux inclus dans
`cn(...)`), puis résolution manuelle des passages de `className` par props de composant.

---

## 0. Deux prémisses infirmées

### 0.1 « Le défaut ne concerne que les sélecteurs d'élément » (énoncé de l'issue) — FAUX

Le CSS hors layer bat le CSS layerisé **quel que soit le type de sélecteur**. Une **classe** hors
layer bat elle aussi toutes les utilitaires de `@layer utilities`. C'est d'ailleurs ce qui produit
**les 4 conflits réels** de cet audit : **aucun** ne vient d'un sélecteur d'élément.

### 0.2 « 0 sélecteur d'élément dans les 7 fichiers » (comptage du lead) — PRESQUE juste

Confirmé pour les sélecteurs d'élément **en tête de sélecteur** : il n'y en a aucun dans
`animations.css`, `landing.css`, `hero-timeline.css`, `ds/styles.css`, ni dans `ds/components/*.css`.
Deux nuances mesurées :

| écart | où |
|---|---|
| sélecteurs **qualifiés** par un élément | `ds/components/i18n.css:153` — `time.mt-date--short, time.mt-date--long, time.mt-num` |
| sélecteurs d'élément en **position descendante** (~16 règles) | `core.css` : `.mt-btn svg`, `.mt-iconbtn svg`, `.mt-avatar img`, `.mt-table th`, `.mt-table td`, `.mt-table tbody tr:nth-child(even)`, `.mt-check input`, `.mt-switch input`, `.mt-radio input`, `.mt-check__box svg`, `.mt-tag__x svg`, `.mt-select__chev svg`, `.mt-input-affix__icon svg`, `.mt-toast__icon svg` ; `timeline.css:84` : `.mt-recur svg` |

Aucun de ces sélecteurs n'est en conflit (§3), mais le comptage « 0 » ne tient que pour la lecture
« élément en colonne 0 ».

Autre écart mineur : la colonne `@layer = 1` du tableau du lead pour `landing.css` comptait le mot
« layer » présent dans un **commentaire**. Avant cet audit, `landing.css` contenait **0** `@layer`.

---

## 1. Inventaire des règles hors layer (avant correction)

| fichier | règles hors layer | chargé par |
|---|---:|---|
| `src/styles/ds/components/timeline.css` | 167 | `globals.css` (`@import`) |
| `src/styles/ds/components/core.css` | 129 | `globals.css` (`@import`) |
| `src/styles/ds/components/i18n.css` | 43 | `globals.css` (`@import`) |
| `src/styles/landing.css` | 13 | `app/layout.tsx` (feuille séparée, **après** `globals.css`) |
| `src/styles/animations.css` | 12 | `app/layout.tsx` (idem) |
| `src/styles/ds/tokens/base.css` | 11 | `globals.css` (`@import`) |
| `src/styles/hero-timeline.css` | 5 | `app/layout.tsx` (idem) |
| `src/styles/globals.css` | 2 (`html[data-density]`) | `app/layout.tsx` |
| `src/styles/ds/styles.css` | 0 (que des `@import`) | **personne** — point d'entrée DS autonome, non importé par l'app |
| **total** | **382** | |

`ds/tokens/{colors,typography,spacing,fonts}.css` : blocs `:root` uniquement — **hors périmètre et
activement dangereux à layeriser** (ils squattent le namespace de thème de Tailwind 4 ; sous
`@layer`, toute l'échelle typo/chromatique basculerait sur les défauts Tailwind). Non touchés.

---

## 2. Conflits RÉELS démontrés — 4 sur 382

Critère : une utilitaire Tailwind est **écrite dans le dépôt** sur un élément que la règle hors layer
atteint, **sur la même propriété**, **avec une valeur différente**.

| # | fichier:ligne | sélecteur | propriété | conflit réel constaté | action |
|---|---|---|---|---|---|
| 1 | `ds/components/core.css:176` | `.mt-avatar` | `border-radius` | **OUI** — `AppShell.tsx:217` rend `<Avatar className="rounded-sm">` (commentaire sur place : « Avatar carré — override local »). DS = `--radius-md` **7px**, utilitaire = `--radius-sm` **5px**. L'override était un **NO-OP**. | **corrigé** → `@layer components` |
| 2 | `landing.css:141` | `.timeline-preview` | `border-radius` | **OUI** — `TimelinePreviewSection.tsx:19` pose `rounded-xl`. DS = `--radius-lg` **10px**, utilitaire = `--radius-xl` **14px**. | **corrigé** → `@layer components` |
| 3 | `ds/tokens/base.css:89` | `*` | `scrollbar-width` | **OUI** — l'utilitaire `scrollbar-none` (`globals.css:204`, `@utility` → `@layer utilities`) pose `scrollbar-width:none`, annulé par `thin`. Sites : `ProductCarousel.tsx:50`, `DensityRibbon.tsx:77`. **Firefox : barre visible.** Chromium masquait quand même, via l'autre moitié de l'utilitaire (`::-webkit-scrollbar{display:none}` — propriété *différente* de `width`/`height`, donc jamais en conflit) : c'est ce qui rendait le défaut invisible en dev. | **corrigé** → `@layer base` |
| 4 | `ds/tokens/base.css:82` | `:focus-visible` | `outline-style`, `border-radius` | **OUI, double.** (a) `outline: 2px solid` (→ `outline-style:solid`) annule `focus-visible:outline-none` / `outline-hidden` sur ~14 sites (`dashboard/page.tsx:153`, `AvatarUpload:183`, `SettingsShell:73`, `BottomSheet:132`, `SettingsIndex:43`, `MobileSettings:52`, `LandingMobileMenu:65`, `HeaderSection:190`, `CategoriesView:124`, `ProductsListView:258`, `button.tsx:37`, `input.tsx:11`, `select.tsx:36`, `checkbox.tsx:16`, `dialog.tsx:47`) → contour DS **+** anneau, deux indicateurs concentriques. (b) `border-radius: var(--radius-xs)` (3px) écrase `rounded-sm`/`md`/`full` sur **tout élément focalisé** → le coin change à la prise de focus clavier. | **NON corrigé** — voir §4 |

---

## 3. Non-conflits — pourquoi 378 règles ne bougent pas

### 3.1 Les ~770 lignes de `.mt-*` (`core.css`, `timeline.css`, `i18n.css`)

C'est le gisement de risque théorique : classes de composant hors layer, donc gagnantes sur toute
utilitaire. **Résultat mesuré : aucun conflit réel, sauf `.mt-avatar` (§2.1).**

Raison : dans ce dépôt, les classes `.mt-*` sont posées **seules**. Balayage exhaustif des
`className` (accolades équilibrées, tous littéraux, y compris dans `cn(...)`) → **23 sites** mêlant
une classe hors layer et un autre token ; parmi eux, les seuls `.mt-*` sont
`OfflineBanner:49` (l'autre token est un fragment de template, pas une classe) et les tables de
variantes de `ui/{avatar,badge,icon-button}.tsx` (`'sm'`, `'lg'`, `'ghost'`, `'default'` — des
valeurs de props, pas des utilitaires).

Deuxième passe, pour le cas où l'utilitaire arrive **par la prop `className`** d'un composant (c'est
exactement ainsi que `.mt-avatar` a échappé à la première passe) : seuls **3** composants à classes
`.mt-*` sont consommés hors de `components/ui/` — `Avatar` (`AppShell:217`, **conflit**), `Tabs`
(`products/page.tsx:56`, **sans `className`**), `Textarea` (`CategoryDrawer:378`, **sans `className`**).

### 3.2 Sélecteurs d'élément descendants (`core.css`, `timeline.css`)

`.mt-btn svg`, `.mt-avatar img`, `.mt-table th|td`, `.mt-check input`, `.mt-recur svg`, etc. :
aucun de ces enfants ne porte d'utilitaire dans le dépôt (les composants `ui/` rendent ces éléments
sans `className`). Aucun conflit.

### 3.3 `time, .mono, [data-mono]` (`base.css:50`) — reporté par #339, tranché ici : **NON**

`font-family: var(--font-mono)`. Deux `<time>` dans le dépôt : `EventPreviewTimeline.tsx:203` et
`WeekAgenda.tsx:53`. Les **deux** posent `font-mono`, soit exactement la même valeur. Dérive rendue :
nulle. `.mono` n'est utilisée que dans `table.stories.tsx` (sans utilitaire). **Pas de modification.**

### 3.4 `body`, `*` (box-sizing), `::selection` (`base.css`)

`body` n'agit que par héritage — une utilitaire sur un descendant gagne de toute façon.
Aucune utilitaire Tailwind ne pose `box-sizing` ni ne cible `::selection`. **Aucun conflit.**

### 3.5 `.feature-card`, `.testimonial-card` (`landing.css`) — conflit apparent, correction **contre-indiquée**

`FeaturesSection.tsx:41` pose `border-rule shadow-lg transition-all duration-300 hover:shadow-md`,
`TestimonialCard.tsx:42` pose `border-rule shadow-lg`. Analyse :

- `border-rule` → `border-color: var(--color-rule)` = **exactement** la valeur des règles DS (héritage
  de la correction ponctuelle du S48). Pas de dérive.
- `transition: all .3s ease` (hors layer, raccourci) bat les longhands de `transition-all` +
  `duration-300`. Même propriété (`all`), même durée (300 ms) ; **seule la courbe diffère** (`ease`
  vs `cubic-bezier(.4,0,.2,1)`). Divergence réelle mais d'intention nulle.
- **Contre-indication forte** : layeriser mettrait `.testimonial-card:hover { box-shadow: var(--shadow-sm) }`
  et `.feature-card:hover { border-color: rule-strong }` **sous** `shadow-lg` / `border-rule`
  (utilitaires sans variante `hover:`), qui gagneraient alors **en permanence** → **l'élévation et le
  renforcement de bordure au survol disparaîtraient**. La correction créerait la régression.

**Pas de modification.**

### 3.6 Les autres classes de la landing

`.section-animation` (7 sites), `.cta-button`, `.gradient-text`, `.feature-icon`, `.nav-link`,
`.hero-image-container`, `.hero-timeline*` : aucune intersection de propriété avec les utilitaires
posées à côté, ou valeur identique (`.hero-image-container{position:relative}` vs `relative`,
`.timeline-preview{overflow:hidden}` vs `overflow-hidden`). `.nav-link{transition:all .2s ease}`
bat la liste de propriétés curée de l'utilitaire `transition` — `all` en est un sur-ensemble, aucun
effet observable. **Pas de modification.**

### 3.7 `globals.css:192` — `html[data-density]`

`font-size` sur `<html>`. Aucune utilitaire n'est posée sur `<html>`. **Aucun conflit.**

---

## 4. `:focus-visible` — conflit réel, correction REFUSÉE ici (arbitrage requis)

C'est le conflit le plus large de l'audit (§2.4) **et** celui qu'il ne faut pas corriger seul.

**Le dépôt dépend du comportement actuel, mesuré et documenté sur place.**
`components/ui/language-selector.tsx:54` :
> « la règle globale `:focus-visible` de `styles/ds/tokens/base.css` (hors `@layer`, donc gagnante
> sur `outline-hidden`) pose un contour de 2px `accent` à 2px d'offset. VÉRIFIÉ RENDU […] Aucun
> anneau supplémentaire n'est donc posé ici. »

Layeriser `:focus-visible` **supprimerait** l'unique indicateur de focus de ce composant
(4.71:1 clair / 6.48:1 sombre → 0) : **régression WCAG 1.4.11**. Même exposition sur
`ExportDataFlow.tsx:85` (`<h3 tabIndex={-1} className="outline-none">`).

**Chiffrage du chantier (hors calibre S) :** ~14 sites à réauditer un par un (chacun doit porter un
indicateur explicite avant que le contour global ne cède), + décision DS sur `border-radius` dans un
reset de focus (pratique douteuse en soi), + arbitrage `ui-design` sur l'apparence du focus, +
vérification navigateur clavier clair/sombre. **Estimation M.** → `RECOMMAND_FOLLOWUP` +
`RECOMMAND_UI_DESIGN`.

---

## 5. Trouvaille hors périmètre (pas un problème de layer)

`FeaturesSection.tsx:41` cumule `transform` + `hover:-translate-y-2` **et** subit
`.feature-card:hover { transform: translateY(-10px) }`. En Tailwind 4, `-translate-y-2` compile vers
la propriété **`translate`**, pas `transform` — deux propriétés distinctes, **toutes deux
appliquées**, et le moteur les compose. Le survol lève donc la carte de **-18px** (-10 + -8), et de
**-13px** sous 768px. Layeriser n'y changerait rien : le correctif est de retirer l'un des deux.
**Non traité ici** (hors sujet #340). → `RECOMMAND_FOLLOWUP`, calibre XS.

---

## 6. Corrections livrées

| fichier | avant | après | layer | effet rendu |
|---|---|---|---|---|
| `frontend/src/styles/ds/components/core.css` | bloc Avatar hors layer | `@layer components { … }` | `components` | avatar sidebar `AppShell` : rayon **7px → 5px** (ce que `rounded-sm` demandait) |
| `frontend/src/styles/landing.css` | `.timeline-preview` hors layer | `@layer components { … }` | `components` | cadre aperçu frise landing : rayon **10px → 14px** (ce que `rounded-xl` demandait) |
| `frontend/src/styles/ds/tokens/base.css` | bloc scrollbar hors layer | `@layer base { … }` | `base` | `scrollbar-none` opérant **aussi sous Firefox** (`ProductCarousel`, `DensityRibbon`) |

**Choix du layer.** `components` pour les classes de composant (`.mt-avatar`, `.timeline-preview`),
**pas** `base` comme le suggère l'énoncé de l'issue : `base` est le layer des resets **et du preflight
Tailwind** ; y ranger un composant est sémantiquement faux même si le rang (avant `utilities`) est
équivalent. `base` pour le reset scrollbar, qui est un reset d'élément universel.
Ordre déclaré mesuré à la compilation : `theme, base, components, utilities`.

Chaque bloc corrigé porte sur place un commentaire `⚠ CASCADE` motivant sa présence dans un layer,
sur le patron des blocs `a` (#295) et `h1..h6` (#339) — pour qu'un futur passage ne le « nettoie » pas.

## 7. Verrouillage par test

`frontend/src/styles/__tests__/base-layer.test.ts` : 5 tests → **11**. Six ajoutés (3 assertions +
3 témoins anti-vacuité, chacun sur un `from` de compilation unique — le plugin PostCSS de Tailwind
mémoïse par chemin d'entrée, un `from` réutilisé ferait passer le témoin à vide).

Le test `.timeline-preview` recompose le **document** (`globals.css` + `landing.css`) dans l'ordre
de `app/layout.tsx` : `landing.css` est une feuille séparée, son `@layer components` **rejoint** le
layer déjà déclaré par `globals.css` au lieu d'en créer un.

**Validation par mutation** (dé-layerisation du bloc de production, exigence de rouge) :

| mutation | résultat |
|---|---|
| `core.css` — Avatar hors layer | 1 échec / 10 passés |
| `landing.css` — `.timeline-preview` hors layer | 1 échec / 10 passés |
| `base.css` — scrollbar hors layer | 1 échec / 10 passés |
| aucune (référence) | 11 passés |

Chaque mutation ne fait tomber **que** son test : les assertions sont bien liées à leur cible.

## 8. Ce que cet audit ne prouve PAS

- **Aucun rendu.** Les tests sont des assertions AST post-compilation PostCSS. Qu'un coin fasse 14px
  à l'écran relève de l'œil ou de l'E2E — jsdom ne résout ni `@layer` ni le layout.
- **Firefox non ouvert.** Le défaut `scrollbar-none` (§2.3) est déduit du fait que `scrollbar-width`
  est la seule voie de masquage sur Gecko et qu'elle était perdante ; le rendu Firefox n'a pas été
  observé, ni avant ni après.
- **La détection de conflit est syntaxique.** Elle croise classes et utilitaires par nom de propriété.
  Un conflit passant par une variable CSS intermédiaire, un `style={{}}` inline ou une classe
  construite dynamiquement (concaténation de fragments) échapperait au balayage.
- **Storybook non couvert** (`*.stories.tsx` exclus du balayage : non livrés).
