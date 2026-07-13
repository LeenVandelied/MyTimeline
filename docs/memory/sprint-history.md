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

## Sprint 16 — 2026-07-03 (Terminé — merge PR #189 dans dev — cohésion 0.55, Fondations design + extraction Timeline)
**Objectif :** ArchUnit hexagonal (backend) + Storybook core DS + extraction composants Timeline (#47, unbloqueur events frontend S17).
**Milestone GitHub :** #16 (fermé après merge)
**Issues livrées (3) :** #166 (ArchUnit), #46 (Storybook core DS), #47 (extraction Timeline)
**Vagues exécutées :** V1 = #166 (backend) ‖ #46 (Storybook) | V1.5 = migration infra Storybook 8→10 (absorbée) | V2 = #47
**Cohésion score :** 0.55
**Commits :** a5ccb6d (#166) · b6a9b9e (#46 stories) · 06dfc4c (migration SB 8.6→10) · 80113e3 (#47) · d38aef0 (fix Règle 1 ArchUnit, review) · e2e5499 (fix review PR#189 : tooltip useId + a11y) + artefacts mémoire
**Migrations Flyway :** aucune
**Dépend de :** Sprint 15 (#150 contrat consommé par composants extraits)
**Travail infra absorbé :** migration Storybook 8.6→10.4.6 (build-storybook cassé pré-existant par bump Next 15.5 du CVE #161 ; migré framework `@storybook/nextjs-vite` sans downgrader Next) — décision dev, cf. [[DEC-S16-001]].
**BR impactées :** BR-EVE-001 (indirect — extraction présentationnelle, aucun changement de flux).
**Reviews :** batch sprint + /review-pr #189 (TEAM back+front) — 1 CRITIQUE (Règle 1 ArchUnit, d38aef0) + 1 MAJEUR (tooltip SSR useId, e2e5499) + 4 MINEURS → tous RÉSOLUS (1 MINEUR pom indentation accepté = style pré-existant).
**Tests :** Backend 242/242 green | Frontend vitest 85/85 green | Storybook build green (22 stories) | E2E golden-path ⚠ non concluant (échec infra harness backend, PAS régression — à re-vérifier post-merge).
**Nouveaux pitfalls / decisions / patterns :** PIT-S16-001..004, PAT-S16-001/002, DEC-S16-001/002, BUG-S16-001.
**Status :** Terminé (merge PR #189)

## Sprint 17 — 2026-07-03 → 2026-07-05 (Terminé — merge PR #194 dans dev — cohésion 0.72, Timeline events desktop)
**Objectif :** Vue Timeline desktop (frise continue, zoom Cmd+molette 5 niveaux, minimap waveform, drawer détail, raccourcis clavier), réécriture sur les sous-composants #47.
**Milestone GitHub :** #17 (fermé après merge)
**Issues livrées (1) :** #55 (Timeline desktop) — **#63 (mobile portrait) dé-scopé → backlog** (tenir ~8 pts)
**Vagues exécutées :** V1 = #55 seul
**Cohésion score :** 0.72
**Commits :** 6 (impl `c46c936` · correctifs review `388511c` · audit `8436d0c` · body PR `90f618c` · correctifs review PR194 `523d447` · fix régression e2e `e99279c`)
**BR impactées :** BR-EVE-001 (frise = events user only, enforcement backend inchangé, zoom sans refetch)
**Migrations Flyway :** aucune
**Décision structurelle :** migration 100 % classes DS `.mt-*` (Designer S17), ancien `TimelineCalendar.tsx` #47 préservé. Pas de dep npm ajoutée (useReducer local, pas de Zustand ni react-virtual — cf. [[DEC-S17-001]]).
**Reviews :** 1re passe (durant start) 0 CRIT/1 MAJEUR/4 MINEUR tous résolus · 2e passe (review-pr #194) 0 CRIT/0 MAJEUR/4 MINEUR (3 résolus, 1 note-only écarté). MAJEUR = drag handle minimap cassé (stopPropagation).
**Régression rattrapée par CI :** golden-path E2E rouge post-review (nom produit `resource.title`/`timeline-resource-title` droppé à la réécriture, non couvert par l'unit qui ne comptait que les lanes → [[PIT-S17-003]]). Fix `e99279c` : label produit restauré + spec racine `timeline-view` + assertion unitaire ajoutée.
**Tests :** Frontend 117/117 green (Vitest) · tsc 0 err · next build 22/22 · **CI finale : e2e ✅ backend ✅ frontend ✅**
**Nouveaux pitfalls / décisions :** [[PIT-S17-001]] (globals.css @import DS), [[PIT-S17-002]] (concat classes template), [[PIT-S17-003]] (rewrite droppe testid couvert e2e) · [[DEC-S17-001]] (pas de virtualisation avant >500 events)
**Dépend de :** Sprint 16 (#47) + Sprint 15 (#150 contrat)
**Follow-ups arbitrés (Phase 4 triage) :**
  - Accordéon collapse par produit (AC #55 partiel) [M | events] → issue #195 (backlog)
  - Virtualisation Timeline >500 events (Wave 7) [L | events] → issue #196 (backlog, P3 anticipation)
  - Re-valider patterns clavier a11y via ui-design (ux-patterns.md absent) [S | events] → issue #197 (backlog)
**Status :** Terminé

## Sprint 18 — 2026-07-05 (Terminé — merge PR #199 dans dev — cohésion 1.0 après dé-scope, Formulaire événement)
**Objectif :** Formulaire événement complet (desktop + mobile portrait + paysage), schéma Zod unifié.
**Milestone GitHub :** #18 (fermé après merge)
**Issues livrées (1) :** #66 (formulaire événement) — **#62 (Drawer Catégorie) dé-scopé → backlog** (cohésion 0.34 → 1.0, futur sprint categories/products avec #68)
**Vagues exécutées :** V1 = #66 seul (fullstack-dev L/opus) — pré-check ui-design (3 viewports + contraste) en amont.
**Cohésion score :** 1.0 (single-issue epic:events)
**Commits :** 3 — e128e51 (#66 formulaire) · 860d6cf (corrections review : contraste WCAG + migration 1-couleur EventContent + invalidation cache) · 1845a8c (artefacts audit/briefings)
**Migrations Flyway :** aucune (sprint frontend-only)
**Dépend de :** Sprint 17 (Timeline) + Sprint 15 (#150 contrat) + #45 (tokens) + #48 (TanStack) — tous sur dev.
**BR impactées :** BR-EVE-002 (endErr), BR-EVE-003 (titleErr 1–100), BR-EVE-004 (durationUnit parité edit), BR-EVE-006 (seriesErr), BR-EVE-009 (modèle 1-couleur + contraste WCAG — front enfin migré).
**Reviews :** reviewer (3 MAJEUR / 2 MINEUR) + ui-design (BLOQUANT contraste WCAG faux) — TOUS RÉSOLUS (commit 860d6cf). Le finding clé (formule `luminance>0.5` → 10/12 couleurs FAIL AA) n'a été attrapé que par ui-design, pas par la review statique.
**Tests :** Backend 242/242 verts | Frontend vitest 153/153 verts | E2E golden-path vert **en CI full-stack** (échec runner isolé = environnemental, backend/DB non démarrés). `next build` OK.
**Nouveaux patterns / pitfalls / décisions :** PAT-S18-001 (helper contraste WCAG `lib/color.ts`), PAT-S18-002 (stub ResizeObserver jsdom/Radix), PIT-S18-001 (migration 1-couleur à appliquer à la vue lecture aussi), DEC-S18-001 (ne pas inventer EventBlock/@track absents).
**Couverture E2E nouveau formulaire :** ~20 testids `event-form-*` sans spec dédiée → `/create-e2e 199` post-merge (le flux create reste couvert par golden-path via ProductDrawer).
**Saturation contexte lead (mesure) :** modérée — fan-out 1 vague + ui-design + review batch (3 agents) + 1 fix, purge via done.md (retours bruts non conservés).
**Follow-ups arbitrés (Phase 4 triage — 3 créés backlog, 2 discardés) :**
  - Câbler état conflict 409 quand backend l'émettra [S | events] → issue #200
  - Aligner contrat startDate/endDate form vs DTO create/PATCH [S | events] → issue #201
  - Désync sérialisation allDay/isAllDay (BR-EVE-010) [XS | events] → issue #202
  - EventBlock #47 canonique [S | events] → discard (décomposition #47 déjà livrée S16, preview local suffit)
  - Contraste dark-mode non testé [XS | events] → discard (couleurs event indépendantes du thème, risque faible)
  Ratio discard 2/5 = 40%.
**Status :** Terminé

> **Plan S14–S18 généré le 2026-07-03** (`/ai-env:sprint plan 5`, dé-scope #63/#62 appliqué). Cohésion moyenne ~0.53 après dé-scope. Chaîne strictement séquentielle sur le contrat events + #47 (S16). Risque max : #162 (upgrade Boot majeur, jjwt breaking vs BR-AUT-011). Dépendances frontend à vérifier avant S17/S18 : #48 (TanStack), #45 (tokens).

## Sprint 19 — 2026-07-05 (Terminé — merge PR #203 dans dev — cohésion 0.71, Timeline mobile + finitions desktop)
**Objectif :** Vues Timeline mobile (portrait #63, paysage #64) + extraction EventPill desktop #192.
**Milestone GitHub :** #19 (fermé après merge)
**Issues livrées (3) :** #63, #64, #192
**Vagues exécutées :** V1 = #192 ∥ #63 (parallèles, fichiers disjoints) | V2 = #64 (dérive base mobile #63). Gate ui-design pré-implém (APPROUVE avec réserves).
**Cohésion score :** 0.71
**Commits :** 5fd7fcd (#192 EventPill) · 962e6b7 (#63 portrait) · a0a94f1 (fix réintégration EventPill post-clobber) · ac935f8 (#64 paysage) · 03dde79 (fix review cast) · dc1ccbb (fix build CI eslint) + commits mémoire.
**Migrations Flyway :** aucune
**Dépend de :** aucune (#47 extraction Timeline livrée S16 = débloqueur)
**BR impactées :** BR-EVE-001 (présentation, ownership backend inchangé), BR-EVE-009 (encre contraste EventPill + rendus mobiles).
**Reviews :** Phase 7 (0 CRIT / 0 MAJ / 3 MIN, 1 corrigé) + /review-pr #203 (0 CRIT / 1 MAJ / 3 MIN, aucun bloquant). MAJEUR = action sheet edit/delete inertes → follow-up #204 (dev acté). MINEURs = non-bugs vérifiés.
**Tests :** Frontend 153/153 verts (timeline 64/64), tsc + eslint OK. Backend non modifié. Build `next build` vert après fix dc1ccbb. E2E : golden-path #163 préservé ; testids mobiles non couverts → follow-up #205.
**Incident :** #63 a clobbé l'intégration EventPill de #192 (pitfall worktree-cwd : écriture repo principal + recopie) → détecté vérif post-vague, corrigé a0a94f1. Cf. PIT-S19-001.
**Nouveaux pitfalls / décisions / patterns :** PIT-S19-001 (worktree write derailment), PIT-S19-002 (vitest vert ≠ next build) ; DEC-S19-001 (EventPill dédié), DEC-S19-002 (breakpoints mobile), DEC-S19-003 (état hissé) ; PAT-S19-001 (test rotation matchMedia), PAT-S19-002 (encre event propagée).
**Follow-ups arbitrés (Phase 4 triage — 4/4 créés, 0 discard) :**
  - Câbler edit/delete action sheet [S | events] → issue #204 (Sprint 20)
  - Storybook paysage + E2E rotation mobile [S | events] → issue #205 (Sprint 20)
  - EventBar/Lane orphelins — statuer retrait [S | events] → issue #206 (Sprint 20)
  - test-quiet.sh alias e2e lance vitest [tooling] → issue #207 (backlog, epic:devops)
**Status :** Terminé (post-merge)

## Sprint 20 — 2026-07-05 (Terminé — merge PR #208 dans dev — cohésion 0.80, Dashboard responsive)
**Objectif :** Dashboard desktop (#80) + déclinaisons mobile portrait (#83) et paysage (#85, rail 64px + 2 colonnes) sur DS Graphite.
**Milestone GitHub :** #20 (fermé après merge)
**Issues livrées (3) :** #80, #83, #85
**Vagues exécutées :** V1 = #80 (fondation) | V2 = #83 | V3 = #85 — strictement séquentiels (même dossier `components/dashboard/` neuf)
**Cohésion score :** 0.80
**Commits :** baafb27 (#80 desktop, extraction monolithe 283→121 l. + 5 composants + useDashboardData + helpers lib.ts) · 943b0ce (#83 mobile portrait, MobileDrawer/CompactAgenda/ProductCarousel + useMediaQuery) · abdce23 (#85 mobile paysage, CompactRail 64px + grille 2 col, switch ternaire) · 792ce7c (fix review PR #208 : extraction nextEvent + ref scroll + useFocusTrap onEscape + ring-ring + nettoyage labelKey)
**Migrations Flyway :** aucune (sprint 100% frontend, 0 diff backend)
**Dépend de :** Sprint 19 (réutilise Timeline mobile #63/#64 + EventPill/DateStamp)
**BR impactées :** aucune (agrégation lecture seule events/products existants).
**Design :** ui-design pre-pass sur #80 → REJET initial, 6 corrections intégrées (densité = hauteur/count et non gradient, helper bucket partagé, chiffres mono inline, filets vs Card, sentence-case sans spring, contrats props responsive). Charte de vérité = `docs/design/graphite-handoff.md`.
**Reviews :** batch (Phase 7) + /review-pr #208 (indépendant) — 0 CRITIQUE / 1 MAJEUR / 4 MINEUR, TOUS RÉSOLUS (commit 792ce7c). MAJEUR = `nextEvent` dupliqué verbatim → extrait.
**Tests :** Frontend Vitest 218/218 verts (0 fail), tsc clean, `next build` OK, ESLint clean. Backend inchangé. CI verte (backend+frontend+e2e). Non-régression golden-path desktop préservée (`data-testid="dashboard"` + `TimelineResponsive`).
**Nouveaux pitfalls/patterns :** PIT-S20-001 (i18n string→objet collision), PIT-S20-002 (`scrollbar-none` utility vs webkit global), PIT-S20-003 (rtk git diff 3-dots vide), PAT-S20-001 (buildDensityBuckets vs Minimap), PAT-S20-002 (switch responsive useMediaQuery source unique), PAT-S20-003 (useFocusTrap onEscape).
**Dette E2E (non bloquant) :** 28 nouveaux data-testid dashboard sans spec E2E (`frontend/e2e/` = golden-path desktop seulement) → issue #209.
**Follow-ups arbitrés (Phase 4 triage) :**
  - E2E Playwright dashboard mobile portrait+paysage [S | frontend] → issue #209 (backlog)
  - Shell applicatif nav latérale 248px, handoff §8 [M | frontend] → issue #210 (backlog)
  - Validation visuelle Chrome 1280/1440 live [XS | frontend] → discard (QA manuelle, non trackable)
  - 4 MINEUR review (nextEvent dup, querySelector, Escape listener, ring naming, labelKey) → absorbés commit 792ce7c (cycle /review-pr)
**Status :** Terminé

## Sprint 21 — 2026-07-05 (cohésion 0.75, Réglages utilisateur avatar + écrans — PR #211 vers dev)
**Objectif :** Backend upload avatar (#75, POST/GET/DELETE /me/avatar) + écrans Réglages desktop 4 chapitres (#86) et mobile drill-down (#87).
**Milestone GitHub :** #21
**Issues livrées (3) :** #75, #86, #87
**Vagues exécutées :** V1 = #75 (backend) ∥ #86 (frontend desktop) | V2 = #87 (réutilise #86 + #75) | Correction post-review = avatar branché bout-en-bout
**Cohésion score :** 0.75
**Commits :** 5 (ea89f59 #75, 43d9e14 #86, 5b5bba6 #87, d10e4a3 correction avatar, 1da0827 artefacts)
**Migrations Flyway :** **AUCUNE** finalement — la colonne `avatar` existait déjà (V7 #44), pas de V12 nécessaire. Dernière migration reste V11.
**Décision clé (DEC-S21-001) :** stockage avatar **local privé + StoragePort** (PAS MinIO/S3 — infra objet absente) servi via endpoint authentifié. Déviation ADR assumée, validée security-expert (GO).
**BR impactées :** BR-AUT-001 (ownership profil/avatar + suppression compte).
**Reviews :** security-expert GO (upload cité comme modèle) ; reviewer batch — 0 CRITIQUE / 3 MAJEUR / 3 MINEUR (3 MAJEUR = avatar non branché → RÉSOLUS d10e4a3 ; MINEUR non bloquants).
**Tests :** Backend 268/268 green | Frontend 271/271 green | E2E specs amorcées (non exécutées wrapper) → /create-e2e post-merge.
**Nouveaux pitfalls / décisions / patterns :** DEC-S21-001 (ADR stockage) ; PIT-S21-001 (garde-fou worktree efficace), PIT-S21-002 (swipe pointer jsdom), PIT-S21-003 (AuthContext refreshUser) ; PAT-S21-001 (Zod i18n racine), PAT-S21-002 (bottom sheet hook extraction), PAT-S21-003 (modèle upload OWASP).
**Absorbé en cours :** branchement avatar frontend bout-en-bout (correction d10e4a3 post-review, findings MAJEUR).
**Piège orchestration :** worktree-cwd a frappé #75 et #86 (auto-corrigés, résidus nettoyés sur dev via clean -fd scopé) ; garde-fou renforcé efficace pour #87 + correction (cf. PIT-S21-001).
**Follow-ups proposés (NON-XS) :** export RGPD `GET /me/export` [S | auth] · migration stockage objet MinIO/S3 [M | auth] · resize/anti-EXIF image [S | auth] · cache/ETag GET avatar [XS | auth] · doc `STORAGE_AVATAR_PATH` runbook [XS | infra] · clavier virtuel Android visualViewport [S | frontend].
**Follow-ups arbitrés (Phase 4 triage — « créer les prioritaires ») :**
  - Migration stockage objet MinIO/S3 [M | auth] → issue **#212** (backlog libre)
  - Doc `STORAGE_AVATAR_PATH` runbook [XS | infra] → issue **#213** (backlog libre)
  - Export RGPD [S | auth] → doublon des issues existantes **#58** (backend) / **#59** (frontend) → contexte S21 lié en commentaire, pas de nouvelle issue
  - resize/anti-EXIF image [S], cache/ETag GET avatar [XS], clavier virtuel Android [S] → consignés ici seulement (non créés, choix dev)
**Status :** Clôture en cours (PR #211 prête, CI verte, triage follow-ups fait, merge en attente confirmation)

## Sprint 22 — 2026-07-05 → 2026-07-06 (Terminé — merge PR #217 dans dev — cohésion 0.67, Page Produits + Catégories frontend)
**Objectif :** Page Produits (#68, liste+détail+catégories) + Drawer Catégorie (#62, desktop+mobile) + fix NPE backend (#186).
**Milestone GitHub :** #22 (fermé après merge)
**Issues livrées (3) :** #68, #62, #186
**Vagues exécutées :** Pré-vague = component-guardian (carte réutilisation) | V1 = #62 (drawer) ∥ #186 (backend pur) | V2 = #68 (page produits embarque le drawer #62)
**Cohésion score :** 0.67
**Commits :** 8 — `fb12091` (#186 null-guard) · `3e15440` (#62 CategoryDrawer) · `fb329dd`/`0f50719`/`0058e85`/`e6bd60f`/`66173b9` (#68 liste/détail/catégories/fix-build/done) · `116f419` (fix review PR#217 réassignation) + artefacts mémoire.
**Migrations Flyway :** aucune (backend produits/catégories déjà livré #50/#52).
**Dépend de :** Sprint 10 (#50/#52 backend) — sur dev.
**BR impactées :** BR-PRO-005 (produit sans event), BR-PRO-001/006, BR-CAT-001/002/004/007, ADR-002 (catégorie système lecture seule).
**Reviews :** batch `/sprint start` (0 CRITIQUE/0 MAJEUR) PUIS `/review-pr` TEAM back+front — 1 MAJEUR réel RÉSOLU (`116f419`, suppression catégorie liée depuis drawer sans réassignation, BR-CAT-002) + 1 MAJEUR écarté (faux positif reset couleur, vérif backend) + MINEURs (console.error gaté, TODO virtualisation). Le batch sprint avait manqué le MAJEUR → valeur du 2e passage adverse.
**Tests :** Backend 270/270 verts | Frontend 306/306 verts | `next build` OK | E2E : parcours produits/catégories NON couverts (→ `/create-e2e 217` post-merge).
**Nouveaux pitfalls / patterns / bugs :** PIT-S22-001 (`next build` lint invisible tsc/vitest) · PIT-S22-002 (mock enfant → data-attr pour tester threading prop) · PIT-S22-003 (récurrence cwd worktree, bloc en tête indispensable) · PAT-S22-001 (color catégorie String libre) · PAT-S22-002 (sous-frise filtrée amont) · PAT-S22-003 (PATCH clear-via-clé-omise) · BUG-S22-001 (nameConflict useState non lu) · BUG-S22-002 (réassignation drawer). br-categories pack mis à jour.
**Saturation contexte lead (mesure) :** ~55-60 % du budget contexte (opus) — briefings inline #186/#62 + reviews + fix ; briefings #68 passés en prompt dense (pack non re-Read).
**Absorbé en cours (XS) :** correction lint build #62 absorbée par #68 (`e6bd60f`) ; MINEURs review absorbés (`116f419`).
**Follow-ups proposés (NON-XS) :** aucun `RECOMMAND_FOLLOWUP` actionnable (tous négations explicites). Suivi hors-signal : `/create-e2e 217` (E2E post-merge) ; virtualisation liste si >50 produits (TODO en code) ; #187 UI création catégorie recoupe #62 → à fermer/fusionner.
**Status :** Terminé (merge en cours via `/sprint end`)

## Sprint 23 — 2026-07-06 (Terminé — merge PR #220 dans dev, cohésion 0.55, Sécurité/DevOps durcissement + DIP)
**Objectif :** Bump CVE post-Boot 3.4.4 (#180) + refactor contrôleurs vers interfaces service DIP (#123) + durcissement CI pin SHA (#167).
**Milestone GitHub :** #23 (fermé après merge)
**Issues livrées (3) :** #180, #123, #167
**Vagues exécutées :** V1 = #180 ∥ #167 (pom.xml / YAML CI — disjoints build ET source) | V2 = #123 (contrôleurs Java). ⚠ Resequencé vs plan initial (V1=3∥) : #180 et #123 buildent tous deux le backend Maven/Testcontainers dans le worktree partagé → risque de collision `target/` ; #167 (YAML, pas de build) parallélisé avec #180, #123 séquencé après.
**Cohésion score :** 0.55 (WARNING borderline assumé — consolidation dette)
**Commits :** 6 — `5bcdf3a` #167 pin SHA / `094e5ae` #180 bump CVE / `46f2adf` #123 DIP / `4f3c2c6` #167 npm --omit=dev / `da5dc11` :memo: artefacts / (+ merge)
**BR impactées :** aucune (dette technique, non-régression sécurité validée)
**Migrations Flyway :** aucune
**Reviews :** Phase 7 sprint (0C/1M résolu/2m) + `/review-pr` TEAM (reviewer + security-expert) sur PR#220 = 0 CRITIQUE / 1 MAJEUR (freeze→strict, follow-up) / 4 MINEURS (tous follow-up ou décision assumée) — aucun défaut de code.
**Tests :** Backend **270/270 green** (Testcontainers, validé test-runner indépendant) | Frontend inchangé (0 code front) | E2E N/A (0 testid). trivy 5 → 0 CVE CRITICAL. CI PR#220 = success.
**Nouveaux pitfalls/decisions/patterns :** PIT-S23-001 (CVE non backportée 6.4.x), PIT-S23-002 (@MockBean sur Impl masque DIP), PAT-S23-001 (DIP contrôleur→port), PAT-S23-002 (FreezingArchRule baseline 0→strict), DEC-S23-001 (ligne Boot 3.4.x + overrides), DEC-S23-002 (gate CI npm --omit=dev + pin all SHA).
**Décision dev en cours de sprint :** gate `npm audit --omit=dev` (bloquer prod only) — arbitré via AskUserQuestion.
**Absorbé en cours (XS) :** commit `4f3c2c6` (npm --omit=dev) intégré pendant le sprint pour débloquer la CI (surface du diff #167 élargie vs scope initial).
**Follow-ups arbitrés (Phase 4 triage — dev a validé les 4 en issues backlog, sans milestone) :**
  - ArchUnit DIP `FreezingArchRule.freeze` → stricte (baseline 0) [S | transversal] (#123 + MAJEUR review PR#220) → **issue #221**
  - Bump dev-deps frontend (vitest/vite chain) pour lever HIGH/CRITICAL npm dev [M | frontend/devops] (#167) → **issue #222**
  - Trier les 4 CVE HIGH backend résiduelles (hors gate CRITICAL) [S | devops] (#180) → **issue #223**
  - Garde CI anti-drift du BOM Boot (overrides SS/tomcat/SF) [S | devops] (review PR#220 MINEUR) → **issue #224**
  - (Résolus en cours, non issue-ifiés : gate npm `--omit=dev` appliqué `4f3c2c6` ; vérif CI post-merge = CI PR#220 déjà success.)
**Bilan triage :** 4 créées (backlog) / 0 discard / 0 absorbé tardif / ratio discard 0%.
**Status :** Terminé

> **Plan S19–S23 généré le 2026-07-05** (`/ai-env:sprint plan 5`, cohésion moyenne **0.70**). Aucun sprint < 0.3 ; seul S23 borderline (0.55, WARNING). Ordre : Timeline mobile → Dashboard (embarque frise) → Réglages (V12) → Produits/Catégories → Dette. **Reportés au backlog (à surveiller) :** dette a11y #81 (BLOQUANT)/#82/#197 → prévoir sprint a11y S24 ; #195 (collapse par produit) à re-spécifier (collapse par catégorie DÉJÀ livré dans TimelineView) ; virtualisation #69/#196 (Wave 7, après volumétrie réelle) ; follow-ups events #200-202/#188 ; monétisation #88 (nécessite ADR produit). Architect a vérifié le code réel (8 lectures : #186 NPE confirmé, #192 Minimap livré, #195 collapse catégorie présent).

## Sprint 24 — 2026-07-06 → 2026-07-06 (Terminé — merge PR #225 dans dev — cohésion 0.78, a11y Timeline frise clavier + lecteur d'écran)
**Objectif :** Rendre la frise Timeline navigable au clavier + accessible lecteur d'écran (dette a11y prévue depuis le plan S19-S23).
**Milestone GitHub :** #24 (fermé après merge)
**Issues livrées (3) :** #81 (BLOQUANT, L), #82 (S, résiduel M→S), #197 (S)
**Vagues exécutées :** V1 = #81 (pose le pattern roving/live-region) | V2 = #197 + #82 (parallèles, fichiers disjoints)
**Cohésion score :** 0.78
**Commits :** 518aa86 (#81 roving/aria-live) · 19714f6 (#81 review focus ring) · b113fef + f5f58ef (#197 ux-patterns.md) · 99e85d7 (#82 cible tactile 44px) · 6281770 (artefacts mémoire) — hors 1a4ec51 (commit plan S24-S28)
**Migrations Flyway :** aucune
**Dépend de :** aucune (démarrage propre sur dev S23)
**BR impactées :** BR-EVT-001 (contrat lecture events inchangé, zoom/nav pur client, aucun refetch — respecté #81). #82/#197 sans BR formelle.
**Reviews :** reviewer batch #81 — 2 MAJEUR (focusNav sans scroll ; activeNav index-keyé glissait au collapse) + 1 MINEUR (double import), tous RÉSOLU. ui-design re-validation #197 = GO PR.
**Tests :** Frontend 325/325 vert (44 fichiers) — inclut test non-régression MAJEUR-2 (roving resource-keyed) + lib-a11y.test.ts. Backend/E2E inchangés (sprint 100% frontend doc/a11y). CI PR #225 : backend + frontend + e2e + security tous SUCCESS.
**Nouveaux pitfalls / décisions / patterns :** PAT-S24-001 (roving keyé par ID stable), PAT-S24-002 (hitbox ≥44px via ::before), PIT-S24-001 (scrollIntoView après focus), PIT-S24-002 (subagent worktree chemin relatif → repo principal), DEC-S24-001 (ux-patterns.md force-add, seul rules-jit tracké).
**Note code-state :** #82 quasi-livré (focus-trap 7 modaux + cibles ≥44px déjà là S16-S20) → downsizé, reste close EventDrawer 28→44px.
**Follow-ups arbitrés (Phase 4 triage) :** 3 items, tous → issue GitHub (milestone Sprint 25) :
  - `.mt-zoom__btn` <44px sur touch mobile [S | events/frontend] → issue #226 (Sprint 25)
  - Statuer raccourci `?` aide Timeline (câbler vs hover-only) [XS | events/frontend] → issue #227 (Sprint 25)
  - EventPill aria-hidden conditionnel + couverture tests clavier §9 [S | events/frontend] → issue #228 (Sprint 25)
  (item « formaliser PAT-S24 dans ux-patterns.md » déjà livré par #197 → résolu, non re-tracé)
**Status :** Terminé (merge PR #225)

## Sprint 25 — 2026-07-06 → 2026-07-06 (Terminé — merge PR #229 dans dev — cohésion 0.82, Finalisation Events conflit 409 + contrat DTO)
**Objectif :** Câbler le conflit 409 optimistic-lock côté backend + aligner le contrat startDate/endDate DTO + finitions form.
**Milestone GitHub :** #25 (fermé après merge)
**Issues livrées (4) :** #201 (S), #200 (S), #188 (S — archived résiduel), #77 (M)
**Vagues exécutées :** V1 = #201 ∥ #200 ∥ #188 (fichiers disjoints — le mini-plan a confirmé #200 sur GlobalExceptionHandler/EventRepositoryJpaImpl, disjoint de #201) | V2 = #77 (dépend contrat 409 #200 + EventEditForm #188)
**Cohésion score :** 0.82
**Commits :** 8 — dac7735 (#188 toggle) + 88d2937 (#188 fix defaultValues) · 276e3ca (#200 handler 409) + 050176b + a0401ad (#200 test déterministe) · 38f8c65 (#201 dates) + 204dae2 (#201 garde service 422) · d8bd85f (#77 ConflictDialog) · ae57b0f (artefacts)
**BR impactées :** BR-EVE-003 (dérivation étendue au PATCH), BR-EVE-013 (archived exposé UI), BR-EVE-015 (NOUVELLE — édition concurrente → 409), BR-EVE-016 (NOUVELLE — endDate≥startDate backend DTO+service).
**Reviews :** 2 reviewers parallèles (backend + frontend) — 0 CRITIQUE / **3 MAJEUR** (trou validation endDate-seul<startDate, flip type non testé, toggle archived toujours décoché) / 3 MINEURS — tous les MAJEUR RÉSOLU, MINEURS notés non bloquants.
**Tests :** Backend 280/280 vert (test optimistic-lock rendu DÉTERMINISTE après flakiness 2/4 détectée par test-runner — cf. PIT-S25-002) | Frontend 344/344 vert | E2E 0 spec sur périmètre (gap planifié /create-e2e). CI PR #229 : backend+frontend+e2e+security tous SUCCESS.
**Nouveaux pitfalls / décisions / patterns :** PAT-S25-001 (Switch FormField flag), PAT-S25-002 (optimistic-lock handler scopé), PAT-S25-003 (ConflictDialog présentationnel + interception scopée), PIT-S25-001 (record élargi casse constructeurs positionnels), PIT-S25-002 (test optimistic-lock 2-threads flaky → déterministe), DEC-S25-001 (contrat PATCH dates).
**Follow-ups arbitrés (Phase 4 triage) :**
  - Clarifier UX archived=true vs quota BR-EVE-011 [S | events] → issue #230 (Sprint 26)
  - Modale conflit comparative complète (bloquée : enrichir corps 409 backend) [M | events/fullstack] → issue #231 (Sprint 26)
  - Spec E2E « variante conflit 409 » + toggle archived (gap coverage-E2E) [S | events/frontend] → issue #232 (Sprint 26)
  - eventCreationSchema startDate/endDate au create [XS | events] → discard (non requis, create déjà cohérent)
  - 2 follow-ups obsolètes (résolus en cours de sprint, non re-tracés) : test optimistic-lock flaky → rendu déterministe (a0401ad, cf. PIT-S25-002) ; note ctor EventEntity du slice test (mineur, absorbé par la réécriture déterministe)
**Status :** Terminé (merge PR #229)

## Sprint 26 — 2026-07-06 → 2026-07-07 (Terminé — merge PR #233 dans dev)
**Objectif :** Bus d'état réseau + bannière offline/timeout + pages 404/403/500/vide/loading clair+sombre.
**Milestone GitHub :** #26 (fermé après merge)
**Issues livrées (2) :** #76 (M), #57 (M)
**Vagues exécutées :** V1 = #76 ∥ #57 (parallèles, fichiers disjoints : apiClient/context vs app/[locale]/*.tsx neufs)
**Cohésion score :** 0.71
**Commits :** 5 (#76 initial `492000a`, #57 `a748982`, fix SSG #76 `7ad5f36`, fixups review `6032d97`, audit `4cf0c77`)
**Migrations Flyway :** aucune
**BR impactées :** aucune (features transversales frontend)
**Correctif chemins (démarrage S26) :** app router réel = `frontend/app/[locale]/` (PAS `frontend/src/app/`). contexts = `frontend/src/contexts/`, shared = `frontend/src/components/shared/`.
**Régression majeure détectée+corrigée par le lead :** `next build` cassé par #76 (OfflineBanner `useTranslations` monté au layout RACINE hors `NextIntlClientProvider` → crash prerender SSG 0/26). Les 2 fullstack-dev + le test-runner l'ont rapporté à tort « pré-existant / pages auth ». Contrôle `origin/dev` (build vert même env) → régression S26 confirmée. Fix `7ad5f36` (provider+bannière sous `[locale]/layout`), build revenu 26/26. Cf. [[PIT-S26-001]].
**Reviews :** reviewer batch — 0 CRITIQUE / 1 MAJEUR (locales layout fr,en vs middleware fr,en,es,de — PRÉ-EXISTANT → follow-up) / 4 MINEUR (3 corrigés `6032d97`, 2 → follow-up). ui-design : APPROUVÉ avec réserves (RÉSERVE 1 corrigée ; RÉSERVE 2 → [[DEC-S26-003]]).
**Tests :** Backend 280/280 green | Frontend 383/383 green (base 344 → +39) | `next build` 26/26 pages green | E2E : 10 nouveaux testids sans spec (→ /create-e2e post-merge) ; suite E2E existante tourne en CI.
**Nouveaux pitfalls / decisions / patterns :** PIT-S26-001 (i18n au root layout → crash SSG), PIT-S26-002 (timeout global exempte multipart), PAT-S26-001 (bus réseau axios↔React observable store), PAT-S26-002 (écrans d'état App Router locale-aware), DEC-S26-001 (token z-netbanner), DEC-S26-002 (403 dans error.tsx), DEC-S26-003 (exception i18n root error boundary).
**Follow-ups arbitrés (Phase 4 triage — 4 issues créées, milestone Sprint 27) :**
  - E2E offline réel + pages 404/500 (10 testids sans spec) [S | frontend] → issue #234 (Sprint 27) (#76 + Phase 8 coverage)
  - Aligner locales `[locale]/layout` (fr,en) ↔ middleware (fr,en,es,de) : es/de inatteignables, JSON S26 dead [M | frontend/i18n] → issue #235 (Sprint 27) (PRÉ-EXISTANT, reviewer MAJEUR)
  - Helper locale partagé (dédup résolution locale apiClient/error.tsx) [S | frontend] → issue #236 (Sprint 27) (reviewer MINEUR ; lié #235)
  - Filtre `refetchQueries` du retry bannière (ne refetch que les queries en erreur) [XS | frontend] → issue #237 (Sprint 27) (reviewer MINEUR)
**Follow-up obsolète (discard, 0 action) :** « prerender pages auth pré-existant » (RECOMMAND_FOLLOWUP #57) — MISDIAGNOSTIC : c'était le crash OfflineBanner (corrigé `7ad5f36`), build désormais 26/26 vert (CI success). Aucune issue.
**Absorbé en cours :** aucun (3 MINEUR review corrigés inline dans le scope, cf. `6032d97`).
**Status :** Terminé

## Sprint 27 — 2026-07-06 → 2026-07-07 (Terminé — merge PR #238 dans dev — cohésion 0.85, Refactor identité auth + sécurité contrôleurs)
**Objectif :** Unifier l'extraction d'identité (SecurityContextHolder) + durcir sécurité contrôleurs + CHECK/NOT NULL users.role.
**Milestone GitHub :** #27 (fermé après merge)
**Issues livrées (4) :** #93 (M), #122 (S — V12), #154 (S), #92 (S)
**Vagues exécutées :** V1 = #93 ∥ #122 (migration DB disjointe) | V2 = #154 → #92 (même ProductController.java, séquentiel)
**Cohésion score :** 0.85
**Commits :** 8 — `2ce265c` (#122 V12) · `b95710a` (#93 CallerResolver) · `4286670` (#154 ProductController adopte helper) · `548169c` (#92 catch→propagation) · `26d5056` (fix review javadoc UserController) · `43df6db` (artefacts) · `e2580d1` (fix /review-pr : self-DoS session Bearer + garde anonyme) · `feb004d` (artefacts review)
**Migrations Flyway :** **V12** (users.role NOT NULL + CHECK) — SEULE migration du plan S24-S28. ⚠ Bascule PROD = décision humaine (UPDATE non réversible + ALTER lock ACCESS EXCLUSIVE ; validée Testcontainers seul).
**Dépend de :** aucune (100% backend).
**BR impactées :** BR-AUT-005 (401 sans fuite), BR-AUT-011 (cookie OU Bearer), BR-EVT-001 (ownership 403), BR-PRO-004/BR-PRO-010 (ownership produit + anti cross-tenant), users.role NOT NULL + CHECK.
**Reviews :** intra-sprint (db-expert MERGEABLE + security-expert RAS + reviewer batch : 1 MAJEUR javadoc obsolète → corrigé `26d5056`, 2 MINEUR pré-existants) + **`/review-pr 238`** (3 reviewers INDÉPENDANTS : **1 MAJEUR self-DoS session** — Bearer + jti cookie-only → revoke-all — CORRIGÉ `e2580d1` ; + MINEURs). La review indépendante a rattrapé un MAJEUR raté par le batch intra-sprint.
**Tests :** Backend **295/295 verts** (Testcontainers Postgres 16). CI sprint/27 verte (feb004d). Pas de frontend → pas d'E2E. Audit : docs/memory/audits/sprint-27-test-coverage.md (0 [MISSING]).
**Nouveaux pitfalls / patterns / décisions / bugs :** PIT-S27-001 (jti hors SecurityContext = même source que JwtFilter), PIT-S27-002 (RTK git diff non-parsable), PIT-S27-003 (worktree chemins absolus → repo principal, renforce PIT-S24-002), PAT-S27-001 (CallerResolver), PAT-S27-002 (retrait catch→401), DEC-S27-001 (coercition role ROLE_USER), BUG-S27-001 (self-DoS session).
**Saturation contexte lead (mesure) :** modérée-haute — 2 vagues fan-out (V1 ∥2) + 3 specialists intra-sprint + /review-pr 3 reviewers indépendants + 2 cycles de fix (javadoc, self-DoS), purge via done.md.
**Incident récurrent :** 3/5 subagents ont initialement écrit sur le repo principal `dev` (cwd worktree, cf. PIT-S27-003) — tous auto-récupérés, `dev` vérifié propre.
**Absorbé en cours :** fix review self-DoS session (e2580d1) = le RECOMMAND_FOLLOWUP #93 (SessionController Bearer) traité pendant `/review-pr`, pas reporté.
**Follow-ups arbitrés (Phase 4 triage — 4 issues créées backlog libre, 0 discard, 1 absorbé) :**
  - Absorbé : self-DoS session Bearer (RECOMMAND_FOLLOWUP #93) → fix `e2580d1` pendant /review-pr.
  - Mapping 500 réel getProducts (test @SpringBootTest, clôt boucle #92) [XS | auth] → issue #239
  - Extraire requireOwner(UUID) ProductController (dédup ownership 5×) [S | products] → issue #240
  - Expliciter hasAuthority ROLE_USER sur /api/categories/** (SecurityConfig, hors-diff) [XS | auth] → issue #241
  - V12 lock NOT VALID/VALIDATE si users volumineuse prod (db-expert) [S | devops] → issue #242
  Backlog libre (pas milestone S28 — thème E2E distinct). Ratio discard 0%.
**Status :** Terminé

## Sprint 28 — 2026-07-06 → 2026-07-07 (Terminé — merge PR #243 dans dev — cohésion 0.68, Couverture E2E Produits/Catégories + fiabilité CI tests)
**Objectif :** Corriger l'alias e2e (Playwright vs vitest) + câbler CI + specs E2E Produits/Catégories + requête produits SQL indexée.
**Milestone GitHub :** #28
**Issues :** #207 (S), #133 (S), #218 (M), #41 (XS) + #124 (S) combinés
**Vagues :** V1 = #207+#133 (même script, fusionnés séquentiel) ∥ #41+#124 (backend) | V2 = #218 (après scope e2e corrigé)
**Migrations Flyway :** aucune
**Dépend de :** #207 débloque un vrai run Playwright pour #218 (ordre intra-sprint strict)
**Note code-state :** test-quiet.sh lance vitest pour scope e2e (bug #207) ; test:e2e Playwright jamais appelé ; requête produits filtrée en mémoire (pas SQL indexé). ⚠ #41 scope ambigu à préciser par fullstack-dev.
**Branche :** sprint/28 (créée depuis origin/dev le 2026-07-07)
**Milestone GitHub :** #28 (fermé après merge)
**Status :** Terminé (2026-07-07 — merge PR #243)

### Bilan exécution (2026-07-07)
**Issues livrées (5) :** #207, #133, #124, #41 (Vague 1) ; #218 (Vague 2)
**Vagues exécutées :** V1 = #207+#133 (devops, agent A) ∥ #124+#41 (backend, agent B), parallèles fichiers disjoints | V2 = #218 (E2E, agent C)
**Commits (8) :** da745b8 (#207/#133) · e2e7744 (#124) · 7f56fb7 (#41) · 0548cec (done) · d0541fd (#218 specs) · 52b9c83 (artefacts) · cc73cb0 (consolidation) · b2b304a (fix e2e CI)
**BR impactées :** BR-PRO-006 (#124 filtre SQL user_id), BR-PROD-001 (#41 produit sans event visible)
**Reviews :** reviewer batch — 0 CRITIQUE / 0 MAJEUR / 3 MINEUR (non bloquants → follow-ups)
**Tests :** Backend 301/301 ✅ | Frontend 383/383 ✅ | E2E CI 25 pass ✅ (1er run rouge sur 2 tests catégories #218 — sélecteurs texte devinés collision titre dialog — réparé b2b304a : data-testid DeleteConfirmDialog + rewire specs)
**CI de clôture :** 4/4 verte (backend, frontend, e2e, security) sur run 28861922835
**Nouveaux pitfalls / patterns :** PIT-S28-001 (case-arm test partagé = faux vert) ; PAT-S28-001 (filtre @ManyToOne par id JPQL index-friendly) ; PAT-S28-002 (seed E2E storageState + page.request.post)
**Décision scope #41 :** `getProductsWithEvents` = listing principal → fix appliqué là (nom gardé, renommage en follow-up)
**Absorbé en cours (fix CI) :** `DeleteConfirmDialog` data-testid (RF1 issue-218) + `RECOMMAND_TEST_RUNNER` (E2E prouvées vertes en CI) — résolus par b2b304a.
**Follow-ups arbitrés (Phase 4 triage — 3 créés issues, 0 discard) :**
  - Renommer `getProductsWithEvents` → `getProductsByUser` [S | backend/products] → issue #244 (backlog)
  - `deleteCategory` sans invalidation TanStack (categories.all + products.withEvents) [S | frontend/categories] → issue #245 (backlog)
  - Re-sync context-pack cp-frontend (périmé : prétend e2e/ vide + 12 tests ; réel 6+ specs, 383 Vitest) [XS | infra] → issue #246 (backlog)

> **Plan S24–S28 généré le 2026-07-06** (`/ai-env:sprint plan 5`, cohésion moyenne **0.77**). Aucun sprint < 0.3 (plus bas = S28 à 0.68). Ordre : a11y Timeline → Events 409/DTO → Résilience réseau/UI → Refactor auth (V12) → Qualité E2E/tests. **Vérif code-state architect (35 tool calls, 4 sous-agents)** a évité un Sprint-213-bis : **4 issues fermées car déjà faites** (#94 ports domaine #123, #202 isAllDay cohérent, #204 action sheet câblée, #206 EventBar/Lane utilisés). #82/#188 downsizés (résiduels déjà livrés). **Reportés au backlog (à surveiller) :** #69/#196/#219 virtualisation (Wave 7) ; #88 monétisation (ADR requis) ; #102 rate-limit Redis (nouvelle infra + ADR) ; #56 Landing DS (L) + #210 shell nav 248px (M) → candidats **S29 « design shell » dédié** ; #221 ArchUnit strict (dépend dégel #190) ; **#195 collapse par produit → re-spec nécessaire** (collapse catégorie déjà livré, viserait un toggle keyé resource.id).

---

## Sprint 29 — 2026-07-07 → en cours (démarré 2026-07-11 — cohésion 0.53, Conteneurisation & déploiement)
**Objectif :** Rendre le projet déployable (Docker) + valider migrations Flyway prod + purger secrets historique.
**Milestone GitHub :** #29
**Issues :** #37 (M), #181 (S), #112 (S — DESTRUCTIF)
**Vagues (initial) :** V1 = #37 ∥ #181 | V2 = #112 ISOLÉ (force-push historique).
**Vagues (exécuté) :** V1 unique = #37 ∥ #181 ∥ #112 — après arbitrage dev, #181 et #112 recadrés en TOOLING/DOC uniquement (aucune exécution destructive), donc disjoints et parallélisables.
**Arbitrage dev (2026-07-11) :**
  - #181 → livraison outillage : `scripts/flyway-validate.sh` + `docs/ops/flyway-v11-validation.md`. La validation sur base prod réelle reste à exécuter par le dev/ops (pas d'accès DB en session). Critères "sur données réelles" restent ouverts.
  - #112 → runbook documenté uniquement : `docs/ops/purge-git-secrets-runbook.md`. AUCUN filter-repo / force-push exécuté. Exécution destructive déléguée à une session ops dédiée + fenêtre planifiée + "oui" dev.
**Branche de travail :** `claude/sprint-29-start-052110` poussée sur `origin/sprint/29`. PR #247 → dev.
**Migrations Flyway :** aucune (head = V12).
**Dépend de :** aucune
**Commits :** 6 (dont plan 732f0c6) — #37 591e30b, #181 705c4ef, #112 22b6284, review b8a64d4, artefacts 4868f57.
**Tests :** Backend 301/301 · Frontend 383/383 · E2E CI vert · 0 régression.
**Reviews :** reviewer batch — 0 CRITIQUE / 2 MAJEUR / 4 MINEUR. Corrigés : count numérique GATE (#181) + `--chown` public (#37) [b8a64d4]. Différés → follow-ups.
**CI PR #247 :** backend ✅ frontend ✅ e2e ✅ security ✅ — MERGEABLE.
**Nouveaux patterns/pitfalls/décisions :** PAT-S29-001 (health Actuator Docker), PIT-S29-001 (RTK tronque stdout docker), DEC-S29-001 (NEXT_PUBLIC_API_URL = URL hôte).
**Note :** stack réelle = Spring Boot 3.4.13 (corrigé dans CLAUDE.md, F6).
**Follow-ups arbitrés (Phase 4 triage) :**
  - F1 — script correction Flyway V11 conditionnel [S | backend/db] → issue #248 (backlog)
  - F2 — rotation secrets DB_PASSWORD/JWT_SECRET/BREVO [S | ops/sécurité] → issue #249 (backlog, P1)
  - F3 — créer external-services-inventory.md [XS | doc] → issue #250 (backlog)
  - F4 — pin digest sha256 images Docker [S | devops] → issue #251 (backlog)
  - F5 — durcissements (FLYWAY_PASSWORD die + healthcheck frontend) [XS] → absorbé (f89d2f7)
  - F6 — version stack Spring Boot 3.4.13 dans CLAUDE.md [XS] → absorbé (f89d2f7)
  Bilan : 4 issues créées (backlog), 2 absorbées, 0 discard.
**Commits (final) :** 7 — +f89d2f7 (follow-ups absorbés).
**Status :** Prêt à merger (CI en revalidation sur f89d2f7 ; confirmation dev en attente)

## Sprint 30 — 2026-07-11 (TERMINÉ — merge PR #252 dans dev — cohésion 0.76, Garde-fous boot prod & fiabilité auth)
**Objectif :** Fail-fast prod (rate-limit off, BREVO absente) + log config cookie/CORS + test profil prod.
**Milestone GitHub :** #30 (fermé après merge)
**Issues livrées (4) :** #140 (S), #129 (XS), #130 (S), #216 (S)
**Vagues exécutées :** V1 = #140 ∥ #129 (parallèle, disjoints) | V2 = #216 ∥ #130 (parallèle, fichiers disjoints dans infrastructure/config)
**Cohésion score :** 0.76
**Commits :** 4 (1 par issue) + 1 consolidation mémoire — fc92c7b #140, 5b80967 #129, 55254fa #130, 2433738 #216
**Migrations Flyway :** aucune
**Dépend de :** Sprint 29 (#37 fournit le profil prod conteneurisé)
**BR impactées :** aucune BR métier (garde-fous boot/config, transversal auth/infra). Croise #160 (anti-fuite logs).
**Reviews :** reviewer batch — 0 CRITIQUE / 0 MAJEUR / 1 MINEUR (#130 test négatif no-warn manquant, non bloquant → follow-up). VERDICT RAS.
**Tests :** Backend 318/318 green (+17 ce sprint : 4 #140, 1 #129, 5 #130, 7 #216) | Frontend N/A | E2E N/A (sprint 100% backend, coverage-E2E OK).
**Nouveaux patterns :** PAT-S30-001 (HealthIndicator @Profile prod), PAT-S30-002 (test fichier config sans boot complet), PAT-S30-003 (multi-invariant fail-fast, 1 listener N checks disjoints).
**Follow-ups arbitrés (Phase 4 triage — dev a choisi « créer les 5 ») :**
  - Fail-fast si COOKIE_DOMAIN/CORS vides en prod [S | infrastructure] → issue #253 (milestone Sprint 31)
  - Fail-fast sur app.cookie.secure=false en prod effectif [S | auth/sécurité] → issue #254 (milestone Sprint 31)
  - Alerting réel composant `brevo` de /actuator/health [XS | devops/observability] → issue #255 (backlog)
  - Symétrie filet-régression fichier pour CORS/storage prod [XS | auth] → issue #256 (backlog)
  - Test négatif "no-warn quand config valide" pour ProdConfigStartupLogger [XS | test, reviewer MINEUR] → issue #257 (backlog)
**Status :** Terminé

## Sprint 31 — 2026-07-07 → 2026-07-11 (Terminé — merge PR #258 dans dev — cohésion 0.37, Sécurité exposition : CVE & fuite logs)
**Objectif :** Solder CVE HIGH/CRITICAL front (#222) + back (#223) + assainir logs axios résiduels (#160).
**Milestone GitHub :** #31 (fermé après merge)
**Issues livrées (3) :** #223 (S — 6 CVE HIGH triées), #222 (M — vitest 2→3, CI dev+prod), #160 (S — fuite token authService + garde ESLint)
**Vagues exécutées :** V1 = #223 (backend) ∥ #222 (frontend deps) | V2 = #160 (frontend source, après stabilisation npm)
**Cohésion score :** 0.37 (point faible du plan, > 0.3 → pas de split)
**Commits :** 656ffa0 (#223) · 2abd4ac (#222) · bba7b97 (#160) · 1d8a842 (audit) · 7042638 (corrections review PR)
**Migrations Flyway :** aucune
**Dépend de :** aucune
**BR impactées :** aucune BR fonctionnelle (sprint deps + durcissement logging/sécurité).
**Reviews :** /review-pr #258 (TEAM lean : reviewer + security-expert) — 0 CRITIQUE / 2 MAJEUR / 3 MINEUR, tous RÉSOLUS (commit 7042638 : garde ESLint mono-arg + RuleTester + ArchUnit stateless + resync CI).
**Tests :** Backend 318/318 vert (CI 1m5s) | Frontend 390/390 vert (CI 1m31s, vitest 3) | security CI pass. E2E non requis (infra, pas de parcours métier S31).
**Décisions notables (écarts au plan) :** #160 `possibly_done` RÉFUTÉ (fuite token réelle) → respawn forcé ; waves resséquencées (#160 en V2, node_modules partagé raté par matrice architect) ; branche worktree renommée `sprint/31`.
**Nouveaux pitfalls/patterns/décisions :** PIT-S31-001/002, PAT-S31-001/002, DEC-S31-001/002.
**Follow-ups arbitrés (Phase 4 triage — 3/3 créés en backlog, 0 discard) :**
  - Upgrade plateforme Spring Boot 3.5.x (résout 3 CVE Boot acceptées) [M | devops] → issue #260
  - CVE MODERATE PROD résiduelles : next-intl (open-redirect/proto-pollution) + next→postcss XSS [M | frontend] → issue #261
  - Untrack `frontend/.eslintcache` + gitignore (churn à chaque lint) [XS | devops] → issue #262
**Status :** Terminé

## Sprint 32 — 2026-07-07 → 2026-07-12 (Terminé — merge PR #263 dans dev)
**Objectif :** Endpoint export RGPD (profil+produits+événements+catégories ; JSON/MD sync + ZIP/CSV async).
**Milestone GitHub :** #32 (fermé après merge)
**Issues livrées (1) :** #58 (L — mono-issue, sprint dédié)
**Vagues exécutées :** V1 = #58 seul
**Cohésion score :** 1.00
**Commits :** 7 (feature 0d1d739 ; secfix f663d98 ; revfix 9b9bf5c ; prfix review 57670a6 ; + 3 memo suivi)
**Migrations Flyway :** V13 `export_jobs` (FK cascade, CHECK format/status, index user)
**ADR :** ADR-003 (infra jobs async — DEC-S32-001)
**BR impactées :** aucune BR métier formelle (exigence légale RGPD Art.20)
**Reviews :** 2 passes. Sprint (Phase 7) — reviewer 1 MAJEUR + 2 MINEUR (tous RÉSOLU 9b9bf5c). PR #263 (/review-pr TEAM) — reviewer/security/db : 0 CRITIQUE, 1 « MAJEUR » requalifié follow-up (#264) + 2 MINEUR RÉSOLU (57670a6). security-expert & db-expert 2 passes chacun : 0 bloquant.
**Tests :** Backend 355/355 green (baseline 351 + 4). E2E/frontend hors périmètre (backend pur).
**Nouveaux mémoires :** DEC-S32-001 ; PAT-S32-001 (mapper new-feature en infra vs freeze ArchUnit), PAT-S32-002 (@Async après commit PENDING) ; PIT-S32-001 (findById collision → findDomainById), PIT-S32-002 (PATH_LIMITS casse tests POST via IP MockMvc partagée).
**Contrat DTO export figé** (source de vérité #59/S33) : voir issue-58-done.md + body PR #263.
**Absorbé en cours :** 3 cycles de correction post-review (secfix sécu, revfix review sprint, prfix review PR) intégrés avant merge — détail dans les done.md.
**Follow-ups arbitrés (Phase 4 triage) :**
  - Chemin de stockage dédié export (`app.storage.export-path`) [S | transversal] → issue #264 (milestone S33)
  - Rate-limit GET export ou tracer décision hors-scope [S | auth] → issue #265 (backlog)
  - Export streaming/pagination gros comptes (dette scale ADR-003) [M | transversal] → issue #266 (backlog)
  - Scheduler purge fichiers/jobs export expirés [S | transversal] → issue #267 (backlog)
  - Commentaire trompeur `passwordResetExecutor` (AsyncConfig, CallerRunsPolicy vs AbortPolicy) [XS | backend] → issue #268 (backlog)
**Status :** Terminé

## Sprint 33 — 2026-07-12 (Terminé — merge PR #269 dans dev, cohésion 0.40, Conformité EU frontend : export + locales)
**Objectif :** Flux export RGPD frontend (Réglages, 3 étapes) + aligner locales layout es/de (fix 404).
**Milestone GitHub :** #33 (fermé après merge)
**Issues livrées (2) :** #59 (M — export RGPD UI), #235 (M — locales es/de)
**Vagues exécutées :** V1 = #59 ∥ #235 (parallèle, fichiers disjoints) | V2 = ui-design + test-runner
**Cohésion score :** 0.40
**Commits :** 6 — `bed0d65` #235 · `e5fa89e` #59 · `985d40f` corrections charte · `5e2921e` fix e2e testid · `2403dcc` artefacts mémoire · `a303ccf` MINEUR review PR269. Merge `8f4c0b7`.
**BR impactées :** aucune (frontend UI + routing ; consomme contrat backend #58 déjà testé S32).
**Reviews :** ui-design APPROUVE_AVEC_RESERVES (2 MAJEUR + 1 MINEUR → corrigés 985d40f) · review batch sprint 1 CRITIQUE (testid e2e → 5e2921e) + 1 MAJEUR (e2e async → follow-up) · review PR #269 0 CRITIQUE / 0 MAJEUR / 2 MINEUR (→ corrigés a303ccf). Tous RÉSOLUS.
**Tests :** Frontend 413/413 green (hors `console-error-guard` pré-existant `eslint-plugin-storybook`) | E2E happy-path export sync couvert | tsc 0 erreur fichiers sprint.
**Nouveaux pitfalls / décisions / patterns :** PIT-S33-001 (`/api/api` double préfixe), PIT-S33-002 (locales dupliquées 5 fichiers, module Edge pur) ; DEC-S33-001 (Option 1 aligner 4 langues), DEC-S33-002 (migration export front → contrat #58) ; PAT-S33-001 (`rtk proxy gh pr diff`).
**Note tooling :** pack `cp-frontend` corrigé (e2e non vide — 9 specs, info périmée S9). Worktrees de sprint sans `node_modules` (contournement symlink) → follow-up infra.
**Absorbé en cours (XS) :** #235 a consolidé 5 tableaux de locales dupliqués (le plan n'en annonçait que 2) — decouverte au grep, intégrée.
**Follow-ups arbitrés (Phase 4 triage) :**
  - E2E export async (ZIP/CSV polling) + lien expiré + erreur/FAILED [S | auth/settings] → issue **#270** (backlog)
  - E2E routing `/es` `/de` → 200 [XS | transversal] → issue **#271** (backlog)
  - Infra : worktrees de sprint sans `node_modules` [S | infrastructure] → issue **#272** (backlog)
  Bilan : 3 créées (0 discard, 0 absorbé) — triage discipliné, aucun sur-signalement.
**Status :** Terminé

> **Plan S29–S33 généré le 2026-07-07** (`/ai-env:sprint plan 5 -c focus MVP`, cohésion moyenne **0.61**, aucun sprint < 0.3). Fil directeur MVP = **shippable en prod** : déploiement (S29) → garde-fous boot (S30) → sécurité exposition (S31) → légal RGPD backend (S32) → conformité EU frontend (S33). Le cœur fonctionnel étant déjà livré (S1–S28), ces 5 sprints n'ajoutent quasiment aucune feature. **Vérif code-state Phase 0.5** : #235 confirmé ouvert (es/de 404), #160 possibly_done (2/4 sites déjà faits). **Backlog HORS MVP explicite :** #88/#102 (monétisation + Redis = ADR post-MVP), #212 (avatar MinIO — LocalStorageAdapter + volume Docker suffisent pour ship), #56/#210 (design-shell MVP-adjacent), #69/#196/#219 (scale), #145/#234/#209/#232 (tests non bloquants), #125/#127/#148 (polish), #215 (à requalifier : test.fixme, vrai bug prod ?). **Ajustements possibles au démarrage :** tirer #235 en S31, sortir #223 en S30, remonter #212 dans S29 (même docker-compose.yml que #37).

## Sprint 34 — 2026-07-12 (Terminé — livré, PR #277 → dev, cohésion 0.55, Supply-chain / CVE platform upgrade)
**Objectif :** Résorber les CVE plateforme (Boot 3.5.x backend, next-intl/postcss frontend) + garde CI anti-drift BOM.
**Milestone GitHub :** #34
**Issues livrées (3) :** #260 (Boot 3.4.13→3.5.16, 3 CVE HIGH résolues), #261 (next-intl 4.0.2→4.13.2, 2 CVE MODERATE résolues), #224 (BomDriftTest garde anti-drift BOM)
**Vagues exécutées :** V1 = #260 (backend) ∥ #261 (frontend) | V2 = #224 (après #260)
**Cohésion score :** 0.55
**Commits :** 6 (a9fc47d #260 · a8b6081 #261 · cd03cf8 #224 · bb6120a+b455232 correctifs review/doc · 60eb216 merge dev)
**Migrations Flyway :** aucune. **BR impactées :** aucune (durcissement supply-chain/build/sécurité pur).
**Reviews :** reviewer batch — 0 CRITIQUE / 1 MAJEUR (commentaire pom obsolète testcontainers, RÉSOLU b455232) / 0 MINEUR. Verdict APPROVED.
**Tests :** Backend 361/361 green (Testcontainers, BomDriftTest 6/6, StatelessSessionGuardTest 2/2) | Frontend 421/421 green | trivy 0 HIGH/CRITICAL backend. E2E non requis (bumps deps, 0 nouveau data-testid).
**Nouveaux decisions / pitfalls / patterns :** DEC-S34-001 (retrait overrides `<*.version>` post-Boot-3.5.16), DEC-S34-002 (next-intl intra-major + postcss XSS accepté car épinglé par next) ; PIT-S34-001 (`getRequestConfig({locale})` déprécié next-intl) ; PAT-S34-001 (garde anti-drift = test JUnit pur lisant versions effectives par réflexion + comparateur sémantique).
**Note tooling (mémoire projet) :** branche `sprint/34` déjà checkout dans le worktree principal (créée par /sprint plan) → travail sur branche worktree pointée sur `origin/sprint/34`, push via refspec. Conflit à /sprint end : dev avait dupliqué le plan S34-S38 via PR #276 (`661d38d`) → merge origin/dev, conflit trivial sprint-history.md résolu. `build-briefing` gate frontend échoue pour domaine `unknown` (packs trop minces).
**Dette résiduelle documentée :** postcss XSS (sans fix upstream, cve-acceptance.md).
**Follow-ups arbitrés (Phase 4 triage) :**
  - E2E Playwright i18n post-bump [S | i18n/transversal] (issue-261) → issue **#278** (backlog libre)
  - Migration `getRequestConfig({locale})`→`requestLocale` [XS | i18n/frontend] (issue-261) → issue **#279** (milestone Sprint 35)
  Bilan : 2 créées (0 discard, 0 absorbé) — triage discipliné.
**Status :** Livré — PR #277 prête, attente CI verte + merge (Phase 5).

## Sprint 35 — 2026-07-12 (Terminé — merge PR #280 dans dev)
**Objectif :** Fail-fast au boot prod (COOKIE_DOMAIN/CORS vides, cookie.secure=false) + rotation des secrets exposés.
**Milestone GitHub :** #35 (fermé après merge)
**Issues livrées (2) :** #254, #253 — **#249 différée** (action OPS pure, hors PR ; runbook `docs/memory/devops/secret-rotation-runbook.md`, issue laissée ouverte, projet pas encore en prod)
**Vagues exécutées :** V1 = #254 (ProfileSafetyGuard cookie.secure) | V2 = #253 (COOKIE_DOMAIN/CORS, même fichier → séquentiel)
**Cohésion score :** 0.45
**Commits :** 5 (3 code : `32c473a` #254, `b9e7596` #253, `5d21a57` fix review #254 ; 2 docs : `85b772a` artefacts, `5e309ae` runbook #249)
**BR impactées :** aucune (durcissement boot-safety infrastructure/config ; adjacent BR-AUT-007 cookie JWT).
**Reviews :** reviewer batch — 0 CRITIQUE / 1 MAJEUR / 2 MINEUR (tous RÉSOLU, commit `5d21a57` : message #254 nomme `COOKIE_SECURE` + javadoc corrigée).
**Tests :** Backend 374/374 green | Frontend 421/421 green | E2E N/A (0 fichier .tsx, 0 data-testid).
**Nouveaux pitfalls / patterns :** PIT-S35-001 (property `${VAR}` sans inner-default → placeholder opaque avant message métier) ; PAT-S35-001 (extension ProfileSafetyGuard, défaut fail-safe selon sémantique de la property) ; PAT-S35-002 (durcir WARN démarrage → fail-fast dans garde pré-beans). Aucune décision nouvelle.
**Follow-ups :** aucun RECOMMAND_FOLLOWUP signalé. #249 différée (OPS, runbook fourni).
**Note tooling :** `detect-domain.sh` re-confirmé bloquant (zombies >1h en background) → domaines mappés à la main (`auth`). `check-sprint-completeness.sh` absent de ce projet (vérif complétude faite à la main).
**Status :** Terminé (clôturé 2026-07-12)

## Sprint 36 — 2026-07-12 (En cours — cohésion 0.72, Export RGPD hardening)
**Objectif :** Chemin de stockage dédié export + rate-limit GET export + scheduler de purge des exports expirés (index V14).
**Milestone GitHub :** #36
**Issues :** #264, #265, #267
**Vagues :** V1 = #264 (storage) ∥ #265 (rate-limit) | V2 = #267 (purge via port de #264 ; introduit @EnableScheduling)
**Migrations Flyway :** V14 (idx_export_jobs_expires_at)
**Dépend de :** aucune (mais introduit le scheduling réutilisé en S37)
**Status :** En cours

## Sprint 37 — 2026-07-12 → 2026-07-13 (Terminé — PR #282 dans dev)
**Objectif :** Durcir le flux reset-password : E2E Playwright, rate-limit/lockout par token, verrou anti-TOCTOU (@Version, V15), purge TTL des tokens.
**Milestone GitHub :** #37 (fermé après merge)
**Issues livrées (4) :** #145, #141, #143, #139
**Vagues exécutées :** V1 = #145 (e2e) ∥ #141 (rate-limit) ∥ #143 (V15) | V2 = #139 (même service que #143 ; réutilise @EnableScheduling de S36)
**Cohésion score :** 0.80
**Commits :** 6 — #143 `9c4e60d`, #145 `c4137c9`, #141 `ee69c11` + hardening `f7210e1`, #139 `310756e`, review-fix `8f4ea7b`, artefacts `f4b75eb`
**Migrations Flyway :** V15 (colonne `version` sur `password_reset_tokens`)
**Dépend de :** S36 (dure — @EnableScheduling bootstrappé par #267, réutilisé par #139)
**BR impactées :** aucune BR fonctionnelle (durcissement technique du flux #138)
**Reviews :** batch `/sprint start` (reviewer+security+db) + `/review-pr 282` (TEAM 4 agents) — 0 CRITIQUE / 3 MAJEUR (2 corrigés `f7210e1`+`8f4ea7b`, 1 déféré=SELECT save/findById) / MINEURS (3 corrigés, 3 trade-offs acceptés). Convergence sécurité MAJEUR sur RateLimitingFilter (body/clé non bornés) → corrigé avant merge.
**Tests :** Backend 390/390 green | E2E métier #145 6 passed (auteur, DB jetable) | CI verte sur `8f4ea7b`
**Nouveaux pitfalls / patterns / bugs :** PIT-S37-001..004, PAT-S37-001..003, BUG-S37-001
**Note capacité :** 4 issues (dépasse règle ≤3) mais 9 pts, #143 = XS — validé par le dev.
**Status :** Terminé
**Follow-ups arbitrés (Phase 4 triage — 4 créés, 0 discard) :**
  - Découpler canal capture token E2E ↔ schéma DB [M | backend/auth] → issue #283 (Sprint 38)
  - Spec E2E cas d'échec reset (ancien mdp, token rejoué) [S | e2e] → issue #284 (Sprint 38)
  - Cap hikari.maximum-pool-size profil test [XS | backend] → issue #285 (Sprint 38)
  - SELECT superflu save()/findById avant insert [S | backend/auth] → issue #286 (Sprint 38)
**RECOMMAND traités :** RECOMMAND_SECURITY #141 (audité + validé en /review-pr, hardening f7210e1 suffisant) ; RECOMMAND_DB_EXPERT #139 → issue #285.

## Sprint 38 — 2026-07-13 (Terminé — merge PR #287 dans dev, cohésion 0.78, Auth error contract)
**Objectif :** Uniformiser le contrat d'erreur JSON auth : AuthController /me,/register,/logout + codes stables GlobalExceptionHandler + durcir writeJsonError.
**Milestone GitHub :** #38 (fermé après merge)
**Issues livrées (3) :** #125, #126, #127
**Vagues exécutées :** V1 = #127 (codes stables) ∥ #126 (writeJsonError) | V2 = #125 (route via codes stables de #127)
**Migrations Flyway :** aucune
**Dépend de :** aucune (ordonné dernier du plan S34–S38)
**Commits :** 4 code (c8fc800 #127, 5cf7b2a #126, 8e9e0fd #125, 6474c91 absorption review) + artefacts/clôture
**BR impactées :** BR-AUT-001 (register 409), BR-AUT-005 (pas de fuite interne), BR-AUT-008 (/me), BR-AUT-010 (logout). Anti-pattern A4 réduit (bodies 500 = strings statiques JSON).
**Reviews :** interne pré-PR (MERGE_OK, 2 MINEURS absorbés en 6474c91) + `/review-pr 287` mode TEAM (back-reviewer + security-expert contre-audit) = MERGE_OK, 0 CRITIQUE, 1 MAJEUR + 1 MINEUR arbitrés follow-up. Sécurité : RAS (échappement Jackson testé payload malveillant, statuts/contrôle d'accès inchangés, pas de PII).
**Tests :** Backend 398/398 ✅ | Frontend 421/421 ✅ | E2E vert en CI (skippés en local, `E2E_DB_PASSWORD` absent). Audit : `docs/memory/audits/sprint-38-test-coverage.md`.
**Nouveaux patterns :** PAT-S38-001 (ErrorCode enum vs getReasonPhrase dans contrat JSON).
**Incident worktree :** subagent #125 a commité sur `sprint/34` local du repo principal (pitfall [[sprint-subagent-worktree-cwd]]) → cherry-pick propre en 8e9e0fd + revalidation 398/398, `sprint/34` local reset à 5c8809a (origin intact, ccf9280 en reflog).
**Follow-ups arbitrés (Phase 4 triage — dev : créer les 3 en backlog) :**
  - Unifier le vocabulaire du champ `error` d'AuthController sur ErrorCode [S | auth] → issue #288 (review #287 MAJEUR)
  - Vérifier l'énumération /me 404 vs 401 [S | auth, security] → issue #289 (audit sécurité, pré-existant)
  - Étendre ErrorCode/buildBody aux 7 handlers restants de GlobalExceptionHandler [S | infrastructure] → issue #290 (review #287 MINEUR pré-existant)
**Fin du plan S34–S38** (durcissement MVP shippable prod). Backlog milestone #38 non traité ce sprint : #283–#286 (follow-ups S37, sans label sprint-38) → à replanifier.

> **Plan S34–S38 généré le 2026-07-12** (`/ai-env:sprint plan 5`, cohésion moyenne **0.66**, aucun sprint < 0.3). Fil directeur = **durcissement MVP shippable prod** : supply-chain CVE (S34) → boot-safety/secrets (S35) → export RGPD (S36) → reset-password (S37) → contrat erreur auth (S38). **Vérif code-state Phase 0.5** : aucune issue `possibly_done` — tout vérifié comme travail réel restant (RateLimitingFilter POST-only, pas de @Version reset-token, pas d'index expires_at, pas de @EnableScheduling, pas de spec E2E forgot/reset). **Dépendance dure :** S36→S37 (@EnableScheduling). **Migrations :** S36=V14, S37=V15 (une plage/sprint). **Drift détecté :** CLAUDE.md prétend `db/migration/` vide + `ddl-auto=update` — FAUX (V1..V13 actifs + `ddl-auto=validate`) → correction lancée via chip séparé. **[MEMORY:decision] Flyway = source de vérité** (tout changement schéma = migration + mapping entité). **Backlog hors thème :** features lourdes (#210/#195/#56/#69/#212/#102/#231/#88), a11y events (#226/#227/#228 → S39), hygiène hexagonale (#170/#185/#190/#221/#240/#244 → S40), sprint E2E dédié (#205/#209/#232/#234/#270/#271/#215), i18n (#72/#74/#90/#142/#172).
