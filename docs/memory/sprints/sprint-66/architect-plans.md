# Mini-plans architect — Sprint 66

> Produit par `/sprint plan` (replanification S64-S68, commit `ade986f` sur la branche de
> planification `claude/sprints-planifies-restants-1d6490`, JAMAIS mergé dans `dev` — les
> S64 et S65 ont chacun recréé le leur). Importé tel quel par `/sprint start 66` le 2026-09-02,
> puis confronté au code de `dev` au commit `97aba4a` (section « Faits vérifiés par le lead »).
> Lu par la composition des briefings fullstack-dev.

## Faits vérifiés par le lead (2026-09-02, `dev` = `97aba4a`)

1. **Le diagnostic de #455 tient toujours** : `setShowCreate(true)` n'a qu'un appelant,
   `AppShell.tsx:152`, dans l'`<aside className="… hidden … lg:flex">` (`:139`). `NewEventDrawer`
   est monté conditionnellement `:259` (`{showCreate && …}`), et bascule lui-même en `.mt-sheet`
   sous 1024 px via `useMediaQuery('(max-width: 1023px)')` (`NewEventDrawer.tsx:73`).
2. **Sous `lg`, seul le dashboard possède une chrome mobile** (`dashboard/page.tsx:106-158` :
   header `lg:hidden` + hamburger `md:hidden` + `MobileDrawer` ; `CompactRail` en paysage).
   `timeline/page.tsx`, `products/page.tsx` et `settings` n'ont AUCUNE nav sous 1024 px — le
   shell « délègue » (`AppShell.tsx:50-54`) à des écrans qui, pour trois d'entre eux, n'ont rien
   à quoi déléguer. Conséquence : le seul point d'ancrage qui couvre TOUTES les pages du groupe
   `(app)` est le shell lui-même (`AppShell`, rendu `lg:hidden`). Un déclencheur posé dans le
   header du dashboard ne réglerait le bug que sur 1 page sur 4.
3. **#79 : la doc DS `mobile-keyboard.md` citée par l'issue N'EXISTE PAS dans le dépôt**
   (aucun fichier, aucune mention hors sprint-history). Le seul écrit sur le sujet est la note du
   S21 (`sprint-21/issue-87-done.md:33`) : clavier virtuel « non implémenté activement,
   safe-area + max-h-85vh + overflow-auto ». Le corps de l'issue est donc la spécification.
4. **Quatre bottom sheets, pas trois** : `NewEventDrawer.tsx` (variante `.mt-sheet`),
   `timeline/TimelineBottomSheet.tsx`, `timeline/TimelineActionSheet.tsx` (`.mt-actionsheet`,
   pas de saisie → hors périmètre clavier) et `settings/mobile/BottomSheet.tsx` (#87, primitive
   générique avec `paddingBottom: env(safe-area-inset-bottom)`). Seules les sheets qui portent
   une SAISIE ont besoin du hook : `NewEventDrawer` (formulaire complet) et
   `settings/mobile/BottomSheet` (re-saisie du username, BR-AUT-001).
5. **`grep visualViewport frontend/src` = 0 hit** ; `frontend/src/hooks/useMobileKeyboard.ts`
   n'existe pas. `vitest.setup.ts:62` mocke `matchMedia` mais PAS `visualViewport` (jsdom ne
   l'expose pas) → tout test unitaire du hook devra le stubber, et ne prouvera que le câblage.
6. **Harnais E2E local disponible** : conteneur `mytimeline-e2e-backend-e2e-1` sur `:8086`
   (profils `dev,e2e`, `RATE_LIMIT_ENABLED=false`, CORS `:3000,:3100`), oracle profil e2e =
   404 sur `/api/test-support/password-reset-token`. Aucun `next dev` ne tourne. Recette :
   `rtk proxy npx next dev -p 3100` (webpack, PAS `npm run dev` qui force turbopack et casse en
   worktree) + `PLAYWRIGHT_BASE_URL=http://localhost:3100`.
7. **`timeline-mobile.spec.ts` fixe la viewport par `test.use`** (390×844 portrait) ; le seul
   E2E qui ouvre `NewEventDrawer` (`sprint-62-select-focus-indicator.spec.ts:398`) le fait via
   `shell-sidebar-new-event-button`, donc en desktop. Aucun E2E ne crée d'événement sous 1024 px.

