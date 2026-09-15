# Issue #518 — Dates en `<time datetime>` (sémantique DS §7)

**Commit :** `dcfa62e` — `:wheelchair: feat(frontend): rendre les dates en <time datetime> (#518)`
**Vérification lead :** `git show --stat dcfa62e` → 24 fichiers, +662/−50. Aucun fichier de #578
(`AppShell*`, `SettingsShell*`) embarqué — vérifié par le lead, pas seulement déclaré.

## Fichiers de contexte lus (déclarés par l'agent)
`.ai-env/context-packs/pit-frontend.md` (PIT-S53-001, PIT-S74-005, PIT-S45-003, PIT-S74-008,
PIT-S41-002), `ds/components/i18n.css` §7, `ds/tokens/typography.css`, `ds/components/timeline.css`,
`styles/__tests__/i18n-intl-classes.test.ts`, `eslint.config.mjs`.
Non lus : `.claude/rules/frontend-stack.md`, `.claude/rules/conventions.md` (jugés couverts par
le pack inline — à noter, ce n'était pas une dispense).

## Résumé

**Le recensement contredit à la fois l'issue et l'architect.** `<time>` en production avant : **2**
(WeekAgenda:59, EventPreviewTimeline:249) — l'issue avait raison, l'architect comptait à tort le
fichier de test. **14 composants** rendaient une date en texte → **12 migrés**, 2 déjà en `<time>`
et corrigés. **3 non migrables** :
- `CompactAgenda` **n'affiche aucune date** (documenté à ses lignes 19-22 depuis #83) — l'issue le
  nommait à tort ;
- `DensityRibbon` et `TimelineView` ne rendent leurs dates que dans `title` / `aria-label`.

Trois références de l'issue sont également fausses : `ProductsListView:295` est un `<td>` (pas un
`<span>`), `SessionList` un `<p>`.

Migrés : `ProductDetailView`, `ProductsListView`, `SessionList`, `ExportDataFlow`, `EventDrawer`,
`TimelineBottomSheet`, `TimelineLandscapeDrawer`, `DateStamp`, `ProductList`, `ProductCarousel`,
`privacy`, `terms`.

Nouveau `frontend/src/lib/date-iso.ts` (`toLocalIsoDate` / `toIsoInstant`). Il **corrige un défaut
réel** : `WeekAgenda` posait `toISOString()`, l'attribut pouvait donc nommer un autre jour que le
libellé affiché, et levait `RangeError` sur date invalide.

