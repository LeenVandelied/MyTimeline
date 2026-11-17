# Mini-plans architect — Sprint 95

> Généré par /sprint plan (architect, 2026-09-15, axe « bugs du parcours »). Lu par /sprint start Phase 4.1.
> Cohésion 0.00 assumée (DEC-S57-003) — thème commun : ce que l'application affiche en retour à l'utilisateur.

**Prérequis bloquant :** arbitrage Designer (ui-design) sur #714 avant spawn.
**Vagues :** V1 = #714 (E2E exclusif) ∥ #713 (Vitest, `errors.json`) ∥ #701 (`dashboard.json`) ∥ #508
**Dépend de :** S94 (#712 ajoute un oracle « toast visible » que #714 peut déplacer)
**Migrations Flyway :** aucune

```yaml
issue_714:
  fichiers_cles:
    - "frontend/src/components/ui/toaster.tsx:38-60 (JSDoc POSITION, cas NON DÉGAGÉS), :127-134 (TOASTER_TOP_OFFSET 72px)"
    - "frontend/src/components/products/ProductDrawer.tsx:253-258 (bottom sheet max-h-[92vh])"
    - "frontend/src/components/ui/dialog.tsx:47 (croix absolute top-4 right-4)"
    - "frontend/e2e/sprint-92-business-toasts.spec.ts:132,235"
    - "docs/adr/ADR-008 (si la position change)"
  couches_touchees: ["frontend-ui-toaster", "e2e"]
  strategie_test: "E2E boundingBox 390×844 : bottom sheet produit remplie + drawer formulaire ouvert avec toast d'erreur ; rejouer les oracles S92 (FAB, hamburger, croix)"
  risque_regression: "tout déplacement rouvre les 3 oracles de sprint-92-business-toasts"
  ordre_ecriture: "décision Designer consignée → implémentation (décalage contextuel si overlay ouvert, ou acceptation documentée) → E2E"
  zod_dto_sync: "NON"
  possibly_done: false
  etat_reel_du_code: "Les deux cas résiduels sont documentés « NON DÉGAGÉS » dans la JSDoc de toaster.tsx : défaut connu et assumé en S92."
  ecart_enonce_code: "aucun"

issue_713:
  fichiers_cles:
    - "frontend/src/services/apiClient.ts:169,173,192,199 (4 chaînes en dur, vérifié lead)"
    - "apiClient.ts:69-73 (locale lue dans le pathname, réutilisable)"
    - "apiClient.ts:112-118 (INLINE_AUTH_ENDPOINTS)"
    - "frontend/src/components/settings/SecuritySection.tsx:54-57 (400 affiché en ligne)"
    - "frontend/public/locales/*/errors.json (auth.sessionExpired, server.error existent)"
  couches_touchees: ["frontend-service", "locales"]
  strategie_test: "unit Vitest (pathname /en/… → message anglais ; change-password 400 → un seul signalement)"
  risque_regression: "retirer le toast 400 global rend muets les 400 des formulaires sans gestion inline : préférer opt-out par requête ou ajout ciblé de /me/change-password"
  ordre_ecriture: "règle du 400 tranchée → mécanisme i18n hors React → 4 chaînes → tests"
  zod_dto_sync: "NON"
  possibly_done: false
  etat_reel_du_code: "4 chaînes en dur confirmées ; aucune spec/test ne les asserte."
  ecart_enonce_code: "(1) Aucun mécanisme i18n hors composant : apiClient est un module, next-intl inaccessible → choix d'architecture à trancher. (2) Double signalement confirmé SEULEMENT sur /me/change-password. (3) Hors périmètre, mêmes lignes : un 403 affiche « session expirée » et redirige vers login."

issue_701:
  fichiers_cles:
    - "frontend/src/components/dashboard/CompactAgenda.tsx:85,127-128"
    - "frontend/public/locales/*/dashboard.json"
    - "frontend/src/components/dashboard/dashboard-mobile.test.tsx"
  couches_touchees: ["frontend-dashboard", "locales"]
  strategie_test: "unit"
  risque_regression: "sprint-90-first-contact et sprint-84-section-titles citent dashboard-compact-agenda"
  zod_dto_sync: "NON"
  possibly_done: false
  etat_reel_du_code: "Branche todayEvents.length===0 réutilise t('empty')."
  ecart_enonce_code: "aucun"

issue_508:
  fichiers_cles:
    - "frontend/src/components/settings/PasswordStrength.tsx:16-24 (length >= 6 à :19)"
    - "PasswordStrength.test.tsx:16-24"
  couches_touchees: ["frontend-settings"]
  strategie_test: "unit"
  risque_regression: "niveau affiché change pour 6-7 caractères ; consommateurs (register ?) non vérifiés"
  zod_dto_sync: "NON"
  possibly_done: false
  etat_reel_du_code: "Seuil 6 confirmé."
  ecart_enonce_code: "l'énoncé ne donne aucun chemin : components/settings/"
```
