# Audit tests — Sprint 86

> Rédigé par le lead (Phase 6), finalisé le 2026-09-12 après les corrections de revue et le 2e run E2E complet.
> Le marqueur de lacune bloquante du gabarit n'est volontairement jamais écrit littéralement ici (PIT-S76-007 : le gate grep
> mord sur sa propre documentation). Aucune lacune bloquante.

## Périmètre

100 % frontend, aucune migration, aucun fichier backend (DEC-S86-001). Issues : #618 (surface unique), #646 (libellé),
#617 (catégorie dérivée), + corrections C1/C2/C3 (revue et suite E2E).

## Couverture par règle / décision

| Règle | Description | Flux inter-systèmes | Unit backend | Intégration | Vitest | E2E parcours | E2E métier |
|---|---|:---:|:---:|:---:|:---:|:---:|:---:|
| DEC-S86-001 | Catégorie d'événement = catégorie du produit, lecture seule | NON (affichage front d'une donnée du DTO produit) | N/A | N/A | ✅ `EventCategoryField.test.tsx` (9), `NewEventDrawer.test.tsx`, `TimelineEditHost.test.tsx` | ✅ `sprint-86-event-category.spec.ts` (création + édition) | N/A |
| BR-EVE-002 | `productId` requis à la création | OUI (front → API) | ✅ existant | ✅ existant | ✅ `NewEventDrawer.test.tsx` | ✅ `sprint-42-events` | ✅ existant |
| #452 / BR-EVE-006 | Hint de troncature de série (horizon 5 ans) | OUI (preview API) | ✅ existant (`RecurrenceExpansionServiceImpl`) | ✅ existant | ✅ clé assertée (`EventEditForm.test.tsx:564`) | ✅ `sprint-82-recurrence-capped-hint` (MONTH) | ✅ même spec |
| #618 | Surface de formulaire unique, token 452 px, fermeture identique | NON | N/A | N/A | ✅ `TimelineEditHost.test.tsx`, `NewEventDrawer.test.tsx`, garde Échap `useFocusTrap` (contre-épreuve) | ✅ `sprint-70/71-*-preview-pinned`, `sprint-66-mobile-*`, `sprint-42-events` | N/A |
| C1 | Pied de la bottom sheet dans l'écran à 320 px, 4 locales | NON | N/A | N/A | N/A (jsdom sans mise en page) | ✅ `sprint-63-de-overflow-audit` `event-form` + `create-form` à 320 px (désormais asserté) | N/A |
| C2 | Audit de débordement mesuré au repos | NON | N/A | N/A | N/A | ✅ `settle()` attend les animations ; armement prouvé (débord au repos injecté → rouge) ; auto-contrôle #74 vert | N/A |
| C3 | Drawer modal : verrou de scroll + fond inerte | NON | N/A | N/A | ✅ `EventFormDrawer.test.tsx` (8, contre-épreuve : 8/8 rouges sans le code) | ✅ `sprint-86-form-drawer-modal.spec.ts` (création) | N/A |

## Lacunes connues (non bloquantes, proposées en follow-up au `/sprint end`)

- Hint de troncature pour une série **WEEK** : aucune spec (seul MONTH est couvert).
- Aucun test ne lit le **texte traduit** du hint (mock i18n `ns.key`).
- Verrou/inertage (C3) prouvé en E2E côté **création** seulement ; aucun test miroir en édition (revue cycle 2, MINEUR).
- Empilement `DeleteConfirmDialog`/`ConflictDialog` par-dessus le panneau (double `hideOthers`) non testé (revue cycle 2, MINEUR).
- Oracle d'inertage limité à la sidebar : `hideOthers` épargne les ancêtres des régions `aria-live` (comme Radix).

## Résultats des runs (lead, sur le code final `f21eef8`)

- **`./scripts/test-quiet.sh frontend`** : exit 0 — `next build` 52/52 pages · **Vitest 129 fichiers / 1537 tests, 0 échec** ·
  typecheck OK · lint 0 avertissement. `stderr` observé dans 3 fichiers de test **non touchés par le sprint**
  (`DeleteConfirmDialog.intl.test.tsx` : `act()`, `AccountSection.test.tsx` : `Description` de `DialogContent`,
  `exportService.test.ts` : log Zod voulu) → préexistant, hors périmètre.
- **Prettier** (16 fichiers frontend du diff, `rtk proxy`) : conforme · **Coverage-E2E des testids** : 0 testid neuf sans spec.
- **E2E suite complète — run 1** (base neuve `s86full`, `next dev :3100` webpack, `--ignore-snapshots`, 2 workers, 383 tests,
  6,2 min) : 366 passés / 9 échecs / 8 sautés. 8 échecs `sprint-63-de-overflow-audit` imputables au sprint (C1 régression
  réelle à 320 px, C2 mesure pendant l'animation) + 1 armement visuel `sprint-77` attendu hors Linux.
- **E2E suite complète — run 2** (après C1/C2/C3, NOUVELLE base `s86run2`, même harnais, 384 tests, 6,4 min) :
  **375 passés / 1 échec / 8 sautés**. Seul échec : `sprint-77-theme-visual.spec.ts:565` (armement de comparaison — référence
  `-chromium-darwin` absente par construction ; jugé par la CI Linux). Serveur surveillé pendant les deux runs : aucune
  interruption.

## Revues

- `reviewer` cycle 1 : 0 CRITIQUE / 1 MAJEUR (corrigé en C3) / 1 MINEUR (vérifié, sans correction).
- `reviewer` cycle 2 (commits de correction) : MAJEUR **RÉSOLU** · 0 CRITIQUE / 0 MAJEUR / 3 MINEUR (follow-ups).
- `ui-design` : 11 CONFORME / 4 ÉCART acceptable / 0 à corriger ; contraste AA tranché par calcul dans les deux thèmes.

## Conclusion

**Prêt pour PR.** Reste à juger par la CI Linux : les comparaisons de captures `sprint-77` et la reproduction de l'audit
`sprint-63` sous jammy (mesures faites sous macOS).
