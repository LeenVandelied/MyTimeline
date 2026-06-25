# Sprint history — MyTimeline

> Tracking des sprints. Source unique de vérité = milestones GitHub (MEMO-011).
> Plan généré le 2026-06-25 (3 sprints séquentiels, harden-then-found).

## Sprint 1 — 2026-06-25 (Terminé — merge PR #91 dans dev — cohésion ~0.33, Sécurité backend : IDOR, validation, DTO)
**Objectif :** Corriger les failles P0 backend (IDOR, validation silencieuse) + poser le DTO updateEvent.
**Milestone GitHub :** #1 (fermé après merge)
**Issues livrées (3) :** #28, #30, #31
**Vagues exécutées :** V1 = #28 | V2 = #30 | V3 = #31 (séquentiel — fichiers partagés EventController/SecurityConfig)
**Cohésion score :** ~0.33
**Commits :** 1c308ba (#28 DTO) · b606af8 (#30 ownership/ControllerAdvice) · de0c095 (#31 @Valid/STATELESS) · ec1e399 (fix post-review : IDOR createEvent + JwtException 401) · e542dc8 (handler 400 @Valid, review PR #91)
**Migrations Flyway :** aucune
**Dépend de :** aucune
**BR impactées :** BR-EVE-001 (titre @Valid effectif), BR-EVE-007 (@NotNull isRecurring), BR-EVE-008 (ownership create/update/delete), BR-PRO-004 (ownership produit), BR-PROD-001 (@Valid nom produit).
**Reviews :** review batch (Phase 7 + /review-pr #91) — 2 CRITIQUE (IDOR createEvent, JwtException→500) + 3 MAJEUR, tous RÉSOLUS (commits ec1e399, e542dc8).
**Tests :** Backend 17/17 verts (mvn test). Frontend : aucun changement → pas d'E2E à compléter.
**Nouveaux pitfalls/patterns/décisions :** voir docs/memory/{pitfalls,patterns,decisions}.md (PIT-S1-001..004, PAT-S1-001/002, DEC-S1-001..003).
**Follow-ups arbitrés (triage Phase 4) :**
  - getProducts catch(Exception) [S | auth] → issue #92 (backlog)
  - Identité via SecurityContextHolder [M | auth] → issue #93 (backlog)
  - Refactor Impl→ports hexagonal [M | transversal] → issue #94 (backlog)
  - findEventById double-hit + printStackTrace [S | events] → issue #95 (backlog)
  - hasRole + 404 liste vide [XS | events] → issue #96 (backlog)
  - @Valid Category à vérifier [XS | categories] → issue #97 (backlog)
  - Cookie Secure conditionné env [S | auth] → fusionné dans #32 (commentaire, évite doublon)
  Bilan : 6 issues créées, 1 fusionné, 0 discardé, 0 absorbé (ratio discard 0%).

## Sprint 2 — 2026-06-25 → 2026-06-25 (Terminé — merge PR #98 dans dev — cohésion ~1.0, Sécurité auth : fuite /me, rate-limit, 401/403)
**Objectif :** Compléter le durcissement auth (fuite password, brute-force, codes HTTP).
**Milestone GitHub :** #2 (fermé après merge)
**Issues livrées (3) :** #32, #33, #51
**Vagues exécutées :** V1 = #32 ∥ #51 (parallèles, fichiers disjoints) | V2 = #33 (SecurityConfig partagé avec #51)
**Cohésion score :** ~1.0 (3 issues epic:auth)
**Commits :** 4 — f650d9d (#32 UserResponse/cookie/unique) · 5896fa7 (#51 401/403 exceptionHandling) · 74b88d2 (#33 rate-limit Bucket4j + headers) · 53175da (#33 fix XFF spoofing post-review)
**Migrations Flyway :** aucune (contrainte unique #32 posée JPA-only, migration DB coordonnée S3 via #42)
**Dépend de :** Sprint 1 (#51 requiert le ControllerAdvice de #30 — présent sur dev)
**BR impactées :** BR-AUT-008 (no password leak /me), BR-AUT-001 (unique→409), BR-AUT-010 (cookie logout cohérent), BR-AUT-005 (401 sans fuite), BR-EVT-001 (ownership→403), BR-AUT-002 (rate-limit + headers).
**Reviews :** reviewer batch — 0 CRITIQUE / 4 MAJEUR / 5 MINEURS. 1 MAJEUR résolu (XFF spoofing, commit 53175da) ; 2 MAJEUR pré-existants (JWT body login A3, refresh sans validation A5) → dette S3 ; MINEURS = dette connue (follow-ups).
**Tests :** Backend 29/29 verts (`SKIP_DELEGATION=1 mvn test`, BUILD SUCCESS). Pas de CI repo → garantie = run local. Frontend : aucun changement → pas d'E2E.
**Nouveaux pitfalls/patterns/décisions :** PIT-S2-001..005, PAT-S2-001..003, DEC-S2-001/002 (voir docs/memory/{pitfalls,patterns,decisions}.md).
**Saturation contexte lead (mesure) :** ~modérée — fan-out 2 vagues + review + fix, purge contexte via done.md (pas de retour brut subagent conservé).
**Absorbé en cours (XS) :** aucun (périmètre tenu strict par issue).
**Follow-ups arbitrés (Phase 4 triage — 7 créés en backlog, 0 discard, 0 absorbé) :**
  - Externaliser config cookies JWT Secure/Domain [S | auth] → issue #99
  - Uniformiser body 403 ownership EventController [S | events] → issue #100
  - Durcir la CSP [S | auth] → issue #101
  - Rate-limit par compte + Redis distribué [M | auth] → issue #102
  - Endpoint reset-password [M | auth] → issue #103
  - Retirer JWT brut du body de login (A3) [S | auth] → issue #104
  - Valider expiration token avant /auth/refresh (A5/BR-AUT-009) [S | auth] → issue #105
  Note PM : pas de labels stack `backend/frontend/fullstack` dans le repo (scope porté par epics + titres). Ratio discard 0%.
**Status :** Terminé

## Sprint 3 — 2026-06-25 (Terminé — merge PR #106 dans dev, cohésion ~0.4, Fondations infra & DB)
**Objectif :** Externaliser les secrets, versionner le schéma (Flyway), poser l'audit JPA (@Version/timestamps).
**Milestone GitHub :** #3 (fermé après merge)
**Issues livrées (3) :** #34 (secrets externalisés + profils dev/prod), #42 (Flyway baseline V1 + uniques V2 + ddl-auto=validate), #43 (audit JPA : createdAt/updatedAt + @Version + equals/hashCode sur 4 entités)
**Vagues exécutées :** V1 = #34 | V2 = #42 (absorbe contraintes uniques #32) | V3 = #43 (après migration #42) — chaîne strictement séquentielle (fichiers/migrations partagés)
**Migrations Flyway :** V1__baseline.sql + V2__unique_constraints.sql + V3__add_audit_columns.sql (schéma `public` version 3)
**Cohésion score :** ~0.4 (epic:devops ×2 + epic:transversal ×1)
**Commits :** 8 (3 issues + 1 fix review ProductEntity.id + 1 fix review couverture test + 3 artefacts/PR body)
**BR impactées :** BR-AUT-001 (unicité username via contrainte DB), BR-AUT-002 (JWT signé via clé configurée)
**Reviews :** 3 reviewers /sprint start (reviewer + db-expert + security-expert) + review intent /review-pr (--against sprint 3, blind) — 0 CRITIQUE, findings MAJEUR : faux positif DB_PASSWORD (écarté) + drift baseline events (→ issue #108) ; 2 MINEURS corrigés (ProductEntity.id private, couverture test 4 entités).
**Tests :** Backend 41/41 verts (était 32 ; +9 couverture audit User/Product/Event). Flyway « 4 migrations validated », Hibernate `validate` OK. Pas de frontend testable, pas d'E2E (issues infra).
**Nouveaux pitfalls / décisions / patterns :** PIT-S3-001..005, DEC-S3-001..004, PAT-S3-001..002.
**Données dev assainies :** 3 users à email dupliqué (`loic.de-laforcade@emgsa.ch`) dédupliqués par UPDATE plus-addressing (réversible, validé par le dev) — débloquait V2.
**Note workflow :** commit #34 initialement égaré sur `dev` (checkout principal) → recovery cherry-pick sur sprint/3 + reset dev (WIP playwright préservé). Vagues #42/#43 épinglées au worktree.
**Follow-ups arbitrés (Phase 4 triage) :**
  - Drift baseline events (CHECK/NOT NULL absents de V1) [M | devops] → issue #108
  - Isolation tests (Testcontainers / profil test) [M | devops] → issue #109
  - Index sur colonnes FK products/events [S | devops] → issue #110
  - Durcissement SPRING_PROFILES_ACTIVE (fallback prod→dev) [S | devops/sécu] → issue #111
  - Nettoyage historique git anciens secrets (BFG) [S | sécu] → issue #112
  - `scripts/test-quiet.sh` absent [XS | tooling] → consigné seulement (nit)
  - Default DB password dev ≠ vrai mdp local [XS | tooling] → consigné seulement (nit)
  - Chip task_d9b2cff4 (dédup emails dev) → FAIT pendant le sprint
**Status :** Terminé

## Sprint 4 — 2026-06-25 (PLANIFIÉ — cohésion 0.71, Auth & CSP : dette reviews S1-S3)
**Objectif :** Durcir l'auth (fuite JWT en body de login, refresh sans validation d'expiration, cookies en dur), uniformiser le 403 d'ownership via le handler central, durcir la CSP.
**Milestone GitHub :** #4
**Issues :** #104, #105, #99, #100, #101
**Vagues :** V1 (parallèle, fichiers disjoints) = #100 (EventController) + #101 (SecurityConfig) | V2 (séquentielle, même `AuthController.java`) = #104 → #105 → #99
**Migrations Flyway :** aucune
**Dépend de :** aucune
**Status :** Planifié

## Sprint 5 — 2026-06-25 (PLANIFIÉ — cohésion 0.50, DB & profils : dette reviews S1-S3)
**Objectif :** Réconcilier la baseline Flyway (CHECK/NOT NULL events manquants), ajouter les index sur colonnes FK, durcir SPRING_PROFILES_ACTIVE (fallback prod→dev silencieux).
**Milestone GitHub :** #5
**Issues :** #111, #108, #110
**Vagues :** V1 (parallèle) = #111 (application.properties) | V2 (séquentielle, migrations) = #108 (V4 contraintes) → #110 (V5 index)
**Migrations Flyway :** V4__reconcile_events_constraints.sql, V5__fk_indexes.sql
**Dépend de :** aucune
**Note :** #112 (purge historique git) DÉFÉRÉE hors sprint — opération ops one-shot (secrets déjà rotatés #34, repo public donc déjà aspirés + cache GitHub, 11 worktrees actifs ⇒ force-push disruptif). Issue ouverte sans milestone.
**Status :** Planifié
