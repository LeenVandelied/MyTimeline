# Issue #615 — L'accent bleu employé comme ornement perd sa fonction de signal

**Sprint :** 103 · **Agent :** B (`fullstack-dev`, opus) · **Date :** 2026-09-22
**Commit :** `e61b0969` (sur `2f5edd2f`, #612)

## Résumé

Constat franc : **après #612 et #613, il ne restait AUCUN usage décoratif de l'accent à retirer** dans les composants de la landing. Les trois sources listées par l'issue ont disparu : icônes `text-accent` + fonds `bg-accent-soft` de `FeaturesSection` (supprimée, #612), chiffres `text-accent` + pastille `bg-accent-soft` de `HowItWorksSection` (réécrite, étiquettes en `ink-muted` — A1), `TestimonialCard` (supprimé, #613). Le commit de #615 est donc un **verrou** + une **mesure de contraste**, sans changement de rendu.

Fichiers :
- `frontend/src/components/pages/HomePage.accent-roles.test.tsx` (nouveau) — balayage du DOM RENDU de `HomePage`, burger OUVERT : tout élément portant une utilitaire `*-accent*` doit être dans un `a`/`button`, dans la bande CTA finale (section contenant `landing-final-cta-register`) ou dans la liste `PENDING` (dérogation nommée : wordmark). Garde anti-vacuité (> 5 éléments d'accent vus) ; test de péremption de `PENDING` ; `landing.css` : seuls `.nav-link::after` et `.gradient-text` utilisent `--color-accent`.
- `frontend/e2e/sprint-103-use-case-frieze.spec.ts` — describe « contraste des encres neutres (#615) », clair + sombre : 15 lectures texte ≥ 4,5:1 via `readStable` + test d'ARMEMENT permanent (étiquettes repeintes `ink-faint` → doit tomber < 4,5:1) ; pastilles/filet relevés en annotation (non assertés, cf. ci-dessous).

Tableau des occurrences (`/usr/bin/grep -rnE "accent" frontend/src/components/landing frontend/src/components/pages/HomePage.tsx frontend/src/styles/landing.css`, hors tests et commentaires) :

| Fichier:ligne | Classe / règle | Rôle | Verdict |
|---|---|---|---|
| `CtaSection.tsx:36` | `bg-accent` (section) | bande CTA finale (handoff « bande CTA finale ») | conforme (CTA) |
| `CtaSection.tsx:38,41` | `text-accent-ink` | encre sur fond accent de la bande CTA | conforme (CTA) |
| `HeroSection.tsx:116` | `bg-accent hover:bg-accent-hover text-accent-ink` | CTA primaire | conforme (CTA) |
| `HeaderSection.tsx:130` | `text-accent` | **wordmark « Ma Timeline »** (div, pas un lien) | **non conforme au sens strict — dérogation nommée, NON modifiée** (cf. suite) |
| `HeaderSection.tsx:140` | `hover:text-accent` (`.nav-link`) | lien de nav | conforme (lien) |
| `HeaderSection.tsx:190` | `border-accent text-accent hover:bg-accent hover:text-accent-ink` | CTA « Connexion » | conforme (CTA) |
| `HeaderSection.tsx:278` | `bg-accent hover:bg-accent-hover text-accent-ink` | CTA « Inscription » | conforme (CTA) |
| `HeaderSection.tsx:295` | `hover:bg-accent-soft` | survol du bouton burger | conforme (contrôle, état survol) |
| `LandingMobileMenu.tsx:114` | `hover:bg-accent-soft` | survol du bouton fermer | conforme (contrôle) |
| `LandingMobileMenu.tsx:129` | `hover:bg-accent-soft` | survol des ancres du panneau | conforme (lien) |
| `LandingMobileMenu.tsx:141` | `text-accent hover:bg-accent hover:text-accent-ink` | copie du CTA « Connexion » | conforme (CTA) |
| `FooterSection.tsx:61` | `text-accent` | **wordmark « Ma Timeline »** | **idem header : dérogation nommée, NON modifiée** |
| `FooterSection.tsx:69,79,84,94,101` | `hover:text-accent` | liens du pied de page | conforme (lien) |
| `HowItWorksSection.tsx` | — | aucune (étiquettes `ink-muted`) | conforme |
| `HomePage.tsx` | — | aucune | conforme |
| `HeroTimelineAnimation` / `hero-timeline.css` | `.mt-tlv__today*` | marqueur TODAY | conforme (today) |
| `landing.css:67` | `.nav-link::after { background: var(--color-accent) }` | soulignement de lien | conforme (lien) |
| `landing.css:29` | `.gradient-text` (dégradé encre → accent) | titres h1 de `/privacy` et `/terms` | **décoratif, hors landing** (pages légales) — non modifié, cf. suite |

Écarts d'énoncé :
- **AC #1 n'est PAS intégralement tenue** au sens littéral : le wordmark (header + footer) reste en `text-accent`. Il n'est pas dans la liste de l'issue, relève de l'identité de marque et d'une décision de design ; verrouillé comme dérogation NOMMÉE (le test rougit si une autre apparaît, et rougit aussi si la dérogation disparaît sans être retirée de la liste).
- **Prémisse du briefing démentie** : « le surtitre du hero (accent dans la maquette ET le code) ». `HeroSection.tsx` n'a **aucun surtitre** (grep `accent` : seule la ligne 116, CTA). Rien à signaler côté code ; le surtitre de la maquette n'est simplement pas implémenté.
- Pastilles et filet : **non soumis au 3:1 (1.4.11)** — ils ne portent aucune information que le texte du jalon ne porte déjà (`aria-hidden`), et `rule-strong` est décoratif par charte (`colors.css` : `rule`/`rule-strong` décoratifs, `rule-emphasis` pour les affordances). Ratios relevés pour décision sur pièce : en clair **amber 2,07:1, grass 3,02, sky 3,49, periwinkle 3,69** sur `#FCFCFD` ; en sombre 5,17 à 9,23 ; filet 1,46 (clair) / 1,52 (sombre). Si la couleur des pastilles devait un jour porter une information, amber (et grass à la marge) échoueraient en clair.

## Tests

- Mesures E2E (`PLAYWRIGHT_JSON_OUTPUT_NAME=… --reporter=line,json`, annotations `contraste`) — constantes du dépôt, fond composité :
  - clair (`#FCFCFD`) : `ink-muted` `#5E626B` (surtitre, paragraphe, 4 étiquettes, 4 textes) = **5,96:1** ; `ink` `#16181D` (h2, 4 titres) = 17,32:1 ;
  - sombre (`#0B0C0E`) : `ink-muted` `#8E9299` = **6,26:1** ; `ink` `#ECEDEF` = 16,70:1.
  - 15 lectures par thème, compte figé `toBe(15)`.
- Contrôle négatif permanent (dans la spec) : étiquettes en `ink-faint` → clair `#969AA3` **2,75:1**, sombre `#5E626B` **3,20:1** — les deux < 4,5 : le test d'armement passe (= la mesure rougirait). Consommateur TEXTE (PIT-S97-001 : 3,20 passerait un seuil non textuel).
- Contrôles négatifs du verrou vitest (fichiers restaurés depuis copie, `git status` vérifié) :
  1. étiquette de jalon repeinte `text-accent bg-accent-soft` → `HomePage.accent-roles.test.tsx` **1 failed** + `HowItWorksSection.test.tsx` **1 failed** ;
  2. règle `.x-deco { color: var(--color-accent) }` ajoutée à `landing.css` → **1 failed** (test CSS).
- `rtk proxy npx tsc --noEmit` → 0 ; `next lint --file` ×2 → OK ; `prettier --check` ×2 → OK.
- Vitest complet : **157 fichiers / 2004 tests passed**.
- `sprint-103-use-case-frieze` complète : **15 passed** (5 setup + 6 géométrie + 4 contraste).
- Aucune autre spec rejouée pour #615 : le commit ne modifie AUCUN fichier source (tests seuls) ; les 15 specs landing ont été rejouées au commit #612.

fichiers de contexte lus:
- `gh issue view 615` — corps (« Conserver l'accent sur le CTA, les liens et l'indicateur « aujourd'hui » »)
- `docs/memory/sprints/sprint-103/maquette-landing-frise-cas-usage.md` — §4 A1 (« Le surtitre du hero … hors périmètre »)
- `docs/memory/sprints/sprint-103/architect-plans.md` — bloc `issue_615` (« Garder hover:text-accent sur les liens »)
- `docs/design/graphite-handoff.md:37,53` (« un accent bleu électrique unique »)
- `frontend/src/styles/ds/tokens/colors.css:60-80` (`rule`/`rule-strong` décoratifs)
- `frontend/e2e/support/contrast.ts:40-470` (`readStable`, `WCAG_AA_*`, composition `backgroundColor`)
- `.ai-env/context-packs/pit-frontend.md` — NON LU intégralement ; PIT-S58-002, S61-004, S71-003, S97-001 via extrait du briefing
- `.ai-env/context-packs/cp-frontend.md` — NON LU

## Signaux mémoire

- [MEMORY:pattern] Problème : verrouiller « l'accent n'est qu'un signal » sans liste de fichiers qui se périme. Solution : balayer le DOM RENDU (menus ouverts) et exiger pour chaque utilitaire d'accent un ancêtre `a`/`button`, une section CTA reconnue par son testid, ou une dérogation NOMMÉE avec test de péremption. Anti-pattern : grep de classes par fichier (liste blanche qui ne dit pas pourquoi, et qui rate le panneau fermé par défaut).
- [MEMORY:pitfall] Contexte : un briefing affirmait « surtitre du hero en accent dans le code » ; il n'existe pas. Prévention : grepper la classe avant de rédiger un `RECOMMAND_FOLLOWUP` fondé sur une affirmation du briefing.

## Recommandations suite

- Pas de RECOMMAND_DB_EXPERT : aucun changement backend/schéma.
- Pas de RECOMMAND_SECURITY : tests seuls.
- Pas de RECOMMAND_TEST_RUNNER : spec et Vitest complets exécutés par l'agent.
- Pas de RECOMMAND_UI_DESIGN : aucun changement de rendu ; les deux arbitrages ouverts sont listés en suites.
- RECOMMAND_FOLLOWUP: wordmark « Ma Timeline » en `text-accent` (header + footer landing), ni lien ni CTA ni today — arbitrer marque vs règle de l'accent, puis retirer la dérogation `PENDING` de `HomePage.accent-roles.test.tsx` [triage XS | design/frontend]
- RECOMMAND_FOLLOWUP: `.gradient-text` (dégradé encre → accent) décore les h1 de `/privacy` et `/terms` — usage décoratif de l'accent hors landing [triage XS | frontend]
- RECOMMAND_FOLLOWUP: le surtitre du hero de la maquette n'est pas implémenté (aucun eyebrow dans `HeroSection.tsx`) ; s'il l'est, trancher accent (maquette) vs `ink-muted` (charte, A1) [triage XS | frontend]

STATUS: COMPLETED
