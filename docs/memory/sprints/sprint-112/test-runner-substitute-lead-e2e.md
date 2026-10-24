# Exécution des tests — Sprint 112 (lead, en lieu et place du test-runner)

> Traite les signaux `RECOMMAND_TEST_RUNNER` du sprint (#831, critère 3 : « suite E2E complète inchangée »).
> Le lead joue lui-même la suite E2E : la mémoire projet interdit de la déléguer au test-runner
> (4 faux « E2E impossible » constatés), cf. `playwright.config.ts` et le runbook du S47.

## Environnement
- Backend e2e : conteneur `s111e2e-backend-e2e-1` (`:8087`, profil `dev,e2e`, limiteur armé) reconstruit depuis HEAD `b5e717c1` (recréé 2026-09-24 21:08 UTC) ; `UserRateLimitingFilter` vérifié présent dans `/app/app.jar`.
- Frontend : `next build` de HEAD (`E2E_API_PROXY_TARGET=http://localhost:8087 NEXT_PUBLIC_API_URL=/api`) puis `next start -p 3100` ; oracles `/api/auth/me` = 401, `/fr/login` = 200.

## Résultats
- Suite Playwright complète, `--ignore-snapshots`, 2 workers : 619 passés / 8 sautés / 1 rouge / 1 non exécuté, 0 flaky, 3,7 min.
  - rouge hors sprint : `sprint-77-theme-visual.spec.ts:620` (références Linux, rouge par construction sur darwin, déjà rouge au S111) ;
  - non exécuté : `rate-limit-armed`, bloqué par ce rouge (PIT-S88-007) → rejoué seul (`--project=rate-limit-armed --no-deps`) : 1/1.
- Specs citées par #831 (`sprint-111-theme-account-preference`, `sprint-111-theme-toggle-unified`, `settings-preferences`) : incluses dans le run, vertes.
- Backend `./mvnw test` : 670/670 sur `b5e717c1`, puis 682/682 sur `fb4654b1` (correction de revue).
- Frontend : tsc, lint, format:check verts ; Vitest 2280/2280.

Détail et limites : `docs/memory/audits/sprint-112-test-coverage.md`.
