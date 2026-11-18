---
pack: backend-socle
kind: technical
name: Socle backend
generated_at: 2026-11-18T12:00:00Z
generator: synth/1
base_sha256: 4be979f6ea5168923dfd048e41abcc924e556b27d10995ba60fbf025491e6cf3
facts_in_base: 229
facts_in_pool: 227
facts_cited: 51
sections: backend-socle.sections.json
details: [backend-socle.details.md]
lang: fr
curated_at: 2026-11-18T14:30:00Z
curation: backend-socle.curation.json
---
## 1. Quand activer {#activate}

Ce pack s'active quand la demande ou le code touche l'un de ces éléments.

- Chemins : `^mytimeline:backend/(?!src/main/resources/db/)`

## 2. Lexique {#lexicon}

Aucun fait de la base ne relève de cette section.

## 3. Conventions {#rules}

### Invariants
- Selon le commentaire de UserEntity, le nom et le type de la colonne de préférence de thème doivent correspondre à la migration V16 quand ddl-auto vaut validate. [#32eaa06d8b33424b-1]
### Jetons JWT et identité
- Les jetons sont signés en RS256 et parseClaims refuse tout autre algorithme. [#4aa88cfacaa0e8d4-1] [#2009e8befcdfb90e-1]
- Une valeur jwt.private-key vide déclenche une paire RS256 éphémère au démarrage, et une clé invalide lève IllegalStateException sans reprendre la valeur configurée. [#be183b621d286328-1] [#d56dbbde62261227-1] [#fac6a46f66104090-1]
- Selon la javadoc, CallerResolver est le point unique d'extraction de l'identité, et currentUser renvoie sans appeler le port si l'authentification est null, non authentifiée ou anonyme. [#b121fef8c04b27cd-1] [#33b11eb6b0aa82ac-2] [#33b11eb6b0aa82ac-3]
### Entités et persistance
- Le soft delete de ProductEntity est une restriction Hibernate sur archived, qui filtre toutes les lectures générées. [#3fb0487b6c2dbb00-1]
- Une énumération est persistée en EnumType.STRING, sauf ThemePreference qui passe par un AttributeConverter sur varchar(16). [#43d75ab7438be436-1] [#32eaa06d8b33424b-2]
### DTO et domaine
- Dans un DTO de mise à jour, null signifie inchangé, un champ optionnel utilise un @Pattern non blanc plutôt que @NotBlank, et clearColor remet la couleur à null. [#c227eff8822478b9-1] [#164b6d90f910bb89-1] [#532f49858a41dbc9-2]
- Les projections de sortie issues d'un modèle domaine (événement, produit, catégorie, utilisateur) se construisent par une méthode statique fromDomain qui lit le modèle sans recalcul [#f1d71478d755056e-1] [#0bd5a0cae9f4e904-1]
- Une contrainte inter-champs se déclare par un getter booléen @AssertTrue et @JsonIgnore. [#f2b4cd18d208b4f8-1]
- Les prédicats temporels du domaine reçoivent now en paramètre, et le Clock est un bean injectable. [#2fae5cab1ab1fc27-1] [#2dce25b3a3f9f4d6-1]
- Les transitions de ExportJob (mark...) ne contrôlent pas l'état précédent. [#185f8a74f15e66fc-1]
### Tests
- BomDriftTest compare les versions par composants numériques avec un plancher minimum, et la référence est une CVE pour spring-security, tomcat, jackson et postgresql, mais un simple alignement sur le BOM pour flyway [#66abb4cdef3eec41-1] [#867f2794346b8c63-1]

## 4. Structure {#structure}

Aucun fait de la base ne relève de cette section.

## 5. Points d'entrée du socle {#surface}

Aucun fait de la base ne relève de cette section.

## 6. Fichiers critiques {#files}

Fichiers du pool au poids le plus élevé (12 sur 64), le poids étant la somme des scores de spécificité de leurs faits. Liste complète : annexe.

| Fichier | Faits | Sortes dominantes |
|---|---|---|
| `mytimeline:backend/src/test/java/com/matimeline/eventmanager/architecture/ArchitectureTest.java` | 23 | convention 18, suspicious 4, config 1 |
| `mytimeline:backend/src/main/java/com/matimeline/eventmanager/infrastructure/security/JwtService.java` | 13 | convention 11, config 1, suspicious 1 |
| `mytimeline:backend/src/test/java/com/matimeline/eventmanager/build/BomDriftTest.java` | 16 | convention 9, other 4, test_case 2 |
| `mytimeline:backend/src/main/java/com/matimeline/eventmanager/infrastructure/entities/CategoryEntity.java` | 10 | convention 9, suspicious 1 |
| `mytimeline:backend/src/main/java/com/matimeline/eventmanager/utils/Utils.java` | 11 | convention 9, other 1, suspicious 1 |
| `mytimeline:backend/src/main/java/com/matimeline/eventmanager/application/validation/StrongPassword.java` | 4 | convention 2, suspicious 2 |
| `mytimeline:backend/src/main/java/com/matimeline/eventmanager/domain/ports/repositories/ProductRepository.java` | 5 | convention 2, persistence_query 2, suspicious 1 |
| `mytimeline:backend/src/main/java/com/matimeline/eventmanager/infrastructure/entities/ProductEntity.java` | 5 | convention 4, suspicious 1 |
| `mytimeline:backend/src/main/java/com/matimeline/eventmanager/infrastructure/security/CallerResolver.java` | 6 | convention 6 |
| `mytimeline:backend/src/main/java/com/matimeline/eventmanager/application/dtos/EventCreationRequest.java` | 4 | convention 3, suspicious 1 |
| `mytimeline:backend/src/main/java/com/matimeline/eventmanager/domain/models/Event.java` | 4 | convention 3, suspicious 1 |
| `mytimeline:backend/src/main/java/com/matimeline/eventmanager/infrastructure/entities/EventEntity.java` | 4 | convention 3, suspicious 1 |

## 7. Relations avec d'autres packs {#relations}

Packs liés par des faits repris, des faits équivalents écartés à la déduplication ou le catalogue.

| Pack | Faits repris | Faits équivalents | Catalogue |
|---|---|---|---|
| timeline | 154 | 65 |  |
| authorization | 9 | 0 |  |
| integrations | 9 | 0 |  |
| state-machine | 1 | 0 |  |

- Faits du pool par pack d'origine : timeline 154, backend-socle 54, authorization 9, integrations 9, state-machine 1

## 8. Tests attendus {#tests}

- Un test d'intégration étend AbstractPostgresIntegrationTest avec SpringBootTest et AutoConfigureMockMvc, et reçoit MockMvc par injection. [#b5e6d1c5023e700a-1] [#087601bf2abf1f8c-1]
- Les tests fixent que, limitation désactivée, une rafale depuis une seule IP ne renvoie jamais 429, l'IP étant posée par un post-processeur sur la requête. [#57050fdbe9c38e6d-1] [#57050fdbe9c38e6d-2]
- Les tests fixent que les références de stockage invalides lèvent IllegalArgumentException, avec un répertoire @TempDir et un adaptateur recréé avant chaque test. [#76d453920ca7bf3e-1] [#42ca0c171861ac7e-1]
- Les cas d'exception de Utils s'écrivent avec assertThatThrownBy puis isInstanceOf. Selon la javadoc, la classe couvre BR-EVE-003 et BR-EVE-004. [#998e745ee408fff7-1] [#cdcd105ce739c440-2]
- Un test de service unitaire utilise MockitoExtension, un Mock pour le repository et InjectMocks pour le service, avec une fabrique privée pour les données. [#bddd337cc630571f-1] [#894540d50ac1fcf3-1]
- Un test de contrat de DTO n'a pas de contexte Spring, utilise un ObjectMapper créé directement, et suffixe _nonBreaking les cas de compatibilité ascendante. [#4fccbc79cc5b6869-1] [#8f2835df25c06050-1]
- Un test de garde de build ne lit que le classpath, sans contexte Spring ni conteneur. [#f5d2085dc3f5fdb3-2]

## 9. Questions ouvertes {#questions}

- L'autorité est-elle préfixée ROLE_ à la source ? Le service de détails utilisateur lit user.getRole() sans préfixe, alors que la Javadoc de CallerResolver cite hasAuthority("ROLE_USER"). [#13cd0990d0682f15-1]
- Product.addEvent doit-il tolérer une liste null ? Le constructeur l'accepte et hasEvents la teste, mais addEvent appelle add sans contrôle. [#e4027da2250fba89-1]
- Pourquoi durationUnit est-il un String libre alors que recurrenceUnit est un enum persisté en STRING ? La base ne le dit pas. [#8f39fdf783d90a95-1]
- Le chargement EAGER par défaut de ProductEntity.category est-il voulu, alors que CategoryEntity.owner déclare LAZY ? [#f8f05e9e0279ea4d-1] [#15b280e64c4e4b41-2]

## 10. Alertes {#alerts}

- La surcharge generateToken(String) émet un jeton sans claim jti, alors que la Javadoc de generateToken(Authentication) affirme que chaque token en embarque un. Ne pas supposer la présence du jti à la lecture d'un token et se fier au code. [#99cdc3c6ad8d23f3-1]
- La règle ArchUnit sur HttpSession est lancée par rule.check sans FreezingArchRule.freeze, contrairement aux autres règles, donc la moindre violation fait échouer le test. Corriger la violation plutôt que chercher à la geler. [#367437a993c52dd8-1]
- Role implémente GrantedAuthority et ProductRepository porte @Repository dans le domaine, deux violations que la javadoc d'ArchitectureTest dit gelées, alors qu'UserRepository n'a pas cette annotation. Ne pas ajouter d'import Spring au domaine et ne pas copier ce marquage. [#35b311daffb89d4f-1] [#673b6fa03e83df5f-1] [#4c15723b9868133f-1] [#0ba5e5c3fda3057c-1]
- ProductService importe des DTOs de la couche application, alors que le port EventService prend des commandes domaine. Pour un nouveau port, suivre le modèle EventService. [#11311ead9b39c530-1] [#c381f6f4da90e746-1]
- Le champ de catégorie s'appelle category à la création de produit, et categoryId à la mise à jour, et Event.setProduct écrit productId alors que son getter est getProductId. Vérifier le nom exact avant d'écrire un client ou un test. [#b43c6c49adde6e57-1] [#125f0a1489463c85-1]

## 11. Couverture {#coverage}

- Fichiers du pack : 253 ; avec au moins un fait en base : 64 ; sans fait après remise en file : 0.
- Faits en base : 229, repris d'autres packs : +0, hors périmètre : -0, doublons écartés à la déduplication : -2, soit 227 dans le pool.
- Faits du pool venus d'un autre pack : 173 (par pack : section Relations).
- Destination des 227 faits du pool : Conventions 144 ; Tests attendus 34 ; Alertes / Questions ouvertes 35 ; annexe seule 5 ; écartés (sorte `other` ou inconnue) 9.
- Passe technique : scope 253 fichiers, lus 64 (25 %), non lus 189 : ce pack décrit le socle sur un échantillon, pas sur tout son scope.
- Base : sha256 4be979f6ea51…, générée le 2026-11-17.
