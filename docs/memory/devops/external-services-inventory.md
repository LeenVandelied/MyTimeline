# Inventaire des services externes — MyTimeline

> Créé Sprint 50 (2026-07-28) dans le cadre de l'issue **#249**. Comble le **chemin fantôme**
> référencé depuis le Sprint 35 par `secret-rotation-runbook.md` et par la règle de sécurité globale
> du poste (*« Procédure de rotation par service : docs/memory/devops/external-services-inventory.md
> §3quater »*). Le fichier était annoncé comme livré par #250 — **#250 n'est pas faite** ; ce fichier
> est un socle constaté dans le code, à compléter par #250 le moment venu.
>
> ⚠️ **RÈGLE ABSOLUE** : ne jamais coller une valeur de secret en clair (chat, commit, issue, PR,
> ticket support). Référencer uniquement par **nom de variable**. Toute valeur exposée, ne serait-ce
> qu'une seconde, est compromise → rotation immédiate.

**Méthode** : chaque service ci-dessous est **constaté dans le code**, pas supposé. Sources de la
constatation données à chaque entrée. Recherches effectuées :

```bash
git grep -h -E '@Value\("\$\{' -- 'backend/src/main/java/**'          # toutes les clés injectées
git grep -l -E 'RestClient|RestTemplate|WebClient|HttpClient|OkHttp|Feign' -- 'backend/src/main/java/**'
git grep -h -oE 'https?://[a-zA-Z0-9.-]+' -- 'frontend/src/**' 'frontend/app/**' 'backend/src/main/**'
git grep -h -oE 'process\.env\.[A-Z_0-9]+' -- 'frontend/**'
git grep -E '<artifactId>' -- backend/pom.xml
```

**Résultat de couverture** : un **seul** client HTTP sortant existe dans tout le backend
(`BrevoEmailService`). Les seuls hôtes externes en dur sont `api.brevo.com` (3 occurrences) et
`fonts.googleapis.com` (1 occurrence). Aucun SDK cloud (AWS/GCP/Azure), aucun Stripe, aucun Sentry,
aucune file de messages : `backend/pom.xml` ne contient que Spring Boot, PostgreSQL, Flyway, jjwt,
Bucket4j, Lombok, ArchUnit et Testcontainers.

---

## 1. Services avec secret

### 1.1 PostgreSQL

| | |
|---|---|
| Rôle | Base de données applicative unique (source de vérité) |
| Version | `postgres:16` (`docker-compose.yml:11`) |
| Constaté dans | `docker-compose.yml` (service `postgres`), `backend/src/main/resources/application.properties:13-15`, `backend/pom.xml` (`postgresql`, `flyway-core`, `flyway-database-postgresql`) |
| Variables | `DB_URL`, `DB_USERNAME`, **`DB_PASSWORD`**, `POSTGRES_DB`, `POSTGRES_PASSWORD` (conteneur), `FLYWAY_PASSWORD` / `PGPASSWORD` (`scripts/flyway-validate.sh`) |
| Secret | **`DB_PASSWORD`** — **exposé dans l'historique** (169 commits, 2025-03-03 → 2026-06-25). Cf. `docs/memory/audits/secret-exposure-audit.md` §3.1 |
| Schéma | Flyway, `ddl-auto=validate` — le schéma est piloté par les migrations, pas par Hibernate |
| Console d'admin | aucune (pas de service managé : instance locale / conteneur) |

### 1.2 Brevo (e-mail transactionnel)

