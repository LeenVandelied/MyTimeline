# Issue #577 — [CHORE] Trois palettes de couleurs concurrentes, dont 10 valeurs sur 12 hors charte

## Résumé

**Objectif** : une seule palette (les 12 tokens `--evt-*`, valeurs du handoff) proposée par TOUS les sélecteurs de couleur de donnée, avec le repli « Personnalisé » du handoff, sans jamais réécrire une couleur déjà stockée (DEC-S84-001).

**Fichiers clés**
- `frontend/src/lib/event-palette.ts` (nouveau) : `EVENT_PALETTE` (role, token, hex) + `findPaletteEntry` (insensible à la casse, lecture seule) + `paletteHex(role)`.
- `frontend/src/types/event.ts` : `DEFAULT_COLOR = paletteHex('cobalt')` au lieu du littéral `'#3B62D4'` (même valeur).
- `frontend/src/lib/event-palette.test.ts` (nouveau) : verrou miroir ↔ `colors.css` (nom, valeur, ordre, 12, aucun `--evt-*` sous `.dark`), miroir ↔ handoff (`docs/design/graphite-handoff.md`), et fil-piège « aucun fichier de `src/` ne cite ≥ 6 couleurs de la palette ».
- `frontend/src/components/ui/palette-color-picker.tsx` (nouveau) : composant partagé — 12 pastilles `radiogroup` + bouton « Personnalisé » (déclencheur du `PopoverPicker`).
- `frontend/src/components/ui/popoverPicker.tsx` : prop optionnelle `children` (déclencheur fourni via `asChild`) ; rendu historique inchangé sans elle.
- `frontend/src/components/categories/CategoryDrawer.tsx` : `CATEGORY_SWATCHES` supprimée, consomme `PaletteColorPicker`.
- `frontend/src/components/EventEditForm.tsx` : palette + « Personnalisé » ; le champ hex est conservé.
- `frontend/src/components/products/ProductDrawer.tsx` : surcharge couleur via la même palette.
- `frontend/src/lib/color.ts` : `swatchGlyphInk` choisit l'encre au meilleur ratio (fin du seuil 0.179) ; `SWATCH_GLYPH_THRESHOLD` supprimée.
- `frontend/src/styles/ds/a11y-audit.md` §9 (nouveau) : mesures des 12. Commentaires dans `colors.css` (pointeur vers le miroir) et `globals.css` (fin de la mention « AA-tunées »).
- i18n `categories.json` ×4 (fr/en/de/es) : `palette.roles.<12 rôles>` + `palette.custom`.
- E2E : `sprint-84-palette.spec.ts` (nouveau) ; `sprint-73-model-vs-rendered.spec.ts` et `categories.spec.ts` mis à jour (nouveaux hex).

