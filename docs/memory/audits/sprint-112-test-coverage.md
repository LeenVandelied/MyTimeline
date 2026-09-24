# Audit tests — Sprint 112

> Généré en fin de Phase 6 par le lead, le 2026-09-24, sur HEAD `b5e717c1` ; complété après le cycle de correction de revue (`fb4654b1`).
> Un marqueur de manque bloquerait la Phase 9 ; il n'y en a aucun ci-dessous.

## Couverture par règle / issue

| Issue | Règle | Cross-system flow | Unit backend | Intégration | Vitest frontend | E2E parcours | E2E métier |
|----|-------------|:---:|:---:|:---:|:---:|:---:|:---:|
| #831 | BR-AUT-013 (préférence de thème) — plafond de débit par utilisateur sur `PUT /api/me/preferences` | OUI (front → proxy Next → filtres backend) | ⚠ N/A | ✅ `PreferencesUserRateLimitIntegrationTest` 3/3 (A au-delà → 429, B même IP → 200, anonyme → 401) | ✅ `e2e-rate-limit-budget.test.ts` | ✅ suite complète contre un backend reconstruit depuis HEAD | ✅ `rate-limit-armed.proof` (limiteur armé derrière le proxy) |
| #833 | BR-AUT-013 — échec du PUT de thème silencieux | NON (front seul) | ⚠ N/A | ⚠ N/A | ✅ `AuthContext.themeSaveToast.test.tsx` (chaîne réelle jusqu'à l'intercepteur, témoin qui toaste) | ⚠ N/A (pas de chemin navigateur pour forcer un 500) | ⚠ N/A |
| #768 | Cibles tactiles ≥ 44 px (PAT-S99-001) | NON | ⚠ N/A | ⚠ N/A | ⚠ N/A | ✅ 99/101/102 : 23/23 avant et après | ⚠ N/A |
| #767 | Cibles tactiles ≥ 44 px à 375 px | NON | ⚠ N/A | ⚠ N/A | ⚠ N/A | ✅ `sprint-112-touch-targets` | ⚠ N/A |
| #830 | Cibles tactiles ≥ 44 px, clair + sombre | NON | ⚠ N/A | ⚠ N/A | ✅ `theme-toggle.test.tsx` | ✅ `sprint-111-theme-toggle-unified` | ⚠ N/A |
| #832 | Budget rate-limit de la suite E2E | NON | ⚠ N/A | ⚠ N/A | ✅ `e2e-rate-limit-budget.test.ts` 42/42 | ✅ `settings-navigation` migrée | ⚠ N/A |
| #700 | Retour du focus après création (a11y) | NON | ⚠ N/A | ⚠ N/A | ✅ `ProductsListView.test.tsx`, `CategoriesView.test.tsx` | ✅ `sprint-112-focus-return` 8/8 (vrai tiroir, rechargement lent) | ⚠ N/A — volet lecteur d'écran manuel (dev), grille `docs/memory/sprints/sprint-112/issue-700-sr-checklist.md`, issue laissée ouverte |

## Tests créés
- `backend/src/test/.../PreferencesUserRateLimitIntegrationTest.java` (#831)
- `backend/src/test/.../PreferencesUserRateLimitPathVariantsIntegrationTest.java`, `UserRateLimitingFilterTest.java` (#831, correction de revue)
- `frontend/src/contexts/AuthContext.themeSaveToast.test.tsx` (#833)
- `frontend/e2e/support/touch-targets.ts` (#768, helper), `frontend/e2e/support/session.ts` (#832, helper)
- `frontend/e2e/sprint-112-touch-targets.spec.ts` (#767), `frontend/e2e/sprint-112-focus-return.spec.ts` (#700)

## Résultats runs (lead, HEAD `b5e717c1`)
- Backend : `./mvnw test` 670 tests, 670 passés, 0 échec, 0 erreur.
- Frontend : `tsc --noEmit` OK, `npm run lint` OK, `format:check` OK, Vitest 2280/2280.
- E2E : suite complète contre `next build` + `next start` (`:3100`) de HEAD, backend e2e reconstruit depuis HEAD (conteneur recréé 21:08 UTC, `UserRateLimitingFilter` présent dans le jar), `--ignore-snapshots`, 2 workers : 619 passés / 8 sautés / 1 rouge / 1 non exécuté, 0 flaky, 3,7 min.
  - Rouge : `sprint-77-theme-visual.spec.ts:620` (armement de comparaison visuelle, références Linux, rouge par construction sur darwin, déjà rouge au S111) — hors sprint.
  - Non exécuté : projet `rate-limit-armed`, bloqué par ce rouge (PIT-S88-007) ; rejoué seul (`--project=rate-limit-armed --no-deps`) : 1/1 passé.
- Couverture E2E des testids : 2 testids ajoutés, tous deux dans un harnais Vitest (`who`, `pref`), aucun en production.

## Cycle de correction de revue (`fb4654b1`)
- Variantes de chemin sur vrai serveur : `%70references` → routé ET compté dans le même seau ; `//` et `;jsessionid=` → 400 ; slash final et casse → 404. Aucune écriture hors plafond, filtre inchangé sur ce point.
- Repli de clé `name:` supprimé (inatteignable) → principal authentifié sans id de compte refusé en 401.
- Suite backend complète rejouée par le lead sur `fb4654b1` : 85 classes, 682 tests, 0 échec, 0 erreur.
- E2E non rejoués après ce commit : il ne change le comportement que pour un principal que la chaîne ne produit pas ; la CI de la PR joue la suite complète sur le SHA final.

## Non vérifié
- CI Linux (captures visuelles `sprint-77`), Firefox/WebKit, viewport mobile pour le retour du focus.
- Volet VoiceOver / NVDA de #700 (manuel, dev).
- Origine exacte des 400 sur `//` et `;jsessionid=` (pare-feu HTTP probable, non isolé).

## Conclusion
Prêt pour PR : revue batch traitée (0 critique, 0 majeur ; 2 mineurs corrigés en `fb4654b1`, les autres documentés). #700 reste ouverte pour le volet lecteur d’écran manuel.
