# Index des packs : mytimeline

9 packs, 420 fichiers sur 700 rattachés, 280 restants. Chargé en phase 1 des skills ; les déclencheurs sont dans `_triggers.json`, les annexes ne se chargent que depuis leur pack.

| Pack | Sorte | En une phrase | Taille | Fichier | Annexe | Hypothèses open |
|---|---|---|---|---|---|---|
| user | domain | Charger quand la demande touche user, utilisateur, mot de passe, les routes /api/auth, /api/me, ou les entités UserEntity, PasswordResetTokenEntity. | 94 fichiers, 451 ko | domains/user.md | domains/user.details.md | 0 |
| event | domain | Charger quand la demande touche event, timeline, recurrence, les routes /api/events, ou les entités EventEntity. | 129 fichiers, 1174 ko | domains/event.md | domains/event.details.md | 0 |
| product | domain | Charger quand la demande touche product, ou les entités ProductEntity. | 46 fichiers, 380 ko | domains/product.md | domains/product.details.md | 0 |
| category | domain | Charger quand la demande touche category, les routes /api/categories, ou les entités CategoryEntity. | 32 fichiers, 187 ko | domains/category.md | domains/category.details.md | 1 |
| export | domain | Charger quand la demande touche export, zip, markdown, les routes /api/export, ou les entités ExportJobEntity. | 42 fichiers, 170 ko | domains/export.md | domains/export.details.md | 0 |
| session | domain | Charger quand la demande touche session, jwt, refresh, les routes /api/sessions, ou les entités SessionEntity. | 30 fichiers, 145 ko | domains/session.md | domains/session.details.md | 0 |
| authorization | transversal | Charger quand un fichier du périmètre porte le motif authorization (densité ≥ 3) ou quand la demande touche authorization dans user, session, export. | 0 fichiers, 0 ko | transversal/authorization.md |  | 0 |
| integrations | transversal | Charger quand un fichier du périmètre porte le motif integrations (densité ≥ 3) ou quand la demande touche integrations dans user, export, event. | 0 fichiers, 0 ko | transversal/integrations.md |  | 0 |
| backend-socle | technical | Charger quand le diff touche mytimeline/infrastructure, mytimeline/db, mytimeline/ ou qu'un bloc backend est prévu. | 47 fichiers, 313 ko | technical/backend-socle.md |  | 0 |
