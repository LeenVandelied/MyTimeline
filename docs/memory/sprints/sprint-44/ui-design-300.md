# ui-design preview — Issue #300 (drawer création 452px)

VERDICT initial : REJET (6 gaps vs handoff §6) → briefing V2 amendé + 2 décisions dev (2026-07-16).

## Gaps → résolutions intégrées au briefing
1. Largeur : `.mt-drawer` = 420px hardcodé (`timeline.css:145`), pas de token 452px → nouveau token `--drawer-width-form: 452px` (spacing.css, précédent `--sidebar-width`) et/ou variante `.mt-drawer--form`. `.mt-drawer` 420px INTACT (drawer détail).
2. Aperçu live : handoff §6 = mini-frise (ruler/TODAY/fantôme/légende) ; existant = bloc couleur simple. **DÉCISION DEV : scope réduit — preview simple ce sprint, mini-frise §6 = follow-up [M | events]** + [MEMORY:decision].
3. Schéma : `eventEditSchema` sans `productId` → schéma création avec `productId` requis (create-only), sync `EventCreationRequest`.
4. Combobox produit : n'existe pas dans la codebase → **DÉCISION : `Select` shadcn existant**, pas de nouveau composant (charte). Recherche réelle si besoin = follow-up.
5. Mobile : réutiliser `.mt-sheet` bottom sheet < lg + fermer 44×44 (`.mt-drawer__close--touch`), parité drawer détail (`timeline.css:280-311`).
6. Focus trap : extraire celui d'`EventDrawer.tsx:1-40` en hook partagé, pas de duplication.

## Non-bloquant
- Récurrence : parité fonctionnelle édition (WEEK/MONTH/YEAR) même si le mock §6 ne montre que Aucune/Mensuelle/Annuelle — divergence assumée à noter.
- testids convention `{zone}-{component}-{role}-{id}` ; faire évoluer `shell-new-event-dialog`.
- i18n : remplacer clés `createDialog.*` (4 locales).
- Note agent : pas de système multi-Track dans ce projet — charte = `graphite-handoff.md` seul.

Réfs : AppShell.tsx:60,142-255 ; EventDrawer.tsx:1-40 ; EventEditForm.tsx:443-459 ; types/event.ts:100-262 ; ds/components/timeline.css:145,264,280-311 ; ds/tokens/spacing.css ; graphite-handoff.md:197-208,254-266.

STATUS: COMPLETED
