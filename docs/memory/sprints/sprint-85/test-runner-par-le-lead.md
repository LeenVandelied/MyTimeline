# Suite complète — exécutée par le LEAD (pas de `test-runner` délégué)

> Réponse au signal `RECOMMAND_TEST_RUNNER` de #602. Sur ce dépôt, l'exécution E2E n'est **jamais**
> déléguée à un sous-agent `test-runner` : quatre fois sur quatre il a rendu un « E2E impossible »
> faux (S49 ×2, S51, S73 — PIT-S73-004). Le lead monte le harnais et lance la suite lui-même.

## Harnais monté par le lead

- Backend e2e : conteneur `s85e2e-backend-e2e-1` sur `:8086`, **image bâtie depuis HEAD**, base
  `eventmanager_e2e` neuve (`docker compose --profile e2e up -d --build backend-e2e`, ports dédiés
  8086/5436 — 8085/5435 et :3000 appartiennent à d'autres sessions).
- Front : `next dev` **webpack** sur `:3100` (pas `npm run dev`, qui force Turbopack et casse en worktree).
- Oracles vérifiés avant chaque verdict : `/api/auth/me` → **401**, `/fr/login` → **200**.

## Résultats mesurés

| Suite | Commande | Résultat |
|---|---|---|
| Frontend complet | `./scripts/test-quiet.sh frontend` | **OK** — `next build` 52/52 pages, **127 fichiers / 1511 tests**, typecheck, lint |
| Formatage | `rtk proxy npm run format:check` | « All matched files use Prettier code style » (étape absente de `test-quiet.sh`, exigée par la CI — PIT-S83-005) |
| E2E complète | `SKIP_DELEGATION=1 PLAYWRIGHT_BASE_URL=http://localhost:3100 rtk proxy npx playwright test --ignore-snapshots` | **370 passés / 8 sautés / 1 échec en 6,9 min** |
| Backend | non rejoué localement | Aucune ligne modifiée (`git diff origin/dev..HEAD -- backend` vide) ; job CI `backend` vert |
| CI PR #669 | `gh pr checks 669` | **7/7 verts** (backend, frontend, e2e, ai-env-packs, security, secret-scan, flyway-smoke) |

## L'unique échec E2E, et pourquoi il n'est pas un signal

`sprint-77-theme-visual.spec.ts:565` « armement de la comparaison » : sur macOS, Playwright attend
une référence suffixée `-chromium-darwin`, alors que le dépôt ne contient que des `-chromium-linux`.
Sous `--ignore-snapshots`, le garde-fou de la spec **refuse d'écrire** la référence manquante — c'est
le comportement voulu. Le job `e2e` de la CI (Linux) est vert : c'est lui qui juge le visuel.

## Deux incidents d'environnement, et ce qu'ils ont coûté

1. **Premier run complet interrompu à 318/378** : le `next dev` s'est arrêté seul, **sans erreur dans
   son log**, pendant qu'un autre serveur Next d'une session voisine survivait. Cause probable :
   pression mémoire (2 serveurs webpack + Playwright + Docker). Aucun échec réel n'avait été produit
   avant l'arrêt. Parade retenue : surveiller le serveur pendant le run.
2. **Pas de second run sur la même base** : la suite sème des catégories et des produits sans
   nettoyer (au-delà de 60 lanes, la virtualisation démonte les lanes semées — PIT-S64-009). La base
   a été **recréée à vide** (`down -v` puis `up`) avant le run qui fait foi ci-dessus.

## Pile démontée

`docker compose --profile e2e down -v` joué après la CI verte ; plus aucun conteneur `s85e2e-*`,
plus rien en écoute sur `:3100`.
