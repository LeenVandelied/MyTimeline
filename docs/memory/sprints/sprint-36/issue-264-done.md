# issue-264-done

- commits: [4dd436c44a126b23977a16f45cc002caf9b7c490]

- resume:
  Objectif: découpler le stockage des exports RGPD (ZIP/CSV) des avatars.
  - Nouvelle clé `app.storage.export-path` déclinée sur les 4 profils, pattern avatar-path
    (convention #34): default dev (`./var/exports-dev`), aucun default prod (fail-fast),
    tmpdir en test. AUCUNE migration (config/stockage uniquement).
  - `LocalStorageAdapter` généralisé: retrait `@Component`/`@Value`, base-path paramétré par
    constructeur, messages d'erreur génériques (plus "avatar"). Impl réutilisable par usage.
  - `StorageConfig` (@Configuration) déclare 2 beans `StoragePort`: `avatarStorage`
    (avatar-path) + `exportStorage` (export-path) sur répertoires DISTINCTS.
  - Injections désambiguïsées par `@Qualifier`: AvatarServiceImpl -> avatarStorage;
    ExportServiceImpl + AsyncExportRunner -> exportStorage. `exportStorage` = point d'accès
    dédié réutilisable par la purge #267.
  - N'hérite PAS de `app.storage.avatar-max-bytes` ni de la validation d'image.
  - Fichiers clés: infrastructure/config/StorageConfig.java (new),
    infrastructure/adapters/LocalStorageAdapter.java, application/services/{ExportServiceImpl,
    AsyncExportRunner,AvatarServiceImpl}.java, resources/application*.properties,
    test/.../config/StorageConfigTest.java (new).
  - BR touchées: ADR-003 §5 (dette stockage export résolue). Hexagonal OK (ArchUnit vert,
    @Qualifier = même catégorie Spring que @Value déjà présent en couche application).
  - Pitfall évité: bare ApplicationContextRunner IGNORE les placeholders non résolus
    (ignoreUnresolvablePlaceholders=true) -> le test fail-fast ne déclenchait pas. Corrigé en
    ajoutant PropertyPlaceholderAutoConfiguration (comme un vrai boot Boot).
  - Tests: StorageConfigTest 2/2 PASSED (découpling répertoires + fail-fast export-path absent),
    ExportEndpointsIntegrationTest 11/11 PASSED (flux async réel via exportStorage),
    EventmanagerApplicationTests 1/1 (contexte boote avec 2 beans qualifiés),
    AvatarServiceImplTest 12, LocalStorageAdapterTest 6, ArchitectureTest 5 — total 35 PASSED,
    0 failed.

- [MEMORY:*] signaux:
  - [MEMORY:pattern] Problem: fail-fast d'une clé sans default à tester hors @SpringBootTest.
    Solution: ApplicationContextRunner + AutoConfigurations.of(PropertyPlaceholderAutoConfiguration)
    pour obtenir ignoreUnresolvablePlaceholders=false. Anti-pattern: bare ApplicationContextRunner
    (resolver Environment par défaut ignore les placeholders manquants -> faux vert).
  - [MEMORY:pattern] Problem: 2 beans même type StoragePort. Solution: @Configuration avec beans
    nommés + @Qualifier au point d'injection; impl unique paramétrée par base-path (réutilisable
    S3-swap par usage). Anti-pattern: @Primary (masque un oubli de qualifier -> mauvais répertoire).

- recommandations suite:
  - #267 (purge TTL 24h): injecter `@Qualifier("exportStorage") StoragePort` pour
    `delete(storageRef)`; itérer le base-path export via une nouvelle méthode de port si besoin
    de lister les fichiers expirés (le port actuel n'expose pas de list()).
  - NOTE worktree partagé: mon édition doc ADR-003 §5 (dette résolue) est laissée NON committée
    car le fichier est entrelacé avec le §6 rate-limiting de #265 (+ RateLimitingFilter, réservé
    #265). Le lead/#265 committera l'ADR; ne PAS l'attribuer à mon commit.

STATUS: COMPLETED
