# Sprint 79 — cycle 2 de revue : les trois gardes, exercées

> Règle appliquée : **une garde n'est acquise que si on l'a vue ROUGIR**. Chaque point
> ci-dessous porte les DEUX observations (armée -> rouge, désarmée -> vert), avec le
> message d'échec réel. Rien n'est repris d'une lecture de code.

Fichiers de contexte lus : `frontend/playwright.config.ts`, `frontend/e2e/support/seed-cleanup.ts`,
`frontend/e2e/support/accounts.ts`, `frontend/e2e/support/auth.ts`, `frontend/e2e/auth.setup.ts`,
`backend/src/main/resources/application-e2e.properties`, `backend/.../RegisterRateLimit*IntegrationTest.java`.

---

## Point 1 — garde de budget `register` (#475)

`frontend/src/__tests__/e2e-register-budget.test.ts`

### Le trou n'était pas théorique : il était DÉJÀ réalisé dans le dépôt

`countSpecRegisters` ne lisait que les fichiers `e2e/*.spec.ts`. Or `e2e/support/auth.ts`
expose `registerOnly()`, qui **soumet le formulaire d'inscription**, et il est appelé :

| appelant | appels |
|---|---|
| `e2e/forgot-password.spec.ts:43` | 1 |
| `e2e/reset-password-failures.spec.ts:138,160` | 2 |

Ces **3 inscriptions réelles** étaient invisibles : aucun de ces deux fichiers ne contient
`register-submit`. Le budget annoncé partout (5) était faux de 3, dans le sens qui minimise
le risque. Budget réel **8**, plafond 20, marge **12** (et non 15).

### Ce qui a changé

La détection résout maintenant l'indirection : elle repère dans `e2e/support/` les fonctions
exportées qui émettent un register (directement ou en appelant une émettrice — point fixe,
`registerAndLogin` -> `registerOnly`), puis compte leurs **appels** dans les specs. Les motifs
sont aussi ancrés sur la forme d'appel (`getByTestId('register-submit')`, `.post('/api/auth/register')`)
au lieu d'une simple présence de chaîne : `support/register-page.ts` cite l'URL dans un MESSAGE
d'erreur sans rien émettre, et l'ancienne version comptait ce genre d'occurrence.

7 tests ajoutés, dont 6 sur des **sources synthétiques** (dossier temporaire, jamais une vraie spec).

### Armée -> ROUGE

`findRegisterHelpers` neutralisée (`return []`, soit le comportement du cycle 1) :

```
PASS (7) FAIL (3)
1. ... voit les inscriptions émises par un HELPER, pas seulement celles écrites dans la spec
   AssertionError: les helpers émetteurs de support/auth.ts doivent être détectés: expected [] to deeply equal ArrayContaining{…}
2. ... COMPTE un register émis via un helper de support — le trou du cycle 1
   AssertionError: expected [] to include 'registerOnly'
3. ... suit l'indirection transitive (helper qui appelle un helper émetteur)
   AssertionError: expected [] to deeply equal ArrayContaining{…}
```

`MIN_MARGIN` porté à 99, pour faire cracher les chiffres réels :

```
AssertionError: Budget register de la suite = 8 pour un plafond e2e de 20 (marge 12, minimum exigé 99).
  projet setup (ALL_ACCOUNTS) : 4
  specs : 4 {"forgot-password.spec.ts":1,"golden-path.spec.ts":1,"reset-password-failures.spec.ts":2}
```

### Désarmée -> VERT

`PASS (10) FAIL (0)`.

### LIMITE ASSUMÉE, avec son contre-exemple (test dédié, pas un commentaire)

Le compteur lit du texte, il n'exécute rien. Une spec qui écrirait :

```ts
const SUBMIT_ID = 'register-submit'
await page.getByTestId(SUBMIT_ID).click()
```

