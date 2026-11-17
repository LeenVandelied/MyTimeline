# Mini-plans architect — Sprint 58

> Généré par `/sprint plan 5` (architect, 2026-07-30). Lu par `/sprint start 58` Phase 4.1.
>
> **Thème :** La cascade `:focus-visible` et la dette WCAG du design system — 8 pts, cohésion 0.87.
> **Vagues :** V1 = #383 **seule** | V2 = #353 ∥ #352 ∥ #375
> **Milestone GitHub :** #59.
>
> **Contribution au critère MVP local :** « sans écran cassé » sur l'ensemble de l'application
> connectée — #383 impose aujourd'hui un `border-radius: 3px` sur **tout** élément focalisé et
> annule les `outline-none`, donc sur chaque formulaire du parcours cœur.

## ⚠ Sprint le plus susceptible de déraper — deux avertissements mesurés

**1. #383 est sous-estimée d'un facteur 2.** L'issue annonce « ~14 sites » ; le comptage réel sur
`origin/dev` donne **33 occurrences de `outline-none`/`outline-hidden` dans 20 fichiers**.
L'estimation M (3 pts) est vraisemblablement fausse. À re-challenger au démarrage.

**2. Régression WCAG 1.4.11 CERTAINE si on layerise naïvement.**
`frontend/src/components/ui/language-selector.tsx` n'a **aucun anneau de focus propre** : ce contour
global est son unique indicateur. Idem `ExportDataFlow.tsx` (`h3 tabIndex=-1 class=outline-none`).
Layeriser avant d'avoir donné un indicateur propre à chaque site = **perte d'indicateur de focus**.

**3. #383 seule en V1** : elle touche `ds/tokens/base.css` (fichier partagé à risque) **plus** les
33 sites, dont `ui/checkbox.tsx` (que #352 modifie) et `ui/language-selector.tsx` (que #353
modifie). #375 doit passer **après** #383 : mesurer la règle actuelle serait du travail perdu.

⚠ **#342 (non planifiée) touche `language-selector.tsx`** — ne pas la planifier dans un sprint
parallèle.

## Mini-plans

