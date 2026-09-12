# ISSUE #140 DONE

commits: fc92c7ba5514a4bda0debc2cda03d2075417fe66

resume:
- objectif: health indicator prod DOWN si BREVO_API_KEY absente (email NO-OP silencieux #49)
- cree: infrastructure/adapters/email/BrevoHealthIndicator.java (@Component @Profile("prod") implements HealthIndicator)
- cree: test/.../email/BrevoHealthIndicatorTest.java (4 tests unitaires, pas @SpringBootTest)
- approche: cle lue @Value("${brevo.api.key:}") cohérent BrevoEmailService ; blank/null -> Health.down().withDetail("reason",...) ; sinon Health.up() ; PAS de fail-fast boot ; valeur cle jamais exposee/loggee
- composant JSON /actuator/health = "brevo" (bean brevoHealthIndicator)
- profil dev/test: bean absent (@Profile prod) -> aucun DOWN injustifie
- NON touche: ProfileSafetyGuard, spring.factories, application*.properties, SecurityConfig, pom.xml
- tests: ./scripts/test-quiet.sh backend -> 305 run, 0 fail (suite complete, mes 4 tests inclus)

[MEMORY:pattern] Probleme: exposer un risque runtime (dep externe non-fatale) uniquement en prod. Solution: bean @Component @Profile("prod") implements HealthIndicator, DOWN via Health.down().withDetail sans fail-fast boot ni fuite secret. Anti-pattern: bloquer le boot (casse tests bootant un contexte) ou logger la valeur.

recommandations suite:
- Pas de RECOMMAND_TEST_RUNNER car test unitaire cible suffit, suite deja verte.
- Pas de RECOMMAND_DB_EXPERT / SECURITY car aucun schema ni surface auth nouvelle.
- RECOMMAND_FOLLOWUP: monitoring/alerting reel sur /actuator/health (Docker healthcheck ne lit que status global, pas le composant brevo) -> triage XS, domaine devops/observability. Hors-scope #140.
- Note: follow-ups BR-AUT-012 restants (lockout token, TTL/purge tokens, i18n template email) non traites ici.

STATUS: COMPLETED
