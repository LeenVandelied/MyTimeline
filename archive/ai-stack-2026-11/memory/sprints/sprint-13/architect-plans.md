# Mini-plans architect — Sprint 13

> Généré par /sprint plan (architect). Lu par /sprint start Phase 4.1
> pour injection dans HEAD du briefing fullstack-dev (section "## Plan d'implementation").

```yaml
issue_0073:
  fichiers_cles:
    - "backend/src/main/java/.../infrastructure/entities/SessionEntity.java  # nouveau"
    - "backend/src/main/java/.../infrastructure/adapters/repositories/jpa/SessionRepository.java  # nouveau"
    - "backend/src/main/java/.../infrastructure/security/JwtService.java  # ajouter jti (UUID)"
    - "backend/src/main/java/.../infrastructure/security/JwtFilter.java  # lookup jti revoque"
    - "backend/src/main/java/.../infrastructure/adapters/controllers/SessionController.java  # nouveau (GET, DELETE /{id}, DELETE /others)"
    - "backend/src/main/java/.../domain/ports/services/SessionService.java  # nouveau"
    - "backend/src/main/resources/db/migration/V11__create_sessions.sql  # nouveau (index sur jti)"
  couches_touchees: ["domain","application","infrastructure"]
  strategie_test: "integration (jti dans JWT, revocation->401 requete suivante, /others, logout revoque) + unit"
  risque_regression: "Lookup jti a CHAQUE requete authentifiee sans index -> scans sequentiels (PAT-S5-004 : index FK obligatoire) ; IP en clair = violation RGPD (tronquer dernier octet)."
  ordre_ecriture: "domain port -> entity+repo -> JwtService jti -> JwtFilter lookup -> SessionController -> migration V11"
  zod_dto_sync: "NON (frontend Reglages/sessions #86/#87 hors des 5 sprints)"
  possibly_done: false
  etat_reel_du_code: "(aucune evidence — FAUX POSITIF #73 acte Phase 0.5 ; JwtService/JwtFilter existants sans jti)"

issue_0078:
  fichiers_cles:
    - "backend/src/main/java/.../infrastructure/adapters/controllers/UserController.java  # DELETE /me"
    - "backend/src/main/java/.../domain/ports/services/UserService.java  # deleteAccount(userId, confirmUsername)"
    - "backend/src/main/java/.../application/services/UserServiceImpl.java"
    - "backend/src/main/java/.../infrastructure/entities/UserEntity.java  # cascade verif vers products/events"
    - "backend/src/main/resources/db/migration/V12__account_delete_cascade.sql  # si cascade DB requise"
  couches_touchees: ["domain","application","infrastructure"]
  strategie_test: "integration (DELETE /me bon username->204 cascade, mauvais/absent->400, 2e appel->401, cookie MaxAge=0)"
  risque_regression: "Cascade transactionnelle partielle si dependance non mappee -> suppression a mi-chemin ; token en vol valide 2j sans #73 (mitige car #73 dans le meme sprint)."
  ordre_ecriture: "apres #73 -> UserService.deleteAccount -> revoke sessions (#73) -> controller -> cascade migration si besoin"
  zod_dto_sync: "NON"
  possibly_done: false
  etat_reel_du_code: "(aucune evidence — UserController.java 5.6K present, pas de DELETE /me)"
```

## Sequencement intra-sprint
- V1 : #73 (fondation table `sessions` V11 + jti dans JwtService/JwtFilter).
- V2 : #78 consomme `SessionService.revokeAllSessions(userId)` de #73 -> APRES #73. Conflit potentiel `JwtService`/`UserController`.
- Migrations : V11 (sessions #73). #78 = cascades JPA ; si `ON DELETE CASCADE` DB requise -> V12 sequentiel (ne PAS rediter V11).

## Dependance inter-sprint
- Depend de S9 (#44 : champ avatar — pour coherence User ; #73/#78 = auth pur).

## Reporte (hors 5 sprints)
- #75 (avatar) : infra MinIO/S3 (port storage + credentials + CORS bucket), sujet isole, faible cohesion avec sessions.
- #86/#87 (Reglages frontend desktop/mobile) : Wave 5 frontend, consomment #73/#78.
