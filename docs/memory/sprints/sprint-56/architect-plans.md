# Mini-plans architect — Sprint 56

> Généré par `/sprint plan 5` (architect, 2026-07-30). Lu par `/sprint start 56` Phase 4.1.
>
> **Thème :** La frise redevient utilisable à la souris — 6 pts, cohésion 0.44.
> **Vagues :** V1 = #392 ∥ #393 | V2 = #395 | V3 = #391
> Trois vagues pour 4 issues : #392, #395 et #391 modifient **toutes** `frontend/e2e/timeline.spec.ts`
> (#392 fait passer le test d'interception, #395 asserte `aria-pressed`, #391 lève le `test.skip()`
> de `timeline.spec.ts:860`). #392 et #395 modifient en plus tous deux `TimelineView.tsx`.
> **Milestone GitHub :** #57.
>
> **Contribution au critère MVP local :** fait passer au vert « créer un événement → voir sa frise,
> sans écran cassé ». #392 est le **seul défaut vérifié du parcours cœur qui rend une action
> utilisateur impossible** (événement non cliquable, prouvé par Playwright).

## ⚠ Garde-fous d'environnement

Identiques au Sprint 55 : `git show-ref origin/dev` (jamais `git log origin/dev`), lectures via
`git show origin/dev:<path>`.

## Mini-plans

```yaml
issue_392:
  fichiers_cles: ["frontend/src/components/timeline/TimelineView.tsx", "frontend/src/styles/ds/tokens/spacing.css", "frontend/src/styles/ds/components/timeline.css", "frontend/e2e/timeline.spec.ts"]
  couches_touchees: ["frontend"]
  strategie_test: "E2E"
  risque_regression: "le sticky de .mt-tlv__lane-label est partage par toutes les lanes : un pointer-events:none mal borne rend l'en-tete de produit non cliquable (le repli/deploiement de lane est teste en E2E ligne 408)"
  ordre_ecriture: "reproduire l'interception en E2E -> choisir entre offset de piste / pointer-events -> revalider les 4 zooms au navigateur"
  zod_dto_sync: "NON"
  possibly_done: false
  etat_reel_du_code: "verifie origin/dev : TimelineView.tsx:327 porte className mt-tlv__lane-label mt-tlv__lane-head ; spacing.css:48 --lane-header-w: 168px. Non corrige."

issue_393:
  fichiers_cles: ["frontend/src/types/event.ts"]
  strategie_test: "navigateur (mesure de contraste sur pastille rendue)"
  risque_regression: "changer DEFAULT_COLOR modifie la couleur de tout evenement existant sans couleur explicite — verifier qu'aucune fixture E2E ne l'asserte en dur"
  possibly_done: false
  etat_reel_du_code: "verifie origin/dev : types/event.ts:128 DEFAULT_COLOR = '#6366f1', consomme ligne 143 par mapToFullCalendarEvent. Non corrige."

issue_395:
  fichiers_cles: ["frontend/src/components/timeline/TimelineView.tsx", "frontend/e2e/timeline.spec.ts"]
  couches_touchees: ["frontend"]
  strategie_test: "E2E"
  risque_regression: "aria-pressed sur un bouton qui n'est pas un toggle ARIA valide changerait l'annonce lecteur d'ecran ; le bouton porte deja aria-label"
  ordre_ecriture: "aria-pressed sur le bouton -> asserter la bascule en E2E -> verifier que le test rougit si on neutralise le handler"
  zod_dto_sync: "NON"
  possibly_done: false
  etat_reel_du_code: "verifie origin/dev : TimelineView.tsx:996-1002, bouton timeline-fullscreen sans aucun aria-pressed. Non corrige."

issue_391:
  fichiers_cles: ["frontend/app/[locale]/(app)/timeline/page.tsx", "frontend/e2e/timeline.spec.ts"]
  strategie_test: "E2E (le test.skip leve EST la preuve)"
  possibly_done: false
  etat_reel_du_code: "verifie origin/dev : page.tsx:43-47 porte encore la branche if (loading) avec data-testid=timeline-loading ; un second testid timeline-data-loading existe ligne 79 (a NE PAS confondre, lui est atteignable et teste)"
```

## Vérification exigée

- **#392** → E2E **obligatoire** : jsdom ne fait pas de hit-testing, un test unitaire ne verra
  jamais « intercepts pointer events ». Plus **navigateur clair + sombre aux 4 niveaux de zoom**
  (Semaine / Mois / Trimestre / Année) pour la non-régression du sticky.
- **#393** → mesure de contraste réelle sur une pastille rendue, clair **et** sombre.
- **#395** → E2E.
- **#391** → E2E (le `skip` levé est la preuve).
