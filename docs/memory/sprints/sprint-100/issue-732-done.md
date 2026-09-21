# #732 (+ #740) — Croix de `DialogContent` qui sort du viewport au défilement

## Résumé
Objectif : garder la croix de fermeture visible et cliquable à tout `scrollTop` sur les deux bottom sheets qui défilent (`ProductDrawer`, `CategoryDrawer`). #740 a la même cause et le même correctif.

**Choix : correctif partagé dans `frontend/src/components/ui/dialog.tsx`.** Pourquoi : #740 vise tous les dialogues dont le contenu défile, et un correctif posé seulement dans les deux drawers aurait laissé le défaut en place pour le prochain consommateur qui ajoute `overflow-y-auto`.

Mécanisme :
- Le `Content` passe de `grid gap-4` à `flex flex-col gap-4 *:shrink-0`. `*:shrink-0` reproduit les pistes `auto` du grid, qui ne se compriment pas.
- La croix est enveloppée dans une ancre `sticky top-0 z-10 order-first -mb-4 h-0`, avec la croix en `absolute -top-2 -right-2`.
  - `order-first` place la croix visuellement en tête mais la laisse **dernière dans le DOM**. Le focus initial de Radix est donc inchangé (vérifié : `sprint-86-form-drawer-modal` et `sprint-94-modal-shortcuts` passent, Vitest 334/334).
  - `-mb-4` annule le gap. Ce n'est possible qu'en flex : en grid, une piste ne descend pas sous 0, et la zone de grille (de hauteur nulle) servirait de bloc conteneur au sticky, qui ne glisserait jamais.
  - `-top-2 -right-2` donne 24 − 8 = 16 px, soit l'ancien `top-4 right-4`.
  - `z-10` est nécessaire parce que `order` modifie aussi l'ordre de peinture en flex.
- Point mesuré, pas supposé : le seuil `top` d'un sticky se compte depuis le **bord de contenu** du scrollport, padding déduit. Une première version en `top-6` posait la croix à `sheet + 41` au lieu de `sheet + 16`. Corrigé en `top-0`.

Commit `0eb0a59a` `(#732, #740)`. Après l'arbitrage du dev, il inclut aussi la réécriture de `sprint-95-toast-overlap` et la JSDoc de `toaster.tsx` (voir `## Arbitrage`).

Fichiers du commit :
- `frontend/src/components/ui/dialog.tsx`
- `frontend/e2e/sprint-100-dialog-close-reachable.spec.ts` (nouveau)
- `frontend/e2e/sprint-95-toast-overlap.spec.ts`
- `frontend/src/components/ui/toaster.tsx` (JSDoc seule)

`ProductDrawer.tsx` et `CategoryDrawer.tsx` ne sont pas modifiés.

