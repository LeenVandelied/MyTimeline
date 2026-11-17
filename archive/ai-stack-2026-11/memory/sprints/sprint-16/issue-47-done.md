# Issue #47 — Extraction sous-composants Timeline + Storybook

commits: [80113e3]

## Résumé
- Monolithe `frontend/src/components/calendar/TimelineCalendar.tsx` (254L) décomposé.
- Nouveau répertoire `frontend/src/components/timeline/` :
  - `lib.ts` : getDaysRange, formatDay, buildEventsByResource, groupResourcesByCategory, statusBarClass + types (Resource, EventStatus, EventWithComputedPosition). Extraits tels quels.
  - `DateStamp.tsx`, `Ruler.tsx` (compose DateStamp), `Cursor.tsx`, `EventBar.tsx`, `Lane.tsx` (compose EventBar).
  - `index.ts` (barrel), `fixtures.tsx` (données + stub content).
  - 1 story colocalisée / sous-composant : DateStamp/Ruler/Cursor/EventBar/Lane.stories.tsx (CSF3, import `@storybook/react-vite`, satisfies Meta, tags autodocs, titres `Timeline/*`).
- TimelineCalendar réécrit en orchestrateur délégant (Ruler + Cursor + Lane). MÊMES classes/tokens, MÊME contrat props (`events,resources,currentDate,locale,showNowIndicator`).
- data-testid PRÉSERVÉS : `timeline-calendar`, `timeline-resource-row`, `timeline-resource-title`, `timeline-event` (+ `data-event-title`). Vérifié vs `e2e/golden-path.spec.ts` (lignes 140/147/152).
- Consommateur unique `app/[locale]/dashboard/page.tsx` : props inchangées, tsc vert → compile OK.
- `calendar.css` / `.fc-*` : N/A CONFIRMÉ (0 hit grep). AC déjà satisfaite, aucun fichier à supprimer.
- DÉCISION EventBar : contenu interne injectable via `renderContent` (défaut = EventContent réel → runtime dashboard IDENTIQUE). Stories injectent `stubEventContent` pour éviter deps next-intl/auth/services d'EventContent (aucun provider intl/auth dans `.storybook/preview.ts`).
- DÉCISION Minimap : N'EXISTE PAS dans le code source → non extrait (scope M). Follow-up S17.
- DÉCISION EventPill : n'existe pas distinctement, rôle joué par EventContent (réutilisé dans EventBar). Non extrait. Follow-up S17 si rendu compact distinct requis.
- Gates : `npx tsc --noEmit` vert ; `npm run test` 85/85 vert ; `npm run build-storybook` vert ; eslint vert.

[MEMORY:pattern] Décomposer un monolithe de rendu réutilisable par S17 sans casser le runtime ni Storybook (sous-composant dépendant d'EventContent lourd en deps next-intl/auth). Solution : structure `timeline/` = `lib.ts` (fonctions pures mémoïsables) + sous-composants purs présentationnels (props explicites, i18n résolu par l'orchestrateur via prop `productsLabel`) + orchestrateur qui garde les hooks (useMemo/useTranslations). Point d'injection `renderContent` sur EventBar (défaut = composant runtime réel) → runtime inchangé + stories rendables avec un stub. `fixtures.tsx` colocalisé pour données déterministes. Anti-pattern : rendre EventContent réel en story (throw sans NextIntlClientProvider/AuthProvider) ; réécrire les classes `.mt-*` (régression visuelle).

## Recommandations suite
- RECOMMAND_FOLLOWUP (S17) : implémenter Minimap (vue réduite de navigation) + décider si un EventPill (rendu compact distinct d'EventContent) est nécessaire pour la Timeline events desktop. Les briques `timeline/` (lib + sous-composants) sont prêtes à être réutilisées.
- Note perf mineure (non bloquante) : le chunk EventBar Storybook (~223kB) inclut EventContent via l'import par défaut ; si gênant en CI, envisager un lazy/dynamic sur le défaut `renderContent`.

STATUS: COMPLETED
