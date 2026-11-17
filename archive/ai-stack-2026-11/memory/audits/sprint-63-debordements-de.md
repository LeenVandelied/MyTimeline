# Audit — débordements de mise en page en locale `de` (issue #74, Sprint 63)

**Date :** 2026-08-31 · **Branche :** `sprint/63` · **Auteur :** vague 4, issue #74

> Ce document est le **livrable** de l'issue #74. Il est écrit pour être lu **seul**,
> sans le briefing de sprint, par quelqu'un qui reprendrait le sujet dans plusieurs mois.

---

## 1. Pourquoi cet audit existe (et pourquoi l'issue a changé de nature)

L'issue #74 demandait à l'origine d'**appliquer quatre familles d'utilitaires** de
`frontend/src/styles/ds/components/i18n.css` aux écrans applicatifs, pour absorber
l'élasticité de l'allemand (+30 % de longueur, mots composés).

Vérification faite **avant** toute pose de classe, cette demande était sans objet :
**7 des 8 sections de `i18n.css` n'ont aucun consommateur applicatif**. L'issue a donc été
re-scopée en **audit de mesure**, et ce document en est le résultat.

### 1.1 Le relevé qui a motivé le re-scopage — re-vérifié ici, indépendamment

Vérification par `rtk proxy git grep` restreint à `frontend/src`, `frontend/app`, `frontend/e2e`
(le hook RTK corrompt `grep -rn` ; `frontend/.next/` pollue tout balayage récursif).

| Section de `i18n.css` | Consommateurs applicatifs | Verdict |
|---|---|---|
| §6 `.mt-sysbanner*` | **1** — `shared/OfflineBanner.tsx:42,44,49,55,57,63` | **en service** |
| §1 `.mt-seg`, `.mt-seg--de-select` | **0** — aucun composant `Segmented` n'existe | inerte |
| §2 `.mt-eyebrow`, `--wrap`, `--title` | **0** | inerte |
| §3 `.mt-btn--wrap` | **0** | inerte (voir nuance ci-dessous) |
| §4 `.mt-truncate` | **0** | inerte |
| §5 `.mt-tabs--collapsible` | **0** | inerte (voir nuance ci-dessous) |
| §7 `.mt-num`, `.mt-date--*` | **0** | inerte |
| §8 `.mt-timeline-ltr`, `.mt-dir-icon`, `.mt-sheet-accent` | **0** | inerte |

**Le re-scopage est confirmé.** Deux nuances qui ne le remettent pas en cause mais que le
relevé d'origine énonçait de façon trop absolue :

- **`.mt-btn` n'est pas qu'un commentaire.** Il est réellement défini dans
  `ds/components/core.css:16-39` (variantes `--sm/--md/--lg/--primary/--secondary/--ghost/
  --accent/--danger`, focus et disabled compris) et référencé par
  `styles/__tests__/control-border-tier.test.ts:52`. Ce qui est exact, c'est qu'**aucun `.tsx`
  ne le pose** : les boutons de l'application sont des `Button` shadcn/Tailwind. `.mt-btn--wrap`
  n'a donc effectivement aucune prise — mais parce que la *famille* `.mt-btn` est inutilisée
  côté React, pas parce qu'elle n'existerait pas.
- **`.mt-tabs` est bien rendu**, par `ui/tabs.tsx:61`, consommé par
  `app/[locale]/(app)/products/page.tsx` et `products/ProductDetailView.tsx`. C'est la
  **variante** `.mt-tabs--collapsible` qui est inerte : ses règles (`i18n.css:84-88`) exigent
  `.mt-tabs__row` et `.mt-tabs__menu`, qui n'existent **nulle part ailleurs que dans
  `i18n.css`** (vérifié sur tout le dépôt) ; `ui/tabs.tsx` rend un `.mt-tabs` **plat**.
  Poser la classe ne produirait rien. À noter : les onglets vivent sur l'écran **Produits**,
  qui n'est pas l'un des trois écrans de cet audit.

### 1.2 Corrections au corps d'origine de l'issue

