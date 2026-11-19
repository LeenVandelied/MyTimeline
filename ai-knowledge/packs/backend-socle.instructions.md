---
pack: backend-socle
kind: technical
name: Socle backend
generated_at: 2026-11-19T10:19:38Z
generator: synth/1
base_sha256: 5bc7b5be5a750c2486fd5682c3f95229e4d96b379bfbd516b67269294da05b7d
facts_in_base: 217
facts_in_pool: 214
facts_cited: 47
sections: backend-socle.sections.json
details: [backend-socle.details.md]
lang: fr
curated_at: 2026-11-19T10:32:37Z
curation: backend-socle.curation.json
---
## 1. Quand activer {#activate}

Ce pack s'active quand la demande ou le code touche l'un de ces éléments.

- Chemins : `^mytimeline:backend/`

## 2. Lexique {#lexicon}

Aucun fait de la base ne relève de cette section.

## 3. Conventions {#rules}

### Invariants
- Selon le commentaire de V10, les migrations déjà appliquées ne s'éditent jamais (checksum mismatch Flyway), seule la nouvelle migration se crée ou se modifie, voir `mytimeline:backend/src/main/resources/db/migration/V10__create_sessions.sql:29`. [#7793e6ac844572f9-1]
- Selon le commentaire de V12, une migration sensible ne s'exécute pas en production sans décision humaine et se valide par Testcontainers ou base locale. [#653a9e0589dd5d3c-1]
- Selon le commentaire de V16, tout check est nommé, car un check anonyme reçoit un nom automatique que drop constraint if exists ne retire pas. [#835d774a06b36ae8-1]
### Jetons JWT
- Sans propriété jwt.private-key, une paire de clés éphémère est générée, et une clé mal formée lève IllegalStateException sans reprendre la valeur configurée. [#be183b621d286328-1] [#fac6a46f66104090-1]
- Les jetons durent deux jours et portent un jti UUID aléatoire dans la surcharge qui prend un Authentication. [#6991271ce38552fd-1] [#4aa88cfacaa0e8d4-2]
- L'identité courante se lit par CallerResolver, qui renvoie un Optional vide pour un contexte absent ou anonyme, le statut HTTP revenant à l'appelant. [#33b11eb6b0aa82ac-1] [#33b11eb6b0aa82ac-2]
### Contrôles d'entrée (DTOs)
- Selon la javadoc, StrongPassword ne se pose jamais sur le chemin d'authentification, seulement à la création et à la modification. [#636cd91bb727056f-1]
- Un champ optionnel de PATCH se valide par @Pattern et non @NotBlank, et un reset explicite passe par un booléen dédié comme clearColor. [#c227eff8822478b9-1] [#164b6d90f910bb89-1]
- Une contrainte inter-champs est un getter booléen @AssertTrue marqué @JsonIgnore. [#f2b4cd18d208b4f8-1]
### Domaine et persistance
- Le domaine reste du Java pur (seul jakarta.validation est toléré) et la date courante lui est passée en paramètre, jamais lue d'une horloge. [#0841acefee4fcf8b-3] [#2fae5cab1ab1fc27-1]
- Un enum se persiste par @Enumerated STRING ou par un AttributeConverter quand la valeur externe diffère, comme pour le thème. [#43d75ab7438be436-1] [#32eaa06d8b33424b-1]
- Les ports de lecture portent le préfixe findDomain et renvoient le modèle domaine. [#8468edc4e1e50cd1-1] [#3c11ce3de33a73db-1]
### Migrations SQL
- Un ajout de check est précédé de drop constraint if exists, et sur base peuplée un update d'assainissement le précède (V7, V9, V11, V12) ou un pré-vol fail-fast qui fait échouer la migration (V4) [#d5271eab61c0cf95-1] [#b9992fcd84a4c204-1]
### Garde-fous de build et d'architecture
- Les planchers de versions du BOM se comparent composant par composant et par supérieur ou égal, et un échec demande de corriger le BOM sans relâcher le plancher. [#867f2794346b8c63-1] [#b478ea1a7760efcf-4] [#b478ea1a7760efcf-3]
### Vérifié dans le code
- En production, les jetons de session se génèrent par JwtService.generateToken(Authentication), qui pose le jti. La surcharge generateToken(String) n'en pose pas et n'est appelée que par des tests [#authorization/7daa5bfd6bbe5c58-2] [#session/63728926abba7e76-2] [#4aa88cfacaa0e8d4-2] `mytimeline:backend/src/main/java/com/matimeline/eventmanager/infrastructure/security/JwtService.java:164-168`.
- La colonne users.role est bornée par une contrainte CHECK à ROLE_USER ou ROLE_ADMIN. Toute nouvelle valeur de rôle exige une migration qui modifie cette contrainte [#user/7c4408ec81275c4c-1] [#b9992fcd84a4c204-1] `mytimeline:backend/src/main/resources/db/migration/V12__users_role_not_null_check.sql:50-52`.

## 4. Structure {#structure}

Aucun fait de la base ne relève de cette section.

## 5. Points d'entrée du socle {#surface}

- Le soft delete des produits repose sur un booléen d'archivage et un filtre Hibernate qui masque les lignes archivées dans toutes les lectures générées, voir `mytimeline:backend/src/main/java/com/matimeline/eventmanager/infrastructure/entities/ProductEntity.java:25`. [#162db58b82426b45-1]

## 6. Fichiers critiques {#files}

Fichiers du pool au poids le plus élevé (12 sur 79), le poids étant la somme des scores de spécificité de leurs faits. Liste complète : annexe.

| Fichier | Faits | Sortes dominantes |
|---|---|---|
| `mytimeline:backend/src/test/java/com/matimeline/eventmanager/build/BomDriftTest.java` | 20 | convention 17, suspicious 3 |
| `mytimeline:backend/src/test/java/com/matimeline/eventmanager/architecture/ArchitectureTest.java` | 16 | convention 11, suspicious 2, test_case 2 |
| `mytimeline:backend/src/main/java/com/matimeline/eventmanager/infrastructure/security/JwtService.java` | 13 | convention 9, config 2, other 1 |
| `mytimeline:backend/src/main/java/com/matimeline/eventmanager/infrastructure/entities/CategoryEntity.java` | 8 | convention 7, suspicious 1 |
| `mytimeline:backend/src/main/java/com/matimeline/eventmanager/utils/Utils.java` | 8 | convention 7, suspicious 1 |
| `mytimeline:backend/src/main/resources/db/migration/V10__create_sessions.sql` | 7 | convention 6, suspicious 1 |
| `mytimeline:backend/src/main/java/com/matimeline/eventmanager/infrastructure/entities/ProductEntity.java` | 4 | persistence_query 2, convention 1, suspicious 1 |
| `mytimeline:backend/src/test/java/com/matimeline/eventmanager/application/services/SessionServiceImplTest.java` | 4 | convention 3, suspicious 1 |
| `mytimeline:backend/src/test/java/com/matimeline/eventmanager/support/AbstractPostgresIntegrationTest.java` | 6 | convention 4, config 1, other 1 |
| `mytimeline:backend/src/main/java/com/matimeline/eventmanager/application/validation/StrongPassword.java` | 3 | convention 2, suspicious 1 |
| `mytimeline:backend/src/main/java/com/matimeline/eventmanager/domain/models/Event.java` | 3 | convention 2, suspicious 1 |
| `mytimeline:backend/src/main/java/com/matimeline/eventmanager/domain/ports/repositories/ProductRepository.java` | 3 | convention 1, persistence_query 1, suspicious 1 |

## 7. Relations avec d'autres packs {#relations}

Packs liés par des faits repris, des faits équivalents écartés à la déduplication ou le catalogue.

| Pack | Faits repris | Faits équivalents | Catalogue |
|---|---|---|---|
| user | 39 | 16 |  |
| event | 34 | 17 |  |
| session | 27 | 17 |  |
| product | 14 | 15 |  |
| category | 17 | 9 |  |
| export | 11 | 5 |  |

- Faits du pool par pack d'origine : backend-socle 72, user 39, event 34, session 27, category 17, product 14, export 11

## 8. Tests attendus {#tests}

- Les tests fixent que `ThemePreference.fromValue` rejette toute valeur hors casse exacte (majuscules, espaces autour, chaîne vide, alias) par une IllegalArgumentException, à travers un test paramétré. [#7ac79595659d2d9d-1] [#7ac79595659d2d9d-2] Voir `mytimeline:backend/src/test/java/com/matimeline/eventmanager/domain/models/ThemePreferenceTest.java:14-30`.
- Les tests fixent que l'adaptateur de stockage local fait un aller-retour store puis load, rejette une extension invalide par IllegalArgumentException et que la suppression est idempotente (le second appel ne lève rien). [#75ea9abb504a49ac-1] [#d3de47ed0eeffbf8-1] [#d75ab033ef9dd764-1]
- Les tests fixent que l'indicateur de santé Brevo n'expose la clé d'API dans aucune valeur de détail. [#379fa4542b4614bf-1] Voir `mytimeline:backend/src/test/java/com/matimeline/eventmanager/infrastructure/adapters/email/BrevoHealthIndicatorTest.java:42-48`.
- Les tests fixent que `ClientIpAnonymizer` met à zéro le dernier octet d'une IPv4, par appel statique direct sans contexte Spring. [#904428da9b653810-1]
- Un test d'intégration web étend AbstractPostgresIntegrationTest du package support, avec @SpringBootTest et @AutoConfigureMockMvc. [#b5e6d1c5023e700a-1]
- Une variante de configuration se pose par @TestPropertySource sur la classe, ce qui crée un contexte Spring distinct, et l'IP source se simule par setRemoteAddr dans .with(req -> ...). [#b5e6d1c5023e700a-2] [#57050fdbe9c38e6d-1]

## 9. Questions ouvertes {#questions}

- Les quatre drapeaux de compte de CustomUserDetails sont-ils volontairement toujours vrais ? Un commentaire dit « need to implement logic », aucun fait de code ne montre une vérification d'expiration ou de verrouillage [#ee0b912378de363f-1].
- La javadoc de Utils.validateEventType dit qu'une DataIntegrityViolationException est masquée en 401 par le dispatch /error de SecurityConfig. Aucun fait de ce lot ne confirme ce comportement, et le code lève seulement InvalidEventTypeException [#6df034d8368a6353-1] [#d42d26bc82bc66fd-2].
- Le commentaire de V10 réserve V11 à un autre ticket (#78), alors qu'un fichier V11 existe déjà. La base ne dit pas si la réserve est levée [#db6492a31cfbd9c9-1].

## 10. Alertes {#alerts}

- Le record RenderedExport expose directement son tableau d'octets mutable, et ses equals et hashCode comparent les références de tableau, malgré la javadoc qui parle de valeur immuable. Ne pas comparer deux exports avec equals et ne pas modifier le contenu reçu, ou copier le tableau [#aa81f9b911dcabe9-1].
- Dans Event, la méthode setProduct reçoit un identifiant de produit et écrit productId, alors que les autres setters suivent le nom du champ. Une recherche de setProductId ne la trouve pas, donc l'appeler sous ce nom exact [#125f0a1489463c85-1].
- Le domaine importe Spring dans Role (GrantedAuthority) et dans le port ProductRepository (@Repository), contre le principe d'un domaine sans Spring, et UserRepository n'a pas cette annotation ⇒ Ne pas copier ce motif dans un nouveau modèle ou port [#35b311daffb89d4f-1] [#673b6fa03e83df5f-1]
- Dans ArchitectureTest, la règle sur HttpSession appelle check sans freeze, contrairement aux autres règles. Une violation fait échouer le test sans passer par une baseline, donc corriger le code plutôt que geler [#367437a993c52dd8-1].

## 11. Couverture {#coverage}

- Fichiers du pack : 270 ; avec au moins un fait en base : 79 ; sans fait après remise en file : 0.
- Faits en base : 217, repris d'autres packs : +0, hors périmètre : -0, doublons écartés à la déduplication : -3, soit 214 dans le pool.
- Faits du pool venus d'un autre pack : 142 (par pack : section Relations).
- Destination des 214 faits du pool : Conventions 156 ; Points d'entrée du socle 2 ; Tests attendus 16 ; Alertes / Questions ouvertes 29 ; annexe seule 4 ; écartés (sorte `other` ou inconnue) 7.
- Passe technique : scope 270 fichiers, lus 79 (29 %), non lus 191 : ce pack décrit le socle sur un échantillon, pas sur tout son scope.
- Base : sha256 5bc7b5be5a75…, générée le 2026-11-19.
