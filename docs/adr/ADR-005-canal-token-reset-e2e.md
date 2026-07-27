# ADR-005 — Canal de capture du token de réinitialisation en E2E

- Statut : Accepté
- Date : 2026-07-27
- Contexte : Sprint 45, issue #283 (découpler le canal de capture du token de reset du schéma DB)
- Supersede : le canal « lecture DB directe » mis en place au Sprint 37 (issue #145,
  `frontend/e2e/support/db.ts`, dépendance `pg`)
- Domaine impacté : `auth` (BR-AUT-005 / BR-AUT-012), outillage de test E2E, CI

## Contexte

L'E2E Playwright du parcours « mot de passe oublié » (`forgot-password.spec.ts`) a besoin du
token de réinitialisation pour poursuivre le scénario jusqu'au reset puis au login. Or le token
**ne sort nulle part** du système en environnement de test :

- `POST /api/auth/forgot-password` répond **200 neutre systématique** (BR-AUT-005/BR-AUT-012,
  anti-énumération) : le token n'est jamais dans la réponse ;
- `BrevoEmailService` est **NO-OP** sans `BREVO_API_KEY` (dev/test) : aucun email ne part ;
- le token n'est **jamais loggé** (règle explicite de `PasswordResetServiceImpl`) ;
- il n'existe **ni MailHog ni boîte de réception** de test dans l'infra CI.

Le Sprint 37 avait donc relu le token **directement en base** (`pg`, poll de la table
`password_reset_tokens` de la migration V6). Ce choix, correct à l'époque et documenté comme
provisoire, couple la suite E2E au **schéma de la base** : toute évolution du schéma des tokens
(renommage de colonne, changement de type, table éclatée) casse un test dont l'objet n'est pas
la persistance, avec un diagnostic trompeur. Il impose en outre au runner CI un accès Postgres
et un mot de passe DB (`E2E_DB_PASSWORD`) au seul profit d'un test.

## Décision

### 1. Un endpoint HTTP test-only remplace la lecture DB

`GET /api/test-support/password-reset-token?email=…` rend le dernier token **exploitable**
(non consommé, non expiré) du compte, ou **404** sans corps. Il est en **lecture seule** : il ne
consomme pas le token et ne modifie rien.

Le contrat de la suite E2E devient un contrat HTTP stable ; le couplage au schéma est absorbé
côté backend par le mapping JPA (`PasswordResetTokenEntity`), déjà validé au boot par
`ddl-auto=validate`.

### 2. Profils Spring **additifs** : `@Profile("e2e")` + `SPRING_PROFILES_ACTIVE=dev,e2e` en CI

Contrainte constatée (vérifiée, non supposée) : le job CI `e2e` démarrait le backend avec
`SPRING_PROFILES_ACTIVE: dev`. Un endpoint gardé par `@Profile("e2e")` n'aurait donc **jamais**
été actif en CI — le test aurait passé en local et échoué en CI, avec la tentation d'exposer
l'endpoint sur le profil `dev`.

Retenu :

- l'endpoint (et tout son câblage) est gardé par `@Profile("e2e")` — et **uniquement** `e2e` ;
- le job CI e2e passe à `SPRING_PROFILES_ACTIVE: dev,e2e` (liste **additive** Spring) : toute la
  configuration `dev` dont ce job dépend déjà (datasource, cookie `Secure=false`, CORS) reste
  active, `e2e` ne fait qu'**ajouter** le canal ;
- conséquence voulue : en dev local (profil `dev` seul) le canal est **inactif** ; en prod,
  inactif. Il n'existe que si `e2e` est demandé **explicitement** ;
- **aucun** `application-e2e.properties` n'est créé : les profils additifs laissent
  `application-dev.properties` s'appliquer, rien à dupliquer.

### 3. Tout le canal est confiné à un package, gardé en profondeur

Package unique `infrastructure/adapters/testsupport/` :

| Classe | Rôle | Garde |
|---|---|---|
| `E2eResetTokenController` | endpoint `GET /api/test-support/password-reset-token` | `@Profile("e2e")` |
| `E2eResetTokenFinder` (+ `…JpaAdapter`) | lecture JPQL du dernier token exploitable | `@Profile("e2e")` |
| `E2eTestSupportSecurityConfig` | `SecurityFilterChain` `@Order(1)` limitée à `/api/test-support/**` | `@Profile("e2e")` |

Points structurants :

