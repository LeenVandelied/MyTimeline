# Audit tests — Sprint 101

> Rédigé par le lead en fin de Phase 6 (2026-09-22). Chiffres rejoués par le lead depuis le worktree,
> pas repris des retours d'agents.

## Couverture par règle / issue

| Règle / issue | Description | Cross-system flow | Unit (Vitest) | E2E | Justification |
|---|---|:---:|:---:|:---:|---|
| #733 (intercepteur 403) | 403 → toast « Accès refusé », aucune redirection, verrou `isRedirecting` non pris ; le 401 redirige toujours | NON | ✅ `apiClient.test.ts`, `ApiErrorTranslatorBridge.intl.test.tsx`, `apiErrorMessages.test.ts` | N/A | Comportement du seul intercepteur axios : la réponse 403 est simulée, aucun flux entre systèmes ou rôles |
| BR-AUT-003 (#735) | Politique de mot de passe front alignée sur `StrongPasswordValidator` (Unicode) | NON | ✅ `password-policy.test.ts` (52 → 58 tests, bloc de divergence supprimé) | N/A | Validation Zod côté client ; le serveur reste la source de vérité, inchangé |
| #754 | Cibles tactiles ≥ 44 px sous 768 px (drawers, dialogues, croix, rangées denses), desktop inchangé | NON | ✅ `lib/touchTarget.test.ts`, `ui/dialog.test.tsx` | ✅ `sprint-101-touch-targets.spec.ts` (rouge sur 449ad984, vert après) | Géométrie : seul un navigateur la mesure |
| #757 | Croix lisible sur contenu défilé, clair et sombre, fond opaque | NON | ✅ `ui/dialog.test.tsx` | ✅ `sprint-101-dialog-close-contrast.spec.ts` (rouge sur l'ancien `dialog.tsx` dans les 2 thèmes) | Contraste calculé sur rendu réel |
| #758 | FAB vs fin du tableau de bord en paysage mobile | NON | N/A | ✅ `sprint-101-fab-landscape.spec.ts` (sonde + témoin + contrôle de structure capable de rougir) | Aucun défaut mesuré, aucun code de production modifié |

Aucune ligne n'exige un E2E métier multi-rôles : les 5 issues sont frontend seul, sans nouveau flux serveur.

## Tests créés
- `frontend/e2e/sprint-101-touch-targets.spec.ts` (#754)
- `frontend/e2e/sprint-101-dialog-close-contrast.spec.ts` (#757)
- `frontend/e2e/sprint-101-fab-landscape.spec.ts` (#758)
- `frontend/src/lib/touchTarget.test.ts` (#754)
- Ajouts : `apiClient.test.ts`, `password-policy.test.ts`, `ui/dialog.test.tsx`, `ApiErrorTranslatorBridge.intl.test.tsx`, `apiErrorMessages.test.ts`

## Résultats des runs (lead, worktree, HEAD fd9da74e)
- Vitest : 154 fichiers / 1975 tests verts (`node_modules` réinstallé par `npm ci` : vitest 3.2.7)
- `next build` (webpack, variables de proxy posées AU BUILD) : vert, lint compris
- E2E suite complète chromium contre `next build` + `next start`, `--workers=1 --ignore-snapshots` :
  **496 passés, 8 sautés, 1 rouge attendu** — `sprint-77-theme-visual.spec.ts:620` (armement visuel : son garde-fou
  refuse d'écrire une référence darwin ; les captures ne se jugent que sur Linux, en CI). 7,5 min.
- Backend : aucun changement ; pas de run Maven.
- **Après le correctif de review `fbd08fb4`** (dégagement des hitboxes éditer/archiver, #754) : nouvelle assertion
  vue ROUGE sur la build d'avant (entraxe 44,0 px) puis VERTE (48,0 px) ; rebuild `next build` + `next start`,
  8 specs citant la surface (`categories`, `golden-path`, `products`, `sprint-101-touch-targets`,
  `sprint-92-product-detail-actions`, `sprint-93-restore-product`, `sprint-95-toast-overlap`,
  `sprint-96-palette-geometry`) : **39/39 verts** ; Vitest 154 / 1975 verts ; tsc et lint propres.
  (Un premier rejeu à 33 rouges était un harnais cassé — ancien `next-server` resté vivant pendant le rebuild,
  PIT-S95-001 — et non le code : rejoué après arrêt du bon PID.)

## Conclusion
Prêt pour la PR. Le seul rouge local est environnemental et se tranche en CI Linux.
