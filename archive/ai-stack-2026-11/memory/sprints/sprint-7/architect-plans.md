# Mini-plans architect — Sprint 7

> Généré par /sprint plan 3 (architect, 2026-06-25). Lu par /sprint start 7 Phase 4.1.
> Thème : Socle frontend — état serveur + auth context. Cohésion 0.45.
> Vagues : V1 (∥) = #70 (backend, disjoint) + #40 | V2 = #48 (après #40 — layout.tsx partagé).
> Dépend de S6 (#45 tokens, #29 infra test).
> ⚠ layout.tsx : ordre wrap imposé Theme(S6 #45) > Auth(#40) > Query(#48) > children.

```yaml
issue_40:
  fichiers_cles:
    - "frontend/src/contexts/AuthContext.tsx"   # NOUVEAU
    - "frontend/src/app/layout.tsx"             # +<Toaster/> +<AuthProvider> (PARTAGÉ avec #48)
    - "frontend/src/services/apiClient.ts"      # redirects 401 → /[locale]/login
    - "frontend/src/hooks/useAuth.ts"           # fix register(username,name,email,pwd), migre vers context
  couches_touchees: ["frontend-auth", "frontend-layout"]
  strategie_test: "RTL (livré #29) : login propage à tous les consumers ; toast visible sur 401 ; register envoie name≠username. E2E Playwright login reporté S8."
  risque_regression: "ELEVE — 4 composants relisent localStorage (dashboard/login/AddProducts/EventContent) ; migrer TOUS dans la même PR sinon état incohérent. Hydration mismatch SSR (useState(null)+useEffect)."
  ordre_ecriture: "AuthContext → AuthProvider+Toaster dans layout → apiClient redirects → fix useAuth.register → migrer les 4 composants"
  zod_dto_sync: "OUI — aligner register payload {username,name,email,password} avec RegisterRequest backend"
  possibly_done: false
  etat_reel_du_code: "useAuth.ts unique (1.8K) CONFIRMÉ ; pas de contexts/ ; apiClient.ts présent (1.9K). Bug register signature à vérifier dans useAuth.ts."

issue_48:
  fichiers_cles:
    - "frontend/src/lib/query-keys.ts"          # NOUVEAU conventions clés
    - "frontend/src/app/layout.tsx"             # +QueryClientProvider (PARTAGÉ avec #40)
    - "frontend/src/hooks/useProductsWithEvents.ts"
    - "frontend/src/hooks/useCurrentUser.ts"
    - "frontend/package.json"                   # @tanstack/react-query v5 + devtools
  couches_touchees: ["frontend-data"]
  strategie_test: "RTL : useProductsWithEvents/useCurrentUser ne régressent pas. Vérifier pas de double-fetch /me (coexistence axios documentée)."
  risque_regression: "MOYEN — double-fetch /me si useCurrentUser duplique AuthContext (#40). v5 API ≠ v4 (gcTime). layout.tsx partagé → APRÈS #40."
  ordre_ecriture: "install v5 → QueryClientProvider après AuthProvider → query-keys.ts → 2 hooks pilotes"
  zod_dto_sync: "NON"
  possibly_done: false
  etat_reel_du_code: "aucune evidence — pas de @tanstack dans package.json (CONFIRMÉ) ; services axios bruts (apiClient/productService/eventService)."

issue_70:
  fichiers_cles:
    - "backend/.../infrastructure/adapters/controllers/AuthController.java"  # ou nouveau UserController
    - "backend/.../application/services/UserServiceImpl.java"   # @Transactional updateUser + changePassword
    - "backend/.../domain/ports/services/UserService.java"      # +méthodes (DIP/A8)
    - "backend/.../application/dtos/UserResponseDto.java"        # NOUVEAU sans password
  couches_touchees: ["backend-domain", "backend-application", "backend-infrastructure"]
  strategie_test: "JUnit : PATCH /me 409 username pris (BR-AUT-001) ; change-password 400 ancien pwd faux / 204 ok ; AUCUN password dans réponses (BR-AUT-008)."
  risque_regression: "MOYEN — unicité username applicative seule (race) → coupler contrainte DB (V2 existe déjà). Créer UserController = respecter hexagonal (éviter A8)."
  ordre_ecriture: "UserResponseDto → ports UserService → UserServiceImpl @Transactional+changePassword → endpoints controller"
  zod_dto_sync: "OUI — UserUpdateRequest{name,email,username} ↔ futur schéma Zod Réglages"
  possibly_done: false
  etat_reel_du_code: "GET /api/auth/me EXISTE (AuthController.getUserDetails) → scope réel = PATCH + change-password + DTO. PAS de UserController (CONFIRMÉ). updateUser existe en service mais non exposé / non @Transactional."
```
