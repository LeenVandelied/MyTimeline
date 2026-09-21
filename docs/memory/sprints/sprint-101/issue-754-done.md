# #754 — Cibles tactiles sous 44 px hors réglages — DONE

Commit : `3db3c867` (`:bug: fix(ui): cibles tactiles 44 px hors réglages — drawers, dialogues, croix et rangées denses (#754)`), base `449ad984`.

## Résumé

- Source unique `frontend/src/lib/touchTarget.ts` : `TOUCH_TARGET_BUTTON` (`max-md:h-11`), `TOUCH_TARGET_ICON_BUTTON`, `TOUCH_TARGET_HITBOX` (pseudo `::before` 44×44, PAT-S24-002). `settings/touchTarget.ts` ré-exporte sous les anciens noms : 0 diff chez les 7 importeurs des réglages.
- Croissance réelle `max-md:h-11` (table « surfaces spacieuses » de l'arbitrage) : pieds de `ProductDrawer`, `CategoryDrawer`, `EventEditForm` (création `NewEventDrawer` et édition `TimelineEditHost`), `DeleteConfirmDialog`, `ArchiveConfirmDialog`, `RestoreProductDialog`, `ConflictDialog` (4 boutons), « Réinitialiser » de couleur (produit, catégorie), CTA d'état vide `ProductCarousel`/`ProductList`/`WeekAgenda`/`CompactAgenda`/`ProductsListView`.
- Pseudo-hitbox (table « rangées denses ») : `DensityRibbon` « Ouvrir la frise », `ArchivedProductsView` « Désarchiver », `ProductsListView` éditer/archiver, `CategoriesView` supprimer, `ProductDetailView` désarchiver (historique).
- Croix de `DialogContent` : spéc commune #754/#757 appliquée telle quelle (16×16 → 44×44 en `max-md:`, `-top-2 -right-2` inchangé, fond opaque). Le CSS #757 est donc dans CE commit.
- Exemption sans correctif : `TimelineView` `timeline-new-event` (`hidden md:inline-flex`, jamais peint sous 768 px).
- 3 contrôles HORS arbitrage trouvés par la mesure, corrigés avec les outils approuvés (cf. Écarts).

## Fichiers

- `frontend/src/lib/touchTarget.ts` (nouveau), `frontend/src/lib/touchTarget.test.ts` (nouveau)
- `frontend/src/components/settings/touchTarget.ts` (ré-export)
- `frontend/src/components/ui/dialog.tsx` (croix), `frontend/src/components/ui/dialog.test.tsx` (+1 test #754)
- `frontend/src/components/shared/DeleteConfirmDialog.tsx`, `shared/ConflictDialog.tsx`, `products/RestoreProductDialog.tsx`, `events/ArchiveConfirmDialog.tsx`
- `frontend/src/components/products/ProductDrawer.tsx`, `categories/CategoryDrawer.tsx`, `EventEditForm.tsx`
- `frontend/src/components/dashboard/ProductCarousel.tsx`, `ProductList.tsx`, `WeekAgenda.tsx`, `CompactAgenda.tsx`, `DensityRibbon.tsx` (+ JSDoc flottaison)
- `frontend/src/components/products/ProductsListView.tsx`, `ArchivedProductsView.tsx`, `CategoriesView.tsx`, `ProductDetailView.tsx`
- `frontend/e2e/sprint-101-touch-targets.spec.ts` (nouveau)

## Mesures

375×812, `getBoundingClientRect` (avant = 449ad984, même spec) :

| Contrôle | Avant | Après |
|---|---|---|
| Croix `DialogContent` (7 dialogues mesurés) | 16×16 | 44×44 |
| Pieds ProductDrawer / CategoryDrawer (annuler, créer/enregistrer, archiver/supprimer) | h 36 | h 44 |
| « Réinitialiser » couleur (produit, catégorie) | 104×32 | 104×44 |
| DeleteConfirmDialog, RestoreProductDialog, ArchiveConfirmDialog, ConflictDialog (2 boutons chacun) | 325×36 | 325×44 |
| Pied EventEditForm (création + édition : supprimer, annuler, soumettre) | h 36 | h 44 |
| `event-form-color-input` (champ natif) | 301×42,3 | 301×44 |
| `event-form-recurring-toggle` (case) | 16×16, 0 coin | 16×16 + `::before` 44×44, 4/4 coins |
| `event-form-archived-toggle` (label `.mt-switch`) | 38×22, 0 coin | 38×22 + `::before` 44×44, 4/4 coins |
| `products-edit` / `products-archive` | 40×32, 0/4 coins | 40×32 + 44×44, 4/4 coins |
| `products-archived-restore` | 131,8×32, 0/4 | + 44×44, 4/4 |
| `categories-delete` | 40×32, 0/4 | + 44×44, 4/4 |
| `dashboard-open-timeline` | 139×32, 0/4 | + 44×44, 4/4 |

« coins » = `elementFromPoint` aux 4 coins (1 px dedans) de la zone 44×44 centrée désigne l'hôte : aucun ancêtre ne rogne le pseudo (PIT-S41-001 réfuté pour ces 8 cibles).
Desktop 1280×800 (témoin, vert avant ET après) : DeleteConfirmDialog 36/36, croix 16×16, `categories-delete` 32 sans pseudo (`content: none`), ProductDrawer `product-submit` 36, croix 16×16.

## Tests

- Vitest : 154 fichiers / 1973 tests verts (+ `lib/touchTarget.test.ts` 3 tests, `dialog.test.tsx` +1). `tsc --noEmit` OK, `next lint --file` OK, `prettier --check` OK.
- `sprint-101-touch-targets.spec.ts` : ROUGE sur 449ad984 (4 tests mobiles rouges, 2 desktop verts — armement), VERT après (6/6, plus 5 tests `setup`).
- Rejeu des 32 specs de la liste + 4 ajoutées par grep des testids (`sprint-62-control-focus-contrast`, `sprint-85-timeline-sidebar`, `sprint-89-local-date-west`, `sprint-92-products-next-event`) contre `next dev` :3000, oracles 401/200 vérifiés :
  - lot 1 (categories, golden-path, products, sprint-100-dialog-close-reachable, sprint-42-events, sprint-61-archived-events, sprint-62-select-focus-indicator, sprint-63-de-overflow-audit, sprint-66-mobile-create-event, sprint-66-mobile-keyboard, sprint-70-create-preview-pinned) : 62 passed.
  - lot 2 (sprint-70-preview-visual, sprint-71-edit-preview-pinned, sprint-73-model-vs-rendered, sprint-82-recurrence-capped-hint, sprint-84-palette, sprint-84-section-titles, sprint-85-timeline-toolbar, sprint-86-event-category, sprint-86-form-drawer-modal, sprint-90-first-contact, sprint-91-edit-bounded-series-end-date) : 60 passed, 4 failed = `sprint-90-first-contact` :407/:422/:436/:450 (squelettes #629).
    A/B : les 4 MÊMES rouges sur 449ad984 (sources restaurées temporairement dans ce working tree, `next dev` rechargé à chaud, puis restaurées) → PRÉ-EXISTANTS, artefact `next dev` sans préchargement (mémoire S91). Non imputables.
  - lot 3 (sprint-92-business-toasts, sprint-92-product-detail-actions, sprint-93-restore-product, sprint-94-fullscreen-overlays, sprint-94-modal-shortcuts, sprint-95-toast-overlap, sprint-96-palette-geometry, sprint-97-ink-faint-contrast, sprint-99-touch-targets, timeline + 4 ajoutées) : 90 passed.
  - `sprint-95-toast-overlap` (risque PIT-S99-002 de l'arbitrage) : VERT avec la croix de 44 px, sans retouche de la spec.
  - Flakes connus `sprint-84-palette:128` / `sprint-77-theme-visual` : non observés.
- Aucun PNG darwin produit (`git status` propre hors docs).

## Écarts d'énoncé

1. **3 contrôles hors arbitrage**, révélés par la mesure générique du drawer d'événement (ils ne figuraient dans aucune table) : case « récurrent » (`Checkbox` 16×16), interrupteur « archivé » (`Switch`, label 38×22) et champ hexadécimal natif `event-form-color-input` (42,3 px). Pas de nouveau design inventé : case et interrupteur reçoivent `TOUCH_TARGET_HITBOX` (outil approuvé des rangées denses), le champ natif reçoit `max-md:h-11` (même agrandissement que la primitive `Input`, DEC-S99-001). À valider a posteriori par ui-design (cf. RECOMMAND_UI_DESIGN).
2. **« resetColor (size=sm → retiré) »** lu comme « la densité `sm` cède en mobile » : `size="sm"` CONSERVÉ + `max-md:h-11`. Retirer `size="sm"` aurait fait passer le desktop de 32 à 36 px, contraire au critère « rendu desktop inchangé ».
3. **`EventEditForm` « actif si `footerPortalNode` »** : la classe est posée sans condition. Sous 1024 px le pied est TOUJOURS en portail (`EventFormDrawer`), et `max-md:` ne s'applique que sous 768 px : équivalent, sans branche de plus.
4. **ConflictDialog atteint en E2E** (pas en Vitest) : deux contextes, A desktop sauvegarde, B mobile reçoit le 409 — motif de `sprint-42-events`.
5. **Édition d'événement mobile** : la pastille ouvre une sheet en lecture seule en portrait ; le chemin est `timeline-event-more` → `timeline-actionsheet-edit` (déjà documenté par `sprint-63-de-overflow-audit`), pas `event-drawer-edit`.
6. `ProductDetailView` (désarchiver l'historique), `WeekAgenda`/`CompactAgenda`/`ProductCarousel`/`ProductList`/`ProductsListView` (CTA d'état vide) : classe posée selon l'arbitrage mais NON mesurée en E2E (il faudrait un événement archivé / un compte vide ; le compte PROD est partagé). La pseudo-hitbox est prouvée sur 6 autres hôtes, la croissance réelle sur 20+ boutons.
7. La feuille d'actions de la frise mobile (`timeline-actionsheet-*`) n'a PAS été mesurée (hors liste de l'énoncé).

## Signaux mémoire

- [MEMORY:pitfall] Context: la spec générique PAT-S99-001 (`button, input, [role=…]`) ne voit PAS `ui/switch.tsx` : son `<input>` est à 0×0 opacité 0 (filtré comme invisible) et la cible peinte est un `<label class="mt-switch">` 38×22 sans rôle. Solution: ajouter `label.mt-switch` au sélecteur. Prevention: tout contrôle « input masqué + label visible » doit être nommé dans le sélecteur de mesure, sinon la spec est verte par omission.
- [MEMORY:pitfall] Context: `el.scrollIntoView({block:'center'})` puis mesure immédiate dans la sheet d'édition mobile : la cible était lue à y=946 dans un viewport de 812 (défilement animé non terminé), `elementFromPoint` rendait `null` aux 4 coins → faux rouge « pseudo rogné ». Solution: `behavior: 'instant'` + `expect.poll` sur `rect.bottom <= innerHeight`. Prevention: toute mesure `elementFromPoint` après défilement programmatique relit la position avant de conclure.
- [MEMORY:pattern] Problem: prouver qu'une pseudo-hitbox `::before` 44×44 est RÉELLEMENT cliquable (PIT-S41-001), ce que ni jsdom ni la taille déclarée ne prouvent. Solution: `elementFromPoint` aux 4 coins (1 px dedans) de la zone 44×44 centrée sur l'hôte doit désigner l'hôte — le hit-testing attribue le pseudo à l'hôte, donc un coin hors de la boîte visible qui le désigne ne peut venir que du pseudo ; logger les nœuds touchés en cas d'échec. Anti-pattern: asserter `getComputedStyle(el,'::before').width === '44px'`. Exemple : `e2e/sprint-101-touch-targets.spec.ts` `measureHitbox`.
- [MEMORY:decision] Context: #754, suivi de DEC-S99-001. Decision: `lib/touchTarget.ts` source unique (3 constantes) ; croissance réelle `max-md:h-11` sur les surfaces spacieuses, pseudo-hitbox sur les rangées denses ET sur les contrôles de formulaire à boîte fixe (case, interrupteur) ; `size="sm"` conservé (desktop inchangé). Why: arbitrage ui-design S101 + 3 contrôles trouvés par la mesure, traités avec les mêmes outils.

## Recommandations suite

- Pas de RECOMMAND_DB_EXPERT : aucun schéma, requête ni migration.
- Pas de RECOMMAND_SECURITY : classes CSS et specs seulement, aucun flux de données touché.
- Pas de RECOMMAND_TEST_RUNNER : Vitest complet et les 36 specs E2E rejoués en direct, rouges tranchés par A/B.
- RECOMMAND_UI_DESIGN traité (lead, 2026-09-22) : ui-design spawné a posteriori → VERDICT APPROUVE sur les 3 extensions hors arbitrage (Checkbox « récurrent », Switch « archivé », champ hexadécimal natif) et sur « Réinitialiser » `size="sm"` + `TOUCH_TARGET_BUTTON` ; aucune dérive de l'arbitrage relevée dans le diff 449ad984..1762df30.
- RECOMMAND_FOLLOWUP: ajouter `label.mt-switch` au sélecteur de `e2e/sprint-99-touch-targets.spec.ts` (même angle mort que ci-dessus ; aucun Switch dans les réglages aujourd'hui, à vérifier) [XS | frontend-e2e]
- RECOMMAND_FOLLOWUP: mesurer à 375 px la feuille d'actions de la frise mobile (`timeline-actionsheet-*`), la bottom sheet de lecture d'un événement, et les CTA d'état vide du dashboard (compte vide dédié) — non couverts par #754 [S | design (frontend)]

fichiers de contexte lus: docs/memory/sprints/sprint-101/briefing-B-754-757.md → « Specs à rejouer (liste grep COMPLÈTE » ; docs/memory/sprints/sprint-101/arbitrage-ui-design-754-757.md → « `TOUCH_TARGET_HITBOX = "relative max-md:before:absolute` » ; docs/memory/sprints/sprint-101/architect-plans.md → « croix de `DialogContent` (`ui/dialog.tsx:73`) est une icône 16×16 **sans padding** » ; docs/memory/patterns.md → PAT-S99-001 « seuil anti-vacuité » ; docs/memory/decisions.md → DEC-S99-001 « `pointer: coarse` écarté » ; frontend/e2e/sprint-63-de-overflow-audit.spec.ts → l.488 « `event-drawer-edit` n'est rendu que par »

STATUS: COMPLETED
