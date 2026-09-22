# Mini-plans architect — Sprint 53

> Généré par /sprint plan (architect, 2026-07-28, ancrage HEAD fc2a3a0). Lu par /sprint start Phase 4.1.

## Thème : Dette de cascade CSS et couplage fond/encre du DS — cohésion 0.48
## Milestone GitHub : #53 | Effort : 6 pts | Migrations : aucune | Dépend de : (aucune)

## Vagues
- Vague 1 (parallèle, fichiers disjoints) : #346 (`components/ui/*.tsx` + tests AST), #339 (`ds/tokens/base.css`)
- Vague 2 (après vague 1) : #340 (audit CSS restants — doit connaître le verdict de #339 sur la méthode de layerisation)

## PRÉREQUIS NON NÉGOCIABLE (pitfall « CI verte ≠ page correcte », S48)
Les trois issues sont invalidables par jsdom (`@layer` et layout non résolus). **Vérification navigateur
obligatoire, thème clair ET sombre, avant merge.** Une CI verte ne clôt AUCUNE de ces trois issues.
ui-design pré-implem recommandé (issues visuelles).

## Conflits backlog à respecter (matrice architecte)
- #343 (`hero-timeline.css`) et #352 (`landing.css`) NON planifiées mais en conflit avec #340 —
  ne PAS les planifier hors S53 ; si insérées plus tard, en aval de #340.
- #342/#353 (`language-selector.tsx`) consomment `dropdown-menu.tsx` touché par #346 — si insérées,
  en aval de S53.

```yaml
issue_0346:
  fichiers_cles:
    - "frontend/src/components/ui/dropdown-menu.tsx"
    - "frontend/src/components/ui/select.tsx"
    - "frontend/src/components/ui/button.hover-pairing.test.ts"
    - "frontend/src/components/landing/landing.hover-pairing.test.ts"
  couches_touchees: ["frontend"]
  strategie_test: "unit+E2E"
  risque_regression: "Repasser SelectContent en « fonctionnel » par effet de bord contredirait l'arbitrage « décoratif » acté au S49."
  ordre_ecriture: "Corriger les 5 emplacements, puis ÉTENDRE le garde-fou AST au préfixe focus: et à components/ui/ (les 2 tests existants ne couvrent ni l'un ni l'autre)."
  zod_dto_sync: "NON"
  possibly_done: false
  etat_reel_du_code: |
    Confirmé non livré, aux 5 emplacements EXACTS annoncés. `focus:bg-accent focus:text-accent-foreground`
    présent à dropdown-menu.tsx:77, :95, :131, :214 et select.tsx:121. Les 2 garde-fous AST existent
    (button.hover-pairing.test.ts, landing.hover-pairing.test.ts) mais ne couvrent ni components/ui/
    ni le préfixe focus:.

issue_0339:
  fichiers_cles:
    - "frontend/src/styles/ds/tokens/base.css"
    - "frontend/src/components/landing/FooterSection.tsx"
  couches_touchees: ["frontend"]
  strategie_test: "E2E"
  risque_regression: "Layeriser h1..h6 en bloc réactive d'un coup toutes les marges/graisses aujourd'hui silencieusement annulées dans TOUTE l'app — décalages potentiels hors landing (dashboard, formulaires)."
  ordre_ecriture: "Layeriser, puis balayage visuel navigateur de TOUTES les surfaces à titres (landing, dashboard, formulaires, drawer), clair + sombre. Cf. DEC-S48-002 (seules les règles <a> avaient été layerisées)."
  zod_dto_sync: "NON"
  possibly_done: false
  etat_reel_du_code: |
    Confirmé non livré. base.css:21 `h1, h2, h3, h4, h5, h6 {` est HORS de tout @layer.
    Le premier `@layer base {` n'apparaît qu'à la ligne 44, précédé du commentaire lignes 35-43
    documentant que SEULES les règles sur `<a>` ont été layerisées (DEC-S48-002).

issue_0340:
  fichiers_cles:
    - "frontend/src/styles/animations.css"
    - "frontend/src/styles/landing.css"
    - "frontend/src/styles/hero-timeline.css"
    - "frontend/src/styles/ds/components/"
  couches_touchees: ["frontend"]
  strategie_test: "E2E"
  risque_regression: "Encapsuler une règle qui fonctionnait « par accident » hors layer change l'ordre de cascade et peut casser un rendu correct aujourd'hui."
  ordre_ecriture: "APRÈS #339 (réutiliser la méthode de layerisation validée). Audit exhaustif puis layerisation fichier par fichier avec vérification visuelle entre chaque."
  zod_dto_sync: "NON"
  possibly_done: false
  etat_reel_du_code: |
    Confirmé. Comptage @layer : animations.css = 0, hero-timeline.css = 0, landing.css = 1
    (partiellement layerisé). Les 3 fichiers cités existent aux chemins annoncés.
```
