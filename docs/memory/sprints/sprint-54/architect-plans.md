# Mini-plans architect — Sprint 54

> Généré par /sprint plan (architect, 2026-07-28, ancrage HEAD fc2a3a0). Lu par /sprint start Phase 4.1.

## Thème : Réarmement du filet E2E de la frise — cohésion 0.46
## Milestone GitHub : #54 | Effort : 8 pts | Migrations : aucune | Dépend de : S51 (#328/#349/#351 modifient le comportement de scroll/virtualisation que ces specs asserteront)

## Vagues
- Vague 1 (parallèle, fichiers disjoints) : #331 (`EventEditForm.tsx`, `NewEventDrawer.tsx`), #329 (`e2e/auth.setup.ts`)
- Vague 2 (après vague 1) : #330 (specs E2E — consomme les testids posés par #331)

## Ordre imposé
#331 avant #330 : écrire 18 specs contre des sélecteurs `.nth(n)` puis les réécrire = double travail.
Rappel E2E local (mémoire projet) : workers=1 obligatoire, CORS :3000 peut se déguiser en « rate-limit ».

```yaml
issue_0330:
  fichiers_cles:
    - "frontend/e2e/timeline.spec.ts"
    - "frontend/e2e/timeline-mobile.spec.ts"
    - "frontend/src/components/timeline/TimelineView.tsx"
  couches_touchees: ["frontend"]
  strategie_test: "E2E"
  risque_regression: "18 testids traités comme une PR atomique = dérive garantie ; l'issue elle-même recommande le découpage par lot fonctionnel."
  ordre_ecriture: "3 lots : (a) drawer/overlays — timeline-drawer, -close, -overlay, -landscape-drawer-overlay, -actionsheet-overlay, -sheet-overlay, -sheet-grabber ; (b) contrôles — timeline-zoom-out, -help, -fullscreen, -today, -weekend ; (c) minimap/états — timeline-minimap-viewport, -loading, -live-region, -event-outside-label, desktop-edit-trigger, mobile-delete-trigger. Un lot = un commit."
  zod_dto_sync: "NON"
  possibly_done: false
  etat_reel_du_code: |
    Confirmé non couvert. Échantillon de 8 des 18 testids grepé sur tout frontend/e2e/ :
    timeline-drawer, -help, -today, -weekend, -zoom-out, -minimap-viewport, -loading, -fullscreen
    → 0 spec pour CHACUN des 8. Les 20 specs de frontend/e2e/ n'en exercent aucun.

issue_0331:
  fichiers_cles:
    - "frontend/src/components/EventEditForm.tsx"
    - "frontend/src/components/events/NewEventDrawer.tsx"
    - "frontend/e2e/timeline.spec.ts"
  couches_touchees: ["frontend"]
  strategie_test: "E2E"
  risque_regression: "Aucun — ajout d'attributs non intrusif. Le risque réel est de NE PAS le faire : un réordonnancement des options fait cliquer les tests sur la mauvaise valeur, sans alerte."
  ordre_ecriture: "Suivre la convention existante ProductDrawer.tsx:315 `product-category-option-${id}`."
  zod_dto_sync: "NON"
  possibly_done: false
  etat_reel_du_code: |
    ⚠ CHEMIN CORRIGÉ : `EventEditForm.tsx` est à la RACINE de components/ (PAS components/events/).
    SelectItem WEEK/MONTH/YEAR aux lignes 436-438, sans data-testid. Sélecteur produit :
    NewEventDrawer.tsx:215-217, sans data-testid. Ciblage fragile confirmé :
    timeline.spec.ts:221 `.getByRole('option').nth(1).click()`.

issue_0329:
  fichiers_cles:
    - "frontend/e2e/auth.setup.ts"
  couches_touchees: ["frontend"]
  strategie_test: "E2E"
  risque_regression: "Un retry mal calibré masque un vrai bug de rendu récurrent — le message final doit lister le nombre de tentatives et la nature de la dernière erreur."
  ordre_ecriture: "PÉRIMÈTRE PRÉCISÉ : le correctif porte sur les lignes 46-47 (goto + expect register-form, hors boucle), PAS sur la boucle REGISTER_RETRIES existante (lignes 50-71). Corriger aussi le message d'échec en dur lignes 63-66."
  zod_dto_sync: "NON"
  possibly_done: false
  etat_reel_du_code: |
    Confirmé. Un retry EXISTE (boucle REGISTER_RETRIES lignes 50-71) mais couvre uniquement la
    soumission. Le rendu initial (goto /fr/register ligne 46 + toBeVisible ligne 47) n'est pas
    protégé — un 500 transitoire jette immédiatement, sans page.reload().
```
