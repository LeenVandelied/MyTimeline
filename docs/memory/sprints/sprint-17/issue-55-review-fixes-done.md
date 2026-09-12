# Issue #55 — Correctifs review (Sprint 17, cycle 1/1)

Branche `sprint/17`. Base code livrée en c46c936. Ces correctifs appliqués par-dessus.

## Fixes

### [MAJEUR] Drag handle minimap — FAIT
`Minimap.tsx` : le handle `.mt-minimap__vp` faisait `stopPropagation()` sur son
`onPointerDown` → `draggingRef` (armé seulement par le handler de la track) jamais
activé quand on saisissait le handle. Ajout d'un `onHandlePointerDown` dédié qui
arme `draggingRef.current=true` + `setPointerCapture` sur la **track** (pas la cible),
sans recentrer (le move fait le seek). Aligné aussi le capture de la track sur
`trackRef.current` (au lieu de `e.target`) pour que les `pointermove` soient bien
routés vers le handler de la track pendant le drag.

### [MINEUR] EventDrawer data-closing mort — FAIT
Choix : retirer la règle CSS morte `.mt-drawer[data-closing="true"]` dans
`timeline.css`. Le composant unmount immédiatement via rendu conditionnel parent ;
implémenter un délai de fermeture aurait sur-ingénieré. Aucun changement dans
`EventDrawer.tsx` (le composant ne posait jamais l'attribut).

### [MINEUR] Test zoom = zéro réseau — FAIT
`TimelineView.test.tsx` : nouveau test spy sur `globalThis.fetch`, assert
`not.toHaveBeenCalled()` après ZOOM_IN/ZOOM_OUT (clavier + boutons). Prouve
BR-EVE-001 client-only. Test a11y aria-label ajouté en bonus.

### [MINEUR] aria-label bloc event — FAIT
`TimelineView.tsx` : helper pur `buildEventAriaLabel(event, locale, t)` →
"titre, statut, dates, produit". Réutilise le format date medium + clé i18n de
statut du drawer. Appliqué sur le `<button>` event.

### [MINEUR] Formatters Intl dupliqués — FAIT
`zoom.ts` `buildRulerTicks` : `dayFmt` et `weekFmt` identiques → suppression de
`weekFmt`, la branche `week` réutilise `dayFmt`.

## Tests
Frontend : 115/115 vert (TimelineView 10 tests, +2 nouveaux). tsc + eslint clean.
