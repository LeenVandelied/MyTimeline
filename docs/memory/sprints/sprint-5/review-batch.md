# Review batch — Sprint 5

> reviewer + db-expert + security-expert (Phase 7 + Phase 5). Diff origin/dev..HEAD (8 issues, backend-only).

## Verdict
- **0 CRITIQUE.** Suite 56/56 verte. Mergeable.
- db-expert : V4/V5 mergeable, 0 CRITIQUE.
- security-expert : 0 CRITIQUE, contrat 401/403/CORS/SameSite conforme (BR-AUT-005 OK).
- reviewer : 0 CRITIQUE, 3 MAJEUR + MINEURs — **tous pré-existants ou cosmétiques, aucune régression S5**.

## Findings DÉFÉRÉS (décision dev : defer all → follow-ups, ne PAS absorber en S5)

Tous hors scope des 8 issues, code non touché par le sprint :

- **RECOMMAND_FOLLOWUP [S | auth] — Contrat erreur incohérent /me, /register, /logout** : renvoient encore du plain text (`"Unauthorized: No token provided"`, `"User already exists"`, etc.) au lieu de `{"error":...}`. #116 n'a uniformisé que le 401 login. Étendre l'uniformisation JSON à tous les corps d'erreur d'AuthController + tests. (reviewer MAJEUR + security-expert MINEUR)
- **RECOMMAND_FOLLOWUP [XS | auth] — SecurityConfig.writeJsonError concat brute** : `"{\"error\":\"" + error + "\"}"`. Zéro risque actuel (2 appelants = constantes littérales), mais méthode static exposée. Durcir via String.format échappé / ObjectMapper. (reviewer MAJEUR rétrogradé : pas de vuln réelle)
- **RECOMMAND_FOLLOWUP [XS | events] — GlobalExceptionHandler.buildBody(2 args)** : passe `status.getReasonPhrase()` ("Not Found"/"Bad Request") comme champ `error` pour handleNotFound/handleValidation → diverge du contrat `{"error":"<code stable>"}`. Poser des codes stables (`not_found`, `validation_failed`). (reviewer MINEUR→MAJEUR)

## Findings db-expert déférés (déjà follow-ups)
- **RECOMMAND_FOLLOWUP [S | devops] — users.role** : enum implicite (USER/ADMIN) sans CHECK ni NOT NULL en DB → V6 une fois valeurs canoniques figées. (confirmé par #108)
- **RECOMMAND_FOLLOWUP [XS | events] — CHECK conditionnels** : "duration_unit requis si type=duration", "recurrence_unit requis si is_recurring" non exprimés en DB (filet Zod only).

## Findings non actionnables (consignés, pas d'issue)
- `import java.util.Map` vs FQDN (#116) — **déjà discardé cosmétique au triage S4**.
- Commentaire limite MockMvc standalone dans AuthControllerDevProfileCookieTest (#117) — nit, Javadoc dit déjà "volontairement minimal".

## Pré-déploiement (db-expert, base dev peuplée only)
Avant V4 sur base dev peuplée : `SELECT count(*) FROM events WHERE type IS NULL;` + `SELECT max(length(type)) FROM events;` (sinon SET NOT NULL / varchar(20) échouent — proprement, sans perte).

---

## Re-review /review-pr #121 (2026-06-25) — 3 reviewers indépendants

**Verdict : 0 CRITIQUE vérifié.** 4 escalations CRITIQUE/MAJEUR = FAUX POSITIFS (lectures périmées, diff `.java`-only excluant les fichiers config) :
- spring.factories "absent" → EXISTE, enregistre ProfileSafetyGuard.
- login "expose jwtToken en body" → renvoie Map.of("message",...) + cookie (post-#104).
- catch(Exception) "plain text" → renvoie Map.of("error","authentication_failed").
- SecurityConfig CORS "hardcodé List.of" → externalisé @Value app.cors.allowed-origins.

**Findings RÉELS corrigés (décision dev : harden V4 + fix nits) :**
- **V4 self-safe sur base peuplée** (RÉSOLU) : `baseline-on-migrate=true` ⇒ V4 s'applique aux données réelles. Ajout d'un bloc PL/pgSQL pré-vol qui échoue tôt avec message actionnable si `events.type` NULL/>20chars/hors-enum ou unit hors-enum, SANS coercition silencieuse. Base fraîche/vide → compteurs 0 → continue. (Testcontainers V1→V5 vert.)
- **ProfileSafetyGuardTest:46** (RÉSOLU) : ajout `.hasMessageContaining("#111")` + `("SPRING_PROFILES_ACTIVE=prod")`.
- **GlobalExceptionHandler.@ExceptionHandler(AuthenticationException)** (RÉSOLU) : supprimé (dead code en prod, mirroir #119 ; SecurityConfig.authenticationEntryPoint = unique 401). Import retiré. Suite 56/56 confirme 0 régression.
- **SecurityConfig constructeur** (RÉSOLU) : param `userDetailsService` inutilisé retiré (fourni au @Bean authenticationManager, pas au constructeur).

**Restent déférés (inchangé) :** contrat /me+register plain text, writeJsonError concat, buildBody reasonPhrase, A8 @MockBean concret, CHECK conditionnels cross-field.

Tests post-fix : **Backend 56/56 vert**, BUILD SUCCESS.
