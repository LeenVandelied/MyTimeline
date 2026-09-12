# Mini-plans architect — Sprint 40 (Shell applicatif)

> Généré par /ai-env:sprint plan 5 (2026-07-13). Lu par /sprint start Phase 4.1.
> Cohésion 0.18 (⚠ cross-epic assumé) | epic dominant: design | migrations: aucune.
> Décision dev : garder #210 + #245 (fichiers disjoints, parallèle sûr).

```yaml
issue_0210:
  fichiers_cles:
    - frontend/src/components/layout/AppShell.tsx        # à créer — nav 248px persistante
    - frontend/src/components/layout/Sidebar.tsx         # à créer
    - "layout router enveloppant /dashboard,/produits"   # app router (chemin à confirmer)
    - "docs/design/graphite-handoff.md §8"               # spéc source (lire AVANT impl)
  couches_touchees: [frontend]
  strategie_test:
    - "RTL: shell rend nav persistante, liens actifs, sélecteurs langue/thème intégrés"
    - "E2E (si Playwright dispo): navigation inter-écrans via sidebar"
    - "cohérence rail 64px mobile paysage (#85 déjà livré)"
  risque_regression: MOYEN-ÉLEVÉ — insertion layout enveloppant peut décaler dashboard #80/#83/#85; intégrer sans réécrire les composants dashboard, valider desktop + mobile paysage
  ordre_ecriture: [lire handoff §8, AppShell+Sidebar, intégrer dashboard existant, overlay "Nouvel événement", sélecteurs langue/thème]
  zod_dto_sync: NON (layout, pas de DTO)
  possibly_done: false
  fichier_partage_risque: "frontend/src/components/layout/ — VERROUILLÉ ce sprint, aucune autre issue ne doit y toucher"

issue_0245:
  fichiers_cles:
    - frontend/src/components/products/CategoriesView.tsx  # ligne ~66 : appel deleteCategory brut (à convertir en useMutation)
    - "clés à invalider: categories.all + products.withEvents"
  couches_touchees: [frontend]
  strategie_test: "test mutation invalide les 2 query keys onSuccess; E2E sans reload() forcé"
  risque_regression: FAIBLE — remplacer appel API brut par useMutation + invalidateQueries
  possibly_done: false  # VÉRIFIÉ 2026-07-13 : appel service brut, aucune invalidation TanStack → bug réel confirmé
```
