# Issue #497 — Plancher de lisibilité des traits peints dans la couleur utilisateur

## RETOUR

- **commits** : `f1f08ce` (6 fichiers, +589 / −52)
- **fichiers de contexte lus** :
  - `.ai-env/context-packs/br-events.md` — **BR-EVE-009** (l.92-97) : modèle 1-couleur,
    encre calculée par `lib/color.ts` (`contrastInk`/`textOn`), pas de `text-white` en dur.
    C'est le helper que le plancher étend au lieu d'en écrire un second.
  - `.ai-env/context-packs/pit-frontend.md` — **PIT-S58-001** (l.302-310, « `getComputedStyle`
    ne tranche que la couleur *déclarée* »), **PIT-S58-002** (instant/état), **PIT-S61-003**
    (l.480-486, décider sur le **couple rendu**, pas la couleur source), **PIT-S61-004**
    (recalculer avec les constantes du dépôt), **PIT-S22-001** (l.40, `npm run build`
    obligatoire), **PIT-S58-004** (un garde-fou cité peut n'exister nulle part → d'où le test
    qui relit `colors.css`).
  - `docs/memory/pitfalls.md` — **PIT-S70-003** (l.1161-1162, l'`opacity:.8` retiré) et
    **PIT-S70-005** (négation sur UNE ligne, appliqué ci-dessous).
  - `docs/memory/bugs-resolved.md` — **BUG-S70-001** (l.83-84) : « défaut résiduel NON corrigé,
    remonté en arbitrage » — c'est exactement cette issue.
  - `docs/memory/sprints/sprint-70/issue-325-done.md` — tableau des ratios mesurés + section
    « Écart NON corrigé » ; méthode reprise telle quelle (`getComputedStyle` + fond composité).
  - `docs/memory/sprints/sprint-47/e2e-local-runbook.md` — piège #0 (profil `e2e`), piège #2
    (CORS `:3100`), réglage n°5 (`NEXT_PUBLIC_API_URL=/api` au build). Recette suivie, E2E
    lancée réellement (cf. « Tests »).
  - `frontend/src/styles/ds/` — recherche d'un helper existant : `ds/` ne contient **aucune**
    fonction de contraste (CSS pur). Le helper réel est `frontend/src/lib/color.ts`
    (`relativeLuminance`, `contrastRatio`, `contrastInk`) : **réutilisé, pas dupliqué**.
  - `frontend/e2e/README.md` + `e2e/support/contrast.ts` — LUS (méthode de compositage,
    garde `borderTopColor` de PIT-S70-004). Nécessaire : c'est cette méthode que le modèle JS
    devait reproduire.
  - `.ai-env/context-packs/pit-frontend.md` intégral : **NON LU** (94 Ko) — parcouru par
    recherche ciblée (`contrast`, `WCAG`, `a11y`, `opacity`, `color-mix`, `jsdom`).
  - `briefing-497.md` (229 Ko) : **NON LU** intégralement — les 6 fichiers pointés ont été
    ouverts directement à leur source versionnée.

## Résumé

**Objectif** — poser un plancher WCAG 1.4.11 (3:1) sur les 2 traits de la mini-frise d'aperçu
peints dans la couleur choisie par l'utilisateur.

**Doctrine appliquée** (celle imposée par le plan, non rouverte) : mélange **progressif** de la
couleur utilisateur vers l'**encre du thème** jusqu'à franchir le seuil, et pas plus loin.

**Périmètre tenu strict** : le connecteur pointillé et le contour du fantôme. Les **aplats**
(barre pleine, fond à 8 % du fantôme) restent peints dans la couleur **brute** — leur encre est
déjà calculée par `contrastInk`. Un test unitaire verrouille ce non-élargissement.

**Theme-aware sans `useTheme()`** : les deux valeurs sont calculées côté JS
(`--mt-evt-outline` / `--mt-evt-outline-dark`) et c'est le **CSS** qui tranche
(`.dark` / `[data-theme="dark"]`). Un `useTheme()` aurait rendu la passe SSR **sans** plancher.

**BR touchée** : BR-EVE-009 (modèle 1-couleur) — étendue, pas modifiée : la couleur reste
unique et l'encre reste calculée ; on ajoute le calcul du **trait**.

**Fichiers clés**
- `frontend/src/lib/color.ts` — `mixHex`, `contrastFloor`, `outlineFloorVars`,
  `THEME_SURFACE`, `THEME_INK`, `WCAG_AA_NON_TEXT`, `CONTRAST_FLOOR_MARGIN`.
- `frontend/src/styles/ds/components/timeline.css` — `.mt-evt--draft` (+ variante `.dark`) et
  nouvelle classe `.mt-evt-connector` (+ variante `.dark`).
- `frontend/src/components/events/EventPreviewTimeline.tsx` — pose les 2 variables ; le
  `borderColor` inline du connecteur disparaît (un inline n'est pas commutable par thème).
- `frontend/e2e/sprint-70-preview-visual.spec.ts` — exemption `coloredTraitsMustPass` **levée**,
  remplacée par `flooredIn` qui exige EN PLUS qu'une couleur déjà conforme ressorte **intacte**.

### Décisions techniques à relire en review

1. **Balayage linéaire, pas dichotomique** dans `contrastFloor` : en thème sombre, une couleur
   quasi noire est **plus sombre que la surface** ; en la tirant vers l'encre claire la
   luminance TRAVERSE celle du fond → le ratio redescend à 1.00:1 avant de remonter. Le
   prédicat n'est pas monotone, une dichotomie rendrait un `t` arbitraire.
2. **`mixHex` interpole en sRGB GAMMA-ENCODÉ** — c'est ce que fait `color-mix(in srgb, …)`.
   Interpoler en linéaire aurait calculé le plancher contre un fond que le navigateur ne peint
   pas. Vérifié par test (`#000` + `#fff` à 50 % = `#808080`, pas `#bcbcbc`).
3. **Deux fonds distincts** : le connecteur flotte sur `--color-surface` ; le contour du
   fantôme est peint **par-dessus son propre fond** `color-mix(… 8 %, surface)`
   (`background-clip: border-box`). D'où le paramètre `tintPercent`. Écart réel mesuré.
4. **`CONTRAST_FLOOR_MARGIN = 0.05`** — coussin de quantification 8 bits, PAS un relèvement de
   seuil. Le seuil reste 3:1 ; sans marge une valeur calculée à 3,004 pouvait être relue à
   2,998 (rouge d'arrondi).
5. **Duplication assumée de 4 tokens** (`--color-surface`/`--color-ink` × 2 thèmes) dans
   `color.ts` : aucune fonction CSS ne calcule un contraste. **Verrouillée** par un test qui
   relit `ds/tokens/colors.css` et compare (réponse directe à PIT-S58-004).

### Pitfalls rencontrés

- **BUG-S70-002 reproduit à l'identique** : `npx prettier --check` a affiché
  « All files formatted correctly » avec **exit 1** sous le hook RTK. 5 fichiers étaient
  réellement non formatés. Repris via `rtk proxy` + lecture du code de sortie.
- **`contrastFloor` renvoyait `#3b62d4` pour `#3B62D4`** (normalisation de casse par `mixHex`)
  sur le cas déjà conforme. Corrigé par un court-circuit qui rend la chaîne **d'origine** :
  sinon le style inline changeait à chaque frappe et un `toBe(color)` en test comme en revue de
  diff croyait à une modification.
- **Sonde de mesure en `expect` dur = fail-fast** : la première tentative de relever les 12
  ratios s'est arrêtée au premier élément mesuré. Refaite en `expect.soft`.

### Tests (chiffres réels)

| Suite | Commande | Résultat |
|---|---|---|
| Unitaires ciblés | `npx vitest run src/lib/color.test.ts src/components/events/` | **46 passed** |
| Unitaires frontend complets | `./scripts/test-quiet.sh frontend` | **1132 passed / 104 fichiers**, 18,7 s |
| Build | `npm run build` | exit **0** |
| Lint | `next lint` (3 fichiers source) | 0 warning / 0 erreur |
| Prettier | `rtk proxy npx prettier --check` (6 fichiers) | OK après `--write` |
| **E2E navigateur** | `sprint-70-preview-visual.spec.ts`, chromium, clair + sombre | **9 passed (28,0 s)** |

**+21 tests** : 15 unitaires (`color.test.ts`) + 4 de câblage (`EventPreviewTimeline.test.tsx`)
+ 2 gardes (tokens / consommation CSS des variables).

**E2E réellement exécutée en local** (pas seulement durcie) : backend `backend-e2e` Docker
`:8085` (profil `e2e` vérifié — sonde `test-support` = 404, `/api/auth/me` = 401), frontend
`next dev :3100` avec `NEXT_PUBLIC_API_URL=/api` + `E2E_API_PROXY_TARGET=http://localhost:8085`,
`CI=1`, `PLAYWRIGHT_BASE_URL`, `SKIP_DELEGATION=1`. Serveur de dev arrêté après le run.

### Mesures au navigateur — les 12 cas (avant → après)

| Couleur | Thème | Connecteur | Contour fantôme |
|---|---|---|---|
| cobalt `#3B62D4` (défaut) | clair | 5,41 → **5,41 inchangé** | 4,83 → **4,83 inchangé** |
| cobalt | sombre | 3,38 → **3,38 inchangé** | 3,18 → **3,18 inchangé** |
| citron `#A7B83A` | clair | **2,20 → 3,06** (`#8d9b35`) | **2,07 → 3,06** (`#889634`) |
| citron | sombre | 8,32 → **8,32 inchangé** | 7,33 → **7,33 inchangé** |
| nuit `#101318` | clair | 18,61 → **18,61 inchangé** | 15,76 → **15,76 inchangé** |
| nuit | sombre | **1,02 → 3,08** (`#626468`) | **1,02 → 3,08** (`#626468`) |

Relevés par `getComputedStyle` + fond composité (`e2e/support/contrast.ts`), drawer 1280×700.
Les 6 valeurs « avant » reproduisent **exactement** celles de l'issue et du S70 — le modèle JS
et le rendu concordent. 8 cas sur 12 sont **strictement inchangés** : le plancher ne sur-corrige
pas.

### Preuve que la mesure sait dire NON

Plancher neutralisé (`contrastFloor` rendu no-op) → **2 failed / 7 passed**, aux valeurs exactes
de l'issue : `[light/citron] connecteur — 2.20:1 texte #a7b83a sur fond #ffffff` et
`[dark/nuit] connecteur — 1.02:1 texte #101318 sur fond #131519`. Mutation retirée, run final
re-vérifié vert (9/9) et absence de tout marqueur temporaire contrôlée par `grep`.

### Ce qui N'A PAS été vérifié — déclaré, non masqué

- **Bottom sheet mobile `< 1024 px`** : non mesurée. La spec ne rend que le drawer desktop
  (`.mt-drawer--form`). Le plancher s'y applique par construction (mêmes classes), mais aucune
  mesure ne l'atteste.
- **Les 9 autres couleurs de la palette curatée** : seules cobalt / citron / nuit sont mesurées
  (l'échantillon de risque du S70). Les tests unitaires couvrent le modèle, pas leur rendu.
- **Autres locales que `fr`**, unités de récurrence SEMAINE/AN, survol tactile : inchangé.
- **Suite E2E complète** : seule `sprint-70-preview-visual.spec.ts` a été rejouée. Aucune autre
  spec ne cite `.mt-evt-connector` ni `--mt-evt-outline` (vérifié par `grep`), mais je n'ai pas
  fait tourner les ~232 tests de la suite — le working tree est partagé et le runbook interdit
  deux runs Playwright simultanés.
- **La CI** n'a pas été observée (pas de `git push`, conformément au briefing).

## Signaux mémoire

- `[MEMORY:decision]` — **Doctrine couleur DS, traits fonctionnels peints dans une couleur
  utilisateur** : plancher par mélange **progressif vers l'encre du thème**, jamais par repli
  sur un token neutre. Motif : le repli neutre efface l'identité colorée de toutes les couleurs
  sous le seuil, y compris celles qui n'en sont qu'à un cheveu. Portée volontairement limitée
  aux **traits** ; les **aplats** gardent la couleur brute (leur encre est déjà calculée).
  Croise #352 : le classement « tier fonctionnel » du pointillé est **confirmé**, et c'est
  précisément ce qui oblige à le plancher.
- `[MEMORY:pattern]` — **Theme-aware sans lecture JS du thème** : calculer les deux valeurs et
  les poser en propriétés personnalisées (`--x` / `--x-dark`), laisser `.dark` /
  `[data-theme="dark"]` trancher en CSS. Anti-pattern évité : `useTheme()` (rend la passe SSR
  sans correctif + dépend d'un effet), et `borderColor` **inline**, qu'aucun sélecteur de thème
  ne peut commuter.
- `[MEMORY:pitfall]` — **Un plancher de contraste ne se cherche pas par dichotomie.** Le long
  du chemin couleur→encre, la luminance peut TRAVERSER celle du fond (couleur quasi noire en
  thème sombre) : le ratio descend à 1,00:1 avant de remonter. Prédicat non monotone →
  balayage linéaire, et vérification du ratio sur le hex **arrondi** effectivement rendu.
- `[MEMORY:pitfall]` — **Normaliser la casse d'un hex sur le chemin « déjà conforme »** fait
  passer une identité pour une modification (style inline recalculé à chaque frappe, `toBe`
  faussement rouge, diff bruyant). Court-circuiter avant toute normalisation.
- `[MEMORY:bug]` — **BUG-S70-002 toujours actif au S71** : `prettier --check` sous RTK affiche
  « All files formatted correctly » avec **exit 1**. Lire le code de sortie, pas le texte.

## Recommandations suite

- `RECOMMAND_FOLLOWUP` — étendre la mesure E2E à la **bottom sheet mobile (`< 1024 px`)** :
  le plancher s'y applique par construction mais aucune mesure ne l'atteste, et le S70 avait
  déjà laissé cette surface hors périmètre.
- `RECOMMAND_FOLLOWUP` — les **9 autres couleurs de la palette curatée** ne sont mesurées dans
  aucune spec ; l'échantillon de risque (cobalt/citron/nuit) suffit à la doctrine mais pas à
  garantir les 12.
- Pas de `RECOMMAND_DB_EXPERT` : aucun fichier backend, aucun schéma, aucune migration Flyway (prochaine reste V16).
- Pas de `RECOMMAND_SECURITY` : aucune surface d'auth, aucune PII, aucun appel réseau nouveau, aucun stockage.
- Pas de `RECOMMAND_TEST_RUNNER` : les 3 suites ont été lancées inline par l'agent (unitaires 18,7 s, E2E 28 s), codes de sortie lus.
- Pas de `RECOMMAND_UI_DESIGN` : aucune nouvelle surface visuelle, la doctrine était arbitrée dans le plan d'implémentation.

STATUS: COMPLETED
