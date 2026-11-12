# Issue #858 — Le piège de focus du panneau mobile se réinstalle à chaque rendu

## Commits

- `5e8bd9b2` — :bug: fix(frontend): le piège de focus n'est plus réinstallé à chaque rendu (#858)

## Résumé

**Objectif** : mesurer puis supprimer la réinstallation du piège de focus (`useFocusTrap`) à chaque re-rendu de l'appelant, visible sur le panneau mobile de suppression de compte.

**Fichiers clés**
- `frontend/src/components/timeline/useFocusTrap.ts` — correctif.
- `frontend/src/components/timeline/useFocusTrap.test.tsx` — nouveau, 6 tests du hook.
- `frontend/src/components/settings/AccountSection.test.tsx` — +1 test (saisie touche par touche dans le BottomSheet).
- `frontend/e2e/sprint-121-bottom-sheet-focus.spec.ts` — nouveau, 2 tests, viewport 375×812, `sessionState(SHARED)`, lecture seule (formulaire jamais soumis).

**Choix technique** : correctif dans le hook (bénéficie aux 9 appelants), pas côté appelant. `onEscape` est lu dans une ref (`onEscapeRef`) écrite dans un `useLayoutEffect` sans dépendances, et retiré du tableau de dépendances de l'effet (`[containerRef, active]`). `useLayoutEffect` suffit : la ref n'est lue que dans le handler `keydown`, donc après le commit (PAT-S120-002 ne s'applique pas : pas de ref callback enfant à devancer). Pas d'écriture de ref pendant le rendu (react-hooks 7 OK, eslint vert). `useEffectEvent` écarté : le handler doit aussi tester la PRÉSENCE de `onEscape` (pas de `stopPropagation` sans callback), ce qu'une ref exprime directement.

**Comportement conservé** : garde #618 (Escape déjà `defaultPrevented`), `stopPropagation` seulement si `onEscape` fourni, boucle Tab/Shift+Tab, focus initial à l'activation, restauration du focus déclencheur à la désactivation — chacun couvert par un test du hook.

## Mesure demandée par l'issue

**Reproduit — et plus grave que l'énoncé.** Mesure jsdom (RTL + user-event, `AccountSection deleteContainer="sheet"`, saisie de « jane » touche par touche, AVANT correctif) :

| Touche | `document.activeElement` après la frappe | Valeur du champ |
|---|---|---|
| j | `delete-account-sheet-close` (la croix) | `j` |
| a | `delete-account-sheet-close` | `j` |
| n | `delete-account-sheet-close` | `j` |
| e | `delete-account-sheet-close` | `j` |

Mécanisme : le 1er caractère passe `confirmUsername` en « dirty ». `FormMessage`/`useFormField` lit `formState` du `useForm` porté par `useDeleteAccountFlow` (donc par `AccountSection`) → abonnement au proxy → `AccountSection` re-rend → nouveau `onClose` inline → effet rejoué : cleanup (`previousFocus.focus()` = déclencheur) puis focus initial sur le 1er focusable du panneau (la croix). La saisie clavier du username était impossible au-delà du 1er caractère (un `fill()` Playwright, unique événement `input`, masquait le défaut — d'où les specs existantes vertes).

Pas un saut à chaque frappe : un seul re-rendu (transition dirty), mais il suffit à sortir le focus du champ. Autres re-rendus déclencheurs observés par lecture : passage avertissement → confirmation (`setStep`), `isPending`, erreurs de validation.

**Mesure E2E 375×812 : NON exécutée par moi** (consigne : le lead joue Playwright). La spec relève chaque `focusin` hors du champ dans la page et l'attache au rapport (annotation `focus-moves`, attendu `aucun`). Pour consigner aussi l'état AVANT correctif en vrai navigateur : jouer la spec avec `git show HEAD~1:frontend/src/components/timeline/useFocusTrap.ts` en place (attendu : rouge au caractère 2).

## Tests et résultats

- Discriminance : `useFocusTrap.test.tsx` contre le hook d'origine → 1 rouge / 5 verts (le test « une installation par ouverture » échoue) ; `AccountSection.test.tsx` nouveau test rouge avant correctif. Les deux verts après.
- `npx vitest run` sur le hook + tous les appelants et voisins (26 fichiers : settings/*, BottomSheet, HeaderSection, LandingMobileMenu, MobileDrawer, NewEventDrawer, EventFormDrawer, EventDrawer, TimelineBottomSheet/ActionSheet/LandscapeDrawer/EditHost, AppShell, EventEditForm, TimelineView…) : **26 fichiers, 375 tests verts**, aucune ligne stderr.
- `npx tsc --noEmit` : 0 erreur (inclut `e2e/`).
- `npx eslint` (4 fichiers) : 0 problème.
- `rtk proxy npx prettier --check` (4 fichiers) : conforme.
- Playwright : non lancé (consigne). Spec à jouer : `e2e/sprint-121-bottom-sheet-focus.spec.ts`. Specs voisines qui citent le panneau, à rejouer aussi : `settings-mobile.spec.ts`, `sprint-113-focus-return.spec.ts` (cas mobile BottomSheet), `landing-mobile-menu.spec.ts` (autre appelant avec `onClose`).

## Non vérifié / manques

- Comportement en vrai navigateur (E2E non joué par moi).
- **Effet de bord à connaître** : avant le correctif, le passage avertissement → confirmation re-rendait la section, et le piège rejoué posait (par accident) le focus sur la croix. Désormais le bouton « Continuer » démonte sous le focus et celui-ci tombe sur `body` ; un Tab suivant n'est plus garanti dans le panneau (le piège ne boucle que depuis le 1er/dernier focusable). Non couvert par l'issue ; cf. recommandation.
- Commentaires d'appelants devenus inexacts (ils justifient une stabilisation par « `onEscape` est en dépendance d'effet ») : `AppShell.tsx:172`, `EventFormDrawer.tsx:95`, `TimelineView.tsx:710`, `HeaderSection.tsx:98`, `TimelineEditHost.tsx:150/209`. Code inchangé (les `useCallback` restent inoffensifs), commentaires non retouchés pour rester dans le périmètre.

## Signaux mémoire

- [MEMORY:pitfall] Context: `useFocusTrap` avait `onEscape` en dépendance d'effet ; un appelant à callback inline rejouait le piège à chaque re-rendu (cleanup → focus déclencheur, puis focus sur le 1er focusable). Sur le BottomSheet de suppression de compte, le 1er caractère (transition RHF dirty, abonnement du parent via `FormMessage`/`formState`) suffisait à envoyer le focus sur la croix. Les E2E existants utilisaient `fill()` (un seul événement input) et restaient verts. Solution: callback lu dans une ref écrite en `useLayoutEffect`, retiré des deps (#858). Prevention: un hook qui pose du focus dans un effet ne doit dépendre d'aucun callback de l'appelant ; tester une saisie avec `keyboard.press`/`user.keyboard` caractère par caractère, jamais `fill()` seul, dès qu'un champ vit dans un conteneur piégé.
- [MEMORY:pattern] Problem: callback d'appelant (handler d'événement) utilisé dans un effet qui a des effets de bord non idempotents (focus, listeners). Solution: `const cbRef = useRef(cb); useLayoutEffect(() => { cbRef.current = cb })` puis lecture de `cbRef.current` dans le handler ; deps de l'effet = seulement ce qui doit le rejouer. Anti-pattern: exiger `useCallback` de chaque appelant (5 appelants portaient un commentaire de stabilisation, le 6e l'a oublié).

## Recommandations suite

Les deux suivis proposés par le dev ont été ABSORBÉS dans le sprint (lead) :
- ABSORBED (review MAJEUR) : focus sur `body` après « Continuer » → Tab hors panneau ramené au 1er/dernier focusable + `autoFocus` sur le champ username (`802f8e35`, tests discriminants 2/13 rouges avant).
- ABSORBED (XS) : 5 commentaires d'appelants devenus faux mis à jour (`54342e2f`).

Aucun RECOMMAND_FOLLOWUP restant. Pas de RECOMMAND_TEST_RUNNER : E2E jouée par le lead (suite complète + specs ciblées).

STATUS: COMPLETED
