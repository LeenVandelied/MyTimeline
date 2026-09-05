# Issue #467 — Flakes de virtualisation verticale (ABSORPTION TARDIVE)

**Sprint 64, hors vagues** · priority:P1 · size:M · `epic:infrastructure`
**Absorbée pendant la clôture**, sur arbitrage du dev : le flake faisait rougir le check requis
`e2e` de la PR de sprint et bloquait le merge. Sur les 3 premiers runs CI du sprint, **2 étaient
rouges pour cette seule raison** — ce n'était plus un flake, c'était un gate de fait.

**Commits :** `7275e03` (correctif, 3 fichiers, +105/−1) et `c77b4bd` (correction de l'hypothèse
fausse dans `TimelineView.tsx`, 3e critère d'acceptation).

## Voie retenue, et pourquoi l'autre a été écartée

L'issue offrait deux voies. **Voie 2 retenue — rendre la lane déterministe avant l'assertion.**

La **voie 1 (semis isolé par spec, compte dédié)** est bloquée, et pour des raisons mesurées :
le **rate-limit register est de 5/min/IP** et la suite en consomme déjà 5 (4 comptes `setup` +
l'auto-inscription de `golden-path`) ; le projet Playwright `setup` provisionne les comptes **une
fois** pour toute la suite ; et `PIT-S47-004` — non corrigé, contrairement à ce qu'affirmait la
mémoire du projet — fige `RUN` à l'**import** de `e2e/support/accounts.ts`. C'est précisément
l'objet de l'issue **#469**, créée au triage de ce sprint.

La voie 1 reste la réponse de fond, et le helper le dit explicitement.

## Ce qui a été livré

Un helper `revealSeededLane()` dans **`frontend/e2e/support/timeline-lanes.ts`** (nouveau), appelé
par `timeline.spec.ts` et `timeline-mobile.spec.ts`.

Il amène la lane semée dans la bande de rendu par le seul point d'ancrage **toujours monté** —
l'en-tête de sa catégorie (`timeline-group-head`, rendu pour tous les groupes même sous
fenêtrage) — via `scrollIntoView({ block: 'center' })`.

Deux choix fins, documentés dans le fichier :
- **`center` plutôt que `scrollIntoViewIfNeeded()`** : la lane devient réellement visible et non
  simplement présente dans l'overscan de 320 px, qu'un `resync()` ultérieur
  (`TimelineView.tsx:638`) démonterait ; et elle reste loin de l'en-tête sticky, donc un clic
  ultérieur sur la pastille ne récolte pas d'`intercepts pointer events`.
- **Une assertion de présence sur l'en-tête de catégorie** avant de scroller : son absence
  signalerait un défaut de **semis**, pas de virtualisation. Le helper distingue les deux au lieu
  de laisser un seed raté se déguiser en timeout de 30 s.

## La preuve : deux contrôles négatifs

Sur une frise jetable de 71 lanes (spec de sonde, supprimée depuis) :

```
PROOF  groups=71 targetIdx=61 rowsMounted=15 pillBefore=0 pillAfter=1
```
Le nœud **n'existe pas** (`pillBefore=0`), la parade le monte. 15 lanes montées sur 71 : le
fenêtrage est bien actif.

```
PROOFB atLoad=0 afterReveal=1 afterZoomOut=0 afterReveal2=1
```
**Découverte que personne n'avait anticipée** : un clic sur `timeline-zoom-out` fait **remonter la
page et défait la parade**. Playwright défile jusqu'à un élément avant de le cliquer, et tout
contrôle situé plus haut re-sort la lane de la bande.

C'est ce contrôle qui a tranché le placement : **juste avant l'assertion, pas après `goto`**. Le
premier run complet, avec la parade posée trop tôt, laissait `live-region` rouge exactement comme
avant — le correctif aurait été livré faux sans cette mesure.

## Vérification

**6 runs E2E complets en local**, `workers: 1`, 62 lanes atteintes (seuil de 60 franchi) :

| Run | Résultat | Famille #467 |
|---|---|---|
| 1 | 231/1 — parade mal placée | **rouge** → correctif déplacé |
| 2 | 231/1 | **verts** |
| 3 | 232/0 — tout vert, 7,2 min | **verts** |
| 4 | 230/2 | **verts** |
| 5 | 231/0 — tout vert, 6,8 min (arbre commité) | **verts** |
| 6 | 230/1 | **verts** |

**Famille #467 verte sur 5 runs consécutifs** (2 → 6).

Puis **en CI**, ce que le local ne pouvait pas prouver : runs `33608628176` et `33636168765`
**verts à 7/7**, sur une frise à **99 lanes** contre 62 en local. La parade ne dépend donc pas du
volume — c'était l'inconnue.

## Assertions préservées — vérifié

**Aucune ligne d'assertion n'a été modifiée.** `live-region` vérifie toujours le texte vide au
montage, `Niveau de zoom : Trimestre`, puis `Événement sélectionné : <titre>` après `focus` +
`Enter`. `event-outside-label` vérifie toujours `toHaveText(lowContrastTitle)`, plus une garde
`toHaveCount(1)` et un `toHaveCount(0)` sur le cas contrasté.

**Zéro timeout allongé, zéro `toBeAttached()`, zéro `skip`.** `virtualization.ts`,
`TimelineView.tsx` (hors commentaire), `playwright.config.ts` et `ci.yml` non touchés : le
comportement du **produit** est inchangé.

`tsc --noEmit` EXIT=0, eslint 0 issue.

## 3e critère d'acceptation — traité par le lead

`TimelineView.tsx:532-534` affirmait que « les parcours E2E / frises modestes gardent un DOM
complet, cf. ADR-007 ». C'est **l'hypothèse exacte que ce sprint a mesurée fausse**. Le commentaire
a été réécrit (`c77b4bd`) pour dire pourquoi, avec les chiffres, la distinction produit / test, et
une **interdiction explicite de relever `LANE_VIRTUALIZATION_MIN_ROWS` pour faire passer un test**.

Ce fichier avait été interdit au dev pour qu'il ne touche pas au produit ; la correction étant
purement rédactionnelle, le lead l'a faite lui-même.

## Non prouvé

- **Deux runs locaux ENTIÈREMENT verts consécutifs : non obtenus.** Les runs 3 et 5 sont verts,
  mais pas d'affilée — à cause de **deux flakes préexistants hors famille #467**, découverts au
  passage et désormais suivis par l'issue **#472** : `sprint-62-select-focus-indicator` sur Firefox
  (2 runs sur 5) et une suppression dans `categories.spec.ts` (1 sur 5). Aucun n'implique le helper.
- Le helper **ne borne pas la croissance de la suite** : le compte de test continuera d'accumuler
  des lanes. Toute nouvelle spec qui asserte une lane semée devra l'appeler — c'est écrit dans le
  fichier.
- Les runs 1 à 4 incluaient une spec de sonde jetable (lecture seule, supprimée). Les runs 5 et 6
  portent sur l'arbre commité exact.

## Vérifications faites par le lead

- `git show --stat 7275e03` : 3 fichiers, périmètre conforme (`frontend/e2e/**` uniquement).
- Helper relu sur disque : documente le mécanisme, les deux contrôles négatifs, le motif du
  placement, et ce qu'il **ne** fait **pas**.
- CI verte 7/7 sur deux runs consécutifs, à 99 lanes.
- Fichiers produit non touchés.

## Recommandations suite

- Pas de `RECOMMAND_FOLLOWUP` ouvert : les trois suites identifiées sont déjà tracées — **#469**
  (semis isolé, voie de fond), **#472** (les deux flakes découverts), et la parade elle-même est
  documentée comme telle dans le helper.

STATUS: COMPLETED
