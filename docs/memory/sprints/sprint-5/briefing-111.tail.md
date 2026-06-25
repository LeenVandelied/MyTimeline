
## Dependances intra-sprint
- AUCUNE dependance amont.
- Tu edites application.properties (+ .example). #118 (vague 3) ajoutera APRES toi la config COOKIE_DOMAIN dans application-prod.properties — ne touche PAS au cookie/CORS, reste sur spring.profiles.active + le garde-fou.

## Designer
Non applicable (config backend).

## Contraintes
- Branche cible : sprint/5 (deja checkout).
- Commit : 1 commit logique gitmoji francais.
- Tests via ./scripts/test-quiet.sh unit si tu ajoutes un garde-fou au boot (sinon, justifier doc-only).
- INTERDIT de toucher : application-prod.properties (cookie/CORS reserves a #118/#120), application-dev.properties cote CORS (#120), SecurityConfig.java, migrations, AuthController.java.
- Choisis UNE des 3 options du body et JUSTIFIE dans le done.md.

## Livrable attendu (format strict, MAX 500 tokens caveman)
RETOUR :
- commits: [SHA, ...]
- resume: option choisie + justification + impact confort dev + tests/doc
- [MEMORY:*] signaux (decision garde-fou profil, pitfall fallback silencieux)
- recommandations suite: RECOMMAND_* / RECOMMAND_FOLLOWUP
- STATUS: COMPLETED en derniere ligne (ou PARTIAL + BLOQUE_SUR)
