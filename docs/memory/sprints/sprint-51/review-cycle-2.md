# Review PR #367 — cycle 2

> `/review-pr 367` lancé après l'ouverture de la PR. Le cycle 1 (`reviewer` batch, Phase 7 du sprint)
> avait relu le diff au commit `1f00995`. **Trois commits de code lui étaient postérieurs et n'avaient
> jamais été relus** — dont le correctif E2E écrit par le lead.

**Mode :** TEAM (4 183 lignes brutes, dont les 4 briefings de 43-45 Ko ; **1 308 insertions /
348 suppressions de code réel** sur 17 fichiers). Mono-domaine frontend, aucun backend, aucune
migration, aucun auth.

**Composition :** 3 axes différenciés plutôt qu'un `reviewer` générique qui aurait rejoué le cycle 1 —
`reviewer` (code non revu + vérification des correctifs), `playwright-reviewer` (specs E2E),
`ui-design` (a11y + design system).

## Le résultat marquant : deux reviewers ont trouvé indépendamment un défaut dans le correctif du lead

Le lead avait corrigé la veille un test E2E auto-contradictoire (#328) en y ajoutant un garde-fou.
**Ce garde-fou mesurait le mauvais axe.**

| | Valeur |
|---|---|
| `clientWidth` portrait | **340** (390 − 50 de chrome de lane) |
| `clientWidth` paysage | **794** (844 − 50) |
| Garde vert ⟺ | `railWidth > 340` |
| Assertion protégée exige | `railWidth > 794` |
| **Fenêtre morte** | **`340 < railWidth ≤ 794`** — garde vert, assertion rouge |

C'est exactement la pathologie que le garde prétendait éliminer. Non atteignable aujourd'hui
(2 crans de zoom → 96 px/j → rail ≥ 5 856 px), mais **l'invariant n'était pas établi par le test**.

Second défaut du même correctif : **les 2 clics de zoom n'étaient pas attendus** (aucune assertion sur
`timeline-zoom-level`, contrairement au test voisin ligne 211). Chemin de flake établi : si le commit
React du 2ᵉ clic atterrit après `setViewportSize`, le paysage mesure l'échelle `month` → rail 732 vs
794 → `maxScroll = 0` → échec. Seule la latence des allers-retours Playwright l'évitait.

## Findings et suites

### Corrigés — commit `e327d67`
| # | Sévérité | Objet | Correctif |
|---|---|---|---|
| 1 | MAJEUR | Garde-fou sur le mauvais axe | `scrollWidth > LANDSCAPE_SHORT.width` (844) avant rotation |
| 2 | MAJEUR | Clics de zoom non attendus | `toHaveText('Jour')` — libellé **lu** dans les locales, pas deviné |
| 3 | MINEUR | Commentaire du lead inexact | `61 j` et `5 856 px` reformulés en **minorants** ; contradiction conditionnée au volume |
| 4 | MINEUR | `useRef` alloue une `Map` à chaque rendu | init paresseuse `useRef<T\|null>(null)` |
| 5 | MINEUR | Mock `requestFullscreen` non restauré | descripteurs capturés + `afterEach` avec repli `Reflect.deleteProperty` |
| 6 | MINEUR | Limite de la branche « fraction » non documentée | documentée |

**Réserve assumée sur le correctif 1 :** le nouveau garde est **suffisant mais pas nécessaire** — un
rail entre 794 et 844 px le ferait échouer alors que le test resterait satisfiable. Choix
conservateur : pas de faux vert, au prix d'un faux rouge théorique dans une fenêtre de 50 px
inatteignable en pratique.

### Statut des MAJEURS du cycle 1
- **MAJEUR 1 (clé de cache de zoom) — RÉSOLU.** La suspicion du lead sur le **2ᵉ site d'appel**
  (`eventsByResource`, laissé sur `${dayWidth}` seul) est **levée** : `scaleEventPositions` ne
  consomme que `indexed` + `dayWidth`, jamais `zoom.level` — deux niveaux à même largeur produiraient
  une sortie **identique**, donc partager l'entrée est un gain d'identité, pas une contamination.
  Asymétrie justifiée avec `buildRulerTicks`, qui lit `MAJOR_TICK_UNIT[level]` et exige donc bien la
  clé composite. `buildWeekendSegments` vérifié aussi : hors cache, `useMemo` avec `zoom.level` en
  dépendance → sain.
