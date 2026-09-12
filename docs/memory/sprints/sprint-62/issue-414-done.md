# Issue #414 — done

**[BUG] Les options de `Select` n'obtiennent jamais `:focus-visible` sous Firefox**
Sprint 62 · vague 2 · `size:M` · `priority:P1` · `epic:design` · frontend

**Commit :** `97f92e8` (3 fichiers, +536 / -2) — vérifié par le lead via `rtk proxy git show --stat`
(RTK avait avalé la sortie du `git commit` du subagent, rendu `ok sprint/`).

## VERDICT : INFIRMÉ

Le défaut rapporté **n'existe pas**. Mesuré au pixel peint, **Firefox 153 et Chromium**, clavier
seul, clair et sombre :

| Montage | `:focus-visible` | Contour vs fond popover | Surface `accent-soft` seule |
|---|---|---|---|
| `PreferencesSection` / `pref-language` clair | `true`, activeElement = `<div role=option>` | `#0e5fc4`/`#ffffff` = **6,08:1** | `#dbe9fc` = 1,23:1 |
| `PreferencesSection` / `pref-language` sombre | `true` | `#4d9bff`/`#131519` = **6,48:1** | `#16263a` = 1,19:1 |
| `ProductDrawer` / `product-category-trigger` | `true` | **6,08:1** / **6,48:1** | 1,23:1 / 1,19:1 |
| `NewEventDrawer` | `true`, contour 2px déclaré | **pixel non mesurable** (défaut z-index, ci-dessous) | — |

**Les chiffres de #383 sont reproduits exactement** (1,23:1 / 1,19:1) — mais ils mesurent la
**surface de survol**, pas l'indicateur de focus. L'indicateur est le contour `@layer base`, et il
**est** peint : le dump brut montre la bande `--color-focus` à +3/+4 px, entre le gap
d'`outline-offset` (+1/+2) et le fond du popover.

L'issue décrivait donc un symptôme réel en l'attribuant au mauvais mécanisme.

**Aucun code applicatif n'a été touché.** Ajouter un indicateur `data-[highlighted]:` aurait
**dédoublé le motif** en violation de `DEC-S58-001`, pour corriger un défaut inexistant. Toucher
`--color-accent-soft` était interdit. Le livrable est la spec de verdict + le projet `firefox`.

