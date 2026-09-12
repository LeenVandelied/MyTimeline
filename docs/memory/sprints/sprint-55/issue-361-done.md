# Issue #361 — Rendre le job `e2e` requis sur la branche `dev`

**Traitée par le lead**, pas par un fullstack-dev : ce n'est pas un changement de code mais une
modification de la configuration du dépôt (protection de branche), qui exige un arbitrage explicite
du mainteneur. Décision prise par le développeur le 2026-07-30 : **ajouter `e2e` seul**.

## Précondition vérifiée avant activation

L'architect exigeait une suite E2E constatée stable **sur 2 runs consécutifs** — sinon rendre le job
requis bloque des merges légitimes. Mesuré sur la PR #402 :

| Run | SHA | Verdict |
|---|---|---|
| [30546123584](https://github.com/LeenVandelied/MyTimeline/actions/runs/30546123584) | `2b2c5a7` | 5/5 verts (dont `e2e`) |
| [30546843949](https://github.com/LeenVandelied/MyTimeline/actions/runs/30546843949) | `911e0fb` | 5/5 verts (dont `e2e`) |

## Commande réellement exécutée

`PATCH` **ciblé** sur `required_status_checks`, et non le `PUT` global documenté jusqu'ici dans
l'en-tête de `ci.yml` : le `PUT` réécrit toute la protection et aurait écrasé `enforce_admins` et
`required_pull_request_reviews` au passage.

```bash
gh api -X PATCH repos/LeenVandelied/MyTimeline/branches/dev/protection/required_status_checks \
  -F strict=true \
  -f 'checks[][context]=backend' \
  -f 'checks[][context]=frontend' \
  -f 'checks[][context]=e2e'
```

## Vérification

| | Avant | Après |
|---|---|---|
| checks requis | `[backend, frontend]` | **`[backend, frontend, e2e]`** |
| `strict` | `true` | `true` |
| `enforce_admins` | `true` | `true` (inchangé) |
| reviews requises | `0` | `0` (inchangé) |

Critère d'acceptation 2 (« une PR dont `e2e` échoue est bloquée au merge ») : **partiellement
prouvé**. La PR #402 est passée à `mergeStateStatus: CLEAN` / `mergeable: MERGEABLE` **après** ajout
du check, ce qui prouve que GitHub évalue bien `e2e` et le trouve satisfait. Le cas négatif — une PR
à `e2e` rouge effectivement refusée — **n'a pas été provoqué** : il faudrait casser volontairement un
test E2E sur une branche jetable. Non fait, à ne pas considérer comme vert.

Critère d'acceptation 3 (commande documentée en en-tête de `ci.yml`) : en-tête réécrit — état actuel
des checks, commande `PATCH` ciblée, avertissement que la liste est **remplacée et non fusionnée**,
et mention que `flyway-smoke` (#356) tourne sans être requis faute d'historique.

## Décision consignée

`flyway-smoke` livré par #356 dans le même sprint n'a **pas** été rendu requis : 2 runs verts
seulement, tous deux sur cette PR, et il dépend de `docker run postgres:16` + `/actuator/health`.
Le rendre requis maintenant reproduirait exactement le risque que #361 documente.

## Recommandations suite

RECOMMAND_FOLLOWUP: provoquer une fois un `e2e` rouge sur une branche jetable pour prouver le cas
négatif du critère 2.
RECOMMAND_FOLLOWUP: rendre `flyway-smoke` requis après quelques sprints d'historique vert.
RECOMMAND_FOLLOWUP: la branche `main` n'a pas été touchée — vérifier si elle doit suivre.

STATUS: COMPLETED
