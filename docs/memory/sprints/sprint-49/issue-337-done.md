# Issue #337 — Contrôle de contraste automatisé sur les CTA (E2E)

**Sprint :** 49 · **Vague :** 3 · **Agent :** `fullstack-dev` (opus) · **Date :** 2026-07-28
**Commit :** `4fa7ba6`

## Livré

- `frontend/e2e/support/contrast.ts` — luminance WCAG 2.x sRGB, **fond composité** (ancêtres +
  pseudo-éléments couvrants), normalisation par **canvas 1×1** (le DS utilise `color-mix()`, qu'une regex
  ne sait pas lire).
- `frontend/e2e/landing-cta-contrast.spec.ts` — **12 tests** : 5 CTA × clair/sombre × 1280/375, au repos
  et au survol, + troncature + révélation + auto-contrôle.
- `frontend/e2e/README.md` — méthode documentée.

`tsc` strict OK, prettier OK, eslint OK, **3 runs consécutifs stables**.

## Critères d'acceptation — 4/4

| # | Critère | État |
|---|---|---|
| 1 | Contraste calculé des CTA vérifié | **OK** |
| 2 | Troncature détectée (`scrollWidth` vs `clientWidth`) | **OK** |
| 3 | Le test échoue si un CTA repasse sous le seuil | **OK — démontré par mutation** |
| 4 | Intégré à la suite E2E et documenté | **OK** — ramassé par `testDir: './e2e'` → `npm run test:e2e` → job CI `e2e`, **sans réglage** |

### Test de mutation — la preuve du critère 3

- **(a)** Seuil `CTA_MIN_RATIO` 4,5 → 20 : **4 tests « contraste au repos » rouges** avec les valeurs
  réelles (16,70 < 20). Reverté.
- **(b)** **Auto-contrôle permanent inscrit dans la spec** : `addStyleTag` avec fond = `currentColor`
  → 1,00:1, `expectReadable` lève bien ; puis `nowrap` + `min-width:0` + `width:120px` →
  `scrollWidth > clientWidth` détecté.

Deux pièges neutralisés dans l'injection : `transition-all` **interpole** (couleur intermédiaire mesurée
à `rgb(91,156,236)`) et `min-w-min` écrase `width` → toute injection porte `transition:none` +
`min-width:0`.

## 🔴 VERDICT « landing invisible » : INFIRMÉ

Sous Playwright (contexte de rendu réel, onglet visible) :
- le **héros est révélé au chargement sans défilement**, `opacity` effective = **1**, clair et sombre ;
- les **6 autres sections** sont à `opacity: 0` au chargement — elles sont **sous la ligne de
  flottaison**, c'est le comportement prévu — et **atteignent toutes 1 après défilement**.

⇒ Le signalement P1 de l'agent #335 venait bien de l'artefact **`document.hidden`**, comme le lead
l'avait soupçonné en analysant le code (`className` littéraux statiques → React ne réécrit pas l'attribut).
**Aucune correction n'était nécessaire, et aucune n'a été faite** sur `useSectionAnimation.ts`.

## Ratios mesurés (identiques à 1280 et 375 px ; seuil appliqué = max(WCAG, 4,5))

| CTA | Repos clair | Repos sombre | Survol clair | Survol sombre |
|---|---|---|---|---|
| header / inscription | 4,71 | 6,94 | 6,08 | 8,78 |
| header / connexion | 4,59 | 6,94 | 4,71 | 6,94 |
| héros / primaire | 4,71 | 6,94 | 6,67 | 9,29 |
| héros / **secondaire** | 17,32 | 16,70 | **1,00** 🔴 | **1,07** 🔴 |
| bandeau final | 17,76 | 16,70 | 21,00 | 19,57 |

### ⚠ Erreur du briefing du lead, corrigée par l'agent

Le briefing affirmait que les CTA du héros sont « en 18 px non gras → seuil 4,5, pas 3 ».
**Ils font 27 px** (`--text-lg` du DS) → seuil WCAG applicable = **3**. Et le « 4,71 » cité par le lead
était un **ratio de contraste**, pas une taille. L'agent a appliqué un **plancher projet de 4,5** malgré
tout — plus strict, donc sans conséquence sur les résultats.

