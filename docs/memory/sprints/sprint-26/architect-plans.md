# Mini-plans architect — Sprint 26

> Généré par /sprint plan 5 (architect). Lu par /sprint start 26 Phase 4.1.
> Thème : Résilience réseau + pages d'états système. Cohésion 0.71. Migrations : aucune.
> Dépend (soft) de #77/S25 : le bus réseau réutilise le pattern dialog partagé.

```yaml
issue_0076:
  fichiers_cles: ["frontend/src/services/apiClient.ts", "frontend/src/contexts/NetworkStatusContext.tsx (a creer)", "frontend/src/components/shared/OfflineBanner.tsx (a creer)"]
  couches_touchees: ["frontend"]
  strategie_test: "unit (RTL: navigator.onLine=false -> banner ; timeout interceptor -> état) + E2E offline"
  risque_regression: "un timeout interceptor global sur apiClient peut requalifier des réponses lentes légitimes (upload avatar multipart, cf #215) en erreur -> exclure certains endpoints"
  ordre_ecriture: "frontend (context -> interceptor apiClient -> bannière)"
  zod_dto_sync: "NON"
  possibly_done: false
  etat_reel_du_code: |
    MISSING. apiClient.ts:93-125 = handlers 400/401/403/500 (toasts) MAIS aucun navigator.onLine,
    aucun networkStatus context, aucun timeout interceptor, aucune bannière.

issue_0057:
  fichiers_cles: ["frontend/app/[locale]/not-found.tsx (a creer)", "frontend/app/[locale]/error.tsx (a creer)", "frontend/app/[locale]/loading.tsx (a creer)", "frontend/src/components/shared/EmptyState.tsx", "frontend/src/styles/ds/"]
  couches_touchees: ["frontend"]
  strategie_test: "unit (RTL render clair/sombre) + vérif visuelle Storybook"
  risque_regression: "error.tsx doit être 'use client' (Next app-router) et ne pas casser le layout.tsx:22 notFound() existant"
  ordre_ecriture: "frontend (not-found -> error -> loading -> empty states, tokens DS clair/sombre)"
  zod_dto_sync: "NON"
  possibly_done: false
  etat_reel_du_code: |
    MISSING. app/[locale]/ n'a NI not-found.tsx NI error.tsx NI loading.tsx. Seul fallback = notFound()
    Next par défaut (layout.tsx:22). Aucune page 403/500/vide custom.
```

> **Vagues** : V1 = #76 ∥ #57 (fichiers disjoints : apiClient/context vs app/[locale]/*.tsx neufs).
> V2 = intégration croisée légère (la page 500 peut consommer le bus réseau) — à statuer par fullstack-dev.
