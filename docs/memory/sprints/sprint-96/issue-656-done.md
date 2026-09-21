# Issue #656 — La bannière d'erreur serveur recouvre le sélecteur de langue et la bascule de thème

Sprint 96 — vague 3. Branche `claude/sprint-96-start-b98611` (worktree
`/Users/herrh/VSProjects/MyTimeline/.claude/worktrees/amazing-rubin-93b16e`).

Garde-fou GF-1 exécuté :

```
$ git rev-parse --abbrev-ref HEAD
claude/sprint-96-start-b98611
```

---

## Décision AA/AAA

**Cible retenue : AAA — WCAG 2.4.12 (Focus Not Obscured, Enhanced), dégagement TOTAL.**

Motif, chiffré, et non « par excès de zèle » :

1. L'énoncé a raison sur le constat : le recouvrement laissait le centre des deux
   boutons cliquable, donc **2.4.11 (AA) tenait** et **2.4.12 (AAA) était violé**.
2. Mais le critère qui tranche ici n'est pas celui-là, c'est **2.5.8 Target Size
   (Minimum, AA)**. Les deux déclencheurs portent une cible tactile de **44 px**
   (`before:h-11 before:w-11`, PAT-S24-002). Mesuré avant correctif : la cible
   s'étendait de y=12 à y=56, la bannière occupait 0..32 → **20 px masqués, 24 px
   restants**. 24 px est **exactement** le seuil de 2.5.8. Aucune marge : le moindre
   gain d'un pixel sur la hauteur de la bannière (ou une bannière sur deux lignes
   en `de`, la locale la plus verbeuse) faisait passer sous le seuil AA.
3. Le dégagement complet coûte **un mot-clé CSS** (`relative`) et **zéro pixel de
   déplacement visible** hors bannière. L'arbitrage coût/bénéfice ne se pose pas.

La cible AAA est **mesurée atteinte au moment où le focus est reçu** (test
`focus clavier reçu hors bannière`, 4 pages × 2 viewports) : `scrollY` reste à 0 et
le contrôle est intégralement sous la bannière.

**Réserve explicite, à ne pas lire comme un acquis** : la page reste défilable de
32 px (voir « Résidu assumé » ci-dessous). Défilée à fond par l'utilisateur, la
bannière collante remord 16 px du conteneur. Je ne revendique donc PAS « AAA en
toutes circonstances » — je revendique AAA **à la réception du focus**, qui est ce
que 2.4.11/2.4.12 formulent, et dégagement total **à l'état de repos**.

---

## Où j'ai corrigé et pourquoi

**Correction locale, sur les 4 pages d'auth — mais PAS en déplaçant les contrôles.**
J'ai corrigé le **bloc conteneur** de leur positionnement absolu :

```diff
- <div className="bg-bg text-ink flex min-h-screen flex-col">
+ <div className="bg-bg text-ink relative flex min-h-screen flex-col">
```

### La cause réelle, mesurée (l'énoncé ne la donne pas)

`OfflineBanner` est `position:sticky; top:0` (`.mt-sysbanner--sticky`,
`ds/components/i18n.css:141`) : il est **dans le flux** de `<body>` et pousse le
contenu de 32 px. **C'est correct, et ça marche partout ailleurs.**

Les 4 pages d'auth, elles, **sortaient du flux** : leur conteneur langue/thème est
`absolute top-4 right-4` et leur racine était `position: static`. Le bloc conteneur
d'un `absolute` sans ancêtre positionné est le **bloc conteneur initial**, ancré à
l'origine du **document**. Le conteneur restait donc à y=16 pendant que la page
descendait à y=32. Vérifié au navigateur avant correctif :
`getComputedStyle(root).position === "static"` sur les 4 pages.

**Ce n'est donc pas la bannière qui est en faute, ce sont les 4 pages.**

### Ce que l'autre option aurait cassé

Toucher `OfflineBanner` / `.mt-sysbanner--sticky` / `app/[locale]/layout.tsx` aurait
été une correction unique mais **fausse** :

