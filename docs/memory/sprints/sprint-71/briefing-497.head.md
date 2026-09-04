[BRIEFING ISSUE #497]

## Issue
[A11Y] Plancher de lisibilité sur les traits peints dans la couleur utilisateur (jusqu'à 1,02:1 mesuré)

## Contexte

Follow-up détecté pendant le Sprint 70 (issue #325, PR #494).
Source : `docs/memory/sprints/sprint-70/issue-325-done.md` et `BUG-S70-001`.

## Description — défaut d'accessibilité MESURÉ

Dans la mini-frise d'aperçu du formulaire d'événement, deux traits sont peints **dans la
couleur choisie par l'utilisateur**, sans aucun plancher de lisibilité :

- le **connecteur pointillé** entre occurrences (`EventPreviewTimeline.tsx:152`) ;
- le **contour de l'occurrence fantôme** (`.mt-evt--draft`, `timeline.css:74`).

Contrastes mesurés au navigateur (WCAG, fond composité, drawer 1280×700) :

| Couleur d'événement | Thème | Connecteur | Contour fantôme |
|---|---|---:|---:|
| Défaut `#3B62D4` | clair | 5,41:1 | conforme |
| Défaut `#3B62D4` | sombre | 3,38:1 | ~3,15:1 |
| Citron (très clair) | clair | **2,20:1** | **2,07:1** |
| Quasi-noir | sombre | **1,02:1** | **1,02:1** |

Le seuil WCAG 1.4.11 (composants non textuels) est de **3:1**. Un utilisateur qui choisit une
couleur claire en thème clair, ou sombre en thème sombre, obtient un aperçu dont la partie
« récurrence » est **invisible**.

Le Sprint 70 a corrigé le cas de la couleur par défaut (retrait d'un `opacity:.8` redondant,
cf. `PIT-S70-003`) mais **pas** les couleurs extrêmes.

## Pourquoi ce n'est pas corrigé au Sprint 70

C'est un **arbitrage de doctrine du design system**, pas une correction visuelle : poser un
plancher de lisibilité sur une couleur choisie par l'utilisateur revient à décider que le DS
peut **modifier** cette couleur au rendu. Cela croise **#352**, qui a classé ce pointillé en
« tier fonctionnel » — sans mesurer le cas nominal.

## À faire

1. Trancher la doctrine : plancher de contraste (ex. mélange progressif vers l'encre jusqu'à
   atteindre 3:1) ? repli sur un token neutre sous le seuil ? contour de renfort ?
2. Implémenter, en restant **theme-aware** (le pire cas n'est pas le même en clair et en sombre).
3. Étendre `e2e/sprint-70-preview-visual.spec.ts` — il mesure **déjà** ces 4 cas, les
   assertions correspondantes sont à durcir une fois la doctrine posée.

## Triage estimé

S | Domaine : events / design


## Plan d'implementation (arbitrage dev, /sprint start 71)
DECISION DEV — DOCTRINE TRANCHEE, NE PAS LA REOUVRIR :
Melange progressif de la couleur utilisateur vers l'ENCRE DU THEME jusqu'a atteindre 3:1.

- Perimetre STRICT : les 2 traits mesures dans l'issue, et eux seuls —
  le connecteur pointille (`EventPreviewTimeline.tsx:152`) et le contour de l'occurrence
  fantome (`.mt-evt--draft`, `timeline.css:74`). Ne PAS appliquer ce plancher aux autres
  surfaces peintes dans la couleur utilisateur : ce serait un elargissement sans mandat
  (c'est exactement le defaut MAJEUR attrape par la review du S70).
- Theme-aware obligatoire : le pire cas n'est pas le meme en clair (couleur tres claire)
  qu'en sombre (couleur quasi-noire). La cible de melange est l'encre du theme courant.
- Le melange doit etre PROGRESSIF (on s'arrete des que 3:1 est atteint), pas un saut a
  l'encre pleine — la teinte choisie doit rester reconnaissable quand c'est possible.
- Le calcul de contraste doit se faire sur le FOND COMPOSITE reellement rendu, comme dans
  les mesures de l'issue. Si une fonction de contraste/melange existe deja sous
  `frontend/src/styles/ds/` ou `frontend/src/lib/`, la reutiliser plutot que d'en ecrire une.
- Tests : `e2e/sprint-70-preview-visual.spec.ts` MESURE DEJA les 4 cas du tableau de l'issue
  — durcir ses assertions au seuil 3:1 plutot que d'ecrire une nouvelle spec. Ajouter des
  tests unitaires sur la fonction de plancher (cas: deja conforme -> inchangee ; citron en
  clair ; quasi-noir en sombre).
- Piege connu : les tests de rendu sous jsdom ne prouvent rien sur le contraste reel —
  la preuve attendue est l'E2E navigateur.

## Triage
Taille: S
Modele: opus
Effort: high