| | |
|---|---|
| Rôle | Envoi de l'e-mail de réinitialisation de mot de passe (BR-AUT-012) |
| Endpoint | `POST https://api.brevo.com/v3/smtp/email`, en-tête `api-key` |
| Constaté dans | `backend/src/main/java/com/matimeline/eventmanager/infrastructure/adapters/email/BrevoEmailService.java:21,40` (implémente le port domaine `EmailService`), `BrevoHealthIndicator.java` |
| Variables | **`BREVO_API_KEY`**, `BREVO_SENDER_EMAIL`, `BREVO_SENDER_NAME` (`application.properties:87-89`) |
| Secret | **`BREVO_API_KEY`** — **jamais exposée** dans l'historique (audit §3.3, trois angles de vérification) |
| Console d'admin | dashboard Brevo (rotation via l'interface fournisseur) |
| Format de clé | `xkeysib-` + 64 hexadécimaux + `-` + 16 alphanumériques (~89 caractères) |
| ⚠ Défaut de configuration | `brevo.api.key=${BREVO_API_KEY:}` — **défaut vide**, donc pas de fail-fast au boot prod si la variable manque. Follow-up déjà connu (DEC-S8-001/002, `br-auth` BR-AUT-012). Non corrigé ici (hors périmètre #249). |

### 1.3 Crowdin (traductions)

| | |
|---|---|
| Rôle | Synchronisation des messages i18n (`public/locales/<locale>/<namespace>.json`) |
| Constaté dans | `crowdin.yml` (clés `project_id`, `api_token`, `base_path`, `base_url`, `files`) |
| Variables | `api_token` dans `crowdin.yml` — actuellement un **placeholder** (`YOUR_API_TOKEN`-like, audit §4.4) |
| Secret | aucun secret réel présent dans le dépôt ; le jeton est fourni par l'opérateur au moment de la synchro |
| Usage CI | **aucun** — `grep -i crowdin .github/workflows/ci.yml` ne retourne rien. Outil manuel/local. |
| Console d'admin | dashboard Crowdin |

### 1.4 GitHub / GitHub Actions

| | |
|---|---|
| Rôle | Hébergement du dépôt (**PUBLIC**) et unique pipeline CI |
| Constaté dans | `.github/workflows/ci.yml` (seul workflow ; 4 jobs requis sur `dev`) |
| Secrets du dépôt | **aucun** — `gh secret list` vide, `gh api …/environments` → `total_count: 0` |
| Identifiants en dur | conteneur de service Postgres du job CI : `POSTGRES_PASSWORD`, `DB_PASSWORD`, `E2E_DB_PASSWORD` (même valeur, longueur 12) et `JWT_SECRET` (longueur 64) — éphémères, audit §4.3 |
| Console d'admin | Settings → Secrets and variables (à créer au premier déploiement) |

---

## 2. Services sans secret

| Service | Rôle | Constaté dans | Remarque |
|---|---|---|---|
| Google Fonts | Chargement des polices Archivo + IBM Plex Mono | `frontend/src/styles/ds/tokens/fonts.css:5` (`@import url('https://fonts.googleapis.com/…')`) | Aucun identifiant. ⚠ Dépendance réseau tierce au **runtime** — contredit la note « polices self-hostées via `next/font` » du context-pack frontend. À arbitrer hors #249 (RGPD/perf). |

---

## 3. Absence de plateforme de déploiement

Au 2026-07-28, **rien n'est déployé** : aucun hébergeur, aucun secrets-manager, aucun workflow de
déploiement, aucun environnement GitHub. Les seules « instances » sont locales
(`docker-compose.yml`) et éphémères (conteneurs de service CI). Toute procédure de rotation ci-après
est donc **différée au premier déploiement** — voir §3quater.

---

## 3quater. Procédure de rotation par service

> Section référencée par `secret-rotation-runbook.md` et par la règle de sécurité globale du poste.
> **Aucune de ces procédures n'est exécutable aujourd'hui** (§3) : elles décrivent la marche à
> suivre au premier déploiement, puis à chaque incident d'exposition.

### Règles communes (valables pour tous les services)

1. **Ne jamais** faire transiter la valeur par un chat, un LLM, une issue, une PR, un ticket, une
   capture d'écran. Nom de variable uniquement.
2. Générer la valeur **là où elle sera stockée** (secrets-manager du provider), ou localement avec
   un générateur de la bonne taille — puis coller directement dans le coffre, sans intermédiaire.
3. **Ordre imposé : le service d'abord, l'application ensuite.** Poser le nouveau secret côté
   fournisseur, vérifier qu'il fonctionne, puis mettre à jour l'application et redéployer.
   L'ordre inverse coupe le service.
4. Après rotation : **vérifier le chemin fonctionnel** correspondant (§ ci-dessous), pas seulement
   le boot.
5. Consigner **date, service, opérateur, motif** — jamais la valeur. Une ligne dans
   `docs/memory/devops/secret-rotation-runbook.md` §Statut suffit.
6. Une valeur exposée reste compromise **même après purge de l'historique** (#112) : sur un dépôt
   public, des copies ont pu être faites. La purge ne dispense jamais de la rotation.

### 3quater.1 — PostgreSQL / `DB_PASSWORD`

⚠ Interruption de service si l'ordre est inversé (application mise à jour avant la base).

1. Générer un mot de passe fort dans le secrets-manager (ne jamais le taper dans un chat).
2. Côté base : `ALTER ROLE <role> WITH PASSWORD '<nouveau>';` — exécuté **par l'opérateur**, sur la
   console du provider ou un `psql` local. *(Opération sensible : confirmation humaine requise.)*
3. Mettre à jour `DB_PASSWORD` dans le secrets-manager du provider **et** dans les secrets GitHub
   (`gh secret set DB_PASSWORD`) pour chaque environnement concerné.
4. Redéployer le backend.
5. **Vérification** : boot sans erreur + `spring.flyway` `validate` OK dans les logs + une lecture
   applicative réelle (connexion + `GET /api/auth/me` authentifié).
6. Si un pooler/replica/outil de sauvegarde utilise le même rôle, le mettre à jour **avant** l'étape 4.

### 3quater.2 — Brevo / `BREVO_API_KEY`

Pas d'interruption pour l'utilisateur : seul le flux « mot de passe oublié » dépend de ce service.

1. Dashboard Brevo → créer une **nouvelle** clé API v3 (ne pas révoquer l'ancienne tout de suite).
2. Renseigner `BREVO_API_KEY` dans le secrets-manager + `gh secret set BREVO_API_KEY`.
3. Redéployer, puis **vérification** : déclencher `POST /api/auth/forgot-password` avec une adresse
   réelle et confirmer la réception (le endpoint répond 200 même en cas d'échec — anti-énumération,
   BR-AUT-012 — donc le code retour ne prouve rien : vérifier la **boîte mail** et
   `BrevoHealthIndicator`).
4. Une fois l'envoi confirmé, **révoquer l'ancienne clé** dans le dashboard Brevo.
5. Vérifier aussi `BREVO_SENDER_EMAIL` / `BREVO_SENDER_NAME` (non secrets, mais un expéditeur non
   validé côté Brevo fait échouer l'envoi).

### 3quater.3 — Signature des jetons (`JWT_SECRET` → RS256, cf. #323)

⚠ **Ne pas appliquer une rotation HS256.** L'issue **#323** (Sprint 50, vague 2) supprime
`JWT_SECRET` au profit d'une **paire de clés RS256** et introduit `EXPORT_TOKEN_SECRET` pour
`ExportTokenService`. La procédure ci-dessous sera à réécrire une fois #323 livrée.

Ce qui reste vrai dans tous les cas :

1. Tout changement de matériel de signature **invalide tous les jetons émis** → déconnexion globale.
   Planifier une fenêtre de faible usage et **communiquer en amont**.
2. Vérification post-changement : login complet (nouveau cookie `jwt` HttpOnly émis puis accepté par
   `JwtFilter`/`JwtService`), plus `POST /api/auth/refresh` sur le nouveau jeton.
3. La clé **privée** RS256 ne quitte jamais le secrets-manager ; seule la clé publique peut circuler.

### 3quater.4 — Crowdin / `api_token`

1. Dashboard Crowdin → révoquer le jeton, en générer un nouveau.
2. Le fournir via l'environnement de l'opérateur (`CROWDIN_API_TOKEN`) — **ne pas** l'écrire dans
   `crowdin.yml`, qui est versionné sur un dépôt public : y laisser le placeholder.
3. **Vérification** : une commande de synchronisation en lecture seule (`crowdin status`).

### 3quater.5 — GitHub

1. Aucun secret de dépôt à ce jour. À la création du premier : `gh secret set <NOM>` (la valeur est
   saisie par l'opérateur, jamais passée en argument de ligne de commande — l'historique du shell
   la conserverait).
2. En cas de fuite d'un jeton personnel (`ghp_…`, `github_pat_…`) : révocation immédiate dans
   Settings → Developer settings, puis audit des actions récentes du jeton.

### 3quater.6 — Après toute rotation

- [ ] La valeur n'apparaît nulle part en clair (chat, commit, PR, issue, logs CI).
- [ ] Le chemin fonctionnel du service est vérifié (pas seulement le boot).
- [ ] La ligne de journal est ajoutée dans `secret-rotation-runbook.md` §Statut (sans la valeur).
- [ ] Si l'exposition venait du dépôt : ouvrir/mettre à jour
      `docs/memory/audits/secret-exposure-audit.md`.

---

## 4. Références

- `docs/memory/audits/secret-exposure-audit.md` — audit d'exposition (Sprint 50, #249)
- `docs/memory/devops/secret-rotation-runbook.md` — runbook de rotation (non exécuté)
- `docs/memory/sprints/sprint-29/issue-112-done.md` — runbook de purge d'historique
- `.ai-env/context-packs/br-auth.md` — BR-AUT-012 (flux mot de passe oublié / Brevo)
- Issues : #249 (rotation), #250 (inventaire services — reste à faire), #323 (RS256), #112 (purge)
