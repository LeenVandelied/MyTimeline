# Audit tests — Sprint 92

> Généré en fin de Phase 6 par le lead. Sprint 100 % frontend (aucune migration, aucun backend).
> Base `43a7870` (origin/dev) → HEAD `bca8b20`. Aucune case « manquante » : chaque règle ou comportement touché a au moins un test exécuté.

## Couverture par règle / comportement

| Règle / comportement | Description | Cross-system flow | Unit backend | Intégration | Vitest frontend | E2E parcours | E2E métier |
|---|---|:---:|:---:|:---:|:---:|:---:|:---:|
| BR-EVE-006 / BR-EVE-012 | Prochaine occurrence d'une série (unité, borne `recurrenceEndDate` inclusive) | NON | N/A | N/A | ✅ `lib/next-occurrence.test.ts` | ✅ | ✅ `sprint-92-products-next-event` |
| BR-EVE-013 | Événements archivés exclus du prochain événement et du compteur | NON | N/A | N/A | ✅ `next-occurrence.test.ts`, `ProductsListView.test.tsx` | ✅ | ✅ `sprint-92-products-next-event` |
| BR-EVE-011 | Compteur = événements actifs (non archivés) | NON | N/A | N/A | ✅ `ProductsListView.test.tsx` | ✅ | ✅ |
| Fuseau local (#652) | « ≥ aujourd'hui » = début du jour LOCAL, `TZ=America/Los_Angeles` forcé et restauré par `delete` | NON | N/A | N/A | ✅ `next-occurrence.test.ts` | ✅ | ✅ `sprint-89-local-date-west` (adaptée) |
| BR-PRO-007 | Archivage produit (soft delete) : vocabulaire « Archiver », aucune promesse de restauration | OUI (UI → API DELETE 204 → liste) | N/A (backend inchangé) | N/A | ✅ `ProductDetailView`, `ProductDrawer`, `DeleteConfirmDialog` (+ intl) | ✅ | ✅ `sprint-92-product-detail-actions` (détail + drawer, DELETE 204, liste rechargée) |
| BR-EVE-002 | Produit requis : prérempli ignoré si l'id n'est pas dans la liste chargée | NON | N/A | N/A | ✅ `NewEventDrawer.test.tsx` | ✅ | ✅ `sprint-92-product-detail-actions` (drawer ouvert, produit sélectionné) |
| Contexte de création (#605) | `openCreate({productId})`, MouseEvent rejeté, pas de fuite du prérempli | NON | N/A | N/A | ✅ `AppShell.test.tsx` | ✅ | ✅ |
| Toasts (#621) | Rendu DS unique, variantes, `role="status"`, pause survol/focus (WCAG 2.2.1), position sous la barre | OUI (UI → API → confirmation) | N/A | N/A | ✅ `toaster.test.tsx`, `NewEventDrawer`, `TimelineEditHost`, `ProductDrawer`, `CategoryDrawer` | ✅ | ✅ `sprint-92-business-toasts` (création + modification d'événement, géométrie desktop et mobile) |
| Modification sans PATCH (revue) | Garde `eventId`/`user` → erreur, ni `onDone` ni toast | NON | N/A | N/A | ✅ `useEventEditConflict.test.tsx` | N/A (état d'auth non reproductible en E2E) | N/A |

Cross-system flow = OUI sur 2 lignes → E2E métier présent pour les deux.

## Tests créés ou modifiés
- `frontend/src/lib/next-occurrence.test.ts` (neuf) ; `ProductsListView.test.tsx`, `dashboard-components.test.tsx`
- `frontend/src/components/ui/toaster.test.tsx` (neuf) ; `NewEventDrawer.test.tsx`, `TimelineEditHost.test.tsx`, `ProductDrawer.test.tsx`, `CategoryDrawer.test.tsx`, `hooks/useEventEditConflict.test.tsx`
- `AppShell.test.tsx`, `ProductDetailView.test.tsx`, `DeleteConfirmDialog.test.tsx`, `DeleteConfirmDialog.intl.test.tsx`
- E2E neufs : `frontend/e2e/sprint-92-products-next-event.spec.ts` (2), `sprint-92-business-toasts.spec.ts` (3), `sprint-92-product-detail-actions.spec.ts` (3)
- E2E adaptée : `frontend/e2e/sprint-89-local-date-west.spec.ts` (testid `products-row-next-*`, texte ISO)

## Résultats des runs
- Vitest (déclaré par le dernier agent, sur `bca8b20`) : 138 fichiers, **1777 / 1777**. tsc 0 · `format:check` OK · `next lint` 0.
- Build de production (lead, `bca8b20`, variables proxy au build) : exit 0, lint compris.
- E2E suite complète (lead, `next start` :3100, backend `s92e2e` :8086, `--ignore-snapshots`) : **408 passés / 1 échoué / 8 sautés / 1 non exécuté** (418) en 2,6 min.
  - Seul échec : `sprint-77-theme-visual.spec.ts:620` — armement de comparaison visuelle, échoue par construction hors Linux avec `--ignore-snapshots` (connu, S78) ; tranché par la CI Linux.
  - Les 8 tests des 3 specs du sprint : exécutés et verts.
- Run intermédiaire (vague 1, `2739675`) : 405 passés / même unique échec.
- Contrôles d'armement faits par les agents : récurrence désactivée (11 rouges), comparaison à `now` (3), appel toast retiré, gardes MouseEvent retirées (4), `startPause` retiré (2), décalage 16 px (1), garde `runSubmit` retirée (2).

## Coverage E2E des testids (Phase 8)
12 testids ajoutés dans les `.tsx` du sprint : 8 cités par une spec E2E ; les 4 autres (`delete-dialog`, `prefill-trigger`, `raw-event-trigger`, `screen-trigger`) n'existent que dans des fichiers `*.test.tsx` (composants de harnais) → OK.

## Non couvert / limites
- Rendu visuel réel (captures) : jugé par la CI Linux uniquement.
- Liste produits non rafraîchie après archivage (préexistant, voir `sprints/sprint-92/review-batch.md`) : la spec vérifie l'absence après rechargement → proposé en suivi.
- Lecteur d'écran réel, bottom sheet mobile avec clavier ouvert.

## Conclusion
Prêt pour PR, sous réserve du verdict de la relecture de cycle 2 des commits de correction.