- la bannière est le SEUL élément en flux au-dessus de `{children}` ; la passer en
  `fixed` ou lui poser une marge négative la ferait **recouvrir** le contenu de
  TOUTES les surfaces (landing, dashboard, timeline, réglages) — avec
  `--z-netbanner: 80` elle passerait par-dessus l'en-tête de l'`AppShell` et les
  sheets. On échangerait un recouvrement de 16 px sur 4 pages publiques contre un
  recouvrement de 32 px sur l'application entière ;
- un décalage compensatoire dans `layout.tsx` (padding-top conditionnel) déplacerait
  toutes les surfaces **qui n'ont aucun défaut** — elles suivent déjà correctement
  la poussée du flux, mesuré.

**Contrôle de portée** : j'ai cherché les autres `absolute top-*` susceptibles de
s'ancrer au bloc conteneur initial —
`/usr/bin/grep -rn "absolute top-" app/ src/components/ | grep -v "before:absolute"`
rend 7 occurrences, dont **4 sont exactement ces conteneurs** ; les 3 autres
(`ui/dialog.tsx`, `ProductsListView.tsx`, `EventPreviewTimeline.tsx`) vivent sous un
ancêtre positionné. Le défaut est **strictement local à l'auth**.

### Ce que je n'ai PAS fait, et pourquoi

**Je n'ai pas factorisé les 4 conteneurs dupliqués en composant.** C'était l'option
signalée comme « plus large que l'énoncé » par le briefing. Je m'en abstiens parce
que la factorisation n'aurait **rien corrigé ici** : le défaut n'est pas dans le
conteneur (identique aux 4 exemplaires et correct en soi), il est dans la **racine
de page**, qui elle n'est pas factorisable sans un layout `app/[locale]/(auth)/`.
Factoriser aurait donc ajouté un fichier et 4 diffs **sans toucher la cause**.
→ porté en recommandation ci-dessous, pas fait en douce.

---

## Mesures

Toutes les mesures viennent de `boundingBox()` + `document.elementFromPoint()`, **bannière
FORCÉE à l'écran**, jamais d'une capture. Levier : `page.route('**/api/auth/me')` → **500**.
`AuthProvider` appelle `/api/auth/me` au montage sur toute page, y compris publique, et
l'intercepteur d'`apiClient` classe la santé réseau **avant** le court-circuit
`INLINE_AUTH_ENDPOINTS` (`apiClient.ts:192-197`) : la bannière monte en
`data-state="server-error"` sans redirection. Aucune feuille de style injectée, aucune
position forcée.

Pile : backend conteneur `:8085`, `next build` + `next start` sur `:3000`
(oracle `/api/auth/me` = 401, `/fr/login` = 200 avant chaque campagne).

### Bannière AFFICHÉE — 1280×720, identique sur les 4 pages

| | AVANT | APRÈS |
|---|---|---|
| bannière | `y=0 h=32` (0..32) | `y=0 h=32` (0..32) |
| conteneur langue/thème | `y=16 h=36` (**16..52**) | `y=48 h=36` (**48..84**) |
| recouvrement visuel | **16 px** | **0 px** (16 px de garde) |
| cible tactile 44 px | 12..56 → **20 px masqués** | 44..88 → **0 px masqué** |
| `elementFromPoint` sommet de cible | **BANNIÈRE** | **bouton** |
| `elementFromPoint` sommet visuel | **BANNIÈRE** | **bouton** |
| `elementFromPoint` centre | bouton | bouton |
| `position` de la racine | `static` | `relative` |

Mesures identiques à 390×844 (le conteneur passe de `x=1188` à `x=298`, les ordonnées
sont inchangées) sur `login`, `register`, `forgot-password`,
`reset-password?token=…`.

### Bannière ABSENTE — le correctif est un NO-OP visuel

| viewport | conteneur AVANT | conteneur APRÈS | `scrollHeight`/`clientHeight` |
|---|---|---|---|
| 1280×720 | `x=1188 y=16 w=76 h=36` | `x=1188 y=16 w=76 h=36` | 720 / 720 |
| 390×844 | `x=298 y=16 w=76 h=36` | `x=298 y=16 w=76 h=36` | 844 / 844 |

