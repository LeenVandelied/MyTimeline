# Issue #335 — `landing.css` : couleurs hors palette Graphite et règles dupliquées

**Sprint :** 49 · **Vague :** 1 · **Agent :** `fullstack-dev` (opus) · **Date :** 2026-07-28
**Commit :** `1a9ca6b` — `:lipstick: fix(landing): passe landing.css sur les tokens Graphite et dédoublonne les règles (#335)`
3 fichiers, +269 / −136. `git add` ciblé, vérifié au `--staged --stat` (travail de #69/#336 non emporté).

## Objectif

Retirer les couleurs hors palette Graphite de `landing.css`, dédoublonner les règles partagées avec
`animations.css`, et rendre le critère n°3 de #56 vrai **côté CSS** et non plus seulement côté TSX.

## Cause racine trouvée — plus grave que l'énoncé de l'issue

`landing.css` **n'est pas layerisé**. Ses littéraux **battaient** les classes `border-rule` posées au
Sprint 48 : **la migration DS du S48 n'avait donc jamais pris effet sur ces cartes.** L'issue décrivait
un défaut cosmétique ; c'était en réalité une annulation silencieuse du sprint précédent.

## Critères d'acceptation — 5/5

| # | Critère | État |
|---|---|---|
| 1 | Plus aucune couleur hex hors palette | **OK** — zéro littéral (hex/rgba/hsl), retirés **jusque dans les commentaires** (sinon faux positif d'audit + `PIT-S48-002`) |
| 2 | Tokens DS suivant le thème clair/sombre | **OK** — mesuré en navigateur, clair ET sombre |
| 3 | `.section-animation` à un seul endroit | **OK** — `animations.css` seul (+ override `prefers-reduced-motion`, `PIT-S48-003`) |
| 4 | `.cta-button` à un seul endroit, une brillance | **OK** — `animations.css` seul, `::after` seul subsistant |
| 5 | Critère n°3 de #56 validé côté CSS | **OK** — verrouillé par test |

Vérifié par le lead : les seules occurrences de motif `#xxx` restantes dans les 2 fichiers sont les
références d'issue `#335` en commentaire — faux positifs de regex, pas des couleurs.

## Mapping des couleurs (ratios MESURÉS en navigateur, clair / sombre)

| Origine | Cible | Ratio | Note |
|---|---|---|---|
| `#374151` (feature / testimonial / timeline-preview) | `--color-rule` | 1.24 / 1.16 | **tier décoratif assumé** — le DS documente < 3:1 ; le retrait ne coûte aucune information |
| `#4B5563` (hover) | `--color-rule-strong` | — | un cran plus fort, même tier |
| `#8B5CF6` + `#4F46E5` (`.nav-link::after`) | `--color-accent` plein | **4.59 / 6.94** | |
| `#8B5CF6` + `#4F46E5` (`.gradient-text`, pages légales) | dégradé `ink` → `accent` | extrémités 17.32 / 4.59 clair, 16.70 / 6.48 sombre | aucune position illisible |
| rgba indigo (halo héros) | `--color-accent-soft` | — | |
| rgba indigo/noir (ombres) | `--shadow-md` / `--shadow-sm` | — | découplés clair/sombre |
| `#6D28D9`, rgba `.dot` | **supprimés** | — | `.form-input` / `.floating-dots` / `.dot` : 0 référence dans tout le frontend |
| `#fff` (masque) | disparu | — | avec la fusion de `.card-gradient-border` |

⚠ **Hors inventaire du lead : 7 rgba indigo/violet supplémentaires.** Mon grep ne visait que les hex —
il a manqué les `rgba()`. Deuxième sous-comptage du lead sur ce sprint, après celui de #336.

## Dédoublonnage — `::after` retenu, et un défaut corrigé au passage

**Choix `::after` (`animations.css`)** : 300 ms reste dans la fourchette DS 120–280 ms (le `::before`
était à 600 ms) ; le `::before` était un **dégradé**, proscrit par le DS ; un aplat se tokenise, un
dégradé blanc non.

**Défaut trouvé et corrigé :** le voile blanc faisait tomber le CTA à **4.01:1** en clair (texte 18 px
non gras → seuil 4.5). Voile passé à `--color-ink` 8 %, qui **assombrit en clair et éclaircit en sombre**,
donc **augmente** le contraste dans les 4 états (5.26 / 6.70 clair, 7.49 / 9.27 sombre).
`.cta-button > *` remonte le contenu, sinon le voile teinte le texte.

**Répartition finale :** `animations.css` = mouvement (`.section-animation`, `.cta-button`,
`.feature-icon`, `.card-gradient-border`) · `landing.css` = statique.

**4 règles dédoublonnées, pas 2** — `.feature-icon` et `.card-gradient-border` s'ajoutaient à l'inventaire.

## Tests

- **677/677 Vitest verts** (84 fichiers).
- **+1 garde-fou créé** : `frontend/src/styles/__tests__/landing-palette.test.ts` (143 l.) — parcours AST,
  verrouille l'absence de littéraux et l'unicité des sélecteurs.

## Contrôle navigateur

Chrome, `localhost:3000/fr`, **clair + sombre**, page entière (viewport 1280×4600) + hover réel sur le CTA.
Ratios ci-dessus relevés sur les **styles calculés**, pas estimés. Hover : un seul effet,
assombrissement uniforme, libellé « Commencer gratuitement » non tronqué (plancher `min-w-min` du S48
intact). Aucune trace de violet/indigo dans le chrome CSS — les bandes colorées restantes sont dans
l'image de preview et les couleurs d'événement.

## Signaux mémoire

- **[MEMORY:pitfall]** Voile de brillance sur bouton `accent` : teinter le voile avec `--color-ink`
  (assombrit en clair, éclaircit en sombre). `accent` clair ne part qu'à **4.71:1** — **tout** voile
  éclaircissant casse AA. Un voile doit s'éloigner de la couleur du texte dans les **deux** modes.
- **[MEMORY:pitfall]** `@keyframes pulse` non préfixé dans `landing.css`, importé après `globals.css`,
  **écrasait l'animation Tailwind de même nom pour toute l'application** (`animate-pulse` → squelettes de
  chargement dégradés). Renommé `hero-halo-pulse`. **Préfixer systématiquement les `@keyframes`.**
- **[MEMORY:decision]** CSS hors `@layer` bat les utilitaires — `landing.css` annulait silencieusement la
  migration DS du S48. Tout passer par tokens.

## Recommandations suite

**`RECOMMAND_UI_DESIGN`** — 2 arbitrages pris « au minimum de risque », à confirmer :
(a) le halo conique tournant `.card-gradient-border` et le halo flou du héros **survivent retintés**,
alors que le DS dit « No glow, no aurora » — l'agent n'a pas supprimé du visible unilatéralement ;
(b) `.gradient-text` reste un dégradé décoratif, également proscrit (le supprimer imposerait de toucher
`privacy/page.tsx` + `terms/page.tsx`).

**Pour #334 (vague 2) :** `.nav-link` est propre et n'est utilisé que par `HeaderSection.tsx` — les
occurrences dans `AppShell` sont des `data-testid`, pas la classe.

**Pour #337 (vague 3) :** le CTA du héros est à **4.71:1 au repos en clair** — au-dessus d'AA mais
**sans marge**. Tout assombrissement du fond ou éclaircissement du texte le fera rougir.

## ⚠ RECOMMAND_FOLLOWUP signalé P1 — « landing invisible » : NON ÉTABLI

L'agent signale que la landing serait **invisible au chargement** : `useSectionAnimation` ajoute
`.visible` en impératif (`classList.add`) puis `unobserve` ; un re-render React réécrirait `className` et
retirerait la classe → `opacity: 0` définitif. Il dit l'avoir reproduit systématiquement, y compris en
restaurant les feuilles d'origine de `92c14c4` (donc non causé par son commit).

**Le lead a tenté de vérifier. Résultat : indécidable dans cet environnement, et le mécanisme avancé ne
tient pas.**

1. **Le mécanisme proposé est contredit par le code.** Les 7 sections portent un `className` **littéral
   statique** (`"bg-surface section-animation py-20"`, etc.). React ne réécrit un attribut DOM que si la
   valeur de la prop **change** ; un re-render à props identiques ne peut pas effacer une classe ajoutée
   en impératif. La chaîne de rendu (`app/[locale]/page.tsx` → `HomePage` → 7 sections) ne comporte ni
   rendu conditionnel, ni `key` variable, ni Suspense — rien qui provoque un remount.
2. **La mesure du lead est confondue.** Serveur lancé sur :3401, viewport forcé à 1280×900 : les 7
   sections sont bien à `opacity: 0` et aucune ne porte `visible`. **Mais** `document.hidden === true`
   dans ce panneau, et un **témoin de contrôle** (une `<div>` 200×200 observée avec les options par
   défaut) obtient **0 callback**. `IntersectionObserver` ne fire pas du tout dans un onglet masqué —
   l'`opacity: 0` observé est donc entièrement explicable par l'artefact.
3. L'observation de l'agent est **probablement soumise au même confondant** (pilotage navigateur par
   outillage).

**Ce qui est établi :** le hook révèle en impératif puis `unobserve`, et son commentaire affirme « la
classe n'est jamais retirée » — prémisse non garantie en cas de remount d'une section **sans** remount de
`HomePage` (le hook y vit, son effet `[]` ne rejouerait pas). C'est une fragilité réelle, mais ce n'est
pas une preuve du symptôme.

**Ce qui n'est PAS établi :** que la landing soit effectivement invisible en usage réel.

**Décision du lead :** ne pas « corriger » une cause non démontrée. Deux actions à la place :
- **issue de suivi dédiée** pour instruire le cas avec Playwright (viewport réel, onglet visible — le
  seul harnais du projet capable de trancher) ;
- **#337 doit asserter que les sections sont visibles AVANT de mesurer un contraste.** Cette assertion
  est de toute façon correcte, et transforme la question ouverte en test. Consigne ajoutée à son briefing.

`useSectionAnimation.ts` (`48b9e01`, #56, Sprint 48) **n'a pas été modifié par ce sprint** — vérifié.

## ABSORBED

`@keyframes pulse` renommé (bug applicatif réel hors landing) · `.floating-dots` / `.dot` / `.form-input`
morts supprimés · `@tailwind utilities` (v3, sans effet en v4 — vérifié par compilation PostCSS) retiré ·
7 rgba hors palette non listés dans l'inventaire · `.feature-icon` et `.card-gradient-border`
dédoublonnés en plus des 2 demandés.

## Réserves déclarées par l'agent (à ne pas masquer)

- La **révélation au scroll n'a pas pu être observée en conditions réelles** (cf. ci-dessus). Neutralisée
  temporairement à la source pour inspecter les couleurs, puis restaurée à l'identique (`diff` vérifié).
- Le mode **`prefers-reduced-motion` n'a pas été testé en navigateur**, seulement écrit.
- Le **rendu mobile (< 768 px) n'a pas été contrôlé** visuellement.

STATUS: COMPLETED

---

## Traitement du `RECOMMAND_UI_DESIGN` — clôture 2026-07-28

**Non spawné, et voici pourquoi.** Les 2 arbitrages signalés ne bloquent ni un critère d'acceptation ni le
merge : les couleurs retenues sont **mesurées conformes** dans les 4 états, et l'agent a explicitement
choisi le « minimum de risque » en ne supprimant **rien de visible** unilatéralement — ce qui est la bonne
posture pour un sprint de migration.

Ce qui reste ouvert relève de la **charte**, pas de la conformité :
- le halo conique tournant `.card-gradient-border` et le halo flou du héros **survivent retintés**, alors
  que le DS énonce « No glow, no aurora » ;
- `.gradient-text` reste un dégradé décoratif, également proscrit (le retirer imposerait de toucher
  `privacy/page.tsx` et `terms/page.tsx`, donc d'élargir le périmètre).

⇒ **Reporté en follow-up** plutôt que tranché en fin de sprint par un agent qui n'aurait pas le temps de
mesurer l'impact visuel. Deux revues `ui-design` ont déjà tourné sur ce sprint (header #334, échelle typo)
— celle-ci porte sur un choix esthétique assumé, pas sur un défaut.

**Signal considéré comme traité par report explicite.**
