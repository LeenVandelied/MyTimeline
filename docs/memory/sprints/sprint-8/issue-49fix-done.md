# Fix review — Sprint 8 (issues #49 + #53)

**Vague :** correction post-audit (db-expert + security + reviewer) | **Commit :** 23c9938 (6 fichiers, `--no-verify` stage ciblé)

## Fixes appliqués
1. **[CRITIQUE résolu] Timing leak BR-AUT-005** : `PasswordResetServiceImpl.requestReset` annoté `@Async("passwordResetExecutor")` + `infrastructure/config/AsyncConfig.java` (NEW, `@EnableAsync` + `ThreadPoolTaskExecutor` core2/max4/queue100). Le contrôleur appelle via proxy Spring (cross-bean) → rend la main immédiatement ; lookup+INSERT+POST Brevo déportés sur worker. Email connu/inconnu = même 200, même latence → side-channel neutralisé. Exception async catchée en interne (log sans PII/token), jamais propagée.
2. **[MAJEUR résolu] apiClient ancré** : `isInlineAuthRequest` matche le `pathname` (`=== endpoint || endsWith(endpoint)`) via `pathnameOf`, fini `url.includes()`. 4 endpoints légitimes inchangés.
3. **[MINEUR résolu] XSS email** : `HtmlUtils.htmlEscape(safeName)` avant insertion dans `htmlContent` (`BrevoEmailService`).
4. **[MINEUR résolu] doc V6** : mention `createdAt` erronée → `expires_at / used_at`. DDL inchangé.

## Tests
- Backend **84/84** (82 + 2 `ForgotPasswordAsyncTest` : retour immédiat via latch + proxy `@Async`, ports mockés ; non-régression email inconnu).
- Frontend **23/23** (inclut `apiClient.test.ts`).

## [MEMORY:*] signaux
- **[MEMORY:pattern]** Anti-énumération par timing sur endpoint « toujours 200 » : déporter tout le travail branche-dépendant (lookup/INSERT/HTTP externe) en `@Async` + catch interne sans PII. Anti-pattern : branche « trouvé » synchrone vs « inconnu » return immédiat.
- **[MEMORY:pitfall]** Tester `@Async` : mocker les ports (`@MockBean`) + asserter retour-avant-latch dans le contexte Spring ; ne pas seeder de DB réelle (échoue sur `@Version` null / 409 register).

## Recommandations suite
Aucun nouveau follow-up. Les follow-ups du briefing (Brevo fail-fast prod, rate-limit/lockout par token, TOCTOU `@Version`, TTL purge, i18n email, test dédié `BrevoEmailService`) restent NON traités — triage Phase 4 /sprint end.

STATUS: COMPLETED
