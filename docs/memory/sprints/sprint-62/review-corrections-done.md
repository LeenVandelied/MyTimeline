# Corrections de review — Sprint 62 (2 cycles)

## Cycle 1 — diff complet (`origin/dev...HEAD`)

Verdict `CORRECTIONS_REQUISES` : **3 MAJEUR + 4 MINEUR**, les MAJEUR tous dans
`frontend/e2e/support/pixel.ts` — module neuf, déjà consommé par deux specs, écrit pour rendre le
faux ratio silencieux impossible, et capable d'en produire de trois façons.

Corrigés au commit **`f275db4`** (+176 / −18) :

| Garde | Défaut mesuré avant correction |
|---|---|
| Clamp du `clip` sur `viewportSize()` + assert `decoded ≈ clip × dpr` + **levée** si point hors région (avant : `Math.min/max` **rabattait**) | élément collé au bord bas → la bande « fond adjacent » rendait **la couleur de l'élément lui-même**, unanimité **93 %** — donc indétectable par la garde d'unanimité |
| `minUnanimity = 0.6` **levante par défaut, sur les DEUX bandes** | fond rayé 2 px, unanimité 33 % → **ratio 1,00:1 publié** sans signal |
| `aria-disabled` / `data-disabled` dans `assertFocusVisible` | `<div role="switch" aria-disabled="true">` passait la garde — le 1,59:1 du S58 pouvait revenir |
| `mode()` lève sur échantillons vides (MINEUR) | `TypeError` opaque, et `unanimity = NaN` dont la comparaison `>= 0.6` **passe** |

Trois MINEUR hors `pixel.ts` traités au commit **`3e2f90c`** (commentaires seuls, +49 / −2) :
thème de la 404 documenté, filet du drapeau `globalNotFound` nommé dans `next.config.mjs`, en-tête
périmé de `globals.css` corrigé.

## Cycle 2 — re-review ciblée sur les commits de correction

Déclenché par une question du dev : les commits de correction n'avaient **jamais été relus**, alors
que `f275db4` est du code de garde écrit pour réparer du code de garde.

Verdict **`PRET_POUR_MERGE`**. Aucun CRITIQUE, aucun MAJEUR. Les 3 MAJEUR du cycle 1 vérifiés
**résolus dans le code**, pas sur le message de commit. Aucune spec ne pose `minUnanimity` : l'opt-out
n'est pas utilisé par confort.

**Soupçon du lead invalidé par le reviewer** : la marge passée à `Math.abs(offsetPx) + 3` ressemblait
à un garde-fou affaibli pour faire repasser une spec. Vérification faite, le clamp viewport s'applique
**après** l'élargissement, et `samplePositions` place les offsets négatifs **à l'intérieur** de la
boîte — aucun pixel hors viewport, aucune lecture hors élément visé. Ce n'était pas un affaiblissement.

### Le constat de fond du cycle 2

> Que les deux specs retrouvent des ratios identiques prouve la **non-régression**, mais **ne prouve
> pas que les gardes marchent**. Unanimité 100 %, éléments loin des bords ⇒ **aucune garde ne se
> déclenche sur un cas réel du dépôt**. Leur seule preuve d'armement était des fixtures synthétiques,
> **supprimées avant commit**. Toute régression future de ces gardes — seuil inversé, `<` devenu
> `<=`, tolérance élargie — **passera la CI verte**.

C'est la version « garde-fou » de `coverage-check-vert-ne-prouve-rien` : un filet que rien ne teste
n'est pas un filet, c'est un commentaire.

## Correction finale — commit `25d2474` (+506 / −12)

Deux points de fond fermés, sur décision du dev.

### 1. La garde `disabled` lit désormais les ancêtres

`closest('[aria-disabled="true"],[data-disabled]')` remplace la lecture sur l'élément seul (branche
native `.disabled` inchangée) ; le retour porte `disabledOn`. **Même classe de bug que celui corrigé
à `f275db4`** : sur Radix, « désactivé » est un attribut sur un `div`, jamais une propriété DOM — et
un `Item` ou `Group` ancêtre désactive ses descendants sans qu'aucune propriété DOM ne le signale.

