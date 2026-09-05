# Mini-plans architect — Sprint 49

> Généré par /sprint plan 5 (architect, 2026-07-16). Lu par /sprint start Phase 4.1.
> **Sprint mono-issue assumé** (#69 seul) — L avec mesure baseline + mesure après + ADR de choix de lib.
> #219 volontairement laissée au backlog (son body admet que les listes réelles restent courtes → valeur démo nulle,
> ne servait qu'à atteindre 10 points = remplissage).

```yaml
issue_69:
  fichiers_cles:
    - "frontend/src/components/timeline/TimelineView.tsx"           # vérifié (27.1K) — VRAIE cible desktop
    - "frontend/src/components/timeline/zoom.ts"                    # vérifié (10.9K) — calcul des positions, type PositionedEvent
    - "frontend/src/components/timeline/lib.ts"                     # vérifié (10.1K) — buildEventsByResource, getDaysRange
    - "frontend/src/components/timeline/TimelineMobilePortrait.tsx" # vérifié (10.8K)
    - "frontend/src/components/timeline/TimelineMobileLandscape.tsx"# vérifié (11.7K)
    - "frontend/src/components/timeline/Lane.tsx"                   # vérifié
    - "frontend/src/components/timeline/lib-a11y.test.ts"           # vérifié (3.4K) — filet a11y à ne pas casser
    - "frontend/package.json"                                       # vérifié : AUCUNE dép de virtualisation (grep 'virtual' = 0 hit)
    - "frontend/src/components/calendar/TimelineCalendar.tsx"       # vérifié : 114 lignes, MORT — NE PAS Y TOUCHER
  couches_touchees: ["frontend"]
  strategie_test: "unit+E2E"
  risque_regression: |
    ⚠ LE RISQUE LE PLUS COUTEUX DU PLAN — le corps d'origine de #69 désignait `TimelineCalendar` comme cible :
    c'est FAUX. Vérifié indépendamment par le lead (grep : aucune page ne le monte, que des auto-références
    et des commentaires). `TimelineEditHost.tsx:18` le documente : « PLUS AUCUNE page ne rend » (régression S17).
    Virtualiser TimelineCalendar = 8 points livrés sur du code mort, zéro gain démo.
    → Périmètre CORRIGE sur l'issue GitHub le 2026-07-16 (commentaire du lead).
    Vrai chemin de rendu : TimelineEditHost → TimelineResponsive → TimelineView / TimelineMobile*.
    Second risque : la virtualisation démonte des nœuds focusables → lib-a11y.test.ts
    + la navigation clavier de TimelineView sont le filet.
  ordre_ecriture: "mesure baseline (performance.mark) → choix lib (ADR) → TimelineView → vues mobiles → mesure après → E2E"
  zod_dto_sync: "NON"
  possibly_done: false
  etat_reel_du_code: "(travail réel — aucune dép de virtualisation, positions calculées en une passe dans zoom.ts. La piste technique de l'issue était périmée : corrigée.)"
```

---

# ⚠ Périmètre élargi le 2026-07-28 (décision dev au `/sprint start 49`)

Le plan du 16/07 supposait S49 **mono-issue**. À la clôture du Sprint 48 (2026-07-28), le triage
des follow-ups a versé **4 issues `epic:design` au milestone Sprint 49** (#334, #335, #336, #337),
dont **#334 et #335 remplissent les 2 critères d'acceptation de #56 restés non remplis** — la landing
n'est pas réellement livrée sans eux.

Le dev a tranché : **périmètre = #69 + #334 + #335 + #336 + #337** (5 issues, ~24 points).
Cohésion assumée en baisse (2 domaines : `epic:events` + `epic:design`) au profit du solde de la
dette landing. Les 4 issues ont reçu le label `sprint-49` le 2026-07-28.

Les mini-plans ci-dessous sont produits par le **lead** (pas par l'architecte du 16/07) à partir de
greps exécutés sur `origin/dev` @`92c14c4` le 2026-07-28 — pas depuis les pistes techniques des
issues, qui se sont révélées partiellement fausses (cf. `etat_reel_du_code` de #336).

```yaml
issue_335:
  fichiers_cles:
    - "frontend/src/styles/landing.css"          # vérifié, 222 l. — 5 hex hors palette
    - "frontend/src/styles/animations.css"       # vérifié, 76 l. — porte les 2 doublons
    - "frontend/src/styles/ds/tokens/colors.css" # vérifié, 4.5K — LECTURE SEULE, source des tokens
    - "frontend/src/styles/ds/readme.md"         # vérifié, 11.9K — contrat DS (tiers de bordure, modes)
  couches_touchees: ["frontend"]
  strategie_test: "unit (AST PostCSS, cf. PAT-S48-001) + contrôle navigateur clair/sombre"
  risque_regression: |
    Inventaire hex vérifié dans landing.css : #8B5CF6 et #4F46E5 (l.8, 158, 200), #374151 (l.28, 130, 183),
    #4B5563 (l.34, 136), #6D28D9 (l.142), #fff (l.202, 203). Tous theme-blind.
    Doublons CONFIRMÉS aux lignes exactes annoncées :
      .section-animation  → animations.css:4  ET landing.css:167   (+ .visible : :10 / :173)
      .cta-button         → landing.css:47    ET animations.css:59
      les 2 brillances diffèrent : landing.css utilise ::before (l.54, 70), animations.css ::after (l.64, 75).
    ⚠ PIT-S48-002 : Tailwind scanne les commentaires — ne pas laisser un nom de classe supprimé en commentaire.
    ⚠ PIT-S48-001 : un contraste doit être validé sur les 4 fonds (bg/surface × clair/sombre), pas 1 seul.
  ordre_ecriture: "inventaire hex → mapping vers tokens DS → dédoublonnage (choisir UNE brillance, justifier) → contrôle navigateur clair+sombre"
  zod_dto_sync: "NON"
  possibly_done: false
  etat_reel_du_code: "(travail réel — les 5 hex et les 2 doublons sont présents aux lignes annoncées sur 92c14c4.)"

issue_336:
  fichiers_cles:
    - "frontend/src/styles/ds/components/core.css"        # 14 déclarations --color-rule-strong — CIBLE PRINCIPALE, non citée par l'issue
    - "frontend/src/components/EventEditForm.tsx"         # 13 occurrences border-rule-strong
    - "frontend/src/components/shared/ConflictDialog.tsx" # 2
    - "frontend/src/components/events/NewEventDrawer.tsx" # 2
    - "frontend/src/components/shared/StateScreen.tsx"    # 1
    - "frontend/src/components/settings/mobile/BottomSheet.tsx" # 1
    - "frontend/src/components/shared/StateScreen.test.tsx"     # 1 — LE test à mettre à jour
    - "frontend/src/styles/ds/a11y-audit.md"              # §6 à mettre à jour après migration
  couches_touchees: ["frontend"]
  strategie_test: "unit (mise à jour des assertions) + contrôle navigateur clair/sombre sur auth + formulaire d'événement"
  risque_regression: |
    ❌❌ CE BLOC ÉTAIT FAUX — INVALIDÉ LE 2026-07-28 par le fullstack-dev, vérifié par le lead.
    Le grep du lead était lancé depuis `frontend/` sur `src` seul et a RATÉ `frontend/app/**`
    (App Router hors de `src/`) — le piège « app router = frontend/app/ » DÉJÀ en mémoire projet.
    Les formulaires auth portaient bien **10** occurrences de `border-rule-strong`
    (login 2, register 5, reset-password 2, forgot-password 1). LE CORPS DE L'ISSUE AVAIT RAISON.
    Inventaire réel sur la base 92c14c4 : `frontend/src` = 21 + `frontend/app` = 14 → **35** (pas 33).
    Tests à mettre à jour : **5** (les 4 auth annoncés par l'issue + StateScreen.test.tsx), pas 1.
    Mécanisme réel que NI l'issue NI le briefing ne citaient : `globals.css:105`
    `--color-input: var(--color-rule-strong)` = pont shadcn de Input/SelectTrigger/Button outline.
    Voir `issue-336-done.md` pour l'inventaire vérifié. Le texte d'origine est conservé ci-dessous
    à titre de trace de l'erreur — NE PAS s'y fier.
    ---- texte d'origine, ERRONÉ ----
    les formulaires login/register/reset-password/forgot-password ont **ZÉRO** occurrence de
    `border-rule-strong` en TSX. Leurs bordures viennent de `ds/components/core.css`
    (14 déclarations `var(--color-rule-strong)` aux l. 18, 34, 49, 71, 84, 100, 109, 123, 135, 154,
    163, 183, 211, 220 — inputs, checkbox, radio, chips, tabs…).
    Inventaire réel = 19 occurrences TSX + 14 déclarations CSS = 33 (le « ~30 » de l'issue tient,
    le chemin annoncé non).
    ⇒ Toucher core.css change les bordures de TOUTE l'app d'un coup, pas juste des auth.
    Chaque déclaration doit être arbitrée : bordure FONCTIONNELLE (→ rule-emphasis) vs
    séparateur DÉCORATIF (→ reste sur rule-strong). Le readme DS §tiers tranche.
    L'issue annonce « 4 tests » — grep n'en trouve qu'**UN** (StateScreen.test.tsx). Chercher les
    autres avant de conclure, ne pas inventer.
    ⚠ `--color-rule-emphasis` existe bien (colors.css:58 clair, :106 sombre, = --gray-450 #7A7E87),
    non inversé en sombre — ne PAS créer de nouveau token.
  ordre_ecriture: "trier core.css fonctionnel/décoratif (readme DS) → core.css → occurrences TSX → tests → §6 a11y-audit → contrôle navigateur"
  zod_dto_sync: "NON"
  possibly_done: false
  etat_reel_du_code: "(travail réel — le token cible existe depuis #293 mais n'est appliqué qu'au hero. 33 sites restants mesurés.)"

issue_334:
  fichiers_cles:
    - "frontend/src/components/landing/HeaderSection.tsx"  # vérifié, 67 l. — le groupe `flex items-center space-x-4` est bien l.52
    - "frontend/src/styles/landing.css"                    # ⚠ PARTAGÉ avec #335 : porte `.nav-link`
  couches_touchees: ["frontend"]
  strategie_test: "unit + E2E (largeurs 375 et 390) + contrôle navigateur"
  risque_regression: |
    Décision de design REQUISE avant code (burger vs masquage sous md vs réduction du logo)
    → passer par `ui-design` AVANT de coder.
    ⚠ Défaut PRÉ-EXISTANT sur origin/dev (pas une régression S48) : vérifier si le même header
    sert d'autres pages avant de changer son comportement.
    ⚠ Conflit de fichier avec #335 sur `landing.css` (`.nav-link`) → SÉQUENCÉ APRÈS #335.
  ordre_ecriture: "ui-design (décision) → HeaderSection.tsx → E2E 375/390 → contrôle navigateur"
  zod_dto_sync: "NON"
  possibly_done: false
  etat_reel_du_code: "(travail réel — `flex items-center space-x-4` confirmé à HeaderSection.tsx:52 sur 92c14c4.)"

issue_337:
  fichiers_cles:
    - "frontend/e2e/"                              # 15 specs existants — étendre la suite, pas la remplacer
    - "frontend/src/components/landing/"           # cible des mesures (CTA)
    - "docs/memory/pitfalls.md"                    # PIT-S48-005 (asChild → overflow) et PAT-S48-001
  couches_touchees: ["frontend"]
  strategie_test: "E2E Playwright (getComputedStyle + scrollWidth/clientWidth), clair ET sombre"
  risque_regression: |
    ⚠ DÉPEND DE #334 ET #335 : le test mesure les CTA de la landing. Lancé avant eux, il rougit sur
    l'état courant (ce qui est *correct* mais bloque la vague). → DERNIÈRE VAGUE.
    Flakiness à éviter : attendre `document.fonts.ready` avant toute mesure (la métrique de troncature
    dépend du rendu de police).
    Le seuil doit couvrir les 2 thèmes — un CTA peut passer en clair et échouer en sombre (PIT-S48-001).
  ordre_ecriture: "helper de calcul de contraste → spec CTA clair → spec CTA sombre → troncature → intégration suite + doc"
  zod_dto_sync: "NON"
  possibly_done: false
  etat_reel_du_code: "(travail réel — aucun spec E2E ne mesure getComputedStyle aujourd'hui.)"
```

## Vagues (périmètre élargi)

| Vague | Issues | Justification |
|---|---|---|
| **V1** (parallèle) | **#69**, **#335**, **#336** | Fichiers strictement disjoints : `components/timeline/` + `package.json` \| `styles/landing.css` + `styles/animations.css` \| `styles/ds/components/core.css` + 5 composants formulaire. Aucune intersection vérifiée par grep. |
| **V2** | **#334** | Partage `landing.css` avec #335 (`.nav-link`) → attendre V1. Précédé d'un `ui-design` (décision burger/masquage) qui peut tourner **pendant** V1. |
| **V3** | **#337** | Mesure les CTA de la landing → n'a de sens qu'après #334 + #335. |

## Dépendances
- **#69 dépend de S47** (couverture E2E frise) — satisfait : `timeline.spec.ts` (21.4K) et
  `timeline-mobile.spec.ts` (15.5K) présents sur `92c14c4`.
- **#336 dépend de #293** (token `--color-rule-emphasis`, S48) — satisfait : `colors.css:58` et `:106`.
- **#334 après #335** (fichier `landing.css` partagé).
- **#337 après #334 + #335** (mesure leur résultat).

## Fichiers partagés à risque — interdiction de contact croisé
- `frontend/src/styles/landing.css` → **#335 uniquement** en V1 ; #334 y touche en V2.
- `frontend/src/styles/ds/tokens/colors.css` → **lecture seule** pour tout le monde (le token existe déjà).
- `frontend/package.json` → **#69 uniquement** (ajout de la dép. de virtualisation).
- `frontend/src/styles/ds/components/core.css` → **#336 uniquement**.

## Lacune d'outillage constatée
`detect-domain.sh` renvoie des domaines faux pour les 4 issues design (#334→`products`, #335/#336→`auth`,
#337→`unknown`) et **aucun pack `br-design` n'existe** dans `.ai-env/context-packs/`. Les briefings design
sont donc construits avec `unknown/frontend` (`cp-frontend.md`, 8.9 Ko) **+ `frontend/src/styles/ds/readme.md`
inliné en HEAD** — c'est ce readme qui joue le rôle de pack de domaine ici. Candidat follow-up : créer
`br-design.md`.

## Suite possible (hors périmètre)
`TimelineCalendar.tsx` (114 lignes, mort depuis S42) est candidat à la **suppression** — issue dédiée à ouvrir, ne pas absorber ici.
Confirmé le 2026-07-28 : les 4 seules références restantes sont des commentaires (`TimelineEditHost.tsx:21`,
`lib.ts:6`, `index.ts:3`) et un readme (`ds/readme.md:35`). Aucun import, aucun montage.
