Fichiers de contexte lus : `docs/memory/sprints/sprint-76/pitfalls-527.md` (intégral) · `frontend/e2e/support/contrast.ts` (intégral) · `frontend/e2e/support/pixel.ts` (en-tête + API exportée + `captureRegion`) · `frontend/e2e/support/dev-tooling.ts` (intégral) · `frontend/e2e/sprint-63-de-overflow-audit.spec.ts` (intégral) · `frontend/e2e/sprint-75-legal-pages.spec.ts` (en-tête) · `frontend/e2e/sprint-70-preview-visual.spec.ts` (bloc bascule de thème) · `frontend/playwright.config.ts` (intégral) · `frontend/src/components/legal/legal-table-of-contents.tsx` · `frontend/src/components/legal/legal-disclaimer.tsx` · `frontend/src/lib/legal-pages.ts` · `frontend/app/[locale]/privacy/page.tsx` · `frontend/app/[locale]/terms/page.tsx` (en-tête) · `frontend/app/[locale]/layout.tsx:64` + `frontend/src/components/theme-provider.tsx` · `frontend/src/styles/ds/tokens/colors.css` · `frontend/src/styles/ds/tokens/typography.css` · `frontend/src/styles/landing.css` (`.gradient-text`) · `frontend/public/locales/{fr,en,es,de}/legal.json` + `common.json`. Le briefing intégral `briefing-527.md` n'a pas été relu (son contenu était déjà inliné dans le prompt).

# #527 — Pages légales : mesure des contrastes et du débordement

**Statut : COMPLETED.** Aucun écart WCAG. Aucun débordement du sommaire. Un défaut de
débordement RÉEL trouvé hors périmètre (le `<h1>`), caractérisé et non corrigé — motifs plus bas.

## Conditions de mesure

