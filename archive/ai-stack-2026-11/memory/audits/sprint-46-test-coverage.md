# Audit tests — Sprint 46

> Généré en fin de Phase 6, complété après le cycle de correction review (Phase 7).
> Sprint **frontend uniquement** : aucune migration Flyway, aucun changement backend.

## Couverture par issue / BR

| Issue | BR touchées | Cross-system flow | Unit backend | RTL frontend | E2E parcours | E2E métier |
|---|---|:---:|:---:|:---:|:---:|:---:|
| #315 — mini-frise aperçu | BR-EVE-003, 005, 006, 009 (miroir **client**) | NON | ⚠ N/A | ✅ | ⏳ #314 (S47) | ⚠ N/A |
| #316 — `EventDrawer` → `useFocusTrap` | aucune (a11y pur) | NON | ⚠ N/A | ✅ | ✅ existant | ⚠ N/A |
| #309 — suppression frise mobile | aucune | NON | ⚠ N/A | ✅ | ⏳ #205 (S47) | ⚠ N/A |
| Correctifs review (M1/M2) | aucune | NON | ⚠ N/A | ✅ | ⏳ #205 (S47) | ⚠ N/A |

**Cross-system flow = NON partout** : les 3 issues sont des changements de surface frontend
(rendu d'aperçu, piège à focus, câblage d'une prop déjà exposée). Aucun flux 2+ systèmes/rôles
n'est introduit → **pas d'E2E métier obligatoire** au sens du protocole.

Les BR-EVE-003/005/006/009 sont **déjà couvertes côté backend** par la suite existante (433 tests verts).
#315 en ajoute un **miroir client** (`previewTimeline.ts`), couvert par 2 suites unitaires dédiées, dont
2 cas de parité explicitement alignés sur `Utils.calculateEndDate` (série ancienne, `durationValue=0`).

## Tests créés

- `frontend/src/components/events/EventPreviewTimeline.test.tsx` (#315)
- `frontend/src/components/events/previewTimeline.test.ts` (#315, + 2 cas de parité backend post-review)
- `frontend/src/components/EventEditForm.test.tsx` — étendu (#315)
- `frontend/src/components/timeline/TimelineEditHost.test.tsx` — étendu (#309 : +1 cas ; review : +4 cas
  — arme sans supprimer, confirmation → `deleteEvent`, annulation → 0 appel, 403 → `role="alert"` +
  dialog maintenu ouvert, 404 → message dédié)
- `TimelineView.test.tsx` — couverture drawer existante réutilisée comme non-régression (#316, bloc `#228`)

## Résultats des runs

| Suite | Résultat |
|---|---|
| Backend | **433 / 433** verts, 0 échec (non touché par ce sprint) |
| Frontend | **596 / 596** verts sur 69 fichiers (+6 vs les 590 post-vague 2) |
| `tsc --noEmit` | 0 erreur |
| ESLint | 0 issue |
| E2E Playwright | **non exécutable en local** (stack applicative down) — le job CI est le seul gate réel |

## Écart E2E assumé (COVERAGE-E2E)

L'heuristique du protocole remonte 12 `data-testid` ajoutés sans spec. Après vérification manuelle :

- **2 faux positifs** — `mobile-delete-trigger` et `timeline-responsive-stub` sont des **stubs de test**
  définis dans `TimelineEditHost.test.tsx`, pas des testids de production.
- **1 déjà couvert** — `timeline-event`.
- **9 écarts réels et planifiés** — `event-form-preview{,-bar,-connector,-ghost,-legend,-recurrence,-ruler,-timeline,-today}`
  posés par #315. Leur couverture E2E est **l'objet même de l'issue #314, planifiée au Sprint 47**.
  L'ordonnancement `#315 avant #314` est explicitement acté au plan de sprint : écrire la spec avant
  l'implémentation l'aurait fait réécrire aussitôt.
- Le parcours de suppression mobile (`timeline-actionsheet-delete`, testid préexistant du Sprint 42)
  est ramassé par **#205 au Sprint 47**.

Aucun écart non couvert : chacun est rattaché à une issue planifiée et datée, pas laissé en suspens.

## Review batch (Phase 7)

Verdict initial : **MERGEABLE AVEC RÉSERVES** — 0 CRITIQUE, 2 MAJEUR, 5 MINEUR.
Cycle de correction unique (`15fe038`) : **2/2 MAJEUR et 5/5 MINEUR résolus**.

- **M1** — la suppression mobile court-circuitait la confirmation alors que le hard-delete est physique.
  Corrigé : le chemin mobile passe par le **même** `DeleteConfirmDialog` que le desktop.
- **M2** — `deleteEvent` sans try/catch et promesse non attendue → unhandled rejection, feuille fermée
  comme si succès. Corrigé par convergence sur un point d'appel unique `runDelete(id)`, l'erreur remontant
  au `catch` du dialog qui possède la surface d'affichage.

## Conclusion

**Prêt pour PR.** Suite verte (433 backend + 596 frontend), review soldée, aucun blocage.

Deux réserves explicites, non bloquantes :
1. **Aucun rendu visuel vérifié** pour la mini-frise (#315) — clair/sombre reposent sur les tokens DS,
   sans inspection navigateur.
2. **Gap préexistant** confirmé par la review : `deleteEvent` n'invalide aucune query TanStack. Non
   introduit par ce sprint, mais #309 l'expose désormais au parcours mobile (frise stale après suppression).
   `runDelete` est le point d'accroche unique pour le corriger → follow-up à arbitrer en `/sprint end`.