**Zéro déplacement perçu tant que l'API répond.** C'est ce qui rend
`RECOMMAND_UI_DESIGN` inutile ici (voir Recommandations).

### Résidu assumé, ENCADRÉ et non tu

La racine reste `min-h-screen` (100vh) sous une bannière de 32 px en flux : le
document dépasse de **exactement 32 px** et la page est défilable d'autant. Défilée
à fond, la bannière collante recouvre de nouveau **16 px** du conteneur.

| état | AVANT | APRÈS |
|---|---|---|
| `scrollHeight - clientHeight`, bannière affichée | 32 | 32 |
| conteneur à `scrollY = 32` | `y=-16` (**hors écran par le haut**, 48 px masqués) | `y=16` (16 px recouverts) |

Le correctif **améliore** donc aussi le cas défilé (le conteneur ne sort plus du
viewport) sans le résoudre. Ce résidu **n'est pas propre à l'auth** : toute racine
`min-h-screen` déborde de la hauteur de la bannière. Le dégager exige de refaire la
mise en page de `<body>` en colonne flex (`body{min-height:100vh;display:flex;
flex-direction:column}` + `flex-1` sur chaque racine de page) — **toutes** les
surfaces, toutes les références visuelles. Hors périmètre de #656.

Plutôt que de le taire, le test `résidu de défilement encadré` l'**encadre en min ET
en max** (débordement = 32 exactement, recouvrement défilé = 16 exactement) : la
spec rougit si la géométrie dérive dans un sens comme dans l'autre, **y compris si
quelqu'un corrige le résidu sans mettre à jour ce contrat**. Même motif que
`sprint-95-toast-overlap.spec.ts` pour la décision B de #714.

### Contrôle négatif — la spec attrape-t-elle vraiment le défaut ?

Un oracle qu'on n'a jamais vu rougir ne prouve rien (GF-6). J'ai donc **retiré le
correctif, reconstruit (`next build`), redémarré, réarmé l'oracle (401/200) et
rejoué la spec** :

```
32 failed / 5 passed   (les 5 verts = projet `setup`)
  Error: bannière x=0 y=0 w=1280 h=32 recouvre le conteneur x=1188 y=16 w=76 h=36
    Expected: >= 31   Received: 16
  Error: sommet de la cible tactile — Expected: "toggle"   Received: "banner"
  Error: au moment du focus, la bannière x=0 y=0 w=1280 h=32 mord sur x=1188 y=16 w=36 h=36
  Error: résidu défilé, conteneur x=1188 y=-16 w=76 h=36 — Expected: 16   Received: 48
```

**32 tests sur 32 rougissent sans le correctif, les 32 passent avec.** Le correctif
a ensuite été remis, rebuild + redémarrage + oracle refaits.

---

## Fichiers modifiés

- `frontend/app/[locale]/login/page.tsx` — `relative` sur la racine + note #656
- `frontend/app/[locale]/register/page.tsx` — idem
- `frontend/app/[locale]/forgot-password/page.tsx` — idem
- `frontend/app/[locale]/reset-password/page.tsx` — idem
- `frontend/e2e/sprint-96-auth-banner-overlap.spec.ts` — **nouveau**, 32 tests
  (4 pages × 2 viewports × 4 contrats : boîtes disjointes / cible tactile /
  focus clavier / résidu encadré)

Aucun `data-testid` ajouté (le conteneur est visé par `[data-testid="auth-theme-toggle"]
>> xpath=..`) → pas de dette `coverage-e2e`. Aucun fichier de `settings/`, de
`palette-color-picker.tsx` ni de spec réservée à un autre agent n'a été touché.

---

## Tests

### Liste grep complète des specs citant les surfaces touchées

