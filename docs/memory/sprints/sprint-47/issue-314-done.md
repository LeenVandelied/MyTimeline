# Issue #314 — [E2E] Couvrir les 11 testids du drawer de création + de l'écran /timeline

commits: 7a206d7

## resume

Objectif : écrire la passe E2E manquante sur les 11 `data-testid` livrés au Sprint 44
(#300/#301, PR #313) qu'aucune spec Playwright ne référençait. Issue de COUVERTURE :
aucun composant applicatif modifié.

Fichier créé (unique, comme prescrit) : `frontend/e2e/timeline.spec.ts` — 8 tests,
structurés en 2 `test.describe` (`#314 /timeline — écran (états)` et
`#314 Drawer de création d'événement (shell)`) pour que #304 y ajoute son bloc en
vague 2 sans réécrire l'existant.

`frontend/e2e/support/products.ts` **non modifié** : `seedCategory`/`seedProduct`/
`getUserId`/`unique` suffisaient. Zéro risque de collision avec l'agent #205.

Parcours couverts :
1. Ouverture du drawer depuis `shell-sidebar-new-event-button` → sélection produit →
   titre + durée + récurrence → `POST /api/events` 201 → drawer démonté → la pastille
   apparaît dans la frise (`[data-testid="timeline-event"][data-event-title="…"]`) +
   persistance assertée côté serveur via `GET .../events`.
2. Garde « produit requis » (BR-EVE-002) : erreur inline `shell-new-event-drawer-product-error`,
   **zéro** `POST /api/events` (compteur sur `page.on('request')`), drawer resté ouvert,
   puis effacement de l'erreur à la sélection d'un produit.
3. Écran `/timeline` : rempli / vide / en chargement.

Fichiers clés lus : `frontend/app/[locale]/(app)/timeline/page.tsx`,
`frontend/src/components/events/NewEventDrawer.tsx`,
`frontend/src/components/events/EventPreviewTimeline.tsx` (porte réellement
`event-form-preview-recurrence` depuis #315, plus `EventEditForm.tsx`),
`frontend/src/components/layout/AppShell.tsx`, `frontend/e2e/support/{accounts,auth,products}.ts`.

### Pièges rencontrés / décisions

- **États `empty` et `loading` inatteignables en l'état.** Le compte E2E `PROD` est
  alimenté par les autres specs du run (ordre non contractuel) → « aucun produit » ne
  peut pas être obtenu sans purge destructive et racée ; et `isLoading` dure quelques ms
  contre un backend local. Ces 2 états (4 testids : `timeline-data-loading`,
  `shell-new-event-drawer-loading`, `shell-new-event-drawer-empty`, `timeline-empty`)
  sont donc pilotés par un stub `page.route` de `GET /api/users/{id}/products`. Tout le
  reste (création, garde produit, écran rempli) tourne contre le VRAI backend.
- **Stub de chargement SUSPENDU, pas temporisé.** Première version : `setTimeout(2000)`
  dans le handler → verte en local mais flake en puissance en CI (si l'hydratation
  dépasse le délai, l'état de chargement a disparu avant l'assertion). Remplacé par une
  réponse retenue derrière une promesse que le test libère explicitement → déterministe,
  et 2 tests passés de 3,1 s à ~0,9 s.
- **Glob `*` de Playwright ambigu sur les `/`** : `**/api/users/*/products` risquait de
  capter `/products/{id}/events`. Remplacé par une regex `/\/api\/users\/[^/]+\/products(\?.*)?$/`.
- **Options Radix `<Select>`** : rendues en portail, sans `data-testid` forwardable.
  Produit ciblé par `getByRole('option', { name })` (nom = DONNÉE seedée, pas de l'i18n) ;
  unité de récurrence par INDEX (`getByRole('listbox').getByRole('option').nth(1)` = MONTH)
  car son libellé est i18n — interdit comme sélecteur.
- **Garde produit : le titre doit être rempli.** Sans titre, RHF bloque en amont et le
  `handleSubmit` du drawer (qui porte la garde `productId`) n'est jamais atteint →
  `shell-new-event-drawer-product-error` n'apparaîtrait pas. Commenté dans la spec.
- **PIT-S44-001** (durée requise même en `single`) : non déclenché, le parcours reste sur
  `type='duration'` (défaut du drawer). Le chemin neutre `single` est couvert par les
  tests unitaires de `toEventCreationPayload`.
- `POST /api/events` renvoie **201** (contrat #165), pas 200 — asserté strictement.

## preuve d'exécution locale

Boucle locale du runbook (`PLAYWRIGHT_BASE_URL=http://localhost:3100`, `--workers=1`,
`SKIP_DELEGATION=1`), backend `:8080` sur `eventmanager_e2e` :

```
PASS (13) FAIL (0)     # 5 tests du projet `setup` + 8 tests de timeline.spec.ts
13 passed (15.2s)
```

Détail (reporter `list`, run final après le refactor du stub suspendu) :

```
✓ 6  timeline.spec.ts › écran (états) › écran rempli : timeline-screen + timeline-host montés (765ms)
✓ 7  timeline.spec.ts › écran (états) › écran vide (aucun produit) : timeline-empty, pas de host (781ms)
✓ 8  timeline.spec.ts › écran (états) › chargement des données : timeline-data-loading puis état terminal (843ms)
✓ 9  timeline.spec.ts › Drawer › création complète : produit + titre + durée + récurrence → event dans la frise (1.8s)
✓ 10 timeline.spec.ts › Drawer › garde produit requis : erreur inline, aucun POST /api/events (1.3s)
✓ 11 timeline.spec.ts › Drawer › fermeture : le bouton close démonte drawer + overlay (1.1s)
✓ 12 timeline.spec.ts › Drawer › sans produit : message empty, ni sélecteur ni formulaire (935ms)
✓ 13 timeline.spec.ts › Drawer › chargement des produits : shell-new-event-drawer-loading (1.0s)
```

Également vert : `npx tsc --noEmit` (0 erreur), `eslint` (0 issue), `prettier --check`.

**NON vérifié** : la suite complète (consigne : ne lancer que ma spec) et le job CI `e2e`
sur `:3000`. Les 2 stubs sont indépendants de l'environnement, mais la confirmation CI
reste due.

## couverture (11 testids)

| # | testid | couvert | où / comment |
|---|--------|:---:|---|
| 1 | `shell-new-event-drawer` | OUI | `toBeVisible` dans `openNewEventDrawer` (4 tests) + `toHaveCount(0)` après close/succès |
| 2 | `shell-new-event-drawer-overlay` | OUI | `toBeVisible` (création, fermeture) + démontage asserté |
| 3 | `shell-new-event-drawer-close` | OUI | test « fermeture » : cliqué, puis drawer+overlay à 0 |
| 4 | `shell-new-event-drawer-loading` | OUI | test dédié, stub suspendu → `toBeVisible` puis disparition |
| 5 | `shell-new-event-drawer-empty` | OUI | test « sans produit » (stub `[]`) + état terminal du test loading |
| 6 | `shell-new-event-drawer-product-trigger` | OUI | cliqué (création, garde) + `toHaveCount(0)` en état empty |
| 7 | `shell-new-event-drawer-product-error` | OUI | test « garde produit requis » : visible, puis effacé au choix du produit |
| 8 | `event-form-preview-recurrence` | OUI | test de création, après cochage récurrence + choix MONTH (aperçu debounce 150 ms) |
| 9 | `timeline-screen` | OUI | `gotoTimeline` (5 tests) + test de chargement |
| 10 | `timeline-host` | OUI | test « écran rempli » (visible) + `toHaveCount(0)` en état vide |
| 11 | `timeline-data-loading` | OUI | test dédié, stub suspendu |

Bonus : `timeline-empty` (déjà couvert ailleurs) ré-asserté par symétrie.
Hors périmètre comme prescrit : `event-form-end-date`, `event-form-end-error`,
`event-form-recurrence-end-date`, `event-form-archived-toggle` (préexistants S44).

## [MEMORY:*]

[MEMORY:pattern] Problem: asserter un état de chargement E2E (`isLoading`) est un flake
garanti — quelques ms contre un backend local, et un `setTimeout(N)` dans le handler
`page.route` casse dès que l'hydratation dépasse N en CI.
Solution: stub SUSPENDU — le handler `await` une promesse que le test résout après avoir
asserté l'état de chargement (`const release = await stubGated(page); … release()`).
L'état est stable tant que le test ne libère pas. Anti-pattern: temporisation fixe
(`setTimeout`) dans le handler de route, ou `waitForTimeout` côté test.

[MEMORY:pitfall] Context: les états « liste vide » sont inatteignables sur les comptes E2E
fixes (`accounts.ts`) — ils sont alimentés par les autres specs du run, dont l'ordre n'est
pas un contrat. Solution: `page.route` sur le GET de listing, filtré sur la méthode
(`route.continue()` pour les écritures), le reste de la spec restant full-stack.
Prevention: ne PAS tenter de vider le compte (destructif + racé), ne PAS supposer que
`PROD` est vierge au début d'un fichier de spec.

[MEMORY:pitfall] Context: `page.route('**/api/users/*/products')` — le glob `*` de
Playwright ne garantit pas de ne pas franchir les `/`, donc risque de capter
`/api/users/{id}/products/{pid}/events`. Solution: passer une RegExp explicite
(`/\/api\/users\/[^/]+\/products(\?.*)?$/`). Prevention: préférer la regex au glob dès
qu'un segment frère plus profond existe.

## recommandations suite

RECOMMAND_FOLLOWUP: aucun testid manquant BLOQUANT rencontré — les 11 étaient présents et
atteignables. Deux frictions mineures, non bloquantes, à arbitrer hors sprint :
1. Les `SelectItem` Radix (produit du drawer, unité de récurrence de `EventEditForm`)
   n'exposent aucun `data-testid` → les specs retombent sur `role="option"` par nom de
   donnée ou par INDEX. Un ciblage par index casse silencieusement si l'ordre des unités
   change. Poser des testids `…-option-<value>` (comme `product-category-option-*` le fait
   déjà côté produits) supprimerait cette fragilité.
2. `NewEventDrawer` n'expose pas de testid sur le corps du formulaire monté ; la spec
   s'appuie sur `event-form` (posé par `EventEditForm`). Suffisant aujourd'hui, à noter si
   le drawer accueille un jour un second formulaire.

Pas de `RECOMMAND_TEST_RUNNER` : la spec est légère (7 tests, ~9 s) et a été exécutée en
local, un run isolé suffit.
Pas de `RECOMMAND_DB_EXPERT` ni de `RECOMMAND_SECURITY` : aucun schéma ni surface d'auth
touchés (fichier de test uniquement).
Pas de `RECOMMAND_REVIEWER` bloquant, mais la spec touche un fichier que **#304 va étendre
en vague 2** : lui signaler la convention de structure (un `test.describe` par thème,
helpers `gotoTimeline`/`openNewEventDrawer`/`stubProductsList*` déjà factorisés en tête de
fichier, à réutiliser plutôt qu'à dupliquer).

STATUS: COMPLETED
