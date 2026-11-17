# Sprint 92 — Absorption tardive B : pause du toast levée par identifiant, focus rendu, titre de test

**Origine :** triage de clôture (`/sprint end 92`, Phase 4) — le dev a choisi d'absorber avant merge. Sources : `review-batch.md` (relecture de cycle 2), `review-fixes-done.md`.
**Agent :** fullstack-dev (opus, high) · **Spawn ref :** `6d2071f` · **Briefing :** `briefing-absorb-toaster.md` · en parallèle de l'absorption A (fichiers disjoints)

## Commits (vérifiés par le lead)
- `cabacd7` — :wheelchair: fix(toast): pause levée par identifiant et focus rendu à la disparition du toast (#621, cycle 2) — `ui/toaster.tsx` (101), `ui/toaster.test.tsx` (+110).
- `d51c6f6` — :pencil2: test(toast): titre du test aligné sur la pause au survol (#621, revue) — `e2e/sprint-92-business-toasts.spec.ts` (2).
- `git branch --contains d51c6f6` = `sprint/92`. Aucun fichier de l'absorption A ; le commit docs `fb76813` du lead s'intercale sans effet.

## Résumé
- **Identifiant au lieu de booléen** : `hoveredId` / `focusedId` ; un toast n'est « actif » que si son id figure parmi les toasts `visible` ; un effet remet l'état à zéro, un effet de réconciliation appelle `useToaster().handlers.startPause/endPause`.
- **Preuve dans `node_modules/react-hot-toast/dist/index.mjs`** : action 3 → `visible:false` immédiat ; action 4 → retrait après `removeDelay` 1000 ; action 5 → un seul `pausedAt` ; action 6 → la pause s'ajoute au `pauseDuration` de TOUS les toasts ; aucune minuterie ne court tant que `pausedAt` existe.
- **Correction du constat du cycle 2** : sous jsdom, l'ancien booléen gardait le survivant en pause **indéfiniment** (aucun `focusout` au démontage), pas ~1 s. Le reclassement MAJEUR → MINEUR du lead reposait sur la pause globale ; le défaut était donc plus sérieux qu'estimé dans le cas « toast retiré hors minuterie », et il est désormais corrigé.
- **Restauration du focus** : au `focusin`, `relatedTarget` est mémorisé s'il vient de hors des toasts (conservé d'un toast à l'autre, oublié si le focus ressort vers la page). Au retrait du toast focalisé, le focus lui est rendu seulement s'il est `isConnected`, non `:disabled`, hors `[inert]`/`[hidden]`, et si le focus est encore sur une carte ou sur `<body>`. Sinon rien : le focus n'est jamais volé.
- **JSDoc** : sections « PAUSE GLOBALE AU STORE » (motif WCAG 2.2.1) et « RESTAURATION DU FOCUS » ; paragraphe « Toast retiré » réécrit.
- **Titre du test l.132** : « création d'un événement : toast DS « Événement créé », au jeton --z-toast, carte captante (conteneur transparent au pointeur) hors de la croix du drawer ». La JSDoc de la spec était déjà juste ; le « non bloquant » de la l.161 désigne le conteneur et reste vrai. Aucune assertion modifiée.

## Tests (déclarés par l'agent)
- `toaster.test.tsx` 21/21 (dont 4 nouveaux).
- `frontend-unit` 1784/1787 : les 3 rouges et l'erreur `tsc` (`hooks/useArchiveProduct.test.tsx:20`, `No QueryClient set` à `useArchiveProduct.ts:75`) sont dans le travail NON COMMITTÉ de l'absorption A. **Vérifié par le lead** : au moment du retour, tous les fichiers modifiés non committés sont ceux de A (`products/**`, `hooks/useArchiveProduct*`, `sprint-92-product-detail-actions.spec.ts`). À re-vérifier sur la suite complète après le commit de A.
- `format:check` rouge sur `toaster.tsx` → `prettier --write` avant commit ; `prettier --check` vert ensuite sur les 3 fichiers (pas de `format:check` global rejoué après commit).
- `next lint` 0 ; `--list` : 3 tests.
- Armements : point 1 (actif = « au moins un visible ») → 2 rouges ; point 3 (sans `focus()`) → 1 rouge ; restauration prouvée par `shasum` identique et `cmp`.

## Fichiers de contexte lus (déclaration de l'agent)
- cp-frontend §Accessibilité/§Tests l.66-79 ; pit-frontend par grep (sous-ensemble S92 inline) ; `review-batch.md` l.31-37 ; `review-fixes-done.md` l.35, l.44 ; `issue-621-design-fix-done.md` par grep l.1-28.

## Non vérifié
- Navigateur réel : blur au démontage selon le moteur, Tab en fin de page.
- Le test « élément précédent retiré du DOM » n'est pas armé : `focus()` sur un nœud détaché est inerte sous jsdom, le test ne peut pas rougir.
- E2E : laissé au job `e2e` de la CI.

## Signaux mémoire
- [MEMORY:bug] Pause survol/focus du toast portée par un booléen remis à zéro seulement quand plus aucun toast n'est visible → survivant en pause indéfiniment sous jsdom quand le toast focalisé est retiré hors minuterie. Correctif : id + appartenance aux toasts visibles. Règle : l'état d'un élément de liste se garde par identifiant, jamais par booléen global. (Défaut introduit ET corrigé dans le sprint, jamais livré sur `dev`.)
- [MEMORY:pitfall] Un reclassement de finding fondé sur un fait vérifié (pause globale) peut sous-estimer le défaut quand ce fait ne couvre pas tous les chemins (retrait hors minuterie) : absorber plutôt que discuter la gravité quand le correctif est XS.

## Recommandations suite
- Pas de RECOMMAND_FOLLOWUP : les trois points du cycle 2 sont traités dans ce commit.
- Pas de RECOMMAND_TEST_RUNNER car la suite unitaire a tourné et ses rouges sont attribués (vérifié) à l'absorption A, à rejouer après son commit.
- Pas de RECOMMAND_UI_DESIGN car ni la position ni l'apparence du toast ne changent.
- Pas de RECOMMAND_SECURITY car aucune surface auth ni donnée personnelle touchée.
- Pas de RECOMMAND_DB_EXPERT car aucun changement de schéma.

STATUS: COMPLETED
