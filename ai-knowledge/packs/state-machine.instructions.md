---
pack: state-machine
kind: transversal
name: États et machines à états
generated_at: 2026-11-18T16:18:53Z
generator: synth/1
base_sha256: 98809b1127fe4a85d0c0e1b1c26e34ed8355484f0f7452bd57e869d0523009cc
facts_in_base: 34
facts_in_pool: 17
facts_cited: 13
sections: state-machine.sections.json
details: [state-machine.details.md]
lang: fr
curated_at: 2026-11-18T16:25:37Z
curation: state-machine.curation.json
---
## 1. Quand activer {#activate}

Ce pack s'active quand la demande ou le code touche l'un de ces éléments.

- Chemins : `/(Role|ThemePreference|ExportJob|ExportJobStatus|ExportFormat|RecurrenceUnit)(Test)?\.java$`

## 2. Lexique {#lexicon}

Aucun fait de la base ne relève de cette section.

## 3. Règles du motif {#rules}

### Invariants
- Selon la javadoc de ThemePreference, la persistance passe par un AttributeConverter et non par @Enumerated(STRING), qui écrirait LIGHT et serait refusé par le CHECK SQL. [#950044d26baf5570-1]
- Selon la javadoc de ThemePreference, l'absence de préférence est représentée par null et non par une constante, SYSTEM étant un choix explicite distinct. [#950044d26baf5570-2]
- Selon la javadoc de RecurrenceUnit, la constante est persistée par son nom via @Enumerated(STRING) côté entité. [#781bc749af77ddef-1]
### Préférence de thème
- ThemePreference.fromValue compare strictement aux trois valeurs minuscules et lève IllegalArgumentException pour null ou toute valeur inconnue. [#52f9f4a8f8d8b618-1]
### Jobs d'export
- Un job n'est téléchargeable que si son statut est COMPLETED, que storageRef et expiresAt sont non nuls et que la date courante précède expiresAt. [#39e016af7a8585d6-1]
- Un job naît à l'état PENDING, sans storageRef, errorCode, completedAt ni expiresAt, et la source de l'état précédent n'est pas établie. [#7766b9e71e04f41e-1]
- Selon la javadoc de ExportJob, les transitions sont pilotées par le use case et non par le modèle. [#8573c7ab10277f70-1]
- Chaque format d'export porte un drapeau sync : JSON et MARKDOWN sont générés inline, ZIP et CSV de façon asynchrone via un job. [#430b26646b38cc0c-1]

## 4. Structure {#structure}

#### mytimeline:backend/src/main/java/com/matimeline/eventmanager/domain/models/export/ExportJob.java
| Symbole | Énoncé | Lignes | Fait |
|---|---|---|---|
| ExportJob.pending | La fabrique ExportJob.pending crée un job dont l'état initial est PENDING, sans storageRef, errorCode, completedAt ni expiresAt. (partiel) | L43-46 | [#7766b9e71e04f41e-1] |

## 5. Mise en œuvre par domaine {#surface}

Aucun fait de la base ne relève de cette section.

## 6. Fichiers critiques {#files}

Fichiers du pool au poids le plus élevé (5 sur 8), le poids étant la somme des scores de spécificité de leurs faits. Liste complète : annexe.

| Fichier | Faits | Sortes dominantes |
|---|---|---|
| `mytimeline:backend/src/main/java/com/matimeline/eventmanager/domain/models/export/ExportJob.java` | 4 | business_rule 1, convention 1, state_transition 1 |
| `mytimeline:frontend/src/lib/schemas/export.ts` | 3 | convention 1, state_transition 1, validation 1 |
| `mytimeline:backend/src/main/java/com/matimeline/eventmanager/domain/models/ThemePreference.java` | 3 | convention 2, validation 1 |
| `mytimeline:backend/src/main/java/com/matimeline/eventmanager/domain/models/export/ExportFormat.java` | 2 | convention 2 |
| `mytimeline:backend/src/main/java/com/matimeline/eventmanager/domain/models/export/ExportJobStatus.java` | 2 | convention 2 |

## 7. Relations avec d'autres packs {#relations}

Packs liés par des faits repris, des faits équivalents écartés à la déduplication ou le catalogue.

| Pack | Faits repris | Faits équivalents | Catalogue |
|---|---|---|---|
| timeline | 17 | 8 | oui |

- Faits du pool par pack d'origine : timeline 17

## 8. Tests attendus {#tests}

- Les tests fixent que la conversion depuis une valeur de préférence de thème rejette les variantes de casse, les espaces, la chaîne vide et les valeurs inconnues comme auto, voir `mytimeline:backend/src/test/java/com/matimeline/eventmanager/domain/models/ThemePreferenceTest.java:26-30` [#90a85c88083cdd28-1].
- Les tests fixent que markCompleted d'un job d'export passe le statut à COMPLETED et conserve la date de complétion fournie, sans la dériver de la date d'expiration moins 24 heures, voir `mytimeline:backend/src/test/java/com/matimeline/eventmanager/domain/models/export/ExportJobTest.java:17-32` [#195292fcf3c5228b-1].

## 9. Questions ouvertes {#questions}

- Le commentaire de module décrit le cycle PENDING, RUNNING, puis COMPLETED ou FAILED, mais le code ne porte que l'enum de valeurs, sans logique de transition ni garde (`mytimeline:frontend/src/lib/schemas/export.ts:29`). Le commentaire est-il l'intention voulue côté serveur, alors que le backend ne l'impose pas ? [#fe61f927fe31008f-1] [#43216ccd0ca58163-1] [#8096253e175ca857-1]

## 10. Alertes {#alerts}

Aucun fait de la base ne relève de cette section.

## 11. Couverture {#coverage}

- Fichiers du pack : 23 ; avec au moins un fait en base : 13 ; sans fait après remise en file : 0.
- Faits en base : 34, repris d'autres packs : +0, hors périmètre : -14, doublons écartés à la déduplication : -3, soit 17 dans le pool.
- Faits du pool venus d'un autre pack : 17 (par pack : section Relations).
- Destination des 17 faits du pool : Règles du motif 12 ; Tests attendus 2 ; Alertes / Questions ouvertes 3 ; annexe seule 0 ; écartés (sorte `other` ou inconnue) 0.
- Passe transversale : scope 23 fichiers, tous lus.
- Base : sha256 98809b1127fe…, générée le 2026-11-18.
