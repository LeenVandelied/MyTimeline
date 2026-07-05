# Sprint 21 — Réglages utilisateur (avatar + écrans desktop/mobile)

Epic `auth` · cohésion 0.75 · milestone #21

## Objectif
Doter MyTimeline d'une page **Réglages** complète : upload d'avatar (backend), écrans desktop 4 chapitres, et déclinaison mobile drill-down.

## Issues livrées

| # | Titre | Commit |
|---|-------|--------|
| #75 | Backend upload avatar `POST/GET/DELETE /api/me/avatar` (stockage local + `StoragePort` hexagonal) | `ea89f59` |
| #86 | Frontend Réglages desktop — 4 chapitres (Profil / Sécurité / Préférences / Compte) | `43d9e14` |
| #87 | Frontend Réglages mobile — drill-down + bottom sheet suppression | `5b5bba6` |
| — | Correction review : branchement avatar frontend bout-en-bout | `d10e4a3` |

**Vagues** : V1 = #75 (backend) ∥ #86 (frontend desktop) · V2 = #87 (réutilise #86 + #75) · Correction post-review.

## Changements clés

### Backend (#75)
- Endpoints `POST` (multipart, part `file`) / `GET` (stream authentifié) / `DELETE` (204) `/api/me/avatar`.
- Architecture hexagonale : `StoragePort` (domaine) + `LocalStorageAdapter` (infra) + `AvatarService`/`AvatarServiceImpl`. Le swap MinIO/S3 futur = nouvelle impl derrière le port.
- `UserResponse` expose désormais `avatarUrl` (débloque la dette #151).
- **Aucune migration** : la colonne `avatar` existait déjà (V7 #44). Dernière migration reste V11.

### Frontend (#86 / #87 / correction)
- Page `/settings` : rendu conditionnel desktop (`SettingsShell` tablist) vs mobile (`MobileSettings` drill-down) via `useMediaQuery`.
- 4 chapitres réutilisables (sections + hooks séparés présentation/logique) ; `BottomSheet` accessible (focus trap, Escape, swipe-down, safe-area iOS).
- Avatar branché bout-en-bout : `userService.uploadAvatar/deleteAvatar`, `UserSchema.avatarUrl` (nullable), mutations TanStack Query + `refreshUser` (AuthContext), i18n 4 locales.

## BR impactées
- **BR-AUT-001** — Le profil (dont avatar) appartient à l'utilisateur identifié ; seul lui peut le modifier/supprimer. Ownership dérivé du cookie JWT côté backend (jamais un id client). Suppression compte = re-saisie username.

## Décision d'architecture (ADR)
**Stockage avatar en local privé** (`STORAGE_AVATAR_PATH`, hors webroot, servi via endpoint authentifié) plutôt que MinIO/S3 + URL signée. Motif : aucune infra objet dans le repo (pas de docker-compose, pas de dépendance Maven, pas de `STORAGE_*`) → la monter mid-sprint = scope creep. `StoragePort` isole le choix ; migration objet différée en follow-up. **Déviation assumée** du critère d'acceptation initial de #75 (validée par security-expert).

## Sécurité (audit OWASP upload — GO)
Validation MIME par **magic bytes** (jamais Content-Type/extension), limite 5 Mo (config multipart + applicatif), nom stocké = UUID (anti path-traversal, `resolveWithinBase` double-check), endpoint authentifié, cleanup des orphelins, aucune fuite d'exception. 0 CRITIQUE / 0 MAJEUR.

## Tests
- Backend : **268/268** verts (magic bytes, ownership, path-traversal, cleanup, DELETE idempotent).
- Frontend : **271/271** verts (261 baseline + 10 correction avatar) ; `tsc` + `next build` 0 erreur.
- Détail : `docs/memory/audits/sprint-21-test-coverage.md`.

## Review
- security-expert : **GO** (upload cité comme modèle de référence).
- reviewer batch : 0 CRITIQUE / 3 MAJEUR / 3 MINEUR → **3 MAJEUR résolus** (`d10e4a3`), MINEUR non bloquants.

## Coverage E2E — action post-merge
54 nouveaux `data-testid` (flux avatar/password/delete/export/sessions) sans spec E2E dédiée. Infra E2E naissante + wrapper sans backend orchestré. **Plan : `/create-e2e` après merge** (le contrat cross-system est couvert en intégration MockMvc + composant).

## Follow-ups identifiés (triage en `/sprint end`)
- Brancher l'export données RGPD (`GET /api/me/export` non livré backend, stub UI).
- Migration stockage objet (MinIO/S3) derrière `StoragePort`.
- Resize/normalisation image (ré-encodage anti-EXIF), cache/ETag sur `GET /api/me/avatar`.
- Documenter `STORAGE_AVATAR_PATH` dans le runbook déploiement.
- Gestion clavier virtuel Android (`visualViewport`) — vérifier sur device réel.
