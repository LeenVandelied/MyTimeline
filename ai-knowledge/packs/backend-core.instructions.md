---
pack: backend-core
kind: technical
name: Socle backend
generated_at: 2026-11-19T16:00:00Z
generator: synth/1
base_sha256: e1ea87e2dd05bcf9876e84433aef1dedf88fe8b45a674ccc924d9b74474c8cec
facts_in_base: 201
facts_in_pool: 201
facts_cited: 43
sections: backend-core.sections.json
details: [backend-core.details.md]
lang: fr
curated_at: 2026-11-19T16:38:00Z
curation: backend-core.curation.json
---
## 1. Quand activer {#activate}

Ce pack s'active quand la demande ou le code touche l'un de ces éléments.

- Chemins : `^backend:src/(main|test)/(java|resources)/`

## 2. Lexique {#lexicon}

Aucun fait de la base ne relève de cette section.

## 3. Conventions {#rules}

### Invariants
- Selon le commentaire de V15, une migration Flyway déjà appliquée ne s'édite jamais (checksum mismatch), chaque évolution est un nouveau fichier V{N}__description.sql. [#0f78e3c2ecbf6a01-1]
- Selon le commentaire de V10, le DDL doit refléter exactement l'entité JPA, sinon ddl-auto=validate fait échouer le démarrage. [#769931702f98c49a-1] [#94a4128b06913755-1]
- Les migrations à partir de V4 (sauf exceptions éventuelles) finissent par un bloc ROLLBACK en commentaire, car Flyway Community ne rejoue pas les undo. V1 à V3 n'en ont pas [#6263eaed3b52418b-1]
### Migrations SQL
- Quand des lignes existantes ont une valeur NULL ou invalide, la migration les corrige d'abord par un UPDATE, puis pose NOT NULL et CHECK. Pour une nouvelle colonne, un DEFAULT suffit [#aec478e7c872ec76-1]
- Certains durcissements de données existantes (V4, V7) commencent par un bloc DO qui compte les lignes non conformes et lève une exception avant les ALTER, d'autres (V12) assainissent par UPDATE [#df9c3b50b0236da0-1]
### Entités et domaine
- Un port de repository écrit un champ à écriture restreinte par une méthode dédiée, save ne le recopie pas en mise à jour. [#c3d2971633861966-1]
- Une validation métier avant persistance lève une exception de domaine dédiée, sans laisser la contrainte base remonter. [#4ff3b3eb5d8b58c4-3]
### DTOs et validation
- Sur les PATCH de produit et d'évènement, null signifie inchangé (pas de NotBlank), et le produit utilise un booléen clearColor pour réinitialiser la couleur ; les PATCH de compte et de catégorie exigent des champs @NotBlank [#e5c0483643898852-1] [#00242f1143423b22-1]
- La politique de mot de passe vit dans une annotation unique, selon la javadoc elle se réplique dans les schémas frontend et ne se pose pas sur AuthRequest. [#a8f3d3adead0954d-1] [#a8f3d3adead0954d-2]
- Selon la javadoc, les réponses n'exposent jamais le jti ni le hash du mot de passe. [#795dadaac9fca189-1] [#5042f4433ac0d445-1]
### Sécurité JWT
- Une clé privée vide déclenche une paire éphémère au démarrage, une clé mal formée lève une erreur sans la valeur. [#891330b9b1514b8d-1] [#1e299e939b17e348-1]
### Tests
- Chaque plancher de BomDriftTest est un supérieur ou égal, et la plupart sont fixés à la version corrective d'une CVE, flyway et spring-framework étant fixés par alignement sur le BOM [#816187975718291a-2]
### Vérifié dans le code
- CustomUserDetails.isAccountNonExpired, isAccountNonLocked, isCredentialsNonExpired et isEnabled renvoient toujours true : aucun statut de compte n'est appliqué par UserDetails [#authorization/3b1625b23c885c9c-1] [#0322518d1bd1aa5e-1] [#user/b13f9b62a1d0f815-1] `backend:src/main/java/com/matimeline/eventmanager/infrastructure/security/CustomUserDetails.java:40-59`.

## 4. Structure {#structure}

Aucun fait de la base ne relève de cette section.

## 5. Points d'entrée du socle {#surface}

Aucun fait de la base ne relève de cette section.

## 6. Fichiers critiques {#files}

Fichiers du pool au poids le plus élevé (12 sur 79), le poids étant la somme des scores de spécificité de leurs faits. Liste complète : annexe.

| Fichier | Faits | Sortes dominantes |
|---|---|---|
| `backend:src/test/java/com/matimeline/eventmanager/build/BomDriftTest.java` | 17 | convention 13, suspicious 2, other 1 |
| `backend:src/test/java/com/matimeline/eventmanager/architecture/ArchitectureTest.java` | 18 | convention 13, other 2, test_case 2 |
| `backend:src/main/java/com/matimeline/eventmanager/infrastructure/security/JwtService.java` | 12 | convention 8, config 2, other 1 |
| `backend:src/main/java/com/matimeline/eventmanager/utils/Utils.java` | 8 | convention 7, suspicious 1 |
| `backend:src/test/java/com/matimeline/eventmanager/support/AbstractPostgresIntegrationTest.java` | 9 | convention 6, config 1, other 1 |
| `backend:src/test/java/com/matimeline/eventmanager/utils/UtilsTest.java` | 8 | convention 6, other 2 |
| `backend:src/main/java/com/matimeline/eventmanager/application/dtos/CategoryRequest.java` | 5 | convention 5 |
| `backend:src/main/java/com/matimeline/eventmanager/application/validation/StrongPassword.java` | 4 | convention 3, suspicious 1 |
| `backend:src/main/java/com/matimeline/eventmanager/domain/ports/repositories/ProductRepository.java` | 3 | persistence_query 2, suspicious 1 |
| `backend:src/main/java/com/matimeline/eventmanager/infrastructure/entities/CategoryEntity.java` | 4 | convention 4 |
| `backend:src/test/java/com/matimeline/eventmanager/infrastructure/security/RateLimitingDisabledIntegrationTest.java` | 3 | config 1, suspicious 1, test_case 1 |
| `backend:src/main/java/com/matimeline/eventmanager/application/dtos/AuthResponse.java` | 2 | convention 1, suspicious 1 |

## 7. Relations avec d'autres packs {#relations}

Packs liés par des faits repris, des faits équivalents écartés à la déduplication ou le catalogue.

| Pack | Faits repris | Faits équivalents | Catalogue |
|---|---|---|---|
| user | 55 | 27 |  |
| event | 36 | 19 |  |
| product | 11 | 10 |  |
| category | 16 | 3 |  |
| session | 11 | 5 |  |
| export | 7 | 6 |  |

- Faits du pool par pack d'origine : backend-core 65, user 55, event 36, category 16, product 11, session 11, export 7

## 8. Tests attendus {#tests}

- Les tests fixent que les chemins de référence contenant des segments de traversée sont rejetés par une IllegalArgumentException dans l'adaptateur de stockage local, et que le cycle store puis load restitue le contenu [#71532eb6a4bff389-1] [#cb0b5254f4e4ac26-1].
- Les tests fixent que le health indicator Brevo ne laisse jamais la clé API apparaître dans les valeurs de ses détails, un changement de ces détails doit re-prouver ce point [#2ed7f484b7341552-1] [#eaae94db71d3c395-1].
- Les tests fixent le comportement de ClientIpAnonymizer.anonymize par comparaison de valeurs, y compris le cas nul, voir `backend:src/test/java/com/matimeline/eventmanager/infrastructure/security/ClientIpAnonymizerTest.java:13-51` [#d8047dd30843e60e-1].
- Les tests fixent que la révocation d'une session appartenant à un autre utilisateur lève l'exception attendue et n'appelle jamais revokeById, avec un contrôle par verify never [#d4caeca2588b62df-1].
- Les tests fixent que markCompleted prend la date de complétion fournie et ne la déduit pas du TTL, avec un message d'assertion explicite [#16b553bae5d184fe-1].
- Un test d'intégration Spring ou HTTP étend AbstractPostgresIntegrationTest, et un test HTTP ajoute @AutoConfigureMockMvc avec MockMvc injecté par @Autowired [#27686d618290701e-1] [#d9aaaab667e49289-1].
- Selon la javadoc, le test d'architecture est une analyse bytecode pure sans contexte Spring, et la règle contre HttpSession appelle rule.check sans FreezingArchRule, donc elle échoue dès la première occurrence [#6e4864d81232c39c-1] [#bee8bdb67d6f58ab-1].
- Selon la javadoc, le test de dérive de BOM est un test unitaire pur sans @SpringBootTest ni base, qui lit des versions sur le classpath [#4804f2a414ef6f01-1].
- Les noms de test suivent le motif methode_condition_resultat avec underscores, et les cas multiples du domaine passent par @ParameterizedTest avec @ValueSource [#679bb4ab96bd83c2-1] [#f3c01a490edf8a25-1].

## 9. Questions ouvertes {#questions}

Aucun fait de la base ne relève de cette section.

## 10. Alertes {#alerts}

- generateToken(String) n'ajoute ni claim jti ni claim role, alors que generateToken(Authentication) ajoute les deux, donc un jeton émis par la première surcharge n'a pas de rôle. Avant de modifier l'émission ou la lecture des jetons ⇒ vérifier quelle surcharge est appelée (`backend:src/main/java/com/matimeline/eventmanager/infrastructure/security/JwtService.java:145-174`) [#46b3392f051dc8d7-1]
- Selon la javadoc de validateEventType, une DataIntegrityViolationException non gérée est masquée en 401 par le dispatch /error. Le code lève une exception de domaine dédiée avant la persistance, donc pour une nouvelle règle de métier ⇒ lever une exception du package domain.exceptions plutôt que de laisser la contrainte base remonter [#b88b2f870d7e4421-1] [#4ff3b3eb5d8b58c4-3]
- Le port ProductRepository, dans domain, importe et applique l'annotation Spring Repository, et ProductService importe des DTO de la couche application. Cela contredit la règle hexagonale du projet et UserRepository ou EventService ne le font pas ⇒ ne pas copier ce modèle, ne pas ajouter d'import Spring ni de DTO dans domain [#f5728797d94e6d35-1] [#54c376e6a3ecbd60-1]
- Selon le commentaire de ArchitectureTest, chaîner andShould avec une dépendance générique neutralise l'exception à la règle (relevé en review #166). Le code exprime l'exception en un prédicat unique combiné avec and(not(...)) : pour ajouter une exception ⇒ modifier ce prédicat et ne pas chaîner un second dependOnClassesThat [#b6122e0a1a910aff-1] [#005e9b3100070e4b-3]
- Le test Flyway lit la version via VersionPrinter, de l'API interne de Flyway, et le commentaire admet qu'un bump majeur peut casser la compilation. Lors d'une montée de version Flyway ⇒ vérifier d'abord que ce test compile encore [#34e020d21533d9ac-2] [#6445289775462dbb-1]
- Le setter setProduct(UUID) de Event écrit le champ productId, sans le préfixe setProductId des autres accesseurs. Chercher setProduct et non setProductId dans les appelants [#92290e00ccdddfec-1].

## 11. Couverture {#coverage}

- Fichiers du pack : 270 ; avec au moins un fait en base : 79 ; sans fait après remise en file : 0.
- Faits en base : 201, repris d'autres packs : +0, hors périmètre : -0, doublons écartés à la déduplication : -0, soit 201 dans le pool.
- Faits du pool venus d'un autre pack : 136 (par pack : section Relations).
- Destination des 201 faits du pool : Conventions 150 ; Points d'entrée du socle 1 ; Tests attendus 16 ; Alertes / Questions ouvertes 16 ; annexe seule 5 ; écartés (sorte `other` ou inconnue) 13.
- Passe technique : scope 270 fichiers, lus 79 (29 %), non lus 191 : ce pack décrit le socle sur un échantillon, pas sur tout son scope.
- Base : sha256 e1ea87e2dd05…, générée le 2026-11-19.
