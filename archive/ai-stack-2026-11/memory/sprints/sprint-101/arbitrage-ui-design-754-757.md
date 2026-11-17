# Arbitrage ui-design — Sprint 101 — #754 et #757

> Verdict pré-implémentation rendu par l'agent `ui-design` le 2026-09-21, recopié par le lead.
> VERDICT : **APPROUVE** avec les décisions ci-dessous.

## #754 — mécanisme

Relocaliser `SETTINGS_TOUCH_BUTTON` / `SETTINGS_TOUCH_ICON_BUTTON` (`frontend/src/components/settings/touchTarget.ts:20,23`)
vers `frontend/src/lib/touchTarget.ts` (nouveau) :

- `TOUCH_TARGET_BUTTON = 'max-md:h-11'`
- `TOUCH_TARGET_ICON_BUTTON = 'max-md:h-11 max-md:w-11'`
- `TOUCH_TARGET_HITBOX = "relative max-md:before:absolute max-md:before:top-1/2 max-md:before:left-1/2 max-md:before:h-11 max-md:before:w-11 max-md:before:-translate-x-1/2 max-md:before:-translate-y-1/2 max-md:before:content-['']"` (PAT-S24-002 outillé)

`settings/touchTarget.ts` ré-exporte depuis ce fichier (0 diff sur les 8 importeurs actuels).
Justification : DEC-S99-001 limitait volontairement le périmètre aux réglages ; #754 est le suivi qui l'étend, et une source unique évite la divergence.

### Croissance réelle `max-md:h-11` (surfaces spacieuses)

| Fichier:ligne | Bouton |
|---|---|
| `shared/DeleteConfirmDialog.tsx:281,284` | cancel, confirm/delete |
| `shared/ConflictDialog.tsx:230,240,252,261` | takeServer, keepMine, dismiss, reload |
| `products/RestoreProductDialog.tsx:119,128` | cancel, confirm |
| `events/ArchiveConfirmDialog.tsx:82,90` | cancel, confirm |
| `products/ProductDrawer.tsx:365,430,445,453` | resetColor (size=sm → retiré), archive, cancel, submit |
| `categories/CategoryDrawer.tsx:313,391,406,415` | resetColor (size=sm → retiré), delete, cancel, submit |
| `EventEditForm.tsx:440,456,465` (pied `NewEventDrawer`/édition, actif si `footerPortalNode`) | delete, cancel, submit |
| `dashboard/ProductCarousel.tsx:61` | CTA EmptyState |
| `dashboard/ProductList.tsx:52` | CTA EmptyState |
| `dashboard/WeekAgenda.tsx:83` | CTA EmptyState |
| `dashboard/CompactAgenda.tsx:110` | CTA EmptyState |
| `products/ProductsListView.tsx:280` | clearSearch CTA EmptyState |

### Pseudo-hitbox `TOUCH_TARGET_HITBOX` (rangées denses)

| Fichier:ligne | Raison |
|---|---|
| `dashboard/DensityRibbon.tsx:110` | ligne de flottaison E2E `sprint-84-section-titles.spec.ts` (JSDoc l.101-106) |
| `products/ArchivedProductsView.tsx:134` | ligne `<td>` de table dense |
| `products/ProductsListView.tsx:403,416` | icônes edit/archive, ligne `<td>` dense |
| `products/CategoriesView.tsx:240` | icône delete, ligne dense |
| `products/ProductDetailView.tsx:484` | `<li>` historique dense (`py-2`) |

### Exemption sans correctif

`timeline/TimelineView.tsx:1783` — `hidden md:inline-flex`, jamais peint sous 768 px.

## Croix `DialogContent` — spécification unique #754 + #757

`frontend/src/components/ui/dialog.tsx:73-76` devient :

```tsx
<DialogPrimitive.Close className="absolute -top-2 -right-2 flex items-center justify-center rounded-full bg-background text-muted-foreground shadow-xs transition-colors hover:bg-accent-soft disabled:pointer-events-none max-md:h-11 max-md:w-11">
  <X className="h-4 w-4" />
  <span className="sr-only">Close</span>
</DialogPrimitive.Close>
```

Retirés : `opacity-70` / `hover:opacity-100` (la composition rendrait le fond semi-transparent, ce qui annule #757), `rounded-xs`,
`data-[state=open]:bg-accent data-[state=open]:text-muted-foreground` (l'état « open » est permanent tant que le dialogue est visible : no-op trompeur).

`-top-2 -right-2` INCHANGÉ : `top`/`right` ancrent le coin, la boîte grandit vers le bas et vers la gauche. **Ce qui reste à +16 :** le bord
SUPÉRIEUR et le bord DROIT de la boîte de la croix, jamais son centre ni sa hauteur. Desktop (≥ 768 px) : boîte 16×16, géométrie inchangée
(`shadow-xs` / `bg-background` n'ajoutent aucune taille ; pas de `border`). Mobile : 44×44.

Specs à rejouer, sans modifier leur texte a priori :
- `sprint-95-toast-overlap.spec.ts` : `overlapPx` dérive de `closeBox.height` mesuré. Calcul : TALL/MID restent en recouvrement TOTAL, SHORT
  reste PARTIEL — **chiffres estimés depuis des JSDoc, dépendants de la police : À CONFIRMER par exécution** (marge EPSILON = 2).
- `sprint-100-dialog-close-reachable.spec.ts` : relit `dialogBox.y + 16` dynamiquement ; non-régression desktop (1280×800) = boîte 16×16.

## #757 — solution retenue

Fond opaque `bg-background` (`--color-bg`) derrière l'icône, encre `text-muted-foreground` (`--color-ink-muted`) au repos,
`hover:bg-accent-soft` seul au survol (JAMAIS `hover:text-*` — convention « le survol ne change que la surface », `ui/button.tsx:20-25`).
`shadow-xs` pour un liseré sans ajout de taille.

Contraste calculé (icône `ink-muted` sur `bg-background`) : clair `#5E626B` / `#FCFCFD` → **5.96:1** ; sombre `#8E9299` / `#0B0C0E` → **6.27:1**.
Cible ≥ 3:1 (composant non textuel) dépassée dans les 2 thèmes. **Le ratio est à MESURER en E2E sur contenu défilé (critère d'acceptation).**

## Risques géométriques

1. `sprint-95-toast-overlap` : les bornes tiennent par calcul mais dépendent des hauteurs de police → exécution réelle obligatoire (PIT-S99-002).
2. La boîte de la croix s'élargit vers la GAUCHE (bord gauche non ancré) ; à documenter dans la JSDoc de `dialog.tsx`.
3. La pseudo-hitbox de `DensityRibbon` n'est pas testable en jsdom (PAT-S24-002) → mesure E2E.

[MEMORY:decision] Extension de DEC-S99-001 (réglages → drawers/dialogues hors réglages, #754) et relocalisation `settings/touchTarget.ts` → `lib/touchTarget.ts`.