```
$ /usr/bin/grep -rln "network-banner\|mt-sysbanner\|language-selector\|theme-toggle" frontend/e2e/
frontend/e2e/sprint-77-theme-visual.spec.ts
frontend/e2e/landing-mobile-menu.spec.ts
frontend/e2e/landing-auth-theme-toggle.spec.ts
frontend/e2e/sprint-96-auth-banner-overlap.spec.ts   (la nouvelle)

$ /usr/bin/grep -rln -e "/login" -e "/register" -e "/forgot-password" -e "/reset-password" frontend/e2e/
auth-guard  auth-setup-render-retry  auth-signature  auth.setup  document-lang
forgot-password  golden-path  landing-auth-theme-toggle  landing-mobile-menu
reset-password-failures  settings-account  sprint-77-theme-visual
sprint-89-local-date-west  timeline  (+ 6 helpers de support/)
```

La seconde liste étant large (14 specs), **j'ai rejoué la suite ENTIÈRE** plutôt que
d'en choisir un sous-ensemble (PIT du S86 : 4 specs choisies sur 12 → 8 régressions
ratées).

### Résultats réels

| campagne | résultat |
|---|---|
| nouvelle spec seule, correctif EN PLACE | **37 passed** (32 à moi + 5 `setup`) en 6,0 s |
| nouvelle spec seule, correctif RETIRÉ (contrôle négatif) | **32 failed / 5 passed** |
| **suite complète** (469 tests) | **450 passed / 10 failed / 8 skipped / 1 did not run** en 3,0 min |
| **suite complète** `--ignore-snapshots` | **459 passed / 1 failed / 8 skipped / 1 did not run** en 2,8 min |

### Les 10 « failed » de la suite complète ne sont PAS des régressions (GF-5)

Les 10 sont **toutes** dans `sprint-77-theme-visual.spec.ts`, et l'une d'elles est
`landing-hero` (clair + sombre) — une page que **je n'ai pas touchée**. Diagnostic :
`git status --porcelain | /usr/bin/grep darwin` a rendu **10 PNG
`*-chromium-darwin.png` non suivis**, créés par ce run. C'est PIT-S95-003 :
seules les références `*-chromium-linux.png` sont versionnées ; sur macOS Playwright
CRÉE la référence absente et fait échouer le test **à la création**, puis le run
suivant PASSE **sans rien comparer** — vérifié : rejouée seule juste après, la spec
a rendu **16 passed** en 6,5 s, ce qui est un vert **VIDE**.

→ Les **10 PNG `-darwin` ont été SUPPRIMÉS** (`git status` final : aucun `darwin`),
et ces 10 tests sont **retranchés du décompte annoncé**. Je ne revendique rien sur
les références visuelles : **seule la CI Linux peut trancher**.

### L'unique « failed » de la campagne `--ignore-snapshots`

`sprint-77-theme-visual.spec.ts:620 › armement de la comparaison › une mutation
typographique du hero fait ROUGIR la comparaison`. C'est le **contrôle d'armement** :
il mute la typo et exige que la comparaison échoue. `--ignore-snapshots` désactive
justement la comparaison — ce test ne PEUT pas passer sous ce drapeau. Artefact du
drapeau, pas régression.

### Le « 1 did not run »

Projet `rate-limit-armed`, déclaré `dependencies: ['chromium', 'firefox']` : il ne
démarre pas quand le projet `chromium` a le moindre échec. Il n'a donc pas tourné
dans les deux campagnes complètes, **pour une raison sans rapport avec #656**.
Non rejoué isolément : **non vérifié**.

### Portes locales

```
$ ./scripts/test-quiet.sh frontend
✓ Frontend : OK (build + tests unitaires + typecheck + lint)
   — next build OK, Vitest OK, tsc --noEmit OK, « ✔ No ESLint warnings or errors »

$ cd frontend && ./node_modules/.bin/prettier --check .      # binaire DIRECT (GF-2)
Checking formatting...
All matched files use Prettier code style!
```

### Ce que je n'ai PAS vérifié

