# Arbitrage ui-design — #738 + #739 (Sprint 99, vague 1, lecture seule)

> Rapport de l'agent ui-design recopié par le lead. Décisions du dev consignées en fin de fichier.

## Q1 — #738 : RECO = D (mixte)
- `Input` (`ui/input.tsx:11`) : `max-md:h-11` (garder `text-base md:text-sm`, anti-zoom iOS).
- `SelectTrigger` (`ui/select.tsx:56`) : `max-md:h-11`.
- `SelectItem` (`ui/select.tsx:148`, `py-1.5`) : `max-md:py-3` (valeur non mesurée).
- 0 surcharge existante de hauteur sur Input/Select (6+6 usages).
- `Button` : AUCUNE size cva modifiée. Motifs : (1) `language-selector.tsx:173-174` et `theme-toggle.tsx:118,125` posent `h-9 w-9` + pseudo `before:h-11` au pas serré (PAT-S24-002) — un `max-md:h-11` de variante coexisterait avec leur `h-9` (groupes twMerge distincts) ; (2) `size="sm"` porte la densité voulue de 12 fichiers dashboard/produits (`CompactAgenda`, `DensityRibbon`, `ProductCarousel`, `WeekAgenda`, `TimelineView`, `ProductsListView`…).
  Convention par consommateur : CTA icône isolé → `h-11 w-11` explicite (`settings/page.tsx:57`) ; icônes au pas serré → pseudo `before:h-11` ; boutons denses → `sm` non agrandi.
- Option C (`pointer: coarse`) écartée : désalignée de la bascule `max-width: 767px`, gonfle les tablettes ≥ 768, E2E plus coûteux ; 0 précédent dans le dépôt.
- Mesure E2E : 375×667 `height >= 44` et 1280×720 `height === 36` (Input/SelectTrigger) par `getBoundingClientRect`, pas `toHaveCSS`.

## Q2 — #739 : RECO = (a) exception WCAG 2.5.8 « Equivalent »
- Bouton fermer 44×44 (`BottomSheet.tsx:181` ; `.mt-sheet__close` `timeline.css:879`) + `Escape` sur les deux sheets → la poignée n'a pas à atteindre 44 ; 2.5.7 satisfait par le même bouton.
- Frise : même exception (`TimelineBottomSheet.tsx:141`, Escape `:48-56`).
- Action : corriger `a11y-audit.md:113` et `:149` (« grabber 28 px, exempté par équivalence 2.5.8 (bouton fermer 44×44 + Escape) »).

## Non vérifié (ui-design)
Ordre de sortie CSS Tailwind v4 entre `h-9` et `max-md:h-11` ; `useMediaQuery.ts` ; `test.use({viewport})` locaux de `sprint-77-theme-visual` (le lead a vérifié : 1280×720 aux lignes 577 et 617) ; `max-md` actif en v4 (variante native de Tailwind v4 ; le dépôt utilise déjà `max-[360px]:`, pas encore `max-md:` — à confirmer par compilation) ; hauteur réelle de `SelectItem max-md:py-3`.

## Objection du lead (avant décision du dev)
La reco Q1 laisse les 18 `<Button>` des écrans de réglages (AvatarUpload 3, ExportDataFlow 5, DeleteAccountSteps 4, SessionList 2, Account/Profile/Security 1 chacun, `settings/page.tsx` 1) à 32/36 px : le 1er critère d'acceptation de #738 (« boutons, champs, menus déroulants ≥ 44 px à 375 px ») ne serait PAS rempli. Par ailleurs, en Tailwind v4 les utilitaires à variante (`max-md:`) sortent après les utilitaires nus : l'ordre n'est pas aléatoire, `max-md:h-11` gagnerait sur un `h-9` de consommateur — le risque est un agrandissement réel des icônes au pas serré, pas une indétermination.

## Décisions du dev (2026-09-21)
- **#738 → « Boutons réglages seuls »** (DEC-S99-001) : Input / SelectTrigger / SelectItem agrandis sur la primitive sous 768 px ; `Button` : primitive inchangée, `max-md:h-11` (et `max-md:w-11` pour les icônes) posé sur les boutons des écrans de réglages. Le balayage du reste de l'app mobile → issue de suivi.
- **#739 → « Exception + doc »** (DEC-S99-002) : poignée conservée à 28 px sur les deux sheets (réglages + frise), `a11y-audit.md` corrigé, commentaire de condition dans `BottomSheet.tsx` et `timeline.css`. Livré par le lead (documentation seule, pas de fullstack-dev).
