# Issue #507 — Test de garde BR-EVE-017 (débounce 150 ms de l'aperçu)

RETOUR :
- commits: commit UNIQUE sur `claude/sprint-82-start-f67d87` — `git log --oneline -1 --grep '#507'`
  (le SHA n'est pas figé ici : chaque amend pour l'y inscrire le change ; il est reporté au lead)
- resume: garde exécutable de BR-EVE-017. Nouveau fichier
  `frontend/src/components/EventEditForm.debounce.test.tsx` (3 tests, vitest + `vi.useFakeTimers()`)
  qui assert le NON-rendu pendant la fenêtre : à `t + 149 ms` l'aperçu porte encore l'ANCIENNE valeur,
  la nouvelle n'arrive qu'à `t + 150 ms`. Observables : libellé de `event-form-preview-bar` (titre),
  propriété `--mt-evt` de la barre (couleur), attribut `dateTime` de `event-form-preview-legend`
  (`startDate` → `nextOccurrence`, géométrie dérivée sans mesure de layout — jsdom ne mesure rien).
  Chaque test vérifie d'abord que le champ de saisie porte la nouvelle valeur (sinon un formulaire
  inerte passerait pour un débounce correct).
  BR touchées : BR-EVE-017 (garde), BR-EVE-016 mentionnée (startDate choisie < endDate pour ne pas
  brouiller l'observation avec une erreur de validation).
  Fichiers : `frontend/src/components/EventEditForm.debounce.test.tsx` (nouveau),
  `frontend/src/components/events/NewEventDrawer.test.tsx` (commentaire only — désamorce le faux
  positif), `.ai-env/context-packs/br-events.md` (ligne `**Test**` de BR-EVE-017 recorrigée).
  **ZÉRO code de production modifié** : `EventEditForm.tsx` a été rebranché TEMPORAIREMENT sur
  `watch()` brut pour la démo du rouge, puis restauré (`git diff HEAD` vide sur ce fichier, vérifié).

- preuve rouge/vert:
  Commande : `cd frontend && npx vitest run src/components/EventEditForm.debounce.test.tsx`

  AVANT (rouge) — `EventEditForm.tsx` temporairement rebranché sur `watch()` brut :
    287:  const previewColor = rawColor
    288:  const previewTitle = rawTitle
    307:  const previewStartDate = form.watch('startDate')

    × titre : la barre garde l'ancien libellé pendant la fenêtre, et seulement pendant 103ms
      → Expected text content "Mon événement" / Received "Refonte"
    × couleur : `--mt-evt` reste l'ancienne teinte pendant la fenêtre 35ms
      → AssertionError: expected '#FF0000' to be '#3B82F6'
    × startDate : la fenêtre temporelle de la frise ne se recalcule qu'après 150 ms 31ms
      → AssertionError: expected '2026-04-20' to be '2026-05-01'
    Tests  3 failed (3)

  APRÈS (vert) — code de production restauré à l'identique :
    Test Files  1 passed (1)
    Tests  3 passed (3)

  Non-régression voisine (`EventEditForm.test.tsx` + `NewEventDrawer.test.tsx` + le nouveau) :
    Test Files  3 passed (3)
    Tests  82 passed (82)
  Qualité : `prettier --check` OK, `eslint` OK, `tsc --noEmit` OK.

- [MEMORY:*] signaux:
  [MEMORY:pitfall] Contexte : un test qui CITE un identifiant `BR-*` en commentaire peut ne rien
  garder de cette règle — `NewEventDrawer.test.tsx` citait BR-EVE-017 avec un
  `waitFor(toHaveTextContent(…))` qui passe à l'identique avec ET sans débounce (il protégeait le
  portail d'affichage). Solution : classer un test comme garde d'une règle SEULEMENT après avoir vu
  l'assertion rougir sur la violation de cette règle. Prévention : pour toute règle « X passe par un
  intermédiaire », l'assertion doit porter sur le NON-effet pendant la fenêtre (ancienne valeur
  encore présente), jamais sur « la valeur finit par arriver » — cette dernière forme est vraie dans
  les deux mondes. Corollaire : `grep BR-XXX` ne mesure pas la couverture, il mesure la citation
  (déjà vu au S61 avec le check coverage-E2E).

  [MEMORY:pattern] Problème : prouver en jsdom qu'une valeur transite par un débounce.
  Solution : `vi.useFakeTimers()` + `fireEvent.change` (pas `userEvent` — pas d'interaction fragile
  avec les timers factices), puis `await act(async () => vi.advanceTimersByTime(DELAY - 1))` →
  assert ANCIENNE valeur, puis `advance(1)` → assert nouvelle. Le `await act(async …)` (et non
  `act(…)` synchrone) est requis : le resolver Zod de react-hook-form résout des microtâches à
  chaque frappe. Ajouter systématiquement un garde-fou « le champ de saisie porte bien la nouvelle
  valeur » juste après la frappe, sinon un formulaire inerte ou un testid renommé produit un faux
  vert. Anti-pattern : `waitFor(…)` sur la valeur finale ; et toute assertion de géométrie en pixels
  (jsdom ne mesure ni ne clampe le layout) — prendre un observable textuel ou déclaratif dérivé.

  [MEMORY:decision] Contexte : la ligne `**Test**` de BR-EVE-017 dans `br-events.md` désignait le
  faux positif comme sa garde. Décision : recibler la ligne sur le nouveau fichier ET y écrire
  explicitement de NE PAS compter `NewEventDrawer.test.tsx`, plus un commentaire au point d'origine
  dans ce test. Pourquoi : sans les deux bouts, le prochain contributeur refait le raisonnement
  « BR-EVE-017 est déjà couverte » — c'est le mode de propagation décrit par PIT-S70-001.

