# Issue #618 — Formulaire événement : une seule surface (done)

## Résumé

- Nouvelle coque unique `EventFormDrawer` (scrim, panneau `.mt-drawer.mt-drawer--form` >= lg / `.mt-sheet` < lg,
  en-tête titre + sous-titre + puce Échap + croix, nœud d'aperçu épinglé, corps défilant, nœud de pied sticky,
  `useFocusTrap`, `useMobileKeyboard`), portalisée dans `document.body`, contenu en render-prop (nœuds de portail
  déjà résolus).
- `NewEventDrawer` (création) et `TimelineEditHost` (édition) la consomment ; le `Dialog` shadcn stylé
  `sm:w-[480px]` est supprimé. Largeur = token `--drawer-width-form` des deux côtés.
- Découpe choisie = celle suggérée (coque partagée) ; render-prop plutôt que props de nœuds pour qu'aucun
  appelant ne recalcule la variante (un seul seuil, 1023px).
- `useFocusTrap` : Échap ignoré si `e.defaultPrevented` (Radix `DismissableLayer` écoute `document` en capture et
  `preventDefault()` en se fermant). Sans cela, Échap dans `DeleteConfirmDialog`/`ConflictDialog`/un `Select`
  refermait AUSSI le drawer (le `Dialog` Radix d'édition gérait ça via sa pile de couches).
- `onClose` stabilisé dans la coque (ref) : `handleClose` de l'édition dépend de l'objet `conflict` recréé à chaque
  rendu, ce qui aurait relancé le focus-trap à chaque rendu (vol de focus, BUG-S44-001).
- Animation d'entrée maquette (`translateX(28px)` + opacité, scrim en fondu, `--dur-base` / `--ease-quart`) sur la
  variante formulaire seule, `prefers-reduced-motion` respecté ; drawer de détail inchangé.
- Conservés intacts : `ConflictDialog` (via le form), `DeleteConfirmDialog` desktop + mobile, `runDelete` unique +
  invalidation `products.all`, `TimelineActionSheet`. Aucun champ ajouté. `EventEditForm.tsx` non modifié.

## Fichiers

- `frontend/src/components/events/EventFormDrawer.tsx` (nouveau)
- `frontend/src/components/events/NewEventDrawer.tsx`
- `frontend/src/components/timeline/TimelineEditHost.tsx`
- `frontend/src/components/timeline/TimelineEditHost.test.tsx`
- `frontend/src/components/timeline/useFocusTrap.ts`
- `frontend/src/styles/ds/components/timeline.css`
- `frontend/e2e/sprint-71-edit-preview-pinned.spec.ts`

## Tests

- `./scripts/test-quiet.sh frontend` → exit 0 : build OK, **127 fichiers / 1515 tests** vitest verts, typecheck OK,
  lint OK.
- Ciblé : `npx vitest run TimelineEditHost NewEventDrawer AppShell TimelineView EventEditForm*` → 6 fichiers,
  193/193 (TimelineEditHost 18, NewEventDrawer 26 inchangés).
- Contre-épreuve : garde `defaultPrevented` retirée de `useFocusTrap` → test « Échap dans la confirmation ne ferme
  QUE la confirmation » ROUGE (`timeline-edit-dialog` introuvable) ; garde restaurée → vert.
- `rtk proxy npx tsc --noEmit -p .` (inclut `e2e/**`) exit 0 ; `npx eslint` sur les fichiers modifiés exit 0 ;
  `rtk proxy npx prettier --check` (depuis `frontend/`) sur les 7 fichiers → conforme (2 reformatés par `--write`).
- E2E local (pile dédiée `COMPOSE_PROJECT_NAME=s86e2e`, backend :8086 depuis l'image `s85e2e-backend-e2e`
  retaguée — aucun commit `backend/` depuis 3 jours ; `next dev` webpack :3100 ; oracle `/api/auth/me`=401,
  `/fr/login`=200) : `playwright test sprint-71-edit-preview-pinned sprint-42-events
  sprint-82-recurrence-capped-hint sprint-61-archived-events timeline sprint-85-timeline-toolbar
  sprint-70-create-preview-pinned sprint-66-mobile-create-event sprint-66-mobile-keyboard --ignore-snapshots`
  → **63 passed / 1 failed** (64, 2 workers, 1,4 min). Les 3 tests de `sprint-71` (dont les 2 nouveaux #618) verts.
- L'échec : `sprint-42-events.spec.ts:169`, corps du test passé, c'est la PURGE post-test (`support/fixtures.ts:36`)
  qui lève « création de la catégorie poubelle a rendu 409 » — course de création de catégorie entre 2 workers
  documentée dans `e2e/support/seed-cleanup.ts:~200`. Rejoué `sprint-42-events.spec.ts --workers=1` → **8/8**.
  Structurel : le diff ne touche ni catégories, ni fixtures, ni backend.
- `docker compose up` avec build (recette S80) bloqué > 10 min sur « load metadata docker.io » → abandonné au profit
  de l'image en cache.

## Assertions modifiées

- `TimelineEditHost.test.tsx` — mock `mockViewport(matches)` remplacé par `mockViewportWidth(width)` qui ÉVALUE
  `min-width`/`max-width` : l'ancien mock rendait le même booléen pour toute requête, ce qui ne tenait qu'avec
  `(min-width: 640px)` ; la coque interroge `(max-width: 1023px)` (sens inverse). Intention inchangée.
- Idem, 3 tests #495 : seuil « >= 640px » → « >= lg » (alignement voulu par l'issue sur la création).
- Idem, test sheet : `timeline-edit-dialog-preview` passait de « présent mais vide (`empty:hidden`) » à « absent » :
  la coque ne rend pas d'hôte d'aperçu sur la sheet, exactement comme la création (assertion jumelle
  `NewEventDrawer.test.tsx` « sheet (< lg) : PAS d'aperçu épinglé »). + attente `toHaveClass('mt-sheet')`.
- `sprint-71-edit-preview-pinned.spec.ts` — débordement et `scrollTop` mesurés sur `.mt-drawer__body` au lieu du
  panneau `timeline-edit-dialog` : le panneau ne défile plus, son corps oui (même mesure que
  `sprint-70-create-preview-pinned`, qui cible aussi `.mt-drawer__body`). Commentaire d'en-tête S71 marqué périmé.
- Aucune assertion de `NewEventDrawer.test.tsx` modifiée (26/26 inchangés).
- Ajouts : 4 tests unitaires #618 (classes token + étiquette, fermeture croix/scrim/Échap, Échap dans la
  confirmation ne ferme que la confirmation, sheet + pied sticky avec Supprimer) ; 2 tests E2E #618 (largeur peinte
  = token = largeur de création + 3 fermetures ; < lg bascule en sheet avec pied). Nouveaux testids produits par la
  coque et CITÉS par la spec : `timeline-edit-dialog-overlay`, `timeline-edit-dialog-close`,
  `timeline-edit-dialog-footer`. Côté création aucun testid nouveau (`-overlay`/`-close`/`-preview`/`-footer`
  existaient).

## Écarts à la maquette

- Titre d'édition : « Modifier l'événement » (clé existante `products.edit.title`, 4 locales) au lieu de « Éditer
  l'événement » — locales interdites à ce ticket.
- Ligne « CRÉÉ LE <date> · <id> » OMISE : `PositionedEvent` ne porte aucune date de création ; le sous-titre montre
  le titre de l'événement (donnée réelle, déjà affichée par l'ancien en-tête). → RECOMMAND_FOLLOWUP.
