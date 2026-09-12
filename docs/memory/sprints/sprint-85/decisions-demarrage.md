# Décisions de démarrage — Sprint 85 (2026-09-11)

> Arbitrées au `/sprint start 85` après lecture de `Vue Timeline.dc.html`
> (`maquette-vue-timeline.md`). 001-004 : arbitrage explicite du dev (4 options
> recommandées retenues). 005-006 : défauts du lead, conséquences directes du code.
> À reporter dans `docs/memory/decisions.md` à la clôture.

## DEC-S85-001 — Compteur de l'en-tête de catégorie = nombre de PRODUITS (maquette), pas d'événements (issue #601)
La maquette pose `prods.length` sur l'en-tête de catégorie de la frise ; l'énoncé de #601
(issu de l'audit) demandait « compteur d'événements ». Le `.dc.html` fait foi. La sidebar,
elle, compte les ÉVÉNEMENTS de la catégorie (maquette aussi). Deux compteurs, deux sens :
les libellés accessibles doivent le dire (« 3 produits », « 12 événements »).

## DEC-S85-002 — Légende = marques réellement rendues par la frise ; les entrées fantôme/↻ viennent avec #595
La maquette légende des TYPES DE MARQUES (Événement / Occurrence à venir / Récurrence ↻),
pas les catégories. La frise de prod ne rend ni occurrence fantôme ni connecteur ↻ (#595,
backlog). Une légende ne décrit que ce qui est à l'écran : #592 livre les entrées des
marques rendues ; #595 ajoutera les deux autres (commentaire posé sur #595). La
correspondance couleur ↔ catégorie est portée par les pastilles de la liste des filtres
(critère « légende couleur ↔ catégorie visible sans interaction » de #592).

## DEC-S85-003 — « Nouvel événement » de la barre d'outils : masqué sous 768 px, coexiste au-delà avec celui du shell
Invariant #455/#298 du shell : exactement un déclencheur à toute largeur (FAB `md:hidden`
< 768 px, bouton de nav ≥ 768 px). La maquette montre en desktop le bouton du shell ET le
bouton accent de l'en-tête Timeline (mode `embedded`). Lecture retenue de « aucun doublon »
de #602 : le bouton de la barre d'outils est `hidden md:inline-flex` (jamais peint en même
temps que le FAB) ; ≥ 768 px il coexiste avec le bouton de nav, comme la maquette. Il
ouvre le MÊME `NewEventDrawer` via l'état du shell (un seul drawer monté, jamais un second
`useState`).

## DEC-S85-004 — Sidebar de la frise : permanente ≥ 1024 px, repliée en dessous
≥ 1024 px (`lg`) : sidebar 248 px permanente. < 1024 px (vue desktop de la frise, donc
641-1023 px) : repliée, ouverte par un bouton « Filtres » de la barre d'outils (panneau
superposé ; Échap et clic extérieur ferment ; focus rendu au bouton). Mobile portrait et
paysage (`TimelineMobilePortrait`/`Landscape`) : inchangés, hors périmètre.

## DEC-S85-005 — Sidebar et boutons Aujourd'hui/Nouvel événement : écran `/timeline` seulement (opt-in)
`TimelineView` est monté par TROIS écrans : `/timeline`, le dashboard
(`app/[locale]/(app)/dashboard/page.tsx:237`) et la fiche produit
(`ProductDetailView.tsx:369`), tous via `TimelineEditHost` → `TimelineResponsive`. La
maquette ne place la sidebar et les deux boutons que sur l'écran Vue Timeline ; le
dashboard et la fiche produit ont leur propre CTA de création. → prop opt-in propagée
`page → TimelineEditHost → TimelineResponsive → TimelineView`, défaut = comportement
actuel. En revanche la pastille, le compteur et le résumé plié (#601) vivent dans
`TimelineGroupHead`, partagé : ils s'appliquent aux trois écrans.

## DEC-S85-006 — Couleur de catégorie : `product.category.color`, repli neutre si `null`
`Resource` n'a pas de couleur ; le DTO produit expose `category.color` (hex nullable,
`types/product.ts`). On l'ajoute à `Resource` (champ optionnel, mappé dans
`useDashboardData` et `ProductDetailView`). Couleur `null`/absente : pastille en contour
neutre (`--color-rule-strong`), jamais une teinte inventée. Couleur hors palette : affichée
telle quelle (DEC-S84-001, aucune réécriture).
