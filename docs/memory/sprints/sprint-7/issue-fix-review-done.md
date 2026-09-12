# Correctifs post-review Sprint 7 — retour fullstack-dev

Branche : `sprint/7` (worktree `nice-goldberg-86ef14`)
Commit : `7e58162` — `:lock: Correctifs post-review S7 — fuite credentials logs + champ name User`

## Findings traités (2/3)

### CRITIQUE — Fuite de credentials dans les logs (apiClient)
- Fichier : `frontend/src/services/apiClient.ts` (handler 403, ~l.65)
- Cause : `console.error('Erreur 403...', { ..., headers: error.config?.headers, ... })`
  loggait les en-têtes de la requête, incluant `Authorization` (jeton porteur) et
  cookies → fuite dans la console navigateur + agrégateurs de logs.
- Fix : suppression du champ `headers` de l'objet loggé. Conservé `url`, `method`,
  `data` (réponse serveur, non sensible) pour le debug. Commentaire explicatif ajouté.

### MAJEUR — Champ `name` manquant dans le type User
- Cause : le DTO backend `UserResponse` expose `{id, name, username, email, role}`
  (cf. `backend/.../application/dtos/UserResponse.java`), mais le frontend omettait
  `name` → désynchro DTO/type, `user.name` inaccessible côté UI.
- Fix (2 sources de vérité du type User dans le code) :
  - `frontend/src/types/auth.ts` — interface `User` : ajout `name: string`
  - `frontend/src/types/user.ts` — `UserSchema` zod (utilisé par `getUserProfile`
    pour parser `/auth/me`) : ajout `name: z.string()`
  - Ordre des champs aligné sur le backend : `id, name, username, email, role`.
- Fixtures de test mises à jour (rendues obligatoires par `name`) :
  - `frontend/src/contexts/AuthContext.test.tsx`
  - `frontend/src/hooks/useCurrentUser.test.tsx`

### Finding localStorage — REPORTÉ
- Non traité (conformément à la consigne). Stockage du user en `localStorage`
  (XSS-exposable) reste en l'état, à adresser dans un correctif dédié.

## Vérifications
- `cd frontend && npx vitest run` → PASS 12 / FAIL 0 (suite inchangée, verte)
- `npx tsc --noEmit` → No errors found
- lint-staged (eslint --fix + prettier) passé au commit, aucun changement fonctionnel

## Observations hors scope (non corrigées)
- Deux définitions concurrentes du type `User` coexistent (`auth.ts` interface vs
  `user.ts` zod `UserSchema`). Les deux désormais synchronisées avec le backend,
  mais la duplication est un risque de dérive future — candidat à unification.
- `frontend/.eslintcache` apparaît non suivi (artefact de build) ; volontairement
  exclu du commit, mais non ignoré par `.gitignore` — à ajouter au gitignore.
- Le briefing référencé `docs/memory/sprints/sprint-7/briefing-fix-review.md`
  était absent (la substitution `$(cat ...)` du prompt était littérale). Travail
  réalisé à partir de la description des 2 findings fournie dans la consigne +
  inspection du code et du DTO backend.

## Signaux MEMORY (à consolider par le lead)
- [MEMORY:pitfall] Context: log d'erreur HTTP côté client. Solution: ne jamais
  logger `error.config.headers` (contient Authorization/cookies). Prevention:
  loguer uniquement url/method/status/data.
- [MEMORY:pattern] Problem: désynchro DTO Java / type front. Solution: aligner
  `UserSchema` zod ET l'interface TS sur `UserResponse` (zod-dto-sync). Anti-pattern:
  deux types `User` divergents non synchronisés.

STATUS: COMPLETED
