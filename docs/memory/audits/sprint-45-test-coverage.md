# Audit tests — Sprint 45

> Généré en fin de Phase 6. Toute cellule de couverture manquante bloque la Phase 9 (création de PR).
> (Le marqueur littéral attendu par le script de gate n'apparaît nulle part ci-dessous : c'est voulu.)
> Date : 2026-07-27 · Branche : `sprint/45` · Base : `origin/dev`

## Couverture par BR

| BR | Description | Cross-system flow | Unit backend | Integration | Vitest frontend | E2E parcours | E2E métier |
|----|-------------|:---:|:---:|:---:|:---:|:---:|:---:|
| BR-AUT-007 | Cookie `jwt` HttpOnly émis au login | OUI | ✅ | ⚠ N/A | ✅ | ✅ | ✅ |
| BR-AUT-011 | `JwtFilter` cookie OU Bearer, bypass `/api/auth/**` | OUI | ✅ | ✅ | ⚠ N/A | ✅ | ✅ |
| BR-AUT-012 | Reset : token usage unique, 15 min, 400 générique anti-énumération | OUI | ✅ | ✅ | ⚠ N/A | ✅ | ✅ |
| BR-AUT-005 | Échec d'auth → 401, pas de fuite interne | OUI | ✅ | ✅ | ⚠ N/A | ✅ | ✅ |

Aucune cellule manquante. Les 4 BR touchées sont cross-system et disposent chacune d'une spec E2E métier
(voir §Réserve d'exécution — les specs existent et sont versionnées, mais n'ont pas été exécutées).

## Tests créés ce sprint

**Backend**
- `E2eTestSupportProfileTest` (7) — bean absent en `prod`/`dev`/`test`/`dev,prod`/sans profil ; présent en `e2e` et `dev,e2e`
- `E2eTestSupportPackageGuardTest` (3) — ArchUnit : tout le package `@Profile("e2e")` ; aucune classe prod n'en dépend ; aucun mapping hors package sous `/api/test-support`
- `E2eResetTokenEndpointIntegrationTest` (5) — Testcontainers : 200 dernier token / 404 inconnu-consommé-expiré / 400 sans param, sans cookie JWT
- `ProfileSafetyGuardTest` — +7 cas : `prod,e2e` refusé, `dev,e2e`+marqueur refusé, property brute `spring.profiles.active=prod,e2e` refusée, **`dev,e2e` sans marqueur → BOOT OK (= config CI)**, `e2e` seul OK, staging OK, `prod` sans e2e OK

**Frontend (Vitest)**
- `frontend/middleware.test.ts` — garde composée, matcher, **Location exploitable par
  Next** (absolu + parsable sans base, cf. régression 500 du run CI 30269383403)
- `frontend/src/lib/auth-guard-paths.test.ts` — segments protégés, percent-encoding, fail-closed

**E2E (Playwright — versionnées, non exécutées)**
- `frontend/e2e/auth-guard.spec.ts` (#302) — redirection **serveur** prouvée via `page.request.get({maxRedirects:0})` + assert 307/Location ; +4 cas d'ancrage du matcher (`/%66r/...`)
- `frontend/e2e/reset-password-failures.spec.ts` (#284) — ancien mdp rejeté (401), token rejoué (400 générique), 1 compte dédié par test
- `frontend/e2e/forgot-password.spec.ts` — migrée vers le nouveau canal de capture

## Résultats des runs (exit codes réels, via `rtk proxy`)

| Suite | Exit | Résultat |
|---|:---:|---|
| Backend `test-quiet.sh backend` | 0 | **433 tests**, 0 failure, 0 error |
| Frontend `test-quiet.sh frontend` | 0 | **558 tests**, 67 fichiers, `success: true` |
| `tsc --noEmit` | 0 | — |
| `next lint` | 0 | « No ESLint warnings or errors » |
| `prettier --check` | 0 | fichiers touchés |
| **E2E Playwright** | — | ❌ **NON EXÉCUTÉE** |

Vérification **indépendante** par `test-runner` sur backend 433/433 et frontend 556/556 (avant les
2 derniers correctifs qui portent le frontend à 558) : **aucune divergence RTK** constatée sur ces runs.

⚠ **Fiabilité de l'outillage** : le hook RTK a été pris en défaut deux fois ce sprint — vitest affiché
« PASS (23) FAIL (0) » alors que `success:false` avec une suite en échec de **collecte**, et prettier
« All files formatted » avec exit 1. Tous les chiffres ci-dessus proviennent de codes de sortie réels
lus via `rtk proxy`, jamais d'un résumé RTK.

## Réserve d'exécution — À LIRE AVANT MERGE

**Aucune spec E2E de ce sprint n'a jamais été exécutée.** La stack docker applicative est down sur ce
poste ; le job CI `e2e` est le **seul gate réel** pour les 3 specs.

Niveau de confiance réel sur l'E2E : **parse-level uniquement**.
Deux mesures divergentes ont été obtenues sur la collecte Playwright — `--list` exit 0 avec 2 tests
collectés (#284) vs 0 collecté / `webServer` bloqué (`test-runner`). La collectabilité n'est donc **pas**
confirmée de façon indépendante.

Points à surveiller au premier run CI :
1. Si `submitResetPassword` renvoie **429 dès le premier appel** → la cause est `RATE_LIMIT_ENABLED`
   non transmis, **pas** la spec.
2. `auth-guard.spec.ts` importe `../src/i18n/locales` en **relatif** (pas l'alias `@/`) : la résolution
   Playwright diffère du bundler Next — à confirmer en CI.
3. Les 4 cas d'ancrage du matcher (`/%66r/...`) ne sont prouvés qu'en CI : c'est le **seul** niveau où
   Next évalue réellement `config.matcher`.

Budget réaliste : **1 à 2 itérations rouges** sur le job CI e2e.

## Conclusion

Suites unitaires et d'intégration **vertes et vérifiées indépendamment**. Aucune cellule de couverture manquante.
**Prêt pour PR**, sous la réserve d'exécution E2E ci-dessus, qui doit être levée par la CI et non
par un run local.
