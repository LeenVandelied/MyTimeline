# Issue #685 — Durcir deux garde-fous du Sprint 88 (done)

## Résumé

Commits : `062c903` (frontend), `6eee23e` (backend). Aucun code de prod modifié : `auth.setup.ts` ne reçoit qu'un commentaire.

### 1. Contrat de la boucle annotée (`frontend/src/__tests__/e2e-rate-limit-budget.test.ts`)
- **Clause 5, provenance du statut classé (`provenanceViolation`).** Avant, le contrat ne lisait que le corps de la boucle. Il suit maintenant la chaîne de fonctions du fichier, depuis l'argument de `classifyRegisterResponse` :
  - la boucle n'émet que dans l'argument du classificateur ;
  - l'argument est l'appel d'une fonction de CE fichier, ou une relecture `acceptedRegisterStatus(…)` ;
  - une fonction intermédiaire (`attemptRegister`) ne renvoie qu'une relecture, directe ou via une `const` qu'elle initialise, ou l'appel d'une fonction de la chaîne. Elle n'émet nulle part ailleurs que dans cette valeur de retour ;
  - la fonction qui émet (`submitRegister`) a une **forme figée**. Seuls ces appels y sont permis : `all`, `waitForResponse`, `getByTestId`, `click`, `status`, `url`, `acceptedRegisterStatus`. Elle ne renvoie que `<réponse>.status()` ou une relecture.
- **L'ancrage compte les BOUCLES.** `annotatedFiles` est remplacé par `annotatedLoops`, qui rend des `fichier:ligne`, et par `expectSingleAnnotatedLoop`. Le rapport d'échec passe en 2e argument d'`expect` (PIT-S57-002).
- **Tests : 27 → 37.**
  - 5 cas synthétiques : chaîne conforme à deux niveaux = 1 ; attente `toBeVisible` ou `waitForTimeout` dans la fonction qui émet ; `return null` sur délai dépassé ; intermédiaire qui fabrique le statut ou qui émet hors de son retour ; émission hors de l'argument, ou via une fonction d'un autre fichier.
  - 5 contrôles négatifs sur une COPIE MUTÉE du vrai `auth.setup.ts`. La copie intacte vaut 1 register et 1 boucle. Les mutations testées : attente dans `submitRegister` ; `return null` dans son `catch` ; `attemptRegister` qui fabrique le statut ; boucle annotée dupliquée dans le même fichier.
  - Chaque mutation affirme que son ancre existe une fois : le contrôle ne peut pas devenir vacant.
- **Choix.** J'ai pris les deux options de l'énoncé, forme figée ET provenance. La forme seule laisserait passer une attente dans l'intermédiaire suivie d'un statut fabriqué. La provenance seule laisserait passer une attente dans `submitRegister` qui garde un retour conforme, or le critère d'acceptation exige qu'elle rougisse.
- **Angle mort assumé, écrit dans la javadoc** : les ARGUMENTS de la relecture ne sont pas vérifiés. Un `acceptedRegisterStatus([], …)` écrit exprès passerait. Le contrat ferme le glissement accidentel, pas la malveillance.

### 2. « Variable vide = défaut » via le vrai binding (`RateLimitTunableCeilingTest.java`)
- **Conception tranchée : `ApplicationContextRunner` minimal, placé dans `RateLimitTunableCeilingTest`, pas dans `RateLimitDefaultCeilingsIntegrationTest`.**
  - Poser une propriété blanche dans le contexte partagé changerait le plafond login de toutes les IT qui le partagent.
  - Un `@SpringBootTest(properties=…)` ajoute un contexte et un pool Hikari (PIT-S37-002).
  - Le runner n'enregistre que `RateLimitingFilter` (constructeur résolu par Spring, `@Value` compris) et un `TimeMeter` gelé : ni datasource, ni contexte web.
  - Il rejoue le chemin d'un vrai boot : `PropertyPlaceholderAutoConfiguration` (placeholders stricts, motif de `StorageConfigTest`) et `ApplicationConversionService` posé sur la bean factory, comme `SpringApplication`.
  - La source `systemEnvironment` est remplacée (motif de `CorsAllowedOriginsConfigIntegrationTest`), ce qui exerce aussi la traduction `APP_RATE_LIMIT_LOGIN_PER_MINUTE` → `app.rate-limit.login-per-minute`.
- **5 cas.**
  - Propriété blanche → défaut 10.
  - Variable d'env blanche → défaut 10.
  - Contre-épreuves : propriété absente → 10 ; `7` → 7 appliqué ; `abc` → le contexte échoue avec `NumberFormatException`, dont le message contient `abc`.

## Fichiers de contexte lus

