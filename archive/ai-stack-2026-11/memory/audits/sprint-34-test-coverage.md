# Audit tests — Sprint 34

> Généré en fin de Phase 6. Aucun `[MISSING]` → Phase 9 PR débloquée.
> Thème : Supply-chain / CVE platform upgrade (Boot 3.5.x, next-intl, garde BOM). **Aucune BR métier impactée** — durcissement build/sécurité pur.

## Couverture par changement

| Issue | Nature | Cross-system flow | Test de non-régression | Résultat |
|-------|--------|:---:|---|:---:|
| #260 | Bump Boot 3.4.13→3.5.16 (pom + overrides retirés) | NON | Testcontainers full suite (Flyway V1..V13 rejoués, ddl-auto=validate) + trivy 0 HIGH | ✅ |
| #261 | Bump next-intl 4.0.2→4.13.2 (frontend) | NON | `next build` (4 locales prérendues + middleware i18n) + vitest 421 + npm audit gate | ✅ |
| #224 | Nouveau `BomDriftTest` (planchers CVE effectifs) | NON | 6 `@Test` unitaires (versions BOM ≥ planchers) — la garde EST le test | ✅ |

Aucune issue n'est un flux 2+ systèmes/rôles → aucun E2E métier requis.

## Tests créés / touchés
- `backend/src/test/java/com/matimeline/eventmanager/build/BomDriftTest.java` (NOUVEAU, #224 — 6 @Test)
- `StatelessSessionGuardTest` (garde-fou S31) : conservé et vert après upgrade Boot (#260)
- Aucun nouveau test frontend (bump de dépendance ; non-régression via build + suite existante)

## Résultats runs (test-runner Haiku isolé, 2026-07-12)
- **Backend** : 361 tests, 361 passed, 0 failed / 0 error / 0 skip (Testcontainers, Docker online, postgres:16). BomDriftTest 6/6 ✓, StatelessSessionGuardTest 2/2 ✓.
- **Frontend** : 421 tests, 421 passed, 0 failed, 0 erreur TS (59 fichiers). Warnings non-bloquants : 8× aria-describedby (DialogContent), pré-existants.
- **trivy** (#260, exécuté par fullstack-dev) : 0 CRITICAL / 0 HIGH backend (down 3→0).
- **E2E** : non exécuté (bumps dépendances, aucun nouveau parcours ni `data-testid`). Voir Phase 8 coverage-e2e.

## Conclusion
Prêt pour PR. Aucun `[MISSING]`. Suite complète verte, CVE HIGH backend éliminées, 2 CVE MODERATE PROD frontend éliminées, garde anti-drift en place. Résiduel documenté : postcss XSS (épinglé par next jusqu'à v16, sans fix upstream — `docs/security/cve-acceptance.md`).
