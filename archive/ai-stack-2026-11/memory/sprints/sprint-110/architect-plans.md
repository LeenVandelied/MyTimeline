# Mini-plans architect — Sprint 110

> Généré par /sprint plan 10 -c "focus design et mvp" (architect, 2026-09-22, base `e0a3dab8`).
> Lu par /sprint start Phase 4.1 (section « Plan d'implémentation » du briefing fullstack-dev).
> Axe arbitré par le dev : **écart maquette ↔ produit** ; bugs hors design admis seulement sur un écran déjà touché ;
> Phase 0.5 scriptée remplacée par une contre-vérification manuelle (architect, puis lead sur 7 affirmations clés).
> Numéros de ligne relevés sur `e0a3dab8` : à re-grepper au démarrage (le code bouge entre sprints).

**Thème :** Pages d'erreur 404 / 500 — cohésion 0.45
**Effort :** 4 pts | **Migrations Flyway :** aucune | **Dépend de :** aucune

**Vagues :**
- V1 #627 ∥ #516 → V2 #628 (StateScreen et errors.json partagés avec #627).

```yaml
issue_627:
  fichiers_cles: ["frontend/src/components/shared/StateScreen.tsx:20-33", "frontend/app/[locale]/not-found.tsx:27-30", "frontend/app/global-not-found-screen.tsx", "frontend/public/locales/*/errors.json"]
  couches_touchees: ["frontend"]
  strategie_test: "unit (date injectée) + E2E 2 thèmes"
  risque_regression: "global-not-found est rendu statiquement : une date calculée au build resterait figée → date côté client après montage."
  possibly_done: false
  etat_reel_du_code: "Confirmé : StateScreenProps (:20-33) sans prop date ni variante ; code=\"404\" + Compass dans les 2 exemplaires. Message : graphite-handoff.md:210."
issue_628:
  possibly_done: false
  etat_reel_du_code: "Confirmé : digest typé à app/[locale]/error.tsx:35 et app/global-error.tsx:97, utilisé seulement pour classer (src/lib/state-errors.ts:24), jamais affiché."
issue_516:
  possibly_done: false
  etat_reel_du_code: "Confirmé : règle time.mt-num à i18n.css:172 (énoncé :153)."
```
