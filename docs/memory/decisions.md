# Décisions — MyTimeline

> Décisions d'architecture/implémentation consolidées en fin de sprint.

## DEC-S1-001 — Logique de mise à jour event déplacée controller → service
`EventController.updateEvent` contenait la boucle de mapping champ-par-champ (`containsKey`/`instanceof`/casts) sur un `Map<String,Object>`. Remplacée par un DTO typé `EventUpdateRequest` (`@Valid`) ; le mapping vit désormais dans `EventServiceImpl.updateEvent(UUID, EventUpdateRequest)`. Motif : respect hexagonal (controller mince), surface minimale avant les retouches #30/#31. (Sprint 1 #28)

## DEC-S1-002 — @Size(min=1) plutôt que @NotBlank sur EventUpdateRequest.title
Pour préserver la sémantique PATCH partielle (le front a un endpoint « couleurs seules » sans title). `@Size(min=1)` rejette "" (→400 « titre vide ») mais tolère l'absence (null). Voir [[pitfalls]] PIT-S1-001. (Sprint 1 #28)

## DEC-S1-003 — Identité d'ownership via cookie JWT (pattern existant ProductController)
Sprint 1 a réutilisé le pattern existant `@CookieValue("jwt")` + `jwtService` pour l'ownership, plutôt que `SecurityContextHolder`. Cohérence avec le code existant. Migration vers `SecurityContextHolder` (cohérence cookie/Bearer) actée en follow-up #93. (Sprint 1 #30)

