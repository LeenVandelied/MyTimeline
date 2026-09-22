# Mini-plans architect — Sprint 104

> Généré par /sprint plan 10 -c "focus design et mvp" (architect, 2026-09-22, base `e0a3dab8`).
> Lu par /sprint start Phase 4.1 (section « Plan d'implémentation » du briefing fullstack-dev).
> Axe arbitré par le dev : **écart maquette ↔ produit** ; bugs hors design admis seulement sur un écran déjà touché ;
> Phase 0.5 scriptée remplacée par une contre-vérification manuelle (architect, puis lead sur 7 affirmations clés).
> Numéros de ligne relevés sur `e0a3dab8` : à re-grepper au démarrage (le code bouge entre sprints).

**Thème :** Landing : navigation, conteneur, CTA du hero — cohésion 0.70
**Effort :** 5 pts | **Migrations Flyway :** aucune | **Dépend de :** Sprint 103 (jeu d'ancres final de la nav)

**Vagues :**
- V1 : #616 (token + classe de conteneur, touche Header/Hero/Cta).
- V2 : #614 (HeaderSection, landing.css) ∥ #682 (HeroSection) ∥ #425 (CtaSection) — fichiers disjoints ; E2E l'un après l'autre.
- Références `landing-hero-*` à régénérer sur la CI Linux, jamais sur macOS (« passed » vides sur darwin).

```yaml
issue_614:
  fichiers_cles:
    - "frontend/src/components/landing/HeaderSection.tsx:127,139-145"
    - "frontend/src/styles/landing.css:96-112 (.nav-link)"
    - "frontend/src/components/landing/LandingMobileMenu.tsx"
    - "frontend/src/components/shared/OfflineBanner.tsx"
  couches_touchees: ["frontend"]
  strategie_test: "E2E (sticky au défilement, ancres, 375 px, de)"
  risque_regression: "Deux éléments sticky : bannière réseau (mt-sysbanner--sticky, 32 px, --z-netbanner) et nav s'empilent ; ancres sans scroll-margin-top aujourd'hui (lien avec #741 au backlog)."
  ordre_ecriture: "sticky + z-index → liens mono capitales + filet → scroll-margin des sections → E2E"
  zod_dto_sync: "NON"
  possibly_done: false
  etat_reel_du_code: |
    Confirmé : aucune classe sticky (HeaderSection.tsx:127), space-x-8 à :139 ; .nav-link à landing.css:96 (énoncé : 130-148).
    Bascule de thème déjà dans la nav (:188, #642/#587 fermées).
issue_616:
  fichiers_cles:
    - "frontend/src/styles/globals.css (@theme)"
    - "frontend/src/styles/ds/tokens/spacing.css:29"
    - "les fichiers de components/landing/ qui utilisent `container`"
  couches_touchees: ["frontend"]
  strategie_test: "E2E (largeur calculée à 1920 px)"
  risque_regression: "`container` sert aussi hors landing (footer-app.tsx:13, app/[locale]/privacy/page.tsx:41, terms) — vérifié par le lead : un changement global les modifierait."
  ordre_ecriture: "token --container-landing → classe restreinte à la landing → E2E 1920 px"
  zod_dto_sync: "NON"
  possibly_done: false
  etat_reel_du_code: |
    Pas de 1340 dans le code (confirmé) ; « pas de tailwind.config.* » FAUX : frontend/tailwind.config.ts existe (sans container ni theme).
    Recommandation : token dédié + classe landing, pas de redéfinition globale de container.
issue_682:
  fichiers_cles: ["frontend/src/components/landing/HeroSection.tsx:106,116,125", "frontend/src/components/landing/HeroSection.flex-min-size.test.tsx"]
  strategie_test: "unit + E2E entre 1024 et 1279 px"
  possibly_done: false
  etat_reel_du_code: "Confirmé : px-8 py-6 text-lg à :116 et :125, colonne lg:max-w-[420px] à :106. Taille lg de la maquette (~46 px) : à vérifier dans la maquette."
issue_425:
  possibly_done: false
  etat_reel_du_code: |
    Après S103 il ne reste qu'une cible : CtaSection.tsx:38 (h2). MobileAppSection.tsx n'existe plus (#641) ;
    FeaturesSection.tsx:55 disparaît avec #612 ; TestimonialSection.tsx disparaît avec #613.
```
