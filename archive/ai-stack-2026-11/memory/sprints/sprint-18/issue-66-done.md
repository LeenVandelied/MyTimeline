# Issue #66 — Formulaire événement (desktop + mobile portrait/paysage)

## Objectif
Refonte `EventEditForm` : schéma Zod unique, `submitState` 4 états, validations
inline BR-EVE-002/003/006/009, preview live debounce 150 ms, section récurrence,
suppression, responsive drawer/bottom-sheet.

## BR couvertes
- BR-EVE-002 (endDate >= startDate) — refine `endErr` + champs date début/fin.
- BR-EVE-003 (titre 1..100) — `titleErr`, mode `onTouched`.
- BR-EVE-006 (recurrenceUnit requis si isRecurring) — `seriesErr`.
- BR-EVE-009 (couleur hex, modèle 1-couleur) — `colorErr` + `HEX_COLOR_REGEX`,
  suppression `borderColor`/`text-white` → ink de contraste calculé (WCAG AA).

## Fichiers clés
- `frontend/src/types/event.ts` — `buildEventEditSchema` + factory i18n
  `createEventEditSchema(t)` + `HEX_COLOR_REGEX`. `eventEditSchema` (messages FR)
  conservé pour service/tests. Refines endDate/color ajoutés. **Aucun doublon**
  (le doublon local avait déjà été supprimé en #150 — audité, confirmé).
- `frontend/src/components/EventEditForm.tsx` — réécriture complète : `EventSubmitState`
  (idle/submitting/error/conflict), preview live `useDebounced(150)`, récurrence
  (`recurrenceEndDate` + hint `capped`), delete via `DeleteConfirmDialog` variante
  `event`, testids `event-form-*`.
- `frontend/src/components/EventContent.tsx` — pilote `submitState`, `onReload` (409
  défensif), `onDelete` ; DialogContent → pattern responsive drawer/bottom-sheet
  (`sm:` unique, cf. ProductDrawer #61). Dates ISO → `slice(0,10)` pour `type=date`.
- `frontend/src/services/eventService.ts` — `deleteEvent(eventId)` (DELETE /events/{id}).
- i18n : `validation.event.*` + `products.add.event.form.{startDate,endDate,
  recurrenceEndDate,recurrenceEndHint}` sur les **4 locales fr/en/es/de**.
- `frontend/vitest.setup.ts` — stub global `ResizeObserver` (Radix Select en jsdom).

## Décisions
- Preview : aucun composant `EventBlock` (#47 inexistant) ni EventBar/EventContent
  adapté → sous-bloc preview local (div colorée durée+titre). Pas de référence à
  un composant fantôme.
- Track charte : aucune Section 16 « Tracks » ni annotation `@track` n'existe dans
  le repo (charte = `docs/design/graphite-handoff.md`, pas de convention Track).
  → JSDoc descriptif standard, PAS de `@track` inventé.
- Responsive : 2 layouts via `sm:` (640px) — bottom-sheet <640px (portrait ET
  paysage), drawer >=640px. Aucune 4e variante paysage (conforme designer).
- Contraste preview : ink noir/blanc calculé par luminance sRGB (remplace
  `text-white` hardcodé illisible sur `--evt-citron` etc.).

## Tests
- `src/types/event.test.ts` : +7 cas (endErr >=, titre vide/>100, hex invalide/valide/vide).
- `src/components/EventEditForm.test.tsx` : 17 cas (4 submitState, 4 validations
  inline, preview, récurrence conditionnelle, pré-remplissage, delete dialog).
- Suite frontend complète : **139 passed / 0 failed**, stderr vide.
- `next build` : 0 erreur (2 warnings pré-existants workspace-root/lockfile).
- `tsc --noEmit` : 0 erreur. ESLint/Prettier : clean sur les fichiers touchés.

## Pitfalls rencontrés
- Radix Select lève `ResizeObserver is not defined` en jsdom → stub global ajouté
  au setup (bénéficie aux futurs tests de Select).
- next-intl : navigation cross-namespace `t('../units.x')` fragile → hooks scopés
  dédiés (`tUnits`, `tTypes`) au lieu de chemins relatifs.

## Hors scope / suivi
- 409 backend events non émis → état `conflict` + `onReload` restent défensifs.
- `onReload` = `window.location.reload()` (l'événement vient d'une prop parent,
  pas d'un cache TanStack isolé) — à raffiner si un hook query event dédié apparaît.
- Champs date début/fin exposés dans le form mais `EventCreationRequest`/PATCH ne
  consomment pas forcément `startDate`/`endDate` (dérivés durée backend) — la garde
  BR-EVE-002 reste front-only, cohérente contrat.

## Corrections review (Sprint 18 — commit de fix dédié)

Findings review (reviewer + ui-design) corrigés, tests non régressés.

### BLOQUANT 1 — Contraste WCAG réel (a11y BR-EVE-009)
Ancienne formule `luminance > 0.5` de `EventEditForm.tsx` faisait FAIL AA sur
10/12 couleurs (citron 2.20:1, ambre 2.14:1, orange 2.85:1 en blanc). Remplacée
par vrai calcul WCAG : luminance relative sRGB (linéarisation gamma) → ratio
`(Lclair+0.05)/(Lsombre+0.05)` → encre (noir `#0B0C0E` vs blanc `#FFFFFF`) qui
MAXIMISE le ratio. Vérifié : citron/ambre/orange → noir (8.9/9.1/6.9:1 PASS),
cobalt/graphite → blanc (6.6/10.6:1 PASS). Aucune couleur sample sous AA avec la
meilleure encre.

### BLOQUANT 2 — Helper mutualisé `frontend/src/lib/color.ts` (+ test)
`contrastInk(hex)` / alias `textOn(hex)` + `relativeLuminance` / `contrastRatio`
exportés. Importé dans `EventEditForm.tsx` ET `EventContent.tsx` (fin de la
duplication). Test `frontend/src/lib/color.test.ts` : palette citron/ambre/orange/
cobalt/graphite, ratio >= 4.5, fallback `var(--color-ink)` sur hex invalide.

### BLOQUANT 3 — `EventContent.tsx` migré modèle 1-couleur + contraste
Barre calendrier (`event-solid-style`) ET preview vue lecture : `borderColor`/
`borderWidth`/`borderStyle` retirés (fond unique BR-EVE-009), `text-white`/
`#ffffff` remplacés par `contrastInk(color)`. Zéro résidu (grep clean hors commentaires).

### MAJEUR 4 — Invalidation cache TanStack v5
`EventContent.tsx` : `useQueryClient` + `invalidateEvents()` (query key
`queryKeys.products.withEvents(user.id)`, source `useProductsWithEvents`) appelé
après update / delete / changement couleur → calendrier rafraîchi (fin des données figées).

### MINEUR 5 — `safeErrorMessage`
`console.error` bruts remplacés par `safeErrorMessage(error)` (handleColorChange +
onSubmit) — zéro fuite objet axios (MEMO-007).

### MINEUR 6 — Parité edit schema `durationUnit` (+ tests)
`types/event.ts` `buildEventEditSchema` : refine `durationUnit` requis si
`type='duration'` (BR-EVE-004), message i18n `durationUnitRequired` ajouté 4 locales.
Tests : rejet sans unité / acceptation avec unité / `single` non contraint.
4 tests existants `type:'duration'` success-expected mis à jour (`durationUnit:'days'`).

### Vérifications
- vitest : **153 passed / 0 failed** (stderr vide).
- `next build` : 0 erreur (warning workspace-root pré-existant seul).
- ESLint : clean sur fichiers touchés.

### Résidus / suivi
- Contraste testé sur 5 couleurs sample de la palette — dark-mode DS non couvert
  par test dédié (fond event = couleur libre, indépendant du thème → risque faible).
  RECOMMAND_FOLLOWUP si des couleurs `--evt-*` très proches de gris moyen restent
  < AA même avec la meilleure encre : trancher halo/charte, pas de bricolage.

STATUS: COMPLETED
