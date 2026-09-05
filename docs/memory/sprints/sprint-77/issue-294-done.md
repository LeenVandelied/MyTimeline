# Issue #294 — Diff visuel clair/sombre : hero de la landing + 4 écrans d'auth

Sprint 77, vague 5. Branche `sprint/77`.

## 1. Objectif

Introduire dans le dépôt une comparaison de RENDU (diff visuel Playwright) couvrant le hero
de la landing et les 4 écrans d'authentification, en thème clair et sombre, avec des
références committées et une tolérance calibrée.

## 2. Infrastructure introduite — le dépôt n'en avait AUCUNE

Vérifié avant d'écrire la moindre ligne : `frontend/e2e/` ne contenait **aucun**
`toHaveScreenshot` (grep : 0 fichier), **aucun** répertoire `*-snapshots`, **aucun** PNG de
référence, et `frontend/playwright.config.ts` ne portait **aucune** clé `expect`. Le dépôt
savait mesurer un contraste, une métrique typographique, un débordement — jamais comparer un
rendu.

Livré :

| Élément | Emplacement |
|---|---|
| Tolérance | `frontend/playwright.config.ts`, clé `expect.toHaveScreenshot` (nouvelle) |
| Spec | `frontend/e2e/sprint-77-theme-visual.spec.ts` |
| Références | `frontend/e2e/sprint-77-theme-visual.spec.ts-snapshots/` |

**Nomenclature : le DÉFAUT Playwright, volontairement non surchargé** (pas de
`snapshotPathTemplate`) — `{arg}-{projectName}-{platform}.png`, soit
`landing-hero-dark-chromium-linux.png`. Le suffixe de plateforme est justement ce qui rend le
choix de l'environnement de génération visible dans le nom du fichier ; le masquer par un
template aurait caché le seul indice du risque décrit au § 7.

## 3. La spec — 5 écrans x 2 thèmes (+ 1 contrôle négatif) = 11 tests

| Écran | URL | Élément capturé | Boîte mesurée |
|---|---|---|---|
| `landing-hero` | `/fr` | 1er `section.section-animation` | 1280 x 747 |
| `login` | `/fr/login` | `div.bg-surface.max-w-md.rounded-lg.shadow-lg` | 448 x 429 |
| `register` | `/fr/register` | idem | 448 x 616 |
| `forgot-password` | `/fr/forgot-password` | idem | 448 x 391 |
| `reset-password` | `/fr/reset-password?token=…` | idem | 448 x 473 |

⚠ **L'énoncé de l'issue et le briefing désignaient `app/[locale]/home/` comme la landing.
C'est faux** : `home/page.tsx` est un `permanentRedirect` 308 vers `/[locale]` (ADR-006),
mesuré (`curl /fr/home` -> 308). La landing canonique est `app/[locale]/page.tsx`. Capturer
`/fr/home` aurait capturé une page de redirection.

**Captures d'ÉLÉMENT, pas de page** : `next.config.mjs` ne pose aucun `devIndicators`, donc
l'indicateur de dev de Next existe en local et pas en CI ; l'issue demande « le hero », pas
la landing entière ; et moins de surface = moins de pixels susceptibles de diverger.
`page.screenshot({ clip })` n'est **pas** utilisé (PIT-S62-002 : il tronque au viewport en
silence, or le hero fait 747 px de haut) — `locator.toHaveScreenshot()` capture au-delà du
viewport, et `assertCaptureBox` journalise la boîte à chaque run.

### Pilotage du thème, et la PREUVE que `.dark` était posée

`app/[locale]/layout.tsx:64` monte `<ThemeProvider attribute="class" defaultTheme="system"
enableSystem>` : c'est `prefers-color-scheme` qui pilote `.dark`. La spec utilise
`test.use({ colorScheme })` (convention déjà en place, `landing-cta-contrast.spec.ts:93`) —
pas de `localStorage`.

