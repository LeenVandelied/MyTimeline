
## Dependances intra-sprint
- AUCUNE dependance amont.
- Tu edites SecurityConfig.java (UNIQUEMENT accessDeniedHandler) + GlobalExceptionHandler.java + EventControllerOwnershipTest.
- #120 (vague 2) editera APRES toi le bean CORS de SecurityConfig.java — laisse le fichier propre/compilable, ne touche PAS le CORS.

## Designer
Non applicable (backend pur).

## Contraintes
- Branche cible : sprint/5 (deja checkout).
- Commit : 1 commit logique gitmoji francais.
- Tests OBLIGATOIRES via ./scripts/test-quiet.sh unit. Migration standaloneSetup -> @SpringBootTest peut allonger le run : si suite > 3min, signaler RECOMMAND_TEST_RUNNER.
- INTERDIT de toucher : le bean CORS / exposedHeaders de SecurityConfig (reserve #120), AuthController.java (#116), application*.properties, migrations.
- Avant suppression du handler : confirmer qu'aucune AccessDeniedException metier ne perd sa reponse personnalisee.
- Recommande : RECOMMAND_SECURITY (handler 403 / acces refuse -> review security-expert par le lead).

## Livrable attendu (format strict, MAX 500 tokens caveman)
RETOUR :
- commits: [SHA, ...]
- resume: handler supprime + test migre @SpringBootTest + corps 403 valide en contexte Security reel
- [MEMORY:*] signaux (pitfall @RestControllerAdvice vs filtre Security, pattern test SpringBootTest+Security)
- recommandations suite: RECOMMAND_SECURITY + RECOMMAND_FOLLOWUP
- STATUS: COMPLETED en derniere ligne (ou PARTIAL + BLOQUE_SUR)
