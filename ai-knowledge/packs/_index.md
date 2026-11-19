# Index des packs : mytimeline

12 packs, 700 fichiers sur 700 rattachés, 0 restants. Chargé en phase 1 des skills ; les déclencheurs sont dans `_triggers.json`, les annexes ne se chargent que depuis leur pack.

| Pack | Sorte | En une phrase | Taille | Fichier | Annexe | Hypothèses open |
|---|---|---|---|---|---|---|
| event | domain | Charger quand la demande touche event, recurrence, timeline, les routes /api/events, events/evt-desktop, ou les entités EventEntity. | 180 fichiers, 1502 ko | domains/event.md | domains/event.details.md | 1 |
| user | domain | Charger quand la demande touche user, utilisateur, mot de passe, les routes /api/auth, /api/me, ou les entités UserEntity, PasswordResetTokenEntity. | 154 fichiers, 826 ko | domains/user.md | domains/user.details.md | 3 |
| product | domain | Charger quand la demande touche product, ou les entités ProductEntity. | 69 fichiers, 535 ko | domains/product.md | domains/product.details.md | 1 |
| session | domain | Charger quand la demande touche session, jwt, token, les routes /api/sessions, ou les entités SessionEntity. | 22 fichiers, 84 ko | domains/session.md | domains/session.details.md | 0 |
| category | domain | Charger quand la demande touche category, les routes /api/categories, api/categories, ou les entités CategoryEntity. | 32 fichiers, 187 ko | domains/category.md | domains/category.details.md | 1 |
| export | domain | Charger quand la demande touche export, zip, téléchargement, les routes /api/export, ou les entités ExportJobEntity. | 31 fichiers, 92 ko | domains/export.md | domains/export.details.md | 0 |
| authorization | transversal | Charger quand un fichier du périmètre porte le motif authorization (densité ≥ 3) ou quand la demande touche authorization dans user, session, export. | 0 fichiers, 0 ko | transversal/authorization.md |  | 0 |
| integrations | transversal | Charger quand un fichier du périmètre porte le motif integrations (densité ≥ 3) ou quand la demande touche integrations dans user, event, export. | 0 fichiers, 0 ko | transversal/integrations.md |  | 0 |
| batch | transversal | Charger quand un fichier du périmètre porte le motif batch (densité ≥ 3) ou quand la demande touche batch dans user, export. | 0 fichiers, 0 ko | transversal/batch.md |  | 0 |
| backend-core | technical | Charger quand le diff touche backend/infrastructure, backend/db, backend/ ou qu'un bloc backend est prévu. | 44 fichiers, 326 ko | technical/backend-core.md |  | 0 |
| frontend-core | technical | Charger quand le diff touche frontend/components, frontend/lib, frontend/hooks ou qu'un bloc frontend est prévu. | 127 fichiers, 778 ko | technical/frontend-core.md |  | 0 |
| frontend-app | technical | Charger quand le diff touche frontend-app/[locale], frontend-app/(root) ou qu'un bloc frontend est prévu. | 41 fichiers, 179 ko | technical/frontend-app.md |  | 0 |
