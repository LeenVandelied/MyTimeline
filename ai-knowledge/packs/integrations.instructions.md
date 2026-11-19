---
pack: integrations
kind: transversal
name: Intégrations externes
generated_at: 2026-11-19T10:19:38Z
generator: synth/1
base_sha256: 3c05a3044a73eeee8aac4165d7b48b312f4fe5936c88c925b128b5bb54f18582
facts_in_base: 200
facts_in_pool: 140
facts_cited: 40
sections: integrations.sections.json
details: [integrations.details.md]
lang: fr
curated_at: 2026-11-19T10:32:37Z
curation: integrations.curation.json
---
## 1. Quand activer {#activate}

Ce pack s'active quand la demande ou le code touche l'un de ces éléments.

- Mots-clés : integration, intégration, brevo, email, storage, stockage, renderer
- Chemins : `^mytimeline:backend/.*/(Brevo[A-Za-z0-9]*|LocalStorageAdapter[A-Za-z0-9]*|StorageConfig[A-Za-z0-9]*|[A-Za-z]*ExportRenderer[A-Za-z0-9]*)\.java$`

## 2. Lexique {#lexicon}

Aucun fait de la base ne relève de cette section.

## 3. Règles du motif {#rules}

### Rendu des exports
- Le CSV préfixe d'une apostrophe tout champ commençant par = + - @, tabulation, CR ou LF, avant l'échappement RFC 4180. [#64f39489a8c24fb5-2] [#8b52ae90d30c1625-1]
- Le ZIP regroupe les rendus data.json, data.md et data.csv du même snapshot. [#35a51e5f0043333c-1]
### Emails Brevo
- Le health Brevo, enregistré en profil prod seulement, est DOWN si la clé est vide et UP sinon. [#c5d7f522302cb87d-2] [#1c7bee558c4afcb5-1] [#1c7bee558c4afcb5-2]
- Une locale nulle, vide ou inconnue donne le template FR, la casse et la région étant ignorées. [#424bd631166a816d-1] [#424bd631166a816d-2]
### Vérifié dans le code
- Sans BREVO_API_KEY, l'application démarre : BrevoEmailService passe en no-op et BrevoHealthIndicator (@Profile prod) remonte DOWN [#user/d49e6680fcdfcaff-1] [#user/775621251ad13b2f-1] `mytimeline:backend/src/main/java/com/matimeline/eventmanager/infrastructure/adapters/email/BrevoEmailService.java:63-84`.

## 4. Structure {#structure}

#### mytimeline:backend/src/main/java/com/matimeline/eventmanager/application/services/AsyncExportRunner.java
| Symbole | Énoncé | Lignes | Fait |
|---|---|---|---|
| AsyncExportRunner.run | Après assemble, render et store sans exception, le job passe à COMPLETED avec la référence de stockage et l'expiration. (partiel) | L77-78 | [#4bc09dd6c60c1854-2] |
#### mytimeline:backend/src/main/java/com/matimeline/eventmanager/infrastructure/adapters/repositories/jpa/ExportJobRepositoryJpaImpl.java
| Symbole | Énoncé | Lignes | Fait |
|---|---|---|---|
| ExportJobRepositoryJpaImpl.save | Lors d'une mise à jour d'un job existant, save recopie sur l'entité gérée le statut, storageRef, errorCode, completedAt et expiresAt du job. (partiel) | L47-56 | [#0116118345deaf3f-1] |
#### mytimeline:backend/src/main/java/com/matimeline/eventmanager/infrastructure/adapters/testsupport/E2eResetTokenController.java
| Symbole | Énoncé | Lignes | Fait |
|---|---|---|---|
| E2eResetTokenController.latestUsableResetToken | Le GET /api/test-support/password-reset-token renvoie le UUID du dernier token de réinitialisation exploitable pour l'email fourni, sans authentification propre à ce contrôleur. | L71 | [#e2dcd55a97c66d7b-1] |

## 5. Mise en œuvre par domaine {#surface}

### Réinitialisation de mot de passe (tests de bout en bout)
- Le GET /api/test-support/password-reset-token renvoie le UUID du dernier token de réinitialisation exploitable pour l'email fourni [#e2dcd55a97c66d7b-1].

## 6. Fichiers critiques {#files}

Fichiers du pool au poids le plus élevé (10 sur 37), le poids étant la somme des scores de spécificité de leurs faits. Liste complète : annexe.

| Fichier | Faits | Sortes dominantes |
|---|---|---|
| `mytimeline:backend/src/main/java/com/matimeline/eventmanager/infrastructure/adapters/email/BrevoHealthIndicator.java` | 8 | config 3, external_call 3, convention 1 |
| `mytimeline:backend/src/main/java/com/matimeline/eventmanager/infrastructure/adapters/LocalStorageAdapter.java` | 7 | validation 3, external_call 2, config 1 |
| `mytimeline:backend/src/main/java/com/matimeline/eventmanager/infrastructure/config/StorageConfig.java` | 7 | convention 4, config 2, external_call 1 |
| `mytimeline:backend/src/test/java/com/matimeline/eventmanager/infrastructure/adapters/LocalStorageAdapterTest.java` | 7 | validation 3, test_case 2, convention 1 |
| `mytimeline:backend/src/main/java/com/matimeline/eventmanager/infrastructure/adapters/email/PasswordResetEmailTemplate.java` | 5 | convention 4, external_call 1 |
| `mytimeline:backend/src/main/java/com/matimeline/eventmanager/infrastructure/adapters/export/CsvExportRenderer.java` | 6 | convention 5, other 1 |
| `mytimeline:backend/src/test/java/com/matimeline/eventmanager/infrastructure/adapters/email/BrevoEmailServiceLocaleTest.java` | 6 | test_case 4, external_call 1, suspicious 1 |
| `mytimeline:backend/src/test/java/com/matimeline/eventmanager/infrastructure/adapters/export/ExportRenderersTest.java` | 7 | test_case 4, convention 3 |
| `mytimeline:backend/src/test/java/com/matimeline/eventmanager/infrastructure/adapters/repositories/CategoryDeleteReassignIntegrationTest.java` | 7 | convention 4, other 2, test_case 1 |
| `mytimeline:backend/src/main/java/com/matimeline/eventmanager/infrastructure/adapters/export/MarkdownExportRenderer.java` | 4 | convention 2, other 1, suspicious 1 |

## 7. Relations avec d'autres packs {#relations}

Packs liés par des faits repris, des faits équivalents écartés à la déduplication ou le catalogue.

| Pack | Faits repris | Faits équivalents | Catalogue |
|---|---|---|---|
| export | 58 | 27 | oui |
| user | 29 | 21 | oui |
| backend-socle | 29 | 0 |  |
| event | 9 | 2 | oui |
| category | 7 | 1 | oui |
| session | 6 | 0 | oui |
| product | 2 | 1 | oui |

- Faits du pool par pack d'origine : export 58, backend-socle 29, user 29, event 9, category 7, session 6, product 2

## 8. Tests attendus {#tests}

- Les tests fixent que POST /api/auth/forgot-password répond 200 pour un e-mail inconnu, sans token ni exception [#981f3d22e5d3ffbb-1] [#2ccd4c5a70563723-1].
- Les tests fixent que requestReset rend la main en moins de 4000 ms alors que l'envoi est bloqué 5 s, puis que l'envoi et la création du token sont finalement appelés [#925eda645ab40484-3] [#925eda645ab40484-4].
- Les tests fixent que Brevo sans clé API n'émet aucun appel HTTP et qu'aucune locale ne fait propager d'exception [#52720a500310ccdf-1] [#fd66bd245160df70-1].
- Les tests fixent que le nom du destinataire est échappé en HTML pour fr, en, es et de [#72cded3f8ca31e3c-1].
- Les tests fixent que le health Brevo est DOWN avec une clé reason si la clé est null, UP sinon, et sans jamais exposer la clé [#e671c9d0e878ab41-1] [#e671c9d0e878ab41-2] [#e671c9d0e878ab41-3].
- Les tests fixent que le JWKS porte max-age=300, une seule clé RS256 sans paramètre privé, et un modulus de 256 octets non signé [#08593db1f3d7a7c6-1] [#84e78eb149834ed3-1] [#a6e459a10869f945-1].
- Les tests fixent que la clé publiée vérifie un jeton réel du backend et refuse un jeton altéré [#dadfc6792a00f948-1].
- Les tests fixent que l'export JSON n'expose jamais le hash du mot de passe [#712e5bc738c45338-1].
- Les tests fixent que le CSV préfixe d'une apostrophe les champs commençant par @, = ou - ou un saut de ligne [#271360493da3f939-1] [#271360493da3f939-2].
- Les tests fixent que le ZIP contient data.json, data.md et data.csv [#76bc88e0381b34a8-1].
- Les tests fixent que les stockages avatar et export utilisent des répertoires distincts [#f7303661efe58435-1], et que delete est idempotent [#a1f67c5fae1badd3-1].
- Pour tester Brevo, les tests interceptent l'URL de l'API avec MockRestServiceServer, sans réseau réel [#540abb4817870901-1].

## 9. Questions ouvertes {#questions}

- Le champ JSON to.name reste-t-il brut volontairement dans le payload Brevo ? Le commentaire du test le dit, alors que seul le corps HTML est vérifié comme échappé [#1bc758ece67369a1-1] [#72cded3f8ca31e3c-1].

## 10. Alertes {#alerts}

- Le bean exportStorage lit app.storage.export-path sans valeur par défaut [#3a8615964c21dcf2-1], et le test de config attend un échec de démarrage si la propriété manque, selon son commentaire [#087ffd68ac374677-1]. Tout nouvel environnement ou test de contexte complet sans cette propriété ne démarre pas, donc la déclarer partout et ne pas ajouter de défaut dans `mytimeline:backend/src/main/java/com/matimeline/eventmanager/infrastructure/config/StorageConfig.java:44`.
- Le nom de produit saisi par l'utilisateur est ajouté tel quel au Markdown exporté, alors que le rendu CSV neutralise les formules, et les autres champs utilisateur du Markdown font de même [#9e65d14dde7b0ffe-1]. Un contenu malveillant passe donc dans l'export, donc il faut échapper ces champs dans `mytimeline:backend/src/main/java/com/matimeline/eventmanager/infrastructure/adapters/export/MarkdownExportRenderer.java:84` avant d'en ajouter d'autres.
- Deux tests de contrainte CHECK acceptent n'importe quelle Exception . Ils passent même si l'échec vient d'une autre cause que ck_events_duration_unit_required ou ck_events_recurrence_unit, donc une régression de migration peut rester invisible ⇒ Il faut asserter la violation de contrainte précise dans `mytimeline:backend/src/test/java/com/matimeline/eventmanager/infrastructure/adapters/repositories/EventPatchAndRecurrenceIntegrationTest.java:288-300` et le test voisin [#5d60be11852f2495-1] [#d3f82d215b296dc2-1]

## 11. Couverture {#coverage}

- Fichiers du pack : 84 ; avec au moins un fait en base : 44 ; sans fait après remise en file : 0.
- Faits en base : 200, repris d'autres packs : +0, hors périmètre : -60, doublons écartés à la déduplication : -0, soit 140 dans le pool.
- Faits du pool venus d'un autre pack : 140 (par pack : section Relations).
- Destination des 140 faits du pool : Règles du motif 75 ; Mise en œuvre par domaine 1 ; Tests attendus 32 ; Alertes / Questions ouvertes 10 ; annexe seule 6 ; écartés (sorte `other` ou inconnue) 16.
- Passe transversale : scope 84 fichiers, lus 68 (80 %), non lus 16 : ce pack décrit le motif sur un échantillon, pas sur tout son scope.
- Base : sha256 3c05a3044a73…, générée le 2026-11-19.
