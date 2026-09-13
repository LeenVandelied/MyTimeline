# Mini-plans architect — Sprint 87

> Généré par /sprint plan (architect, 2026-09-07). Lu par /sprint start Phase 4.1.

**Thème :** Landing publique : hero et frise du spec
**Cohésion :** 0.70 (domaines : landing, frise)
**Effort :** 9 points
**Dépend de :** Sprint 83 (#574 filet, #642 bascule de thème dans le header),
Sprint 85 (#611 doit reprendre le rendu de frise réel, pas un rendu qui va changer)

**Vagues :**
- V1 : #611
- V2 (parallèle) : #610 (`HeroSection.tsx`) ∥ #641 (`HomePage.tsx` + suppressions)

> **Ordre imposé par DEC-S82-008 :** #641 après #611, sinon la landing se retrouve sans
> aucun aperçu du produit.
>
> **Dette inter-sprint à honorer :** #574 (Sprint 83) pose un filet 1px sur
> `HeroSection.tsx:113`. #610 réécrit ce conteneur. **Le filet doit être préservé, pas
> perdu dans la réécriture** — à citer explicitement dans le briefing de #610.

```yaml
issue_611:
  fichiers_cles:
    - "frontend/src/components/landing/HeroTimelineAnimation.tsx"      # 2.6K, se déclare hors spec (:6-9)
    - "frontend/src/components/landing/HeroTimelineAnimation.test.tsx"
    - "frontend/src/styles/hero-timeline.css"                          # 2.9K, importée par app/[locale]/page.tsx
    - "frontend/app/[locale]/page.tsx"                                 # import de la feuille, commentaire #56/#343
  couches_touchees: ["frontend"]
  strategie_test: "unit+E2E"
  risque_regression: |
    Le spec impose une boucle 52s linéaire + masque de fondu + prefers-reduced-motion.
    Une boucle longue non bornée est un piège de test visuel : sprint-77-theme-visual
    .spec.ts compare des PNG de référence Linux — toute animation non figée y produit
    un faux rouge.
  ordre_ecriture: "1) figer l'animation sous prefers-reduced-motion ET sous test 2) ruler + 6 lanes + barres pleines + curseur TODAY 3) auto-scroll 52s + masque 4) réutiliser les helpers de frise plutôt que de dupliquer"
  zod_dto_sync: "NON"
  possibly_done: false
  etat_reel_du_code: |
    HeroTimelineAnimation.tsx (2.6K) existe et son en-tête (:6-9) se déclare lui-même
    hors spec. hero-timeline.css est importée sur la seule route landing
    (app/[locale]/page.tsx), volontairement pas au layout. Aucun travail en cours.
  rappel_references_visuelles: |
    Sur macOS la suite de références visuelles fabrique des faux rouges
    `doesn't exist` (≠ `did not match`). Ne pas régénérer les PNG en local :
    laisser la CI Linux trancher.

issue_610:
  fichiers_cles:
    - "frontend/src/components/landing/HeroSection.tsx"                     # 7.1K, :113 conteneur ombré
    - "frontend/src/components/landing/HeroSection.flex-min-size.test.tsx"  # 5.7K, garde de dimensionnement flex
    - "frontend/src/styles/landing.css"                                     # 7.1K, :178 seule media query
  couches_touchees: ["frontend"]
  strategie_test: "unit+E2E"
  risque_regression: |
    HeroSection.flex-min-size.test.tsx garde une contrainte de min-size flex ; passer
    de 50/50 à 30/70 change les bases de flex et peut la faire échouer POUR UNE BONNE
    RAISON (le test protège un débordement mesuré, pas une valeur arbitraire).
    Le lire avant de le modifier.
  ordre_ecriture: "Grille 30/70 -> reprendre le filet posé par #574 sur :113 (NE PAS le perdre) -> vérifier landing-mobile-overflow.spec.ts et sprint-63-de-overflow-audit.spec.ts"
  zod_dto_sync: "NON"
  possibly_done: false
  etat_reel_du_code: |
    HeroSection.tsx:113 rend encore un conteneur `shadow-lg`. Aucun `max-w-*` dans
    HeroSection.tsx ni HeaderSection.tsx, et landing.css ne contient aucun conteneur
    1340px (seule occurrence de « max-width » = la media query :178). Le hero est bien
    en deux colonnes égales.
```

_#641 : XS, pas de mini-plan. Vérifié : `frontend/src/components/pages/HomePage.tsx`
monte `<TimelinePreviewSection />` et `<MobileAppSection />`. Fichiers à supprimer :
`landing/MobileAppSection.tsx` + `.test.tsx`, `landing/TimelinePreviewSection.tsx` +
`.test.tsx`. Clés i18n à purger dans `frontend/public/locales/{fr,en,es,de}/`._

---

## Corrections du lead au démarrage (2026-09-13) — PRIMENT sur ce qui précède

1. **Vagues inversées.** Les deux énoncés GitHub contredisent le plan : #610 est « bloquant pour
   l'issue frise du hero », #611 est « à faire après l'issue hero 30/70 ». Vagues retenues :
   **V1 = #610 ∥ #641**, **V2 = #611**. La contrainte DEC-S82-008 (#641 après #611) vise la
   mise en ligne ; rien ne part en production avant le merge de la PR entière.
2. **Composants DS cités par #611 inexistants dans le dépôt.** `TimelineRuler`, `TimelineLane`,
   `TimelineEventBar`, `TimelineCursor` sont les noms du DS Claude Design. Réels :
   `components/timeline/Ruler.tsx` (grille de JOURS via `DateStamp`, gouttière en %),
   `components/timeline/Cursor.tsx` (position en %), `components/timeline/EventPill.tsx` +
   classe `.mt-evt` (`styles/ds/components/timeline.css`). La maquette dessine une règle de
   MOIS et une gouttière de 120px fixes : réutiliser ce qui colle, justifier ce qui ne colle pas.
3. **`issue_611.fichiers_cles` incomplet** : `HeroSection.tsx` n'y figure pas, or la frise
   quitte la bande sous le hero pour le panneau de droite (#610). Et
   `e2e/sprint-77-theme-visual.spec.ts` cite `.hero-timeline__progress`/`__today` et capture
   `section.section-animation` (le hero) : références Linux `landing-hero-{light,dark}` à
   régénérer par le lead (pas sur macOS).
4. **Partage de fichiers en V1** : `frontend/public/locales/*/common.json` et
   `src/styles/landing.css` sont attribués à UN agent chacun (voir briefings) ; les résidus
   (`.timeline-preview` de `landing.css`, clé `common.landing.images.dashboard`) sont soldés
   par #611 en V2.
5. **Source visuelle** : `sprints/sprint-87/maquette-landing-hero.md` (extrait de
   `Landing.dc.html` par le lead).
