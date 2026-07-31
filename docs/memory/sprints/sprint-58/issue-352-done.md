# #352 — Dette WCAG sur les bordures : `timeline.css` + checkbox du DS

Sprint 58, Vague 2. Branche `claude/sprint-58-start-26b185`.
Commits : `fe4d0ed` (timeline.css) · `f5182da` (checkbox + commentaires + readme).

## 1. `timeline.css` — 16 occurrences arbitrées

Classement de `ui-design` **confirmé sans correction** : 7 fonctionnelles / 9 décoratives.
Les 16 sélecteurs annoncés existaient bien, aux lignes annoncées (HEAD d'avant #383 ==
HEAD courant sur ce fichier : #383 ne l'a pas touché).

### Migrées vers `--color-rule-emphasis` (7)

`.mt-evt--draft` (fallback du pointillé) · `.mt-zoom` · `.mt-drawer__close` ·
`.mt-tlv__help-btn` · `.mt-sheet__grabber` · `.mt-sheet__close` · `.mt-tlm__minimap-toggle`

### Conservées en `rule-strong` + commentaire in-situ (9)

`.mt-tl-ruler__maj` · `.mt-minimap__bar` · `.mt-stamp` · `.mt-tlv__ruler` · `.mt-drawer` ·
`.mt-tlm__ruler` · `.mt-sheet` · `.mt-actionsheet` · `.mt-actionsheet__grabber`

Chacune porte sa raison. `.mt-actionsheet__grabber` porte en plus la raison de sa
DIVERGENCE d'avec `.mt-sheet__grabber` (span `aria-hidden` sans zone de drag).
Un bloc d'en-tête de fichier rappelle le critère de tri et le fait que chaque
`rule-strong` restant est un appel explicite.

## 2. Ratios MESURÉS au rendu

Méthode : Playwright/Chromium sur le vrai dashboard (backend `:8085`, front `:3100`),
`page.screenshot({clip})` d'une bande de 12 px traversant le filet, décodage
`createImageBitmap` + `getImageData`, pixel de bordure = celui qui s'écarte le plus du
fond extérieur. **Aucune remontée d'ancêtres** (`getComputedStyle(parent)`) — c'est
la méthode qui avait produit le faux 1.00:1 de #383. Attente de 700 ms après chaque
changement d'état (les couleurs de bordure entrent dans `transition-colors` en
Tailwind v4). Instrument supprimé après le run, non commité.

| Filet | Fond mesuré | Clair | Sombre |
|---|---|--:|--:|
| `.mt-zoom` (L63) | toolbar `surface-2` | **3.70:1** | **4.10:1** |
| `.mt-zoom` (L63) | `surface` intérieur | 4.07:1 | 4.49:1 |
| `.mt-tlv__help-btn` (L241) | toolbar `surface-2` | **3.19:1** | **3.56:1** |
| `.mt-tlm__minimap-toggle` NON pressé (L378) | toolbar `surface-2` | **3.70:1** | **4.10:1** |
| `.mt-tlm__minimap-toggle` pressé (L378) | toolbar `surface-2` | 5.53:1 | 5.92:1 |
| `.mt-drawer__close` (L212) | `surface` | 4.07:1 | 4.49:1 |
| `.mt-sheet__close` (L342) | `surface` | 4.07:1 | 4.49:1 |
| `.mt-sheet__grabber` (L333, aplat) | `surface` | 4.07:1 | 4.49:1 |
| `.mt-evt--draft` fallback (L43) | fond de lane | 3.11:1 | 3.43:1 |
| `.mt-evt--draft` fallback (L43) | son propre fond `color-mix` 8 % | **2.82:1** | 3.18:1 |

Les trois lignes que `ui-design` déclarait **non vérifiées** (63, 241, 378, toolbar
`surface-2`) sont mesurées et **passent les 3:1** dans les deux modes.

Repris de `a11y-audit.md` §6 sans re-mesure : rien. Toutes les valeurs ci-dessus sont
mesurées. Les valeurs versionnées (3.97 vs `bg`, 4.07 vs `surface` clair, 4.81 / 4.49
sombre) sont **confirmées** par la mesure là où elles se recoupent (4.07 / 4.49 sur
`surface`).

### Trois observations de mesure, à ne pas confondre avec des régressions

