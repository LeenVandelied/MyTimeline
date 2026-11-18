---
pack: backend-socle
kind: technical
name: Socle backend
generated_at: 2026-11-18T16:25:37Z
generator: synth/1
base_sha256: 9a61a8cff90105a85e688e8c5813c2b40fe8d6fda8889c1458feba03dd619936
facts_in_base: 213
facts_in_pool: 210
facts_cited: 57
sections: backend-socle.sections.json
details: [backend-socle.details.md]
lang: fr
curated_at: 2026-11-18T16:25:37Z
curation: backend-socle.curation.json
---
## 1. Quand activer {#activate}

Ce pack s'active quand la demande ou le code touche l'un de ces éléments.

- Chemins : `^mytimeline:backend/(?!src/main/resources/db/)`

## 2. Lexique {#lexicon}

Aucun fait de la base ne relève de cette section.

## 3. Conventions {#rules}

### Invariants
- Selon le commentaire de UserEntity, le nom et le type de la colonne du thème doivent correspondre à la migration V16, car ddl-auto vaut validate. [#32eaa06d8b33424b-1]
- Les tests d'intégration tournent sur un PostgreSQL 16 partagé démarré une fois dans un bloc statique, et non sur H2. [#3b61f852056cda0c-2] [#3b61f852056cda0c-3] [#e1ae94a935cda2cf-1]
- Selon la javadoc de BomDriftTest, un plancher de version est un test supérieur ou égal, relevé seulement quand une nouvelle CVE l'impose. [#e40866fd3c6bd641-3] [#e40866fd3c6bd641-4]
### Sécurité
- Une propriété jwt.private-key vide déclenche une paire RSA éphémère, et la clé est validée en @PostConstruct pour échouer au démarrage. [#be183b621d286328-1] [#d56dbbde62261227-1]
- La chaîne de sécurité est stateless avec CSRF désactivé, et /error reste public pour éviter un faux 401. [#44fd89dd2c78cc26-1] [#44fd89dd2c78cc26-2] [#44fd89dd2c78cc26-3]
- Le filtre de limitation laisse passer une route absente de la table LIMITS, refuse en 401 un appelant authentifié sans identifiant, et se désactive par app.rate-limit.enabled. [#9b5e49a0a2f1c36c-1] [#9b5e49a0a2f1c36c-2] [#79101b62c54db0ea-1]
- Selon la javadoc, StrongPassword ne se pose pas sur AuthRequest.password pour que les comptes anciens puissent se connecter. [#636cd91bb727056f-1]
- L'indicateur Brevo renvoie DOWN si la clé est vide, sinon UP, sans jamais reporter la valeur de la clé. [#2f794ce9f9e9fc68-1]
### Domaine et DTOs
- Les ports de service d'événement prennent des commandes domaine où null signifie non fourni, alors que le port de produit prend encore des DTO applicatifs [#d924eb8a38e68c61-1] [#532f49858a41dbc9-2]
- Selon la javadoc, les projections n'exposent ni le hash du mot de passe ni le jti, et l'avatar passe par une URL relative fixe. [#b8e9a6964a69ebe3-1] [#cf79bd7b0d30f02d-1] [#c7a72e338aa1ba11-1]
- Une écriture ciblée par identifiant et propriétaire renvoie 0 pour inconnu ou autre utilisateur, afin d'éviter l'énumération. [#7567d6a4cfc3e386-1]
- Sur un utilisateur déjà existant, save ne recopie pas le thème, qui n'est modifié que par updateThemePreference ; à la création, save le pose [#337941493ce09ae5-1]
- Les enums RecurrenceUnit, ThemePreference et ExportFormat convertissent une valeur externe par fromString, fromValue ou fromParam et lèvent une erreur sur valeur inconnue, mais d'autres enums du domaine comme Role n'ont pas de tel convertisseur [#38f89bbedf94c3f6-1] [#af9f81b7c350186b-1] [#4d79a2634dabdb27-1]
- Les validations croisées de EventCreationRequest et EventUpdateRequest passent par un getter @AssertTrue, et themePreference est une String contrôlée par @Pattern, mais les autres enums en entrée ne suivent pas ce schéma [#f2b4cd18d208b4f8-1] [#dbd2bbe2eddcb65f-1]
### Persistance et export
- Toutes les entités ont un equals fondé sur un id non nul, et les entités métier (utilisateur, événement, produit, catégorie) portent colonnes d'audit et champ version, sauf les entités de session et de job d'export [#95bb2d7a6c03fe6d-1] [#322992155a7f5945-1]
- Selon le commentaire de CategoryMapper, toEntity ne pose pas owner, le repository le rattache. [#90aa1ac5754d7284-1]
- Les classes Jackson 3 viennent de tools.jackson, avec dates non horodatées, et une erreur de rendu devient une IllegalStateException générique. [#5d3d43026a6cbbcf-1] [#5d3d43026a6cbbcf-2] [#8588ccf8d1abd2e8-2]

## 4. Structure {#structure}

Aucun fait de la base ne relève de cette section.

## 5. Points d'entrée du socle {#surface}

- La suppression logique des produits est portée par une restriction posée sur l'entité, qui filtre toutes les lectures générées par Hibernate, donc un produit archivé n'est jamais renvoyé par ces lectures (`mytimeline:backend/src/main/java/com/matimeline/eventmanager/infrastructure/entities/ProductEntity.java:20-25`) [#3fb0487b6c2dbb00-1]

## 6. Fichiers critiques {#files}

Fichiers du pool au poids le plus élevé (11 sur 71), le poids étant la somme des scores de spécificité de leurs faits. Liste complète : annexe.

| Fichier | Faits | Sortes dominantes |
|---|---|---|
| `mytimeline:backend/src/test/java/com/matimeline/eventmanager/build/BomDriftTest.java` | 20 | convention 14, test_case 3, suspicious 2 |
| `mytimeline:backend/src/test/java/com/matimeline/eventmanager/architecture/ArchitectureTest.java` | 16 | convention 9, suspicious 3, test_case 3 |
| `mytimeline:backend/src/main/java/com/matimeline/eventmanager/infrastructure/security/SecurityConfig.java` | 16 | convention 15, config 1 |
| `mytimeline:backend/src/main/java/com/matimeline/eventmanager/infrastructure/security/JwtService.java` | 8 | convention 5, config 2, suspicious 1 |
| `mytimeline:backend/src/main/java/com/matimeline/eventmanager/utils/Utils.java` | 9 | convention 7, other 1, suspicious 1 |
| `mytimeline:backend/src/test/java/com/matimeline/eventmanager/support/AbstractPostgresIntegrationTest.java` | 7 | convention 5, config 1, suspicious 1 |
| `mytimeline:backend/src/main/java/com/matimeline/eventmanager/infrastructure/adapters/export/JsonExportRenderer.java` | 6 | convention 6 |
| `mytimeline:backend/src/main/java/com/matimeline/eventmanager/infrastructure/security/UserRateLimitingFilter.java` | 6 | convention 5, config 1 |
| `mytimeline:backend/src/main/java/com/matimeline/eventmanager/infrastructure/entities/ProductEntity.java` | 4 | convention 2, persistence_query 1, suspicious 1 |
| `mytimeline:backend/src/main/java/com/matimeline/eventmanager/application/dtos/EventCreationRequest.java` | 3 | convention 2, suspicious 1 |
| `mytimeline:backend/src/main/java/com/matimeline/eventmanager/application/validation/StrongPassword.java` | 3 | convention 2, suspicious 1 |

## 7. Relations avec d'autres packs {#relations}

Packs liés par des faits repris, des faits équivalents écartés à la déduplication ou le catalogue.

| Pack | Faits repris | Faits équivalents | Catalogue |
|---|---|---|---|
| timeline | 142 | 74 |  |
| integrations | 9 | 0 |  |
| authorization | 8 | 0 |  |
| state-machine | 1 | 0 |  |

- Faits du pool par pack d'origine : timeline 142, backend-socle 50, integrations 9, authorization 8, state-machine 1

## 8. Tests attendus {#tests}

- Les tests fixent qu'aucune session HTTP serveur n'est créée et qu'aucun cookie JSESSIONID n'est posé, pour une requête anonyme comme authentifiée. [#5928c8a4467023f8-1] [#4bb5fd2a31cd4dd5-1] [#19c21feb236a9de4-1]
- Un test d'intégration de sécurité étend la base Postgres d'intégration et injecte MockMvc, qui traverse la vraie chaîne de filtres. [#8317d54819838941-1] [#2d9da826002f362c-1] [#33c89b3bd0e28692-1]
- Les tests de versions de dépendances échouent sous un plancher lié à une CVE, avec la référence de CVE passée à l'assertion. Tomcat est lu par l'API publique et Jackson 3 par réflexion. [#5bdec60f957ece6c-2] [#b0aa9799cbd37002-1] [#8b0580694f84f313-1]
- Le test de writeJsonError appelle par réflexion une méthode non publique, avec une réponse Mockito dont le writer écrit dans un StringWriter. Il relit le JSON produit avec un ObjectMapper. [#a3cf256b0641324c-1] [#4148f5b761fdc86d-1] [#df8b959c62266125-1]
- Les tests de domaine n'ont aucun contexte Spring. Ils fixent que la date de fin d'un export terminé est la valeur fournie et non dérivée du TTL, et que la préférence de thème rejette les variantes de casse, d'espaces et les valeurs inconnues. [#dec1b07c9a52c00a-1] [#7ac79595659d2d9d-1]
- Un test de service mocke le port de dépôt avec Mockito et laisse injecter le service testé. [#bddd337cc630571f-1]

## 9. Questions ouvertes {#questions}

- Les drapeaux de compte de CustomUserDetails sont-ils volontairement toujours vrais ? Selon le commentaire, tout renvoie true et la logique reste à écrire [#dc03b9374b880075-1].
- UserMapper.toDomain doit-il renseigner la préférence de thème ? Il construit User sans elle, alors que UserResponse la lit [#d86713c491180960-1].
- Les @ManyToOne de ProductEntity doivent-ils être LAZY ? Ils n'ont pas de fetch explicite, alors que la relation owner de CategoryEntity est LAZY [#f8f05e9e0279ea4d-1].

## 10. Alertes {#alerts}

- Le champ events de ProductCreationRequest n'a pas de @Valid, donc les contraintes des EventCreationRequest imbriqués ne sont pas déclenchées par ce DTO [#46620ab1541f7886-1]. Une donnée invalide peut passer à la création de produit, donc ajouter @Valid avant de compter sur ces contraintes.
- Le domaine n'est pas pur malgré la règle hexagonale. Role importe Spring Security [#35b311daffb89d4f-2], le port ProductRepository porte @Repository [#673b6fa03e83df5f-2] et le port ProductService utilise des DTOs applicatifs [#11311ead9b39c530-1].

## 11. Couverture {#coverage}

- Fichiers du pack : 254 ; avec au moins un fait en base : 71 ; sans fait après remise en file : 0.
- Faits en base : 213, repris d'autres packs : +0, hors périmètre : -0, doublons écartés à la déduplication : -3, soit 210 dans le pool.
- Faits du pool venus d'un autre pack : 160 (par pack : section Relations).
- Destination des 210 faits du pool : Conventions 148 ; Points d'entrée du socle 1 ; Tests attendus 30 ; Alertes / Questions ouvertes 22 ; annexe seule 5 ; écartés (sorte `other` ou inconnue) 4.
- Passe technique : scope 254 fichiers, lus 71 (27 %), non lus 183 : ce pack décrit le socle sur un échantillon, pas sur tout son scope.
- Base : sha256 9a61a8cff901…, générée le 2026-11-18.