- **Aucune modification de `SecurityConfig` (production).** Une règle `permitAll` sur ce chemin
  dans la chaîne principale vivrait en production pour un endpoint qui n'y existe pas. Ici, hors
  profil `e2e`, le chemin retombe sur la chaîne principale (`anyRequest().authenticated()`) et
  répond **401** — défense en profondeur si le profil était mal posé.
- **Aucun contrat de domaine n'est étendu.** Le besoin « relire le dernier token d'un compte »
  n'existe dans aucun parcours utilisateur : l'ajouter au port `PasswordResetTokenRepository`
  polluerait le contrat de production pour un usage de test. Le contrat de lecture vit donc dans
  le package test-only.
- **Aucun changement du flux réel.** `POST /api/auth/forgot-password` reste 200 systématique et
  `@Async` : l'anti-énumération (BR-AUT-005/012) est intacte. Le 404 du canal ne distingue pas
  « compte inconnu » de « aucun token exploitable », pour ne pas en faire un oracle d'existence.

### 4. L'absence hors `e2e` est **prouvée par des tests**, pas par relecture

- `E2eTestSupportProfileTest` (`ApplicationContextRunner`, ni Docker ni web) : les beans sont
  **absents** en `prod`, `dev`, `test`, `dev,prod` et sans profil ; **présents** en `e2e` et en
  `dev,e2e` (contre-épreuve : sans elle, l'absence serait verte pour de mauvaises raisons).
- `E2eTestSupportPackageGuardTest` (ArchUnit) : **toute** classe du package porte
  `@Profile("e2e")` (contrainte sur les ajouts futurs) et **aucune** classe de production hors du
  package n'en dépend (le canal reste strictement optionnel).
- `E2eResetTokenEndpointIntegrationTest` (`@ActiveProfiles("e2e")` additif sur `test`,
  Testcontainers) : 200 + token le plus récent, 404 sur compte inconnu / token consommé / token
  expiré, 400 sans paramètre — le tout **sans cookie JWT**, ce qui prouve la chaîne dédiée.

## Alternatives rejetées

**A. Mock `EmailService` en mémoire (capture du token à l'envoi).** L'E2E Playwright tourne dans
un **processus séparé** du backend Spring : une capture « en mémoire » côté backend nécessiterait
de toute façon un canal HTTP pour être lue depuis le test. On retomberait sur l'endpoint, avec en
plus un double du port `EmailService` à maintenir et un comportement d'envoi divergent du réel.

**B. Endpoint gardé par `@Profile("dev")`.** Exposerait un lecteur de token de réinitialisation
dans **tout** environnement de développement (poste local, éventuelle instance de démo), pour un
gain nul : les profils additifs ne coûtent rien et donnent exactement la même disponibilité en CI.

**C. Statu quo (lecture DB directe).** Conserve le couplage au schéma V6 dénoncé par #283, et
maintient un accès Postgres + un mot de passe DB dans l'environnement du runner Playwright.

## Conséquences

- `frontend/e2e/support/db.ts` **supprimé** ; les dépendances `pg` et `@types/pg` retirées de
  `frontend/package.json` (et du lockfile). La suite E2E n'ouvre plus aucune connexion DB.
- Nouveau module de capture : `frontend/e2e/support/reset-token.ts` —
  `waitForResetToken(request, email, timeoutMs = 10_000)`. Le poll reste côté test (404 tant que
  l'INSERT `@Async` n'a pas eu lieu) : pas de long-poll côté serveur.
- `.github/workflows/ci.yml` (job `e2e` uniquement) : `SPRING_PROFILES_ACTIVE: dev,e2e` ; les
  variables `E2E_DB_*` devenues mortes sont retirées du step Playwright.
- Toute spec future du domaine reset (issue #284) consomme ce module au lieu de la base.
- Point de vigilance : un backend démarré **sans** `e2e` fait échouer ces specs sur des 401
  (message explicite émis par le module de capture). C'est le comportement voulu — le canal ne
  doit jamais être disponible par défaut.

## Références

- Issue #283 (Sprint 45) ; issue #145 (Sprint 37, canal DB d'origine) ; issue #284 (consommateur).
- BR-AUT-005 / BR-AUT-012 (`.ai-env/context-packs/br-auth.md`).
- `backend/src/main/java/com/matimeline/eventmanager/infrastructure/adapters/testsupport/`.
- `frontend/e2e/support/reset-token.ts`, `frontend/e2e/forgot-password.spec.ts`.
