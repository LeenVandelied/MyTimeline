---
pack: integrations
kind: transversal
name: Intégrations externes et export
generated_at: 2026-11-18T12:00:00Z
generator: synth/1
base_sha256: 784e24ee6a2a8e5a98c77d896f4897139cc0b9ca182320900bb48e938f981bf4
facts_in_base: 384
facts_in_pool: 114
facts_cited: 25
sections: integrations.sections.json
details: [integrations.details.md]
lang: fr
curated_at: 2026-11-18T14:30:00Z
curation: integrations.curation.json
---
## 1. Quand activer {#activate}

Ce pack s'active quand la demande ou le code touche l'un de ces éléments.

- Chemins : `(Brevo|ExportRenderer|ZipExport|PasswordResetEmailTemplate|EmailService|StorageConfig|LocalStorage)`

## 2. Lexique {#lexicon}

Aucun fait de la base ne relève de cette section.

## 3. Règles du motif {#rules}

### Invariants
- Selon la javadoc de StorageConfig, chaque usage de stockage a son propre répertoire et deux beans StoragePort coexistent, donc chaque injection doit être désambiguïsée par un qualifier. [#0041f21f67193426-1] [#0041f21f67193426-3]
### Stockage de fichiers
- Le nom stocké est un UUID plus une extension validée, jamais le nom fourni par le client. [#1a1fec74340ec77e-1]
- Une référence nulle, vide, avec séparateur ou deux points est rejetée, et le chemin normalisé doit rester sous le répertoire de base. [#381d4591926b8291-1] [#381d4591926b8291-2]
- Une IOException d'écriture devient une UncheckedIOException au message générique, et delete reste idempotent. [#54e96a576c000c98-1] [#2657ab0430e16622-1]
### Emails de réinitialisation (Brevo)
- Sans clé API, l'envoi est un no-op avec un warning, aucun appel HTTP n'est fait. [#60b20fc9921c8347-1]
- Le nom et le lien sont échappés en HTML avant le template, qui attend des valeurs déjà échappées. [#1c9019c73cd45014-1] [#4629fb93ffcd3c8e-1]
- Une locale nulle, vide ou inconnue retombe sur le template FR, et fr-FR est réduit à fr. [#424bd631166a816d-1] [#7b3034446febe012-1]
### Export de données
- Le CSV préfixe d'une apostrophe les valeurs débutant par =, +, -, @, tabulation ou retour, en plus de l'échappement RFC 4180. [#64f39489a8c24fb5-1] [#8b52ae90d30c1625-1]
- Le ZIP contient toujours data.json, data.md et data.csv, et une erreur JSON lève une IllegalStateException générique. [#35a51e5f0043333c-1] [#7d8d741b47214f47-1]
### Vérifié dans le code
- Le nom est échappé une seule fois par HtmlUtils.htmlEscape dans BrevoEmailService.buildPayload. PasswordResetEmailTemplate.htmlContent attend des valeurs déjà échappées et ne les échappe pas à nouveau [#1c9019c73cd45014-1] [#timeline/ea05fb9f5d7a3ef0-2] [#timeline/ea05fb9f5d7a3ef0-1] `mytimeline:backend/src/main/java/com/matimeline/eventmanager/infrastructure/adapters/email/BrevoEmailService.java:120-127`.

## 4. Structure {#structure}

Aucun fait de la base ne relève de cette section.

## 5. Mise en œuvre par domaine {#surface}

Aucun fait de la base ne relève de cette section.

## 6. Fichiers critiques {#files}

Fichiers du pool au poids le plus élevé (11 sur 27), le poids étant la somme des scores de spécificité de leurs faits. Liste complète : annexe.

| Fichier | Faits | Sortes dominantes |
|---|---|---|
| `mytimeline:backend/src/main/java/com/matimeline/eventmanager/infrastructure/adapters/email/BrevoEmailService.java` | 12 | external_call 5, convention 4, config 2 |
| `mytimeline:backend/src/main/java/com/matimeline/eventmanager/infrastructure/adapters/LocalStorageAdapter.java` | 9 | convention 4, validation 3, config 1 |
| `mytimeline:backend/src/main/java/com/matimeline/eventmanager/infrastructure/adapters/export/CsvExportRenderer.java` | 8 | convention 8 |
| `mytimeline:backend/src/main/java/com/matimeline/eventmanager/infrastructure/adapters/testsupport/E2eResetTokenFinderJpaAdapter.java` | 6 | convention 4, config 1, persistence_query 1 |
| `mytimeline:backend/src/test/java/com/matimeline/eventmanager/infrastructure/adapters/export/ExportRenderersTest.java` | 8 | convention 4, test_case 4 |
| `mytimeline:backend/src/main/java/com/matimeline/eventmanager/application/services/ExportRendererRegistry.java` | 5 | convention 2, external_call 1, other 1 |
| `mytimeline:backend/src/main/java/com/matimeline/eventmanager/infrastructure/config/StorageConfig.java` | 6 | convention 3, config 2, other 1 |
| `mytimeline:backend/src/main/java/com/matimeline/eventmanager/infrastructure/adapters/email/PasswordResetEmailTemplate.java` | 4 | convention 4 |
| `mytimeline:backend/src/main/java/com/matimeline/eventmanager/infrastructure/adapters/export/JsonExportRenderer.java` | 5 | convention 4, other 1 |
| `mytimeline:backend/src/main/java/com/matimeline/eventmanager/infrastructure/adapters/export/ZipExportRenderer.java` | 5 | convention 4, other 1 |
| `mytimeline:backend/src/test/java/com/matimeline/eventmanager/infrastructure/adapters/email/BrevoEmailServiceLocaleTest.java` | 9 | test_case 5, other 2, config 1 |

## 7. Relations avec d'autres packs {#relations}

Packs liés par des faits repris, des faits équivalents écartés à la déduplication ou le catalogue.

| Pack | Faits repris | Faits équivalents | Catalogue |
|---|---|---|---|
| timeline | 91 | 46 | oui |
| frontend-socle | 1 | 0 |  |

- Faits du pool par pack d'origine : timeline 91, integrations 22, frontend-socle 1

## 8. Tests attendus {#tests}

- Les tests fixent qu'avec une clé API vide le service n'émet aucun appel HTTP, quelle que soit la langue [#52720a500310ccdf-1].
- Les tests fixent que la valeur de la clé API n'apparaît dans aucun détail du health indicator [#e671c9d0e878ab41-4].
- Les tests fixent que load et delete du stockage local lèvent IllegalArgumentException pour une référence de traversée de chemin [#6370768e2f4f6dde-1] [#e4b07cd063572333-1].
- Les tests fixent que la référence retournée par store garde l'extension demandée sans séparateur de chemin [#92ce5b0e34535e58-1].

## 9. Questions ouvertes {#questions}

Aucun fait de la base ne relève de cette section.

## 10. Alertes {#alerts}

- Sans clé Brevo, l'envoi de l'email de réinitialisation est ignoré avec un simple log WARN, sans erreur ni signal externe, dans `mytimeline:backend/src/main/java/com/matimeline/eventmanager/infrastructure/adapters/email/BrevoEmailService.java:82`. Qui modifie ce flux ne verra aucun échec si la configuration manque, donc ne comptez pas sur une exception et vérifiez la clé via BrevoHealthIndicator en profil prod [#1e979c5fd365d269-1].
- Le test de contrainte de base accepte n'importe quelle exception, sans vérifier qu'il s'agit d'une violation de contrainte, dans `mytimeline:backend/src/test/java/com/matimeline/eventmanager/infrastructure/adapters/controllers/ThemePreferenceIntegrationTest.java:235`. Il reste vert même si l'échec vient d'une autre cause, donc resserrez le type d'exception attendu avant de vous y fier [#24915c20890dd350-1].

## 11. Couverture {#coverage}

- Fichiers du pack : 85 ; avec au moins un fait en base : 64 ; sans fait après remise en file : 0.
- Faits en base : 384, repris d'autres packs : +0, hors périmètre : -269, doublons écartés à la déduplication : -1, soit 114 dans le pool.
- Faits du pool venus d'un autre pack : 92 (par pack : section Relations).
- Destination des 114 faits du pool : Règles du motif 75 ; Mise en œuvre par domaine 1 ; Tests attendus 22 ; Alertes / Questions ouvertes 6 ; annexe seule 0 ; écartés (sorte `other` ou inconnue) 10.
- Passe transversale : scope 85 fichiers, lus 72 (84 %), non lus 13 : ce pack décrit le motif sur un échantillon, pas sur tout son scope.
- Base : sha256 784e24ee6a2a…, générée le 2026-11-17.