## DEC-S2-001 — Rate limiting auth via Bucket4j in-memory mono-instance (pas Redis)
Bucket4j 8.10.1 in-memory (`io.github.bucket4j`), buckets `ConcurrentHashMap<(IP,path),Bucket>`. Motif : déploiement single-instance actuel, zéro infra ajoutée. Dette documentée : derrière un load-balancer à N replicas le plafond effectif = N × seuil → passer à `bucket4j-redis` au scale-out. (Sprint 2 #33)

## DEC-S2-002 — Contraintes d'unicité username/email au niveau JPA seulement (migration Flyway reportée S3)
`@Column(unique=true)` posé sur `UserEntity` (DB recréée en dev) sans migration Flyway ce sprint — la migration des contraintes DB est coordonnée avec Sprint 3 / #42. Le 409 sur doublon repose sur le catch `DataIntegrityViolationException` (username garde aussi un pré-check applicatif). (Sprint 2 #32)

## DEC-S3-001 — Spring Boot 3.2.2 = Flyway 9.22.3 (pas 10), `flyway-core` seul
Le BOM Boot 3.2.2 gère Flyway 9.22.3. En 9.x le support Postgres est dans `flyway-core` ; le module `flyway-database-postgresql` n'existe qu'à partir de Flyway 10 → l'ajouter sous Boot 3.2.x casse (`version is missing`). Ne l'ajouter que lors d'un upgrade Boot 3.3+/Flyway 10+. (Sprint 3 #42)

## DEC-S3-002 — Baseline Flyway : Option A (V1 sans uniques inline, V2 contraintes nommées)
`@Column(unique=true)` (#32) aurait fait générer des uniques auto-nommées dans la baseline → redondance avec les contraintes attendues. Choix : V1 omet les uniques inline, V2 pose `uq_users_username`/`uq_users_email` nommées, `@Column(unique=true)` conservé sur l'entité (`validate` n'audite pas les uniques → 0 conflit). DB = source unique des noms stables. (Sprint 3 #42)

## DEC-S3-003 — `application.properties` reste tracké mais secret-free + profils dev/prod
Plutôt que `git rm --cached`, le fichier commun garde `${VAR}` (non disruptif, approche Spring). Profils séparés : `-dev` (defaults locaux jetables), `-prod` (fail-fast sans default). `ddl-auto=validate` dans les deux (Flyway pilote le schéma). (Sprint 3 #34/#42)

## DEC-S3-004 — Audit JPA : `@Version Integer` + colonnes `NOT NULL DEFAULT`
Sous `ddl-auto=validate` + tables peuplées : `@Version` = `Integer` mappé `version integer NOT NULL DEFAULT 0` ; `createdAt`/`updatedAt` (LocalDateTime) mappés `timestamp NOT NULL DEFAULT now()`. Les DEFAULT backfillent les lignes existantes ; type/nullability identiques entité↔colonne sinon `validate` casse. `@EnableJpaAuditing` sur `EventmanagerApplication`. (Sprint 3 #43)

## DEC-S4-001 — Cookies JWT : attributs externalisés par profil + defaults de base fail-safe
`app.cookie.secure` / `app.cookie.domain` lus en `@Value`, appliqués via un helper unique `buildJwtCookie` (login/refresh/logout → attributs cohérents, BR-AUT-010). Defaults : `application-dev` = `false`/`localhost`, `application-prod` = `true`/host-only (`${COOKIE_DOMAIN:}`). Le default de base `application.properties` est **fail-safe** (`${COOKIE_SECURE:true}`, `${COOKIE_DOMAIN:}`) → un boot sans profil ni env var ne dégrade jamais en clair. Garde `if domain non blank` pour éviter `setDomain("")`. (Sprint 4 #99 + fix review)

## DEC-S4-002 — CSP backend stricte par directives explicites
Remplacer `default-src 'self'` permissif par directives explicites : `script-src 'self'`, `style-src 'self'` (sans `unsafe-inline`/`unsafe-eval`, cf. PIT-S4-003), `connect-src 'self'` (CORS n'autorise que localhost:3000, aucune origine API cross-origin), `img-src 'self' data:`, `font-src 'self'`, `base-uri 'self'` (NON hérité de default-src en CSP3), `object-src 'none'`, `frame-ancestors 'none'`. Assertion exacte de la chaîne CSP en test d'intégration (anti-régression). Externaliser connect-src par profil si SSR cross-origin un jour. (Sprint 4 #101 + fix review #113)

## DEC-S5-001 — Drift de contraintes corrigé par migration séparée
Réconciliation des CHECK/NOT NULL absents de la baseline via une migration V4 dédiée — jamais éditer V1/V2/V3 déjà appliquées (checksum mismatch Flyway → boot KO). V5 réservé aux index FK (#110). (Sprint 5 #108)

## DEC-S5-002 — SPRING_PROFILES_ACTIVE : default dev + garde-fou fail-fast (pas suppression)
Garder `${SPRING_PROFILES_ACTIVE:dev}` (confort dev local) + `ProfileSafetyGuard` (ApplicationListener) qui refuse le boot si profil `dev` actif ET marqueur `ENVIRONMENT/APP_ENV=production|prod`. Double signal prod requis. Choisi plutôt que suppression sèche du default (casserait mvn/IDE/tests) ou doc-only (défense passive). (Sprint 5 #111)

## DEC-S5-003 — SameSite cookie JWT maintenu Lax (pas Strict)
Front Next.js sur origine séparée (localhost:3000 dev, distinct prod) → `Strict` casserait les requêtes auth cross-site et navigations entrantes (lien/email). CSRF déjà couvert (API JSON + cookie HttpOnly + CORS allowCredentials). Reconsidérer si front+API passent sur le même eTLD+1 en prod. `COOKIE_SAME_SITE` vit dans AuthController (helper cookie #99). (Sprint 5 #120)

## DEC-S5-004 — Runbook de déploiement consolidé en hub unique
`docs/runbook/deploiement-profils.md` = source unique listant les env prod obligatoires (SPRING_PROFILES_ACTIVE=prod, ENVIRONMENT=production, CORS_ALLOWED_ORIGINS, COOKIE_DOMAIN, secrets DB/JWT) ; `cors-cookie-samesite.md` référence le hub. Évite la dérive doc (variable « optionnelle » ici, absente là). (Sprint 5 #118)

## DEC-S5-005 — Test 403 d'ownership : @WithMockUser(authorities=ROLE_USER)
Requis pour franchir `hasAuthority("ROLE_USER")` et atteindre le contrôleur où se lève le 403 d'ownership (sans, on teste un 403 d'autorité, pas d'ownership). `JwtFilter` ne réécrit pas un contexte d'authentification déjà posé. (Sprint 5 #119)

## DEC-S7-001 — change-password derrière le port UserService (correction A8)
La logique change-password (vérif BCrypt + re-hash) violait A8 en vivant dans le contrôleur (infra). Décision : `UserService.changePassword` (port domain) + logique dans `UserServiceImpl`, `InvalidCredentialsException`/`SamePasswordException` → 400. Pas de port d'encodage créé (scope min : `PasswordEncoder` = interface légère déjà tolérée en application). (Sprint 7 #70)

## DEC-S7-002 — Coexistence axios brut / TanStack Query (migration progressive)
Le transport reste axios (le `queryFn` appelle le service axios existant) ; TanStack n'ajoute que cache/dédup/refetch. Migration progressive, 2 hooks pilotes seulement (`useCurrentUser`, `useProductsWithEvents`), le reste des appels reste axios brut documenté. (Sprint 7 #48)

## DEC-S8-001 — `BrevoEmailService` no-op + swallow si `BREVO_API_KEY` absente
Sans clé : `log.warn` + no-op ; `RestClientException` avalée (log sans token/clé). Raison : (1) forgot-password ne doit pas leaker l'existence d'un compte via timing/erreur (BR-AUT-005) ; (2) dev/test bootent sans le secret. Corollaire (follow-up ouvert) : en prod ce no-op silencieux = emails jamais envoyés sans alerte → fail-fast prod / health indicator à ajouter. (Sprint 8 #49)

## DEC-S8-002 — Token reset : validité 15 min, usage unique
Durée de validité du token de reset = **15 minutes** (override dev, pas 2h) ; usage unique via `used_at` ; token invalide/expiré/consommé/non-UUID → 400 générique unique (anti-énum). Configurable `app.password-reset.token-validity-minutes`. #103 fermée comme doublon, ses éléments (BR-AUT-011 + tests intégration) absorbés dans #49. (Sprint 8 #49)

## DEC-S9-001 — Migration couleurs v3 : `backgroundColor` survivant, irréversible (ADR-001)
Modèle events design v3 = 1 seule couleur/événement. Migration V7 consolide `backgroundColor`+`borderColor`+`textColor` → `color` (= `backgroundColor`) ; `border_color`/`text_color` **DROP définitif** (Flyway Community sans undo → rollback manuel ne les restaure pas). Backfill `archived=false`. Sauvegarde DB + confirmation obligatoire avant prod. Détail : `docs/adr/ADR-001-migration-couleurs-v3.md`. (Sprint 9 #44)

## DEC-S9-002 — Persistance auth : re-fetch /me au mount (Option 1), plus de miroir localStorage
#135 (A17) : suppression totale du miroir localStorage du `user` (PII email/name), re-fetch `GET /api/auth/me` au montage depuis le cookie JWT HttpOnly (source de vérité serveur). Choisi vs Option 2 (restreindre les champs persistés) car `/me` renvoie déjà un DTO propre (`UserResponse`, sans password — BR-AUT-008), le pont existe ([[PAT-S7-004]]), et retirer 100 % de la PII > garder des champs désynchronisés. `loading` guard → pas de flash non-authentifié. (Sprint 9 #135)

## DEC-S10-001 — Ownership catégorie PAR UTILISATEUR (ADR-002)
Les catégories passent d'un référentiel global à une propriété par utilisateur : colonne `owner_id` (FK users, NULLABLE — migration V8), `owner NULL` = catégorie « système » (lisible de tous, non modifiable/supprimable → 403). PATCH/DELETE exigent `owner_id == subject JWT` (403 sinon) ; unicité du nom devient PAR UTILISATEUR (`UNIQUE(owner_id, name)`). Lecture scopée : `GET /api/categories` ne renvoie que `owner == caller ∪ système`, `GET /{id}` d'autrui → 404 (anti-énumération), et le DTO n'expose plus l'`ownerId` (booléen `system` dérivé). Backfill : catégories existantes → owner NULL (table sans lignes seedées, 4 UUID front = fantômes). Supersede AP-CAT-09. Casse les 4 UUID hardcodés front jusqu'à la Wave 3 (#61, S11). Détail : `docs/adr/ADR-002-ownership-categorie.md`. (Sprint 10 #52)

## DEC-S12-001 — Exceptions domaine mappées finement (422/400), pas de handler `IllegalArgumentException` global
Deux exceptions dédiées créées plutôt qu'un mapping large : `InvalidDurationUnitException` → **422** (donnée bien formée mais incalculable : `durationUnit` invalide/null au calcul endDate) ; `RecurrenceUnitRequiredException` → **400** (invariant BR-EVE-006 violé sur PATCH). Refus explicite d'un `@ExceptionHandler(IllegalArgumentException)` global : trop large, attraperait des erreurs non liées. 422 = calculable-mais-non ; 400 = requête invalide (Bean Validation ou invariant service) ; 404/409 = ressource. (Sprint 12 #54 + review)

## DEC-S12-002 — Pas de migration si la colonne préexiste (grep migrations avant de créer)
#158 (couleur produit) ne crée AUCUNE migration : la colonne `products.color` existait déjà depuis V7 (#44, `add column color varchar(255)`), ainsi que `ProductEntity.color` / `Product.color`. Le gap réel était l'exposition DTO + persistance service + branchement front, pas le schéma. Règle : toujours `grep` les migrations existantes (`grep -r "add column <champ>" db/migration/`) avant d'en créer une pour un champ « à ajouter » — une migration no-op est du bruit et un risque de collision de numérotation. (Sprint 12 #158)

## DEC-S13-001 — Attributs cookie dupliqués dans `UserController` plutôt qu'un `CookieFactory` partagé
`DELETE /api/me` (#78) doit effacer le cookie `jwt` (MaxAge=0). Décision : dupliquer les attributs cookie (`@Value("${app.cookie.*}")` + helper local `buildExpiredJwtCookie`) dans `UserController`, comme `AuthController`, PLUTÔT que factoriser un `JwtCookieFactory` partagé. Pourquoi : scope #78 minimal ; la factorisation cross-controller (`buildJwtCookie` dupliqué AuthController/UserController) est un refacto hors périmètre → dette tracée, candidate tâche suivante. (Sprint 13 #78)

## DEC-S13-002 — IP RGPD : ne stocker que l'IPv4 tronquée / IPv6 non compressé, sinon `null`
`ClientIpAnonymizer` (#73) : IPv4 → dernier octet à zéro ; IPv6 non compressé → 3 premiers hextets ; **IPv6 compressé (`::1`, `fe80::1`) → `null`** (non tronquable positionnellement de façon fiable). Pourquoi : préférer ne RIEN stocker à une donnée personnelle non anonymisée (RGPD). Conséquence assumée : `ip_address`/`device_info` souvent `null` pour clients IPv6 → dégrade l'UX « sessions actives » mais jamais la conformité. (Sprint 13 #73)

## DEC-S14-001 — BR-EVE-012 (recurrenceEndDate < startDate) mappée en 422, garde au niveau service sur l'état fusionné
Nouvelle `RecurrenceEndDateBeforeStartException` → **422** (donnée bien formée mais incohérente), cohérent avec [[DEC-S12-001]] (422 = calculable-mais-non). La garde est posée au niveau SERVICE sur l'état fusionné de l'entité (le PATCH ne porte pas `startDate`), pas un `@AssertTrue` DTO (payload partiel aveugle à l'état en base) — même logique que [[PAT-S12-001]]. `isBefore` stricte : `end == start` toléré. Portée sur update uniquement (`recurrenceEndDate` absent du DTO create). Écart contrat assumé : les issues #164/#168 demandaient « 400 » mais le dépôt mappe les erreurs métier events en 422 (uniformité DEC-S12-001) — arbitrage 400-vs-422 laissé en question produit ouverte. (Sprint 14 #168)

## DEC-S14-002 — Upgrade Boot 3.4.4 LTS : flyway-database-postgresql obligatoire + jjwt HS256 figé (confirme DEC-S3-001)
L'upgrade Spring Boot 3.2.2 → 3.4.4 (sortie EOL) tire Flyway 10.20.1 : le support PostgreSQL quitte `flyway-core` → module `flyway-database-postgresql` OBLIGATOIRE (sinon boot Flyway KO). Confirme DEC-S3-001. jjwt 0.11.5 → 0.13.0 (API breaking absorbée dans `JwtService`), algo **HS256 figé explicitement** (`signWith(key, Jwts.SIG.HS256)`) pour compat tokens legacy — cf. [[PIT-S14-001]]. 5 CVE CRITICAL postérieures à 3.4.4 restent (bump patch-release = follow-up). (Sprint 14 #162)

## DEC-S15-001 — FK via `entityManager.getReference` plutôt qu'injecter le port repository
Pour attacher une FK (`EventEntity.product`) sans couplage infra-infra, utiliser `entityManager.getReference(ProductEntity.class, id)` — PAS injecter le port `ProductRepository` (qui ne renvoie que le domaine `Product`, inutilisable comme entité gérée). Aligné sur `ProductRepositoryJpaImpl.save` ; l'existence est déjà garantie en amont (service + ownership controller). (Sprint 15 #165)

## DEC-S16-001 — Migration Storybook 8.6 → 10 plutôt que repin Next (build-storybook cassé)
`build-storybook` cassé par le bump Next 15.2→15.5 (fix CVE #161) : `define-env-plugin.js` supprimé de Next, importé par `@storybook/experimental-nextjs-vite@8.6` (transitif). Décision : migrer Storybook 8.6→10.4.6 (codemod `@latest`, framework `@storybook/nextjs-vite`) plutôt que downgrader Next. Why : `nextjs-vite` compatible Next 15.5, garde le builder Vite (cohérent Vitest), préserve le fix CVE #161 intact. (Sprint 16 #46)

## DEC-S16-002 — Convention stories Storybook DS
Stories `*.stories.tsx` colocalisées à côté du composant sous `src/components/**`, format CSF3 (`satisfies Meta<typeof X>`, `tags:['autodocs']`, titres `UI/<Composant>` ou `Timeline/<Composant>`), imports `@storybook/react-vite` (post-SB10). Les composants consomment les classes `.mt-*` de `ds/components/core.css` ; les composants shadcn/Radix existants sont alignés via le remap `@theme` de globals.css (pas de réécriture). `core.css` chargé côté Storybook uniquement (`.storybook/preview.ts`), pas dans globals.css app (décision #45). (Sprint 16 #46/#47)

## DEC-S17-001 — Timeline desktop : pas de virtualisation avant seuil >500 events actifs
La Vue Timeline (#55) rend les événements en blocs positionnés en absolu (`left:${px}px`), coût lié au NOMBRE d'events, pas au nombre de jours. Décision : NE PAS introduire `@tanstack/react-virtual` au MVP — complexité non justifiée avant mesure, et la virtualisation horizontale rentre en tension avec l'a11y (nœuds hors DOM cassent le tab). Seuil de re-décision : >500 events actifs (tier PRO, BR-EVE-011). Zoom = `useReducer` local (pas de Zustand). (Sprint 17 #55)

## DEC-S18-001 — Pas de composant `EventBlock` fantôme ni d'annotation `@track` : ne pas inventer de convention absente
Deux "conventions" citées en amont de #66 n'existent PAS dans le repo, vérifié par grep : (1) `EventBlock` (#47) — aucun composant de ce nom ; le preview live utilise un sous-bloc local (div colorée durée+titre) plutôt qu'une référence fantôme (candidats réels si besoin futur : `timeline/EventBar.tsx`, `EventContent.tsx`). (2) `@track` / « Section 16 Tracks » — la charte (`docs/design/graphite-handoff.md`) est structurée en « Écrans » (§132+), sans notion de Track ni JSDoc `@track`. Décision : JSDoc descriptif standard, pas d'annotation `@track` inventée. Règle générale : une convention citée dans un briefing mais introuvable au grep ne doit pas être fabriquée — signaler l'absence, choisir l'existant. (Sprint 18 #66)

## DEC-S19-001 — EventPill = composant dédié extrait du bouton inline de TimelineView (PAS EventBar, PAS EventContent)
#192 demandait d'extraire `EventPill` « depuis EventBar ». Vérification code : `EventBar.tsx` (#47, fenêtre fixe 30j + `EventContent` lourd) n'est JAMAIS monté par `TimelineView` (la frise #55 reste px-based). La vraie pastille compacte était le `<button className="mt-tlv__evt">` inline de TimelineView. Décision : `EventPill` = composant dédié léger (point statut + titre + encre `contrastInk`), extrait de l'inline, PAS une réutilisation d'`EventContent` (rendu riche calendrier) ni d'`EventBar`. Conséquence : `EventBar.tsx` + `Lane.tsx` deviennent des briques #47 ORPHELINES (aucun consommateur runtime) → follow-up retrait/déprécation. (Sprint 19 #192)

## DEC-S19-002 — Breakpoints Timeline mobile ad hoc (aucun token `--bp-*` dans Graphite)
Le DS Graphite n'a aucun token de breakpoint. Décisions ad hoc, documentées en commentaire CSS + composant : portrait = `max-width:640px` ; paysage = `orientation:landscape AND max-height:600px` (le `AND max-height` distingue un mobile retourné d'un iPad Pro paysage ~1024px qui reste desktop) ; minimap masquable forcée si `max-height:400px`. Candidat futur token DS `--bp-mobile-max` / `--bp-landscape-*` si le pattern se répète (ex. dashboard mobile S20). (Sprint 19 #63/#64)

## DEC-S19-003 — Transition sans perte d'état : hisser l'état mobile dans le wrapper responsive
Pour qu'une rotation portrait↔paysage (qui démonte/remonte la variante) ne perde ni scroll, ni zoom, ni sélection, l'état est HISSÉ dans `TimelineResponsive` (hooks `useTimelineMobileState`/`useTimelineMobileSelection`/`useTimelineMobileGestures`) et passé aux variantes en props ; les variantes s'auto-instancient seulement en usage autonome (story/test). Pattern réutilisable pour tout futur besoin de transition sans démontage entre composants sœurs. (Sprint 19 #64)

## DEC-S21-001 — Stockage avatar : local privé + StoragePort, PAS MinIO/S3 (ADR)
#75 demandait un stockage objet (MinIO dev / S3 prod) + URL signée. Constat security-expert : aucune infra objet dans le repo (pas de docker-compose, pas de dépendance Maven MinIO/S3, aucune var `STORAGE_*`) → la monter mid-sprint = scope creep. Décision : stockage **local privé** (répertoire hors webroot, `STORAGE_AVATAR_PATH`, fail-fast prod sans default) servi via endpoint **authentifié** `GET /api/me/avatar` (pas de static resource publique, pas d'URL signée). Isolation par `StoragePort` (interface domaine) + `LocalStorageAdapter` (infra) → swap S3/MinIO futur = nouvelle impl derrière le port, sans toucher controller/service. Déviation ASSUMÉE des critères d'acceptation #75 (validée sécurité + audit tests). (Sprint 21 #75, PR #211)

## DEC-S23-001 — Bump CVE : conserver la ligne Boot 3.4.x via overrides ciblés (pas de montée minor 3.5)
En S23 #180, pour résoudre 5 CVE CRITICAL post-3.4.4, décision de rester sur Boot 3.4.x (bumpé 3.4.4→3.4.13) + overrides Maven ciblés `spring-security.version=6.5.11`, `tomcat.version=10.1.56`, `spring-framework.version=6.2.19` — tous patch/minor-safe (même minor SF 6.2) — plutôt qu'une montée Boot 3.5 (surface de régression plus large). Validé : convergence `dependency:tree` sans skew + 270 tests verts + `package` OK + trivy 0 CRITICAL. (Sprint 23 #180)

## DEC-S23-002 — Gate sécurité CI : `npm audit --omit=dev` (prod only) + pin de TOUTES les occurrences d'actions par SHA
En S23 #167 : (1) `npm audit --audit-level=high --omit=dev` ne bloque QUE les dépendances de PRODUCTION — les CVE restantes portent sur du dev/test-tooling frontend (vitest/vite chain) qui ne ship pas ; trivy `--severity CRITICAL` couvre le CRITICAL cross-stack. Bump des dev-deps = follow-up. (2) Pinner par SHA TOUTES les occurrences d'actions du fichier (jobs backend+frontend+e2e+security, upload-artifact inclus) — pas seulement les lignes du triage : zizmor `unpinned-uses` scanne tout le fichier, un pin partiel ne satisfait pas « 0 finding high ». Dependabot (github-actions) maintient les SHA. (Sprint 23 #167)

## DEC-S24-001 — `ux-patterns.md` force-ajouté : SEUL fichier `.claude/rules-jit/` tracké (dir globalement gitignoré)
En S24 #197, besoin de stocker un référentiel a11y partagé (`.claude/rules-jit/ux-patterns.md`) mais `.claude/` est intégralement gitignoré (`.gitignore:100`, outillage local). Décision : `git add -f` du SEUL `ux-patterns.md`, sans lever l'ignore global ni tracker les autres packs rules-jit (backend.md/frontend.md/… restent locaux). Motif : garder l'exception minimale, ne pas embarquer par surprise l'outillage local. À surveiller : le référentiel partagé vit désormais dans un dir globalement ignoré. À réévaluer si d'autres rules-jit doivent devenir partagés (alors : négation gitignore ciblée plutôt que force-add répétés). (Sprint 24 #197)

## DEC-S25-001 — Contrat PATCH dates : le backend consomme startDate/endDate, la durée reste source de vérité en type=duration
En S25 #201, le form envoyait `startDate`/`endDate` au PATCH mais `EventUpdateRequest` les IGNORAIT (faux contrôle utilisateur). Décision : le backend les consomme désormais, avec arbitrage par `type` — `type=duration` → la DURÉE reste source de vérité de `endDate` (endDate explicite écrasée si startDate/durée changent, cohérent BR-EVE-003) ; `type=single` → `endDate` explicite persistée telle quelle (sinon suit startDate). Garde `endDate ≥ startDate` montée backend en 2 niveaux (DTO `@AssertTrue` payload + garde service état-fusionné → 422, cf. [[BR-EVE-016]]). Motif : symétrie create/update sans casser le calcul par durée existant. Le `GlobalExceptionHandler` (409 de #200) n'est pas impacté — l'ajout du 422 endDate est additif. (Sprint 25 #201)

## DEC-S26-001 — Token `--z-netbanner:80` > `--z-modal:70` ; correction du `.mt-sysbanner--sticky` DS (60, sous les sheets)
En S26 #76, la bannière réseau doit rester au-dessus des bottom sheets/modales (contrat DS). Le `.mt-sysbanner--sticky` importé du DS était à `z-index:60` — SOUS `--z-modal:70` → bannière masquée par les sheets. Décision : nouveau token `--z-netbanner:80` (> z-modal) dans `ds/tokens/spacing.css`, appliqué à `.mt-sysbanner--sticky`. Motif : respecter le contrat « au-dessus des sheets » sans magic-number, via token. (Sprint 26 #76)

## DEC-S26-002 — 403 géré dans `error.tsx` (pas de `forbidden.tsx` natif) pour éviter `experimental.authInterrupts`
En S26 #57, le `forbidden.tsx` natif de Next 15.2 exige le flag `experimental.authInterrupts`. Décision : ne PAS activer le flag expérimental ; gérer le 403 par une branche dans `app/[locale]/error.tsx` via un helper `isForbiddenError` (détection message/digest) — 403 affiche un écran « accès refusé » sans bouton retry, 500 garde `reset()`. Motif : éviter une dépendance à une API expérimentale pour un besoin transversal. (Sprint 26 #57)

## DEC-S26-003 — Exception i18n assumée : `app/error.tsx` (root error boundary) inline ses strings 4 locales
En S26 #57, le filet global `app/error.tsx` est rendu HORS de tout `NextIntlClientProvider` (il attrape les erreurs survenant au-dessus du segment `[locale]`) → `useTranslations` y throw (cf. [[PIT-S26-001]]). Décision : exception i18n assumée — messages inlinés pour les 4 locales dans le composant, locale résolue via `window.location.pathname`. Consigné (review ui-design RÉSERVE 2) pour qu'un audit futur ne le re-signale pas comme régression « string hardcodée ». Portée strictement limitée au root error boundary. (Sprint 26 #57)

## DEC-S27-001 — Migration V12 `users.role` : coercition NULL/hors-enum → `ROLE_USER` (moindre privilège), à l'opposé du fail-fast V4
En S27 #122, durcir `users.role` (NOT NULL + CHECK) sur base peuplée impose de traiter les lignes NULL/hors-enum existantes AVANT l'`ALTER`. Décision : les COERCER vers `ROLE_USER` (`UPDATE ... WHERE role IS NULL OR role NOT IN (...)`), à l'inverse du pré-vol fail-safe de V4 qui rejetait/signalait. Motif : un downgrade vers le rôle le moins privilégié est le pire cas SÛR côté sécurité — jamais de promotion silencieuse vers `ROLE_ADMIN`. Documenté dans l'en-tête V12. La bascule PROD (UPDATE non réversible + ALTER lock ACCESS EXCLUSIVE) reste une décision humaine ; validée ici uniquement via Testcontainers. (Sprint 27 #122)

## DEC-S29-001 — `NEXT_PUBLIC_API_URL` = URL hôte (pas nom de service compose)
En S29 (#37), dans `docker-compose.yml` le frontend Next reçoit `NEXT_PUBLIC_API_URL=http://localhost:8080/api` (URL de l'HÔTE) en ARG de build, PAS `http://backend:8080/api`. Motif : `NEXT_PUBLIC_*` est bakée au build et l'appel API part du NAVIGATEUR (sur l'hôte), qui n'a aucun accès au réseau interne compose ni au nom de service `backend`. Vaut pour tout front conteneurisé dont les appels sont client-side. (Sprint 29 #37)

## DEC-S31-001 — 3 CVE HIGH Spring Boot acceptées (non applicables), garde-fous testés
En S31 (#223/#258), CVE-2026-40973 (session hijacking), CVE-2026-22731 (health group additional-path), CVE-2026-22733 (actuator CloudFoundry) acceptées car vecteurs non applicables (app stateless JWT cookie confirmé `SessionCreationPolicy.STATELESS` ; aucune config `management.*` ; pas de CloudFoundry), le correctif n'existant qu'en Boot 3.5.x (hors périmètre patch #180). Documentées dans `docs/security/cve-acceptance.md` + garde-fous ArchUnit/@SpringBootTest. Condition de réexamen : bump Boot 3.5.x. (Sprint 31 #223/#258)

## DEC-S31-002 — Retrait de `--omit=dev` du job CI `security` (couverture dev+prod)
En S31 (#222), une fois `npm audit --audit-level=high` à 0 HIGH/CRITICAL deps complètes (dev inclus, via bump vitest 2→3 + leaves ReDoS), retrait du `--omit=dev` posé en S23 (#167) : l'audit CI couvre désormais TOUT l'arbre (surface supply-chain dev incluse). Résiduel MODERATE PROD (next-intl, next→postcss) = follow-up, non bloquant. (Sprint 31 #222)

## DEC-S32-001 — Infra jobs export RGPD async : table + @Async, URL signée par endpoint interne (ADR-003)
En S32 (#58), l'export RGPD async (ZIP/CSV) n'avait aucune infra de jobs. Décision (ADR-003) : job persisté en table `export_jobs` + exécution `@Async` (ThreadPoolTaskExecutor dédié `exportExecutor`, `CallerRunsPolicy` explicite), PAS de MQ ni scheduler. L'« URL signée 24h » = endpoint interne `GET /api/export/download/{jobId}?token=<jwt>` protégé par un token jjwt HS256 court (claim `typ=export-download`, `Clock` injecté) — car `StoragePort` est LOCAL (`LocalStorageAdapter`, hors webroot) sans presignedUrl S3. Rétention 24h ; purge programmée des fichiers/jobs expirés = dette (follow-up). Périmètre exporté = User(profil sans password/avatar) + Category + Product + Event ; sessions/tokens exclus. Le contrat DTO est figé pour #59 (S33). (Sprint 32 #58)

## DEC-S33-001 — Divergence locales layout/middleware : aligner sur 4 langues (Option 1), pas retirer es/de
En S33 (#235), face au 404 `/es` `/de` (layout `['fr','en']` vs middleware `['fr','en','es','de']`), deux options : (1) aligner le layout sur les 4 langues, (2) retirer les traductions es/de non exposées. Décision : **Option 1** — i18n 4 langues est une feature MVP annoncée (S26 a livré les traductions es/de), et l'audit clés es/de vs fr montrait 0 clé manquante. Matérialisé par une source de vérité unique `frontend/src/i18n/locales.ts`. (Sprint 33 #235)

## DEC-S33-002 — Export front : migration du stub `/api/me/export` vers le contrat réel #58 `/api/export`
En S33 (#59), le frontend pointait un stub mort `/api/me/export` (jamais livré backend). Décision : migrer vers le contrat figé #58 `/api/export` — GET sync (JSON/MARKDOWN, fichier inline) + POST async (ZIP/CSV) → `GET /job/{id}` polling → `GET /download/{id}?token=` (URL signée 24h) ; stub supprimé de `userService.ts`/`useSettings.ts`. Schéma Zod `ExportJobResponse` aligné DTO (`downloadUrl`/`expiresAt` nullable, non-null seulement si `status==COMPLETED`). (Sprint 33 #59)

## DEC-S34-001 — Upgrade Spring Boot 3.5.16 : retirer TOUS les overrides `<*.version>` #180/#223
En S34 (#260), le bump du parent BOM `3.4.13 → 3.5.16` rend redondants les 6 overrides property posés en #180/#223 (spring-security, spring-framework, tomcat, jackson-bom, postgresql, testcontainers) : le BOM 3.5.16 manage déjà des versions ≥ aux correctifs visés (spring-security 6.5.11, tomcat 10.1.55, jackson 2.21.4, pg 42.7.11, flyway 11.7.2, testcontainers 1.21.4). Décision : **retirer tous ces overrides** pour éviter le skew/downgrade et la dette de maintenance. Seuls overrides justifiés restants : `jjwt.version=0.13.0` (hors BOM) + `docker.api.version=1.44` (system-property surefire). Module `flyway-database-postgresql` OBLIGATOIRE (Flyway 11 l'exige toujours). Les 3 CVE HIGH acceptées en S31 (CVE-2026-40973/-22731/-22733) passent en « résolues » ; trivy 0 HIGH/CRITICAL backend. La garde anti-drift #224 fige des planchers `>=` sur ces versions effectives. (Sprint 34 #260)

## DEC-S34-002 — CVE MODERATE PROD frontend : bump next-intl intra-major, postcss XSS accepté (épinglé par next)
En S34 (#261), résolution des CVE MODERATE PROD : bump `next-intl 4.0.2 → 4.13.2` (intra-major, >4.9.1) — élimine open-redirect GHSA-8f24 + prototype-pollution GHSA-4c35, zéro breaking i18n, `next` non forcé (reste 15.5.20). Pour le XSS postcss (GHSA-qx2v) : postcss racine (8.5.15) déjà patché, mais `next` épingle `postcss@8.4.31` dans son bundle interne pour TOUTES ses releases jusqu'à `next@16.2.10` (`fixAvailable:false`). Décision : **accepter et documenter** (`docs/security/cve-acceptance.md`) plutôt que forcer un `overrides` risqué (pipeline CSS interne de next non vérifiable). À ré-évaluer au prochain bump `next`. (Sprint 34 #261)

## DEC-S39-001 — Bordures fonctionnelles outline : emprunt à `ink-muted` en attendant un token dédié
En S39 (#56), le bouton secondaire outline du hero landing avait une bordure `border-rule` sous-AA (~1.2:1, invisible). Aucun token de bordure Graphite (`rule`/`rule-strong`, ~1.2–1.5:1) n'atteint le seuil UI ≥3:1. Décision : **emprunter `border-ink-muted`** (tier texte, ~6:1 clair / ~6.26:1 sombre) pour cette bordure fonctionnelle — hors-taxonomie mais seul choix charte-conforme atteignant AA (validé par ui-design, hiérarchie primaire plein / secondaire outline préservée). À terme, remplacer par un token dédié `--color-rule-emphasis` (~gray-500). Portée limitée au hero (correction d'usage, aucune valeur de token modifiée). (Sprint 39 #56)

## DEC-S40-001 — Shell applicatif : tablette bascule en mode mobile, pas de sidebar repliable (seuil `lg`)
En S40 (#210), le shell applicatif (nav latérale persistante 248px) devait gérer le responsive. Le handoff §responsive évoque une « tablette sidebar repliable », mais aucun composant repliable n'existe et le rail 64px mobile (#85) ne couvre que le paysage. Décision : la sidebar 248px est **desktop uniquement, seuil `lg` (1024px, aligné `SettingsShell`)** ; en dessous de `lg` (donc tablette incluse), le shell **délègue** à la nav mobile existante (`CompactRail` paysage #85 / `MobileDrawer` portrait #83) sans réécriture. **Pas d'état intermédiaire « sidebar repliable icon-only »** ce sprint (éviterait un nouveau token `--sidebar-collapsed-width` + un nouvel état). La tablette repliable reste un follow-up. (Sprint 40 #210)

## DEC-S41-001 — Aide clavier de la frise Timeline : hover/focus-only, `?` n'est pas un raccourci (option B)
En S41 (#227), le référentiel `ux-patterns.md` listait un raccourci `?` (aide) au statut PRÉVU, jamais câblé au clavier (pas de `case '?'` dans le handler). L'aide existe déjà comme tooltip hover/focus (`.mt-tlv__help-pop`, `role="tooltip"`, `aria-describedby` conforme). **Décision (option B) : acter l'aide « hover/focus-only », NE PAS câbler `?`, et RETIRER la mention du raccourci `?` du référentiel** (§5 titre, ligne de table, paragraphe reformulé, §9 marquée résolue). On aligne la doc sur le code plutôt que d'ajouter un handler + un mode d'ouverture clavier à maintenir. Alternative écartée (option A : câbler `?` → dialog focusable) = surface de maintenance supplémentaire pour un gain a11y marginal (l'aide reste atteignable au focus du bouton). (Sprint 41 #227)
