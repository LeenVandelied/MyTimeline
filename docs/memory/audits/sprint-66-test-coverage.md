# Audit tests — Sprint 66

> Généré en fin de Phase 6 (2026-09-03). Toutes les valeurs proviennent de runs RÉELS lancés et lus par
> le lead depuis le worktree, sur HEAD `aaf85e2` (code figé aux commits `a5b18d5` #455 et `f24ef96` #79).
> Aucune n'est reprise d'un rapport de subagent sans relance.

## Couverture par BR

| BR | Description | Cross-system flow | Unit backend | Integration | Vitest frontend | E2E parcours | E2E métier |
|----|-------------|:---:|:---:|:---:|:---:|:---:|:---:|
| (aucune) | #455 et #79 ne modifient aucune règle métier : déclencheur UI + adaptation au clavier virtuel. BR exercées sans être modifiées : BR-EVE-002 (produit requis), BR-EVE-005 (startDate défaut), BR-EVE-007/009 (défauts `isRecurring`/`color` toujours soumis en mode réduit) | NON | ⚠ N/A (backend intact) | ⚠ N/A | ✅ | ✅ | ✅ (création complète assertée côté serveur sous 390 px, avec et sans clavier simulé) |

Aucune cellule de couverture manquante. Le backend n'est pas touché (0 fichier Java dans le diff) : la
suite backend n'a pas été relancée pour ce sprint — la CI `backend` le fera sur la PR.

## Tests créés / modifiés
- `frontend/src/components/layout/AppShell.test.tsx` (+6) — FAB câblé sur le MÊME `showCreate`, un seul
  drawer monté, bouton desktop inchangé. Tête de fichier : prouve le câblage, PAS la visibilité `lg:hidden`.
- `frontend/e2e/sprint-66-mobile-create-event.spec.ts` (nouveau, 3 tests) — 390×844 : bouton desktop
  masqué, FAB visible, sheet `.mt-sheet`, création complète relue via l'API ; 844×390 ; 1280×900 : palier
  inverse. **Contrôle négatif joué** (`lg:hidden` → `hidden`) : 2 tests mobiles rougissent ; restauré.
- `frontend/src/hooks/useMobileKeyboard.test.ts` (nouveau) + `src/__tests__/support/visualViewport.ts`
  (stub `EventTarget` partagé) — seuils, transitions show/hide, no-op sans API / `enabled:false`, nettoyage.
- `frontend/src/components/EventEditForm.test.tsx`, `events/NewEventDrawer.test.tsx`,
  `settings/mobile/BottomSheet.test.tsx` (additifs) — props opt-in `compact`/`footerPortalNode`, payload
  complet en mode réduit, `data-keyboard`/`data-compact`, callbacks. Aucune assertion existante affaiblie
  (vérifié par le reviewer).
- `frontend/e2e/sprint-66-mobile-keyboard.spec.ts` (nouveau, 3 tests) — clavier SIMULÉ (`addInitScript`
  redéfinit `visualViewport`) : `data-keyboard`, `data-compact`, pied ≤ 494 px, couleur masquée puis de
  retour, création assertée serveur ; sheet Réglages réactive. **Contrôles négatifs joués** (seuil →
  100000 : 3 E2E + 7 unitaires rougissent ; retrait de `form={formId}` : test du portail rougit) ; restaurés.
- `frontend/e2e/sprint-62-select-focus-indicator.spec.ts` — commentaire seul.

## Résultats des runs — tous lus, aucun déduit

| Suite | Résultat | Quand |
|---|---|---|
| Vitest (`vitest run`) | **102 fichiers / 1030 tests, 1030 passed, 0 failed**, exit 0 | HEAD `aaf85e2` (baseline `abd3a4a` : 101 / 1004) |
| `tsc --noEmit` | 0 erreur | HEAD `aaf85e2` |
| E2E Playwright complet (`workers: 2`, Next dev `:3100` → backend e2e `:8086`) | **246 tests : 238 passed / 0 failed / 8 skipped**, 7,8 min, exit 0, un seul bloc `Running` dans le log | HEAD `aaf85e2` |
| E2E ciblés par les fullstack-dev (non-régression) | #455 : 40 passed / 0 failed · #79 : 31 passed / 0 failed | pendant les vagues |

Les 8 `skipped` sont les mêmes qu'au S65 (specs conditionnelles, hors périmètre).

## Ce qui n'est PAS prouvé
- **Le comportement réel du clavier virtuel iOS Safari / Android Chrome** : aucun moteur headless ne
  l'ouvre ; l'E2E stubbe `visualViewport`. Oracle de câblage. Limite assumée par le plan du sprint.
  Follow-up : test sur appareil réel.
- **`next build`** non lancé localement (`.next` partagé avec le `next dev` du harnais) : la CI `frontend`
  est le premier vrai build. `env(safe-area-inset-bottom)` vaut 0 en headless.
- Aucune vérification navigateur manuelle du contraste du FAB : il réutilise `bg-primary` /
  `text-primary-foreground`, déjà mesurés sur le CTA desktop.

## Conclusion
Prêt pour PR. Review batch : PRET_POUR_MERGE (0 CRITIQUE, 0 MAJEUR sur le code, 2 MINEUR non corrigés,
documentés dans `docs/memory/sprints/sprint-66/review-batch.md`).