| | |
|---|---|
| Instrument contraste | `frontend/e2e/support/contrast.ts` — luminance WCAG 2.x (linéarisation sRGB), fond **composité depuis la pile d'ancêtres réelle**, levée explicite sur couleur non analysable ou dégradé traversé |
| Instrument peinture | `frontend/e2e/support/pixel.ts` · `measurePaintedGlyph` (lecture de pixel, clip clampé + échelle assertée) |
| Serveur | `npx next dev -p 3000` (webpack, voie 2 de `playwright.config.ts` #427) · oracle `/api/auth/me` → **401** (proxy OK) |
| Navigateur | Chromium (Playwright 1.61), viewport 1280×720 pour le contraste, 375×800 pour le débordement |
| Bascule de thème | `test.use({ colorScheme })`. **Mécanisme vérifié, non supposé** : `app/[locale]/layout.tsx:64` monte `<ThemeProvider attribute="class" defaultTheme="system" enableSystem>`, et `src/components/theme-provider.tsx` documente que le DS écoute `.dark` **et** `[data-theme="dark"]`. L'émulation `prefers-color-scheme` suffit donc. **Oracle de thème armé dans la spec** : chaque test asserte que `<html>` porte réellement `.dark` (ou ne la porte pas) avant toute mesure — sans quoi la colonne « sombre » serait une copie de la claire. |
| Locale | **`de`** pour toute la matrice. Le disclaimer n'est rendu qu'hors `fr` (`shouldShowLegalDisclaimer`) ; `de` est aussi la locale du volet débordement. Une locale suffit pour le contraste : les jetons du DS ne dépendent pas de la langue. |
| État | Souris écartée (`mouse.move(0,0)`) + `document.fonts.ready` + lecture STABILISÉE (2 lectures identiques) avant tout chiffre — PIT-S58-002. Opacité effective mesurée = **1** partout. |

## 1. Contrastes mesurés — WCAG 1.4.3

**80 mesures** (40 chiffres romains + 40 liens + 4 disclaimers, sur 2 pages × 2 thèmes).
Tous les chiffres romains d'une même page/thème sont strictement identiques (min = max), le
tableau donne donc une ligne par groupe.

| Cible | Page | Thème | Locale | Ratio mesuré | Seuil | Verdict |
|---|---|---|---|---|---|---|
| Chiffres romains (×9) | /privacy | clair | de | **6,11:1** | 4,5 (1.4.3) | ✅ |
| Chiffres romains (×9) | /privacy | sombre | de | **5,85:1** | 4,5 | ✅ |
| Chiffres romains (×11) | /terms | clair | de | **6,11:1** | 4,5 | ✅ |
| Chiffres romains (×11) | /terms | sombre | de | **5,85:1** | 4,5 | ✅ |
| Liens du sommaire (×9) | /privacy | clair | de | **6,11:1** | 4,5 | ✅ |
| Liens du sommaire (×9) | /privacy | sombre | de | **5,85:1** | 4,5 | ✅ |
| Liens du sommaire (×11) | /terms | clair | de | **6,11:1** | 4,5 | ✅ |
| Liens du sommaire (×11) | /terms | sombre | de | **5,85:1** | 4,5 | ✅ |
| Disclaimer (texte) | /privacy | clair | de | **6,11:1** | 4,5 | ✅ |
| Disclaimer (texte) | /privacy | sombre | de | **5,85:1** | 4,5 | ✅ |
| Disclaimer (texte) | /terms | clair | de | **6,11:1** | 4,5 | ✅ |
| Disclaimer (texte) | /terms | sombre | de | **5,85:1** | 4,5 | ✅ |

Couleurs effectives : clair `#5e626b` sur `#ffffff` · sombre `#8e9299` sur `#131519`.
Tailles rendues : chiffres et liens **15 px/400**, disclaimer **17 px/400** — aucune cible ne
relève du « grand texte » (assertion `wcagThreshold === 4.5` **armée** dans la spec, pour que
le seuil ne s'assouplisse pas tout seul si la typo grossit un jour).

**Le chiffre romain est `aria-hidden` — cela ne l'exempte de rien** : WCAG 1.4.3 porte sur la
présentation *visuelle* du texte. Il a donc été mesuré au même titre que les liens.

### Témoin de peinture (PIT-S58-001) — 40 mesures

Le fond n'a **pas** été déduit de la classe `bg-surface`. Pour chaque chiffre romain, les pixels
de l'intérieur de la boîte ont été lus et leur couleur modale comparée au fond composité depuis
le DOM :

| Thème | Fond PEINT (modal) | Fond composité DOM | Divergence | Part du fond | Encre du glyphe peinte |
|---|---|---|---|---|---|
| clair | `#ffffff` | `#ffffff` | **1,000:1** | 86,5 % | `#5e626b` (cœur) / `#7c7f86` (anticrénelé) |
| sombre | `#131519` | `#131519` | **1,000:1** | 86,6 % | `#8e9299` / `#767a80` |

Divergence nulle sur les 40 : le ratio publié décrit bien ce qui est affiché. C'est le contrôle
qui manquait à S58 et à BUG-S70-001.

### Filets `border-rule` — mesurés, non assertés (arbitrage explicite)

| Cible | Thème | Ratio mesuré | Classement |
|---|---|---|---|
| Cadre du sommaire + du disclaimer | clair | **1,236:1** (`#e6e7eb` sur `#ffffff`) | décoratif |
| Cadre du sommaire + du disclaimer | sombre | **1,162:1** (`#20232a` sur `#131519`) | décoratif |

WCAG 1.4.11 vise les objets graphiques **nécessaires** pour identifier un composant ou son état.
Le cadre n'en est pas un : retiré, le sommaire reste une liste de liens et le disclaimer une
phrase intégralement lisible. Le DS tranche déjà ce cas (`ds/tokens/colors.css:62-66`) —
`--color-rule` est **décoratif** et plafonne à 1,2:1, le tier fonctionnel étant
`--color-rule-emphasis` (3,97:1 / 4,07:1). Asserter 3:1 ici rougirait sur un choix de charte,
pas sur un défaut. Les nombres sont consignés pour que l'arbitrage soit vérifiable.

## 2. Débordement en `de` à 375 px

### Le sommaire ne déborde PAS

| Page | Largeur du `<nav>` | Pire dépassement d'un item | Pire troncature (`scrollWidth − clientWidth`) | Fautifs dans le périmètre | Verdict |
|---|---|---|---|---|---|
| /privacy | 343 px | **−15,64 px** (marge restante) | **0 px** | aucun | ✅ |
| /terms | 343 px | **−23,84 px** | **0 px** | aucun | ✅ |

Item le plus large : `/privacy` « Cookies et technologies similaires » = 225,4 px ;
`/terms` « Article 5 – Données personnelles » = 217,2 px. Disclaimer : `scrollWidth` 341 =
`clientWidth` 341, pas de troncature sur les deux pages.

### ⚠ La prémisse de l'issue est fausse — vérifiée, pas supposée

« L'allemand produit des titres longs » ne s'applique pas ici : **les intitulés de section des
pages légales sont restés FRANÇAIS dans les 4 locales**. `public/locales/{en,es,de}/legal.json`
ne traduit que `tableOfContents` et `disclaimerOriginalFrench` ; les 20 `*.title` y sont
identiques au `fr` (« Article 5 – Données personnelles », « Politique de Confidentialité »…).
Les seules chaînes réellement allemandes rendues sont « Inhaltsverzeichnis » (titre du sommaire),
« Zurück » (bouton) et le disclaimer. Aucune ne déborde. C'est PIT-S71-001 / PIT-S74-003 :
l'inventaire d'un énoncé est un point de départ, jamais le périmètre.

### Fragilité LATENTE confirmée (PIT-S73-001), mais non déclenchée par le contenu livré

Les liens du sommaire portent `min-width: auto` et `overflow-wrap: normal` en étant **enfants
directs d'un `<li class="flex gap-3">`**. Une sonde insécable de 52 caractères
(`Datenschutzgrundverordnungs…`) injectée dans un lien fait bien déborder la page — c'est
l'auto-contrôle du harnais. Le contenu réellement livré ne le déclenche pas ; **aucun correctif
n'est donc appliqué** (rien à corriger aujourd'hui), mais si les intitulés étaient un jour
traduits, il faudrait `min-w-0` **+** `break-words` (voir la mesure au §3 : `min-w-0` seul ne
corrige rien).

## 3. ⚠ DÉFAUT RÉEL TROUVÉ — hors périmètre de #527, non corrigé

Le balayage de page a sorti un débordement que l'issue ne visait pas.

| Page | Locale | Largeur | `clientWidth` | `scrollWidth` | Dépassement | `maxScrollX` |
|---|---|---|---|---|---|---|
| /privacy | de | 320 px | 320 | 499 | **+179 px** | 179 |
| /privacy | de | 375 px | 375 | 499 | **+124 px** | 124 |
| /terms | de | 320 px | 320 | 429 | **+109 px** | 109 |
| /terms | de | 375 px | 375 | 429 | **+54 px** | 54 |

Fautif unique : `<h1 class="text-3xl font-bold gradient-text">`, enfant direct du
`<div class="flex items-center mb-6">` qui porte aussi le bouton « Retour ». `text-3xl` vaut
**57 px** dans l'échelle du DS (`ds/tokens/typography.css` : 13/15/17/21/27/35/45/57), **pas** les
30 px de l'échelle Tailwind par défaut — c'est PIT-S53-001 côté conséquence. Le mot le plus long
du titre mesure alors ~381 px, et `min-width:auto` sur un item de flex conserve cette taille
min-content.

**Trois raisons de ne pas le corriger dans cette issue, chacune vérifiée :**

1. **Pré-existant.** `git log -S 'text-3xl font-bold gradient-text'` → `2a2cd9a` (« Step 3 add
   term and privacy »). Pas `9dac435` (#60, Sprint 75), dont le message dit d'ailleurs « aucun
   restyling ». #527 audite ce qu'a livré #60.
2. **Non corrélé à la locale** — signal de reconnaissance de PIT-S63-013. Mesuré sur
   **4 locales × 5 largeurs** : `fr` +122 px, `en` +109 px, `es` +111 px, `de` +124 px sur
   `/privacy` @375 px. L'écart entre locales (13 px) vient du seul libellé du bouton
   (Retour/Back/Atrás/Zurück). `de` n'est pas le sujet.
3. **Le corriger est un arbitrage de charte, pas une retouche.** Mesuré sur `/de/privacy`
   @375 px : `min-w-0` **seul** ne corrige rien (la boîte tombe à 240,9 px mais `scrollWidth`
   reste 381 — PIT-S73-001 littéralement) ; `min-w-0 + break-words` supprime le débordement au
   prix d'un titre **coupé en plein mot sur 246 px de haut** (369 px à 320 px sur `/terms`). Le
   vrai correctif est une rampe typographique responsive sur le titre, décision du gardien de la
   charte — hors mandat explicite de cette issue (« tu ne crées pas de surface »).

**Ce que fait la spec à la place :** un test de **caractérisation** nommé « le seul débordement de
page reste le `<h1>` pré-existant » fige l'inventaire mesuré. Il rougit dans les deux sens — si un
second fautif apparaît, et le jour où le titre est corrigé (son message dit alors de le
supprimer). Le verrou de #527, lui, asserte qu'**aucun** élément du sommaire ou du disclaimer ne
dépasse le bord droit ; il est armé (auto-contrôle §4) et vert.

## 4. Preuve de mutation — JOUÉE

**a) Auto-contrôles permanents, rejoués à chaque run** (motif `PIT-S62-003` / S63) :

| Auto-contrôle | Référence | Après dégradation | Verdict |
|---|---|---|---|
| Encre dégradée par le **jeton** (`--color-ink-muted: #E9EAEC`) sur le chiffre romain | **6,113:1** | **1,204:1** (< 4,5) | la sonde voit |
| Jeton insécable injecté dans `terms-toc-link-preamble` | 0 fautif dans le périmètre | fautif `terms-toc-link-preamble` remonté, dépassement > 0,5 px | le verrou voit |

Le second asserte l'**identité** de la sonde (`toContain('terms-toc-link-preamble')`), pas
« au moins un fautif » — sinon le `<h1>` du §3 le satisferait sans rien prouver (contrôle négatif
du S59).

**b) Mutation manuelle exécutée, sortie réelle :**

