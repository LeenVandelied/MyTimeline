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

## DEC-S42-001 — Contrat 409 optimistic-lock event ENRICHI (serverVersion + serverEvent)
En S42 (#231), le corps du 409 optimistic-lock event passe de plat `{"error":"..."}` à enrichi `{error, serverVersion, serverEvent}`, où `serverEvent` = projection `EventResponse` du propriétaire (aucun champ interne). Distinct du 409 plat générique (contraintes DB) qui reste inchangé. Permet la modale comparative frontend (diff serveur/local). Contrat verrouillé par test (`GlobalExceptionHandlerOptimisticLockTest` asserte serverVersion + serverEvent.version + serverEvent.title). Partagé avec S43 #290 (rebase sur ce contrat). (Sprint 42 #231)

## DEC-S42-002 — `version` exposée dans `EventResponse` = champ de contrat optimiste délibéré
En S42 (absorb gap B), `version` (`@Version`) est exposée dans `EventResponse` — dérogation assumée au principe « ne pas exposer les champs internes (`version`) » (cp-backend convention 1). Justification : le contrôle de concurrence optimiste via API EXIGE que le client détienne et renvoie la version au chargement du form ; cohérent avec `serverVersion` du 409 #231. La `version` n'est pas une donnée sensible (entier monotone), pas de fuite. (Sprint 42 absorb)

## DEC-S44-001 — Source de données de `/timeline` = frise GLOBALE multi-produits (`useDashboardData`)
En S44 (#301), l'écran frise réel devait choisir sa source. Le mini-plan architect proposait `useProductsWithEvents` ; retenu à la place : **`useDashboardData`** (agrégation canonique #80, elle-même adossée à `useProductsWithEvents` #48), qui aplatit déjà TOUS les produits de l'utilisateur en `events` (`FullCalendarEvent`, archivés exclus — BR-EVE-011) + `resources` (**une lane par produit**). Motif : réutiliser la dérivation `flatMap`/`mapToFullCalendarEvent` existante plutôt que la dupliquer — c'est le même host que monte déjà le dashboard. **Le risque « resources non dédupliquées » signalé au plan ne s'applique pas** : `resources = products.map` keyé sur `product.id` (unique) → aucune collision de lane/position dans `zoom.ts`. Invariant respecté : `TimelineEditHost` DOIT vivre sous `<AuthProvider>` (garanti par les providers racine). Conséquence : `/timeline` est une frise **globale**, pas une frise par produit (celle-ci reste `ProductDetailView`). (Sprint 44 #301)

## DEC-S44-002 — Aperçu du drawer de création : scope RÉDUIT (bloc simple), mini-frise §6 reportée
En S44 (#300), le handoff design §6 spécifie un aperçu live en **mini-frise** (ruler, marqueur TODAY, occurrence fantôme pointillée, légende prochaine occurrence). L'existant (`EventEditForm`) n'offre qu'un bloc coloré simple (couleur/durée). ui-design a signalé l'écart ; **arbitrage dev : scope réduit pour ce sprint** — aperçu simple, mini-frise en follow-up [M | events]. Motif : #300 était déjà en borne haute de M (le body sous-estimait le travail réel : `createEvent` inexistant, sélecteur de produit à créer, hook de mutation + invalidation), et le sprint à 12 pts dépassait déjà la cible de 10. L'écart est documenté, pas subi. (Sprint 44 #300)

## DEC-S44-003 — Récurrence au create : parité WEEK/MONTH/YEAR avec l'édition (divergence assumée vs mock §6)
En S44 (#300), le mock du handoff §6 n'affiche que « Aucune / Mensuelle / Annuelle » pour la récurrence, alors que le schéma et l'enum backend `RecurrenceUnit` supportent aussi **WEEK**. Décision : **exposer l'hebdomadaire** (parité fonctionnelle avec le formulaire d'édition). Motif : omettre l'hebdo retirerait une unité pourtant supportée par le backend et créerait une asymétrie create/edit injustifiable (un event hebdomadaire éditable mais pas créable). Le mock est traité comme une illustration, pas comme une restriction fonctionnelle. Divergence consignée dans la docstring de `NewEventDrawer`. (Sprint 44 #300)

## DEC-S43-001 — Champ `error` d'AuthController migré sur `ErrorCode` (forme plate conservée, codes niveau statut)
En S43 (#288), le champ `error` d'`AuthController` mélangeait anglais/snake_case/français. Décision (option A) : migration sur l'enum `ErrorCode`, codes stables snake_case au NIVEAU STATUT HTTP (`unauthorized` 401, `conflict` 409, `internal_error` 500), forme PLATE `{"error":<code>}` inchangée (pas de champ `message` ajouté). Le 409 register collapse username/email en `conflict` unique — SÛR car le frontend (`register/page.tsx`) mappe par statut HTTP seul ; le discriminant `field` (bloc mort) est retiré du body, ce qui renforce l'anti-énumération. Cohérent avec les handlers `SecurityConfig` (`unauthorized`/`forbidden`) et l'enum existant ([[PAT-S38-001]]). ErrorCode ajoutés : `UNAUTHORIZED`/`CONFLICT`/`INTERNAL_ERROR` (#288) + `BAD_REQUEST` (#290). (Sprint 43 #288)

## DEC-S45-001 — Garde serveur middleware = PRÉSENCE du cookie `jwt` seule (pas de vérification de signature)
En S45 (#302), la garde serveur des routes `(app)` ne vérifie que la **présence** du cookie `jwt`. Motif vérifié dans le code : `JwtService` signe en HMAC **symétrique** (`Keys`/`SecretKey`, `jwt.secret`) — le secret qui vérifie est aussi celui qui **émet** ; le placer dans le runtime Edge mettrait un secret de frappe de jetons côté frontend. Appel à `/api/auth/me` écarté (aller-retour réseau à CHAQUE navigation). **Limite assumée et écrite dans l'ADR : un cookie présent mais expiré/forgé passe la garde** ; `JwtFilter` répond 401 et `useAuthGuard` redirige. **Ce middleware n'est PAS une frontière d'autorisation** — audit sécurité confirmé : les 5 pages protégées sont `'use client'`, zéro fetch serveur, ce qui fuite = le shell déjà public. Follow-up : un JWT asymétrique (RS256) rendrait la vérification Edge possible. `docs/adr/ADR-004`. (Sprint 45 #302)

## DEC-S45-002 — Canal de capture du token de reset E2E : profils Spring ADDITIFS (`dev,e2e`)
En S45 (#283), l'E2E `forgot-password` lisait le token directement en base (`pg`, table `password_reset_tokens`, couplage migration V6). Remplacé par un endpoint HTTP test-only `@Profile("e2e")`. **Le job CI e2e tournant en `SPRING_PROFILES_ACTIVE: dev`, un `@Profile("e2e")` nu n'aurait jamais été actif en CI** → le job passe à `dev,e2e` (liste **additive** : toute la config `dev` reste active, `e2e` ne fait qu'AJOUTER le bean). Alternatives rejetées : mock `EmailService` en mémoire (l'E2E tourne dans un **processus séparé** → il faudrait de toute façon un canal HTTP), endpoint `@Profile("dev")` (expose un lecteur de token en dev local, inutile puisque l'additif ne coûte rien). `pg` désinstallé, `db.ts` supprimé. `docs/adr/ADR-005`. (Sprint 45 #283)

## DEC-S45-003 — `Location` ABSOLU dans la garde middleware : contrainte runtime > risque Host théorique
En S45, le `Location` relatif (choisi pour éviter un open-redirect via l'en-tête `Host`) s'est révélé **impossible** : Next normalise les redirections de middleware et lève `Invalid URL` sur un chemin relatif → 500 sur toutes les routes protégées ([[PIT-S45-001]]). Aucune variante relative viable (le chemin de l'adapter n'est contournable que par une variable d'env globale). **Arbitrage : retour à `request.nextUrl.clone()` + `NextResponse.redirect(url, 307)`** — une panne totale des routes protégées est strictement pire qu'un risque d'empoisonnement `Host`. Query non reportée (pas de `?redirect=`). Risque résiduel repoussé à l'infra (Host canonique au proxy) ou à une allow-list future ; puce « Location relatif » d'ADR-004 §Limites **supprimée car devenue fausse**. (Sprint 45 #302)

## DEC-S45-004 — CI `security` : gate BLOQUANT sur les deps de prod, audit dev+prod INFORMATIF
En S45 (PR #317), le job `security` bloquait sur 19 HIGH. Les vulnérabilités **de production** ont été corrigées (postcss 8.5.23, sharp 0.35.3 via override, next 15.5.22) → `npm audit --omit=dev --audit-level=high` = 0. Restent **9 HIGH dev-only**, toutes issues d'UNE cause racine incorrigible en aval : `brace-expansion` GHSA-mh99-v99m-4gvg propagée via `minimatch` dans la chaîne eslint — la seule version corrigée (5.0.8) change sa forme d'export et casse le lint, et `@eslint/eslintrc` **dans sa dernière version (3.3.6)** épingle toujours `minimatch: ^3.1.5` (aucune version amont vers laquelle monter). Décision (validée par le dev) : étape bloquante sur `--omit=dev`, étape `continue-on-error` sur dev+prod pour garder la chaîne dev **visible** dans les logs. Assouplissement assumé de #222. **À refusionner dès que `@eslint/eslintrc` passe à `minimatch@10`.** Contrepartie : une régression sur une dépendance dev ne rougira plus la CI. (Sprint 45, PR #317)

## DEC-S48-056 — Route canonique de la landing = `/[locale]`, `/[locale]/home` en 308
En S48 (#56), deux routes rendaient le MÊME composant `HomePage` en 200 (`/fr` et `/fr/home`), sans canonicalisation — contenu dupliqué pour les moteurs et ambiguïté à chaque ajout de lien. Contre-intuitivement, c'est `/[locale]/home` qui était la route CÂBLÉE de fait (racine du site, retour dashboard, 3 écrans d'erreur/404), verrouillée par 5 assertions unitaires + 1 entrée E2E. Décision : **`/[locale]` devient canonique**, `/[locale]/home` est CONSERVÉE et redirige en `permanentRedirect()` (308). Motifs : `/fr` est la racine de locale au sens de `next-intl` (`localePrefix: 'always'`) et l'URL que visent naturellement les liens entrants — faire de la racine de locale une simple redirection déplace l'autorité vers une URL arbitraire ; `/home` est un segment redondant ; la chaîne `/` → `/fr/home` tombe à un seul saut `/` → `/fr`. Alternatives rejetées : **statu quo `/home` canonique** (zéro churn de test pour seul avantage — c'était choisir l'URL techniquement inférieure pour éviter 11 lignes de test mécaniques) ; **suppression** d'une des routes (404 sur liens entrants hors dépôt) ; **rewrite** (redonne deux URLs en 200, soit le doublon de départ). 308 et non 307 assumé : la consolidation SEO est l'objet de la décision, contrepartie = mise en cache navigateur durable, rollback coûteux. **Piège absorbé : `e2e/auth-guard.spec.ts` assertait `status === 200` sur `/fr/home` avec `maxRedirects: 0`** — non listé au briefing, aurait rougi la CI ; `PUBLIC_PATHS` bascule sur `/fr`. `src/lib/auth-guard-paths.ts` inchangé (`/fr/home` reste public : il doit être atteignable pour être redirigé). `docs/adr/ADR-006`. (Sprint 48 #56)

## DEC-S48-293 — Tier « bordure fonctionnelle » = `--color-rule-emphasis` `#7A7E87` (`--gray-450`), NON inversé en sombre
En S48 (#293), la charte Graphite n'avait aucun token de bordure atteignant le seuil WCAG 1.4.11 (≥3:1) : `--color-rule` = 1.24:1, `--color-rule-strong` = 1.50:1 (mesurés). Le S39 avait emprunté `--color-ink-muted` (tier TEXTE) faute de mieux (DEC-S39-001). Décision : nouveau palier de rampe `--gray-450: #7A7E87` — **milieu arithmétique exact** de `gray-400`/`gray-500` — exposé en `--color-rule-emphasis`, **même valeur dans `:root` ET `.dark`**. Ratios mesurés puis re-vérifiés indépendamment par le lead : **3.97** (clair/bg) · **4.07** (clair/surface) · **4.81** (sombre/bg) · **4.49** (sombre/surface) ; marge minimale 3.97, aucun ratio limite. **Alternative rejetée — inverser clair/sombre** (`gray-500` clair / `gray-400` sombre) : les valeurs auraient été identiques à `ink-muted`, rendant le token redondant, et `gray-500` tombe à **2.99** vs `surface` sombre (échec). La hiérarchie est préservée : le token reste sous `ink-muted` dans les deux modes (4.07<6.11 clair, 4.49<5.85 sombre), donc il ne concurrence pas le tier texte. Distinction documentée dans `ds/readme.md` : **fonctionnel** (affordance de contrôle) vs **décoratif** (`--color-rule`, cadres/séparateurs). Le mapping shadcn `--color-border: var(--color-rule)` est **délibérément inchangé** (le basculer assombrirait toutes les bordures de l'app). (Sprint 48 #293)

## DEC-S48-002 — `ds/tokens/base.css` : seules les règles `a` passent en `@layer base`, pas le fichier entier
En S48 (clôture), la conversion `asChild` a révélé que `base.css` est **non-layerisé** et écrasait donc les utilitaires Tailwind (`@layer utilities`) — CTA bleu sur bleu, invisibles. Décision : encapsuler **uniquement `a` et `a:hover`** dans `@layer base`, pas tout le fichier. **Alternatives rejetées :** (1) layeriser le fichier entier — `h1..h6 { margin: 0; font-weight: semibold }` y écrase aujourd'hui des `mb-*`/`font-bold` (ex. `FooterSection.tsx:41`), le layeriser provoquerait des décalages de mise en page partout ; (2) idem pour le bloc `@media prefers-reduced-motion` en `!important` — **pour les déclarations `!important` l'ordre des layers est INVERSÉ**, le layeriser *augmenterait* sa priorité face aux utilitaires. Effets collatéraux **voulus** (chacun applique la classe que le code demandait déjà) : sidebar `AppShell`, `dashboard`, et surtout `StateScreen.stateActionPrimary` (`text-accent-ink`) qui était lui aussi **bleu sur bleu, invisible** dans `error.tsx`/`not-found.tsx`. Dette laissée en follow-up : `h1..h6 { margin: 0 }` non-layerisé annule silencieusement les `mb-*` sur les titres. (Sprint 48, correction `842a46c`)

## DEC-S49-069 — Virtualisation de la frise MAISON, aucune librairie ; budget de rendu redéfini ; `aria-rowcount` écarté
En S49 (#69), trois décisions liées, toutes documentées dans `docs/adr/ADR-007-virtualisation-timeline.md`.
**(1) Pas de librairie.** `@tanstack/react-virtual` et `react-window` **rejetés** : leur modèle `index → estimateSize` est inapplicable à des **intervalles absolus chevauchants** sur l'axe horizontal ; sur l'axe vertical les hauteurs sont uniformes, une addition suffit. `frontend/package.json` **inchangé** — zéro dépendance ajoutée. Mesures à 1000 événements : commit 145,9 → **52,0 ms**, peint 301,7 → **81,5 ms**, pastilles montées 1000 → **51**, nœuds DOM 3889 → **584**, scroll H p95 108,3 → **~17 ms**. Overscan 1000/500 essayé puis **rejeté sur mesure** (p95 V 24,9 ms) ; 600/320 retenu.
**(2) Budget redéfini.** L'issue demandait « < 16 ms par frame » ; retenu **≤100 ms commit / ≤150 ms peint**, au motif que 16 ms est un budget de *frame*, pas de *montage initial*. **Écart assumé aux termes écrits de l'issue.**
**(3) `aria-rowcount`/`aria-rowindex` écartés** au profit de `role="list"/"listitem"` + `aria-setsize`/`aria-posinset` : les premiers **exigent** un rôle `grid`/`table`, les poser sans ce rôle est inopérant, et convertir la frise en grid remplacerait le pattern région + roving de #81. **Écart assumé** — l'issue les demandait explicitement.
**Limite connue** : en jsdom, faute de mesure possible, le code rend **tout** — les tests unitaires ne peuvent donc **pas** prouver le critère « hors viewport absent du DOM ». (Sprint 49 #69)

## DEC-S49-336 — `--color-input` (shadcn) = tier FONCTIONNEL ; `--color-border` = tier DÉCORATIF
En S49 (#336), la migration des bordures de contrôle a révélé que **ni l'issue ni le briefing ne citaient le vrai mécanisme** : `globals.css:105` `--color-input: var(--color-rule-strong)` est le **pont shadcn** qui habille `Input`, `SelectTrigger` et `Button variant="outline"` — donc **tout champ sans override de `className`**. C'est lui qui décide des bordures de champ, pas les `className`. Décision : `--color-input` bascule sur `--color-rule-emphasis` (tier fonctionnel, ≥3:1) ; `--color-border` **reste** sur `--color-rule` (décoratif). Arbitrage complémentaire sur `ds/components/core.css` : **7 déclarations migrées / 7 laissées**, commenté in-situ — fonctionnel = la bordure EST l'affordance (input, checkbox, radio, switch, bouton outline, chip focusable) ; décoratif = cadre de panneau flottant, badge, avatar, `table th`, survol de carte. Bouton outline : **1,46 → 3,97:1**. Ratios mesurés sur 6 fonds (clair/sombre × `bg`/`surface`/`surface-2`), pire cas **3,70** sur `surface-2` — un fond **non mesuré au S48**. (Sprint 49 #336)

## DEC-S49-335 — Un CSS hors `@layer` bat les utilitaires : `landing.css` annulait silencieusement la migration DS du Sprint 48
En S49 (#335), la cause racine s'est révélée plus grave que l'énoncé de l'issue : `landing.css` **n'était pas layerisé**, donc ses littéraux de couleur **battaient** les classes `border-rule` posées au S48 — **la migration DS du sprint précédent n'avait jamais pris effet sur ces cartes**. Décision : tout passer par tokens, verrouillé par un garde-fou AST (`landing-palette.test.ts`) interdisant tout littéral, **y compris dans les commentaires** (sinon faux positif d'audit + `PIT-S48-002`, Tailwind scannant les commentaires). Corollaire trouvé au passage : un **`@keyframes` non préfixé** (`pulse`) importé après `globals.css` **écrase l'animation Tailwind de même nom pour TOUTE l'application** (`animate-pulse` → squelettes de chargement dégradés) — **préfixer systématiquement**. (Sprint 49 #335)

## DEC-S49-334 — `MobileDrawer` NON généralisé : composant landing dédié, seul `useFocusTrap` mutualisé
En S49 (#334), le menu mobile de la landing aurait pu réutiliser `frontend/src/components/dashboard/MobileDrawer.tsx`. **Rejeté** : ce composant est couplé au dashboard (logout, bascule de thème, clés i18n `dashboard.mobile.drawer`). Décision : créer `LandingMobileMenu.tsx` **calqué** dessus (overlay `z-40`, panneau `z-50`, `role="dialog"` + `aria-modal` + `aria-labelledby`) et **mutualiser uniquement `useFocusTrap`**. Généraliser `MobileDrawer` serait un refactor P1 hors périmètre d'un correctif de débordement. **Alternative rejetée — masquer les boutons auth sous `md`** (piste n°2 de l'issue) : le seul accès restant à `/login` serait `FooterSection.tsx:81`, en bas de page, ce qui ne remplit pas le critère « le header reste utilisable ». Bonus non prévu : les ancres nav, jusque-là `hidden md:flex` donc **inaccessibles en mobile**, sont récupérées dans le panneau. (Sprint 49 #334)

## DEC-S50-001 — `#322` : Host canonique par variable d'environnement, pas par proxy
Le plan actait l'option « garantir un `Host` canonique au niveau du proxy ». **Vérification au démarrage :
aucun reverse-proxy n'existe dans le dépôt** (`docker-compose.yml` = postgres + backend + frontend ;
`.github/workflows/` = `ci.yml` seul ; aucun workflow de déploiement). L'option se réduisait donc à documenter
une exigence future en laissant l'open-redirect vivant dans le code.
**Décision (dev, 2026-07-28) : `APP_CANONICAL_HOST`, validée fail-closed dans le middleware**, testable sans
infra. Alternatives rejetées : allow-list applicative (maintenance preview/staging, risque signalé par l'issue
elle-même) ; `CORS_ALLOWED_ORIGINS` (lue par Spring, **ne parvient pas** au conteneur frontend — mesuré) ;
`NEXT_PUBLIC_*` (figerait la valeur au build).
⚠ Nuance importante trouvée à l'implémentation : sur ce runtime self-hosté, `initURL` dérive de l'hôte de
**bind**, pas de l'en-tête `Host` — un `Host` falsifié ne déplaçait **déjà pas** la redirection (mesuré au
`curl`, 3 cas). **Le correctif est de la défense en profondeur**, et redevient nécessaire avec `trustHostHeader`
ou sur plateforme edge. Écrit tel quel dans ADR-004 plutôt que présenté comme une faille fermée.

## DEC-S50-002 — `#323` : bascule RS256 SÈCHE, sans double émission transitoire
Pas de double émission HS256/RS256 pendant une fenêtre de transition. Deux raisons : (a) rien n'est déployé,
le parc d'utilisateurs à ménager n'existe pas ; (b) **un vérificateur qui accepte deux algorithmes rouvre la
confusion d'algorithme** qu'on vient précisément de fermer ([[PIT-S50-001]]). Le critère d'acceptation
« stratégie de transition » est donc **documenté** (ADR-004 + runbook), pas exécuté.

## DEC-S50-003 — `ExportTokenService` reste HS256, sur une clé DÉDIÉE `EXPORT_TOKEN_SECRET`
Découvert au démarrage : `ExportTokenService` était un **second consommateur de `${jwt.secret}`** que le plan
architecte ne voyait pas — sans le traiter, l'étape « retirer `JWT_SECRET` de la config » était inexécutable.
Les jetons de téléchargement d'export sont vérifiés **côté serveur uniquement** : l'asymétrique n'y apporte
rien. Clé dédiée plutôt que migration RS256 ⇒ l'isolation auth ↔ download devient **double** (claim `typ` +
matériel de clé disjoint), et `JWT_SECRET` disparaît réellement de la configuration.

## DEC-S50-004 — `#249` : livrer l'audit et les docs, laisser l'issue OUVERTE
L'issue demandait une rotation de secrets. **Aucune cible n'existe** : `gh secret list` vide, aucun
environnement GitHub, aucun workflow de déploiement, projet non déployé. Les trois critères opérationnels sont
inatteignables. Décision : livrer l'audit d'exposition, l'inventaire des services externes manquant et le
runbook corrigé ; **ne pas cocher les critères, ne pas fermer l'issue**. Dans un dépôt public, « rotationner »
se réduit de toute façon à **ne jamais réutiliser** les valeurs exposées au premier provisionnement — la purge
d'historique (#112) ne décompromet rien.

## DEC-S50-005 — Deux barrières ET un message lisible sur le matériel de signature en prod
Au 2ᵉ cycle de review : `application-prod.properties` déclarait `${JWT_PRIVATE_KEY:}` (défaut vide) là où
`application.properties` impose la convention #34 « aucun default ⇒ le boot échoue ». Le chemin profil-`prod`
était donc passé de **2 barrières à 1** (seul `ProfileSafetyGuard`). Défaut retiré — et comme
`env.getProperty()` lève alors depuis l'intérieur du garde-fou, `isBlankProperty` traite « placeholder
irrésoluble » comme « non fournie » : on conserve les deux barrières **et** le message d'exploitation.
Cf. [[PIT-S50-008]].

## DEC-S52-001 — Le milestone GitHub prime sur un plan d'architecte périmé
Le plan du 28/07 ciblait #102/#134/#148 ; le 29/07 le milestone « Sprint 52 » a été re-scopé (issues
déplacées vers le milestone gelé « Mise en ligne » et vers Sprint 53). Décision : **le milestone fait foi**
(MEMO-011, source unique de tracking), le label `sprint-*` est un résidu non fiable. Pourquoi : exécuter le
plan périmé aurait rouvert un travail délibérément gelé en attente de la décision d'hébergement (#369).

## DEC-S52-002 — Le garde-fou d'appariement ne sanctionne QUE le jeton DS `text-accent-ink`
`--color-accent-foreground` est un alias shadcn, `--color-accent-ink` un jeton du DS Graphite. Décision : le
détecteur n'accepte que le second. Pourquoi : seul le jeton DS a un ratio **mesuré** ; rien ne garantit que
l'alias continue de le suivre.

## DEC-S52-003 — Ne PAS élargir le garde-fou AST au couplage réparti sur deux fichiers
La régression `df93b63` avait sa **surface** dans `dropdown-menu.tsx` et son **encre** dans
`language-selector.tsx` — deux `className` distincts. Décision : laisser le détecteur tel quel. Pourquoi : il
raisonne par attribut `className` ; deux moitiés dans deux fichiers sont hors de portée de toute analyse
statique par attribut. L'élargir donnerait un **faux sentiment de couverture** — seule la mesure au
navigateur couvre cette famille de défauts.

## DEC-S52-004 — Corriger le palier, pas la locale
Le débordement CI ne tombait qu'en `de` (−1 px), mais la mesure des 4 locales montrait `es` à **4 px** du même
basculement. Décision : correctif au palier `max-[360px]` pour les 4 locales (marge portée à 16 px) plutôt
qu'un ajustement ciblé sur `de`. Pourquoi : corriger `de` seul aurait laissé `es` à un rendu d'OS près du
même échec. Le CTA reprend les métriques **horizontales** de la taille `sm` du DS sans sa hauteur, donc la
cible tactile 44 px de #334 est préservée.

## DEC-S53-001 — `line-height` reste HORS layer sur `h1..h6`, les 4 autres propriétés y entrent
Contexte : #339 devait faire céder les défauts de titre devant les utilitaires Tailwind. `ui-design` avait
tranché `line-height : RESTE GAGNANTE` ; **le lead a écrasé ce verdict** en imposant « layeriser les 5 en
bloc », convaincu que mapper `--leading-*` dans `@theme` suffisait. C'était faux (cf. `PIT-S53-001`) et la CI
E2E l'a démontré. Décision finale : `margin`, `font-weight`, `font-family` et `letter-spacing` dans
`@layer base` (elles **doivent** céder — c'est l'objet de l'issue, et `font-family` porte la bascule
display→mono du dashboard) ; **`line-height` hors layer, seul**. Contrepartie assumée : un `leading-*`
explicite ne peut plus gagner sur un titre — impact **mesuré nul**. `letter-spacing` peut rester layerisé :
mesuré, `text-*` n'apparie **aucun** `letter-spacing`. Leçon de gouvernance : écraser la réserve précise d'un
spécialiste demande une **preuve**, pas une inférence.

## DEC-S53-002 — Ne PAS layeriser les 3 règles en conflit dont la correction créerait la régression
L'audit #340 a démontré 4 conflits réels ; **3 n'ont délibérément pas été corrigés**, et c'est le résultat le
plus utile de l'issue. `:focus-visible` : `language-selector.tsx` **dépend** de son caractère hors-layer, c'est
son **unique** indicateur de focus — le layeriser = régression **WCAG 1.4.11** (reporté en follow-up [M] avec
arbitrage `ui-design`). `.feature-card` / `.testimonial-card` : cf. `PIT-S53-004`. `time, .mono, [data-mono]` :
2 sites, les deux posent `font-mono`, **dérive nulle** → verrou de l'AC appliqué. Pourquoi : layeriser une
règle sans conflit démontré, c'est prendre un risque de cascade **contre rien**.

## DEC-S53-003 — Les ~770 lignes de `ds/components/*.css` restent hors layer
Le vrai défaut de #340 n'était pas les sélecteurs d'élément (il n'en existe **aucun** en tête de sélecteur
dans les 7 fichiers listés) mais les **classes** hors layer, que l'énoncé ne mentionnait pas. Décision : ne
layeriser que `.mt-avatar` (seul conflit réel prouvé) et laisser les ~770 autres lignes hors layer. Pourquoi :
**0 conflit réel aujourd'hui** — ces classes sont posées **seules** partout — donc 0 bénéfice immédiat contre
un basculement de précédence composant→utilitaire sur toute la Vue Timeline. À rouvrir seulement si le
produit adopte la règle « une utilitaire gagne toujours ». Le layer retenu pour les classes de composant est
`components`, pas `base` comme le disait l'issue (`base` est le layer des resets **et** du preflight Tailwind).

## DEC-S53-004 — Le mapping `--leading-*` dans `@theme` est conservé bien que mesuré NO-OP
Il ne change **aucune** valeur rendue (le `:root` hors layer du DS gagnait déjà, cf. `PIT-S53-002`). Conservé
pour deux raisons : il explicite le pont DS → Tailwind, et il protège si un futur audit fait entrer ces
`:root` dans un layer — cas où les défauts Tailwind reprendraient la main. Sa justification d'origine
(« sinon `leading-tight` régresse 1.08 → 1.25 ») était **fausse** et a été réécrite dans le code plutôt que
laissée en place : un commentaire faux aurait empoisonné l'audit #340. `--tracking-*` n'est **pas** mappé :
même mécanisme, mêmes valeurs DS déjà gagnantes — l'ajouter serait purement cosmétique.

## DEC-S55-001 — Le smoke Flyway boote le jar au lieu d'invoquer le CLI `flyway migrate`
L'issue #356 demandait « `flyway migrate` + `ddl-auto=validate` ». Retenu : **booter le jar contre une base
vierge**, sans CLI. Justification : `application.properties:25` pose `spring.flyway.enabled=true` et
`application-dev.properties:9` **comme** `-prod.properties:9` posent `ddl-auto=validate` — le démarrage FAIT
déjà migrate puis validate. Un CLI séparé aurait testé un **chemin parallèle**, susceptible de diverger du
chemin réellement emprunté en production. Le libellé de l'issue nommait un outillage ; la propriété à prouver
est « une base vierge produit un schéma qu'Hibernate valide ». Écart assumé, inscrit dans le commentaire du
job. Vérifié : run CI réel vert en 48 s, `attendues 15 | appliquées 15 | première version 1`.

## DEC-S55-002 — Un « Piège connu » du README documentant un bug corrigé se SUPPRIME, il ne se réécrit pas
#376 corrige le healthcheck que le « Piège n° 4 » décrivait. La section est supprimée et le renvoi de
`README.md:76-79` réécrit ; l'explication technique (« pourquoi 127.0.0.1 ») migre en commentaire dans
`docker-compose.yml`. Motif : « Pièges connus » s'adresse à l'utilisateur qui démarre la pile — un piège
résolu n'y a plus sa place et rend le README menteur ; le « pourquoi » s'adresse au mainteneur qui éditerait
le YAML, et c'est **là** qu'il empêche la régression. Contrôle associé : vérifier qu'aucun renvoi n'est
orphelin et que la numérotation reste continue (ici 1-3, n° 4 était la dernière).

## DEC-S55-003 — `e2e` rendu requis sur `dev` ; `flyway-smoke` NON
Arbitrage du développeur (#361, 2026-07-30) après constat de **2 runs consécutifs 100% verts** : checks
requis `dev` = `backend, frontend, e2e`. `flyway-smoke`, livré le même sprint, reste **non requis** — 2 runs
verts seulement, tous deux sur la même PR : le rendre requis reproduirait le risque que #361 documente.
Commande retenue : `PATCH` sur `…/protection/required_status_checks` et **non** le `PUT` global que
documentait l'en-tête de `ci.yml` — le `PUT` réécrit toute la protection et aurait écrasé `enforce_admins`
et les reviews au passage. Vérifié après coup : `enforce_admins: true` et reviews `0` inchangés.

## DEC-S56-001 — En-tête de lane : gouttière de piste, et surtout PAS `pointer-events:none`
S56 #392. L'en-tête sticky opaque recouvrait les 168 px (`--lane-header-w`) de tête du viewport ; aux zooms
**Trimestre (150 px) et Année (66 px)** le 1er événement naissait dessous. L'option tentante — neutraliser
l'en-tête aux pointeurs — était **fausse**, mais pas pour la raison que dit l'artefact de #392. **Vérifié dans
le CSS au moment de la clôture :** `.mt-tlv__lane-label` porte **déjà** `pointer-events:none`, et ce depuis
`c46c936` (vue Timeline desktop, #55) ; c'est la variante `.mt-tlv__lane-head` — le bouton d'accordéon produit
(#195) — qui **réactive** `pointer-events:auto`. La neutralisation « restante » à faire aurait donc porté sur
ce bouton, échangeant ce bug contre la perte du repli de lane, **avec un test vert**. Retenu :
réserver une gouttière de `--lane-header-w` en tête de rail et y décaler tout le contenu positionné — aucune
capture de pointeur touchée, offset en px donc **indépendant de l'échelle px/jour**. `margin-left` et non
`padding-left` : les éléments décalés sont `position:absolute` et `left` se résout sur la boîte de padding.
Écarté aussi : un `padDays` fonction du zoom, qui aurait fait de `rangeStart` une variable du zoom et défait
l'optimisation de mémoïsation #349. Conséquence assumée : deux repères nommés, **PISTE** et **RAIL**.

## DEC-S56-002 — `#3B62D4` (`--evt-cobalt`) plutôt que le `#4f46e5` suggéré par l'issue
S56 #393. Les deux passent AA (mesurés : 6,288:1 et 5,407:1 contre 4,467:1 pour l'ancien `#6366f1`). Retenu
`#3B62D4` parce qu'il appartient à la **palette event curated 12 tons du DS Graphite**, alors que `#4f46e5`
est un indigo Tailwind : le projet a déjà purgé ses indigos/violets hors palette (`landing.css` +
`landing-palette.test.ts` qui garde cette purge), le reprendre **rouvrait exactement cette dette**. Bonus :
teinte voisine de l'ancienne, donc décalage visuel minime sur les événements existants sans couleur.
Confirmation indépendante : `EventPill.test.tsx` utilisait déjà `#3B62D4` comme échantillon canonique
« contraste OK dedans » **avant** cette issue. Arbitrage produit tranché par le développeur au démarrage :
teinte conforme AA, et non « libellé hors pastille assumé ».

## DEC-S56-003 — Branche morte supprimée plutôt que testid renommé ; `app-shell-loading` canonique
S56 #391, tranché par le développeur. Renommer `timeline-loading` aurait produit **deux éléments portant le
même testid**. La branche est donc supprimée, avec son test — `app-shell-loading` devient le testid canonique
unique du chargement de session. Conservés explicitement : la garde `if (!user) return null`
(defense-in-depth) et `timeline-data-loading` (testid différent, lui atteignable). Cf. [[PIT-S56-001]].

## DEC-S57-001 — La logique de comparaison du garde-fou vit dans le fichier de test, pas dans le module
`auth-guard-paths.ts` est importé par le **middleware Edge** : il doit rester minimal et pur. Le scan
filesystem et la comparaison (#318) sont de l'outillage de test, pas du runtime — ils vivent donc dans
`auth-guard-paths.test.ts`. Le module ne gagne que 6 lignes de JSDoc documentant le lien avec le garde-fou
et l'exigence de déclaration en minuscules. Corollaire : le garde-fou ne peut pas être invoqué au build ;
c'est un test de non-régression, pas une génération de liste (l'issue #318 mentionnait cette alternative).

## DEC-S57-002 — Un seul `<h1>` « Réglages » rendu à tous les paliers
L'arbitrage `ui-design` de #299 était contradictoire sur ce point : la section CHROME exigeait de **garder**
le `<h1>`, la section PALIERS annonçait que « le header `lg:hidden` disparaît » — appliquées ensemble, elles
imposaient **2 `<h1>`** dans le DOM. Arbitrage retenu par l'implémentation : **CHROME est normative,
PALIERS est descriptive**. Seul `settings-back` est `lg:hidden`, pas tout le header. Règle générale à
reprendre : quand un arbitrage designer se contredit, la section qui décrit le **contrat** prime sur celle
qui décrit l'**apparence attendue**, et l'écart doit être remonté (il l'a été, en `[MEMORY:decision]`).

## DEC-S57-003 — Cohésion 0.22 assumée : ne pas déporter #312 pour redresser une métrique
Le sprint 57 affichait une cohésion de 0.22, sous le seuil de 0.3, et sortir #312 (`/me` → 401) l'aurait
remontée à 0.31. Décision : **garder #312**. Le critère de sortie du MVP dit littéralement « sans erreur
500 », ce 500 était le seul prouvé dans le code sur 104 candidates auditées, et il coûtait 1 point. Le
déporter aurait été un re-scope silencieux déguisé en amélioration de métrique. La cohésion mesure la
proximité de domaine, pas la valeur livrée — elle informe le découpage, elle ne le commande pas.


## DEC-S58-001 — Le contour du DS est l'unique indicateur de focus, et rien au niveau du site
Après #383, `:focus-visible` vit dans `@layer base` et aucun composant ne pose d'utilitaire de focus — ni
`outline-none`/`outline-hidden`, ni `ring-*`. Un anneau conservé à côté du contour ferait **deux indicateurs
concentriques**, motif absent de la charte. Deux alternatives ont été mesurées et **rejetées** :
`--shadow-focus` (`accent-soft`) plafonne à **1,23:1 clair / 1,19:1 sombre**, soit 2,5× sous WCAG 1.4.11 —
c'est un halo, pas un indicateur ; et `ring-*` est un `box-shadow` dont le `ring-offset` peint une bande
**opaque** dont la couleur initiale compilée est `#fff`, donc un liseré blanc en mode sombre, là où
`outline-offset` est transparent. Seule exception du dépôt : `ui/popover.tsx` garde son `outline-hidden`
(panneau, pas contrôle). Écriture imposée : **`outline-hidden`, jamais `outline-none`** — seul le premier
émet le fallback `@media (forced-colors: active)`.

## DEC-S58-002 — `surface-2` est la 5ᵉ surface du DS, et la plus serrée
Les ratios versionnés du tier `rule-emphasis` couvraient 4 couples (`bg`/`surface` × clair/sombre). Les
toolbars de la frise vivent sur **`surface-2`**, absent de cet inventaire. Mesuré au pixel en S58 :
**3,70:1 en clair / 4,10:1 en sombre**, et jusqu'à **3,19:1** sur un bouton circulaire (anti-crénelage).
Au-dessus des 3:1, mais avec la marge la plus étroite du DS. Consigné dans `ds/readme.md` : toute future
migration vers ce tier sur `surface-2` doit être **mesurée**, pas déduite du token.

## DEC-S58-003 — Checkbox : aligner le composant applicatif, conserver le spécimen du DS
`.mt-check__box` n'a aucun consommateur applicatif, la checkbox réelle est `ui/checkbox.tsx` (shadcn). Deux
options s'offraient : aligner le composant sur `rule-emphasis`, ou supprimer la règle morte. **Option (a)
retenue.** Supprimer `.mt-check__box` aurait retiré la seule entrée que `control-border-tier.test.ts`
surveille pour ce contrôle — le test ne lit que du CSS, la bordure de `checkbox.tsx` est une utilitaire
Tailwind dans du TSX : on aurait échangé une règle **morte mais gardée** contre un contrôle **vivant et non
gardé**. Et `.mt-radio__dot` / `.mt-switch__track`, ses jumeaux, sont **en production**. ⚠ **RECTIFIÉ AU S62 (#415)** : affirmation **fausse pour `.mt-radio__dot`**. Vérifié par grep des appelants — `<Radio>` n'a **aucun consommateur applicatif** (seul `ui/radio.stories.tsx`), il est donc dans le même statut que `.mt-check__box`. Seul `<Switch>` est réellement monté, **une fois**, dans `EventEditForm.tsx:624`. La même erreur figurait dans `core.css` (« two production twins »), corrigée au commit `251684d`. Voir [[BUG-S62-001]]. Contraste :
`border-primary` (encre pure, 17,32:1) → `rule-emphasis` (4,07:1) — baisse assumée, prescrite par la charte,
qui rétablit la hiérarchie « bordure plus discrète que le texte ».

## DEC-S58-004 — Un `<tr>` focalisable rogné par `overflow-x-auto` : ne rien changer
`ProductsListView` porte un `<tr role="link" tabIndex={0}>` dans une table `border-collapse`, cas où le
rendu d'`outline` est réputé dépendre du moteur. Mesuré (Chromium 149 + Firefox 151, clair et sombre,
lecture de pixel) : le contour **est peint**, 5,93:1 / 6,94:1 ; seules les verticales sont rognées, **par le
conteneur `div.overflow-x-auto`**, pas par un défaut de peinture. Décision : **ne rien changer**. Les
horizontales suffisent à signaler la ligne ; un `ring-*` est un `box-shadow` rogné à l'identique et interdit
par [[DEC-S58-001]] ; un `outline-offset` négatif poserait le trait sur le `border-b` de la ligne.

## DEC-S59-001 — Wordmark à palier unique : `text-md sm:text-lg`, header ET footer
Le logo du header héritait `md:text-3xl` = **57 px**, imposant un header de **184,8 px** de haut et **0 px de
marge à 1024 px dans 3 locales sur 4**. Le JSDoc du composant chiffrait déjà ce palier à 234 px sur 2 lignes
(328 px sans retour à la ligne) — un vestige que personne n'avait regardé rendu. Décision : **21 / 27 px,
`whitespace-nowrap` à tous les paliers**, et `space-x-8` de la nav **intouchée** (resserrer la nav
n'achetait que 16-32 px pour un coût d'espacement interactif, alors que le hors-norme était le 57 px). Le
wordmark du **footer** suit la même échelle : c'est le même wordmark. Mesuré après : marges 58,5 à 146,5 px.

## DEC-S59-002 — Ne PAS ajouter `--text-4xl`/`--text-5xl` au DS ; supprimer l'unique site hors échelle
`HeroSection.tsx:59` était le **seul** site `4xl`/`5xl` du dépôt, et ces tokens n'existent pas dans
`typography.css`. Deux voies : prolonger l'échelle ~1,27 (→ 72/92 px) ou ramener le `h1` dans l'échelle.
Retenu : **ramener le h1** (`text-xl md:text-2xl lg:text-3xl` = 35/45/57), `typography.css` inchangé.
Motif décisif : créer 2 tokens pour 1 seul usage est disproportionné, tandis que supprimer ce site rend
l'invariant « never Tailwind-default » de l'en-tête du fichier **vrai à l'échelle du dépôt**. Cf.
[[PIT-S59-003]].

## Sprint 60 — gitleaks plutôt que trufflehog, et binaire épinglé plutôt qu'action officielle

`docs/memory/audits/secret-exposure-audit.md` §R6 laissait les deux outils ouverts. Retenu :
**gitleaks 8.30.1**. Motif décisif : son **mécanisme d'exclusion à deux étages** —
`.gitleaksignore` (empreinte incluant le SHA du commit, donc ne couvre qu'un commit immuable) pour
l'historique déjà exposé, et `.gitleaks.toml` (scopé chemin + nom de clé) pour les valeurs jetables
encore au HEAD. C'est exactement ce qu'exige la situation : l'historique compromis doit être
baseliné **sans** blanchir les fichiers pour l'avenir.

**Binaire téléchargé et vérifié par SHA-256**, pas `gitleaks/gitleaks-action@v2` : l'action exige
`GITLEAKS_LICENSE` pour les organisations, et ce dépôt n'a **aucun secret GitHub Actions**. Une
solution dépendant d'un secret aurait été inapplicable ici.

**Job dédié, pas une étape de `security`** : ce dernier mêle du bloquant et du `continue-on-error`,
et le scan exige `fetch-depth: 0`. Garder le signal lisible séparément était tout l'objet du sprint.

## Sprint 60 — un garde-fou de diagnostic ne doit jamais devenir une cause d'échec

Le préflight `node_modules` de `scripts/test-quiet.sh` (#308) **ne bloque pas sur son propre
échec** : si la sonde Node sort en erreur, il avertit sur `stderr` et laisse Vitest tourner. Il
n'échoue (exit 3) que sur un diagnostic **positif** — répertoire absent, vide, ou paquet non
résolvable. Motif : un outil ajouté pour rendre un échec lisible qui deviendrait lui-même une
nouvelle source de rouge serait désactivé au premier faux positif, et emporterait le bénéfice avec
lui.

## Sprint 61 — un événement archivé reste atteignable (option A, #307)

Le dev a tranché : plutôt qu'acter l'archivage comme définitif côté interface (option B, écartée), la vue détail
produit expose un **état de vue** `'active' | 'archived' | 'all'` en remplacement du filtre `!archived` codé en
dur. En vue « archivés » l'événement revient dans la frise, donc `TimelineEditHost` le rouvre **pré-rempli** sans
qu'on touche ni à la frise ni au formulaire ; le désarchivage vit dans l'historique (PATCH minimal
`{archived, version}`, 409 déterministe). Le compteur d'actifs (BR-EVE-011) reste calculé sur `!archived`
**indépendamment du filtre** — c'était le risque de régression principal, couvert par un test dédié et un E2E.

## Sprint 61 — le verrou de champs passe par `disabled` DOM, jamais par l'option RHF (#230)

L'option `disabled` de react-hook-form met la valeur à `undefined`, ce qui **viderait les dates du payload PATCH**
et ferait échouer les gardes BR-EVE-006/016. Le verrou est donc posé sur le nœud DOM, avec une note
`role="note"` liée en `aria-describedby`. Toggle et submit restent actifs : freiner le désarchivage enfermerait
l'utilisateur dans l'état archivé.

## Sprint 61 — les décisions d'accessibilité portent sur la couleur RENDUE, pas la couleur source

Corrige la décision initiale de #230 (« `grayscale` préserve le contraste »), fausse — cf. [[PIT-S61-003]].
`grayscaleHex` réplique le filtre CSS en gamma-encodé ; `renderedEventColor(color, archived)` donne le fond
réellement peint ; l'encre **et** le garde-fou `eventLabelReadableInside` sont calculés sur ce couple, et
consommés par les 3 surfaces de frise (desktop + mobile portrait + paysage — les deux dernières n'avaient
**aucun** repli auparavant). Résultat mesuré : 8,6 % de couleurs en échec AA après grisage ramenées à 1,5 %, qui
déclenchent désormais le repli « libellé à l'extérieur ».

## Sprint 61 — aucun texte d'interface ne promet un quota qui n'existe pas

La confirmation d'archivage annonçait « libérera d'autant ton quota d'événements » dans les 4 locales. BR-EVE-011
est une **anticipation** : `PlanPolicy.canCreateEvent` est un no-op, aucun endpoint n'expose de plafond, aucune
autre surface n'affiche de tier. Règle retenue : formuler l'**effet** vérifiable (« ne comptera plus parmi tes
événements actifs ») et ne jamais évoquer une limite tant qu'elle n'est pas réellement appliquée et exposée.

## Sprint 61 — la suppression reste possible sur un événement archivé (arbitrage dev, clôture S61)

Le critère d'acceptation de #230 disait « seul le désarchivage reste possible » quand `archived=true`.
#230 a livré le verrou de champs mais a **laissé la suppression active**, en signalant l'écart sans
l'arbitrer. Arbitrage du dev à la clôture : **on garde la suppression active**. L'interdire
empêcherait purement et simplement de supprimer un événement archivé — l'utilisateur serait obligé de
le désarchiver d'abord, donc de le faire repasser dans ses événements actifs, pour pouvoir s'en
débarrasser. Le critère d'acceptation est donc corrigé : le verrou porte sur l'**édition** des champs,
pas sur les actions de cycle de vie (désarchiver, supprimer).

## DEC-S62-001 — `<html>`/`<body>` descendus sous `[locale]`, et le prix assumé
Trois voies pour localiser `lang` (WCAG 3.1.1) : descendre le document sous `[locale]` ; lire un header posé par le middleware ; poser `document.documentElement.lang` côté client. **Voie (a) retenue** — seule à conserver le SSG **et** produire un `lang` correct dès le HTML SSR (vérifié en `curl`, sans JS, sur les 4 locales). `headers()` aurait basculé les 52 routes en rendu dynamique ; la rustine client laissait le HTML **servi** à `fr`, donc WCAG non satisfait. Prix payé, connu à l'avance : `app/error.tsx` devient `app/global-error.tsx`, et le layout racine transparent casse la 404 ([[PIT-S62-005]]), réparée par [[PAT-S62-002]]. Issue rebadgée `size:S` → `size:M` — le « correctif d'une balise » annoncé n'existait pas. (Sprint 62 #413)

## DEC-S62-002 — Le `<title>` de la 404 reste non localisé, pour ne pas sacrifier le SSG
`metadata` est résolue au build, côté serveur, sur une page statique **unique** servie pour les 4 locales : ni `params`, ni URL, et `generateMetadata()` n'a pas davantage accès à la locale. Localiser imposait `headers()`, donc la sortie de `/_not-found` du décompte `Generating static pages (52/52)`. **Retenu : `'Ma Timeline'`**, exactement ce qu'il y avait avant le sprint. Le HTML servi de la 404 reste également `lang="fr"` pour les 4 locales — **ce n'est pas une régression** : avant ce sprint, *toutes* les pages étaient `lang="fr"`. La 404 est la seule route que #413 n'améliore pas. Même raisonnement pour son thème : elle rend toujours en clair, son `<html>` étant hors `ThemeProvider`, et il n'existe **aucun cookie de thème** (next-themes est en `localStorage`, illisible au prérendu) — documenté plutôt que contourné. (Sprint 62 #413)

## DEC-S62-003 — Un verdict négatif proprement établi est un livrable
#414 annonçait que les options de `Select` n'obtiennent jamais `:focus-visible` sous Firefox. Mesuré au pixel peint, Firefox 153 **et** Chromium, clavier seul, clair et sombre : `:focus-visible` est obtenu et le contour vaut **6,08:1 / 6,48:1**. Les 1,23:1 / 1,19:1 de #383 sont reproduits **exactement** — mais ils mesurent la **surface de survol**, pas l'indicateur, qui est bien peint (bande `--color-focus` à +3/+4 px). **Aucun code applicatif n'a été touché** : un indicateur `data-[highlighted]:` aurait dédoublé le motif en violation de [[DEC-S58-001]], pour un défaut inexistant. Livrable retenu : la spec de verdict, avec **garde-fou bidirectionnel** (rougit si le contour disparaît **et** si la surface dépasse 3:1, signe d'un token modifié), plus un projet Playwright `firefox` **restreint par `testMatch`** à cette seule spec — les 174 E2E existantes n'ont jamais vu Gecko et les y exposer d'un coup transformerait le sprint en chasse aux faux positifs. **Réserve assumée** : la mesure porte sur Firefox **153**, #383 mesurait **151**, non épinglable avec ce harnais. (Sprint 62 #414)

## DEC-S62-004 — Le contour du DS est porté sur la sœur visible, aucun token n'est modifié
#415 proposait de retoucher `--shadow-focus` ou de redimensionner l'`<input>` masqué. **Ni l'un ni l'autre** : `outline: 2px solid var(--color-focus); outline-offset: 2px` remplace le `box-shadow` sur `.mt-check__box` / `.mt-radio__dot` / `.mt-switch__track` — même traitement que `.mt-btn`, `.mt-iconbtn`, `.mt-select__trigger`, `.mt-tab. C'est **le même indicateur déplacé, pas un second motif** ([[DEC-S58-001]]). Blast radius mesuré, et **inverse de ce que redoutait l'issue** : `--shadow-focus` n'a que 5 sites, tous dans `core.css`, sans consommateur TSX hors radio/switch ; `--color-accent-soft` en a 9+ hors focus (`::selection`, `button.tsx`, `dropdown-menu.tsx` ×4, `select.tsx`, `landing.css`, `AvatarUpload.tsx`) — **intouchable**. Résultat : 1,23:1 → **6,08:1** en clair, 1,19:1 → **6,48:1** en sombre, mesuré au pixel avec baseline rouge établie avant correctif. (Sprint 62 #415)

## DEC-S63-001 — Plancher `MIN_GAP_PX` unique à 10 px, non différencié par largeur
`landing-header-logo.spec.ts` couvre 8 largeurs × 4 locales ; le plancher passe de `width < 768 ? 1 : 24` à `width < 768 ? 10 : 24`. **Aucune différenciation** par largeur, alors que le plan la redoutait nécessaire : la mesure montre **38 px au pire** à 375/390 px, ~4× le plancher. Différencier n'aurait servi qu'à masquer un cas tendu — ce que [[DEC-S52-004]] interdit. Marge `de` à 320 px : **5 → 13 px**. (Sprint 63 #423)

## DEC-S63-002 — Namespaces i18n : chemin pointé, ni re-préfixage ni extraction
Trois voies possibles ; l'issue et l'analyse préalable n'en voyaient que deux. Retenu : **chemin pointé** `common.deleteDialog` — convention dominante du dépôt, **0 appel `t()` re-préfixé** (donc clés dynamiques intactes), **0 fichier de locale touché** (donc aucun conflit avec l'issue voisine). Écartés : `common` re-préfixé (~27 `t()` à réécrire, un oubli reproduit exactement le symptôme) ; extraction en fichiers dédiés (8 fichiers de locale, clés orphelines). Le correctif fait **1 ligne par composant** ; le vrai livrable est la garde de dépôt `i18n-namespaces.test.ts`. (Sprint 63 #441)

## DEC-S63-003 — `ADR-008` : deux natures de popover dans l'échelle `z` du DS
Nouveau palier **`--z-popover-over-modal: 75`**, entre `--z-modal` (70) et `--z-netbanner` (80), appliqué aux **3 overlays Radix portalisés dans `body`** (`select`, `popover`, `dropdown-menu`). `--z-popover` (50) reste inchangé pour les popovers **en flux**, qui doivent rester sous les modales. **Rejeté** : remonter `--z-popover` (casse 3 popovers en flux) ; portaliser `NewEventDrawer` (déplace le défaut vers le focus-trap et les animations). Règle générale : **tout overlay portalisé dans `body` doit vivre au-dessus du palier modal** ; à `z` égal il ne « marche » que par l'ordre du DOM, ce qui n'est pas un invariant. (Sprint 63 #446)

## DEC-S63-004 — Une spec d'audit se conserve ARMÉE, pas en constat
`sprint-63-de-overflow-audit.spec.ts` est conservée avec son assertion `expectNoPageOverflow` active et **vue rouge par contrôle négatif** (ancien `className` du footer remis). Le raisonnement est le même que pour toutes les gardes du sprint : « un verrou qui ne peut pas rougir est un décor ». Corollaire assumé : la spec **n'était pas encore dans la CI** au moment de l'audit — une garde hors CI ne protège rien. (Sprint 63 #74)

## DEC-S64-001 — `workers: 1` en local pour l'E2E, assumé comme PARADE et non comme correctif
Seule valeur mesurée où un run local complet est **interprétable** : 230 passed / 1 failed en 9,0 min, 0 `ECONNREFUSED` (et 229/2 en 6,8 min à la re-mesure sur le chemin par défaut). 2 workers satisfaisait l'oracle mais rouvrait `PIT-S64-003`. **La cause racine de la mort de `next dev` n'est pas connue** — c'est écrit dans le fichier, avec l'interdiction d'abaisser la valeur une fois de plus en silence si le symptôme revient. Aligne aussi le local sur le `--workers=1` du runbook S47 que `test-quiet.sh e2e` contournait (`PIT-S49-006`). (Sprint 64 #465)

## DEC-S64-002 — Deux serveurs de production sur deux ports, plutôt qu'un kill/relance entre les passes
Choix dicté par le **mode d'échec**, pas par l'élégance : un `kill` raté laisse la passe 2 tourner sur le serveur dégradé, **verte et vide** ; un `:3001` absent donne une connexion refusée, bruyante et immédiate. On échange une panne silencieuse contre une panne visible. Un seul `next build` suffit : seuls les process diffèrent, pas les artefacts. (Sprint 64 #462)
> ⚠️ **MAJ Sprint 68 (#358)** : ce qui distingue les deux process n'est plus `AUTH_JWT_PUBLIC_KEY` (supprimée) mais la présence d'`AUTH_JWKS_URL` sur `:3001` — le serveur vérifiant découvre la clé via le JWKS du backend. Le raisonnement « deux ports plutôt qu'un kill/relance » est inchangé. Cf. [[DEC-S68-001]].

## DEC-S64-003 — `if-no-files-found: warn` sur l'upload d'artefact Playwright
Sans lui, un dossier absent fait **rougir le step d'upload** et masque l'échec de test réellement à diagnostiquer — l'inverse du but de #461. (Sprint 64 #461)

## DEC-S64-004 — Deux arbitrages de périmètre pris avant tout développement
(1) **#465 re-scopée** : critère « cause racine identifiée » retiré au profit d'une parade mesurée — une occurrence unique, non reproductible, rendait l'issue non closable (schéma déjà payé aux S62 et S63). (2) **#427 absorbée dans #462** : #462 supprime le `webServer` en CI mais le conserve en local, où le défaut de #427 survit — il y avait déjà fait dérailler les sprints 47, 56 et 57. Sa piste principale (bloc `env` dans `webServer`) est invalidée par `PIT-S58-003` ; seule tient la 2e, l'échec précoce. (Sprint 64)

## DEC-S65-001 — L'horizon temporel ne borne QUE les récurrences sans date de fin explicite
`MAX_UNBOUNDED_EXPANSION_YEARS = 5` s'applique uniquement quand `recurrenceEndDate == null`. Raison **technique**, pas préférence : à 5 ans la série la plus dense (hebdomadaire) fait 261 occurrences, donc appliquer l'horizon partout rendrait `MAX_OCCURRENCES = 4000` **inatteignable, donc mort** — ce qu'interdit la consigne « en complément, pas en remplacement ». Effet de bord assumé : un PATCH posant une borne lointaine peut encore atteindre 4000 occurrences (~77 ans en hebdomadaire), mais c'est alors une **intention explicite** de l'utilisateur, pas le défaut silencieux visé par #452. Décision produit associée (dev, 2026-09-02) : borne backend SEULE, `recurrenceEndDate` reste hors du DTO de création — BR-EVE-012 **complétée, pas modifiée**. (Sprint 65 #452)

## DEC-S65-002 — L'identité de run E2E passe par l'ENVIRONNEMENT, pas par un fichier
La graine `E2E_RUN_ID` est posée par `global-setup.ts` dans le process principal **avant le fork des workers**, et héritée à l'identique (Playwright forke avec `{ ...process.env }`) ; les identités sont ensuite résolues **paresseusement**. Pourquoi pas la relecture de `.auth/accounts.json`, piste principale de l'issue : le projet `setup` est lui-même `fullyParallel`, donc **le process qui persiste le fichier n'est pas celui qui enregistre les comptes** — la divergence naît AVANT l'écriture, aucune relecture ne la répare. Complété par un **verrou de run** qui refuse une seconde campagne concurrente au lieu de laisser deux runs se corrompre. `workers: 2` en local, **1 en CI** : le parallélisme n'y est pas démontré (un seul runner/IP, budget `register` au plafond). (Sprint 65 #469)

## DEC-S65-003 — Pas de migration de purge : les données existantes sont bornées PAR LE CODE
Une migration V16 supprimant les récurrences sans date de fin a été écrite puis **retirée** avant la PR. L'expansion étant calculée **à la lecture** (`RecurrenceExpansionServiceImpl:48-51`) et aucune table d'occurrences n'étant matérialisée, les lignes existantes sont **déjà bornées à 5 ans** par #452 — le `DELETE` n'apportait aucun bénéfice fonctionnel, détruisait le tier soft-delete `archived` (#44), et se serait annulé au premier `create` suivant puisque `recurrence_end_date IS NULL` reste l'état NORMAL post-#452. Le critère « traiter les données existantes » est donc tenu par **décision documentée de ne rien faire**. Trace : `docs/memory/sprints/sprint-65/db-expert-review-v16.md`. V16 reste le prochain numéro libre. (Sprint 65 #452)

## DEC-S66-001 — Déclencheur mobile = `<button>` natif 52 px dans le shell, pas le variant `Button size="icon"`
`Button size="icon"` (36 px) était le composant existant le plus proche, mais 36 px est SOUS le minimum tactile WCAG 2.5.5 (44 px) ; passer par le variant aurait exigé d'écraser sa taille avec autant d'utilitaires, pour moins de lisibilité. Décision ui-design (S66, #455) : `<button>` natif `h-13 w-13` (token `--space-13`), `rounded-xl` (pas de pill, réservé), `z-10` = `--z-sticky` (pas de token `--z-fab`), ancré dans `AppShell` parce que le shell est le seul point commun aux 4 écrans du groupe `(app)` — sous `lg`, seul le dashboard porte une chrome mobile.

## DEC-S66-002 — Le slot `footer` de `BottomSheet` (Réglages) est exposé mais NON câblé par `AccountSection`
Le critère d'acceptation de #79 demandait `onKeyboardShow`/`onKeyboardHide` + un pied sticky sur les sheets concernées. Le slot est livré sur `BottomSheetProps`, mais les boutons de la suppression de compte vivent dans `DeleteAccountSteps`, partagé avec le Dialog desktop (BR-AUT-001) : y porter le mécanisme de portail pour 2 boutons ne se justifiait pas. Conséquence assumée et consignée : `footer` est une prop SANS appelant de production (cf. PIT-S61-006 — un symbole livré n'est pas une fonctionnalité livrée). Follow-up : câbler ou retirer.

## DEC-S67-001 — L'étape `npm audit` dev+prod de la CI reste INFORMATIVE, malgré un audit descendu à 0
`.github/workflows/ci.yml` prévoyait explicitement de « refusionner les deux étapes en un seul `npm audit --audit-level=high` bloquant » dès que la chaîne eslint serait corrigeable. Cette condition est remplie au S67 (audit dev+prod = 0). **Refusion écartée** par arbitrage dev du 2026-09-03 : la prochaine CVE publiée dans une devDependency bloquerait alors TOUS les merges vers `dev` jusqu'à correction — or 5 des 8 entrées résorbées ce sprint sont apparues depuis le S60, la fréquence est réelle. La baseline informative étant désormais verte, un rouge y redevient un signal exploitable sans coût de blocage : c'est l'objectif que #438 poursuivait (« plutôt que de laisser un signal rouge permanent qui n'appelle plus d'action »). Même logique que le job `security` réparé au S60. Modification de `ci.yml` = pipeline CI → confirmation explicite du dev demandée et obtenue avant écriture.

## DEC-S67-002 — Documenter un `overrides` npm : clé `_overridesRationale` dans `package.json` + section README
`package.json` n'accepte pas de commentaires JSON, et un override load-bearing supprimé par un futur « nettoyage des dépendances » casse la CI sans que rien n'explique pourquoi il existait. Décision : doubler la documentation — une clé `_overridesRationale` **au contact de la déclaration** (c'est `package.json` que lit un nettoyage de deps, pas le README), et une section `## Overrides npm — ne pas supprimer` dans `frontend/README.md` portant le détail et la recette de reproduction, trop longue pour du JSON. npm ignore les clés inconnues de haut niveau ; build, lint et prettier restent verts.

## DEC-S68-001 — JWKS = seule source de la clé publique de vérification, aucun repli sur variable d'environnement
#358 fait découvrir au middleware Next la clé publique RS256 sur le JWKS du backend (`AUTH_JWKS_URL`) au lieu de la lire dans `AUTH_JWT_PUBLIC_KEY`. Arbitrage explicite du dev : PAS de repli sur la variable si le JWKS est injoignable. Motif : un repli conserverait DEUX sources de vérité, donc exactement le cas « paire dépareillée » que l'issue prétend éliminer, et maintiendrait la copie manuelle dans les runbooks. Conséquences assumées : `AUTH_JWT_PUBLIC_KEY` supprimée du middleware, des deux `.env.example`, de `docker-compose.yml`, des runbooks et de l'ADR-004 ; le chemin « variable illisible » (et l'issue #363 qui voulait le couvrir en E2E) disparaît par construction. Le contrat de DÉGRADÉ reste inchangé et fail-OPEN : JWKS indisponible ⇒ garde « présence seule » (comme avant sans variable), `JwtFilter` restant le seul juge. Les deux avertissements one-shot de production sont RECIBLÉS sur les nouveaux modes de panne (URL absente / JWKS injoignable), pas supprimés. ⚠ `AUTH_JWT_PUBLIC_KEY` subsiste UNIQUEMENT sur le process de test E2E (forge HS256 + vérif RS256 dans `rs256.ts`), plus jamais lue par un serveur.

## DEC-S69-001 — Exposer le flag `capped` par un endpoint de prévisualisation dédié, pas en élargissant `EventResponse`
#439 offrait deux contrats pour rendre `capped` (troncature d'une expansion de récurrence) accessible au client : Option 1 = champ `seriesInfo` dans `EventResponse` (POST/PATCH/GET), Option 2 = `POST /api/events/recurrence-preview` dédié. **Option 2 retenue** par arbitrage dev du 2026-09-03, AVANT toute implémentation (l'issue l'exigeait). Motif décisif : #67 demande un hint **live** — « le hint disparaît dès que l'utilisateur renseigne une `recurrenceEndDate` qui ramène le compte sous 4000 » — or l'Option 1 ne rend `capped` qu'APRÈS soumission de la mutation, elle ne peut donc pas piloter un feedback pendant l'édition. Motifs secondaires : l'Option 1 élargit un DTO partagé par de nombreux consommateurs (risque de régression sur ses tests de contrat) et impose un recalcul d'expansion à chaque `GET`. Conséquences : `EventResponse.java` et `EventController.java` restent INTACTS (controller séparé `RecurrencePreviewController` injectant le seul port `RecurrenceExpansionService`, donc aucun paramètre ajouté au constructeur d'`EventController` et aucun de ses tests impacté) ; le typage frontend porte sur le contrat preview seul, pas sur `EventResponse`.

## DEC-S70-001 — Pas de `max-height` sur le bandeau d'aperçu épinglé : un plafond serait spéculatif
#326 sort l'aperçu du corps défilant du drawer de création : il consomme donc de la hauteur en permanence, et la tentation est de le plafonner. **Écarté sur mesure** : au format de référence (drawer 1280×700), le bandeau occupe **29,6 %** de la hauteur en thème clair et **26,8 %** en sombre, laissant **418 px** au corps défilant. Poser un `max-height` reviendrait à choisir un seuil sans cas d'usage qui le motive, et à introduire un second conteneur défilant (l'aperçu lui-même) pour un contenu qui tient. Réserve assumée : **non mesuré sous 700 px de hauteur desktop** — si un écart court fait mal, c'est là qu'il apparaîtra, et la décision sera à rouvrir avec la mesure correspondante.

## DEC-S70-002 — Preuve de lecture du contexte : ligne `fichiers de contexte lus` auditable, plutôt que recopie intégrale des packs
Le S69 s'était clos sur une question ouverte : les `Agent.prompt` étant des variantes compactes qui **pointent** les archives lourdes (`pit-frontend.md`, 90 Ko) au lieu de les recopier, il était « impossible de prouver que l'agent a ouvert l'archive » — d'où l'alternative laissée en suspens : « soit accepter le coût de la recopie intégrale, soit ajouter au livrable une ligne *fichiers de contexte lus* que le lead peut auditer ». **La seconde branche est retenue au S70** : chaque briefing exige la liste des chemins réellement ouverts **avec un ancrage vérifiable par fichier** (identifiant de pitfall, numéro de ligne, ou citation courte). Motif : la recopie ferait transiter ~70 K tokens deux fois par le contexte du lead (lecture + ré-émission) et une reproduction verbatim de cette taille est elle-même une source d'erreur de transcription. **Résultat mesuré sur 3 spawns** : le protocole a produit un aveu explicite (vague 1, 2 sections non ouvertes) que le S69 n'aurait pas pu détecter, et deux relevés d'ancrage exacts. Limite reconnue : le pointeur reste non contraignant techniquement, la ligne dépend de l'honnêteté de l'agent — mais un aveu est exploitable, contrairement à une preuve indirecte. Corollaire découvert au passage : `rules-jit/frontend.md` injecté par `build-briefing.sh` est un **placeholder générique EdelWheels/Quarkus** (bandeau « À RÉGÉNÉRER par /ai-env:setup ») dont la consigne de test contredit le runbook du projet — une lacune de lecture sur CE fichier est donc sans gravité, et le fichier lui-même devrait être régénéré.

## DEC-S71-001 — 409 d'unicité de username : STATUT conservé, CORPS neutralisé
Le corps « username already taken » de `PATCH /api/me` confirmait l'existence d'un compte tiers. Passer en 422 aurait cassé les 2 surfaces frontend (`ProfileSection.tsx`, `register/page.tsx`) **sans supprimer l'oracle**, qui vient du statut. Retenu : garder 409 et neutraliser le corps sur le code générique `conflict`, strictement identique au 409 de `register` (déjà neutralisé au #288). L'oracle par statut est un **arbitrage produit assumé**, atténué par le rate-limit `PATCH /api/me` 10/min/IP, pas supprimé. Libellés i18n `usernameTaken` conservés : le statut étant maintenu, changer le texte dégraderait l'UX sans gain. (Sprint 71 #134)

## DEC-S71-002 — Politique de mot de passe : le backend est la source de vérité, Zod la RÉPLIQUE
La règle vivait en 4 exemplaires divergents (form register min 6 + complexité, form reset min 6, backend min 6 nu). Retenu : une annotation `@StrongPassword` (8..100 + majuscule + chiffre) posée sur les 3 DTOs de création/modification, et une constante `PASSWORD_POLICY` exportée que Zod consomme au lieu de redéfinir la règle. Motif : une règle exprimée quatre fois diverge en silence ; une annotation partagée + une constante rendent la divergence structurellement difficile à réintroduire. Périmètre borné par BR-AUT-003 : `AuthRequest` (login) et `oldPassword` restent **hors politique**, sinon les comptes antérieurs sont verrouillés ou empêchés de se mettre en conformité. (Sprint 71 #148)

## DEC-S71-003 — Une contrainte transverse qui ne vit qu'en commentaire est promue en BR, pas supprimée
Le débounce 150 ms de l'aperçu live était documenté en commentaire, sous un identifiant `BR-*` **faux** ([[PIT-S70-001]]). Deux issues possibles : retirer le renvoi, ou créer la règle. Retenu : créer **BR-EVE-017**, parce que la contrainte est transverse à ≥2 composants et qu'**aucun test ne la protège** — rebrancher l'aperçu sur `form.watch()` brut ne rend rien rouge. Une BR est le seul endroit où la contrainte survit à la relecture ; un test dédié reste à écrire (follow-up ouvert). (Sprint 71 #496)

## DEC-S71-004 — Doctrine couleur DS : plancher de lisibilité par mélange PROGRESSIF vers l'encre du thème, jamais par repli sur un token neutre
Le repli neutre efface l'identité colorée de **toutes** les couleurs sous le seuil, y compris celles qui n'en sont qu'à un cheveu ; le mélange progressif ne retire que ce qu'il faut pour atteindre 3:1. Portée volontairement limitée aux **traits** (connecteur, contour du fantôme) : les **aplats** gardent la couleur brute, leur encre étant déjà calculée. Croise #352 : le classement « tier fonctionnel » du pointillé est confirmé, et c'est précisément ce qui oblige à le plancher. Résolution de la réserve laissée par [[BUG-S70-001]]. Mesuré indépendamment en navigateur : 44 mesures, minimum 3,06:1, aucune sur-correction de la couleur par défaut. (Sprint 71 #497)

## DEC-S72-001 — Locale de l'email de réinitialisation portée par le DTO, ni colonne DB ni `Accept-Language`
Aucune locale utilisateur n'existe : `User` n'a pas de champ, il n'y a pas de colonne, et le `LanguageSelector` est purement URL. Surtout, `forgot-password` est **non authentifié** — une colonne en base ne serait pas lisible au moment utile. `Accept-Language` a été écarté parce que l'en-tête du navigateur peut diverger de la langue choisie dans l'UI. Retenu : champ `locale` optionnel sur `ForgotPasswordRequest`, alimenté par `useLocale()`, repli `fr` à la sélection du template. Pas de migration. (Sprint 72 #142)

## DEC-S72-002 — `ForgotPasswordRequest.locale` reste SANS contrainte Bean Validation, malgré la review
La review proposait `@Size(max=16)` en défense en profondeur. Refusé : sur un endpoint non authentifié régi par BR-AUT-012, ajouter une contrainte crée un **nouveau chemin 400** pour un champ optionnel — risque de compatibilité client réel, bénéfice nul. L'argument coût CPU ne tient pas : la valeur n'est ni loggée ni concaténée, elle sert de clé de lookup sur 4 tags, la taille du corps est déjà bornée par Spring et le rate-limit 5/min/IP s'applique. La robustesse vient de la **totalité** de `resolve()` (null, vide, casse, `de_AT`, `zz` → FR sans exception), pas de la validation. (Sprint 72 #142)

## DEC-S72-003 — `.mt-date--long` retenue sur les `<time>`, `.mt-date--short` laissée inutilisée
`--short` change la casse ET la taille (`uppercase`, 11px), et son format cible DS « MER 24 JUIN » n'est pas atteignable par CSS seul : le « mer. 24 » rendu vient des options `Intl`, pas du style. Basculer dessus est donc un arbitrage Designer, pas une décision d'implémentation — laissé en follow-up plutôt que forcé. (Sprint 72 #72)

## DEC-S72-004 — Un énoncé d'issue périmé se re-cadre sur l'état réel du code, il ne se déroule pas tel quel
Les deux issues du sprint décrivaient un code qui n'existait plus ou une donnée qui n'a jamais existé : #72 supposait un formatage `dayjs` (déjà migré, `date-fns` à zéro occurrence), #142 supposait une langue utilisateur persistée (aucune). Retenu : reconnaissance de code **avant** rédaction des briefings, périmètres réduits et arbitrages soumis au dev. Sans cela, #72 partait re-auditer ~15 composants déjà conformes et #142 aurait pu produire une migration inutile. Généralise [[issue-prerequis-grep-appelants]]. (Sprint 72)

## DEC-S73-001 — L'invariant « exactement une sortie » de `settings-breakpoints` est affaibli en « au moins une », volontairement
Le spec posait « sous `lg` la sidebar est masquée, `settings-back` est la SEULE sortie ». #298 a déplacé le palier de la sidebar à `md` sans toucher `settings-back` (resté `lg:hidden`) : entre 768 et 1023 les deux sorties coexistent. L'assertion est passée à « au moins une sortie » avec un champ `back` dédié dans la matrice. **Pourquoi ce n'est pas un affaiblissement de complaisance :** la redondance est réelle en production et n'a pas encore été tranchée côté design ; déduire un palier de l'autre masquerait précisément la divergence. À remettre à « exactement une » dès l'arbitrage. (Sprint 73 #298)

## DEC-S73-002 — Le double chrome du dashboard en 768-1023 est signalé, pas absorbé
#298 fait peindre `dashboard/page.tsx:112` (`<header ... lg:hidden>`) en même temps que la sidebar icon-only, et ses contrôles (L121, `hidden md:flex`) y dupliquent LanguageSelector + Réglages + Logout. Le fichier était hors du périmètre de fichiers alloué à l'issue (3 subagents en parallèle dans un working tree partagé). Retenu : signaler en `RECOMMAND_FOLLOWUP` **confirmé** avec la ligne exacte, plutôt qu'élargir le diff hors périmètre et risquer une collision. Correctif probable `lg:hidden` → `md:hidden`, décision Designer. (Sprint 73 #298)

## DEC-S74-001 — La lévitation de `.feature-card` appartient à `landing.css`, pas au TSX
#384 offrait deux retraits symétriques en apparence. Retenu : garder la règle de feuille, retirer l'utilitaire. Motifs : `-translate-y-2` vaut −8px et non les −10px visés ; la feuille porte aussi le palier responsive `-5px` (< 768px) qu'aucune utilitaire ne reproduit sans réécriture ; `.testimonial-card` suit déjà ce modèle. La classe `transform` nue a été retirée avec (identité en v4, le contexte d'empilement vient de `.card-gradient-border`). **Ne pas layeriser** ce bloc — `shadow-lg` est posée sans variante `hover:` (PIT-S53-004). (Sprint 74 #384)

## DEC-S74-002 — `outline-offset` négatif réservé aux cibles sans bordure porteuse d'état ; sinon on déclippe le conteneur
Les deux zones de #417 n'ont **pas** le même remède, délibérément. Le tablist des réglages garde `outline-offset:-2px` (pastilles `rounded-md` **sans bordure**, trait à 2px du bord et 10px du libellé). Les contrôles de zoom passent par le **retrait de `overflow:hidden`** sur `.mt-zoom`, l'arrondi étant porté par les boutons de bord : c'est exactement ce que #226 appliquait déjà en contexte `.mt-tlm`, donc un seul motif dans le DS au lieu de deux. L'offset négatif y était impossible ([[PIT-S74-006]]). Reste exclu partout : `.mt-tab` et le `<tr>` du §8bis de `ds/a11y-audit.md`, dont le `border-bottom` porte la sélection. Contre-épreuve du déclippage : le fond de survol suit l'arrondi des boutons, il ne déborde pas — ce que `overflow:hidden` gardait est couvert autrement. (Sprint 74 #417)

## DEC-S75-001 — Date légale : ISO stockée, rendue par `Intl` avec mois littéral et `timeZone: 'UTC'` épinglé
#60 demandait une « date centralisée » sans dire en quel format. Retenu : la constante porte une date ISO, l'affichage passe par `Intl.DateTimeFormat(locale)` avec `month: 'long'`. Deux motifs, tous deux mesurés et non théoriques. (1) `01/06/2023` est **ambigu hors `fr`** — un lecteur anglophone y lit « 6 janvier » ; sur une date d'opposabilité juridique, l'inversion jour/mois n'est pas cosmétique. (2) Sans `timeZone: 'UTC'`, `new Date('2023-06-01')` est interprétée en UTC puis rendue en heure locale : elle affiche « 31 mai » **à l'ouest de Greenwich** — un décalage d'un jour strictement invisible depuis un poste européen, donc jamais attrapé en développement ici. (Sprint 75 #60)

## DEC-S76-001 — Retirer `deleteById` du port en même temps qu'on ajoute son remplaçant, et nommer la méthode d'après son contrat de retour
Deux décisions liées, prises sur #175. (1) Laisser sur le port domaine la méthode qui EST l'anti-pattern permet de la réintroduire au prochain besoin : `void deleteById(UUID)` a donc été retiré en même temps qu'était ajouté `int deleteByIdReturningRowCount(UUID)`. Portée honnête : c'est une **barrière de conception, pas une garantie de compilation** — `EventRepositoryJpaImpl extends SimpleJpaRepository`, donc `deleteById`/`delete` restent publics sur le bean concret (les contrôles négatifs des tests s'en servent). Elle protège les appelants typés par le port, c'est tout. (2) Le nom initial `deleteByIdIfExists` annonçait une idempotence anodine alors que le rowcount est **load-bearing** : le service en dérive le 404. Renommé d'après ce que le retour porte réellement. (Sprint 76 #175)

## DEC-S76-002 — Sur `DELETE /events/{id}`, la suppression gagne toujours : pas de verrou optimiste
Le passage à un DELETE bulk (cf. [[PIT-S76-002]]) retire le contrôle de version. Assumé, pour trois motifs. (1) Le `DELETE` HTTP ne transporte **aucune version**, contrairement au `PATCH` (BR-EVE-015) : il n'y a pas d'intention client à protéger, et un 409 serait inexploitable côté front. (2) La suppression est un acte terminal. (3) Le contrôle négatif a montré que la fenêtre historiquement protégée était intra-requête, artefact d'`open-in-view`, pas une garantie métier. Coût d'un retour arrière, chiffré sans être implémenté : paramètre `version` sur le port et le DTO, `WHERE id=:id AND version=:v`, plus une relecture pour distinguer un rowcount 0 « inexistant » (404) d'un « version périmée » (409) — soit une instruction de plus sur le seul chemin de conflit. Spécifié par `concurrentEditThenDelete_deletionWins`. (Sprint 76 #175)
