# Issue #80 — Dashboard desktop — DONE

**Vague :** V1 (fondation) | **Modèle :** opus/high | **Commit :** baafb27

## Résumé
Monolithe `frontend/app/[locale]/dashboard/page.tsx` (283→121 l.) extrait en 5 composants Graphite isolés dans `frontend/src/components/dashboard/` :
- **GreetingHeader** — salutation heure locale, sentence case, sans Zap/spring (anti-pattern hérité supprimé)
- **DensityRibbon** — hero, hauteur barre ∝ events/jour, couleur event/jour, ligne TODAY accent (PAS de gradient — conforme spec designer). 84 lignes (>80 marginal, JSX hero irréductible)
- **WeekAgenda** — table dense semaine courante, filet couleur, tri chrono, `variant` prop
- **KpiMarginalia** — chiffres mono inline, pas de gros display
- **ProductList** — pastille + nom + prochain event + compteur, filets DS (pas de `<Card>` shadcn)

Hook `frontend/src/hooks/useDashboardData.ts` = source data UNIQUE (TanStack Query, réutilise `useProductsWithEvents`) ; aucun appel API direct dans les composants. Helpers purs partagés `frontend/src/components/timeline/lib.ts` : `buildDensityBuckets`, `getWeekRange` (ISO lundi-dim), `getEventsInRange`. i18n 4 locales (namespaces greeting/density/week/kpi/productList). Composants largeur fluide + variants → prêts pour réutilisation #83/#85. data-testid contractuels `dashboard-{zone}-{role}-{id}`.

## BR touchées
Aucune (agrégation lecture seule events/products existants).

## Pitfalls rencontrés
1. **`buildMinimapBuckets` existe en réalité dans `zoom.ts`** (waveform 60-tranches de zoom), pas absent comme l'indiquait le briefing lead (grep limité à `lib.ts`). → Créé un helper `buildDensityBuckets` DISTINCT (1 bucket = 1 jour, count + couleur dominante) plutôt que casser la Minimap testée. Bon réflexe.
2. **Collision i18n `dashboard.products`** (string encore consommée par `TimelineCalendar.tsx`) → namespace `dashboard.productList` séparé (next-intl interdit string+objet sur même clé).
3. `FullCalendarEvent` exporté par `@/types/event`, pas par le barrel timeline.

## Tests
- 15 tests dashboard PASS (helpers purs + rendu 5 composants)
- Suite complète : **200 PASS / 0 FAIL** ; `tsc --noEmit` clean ; `next build` 0 erreur ; eslint 0 issue

## [MEMORY:*] signaux (à consolider en /sprint end Phase 2)
- **[MEMORY:pattern]** Dashboard densité par jour avec couleur : helper pur `buildDensityBuckets` (lib.ts) DISTINCT du `buildMinimapBuckets` waveform (zoom.ts). 1 bucket = 1 jour, count + couleur dominante. Anti-pattern : réutiliser le waveform normalisé sans couleur, ou dupliquer.
- **[MEMORY:pitfall]** Clé i18n `dashboard.products` string encore consommée par `TimelineCalendar.tsx` → nouveau namespace `dashboard.productList` (next-intl interdit string+objet sur même clé). Prévention : grep les consommateurs d'une clé avant de la convertir string→objet.

## Recommandations suite (RECOMMAND_FOLLOWUP → triage /sprint end Phase 4)
- RECOMMAND_FOLLOWUP: valider visuellement le layout dashboard en Chrome 1280px ET 1440px sur env authentifié live (backend requis, non dispo en worktree fan-out) — critère d'acceptation non vérifiable ici [triage XS | domaine frontend]
- RECOMMAND_FOLLOWUP: créer le shell applicatif (nav latérale persistante 248px, handoff §8) — hors scope #80 par décision lead [triage M | domaine events/frontend]

STATUS: COMPLETED
