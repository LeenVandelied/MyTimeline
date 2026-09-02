# Issue #451 — Au zoom arrière, la frise saute loin d'aujourd'hui (Sprint 65)

## 1. Vérification du constat du lead — CORRIGÉE SUR UN POINT

| Affirmation du briefing | Verdict | Preuve |
|---|---|---|
| Le correctif `3dcc5ea` est dans `dev` et la re-projection d'ancre est armée | **VRAI** | `TimelineView.tsx:894-913` — `useLayoutEffect([dayWidth])`, garde `dayWidth === lastDayWidthRef.current`, `el.scrollTo({left: anchorDaysRef.current * dayWidth, behavior:'instant'})`, relecture du clamp |
| Le corps de l'issue (`scrollToToday()` en `useEffect(…, [])`, l. 795-820) est périmé | **VRAI** | ce code n'existe plus ; l'effet de centrage est désormais gardé sur `[rangeStart, totalDays]` |
| « Aucun test n'épingle le cas mesuré » / « la spec la plus proche est `timeline.spec.ts:977` » | **FAUX** | `3dcc5ea` a livré **134 lignes de spec E2E** : `timeline.spec.ts:1442` `#449 /timeline — le zoom arrière conserve la zone temporelle`, à fixture stubée, avec contrôle négatif documenté |

**Contrôle négatif rejoué sur la spec #449 existante** (neutralisation de l'effet `[dayWidth]`) :
elle rougit sur `scrollLeft=26691` pour un maximum de `26691` — chiffre identique à celui du
message de commit de `3dcc5ea`. Elle est donc réellement sensible ; le correctif est **complet**.

## 2. Ce qui manquait vraiment (et ce que j'ai livré)

La spec #449 ne prouve QU'UNE chose : la frise n'est pas **rabattue au bord droit**. Son oracle
géométrique (`scrollLeft < scrollWidth - clientWidth`) et son oracle de montage (la pastille
d'AUJOURD'HUI) resteraient verts sous deux « correctifs » faux :

- un simple `scrollLeft = Math.min(scrollLeft, maxScroll)` — rabattement évité, zone regardée
  quand même perdue ;
- un **recentrage sur aujourd'hui** à chaque changement d'échelle — la pastille du jour, seul
  oracle de #449, resterait montée par construction.

Nouvelle spec `timeline.spec.ts` — `#451 /timeline — le zoom arrière conserve le JOUR regardé,
pas seulement le bord` :