La classe n'est pas supposée, elle est **attendue puis assertée puis journalisée** avant
chaque capture. Extrait de la sortie du run de génération, **dans le conteneur** :

```
[e2e][#294] login/light  — <html class="__variable_8db87c __variable_595324 light"> (attendu: light)
[e2e][#294] landing-hero/light — <html class="… light"> (attendu: light)
[e2e][#294] register/light — <html class="… light"> (attendu: light)
[e2e][#294] forgot-password/light — <html class="… light"> (attendu: light)
[e2e][#294] reset-password/light — <html class="… light"> (attendu: light)
[e2e][#294] login/dark   — <html class="__variable_8db87c __variable_595324 dark"> (attendu: dark)
[e2e][#294] landing-hero/dark — <html class="… dark"> (attendu: dark)
[e2e][#294] register/dark — <html class="… dark"> (attendu: dark)
[e2e][#294] forgot-password/dark — <html class="… dark"> (attendu: dark)
[e2e][#294] reset-password/dark — <html class="… dark"> (attendu: dark)
```

Preuve **indépendante**, par lecture des pixels des PNG committés (échantillonnage `sharp`) —
les thèmes diffèrent réellement, la classe n'a pas seulement été posée sur le papier :

| Référence | fond de carte (5,5) | champ de saisie (224,215) |
|---|---|---|
| `login-light` | `#ffffff` | `#f3f4f6` |
| `login-dark` | `#131519` | `#1b1e24` |
| `register-light` | `#ffffff` | `#f3f4f6` |
| `register-dark` | `#131519` | `#1b1e24` |
| `landing-hero-light` | `#fcfcfd` | — |
| `landing-hero-dark` | `#0b0c0e` | — |

### Trois sources de fausses références, trouvées PAR LA MESURE et neutralisées

Aucune n'était anticipée par le briefing ; chacune a d'abord produit une référence fausse.

**(a) Habillage dépendant de l'environnement — 3 709 px de diff entre deux runs.** Le diff a
désigné, dans la boîte du hero : l'indicateur de dev Next (`nextjs-portal` / `nextjs-toast` /
`[data-nextjs-dev-tools-button]`, absent sous `next start`), le bouton des devtools TanStack
Query (`.tsqd-parent-container`, `position: fixed` 48x48, dev only), et surtout
`OfflineBanner` (`[data-testid="network-banner"]`, `position: sticky` 1280x32) qui **ne
s'affiche que quand l'API est injoignable** — donc présent ici (backend éteint) et absent en
CI. Ce dernier aurait produit un **rouge permanent en CI**, sans rapport avec une régression.
Neutralisé par un `display: none` injecté (`ENV_CHROME_CSS`) — et **pas** par
`toHaveScreenshot({ mask })`, qui ne s'applique qu'aux éléments existants et aurait donc posé
un rectangle dans la référence sans équivalent en CI.

**(b) Course de police (`display: swap`) — 4 runs rouges sur 6, ~13 700 à 13 800 px.**
`app/fonts.ts` déclare Archivo et IBM Plex Mono en `display: 'swap'`. Le diff montrait TOUT le
texte dédoublé : deux jeux de glyphes. Deux enseignements :

- `await document.fonts.ready` **ne suffit pas** : il ne se résout que sur les chargements
  déjà en vol. C'est exactement ce que fait `waitForFonts()` de `e2e/support/contrast.ts` —
  helper existant du dépôt, **non réutilisé ici pour cette raison** ;
- `toHaveScreenshot` **ne rattrape pas** cette course, contrairement à l'intuition : il rejoue
  jusqu'à deux captures consécutives identiques, or deux frames de repli consécutives *sont*
  identiques. Il se stabilise sur le mauvais rendu et compare celui-là.

Correction : `waitForRenderedFonts()` relève les specs de police calculées, les demande
explicitement (`document.fonts.load`), attend `fonts.ready`, puis exige une **géométrie de
texte stable** sur deux relevés.

