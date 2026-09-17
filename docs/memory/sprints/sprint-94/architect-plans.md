# Mini-plans architect — Sprint 94

> Généré par /sprint plan (architect, 2026-09-15, axe « bugs du parcours »). Lu par /sprint start Phase 4.1.
> Prémisses #672, #712, #706 contre-vérifiées par le lead.

**Vagues :** V1 = #672 (unit seulement) ∥ #706 (E2E exclusif) | V2 = #712 (TimelineView.tsx après #672) + E2E de #672
**Extension si capacité :** #677 (S, preuve du verrou modal du formulaire d'événement)
**Migrations Flyway :** aucune

```yaml
issue_672:
  fichiers_cles:
    - "frontend/src/components/timeline/TimelineView.tsx:1294-1341 (onKey, garde typing :1297-1301, Escape :1302-1309)"
    - "frontend/src/components/timeline/EventDrawer.tsx:55-56 (role=dialog aria-modal=true, DANS rootRef)"
    - "frontend/src/components/ui/dialog.tsx"
    - "frontend/src/components/events/NewEventDrawer.tsx"
    - "frontend/src/components/layout/CreateEventContext.tsx"
    - "frontend/e2e/timeline.spec.ts"
    - "frontend/e2e/sprint-85-timeline-toolbar.spec.ts"
  couches_touchees: ["frontend-timeline"]
  strategie_test: "unit + E2E avec le VRAI NewEventDrawer (focus sur un bouton du formulaire, F/T/+/[ → aucun effet ; drawer fermé → effet)"
  risque_regression: "une garde « tout [aria-modal] » coupe aussi T/[/] quand l'EventDrawer de la frise est ouvert (EventDrawer.tsx:56)"
  ordre_ecriture: "reproduction (focus bouton/radio palette, pas INPUT) → test rouge → garde → vérifier branche Escape"
  zod_dto_sync: "NON"
  possibly_done: false
  etat_reel_du_code: "Garde limitée à INPUT/TEXTAREA/contentEditable ; aucun test dialog ouvert."
  ecart_enonce_code: "Piste `[role=dialog][aria-modal=true]` INOPÉRANTE : @radix-ui/react-dialog ne pose aucun aria-modal (0 occurrence dans dist/index.mjs, vérifié lead) → ne matche pas le drawer de création ; matche en revanche l'EventDrawer de la frise. Recommandation : `[role=dialog][data-state=open]` HORS rootRef, ou état exposé par CreateEventContext. Escape traité AVANT la garde : dans un dialog Radix il quitte aussi le plein écran (à vérifier)."
  memory_signal: "[MEMORY:decision] à trancher : garde des raccourcis sur « dialog Radix ouvert hors rootRef »"

issue_712:
  fichiers_cles:
    - "frontend/src/components/timeline/TimelineView.tsx:1745-1762 (onEdit → onEditEvent sans quitter le plein écran)"
    - "TimelineView.tsx:1255-1267 (onNewEvent : quitte le plein écran, DEC-S85-003)"
    - "TimelineView.tsx:611,1489-1491 (rootRef = <section>)"
    - "frontend/src/components/timeline/TimelineEditHost.tsx:61,211 (Dialog Radix hors rootRef)"
    - "frontend/e2e/sprint-92-business-toasts.spec.ts:193"
    - "frontend/e2e/timeline.spec.ts"
  couches_touchees: ["frontend-timeline"]
  strategie_test: "E2E (plein écran → clic événement → Éditer → drawer visible, focus dedans, toast visible après enregistrement) + unit"
  risque_regression: "exitFullscreen() asynchrone : ouvrir le Dialog avant fullscreenchange capture le focus dans un contexte encore plein écran"
  ordre_ecriture: "stratégie symétrique de onNewEvent en attendant la promesse exitFullscreen → E2E → rejouer sprint-92-business-toasts:193"
  zod_dto_sync: "NON"
  possibly_done: false
  etat_reel_du_code: "EventDrawer dans rootRef ; TimelineEditHost et AppToaster (layout.tsx:86) hors rootRef ; seul onNewEvent quitte le plein écran (vérifié lead)."
  ecart_enonce_code: "aucun ; stratégie « toaster dans le plein écran » déconseillée (toaster global au layout)"
  non_verifie: "support requestFullscreen sous Chromium headless"

issue_706:
  fichiers_cles:
    - "frontend/src/components/timeline/TimelineMobilePortrait.tsx:255-320 (label sticky dans la lane + evt-wrap left=event.leftPx)"
    - "frontend/src/components/timeline/TimelineMobileLandscape.tsx (idem)"
    - "frontend/src/components/timeline/useTimelineMobileState.ts:142 (railWidth), :182 (todayLeftPx), :231-248 (minimap seek, scrollToToday), :290-307 (restauration #328)"
    - "frontend/src/styles/ds/components/timeline.css:721-734 (lane-label sticky max-width 120px, evt-wrap absolute)"
    - "référence desktop TimelineView.tsx:192 (LANE_TRACK_OFFSET_PX=168), :625"
  couches_touchees: ["frontend-timeline-mobile", "ds-css"]
  strategie_test: "E2E elementFromPoint au centre d'un événement en DÉBUT de plage et d'un événement ciblé, 390×844 et 844×520 + non-régression desktop #392"
  risque_regression: "décaler le rail déplace toutes les coordonnées mobiles (règle, Aujourd'hui, fantômes #595, minimap, restauration #328) ; specs citant la frise mobile : timeline-mobile, sprint-91-event-pin, sprint-91-recurrence-marks, sprint-91-more-contrast, sprint-92-business-toasts, sprint-90-first-contact, sprint-66-mobile-*, sprint-62, sprint-63 → régénérer la liste grep COMPLÈTE au démarrage"
  ordre_ecriture: "E2E rouge (événement au 1er jour de plage) → largeur fixe du label → offset de piste sur rail + toutes abscisses → scrollToToday/restauration → specs mobiles"
  zod_dto_sync: "NON"
  possibly_done: false
  etat_reel_du_code: "Défaut STRUCTUREL : label sticky left:0 en flux, événements absolus sans offset de piste (vérifié lead dans timeline.css)."
  ecart_enonce_code: "L'énoncé cible ensureVisible/centrage Aujourd'hui : le mobile n'a pas d'ensureVisible, scrollToToday centre déjà. Largeur de label variable (max-width 120px). Taille S → risque M."
```
