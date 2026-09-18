# Review batch frontend — Sprint 90, cycle 1

> Reviewer (lecture seule) sur `a6b39ad..f4a8e1d -- frontend` (44 fichiers). Verdict : **0 CRITIQUE / 0 MAJEUR / 6 MINEUR**.

## Findings
1. **[MINEUR]** `frontend/e2e/sprint-84-section-titles.spec.ts:373-375` — `box.x + width <= 375` sur un `h1` bloc en colonne `flex-col min-w-0` ne peut pas échouer (sa largeur est celle du conteneur). Si `break-words` est retiré, l'assertion reste verte ; seule `scrollWidth` (l.377-381) prouve. Mesurer `h1.scrollWidth <= h1.clientWidth`.
2. **[MINEUR]** `frontend/src/components/shared/EmptyState.tsx:68` — le `role="status"` racine (atomique) englobe désormais le CTA : le lecteur d'écran annonce le libellé du bouton avec le message ; plusieurs régions `status` coexistent sur le dashboard vide. Poser `role="status"` sur le titre, laisser `action` hors région.
3. **[MINEUR]** `frontend/src/components/shared/LoadingSkeleton.tsx:107` — `aria-busy="true"` sur une région `status` qui se démonte sans repasser à `false` : VoiceOver n'annonce jamais « Chargement… » (les `<p role="status">` remplacés l'étaient). Retirer `aria-busy` de la racine ou le limiter à la zone décorative.
4. **[MINEUR]** `frontend/src/components/products/ProductsListView.tsx:228`, `CategoriesView.tsx:113` — le CTA d'état vide ouvre un `Dialog` Radix ; après création l'état vide se démonte et le focus retombe sur `body`. `onCloseAutoFocus` vers `products-new-button` / `categories-new-button`.
5. **[MINEUR]** `frontend/src/components/dashboard/WeekAgenda.tsx:65`, `CompactAgenda.tsx:94` — sans produit, « Ajouter un événement » ouvre un drawer bloqué (BR-EVE-002), détour que la frise vide évite ; incohérent entre les deux écrans. La page connaît `products.length`.
6. **[MINEUR]** `frontend/src/components/dashboard/ProductList.tsx:49`, `ProductCarousel.tsx:60` — libellé « Ajouter un produit » pour un simple lien vers `/products` (second clic nécessaire). Renommer ou ouvrir la création (`?new=1`).

## Vérifié OK par le reviewer
- `golden-path` asserte toujours le nom du produit créé dans la frise ; `toHaveCount(0)` sur `timeline-view` lu après chargement réel.
- Stubs `sprint-85` : `PRODUCTS_LIST_RE` alimente bien la fiche produit (même endpoint `useProductsWithEvents`).
- Aucun import mort dans `dashboard/page.tsx` ; plus aucune citation positive d'`add-product-button`.
- Tokens DS uniquement, aucun hex, aucun emoji ; `border-rule-emphasis` exposé via `@theme inline`.
- CTA d'état vide à côté de `products-new-button` : conforme au handoff (même handler).
- `[productId]/loading.tsx` évite l'héritage du squelette de liste.

## Non vérifié par le reviewer
Exécution des specs sur `f4a8e1d` (depuis : suite lead 377/1 faux rouge darwin), alignement squelette → contenu de `/products` et `/settings`, dashboard vide à 1280×800 avec les CTA.
