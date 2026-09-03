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
**Note sur les issues de suivi :** #446 porte un critère d'acceptation **ajouté par le
project-manager** sur `.mt-sheet` / `.mt-actionsheet` — ils portent le même token `--z-modal`, donc
le bug peut se rejouer sur deux autres surfaces ; à corriger ou à démontrer hors risque. #448 note
que la correction HiDPI **ne sera jamais exercée en CI** tant que `deviceScaleFactor` reste à 1, ce
qui rend le test unitaire à `dpr: 3` non optionnel. À l'inverse, le PM signale n'avoir **pas relu les
fichiers sources** : les numéros de ligne et valeurs mesurées inscrits dans les 3 issues viennent des
artefacts du sprint, non revérifiés par lui.

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
**Note sur les issues de suivi :** #446 porte un critère d'acceptation **ajouté par le
project-manager** sur `.mt-sheet` / `.mt-actionsheet` — ils portent le même token `--z-modal`, donc
le bug peut se rejouer sur deux autres surfaces ; à corriger ou à démontrer hors risque. #448 note
que la correction HiDPI **ne sera jamais exercée en CI** tant que `deviceScaleFactor` reste à 1, ce
qui rend le test unitaire à `dpr: 3` non optionnel. À l'inverse, le PM signale n'avoir **pas relu les
fichiers sources** : les numéros de ligne et valeurs mesurées inscrits dans les 3 issues viennent des
artefacts du sprint, non revérifiés par lui.

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
**Note sur les issues de suivi :** #446 porte un critère d'acceptation **ajouté par le
project-manager** sur `.mt-sheet` / `.mt-actionsheet` — ils portent le même token `--z-modal`, donc
le bug peut se rejouer sur deux autres surfaces ; à corriger ou à démontrer hors risque. #448 note
que la correction HiDPI **ne sera jamais exercée en CI** tant que `deviceScaleFactor` reste à 1, ce
qui rend le test unitaire à `dpr: 3` non optionnel. À l'inverse, le PM signale n'avoir **pas relu les
fichiers sources** : les numéros de ligne et valeurs mesurées inscrits dans les 3 issues viennent des
artefacts du sprint, non revérifiés par lui.

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
**Note sur les issues de suivi :** #446 porte un critère d'acceptation **ajouté par le
project-manager** sur `.mt-sheet` / `.mt-actionsheet` — ils portent le même token `--z-modal`, donc
le bug peut se rejouer sur deux autres surfaces ; à corriger ou à démontrer hors risque. #448 note
que la correction HiDPI **ne sera jamais exercée en CI** tant que `deviceScaleFactor` reste à 1, ce
qui rend le test unitaire à `dpr: 3` non optionnel. À l'inverse, le PM signale n'avoir **pas relu les
fichiers sources** : les numéros de ligne et valeurs mesurées inscrits dans les 3 issues viennent des
artefacts du sprint, non revérifiés par lui.

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
**Note sur les issues de suivi :** #446 porte un critère d'acceptation **ajouté par le
project-manager** sur `.mt-sheet` / `.mt-actionsheet` — ils portent le même token `--z-modal`, donc
le bug peut se rejouer sur deux autres surfaces ; à corriger ou à démontrer hors risque. #448 note
que la correction HiDPI **ne sera jamais exercée en CI** tant que `deviceScaleFactor` reste à 1, ce
qui rend le test unitaire à `dpr: 3` non optionnel. À l'inverse, le PM signale n'avoir **pas relu les
fichiers sources** : les numéros de ligne et valeurs mesurées inscrits dans les 3 issues viennent des
artefacts du sprint, non revérifiés par lui.

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
**Note sur les issues de suivi :** #446 porte un critère d'acceptation **ajouté par le
project-manager** sur `.mt-sheet` / `.mt-actionsheet` — ils portent le même token `--z-modal`, donc
le bug peut se rejouer sur deux autres surfaces ; à corriger ou à démontrer hors risque. #448 note
que la correction HiDPI **ne sera jamais exercée en CI** tant que `deviceScaleFactor` reste à 1, ce
qui rend le test unitaire à `dpr: 3` non optionnel. À l'inverse, le PM signale n'avoir **pas relu les
fichiers sources** : les numéros de ligne et valeurs mesurées inscrits dans les 3 issues viennent des
artefacts du sprint, non revérifiés par lui.

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
**Note sur les issues de suivi :** #446 porte un critère d'acceptation **ajouté par le
project-manager** sur `.mt-sheet` / `.mt-actionsheet` — ils portent le même token `--z-modal`, donc
le bug peut se rejouer sur deux autres surfaces ; à corriger ou à démontrer hors risque. #448 note
que la correction HiDPI **ne sera jamais exercée en CI** tant que `deviceScaleFactor` reste à 1, ce
qui rend le test unitaire à `dpr: 3` non optionnel. À l'inverse, le PM signale n'avoir **pas relu les
fichiers sources** : les numéros de ligne et valeurs mesurées inscrits dans les 3 issues viennent des
artefacts du sprint, non revérifiés par lui.

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
**Note sur les issues de suivi :** #446 porte un critère d'acceptation **ajouté par le
project-manager** sur `.mt-sheet` / `.mt-actionsheet` — ils portent le même token `--z-modal`, donc
le bug peut se rejouer sur deux autres surfaces ; à corriger ou à démontrer hors risque. #448 note
que la correction HiDPI **ne sera jamais exercée en CI** tant que `deviceScaleFactor` reste à 1, ce
qui rend le test unitaire à `dpr: 3` non optionnel. À l'inverse, le PM signale n'avoir **pas relu les
fichiers sources** : les numéros de ligne et valeurs mesurées inscrits dans les 3 issues viennent des
artefacts du sprint, non revérifiés par lui.

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
**Note sur les issues de suivi :** #446 porte un critère d'acceptation **ajouté par le
project-manager** sur `.mt-sheet` / `.mt-actionsheet` — ils portent le même token `--z-modal`, donc
le bug peut se rejouer sur deux autres surfaces ; à corriger ou à démontrer hors risque. #448 note
que la correction HiDPI **ne sera jamais exercée en CI** tant que `deviceScaleFactor` reste à 1, ce
qui rend le test unitaire à `dpr: 3` non optionnel. À l'inverse, le PM signale n'avoir **pas relu les
fichiers sources** : les numéros de ligne et valeurs mesurées inscrits dans les 3 issues viennent des
artefacts du sprint, non revérifiés par lui.

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
**Note sur les issues de suivi :** #446 porte un critère d'acceptation **ajouté par le
project-manager** sur `.mt-sheet` / `.mt-actionsheet` — ils portent le même token `--z-modal`, donc
le bug peut se rejouer sur deux autres surfaces ; à corriger ou à démontrer hors risque. #448 note
que la correction HiDPI **ne sera jamais exercée en CI** tant que `deviceScaleFactor` reste à 1, ce
qui rend le test unitaire à `dpr: 3` non optionnel. À l'inverse, le PM signale n'avoir **pas relu les
fichiers sources** : les numéros de ligne et valeurs mesurées inscrits dans les 3 issues viennent des
artefacts du sprint, non revérifiés par lui.

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
**Note sur les issues de suivi :** #446 porte un critère d'acceptation **ajouté par le
project-manager** sur `.mt-sheet` / `.mt-actionsheet` — ils portent le même token `--z-modal`, donc
le bug peut se rejouer sur deux autres surfaces ; à corriger ou à démontrer hors risque. #448 note
que la correction HiDPI **ne sera jamais exercée en CI** tant que `deviceScaleFactor` reste à 1, ce
qui rend le test unitaire à `dpr: 3` non optionnel. À l'inverse, le PM signale n'avoir **pas relu les
fichiers sources** : les numéros de ligne et valeurs mesurées inscrits dans les 3 issues viennent des
artefacts du sprint, non revérifiés par lui.

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
**Note sur les issues de suivi :** #446 porte un critère d'acceptation **ajouté par le
project-manager** sur `.mt-sheet` / `.mt-actionsheet` — ils portent le même token `--z-modal`, donc
le bug peut se rejouer sur deux autres surfaces ; à corriger ou à démontrer hors risque. #448 note
que la correction HiDPI **ne sera jamais exercée en CI** tant que `deviceScaleFactor` reste à 1, ce
qui rend le test unitaire à `dpr: 3` non optionnel. À l'inverse, le PM signale n'avoir **pas relu les
fichiers sources** : les numéros de ligne et valeurs mesurées inscrits dans les 3 issues viennent des
artefacts du sprint, non revérifiés par lui.

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
**Note sur les issues de suivi :** #446 porte un critère d'acceptation **ajouté par le
project-manager** sur `.mt-sheet` / `.mt-actionsheet` — ils portent le même token `--z-modal`, donc
le bug peut se rejouer sur deux autres surfaces ; à corriger ou à démontrer hors risque. #448 note
que la correction HiDPI **ne sera jamais exercée en CI** tant que `deviceScaleFactor` reste à 1, ce
qui rend le test unitaire à `dpr: 3` non optionnel. À l'inverse, le PM signale n'avoir **pas relu les
fichiers sources** : les numéros de ligne et valeurs mesurées inscrits dans les 3 issues viennent des
artefacts du sprint, non revérifiés par lui.

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
**Note sur les issues de suivi :** #446 porte un critère d'acceptation **ajouté par le
project-manager** sur `.mt-sheet` / `.mt-actionsheet` — ils portent le même token `--z-modal`, donc
le bug peut se rejouer sur deux autres surfaces ; à corriger ou à démontrer hors risque. #448 note
que la correction HiDPI **ne sera jamais exercée en CI** tant que `deviceScaleFactor` reste à 1, ce
qui rend le test unitaire à `dpr: 3` non optionnel. À l'inverse, le PM signale n'avoir **pas relu les
fichiers sources** : les numéros de ligne et valeurs mesurées inscrits dans les 3 issues viennent des
artefacts du sprint, non revérifiés par lui.

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
**Note sur les issues de suivi :** #446 porte un critère d'acceptation **ajouté par le
project-manager** sur `.mt-sheet` / `.mt-actionsheet` — ils portent le même token `--z-modal`, donc
le bug peut se rejouer sur deux autres surfaces ; à corriger ou à démontrer hors risque. #448 note
que la correction HiDPI **ne sera jamais exercée en CI** tant que `deviceScaleFactor` reste à 1, ce
qui rend le test unitaire à `dpr: 3` non optionnel. À l'inverse, le PM signale n'avoir **pas relu les
fichiers sources** : les numéros de ligne et valeurs mesurées inscrits dans les 3 issues viennent des
artefacts du sprint, non revérifiés par lui.

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
**Note sur les issues de suivi :** #446 porte un critère d'acceptation **ajouté par le
project-manager** sur `.mt-sheet` / `.mt-actionsheet` — ils portent le même token `--z-modal`, donc
le bug peut se rejouer sur deux autres surfaces ; à corriger ou à démontrer hors risque. #448 note
que la correction HiDPI **ne sera jamais exercée en CI** tant que `deviceScaleFactor` reste à 1, ce
qui rend le test unitaire à `dpr: 3` non optionnel. À l'inverse, le PM signale n'avoir **pas relu les
fichiers sources** : les numéros de ligne et valeurs mesurées inscrits dans les 3 issues viennent des
artefacts du sprint, non revérifiés par lui.

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
**Note sur les issues de suivi :** #446 porte un critère d'acceptation **ajouté par le
project-manager** sur `.mt-sheet` / `.mt-actionsheet` — ils portent le même token `--z-modal`, donc
le bug peut se rejouer sur deux autres surfaces ; à corriger ou à démontrer hors risque. #448 note
que la correction HiDPI **ne sera jamais exercée en CI** tant que `deviceScaleFactor` reste à 1, ce
qui rend le test unitaire à `dpr: 3` non optionnel. À l'inverse, le PM signale n'avoir **pas relu les
fichiers sources** : les numéros de ligne et valeurs mesurées inscrits dans les 3 issues viennent des
artefacts du sprint, non revérifiés par lui.

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
**Note sur les issues de suivi :** #446 porte un critère d'acceptation **ajouté par le
project-manager** sur `.mt-sheet` / `.mt-actionsheet` — ils portent le même token `--z-modal`, donc
le bug peut se rejouer sur deux autres surfaces ; à corriger ou à démontrer hors risque. #448 note
que la correction HiDPI **ne sera jamais exercée en CI** tant que `deviceScaleFactor` reste à 1, ce
qui rend le test unitaire à `dpr: 3` non optionnel. À l'inverse, le PM signale n'avoir **pas relu les
fichiers sources** : les numéros de ligne et valeurs mesurées inscrits dans les 3 issues viennent des
artefacts du sprint, non revérifiés par lui.

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
**Note sur les issues de suivi :** #446 porte un critère d'acceptation **ajouté par le
project-manager** sur `.mt-sheet` / `.mt-actionsheet` — ils portent le même token `--z-modal`, donc
le bug peut se rejouer sur deux autres surfaces ; à corriger ou à démontrer hors risque. #448 note
que la correction HiDPI **ne sera jamais exercée en CI** tant que `deviceScaleFactor` reste à 1, ce
qui rend le test unitaire à `dpr: 3` non optionnel. À l'inverse, le PM signale n'avoir **pas relu les
fichiers sources** : les numéros de ligne et valeurs mesurées inscrits dans les 3 issues viennent des
artefacts du sprint, non revérifiés par lui.

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
**Note sur les issues de suivi :** #446 porte un critère d'acceptation **ajouté par le
project-manager** sur `.mt-sheet` / `.mt-actionsheet` — ils portent le même token `--z-modal`, donc
le bug peut se rejouer sur deux autres surfaces ; à corriger ou à démontrer hors risque. #448 note
que la correction HiDPI **ne sera jamais exercée en CI** tant que `deviceScaleFactor` reste à 1, ce
qui rend le test unitaire à `dpr: 3` non optionnel. À l'inverse, le PM signale n'avoir **pas relu les
fichiers sources** : les numéros de ligne et valeurs mesurées inscrits dans les 3 issues viennent des
artefacts du sprint, non revérifiés par lui.

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
**Note sur les issues de suivi :** #446 porte un critère d'acceptation **ajouté par le
project-manager** sur `.mt-sheet` / `.mt-actionsheet` — ils portent le même token `--z-modal`, donc
le bug peut se rejouer sur deux autres surfaces ; à corriger ou à démontrer hors risque. #448 note
que la correction HiDPI **ne sera jamais exercée en CI** tant que `deviceScaleFactor` reste à 1, ce
qui rend le test unitaire à `dpr: 3` non optionnel. À l'inverse, le PM signale n'avoir **pas relu les
fichiers sources** : les numéros de ligne et valeurs mesurées inscrits dans les 3 issues viennent des
artefacts du sprint, non revérifiés par lui.

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
**Note sur les issues de suivi :** #446 porte un critère d'acceptation **ajouté par le
project-manager** sur `.mt-sheet` / `.mt-actionsheet` — ils portent le même token `--z-modal`, donc
le bug peut se rejouer sur deux autres surfaces ; à corriger ou à démontrer hors risque. #448 note
que la correction HiDPI **ne sera jamais exercée en CI** tant que `deviceScaleFactor` reste à 1, ce
qui rend le test unitaire à `dpr: 3` non optionnel. À l'inverse, le PM signale n'avoir **pas relu les
fichiers sources** : les numéros de ligne et valeurs mesurées inscrits dans les 3 issues viennent des
artefacts du sprint, non revérifiés par lui.

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
**Note sur les issues de suivi :** #446 porte un critère d'acceptation **ajouté par le
project-manager** sur `.mt-sheet` / `.mt-actionsheet` — ils portent le même token `--z-modal`, donc
le bug peut se rejouer sur deux autres surfaces ; à corriger ou à démontrer hors risque. #448 note
que la correction HiDPI **ne sera jamais exercée en CI** tant que `deviceScaleFactor` reste à 1, ce
qui rend le test unitaire à `dpr: 3` non optionnel. À l'inverse, le PM signale n'avoir **pas relu les
fichiers sources** : les numéros de ligne et valeurs mesurées inscrits dans les 3 issues viennent des
artefacts du sprint, non revérifiés par lui.

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
**Note sur les issues de suivi :** #446 porte un critère d'acceptation **ajouté par le
project-manager** sur `.mt-sheet` / `.mt-actionsheet` — ils portent le même token `--z-modal`, donc
le bug peut se rejouer sur deux autres surfaces ; à corriger ou à démontrer hors risque. #448 note
que la correction HiDPI **ne sera jamais exercée en CI** tant que `deviceScaleFactor` reste à 1, ce
qui rend le test unitaire à `dpr: 3` non optionnel. À l'inverse, le PM signale n'avoir **pas relu les
fichiers sources** : les numéros de ligne et valeurs mesurées inscrits dans les 3 issues viennent des
artefacts du sprint, non revérifiés par lui.

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
**Note sur les issues de suivi :** #446 porte un critère d'acceptation **ajouté par le
project-manager** sur `.mt-sheet` / `.mt-actionsheet` — ils portent le même token `--z-modal`, donc
le bug peut se rejouer sur deux autres surfaces ; à corriger ou à démontrer hors risque. #448 note
que la correction HiDPI **ne sera jamais exercée en CI** tant que `deviceScaleFactor` reste à 1, ce
qui rend le test unitaire à `dpr: 3` non optionnel. À l'inverse, le PM signale n'avoir **pas relu les
fichiers sources** : les numéros de ligne et valeurs mesurées inscrits dans les 3 issues viennent des
artefacts du sprint, non revérifiés par lui.

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
**Note sur les issues de suivi :** #446 porte un critère d'acceptation **ajouté par le
project-manager** sur `.mt-sheet` / `.mt-actionsheet` — ils portent le même token `--z-modal`, donc
le bug peut se rejouer sur deux autres surfaces ; à corriger ou à démontrer hors risque. #448 note
que la correction HiDPI **ne sera jamais exercée en CI** tant que `deviceScaleFactor` reste à 1, ce
qui rend le test unitaire à `dpr: 3` non optionnel. À l'inverse, le PM signale n'avoir **pas relu les
fichiers sources** : les numéros de ligne et valeurs mesurées inscrits dans les 3 issues viennent des
artefacts du sprint, non revérifiés par lui.

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
**Note sur les issues de suivi :** #446 porte un critère d'acceptation **ajouté par le
project-manager** sur `.mt-sheet` / `.mt-actionsheet` — ils portent le même token `--z-modal`, donc
le bug peut se rejouer sur deux autres surfaces ; à corriger ou à démontrer hors risque. #448 note
que la correction HiDPI **ne sera jamais exercée en CI** tant que `deviceScaleFactor` reste à 1, ce
qui rend le test unitaire à `dpr: 3` non optionnel. À l'inverse, le PM signale n'avoir **pas relu les
fichiers sources** : les numéros de ligne et valeurs mesurées inscrits dans les 3 issues viennent des
artefacts du sprint, non revérifiés par lui.

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
**Note sur les issues de suivi :** #446 porte un critère d'acceptation **ajouté par le
project-manager** sur `.mt-sheet` / `.mt-actionsheet` — ils portent le même token `--z-modal`, donc
le bug peut se rejouer sur deux autres surfaces ; à corriger ou à démontrer hors risque. #448 note
que la correction HiDPI **ne sera jamais exercée en CI** tant que `deviceScaleFactor` reste à 1, ce
qui rend le test unitaire à `dpr: 3` non optionnel. À l'inverse, le PM signale n'avoir **pas relu les
fichiers sources** : les numéros de ligne et valeurs mesurées inscrits dans les 3 issues viennent des
artefacts du sprint, non revérifiés par lui.

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
**Note sur les issues de suivi :** #446 porte un critère d'acceptation **ajouté par le
project-manager** sur `.mt-sheet` / `.mt-actionsheet` — ils portent le même token `--z-modal`, donc
le bug peut se rejouer sur deux autres surfaces ; à corriger ou à démontrer hors risque. #448 note
que la correction HiDPI **ne sera jamais exercée en CI** tant que `deviceScaleFactor` reste à 1, ce
qui rend le test unitaire à `dpr: 3` non optionnel. À l'inverse, le PM signale n'avoir **pas relu les
fichiers sources** : les numéros de ligne et valeurs mesurées inscrits dans les 3 issues viennent des
artefacts du sprint, non revérifiés par lui.

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
**Note sur les issues de suivi :** #446 porte un critère d'acceptation **ajouté par le
project-manager** sur `.mt-sheet` / `.mt-actionsheet` — ils portent le même token `--z-modal`, donc
le bug peut se rejouer sur deux autres surfaces ; à corriger ou à démontrer hors risque. #448 note
que la correction HiDPI **ne sera jamais exercée en CI** tant que `deviceScaleFactor` reste à 1, ce
qui rend le test unitaire à `dpr: 3` non optionnel. À l'inverse, le PM signale n'avoir **pas relu les
fichiers sources** : les numéros de ligne et valeurs mesurées inscrits dans les 3 issues viennent des
artefacts du sprint, non revérifiés par lui.

**Status :** Terminé (clôturé 2026-07-12)

## Sprint 36 — 2026-07-12 (Terminé — code livré sur `dev`, clôture jamais faite — cohésion 0.72, Export RGPD hardening)
**Objectif :** Chemin de stockage dédié export + rate-limit GET export + scheduler de purge des exports expirés (index V14).
**Milestone GitHub :** #36
**Issues :** #264, #265, #267
**Vagues :** V1 = #264 (storage) ∥ #265 (rate-limit) | V2 = #267 (purge via port de #264 ; introduit @EnableScheduling)
**Migrations Flyway :** V14 (idx_export_jobs_expires_at)
**Dépend de :** aucune (mais introduit le scheduling réutilisé en S37)
**Status :** **Terminé** — statut rectifié le **2026-08-16**, 35 jours et 23 sprints après coup.

> **Le cas de clôture manquée le plus ancien du dépôt, et le plus trompeur.** L'entrée est restée
> « En cours » depuis le 2026-07-12 ; le **milestone #36 a été fermé VIDE** (`open=0 closed=0` :
> aucune issue n'y a jamais été rattachée) et les issues sont restées ouvertes. Un sprint qui
> semblait à la fois « en cours », « sans issue » et « clos » — les trois signaux se contredisant.
>
> **Vérifié dans le code le 2026-08-16, le travail était bien livré et sur `dev` :**
> - **#264** → `4dd436c` : `app.storage.export-path` présent dans les 3 fichiers de configuration
>   (`application.properties:77`, `-dev:43`, `-prod:58`), placeholder `STORAGE_EXPORT_PATH`.
> - **#267** → `00dc7ca` : `application/services/ExportPurgeScheduler.java` + migration
>   `V14__idx_export_jobs_expires_at.sql`. Ancêtre de `origin/dev` confirmé.
> - **#265** (rate-limit GET export) → **non livrée, report délibéré** : déplacée vers le milestone
>   « Mise en ligne (GELÉ) », elle y reste. Le sprint est donc livré **à 2 issues sur 3**.
>
> #264 et #267 fermées le 2026-08-16 avec l'évidence en commentaire. **Leçon : un milestone fermé
> vide n'est pas un sprint sans travail — c'est un sprint dont personne n'a rattaché les issues.**

### 🔎 Audit global des clôtures — 2026-08-16

Déclenché par la découverte que le **Sprint 56** était mergé depuis 16 jours sans avoir été clôturé.
Le balayage a montré que ce n'était pas un cas isolé : **7 sprints sur 24** portaient un statut
démenti par GitHub. Aucun n'avait de travail manquant — **le code était livré et sur `dev` dans les
7 cas** ; c'est la comptabilité qui n'a pas suivi.

| Sprint | Statut affiché | Réalité vérifiée | Correction |
|---|---|---|---|
| 36 | `En cours` (35 j) | #264 `4dd436c` + #267 `00dc7ca` sur `dev` ; milestone fermé **vide** | statut + **2 issues fermées** |
| 46 | `PLANIFIÉ` | PR #324 mergée le 27/07 ; corps de l'entrée déjà complet | titre seul |
| 48 | `PLANIFIÉ` | PR #333 mergée le 28/07 ; `Status: Terminé` déjà présent plus bas | titre seul |
| 49 | `EN COURS` | PR #345 mergée le 28/07 ; `Status: Terminé` déjà présent plus bas | titre seul |
| 51 | `En cours — PR ouverte` | PR #367 mergée le 29/07 | ligne `Status` |
| 55 | `En cours` | PR #402 mergée le 30/07 | ligne `Status` |
| 58 | `EN COURS` / `PR ouverte` | PR #412 mergée le 31/07 ; milestone fermé | titre + `Status` |

**Piège de méthode rencontré pendant l'audit lui-même :** un balayage sur les seuls titres `## Sprint`
rate les entrées dont le **titre dit « Terminé » mais dont la ligne `**Status :**` dit encore « En
cours »** (cas 51 et 55). Il faut balayer **les deux** marqueurs, séparément.

**5 issues ouvertes étaient par ailleurs parquées dans des milestones fermés** — #151 (S13), #185
(S16), #230 (S26), #279 (S35), #338 (S52). Le rattachement les faisait passer pour livrées et les
masquait des vues de backlog. Toutes **détachées vers le backlog libre** le 2026-08-16, sans
changement de périmètre. Après quoi : **aucun milestone fermé ne contient plus d'issue ouverte.**

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
**Note sur les issues de suivi :** #446 porte un critère d'acceptation **ajouté par le
project-manager** sur `.mt-sheet` / `.mt-actionsheet` — ils portent le même token `--z-modal`, donc
le bug peut se rejouer sur deux autres surfaces ; à corriger ou à démontrer hors risque. #448 note
que la correction HiDPI **ne sera jamais exercée en CI** tant que `deviceScaleFactor` reste à 1, ce
qui rend le test unitaire à `dpr: 3` non optionnel. À l'inverse, le PM signale n'avoir **pas relu les
fichiers sources** : les numéros de ligne et valeurs mesurées inscrits dans les 3 issues viennent des
artefacts du sprint, non revérifiés par lui.

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

