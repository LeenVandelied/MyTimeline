# Mini-plans architect — Sprint 83

> Généré par /sprint plan (architect, 2026-09-07). Lu par /sprint start Phase 4.1
> pour injection dans le HEAD du briefing fullstack-dev (section "## Plan d'implémentation").

**Thème :** Charte : surfaces, navigation, thème + sémantique des dates
**Cohésion :** 0.53 (domaines : charte, shell, landing, auth, légal, réglages, transversal)
**Effort :** 10 points — **exception au plafond de 3 issues, actée par le dev** (#518 ajoutée sur demande explicite)
**Dépend de :** rien (sprint de fondation)

**Vagues :**
- V1 (parallèle) : #518 ∥ #578 — fichiers disjoints (composants de date vs `AppShell.tsx`)
- V2 : #574 (après #578, même fichier `AppShell.tsx`)
- V3 : #642 (après #574, même fichier `AppShell.tsx`)

> Les trois issues de charte écrivent dans des régions distinctes de
> `frontend/src/components/layout/AppShell.tsx`, mais le worktree de sprint est
> partagé entre agents (PIT commits parallèles) : le partage de fichier impose la
> sérialisation. #518 ne touche pas AppShell et part en parallèle.

```yaml
issue_578:
  fichiers_cles:
    - "frontend/src/components/layout/AppShell.tsx"          # :223 'bg-accent-soft text-accent font-medium'
    - "frontend/src/components/settings/SettingsShell.tsx"   # origine du précédent (commit 43d9e14)
    - "frontend/src/styles/ds/components/core.css"
  couches_touchees: ["frontend"]
  strategie_test: "unit+E2E"
  risque_regression: "AppShell.test.tsx (22.7K) assert probablement la classe legacy — la mise à jour du test doit refléter la maquette, pas figer le précédent."
  ordre_ecriture: "SettingsShell (source) -> AppShell (copie) -> commentaire :91-93 qui documente le calque -> tests"
  zod_dto_sync: "NON"
  possibly_done: false
  etat_reel_du_code: |
    AppShell.tsx:223 rend encore `bg-accent-soft text-accent font-medium`, et le
    commentaire :41,:92 documente explicitement le calque sur SettingsShell.
    SettingsShell.tsx existe bien sous components/settings/ (pas components/layout/).

issue_574:
  fichiers_cles:
    - "frontend/src/components/landing/HeroSection.tsx"        # :113
    - "frontend/src/components/landing/FeaturesSection.tsx"    # :65 (ombre qui DIMINUE au survol)
    - "frontend/src/components/TestimonialCard.tsx"            # :42
    - "frontend/src/components/layout/AppShell.tsx"            # :323 (FAB mobile)
    - "frontend/app/[locale]/login/page.tsx"                   # :68
    - "frontend/app/[locale]/register/page.tsx"
    - "frontend/app/[locale]/forgot-password/page.tsx"
    - "frontend/app/[locale]/reset-password/page.tsx"
    - "frontend/app/[locale]/privacy/page.tsx"                 # :95 (porte DÉJÀ un filet)
    - "frontend/app/[locale]/terms/page.tsx"
  couches_touchees: ["frontend"]
  strategie_test: "unit"
  risque_regression: "Le FAB mobile d'AppShell:323 est un élément flottant, pas une surface au repos — le retirer de l'ombre serait un faux positif du sweep. Arbitrer avant d'écrire."
  ordre_ecriture: "Écrans hors landing d'abord (auth + légal, gestes identiques) -> landing -> AppShell FAB en dernier avec arbitrage explicite"
  zod_dto_sync: "NON"
  possibly_done: false
  etat_reel_du_code: |
    `shadow-lg` confirmé sur les 10 fichiers ci-dessus. FeaturesSection.tsx:36 porte
    même un commentaire qui décrit le conflit `shadow-lg` -> `hover:shadow-md`.
    Aucune correction en cours.
  note_aval: |
    #610 (Sprint 87) réécrit HeroSection.tsx:113. Le filet posé ici DOIT être
    préservé par ce sprint-là — cité dans le briefing S87.

issue_518:
  fichiers_cles:
    - "frontend/src/components/products/ProductDetailView.tsx"   # cité :401 par l'issue
    - "frontend/src/components/products/ProductsListView.tsx"    # cité :295 par l'issue
    - "frontend/src/components/settings/SessionList.tsx"
    - "frontend/src/components/settings/ExportDataFlow.tsx"
    - "frontend/src/components/dashboard/CompactAgenda.tsx"
    - "frontend/src/styles/ds/components/i18n.css"               # §7, :146-153 : convention .mt-date--*
    - "frontend/src/components/dashboard/WeekAgenda.tsx"         # :54-60 PRÉCÉDENT à répliquer
    - "frontend/src/components/events/EventPreviewTimeline.tsx"  # :243-249 PRÉCÉDENT à répliquer
    - "frontend/src/components/dashboard/intl-formats.test.tsx"  # :125-131 harnais de test existant
  couches_touchees: ["frontend"]
  strategie_test: "unit"
  risque_regression: |
    Le précédent du dépôt choisit délibérément `.mt-date--long` et REFUSE
    `.mt-date--short` (WeekAgenda.tsx:57 et EventPreviewTimeline.tsx:246 : `--short`
    force uppercase + 11px). Appliquer `--short` par symétrie avec le DS produirait
    une régression visuelle sur les écrans migrés.
  ordre_ecriture: |
    1) recenser exhaustivement (l'issue dit ~15 composants, seuls 5 sont nommés)
    2) répliquer le motif WeekAgenda/EventPreviewTimeline (<time dateTime={toLocalIso(x)}>)
    3) étendre intl-formats.test.tsx plutôt que créer un harnais concurrent
    4) découper par zone si le diff dépasse la taille M : produits / réglages / dashboard
  zod_dto_sync: "NON"
  possibly_done: false
  etat_reel_du_code: |
    3 fichiers portent déjà `<time>` (WeekAgenda, EventPreviewTimeline, et le test
    intl-formats), pas 2 comme l'affirme l'issue. Les 5 composants cibles nommés
    existent tous aux chemins ci-dessus. La convention est bien définie en
    i18n.css §7. Migration réelle à faire.
  conflit_a_arbitrer: |
    #517 (« .mt-date--short est définie mais inutilisée », backlog) est la conséquence
    directe du précédent ci-dessus : les deux migrations antérieures ont écarté
    `--short` avec justification écrite. #518 va de fait re-trancher #517 — décider
    ici si `--short` doit être branchée ou supprimée, et le consigner.
```

_#642 : taille S sans mini-plan obligatoire. Fichiers vérifiés par l'architect :
`frontend/src/components/landing/HeaderSection.tsx` (aucun toggle aujourd'hui), les 4
pages auth, `next-themes@^0.4.6` déjà en dépendance, `ThemeProvider` déjà monté._