- Mutants posés : seuil de contraste `r.wcagThreshold` → `6.5` ; borne de confinement du sommaire
  `SUBPIXEL_TOLERANCE_PX` → `-30`.
- Résultat : **`6 failed / 4 passed`, exit code 1**. Les 4 tests de contraste et les 2 tests de
  confinement rougissent ; la caractérisation et les auto-contrôles (qui n'utilisent pas ces
  seuils) restent verts — comportement attendu.
- Mutants retirés, re-run : **`10 passed`, exit code 0**.

## 5. Arbitrage multi-navigateurs — NON, et voici pourquoi

**Décision : ne PAS étendre la spec au-delà de chromium.** Quatre motifs :

1. `playwright.config.ts` restreint le projet `firefox` par `testMatch` à
   `sprint-62-select-focus-indicator.spec.ts` et écrit noir sur blanc qu'élargir ce `testMatch`
   est « une DÉCISION DE SPRINT » exigeant que la spec ait d'abord été jouée verte sur Gecko.
   Aucune spec du dépôt n'a jamais tourné sur Gecko à part celle-là ; WebKit n'est pas déclaré.
2. Ce que mesure #527 n'est pas dépendant du moteur : de l'arithmétique WCAG sur des jetons hex
   plats, et une contrainte flex/min-content standard. Les marges sont larges — **+36 % au-dessus
   du seuil** en clair (6,11 vs 4,5), **+30 %** en sombre (5,85 vs 4,5) ; aucune gestion de
   couleur d'aucun moteur ne déplace un verdict de cet ordre.
