# Sprint 47 — corrections review batch

commits: 1 seul — `sprint/47` HEAD, sujet
`:white_check_mark: test(sprint-47): corrections review batch — horloge simulée, sélecteur nth, décorateur story`
(le SHA n'est pas inscrit ici : ce fichier fait partie du commit, l'y écrire est circulaire —
`git log -1 --format=%H sprint/47`).

## Points traités

### [MAJEUR] `frontend/e2e/timeline-mobile.spec.ts:148-178` — attente sur horloge murale
**CORRIGÉ** — `page.clock.install()` + `resume()` avant navigation, puis
`page.clock.fastForward(600)` remplace `waitForTimeout(800)` : le franchissement du seuil
`LONG_PRESS_MS = 500` (`useTimelineMobileGestures.ts:21`) ne dépend plus de la charge machine.

`resume()` immédiatement après `install()` laisse l'app se charger en temps réel (pas de gel de
React / next-intl / debounce) ; `fastForward` reste opérant sur le `setTimeout` du hook.

**Contrôle négatif** effectué (non commité) : `fastForward(300)` → action sheet ABSENT, test rouge.
Preuve que l'horloge simulée pilote réellement le seuil et que l'assertion n'est pas vacante.
Aucun autre test du fichier n'est déstabilisé (l'horloge est installée sur ce seul test).

### [MINEUR] `frontend/e2e/timeline.spec.ts:216` — sélecteur positionnel
**CONSERVÉ `.nth(1)` + commentaire renforcé** — vérification faite dans
`node_modules/@radix-ui/react-select/dist/index.mjs` (`var ITEM_NAME = "SelectItem"`) : `value` est
DÉSTRUCTURÉ hors des props DOM (`const { __scopeSelect, value, disabled, textValue, ...itemProps }`)
et transite par le contexte de collection. Il n'existe donc AUCUN attribut `value` dans le DOM.
Commentaire enrichi : dépendance explicite à l'ordre déclaré dans
`frontend/src/components/EventEditForm.tsx:436-438` (WEEK / MONTH / YEAR).

### [MINEUR] `frontend/src/components/timeline/TimelineMobileLandscape.stories.tsx:59-66`
**CORRIGÉ** — commentaire ajouté au-dessus de `decorators` : Storybook COMPOSE meta + story
(cadre 320px imbriqué dans le 390px du meta, `withTimelineIntl` conservé). Aucun changement de
comportement.

## Preuves

Commande (stack locale, runbook `e2e-local-runbook.md`) :
```
cd frontend && SKIP_DELEGATION=1 PLAYWRIGHT_BASE_URL=http://localhost:3100 \
  npx playwright test timeline.spec.ts timeline-mobile.spec.ts --workers=1 --reporter=line
```

| Run | Portée | Résultat |
|---|---|---|
| combiné | `timeline.spec.ts` + `timeline-mobile.spec.ts` | **PASS (24) FAIL (0)** — 32.6 s |
| mobile #1 | `timeline-mobile.spec.ts` | **14 passed / 0 failed** (23.3 s) |
| mobile #2 | `timeline-mobile.spec.ts` | **14 passed / 0 failed** (20.3 s) |
| mobile #3 | `timeline-mobile.spec.ts` | **14 passed / 0 failed** (20.2 s) |

`npm run build-storybook` : **Storybook build completed successfully** (story touchée).

## Incident d'environnement (hors périmètre code)

Au démarrage : le `next dev` :3100 déjà lancé renvoyait **500 sur `/fr/register` et `/fr/login`**
→ `auth.setup.ts:47` rouge, aucune spec ne tournait. Redémarrage du serveur → 200.

Deux occurrences intermittentes reproduites ensuite dans le log dev :
- `⨯ SyntaxError: Unexpected end of JSON input { page: '/fr/register' }`
- `⨯ [Error [InvariantError]: Invariant: Expected clientReferenceManifest to be defined. This is a bug in Next.js.]`

Bug de manifeste du **dev server Next 15.5.22** (recompilation à chaud), pas du code testé ni des
specs : il frappe le projet `setup` avant toute ligne de spec, et la CI construit en production.
Deux runs rouges observés pendant la phase d'édition ont cette seule cause ; les 3 runs finaux
consécutifs, sans édition concurrente, sont verts.

## Recommandations suite

RECOMMAND_FOLLOWUP: `auth.setup.ts` n'a aucun retry sur le rendu de `/fr/register` (seulement sur
le 429 register). Un seul 500 transitoire du serveur front fait tomber tout le run. Ajouter un
retry court (2 tentatives, `page.reload()`) sur `expect(getByTestId('register-form'))` rendrait la
boucle locale insensible au bug de manifeste dev observé ci-dessus. Non fait ici : hors périmètre
des 3 points de review.

STATUS: COMPLETED
