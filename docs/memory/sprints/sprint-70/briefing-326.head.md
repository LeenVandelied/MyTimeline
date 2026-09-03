[BRIEFING ISSUE #326]

## Issue
[DESIGN] Aperçu sticky en haut du drawer de création (handoff §6)

## Contexte

Follow-up détecté pendant le Sprint 46 (issue #315, PR #324).
Source : `docs/memory/sprints/sprint-46/issue-315-done.md`

## Description

Le handoff `docs/design/graphite-handoff.md` §6 spécifie que l'aperçu de l'événement reste **collé en haut
du drawer** (sticky) pendant que l'utilisateur fait défiler le formulaire.

L'issue #315 a livré le **contenu** de l'aperçu (mini-frise conforme au handoff) mais **pas son positionnement
sticky** : l'aperçu reste à sa place actuelle dans le flux du formulaire.

## Pourquoi ce n'est pas fait au Sprint 46

Écart assumé et documenté. Hisser l'aperçu en haut du drawer impliquerait `NewEventDrawer.tsx` et modifierait
les **surfaces d'édition partagées** — `EventEditForm` sert à la fois la création (drawer) et l'édition
(`EventDrawer`, `TimelineEditHost`, `ConflictDialog`). Le scope dépassait celui de #315.

## À faire

- Rendre l'aperçu sticky en haut du drawer de création, conformément au handoff §6
- **Sans régresser** les surfaces d'édition qui partagent `EventEditForm` (cf. `PAT-S44-001` : le mode
  historique doit rester le défaut)

## Triage estimé

S | Domaine : events / design

## Origine

`RECOMMAND_FOLLOWUP` remonté par le fullstack-dev pendant le Sprint 46, arbitré en Phase 4 de `/sprint end`.
Classé backlog libre : écart design assumé, sans urgence.


## Plan d'implementation
(Aucun mini-plan architect : le Sprint 70 n'a PAS été planifié par `/sprint plan`
— le milestone #71 et les labels `sprint-70` viennent du triage de clôture du
Sprint 46. Pas d'`architect-plans.md`. Tu décides de l'approche d'après l'état
vérifié ci-dessous + le pack domaine + le body de l'issue.)

### État vérifié par le lead au démarrage (mesuré sur `fd954b2`, pas supposé)

| Vérification | Résultat |
|---|---|
| `grep -rn sticky frontend/src/components/events/` | **0 hit** — aucun sticky sur l'aperçu. #326 est intégralement à faire, aucun NO-OP. |
| Où vit l'aperçu aujourd'hui | `frontend/src/components/EventEditForm.tsx` ~ligne 750, **dans le flux du formulaire, APRÈS le champ Couleur**, dans le bloc `{...}` non-`isCreate`-agnostique. Wrapper : `<div>` + libellé `tDetails('preview')` + `<EventPreviewTimeline .../>`. |
| Composant rendu | `frontend/src/components/events/EventPreviewTimeline.tsx` (livré #315, S46) |
| Drawer de création | `frontend/src/components/events/NewEventDrawer.tsx`. Le corps scrollable est `.mt-drawer__body` (desktop) / `.mt-sheet__body` (compact `<1024px`). `EventEditForm` est monté DEDANS, précédé du sélecteur de produit (`mt-drawer__field`) qui vit hors du formulaire. |
| Précédent de sticky déjà en place dans ce drawer | `.mt-sheet__footer` (#79) — pied sticky obtenu en **sortant** le nœud de `.mt-sheet__body` et en y **portalisant** le contenu depuis `EventEditForm` via la prop `footerPortalNode`. C'est le pattern maison pour « épingler un morceau du formulaire à une extrémité du drawer » ; il existe déjà, il est testé, et il ne duplique aucun markup. |
| Surfaces partagées à ne PAS régresser | `EventEditForm` sert AUSSI l'édition : `EventDrawer`, `TimelineEditHost`, `ConflictDialog`. Cf. `PAT-S44-001` — le mode historique doit rester le défaut. |
| Tokens `z-index` disponibles | `--z-sticky: 10` (`frontend/src/styles/ds/tokens/spacing.css:82`). ⚠ `PIT` connu : `.mt-sheet` / `.mt-actionsheet` partagent `--z-modal` (cf. issue #446) — vérifie l'empilement, ne pose pas un z-index littéral. |
| CSS de l'aperçu | `frontend/src/styles/ds/components/timeline.css:68-73` (`.mt-evt--preview`) |
| Spéc de référence | `docs/design/graphite-handoff.md` §6 (ligne 197) : « **Aperçu live sticky en haut** : mini-frise (ruler, TODAY) … + légende prochaine occurrence » |

### Contrainte de périmètre (tranchée par le lead)

L'issue dit « en haut du **drawer de création** ». Le handoff §6 couvre « création /
édition ». **Périmètre retenu : le chemin CRÉATION uniquement** (`mode="create"`,
donc `NewEventDrawer`). Motif : c'est le texte littéral de l'issue, et étendre le
sticky aux 3 surfaces d'édition partagées (`EventDrawer`, `TimelineEditHost`,
`ConflictDialog`) élargit le risque de régression sans mandat. Si ton implémentation
rend l'extension triviale et sans risque, **ne la fais pas quand même** : signale-la en
`RECOMMAND_FOLLOWUP`.

## Triage
Taille: S
Modele: opus
Effort: high
