# Issue #392 — [BUG] En-tête de lane sticky rendant des événements inatteignables à la souris

**Sprint :** 56 | **Vague :** 1 (parallèle avec #393) | **Triage :** S
**Commit :** `143edc0`
**Base spawn :** `8ec1a2a` (rebasé de fait sur `9737d5b`, commit de #393, sans conflit)
**Vérifié par le lead :** portée du commit conforme à la propriété de fichiers déclarée —
aucun empiétement sur les fichiers de #393.
**Fichiers du commit :** `frontend/src/components/timeline/TimelineView.tsx`,
`frontend/src/components/timeline/TimelineView.test.tsx`,
`frontend/src/styles/ds/components/timeline.css`, `frontend/e2e/timeline.spec.ts`
(`spacing.css` NON modifié : le token `--lane-header-w` était déjà correct, c'est la
piste qui l'ignorait)

---

## Cause exacte (mesurée, pas déduite)

`.mt-tlv__lane-label` est `position:sticky; left:0` et **opaque** : il recouvre en
permanence les `--lane-header-w` (168 px) premiers pixels du viewport de la frise.
Défiler vers la droite l'emporte avec le viewport — le recouvrement ne diminue jamais.
`computeRange` (zoom.ts, `padDays = 30`) pose `rangeStart` 30 jours avant le 1er event,
donc le 1er event est à `30 × dayWidth` :

| Zoom | dayWidth | 1er event | verdict |
|---|---|---|---|
| Jour | 96 | 2880 px | OK |
| Semaine | 34 | 1020 px | OK |
| Mois | 12 | 360 px | OK |
| **Trimestre** | 5 | **150 px** | **< 168 → inatteignable** |
| **Année** | 2.2 | **66 px** | **< 168 → inatteignable** (non cité par l'issue) |

L'issue ne mentionnait que « Trimestre ». **Année était cassé aussi, et plus fort.**

## Option retenue : GOUTTIÈRE DE PISTE (option « offset minimal »)

Une gouttière de `--lane-header-w` est réservée en tête de rail ; tout le contenu
positionné (graduations, week-ends, ligne TODAY, pastilles) y est décalé. À
`scrollLeft = 0` l'en-tête occupe exactement la gouttière et la piste commence là où il
s'arrête : **aucune pastille ne peut naître sous lui, à aucun zoom** (l'offset est en px,
donc indépendant de l'échelle px/jour).

**Pourquoi PAS `pointer-events:none`** (l'option la plus tentante) : l'en-tête EST
interactif — c'est le bouton d'accordéon produit (#195). Le neutraliser aurait échangé
ce bug contre la perte du repli de lane, avec un test vert. Un bornage (pseudo-élément,
`auto` restauré sur le contenu) restait possible mais laissait la pastille *visuellement*
sous l'en-tête opaque : cliquable à l'aveugle, donc toujours invisible. La gouttière ne
touche **aucune capture de pointeur**.

**Pourquoi `margin-left` en CSS et pas un padding ni un wrapper** : les éléments à décaler
sont tous `position:absolute`, or `left` se résout sur la boîte de *padding* du conteneur
— un `padding-left` ne les déplace pas. La marge s'ajoute au `left` calculé, sans toucher
au DOM ni au contrat de props d'`EventPill` (fichier de test propriété de #393).

**Pourquoi PAS un `padDays` dépendant du zoom** (l'autre façon d'obtenir l'offset) :
`rangeStart` deviendrait fonction du niveau de zoom → `indexEventsByResource` (mémoïsé sur
`[events, rangeStart, now]`) serait recalculé à chaque changement de zoom, ce qui défait
explicitement l'optimisation #349 (« le zoom ne change que l'échelle px/jour : il n'a
aucune raison de recalculer la géométrie en jours »).

## Conséquence : deux repères, désormais nommés

- repère **PISTE** : `leftPx` des events / graduations, origine = `rangeStart` ;
- repère **RAIL** : ce que mesure `scrollLeft`, origine = bord du rail = piste + gouttière.

Le JS (`LANE_TRACK_OFFSET_PX`, TimelineView.tsx) ne sert QUE là où l'on raisonne en repère
rail : largeur du rail, `scrollToToday`, minimap (`trackWidth` distingué de `railWidth`
pour qu'elle ne dérive pas), bande de virtualisation horizontale (recalage sans lequel la
fenêtre de rendu était décalée de 168 px — masqué par l'overscan de 600 px, donc dormant).

Un cas est laissé **volontairement** en repère piste : `scrollLeft = offsetDays × dayWidth`
(raccourcis `T` / `[` / `]`). Il amène le jour visé juste APRÈS l'en-tête ; le convertir
l'aurait collé au bord gauche, donc sous l'en-tête — le défaut même qu'on corrige.

## Effet de bord traité (trouvé à l'écran, pas en test)

`buildRulerTicks` émet des graduations à offset NÉGATIF (1re frontière de mois avant
`rangeStart`). Hors rail elles étaient invisibles ; la gouttière les faisait apparaître
comme un libellé de date flottant au-dessus de la colonne produit. Corrigé par un coin
haut-gauche sticky (`.mt-tlv__ruler::before`) qui masque la gouttière sur la règle — la
gouttière devient une colonne continue de haut en bas.

## Preuve

- **E2E rouge AVANT, vert APRÈS** (`e2e/timeline.spec.ts`, describe `#392`) : oracle mesuré
  `pastille démarre à 150px … sous les 168px recouverts`, puis `PASS`. Le clic est un
  `click()` SANS `force` : c'est le hit-test de Playwright qui fait foi.
- Fixture **stubbée** (1 produit / 1 event daté du jour) : sur le compte PROD partagé,
  `rangeStart` dépend du minimum des dates de TOUS les events du run — la prémisse
  « 30 jours après `rangeStart` » n'y est pas un contrat et le test serait devenu vert à
  vide.
- Invariant de non-régression exprimé en repère rail (donc indépendant du scroll) :
  `pillRailX >= headWidth`, vérifié sur les **5** niveaux de zoom.
- Contre-preuve exigée par le plan : test dédié « l'en-tête reste cliquable
  (repli/dépliage) au zoom Trimestre » — il serait rouge avec un `pointer-events:none`
  non borné.
- Navigateur : captures aux zooms Mois / Trimestre / Année / Semaine+T — alignement
  règle ↔ trame de lane ↔ pastilles vérifié, gouttière propre.

## Suites

`vitest run` 839/839 ✓ · `tsc --noEmit` 0 erreur · `eslint` 0 · E2E `timeline.spec.ts`
30/30 ✓ (+ `timeline-mobile`, `golden-path` verts).
Suite E2E complète : 125 passed / 9 skipped / **3 failed hors périmètre**
(`forgot-password`, `reset-password-failures` × 2) — toutes sur l'endpoint test-only de
token de reset (`HTTP 401`) : le backend local tourne sans le profil `e2e` du runbook
S47. Aucune ne charge `/timeline`.

## Recommandations suite

> **Section reconstituée par le lead pendant `/sprint end 56` (2026-08-16), pas par le
> subagent.** Le done.md d'origine s'arrêtait à la ligne précédente : ni section
> « Recommandations suite », ni ligne `STATUS`. Le contenu ci-dessous est déduit du corps
> de l'artefact et du commit `143edc0` (mergé dans `dev` via PR #410 le 2026-07-31), pas
> d'un retour de subagent. Aucun signal n'a donc pu être perdu en silence — mais aucun
> n'est non plus attesté par l'agent qui a fait le travail.

- `RECOMMAND_FOLLOWUP` (XS) — 3 échecs E2E hors périmètre (`forgot-password`,
  `reset-password-failures` × 2) dus à l'absence du profil `e2e` sur le poste local. Même
  racine que le follow-up de #391 (outillage E2E local non reproductible). À fusionner avec
  lui plutôt qu'à traiter séparément.
- Pas de `RECOMMAND_DB_EXPERT` : aucune migration, aucun fichier `.sql` dans le commit.
- Pas de `RECOMMAND_SECURITY` : aucun chemin d'auth, de PII ni d'API externe touché — le
  diff est confiné à la géométrie de la frise (CSS + positionnement).
- Pas de `RECOMMAND_TEST_RUNNER` : 839 unitaires / 30 E2E timeline, sous les seuils.
- Pas de `RECOMMAND_UI_DESIGN` : la gouttière consomme le token `--lane-header-w` existant,
  aucune nouvelle valeur visuelle introduite.

STATUS: COMPLETED
