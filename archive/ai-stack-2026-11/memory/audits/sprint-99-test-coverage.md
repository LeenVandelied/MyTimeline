# Audit tests — Sprint 99

> Phase 6, joué par le lead le 2026-09-21. Aucune BR métier impactée (a11y / cibles tactiles, frontend seul).

## Couverture par issue

| Issue | Sujet | Cross-system flow | Unit (Vitest) | E2E | Contrôle négatif |
|---|---|:---:|:---:|:---:|:---:|
| #459 | `title` des textes tronqués de `SessionList` | NON | ✅ `SessionList.test.tsx` (+ repli, badge exclu) | ✅ sonde lead jetable 375/1280 (non committée) | ✅ agent (title retiré → rouge) |
| #738 | Cibles 44 px des réglages mobiles, desktop inchangé | NON | ✅ `src/components/ui` + `settings` | ✅ `sprint-99-touch-targets.spec.ts` 13 tests | ✅ 4 rouges / 14 étapes sur le code d'avant |
| #738 (effet de bord) | Oracle TALL 390×844 de #714 réécrit (recouvrement partiel) | NON | — | ✅ `sprint-95-toast-overlap.spec.ts` 9/9 ×3 | ✅ rouge « non nul » sur primitives d'avant |
| #739 | Poignée exemptée (doc seule) | NON | — (aucun rendu modifié) | — (croix 44 déjà mesurée par `settings-mobile`) | sans objet |

Aucune règle métier P0/P1 ni flux multi-systèmes : pas d'E2E métier requis.

## Tests créés / modifiés
- `frontend/e2e/sprint-99-touch-targets.spec.ts` (nouveau)
- `frontend/e2e/sprint-95-toast-overlap.spec.ts` (régime TALL réécrit, décision du dev)
- `frontend/src/components/settings/SessionList.test.tsx` (+ cas title)

## Résultats runs (lead)
- Vitest : 152 fichiers, 1956/1956 verts
- `tsc --noEmit` OK, `format:check` OK, `next build` OK
- Backend : non rejoué (0 fichier backend modifié)
- E2E suite complète contre `next build` + `next start` (:3100 → backend :8087, base `eventmanager_e2e`) : 486 passed / 1 failed / 8 skipped / 1 did not run (3,4 min). Seul échec : armement `sprint-77-theme-visual:620` sous `--ignore-snapshots` (mécanique, identique S97/S98). Aucune référence darwin écrite.

## Non vérifié
- CI Linux : marge de ≈ 3,5 px de la borne basse de l'oracle TALL #714 si les métriques de police diffèrent
- Firefox / WebKit, tablette 768–1023, rendu visuel des consommateurs Input/Select hors réglages (leurs specs sont vertes)

## Conclusion
Prêt pour PR.
