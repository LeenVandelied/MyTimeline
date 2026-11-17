# Mini-plans architect — Sprint 57

> Généré par `/sprint plan 5` (architect, 2026-07-30). Lu par `/sprint start 57` Phase 4.1.
>
> **Thème :** Réglages sous le shell, gardes de routes, et le dernier 500 vérifié — 6 pts,
> cohésion 0.22 (⚠ < 0.3 — split proposé et **rejeté** : sortir #312 remonterait la cohésion à 0.31,
> mais le critère de sortie dit littéralement « sans erreur 500 », ce 500 est prouvé dans le code,
> et il coûte 1 pt. Le déporter pour un gain de métrique serait le re-scope silencieux que ce plan
> doit éviter).
> **Vagues :** V1 = #299 ∥ #312 | V2 = #318 ∥ #398
> **Milestone GitHub :** #58.
>
> ⚠ **Ce sprint bloque toute issue ultérieure qui lit l'arborescence `(app)/`.**

## Dépendance dure #299 → #318 (vérifiée dans le code)

`frontend/src/lib/auth-guard-paths.ts:47` déclare `PROTECTED_EXTRA_SEGMENTS = ['settings']`
**précisément parce que** settings vit hors de `(app)`. Après #299, cette constante doit devenir
vide et le garde-fou `readdirSync((app)/)` de #318 change de réponse. Faire #318 d'abord, c'est
écrire un test qu'il faudra réécrire.

#398 après #299 également : `settings-preferences.spec.ts` est touchée par le déplacement de route.

## ⚠ Garde-fous d'environnement

`git show-ref origin/dev` (jamais `git log origin/dev`). Chemin corrigé : `frontend/middleware.ts`,
**pas** `frontend/src/middleware.ts` — ce dernier n'existe pas sur `origin/dev`.

## Mini-plans

```yaml
issue_299:
  fichiers_cles: ["frontend/app/[locale]/settings/page.tsx", "frontend/app/[locale]/(app)/layout.tsx", "frontend/src/components/settings/SettingsShell.tsx", "frontend/src/components/settings/SettingsShell.test.tsx", "frontend/src/components/layout/AppShell.tsx", "frontend/src/lib/auth-guard-paths.ts"]
  couches_touchees: ["frontend"]
  strategie_test: "navigateur + E2E"
  risque_regression: "6 specs E2E settings ciblent l'URL /[locale]/settings ; le route group (app) ne change pas l'URL mais change le layout monte -> double sidebar si SettingsShell n'est pas neutralise. Le mobile a son propre arbre (components/settings/mobile/, 4 composants) a revalider separement."
  ordre_ecriture: "arbitrage ui-design sur la structure cible -> deplacer la route -> neutraliser/fusionner SettingsShell -> adapter SettingsShell.test.tsx -> vider PROTECTED_EXTRA_SEGMENTS -> rejouer les 6 specs settings"
  zod_dto_sync: "NON"
  possibly_done: false
  etat_reel_du_code: "verifie origin/dev : la route est frontend/app/[locale]/settings/page.tsx, HORS du groupe (app). Bonne nouvelle non dite par l'issue : c'est UN SEUL page.tsx, pas une arborescence profonde — le risque perimetre-plus-large annonce par l'issue est infirme."

issue_318:
  fichiers_cles: ["frontend/src/lib/auth-guard-paths.ts", "frontend/src/lib/auth-guard-paths.test.ts", "frontend/middleware.ts", "frontend/app/[locale]/(app)/"]
  couches_touchees: ["frontend"]
  strategie_test: "unit"
  risque_regression: "un test readdirSync qui ne filtre pas les fichiers (layout.tsx, error.tsx) ou les sous-routes dynamiques ([productId]) produira un faux rouge permanent"
  ordre_ecriture: "APRES #299 -> ecrire le test filesystem -> le voir rouge en ajoutant une route bidon -> documenter le lien dans auth-guard-paths.ts"
  zod_dto_sync: "NON"
  possibly_done: false
  etat_reel_du_code: "verifie origin/dev : auth-guard-paths.ts:35 PROTECTED_APP_SEGMENTS = ['dashboard','products','timeline'], ligne 47 PROTECTED_EXTRA_SEGMENTS = ['settings'], ligne 50 union. Aucun garde-fou filesystem. ATTENTION : le chemin du middleware est frontend/middleware.ts, PAS frontend/src/middleware.ts."

issue_312:
  fichiers_cles: ["backend/src/main/java/com/matimeline/eventmanager/infrastructure/adapters/controllers/AuthController.java"]
  couches_touchees: ["infrastructure"]
  strategie_test: "unit"
  possibly_done: false
  etat_reel_du_code: "CONFIRME dans le code : /me catch ExpiredJwtException puis MalformedJwtException puis catch (Exception) -> 500. SignatureException n'est couverte par aucun des deux catchs specifiques -> tombe bien en 500. C'est le seul 500 prouve sur les 104 candidates."

issue_398:
  fichiers_cles: ["frontend/e2e/settings-preferences.spec.ts", "frontend/src/components/settings/PreferencesSection.tsx"]
  strategie_test: "E2E"
  possibly_done: false
  etat_reel_du_code: "(aucune evidence directe — l'architect n'a pas ouvert les lignes 30/37/48/52/62 ; la spec existe bien sur origin/dev). A confirmer par fullstack-dev."
```

## Vérification exigée

- **#299** → **navigateur clair + sombre à 390 / 768 / 1024 / 1280 px** (le palier 768-1024 est
  celui où la double sidebar se manifesterait, et il est invisible en unitaire) **plus** la suite
  E2E settings complète : `settings-navigation`, `settings-preferences`, `settings-mobile`,
  `settings-account`, `settings-profile`, `settings-security`.
- **#318** → unitaire suffit (test filesystem).
- **#312** → unitaire backend, miroir de `refresh_shouldReturn401_whenSignatureInvalid`.

## Arbitrage requis AVANT le début du sprint

**#299 : structure cible du shell** (`ui-design`). Sans cet arbitrage, l'implémentation s'arrête.
