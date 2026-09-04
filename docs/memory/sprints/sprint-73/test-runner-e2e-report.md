# Rapport test-runner / E2E — Sprint 73

> Répond au signal `RECOMMAND_TEST_RUNNER` émis par `issue-298-done.md`
> (« 3 specs e2e modifiées + 1 neuve, aucune exécutée »).

## 1. Subagent `test-runner` — verdict INDETERMINE, réfuté

Un subagent `test-runner` a bien été spawné par le lead. Il a rendu :

> `next dev` sort immédiatement sur `sprint/73` avec « Errors: 1 | Warnings: 0 » et aucun
> texte d'erreur. `next build` réussit. `next dev` réussit sur `origin/dev`.
> → régression de build introduite par le sprint. **VERDICT : INDETERMINE.**

**Ce diagnostic est faux.** Réfuté par reproduction directe (45 s) :

```
cd frontend && npx next dev --port 3111
→ ✓ Starting...  ✓ Ready in 1545ms
```

`next dev` démarre normalement sur `sprint/73`. La cause réelle de son échec est
l'avertissement d'inférence de *workspace root* en worktree (plusieurs lockfiles) —
**PIT-S61-007**, déjà documenté dans `frontend/playwright.config.ts`, qui précise que
`npm run dev` (= `next dev --turbopack`) rend 500 sur toutes les pages en worktree, et
donne la recette de contournement.

C'est le **4ᵉ** verdict « E2E impossible » erroné d'un runner délégué sur ce projet
(S49 ×2, S51, S73).

## 2. Suite E2E réellement exécutée (par le lead)

Recette 2 de `playwright.config.ts` — webpack, pas turbopack :

```
cd frontend
NEXT_PUBLIC_API_URL=/api E2E_API_PROXY_TARGET=http://localhost:8086 npx next dev -p 3000
SKIP_DELEGATION=1 PLAYWRIGHT_BASE_URL=http://localhost:3000 npx playwright test
```

**Oracle avant tout diagnostic** (piège CORS/proxy documenté) :
`curl -s -o /dev/null -w '%{http_code}' localhost:3000/api/auth/me` → **401** = proxy OK.

### Résultat

**249 passed / 0 failed / 9 skipped** en 5 min 12, `exit=0`.

Contrôle anti-pollution : le log ne contient qu'**un seul** bloc
`Running 258 tests using 2 workers` — aucune campagne Playwright concurrente
(le run invalidé du S65 avait justement manqué ce contrôle).

Les 9 `skipped` sont `auth-signature.spec.ts` (RS256), préexistants et étrangers au sprint.

### Spécifiquement vérifié

| Spec | État | Résultat |
|---|---|---|
| `sprint-73-tablet-sidebar.spec.ts` | **neuve** | 5/5 |
| `settings-breakpoints.spec.ts` | modifiée | 6/6 |
| `sprint-66-mobile-create-event.spec.ts` | modifiée | 3/3 |
| `sprint-63-de-overflow-audit.spec.ts` | inchangée, **à risque** | 17/17 |
| `timeline-mobile.spec.ts` | inchangée, **à risque** | 15/15 |

Les deux dernières n'ont pas été modifiées mais leur viewport (768–1023, et 844×390/520)
tombe dans la nouvelle plage tablette introduite par #298 : le dev les avait signalées comme
non testées. Elles passent.

## 3. Confirmation CI

Job `e2e` de la CI sur `efb9db3` : **success**. Run complet : 7/7 jobs verts
(`backend`, `frontend`, `e2e`, `ai-env-packs`, `security`, `secret-scan`, `flyway-smoke`).

## 4. Suite unitaire

`./scripts/test-quiet.sh frontend` : 106 fichiers / **1181 passed** / 0 failed.

## Verdict

**GATE VERTE.** Signal `RECOMMAND_TEST_RUNNER` clos.
