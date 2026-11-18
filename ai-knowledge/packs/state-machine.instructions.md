---
pack: state-machine
kind: transversal
name: États et machines à états
generated_at: 2026-11-18T12:00:00Z
generator: synth/1
base_sha256: 7071902a64278984febe1c288edaaa9c73ea7692ceb653fe57d717b67a2c5883
facts_in_base: 30
facts_in_pool: 17
facts_cited: 10
sections: state-machine.sections.json
details: [state-machine.details.md]
lang: fr
curated_at: 2026-11-18T14:30:00Z
curation: state-machine.curation.json
---
## 1. Quand activer {#activate}

Ce pack s'active quand la demande ou le code touche l'un de ces éléments.

- Chemins : `/(Role|ThemePreference|ExportJob|ExportJobStatus|ExportFormat|RecurrenceUnit)(Test)?\.java$`

## 2. Lexique {#lexicon}

Aucun fait de la base ne relève de cette section.

## 3. Règles du motif {#rules}

### Export de données
- Un job d'export est téléchargeable seulement si son statut est COMPLETED, si storageRef et expiresAt sont renseignés et si now précède expiresAt, voir `mytimeline:backend/src/main/java/com/matimeline/eventmanager/domain/models/export/ExportJob.java:65-70` [#39e016af7a8585d6-1]
- Selon la javadoc, le cycle va de PENDING à RUNNING, puis à COMPLETED ou FAILED, et completedAt et expiresAt ne sont renseignés qu'à la complétion [#3b402fae6e28454a-1] [#8573c7ab10277f70-2]
### Énumérations persistées
- Selon la javadoc, ThemePreference est persisté par un AttributeConverter et non par @Enumerated(STRING), car le CHECK refuse le nom de la constante [#950044d26baf5570-1]
- Selon la javadoc, RecurrenceUnit est persisté par son nom et la migration V7 réaligne les anciennes valeurs [#781bc749af77ddef-1]

## 4. Structure {#structure}

#### mytimeline:backend/src/main/java/com/matimeline/eventmanager/domain/models/export/ExportJob.java
| Symbole | Énoncé | Lignes | Fait |
|---|---|---|---|
| ExportJob.pending | La fabrique ExportJob.pending crée un job dont le statut initial est PENDING, sans storageRef, errorCode, completedAt ni expiresAt. (partiel) | L43-46 | [#7766b9e71e04f41e-1] |

## 5. Mise en œuvre par domaine {#surface}

Aucun fait de la base ne relève de cette section.

## 6. Fichiers critiques {#files}

Fichiers du pool au poids le plus élevé (5 sur 7), le poids étant la somme des scores de spécificité de leurs faits. Liste complète : annexe.

| Fichier | Faits | Sortes dominantes |
|---|---|---|
| `mytimeline:backend/src/main/java/com/matimeline/eventmanager/domain/models/export/ExportJob.java` | 5 | convention 2, business_rule 1, state_transition 1 |
| `mytimeline:frontend/src/lib/schemas/export.ts` | 4 | convention 2, business_rule 1, state_transition 1 |
| `mytimeline:backend/src/main/java/com/matimeline/eventmanager/domain/models/RecurrenceUnit.java` | 2 | convention 1, validation 1 |
| `mytimeline:backend/src/main/java/com/matimeline/eventmanager/domain/models/ThemePreference.java` | 2 | convention 1, validation 1 |
| `mytimeline:backend/src/main/java/com/matimeline/eventmanager/domain/models/export/ExportJobStatus.java` | 2 | convention 2 |

## 7. Relations avec d'autres packs {#relations}

Packs liés par des faits repris, des faits équivalents écartés à la déduplication ou le catalogue.

| Pack | Faits repris | Faits équivalents | Catalogue |
|---|---|---|---|
| timeline | 17 | 8 | oui |

- Faits du pool par pack d'origine : timeline 17

## 8. Tests attendus {#tests}

- Les tests fixent que markCompleted d'un job d'export passe le statut à COMPLETED, conserve le storageRef, pose completedAt à la valeur fournie et laisse expiresAt inchangé [#195292fcf3c5228b-1], voir `mytimeline:backend/src/test/java/com/matimeline/eventmanager/domain/models/export/ExportJobTest.java:18-31`.

## 9. Questions ouvertes {#questions}

- Qui impose l'ordre PENDING, RUNNING, puis COMPLETED ou FAILED, annoncé par la documentation du schéma `mytimeline:frontend/src/lib/schemas/export.ts:29` [#fe61f927fe31008f-1]. La base ne montre aucun code frontend qui pilote cette transition, et le modèle backend n'en vérifie pas l'ordre [#8096253e175ca857-1].

## 10. Alertes {#alerts}

- Les méthodes de transition du job d'export (`mytimeline:backend/src/main/java/com/matimeline/eventmanager/domain/models/export/ExportJob.java:48-62`) ne lisent pas le statut courant, donc le modèle accepte un passage à RUNNING, COMPLETED ou FAILED depuis un job déjà terminé [#8096253e175ca857-1]. Le frontend traite COMPLETED et FAILED comme terminaux et arrête le polling dessus [#b41ecf1b43916e73-1]. Si vous ajoutez un appel à ces méthodes, vérifiez le statut avant l'appel, ou ajoutez la garde dans le modèle.

## 11. Couverture {#coverage}

- Fichiers du pack : 23 ; avec au moins un fait en base : 13 ; sans fait après remise en file : 0.
- Faits en base : 30, repris d'autres packs : +0, hors périmètre : -10, doublons écartés à la déduplication : -3, soit 17 dans le pool.
- Faits du pool venus d'un autre pack : 17 (par pack : section Relations).
- Destination des 17 faits du pool : Règles du motif 13 ; Tests attendus 2 ; Alertes / Questions ouvertes 2 ; annexe seule 0 ; écartés (sorte `other` ou inconnue) 0.
- Passe transversale : scope 23 fichiers, tous lus.
- Base : sha256 7071902a6427…, générée le 2026-11-17.
