
## Dependances intra-sprint
- AUCUNE dependance amont.
- Tu edites AuthControllerSecurityTest. #117 (vague 2) AJOUTERA un test profil dev dans CE MEME fichier APRES toi — laisse le fichier propre/compilable.

## Designer
Non applicable (backend pur).

## Contraintes
- Branche cible : sprint/5 (deja checkout).
- Commit : 1 commit logique gitmoji francais.
- Tests OBLIGATOIRES via ./scripts/test-quiet.sh unit (AuthControllerSecurityTest doit passer).
- INTERDIT de toucher : SecurityConfig.java (#119/#120), GlobalExceptionHandler.java (#119), properties, migrations.
- BR-AUT-005 : message d'erreur neutre — verifie qu'il ne distingue pas username/password.
- Verifie cote frontend si la chaine "Invalid username or password" est comparee en dur (risque mentionne dans l'issue) ; si oui, signaler en RECOMMAND_FOLLOWUP (ne corrige pas le frontend ici sauf trivial).

## Livrable attendu (format strict, MAX 500 tokens caveman)
RETOUR :
- commits: [SHA, ...]
- resume: ligne modifiee + test mis a jour + verif frontend
- [MEMORY:*] signaux si pertinents
- recommandations suite: RECOMMAND_* / RECOMMAND_FOLLOWUP
- STATUS: COMPLETED en derniere ligne (ou PARTIAL + BLOQUE_SUR)