émet une inscription **réelle** qu'il ne voit pas. Aucune spec du dépôt n'écrit ça aujourd'hui
(les 3 points d'émission passent par un littéral) ; le cas est figé par le test
« ANGLE MORT ASSUMÉ … » qui **asserte 0**. S'il rougit un jour, c'est que la détection a été
renforcée : mettre à jour l'attendu, pas le contourner. Même limite pour une soumission placée
dans une boucle (sur-comptée) ou construite dynamiquement.

### Chiffres faux corrigés en cascade (comment-only)

`application-e2e.properties`, `playwright.config.ts:169`, `e2e/support/accounts.ts`,
`e2e/auth.setup.ts` annonçaient tous « 5 registers / marge 15 ». Corrigés en 8 / 12, avec la
raison. Aucune valeur de configuration touchée (le plafond reste 20).

---

## Point 2 — `throw` de la fixture de purge (#463)

`frontend/e2e/support/fixtures.ts`, `frontend/e2e/support/seed-cleanup-outcome.ts` (nouveau),
`frontend/e2e/seed-cleanup-guard.spec.ts` (nouveau),
`frontend/src/__tests__/seed-cleanup-outcome.test.ts` (nouveau).

### Comment l'échec est forcé (mesuré, pas supposé)

Statuts relevés sur le backend local (profil `dev,e2e`), compte authentifié :

| requête | statut |
|---|---|
| `DELETE /api/users/{uuid}/products/not-a-uuid` | **400** -> la purge lève |
| `DELETE /api/users/{uuid}/products/{uuid inconnu}` | **404** -> toléré, ne lève PAS |
| `DELETE /api/categories/not-a-uuid?reassignToCategoryId=…` | **400** |

Le contrôle négatif enregistre donc au registre de semis un produit d'id `not-a-uuid`. Rien
n'est créé côté serveur, rien n'est laissé derrière (pas même la catégorie « poubelle », que
seul le chemin catégories déclenche). Un UUID inconnu n'aurait rien prouvé : 404 est toléré
délibérément.

### Armée -> ROUGE (la branche `throw` exécutée pour la première fois)

Spec jouée sans `test.fail()` :

```
✘ 6 [chromium] › e2e/seed-cleanup-guard.spec.ts:58:7 › ... (1.2s)

  Error: #463 — la purge post-test a échoué (1) :
    - purge produit not-a-uuid : 400 (attendu 204 ou 404)
  ...
     at support/fixtures.ts:36
   > 36 |       if (outcome.level === 'fatal') throw new Error(outcome.report)
  1 failed, 5 passed (15.4s)
```

### Désarmée -> ROUGE aussi, mais par l'autre bord (c'est le principe du contrôle négatif)

Le `throw` remplacé par un `console.warn`, spec avec son `test.fail()` :

```
DESARME
#463 — la purge post-test a échoué (1) : ...
✓ 6 [chromium] › e2e/seed-cleanup-guard.spec.ts:58:7 › ...
  1) ... Expected to fail, but passed.
  1 failed, 5 passed (15.8s)
```

### Fixture intacte -> VERT

```
✘ 13 [chromium] › e2e/seed-cleanup-guard.spec.ts:58:7 › ... (580ms)
13 passed (15.2s)      # guard + products + categories, exit 0
```

Le `✘` est l'échec ATTENDU (`test.fail()`) : il compte comme passé. **Si ce fichier rougit un
jour, ce n'est pas lui qu'il faut réparer — c'est que la garde de `fixtures.ts` ne se déclenche
plus.**

### Seconde branche (`warn`, cause d'origine préservée)

Elle n'est PAS observable depuis une spec : quand la fixture lève, le test est déjà terminé, et
les deux issues (`throw` / `warn`) rendent un test déjà rouge… rouge. La décision a donc été
extraite dans `seed-cleanup-outcome.ts` (pure, sans Playwright) et couverte branche par branche :

- armée : `testStatus === 'passed' ? 'fatal' : 'warn'` remplacé par `'warn'` constant ->
  `PASS (3) FAIL (1)`, `AssertionError: expected 'warn' to be 'fatal'` ;
- désarmée : `PASS (4) FAIL (0)`.

Couverture : `clean` (0 échec), `fatal` (échec + test vert), `warn` (échec + `failed` /
`timedOut` / `interrupted` / `undefined`), et le rapport porte bien la cause + le compte.
Le comportement de `fixtures.ts` est inchangé — extraction pure.

---

## Point 3 — assertion tautologique (#475, backend)

`backend/.../RegisterRateLimitE2eProfileIntegrationTest.java`

L'ancien `e2eCeilingLeavesRoomForMoreRegistersThanTheSuiteEmits` assertait `20 - 5 == 15` sur
deux constantes Java : vert même si `application-e2e.properties` disparaissait. Remplacé par
`e2eCeilingReadFromConfigurationLeavesRoomForMoreRegistersThanTheSuiteEmits`, qui lit
`app.rate-limit.register-per-minute` **dans l'environnement Spring résolu** (`@Value`) et exige
une marge >= 5 sur le budget recompté (8, aligné sur le compteur frontend).

### Armée -> ROUGE

`app.rate-limit.register-per-minute` abaissé à 8 dans `application-e2e.properties` :

```
[ERROR] Tests run: 3, Failures: 2
e2eCeilingReadFromConfigurationLeavesRoomForMoreRegistersThanTheSuiteEmits
  AssertionFailedError: app.rate-limit.register-per-minute résolu sous le profil e2e doit valoir 20
  (application-e2e.properties). ... ==> expected: <20> but was: <8>
e2eProfile_raisesRegisterCeilingToTwenty
  AssertionFailedError: register #9 must pass under the e2e ceiling of 20 ... ==> expected: not equal but was: <429>
```

L'ancienne formulation serait restée **verte** sur cette même mutation : elle ne touchait pas au
fichier. C'est exactement ce qu'elle ne pouvait pas détecter.

### Désarmée -> VERT

Plafond remis à 20 : `exit=0`, 3 tests verts. Les deux autres tests de la classe et
`RegisterRateLimitDefaultIntegrationTest` ne sont PAS touchés.

---

## Suites rejouées

| suite | résultat |
|---|---|
| backend `./scripts/test-quiet.sh backend` | **577/577**, BUILD SUCCESS (repère tenu) |
| frontend `npx vitest run` | **1327/1327** (1316 + 11 nouveaux), 115 fichiers |
| `npm run format:check` (prettier, bloquant CI) | All matched files use Prettier code style |
| `npx tsc --noEmit` | No errors found |
| Playwright ciblé (`seed-cleanup-guard` + `products` + `categories`) | 13 passed, exit 0 |

Recette locale utilisée : backend `SPRING_PROFILES_ACTIVE=dev,e2e ./mvnw spring-boot:run` sur une
base **neuve**, front `npx next dev -p 3000` (webpack), oracle
`curl … :3000/api/auth/me` -> **401** avant toute hypothèse.

⚠ La base locale `eventmanager` **ne migre plus** : `V7__design_v3_schema.sql` casse sur des
données héritées (`ERROR: new row for relation "events" violates check constraint
"events_recurrence_unit_check"`). Contourné en créant une base neuve `eventmanager_s79` — non
supprimée (opération destructive, hors mandat). Sans rapport avec ce sprint, mais tout agent qui
bootera le backend local là-dessus butera dessus.

---

## Ce que je n'ai PAS vérifié

- **La suite E2E complète n'a pas été rejouée** (consigne). Seules `seed-cleanup-guard`,
  `products` et `categories` l'ont été. Les 10 échecs `sprint-77-theme-visual` (références
  `chromium-linux` uniquement) n'ont pas été touchés — aucun `--update-snapshots`.
