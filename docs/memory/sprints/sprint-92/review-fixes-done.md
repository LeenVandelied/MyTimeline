# Sprint 92 — Corrections de la review batch et arbitrage de position du toast

**Agent :** fullstack-dev (opus, high) · **Spawn ref :** `5c64e01` · **Briefing :** `briefing-review-fixes.md`

## Commits (vérifiés par le lead)
- `87dca1d` — :lipstick: fix(toast): position sous la barre des contrôles (#621, arbitrage) — `ui/toaster.tsx` (40), `toaster.test.tsx` (19), `e2e/sprint-92-business-toasts.spec.ts` (107).
- `fa8b102` — :bug: fix(events): pas de confirmation de modification sans PATCH envoyé (#621, revue) — `hooks/useEventEditConflict.ts` (20), `.test.tsx` (45).
- `bca8b20` — :white_check_mark: test(products): couvrir l'archivage depuis le drawer en E2E (#605, revue) — `e2e/sprint-92-product-detail-actions.spec.ts` (76).
- Tous sur `sprint/92` ; aucun fichier `docs/memory/**` ; arbre propre hors artefacts du lead.

## Résumé
### 1. Toast sous la barre des contrôles (arbitrage dev 2026-09-15)
- Hauteurs relevées dans le code : `.mt-drawer__header` padding-top `--space-5` 20 px (`timeline.css:426`) ; croix du drawer 28 px, zone de clic y 12–56 (`timeline.css:435,439`) ; fermer tactile paysage 44 px jusqu'à y 64 (`timeline.css:869`, `TimelineLandscapeDrawer.tsx:112`) ; header mobile du dashboard `h-14` y 0–56 et hamburger `h-11` y 6–50 (`dashboard/page.tsx:161-164,181`) ; croix du `ProductDrawer` desktop `top-4` y 16–32 (`ui/dialog.tsx:47`) ; pas de barre haute desktop dans le shell (`AppShell.tsx:235`) ; barre d'outils de la frise dans le flux (`timeline.css:172`) ; carte du toast ≈ 46 px (`core.css:277`, `typography.css:25`).
- Décalage : `TOASTER_TOP_OFFSET = calc(var(--space-5) + var(--space-11) + var(--space-2) + env(safe-area-inset-top))` = 72 px → carte ≈ y 72–118.
- Dégagés : croix des drawers, fermer tactile paysage, header + hamburger mobile, croix du `ProductDrawer` desktop, pied d'action des drawers.
- **Non dégagés (documentés dans la JSDoc, aucune valeur fixe ne peut les dégager)** : croix du `ProductDrawer` en bottom sheet mobile (≈ y 84–100 à 844 px de haut quand le formulaire remplit la sheet) ; haut du corps d'un drawer formulaire ouvert (seul un toast d'erreur peut s'y afficher, les succès partent après fermeture) ; barre d'outils de la frise, qui défile avec la page.
- Spec : l.112 remplacée (conteneur `none`, carte `auto`) ; assertions géométriques — desktop : drawer rouvert pendant le toast mis en pause par survol, boîte stabilisée de la carte sans intersection avec la zone 44 px de `shell-new-event-drawer-close`, garde « même colonne » contre l'assertion vacante ; mobile : idem avec `dashboard-mobile-menu-button`.
### 2. [MAJEUR revue] `runSubmit` sans PATCH
- Garde `!eventId || !user?.id` → `submitState='error'` (message existant `event-form-error`, aucune clé ajoutée) ; ni PATCH, ni invalidation, ni `onDone` → pas de toast.
### 3. [MINEUR revue] archivage depuis le drawer
- Produit dédié + produit témoin ; drawer ouvert depuis la liste (`products-edit-{id}`) → « Archiver » ; vérifiés : titre et bouton « Archiver », aucun « supprim », DELETE 204, toast « Produit archivé », drawer refermé ; absence du produit sur la liste **rechargée**, témoin visible.

## Tests (déclarés par l'agent)
- Vitest 1777/1777 (138 fichiers) · tsc 0 · `format:check` OK (Prettier a reformaté la spec toasts) · `next lint` 0.
- `--list` : toasts 3 tests, detail-actions 3 tests.
- Armements : décalage remis à 16 px → 1 rouge ; garde retirée → 2 rouges ; fichiers restaurés.

## Fichiers de contexte lus (déclaration de l'agent)
- cp-frontend §Tests l.72-80 ; pit-frontend grep (PIT-S54-003) ; `review-batch.md` en entier ; `issue-621-done.md` grep l.14, l.46 ; les 2 specs en entier.

## Non vérifié
- Aucun E2E exécuté par l'agent ; rendu peint non mesuré (tout est calculé depuis le code).
- Sheet compacte clavier ouvert (`top=offsetTop`).
- « Nouvel événement » et « Modifier » hors tests.
- Titre du test l.132 de la spec toasts dit encore « non bloquant » (libellé devenu faux).

## Signaux mémoire
- [MEMORY:pitfall] Après `deleteProduct`, ni `ProductsListView.handleArchiveConfirm` ni `ProductDrawer.handleDeleteConfirm` (ni `ProductDetailView`) n'invalident les requêtes produits : la ligne archivée reste probablement affichée jusqu'au refetch. **Préexistant sur `origin/dev`, vérifié par le lead.** Une spec qui vérifie l'absence après rechargement ne le détecte pas : vérifier aussi la liste en place.
- [MEMORY:pitfall] Une position « haut-droite + 16 px » pour un élément qui capte le pointeur recouvre les boutons de fermeture des en-têtes (44 px) : dimensionner le décalage sur les hauteurs mesurées des en-têtes, pas sur l'espacement du DS.

## Recommandations suite
- RECOMMAND_FOLLOWUP : hook `useArchiveProduct` (mutation + invalidation `products.all`) pour rafraîchir la liste après archivage [XS | frontend products] — préexistant, aucune issue ouverte.
- RECOMMAND_FOLLOWUP : recouvrement résiduel du toast sur la croix du `ProductDrawer` en bottom sheet mobile et sur le haut d'un drawer formulaire ouvert [S | design] — documenté, non dégageable par une valeur fixe.
- RECOMMAND_FOLLOWUP : renommer le titre du test l.132 de `sprint-92-business-toasts.spec.ts` (« non bloquant ») [XS | e2e] — à absorber si le cycle 2 le confirme.
- Pas de RECOMMAND_TEST_RUNNER car le lead joue la suite E2E complète sur le build final.
- Pas de RECOMMAND_DB_EXPERT car aucun changement de schéma.
- Pas de RECOMMAND_SECURITY car aucune surface auth ni donnée personnelle touchée.

STATUS: COMPLETED
