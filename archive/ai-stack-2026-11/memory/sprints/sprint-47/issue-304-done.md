# Issue #304 — [E2E] Timeline : accordéon collapse par produit (`timeline-resource-head`)

- commits: `87d3741`
- branche: `sprint/47` (worktree `sprint-47-start-5e5a53`)
- fichier: `frontend/e2e/timeline.spec.ts` (EXTENSION en fin de fichier — passe E2E timeline unique, cf. #314)

## Résumé

Objectif : couvrir en Playwright le toggle expand/collapse par lane produit livré en #195
(`<button data-testid="timeline-resource-head">`, `TimelineView.tsx:628-655`), jusqu'ici référencé
par ZÉRO spec E2E (seul son enfant `timeline-resource-title` était exercé par `golden-path.spec.ts`).

Un `test.describe('#304 /timeline — accordéon collapse par produit')` ajouté en fin de
`frontend/e2e/timeline.spec.ts` (2 tests). Les helpers de #314 (`gotoTimeline`, `PROD` storageState,
`getUserId`/`seedCategory`/`seedProduct`/`unique`) sont réutilisés, aucun dupliqué. Les 8 tests de
#314 sont inchangés (aucune ligne touchée au-dessus de la ligne 335).

Ce qui est asserté :
- **`aria-expanded` (assertion PRIMAIRE)** — `true` → `false` au clic → `true` au re-clic. Jamais
  la seule visibilité : point dur du plan architect (une hauteur CSS animée rendrait l'assertion
  de visibilité intermittente).
- **Pastilles** — `toHaveCount(0)` après repli / `toHaveCount(1)` après dépli, scopées à la lane
  (`timeline-resource-row` filtré par son propre head) et au `data-event-title` du produit seedé.
  `toHaveCount` et pas `not.toBeVisible()` : le rendu est conditionnel (`!isResCollapsed && ...`),
  le démontage est le contrat réel ; `not.toBeVisible()` passerait aussi sur un hors-écran.
- **Survie du toggle replié** — `head` toujours visible + `timeline-resource-title` toujours au bon
  libellé une fois replié (la lane doit rester identifiable pendant le scroll horizontal, #195).
- **Indépendance** — 2 produits seedés dans LA MÊME catégorie : replier le 1er laisse le 2e à
  `aria-expanded=true` avec ses pastilles montées, et la catégorie parente
  (`timeline-group-head` filtré sur le nom de catégorie) à `aria-expanded=true`. Symétrie vérifiée
  (replier le 2e ne déplie pas le 1er). Les 2 `timeline-resource-row` restent rendues.

Choix d'état : seeding API réel (1 catégorie dédiée + 2 produits dedans, 1 event du jour chacun via
`seedProduct`), **aucun stub** — l'état replié/déplié est local (`useState` dans `TimelineView`, non
persisté), donc déterministe même sur le compte partagé PROD. Le groupe seedé est isolé au milieu
des lanes des autres specs par des noms `unique()`.

Pièges rencontrés : aucun nouveau. Les 4 pièges du runbook et les 4 pièges de #314 étaient
suffisants (`--workers=1`, `SKIP_DELEGATION=1`, `:3100`, `eventmanager_e2e` ; regex plutôt que glob,
compte PROD non vierge). Aucun stub `page.route` nécessaire ici, donc ni glob ni gate à gérer.
Aucun ciblage de `SelectItem` Radix (pas de Select dans ce parcours).

## Preuve d'exécution locale (fichier ENTIER)

```
Running 15 tests using 1 worker
  ✓   6..13 [chromium] › e2e/timeline.spec.ts › #314 (8 tests) — écran (états) + drawer
  ✓  14 [chromium] › timeline.spec.ts:390 › #304 › clic sur timeline-resource-head : aria-expanded bascule, pastilles masquées puis réaffichées (1.0s)
  ✓  15 [chromium] › timeline.spec.ts:426 › #304 › indépendance : replier un produit n’affecte ni le produit voisin ni la catégorie parente (1.0s)
  15 passed (24.2s)
```

`PASS (15) FAIL (0)` — soit 5 tests `setup` (provisioning des comptes) + 8 tests #314 + 2 tests #304.
Baseline #314 = `PASS (13) FAIL (0)` → +2, aucune régression. Deux exécutions consécutives vertes
(14.4 s et 24.2 s), aucun flake observé.

Commande :
```bash
cd frontend && SKIP_DELEGATION=1 PLAYWRIGHT_BASE_URL=http://localhost:3100 \
  npx playwright test timeline.spec.ts --workers=1 --reporter=line
```

Qualité : `tsc --noEmit` → No errors · `eslint e2e/timeline.spec.ts` → No issues ·
`prettier --check` → formatted.

## Couverture

| Critère (corps de l'issue) | Couvert |
|---|---|
| `timeline-resource-head` → bascule `aria-expanded` | **OUI** (true→false→true, attribut asserté, pas la visibilité) |
| Masquage / réaffichage des pastilles produit | **OUI** (`toHaveCount(0)` replié → `toHaveCount(1)` déplié, scopé à la lane) |
| Indépendance inter-produits et vis-à-vis de la catégorie parente | **OUI** (2 produits même catégorie ; voisin + `timeline-group-head` inchangés, symétrie vérifiée) |

Aucun composant applicatif modifié (issue de COUVERTURE). `timeline-resource-head` s'est avéré
pleinement testable en l'état : bouton natif, `aria-expanded` présent, enfant
`timeline-resource-title` disponible pour le ciblage par nom de produit.

## [MEMORY:*]

`[MEMORY:pattern]` Problème : asserter un accordéon en E2E sans flake quand le masquage peut passer
par une animation CSS. Solution : asserter l'ATTRIBUT `aria-expanded` du bouton toggle comme
assertion primaire, et le contenu par `toHaveCount(0)` (démontage) — jamais `not.toBeVisible()`.
Anti-pattern : `expect(pill).not.toBeVisible()`, vert aussi bien sur un élément hors-écran que sur
une hauteur en cours d'animation → intermittent.

`[MEMORY:pattern]` Problème : tester un état d'UI local sur un compte E2E partagé et jamais vierge.
Solution : quand l'état testé est purement client (`useState` non persisté), seeder par API une
catégorie dédiée + ses produits avec des noms `unique()` et SCOPER tous les locators par ces noms
(`filter({ hasText })` / `filter({ has })`) — pas besoin de stub `page.route`. Anti-pattern : stubber
le listing produits pour des états que le vrai backend atteint déjà de façon déterministe.

## Recommandations suite

- Pas de `RECOMMAND_FOLLOWUP` sur le composant : `timeline-resource-head` est testable en l'état
  (`aria-expanded` présent, enfant testid présent) — rien à corriger côté `TimelineView.tsx`.
- Pas de `RECOMMAND_TEST_RUNNER` : suite ciblée courte (15 tests, 24 s), lancée en direct, verte.
- Pas de `RECOMMAND_DB_EXPERT` ni `RECOMMAND_SECURITY` : aucune touche schéma, backend ou auth.
- Note pour la vague suivante / #205 : `frontend/e2e/timeline.spec.ts` compte désormais 10 tests et
  2 propriétaires (#314 écran+drawer, #304 accordéon). Les variantes MOBILES du collapse
  (`TimelineMobilePortrait`/`Landscape` n'exposent PAS `timeline-resource-head` — leur
  `timeline-resource-title` n'est pas un bouton) restent hors de cette passe : c'est le périmètre de
  `timeline-mobile.spec.ts` (#205), pas une lacune de #304.

STATUS: COMPLETED
