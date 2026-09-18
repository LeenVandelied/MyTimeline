# Issue #46 — Porter les composants core du DS dans Storybook

commits:
- b6a9b9e :lipstick: Stories Storybook composants core DS Graphite (#46)

## resume

Composants DS créés (émettent classes `.mt-*` de `ds/components/core.css`, zéro hex/px en dur) :
IconButton, Textarea, Radio, Switch, Badge, Tag, Avatar, Tabs, Table, Toast, Tooltip (11).

Stories colocalisées `*.stories.tsx` (CSF3) — 17 : Button (complétée: variants×tailles+AllVariants),
IconButton, Input, Textarea, Select, Checkbox, Radio, Switch, Badge, Tag, Avatar, Card, Tabs,
Table, Toast, Tooltip, Dialog. Couvre 100% de la liste du briefing.

Composants EXISTANTS (shadcn/Radix) storyés tels quels : leurs classes utilitaires Tailwind
(`bg-primary`, `border-input`, `bg-card`…) sont déjà remappées aux tokens Graphite via la couche
`@theme` de `globals.css` → donc DÉJÀ alignés DS sans réécriture (évite de casser l'app).
Composants MANQUANTS créés en natif `.mt-*`.

Tokens/classes consommés : `.mt-btn/.mt-iconbtn/.mt-field/.mt-input/.mt-textarea/.mt-select__*/
.mt-check/.mt-radio/.mt-switch/.mt-badge/.mt-tag/.mt-avatar/.mt-card/.mt-tabs/.mt-tab/.mt-table/
.mt-toast/.mt-tooltip/.mt-dialog` + tokens event `var(--color-evt-*)` (Tag).

core.css chargé UNIQUEMENT dans `.storybook/preview.ts` (import dédié) — `globals.css` app reste
lean (respect décision #45 : app ne charge pas core.css).

calendar.tsx : ABSENT + `react-day-picker` NON installé (grep 0) → décision **N/A, déjà absent,
aucune action**.

Vérifs : `tsc --noEmit` OK (0 erreur, strict), `eslint src/components/ui/*.tsx` OK (0),
`vitest run` OK (85/85, aucune régression), prettier appliqué (Husky pre-commit).

## build storybook : KO (BLOQUANT, pré-existant, HORS #46)

`npm run build-storybook` échoue AVANT tout parsing de story :
`CriticalPresetLoadError: Cannot find module 'next/dist/build/webpack/plugins/define-env-plugin.js'`.

Cause : commit d6745f5 (bump CVE #161) a monté `next` 15.2.4 → **15.5.20** (caret). Next 15.5 a
supprimé/déplacé `define-env-plugin.js`, requis par `vite-plugin-storybook-nextjs@1.1.5`
(transitif de `@storybook/experimental-nextjs-vite@8.6.18`). Aucune version du plugin ne supporte
à la fois SB 8.6 ET Next 15.5 (les 2.x+ exigent Storybook 9+). Reproduit sans mes changements
(preset chargé en amont). Vérifié : `require.resolve` échoue, `find` 0 fichier `*define*`.

Options (toutes > scope M, infra partagée) : migration Storybook 8→9, OU repin Next 15.2.x
(annulerait un fix CVE), OU shim durable du module. → follow-up dédié requis.

## [MEMORY:*] signaux

- [MEMORY:decision] Convention stories DS établie (réutilisable #47) : fichiers `*.stories.tsx`
  colocalisés à côté du composant sous `src/components/**`, format CSF3 (`Meta`/`StoryObj`,
  `satisfies Meta<typeof X>`), `tags: ['autodocs']`, titres `UI/<Composant>`. Les composants
  consomment les classes `.mt-*` de `ds/components/core.css` ; les composants shadcn/Radix
  existants sont alignés via le remap `@theme` de globals.css (pas de réécriture). core.css est
  chargé côté Storybook uniquement (preview.ts), pas dans globals.css app (décision #45).
- [MEMORY:bug] Cause: bump CVE next 15.2→15.5 (#161) casse le preset Storybook Vite (define-env-
  plugin.js supprimé de Next). Solution: non résolu (follow-up). Rule: après tout bump majeur/mineur
  de `next`, relancer `npm run build-storybook` — les tests vitest ne couvrent pas le preset SB.

## recommandations suite

- RECOMMAND_FOLLOWUP (BLOQUANT, P1) : réparer `npm run build-storybook` cassé par bump Next 15.5
  (#161). Décider migration Storybook 9 vs repin Next 15.2.x. Sans ça l'AC build Storybook reste KO
  et le CI storybook (si présent) rouge.
- RECOMMAND_UI_DESIGN (P2) : revue visuelle des 17 stories en clair ET sombre une fois le build SB
  réparé — vérifier l'alignement pixel des composants shadcn remappés vs specs Graphite core.css
  (surtout Input/Select/Checkbox/Card/Dialog qui gardent le rendu shadcn, pas les classes .mt-*).

## RÉSOLUTION BLOCAGE (lead, 2026-07-03)

Le blocage `build-storybook` a été traité par un fix infra absorbé dans le sprint (décision dev) :
migration **Storybook 8.6 → 10.4.6** (commit 06dfc4c, framework `@storybook/nextjs-vite`, Next 15.5.20
conservé, CVE #161 intact). Après migration : `build-storybook` **OK** (17 stories buildées, exit 0),
vitest 85/85 vert, tsc vert. Tous les AC de #46 sont désormais satisfaits, y compris le build Storybook.

STATUS: COMPLETED
Note: initialement PARTIAL (build-storybook bloqué par infra pré-existante) — débloqué par le fix
infra SB8→10 (cf. issue-sb-infra-done.md, commit 06dfc4c).
