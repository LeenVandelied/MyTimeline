# Review batch — Sprint 92

> Agent `reviewer`, lecture seule, sur `43a7870..ec7a076` (#603 `f1bf100`, #621 `2739675`, #605 `ec7a076`).
> Le correctif Designer `5c64e01` (toaster, core.css) n'était pas committé pendant la revue : relu en cycle 2.

## Findings
- **[MAJEUR] `frontend/src/hooks/useEventEditConflict.ts:120-133`** — `runSubmit` : `if (eventId && user?.id) await updateEvent(...)` peut être faux sans lever ; `invalidateEvents()` puis `onDone?.(data)` s'exécutent quand même → depuis #621, toast « Événement modifié » affiché sans PATCH envoyé. Préexistant, rendu visible par #621. Ligne VÉRIFIÉE ; déclenchement réel PLAUSIBLE (auth expirée pendant l'édition). → **à corriger** (cycle de corrections).
- **[MINEUR] `ProductDrawer.tsx:428`** — testid `product-drawer-archive` sans spec E2E (unitaire seulement). VÉRIFIÉ. → **à corriger** (ajout au spec `sprint-92-product-detail-actions`).
- **[MINEUR] `ProductsListView.tsx:114-119`** — `nextById` mémoïsé sur `[products]` capture `new Date()` une fois : page ouverte à cheval sur minuit = « aujourd'hui » périmé jusqu'au refetch. PLAUSIBLE. → **écarté par le lead** : impact mineur, résorbé au prochain refetch TanStack ; noté en suivi possible.

## OK (vérifiés par le reviewer)
- `lib/next-occurrence.ts` + test : BR-EVE-012 borne inclusive, BR-EVE-013 archivés exclus, fin de mois / 29 février / DST, `TZ=America/Los_Angeles` restauré par `delete` (PIT-S83-007).
- Toasts #621 : pas de double toast (`apiClient` ne toaste qu'en erreur ; surfaces après réponse serveur réussie) ; clés i18n ×4.
- `CreateEventContext.toCreateEventPrefill` : MouseEvent rejeté (typage + contrôle de prototype), prérempli sans fuite d'une ouverture à l'autre.
- Vocabulaire : aucune promesse de restauration produit (BR-PRO-007 §1) ; variantes event/category inchangées.
- i18n 4 locales synchronisées sur les 3 commits.

## Non vérifié par le reviewer
Rendu réel (z-index, position du toast, FAB), `toaster.tsx`/`core.css` de `5c64e01`, BR-EVE-011 côté backend.

## Correctif Designer `5c64e01` — conséquence relevée par son agent
Pause survol/focus (arbitrage dev) ⇒ la carte capte le pointeur ; en `top-right` (y ≈ 16–62 px) elle recouvre la croix des drawers (y 12–56) et le hamburger mobile du dashboard (y 6–50) pendant la durée du toast ; `sprint-92-business-toasts.spec.ts:112` asserte encore `pointer-events:none`.
**Arbitrage du dev (2026-09-15) : décaler le toast sous la barre des contrôles** (top-right conservé).

## Constat de l'agent de corrections — liste non rafraîchie après archivage (vérifié par le lead)
- `ProductsListView.handleArchiveConfirm` (`:171-175`), `ProductDrawer.handleDeleteConfirm` (`:239-245`), `ProductDetailView.handleArchiveConfirm` (`:232-236`) : `deleteProduct` puis toast, **aucun `invalidateQueries`** ; `deleteProduct` (`services/productService.ts:77-84`) est un appel `apiClient.delete` nu, hors `useMutation`.
- **Préexistant** : identique sur `origin/dev` (`ProductsListView.tsx:175-179` sans invalidation). Le sprint le rend plus visible (toast « Produit archivé » alors que la ligne peut rester affichée jusqu'au refetch). Non mesuré en navigateur ; la spec `bca8b20` vérifie l'absence APRÈS rechargement, donc ne le couvre pas.
- Aucune issue ouverte ne le porte (`gh issue list --search "archiv produit liste"` / `"invalidat"` : vides).
- → **RECOMMAND_FOLLOWUP** [XS | frontend products] : hook `useArchiveProduct` (mutation + invalidation `products.all`), comme `useUpdateProduct` / `useDeleteCategory`. À trier au `/sprint end`.

## Cycle de corrections
Briefing `briefing-review-fixes.md`, spawn ref consigné dans `spawn-ref-review-fixes.txt`. Relecture cycle 2 obligatoire (mémoire : les commits qui corrigent la review doivent eux-mêmes être relus).
