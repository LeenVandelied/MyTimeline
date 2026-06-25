# Décisions — MyTimeline

> Décisions d'architecture/implémentation consolidées en fin de sprint.

## DEC-S1-001 — Logique de mise à jour event déplacée controller → service
`EventController.updateEvent` contenait la boucle de mapping champ-par-champ (`containsKey`/`instanceof`/casts) sur un `Map<String,Object>`. Remplacée par un DTO typé `EventUpdateRequest` (`@Valid`) ; le mapping vit désormais dans `EventServiceImpl.updateEvent(UUID, EventUpdateRequest)`. Motif : respect hexagonal (controller mince), surface minimale avant les retouches #30/#31. (Sprint 1 #28)

## DEC-S1-002 — @Size(min=1) plutôt que @NotBlank sur EventUpdateRequest.title
Pour préserver la sémantique PATCH partielle (le front a un endpoint « couleurs seules » sans title). `@Size(min=1)` rejette "" (→400 « titre vide ») mais tolère l'absence (null). Voir [[pitfalls]] PIT-S1-001. (Sprint 1 #28)

## DEC-S1-003 — Identité d'ownership via cookie JWT (pattern existant ProductController)
Sprint 1 a réutilisé le pattern existant `@CookieValue("jwt")` + `jwtService` pour l'ownership, plutôt que `SecurityContextHolder`. Cohérence avec le code existant. Migration vers `SecurityContextHolder` (cohérence cookie/Bearer) actée en follow-up #93. (Sprint 1 #30)

## DEC-S2-001 — Rate limiting auth via Bucket4j in-memory mono-instance (pas Redis)
Bucket4j 8.10.1 in-memory (`io.github.bucket4j`), buckets `ConcurrentHashMap<(IP,path),Bucket>`. Motif : déploiement single-instance actuel, zéro infra ajoutée. Dette documentée : derrière un load-balancer à N replicas le plafond effectif = N × seuil → passer à `bucket4j-redis` au scale-out. (Sprint 2 #33)

## DEC-S2-002 — Contraintes d'unicité username/email au niveau JPA seulement (migration Flyway reportée S3)
`@Column(unique=true)` posé sur `UserEntity` (DB recréée en dev) sans migration Flyway ce sprint — la migration des contraintes DB est coordonnée avec Sprint 3 / #42. Le 409 sur doublon repose sur le catch `DataIntegrityViolationException` (username garde aussi un pré-check applicatif). (Sprint 2 #32)
