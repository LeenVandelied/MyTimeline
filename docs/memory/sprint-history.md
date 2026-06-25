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

## Sprint 4 — 2026-06-25 (Terminé — merge PR #113 dans dev, cohésion 0.71, Auth & CSP : dette reviews S1-S3)
**Objectif :** Durcir l'auth (fuite JWT en body de login, refresh sans validation d'expiration, cookies en dur), uniformiser le 403 d'ownership via le handler central, durcir la CSP.
**Milestone GitHub :** #4 (fermé après merge)
**Issues livrées (5) :** #100, #101, #104, #105, #99
**Vagues exécutées :** V1 (parallèle) = #100 (EventController 403) + #101 (CSP) | V2 (séquentielle `AuthController.java`) = #104 → #105 → #99
**Cohésion score :** 0.71
**Commits :** 7 — 3c36a7f (#100) · 6a58832 (#101) · 707e136 (#104) · 4b6a85d (#105) · 46b628b (#99) · 2e39e08 (fix review : défaut cookie fail-safe) · 36772b4 (fix review : contrat erreur + anti-énumération /refresh + CSP base-uri/object-src)
**Migrations Flyway :** aucune
**Dépend de :** aucune
**BR impactées :** BR-EVE-008/BR-EVT-005 (ownership 403 uniforme), BR-SEC-003 (CSP XSS), BR-AUT-007 (login cookie/body), BR-AUT-009 (refresh expiration), BR-AUT-010 (cohérence cookies). Anti-patterns résolus : A3, A5, A6, A7.
**Reviews :** reviewer batch + security-expert (×2, sprint + `/review-pr 113`) — 0 CRITIQUE / 1 MAJEUR convergent (défaut cookie non fail-safe, RÉSOLU 2e39e08) + 2 MAJEUR contrat/énumération (RÉSOLUS 36772b4) / MINEURS (CSP durcie + @Value, RÉSOLUS ; reste en follow-ups).
**Tests :** Backend 41/41 verts (Testcontainers Postgres, BUILD SUCCESS ~11s). Pas de CI repo → garantie = run local. Frontend : aucun changement → pas d'E2E.
**Nouveaux pitfalls/patterns/décisions :** PIT-S4-001..005, PAT-S4-001/002, DEC-S4-001/002, BUG-S4-001 (voir docs/memory/{pitfalls,patterns,decisions,bugs-resolved}.md). Pack `br-auth.md` mis à jour (BR-AUT-007/009 + A3/A5/A6/A7 marqués résolus).
**Saturation contexte lead (mesure) :** modérée — fan-out 2 vagues + audit + 2 reviews + 2 fix, purge via done.md (pas de retour brut subagent conservé en contexte).
**Absorbé en cours (XS) :** aucun (périmètre tenu strict par issue).
**Follow-ups arbitrés (Phase 4 triage — 6 issues créées, 2 discard, 0 absorbé) :**
  - Uniformiser body 401 BadCredentials login [XS | auth] → issue #116 (Sprint 5)
  - Test profil dev cookieSecure=false [XS | auth] → issue #117 (Sprint 5)
  - Définir COOKIE_DOMAIN prod avant déploiement [XS | infra] → issue #118 (Sprint 5)
  - **Unifier réponse 403 AccessDeniedException (handler unique + test d'intégration réel) [S | auth, P1]** → issue #119 (Sprint 5) — fidélité test #100
  - Externaliser/durcir CORS + cookie par profil (origins, exposedHeaders, SameSite) [S | auth] → issue #120 (Sprint 5)
  - Externaliser connect-src CSP par profil si API cross-origin futur [S | auth] → issue #115 (backlog)
  - `Map.of` en FQN inline [XS | auth] → discard (cosmétique)
  - Outillage test cassé (mvnw + test-quiet.sh) [S | devops] → discard du triage GitHub (déjà couvert par chip task_16249110)
**Status :** Terminé

## Sprint 5 — 2026-06-25 (Terminé — merge PR #121 dans dev, DB & profils + dette reviews auth S1-S4)
**Objectif :** Réconcilier la baseline Flyway (CHECK/NOT NULL events), index FK, durcir SPRING_PROFILES_ACTIVE, + dette reviews auth (401 JSON, 403 unifié, CORS/cookie par profil, COOKIE_DOMAIN).
**Milestone GitHub :** #5 (fermé après merge)
**Scope élargi (décision dev) :** plan architect = 3 issues DB/profils (#108,#110,#111) ; le dev a choisi d'exécuter **les 8 issues du milestone** en ajoutant les 5 follow-ups auth/infra du triage S4 (#116,#117,#118,#119,#120). 2 domaines (db+auth), au-delà du cap 3 issues/10pts — cohésion volontairement dégradée, arbitrage assumé.
**Issues livrées (8) :** #108, #110, #111, #116, #117, #118, #119, #120
**Vagues exécutées :** V1 (∥4) = #108+#111+#116+#119 | V2 (∥2) = #110+#117 | V3 = #120 (solo) | V4 = #118 (solo). Matrice conflits : AuthControllerSecurityTest (#116→#117), SecurityConfig (#119→#120), application.properties (#111), application-prod.properties (#120→#118), migrations (#108→#110).
**Migrations Flyway :** V4__reconcile_events_constraints.sql (CHECK/NOT NULL events + **pré-vol PL/pgSQL self-safe** sur base peuplée, ajouté review #121) + V5__fk_indexes.sql (index FK). Schéma → version 5. V1/V2/V3 intacts.
**Commits :** 11 — 66f1b96 (#108) · 0a0973c (#111) · 41759b5 (#116) · 136915b (#119) · b9818d2 (#110) · cd5ee90 (#117) · ac8363f (#120) · 0f01b4b (#118) · acc13e2 (artefacts) · de35b95 (wording audit) · 5773b6d (fixes review #121).
**Dépend de :** aucune. #112 (purge historique git) DÉFÉRÉE hors sprint (issue ouverte sans milestone).
**BR impactées :** BR-AUT-005 (401 neutre anti-énumération), BR-AUT-007 (403 forbidden unifié), BR-AUT-010 (cookies cohérents — test profil dev), contraintes events (CHECK type/units), index FK products/events. Anti-pattern A8 confirmé (follow-up #123).
**Reviews :** sprint Phase 7 (reviewer + db-expert + security-expert : 0 CRITIQUE) + **/review-pr #121** (3 reviewers indépendants : **4 escalations CRITIQUE/MAJEUR = faux positifs** lectures périmées, vérifiés contre HEAD ; 1 finding réel V4 base peuplée + 3 nits → tous corrigés). Détail : docs/memory/sprints/sprint-5/review-batch.md.
**Tests :** Backend **56/56 verts** (Testcontainers, BUILD SUCCESS ~11.6s). Baseline S4 41 → +15. Pas de frontend → pas d'E2E. Pas de CI repo → garantie = run local. Audit : docs/memory/audits/sprint-5-test-coverage.md (0 couverture manquante).
**Nouveaux pitfalls/patterns/décisions :** PIT-S5-001..004, PAT-S5-001..006, DEC-S5-001..005.
**Saturation contexte lead (mesure) :** modérée-haute — 4 vagues fan-out (jusqu'à 4 ∥) + Phase 5/6 specialists + /review-pr 3 reviewers + 1 cycle de fix, purge via done.md (pas de retour brut conservé). Incident notable : pollution working tree partagé en V1 (4 agents ∥) → résolu commits par chemins explicites (PIT-S5-004) ; test-runner a mal-rapporté 41 vs 56 (vérifié direct).
**Absorbé en cours :** 2 follow-ups résolus dans le sprint (doc ENVIRONMENT=production + CORS_ALLOWED_ORIGINS consolidés dans le runbook hub #118). 4 fixes review #121 (V4 self-safe, handler 401 mort, param inutilisé, assert test).
**Follow-ups arbitrés (Phase 4 triage — 9 issues créées en backlog libre, 0 discard, 0 absorbé tardif) :**
  - users.role CHECK+NOT NULL DB [S | devops] → #122
  - Refactor contrôleurs → interfaces (A8/DIP) [M | transversal] → #123
  - BR-PRO-006 JPQL WHERE user_id (exploiter idx_products_user) [S | products] → #124
  - Contrat erreur JSON /me+register+logout [S | auth] → #125
  - writeJsonError sans concat JSON [XS | auth] → #126
  - buildBody codes stables (not_found/validation_failed) [XS | events] → #127
  - CHECK conditionnels cross-field events DB [XS | events] → #128
  - Test profil prod cookie Secure=true [XS | auth] → #129
  - Log config cookie/CORS effective au boot prod [S | infra] → #130
**Status :** Terminé

## Sprint 6 — 2026-06-25 (PLANIFIÉ — cohésion 0.55, Fondations outillage & CI)
**Objectif :** Débloquer tout le frontend futur — tokens DS (Graphite/Tailwind 4 @theme), infra de test frontend (Vitest+RTL+Playwright+Storybook+Husky), CI GitHub Actions. Enablers purs, zéro greenfield bloqué.
**Milestone GitHub :** #6
**Issues :** #45, #29, #38
**Vagues :** V1 (∥) = #45 + #29 (sérialiser package.json) | V2 = #38 (CI, dépend des scripts de #29)
**Migrations Flyway :** aucune
**Dépend de :** aucune (point d'entrée de l'arc frontend)
**Note :** #35 (typo tailwing.config.ts + deps mortes next-auth/date-fns) absorbé comme tâche-zéro de #45. layout.tsx : ordre providers imposé Theme(#45) > Auth(S7) > Query(S7).
**Status :** Planifié

## Sprint 7 — 2026-06-25 (PLANIFIÉ — cohésion 0.45, Socle frontend : état serveur + auth context)
**Objectif :** Couche d'accès données + contexte auth, pré-requis de tout écran — Auth Context React (#40), TanStack Query (#48), backend profil /me PATCH + change-password (#70). Premier usage des tokens S6.
**Milestone GitHub :** #7
**Issues :** #40, #48, #70
**Vagues :** V1 (∥) = #70 (backend, disjoint) + #40 | V2 = #48 (après #40 — layout.tsx partagé, wrap Query autour Auth)
**Migrations Flyway :** aucune
**Dépend de :** Sprint 6 (#45 tokens, #29 infra test)
**Note :** layout.tsx = fichier le plus à risque (ordre Theme>Auth>Query). #70 corrige BR-AUT-008 (/me PATCH sans fuite password).
**Status :** Planifié

## Sprint 8 — 2026-06-25 (PLANIFIÉ — cohésion 0.70, Premier vertical Auth bout-en-bout)
**Objectif :** Flux mot de passe oublié complet (back Brevo #49 + front DS #53) — 1er flux cross-system → bascule stratégie E2E Playwright (1ʳᵉ E2E métier du projet).
**Milestone GitHub :** #8
**Issues :** #49, #53
**Vagues :** V1 (∥) = #49 (backend) + #53 (frontend écrans) | V2 = câblage #53→#49 | V3 = 1ʳᵉ E2E Playwright (forgot→reset)
**Migrations Flyway :** V6__create_password_reset_tokens.sql (renumérotée depuis V4 périmé — UNE plage S8)
**Dépend de :** Sprint 6 (#45 tokens, #29 Playwright) + Sprint 7 (#40 AuthContext, #48 TanStack, #70 DTO/contrat)
**Décision dev (cadrage) :** #103 fermée comme doublon de #49 ; #49 porte le flux ; durée token = 15 min ; BR-AUT-011 + tests intégration de #103 absorbés dans #49.
**Status :** Planifié