## Vagues (confirmées)

- **V1 = #455** — ui-design AVANT implémentation (décision de placement), puis fullstack-dev.
- **V2 = #79** — après #455 : même `NewEventDrawer.tsx`/`.mt-sheet`, et le harnais E2E est une
  ressource d'exécution partagée (PAT-S65-002 : ne pas faire tourner l'E2E d'une issue pendant
  qu'une autre modifie la sheet qu'il exerce).
- **V3** = test-runner + review batch.

---

## Plan d'origine (`ade986f`, inchangé)


**Vagues :** V1 = #455 | V2 = #79 — séquentiel (les deux touchent `NewEventDrawer.tsx` et la
variante `.mt-sheet`). Sans #455, #79 corrige un formulaire que personne ne peut ouvrir sur mobile.

⚠ Sprint volontairement à 2 issues (6 pts, sous le plafond de 10) : ajouter #209 ou #298 ferait
tomber la cohésion de 0.50 à 0.25-0.33.

⚠ **Non vérifiable en CI** : le comportement réel du clavier virtuel (iOS/Android) exige un device.
Le critère « ne masque pas les champs » restera non prouvé automatiquement — à assumer explicitement
dans le done.md.

```yaml
issue_455:
  fichiers_cles:
    - "frontend/src/components/layout/AppShell.tsx"
    - "frontend/src/components/events/NewEventDrawer.tsx"
    - "frontend/src/components/timeline/TimelineMobilePortrait.tsx"
    - "frontend/e2e/timeline-mobile.spec.ts"
  couches_touchees: ["frontend"]
  strategie_test: "unit (AppShell : declencheur present sous lg) + E2E (creation d'evenement complete sous viewport < 1024px)"
  risque_regression: |
    aucune BR identifiee. Risque concret : dupliquer l'etat showCreate au lieu de le partager
    -> deux NewEventDrawer montes. L'etat vit dans AppShell.tsx:87 ; le declencheur mobile doit
    remonter a CE state, pas en creer un second.
    Le testid desktop shell-sidebar-new-event-button doit rester INCHANGE (critere d'acceptation).
  ordre_ecriture: "frontend uniquement — decision de placement UX d'abord (ui-design), puis cablage sur l'etat existant, puis E2E"
  zod_dto_sync: "NON"
  possibly_done: false
  etat_reel_du_code: |
    grep setShowCreate sur frontend/src + frontend/app = 3 hits, TOUS dans AppShell.tsx
    (l.87 declaration, l.93 close, l.152 UNIQUE declencheur), et l.152 est dans
    l'<aside className="... hidden ... lg:flex"> (AppShell.tsx:139). Defaut confirme :
    aucun autre point d'entree dans le depot. NewEventDrawer monte l.259.
    Cibles d'accueil possibles deja en place : TimelineMobilePortrait.tsx, MobileDrawer.tsx.
```

```yaml
issue_79:
  fichiers_cles:
    - "frontend/src/hooks/useMobileKeyboard.ts (a creer)"
    - "frontend/src/components/events/NewEventDrawer.tsx"
    - "frontend/src/components/timeline/TimelineBottomSheet.tsx"
  couches_touchees: ["frontend"]
  strategie_test: "unit (hook, visualViewport mocke) + E2E mobile ; comportement clavier reel NON couvrable en CI"
  risque_regression: |
    aucune BR. jsdom ne simule pas visualViewport : un test unitaire vert ne prouve RIEN sur le
    comportement reel — meme piege que les tests de scroll sous jsdom (memoire projet).
  ordre_ecriture: "hook -> branchement sur les 3 sheets"
  zod_dto_sync: "NON"
  possibly_done: false
  etat_reel_du_code: "pas de frontend/src/hooks/useMobileKeyboard.ts ; grep visualViewport sur frontend/src = 0 hit. Prerequis satisfait : NewEventDrawer.tsx, TimelineBottomSheet.tsx, TimelineActionSheet.tsx existent et referencent .mt-sheet"
```
