# Audit test-runner — Sprint 50

> Traitement des signaux `RECOMMAND_TEST_RUNNER` émis par `issue-322-done.md` et
> `issue-323-done.md` (volume au-dessus du seuil ~500 tests).
> Artefact déposé ici pour que `check-sprint-completeness.sh` voie la trace : le rapport de
> couverture complet vit dans `docs/memory/audits/sprint-50-test-coverage.md`.

## Signaux traités

| Source | Signal | Traitement |
|---|---|---|
| `issue-322-done.md` | `RECOMMAND_TEST_RUNNER` (747 tests, > seuil ~500) | **TRAITÉ** — `test-runner` spawné par le lead en Phase 6 |
| `issue-323-done.md` | `RECOMMAND_TEST_RUNNER` (repasse E2E Playwright complète) | **TRAITÉ partiellement** — voir §Limite ci-dessous |

## Run test-runner (Phase 6, avant correctifs de review)

Agent `test-runner` indépendant, exécuté en isolation par le lead.

```
Backend  : 449/449 PASS | 0 failed | 0 errors | 0 skipped
Frontend : 774/774 PASS | 88 fichiers | 0 erreur TS
E2E      : NON LANCÉ — setup en échec (backend non démarré, 404 à l'inscription)
```

**Contrôle anti-complaisance** — le test-runner a confirmé les chiffres annoncés par les agents
sans écart (`449` et `774` annoncés = `449` et `774` mesurés), et a vérifié la progression
attendue `747` (#322) → `774` (#323).

**Anomalies recherchées, aucune trouvée** : `middleware.ts` est devenu `async` au S50 ; le
test-runner a spécifiquement cherché des promesses non attendues dans `middleware.test.ts`
(62 tests) — tous les call sites `await` correctement, aucun test muet.

## Re-mesures après les deux cycles de review

| Étape | Backend | Frontend | E2E |
|---|---|---|---|
| Phase 6 (test-runner indépendant) | 449/449 | 774/774 | non lançable |
| Après correctifs review cycle 1 (`d7b8049`) | 450/450 | 788/788 | 12/0 (signature, stack appairée) |
| Après correctifs review cycle 2 (`64df375`) | **452/452** | **806/806** | 96 passed / 8 skipped / 0 failed |

CI GitHub sur `64df375` (run 30399816138) : **4 jobs verts** — `backend`, `frontend`,
`security`, `e2e`.

## Limite assumée

Le signal de `issue-323-done.md` demandait une **repasse Playwright complète**. Elle a été faite
**localement** (`96 passed / 8 skipped`) et **en CI** (job `e2e` vert, 2 passes : appairée
12 passed + dégradée). Ce qui n'a PAS été fait : aucune repasse E2E après le commit de correctifs
`64df375` **en local** — seule la CI l'a exercée. Les deux correctifs qui touchent la CI
(`::add-mask::`, `auth.setup.ts` ajouté au filtre) ne sont exerçables que là.

## Recommandations suite

- `RECOMMAND_FOLLOWUP` — rendre le job `e2e` **requis** sur `dev` (aujourd'hui seuls `backend` et
  `frontend` le sont) : une régression E2E ne bloquerait pas un merge.
- Pas de `RECOMMAND_DB_EXPERT` — aucune migration Flyway dans ce sprint (V16 toujours non consommée).
- Pas de `RECOMMAND_UI_DESIGN` — aucun rendu visuel touché.
- `RECOMMAND_SECURITY` **déjà traité** : un `security-expert` a audité la PR (review du 2ᵉ cycle),
  verdict 0 CRITIQUE / 1 MAJEUR / 5 MINEUR, tous corrigés — cf. `review-batch.md`.

STATUS: COMPLETED