`ExportDataFlow` : date au milieu d'une phrase ICU → `t.rich` + balise `<expiry>` ajoutée aux 4
`export.json` (l'allemand postpose « ab »). Premier `t.rich` du dépôt.

### Arbitrage `--short` vs `--long` (incidence #517)
`.mt-date--long` retenu, précédent #72 confirmé. `--short` force `uppercase` + 11px **et** un autre
jeu d'options `Intl` : c'est un arbitrage Designer, pas une migration sémantique.
**#517 est donc tranchée dans ce sens : `.mt-date--short` demeure délibérément inutilisée.**
`--long` = 13px = exactement `--text-2xs` et la `font-size` de `.mt-drawer__row` → dashboard et les
3 drawers restent **à taille constante**. `DateStamp` et pages légales reçoivent `<time>` **sans**
`.mt-date--*` (le `nowrap` défait le repli sur 2 lignes documenté ; 13px mono décrocherait la date
d'une phrase de prose).

### Tests
`./scripts/test-quiet.sh frontend` → **exit 0**, build OK, **1359/1359** (119 fichiers, +9 vs base
1350/118), typecheck OK, lint OK. Garde non complaisante **prouvée** : retirer `<expiry>` de la
locale `de` rend 2 cas rouges et exit 1.

## Non vérifié / manquant (à retenir)
- **Aucune vérification navigateur.** jsdom n'applique pas le DS. **3 surfaces portent un delta
  assumé 15→13px non mesuré** : `ProductDetailView` (historique), `ProductsListView` (cellule
  dernière activité), et surtout **`SessionList`** — la date passe à 13px mono alors que l'IP
  voisine, **sur la même ligne**, reste à 15px. À trancher visuellement.
- `DateStamp` : `<time>` inline posé dans le div de layout — l'intégrité des seuils
  container-query 34px/52px est raisonnée, **pas mesurée**.
- **E2E non lancés** (consigne). `e2e/sprint-70-preview-visual.spec.ts:344` cible
  `legend.locator('time')` ; `EventPreviewTimeline` garde exactement 1 `<time>`, donc a priori
  intact — **non exécuté**.
- Crowdin non inspecté : si un aller-retour supprime `<expiry>` d'une locale, la dégradation est
  douce (texte nu, pas d'exception — prouvé par sabotage) mais la sémantique est perdue dans
  cette langue.
- Aucun test avec un vrai lecteur d'écran.
- **Aucune garde automatique n'attrapera un composant neuf** qui rendrait une date en `<span>`.

## Signaux mémoire
- `[MEMORY:pitfall]` JSX dans un littéral de **tuple** `[clé, <time/>]` : `react/jsx-key` le prend
  pour une liste d'enfants et rougit → `next build` échoue (lint = gate CI). Poser un `key` littéral.
- `[MEMORY:pitfall]` `next build` **vert** + `vitest` **vert** pendant que `tsc --noEmit` est
  **rouge** (cast faux dans un `.test.tsx`) : les fichiers de test sortent du périmètre du build.
  Le verdict frontend, c'est `test-quiet.sh` complet — jamais build+vitest seuls. Symétrique de
  PIT-S41-002.
- `[MEMORY:pitfall]` **Énoncé d'issue faux malgré un fort taux d'exactitude apparent** : #518
  nommait `CompactAgenda` (qui n'affiche aucune date, documenté depuis #83) et citait 3
  lignes/éléments inexacts, alors que 4 des 5 composants nommés étaient bons. Relire **chaque**
  composant nommé avant de briefer.
- `[MEMORY:decision]` `.mt-date--long` partout où le DS s'applique ; `.mt-date--short` reste
  inutilisée. `--short` impose `uppercase` + 11px **et** un autre format `Intl` : choix Designer,
  hors périmètre d'une migration sémantique. Tranche #517 dans ce sens.
- `[MEMORY:pattern]` Date au milieu d'une phrase ICU traduite (l'ordre des mots varie : `de`
  postpose « ab ») → `t.rich` + balise dans les 4 messages. Anti-pattern : sortir la date du
  message pour la concaténer — casse l'ordre des mots dans au moins une locale.
- `[MEMORY:pitfall]` **Pack périmé** : `cp-frontend.md` annonce Vitest `^2.1.9` ; le dépôt tourne
  en **3.2.7**.

## Recommandations suite
- `RECOMMAND_FOLLOWUP` 1 : vérification navigateur du delta 15→13px sur les 3 surfaces,
  `SessionList` en priorité (date 13px mono ↔ IP 15px sur la même ligne) `[XS | frontend/ui-design]`.
- `RECOMMAND_FOLLOWUP` 2 : **#517 à fermer ou requalifier** — `.mt-date--short` reste délibérément
  inutilisée ; l'issue devrait devenir « arbitrage Designer : brancher `--short` avec ses options
  `Intl`, ou la supprimer du DS » `[XS | ui-design]`.
- `RECOMMAND_FOLLOWUP` 3 : dates en `title` / `aria-label` (`DensityRibbon` ×3,
  `TimelineView.buildEventAriaLabel`) — hors d'atteinte de `<time>` ; vérifier qu'elles sont au
  moins localisées `[XS | frontend]`.
- `RECOMMAND_TEST_RUNNER` : rejeu E2E (24 fichiers touchés dont produits, réglages et les 3 drawers).
- `RECOMMAND_UI_DESIGN` : delta 15→13px + sort de `.mt-date--short`.

STATUS: COMPLETED
