# Mini-plans architect — Sprint 45

> Généré par /sprint plan 5 (architect, 2026-07-16). Lu par /sprint start Phase 4.1
> pour injection dans le HEAD du briefing fullstack-dev (section "## Plan d'implementation").
>
> ⚠ **Chemins corrigés par le lead après vérification** — l'architecte avait annoncé
> `frontend/src/middleware.ts` (INEXISTANT). Le vrai fichier est `frontend/middleware.ts`.
> L'app router est `frontend/app/`, PAS `frontend/src/app/`. Cf. [[PIT-S45-PATHS]].

```yaml
issue_302:
  fichiers_cles:
    - "frontend/middleware.ts"                                      # ⚠ CORRIGE : PAS frontend/src/middleware.ts. Vérifié : next-intl SEUL (createMiddleware), matcher '/((?!api|_next|.*\\..*).*)', ZERO auth/jwt/cookie
    - "frontend/src/hooks/useAuthGuard.ts"                          # vérifié : garde CLIENT #210, consommée par AppShell + pages (app)
    - "frontend/src/components/layout/AppShell.tsx"                 # consommateur useAuthGuard
    - "frontend/app/[locale]/(app)/timeline/page.tsx"               # vérifié L44 useAuthGuard
    - "frontend/app/[locale]/(app)/dashboard/"                      # vérifié (répertoire)
    - "frontend/app/[locale]/(app)/products/"                       # vérifié (répertoire)
    - "backend/src/main/java/com/matimeline/eventmanager/infrastructure/security/JwtFilter.java"  # vérifié L48 : cookie nommé "jwt"
    - "backend/src/main/java/com/matimeline/eventmanager/infrastructure/adapters/controllers/AuthController.java"  # vérifié L145 @GetMapping("/me")
  couches_touchees: ["frontend"]        # backend seulement SI /api/auth/me jugé insuffisant
  strategie_test: "unit+E2E"
  risque_regression: "Le route group `(app)` n'apparait PAS dans l'URL — le middleware devra hardcoder la liste des segments protégés (/dashboard,/timeline,/products) préfixés par la locale ; oublier un segment = garde silencieusement inactive, en ajouter un de trop = boucle de redirection sur /login. Le middleware existant est next-intl : COMPOSER avec createMiddleware, ne pas l'écraser (sinon routing localisé cassé, régression #235)."
  ordre_ecriture: "ADR (présence cookie vs validation via /api/auth/me) → middleware → E2E"
  zod_dto_sync: "NON"
  possibly_done: false
  etat_reel_du_code: "(aucune evidence de travail déjà fait — frontend/middleware.ts = next-intl uniquement, aucune garde serveur)"

issue_283:
  fichiers_cles:
    - "frontend/e2e/support/db.ts"                                  # vérifié : import { Pool } from 'pg', poll password_reset_tokens (V6)
    - "frontend/e2e/forgot-password.spec.ts"                        # vérifié
    - "frontend/package.json"                                       # vérifié : "pg": "^8.22.0" à retirer
    - "backend/src/main/java/com/matimeline/eventmanager/infrastructure/adapters/email/"  # BrevoEmailService (NO-OP en test)
    - "backend/src/main/java/com/matimeline/eventmanager/infrastructure/adapters/controllers/"  # hôte de l'endpoint test-only
    - "backend/src/main/resources/application-dev.properties"
    - ".github/workflows/ci.yml"                                    # vérifié L156 : SPRING_PROFILES_ACTIVE: dev
  couches_touchees: ["application","infrastructure","frontend"]
  strategie_test: "integration+E2E"
  risque_regression: "PIEGE VERIFIE PAR LE LEAD — le job CI e2e tourne SPRING_PROFILES_ACTIVE=dev (ci.yml:156). Un endpoint gardé par @Profile(\"e2e\") ne sera JAMAIS actif en CI : soit créer application-e2e.properties + changer ci.yml, soit garder sur \"dev\" — mais alors l'endpoint est exposé en dev local. Décision à acter en ADR AVANT de coder, avec un test prouvant l'absence du bean en profil prod (pattern en place : ProdConfigStartupLogger.java:32, BrevoHealthIndicator.java:26)."
  ordre_ecriture: "ADR (endpoint test-only vs mock EmailService en mémoire) → domain(port) → application → infrastructure → ci.yml → e2e"
  zod_dto_sync: "NON"
  possibly_done: false
  etat_reel_du_code: "(aucune evidence — db.ts documente lui-même le couplage V6 et renvoie au RECOMMAND_FOLLOWUP)"

issue_284:
  fichiers_cles:
    - "frontend/e2e/forgot-password.spec.ts"                        # vérifié (spec nominale S37)
    - "frontend/e2e/support/accounts.ts"                            # vérifié
  couches_touchees: ["frontend"]
  strategie_test: "E2E"
  risque_regression: "Le lockout par token (#141) peut faire échouer la spec pour la mauvaise raison — le corps de #284 le prévient explicitement ; isoler un compte par cas de test."
  ordre_ecriture: "après #283 (la spec consomme le nouveau canal de capture du token)"
  zod_dto_sync: "NON"
  possibly_done: false
  etat_reel_du_code: "(aucune evidence — une seule spec forgot-password, cas nominal)"
```

## Vagues
- **V1 (parallélisable — fichiers disjoints)** : #302 (`frontend/middleware.ts`) ∥ #283 (backend controllers + `frontend/e2e/support/db.ts`)
- **V2 (après #283 — la spec consomme le nouveau canal)** : #284

## ADR à produire en amont
- `ADR-XXX-garde-serveur-middleware` (#302)
- `ADR-XXX-canal-token-reset-e2e` (#283) — **bloquant, à trancher avant de coder**
