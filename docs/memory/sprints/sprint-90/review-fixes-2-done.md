# Sprint 90 — Correctifs review cycle 2 (1 majeur + 1 mineur)

## Résumé

Base `032da8e` (descend de `84fb818`). Deux commits, chacun avec pathspec littéral et vérifié par `git show --stat`.

| Finding | Correctif | Fichiers | Commit |
|---|---|---|---|
| 1 MAJEUR — `sprint-84` vacant | Le nom (`PROD.username`) est remplacé EN PLACE (`nodeValue`) dans le nœud texte du `h1` par `'W'.repeat(60)`. Une règle `span` (`position:absolute; visibility:hidden; white-space:nowrap; overflow-wrap:normal; word-break:normal`) est insérée dans le `h1` pour hériter de sa typographie ; elle mesure le jeton, puis est retirée. Injection, règle et mesures tiennent dans UN `evaluate` synchrone, sans rendu React intercalé. Préconditions explicites (`expect`, pas `skip`) : nom trouvé et remplacé, jeton présent, `clientWidth > 0`, `tokenWidth > clientWidth`. Assertions gardées : `h1.scrollWidth <= clientWidth` et débordement de page. Commentaire d'armement dans la spec. | `e2e/sprint-84-section-titles.spec.ts` | `8276b9a` |
| 2 MINEUR — focus après annulation | Ref `emptyCtaRef` sur le CTA d'état vide. À `onCloseAutoFocus` (ouverture depuis le CTA) : **CTA déconnecté** → `preventDefault` + focus sur le bouton permanent ; **CTA connecté** → aucune interception (Radix rend le focus au CTA) et drapeau `focusBackToEmptyCtaRef`. **Ajout hors lettre du brief** : un effet sur `hasProducts`/`hasCategories` rend le focus au bouton permanent si la liste devient non vide alors que le focus est retombé sur `body`. Raison : `useCreateProduct`/`useCreateCategory` ne renvoient pas la promesse d'`invalidateQueries` dans `onSuccess`, donc le drawer se ferme avant le rechargement. Avec l'animation de sortie (200 ms), le CTA peut être encore monté à la fermeture même quand la création a réussi. Sans l'effet, ce cas retomberait sur `body`, régression par rapport au code précédent. | `ProductsListView.tsx`, `CategoriesView.tsx` + 2 tests | `0de3ec6` |

Mocks de drawer (les deux tests) : ils émulent maintenant la restitution FocusScope. L'élément actif est capturé à l'ouverture, puis refocalisé si l'événement n'est pas annulé. `drawerClose.lastPrevented` (`vi.hoisted`) trace l'interception. Conséquence : le test existant « ouvert depuis Nouveau produit » attendait `activeElement ≠ bouton`, avec un body émulé. Il attend désormais `lastPrevented === false` ET le focus sur le bouton permanent.

Tests par vue :
- (a) liste rechargée avant la fermeture → `lastPrevented true`, focus = bouton permanent ;
- (a2) liste rechargée après la fermeture → d'abord focus = CTA, puis bouton permanent après le rerender ;
- (b) annulé, liste vide → `lastPrevented false`, focus = CTA ;
- (c) ouvert depuis le bouton permanent → `lastPrevented false`, focus = bouton. Déjà présent côté produits, ajouté côté catégories.

## Fichiers de contexte lus
- `docs/memory/sprints/sprint-90/specialists-reviewer-frontend-cycle2.md` : entier (findings 1-3).
- `docs/memory/sprints/sprint-90/review-fixes-done.md` : entier. Raisonnement `scrollWidth` du cycle 1 et limite « largeur réelle non vérifiée ».
- `.ai-env/context-packs/pit-frontend.md` :
  - l.137 PIT-S54-002 : préconditions de rendu runtime, pas grep ;
  - l.872 PIT-S74-008 : `rtk proxy` partout ; base prettier vérifiée par stdin avant `--write` sur la spec ;
  - l.993 PIT-S78-001 : aucune ancre de classes ajoutée ;
  - l.1160 PIT-S83-004 : `tsc` relancé après chaque tâche.
- Code lu :
  - `GreetingHeader.tsx` : entier. `h1` l.54 `break-words`, texte = `t(slot, { name })`, donc un seul nœud texte.
  - `public/locales/fr/dashboard.json:8-14` : « Bonjour {name}, … ».
  - `app/[locale]/(app)/dashboard/page.tsx:228,239` : `name={user.username}`.
  - `e2e/support/accounts.ts:150-200,342` : `deriveIdentity` (username = name, ≤ 20), `PROD`.
  - `e2e/sprint-84-section-titles.spec.ts:1-90,330-386`.
  - `ProductsListView.tsx`, `CategoriesView.tsx` et leurs tests : entiers.
  - `ProductDrawer.tsx:194-252` et `CategoryDrawer.tsx:193-242` : `onOpenChange(false)` juste après `mutateAsync`.
  - `hooks/useCreateProduct.ts:29-32` et `useCreateCategory.ts:24-25` : `invalidateQueries` non retourné.
  - `ui/dialog.tsx:32-44` (`duration-200`, `animate-out`), `ui/button.tsx:67` (`forwardRef`).
  - `playwright.config.ts:281-332` : projets.

## Tests joués
Depuis `<worktree>/frontend`, tout passe par `rtk proxy`.
- **Tâche 1** :
  - `tsc --noEmit` exit 0 ; `eslint` sur la spec exit 0.
  - `prettier --check` exit 1 ; base conforme (stdin sur la copie scratchpad, exit 0), donc écart imputable à mon diff. `--write`, puis exit 0 et eslint à nouveau exit 0.
  - Diff limité aux hunks l.365-430.
  - **Spec NON jouée** (Playwright interdit).