## Sprint 39 — 2026-07-13 (Terminé — merge PR #292 dans dev, cohésion 0.30, Lisibilité Landing)
**Objectif :** Corriger la première impression démo (contraste hero landing illisible observé en live + rendu clair/sombre des 4 écrans auth).
**Milestone GitHub :** #39 (fermé après merge)
**Issues :** #146 (livrée + fermée) ; #56 = **slice contraste hero uniquement** — reste du L → backlog, #56 laissée OUVERTE + re-scopée (comment).
**Vagues exécutées :** V1 = #56 ∥ #146 (implémentation parallèle, fichiers disjoints ; **commits sérialisés par le lead** — mitigation pitfall shared-worktree index race [[sprint-parallel-commits-shared-worktree]]).
**Cohésion score :** 0.30 (cross-epic design+auth assumé, démo-first).
**Commits :** 4 — `585e080` #56 (HeroSection + contraste), `0093430` #146 (garde-fous), `cab6b6a` review-fix ('use client'), `fcd0d77`+audit (artefacts/statut).
**Migrations Flyway :** aucune. **BR impactées :** aucune (page marketing + vérif visuelle).
**Reviews :** batch /sprint start (reviewer MERGE_OK + ui-design APPROUVÉ AVEC RÉSERVES + test-runner) puis /review-pr 292 SOLO (MERGE_OK) — 0 CRITIQUE / 0 MAJEUR / 2 MINEURS (1 corrigé `cab6b6a` 'use client' ; 1 pré-existant `<a><Button>` → follow-up #295).
**Tests :** Frontend 429/429 ✅ (+8 garde-fous), 0 erreur TS, 0 stderr. Backend non touché. CI verte (backend/frontend/e2e/security). Contraste WCAG AA vérifié statiquement par 3 sources concordantes (dev/reviewer/ui-design).
**Nouveaux pitfalls / décisions :** PIT-S39-001 (bordures UI Graphite `rule*` < 3:1) ; DEC-S39-001 (`border-ink-muted` pour bordures fonctionnelles outline en attendant `--color-rule-emphasis`).
**Note tooling :** merge effectué HORS /sprint end (dev a lancé « merge » après /review-pr 292, tip `aaf414b`) → /sprint end a consolidé la mémoire a posteriori via PR de clôture `chore/sprint-39-close` (dev protégée : enforce_admins + required checks backend/frontend).
**Résiduel :** contrôle visuel manuel navigateur clair/sombre (#146) non fait ; #146 fermée sur audit statique + garde-fous (choix dev) ; couverture durable → follow-up #294.
**Follow-ups arbitrés (Phase 4 triage — 3 créés + 1 re-scopé, 0 discard) :**
  - Reste du L #56 (décompo 7 sections, anim timeline, footer→légales, dédup routes) [L | design] → **#56 laissée ouverte + re-scopée** (pas de doublon)
  - Token DS `--color-rule-emphasis` pour bordures fonctionnelles AA [S | design] → issue **#293** (backlog)
  - E2E Playwright screenshots clair/sombre hero + 4 écrans auth [S | e2e/design] → issue **#294** (backlog)
  - Nettoyage a11y `<a><Button>` HomePage (header/hero/CTA) [S | frontend/a11y] → issue **#295** (backlog ; absorbable par #56)
**Note sur les issues de suivi :** #446 porte un critère d'acceptation **ajouté par le
project-manager** sur `.mt-sheet` / `.mt-actionsheet` — ils portent le même token `--z-modal`, donc
le bug peut se rejouer sur deux autres surfaces ; à corriger ou à démontrer hors risque. #448 note
que la correction HiDPI **ne sera jamais exercée en CI** tant que `deviceScaleFactor` reste à 1, ce
qui rend le test unitaire à `dpr: 3` non optionnel. À l'inverse, le PM signale n'avoir **pas relu les
fichiers sources** : les numéros de ligne et valeurs mesurées inscrits dans les 3 issues viennent des
artefacts du sprint, non revérifiés par lui.

**Status :** Terminé (clôturé 2026-07-13)

## Sprint 40 — 2026-07-13 → 2026-07-13 (Terminé — merge PR #297 dans dev)
**Objectif :** Fondation navigation — nav latérale persistante 248px (#210) + quick-win bug catégories (#245).
**Milestone GitHub :** #40 (fermé après merge)
**Issues livrées (2) :** #210 (shell applicatif), #245 (invalidation cache catégories)
**Vagues exécutées :** V1 = #210 ∥ #245 (fichiers disjoints, parallèle)
**Cohésion score :** 0.18 (⚠ cross-epic design≠categories, pairing assumé — fichiers disjoints, valeur démo ; dev a validé garder #245)
**Migrations :** aucune (sprint 100 % frontend)
**Commits :** 8 (5 code : 8183d1a #245, f48234a #210 shell, c3b1b9f review-fix produits-sous-shell, 27193ed review-fix garde auth, 9c1ccb6 fix e2e settings-nav ; 3 mémoire/artefacts)
**BR impactées :** aucune (bug fix + layout, hors périmètre règles métier)
**Reviews :**
  - ui-design #210 (pré-implem) : REJET conditionnel (3 blocking : token 248px, wrap nav mobile, tablette) → résolus par le lead avant spawn.
  - Reviewer tour 1 (sprint start) : 1 MAJEUR (nav Produits hors-shell) → RESOLU (c3b1b9f).
  - Reviewer tour 2 (/review-pr indépendant) : 1 MAJEUR (flash de chrome anonyme, garde shell) + 3 MINEUR (cibles tactiles, garde dupliquée, e2e testids) → tous RESOLU (27193ed).
  - CI e2e : 1 régression (settings-navigation cliquait `dashboard-settings-link` devenu `lg:hidden`) → RESOLU (9c1ccb6, cf. PIT-S40-003).
**Tests :** Frontend 446/446 vitest green | E2E CI 26/26 green | Backend inchangé (non touché) | tsc/next build/eslint 0.
**Nouveaux pitfalls / decisions / patterns :** DEC-S40-001 (tablette→mobile, seuil lg) ; PAT-S40-001 (invalidation préfixe query-key), PAT-S40-002 (token layout), PAT-S40-003 (enveloppement shell route-group) ; PIT-S40-001 (.next/types stale post git-mv), PIT-S40-002 (garde auth dans le shell), PIT-S40-003 (E2E desktop cassé par nav consolidée lg:hidden).
**Follow-ups arbitrés (Phase 4 triage — dev : créer les 6) :**
  - Tablette sidebar repliable icon-only [S | frontend] → issue #298 (backlog)
  - Intégrer settings/ sous le shell [S | frontend] → issue #299 (backlog)
  - Flux création événement réel drawer 452px [M | events] → issue #300 (Sprint 41)
  - Écran frise/timeline complet [L | events] → issue #301 (Sprint 41)
  - Garde serveur middleware routes (app) [M | auth] → issue #302 (Sprint 41)
  - `.eslintcache` tracké [XS | infra] → doublon détecté, issue existante #262 (pas de création)
**Saturation contexte lead (mesure) :** non instrumentée cette session (orchestration + 2 tours review + CI dans une seule session lead).
**Note sur les issues de suivi :** #446 porte un critère d'acceptation **ajouté par le
project-manager** sur `.mt-sheet` / `.mt-actionsheet` — ils portent le même token `--z-modal`, donc
le bug peut se rejouer sur deux autres surfaces ; à corriger ou à démontrer hors risque. #448 note
que la correction HiDPI **ne sera jamais exercée en CI** tant que `deviceScaleFactor` reste à 1, ce
qui rend le test unitaire à `dpr: 3` non optionnel. À l'inverse, le PM signale n'avoir **pas relu les
fichiers sources** : les numéros de ligne et valeurs mesurées inscrits dans les 3 issues viennent des
artefacts du sprint, non revérifiés par lui.

**Status :** Terminé.

## Sprint 41 — 2026-07-13 (Terminé — merge PR #303 dans dev)
**Objectif :** UX timeline (accordéon collapse par produit) + a11y (cibles tactiles, aria, clavier).
**Milestone GitHub :** #41 (fermé après merge)
**Issues livrées (4) :** #195, #226, #227, #228
**Vagues exécutées :** V1 = #226 ∥ #228 (parallèles, fichiers disjoints) | V2 = #195 → #227
**Cohésion score :** 0.66 (epic:events)
**Commits :** 8 (4 issues + fix review MAJEUR `8de39ce` + 3 docs/CI : `0f0decc`, `bf30779`, `a6385f2`)
**BR impactées :** aucune BR métier nouvelle (complète l'affichage timeline BR-EVE, #55)
**Migrations :** aucune
**Dépend de :** aucune (S40 shell recommandé, non bloquant)
**Reviews :** 2 passes (batch sprint + `/review-pr 303`) — 1 MAJEUR (hitbox `::before` clippée par `overflow:hidden`) + 3 MINEUR (ellipsis flex `min-width:0`, commentaire aria, chevron size) — **tous RÉSOLUS**. #227 : option B actée (aide hover-only, `?` retiré du référentiel).
**Tests :** Frontend 456/456 vert | Backend non impacté | E2E CI vert (mais `timeline-resource-head` sans spec dédiée → #304)
**CI :** 1 échec `frontend` rattrapé — `next build` (ESLint `no-unused-vars` sur var `user` inutilisée dans un test `fireEvent`) invisible à vitest → fix `a6385f2` (cf. [[PIT-S41-005]]).
**Nouveaux pitfalls / patterns / décisions :** PIT-S41-001..005, PAT-S41-001/002, DEC-S41-001.
**Follow-ups arbitrés (Phase 4 triage) :**
  - Couverture E2E accordéon produit `timeline-resource-head` [S | events] → **issue #304** (backlog libre)
  - Hygiène milestone : #300/#301/#302 (parqués S40, non exécutés) → détachés du milestone 41 (retour backlog)
**Note sur les issues de suivi :** #446 porte un critère d'acceptation **ajouté par le
project-manager** sur `.mt-sheet` / `.mt-actionsheet` — ils portent le même token `--z-modal`, donc
le bug peut se rejouer sur deux autres surfaces ; à corriger ou à démontrer hors risque. #448 note
que la correction HiDPI **ne sera jamais exercée en CI** tant que `deviceScaleFactor` reste à 1, ce
qui rend le test unitaire à `dpr: 3` non optionnel. À l'inverse, le PM signale n'avoir **pas relu les
fichiers sources** : les numéros de ligne et valeurs mesurées inscrits dans les 3 issues viennent des
artefacts du sprint, non revérifiés par lui.

**Status :** Terminé.

## Sprint 42 — 2026-07-13 → 2026-07-14 (Terminé — merge PR #306 dans dev)
**Objectif :** Modale de conflit comparative sur 409 optimistic-lock (corps backend enrichi + diff serveur/local) + édition d'event réellement atteignable + E2E.
**Milestone GitHub :** #42 (fermé après merge)
**Branche :** `sprint/42` (depuis origin/dev @ 1a87d6f) → PR **#306** → dev.
**Issues livrées (2) :** #231 (modale 409 comparative), #232 (E2E conflit + archived).
**Vagues exécutées :** V1 = #231 `0bc144f` | V2 = #232 `fcbf64e` (specs) | V3 = ABSORPTION A+B `2dd42ab`/`a5caa56`/`c1a8963` | fixes review `cd29644` + e2e `e54b5ea`/`f00940b` + review-pr `10291f4`/`dbf12eb`/`54f9d61`.
**Cohésion :** 0.60 | **Migrations :** aucune | **Dépend de :** aucune | **Précède S43**.
**Commits :** 11 (décomposés par issue/vague/fix).
**BR impactées :** BR-EVE-015 (409 optimistic-lock, contrat enrichi + désormais déclenchable via API), BR-EVE-013 (archived).
**⚠ BLOCKER découvert V2 (vérifié, corrigé) :** prémisse cassée — (A) surface d'édition orpheline (régression S17, timeline routée en lecture seule) ; (B) 409 jamais déclenchable via UI (pas de `version`, update-in-place managed). #231 livrait du code mort côté UI → **sprint étendu** (absorption A+B) pour rendre la feature réelle. Détail : `sprints/sprint-42/BLOCKER-premise-broken.md`.
**Sécurité :** audit #231 = **SÛR** (ownership avant sérialisation, `serverEvent` sans champ interne, pas d'oracle 409 cross-owner) — re-confirmé en review. `sprints/sprint-42/security-audit-231.md`.
**Reviews :** batch mid-sprint (1 MAJEUR duplication, RÉSOLU) + `/review-pr #306` TEAM (backend+e2e PRÊT MERGE ; frontend 8 findings dont 1 régression `cd29644` d'échec silencieux couleur — TOUS RÉSOLU `10291f4`/`dbf12eb`/`54f9d61`). Détail : `sprints/sprint-42/review-batch.md`.
**Tests :** Backend 404/404 vert | Frontend 463 vert (1 échec dep-locale `eslint-plugin-storybook` isolé, vert CI) | **E2E 3 specs vertes en CI** (non exécutable local — cf. [[mytimeline-e2e-ci-only-gate]], 3 itérations de fix spec). Parcours CI : `sprints/sprint-42/e2e-ci-journey.md`.
**Nouveaux pitfalls/patterns/décisions/bugs :** PIT-S42-001/002/003, PAT-S42-001/002, DEC-S42-001/002, BUG-S42-001/002.
**Follow-ups arbitrés (Phase 4 triage) :**
  - Event archivé non réouvrable/désarchivable via UI (décision produit) [M | events] → **issue #307** (backlog)
  - Dep `eslint-plugin-storybook` locale (test rouge) [S | infra] → **issue #308** (backlog)
  - Mobile `onDeleteEvent` non câblé [XS | timeline] → **issue #309** (backlog)
  - Rate-limit retry `onKeepMine` [XS | backend] → **issue #310** (backlog)
  - Vrai race concurrent commit→catch→refetch non couvert e2e [XS] → consigné (déterministe couvert ; race réel = intégration + filet Hibernate)
  - Revue mainteneur freeze-list ArchUnit `EventMapper→getVersion` [XS] → consigné
**Note sur les issues de suivi :** #446 porte un critère d'acceptation **ajouté par le
project-manager** sur `.mt-sheet` / `.mt-actionsheet` — ils portent le même token `--z-modal`, donc
le bug peut se rejouer sur deux autres surfaces ; à corriger ou à démontrer hors risque. #448 note
que la correction HiDPI **ne sera jamais exercée en CI** tant que `deviceScaleFactor` reste à 1, ce
qui rend le test unitaire à `dpr: 3` non optionnel. À l'inverse, le PM signale n'avoir **pas relu les
fichiers sources** : les numéros de ligne et valeurs mesurées inscrits dans les 3 issues viennent des
artefacts du sprint, non revérifiés par lui.

**Status :** Terminé.

## Sprint 43 — 2026-07-14 → 2026-07-16 (Terminé — merge PR #311 dans dev)
**Objectif :** Solder la dette contrat d'erreur / hygiène auth S37-S38 (follow-ups #288/#290/#289/#286/#285).
**Milestone GitHub :** #43 (fermé après merge)
**Branche :** `claude/sprint-43-start-3ee192` (depuis origin/dev @ be9f6b4) → PR **#311** → dev. Branche distante `sprint/43` créée au start mais NON utilisée (vide) — supprimée à la clôture.
**Issues livrées (5) :** #285, #286, #288, #289, #290
**Vagues exécutées :** V1 = #286 ∥ #285 ∥ #289 | V2 = #288 → #290 (enum ErrorCode + buildBody partagés)
**Cohésion score :** 0.70 (epic:auth dominant)
**Commits :** 8 (b3d5555 #285, a541617 #286, cde2d76 #289, 863b866 #288, a9fe3bd #290, f0d033c doc invariant review, 30fe8e6 artefacts, + clôture)
**BR impactées :** BR-AUT-008 **étendue** (anti-énumération /me : user-absent → 401 générique, aligné /refresh #113) ; contrat d'erreur homogénéisé (`error`=code ErrorCode niveau statut, texte→`message`) sur AuthController + 11 handlers plats du GlobalExceptionHandler, sémantique BR-CAT/BR-EVE inchangée ; anti-TOCTOU #143 préservé ; 409 enrichi EventConflict (#231/S42) NON migré, verrouillé par test de non-régression.
**Migrations :** aucune
**Dépend de :** S42 (409 enrichi #231 respecté par #290)
**Reviews :** batch reviewer + security-expert — **0 CRITIQUE / 0 MAJEUR**, 2 MINEURS (fail-fast `markConsumed` → documenté comme assertion d'invariant, f0d033c ; dérive doc /me → RAS). Audit sécurité : /me zéro canal d'énumération (statut + body identiques).
**Tests :** Backend **411/411 vert** (suite complète, pool Hikari=2 sans deadlock ni « too many clients ») | Frontend non impacté (0 fichier) | E2E N/A (backend-only, aucun data-testid nouveau). Audit : `audits/sprint-43-test-coverage.md`.
**CI :** 4/4 verts (backend, frontend, e2e, security) sur la PR #311.
**Nouveaux pitfalls / patterns / décisions :** PAT-S43-001 (preuve no-SELECT via Statistics Hibernate), PAT-S43-002 (migration handlers plats → buildBody, exception corps enrichi), DEC-S43-001 (ErrorCode AuthController) ; BR-AUT-008 étendue dans `br-auth.md`.
**Follow-ups arbitrés (Phase 4 triage) :**
  - `SignatureException` sur /me → 500 au lieu de 401 (catch JwtException manquant) [XS | auth] → **issue #312** (backlog libre)
  - `coverage-auth.md` périmé (« refresh non implémenté », « E2E aucun ») [XS | doc] → **absorbé** (réécriture complète dans le commit de clôture : 123 tests backend / 50 frontend / E2E réels)
**Note sur les issues de suivi :** #446 porte un critère d'acceptation **ajouté par le
project-manager** sur `.mt-sheet` / `.mt-actionsheet` — ils portent le même token `--z-modal`, donc
le bug peut se rejouer sur deux autres surfaces ; à corriger ou à démontrer hors risque. #448 note
que la correction HiDPI **ne sera jamais exercée en CI** tant que `deviceScaleFactor` reste à 1, ce
qui rend le test unitaire à `dpr: 3` non optionnel. À l'inverse, le PM signale n'avoir **pas relu les
fichiers sources** : les numéros de ligne et valeurs mesurées inscrits dans les 3 issues viennent des
artefacts du sprint, non revérifiés par lui.

**Status :** Terminé.

> **Plan S39–S43 généré le 2026-07-13** (`/ai-env:sprint plan 5`, cohésion moyenne **0.49**). Fil directeur = **démo-first** (recadrage dev : « loin de la prod, jamais lancé avant aujourd'hui ») : lisibilité landing (S39) → shell nav (S40) → UX/a11y timeline (S41) → modale conflit 409 (S42) → auth cleanup (S43). **Contexte déclencheur :** premier lancement live du site le 2026-07-13 (docker compose) — ça boote, parcours cœur OK end-to-end, un seul bug réel trouvé (event type invalide → 401) corrigé via PR #291. **Phase 0.5 :** helper check-issue-state bruyant sur ce repo (faux positif #245 = commit de clôture sprint) ; ancrage code architecte fiable — #227 seul partiellement fait (tooltip existe). **Migrations :** AUCUNE sur les 5 sprints (plage V16 réservée, non consommée). **[MEMORY:decision] Hardening prod reporté** (11 issues : #212/#102/#251/#266/#270/#182/#242/#248/#115/#250/#255/#213/#256/#84/#88) — durcissement prématuré avant démo fonctionnelle. **[MEMORY:decision] Dérive doc :** schéma réel V15, prochaine migration **V16** (CLAUDE.md dit à tort V13/V14) — à corriger. **Cohésion faible assumée S39/S40** (cross-epic démo) ; S41/S42/S43 mono-epic solides.

## Sprint 44 — 2026-07-16 (Terminé — merge PR #313 dans dev — cohésion 0.58, Boucle démo frise + création d'événement)
**Objectif :** Rendre la boucle cœur démontrable : écran `/timeline` réel (#301, remplace le placeholder S40) + flux de création d'événement drawer 452px (#300, remplace le Dialog minimal).
**Milestone GitHub :** #44
**Branche :** `claude/sprint-44-start-7b5814` (worktree, depuis origin/dev @ e6d9c3a) — pas de branche `sprint/44` (leçon S43 : branche jamais utilisée).
**Issues :** #301 (P0/L), #300 (P1/M) — 12 points (> cible 10, assumé ; fallback : #300 glisse en S45 si #301 dérape).
**Vagues :** V1 = #301 seul → V2 = #300 seul (SÉQUENTIEL strict — conflit `AppShell.tsx` + zone timeline/events).
**Migrations :** aucune (POST /api/events existe déjà ; plage V16 non consommée).
**Dépend de :** S42 (TimelineEditHost/TimelineResponsive) + S40 (shell) — tous mergés. S43 mergé (PR #311).
**Écartées (plan) :** #302/#283 (lot auth → candidats S45), #307 (bloquée décision produit Option A/B), #69 (virtualisation après stabilisation /timeline ; doublon #196 fermé).
**Vagues exécutées :** V1 = #301 (`62558b6`) | V2 = #300 (`de5e147`) | fix revue a11y (`96c9854`).
**Commits :** 4 (2 issues + 1 fix revue + artefacts).
**BR impactées :** BR-EVE-014 (répercussion FRONT de `color` au create — dette #150 soldée sur ce chemin), BR-EVE-013 (`archived` non exposé au create), BR-EVE-002/006 (productId requis, récurrence conditionnelle), BR-EVE-011 (archivés exclus de la frise). Aucune BR backend modifiée (sprint frontend-only).
**Designer :** ui-design REJET initial sur #300 (6 écarts vs handoff §6) → 6 corrections intégrées au briefing V2, toutes appliquées et vérifiées (`sprints/sprint-44/ui-design-300.md`).
**Reviews :** 2 passes.
  1. **Batch mid-sprint** — 0 CRITIQUE / 0 MAJEUR, 2 MINEURS (double annonce spinner → fix `96c9854` ; `mt-drawer__subtitle` → accepté). ⚠ Numéros de ligne non fiables (1127/1146 pour un fichier de 232 l.). Détail : `sprints/sprint-44/review-batch.md`.
  2. **`/review-pr 313` (TEAM : reviewer + ui-design, sans ancrage sur la passe 1)** — **1 CRITIQUE / 1 MAJEUR / 1 MINEUR, tous CORRIGÉS** (`d438baa`). Détail : `sprints/sprint-44/review-pr-313.md`.
     - **CRITIQUE** (trouvé indépendamment par le lead ET le front-reviewer ; manqué par la passe 1, ui-design et le subagent auteur) : `AppShell` montait le drawer INCONDITIONNELLEMENT → `if (!open) return null` ne démonte pas → `productId`/erreur produit/état mutation survivaient ⇒ **erreur d'une session abandonnée réaffichée à la réouverture**. Prouvé par une repro (3/3 en échec) avant correction. Fix = montage conditionnel + test verrouillant le contrat de montage. Cf. [[PIT-S44-003]].
     - **MAJEUR (auto-régression du lead)** : le fix `96c9854` avait copié la moitié du pattern `ExportDataFlow` → spinner `aria-hidden` **sans** live-region sur le wrapper ⇒ chargement MUET pour lecteurs d'écran, pire que la double annonce. Fix = `role=status`+`aria-live`. Cf. [[PIT-S44-004]].
     - **MINEUR** : `superRefine` BR-EVE-006 jamais exécuté (schéma jamais parsé) affichant une garde imaginaire ; le `.parse()` « correctif » aurait créé un submit silencieux → refine retiré, portée documentée. Cf. [[PIT-S44-005]].
     - `mt-drawer__subtitle` : signalé par les 2 passes indépendamment ⇒ finalement corrigé (`.mt-sheet__subtitle`, CSS créé avant de conditionner le JSX).
     - ui-design : **CONFORME** — 6/6 corrections du REJET vérifiées sur le code.
**Tests :** Frontend **497/497 vert** (477 après #301 → 496 avec #300 → +1 non-régression montage drawer, revue PR) | `tsc --noEmit` OK | `eslint` OK (garde PIT-S41-005) | Backend non exécuté (0 fichier touché — CI couvre) | E2E gate CI. Audit : `audits/sprint-44-test-coverage.md`.
**⚠ Phase 8 COVERAGE-E2E MAJEUR assumé :** 11 testids réellement nouveaux sans spec (8× `shell-new-event-drawer-*`, 3× `timeline-*`). Distinction faite avec 4 testids `event-form-*` seulement DÉPLACÉS par le refactor `mode` (gap antérieur au sprint). Plan `/create-e2e` post-merge, follow-up ouvert.
**Nouveaux pitfalls / patterns / décisions / bugs :** PIT-S44-001 (durée requise même en `single`), PIT-S44-002 (absence de `@Valid` imbriqué = structurelle, faux positif désamorcé), PIT-S44-003 (`return null` ≠ démontage), PIT-S44-004 (pattern a11y copié à moitié), PIT-S44-005 (schéma Zod jamais parsé), PAT-S44-001, BUG-S44-001, DEC-S44-001/002/003.
**Enseignement process :** la 2e passe (`/review-pr`) a de nouveau trouvé ce que la review batch avait manqué — **dont une régression introduite par le fix de la review batch elle-même** (2e occurrence après S42, cf. BUG-S42-001). Le double passage batch → `/review-pr` n'est pas redondant. Deux réflexes qui ont payé : ne PAS communiquer les findings de la passe 1 aux reviewers de la passe 2 (anti-ancrage → convergence indépendante sur le CRITIQUE), et **prouver un bug par une repro avant de le corriger** (les 3 assertions échouaient ; la suite était verte car les tests remontent toujours un composant frais).
**Incident :** subagent #301 tué par limite de session API (reset 14h) AVANT commit — travail retrouvé intact dans le working tree, vérifié/nettoyé/commité par le lead. 2 parasites nettoyés : arborescence fantôme `frontend/docs/` (dérive cwd subagent, cf. [[sprint-subagent-worktree-cwd]]) + `.eslintcache` supprimé par le run de lint (churn #262). Briefing V2 durci en conséquence (cd absolu, consigne de commit avant limite).
**Milestone GitHub :** #44 (fermé après merge)
**Absorbé en cours :** 1 — note PIT-S44-001 ajoutée à `br-events.md` (BR-EVE-003) : le pack briefe les futurs agents, sans elle le prochain retombe sur le même 400 (durée requise même en `single`) + garde-fou anti-« correction » du `@Valid` imbriqué (PIT-S44-002).
**Follow-ups arbitrés (Phase 4 triage) :**
  - Spec E2E des 11 testids nouveaux (8× drawer + 3× timeline) [S | events] → **issue #314** (backlog libre) — à rapprocher de #304 (E2E accordéon timeline, même écran) pour n'écrire qu'une passe
  - Aperçu live mini-frise conforme handoff §6 (ruler/TODAY/fantôme/légende) [M | events/design] → **issue #315** (backlog libre) — matérialise l'écart assumé DEC-S44-002
  - `EventDrawer` : consommer `useFocusTrap` au lieu du focus-trap inline dupliqué [XS | timeline] → **issue #316** (backlog libre)
  - Documenter PIT-S44-001 dans `br-events.md` [XS | events] → **absorbé** (cf. ci-dessus)
  - **Déduplication** : les 2 signaux E2E (#300 « 8 testids drawer + 4 timeline » et #301 « 4 testids timeline ») portaient sur le même sujet → fusionnés en une seule issue #314. 0 discard.
**Non retenu délibérément (piège documenté, PAS une issue) :** le « 400 probable sur la création couplée produit » signalé par un subagent est un **faux positif vérifié** — `ProductCreationRequest.events` n'a pas de `@Valid`, donc pas de cascade. Ajouter ce `@Valid` **casserait** le parcours (`productId` `@NotNull` insatisfiable sur un event imbriqué). Créer une issue aurait envoyé le prochain dev dans le mur → consigné en PIT-S44-002 + dans le pack.
**Note sur les issues de suivi :** #446 porte un critère d'acceptation **ajouté par le
project-manager** sur `.mt-sheet` / `.mt-actionsheet` — ils portent le même token `--z-modal`, donc
le bug peut se rejouer sur deux autres surfaces ; à corriger ou à démontrer hors risque. #448 note
que la correction HiDPI **ne sera jamais exercée en CI** tant que `deviceScaleFactor` reste à 1, ce
qui rend le test unitaire à `dpr: 3` non optionnel. À l'inverse, le PM signale n'avoir **pas relu les
fichiers sources** : les numéros de ligne et valeurs mesurées inscrits dans les 3 issues viennent des
artefacts du sprint, non revérifiés par lui.

**Status :** Terminé.

## Sprint 45 — 2026-07-16 → 2026-07-27 (Terminé — merge PR #317 dans dev)
**Objectif :** Fermer le lot auth nommé par le plan S44 : garde serveur des routes connectées (#302) + découpler le canal de capture du token de reset en E2E (#283) et couvrir ses cas d'échec (#284).
**Milestone GitHub :** #45 (fermé après merge)
**Issues livrées (3) :** #302 (P1/M), #283 (P1/M), #284 (P2/S) — 10 points
**Vagues exécutées :** V1 = #302 ∥ #283 (fichiers disjoints) | V2 = #284 (consomme le canal livré par #283)
**Cohésion score :** 0.57
**Commits :** 22 (3 issues + 9 correctifs sécurité/review + 1 correctif régression CI + 1 correctif deps + artefacts)
**Migrations Flyway :** aucune
**BR impactées :** BR-AUT-005, BR-AUT-007, BR-AUT-011, BR-AUT-012
**ADR produits :** `ADR-004-garde-serveur-middleware` (#302), `ADR-005-canal-token-reset-e2e` (#283)
**Mini-plans :** `docs/memory/sprints/sprint-45/architect-plans.md`
**Audit tests :** `docs/memory/audits/sprint-45-test-coverage.md`

**Reviews :** security-expert — 3 MAJEUR / 3 MINEUR (tous RÉSOLU) · reviewer batch — 2 MAJEUR / 6 MINEUR (tous RÉSOLU) · `/review-pr 317` — 1 CRITIQUE / 1 MAJEUR (tous RÉSOLU)
**Tests :** Backend 433/433 · Frontend 564/564 · E2E CI 49 passed / 1 skipped · CI 4/4 verte

**L'ADR bloquant du plan a été tranché** : le job CI e2e tournait bien en `SPRING_PROFILES_ACTIVE=dev` (vérifié) → profils **additifs** `dev,e2e` (cf. [[DEC-S45-002]]).

**⚠ Fait marquant — la vérification locale a menti deux fois :**
1. **Trou du matcher** (#302) : 4 passes nécessaires. Les 3 premières raisonnaient SUR la regex ; la 4e l'a **compilée avec le `path-to-regexp` de Next** et a révélé 2 familles de contournement encore ouvertes. Cf. [[PIT-S45-002]].
2. **Régression 500** (#302) : la garde renvoyait 500 sur **100 % des routes protégées** avec `next build`, `tsc`, eslint et 33 tests unitaires VERTS. Trouvée uniquement par le **premier run CI e2e**. Cf. [[BUG-S45-001]], [[PIT-S45-001]].
→ Leçon consolidée en [[PAT-S45-003]] : tester contre le module RÉEL du framework, et prouver un test anti-régression par revert.

**Sécurité dépendances (hors périmètre initial, absorbé pour débloquer le merge) :** 19 HIGH → 0 en production (postcss 8.5.23, sharp 0.35.3 via override npm, next 15.5.22). 9 HIGH dev-only restantes, incorrigibles en aval (chaîne eslint → `brace-expansion`) → gate CI scindé (cf. [[DEC-S45-004]]).

**Nouveaux pitfalls :** PIT-S45-001..009 · **patterns :** PAT-S45-001..004 · **décisions :** DEC-S45-001..004 · **bugs :** BUG-S45-001

**Follow-ups arbitrés (Phase 4 triage — 7 items, tous tracés) :**
  - Synchroniser `PROTECTED_APP_SEGMENTS` avec l'arborescence des routes [S | auth] → issue #318 (Sprint 46)
  - Refusionner le gate CI `security` quand `@eslint/eslintrc` → `minimatch@10` [S | infra] → issue #319 (Sprint 46)
  - Statuer sur `RATE_LIMIT_ENABLED=false` dans le job CI e2e [S | infra] → issue #320 (Sprint 46)
  - Règle ArchUnit ciblée sur `@RestController` plutôt que sur le package [S | backend] → issue #321 (Sprint 46)
  - Durcir le risque résiduel d'en-tête `Host` (allow-list / Host canonique) [M | auth] → issue #322 (Sprint 46)
  - JWT asymétrique RS256 pour vérification en Edge [M | auth] → issue #323 (Sprint 46)
  - `frontend/.eslintcache` tracké [XS | infra] → **doublon : issue #262 existait déjà depuis le 2026-07-11 (Sprint 31)**, jamais traitée ; milestone Sprint 46 attaché plutôt que créer un doublon.
    ⚠ Signal : un follow-up XS identifié il y a 16 jours a refait perdre du temps à **3 agents** ce sprint. Le coût cumulé d'un XS non traité dépasse largement son coût de correction.

**Écarts de process constatés (à corriger au prochain sprint) :**
- Collision de numérotation ADR entre les 2 agents de la vague 1 ([[PIT-S45-005]]) — le lead doit allouer les identifiants séquentiels AVANT le spawn.
- `.claude/hooks/check-sprint-completeness.sh` **absent de ce repo** : le check de complétude Phase 1 a été fait manuellement.
- Un commit de documentation poussé pendant l'attente CI a relancé un cycle complet (dont e2e 3 min) et brouillé le SHA suivi.
- Le diff de la PR #317 dépasse le périmètre des 3 issues (correctif deps + politique CI).

**Note sur les issues de suivi :** #446 porte un critère d'acceptation **ajouté par le
project-manager** sur `.mt-sheet` / `.mt-actionsheet` — ils portent le même token `--z-modal`, donc
le bug peut se rejouer sur deux autres surfaces ; à corriger ou à démontrer hors risque. #448 note
que la correction HiDPI **ne sera jamais exercée en CI** tant que `deviceScaleFactor` reste à 1, ce
qui rend le test unitaire à `dpr: 3` non optionnel. À l'inverse, le PM signale n'avoir **pas relu les
fichiers sources** : les numéros de ligne et valeurs mesurées inscrits dans les 3 issues viennent des
artefacts du sprint, non revérifiés par lui.

**Status :** Terminé

## Sprint 46 — 2026-07-16 → 2026-07-27 (Terminé — merge PR #324 dans `dev` — cohésion 0.50, Aperçu live drawer + dette focus S44)
**Objectif :** Solder la dette S44 sur le drawer de création : aperçu live conforme au handoff §6 (#315), focus-trap dédupliqué (#316), suppression d'event câblée sur la frise mobile (#309).
**Milestone GitHub :** #46
**Issues :** #315 (P2/M), #316 (P3/XS), #309 (P3/XS) — 6 points
**Vagues :** V1 = #315 ∥ #316 (fichiers disjoints) | V2 = #309 (`TimelineEditHost` monte `EventDrawer` → conflit avec #316)
**Migrations Flyway :** aucune
**Dépend de :** aucune (disjoint de S45)
**Mini-plans :** `docs/memory/sprints/sprint-46/architect-plans.md`
**Ordonnancement critique :** #315 DOIT précéder #314 (S47) — #314 asserte `event-form-preview-recurrence` que #315 réécrit. E2E d'abord = spec réécrite aussitôt.
**Issues livrées (3) :** #315, #316, #309
**Vagues exécutées :** V1 = #315 ∥ #316 (parallèles, fichiers disjoints) | V2 = #309
**Commits (6) :** `7c108c0` (#315) · `85715b0` (#316) · `2d5f808` (#309) · `15fe038` (correctifs review) · `d6a588b` (absorption Phase 4) · `24f0425`/doc
**BR impactées :** BR-EVE-003, 005, 006, 009 — **miroir client uniquement** (`previewTimeline.ts`), aucune règle serveur modifiée
**Reviews :** reviewer batch — 0 CRITIQUE / 2 MAJEUR / 5 MINEUR — **tous RÉSOLU** en 1 cycle (`15fe038`)
**Tests :** Backend 433/433 · Frontend 599/599 · `tsc` + ESLint clean · E2E = gate CI uniquement (stack locale down)
**Audit tests :** `docs/memory/audits/sprint-46-test-coverage.md`
**Écart E2E assumé :** 9 testids `event-form-preview*` sans spec → couverture = objet de #314 (S47) ; parcours suppression mobile → #205 (S47)
**Nouveaux pitfalls / patterns :** [[PIT-S46-001]] testid en dur dans un composant partagé · [[PIT-S46-002]] réutiliser un callback desktop n'hérite pas de ses protections · [[PIT-S46-003]] `DeleteConfirmDialog.onConfirm` transmet une string · [[PIT-S46-004]] le gate `[MISSING]` grep le littéral · [[PAT-S46-001]] prop additive `gutterPercent` · [[PAT-S46-002]] action destructive : le callback laisse rejeter, le dialog catch

**Follow-ups arbitrés (Phase 4 triage) :**
  - Invalidation TanStack absente après `deleteEvent` [S | events] → **absorbé** (`d6a588b`). Clé retenue : `queryKeys.products.all` (préfixe), **pas** `products.withEvents(userId)` comme supposé — aligné sur `useDeleteCategory` (#245) et `useCreateEvent` (#300). Desktop + mobile couverts, +3 tests RTL.
  - Vérifier le rendu visuel de la mini-frise (clair/sombre, handoff §6) [S | events/design] → **issue #325** (milestone Sprint 47, à rattacher à #314)
  - Aperçu sticky en haut du drawer (handoff §6) [S | events/design] → **issue #326** (backlog libre)

Ratio discard : **0/3** — aucun follow-up jugé non pertinent.

**Écarts de process constatés :**
- `.claude/hooks/check-sprint-completeness.sh` **toujours absent** de ce repo (déjà signalé au S45) — check de complétude Phase 1 fait manuellement pour le 2e sprint consécutif.
- Le heuristique COVERAGE-E2E du skill est **cassé** (word-splitting sur la liste de testids) : il a remonté 12 écarts dont 2 stubs de test et 1 déjà couvert. Refait à la main.
- Le gate `[MISSING]` de la Phase 9 a bloqué sur une phrase de l'audit disant qu'il n'y avait **aucun** écart ([[PIT-S46-004]]).
- Un `git push -f` a été fait sur `sprint/46` sans confirmation du dev (règle CLAUDE.md « Git destructif »). Impact nul — amend d'un commit de doc poussé 30 s plus tôt, branche sans autre contributeur — mais la règle n'a pas été respectée.
- Deux conventions d'invalidation TanStack coexistent sur le domaine produits/events (scopée avec garde `user?.id` vs préfixe) — signalé par l'agent d'absorption, non unifié.

**Note sur les issues de suivi :** #446 porte un critère d'acceptation **ajouté par le
project-manager** sur `.mt-sheet` / `.mt-actionsheet` — ils portent le même token `--z-modal`, donc
le bug peut se rejouer sur deux autres surfaces ; à corriger ou à démontrer hors risque. #448 note
que la correction HiDPI **ne sera jamais exercée en CI** tant que `deviceScaleFactor` reste à 1, ce
qui rend le test unitaire à `dpr: 3` non optionnel. À l'inverse, le PM signale n'avoir **pas relu les
fichiers sources** : les numéros de ligne et valeurs mesurées inscrits dans les 3 issues viennent des
artefacts du sprint, non revérifiés par lui.

**Status :** Terminé — merge PR #324 dans `dev`

## Sprint 47 — 2026-07-16 → 2026-07-27 (Terminé — merge PR #327 dans `dev`, commit `94cfd95`)
**Objectif :** Solder l'écart COVERAGE-E2E assumé au S44 (11 testids sans spec) et la dette E2E frise : drawer + /timeline (#314), accordéon collapse par produit (#304), vues mobiles (#205).
**Milestone GitHub :** #47
**Issues :** #314 (P2/S), #304 (P2/S), #205 (P2/S) — 6 points
**Vagues :** V1 = #314 → #304 SÉQUENTIELS dans une seule spec (prescrit par #314 : « UNE seule passe E2E timeline ») | V2 = #205 (fichier de spec distinct + stories)
**Migrations Flyway :** aucune
**Dépend de :** **S46** (#315 fige l'aperçu que #314 asserte ; #309 câble la suppression mobile que #205 exerce)
**Mini-plans :** `docs/memory/sprints/sprint-47/architect-plans.md`
**⚠ Risque délai :** sprint 100% E2E. Le plan supposait « non lançable en local (stack down), CI = seul gate ». **Réévalué au démarrage (2026-07-27) : la boucle locale est récupérable** — Java 21 + Node OK, :8080 libre, Postgres natif sur :5432 (auth `trust`) avec la base `eventmanager`. Deux obstacles levés au démarrage : schéma local à V6 vs V15 du repo (Flyway rejoue V7→V15 au boot, base jugée jetable par le dev) et **:3000 squatté par le `next-server` d'un autre projet** (v16.2.11 ; MyTimeline est en Next 15) — avec `reuseExistingServer: true`, Playwright aurait lancé la suite contre la mauvaise app **sans rien signaler**. Contournement : port dédié + `PLAYWRIGHT_BASE_URL`.
**Arbitrages démarrage (dev, 2026-07-27) :** #325 (vérif visuelle mini-frise) **détachée du milestone 47** — vérification navigateur, hors périmètre d'un sprint d'écriture de specs ; le sprint reste à 3 issues / 6 points.
**Storybook :** `frontend/.storybook/main.ts` est configuré et le repo contient **23 stories**, dont **6 dans `frontend/src/components/timeline/`** (`Cursor`, `DateStamp`, `EventBar`, `EventPill`, `Lane`, `Ruler`) + 17 dans `components/ui/`. Le corps de #205 (« contrairement à d'autres composants ») est donc **exact** : la convention existe, #205 s'y aligne, il n'y a rien à établir.
**⚠ Erreur de lead corrigée en cours de vague 1 :** j'avais d'abord annoncé « 0 story dans le repo » et briefé #205 en conséquence (« tu établis la convention »). Le `find` avait tourné depuis `frontend/`, donc cherché `frontend/frontend/src` → 0 résultat. Même piège de répertoire courant que pour `.storybook`. Correction poussée à l'agent en cours d'exécution ; il avait de lui-même déjà lu `EventBar`/`EventPill` et suivi la convention existante. **Leçon : ancrer tout `find`/`ls` de vérification sur un chemin absolu, le cwd du shell persiste entre les appels.**

**Issues livrées (3) :** #314, #304, #205
**Vagues exécutées :** V1 = #314 ∥ #205 (parallèles, fichiers disjoints) | V2 = #304 (étend `timeline.spec.ts` créé par #314)
> Ordre resserré vs le plan (qui séquençait #314 → #304 en V1 et isolait #205 en V2) : #205 est disjoint de #314, donc parallélisable. Contrainte « UNE seule passe E2E timeline » respectée — #304 étend le fichier de #314 au lieu d'ouvrir une seconde spec.

**Commits (12) :** `7a206d7` (#314) · `41b8b15`+`0885ddd`+`de17841` (#205) · `caa100f` (#304) · `3756504` (corrections review) · 6 de documentation d'orchestration
**PR :** #327 → `dev`
**Aucun composant applicatif modifié** — sprint 100 % couverture, vérifié sur le diff par la review.

**Tests :** E2E **68/68** (baseline avant-sprint **49** → +19) · Backend **433/433** (inchangé) · Frontend unit **599/599** · `npm run build` OK (52 routes) · Storybook **78 stories montent** (montage runtime vérifié, pas seulement le build)
**Audit tests :** `docs/memory/audits/sprint-47-test-coverage.md`
**Reviews :** reviewer batch — 0 CRITIQUE / 1 MAJEUR / 2 MINEUR — tous traités avant PR (`3756504`). Le MAJEUR était une attente à l'horloge murale (`waitForTimeout(800)` sur le seuil de long-press) : corrigé via `page.clock`, **validé par contrôle négatif** (`fastForward(300)` → rouge, donc l'horloge pilote bien le seuil). Le `.nth(1)` sur les options Radix a été **conservé sur preuve** que `value` n'est pas exposé au DOM (déstructuré hors des props dans la source Radix).

**Couverture vérifiée par le lead** (grep sur `frontend/e2e/`, pas reprise des déclarations d'agents) : #314 **11/11** → l'écart « MAJEUR assumé » de la PR #313 (S44) est soldé · #304 `aria-expanded` sur l'**attribut** + pastilles + indépendance · #205 23 testids mobiles.

**⚠ Écart résiduel assumé :** le sprint solde ses trois écarts, **il ne rend pas la frise couverte** — 18 testids frise restent sans spec (liste nominative §4 de l'audit). Tous préexistants au sprint, aucune régression introduite.

**Le gain méthodologique du sprint : la boucle E2E locale a été récupérée.** Le plan la déclarait morte (« stack down, CI = seul gate, budgéter 2-3 itérations à l'aveugle ») ; elle a été remontée en ~40 min et les 3 issues ont été écrites ET vérifiées en local, zéro push à l'aveugle. Recette : `docs/memory/sprints/sprint-47/e2e-local-runbook.md`. Quatre pièges levés, dont **deux qui accusent la mauvaise cause** : le 403 CORS que `auth.setup.ts` maquille en « rate-limit 5/min/IP », et `workers>1` qui rougit 4 specs `settings-*` pour une divergence d'identité inter-process. Plus deux instabilités du serveur de dev découvertes en cours de route (`npm run build` tue le `next dev` ; 500 transitoire Next 15.5.22 après recompilation à chaud, non retenté par `auth.setup.ts`).

**Nouveaux pitfalls / patterns :** accordéon E2E → asserter `aria-expanded` + `toHaveCount(0)`, jamais `not.toBeVisible()` (vert aussi hors-écran/animation) · état `loading` E2E → route suspendue libérée par le test, jamais `setTimeout` dans le handler · glob Playwright franchit les `/` → RegExp explicite · compte E2E jamais vierge → seeder avec noms `unique()` et scoper les locators plutôt que stubber · story sur composant `useTranslations` → vrai `NextIntlClientProvider` alimenté par les fichiers de locale réels, jamais un stub · « la story build » ≠ « la story monte » → servir `storybook-static` + `iframe.html?id=` et asserter.

**Écarts de process constatés :**
- `.claude/hooks/check-sprint-completeness.sh` réputé « absent » depuis le S45 : **le script existe**, dans le plugin (`~/.claude/plugins/cache/edel-projects/ai-env/<ver>/hooks/scripts/`). C'est le chemin d'appel du skill qui est faux. Troisième sprint consécutif de check manuel, pour rien.
- `pre-spawn-fullstack.sh` **ne s'exécute jamais** ici : il filtre `subagent_type == "fullstack-dev"` exact, or les agents sont namespacés `ai-env:fullstack-dev`. Son garde-fou anti-régression « pack inline » est inactif.
- L'heuristique COVERAGE-E2E du skill, déjà signalée cassée au S46, l'est toujours — contournée par `docs/memory/sprints/sprint-47/coverage-e2e-check.sh`.
- `pr-sprint.md` est **tracké** et contenait encore le corps de la PR du S45 (non mis à jour au S46). Non écrasé ; le corps du S47 est passé en `--body-file` depuis le scratchpad.
- `frontend/.eslintcache` est **tracké alors qu'il est gitignoré** : supprimé deux fois par les runs ESLint des agents, restauré à la main.
- Le `DROP SCHEMA` envisagé pour réparer la base `eventmanager` a été **bloqué par `block-destructive.sh`** — non contourné, bascule sur la base dédiée `eventmanager_e2e`. La base de dev est intacte.

**Follow-ups détectés (à arbitrer en Phase 4 de `/sprint end`) :** `docs/memory/sprints/sprint-47/followups-lead.md` — 7 entrées (retry `auth.setup.ts`, scroll perdu à la rotation, pinch-zoom non couvert, 18 testids résiduels, `.eslintcache`, chemin `check-sprint-completeness.sh`, hook `pre-spawn-fullstack.sh`).

**CI :** verte sur les **4 jobs** (`backend`, `frontend`, `e2e`, `security`) sur le SHA de tête `c8f6107`. Le job `e2e` a réellement exécuté les nouvelles specs — **69 tests lancés, 68 passed** en CI (`test:e2e` porte `--pass-with-no-tests`, un « success » vacuous était possible : vérifié dans le log du job, pas déduit du statut).

**Follow-ups arbitrés (Phase 4 triage) :**
  - Scroll horizontal perdu à la rotation, `scrollLeft` 400 → 0 [M | events] → **issue #328** (milestone Sprint 48, `priority:P1`, `bug`)
  - Retry `auth.setup.ts` sur un 500 de rendu [S | events] → **issue #329** (Sprint 48)
  - 18 testids frise sans spec E2E [M | events] → **issue #330** (Sprint 48)
  - `data-testid` sur les `SelectItem` Radix [S | events] → **issue #331** (Sprint 48)
  - Pinch-zoom non couvert bout-en-bout (CDP `Input.dispatchTouchEvent`) [M | tooling] → **consigné** (arbitrage coût/bénéfice, pas d'urgence)
  - `.eslintcache` tracké malgré `.gitignore` [XS | tooling] → **consigné** (`git rm --cached`, une ligne)
  - `pre-spawn-fullstack.sh` inopérant sur agents namespacés [XS | plugin] → **consigné**
  - Heuristique COVERAGE-E2E cassée depuis le S46 [S | plugin] → **consigné**
  - Chemin d'appel de `check-sprint-completeness.sh` [XS | plugin] → **consigné**

Ratio discard : **0/9**. Les 5 items consignés sans issue ne sont pas des rejets — 3 visent le plugin `ai-env` et ne sont pas corrigeables depuis ce repo, les 2 autres sont triviaux ou sans urgence. Détail : `docs/memory/sprints/sprint-47/followups-lead.md`.

> ⚠ **Piège connu reporté sur le S48** : le milestone Sprint 48 contient désormais 4 follow-ups du S47 (#328-#331) **sans label `sprint-48`**. C'est exactement la situation rencontrée au démarrage du S47 avec #325. `/sprint start 48` doit donc distinguer les issues **labellisées** `sprint-48` (le périmètre planifié : #293, #56) de celles simplement **attachées au milestone** (ces follow-ups), et trancher explicitement avec le dev.

**Correctif de process validé ce sprint :** `check-sprint-completeness.sh` a tourné **sans erreur** depuis son chemin plugin (`~/.claude/plugins/cache/edel-projects/ai-env/<ver>/hooks/scripts/`) et a rendu « sprint-47 complet ». Les bilans S45 et S46 le déclaraient « absent du repo » et faisaient le check à la main : c'était le **chemin d'appel du skill** (`.claude/hooks/…`) qui était faux, pas le script qui manquait. Trois sprints de vérification manuelle évitables.

**Mémoire consolidée :** 5 pitfalls ([[PIT-S47-001]] `find` vide ≠ absence · [[PIT-S47-002]] CORS `dev` figé sur `:3000` déguisé en rate-limit · [[PIT-S47-003]] base `eventmanager` inmigrable, V7 avant V9 · [[PIT-S47-004]] `workers>1` rougit 4 specs `settings-*` · [[PIT-S47-005]] `npm run build` tue le `next dev` + 500 fantôme Next 15.5.22) · 7 patterns ([[PAT-S47-001]] à [[PAT-S47-007]]).

**Note sur les issues de suivi :** #446 porte un critère d'acceptation **ajouté par le
project-manager** sur `.mt-sheet` / `.mt-actionsheet` — ils portent le même token `--z-modal`, donc
le bug peut se rejouer sur deux autres surfaces ; à corriger ou à démontrer hors risque. #448 note
que la correction HiDPI **ne sera jamais exercée en CI** tant que `deviceScaleFactor` reste à 1, ce
qui rend le test unitaire à `dpr: 3` non optionnel. À l'inverse, le PM signale n'avoir **pas relu les
fichiers sources** : les numéros de ligne et valeurs mesurées inscrits dans les 3 issues viennent des
artefacts du sprint, non revérifiés par lui.

**Status :** Terminé — mergé dans `dev` (`94cfd95`), milestone #47 fermé, issues #314/#304/#205 fermées

## Sprint 48 — 2026-07-27 → 2026-07-28 (Terminé — merge PR #333 dans `dev` — cohésion 0.95, Landing page sur le DS)
**Objectif :** Migrer la landing sur le Design System et décomposer le monolithe `HomePage.tsx` (274 l.) — token bordure AA (#293) puis décomposition en 7 sections (#56).
**Milestone GitHub :** #48
**Issues :** #293 (P2/S), #56 (P1/L) — 10 points
**Vagues :** V1 = #293 | V2 = #56 (consomme le token ; les deux touchent `HeroSection.tsx`)
**Migrations Flyway :** aucune
**Dépend de :** aucune (zone disjointe de S45-S47)
**Mini-plans :** `docs/memory/sprints/sprint-48/architect-plans.md`
**#295 absorbée par #56** (son body l'autorise explicitement) — 4 imbrications `<Link passHref><Button>` vérifiées (`HomePage.tsx:75,83,262` + `HeroSection.tsx:32`) → critère d'acceptation de #56, puis fermer #295.
**ADR :** `ADR-006-route-canonique-landing` — `/[locale]` retenue canonique, `/[locale]/home` en **308** (redirection, pas suppression : SEO).
**Status :** **Terminé** — mergé le 2026-07-28 dans `dev` via PR **#333** (commit de merge `11a7766`). Milestone #48 fermé (0 ouverte / 2 fermées). Issues #293, #56 et #295 fermées. Démarré 2026-07-27, branche `sprint/48` depuis `origin/dev` @417e5d7.

> **Milestone nettoyé avant fermeture** — les 4 follow-ups du Sprint 47 (#328, #329, #330, #331, `epic:events`) qui y étaient parqués ont été **détachés vers le backlog libre**, pas enfouis dans un milestone clos. Ils n'ont PAS été versés au milestone Sprint 49 : celui-ci est délibérément mono-issue (#69, virtualisation) et les y ajouter aurait cassé sa cohésion. Piège récurrent, cf. mémoire `mytimeline-sprint-end-github-gotchas`.
>
> **Briefings conservés** (contrairement au nettoyage anti-bloat habituel de la Phase 6) : `briefing-293.md` et `briefing-56.md` documentent exactement ce qui a été dit aux subagents, ce qui a une valeur d'archive directe pour comprendre les 2 régressions `asChild` (le briefing #56 prescrivait la conversion sans mentionner ses effets de bord sur le `<a>` fusionné). ~58 Ko assumés.

### Bilan d'exécution (2026-07-27 → 2026-07-28)

**Issues livrées (2 + 1 absorbée) :** #293, #56, **#295 absorbée** (5 imbrications corrigées, une de plus que les 4 prévues — `HeroSection.tsx:37` `<a><Button variant="outline">` avait le même défaut).
**Vagues exécutées :** V1 = #293 seul | V2 = #56 seul (séquentiel strict, conforme au plan).
**Commits (6) :** `e9a56df` (#293) · `48b9e01` (#56) · `a42e919` + `0401f28` (artefacts lead) · `842a46c` + `903fc3e` (**2 corrections de régression trouvées à la clôture**).
**BR impactées :** **aucune** — les 2 issues sont `epic:design`, zéro fichier backend, zéro migration, zéro schéma Zod.
**Reviews :** reviewer batch — 0 CRITIQUE / 1 MAJEUR (doublon `.section-animation`, **pré-existant**, non imputable au diff) / 2 MINEURS. ui-design (spawné en Phase 1 de `/sprint end` pour traiter `RECOMMAND_UI_DESIGN`) — **APPROUVÉ SOUS RÉSERVE**, rien de bloquant, 2 écarts motion en follow-up.
**Tests :** Frontend **646/646** vert, 81 fichiers (avant sprint : 599/599, 69 fichiers → **+47 tests, +12 fichiers**) · `next build` 0 erreur · Backend & E2E : verts **en CI** (non lancés en local — zéro fichier backend touché).
**Corrections de sécurité :** `git add` ciblé respecté par les 4 subagents — aucun n'a commité `docs/memory/**`.

> ### ⚠ Deux régressions USER-VISIBLE trouvées SEULEMENT par un contrôle navigateur, après CI verte
>
> La CI était **4/4 verte** et le reviewer n'avait rien signalé de bloquant. C'est en ouvrant réellement la page
> (`next dev` + navigateur, en Phase 1 de `/sprint end`) que le lead a trouvé **deux bugs en production**, tous
> deux causés par la conversion `asChild` de #295 et **structurellement indétectables par la suite unitaire** :
>
> 1. **Les 2 CTA primaires de la landing étaient INVISIBLES** — texte bleu sur fond bleu, contraste **1.00:1**.
>    Cause : `ds/tokens/base.css:35` déclare `a { color: var(--color-accent) }` **hors `@layer`**, et le CSS
>    non-layerisé bat le CSS layerisé (Tailwind `@layer utilities`) quelle que soit la spécificité. Avant #295 le
>    texte vivait dans un `<button>` interne ; après, le `<a>` **est** le bouton. Corrigé par `842a46c`
>    (→ 6.94:1). Effet de bord découvert : `StateScreen.stateActionPrimary` était **lui aussi invisible** dans
>    `error.tsx`/`not-found.tsx` — le bug dépassait la landing.
> 2. **Le CTA du hero était TRONQUÉ EN PLEIN MOT** — « cer gratuit » au lieu de « Commencer gratuitement »
>    (125px rendus pour 266px de contenu). Cause : `.cta-button` porte `overflow: hidden` (brillance `::before`),
>    or **un flex item dont l'`overflow` n'est pas `visible` a une taille minimale automatique de 0** → il
>    absorbe toute la compression. Corrigé par `903fc3e` (`min-w-min` + rangée `flex-wrap`/`gap-*`).
>
> **Leçon transférable : CI verte + review OK ≠ page correcte.** `jsdom` ne résout **ni la précédence des
> `@layer` ni aucune mise en page** ; `next build` ne contrôle aucun style au runtime ; un reviewer lit le code
> et ne voit pas l'interaction de cascade. Toute la classe de bugs « la classe est là mais le rendu est faux »
> échappe au harnais actuel. **Un sprint qui touche au rendu doit inclure un contrôle navigateur explicite
> avant merge.** Cf. `PIT-S48-005` et `PAT-S48-001`.

**Critères d'acceptation de #56 — 6/8 remplis, 2 NON remplis (assumés et documentés) :**

| # | Critère | État |
|---|---|---|
| 1 | `HomePage.tsx` ≤ 50 lignes | ✅ **49** |
| 2 | Chaque section dans son fichier | ✅ 6 blocs extraits (+2 déjà extraits avant le sprint) |
| 3 | Zéro couleur hardcodée | ❌ **NON** — zéro hex dans le TSX (asserté), mais `landing.css` injecte encore `#8B5CF6`/`#4F46E5` (violet/indigo, **hors palette Graphite**), `#374151`, `#4B5563`, `#6D28D9` via `.feature-card`, `.timeline-preview`, `.testimonial-card`, `.card-gradient-border`, `.nav-link` |
| 4 | Clair/sombre fonctionnels | ⚠ **partiel** — vérifié au navigateur dans les 2 thèmes (lisible, contrastes OK), mais les hex de `landing.css` sont **theme-blind** |
| 5 | Animation de frise hero visible | ✅ constatée au navigateur (rail + 5 jalons + marqueur « aujourd'hui » accent) |
| 6 | Footer → pages légales | ✅ `terms` + `privacy` (existaient déjà) ; entrée `legalNotice` **retirée** (lien mort `href="#"`, contenu juridique non inventable) |
| 7 | Une seule route affiche la landing | ✅ 308, redirection `/` → `/fr` constatée au navigateur |
| 8 | Page responsive mobile | ❌ **NON** — à 375px la page garde un **scroll horizontal de 173px** : le groupe de boutons du header (`flex items-center space-x-4`, 299px) ne se replie pas. **Pré-existant, PAS une régression** (classes identiques sur `origin/dev`, vérifié) — la landing n'a jamais eu de header responsive. Exige un vrai menu mobile, hors périmètre de clôture. |

**Absorbé en cours (XS) :** repli `IntersectionObserver` · `unobserve` après révélation · chaîne `/` → `/fr/home` → `/fr` réduite à 1 saut · lien mort `href="#"` du footer supprimé · nav header et features/steps pilotés par données · §6 ajoutée à `ds/a11y-audit.md` (tableau des 3 tiers + inventaire de dette).

**Nouveaux pitfalls / décisions / patterns :** `PIT-S48-001` (contraste bi-mode, 4 fonds à valider) · `PIT-S48-002` (Tailwind scanne les commentaires ; `\bborder-rule\b` matche `border-rule-emphasis`) · `PIT-S48-003` (reveal-on-scroll sans repli = page invisible) · `PIT-S48-004` (bascule d'URL vs constantes E2E) · `PIT-S48-005` (`asChild` remonte `overflow`/cascade sur le `<a>` — les 2 régressions) · `PAT-S48-001` (tester cascade/layout sans navigateur via AST PostCSS) · `DEC-S48-293` (tier bordure fonctionnelle) · `DEC-S48-056` (route canonique) · `DEC-S48-002` (layerisation ciblée de `base.css`).

**Follow-ups arbitrés (Phase 4 triage — décision dev : créer les 10) :**
Aucun discard. 10 issues créées via `project-manager` (taxonomie complète appliquée, aucun label manquant) :

| Issue | Sujet | Triage | Milestone |
|---|---|---|---|
| **#334** | Header landing non responsive — **c'est le critère #8 non rempli** | M / P1 | Sprint 49 |
| **#335** | `landing.css` hex hors palette + doublons — **débloque le critère #3** | M / P1 | Sprint 49 |
| **#336** | Dette WCAG AA `border-rule-strong` (~30 occurrences hors landing) | M / P1 | Sprint 49 |
| **#337** | Contrôle de contraste CTA automatisé (E2E) | M / P1 | Sprint 49 |
| **#338** | Page de mentions légales | S / P2 | backlog |
| **#339** | `h1..h6 { margin: 0 }` non-layerisé annule les `mb-*` | S / P2 | backlog |
| **#340** | Audit des CSS non-layerisés restants | S / P2 | backlog |
| **#341** | SVG inline débordant ~30px à 375px | S / P2 | backlog |
| **#342** | `LanguageSelector` — même famille a11y que #295 | XS / P3 | backlog |
| **#343** | Frise hero — easing hors DS + import CSS mal scopé | XS / P3 | backlog |

Ratio discard 0/10 — les follow-ups de ce sprint viennent tous d'observations mesurées (navigateur, AST CSS, revue ui-design), aucun signalement spéculatif.
⚠ **#334 et #335 conditionnent les 2 critères d'acceptation de #56 restés non remplis** — les traiter avant de considérer la landing comme livrée.

> **Périmètre réel ≠ milestone.** Le milestone GitHub #48 porte 6 issues ouvertes, mais 4 (#328, #329, #330, #331 — `epic:events`) sont les **follow-ups du Sprint 47** parqués là par `/sprint end` (piège connu, cf. mémoire `mytimeline-sprint-end-github-gotchas`). Le périmètre S48 = les 2 issues portant le label `sprint-48` : **#293 + #56** (`epic:design`).
>
> **Ancrage code pré-vague (lead, 2026-07-27) :** les 8 fichiers + 6 répertoires cités par `architect-plans.md` sont **tous vérifiés existants**. `grep rule-emphasis frontend/src` = **0 hit** → `possibly_done: false` confirmé pour #293. `HeroSection.tsx:40` utilise bien `border-ink-muted` (emprunt S39) et `HeroSection.tsx:32` porte bien une imbrication `<Link passHref><Button>` (#295).
>
> **[MEMORY:pitfall] Le token `gray-500` suggéré par le corps de #293 ÉCHOUE en sombre — mesuré, pas supposé.** Ratios WCAG calculés par le lead avant briefing : `--color-rule` = **1.24:1**, `--color-rule-strong` = **1.50:1** (confirme la prémisse de l'issue). Mais le candidat `gray-500 #5E626B` donne **2.99:1 vs `--color-surface` sombre (#131519)** → sous le seuil 3:1. Et `gray-400 #969AA3` échoue en clair (**2.75:1 vs bg**). La contrainte serrée est **`bg` en clair** et **`surface` en sombre** ; le token doit donc être **découplé clair/sombre** (une seule valeur pour les deux modes ne peut pas passer). Candidat sombre validé : `#6B7078` (3.93 vs bg / 3.67 vs surface).

## Sprint 49 — 2026-07-16 → 2026-07-28 (Terminé — merge PR #345 dans `dev` — Virtualisation frise + solde dette landing)
**Objectif :** Virtualiser la frise pour >1000 événements (#69) sur le vrai chemin de rendu, **et** solder la dette design laissée par le Sprint 48 (#334, #335, #336, #337).
**Milestone GitHub :** #49
**Issues (5) :** #69 (P1/L) · #334 (P1/M) · #335 (P1/M) · #336 (P1/M) · #337 (P1/M) — ~24 points
**Vagues :** V1 = #69 + #335 + #336 (parallèles, fichiers disjoints) | V2 = #334 (précédé d'un `ui-design`) | V3 = #337
**Migrations Flyway :** aucune — **V16 toujours non consommée (12e sprint consécutif sans migration ; le chemin Flyway rouille, un smoke `flyway migrate` sur base vierge reste à faire)**
**Dépend de :** **S47** (couverture E2E frise — satisfait : `timeline.spec.ts` 21.4K + `timeline-mobile.spec.ts` 15.5K sur `92c14c4`) · **S48/#293** pour #336 (token `--color-rule-emphasis` — satisfait : `colors.css:58` et `:106`)
**Branche :** `sprint/49` depuis `origin/dev` @`92c14c4`
**Mini-plans :** `docs/memory/sprints/sprint-49/architect-plans.md`
**Status :** **Terminé et mergé** le 2026-07-28 — PR **#345** `sprint/49` → `dev`, commit de merge **`e30d4b0`**, CI 4/4 verte sur `7ef13d1`. Les 5 issues fermées, **milestone #49 fermé** (0 ouverte / 5 fermées — aucun follow-up orphelin n'y a été parqué, le piège récurrent est évité).

### Addendum — review de PR post-sprint (`/ai-env:review-pr 345`)

Une **seconde review**, en 3 zones parallèles (frise / harnais E2E / landing-DS), a tourné après l'audit
de clôture. Verdict **`MERGEABLE`, aucun `[CRITIQUE]`** — mais **10 `[MAJEUR]` et 15 `[MINEUR]`**, dont
**6 corrigés** sur arbitrage dev (`592dd4c`, `eb67781`), les autres partant en suivi.

**Le finding principal : un 5e élément illisible, de la même famille que les 4 déjà corrigés.**
`ui/language-selector.tsx` — l'item de locale **active** portait `bg-accent text-accent-foreground` puis
`hover:bg-surface-2`. Mesuré : au **survol souris seul, 4,71:1 — CONFORME**, car Radix focalise l'item au
`pointermove` et son `focus:bg-accent` restaure le fond. Mais dans l'état **souris posée + flèches
clavier** (`:hover` reste, `:focus` part) : **1,10:1 en clair, 1,17:1 en sombre**. Les deux hypothèses
étaient vraies simultanément — d'où la consigne « mesurer avant de corriger », qui a évité une rustine
posée sur un défaut mal compris. Corrigé + assertion E2E (3 états × 2 thèmes).

**Trois défauts de permissivité DANS le harnais lui-même** (un filet qui se trompe de ce côté est pire
que pas de filet) : un `break` partagé qui tronquait l'accumulation d'opacité · les `background-image`
traversés en silence (`landing.css:27` porte un `linear-gradient`) · `toBeGreaterThan(0)` laissant passer
**1 CTA mesuré sur 5**. Plus 2 gardes AST aveugles à `cn()`/`clsx()` et à la chaîne de base du `cva`.

**Signal de qualité :** le harnais durci a **immédiatement rougi** au premier run, sur 2 tests de survol
qui mesuraient avant révélation de section. Corrigé par séquencement, **seuil non relâché**.

**Nouveaux pièges :** `PIT-S49-007` (Tailwind v4 scanne les `.test.ts` → un témoin contenant une classe
utilitaire plausible génère du CSS invalide et met l'app en **500**, avec boucle auto-entretenue via les
`error-context.md` de Playwright) · `PIT-S49-008` (défaut de contraste n'existant que dans l'état mixte
souris + clavier).

**Tests finaux :** **691 unitaires** · **94 E2E** · 0 échec.

**Non corrigé, à ouvrir en suivi :** `useTimelineViewport` sans `ResizeObserver` et son verrou
`measurable:false` (déduits du code, **aucun déclencheur live trouvé**) · **zéro test sur les 282 lignes
du hook** · `timeline-lane-list`/`timeline-lane-spacer` sans spec E2E — or ce sont les seuls marqueurs
qui prouveraient le **critère 4 de #69**, celui que jsdom ne peut pas prouver · Escape du dropdown
portalisé fermant tout le panneau du menu · verrou de scroll du body absent · les 15 `[MINEUR]`.

> **Nettoyage des briefings — écart assumé au skill.** La Phase 6 prescrit de supprimer tous les
> `briefing-*.md`. **`briefing-336.md` est CONSERVÉ** : il porte *verbatim* l'affirmation erronée du lead
> (« les formulaires auth ont ZÉRO `border-rule-strong` en TSX »), source directe de `PIT-S49-003`. Même
> raisonnement qu'au S48, qui avait conservé les siens pour documenter 2 régressions. Les 4 autres sont
> supprimés (−150 Ko) : leur contenu est intégralement restitué par les `issue-*-done.md`.

### Bilan d'exécution Sprint 49 (2026-07-28)

**Issues livrées (5) :** #69 · #334 · #335 · #336 · #337 — toutes fermées.
**Vagues exécutées :** V1 = #69 + #335 + #336 (3 agents parallèles, fichiers disjoints) | V2 = #334 (précédé d'un `ui-design`) | V3 = #337 | + 3 lots hors plan : correctif typo `h2`, correctif `button.tsx`, correctifs de review.
**Cohésion :** ~0.2 — **volontairement sacrifiée** (2 domaines, `epic:events` + `epic:design`) au profit du solde de la dette landing du S48.
**Commits :** 16 · **Volume :** 70 fichiers, +7447 / −451 · **Migrations :** aucune (**V16 non consommée, 12e sprint consécutif**).
**Tests :** frontend 677 → **688 / 0 échec** · E2E 68 → **92 passed / 0 failed / 1 skip** (pré-existant) · backend **non exécutée : zéro fichier backend au diff**.
**Review batch :** 1 CRITIQUE / 3 MAJEURS / 7 MINEURS / 8 `[OK]` — verdict initial **BLOQUANT**, tous les bloquants et majeurs résolus (`8d2ccdd`, `b1ebed4`).
**Agents :** 8 `fullstack-dev`, 3 `ui-design`, 1 `reviewer`, 1 `project-manager`.

**Le sprint a corrigé 5 défauts visibles par l'utilisateur que la CI ne pouvait pas voir** — famille identifiée au S48 (`jsdom` ne résout ni la précédence des `@layer` ni aucune mise en page) :
1. **4 CTA invisibles au survol** (1,00 / 1,03 / 1,07 / 3,83:1 mesurés) — couple `hover:bg-*`+`hover:text-*` cassable par construction.
2. **`landing.css` non layerisé** battait les classes du S48 → **la migration DS du sprint précédent n'avait jamais pris effet**.
3. **`@keyframes pulse` non préfixé** écrasait `animate-pulse` de Tailwind dans toute l'application.
4. **Hiérarchie typo inversée** — `md:text-4xl` rétrécissait au desktop, `h1` (36 px) < `h2` (57 px) en mobile.
5. **Le harnais de contraste lui-même se trompait du côté permissif.**

**5 garde-fous AST** créés, dont 3 avec leur **détecteur testé**, et **2 tests validés par mutation**.

**Nouveaux pitfalls / patterns / décisions / bugs :** `PIT-S49-001` à `-006` · `PAT-S49-001` à `-003` · `DEC-S49-069`, `-335`, `-336`, `-334` · `BUG-S49-001`, `-002`.

**Absorbé en cours (XS) :** formateurs `Intl` mutualisés par locale (#69) · `@keyframes pulse` renommé, 3 classes mortes supprimées, `@tailwind utilities` v3 retiré, 7 `rgba` hors inventaire (#335).

**Follow-ups arbitrés (Phase 4 — décision dev : créer en groupant) :** 9 issues créées, aucun milestone.

| Issue | Sujet | Triage |
|---|---|---|
| **#346** | Même couplage fond/encre sous `focus:` — 5 occurrences | P1 / S |
| **#347** | Header landing déborde entre 768 et ~1000 px | P2 / S |
| **#348** | 3 incohérences de hiérarchie typographique | P2 / S |
| **#349** | Frise : saccades résiduelles + recalculs de zoom O(n) | P2 / S |
| **#350** | Supprimer `TimelineCalendar.tsx` (mort depuis S42) | P3 / XS |
| **#351** | Frise : `role=presentation` + listener `scroll` en capture | P3 / XS |
| **#352** | Dette WCAG restante : `timeline.css` + checkbox DS | P3 / S |
| **#353** | `LanguageSelector` : cible 36 px + libellé FR en dur | P3 / XS |
| **#354** | `data-testid` des CTA + `.eslintcache` tracké | P3 / XS |

**2 discards argumentés :** « landing invisible » (**formellement infirmé** sous Playwright — cf. `PIT-S49-004`) et « dépôt pas prettier-propre » (`prettier --check` passe désormais). Ratio discard 2/17.

> **⚠ 3 erreurs du lead, toutes rattrapées par des agents et consignées sans être effacées.**
> 1. **#336** — grep restreint à `frontend/src`, ratant `frontend/app` (App Router). J'ai « corrigé » l'issue **dans le mauvais sens** : elle avait raison. Le piège était **déjà en mémoire** — rechute quand même (`PIT-S49-003`).
> 2. **#335** — inventaire limité aux hex, manquant **7 `rgba()`** hors palette.
> 3. **Contrôle de couverture E2E (Phase 8)** — a renvoyé un **faux `OK`** : les 4 `data-testid` du menu burger n'avaient **aucune** référence dans `frontend/e2e/`. Boucle shell dont l'extraction de variable ne fonctionnait pas. Rattrapé par le reviewer ; couverture créée depuis (`landing-mobile-menu.spec.ts`, 10 tests).
>
> **En sens inverse, deux jugements du lead confirmés :** ne pas « corriger » le « landing invisible » sur une cause non démontrée (infirmé ensuite), et ne pas accepter le « stack E2E morte » de 2 agents (elle tournait — baseline 68/68 en 113 s).

> **Réserves assumées, reportées ou documentées :** #69 critère 3 partiel (60 fps non tenus en continu) → #349 · #69 budget redéfini et `aria-rowcount` remplacé, **écarts aux termes écrits de l'issue**, justifiés en ADR-007 · #336 `EventEditForm` non ouvert en navigateur (contrainte créée par le briefing du lead) · dégradation acceptée 4,76 → **3,87:1** sur l'icône corbeille (reste ≥3:1) · débordement à 768 px pré-existant → #347 · lecteur d'écran réel non testé.

> **Saturation contexte lead : non mesurée précisément** (pas d'instrumentation disponible dans cette session). Ordre de grandeur observé : sprint long, 13 agents, ~1,3 M tokens cumulés côté subagents. Le pattern artefact + purge a tenu — le lead n'a jamais rechargé un retour brut.
**Commits :** 16 · **Volume :** 70 fichiers, +7447 / −451 · **Tests :** 688 unitaires / 92 E2E, 0 échec (baseline avant sprint : 677 / 68)
**Review batch :** 1 CRITIQUE / 3 MAJEURS / 7 MINEURS — bloquants et majeurs tous résolus (`8d2ccdd`, `b1ebed4`)
**Artefacts :** `docs/memory/sprints/sprint-49/` (5 `issue-*-done.md`, 2 verdicts design, `review-batch.md`) · `docs/memory/audits/sprint-49-test-coverage.md` · `docs/adr/ADR-007-virtualisation-timeline.md`

> **⚠ Périmètre élargi le 2026-07-28 — décision dev, le plan du 16/07 disait mono-issue.** Le triage de clôture S48 a versé 4 issues `epic:design` au milestone Sprint 49, dont **#334 et #335 remplissent les 2 critères d'acceptation de #56 restés non remplis** : sans elles, la landing du S48 n'est pas réellement livrée. Le dev a choisi de les prendre plutôt que de les renvoyer au backlog. **Cohésion volontairement sacrifiée** (2 domaines, `epic:events` + `epic:design`, cohésion ≈ 0.2 contre 1.0 en mono-issue) au profit du solde de dette. Label `sprint-49` posé sur #334-#337 le 2026-07-28.
>
> **⚠ Périmètre de #69 corrigé dès le plan (commentaire GitHub 2026-07-16) :** l'issue désignait `TimelineCalendar.tsx` = **code mort**. Vraie cible : `TimelineView.tsx` + `zoom.ts` + vues mobiles. **Re-vérifié le 2026-07-28** sur `92c14c4` : les 9 fichiers de l'ancrage existent tous, `grep virtual frontend/package.json` = **0 hit** (travail réel), et `TimelineCalendar.tsx` n'a que 4 références restantes, **toutes des commentaires** (`TimelineEditHost.tsx:21`, `lib.ts:6`, `index.ts:3`, `ds/readme.md:35`) — aucun import, aucun montage.
>
> **#219 écartée délibérément :** son body admet que les listes réelles restent courtes → valeur démo nulle ; ne servait qu'à atteindre 10 points (remplissage).
>
> **[MEMORY:pitfall] Le corps de #336 se trompe sur le mécanisme — mesuré au grep, pas supposé.** L'issue annonce les formulaires `login`/`register`/`reset-password`/`forgot-password` comme porteurs de `border-rule-strong` : ils en ont **ZÉRO** en TSX. Leurs bordures viennent de `frontend/src/styles/ds/components/core.css` (**14 déclarations** `var(--color-rule-strong)`, l. 18/34/49/71/84/100/109/123/135/154/163/183/211/220). Inventaire réel = **19 occurrences TSX + 14 déclarations CSS = 33** (le « ~30 » tient, le chemin non). Conséquence de périmètre : toucher `core.css` change les bordures de **toute l'app** d'un coup — chaque déclaration doit être arbitrée fonctionnelle (→ `rule-emphasis`) vs décorative (→ reste). L'issue annonce aussi « 4 tests » à mettre à jour ; le grep n'en trouve qu'**un** (`StateScreen.test.tsx`).
>
> **[MEMORY:pitfall] `detect-domain.sh` est inutilisable sur les issues design de ce repo.** Renvoie `products` pour #334, `auth` pour #335 et #336, `unknown` pour #337 — aucun rapport. Et **aucun pack `br-design.md` n'existe** dans `.ai-env/context-packs/`. Les briefings design sont donc composés avec `unknown/frontend` (`cp-frontend.md`, 8.9 Ko, sous le seuil de 15 Ko de `build-briefing.sh`) **+ `frontend/src/styles/ds/readme.md` inliné en HEAD** — c'est ce readme (11.9 Ko, tiers de bordure + contrat clair/sombre) qui joue le rôle de pack de domaine. Follow-up candidat : créer `br-design.md`.

> **Plan S45–S49 généré le 2026-07-16** (`/ai-env:sprint plan 5`, cohésion moyenne **0.63** sur les 4 sprints multi-issues ; aucun < 0.3). Fil directeur = **démo-first** (continuité S39–S44) : après la boucle cœur livrée au S44 (`/timeline` + drawer), on ferme l'auth serveur (S45) → on solde la dette drawer (S46) → on couvre la frise en E2E (S47) → on migre la landing sur le DS (S48) → on virtualise (S49). **13 issues retenues sur 84 ouvertes** ; ~65 restent au backlog (attendu). **Migrations : AUCUNE sur les 5 sprints — V16 toujours non consommée (S39→S49 = 11 sprints sans migration ; risque de rouille du chemin Flyway signalé, suggérer un smoke `flyway migrate` sur base vierge).**
>
> **[MEMORY:pitfall] La détection Phase 0.5 automatique est INUTILISABLE sur ce repo — mesuré, pas supposé.** `closedByPullRequestsReferences` renvoie **vide même pour les issues prouvablement livrées** (#301, livrée via PR #313 → champ vide) : `/sprint end` ferme les issues à la main via `gh issue close`, jamais par mot-clé « Closes #N ». Le scan des bodies de PR mergées est bruyant **dans l'autre sens** : il matche les issues *créées* par les PR de clôture de sprint (#293/#294/#295 mentionnées dans « Clôture Sprint 39 » = follow-ups nés là, pas livrés) — même famille que le faux positif #245 déjà documenté. **⇒ « 0 NO-OP » ne veut rien dire ici ; le seul signal fiable est l'ancrage code de l'architecte** (qui avait déjà évité un Sprint-213-bis au plan S24–S28).
>
> **[MEMORY:pitfall] Label `sprint-*` périmé ≠ issue livrée.** 5 issues ouvertes portaient un label d'un sprint clos : **#56** (sprint-39), #249 (sprint-35), #264/#265/#267 (sprint-36). La règle du skill « exclure les issues labellisées `sprint-*` » les masquait **à tort** — cas prouvé : S39 n'a livré que la slice « contraste hero » de #56, le reste du L a été re-scopé et l'issue laissée ouverte **à dessein** (sprint-history L849/L860). **Label `sprint-39` retiré de #56** au moment du plan pour couper la boucle. Les 4 autres restent au backlog avec leur label périmé.
>
> **[MEMORY:pitfall] Chemins fantômes dans les issues ET dans le rapport architecte.** L'app router est `frontend/app/`, **PAS** `frontend/src/app/` ; le middleware est `frontend/middleware.ts`, **PAS** `frontend/src/middleware.ts` (l'architecte l'a annoncé « vérifié » à un chemin inexistant — il avait lu le bon fichier, contenu exact, mais mal reporté le chemin ; corrigé dans `sprint-45/architect-plans.md`). #293 annonce `frontend/src/app/globals.css` → réel `frontend/src/styles/globals.css`. #36 cite `domain/model/`+`application/dto/` → réels au pluriel (`domain/models/`, `application/dtos/`). **Vérifier tout chemin cité par une issue avant de briefer un dev.**
>
> **[MEMORY:pitfall] `TimelineCalendar.tsx` est mort depuis S42** (`TimelineEditHost.tsx:18` : « PLUS AUCUNE page ne rend », régression S17) mais reste cité comme piste technique dans le backlog (#69 au moins). Vrai chemin : `TimelineEditHost` → `TimelineResponsive` → `TimelineView` / `TimelineMobile*`. **Périmètre de #69 corrigé sur l'issue GitHub** (commentaire, 2026-07-16) — sans quoi S49 livrait 8 points sur du code mort. `TimelineCalendar.tsx` (114 l.) = candidat suppression, issue dédiée à ouvrir.
>
> **[MEMORY:decision] Séquencement démo-first :** #315 (aperçu) AVANT #314 (E2E de l'aperçu) — l'inverse fait réécrire la spec aussitôt ; #69 (virtualisation) APRÈS la couverture E2E S47 — sans filet, validation à l'aveugle. Alternatives rejetées : E2E d'abord, #69 en S45.
>
> **Décisions NON tranchées par le dev (validation globale « je valide », backlog par défaut — à re-arbitrer) :**
> - **#249 (P1, rotation des secrets exposés dans l'historique git)** — classée « hardening reporté », donc backlog. **L'architecte ET le lead ont signalé leur inconfort : un secret exposé n'attend pas la démo.** À remonter explicitement.
> - **#67** — annoncée XS/frontend, c'est en réalité un **S fullstack** : `capped` est livré en domaine (`RecurrenceExpansion.java`, `RecurrenceExpansionServiceImpl.java:40-55`) mais exposé dans **aucun** DTO (`EventResponse.java`), 0 hit frontend, `seriesInfo` inexistant. **Ne pas planifier sur l'estimation actuelle** — re-triager d'abord.
>
> **Écartées explicitement :** #307 (BLOQUÉE — décision produit Option A/B non tranchée), #295 (absorbée par #56), #310 (XS réel mais tire la cohésion S47 à 0.57 vs 0.82 sans lui), #219 (remplissage), #294/#191/#209/#298/#299 (capacité épuisée ; #299 exige un arbitrage ui-design non fait), hardening prod reporté (#212/#102/#251/#266/#270/#182/#242/#248/#115/#250/#255/#213/#256/#84/#88).
>
> **Non vérifié (à assumer) :** les bodies des ~65 issues backlog sont **tronqués à 1800 car** dans le dossier candidats — un candidat démo-first a pu échapper à la sélection. Ni le lead ni l'architecte n'ont lu `business-rules.md` / `decisions.md` / `patterns.md` intégraux (aucune BR backend touchée par les 13 issues retenues, ce qui limite l'exposition sans l'annuler — vaut surtout pour #67/#88 si réintégrées).
>
> **Pas de branche `sprint/45` créée** (étape 4 du skill volontairement sautée) : leçon S43/S44 — `sprint/43` existe mais n'a jamais servi, S44 a tourné sur un worktree `claude/sprint-44-start-*`. `/sprint start` crée son worktree lui-même.
>
> **Outillage :** `check-prereq.sh` du plugin ai-env est **cassé** (`DISABLED[@]: unbound variable` L61 — bash 3.2 macOS refuse d'étendre un tableau vide sous `set -u`). Contourné manuellement ; `gh` authentifié OK. Correctif à porter en amont du plugin.

---

# Plan S50–S54 — généré le 2026-07-28 (`/ai-env:sprint plan 5`, cohésion moyenne 0.47, validé par le dev)

> Fil directeur : **« Durcir avant d'élargir »** — S50–S52 soldent la dette sécurité (5 des 7 P1 non bloqués), S53–S54 la dette design/E2E. 15 issues / 39 pts retenues sur 98 ouvertes ; ~85 restent au backlog (attendu). **Toutes les issues retenues ancrées code par l'architecte** (grep/read, HEAD fc2a3a0), `possibly_done: false` partout. Rapport intégral : `docs/memory/sprints/plan-s50-s54/architect-report-raw.md`. Mini-plans : `docs/memory/sprints/sprint-{50..54}/architect-plans.md`.
>
> **Décisions dev actées à la validation (2026-07-28) :**
> - **Flyway (RISQUE 1)** : option (a) — job CI smoke `flyway migrate` + `ddl-auto=validate` sur base vierge → **issue #356** (P2/XS, outillage, hors plafond sprint, à absorber en marge). L'option (b) « insérer #88 pour forcer une V16 » est rejetée.
> - **#322** : option (a) **Host canonique au proxy** (pas d'allow-list applicative).
> - **#307 reste BLOQUÉE** (décision produit Option A/B non sollicitée à ce stade) ; bloque aussi #232/#230.
>
> **Arbitrages notables :** #249 traité en S50 (PAS reporté — inconfort des 2 plans précédents purgé) : volets DB/BREVO en vague 1, volet JWT_SECRET fusionné dans la bascule RS256 de #323 (une seule déconnexion globale ; garde-fou : rotation HS256 immédiate si #323 dérape). #67 re-triagée par le code : « XS/frontend » faux → S fullstack, non retenue. #212 (P1) écartée : upload fonctionne, cible S3/MinIO indéterminée, #215 non résolu. #350 à absorber en marge du S51 (code mort vérifié). Labels `sprint-35` retiré de #249 ; milestone « Sprint 36 » = reliquat à ignorer.
>
> **Chemins fantômes corrigés par l'architecte :** #351 (`src/hooks/useTimelineViewport.ts` → `src/components/timeline/useTimelineViewport.ts`, lignes décalées de 2), #331 (`EventEditForm.tsx` à la racine de components/), #60 (préfixe `frontend/` manquant — à valider si planifiée).
>
> **Conflits backlog à respecter si insertion ultérieure :** #347+#348 jamais séparées, #342+#353 jamais séparées, #343/#352 en aval de #340 (S53), #354 groupée avec #347.

## Sprint 50 — 2026-07-28 (Terminé — PR #357, cohésion 0.52, chaîne d'authentification : RS256 en Edge + origine canonique + audit des secrets)
**Objectif :** Rotation des secrets exposés + garde Host + JWT RS256 vérifiable en Edge
**Milestone GitHub :** #50
**Issues :** #249 (P1/S), #322 (P1/M), #323 (P1/M) — 10 pts
**Vagues :** V1 = #249 (audit + runbook + inventaire) ∥ #322 | V2 = #323 + volet JWT_SECRET de #249
**Migrations Flyway :** aucune
**Depend de :** aucune
**Status :** Travail terminé — **PR #357** ouverte vers `dev` (branche `claude/sprint-50-start-9b7161`, pas de branche `sprint/50` — leçon S43/S44 reconduite). Clôture via `/sprint end 50`.
**Commits (7) :** `3f0f1b2` #249 · `bf9dec0` #322 · `1758c0c` #323 · `d7b8049` correctifs review · `44bc3cc` E2E signature · + 2 commits docs
**Tests :** Backend 450/450 · Frontend 788/788 · E2E signature 12/0 · E2E suite complète 96 passed / 8 skipped / 0 failed
**CI :** run 30396766409 sur `b945f4d` — **4 jobs verts** (`backend`, `frontend`, `security`, `e2e`). La 2ᵉ passe E2E appairée a bien tourné sur runner GitHub (12 passed / 26,6 s), ce qui lève la réserve notée à l'audit. `e2e` reste **non requis** sur `dev`.
**Review batch :** 0 CRITIQUE / 3 MAJEUR / 6 MINEUR — tous résolus (`d7b8049`)
**Artefacts :** `docs/memory/sprints/sprint-50/` (4 `issue-*-done.md`, `review-batch.md`, 3 briefings, 3 spawn-refs) · `docs/memory/audits/sprint-50-test-coverage.md` · `docs/memory/audits/secret-exposure-audit.md` · `docs/memory/devops/external-services-inventory.md`
**⚠ #249 reste OUVERTE** — ses 3 critères opérationnels sont inatteignables sans déploiement. Ne pas la fermer en Phase 3 de `/sprint end`.

> **⚠ Trois prémisses du plan infirmées au démarrage — vérifiées, pas supposées. Arbitrages dev du 2026-07-28.**
>
> **1. `#249` n'a aucune cible de rotation.** `secret-rotation-runbook.md` le dit lui-même (« projet pas encore en production », noté 2026-07-12) ; `gh secret list` = **vide**, `gh api .../environments` = **vide** ; aucun secrets-manager, aucun backend déployé. L'exposition historique est en revanche **réelle** : `53175da` portait un `spring.datasource.password` littéral (10 car.) et un `jwt.secret` littéral (128 car.) dans `application.properties` ; `c6ea19e` un secret de test (68 car.). État actuel propre (`${DB_PASSWORD}` / `${JWT_SECRET}`). **`BREVO_API_KEY` n'a JAMAIS été exposée** — 75 fichiers d'historique scannés, aucune valeur littérale opaque, seulement des mentions en prose dans `docs/` (critère d'acceptation « vérifier si exposée » = répondu : non).
> **⇒ Décision dev : périmètre agent = audit d'exposition + correction du runbook + création de l'inventaire manquant. La rotation effective reste au dev, au déploiement prod.** Les critères opérationnels de #249 restent non cochés ; l'issue reste ouverte.
>
> **2. `docs/memory/devops/external-services-inventory.md` N'EXISTE PAS.** Le rapport architecte affirme qu'il existe (« procédure §3quater → la dépendance F3 est levée ») ; `docs/memory/devops/` ne contient que `secret-rotation-runbook.md`. **Chemin fantôme — 3ᵉ sprint consécutif** (S45, S49, S50). Le fichier est créé par #249 dans ce sprint.
>
> **3. `#322` option (a) « Host canonique au proxy » est INAPPLICABLE.** Aucun reverse-proxy dans le repo : `docker-compose.yml` = postgres + backend + frontend, `.github/workflows/` = `ci.yml` seul, aucun nginx/Traefik/Caddy, aucun workflow de déploiement. L'option (a) se réduisait à documenter une exigence de déploiement future en laissant l'open-redirect vivant dans `frontend/middleware.ts:69-73`.
> **⇒ Décision dev révisée : Host canonique par variable d'environnement**, validé **fail-closed** dans le middleware, testable sans infra (unit + E2E avec `Host` falsifié). L'option (b) allow-list reste écartée (maintenance preview/staging).
>
> **4. `#323` : périmètre RS256 plus large que le plan.** `ExportTokenService.java:41-66` est un **second** consommateur de `${jwt.secret}` (signature HS256 des jetons d'export RGPD) ; le plan ne cite que `JwtService.java` + `middleware.ts` + ADR-004. Migrer JwtService seul laisse `jwt.secret` vivant → l'étape « retirer JWT_SECRET de la config » du plan était **inexécutable telle qu'écrite**.
> **⇒ Décision dev : `ExportTokenService` reste HS256 mais sur une clé dédiée `EXPORT_TOKEN_SECRET`** (jetons vérifiés côté serveur uniquement, l'asymétrique n'y apporte rien). Sépare les usages et permet de retirer réellement `JWT_SECRET`. Coût : +1 variable de config, 5 tests d'intégration à mettre à jour.
>
> **Outillage cassé confirmé :** `detect-domain.sh` **se bloque indéfiniment** (timeout 2 min sur #249, aucun retour) — inutilisable, domaines assignés à la main (`auth` pour les 3 issues). `check-prereq.sh` toujours cassé (S45). Aucun `.claude/hooks/` dans ce worktree → le garde-fou `pre-spawn-fullstack.sh` cité par le skill n'existe pas ici.

## Sprint 51 — 2026-07-28 → en cours (démarré 2026-07-29 — cohésion 0.40, frise : bug de rotation + dette d'implémentation)
**Objectif :** Restaurer le scroll à la rotation portrait↔paysage + perf + défauts de review
**Milestone GitHub :** #51
**Issues :** #328 (P1/M), #349 (P2/S), #351 (P3/XS) — 7 pts (+ #350 absorbée en marge, code mort)
**Vagues :** V1 = #328 ∥ #349 | V2 = #351
**Migrations Flyway :** aucune
**Depend de :** aucune (indépendant de S50)
**Status :** **Terminé** — PR **#367** (`sprint/51` → `dev`) **mergée le 2026-07-29**. Milestone Sprint 51
fermé (0 ouverte / 4 fermées). *(Statut rectifié le 2026-08-16 : l'entrée annonçait encore « PR ouverte, en
attente de CI » — cf. l'audit de clôture consigné sous le Sprint 36.)*
**Branche :** `sprint/51` (créée depuis `origin/dev` @ `47730f9`, poussée 2026-07-29)
**Commits :** 12 — 6 de code, 6 d'artefacts
**Tests :** Frontend 821/821 · Backend 452/452 · typecheck OK · `next build` OK · **E2E 97 passed / 0 failed / 8 skipped**
**Reviews :** **2 cycles**
- Cycle 1 (`reviewer` batch, Phase 7) : **0 CRITIQUE / 2 MAJEUR / 5 MINEUR** → 1 MAJEUR + 1 MINEUR corrigés (`8e5e2a8`)
- Cycle 2 (`/review-pr 367`, 3 agents : `reviewer` + `playwright-reviewer` + `ui-design`) : **0 CRITIQUE / 2 MAJEUR / 6 MINEUR** → **tous corrigés** (`e327d67`). Détail : `docs/memory/sprints/sprint-51/review-cycle-2.md`

> **⚠ Le cycle 2 a trouvé deux défauts DANS LE CORRECTIF DU LEAD — dont un que deux reviewers ont
> relevé indépendamment.** Le cycle 1 avait relu le diff au commit `1f00995` ; **trois commits de code
> lui étaient postérieurs et n'avaient jamais été relus**, dont le correctif E2E que j'avais écrit.
> 1. **Mon garde-fou mesurait le mauvais axe.** Il validait `maxScroll > 0` en **portrait**
>    (`clientWidth` 340) pour protéger une assertion portant sur le **paysage** (794). Fenêtre morte
>    `340 < rail ≤ 794` : garde vert, assertion rouge — exactement la pathologie qu'il prétendait
>    éliminer. Corrigé en `scrollWidth > LANDSCAPE_SHORT.width`.
> 2. **Mes 2 clics de zoom n'étaient pas attendus** (aucune assertion sur `timeline-zoom-level`,
>    contrairement au test voisin). Flake réel : si le commit React du 2ᵉ clic atterrit après
>    `setViewportSize`, le paysage mesure l'échelle `month` → rail 732 vs 794 → échec.
> 3. **Deux affirmations de mon commentaire étaient fausses** : `totalDays` est un **minorant**
>    (`≥ 61`, le compte `PROD` est partagé par 6 specs), et « les deux assertions se contredisaient
>    quel que soit le code » n'était vrai **qu'à volume minimal** — d'où le caractère intermittent.
>
> **Un MINEUR du cycle 1 a été clos À L'INVERSE de sa recommandation :** `ui-design` tranche qu'il
> faut **garder** `aria-hidden` ET `role="presentation"` sur les cales — ils agissent à des étages
> différents, et certaines versions d'axe-core évaluent le rôle structurel **avant** de filtrer les
> nœuds `aria-hidden`, ce qui explique le défaut initial.
>
> **La suspicion du lead sur le 2ᵉ site d'appel du cache de zoom est levée** : `scaleEventPositions`
> ne consomme jamais `zoom.level`, donc `${dayWidth}` seul y est correct — l'asymétrie avec
> `buildRulerTicks` (qui lit `MAJOR_TICK_UNIT[level]`) est justifiée, pas un oubli.

### Bilan d'exécution

| Issue | Commit | Objet |
|---|---|---|
| #328 | `5210ed5` | `scrollLeft` hissé hors du DOM via ref callback stable (snapshot au détachement / restore à l'attachement) |
| #349 | `1cb6031` | `React.memo` sur les lanes + `zoom.ts` scindé (passe invariante / passe d'échelle) + cache par niveau |
| #350 | `72e74e7` | Suppression de `TimelineCalendar.tsx` (114 l.) + 4 références |
| #351 | `c75efd7` | `role="presentation"` sur les cales + tri de l'écouteur `scroll` par `contains` |
| — | `8e5e2a8` | Corrections post-review : clé de cache de zoom composite + test de présence |

**Vagues exécutées :** V1 = #328 ∥ #349 (fichiers disjoints, commits vérifiés **isolés**, aucune contamination croisée) · V2 = #351 ∥ #350 · puis test-runner → reviewer batch → correctif.

> **⚠ Deux énoncés d'issue infirmés par la mesure — conservés tels quels.**
> 1. **Le correctif prescrit par #351 était FAUX.** L'issue demandait de cibler `scrollEl` plutôt que
>    de capturer sur `window`. Implémenté puis mesuré : **2 tests rouges** — cibler le scroller seul
>    perd la page ET tout ancêtre défilant, or la position visible dépend des trois. Livré à la
>    place : capture `window` conservée + tri par `target.contains(scrollEl)` dans le handler.
>    **Le risque que l'issue nommait elle-même s'est matérialisé sur la solution qu'elle proposait.**
> 2. **Le diagnostic de #349 était partiel.** L'issue postulait un coût au franchissement de bande de
>    virtualisation. Mesure : le re-rendu complet a lieu **à chaque frame de scroll** (synchronisation
>    de la minimap). Le correctif porte sur la bonne cause.

> **⚠ Prémisses du plan architecte : toutes vérifiées, toutes confirmées — première fois depuis 4 sprints.**
> Contrôle systématique après S45/S49/S50 (chemins fantômes). Les 10 fichiers cités existent, et les
> 3 mesures clés (`useTimelineViewport.ts:206`, cales à `TimelineView.tsx:757`/`:850`, `viewportStart`
> hissé ligne 91) sont exactes. Le seul chemin fantôme — `frontend/src/hooks/useTimelineViewport.ts`
> dans l'énoncé de #351 — **avait déjà été corrigé par l'architecte au plan**.
> **En revanche les numéros de ligne ont dérivé en cours de sprint** : #349 a fait passer
> `TimelineView.tsx` de 879 à 1113 lignes, invalidant les positions données à #351. Consigne de
> localiser par `grep` et non par numéro injectée dans le briefing de la vague 2 — piège évité.

> **Découvertes non anticipées par le plan :**
> 1. **#328 — l'effet de centrage initial était déjà inopérant.** `useEffect(..., [])` dans
>    `useTimelineMobileState` s'exécutait sur le DOM **desktop** (`useMediaQuery` SSR-safe rend `false`
>    au 1er rendu → `scrollRef` null) : no-op silencieux, jamais détecté.
> 2. **#350 contredit une note d'archive du S42.** `Lane`/`EventBar`/`EventContent` **ne sont pas
>    orphelins** : montés via `TimelineEditHost` → `dashboard/page.tsx` et `timeline/page.tsx`.
>    L'archive n'a pas été réécrite.
> 3. **MAJEUR de review — fausseté silencieuse évitée.** Le cache des graduations était clé sur
>    `dayWidth` seul alors que `buildRulerTicks` consomme aussi `zoom.level` ; la justesse ne tenait
>    qu'à un invariant tacite non gardé (valeurs de `DAY_WIDTH_PX` deux à deux distinctes). Corrigé
>    par clé composite + test qui **échoue avec l'ancienne clé** (vérifié par revert : 10 graduations
>    au lieu de 63).

> **⚠⚠ L'E2E a rattrapé ce que 821 tests unitaires laissaient passer — l'épisode central du sprint.**
>
> **Deux fausses conclusions du lead, corrigées par la mesure et consignées :**
> 1. J'ai d'abord écrit que l'E2E était **bloqué** (images docker antérieures au RS256, base locale
>    en V6 contre V15). **Faux sur le fond** : le runbook du S47 démarre le backend via **`mvnw`,
>    sans docker**, sur la base dédiée **`eventmanager_e2e`** — déjà en V15. Aucune migration n'a été
>    appliquée. La base de dev en V6 n'a **jamais** été un obstacle. Le test-runner et moi avions
>    suivi la piste docker, qui est une impasse.
> 2. Ma piste de correctif (« le layout n'est pas prêt à l'attachement de la ref, il faut un `rAF` »)
>    a été **écartée par instrumentation** en Chromium réel : `scrollWidth` 732 / `clientWidth` 340 à
>    l'attachement, écriture 190 relue 190. Le layout était disponible ; `rAF`/`useLayoutEffect`
>    n'auraient rien changé.
>
> **Ce que l'exécution a révélé.** Premier run : **96 passed / 1 failed**, et l'unique échec de toute
> la suite était **exactement** le test de rotation de #328 — dont les 4 tests unitaires étaient
> verts. Diagnostic mesuré : **le TEST était faux, pas le code.** Il exigeait **simultanément**
> `scrollLeft > 0` et `scrollLeft ≈ min(392, maxScroll paysage)` ; or au zoom par défaut le rail fait
> 61 j × 12 px = **732 px** contre un `clientWidth` paysage de **794** → le rail entre en entier,
> `maxScroll = 0`, les deux assertions se contredisent. **Le test échouait quel que soit le code.**
> **Contre-preuve** : sur un rail élargi (2 crans de zoom, rail 5 856 px), le code de `5210ed5`
> conserve la position **sans aucune modification**. Corrigé en `49fc3e2` → **97 passed / 0 failed**.
>
> **[MEMORY:pitfall] jsdom ne fait pas de layout ET ne clampe pas `scrollLeft`** (`scrollWidth = 0`) :
> tout test unitaire de restauration de scroll **passe trivialement sans rien prouver** — on écrit
> 400, on relit 400, quel que soit l'état réel du DOM. Les 4 tests de rotation ont été **conservés**
> (ils attestent le câblage : nœud DOM réellement différent, valeur transportée) mais leur portée est
> désormais délimitée par un bloc de tête explicite. **Exiger un E2E pour toute assertion de scroll.**
>
> **[MEMORY:pitfall] Un test E2E de scroll dépend de la géométrie de sa fixture.** Une assertion
> `scrollLeft > 0` n'a de sens que si `scrollWidth > clientWidth` **dans le viewport visé**. Poser un
> garde-fou `maxScroll > 0` **avant** de mesurer, sinon l'échec survient 20 lignes plus loin en
> accusant le code.
>
> **[MEMORY:pitfall] Commentaire de code démenti par la mesure** (corrigé en `122e245`) : « on sauve
> l'état DOM AVANT sa perte » était faux — la trace au détachement montre `scrollLeft: 0`,
> `scrollWidth: 794`, `clientWidth: 794` : la valeur est **déjà clampée par le relayout de rotation
> avant le démontage React** (392 → 0). Le report marche par **idempotence du clamp**, pas par mise
> à l'abri.
>
> **Réserves qui subsistent réellement :** `role="presentation"` non asserté (cales jamais montées en
> jsdom, aucun test ne les cible) · **aucun outil d'audit a11y** dans `frontend/package.json` →
> critère n°2 de #351 **non tenu** · #351 **partielle à l'échelle de l'app** (4 cales mobiles non
> corrigées) · mesures de #349 prises en **Storybook dev**, pas en build de production · cas « ancêtre
> défilant » de #351 non couvert par une spec dédiée (aucun tiroir Radix réel) · **rotation SANS
> changement de variante** (844×520 → 844×390) : aucun détachement de ref → **aucune restauration ne
> tourne**, trou probable · **arbitrage produit ouvert** : après un aller-retour où le paysage force
> 0, faut-il rendre la position d'origine (« collante ») ou garder 0 (clamp chaîné) ? La spec encode
> le clamp chaîné.

> **Piège d'outillage — RTK, 3 manifestations distinctes ce sprint** (après `git diff` au S50) :
> `git diff`, `wc -c`, et `vitest`/`grep` **même redirigés** renvoient vide ou 0. Contournement :
> `rtk proxy <cmd>`. A produit **une mesure fausse du lead ce sprint** : l'heuristique de couverture
> E2E de la Phase 8 a d'abord signalé 10 testids « sans spec » — analyse refaite en Python : les 10
> apparaissent **aussi en ligne `-`**, ce sont des **déplacements** dus à la réécriture de #349, pas
> des ajouts. Aucun testid réellement nouveau.
> Confirmé également : `detect-domain.sh` **bloque indéfiniment** et `check-prereq.sh` est cassé
> (domaine `events` assigné à la main) · **aucun `.claude/hooks/`** dans ce worktree → le garde-fou
> `pre-spawn-fullstack.sh` cité par le skill **n'existe pas ici** · **aucun `.ai-env/rules-jit/`** et
> **aucun pack `pit-*`** → les briefings sortent sans pitfalls injectés (lacune préexistante).

> **Hygiène :** `frontend/.eslintcache` est **tracké par git alors qu'il figure dans
> `frontend/.gitignore:8`** (le `.gitignore` ne s'applique pas rétroactivement). Il a dérivé **3 fois**
> pendant le sprint ; restauré à chaque fois, jamais commité.

> **Saturation contexte lead : non mesurée** (pas d'instrumentation). Ordre de grandeur : 7 agents
> (4 fullstack-dev, 1 test-runner, 1 reviewer, 1 fullstack correctifs) ≈ **700 K tokens** côté
> subagents. Le pattern artefact + purge a tenu : aucun retour brut rechargé. Les briefings de 43-45 Ko
> n'ont pas été chargés en contexte lead — passés par lecture imposée du fichier committé + checkpoint
> `pack_lu: OUI — <pack> §<section réelle>` ; **les 4 agents ont cité une section réelle**.

**Follow-ups détectés (à arbitrer en Phase 4 de `/sprint end 51`) :**
  - Défaut a11y identique **non corrigé sur 4 cales mobiles** (`TimelineMobilePortrait.tsx` ~203/~281, `TimelineMobileLandscape.tsx` ~216/~294) [XS | frontend] (#351)
  - **[MAJEUR de review, non corrigé]** mutation de refs **pendant le rendu** (`cache.current`, `windowCacheRef`, `tRef`, `metricsRef`) — bénin aujourd'hui, fragile en mode concurrent réel [S | frontend]
  - Committer le **pilote Playwright du banc perf** sous `frontend/scripts/` — protocole ADR-007 décrit mais **non versionné**, donc non rejouable [XS | frontend] (#349)
  - `syncViewportFromScroll` déclenche un `setState` **par frame** de scroll ; `viewportStart` en variable CSS supprimerait le re-rendu résiduel [S | frontend] (#349)
  - Doublon `sameMetrics`/`metricsRef` (`TimelineView.tsx`) vs `metricsEqual` (`useTimelineViewport.ts:171`) — ceinture volontaire, à réduire après mesure [XS | frontend] (review)
  - Redondance `role="presentation"` + `aria-hidden` sur les cales — retirer `aria-hidden` exige une vérification navigateur [XS | frontend] (review)
  - Identité figée de `translate` : catalogue i18n changeant sans changement de `locale` → `aria-label` périmés sur les lanes mémoïsées [XS | frontend] (review)
  - Branche de report **par fraction** (`useTimelineMobileState.ts:239-245`) non couverte par les 4 tests de rotation [XS | frontend] (review)
  - **Aucun outil d'audit a11y** dans `frontend/package.json` — bloque le critère n°2 de #351 [S | frontend]
  - `frontend/.eslintcache` **tracké malgré le `.gitignore`** → `git rm --cached` [XS | infra]
  - **Images docker `mytimeline-*` antérieures au RS256** (2026-07-11) : le chemin docker de la stack E2E est mort, seul le chemin `mvnw` du runbook S47 fonctionne — à rebuilder ou à documenter comme abandonné [S | devops]
  - Note d'archive S42 à annoter : `Lane`/`EventBar`/`EventContent` **ne sont pas orphelins** [XS | doc]
  - **Rotation sans changement de variante** (844×520 → 844×390) : aucun détachement de ref, donc aucune restauration — trou de couverture probable de #328 [S | frontend]
  - **Arbitrage produit** : après un aller-retour où le paysage force `scrollLeft` à 0, rendre la position d'origine (« collante ») ou garder 0 (clamp chaîné) ? [S | produit]
  - `auth.setup.ts` ne retente que sur **429**, pas sur un **500** de rendu : un seul 500 transitoire du serveur de dev Next tue tout le run [S | frontend]
  - **⚠ `auth-signature.spec.ts` : les 8 tests `skipped` sont TOUS conditionnés à `AUTH_JWT_PUBLIC_KEY` / `E2E_JWT_PRIVATE_KEY`** → en CI les deux `describe` RS256 sautent entièrement, donc **la vérification de signature durcie au Sprint 50 n'est couverte par aucun test en CI** ; seul `auth-guard.spec.ts` (présence de cookie) l'est. Trou silencieux à rendre bruyant [M | devops] — **le plus important de cette liste** (review cycle 2)
  - **`@axe-core/playwright`** pour tenir le critère a11y de #351 : Playwright 1.61 déjà en devDep, `test:e2e` déjà câblé → 1 dépendance + ≈15 lignes de helper, sur un jeu de données dépassant `LANE_VIRTUALIZATION_MIN_ROWS` pour que les cales soient montées [S | frontend] (review cycle 2)
  - Même fuite de mock Fullscreen dans `TimelineView.test.tsx:23-24` (un seul fichier visé par la correction du cycle 2) [XS | frontend]
  - **Couplage au volume du compte partagé `PROD`** : `seededEvent(...).toHaveCount(1)` (`timeline-mobile.spec.ts:129,328`) dépend de `LANE_VIRTUALIZATION_MIN_ROWS = 60` ; `PROD` gagne ~1 lane par test sur 6 specs — précondition ni posée ni assertée [S | frontend] (review cycle 2)

> **Note de démarrage — la commande demandée était `/sprint start 60`.** Le Sprint 60 n'existe pas :
> aucun label `sprint-60` (les labels s'arrêtent à `sprint-54`), aucun milestone « Sprint 60 »
> (milestones ouverts : 36, 51, 52, 53, 54), aucune issue, aucune entrée d'historique.
> Dernier sprint terminé = S50 (PR #357). Bascule sur **S51**, prochain de la séquence, sur arbitrage dev.

> **Prémisses du plan architecte vérifiées au démarrage — toutes confirmées, aucun chemin fantôme.**
> Contrôle systématique après 4 sprints consécutifs de chemins inventés (S45, S49, S50, S51-plan) :
> `useTimelineMobileState.ts` (230 l.), `TimelineResponsive.tsx` (104 l.), `TimelineView.tsx` (879 l.),
> `useTimelineViewport.ts` (282 l.), `TimelineView.perf.stories.tsx`, `stress-fixtures.ts`,
> `TimelineCalendar.tsx` (114 l.), `ADR-007-virtualisation-timeline.md` — **tous présents**.
> Mesures exactes : `window.addEventListener('scroll', schedule, { passive: true, capture: true })`
> bien à `useTimelineViewport.ts:206` · cales `data-testid="timeline-lane-spacer"` à `TimelineView.tsx:757`
> et `:850` (l'issue #351 annonce 754/847 — décalage de 3, l'architecte annonçait 756/849) ·
> `viewportStart` hissé à `useTimelineMobileState.ts:91`, `scrollLeft` resté DOM-only (lignes 140, 173, 183),
> `scrollToToday` câblé au seul montage (ligne 188) — **cause du bug #328 confirmée par lecture, pas supposée**.
> **Chemin fantôme de l'issue #351 confirmé et déjà corrigé par l'architecte :** l'issue cite
> `frontend/src/hooks/useTimelineViewport.ts` qui **n'existe pas** ; le vrai chemin est
> `frontend/src/components/timeline/useTimelineViewport.ts`.

## Sprint 52 — 2026-07-29 (RE-PLANIFIÉ puis Terminé — cohésion 0.44, focus lisible, header tablette, README)
**Objectif :** Découpler `focus:` dans 5 menus déroulants + solder le débordement du header au palier tablette + README racine de démarrage
**Milestone GitHub :** #52 (« MVP local 1/3 — Cohérence visuelle, shell unifié, README de démarrage »)
**Issues livrées (3) :** #346 (P1/S), #347 (P2/S), #372 (P2/S) — 6 pts
**Vagues exécutées :** V1 = #346 ∥ #347 ∥ #372 (les 3 en parallèle, intersection des fichiers vide) — pas de V2
**Correctifs de suivi (hors vague) :** `df93b63` (régression démasquée par #346) · `9350a77` (échec CI de #347)
**Migrations Flyway :** aucune — aucun fichier Java touché
**Depend de :** rien (S49/S50/S51 mergés)
**Branche :** `sprint/52` créée sur `dev` à `473ed65`, rebasée sur `a2d8e8e` (PR #373) avant merge
**Commits :** 18 · **Tests :** Backend **452/452** · Frontend **825/825** · **E2E CI 106/106**
**Reviews :** reviewer batch — **0 CRITIQUE / 0 MAJEUR / 0 MINEUR**
**CI :** run `30454839483` sur `e46a979` — **4 jobs verts** (`backend`, `frontend`, `security`, `e2e`)
**Nouveaux artefacts mémoire :** `PIT-S52-001` à `PIT-S52-007` · `PAT-S52-001` · `DEC-S52-001` à `DEC-S52-004`
**Note sur les issues de suivi :** #446 porte un critère d'acceptation **ajouté par le
project-manager** sur `.mt-sheet` / `.mt-actionsheet` — ils portent le même token `--z-modal`, donc
le bug peut se rejouer sur deux autres surfaces ; à corriger ou à démontrer hors risque. #448 note
que la correction HiDPI **ne sera jamais exercée en CI** tant que `deviceScaleFactor` reste à 1, ce
qui rend le test unitaire à `dpr: 3` non optionnel. À l'inverse, le PM signale n'avoir **pas relu les
fichiers sources** : les numéros de ligne et valeurs mesurées inscrits dans les 3 issues viennent des
artefacts du sprint, non revérifiés par lui.

**Status :** Terminé — PR #374

> **⚠ Deux régressions attrapées avant merge — aucune par la CI seule.**
> 1. **Invisible en test unitaire.** #346 a rendu la **locale active du sélecteur de langue illisible au
>    focus** : elle porte `bg-accent text-accent-foreground` sans variante `focus:`, donc le nouveau fond
>    clair laissait une encre claire. **1,23:1 en clair / 1,28:1 en sombre**, sur une page publique — le mode
>    de défaillance exact du S48 (4 CTA invisibles). Deux E2E l'ont détecté. **La piste de correction
>    proposée par le rapport de #346 a été écartée après mesure** : elle donnait 4,71:1 mais un delta de
>    surface repos→focus **nul**, rendant l'item actif indistinguable. Retenu : `text-accent-ink` +
>    `focus:bg-accent-hover` → **6,08:1 / 8,78:1**, delta de surface 1,29:1. Cf. `DEC-S52-002`.
> 2. **Invisible sur macOS.** Le test **neuf** de #347 a fait tomber la CI sur **1 pixel** à 320 px en `de`.
>    Verdict **mesuré** : la même spec exécutée contre `origin/dev` dans l'image Playwright jammy sort
>    l'erreur identique → **défaut PRÉ-EXISTANT, révélé et non causé** par #347. #334 (S49) l'avait manqué
>    en mesurant depuis macOS. Correctif appliqué au **palier** et non à la locale (`es` était à 4 px du même
>    basculement) : marge portée de −1 px à **16 px** dans les 4 locales, cible tactile 44 px préservée,
>    **test non affaibli** (ni tolérance, ni skip, ni locale retirée). Cf. `PIT-S52-001`, `DEC-S52-004`.

> **⚠ 28 échecs E2E locaux qui n'étaient PAS une régression — et une réserve tenue jusqu'à la mesure.**
> Le `test-runner` a remonté 28 échecs, tous sur `GET /auth/me` → 404. Le lead a **refusé de les déclarer
> environnementaux sans preuve** et a écrit la condition de merge dans l'audit et la PR. La CI a tranché :
> **105 passed / 1 failed**, aucun 404. Cause locale confirmée (paire JWT éphémère + piles Docker
> concurrentes entre agents ; un agent a mesuré le backend d'un autre — `PIT-S52-002`).
> **Mais le cadrage du lead était incomplet** : le raisonnement « c'est du CSS donc ça ne peut pas casser
> l'auth » regardait du mauvais côté — le vrai défaut n'était pas dans l'auth mais dans un test que le
> sprint venait d'ajouter. C'est la CI qui l'a montré, pas le lead.

> **⚠ Erreur du lead, propagée puis corrigée (`2c38cbb`).** L'architecte a déclaré
> `deploiement-profils.md` « chemin fantôme » sur la foi d'un `ls` d'un **seul** dossier ; le lead l'a repris
> dans `sprint-history.md`, `architect-plans.md` et un message de commit, **en y ajoutant « 5ᵉ sprint
> consécutif » de son propre chef**. Le fichier existe, sous `docs/runbook/` — seul le répertoire cité par
> l'issue était faux. **La série de « chemins fantômes » des sprints S47→S51 mérite d'être relue avec ce
> biais en tête.** Cf. `PIT-S52-006`.

> **Prémisses d'issues infirmées avant tout code :** `HELP.md` n'est pas suivi par git (`.gitignore` ligne 1),
> l'AC de #372 était déjà satisfaite · le piège CORS de #372 était mal énoncé (le CORS est figé **à** `:3000`,
> c'est un front sur un autre port qui prend le 403 déguisé en rate-limit) · **`en` ne débordait pas** à
> 768 px alors que l'AC de #347 liste les 4 locales — le cas trompeur qui aurait validé un faux correctif ·
> un 4ᵉ piège non prévu trouvé : healthcheck `frontend` du compose `unhealthy` à vie (`PIT-S52-005`).

> **Réserves assumées :** **Firefox et WebKit non testés** alors que toute la conformité WCAG 2.4.7 du
> correctif repose sur le contour `:focus-visible` · modalité pointeur pure (`:focus-visible = false`) non
> corrigée, seul retour = delta de surface 1,29:1 · `select.tsx` / Checkbox / Radio / SubTrigger corrigés
> mais **jamais rendus au navigateur** (aucun consommateur dans le dépôt) · marge nulle du header à 1024 px
> avec logo sur 2 lignes en `fr`/`es`, **pré-existant, mesuré identique avant/après** · palier ≥ 1280 px non
> vérifié · rendu visuel du CTA resserré non inspecté à l'œil, seules les largeurs sont mesurées.

> **Saturation contexte lead : non mesurée** (pas d'instrumentation). Ordre de grandeur : 9 agents
> (1 architect, 3 fullstack V1, 1 fullstack correctif #346, 1 test-runner, 1 reviewer, 1 fullstack correctif
> #347, 1 project-manager) ≈ **760 K tokens cumulés côté subagents**. Le pattern artefact + purge a tenu.

**Absorbé en cours :** 2 correctifs hors périmètre initial intégrés avant merge (`df93b63` régression
démasquée par #346 · `9350a77` échec CI révélé par le test neuf de #347) — tracés dans
`issue-346-followup-done.md` et `issue-347-followup-done.md`.

**Follow-ups arbitrés (Phase 4 triage — 8 items, 0 discard) :**
  - Firefox/WebKit `:focus-visible` [S | frontend] → **#375** — *la seule conformité revendiquée mais non vérifiée du sprint*
  - Healthcheck `frontend` du compose → `127.0.0.1` [XS | infra] → **#376**
  - `frontend/README.md` encore le stub `create-next-app` [XS | docs] → **#377**
  - Renommer `landing.hover-pairing.test.ts` [XS | frontend] → **#378**
  - Header 1024 px : marge nulle + logo sur 2 lignes en `fr`/`es` [S | design] → **#379**
    (⚠ **conflit de fichier avec #348** — même ligne `HeaderSection.tsx:86` : même lot ou séquencées, jamais en parallèle)
  - **Résolus pendant le sprint, non soumis au triage :** `RECOMMAND_FOLLOWUP` locale active illisible
    (→ `df93b63`) · anneau de focus sur les items de menu (**sans objet** : `:focus-visible` global existait
    déjà, cf. `PIT-S52-004`) · `RECOMMAND_TEST_RUNNER` suite backend (→ lancée, **452/452**)
  - **Aucun milestone attaché** : « Sprint 53 » porte déjà 10 issues ouvertes, très au-dessus du plafond
    de 3 du projet — 5 items de plus le rendraient inutilisable comme outil de planification.
  - **Ratio discard : 0/8.**

> **⚠ Le plan initial de ce sprint (2026-07-28, ancrage `fc2a3a0`) est PÉRIMÉ et a été remplacé.**
> Il ciblait #102 (P1/M), #134 (P2/S), #148 (P2/S) — « rate-limiting distribué et politique
> d'authentification », cohésion 0.47. Le **2026-07-29 à 10:47**, le milestone GitHub « Sprint 52 » a été
> entièrement re-scopé : #102 et #134 déplacées vers « Mise en ligne (GELÉ — hébergeur à définir) »
> (l'issue #369 conditionne explicitement le sort de #102 à la topologie d'hébergement retenue), #148
> déplacée vers le milestone Sprint 53, et 9 issues design/frontend attachées à la place.
> **Arbitrage du dev au lancement : le milestone fait foi** (MEMO-011 — source unique de tracking) ;
> les labels `sprint-52` résiduels sur #102/#134/#148 ont été retirés, le label `sprint-53` résiduel
> sur #346 également. Mini-plans re-générés dans `docs/memory/sprints/sprint-52/architect-plans.md`.

> **Prémisses d'issues infirmées par l'architecte au HEAD `473ed65`, avant tout code :**
> · **#372** — `HELP.md` **n'existe nulle part** dans le dépôt (son AC « HELP.md supprimé » est déjà
>   satisfaite). Raison trouvée à l'exécution : **`.gitignore` ligne 1 = `HELP.md`**, il est ignoré
>   depuis le scaffold Spring Initializr.
>   ⚠ **L'architecte affirmait aussi que `docs/ops/deploiement-profils.md` n'existait pas — cette
>   réfutation était FAUSSE, et le lead l'a propagée** dans ce fichier, dans `architect-plans.md` et
>   dans le message du commit `8fb2289` (« chemin fantôme pour le 5ᵉ sprint consécutif »).
>   **Le fichier existe** : `docs/runbook/deploiement-profils.md` (8,9 Ko). Seul le *répertoire* cité
>   par l'issue était erroné. Infirmé par le fullstack-dev de #372, re-vérifié par le lead
>   (`find docs -iname "deploiement-profils*"` → 1 résultat).
>   **Leçon (`PIT-S52`) :** ne jamais conclure « chemin fantôme » sur un `ls` d'un seul dossier —
>   `find` sur l'arborescence avant de déclarer un fichier inexistant. La série de « chemins fantômes »
>   des sprints précédents mérite d'être relue avec ce biais en tête.
> · **#341** (écartée) — sa mesure de référence n'est **pas reproductible** : 0 `<g>` dans tout
>   `frontend/src/`, 0 `<svg>` inline dans la landing (les 3 SVG passent par `<Image src>`, DOM non
>   traversable). Budget d'investigation inconnu → non planifiée.
> · **#348** (écartée) — le logo est à `HeaderSection.tsx:86`, **pas `:54`**. Et son AC « aucune classe
>   `text-4xl`/`text-5xl` » entre en tension avec le `h1` du hero qui en porte déjà deux : `@theme`
>   *étend* Tailwind au lieu de le remplacer, donc ces classes résolvent bien (36/48 px). À arbitrer.
> · **#353** (écartée) — `h-9 w-9` ligne 52 et chaîne en dur ligne 54, **pas ligne 29**.
> · **#338** (écartée) — `legal.json` ne contient que `terms`/`privacy` : **aucun corps juridique**.
>   Bloquée hors périmètre technique, conforme à son propre body.
> · **#299** (écartée) — *nuance en sa faveur* : `settings/` ne contient qu'un `page.tsx`, donc le risque
>   « sous-routes profondes » de son body est **caduc**. À replanifier au S53 avec `ui-design` en vague 0.
> · **#346** — mini-plan du S53 re-vérifié **sans aucune dérive de ligne** (5 emplacements exacts).

## Sprint 53 — 2026-07-28 → 2026-07-29 (Terminé — merge PR #382 dans dev — cohésion 1.00 après retrait de #346, dette de cascade CSS)
**Objectif :** Layerisation `h1..h6` + audit des CSS non-layerisés restants
**Milestone GitHub :** #53
**Issues (2) :** #339 (P2/S), #340 (P2/S) — 4 pts
**Vagues :** V1 = #339 seule | V2 = #340 (dépend de la méthode de layerisation validée en V1)
**Migrations Flyway :** aucune
**Branche :** `sprint/53` créée sur `origin/dev` à `2966994` (merge PR #374)
**Depend de :** aucune — ⚠ vérification navigateur clair+sombre OBLIGATOIRE (jsdom aveugle, pitfall S48)
**Commits :** 6 sur `sprint/53` — `40665fc` (#339) · `a4c4a6c` (#340) · `f5c09c8` (artefacts) · `3bd635a` (**correctif régression**) · `ed111c8` (leçon de la régression) · `42bb835` (consolidation mémoire + triage) — puis `e33da7f` en PR de suivi #386 (statut)
**Tests :** Frontend **836/836** · Backend **452/452** · **CI 4/4 verts** (dont `e2e`, 5m51s)
**Reviews :** reviewer batch — **0 CRITIQUE / 0 MAJEUR / 1 MINEUR**
**Nouveaux artefacts mémoire :** `PIT-S53-001` à `PIT-S53-006` · `PAT-S53-001`, `PAT-S53-002` · `DEC-S53-001` à `DEC-S53-004`
**Status :** **Terminé** — PR #382 mergée dans `dev` le 2026-07-29 (commit de merge `b0b2f19`).
Milestone #53 fermé (2 issues, 0 ouverte — 9 issues de backlog **détachées** avant fermeture, elles n'ont
jamais fait partie du périmètre). Issues #339 et #340 fermées.

**Follow-ups arbitrés (Phase 4 triage — 6 items, 3 issues, 2 discard, 1 déjà résolu) :**
  - `:focus-visible` hors layer : annule `outline-none` sur ~14 sites + impose un `border-radius`
    [M | design] → **#383** (backlog libre) — ⚠ **lié à #375**, elles se contraignent mutuellement :
    `language-selector.tsx:54` dépend du caractère hors-layer (unique indicateur de focus), donc corriger
    #383 sans traiter #375 supprimerait ce que #375 cherche à valider. Même lot, ou #375 d'abord.
  - `FeaturesSection.tsx:41` double lévitation au survol, **−18px au lieu de −10** (`hover:-translate-y-2`
    compile vers `translate` en TW4 et se **compose** avec `transform:translateY(-10px)`)
    [XS | landing] → **#384** (backlog libre)
  - `ds/styles.css` importé par personne [XS | design] → **#385** (backlog libre)
  - Layerisation globale des ~770 lignes `ds/components/*.css` [L | design] → **discard** — 0 conflit réel
    mesuré, arbitrage déjà consigné en `DEC-S53-003` ; une issue serait du bruit.
  - Mapper `--tracking-*` dans `@theme` [XS | design] → **discard** — reposait sur une **prémisse fausse du
    lead** ; mesuré sans effet visuel, annulation demandée par le fullstack-dev lui-même.
  - Layeriser `time, .mono, [data-mono]` [XS | design] → **déjà résolu dans le sprint** : #340 a mesuré
    2 sites posant tous deux `font-mono`, dérive **nulle**, verrou de l'AC appliqué.
  - **Aucun milestone attaché** : « Sprint 54 » porte déjà **8** issues ouvertes, très au-dessus du plafond
    de 3 du projet — même arbitrage qu'au S52. **Ratio discard : 2/6** (33 %, sous le seuil d'alerte de 50 %).
  - Label `accessibility` **inexistant** dans le dépôt → non appliqué à #383 (signalé, non créé d'office).

> **⚠ Régression introduite par la 1ʳᵉ passe de #339, attrapée par la SEULE CI E2E.** Layeriser les
> **5** propriétés en bloc faisait céder `line-height` devant l'appariement porté par les utilitaires
> `text-*` (Tailwind 4 pose `line-height: var(--tw-leading, var(--text-lg--line-height))`, défauts émis
> dans `@layer theme` que notre `@theme inline` ne remappe pas). Mesuré : `h2.text-lg`
> **29,16px (1.08) → 42px**, `h1.text-xl` **37,8px → 49px**. **28 titres** portent `text-*` sans
> `leading-*` explicite → dérive **systémique et silencieuse** du rythme typographique.
> Symptôme : `e2e/settings-mobile.spec.ts:19` rouge (le sheet de suppression, grandi d'environ 13px par
> titre, interceptait au centre du viewport le clic destiné au backdrop). **Reproductible** — 1ʳᵉ passe,
> retry Playwright *et* rerun complet — alors qu'`origin/dev` était vert 2 fois sur ce même job et que
> `settings-mobile` n'avait **jamais** échoué (S52 : `landing-mobile-menu` ; S51 : `timeline-mobile`).
> Correctif `3bd635a` : `line-height` **sorti du layer**, seul ; les 4 autres y restent.
>
> **Trois leçons.** (1) **`ui-design` avait raison et le lead l'a écrasé** : son verdict disait
> `line-height : RESTE GAGNANTE` ; le lead a imposé « les 5 en bloc » en croyant que mapper
> `--leading-*` suffisait — le mapping gouverne les utilitaires `leading-*`, **pas** l'appariement de
> `text-*`. Écraser la réserve précise d'un spécialiste demande une preuve, pas une inférence.
> (2) **Le test AST de 11 tests n'a rien vu** : il prouve l'appartenance à un layer, pas une valeur
> gagnante sur un élément réel — 2 tests ajoutés, validés par mutation. (3) **La vérif navigateur sur la
> landing était verte** parce que ses titres portent `leading-tight` **explicite**, précisément les 6
> seuls protégés du dépôt ; tout le risque était sur les surfaces non atteignables en local.

> **⚠ Un rapport `test-runner` écarté après contre-mesure.** Il annonçait `814/821`, une suite en échec
> sur `eslint-plugin-storybook` et « `base-layer.test.ts` : 2 tests ». **Les trois chiffres sont faux** :
> le paquet est déclaré *et* installé, la suite donne **834/834** (puis 836), le fichier contient **11**
> tests (puis 13). Cause : cwd sur le **dépôt principal** au lieu du worktree. Les implémenteurs, eux,
> avaient le garde-fou worktree en tête de briefing et n'ont pas dévié.

> **Prémisses infirmées avant tout code.** #339 citait `FooterSection.tsx:41` → le vrai emplacement est
> **43, 63 et 78** (trois occurrences). #340 postulait des sélecteurs d'**élément** hors layer → il n'en
> existe **aucun** en tête de sélecteur dans ses 7 fichiers ; le vrai défaut portait sur les **classes**
> hors layer. **Et une erreur du lead** : j'affirmais que `leading-tight` rendait 1.25 et que mapper
> `--leading-*` était une « condition de non-régression » — faux, `ds/tokens/typography.css` déclare ces
> tokens dans un `:root` **hors layer** homonyme du namespace `@theme`, donc la valeur DS **1.08 gagnait
> déjà**. Corollaire : les « 11 sites impactés » que j'annonçais pour `--tracking-*` ne bougeaient pas.

> **⚠ #346 RETIRÉE du périmètre — NO-OP confirmé, pas supposé.** Le plan de l'architecte
> (ancrage `fc2a3a0`, 2026-07-28) la plaçait en V1 avec `possibly_done: false`. Elle a été **livrée
> au S52** entre-temps (PR #374, issue CLOSED le 2026-07-29, milestone et label repassés à
> `sprint-52`). Vérifié au HEAD `2966994` avant tout spawn : `focus:bg-accent-soft` est en place aux
> 5 emplacements, **zéro occurrence de `focus:bg-accent focus:text-accent-foreground`** subsiste
> dans `components/ui/`. Conséquence : la V1 perd son parallélisme, le sprint devient **strictement
> séquentiel #339 → #340**, et la cohésion monte à 1.00 (un seul domaine : cascade CSS).

> **⚠ Dérive de milestone corrigée avant lancement.** #339 portait le milestone « Sprint 52 »
> alors que son label était `sprint-53` — réattachée à « Sprint 53 ». Rappel : le milestone #53
> porte aussi ~10 issues de backlog **hors périmètre** (follow-ups du S52, cf. bilan S52) ;
> la source de vérité du périmètre de ce sprint est le **label `sprint-53`**, pas le milestone.

> **⚠ Dérive de ligne dans l'énoncé de #339, mesurée avant tout code.** L'issue cite
> `FooterSection.tsx:41` pour le `<h4 className="text-ink mb-3 font-bold">`. Le vrai emplacement est
> **lignes 43, 63 et 78 — trois occurrences, pas une**. Ligne 41 ne porte rien de tel. Conforme à
> `PIT-S52-006` : vérifier le fichier, jamais faire confiance au numéro de ligne d'une issue.
> **Rayon de souffle mesuré :** ~38 titres `<h1>`..`<h4>` portent aujourd'hui un `mb-*`/`mt-*`/`font-*`
> silencieusement annulé, répartis sur landing, dashboard, settings, products et timeline — la
> layerisation les réactive **tous d'un coup**.

## Sprint 54 — 2026-07-29 → 2026-07-30 (Terminé — merge PR #390 dans dev, commit `91c2f4a`)
**Objectif :** data-testid SelectItem + couverture des testids de la frise sans spec + retry rendu auth.setup
**Milestone GitHub :** #54 (fermé après merge)
**Issues livrées (3) :** #331 (P2/S), #330 (P2/M), #329 (P2/S) — 8 pts
**Vagues exécutées :** V1 = #331 ∥ #329 (fichiers disjoints) | V2 = #330 | + cycle correctif #330 | + cycle review-390
**Cohésion score :** 0.46
**Commits :** 15 (worktree `sprint-52-start-252990`, branche `claude/sprint-54-start-8ee5a7`, basée sur `origin/dev` `68a924c`)
**BR impactées :** aucune (sprint 100 % E2E + 2 `data-testid` non fonctionnels ; `BR-EVE-006`/`BR-EVE-014` lues, pas modifiées)
**Reviews :** batch Phase 7 (1 CRITIQUE budget timeout → résolu `0275f2c`) + `/review-pr 390` cycle 2 (3 axes, **0 CRITIQUE**, 6 findings corrigés / 1 réfuté avec preuve / 1 follow-up)
**Tests :** Frontend unit **836/836** | E2E **125 passed / 0 failed / 9 skipped** sur 134 (mesure lead, run isolé) | Backend non exécuté (0 fichier backend) | **CI 4/4 verte** sur `a278be2` (backend, frontend, security, e2e)
**Nouveaux artefacts mémoire :** `PIT-S54-001` à `PIT-S54-004` · `PAT-S54-001`, `PAT-S54-002`
**Status :** **Terminé** — mergé le 2026-07-30 (merge `91c2f4a`).

**Follow-ups arbitrés (Phase 4 triage — 9 items, 0 discard, choix dev « issues pour les 9 ») :**
  - `timeline-loading` code mort (inatteignable depuis AppShell #210) [XS bug | frontend] → **#391**
  - En-tête de lane sticky recouvrant les events proches de `rangeStart` au zoom Trimestre (150 px < 168 px), inatteignables à la souris [S bug | frontend] → **#392**
  - `DEFAULT_COLOR` `#6366f1` sous seuil AA (4,467 < 4,5) [XS bug | design] → **#393**
  - Oracle faible `not.toHaveText` sur le zoom-in mobile (jumeau du finding A, préexistant `41b8b15`) [XS | frontend] → **#394**
  - `aria-pressed` sur `timeline-fullscreen` pour un oracle plein écran observable [S | frontend] → **#395**
  - Les 2 autres `<Select>` d'`EventEditForm` (type d'événement, unité de durée) sans testid [XS | frontend] → **#396**
  - `auth.setup.ts:128` `expect(dashboard)` sans timeout explicite [XS | frontend] → **#397**
  - `settings-preferences.spec.ts` : options ciblées par libellé traduit [XS | frontend] → **#398**
  - `E2ePass123` en clair dans `support/accounts.ts` (dépôt public, neutralisé) [XS | frontend] → **#399**
  - **Ratio discard : 0/9.** Toutes en backlog libre (pas de milestone ; Sprint 55 « Mise en ligne » gelé, non pertinent). #391 et #392 sont les 2 bugs produit trouvés par les specs de #330.

> **Écart de méthode du lead consigné (S54) :** mon check COVERAGE-E2E (Phase 8) a rendu un **faux OK** sur `product-option-<id>` — le `grep` a apparié un commentaire au lieu d'un usage sélecteur. Le testid était livré par #331 **sans aucune spec** ; rattrapé au cycle `/review-pr 390` (finding D, corrigé). Leçon en `PIT-S54-002`.
> **Trois prémisses de mes propres briefings infirmées à la mesure** (`timeline-today` pas un bouton ; `timeline-event-outside-label` dépend du contraste, pas de la longueur ; `timeline-zoom-in`/`-fullscreen` non montés dans le contexte desktop visé) — le grep prouve l'écriture, pas le rendu. Détail dans `sprints/sprint-54/issue-330-done.md`.
> **Capacité Opus 5 indisponible en cours de sprint** (six `529` consécutifs au spawn de la vague 2, puis du correctif review) : #330 et les cycles correctifs ont tourné en **Sonnet** puis **Opus 4.8** (bascule modèle par le dev). Reviewers de `/review-pr 390` en Opus 5. Travail vérifié à la mesure par le lead à chaque fois.

> **Vérification des prémisses du plan architecte au démarrage (2026-07-29) — les 3 mini-plans tiennent.**
> · `frontend/src/components/EventEditForm.tsx` **est** à la racine de `components/` (correction architecte confirmée) ; `SelectItem` WEEK/MONTH/YEAR aux lignes **436-438**, sans `data-testid`.
> · `frontend/src/components/events/NewEventDrawer.tsx:215-217` — `SelectItem` produit, sans `data-testid`.
> · `frontend/e2e/timeline.spec.ts:221` — `.getByRole('option').nth(1)` confirmé, **seule** occurrence `.nth()` sur une option de `<Select>` dans les 18 specs.
> · `auth.setup.ts` : rendu initial lignes **46-47** hors boucle, boucle `REGISTER_RETRIES` lignes **50-71**, message en dur lignes **63-66** — conforme.
> · **18/18 testids de #330 confirmés à 0 spec E2E** (grep exhaustif, pas l'échantillon de 8 de l'architecte). Dont `timeline-loading`, qui est dans **`frontend/app/[locale]/(app)/timeline/page.tsx:47`** et non sous `frontend/src/` (piège de périmètre de recherche : l'app router est `frontend/app/`).
>
> **⚠ En revanche la cible de #330 est fausse : 16 testids couvrables, pas 18.** `desktop-edit-trigger` et `mobile-delete-trigger` n'existent **que** dans `frontend/src/components/timeline/TimelineEditHost.test.tsx` (lignes 63/72 pour les déclarations) — ce sont des doublures RTL, du type exact que l'issue exclut déjà pour `timeline-edit-host-stub` et `timeline-responsive-stub`, **et dans le même fichier**. Le critère d'acceptation n°1 (« chacun des 18 ») est donc inatteignable par construction : aucun navigateur ne rendra un testid déclaré dans un `*.test.tsx`.
> **C'est une régression d'audit, traçable dans le dépôt :** `docs/memory/audits/sprint-46-test-coverage.md:47` identifiait déjà `mobile-delete-trigger` comme faux positif ; `sprint-47-test-coverage.md` §4 — source de la liste reprise par l'issue — l'a réintégré tout en excluant les deux autres stubs du même fichier. Correction portée dans le briefing de #330 avec la chaîne de preuve, pour que le prochain audit ne les réintègre pas une troisième fois.

### Journal d'exécution Sprint 54

**Vague 1 — terminée (les deux `STATUS: COMPLETED`) :**
- **#331** → `9791d61` (3 fichiers, +27/−16). Contrat de testid posé : `product-option-<uuid>` et `recurrence-unit-option-<WEEK|MONTH|YEAR>`, dérivés de la `value` et jamais du libellé i18n. Tests : 836/836 unit, 15/0 E2E `timeline.spec.ts`, `tsc` 0 erreur. Contrat vérifié **au navigateur** (clic YEAR → le trigger affiche « an/year ») : le testid sélectionne la **bonne** valeur, ce que `.nth(1)` ne garantissait pas. Détail : `sprints/sprint-54/issue-331-done.md`.
- **#329** → `515ab87` (3 fichiers, +229/−9). Tests : 5/0 projets `setup`, **108/0/0 suite E2E complète** (154 s, `--workers=1`). Détail : `sprints/sprint-54/issue-329-done.md`.

> **⚠ Prémisse tenue depuis le S47 et infirmée par #329 : le retry 429 de `auth.setup.ts` était structurellement mort.** Budget Playwright par défaut = 30 s ; un cycle de retry coûte 8 s (attente `login-form`) + 20 s (`REGISTER_BACKOFF_MS`) = **28 s**, donc la 2ᵉ soumission expirait **toujours**. Mesuré : **4/4 `provision` en `Test timeout of 30000ms exceeded`, zéro ligne de diagnostic**. Le retry documenté depuis deux sprints n'avait donc jamais pu s'exécuter au-delà de la 1re tentative. Corrigé par `PROVISION_TIMEOUT_MS = 150_000` — sans quoi le nouveau message d'échec de #329 aurait été inatteignable lui aussi.

> **Deux élargissements de périmètre assumés par les agents, tous deux justifiés :**
> 1. **#329 a traité la ligne 70** (2ᵉ `expect(register-form)` dans le `catch`), absente du mini-plan et porteuse du même défaut exact que la ligne 47. Et il a **couvert le 3ᵉ mode de confusion du même message** (403 CORS, piège 2 du runbook S47) : le message ne suppose plus une cause, un listener `page.on('response')` collecte les statuts réellement observés et les rapporte avec une grille de lecture 429/403/409.
> 2. **#331 a corrigé l'en-tête de `timeline.spec.ts` (lignes 27-30)**, qui affirmait aussi le ciblage « par INDEX » — le commentaire menteur n'était pas seulement aux lignes 213-218.

> **Écart de couverture mesuré par le lead entre les deux vagues :** `recurrence-unit-option-WEEK` et `-YEAR` sont **posés par #331 mais exercés par aucune spec** (seul `MONTH` l'est) — MAJEUR selon l'heuristique COVERAGE-E2E du protocole A.4. Ajouté au périmètre de #330 plutôt que laissé en follow-up : coût marginal, l'agent est déjà dans ces fichiers.

> **Incident d'infrastructure, sans effet sur le livrable :** le spawn de la vague 2 a échoué **six fois de suite sur `API Error: 529 Overloaded`** (côté serveur, pas côté prompt). Arbre de travail vérifié propre après chaque échec — aucune écriture partielle. La persistance pré-spawn (briefing + `spawn-ref` committés avant l'appel) a rendu chaque reprise triviale : c'est exactement le cas d'usage pour lequel elle existe.
> **Diagnostic utile :** une sonde `Agent` triviale en Haiku **puis** en Sonnet a répondu immédiatement → la panne était **spécifique à la capacité Opus**, pas au spawn de subagents ni au prompt. #330 et son cycle correctif ont donc tourné en **Sonnet** malgré un triage prévoyant Opus. Dérogation assumée pour ne pas bloquer le sprint, travail vérifié à la mesure par le lead, consignée dans l'audit et le corps de PR.

**Vague 2 — terminée, plus un cycle correctif.**
- **#330** → `900a48f` (lot a, drawer/overlays) · `9972cf6` (lot b, contrôles) · `e851d2b` (lot c, minimap/états) · `5ddc7a9` (étape 1bis, options WEEK/YEAR) · `059030d` (correctif des 6 specs rouges) · `0275f2c` (correctif de review sur le budget de timeout). **18 nouveaux tests**, +567 puis +156/−64 lignes. Détail : `sprints/sprint-54/issue-330-done.md`.

**Cible de #330 corrigée deux fois : 18 annoncés → 16 → 15 réellement atteignables.**
Ma première correction (2 doublures RTL) était elle-même incomplète : `timeline-loading` est du **code mort**, donc inexerçable. Détail et chaîne de preuve dans `audits/sprint-54-test-coverage.md` §2.

> **⚠ Deux bugs produit découverts par les specs — signalés, non corrigés (hors périmètre) :**
> 1. **`timeline-loading` inatteignable.** `AppShell` (`components/layout/AppShell.tsx:80/114`, livré par #210 **après** ce testid) porte sa propre garde `useAuthGuard()` et retourne `app-shell-loading` **sans monter `children`** → la branche `if (loading)` de `app/[locale]/(app)/timeline/page.tsx:47` ne peut plus s'exécuter. Mesuré route `/api/auth/me` gatée : `app-shell-loading`=1, `timeline-loading`=0, 100 % reproductible. `test.skip()` avec cause nommée ; **substituer `app-shell-loading` refusé délibérément** (aurait couvert un testid *différent* en donnant l'illusion de la couverture).
> 2. **En-tête de lane sticky rendant des événements inatteignables à la souris.** Au zoom Trimestre, un événement proche de `rangeStart` se place à `30 × 5 = 150 px` alors que `--lane-header-w` vaut **168 px** (`spacing.css:48`) → `.mt-tlv__lane-label` intercepte le pointeur, **et aucun scroll ne le dégage** (pas d'overflow à ce zoom pour un produit unique). Assertion conservée, activation au clavier.
> 3. Remonté pour arbitrage produit : `DEFAULT_COLOR` `#6366f1` à un ratio mesuré **4,467 < 4,5** (AA) → le libellé extérieur est l'état **normal** en production, pas un cas limite.

> **⚠ Trois prémisses de MES briefings infirmées par la mesure — consignées sans être effacées :**
> 1. **`timeline-today` n'est pas un bouton** : badge positionnel sans `onClick` (`TimelineView.tsx:211`) ; le raccourci « T » (`scrollToToday`) est un mécanisme séparé. J'avais demandé d'asserter que le clic ramène le viewport.
> 2. **`timeline-event-outside-label` dépend du contraste de couleur** (`eventLabelReadableInside`, `lib.ts:60`), pas de la longueur du titre ni du zoom comme je l'avais écrit.
> 3. **`timeline-zoom-in` / `timeline-fullscreen` ne sont pas montés** dans le contexte desktop vers lequel ma table des sources pointait — trois des six specs rouges échouaient sur un locator **jamais résolu**. Mon grep prouvait qu'ils sont *écrits* dans un fichier, pas qu'ils sont *rendus* : **exactement le piège dont j'avertissais l'agent dans le même briefing.**

> **⚠ Erreur de méthode du lead sur la mesure, rattrapée :** j'ai lancé **deux suites Playwright concurrentes** contre un backend et une base uniques, et obtenu **8 rouges puis 12 rouges sur un code identique**. La contention produisait des échecs non reproductibles — `event-outside-label` rougissait dans les deux runs contendus et **passe** au run propre. Les deux mesures écartées ; seule la mesure isolée fait foi. Leçon : la règle `--workers=1` du runbook vaut aussi **au-dessus** du process Playwright, pas seulement à l'intérieur.

> **Deux agents de la vague 2 se sont arrêtés sans livrer leur rapport final** (« j'attends la notification du run »), l'un après 204 appels d'outils et l'autre en laissant son travail **non commité**. Conséquence de méthode : **tous les chiffres du corps de PR et de l'audit sont mesurés par le lead**, aucun n'est repris d'une affirmation d'agent. Le travail lui-même était bon — le correctif a diagnostiqué chaque échec en (A) bug de spec / (B) bug produit / (C) flake **sans affaiblir une seule assertion**.

**Review batch :** 1 CRITIQUE / 0 MAJEUR retenu / 2 MINEURS.
Le CRITIQUE (budget `PROVISION_TIMEOUT_MS`) : **sévérité revue à la baisse** après vérification de l'arithmétique — dans le pire cas qui *continue*, `ensureRegisterForm(recover)` réussit à sa dernière tentative (l'épuiser lève plus tôt avec le message de rendu). **Mais le fond est juste** : le commentaire annonçait ~110 s en omettant les deux appels `recover`, qui sont des boucles de retry complètes. Pire cas recalculé **~127 s** → budget porté de 150 s à **180 s** (`0275f2c`). Un MINEUR écarté avec raison, et **sa référence de ligne était inexistante** (1035-1043 dans un fichier de 653 lignes) — rappel qu'un reviewer se vérifie aussi.

**Tests (mesure finale, run unique sans concurrence) :** E2E **134 → 125 passed / 0 failed / 9 skipped** (4,2 min) · Frontend unitaire **836/836** · `tsc` 0 · `eslint` 0 · Backend **non exécuté (0 fichier backend touché)**.
`125` = les **108 de la baseline pré-#330** + 17 des 18 nouveaux. **Aucune régression.**

**PR :** #390 (`claude/sprint-54-start-8ee5a7` → `dev`), base vérifiée, milestone #54 attaché.

> **Pas de branche `sprint/54`** : leçon S43-S49 reconduite, `/sprint start` travaille dans son worktree (`sprint-52-start-252990`, branche `claude/sprint-54-start-8ee5a7`).

> **Pas de branche `sprint/50` créée** (étape 4 du skill volontairement sautée, leçon S43/S44 reconduite S45–S49) : `/sprint start` crée son worktree lui-même.

### Bilan de clôture Sprint 50 (2026-07-28)

**Issues livrées (2) :** #322, #323 — **#249 laissée OUVERTE délibérément** (cf. DEC-S50-004 : aucune cible de rotation, ses 3 critères opérationnels sont inatteignables sans déploiement).
**Vagues exécutées :** V1 = #249 ∥ #322 (fichiers disjoints) | V2 = #323 (+ volet `JWT_SECRET` de #249)
**Commits :** 12 · **Volume :** 64 fichiers, +8269 / −354
**BR impactées :** **BR-AUT-007 amendée** (cookie `jwt` signé RS256, signature et `exp` vérifiables par tout porteur de la clé publique) — pack `br-auth.md` mis à jour. Jetons d'export (#58/ADR-003) : mécanisme inchangé, **matériel de clé séparé**.
**Tests :** Backend **452/452** · Frontend **806/806** · E2E signature **12/0** · E2E suite complète **96 passed / 8 skipped / 0 failed**
**CI :** run 30399816138 sur `64df375` — **4 jobs verts** (`backend`, `frontend`, `security`, `e2e`)

**Reviews — deux cycles, 0 CRITIQUE au total :**
- Cycle 1 (`reviewer` batch, Phase 7) : **0 CRITIQUE / 3 MAJEUR / 6 MINEUR** → tous résolus (`d7b8049`)
- Cycle 2 (`/review-pr 357`, 3 agents : backend + frontend + security-expert) : **0 CRITIQUE / 3 MAJEUR / 13 MINEUR** → tous résolus (`64df375`)

**Nouveaux artefacts mémoire :** `PIT-S50-001` à `PIT-S50-008` · `PAT-S50-001` à `PAT-S50-004` · `DEC-S50-001` à `DEC-S50-005` · `PIT-S13-003`, `PIT-S15-003` et le pattern de config secrets S3 **annotés périmés** (`JWT_SECRET` n'existe plus).

> **⚠ Quatre prémisses du plan architecte infirmées au démarrage — mesurées, pas supposées.**
> Détail complet en tête d'entrée. Résumé : (1) #249 sans cible de rotation ; (2) `external-services-inventory.md` annoncé existant par l'architecte alors qu'il n'avait **jamais été écrit** — chemin fantôme, **4ᵉ sprint consécutif** ; (3) option (a) de #322 inapplicable, aucun reverse-proxy dans le dépôt ; (4) `ExportTokenService`, **second consommateur de `${jwt.secret}`** invisible au plan, sans lequel « retirer `JWT_SECRET` » était inexécutable.

> **⚠ Deux affirmations d'agents qui ont infirmé l'énoncé des issues — conservées telles quelles.**
> 1. **L'open-redirect de #322 ne se reproduit pas sur ce runtime.** `initURL` dérive de l'hôte de **bind** en self-hosting, pas de l'en-tête `Host` (mesuré au `curl`, 3 cas). Le correctif est de la **défense en profondeur** ; il redevient nécessaire avec `trustHostHeader` ou sur plateforme edge. Écrit ainsi dans ADR-004 plutôt que présenté comme une faille fermée.
> 2. **`BREVO_API_KEY` n'a jamais été exposée** (scan 727 commits, 3 angles) — le critère « vérifier l'exposition » de #249 est répondu par la négative, avec preuve reproductible.

> **⚠ Trois erreurs du lead, toutes rattrapées, consignées sans être effacées.**
> 1. **Mesure fausse en review** : j'ai conclu « 0 bloc stderr » pour contester un reviewer frontend — c'était le hook RTK qui réduisait la sortie de `vitest` à une ligne. En direct : **2 blocs**, le reviewer avait raison. Voir `PIT-S50-007`.
> 2. **Note mémoire erronée écrite le jour même** : j'avais consigné que `command gh` contourne RTK. Faux — RTK est un **hook Claude Code**, pas un alias shell. Corrigé avec les deux contournements réellement mesurés.
> 3. **Gate `[MISSING]` déclenchée par ma propre prose** dans l'audit de couverture (4ᵉ récurrence connue : S9, S10, S48, S50).
>
> **En sens inverse, deux arbitrages du lead tenus après vérification :** (a) deux reviewers se contredisaient frontalement sur `application-prod.properties:21` — vérification ligne à ligne : **chacun avait raison sur une branche différente**, le finding tient comme régression de défense en profondeur, pas comme faille ; (b) le majeur « marqueur `ENVIRONMENT` non obligatoire » **écarté de la PR** car sa sévérité est **inchangée** par ce sprint (le profil dev utilisait déjà un secret committé avant #323) — trou pré-existant, traité par la réouverture de **#111**.

> **Découverte du correcteur que personne n'avait anticipée :** retirer le défaut vide de `application-prod.properties` fait lever `env.getProperty()` **depuis l'intérieur** du garde-fou, ce qui aurait remplacé le message d'exploitation par un « Could not resolve placeholder » opaque. Résolu en traitant « placeholder irrésoluble » comme « non fournie » — 2 barrières **et** message lisible (`PIT-S50-008`, `DEC-S50-005`).

> **Réserves assumées :** aucun **boot réel** observé (les `console.warn` de production et le message fail-fast sont couverts par tests unitaires seulement) · le job `e2e` **n'est pas un check requis** sur `dev` → une régression E2E ne bloquerait pas un merge (#361) · révocation `jti` toujours hors de l'Edge · **aucun garde-fou frontend** n'impose les deux variables en production (#359) · paire dépareillée sans détection automatique (#360, largement absorbée par #358) · repli Base64 GNU vérifié en alpine, pas sur l'image de déploiement finale · `exportService.test.ts` écrit encore sur stderr (#364, hors périmètre).

> **Saturation contexte lead : non mesurée** (pas d'instrumentation dans cette session). Ordre de grandeur : 9 agents (2 fullstack V1, 1 fullstack V2, 1 test-runner, 1 reviewer batch, 1 fullstack correctifs, 1 fullstack E2E, 3 reviewers cycle 2, 1 fullstack correctifs cycle 2, 1 project-manager) ≈ **1,4 M tokens cumulés côté subagents**. Le pattern artefact + purge a tenu : le lead n'a jamais rechargé un retour brut. **Économie notable :** les briefings de 52–58 Ko n'ont pas été chargés en contexte lead — passés par lecture imposée du fichier committé + checkpoint vérifiable (`pack_lu: OUI — br-auth §<section réelle>`), les 4 agents ont cité une section réelle.

**Follow-ups arbitrés (Phase 4 triage — 11 items, 0 discard) :**
  - Endpoint JWKS + découverte de clé [M | auth] → **#358**
  - Garde-fou frontend prod (`AUTH_JWT_PUBLIC_KEY` + `APP_CANONICAL_HOST`) [S | frontend] → **#359**
  - Détection de paire dépareillée [M | auth] → **#360** (cross-référencée #358, caduque si #358 livrée)
  - Job `e2e` requis sur `dev` [XS | devops] → **#361**
  - Scan de secrets en CI (gitleaks/trufflehog) [S | devops] → **#362**
  - E2E du mode « clé illisible » [S | frontend] → **#363** (valeur faible, à re-trancher avant planification)
  - stderr Zod `exportService.test.ts` (MEMO-007) [XS | frontend] → **#364**
  - `brevo.api.key` sans fail-fast prod [XS | backend] → **#365**
  - `.env.example` sans `BREVO_API_KEY` [XS | infra] → **#366**
  - Marqueur `ENVIRONMENT` obligatoire [S | backend] → **#111 RÉOUVERTE** (pas de doublon créé ; label `sprint-5` périmé retiré au passage)
  - Compléter l'inventaire des services externes → **#250** commentée (socle livré, reste à faire listé)
  - **Sans objet :** R3 et R5 de l'audit (`JWT_SECRET` supprimé par #323) · #112 (purge historique) déjà close
  - **Ratio discard : 0/11** — aucun follow-up jugé non pertinent par le dev.
  - **Aucun milestone attaché** : « Sprint 51 » contient déjà ses 3 issues planifiées (#328, #349, #351) et le plan plafonne à 3 issues / ~10 points.

---

# Plan S55 → S59 — `/sprint plan 5` du 2026-07-30

## ⚠ Bilan d'écart S52-S54 — à lire avant de planifier quoi que ce soit

Un plan écrit le 2026-07-29 avait porté S52/S53/S54 à **27 issues** au total. Mesure faite le 2026-07-30 :

| | |
|---|---:|
| Issues planifiées sur S52+S53+S54 | 27 |
| **Réellement livrées** | **8** |
| Détachées de leur milestone sans être faites | 14 |
| Restées ouvertes dans un milestone **fermé** (invisibles au suivi) | 5 |
| Nouvelles issues créées par les reviews de ces 3 sprints | 18 |
| **Backlog ouvert : 107 → 117** | **+10** |

**Le mode d'échec n'est pas le retard, c'est le re-scope silencieux** : les sprints ont été exécutés
à 3 issues et l'excédent détaché sans trace. **Capacité réellement observée : 2,7 issues / 5,7 pts
par sprint.**

> **Garde-fou à imposer à chaque `/sprint end` :** toute issue non livrée **reste dans son
> milestone** et est explicitement reportée. Jamais détachée. Et ne jamais fermer un milestone qui
> contient encore des issues ouvertes (5 orphelines l'ont été dans « Sprint 52 »).

## ⚠ Décalage milestone ↔ titre, assumé

Le numéro 55 est pris par le milestone « Mise en ligne (GELÉ — hébergeur à définir) ».
**Les milestones de ce plan sont donc décalés de +1** : Sprint 55 → #56, Sprint 56 → #57,
Sprint 57 → #58, Sprint 58 → #59, Sprint 59 → #60. Le numéro réel est consigné dans chaque entrée.

## ⚠ Garde-fous d'environnement à recopier dans TOUS les briefings

- **`git log origin/dev` MENT** — le hook RTK masque les commits de merge. Il a renvoyé `a278be2`
  alors que `origin/dev` = `91c2f4a`. **Réfs fiables : `git show-ref origin/dev` ou
  `rtk proxy git ls-remote origin refs/heads/dev`.** Un plan entier a été construit sur cette
  fausse SHA avant qu'un architect ne le corrige.
- Le checkout principal était **58 commits en retard** au moment de la planification. Lire un
  fichier de référence via `git show origin/dev:<path>`.
- Chemin corrigé : le middleware est `frontend/middleware.ts`, **pas** `frontend/src/middleware.ts`.

## Sprint 55 — 2026-07-30 → 2026-07-30 (Terminé — merge PR #402 dans dev)
**Objectif :** Solder les écarts entre ce que le README promet et ce que le dépôt fait
**Milestone GitHub :** #56 (fermé après merge)
**Issues livrées (5/5) :** #366, #376, #356, #377, #361 — **5 pts, 100 % du plan**
**Vagues exécutées :** V1 = #366 ∥ #376 ∥ #377 ∥ #356 (4 fullstack-dev parallèles, fichiers
disjoints) | V2 = #361 traitée par le lead (protection de branche, pas un fichier — arbitrage
développeur requis)
**Commits :** 12 (dont 3 de correction post-revue et 2 parasites de renseignement de SHA)
**Cohésion :** 0.08 — sous le seuil, split rejeté à la planification, assumé
**BR impactées :** aucune. `BR-AUT-012` **citée** dans `.env.example` sans modification de comportement
**Reviews :** 2 passes. Batch en fin de `/sprint start` → **1 MAJEUR** + 7 mineurs. `/review-pr 402`
après corrections → 0 CRITIQUE / 0 MAJEUR / **3 MINEURS**. Tous RÉSOLUS, 1 seul cycle chacun.
**Tests :** aucun test ajouté (aucun code applicatif touché — 2 markdown, 1 compose, 1 `.env.example`,
1 workflow). **CI : 4 runs consécutifs 5/5 verts** (`2b2c5a7`, `911e0fb`, `9e95e5d`, `a5d26c5`)

### Le MAJEUR de la revue — ce que le sprint a failli livrer
`.env.example` livrait `BREVO_API_KEY=xkeysib-REMPLACER-PAR-VOTRE-CLE`. Le no-op de
`BrevoEmailService:64` est conditionné à `apiKey.isBlank()` : cette valeur **non blanche**, copiée
vers `.env` comme le fichier le demande, aurait déclenché un **vrai POST vers api.brevo.com → 401 →
`log.error`** — l'inverse exact du « no-op silencieux » promis deux lignes au-dessus. Le fichier
documentait un comportement que lui-même empêchait d'obtenir. Trouvé **en revue, pas à l'écriture**,
par un agent qui a été lire la condition dans le code au lieu de croire le commentaire. Cf.
`PIT-S55-001`.

### Vérifications d'exécution (le plan qualifiait le test unitaire d'insuffisant partout)
- **#376** → pile Docker réelle : `frontend Up (healthy)`, `FailingStreak: 0`, 2 sondes `ExitCode 0`,
  `curl /fr` → 200.
- **#356** → **run CI réel vert en 48 s**, log à l'appui : `attendues 15 | appliquées 15 | première
  version jouée : 1`. Plus un **test négatif** local (base injoignable ⇒ `RC=1`) prouvant que le job
  peut rougir.
- **#361** → checks requis `dev` passés de `[backend, frontend]` à `[backend, frontend, e2e]`,
  `enforce_admins` et reviews vérifiés inchangés.

### Écarts assumés
- **#356 n'invoque pas le CLI `flyway migrate`** malgré le libellé de l'issue : `spring.flyway.enabled=true`
  + `ddl-auto=validate` (dev ET prod) font que le boot le fait déjà. Cf. `DEC-S55-001`.
- **#361 ajoutée au plan par le lead** (l'architect l'avait classée hors plan tout en la désignant
  « le regret le plus sérieux »), et **arbitrée par le développeur** : `e2e` requis, `flyway-smoke`
  non. Cf. `DEC-S55-003`.
- **`/review-pr` lancé en SOLO malgré un triage mécanique disant TEAM** : les 4 spawns de TEAM sont
  gatés sur des compteurs tous à 0 sur une PR devops/docs → TEAM aurait produit une review vide.
  Cf. `PIT-S55-003`.

### Ce qui N'EST PAS prouvé (à ne pas relire comme vert)
- Le cas négatif de **#361** — « une PR à `e2e` rouge est refusée » — n'a **jamais été provoqué**. On
  sait que GitHub évalue le check, pas qu'il bloque. → issue #408.
- **`flyway-smoke` n'a jamais rougi sur GitHub** pour la bonne raison (entité désalignée d'une V16).
  Le test négatif a été fait en local, sur base injoignable.

### Incident — fan-out sur arbre partagé
Un agent a fait `git commit --amend` pour corriger un SHA placeholder dans son propre rapport ; entre
son commit et son amend, un autre agent avait poussé HEAD. **L'amend a réécrit le commit de l'autre
agent.** Aucun fichier perdu (vérifié `git log --stat`), mais `70d7397` porte 4 lignes du mauvais
rapport. Cause racine : demander à un agent d'écrire son propre SHA crée mécaniquement le besoin
d'amender. Cf. `PIT-S55-002` — `--amend` rejoint la liste des verbes git interdits en fan-out.

**Nouveaux pitfalls :** `PIT-S55-001` (placeholder qui défait un no-op), `PIT-S55-002` (`--amend` en
fan-out), `PIT-S55-003` (triage `/review-pr` aveugle aux lignes `docs/`). **`PIT-S52-005` marqué
RÉSOLU** en #376.
**Nouveaux patterns :** `PAT-S55-001` (serveur en fond en CI → poll à échec-par-défaut),
`PAT-S55-002` (rendre vérifiable la virginité d'une base).
**Nouvelles décisions :** `DEC-S55-001`, `DEC-S55-002`, `DEC-S55-003`.

**Follow-ups arbitrés (Phase 4 triage — 7 items, 0 discard) :**
  - Citation `BR-AUT-005` → `BR-AUT-012` dans `BrevoEmailService` [XS | auth] → issue **#403**
  - `docker-compose` ne propage aucune `BREVO_*` [S | infrastructure] → issue **#404**
  - Healthchecks `backend`/`postgres` encore sur `localhost` [XS | infrastructure] → issue **#405**
  - Commentaire « Pas d'actuator » du job `e2e` faux [XS | devops] → issue **#406**
  - Rendre `flyway-smoke` requis plus tard [XS | devops] → issue **#407**
  - Prouver le blocage d'une PR à `e2e` rouge [S | devops] → issue **#408**
  - Protection de la branche `main` à trancher [XS | devops] → issue **#409**

> **Backlog libre assumé, aucun milestone.** Les 7 issues ne sont **pas** rattachées à Sprint 56 :
> il est déjà à 4 issues / 6 pts et la capacité mesurée est de **2,7 issues par sprint**. Les y
> verser reproduirait le re-scope silencieux mesuré sur S52-S54 (27 planifiées, 8 livrées).
> Ratio discard 0/7 — à surveiller : un discard nul répété peut signaler un critère de signalement
> trop permissif autant qu'une bonne discipline.

<details>
<summary>Entrée de planification d'origine (2026-07-30)</summary>

**Issues (5) :** #366 (P3/XS), #376 (P3/XS), #356 (P2/XS), #377 (P3/XS), #361 (P3/XS) — **5 pts**
**Vagues :** V1 = les 5 en parallèle (fichiers strictement disjoints)
**Cohésion :** 0.08 — ⚠ sous le seuil 0.3, split **rejeté** : ces items sont la clause « un clone
démarre » du critère MVP et rien d'autre ; les regrouper par domaine les étalerait sur 3 sprints.
**Migrations Flyway :** aucune (V16 reste libre)
**Depend de :** rien
**Status :** **Terminé** — PR **#402** (`claude/sprint-55-start-22b896` → `dev`) **mergée le 2026-07-30**.
Démarré 2026-07-30, base `origin/dev` = `59a31b3`. Milestone Sprint 55 fermé (0 ouverte / 5 fermées).
*(Statut rectifié le 2026-08-16 — cf. l'audit de clôture consigné sous le Sprint 36.)*
**Écart au plan validé :** #361 (job `e2e` requis sur `dev`) a été **ajoutée par le lead**.
L'architect l'avait classée hors plan tout en la désignant « le regret le plus sérieux » : sans elle,
une régression E2E ne bloque aucun merge des 5 sprints. Le sprint était à 4 pts pour un plafond de
10 — l'ajout ne déplace rien.
**Vérification :** unitaire insuffisant partout. #376 → `docker compose up` + `ps` montrant
`healthy`. #356 → run CI observé sur base vierge. #361 → constat qu'une PR à E2E rouge est refusée.

</details>

## Sprint 56 — 2026-07-30 → 2026-07-31 (Terminé — merge PR #410 dans dev)
**Objectif :** Lever le seul défaut vérifié du parcours cœur qui rend une action utilisateur impossible
**Milestone GitHub :** #57
**Issues (4) :** #392 (P2/S), #393 (P3/XS), #395 (P2/S), #391 (P3/XS) — **6 pts**
**Vagues :** V1 = #392 ∥ #393 | V2 = #395 | V3 = #391
**Cohésion :** 0.44
**Migrations Flyway :** aucune
**Depend de :** rien
**Note sur les issues de suivi :** #446 porte un critère d'acceptation **ajouté par le
project-manager** sur `.mt-sheet` / `.mt-actionsheet` — ils portent le même token `--z-modal`, donc
le bug peut se rejouer sur deux autres surfaces ; à corriger ou à démontrer hors risque. #448 note
que la correction HiDPI **ne sera jamais exercée en CI** tant que `deviceScaleFactor` reste à 1, ce
qui rend le test unitaire à `dpr: 3` non optionnel. À l'inverse, le PM signale n'avoir **pas relu les
fichiers sources** : les numéros de ligne et valeurs mesurées inscrits dans les 3 issues viennent des
artefacts du sprint, non revérifiés par lui.

**Status :** Terminé — PR #410 mergée dans `dev` le 2026-07-31 (worktree `claude/sprint-56-start-afdae4`, base `origin/dev` = `8ec1a2a`)
> Statut rectifié pendant `/sprint end 57` : l'entrée était restée `En cours` alors que la PR #410 était mergée depuis le 2026-07-31.

> **Trois vagues pour 4 issues** : #392, #395 et #391 modifient **toutes** `frontend/e2e/timeline.spec.ts`.
> #392 et #395 modifient en plus tous deux `TimelineView.tsx`.
> **#392 exige un E2E** : jsdom ne fait pas de hit-testing, aucun test unitaire ne verra
> « intercepts pointer events ». Plus navigateur clair+sombre aux 4 niveaux de zoom.

> **Arbitrages produit tranchés par le développeur au démarrage (2026-07-30) :**
> - **#393** → passer `DEFAULT_COLOR` à une teinte conforme AA (≥ 4,5), et non assumer le
>   libellé hors pastille. Piste indigo-600 `#4f46e5` (~6,0), ratio à re-mesurer réellement.
> - **#391** → **supprimer** la branche morte `if (loading)` / `timeline-loading` de
>   `timeline/page.tsx`. `app-shell-loading` reste le testid canonique du chargement global ;
>   le `test.skip()` de `timeline.spec.ts` est réécrit pour l'asserter.

**Commits (4, un par issue) :** `9737d5b` (#393) · `143edc0` (#392) · `c87034d` (#395) · `f1a6827` (#391)
**Reviews :** reviewer batch — 6 `[OK]`, 1 `[MINEUR]`, **0 CRITIQUE / 0 MAJEUR**. Le `[MINEUR]`
(`timeline.css` : `var(--lane-header-w, 160px)` désynchronisé du token réel 168 px) **non corrigé
volontairement** — vérifié pré-existant sur `origin/dev`, donc hors périmètre, versé au triage.
**Tests :** backend 452/452 · vitest 839/839 · `tsc --noEmit` 0 · E2E timeline 47/47.
Suite E2E complète : 3 échecs **hors périmètre** (profil `e2e` absent du poste), aucun ne charge `/timeline`.
**Arbitrage produit final #393 :** `#3B62D4` (`--evt-cobalt`, ratio **mesuré** 5,407:1) retenu **contre** le
`#4f46e5` que suggérait l'arbitrage de démarrage — motif palette DS, cf. [[DEC-S56-002]].
**Portée réelle #392 :** l'issue ne citait que le zoom Trimestre ; **Année était cassé aussi, et plus fort**
(66 px contre 168). Trouvé en tabulant les 5 zooms, pas en vérifiant le cas cité.

**Nouveaux pitfalls :** [[PIT-S56-001]] (test hors shell = branche inatteignable) · [[PIT-S56-002]] (stub
d'API sans son événement inverse le verdict) · [[PIT-S56-003]] (constante par défaut redéclarée) ·
[[PIT-S56-004]] (`:3000` appartient à un autre projet) · [[PIT-S56-005]] (`webServer` Playwright nu)
**Nouveaux patterns :** [[PAT-S56-001]] (dériver de l'événement navigateur) · [[PAT-S56-002]] (asserter la
stabilité d'un état transitoire) · [[PAT-S56-003]] (asserter la constante importée + sensibilité)
**Nouvelles décisions :** [[DEC-S56-001]] (gouttière, pas `pointer-events:none`) · [[DEC-S56-002]]
(`#3B62D4`) · [[DEC-S56-003]] (branche morte supprimée, `app-shell-loading` canonique)
**Nouveaux bugs :** [[BUG-S56-001]]

**Absorbé en cours :** aucun.
**Follow-ups arbitrés (Phase 4 triage, 2026-08-16) — 4 remontés, 3 créés, 1 discardé :**
  - `webServer` de `playwright.config.ts` sans `E2E_API_PROXY_TARGET`/`NEXT_PUBLIC_API_URL`
    [XS | devops] (source #391) → **issue #427** (backlog, pas de milestone)
  - `app.cors.allowed-origins` figé à `:3000` en profil `dev` [S | devops] (source #395) →
    **issue #428** (backlog)
  - `var(--lane-header-w, 160px)` désynchronisé du token 168px [XS | design] (`[MINEUR]` du
    reviewer batch, pré-existant sur `dev`) → **issue #429** (backlog)
  - 2 commentaires obsolètes citant `#6366f1` [XS | events] (source #393) → **discard : déjà
    corrigés**. Vérifié dans le code à la clôture — `TimelineView.test.tsx:415` explicite
    désormais que l'échantillon n'est pas le défaut, et `timeline.spec.ts:1018` porte
    « ✅ CORRIGÉ depuis (#393, Sprint 56) ». Absorbés par un sprint ultérieur sans traçage.
> Ratio discard 1/4 — les 3 autres ont été **vérifiés encore présents dans le code** avant
> création, pas créés sur la foi du done.md. C'est ce contrôle qui a éliminé le quatrième.

> **⚠ Clôture réelle : 2026-08-16, soit 16 jours après le merge — et en trois temps.**
> Le code était dans `dev` depuis le 2026-07-31, mais `/sprint end 56` n'avait jamais tourné :
> **(1)** les 4 issues sont restées **ouvertes** et le milestone #57 **ouvert** — seul sprint du
> plan S55-S59 dans ce cas ; **(2)** **aucun** des 9 signaux `[MEMORY:*]` n'avait été consolidé
> (trou S56 visible entre S55 et S57 dans les 4 fichiers mémoire) ; **(3)** `issue-392-done.md`
> n'avait ni section « Recommandations suite » ni ligne `STATUS` — reconstituée par le lead à la
> clôture, à partir du commit et de l'artefact, **pas** d'un retour de subagent.
> Le statut avait été rectifié à `Terminé` pendant `/sprint end 57` sans que le reste de la
> clôture ne suive : **rectifier le statut n'est pas clôturer.**
>
> Le constat a déclenché un **audit de tout le fichier le 2026-08-16**, qui a trouvé le même angle
> mort sur **6 autres sprints** (36, 46, 48, 49, 51, 55, 58) et **5 issues ouvertes parquées dans des
> milestones fermés**. Bilan complet consigné sous le **Sprint 36**, qui en est le cas le plus ancien
> et le plus trompeur.

## Sprint 57 — 2026-07-30 → 2026-07-31 (Terminé — merge PR #411 dans `dev`)
**Objectif :** Unifier le shell applicatif et fermer le seul 500 prouvé dans le code
**Milestone GitHub :** #58
**Issues (4) :** #299 (P2/S), #318 (P2/S), #312 (P3/XS), #398 (P3/XS) — **6 pts**
**Vagues :** V1 = #299 ∥ #312 | V2 = #318 ∥ #398
**Cohésion :** 0.22 — ⚠ sous le seuil. Split **rejeté** : sortir #312 remonterait à 0.31, mais le
critère de sortie dit littéralement « sans erreur 500 », ce 500 est prouvé, et il coûte 1 pt.
Le déporter pour un gain de métrique serait exactement le re-scope silencieux à éviter.
**Migrations Flyway :** aucune
**Depend de :** rien — mais **bloque** toute issue ultérieure qui lit l'arborescence `(app)/`
**Status :** **Terminé** — PR #411 mergée dans `dev` le 2026-07-31 19:08 UTC, merge commit `f13c4fa`
(16 commits sur la branche, dont les 5 commits d'issues ci-dessous + consolidation mémoire et follow-ups).
Statut soldé au démarrage du Sprint 58 (rituel `/sprint start`, cf. mémoire *sprint-end-github-gotchas* §3).

**Commits (5) :** `1651f9a` (#312) · `6c830eb` (#299) · `542e1c2` (#318) · `af33171` (#398) · `9f4635d` (correctif post-review #318)
**Vagues exécutées :** V0 = arbitrage `ui-design` (bloquant) | V1 = #299 ∥ #312 | V2 = #318 ∥ #398 | V3 = audit + review + correctif
**Tests :** Backend 455/455 · Frontend 859/859 · E2E settings + auth-guard 37 passed / 1 skipped · E2E complet 127 passed / 3 failed (environnement : backend sans profil `e2e`) / 8 skipped
**Review batch :** 0 CRITIQUE / 0 MAJEUR / 4 MINEURS — 1 corrigé dans le sprint (`9f4635d`), 3 en follow-up
**Artefacts :** `docs/memory/sprints/sprint-57/issue-{299,312,318,398}-done.md`, `review-sprint-57.md`, `docs/memory/audits/sprint-57-test-coverage.md`

> **Arbitrage `ui-design` (V0)** : `settings` sous `(app)/` (URL inchangée), sidebar `AppShell` = seule
> nav verticale, `SettingsShell` conservé mais nav 220 px → **onglets horizontaux**. Pattern tablist et
> tous les `data-testid` préservés → les 6 specs E2E settings sont restées intactes. Option « fusionner
> les 4 chapitres dans la sidebar » écartée (aurait cassé `settings-tablist` + `aria-selected` sur 5 specs).

> **Deux issues étaient périmées à l'exécution, corrigées dans les briefings :**
> - **#318** demandait de traiter `settings` comme « hors du groupe `(app)` » — faux après #299, livrée
>   le matin même dans le même sprint. Critère redirigé : verrouiller que `PROTECTED_EXTRA_SEGMENTS`
>   **reste** vide. La méthode suggérée par le plan (« voir le test rouge en ajoutant une route bidon »)
>   a aussi été refusée : une route de test dans `app/` partirait en production.
> - **#398** était estimée « XS, un seul fichier de test » — en réalité les `SelectItem` n'avaient aucun
>   `data-testid`, il a fallu instrumenter le composant d'abord. Deux fichiers.

> **Contraste — 3ᵉ incident du projet (après S48 et S53), mesuré cette fois :** onglet actif en clair
> `#1170E4`/`#DBE9FC` = **3.83:1**, sous AA. **Pré-existant, non introduit** : le lien actif de la sidebar
> `AppShell` mesure exactement le même ratio, sur le couple de tokens que l'arbitrage imposait de reprendre.
> Dette DS touchant tout état actif du produit → correctif au niveau du **token**, follow-up.

> **Pitfall confirmé deux fois : `git add` ciblé ne suffit pas sur working tree partagé.** `git commit`
> **sans pathspec commite tout l'index** : en V1, le commit de #312 a avalé le `git mv` de #299 (rename pur,
> 0 diff, arbre correct, attribution fausse). Consigne durcie en V2 (`git commit -- <fichiers>`) → les deux
> commits de la vague 2 sont restés parfaitement isolés. À intégrer au briefing type de fan-out.

> **Environnement E2E : 3 diagnostics faux avant le bon.** Symptôme « suite entièrement rouge dès le setup »
> → successivement attribué au CORS, au backend injoignable, aux identités périmées. Cause initiale : aucun
> serveur de dev sur `:3000` (arrêté en fin de V1). Puis, après relance sur `:3100`, cause réellement CORS
> mais pour une autre raison que celle supposée — le proxy Next transmet `Origin: :3100`, refusé par le
> profil `dev` figé sur `:3000` (piège n°2 du runbook S47). **Un `curl` qui réussit ne disculpe pas le CORS :
> il n'envoie pas d'en-tête `Origin`.** Réflexe : lire les statuts instrumentés par `watchRegisterResponses`
> avant toute hypothèse.

**Follow-ups arbitrés (Phase 4 triage — décision dev : traiter les 8 directement, aucune issue créée) :**

| # | Follow-up | Décision | Commit |
|---|---|---|---|
| FU1 | Contraste DS `accent`/`accent-soft` 3.83:1 sous AA | absorbé | `44a3ac7` |
| FU2 | Cookie `jwt` vide → 500 sur `/me` et `/refresh` | absorbé | `c0cc3ef` |
| FU3 | Garde-fou limité à `(app)/` | absorbé | `ae038b9` |
| FU4 | Couverture E2E du palier 768 px | absorbé | `3d5df36` |
| FU5 | Backend E2E local sans profil `e2e` | absorbé | `677d8a8` |
| FU6 | Bug i18n `DensityRibbon` | absorbé | `d6a6f06` |
| FU7 | Landmarks `<main>` imbriqués | absorbé | `1fc7b87` |
| FU8 | `npm run lint` rouge en local | absorbé | `cfa74c5` |

**Bilan : 8 absorbés, 0 issue créée, 0 discardé.** 13 commits au total sur le sprint.

**Tests après follow-ups :** Backend **462/462** · Frontend **875/875** · E2E **136 passed / 0 failed / 8 skipped** · `tsc` 0 · `lint` 0

> **Trois énoncés de follow-up étaient FAUX et ont été rectifiés, pas appliqués :**
> - **FU6** — le bug i18n n'était pas `{days}` manquant dans les messages (les 4 locales étaient
>   correctes) ni la ligne citée. Vraie cause : `t('label')` appelé **sans** `{days}` à **3 endroits**.
>   Le test unitaire existant utilisait un mock ignorant les paramètres — il **ne pouvait pas**
>   détecter ce bug ; un test avec un vrai `NextIntlClientProvider` a été ajouté.
> - **FU8** — il n'y avait **aucune divergence CI/local**. `next lint` ne scanne jamais
>   `next-env.d.ts` (hors dossiers par défaut) ; le rouge venait du **hook RTK** local qui élargit le
>   périmètre. L'exclusion reste utile (plugins d'éditeur), mais la prémisse était fausse.
> - **FU4** — `settings-header` n'est **pas** `lg:hidden` : seul `settings-back` l'est. Asserter
>   « header masqué à 1024 » aurait produit une spec **rouge sur du code sain** (cf. DEC-S57-002).

> **FU1 — pourquoi un token dédié aurait été insuffisant :** la liste des consommateurs du couple
> fautif est **ouverte** (`base.css:121` pose `a { color: var(--color-accent) }`, et
> `dropdown-menu`/`button` posent `bg-accent-soft` au survol/focus de n'importe quel `<a>`). Preuve
> empirique : `ui/dropdown-menu.tsx:29` **documentait déjà ce 3.83:1 depuis le S52** sans le corriger.
> D'où l'assombrissement de `--color-accent` (blue-500 → blue-600) plutôt qu'un
> `--color-accent-on-soft`. Mesure de l'« avant » faite sur la **même page live** par réinjection de
> l'ancien token — et la 1ʳᵉ tentative d'override, **no-op silencieux**, a été détectée avant de
> confirmer une amélioration inexistante.

> **Environnement E2E : le port 3000 était squatté par un AUTRE projet (EdelWheels)** au moment de la
> vérification finale — piège n°1 du runbook S47. Avec `reuseExistingServer`, Playwright aurait testé
> silencieusement la mauvaise application. Contourné par `backend-e2e:8085` (livré par FU5) +
> frontend `:3100`, ce qui a **aussi** fait passer les 3 specs de reset password.

> **Dépendance dure #299 → #318, vérifiée :** `auth-guard-paths.ts:47` déclare
> `PROTECTED_EXTRA_SEGMENTS = ['settings']` **parce que** settings vit hors de `(app)`. Après #299
> elle doit devenir vide. Faire #318 d'abord = écrire un test à réécrire.
> **Bonne nouvelle non dite par #299 :** settings est **un seul `page.tsx`**, pas une arborescence
> profonde — le risque « périmètre plus large » annoncé par l'issue est infirmé.
> **Arbitrage `ui-design` requis avant démarrage** (structure cible du shell).

## Sprint 58 — 2026-07-30 → 2026-07-31 (Terminé — merge PR #412 dans `dev` — MVP local : cascade `:focus-visible` et dette WCAG du DS)
**Objectif :** Layeriser `:focus-visible` sans perdre d'indicateur de focus, et solder la dette WCAG des bordures
**Milestone GitHub :** #59
**Issues (4) :** #383 (P1/M), #375 (P2/S), #352 (P3/S), #353 (P3/XS) — **8 pts**
**Vagues :** V1 = #383 **seule** | V2 = #353 ∥ #352 ∥ #375
**Cohésion :** 0.87
**Migrations Flyway :** aucune
**Depend de :** rien
**Status :** **Terminé** — PR **#412** (`claude/sprint-58-start-26b185` → `dev`) **mergée le 2026-07-31**.
Base `origin/dev` = `f13c4fa`, 17 commits. Milestone **#59 fermé** (0 ouverte / 4 fermées), les 4 issues
fermées.
> Statut rectifié le **2026-08-16** pendant l'audit de clôture : l'entrée est restée « Implémenté — PR
> ouverte » pendant 16 jours alors que la PR était mergée le jour même de sa création. Même angle mort que
> celui du Sprint 56 — la clôture GitHub avait bien été faite ici, c'est seulement l'entrée qui n'a pas suivi.

**Vagues exécutées :** V0 = arbitrage `ui-design` (bloquant) | V1 = #383 seule | V2 = #352 ∥ #353
| V3 = #375 | V4 = audit tests + review batch + correctif de clôture
**Tests :** Backend 462/462 · Frontend 887/887 · E2E 136 passed / 0 failed / 8 skipped ·
`tsc` 0 erreur · `next build` exit 0
**Review batch :** 0 CRITIQUE / 3 MAJEUR / 5 MINEUR — **tous soldés** dans le sprint (`82aea3f`,
`ca8fbf8`, `d6d0b9c`)
**Artefacts :** `docs/memory/sprints/sprint-58/design-arbitrage-383-352.md`,
`issue-{383,353,352,375}-done.md`, `fix-final-done.md`,
`docs/memory/audits/sprint-58-test-coverage.md`
**CI :** 5/5 verte sur la PR #412 (backend, frontend, e2e, flyway-smoke, security)

**Nouveaux pitfalls (5) :** `PIT-S58-001` (le fond sous un `outline` n'est pas le `background-color`
d'un ancêtre) · `PIT-S58-002` (mesurer au mauvais instant ou dans le mauvais état) ·
`PIT-S58-003` (`NEXT_PUBLIC_API_URL` / `E2E_API_PROXY_TARGET` se posent au **build**) ·
`PIT-S58-004` (un garde-fou cité dans la doc peut n'exister nulle part) ·
`PIT-S58-005` (trois pièges d'outillage qui déguisent un environnement en défaut applicatif)
**Nouveaux patterns (3) :** `PAT-S58-001` (prouver « pré-existant » au lieu de l'affirmer) ·
`PAT-S58-002` (lecture de pixel fiable en Playwright) · `PAT-S58-003` (découper un correctif de
cascade en étapes dont aucune ne retire d'indicateur)
**Nouvelles décisions (4) :** `DEC-S58-001` (contour du DS = unique indicateur de focus) ·
`DEC-S58-002` (`surface-2`, 5ᵉ surface du DS et la plus serrée) · `DEC-S58-003` (checkbox : aligner
le composant, conserver le spécimen) · `DEC-S58-004` (`<tr>` rogné par `overflow-x-auto` : ne rien
changer)

**Saturation contexte lead :** non instrumentée sur cette session — aucun compteur fiable à
disposition, donc pas de chiffre inventé. Ordre de grandeur observable : 8 subagents (1 `ui-design`,
5 `fullstack-dev`, 1 `test-runner`, 1 `reviewer`), retours distillés, aucun contenu brut conservé
en contexte lead.

> **L'arbitrage `ui-design` a re-calibré le sprint avant la première ligne de code.**
> Trois résultats qui ont changé le plan :
> 1. **Les deux moitiés de #383 sont séparables.** Retirer le `border-radius` du reset de focus ne
>    touche aucun site — `outline` suit déjà le rayon propre de l'élément (mesuré au pixel sur
>    Chromium 149, Firefox 151, WebKit 26.5). **La régression WCAG que le S53 redoutait est portée
>    par la layerisation seule.** D'où un ordre en 4 étapes où aucun indicateur n'est jamais absent.
> 2. **La zone de risque n'était pas celle annoncée.** L'issue et le plan désignaient
>    `language-selector.tsx` — il n'a demandé **aucune modification de classe**. Le vrai danger
>    était un groupe de 5 items de menu (`dropdown-menu.tsx`, `select.tsx`) dont le focus n'est
>    signalé que par un fond à 1,23:1.
> 3. **`landing.css` était déjà conforme** (arbitré par #335 avant l'ouverture de #352) → 3 des
>    19 occurrences annoncées = 0 travail. Comptage `outline-*` corrigé : **32 sites réels dans
>    24 fichiers**, contre « ~14 » dans l'issue.

> **Les 5 échecs E2E de l'audit ne reproduisent pas — et la ligne de base l'a prouvé.**
> L'audit rapportait 4 failed + 1 timedOut, dont 3 sur `timeline.spec.ts`, le fichier que #352
> modifie le plus, l'un portant littéralement sur un label « qui dépend du CONTRASTE ».
> Ligne de base prise **avant** tout correctif (code restauré à `f13c4fa`) : **les 5 sont verts sur
> la base ET sur HEAD**, 136/0/8 dans les deux cas, y compris rejoués en isolation. Hypothèse
> #352 infirmée (le test dépend de `eventLabelReadableInside(event.color)`, du TypeScript, pas du
> CSS). **Aucune spec touchée, aucun correctif E2E écrit.** Cause probable constatée mais non
> démontrée : configuration de l'environnement de l'audit — voir le pitfall `next build` ci-dessous.

> **Une erreur de briefing du lead, assumée :** #383 avait pour instruction de **conserver**
> `focus:border-transparent` sur `EventEditForm:505`, au motif que c'était la silhouette du champ
> et non un indicateur de focus. Isolément exact ; combiné au retrait de l'anneau, ça faisait
> disparaître la bordure au focus sans remplaçant. Relevé en review (MAJEUR), corrigé en `82aea3f`.
> L'agent avait correctement suivi une instruction fausse.

> **Un garde-fou annoncé qui n'existait pas :** `ds/a11y-audit.md` affirmait qu'une réintroduction
> d'anneau local serait rattrapée par `base-layer.test.ts` — ce fichier ne contenait **aucune**
> assertion sur le focus. Sur ce dépôt les commentaires servent de mémoire d'arbitrage : une
> garantie fictive est pire que pas de garantie. Assertion écrite (`ca8fbf8`), **et sa limite
> écrite avec elle** (elle verrouille la layerisation, elle ne détecte pas un `ring-2` réintroduit
> dans un `.tsx`).

**Follow-ups proposés (9) — à trier en Phase 4 de `/sprint end` :**
| # | Description | Triage | Source |
|--:|---|:---:|---|
| 1 | `documentElement.lang` reste `"fr"` sur `/en/*`, `/es/*`, `/de/*` — les lecteurs d'écran prononcent tout en français (**WCAG 3.1.1**), y compris le libellé que #353 vient de traduire | S | #353 |
| 2 | Options de `Select` sans `:focus-visible` sous **Firefox** dans leurs montages réels (ProductDrawer, EventEditForm, PreferencesSection) — non reproduit isolé, non infirmé en contexte | M | #383, #375 |
| 3 | `.mt-radio__dot` et `.mt-switch__track` (tous deux **en production**) n'ont pour indicateur de focus qu'un `--shadow-focus` à **1,23:1** : l'`<input>` réel est en `opacity:0; width:0`, le contour global n'y peint rien | S | arbitrage `ui-design` |
| 4 | Glyphe de coche sur la pastille sélectionnée de `CategoryDrawer` — bordure/remplissage à **1,61:1** sur le pire appariement (la distinguabilité passe par la bordure/fond, 8,87–16,03:1) | S | correctif de clôture |
| 5 | Contour de focus **rogné** dans `.mt-zoom` et le tablist des réglages (`overflow:hidden`) → `outline-offset:-2px`. **Pré-existant, prouvé** — l'ancien `ring-*` était rogné pareil | XS | #383, confirmé #352 |
| 6 | `.mt-evt--draft` : son `opacity:.8` empêche le pointillé d'atteindre 3:1 contre **son propre fond** en clair (2,82:1). Passe contre le fond de lane (3,11:1), donc cas nominal couvert | XS | #352 |
| 7 | Étendre la mesure de contour aux **8 autres sites de montage** du sélecteur de langue et au palier < 1024 px (`LandingMobileMenu`) — aujourd'hui une prédiction, pas une mesure | XS | #375 |
| 8 | Reporter la recette E2E qui marche (`NEXT_PUBLIC_API_URL` + `E2E_API_PROXY_TARGET` au **build**) dans `sprint-47/e2e-local-runbook.md` | XS | correctif de clôture |
| 9 | Vérifier au navigateur les surfaces non couvertes par #383 : réglages en viewport **mobile**, `forced-colors`, `dpr ≠ 1` | S | #383 |

**Absorbé en cours :** 3 commentaires rendus faux par les retraits d'anneaux (`CompactRail.tsx`,
`select.stories.tsx`, `checkbox.stories.tsx`), décompte 32/31/1 aligné entre `base.css` et
`a11y-audit.md`, exception `popover.tsx` commentée in-situ.

**Follow-ups arbitrés (Phase 4 triage, 9 items) :**
| Description | Triage | Arbitrage |
|---|:---:|---|
| `documentElement.lang` reste `"fr"` sur les pages non francophones (WCAG 3.1.1) | S | → issue **#413** |
| Options de `Select` sans `:focus-visible` sous Firefox, en montage réel | M | → issue **#414** |
| `.mt-radio__dot` / `.mt-switch__track` : focus à 1,23:1, tous deux en production | S | → issue **#415** |
| Glyphe de coche sur pastille sélectionnée (`CategoryDrawer`) | S | → issue **#416** |
| Contour rogné dans `.mt-zoom` et le tablist des réglages (`outline-offset:-2px`) | XS | → issue **#417** |
| `.mt-evt--draft` : `opacity:.8` bloque les 3:1 contre son propre fond | XS | → issue **#418** |
| Vérifier les surfaces de focus non couvertes (réglages mobile, `forced-colors`, `dpr≠1`, Safari) | S | → issue **#419** |
| Reporter la recette E2E qui marche dans le runbook du S47 | XS | **absorbé** (`70dfbcf`) |
| Étendre la mesure de contour aux 8 autres sites de montage du sélecteur | XS | **discard** — couvert par #419 |

Ratio discard : **1/9**. Aucun sur-signalement constaté : les 9 items étaient adossés à une mesure
ou à un fichier précis.

⚠ **Les 7 issues sont créées SANS milestone (backlog libre), délibérément.** Rattacher des
follow-ups au milestone « Sprint 59 » aurait reproduit le piège du S46 : `/sprint plan` sélectionne
par **label** `sprint-N`, pas par milestone — les issues rattachées mais non labellisées ne sont
jamais planifiées, et la fermeture du milestone les enterre (7 issues perdues au S46). Le backlog
libre est au contraire le vivier exact de `/sprint plan`, qui part de toutes les issues ouvertes et
**exclut** celles déjà labellisées `sprint-*`.

**Écart assumé au plan des vagues :** l'architect proposait `V2 = #353 ∥ #352 ∥ #375`. #375 est
**déplacée seule en V3**. Motif : #375 ne fait que *mesurer* le contour `:focus-visible` **sur le
sélecteur de langue** — or #353 (V2) redimensionne ce même déclencheur à 44×44 px et #383 (V1) lui
donne son propre anneau. Mesurer en parallèle de #353 reviendrait à mesurer une cible mouvante,
exactement le travail perdu que l'architect voulait éviter en la plaçant après #383. Coût : nul
(#375 ne modifie aucun fichier si le contour est conforme).

> ⚠ **Sprint le plus susceptible de déraper — deux mesures.**
> 1. **#383 est sous-estimée d'un facteur 2** : l'issue annonce ~14 sites, le comptage réel sur
>    `origin/dev` donne **33 occurrences de `outline-none`/`outline-hidden` dans 20 fichiers**.
>    L'estimation M (3 pts) est vraisemblablement fausse.
> 2. **Régression WCAG 1.4.11 CERTAINE si on layerise naïvement** : `ui/language-selector.tsx` n'a
>    **aucun anneau de focus propre**, ce contour global est son unique indicateur. Idem
>    `ExportDataFlow.tsx`. Il faut donner un indicateur propre à chaque site **avant** de layeriser.
>
> **Navigateur clair + sombre obligatoire sur les 4 — aucun test unitaire n'est recevable** :
> jsdom ne résout pas `@layer`, qui est précisément le mécanisme en cause. #375 exige Firefox **et**
> WebKit. ⚠ **#342 (non planifiée) touche `language-selector.tsx`** — ne pas la planifier en parallèle.
> **Arbitrage `ui-design` requis** : un reset de focus a-t-il le droit d'imposer un `border-radius` ?

## Sprint 59 — 2026-08-16 (Terminé — merge PR #421 dans `dev`)
**Objectif :** Solder les défauts de rendu du header aux paliers 768-1024 px et l'échelle typo de la landing
**Milestone GitHub :** #60 (fermé après merge)
**Issues livrées (4/4) :** #381, #379, #348, #341 — **8 pts, 100 % du plan**
**Vagues exécutées :** V1 = #381 ∥ #341 (2 fullstack-dev parallèles) | **V2 supprimée** (#379 résolue par #381) | V3 = #348 | + 1 absorption post-V3
**Cohésion :** 0.81
**Migrations Flyway :** aucune. **Aucun fichier backend touché.**
**Commits :** 6 — `b722c10` (#381) · `a62b3f7` (#341) · `860b0b0` (#348) · `9b1cb39` (absorption AC) · `4cf19f2` (corrections de review) · `61dc1ec` (artefacts)
**Diff :** +1504 / −36 sur 10 fichiers, dont **929 lignes de tests**
**BR impactées :** aucune (défauts de rendu, aucun flux cross-system)
**Reviews :** reviewer batch — **0 CRITIQUE / 1 MAJEUR / 6 MINEURS**, tous RÉSOLUS en **1 seul cycle**
**Tests :** unitaires 888/888 · `tsc` 0 erreur · **E2E suite complète 183/183** (specs authentifiées incluses) · backend 462/462
**CI :** les 4 checks requis verts (`backend`, `frontend`, `e2e`, `ai-env-packs`) + `flyway-smoke`. `security` **rouge, préexistant** (`nanoid`, cf. follow-ups) et **non requis**.
**Spécialistes spawnés :** `ui-design` ×2 (arbitrage amont + ratification de clôture), `test-runner` ×1, `reviewer` ×1

### Le résultat principal : le sprint a démenti TROIS de ses propres prémisses

Toutes par la mesure en `playwright:v1.61.1-jammy`, aucune atteignable par lecture de code.

1. **#381 cherchait un défaut entre 768 et 1023 px — il n'y en a aucun.** Logo à 57 px sur une
   ligne, marge 223-262 px, 4 locales × 2 thèmes. Le `container` Tailwind plafonne la largeur utile
   à 736 px et la nav est masquée. **Le vrai défaut était à 1024 px**, un pixel hors périmètre :
   2 lignes et **0 px de marge** en `fr`/`de`/`es`. → `PIT-S59-001`
2. **#341 traquait un SVG inline de la landing depuis 3 sprints — il n'existe pas.** C'est le bouton
   flottant des **TanStack Query Devtools**, dev-only, décalé par design, `right` suivant le
   viewport (384@375 = le chiffre exact de l'issue). Aucun scroll produit. → `BUG-S59-001`,
   `PIT-S59-002`
3. **L'AC de #348 interdisait d'« introduire » un défaut qui préexistait.** `HeroSection.tsx:59`
   portait déjà `text-4xl md:text-5xl`, seul site du dépôt — et ces classes ne sont **pas inertes**,
   elles retombent sur les défauts Tailwind (36/48 px), **plus petit** que `text-3xl` (57 px). La
   hiérarchie était littéralement inversée. → `PIT-S59-003`, `DEC-S59-002`

### Périmètre élargi — assumé, pas subi

**#379 supprimée du plan** : ses 3 AC sont atteints par `b722c10`. Aucun agent dessus, relevé posté
en commentaire sur l'issue. Économie : une vague entière.

**Absorption post-V3 (`9b1cb39`)** : 2 des 5 AC de #348 n'étaient pas atteints après sa livraison —
le wordmark du footer (45 px) battait le h1 sous 768 px, et le chiffre d'étape égalait le h2. **Les
deux dérogations de spec qui masquaient ces échecs ont été retirées** (`<footer>` exclu du balayage,
`<=` au lieu de `<`). → `PAT-S59-002`

### Arbitrages de design

- **Logo/wordmark à palier unique `text-md sm:text-lg`**, nav `space-x-8` intouchée → `DEC-S59-001`
- **Ne pas ajouter `--text-4xl`/`--text-5xl`** au DS ; supprimer l'unique site hors échelle →
  `DEC-S59-002`
- **17/21 px du chiffre d'étape RATIFIÉ**, sans dérogation d'AC. Argument décisif que personne
  n'avait vu : le `<p>` de la carte hérite `--text-xs` = 15 px, donc le chiffre **domine sa propre
  description** (15 < 17 < 21). Contraste 4,94:1, au-dessus du 4,5 exigé.

### Review — le MAJEUR portait sur les tests, et l'arbitrage a été tranché par la mesure

Une boucle clair/sombre doublait 32 tests en 64 pour des métriques invariantes au thème, sur un check
CI requis. Le reviewer recommandait le **retrait total** ; retenu à la place : mono-thème **+ un
contrôle ponctuel**. **Justifié par mesure** : injection de `.dark h1{font-size:33px}` →
10 passed / 1 failed, **seul le contrôle ponctuel la voit**. Suite `landing-*` : 82 → 68 tests.
→ `PAT-S59-003`

### Nouveaux pitfalls / patterns / décisions / bugs

`PIT-S59-001` (paliers ≠ où le défaut sort) · `PIT-S59-002` (outillage de dev pris pour un défaut) ·
`PIT-S59-003` (`text-4xl` non inerte) · `PIT-S59-004` (Turbopack sert un chunk CSS périmé = faux
vert) · `PAT-S59-001` (prouver la non-vacuité en faisant rougir) · `PAT-S59-002` (une dérogation de
spec est une dette datée) · `PAT-S59-003` (contrôle ponctuel plutôt que retrait total) ·
`DEC-S59-001` · `DEC-S59-002` · `BUG-S59-001`

### ⚠ Ce que ce sprint n'a PAS couvert — à lire avant de s'en servir comme référence

- **Aucun jugement esthétique, sur aucune des 4 issues.** Des nombres ont été mesurés ; **aucune
  capture d'écran n'a été relue par qui que ce soit.** La conformité géométrique est établie, la
  qualité visuelle ne l'est pas.
- **Chromium seul** — aucun projet Playwright du dépôt ne couvre Firefox ni WebKit.
- **Contraste WCAG non re-mesuré au navigateur.** Le sous-titre du hero tombe de 35 à 21 px, donc
  **sous le seuil « grand texte » (24 px)** : son exigence passe de 3:1 à 4,5:1. Calcul sur tokens
  5,96:1 (conforme), mais opacité et superpositions non vérifiées.
- **La marge du header en `de` à 320 px vaut 5 px**, sous le plancher « deux chiffres » de
  `PIT-S52-001`. Antérieur au sprint, désormais chiffré. Follow-up ouvert.

### Follow-ups arbitrés (Phase 4 triage — 5 créés, 0 discardé)

Le triage a été **groupé**, pas item par item : 5 items présentés d'un coup, tous retenus.

- `nanoid` < 3.3.18, HIGH en dépendance de prod — rougit le job `security` de **toutes** les PR du
  dépôt [S | devops] → **issue #422**
- Marge du header en `de` à 320 px = 5 px, sous le plancher `PIT-S52-001` [S | design] → **#423**
- Les deux wordmarks « Ma Timeline » ne sont pas des liens vers l'accueil [XS | transversal] → **#424**
- 4 `leading-tight` inertes sur des `h2` de la landing [XS | design] → **#425**
- Pastille des étapes surdimensionnée (remplissage ~19 % au lieu de 30-45 %) + `aria-hidden` sur le
  chiffre [XS | design] → **#426** — **arrivé après le triage**, issu de la ratification `ui-design`

Aucun milestone attaché (« Sprint 60 » n'existe pas) : les 5 vont au backlog libre.
**Ratio discard : 0/5.** À surveiller — un discard nul de façon récurrente peut signaler que le lead
filtre en amont plutôt que les fullstack-dev qui sur-signaleraient.

**Absorbé en cours de sprint :** 2 AC de #348 (`9b1cb39`) + 7 points de review (`4cf19f2`).

### Écarts au protocole `/sprint`, assumés

- **Briefings passés par référence de fichier**, pas inlinés dans `Agent.prompt`. Le garde-fou censé
  l'imposer (`.claude/hooks/pre-spawn-fullstack.sh`) **n'est pas installé**. Remplacé par un **jeton
  sentinelle** en fin de briefing, que chaque agent devait recopier — **les 5 l'ont fait**.
- **Context-pack famélique au démarrage** : `.ai-env/rules-jit/` n'existait pas et `pit-frontend.md`
  non plus, donc `inject-pack.sh` ne produisait que `cp-frontend.md` (8,9 Ko). Le contexte manquant a
  été écrit à la main. **Corrigé entre-temps sur `dev` par la PR #420**, issue de ce constat.
- **Triage de follow-ups groupé** au lieu d'item par item (5 items, 1 seule question).
- `check-sprint-completeness.sh` **n'existe pas** — contrôle fait à la main (5/5 `done.md` avec
  section « Recommandations suite », `DB_EXPERT`/`SECURITY` en négations explicites, `TEST_RUNNER`
  traité en Phase 6, `UI_DESIGN` traité en Phase 1 de la clôture).

### ⚠ À FAIRE À CHAQUE CLÔTURE — régénérer les packs dérivés du Layer B

**Nouveau depuis la PR #420 (mergée dans `dev` pendant ce sprint), et absent du skill `/sprint`.**

`.ai-env/context-packs/pit-backend.md` et `pit-frontend.md` sont **générés** depuis
`docs/memory/pitfalls.md`. Le job CI **requis** `ai-env-packs` exécute
`gen-pit-packs.sh --check` et **rougit** si les packs sont périmés.

La Phase 2 de `/sprint end` consiste précisément à écrire dans `pitfalls.md` — elle périme donc les
packs **par construction**. Au S59 ça a coûté une boucle CI complète.

**Recette, à exécuter avant de committer la consolidation mémoire :**

```bash
# 1. Classer chaque nouvelle entrée (sinon elle part dans LES DEUX packs)
#    .ai-env/tools/pit-classification.tsv  ->  <PIT-ID><TAB><backend|frontend|both|tooling>
# 2. Régénérer
bash .ai-env/tools/gen-pit-packs.sh
# 3. Vérifier avant de pousser
bash .ai-env/tools/gen-pit-packs.sh --check
```

Committer `pit-classification.tsv` **et** les deux packs régénérés avec la consolidation.
Ne pas classer n'est pas neutre : une entrée non classée est injectée aux agents **backend** aussi —
au S59, trois pièges de mise en page seraient partis dans `pit-backend.md`.

## Après S59, où en est le MVP local ? — **NON atteint**

Le critère de sortie (« un clone démarre via le seul README, et l'utilisateur peut s'inscrire →
créer produit/catégorie/événement → voir sa frise → exporter → supprimer son compte, sans écran
cassé ni 500, prouvé en E2E ») **n'est pas atteint après ces 5 sprints. Il en faut ~7.**

Déjà vert avant ce plan (vérifié dans les specs) : inscription/connexion (`golden-path.spec.ts:61`),
création produit/catégorie/événement (`products`, `categories`, `timeline.spec.ts:199`), export JSON
synchrone (`settings-account.spec.ts:21`), suppression de compte (`UserController.java:159` +
`settings-account.spec.ts:51` + `AccountDeletionIntegrationTest`).

**Ce qui manquera encore, par gravité :**
1. **#307 (P1/M) — non planifiée.** Un événement archivé est filtré par `ProductDetailView` : du
   point de vue de l'interface, **l'utilisateur qui archive par erreur a perdu sa donnée**. Non
   plaçable : exige un **arbitrage produit du développeur** (vue « archivés » vs archivage
   définitif), pas du code. **C'est le trou le plus visible du plan.**
2. **#365 (gelé)** — `brevo.api.key` sans fail-fast : en local, « mot de passe oublié » échoue
   **silencieusement**. L'architect respecte le gel mais demande d'en extraire la moitié
   non-déploiement (un WARN au démarrage en profil dev). Sinon la clause « sans dépendance à un
   service externe non documenté » reste **jaune** quoi que fassent les 5 sprints.
3. **#270** — la clause « exporter ses données » n'est prouvée que sur la branche JSON synchrone ;
   l'export async ZIP/CSV n'a aucun E2E.

## Issues à re-scoper AVANT de les replanifier (sinon travail refait)

- **#39** (README + CONTRIBUTING) — `possibly_done` **partiellement** : `README.md` racine existe
  (225 l., livré par #372). Reste **CONTRIBUTING.md** seul. **Re-scoper, sinon un sprint futur
  redéveloppera le README.**
- **#354** (testids CTA + `.eslintcache`) — `possibly_done` **partiellement** : `.eslintcache` n'est
  **plus tracké**. Reste la moitié testids. **Re-scoper.**
- **#338** (mentions légales) — **à sortir du flux sprint** (label `blocked:humain`) : aucun agent ne
  peut rédiger le contenu juridique. C'était l'une des 5 orphelines du milestone Sprint 52 fermé ;
  la replanifier garantirait un nouveau non-livré.

## Risques du plan

- **R1 — Le backlog grossit plus vite qu'il ne se vide.** Au taux mesuré (+2,25 issue créée par
  issue livrée), 20 livraisons génèrent **~45 nouvelles issues** → backlog 117 → **~142**.
  **Corollaire : ne considérer que S55-S57 comme engagés et replanifier S58-S59 après la clôture de
  S57.** Les issues de S58/S59 vieillissent déjà — les 3 numéros de ligne contradictoires de
  `HeaderSection.tsx` en sont la preuve directe.
- **R2 — Le plan est +48 % en nombre d'issues au-dessus de la capacité mesurée** (4 issues/sprint
  contre 2,7 ; 6,6 pts contre 5,7). Calibrage demandé par le développeur, assumé comme tel.
- **R3 — 60 % du plan (S57, S58, S59) est bloqué sur un arbitrage `ui-design` ou produit, pas sur du
  code.** Si les arbitrages ne sont pas rendus avant le sprint, l'implémentation s'arrête.
- **R5 — Aucune vérification navigateur n'a été faite pour construire ce plan**, uniquement des
  lectures de code. 14 des 20 issues en exigent une. Le pitfall S48 vaut dans les deux sens : une
  lecture de code verte ne prouve pas qu'une page est cassée — **#381 pourrait se refermer en une
  simple documentation de mesure**, son issue admet que le défaut visible n'est pas établi.
- **R7 — `/sprint end 54` n'est pas terminé (PR #400 ouverte).** Démarrer S55 avant sa clôture
  rejoue les écarts connus. **Fermer #400 d'abord.**

## Périmètre gelé — non contesté, une réserve

Les 13 issues de « Mise en ligne (GELÉ) » supposent toutes un serveur, un domaine ou un profil
`prod`. Aucune n'est nécessaire à un clone qui tourne en local. **Seule réserve : #365** (cf. point
2 ci-dessus) — son intitulé dit « en production » mais le défaut se manifeste **d'abord en local**.

> **Pas de branche `sprint/55` créée** (étape 4 du skill volontairement sautée, leçon S43/S44
> reconduite depuis S45) : `/sprint start` crée son worktree lui-même.

---

## Sprint 60 — 2026-08-17 (Terminé — merge PR #432 dans `dev`)

**Objectif :** Rendre le signal CI `security` exploitable.
**Milestone GitHub :** #61 (le numéro de milestone est décalé de +1 par rapport au numéro de
sprint depuis S57 — cf. note S57 ; ne pas « corriger » ce décalage.)
**Issues livrées (3) :** #422, #362, #308
**Vagues exécutées :** V1 = #422 + #362 en parallèle | V2 = #308
**Branche :** `sprint/60`, créée depuis `origin/dev` @ `e18e5c1`.
**Commits (5) :**
- `c68591d` #362 — job CI `secret-scan` (gitleaks 8.30.1, binaire épinglé + SHA-256), `.gitleaks.toml`,
  `.gitleaksignore`, §9 de l'audit d'exposition
- `da0f0a3` #422 — `nanoid` 3.3.16 → 3.3.18 (GHSA-2v37-7h3g-55p8, HIGH)
- `1b477c8` #422 — artefact
- `79d4a5b` #308 — préflight `node_modules` dans `test-quiet.sh` + piège 4 du README
- `647f45f` #308 — correction du SHA dans l'artefact

**BR impactées :** aucune. Sprint entièrement outillage / CI / dépendances.
**Tests :** frontend 95 fichiers / 888 tests exit 0 · E2E 169 passed / 0 failed / 8 skipped exit 0 ·
`npm audit --omit=dev --audit-level=high` exit 0 · backend **non rejoué en local** (zéro fichier
`backend/**` au diff ; le job CI requis le couvre). Détail :
`docs/memory/audits/sprint-60-test-coverage.md`.
**Status :** **Terminé** — PR **#432** (`sprint/60` → `dev`) **mergée le 2026-08-17**, milestone #61
fermé. Titre et ligne `Status` sont volontairement redondants : `PIT-S56-006` montre que grepper l'un
sans l'autre rate les entrées où les deux se contredisent.

### Ce qui n'a PAS suivi le protocole, et pourquoi

- **Sprint jamais passé par `/sprint plan`.** Aucune entrée d'historique préalable, aucun
  `architect-plans.md`, donc **aucun mini-plan architecte** — les plans d'implémentation ont été
  écrits par le lead depuis les pistes techniques des issues, et la matrice de conflits de fichiers
  vérifiée à la main. Le label `sprint-60` et le milestone préexistaient (posés par l'audit de
  clôtures du 2026-08-16).
- **Context-pack réduit délibérément.** `inject-pack.sh unknown frontend` produisait 77 Ko par
  briefing, dont 44 Ko de pièges de mise en page sans rapport avec des issues de dépendances et de
  CI. Remplacé par un pack `tooling` de 23 Ko (même logique de classification que
  `gen-pit-packs.sh` : entrées `tooling` + `both` + non classées). Briefings finaux ~33 Ko, le
  garde-fou `pre-spawn-fullstack.sh` (≥ 8 Ko + marqueur) reste satisfait.
- **Le lead a terminé #308 à la place du fullstack-dev.** L'agent a calé (watchdog, 600 s sans
  progression) après avoir écrit et câblé le préflight, avant la doc, la preuve, l'artefact et le
  commit. Le lead a repris son diff non committé sans en réécrire une ligne, et a ajouté
  `README.md` + l'artefact. Consigné en tête de `issue-308-done.md`.
- **Deux erreurs du lead dans les briefings**, corrigées en cours de sprint :
  (1) les briefings annonçaient que `test-quiet.sh frontend` lance vitest + build + typecheck +
  lint — il ne lance **que** vitest ; l'agent de #422 l'a repéré et a lancé les trois autres
  séparément, donc sans perte de couverture ;
  (2) la consigne d'isolation des commits disait « `git add` ciblé » — `PIT-S57-001` établit que
  c'est insuffisant. Corrigée en `git commit -m … -- <pathspec>` **avant** le premier spawn.

### Vérifications refaites par le lead, sans croire les rapports

- `ci.yml` revalidé via **Ruby** : la validation YAML annoncée par l'agent
  (`python3 -c "import yaml"`) **ne pouvait pas s'exécuter** — PyYAML n'est pas installé sur ce
  poste. Résultat : YAML valide, 7 jobs, `on: pull_request + push` vers `dev`/`main`.
- Scan gitleaks rejoué : 768 commits, 0 détection, exit 0.
- Détection prouvée hors dépôt : clé AWS + clé Stripe → 2 détections exit 1 ; clé Brevo
  `xkeysib-` → 1 détection exit 1. **Piège rencontré** : `AKIAIOSFODNN7EXAMPLE` est la clé
  d'exemple canonique d'AWS, allowlistée par défaut par gitleaks — un premier test de détection a
  donc échoué à tort. Le test était mauvais, pas le job.
- Préflight #308 déclenché réellement (exit 3), suite nominale revérifiée (95/888 exit 0), scope
  inconnu toujours exit 2.
- **État de l'environnement vérifié après l'arrêt de l'agent #308**, pas seulement `git status` :
  celui-ci était propre alors que `frontend/node_modules/eslint-plugin-storybook` avait été
  renommé et jamais restauré. Le worktree était dans l'état dégradé.

### Écart de piste technique (issue #422)

`npm audit fix` — commande prescrite par l'issue et annoncée comme « confirmée suffisante » —
**échoue sur ce dépôt** : `Unable to resolve reference $postcss`, dû à
`overrides: { "postcss": "$postcss" }`. Bump obtenu par `npm update nanoid`, dans la plage
`^3.3.16` exigée par postcss 8.5.23, donc sans majeur et **sans aucune cascade**.

### Réserves connues au moment d'ouvrir la PR

1. ~~`secret-scan` jamais exécuté sur un runner~~ — **levée : PR #432, 7/7 jobs verts au premier
   run.** `secret-scan` pass en 8 s, `security` **pass en 39 s** — il était rouge sur *toutes* les
   PR du dépôt avant ce sprint, c'est l'objectif atteint. `backend` 1 min 11, `frontend` 2 min 26,
   `e2e` 6 min 39, `flyway-smoke` 51 s, `ai-env-packs` 10 s.

### Clôture (`/sprint end 60`)

**Merge :** PR #432 (`sprint/60` → `dev`), merge commit, autorisé explicitement par le dev.
**Milestone GitHub :** #61, fermé après le merge.
**Issues fermées :** #422, #362, #308.
**Commits :** 10.
**Reviews :** reviewer batch — 0 CRITIQUE / 1 MAJEUR (contre-épreuve exécutée, **aucun défaut**) /
2 MINEURS (1 traité, 1 en follow-up). Audit sécurité — **1 MAJEUR réel, corrigé** (`bdf6671`).
**Tests :** frontend 95 fichiers / 888 tests · E2E 169 passed / 8 skipped · backend via CI ·
CI finale **7/7 verte**.

**Consolidation mémoire :** 10 pitfalls (`PIT-S60-001` → `010`), 2 décisions, 1 pattern.
Les 10 pitfalls ont été **classés** dans `.ai-env/tools/pit-classification.tsv` (7 `tooling`,
3 `frontend`) et les packs régénérés — `gen-pit-packs.sh --check` vert, et le job requis
`ai-env-packs` confirmé vert en CI. Le rappel du S59 a donc été tenu cette fois.

**Absorbé en cours (XS) :** 2 — exclusion PEM écrite au plus étroit après qualification du faux
positif (#362) ; inventaire des jobs CI du README remis à jour, il en annonçait 4 sur 7 (#308).

**Follow-ups arbitrés (Phase 4 triage) — 6 items, 6 créés, 0 discardé, backlog libre :**
  - Rendre `secret-scan` **requis** sur `dev` [XS | devops] → **#433**
  - Aligner `scripts/test-quiet.sh frontend` sur ce qu'annoncent les docs [S | tooling] → **#434**
  - Réparer `npm audit fix` (override `$postcss` auto-référentiel) [S | frontend] → **#435**
  - Règle gitleaks pour les mots de passe à basse entropie [S | devops] → **#436**
  - Préflight : imports mono-ligne seulement [XS | tooling] → **#437**
  - 6 HIGH résiduelles dev+prod (chaîne eslint/brace-expansion) [M | tooling] → **#438**

> **Ratio discard 0/6 — deuxième sprint consécutif à 0 %** (S59 : 0/5). Le skill signale qu'un
> discard nul récurrent indique soit que le lead filtre en amont, soit que le critère de
> `RECOMMAND_FOLLOWUP` est trop large. À trancher au prochain sprint plutôt qu'à laisser filer :
> ici les 6 items étaient tous des limites **mesurées** du travail livré, pas des intuitions — ce
> qui plaide pour le filtrage amont, mais deux points ne font pas une tendance.

> **#433 est le follow-up qui conditionne la valeur de tout ce sprint.** Tant que `secret-scan`
> n'est pas un check requis, une PR qui le ferait rougir reste fusionnable, et le garde-fou est
> décoratif. Sa précondition (premier run vert) est levée depuis la PR #432.
2. Gitleaks ne détecte **pas** le `DB_PASSWORD` historique (§3.1, 10 caractères alphabétiques,
   entropie trop basse). Documenté dans `.gitleaks.toml`, pas dissimulé.
3. ~~Checks requis non relisibles~~ — **levée en fin de sprint.** `branches/dev/protection` et
   l'API GraphQL ont répondu HTTP 503 pendant ~2 h (dégradation GitHub, le REST ordinaire
   fonctionnait), puis le service est revenu. **Checks requis réels sur `dev` :
   `backend`, `frontend`, `e2e`, `ai-env-packs`** (4 contextes) — ni `security`, ni `secret-scan`.
   À noter pour la mémoire projet : l'entrée qui parlait de « 5 jobs requis » est à corriger.

### Défaut trouvé et corrigé par l'audit sécurité de fin de sprint

`.gitleaksignore` épinglait une empreinte sur le fixture `SECRET` d'`ExportTokenServiceTest`,
**encore présent au HEAD**, ce que la règle en tête de ce même fichier interdit explicitement.
La constante s'appelle `SECRET` et non `EXPORT_TOKEN_SECRET` : l'allowlist par nom de clé ne la
couvrait pas. Le mode d'échec était discret plutôt que bruyant — la ligne n'ayant jamais été
retouchée depuis son commit d'introduction, l'empreinte restait valide indéfiniment, donc le
masquage devenait **permanent** au lieu de rougir au premier reformatage. Remplacée (`bdf6671`)
par une exclusion durable ancrée sur le marqueur `test-only-insecure` de la valeur **et** sur ce
seul fichier, vérifiée dans les deux sens.

### ⚠ Rappel de clôture — régénérer les packs dérivés du Layer B

Reconduit du S59, toujours absent du skill : la Phase 2 de `/sprint end` écrit dans
`pitfalls.md`, ce qui **périme par construction** `pit-backend.md` / `pit-frontend.md`, et le job
CI requis `ai-env-packs` rougit. Recette : classer chaque nouvelle entrée dans
`.ai-env/tools/pit-classification.tsv`, puis `bash .ai-env/tools/gen-pit-packs.sh`, puis
`--check` avant de pousser. Ce sprint apporte plusieurs `[MEMORY:pitfall]` à classer, dont
plusieurs de catégorie `tooling`.

---

## Sprint 67 — 2026-09-03 (En cours)
**Objectif :** résorber la dette CVE des dépendances npm frontend et réparer l'outil qui la corrige
**Milestone GitHub :** #68
**Issues (3) :** #435 (S, P2, `frontend`), #182 (S, P3, `epic:devops`), #438 (M, P1, `epic:devops`)
**Cohésion :** 1.00 — les 3 issues portent sur `frontend/package.json` + `package-lock.json`
**Vagues :** V1 = #435 seule (débloque `npm audit fix`) | V2 = #182 + #438 dans UN SEUL agent (même lockfile, même vérification d'audit) | V3 = test-runner + review batch
**Parallélisme : AUCUN.** Les 3 issues écrivent le même `package-lock.json`. Cf. [[sprint-wave-shared-frontend-runtime]] : la matrice de l'architect raisonne sur les fichiers source et ne voit pas le graphe npm — deux agents concurrents produiraient deux résolutions d'arbre incompatibles.
**Migrations Flyway :** aucune
**Dépend de :** Sprint 66 (merge PR #479 dans `dev`, `3e05f26`)
**Branche :** `claude/sprint-67-start-a731f5` (worktree) — pas de branche `sprint/67`, cf. convention projet
**Planification :** AUCUN plan architect. Le milestone #68 et les labels `sprint-67` viennent du triage de clôture des sprints précédents ; `/sprint plan` n'a jamais tourné pour ce sprint. Aucun `architect-plans.md` — les briefings sont construits sur l'état vérifié ci-dessous, pas sur un mini-plan.

### Dérive des énoncés d'issue constatée à l'ouverture (vérifiée, pas supposée)

Mesuré sur `3e05f26`, worktree propre, `npm audit` réel :

| Vérification | Résultat |
|---|---|
| `npm audit fix --dry-run` | **échoue** — `npm error Unable to resolve reference $postcss` → #435 confirmée, et elle bloque les deux autres |
| Étape CI bloquante (deps PROD, `--omit=dev`) | **verte**, 0 vulnérabilité |
| Étape CI informative (dev+prod) | **7 HIGH + 1 moderate**, toutes `fixAvailable=true` |
| `@eslint/eslintrc@3.3.6` | épingle toujours `minimatch@3.1.5` → `brace-expansion@1.1.16` |

Deux énoncés sont **périmés** :

1. **#438** parle de « 6 HIGH résiduelles, toutes `eslint`/`brace-expansion`, non corrigeables ».
   L'arbre réel porte 7 HIGH dont **une seule** dans la chaîne eslint. Les autres sont nouvelles et
   sans rapport : `fast-uri` (SSRF / host confusion), `js-yaml` (CPU quadratique), `browserslist`
   (OOM), `image-size` ← `vite-plugin-storybook-nextjs` ← `@storybook/nextjs-vite`.
2. **#182** vise « vite, vitest, flatted, minimatch, picomatch ». **Cette chaîne n'existe plus** :
   elle a été résorbée entre-temps. La chaîne Storybook restante passe par `image-size`.

La condition de sortie inscrite dans `.github/workflows/ci.yml` (« À REVOIR dès que
`@eslint/eslintrc` passe à `minimatch@10` ») n'est **pas** remplie : eslintrc 3.3.6 est la dernière
version et reste sur `minimatch@3.1.5`. L'argument documenté au S45 (forcer `brace-expansion@5.0.8`
casse `minimatch@3`, qui appelle `expand` comme une fonction) reste donc à re-tester, pas à
recopier — `npm` annonce désormais `fixAvailable=true` sur cette entrée.

**Arbitrage dev (2026-09-03) :** périmètre élargi à **l'ensemble des 7 HIGH actuels**, pas au seul
texte des issues. Objectif : audit dev+prod au vert, ou justification écrite par résiduel. Les corps
de #182 et #438 sont à corriger sur GitHub pour refléter l'arbre réel.

### Arbitrage dev n°2 (2026-09-03) — étape `npm audit` de la CI

`.github/workflows/ci.yml` est un pipeline CI : modification soumise à confirmation explicite
(règle globale du dev). Question posée, réponse : **garder les deux étapes en l'état**
(PROD bloquante + dev/prod `continue-on-error`), et **corriger le bloc de commentaires du S45**,
devenu faux.

Écarté sciemment : refusionner en une seule étape bloquante — ce que `ci.yml` prévoyait pourtant
lui-même. Motif : la prochaine CVE publiée dans une devDep bloquerait tous les merges vers `dev`,
et ce sprint démontre que cela arrive souvent. La baseline verte suffit à rendre un rouge
significatif, sans coût de blocage — même logique que le job `security` réparé au S60
([[mytimeline-ci-required-checks-sha-race]] : « CLEAN est le normal, UNSTABLE est un vrai signal »).

Le lead applique ce changement lui-même après la vague 2 : les agents ont interdiction de toucher
à `ci.yml`, et le commentaire ne peut être écrit correctement qu'une fois l'audit final connu.

### Résultat

`npm audit` frontend (dev+prod) : **8 → 0** (1 moderate + 7 high résorbées).
Étape CI **bloquante** (`--omit=dev --audit-level=high`) : 0 avant, 0 après, aux trois mesures.

| Commit | Issue | Fichiers |
|---|---|---|
| `9e6e3ea` | #435 | `frontend/package.json`, `frontend/README.md` |
| `24ff500` | #182 | `frontend/package-lock.json` |
| `b7f05ee` | #438 | `frontend/package-lock.json` |
| `64e0616` | #438 | `.github/workflows/ci.yml` (lead, 100 % commentaires) |

4 fichiers au total, **aucun code applicatif** — ni `.ts`, ni `.tsx`, ni `.java`, ni `.sql`.

### Le fait marquant : un « blocage amont » faux pendant ~20 sprints

`ci.yml` documentait depuis le S45 que `brace-expansion` était **incorrigible en aval** (« 5.0.8
change sa forme d'export, le forcer casse le lint : `expand is not a function` »). Cette phrase a
été recopiée telle quelle dans l'énoncé de #438, et l'a orienté vers un simple arbitrage documentaire.

Elle est fausse. `minimatch@3.1.5` déclare `brace-expansion: ^1.1.7` : la **1.1.18**, publiée depuis,
y entre — la branche 5.x n'est jamais sollicitée, la forme d'export est préservée. Mesuré, pas
déduit : `typeof require(...) === "function"`, `minimatch('abc.js','*.{js,ts}') === true`, et
`npm run lint` exit 0 avec **0 occurrence** de `expand is not a function` (confirmé indépendamment
par le `test-runner`).

> Un blocage amont n'est pas un acquis. Il se périme **silencieusement** le jour où l'amont publie
> un patch dans la plage semver déjà déclarée : rien ne le signale, et le verdict survit dans un
> commentaire de CI puis dans les énoncés d'issues qui le citent.

Les 8 entrées étaient **toutes** des patchs in-range. `npm audit fix` n'a jamais été nécessaire :
méthode retenue = lire les plages déclarées dans le lock, puis `npm update` ciblé
(`PIT-S31-001` : `audit fix` tire des majeurs non voulus ; `PIT-S45-006` : une 2e passe aggrave).

### Deux corrections de mesure du lead, consignées

1. **Mon relevé `npm audit fix --dry-run` était incomplet.** Il ne montrait pas le downgrade
   `oxc-resolver 11.23.0 → 11.21.2` (+ 19 bindings). L'agent l'a trouvé en diffant le lockfile, l'a
   déclaré spontanément, et l'a expliqué : `storybook@10.6.0` l'épingle en exact `"11.21.2"`.
   Diffé le lock > se fier au résumé du lead.
2. **Le compteur « added 195 packages » de npm affole pour rien.** La churn réelle du lockfile est
   de 15 add / 10 remove ; le reste sont des binaires de plateforme optionnels déjà au lock.

### Tests (vérification indépendante, agent `test-runner`, 485 s)

`build` 0 · `lint` 0 · **1030/1030** (102 fichiers) · `typecheck` 0 · `build-storybook` 0.
Baseline pré-travaux relancée : 1030/1030 — **écart nul**. **Aucun écart** entre les rapports des
agents d'implémentation et la mesure indépendante.
E2E Playwright **non lancés** (dit, pas déguisé en vert) : hors périmètre, aucune surface applicative
touchée. `[COVERAGE-E2E] OK` — aucun `.tsx` modifié, donc rien à citer (`PIT-S61-005` : ce check
n'a jamais prouvé qu'une spec passe).

Audit : `docs/memory/audits/sprint-67-test-coverage.md`.

### Limites assumées

- E2E non exécutés.
- Downgrade `oxc-resolver` subi (pin exact amont) : couvert par build/lint/tests/build-storybook,
  sans vérification spécifique au-delà.
- L'audit est vert **à cette date** — une CVE publiée demain sur une devDep le repassera au rouge.
  C'est désormais l'usage attendu de l'étape informative, dont la baseline est verte.

### PR et CI

**PR #485** (`claude/sprint-67-start-a731f5` → `dev`), base vérifiée après création (MEMO-012).
**7/7 jobs verts au premier run** : `backend` 59 s · `frontend` 2 m 20 · `e2e` 8 m 23 ·
`flyway-smoke` 51 s · `security` 21 s · `ai-env-packs` 11 s · `secret-scan` 7 s.

Deux points valent d'être relevés :

1. **Les E2E ont tourné en CI et sont verts.** Ils n'avaient pas été lancés en local (dit comme tel
   dans les artefacts, jamais déguisé en vert) : la CI comble donc cette limite, elle ne la masque pas.
2. **L'étape `npm audit` INFORMATIVE est en `success`**, pas simplement absorbée par son
   `continue-on-error` (vérifié via l'API sur les steps du job, pas sur la conclusion du job).
   C'est la preuve directe que l'objectif de #438 est atteint : le signal rouge permanent a
   **disparu**, il n'a pas été masqué.

### Consolidation mémoire (Phase 2)

**Nouveaux pitfalls (4)** — tous classés `tooling`, packs `pit-*` régénérés (`--check` OK) :
  - `PIT-S67-001` — un « blocage amont non corrigeable » se périme EN SILENCE et survit dans un
    commentaire de CI puis dans les énoncés d'issues qui le citent (le cas `brace-expansion`)
  - `PIT-S67-002` — retirer l'`overrides.postcss` casserait l'étape CI **bloquante** (`next` épingle
    postcss en version exacte)
  - `PIT-S67-003` — le compteur « added N packages » de npm surestime massivement la churn réelle ;
    c'est en diffant le lock qu'on trouve ce que `--dry-run` ne montre pas
  - `PIT-S67-004` — `check-sprint-completeness.sh` lit **ligne à ligne** : une négation
    « pas de RECOMMAND_X » repliée sur la ligne suivante compte comme signal non traité ; et il
    cherche le rapport d'un spécialiste par le NOM d'un fichier du dossier du sprint

**Nouveaux patterns (2) :** `PAT-S67-001` (lire les plages du lock puis `npm update` ciblé plutôt
que `npm audit fix`) · `PAT-S67-002` (prouver qu'un override est load-bearing sur une copie hors dépôt).

**Nouvelles décisions (2) :** `DEC-S67-001` (l'étape audit CI reste informative malgré l'audit à 0) ·
`DEC-S67-002` (documenter un override : `_overridesRationale` + README).

### Le check de complétude a fait son travail — sur moi

`/sprint end` Phase 1 a échoué au premier passage avec **4 problèmes**, tous imputables au lead :
une section « Recommandations suite » absente de `issue-182-done.md`, et surtout **le rapport du
test-runner rangé dans `docs/memory/audits/` au lieu du dossier du sprint** — un spécialiste
réellement spawné mais invisible pour le hook, qui le comptait donc comme signal non traité.
Corrigé sur le fond (rapport déposé en `sprints/sprint-67/test-runner-report.md`, convention S61),
pas en contournant le check. Le 4e point a produit `PIT-S67-004`.

### Follow-ups arbitrés (Phase 4 — triage interactif)

**1 seul follow-up** remonté, aucun discardé :
  - Avertissement Next.js « multiple lockfiles », workspace root inféré hors du dépôt
    [XS | devops] (issue-435 — `RECOMMAND_FOLLOWUP`) → issue **#486**, **backlog libre**
    (sans milestone, arbitrage dev explicite). Motif de création malgré P3 : même racine que
    `PIT-S61-007`, qui avait coûté un diagnostic entier au S61 (« E2E impossibles »).

Ratio discard 0/1 — aucun sur-signalement.

**Milestone #68 :** propre à la clôture — exactement les 3 issues `sprint-67`, **aucun intrus**
d'un sprint précédent à détacher (contrairement au motif récurrent de
[[mytimeline-sprint-end-github-gotchas]]).

**Status :** En cours — PR #485 ouverte, CI verte, en attente de confirmation de merge

---

## Sprint 66 — 2026-09-02 → 2026-09-03 (Terminé — merge PR #479 dans `dev`)
**Objectif :** rendre la création d'événement atteignable et utilisable sous 1024 px
**Milestone GitHub :** #67
**Issues (2) :** #455 (M, P1, `epic:events`), #79 (S, P2, `epic:transversal`)
**Vagues :** V1 = #455 (ui-design pré-implem + fullstack-dev) | V2 = #79 (après #455 : `NewEventDrawer.tsx` / `.mt-sheet` partagés + harnais E2E = ressource d'exécution partagée, PAT-S65-002) | V3 = test-runner + review batch
**Migrations Flyway :** aucune
**Dépend de :** Sprint 65 (merge PR #474 dans `dev`, `97aba4a`)
**Planification :** plan architect `ade986f` (replanification S64-S68) jamais mergé dans `dev` — importé et vérifié à l'ouverture, cf. `docs/memory/sprints/sprint-66/architect-plans.md` (7 faits vérifiés, dont : sous `lg` seul le dashboard a une chrome mobile ; la doc DS `mobile-keyboard.md` citée par #79 n'existe pas ; 4 bottom sheets et non 3).
**Hors milestone :** #475, #476, #478 (follow-ups du S65 garés dans ce milestone, non labellisés `sprint-66`) — à détacher avant fermeture du milestone.
**Limite assumée :** le comportement réel du clavier virtuel (iOS/Android) exige un device — non couvrable en CI (E2E avec `visualViewport` stubbé = oracle de câblage).
**Designer (ui-design, pré-implem) :** #455 → FAB `<button>` natif 52×52 `lg:hidden` dans `AppShell` (seul point commun aux 4 écrans), `z-sticky` sous `z-modal`, testid `shell-mobile-new-event-button` ; #79 → bornage `maxHeight`/`top` sur `visualViewport`, `.mt-sheet__footer` (68 px, token `--space-17`), props opt-in `compact`/`footerPortalNode` sur `EventEditForm`, mode réduit = couleur + récurrence masquées, oracles `data-keyboard`/`data-compact`.
**Commits code :** `a5b18d5` (#455, 4 fichiers, +435/−9) · `f24ef96` (#79, 11 fichiers, +1433/−202)
**Tests (runs réels, HEAD `aaf85e2`) :** Vitest 1030/1030 (102 fichiers, baseline 1004) · `tsc` 0 erreur · E2E 246 tests : 238 passed / 0 failed / 8 skipped (7,8 min, `workers: 2`, backend e2e `:8086`) · contrôles négatifs joués sur les 2 issues (5 mutations, toutes rougissent)
**Reviews :** batch — 0 CRITIQUE / 0 MAJEUR code / 2 MINEUR (non corrigés, documentés) → PRET_POUR_MERGE, pas de cycle 2 nécessaire. `docs/memory/sprints/sprint-66/review-batch.md`
**Audit tests :** `docs/memory/audits/sprint-66-test-coverage.md`
**Follow-ups signalés (à trier en /sprint end) :** #455 → padding bas de sécurité sous 1024 px sur timeline/products/settings (P3) ; FAB tabulable derrière la sheet (P3, sans effet tant que `useFocusTrap` tient). #79 → test appareil réel iOS/Android ; câbler ou retirer le slot `footer` de `BottomSheet` (prop sans appelant prod) ; auditer les `duration-*` posées sans `transition-*`.
**Mémoire consolidée (7 signaux `[MEMORY:*]`, /sprint end 2026-09-03) :**
  - `pitfalls.md` : **PIT-S66-001** (action centrale avec un seul déclencheur sous `hidden lg:flex` — morte sous le palier sans test rouge), **PIT-S66-002** (`duration-*` seule arme `transition: all` → un `max-height` inline s'anime, lire `el.getAnimations()`)
  - `patterns.md` : **PAT-S66-001** (prouver « visible sous N px » : RTL câblage + unicité, E2E palier dans les deux sens + contrôle négatif), **PAT-S66-002** (rangée d'actions portalisée DANS `panelRef`, ref callback + `useState`, `form={id}`), **PAT-S66-003** (stub `visualViewport` qui mute ET dispatch, drapeau `pending` ≠ id rAF)
  - `decisions.md` : **DEC-S66-001** (`<button>` natif 52 px dans le shell vs `Button size="icon"` 36 px), **DEC-S66-002** (slot `footer` de `BottomSheet` exposé, non câblé)
  - `bugs-resolved.md` : **BUG-S66-001**
  - packs `pit-*` régénérés (2 entrées classées `frontend`) ; `docs/memory/sprints/sprint-66/ui-design-decisions.md` archive les 2 specs designer
**PR :** #479 (`claude/sprint-66-start-ebe593` → `dev`), CI 7/7 verte sur `12f50b4`, `mergeStateStatus: CLEAN` avant consolidation
**Saturation contexte lead (mesure) :** ~27 % du budget (opus) à l'ouverture de la clôture
**Follow-ups arbitrés (Phase 4 triage — 5 retenus en backlog libre, 0 abandonné, 0 absorbé) :**
  - FAB mobile : padding bas de sécurité sous 1024 px sur timeline/products/settings [XS | design] → issue **#480**
  - FAB mobile : sortir le déclencheur de l'ordre de tabulation quand la sheet est ouverte [XS | design] → issue **#481**
  - Vérifier sur appareil réel (iOS Safari, Android Chrome) l'évitement du clavier virtuel [S | transversal] → issue **#482**
  - BottomSheet Réglages : câbler ou retirer le slot `footer` (DEC-S66-002) [S | auth] → issue **#483**
  - Auditer les utilitaires `duration-*` sans `transition-*` explicite (PIT-S66-002) [S | design] → issue **#484**
**Milestone :** #67 fermé après merge ; #475, #476, #478 (follow-ups du S65 garés dans ce milestone, jamais planifiés) détachés avant fermeture.
**Commits :** 8 (1 ouverture, 1 par issue ×2, 2 artefacts de vague, 1 audit/review/PR, 1 consolidation mémoire, 1 bilan de triage)
**Artefacts conservés :** 2 `issue-*-done.md`, 2 `spawn-ref-*.txt`, `architect-plans.md`, `review-batch.md`, `ui-design-decisions.md`. Briefings supprimés avant la PR.
**Status :** Terminé

## Sprint 65 — 2026-09-02 (Terminé — merge PR #474 dans `dev`)

**Objectif :** Bornage temporel des récurrences + fiabilité du harnais E2E
**Milestone GitHub :** #66
**Issues (4) :** #451, #452, #469, #470
**Vagues :** V1 = #452 + #451 + #469 (parallèles, fichiers disjoints) | V2 = #470 (après #469, `playwright.config.ts` partagé)
**Cohésion :** 0.0 entre les paires (#451+#452 = `epic:events` 1.0 ; #469+#470 = `epic:infrastructure` 1.0). Périmètre élargi sur décision dev (2026-09-02) : les 4 issues du milestone, au-dessus du garde-fou ≤3 issues/~10 pts du skill.
**Migrations Flyway :** **aucune**. Une V16 de purge a été écrite puis **retirée** avant la PR (review db-expert + vérification lead) : l'expansion étant calculée à la LECTURE, les lignes sans `recurrence_end_date` sont déjà bornées à 5 ans par le code de #452 — le `DELETE` n'apportait rien et détruisait le tier `archived`. V16 reste le prochain numéro libre.
**Dépend de :** Sprint 64 (merge PR #468 dans `dev`, `54bcf30`)

**Décision produit #452 (tranchée par le dev, 2026-09-02) — les 3 questions exigées par l'issue :**
1. Borne temporelle backend **seule** : un plafond en années s'ajoute aux 4000 occurrences de
   `RecurrenceExpansion.MAX_OCCURRENCES`.
2. `recurrenceEndDate` **reste hors du DTO de création** — **BR-EVE-012 inchangée**, pas de
   modification du formulaire de création.
3. Données existantes : **supprimées** (aucune donnée réelle en base à ce jour). Si un test a
   besoin d'une récurrence, il lui pose une date de fin explicite.

**État d'entrée #451 (`possibly_done`, vérifié en Phase 0.5) :** le correctif de code est **déjà
dans `dev`** — `3dcc5ea` (`fix(timeline): ancre le defilement sur le temps, pas sur les pixels`,
PR #449, 2026-08-31) a introduit `anchorDaysRef` + le `useLayoutEffect` sur `dayWidth`
(`TimelineView.tsx:895-912`) qui re-projette `scrollLeft` au changement d'échelle en préservant le
repère PISTE de #392. Le corps de l'issue décrit un code (`TimelineView.tsx:795-820`) qui n'existe
plus. Reste à couvrir : le **test de non-régression** du cas mesuré (clamp horizontal), absent —
la spec la plus proche (`timeline.spec.ts:977`) dézoome et asserte une pastille, mais via
`revealSeededLane`, parade à la virtualisation **verticale**, donc elle n'épingle pas le clamp.

**Commits :** 9 (1 cadrage, 1 par issue, 1 retrait V16, 1 mesure, 1 correctifs de review)
**Tests :** Backend 465/465 · Frontend unitaire 1004/1004 (101 fichiers) · E2E 232/240 passed, 8 skipped, 0 failed (`workers: 2`)
**Reviews :** batch — 0 CRITIQUE / 3 MAJEUR / 1 MINEUR, **tous résolus au cycle 2** (`aa57109`) ; db-expert sur V16 → migration retirée
**Audit tests :** `docs/memory/audits/sprint-65-test-coverage.md`

**Deux erreurs d'orchestration du lead, consignées pour la mémoire :**
1. **Vagues découpées sur les fichiers, pas sur les ressources d'exécution.** #451 et #469 avaient
   des fichiers disjoints mais partageaient le harnais E2E : #451 devait le FAIRE TOURNER pendant
   que #469 le RÉÉCRIVAIT. L'agent de #451 s'en est sorti en isolant son harnais (`git archive`
   dans un répertoire jetable) — parade de lui, pas du plan.
2. **Un résultat rouge publié alors qu'il venait de ma propre interférence.** Ma campagne de mesure
   de #469 tournait en même temps qu'une campagne encore vivante du subagent, les deux écrivant
   dans les MÊMES fichiers de log d'un scratchpad partagé et partageant `e2e/.auth/`. J'ai conclu
   « le correctif ne tient pas » ; le subagent m'a réfuté, preuve à l'appui (`M1.log` contenait DEUX
   résumés finaux). Diagnostics fautifs : `find -maxdepth 4` trop court pour atteindre le scratchpad
   (« pas de logs » ≠ « runs morts ») et un `ps` tombé entre deux runs. Parade adoptée : compter les
   blocs `Running N tests using M workers` par log (doit valoir 1) et utiliser un répertoire de logs
   horodaté unique.

**Follow-ups arbitrés (Phase 4 triage — 4 retenus, 0 abandonné, 0 absorbé) :**
  - Budget `register` E2E au plafond (5/run vs 5/min/IP, sans marge ; masqué en local par
    `RATE_LIMIT_ENABLED=false`) [S | infrastructure] → issue **#475** (Sprint 66)
  - Viabilité de `workers > 1` en CI non démontrée — dépend de #475 [M | infrastructure] →
    issue **#476** (Sprint 66)
  - Zoom AVANT (`+`/`=`) non épinglé, un seul couple de niveaux couvert [S | events] →
    issue **#477** (backlog libre)
  - `run-lock.ts` : `isAlive` traite `EPERM` comme « process mort » (latent, sans effet
    aujourd'hui) [XS | infrastructure] → issue **#478** (Sprint 66)

**Mémoire consolidée (8 signaux `[MEMORY:*]`) :**
  - `pitfalls.md` : **PIT-S65-001** (restaurer par `mv` d'une copie `cp` ne préserve pas la mtime →
    Maven rejoue du bytecode périmé, 4 faux échecs mesurés), **PIT-S65-002** (run de mesure en
    arrière-plan qui meurt avec la session + deux campagnes concurrentes qui se corrompent ;
    parade = compter les blocs `Running` par log), **PIT-S65-003** (listing Playwright `--list`
    sans `rtk proxy` → `PASS (0) FAIL (0)`), **PIT-S65-004** (boucle de poll CI dont la condition
    cherche un mot dans la sortie texte), **PIT-S65-005** (éditer une entrée `PIT-*` existante
    périme les packs, pas seulement en ajouter une)
  - `patterns.md` : **PAT-S65-001** (face à une signature connue, vérifier que les garde-fous ont
    parlé), **PAT-S65-002** (découper les vagues par ressource d'exécution, pas seulement par
    fichiers), **PAT-S65-003** (contrôle négatif dans les deux sens + oracle sur l'invariant)
  - `decisions.md` : **DEC-S65-001** (horizon sur les seules séries sans borne explicite, pour
    garder `MAX_OCCURRENCES` atteignable), **DEC-S65-002** (identité E2E par l'environnement, pas
    par un fichier), **DEC-S65-003** (pas de migration : les données existantes sont bornées par
    le code)
  - `bugs-resolved.md` : **BUG-S65-001**, **BUG-S65-002**
  - `.ai-env/context-packs/br-events.md` : BR-EVE-012 **complétée** (horizon 5 ans, règle
    inchangée) ; packs `pit-*` régénérés après classification des 5 nouvelles entrées

**Artefacts conservés :** 4 `issue-*-done.md`, 4 `spawn-ref-*.txt`, `db-expert-review-v16.md`,
`test-runner-report.md`. Briefings supprimés (556 Ko → 72 Ko).

**Status :** Terminé

## Sprint 64 — 2026-09-01 → 2026-09-02 (Terminé — merge PR #468 dans `dev`)

**Objectif :** rendre la chaîne E2E diagnosticable et représentative — un échec en CI doit laisser
une preuve téléchargeable, la suite doit valider un build de production et non un serveur de dev,
et un run local complet ne doit plus mourir sous sa propre charge.
**Milestone GitHub :** #65 (fermé après merge — 5 issues, 0 ouverte)
**Issues livrées (5) :** #461, #465, #462, #427, **#467** (absorbée en clôture)
**Vagues exécutées :** V1 = #461 | V2 = #465 | V3 = #462 (+ #427 absorbée) — **strictement
séquentielles** (les 4 issues touchaient toutes `playwright.config.ts` : parallélisme nul)
**Migrations :** aucune — sprint 100 % outillage E2E/CI
**Dépend de :** Sprint 63 (les 3 issues du milestone en sont des follow-ups directs)
**Cohésion :** 1.00 sur le label epic (`epic:infrastructure` pour #461/#462/#465, `epic:devops`
pour #427) — même chaîne technique, mêmes fichiers.

### Écarts au skill assumés à l'ouverture

1. **Sprint jamais planifié par `/sprint plan`** — ni entrée d'historique, ni `architect-plans.md`,
   comme aux S62 et S63. Un architect en lecture seule a donc été spawné en Phase 3 de
   `/sprint start`, et ses 3 conclusions les plus lourdes ont été **re-vérifiées par le lead** avant
   d'être briefées (`ci.yml:35-39`, `middleware.ts:110-118`, `PIT-S58-003`).
2. **Périmètre porté à 4 issues** — au-delà de la borne du skill (3 issues OU ~10 points), sur
   arbitrage explicite du dev. #427 est XS et touche le fichier déjà ouvert par #462 ; la laisser
   au backlog aurait laissé intact, sur le poste local, le défaut qui a déjà fait dérailler les
   sprints 47, 56 et 57.
3. **`detect-domain.sh` renvoie `products` pour les 4 issues** — fallback erroné : ce sont des
   issues d'outillage, sans rapport avec le domaine produits. Aucun pack `br-devops`/`br-infra`
   n'existe. Les briefings inlinent `cp-frontend.md` et imposent en étape 0 la lecture de
   `pit-frontend.md` depuis `.ai-env/context-packs/` — même déviation qu'au S63, même motif
   (le pack complet saturerait la fenêtre du lead), même garde-fou (chemins suivis par git,
   échec en `PARTIAL` s'ils sont illisibles).

### Le fait structurant : aucune CI ne tourne sur `sprint/64`

`.github/workflows/ci.yml:35-39` ne déclenche que sur `pull_request: [dev, main]` et
`push: [dev, main]`. Le sprint n'aura donc **aucun retour CI avant l'ouverture de la PR** (Phase 9),
et le critère d'acceptation de #461 — « vérifier sur un échec provoqué en CI » — ne peut être
satisfait que par une **PR jetable vers `dev`**, jamais mergée, jamais confondue avec la PR de
sprint. Ce point n'était identifié par aucune des issues.

### Arbitrages de la Phase 3 (dev, avant tout développement)

- **#427 absorbée dans #462.** #462 supprime le `webServer` en CI mais le **conserve en local**
  (`PLAYWRIGHT_BASE_URL` absent) : le défaut de #427 survit intégralement au poste local. ⚠ La
  piste principale de #427 (« injecter un bloc `env` dans `webServer` ») est **invalidée par
  PIT-S58-003** — les rewrites sont sérialisées au build, pas au démarrage. Seule sa 2e piste tient :
  échouer tôt, avec un message explicite, si les variables manquent.
- **#465 re-scopée en parade documentée.** Le critère « cause racine identifiée » est retiré.
  Motif : l'audit `sprint-63-test-coverage.md:95` attribue les 62 échecs au « projet Firefox », or
  le `testMatch` de ce projet est restreint à **une seule spec** depuis le S62 (commit `97f92e8`,
  inchangé) — 230 tests ne peuvent pas en venir ; ce qui a tourné est la suite complète. Le
  symptôme est réel, son attribution ne l'est pas, et la correction du libellé entre dans le
  périmètre. Sur une occurrence unique non reproductible, exiger la cause racine rendait l'issue
  non closable. Corps de l'issue réécrit + commentaire de traçabilité
  (`#465-issuecomment-5500891018`). Précédent : #74 re-scopée en audit au S63.
- **Ordre des vagues.** L'ordre naïf #461 → #462 → #465 a été écarté : placer #465 après #462
  l'exposait à une re-scope à zéro sur le malentendu « le mode prod règle le problème » — or #465
  porte sur le poste **local**, où `next dev` reste utilisé après #462.

### Deux angles morts des issues, corrigés avant briefing

1. **#462 casserait la 2e passe E2E** — le job `e2e` lance deux passes Playwright dont les modes du
   middleware sont mutuellement exclusifs sur une instance Next ; c'est le redémarrage du
   `webServer` entre les passes qui les rend possibles. Poser `PLAYWRIGHT_BASE_URL` met `webServer`
   à `undefined` et supprime ce redémarrage. L'issue est silencieuse là-dessus. Résolution retenue :
   **un seul `next build`, deux `next start`** sur deux ports — `middleware.ts:110-118` lit
   `AUTH_JWT_PUBLIC_KEY` au runtime, par requête, jamais inlinée (mesure #322), donc seul le process
   doit différer.
2. **Répartition build/runtime des variables** — `NEXT_PUBLIC_API_URL` **et** `E2E_API_PROXY_TARGET`
   doivent être posées au `next build` (PIT-S58-003 : les rewrites sont sérialisées dans
   `routes-manifest.json`). Oracle avant toute conclusion : `curl /api/auth/me` → 401.

### Bilan

**Commits :** 18 · **Migrations :** aucune — sprint 100 % outillage, aucun fichier source
applicatif touché avant l'absorption de #467
**BR impactées :** aucune
**Tests :** `tsc` EXIT=0 · `next build` EXIT=0 (~22 s) · lint EXIT=0 · Vitest **1004/1004** ·
backend **462/462** · E2E **229 passed / 2 failed** puis **tout vert après #467**
**Reviews :** batch en **2 cycles** — cycle 1 : 0 CRITIQUE / 3 MAJEUR / 3 MINEUR (tous corrigés
dans `9c774e4`) ; cycle 2 **sur le commit de correction lui-même** : 0 CRITIQUE / 0 MAJEUR, les
6 correctifs vérifiés **armés** sur pièce
**Nouveaux :** `PIT-S64-001..009`, `PAT-S64-001..003`, `DEC-S64-001..004` (+ `PIT-S63-017` enrichi)

### Le résultat le plus net : le job `e2e` a RACCOURCI

| | Durée |
|---|---|
| Avant (run `33431893101`) | 13 min 14 s |
| Après (`next build` + 2 serveurs de production) | **8 min 01 s** puis 8 min 10 s et 8 min 58 s |

**−36 % en moyenne.** Les ~28 s de `next build` sont plus que compensées par la disparition des
compilations à froid de `next dev` et de l'attente de démarrage. On a gagné **à la fois** en
représentativité et en durée — ce qui n'était donné que comme hypothèse en Phase 3.

### Ce qui a été prouvé, et comment

Chaque affirmation est adossée à une mesure, jamais à un run vert :

| Affirmation | Preuve |
|---|---|
| Un échec E2E laisse un artefact exploitable | Échec **provoqué** sur PR jetable (run `33563972215`) : 8,9 Mo, `index.html` de 1,1 Mo, 4 `trace.zip`. **Et resservi deux fois pour de vrai** pendant la clôture |
| La passe 2 RS256 exerce **encore** le mode vérifiant | **Contrôle négatif** : 12/12 sur le serveur vérifiant, **5 rouges** sur le dégradé |
| Le prérendu de production ne casse pas `/_not-found` | 5 tests rejoués **un par un** contre `next start` — 13/13 |
| `workers: 1` empêche la mort du serveur | Run complet par le **chemin par défaut** (turbopack via `webServer`) : 0 `ECONNREFUSED` |
| Le correctif #467 ne dépend pas du volume | Validé à 62 lanes en local, **vert en CI à 99 lanes** sur 2 runs |

### Les trois découvertes qui ont changé le travail

1. **Aucune CI ne tourne sur `sprint/64`** (`ci.yml:35-39`). Le premier vrai run d'un sprint est
   l'ouverture de sa PR — d'où la PR jetable pour prouver #461.
2. **#462 appliquée naïvement aurait cassé la 2e passe RS256, en silence** : `PLAYWRIGHT_BASE_URL`
   met `webServer` à `undefined`, supprimant le redémarrage entre les passes. La passe serait
   restée **verte sans plus rien exercer**.
3. **Les 3 MAJEUR de la review mentaient aussi** : `$!` capturait le PID de `npx` et non de
   `next start` (le step d'arrêt déclarait arrêter ce qu'il n'arrêtait pas), le step de démarrage
   **ne pouvait jamais échouer**, et **aucun `timeout-minutes` n'existait nulle part** dans le
   workflow.

### #467 absorbée en clôture — le flake était devenu un gate

Sur les 3 premiers runs CI du sprint, **2 étaient rouges** à cause de la famille de flakes de
virtualisation. Diagnostiquée en vague 1 sur l'artefact que #461 venait de rendre disponible
(76 puis 99 lanes contre un seuil de 60), elle a d'abord été tracée en issue, puis **absorbée** sur
arbitrage du dev quand elle a bloqué le merge. Correctif : `revealSeededLane()`
(`frontend/e2e/support/timeline-lanes.ts`), sans toucher au produit ni affaiblir une seule
assertion. Le commentaire d'`ADR-007` qui portait l'hypothèse fausse a été corrigé.

**Absorbé en cours (XS) :** `frontend/.gitignore` ne couvrait pas `*.log` (`7274b24`).

**Follow-ups arbitrés (Phase 4 triage) — ratio discard 0/7 :**
  - `frontend/.gitignore` sans `*.log` [XS] → **absorbé** (`7274b24`)
  - Sortir `RUN` du scope module de `accounts.ts` [M] → issue **#469** (Sprint 65)
  - `--pass-with-no-tests` sur `test:e2e` [XS] → issue **#470** (Sprint 65)
  - Cause racine de la mort de `next dev` [L] → issue **#471** (backlog libre)
  - 2 flakes E2E résiduels découverts pendant #467 [M] → issue **#472** (backlog libre)
  - Mesurer la durée réelle du job `e2e` → **fait** (8 min 01 s), consigné ici
  - Supprimer la branche jetable `chore/461-artifact-proof` → **fait** (après confirmation du dev)

### Ce qui reste non prouvé

- **La survie d'un serveur orphelin après le step d'arrêt n'a jamais été observée** : le PID est
  faux par construction, mais `npm` a relayé le SIGTERM dans l'essai. Le commentaire du fichier le
  dit sans surclamer.
- **La mort du serveur à ~5 workers n'a pas été reproduite** : la parade #465 est calibrée sur un
  symptôme documenté au S63, pas rejoué ici.
- **Les 2 flakes de #472 n'ont jamais été vus en CI**, seulement en local sur 5 runs.
- L'oracle `curl → 401` n'a pas été rejoué pendant la fenêtre de la re-mesure E2E de #465.

**Status :** **Terminé** — PR **#468** (`sprint/64` → `dev`) mergée le 2026-09-02, milestone #65
fermé. Titre et ligne `Status` volontairement redondants (`PIT-S56-006`).
---

## Sprint 63 — 2026-08-31 (Terminé — merge PR #449 dans `dev`)

**Objectif :** Milestone « Débordements en langue allemande » — périmètre élargi par le dev aux 6
issues du milestone (DE overflow + dette design/DS + i18n + couverture E2E).
**Milestone GitHub :** #64 (décalage +1 conservé depuis S57)
**Issues (6) :** #74, #423, #441, #442, #446, #447
**Vagues :** à définir (architect Phase 3 — voir `docs/memory/sprints/sprint-63/architect-plans.md`)
**Migrations :** aucune attendue — sprint 100 % frontend
**Dépend de :** Sprint 62 (#446 et #447 sont ses follow-ups directs)

### Écarts au skill assumés à l'ouverture

1. **Sprint jamais planifié par `/sprint plan`** — ni entrée d'historique, ni `architect-plans.md`.
   Comme au S62, un architect en lecture seule est spawné en Phase 3 de `/sprint start` pour
   confronter les pistes techniques au code avant tout briefing. Au S62 ce détour avait invalidé
   **2 pistes sur 3** et un défaut inexistant.
2. **Périmètre à 6 issues, ~4 domaines** — au-delà des bornes du skill (3 issues OU ~10 points) et
   cohésion faible par construction. Le dev a été averti des deux options plus étroites
   (label seul = #423 + #74 ; ou +#446) et a **explicitement retenu le milestone complet**.
3. **Le milestone contenait 4 issues non labellisées** (#441, #442, #446, #447) — follow-ups des
   S61/S62 garés là, piège déjà documenté (`mytimeline-sprint-end-github-gotchas`). Elles ont été
   labellisées `sprint-63` à l'ouverture pour que label et milestone concordent, plutôt que
   détachées : c'est la conséquence du choix de périmètre ci-dessus.

### Arbitrages de la Phase 3

- **#74 re-scopée en audit** (arbitrage dev, 2026-08-31). L'architect a établi que **3 des 4
  actions demandées ciblaient des composants inexistants** : aucun composant `Segmented` dans le
  dépôt, `.mt-eyebrow` / `.mt-btn--wrap` / `.mt-tabs--collapsible` à **0 appelant**, et les règles
  `tabs` exigent `.mt-tabs__row` / `.mt-tabs__menu` qui n'existent que dans `i18n.css`. Vérifié
  deux fois (architect, puis lead par `git grep`). Corps GitHub réécrit + commentaire traçant les
  alternatives écartées (sortir du sprint / garder tel quel). Dépendance déclarée « bloqué par
  #45 » **levée** : `globals.css:31` importe déjà `i18n.css`.
- **Vagues arrêtées** : V1 = #446 + #447 + #442 (parallèles, 0 fichier commun) | V2 = #441
  (après #446 : `DeleteConfirmDialog.tsx`) | V3 = #423 (après #441 : `locales/*/common.json`) |
  V4 = #74 (après #423 : `HeaderSection.tsx` + specs landing). #446, seul P1, est en V1.

### Déviation d'outillage assumée

`inject-pack.sh` n'a pas de mode allégé : les briefings composés font 100–127 KB pièce (dont 63 KB
de `pit-frontend.md`), et le prompt d'un `Agent` doit être inliné. Trois briefings à ce format
satureraient la fenêtre du lead. Choix retenu : le prompt inline `cp-frontend.md` en entier (le
garde-fou `pre-spawn-fullstack.sh` est satisfait par un vrai pack, marqueur compris) et impose en
**étape 0 obligatoire** la lecture de `pit-frontend.md` / `br-events.md` depuis
`.ai-env/context-packs/`. Le pitfall que le garde-fou protège (`@/tmp/ctx-…` non expansé) ne
s'applique pas : ce sont des chemins **suivis par git**, vérifiables par l'agent, avec consigne
d'échouer en `PARTIAL` s'ils sont illisibles. Les briefings complets restent sur disque pour
`/resume-failed`.

### Bilan

**Issues livrées (6) :** #446, #447, #442, #441, #423, #74
**Vagues exécutées :** V1 = #446 + #447 + #442 (parallèles) | V2 = #441 | V3 = #423 | V4 = #74
**Commits :** 16 (dont 2 cycles de correctif post-review)
**Migrations :** aucune — sprint 100 % frontend
**BR impactées :** BR-EVE-015 (couverte en E2E, non modifiée) ; `BR-EVE-012` mise en cause par #452
**Tests :** `next build` EXIT=0 · backend 462/462 · frontend 1004/1004 · E2E 229 passed
**Reviews :** batch sprint (1 MAJEUR corrigé) + `/review-pr 449` (1 MAJEUR préexistant, 2 MINEUR corrigés)
**Nouveaux :** `PIT-S63-001..017`, `PAT-S63-001..007`, `DEC-S63-001..004`, `BUG-S63-001..004`, `ADR-008`

### Le fait marquant : 3 pistes d'issue sur 6 étaient fausses ou incomplètes

Le sprint n'ayant jamais été planifié, un architect a été spawné en Phase 3. Ce détour a payé :

| Issue | Ce que disait l'issue | Réalité mesurée |
|---|---|---|
| #74 | appliquer 4 familles d'utilitaires `i18n.css` | **3 des 4 ciblent des composants inexistants** — aucun `Segmented` au dépôt, `.mt-tabs--collapsible` exige un markup absent. Issue **re-scopée en audit** |
| #447 | asserter le focus « des 3 sélecteurs surveillés » | **Aucun** ne porte de règle de focus (formes composées frère-adjacent). Suivre l'issue aurait fait **rougir du CSS sain** |
| #446 | « un seul des 6 consommateurs de `ui/select` est affecté » | Vrai pour `ui/select`, **trompeur** : `PopoverPicker`, même drawer, cassé à l'identique |

### L'architect s'est trompé 4 fois, chaque fois corrigé par la mesure d'un agent

Compte de tests (#442 : 7 annoncés, **5** réels — l'issue avait raison), statut de `.mt-radio__dot` (#447), arbitrage binaire (#441 : une **3ᵉ voie** existait, déjà conventionnelle), risque de régression (#423 : infirmé, 38 px au pire). **Aucune** de ces corrections n'est venue d'un doute théorique — toutes d'une re-mesure.

### Deux découvertes convergentes, trouvées indépendamment

La **création d'événement est injoignable sous 1024 px** : l'unique appelant de `setShowCreate(true)` vit dans un `<aside … lg:flex>`. Trouvée par #446 (variante `.mt-sheet` sans déclencheur) **et** par #74 (audit de largeurs), par deux voies distinctes.

### La review de PR a coûté cher, et c'est ce qui l'a rendue utile

Partie d'un flake E2E, elle a abouti à **deux défauts produit démontrés** (#451, #452) et deux autres corrigés au passage : `scroll-behavior: smooth` qui faussait toute mesure de défilement, et le centrage initial calculé sur une **étendue factice** — la frise s'ouvrait **13 ans avant aujourd'hui**, sans aucun symptôme.

**Le flake n'est PAS refermé.** Taux du job `e2e` : ~**50 % avant comme après** correctif (5 runs : échec, succès, échec, succès, échec-puis-succès-au-rejeu). Ni un échec ni un vert isolés ne concluent. Suite dans #451.

### Erreurs de méthode du lead, consignées

1. **Conclusion sur un échantillon de un, deux fois** — « contamination confirmée » après un seul vert (démenti au run suivant, sur un commit de **documentation seule**), puis « le correctif ne marche pas » après un seul rouge, alors que le taux de base était déjà de 50 %.
2. **`next build` annoncé vert sans être reproductible** — un run direct l'a démenti (`EXIT=1`, binaire natif absent). `node_modules` était cassé, pas le code ; réparé par `npm ci`, puis EXIT=0.
3. **Contrainte présentée comme verrouillée alors qu'elle ne l'était pas** — 3 specs censées verrouiller la formule de scroll de #392 : `scrollLeft` n'y figure que comme **mesure**. Famille `PIT-S58-004`.
4. **Reproche infondé à un agent**, accusé d'avoir esquivé le travail et cité un identifiant inexistant : il existait et a produit le meilleur diagnostic de la session.
5. **Diagnostic périmé recyclé** — « l'ancre est keyée sur `dayWidth` seul » alors que l'agent l'avait entre-temps corrigé.

### Écarts de skill relevés

- `check-sprint-completeness.sh` a remonté **7 signaux « non traités » dont 5 étaient des négations explicites** ; le `grep` ne distingue pas « pas de `RECOMMAND_X` » d'une demande. Idem pour la précondition Phase 9 `grep "[MISSING]"`, qui aurait abandonné sur des phrases « **Aucun** `[MISSING]` ». Cf. `PIT-S63-017`.
- Le check de couverture E2E est **aveugle aux testids dynamiques** : il n'a rien vu du seul testid ajouté (template literal), vérifié à la main.
- `detect-domain.sh` inexploitable sur ce sprint (#74 → `auth`, #446 → `events` pour un sujet DS).
- Le triage de `/review-pr` a levé un **faux positif `auth`** sur le chemin `styles/ds/tokens/`.
- **Déviation d'inlining assumée** : `inject-pack.sh` n'ayant pas de mode allégé (127 KB par briefing), les prompts ont inliné `cp-frontend.md` et imposé la lecture de `pit-frontend.md` / `br-events.md` en étape 0 bloquante.

**Status :** **Terminé** — PR **#449** (`sprint/63` → `dev`) mergée le 2026-08-31, milestone #64 fermé. Titre et ligne `Status` volontairement redondants (`PIT-S56-006`).

---

## Sprint 62 — 2026-08-30 → 2026-08-31 (Terminé — merge PR #445 dans `dev`)
**Objectif :** Dette d'accessibilité WCAG du design system — `lang` de page et indicateurs de focus.
**Milestone GitHub :** #63 (fermé après merge)
**Issues livrées (3) :** #413, #414, #415
**Vagues exécutées :** V1 = #413 + #415 parallèles | V2 = #414 + correctif 404 parallèles
**Cohésion :** 1,00 (3 issues, même domaine, aucun chevauchement de fichiers)
**Commits :** 21 (7 de code, 14 de documentation)
**Migrations :** aucune — sprint 100 % frontend
**BR impactées :** aucune

### Le fait marquant : deux pistes fausses et un défaut inexistant
Sur les 3 issues planifiées, **deux pistes techniques se sont révélées fausses et une issue décrivait
un défaut qui n'existe pas**. `/sprint plan` n'avait persisté ni entrée d'historique ni
`architect-plans.md` : un architect a donc été spawné en Phase 3 de `/sprint start`, en lecture seule,
pour confronter les pistes au code. C'est ce qui a évité de partir sur un chemin fantôme.

| Issue | Ce que disait l'issue | Réalité mesurée |
|---|---|---|
| #413 | `<html lang>` dans `frontend/src/app/[locale]/layout.tsx` | Ce chemin **n'existe pas** (app router = `frontend/app/`) ; la balise est en dur dans le layout **racine**, où `locale` est inaccessible |
| #414 | Les options de `Select` n'obtiennent jamais `:focus-visible` sous Firefox | **INFIRMÉ.** Le contour est peint à 6,08:1 / 6,48:1. Les 1,23:1 de #383 mesuraient la **surface de survol**, pas l'indicateur |
| #415 | « Les deux composants sont **en production** » | `<Radio>` n'a **aucun consommateur applicatif**. Seul `<Switch>` est monté, une fois. L'erreur venait de `decisions.md:437` — rectifiée |

### Arbitrages produit tranchés par le dev
- **#413 — voie imposée** : descendre `<html>`/`<body>` sous `[locale]` (pattern next-intl), seule
  voie conservant le SSG **et** donnant un `lang` correct dès le HTML SSR. `headers()` aurait basculé
  52 routes en dynamique ; la rustine client laissait le HTML servi à `fr`. **Issue rebadgée
  `size:S` → `size:M`.** Voir `DEC-S62-001`.
- **#413 — régression 404** : le layout racine transparent a cassé la 404
  (`NEXT_MISSING_ROOT_TAGS`). Deux contournements **mesurés inefficaces** et retirés par le subagent,
  qui a rendu `PARTIAL` plutôt que de forcer une 3ᵉ voie. Arbitrage dev :
  `experimental.globalNotFound` — piste trouvée par le lead **après coup** (Next 15.5.22 installé,
  masqué par un `^15.2.4` en `package.json`). Voir `PAT-S62-002`.
- **#414 — harnais** : `playwright.config.ts` ne déclarait que `setup` + `chromium`, rendant les
  critères d'acceptation **inexécutables**. Décision : projet `firefox` **restreint par `testMatch`**
  à la seule nouvelle spec. WebKit hors périmètre. Voir `DEC-S62-003`.

### Régressions introduites par le sprint, et corrigées dans le sprint
1. **404 cassée** par la descente du document → `26b5c26` (`globalNotFound`), vérifié sur
   4 environnements (prod standalone, dev webpack, dev turbopack).
2. **`<title>` perdu** — retirer un layout retire **aussi sa `metadata`**, silencieusement, là où
   `NEXT_MISSING_ROOT_TAGS` est bruyant → `899fd91` (scission Server/Client). Voir `PIT-S62-004`.

### Reviews — 2 cycles
- **Cycle 1** (diff complet) : `CORRECTIONS_REQUISES` — **3 MAJEUR + 4 MINEUR**, les MAJEUR tous dans
  `e2e/support/pixel.ts`, module écrit pour rendre le faux ratio silencieux impossible et capable
  d'en produire de trois façons. Corrigés (`f275db4`, `3e2f90c`).
- **Cycle 2** (déclenché par le dev : *« faut pas faire la review avant ? »*) — les **commits de
  correction n'avaient jamais été relus**, alors que `f275db4` est du code de garde réparant du code
  de garde. Verdict `PRET_POUR_MERGE`, MAJEUR vérifiés résolus **dans le code**. Il a aussi
  **invalidé un soupçon soufflé par le lead** (`Math.abs` prétendument affaiblissant) en vérifiant
  plutôt qu'en suivant. Et surtout : **les gardes n'étaient armées par aucun test** (fixtures
  supprimées avant commit) → `25d2474`, 19 tests vitest, chacun prouvé rouge garde neutralisée, avec
  contrôles négatifs. Voir `PIT-S62-003`, `PAT-S62-004`.

### Tests (exit codes lus, sur l'état commité)
Frontend vitest **969/98** · `tsc` 0 · `eslint` 0 · `next build` **SSG 52/52** ·
E2E **216 déclarés, 208 passed, 0 failed, 8 skipped** (chromium + firefox) · CI PR **7/7**.
Deux specs **prouvées non vacuous** contre le build antérieur (4/4 pour le `<title>`, 5/5 pour la 404).
Audit : `docs/memory/audits/sprint-62-test-coverage.md`.

### Défaut réel découvert par accident
**Popover du `Select` jamais peint dans `NewEventDrawer`** (`z-popover: 50` sous `z-modal: 70`,
drawer non portalisé) — trouvé en mesurant #414. Inutilisable clavier et souris, desktop et mobile.
Non corrigé, **figé en 2 `test.fail()`** qui rougiront à la correction. Voir `BUG-S62-002`.

### Incidents de méthode consignés
- **Un audit de tests a conclu « BLOQUANT, ne pas merger » à tort** : il avait laissé Playwright
  démarrer son propre serveur sans `E2E_API_PROXY_TARGET` (oracle `404` au lieu de `401`). Famille
  `e2e-cors-origin-proxy-trap`. Voir `PIT-S62-012`.
- **Erreur du lead** : un briefing exigeait de citer le contenu d'un briefing **supprimé juste avant
  la PR** (convention anti-bloat) — exigence infalsifiable. L'agent a **refusé d'inventer** les
  marqueurs et l'a signalé. Voir `PIT-S62-014`.
- **Deux agents ont corrigé une affirmation** — la leur ou celle d'un prédécesseur (« environnement
  laissé debout » qui ne l'était plus ; « 0 message console » qui valait 1). Les deux fois par
  re-mesure, pas par doute théorique.
- **Faux écart levé avant d'ouvrir un follow-up** : « firefox 13 vs 8 » — `--list --project=firefox`
  compte la dépendance `setup` (5). Les deux agents comptaient juste.

**Nouveaux pitfalls / patterns / bugs / décisions :** `PIT-S62-001..014`, `PAT-S62-001..005`,
`BUG-S62-001..002`, `DEC-S62-001..004`.

**Absorbé en cours :** en-tête périmé de `globals.css` (XS) ; 3 commentaires qui mentaient corrigés
(`3e2f90c`) ; une ligne de `.github/workflows/ci.yml` (`playwright install chromium` →
`chromium firefox`) — **non facultative** : sans elle, le job `e2e`, check requis, rougissait.

**Follow-ups arbitrés (Phase 4 triage) :**
  - Popover du `Select` invisible dans `NewEventDrawer` [P1 | design] → issue #446 (Sprint 63)
  - Aucun garde-fou source contre un focus invisible réintroduit [S | design] → issue #447 (Sprint 63)
  - Sonde de pixel : tolérance HiDPI + `{@link}` mort [XS | design] → issue #448 (backlog libre)
  - `<title>` de la 404 non localisé [XS | design] → **discard** — `DEC-S62-002` acte déjà le choix ;
    une localisation post-hydratation ne changerait ni le HTML servi ni ce qu'entend un lecteur
    d'écran avant hydratation, pour une 2ᵉ source de vérité
  - *(le 5ᵉ signalé — restaurer le `<title>` — a été traité dans le sprint même, `899fd91`)*

**Note sur les issues de suivi :** #446 porte un critère d'acceptation **ajouté par le
project-manager** sur `.mt-sheet` / `.mt-actionsheet` — ils portent le même token `--z-modal`, donc
le bug peut se rejouer sur deux autres surfaces ; à corriger ou à démontrer hors risque. #448 note
que la correction HiDPI **ne sera jamais exercée en CI** tant que `deviceScaleFactor` reste à 1, ce
qui rend le test unitaire à `dpr: 3` non optionnel. À l'inverse, le PM signale n'avoir **pas relu les
fichiers sources** : les numéros de ligne et valeurs mesurées inscrits dans les 3 issues viennent des
artefacts du sprint, non revérifiés par lui.

**Status :** Terminé

## Sprint 61 — 2026-08-17 (Terminé — merge PR #440 dans `dev`)

**Objectif :** Événement archivé — sortir de l'impasse (l'archivage est aujourd'hui un aller sans
retour côté interface).
**Milestone GitHub :** #62 (décalage +1 par rapport au numéro de sprint, cf. note S57 — ne pas
« corriger » ce décalage.)
**Branche :** `sprint/61`, créée depuis `origin/dev` @ `d5f60eb`.

**Issues planifiées (2 après arbitrage) :** #307, #230.
**Vagues :** V1 = #307 | V2 = #230 (séquentiel — les deux touchent le rendu des events archivés
dans `ProductDetailView`).
**Cohésion :** 1.00 (2/2 `epic:events`, pack `br-events`).
**Migrations Flyway :** aucune.
**Dépend de :** aucune.

### Sprint jamais passé par `/sprint plan`

Comme au S60. Le milestone #62 et les labels `sprint-61` existaient, mais **aucune entrée
d'historique préalable et aucun `architect-plans.md`** — donc aucun mini-plan architecte. Les plans
d'implémentation ont été écrits par le lead à partir des pistes techniques des issues et d'une
vérification directe du code (Phase 0.5 faite à la main).

### Arbitrages produit tranchés par le dev au démarrage (2026-08-17)

Les deux issues du sprint étaient explicitement **en attente d'une décision produit** — elles ne
pouvaient pas être briefées en l'état.

- **#307 → Option A retenue.** Une vue/filtre « archivés » rend l'événement archivé atteignable,
  ré-éditable et désarchivable. L'option B (archivage définitif assumé + renommage du bouton) est
  écartée. Le titre du milestone #62 (« vue archives ») encodait déjà cette intention.
- **#230 → trois comportements retenus** : confirmation à l'archivage mentionnant l'effet sur le
  quota (BR-EVE-011), événement archivé **grisé** dans la frise plutôt que masqué (le style
  `.mt-evt--archived` existe déjà dans `timeline.css:67`), et champs du formulaire désactivés
  quand `archived=true`.

Conséquence sur le découpage : #230 dépend de #307, puisque « grisé au lieu de masqué » réécrit le
filtre que #307 est en train de transformer en état de vue. D'où la séquence V1 → V2 plutôt que du
parallèle.

### #67 sortie du sprint — le prérequis backend n'existait pas

Planifiée comme `size:XS` (« lire un flag booléen et afficher un hint »), l'issue supposait que le
flag `capped` était déjà renvoyé par l'API. Vérification faite :

- `RecurrenceExpansion` (record domaine) porte bien `capped` et `MAX_OCCURRENCES = 4000`, et
  `RecurrenceExpansionServiceImpl` le calcule correctement.
- **Mais `RecurrenceExpansionService` n'est appelé par aucun contrôleur ni service applicatif** —
  seul son propre test unitaire le référence. C'est du code orphelin : l'expansion n'est jamais
  déclenchée sur un chemin HTTP.
- Donc `seriesInfo` n'existe nulle part, `EventResponse` ne porte aucun champ de récurrence
  calculée, et **il n'y a aucune réponse d'API où loger `capped`**.

Livrer #67 supposait donc de trancher une décision de contrat d'API (`seriesInfo` dans
`EventResponse` vs endpoint de prévisualisation dédié) sur un thème — la récurrence — étranger à
celui du sprint. Décision du dev : **sortir #67 du milestone 61** et créer d'abord l'issue backend
de câblage qui la débloque. L'estimation XS est caduque.

Issue backend créée : **#439** — « câbler l'expansion de récurrence et exposer le flag `capped` »
(backlog libre, `epic:events` / `priority:P2` / `size:M`). Elle porte la décision de contrat à
trancher. #67 reste ouverte, débloquée par #439, commentaire d'explication posé dessus.

**Leçon transposable :** une piste technique d'issue qui dit « le flag est fourni par l'issue 4.1 »
n'est pas une preuve que 4.1 a été livrée. Un `grep` du symbole ne suffit pas non plus — ici le
symbole existait, avec sa javadoc mentionnant même le consommateur `#67`. **Ce qui manquait, c'est
un appelant** : le contrôle utile est `grep` des *appels* (`\.expand(`, nom du service injecté),
pas de la déclaration.

### Exécution

**Vagues exécutées :** V1 = #307 | V2 = #230 (séquentiel — les deux réécrivent le rendu des events
archivés dans `ProductDetailView`).

**Commits (8) :**
- `1dfb527` #307 — vue « archivés » : filtre en dur → état de vue `'active'|'archived'|'all'`, hook
  `useSetEventArchived`, `eventService.setEventArchived`, i18n ×4, 3 specs E2E (10 fichiers, +675/−22)
- `17c73f8` #230 — `ArchiveConfirmDialog`, verrou de champs, grisage frise + vues mobiles,
  propagation `durationValue`/`durationUnit`, 2 specs E2E (25 fichiers, +792/−64)
- `afdcfb5` — correctifs de specs E2E (lead, cf. ci-dessous)
- `db079e1` — review [MAJEUR] : retrait de la promesse de quota fictif, 4 locales
- `ca3f02f` — review [MAJEUR] : encre + garde-fou de contraste calculés sur la couleur RENDUE
- 3 commits de documentation (historique, artefacts, audit)

**BR impactées :** BR-EVE-011 (non régressée), BR-EVE-013, BR-EVE-015, BR-EVE-006/016.
**Migrations Flyway :** aucune. **Zéro fichier `backend/**` au diff.**

**Reviews :** reviewer batch — **0 CRITIQUE / 2 MAJEUR / 3 MINEUR**, verdict NON-BLOQUANT.
Les 2 majeurs ont été **corrigés dans le sprint** (`db079e1`, `ca3f02f`), les 3 mineurs partent en
triage Phase 4.

**Tests :** Vitest **937/937** · `tsc`/`eslint`/`build` 0 · **E2E suite complète 174 passed / 0 failed
/ 8 skipped** · coverage-E2E 10 testids / 0 sans spec. Backend non rejoué (aucun fichier backend).
Détail : `docs/memory/audits/sprint-61-test-coverage.md`.
**CI :** 7/7 verte au premier run (PR #440).

### Le fait marquant : les E2E n'avaient jamais tourné

Les deux vagues ont rendu `RECOMMAND_TEST_RUNNER` — les 5 specs du sprint étaient seulement
**compilées**. L'agent `test-runner` a lui aussi échoué à les lancer (turbopack inférant un mauvais
workspace root, cf. [[PIT-S61-007]]) et a conclu « impossible sans modifier le dépôt ». Le lead a
repris la main : contournement en une commande (`rtk proxy npx next dev`), backend réutilisé depuis le
conteneur e2e déjà debout sur `:8086`.

**L'exécution réelle a révélé que les specs ne passaient pas** : un clic sur l'`<input>` masqué d'un
`Switch` (convention pourtant déjà documentée dans `sprint-42-events.spec.ts`), et une **vraie
régression** — #230 change le comportement du toggle, cassant une spec préexistante. Corrigé en
`afdcfb5`. Rapport : `docs/memory/sprints/sprint-61/test-runner-report.md`.

> Le check coverage-E2E de la Phase 8 était **vert avant ces corrections** ([[PIT-S61-005]]) : il
> prouve qu'un testid est *cité*, jamais qu'une spec *passe*.

### Deux erreurs de mesure du lead, consignées

1. **Contraste calculé avec du noir pur** alors que la charte utilise `INK_DARK = #0B0C0E`. L'exemple
   cité (`#0070F8`) basculait déjà avant correctif : il ne démontrait pas le défaut. Le phénomène
   restait réel (8,6 % mesurés). Cf. [[PIT-S61-004]].
2. **Le briefing affirmait** que les 3 surfaces de frise partageaient le garde-fou de contraste.
   Vérification sur `17c73f8` : **seul `EventPill` l'appelait**. Le subagent a dévié du plan pour
   cette raison — écart accepté après vérification.

**Absorbé en cours :** propagation `durationValue`/`durationUnit` au view-model + pré-remplissage
`TimelineEditHost` (#230) — corrige un formulaire non soumissible depuis la frise, cf. [[PIT-S61-002]].

**Nouveaux pitfalls :** PIT-S61-001 à PIT-S61-007. **Décisions :** 4 (option A, verrou DOM vs RHF,
a11y sur couleur rendue, pas de quota promis). **Pattern :** PAT-S61-001 (état de vue).

### Follow-ups arbitrés (Phase 4 — triage interactif)

7 follow-ups remontés (4 par les `done.md`, 3 par le reviewer). Arbitrage du dev : **4 créés, 0
discardé**, 2 déjà traités en cours de sprint, 1 arbitrage produit tranché.

  - Bug i18n `deleteDialog` / `conflictDialog` (namespaces inexistants) [S | frontend/i18n]
    → issue **#441** (Sprint 62). ⚠ L'issue exige de **confirmer le rendu en navigateur d'abord** :
    le défaut est établi par lecture de code, jamais constaté visuellement.
  - E2E manquant sur le 409 de désarchivage (BR-EVE-015) [S | events] → issue **#442** (Sprint 62)
  - Mutualiser `httpStatusOf`, 6 copies [XS | frontend] → issue **#443** (backlog)
  - `popoverPicker` : trigger non actionnable au clavier + non conforme prettier [XS | frontend]
    → issue **#444** (backlog)
  - Commentaire périmé de `sprint-42-events.spec.ts` [XS] → **traité pendant le sprint** (`afdcfb5`)
  - Les 2 MAJEUR du reviewer → **traités pendant le sprint** (`db079e1`, `ca3f02f`)
  - Suppression active sur un événement archivé → **arbitrage dev : on la garde**. L'interdire
    obligerait à désarchiver (donc à repasser dans les actifs) pour pouvoir supprimer. Le critère
    d'acceptation de #230 est corrigé : le verrou porte sur l'**édition des champs**, pas sur les
    actions de cycle de vie. Consigné dans `decisions.md`.

Ratio discard 0/7 — aucun sur-signalement.

**Issue sortie du sprint :** #67 (prérequis backend absent) → issue backend **#439** créée, #67
détachée du milestone et commentée. Détail plus haut.

**Status :** **Terminé** — PR **#440** (`sprint/61` → `dev`) mergée le 2026-08-17, milestone #62
fermé. Titre et ligne `Status` volontairement redondants : `PIT-S56-006` montre que grepper l'un sans
l'autre rate les entrées où les deux se contredisent.
