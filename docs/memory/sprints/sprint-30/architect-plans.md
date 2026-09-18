# Mini-plans architect — Sprint 30

> Généré par /sprint plan (architect, focus MVP, 2026-07-07). Lu par /sprint start Phase 4.1.
> Thème : Garde-fous de boot prod & fiabilité auth. Cohésion 0.76. Migrations : aucune.
> Dépend de S29 (#37 fournit le profil prod conteneurisé où ces garde-fous s'activent).
> Vagues : V1 = #140 ∥ #129 (disjoints) | V2 = #216 → #130 (touchent tous deux infrastructure/config).

issue_216:
  fichiers_cles:
    - "backend/src/main/java/com/matimeline/eventmanager/infrastructure/config/ProfileSafetyGuard.java"
    - "backend/src/main/resources/application-prod.properties (lecture)"
  couches_touchees: ["infrastructure/config"]
  strategie_test: "test contexte prod avec app.rate-limit.enabled=false → attend ApplicationContext fail ; cas true → boot OK"
  risque_regression: "bloquer un boot dev par erreur si profil mal détecté → garder la garde @Profile(\"prod\") stricte"
  ordre_ecriture: "étendre ProfileSafetyGuard (check rate-limit) → test"
  zod_dto_sync: "NON"
  possibly_done: false
  etat_reel_du_code: "(aucune evidence) — ProfileSafetyGuard existe déjà (extension, pas création)"

issue_130:
  fichiers_cles:
    - "backend/.../infrastructure/config/*Config (CORS/cookie)"
    - "nouveau logger boot @Profile(\"prod\")"
  couches_touchees: ["infrastructure/config"]
  strategie_test: "capture log au boot profil prod → assert présence origines CORS + attributs cookie (Secure/SameSite) ; ne JAMAIS logger de secret"
  risque_regression: "fuite d'info sensible en log si on logge trop (croise #160) → logger uniquement flags booléens/origines, pas de tokens"
  ordre_ecriture: "logger boot après ProfileSafetyGuard (#216) → test capture log"
  zod_dto_sync: "NON"
  possibly_done: false
  etat_reel_du_code: "(aucune evidence)"

# issue_140 (S) : health indicator + fail-fast @Profile("prod") si BREVO_API_KEY absente.
#   Fiabilité reset email (MVP). Package auth/email. Test : boot prod sans clé → fail ou health DOWN.
# issue_129 (XS) : test @ActiveProfiles("prod") ou @TestPropertySource chargeant application-prod.properties,
#   assert cookie Secure=true. Filet de régression sur le fichier de config lui-même.
