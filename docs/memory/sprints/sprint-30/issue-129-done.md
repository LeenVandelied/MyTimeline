# Issue #129 — DONE

commits: voir git log (1 commit gitmoji, ajouté ci-dessous)

resume:
- objectif: filet régression sur FICHIER application-prod.properties → cookie Secure=true.
- fichier créé: backend/src/test/java/.../infrastructure/adapters/controllers/AuthControllerProdProfileCookieTest.java
- pattern: MIROIR de AuthControllerDevProfileCookieTest. Contexte LÉGER @SpringJUnitWebConfig(MinimalConfig) + @TestPropertySource("classpath:application-prod.properties"). Pas de @SpringBootTest, pas Testcontainers.
- assertion: login MockMvc (standaloneSetup sur bean AuthController résolu par Spring) → cookie().secure("jwt", true). Valeur RÉSOLUE depuis le fichier (pas constante) → casse si app.cookie.secure retiré/fichier supprimé.
- pourquoi léger marche: prod ref ${DB_PASSWORD}/${JWT_SECRET}/${CORS_ALLOWED_ORIGINS}/${STORAGE_AVATAR_PATH} sans default, mais AuthController n'injecte que @Value app.cookie.secure (littéral true) + app.cookie.domain (${COOKIE_DOMAIN:} défaut vide) → aucun secret consommé, boot OK sans env.
- résultat run: ./scripts/test-quiet.sh backend → 306 tests, 0 fail. Surefire report ProdProfileCookieTest: Tests run:1, Failures:0.

fichiers NON touchés: application-prod.properties, application-dev.properties, AuthController.java, SecurityConfig.java, test dev existant. Conforme.

[MEMORY:pattern] Problem: couvrir un fichier de config par-profil (application-prod.properties) sans booter le contexte complet (secrets sans default → exigerait Testcontainers+env). Solution: @SpringJUnitWebConfig(MinimalConfig enregistrant seulement le bean qui consomme les @Value) + @TestPropertySource("classpath:application-<profil>.properties") ; assert via MockMvc standaloneSetup sur le bean résolu. Anti-pattern: @SpringBootTest+@ActiveProfiles(prod) (boot complet + secrets), ou valeurs cookie en dur (ne teste pas le fichier).

recommandations suite:
- Pas de RECOMMAND_TEST_RUNNER car suite lancée localement OK (306 pass).
- Pas de RECOMMAND_DB_EXPERT / RECOMMAND_SECURITY car scope = test config, aucune modif code/schema/sécurité.
- RECOMMAND_FOLLOWUP (hors-scope, optionnel): symétrie — le CORS/storage prod n'a pas d'équivalent filet régression fichier ; envisageable si besoin futur, non bloquant.

STATUS: COMPLETED
