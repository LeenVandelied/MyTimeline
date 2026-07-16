# Mini-plans architect — Sprint 48

> Généré par /sprint plan 5 (architect, 2026-07-16). Lu par /sprint start Phase 4.1.
> ⚠ App router = `frontend/app/`, PAS `frontend/src/app/`.
> ⚠ Le corps de #293 annonce `frontend/src/app/globals.css` — **FAUX**, c'est `frontend/src/styles/globals.css`.

```yaml
issue_293:
  fichiers_cles:
    - "frontend/src/styles/ds/tokens/colors.css"                    # vérifié (3.4K)
    - "frontend/src/styles/globals.css"                             # ⚠ CORRIGE : le corps de l'issue annonce frontend/src/app/globals.css (INEXISTANT)
    - "frontend/src/styles/ds/readme.md"                            # vérifié (9.8K)
    - "frontend/src/components/landing/HeroSection.tsx"             # vérifié L17 (docstring de l'emprunt) + L40 className="border-ink-muted …"
    - "frontend/src/styles/ds/a11y-audit.md"                        # vérifié (9.3K)
  couches_touchees: ["frontend"]
  strategie_test: "unit"
  risque_regression: "Emprunt confirmé : HeroSection.tsx:40 utilise border-ink-muted (tier TEXTE) faute de token bordure AA. Le nouveau token doit être validé ≥3:1 vs bg ET surface, en clair ET en sombre — un token valide seulement en clair recrée le défaut en sombre."
  ordre_ecriture: "colors.css → mapping @theme globals.css → HeroSection → ds/readme.md"
  zod_dto_sync: "NON"
  possibly_done: false
  etat_reel_du_code: "(aucune evidence — grep 'rule-emphasis' sur frontend/src = 0 hit)"

issue_56:
  fichiers_cles:
    - "frontend/src/components/pages/HomePage.tsx"                  # vérifié : 274 lignes (le corps annonce 279 — dérive mineure), <a> ancres L63/66/69, <Link passHref><Button> L75/83/262
    - "frontend/src/components/landing/HeroSection.tsx"             # vérifié — SEULE section déjà extraite (slice contraste S39)
    - "frontend/src/components/landing/HeroSection.test.tsx"        # vérifié
    - "frontend/app/[locale]/home/"                                 # vérifié (répertoire) — route dupliquée à trancher
    - "frontend/app/[locale]/"                                      # vérifié — route racine locale
    - "frontend/app/[locale]/privacy/"                              # vérifié — cible du footer (EXISTE DEJA, pas de placeholder à créer)
    - "frontend/app/[locale]/terms/"                                # vérifié — idem
    - "frontend/src/styles/ds/tokens/colors.css"                    # vérifié
    - "sections à créer sous frontend/src/components/landing/"      # FeaturesSection, HowItWorksSection, TimelinePreviewSection, TestimonialsSection, MobileAppSection, CtaSection, FooterSection
  couches_touchees: ["frontend"]
  strategie_test: "unit"                                            # E2E captures clair/sombre = #294, laissée au backlog
  risque_regression: |
    PIEGE DE PERIMETRE CONFIRME — le label sprint-39 était périmé (retiré par le lead au plan S45-S49).
    S39 n'a livré QUE la slice contraste : landing/ ne contient que HeroSection.{tsx,test.tsx},
    HomePage.tsx est toujours un monolithe de 274 lignes. L'issue est ouverte À DESSEIN (cf. sprint-history L849/L860).
    Second risque : trancher /[locale] vs /[locale]/home casse les liens/SEO existants
    — décider par ADR, REDIRECTION plutôt que suppression.
  ordre_ecriture: "ADR (route canonique) → #293 mergée → extraction section par section → tokens → asChild (#295) → RTL"
  zod_dto_sync: "NON"
  possibly_done: false          # PARTIEL, pas done
  etat_reel_du_code: |
    PARTIEL et documenté : HeroSection extraite au S39 (slice contraste hero uniquement).
    Les 7 autres sections restent dans HomePage.tsx — travail réel confirmé.
    Recommandation architect : GARDER.
```

## Vagues
- **V1** : #293 seul
- **V2 (séquentiel strict — #56 consomme le token, et les deux touchent `HeroSection.tsx`)** : #56

## #295 est ABSORBEE par #56
Son propre corps le dit : « Peut être absorbé par la décomposition complète de la landing (#56) si elle est reprise avant ».
Les 4 imbrications `<Link passHref><Button>` sont **vérifiées** : `HomePage.tsx:75,83,262` + `HeroSection.tsx:32`.
→ À câbler comme **critère d'acceptation de #56**, puis fermer #295. Ne JAMAIS les paralléliser.

## ADR à produire
- `ADR-XXX-route-canonique-landing` (#56) — `/[locale]` vs `/[locale]/home`