Message réellement produit (il nomme le signal **et** l'élément porteur) :

> Mesure refusée : `<span>` est désactivé via `aria-disabled="true"`, porté par un ANCÊTRE
> `<div#grp.mt-select__item>` — S58 a publié un 1,59:1 lu sur un contrôle désactivé (`opacity:.4`).
> Sur Radix, un ancêtre (Item, Group, fieldset) désactive ses descendants sans qu'aucune propriété
> DOM ne le signale. Assurer l'état avant de mesurer (`PIT-S58-002`).

### 2. Les 4 gardes sont armées par des tests

`frontend/src/__tests__/e2e-pixel-guards.test.ts` — **19 tests vitest**, aucune spec Playwright
ajoutée (donc le `testMatch` du projet firefox reste intact).

Technique : un **double de `Page`** dont `evaluate()` rend directement `{width, height, dpr, data}`,
sans PNG encodé — le clamp viewport, l'assertion d'échelle et l'accès pixel s'exécutent **pour de
vrai**, sans navigateur.

**Preuve d'armement** (garde neutralisée → rouge, garde remise → vert ; `git diff` de contrôle propre
après remise) :

| Garde | Neutralisation | Rouge | Vert remise |
|---|---|---|---|
| `mode([])` | bloc `throw` supprimé | **2 failed / 17 passed** | 19 passed |
| `minUnanimity` | `if (band.unanimity < minUnanimity)` → `if (false)` | **2 failed / 17 passed** (les deux bandes) | 19 passed |
| Ancêtres | `closest(...)` → `matches(...) ? el : null` | **3 failed / 16 passed** | 19 passed |
| Hors-région | condition → `false` + rabattement `Math.min/max` d'origine | **1 failed / 18 passed** | 19 passed |

**Contrôles négatifs inclus** — sans eux, une garde qui lèverait *toujours* passerait le test :
bande unanime → ratio publié ; `minUnanimity: 0` → passe (`#0e5fc4`, 6,08) ; lecture loin du bord →
pas de levée ; `aria-disabled="false"` → **pas** de levée.

### JSDoc bornée plutôt que supprimée

La promesse « aucun ratio faux ne peut sortir » ne valait que pour `measureIndicatorContrast`.
Réécrite en « LÈVE en dessous de 0,6, sur CHACUNE de ses deux bandes », avec deux limites explicites :
elle ne couvre pas `readStrip` / `dumpOutwardProfile` (qui rendent `unanimity` sans lever, c'est leur
rôle), et elle est levable par `minUnanimity: 0`. Ajout d'un renvoi vers le fichier de tests.
Ce fichier avait déjà eu trois commentaires qui mentaient, corrigés à `3e2f90c`.

## Compteurs finaux (exit codes lus)

| Suite | Avant | Après |
|---|---|---|
| vitest | 950 / 97 fichiers | **969 passed / 98 fichiers**, exit 0 |
| `tsc --noEmit` | 0 | **0**, exit 0 |
| `eslint` + `next lint` + `prettier --check` | 0 | **0**, exit 0 |
| `next build` | 52/52 | **`Generating static pages (52/52)`**, exit 0 |
| E2E (oracle `:3100/api/auth/me` → 401 vérifié avant lancement) | 200/0/8 | **216 déclarés, 208 passed, 8 skipped, 0 failed**, exit 0 |

**Les 2 specs existantes retrouvent leurs ratios exactement** : 6× `6,08:1` (`#0e5fc4`/`#ffffff`),
6× `6,48:1` (`#4d9bff`/`#131519`), unanimité 100 % sur les deux bandes des 4 mesures. Les 6
occurrences à 48 % sont le baseline `.mt-radio__dot` (cercle) documenté par #415, ratio non publié.
Aucun écart.

## Non vérifié

- **`:focus-visible` sous jsdom est une approximation** de l'heuristique Chromium (forcé ici par
  `.focus()`). La branche testée est celle du *disabled*, atteinte seulement après
  `focusVisible === true` — mais l'équivalence jsdom / Chromium sur ce pseudo-sélecteur n'est pas
  démontrée.
- **La garde « ancêtres » n'est pas éprouvée sur un vrai arbre Radix portalisé** : les ancêtres sont
  des nœuds injectés. Qu'aucun ancêtre applicatif réel ne porte `data-disabled` à tort n'est établi
  que par le fait que les 2 specs restent vertes.
