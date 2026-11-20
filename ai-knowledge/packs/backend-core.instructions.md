---
pack: backend-core
kind: technical
name: Socle backend
generated_at: 2026-11-20T11:40:00Z
generator: synth/1
base_sha256: e1b69d5d3c529efb408f83164b8be221e2e9be3cb2b8569c62b0d354187698c0
facts_in_base: 171
facts_in_pool: 170
facts_cited: 42
sections: backend-core.sections.json
details: [backend-core.details.md]
lang: fr
curated_at: 2026-11-20T12:45:00Z
curation: backend-core.curation.json
---
## 1. Quand activer {#activate}

Ce pack s'active quand la demande ou le code touche l'un de ces éléments.

- Chemins : `^backend:(?!src/main/resources/db/migration/)src/(main|test)/(java|resources)/`

## 2. Lexique {#lexicon}

Aucun fait de la base ne relève de cette section.

## 3. Conventions {#rules}

### Invariants
- Les ports de service du domaine prennent et renvoient des commandes et modèles du domaine, comme EventService, sauf ProductService qui prend encore les DTO ProductCreationRequest et ProductUpdateRequest [#3649497eed73f9f7-1]
- Les tests d'intégration étendent la classe de base PostgreSQL, avec profil test et conteneur singleton partagé. [#784c974edb4c82c0-3] [#9b3b36b46f6db347-2]
- Selon la javadoc, ces tests n'utilisent pas H2, Flyway rejoue les migrations depuis V1 et Hibernate valide le schéma. [#b103523302cefc64-1]
### Jeton JWT et appelant
- Sans jwt.private-key, le service génère une paire RS256 éphémère. [#891330b9b1514b8d-1]
- Une clé mal formée lève IllegalStateException sans reprendre la valeur configurée. [#1e299e939b17e348-1]
- currentUser ne lève jamais d'exception et renvoie Optional vide pour un contexte anonyme, l'appelant choisit le statut HTTP. [#9db0c0fc888c044b-1] [#9db0c0fc888c044b-2]
### Persistance
- Le soft delete par SQLRestriction masque les archivés à toute lecture Hibernate, donc purge et restauration passent par du SQL natif qui filtre archived et user_id, voir `backend:src/main/java/com/matimeline/eventmanager/domain/ports/repositories/ProductRepository.java:70-104`. [#1cde148ce35ea68c-1] [#b6b8faa3d2da2ac9-1] [#f56e4e358ba66393-1]
- Les entités utilisateur, produit, événement et catégorie ont un UUID généré, des dates d'audit et une version. Le jeton de réinitialisation a une version mais son UUID est assigné par l'application. Les entités de session et de job d'export n'ont pas de version [#cbc477c31e33275c-1] [#be53be0d97652fd1-1] [#46119bdcfa9f904b-1]
- Un champ écrit par un chemin dédié est exclu de save et mis à jour par une méthode de port propre. [#c3d2971633861966-1]
### DTO et validation
- Une mise à jour partielle utilise null pour inchangé, donc @Pattern au lieu de @NotBlank et un booléen clearColor pour effacer la couleur. [#e5c0483643898852-1] [#00242f1143423b22-1]
- La plupart des DTO de requête sont des classes avec getters et setters écrits à la main, sauf UpdatePreferencesRequest qui est un record, et la plupart des réponses sont Lombok avec fromDomain [#573a55d2f0e0cdad-4] [#301896c782a8b85e-1] [#9f00547b4339b55b-1]
- Selon la javadoc, StrongPassword se pose sur création et modification de mot de passe, jamais sur AuthRequest. [#a8f3d3adead0954d-2]
- Selon la javadoc, l'identité de l'appelant vient du JWT, le username du corps ne sert qu'à confirmer. [#d6d5911c6a9ed32f-1]

## 4. Structure {#structure}

Aucun fait de la base ne relève de cette section.

## 5. Points d'entrée du socle {#surface}

Aucun fait de la base ne relève de cette section.

## 6. Fichiers critiques {#files}

Fichiers du pool au poids le plus élevé (12 sur 63), le poids étant la somme des scores de spécificité de leurs faits. Liste complète : annexe.

| Fichier | Faits | Sortes dominantes |
|---|---|---|
| `backend:src/test/java/com/matimeline/eventmanager/build/BomDriftTest.java` | 14 | convention 8, suspicious 3, other 2 |
| `backend:src/test/java/com/matimeline/eventmanager/architecture/ArchitectureTest.java` | 15 | convention 8, other 4, config 1 |
| `backend:src/main/java/com/matimeline/eventmanager/infrastructure/security/JwtService.java` | 11 | convention 7, config 2, other 1 |
| `backend:src/main/java/com/matimeline/eventmanager/utils/Utils.java` | 8 | convention 7, suspicious 1 |
| `backend:src/test/java/com/matimeline/eventmanager/support/AbstractPostgresIntegrationTest.java` | 7 | convention 5, config 1, other 1 |
| `backend:src/main/java/com/matimeline/eventmanager/application/validation/StrongPassword.java` | 4 | convention 3, suspicious 1 |
| `backend:src/main/java/com/matimeline/eventmanager/domain/ports/repositories/ProductRepository.java` | 4 | convention 3, suspicious 1 |
| `backend:src/main/java/com/matimeline/eventmanager/infrastructure/entities/CategoryEntity.java` | 5 | convention 5 |
| `backend:src/main/java/com/matimeline/eventmanager/infrastructure/entities/EventEntity.java` | 3 | suspicious 2, convention 1 |
| `backend:src/main/java/com/matimeline/eventmanager/domain/models/Event.java` | 3 | convention 2, suspicious 1 |
| `backend:src/main/java/com/matimeline/eventmanager/domain/models/export/ExportJob.java` | 4 | convention 4 |
| `backend:src/main/java/com/matimeline/eventmanager/infrastructure/security/CallerResolver.java` | 4 | convention 4 |

## 7. Relations avec d'autres packs {#relations}

Packs liés par des faits repris, des faits équivalents écartés à la déduplication ou le catalogue.

| Pack | Faits repris | Faits équivalents | Catalogue |
|---|---|---|---|
| user | 33 | 16 |  |
| event | 34 | 14 |  |
| session | 19 | 10 |  |
| product | 13 | 7 |  |
| category | 12 | 5 |  |
| export | 8 | 4 |  |

- Faits du pool par pack d'origine : backend-core 51, event 34, user 33, session 19, product 13, category 12, export 8

## 8. Tests attendus {#tests}

- Les tests fixent que le stockage local rejette les références de type path-traversal sur store, load et delete par IllegalArgumentException [#71532eb6a4bff389-1]. Ils travaillent sur un répertoire temporaire réel injecté dans l'adaptateur avant chaque test [#bf9a385a27b5a2f4-1].
- Les tests fixent que la préférence de thème rejette toute valeur hors liste exacte (casse, espaces, vide, valeurs inconnues) par IllegalArgumentException, via un test paramétré [#205634fdc51ed73d-1].
- Un test d'agrégat de domaine passe par la fabrique pending, appelle la transition mark* puis vérifie chaque champ, avec un message explicite quand la date doit être celle fournie et non dérivée du TTL [#16b553bae5d184fe-1].
- Un test de contrat DTO n'a pas de contexte Spring et désérialise un JSON littéral avec un ObjectMapper instancié directement [#f8c15a124e9472b2-2].
- Un test d'intégration est annoté SpringBootTest et AutoConfigureMockMvc, étend AbstractPostgresIntegrationTest et injecte un MockMvc [#d9aaaab667e49289-1].
- Selon la javadoc, les tests d'architecture ArchUnit analysent le bytecode sans contexte Spring pour rester rapides en CI [#6e4864d81232c39c-1]. Selon la javadoc, BomDriftTest est un test unitaire pur qui lit les versions de libs du classpath [#4804f2a414ef6f01-1].
- Les méthodes de test se nomment sujet_situation_résultat [#dc1833af13b82e2d-1] [#cb0b5254f4e4ac26-1].

## 9. Questions ouvertes {#questions}

- Le contrôle de format du champ color doit-il être ajouté côté serveur ? Le commentaire dit que le refine Zod du frontend reste à répercuter, et le DTO n'a aucune contrainte hex, ce que le code documente par BR-EVE-009 [#1cfdbb8136494b7c-1] [#af3d8994f27f9508-1].
- La javadoc de validateEventType dit qu'une DataIntegrityViolationException est masquée en 401 par le dispatch /error, mais aucun fait de code ne le confirme ici. Seule la levée d'InvalidEventTypeException avant persistance est établie [#b88b2f870d7e4421-1] [#4ff3b3eb5d8b58c4-3].

## 10. Alertes {#alerts}

- La surcharge de génération de token à partir d'un nom d'utilisateur n'ajoute pas de claim jti, alors que la surcharge sur Authentication en ajoute un et que la javadoc affirme qu'aucun token n'est émis sans jti. Un token issu de la première surcharge peut échapper à tout mécanisme fondé sur le jti, donc appelle la surcharge Authentication ou ajoute le jti avant d'utiliser l'autre, voir `backend:src/main/java/com/matimeline/eventmanager/infrastructure/security/JwtService.java:145-156` [#46b3392f051dc8d7-1].
- Le champ events de la création de produit n'a pas d'annotation de validation en cascade dans cette classe. Les contraintes des EventCreationRequest imbriqués ne sont pas déclenchées par ce DTO seul, donc ajoute la cascade ou valide ailleurs avant de compter sur elles, voir `backend:src/main/java/com/matimeline/eventmanager/application/dtos/ProductCreationRequest.java:32` [#d58358f7f920e99c-1].
- La règle 5 d'ArchUnit (pas de HttpSession en production) n'est pas enveloppée dans FreezingArchRule.freeze, contrairement aux autres. Toute violation fait échouer le test sans baseline, donc corrige la violation au lieu de geler, voir `backend:src/test/java/com/matimeline/eventmanager/architecture/ArchitectureTest.java:183` [#642150eaacf772b5-1].
- Trois fichiers du domaine importent du Spring ou de la couche application, en écart avec la règle hexagonale. Il s'agit de l'enum Role, du port ProductRepository (annotation Repository, absente de UserRepository) et du port ProductService (DTO application, alors qu'EventService prend des commandes du domaine). Ne copie pas ce patron dans un nouveau port, voir `backend:src/main/java/com/matimeline/eventmanager/domain/models/Role.java:3-5` [#d4207acb24ab9af6-1] [#f5728797d94e6d35-1] [#54c376e6a3ecbd60-1].

## 11. Couverture {#coverage}

- Fichiers du pack : 254 ; avec au moins un fait en base : 63 ; sans fait après remise en file : 0.
- Faits en base : 171, repris d'autres packs : +0, hors périmètre : -0, doublons écartés à la déduplication : -1, soit 170 dans le pool.
- Faits du pool venus d'un autre pack : 119 (par pack : section Relations).
- Destination des 170 faits du pool : Conventions 117 ; Tests attendus 18 ; Alertes / Questions ouvertes 24 ; annexe seule 1 ; écartés (sorte `other` ou inconnue) 10.
- Passe technique : scope 254 fichiers, lus 64 (25 %), non lus 190 : ce pack décrit le socle sur un échantillon, pas sur tout son scope.
- Base : sha256 e1b69d5d3c52…, générée le 2026-11-20.
