# Issue #79 — Mobile : évitement du clavier virtuel dans les bottom sheets (Sprint 66)

## Résumé

Hook `frontend/src/hooks/useMobileKeyboard.ts` (nouveau) : mesure `window.visualViewport`
(`resize` + `scroll`, plus `window.resize` en filet), throttle par `requestAnimationFrame`,
lecture PARESSEUSE de `window.visualViewport` à chaque mesure. Jamais `focus`/`blur`, jamais
`scrollIntoView`, jamais de scroll de page. Expose `keyboardOpen` (écart mise en page ↔ visuel
> 120 px), `compact` (hauteur visible < 600 px), `availableHeight` (`height - offsetTop`) et
`offsetTop`. NO-OP strict sans `visualViewport` ou quand `enabled` est faux → aucun écouteur,
aucun style inline (non-régression desktop). `onKeyboardShow`/`onKeyboardHide` ne sont émis
qu'aux TRANSITIONS ; ils sont lus par référence pour ne pas re-poser les écouteurs.

Sheet de création (`NewEventDrawer`) — hook armé UNIQUEMENT si `open && isCompact` :
- panneau borné par style inline `maxHeight: availableHeight` + `top: offsetTop`, retour à
  `undefined` (donc au `max-height:80vh` du DS) à la fermeture, sans transition ;
- nouvelle classe DS `.mt-sheet__footer` (`timeline.css`, pendant de `.mt-drawer__footer`) :
  filet, `--space-4`/`--space-5`, `min-height:var(--space-17)` (68 px), `flex:0 0 auto`, rendue
  HORS de `.mt-sheet__body` (le seul élément à `overflow:auto`) ;
- `EventEditForm` reçoit deux props OPT-IN, neutres si absentes (desktop strictement inchangé) :
  `compact` (retire récurrence + couleur/aperçu) et `footerPortalNode` (rangée d'actions rendue
  par `createPortal` dans le pied — AUCUNE duplication de boutons). Le nœud cible reste DANS
  `panelRef`, donc dans le focus-trap, et l'ordre DOM header → body → footer est conservé.

Sheet Réglages (`settings/mobile/BottomSheet.tsx`) : mêmes bornage + attributs d'état, plus les
props `onKeyboardShow`/`onKeyboardHide` et un slot `footer` optionnel (pied hors défilement).

Oracles posés : `data-keyboard="open|closed"` et `data-compact="true"` sur les panneaux,
`data-testid="shell-new-event-drawer-footer"` / `{testId}-footer`.

### Décisions et écarts à assumer

1. **`footerPortalNode` (nœud) et non `footerPortalRef` (RefObject)**, contrairement à la lettre
   de la spec Designer §B qui l'autorisait explicitement en variante. Un `RefObject` lu pendant
   le rendu vaut `null` au premier passage et sa mutation ne re-rend RIEN : la rangée d'actions
   ne serait JAMAIS portalisée. Le parent porte donc le nœud dans un `useState` (ref callback),
   dont le setter est appelé en phase de commit — donc avant peinture, sans saut visuel.
