---
pack: backend-socle
kind: technical
name: Socle backend
generated_at: 2026-11-17T10:45:41Z
generator: synth/1
base_sha256: 522b501666f9abbb5144df510e94699de89261cc0afbd60f65da445f1a4ea3d5
facts_in_base: 229
facts_in_pool: 227
facts_cited: 51
sections: backend-socle.sections.json
details: [backend-socle.details.md]
lang: fr
curated_at: 2026-11-17T10:45:42Z
curation: backend-socle.curation.json
---
## 1. Quand activer {#activate}

Ce pack s'active quand la demande ou le code touche l'un de ces éléments.

- Chemins : `^mytimeline:backend/(?!src/main/resources/db/)`

## 2. Lexique {#lexicon}

Aucun fait de la base ne relève de cette section.

## 3. Conventions {#rules}

### Sécurité et JWT
- Voir `mytimeline:backend/src/main/java/com/matimeline/eventmanager/infrastructure/security/JwtService.java:220-236` (pointeur, détail en annexe) [#2009e8befcdfb90e-1] [#4aa88cfacaa0e8d4-1].
- Une propriété jwt.private-key vide déclenche une paire RS256 éphémère au démarrage, et une clé invalide lève IllegalStateException sans reprendre la valeur configurée [#be183b621d286328-1] [#fac6a46f66104090-1].
- Voir `mytimeline:backend/src/main/java/com/matimeline/eventmanager/infrastructure/security/JwtService.java:221-223` (pointeur, détail en annexe) [#2009e8befcdfb90e-2] [#e7e48dce92f507bc-1].
- Voir `mytimeline:backend/src/main/java/com/matimeline/eventmanager/infrastructure/security/CallerResolver.java:60-68` (pointeur, détail en annexe) [#33b11eb6b0aa82ac-2].
### Domaine et persistance
- Le soft delete de Product passe par un filtre d'entité sur archived, qui s'applique à toutes les lectures Hibernate [#3fb0487b6c2dbb00-1].
- Le modèle domaine ne lit pas l'horloge, les prédicats temporels reçoivent now en paramètre [#2fae5cab1ab1fc27-1].
- Les transitions mark... de ExportJob ne vérifient pas l'état précédent [#185f8a74f15e66fc-1].
- Les entités portent un champ version, des champs d'audit sans setter et un equals par id non nul [#353d4149bc66a185-1] [#aefb4a0a2a939e49-1] [#322992155a7f5945-1].
### DTO et validation
- Dans un DTO de mise à jour partielle, null signifie inchangé, donc un champ optionnel refuse le blanc par un motif et clearColor remet à null [#c227eff8822478b9-1] [#164b6d90f910bb89-1].
- Les valeurs d'enum reçues en String sont validées par un motif listant les valeurs acceptées [#dbd2bbe2eddcb65f-1].
### Architecture et tests
- Voir `mytimeline:backend/src/test/java/com/matimeline/eventmanager/architecture/ArchitectureTest.java:76-77` (pointeur, détail en annexe) [#0841acefee4fcf8b-4] [#5a27d2f742342c4e-1].
- Les tests d'intégration étendent la base PostgreSQL du package support, avec profil test [#e735bef1d1794d75-1] [#551da21a5dbc23fe-1].
- BomDriftTest vérifie des planchers de version liés à une référence CVE, par comparaison numérique [#66abb4cdef3eec41-1] [#867f2794346b8c63-1].

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
| timeline | 0 | 65 |  |

- Faits du pool par pack d'origine : timeline 154, backend-socle 54, authorization 9, integrations 9, state-machine 1

## 8. Tests attendus {#tests}

- Voir `mytimeline:backend/src/test/java/com/matimeline/eventmanager/infrastructure/security/ClientIpAnonymizerTest.java:16` (pointeur, détail en annexe) [#904428da9b653810-1] [#55610e4f5ae3174e-1].
- Les tests fixent que l'indicateur de santé Brevo n'expose dans son détail aucune valeur contenant la clé transmise [#379fa4542b4614bf-1].
- Les tests fixent que, limitation de débit désactivée, une rafale depuis une même IP ne renvoie jamais 429 [#57050fdbe9c38e6d-2].
- Voir `mytimeline:backend/src/test/java/com/matimeline/eventmanager/infrastructure/adapters/LocalStorageAdapterTest.java:60-76` (pointeur, détail en annexe) [#76d453920ca7bf3e-1] [#d3de47ed0eeffbf8-1].
- Les tests fixent que la fin d'un export terminé reprend la valeur fournie et non une valeur dérivée de l'expiration [#dec1b07c9a52c00a-2].
- Voir `mytimeline:backend/src/test/java/com/matimeline/eventmanager/utils/UtilsTest.java:44-53` (pointeur, détail en annexe) [#998e745ee408fff7-1] [#6b45ece8d5589a12-1].
- Voir `mytimeline:backend/src/test/java/com/matimeline/eventmanager/domain/models/ThemePreferenceTest.java:17-24` (pointeur, détail en annexe) [#e966087c821ce577-1] [#7ac79595659d2d9d-1].
- Le test de contrat du DTO de création d'événement fixe qu'une requête sans couleur reste valide (compatibilité ascendante) [#8f2835df25c06050-1].
- Un test d'intégration étend AbstractPostgresIntegrationTest avec @SpringBootTest et @AutoConfigureMockMvc, et fixe l'IP distante par un RequestPostProcessor sur la requête [#b5e6d1c5023e700a-1] [#57050fdbe9c38e6d-1].
- Un test de service unitaire utilise MockitoExtension avec un mock du repository et le service en @InjectMocks, et construit ses données par une fabrique privée [#bddd337cc630571f-1] [#894540d50ac1fcf3-1].

## 9. Questions ouvertes {#questions}

- L'autorité est-elle bien préfixée par ROLE_ ? CustomUserDetailsService utilise user.getRole() sans préfixe, alors que la Javadoc de CallerResolver cite hasAuthority("ROLE_USER") [#13cd0990d0682f15-1].
- Pourquoi User.role est-il une String alors qu'une énumération Role existe [#59cca22916afa937-1], et durationUnit un String libre alors que recurrenceUnit est un enum [#8f39fdf783d90a95-1] ?
- La langue des messages de validation est-elle voulue ? Les DTOs sont en anglais et le message par défaut de StrongPassword en français [#980e714db9758450-1] [#a1a112644f96b401-1].

## 10. Alertes {#alerts}

- Voir `mytimeline:backend/src/main/java/com/matimeline/eventmanager/infrastructure/security/JwtService.java:145-156` (pointeur, détail en annexe) [#99cdc3c6ad8d23f3-1].
- UserMapper.toDomain ne transmet pas themePreference au constructeur de User, alors que UserResponse.fromDomain lit cette valeur [#d86713c491180960-1]. La préférence exposée peut ne pas refléter la colonne persistée, donc corriger le mapper avant d'ajouter un usage de ce champ.
- Voir `mytimeline:backend/src/test/java/com/matimeline/eventmanager/architecture/ArchitectureTest.java:183` (pointeur, détail en annexe) [#367437a993c52dd8-1].
- CustomUserDetails renvoie true en constante pour les quatre indicateurs de compte, la logique reste à écrire selon un commentaire [#dc03b9374b880075-1]. Un compte verrouillé, expiré ou désactivé n'est pas refusé par ces indicateurs, donc ne pas compter dessus.
- La relation category de ProductEntity n'a pas de fetch explicite, donc EAGER par défaut, alors que CategoryEntity.owner est LAZY [#f8f05e9e0279ea4d-1]. Chaque chargement de produit charge sa catégorie, donc déclarer le fetch si ce coût gêne.
- Voir `mytimeline:backend/src/main/java/com/matimeline/eventmanager/domain/models/Product.java:66-68` (pointeur, détail en annexe) [#e4027da2250fba89-1].
- Les noms divergent, Event a setProduct mais getProductId , et le champ de catégorie vaut category à la création de produit et categoryId à la mise à jour ⇒ Vérifier le nom exact avant d'écrire un appel ou un JSON [#125f0a1489463c85-1] [#b43c6c49adde6e57-1]

## 11. Couverture {#coverage}

- Fichiers du pack : 253 ; cités par au moins un fait : 64 ; non cités définitifs : 0.
- Faits en base : 229 ; dans le pool après déduplication : 227 (dont 0 repris d'autres packs) ; cités dans ce pack : 52 ; en annexe : 184 ; ni cités ni en annexe : 18 ; écartés (sorte `other`) : 9.
- Fichiers dont au moins un fait est cité ici : 30 sur 253.
- Passe technique : scope 253 fichiers, lus 64 (25 %), non lus 189 : ce pack décrit le socle sur un échantillon, pas sur tout son scope.
- Base : sha256 522b501666f9…, générée le 2026-11-17.