- Puce Échap : clé réutilisée `dashboard.timeline.help.escapeKey` (Échap/Esc, 4 locales, tous namespaces chargés
  par `i18n.ts#loadMessages`) ; affichée sur le drawer seulement (pas sur la sheet tactile).
- Sous-titre création conservé en style DS `.mt-drawer__subtitle` (mono 10px capitales) et non 13px ink-muted.
- Durée d'animation `--dur-base` (200ms) au lieu de 240ms (token le plus proche, pas de valeur en dur).
- Comportements qui changent pour l'édition (voulus par l'alignement) : sheet sous 1024px (avant : panneau 480px
  dès 640px), plus de verrouillage du défilement de page (la création n'en avait pas), évitement du clavier
  virtuel + pied sticky désormais actifs en édition mobile.

## Signaux mémoire

- [MEMORY:pitfall] Context: remplacer un `Dialog` Radix par un panneau custom `useFocusTrap` sous lequel s'ouvrent
  des dialogs Radix (confirmation, conflit, Select). Solution: Radix `DismissableLayer` écoute `keydown` sur
  `document` en CAPTURE et fait `preventDefault()` quand il se ferme, sans `stopPropagation` → garde
  `if (e.defaultPrevented) return` dans le listener Échap bulle. Prevention: tout piège Échap global doit tester
  `defaultPrevented` ; test « Échap dans la confirmation ne ferme que la confirmation » vu ROUGE sans la garde.
- [MEMORY:pattern] Problem: deux surfaces de formulaire qui recalculent chacune leur variante responsive et leurs
  nœuds de portail. Solution: coque unique à render-prop qui fournit `{isCompact, compact, previewPortalNode,
  footerPortalNode}` déjà résolus. Anti-pattern: passer le seuil ou des refs aux appelants (second seuil possible).
- [MEMORY:pitfall] Context: mock `matchMedia` qui renvoie le même `matches` pour toute requête. Solution: évaluer
  `min-width`/`max-width` contre une largeur simulée. Prevention: un mock booléen global inverse silencieusement le
  sens d'un test dès qu'un composant passe de `min-width` à `max-width`.
- [MEMORY:pitfall] Context: `rtk` + `grep -v '… && …'` pour générer une contre-épreuve a produit un fichier VIDE →
  vitest « no tests » (faux signal). Solution: `rtk proxy grep -v -F` + contrôle `wc -l` avant de substituer.

## Recommandations suite

- RECOMMAND_FOLLOWUP: exposer la date de création dans le view-model frise (`PositionedEvent`) pour la ligne « CRÉÉ LE … · id » de l'en-tête d'édition (maquette §A).
- RECOMMAND_FOLLOWUP: libellé « Éditer l'événement » de la maquette vs clé `products.edit.title` « Modifier l'événement » — arbitrage produit/i18n.
- RECOMMAND_UI_DESIGN: vérification visuelle clair/sombre du drawer d'édition (puce Échap, sous-titre = titre en capitales mono) non faite au navigateur par cet agent.
- Pas de RECOMMAND_TEST_RUNNER (E2E ciblé joué en local par cet agent, 63/64, seul rouge = purge de fixture, rejoué 8/8).
- Pile E2E laissée debout pour la Phase 6 : `COMPOSE_PROJECT_NAME=s86e2e docker compose --profile e2e down -v` pour la démonter (base déjà semée).
- Pas de RECOMMAND_DB_EXPERT (aucun changement de schéma ni backend).
- Pas de RECOMMAND_SECURITY_EXPERT (aucune surface auth/données).

fichiers de contexte lus:
- docs/memory/sprints/sprint-86/pit-subset-frontend.md — PIT-S74-001 (translate vs transform), PIT-S81-022 (deux next dev), PIT-S74-008 (RTK prettier)
- .ai-env/context-packs/br-events.md — BR-EVE-002 (productId requis), BR-EVE-013 (archived PATCH-only), BR-EVE-017 (débounce 150 ms)
- docs/memory/sprints/sprint-86/maquette-formulaire-evenement.md — §A « width:452px » / « ef-slide .24s »
- frontend/playwright.config.ts — recette worktree « npx next dev -p 3000 # webpack »
- memory mytimeline-e2e-ci-only-gate.md — recette S80 pile dédiée + oracle /fr/login 200

STATUS: COMPLETED