1. **`.mt-tlv__help-btn` lit 3.19:1, pas 3.70:1.** Le bouton est un cercle
   (`border-radius:50%`) : même au point de tangente verticale, l'antialiasing dilue
   le pixel de bordure (#858991 au lieu de #7A7E87). 3.19:1 est donc une lecture
   **conservatrice** ; la couleur déclarée vaut 3.70:1. Elle passe dans les deux
   lectures. C'est la marge la plus étroite du lot.
2. **`.mt-tlm__minimap-toggle` était `disabled` à ma première mesure** (viewport
   760×380 → `MINIMAP_HIDE_QUERY` `max-height:400px` → `minimapForcedHidden`).
   `opacity:.4` composait la bordure avec le fond et donnait 1.59:1 — artefact d'état,
   pas de tier. Re-mesuré à 760×520, bouton actif. Par ailleurs son état par DÉFAUT est
   `aria-pressed="true"`, qui écrase le tier par `border-color:var(--color-accent)` :
   la valeur `rule-emphasis` n'est visible qu'après bascule.
3. **`.mt-evt--draft` plafonne sous 3:1 contre son PROPRE fond en clair (2.82:1)** —
   `.mt-evt--draft` porte `opacity:.8`, qui compose le pointillé avec ce qu'il y a
   dessous. Contre le fond de lane il tient (3.11:1). La migration reste une
   amélioration nette (`rule-strong` à `opacity:.8` valait ~1.3:1), mais elle n'atteint
   pas franchement le seuil du côté intérieur. **Non corrigé : hors périmètre** —
   l'arbitrage prescrivait le changement de token, pas la levée de l'`opacity`.
   Voir follow-up. À noter que le seul consommateur en production est
   `EventPreviewTimeline`, qui l'accompagne toujours de `.mt-evt--preview`
   (`cursor:default`, non interactif) : le caractère « contrôle » y est discutable.

## 3. `landing.css` — 0 travail, CONFIRMÉ par lecture

Fichier **non modifié** (lecture seule respectée). Les 3 occurrences annoncées par
l'issue sont bien 1 commentaire + 2 déclarations, et l'arbitrage y est déjà écrit
in-situ par #335, avec la méthode du S49 :

- l. 44-48 : commentaire « Bordure DÉCORATIVE (cadre de carte…) · Ce n'est PAS
  `rule-emphasis` : la bordure n'est ici l'affordance d'aucun contrôle », avec renvoi
  au tableau des tiers du readme ;
- l. 57 `.feature-card:hover` → `rule-strong`, décoratif ;
- l. 104 : commentaire « même tier de bordure décorative que `.feature-card` » ;
- l. 113 `.testimonial-card:hover` → `rule-strong`, décoratif.

Le périmètre annoncé par l'issue laissait croire à du travail non fait. Il n'y en a pas.

## 4. Checkbox — option (a) appliquée

`ui/checkbox.tsx` : `border-primary` → `border-rule-emphasis`. Un seul mot du
`className`. Parti du `className` **post-#383** : aucun `ring-*` ni `outline-none`
réintroduit. `.mt-check__box` conservée.

`core.css` : commentaire remplacé par la vérité d'usage (spécimen DS vs contrôle
applicatif, et pourquoi la règle n'est pas supprimée).
`control-border-tier.test.ts` : **commentaire uniquement**, aucune assertion touchée.
Il reste vert sans modification de code — `core.css` est inchangé sur ce point.
`ds/readme.md` : ajout des ratios `rule-emphasis` sur `surface-2`, mesurés ici.

## 5. Rendu vérifié au navigateur

Captures réelles du dashboard authentifié, clair ET sombre, inspectées :
toolbar desktop (zoom + bouton `?`), frise desktop complète (règle, graduations,
lanes, en-têtes de groupe), drawer de détail (bouton fermer), bottom sheet mobile
portrait (poignée + fermer), toolbar mobile paysage (zoom + bascule minimap).
Aucune anomalie : les 9 décoratives rendent comme avant, les 7 migrées ont un contour
lisible dans les deux thèmes.

## 6. Ce que je n'ai PAS vérifié

- **Aucune comparaison pixel avant/après.** Je n'ai pas capturé la frise sur le commit
  de base pour la diffé contre l'état courant. « Aucune régression visuelle » repose
  donc sur (a) le diff CSS, qui ne touche aucune des 9 décoratives, et (b) l'inspection
  des captures. Ce n'est pas une preuve de non-régression au pixel.
- **Action sheet mobile jamais ouverte au rendu.** `.mt-actionsheet` et
  `.mt-actionsheet__grabber` sont conservées et commentées, mais je ne les ai pas vues
  s'afficher (elles s'ouvrent au long-press / bouton `⋯` d'une pastille mobile).
- **`.mt-evt--draft` mesuré sur une sonde INJECTÉE**, pas atteint par navigation :
  élément `.mt-evt.mt-evt--draft` sans `--mt-evt` ajouté dans une lane RÉELLE de la
  frise (CSS, cascade et fond de lane réels), parce que le fallback n'apparaît que
  pour un événement sans couleur dans l'aperçu de formulaire. Le cas nominal (couleur
  fournie) est inchangé par construction : la var l'emporte sur le fallback.
- **Un seul moteur.** Chromium uniquement. Ni Firefox, ni WebKit, ni Safari natif.
- **`forced-colors: active`** non testé.
- **Storybook** non ouvert.
- **Aucun E2E lancé au-delà de mon instrument de mesure** : la suite Playwright
  complète (`timeline.spec.ts`, `timeline-mobile.spec.ts`) n'a pas été rejouée. Aucun
  `data-testid` n'a été ajouté, renommé ni supprimé, donc aucune spec ne devrait être
  affectée — c'est une prédiction, pas une vérification.
- **Le rognage de contour dans `.mt-zoom`** (`overflow:hidden`) signalé par #383 :
  je n'ai pas re-testé le focus. Je n'ai touché que le filet de bordure.

## 7. Tests

- `./scripts/test-quiet.sh frontend` : **94 fichiers / 885 tests, 0 échec**, avant et
  après les modifications. `control-border-tier.test.ts` (9 tests) et
  `base-layer.test.ts` (13 tests) verts.
- `npx tsc --noEmit` : **0 erreur** dans les sources. Deux erreurs résiduelles dans
  `.next/types/app/[locale]/settings/page.ts` (artefacts générés par le serveur de dev
  Turbopack en cours d'exécution), sans rapport avec ce lot.

STATUS: COMPLETED