**Choix et justifications**
1. **« Une seule définition » — voie (b) renforcée.** Le formulaire doit stocker un hex (`@Pattern`), donc le JS a besoin des valeurs ; `getComputedStyle` sur `var()` est non déterministe sous jsdom et absent au SSR. Donc une constante TS unique **plus** trois verrous : (i) test qui parse `colors.css` et échoue au moindre écart ; (ii) les pastilles sont **peintes par `var(--evt-*)`**, pas par le hex — l'E2E `sprint-73-model-vs-rendered` compare déjà « remplissage peint = hex du testid », il devient donc la preuve navigateur que miroir et tokens concordent ; (iii) fil-piège anti-liste. Grep final : aucune LISTE de ces couleurs hors `event-palette.ts`/`colors.css` (fil-piège vert). Une redéfinition isolée a été trouvée et supprimée : `DEFAULT_COLOR = '#3B62D4'` (`types/event.ts`, cobalt recopié en littéral — PIT-S56-003) passe par `paletteHex('cobalt')` (2e commit, valeur inchangée). Restent des hex isolés dans des COMMENTAIRES (`color.ts`, `timeline.css`, `a11y-audit.md`) et des fixtures de test ; les 10 anciennes valeurs ne restent que dans des tests (fixtures négatives voulues) et des seeds E2E (couleurs hors palette, légitimes par DEC-S84-001).
2. **Composant partagé**, vérifié au préalable : rien d'équivalent dans `components/ui/` (`tag.tsx` n'a qu'une pastille décorative `swatch`). Consommé par catégorie, événement ET produit (coût faible).
3. **« Personnalisé » = bouton `aria-pressed` HORS du radiogroup**, pas un 13e `radio` : Radix pose `aria-expanded`/`aria-haspopup` sur le déclencheur, attributs non autorisés sur le rôle `radio`. Le radiogroup suit le motif APG (un arrêt de tabulation, flèches/Début/Fin qui déplacent ET sélectionnent). Le déclencheur historique était un `<div>` inatteignable au clavier ; c'est désormais un vrai `<button>` au nom traduit.
4. **Produit** : `value` = la SURCHARGE seule. Un produit qui hérite de sa catégorie n'a aucune pastille cochée — cocher la couleur héritée confondrait « hérite » et « surcharge de même valeur », deux états distincts en base (`clearColor`).
5. **Non-réécriture (DEC-S84-001)** : le composant n'appelle `onChange` que sur action utilisateur ; la comparaison palette est insensible à la casse mais la valeur n'est jamais normalisée (`#e5484d` stocké repart `#e5484d`). Test de mutation fait : un `useEffect` qui « ramène » la couleur vers la palette fait rougir 4 tests de `CategoryDrawer.test.tsx`.
6. **`swatchGlyphInk`** : le test de #416 « aucun hex de la palette dans la bande sous-optimale » a rougi comme prévu — orchidée `#B056A8` (L = 0.1871) tombe entre 0.179 et le vrai point d'égalisation 0.1992 (sombre 4.01 contre clair 4.43). Plutôt que d'élargir la tolérance, la règle devient « encre au meilleur ratio » : bande supprimée, 11/12 inchangées, plancher garanti 4.21:1 pour tout hex.

