# Issue #117 — Test profil dev cookie JWT Secure=false — DONE

**Commit :** cd5ee90
**Fichiers :** test/.../AuthControllerDevProfileCookieTest.java (classe dédiée, +133)
**Résumé :** Classe DÉDIÉE (n'altère pas AuthControllerSecurityTest). Charge le VRAI application-dev.properties via @TestPropertySource("classpath:application-dev.properties") dans un contexte Spring minimal (@SpringJUnitWebConfig + AuthController réel + collaborateurs mockés, aucune auto-config Boot → pas de datasource/Flyway). Test : POST /login → cookie().secure("jwt", false) + cookie().domain("jwt","localhost"). Aucun fichier prod touché. Commit par chemin explicite.
**Tests :** 56/56 (55 anciens + nouveau), new test 0.171s. Tests prod intacts.

**[MEMORY:pattern]** Tester valeurs profil dev (app.cookie.*) sans booter DB : contexte minimal @SpringJUnitWebConfig + @TestPropertySource(vrai fichier) + bean controller réel mocks → @Value résolus, MockMvc standalone. Anti-pattern @SpringBootTest @ActiveProfiles("dev") (exige Postgres localhost:5432 hors Testcontainers → non déterministe).
**[MEMORY:decision]** Classe dédiée + contexte minimal car profil dev n'a pas de wiring Testcontainers (réservé profil test).

## Recommandations suite
- RECOMMAND_FOLLOWUP [XS | auth, faible prio] : symétrie — test profil prod chargeant le vrai application-prod.properties (Secure=true) non couvert au niveau fichier.

STATUS: COMPLETED