## Recommandations suite

- **Pas de `RECOMMAND_TEST_RUNNER`** : suite ciblée, 3 fichiers, 82 tests, exécution locale déjà
  faite (< 10 s). Pas de `RECOMMAND_DB_EXPERT` ni `RECOMMAND_SECURITY` : périmètre frontend pur,
  aucun schéma ni surface d'auth touchés.
- `RECOMMAND_FOLLOWUP` (P3, taille XS) — **auditer les autres tests qui CITENT un `BR-*` sans le
  garder.** Le cas #507 n'a aucune raison d'être unique : la citation d'un identifiant en
  commentaire est aujourd'hui le seul lien entre une règle et son test, et rien ne le vérifie. Piste
  bon marché : lister les `BR-*` cités dans `frontend/src/**/*.test.tsx` et, pour chacun, se demander
  si l'assertion rougirait sur la violation. Ne PAS en faire un check automatisé (impossible à
  décider mécaniquement) — un passage manuel documenté suffit.
- `RECOMMAND_FOLLOWUP` (P3, taille XS) — la ligne `**Test**` de plusieurs BR du pack `br-events.md`
  n'a jamais été revérifiée depuis son écriture. Rien ne prouve que #507 soit le seul renvoi périmé ;
  un balayage des ~17 BR du domaine dirait si c'est un incident isolé ou un motif.

## Ce qui N'A PAS été vérifié / limites assumées

- **Aucun E2E.** L'exclusivité Playwright était donnée à #491 sur cette vague (verrou `globalSetup`) :
  la garde est unitaire uniquement. En conséquence elle prouve que les props de l'aperçu transitent
  par un `setTimeout` de 150 ms, **pas** que l'utilisateur perçoit une frise stable à la saisie
  (coût de rendu réel, jank). Cette seconde propriété reste non couverte — et n'était pas demandée
  par l'issue.
- **Les valeurs `endDate`, `isRecurring`, `recurrenceUnit`, `recurrenceEndDate`, `type`,
  `durationValue`, `durationUnit` ne sont PAS couvertes individuellement** : les 3 tests couvrent
  titre, couleur et `startDate`. Un contributeur qui rebrancherait UNIQUEMENT `previewEndDate` sur
  `watch()` brut ne ferait rougir aucun test. Couverture par échantillon, assumée pour une taille S.
- Le débounce n'est pas testé sur sa propriété de COALESCENCE (N frappes rapprochées ⇒ 1 seul rendu
  final) — seulement sur le retard. Un `useDebounced` qui ne réarmerait pas son timer passerait.
- La suite frontend complète n'a pas été jouée (working tree partagé avec l'agent de #491) : seuls
  les 3 fichiers concernés l'ont été. La CI tranchera.

STATUS: COMPLETED