**Écarts à l'énoncé de l'issue**
- **Champ hexadécimal libre conservé** dans `EventEditForm` sous la palette : 5 specs E2E le pilotent (`sprint-70-preview-visual` y saisit les couleurs, `sprint-70/71-*-preview-pinned` et `sprint-66-mobile-keyboard` s'en servent de témoin) et la surface est refondue par #617/#618 (S86). Il reflète la valeur quelle qu'elle soit ; saisir un hex de la palette coche la pastille.
- **Critère 5 (AA) partiellement tenu** : orchidée `#B056A8` plafonne à **4.43:1** en texte avec les encres du dépôt (blanche 4.43, `#0B0C0E` 4.42). Valeur NON modifiée (le critère 4 impose les valeurs du handoff à l'identique) — contradiction interne à l'issue, renvoyée au design (voir Recommandations). Impact : frise protégée par `eventLabelReadableInside` (libellé hors barre) ; `CategoryDrawer` affiche son avertissement de contraste ; **sans garde-fou** : badges de `CategoriesView` et `ProductsListView`.
- `EventContent.tsx` non câblé : c'était une surface morte (rendue seulement via `Lane` → `EventBar`, que #634 vient de supprimer dans ce sprint) ; il n'a plus AUCUN importeur de production. Son mode édition passe de toute façon par `EventEditForm` (palette incluse).

**Non vérifié** : aucun rendu navigateur fait de mon côté (interdit `next dev`/build dans ce fan-out) — ni la mise en page des 12 pastilles + pilule dans le drawer 452 px et la bottom sheet, ni le contour de focus, ni le popover `react-colorful` au clavier. `next build` non joué (lint ciblé seulement).

## Tests

- `npx vitest run src/lib/event-palette.test.ts src/lib/color.test.ts src/components/categories/CategoryDrawer.test.tsx` → 3 fichiers, **68/68**.
- `npx vitest run src/components/ui/palette-color-picker.test.tsx src/lib/event-palette.test.ts` → **22/22** (14 composant + 8 palette).
- `npx vitest run EventEditForm.test.tsx EventEditForm.debounce.test.tsx ProductDrawer.test.tsx NewEventDrawer.test.tsx` → 4 fichiers, **98/98** ; `ProductDrawer.test.tsx` après ajout #577 → **13/13**.
- Test de mutation (non-réécriture) : `useEffect` réécrivant la couleur injecté puis retiré → **4 échecs** attendus, fichier restauré (vérifié `grep -c useEffect` = 0).
- `./scripts/test-quiet.sh frontend-unit` → 1er passage : 1 échec — mon propre fil-piège sur mon fichier de test qui citait 6 hex (test réécrit pour lire les hex via `paletteHex`) ; 2e passage **125 fichiers, 1456/1456, exit 0** ; passage final après le 2e commit (`DEFAULT_COLOR`) **125 fichiers, 1457/1457, exit 0**.
- `npx tsc --noEmit` → **exit 0**, 0 ligne (joué avant chaque commit).
- `npx next lint --file <16 fichiers touchés>` puis `--file` sur les 4 fichiers du 2e commit → **exit 0**, « No ESLint warnings or errors ».
- `rtk proxy npx prettier --check <23 fichiers>` → 2 fichiers non conformes (`CategoryDrawer.test.tsx`, `sprint-84-palette.spec.ts`), `--write` appliqué sur ces 2 (miens), re-check **exit 0**. `src/styles/ds` et `public/locales` sont dans `.prettierignore`.
- Non joué : `next build`, Playwright (réservés au lead).

## E2E à jouer par le lead

- `e2e/sprint-84-palette.spec.ts` (nouveau, 3 tests) — prouve : (1) une catégorie seedée `#E5691E` s'ouvre en « Personnalisé » (0 radio coché, 12 radios) et, après renommage enregistré, la couleur **relue par `GET /api/categories`** vaut toujours `#E5691E` (comparaison insensible à la casse) ; (2) les 12 pastilles du drawer de création d'événement ont un `background-color` calculé égal à `EVENT_PALETTE`, dans l'ordre ; (3) flèche droite depuis cobalt (défaut) → pervenche focalisée ET cochée, champ hex = `#6C7BE0`.
- `e2e/sprint-73-model-vs-rendered.spec.ts` (modifié) — `WORST_CASES` passe à `{ light: '#3B62D4', dark: '#E3A82B' }` (pires bordures de sélection de la nouvelle palette : 3.28 et 1.81) ; l'assertion « remplissage peint = hex du testid » prouve désormais aussi miroir JS = tokens peints. Minimum attendu du glyphe : 4.43:1 (orchidée).
- `e2e/categories.spec.ts` (modifié) — création : pastille `#3B62D4` au lieu de `#3E63DD` (qui n'existe plus).
- À surveiller (non modifiées, formulaire plus haut de ~1 rangée de pastilles) : `sprint-70-create-preview-pinned`, `sprint-71-edit-preview-pinned`, `sprint-66-mobile-keyboard`, `sprint-70-preview-visual` (pilotent `event-form-color-input`, toujours présent).
- Références visuelles : **aucune** ne devrait rougir — les seuls PNG suivis (`sprint-77-theme-visual`) couvrent landing et pages auth, et aucune valeur de token n'a changé.

## Critères d'acceptation

- [x] **Une seule définition des 12 couleurs, portée par les tokens `--evt-*`** — tenu (avec miroir JS verrouillé). Preuve : `event-palette.test.ts` (parse `colors.css`) + fil-piège anti-liste vert sur tout `src/` ; pastilles peintes par `var(--evt-*)` (test « peintes par leur token ») ; grep des 12 hex et des 10 anciennes valeurs (cf. Résumé §1).
- [x] **`CATEGORY_SWATCHES` supprimée, `CategoryDrawer` consomme les tokens** — tenu. `grep CATEGORY_SWATCHES` → uniquement des commentaires/tests historiques ; test « aucune des 10 anciennes valeurs n'est proposée ».
- [x] **Le formulaire d'événement propose les 12 pastilles + repli « Personnalisé »** — tenu. `EventEditForm.test.tsx` § « #577 palette curatée » (12 radios dans l'ordre + `event-form-color-custom`) ; E2E `sprint-84-palette` (à jouer).
- [x] **Les 12 valeurs rendues = colonne « Handoff »** — tenu côté modèle : `event-palette.test.ts` vérifie chaque hex contre `graphite-handoff.md` ET contre `colors.css`. Côté rendu : E2E `sprint-84-palette` + `sprint-73` (à jouer par le lead).
- [~] **Contraste AA vérifié sur les deux thèmes pour les 12** — **partiel** : vérifié et consigné (`a11y-audit.md` §9, tables figées dans `CategoryDrawer.test.tsx` et `color.test.ts`), mais **orchidée échoue 4.5:1 en texte (4.43:1)**. Glyphe ≥ 3:1 sur les 12 (min 4.43). Mesure arithmétique ; la mesure peinte du glyphe relève de `sprint-73` (à jouer).
- DEC-S84-001 (non-réécriture) — tenu : tests unitaires `CategoryDrawer` (ouverture `#E5691E` → aucune pastille cochée, « Personnalisé » actif, payload `#E5691E` inchangé ; casse préservée), `EventEditForm` (`#3B82F6` renvoyé à l'identique), `ProductDrawer` (surcharge `#abcdef` → aucun PATCH), composant (aucun `onChange` au montage) ; E2E bout en bout (à jouer).

## Signaux mémoire

- [MEMORY:pitfall] Context: le handoff annonce une palette « AA-tunée 2 modes » ; recalculée avec les encres du dépôt (`#0B0C0E`/`#FFFFFF`), orchidée `#B056A8` plafonne à 4.43:1 en texte (4.74 seulement avec du noir pur). Le critère « valeurs du handoff à l'identique » et le critère « AA sur les 12 » de #577 étaient donc incompatibles. Solution: valeurs conservées, résidu mesuré et remonté au design. Prevention: toute affirmation de contraste d'une charte se recalcule avec les constantes réellement peintes AVANT de l'accepter comme critère (famille PIT-S61-004 / PIT-S74-005).
- [MEMORY:pattern] Problem: un token CSS doit aussi exister en JS (formulaire qui stocke un hex). Solution: miroir TS unique + test qui parse le `.css` (nom/valeur/ordre/absence d'override sombre) + peindre via `var(--token)` et porter le hex dans le testid, pour qu'un E2E « couleur peinte = hex du testid » prouve la concordance au rendu + fil-piège de dépôt contre toute liste recopiée (seuil ≥ 6 occurrences). Anti-pattern: peindre avec le hex JS (le test CSS devient la seule garantie, et jsdom ne peint rien).
- [MEMORY:pitfall] Context: les tests mockent `PopoverPicker` par un bouton qui ignore `children` ; un composant qui passe SON déclencheur en `children` voit ce déclencheur disparaître du rendu de test — l'état « Personnalisé actif » y devient invérifiable sans aucun signal. Solution: les mocks de `CategoryDrawer.test`, `EventEditForm.test`, `ProductDrawer.test` rendent désormais `{children}`. Prevention: un mock de composant qui accepte `children` doit les rendre.
- [MEMORY:decision] Context: « Personnalisé » à côté d'un radiogroup de 12 pastilles. Decision: bouton `aria-pressed` HORS du radiogroup, pas 13e `radio`. Why: Radix pose `aria-expanded`/`aria-haspopup` sur le déclencheur de popover, non autorisés sur le rôle `radio` ; l'état « hors palette » reste lisible (aucun radio coché + bouton pressé).
- [MEMORY:decision] Context: `swatchGlyphInk` basculait à un seuil de luminance fixe (0.179) dont l'écart au vrai point d'égalisation (0.1992) n'était toléré que tant qu'aucune couleur de palette n'y tombait. Decision: encre au meilleur ratio. Why: orchidée y tombe ; supprimer la bande coûte moins que de maintenir une tolérance adossée à une prémisse qui dépend de la palette.

## fichiers de contexte lus

- `docs/memory/sprints/sprint-84/briefing-577.md` — NON LU sur disque (contenu reçu inline dans le prompt, déclaré identique).
- `docs/memory/decisions.md` — lu DEC-S84-001 (« Aucune migration Flyway… s'affiche comme « Personnalisé » »), DEC-S84-002, DEC-S83-002, DEC-S83-005.
- `.ai-env/context-packs/pit-frontend.md` — extrait inline (PIT-S22-001, S41-005, S56-003, S58-002, S61-003, S61-004) + grep mots-clés : PIT-S73-002 (l.819, « n'utiliser que des tokens de PALETTE »), PIT-S74-005 (l.867, token vs valeur littérale), PIT-S74-008 (RTK ment sur prettier → `rtk proxy`).
- `.ai-env/context-packs/cp-frontend.md` — lu (84 l.) : « Éviter les hex inline → passer par les tokens CSS du DS », i18n `public/locales/<locale>/<namespace>.json`.
- `.claude/rules/frontend-stack.md` — NON LU : absent du worktree (`.claude/rules/` n'existe pas ; règles chargées par le plugin).
- `.claude/rules/conventions.md` — NON LU : absent du worktree (même raison).
- `docs/design/graphite-handoff.md` — lu l.56-59 (palette curatée), l.206 (« palette curatée + repli « Personnalisé » avec picker »), l.247-248 (`color, customColor`).
- `docs/design/audit-conformite-2026-09-07.md` — grep §3 (l.82-94, #577).
- `frontend/src/styles/ds/a11y-audit.md` — lu §2 l.51-54 (« revérifier sur teinte personnalisée »), §8bis l.309-340 (`#F2A900` 1.61:1).
- `frontend/src/lib/color.ts`, `color.test.ts` — lus en entier (verrou `THEME_SURFACE` l.150-161 servi de modèle au verrou de palette).
- `frontend/e2e/sprint-73-model-vs-rendered.spec.ts` — lu l.30-100 et l.360-470 (`WORST_CASES`, « remplissage peint = hex demandé »).
- `frontend/src/__tests__/i18n-namespaces.test.ts` — lu l.1-60 (garde namespace ; clés dynamiques non couvertes → test intl réel ajouté).
- `frontend/src/components/shared/DeleteConfirmDialog.intl.test.tsx` — lu l.1-80 (motif `NextIntlClientProvider` + `onError`).

## Recommandations suite

- RECOMMAND_FOLLOWUP: orchidée `#B056A8` = 4.43:1 en texte avec les encres du dépôt (sous AA 4.5). Arbitrage design requis : soit ajuster le token (assombrir de 1 % → `#AE55A6`, 4.52:1 avec blanc — change la charte et l'égalité « colonne Handoff »), soit poser un garde-fou de contraste sur les badges de `CategoriesView.tsx:149` et `ProductsListView.tsx:273` (texte 12px sur la couleur, aucun repli aujourd'hui) [ui-design | design]
- RECOMMAND_FOLLOWUP: `frontend/src/components/EventContent.tsx` (+ `EventContent.test.tsx`) n'a plus aucun importeur de production depuis la suppression de `EventBar`/`Lane` par #634 dans ce sprint ; son sélecteur libre en lecture seule est la dernière surface hors palette et le seul consommateur du déclencheur `<div>` historique de `PopoverPicker` [triage | frontend]
- RECOMMAND_FOLLOWUP: le champ hex `event-form-color-input` n'a aucun nom accessible (pas de `label`/`aria-label`, le `FormLabel` pointe un id inexistant) — préexistant, à traiter avec la refonte du formulaire #617/#618 qui décidera aussi s'il reste visible hors mode « Personnalisé » [triage | frontend]
- RECOMMAND_FOLLOWUP: vérification navigateur (lead) de la rangée « 12 pastilles + Personnalisé + Réinitialiser » dans le drawer 452 px, la bottom sheet mobile et le drawer de création (`.mt-drawer`) : retour à la ligne, contour `:focus-visible` sur la pilule, popover au-dessus du drawer (`--z-popover-over-modal`) [ui-design | frontend]
- Pas de RECOMMAND_TEST_RUNNER car le lead joue lui-même build + E2E (PIT-S73-004).
- Pas de RECOMMAND_DB_EXPERT car DEC-S84-001 exclut toute migration et aucun schéma n'est touché.
- Pas de RECOMMAND_SECURITY car aucune donnée sensible ni surface d'auth n'est touchée.


## Clôture par le lead (post-vague)
- Retour de l'agent : **STATUS PARTIAL** (le fichier disait COMPLETED — écart aligné ici). BLOQUE_SUR : critère 5 (AA sur les 12) contradictoire avec le critère 4 pour orchidée `#B056A8` (4.43:1 max avec `INK_LIGHT`/`INK_DARK` du dépôt — recalculé et confirmé par le lead).
- Arbitrage du dev (2026-09-11) → **DEC-S84-003** : `--evt-orchid` = `#AE55A6` (4.52:1). Appliqué par le correctif post-vague (`89f9aa8`, cf. `issue-followup-done.md`). Critère 5 tenu sur les 12.
- Le bloqueur est levé : statut final COMPLETED.

STATUS: COMPLETED
