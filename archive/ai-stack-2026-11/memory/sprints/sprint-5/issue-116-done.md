# Issue #116 — Body 401 BadCredentials en JSON — DONE

**Commit :** 41759b5
**Fichiers :** AuthController.java (login catch, +1 ligne body Map.of) + AuthControllerSecurityTest.java (+test)
**Résumé :** login() catch(BadCredentialsException) → `body(Map.of("error","Invalid username or password"))` au lieu de texte brut. Cohérent register/refresh. BR-AUT-005 message neutre OK. Test login_withBadCredentials_returns401WithJsonError (status 401 + jsonPath $.error). Fichier test laissé propre pour #117.
**Frontend :** grep "Invalid username" sur frontend/ = 0 match → aucune comparaison en dur, RAS.

**Tests :** AuthControllerSecurityTest 10/10 isolé. Suite finale full = 55/55 green.

**[MEMORY:pitfall]** Worktree partagé multi-agents : `git stash` global embarque les fichiers des issues sœurs + `./mvnw test` régénère application.properties (conflit pop). Fix : commit par chemins explicites `git checkout stash@{0} -- <f>`, jamais `git add -A` ni stash global en worktree partagé.

## Recommandations suite
- (Vague 1) instabilité full-suite signalée par l'agent = pollution concurrente du working tree partagé pendant les runs parallèles ; VÉRIFIÉ FAUX POSITIF par le lead → suite finale clean 55/55 green. Pas de régression.
- Pas de RECOMMAND_FOLLOWUP frontend.

STATUS: COMPLETED
