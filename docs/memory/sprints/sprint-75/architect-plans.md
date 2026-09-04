# Mini-plans architect — Sprint 75

> Généré par /sprint plan (architect, 2e vague S74-S77). Lu par /sprint start Phase 4.1.
> Type : UX-polish. Vagues : V1 #172 ∥ #279 → V2 #60 (conflit fr/legal.json).

```yaml
issue_0060:
  fichiers_cles: ["frontend/app/[locale]/privacy/page.tsx", "frontend/app/[locale]/terms/page.tsx", "frontend/public/locales/{fr,en}/legal.json"]
  couches_touchees: ["frontend"]
  strategie_test: "unit (RTL rendu FR/EN) + build 4 locales"
  risque_regression: "casse le rendu /privacy /terms EN si clé date/disclaimer diverge du namespace legal ; aucune BR"
  ordre_ecriture: "après #172 (parité clés fr) ; date centralisée -> disclaimer EN -> restyle DS -> sommaire"
  zod_dto_sync: "NON"
  possibly_done: false
  etat_reel_du_code: "pages existent (app/[locale]/{privacy,terms}/page.tsx) ; date statique + bouton Retour hardcodé à confirmer ; en/legal.json a déjà disclaimerOriginalFrench, fr non"
```

# #172 (XS) — Réaligner clé legal FR manquante
#   ⚠ possibly_done PARTIEL : sr-only DÉJÀ i18n'd (`language-selector.tsx:130` → t('navigation.changeLanguage')). Ne reste QUE la clé FR `disclaimerOriginalFrench` (présente en/legal.json, absente fr/legal.json). Facturer uniquement la clé. Overlap avec #60 (disclaimer) → séquencer avant #60.
# #279 (XS) — Migrer i18n.ts API dépréciée next-intl
#   `i18n.ts:28` = getRequestConfig(async ({locale}) => …) → requestLocale/hasLocale.
