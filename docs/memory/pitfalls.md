# Pitfalls — MyTimeline

> Pièges récurrents consolidés en fin de sprint. 4 lignes max par entrée.

## PIT-S1-001 — @NotBlank sur un DTO de PATCH casse les updates partiels
Un PATCH partiel légitime peut omettre un champ (ex: endpoint « couleurs seules »). `@NotBlank` rejette null ET "" → casse l'omission. Utiliser `@Size(min=1)` (rejette "" mais tolère null) + application conditionnelle `if(!=null)` côté service. Vérifier TOUS les call-sites front avant de poser une contrainte de présence. (Sprint 1 #28)

## PIT-S1-002 — @Valid inerte si le DTO ne porte aucune contrainte
`@Valid` sur un `@RequestBody` ne fait rien si le DTO n'a aucune annotation Bean Validation (`AuthRequest` sans `@NotBlank` → login acceptait un payload vide). Toujours vérifier que le DTO porte des contraintes, sinon `@Valid` est cosmétique. (Sprint 1 #31)

## PIT-S1-003 — jwtService.extractUsername non catché dans un controller → 500
`extractUsername` lève `JwtException` (token malformé/expiré/signature) ; sans try/catch dans le controller → 500 + fuite stacktrace. Centraliser dans un helper `resolveCaller(token)` avec `try/catch (JwtException) → null` mappé en 401. (Sprint 1 #30/#91)

## PIT-S1-004 — `git add -A` dans un worktree sprint capture les artefacts d'orchestration
Le worktree sprint contient des fichiers untracked d'orchestration (`docs/memory/sprints/sprint-N/*` briefings/done.md). `git add -A` les capture par erreur. Stager explicitement les fichiers source/test (`git add <paths>` ciblés). (Sprint 1 correction post-review)
