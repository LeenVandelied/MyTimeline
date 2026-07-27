[BRIEFING ISSUE #284 — Sprint 45, vague 2]

## Contexte d'execution (LIRE EN PREMIER)

- **Repertoire de travail OBLIGATOIRE** : `/Users/herrh/VSProjects/MyTimeline/.claude/worktrees/new-feature-2347-14cb9a`
  Tu es dans un WORKTREE. Ne travaille JAMAIS dans `/Users/herrh/VSProjects/MyTimeline` (repo principal, autre branche).
- **Garde-fou** : `git rev-parse --abbrev-ref HEAD` -> doit afficher `sprint/45`. Sinon STOP et remonte l'erreur.
- **Tu es SEUL** sur le working tree cette vague (la vague 1 est terminee et commitee).
  Garde quand meme un `git add` cible sur tes fichiers — jamais `git add -A`, jamais `commit -a`.
- `git diff` renvoie une sortie vide/tronquee sous le hook RTK de ce poste : utilise `rtk proxy git diff`.
- **RTK ment aussi sur les resultats de tests** (pitfall releve en vague 1) : il a affiche
  "PASS (23) FAIL (0)" sur un run vitest en echec de collecte, et "All files formatted" avec exit 1
  sur prettier. **Ne fais jamais confiance a un resumé RTK** — passe par `rtk proxy` ou un reporter JSON.
- `node_modules` n'est PAS partage entre worktrees : `npm ci` dans `frontend/` peut etre requis avant tout test.

## Issue

**[FEATURE] Spec E2E des cas d'échec du flux reset-password (ancien mdp rejeté, token rejoué)** — P2 / size:S / epic:auth

### Contexte
Le parcours de reinitialisation de mot de passe n'est teste que dans son cas de SUCCES (E2E nominal
Sprint 37, issue #145 — une seule tentative, pour ne pas declencher le verrouillage par token de #141).
Les cas d'echec ne sont pas couverts.

### Criteres d'acceptation
- [ ] Nouvelle spec Playwright **dediee** aux cas d'echec du flux `reset-password`
- [ ] Cas teste : connexion avec l'**ancien** mot de passe apres reset -> echec attendu
- [ ] Cas teste : reutilisation d'un token de reset **deja consomme** -> rejet attendu
- [ ] La spec ne declenche pas le lockout du rate-limiting (#141) de facon non maitrisee

### Risques techniques (issue)
Si le rate-limiting n'est pas maitrise, les tests de cas d'echec risquent de declencher un lockout
et de fausser les resultats (echec pour la MAUVAISE raison).

## DEPENDANCE LIVREE PAR #283 (vague 1, deja mergee sur la branche)

L'issue #283 vient de **remplacer** le canal de capture du token de reset. **Le monde a change :**

- `frontend/e2e/support/db.ts` a ete **SUPPRIME**. `pg` et `@types/pg` sont **desinstalles**.
  **N'essaie pas de lire la table `password_reset_tokens`** — ce chemin n'existe plus.
- Le nouveau canal est un endpoint HTTP test-only, actif uniquement en profil Spring `e2e`
  (le job CI e2e tourne desormais en `SPRING_PROFILES_ACTIVE: dev,e2e`).
- **API a utiliser telle quelle** :

```ts
// frontend/e2e/support/reset-token.ts
export async function waitForResetToken(
  request: APIRequestContext,
  email: string,
  timeoutMs = 10_000
): Promise<string>
```

Appel type : `await waitForResetToken(page.request, email)` (same-origin via le proxy Next).
Poll 250 ms ; un 404 signifie que le token `@Async` n'est pas encore ecrit ; throw explicite sur 401
(profil `e2e` absent). La doc complete est en tete de `frontend/e2e/support/reset-token.ts` — **lis-la**.

Lis aussi `frontend/e2e/forgot-password.spec.ts` (deja migree vers ce canal par #283) : c'est ton
modele de reference pour le parcours nominal. **Ne le modifie pas**, crée une spec separee.

## Plan d'implementation (architect, /sprint plan)

```yaml
issue_284:
  fichiers_cles:
    - "frontend/e2e/forgot-password.spec.ts"   # spec nominale S37 — MODELE DE REFERENCE, ne pas editer
    - "frontend/e2e/support/accounts.ts"       # verifie — helpers de comptes de test
  couches_touchees: ["frontend"]
  strategie_test: "E2E"
  risque_regression: "Le lockout par token (#141) peut faire echouer la spec pour la MAUVAISE raison — le corps de #284 le previent explicitement ; ISOLER UN COMPTE PAR CAS DE TEST."
  ordre_ecriture: "apres #283 (la spec consomme le nouveau canal de capture du token)"
  zod_dto_sync: "NON"
```

**Points de vigilance :**
1. **Un compte dedie par cas de test** — c'est LA contrainte de cette issue. Deux cas d'echec qui
   partagent un compte declenchent le lockout #141 et le test echoue pour la mauvaise raison.
   Lis `frontend/e2e/support/accounts.ts` pour le helper de creation de compte unique.
2. Cas « ancien mot de passe rejete » : faire le reset complet, puis tenter un login avec l'ANCIEN mot
   de passe -> doit echouer. Attention a ne pas enchainer plusieurs tentatives de login sur le meme
   compte (rate-limit login).
3. Cas « token rejoue » : consommer le token une premiere fois (reset reussi), puis rejouer le MEME
   token -> rejet. Rappel BR-AUT-012 : token invalide/expire/consomme/non-UUID -> **400 generique
   unique** (anti-enumeration). N'attends donc pas un message d'erreur distinctif par cas.
4. Ne raisonne pas « en aveugle » sur l'UI : lis les pages reelles
   `frontend/app/[locale]/reset-password/` et `frontend/app/[locale]/login/` pour les selecteurs
   (`data-testid`) plutot que de les inventer.
5. `localePrefix: 'always'` — toute URL doit etre prefixee par la locale (`/fr/login`), sinon redirection.
6. **#302 a livre en vague 1 une garde serveur dans `frontend/middleware.ts`** : un acces anonyme a une
   route protegee renvoie desormais un **307** vers `/<locale>/login`. Les pages `reset-password` et
   `login` sont publiques et ne sont PAS concernees — mais si une navigation inattendue redirige, c'est
   probablement cette garde. Ne la « repare » pas, c'est le comportement voulu.

## Triage
Taille: S
Modele: opus
Effort: medium
