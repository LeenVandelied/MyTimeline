# Issue #135 — Sécuriser la persistance auth : sortir le user PII du localStorage (A17)

**Sprint :** 9 | **Vague :** 1 | **Taille :** M | **Domaine :** auth

## Commits
- `584b2ae7f768852b4f04e6c4f9409f2cf2d4f445`

## Résumé
**Option 1 retenue** : re-fetch `GET /api/auth/me` au mount, suppression totale du miroir localStorage du user.
- Fichiers : `frontend/src/contexts/AuthContext.tsx` (useEffect mount → `fetchUser()`/me au lieu de `localStorage.getItem('user')`, `loading=true` pendant re-fetch), `frontend/src/services/authService.ts` + `apiClient.ts` (retrait `removeItem('user')` morts), `useCurrentUser.ts` (commentaire).
- Consommateurs localStorage vérifiés (`grep -rn "localStorage" frontend/src/`) : SEUL `AuthContext` lisait/écrivait `user`. Aucun composant ne lit localStorage — tous passent par `useAuth()`. `useAuth.ts` = simple ré-export du contexte.
- Contrat /me (lecture seule) : `AuthController.getUserDetails` → `UserResponse.fromDomain` (id/name/username/email/role, PAS de password — BR-AUT-008 OK).
- Flash non-authentifié : pas de régression, le dashboard garde `if(!loading && !user) redirect`.

## Tests
- **26/26 passed** (`./scripts/test-quiet.sh frontend`). AuthContext 6 tests (restauration /me, anonyme si /me KO, propagation login, absence PII post-login, logout, guard provider). `tsc --noEmit` + eslint clean.

## Signaux mémoire
- `[MEMORY:decision]` Persistance auth #135 — Option 1 (re-fetch /me au mount depuis cookie JWT HttpOnly) vs Option 2 (restriction champs). Motif : /me renvoie déjà un DTO propre, pont existant (PAT-S7-004), retrait 100% PII du storage.
- `[MEMORY:pitfall]` br-auth pack cite `useAuth.ts` pour A17 mais `useAuth.ts` n'est qu'un ré-export ; la vraie source était `AuthContext.tsx`. Toujours `grep -rn "localStorage"` avant de traiter.

## Recommandations suite
- RECOMMAND_SECURITY (validation légère) : confirmer qu'aucune autre surface (cache TanStack Query, SSR) ne réintroduit la PII persistée. Cache Query en mémoire ici (non persisté) → risque a priori nul, à confirmer par security-expert.

STATUS: COMPLETED
