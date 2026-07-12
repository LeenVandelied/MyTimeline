# ADR-003 — Export RGPD des données utilisateur : mécanisme async & URL signée

- Statut : Accepté (Sprint 32, issue #58)
- Date : 2026-07-11
- Contexte lié : #34 (secrets externalisés, CLOSED), ADR Sprint 21 (StoragePort local), #78 (purge RGPD)

## Contexte

L'article 20 RGPD (droit à la portabilité) impose de fournir à l'utilisateur une copie
lisible de l'intégralité de ses données. Aucune fonction d'export n'existait. Deux familles
de formats sont demandées :

- **Synchrones (inline)** : JSON, Markdown — génération directe, retour immédiat en réponse HTTP.
- **Asynchrones (job)** : ZIP, CSV — génération déportée, polling, puis « URL signée expirant
  sous 24h » une fois le job terminé.

Aucune infrastructure de file de jobs (MQ, Redis) n'existe. Le stockage (`StoragePort`,
ADR Sprint 21) est **LOCAL** (`LocalStorageAdapter`) : pas de S3/MinIO, donc **aucun
presignedUrl** natif.

## Décision

### 1. Mécanisme async : table `export_jobs` (DB) + `@Async` Spring

Retenu : **table de suivi `export_jobs` en base + exécution `@Async`** sur un
`ThreadPoolTaskExecutor` dédié (`exportExecutor`, ajouté à `AsyncConfig`).

- Le contrôleur crée une ligne `PENDING`, déclenche l'exécution async, retourne le `jobId`
  immédiatement (202).
- Le worker (`AsyncExportRunner`, `@Async("exportExecutor")`) : `RUNNING` → assemble le
  snapshot → rend le fichier → le stocke via `StoragePort` → `COMPLETED` (+ `storage_ref`,
  `expires_at = completed_at + 24h`). En cas d'échec : `FAILED` (+ `error_code`, jamais de PII).
- Le statut survit à un redémarrage (persistant en DB), contrairement à un simple `Future`.

Alternatives écartées :
- **MQ / Redis** : aucune infra présente, surdimensionné pour le MVP.
- **Scheduler polling une table** : ajoute un `@EnableScheduling` + latence de poll inutile ;
  `@Async` déclenche l'exécution immédiatement, la table sert au suivi/idempotence.

### 2. URL signée 24h : endpoint interne + token HMAC court (jjwt), PAS de S3 presignedUrl

