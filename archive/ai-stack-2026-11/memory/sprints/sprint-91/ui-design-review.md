# Revue ui-design — Sprint 91 (traitement des signaux RECOMMAND_UI_DESIGN de #594 et #595)

**Spécialiste :** `ai-env:ui-design`, spawné par le lead après implémentation (lecture seule, aucune exécution — suite E2E en cours sur le worktree).
**Signaux traités :** `RECOMMAND_UI_DESIGN` émis par `issue-594-done.md` (écarts visuels du pin) et `issue-595-done.md` (opacités des fantômes, trait du connecteur).
**Sources lues par le Designer :** `sprint-91/maquette-frise-instant-serie.md`, `sprint-85/maquette-vue-timeline.md`, `issue-594-done.md`, `issue-595-done.md`, `frontend/src/styles/ds/components/timeline.css`, `EventPin.tsx`, `TimelineSidebar.tsx`.
**Verdict brut :** CORRECTIONS REQUISES (n°5) ; n°6, n°10 et légende en SUIVI « à confirmer ».

## Arbitrage et décision du lead

| # | Écart | Verdict Designer | Décision du lead |
|---|---|---|---|
| 1 | Pin mobile 28 px (paysage 24 px) vs 24 px | APPROUVÉ — = hauteur réelle des barres mobiles de prod | Retenu |
| 2 | Libellé de pin plafonné à 240 px + ellipse | APPROUVÉ — maquette silencieuse | Retenu |
| 3 | Pas de point de statut sur un pin | APPROUVÉ — maquette §2 n'en dessine pas | Retenu |
| 4 | Pointillé d'archivé sur le pin seul | APPROUVÉ — évite la lecture « champ » | Retenu |
| 5 | Plancher de barre 6 px vs `max(12,…)` / `max(14,…)` | CORRIGER | **Écarté, motif mesuré** : `.mt-tlv__evt{padding:0 10px}` (`timeline.css:311`) et `.mt-tlm__evt{padding:0 8px}` (`:735`) → une barre est peinte sur ≥ 20 px desktop / ≥ 16 px mobile, déjà au-dessus de 12/14 (PIT-S85-004). Relever le plancher de `widthPx` ne change rien à l'écran mais change la virtualisation et les assertions qui lisent `style.width`. Plancher antérieur au sprint (`zoom.ts`, `minWidth = 6`). |
| 6 | Trait de résumé replié d'un ponctuel 6 px centré | SUIVI → reclassé APPROUVÉ (`sprint-85/maquette-vue-timeline.md:104`) | Retenu |
| 7 | Connecteur DS `2px dashed` vs maquette `1.5px dotted` + `.5` | APPROUVÉ — classe partagée avec l'aperçu, plancher 3:1 (#497) | Retenu |
| 8 | Fantômes sans opacity .7 / .65 | APPROUVÉ — planchers de contraste mesurés (#325) priment | Retenu |
| 9 | Filet de légende « Récurrence » en `2px dashed` | APPROUVÉ — la légende montre le trait réellement rendu | Retenu |
| 10 | Pas de fantôme avant le début de série | SUIVI — besoin produit à trancher | → triage des follow-ups (`/sprint end 91`, Phase 4) |
| 11a | Couleur de l'entrée de légende « Occurrence à venir » | CORRIGER « à confirmer » | **Vérifié conforme** : `.mt-tlv-side__legend-ghost` = `1.5px dashed var(--color-ink-faint)` + `color-mix(ink-faint 8%, surface)` (`timeline.css:642`) |
| 11b | `.mt-evt-pin__recur` sans règle dédiée | SUIVI « à confirmer » | **Vérifié intentionnel** : documenté `timeline.css:351-353` |
| 11c | Distinction réel/fantôme sans couleur seule (WCAG 1.4.1) | APPROUVÉ | Retenu |

## Compensation de ce que le Designer n'a pas pu vérifier
Rendu réel clair/sombre des 3 frises → sonde Playwright jetable du lead sur `584ccd6` (desktop 1280×800, portrait 390×844, paysage 844×520, classe `dark` vérifiée) : rendu conforme ; un défaut **préexistant** mesuré (`⋯` des barres mobiles à 1,07:1 en sombre, identique sur la base `3e9aa77`) → triage des follow-ups. Détail : `review-batch.md`.

## Bilan
Aucune correction de code produit retenue. Les deux signaux `RECOMMAND_UI_DESIGN` sont traités (spécialiste spawné, verdict arbitré ci-dessus).
