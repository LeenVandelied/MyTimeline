# Audit tests — Sprint 76

> Généré en fin de Phase 6. Une cellule marquée MANQUANT (le marqueur entre crochets que le
> garde-fou de Phase 9 grep) bloque la PR. ⚠ Le garde-fou est un `grep` littéral : il ne
> distingue pas un CONSTAT d'une simple MENTION du marqueur — d'où sa périphrase ici.
> Périmètre : `f753cc8..HEAD` (4 issues, une vague de 4 agents parallèles).

## Couverture par issue

| Issue | Nature | Cross-system flow | Unit backend | Intégration | Vitest frontend | E2E | Verdict |
|---|---|:---:|:---:|:---:|:---:|:---:|---|
| #175 | refactor backend (SQL) | NON | ✅ | ✅ | ⚠ N/A | ⚠ N/A | couvert |
| #237 | filtrage client TanStack | NON | ⚠ N/A | ⚠ N/A | ✅ | ⚠ N/A | couvert |
| #310 | garde anti-boucle 409 | NON | ⚠ N/A | ⚠ N/A | ✅ | ❌ absent | couvert (voir §Écart) |
| #527 | mesure a11y (spec seule) | NON | ⚠ N/A | ⚠ N/A | ⚠ N/A | ✅ | couvert |

Aucune issue de ce sprint n'est un flux cross-system (2+ systèmes/rôles) : aucun E2E métier n'est
donc exigé au sens de la règle. #310 est le seul cas discutable — un conflit 409 suppose deux
écritures concurrentes — mais les deux écritures appartiennent au **même** utilisateur (l'ownership
est requis pour atteindre le flux), donc pas de franchissement de rôle.

## Tests créés

