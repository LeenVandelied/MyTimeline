# Issue #500 — flaky AuthControllerLegacyPasswordLoginTest (vague 1)

- commits: [d803044]

- resume:
  - Objectif : livrer LA MESURE MANQUANTE (statut HTTP reel au prochain rouge), pas une "correction" du flaky.
  - Fichier unique touche : `backend/src/test/java/com/matimeline/eventmanager/infrastructure/adapters/controllers/AuthControllerLegacyPasswordLoginTest.java`. Zero ligne de `main/`.
  - Mecanisme existant ? NON. `AbstractPostgresIntegrationTest` = 45 lignes, conteneur singleton seul. Aucun TestWatcher / TestExecutionListener / @RegisterExtension dans tout `src/test`. Rien a brancher -> helper local.
  - Instrumente : helper `diagnostic(MvcResult, username)` + `assertLoginSucceeded(...)`. Rapporte statut HTTP, corps, TOUS les en-tetes (sans liste blanche -> si #499 ajoute `Retry-After`/`X-RateLimit-*`, ils remontent sans retoucher le test), sonde DB `count(users)` COMMITTEE lue dans une transaction distincte, + grille de lecture 429/401-0ligne/401-1ligne/500.
  - Messages passes en `Supplier` : la sonde DB ne s'execute QUE sur echec (chemin vert inchange).
  - 4 sites couverts : les 2 points aveugles de `legacyAccount_canChange...` (login pre-requis + login final), l'assert de `login_withPreExisting...`, et le `change-password` (204).
  - PREUVE que la capture marche (run de sonde volontairement rouge, patch jete apres) : 3 echecs forces, 3 messages exploitables — `statut=401 corps={"error":"unauthorized"} lignes=1` (credentials), `statut=401 lignes=0` (seed invisible), `statut=429 corps={"error":"too_many_requests"} lignes=1` (rate-limit). Les 3 causes sont donc bien discriminees.
  - Runs verts : 3x classe seule (conteneur NEUF a chaque `mvnw`, 12-14 s) + 1x suite backend complete (577 tests, 44 s, conteneur neuf) = 4 conteneurs neufs, 0 rouge.

- conclusion:
  Cause NON identifiee. Le flaky n'a pas ete reproduit en 4 runs (dont 4 conteneurs neufs).
  Le mecanisme de capture est livre ; l'issue reste ouverte jusqu'au prochain rouge.

- [MEMORY:*] signaux:
  - [MEMORY:pattern] Probleme: un flaky non reproductible ne se debug pas a la relance. Solution: instrumenter AVANT de chercher la cause — message d'assert en `Supplier` portant statut + corps + en-tetes + une sonde d'etat (ici `count` DB committe) qui discrimine les familles de cause; valider l'instrumentation par un run VOLONTAIREMENT rouge. Anti-pattern: relancer jusqu'au vert et refermer.
  - [MEMORY:pitfall] Contexte: `assertNotNull(res.getResponse().getCookie("jwt"), "...")` sur une reponse HTTP. Le message d'echec ne dit ni le statut ni le corps -> 429, 401 et 500 sont indiscernables. Prevention: aucune assertion sur un `MvcResult` sans passer par un helper qui dumpe la reponse.
  - [MEMORY:decision] Contexte: 4 runs verts. Decision: NE PAS fermer #500. Pourquoi: une serie verte est le comportement nominal d'un flaky intermittent, elle ne refute rien.

- recommandations suite:
  - Pas de RECOMMAND_TEST_RUNNER : suite backend = 577 tests mais 44 s (seuil temps non atteint, cout contexte nul via redirection fichier). Chiffre a reutiliser par les vagues 2/3.
  - RECOMMAND_FOLLOWUP (vague 2 / #499) : MESURE, pas hypothese — sur 429, `RateLimitingFilter.writeTooManyRequests` n'ecrit AUCUN `Retry-After` ni `X-RateLimit-*` (dump d'en-tetes du run de sonde : seuls Vary/Content-Type/entetes de securite). Un client ne peut pas savoir combien de temps attendre. Aucune imputation rate-limit etablie pour #500 a ce stade.

- ABSORBED: aucune

- fichiers de contexte lus: briefing #500 (br-auth.md + cp-backend.md inlines), AuthControllerLegacyPasswordLoginTest.java, AbstractPostgresIntegrationTest.java, RateLimitingFilter.java (lecture seule), AuthController.java (login/me), UserEntity.java, backend/pom.xml (surefire), src/test/resources (pas de junit-platform.properties)
STATUS: COMPLETED