- `docs/memory/sprints/sprint-88/specialists-reviewer.md` : l.28-41, § Cycle 2. n°2 l.33 (contrat contournable via helper, `annotatedFiles` compte des fichiers) ; n°5 l.36 (`null` au lieu de `""`) ; suite donnée l.40-41.
- `docs/memory/sprints/sprint-88/review-fix-done.md` : l.14-48. Point 2 `cae1f77` l.24-29 (contrat en 4 clauses, ancrage « une seule boucle annotée ») ; arbitrage l.36-47 (annotation plutôt que helper `withRetry`).
- `.ai-env/context-packs/br-auth.md` : lu par grep seulement. `rate-limit|plafond` ne donne aucune ligne ; `429|throttl|brute|rate` ne donne que l.125 (« RateLimitingFilter : forgot 5/min/IP »). Aucune règle métier du pack ne porte sur les plafonds réglables.
- `.ai-env/context-packs/cp-backend.md` : lu par grep seulement, l.102-104 (`@SpringBootTest` + `@AutoConfigureMockMvc`, intégration `extends AbstractPostgresIntegrationTest`).
- `docs/memory/decisions.md` : l.937-959, DEC-S88-001 → 004. DEC-S88-003 l.951 : « valeur blanche = défaut » côté `ProfileSafetyGuard` ; DEC-S88-004 l.957 : boucle annotée sous contrat vérifié par AST.
- Motifs de test repris : `backend/src/test/.../config/StorageConfigTest.java` l.1-60 (runner + placeholders stricts) et `backend/src/test/.../security/CorsAllowedOriginsConfigIntegrationTest.java` l.40-69 (remplacement de `systemEnvironment`).
- Sources : `frontend/e2e/auth.setup.ts` (intégral), `frontend/e2e/support/register-retry.ts` (intégral), `RateLimitingFilter.java` l.330-400, `RateLimitTunableCeilingTest.java` (intégral), `RateLimitDefaultCeilingsIntegrationTest.java` (intégral), `e2e-rate-limit-budget.test.ts` (intégral).

## Preuves

### Garde-fou worktree
- `git rev-parse --show-toplevel` = WT et `branch --show-current` = `claude/sprint-89-start-6c6966`. Vérifié en 1re action, puis de nouveau juste avant les commits.

### Frontend
- `npx vitest run src/__tests__/e2e-rate-limit-budget.test.ts` → **37 passed (37)**, rejoué après prettier : 37/37.
- `npx tsc --noEmit` → exit 0, 0 `error TS`.
- `npx prettier --check` et `npx eslint` sur les 2 fichiers → exit 0.
- **Contrôle négatif vu ROUGE.**
  - Montage : copie temporaire `e2e-rate-limit-budget.mutant-685.test.ts`, puis supprimée. Deux mutations :
    - F1 : `return null` en tête de `provenanceViolation` (clause 5 désarmée) ;
    - F2 : `[...new Set(…)]` sur l'ancrage (retour au compte par fichiers).
  - Résultat : **8 rouges exactement**, les 29 autres verts.
  - Rouges de F1 : `ÉCHOUE si une attente est glissée dans la fonction qui émet`, `… renvoie autre chose qu'un statut mesuré ou relu`, `… une fonction intermédiaire fabrique le statut…`, `… émet hors de l'argument…`. S'y ajoutent, sur la copie du vrai fichier : `une attente glissée dans submitRegister fait rougir le budget`, `submitRegister qui renvoie null…`, `attemptRegister qui fabrique le statut…`. Tous `expected [Function] to throw an error`.
  - Rouge de F2 : `deux boucles annotées dans le MÊME fichier font rougir l'ancrage`.
- Le Vitest lit `frontend/e2e/` en direct. Il est resté vert malgré le nouveau `sprint-89-local-date-west.spec.ts` de #652, présent dans le working tree pendant les runs.

### Backend
- **Verrou Maven** : chaque commande `mvnw` a été lancée sous `/tmp/mytimeline-s89-maven.lock`, libéré après chaque run.
- **Vert, `-Dtest='RateLimit*'`** (exit 0) :
  - `RateLimitTunableCeilingTest` 10/10 (5 existants + 5 nouveaux) ;
  - `RateLimitDefaultCeilingsIntegrationTest` 3 ;
  - `RateLimitE2eProfileIntegrationTest` 4 ;
  - `RateLimitingAndHeadersIntegrationTest` 22 ;
  - `RateLimitingDisabledIntegrationTest` 1 ;
  - `ResetPasswordTokenRateLimitIntegrationTest` 4.
  - Total 44, 0 échec.
- **Mutation M2** (le code de prod) : `@Value("${app.rate-limit.login-per-minute}")`, `#{null}` retiré.
  - Montage : appliquée et annulée À L'INTÉRIEUR du verrou.
  - Résultat : `Tests run: 10, Failures: 1`. Seul `absentProperty_bindsToNull_appliesDefault` rougit, avec `PlaceholderResolutionException: Could not resolve placeholder 'app.rate-limit.login-per-minute'`.
  - Lecture : le runner lit bien le vrai placeholder, en mode strict.
  - Retirer `#{null}` ne fait PAS rougir les cas blancs : `${…}` résout alors `""`, toujours converti en `null`. C'est attendu et consigné.