```yaml
issue_383:
  fichiers_cles: ["frontend/src/styles/ds/tokens/base.css", "frontend/src/components/ui/language-selector.tsx", "frontend/src/components/settings/ExportDataFlow.tsx", "frontend/src/components/ui/button.tsx", "frontend/src/components/ui/checkbox.tsx", "frontend/src/components/ui/select.tsx", "frontend/src/components/ui/input.tsx", "frontend/src/components/ui/dialog.tsx", "frontend/src/components/ui/popover.tsx", "frontend/src/components/ui/dropdown-menu.tsx", "frontend/src/components/layout/AppShell.tsx", "frontend/src/components/shared/StateScreen.tsx", "frontend/src/components/landing/HeaderSection.tsx", "frontend/src/components/landing/LandingMobileMenu.tsx", "frontend/src/components/products/ProductsListView.tsx", "frontend/src/components/products/CategoriesView.tsx", "frontend/src/components/settings/SettingsShell.tsx", "frontend/src/components/settings/AvatarUpload.tsx", "frontend/src/components/settings/mobile/BottomSheet.tsx", "frontend/src/components/settings/mobile/SettingsIndex.tsx", "frontend/src/components/settings/mobile/MobileSettings.tsx"]
  couches_touchees: ["frontend"]
  strategie_test: "navigateur (clair + sombre) — un test unitaire est structurellement incapable de prouver ce correctif"
  risque_regression: "REGRESSION WCAG 1.4.11 CERTAINE si layerise naivement : language-selector.tsx n'a AUCUN anneau propre, ce contour global est son unique indicateur de focus. Idem ExportDataFlow.tsx. Layeriser AVANT d'avoir donne un indicateur propre a chaque site = perte d'indicateur de focus."
  ordre_ecriture: "arbitrage ui-design (un reset de focus a-t-il le droit d'imposer un border-radius ?) -> inventorier les 33 occurrences -> donner a CHAQUE site son propre indicateur -> SEULEMENT ENSUITE layeriser :focus-visible dans @layer base -> repasser au navigateur clair+sombre sur les 33 sites"
  zod_dto_sync: "NON"
  possibly_done: false
  etat_reel_du_code: "CONFIRME sur origin/dev : base.css:128 declare :focus-visible HORS de tout @layer (le seul @layer base du fichier se ferme avant). base.css:108-114 porte un commentaire explicite CONFLIT REEL, DELIBEREMENT NON CORRIGE ICI. Comptage reel : 33 occurrences dans 20 fichiers (l'issue annonce ~14 — SOUS-ESTIME d'un facteur 2)."

issue_375:
  fichiers_cles: ["frontend/src/styles/ds/tokens/base.css", "frontend/src/components/ui/language-selector.tsx"]
  couches_touchees: ["frontend"]
  strategie_test: "navigateur (Firefox + WebKit, clair + sombre = 4 combinaisons)"
  risque_regression: "aucun code modifie si conforme ; si non conforme la conformite WCAG 2.4.7 annoncee au S52 doit etre retiree"
  ordre_ecriture: "APRES #383 (mesurer la regle finale, pas l'actuelle)"
  zod_dto_sync: "NON"
  possibly_done: false
  etat_reel_du_code: "verifie origin/dev : la regle mesuree au S52 est toujours en place (base.css:128-132, outline 2px solid var(--color-focus), offset 2px, border-radius var(--radius-xs)). Les lignes citees par l'issue (51-55) sont perimees, la vraie position est 128-132."

issue_352:
  fichiers_cles: ["frontend/src/styles/ds/components/timeline.css", "frontend/src/styles/landing.css", "frontend/src/components/ui/checkbox.tsx", "frontend/src/styles/ds/readme.md", "frontend/src/styles/ds/components/core.css"]
  couches_touchees: ["frontend"]
  strategie_test: "navigateur (clair + sombre, mesure en situation sur fond de lane)"
  risque_regression: "sur-migrer les bordures decoratives alourdit visuellement la frise ; le contraste depend du fond derriere la bordure, pas du token"
  ordre_ecriture: "APRES #383 (checkbox.tsx est un des 33 sites outline-none) -> classer les 19 occurrences fonctionnelle/decorative en commentaire in-situ -> migrer -> mesurer clair+sombre"
  zod_dto_sync: "NON"
  possibly_done: false
  etat_reel_du_code: "COMPTAGE CONFIRME sur origin/dev : exactement 16 occurrences de rule-strong dans ds/components/timeline.css et exactement 3 dans styles/landing.css. .mt-check__box et ui/checkbox.tsx existent bien."

issue_353:
  fichiers_cles: ["frontend/src/components/ui/language-selector.tsx", "frontend/messages/*.json (4 locales — chemin exact a determiner par fullstack-dev)"]
  couches_touchees: ["frontend"]
  strategie_test: "navigateur (bounding box reelle + scrollWidth a 320/375/390) + unit i18n"
  risque_regression: "agrandir le declencheur dans un header deja sujet au debordement horizontal peut recreer le scroll-x que #347 a solde ; et #383 (meme sprint) modifie CE fichier pour lui donner un anneau de focus propre — sequencer strictement"
  ordre_ecriture: "APRES #383 -> passer le declencheur a 44x44 -> externaliser la chaine -> 4 traductions -> mesurer scrollWidth aux 3 largeurs"
  zod_dto_sync: "NON"
  possibly_done: false
  etat_reel_du_code: "CONFIRME sur origin/dev : language-selector.tsx:83 className='h-9 w-9 rounded-full' (36x36), ligne 85 <span className='sr-only'>Changer de langue</span> en dur. Les deux defauts sont intacts. L'issue cite la ligne 29, la vraie est 85."
```

## Vérification exigée

**Navigateur clair + sombre obligatoire pour les 4 issues. Aucun test unitaire n'est recevable** —
jsdom ne résout pas `@layer` (c'est exactement le mécanisme en cause dans #383) ni le layout
(bounding box de #353).
- **#375** exige en plus **Firefox et WebKit** explicitement.
- **#352** exige des mesures de contraste **en situation** (le ratio dépend du fond de lane, pas du token).
- **#353** exige la bounding box réelle **plus** `scrollWidth <= clientWidth` à 320 / 375 / 390 px.

## Arbitrage requis AVANT le début du sprint

**#383 : un reset de focus a-t-il le droit d'imposer un `border-radius` ?** (`ui-design`).
**#352 :** classement fonctionnel vs décoratif des 19 bordures.