**Garde-fou bidirectionnel** dans la spec : elle rougit si le contour disparaît **et** si la surface
dépasse 3:1 (signe qu'un token a été modifié).

## Méthode de mesure

`page.screenshot({clip})` → `createImageBitmap` → `getImageData` **dans la page** (sonde
`e2e/support/pixel.ts` livrée par #415), côté `top`, 21 échantillons, agrégation par mode,
**unanimité 100 %** partout.

Offsets fixés par **dump brut imprimé** : `+3` = centre du trait (conséquence arithmétique de
`outline: 2px` + `offset: 2px`), `+1` = fond popover adjacent. **Pas `+5`/`+6`** : le dump
`ProductDrawer` clair y montre `#16181d`, la **bordure du popover** — c'est exactement le piège à
16,3:1 du Sprint 58 (`PIT-S58-001`), évité par la lecture du profil et non par une heuristique.

## Harnais

Projet `firefox` ajouté à `frontend/playwright.config.ts` :
`testMatch: /sprint-62-select-focus-indicator\.spec\.ts/`, `dependencies: ['setup']`.

**Confirmé par `playwright test --list`** : firefox = **13 tests** (5 setup + 8), chromium = **208**.
Les E2E existantes ne voient **jamais** Gecko. WebKit non ajouté (hors périmètre, décision dev).

### Fichier hors périmètre initial, conservé après revue du lead

`.github/workflows/ci.yml` : `npx playwright install --with-deps chromium` →
`chromium firefox`. **Non facultatif** : `npm run test:e2e` lance **tous** les projets de
`playwright.config.ts` ; sans le navigateur, le projet `firefox` échoue au lancement et le job `e2e`
— **check requis** sur ce dépôt — rougit. Le correctif de harnais aurait été incomplet et aurait
bloqué la PR. La justification est inscrite dans le workflow lui-même, avec un renvoi au commentaire
du projet dans `playwright.config.ts` avant tout élargissement du `testMatch`.

## Tests (exit codes lus)

- firefox : **13 passed**, exit 0
- chromium ciblé : **13 passed**, exit 0
- **chromium complet : 200 passed / 8 skipped / 0 failed**, exit 0 — **confirmé indépendamment**
  lors de l'audit final

  > **Correction apportée à l'audit.** L'auteur de #414 décrivait les 8 skips comme des conditionnels
  > `auth-guard` / `auth-signature`. **Inexact** : `auth-guard.spec.ts` ne skippe **aucun** test (ses
  > 13 passent). Le décompte réel est **7 + 1** :
  > - `auth-signature.spec.ts` ×7 (l.135/157/177/206/226/247/293) —
  >   `test.skip(!SIGNATURE_VERIFICATION_CONFIGURED)`, `AUTH_JWT_PUBLIC_KEY` absente en local
  > - `settings-profile.spec.ts:36` (« upload avatar crop → confirm, puis suppression ») — un
  >   **`test.fixme`**, 401 multipart sur le proxy Next, **sans rapport avec RS256**
- vitest : **950 passed / 97 fichiers** · eslint : 0 · `tsc --noEmit` : 0
- Run complet démarré **après** les 4 commits de code du sprint : aucun écart à leur attribuer

## Non vérifié

- **WebKit** — hors périmètre par décision dev
- **Firefox 151** — la mesure porte sur **153.0**, le build de Playwright. #383 mesurait 151, et
  cette version ne peut pas être épinglée avec ce harnais : **une divergence d'heuristique entre les
  deux n'est pas exclue**. C'est la réserve la plus sérieuse sur ce verdict.
- `forced-colors: active` non testé
- `next build` non lancé (worktree partagé)
- Le pixel de `NewEventDrawer` reste non mesuré (bloqué par le défaut de z-index)

## Défaut distinct découvert en cours de mesure (non corrigé)

**Le popover du Select n'est jamais peint dans `NewEventDrawer`.**

- `frontend/src/components/ui/select.tsx:92` — `SelectContent` porte `z-50`, soit `--z-popover`
- `frontend/src/styles/ds/tokens/spacing.css:62,64` — `--z-popover: 50`, `--z-modal: 70`
- `frontend/src/styles/ds/components/timeline.css:271` — `.mt-drawer { z-index: var(--z-modal) }`.
  **`.mt-sheet` (l.406, variante mobile) et `.mt-actionsheet` (l.432) portent le même token** → même
  exposition
- `NewEventDrawer.tsx:141` rend le drawer **en ligne**, non portalisé : son `z` gagne quel que soit
  l'ordre DOM
- Profil de pixels sous l'option surlignée : **100 % panneau du drawer sur les 15 offsets**

Sur les **6 consommateurs** de `ui/select` (`PreferencesSection`, `ProductDrawer`,
`ProductsListView`, `NewEventDrawer`, `ExportDataFlow`, `DeleteConfirmDialog`), **seul
`NewEventDrawer` est affecté**. `ProductDrawer` et `DeleteConfirmDialog` y échappent : leur `Dialog`
Radix est **portalisé** au même palier de `z`, et le portail du Select — ajouté plus tard dans
`body` — le surmonte.

**Non corrigé** (remonter l'échelle de z du DS touche les 6 consommateurs), mais **figé en marqueur
exécutable** : `frontend/e2e/sprint-62-select-focus-indicator.spec.ts:487`, deux `test.fail()`
(clair + sombre) dont le message nomme les valeurs de z. **Il rougira le jour de la correction — il
faudra alors retirer l'annotation, pas la contourner.**

Sévérité proposée : **P1** — le Select est inutilisable, au clavier comme à la souris, dans le
drawer de création d'événement, desktop **et** mobile.

## Signaux mémoire

**[MEMORY:pitfall]** `document.elementsFromPoint()` **n'est pas une preuve de peinture** —
corollaire de `PIT-S58-001` côté hit-testing. Une couche Radix ouverte pose
`body { pointer-events: none }` : tout le reste sort du test de survol et l'élément visé remonte en
tête de pile **alors qu'il est recouvert**. Ici, la preuve côté DOM se lisait comme une
*confirmation* que le popover était peint, tandis que le pixel montrait 100 % de panneau de drawer.
Hit-testing et peinture divergent ; seule la lecture de pixel tranche.
La leçon est celle de `PIT-S58-001` une couche plus bas : `getComputedStyle` donne la couleur
déclarée, jamais la peinte ; `elementsFromPoint` donne la pile hit-testée, jamais la peinte.

**[MEMORY:bug]** Popover invisible dans `NewEventDrawer` — voir la section ci-dessus pour le dossier
complet (fichiers, lignes, tokens, consommateurs, marqueur exécutable).

**[MEMORY:decision]** Un **verdict négatif proprement établi est un livrable**. Rien n'a été codé, et
c'était la bonne conclusion.

## Recommandations suite

- **RECOMMAND_FOLLOWUP** — issue z-index `NewEventDrawer`, sévérité **P1**, dossier complet ci-dessus.
- **Pas de RECOMMAND_TEST_RUNNER** : suites exécutées, exit codes lus.
- **Pas de RECOMMAND_DB_EXPERT / SECURITY** : périmètre CSS / E2E, zéro BR, zéro endpoint.
- **Piège pour la clôture** : les `test.fail()` rougiront à la correction du défaut de z-index — il
  faudra **retirer l'annotation**, pas la contourner.

## Comment les `test.fail()` remontent dans les compteurs (vérifié à l'audit)

Les deux `test.fail()` échouent bien comme attendu. Le reporter `list` les affiche `✘` — **c'est
cosmétique** : ils sont comptés dans **`passed`**, jamais dans `failed` ni `skipped`, et l'exit reste
0. Donc chromium **200 = 198 vrais verts + 2 échecs attendus** ; firefox **13 = 11 + 2**.
**Un `✘` dans le log de la PR n'est pas un rouge.**

STATUS: COMPLETED