- **MAJEUR 2 (mutation de refs pendant le rendu) — non résolu, assumé, et NON aggravé** par
  `8e5e2a8` (mêmes sites d'écriture, seule la forme stockée change : `T` → `{ value: T }`).

### Un MINEUR du cycle 1 clos **à l'inverse** de sa recommandation
Le cycle 1 suggérait de retirer `aria-hidden`, jugé redondant avec `role="presentation"`.
**`ui-design` tranche l'inverse : garder les deux.** `aria-hidden="true"` retire le nœud **et son
sous-arbre** de l'arbre d'accessibilité ; `role="presentation"` neutralise le rôle implicite **au
niveau structurel**, ce que certaines versions d'axe-core évaluent **avant** de filtrer les nœuds
`aria-hidden` — d'où le défaut initial que `aria-hidden` seul n'éteignait pas. Retirer `aria-hidden`
serait cosmétique et réduirait la robustesse ; retirer `role="presentation"` régresserait.

### Confirmations (déjà connus, re-vérifiés sur le code)
- **4 cales a11y mobiles non corrigées** : `TimelineMobilePortrait.tsx:203,281` et
  `TimelineMobileLandscape.tsx:216,294`, toutes sous un `role="list"` parent (lignes 200 et 213).
  Le correctif #351 n'a couvert que **2 cales sur 6**. *Traité par une session séparée — non touché ici.*
- **Aucun outil a11y** dans `frontend/package.json` (ni axe, ni pa11y, ni lighthouse, ni jest-axe) →
  critère d'acceptation de #351 non vérifiable. `grep timeline-lane-spacer` ne retourne que les
  3 composants : **`role="presentation"` n'est asserté par aucun test**.
- `aria-setsize` / `aria-posinset` **intacts** après la réécriture de #349 : `aria-setsize={resList.length}`
  porte bien sur la catégorie complète, `windowEvents` conserve l'index d'origine.
- Aucun token DS enfreint : les seuls hex du diff sont des fixtures de test ; les `style` inline sont
  purement géométriques, conformes au pattern de virtualisation existant.
- Les **24 `data-testid`** utilisés par `timeline-mobile.spec.ts` existent tous : aucun perdu dans la
  réécriture de `TimelineView.tsx` (879 → 1113 lignes).

## Nouveaux follow-ups issus de ce cycle

- **`auth-signature.spec.ts` : les 8 tests `skipped` sont TOUS conditionnés à `AUTH_JWT_PUBLIC_KEY` /
  `E2E_JWT_PRIVATE_KEY`.** En CI (mode dégradé), les deux `describe` RS256 sautent entièrement → **la
  vérification de signature durcie au Sprint 50 n'est couverte par aucun test en CI** ; seul
  `auth-guard.spec.ts` (présence de cookie) l'est. Trou silencieux, à rendre bruyant (job dédié avec
  clés, ou `expect(SIGNATURE_VERIFICATION_CONFIGURED).toBe(true)` en CI). [M | devops] — **hors
  périmètre du sprint, mais c'est le plus important de la liste**
- **`@axe-core/playwright`** pour tenir le critère a11y de #351 : Playwright 1.61 est déjà en devDep,
  `test:e2e` déjà câblé → 1 dépendance + ≈ 15 lignes de helper `expectNoA11yViolations(page)`,
  appliqué à la route timeline avec un jeu de données dépassant `LANE_VIRTUALIZATION_MIN_ROWS` pour
  que les cales soient réellement montées. *(`jest-axe` en Vitest serait inutile : jsdom a
  `clientWidth = 0` → cales jamais rendues.)* [S | frontend]
- **Même fuite de mock Fullscreen dans `TimelineView.test.tsx:23-24`** — non corrigée, un seul fichier
  visé par la correction 5. [XS | frontend]
- **Couplage au volume du compte partagé `PROD`** : `seededEvent(...).toHaveCount(1)`
  (`timeline-mobile.spec.ts:129,328`) dépend de la virtualisation verticale
  (`LANE_VIRTUALIZATION_MIN_ROWS = 60`). `PROD` gagne ~1 lane par test sur 6 specs + retries ; à
  ~30 lanes aujourd'hui la limite n'est pas franchie, mais **la précondition n'est ni posée ni
  assertée**. [S | frontend]
- **`translate` à identité gelée à vie** (`TimelineView.tsx:388-390`) : `aria-label` périmés sur les
  lanes mémoïsées si le catalogue change à `locale` constante (HMR dev, livraison Crowdin à chaud).
  Portée étroite — `locale` est passé en prop et invalide le memo. [XS | frontend]

## Non vérifié

- **La suite E2E complète n'a pas été rejouée localement** — seul `timeline-mobile.spec.ts` (15/15).
  Les autres specs partagent le compte `PROD` ; la non-régression de leur côté repose sur la CI.
- Aucun reviewer n'a ouvert de navigateur réel : le rendu effectif des cales `role="presentation"` et
  la validation « rien ne bouge à l'écran » à la rotation restent non observés. jsdom en est
  incapable (`clientWidth = 0` → hauteur de cale 0 → cales jamais montées).
- `eslint` non exécuté sur le commit de correction (seuls `test-quiet` + `typecheck` l'ont été).
- La valeur exacte de `clientWidth` portrait/paysage **en CI** : le calcul de la fenêtre morte
  s'appuie sur les 340/794 documentés dans le code. Si elle diffère, la fenêtre se déplace mais ne
  disparaît pas.

STATUS: COMPLETED