- Tolérance ±1 px à `dpr ≥ 3` et `{@link tangentBandPx}` pendant : **non touchés** (décision dev).
- WebKit, `forced-colors: active` : hors périmètre.

## Deux points de méthode à retenir

### Erreur du lead : un briefing qui exigeait un fichier supprimé

Le briefing de cette dernière tâche demandait de lire `docs/memory/sprints/sprint-62/briefing-415.md`
comme context-pack obligatoire, et d'en citer les 4 marqueurs. **Le lead avait retiré les briefings
juste avant l'ouverture de la PR** (convention anti-bloat). Le fichier n'existait donc plus.

L'agent a **refusé d'inventer les marqueurs** et l'a signalé en tête de rapport, plutôt que de
produire une preuve de chargement plausible. Le travail a été fait sans le pack, en lisant `pixel.ts`,
`issue-415-done.md`, `playwright.config.ts`, `vitest.config.mts` et `eslint.config.mjs`.

**Leçon** : une exigence de citation adossée à un artefact que la convention de sprint supprime est
**structurellement infalsifiable** — soit l'agent ment, soit il bloque. Ne pas demander de citer un
briefing après l'avoir retiré.

### Faux écart levé par le lead : « firefox 13 vs 8 »

L'agent signalait la référence « firefox 13 » comme impossible (la spec restreinte contient 4 tests
× 2 thèmes = 8) et proposait un follow-up. **Vérifié par le lead avant d'ouvrir quoi que ce soit** :
`playwright test --list --project=firefox` reporte bien **« Total: 13 tests in 2 files »**, Playwright
incluant la dépendance `setup` (5) dans le décompte du projet. Les deux agents comptaient juste, avec
des conventions différentes. **Aucun follow-up ouvert.**

## Signaux mémoire

**[MEMORY:pattern]** Armer une sonde de pixel **sans navigateur** : un double de `Page` dont
`evaluate()` rend directement `{width, height, dpr, data}` (aucun PNG encodé) fait tourner pour de
vrai le clamp viewport, l'assertion d'échelle et l'accès pixel. Géométrie choisie pour que les
positions tombent sur des entiers (côté 40 px, `edgeGuardPx: 10`, 21 échantillons → pas de 1 px) :
une ligne rayée par parité donne 11/21 = 52 %, sous le seuil de 60 %, de façon **déterministe**.
Anti-pattern écarté : extraire la garde dans une fonction pure testée à part — sa suppression du site
d'appel resterait alors invisible.

**[MEMORY:pitfall]** Un garde-fou validé par des **fixtures supprimées avant commit** n'est pas
armé : la CI verte ne réarme rien. Exiger un test **du garde lui-même** (avec contrôle négatif), pas
seulement l'invariance des mesures existantes.

**[MEMORY:pitfall]** `ps aux | grep` est **avalé par le hook RTK** — retour « 0 processus » alors que
Playwright tournait. Utiliser `/bin/ps -eo` ou `pgrep -fl`, jamais `ps | grep` sous RTK.

**[MEMORY:pitfall]** Deux runs E2E complets rapprochés **ne peuvent pas passer** : `global-setup`
purge `.auth/accounts.json`, donc chaque run ré-enregistre 4 comptes contre un bucket de
**5/min/IP**. Le 2ᵉ échoue en `provision <compte>` avec `Test timeout of 180000ms` et « 211 did not
run » — symptôme qui **ressemble à une panne d'infra**, pas à un rate-limit. Attendre ≥ 2,5 min entre
deux runs.

## Recommandations suite

- **RECOMMAND_FOLLOWUP** (XS) — tolérance ±1 px de l'assertion d'échelle (faux positif structurel à
  `dpr ≥ 3`) et `{@link tangentBandPx}` pendant. Maintenant que le fichier de gardes existe, le
  premier se teste **en une ligne** (`dpr: 3` sur le double de `Page`).
- Pas de RECOMMAND_TEST_RUNNER, DB_EXPERT, SECURITY ni PLAYWRIGHT_REVIEWER : suites exécutées et
  compteurs lus sur exit codes ; périmètre outillage de test, zéro endpoint, zéro BR, zéro schéma,
  aucune spec Playwright ajoutée ni modifiée.

STATUS: COMPLETED
