---
pack: state-machine
kind: transversal
name: États et machines à états
generated_at: 2026-11-17T10:36:11Z
generator: synth/1
base_sha256: 9a565c640a879726350610ed70c6178e5cdf882c70d454d14a16ea545f581006
facts_in_base: 30
facts_in_pool: 26
facts_cited: 13
sections: state-machine.sections.json
details: [state-machine.details.md]
lang: fr
curated_at: 2026-11-17T10:45:42Z
curation: state-machine.curation.json
---
## 1. Quand activer {#activate}

Ce pack s'active quand la demande ou le code touche l'un de ces éléments.

- Chemins : `/(Role|ThemePreference|ExportJob|ExportJobStatus|ExportFormat|RecurrenceUnit)(Test)?\.java$`

## 2. Lexique {#lexicon}

Aucun fait de la base ne relève de cette section.

## 3. Règles du motif {#rules}

### Dans le pack export
- Un job d'export est téléchargeable seulement s'il est COMPLETED, avec storageRef et expiresAt renseignés et now avant expiresAt, voir `mytimeline:backend/src/main/java/com/matimeline/eventmanager/domain/models/export/ExportJob.java:65-70` [#39e016af7a8585d6-1].
- Voir `mytimeline:frontend/src/lib/schemas/export.ts:33-35` (pointeur, détail en annexe) [#b41ecf1b43916e73-1] [#10f6e5f3c0f2637e-1].
- Voir `mytimeline:backend/src/main/java/com/matimeline/eventmanager/domain/models/export/ExportJob.java:43-46` (pointeur, détail en annexe) [#7766b9e71e04f41e-1].
- Voir `mytimeline:backend/src/main/java/com/matimeline/eventmanager/domain/models/export/ExportJobStatus.java:8-13` (pointeur, détail en annexe) [#3b402fae6e28454a-2].
### Dans le pack authentification
- Voir `mytimeline:backend/src/main/java/com/matimeline/eventmanager/domain/models/PasswordResetToken.java:63-66` (pointeur, détail en annexe) [#6008cb44b64f55ce-1].
### Dans le pack préférences
- Voir `mytimeline:backend/src/main/java/com/matimeline/eventmanager/domain/models/ThemePreference.java:40-49` (pointeur, détail en annexe) [#52f9f4a8f8d8b618-1].
- RecurrenceUnit.fromString diffère: null ou vide donne null, la casse est ignorée et les pluriels sont acceptés, voir `mytimeline:backend/src/main/java/com/matimeline/eventmanager/domain/models/RecurrenceUnit.java:30-51` [#3316e4f42e7d1b2e-1].

## 4. Structure {#structure}

#### mytimeline:backend/src/main/java/com/matimeline/eventmanager/domain/models/export/ExportJob.java
| Symbole | Énoncé | Lignes | Fait |
|---|---|---|---|
| ExportJob.pending | La fabrique ExportJob.pending crée un job dont le statut initial est PENDING, sans storageRef, errorCode, completedAt ni expiresAt. (partiel) | L43-46 | [#7766b9e71e04f41e-1] |

## 5. Mise en œuvre par domaine {#surface}

Aucun fait de la base ne relève de cette section.

## 6. Fichiers critiques {#files}

Fichiers du pool au poids le plus élevé (6 sur 13), le poids étant la somme des scores de spécificité de leurs faits. Liste complète : annexe.

| Fichier | Faits | Sortes dominantes |
|---|---|---|
| `mytimeline:backend/src/main/java/com/matimeline/eventmanager/domain/models/export/ExportJob.java` | 5 | convention 2, business_rule 1, state_transition 1 |
| `mytimeline:frontend/src/lib/schemas/export.ts` | 6 | convention 4, business_rule 1, state_transition 1 |
| `mytimeline:backend/src/main/java/com/matimeline/eventmanager/domain/models/PasswordResetToken.java` | 2 | business_rule 1, suspicious 1 |
| `mytimeline:backend/src/main/java/com/matimeline/eventmanager/domain/models/RecurrenceUnit.java` | 2 | convention 1, validation 1 |
| `mytimeline:backend/src/main/java/com/matimeline/eventmanager/domain/models/ThemePreference.java` | 2 | convention 1, validation 1 |
| `mytimeline:backend/src/main/java/com/matimeline/eventmanager/domain/models/export/ExportJobStatus.java` | 2 | convention 2 |

## 7. Relations avec d'autres packs {#relations}

Packs liés par des faits repris, des faits équivalents écartés à la déduplication ou le catalogue.

| Pack | Faits repris | Faits équivalents | Catalogue |
|---|---|---|---|
| timeline | 0 | 11 | oui |

- Faits du pool par pack d'origine : timeline 26

## 8. Tests attendus {#tests}

- Les tests fixent que le passage d'un export à terminé enregistre la date de complétion fournie par l'appelant, sans la dériver du TTL, et laisse la date d'expiration inchangée, voir `mytimeline:backend/src/test/java/com/matimeline/eventmanager/domain/models/export/ExportJobTest.java:18-31` [#195292fcf3c5228b-1].

## 9. Questions ouvertes {#questions}

- Qui pilote le cycle PENDING, RUNNING, COMPLETED ou FAILED côté frontend ? La documentation du schéma le décrit, mais le code ne montre que l'enum et le test de statut terminal (COMPLETED, FAILED) qui arrête le polling, voir `mytimeline:frontend/src/lib/schemas/export.ts:29-35` [#fe61f927fe31008f-1] [#43216ccd0ca58163-1] [#b41ecf1b43916e73-1].

## 10. Alertes {#alerts}

- Voir `mytimeline:backend/src/main/java/com/matimeline/eventmanager/domain/models/export/ExportJob.java:48-62` (pointeur, détail en annexe) [#8096253e175ca857-1] [#3b402fae6e28454a-1] [#3b402fae6e28454a-2].

## 11. Couverture {#coverage}

- Fichiers du pack : 23 ; cités par au moins un fait : 13 ; non cités définitifs : 0.
- Faits en base : 30 ; dans le pool après déduplication : 26 (dont 0 repris d'autres packs) ; cités dans ce pack : 13 ; en annexe : 19 ; ni cités ni en annexe : 1 ; écartés (sorte `other`) : 4.
- Fichiers dont au moins un fait est cité ici : 7 sur 23.
- Passe transversale : scope 23 fichiers, lus 23 (100 %), non lus 0 : ce pack décrit le motif sur un échantillon, pas sur tout son scope.
- Base : sha256 9a565c640a87…, générée le 2026-11-17.
