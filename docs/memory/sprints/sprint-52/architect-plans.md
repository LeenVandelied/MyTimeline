# Mini-plans architect — Sprint 52

> Généré par /sprint plan (architect, 2026-07-28, ancrage HEAD fc2a3a0). Lu par /sprint start Phase 4.1.

## Thème : Rate-limiting distribué et politique d'authentification — cohésion 0.47
## Milestone GitHub : #52 | Effort : 8 pts | Migrations : aucune | Dépend de : S50 (#323 fige le contrat de jeton avant d'en durcir les protections)

## Vagues
- Vague 1 (parallèle, fichiers disjoints) : #102 (`RateLimitingFilter.java`, `pom.xml`, `docker-compose.yml`), #148 (DTOs + `schemas/auth.ts`)
- Vague 2 (après vague 1) : #134 (`RateLimitingFilter.java` — même fichier que #102 → séquentiel obligatoire)

## À confirmer au lancement (RISQUE 9 du plan)
- BR-AUT-003 (#148) et BR-SEC-004 (#102) citées par les issues mais NON recoupées par l'architecte
  (business-rules.md absent de docs/memory/ ; BR dans .ai-env/context-packs/br-*.md) — le fullstack-dev
  doit les vérifier dans son pack domaine avant de coder.

```yaml
issue_0102:
  fichiers_cles:
    - "backend/src/main/java/com/matimeline/eventmanager/infrastructure/security/RateLimitingFilter.java"
    - "backend/pom.xml"
    - "docker-compose.yml"
  couches_touchees: ["infrastructure"]
  strategie_test: "integration"
  risque_regression: "Un fallback in-memory silencieux en prod (Redis mal configuré) redonne exactement le contournement N-instances que l'issue corrige, sans aucun signal."
  ordre_ecriture: "1) service Redis dans docker-compose.yml. 2) dépendance bucket4j-redis dans pom.xml. 3) remplacer le store ConcurrentHashMap par RedisProxyManager en gardant la clé IP. 4) AJOUTER le compteur par username (2e clé). 5) fallback in-memory + log WARN explicite au boot. 6) tests d'intégration blocage par username multi-IP."
  zod_dto_sync: "NON"
  possibly_done: false
  etat_reel_du_code: |
    Confirmé non livré. RateLimitingFilter.java:158 `ConcurrentHashMap<String, Bucket> buckets`
    (in-process), ligne 415 `return request.getRemoteAddr()` (clé IP seule). backend/pom.xml:181
    ne contient qu'un COMMENTAIRE mentionnant bucket4j-redis « when scaling out », aucune
    dépendance déclarée. Aucun service redis dans docker-compose.yml.

issue_0134:
  fichiers_cles:
    - "backend/src/main/java/com/matimeline/eventmanager/infrastructure/adapters/controllers/UserController.java"
    - "backend/src/main/java/com/matimeline/eventmanager/infrastructure/security/RateLimitingFilter.java"
  couches_touchees: ["application", "infrastructure"]
  strategie_test: "integration"
  risque_regression: "Changer 409 → statut neutre casse l'affichage d'erreur du frontend qui consomme aujourd'hui ce contrat."
  ordre_ecriture: "à déterminer par fullstack-dev — attention : clé du filtre « exact-URI based » (javadoc ligne 65), les chemins /api/me ne matchent pas par préfixe."
  zod_dto_sync: "NON"
  possibly_done: false
  etat_reel_du_code: |
    Confirmé non livré. RateLimitingFilter.java:86-93 — la map LIMITS ne contient que
    « POST /api/auth/{login,register,refresh,forgot-password,reset-password} ». AUCUNE entrée
    /api/me ni /api/me/change-password.

issue_0148:
  fichiers_cles:
    - "backend/src/main/java/com/matimeline/eventmanager/application/dtos/RegisterRequest.java"
    - "backend/src/main/java/com/matimeline/eventmanager/application/dtos/ResetPasswordRequest.java"
    - "frontend/src/lib/schemas/auth.ts"
  couches_touchees: ["application", "frontend"]
  strategie_test: "unit"
  risque_regression: "Durcir la validation serveur peut rejeter au LOGIN des mots de passe existants conformes à l'ancienne politique — la contrainte ne doit porter que sur création/modification."
  ordre_ecriture: "PÉRIMÈTRE ÉLARGI vs body issue : 3 politiques coexistent, pas 2 — inclure RegisterSchema (auth.ts:51) dans l'harmonisation."
  zod_dto_sync: "OUI"
  possibly_done: false
  etat_reel_du_code: |
    Confirmé, et PLUS divergent que l'issue ne le décrit. 3 niveaux :
    (a) auth.ts:72-76 `createRegisterFormSchema` = min 6 + /[A-Z]/ + /[0-9]/ ;
    (b) MÊME FICHIER ligne 51, `RegisterSchema` = min(6) SEUL — divergence INTRA-fichier
        non mentionnée par l'issue ;
    (c) backend RegisterRequest.java:22 et ResetPasswordRequest.java:19 = @Size(min=6) seul.
    Le commentaire auth.ts:116 documente le choix « PAS d'exigence majuscule/chiffre » pour reset.
```