- fixture stubée dédiée (`stubEarlyRangeFixture`) : 1 produit, 3 events, étendue 5501 j,
  **oracle au jour 300** (proche du DÉBUT de l'étendue, à ~4700 j d'aujourd'hui) ; aucun event au
  jour 5000, la pastille du jour ne peut pas se substituer à l'oracle ;
- la vue est amenée au jour 300 par **10 × `]`** — contrôle produit réel, donc **non-régression
  `[` / `]` incluse** ;
- **prémisse explicite** : `before.scrollLeft` (3600 px) < `after.maxScroll` (26691 px) → **aucun
  rabattement possible**. Ce que la spec éprouve est l'ANCRAGE, pas le clamp — c'est ce qui la rend
  complémentaire de #449 et non redondante ;
- oracles, dans cet ordre : (a) la pastille du jour 300 est toujours **montée** ; (b) `scrollLeft`
  passe de `300 × 12` à `300 × 5` ; (c) **#392** — l'écart pastille ↔ bord du conteneur vaut
  `LANE_TRACK_OFFSET_PX = 168 px` **avant ET après** le zoom (repère PISTE : la pastille affleure
  l'en-tête sticky, elle ne passe pas dessous).

## 3. Preuve de sensibilité (les deux observations, réellement jouées)

Neutralisation : `if (1) return` inséré juste après `lastDayWidthRef.current = dayWidth` dans le
`useLayoutEffect([dayWidth])` — le seul effet qui re-projette l'ancre.

- **ROUGE sans le correctif** — `Expected: 1 / Received: 0` sur
  `locator('[data-testid="timeline-event"][data-event-title="Early Oracle …"]')`, `14 × locator
  resolved to 0 elements`. La prémisse « pas de rabattement » était **passée juste avant** : c'est
  bien l'ancrage qui manque, pas le clamp. La spec #449 rougit en parallèle sur `26691 / 26691`.
- **VERT avec le correctif** — restauration du fichier (`git diff` vide sur `TimelineView.tsx`),
  puis `timeline.spec.ts` complet : **34 passed / 0 failed en 66 s** (5 `setup` + 29 specs), dont
  les 3 specs #392 (l. 1246 / 1283 / 1324) et la nouvelle spec #451.

## 4. Non-régressions vérifiées

- **#392** : (a) les 3 specs #392 existantes vertes dans le run complet ci-dessus ; (b) assertion
  géométrique NEUVE dans la spec #451 — 168 px avant et après le zoom arrière ; (c) le code
  `TimelineView.tsx:869-879` conserve le commentaire et le repère PISTE, non touché (diff nul).
- **Raccourcis `T` / `[` / `]`** : `[` et `]` sont exercés **en E2E** par la nouvelle spec (10 × `]`
  → `scrollLeft = 3600` exactement, oracle `toBe`). Les trois restent couverts en unitaire :
  `TimelineView.test.tsx` (`]`/`[` → 360 puis 0 ; `T` → 420) — **53 passed / 0 failed** sur
  `TimelineView.test.tsx` + `zoom.test.ts`.
- `prettier --check` et `eslint` propres sur `e2e/timeline.spec.ts`.

## 5. Environnement E2E — ce qui a été fait et un piège rencontré

Recette : backend conteneur `mytimeline-e2e-backend-e2e-1` (`:8086`, profils `dev,e2e`,
`RATE_LIMIT_ENABLED=false`, CORS `:3000,:3100`) + `npx next dev -p 3100` (webpack, pas turbopack)
avec `NEXT_PUBLIC_API_URL=/api E2E_API_PROXY_TARGET=http://localhost:8086` ; oracle proxy
`GET :3100/api/auth/me` → **401**.

**Piège payé (PIT-S54-004 mot pour mot)** : au milieu du travail, 3 runs consécutifs sont sortis
rouges dès le projet `setup` — d'abord `identités DIVERGENTES` (`pr909689717928` dérivé vs
`pr5102602018789` persisté), puis `Test timeout of 180000ms exceeded` sur `provision`. Cause : le
subagent de **#469 éditait `e2e/support/accounts.ts`, `e2e/global-setup.ts`, `auth.setup.ts` et
`playwright.config.ts` EN DIRECT dans le working tree partagé** et lançait des suites en parallèle.
Écarté d'abord : un `POST /api/auth/register` avec en-tête `Origin: http://localhost:3100` renvoyait
**201** par le proxy comme en direct → ni CORS ni backend en cause (et un `curl` seul ne l'aurait
pas prouvé, cf. PIT-S57-003 — l'`Origin` était bien posé ici).
Parade : harnais E2E **isolé** — copie de `e2e/` à `HEAD` dans un répertoire jetable hors dépôt
(`STATE_DIR = path.join(__dirname, '..', '.auth')` étant relatif, l'état d'auth est isolé de fait) +
config Playwright dédiée. Les runs verts et le contrôle négatif ci-dessus ont TOUS été joués sous ce
harnais isolé. Le répertoire jetable a été sorti du dépôt (working tree final : mon seul fichier).

## 6. Ce qui n'a PAS été fait / limites assumées

- **Aucune ligne de code applicatif modifiée** — `git diff` nul sur `frontend/src/**`. Le correctif
  `3dcc5ea` a été jugé complet, pas amélioré.
- La spec ne couvre que le couple **Mois → Trimestre**. Les 5 niveaux ne sont pas balayés (la spec
  #392 l. 1283 le fait, mais pour l'occlusion sticky, pas pour l'ancre).
- Le **zoom AVANT** (`+` / `=`) n'est pas épinglé : la re-projection est symétrique dans le code
  (garde sur `dayWidth`, pas sur le sens), mais ce n'est pas prouvé par un test.
- La spec n'a **pas** été jouée sous `firefox` (le projet `firefox` est restreint par `testMatch` à
  une seule spec) ni en CI — seulement en local, sous le harnais isolé.
- Le `scrollLeft` exact (`3600`, `1500`) est assumé comme oracle FORT : il casse si
  `DAY_WIDTH_PX.month/quarter` ou `PERIOD_STEP_DAYS.month` changent. C'est voulu (le message
  d'échec nomme les deux échelles), mais c'est un couplage à connaître.

## 7. Critères d'acceptation

- [x] Après un zoom arrière, un événement visible avant le zoom reste visible — 2 specs
      (#449 anchor près de la fin + clamp ; #451 anchor près du début, sans clamp)
- [x] Un test reproduit le cas mesuré et **échoue si le correctif est retiré** — contrôle négatif
      joué dans les deux sens, `Received: 0` puis 34/34 vert
- [x] Comportement #392 intact — 3 specs vertes + assertion géométrique neuve à 168 px
- [x] Raccourcis `T` / `[` / `]` — `[`/`]` en E2E dans la nouvelle spec, les 3 en unitaire (53/53)

STATUS: COMPLETED
