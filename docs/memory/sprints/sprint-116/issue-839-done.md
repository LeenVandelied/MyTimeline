# Issue #839 (+ #406 absorbée) — done

## Résumé

- #839 : la passe 2 du job `e2e` ne provisionne plus que `SHARED`. Mécanisme : variable `E2E_SETUP_ACCOUNTS` (clés séparées par virgules), résolue par `selectSetupAccounts` (`frontend/e2e/support/accounts.ts`) ; défaut (absente/vide) = les 4 comptes, donc passe 1 inchangée ; clé inconnue = erreur. `auth.setup.ts` itère sur cette sélection ; `persist account identities` reste entier (`persistAccounts()` sans argument). `ci.yml` passe 2 : `E2E_SETUP_ACCOUNTS=shared` en PRÉFIXE de la commande.
- Budget recompté (Vitest, pas recopié) : register 13/23 → **10/20**, login 14/26 → **11/23** (nominal / pire cas, plafonds 30 inchangés). Lignes `BUDGET` et commentaires de `application-e2e.properties` mis à jour. Les chiffres de l'énoncé sont confirmés.
- #406 : commentaire faux corrigé ; poll « Wait for backend readiness » basculé de `/api/auth/me` (401) vers `/actuator/health` = `"status":"UP"`, plus `kill -0 $BACKEND_PID` (sortie immédiate si la JVM meurt). Commit séparé `Refs #406`.

## Décisions