3. Le seul point réellement sensible au moteur est le **témoin de peinture**, qui exercerait le
   rasteriseur et le chemin `screenshot`/`createImageBitmap` de Gecko — c'est-à-dire le harnais,
   pas les pages. Bénéfice nul pour l'issue, chasse aux faux positifs garantie.
4. PIT-S62-011 : deux runs E2E complets rapprochés ne peuvent pas passer sur ce poste
   (`register` 5/min/IP). Multiplier les moteurs multiplie ce risque pour un gain qu'aucune
   mesure ne justifie.

Si l'écart macOS/Ubuntu inquiète (PIT-S52-001), la réponse est la CI Ubuntu, qui exécutera cette
spec — pas un second moteur.

## 6. Livrable

- **Ajouté** : `frontend/e2e/sprint-76-legal-visual.spec.ts` — 10 tests, spec de mesure
  **permanente**. Aucune modification de code applicatif, aucun jeton du DS touché, aucune clé
  i18n ajoutée.
- Exécutions (serveur `next dev` externe, `--no-deps` : ces pages sont publiques, le projet
  `setup` est donc inutile et son budget `register` préservé) :
  - `sprint-76-legal-visual.spec.ts` seule → **10 passed**, exit 0
  - `sprint-75-legal-pages.spec.ts` + `sprint-76-legal-visual.spec.ts` → **38 passed**, exit 0
    (aucune régression ni interférence sur la spec du sprint précédent)