**(c) Amorçage d'`AuthContext` figé dans une référence — 13 820 px, reproductibles 8 fois.**
`login/page.tsx:29` et `register/page.tsx:30` lisent `loading` depuis `useAuth()` : l'état
global de l'amorçage, vrai tant que `GET /api/auth/me` est en vol. Le bouton rend alors un
`<Spinner>` + « Inscription… » et passe `disabled`. La référence `register-light` a été
générée **exactement dans cet état** (vérifié à l'œil sur le PNG). Durée dépendante de l'API,
donc de l'environnement. Garde ajoutée : `expect(target.locator('[aria-busy="true"]'))
.toHaveCount(0)`.

## 4. Génération des références

```bash
# 1. serveur Next sur l'hôte, port 3000 (webpack, PAS turbopack — PIT-S61-007)
cd frontend
NEXT_PUBLIC_API_URL=/api E2E_API_PROXY_TARGET=http://localhost:8080 npx next dev -p 3000

# 2. génération EN CONTENEUR (jamais sur macOS : les références seraient `-darwin`
#    et donc MANQUANTES en CI). `--grep-invert "armement"` est OBLIGATOIRE : voir ci-dessous.
docker run --rm \
  -v /Users/herrh/VSProjects/MyTimeline/.claude/worktrees/sprint-69-d576fe:/work \
  -w /work/frontend \
  --add-host=host.docker.internal:host-gateway \
  -e PLAYWRIGHT_BASE_URL=http://host.docker.internal:3000 \
  mcr.microsoft.com/playwright:v1.61.1-jammy \
  npx playwright test sprint-77-theme-visual --project=chromium --no-deps \
    --reporter=list --grep-invert "armement"
```

- **Image** : `mcr.microsoft.com/playwright:v1.61.1-jammy`, déjà présente localement.
  Ubuntu **22.04.5 LTS**, Node **v24.17.0**.
- **Version Playwright DANS le conteneur** : `npx playwright --version` -> **1.61.1**,
  identique à `@playwright/test` de `package.json` (`^1.61.1`) et à la version installée
  (1.61.1). Nomenclature et rendu cohérents.
- **`--no-deps` est nécessaire** : le projet `chromium` dépend du projet `setup`, qui
  enregistre des comptes contre le backend. Les 5 écrans sont **publics** — aucun compte, aucun
  backend. Sans `--no-deps`, `setup` échoue et la spec ne tourne jamais. En CI le backend
  tourne, `setup` passe, la spec tourne normalement dans le projet `chromium`.
- **`--grep-invert "armement"` à la génération** : quand une référence manque,
  `toHaveScreenshot` l'ÉCRIT. Les workers étant parallèles, le contrôle négatif pourrait
  graver sa capture **mutée** comme référence. Un garde-fou `existsSync` a été ajouté dans ce
  test pour refuser de tourner sans référence préexistante, mais l'exclusion reste la marche à
  suivre.
- **CORS depuis le conteneur (PIT-S63-011) : aucun 403 constaté.** Vérifié plutôt que supposé —
  les 5 écrans sont publics, et le seul appel API (`/api/auth/me`) échoue de la même façon
  dans les deux environnements sans changer le rendu une fois `aria-busy` retombé. Aucun
  forwarder TCP nécessaire.
- **`git check-ignore -v` sur les 10 PNG : aucune règle ne les avale.** Propriétaire `herrh`
  (pas `root`) — Docker Desktop a mappé correctement.

**Produit : 10 PNG, 332 Ko au total.**

| Fichier | Poids |
|---|---|
| `landing-hero-light-chromium-linux.png` | 74 607 o |
| `landing-hero-dark-chromium-linux.png` | 66 282 o |
| `register-dark-chromium-linux.png` | 28 870 o |
| `register-light-chromium-linux.png` | 28 254 o |
| `reset-password-dark-chromium-linux.png` | 22 910 o |
| `reset-password-light-chromium-linux.png` | 22 374 o |
| `login-dark-chromium-linux.png` | 19 235 o |
| `forgot-password-dark-chromium-linux.png` | 19 414 o |
| `forgot-password-light-chromium-linux.png` | 19 085 o |
| `login-light-chromium-linux.png` | 18 762 o |

## 5. Tolérance retenue : `maxDiffPixelRatio: 0.002`, `threshold: 0.2` — et sa calibration

Mesurée avec un harnais jetable (`e2e/tmp-calibration.spec.ts`, supprimé après mesure), sur
le hero clair (1280 x 747 = **956 160 px**) :

| Perturbation | pixels de diff | ratio |
|---|---|---|
| **aucune** (bruit, 2 runs) | **0** | **0** |
| `letter-spacing: 0.035em` sur le `h1` *(mutation du contrôle négatif)* | 11 878 | 0.0124 |
| `letter-spacing: 0.010em` sur le `h1` *(la plus discrète mesurée)* | 11 226 | 0.0117 |
| `font-size` du sous-titre `+1px` | 125 522 | 0.1313 |
| token `--color-accent` remplacé (fond du CTA primaire) | 34 711 | 0.0363 |
| `border-radius` du CTA `8px -> 4px` | 45 | 0.00005 |

**À quelle tolérance la mutation cesse-t-elle d'être détectée ?** Balayage
`[0, 0.0001, 0.0005, 0.001, 0.002, 0.005, 0.01, 0.02, 0.05]` :

- mutation A (retenue) : ROUGE jusqu'à **0.01** inclus, **verte à partir de 0.02**.
- mutation B (0.010em) : même seuil, ROUGE jusqu'à 0.01, verte à 0.02.
- mutation E (`border-radius`) : ROUGE **à 0 seulement**, verte dès 0.0001.

**Pourquoi 0.002** : ~6x au-dessus du bruit constaté (0) et ~6x SOUS la plus petite régression
typographique mesurée (0.0117). La marge existe dans les deux sens, et le contrôle négatif la
vérifie à chaque run.

**Angle mort assumé** : toute régression pesant moins de 0.2 % de la surface capturée —
1 912 px sur le hero, **350 px sur la plus petite carte** (448 x 391). La mutation E (45 px)
est dans cet angle mort. La couvrir imposerait `maxDiffPixelRatio: 0`, donc zéro marge face à
un environnement de rendu non mesurable ici.

`threshold: 0.2` est le défaut, posé **explicitement** : c'est lui qui absorbe l'écart de
couleur par pixel (antialiasing), pas le ratio. Confondre les deux est le premier réflexe
quand la CI rougit.

## 6. Armement — la spec ROUGIT, et c'est committé

Le contrôle négatif n'est pas une manip jetable (PIT-S62-003 : une garde prouvée par une
fixture supprimée n'est pas armée). Il est **dans la spec** : dernier `test()`, il rejoue le
hero clair, injecte `section.section-animation h1 { letter-spacing: 0.035em !important }`,
vérifie que la mutation est **effective** (`letterSpacing !== 'normal'` — sinon il ne
prouverait que sa capacité à injecter une balise inerte), puis exige que
`toHaveScreenshot('landing-hero-light.png')` **échoue** contre la référence committée. Il ne
crée aucun PNG supplémentaire.

Sortie rouge obtenue (harnais de calibration, tolérance 0, hero clair) :

```
Error: expect(locator).toHaveScreenshot(expected) failed
  11878 pixels (ratio 0.01 of all image pixels) are different.
```

Et à la tolérance RETENUE (0.002), le balayage donne `0.002:ROUGE` pour cette mutation.
Contrôle inverse : les 11 tests passent quand la mutation n'est pas injectée (11 runs
conteneur ci-dessous), donc le test rouge ne l'est pas « toujours ».

## 7. Risque CI — écrit noir sur blanc

**(a) jammy vs noble.** Les références sont produites sur `mcr.microsoft.com/playwright:v1.61.1-jammy`
(**Ubuntu 22.04**) ; la CI tourne sur `ubuntu-latest` (`.github/workflows/ci.yml:120`),
aujourd'hui **Ubuntu 24.04 « noble »**. Playwright nomme les deux `linux` : les références
**seront donc bien comparées**, il n'y aura **pas** d'erreur explicite « référence manquante ».
Si les deux distributions rastérisaient le texte différemment, le diff porterait sur des
**milliers** de pixels — l'ordre de grandeur des mutations du § 5. **Aucune valeur raisonnable
de `maxDiffPixelRatio` n'absorbe cela** : au-delà de ~0.02 la spec ne peut plus rien détecter.
Si la CI rougit sur ces références, la réponse n'est **pas** de monter le ratio, c'est de
**régénérer les références sur une image correspondant au runner** (recette § 4).

**(b) Ce que j'ai pu réduire, et qui n'est donc PLUS un risque : dev vs production.** La CI ne
joue pas `next dev` mais `./node_modules/.bin/next start` sur un build de production
(`ci.yml:361`). J'ai donc **rejoué les références contre un `next start` local** (après
`next build`, exit 0) : **3 runs conteneur consécutifs, 11/11 verts, exit 0**, zéro pixel
signalé. Les références générées contre `next dev` matchent le build de production au pixel
près. Le mode de rendu est donc écarté du risque ; il ne reste que la distribution.

**(c) Le critère « vert en CI (job e2e) » de l'issue N'EST PAS VÉRIFIABLE dans ce sprint et je
ne le déclare pas satisfait.** `ci.yml` ne se déclenche que sur `pull_request` et `push` vers
`dev`/`main` : **aucune CI ne tourne sur les branches `sprint/N`** (PIT-S64-008). Il sera
tranché à **l'ouverture de la PR de sprint**, premier run réel. C'est aussi à ce moment-là que
(a) sera confirmé ou infirmé.

## 8. Défaut connu figé dans une référence

**Aucun `Textarea` n'apparaît dans les 10 captures** — les 5 écrans ne contiennent que des
`Input` (email, nom, nom d'utilisateur, mots de passe) et le hero n'a aucun champ. Le défaut
de contraste du `::placeholder` du `Textarea` (2,82:1 clair / 2,99:1 sombre, jetons
intervertis) mesuré en vague 3 **n'est donc figé dans aucune référence de cette issue**, et sa
correction future n'obligera pas à les régénérer.

En revanche, **les `::placeholder` des `Input`** (« Email », « Nom », « johndoe », « Mot de
passe ») **sont** dans les références `login-*`, `register-*`, `forgot-password-*`. Si le
follow-up sur les jetons de placeholder touche aussi `Input`, **ces 6 références seront à
régénérer**.

## 9. Tests — chiffres réels et codes de sortie

| Vérification | Résultat | Exit |
|---|---|---|
| Spec ciblée, **conteneur jammy**, serveur `next dev` — 8 runs consécutifs | **11 passed** à chaque run | **0** x8 |
| Spec ciblée, **conteneur jammy**, serveur **`next start` production** — 3 runs | **11 passed** à chaque run | **0** x3 |
| Spec ciblée, macOS, avant génération des refs linux (validation de la logique) | 11 passed | 0 |
| `npx tsc --noEmit` | aucune erreur | **0** |
| `npx next lint` | « No ESLint warnings or errors » | **0** |
| `npx prettier --check` (spec + config) | « All matched files use Prettier code style! » | **0** |
| `npx vitest run` | **112 fichiers, 1296 tests, 0 échec** | **0** |
| `npx next build` | build complet, 4 locales SSG | **0** |

**Ce que je N'AI PAS joué, et qu'il faut savoir :**

- **La suite E2E complète.** Ciblage volontaire (PIT-S62-011 : deux runs complets rapprochés
  ne peuvent pas passer, budget `register` 5/min/IP). Je n'ai donc **pas** vérifié que ma spec
  cohabite avec les ~240 autres tests sous `workers: 2` — notamment que le verrou de run et le
  provisioning ne créent pas d'interférence. **En CI (`workers: 1`) ce risque est moindre, mais
  il n'est pas mesuré.**
- **La CI elle-même** (§ 7c) — impossible sur `sprint/N`.
- **Le backend** n'a jamais tourné : inutile pour 5 écrans publics, mais cela signifie que les
  références ont été prises avec `GET /api/auth/me` en échec. Les deux gardes (`ENV_CHROME_CSS`
  pour la bannière, `aria-busy` pour l'amorçage) sont précisément là pour rendre ce fait sans
  effet — et le rejeu contre `next start` (§ 7b) le confirme, mais **avec un backend également
  absent**. Un run avec backend vivant n'a pas été fait.
- **Les autres locales** (`en`, `es`, `de`) et les autres viewports : hors périmètre de l'issue.

## 10. Signaux `[MEMORY:*]`

**[MEMORY:pitfall]** Contexte : `e2e/support/contrast.ts` expose `waitForFonts()` qui ne fait
qu'`await document.fonts.ready`. Avec `next/font` en `display: 'swap'` (`app/fonts.ts`), ce
n'est pas suffisant : `fonts.ready` ne se résout que sur les chargements DÉJÀ en vol, et le
texte reste peint dans la police de repli. Mesuré : 4 runs rouges sur 6, ~13 700 px de diff,
tout le texte dédoublé dans le diff. Solution : relever les specs de police calculées, les
demander via `document.fonts.load()`, puis attendre `fonts.ready`, puis exiger une géométrie
de texte stable. Prévention : les specs de CONTRASTE existantes ne sont pas fausses (une
substitution de police ne change pas les couleurs), mais toute spec sensible à la GÉOMÉTRIE du
texte ne doit pas se fier à `waitForFonts()`.

**[MEMORY:pitfall]** Contexte : `toHaveScreenshot` rejoue la capture jusqu'à obtenir DEUX
captures consécutives identiques avant de comparer. On en déduit à tort qu'il attend un rendu
correct. Solution : deux frames de repli consécutives sont identiques — il se stabilise donc
sur le MAUVAIS rendu et compare celui-là. Prévention : « attendre la stabilité » ne remplace
jamais « attendre la bonne condition » (police chargée, spinner retombé, section révélée).

**[MEMORY:pitfall]** Contexte : une référence de diff visuel prise en local capture aussi
l'habillage dépendant de l'environnement peint DANS la boîte de l'élément : indicateur de dev
Next (`nextjs-portal`, absent sous `next start`), devtools TanStack Query
(`.tsqd-parent-container`, dev only), et `OfflineBanner` (`[data-testid="network-banner"]`) qui
n'existe QUE quand l'API est injoignable. Solution : injecter un `display: none` (`addStyleTag`)
plutôt qu'un `toHaveScreenshot({ mask })` — un masque ne s'applique qu'aux éléments EXISTANTS,
il graverait donc un rectangle dans la référence sans équivalent en CI, soit exactement le faux
rouge qu'on prétend supprimer. Prévention : avant de générer une référence, énumérer les
éléments `position: fixed|sticky` de la page (`getComputedStyle`) et se demander lesquels
dépendent du mode de build ou de la santé de l'API.

**[MEMORY:bug]** Cause : la référence `register-light` a été générée avec le bouton de
soumission en état `loading` (spinner + « Inscription… », `disabled`), parce que
`register/page.tsx:30` et `login/page.tsx:29` lisent `loading` depuis `useAuth()` — l'amorçage
global d'`AuthContext` (`GET /api/auth/me`), dont la durée dépend de l'API. Symptôme : 13 820 px
de diff, REPRODUCTIBLES sur 8 runs — la fixité du chiffre a désigné la référence, pas le run.
Solution : attendre `[aria-busy="true"]` à 0 dans la cible avant capture. Règle : un chiffre de
diff parfaitement stable accuse la RÉFÉRENCE ; un chiffre qui varie accuse le RUN.

**[MEMORY:decision]** Contexte : générer les références en conteneur jammy alors que
`ubuntu-latest` est noble. Décision : conserver jammy (image déjà présente, version Playwright
exactement appariée), poser `maxDiffPixelRatio: 0.002` et ÉCRIRE le risque plutôt que de le
diluer dans une tolérance large. Pourquoi : au-delà de ~0.02 la spec ne peut plus détecter
aucune régression typographique (mesuré) — une tolérance qui « absorbe » un écart de
distribution est une spec morte. Si la CI rougit, régénérer sur l'image du runner.

**[MEMORY:pattern]** Problème : prouver qu'une comparaison visuelle peut échouer, sans fixture
jetable (PIT-S62-003). Solution : un contrôle négatif COMMITTÉ dans la même spec, qui rejoue un
cas existant + une mutation `addStyleTag`, vérifie que la mutation est effective, et exige
l'échec de `toHaveScreenshot` contre la MÊME référence committée — plus un `existsSync` sur la
référence, car un `toHaveScreenshot` sans référence l'ÉCRIT (le contrôle négatif graverait
alors la mutation). Anti-pattern : mesurer l'armement dans un harnais supprimé avant commit.

## 11. Recommandations suite

- `RECOMMAND_FOLLOWUP` **Renforcer `waitForFonts()` de `e2e/support/contrast.ts`, ou le
  documenter comme insuffisant pour la géométrie** — il ne fait qu'`await document.fonts.ready`,
  ce qui laisse passer la substitution `swap` (mesuré § 3b). Aucune spec existante n'est fausse
  aujourd'hui (elles mesurent des couleurs), mais le nom promet plus que la fonction ne tient.
  `[triage XS | domaine frontend]`
- `RECOMMAND_FOLLOWUP` **Jouer la suite E2E complète une fois avec cette spec incluse**, pour
  vérifier sa cohabitation avec les ~240 tests existants sous `workers: 2` (verrou de run,
  budget `register`). Non fait ici, volontairement (PIT-S62-011). `[triage XS | domaine e2e]`
- `RECOMMAND_FOLLOWUP` **Trancher le sort des références au premier run CI de la PR de sprint**
  : si le job `e2e` rougit sur `sprint-77-theme-visual`, régénérer sur une image `noble`
  appariée au runner plutôt que d'élargir la tolérance (§ 7a). Prévoir aussi d'épingler l'image
  de génération dans le fichier plutôt que dans ce document. `[triage S | domaine e2e]`
- `RECOMMAND_FOLLOWUP` **Étendre la couverture visuelle** aux écrans authentifiés
  (dashboard, timeline, settings) une fois la stabilité CI acquise — l'infrastructure est
  désormais en place, il ne reste que le provisioning de compte. `[triage M | domaine e2e]`
- Aucun signal `RECOMMAND_DB_EXPERT` : cette issue ne touche ni schéma ni migration.
- Aucun signal `RECOMMAND_SECURITY` : aucun changement de code applicatif, aucune donnée.
- Aucun signal `RECOMMAND_TEST_RUNNER` : les runs ont été joués et lus ici, codes de sortie inclus.

## 12. État de l'environnement (fait horodaté, pas une promesse — PIT-S63-008)

Au **2026-09-05 ~12:20**, le port 3000 porte un **`next start` de PRODUCTION** lancé par moi
(le `next dev` du lead a été tué : il rendait 500 sur toutes les routes après que mon
`next build` a réécrit `.next` sous lui — PIT-S62-009). Ne pas supposer qu'il tourne encore.

Relancer un serveur de dev :

```bash
cd /Users/herrh/VSProjects/MyTimeline/.claude/worktrees/sprint-69-d576fe/frontend
NEXT_PUBLIC_API_URL=/api E2E_API_PROXY_TARGET=http://localhost:8080 npx next dev -p 3000
```

STATUS: COMPLETED
