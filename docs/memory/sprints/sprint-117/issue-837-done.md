# Issue #837 — Dernières cibles tactiles : tiroir mobile, `⋯` de la frise paysage, profil `BOX_ONLY`

## Résumé

Objectif : mesurer avant de corriger les 3 sujets de #837 (suite de #767/#768, Sprint 112).

Fichiers :
- `frontend/e2e/sprint-117-touch-targets.spec.ts` (NEUF) : 4 tests. Tiroir à 375×812 (`expectAllTouchable` sur tout le tiroir, profil complet, minimum 4 contrôles, + `expectHitbox` du déclencheur de langue) ; garde desktop (tiroir ouvert à 375 px puis viewport élargi à 1024 px : déconnexion = 36 px) ; `⋯` paysage 844×390 (`expectClickableBox`) sur un PONCTUEL et sur une DURÉE, chacun avec une lane en dessous. Listing produits stubbé, aucune écriture.
- `frontend/src/components/dashboard/MobileDrawer.tsx` : déconnexion + `TOUCH_TARGET_BUTTON` (`max-md:h-11`) via `cn`.
- `frontend/src/styles/ds/components/timeline.css` : `.mt-tlm--landscape .mt-tlm__evt-more{z-index:1;}` (nouveau, à côté de la règle `--pin` existante, inchangée).
- `frontend/e2e/sprint-99-touch-targets.spec.ts` : `BOX_ONLY` retiré, profil complet ; sonde `measureControls(root)`.
- `frontend/e2e/support/touch-targets.ts` : export `BOX_ONLY` supprimé (0 appelant), en-tête réécrit (un seul profil, options gardées).

