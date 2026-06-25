# Sprint history — MyTimeline

> Tracking des sprints. Source unique de vérité = milestones GitHub (MEMO-011).
> Plan généré le 2026-06-25 (3 sprints séquentiels, harden-then-found).

## Sprint 1 — 2026-06-25 (PLANIFIE — cohésion ~0.33, Sécurité backend : IDOR, validation, DTO)
**Objectif :** Corriger les failles P0 backend (IDOR, validation silencieuse) + poser le DTO updateEvent.
**Milestone GitHub :** #1
**Issues :** #28, #30, #31
**Vagues :** V1 = #28 | V2 = #30 | V3 = #31 (séquentiel — fichiers partagés EventController/SecurityConfig)
**Migrations Flyway :** aucune
**Dépend de :** aucune
**Status :** En cours (implémenté, PR ouverte — V1/V2/V3 livrées + correction post-review)
**Commits :** 1c308ba (#28) · b606af8 (#30) · de0c095 (#31) · ec1e399 (fix post-review IDOR createEvent + JwtException 401)
**Tests :** Backend 16/16 verts (mvn test). Frontend : aucun changement.

## Sprint 2 — (PLANIFIE — cohésion ~1.0, Sécurité auth : fuite /me, rate-limit, 401/403)
**Objectif :** Compléter le durcissement auth (fuite password, brute-force, codes HTTP).
**Milestone GitHub :** #2
**Issues :** #32, #33, #51
**Vagues :** V1 = #32 + #51 (disjoints) | V2 = #33 (SecurityConfig après #32)
**Migrations Flyway :** aucune (contrainte unique #32 posée en S3 via #42)
**Dépend de :** Sprint 1 (#51 requiert le ControllerAdvice de #30)
**Status :** Planifié

## Sprint 3 — (PLANIFIE — cohésion ~0.4, Fondations infra & DB : secrets, Flyway, audit JPA)
**Objectif :** Externaliser les secrets, versionner le schéma (Flyway), poser l'audit JPA (@Version/timestamps).
**Milestone GitHub :** #3
**Issues :** #34, #42, #43
**Vagues :** V1 = #34 | V2 = #42 (absorbe contraintes uniques #32) | V3 = #43 (après migration #42)
**Migrations Flyway :** V1__baseline.sql + V2 (version/timestamps + unique)
**Dépend de :** Sprint 2 (coordination contraintes uniques)
**Status :** Planifié
