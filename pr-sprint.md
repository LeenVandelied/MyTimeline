## Sprint 45 — Garde serveur auth + fiabilisation E2E auth

Cohésion 0.57 · 10 points · Milestone **Sprint 45**

Ferme le lot auth nommé par le plan S44 : garde serveur des routes connectées, découplage du canal de
capture du token de reset en E2E, et couverture de ses cas d'échec.

### Issues livrées (3)

| # | Objet | P | Size |
|---|-------|---|------|
| #302 | Garde serveur (middleware) pour les routes connectées | P1 | M |
| #283 | Découpler le canal de capture du token de reset en E2E du schéma DB | P1 | M |
| #284 | Spec E2E des cas d'échec du flux reset-password | P2 | S |

Vagues : **V1** = #302 ∥ #283 (fichiers disjoints) · **V2** = #284 (consomme le canal livré par #283).

### Changements clés

**#302 — garde serveur.** `frontend/middleware.ts` **compose** avec next-intl (ne le remplace pas) et
vérifie la présence du cookie `jwt` avant tout rendu des routes `(app)` : un anonyme reçoit un 307 vers
`/<locale>/login` au lieu du shell applicatif. Logique de chemins extraite dans
`src/lib/auth-guard-paths.ts` (Edge-safe, testable sans mock).

**#283 — canal E2E test-only.** Nouveau package backend `infrastructure/adapters/testsupport/`,
4 classes toutes `@Profile("e2e")`, avec sa **propre** `SecurityFilterChain @Order(1)` limitée à
`/api/test-support/**` — le `SecurityConfig` de production n'est pas modifié. `frontend/e2e/support/db.ts`
supprimé, `pg` + `@types/pg` désinstallés (0 résidu dans le lockfile). Job CI e2e en `dev,e2e`.

**#284 — cas d'échec.** Spec dédiée : ancien mdp rejeté (401), token rejoué (400 générique BR-AUT-012),
**1 compte dédié par test** pour ne pas déclencher le lockout #141. Les assertions portent sur le
**statut HTTP réel** et non sur le `data-testid` d'erreur : l'UI rend le même testid pour un rejet métier
et pour un 429, donc une spec basée sur le message serait passée au vert **sous lockout**.

### Décisions d'architecture

- **ADR-004** — Garde serveur = **présence** du cookie `jwt` seule. `JwtService` signe en HMAC
  **symétrique** : le secret de vérification est aussi celui d'**émission**, le placer dans le runtime Edge
  élargirait la surface d'attaque. `/api/auth/me` écarté (aller-retour réseau à chaque navigation).
  **Limite assumée et documentée** : un cookie présent mais expiré/forgé passe le middleware ; `JwtFilter`
  (401) et `useAuthGuard` rattrapent. **Ce middleware n'est pas une frontière d'autorisation.**
- **ADR-005** — Profils Spring **additifs** (`dev,e2e`). Le job CI e2e tournait en profil `dev` : un
  `@Profile("e2e")` nu n'aurait **jamais** été actif en CI. Alternatives rejetées : mock `EmailService`
  in-memory (processus séparé → nécessiterait quand même un canal HTTP), endpoint `@Profile("dev")`
  (exposition inutile en dev local).

### BR impactées

BR-AUT-005, BR-AUT-007, BR-AUT-011, BR-AUT-012. **Aucune migration Flyway.**

### Revues

