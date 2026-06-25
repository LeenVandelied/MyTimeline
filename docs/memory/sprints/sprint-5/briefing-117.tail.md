
## Dependances intra-sprint
- #116 (vague 1) déjà committé sur HEAD : AuthControllerSecurityTest contient déjà un nouveau test. Pars de cet état.
- AUCUNE autre dépendance. (#120 modifiera SecurityConfig/CORS en vague 3 — ne t'en occupe pas.)

## Designer
Non applicable (test backend).

## Contraintes
- Branche sprint/5 déjà checkout. 1 commit gitmoji français.
- Test ADDITIF : ne modifie PAS le code de production. Si un @ActiveProfiles("dev") sur la classe existante casserait les tests prod, crée une classe de test dédiée @ActiveProfiles("dev").
- Tests OBLIGATOIRES : ./scripts/test-quiet.sh unit (tout vert, anciens + nouveau).
- INTERDIT de toucher : application*.properties (lecture seule), SecurityConfig.java (#120), AuthController.java, migrations.

## Livrable attendu (format strict, MAX 500 tokens caveman)
RETOUR :
- commits: [SHA]
- resume: test ajouté (Secure=false + domaine localhost en dev) + classe choisie + tests verts
- [MEMORY:*] signaux si pertinents
- recommandations suite: RECOMMAND_* / RECOMMAND_FOLLOWUP
- STATUS: COMPLETED en dernière ligne (ou PARTIAL + BLOQUE_SUR)
