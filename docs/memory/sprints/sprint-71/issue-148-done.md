# Issue #148 — Politique de mot de passe unique (form vs backend)

RETOUR :
- commits: `12b477e` (37 fichiers, +761/-93). Pas de push.

## Resume
- Objectif: 3 regles de mot de passe divergentes -> 1 seule. Option 1 du plan, 8 caracteres.
  Backend = source de verite, frontend replique.
- BR touchees: **BR-AUT-003** reecrite (politique + perimetre creation/modification).
  **BR-AUT-004** corrigee: son enonce surdecrivait le backend (`AuthRequest` n'a JAMAIS porte
  de min, seulement `@NotBlank` + `@Size(max=100)`); le `min(6)` de `LoginSchema` est purement client.
- Fichiers cles:
  - NEW `backend/.../application/validation/StrongPassword.java` + `StrongPasswordValidator.java`
    (8..100, majuscule, chiffre) — une seule annotation, la regle ne peut plus diverger.
  - `application/dtos/{RegisterRequest,ResetPasswordRequest,ChangePasswordRequest}.java`
  - `frontend/src/lib/schemas/auth.ts` (`PASSWORD_POLICY`, `passwordField`, `rawPasswordField`)
    + `schemas/settings.ts` (change-password)
  - `frontend/public/locales/{fr,en,es,de}/{validation,register}.json`
- Ecarts assumes vs plan (justifies, pas des oublis):
  1. **`ChangePasswordRequest` durci en plus** des 2 DTOs du plan. C'est un chemin de MODIFICATION;
     le laisser a min 6 recreait exactement l'incoherence visee. A implique de toucher
     `UserControllerTest.java` (fixtures) — `UserController.java` lui-meme NON touche (perimetre #134).
  2. **Borne haute 100 ajoutee**. Bug reel trouve en passant: `RegisterRequest` n'avait aucun max,
     donc on pouvait creer un mot de passe de 150 caracteres que le login (`AuthRequest`,
     `@Size(max=100)`) refusait ensuite. Aligne les deux.
  3. **Cle i18n dediee `validation.password.loginMin`** (6 caracteres) pour le login. Sans elle,
     bumper `validation.password.min` a 8 faisait mentir le formulaire de login, qui accepte 6.
  4. `docs/memory/business-rules.md` **n'existe pas** dans ce repo (verifie: `grep -rl BR-AUT-003`
     ne le trouve nulle part). Les BR vivent uniquement dans `.ai-env/context-packs/br-auth.md`,
     seul fichier mis a jour. Le plan demandait "les deux".
- Pitfalls rencontres:
  - `./mvnw surefire:test` **ne recompile pas** les sources de test -> j'ai relu un verdict d'echec
    produit par une classe perimee et failli conclure a tort que le login rejetait 6 caracteres.
  - Seed d'un user via `userRepository.save(new User(null,...))` hors transaction: **echec
    silencieux**, aucune exception, login en 401. Le pattern qui marche est
    `TransactionTemplate` + `em.persist(UserEntity)` (cf. `AccountDeletionIntegrationTest`).
  - Les locales ont **deux** sources pour `validation.password.*`: `validation.json` (namespace
    vivant, consomme par `useTranslations()` racine) et un doublon mort dans `register.json`
    (accessible seulement en `register.validation.*`). Les deux mis a jour.
- Tests (chiffres reels, executes):
  - Backend suite complete via `./scripts/test-quiet.sh backend`: **514/514**, BUILD SUCCESS.
    Dont NEW `PasswordPolicyTest` (29) et `AuthControllerLegacyPasswordLoginTest` (3).
  - Frontend `./scripts/test-quiet.sh frontend`: **1132/1132**, 104 fichiers. Dont NEW
    `password-policy.test.ts` (49).
  - `npx tsc --noEmit`: 0 erreur. `eslint` sur les 3 fichiers touches: 0 issue.
  - `bash .ai-env/tools/gen-pit-packs.sh --check`: OK (packs a jour).
- NON verifie / limites (a ne pas lire comme couvert):
  - **E2E Playwright NON executes.** Verifie par lecture seule que tous les mots de passe des specs
    sont deja conformes (`E2ePass123`, `E2eReset456`, `E2eReset789`, `NewStrong123!`,
    `AnotherPass456`) -> aucune modification necessaire. Mais aucune spec n'a tourne.
  - `PasswordResetServiceImplTest` (9) et `UserServiceImplTest` (5) gardent le litteral `newsecret`:
    ce sont des tests de service, sous la couche de validation, donc verts et non concernes. Litteral
    volontairement laisse, pas un oubli.
  - `PasswordStrength.tsx` non modifie: son scoring est heuristique et son seuil bas est a 6.
    Le commentaire "la contrainte reelle (>= 6)" y est desormais perime. Non corrige pour ne pas
    casser ses 6 tests hors perimetre -> voir follow-up.
  - Pas de verification navigateur des messages d'erreur rendus dans les 4 locales.

## [MEMORY:*] signaux
- `[MEMORY:decision]` Contexte: politique de mot de passe eclatee entre form register (min6+complexite),
  form reset (min6) et backend (min6 nu). Decision: backend source de verite via `@StrongPassword`
  (8..100 + majuscule + chiffre) sur les 3 DTOs de creation/modification; Zod replique la regle au lieu
  de la redefinir. Why: une regle exprimee 4 fois diverge; une annotation partagee + une constante
  `PASSWORD_POLICY` exportee rendent la divergence structurellement impossible a introduire en silence.
