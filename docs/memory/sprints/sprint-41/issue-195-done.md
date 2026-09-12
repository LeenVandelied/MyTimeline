# Issue #195 — accordéon collapse par produit

RETOUR :
- commits: [deabd414749018e5111546c503d6545db746abe3]
- resume: >
    2e niveau accordéon (produit) imbriqué dans collapse catégorie.
    Fichiers: TimelineView.tsx (état+rendu), timeline.css (styles toggle), TimelineView.test.tsx (+3 tests).
    État: `collapsedResources: Record<resource.id, boolean>` indépendant de `collapsed` (catégorie) et des autres produits.
    Rendu: label produit sticky `<span>` → `<button.mt-tlv__lane-label.mt-tlv__lane-head>` mirror de `mt-tlv__group-head` (chevron `mt-tlv__chev`/`--open`, aria-expanded, clavier natif bouton). testid `timeline-resource-head` sur bouton, `timeline-resource-title` conservé sur span interne. Pastilles non rendues si produit replié (label+toggle restent).
    Nav/focus: `navLanes` saute aussi les ressources repliées (comme catégories) → ←→↑↓ + roving resource-keyé cohérents, tabIndex=0 unique.
    Scroll: aucun mécanisme explicite (parité catégorie) — pur re-rendu React, conteneur garde scrollLeft/Top.
    Tests: collapse produit indépendant / scroll conservé / clavier-focus cohérent. Suite frontend 456/456 verte. tsc --noEmit clean.
- [MEMORY:*] signaux:
    [MEMORY:pattern] Problem: 2e niveau accordéon imbriqué timeline. Solution: réutiliser STRICTEMENT le pattern catégorie (bouton natif aria-expanded + chevron DS + exclusion de la liste de nav clavier `navLanes`), état keyé par resource.id. Anti-pattern: état keyé par index de lane (glisse au collapse — cf MAJEUR-2 #81) ; hook scroll custom (inutile, le re-rendu React préserve le scroll comme pour la catégorie).
- recommandations suite: aucune
- STATUS: COMPLETED
