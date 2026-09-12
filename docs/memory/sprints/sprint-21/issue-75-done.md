# Issue #75 — Backend upload avatar (POST/DELETE/GET /me/avatar)

**Vague :** 1 (backend, parallèle avec #86)
**Commit :** ea89f59 `:sparkles: #75 Upload avatar POST/DELETE/GET /me/avatar (stockage local + StoragePort)`
**Statut vérifié :** commit sur `sprint/21` (worktree), 17 fichiers backend, aucun frontend touché.

## Résumé
Upload/suppression/lecture avatar authentifiés. BR-AUT-001 (ownership : opérations sur le caller résolu depuis le JWT, jamais un id client).

Endpoints (dans `UserController`, `@RequestMapping("/api/me")`) :
- `POST /api/me/avatar` multipart part `file` → valide + stocke + maj `User.avatar` + supprime l'ancien → **200** `UserResponse` (avec `avatarUrl`).
- `GET /api/me/avatar` → streame les octets (Content-Type réel) → **200** ; **404** si aucun avatar. Authentifié.
- `DELETE /api/me/avatar` → `avatar=null` + supprime fichier, idempotent → **204**.

Fichiers clés : `domain/ports/services/StoragePort.java`, `domain/ports/services/AvatarService.java`, `domain/models/AvatarContent.java`, `application/services/AvatarServiceImpl.java`, `infrastructure/adapters/LocalStorageAdapter.java`, exceptions `InvalidAvatarException`(400)/`AvatarNotFoundException`(404), `GlobalExceptionHandler`, `UserResponse` (+`avatarUrl`).

## Migration
**AUCUNE** — colonne `avatar` déjà en base (V7 #44). Dernière migration reste V11. (Pas de RECOMMAND_DB_EXPERT.)

## OWASP upload (checklist security-expert appliquée)
Type par **magic bytes** (jamais Content-Type client), taille 5 Mo (`spring.servlet.multipart.max-file-size=5MB` + contrôle applicatif), nom stocké = UUID (anti path-traversal, résolution bornée sous baseDir), cleanup ancien fichier, pas de log binaire.
Config : `STORAGE_AVATAR_PATH` (fail-fast prod sans default ; default dev `./var/avatars-dev` ; test = tmpdir).

## CONTRAT réponse (pour #86/#87/#151)
- `UserResponse` (GET/PATCH `/api/me`, POST avatar) contient désormais `avatarUrl` : `"/api/me/avatar"` si avatar présent, sinon `null`. URL relative vers l'endpoint **authentifié** (pas d'URL publique/signée). Le front consomme `avatarUrl` puis GET authentifié (cookie) pour afficher l'image.
- POST succès → 200 JSON `UserResponse` complet. Erreurs → `{"error":"..."}` : type non autorisé, `fichier trop volumineux (max 5 Mo)`, `fichier vide` (400) ; 404 sur GET sans avatar.

## Tests
44 verts : `AvatarServiceImplTest` (12), `LocalStorageAdapterTest` (6 : round-trip + rejet path-traversal), `UserControllerTest` (+10 multipart), `ArchitectureTest` vert (hexagonal respecté).

## [MEMORY:*]
- **[MEMORY:decision]** ADR stockage avatar : **local privé** (`STORAGE_AVATAR_PATH`, hors webroot) + endpoint authentifié `GET /api/me/avatar`. Déviation ASSUMÉE du critère « MinIO/S3 + URL signée » (aucune infra objet dans le repo → scope creep évité). `StoragePort` isole le choix (swap S3/MinIO = nouvelle impl).
- **[MEMORY:pitfall]** Subagent lancé depuis worktree `sprint/21` : Bash `cd`/Write ont opéré sur le **repo principal** (`dev`), `git status` via proxy RTK masquait l'écart. Corrigé via `/usr/bin/git -C <worktree>`. Prévention : vérifier `git -C <worktree-abs> branch --show-current` avant Write + `/usr/bin/git -C` (bypass RTK). → réf [[sprint-subagent-worktree-cwd]].

## Recommandations suite
- RECOMMAND_FOLLOWUP : migration stockage objet (MinIO/S3) différée = nouvelle impl `StoragePort` ; resize/normalisation image (ré-encodage anti-EXIF) non fait ; cache/ETag sur `GET /api/me/avatar`.
- RECOMMAND_FOLLOWUP : documenter `STORAGE_AVATAR_PATH` dans `docs/runbook/deploiement-profils.md` (env prod obligatoire, volume persistant).
- Pas de RECOMMAND_DB_EXPERT (aucune migration). Pas de RECOMMAND_TEST_RUNNER (< 500 tests, < 3 min).

STATUS: COMPLETED
