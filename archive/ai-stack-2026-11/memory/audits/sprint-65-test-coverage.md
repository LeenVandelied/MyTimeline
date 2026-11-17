# Audit tests — Sprint 65

> Généré en fin de Phase 6, complété après le cycle 2 de review. Toutes les valeurs
> ci-dessous proviennent de runs RÉELS lus par le lead — aucune n'est estimée.

## Couverture par BR

| BR | Description | Cross-system flow | Unit backend | Integration | Vitest frontend | E2E parcours | E2E métier |
|----|-------------|:---:|:---:|:---:|:---:|:---:|:---:|
| BR-EVE-012 | `recurrenceEndDate` hors DTO de création — **complétée** par l'horizon temporel de #452, non modifiée | NON | ✅ | ⚠ N/A | ⚠ N/A | ⚠ N/A | ⚠ N/A |
| (aucune) | #451 / #469 / #470 ne touchent aucune règle métier — harnais de test et outillage | NON | — | — | — | ✅ | — |

### Justification des `N/A` de BR-EVE-012 — à lire, ce n'est pas une omission
`RecurrenceExpansionService` **n'a aucun appelant dans `src/main`** (vérifié indépendamment par le
lead : `grep RecurrenceExpansion backend/src/main/java` ne rend rien hors du service et de son
interface ; `grep capped frontend/src` rend 0). Le service n'est câblé à aucun contrôleur et son
résultat n'est exposé par aucune réponse d'API. Il est donc **impossible** d'écrire un test
d'intégration, frontend ou E2E qui l'exerce : il n'existe aucun chemin d'appel.

La couverture unitaire est en revanche réelle et sensible (contrôle négatif joué, cf. ci-dessous).
Ce n'est **pas** marqué comme couverture manquante parce qu'il ne s'agit pas d'un test qu'on aurait omis d'écrire,
mais d'un test qui ne peut pas exister tant que le service n'est pas branché — chantier des issues
ouvertes **#439** et **#67**. Consigné en follow-up plutôt que masqué.

## Tests créés / modifiés
- `backend/.../RecurrenceExpansionServiceImplTest.java` — horizon temporel, paramétré WEEK/MONTH/YEAR,
  + cas d'une borne explicite au-delà de l'horizon (BR-EVE-012 : une intention utilisateur n'est
  jamais rognée). **Contrôle négatif joué** : horizon porté de 5 à 400 ⇒ 4 échecs ; fichier restauré
  et re-vérifié. Le test mord donc réellement sur la borne.
- `frontend/e2e/timeline.spec.ts` — nouvelle spec #451 : ancrage temporel au zoom arrière **sans
  rabattement**. **Contrôle négatif joué** : effet `[dayWidth]` neutralisé ⇒ rouge
  (`Expected: 1 / Received: 0`, la pastille du jour 300 ne monte jamais), avec la prémisse
  « pas de rabattement » passée juste avant ; effet restauré ⇒ vert. Complémentaire de la spec #449
  (`timeline.spec.ts:1442`) qui, elle, épingle l'absence de rabattement.
- `frontend/e2e/support/run-lock.ts` — verrou de run (#469), corrigé au cycle 2 de review.
  **Prouvé** : verrou vieux de 300 min détenu par un process vivant ⇒ REFUSÉ (avant le correctif :
  volé, ce qui rouvrait la corruption de `.auth/`).

## Résultats des runs — tous lus, aucun déduit

| Suite | Résultat | Quand |
|---|---|---|
| Backend (`./scripts/test-quiet.sh backend`) | **465 tests, 465 passed, 0 failed**, exit 0 | après le cycle 2 de review |
| Frontend unitaire (Vitest) | **1004 tests / 101 fichiers, 1004 passed**, exit 0 | HEAD |
| E2E Playwright — HEAD final | **240 tests, 232 passed / 0 failed / 8 skipped**, exit 0, 4 min 36 | après le cycle 2 de review |
| E2E — mesure #469 run 1 | 232 passed / 0 failed / 8 skipped, 3 min 59 | `workers: 2` |
| E2E — mesure #469 run 2 | 232 passed / 0 failed / 8 skipped, 3 min 11 | `workers: 2`, consécutif |
| `tsc --noEmit` | 0 erreur | après review |
| `eslint` (fichiers touchés) | 0 problème | après review |

Chaque log E2E a été contrôlé pour ne contenir qu'**UN** bloc `Running N tests using M workers` —
garde-fou anti-campagne-concurrente, ajouté après qu'une mesure du lead a été invalidée par ce
défaut précis (cf. `issue-469-done.md`).

## Contrôle de couverture E2E (Phase 8)
`[COVERAGE-E2E] OK` — **mais le résultat est vide de sens ici** : le diff ne contient aucun nouveau
`data-testid` (aucun fichier `frontend/src/**` n'est modifié par ce sprint), l'heuristique n'avait
donc rien à vérifier. Sur ce dépôt, ce check atteste qu'un testid est *cité* dans `frontend/e2e/`,
jamais qu'une spec passe. Il n'est pas compté comme une preuve dans cet audit ; les preuves sont
les runs ci-dessus.

## Review batch
0 CRITIQUE · 3 MAJEUR · 1 MINEUR — **tous traités et vérifiés au cycle 2** (commit `aa57109`) :
verrou de run cédant à l'âge malgré un process vivant ; trois sources documentaires affirmant encore
`workers: 2` « en cours de validation » ; javadoc présentant le hint `capped` #67/#439 comme un
contrat en vigueur alors qu'il n'a aucun consommateur.

## Conclusion
**Prêt pour PR.** Aucune couverture manquante bloquante.

Réserves explicites, à ne pas confondre avec de la couverture :
1. Le durcissement de #452 porte sur du **code sans appelant** — il ne fait disparaître aucun
   symptôme observable aujourd'hui. C'est une prévention pour le jour où #439 câblera le service.
2. `workers: 2` est acquis **en local seulement**. La CI reste à 1 et sa viabilité n'y est pas
   démontrée (un seul runner/IP, budget `register` déjà au plafond : 5 par run vs 5/min/IP).
