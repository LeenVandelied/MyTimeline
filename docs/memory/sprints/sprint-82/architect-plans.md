# Mini-plans architect — Sprint 82

> Généré par `/sprint plan 5 -c "focus mvp"` (2026-09-06).

**Thème :** Couverture des règles métier events non protégées — cohésion 0.33
**Effort :** 6 points | **Migrations Flyway :** aucune
**Dépend de :** S78 → S81. Contrainte d'ordonnancement du lot : les issues qui AJOUTENT des
tests passent après celles qui assainissent le harnais, sinon les nouveaux tests sont écrits
sur une base instable.
**Vagues :** V1 = #507 ‖ #491 · V2 = #477

```yaml
issue_507:
  fichiers_cles:
    - "frontend/src/components/EventEditForm.tsx:190-191  (useDebounced, delay = 150)"
    - "frontend/src/components/EventEditForm.tsx:281,306"
    - "frontend/src/components/events/EventPreviewTimeline.tsx:36"
    - ".ai-env/context-packs/br-events.md:143  (BR-EVE-017)"
  couches_touchees: ["frontend"]
  strategie_test: "unit (vitest + fake timers) — le test DOIT être vu ROUGE en rebranchant watch() brut"
  risque_regression: "Un test qui assert seulement « la valeur finit par arriver » passe avec ET sans debounce : c'est précisément le faux positif déjà en place. L'assertion doit porter sur le NON-rendu pendant la fenêtre de 150 ms."
  ordre_ecriture: "test rouge démontré → (aucun code de prod à changer) → test vert"
  zod_dto_sync: "NON"
  possibly_done: false
  etat_reel_du_code: |
    CONFIRMÉ, ET UN PIÈGE QUE L'ISSUE NE NOMME PAS.
    Le mécanisme existe : EventEditForm.tsx:191 `function useDebounced<T>(value, delay = 150)`,
    référencé BR-EVE-017 en commentaire (L190, L306) et dans EventPreviewTimeline.tsx:36
    (« ce composant ne débounce RIEN lui-même »).
    ⚠ UN TEST RESSEMBLE À UNE PROTECTION MAIS N'EN EST PAS UNE :
    NewEventDrawer.test.tsx:488-499 (« l'aperçu épinglé reste LIVE ») cite BR-EVE-017 en
    commentaire, mais son assertion est un waitFor(... toHaveTextContent('Refonte')) — elle
    passerait AUSSI avec watch() brut. Elle protège le portail, pas le debounce.
    Un agent qui grep « BR-EVE-017 » conclura « déjà testé ». Le briefing DOIT citer ce
    fichier:ligne et dire pourquoi il ne compte pas.

issue_491:
  fichiers_cles:
    - "frontend/src/components/EventEditForm.tsx:794  (data-testid=event-form-recurrence-capped-hint)"
    - "frontend/e2e/  (nouvelle spec)"
    - "endpoint POST /api/events/recurrence-preview"
  couches_touchees: ["frontend"]
  strategie_test: "E2E — spec EXÉCUTÉE VERTE avant commit (critère explicite de l'issue)"
  risque_regression: "Aucune sur le produit. Le risque est le pattern « coverage-E2E vert ne prouve rien » : le check Phase 8 vérifie que le testid est CITÉ, pas que la spec passe."
  ordre_ecriture: "spec → run réel → commit"
  zod_dto_sync: "NON"
  possibly_done: false
  etat_reel_du_code: |
    CONFIRMÉ. `event-form-recurrence-capped-hint` est présent :
    - dans le composant : EventEditForm.tsx:794 ;
    - dans 5 assertions unitaires : EventEditForm.test.tsx:553,564,570,577,597 ;
    - ZÉRO occurrence dans frontend/e2e/ (grep sur tout le dossier).
    Le trou annoncé est exactement celui qui existe.

issue_477:
  fichiers_cles:
    - "frontend/src/components/timeline/TimelineView.tsx  (useLayoutEffect sur [dayWidth])"
    - "frontend/e2e/timeline.spec.ts:1443  (test zoom ARRIÈRE #451)"
    - "frontend/e2e/timeline.spec.ts:1599  (2e test d'ancrage, zoom arrière aussi)"
  couches_touchees: ["frontend"]
  strategie_test: "E2E — la spec doit être vue ROUGE en neutralisant le useLayoutEffect"
  risque_regression: "Aucune sur le produit. PIÈGE : ne PAS écrire ce test en jsdom — jsdom ne clampe pas scrollLeft (on écrit 400, on relit 400), un test unitaire de scroll ne prouverait rien."
  ordre_ecriture: "spec zoom avant + 2e couple de niveaux → neutraliser le useLayoutEffect → constater le rouge → rétablir → vert"
  zod_dto_sync: "NON"
  possibly_done: false
  etat_reel_du_code: |
    CONFIRMÉ par lecture des deux tests d'ancrage existants.
    timeline.spec.ts:1443 (« zoom arrière sur une étendue large ») et :1599 (« zone regardée
    près du début ») appellent TOUS DEUX page.getByTestId('timeline-zoom-out').click()
    (L1467 et L1631). AUCUN test d'ancrage n'utilise `timeline-zoom-in`.
    Les 5 autres occurrences de `timeline-zoom-in` (L643, 876-877, 1294-1295) servent à
    positionner l'échelle pour d'autres assertions (week-end…), pas à vérifier la re-projection.
    ⚠ PISTE DE L'ISSUE À NE PAS CROIRE SUR PAROLE : elle cite « TimelineView.tsx:895-912 ».
    Numéro datant du S65, fichier remanié depuis, NON revérifié. Reconfirmer par grep sur
    `useLayoutEffect` + `dayWidth`, jamais par numéro de ligne.
```
