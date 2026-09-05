# Mini-plans architect — Sprint 33

> Généré par /sprint plan (architect, focus MVP, 2026-07-07). Lu par /sprint start Phase 4.1.
> Thème : Conformité EU frontend — export RGPD UI + locales es/de. Cohésion 0.40 (> 0.3).
> Migrations : aucune. Dépend de S32 (#59 ⟵ #58, dépendance dure contrat export).
> Vagues : V1 tout parallèle (#59 settings-export ∥ #235 i18n — fichiers disjoints).
> Note : #235 = 404 es/de live ; peut être tiré en avant en S31 si exposition jugée inacceptable.

issue_59:
  fichiers_cles:
    - "frontend/app/[locale]/settings/(export)/"
    - "frontend/src/services/exportService.ts"
    - "composants flux (Confirmation format / Préparation+polling / Téléchargement)"
  couches_touchees: ["frontend/pages", "frontend/services", "frontend/components"]
  strategie_test: "vitest composants (3 états) ; mock service polling (pending→ready→URL) ; e2e Playwright happy-path settings→export→download ; i18n des 3 étapes dans les 4 langues"
  risque_regression: "désync contrat avec #58 (clés statut/format) → aligner sur le DTO figé en S32 ; gérer expiration URL 24h côté UI (état erreur)"
  ordre_ecriture: "service export (types alignés #58) → étape confirmation format → étape polling → étape download → i18n → e2e"
  zod_dto_sync: "OUI (OBLIGATOIRE) — schéma Zod réponse export DOIT matcher le DTO backend #58 (statut job, format, url signée, expiresAt). Source de vérité = contrat produit en S32."
  possibly_done: false
  etat_reel_du_code: "(aucune evidence) — dépend de #58 non livré avant S32"

issue_235:
  fichiers_cles:
    - "frontend/app/[locale]/layout.tsx"
    - "frontend/middleware.ts"
    - "frontend/src/i18n/ (messages es/de) + public/locales/{es,de}"
  couches_touchees: ["frontend/routing", "frontend/i18n"]
  strategie_test: "e2e Playwright /es et /de → 200 (pas 404) sur golden-path ; test présence des clés de traduction es/de (pas de fallback manquant) ; generateStaticParams cohérent"
  risque_regression: |
    - FICHIERS PARTAGÉS À RISQUE (middleware.ts, layout.tsx) — aucune autre issue planifiée ne les touche → pas de conflit cross-sprint, mais point chaud du repo
    - DÉCISION : aligner-sur-4 (activer es/de partout) vs réduire-middleware-à-2. Directive MVP (i18n 4 langues = feature annoncée) → aligner-sur-4.
    - vérifier que messages es/de existent réellement, sinon compléter (sinon 200 mais UI mixte en/xx)
  ordre_ecriture: "aligner tableau locales layout.tsx sur middleware → audit clés es/de manquantes → compléter traductions → generateStaticParams → e2e es/de"
  zod_dto_sync: "NON"
  possibly_done: false
  etat_reel_du_code: |
    Confirmé ouvert (ISSUE_STATE #235 false, vérifié Phase 0.5) :
    layout.tsx = ['fr','en'], middleware.ts = ['fr','en','es','de'] → /es et /de 404 aujourd'hui.