2. **Le mode réduit retire la SECTION couleur entière** (champ + mini-frise d'aperçu), pas le
   seul champ : les deux vivent dans le même bloc DS délimité par un `border-t`, et l'aperçu est
   précisément ce qui coûte le plus de hauteur. Sans effet métier (cf. point 3).
3. **`compact` n'est PAS conditionné à `keyboardOpen`** : il suit la hauteur visible, comme le
   demande le critère d'acceptation (« sous 600 px de viewport disponible »). Conséquence
   assumée : en mobile PAYSAGE (hauteur 390) la sheet de création s'ouvre déjà en aperçu réduit.
4. **`AccountSection` ne câble PAS le slot `footer`** du BottomSheet : les boutons vivent dans
   `DeleteAccountSteps`, partagé avec le Dialog desktop ; les y déplacer imposerait d'y répliquer
   le mécanisme de portail sur le chemin critique BR-AUT-001 (suppression de compte) pour un
   gain nul (2 boutons, un seul champ). **Le slot `footer` n'a donc AUCUN consommateur de
   production** — il est couvert par un test unitaire, et l'E2E assère explicitement l'absence du
   pied sur `delete-account-sheet`. Voir RECOMMAND_FOLLOWUP.
5. **Correctif non prévu, imposé par une mesure** : sur `BottomSheet`, la classe
   `motion-safe:duration-200` ne pose QUE `transition-duration` — or la valeur INITIALE de
   `transition-property` est `all`. Le bornage `max-height`/`top` s'ANIMAIT donc sur 200 ms au
   lieu de s'appliquer (E2E rouge : `max-height` interpolait encore à ~571 px pendant
   l'assertion, alors que l'inline valait 462 px — même un `!important` inline perdait, une
   transition primant sur l'inline). Corrigé par `transitionProperty: 'transform'` inline, ce
   qui rend la géométrie instantanée (exigence Designer §A) tout en préservant le comportement
   existant du swipe-down. `.mt-sheet` (sheet de création) n'était pas concernée : sa CSS DS ne
   déclare aucune `transition-duration`.

## Tests

Toutes les commandes ci-dessous ont été RÉELLEMENT exécutées depuis
`.claude/worktrees/sprint-66-start-ebe593/frontend` (branche `claude/sprint-66-start-ebe593`).

### Unitaires (Vitest)

- `rtk proxy npx vitest run --reporter=dot` → **102 fichiers, 1030 tests, 0 échec**
  (baseline HEAD : 101 fichiers / 1010 tests → **+1 fichier, +20 tests**).
- `npx tsc --noEmit` → **No errors found**.
- `npx eslint <9 fichiers touchés + la spec E2E>` → **0 problème** (code de sortie 0).
- `npx prettier --check <fichiers touchés>` → **All files formatted correctly**.

Répartition des ajouts : `useMobileKeyboard.test.ts` (8), `EventEditForm.test.tsx` 36 → 40,
`NewEventDrawer.test.tsx` 17 → 22, `BottomSheet.test.tsx` 7 → 10. Les tests existants sont
inchangés (aucune assertion modifiée).

### E2E (Playwright, exécuté)

Harnais du lead vérifié AVANT tout run : `curl -s -o /dev/null -w '%{http_code}'
http://localhost:3100/api/auth/me` → **401** (proxy `/api` présent), backend e2e :8086 → 401.

- `SKIP_DELEGATION=1 PLAYWRIGHT_BASE_URL=http://localhost:3100 rtk proxy npx playwright test
  e2e/sprint-66-mobile-keyboard.spec.ts --reporter=line` → **8 passed** (5 projets `setup` +
  **3 tests**), 10,6 s. Contenu : 390×844 création (pied portant `event-form-submit`, clavier
  simulé à 494 px → `data-keyboard="open"`, `data-compact="true"`, couleur et récurrence
  absentes, hauteur RÉELLE du panneau ≤ 494 px, **bas du pied ≤ 494 px** — l'oracle du défaut —,
  restauration puis création assertée par relecture serveur du listing du produit) ; soumission
  DEPUIS le pied clavier ouvert (prouve l'association `form=` du bouton portalisé dans un vrai
  moteur) ; 375×812 Réglages (`delete-account-sheet` réagit, bas de la sheet et champ username
  ≤ 462 px, aucune suppression confirmée).
- **Contrôle négatif E2E** : seuil `KEYBOARD_HEIGHT_THRESHOLD_PX` 120 → 100000, re-run →
  **3 failed / 5 passed** (les 3 tests du fichier rougissent). Seuil restauré, re-run vert.
- **Contrôles négatifs unitaires** (deux, indépendants) : (a) seuil 120 → 100000 →
  **7 tests rouges** (5 du hook, 1 `NewEventDrawer`, 1 `BottomSheet`) ; (b) retrait de
  `form={formId}` sur le bouton de soumission → **1 rouge** (`footerPortalNode : … et
  soumettent`) — l'oracle du portail n'est donc pas vacuous. Les deux sabotages ont été
  restaurés et la suite complète re-vérifiée verte APRÈS restauration.
- **Non-régression E2E** : `sprint-66-mobile-create-event.spec.ts`, `settings-mobile.spec.ts`,
  `sprint-62-select-focus-indicator.spec.ts`, `settings-account.spec.ts` en un run →
  **31 passed, 0 failed** (1,4 min).

## Ce qui n'est PAS prouvé

- **Le comportement d'un clavier virtuel RÉEL — iOS Safari et Android Chrome.** Aucun moteur
  d'automatisation n'ouvre un clavier logiciel : jsdom n'a pas `visualViewport` (stubbé),
  Playwright ne peut que substituer l'objet et émettre `resize`. Les valeurs employées (844 →
  494, `offsetTop`) sont des POSTULATS sur ce que rapportent ces navigateurs, pas des mesures.
  Ce qui est prouvé : le panneau réagit à `visualViewport` et sa géométrie mesurée par le moteur
  de rendu tient dans la hauteur visible. **Un test sur appareil réel reste requis** — en
  particulier le cas iOS « scroll simultané clavier ouvert » (`offsetTop`), cité comme risque
  par l'issue et couvert ici uniquement par un test unitaire de câblage.
- **`next build` n'a PAS été lancé** (PIT-S22-001 / PIT-S41-005 : il attrape des erreurs
  invisibles à `tsc` + Vitest). Raison assumée : le worktree est partagé et `frontend/.next` est
  unique — un build aurait cassé le `next dev` du harnais E2E encore en vie (PIT-S62-009). À la
  place : `tsc --noEmit`, `eslint` (même configuration que `next lint`) et `prettier --check`,
  tous verts. **La CI reste le premier vrai `next build` de cette livraison.**
- **Le rendu VISUEL du pied** (contraste, alignement, `safe-area-inset`) n'a été vérifié par
  aucune capture : seule sa géométrie l'a été.
