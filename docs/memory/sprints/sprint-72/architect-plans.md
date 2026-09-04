# Mini-plans — Sprint 72 (i18n)

> Etabli par le lead (aucun `/sprint plan` n'avait produit d'entree pour ce sprint :
> milestone #73 et labels `sprint-72` existaient, mais ni entree sprint-history ni
> mini-plans). Fonde sur une reconnaissance de code datee du 2026-09-04 sur HEAD.

issue_142:
  fichiers_cles:
    - "backend/src/main/java/com/matimeline/eventmanager/domain/ports/services/EmailService.java"
    - "backend/src/main/java/com/matimeline/eventmanager/infrastructure/adapters/email/BrevoEmailService.java"
    - "backend/src/main/java/com/matimeline/eventmanager/application/services/PasswordResetServiceImpl.java"
    - "backend/src/main/java/com/matimeline/eventmanager/application/dtos/ForgotPasswordRequest.java"
    - "frontend/src/services/authService.ts"
  couches_touchees: ["domain", "application", "infrastructure", "frontend"]
  strategie_test: "unit (selection de template par locale + fallback) + unit DTO"
  risque_regression: "BR-AUT-012 — la reponse 200 systematique (et l absence de side-channel de timing) ne doit dependre ni de la locale ni de Brevo ; une locale inconnue ne doit jamais lever. NB : la javadoc de BrevoEmailService etiquette cette regle BR-AUT-005, ce qui est FAUX (BR-AUT-005 = 401 sur mauvais credentials)."
  ordre_ecriture: "DTO -> port EmailService -> BrevoEmailService -> PasswordResetServiceImpl -> frontend"
  zod_dto_sync: "OUI (authService.forgotPassword envoie la locale)"
  possibly_done: false
  etat_reel_du_code: |
    Template FR fige en dur dans BrevoEmailService.buildPayload (sujet + corps HTML).
    Aucune notion de locale nulle part cote backend : User.java n'a pas de champ locale,
    aucune colonne DB, le LanguageSelector est purement URL (aucune persistance serveur).
    L'endpoint forgot-password est NON authentifie -> une colonne DB serait inutile ici.
    DECISION DEV (2026-09-04) : la locale transite par le DTO ForgotPasswordRequest,
    champ optionnel, fallback `fr`. PAS d'Accept-Language, PAS de migration.

issue_72:
  fichiers_cles:
    - "frontend/src/components/dashboard/{WeekAgenda,ProductCarousel,ProductList,DensityRibbon}.tsx"
    - "frontend/src/components/products/{ProductsListView,ProductDetailView}.tsx"
    - "frontend/src/components/timeline/{lib.ts,zoom.ts,TimelineBottomSheet,EventDrawer}.tsx"
    - "frontend/src/components/events/EventPreviewTimeline.tsx"
    - "frontend/src/styles/ds/components/i18n.css (lecture seule — deja livre)"
  couches_touchees: ["frontend"]
  strategie_test: "unit (rendu sur les 4 locales) — jsdom suffit ici (chaines formatees, pas de scroll)"
  risque_regression: "Aucune BR. Risque = regression d'affichage FR et casse de tests existants qui asserten des chaines FR en dur."
  ordre_ecriture: "inventaire -> classes DS -> NumberFormat -> tests 4 locales"
  zod_dto_sync: "NON"
  possibly_done: true
  etat_reel_du_code: |
    LA MAJEURE PARTIE DU SCOPE EST DEJA LIVREE. Verifie sur HEAD :
      - `Intl.DateTimeFormat(locale, ...)` present dans ~15 composants, locale issue
        de `useLocale()` de next-intl. Points 1 et 5 de l'issue : faits.
      - `dayjs` : ZERO occurrence dans frontend/src. `date-fns` : ZERO occurrence
        (ni import, ni package.json). Point 4 de l'issue : fait.
    RESTE REEL (le seul perimetre a livrer) :
      - `Intl.NumberFormat` : ZERO occurrence. Les nombres sont rendus bruts —
        ProductCarousel.tsx:81 `{count}`, ProductList.tsx:61 `{count}`,
        ProductDetailView.tsx:135/143 `{counts.active}` / `{counts.archived}`,
        DensityRibbon.tsx:88/121 `${b.count}` dans un title.
      - Classes DS `mt-date--short` / `mt-num` : definies dans i18n.css (importee
        via globals.css:31) mais appliquees dans ZERO composant. Le code utilise a la
        place des utilitaires Tailwind ad-hoc (`font-mono ... tabular-nums`).
      - Seulement 2 balises `<time>` dans tout le frontend (WeekAgenda.tsx:53,
        EventPreviewTimeline.tsx:243) alors que la convention i18n.css prescrit
        `<time datetime=... class="mt-date--short">`.
    DECISION DEV (2026-09-04) : issue reformulee sur ce reste reel. Ne PAS re-auditer
    ni reecrire ce qui est deja migre.
