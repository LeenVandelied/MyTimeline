# Annexe : state-machine

## Index des fichiers {#files-index}

| Fichier | Faits | Sortes |
|---|---|---|
| `mytimeline:backend/src/main/java/com/matimeline/eventmanager/domain/models/export/ExportJob.java` | 4 | business_rule 1, convention 1, state_transition 1 |
| `mytimeline:backend/src/main/java/com/matimeline/eventmanager/domain/models/ThemePreference.java` | 3 | convention 2, validation 1 |
| `mytimeline:frontend/src/lib/schemas/export.ts` | 3 | convention 1, state_transition 1, validation 1 |
| `mytimeline:backend/src/main/java/com/matimeline/eventmanager/domain/models/export/ExportFormat.java` | 2 | convention 2 |
| `mytimeline:backend/src/main/java/com/matimeline/eventmanager/domain/models/export/ExportJobStatus.java` | 2 | convention 2 |
| `mytimeline:backend/src/main/java/com/matimeline/eventmanager/domain/models/RecurrenceUnit.java` | 1 | convention 1 |
| `mytimeline:backend/src/test/java/com/matimeline/eventmanager/domain/models/ThemePreferenceTest.java` | 1 | test_case 1 |
| `mytimeline:backend/src/test/java/com/matimeline/eventmanager/domain/models/export/ExportJobTest.java` | 1 | test_case 1 |

## Règles métier {#t-business_rule}

| Pointeur | Énoncé | Fait |
|---|---|---|
| `mytimeline:backend/src/main/java/com/matimeline/eventmanager/domain/models/export/ExportJob.java:64-70` | Un job est téléchargeable seulement si son statut est COMPLETED, que storageRef et expiresAt sont non nuls et que la date courante est avant expiresAt. | [#39e016af7a8585d6-1] |

## Validations {#t-validation}

| Pointeur | Énoncé | Fait |
|---|---|---|
| `mytimeline:backend/src/main/java/com/matimeline/eventmanager/domain/models/ThemePreference.java:40-49` | ThemePreference.fromValue compare la valeur de façon stricte aux trois valeurs minuscules et lève IllegalArgumentException pour null ou toute valeur inconnue. | [#52f9f4a8f8d8b618-1] |
| `mytimeline:frontend/src/lib/schemas/export.ts:42-48` | Le schéma exportJobResponseSchema valide le champ status avec exportJobStatusSchema et le champ format avec exportFormatSchema, et accepte downloadUrl et expiresAt nullables. | [#5c623b5364809082-2] |

## Transitions d'état {#t-state_transition}

| Pointeur | Énoncé | Fait |
|---|---|---|
| `mytimeline:frontend/src/lib/schemas/export.ts:29` | Javadoc : Le commentaire de module décrit la transition PENDING vers RUNNING puis vers COMPLETED ou FAILED ; le code ne contient aucune logique de transition, seulement le schéma de valeurs. | [#fe61f927fe31008f-1] |

## Faits suspects {#t-suspicious}

| Pointeur | Énoncé | Fait |
|---|---|---|
| `mytimeline:backend/src/main/java/com/matimeline/eventmanager/domain/models/export/ExportJob.java:48-62` | Les trois méthodes de transition (markRunning, markCompleted, markFailed) n'imposent aucun enchaînement : un job FAILED peut passer à COMPLETED, et rien n'interdit de repasser à RUNNING depuis un état terminal. | [#8096253e175ca857-1] |

## Conventions {#t-convention}

| Pointeur | Énoncé | Fait |
|---|---|---|
| `mytimeline:backend/src/main/java/com/matimeline/eventmanager/domain/models/RecurrenceUnit.java:8` | Javadoc : Selon la javadoc, la constante est persistée par son nom via @Enumerated(EnumType.STRING) côté entité. | [#781bc749af77ddef-1] |
| `mytimeline:backend/src/main/java/com/matimeline/eventmanager/domain/models/ThemePreference.java:11` | Javadoc : Selon la javadoc, la persistance de la préférence passe par un AttributeConverter et non par @Enumerated(STRING), qui écrirait LIGHT et serait refusé par le CHECK SQL. | [#950044d26baf5570-1] |
| `mytimeline:backend/src/main/java/com/matimeline/eventmanager/domain/models/ThemePreference.java:13-14` | Javadoc : Selon la javadoc, l'absence de préférence est représentée par null et non par une constante de l'enum, SYSTEM étant un choix explicite distinct. | [#950044d26baf5570-2] |
| `mytimeline:backend/src/main/java/com/matimeline/eventmanager/domain/models/export/ExportFormat.java:21-24` | Chaque constante ExportFormat porte un drapeau sync : JSON et MARKDOWN valent true (génération inline), ZIP et CSV valent false (génération asynchrone via job). | [#430b26646b38cc0c-1] |
| `mytimeline:backend/src/main/java/com/matimeline/eventmanager/domain/models/export/ExportFormat.java:44-47` | Javadoc : Selon la javadoc de isSync, true désigne les formats à génération inline (JSON, Markdown). | [#459037e38c8c1b6a-1] |
| `mytimeline:backend/src/main/java/com/matimeline/eventmanager/domain/models/export/ExportJob.java:10` | Javadoc : Selon la javadoc de la classe, les transitions sont pilotées par le use case et non par le modèle lui-même. | [#8573c7ab10277f70-1] |
| `mytimeline:backend/src/main/java/com/matimeline/eventmanager/domain/models/export/ExportJobStatus.java:4-6` | Javadoc : La javadoc de l'enum décrit le cycle de vie d'un job d'export asynchrone en quatre états, PENDING, RUNNING, COMPLETED et FAILED. | [#3b402fae6e28454a-1] |
| `mytimeline:backend/src/main/java/com/matimeline/eventmanager/domain/models/export/ExportJobStatus.java:8-13` | L'enum ExportJobStatus déclare quatre constantes d'état : PENDING, RUNNING, COMPLETED et FAILED. | [#3b402fae6e28454a-2] |
| `mytimeline:frontend/src/lib/schemas/export.ts:29-31` | Le cycle de vie d'un job d'export async est modélisé côté frontend par un enum Zod à quatre valeurs : PENDING, RUNNING, COMPLETED, FAILED. | [#43216ccd0ca58163-1] |
