# Audit tests — Sprint 35

> Généré en fin de Phase 6. Aucun `[MISSING]` → Phase 9 PR débloquée.
> Thème : Prod boot safety & secrets (fail-fast boot prod). Sprint 100% backend `infrastructure/config`.

## Couverture par exigence

| Exigence | Cross-system flow | Unit backend | Integration | Frontend | E2E parcours | E2E métier |
|----------|:---:|:---:|:---:|:---:|:---:|:---:|
| #254 — fail-fast prod si `app.cookie.secure=false`/absent | NON | ✅ | ⚠ N/A | ⚠ N/A | ⚠ N/A | ⚠ N/A |
| #253 — fail-fast prod si `COOKIE_DOMAIN` vide | NON | ✅ | ⚠ N/A | ⚠ N/A | ⚠ N/A | ⚠ N/A |
| #253 — fail-fast prod si `CORS_ALLOWED_ORIGINS` vide | NON | ✅ | ⚠ N/A | ⚠ N/A | ⚠ N/A | ⚠ N/A |
| #253 — comportement dev/test inchangé (pas de blocage) | NON | ✅ | ⚠ N/A | ⚠ N/A | ⚠ N/A | ⚠ N/A |

Cross-system flow = NON pour tout le sprint : garde-fous de démarrage `ProfileSafetyGuard`
(`ApplicationEnvironmentPreparedEvent`, avant beans), testables sans contexte Spring ni Docker.
Aucun flux multi-systèmes/rôles → E2E métier NON requis. Aucune surface UI (0 fichier `.tsx`, 0 data-testid)
→ E2E parcours NON requis (cf. Phase 8 coverage-e2e OK).

## Tests créés / modifiés
- `backend/.../config/ProfileSafetyGuardTest.java` (+7 cas #254, +9 cas #253 ; 4 tests prod-effectifs
  existants #216/#254 ajustés pour poser domain/CORS valides — focalisation).
- `backend/.../config/ProdConfigStartupLoggerTest.java` (2 tests WARN morts supprimés, log INFO conservé).

## Résultats runs (test-runner, wrapper `test-quiet.sh`)
- Backend : 374 tests, 374 passed, 0 failed, 0 error, 0 skip.
- Frontend : 421 tests, 421 passed, 0 failed, 0 TS error (non-régression, sprint backend-only).
- E2E : N/A (backend config, 0 UI change).

## Note #249 (hors périmètre code)
Issue #249 (rotation secrets prod) = action opérationnelle pure, **différée hors PR** (décision dev).
Aucun livrable code, aucun test applicable. Rotation à exécuter manuellement dans le secrets-manager.

## Conclusion
Prêt pour PR. Suite verte, périmètre backend `infrastructure/config` intégralement couvert par tests unitaires
bloquants (cas dangereux + cas de contrôle dev/test). Aucun `[MISSING]`.