- **Un `products.spec.ts:33` rouge une fois** (« toHaveURL … 14 × unexpected value ») pendant le
  run trio, puis **vert deux fois** (seul, puis même trio, exit 0). Non reproduit, non attribué :
  je ne l'étiquette **pas** « pré-existant » sans un run sur la base du sprint. Piste : première
  compilation de la route `/fr/products/[id]` sous webpack dev (run à 43 s vs 15 s ensuite).
- Un `[setup] provision` a échoué une fois (`getByTestId('dashboard')` non visible, 5 s),
  puis vert au rejeu. **Aucun 429 dans le log backend** — ce n'est pas le rate-limit.
- **Comportement en CI non observé** : tout ce qui précède est local macOS. Le job `e2e` pose
  `RATE_LIMIT_ENABLED=false`, donc il ne mesure toujours rien du plafond `register`.
- `next build` non joué (un run vitest vert ne garantit pas le build).
- La 2e branche de la fixture (`warn` + cause préservée) est prouvée **en unitaire**, pas au
  runtime Playwright : impossible à discriminer depuis une spec, dit plus haut.

## [MEMORY:*]

- `[MEMORY:pitfall]` Contexte : un compteur statique qui ne lit que `e2e/*.spec.ts` rate les
  inscriptions émises depuis `e2e/support/`. Solution : résoudre l'indirection helper (point fixe
  sur les fonctions exportées) et ancrer les motifs sur la FORME D'APPEL, pas sur la présence de
  la chaîne (un message d'erreur qui cite une URL n'émet rien). Prévention : tout compteur de
  sources doit être exercé sur des sources SYNTHÉTIQUES, sinon il mesure ce qu'il voit et pas ce
  qui existe.
- `[MEMORY:pattern]` Problème : prouver qu'une fixture Playwright fait échouer un test, alors
  qu'un test ne peut pas observer son propre teardown. Solution : `test.fail()` sur une spec qui
  force l'échec de la fixture — garde vivante = échec attendu = run vert ; garde morte =
  « Expected to fail, but passed ». Anti-pattern : se contenter de relire la branche, ou
  n'ajouter qu'un test unitaire de la logique (il ne dit rien du chemin réseau réel).
- `[MEMORY:pitfall]` Contexte : une assertion Java sur deux constantes (`20 - 5 == 15`) se fait
  passer pour un critère d'acceptation. Prévention : un test de configuration doit LIRE la
  configuration (`@Value` sous le bon profil) ; le contrôle négatif est de muter la propriété et
  de vérifier qu'il rougit.
