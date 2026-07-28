## Objectif

Virtualiser la frise pour les gros volumes d'événements (**#69**) **et** solder la dette design laissée par le Sprint 48 (**#334**, **#335**, **#336**, **#337**).

> **Périmètre élargi en cours de route.** Le plan du 16/07 prévoyait un sprint mono-issue (#69 seul). Le triage de clôture du S48 avait versé 4 issues `epic:design` au milestone Sprint 49, dont **#334 et #335 remplissent les 2 critères d'acceptation de #56 restés non remplis** : sans elles, la landing du S48 n'était pas réellement livrée. Décision dev au démarrage : les prendre. Cohésion volontairement sacrifiée (2 domaines) au profit du solde de dette.

## Issues traitées

| Issue | Sujet | État |
|---|---|---|
| **#69** | Virtualisation de la frise (> 1000 événements) | Livrée, 2 réserves perf/a11y |
| **#334** | Header de la landing non responsive | Livrée — **critère n°8 de #56 enfin fermé** |
| **#335** | `landing.css` hors palette + règles dupliquées | Livrée, 5/5 critères |
| **#336** | Dette WCAG AA sur les bordures de contrôle | Livrée, 1 réserve de validation |
| **#337** | Contrôle de contraste automatisé sur les CTA (E2E) | Livrée, 4/4 critères |

**Zéro fichier backend, zéro migration Flyway** (vérifié). Sprint intégralement frontend.

## Ce que la CI ne pouvait pas voir — 5 défauts trouvés en rendu réel

Le Sprint 48 avait livré des défauts visibles par l'utilisateur avec une **CI entièrement verte** : `jsdom` ne résout ni la précédence des `@layer` CSS ni aucune mise en page. Ce sprint en a trouvé cinq de plus, tous par mesure en navigateur :

1. **4 CTA invisibles au survol** — 1,00 / 1,03 / 1,07 / 3,83:1. Héros de la landing, `/fr/privacy`, `/fr/terms`, et les ancres du menu burger. Cause commune : la paire `hover:bg-*` + `hover:text-*` est **cassable par construction** — `tailwind-merge` ne fusionne pas deux propriétés distinctes, donc un consommateur qui surcharge le fond conserve l'encre et obtient du texte de la couleur du fond.
2. **`landing.css` n'était pas layerisé** : ses littéraux **battaient** les classes `border-rule` posées au S48 → **la migration DS du sprint précédent n'avait jamais pris effet** sur ces cartes.
3. **`@keyframes pulse` non préfixé** écrasait `animate-pulse` de Tailwind **pour toute l'application** (squelettes de chargement).
4. **L'échelle typo du DS écrase celle de Tailwind** : `--text-3xl` vaut **57 px** et `--text-4xl` n'existe pas, donc `md:text-4xl` **rétrécissait** les titres au desktop, et `h1` (36 px) était plus petit que `h2` (57 px) en mobile — hiérarchie inversée.
5. **Le harnais de contraste lui-même se trompait du côté permissif** (un `fillStyle` invalide compositait un noir opaque en silence ; `effectiveOpacity` n'était jamais appliqué).

## Changements clés

**Frise (#69)** — virtualisation **maison sur 2 axes**, `package.json` **inchangé** : ni `@tanstack/react-virtual` ni `react-window` ne conviennent (leur modèle `index → estimateSize` ne s'applique pas à des intervalles absolus chevauchants). Décision et mesures dans **`docs/adr/ADR-007-virtualisation-timeline.md`**.

À 1000 événements : commit **145,9 → 52,0 ms**, peint **301,7 → 81,5 ms**, pastilles montées **1000 → 51**, nœuds DOM **3889 → 584**, scroll horizontal p95 **108,3 → ~17 ms**. Hauteur de page identique avant/après (5995 px) — virtualisation géométriquement transparente.

**Landing (#334, #335)** — `landing.css` et `animations.css` entièrement sur tokens DS, 4 règles dédoublonnées ; header responsive avec menu burger off-canvas (focus-trap, Escape, overlay, 4 locales) ; échelle typographique réalignée sur le DS. **Aucun scroll horizontal** à 320 / 375 / 390 px en `fr`, `de` et `es`.

**Accessibilité (#336)** — bordures de contrôle migrées vers `--color-rule-emphasis`, y compris via le pont shadcn `--color-input`. Arbitrage **fonctionnel / décoratif documenté in-situ** dans `core.css` (7 migrées, 7 laissées volontairement). Bouton outline : **1,46 → 3,97:1**.

**Harnais (#337)** — helper de contraste (luminance WCAG 2.x, fond composité, normalisation canvas pour `color-mix()`) + 22 tests E2E. **Deux tests validés par mutation** : ils rougissent bien quand on régresse.

## Tests

| Suite | Avant | Après |
|---|---|---|
| Frontend unitaire | 677 | **688 passed / 0 failed** |
| E2E Playwright | 68 | **92 passed / 0 failed / 1 skipped** (skip pré-existant) |
| Backend | — | **non exécutée : zéro fichier backend dans le diff** |

`tsc --noEmit` OK · eslint OK · prettier OK. **+24 tests E2E, zéro régression.**

**5 garde-fous AST créés** : palette de la landing, tier des bordures de contrôle, appariement de survol (`button` et `landing`), cascade `@layer`. Trois d'entre eux ont leur **détecteur testé**.

Audit complet : `docs/memory/audits/sprint-49-test-coverage.md`.

## Review

Review batch : **1 critique, 3 majeurs, 7 mineurs, 8 points `[OK]`** — verdict initial `BLOQUANT`.

Le critique était que **le sprint réintroduisait le défaut qu'il corrigeait** (`LandingMobileMenu.tsx`, 3,83:1 mesuré en clair). Corrigé, avec extension du garde-fou AST à `components/landing/`. Les 3 majeurs (menu burger sans couverture E2E, CTA « Connexion » mesuré par aucun test, harnais permissif) sont fermés. Détail : `docs/memory/sprints/sprint-49/review-batch.md`.

## Réserves assumées — à trancher au triage de clôture

1. **#69, critère 3 partiel** : aucun freeze (frame max 33,4 ms contre 133,4), mais 60 fps pas tenus en continu sur fling à 7200 px/s (7–10 frames sur 89 > 16,7 ms).
2. **#69, budget redéfini** : l'issue demandait « < 16 ms par frame » ; retenu ≤100 ms commit / ≤150 ms peint, au motif que 16 ms est un budget de frame et non de montage. **Écart aux termes écrits.**
3. **#69, a11y** : `aria-rowcount`/`aria-rowindex` demandés par l'issue, remplacés par `role="list"` + `aria-setsize` (les premiers exigent un rôle `grid` incompatible avec le pattern de #81). Justifié en ADR-007. **Écart aux termes écrits.**
4. **#336** : `EventEditForm` non ouvert en navigateur (session requise → backend). Contraste **prouvé** par mesure du couple utilitaire/fond identique ; mise en page du formulaire non validée.
5. **Dégradation acceptée** : icône corbeille des catégories 4,76 → **3,87:1** en clair. Reste ≥ 3:1 (WCAG 1.4.11, non-texte) mais sous 4,5. Coût direct du découplage de survol.
6. **Débordement à 768 px** (+90 à +108 px selon la locale) — groupe droit du header au palier `md`. **Pré-existant**, vérifié inchangé par ce sprint, hors périmètre de #334.
7. **Lecteur d'écran réel non testé** (#69) : rôles et labels vérifiés au code et au DOM uniquement.
8. **V16 toujours non consommée — 12e sprint sans migration.** Le chemin Flyway n'a pas tourné à froid depuis le S39 ; un smoke `flyway migrate` sur base vierge reste à faire.

## Follow-ups identifiés (à créer au triage)

`ui/dropdown-menu.tsx` (4) + `ui/select.tsx` (1) : **même couplage sous `focus:`**, confirmé au grep · `TimelineView.tsx` cales sans `role="presentation"` · `useTimelineViewport.ts` listener `scroll` en capture sur `window` · `TimelineCalendar.tsx` (114 l., mort depuis le S42) à supprimer · mémoïsation des lanes · accroche du héros et numéros d'étape désormais plus gros que les `h2` · logo du header (57 px) plus gros que le `h1` (48 px) · `LanguageSelector` : cible 36 px < 44 px **et** chaîne française en dur · `.eslintcache` tracké à gitignorer · pas de `data-testid` sur les 5 CTA de la landing.

🤖 Generated with [Claude Code](https://claude.com/claude-code)
