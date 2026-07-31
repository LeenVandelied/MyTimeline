# Issue #383 — `:focus-visible` hors `@layer` — rapport d'exécution

> Branche `claude/sprint-58-start-26b185`, base `3970fe3` (arbitrage V0).
> Arbitrage appliqué sans dérogation : `design-arbitrage-383-352.md`.

## Commits (5, ordre imposé respecté)

| SHA | Étape | Contenu |
|---|---|---|
| `54b3f8f` | 1 | Retrait de `border-radius` de `base.css` — règle **restée hors layer** |
| `7be259c` | 2 | 29 sites : cat. A(14) + B(4) + C(4) + D(5) + HC1 + HC4 |
| `b8820f1` | 2bis | HC2 + HC3 — **correction du défaut sombre** (bande blanche), isolée |
| `b4b62ce` | 3 | Layerisation dans `@layer base` |
| `536e0db` | 4 | Documentation in-situ + chiffres périmés + assertion E2E |

## Sites traités : 32/32

A 14 · B 4 · C 4 · D 5 · **E 1 (conservé, seule exception)** · HC 4.
Comptage revérifié sur ce HEAD : 37 occurrences, 5 hors code → **32 sites, 24 fichiers**.
Confirme l'arbitrage, infirme l'énoncé de l'issue (« ~14 »).

## Rendu vérifié (Playwright, moteurs réels)

Chromium 141.0.7390.37 · Firefox 145.0 · WebKit 26.2 — **clair ET sombre**.
Écrans **derrière authentification atteints** (compte réel, cookie JWT, backend docker :8080
via rewrite même-origine) : dashboard, réglages, produits, timeline. Plus landing et login.

- **356 arrêts clavier comparés avant/après layerisation → 0 différence.**
- 0 arrêt sans contour, tous moteurs × thèmes × écrans.
- Contour mesuré `solid 2px rgb(14,95,196) 2px` clair / `solid 2px rgb(77,155,255) 2px` sombre.
- 0 élément à `border-radius: 3px` (étape 1 confirmée au rendu).
- Modalité **souris** : `fv=false`, `outline-style: none` partout (anti-régression cat. B).
- Cat. D (items de menu, sélecteur de langue) : contour présent, `fv=true`, Chromium + Firefox.
- Cat. E (popover) : `outline-style: none` — **seul changement de rendu**, voulu.
- **Lecture de pixel** sur le CTA accent de la landing : trait 2px + offset 2px transparent,
  ratio **5,93:1 clair / 6,94:1 sombre** contre le fond réel — conforme `a11y-audit.md` §7.

## Écarts / surprises (mesurés, pas supposés)

1. **Faux positif de ma propre heuristique.** Un premier calcul de contraste par remontée
   d'ancêtres donnait 1,00:1 sur le CTA accent. **La lecture de pixel l'a infirmé** (5,93/6,94:1) :
   l'ancêtre opaque trouvé n'est pas ce qui est peint sous le trait, posé 2px HORS de la boîte.
   Leçon : sur `outline-offset`, seule la lecture de pixel tranche.
2. **Rognage réel, PRÉ-EXISTANT (prouvé).** `.mt-zoom` (`timeline-zoom-in/out`) et la tablist des
   réglages rognent le contour : 1 à 2 côtés peints sur 4. **Mesuré à l'identique sur le code
   pré-#383** (fichiers restaurés temporairement depuis `3970fe3`) → non causé par #383.
   L'anneau `ring-*` d'avant était rogné exactement pareil (c'est un `box-shadow`).
   → suivi recommandé : `outline-offset: -2px` (motif DS déjà employé, `timeline.css:115`/`:131`).
3. **Firefox : options de `Select` sans `:focus-visible`.** `fv=false` même en ouverture 100 %
   clavier → aucun contour ; seul signal = `accent-soft` (1,23:1 clair / 1,19:1 sombre).
   **Mesuré à l'identique sur le code pré-#383** → pré-existant, non causé par #383.
   `:focus-visible` est un état décidé par le moteur, insensible à la feuille de style.
   Les items de `dropdown-menu` (sélecteur de langue), eux, sont corrects sur les deux moteurs.
4. **WebKit** : Tab ne s'arrête que sur les contrôles de formulaire (0 arrêt sur la landing,
   qui n'a que des liens). Comportement moteur, pas un défaut du correctif. Safari natif non testé.
5. **Artefact de mesure** : `transition-colors` de Tailwind v4 inclut `outline-color`. Une sonde
   à 60 ms lit une couleur INTERPOLÉE. Porté à 400 ms → valeurs stables.
6. **2 commentaires périmés par mes retraits**, corrigés : `CompactRail.tsx:14`,
   `select.stories.tsx:6` (hors liste stricte du briefing — signalé).
7. **3 erreurs `tsc` pré-existantes** dans `.next/types` (route `settings` déplacée sous
   `(app)/`), sans rapport avec #383.

## Non vérifié — à ne pas croire couvert

- **Safari natif** (seul WebKit headless testé) — le point 4 de la liste ci-dessus en dépend.
- **`forced-colors: active`** (contraste forcé Windows) : rien rendu dans ce mode. La note
  d'écriture `outline-hidden` ≠ `outline-none` a été respectée mais **non vérifiée au rendu**.
- **Réglages mobile** (`mobile/*.tsx`, cat. A ×3) : non ouverts en viewport mobile ; couverts
  seulement par les tests unitaires et le balayage desktop.
- **`CompactRail`** (dashboard mobile PAYSAGE) : non rendu dans cette orientation.
- **`CategoryDrawer` (HC1)** : le drawer de catégorie n'a pas été ouvert au navigateur — la
  pastille et sa branche `selected` ne sont vérifiées que par lecture de code et tests unitaires.
- **`EventEditForm` (cat. B)** : formulaire d'événement non ouvert au navigateur.
- **`AvatarUpload`, `BottomSheet`, `ExportDataFlow`** : non exercés interactivement.
- Contraste des **7 migrations `timeline.css`** : hors périmètre (#352).

## Tests

- Unitaires frontend : **875/875** (93 fichiers), 3 exécutions (après étapes 2, 3, 4).
- E2E `landing-mobile-menu.spec.ts` : **26/26** chromium, dont l'assertion de contour
  **ajoutée** sur l'item de menu focalisé — verte dans les DEUX thèmes.
- `base-layer.test.ts`, `control-border-tier.test.ts`, `HeaderSection.test.tsx` : verts
  (prédiction de `ui-design` confirmée). Ils ne prouvent RIEN sur ce correctif — jsdom ne
  résout ni `@layer` ni la peinture. Exécutés comme garde-fous, pas comme preuve.

## Note pour la Vague 2

- `ui/checkbox.tsx` — `border-primary` **laissé intact** pour #352. `className` nettoyé de
  `focus-visible:outline-hidden focus-visible:ring-1 focus-visible:ring-ring`.
- `ui/language-selector.tsx` — **commentaire seul** modifié, aucune classe touchée (#353).

STATUS: COMPLETED