Mesures (logs dans le scratchpad de session) :
1. Tiroir 375 px. AVANT : `close` 44,0×44,0 · langue 44,0×44,0 via `::before` · thème 285,8×44,0 · **déconnexion 285,8×36,0** → rouge. APRÈS : déconnexion **285,8×44,0**, les 4 contrôles ≥ 44. Langue : hôte 36×36, `::before` 44×44, 4 coins cliquables. Desktop 1024 px : 36 px AVANT et APRÈS (le `max-md:` reste inerte au-dessus de 768 px).
2. `⋯` paysage (lane mesurée = 34 px). AVANT : ponctuel 44×44, 0 point manqué sur 8 (son wrap `--pin` est déjà en `z-index:1` depuis #594) ; **durée 44×44, 3 points manqués** (`bas`, `bas-gauche`, `bas-droite` → `DIV.mt-tlm__lane#timeline-resource-row`, la lane suivante). Cible réelle ≈ 39 px, valeur DÉDUITE (5 px de débordement bas recouverts), pas mesurée pixel par pixel. APRÈS : 0 point manqué sur les deux.
   - 1re correction (`z-index:1` sur TOUS les `.mt-tlm__evt-wrap` paysage) : `sprint-117` vert, mais **`sprint-91-event-pin` paysage/Jour rouge** (`markBottom: null`). Le wrap de la barre voisine, à la même date, couvre toute sa lane. Peint après la lane du dessus, il captait le débordement bas du pin. Corrigé en posant le z-index sur le BOUTON `⋯` (item flex : z-index actif sans `position`), pas sur le wrap.
   - La lane n'est pas agrandie. `TOUCH_TARGET_HITBOX` n'est pas employé : la boîte fait déjà 44 px, le défaut est un recouvrement, et ses `max-md:` ne s'appliquent pas en paysage 844 px (≥ 768).
3. `BOX_ONLY` : profil boîte seule (base, 1 run) → 14 passed, 17 lignes `[#738]`/`[#763]`. Profil complet, 3 runs → 14/14/14 passed, 17 lignes, `/usr/bin/diff` des lignes triées = **identique** (rc 0) 3 fois sur 3, 0 ligne `(::before)`. **Décision : retrait** (cf. `[MEMORY:decision]`).

Tests :
- `sprint-117-touch-targets` + `sprint-91-event-pin` après la correction finale, 3 runs : **12/12/12 passed** (5 tests de setup compris).
- Régression : 19 specs (toutes celles qui citent `MobileDrawer|mobile-drawer|evt-more|evt-wrap|timeline-mobile-landscape|support/touch-targets|timeline-event-more`, plus les specs paysage de frise `sprint-97-lane-stacking`, `sprint-91-recurrence-marks`, `sprint-98-label-collision`, `sprint-98-mobile-zoom-anchor`, `sprint-101-fab-landscape`, `sprint-105-lane-zebra`).
  - 1er passage, avec la 1re correction : 115 passed, 1 failed (`sprint-91-event-pin` paysage, voir ci-dessus).
  - Après la correction finale : **116 passed, 0 failed** (5,5 min).
- `npx tsc --noEmit` : 0 erreur (une erreur TS2559 venue du retrait de `BOX_ONLY` dans la sonde de sprint-99 a été corrigée). `next lint --file` sur les 4 fichiers TS : 0 avertissement. `prettier --check` sur les 5 fichiers : OK.
- Vitest : `src/components/dashboard` + `AppShell` + les tests de frise qui lisent `timeline.css` + `src/__tests__` : **509 passed, 0 failed**.

Non vérifié :
- iOS Safari réel ;
- deux `⋯` à la même date dans deux lanes paysage adjacentes (chevauchement géométrique de 10 px, inévitable) ;
- la barre de durée paysage elle-même (voir les suites).

Incident de pile : le 1er run (2 min après le démarrage de `next dev`) a échoué au setup, `register` sans réponse (statuts `[]`). Les oracles étaient bons (200/401) et un `curl POST /api/auth/register` a rendu 400. Le 2e run est passé sans rien changer. Cause non établie (compilation à froid probable, non prouvée).

## Commits

- `:white_check_mark: test(e2e): cibles tactiles du tiroir mobile et du ⋯ paysage mesurées, BOX_ONLY retiré (#837)`. Commit unique sur `sprint/117`, il contient ce fichier. Le SHA est rapporté au lead dans le retour, vérifié par `git branch --contains` : un fichier ne peut pas contenir le SHA du commit qui le porte.

## Fichiers de contexte lus

- `docs/memory/sprints/sprint-117/briefing-837.md` — en entier.
- `.ai-env/context-packs/pit-frontend.md` — par grep : PIT-S91-003 (l.1444, débordement recouvert par la lane suivante, parade z-index), PIT-S91-006 (`elementFromPoint` ignore `pointer-events:none`), PIT-S101-008, PIT-S41-001. Aucune entrée `BOX_ONLY`.
- `.ai-env/context-packs/br-events.md` — grep frise/paysage : aucune règle métier sur la taille des cibles. Seul ancrage trouvé : l.144, débounce 150 ms de l'aperçu (hors sujet).
- `docs/memory/decisions.md` — DEC-S112-002 (l.1207).
- `docs/memory/sprints/sprint-112/issue-768-done.md` — l.16 « 14 passed, 17 lignes », l.48 RECOMMAND_FOLLOWUP.
- `docs/memory/sprints/sprint-112/issue-767-830-done.md` — l.18 `⋯` portrait 44×44, l.22 coins rentrés du rayon, l.74-75 suites.
- `docs/memory/sprints/sprint-105/issue-597-done.md` — NON LU (origine de #804/#805, hors périmètre #837).
- Code : `MobileDrawer.tsx`, `lib/touchTarget.ts`, `ui/button.tsx` (cva l.49), `e2e/support/touch-targets.ts`, `sprint-99/112-touch-targets.spec.ts`, `sprint-91-event-pin.spec.ts`, `sprint-111-theme-toggle-unified.spec.ts` (l.172-190), `sprint-101-fab-landscape.spec.ts` (en-tête), `TimelineMobileLandscape.tsx` (l.330-425), `timeline.css` (l.788-880, 937-975), `support/products.ts` (`seedProduct`), `support/timeline-lanes.ts` (en-tête).

## Signaux mémoire

- [MEMORY:decision] Contexte : #837, DEC-S112-002 laissait `sprint-99` en `BOX_ONLY`. Décision : profil complet partout ; `BOX_ONLY` retiré de la spec ET du helper (0 appelant restant), les 3 options `MeasureOptions` sont gardées. Pourquoi : mesuré neutre 3 runs sur 3 (17 lignes identiques au diff, 14 passed), aucun réglage n'a de `::before`, d'`aria-hidden` ou d'`opacity:0`. Un 2e profil n'aurait servi qu'à faire rougir à tort un futur réglage à `TOUCH_TARGET_HITBOX`, dont la zone se prouve par `expectHitbox` comme dans `sprint-101`. Remplace DEC-S112-002.
- [MEMORY:pitfall] Contexte : #837, `⋯` (44 px) d'une durée dans une lane paysage de 34 px, recouvert en bas par la lane suivante. Un `z-index:1` posé sur le wrap `.mt-tlm__evt-wrap` corrigeait le `⋯`, mais le wrap couvre toute la hauteur de sa lane : peint après la lane du dessus, il captait le débordement bas du pin voisin à la même date (`sprint-91-event-pin` paysage/Jour rouge). Solution : z-index sur la cible elle-même (le bouton est un item flex, z-index actif sans `position`). Prévention : pour remonter une cible qui déborde, élever la CIBLE, pas son conteneur ; rejouer les specs des cibles VOISINES (pin/barre à la même date).
- [MEMORY:pattern] Problème : prouver qu'une classe `max-md:` ne change rien en desktop pour un composant qui n'est ouvrable que sous 768 px (tiroir derrière un hamburger `md:hidden`). Solution : ouvrir à 375 px, puis `page.setViewportSize` à 1024 px et mesurer la même instance (36 px), alors qu'elle mesure 44 px à 375 px. Anti-pattern : déclarer le desktop « inchangé par construction » sans mesure.

## Recommandations suite

- Pas de RECOMMAND_DB_EXPERT : aucun schéma ni requête touchés.
- Pas de RECOMMAND_SECURITY : CSS, classe utilitaire et specs E2E uniquement, aucune donnée ni auth.
- Pas de RECOMMAND_UI_DESIGN : rendu visuel inchangé (+8 px de hauteur du bouton de déconnexion sous 768 px, déjà le gabarit des pieds de drawers ; z-index sans effet visible).
- Pas de RECOMMAND_TEST_RUNNER : specs jouées ici (sprint-117 et sprint-91-event-pin ×3, sprint-99 ×3 + base, régression 19 specs 116 passed).
- RECOMMAND_FOLLOWUP: mesurer la BARRE de durée en frise paysage (24 px peints). Son `::before` −10 px (`timeline.css`, `.mt-tlm--landscape .mt-tlm__evt::before`) serait rogné par l'`overflow:hidden` de la barre selon PIT-S91-003, donc une cible réelle d'environ 24 px de haut. NON mesuré ici. [triage XS | domaine events]
- RECOMMAND_FOLLOWUP: le lead joue `next build` + `next start` sur les 19 specs avant la PR. Tout a été mesuré ici contre `next dev`. [triage XS | domaine e2e]

STATUS: COMPLETED
