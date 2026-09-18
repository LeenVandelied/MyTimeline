# Issue #605 — Détail produit : « Archiver » au lieu de « Supprimer », « Nouvel événement » prérempli

**Vague :** 2 · **Agent :** fullstack-dev (opus, high) · **Spawn ref :** `0ae6ec9`

## Commit (vérifié par le lead)
- `ec7a076` — :bug: fix(products): « Archiver » au lieu de « Supprimer » et « Nouvel événement » prérempli sur le détail produit (#605)
- `git show --stat` : 26 fichiers, +749/−75 — `CreateEventContext`, `AppShell` (+ test), `NewEventDrawer` (+ test), `WeekAgenda`, `CompactAgenda`, `ProductDetailView` / `ProductDrawer` / `ProductsListView` (+ tests), `DeleteConfirmDialog` (+ 2 tests), `productService.ts`, `common.json` ×4, `products.json` ×4, `e2e/sprint-92-product-detail-actions.spec.ts` (+142). **Ne contient pas** `toaster.tsx` ni `core.css` (correctif Designer #621 en cours en parallèle).
- `git branch --contains ec7a076` = `sprint/92`.

## Correction du briefing en cours de route (lead)
Le briefing suggérait une JSDoc « soft delete réversible ». Faux : br-products §1 — produit archivé « définitif pour cette wave (pas d'endpoint de restauration) ». Message envoyé à l'agent : ni « réversible » ni « désarchiver » pour un produit. Appliqué (JSDoc « aucune restauration exposée à ce jour »).

## Résumé
- API : `OpenCreateEvent = (options?: { productId?: string }) => void`, identité stable (`AppShell.tsx:183`). Le MouseEvent est bloqué deux fois : `tsc` refuse `onClick={open}` (constaté) → `WeekAgenda.tsx:84`, `CompactAgenda.tsx:111` et `openCreateBlank` du shell enveloppés ; à l'exécution, `toCreateEventPrefill` n'accepte qu'un objet simple avec `productId` chaîne non vide.
- Prérempli : `openCreate({productId})` → `createPrefillProductId` (shell) → `NewEventDrawer initialProductId` → `effectiveProductId`, retenu seulement si l'id est dans la liste chargée. Id archivé → sélecteur vide (garde BR-EVE-002). Liste en chargement → effectif à l'arrivée du produit.
- Détail : Nouvel événement (accent) · Modifier · Archiver (icône `Archive`, `destructive`). `ProductDrawer.tsx:430` `actions.archive`. `DeleteConfirmDialog` : confirmation et état d'attente propres à la variante `product` ; `event`/`category` inchangées.
- i18n ×4 : ajout `detail.newEvent`, `common.toast.productArchived`, `deleteDialog.product.confirm/confirming` ; renommage `detail.delete`→`detail.archive`, `drawer.actions.delete`→`archive` ; titre « Archiver ce produit ? ».
- Catégories : suppression PHYSIQUE (`CategoryServiceImpl.java:136` `deleteById`, aucun `@SQLDelete`/`@SQLRestriction` sur `CategoryEntity`) → « Supprimer » conservé à juste titre. Événements : hard delete (br-events §1) → inchangés.
- Toast « Produit archivé » sur détail, drawer et liste.
- Testids : `product-detail-delete`→`product-detail-archive` (0 usage E2E) ; ajout `product-detail-new-event`, `product-drawer-archive`.

## Tests (déclarés par l'agent)
- Vitest 1767/1767 (138 fichiers) · tsc OK · `format:check` OK · `next lint` 0.
- `--list` : spec neuve 2 tests. Aucune spec E2E existante modifiée (grep : 0 référence).
- Armement : sans les deux gardes MouseEvent → 4 rouges (2 AppShell, 2 NewEventDrawer), gardes restaurées.
- **E2E NON exécuté par l'agent — à jouer par le lead** (après le commit du correctif Designer #621).

## Fichiers de contexte lus (déclaration de l'agent)
- cp-frontend (en entier) ; br-products BR-PRO-007 l.83 ; br-events l.10, l.47 (BR-EVE-002) ; pit-frontend PIT-S85-003 l.1248 ; handoff l.182-225 ; `issue-621-done.md`.
- `issue-603-done.md` NON LU.

## Non vérifié
- E2E ; rendu visuel du bouton accent, clair/sombre ; lecteur d'écran.
- Clés `products.json` `add.event.remove` / `add.events.remove` (« Supprimer ») : 0 appelant trouvé, laissées.

## Signaux mémoire
- [MEMORY:pattern] Fonction de contexte passée en `onClick` = reçoit le MouseEvent en argument. Parade : type d'options sans propriété commune avec `MouseEvent` (tsc refuse `onClick={open}`) + normalisation à l'exécution. Anti-pattern : `onClick={open}` sur une fonction à options.
- [MEMORY:pitfall] (lead) Un briefing peut affirmer une propriété métier fausse (« archivage réversible ») : vérifier le cycle de vie dans le pack `br-*` §1 avant d'écrire une consigne de libellé.

## Recommandations suite
- RECOMMAND_FOLLOWUP : aucune restauration de produit archivé (ni endpoint ni surface) [M | backend+frontend].
- RECOMMAND_FOLLOWUP : clés `add.event.remove` / `add.events.remove` probablement mortes [XS | i18n].
- RECOMMAND_UI_DESIGN : bouton accent « Nouvel événement », Archiver en `destructive`, « Modifier » vs « Éditer » du handoff — revue Designer de vague 2 lancée par le lead.
- Pas de RECOMMAND_TEST_RUNNER car le lead joue l'E2E.
- Pas de RECOMMAND_DB_EXPERT car aucun changement de schéma.
- Pas de RECOMMAND_SECURITY car aucune surface auth ni donnée personnelle touchée.

STATUS: COMPLETED
