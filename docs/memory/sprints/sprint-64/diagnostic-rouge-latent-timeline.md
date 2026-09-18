# Diagnostic — rouge latent `timeline.spec.ts :: live-region`

**Sprint 64, hors périmètre des 4 issues.** Découvert pendant la vague 1 (#461), diagnostiqué
immédiatement sur décision du dev, tant que la trace existait (expire le 2026-09-08).

**Verdict : `FLAKE` structurel.** Pas une régression, aucun lien avec le sprint.

## Le fait

`frontend/e2e/timeline.spec.ts:966` — `live-region : contenu réel annoncé (zoom puis event
sélectionné), pas juste présence` — **rouge sur 3/3 tentatives** au run `33563972215`
(PR jetable #466, SHA `104b209`). Le même test était **vert** sur `dev` au commit `a5f4636`
(run `33431893101`, 2026-08-31).

## Ce qui a réellement échoué

**Pas l'assertion de zoom.** `expect(live).toHaveText('Niveau de zoom : Trimestre')` **passe** —
le snapshot ARIA de l'artefact (`error-context.md:75`) montre `status: "Niveau de zoom : Trimestre"`.

L'échec est plus loin, ligne **999** : `await pill.focus()` → `Test timeout of 30000ms exceeded`.
Call log identique sur les 3 tentatives :

```
waiting for locator('[data-testid="timeline-event"][data-event-title="Live Prod <ts>"]')
```

**0 élément.** Le nœud n'existe pas dans le DOM — il n'est ni masqué, ni recouvert, ni en retard.

## Cause : le seuil de virtualisation verticale a été franchi

| Source | Fait |
|---|---|
| `frontend/src/components/timeline/virtualization.ts:80` | `LANE_VIRTUALIZATION_MIN_ROWS = 60` |
| `frontend/src/components/timeline/TimelineView.tsx:535-538` | `verticalModel.visibleLaneCount >= 60` ⇒ bande bornée, sinon `UNBOUNDED_BAND` |
| Snapshot ARIA de l'artefact | **76 lanes de catégorie**, 61 `list` — seuil franchi |

La catégorie semée par le test **est bien présente** (`error-context.md:392-395` :
`button "Live Cat 1788300587839842"` + sa `list`), mais **sa liste est vide** : la lane produit est
hors de la bande verticale, la pastille n'est jamais montée, et le test ne scrolle jamais vers elle.

Le commentaire de `TimelineView.tsx:532-534` dit exactement l'hypothèse qui vient de tomber :

> « en dessous, monter toutes les lanes coûte moins cher que les fenêtrer (et **les parcours E2E** /
> frises modestes gardent un DOM complet, cf. ADR-007) »

La suite E2E sème une catégorie et un produit par spec **sans nettoyage**. Elle a fini par dépasser
le seuil qu'ADR-007 supposait hors d'atteinte. Marge actuelle : **76 contre 60** — étroite, et
franchie de façon non déterministe selon les retries des autres specs.

## Pistes écartées, avec la preuve

| Piste | Écartée parce que |
|---|---|
| Réseau / environnement cassé | `0-trace.network` : **93 réponses, statuts `{200, 201, 101}`, zéro 4xx/5xx**. Les seeds ont réussi. C'est le contrôle qu'imposent `PIT-S57-003` et `PIT-S58-003` avant d'accuser le rendu. |
| Changement de traduction | Aucun commit i18n dans le delta — et la chaîne `Trimestre` a **bien** été annoncée. |
| Bug produit `#330-fix` (pastille à 150 px sous un en-tête sticky de 168 px) | Ce défaut produit `intercepts pointer events` **au clic**. Ici le test passe par `focus()` clavier, et l'élément est **absent**, pas recouvert. |
| Contention / timing | Job `e2e` vert : 13 min 14 s. Rouge : 13 min 31 s. **Écart 2 %.** |
| Le delta `a5f4636 → 104b209` | `zz-461-proof.spec.ts` fait un `goto('/fr')` public et cible un testid inexistant : **zéro seed**, ne pousse pas `visibleLaneCount`. Son nom `zz-*` le fait passer **après** `timeline.spec.ts`. Le reporter `html` écrit en fin de run, pas pendant. |

## Non reproductible en isolation — par construction

`npx playwright test timeline.spec.ts -g "live-region"` ne sème qu'une catégorie ⇒
`visibleLaneCount` très en dessous de 60 ⇒ virtualisation désactivée ⇒ **le test passe**.
Il faut l'état de base cumulé d'un run complet, que ce poste ne supporte pas encore (c'est #465).
C'est ce qui rend ce flake coûteux : il n'apparaît qu'en suite complète, et disparaît dès qu'on
l'isole pour l'observer.

## Correctif suggéré — NON APPLIQUÉ, hors périmètre du Sprint 64

`frontend/e2e/timeline.spec.ts:998-1000`. Rendre la lane déterministe **avant** `focus()` :
scroller le rail sur la catégorie semée (`getByRole('button', { name: cat.name })` puis
`scrollIntoViewIfNeeded()`), ou replier les autres catégories. Un `toHaveCount(1)` ne suffirait
pas — le nœud n'existe pas, il n'est pas seulement invisible.

Plus robuste, et probablement la vraie réponse : **semer dans un contexte isolé** (utilisateur
dédié par spec) pour rester structurellement sous le seuil. La croissance de la suite continuera
sinon de rapprocher d'autres tests de la même falaise.

## Portée

Ce flake **fera rougir le check requis `e2e`** sur la PR de sprint s'il se reproduit. Il ne dépend
d'aucune des 4 issues du Sprint 64 et n'est corrigé par aucune d'elles. Décision de traitement :
à arbitrer par le dev.

Artefact source : run `33563972215`, artefact `playwright-report` (8 939 127 o), **expire le
2026-09-08T22:12:47Z**.

STATUS: COMPLETED
