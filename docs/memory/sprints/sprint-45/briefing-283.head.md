[BRIEFING ISSUE #283]

## Contexte d'execution (LIRE EN PREMIER)

- **Repertoire de travail OBLIGATOIRE** : `/Users/herrh/VSProjects/MyTimeline/.claude/worktrees/new-feature-2347-14cb9a`
  Tu es dans un WORKTREE, pas dans le repo principal. Avant toute commande, `cd` explicitement dans ce chemin.
  Ne travaille JAMAIS dans `/Users/herrh/VSProjects/MyTimeline` (repo principal, autre branche).
- **Garde-fou** : verifie `git rev-parse --abbrev-ref HEAD` -> doit afficher `sprint/45`. Si ce n'est pas le cas, STOP et remonte l'erreur.
- Une autre issue (#302) tourne EN PARALLELE dans le meme working tree. Consequence :
  **`git add` CIBLE uniquement sur tes fichiers. JAMAIS `git add -A`, JAMAIS `git add .`, JAMAIS `git commit -a`.**
- `git diff` renvoie une sortie vide/tronquee sous le hook RTK de ce poste. Utilise `rtk proxy git diff` si besoin.

## Issue

**[CHORE] Découpler le canal de capture du token de reset en E2E du schéma DB** — P1 / size:M / epic:auth / fullstack

### Contexte
Le test automatisé qui vérifie le parcours « mot de passe oublié » a besoin de récupérer le token envoyé par email pour continuer le scénario. Aujourd'hui, il va le chercher directement dans la base de données, en contournant l'email (qui n'est pas réellement envoyé en environnement de test). Ce raccourci fonctionne mais fragilise les tests : si la structure de la base change, les tests risquent de casser sans lien évident avec la fonctionnalité testée.

### Description
L'E2E `forgot-password` (Sprint 37, issue #145) capture le token de reset par lecture DB directe (`frontend/e2e/support/db.ts`, poll de la table `password_reset_tokens`, dépendance `pg`), car `BrevoEmailService` est NO-OP en environnement de test et le token n'est jamais loggé. Ce couplage entre `db.ts` et le schéma de migration V6 est fragile.

### Critères d'acceptation
- [ ] Le test E2E `forgot-password` ne lit plus directement la table `password_reset_tokens`
- [ ] La dépendance `pg` est supprimée de `frontend/e2e/support/db.ts` (ou le fichier est supprimé si plus utilisé)
- [ ] La solution retenue est activée uniquement en profil de test/E2E, jamais en production
- [ ] Le test E2E `forgot-password` passe avec la nouvelle solution

### Risques techniques (issue)
Un endpoint test-only mal protégé (`@Profile("e2e")` mal configuré) pourrait fuiter en production — vérifier la configuration de profil Spring avant merge.

## DECISION ARCHITECTURE — DEJA TRANCHEE PAR LE LEAD (ne pas re-debattre)

Le plan de sprint marquait cette issue comme **bloquee par un ADR**. L'ADR est tranche, voici la decision.

**Probleme constate (verifie, pas suppose)** : le job CI `e2e` lance le backend avec
`SPRING_PROFILES_ACTIVE: dev` (`.github/workflows/ci.yml`, ~L156). Un endpoint garde par
`@Profile("e2e")` ne serait donc **JAMAIS actif en CI** — le test passerait en local et echouerait en CI,
ou pire, on serait tente d'exposer l'endpoint sur le profil `dev`.

**Solution retenue : PROFILS SPRING ADDITIFS.**

- L'endpoint test-only est garde par `@Profile("e2e")` — et **uniquement** `e2e`.
- Le job CI e2e passe a `SPRING_PROFILES_ACTIVE: dev,e2e` (liste additive Spring).
  Ainsi **toute** la configuration `dev` dont le job e2e depend deja reste active (datasource, etc.),
  et le profil `e2e` ne fait qu'AJOUTER le bean test-only.
- Consequence voulue : en `dev` local (profil `dev` seul) l'endpoint est **inactif**. En prod, inactif.
  Il n'existe que quand `e2e` est explicitement demande.
- Ne cree `application-e2e.properties` que si tu en as reellement besoin. Avec des profils additifs,
  `application-dev.properties` continue de s'appliquer — ne duplique pas la config dev.

**Alternative rejetee** : le mock `EmailService` en memoire. L'E2E Playwright tourne dans un
**processus separe** du backend Spring ; une capture "en memoire" necessiterait de toute facon un canal
HTTP pour etre lue depuis le test. Cela revient a l'endpoint, avec plus de plomberie.

**Alternative rejetee** : endpoint garde sur `@Profile("dev")`. Expose un lecteur de token de
reinitialisation en environnement de dev — inutile puisque les profils additifs ne coutent rien.

**Exigences non negociables sur cette decision :**
1. Un **test automatise** doit prouver que le bean est ABSENT hors profil `e2e`.
   Patterns deja en place dans ce repo a imiter : `ProdConfigStartupLogger.java` (~L32) et
   `BrevoHealthIndicator.java` (~L26). Relis-les avant d'ecrire le tien.
2. L'endpoint ne doit **jamais** repondre en profil `prod`. Le test du point 1 est le garde-fou.
3. Ecrire l'ADR `docs/adr/ADR-XXX-canal-token-reset-e2e.md` (numero : prendre le suivant libre dans
   `docs/adr/`) actant : le probleme du profil CI, la solution additive, les 2 alternatives rejetees
   et leurs motifs.
4. **Verifie toi-meme la ligne exacte** de `SPRING_PROFILES_ACTIVE` dans `.github/workflows/ci.yml`
   avant de l'editer (le numero ~156 est indicatif). Modifie **uniquement** le job e2e — pas les autres jobs.

## Plan d'implementation (architect, /sprint plan)

```yaml
issue_283:
  fichiers_cles:
    - "frontend/e2e/support/db.ts"                                  # verifie : import { Pool } from 'pg', poll password_reset_tokens (V6)
    - "frontend/e2e/forgot-password.spec.ts"                        # verifie
    - "frontend/package.json"                                       # verifie : "pg": "^8.22.0" a retirer
    - "backend/.../infrastructure/adapters/email/"                  # BrevoEmailService (NO-OP en test)
    - "backend/.../infrastructure/adapters/controllers/"            # hote de l'endpoint test-only
    - "backend/src/main/resources/application-dev.properties"
    - ".github/workflows/ci.yml"                                    # SPRING_PROFILES_ACTIVE du job e2e
  couches_touchees: ["application","infrastructure","frontend"]
  strategie_test: "integration+E2E"
  ordre_ecriture: "ADR -> domain(port) -> application -> infrastructure -> ci.yml -> e2e"
  zod_dto_sync: "NON"
```

**Points de vigilance :**
1. `frontend/e2e/support/db.ts` documente lui-meme (en tete de fichier) POURQUOI l'acces DB direct
   avait ete choisi — lis ce commentaire, il liste les contraintes reelles (reponse 200 neutre
   anti-enumeration BR-AUT-005, Brevo NO-OP, aucun MailHog). Ta solution doit les respecter.
2. Ne casse pas l'anti-enumeration : l'endpoint test-only est un canal de SETUP de test, il ne doit rien
   changer au comportement de `POST /api/auth/forgot-password`.
3. Retirer `pg` de `frontend/package.json` change le lockfile. Fais-le proprement (`npm uninstall pg`)
   et verifie qu'aucun autre fichier e2e n'importe `pg`.
4. Le fichier `db.ts` peut contenir d'autres helpers que la capture de token — verifie avant de le supprimer
   en entier ; s'il sert ailleurs, ne retire que la partie token.

## Triage
Taille: M
Modele: opus
Effort: high
