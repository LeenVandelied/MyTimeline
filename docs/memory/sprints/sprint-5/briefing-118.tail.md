
## Dependances intra-sprint
- #120 (vague 3, déjà committé) a édité application-prod.properties (CORS) — pars de l'état ACTUEL, n'écrase pas ses lignes.
- #111 (vague 1) a créé docs/runbook/deploiement-profils.md ; #120 a créé docs/runbook/cors-cookie-samesite.md — relie-les pour la cohérence des env prod.
- Dernière issue du sprint.

## Designer
Non applicable (config + doc).

## Contraintes
- Branche sprint/5 déjà checkout. 1 commit gitmoji français.
- Aucun code applicatif à modifier (config + doc). Pas de nouveau test requis ; lance ./scripts/test-quiet.sh unit en sanity (doit rester 56/56).
- INTERDIT de toucher : SecurityConfig.java, AuthController.java, application.properties (profil #111), migrations, fichiers de test.
- Tu édites : application-prod.properties (commentaire COOKIE_DOMAIN) + runbook(s).
- IMPORTANT worktree partagé : commit par chemins explicites, jamais `git add -A` ni `git stash` global.

## Livrable attendu (format strict, MAX 500 tokens caveman)
RETOUR :
- commits: [SHA]
- resume: commentaire prod ajouté + runbook complété (liste env prod obligatoires cohérente) + sanity tests
- [MEMORY:*] signaux si pertinents
- recommandations suite: RECOMMAND_* / RECOMMAND_FOLLOWUP
- STATUS: COMPLETED en dernière ligne (ou PARTIAL + BLOQUE_SUR)
