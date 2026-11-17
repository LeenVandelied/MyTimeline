# Annexe : state-machine

## Index des fichiers {#files-index}

| Fichier | Faits | Sortes |
|---|---|---|
| `mytimeline:frontend/src/lib/schemas/export.ts` | 6 | convention 4, business_rule 1, state_transition 1 |
| `mytimeline:backend/src/main/java/com/matimeline/eventmanager/domain/models/export/ExportJob.java` | 5 | convention 2, business_rule 1, state_transition 1 |
| `mytimeline:backend/src/main/java/com/matimeline/eventmanager/domain/models/PasswordResetToken.java` | 2 | business_rule 1, suspicious 1 |
| `mytimeline:backend/src/main/java/com/matimeline/eventmanager/domain/models/RecurrenceUnit.java` | 2 | convention 1, validation 1 |
| `mytimeline:backend/src/main/java/com/matimeline/eventmanager/domain/models/ThemePreference.java` | 2 | convention 1, validation 1 |
| `mytimeline:backend/src/main/java/com/matimeline/eventmanager/domain/models/export/ExportJobStatus.java` | 2 | convention 2 |
| `mytimeline:backend/src/main/java/com/matimeline/eventmanager/domain/models/Event.java` | 1 | other 1 |
| `mytimeline:backend/src/main/java/com/matimeline/eventmanager/domain/models/Product.java` | 1 | other 1 |
| `mytimeline:backend/src/main/java/com/matimeline/eventmanager/domain/models/Session.java` | 1 | other 1 |
| `mytimeline:backend/src/main/java/com/matimeline/eventmanager/domain/models/User.java` | 1 | convention 1 |
| `mytimeline:backend/src/test/java/com/matimeline/eventmanager/domain/models/ThemePreferenceTest.java` | 1 | test_case 1 |
| `mytimeline:backend/src/test/java/com/matimeline/eventmanager/domain/models/export/ExportJobTest.java` | 1 | test_case 1 |
| `mytimeline:backend/src/test/java/com/matimeline/eventmanager/domain/models/export/UserDataExportTest.java` | 1 | other 1 |

## Lignes rétrogradées {#t-demoted_lines}