## Tests
- **Armement (code d'origine)** : `npx playwright test e2e/sprint-100-dialog-close-reachable.spec.ts`
  - Résultat : 2 rouges attendus, ProductDrawer croix `y=-123` et CategoryDrawer `y=-100` à 390×600 défilé en bas.
  - Le test desktop DeleteConfirmDialog est vert, donc la référence de non-régression est valide.
- **Après correctif** : la même spec passe 3/3, avec l'assertion supplémentaire « croix à `sheet.y + 16` ±2 APRÈS défilement ».
- **Rejeu des 17 specs de surface + la nouvelle** (`--ignore-snapshots`, `next dev` :3100, harnais vérifié 401/200) : **93 passed, 5 failed** :
  - 4 échecs `sprint-90-first-contact` #629, squelettes : connus sous `next dev`, non imputables ;
  - 1 échec `sprint-95-toast-overlap` TALL 390×844 : **imputable**, A/B sur `HEAD` vert (6/6).
- **Vitest** : 22 fichiers (tous ceux qui citent un consommateur de `DialogContent`), PASS 334 / FAIL 0, exit 0.
- **Après arbitrage** :
  - Rejeu de `sprint-95-toast-overlap` + `sprint-100-dialog-close-reachable` + `sprint-99-touch-targets` : 20 passed, exit 0 (harnais vérifié 401/200).
  - `sprint-95` rejoué 3 fois, espacé de `sleep 15` : run1 OK (9 passed), run2 OK (9), run3 OK (9). Aucun SETUP-KO, aucun CIBLE-KO.
  - Contrôle d'armement avec l'ancien `dialog.tsx` (`git show HEAD:…`) : 3 rouges (TALL, MID, SHORT), tous sur la nouvelle garde « scrollWidth ≤ clientWidth » (587-603 contre 388). Version corrigée restaurée ensuite.
  - Qualité refaite sur les 4 fichiers : tsc exit 0, `rtk proxy npx next lint --file` ×4 à 0, prettier (binaire direct) OK.
- **Qualité** :
  - `npx tsc --noEmit -p .` : 0 erreur ;
  - `next lint --file` (dialog.tsx, spec) : 0 ;
  - `prettier --check` via le binaire direct : OK.

## Écarts d'énoncé
- #740 exigeait « `sprint-95` reste vert » sans modification. Ce n'est pas tenable : la spec a été réécrite sur arbitrage du dev (voir `## Arbitrage`).
- Le lead cite `ProductDrawer.tsx:259` ; la ligne réelle du `className` est 259, confirmée.
- #732 cite `y = -12` pour la croix au S95. Mesuré ici : `y = -123`. L'écart vient du défilement jusqu'en bas (`scrollTop = scrollHeight`) et de la hauteur de contenu actuelle, plus grande depuis #665/#738.
- **Défaut latent découvert, hors énoncé** : l'ancien `grid` débordait horizontalement.
  - La piste implicite `auto` s'élargissait au min-content de l'aperçu (`ProductSparkline` 220 px en `ml-auto`, `ProductDrawer.tsx:411`). Tous les enfants passaient à 400 px dans une zone de contenu de 340 px.
  - Mesures à 390×844 : `scrollWidth 448 / clientWidth 388` avant, `388 / 388` après.
  - Conséquence en production actuelle : sheet produit mobile défilable horizontalement de 60 px, champs coupés à droite.
  - Dans `sprint-95`, la croix mesurée à `x=333` au lieu de 357 était décalée par un `scrollLeft` de 24 px, que la spec ne remet pas à 0.

## Non vérifié
- CI Linux (métriques de police) : non exécutée.
- `next build` + `next start` : non exécuté, réservé au lead.
- `AccountSection`, `RestoreProductDialog`, `ArchiveConfirmDialog`, `ConflictDialog` : aucune mesure géométrique dédiée à la croix.
  - Couverture indirecte seulement : `sprint-93-restore-product`, `sprint-61`, `sprint-92-*` et `categories` sont verts.
  - DeleteConfirmDialog est mesuré (desktop).
- Largeur de CategoryDrawer avant correctif : débordement horizontal non mesuré.
- Lisibilité de la croix (opacité 70 %, sans fond) quand du contenu défile dessous : non évaluée visuellement.
- Storybook `ui/dialog.stories.tsx` : non rendu.
- Thème sombre : non mesuré.

## Signaux mémoire
- [MEMORY:pitfall] Contexte : croix sticky d'un dialog défilant avec `p-6`. Solution : le seuil `top` d'un `position:sticky` se compte depuis le bord de CONTENU du scrollport (padding déduit). `top-6` décalait de 24 px, il faut `top-0`. Prévention : mesurer `enfant.y − conteneur.y` APRÈS défilement, pas seulement à `scrollTop` 0.
- [MEMORY:pitfall] Contexte : sticky dans un conteneur `grid`. Solution : le bloc conteneur d'un item de grille est sa ZONE de grille, donc un sticky de hauteur nulle dans sa propre piste ne glisse jamais, et une marge négative ne compense pas le `gap` (piste ≥ 0). Passer en `flex flex-col` + `order-first` + `-mb-{gap}`. Prévention : ne jamais poser un sticky comme item direct d'une grille à pistes auto.
- [MEMORY:bug] Cause : `DialogContent` en `grid` avec piste implicite `auto`. Le min-content d'un seul enfant (sparkline 220 px + libellé) élargit TOUS les enfants au-delà du conteneur (400 px dans 340 px), d'où un débordement horizontal de 60 px du `ProductDrawer` mobile, invisible aux specs qui ne relisent pas `scrollLeft`. Solution : flex column, ou `grid-cols-[minmax(0,1fr)]`. Règle : toute spec de géométrie dans un conteneur `overflow:auto` neutralise `scrollTop` ET `scrollLeft`.
- [MEMORY:decision] Contexte : `DialogContent` en flex corrige un débordement horizontal ; à 390×844 la sheet produit est alors clampée et la croix entièrement sous le toast d'erreur. Décision : décision B #714 étendue au régime TALL (dev, 2026-09-21), sortie = bande d'overlay 0–68 px. Pourquoi : la position du toast reste fixe (72 px) et la sortie structurelle est intacte ; le 3,5 px antérieur était un artefact.
- [MEMORY:pitfall] Contexte : `sprint-95` TALL encadrait un recouvrement de 3,5 px. Constat : cette valeur était un artefact du débordement horizontal, contenu 726 px au lieu de 802 px une fois le texte replié à la bonne largeur. Prévention : un oracle au pixel doit aussi vérifier que le conteneur ne déborde pas horizontalement (`scrollWidth == clientWidth`).

## Recommandations suite
- Pas de RECOMMAND_DB_EXPERT : frontend seul, aucune donnée.
- Pas de RECOMMAND_SECURITY : classes CSS et structure DOM d'un bouton, aucune surface d'auth.
- Pas de RECOMMAND_TEST_RUNNER : les 18 specs de surface ont été rejouées ici ; seul `sprint-90` est à rejouer par le lead sous `next build`.
- Pas de RECOMMAND_UI_DESIGN : arbitré par le dev (option 1)
- RECOMMAND_FOLLOWUP: donner un fond à la croix (ou une bande d'en-tête) pour la lisibilité quand le contenu défile dessous [triage XS]

## Arbitrage
Décision B #714 étendue au régime TALL par le dev, 2026-09-21 (option 1).

Constat qui a motivé l'arbitrage, mesuré sur le même commit :
- **Avant** : contenu 726 px à 390×844, sheet libre, recouvrement de 3,5 px. Ce régime reposait sur le débordement horizontal.
- **Après** : contenu 802 px, sheet clampée (y=68, h=776), croix 85–101, recouvrement TOTAL (16 px).

Réécriture de `sprint-95-toast-overlap` :
- `scrollLeft` remis à 0 avec `scrollTop`, la prémisse est écrite en commentaire ;
- nouvelle garde `scrollWidth ≤ clientWidth` ;
- le describe TALL attend une sheet clampée et un recouvrement total (même encadrement que MID) ;
- en-tête et commentaire du reset réécrits, chaque cote renvoie au `console.log` `[#714]` de la spec ou à `sprint-100-dialog-close-reachable`.

JSDoc `toaster.tsx` corrigée : les 3 régimes, le ruban 0–68 px à 844, et l'oracle.

Écart d'armement : avec l'ancien code, TALL rougit sur la garde de débordement, pas sur la borne de recouvrement. Les deux pannes étant de même cause, cela suffit à prouver que la spec est armée.

fichiers de contexte lus: frontend/src/components/ui/dialog.tsx (entier) ; ProductDrawer.tsx l.240-275, l.408-419 ; CategoryDrawer.tsx l.230-255 ; ArchiveConfirmDialog/ConflictDialog/DeleteConfirmDialog/RestoreProductDialog (bloc DialogContent) ; AccountSection.tsx l.89-93 ; e2e/sprint-95-toast-overlap.spec.ts l.1-80, 100-420 ; e2e/categories.spec.ts l.1-12, 89-190 (grep) ; e2e/support/products.ts l.100-145 ; frontend/playwright.config.ts l.1-60 ; .ai-env/context-packs/pit-frontend.md grep ciblé (PIT-S85-001 l.1240, PIT-S96-004 l.1596, PIT-S99-002 l.1652) ; docs/memory/sprints/sprint-95/issue-714-done.md §Recommandations l.70-75 (grep) ; docs/memory/sprints/sprint-99/issue-738-done.md §Recommandations l.84-89 (grep, le reste NON LU)

STATUS: COMPLETED
