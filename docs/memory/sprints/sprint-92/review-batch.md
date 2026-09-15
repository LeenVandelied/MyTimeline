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

## Relecture de cycle 2 (`5c64e01`, `87dca1d`, `fa8b102`, `bca8b20`)
- **[MAJEUR → reclassé MINEUR par le lead] `ui/toaster.tsx:107-116`** — `focused` pourrait rester `true` si le toast focalisé expire alors qu'un autre reste visible → survivant en pause jusqu'au démontage (~1 s, `removeDelay` 1000). PLAUSIBLE, non rejoué. **Motif du reclassement** : le même reviewer VÉRIFIE que `pausedAt` est global au store (`dist/index.mjs` case 5/6) → tant que le focus est dans un toast, AUCUN toast n'expire par minuterie, donc le scénario exige un retrait hors minuterie ; et l'effet s'auto-corrige en ~1 s. Pas de correction dans le sprint (re-review limitée à 1 cycle ; une correction imposerait build + E2E de nouveau). → suivi : stocker l'id focalisé plutôt qu'un booléen [XS].
- **[MINEUR] `ui/toaster.tsx:99-116`** — survol/focus d'UN toast met TOUS les toasts en pause (comportement de la lib, VÉRIFIÉ) → à documenter dans la JSDoc [XS, suivi].
- **[MINEUR] `ui/toaster.tsx`** — focus non restauré quand le toast focalisé disparaît (retombe sur `<body>`). PLAUSIBLE, comportement standard → suivi [XS].
- **[OK VÉRIFIÉS]** double `useToaster()` idempotent (aucun toast retiré deux fois ni jamais) ; survol natif malgré `#_rht_toaster` en `none` (handlers sur le conteneur, bubbling) ; `tabIndex`/handlers posés sur le nœud `role="status"` ; garde `runSubmit` → `error`, bouton réactivé, message `event-form-error` rendu (`EventEditForm.tsx:924-926`), seul appelant `TimelineEditHost.tsx:97` ; `console.error` du test couvert par le spy parent ; `TOASTER_TOP_OFFSET` = tokens confirmés (`spacing.css:11,14,18`) ; `stableBox` ne passe jamais à vide (`expect.poll`) + garde « même colonne » ; spec d'archivage : données dédiées, `waitForResponse` armé avant le clic, rechargement réel.

**Verdict cycle 2 : aucun bloquant pour la PR.**

## Relecture des absorptions de clôture (`cabacd7`, `ea5d02f`)
- **[MAJEUR → NON RETENU par le lead] `ui/toaster.tsx:201-208`** — `handleFocus` ne remet pas `returnFocusRef` à `null` quand `relatedTarget` est nul ou non `HTMLElement` → une session suivante « pourrait restaurer vers la cible d'une session précédente ». VÉRIFIÉ par le reviewer (lignes lues). **Réfuté par énumération des chemins (lead, lignes relues)** : toute fin de session remet la référence à `null` — sortie vers la page (`handleBlur`, l.213), retrait du toast focalisé (effet l.189-191), démontage d'`AppToaster` ; une nouvelle session sans `relatedTarget` part donc toujours d'une référence nulle. **Le correctif proposé (`else { ref = null }`) introduirait une régression** : la branche `else` couvre aussi `relatedTarget` = autre toast, et effacerait la cible au passage d'un toast à l'autre, cas protégé par le commentaire l.203. Aucun changement de code. Leçon inverse de PIT-S92-008 : énumérer les chemins peut aussi réfuter un finding, pas seulement le révéler.
- **[MINEUR] `ui/toaster.tsx:186-192`** — pas d'`endPause()` au démontage d'`AppToaster` pendant une pause. Préexistant ; `AppToaster` est monté dans le layout racine (`app/[locale]/layout.tsx`) et ne se démonte pas en navigation. → discard (non atteignable en usage normal).
- **[MINEUR] `ProductDetailView.tsx:314-316`** — `lastProduct` initialisé par `useState(liveProduct)` suppose un remontage de la page à chaque changement de `productId`. PLAUSIBLE, non vérifié (comportement de l'App Router sur segment dynamique). `useIsProductArchivedHere` reste isolé par id. → non bloquant, noté.
- **[MINEUR] mention « test `isConnected` non armable »** — introuvable dans le commit : elle figure dans le RETOUR de l'agent B (`issue-absorb-toaster-done.md`), pas dans le code. Le reviewer juge le test réellement exercé (`detached.remove()`, jsdom implémente `isConnected`). → la déclaration de l'agent était prudente, pas fausse ; rien à changer.
- **[OK VÉRIFIÉS]** pause par id levée sur dismiss même avec d'autres toasts visibles, pas de boucle `startPause`/`pausedAt` ; restauration bloquée si l'utilisateur a déjà porté le focus ailleurs (`handleBlur` remet à `null` avant le retrait) ; `useArchiveProduct` : rejet de `mutateAsync` propagé (aucun `onError` qui avale), retrait du cache seulement en `onSuccess` (pas optimiste), `products.all` = `['products']` couvre `withEvents(userId)`, les compteurs de `CategoriesView` (`CategoriesView.tsx:44`) et `products.detail` (`query-keys.ts:20-30`) ; 3 surfaces : `await mutateAsync → toast → setState/goBack`, toast et navigation sautés en cas d'erreur (contrat #65) ; `useIsProductArchivedHere` filtré strictement par `productId` ; E2E « en place » cohérent avec le retrait synchrone `setQueryData`.

**Verdict : aucun bloquant, aucun changement de code.**

## Cycle de corrections
Briefing `briefing-review-fixes.md`, spawn ref consigné dans `spawn-ref-review-fixes.txt`. Relecture cycle 2 obligatoire (mémoire : les commits qui corrigent la review doivent eux-mêmes être relus).
