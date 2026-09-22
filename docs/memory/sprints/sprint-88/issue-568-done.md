# Issue #568 — Dump d'échec MockMvc : plus de JWT dans les logs CI

## Résumé
- Propriété globale `spring.test.mockmvc.print=none` + commentaire bloc ajoutés à
  `backend/src/test/resources/application-test.properties` (option 1 arbitrée le 2026-09-13).
- Portée revérifiée : 17 classes `@AutoConfigureMockMvc`, 0 avec argument, 17/17 `extends AbstractPostgresIntegrationTest`
  (`@ActiveProfiles("test")`, `support/AbstractPostgresIntegrationTest.java:30`). Les 2 classes `@ActiveProfiles("e2e")`
  (`RegisterRateLimitE2eProfileIntegrationTest:49`, `E2eResetTokenEndpointIntegrationTest:43`) AJOUTENT `e2e` à `test`
  (`inheritProfiles` par défaut) → couvertes. Aucun `@TestPropertySource`, aucun `@SpringBootTest(properties=…)` ne touche
  `mockmvc` ; aucune clé `mockmvc` dans `src/main/resources`, `backend/pom.xml` ni `.github/`.
- Propriété vérifiée dans le binaire, pas de mémoire : `spring-boot-test-autoconfigure-3.5.16.jar`,
  `AutoConfigureMockMvc` porte `@PropertyMapping("spring.test.mockmvc")` sur `print()` (`skip=ON_DEFAULT_VALUE`, donc
  l'annotation sans argument ne masque pas le fichier) ; enum `MockMvcPrint` = DEFAULT, LOG_DEBUG, SYSTEM_OUT, SYSTEM_ERR, NONE.
- Découverte en passant : le dump atterrit AUSSI dans `target/surefire-reports/TEST-*.xml` (non uploadé en CI aujourd'hui).
- Aucun code de production ni classe de test modifiés. Commit : voir retour au lead.

## Fichiers de contexte lus
- `.ai-env/context-packs/pit-backend.md` — PIT-S78-004 (l.559, `<argLine>` littéral / Testcontainers) ; PIT-S78 l.572 « un contrôle doit changer de verdict entre les deux versions du code » (appliqué : A/B/C).
- `docs/memory/decisions.md` — DEC-S81-007 (l.744) : correctif `MockMvcPrint.NONE` ou propriété équivalente renvoyé à issue dédiée.
- `docs/memory/audits/sprint-81-test-coverage.md` — § Phase 7, MAJEUR 1 (l.118-135) : 2 JWT en clair dans le run rouge du S81.
- `backend/src/test/resources/application-test.properties` — lu en entier (52 lignes avant modif, `jwt.private-key=` vide l.29).
- Briefing inline : cp-backend, PIT-S12-003, PIT-S37-002, PIT-S81-023.

## Preuves
Test cible : `RegisterLoginIntegrationTest#register_thenLogin_persistsUser_andIssuesJwtCookie`, cassé temporairement par
`assertTrue(false, "S88-568 CONTROLE NEGATIF TEMPORAIRE")` après le login 200 + cookie `jwt`. Commande commune
(depuis `backend/`) : `rtk proxy ./mvnw -Dtest='RegisterLoginIntegrationTest#register_thenLogin_persistsUser_andIssuesJwtCookie' -Djacoco.skip=true test > <scratch>/run-X.log 2>&1`
puis `grep -c 'eyJ'` sur le log et sur `target/surefire-reports/*RegisterLoginIntegrationTest*`.

| Run | Configuration | Échec forcé observé | `eyJ` stdout | `eyJ` rapports surefire | `MockHttpServletResponse` |
|---|---|---|---|---|---|
| A | SANS propriété | oui (1 failure, l.109) | **2** (`jwt=eyJhbGciOiJS…`) | **2** | — |
| B | AVEC `print=none` | oui (même message) | **0** | **0** | 0 |
| C | AVEC propriété + `-Dspring.test.mockmvc.print=default` | oui | 2 | 2 | 2 |

- A > 0 : le contrôle voit la fuite (non vacant). B = 0 avec le même échec : le verdict change. C : la réactivation
  locale documentée dans le commentaire fonctionne (propriété système Maven propagée au JVM surefire, prime sur le fichier).
- Assertion restaurée par `git checkout --` du seul fichier de test (ma 1re restauration par Edit avait recollé `}` à la
  ligne précédente, diff d'espaces) ; `git status --porcelain` → seul `M backend/src/test/resources/application-test.properties`
  + les 4 fichiers non suivis préexistants de `docs/memory/sprints/sprint-88/`.
- Suite backend complète : `./scripts/test-quiet.sh backend` → exit 0, `Tests run: 581, Failures: 0, Errors: 0, Skipped: 0`, `BUILD SUCCESS`.
  Limite : la suite a démarré juste AVANT le `git checkout --` du fichier de test ; la version compilée était celle au diff
  d'espaces seul (même code Java, sans l'`assertTrue(false)`), donc sans effet sur le verdict. `format:check` sans objet (backend).

## Signaux mémoire
- [MEMORY:decision] Context: #568, dump MockMvc sur échec publiait `Set-Cookie: jwt=eyJ…` (stdout + rapport XML) dans les logs d'un dépôt public, 17 classes. Decision: `spring.test.mockmvc.print=none` global dans `application-test.properties`, réactivation uniquement locale via `-Dspring.test.mockmvc.print=default`. Why: une propriété couvre les 17 classes et toute future classe du profil `test` sans discipline par classe ; coût accepté = perte du dump d'échec.
- [MEMORY:pitfall] Context: le dump d'échec MockMvc n'est pas seulement dans stdout, il est recopié dans `target/surefire-reports/TEST-*.xml` (`<system-out>`). Solution: `print=none` couvre les deux (0/0 mesuré). Prevention: ne jamais ajouter les rapports surefire à un `upload-artifact` sans vérifier ce point, et ne jamais réactiver `print` dans un job CI.
- [MEMORY:pattern] Problem: prouver qu'une propriété de config de test neutralise une fuite. Solution: contrôle à 3 runs sur le même échec forcé — A sans (>0), B avec (0), C avec + surcharge `-D` (>0) — ce qui prouve la fuite, le correctif ET la voie de diagnostic documentée. Anti-pattern: un seul run « avec » à 0, vacant si le test ne fuyait pas.

## Recommandations suite
- Pas de RECOMMAND_SECURITY car la fuite est mesurée à 0 (stdout et rapports) et le jeton publié est signé par une paire RSA éphémère par contexte ; les logs CI historiques restent lisibles mais leurs jetons ne se vérifient avec aucune clé survivante.
- Pas de RECOMMAND_TEST_RUNNER car la suite backend complète a été jouée par cet agent.
- Pas de RECOMMAND_DB_EXPERT car aucun schéma ni requête touchés.
- Pas de RECOMMAND_DEVOPS car `ci.yml` n'est pas modifié ; à noter pour #547 : ne pas uploader `surefire-reports` tel quel.

STATUS: COMPLETED