**`security-expert` → GO_AVEC_CORRECTIFS.** 5 constats, tous corrigés :
1. `[MAJEUR]` `ProfileSafetyGuard` ne refusait pas `e2e` en production — `prod,e2e` bootait en silence,
   exposant un lecteur de token de reset anonyme (prise de contrôle de n'importe quel compte).
   → fail-fast ajouté ; `dev,e2e` sans marqueur de prod continue de booter (= config CI, testé).
2. `[MAJEUR]` `nextUrl.pathname` n'est pas percent-décodé → `/fr/%64ashboard` contournait la garde.
   → décodage par segment, **fail-closed** sur segment malformé.
3. `[MAJEUR]` Le matcher `.*\..*` faisait sauter le middleware sur toute URL contenant un point
   (`products/[productId]` accepte un point → trivialement atteignable).
4. `[MINEUR]` `Location:` absolu construit depuis un `Host` attaquant-contrôlable → Location relatif.
5. `[MINEUR]` Garde ArchUnit élargie : le préfixe `/api/test-support` est réservé à son package.

**`reviewer` → GO_AVEC_CORRECTIFS.** 2 MAJEUR + 6 MINEUR, corrigés en 1 cycle :
- Contournement **résiduel** du matcher (locale percent-encodée + extension d'asset).
- Duplication de l'inscription E2E → `registerOnly` extrait dans `support/auth.ts`, 3 appelants migrés.
- Tri déterministe du dernier token, écarts hexagonaux documentés en ADR-005 §Limites, locales itérées
  depuis `SUPPORTED_LOCALES`.

> Le trou du matcher a demandé **4 passes**. Les 3 premières raisonnaient sur la regex ; la dernière l'a
> **compilée avec le `path-to-regexp` embarqué de Next**, révélant deux familles de contournement encore
> ouvertes (`/%66r/products/photo.png` et `/fr//products/photo.png`). Motif retenu
> `(?:[^%/]+/)*[^%/]+` — 20/20 cas vérifiés par exécution.

### Audit tests

`docs/memory/audits/sprint-45-test-coverage.md` — aucune cellule de couverture manquante.

| Suite | Exit | Résultat |
|---|:---:|---|
| Backend | 0 | **433** tests, 0 failure, 0 error |
| Frontend | 0 | **558** tests, 67 fichiers |
| `tsc --noEmit` / `next lint` / `prettier --check` | 0 | — |

Vérification **indépendante** par `test-runner` — aucune divergence constatée sur ces runs.

### ⚠ Réserve à lever par cette CI

**Aucune spec E2E de ce sprint n'a jamais été exécutée** — stack docker down en local. Le job CI `e2e`
est le seul gate réel pour les 3 specs (`auth-guard`, `reset-password-failures`, `forgot-password`).
Confiance actuelle : **parse-level uniquement** ; la collectabilité Playwright n'a pas pu être confirmée
de façon indépendante (mesures divergentes entre agents).

Au premier run rouge, vérifier dans cet ordre :
1. `submitResetPassword` en 429 dès le 1er appel → `RATE_LIMIT_ENABLED` non transmis, **pas** la spec.
2. `auth-guard.spec.ts` importe `../src/i18n/locales` en **relatif** — résolution Playwright ≠ bundler Next.
3. Les 4 cas d'ancrage `/%66r/...` : seul niveau où Next évalue réellement `config.matcher`.

Budget réaliste : **1 à 2 itérations**.

### Fiabilité de l'outillage

Le hook RTK a été pris en défaut deux fois ce sprint : vitest affiché « PASS (23) FAIL (0) » alors que
`success:false` avec une suite en échec de **collecte**, et prettier « All files formatted » avec exit 1.
Tous les chiffres de cette PR proviennent de **codes de sortie réels** lus via `rtk proxy`.

### Follow-ups identifiés (non traités ici)

- `frontend/.eslintcache` est **tracké** : tout run eslint pollue le working tree partagé (rencontré par
  3 agents) → à gitignore/détracker.
- Rien ne synchronise `PROTECTED_APP_SEGMENTS` avec le système de fichiers : une nouvelle route sous
  `(app)` serait non gardée **silencieusement**.
- Élargir la règle ArchUnit n°3 aux classes `@RestController` plutôt qu'au package.
- JWT asymétrique (RS256) rendrait la vérification de signature possible côté Edge.
- Le job CI e2e démarre le backend avec `RATE_LIMIT_ENABLED=false`.

🤖 Generated with [Claude Code](https://claude.com/claude-code)