Il n'existe aucun presignedUrl. L'« URL signée » est donc un **endpoint de téléchargement
interne** `GET /api/export/download/{jobId}?token=<jwt>`, où le token est signé par
`ExportTokenService` (infrastructure/security) en **réutilisant le mécanisme de signature
existant** (jjwt HS256, même `jwt.secret` que l'auth, `Clock` injecté pour une expiration
déterministe et testable). Claims : `sub = jobId`, `uid = ownerId`, `exp = job.expires_at`
(24h), `typ = "export-download"` (isole ces tokens des tokens d'auth).

Vérification triple à la download (défense en profondeur) :
1. L'endpoint `/api/export/**` est protégé par `JwtFilter` (cookie/Bearer `ROLE_USER`).
2. Le token est valide (signature + non expiré) et porte `jobId`/`uid`.
3. `caller.id == token.uid == job.user_id` (ownership) ET le job est `COMPLETED` et non expiré.
   Sinon **404** (anti-énumération, cohérent convention 2 backend).

### 3. Rétention / expiration

- `expires_at = completed_at + 24h`. Passé ce délai, le token est expiré (rejeté) → 404.
- **Dette assumée** : aucun scheduler ne purge encore les fichiers/jobs expirés du disque.
  Un job `@Scheduled` de nettoyage (fichier + ligne) est un follow-up. Documenté ici.

### 4. Périmètre exact des données exportées (complétude légale)

Inclus (données personnelles du user authentifié) :
- **Profil** : `id, username, name, email, role` — **JAMAIS le hash du mot de passe**
  (BR-AUT-002), ni les octets d'avatar (seule la présence est notée).
- **Produits** (actifs) + leurs **événements** imbriqués.
- **Catégories possédées** (`owner_id = userId`).

Exclus, avec justification tracée :
- **Password hash** : secret interne, hors portabilité (BR-AUT-002).
- **Sessions** (`sessions`) : métadonnées techniques de sécurité (jti, IP tronquée), pas des
  données de portabilité au sens Art. 20.
- **PasswordResetToken** : secrets internes à durée de vie courte, jamais des « données
  personnelles » exportables.
- **Catégories système** (`owner_id IS NULL`) : partagées, non rattachées au compte.
- **Produits/événements archivés** (soft-delete) : exclus par `@SQLRestriction` — dataset
  aligné sur ce que l'utilisateur voit dans l'application (choix cohérent, tracé ici).

### 5. Stockage des fichiers async

Réutilise `StoragePort` (store/load/delete blob privé hors webroot). Les extensions
`zip`/`csv` passent le `sanitizeExtension` existant (`[a-z0-9]{1,5}`). **Dette RÉSOLUE (#264)** :
un chemin DÉDIÉ `app.storage.export-path` (bean `exportStorage`, `StorageConfig`) découple
désormais les exports des avatars — répertoire distinct, convention #34 (fail-fast prod),
sans hériter des hypothèses avatar (taille max, rétention). La purge TTL 24h de ce base-path
reste le follow-up #267 (voir §3).

### 6. Rate-limiting des endpoints export (DoS / consommation de ressources — #58, #265)

`RateLimitingFilter` (Bucket4j, in-memory, **par IP**, cf. `infrastructure/security/`) throttle
les opérations d'export **lourdes** :

- `POST /api/export` (soumission de job async) — **5/min/IP** (#58) : pool async borné + écriture
  fichier, sans quota → risque d'épuisement du pool / accumulation de fichiers.
- `GET /api/export?format=json|markdown` (export **synchrone inline**) — **5/min/IP** (#265) :
  recalcule l'export à chaque appel (requêtes DB User+Product+Category+Event répétées). Bucket
  **séparé** du POST (la clé de bucket inclut la méthode HTTP).

**Hors périmètre (décision tracée, #265)** — volontairement NON rate-limités :

- `GET /api/export/job/{jobId}` — polling de statut **léger** ; un client légitime interroge un
  job en cours plusieurs fois et ne doit pas être pénalisé.
- `GET /api/export/download/{jobId}?token=…` — re-téléchargement d'un fichier **déjà** COMPLETED
  (lecture d'octets d'un blob privé, aucun recalcul d'export).

Justification de l'acceptation du résidu : ces deux endpoints sont **strictement self-service**
(scopés au propriétaire ; job d'autrui → 404, pas d'énumération cross-user). La surface d'abus se
borne à un utilisateur qui martèle ses **propres** artefacts déjà produits — coût faible, pas de
faille d'accès. Si un abus réel émerge, les ajouter à `LIMITS` est une extension d'une ligne
(le mécanisme est déjà méthode+chemin). Contrat verrouillé par
`RateLimitingAndHeadersIntegrationTest` (429 sur GET/POST `/api/export` ; 200 non pénalisé sur
`/job` et `/download`).

## Conséquences

- Migration `V13__export_jobs.sql` (FK `user_id → users(id) ON DELETE CASCADE` : la purge de
  compte #78 supprime les jobs automatiquement ; la purge des **fichiers** reste dette).
- Contrat de réponse `ExportJobResponse` figé (source de vérité pour le frontend #59, S33).
- Le chemin **sync** (JSON/MD) est livrable indépendamment de l'async.

## Interprétation REST (verbe × format)

- `GET  /api/export?format=json|markdown` → 200, corps inline (formats sync uniquement).
- `POST /api/export?format=zip|csv`       → 202, `{jobId, status, format}` (formats async).
- `GET  /api/export/job/{jobId}`          → statut ; si `COMPLETED`, `downloadUrl` + `expiresAt`.
- `GET  /api/export/download/{jobId}?token=…` → octets du fichier.

Un format sync soumis en POST (ou async en GET) → **400** (`ExportFormatNotSupportedException`).
