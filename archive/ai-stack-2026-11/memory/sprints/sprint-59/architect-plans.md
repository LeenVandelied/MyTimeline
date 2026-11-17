# Mini-plans architect — Sprint 59

> Généré par `/sprint plan 5` (architect, 2026-07-30). Lu par `/sprint start 59` Phase 4.1.
>
> **Thème :** Header et hiérarchie typographique de la landing — 8 pts, cohésion 0.81.
> **Vagues :** V1 = #381 (mesure d'abord) ∥ #341 (investigation) | V2 = #379 | V3 = #348
> **Dépend de :** Sprint 58 — #353 agrandit le déclencheur de langue **dans le header**, le header
> doit donc être re-mesuré après.
> **Milestone GitHub :** #60.
>
> C'est **le lot le plus faible en valeur MVP des cinq** — il est dernier pour cette raison.

## ⚠ Trois issues visent LA MÊME LIGNE — et leurs numéros de ligne se contredisent

Vérifié sur `origin/dev` : `HeaderSection.tsx:110` porte
`text-accent text-md sm:text-lg md:text-3xl font-bold whitespace-nowrap md:whitespace-normal`.

#348 cite la ligne 54, #379 la ligne 86, #381 la ligne 110. **La vérité est 110.** Chaîne
strictement séquentielle #381 → #379 → #348 : les réparties sur des vagues parallèles produirait un
conflit de merge ou une régression croisée.

**#341 parallélisable sous condition :** aucun `<svg>` ni `<g ` littéral n'existe dans
`frontend/src/components/landing/*.tsx` sur `origin/dev`. Le coupable n'est **pas** du markup SVG
écrit dans la landing — c'est un SVG rendu par une dépendance (lucide-react) ou par
`HeroTimelineAnimation.tsx`. Si l'investigation aboutit à `HeroSection.tsx` (que #348 modifie ligne
62), #341 bascule en V4.

## Mini-plans