- **Tâche 2** :
  - `tsc` exit 0 · `eslint` 4 fichiers exit 0 · `prettier --check` 4 fichiers exit 0.
  - vitest `ProductsListView.test` + `CategoriesView.test` : **33/33** (20 + 13), exit 0.
- **Suite complète** (`rtk proxy npx vitest run`, après les 2 tâches) : **134 fichiers, 1651/1651, exit 0** (1646 au cycle 1 + 5 nouveaux). 5 blocs `stderr`, dans les mêmes fichiers non touchés qu'au cycle 1 : `AccountSection` ×3, `DeleteConfirmDialog.intl`, `exportService`.

Armement unitaire. Protocole : mutation perl sur le fichier de vue, vitest sur son test, restauration par `cp` depuis le scratchpad, vérifiée par `cmp`. Vert retrouvé : 20/20 et 13/13.

| Mutation | ProductsListView | CategoriesView |
|---|---|---|
| M1 : `preventDefault` + `focus` retirés (branche CTA déconnecté) | **1 failed**/20 : (a), exit 1 | **1 failed**/13 : (a), exit 1 |
| M2 : branche `isConnected` retirée (= comportement du cycle 1) | **2 failed**/20 : (b) + (a2), exit 1 | **2 failed**/13 : (b) + (a2), exit 1 |
| M3 : effet neutralisé (`void active`) | **1 failed**/20 : (a2), exit 1 | **1 failed**/13 : (a2), exit 1 |

M3 rouge prouve aussi que jsdom ramène `activeElement` sur `body` quand le nœud focalisé est retiré. Sinon (a2) passerait sans l'effet.

## Armement E2E à faire par le lead
Spec : `frontend/e2e/sprint-84-section-titles.spec.ts`, test « le salut reste dans l’écran quand le nom est un jeton insécable » (describe `#575 — salut à 375 px avec un nom insécable`).

1. **Run nominal** (pile du lead, `next start` :3000) :
   `cd <worktree>/frontend && rtk proxy npx playwright test e2e/sprint-84-section-titles.spec.ts --project=chromium -g "jeton insécable"`
   Attendu vert. Si rouge sur une précondition, lire le message :
   - « le nom … doit figurer dans le salut » : `PROD.username` ≠ `user.username` rendu ;
   - « largeur naturelle du jeton … » : jeton trop étroit, improbable avec 60 W.
2. **Mutation DOM**, temporaire et non committée : dans ce test, ajouter en PREMIÈRE ligne du callback `.evaluate((h1, name) => {` :
   `h1.classList.remove('break-words')`
3. Relancer la même commande. Attendu **rouge sur `jeton du salut qui déborde de son titre`** (`scrollWidth > clientWidth`), préconditions toujours vertes.
4. Retirer la ligne, puis `git diff --quiet -- frontend/e2e/sprint-84-section-titles.spec.ts`.

Le rouge de l'assertion de page n'est pas garanti : si un ancêtre coupe `overflow-x`, `document.documentElement.scrollWidth` n'inclut pas le débordement (non vérifié). L'assertion qui porte la preuve est celle du `h1`.

## Signaux mémoire
- `[MEMORY:pitfall] Context: review S90 cycle 2, sprint-84-section-titles. Une précondition anti-vacuité exprimée en caractères (« jeton ≥ 14 ») ne dit rien d'un débordement, qui dépend de pixels (police, taille, largeur de colonne) : le test restait vert sans break-words. Solution: injecter une donnée plus large que la colonne (nœud texte modifié en place, dans le même evaluate que la mesure), et asserter la précondition en pixels avec une règle nowrap enfant de l'élément (qui hérite de sa typographie). Prevention: toute précondition d'un test de mise en page s'exprime dans l'unité de l'assertion.`
- `[MEMORY:pitfall] Context: review S90 cycle 2, focus après drawer de création. useCreateProduct/useCreateCategory ne retournent pas la promesse d'invalidateQueries dans onSuccess : mutateAsync résout avant le rechargement de la liste, et le drawer se ferme aussitôt. Toute logique qui lit « l'état de la liste à la fermeture » est donc une course contre l'animation de sortie Radix (200 ms). Solution: décision à la fermeture (CTA connecté ?) + effet de rattrapage quand la liste devient non vide et que le focus est sur body. Prevention: ne pas supposer qu'un callback post-mutation voit les données rechargées.`
- `[MEMORY:pattern] Problem: tester sous jsdom qui détient le focus après un Dialog Radix mocké. Solution: le mock capture document.activeElement dans un useEffect à l'ouverture, rejoue onOpenChange(false) puis onCloseAutoFocus(Event annulable), refocalise l'élément capturé si l'événement n'est pas annulé, et expose defaultPrevented via vi.hoisted. Anti-pattern: mock qui ne restitue jamais le focus, où « pas d'interception » et « focus perdu » donnent le même body.`

## Recommandations suite
- `RECOMMAND_TEST_RUNNER: ne pas déléguer. Le lead joue sprint-84 « jeton insécable » puis l'arme par la mutation DOM ci-dessus [XS | e2e]`
- `RECOMMAND_FOLLOWUP: enchaînement réel Radix du focus (annulation → CTA ; création → bouton permanent, y compris rechargement lent) non vérifié en navigateur. Candidat E2E sur /products et /categories vides [S | a11y e2e]`
- `RECOMMAND_FOLLOWUP: onSuccess de useCreateProduct/useCreateCategory pourrait retourner la promesse d'invalidation (mutateAsync attendrait la liste rechargée), mais cela change la latence perçue du drawer : décision produit [XS | frontend]`

STATUS: COMPLETED
