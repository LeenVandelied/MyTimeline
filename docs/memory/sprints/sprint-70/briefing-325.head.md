[BRIEFING ISSUE #325]

## Issue
[DESIGN] Vérifier le rendu visuel de la mini-frise d'aperçu (clair/sombre, handoff §6)

## Contexte

Follow-up détecté pendant le Sprint 46 (issue #315, PR #324).
Source : `docs/memory/sprints/sprint-46/issue-315-done.md`

## Description

L'issue #315 a livré la mini-frise de l'aperçu live du drawer de création (`EventPreviewTimeline.tsx`) :
règle temporelle, marqueur TODAY, barre pleine, connecteur pointillé, occurrence fantôme, légende.

**Aucun rendu visuel n'a été vérifié.** Le thème clair et le thème sombre reposent uniquement sur les
tokens du design system, sans inspection navigateur. La conformité au handoff `docs/design/graphite-handoff.md` §6
n'a donc jamais été constatée de visu — seulement déduite de l'usage des tokens.

## À faire

- Inspecter le rendu de l'aperçu en thème clair ET sombre
- Confronter au handoff §6 (règle + TODAY, connecteur pointillé, occurrence fantôme, légende « prochaine occurrence »)
- Vérifier la variante `.mt-evt--preview` (curseur/hover neutralisés — la barre d'aperçu n'est pas interactive)
- Corriger les écarts constatés

## Pourquoi maintenant

À rattacher naturellement à #314 (couverture E2E de l'aperçu, déjà planifiée au Sprint 47) : même surface,
même moment, un seul aller-retour.

## Testids disponibles

`event-form-preview`, `event-form-preview-timeline`, `event-form-preview-ruler`, `event-form-preview-today`,
`event-form-preview-bar`, `event-form-preview-ghost`, `event-form-preview-connector`,
`event-form-preview-recurrence`, `event-form-preview-legend`

## Triage estimé

S | Domaine : events / design

## Origine

`RECOMMAND_FOLLOWUP` remonté par le fullstack-dev pendant le Sprint 46, arbitré en Phase 4 de `/sprint end`.


## Plan d'implementation
(Aucun mini-plan architect : le Sprint 70 n'a PAS été planifié par `/sprint plan`
— les labels `sprint-70` viennent du triage de clôture du Sprint 46. Tu décides de
l'approche d'après l'état vérifié ci-dessous.)

### ⚠ TU ES LA VAGUE 2 — l'aperçu A ÉTÉ DÉPLACÉ juste avant toi

L'issue #326 (vague 1) a été livrée sur cette branche, commit **`22d6eeb`**. Le body de
#325 que tu viens de lire est **antérieur** à ce changement : il décrit l'aperçu à son
ancienne place. **Vérifie l'aperçu à sa position ACTUELLE, pas celle du body.**

Ce que #326 a changé (mesuré par le lead sur `22d6eeb`, pas supposé) :

| Avant (#315, S46) | Après (#326, vague 1) |
|---|---|
| Aperçu dans le flux du formulaire, **sous le champ Couleur**, défilant avec lui (255 px de dérive mesurés) | Aperçu **portalisé hors du corps défilant**, dans un nouveau bandeau `.mt-drawer__preview` monté ENTRE le header et `.mt-drawer__body` |
| Pas de conteneur peint propre | Nouveau conteneur peint : `padding: var(--space-4) var(--space-5)`, `border-bottom: 1px solid var(--color-rule)`, `background: var(--color-surface)`, `flex:0 0 auto`, `:empty{display:none}` (`timeline.css:304-312`) |
| — | Périmètre **drawer `>= lg` uniquement**. La **bottom sheet (`< 1024px`) garde l'aperçu EN FLUX** — divergence assumée et commentée par #326 (la hauteur y est une ressource rare, cf. #79). |
| — | Aucun `position:sticky`, aucun z-index posé (épinglage structurel) |

### Checklist d'entrée — les 4 écarts que la vague 1 SAIT avoir laissés

Ce ne sont pas des hypothèses : l'agent de la vague 1 les a écrits dans son livrable.
Ils sont **le point de départ** de ta vérification, pas sa totalité.

1. **Double filet.** `.mt-drawer__header` et `.mt-drawer__preview` portent chacun un
   `border-bottom: 1px solid var(--color-rule)`, séparés d'environ une interligne →
   à valider clair ET sombre (deux filets parallèles rapprochés = artefact visuel probable).
2. **Hiérarchie typographique.** Le libellé « Aperçu » (`tDetails('preview')`, classe
   `text-ink mb-2 text-sm`) est passé **au-dessus du pli** et jouxte désormais
   `.mt-drawer__subtitle` (mono, 10px, uppercase, `--color-ink-muted`). Deux libellés de
   registres différents collés — à trancher.
3. **Aucune hauteur max** sur le bandeau : une mini-frise haute (récurrence + légende)
   ampute d'autant le corps défilant. **Non mesuré** aux petites hauteurs desktop (< 700 px).
4. `.mt-drawer__preview` n'est **pas** stylé en variante sheet → l'aperçu **mobile est
   strictement inchangé** par #326. Si tu constates un écart au handoff §6 en mobile, il
   est **pré-existant**, pas une régression de la vague 1 — dis-le explicitement.

### État vérifié du composant (mesuré sur `22d6eeb`)

| Élément | Réalité |
|---|---|
| Composant | `frontend/src/components/events/EventPreviewTimeline.tsx` (livré #315, S46) |
| Testids présents (9, vérifiés) | `event-form-preview` (l.135), `-timeline` (139), `-ruler` (140), `-connector` (154), `-bar` (165), `-ghost` (176), `-today` (190), `-legend` (200), `-recurrence` (207) |
| Réutilisations | `Ruler` (#47) et `Cursor` (#47) avec `gutterPercent={0}` ; classes DS `.mt-evt` / `.mt-evt--draft` ; `.mt-tlv__today-badge` ; `.mt-recur` |
| Variante non-interactive | `.mt-evt--preview` — `timeline.css:70-73` : `cursor:default`, `:hover` neutralisé (ombre + `filter:none`), y compris une règle `.dark`/`[data-theme="dark"]` dédiée |
| Couleurs | aucune couleur littérale dans le composant SAUF celle **choisie par l'utilisateur** pour son événement (donnée, pas décoration). Encre calculée par `contrastInk` (`@/lib/color`). |
| Spéc de référence | `docs/design/graphite-handoff.md` §6 (l.197) — « règle + TODAY, connecteur pointillé, occurrence fantôme, légende prochaine occurrence » |

### Ce que le body de l'issue demande, reformulé sans ambiguïté

L'issue est une **vérification**, pas une réécriture. Livrable attendu :
1. une vérification **mesurée** (pas déduite) du rendu en thème clair ET sombre ;
2. la confrontation point par point au handoff §6 ;
3. le contrôle de la variante `.mt-evt--preview` (survol/curseur réellement neutralisés) ;
4. **la correction des écarts constatés** — c'est explicitement dans le body.

Si tu ne constates aucun écart sur un point, dis-le et donne la mesure qui le prouve.
« Conforme » sans chiffre n'est pas un résultat.

## Triage
Taille: S
Modele: opus
Effort: high
