# Audit tests — Sprint 31

> Généré en fin de Phase 6 (2026-07-11). `[MISSING]` bloque la Phase 9 PR.
> Thème : Sécurité d'exposition — CVE (front #222 / back #223) & fuite logs (#160).
> Nature : sprint majoritairement dépendances + durcissement logging → **aucune BR fonctionnelle nouvelle**.

## Couverture par changement

| Changement | Type | Cross-system flow | Unit backend | Vitest frontend | Build | E2E métier |
|---|---|:---:|:---:|:---:|:---:|:---:|
| #223 bump jackson-databind 2.18.5→2.18.8 + pgjdbc 42.7.8→42.7.11 | deps backend | NON | ✅ 318/318 | ⚠ N/A | ⚠ N/A | ⚠ N/A (non-régression via suite intégration Testcontainers) |
| #223 acceptation 3 CVE HIGH Boot (documentée) | doc sécurité | NON | ⚠ N/A | ⚠ N/A | ⚠ N/A | ⚠ N/A |
| #222 bump vitest 2→3.2.7 + leaves ReDoS | deps frontend (dev) | NON | ⚠ N/A | ✅ 383/383 | ✅ vert | ⚠ N/A |
| #222 retrait `--omit=dev` job CI `security` | CI | NON | ⚠ N/A | ⚠ N/A | ⚠ N/A (validé `npm audit --audit-level=high` exit 0 localement) | ⚠ N/A |
| #160 assainissement log axios `authService.ts:62` | sécurité logging | NON | ⚠ N/A | ✅ 383/383 | ✅ vert | ⚠ N/A |
| #160 garde ESLint `no-restricted-syntax` (anti-récidive PIT §85) | lint | NON | ⚠ N/A | ✅ (règle vérifiée via snippet démo) | ✅ | ⚠ N/A |

Aucun changement n'est un cross-system flow (2+ systèmes/rôles) → **aucun E2E métier obligatoire manquant**.

## Résultats runs (Phase 6, test-runner isolé — 24s)
- **Backend** : 318 tests, 318 passed, 0 failed (Testcontainers/Docker OK). Non-régression confirmée post-bump jackson/pgjdbc.
- **Frontend** : 383 tests, 383 passed, 0 failed, 54 fichiers, TypeScript 0 erreur. Non-régression confirmée post-bump vitest 3 (major, config compatible sans réparation).
- **E2E** : `frontend/e2e/` = specs `auth.setup` seulement ; échec setup dû à l'absence de backend servant sur localhost (infra, PAS régression S31). Aucun parcours métier E2E dans le périmètre S31 (aucun nouveau `data-testid`).

## Vérification sécurité (objet du sprint)
- `npm audit --audit-level=high` (dev inclus) : **0 HIGH, 0 CRITICAL** (résiduel = low/moderate non bloquant, follow-up PROD deps).
- Backend `mvn dependency:tree` : jackson-databind 2.18.8, postgresql 42.7.11 confirmés. 3 CVE Boot HIGH acceptées + justifiées (non applicables : stateless JWT, pas de CloudFoundry, pas de health group) → `docs/security/cve-acceptance.md`.
- Grep fuite logs : plus aucun `console.error(msg, <axios error brut>)` hors error-boundaries React mono-arg (standard Next.js, hors scope). Garde ESLint active.

## Coverage E2E (Phase 8)
Aucun nouveau `data-testid` introduit par S31 (aucun `.tsx` de composant modifié hors logging). → `[COVERAGE-E2E] OK`.

## Conclusion
**Prêt pour PR.** Suite unit verte (701 tests cumulés), 0 régression sur les bumps, objectif sécurité atteint (0 HIGH/CRITICAL front + back résolus/acceptés-documentés). Aucun `[MISSING]`.
