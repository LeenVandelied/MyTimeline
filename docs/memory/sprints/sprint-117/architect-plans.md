# Mini-plans architect — Sprint 117

> Généré par /sprint plan 5 (architect, 2026-10-24, base `86337a24`), déroulé à la main par le lead.
> Lu par /sprint start Phase 4.1 (section « Plan d'implémentation » du briefing fullstack-dev).
> Axe arbitré par le dev : **bugs visibles + suites du S112** ; Phase 0.5 scriptée remplacée par une contre-vérification
> manuelle (architect sur chaque issue, puis lead sur 8 affirmations clés). Numéros de ligne relevés sur `86337a24` : à re-grepper au démarrage.
> i18n : `frontend/public/locales/{fr,en,es,de}/*.json`. Mesures : `/usr/bin/grep` (RTK fausse `grep`, `grep -c`, `wc -l`).

**Thème :** Frise : défilement et cadrage justes, cibles tactiles restantes — cohésion 1.00 (br-packs : events ; suppose que #837 compte pour `events` via la frise paysage, le tiroir dashboard étant de la coque)
**Effort :** 4 pts | **Migrations Flyway :** aucune | **Dépend de :** Sprint 115 (#840 a migré `sprint-105-fit-shortcut.spec.ts`, que #804 et #805 étendent)

**Vagues :**
- V1 : #837 (détient Playwright) ∥ #804 (code + unit `zoom.test.ts`).
- V2 : #805 (Playwright) + E2E #804, même agent (`sprint-105-fit-shortcut.spec.ts` commun).

```yaml
issue_805:
  fichiers_cles:
    - "frontend/src/components/timeline/TimelineView.tsx"
    - "frontend/src/components/timeline/zoom.ts"
    - "frontend/e2e/sprint-105-fit-shortcut.spec.ts"
  couches_touchees: ["frontend (timeline)"]
  strategie_test: "E2E (jsdom ne clampe pas scrollLeft) ; reproduire avant de corriger"
  risque_regression: "scroll-behavior:smooth (timeline.css:200) ; repère piste volontaire #392 (:1220-1224) à garder ; scrollToToday (:1268) a le même motif"
  ordre_ecriture: "mesure navigateur [ ] puis +/- ; si dérive : scrollTo({behavior:'instant'}) + useLayoutEffect sur :1214-1227 et :1268 ; sinon fermer avec la mesure"
  zod_dto_sync: "NON"
  premisse_verifiee: "partielle — TimelineView.tsx:1225 écrit el.scrollLeft sous smooth puis recordScrollAnchor() relit scrollLeft aussitôt (:1174) : ancre périmée plausible ; dérive pas encore reproduite"
  possibly_done: false
  etat_reel_du_code: "(aucune evidence)"

issue_804:
  fichiers_cles:
    - "frontend/src/components/timeline/zoom.ts"
    - "frontend/src/components/timeline/zoom.test.ts"
  strategie_test: "unit (computeFit, pin en extrémité) + E2E F"
  premisse_verifiee: "oui — zoom.ts:132 FIT_MARGIN_PX = 40 ; PIN_FOOTPRINT_PX {desktop:100, mobile:90} existe (:267) mais computeFit ne l'utilise pas (:147, :156)"
  possibly_done: false
  etat_reel_du_code: "(aucune evidence)"

issue_837:
  fichiers_cles:
    - "frontend/src/components/dashboard/MobileDrawer.tsx"
    - "frontend/src/lib/touchTarget.ts"
    - "frontend/src/components/timeline/TimelineMobileLandscape.tsx"
    - "frontend/src/styles/ds/components/timeline.css"
    - "frontend/e2e/sprint-99-touch-targets.spec.ts"
    - "frontend/e2e/support/touch-targets.ts"
  strategie_test: "E2E (expectAllTouchable sur le tiroir, expectClickableBox :288 sur ⋯ paysage)"
  premisse_verifiee: "oui — MobileDrawer.tsx:90 <Button> sans size donc h-9 = 36 px (button.tsx:49) ; .mt-tlm__evt-more 44×44 (timeline.css:876) mais lane de 34 px : clip à mesurer ; BOX_ONLY à sprint-99-touch-targets.spec.ts:73"
  possibly_done: false
  etat_reel_du_code: "(aucune evidence)"
```