- Variable en préfixe de commande plutôt que dans `env:` du step : c'est là que le Vitest la lit par passe. Un garde rougit si `E2E_SETUP_ACCOUNTS` apparaît ailleurs dans `ci.yml` (hors commentaires) ; sans ce garde, une variable posée au niveau du job fausserait le compte en silence.
- Filtre par variable, pas par `-g` : le filtre CLI s'applique à tous les projets de la commande. Sélectionner un compte par titre exigerait une regex qui couvre persist + provision shared + chaque test d'`auth-signature` : couplage aux titres.
- Le Vitest compte le setup de chaque passe avec la MÊME fonction que le setup (`selectSetupAccounts`), pas avec une copie. Il ancre aussi la boucle du setup sur `selectSetupAccounts(process.env[SETUP_ACCOUNTS_ENV])` (unique `for…of` de niveau module).
- Nouveau garde : les specs d'une passe filtrée n'importent (depuis `support/accounts`) que des comptes provisionnés par cette passe ; ancrage `auth-signature.spec.ts` = `[shared]`.
- #406 : bascule décidée après vérification de l'exposition en `dev,e2e`. `SecurityConfig.java:159` `permitAll("/actuator/health")` ; aucune propriété `management.*` dans `application*.properties` (défaut Spring Boot : health exposé sur le web) ; `/actuator/health` n'est pas dans les créneaux de `RateLimitingFilter` (javadoc l. 46-49) ; `BrevoHealthIndicator` est `@Profile("prod")`, donc absent en `dev,e2e` ; le service compose `backend-e2e` (mêmes profils) a déjà ce healthcheck (`docker-compose.yml:186`). Justification écrite dans le commentaire du step.
- Plafonds maintenus à 30 : la marge regagnée (register 10, login 7 sur le pire cas) sert de réserve aux futures specs.
- Borne register qui inclut les ré-émissions du setup sur échec de requête, recomptée : 3 × (4 + 1) + 15 = 30, soit le plafond (marge nulle ; avant #839 : 39, alors que le texte annonçait 36, chiffre déjà périmé depuis S111). Le texte est corrigé dans `application-e2e.properties` et `auth.setup.ts`.

## Fichiers

- `/Users/herrh/VSProjects/MyTimeline/.claude/worktrees/sprint-104-start-6bb680/frontend/e2e/support/accounts.ts` — `SETUP_ACCOUNTS_ENV`, `selectSetupAccounts`, en-tête budget (passe 2 = 1, nominal 10, pire cas 20)
- `/Users/herrh/VSProjects/MyTimeline/.claude/worktrees/sprint-104-start-6bb680/frontend/e2e/auth.setup.ts` — boucle sur la sélection, JSDoc budget
- `/Users/herrh/VSProjects/MyTimeline/.claude/worktrees/sprint-104-start-6bb680/frontend/src/__tests__/e2e-rate-limit-budget.test.ts` — `Pass.env`, `setupAccountsOf`, `importedAccounts`, `setupLoopViolations` ; 7 nouveaux cas
- `/Users/herrh/VSProjects/MyTimeline/.claude/worktrees/sprint-104-start-6bb680/backend/src/main/resources/application-e2e.properties` — `BUDGET register 10/20`, `BUDGET login 11/23`, commentaires
- `/Users/herrh/VSProjects/MyTimeline/.claude/worktrees/sprint-104-start-6bb680/.github/workflows/ci.yml` — passe 2 (commit #839) ; step « Wait for backend readiness » (commit #406)
- Commits : `4a73e76c` (#839), `1303d711` (#406). Non poussés.

## Tests

- Base, avant modification : `npx vitest run src/__tests__/e2e-rate-limit-budget.test.ts` → 44/44.
- Rouge d'abord : nouvelles attentes sans le code → au moins 10 rouges (sortie tronquée, compte exact non relevé), cause : `selectSetupAccounts` pas encore exporté. Avec le setup mais sans `ci.yml` : 1 rouge (passe 2 ≠ `[shared]`). Avec `ci.yml` mais sans les lignes BUDGET : 1 rouge, `expected {13, 23} to deeply equal {10, 20}`.
- Final : 51/51 (44 + 7). `npx tsc --noEmit -p .` exit 0. `npx next lint --file …` (3 fichiers) : 0 avertissement. `rtk proxy npx prettier --check` (3 fichiers) : OK. `ci.yml` se charge en YAML (`yaml.safe_load`).
- Armement par mutation (script jetable, restauration vérifiée par un vert 51/51 à la fin) :
  - M1, passe 2 remise à 4 comptes (préfixe retiré) → 2 rouges (passes, BUDGET) ;
  - M2, variable déplacée dans `env:` du step → 3 rouges (dont le garde « préfixe seul ») ;
  - M3, la boucle du setup ignore la sélection → 1 rouge (ancrage) ;
  - M4, `persistAccounts` restreint à la sélection → 1 rouge ;
  - M5, clé inconnue `sharde` → 8 rouges (levée explicite).
- `--list` sans serveur : sans variable, setup = persist + 4 provision (5 tests). Avec `E2E_SETUP_ACCOUNTS=shared` + `auth-signature.spec.ts`, `Total: 10 tests` (persist + provision shared + 8). Pour le contrôle PIT-S88-007 de la passe 2, `Running T tests` doit donc valoir 10 (13 avant), avec T = passed + skipped.
- PAS vérifié : aucun run Playwright (exclusivité #838) ; aucun run CI. Le critère « run CI complet vert, Running T = passed + skipped » et la bascule `/actuator/health` restent à prouver sur le run de la PR (lead). Réponse réelle de `/actuator/health` en `dev,e2e` sur le runner : non observée, seulement déduite (config + healthcheck compose). Confirmation du dev sur la modification de `ci.yml` : à obtenir avant le merge.

## Signaux mémoire

- [MEMORY:pattern] Problem: un compteur statique (Vitest budget) modélise une sélection runtime (comptes du setup par passe CI) ; une copie de la règle dans le test diverge en silence. Solution: le test appelle la MÊME fonction exportée (`selectSetupAccounts`) que le setup, ancre syntaxiquement l'appel dans le setup, et ne lit la variable qu'à un seul endroit de `ci.yml` (préfixe de commande, garde « nulle part ailleurs »). Anti-pattern: re-coder la règle de sélection dans le test, ou lire la variable dans un bloc `env:` que le parseur ignore.
- [MEMORY:pitfall] Context: le hook `warn-test-delegation` bloque toute commande Bash dont le TEXTE contient `npx playwright test`, y compris un heredoc Python qui écrit ce texte dans un test ou dans un commentaire `ci.yml` (S116 : l'édition entière a été refusée sans être appliquée). Solution: préfixer `SKIP_DELEGATION=1`, ou écrire le script avec Write puis l'exécuter. Prevention: vérifier après refus que l'édition n'a PAS été appliquée avant de la rejouer.
- [MEMORY:pitfall] Context: le commentaire « borne register avec ré-émissions du setup = 36 » de `application-e2e.properties` / `auth.setup.ts` n'était pas recompté par le Vitest et était périmé depuis S111 (valait 39). Solution: recompté à la main à 30 au S116. Prevention: une borne écrite en prose hors ligne `BUDGET` n'est gardée par rien ; la reformuler en ligne lue par le test ou la recompter à chaque changement de passe/compte.
- [MEMORY:decision] Context: #406, poll de démarrage du job `e2e`. Decision: `/actuator/health` UP + `kill -0`, à la place de `/api/auth/me` < 500. Why: health public (SecurityConfig), exposé par défaut, hors rate-limit, sans indicateur prod-only en `dev,e2e`, et déjà le healthcheck de `backend-e2e` ; un 401 ne prouve que la levée des filtres web.

## Recommandations suite

- Pas de RECOMMAND_DB_EXPERT : aucun schéma, aucune requête touchés.
- Pas de RECOMMAND_SECURITY : aucun endpoint ni règle de sécurité modifiés ; `/actuator/health` était déjà public (#37), on ne fait que le sonder en CI.
- Pas de RECOMMAND_TEST_RUNNER : la seule suite à jouer est le run CI de la PR, que le lead surveille ; le Vitest concerné est déjà joué (51/51).
- Pas de RECOMMAND_UI_DESIGN : aucune UI touchée.
- RECOMMAND_FOLLOWUP: transformer la « borne register avec ré-émissions du setup » (prose, 30 = plafond) en valeur recomptée et assertée par `e2e-rate-limit-budget.test.ts`, pour qu'elle ne se périme plus en silence [XS | e2e/ci]

fichiers de contexte lus: docs/memory/sprints/sprint-116/briefing-839.md (intégral) ; .ai-env/context-packs/pit-frontend.md (PIT-S88-007 l.1344, PIT-S112-010 l.1884) ; docs/memory/sprints/sprint-112/issue-832-done.md (l.21 levier passe 2 −3/−3, l.39 DEC-S112-005, l.44 RECOMMAND_FOLLOWUP) ; backend/src/main/java/.../security/SecurityConfig.java (l.156-159, lecture seule) ; backend/src/main/java/.../email/BrevoHealthIndicator.java (`@Profile("prod")`, lecture seule) ; backend/src/main/java/.../security/RateLimitingFilter.java (javadoc l.46-49, lecture seule) ; docker-compose.yml (l.156-190 `backend-e2e`)

STATUS: COMPLETED