## Suite E2E — la stack fonctionne, contrairement à ce qu'ont conclu 2 agents

- **Baseline AVANT la spec : VERTE — 68 passed / 0 failed / 113 s.** Stack montée via le runbook S47,
  **aucun blocage**.
- **Après : 80 passed / 0 failed / 1 skipped** (`settings-profile.spec.ts:36` = `test.fixme`
  pré-existant) **+ 2 « expected failure »** (le défaut ci-dessous) / 1,6 min.
- **`timeline.spec.ts` VERTE** → le risque signalé par #69 (virtualisation verticale masquant une lane
  au-delà de 60 produits) **ne se déclenche pas** sur le jeu de test actuel.

⇒ Les conclusions « E2E non exécutables, backend down » de #69 et #334 étaient **fausses**. Le lead avait
vérifié que Docker répondait et que les images étaient en cache ; c'est confirmé à l'exécution.

## 🔴 Défaut P1 trouvé par le harnais dès son premier run

`Button variant="outline"` (`frontend/src/components/ui/button.tsx`) impose
`hover:text-accent-foreground`, que `text-ink` **ne neutralise pas** : `tailwind-merge` ne fusionne pas
`text-*` avec `hover:text-*` (clés différentes). Le CTA secondaire du héros **disparaît au survol** —
**1,00:1 en clair, 1,07:1 en sombre**.

**Mécanisme re-vérifié ligne par ligne par le lead :** `HeroSection.tsx:75` pose `hover:bg-surface` +
`text-ink` ; `tailwind-merge` fusionne bien `hover:bg-accent` ← `hover:bg-surface`, mais laisse survivre
`hover:text-accent-foreground`, qui vaut `--color-accent-ink` (`globals.css:101`) → blanc sur `surface`
blanc.

**Pré-existant** : `button.tsx` est inchangé depuis la migration Tailwind v4 — dette du Sprint 48 rendue
visible par le nouveau harnais. C'est **exactement la famille de bugs** que cette issue devait attraper.

Documenté par **2 tests `test.fail()`** qui rougiront à la correction.
→ **Décision dev : corriger dans le sprint.** Traité par un agent dédié (voir `issue-button-hover-done.md`).

## Signaux mémoire

- **[MEMORY:pitfall]** `expect.poll(...).toBeGreaterThanOrEqual(seuil)` sur un état **animé** s'arrête sur
  l'état de **départ** encore conforme → le défaut de survol passait vert **1 run sur 2**. Attendre la
  **stabilité** (2 lectures identiques), puis juger.
- **[MEMORY:pitfall]** Le curseur reste où Playwright l'a laissé : après `scrollIntoViewIfNeeded`, un
  bouton peut passer **sous la souris** et être mesuré en `:hover` (à 375 px : 1,00:1 au lieu de 17,32:1).
  `page.mouse.move(0, 0)` avant toute mesure de repos.
- **[MEMORY:pitfall]** `toBeVisible()` de Playwright **passe sur un élément à `opacity: 0`** — inutilisable
  comme garde avant une mesure de contraste.
- **[MEMORY:pattern]** Contraste rendu-réel : normaliser les couleurs par **canvas 1×1**
  (`fillStyle` + `getImageData`) au lieu d'une regex, et **compositer** ancêtres + `::before`/`::after`
  couvrants. **Anti-pattern** : parser `rgb()` à la regex (échoue sur `color-mix()` / `oklch()`) et
  ignorer les voiles.

## Recommandations suite

**`RECOMMAND_FOLLOWUP`**
1. **P1 / XS-S** — le défaut `Button variant="outline"` ci-dessus. *(→ pris en charge dans le sprint.)*
2. **XS** — **aucun `data-testid` sur les 5 CTA de la landing** ; l'ancrage actuel repose sur `href` +
   structure, plus fragile.
3. **XS** — `frontend/.eslintcache` est un **fichier tracké** qui apparaît supprimé dans l'arbre partagé.
   À gitignorer. *(Restauré par le lead ; l'arbre est propre.)*

**ABSORBED :** aucune.

**Note d'exploitation :** un backend `:8080` et un `next dev :3100` ont été laissés en tâche de fond —
à arrêter en fin de sprint.

STATUS: COMPLETED
