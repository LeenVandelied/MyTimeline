# Index des packs : mytimeline

14 packs, 700 fichiers sur 700 rattachés, 0 restants. Chargé en phase 1 des skills ; les déclencheurs sont dans `_triggers.json`, les annexes ne se chargent que depuis leur pack.

| Pack | Sorte | En une phrase | Taille | Fichier | Annexe | Hypothèses open |
|---|---|---|---|---|---|---|
| event | domain | Charger quand la demande touche event, recurrence, passwordresettoken, les routes /api/events, ou les entités EventEntity, PasswordResetTokenEntity. | 49 fichiers, 255 ko | event.instructions.md | event.details.md | 0 |
| user | domain | Charger quand la demande touche user, utilisateur, mot de passe, les routes /api/auth, /api/me, ou les entités UserEntity. | 81 fichiers, 397 ko | user.instructions.md | user.details.md | 2 |
| product | domain | Charger quand la demande touche product, ou les entités ProductEntity. | 18 fichiers, 129 ko | product.instructions.md | product.details.md | 0 |
| session | domain | Charger quand la demande touche session, jwt, token, les routes /api/sessions, ou les entités SessionEntity. | 23 fichiers, 108 ko | session.instructions.md | session.details.md | 0 |
| category | domain | Charger quand la demande touche category, les routes /api/categories, ou les entités CategoryEntity. | 20 fichiers, 93 ko | category.instructions.md | category.details.md | 0 |
| export | domain | Charger quand la demande touche export, zip, téléchargement, les routes /api/export, ou les entités ExportJobEntity. | 35 fichiers, 107 ko | export.instructions.md | export.details.md | 0 |
| authorization | transversal | Charger quand un fichier du périmètre porte le motif authorization (densité ≥ 3) ou quand la demande touche authorization dans user, session, export. | 35 fichiers, 313 ko | authorization.instructions.md | authorization.details.md | 0 |
| integrations | transversal | Charger quand un fichier du périmètre porte le motif integrations (densité ≥ 3) ou quand la demande touche integrations dans user, event, export. | 98 fichiers, 767 ko | integrations.instructions.md | integrations.details.md | 0 |
| batch | transversal | Charger quand un fichier du périmètre porte le motif batch (densité ≥ 3) ou quand la demande touche batch dans user, export. | 9 fichiers, 42 ko | batch.instructions.md | batch.details.md | 0 |
| backend-core | technical | Charger quand le diff touche backend/infrastructure, backend/(root), backend/support ou qu'un bloc backend est prévu. | 38 fichiers, 318 ko | backend-core.instructions.md | backend-core.details.md | 0 |
| frontend-core | technical | Charger quand le diff touche frontend/components/components, frontend/hooks/hooks, frontend/services/services ou qu'un bloc frontend est prévu. | 344 fichiers, 2598 ko | frontend-core.instructions.md | frontend-core.details.md | 0 |
| frontend-app | technical | Charger quand le diff touche frontend-app/[locale], frontend-app/(root) ou qu'un bloc frontend est prévu. | 41 fichiers, 179 ko | frontend-app.instructions.md | frontend-app.details.md | 0 |
| lib-socle | technical | Charger quand le diff touche frontend/lib/lib ou qu'un bloc frontend est prévu. | 35 fichiers, 277 ko | lib-socle.instructions.md | lib-socle.details.md | 0 |
| migrations | technical | Charger quand le diff touche backend/db ou qu'un bloc base est prévu. | 16 fichiers, 47 ko | migrations.instructions.md | migrations.details.md | 0 |
