---
pack: batch
kind: transversal
name: Tâches planifiées et asynchrones
generated_at: 2026-11-19T16:00:00Z
generator: synth/1
base_sha256: ecbdfcab0c6f039b29af81329ccec9bccdbaeda3b66675e93c5ade962f273aba
facts_in_base: 43
facts_in_pool: 40
facts_cited: 23
sections: batch.sections.json
details: [batch.details.md]
lang: fr
curated_at: 2026-11-19T16:38:00Z
curation: batch.curation.json
---
## 1. Quand activer {#activate}

Ce pack s'active quand la demande ou le code touche l'un de ces éléments.

- Mots-clés : batch, scheduler, scheduled, cron, purge, async
- Chemins : `^backend:src/.*/(PasswordResetTokenPurgeScheduler|ExportPurgeScheduler|SchedulingConfig|AsyncConfig|AsyncExportRunner)[^/]*\.java$`

## 2. Lexique {#lexicon}

Aucun fait de la base ne relève de cette section.

## 3. Règles du motif {#rules}

### Export asynchrone
- La méthode run s'exécute sur l'executor exportExecutor, en transaction, et doit être appelée via un bean distinct. [#626250add9b61251-1]
- Le job passe à RUNNING avant la génération, puis à COMPLETED avec une expiration à 24 heures, ou à FAILED avec le code GENERATION_ERROR si une RuntimeException est levée. [#92871d4006ddb92f-1] [#92871d4006ddb92f-2] [#92871d4006ddb92f-3] [#44dd721f941d7c5b-1]
- L'executor exportExecutor a 2 threads de base, 4 au maximum et une file de 50, et à saturation la tâche s'exécute sur le thread appelant. [#b583274d61001cee-1] [#3a7fe13cb6f4e406-1]
### Purges planifiées
- La purge des exports expirés tourne en fixedDelay toutes les heures, premier passage après 5 minutes, réglable par app.export.purge.interval-ms. [#975432c3f0e38e69-1]
- La purge des exports tourne dans une transaction unique, supprime le fichier avant la ligne, et une erreur sur un job n'interrompt pas le balayage. [#5715b77c36e0dbb9-1] [#5715b77c36e0dbb9-2] [#5715b77c36e0dbb9-4]
- La purge des tokens de réinitialisation tourne toutes les 24 heures, premier passage après 5 minutes, avec une rétention par défaut de 24 heures. [#99a2df300c170ed7-1] [#69a4d4a588e40595-1]
### Réinitialisation de mot de passe
- L'executor passwordResetExecutor a 2 threads de base, 4 au maximum et une file de 100. [#c856ebdf3b1791e2-1]
### Vérifié dans le code
- PasswordResetTokenPurgeScheduler.purgeConsumedAndExpired supprime via deleteConsumedOrExpiredBefore les tokens consommés (quelle que soit la date) et ceux dont expiresAt est antérieur à now moins retention-hours (24h par défaut) [#user/563f5227781f68fa-1] `backend:src/main/java/com/matimeline/eventmanager/infrastructure/adapters/repositories/jpa/PasswordResetTokenRepositoryJpaImpl.java:93-94`.

## 4. Structure {#structure}

#### backend:src/main/java/com/matimeline/eventmanager/application/services/AsyncExportRunner.java
| Symbole | Énoncé | Lignes | Fait |
|---|---|---|---|
| AsyncExportRunner.run | La méthode run passe le job au statut RUNNING via markRunning puis le persiste avant la génération du fichier. (partiel) | L61-68 | [#92871d4006ddb92f-1] |
| AsyncExportRunner.run | Si assemble, render et store réussissent, le job passe à COMPLETED avec la référence de stockage et une expiration calculée à partir de DOWNLOAD_TTL_HOURS. (partiel) | L70-78 | [#92871d4006ddb92f-2] |
| AsyncExportRunner.run | Toute RuntimeException dans la génération fait passer le job à FAILED avec le code borné GENERATION_ERROR, et seul le nom de la classe d'exception est journalisé. (partiel) | L80-85 | [#92871d4006ddb92f-3] |

## 5. Mise en œuvre par domaine {#surface}

### Export de données (purge des jobs expirés)
- Le balayage de purge charge d'un coup tous les jobs d'export expirés à l'instant courant, sans pagination visible, dans `backend:src/main/java/com/matimeline/eventmanager/application/services/ExportPurgeScheduler.java:63-64`. [#2bdf2db83a151dc3-1]

## 6. Fichiers critiques {#files}

Fichiers du pool au poids le plus élevé (6 sur 9), le poids étant la somme des scores de spécificité de leurs faits. Liste complète : annexe.

| Fichier | Faits | Sortes dominantes |
|---|---|---|
| `backend:src/main/java/com/matimeline/eventmanager/application/services/AsyncExportRunner.java` | 7 | state_transition 3, convention 2, business_rule 1 |
| `backend:src/main/java/com/matimeline/eventmanager/application/services/PasswordResetTokenPurgeScheduler.java` | 5 | batch_job 1, business_rule 1, config 1 |
| `backend:src/main/java/com/matimeline/eventmanager/application/services/ExportPurgeScheduler.java` | 7 | convention 4, batch_job 1, other 1 |
| `backend:src/main/java/com/matimeline/eventmanager/infrastructure/config/AsyncConfig.java` | 4 | convention 2, config 1, suspicious 1 |
| `backend:src/test/java/com/matimeline/eventmanager/infrastructure/adapters/controllers/ForgotPasswordAsyncTest.java` | 5 | test_case 3, convention 1, suspicious 1 |
| `backend:src/main/java/com/matimeline/eventmanager/infrastructure/config/SchedulingConfig.java` | 2 | config 1, convention 1 |

## 7. Relations avec d'autres packs {#relations}

Packs liés par des faits repris, des faits équivalents écartés à la déduplication ou le catalogue.

| Pack | Faits repris | Faits équivalents | Catalogue |
|---|---|---|---|
| export | 18 | 10 | oui |
| user | 16 | 10 | oui |
| backend-core | 6 | 0 |  |

- Faits du pool par pack d'origine : export 18, user 16, backend-core 6

## 8. Tests attendus {#tests}

- Les tests fixent qu'un job d'export COMPLETED expiré perd son fichier et sa ligne, qu'un job non expiré garde les deux, et qu'un job expiré dont le fichier est absent est purgé sans exception [#976217c793029b36-1] [#4d438c4f5ca95c37-1] [#3e2957bcbbbe0496-1].
- Les tests fixent que requestReset rend la main en moins de 4 000 ms alors que l'envoi du mail est bloqué par un latch de 5 s, puis que l'envoi et la création du token sont appelés par la tâche async dans un délai de 5 s [#0457acca23533817-1] [#0457acca23533817-2].
- Selon le commentaire du test, il faut injecter le vrai bean PasswordResetService proxifié et non un mock pour exercer @Async, voir `backend:src/test/java/com/matimeline/eventmanager/infrastructure/adapters/controllers/ForgotPasswordAsyncTest.java:60-62` [#503dbc5a3bdf8315-1].

## 9. Questions ouvertes {#questions}

Aucun fait de la base ne relève de cette section.

## 10. Alertes {#alerts}

- Le test dont le nom annonce qu'aucun email n'est envoyé pour un email inconnu n'asserte que le statut 200 et l'absence d'exception, sans verify sur emailService. Ce test ne protège donc pas contre un envoi d'email indu. Ajouter la vérification avant de s'y fier, voir `backend:src/test/java/com/matimeline/eventmanager/infrastructure/adapters/controllers/ForgotPasswordAsyncTest.java:119-132` [#9c0729d39059d8b1-1].

## 11. Couverture {#coverage}

- Fichiers du pack : 9 ; avec au moins un fait en base : 9 ; sans fait après remise en file : 0.
- Faits en base : 43, repris d'autres packs : +0, hors périmètre : -2, doublons écartés à la déduplication : -1, soit 40 dans le pool.
- Faits du pool venus d'un autre pack : 40 (par pack : section Relations).
- Destination des 40 faits du pool : Règles du motif 20 ; Mise en œuvre par domaine 1 ; Tests attendus 10 ; Alertes / Questions ouvertes 4 ; annexe seule 1 ; écartés (sorte `other` ou inconnue) 4.
- Passe transversale : scope 9 fichiers, tous lus.
- Base : sha256 ecbdfcab0c6f…, générée le 2026-11-19.
