# Patterns — MyTimeline

> Patterns réutilisables consolidés en fin de sprint.

## PAT-S1-001 — Ownership IDOR via helper d'identité
Contrôle d'accès sur les endpoints de mutation : helper privé (`resolveCaller(token)` → User|null ; `checkEventOwnership` → ResponseEntity d'erreur non-null ou null si OK) factorisant 401/404/403. L'identité est dérivée du JWT authentifié, JAMAIS d'un path param contrôlable par le client. Pour un event : `event → productId → product.getUser().getId() == caller.getId()`. (Sprint 1 #30/#91)

## PAT-S1-002 — resolveCaller centralise l'extraction JWT + le mapping d'erreur
`resolveCaller(token)` enveloppe `jwtService.extractUsername` dans `try/catch (JwtException) → null`, réutilisé par tous les checks d'ownership (createEvent, PATCH, DELETE). Évite la duplication d'`extractUsername` nu et le risque 500. (Sprint 1 #91)
