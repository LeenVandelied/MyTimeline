# Issue #836 — Le focus revient au déclencheur à la fermeture de tous les dialogues

**Commit :** 550b416d (9 fichiers, +826/−260 ; dialog.tsx surtout ré-indentation Prettier)

## Mesure avant correctif (E2E réel, sans mock)
10 rouges sur 11 : ProductDrawer édition, CategoryDrawer édition, DeleteConfirmDialog ×4 (produit, catégorie, événement imbriqué, bottom sheet mobile), RestoreProductDialog, ArchiveConfirmDialog (imbriqué), ConflictDialog (vrai 409 par PATCH API concurrent), AccountSection desktop → focus sur `body`. Vert : BottomSheet mobile d'AccountSection (useFocusTrap restaure déjà).

## Correctif
- Centralisé : `frontend/src/hooks/useReturnFocus.ts` branché dans `ui/dialog.tsx` `DialogContent` — capture `document.activeElement` dans `onOpenAutoFocus` (FocusScope 1.1.2 l'émet avant de déplacer le focus), restaure dans `onCloseAutoFocus` si `isConnected`. Handler hôte d'abord ; s'il fait `preventDefault`, le hook s'abstient (#700 intact).
- ConflictDialog : prop `onCloseAutoFocus` optionnelle ; EventEditForm refocalise « Enregistrer » via ref (bouton désactivé pendant l'envoi ⇒ rien à capturer).
- Bug trouvé hors plan (bloquait la mesure) : Entrée/Espace sur Éditer/Archiver d'une ligne produit remontait au `onKeyDown` de la ligne (ouvrait le détail) ; idem poubelle d'une carte catégorie (ouvrait l'édition). Garde `e.target !== e.currentTarget` (ProductsListView:373, CategoriesView:185).

## Tests
- Nouvelle spec `sprint-113-focus-return.spec.ts` 11/11 ; `sprint-112-focus-return` boucle desktop + mobile 375×812 : 16/16.
- Liste E2E des 22 specs citant les surfaces : 128 passed / 3 failed — `sprint-106-product-detail` :494, :528, :548 (préchargement/squelettes, ne marchent que contre `next build`+`next start` d'après l'en-tête de la spec) → à rejouer par le lead.
- Vitest 2295/2295 (dont 6 useReturnFocus) ; tsc, lint, prettier OK (rapport agent).
- Non vérifié : confirmations RÉUSSIES où le déclencheur disparaît (focus → body) ; dialogues hors liste (édition TimelineEditHost, EventFormDrawer) corrigés de fait mais non mesurés ; WebKit.

## Signaux
- [MEMORY:pattern] Dialogue Radix contrôlé sans Trigger : capturer `activeElement` dans `onOpenAutoFocus` (avant l'autofocus FocusScope) et restaurer dans `onCloseAutoFocus`, centralisé dans `ui/dialog.tsx`. Anti-pattern : capture dans un `useEffect` hôte (après l'autofocus → capture le dialogue).
- [MEMORY:pitfall] Dialogue 409 ouvert par un submit désactivé pendant l'envoi : Chromium a déjà mis le focus sur body → repli explicite vers le bouton via ref.
- [MEMORY:pitfall] Ligne/carte cliquable (role=button + onKeyDown Entrée/Espace + preventDefault) contenant des boutons : la touche du bouton enfant remonte, son action est annulée et celle de la ligne s'exécute. Garde `e.target !== e.currentTarget` + tester l'ouverture au clavier.

## Recommandations suite
- RECOMMAND_FOLLOWUP: retour de focus après une confirmation RÉUSSIE quand le déclencheur a disparu (bouton « nouveau » ou ligne voisine) — ProductsListView, CategoriesView, ArchivedProductsView [triage S | products/categories].
- RECOMMAND_FOLLOWUP: BottomSheet/useFocusTrap a `onEscape` dans les deps de son effet et AccountSection passe une fonction inline → l'effet se rejoue à chaque rendu, peut déplacer le focus pendant la saisie. Non mesuré [triage S | settings].
- RECOMMAND_TEST_RUNNER: sprint-106-product-detail contre next build + next start → pris en charge par le lead (Phase 6, pas de délégation E2E sur ce projet).

STATUS: COMPLETED
