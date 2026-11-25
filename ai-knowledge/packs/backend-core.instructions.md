---
pack: backend-core
kind: technical
name: Socle backend
generated_at: 2026-11-25T15:00:00
generator: synth/1
base_sha256: 59fcd0ff8949621036635f30872e798fc159f31ce4a0f528130116ab475a4d54
facts_in_base: 329
facts_in_pool: 327
facts_cited: 61
sections: backend-core.sections.json
details: [backend-core.details.md]
lang: fr
curated_at: 2026-11-25T15:00:00
curation: backend-core.curation.json
---
## 1. Quand activer {#activate}

Ce pack s'active quand la demande ou le code touche l'un de ces éléments.

- Chemins : `^backend:(?!src/main/resources/db/migration/)src/(main|test)/(java|resources)/`

## 2. Lexique {#lexicon}

Aucun fait de la base ne relève de cette section.

## 3. Conventions {#rules}

### Invariants
- Les règles d'architecture ArchUnit gelées s'appuient sur une baseline versionnée dans src/test/resources/archunit_store, alors que la règle sur les contrôleurs reste stricte et ne doit jamais y figurer. [#005e9b3100070e4b-4] [#b1bb860d85b192e8-1] [#67cbd3fdb1f8dfc0-2]
- Selon la javadoc, la baseline des violations gelées est versionnée dans le dépôt. [#29d2f43ed8bd9fff-2]
- Chaque entité JPA porte createdAt, updatedAt et un champ version pour le verrou optimiste, avec un identifiant UUID en génération AUTO. [#be53be0d97652fd1-1] [#f98746f909bf23dd-1] [#cbc477c31e33275c-1]
- Les entités comparent leur identifiant non nul dans equals, et hashCode renvoie le hash de la classe. [#00cbf21ac66ea659-1] [#cfbab8fee77f3517-1]
- Les exclusions d'archivés d'un décompte JPQL sont écrites dans la requête, selon le commentaire de `backend:src/main/java/com/matimeline/eventmanager/infrastructure/adapters/repositories/jpa/EventRepositoryJpaImpl.java:164-166`. [#e5b641fe9185e326-1]
- Les jetons sont signés en RS256 et valent 48 heures. Sans propriété jwt.private-key, une paire RSA éphémère est générée. [#0e3f907dd14ff23f-2] [#ba79c292ff5ef085-1] [#891330b9b1514b8d-1]
- La configuration JWT est validée au démarrage en fail-fast, et les messages d'erreur ne reprennent jamais la valeur configurée. [#3372992d7afb3aab-1] [#1e299e939b17e348-2]
### Architecture hexagonale
- Les lectures par identifiant des ports User, Category, Product et Session se nomment findDomain...By... et renvoient un Optional du modèle domaine. Les autres ports de repository (Event, ExportJob, PasswordResetToken, Session par jti) utilisent d'autres noms [#12a8cd536c4cf35b-1] [#9ac458935b628952-1]
- Un modèle domaine se modifie par une méthode withX qui renvoie une copie, sans setter. [#9473369c97aa3078-1]
### DTO et mappers
- En mise à jour partielle, null signifie inchangé, donc le nom utilise un @Pattern non vide et la remise à zéro de la couleur passe par clearColor, prioritaire sur la valeur. [#e5c0483643898852-1] [#00242f1143423b22-1] [#1c94bdd8a0e7389a-2]
- Selon la javadoc, UserResponse n'expose jamais le hash du mot de passe. [#5042f4433ac0d445-1]
- Un mapper de la couche application est un @Component avec toDomain et toEntity, et toDomain lit l'identifiant du propriétaire sans charger le proxy LAZY. [#512989a1395a5fe4-1] [#4a1a214e2e2d8711-2]
### Quotas et politique de plan
- Le quota passe par PlanPolicy avant la persistance et lève EventQuotaExceededException. En création de lot, il est vérifié rang par rang et un refus annule tout. [#9ac458935b628952-2] [#b30ddcca7e325716-3]
### Avatars et exports
- Un avatar est limité à 5 Mo par défaut, son type est déduit de la signature binaire (JPEG, PNG, WebP) et l'ancien fichier n'est supprimé qu'après sauvegarde réussie. [#2f88ba661d416e11-1] [#7ad98dadd151539e-2] [#7ad98dadd151539e-3]
- Le fichier d'export reste téléchargeable 24 heures. Un format du mauvais mode lève ExportFormatNotSupportedException avant tout traitement. [#96769bfb2678cd5c-1] [#58d5194058c204c1-1]
- Les lectures de job filtrent sur le propriétaire et les identifiants sont masqués à huit caractères dans les journaux. [#7f1c5ea0ed429d31-1] [#a785ba7f77afbf96-1]
### Tests
- Les fixtures rangées sous le package scanné de l'application (eventmanager) ne portent aucun stéréotype Spring, pour ne pas être chargées par les tests SpringBootTest. Celles du package archfixtures, hors scan, peuvent en porter [#c8d72133cec16d9a-1]
### Vérifié dans le code
- Pour valider les événements d'une création de produit, ajouter @Valid sur ProductCreationRequest.events, sinon les contraintes de EventCreationRequest ne sont pas déclenchées [#d58358f7f920e99c-1] `backend:src/main/java/com/matimeline/eventmanager/application/dtos/ProductCreationRequest.java:32`.
- SecurityConfig déclare /error en permitAll, sans quoi toute exception non gérée se redispatche sur /error et ressort en 401 [#authorization/0b17c87584464539-1] [#authorization/10ab0800c4c3ca76-2] [#session/ca4e294476944c3f-2] `backend:src/main/java/com/matimeline/eventmanager/infrastructure/security/SecurityConfig.java:167-171`.
- La colonne users.tier est créée par V17__user_tier.sql (varchar(16) not null default 'FREE', check ck_users_tier). UserEntity.tier doit rester aligné sur elle [#migrations/4fb665d4a5d4cc11-1] `backend:src/main/resources/db/migration/V17__user_tier.sql:25-28`.

## 4. Structure {#structure}

Aucun fait de la base ne relève de cette section.

## 5. Points d'entrée du socle {#surface}

- Les comptages d'événements actifs d'un utilisateur sont écrits en JPQL passé à l'entity manager, avec paramètre nommé puis lecture du résultat unique, voir `backend:src/main/java/com/matimeline/eventmanager/infrastructure/adapters/repositories/jpa/EventRepositoryJpaImpl.java:169-175` [#60a63c56d1f79db0-1]
- La lecture d'un événement par identifiant passe par la lecture standard du parent JPA, puis l'entité trouvée est convertie en modèle de domaine par le mapper, voir `backend:src/main/java/com/matimeline/eventmanager/infrastructure/adapters/repositories/jpa/EventRepositoryJpaImpl.java:179-180` [#241827d4d4210b33-1]

## 6. Fichiers critiques {#files}

Fichiers du pool au poids le plus élevé (12 sur 100), le poids étant la somme des scores de spécificité de leurs faits. Liste complète : annexe.

| Fichier | Faits | Sortes dominantes |
|---|---|---|
| `backend:src/test/java/com/matimeline/eventmanager/architecture/ArchitectureTest.java` | 15 | convention 14, suspicious 1 |
| `backend:src/main/java/com/matimeline/eventmanager/application/services/ProductServiceImpl.java` | 13 | convention 11, suspicious 2 |
| `backend:src/test/java/com/matimeline/eventmanager/build/BomDriftTest.java` | 14 | convention 8, suspicious 3, other 2 |
| `backend:src/main/java/com/matimeline/eventmanager/infrastructure/security/JwtService.java` | 12 | convention 8, config 2, other 1 |
| `backend:src/main/java/com/matimeline/eventmanager/application/services/AvatarServiceImpl.java` | 10 | convention 9, config 1 |
| `backend:src/main/java/com/matimeline/eventmanager/utils/Utils.java` | 8 | convention 7, suspicious 1 |
| `backend:src/test/java/com/matimeline/eventmanager/build/PomHygieneTest.java` | 9 | convention 7, test_case 2 |
| `backend:src/main/java/com/matimeline/eventmanager/application/dtos/UserResponse.java` | 6 | convention 5, suspicious 1 |
| `backend:src/main/java/com/matimeline/eventmanager/application/services/EventServiceImpl.java` | 7 | convention 7 |
| `backend:src/main/java/com/matimeline/eventmanager/application/policy/PlanPolicy.java` | 5 | config 3, convention 1, suspicious 1 |
| `backend:src/main/java/com/matimeline/eventmanager/application/services/AsyncExportRunner.java` | 6 | convention 6 |
| `backend:src/main/java/com/matimeline/eventmanager/application/services/ExportServiceImpl.java` | 7 | convention 6, other 1 |

## 7. Relations avec d'autres packs {#relations}

Packs liés par des faits repris, des faits équivalents écartés à la déduplication ou le catalogue.

| Pack | Faits repris | Faits équivalents | Catalogue |
|---|---|---|---|
| user | 63 | 31 |  |
| event | 68 | 23 |  |
| product | 49 | 22 |  |
| export | 35 | 25 |  |
| session | 28 | 16 |  |
| category | 12 | 5 |  |

- Faits du pool par pack d'origine : backend-core 72, event 68, user 63, product 49, export 35, session 28, category 12

## 8. Tests attendus {#tests}

- Les tests fixent que les erreurs HTTP portent un champ error au code snake_case stable, et que les requêtes authentifiées passent le JWT dans un cookie jwt. [#d857dcc49f297361-3] [#e10813059dc06889-1] [#d857dcc49f297361-2]
- Les tests fixent que le stockage local refuse le path traversal sur store, load et delete, et que markCompleted garde la date passée. [#71532eb6a4bff389-1] [#16b553bae5d184fe-1]
- Un test de service est unitaire, avec MockitoExtension, @Mock et @InjectMocks, et une vraie PlanPolicy quand le quota compte. [#d468f061532819b7-2] [#e523cd09df107d45-1] [#050ca75f70ba7498-1]
- Un test de persistance étend AbstractPostgresIntegrationTest, reste @Transactional avec des données uniques par UUID, et lit la colonne brute par requête native après flush et clear. [#4a140b143c6b24a2-1] [#6d4fccd1ba6f1d15-1]
- Les tests d'intégration créent leurs données par des helpers persistXxx suivis de em.flush, et appellent les ports de service plutôt que les repositories. [#f9e8e65baaee9128-1] [#b55a7ec212a15aa8-1]
- Les tests du stockage local utilisent un @TempDir réel injecté dans l'adaptateur. [#bf9a385a27b5a2f4-1]

## 9. Questions ouvertes {#questions}

- Le refine Zod du champ color reste-t-il à répercuter ? Le commentaire signale un suivi ouvert et le DTO n'a aucune contrainte hex [#1cfdbb8136494b7c-1] [#af3d8994f27f9508-1]
- Product.addEvent doit-il gérer une liste null ? hasEvents la traite, addEvent non [#7609dab35d65be14-1]

## 10. Alertes {#alerts}

- La surcharge de génération de jeton prenant un simple nom d'utilisateur ne pose aucun claim jti, alors que le commentaire de la surcharge Authentication dit que chaque jeton émis en porte un. Tout code qui s'appuie sur le jti (révocation, session) échoue pour ces jetons, donc n'utiliser que la surcharge Authentication ou ajouter le jti à l'autre, voir `backend:src/main/java/com/matimeline/eventmanager/infrastructure/security/JwtService.java:205-216` [#46b3392f051dc8d7-1]
- Le port ProductRepository du domaine importe une annotation Spring, alors que la règle du projet interdit tout import Spring dans le domaine et que UserRepository n'en a pas. Un test d'architecture ou une revue hexagonale peut le refuser, donc ne pas copier ce modèle et retirer l'import du port, voir `backend:src/main/java/com/matimeline/eventmanager/domain/ports/repositories/ProductRepository.java:8` [#f5728797d94e6d35-1]
- Le setter setProduct de Event prend un UUID et écrit productId, alors que le getter s'appelle getProductId. Passer un objet produit ne compile pas et le nom trompe, donc lui passer l'identifiant et vérifier le nom des accesseurs avant d'en ajouter, voir `backend:src/main/java/com/matimeline/eventmanager/domain/models/Event.java:79` [#92290e00ccdddfec-1]
- La création d'un produit construit ses événements avec 11 arguments, sans color ni archived, alors que EventServiceImpl.createEvent en passe 14. Les événements créés via un produit peuvent donc différer de ceux créés seuls, donc aligner les deux constructions avant d'ajouter un champ à Event, voir `backend:src/main/java/com/matimeline/eventmanager/application/services/ProductServiceImpl.java:96-109` [#356115a38b706fe0-2]

## 11. Couverture {#coverage}

- Fichiers du pack : 280 ; avec au moins un fait en base : 100 ; sans fait après remise en file : 0.
- Faits en base : 329, repris d'autres packs : +0, hors périmètre : -0, doublons écartés à la déduplication : -2, soit 327 dans le pool.
- Faits du pool venus d'un autre pack : 255 (par pack : section Relations).
- Destination des 327 faits du pool : Conventions 219 ; Points d'entrée du socle 2 ; Tests attendus 48 ; Alertes / Questions ouvertes 42 ; annexe seule 5 ; écartés (sorte `other` ou inconnue) 11.
- Passe technique : scope 280 fichiers, lus 101 (36 %), non lus 179 : ce pack décrit le socle sur un échantillon, pas sur tout son scope.
- Base : sha256 59fcd0ff8949…, générée le 2026-11-25.
