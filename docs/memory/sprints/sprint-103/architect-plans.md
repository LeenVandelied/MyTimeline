# Mini-plans architect — Sprint 103

> Généré par /sprint plan 10 -c "focus design et mvp" (architect, 2026-09-22, base `e0a3dab8`).
> Lu par /sprint start Phase 4.1 (section « Plan d'implémentation » du briefing fullstack-dev).
> Axe arbitré par le dev : **écart maquette ↔ produit** ; bugs hors design admis seulement sur un écran déjà touché ;
> Phase 0.5 scriptée remplacée par une contre-vérification manuelle (architect, puis lead sur 7 affirmations clés).
> Numéros de ligne relevés sur `e0a3dab8` : à re-grepper au démarrage (le code bouge entre sprints).

**Thème :** Landing : sections du milieu — cohésion 0.70
**Effort :** 9 pts | **Migrations Flyway :** aucune | **Dépend de :** aucune

**Vagues :**
- V1 : #354 seule (testids avant réécriture : le harnais vise `a.cta-button` et `a[href="#how-it-works"]`).
- V2 : #612 ∥ #613 pour le code (composants disjoints) ; `common.json` ×4 locales partagé → sous-arbres distincts + `git add` ciblé ; E2E l'un après l'autre (Playwright exclusif).
- V3 : #615 (résidu d'accent après V2).
- 4 issues : #615 corrige des fichiers que #612/#613 suppriment ou réécrivent. #426 fermée (absorbée par #612).

```yaml
issue_354:
  fichiers_cles:
    - "frontend/src/components/landing/HeroSection.tsx"
    - "frontend/src/components/landing/CtaSection.tsx"
    - "frontend/src/components/landing/HeaderSection.tsx"
    - "frontend/e2e/support/contrast.ts"
    - "frontend/e2e/landing-cta-contrast.spec.ts"
  couches_touchees: ["frontend"]
  strategie_test: "E2E (compter les cibles mesurées avant/après, sans supposer)"
  risque_regression: "Changer le ciblage du harnais peut réduire en silence le nombre de CTA mesurés."
  ordre_ecriture: "testids → harnais → spec"
  zod_dto_sync: "NON"
  possibly_done: false
  etat_reel_du_code: |
    Moitié livrée : `.eslintcache` n'est plus suivi (git ls-files vide) et figure dans frontend/.gitignore:8 (vérifié par le lead).
    Les 5 CTA n'ont aucun data-testid ; ciblages fragiles landing-cta-contrast.spec.ts:101,227,276 (`a.cta-button`) et :347.
    Recommandation : ne livrer que la partie testids ; clore la partie .eslintcache avec cette preuve.
issue_612:
  fichiers_cles:
    - "frontend/src/components/landing/HowItWorksSection.tsx (réécrit en frise horizontale à 4 jalons)"
    - "frontend/src/components/landing/FeaturesSection.tsx (+ .test.tsx) (supprimés)"
    - "frontend/src/components/pages/HomePage.tsx:5,38"
    - "frontend/src/components/landing/HeaderSection.tsx:121 et FooterSection.tsx:69 (ancres #features)"
    - "frontend/src/components/ui/palette-color-picker.tsx (EVENT_PALETTE, pastilles --evt-*)"
    - "frontend/public/locales/{fr,en,es,de}/common.json"
    - "frontend/e2e/landing-typography-hierarchy.spec.ts:184 (mesure stepNumber dans #how-it-works)"
  couches_touchees: ["frontend"]
  strategie_test: "unit + E2E"
  risque_regression: "Supprimer #features casse les ancres header/footer et la mesure stepNumber ; l'id how-it-works doit rester (CTA secondaire du hero + harnais)."
  ordre_ecriture: "test des jalons (palette --evt-*) → nouvelle HowItWorksSection (rendu < 640 px : à vérifier dans la maquette) → retrait FeaturesSection + ancres → clés i18n → spec typographie"
  zod_dto_sync: "NON"
  possibly_done: false
  etat_reel_du_code: |
    Confirmé : HomePage.tsx:38-39 rend les deux sections ; FeaturesSection.tsx:63 md:grid-cols-3 ; HowItWorksSection.tsx:62 md:grid-cols-4 sans ligne à jalons.
    Dépendances #577 (palette unique, S84) et #574 (S83) fermées. Cible : graphite-handoff.md:140-142.
    Absorbe #426 (pastille h-16 de HowItWorksSection.tsx:65), fermée au plan.
issue_613:
  fichiers_cles:
    - "frontend/src/components/landing/TestimonialSection.tsx (supprimé)"
    - "frontend/src/components/TestimonialCard.tsx (supprimé)"
    - "frontend/src/data/testimonials.json (supprimé)"
    - "frontend/src/components/pages/HomePage.tsx (retrait du rendu)"
  couches_touchees: ["frontend"]
  strategie_test: "unit (HomePage ne rend plus la section) + E2E landing-mobile-overflow / landing-* qui citent la section"
  risque_regression: "Specs et tests qui ciblent la section témoignages ou ses ancres ; grepper TOUS les appelants (Testimonial, testimonials) avant suppression."
  ordre_ecriture: "grep appelants → retrait du rendu → suppression composants/données → tests/specs"
  zod_dto_sync: "NON"
  possibly_done: false
  etat_reel_du_code: |
    ARBITRAGE DEV (2026-09-22) : périmètre changé en « RETIRER LA SECTION » (commentaire posé sur l'issue).
    Raison : testimonials.json contient 4 avis nominatifs inventés (« Sophie Martin, Entrepreneuse »…), FR codé en dur,
    hors i18n ; les présenter en « avis presse » (maquette) fabriquerait des avis sur un dépôt public.
    Grille de 3 cartes confirmée (TestimonialSection.tsx:29). La bande presse reviendra avec de vraies citations.
issue_615:
  fichiers_cles:
    - "frontend/src/components/landing/HowItWorksSection.tsx"
    - "(TestimonialCard.tsx et FeaturesSection.tsx disparaissent en V2)"
  couches_touchees: ["frontend"]
  strategie_test: "E2E de contraste dans les 2 thèmes"
  risque_regression: "Garder hover:text-accent sur les liens (HeaderSection.tsx:144, footer) : liens = usage conforme de l'accent."
  ordre_ecriture: "après V2 : grep bg-accent-soft/text-accent dans components/landing → retrait des usages décoratifs"
  zod_dto_sync: "NON"
  possibly_done: false
  etat_reel_du_code: |
    Confirmé : FeaturesSection.tsx:70-71, HowItWorksSection.tsx:65-66, TestimonialCard.tsx:15-16,27-28 (colorMap tout accent).
    Après V2 ne restent que les usages que #612 aurait réintroduits.
```