- les références visuelles Linux (impossible sur macOS — voir ci-dessus) ;
- Firefox et WebKit : le projet `firefox` est restreint par `testMatch` à
  `sprint-62-select-focus-indicator.spec.ts`, ma spec n'y tourne pas. Le
  raisonnement (bloc conteneur initial) est du CSS positionné standard, mais
  **ce n'est pas une mesure** ;
- le comportement en locale `de` (bannière potentiellement sur deux lignes, cf.
  le motif du seuil 2.5.8 ci-dessus) : mesuré en `fr` uniquement.

---

## État de la pile E2E

**DÉMONTÉE.** `docker compose -p amazingrubin93b16e -f docker-compose.yml --profile e2e
down -v` (le `down` sans `--profile e2e` ne voit PAS ces services et échoue sur
« Resource is still in use » — les deux services sont en `profiles: ["e2e"]`).

- conteneurs `amazingrubin93b16e-backend-e2e-1` / `-postgres-e2e-1` : **supprimés**
- volumes `postgres-e2e-data` / `avatars-e2e-data` : **supprimés**
- réseau `amazingrubin93b16e_default` : **supprimé**
- ports **3000**, **8085**, **5435** : **libres** (vérifiés `lsof`)
- image `amazingrubin93b16e-backend-e2e:latest` : **CONSERVÉE** (aucun commit
  `backend/` sur ce sprint → réutilisable telle quelle par la vague suivante, cf.
  recette S87)

⚠ Le `.next` laissé sur disque provient d'un `npm run build` **avec**
`NEXT_PUBLIC_API_URL=/api E2E_API_PROXY_TARGET=http://localhost:8085` : les rewrites
`/api/*` y sont sérialisées (PIT-S58-003). Un agent qui rebâtit sans ces variables
perdra le proxy.

---

## Recommandations suite

**`RECOMMAND_UI_DESIGN` : NON — négation explicite et motivée.**
Le briefing demandait de la poser si la correction déplace visiblement les contrôles
« en permanence, pas seulement quand la bannière est là ». **Mesuré : elle ne les
déplace pas du tout hors bannière** — conteneur à `x=1188 y=16 w=76 h=36` avant
comme après, aux deux viewports, sur les 4 pages, et `scrollHeight === clientHeight`
inchangé. Le seul déplacement (16 → 48) survient **quand la bannière est affichée**,
c'est-à-dire quand le décalage est la correction elle-même. Rien à arbitrer.

**`RECOMMAND_TEST_RUNNER` : NON.** Suite complète jouée ici (2 campagnes), portes
locales vertes. Rien à déléguer.

**`RECOMMAND_DB_EXPERT` / `RECOMMAND_SECURITY` : NON.** Aucune ligne backend, aucun
schéma, aucune surface d'authentification modifiée (les pages d'auth le sont dans
leur seule mise en page).

**Deux issues de suivi à ouvrir (hors périmètre #656, ne pas les glisser dans ce
sprint) :**

1. **Résidu de défilement de 32 px sous la bannière réseau.** Toute racine
   `min-h-screen` déborde de la hauteur de la bannière en flux ; défilée à fond, la
   bannière collante remord 16 px sur les pages d'auth (et masque 32 px de contenu
   partout ailleurs). Correctif propre : `<body>` en colonne flex + `flex-1` sur les
   racines de page, à la place de `min-h-screen`. Touche **toutes** les surfaces et
   **toutes** les références visuelles → sprint dédié, avec la CI Linux comme juge.
   Le contrat actuel est déjà encadré par le test `résidu de défilement encadré`.
