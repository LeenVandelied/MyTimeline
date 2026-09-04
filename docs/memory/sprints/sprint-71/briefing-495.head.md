[BRIEFING ISSUE #495]

## Issue
[DESIGN] Étendre l'aperçu épinglé aux 3 surfaces d'édition (handoff §6)

## Contexte

Follow-up détecté pendant le Sprint 70 (issue #326, PR #494).
Source : `docs/memory/sprints/sprint-70/issue-326-done.md`

## Description

Le Sprint 70 a livré l'aperçu live **épinglé en haut du drawer de création** (handoff §6),
par un portail : `EventEditForm` accepte une prop `previewPortalNode` et y portalise son bloc
d'aperçu ; `NewEventDrawer` monte le nœud hôte `.mt-drawer__preview` entre le header et
`.mt-drawer__body`. Voir `PAT-S70-001` dans `docs/memory/patterns.md`.

Le handoff §6 couvre « création **/ édition** », mais le périmètre du S70 a été volontairement
borné au **chemin création** (arbitrage du lead, pour ne pas élargir le risque de régression
sans mandat). Les 3 surfaces d'édition gardent donc l'aperçu **en flux** :
`EventDrawer`, `TimelineEditHost`, `ConflictDialog`.

## À faire

Étendre l'épinglage aux 3 surfaces d'édition, conformément au handoff §6.

## Difficulté réelle — lire avant d'estimer

La prop est **déjà générique** : côté `EventEditForm`, il n'y a rien à écrire. Le travail est
entièrement côté surfaces appelantes, et c'est là qu'est le risque :

- `TimelineEditHost` et `ConflictDialog` **n'ont pas la structure**
  `header / body(overflow:auto) / footer` du drawer — le pattern suppose un nœud hôte **frère**
  de la zone défilante, il faut donc vérifier surface par surface qu'un tel emplacement existe.
- `ConflictDialog` est rendu **PAR** `EventEditForm` (`import { ConflictDialog } from './shared/ConflictDialog'`),
  ce n'est pas un montage séparé du formulaire — le cas est particulier.
- Contrainte de non-régression : `PAT-S44-001` (le mode historique doit rester le défaut).
- ⚠ Si l'aperçu est épinglé sur une surface, **la classe du libellé « Aperçu » bascule aussi**
  (`previewLabelClassName`, `EventEditForm.tsx:365`) : c'est voulu, mais c'est exactement le
  défaut MAJEUR que la review du S70 a attrapé quand le changement fuyait sans mandat. Couvrir
  par un test par surface.

## Triage estimé

S | Domaine : events / design


## Plan d'implementation (arbitrage dev, /sprint start 71)
Pas d'arbitrage produit a rendre : le pattern est deja pose au S70 (`PAT-S70-001`).

- `EventEditForm` accepte deja la prop generique `previewPortalNode` : cote formulaire il
  n'y a NORMALEMENT rien a ecrire. Si tu constates le contraire, dis-le dans le retour
  plutot que d'elargir silencieusement.
- Travail = les 3 surfaces appelantes : `EventDrawer`, `TimelineEditHost`, `ConflictDialog`.
  Verifier SURFACE PAR SURFACE qu'un noeud hote frere de la zone defilante existe :
  `TimelineEditHost` et `ConflictDialog` n'ont PAS la structure header/body(overflow:auto)/footer
  du drawer. Si une surface ne peut pas accueillir le pattern sans restructuration lourde,
  NE PAS la forcer : livrer les autres et remonter le cas en STATUS PARTIAL + BLOQUE_SUR.
- Cas particulier : `ConflictDialog` est rendu PAR `EventEditForm`
  (`import { ConflictDialog } from './shared/ConflictDialog'`), ce n'est pas un montage separe.
- Non-regression `PAT-S44-001` : le mode historique doit rester le defaut.
- Epingler une surface fait aussi basculer la classe du libelle « Apercu »
  (`previewLabelClassName`, `EventEditForm.tsx:365`) : c'est VOULU ici, mais il faut un test
  PAR SURFACE qui le couvre — c'est le defaut que la review du S70 a attrape.
- CONFLIT DE FICHIER : l'issue #496 (vague 2) modifiera les commentaires de
  `EventEditForm.tsx` lignes ~174 et ~289. Evite d'y toucher ; si tu dois absolument editer
  ce fichier, signale-le dans ton retour.

## Triage
Taille: S
Modele: opus
Effort: high
