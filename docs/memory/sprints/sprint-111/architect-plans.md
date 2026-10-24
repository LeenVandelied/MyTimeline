# Mini-plans architect — Sprint 111

> Généré par /sprint plan 10 -c "focus design et mvp" (architect, 2026-09-22, base `e0a3dab8`).
> Lu par /sprint start Phase 4.1 (section « Plan d'implémentation » du briefing fullstack-dev).
> Axe arbitré par le dev : **écart maquette ↔ produit** ; bugs hors design admis seulement sur un écran déjà touché ;
> Phase 0.5 scriptée remplacée par une contre-vérification manuelle (architect, puis lead sur 7 affirmations clés).
> Numéros de ligne relevés sur `e0a3dab8` : à re-grepper au démarrage (le code bouge entre sprints).

**Thème :** Thème : une seule bascule, puis préférence de compte — cohésion 0.53
**Effort :** 6 pts | **Migrations Flyway :** **V16** | **Dépend de :** Sprint 109 (MobileDrawer touché par #632)

**Vagues :**
- V1 : #655 ∥ backend de #653 (V16, entité, endpoint — disjoint du frontend).
- V2 : frontend de #653 (persistance branchée sur le point d'écriture unifié par #655).
- Ordre #655 → #653 : 4 points d'écriture du thème, pas 3 (vérifié par le lead : theme-toggle.tsx:119, AppShell.tsx:307, MobileDrawer.tsx:93, PreferencesSection.tsx:82).
- Revue db-expert (V16) + security-expert (endpoint /api/me) par le lead.

```yaml
issue_655:
  fichiers_cles: ["frontend/src/components/ui/theme-toggle.tsx", "frontend/src/components/layout/AppShell.tsx:165,191,307", "frontend/src/components/dashboard/MobileDrawer.tsx:35,43,93"]
  couches_touchees: ["frontend"]
  strategie_test: "unit (garde mounted) + E2E landing-auth-theme-toggle"
  possibly_done: false
  etat_reel_du_code: "Confirmé : AppShell:191 et MobileDrawer:43 calculent isDark sans mounted. 4e point d'écriture PreferencesSection.tsx:82 (Select) non listé par l'énoncé."
issue_653:
  fichiers_cles:
    - "backend/src/main/resources/db/migration/V16__user_theme_preference.sql (nouveau)"
    - "backend/src/main/java/com/matimeline/eventmanager/domain/models/User.java"
    - "backend/src/main/java/com/matimeline/eventmanager/infrastructure/entities/UserEntity.java"
    - "backend/src/main/java/com/matimeline/eventmanager/application/dtos/UserResponse.java"
    - "backend/src/main/java/com/matimeline/eventmanager/application/mappers/UserMapper.java"
    - "backend/src/main/java/com/matimeline/eventmanager/infrastructure/adapters/controllers/UserController.java"
    - "backend/src/main/java/com/matimeline/eventmanager/application/services/UserDataExportAssembler.java (export RGPD)"
    - "frontend/src/types/user.ts, frontend/src/services/userService.ts, frontend/src/components/theme-provider.tsx, frontend/src/types/settings.ts:36"
  couches_touchees: ["domain", "application", "infrastructure", "frontend"]
  strategie_test: "unit backend + boot ddl-auto=validate + E2E (préférence locale adoptée à la connexion ; préférence du compte gagnante dans un 2e contexte)"
  risque_regression: "PATCH /api/me exige name, username, email @NotBlank (UserUpdateRequest.java:15,19,23 — vérifié par le lead) → endpoint dédié obligatoire."
  ordre_ecriture: "ADR-010 (règle DEC-S82-009, decisions.md:774) → V16 (colonne nullable theme_preference IN light/dark/system, NULL = pas de choix) → domaine + entité (create id=null inchangé) → UserResponse + mapper → PUT /api/me/preferences → export RGPD → Zod user.ts → arbitrage dans le provider après login"
  zod_dto_sync: "OUI"
  possibly_done: false
  etat_reel_du_code: |
    Confirmé : aucune occurrence de theme dans backend/src/main/java ; dernière migration V15.
    BR impactée : BR-AUT-008 (br-auth.md:94, projection /me). [MEMORY:business-rule] arbitrage local/compte à la connexion.
    [MEMORY:decision] colonne nullable V16 + endpoint dédié PUT /api/me/preferences (à consigner en ADR-010).
```