- `[MEMORY:business-rule]` BR-AUT-003 amendee: la politique s'applique a la CREATION/MODIFICATION
  seulement. Contraintes: `AuthRequest` (login) et `ChangePasswordRequest.oldPassword` restent hors
  politique, sinon les comptes anterieurs sont verrouilles ou empeches de se mettre en conformite.
- `[MEMORY:pitfall]` Contexte: `./mvnw -o surefire:test -Dtest=X` apres edition d'un test.
  Solution: `surefire:test` n'invoque PAS `test-compile` — la classe perimee tourne et le verdict est
  faux. Prevention: toujours `./mvnw -o test-compile` avant un `surefire:test` cible, ou utiliser `test`.
- `[MEMORY:pitfall]` Contexte: seeder un utilisateur dans un `@SpringBootTest` pour tester le login.
  Solution: `userRepository.save(new User(null,...))` hors transaction echoue SANS exception (login 401
  ensuite); utiliser `new TransactionTemplate(txManager).execute(...)` + `em.persist(UserEntity)`.
  Prevention: un 401 inattendu sur un compte seme = suspecter le seed, pas la chaine d'auth.
- `[MEMORY:bug]` Cause: `RegisterRequest.password` n'avait aucune borne haute alors que `AuthRequest`
  plafonne a 100 -> un mot de passe de plus de 100 caracteres etait creable puis inutilisable au login.
  Solution: `MAX_LENGTH = 100` dans `StrongPasswordValidator`. Rule: toute contrainte de longueur sur un
  champ de creation doit etre confrontee a celle du champ de lecture/auth correspondant.

## Recommandations suite
- `RECOMMAND_FOLLOWUP` — `PasswordStrength.tsx`: seuil bas du scoring et commentaire encore cales sur
  6 caracteres, desormais perimes vs BR-AUT-003. Aligner sur `PASSWORD_POLICY.minLength` et mettre a
  jour ses 6 tests. Hors perimetre #148 (purement visuel, n'autorise ni ne bloque aucune soumission).
- `RECOMMAND_FOLLOWUP` — `validation.password.*` est duplique dans `register.json` alors que seul
  `validation.json` est resolu par `useTranslations()` racine. Le doublon mort invite a la divergence:
  le supprimer des 4 locales apres avoir verifie qu'aucun `useTranslations('register')` ne le lit.
- Pas de `RECOMMAND_DB_EXPERT` car aucune migration Flyway n'a ete creee ni requise (aucun changement de schema, les hash existants ne sont pas touches).
- Pas de `RECOMMAND_TEST_RUNNER` car la suite backend complete (514 tests) a tourne inline en moins de 3 minutes et est verte.
- Pas de `RECOMMAND_SECURITY` car le changement durcit la politique sans toucher a la chaine d'authentification, et la non-regression du login legacy est prouvee par un test d'integration dedie.
- Pas de `RECOMMAND_UI_DESIGN` car aucune surface visuelle nouvelle: seuls des messages de validation deja existants changent de texte.

## fichiers de contexte lus
- `.ai-env/context-packs/br-auth.md` — LU. Ancrage: BR-AUT-003 l.55-60 (`@Size(min=6)` +
  "Test attendu: AuthControllerTest#register_shouldReturn400_whenPasswordTooShort"); BR-AUT-004 l.62-67;
  ligne A12 du tableau (l.152) pointant `frontend/src/lib/schemas/auth.ts:47`.
- `.ai-env/context-packs/pit-backend.md` — LU (grep cible `validation|@Valid|Pattern|password|hash|BCrypt|login`,
  puis lecture des entrees). Ancrage: **PIT-S1-002** "@Valid inerte si le DTO ne porte aucune contrainte"
  (l.436) et **PIT-S44-002** "`ProductCreationRequest.events` sans `@Valid` : l'absence de cascade est
  STRUCTURELLE" (l.495). Aucun pitfall existant sur la politique de mot de passe.
  NON LU: le fichier en entier (60 Ko) — lecture ciblee par grep + contexte, assumee.
- `.ai-env/context-packs/pit-frontend.md` — **NON LU**. Grep `zod|schema|i18n|next-intl|validation`
  non execute sur ce fichier; je m'en suis remis a la lecture directe de `schemas/auth.ts`,
  `schemas/settings.ts` et de `i18n.ts` (loader). Aveu explicite: un piege Zod/next-intl deja consigne
  a pu m'echapper.
- `.ai-env/context-packs/coverage-auth.md` — LU. Ancrage: "Tests backend presents (123 tests, 23 classes)",
  section "Password reset (24)" citant `PasswordResetTokenCreateStatisticsIntegrationTest (1, NEW S43 #286)`,
  et "Tests frontend (50)" listant `PasswordStrength (6)` — c'est cette ligne qui m'a fait chercher le
  3e chemin de mot de passe (change-password) absent du plan. Fichier MIS A JOUR par ce commit.
- `docs/memory/business-rules.md` — **INEXISTANT** dans ce repo (verifie par
  `grep -rln "BR-AUT-003" --exclude-dir=node_modules --exclude-dir=.next .` : aucun hit sur ce chemin).
  Rien a lire ni a mettre a jour; la mise a jour BR est allee dans `br-auth.md` seul.

STATUS: COMPLETED
