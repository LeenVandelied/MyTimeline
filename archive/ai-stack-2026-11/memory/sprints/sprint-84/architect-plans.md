# Mini-plans architect — Sprint 84

> Généré par /sprint plan (architect, 2026-09-07). Lu par /sprint start Phase 4.1.

**Thème :** Charte : palette unique et titres de section
**Cohésion :** 0.40 (domaines : charte, catégories, formulaire, tableau-de-bord, frise)
**Effort :** 7 points
**Dépend de :** Sprint 83 (les surfaces de la charte sont figées avant de toucher la couleur)

**Vagues :**
- V1 (parallèle) : #577, #575, #634 — fichiers strictement disjoints
  (tokens+catégories / dashboard+page frise / EventBar)

> **PRÉCONDITION BLOQUANTE DU SPRINT** — ADR à écrire avant la première ligne de #577 :
> les catégories déjà en base portent des couleurs de l'ancienne palette. Ni l'issue ni
> l'audit ne tranchent la migration de données. Sans cet arbitrage, le sprint livre une
> palette cohérente et des données incohérentes.

```yaml
issue_577:
  fichiers_cles:
    - "frontend/src/styles/ds/tokens/colors.css"                   # :39-50, les 12 --evt-*
    - "frontend/src/styles/globals.css"                            # :78-89, mapping --color-evt-* dans @theme
    - "frontend/src/components/categories/CategoryDrawer.tsx"      # :64 CATEGORY_SWATCHES, :311 rendu
    - "frontend/src/components/categories/CategoryDrawer.test.tsx" # :268 assert length 12, :302 boucle contraste
    - "frontend/src/lib/color.ts"                                  # :309,:319 commentaires adossés aux 12 constantes
    - "frontend/src/components/EventEditForm.tsx"                  # sélecteur hexa libre
    - "frontend/src/components/events/NewEventDrawer.tsx"          # idem
  couches_touchees: ["frontend"]
  strategie_test: "unit+E2E"
  risque_regression: "Les catégories déjà en base portent des couleurs de l'ancienne palette. Changer CATEGORY_SWATCHES ne migre rien : une catégorie existante tombera hors palette et le repli « Personnalisé » doit l'afficher sans la réécrire silencieusement."
  ordre_ecriture: "1) ADR migration/non-migration des données 2) aligner CATEGORY_SWATCHES sur les 12 --evt-* 3) brancher le picker du formulaire sur la même source 4) tests de contraste"
  zod_dto_sync: "NON"
  possibly_done: false
  etat_reel_du_code: |
    Les 12 --evt-* existent (colors.css:39-50) et sont exposés en utilitaires Tailwind
    (globals.css:78-89) — mais 24 occurrences au total dans tout le dépôt = 12 défs +
    12 mappings, zéro consommateur. CATEGORY_SWATCHES est une constante indépendante
    dans CategoryDrawer.tsx:64. Le geste est de BRANCHER, pas de créer.
  ecart_enonce_issue: |
    L'issue dit « 12 tokens utilisés par aucun sélecteur » : exact côté CSS, mais ils
    SONT exposés en utilitaires Tailwind via @theme. Ne pas les recréer.

issue_575:
  fichiers_cles:
    - "frontend/src/components/dashboard/CompactAgenda.tsx"   # :80 h2
    - "frontend/src/components/dashboard/KpiMarginalia.tsx"   # :52 h2
    - "frontend/src/components/dashboard/ProductCarousel.tsx" # :47 h2
    - "frontend/src/components/dashboard/ProductList.tsx"     # :35 h2
    - "frontend/src/components/dashboard/WeekAgenda.tsx"      # :41 h2
    - "frontend/src/components/dashboard/DensityRibbon.tsx"   # :71
    - "frontend/src/components/dashboard/MobileDrawer.tsx"    # :81,:88
    - "frontend/app/[locale]/(app)/timeline/page.tsx"         # :60
  couches_touchees: ["frontend"]
  strategie_test: "unit+E2E"
  risque_regression: "GreetingHeader.tsx:45 porte la MÊME classe mais est le motif CORRECT (eyebrow au-dessus d'un vrai titre, cité comme référence par l'audit). L'inclure dans le sweep est une régression."
  ordre_ecriture: "Exclure GreetingHeader + CompactAgenda:88/:103 et MobileDrawer:81/:88 (spans de valeur, pas des titres) -> ne convertir que les <h2> -> vérifier la hiérarchie de titres en E2E"
  zod_dto_sync: "NON"
  possibly_done: false
  etat_reel_du_code: |
    12 occurrences de `text-2xs font-mono tracking-widest uppercase` mesurées sur
    9 fichiers. Cinq sont des <h2> (les vrais écarts), les autres sont des spans de
    marginalia ou l'eyebrow conforme. Le comptage « 8 emplacements » de l'issue est
    plausible après tri, pas avant.
  note_aval: |
    #632 (filet d'élasticité allemande, backlog) dépend de ce sprint.
    #575 touche 7 fichiers du dashboard : ne pas empiler #623/#624/#640 ici.
```

_#634 : XS, pas de mini-plan. Vérifié : `frontend/src/components/timeline/EventBar.tsx`
porte `borderColor: event.color || 'rgba(15,23,42,0.8)'` — un littéral **rgba**, pas un
hex comme le dit l'issue. Composant mort en production : `Lane`/`EventBar` ne sont
importés que par `Lane.stories.tsx` ; `TimelineView.tsx:329` a son propre
`TimelineLaneRow`. Toujours exportés par `timeline/index.ts:10-13` — toute suppression
doit passer par l'index._

**Conflit inter-sprint à respecter :** `#638` (backlog) est bloquée par #577 — planifiable
dès S85. `#643` (backlog, tokens `--breakpoint-*`) écrit dans le même `@theme` que #577 :
ne jamais les paralléliser.
