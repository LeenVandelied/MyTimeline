
## Dependances intra-sprint
- #119 (vague 1) déjà committé : SecurityConfig.accessDeniedHandler en place — n'y touche pas, pars de l'état HEAD.
- #111 (vague 1) a édité application.properties (profil) — toi tu édites application-dev.properties et application-prod.properties (CORS), fichiers différents.
- Tu PRÉCÈDES #118 (vague 4) qui ajoutera COOKIE_DOMAIN dans application-prod.properties — laisse le fichier propre.

## Designer
Non applicable (config sécurité backend).

## Contraintes
- Branche sprint/5 déjà checkout. 1 commit gitmoji français.
- Tests OBLIGATOIRES : ./scripts/test-quiet.sh unit. Vérifie que les tests CORS/headers existants (RateLimitingAndHeadersIntegrationTest) passent toujours avec l'origine externalisée — fournis la propriété app.cors.allowed-origins au profil de test si nécessaire.
- INTERDIT de toucher : accessDeniedHandler de SecurityConfig (#119), AuthController.java, GlobalExceptionHandler.java, migrations, application.properties (profil = #111).
- Sujet sécurité (CORS/CSRF/SameSite) → signale RECOMMAND_SECURITY.
- IMPORTANT worktree partagé : commit par chemins explicites, jamais `git add -A` ni `git stash` global.

## Livrable attendu (format strict, MAX 500 tokens caveman)
RETOUR :
- commits: [SHA]
- resume: origins externalisées (dev+prod) + Authorization retiré + décision SameSite (valeur + justification) + tests
- [MEMORY:*] signaux (décision SameSite, pattern externalisation CORS)
- recommandations suite: RECOMMAND_SECURITY / RECOMMAND_FOLLOWUP
- STATUS: COMPLETED en dernière ligne (ou PARTIAL + BLOQUE_SUR)
