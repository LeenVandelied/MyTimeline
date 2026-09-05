# Issue #343 — [FEATURE] Animation de la frise hero : easing hors DS et import CSS mal scopé

Sprint 74, vague 1 (parallèle). Taille XS. `epic:design` / `priority:P3`.

## Commit

- `6365d26` — 3 fichiers (`hero-timeline.css`, `app/[locale]/layout.tsx`, `app/[locale]/page.tsx`)

## (a) Easing — l'issue s'auto-contredisait, et le correctif N'EST PAS un no-op visuel

`hero-timeline.css:35` (ex-22) : `cubic-bezier(0.4, 0, 0.2, 1)` → `var(--ease-quart)`.

**Le token ne vaut pas la valeur qu'il remplace.** `ds/tokens/spacing.css:39` définit
`--ease-quart: cubic-bezier(0.32, 0.72, 0, 1)` — pas la courbe Material `(0.4, 0, 0.2, 1)`
héritée de #56. Progression comparée (bissection sur la bézier CSS) :

| x (temps) | ancienne | `--ease-quart` | delta |
|---|---|---|---|
| 0.10 | 0.026 | 0.270 | +0.244 |
| 0.25 | 0.237 | 0.779 | **+0.543** |
| 0.50 | 0.776 | 0.955 | +0.179 |
| 0.75 | 0.959 | 0.992 | +0.033 |

La progression décélère bien plus tôt : la frise se lit comme un geste plus « lancé ».

Les deux critères d'acceptation de l'issue — « utiliser `--ease-quart` » et « animation
inchangée visuellement » — **sont donc incompatibles**. Le fullstack-dev a tranché pour le
token (demande explicite du DS) et documenté l'écart en tête de feuille. **Arbitrage à
confirmer par le lead à la vérification navigateur** ; si le geste déplaît, l'alternative
propre est d'ajouter un token de motion « standard » au DS, pas de restaurer une littérale.

`.hero-timeline__today` garde `ease-in-out` (pulsation symétrique, aucun token DS ne la couvre).

## (b) Scope de l'import

L'énoncé visait `app/layout.tsx:5`. Ce layout est transparent depuis #413 (`PIT-S62-005`) et
n'a pas été touché. L'import réel était sur `app/[locale]/layout.tsx:5`, qui couvre **toutes**
les routes localisées — le défaut décrit était donc réel, mais pas au chemin annoncé.

Import déposé sur `app/[locale]/page.tsx:5` (la route landing). **Chaîne de rendu vérifiée
exhaustivement** : `HeroTimelineAnimation` ← seul appelant `HeroSection.tsx:127` ← seul
appelant `HomePage.tsx:39` ← seul appelant `app/[locale]/page.tsx:13`. Le mode d'échec
« animation morte sur une autre route » est donc écarté par constat, pas par confiance.

Option « import co-localisé au composant » écartée à cause de `PIT-S62-013` (`vitest.config.ts`
a `css: true`, le test monte le composant sous jsdom → flood stderr + `vi.mock` à ajouter).

Cascade (`PIT-S64-003`) : la feuille était déjà le dernier import du layout, et Next sert le CSS
de page après celui du layout — ordre relatif à `globals/landing/animations` préservé. Aucun
sélecteur concurrent : `.hero-timeline*` n'existe que dans cette feuille.

## Vérifié (commandes réellement exécutées)

- `npx tsc --noEmit` → `No errors found`, exit 0
- `npx eslint app/[locale]/page.tsx app/[locale]/layout.tsx` → `No issues found` (seul filet
  contre `PIT-S22-001`, le build étant interdit pendant la vague)
- `npx vitest run --reporter=verbose` sur `HeroTimelineAnimation.test.tsx` + `HeroSection.test.tsx`
  + `HomePage.test.tsx` → **15/15**, 3 fichiers, 1.03 s. Lignes par test lues une à une via un
  `.sh` exécuté par chemin (parade `PIT-S62-010` — le premier run direct n'affichait que
  `PASS (15) FAIL (0)`)
- `grep -rln "cubic-bezier\|ease-quart\|styles/hero-timeline" src/__tests__ app` → aucun test
  n'assertait la valeur d'easing
- Résidu d'import : `grep -rn hero-timeline.css app src` → une seule ligne, `page.tsx:5`

## NON vérifié — à couvrir par la passe navigateur du lead

- **Rendu navigateur (clair + sombre) : pas fait.** Interdit aux subagents pendant la vague
  (`.next` unique — `PIT-S62-009`). C'est **le** point critique de cette issue, puisqu'on sait
  que la courbe change : seul le rendu réel dira si le nouveau geste est acceptable.
- **Le scope réel de l'import n'est pas testé.** Le chargement CSS par route n'est pas
  observable sous jsdom ; constaté par lecture du graphe App Router uniquement. Confirmable en
  inspectant les chunks CSS servis sur `/fr/login` (attendu : plus de `.hero-timeline`) et
  `/fr` (attendu : présent). **`PIT-S59-004` : exiger un redémarrage propre du serveur avant
  de conclure** — Turbopack sert des chunks CSS périmés et produit un faux vert.
- `next build` / lint CI complet : non lancés (interdits). Suite vitest complète : non lancée.

## Signaux mémoire

[MEMORY:pitfall] Un critère « utiliser le token du DS » et un critère « rendu inchangé » ne
sont compatibles que si la valeur du token égale la valeur hardcodée — **le vérifier AVANT de
coder**. Ici `--ease-quart` (0.32, 0.72, 0, 1) ≠ la Material (0.4, 0, 0.2, 1), delta +0.54 à
mi-course : l'issue s'auto-contredisait sans que personne ne l'ait vu à la rédaction.

[MEMORY:pattern] Avant de descendre un import CSS d'un layout vers une route, remonter la
chaîne de rendu **complète** du seul consommateur des sélecteurs (composant → section → page →
route) : un `grep` sur le nom du composant seul s'arrête un cran trop tôt et rate un second
appelant.

## Recommandations suite

- **RECOMMAND_UI_DESIGN : OUI** — l'écart de courbe (+54 pts de progression à 25 % de la course)
  est un changement de motion perceptible sur la landing, non arbitré par l'issue.
  [triage XS | domaine frontend/DS]
- **Pas de RECOMMAND_SECURITY** : aucune surface auth / données / API touchée.
- **Pas de RECOMMAND_DB_EXPERT** : aucun schéma, aucune migration.
- **Pas de RECOMMAND_TEST_RUNNER** : le périmètre testable tient en 3 specs ciblées (15 verts),
  le reste n'est pas observable sous jsdom.

## Absorbé / follow-ups

ABSORBED : en-tête de `hero-timeline.css` corrigé — il annonçait un import « dans
`app/layout.tsx` et `HeroTimelineAnimation.tsx` », doublement faux (layout transparent depuis
#413, et aucun import dans le composant).

RECOMMAND_FOLLOWUP : aucun.

STATUS: COMPLETED