- `npx tsc --noEmit` → exit 0, 0 ligne · `npx eslint` → exit 0 · `npx prettier --check` → exit 0.
  Toutes ces sorties lues via `rtk proxy` avec le code de sortie (PIT-S75-002, PIT-S74-008).

## 7. Ce qui n'a PAS été fait / vérifié — à assumer

- **La suite E2E complète n'a pas été rejouée.** Motif : PIT-S62-011 (budget `register`) et
  absence de couplage — la spec ajoutée n'authentifie rien, ne seede rien, ne touche aucun compte
  partagé ni aucun fichier existant. La CI de la PR reste le gate autoritatif.
- **Aucune mesure sur Ubuntu.** Les métriques de police diffèrent de macOS (PIT-S52-001) : les
  marges de confinement du sommaire (−15,6 px / −23,8 px sur 343 px) pourraient s'y réduire. Elles
  ne peuvent pas s'inverser sans un écart de métriques de +7 % ; c'est peu probable, mais ce n'est
  **pas** mesuré ici.
- **Le contraste n'a été mesuré que dans une locale (`de`)** — assumé et motivé (§ Conditions).
  Le disclaimer n'existant pas en `fr`, la matrice `fr` serait de toute façon incomplète.
- **Le `<h1>` n'est pas corrigé** (§3). C'est un défaut réel, mesuré, laissé en l'état
  volontairement, avec un test qui le fige.
- **Aucun état de survol / focus mesuré.** Les liens du sommaire portent `hover:text-ink` et
  `focus-visible:ring-2 ring-ring` : ces deux états n'ont **pas** été mesurés (l'issue porte sur
  l'état de repos). `hover:text-ink` va dans le sens du contraste ; le ratio de l'anneau de focus,
  lui, est inconnu.

## Recommandations suite

- `RECOMMAND_ISSUE` — ouvrir un follow-up **P2 / frontend / a11y** : « `<h1>` des pages légales
  (`text-3xl` = 57 px) déborde le viewport sous 640 px dans les 4 locales » ; y coller le tableau
  du §3, et router vers `ui-design` (rampe typographique responsive), pas vers un `break-words`.
- `RECOMMAND_ISSUE` — ouvrir un follow-up **P2 / frontend / i18n** : les 20 intitulés de section
  de `legal.json` sont restés en français dans `en`/`es`/`de` (seuls `tableOfContents` et
  `disclaimerOriginalFrench` sont traduits). Prérequis à toute reprise du volet « débordement en
  `de` » du sommaire, aujourd'hui sans objet.
- Pas de `RECOMMAND_TEST_RUNNER` car la spec a été exécutée ici même (10 passed, exit 0 lu) et la suite complète n'a aucun couplage avec elle ; pas de `RECOMMAND_DB_EXPERT`, `RECOMMAND_SECURITY_EXPERT` ni `RECOMMAND_UI_DESIGN` sur cette issue, car aucun schéma, aucune surface d'authentification et aucun jeton du DS n'ont été touchés — le besoin `ui-design` est porté par le follow-up `<h1>` ci-dessus, pas par ce diff.

STATUS: COMPLETED
