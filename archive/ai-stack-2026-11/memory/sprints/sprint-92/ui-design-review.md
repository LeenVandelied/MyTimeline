# Revue Designer — Sprint 92, vague 1 (#621, #603)

> Agent `ui-design`, lecture de code seule (aucun rendu observé), sur `f1bf100` (#603) et `2739675` (#621).
> Vague 2 (#605) : revue à mener après son commit.

## #621 — AppToaster (rendu DS unique des toasts)
- APPROUVÉ — `--z-toast` 60→78 (`spacing.css:87-100`) : > `--z-modal` (70) et `--z-popover-over-modal` (75), < `--z-netbanner` (80) ; ADR-008, #446, #76 respectées.
- APPROUVÉ — position top-right desktop et mobile (`toaster.tsx:31-36`) : FAB bas-droite jamais recouvert ; sous 372 px le toast est pleine largeur.
- CORRIGER — `.mt-toast__title` (`core.css:290`) hérite `--font-ui` ; ajouter `font-family:var(--font-display)` comme `.mt-dialog__title` (`core.css:311`).
- À ARBITRER — `pointer-events:none` sans pause au survol ni fermeture (WCAG 2.2.1 non couvert).
- APPROUVÉ — libellés fr impersonnels (`fr/common.json`) ; écart vouvoiement/tutoiement préexistant.
- APPROUVÉ — variantes success/danger/info, icônes lucide, aucun emoji.

**Arbitrage du dev (2026-09-15) :** pause au survol ET au focus, sans bouton fermer.
**Note du lead :** la piste du Designer (`pointer-events:auto` au seul `:hover`) est irréalisable — un élément en `pointer-events:none` ne reçoit jamais le survol ; le toast doit capter le pointeur.
**Suite :** correctif dispatché (police display + pause survol/focus), briefing `briefing-621-design-fix.md`, spawn ref `0ae6ec9`.

## #603 — ProductsListView
- APPROUVÉ — colonnes conformes au handoff §5 (`ProductsListView.tsx:289-303`).
- APPROUVÉ — ISO garanti par le code (`toLocalIsoDate`), `.mt-date--long` purement typographique (`i18n.css:165-170`).
- APPROUVÉ — paliers responsive : < 640 px Produit / Échéance / Actions ; `sm` + compteur ; `md` + mini-frise.
- APPROUVÉ — contraste catégorie mono : clair ≈ 6,1:1, sombre ≈ 5,8:1 (calcul manuel sur les tokens).

**Verdict #603 : APPROUVÉ.**

## Non vérifié par le Designer (vague 1)
Rendu réel (line-height, troncature), safe-area sur appareil, contraste mesuré par outil, comportement clavier / lecteur d'écran effectif.

---

# Vague 2 — #605 (`ec7a076`)

- APPROUVÉ — hiérarchie des actions (`ProductDetailView.tsx:296-329`) : un seul bouton accent (Nouvel événement), Modifier en outline, Archiver en ghost `text-destructive` ; même trio que `ProductsListView.tsx:400-421`.
- À ARBITRER → **tranché par le lead : garder `destructive`** pour Archiver. Motif (recommandation du Designer) : perte d'accès du point de vue utilisateur, aucun jeton « neutre » dans `colors.css`, cohérence avec la liste et l'archivage des événements. Aucun changement de code.
- APPROUVÉ — « Modifier » conservé (handoff : « Éditer ») : tout le vocabulaire produit dit « Modifier » ; écart documenté dans le code.
- APPROUVÉ — `DeleteConfirmDialog` variante `product` (`:282` confirm `destructive`, `common.json:74-79`) : aucune promesse de restauration, différence voulue avec `archiveDialog` des événements (documentée `DeleteConfirmDialog.tsx:46-58`).
- APPROUVÉ — `ProductDrawer.tsx:430-443` archive ghost + icône `Archive`.
- APPROUVÉ sous réserve — mobile < 400 px : `flex-wrap` aux deux niveaux (`:292`, `:294`), libellés conservés ; wrap non mesuré.

**Verdict #605 : CONFORME.**

## Non vérifié par le Designer (vague 2)
Rendu réel < 400 px, contraste AA réel de `text-destructive` en ghost, `focus-visible` des 3 boutons, locales de/en/es.
