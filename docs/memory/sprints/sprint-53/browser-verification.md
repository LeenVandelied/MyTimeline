# Vérification navigateur — Sprint 53 (obligatoire, pitfall S48 « CI verte ≠ page correcte »)

**Faite par le lead**, après les 2 commits (`40665fc`, `a4c4a6c`).
**Outil :** serveur `next dev` local sur `:3000`, page `/fr` (landing publique).
**Backend absent** — d'où les `GET /auth/me → 404` en console (artefact d'environnement connu,
`PIT-S52-002`, sans rapport avec le CSS).

## Pourquoi cette étape est non négociable
`jsdom` ne résout **ni `@layer` ni le layout**. Les 11 tests AST prouvent qu'une règle est *dans* un
layer ; ils ne prouvent **aucun pixel**. Le S48 a livré 2 CTA à contraste 1,00:1 **avec une CI verte** —
même configuration exactement.

## Mesures — comparaison directe contre `origin/dev`

Protocole : `git checkout 2966994 -- frontend/src/styles` → reload → mesure → restauration → reload →
mesure. Les deux mesures sur **la même page, le même navigateur, le même thème**.

| Sonde | `origin/dev` (avant) | `sprint/53` (après) | Attendu |
|---|---|---|---|
| `footer h4` ×3 — `margin-bottom` | `0px` | **`12px`** | ✅ `mb-3` enfin effectif (**le cas de #339**) |
| `footer h4` ×3 — `font-weight` | `600` | **`700`** | ✅ `font-bold` enfin effectif |
| hero `h1` — `margin-bottom` | `0px` | **`24px`** | ✅ `mb-6` effectif |
| hero `h1` — `line-height` | — | **`38.88px` sur 36px = 1.08** | ✅ token DS préservé (Tailwind aurait donné 45px / 1.25) |
| hero `h1` — `letter-spacing` | — | **`-0.72px` sur 36px = −0.02em** | ✅ token DS, pas le −0.025em de Tailwind |
| hero `h1` — `font-family` | — | **`Archivo`** | ✅ police display préservée |
| `.timeline-preview` — `border-radius` | `10px` | **`14px`** | ✅ `rounded-xl` gagne (**le cas de #340**) |
| `.feature-card` — `background` (sombre) | `rgb(19,21,25)` | **`rgb(19,21,25)`** | ✅ inchangé |
| `h3` cartes — contraste (sombre) | 15,6:1 | **15,6:1** | ✅ inchangé |

**La mesure `line-height` = 1.08 confirme en navigateur** la réfutation du fullstack-dev de #339 : le
token DS gagnait déjà, le mapping `--leading-*` est bien un NO-OP sur le rendu.

## Balayage de contraste WCAG — les deux thèmes

Ratio calculé sur la couleur calculée de chaque élément contre son premier ancêtre à fond opaque.

| Thème | Éléments sondés (`h1`-`h6`, `a`, `button`) | Sous AA 4,5:1 | Pire cas |
|---|---|---|---|
| **Clair** | 38 | **0** | 17,32:1 (titres) |
| **Sombre** | 38 | **0** | **6,94:1** (liens accent) |

Aucune régression de contraste. Le mode de défaillance du S48 est écarté **sur la landing**.

## ⚠ Faux positif que j'ai produit, et comment il a été écarté

Une première mesure en sombre a donné `.feature-card` en **blanc**, contraste **1,17:1** — j'en ai
conclu à tort, et annoncé, que **le sprint causait une régression**. **C'était faux.**
Cause : j'avais forcé les classes `dark`/`light` à la main **avant** de basculer le
`prefers-color-scheme` du navigateur, laissant un état HMR/DOM incohérent où les jetons de surface et de
fond provenaient de deux jeux différents. Après un **rechargement propre**, la même carte mesure
`rgb(19,21,25)` — valeur identique à `origin/dev`.

**Leçon :** ne jamais mesurer un thème en manipulant les classes à la main sous Turbopack HMR ; basculer
le thème **au niveau du navigateur** puis **recharger**, et toujours comparer contre la base avant de
déclarer une régression.

## NON VÉRIFIÉ — réserves à lever avant de considérer le sprint clos

- **Dashboard, settings, products, timeline : non ouverts.** Ils exigent une session authentifiée et un
  backend + Postgres non démarrés ici. Or **c'est là que `ui-design` situait le risque le plus élevé** :
  la bascule police display → **mono** sur 5 titres du dashboard (`KpiMarginalia:38`, `ProductList:29`,
  `ProductCarousel:43`, `WeekAgenda:40`, `CompactAgenda:80`), le `mb-2` de `ProductDetailView:211,225`,
  et les graisses 600→500 de `settings/`. **Aucun de ces changements n'a été vu.**
- **Avatar de la sidebar `AppShell`** (7px → 5px) : sur une surface authentifiée, **non vu**.
- **Firefox et WebKit non lancés.** Le correctif scrollbar de #340 vise précisément Firefox : il est
  **déduit de la cascade, pas observé**.
- Les captures d'écran ne suivaient pas le défilement programmatique : seule la zone au-dessus de la
  ligne de flottaison a été inspectée **à l'œil**. Le reste repose sur les mesures numériques ci-dessus.
- Paliers responsive (320 / 768 / 1024 px) non balayés.

## Conclusion

Sur la landing publique, les deux correctifs **font ce qu'ils annoncent**, mesuré avant/après, et
**aucune régression de contraste** dans les deux thèmes. Les surfaces authentifiées — qui portent le
plus gros du rayon de souffle — **n'ont pas pu être vérifiées faute de backend local** ; c'est la réserve
principale de ce sprint et elle doit figurer dans la PR.