```yaml
issue_381:
  fichiers_cles: ["frontend/src/components/landing/HeaderSection.tsx", "frontend/src/components/landing/LandingMobileMenu.tsx", "frontend/e2e/landing-mobile-menu.spec.ts"]
  couches_touchees: ["frontend"]
  strategie_test: "navigateur DANS l'image playwright jammy (clair+sombre, 4 locales, 768/820/1023 px) + E2E de frontiere"
  risque_regression: "un test scrollWidth <= clientWidth seul est SATISFAIT par un logo sur 2 lignes — il est structurellement aveugle au defaut cherche"
  ordre_ecriture: "MESURER d'abord (le defaut visible n'est PAS etabli, seul le desalignement de paliers l'est) -> si aucun defaut : fermer en documentant la mesure et aligner le commentaire -> sinon aligner le logo sur lg + test de frontiere"
  zod_dto_sync: "NON"
  possibly_done: false
  etat_reel_du_code: "CONFIRME sur origin/dev : HeaderSection.tsx:110 est le SEUL element reste en md: (md:text-3xl md:whitespace-normal) ; ligne 67 LG_BREAKPOINT_QUERY='(min-width: 64rem)', ligne 115 nav lg:flex, ligne 127 groupe droit lg:gap-4. Le desalignement est factuel. La ligne est 110, pas 86 ni 54."

issue_379:
  fichiers_cles: ["frontend/src/components/landing/HeaderSection.tsx"]
  couches_touchees: ["frontend"]
  strategie_test: "navigateur (fr + es, 1024 px, clair + sombre)"
  risque_regression: "resserrer space-x-8 (ligne 115) peut faire chuter les cibles tactiles de la nav sous 44 px ; reduire le logo touche la MEME ligne 110 que #381 et #348"
  ordre_ecriture: "APRES #381 (dont la mesure tranche deja le palier du logo) -> arbitrage design entre echelle du logo et resserrement de la nav -> mesurer la marge a 1024 px"
  zod_dto_sync: "NON"
  possibly_done: false
  etat_reel_du_code: "verifie origin/dev : md:text-3xl toujours sur le logo (ligne 110), space-x-8 toujours sur la nav (ligne 115). Non corrige."

issue_348:
  fichiers_cles: ["frontend/src/components/landing/HeroSection.tsx", "frontend/src/components/landing/HowItWorksSection.tsx", "frontend/src/components/landing/HeaderSection.tsx", "frontend/src/styles/ds/tokens/typography.css"]
  couches_touchees: ["frontend"]
  strategie_test: "navigateur (clair+sombre, 375 + 1280 px, + locales de/es pour le debordement)"
  risque_regression: "l'echelle DS Graphite ecrase Tailwind — tout budget calcule sur les valeurs Tailwind est faux d'un facteur ~2. Ecrire md:text-4xl FAIT RETRECIR le texte (token inexistant)."
  ordre_ecriture: "APRES #381 et #379 (meme ligne 110) -> lire typography.css AVANT de choisir les classes -> arbitrer la tension d'AC sur le h1 -> mesurer au navigateur, ne pas calculer"
  zod_dto_sync: "NON"
  possibly_done: false
  etat_reel_du_code: "TROIS DEFAUTS CONFIRMES sur origin/dev : HeroSection.tsx:62 text-xl (=35px), HowItWorksSection.tsx:34 text-2xl (=45px), HeaderSection.tsx:110 md:text-3xl (=57px). Tokens verifies dans typography.css:12-19 : --text-xl 35px, --text-2xl 45px, --text-3xl 57px, et --text-4xl/--text-5xl ABSENTS. CONTRADICTION D'AC NON RESOLUE : HeroSection.tsx:59 porte DEJA text-4xl md:text-5xl, alors que l'AC interdit d'en introduire — arbitrage ui-design requis."

issue_341:
  fichiers_cles: ["a determiner par fullstack-dev — investigation prealable obligatoire"]
  couches_touchees: ["frontend"]
  strategie_test: "navigateur (320/375/390 px) — aucun test unitaire ne mesure un debordement"
  risque_regression: "inconnu tant que le coupable n'est pas localise"
  ordre_ecriture: "localiser le SVG AVANT toute estimation -> comprendre la cause (dimensions fixes / transform / viewBox) -> corriger -> mesurer scrollWidth a 2 largeurs mobiles"
  zod_dto_sync: "NON"
  possibly_done: false
  etat_reel_du_code: "MESURE NEGATIVE UTILE : aucun <svg ni <g litteral dans frontend/src/components/landing/*.tsx sur origin/dev. Les seuls SVG ecrits a la main dans tout frontend/src sont products/ProductSparkline.tsx:62 et ui/spinner.tsx:26 — aucun des deux dans la landing. Les 4 <g> a x=384 viennent donc d'un SVG rendu par une dependance (lucide-react) ou de HeroTimelineAnimation.tsx (+ frontend/src/styles/hero-timeline.css). La piste technique de l'issue n'est PAS confirmee."
```

## Vérification exigée

- **#381 / #379** → navigateur clair + sombre à **768 / 820 / 1023 / 1024 / 1280 px × 4 locales**.
  **#381 exige la mesure dans l'image `mcr.microsoft.com/playwright:v<version>-jammy`** : les
  métriques de police macOS ont fait conclure à tort deux sprints de suite (PIT-S52-001).
  Un test `scrollWidth <= clientWidth` seul est **non recevable** — un logo sur 2 lignes le satisfait.
- **#341** → navigateur à 320 / 375 / 390 px.

## Tension d'AC non résolue à trancher AVANT #348

#348 exige « aucune classe `text-4xl`/`text-5xl` introduite », or `HeroSection.tsx:59` porte **déjà**
`text-4xl md:text-5xl` — et `typography.css` s'arrête à `--text-3xl: 57px` : `--text-4xl` et
`--text-5xl` **n'existent pas**. Le `h1` du hero rend donc à la taille par défaut de Tailwind, hors
échelle DS. **Arbitrage `ui-design` requis.**
