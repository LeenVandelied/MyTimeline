# Issue #316 — EventDrawer : consommer useFocusTrap au lieu du focus-trap inline dupliqué

**Sprint :** 46 | **Vague :** 1 | **Taille :** XS | **Domaine :** timeline / events
**Commits :** `85715b0`

## Résumé

`frontend/src/components/timeline/EventDrawer.tsx` perd son trap-focus inline
(`useEffect` + `previousFocus` + listener keydown), remplacé par
`useFocusTrap(panelRef, Boolean(event), onClose)` (`frontend/src/components/timeline/useFocusTrap.ts`, #63).

**BR touchées :** aucune BR-EVE — pur a11y/UI, pas de logique métier.

**`BUG-S44-001` traité à la racine** : `TimelineView.tsx` créait `onClose={() => setSelected(null)}` inline
(nouvelle identité à chaque rendu). Ajout de `closeDrawer = useCallback(() => setSelected(null), [])`
(deps vides, `setSelected` stable) puis `onClose={closeDrawer}` — sinon re-trap et vol de focus à chaque
rendu parent.

Docstring périmée de `useFocusTrap.ts` (affirmait qu'`EventDrawer` n'était « PAS modifié ») corrigée.

## Parité a11y

| Comportement | État |
|---|---|
| Focus initial (bouton fermer) | OK |
| Boucle Tab / Shift+Tab | OK |
| Échap | OK — double chemin (listener global `TimelineView` + `useFocusTrap` local), idempotent car `setSelected(null)` |
| Restauration du focus sur le déclencheur | OK |

Vérifié par les tests existants `TimelineView.test.tsx` — **il n'existe pas de `EventDrawer.test.tsx` dédié** ;
la couverture drawer vit dans `TimelineView.test.tsx`, notamment le bloc `#228` (L423-447) qui teste
explicitement focus initial + Tab loop + Échap + restauration.

## Tests

31/31 sur `TimelineView.test.tsx` | suite frontend complète 564/564 verte | lint + `tsc` clean (run 31 s).

## Signaux mémoire

Aucun nouveau — `BUG-S44-001` était déjà documenté dans `docs/memory/bugs-resolved.md` et a été appliqué
comme prévu, sans nouvelle variante.

## Recommandations suite

Volume tests frontend = 564 (> seuil 500 du contrat) mais exécuté en 31 s (sous le budget 3 min) →
pas de délégation `test-runner` nécessaire. Signalé pour information, aucun `RECOMMAND_*` requis.

STATUS: COMPLETED
