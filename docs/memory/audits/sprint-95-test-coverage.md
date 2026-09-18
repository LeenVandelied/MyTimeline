# Audit tests — Sprint 95

> Généré en fin de Phase 6 (lead, 2026-09-18). `[MISSING]` bloquerait la Phase 9 PR.
> Sprint 100 % frontend : aucun commit `backend/`, aucune migration Flyway.

## Couverture par règle métier / défaut traité

| Règle / défaut | Issue | Cross-system flow | Unit backend | Vitest frontend | E2E parcours | E2E métier |
|---|---|:---:|:---:|:---:|:---:|:---:|
| BR-AUT-003 — politique de mot de passe répliquée côté UI | #508 | NON (réplique locale, aucun appel) | ⚠ N/A | ✅ 14 tests | ✅ `settings-security.spec.ts` | ⚠ N/A |
| Messages d'erreur réseau traduits (400/401/403/500) | #713 | OUI (statuts backend → toast frontend) | ⚠ N/A | ✅ `apiErrorMessages.test.ts` + `apiClient.test.ts` + `ApiErrorTranslatorBridge.intl.test.tsx` | ✅ suite complète verte | ✅ `sprint-95-toast-overlap.spec.ts` provoque un **vrai 400** et asserte le toast |
| 400 signalé une seule fois (`/me/change-password`) | #713 | OUI | ⚠ N/A | ✅ garde mutation-testée | ✅ `settings-security.spec.ts` | ⚠ couvert en unitaire ; pas de parcours E2E dédié → suivi |
| Message d'agenda vide juste (aujourd'hui ≠ aujourd'hui+demain) | #701 | NON (rendu local) | ⚠ N/A | ✅ +2 tests `dashboard-mobile.test.tsx` | ✅ `sprint-90-first-contact`, `sprint-84-section-titles` | ⚠ N/A |
| Recouvrement résiduel du toast — décision B | #714 | NON (géométrie) | ⚠ N/A | ⚠ N/A | ✅ | ✅ `sprint-95-toast-overlap.spec.ts` (3 régimes de viewport + sortie de secours) |

Aucun `[MISSING]`.

## Tests créés

- `frontend/src/components/settings/PasswordStrength.test.tsx` — 6 → 14 tests (#508)
- `frontend/src/components/dashboard/dashboard-mobile.test.tsx` — +2 tests (#701)
- `frontend/src/services/apiErrorMessages.test.ts` — 154 lignes, neuf (#713)
- `frontend/src/services/ApiErrorTranslatorBridge.intl.test.tsx` — 72 lignes, neuf (#713)
- `frontend/src/services/apiClient.test.ts` — +83 lignes (#713)
- `frontend/e2e/sprint-95-toast-overlap.spec.ts` — 443 lignes, neuf (#714)

## Résultats des runs (au HEAD `1d846b09`, lancés par le lead)

- **Backend** : 632 tests, 632 passed, 0 failed (`./scripts/test-quiet.sh backend`)
- **Frontend** : `./scripts/test-quiet.sh frontend` OK — build + tests unitaires + typecheck + lint
- **Prettier** : `npm run format:check` propre sur tout le dépôt (binaire réel, pas sous RTK)
- **E2E** : 422 passed / 8 skipped / 0 failed, 2,7 min, suite COMPLÈTE (430 tests)
    ⚠ dont **10 « passed » vides** (captures visuelles auto-créées) — cf. section dédiée plus bas.
    Portée réelle : **412 tests porteurs**.
  - Pile : `docker compose -p s95e2e --profile e2e` (postgres-e2e 5435, backend-e2e 8085),
    image backend re-taguée depuis `s94e2e-backend-e2e` — valide car **0 commit `backend/`**
    depuis sa création (les 2 derniers, `41aa3c76`/`6c7f4480`, sont antérieurs de 5 min).
  - Frontend servi par `next build` + `next start -p 3000` (webpack), variables proxy posées
    au BUILD. Oracles de santé avant run : `/fr/login` 200, `/api/auth/me` 401, `/fr/dashboard` 307.
  - Pile démontée après le run (conteneurs, volumes, réseau, serveur Next, navigateurs orphelins).

## ⚠ 10 des 422 « passed » sont VIDES — `sprint-77-theme-visual.spec.ts`

Constat établi APRÈS le run, en relisant `git status` (le rapport Playwright, lui, ne le dit pas).

Seules les références `*-chromium-linux.png` sont suivies en dépôt (10 fichiers). Le run local,
sur macOS, cherche des `*-chromium-darwin.png` : elles n'existaient pas. Playwright applique par
défaut `updateSnapshots: 'missing'` → il a **créé 10 nouvelles références et fait passer les
tests**, au lieu d'échouer. Ces 10 tests se sont donc comparés à une image fabriquée dans la
seconde : ils n'ont **rien vérifié**.

- Comptage honnête : **412 tests réellement porteurs** + 10 vides, sur 430 (8 skipped).
- Les 10 PNG `-darwin` générés ont été **supprimés** (jamais commités) : commiter une référence
  produite localement graverait le rendu macOS dans la baseline Linux de la CI.
- `--update-snapshots` n'a jamais été passé — c'est le DÉFAUT de Playwright qui a écrit, pas une
  action délibérée. C'est ce qui rend le piège silencieux.
- **La mémoire projet décrit ce piège comme « 10 faux rouges sur macOS ». Sur cette version de
  Playwright il ne rougit plus : il VERDIT à tort.** Le symptôme s'est inversé, la cause est la
  même (références dépendantes de la plateforme). À re-qualifier en mémoire.
- Conséquence : **seule la CI Linux vérifie réellement ces 10 captures.** Aucune conclusion
  visuelle ne peut être tirée du run local.

## Couverture E2E (heuristique Phase 8)

`[COVERAGE-E2E] OK` — 0 nouveau `data-testid` dans le diff `*.tsx` : aucune dette de couverture.

## Conclusion

Prêt pour PR sous réserve du rapport reviewer (Phase 7).
