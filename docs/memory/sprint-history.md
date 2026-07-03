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

## Sprint 6 — 2026-06-25 (Terminé — merge PR #131 dans dev — cohésion 0.55, Fondations outillage & CI)
**Objectif :** Débloquer tout le frontend futur — tokens DS (Graphite/Tailwind 4 @theme), infra de test frontend (Vitest+RTL+Playwright+Storybook+Husky), CI GitHub Actions. Enablers purs, zéro greenfield bloqué.
**Milestone GitHub :** #6 (fermé après merge)
**Issues livrées (4) :** #45, #29, #38 + **#35 absorbé** (fermé)
**Vagues exécutées :** V1 = #45 (+#35) | V2 = #29 | V3 = #38 — **sérialisé** (package.json partagé #45/#29 → `npm install` concurrent corromprait le lock ; chaîne #45→#29→#38).
**Cohésion score :** 0.55 (epic:design + epic:devops ×2)
**Commits :** `1012034` (#35 dead code) · `4f5da4a` (#45 tokens Graphite) · `6ca0b13` (#29 infra test) · `343461b` (#38 CI) · `2f02142` (fix review intra-sprint) · `2e223ca` (artefacts) · `bb05ec0` (fix /review-pr) · `f3051d4` (traçabilité)
**Migrations Flyway :** aucune
**Dépend de :** aucune (point d'entrée de l'arc frontend)
**BR impactées :** aucune (sprint outillage).
**Source DS :** tokens Graphite récupérés du hand-off Claude Design (n'existaient pas dans le repo) → `frontend/src/styles/ds/` + `docs/design/graphite-handoff.md`. Cf. mémoire `mytimeline-graphite-ds-source`.
**Reviews :** 2 passes — intra-sprint (5 MAJEUR/4 MINEUR, fix `2f02142`) + /review-pr #131 indépendante post-fix (4 MAJEUR/2 MINEUR : 3 fix `bb05ec0`, 3 déférés follow-up). Tous résolus/tracés.
**Tests/CI :** 1ʳᵉ CI du projet ✅ — run sprint/6 **vert** : frontend 58s + backend 42s (Testcontainers OK), < 10 min. Build/test/typecheck/lint re-vérifiés verts par le lead. E2E : aucune spec (1ʳᵉ E2E métier S8).
**Note :** layout.tsx ordre providers Theme(#45) > Auth(S7) > Query(S7) préparé. `FullCalendarEvent` gardé (vivant). Husky `core.hooksPath` en scope `--worktree`. Storybook builder Vite (webpack @storybook/nextjs casse sur Next 15.2).
**Follow-ups (à trier) :** activer branch protection (CI verte dispo) ; porter landing.css/animations.css + types/event.ts DEFAULT_COLORS + TimelineCalendar:221 sur tokens ; scoper landing CSS aux pages publiques ; consommer ds/components/* (S7/S8) ; vrais tests RTL + specs Playwright ; commitlint-config-gitmoji inutilisé.
**Status :** Terminé

## Sprint 7 — 2026-06-25 → 2026-06-30 (Terminé — merge PR #132 dans dev — cohésion 0.45, Socle frontend : état serveur + auth context)
**Objectif :** Couche d'accès données + contexte auth, pré-requis de tout écran — Auth Context React (#40), TanStack Query (#48), backend profil /me PATCH + change-password (#70). Premier usage des tokens S6.
**Milestone GitHub :** #7 (fermé après merge)
**Issues livrées (3) :** #40, #48, #70
**Vagues exécutées :** V1 (∥) = #70 (backend) + #40 (frontend, disjoints) | V2 = #48 (après #40 — layout.tsx partagé, wrap Theme>Auth>Query>children)
**Cohésion score :** 0.45
**Commits :** 24807b1 (#40 AuthContext+Toaster+redirections) · b9b334c (#70 /me PATCH+change-password, changePassword derrière le port = correction A8) · 464128f (#48 TanStack Query v5) · 7e58162 (fix-review : fuite credentials logs + User.name) · 235f3f3+0aae019 (review PR #132 : log password assaini + newPassword≠oldPassword + import type)
**Migrations Flyway :** aucune
**Dépend de :** Sprint 6 (#45 tokens, #29 infra test)
**BR impactées :** BR-AUT-001 (409 username PATCH /me), BR-AUT-008 (aucun password en réponse), BR-AUTH-003 (ROLE_USER dans contexte), change-password (400/204).
**Reviews :** sprint Phase 7 (1 CRITIQUE fuite headers + 2 MAJEUR, CRITIQUE+1 MAJEUR corrigés) ; /review-pr #132 batch 3 agents (0 CRITIQUE, MAJEUR connus reportés, MINEURs corrigés) — tous RESOLU.
**Tests :** Backend 68/68 green | Frontend 12/12 green (vitest) | E2E reporté S8 (Playwright login).
**Nouveaux pitfalls / decisions / patterns :** PIT-S7-001..003, PAT-S7-001..004, DEC-S7-001..002.
**Note :** layout.tsx = fichier le plus à risque (ordre Theme>Auth>Query respecté). 2 crashs subagents V1 récupérés depuis travail non commité. Tooling : `test-quiet.sh frontend` est un no-op (vitest non câblé) → follow-up.
**Follow-ups arbitrés (Phase 4 triage — 4/4 créés en backlog libre) :**
  - Câbler vitest dans test-quiet.sh + CI [S | transversal] → issue #133
  - Anti-énumération username 409 + rate-limit /api/me [S | auth] → issue #134 (complète #102 qui couvre /api/auth/*)
  - localStorage PII A17 (sortir user du localStorage) [M | auth] → issue #135
  - Qualité /me : audit log change-password + DRY resolveCaller + propagation erreur login/register [XS | auth] → issue #136
  - (Annexe taxonomie : labels `frontend`/`fullstack` créés par project-manager, absents du repo — à valider.)
**Status :** Terminé

## Sprint 8 — 2026-06-30 → 2026-07-01 (Terminé — merge PR #138 dans dev)
**Objectif :** Flux mot de passe oublié complet (back Brevo #49 + front DS #53) — 1er flux cross-system.
**Milestone GitHub :** #8 (fermé après merge)
**Issues livrées (2) :** #49, #53
**Vagues exécutées :** V1 (∥) = #49 (backend) + #53 (frontend) | V2 = specialists (db-expert, security, reviewer, test-runner) | fix review + fix CI build
**Cohésion score :** 0.70
**Commits :** 5 — ffa91ad (#49) · 1900fae (#53) · 23c9938 (fix review anti-énum/apiClient/XSS/doc) · 95c8833 (fix CI Suspense reset-password) · b3cae4c (artefacts)
**Migrations Flyway :** V6__create_password_reset_tokens.sql (renumérotée depuis V4 périmé)
**Dépend de :** Sprint 6 (#45 tokens, #29 Playwright) + Sprint 7 (#40 AuthContext, #48 TanStack, #70 DTO/contrat)
**Décision dev (cadrage) :** #103 fermée doublon ; durée token = 15 min ; BR-AUT-011 + tests intégration de #103 absorbés dans #49.
**BR impactées :** BR-AUT-001/002/003/005/011, **BR-AUT-012 (nouveau — flux reset)**.
**Reviews :** security 1 CRITIQUE (timing leak) RÉSOLU ; reviewer checklist tout OK (2 MINEUR résolus/follow-up) ; db-expert V6 mergeable (1 MAJEUR TTL→follow-up).
**Tests :** Backend 84/84 verts · Frontend 23/23 verts · `next build` SSG OK · E2E 0 (V3 planifié post-merge `/create-e2e`). Vérifiés directement par le lead (test-runner Haiku non fiable 2×).
**Nouveaux pitfalls/patterns/décisions :** PIT-S8-001..005, PAT-S8-001..004, DEC-S8-001/002 ; pack br-auth BR-AUT-012 + note A10/email corrigée.
**Incident tooling :** test-runner Haiku 2 rapports erronés (mauvais checkout cwd, puis échec halluciné) → validation manuelle. CI a rattrapé un build cassé invisible aux tests RTL (PIT-S8-001/004). Mémoire perso : cd worktree explicite pour subagents.
**Status :** Terminé
**Follow-ups arbitrés (Phase 4 triage — 8 issues créées backlog, 0 discard, 0 absorbé) :**
  - Purge/TTL tokens reset [S | backend] → issue #139
  - Fail-fast/health si BREVO_API_KEY absente prod [S | backend] → issue #140
  - Rate-limit/lockout par token reset [S | backend] → issue #141
  - i18n template email EN/DE/ES [S | backend] → issue #142
  - Verrou anti-TOCTOU consume token [XS | backend] → issue #143
  - Test unitaire dédié BrevoEmailService [XS | backend] → issue #144
  - E2E Playwright flux reset (V3, 1ʳᵉ E2E métier) [M | frontend] → issue #145 (via /create-e2e 138 post-merge)
  - Vérifier rendu clair/sombre 4 écrans en navigateur [S | frontend] → issue #146
  - Écartés d'office : merge #48 (caduc — react-query déjà présent), rafraîchir br-auth A10 (fait en consolidation).

## Sprint 9 — 2026-07-01 → 2026-07-01 (Terminé — merge PR #149 dans dev)
**Objectif :** Aligner le modèle métier sur le design v3 (blocker racine Wave 3/4) + sécuriser la persistance auth.
**Milestone GitHub :** #9 (fermé après merge)
**Issues livrées (2) :** #44 (modèle v3 : couleurs/archived/enum RecurrenceUnit/avatar, migration IRRÉVERSIBLE), #135 (sortir user PII du localStorage, A17)
**Vagues exécutées :** V1 = #44 ‖ #135 (100% disjoints, Java/SQL vs TS — pas de V2)
**Cohésion score :** 0.55
**Migrations Flyway :** V7__design_v3_schema.sql (couleurs bg/border/text→color + enum recurrence_unit + archived — **IRRÉVERSIBLE**, ADR-001)
**Dépend de :** aucune (débloque S10 colonne archived, S12 enum/recurrenceEndDate, S13 avatar)
**Commits :** 5 (#44 eb3621b, #135 584b2ae, fix-review 751d265, artefacts 322847a, audit a7cf04b) + merge f0b1c89
**BR impactées :** BR-EVT-001, BR-CAT-001, BR-EVE-006, BR-EVE-011 ; A17 clos
**Reviews :** Phase 5 db-expert (V7) 0 CRITIQUE/0 MAJEUR · security-expert (A17) 0/0 · reviewer batch 0 CRITIQUE/0 MAJEUR/3 MINEUR (2 corrigés 751d265, 1 différé)
**Tests :** Backend 84/84 green | Frontend 23/23 green | E2E N/A (runner Playwright absent du package.json — dette infra)
**Nouveaux decisions/pitfalls/patterns :** DEC-S9-001/002, PIT-S9-001/002/003, PAT-S9-001
**Points durs :** migration irréversible (ADR-001 + confirmation avant run prod) ; sync Zod frontend reportée S10/S11.
**Absorbé en cours (XS) :** 2 corrections review (commentaires obsolètes) — commit 751d265.
**Follow-ups arbitrés (Phase 4 triage) :**
  - Sync Zod/types frontend sur contrat DTO events v3 (couleurs/recurrenceUnit enum/archived) [M | events frontend] → issue #150 (Sprint 11)
  - Exposer `avatar` dans le type User frontend [XS | auth frontend] → issue #151 (Sprint 13)
  - Index partiel `WHERE archived=false` [XS | db] → déjà couvert par #88 (enforcement quota)
**Status :** Terminé

## Sprint 10 — 2026-07-01 (Terminé — merge PR #153 dans dev — cohésion 0.50, Backend Produits + Catégories — Wave 3 back)
**Objectif :** CRUD backend Produits (PATCH + soft delete) et Catégories (+ réassignation) pour débloquer le frontend Wave 3.
**Milestone GitHub :** #10 (fermé après merge)
**Issues livrées (2) :** #50 (Product PATCH + soft delete archived), #52 (CRUD catégorie + réassignation + ownership ownerId)
**Vagues exécutées :** V1 = #50 | V2 = #52 — séquencé sur `ProductRepository.java` partagé (fichiers disjoints par ailleurs)
**Migrations Flyway :** **V8** `category_ownership.sql` (owner_id + FK users + index + UNIQUE(owner_id,name), backfill owner NULL=système). #50 n'a PAS eu besoin de migration (archived déjà en V7) → pas de V9.
**Dépend de :** Sprint 9 (#44 : colonne archived, enum, etc.)
**Décision conception :** ownership catégorie tranchée = **PAR UTILISATEUR (ownerId)** → ADR-002 / [[DEC-S10-001]]. Supersede AP-CAT-09 (référentiel global).
**Cohésion score :** 0.50
**Commits :** 15 (2 impl + fixs sécurité/review + absorption + consolidation mémoire)
**BR impactées :** BR-PRO-001/004/007, BR-CAT-001/002/003/004/006 + nouvelle BR ownership catégorie.
**Reviews :** db-expert (V8) OK · security-expert 1 CRITIQUE + 1 MAJEUR (cross-tenant produit→catégorie) RÉSOLUS · reviewer batch 1 MAJEUR (self-reassign FK) + 2 MINEUR RÉSOLUS · **/review-pr #153 (2 tours)** : T1 = 2 MAJEUR (handler DataIntegrity trop large ; GET catégories fuite cross-tenant + ownerId exposé) + 2 MINEUR RÉSOLUS ; T2 = 1 MINEUR (port non scopé orphelin) RÉSOLU. Tous verdicts finaux READY/SÉCURISÉ.
**Tests :** Backend **148/148 green** (surefire, dont intégration Testcontainers Postgres : réassignation atomique+rollback, filtre archived, unicité scoped-owner, listing scopé) | Frontend `next build` OK (CI) | E2E N/A (sprint backend pur ; parcours produit/catégorie → Wave 3 front #61 S11).
**Nouveaux pitfalls / patterns / décisions :** PIT-S10-001..005 (scope reads+writes après ajout ownership, handler DataIntegrity pas fourre-tout, save détaché sans @Version, @SQLRestriction masque les transverses, valider ownership de la cible) · PAT-S10-001/002 (soft delete @SQLRestriction ; unicité applicative+DB→409 scopé service) · DEC-S10-001 (ADR-002 ownership catégorie).
**Follow-ups arbitrés (Phase 4 triage) :**
  - Extraire `resolveCaller` dans ProductController [S | products] → issue #154 (backlog)
  - `ProductResponse`/`EventResponse` DTO (fuite domain model produit, AP-CAT-03) [M | products] → **absorbé** (commit 36e9e6f, +2 tests)
  - FK RESTRICT owner_id avant DELETE /me [note | auth] → commenté sur #78 (S13)
  - UUID hardcodés front AddProducts.tsx [M | front] → déjà tracé #61 (S11), pas de doublon
**Saturation contexte lead (mesure) :** ~élevée (sprint long : 2 impl + 4 cycles de fix sécurité/review + absorption ; ~10 subagents spawnés sur la durée /start+/review-pr×2+/end).
**Status :** Terminé

## Sprint 11 — 2026-07-01 (Terminé — merge PR #157 dans dev — cohésion 0.42, Frontend Produits + Dialogs — Wave 3 front)
**Objectif :** Drawer Produit (fin des UUID hardcodés + fix desync Zod) + dialogs de confirmation partagés.
**Milestone GitHub :** #11 (fermé après merge)
**Issues livrées (2) :** #65 (Dialogs de confirmation), #61 (Drawer Produit desktop+mobile)
**Vagues exécutées :** V1 = #65 (DeleteConfirmDialog) | V2 = #61 (ProductDrawer, consomme le dialog) — exécuté séquentiel (V2 dépend de la sortie V1) plutôt que parallèle.
**Cohésion score :** 0.42
**Commits :** 5 — `4dcc2ae` (#65) · `34342b9` (#61) · `1f33d24` (review sprint : scrub logs axios) · `d0852d0` (review PR #157 : log logout + désync événement couplé) · `58eecf8` (mémoire pitfall) [+ artefacts]
**Migrations Flyway :** aucune
**Dépend de :** Sprint 10 (#50 PATCH produit, #52 GET /api/categories)
**BR impactées :** BR-CAT-002, BR-CAT-007, BR-PRO-001, BR-PRO-002, BR-PRO-009, BR-PRO-010
**Reviews :** batch sprint (0 CRIT / 2 MAJ / 4 MIN, tous RÉSOLU) + `/review-pr #157` (passage indépendant → 1 CRIT + 1 MAJ que le batch avait manqués, tous RÉSOLU en 1 cycle). CRIT = log axios brut logout (fuite) ; MAJ = désync `eventCreationSchema.name` min(3) vs événement couplé.
**Tests :** Frontend 60/60 green (Vitest) | Backend non modifié | E2E : harness absent projet (gap pré-existant, plan `/create-e2e` post-merge)
**Nouveaux pitfalls / patterns :** PIT-S11-001 (Radix jsdom stubs), PIT-S11-002 (TanStack v5 mutation isolation test), PIT-S11-003 (désync Zod schémas dérivés), PIT-S7-003 enrichi (récurrence log brut + helper `safeErrorMessage`) ; PAT-S11-001 (mock next-intl sur clés), PAT-S11-002 (schémas Zod create≠update)
**Alternative non retenue :** #61 + #62 (Drawer Catégorie) au lieu de #61 + #65.
**Follow-ups arbitrés (Phase 4 triage) :**
  - Persister une couleur propre au produit (champ backend + migration) [triage M | domaine products] → issue #158 (Sprint 12)
  - Scrub log axios brut `authService.ts:61` (refreshToken) [triage XS | domaine auth] → traité hors sprint (background task, session séparée)
**Status :** Clôture en cours (mémoire consolidée ; triage follow-ups fait ; merge Phase 5)

## Sprint 12 — 2026-07-01 → 2026-07-02 (Terminé — merge PR #174 dans dev, cohésion 0.60, Backend récurrence events — Wave 4 back)
**Objectif :** Service de récurrence (hebdo/mensuel/annuel + cap 4000) + nettoyage EventServiceImpl + persistance couleur produit (#158, follow-up S11 rattaché au milestone).
**Milestone GitHub :** #12 (fermé après merge)
**Issues livrées (3) :** #54 (service récurrence + V9), #95 (findEventById mono-hit + printStackTrace), #158 (champ `color` produit — follow-up S11)
**Issue retirée (bloquée) :** #67 (hint frontend `capped`) — dé-scopée : le formulaire événement n'a ni champ `recurrenceEndDate`, ni hook de mutation exposant la réponse, ni endpoint exposant `capped` ; dépend de l'issue 4.5 (form event complet, reportée car dépend de #47 non planifié). Label sprint-12 retiré, à reséquencer après un sprint frontend events.
**Vagues exécutées :** V1 = #54 + #158 parallèles (events vs products) | V2 = #95 seul (#67 skippée) | + 1 cycle correctif post-review
**Migrations Flyway :** V9__neutralize_invalid_recurrence_unit.sql (#54). **Pas de V10** : colonne `products.color` préexistante (V7/#44), #158 sans migration (cf. [[DEC-S12-002]]). Numérotation réassignée au démarrage (plan disait V10 pour #54 ; max réel sur dev = V8).
**Cohésion score :** 0.60
**Commits :** 6 — fa55669 (#54), e01e7de (#158), c50a341 (#95), d711ea8 (fix review BR-EVE-006 PATCH), 534c901 (commentaire V9), e0d617b (artefacts+audit)
**BR impactées :** BR-EVE-002/004/006, BR-PRO-001/002/009/010
**Reviews :** db-expert V9 [OK] ; reviewer batch = **1 CRITIQUE RÉSOLU** (BR-EVE-006 non appliquée au PATCH → garde service `RecurrenceUnitRequiredException`→400, +5 tests) / 2 MAJEUR auto-rétractés (faux positifs) / 1 MINEUR (commentaire V9) résolu.
**Tests :** Backend 187/187 green (Testcontainers) | Frontend 70/70 green (Vitest) + tsc propre | E2E : harness absent (gap pré-existant, non régressif — plan /create-e2e post-merge, testid `pick-color`).
**Nouveaux pitfalls / patterns / décisions :** PIT-S12-001 (RepoJpaImpl.save version=null au PATCH), PIT-S12-002 (existsById retiré casse stubs Mockito strict), PIT-S12-003 (git add -A worktree partagé) ; PAT-S12-001 (validation conditionnelle create @AssertTrue + PATCH garde service), PAT-S12-002 (flag clearXxx reset nullable PATCH) ; DEC-S12-001 (exceptions 422/400 dédiées), DEC-S12-002 (pas de migration si colonne préexiste).
**Incidents orchestration :** subagent #158 coupé par limite session avant rapport (commit propre, done.md reconstruit) ; test-runner a sous-compté (148/60 vs réel 187/70, re-vérifié par le lead).
**Dépend de :** Sprint 9 (#44 : enum RecurrenceUnit + recurrenceEndDate) — vérifié livré (#28/#30/#44 CLOSED).
**Reporté :** #55/#63/#64/#66/#67 (Timeline + form event frontend) — dépendent de #47 (extraction composants, NON planifié).
**Follow-ups arbitrés (Phase 4 triage) :**
  - `EventServiceImpl.deleteById` double-hit (existsById+deleteById, nuance 404) [triage XS | domaine events] → **issue #175** (backlog libre, sans milestone)
  - #67 (hint frontend `capped`) bloquée → gardée ouverte, **label sprint-12 retiré** (reséquencer après sprint frontend events)
  - Bilan : 1 issue créée (backlog), 0 discard, 0 absorbé. Le follow-up #54 (ProductArchivedFilter version=null) était déjà résolu par #158 (pas un follow-up vivant).
**Status :** Terminé

## Sprint 13 — 2026-07-02 (Terminé — merge PR #176 dans dev — cohésion 0.70, Backend Auth/Sessions & Compte — Wave 5 back)
**Objectif :** Sessions actives (jti + révocation) + suppression de compte (DELETE /me cascade RGPD).
**Milestone GitHub :** #13 (fermé après merge)
**Issues livrées (2) :** #73 (sessions actives + révocation JWT jti), #78 (suppression compte DELETE /api/me)
**Vagues exécutées :** V1 = #73 (fondation révocation, `d3a776f`) | V2 = #78 (consomme `revokeAllSessions`, `e5c8ffd`) — séquentiel (dépendance + conflit AuthController/UserController).
**Cohésion score :** 0.70 (mono-domaine epic:auth)
**Commits :** 7 — 2 impl (#73, #78) + fd91d9f (fix review sécu/logs) + adfe55f (fix review-pr durcissement) + 3 mémoire/PR.
**Migrations Flyway :** **V10** `create_sessions.sql` (index UNIQUE jti, FK users ON DELETE CASCADE, index user_id). ⚠ le plan disait V11 : recalé sur V10 (dernière réelle = V9). #78 = suppression applicative ordonnée (SQL natif), **aucune migration**.
**BR impactées :** BR-AUT-002/009/010/011 (révocation, refresh, logout, JwtFilter+/me), BR-AUT-001 (ownership suppression).
**Reviews :** db-expert (V10 APPROUVÉ) · security-expert 1 MAJEUR (/me ignorait révocation) RÉSOLU (fd91d9f) · reviewer batch 2 MAJEUR (logs JwtFilter stderr MEMO-007) + MINEURs RÉSOLUS · **/review-pr #176** : 0 CRITIQUE, 1 MAJEUR cohérence (SecurityConfig /api/sessions|me hasAuthority) + 2 MINEUR (extractJti null, isSessionActive expiry) RÉSOLUS (adfe55f). Tous verdicts finaux READY/SÉCURISÉ.
**Tests :** Backend 220/220 green (Testcontainers Postgres 16) — +33 sur baseline S12 (187). Frontend inchangé. E2E N/A (backend pur). CI verte (backend+frontend) sur adfe55f.
**Nouveaux pitfalls / décisions / bugs :** PIT-S13-001..004 (purge natif @SQLRestriction, stub port nouveau, jwt.secret Base64, SecurityContext leak) · DEC-S13-001/002 (cookie dupliqué, IPv6→null RGPD) · BUG-S13-001 (/me révocation, clôt l'oracle noté BUG-S4-001) · BR events sans user_id (pack br-events).
**Dépend de :** Sprint 9 (#44 avatar — cohérence User).
**Reporté :** #75 (avatar — infra MinIO/S3), #86/#87 (Réglages frontend).
**Absorbé en cours :** aucun (0 RECOMMAND_FOLLOWUP).
**Dette identifiée (hors scope, non ticketée) :** purge sessions expirées (croissance table), A8 AuthController→UserServiceImpl (port), JwtCookieFactory à factoriser. **Bug préexistant hors sprint :** inscription réelle cassée (UserMapper setId + @Version null → Detached entity, PIT-S10-003) → tâche spawn dédiée par fullstack-dev #73, impacte le register en prod.
**Status :** Terminé

> **✅ Gap S9–S13 adressé par le plan S14–S18 :** #47 (extraction Timeline) est planifié en S16, unbloqueur explicite de la Timeline frontend (#55 en S17, #66 en S18). Les autres vues Timeline (#63/#64) restent au backlog post-S18.
> **Plan généré le 2026-07-01** (`/ai-env:sprint plan 5`, cohésion moyenne 0.55). Backlog restant : dette review backend (#92-#94/#123-#134/#139-#148), Waves 6/7 (#58/#69/#72/#76/#77/#81/#82…), #62/#68/#75/#80/#83/#86/#87/#102.

## Sprint 14 — 2026-07-03 (Terminé — merge PR #179 dans dev — cohésion 0.42, Sécurité backend + hygiène events)
**Objectif :** Upgrade Spring Boot 3.4.4 LTS (CVE P0) + cluster hygiène events (NPE, validations Bean, contraintes CHECK DB) + CVE frontend.
**Milestone GitHub :** #14 (fermé après merge)
**Issues livrées (5) :** #161 (CVE frontend P0), #162 (Boot 3.4.4 P0), #164 (NPE — no-op, déjà résolu #54), #168 (validations Bean BR-EVE-012/014), #128 (CHECK DB V11)
**Vagues exécutées :** V1 = #161 (frontend) ∥ #164 (backend Utils) parallèles | V1b = #162 (Boot upgrade, SOLO — détaché de V1 pour éviter corruption build concurrent) | V2 = #168 | V3 = #128
**Cohésion score :** 0.42
**Commits :** 5 — d6745f5 (#161) · 3a4f6ae (#162) · 0802d71 (#168) · 8494edc (#128) · aa6c6b6 (artefacts). #164 = 0 commit (déjà livré #54).
**Migrations Flyway :** V11 (contraintes CHECK conditionnelles events, #128) — dernière réelle = V10__create_sessions, V11 = prochain libre (l'architect avait raison).
**BR impactées :** BR-EVE-004 (déjà couverte), BR-EVE-006 (déjà), BR-EVE-012 (422, [[DEC-S14-001]]), BR-EVE-014 (color au create), BR-AUT-011 (jti non régressé), DEC-S3-001 (confirmée).
**Reviews :** reviewer batch OUI (0 CRITIQUE / 0 MAJEUR / 3 MINEUR non bloquants) · security-expert JWT OUI · db-expert V11+Flyway OUI (réserves pré-prod, pas merge).
**Tests :** Backend 237/237 green | Frontend 70/70 green | E2E : `frontend/e2e/` vide (préexistant).
**Nouveaux pitfalls / decisions / patterns :** PIT-S14-001 (jjwt HS256 figé), PIT-S14-002 (architect Phase 0.5 lire fichier réel), DEC-S14-001 (BR-EVE-012 422), DEC-S14-002 (Boot 3.4.4/flyway-pg), PAT-S14-001 (CHECK conditionnel IS NOT TRUE + neutralisation).
**Absorbé en cours (XS) :** aucun. #164 = no-op (fix préexistant #54).
**Follow-ups arbitrés (Phase 4 triage) :**
  - Contrat HTTP 400-vs-422 erreurs métier events → **décision : garder 422** (dev, coh. DEC-S12-001/DEC-S14-001). Question fermée, aucun changement de code.
  - 5 CVE CRITICAL postérieures à Boot 3.4.4 → **issue #180** (P1, M, devops/sécurité, backlog)
  - Validation pré-prod Flyway 10/V11 sur base réelle (checksum + comptage lignes) → **issue #181** (P2, S, devops, backlog)
  - npm audit devDeps (chaîne Storybook/Vitest) → **issue #182** (P3, S, devops, backlog)
  - next-env.d.ts non commitable (ESLint triple-slash) → **issue #183** (P3, XS, devops, backlog)
  - #150 (S15) : color au create + refine recurrenceEndDate côté frontend Zod → déjà tracké (issue existante S15), non recréé
**Bilan triage :** 4 issues créées (backlog libre : #180-#183) · 0 discard · 0 absorbée · 1 décision produit fermée (422)
**Status :** Terminé (merge en cours de clôture)

## Sprint 15 — 2026-07-03 (Terminé — PR #184 sprint/15 → dev, merge après CI e2e verte)
**Objectif :** DTO EventResponse + port EventService pur (backend) → sync Zod frontend → E2E golden path Playwright + job CI.
**Milestone GitHub :** #15 (fermé après merge)
**Issues livrées (3) :** #165 (DTO EventResponse + port pur + adapter découplé), #150 (sync Zod events v3), #163 (E2E golden-path + job CI)
**Vagues exécutées :** V1 = #165 → V2 = #150 → V3 = #163 — séquentiel strict (contrat propagé backend→frontend→E2E)
**Cohésion score :** 0.38 (events + transversal E2E)
**Commits :** 7 — b9878ca (#165), 874c757 (#150), 952533a + 07ab0d3 + b7d0d02 (#163), b160b51 (fixes review), 5e40806 + 0ef43a7 (artefacts)
**Migrations Flyway :** aucune
**Dépend de :** Sprint 14 (#162 CI stable, #168 `color` au DTO création)
**BR impactées :** BR-EVE-006/008/009/010/012/013/014 + refactor hexagonal events
**Reviews :** batch Phase 7 (1 MAJEUR corrigé titre min, minors i18n/CI) + /review-pr TEAM (0 CRITIQUE, 1 MAJEUR = faux positif réfuté contre le code, minors → follow-ups)
**Tests :** Backend 238/238 | Frontend 85/85 (16 fichiers) | E2E golden-path 5/5 local (job CI e2e = gate canonique)
**Nouveaux signaux :** PAT-S15-001/002, DEC-S15-001, PIT-S15-001/002/003/004, BUG-S15-001/002
**Incidents :** #163 subagent crashé 2× (API Overloaded) — récupéré (transcript resume + finalisation lead). 2 vrais bugs produit découverts par l'E2E (userId body, event couplé strippé).
**Recovery notable :** finalisation lead concurrente au subagent repris → reconciliation git (push b7d0d02 tardif).
**Follow-ups arbitrés (Phase 4 triage) :**
  - ProductService port importe encore application.dtos [S | products] → issue #185 (Sprint 16)
  - NPE ProductServiceImpl.createProduct si getEvents()==null [S | products] → issue #186 (Sprint 16)
  - Pas d'UI création catégorie (blocage produit user neuf) [M | categories] → issue #187 (Sprint 16, recoupe #62 — à vérifier au planning)
  - EventEditForm sans widget recurrenceEndDate/archived [S | events] → issue #188 (Sprint 16)
  - Quirk UX register /auth/me 401 [S | auth] → discard (mineur)
  - EventContent color vide + next.config URL non validée [XS | events] → discard (pré-existant/acceptable)
  - clés i18n mortes → déjà résolu (commit review b160b51) ; surveillance e2e → fait (CI verte)
**Bilan triage :** 4 issues créées (milestone S16), 2 discardées, 2 déjà résolues. Ratio discard 33% (2/6 actionnables).
**Status :** Terminé (merge en attente confirmation dev)

## Sprint 16 — (PLANIFIÉ — cohésion 0.55, Fondations design + extraction Timeline #47)
**Objectif :** ArchUnit hexagonal (backend) + Storybook core DS + **extraction composants Timeline (#47, unbloqueur events frontend)**.
**Milestone GitHub :** #16
**Issues :** #166 (ArchUnit), #46 (Storybook core DS), #47 (extraction Timeline)
**Vagues :** V1 = #166 (backend) ‖ #46 (Storybook) | V2 = #47 (après config Storybook de #46)
**Migrations Flyway :** aucune
**Dépend de :** Sprint 15 (#150 contrat consommé par composants extraits)
**Status :** En cours (démarré 2026-07-03)

## Sprint 17 — (PLANIFIÉ — cohésion 0.72, Timeline events desktop)
**Objectif :** Vue Timeline desktop (zoom/minimap/drawer/clavier), réécriture sur les sous-composants #47.
**Milestone GitHub :** #17
**Issues :** #55 (Timeline desktop) — **#63 (mobile portrait) dé-scopé → backlog** (tenir ~8 pts)
**Vagues :** V1 = #55 seul
**Migrations Flyway :** aucune
**Dépend de :** Sprint 16 (#47 obligatoire) + Sprint 15 (#150 contrat)
**Status :** Planifié

## Sprint 18 — (PLANIFIÉ — cohésion 1.0 après dé-scope, Formulaire événement)
**Objectif :** Formulaire événement complet (desktop + mobile portrait + paysage), schéma Zod unifié.
**Milestone GitHub :** #18
**Issues :** #66 (formulaire événement) — **#62 (Drawer Catégorie) dé-scopé → backlog** (cohésion 0.34 → 1.0, futur sprint categories/products avec #68)
**Vagues :** V1 = #66 seul
**Migrations Flyway :** aucune
**Dépend de :** Sprint 17 (Timeline pour preview/intégration) + Sprint 15 (#150 contrat)
**Status :** Planifié

> **Plan S14–S18 généré le 2026-07-03** (`/ai-env:sprint plan 5`, dé-scope #63/#62 appliqué). Cohésion moyenne ~0.53 après dé-scope. Chaîne strictement séquentielle sur le contrat events + #47 (S16). Risque max : #162 (upgrade Boot majeur, jjwt breaking vs BR-AUT-011). Dépendances frontend à vérifier avant S17/S18 : #48 (TanStack), #45 (tokens).