| Section | Ligne | Motif |
|---|---|---|
| rules | - Côté frontend, COMPLETED et FAILED sont les statuts terminaux, et l'arrêt du polling repose sur ce test, voir `mytimeline:frontend/src/lib/schemas/export.ts:33-35` [#b41ecf1b43916e73-1]. | deducible |
| rules | - JSON et MARKDOWN sont des formats synchrones (réponse inline), les autres sont asynchrones, voir `mytimeline:frontend/src/lib/schemas/export.ts:25-27` [#10f6e5f3c0f2637e-1]. | deducible |
| rules | - La fabrique ExportJob.pending crée un job au statut PENDING sans storageRef, errorCode, completedAt ni expiresAt [#7766b9e71e04f41e-1]. | deducible |
| rules | - L'enum ExportJobStatus ne porte aucune méthode de transition, aucune règle de passage n'y est codée [#3b402fae6e28454a-2]. | rediscovered (3 appels) |
| rules | - Un token de réinitialisation est utilisable seulement s'il n'est pas consommé et pas expiré à l'instant now, voir `mytimeline:backend/src/main/java/com/matimeline/eventmanager/domain/models/PasswordResetToken.java:63-66` [#6008cb44b64f55ce-1]. | deducible |
| rules | - ThemePreference.fromValue compare sans trim ni changement de casse et lève IllegalArgumentException pour une valeur nulle ou inconnue, voir `mytimeline:backend/src/main/java/com/matimeline/eventmanager/domain/models/ThemePreference.java:40-49` [#52f9f4a8f8d8b618-1]. | deducible |
| alerts | - Les méthodes markRunning, markCompleted et markFailed de ExportJob ne lisent pas le statut courant, donc le modèle accepte une transition depuis COMPLETED ou FAILED. Selon la javadoc le cycle va de PENDING à RUNNING puis COMPLETED ou FAILED, mais l'enum n'a aucune méthode de transition et rien ne l'impose. Garder la garde de statut dans l'appelant ou l'ajouter au modèle, voir `mytimeline:backend/src/main/java/com/matimeline/eventmanager/domain/models/export/ExportJob.java:48-62` [#8096253e175ca857-1] [#3b402fae6e28454a-1] [#3b402fae6e28454a-2]. | rediscovered (4 appels) |

## Règles métier {#t-business_rule}

| Pointeur | Énoncé | Fait |
|---|---|---|
| `mytimeline:backend/src/main/java/com/matimeline/eventmanager/domain/models/PasswordResetToken.java:63-66` | Un token est utilisable seulement s'il n'est pas consommé et n'est pas expiré à l'instant now. | [#6008cb44b64f55ce-1] |
| `mytimeline:backend/src/main/java/com/matimeline/eventmanager/domain/models/export/ExportJob.java:65-70` | Un job est téléchargeable seulement si son statut est COMPLETED, que storageRef et expiresAt sont renseignés et que now est avant expiresAt. | [#39e016af7a8585d6-1] |
| `mytimeline:frontend/src/lib/schemas/export.ts:33-35` | Le code considère COMPLETED et FAILED comme les deux statuts terminaux d'un job d'export, et l'arrêt du polling repose sur ce test. | [#b41ecf1b43916e73-1] |

## Validations {#t-validation}

| Pointeur | Énoncé | Fait |
|---|---|---|
| `mytimeline:backend/src/main/java/com/matimeline/eventmanager/domain/models/RecurrenceUnit.java:30-51` | fromString renvoie null pour une valeur nulle ou vide, accepte WEEK, WEEKS, MONTH, MONTHS, YEAR et YEARS sans tenir compte de la casse, et lève IllegalArgumentException pour toute autre valeur. | [#3316e4f42e7d1b2e-1] |
| `mytimeline:backend/src/main/java/com/matimeline/eventmanager/domain/models/ThemePreference.java:40-49` | fromValue compare la valeur à light, dark ou system sans trim ni changement de casse, et lève IllegalArgumentException si la valeur est nulle ou inconnue. | [#52f9f4a8f8d8b618-1] |

## Transitions d'état {#t-state_transition}

| Pointeur | Énoncé | Fait |
|---|---|---|
| `mytimeline:frontend/src/lib/schemas/export.ts:29` | Javadoc : La documentation du schéma décrit la transition PENDING vers RUNNING puis vers COMPLETED ou FAILED, sans code qui pilote cette transition côté frontend. | [#fe61f927fe31008f-1] |

## Faits suspects {#t-suspicious}

| Pointeur | Énoncé | Fait |
|---|---|---|
| `mytimeline:backend/src/main/java/com/matimeline/eventmanager/domain/models/PasswordResetToken.java:72-74` | consume n'appelle pas isUsable, donc il produit une copie consommée même pour un token déjà consommé ou expiré. | [#c37611432b5807a9-1] |
| `mytimeline:backend/src/main/java/com/matimeline/eventmanager/domain/models/export/ExportJob.java:48-62` | Les méthodes markRunning, markCompleted et markFailed n'interrogent pas le statut courant, donc le modèle accepte une transition depuis COMPLETED ou FAILED. | [#8096253e175ca857-1] |

## Conventions {#t-convention}

| Pointeur | Énoncé | Fait |
|---|---|---|
| `mytimeline:backend/src/main/java/com/matimeline/eventmanager/domain/models/RecurrenceUnit.java:7-9` | Javadoc : Selon la javadoc, RecurrenceUnit est persisté par son nom via @Enumerated(EnumType.STRING) côté entité, et la migration V7 réaligne les anciennes valeurs texte. | [#781bc749af77ddef-1] |
| `mytimeline:backend/src/main/java/com/matimeline/eventmanager/domain/models/ThemePreference.java:10-11` | Javadoc : Selon la javadoc, la persistance de ThemePreference passe par un AttributeConverter et non par @Enumerated(STRING). | [#950044d26baf5570-1] |
| `mytimeline:backend/src/main/java/com/matimeline/eventmanager/domain/models/User.java:13-17` | Commentaire : Selon un commentaire, la préférence de thème s'écrit uniquement via le port updateThemePreference, jamais par save(User). | [#2fcce7f8d3fca851-1] |
| `mytimeline:backend/src/main/java/com/matimeline/eventmanager/domain/models/export/ExportJob.java:10-11` | Javadoc : Selon la javadoc, les transitions du job sont pilotées par le use case et non par le domaine. | [#8573c7ab10277f70-1] |
| `mytimeline:backend/src/main/java/com/matimeline/eventmanager/domain/models/export/ExportJob.java:12-13` | Javadoc : Selon la javadoc, completedAt et expiresAt ne sont renseignés qu'à la complétion du job. | [#8573c7ab10277f70-2] |
| `mytimeline:backend/src/main/java/com/matimeline/eventmanager/domain/models/export/ExportJobStatus.java:3-7` | Javadoc : Selon la javadoc, le cycle de vie d'un job d'export va de PENDING à RUNNING, puis à COMPLETED ou FAILED. | [#3b402fae6e28454a-1] |
| `mytimeline:backend/src/main/java/com/matimeline/eventmanager/domain/models/export/ExportJobStatus.java:8-13` | L'enum ExportJobStatus porte quatre constantes, PENDING, RUNNING, COMPLETED et FAILED, sans aucune méthode de transition. | [#3b402fae6e28454a-2] |
| `mytimeline:frontend/src/lib/schemas/export.ts:9-11` | Javadoc : Selon le commentaire d'en-tête, downloadUrl et expiresAt sont nullables côté backend et le schéma utilise .nullable() et non .nullish(). | [#5c623b5364809082-1] |
| `mytimeline:frontend/src/lib/schemas/export.ts:25-27` | Les formats JSON et MARKDOWN sont classés comme synchrones (réponse inline), les autres formats relèvent de l'asynchrone, selon la constante SYNC_FORMATS. | [#10f6e5f3c0f2637e-1] |
| `mytimeline:frontend/src/lib/schemas/export.ts:29-31` | Le cycle de vie d'un job d'export async est modélisé par un enum Zod à quatre valeurs : PENDING, RUNNING, COMPLETED, FAILED. | [#43216ccd0ca58163-1] |
| `mytimeline:frontend/src/lib/schemas/export.ts:42-48` | Le schéma de réponse déclare status avec exportJobStatusSchema et downloadUrl, expiresAt avec .nullable(). | [#5c623b5364809082-2] |
