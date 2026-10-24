# Audit tests — Sprint 111

> Généré en fin de Phase 6 (lead). `[MISSING]` bloque la PR.

## Couverture par BR

| BR | Description | Cross-system flow | Unit backend | Intégration | Vitest frontend | E2E parcours | E2E métier |
|----|-------------|:---:|:---:|:---:|:---:|:---:|:---:|
| BR-AUT-013 | Préférence de thème portée par le compte ; arbitrage à la connexion explicite (compte non nul gagne, sinon choix local explicite adopté, sinon rien) | OUI (front ↔ API ↔ DB, 2 appareils) | ✅ `ThemePreferenceTest` (9), `UserServiceImplTest` (+3), `UserControllerTest` (+13) | ✅ `ThemePreferenceIntegrationTest` (6, Postgres réel, boot V16 en `validate`, CHECK SQL, 2e session) | ✅ `AuthContext.theme.test.tsx` (14), `useThemeChoice.test.tsx` (+6), `types/user.test.ts` (+8) | ✅ `sprint-111-theme-toggle-unified` | ✅ `sprint-111-theme-account-preference` (compte neuf : choix avant connexion adopté, puis 2e appareil au choix local contraire → le compte gagne) |
| BR-AUT-008 | Projection `/me` sans secret, désormais avec `themePreference` | NON | ✅ `UserControllerTest` | ✅ `ThemePreferenceIntegrationTest` | ✅ `types/user.test.ts` | ✅ (via `sprint-111-theme-account-preference`, lecture `GET /api/me`) | N/A |

Issues sans BR : #655 (bascule unique : `theme-toggle.test.tsx`, `useThemeChoice.test.tsx` avec garde « seul point d'écriture » qui scanne `src/` et `app/`, `AppShell.test.tsx`, `dashboard-mobile.test.tsx` ; E2E `sprint-111-theme-toggle-unified`) ; #827 (suppression, `next build` 52/52 pages statiques, `document-lang` et `sprint-110-not-found-ephemeris` verts).

## Tests créés
- backend : `ThemePreferenceTest`, `ThemePreferenceIntegrationTest` ; extensions `UserControllerTest`, `UserServiceImplTest`, `UserDataExportTest`, `ExportRenderersTest`
- frontend : `src/hooks/useThemeChoice.test.tsx`, `src/contexts/AuthContext.theme.test.tsx`, extensions `theme-toggle.test.tsx`, `theme-toggle.i18n.test.ts`, `AppShell.test.tsx`, `dashboard-mobile.test.tsx`, `types/user.test.ts`
- E2E : `frontend/e2e/sprint-111-theme-toggle-unified.spec.ts`, `frontend/e2e/sprint-111-theme-account-preference.spec.ts`, helper `frontend/e2e/support/theme-preference.ts`
- supprimés : `frontend/app/[locale]/not-found.test.tsx` (avec l'écran, #827)

## Résultats runs
- Backend : 667/667 (suite complète, agent #653) ; après `97d4d8a2` (lead) : `ThemePreferenceIntegrationTest` 6/6, `UserControllerTest` 36/36, `UserServiceImplTest` 6/6
- Frontend : Vitest 2267/2267 (agent #653 front, dernier état) ; tsc / lint / prettier verts
- `next build` (lead, HEAD `f20d277d` moins le commit e2e final) : 52/52 pages statiques, `/_not-found` inchangé
- E2E suite complète (lead, `next build` + `next start`, backend e2e dédié `:8087` construit depuis HEAD, base neuve V1→V16, `--ignore-snapshots`, 2 workers) : 604 passés / 8 sautés / 2 rouges hors sprint / 2 non exécutés (`rate-limit-armed.proof`, projet final bloqué par les rouges)
  - `sprint-77-theme-visual:620` : armement de capture sans référence darwin — connu (S95/S110)
  - `sprint-101-fab-landscape:271` : rouge connu préexistant (#769, A/B S104) ; 24/24 en isolation ×3
  - 1 erreur hors test (`apiRequestContext.get: Test ended`) causée par le helper du sprint → corrigée en `f20d277d` ; specs concernées 11/11 ×3 ensuite
- Vérification visuelle (lead, sonde Playwright jetable) : bascule publique, pied de sidebar du shell (1280 px) et tiroir mobile (375 px) rendus corrects en clair et en sombre

## Conclusion
Prêt pour PR. Aucun `[MISSING]`. Non vérifié localement : comparaisons de captures (Linux uniquement → CI).
