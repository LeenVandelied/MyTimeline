# Audit tests — Sprint 21

> Généré en fin de Phase 6. Sprint « Réglages utilisateur » (epic:auth) : #75 backend avatar, #86 desktop settings, #87 mobile settings, + correction avatar bout-en-bout.

## Couverture par BR

| BR | Description | Cross-system flow | Unit backend | Integration (MockMvc) | Vitest frontend | E2E parcours | E2E métier |
|----|-------------|:---:|:---:|:---:|:---:|:---:|:---:|
| BR-AUT-001 | Ownership avatar (POST/GET/DELETE /me/avatar dérivés du JWT) | OUI | ✅ `AvatarServiceImplTest` (magic bytes, taille, ownership, cleanup) | ✅ `UserControllerTest` multipart (200/400/404/401, DELETE 204) | ✅ `userService.test` + `ProfileSection.test` (upload succès/erreur, mutation, avatarUrl) | ⚠ deferred | ⚠ deferred → `/create-e2e` |
| BR-AUT-001 | Suppression compte (re-saisie username → DELETE /me) | OUI | ✅ (suite backend user) | ✅ | ✅ `AccountSection`/`useDeleteAccountFlow`/`DeleteAccountSteps` | ✅ `settings-navigation`/`settings-mobile` (nav + sheet 2 étapes) | ⚠ deferred → `/create-e2e` |
| BR-AUT-001 | Profil/préférences/sessions (PATCH /me, change-password, sessions) | OUI | ✅ | ✅ | ✅ sections + hooks (261→271) | ⚠ deferred | ⚠ deferred → `/create-e2e` |

> **Cross-system flow=OUI** → le contrat cross-system est couvert par **l'intégration backend MockMvc** (HTTP multipart → controller → service → LocalStorageAdapter → DB) + **les tests composant/service frontend** (UI → mutation → apiClient). La couche **E2E navigateur bout-en-bout** (avatar/password/delete en Playwright réel) n'est PAS exécutée : l'infra E2E du projet est naissante (`frontend/e2e/` était vide avant S21) et le wrapper `test-quiet.sh` n'orchestre pas de backend up. Ce n'est pas un trou de couverture du contrat métier (couvert en intégration), mais un report de la couche E2E → plan `/create-e2e` post-merge (Phase 8, review-protocol A.4). Aucune couverture bloquante manquante : le risque métier P1 est couvert aux couches unit + intégration + composant (le report E2E navigateur est assumé, pas un trou non mitigé).

## Tests créés / adaptés
Backend (3 fichiers) :
- `backend/.../application/services/AvatarServiceImplTest.java` (12 : magic bytes jpeg/png/webp, non-image, vide, trop lourd, ownership, cleanup, GET 404, delete idempotent)
- `backend/.../infrastructure/adapters/LocalStorageAdapterTest.java` (6 : round-trip + rejet path-traversal)
- `backend/.../infrastructure/adapters/controllers/UserControllerTest.java` (+10 multipart : succès/avatarUrl, 400, GET stream/404, 401, DELETE 204)

Frontend (16 fichiers touchés, dont) :
- Sections settings : `ProfileSection`, `SecuritySection`, `PasswordStrength`, `SessionList`, `AccountSection`, `SettingsShell` + `mobile/{SettingsIndex,MobileSettings,BottomSheet}`
- Services/types : `userService.test.ts`, `types/user.test.ts` (avatarUrl nullable) + fixtures `AuthContext.test`, `useCurrentUser.test`
- E2E specs (authored, non exécutées ici) : `frontend/e2e/settings-navigation.spec.ts`, `settings-mobile.spec.ts`

## Résultats runs (test-runner Phase 6 + re-run correction)
- Backend : **268 tests, 268 passed, 0 failed**
- Frontend : **271 tests, 271 passed, 0 failed** (baseline 261 + 10 de la correction avatar) ; `tsc --noEmit` 0 erreur ; `next build` 0 erreur
- E2E : non exécuté par le wrapper (Playwright nécessite backend orchestré) → `/create-e2e` post-merge

## Revues
- **security-expert** (advisory amont + audit code) : GO. 0 CRITIQUE / 0 MAJEUR. Upload cité comme modèle de référence (magic bytes, UUID, resolveWithinBase, cleanup).
- **reviewer batch** : 0 CRITIQUE / 3 MAJEUR / 3 MINEUR. Les 3 MAJEUR (avatar non branché bout-en-bout) → **RÉSOLUS** par commit `d10e4a3`. MINEUR backend commentaire → résolu. MINEUR restants (check MIME client UX-only, refactor `requireCaller`) → non bloquants, skippés/backlog.

## Conclusion
**Prêt pour PR.** Contrat métier BR-AUT-001 couvert unit + intégration + composant, suite verte (268 back / 271 front), review MAJEUR résolus, sécurité GO. Report assumé : couche E2E navigateur (→ `/create-e2e` post-merge) + follow-ups (export RGPD, migration stockage objet).
