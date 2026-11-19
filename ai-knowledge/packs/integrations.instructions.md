---
pack: integrations
kind: transversal
name: Intégrations externes et export
generated_at: 2026-11-18T16:25:37Z
generator: synth/1
base_sha256: ae69bce89a10b8531f1efac49a7bc8b64dae3be866c0bffd63f2eb0ff1cf2c63
facts_in_base: 391
facts_in_pool: 108
facts_cited: 36
sections: integrations.sections.json
details: [integrations.details.md]
lang: fr
curated_at: 2026-11-18T16:25:37Z
curation: integrations.curation.json
---
## 1. Quand activer {#activate}

Ce pack s'active quand la demande ou le code touche l'un de ces éléments.

- Chemins : `(Brevo|ExportRenderer|ZipExport|PasswordResetEmailTemplate|EmailService|StorageConfig|LocalStorage)`

## 2. Lexique {#lexicon}

Aucun fait de la base ne relève de cette section.

## 3. Règles du motif {#rules}

### Invariants
- Selon la javadoc, le stockage local a un bean par usage sur un répertoire distinct, et chaque injection de StoragePort doit porter un qualifier. [#0041f21f67193426-1] [#0041f21f67193426-3]
### Stockage local
- Le nom stocké est un UUID plus une extension, jamais dérivé du nom client, et l'extension hors 1 à 5 caractères alphanumériques minuscules lève IllegalArgumentException. [#1a1fec74340ec77e-1] [#6f4983af9414aa47-1]
- Une référence nulle, vide, avec séparateur ou '..', ou dont le chemin résolu sort du répertoire de base, lève IllegalArgumentException. [#381d4591926b8291-1] [#381d4591926b8291-2]
### Export de données
- Le CSV préfixe d'une apostrophe tout champ commençant par un signe de formule, puis échappe selon RFC 4180. [#64f39489a8c24fb5-1] [#8b52ae90d30c1625-1]
- Le ZIP est construit en mémoire et réutilise les rendus JSON, Markdown et CSV sous data.json, data.md et data.csv. [#35a51e5f0043333c-1] [#35a51e5f0043333c-3]
### Email de réinitialisation
- Sans clé API, l'envoi est ignoré sans appel HTTP et un warning est journalisé. [#60b20fc9921c8347-1] [#1e979c5fd365d269-1]
- Une RestClientException à l'envoi est journalisée et n'est pas propagée à l'appelant. [#60b20fc9921c8347-3]
- La locale ignore casse et région, et retombe sur le français. [#424bd631166a816d-1] [#2a75f7941ba689a8-1]
### Vérifié dans le code
- Dans E2eResetTokenFinderJpaAdapter.findLatestUsableToken, la récence est portée par expiresAt DESC (proxy valable tant que la TTL est constante) et t.id DESC ne sert qu'à départager [#0c3b8b5d276d059a-1] [#timeline/0ff8f26bcd36d07e-1] [#timeline/a77b308ca87756a8-1] `mytimeline:backend/src/main/java/com/matimeline/eventmanager/infrastructure/adapters/testsupport/E2eResetTokenFinderJpaAdapter.java:54-58`.

## 4. Structure {#structure}

Aucun fait de la base ne relève de cette section.

## 5. Mise en œuvre par domaine {#surface}

### Récupération du jeton de réinitialisation pour les tests E2E
- La requête de recherche du dernier jeton utilisable se trouve dans `mytimeline:backend/src/main/java/com/matimeline/eventmanager/infrastructure/adapters/testsupport/E2eResetTokenFinderJpaAdapter.java:54-58`, elle vise l'entité PasswordResetTokenEntity par son nom simple et ne projette que la colonne du jeton [#0c3b8b5d276d059a-1]

## 6. Fichiers critiques {#files}

Fichiers du pool au poids le plus élevé (11 sur 25), le poids étant la somme des scores de spécificité de leurs faits. Liste complète : annexe.

| Fichier | Faits | Sortes dominantes |
|---|---|---|
| `mytimeline:backend/src/main/java/com/matimeline/eventmanager/infrastructure/adapters/email/BrevoEmailService.java` | 12 | external_call 7, convention 4, config 1 |
| `mytimeline:backend/src/main/java/com/matimeline/eventmanager/infrastructure/adapters/LocalStorageAdapter.java` | 8 | validation 3, convention 2, other 2 |
| `mytimeline:backend/src/test/java/com/matimeline/eventmanager/infrastructure/adapters/email/BrevoEmailServiceLocaleTest.java` | 9 | test_case 5, convention 2, external_call 2 |
| `mytimeline:backend/src/main/java/com/matimeline/eventmanager/infrastructure/adapters/testsupport/E2eResetTokenFinderJpaAdapter.java` | 5 | convention 3, persistence_query 1, suspicious 1 |
| `mytimeline:backend/src/main/java/com/matimeline/eventmanager/application/services/ExportRendererRegistry.java` | 4 | convention 2, suspicious 1, validation 1 |
| `mytimeline:backend/src/main/java/com/matimeline/eventmanager/infrastructure/adapters/export/CsvExportRenderer.java` | 5 | convention 4, validation 1 |
| `mytimeline:backend/src/test/java/com/matimeline/eventmanager/infrastructure/adapters/export/ExportRenderersTest.java` | 11 | test_case 8, convention 3 |
| `mytimeline:backend/src/main/java/com/matimeline/eventmanager/infrastructure/config/StorageConfig.java` | 6 | convention 3, config 2, other 1 |
| `mytimeline:backend/src/main/java/com/matimeline/eventmanager/infrastructure/adapters/export/MarkdownExportRenderer.java` | 4 | convention 4 |
| `mytimeline:backend/src/main/java/com/matimeline/eventmanager/infrastructure/adapters/export/ZipExportRenderer.java` | 5 | convention 4, other 1 |
| `mytimeline:backend/src/main/java/com/matimeline/eventmanager/infrastructure/adapters/email/PasswordResetEmailTemplate.java` | 3 | convention 3 |

## 7. Relations avec d'autres packs {#relations}

Packs liés par des faits repris, des faits équivalents écartés à la déduplication ou le catalogue.

| Pack | Faits repris | Faits équivalents | Catalogue |
|---|---|---|---|
| timeline | 85 | 37 | oui |
| frontend-socle | 2 | 0 |  |

- Faits du pool par pack d'origine : timeline 85, integrations 21, frontend-socle 2

## 8. Tests attendus {#tests}

- Les tests fixent que les rendus JSON et Markdown de l'export ne contiennent jamais le hash du mot de passe [#2ee6e70558a01924-1] [#b6c46816605b971d-1].
- Les tests fixent que les champs CSV commençant par @, = ou - ou par un saut de ligne reçoivent une apostrophe en tête, puis des guillemets si nécessaire [#f31607d729555ad2-1] [#271360493da3f939-1].
- Les tests fixent que le ZIP contient data.json, data.md et data.csv, et que le nom de fichier commence par mytimeline-export- sans identifiant utilisateur [#dfb8aa6061657764-1] [#4ee17d496acc51ca-1].
- Les tests fixent que le stockage local rejette par une IllegalArgumentException les références de type path traversal en load et delete [#6370768e2f4f6dde-1] [#e4b07cd063572333-1].
- Les tests fixent que delete est idempotent et que store puis load conserve l'extension sur un répertoire temporaire [#a1f67c5fae1badd3-1] [#92ce5b0e34535e58-1].
- Les tests fixent que toute locale absente, inconnue ou hostile retombe sur le français, et que la casse et le sous-tag de région sont ignorés [#adb4712c956147b0-1] [#d97eba2cdca557f1-3] [#3de9961cfcdacd70-1].
- Les tests fixent que sans clé d'API Brevo aucun appel HTTP n'est émis, le test comptant les corps capturés [#52720a500310ccdf-1].
- Les tests fixent que l'indicateur de santé Brevo est DOWN pour une clé nulle ou blanche, UP sinon, sans jamais exposer la clé [#bebc0555404acb33-1] [#e671c9d0e878ab41-2] [#096f7886865e90ea-1] [#e671c9d0e878ab41-4].

## 9. Questions ouvertes {#questions}

Aucun fait de la base ne relève de cette section.

## 10. Alertes {#alerts}

Aucun fait de la base ne relève de cette section.

## 11. Couverture {#coverage}

- Fichiers du pack : 87 ; avec au moins un fait en base : 71 ; sans fait après remise en file : 0.
- Faits en base : 391, repris d'autres packs : +0, hors périmètre : -283, doublons écartés à la déduplication : -0, soit 108 dans le pool.
- Faits du pool venus d'un autre pack : 87 (par pack : section Relations).
- Destination des 108 faits du pool : Règles du motif 67 ; Mise en œuvre par domaine 1 ; Tests attendus 28 ; Alertes / Questions ouvertes 4 ; annexe seule 1 ; écartés (sorte `other` ou inconnue) 7.
- Passe transversale : scope 87 fichiers, lus 74 (85 %), non lus 13 : ce pack décrit le motif sur un échantillon, pas sur tout son scope.
- Base : sha256 ae69bce89a10…, générée le 2026-11-18.
