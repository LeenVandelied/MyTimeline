# Review frontend — Sprint 90, cycle 2 (relecture des correctifs du cycle 1)

> Reviewer (lecture seule) sur `7e5351b..d6f17e4 -- frontend` (commits A `e04f7df`, B `d21235c`, C `ef5a1be`, D `d6f17e4`). Verdict : **0 CRITIQUE / 1 MAJEUR / 2 MINEUR**. Dernier cycle de review autorisé (protocole : re-review max 1 cycle) — la vérification des correctifs qui suivent est faite par le lead (armement E2E).

## Findings
1. **[MAJEUR]** `frontend/e2e/sprint-84-section-titles.spec.ts:368-386` — `scrollWidth <= clientWidth` toujours vacante : le nom testé est `user.username` (≤ 20 car., `e2e/support/accounts.ts:178`), plus long jeton du salut ≈ 21 car. ≈ 250 px estimés (non mesuré) en `text-md` dans une colonne de 343 px. Sans `break-words` (`GreetingHeader.tsx:54`), le jeton tient et les deux assertions restent vertes ; la précondition « ≥ 14 caractères » compte des caractères, pas des pixels. Fix proposé : injecter un jeton plus large que la colonne, précondition en pixels (largeur naturelle `nowrap` > `clientWidth`), puis armer en retirant `break-words`.
2. **[MINEUR]** `frontend/src/components/products/ProductsListView.tsx:96-100`, `CategoriesView.tsx:70-75` — la redirection du focus vers le bouton permanent s'applique même si le drawer est annulé et que le CTA d'état vide existe toujours ; Radix aurait rendu le focus au CTA. Ne rediriger que si le déclencheur n'est plus connecté au DOM.
3. **[MINEUR]** `frontend/src/components/shared/EmptyState.tsx:102` — région `role="status"` insérée déjà peuplée : annonce à l'apparition non garantie selon le lecteur d'écran (limite antérieure, pas une régression ; idem libellé `sr-only` de `LoadingSkeleton`). → suivi : test VoiceOver/NVDA réel.

## Vérifié OK
- A : CTA hors région live, testid racine conservé, libellé `sr-only` du squelette dans la région ; `aria-busy` retiré sans spec qui l'attendait.
- `onCloseAutoFocus` correctement typé et relayé au `DialogContent` Radix, passé aux seuls drawers de création ; test « ouvert depuis Nouveau produit » armé.
- B : les 3 montages de production passent `canCreateEvent` ; `page.test` rougit si la valeur est codée en dur.
- Stub produit de `sprint-90-first-contact` : `getProducts` ne `parse` pas, forme conforme à `productSchema` ; `NewEventDrawer` partage la query du dashboard.
- C : libellés corrigés dans les 4 locales, garde i18n contre la confusion avec les libellés de création.