2. **Les 4 conteneurs langue/thème restent dupliqués** (`absolute top-4 right-4
   flex items-center gap-1` + `<ThemeToggle testId="auth-theme-toggle" />` +
   `<LanguageSelector />`, à l'identique). Le correctif de #656 en a **doublé** le
   coût de divergence : il faut maintenant que les 4 racines restent `relative` ET
   que les 4 conteneurs restent identiques. Factorisation naturelle : un layout
   `app/[locale]/(auth)/layout.tsx` portant la racine `relative` **et** le coin de
   contrôles — un seul endroit, et le `relative` devient structurel au lieu d'être
   répété. Volontairement non fait ici : c'est un changement de routage, pas un
   correctif de bug.

---

## Signaux mémoire

`[MEMORY:bug]` **Cause** : sur les 4 pages d'auth, le conteneur langue/thème est
`absolute top-4 right-4` sous une racine `position: static` ; son bloc conteneur est
donc le **bloc conteneur initial** (origine du document) et non la page. La bannière
réseau `sticky` étant DANS le flux, elle poussait la page de 32 px sans emporter le
conteneur, resté à y=16 → 16 px de recouvrement visuel, 20 px de cible tactile.
**Solution** : `relative` sur la racine des 4 pages ; le conteneur s'ancre à la page
et suit la poussée. **Règle** : *un `absolute` dont le bloc conteneur n'est pas
explicitement posé s'ancre au DOCUMENT, pas à « ce qui l'entoure à l'écran » ; dès
qu'un élément en flux peut s'insérer au-dessus (bannière, en-tête conditionnel),
l'ancrage implicite devient un recouvrement. Poser `relative` sur la racine est le
réflexe, pas un détail de style.*

`[MEMORY:pitfall]` **Contexte** : `sprint-77-theme-visual.spec.ts` injecte
`display:none` sur `[data-testid="network-banner"]` avant chaque capture — pour de
bonnes raisons (la bannière n'existe qu'API éteinte et aurait rougi en permanence en
CI). Conséquence non écrite : **tout défaut géométrique impliquant cette bannière est
structurellement invisible à la suite visuelle**, dans les deux sens (elle ne le voit
pas, et elle ne le verrait pas disparaître). #656 a vécu ≥ 13 sprints derrière ce
masque. **Prévention** : quand une spec visuelle NEUTRALISE un élément, ce qui
concerne cet élément exige un oracle de **géométrie** (`boundingBox` +
`elementFromPoint`, élément FORCÉ à l'écran). Généralisation : *avant de conclure
d'un vert de captures, lister ce que la spec masque — c'est la liste exacte de ce
qu'elle ne prouve pas.*

`[MEMORY:pattern]` **Problème** : forcer la bannière réseau de façon déterministe
dans une spec, sur une page publique et sans session. **Solution** :
`page.route('**/api/auth/me', r => r.fulfill({ status: 500 }))` avant `goto`.
`AuthProvider` appelle `/api/auth/me` au montage sur **toute** page, y compris
publique, et l'intercepteur d'`apiClient` classe la santé réseau **avant** le
court-circuit `INLINE_AUTH_ENDPOINTS` (`apiClient.ts:192-197`) : un ≥ 500 appelle
`networkStatusStore.reportServerError()` même sur un endpoint géré inline. La
bannière monte en `data-state="server-error"` **sans redirection** (seul le 401
redirige). **Anti-pattern** : injecter une feuille de style pour « faire apparaître »
la bannière, ou forcer sa position — on mesurerait alors une géométrie fabriquée.
Corollaire lu à l'envers dans `sprint-95-toast-overlap.spec.ts` : c'est précisément
pour **éviter** cet effet de bord que cette spec-là utilise un 400 et pas un 500.

`[MEMORY:decision]` **Contexte** : #656 demandait de trancher AA (déjà tenu) ou AAA.
**Décision** : AAA (2.4.12), dégagement total. **Pourquoi** : le critère qui tranche
n'est pas 2.4.11 mais **2.5.8 Target Size (AA)** — la cible tactile des déclencheurs
vaut 44 px, 20 étaient masqués, il en restait **exactement 24**, soit le seuil AA au
pixel près, sans aucune marge. Le dégagement complet coûtant un mot-clé CSS et zéro
déplacement perçu (mesuré), l'arbitrage ne se pose pas. **Réserve consignée** : AAA
est revendiqué *à la réception du focus* et *à l'état de repos*, pas après un
défilement utilisateur de 32 px — ce résidu est encadré par un test dédié et porté
en issue de suivi.

---

STATUS: COMPLETED
