# Bugs résolus — MyTimeline

> Bugs notables corrigés, avec cause racine + fix. 4 lignes max par entrée.

## BUG-S4-001 — `/auth/refresh` : oracle d'énumération de compte (404 vs 401)
`refreshToken` renvoyait `404 "User not found"` quand le username d'un token signé valide n'existait pas en base, distinct du `401` token invalide → un attaquant énumère les comptes via tokens forgés (OWASP API3 / WSTG-IDNT-04). Fix : 401 avec body générique byte-identique au cas token expiré/invalide (`{"error":"token expiré ou invalide"}`), aucune ré-émission. (Sprint 4, review PR #113, commit 36772b4) — ⚠️ le même oracle subsiste sur `/me` (hors scope S4).