- `backend/.../EventDeleteStatisticsIntegrationTest.java` — compte d'instructions JDBC via
  `Statistics.getPrepareStatementCount` (#175, 3 tests)
- `backend/.../EventOptimisticLockConflictIntegrationTest.java` — `concurrentEditThenDelete_deletionWins`
  + contrôle négatif `legacyDeletePath_underSharedPersistenceContext_didRaiseOptimisticLock` (#175 cycle 2)
- `frontend/src/contexts/NetworkStatusContext.test.tsx` — 3 tests, 2 `useQuery` réelles + 1 query
  orpheline (#237)
- `frontend/src/hooks/useEventEditConflict.test.tsx` — 4 tests (#310)
- `frontend/src/components/shared/ConflictDialog.test.tsx` / `.intl.test.tsx` — +3 tests (#310)
- `frontend/e2e/sprint-76-legal-visual.spec.ts` — 727 lignes, 10 tests de mesure (#527)

## Contrôles négatifs joués — le seul critère qui distingue une spec qui PROUVE d'une spec qui PASSE

| Issue | Mutation introduite | Résultat |
|---|---|---|
| #237 | predicate retiré | 2 failed (exit 1) |
| #237 | `type: 'active'` retiré | 1 failed (exit 1) |
| #310 | garde retirée | 2 failed (8 appels au lieu de 4, 10 au lieu de 8) |
| #175 | ancien chemin rejoué sous contexte partagé | conflit optimiste levé — prouve la bascule |
| #527 | seuils durcis (4,5→6,5 ; tolérance→-30) | 6 failed / 4 passed (exit 1) |
| #527 | mutants retirés | 10 passed (exit 0) |

Ce dépôt est déjà passé « tout vert » avec cinq specs jamais exécutées : c'est la raison d'être de
ce tableau.

## Écart assumé — #310 sans E2E

Le check heuristique de couverture E2E remonte un **MAJEUR** : le testid de production
`conflict-dialog-keep-mine-exhausted` (`ConflictDialog.tsx`) n'est cité par **aucune** spec E2E.
Il est couvert par 2 fichiers de tests unitaires, dont un contrôle négatif qui rougit.

Assumé, pour trois raisons : l'énoncé de #310 autorise explicitement « unitaire **ou** E2E » ; la
stack E2E était attribuée en exclusivité à #527 sur cette vague (working tree partagé) ; et
provoquer un 409 de contention réelle en E2E exige deux écritures concurrentes sur le même event,
ce qui dépasse le périmètre d'une issue XS. Plan : `/create-e2e` après merge.

⚠ Les 4 autres testids remontés par le check brut (`ko-status`, `ok-status`, `retry`, `retrying`)
appartiennent au **harnais de test** de `NetworkStatusContext.test.tsx`, pas à l'UI de production —
le glob `*.tsx` du protocole ne fait pas la distinction. Faux positifs.

## Résultats des runs (codes de sortie LUS, jamais le texte — RTK falsifie les sorties)

- **Backend** : `./scripts/test-quiet.sh backend` → Tests run **566**, Failures 0, Errors 0,
  BUILD SUCCESS, **EXIT=0**. ArchUnit inclus et vert.
- **Frontend unitaire** (au HEAD final, tous commits fusionnés) : **111 fichiers / 1261 tests
  passed**, **EXIT=0**, 22,5 s.
- **`next build`** : **EXIT=0**, « Compiled successfully », 58 routes, `/privacy` et `/terms`
  prérendues sur les 4 locales. **Joué par le lead** — les trois agents frontend en étaient
  empêchés par la partition de stack, c'était le trou de la vague.
- **E2E** : voir §E2E ci-dessous.

## E2E

⚠ **Le conteneur backend e2e du worktree était périmé de ~13 h** (image bâtie le 2026-09-04 12:15,
commit backend du sprint le 2026-09-05 01:23). Il a été **reconstruit** avant le run
(`docker compose --profile e2e up -d --build backend-e2e`, ports `E2E_POSTGRES_PORT=5436` /
`E2E_BACKEND_PORT=8086` — les défauts 5435/8085 sont squattés par d'autres worktrees du même
projet). Sans cette reconstruction, l'E2E aurait exercé le backend d'avant #175.

Recette : `npx next dev -p 3000` (webpack, PAS turbopack — worktree multi-lockfiles), oracle
`/api/auth/me` → **401** vérifié avant lancement, `PLAYWRIGHT_BASE_URL=http://localhost:3000`,
**1 worker** (choix délibéré : le parallélisme local a un historique de faux rouges sur les specs
`settings`, un signal interprétable du premier coup valait le temps supplémentaire).

**Résultat : 296 passed / 0 failed / 9 skipped, en 11,0 min, EXIT=0.**

La spec `sprint-76-legal-visual.spec.ts` de #527 a bien tourné dans la suite complète (10 tests,
dont ses 2 auto-contrôles de harnais) et cohabite sans interférence avec
`sprint-75-legal-pages.spec.ts`.

Les **9 skippés sont pré-existants** et non introduits par ce sprint : `auth-signature.spec.ts`
(3 `test.skip` conditionnels — exige la recette à clé appairée du runbook, non montée ici),
`auth-guard.spec.ts` (1 skip conditionnel) et `settings-profile.spec.ts` (`test.fixme` connu sur
l'upload d'avatar).

## Conclusion

**Prêt pour PR.** Aucune cellule manquante. Les quatre oracles sont verts et leurs codes de sortie ont
été lus explicitement : backend 566/566, frontend unitaire 1261/1261, `next build` compilé,
E2E 296 passed / 0 failed.

Ce qui reste NON couvert, et qu'il faut dire :
- #310 n'a **pas** d'E2E (voir §Écart) — couverture unitaire avec contrôle négatif.
- #175 n'est pas mesuré sur un aller-retour HTTP réel (MockMvc + services réels) ; son oracle est
  la suite d'intégration Testcontainers, qui bâtit depuis les sources.
- L'auto-flush du bulk JPQL de #175 reste **NON VÉRIFIÉ** (sans impact : `EventServiceImpl` est le
  seul appelant et n'a rien en attente au moment de l'appel).
- Le plafond de 3 tentatives de #310 n'est calibré sur aucune donnée de contention réelle.
- Deux défauts **réels mais hors périmètre** ont été trouvés par le balayage de #527 et
  délibérément non corrigés : le `<h1>` à 57 px qui déborde sous 640 px dans les 4 locales
  (pré-existant, commit `2a2cd9a`), et les 20 intitulés de `legal.json` restés en français en
  `en`/`es`/`de`. Les deux partent en follow-up au triage de clôture.