- **Mutation M1** (ConversionService) : `DefaultConversionService` + convertisseur `String→Integer = Integer::valueOf`, lancé avec M2. Les cas blancs sont **restés VERTS : cette contre-épreuve est VACANTE.**
  - Cause : quand la ConversionService lève sur `""`, `TypeConverterDelegate` retombe sur l'éditeur par défaut `CustomNumberEditor(Integer, allowEmpty=true)`, qui rend `null`.
  - Conséquence : `""` → `null` est garanti à deux étages pour un type boxé. Ce qui peut vraiment casser la règle, c'est le TYPE déclaré, d'où M3.
- **Mutation M3** (le code de prod) : `Integer loginPerMinute` → `int loginPerMinute`.
  - Montage : appliquée et annulée à l'intérieur du verrou.
  - Résultat : `Tests run: 10, Failures: 4, Errors: 2`.
  - **`blankProperty_bindsToNull_appliesDefault` et `blankEnvironmentVariable_bindsToNull_appliesDefault` rougissent** avec `TypeMismatchException … NumberFormatException: For input string: ""`. C'est la preuve que ces tests exécutent la conversion Spring de `""`.
  - Rouges attendus, dus à l'unboxing de `null` : `absentProperty…`, `one_isTheFloor`, `negative_isRejected`, `absent_appliesDefaults`.
  - Restent verts : `7` et `abc`.
- **Nettoyage** : après chaque mutation, `grep -c MUTANT` = 0 sur les deux fichiers ; `git status` ne montre aucune modification de `RateLimitingFilter.java`.
- **Suite backend complète** (`./mvnw -q test`, sous verrou) : **exit 0**. Rapports surefire agrégés : 79 classes, **603 tests, 0 échec, 0 erreur, 0 ignoré**. Run lancé après les deux commits, sur le working tree partagé : il inclut donc le diff #546 alors présent.

### Commits
- `062c903` : `frontend/e2e/auth.setup.ts`, `frontend/src/__tests__/e2e-rate-limit-budget.test.ts`.
- `6eee23e` : `backend/src/test/java/com/matimeline/eventmanager/infrastructure/security/RateLimitTunableCeilingTest.java`.
- `git add` avec chemins littéraux ; `diff --cached --name-only` vérifié avant chaque commit.

## Signaux mémoire

- `[MEMORY:pitfall]` **Contexte** : prouver qu'un test exécute la conversion Spring `""` → `null` d'un `@Value Integer`. **Constat** : muter la ConversionService (convertisseur qui lève sur `""`) laisse le test VERT, car `TypeConverterDelegate` avale l'échec et retombe sur `CustomNumberEditor(allowEmpty=true)` pour les types boxés. **Solution** : muter le TYPE déclaré (`Integer` → `int`) ; les cas blancs rougissent alors avec `NumberFormatException: For input string: ""`. **Prévention** : une contre-épreuve de binding doit viser ce qui peut réellement régresser (type, clé, défaut du placeholder), et chaque contre-épreuve doit être VUE rouge : une mutation plausible peut être vacante. (#685)
- `[MEMORY:pattern]` **Problème** : une exemption de compteur vérifiée par AST sur le seul corps de boucle se contourne par un helper. **Solution** : suivre la PROVENANCE de la valeur décisive le long de la chaîne d'appels du fichier (retours autorisés, émission seulement en position de retour, forme figée de la fonction qui émet), et exercer le garde sur une COPIE MUTÉE du vrai fichier dont l'ancre est affirmée présente (contrôle non vacant). **Anti-pattern** : un ancrage « une seule exemption » qui compte des fichiers au lieu des occurrences. (#685)
- `[MEMORY:pitfall]` **Contexte** : `echo ====` comme séparateur dans un Bash sous zsh. **Solution** : l'expansion `=cmd` de zsh lève `==== not found` et coupe la commande composée. **Prévention** : pas de séparateur commençant par `=` ; `printf -- '---\n'` ou des appels séparés. (#685)

## Recommandations suite

- Pas de RECOMMAND_TEST_RUNNER car Vitest budget (37), `RateLimit*` (44) et la suite backend complète ont été joués ici.
- Pas de RECOMMAND_DB_EXPERT car aucun schéma ni aucune requête n'est touché.
- Pas de RECOMMAND_SECURITY_EXPERT car seuls des garde-fous de TEST changent ; le code de prod est intact.
- Lead : `auth.setup.ts` n'a reçu qu'un commentaire JSDoc sur `submitRegister`, sans effet d'exécution. Rejouer le setup reste à la main du lead (exclusivité Playwright de #652).
- Hors scope, consigné : le binding blanc n'est testé que pour `login`, le créneau nommé par l'issue. `register` et `reset-password` partagent la même forme `@Value(":#{null}") Integer`, mais une régression de type sur l'un d'eux ne serait pas vue. Extension triviale (paramétrer les 3 clés) si le lead le juge utile ; XS, pas de follow-up ouvert.
- Angle mort documenté dans la javadoc de `provenanceViolation` : les arguments de `acceptedRegisterStatus` ne sont pas vérifiés.

STATUS: COMPLETED
