# Review batch — Sprint 91 (cycle 1)

**Reviewer :** `ai-env:reviewer`, lecture seule, sur `3e9aa77..863da7b` (commits de code `18c4176` #676, `9b8cd6e` #594, `9d583db` #595).
**Contrainte :** suite E2E complète en cours sur le même worktree → aucune exécution autorisée au reviewer.

## Verdict rendu
**APPROUVÉ — 0 CRITIQUE / 0 MAJEUR / 0 MINEUR.**

Domaines déclarés [OK] : BR-EVE-006/009/011/012/013 ; sémantique `widthPx` (emprise réservée) respectée par ses consommateurs (virtualisation, `ensureVisible`, vues mobiles via `windowEvents`) ; occurrences (borne incluse, horizon 5 ans, plafond 4000, dates locales `parseLocalDate`/`toLocalIsoDate`) ; non-interactivité des marques (`pointer-events:none`, `aria-hidden`, pas de testid) ; a11y du pin (cible 44 px, Label-in-Name, focus visible) ; #676 (mapper unique, 2 appelants) ; `previewTimeline.ts` ré-exporte sans duplication ; CSS sans couleur littérale ; i18n 4 locales ; aucun `console.error/warn` ajouté.

## Non vérifié (déclaré par le reviewer)
- Exécution des specs E2E du sprint (suite en cours, non relançable).
- Rendu visuel réel du pin et des fantômes en clair ET sombre.
- Lecture ligne à ligne de `sprint-91-recurrence-marks.spec.ts` (564 lignes) : échantillonnage seulement.
- Comportement runtime du z-index en paysage (mesuré par l'agent, pas rejoué).

## Appréciation du lead sur la fiabilité de ce verdict
- **Ancrages suspects** : `virtualization.ts:3312`, `TimelineView.tsx:2653/2661-2662` — ces fichiers n'ont pas ce nombre de lignes ; ce sont très probablement des numéros de ligne **du dump de diff**, pas des fichiers. Les [OK] ne sont donc pas vérifiables tels quels.
- Un « 0 finding » sur +3100 lignes dont 3 specs E2E neuves, avec la moitié des vérifications à risque déclarées NON VÉRIFIÉES, **n'est pas une preuve d'absence de défaut** (cf. mémoire « CI verte ≠ page correcte », S48/S53).
- **Compensation décidée par le lead :** (1) vérification visuelle réelle clair/sombre des 3 frises par sonde Playwright jetable après la suite complète ; (2) relecture ciblée par le lead des assertions de `sprint-91-recurrence-marks.spec.ts` (recherche d'assertions vacantes) ; (3) Designer (`RECOMMAND_UI_DESIGN` émis par #594 et #595) pour arbitrer les écarts visuels listés dans les `done.md`.

## Relecture ciblée du lead — `frontend/e2e/sprint-91-recurrence-marks.spec.ts` (564 lignes, lue en entier)

**Solide (non vacant) :**
- Bornes EXACTES : `A_GHOSTS` inclut `addMonths(A_START, 3)` = `A_SERIES_END` → fin de série **incluse** réellement assertée (`:469`), idem B hebdo (`:470`) ; C non bornée coupée à l'étendue et jamais avant son début (`:490-493`).
- Virtualisation réelle : au zoom Jour, `0 < fantômes montés < C_GHOST_COUNT` (`:535-536`).
- Non-pollution du compteur `timeline-event` : exactement 3 occurrences réelles dans la lane (`:420`).
- `↻` PEINT (`toBeVisible`, pas seulement présent) sur la barre et les deux pins (`:423`, `:430`).
- Garde anti-vacuité sur le hit-test : `realsChecked ≥ 3`, `overlaps ≥ 2` (`:407-411`).
- Clic réel sur B posé au-dessus d'un fantôme de A → ouvre le détail de B (`:538-539`).

**[MAJEUR — lead] L'ordre de peinture n'est PAS prouvé, alors que c'est exactement le critère reformulé par l'arbitrage dev** (« une occurrence réelle n'est JAMAIS masquée par un fantôme ou un connecteur »).
- `probeLane` (`:313-385`) utilise `document.elementFromPoint`, qui **ignore** les éléments `pointer-events:none` — or fantômes et connecteurs le sont (asserté `:441`). `realMisses` et `overlapMisses` prouvent donc la **non-captation du clic**, pas que la marque est peinte SOUS l'occurrence réelle.
- Scénario qui reste vert : un `z-index` (ou un ordre DOM inversé) qui peint un fantôme de C PAR-DESSUS la barre de A — visuellement la barre est masquée, le hit-test traverse le fantôme et rend quand même A.
- L'agent l'a lui-même déclaré (« Non prouvé : l'ordre de peinture en E2E ») ; la preuve repose sur un test unitaire d'ordre DOM, qui ne voit ni `z-index` ni contexte d'empilement.
- **Correctif proposé** : dans `probeLane`, poser temporairement `pointer-events:auto` sur toutes les `[data-recurrence-mark]` de la lane AVANT les hit-tests, puis restaurer — `elementFromPoint` rend alors l'élément réellement PEINT au-dessus ; les assertions existantes deviennent une preuve d'ordre de peinture. Armement : contrôle négatif en posant un `z-index` élevé sur `.mt-evt--draft` → la spec doit rougir.

**[MINEUR — lead]** `:450` fige `border-top-style: dashed` du connecteur : si le Designer tranche pour le `1.5px dotted` de la maquette, l'assertion est à mettre à jour (et c'est voulu : elle garde le trait réellement rendu).

## Arbitrage Designer (`ai-env:ui-design`, lecture seule) des écarts visuels déclarés

| # | Écart | Verdict Designer | Décision du lead |
|---|---|---|---|
| 1 | Pin mobile 28 px (paysage 24 px) vs 24 px | APPROUVÉ — = hauteur réelle des barres mobiles de prod | Retenu |
| 2 | Libellé de pin plafonné à 240 px + ellipse | APPROUVÉ — maquette silencieuse | Retenu |
| 3 | Pas de point de statut sur un pin | APPROUVÉ — maquette §2 n'en dessine pas | Retenu |
| 4 | Pointillé d'archivé sur le pin seul | APPROUVÉ — évite la lecture « champ » | Retenu |
| 5 | Plancher de barre 6 px vs `max(12,…)` / `max(14,…)` | **CORRIGER** | **Écarté, motif mesuré** : `.mt-tlv__evt` a `padding:0 10px` (`timeline.css:311`), `.mt-tlm__evt` `padding:0 8px` (`:735`) → une barre est PEINTE sur ≥ 20 px desktop / ≥ 16 px mobile, déjà au-dessus de 12/14 (PIT-S85-004). Relever le plancher de `widthPx` ne change **rien à l'écran** mais change la virtualisation et les assertions de géométrie qui lisent `style.width`. Et ce plancher de 6 est **antérieur au sprint** (`zoom.ts`, `minWidth = 6`), hors périmètre des 3 issues. |
| 6 | Trait de résumé replié d'un ponctuel 6 px centré | SUIVI → reclassé APPROUVÉ (sprint-85/maquette-vue-timeline.md:104) | Retenu |
| 7 | Connecteur DS `2px dashed` vs maquette `1.5px dotted` + `.5` | APPROUVÉ — classe partagée avec l'aperçu, plancher 3:1 #497 | Retenu |
| 8 | Fantômes sans opacity .7 / .65 | APPROUVÉ — planchers de contraste mesurés (#325) priment | Retenu |
| 9 | Filet de légende « Récurrence » en `2px dashed` | APPROUVÉ — la légende montre le trait réellement rendu | Retenu |
| 10 | Pas de fantôme avant le début de série | SUIVI — besoin produit à trancher | → follow-up proposé au `/sprint end` |
| 11a | Couleur de l'entrée de légende « Occurrence à venir » | CORRIGER « à confirmer » | **Vérifié conforme** : `.mt-tlv-side__legend-ghost` = `1.5px dashed var(--color-ink-faint)` + `color-mix(ink-faint 8%, surface)` (`timeline.css:642`), aucune couleur d'événement |
| 11b | `.mt-evt-pin__recur` sans règle dédiée | SUIVI « à confirmer » | **Vérifié intentionnel** : documenté `timeline.css:351-353` (le `↻` du pin hérite de l'encre du libellé) |
| 11c | Distinction réel/fantôme sans couleur seule (WCAG 1.4.1) | APPROUVÉ | Retenu |

**Non vérifié par le Designer :** rendu réel clair/sombre des contrastes des fantômes SUR LA FRISE (#325/#497 mesurés sur l'aperçu du formulaire), alignement des 3 frises côte à côte → couverts par la sonde visuelle du lead.

**Bilan des corrections à appliquer avant PR :** une seule — le MAJEUR du lead sur la preuve d'ordre de peinture (`sprint-91-recurrence-marks.spec.ts`). Aucune correction de code produit.

## Correctif du MAJEUR du lead — `584ccd6`
- `test(timeline)` — 1 fichier (`sprint-91-recurrence-marks.spec.ts`, +130/−71), sur `sprint/91` ; `timeline.css` identique à `9d583db` après armement (vérifié par `git diff --quiet`).
- `probeLane` force `pointer-events:auto !important` en ligne sur toutes les `[data-recurrence-mark]` de la lane pendant les hit-tests (restauration en `finally`) : l'assertion d'ordre de peinture est désormais réelle. Non-captation du clic prouvée séparément AVANT forçage (`pointer-events` calculé = `none` sur toutes les marques, `marksChecked > 0`), + assertion l.441 et clic réel sur B conservés.
- **Armement constaté** : `z-index:50` posé sur les marques → 3/3 frises ROUGES sur « centre des occurrences réelles » (`S91 Série ponctuelle → marque ghost …`, `S91 Série durée → marque connector …`) ; restauré (shasum identique) → 8/8 vert. **Aucun défaut produit révélé.**
- Limite déclarée : l'armement a rougi d'abord sur `realMisses` ; la sensibilité de `overlapMisses` seule n'est pas vérifiée à part. L'ordre n'est prouvé qu'aux points sondés.

## Sonde visuelle du lead (Playwright jetable `zz-lead-s91-visual`, supprimée, non commitée)
Captures réelles (pas de référence écrite) sur `584ccd6`, listing produits stubbé : desktop 1280×800, portrait 390×844, paysage 844×520, **clair et sombre** (classe `dark` vérifiée sur `<html>`), + légende. 11/11 vert. Captures : `scratchpad/s91-visual/*.png` (hors dépôt).
- **Conforme** : pin étroit + libellé `↻ Rappel hebdo` en encre de page ; fantômes de ponctuel en petits carrés ; connecteur pointillé à la couleur de la série ; fantôme de durée en contour pointillé teinté ; libellé du pin lisible au-dessus d'un fantôme d'une autre série (superposition assumée, pas d'empilage) ; légende 3 entrées lisibles en clair et en sombre ; mêmes marques sur les 3 frises.
- **Artefacts de la sonde (pas des défauts)** : la barre réelle de la série mensuelle et un pin passaient sous la colonne sticky desktop (défilement `inline:'start'` de la sonde) ; badge « Aujourd'hui » rogné par l'angle sticky (préexistant, #392).
- **[DÉFAUT PRÉEXISTANT, mesuré] `⋯` des BARRES mobiles illisible en sombre** — contraste mesuré sur les pixels des captures : `⋯` après une barre de durée claire (`#A7B83A`) = **1,07:1** (`#0B0C0E` sur `#131519`) en portrait ET en paysage ; `⋯` après un pin = 15,6:1 ; en clair 19,6:1. Cause : le bouton `⋯` est HORS de la barre (frère dans `.mt-tlm__evt-wrap`) mais reçoit `style={{ color: ink }}` = encre calculée pour le fond de la BARRE. **Identique sur la base `3e9aa77`** (`TimelineMobileLandscape.tsx` base l.326-332) → pas une régression du sprint ; #594 l'a corrigé pour les pins seulement (`timeline.css:749`). Risque symétrique en clair pour une barre foncée à encre blanche. → **follow-up à trier au `/sprint end`** (XS : encre de page pour tous les `⋯`, WCAG 1.4.11 ≥ 3:1).
- **Adjacence portrait** : la fin du libellé d'un pin (« …uel ») bute sur le nom de lane sticky → effet de bord des ~120 premiers px, déjà proposé en follow-up par #594.

## Cycle 2
Non requis par le verdict (aucune correction appliquée). À ouvrir si la compensation ci-dessus produit des corrections — et alors relire ces correctifs eux-mêmes (mémoire « cycle 2 avant PR »).
