# Issue #134 — anti-énumération username (message neutre) + rate-limit /api/me

RETOUR :

- commits: 1 commit — sujet `:lock: feat(auth): neutraliser le message du 409 username +
  throttler /api/me (#134)`. Le SHA n'est PAS recopié ici : ce fichier fait partie du commit,
  donc y inscrire son propre SHA est impossible sans le rendre faux à l'amend suivant. Le
  retrouver par `git log --grep='#134'` — et non par `git rev-parse HEAD`, non fiable en
  working tree partagé (commits concurrents des autres agents du sprint).
- resume:
  - objectif: neutraliser le CORPS du 409 `PATCH /api/me` (statut 409 conservé, décision dev) +
    faire entrer `/api/me` dans la map de rate-limiting existante.
  - BR touchées: BR-AUT-001 (contrat d'erreur uniquement — la règle d'unicité est inchangée,
    le statut 409 reste). Aucune BR réécrite, aucune migration.
  - fichiers clés:
    - `infrastructure/adapters/controllers/UserController.java` — `{"error":"username already taken"}`
      -> `{"error": ErrorCode.CONFLICT.getCode()}` = `{"error":"conflict"}`, corps STRICTEMENT
      identique au 409 de `AuthController.register` (déjà neutralisé au #288).
    - `infrastructure/security/RateLimitingFilter.java` — `Map.of` -> `Map.ofEntries` (Map.of
      plafonne à 10 paires ; on passait de 8 à 10 = pile la limite) ; +2 slots :
      `POST /api/me/change-password` 5/min/IP, `PATCH /api/me` 10/min/IP. Javadoc de classe :
      périmètre `/api/me` couvert vs délibérément exclu.
    - tests: `UserControllerTest.java`, `RateLimitingAndHeadersIntegrationTest.java`.
  - frontend: AUCUNE modification. Vérifié que les 2 surfaces mappent le 409 par STATUT seul
    (`ProfileSection.tsx:61` et `app/[locale]/register/page.tsx:54`), jamais par le corps ->
    pas de régression de message. Libellés i18n `usernameTaken` volontairement CONSERVÉS :
    le 409 étant maintenu, changer le libellé dégraderait l'UX sans gain (l'attaquant lit le
    statut, pas le texte traduit).
  - pitfalls rencontrés:
    - `Map.of` cap 10 paires — piège évité en amont (bascule `Map.ofEntries`).
    - `rtk proxy git diff > fichier` produit un patch MANGLÉ (« patch with only garbage at
      line 3 » sur `git apply`) alors que `wc -l` semble cohérent. Contourné par plumbing
      (`git cat-file -p HEAD:<path>` + reconstruction + `git hash-object -w` +
      `git update-index --cacheinfo`).
    - `UserControllerTest.java` est ÉGALEMENT modifié par #148 (littéraux de mots de passe
      `newsecret`->`NewSecret1`) dans le working tree partagé. Un `git add <fichier>` aurait
      committé leur WIP. Seules mes 2 hunks ont été indexées (index = HEAD + mes hunks).
  - tests (chiffres réels):
    - `UserControllerTest` : 22 -> 23 (+1 `patchMe_conflictBody_leaksNoUsernameExistenceHint`),
      + assertion du test 409 existant migrée sur `ErrorCode.CONFLICT.getCode()`.
    - `RateLimitingAndHeadersIntegrationTest` : 13 -> 18 (+5 : change-password 6e=429,
      rechargement de fenêtre via TimeMeter contrôlable, PATCH /api/me 11e=429, buckets
      indépendants POST/PATCH, GET /api/me non throttlé).
    - Suite backend complète : **511 tests, 0 échec, BUILD SUCCESS** (~44 s) en excluant le
      fichier NON SUIVI `AuthControllerLegacyPasswordLoginTest.java` (WIP de #148).
    - Suite backend SANS exclusion : 514 tests, **2 échecs**, tous deux dans ce fichier non
      suivi de #148 (`login ... 401` sur mot de passe legacy 6 caractères). Imputables à leur
      politique de mot de passe en cours de livraison, PAS à cette issue : le fichier est
      absent de HEAD (`git status` = `??`) et je n'ai touché ni `/api/auth/login` ni la
      validation de mot de passe.
    - Frontend : `ProfileSection.test.tsx` 7/7 PASS (seul fichier front concerné).

- NON VÉRIFIÉ (à assumer explicitement) :
  - La version INDEXÉE de `UserControllerTest.java` (HEAD + mes hunks) n'a pas été exécutée
    telle quelle : ce qui a été exécuté est le working tree (mes hunks + celles de #148). Les
    deux ne diffèrent que par des littéraux de mots de passe orthogonaux à mes assertions.
  - E2E Playwright NON exécutés. Risque analysé comme nul : le job e2e pose
    `RATE_LIMIT_ENABLED=false` (`ci.yml:242`, `docker-compose.yml:168`), le filtre est donc
    entièrement court-circuité ; `settings-security.spec.ts` ne peut pas trébucher sur les
    nouveaux slots.
  - Aucune vérification navigateur (pas de surface visuelle modifiée).
  - `POST /api/me/avatar` (upload 5 Mio, écriture disque) reste NON throttlé — hors périmètre
    #134, tracé en follow-up ci-dessous et documenté dans la javadoc du filtre.

- fichiers de contexte lus:
  - `.ai-env/context-packs/br-auth.md` — LU. Ancrages : BR-AUT-001 l.43 (« refuser un `register`
    quand un `User` avec le même `username` existe déjà (réponse `409 CONFLICT`) ») et l.150
    (A10 « ✅ RÉSOLU (S9) : `@Column(unique = true)` présent sur `username` »). Conclusion :
    aucune BR ne fige le TEXTE du corps 409 — seul le statut est normatif, la neutralisation
    du message ne contredit aucune BR.
  - `.ai-env/context-packs/pit-backend.md` — LU (recherche ciblée `rate|bucket4j|filter|409|
    enumeration|TimeMeter`). Ancrages : l.309 (« chaque run ré-enregistre 4 comptes contre un
    bucket de **5/min/IP** … symptôme qui ressemble à une panne d'infra »), l.71-72 (retry 429
    d'`auth.setup.ts` mort depuis le S47), PIT-S47-002 l.500. Aucun pitfall n'interdit d'étendre
    LIMITS ; ils imposent de vérifier l'impact E2E — fait (rate-limit désactivé en e2e).
  - `.ai-env/context-packs/coverage-auth.md` — LU. Ancrage : « `RateLimitingAndHeadersIntegrationTest`
    (14) ». ⚠ CHIFFRE PÉRIMÉ : le fichier à HEAD contient 13 `@Test` (le 14e match de `@Test`
    est `@TestConfiguration`). De même `RateLimitingDisabledIntegrationTest` est annoncé à 2,
    surefire en exécute 1.
  - `backend/.../infrastructure/security/RateLimitingFilter.java` — LU intégralement (~400 l.).
    Ancrage : `LIMITS` l.86 + branche par-token `RESET_PASSWORD_KEY` + normalisation
    `UrlPathHelper.getPathWithinApplication` (bypass `/api/%65xport` du #265). Étendu, pas réécrit.
  - `backend/.../infrastructure/security/RateLimitConfig.java` — LU. Ancrage : bean
    `rateLimitTimeMeter()` extrait de SecurityConfig pour casser le cycle de construction ;
    surchargé en test par `ControllableTimeMeter` — utilisé pour tester le rechargement de
    fenêtre sans `sleep`.

- [MEMORY:decision] Contexte: le 409 « username already taken » de `PATCH /api/me` confirmait
  l'existence d'un compte tiers (énumération). Décision: garder le STATUT 409 (contrat frontend
  intact — les 2 surfaces discriminent sur le statut seul) et neutraliser le CORPS sur le code
  générique `conflict`, identique à `register`. Pourquoi: passer en 422 aurait cassé
  `ProfileSection.tsx` et `register/page.tsx` sans supprimer l'oracle (qui vient du statut) ;
  l'oracle par statut est un arbitrage produit assumé, atténué par le throttle, pas supprimé.
- [MEMORY:pattern] Problème: neutraliser un message d'erreur sans laisser un futur commit le
  réintroduire. Solution: doubler l'assertion d'égalité (`$.error == conflict`) d'une assertion
  d'ABSENCE sur le corps entier (`taken`, `username`, `exist`, valeur sondée). Anti-pattern:
  n'asserter que l'égalité — un enrichissement ultérieur du body (`message`, `field`) rouvrirait
  l'oracle sans faire rougir le test.
- [MEMORY:pitfall] Contexte: working tree partagé, `UserControllerTest.java` édité en parallèle
  par #134 et #148. Solution: indexer HEAD+mes-hunks via plumbing (`git cat-file -p HEAD:<path>`,
  reconstruction, `git hash-object -w`, `git update-index --cacheinfo`) — le working tree n'est
  jamais touché, donc le WIP du voisin est intact. Prévention: `git add -p` est indisponible et
  `rtk proxy git diff > f` produit un patch inapplicable ; le plumbing est le seul chemin sûr.
- [MEMORY:pitfall] Contexte: `Map.of` plafonne à 10 paires clé/valeur. `LIMITS` en comptait 8 ;
  deux ajouts la portaient pile à 10. Solution: bascule préventive sur `Map.ofEntries`.
  Prévention: toute map de config statique proche de 8 entrées passe en `ofEntries`.

## Recommandations suite

- RECOMMAND_FOLLOWUP — `POST /api/me/avatar` (multipart 5 Mio, validation magic-bytes + écriture
  disque, aucun quota) reste hors rate-limit : vecteur d'épuisement disque/CPU par un utilisateur
  authentifié. Hors périmètre #134 (anti-énumération + brute-force credentials), délibérément non
  embarqué en douce ; documenté dans la javadoc de `RateLimitingFilter`. Ouvrir une issue dédiée.
- RECOMMAND_FOLLOWUP — `.ai-env/context-packs/coverage-auth.md` est périmé sur les comptages
  (`RateLimitingAndHeadersIntegrationTest` annoncé 14, réel 13 à HEAD ; `RateLimitingDisabledIntegrationTest`
  annoncé 2, réel 1). À resynchroniser à la clôture du sprint.
- Pas de RECOMMAND_DB_EXPERT car aucune migration Flyway n'est nécessaire (aucun changement de schéma, prochaine migration reste V16).
- Pas de RECOMMAND_TEST_RUNNER car la suite backend complète a déjà été exécutée inline en ~44 s (511 tests verts hors WIP de #148), sous le seuil des 3 minutes.
- Pas de RECOMMAND_UI_DESIGN car aucune surface visuelle n'est modifiée (zéro fichier frontend touché).
- Pas de RECOMMAND_SECURITY car le durcissement livré EST le sujet de l'issue et la décision de politique (409 conservé, message neutralisé) a été tranchée en amont par le plan d'implémentation dev.

STATUS: COMPLETED