- La dépendance « bloqué par #45 (tokens Tailwind) » est **levée** : `globals.css:16-31`
  importe les 4 fichiers de tokens **et** `ds/components/i18n.css` (depuis #76).
- **`packages/ds/` n'existe pas.** Dépôt à deux racines (`backend/`, `frontend/`), pas un
  monorepo. Chemin réel : `frontend/src/styles/ds/components/i18n.css`.
- Les **13 fichiers de locale `de` existent et sont complets** : 752 feuilles de traduction,
  à parité avec `en` et `es` (`fr` en compte 751). Dépendance satisfaite.

---

## 2. Méthode de mesure — et pourquoi elle est contraignante

### 2.1 La mesure DOIT être faite sous Linux

`PIT-S52-001` : les métriques de police diffèrent entre macOS et Ubuntu, et `de` est la locale
la plus large. **Les Sprints 49 et 52 ont tous deux conclu « écart 0 partout » depuis macOS, et
la CI Ubuntu les a démentis les deux fois** — au S52 sur un seul pixel
(`scrollWidth=321 > clientWidth=320` à 320 px en `de`).

Toutes les valeurs de ce document sont mesurées dans
**`mcr.microsoft.com/playwright:v1.61.1-jammy`**, `--workers=1`. Aucune valeur mesurée sur
macOS ne figure ici.

### 2.2 Le montage réseau, et le piège CORS qu'il fallait contourner

Le serveur Next tourne sur l'**hôte macOS** (son `node_modules` est compilé pour macOS) ; seul
le **rendu** — la seule variable en cause — se fait dans le conteneur Linux.

La recette documentée aux Sprints 52 et 63 (#347, #423) atteint l'hôte via
`host.docker.internal`. **Cela ne peut pas fonctionner pour des écrans authentifiés**, et c'est
mesuré, pas déduit — le backend e2e fige
`APP_CORS_ALLOWED_ORIGINS=http://localhost:3000,http://localhost:3100` :

| Origine du navigateur | `POST /api/auth/login` |
|---|---|
| `http://host.docker.internal:3000` | **403** — rejet CORS |
| `http://localhost:3000` (via forwarder) | **400** — la requête atteint la logique applicative |

Les audits précédents ne l'avaient pas rencontré parce qu'ils ne mesuraient que la **landing**,
qui n'appelle pas l'API. Contournement retenu : un **forwarder TCP** dans le conteneur,
`127.0.0.1:3000 → host.docker.internal:3000`, qui restaure une origine acceptée par le CORS.

Oracle de plomberie exigé **avant** toute mesure (`PIT-S62-012`) :
`GET /api/auth/me` doit renvoyer **401** (401 = proxy sain ; 404 = proxy absent).

### 2.3 Étalonnage de l'instrument

Avant de produire le moindre chiffre, le harnais a été étalonné en rejouant
`landing-header-logo.spec.ts` — la spec dont les valeurs de référence viennent d'être établies
par #423 dans la même image. Résultat : **11/11 vert**, plancher `MIN_GAP_PX` mordant à 10 px
inclus. L'instrument reproduit donc la référence connue.

### 2.4 Grille de largeurs — choisie par le RISQUE, pas par commodité

`PIT-S59-001` impose de mesurer **les deux côtés** d'un seuil, et #423 a établi qu'en
Tailwind v4 `max-[Npx]` compile en `width < N` (pas `<= N`) : le palier s'arrête à `N-1` et
**`N` devient un second creux local**.

**320, 359, 360, 375, 390, 414, 640, 641, 768, 1023, 1024, 1280** — soit :

- **359/360** : frontière du seul palier `max-[]` du dépôt (`max-[360px]`, 5 occurrences, toutes
  dans `landing/HeaderSection.tsx`) ;
- **640/641** : frontière de la frise. `TimelineResponsive.tsx:42` bascule sur un `matchMedia`
  **JS** `(max-width: 640px) and (orientation: portrait)` : 640 et 641 rendent **deux arbres DOM
  différents**. Ce couple a été **ajouté après coup** — la grille sautait de 414 à 768 et était
  aveugle au seul seuil qui change la structure rendue de l'écran le plus complexe ;
- **1023/1024** : frontière `lg`, où la sidebar 248 px (`hidden lg:flex`) apparaît et
  redistribue toute la largeur utile des trois écrans.

### 2.5 Ce que l'instrument compte comme débordement — et les trois faux positifs écartés

Signal de débordement de **page** : `documentElement.scrollWidth > clientWidth`, **plus** une
sonde de défilement réel (`window.scrollTo(5000)` puis relecture de `scrollX` — Chromium clampe,
jsdom non, d'où l'obligation d'un E2E). Un relevé par élément accompagne le verdict.

Trois exclusions, chacune motivée par un faux positif **réellement rencontré** :

1. **Outillage de développement** (`PIT-S59-002`) — le bouton flottant des TanStack Query
   Devtools et l'overlay Next ont un bord droit qui **suit la largeur du viewport**
   (329@320, 384@375, 399@390) : indiscernable d'un vrai défaut, et c'est ce faux positif qui a
   produit l'issue #341 et « trois sprints de suspicion sur un SVG qui n'existe pas ». Liste
   partagée dans `e2e/support/dev-tooling.ts` (source unique).
2. **Contenu d'un défileur horizontal légitime** — la frise **est** un rail défilant : à 320 px
   `.mt-tlm__rail` mesure 732 px. Un balayage naïf `rect.right > clientWidth` remontait
   **9 à 16 « débordements » par largeur, tous faux**, alors que `scrollWidth === clientWidth`
   et `maxScrollX === 0`. Un élément n'est retenu que si aucun ancêtre ne le contient
   (`overflow-x` `auto`/`scroll`/`hidden`).
3. **`<body>` exclu de cette remontée d'ancêtres** — Radix pose un scroll-lock sur `body` à
   l'ouverture d'un Dialog. L'inclure déclarait « contenu » **tout le document** dès qu'une
   modale était ouverte : le relevé affichait `0 élément fautif` alors que `maxScrollX` valait
   52. C'est cette correction qui a permis de nommer l'élément en cause du formulaire.

**Auto-contrôle armé et conservé dans le fichier** (`PIT-S62-003` : un garde-fou prouvé par des
fixtures supprimées n'est pas armé) : une sonde de 9 999 px est injectée dans la frise `de` et le
harnais doit la détecter **par son `id`** — et non par sa forme, une assertion
`some(o => o.tag === 'div')` étant satisfaite par n'importe quel autre `div` fautif.

---

## 3. Résultats

### 3.1 Tableau de synthèse — débordement horizontal de page

Instrument : `frontend/e2e/sprint-63-de-overflow-audit.spec.ts`, image
`mcr.microsoft.com/playwright:v1.61.1-jammy`, `--workers=1`.
Valeur = `scrollWidth − clientWidth` maximal sur les 12 largeurs (0 = aucun débordement).

Les quatre tableaux qui suivent sont le relevé complet **après correctif** (§4.1). Chaque
cellule vaut `scrollWidth − clientWidth` ; `0` signifie en outre `maxScrollX == 0` et aucun
élément débordant le bord droit.

**165 mesures, 22/22 tests verts, aucun débordement.**

#### Frise (`/{locale}/timeline`)

| locale | 320 | 359 | 360 | 375 | 390 | 414 | 640 | 641 | 768 | 1023 | 1024 | 1280 |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| `fr` | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| `en` | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| `es` | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| `de` | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |

#### Formulaire d'événement (édition, `event-form`)

| locale | 320 | 359 | 360 | 375 | 390 | 414 | 640 | 641 | 768 | 1023 | 1024 | 1280 |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| `fr` | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| `en` | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| `es` | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| `de` | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |

#### Réglages (`/{locale}/settings`)

| locale | 320 | 359 | 360 | 375 | 390 | 414 | 640 | 641 | 768 | 1023 | 1024 | 1280 |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| `fr` | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| `en` | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| `es` | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| `de` | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |

*(coquille `settings-index` de 320 à 641 px, `settings-tablist` de 768 à 1280 px — les deux
ont été mesurées.)*

#### Formulaire de création (`shell-new-event-drawer`), largeurs ATTEIGNABLES

| locale | 1024 | 1280 |
|---|---|---|
| `fr` | 0 | 0 |
| `en` | 0 | 0 |
| `es` | 0 | 0 |
| `de` | 0 | 0 |

Ce formulaire a **aussi** été mesuré à 320/375/390 px en le rétrécissant après ouverture
(sa variante feuille) : **0 partout**. Ces 12 mesures sont marquées
`état-non-atteignable` dans le relevé brut — voir §4.3, l'utilisateur ne peut pas produire
cet état aujourd'hui.

### 3.2 Écrans et chemins réellement mesurés

| Écran | Route / hôte | Compte | Chemin d'accès |
|---|---|---|---|
| Frise | `/{locale}/timeline` | `PROD` | direct, produit seedé daté du jour |
| Réglages | `/{locale}/settings` | `SHARED` | direct (coquille `settings-index` < 768 px, `settings-tablist` au-delà) |
| Formulaire d'événement (édition) | `timeline-edit-dialog` → `event-form` | `PROD` | **deux chemins distincts**, voir §3.3 |
| Formulaire de création | `shell-new-event-drawer` | `PROD` | `shell-sidebar-new-event-button`, **≥ 1024 px seulement** |

### 3.3 Le chemin d'accès au formulaire n'est pas celui que la spec de référence utilise

`sprint-42-events.spec.ts:68` documente : `timeline-event` → `event-drawer-edit` → `event-form`.
**Ce chemin est desktop-only** : `event-drawer-edit` n'est rendu que par `EventDrawer.tsx:97`,
monté par le seul `TimelineView` desktop (`TimelineView.tsx:1203`). En portrait ≤ 640 px la
frise rend `TimelineMobilePortrait`, dont le clic sur la pastille ouvre une bottom-sheet **en
lecture seule** (`TimelineBottomSheet`, aucun bouton d'édition).

Chemin mobile réel : `timeline-event-more` (`TimelineMobilePortrait.tsx:282`) →
`timeline-actionsheet-edit` (`TimelineActionSheet.tsx:94`) → `event-form`.
L'audit **détecte** l'affordance montée plutôt que de la déduire de la largeur, la bascule
étant un `matchMedia` JS qui dépend aussi de l'orientation.

---

## 4. Débordements constatés

### 4.1 CORRIGÉ — pied de page applicatif, débordement horizontal en `de` seulement

**Le seul débordement réel trouvé sur les trois écrans.**

`ui/footer-app.tsx:17` rendait ses deux liens dans un `<div class="flex space-x-4 mt-2 md:mt-0">`
**qui ne peut pas se replier**. En allemand, « Nutzungsbedingungen » et
« Datenschutzrichtlinie » totalisent **367 px** et débordent la page.

Mesures jammy, `scrollWidth` vs `clientWidth` de `documentElement` :

| Largeur | `fr` | `en` | `es` | `de` |
|---|---|---|---|---|
| 320 | 0 | 0 | 0 | **+24 px** (`scrollWidth` 344, `maxScrollX` 24) |
| 359 | 0 | 0 | 0 | **+4 px** (363 / 359) |
| 360 | 0 | 0 | 0 | **+4 px** (364 / 360) |
| 375 et au-delà | 0 | 0 | 0 | 0 |

Le défilement latéral était **réel**, pas théorique (`maxScrollX` 24 puis 4, sonde de
défilement effective). Les valeurs à 359/360 px sont par ailleurs exactement la zone que
`PIT-S52-001` désigne comme « échec CI en attente » (« viser une marge à deux chiffres ;
0 à 4 px est un échec en attente »).

**Correctif :** `flex space-x-4` → `flex flex-wrap justify-center gap-x-4 gap-y-1`.
`space-x-*` pose une marge sur les frères et se comporte mal dès que la ligne se replie
(le premier élément d'une nouvelle ligne hérite d'une marge gauche parasite) : c'est `gap`
qu'il faut ici, **pas** un `flex-wrap` ajouté à `space-x-4`.

**CONTRÔLE NÉGATIF — l'instrument voit bien le défaut.** L'ancien `className` a été remis
temporairement (restauration par `trap`, vérifiée) et la série réglages rejouée dans la même
image : **`de` 24 / 4 / 4 px aux trois largeurs, `fr`/`en`/`es` à 0**. Correctif réappliqué :
**0 partout**. Sans ce contrôle, « aucun débordement » n'aurait pas été distinguable d'un
harnais aveugle.

**⚠ PORTÉE DU CORRECTIF — plus large que les 3 écrans audités.** `AppFooter` est monté par
**8 pages** : `settings`, `dashboard`, `products`, `products/[productId]`, `login`, `register`,
`forgot-password`, `reset-password`. Le défaut existait donc sur toutes, et le correctif les
répare toutes. **Seule `settings` a été mesurée** ; les 7 autres ne l'ont pas été.

**⚠ CHANGEMENT VISIBLE, signalé explicitement.** En `de`, sous ~384 px, les deux liens du pied
de page passent sur **deux lignes centrées** au lieu de déborder. Aucun changement en
`fr`/`en`/`es`, ni à partir de 384 px, ni sur la ligne de copyright.

### 4.2 NON — le « débordement du formulaire d'événement » était un artefact de MA fixture

Un relevé intermédiaire montrait le formulaire d'événement débordant de 50 à 53 px sous 375 px
**dans les quatre locales**. C'était faux, et la cause mérite d'être écrite.

L'élément fautif, une fois nommé par l'instrument corrigé, était un
`<h1 class="text-ink text-xl font-semibold tracking-tight">` de 290 à 310 px : le **titre du
produit** (`ProductDetailView.tsx:302`, `{product.name}`), sur la page au-dessus de laquelle
le formulaire s'ouvre. Or le nom venait du helper `unique()` (`support/products.ts:40`), qui
produit `${prefix} ${Date.now()}${rand}` — un **jeton de 16 chiffres insécable**.

C'était donc la fixture qui débordait, pas l'écran. Le signe qui aurait dû alerter plus tôt :
le défaut n'était **pas** corrélé à la locale (`fr` 52, `en` 51, `es` 50, `de` 53), alors qu'un
défaut d'élasticité linguistique l'est par construction. Fixture remplacée par un nom court et
sécable → **0 px dans les 4 locales**.

**Ce que cela laisse tout de même comme constat réel, tracé en follow-up :** le titre produit
ne gère pas les jetons insécables (`overflow-wrap`/`break-words` absent sur ce `h1`). Un
utilisateur nommant son produit avec une longue référence sans espace obtiendrait le même
débordement. **Locale-indépendant, hors périmètre de cette issue, non corrigé ici.**

### 4.3 NON CORRIGÉ, tracé — aucune création d'événement possible sous 1024 px

Découvert en cherchant comment atteindre le formulaire à 320 px. Ce n'est **pas** un
débordement, mais c'est bloquant et l'audit l'a mis au jour, donc il est consigné.

`setShowCreate(true)` n'apparaît **qu'une seule fois** dans tout le dépôt
(`AppShell.tsx:152`), sur `shell-sidebar-new-event-button`, lequel vit dans un
`<aside className="… hidden … lg:flex">` (`AppShell.tsx:139`). Il n'existe ni FAB, ni barre
d'onglets basse, ni entrée de menu mobile qui le déclenche — `TimelineActionSheet` n'offre
que *éditer / supprimer / annuler*.

**Conséquence : sur mobile, un utilisateur ne peut pas créer d'événement.** Le composant
`NewEventDrawer` possède pourtant bien une variante feuille mobile (`isCompact`,
`NewEventDrawer.tsx:135-145`) — mesurée ici à 0 px de débordement dans les 4 locales, donc
**prête** ; il lui manque uniquement un déclencheur.

Hors périmètre d'une issue de débordement : **non corrigé**, tracé en follow-up.

---

## 5. Troncatures silencieuses

**Aucune troncature silencieuse constatée.** Critère : un texte coupé par son conteneur
(`scrollWidth > clientWidth`) dont le `text-overflow` calculé n'est **pas** `ellipsis` —
c'est-à-dire un mot qui s'arrête net, sans que rien ne signale au lecteur qu'il manque
du texte. Sur les 164 mesures d'écran : **zéro**.

Un faux positif a dû être écarté pour obtenir ce verdict : les `<span class="sr-only">`
(« Sprache ändern », etc.) sont coupés à `clientWidth = 1 px` avec `text-overflow: clip` —
c'est le **fonctionnement normal** du motif de masquage pour lecteurs d'écran, pas une
troncature. Sans cette exclusion l'audit remontait 4 faux positifs.

**Aucun texte tronqué avec ellipsis mais sans contenu récupérable** non plus (`title` ou
`aria-label` absent) : zéro sur les 164 mesures.

### 5.1 Risque latent, non déclenché aux largeurs mesurées

Trois éléments portent `truncate` (donc *avec* ellipsis — indicateur visuel présent, l'AC est
satisfaite) **sans** attribut `title`, alors que la convention posée par `i18n.css` §4 pour
`.mt-truncate` et respectée par `OfflineBanner.tsx:57` est ellipsis **+** `title` :

- `timeline/Lane.tsx:32` — `timeline-resource-title`, largeur figée à `w-[15%]` ;
- `settings/SessionList.tsx:83` et `:91` — appareil et IP d'une session.

Aucun n'a débordé aux largeurs et avec les données mesurées ; leur contenu dépend de données
utilisateur (nom de produit, `deviceInfo` d'un navigateur) qui peuvent être bien plus longues
que les fixtures de cet audit. **Constat documenté, non corrigé** — la correction est
mécanique (ajouter `title={…}`) mais elle sort du périmètre « débordement en `de` ».

---

## 6. Sort des 7 sections inertes de `i18n.css` — DOCUMENTÉ, NON TRANCHÉ

**Cette section ne décide rien. C'est une décision produit, explicitement laissée ouverte.**

État : `i18n.css` fait 186 lignes, est chargé sur toutes les pages
(`globals.css:31`), et **une seule** de ses 8 sections est consommée
(`.mt-sysbanner*`, par `OfflineBanner`).

Les deux options, avec ce que la mesure apporte à chacune :

**Option A — câbler les sections inertes** (autre issue, autre estimation).
Ce que l'audit apprend : *aucun débordement ne les réclame aujourd'hui*. Après correctif, les
trois écrans sont à 0 px d'écart dans les 4 locales sur 12 largeurs. Câbler `.mt-truncate`,
`.mt-eyebrow--wrap` ou `.mt-btn--wrap` répondrait donc à un besoin **non constaté**.
Deux sections ne sont pas de simples poses de classe : `.mt-seg` suppose un composant
`Segmented` **qui n'existe pas**, et `.mt-tabs--collapsible` exige une **restructuration du
markup** de `ui/tabs.tsx` (ajout d'un `.mt-tabs__row` et d'un `.mt-tabs__menu`). Ce sont des
chantiers, pas des retouches.

**Option B — supprimer comme code mort.**
Ce que l'audit apprend : §7 (`.mt-num`, `.mt-date--*`) et §8 (RTL) encodent des **décisions de
conception** documentées (formats de date par locale, « la frise reste LTR même en RTL »).
Les supprimer perdrait cet arbitrage écrit, que le dépôt utilise comme mémoire — le §8 est la
seule trace de la position RTL. Le RTL n'est par ailleurs pas au périmètre de cet audit :
les 4 locales du dépôt sont toutes LTR.

**Élément factuel utile au choix, et piège associé :** `PIT-S48-002` — **Tailwind v4 scanne les
commentaires**, et citer une classe morte peut la ressusciter. Ce n'est pas un risque ici
(`i18n.css` est du CSS écrit à la main, pas des utilitaires générées), mais c'est à vérifier
avant tout déplacement de ces règles vers un fichier balayé par Tailwind.

**Recommandation de forme, pas de fond :** si l'option B est retenue, conserver §7 et §8 sous
forme de commentaire ou d'ADR plutôt que de les effacer.

---

## 7. Limites — ce que cet audit ne prouve PAS

- **`jammy` n'est pas `ubuntu-latest` du runner GitHub.** Le jeu de polices peut différer.
  C'est la limite de fond de toute vérification locale, déjà signalée par #423.
- **Le rendu n'a pas été inspecté à l'œil.** L'audit produit des nombres, pas un jugement
  esthétique. Aucune capture n'a été comparée.
- **Orientation portrait uniquement** (hauteur 800 px). La frise a une branche paysage
  (`(orientation: landscape) and (max-height: 600px)`, `TimelineResponsive.tsx:43`) et
  `TimelineMobileLandscape` **n'a pas été mesuré**.
- **Écrans hors périmètre non mesurés** : tableau de bord, produits, catégories,
  authentification, landing (cette dernière est déjà couverte par
  `landing-mobile-overflow.spec.ts`). Le correctif de §4 les touche pourtant — voir §4.
- **États dynamiques non couverts** : messages d'erreur de validation, listes longues,
  bannière `OfflineBanner` affichée, `Select` ouvert. L'audit mesure les écrans **au repos**.
- **`next build` non lancé** (`PIT-S62-009` : il réécrit le `.next` partagé du worktree et
  tuerait le serveur d'un autre agent). Atténuation : `tsc --noEmit` et `eslint` verts sur les
  fichiers touchés — c'est le gate que `next build` ajoute (`PIT-S41-005`).

---

## 8. L'instrument reste dans le dépôt, et il est ARMÉ

`frontend/e2e/sprint-63-de-overflow-audit.spec.ts` est conservé comme **verrou de
non-régression**, pas seulement comme trace de l'audit. Il couvre ce que
`landing-mobile-overflow.spec.ts` (#341) ne couvrait pas : les écrans **authentifiés**.

Trois raisons de ne pas l'avoir laissé en simple enregistreur :

1. **Un garde-fou qui ne peut pas rougir est un décor** (`PIT-S62-003`,
   `coverage-check-vert-ne-prouve-rien`). `expectNoPageOverflow` asserte les trois signaux
   — `scrollWidth <= clientWidth`, `maxScrollX === 0`, aucun élément hors bord droit — sur
   **les 3 écrans × 4 locales × 12 largeurs**, avec un message d'échec qui nomme l'écran, la
   locale, la largeur ET les éléments fautifs.
2. **Ces assertions ont été vues ROUGES**, sur le défaut réel : le contrôle négatif de §4.1
   (ancien pied de page remis en place) les fait échouer sur `settings`/`de` à 320/359/360 px.
   Elles ne sont donc pas vertes par aveuglement.
3. **L'auto-contrôle du harnais est conservé dans le fichier** : une sonde de 9 999 px injectée
   dans la frise `de` doit être détectée **par son `id`** (et non par sa forme — une assertion
   `some(o => o.tag === 'div')` serait satisfaite par n'importe quel autre `div` fautif).

### 8.1 Comment le rejouer

Le serveur Next tourne sur l'hôte, le navigateur dans l'image Linux, avec le forwarder de §2.2.

1. Backend e2e debout (ici `:8086`), puis, depuis `frontend/` :
   `NEXT_PUBLIC_API_URL=/api E2E_API_PROXY_TARGET=http://localhost:8086 npx next dev -p 3000`
   — **webpack, PAS `npm run dev`** : turbopack infère un mauvais workspace root en worktree
   (`PIT-S61-007`). Port **3000 impératif**, le CORS backend le fige.
2. **Oracle avant toute mesure** : `curl -o /dev/null -w '%{http_code}'
   localhost:3000/api/auth/me` doit valoir **401** (404 = proxy absent, `PIT-S62-012`).
3. Navigateur dans `mcr.microsoft.com/playwright:v1.61.1-jammy`, avec le forwarder TCP
   `127.0.0.1:3000 → host.docker.internal:3000` lancé dans le conteneur, puis le runner
   Playwright sur ce fichier avec `--project=chromium --workers=1` et
   `PLAYWRIGHT_BASE_URL=http://localhost:3000`.

⚠ **Attendre ≥ 2,5 min entre deux exécutions** (`PIT-S62-011`) : `global-setup` purge
`.auth/accounts.json` et chaque exécution ré-enregistre 4 comptes contre un bucket de
5/min/IP. Rencontré pendant cet audit : l'échec se présente en `provision prod` /
« Target page … has been closed » + « 17 did not run », ce qui **ressemble à une panne
d'infrastructure** et n'en est pas une.

⚠ La variable d'environnement `AUDIT_OUT` fait écrire un relevé **JSONL**, une ligne par
mesure. L'écriture est incrémentale à dessein : Playwright redémarre le worker après un échec,
et un dump en `afterAll` avait déjà écrasé le relevé de trois écrans par celui du seul worker
survivant.

### 8.2 Ce que ce verrou n'attrape PAS

- Il ne mesure **que** le débordement horizontal de page et la troncature de texte. Il ne dit
  rien du contraste, du chevauchement vertical, ni de la lisibilité.
- Il mesure les écrans **au repos**, en **portrait**, avec des données de fixture **courtes**
  (cf. §4.2 : une fixture longue a déjà produit un faux défaut dans cet audit même).
- **Il ne tourne pas dans la CI** : il n'a été joué qu'en local, dans l'image jammy. Le faire
  entrer dans le job e2e est un choix à assumer — il coûte ~1,5 à 3,5 min et dépend d'un
  backend authentifié.