- La suite E2E COMPLÈTE n'a pas été lancée (hors périmètre du briefing, > 3 min) : seules les
  4 specs de non-régression désignées l'ont été.

## [MEMORY:*]

- `[MEMORY:pitfall]` Contexte : borner `max-height`/`top` en style inline sur un panneau portant
  une utilitaire Tailwind `duration-*` (ici `motion-safe:duration-200`, posée pour une animation
  d'entrée). Une `transition-duration` SEULE suffit à armer une transition sur TOUTES les
  propriétés : la valeur INITIALE de `transition-property` est `all`. Symptôme trompeur : le DOM
  montre `style.maxHeight = "462px"`, `getComputedStyle` renvoie une valeur QUI VARIE d'une
  lecture à l'autre (683 → 675 → 571 px) et le rect suit — un `!important` inline n'y change
  rien, une transition primant sur l'inline dans la cascade. Solution : restreindre
  `transition-property` (ici `'transform'`, le seul effet voulu). Prévention : quand une valeur
  calculée contredit un inline, lire `el.getAnimations()` (ici `CSSTransition` sur `max-height`)
  AVANT de chercher un `!important` — et se méfier de toute `duration-*` posée sans
  `transition-*` explicite.
- `[MEMORY:pattern]` Problème : rendre une rangée d'actions à deux endroits (en flux desktop,
  portalisée dans un pied de sheet) sans la dupliquer. Solution : `createPortal` vers un nœud
  situé DANS le panneau (sinon `useFocusTrap`, qui interroge le conteneur, exclut les boutons),
  nœud porté par un `useState` alimenté par ref callback (un `useRef` lu au rendu vaut `null` et
  ne re-rend jamais), **plus `form={id}` sur le bouton de soumission** : un portail conserve
  l'arbre React mais PAS la parenté DOM, et un `type="submit"` hors de son `<form>` ne soumet
  rien nativement. Anti-pattern : dupliquer la rangée, ou passer un `RefObject` lu au rendu.
- `[MEMORY:pattern]` Problème : tester un état dérivé d'une API navigateur à événements
  (`visualViewport`). Solution : stub `EventTarget` qui MUTE la géométrie **et** émet
  l'événement (`src/__tests__/support/visualViewport.ts`, partagé par 3 fichiers de test), plus
  un drapeau `pending` distinct de l'identifiant `requestAnimationFrame` dans le hook — sinon un
  rAF stubbé SYNCHRONE laisse un id non nul en garde et gèle toute mesure ultérieure.
- `[MEMORY:decision]` Contexte : `onKeyboardShow`/`onKeyboardHide` + slot `footer` demandés sur
  `BottomSheetProps` par le critère d'acceptation. Décision : les exposer, mais NE PAS câbler le
  `footer` depuis `AccountSection`. Pourquoi : ses boutons vivent dans `DeleteAccountSteps`,
  partagé avec le Dialog desktop (BR-AUT-001) ; le gain (2 boutons) ne justifie pas d'y porter
  le mécanisme de portail. Conséquence explicite : `footer` est une prop SANS appelant de
  production (cf. PIT-S61-006 — un symbole livré n'est pas une fonctionnalité livrée).

## Recommandations suite

- `RECOMMAND_FOLLOWUP` — **Test sur appareil réel** (iOS Safari + Android Chrome) du parcours de
  création d'événement clavier ouvert : c'est la seule preuve manquante du critère d'acceptation
  n°1, et le seul moyen de valider le cas iOS `offsetTop` sous scroll simultané. Non couvrable
  en CI, à planifier hors sprint.
- `RECOMMAND_FOLLOWUP` — **Câbler ou retirer le slot `footer` de `BottomSheet`** (aujourd'hui
  sans consommateur de production, cf. décision 4) : soit déplacer les actions de
  `DeleteAccountSteps` via le même mécanisme de portail, soit supprimer la prop.
- `RECOMMAND_FOLLOWUP` — **Auditer les autres usages de `duration-*` sans `transition-*`**
  (pitfall ci-dessus) : sur `BottomSheet`, la transition `all` faisait aussi traîner le
  `transform` du swipe-down de 200 ms derrière le doigt. Corrigé ici en effet de bord ; d'autres
  composants peuvent porter le même défaut.
- Pas de `RECOMMAND_DB_EXPERT` : aucune BR touchée, zéro migration, backend non modifié.
- Pas de `RECOMMAND_SECURITY_EXPERT` : ni auth, ni données personnelles, ni appel externe ajouté
  (la sheet de suppression de compte est traversée en lecture, jamais confirmée).
- Pas de `RECOMMAND_TEST_RUNNER` : toutes les suites demandées ont été exécutées ici, sous les
  budgets (Vitest 1030 en ~40 s, E2E ciblés 10,6 s, non-régression 1,4 min).
- Pas de `RECOMMAND_UI_DESIGN` : la spec Designer §A-§G a été appliquée telle quelle, hors les
  deux écarts documentés (1 et 2), qui sont des contraintes techniques, pas des choix visuels.

STATUS: COMPLETED
