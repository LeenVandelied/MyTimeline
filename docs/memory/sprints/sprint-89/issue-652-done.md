# Issue #652 — LocalDate affichée au jour précédent à l'ouest de Greenwich

## Résumé

Commit `7ed997c` (17 fichiers, +523/−56), branche `claude/sprint-89-start-6c6966`.

**Arbitrage appliqué (option A, tranché 2026-09-13)** : une `LocalDate` (`YYYY-MM-DD`) est une date civile, lue à minuit LOCAL, via un helper unique.

- `frontend/src/lib/date-iso.ts` : ajout de `parseLocalDate(value): Date` (même contrat que `new Date` : Date éventuellement invalide ; tolère un horodatage complet, passé tel quel à `new Date`), et de `parseLocalIsoDate` (strict, `null`) **déplacé** depuis `components/events/previewTimeline.ts`, qui le ré-exporte (appelants et `previewTimeline.test.ts` inchangés, 16/16 verts). La JSDoc fixe la frontière : LocalDate → `parseLocalDate` ; LocalDateTime serveur → `parseServerDateTime`/`serverDateTime` (DEC-S83-004, non touché) ; date légale → `timeZone:'UTC'` (DEC-S75-001, non touché) ; instants → hors sujet.
- `toLocalIsoDate` NON modifié (juste, comme établi par l'architecte).
- Géométrie de frise : seule la LECTURE des chaînes a changé (`computeRange`, `indexEventsByResource`, `buildMinimapBuckets`, `buildEventsByResource`, `buildDensityBuckets`, `getEventsInRange`, `buildEventAriaLabel`) ; aucun calcul de bornes modifié.

**Décompte `new Date(` (méthode : occurrences, pas lignes, `git show HEAD:<fichier> | grep -o`)** — l'écart avec les 87/99 du lead vient de la méthode de comptage, que je n'ai pas pu reproduire. Mes chiffres :
- `src` entier hors tests/stories, sur HEAD pré-correctif : **98**.
- Périmètre architecte (13 fichiers : dashboard ×5 dont CompactAgenda, `useDashboardData`, `ProductsListView`, `ProductDetailView`, `timeline/lib.ts`, `zoom.ts`, 3 drawers) : **65**, classés ainsi :
  - **35 lectures de date-seule** (`new Date(event.start|end|startDate)`, `next.start`, `e.start`, `a/b.start(Date)`) → **toutes migrées** vers `parseLocalDate`. Répartition : WeekAgenda 2, ProductList 2, ProductCarousel 2, dashboard/lib 3, useDashboardData 2, ProductsListView 1, ProductDetailView 4, timeline/lib 8, zoom 5, EventDrawer 2, TimelineBottomSheet 2, TimelineLandscapeDrawer 2.
  - **5 instants** (`now = new Date()` par défaut : WeekAgenda:24, ProductList:21, ProductCarousel:33, CompactAgenda:54, useDashboardData:65) → inchangés.
  - **25 calculs sur un `Date`/ms déjà construit** (`new Date(y,m,d)`, `new Date(start)`, `new Date(Math.max…)`, `new Date(min)`, `new Date(lastMs)`…) → inchangés. `CompactAgenda.tsx:32` (cité par l'architecte) en fait partie : il ne lit aucune chaîne. `CompactAgenda` est pourtant corrigé, via `getEventsInRange`.
- Hors périmètre déclaré : `ProductSparkline.tsx:46` (`new Date(raw)` sur `startDate` et sur la date du formulaire) relevait de la même classe de défaut → **absorbé** (1 ligne). `ProductDrawer.tsx:209` → **non absorbé**, voir Recommandations.

**Écarts de méthode et points non vérifiés** :
- `ProductSparkline` : correctif sans test dédié sous fuseau (le décalage d'index dépend de `Date.now()` réel). Couvert seulement par la suite existante (verte).
- Vues mobiles (`TimelineBottomSheet`, `TimelineLandscapeDrawer`, `ProductCarousel`, `CompactAgenda`) : couvertes en Vitest sous New_York, PAS en E2E `timezoneId`.
- La colonne exacte de la pastille dans la frise n'est pas assertée en E2E. Seul le drawer l'est ; la géométrie en jours est couverte en unitaire.
- Port `:3000` squatté par un `next-server` d'un AUTRE projet (`/Users/herrh/Documents/EdelWheels/.../.next/standalone`, pid 3581, lancé pendant ma tâche). Il n'a pas été tué : l'E2E a tourné sur `:3100`, autorisé par `APP_CORS_ALLOWED_ORIGINS` du conteneur.

## Fichiers de contexte lus

- `.ai-env/context-packs/br-events.md` — LU par grep ciblé : l.16-17 (`calculateEndDate`, types duration/single), l.67-71 BR-EVE-005 (`startDate = LocalDate.now()` par défaut).
- `.ai-env/context-packs/cp-frontend.md` — LU par grep ciblé : l.37 « TypeScript strict : zéro `any` », l.55 `useTranslations("namespace")`.
- `docs/memory/decisions.md` — DEC-S75-001 LU en entier (l.651 : « Sans `timeZone: 'UTC'`, `new Date('2023-06-01')` … affiche « 31 mai » à l'ouest ») ; DEC-S83-004 : **titre seul** lu (l.809, « Les horodatages `LocalDateTime` du backend se lisent dans le… »). J'ai pris le contenu dans la JSDoc de `date-iso.ts` (l.44-66 d'origine) et dans PIT-S83-008 inline.
- `frontend/playwright.config.ts` — LU l.1-207 (garde `WEBSERVER_REQUIRED_ENV` l.50, oracle 401 l.47, `workers`/projets l.88-207, projet `chromium` = Desktop Chrome l.286-289).
- Sous-ensemble pitfalls inline du briefing — LU (PIT-S83-007 appliqué l.70-74 du test, PIT-S60-008 appliqué au squatteur `:3000`, PIT-S75-002 appliqué via `rtk proxy`).
- Code lu en entier ou par zones : `lib/date-iso.ts`, `previewTimeline.ts` l.1-219, `types/event.ts` l.1-215, `types/product.ts` (payload), `dashboard/{WeekAgenda,ProductList,ProductCarousel,CompactAgenda,lib}`, `hooks/useDashboardData.ts`, `products/{ProductsListView,ProductDetailView,ProductSparkline,ProductDrawer l.170-229}`, `timeline/{lib,zoom,EventDrawer,TimelineBottomSheet,TimelineLandscapeDrawer}` (zones date), `components/__tests__/date-time-semantics.test.tsx` l.1-260, `e2e/support/{products,timeline-lanes}.ts`, `e2e/timeline.spec.ts` l.125-129, 240-275 et 520-560, backend `EventCreationRequest.java:32` / `EventResponse.java:41-42` (`LocalDate`).

## Preuves

**Contre-épreuve Vitest** (`src/lib/date-iso.local-date.test.tsx`, fuseau `America/New_York` posé par le test, restauration conforme PIT-S83-007, non-vacance assertée : `getTimezoneOffset() > 0` et `new Date('2026-07-13').getDate() === 12`) :
- Helper en place, appelants NON migrés, shell sans `TZ` (`env -u TZ rtk proxy npx vitest run …`) → **14 failed | 5 passed (19)**, exit=1. Les 5 verts sont le helper et la non-vacance, qui ne dépendent pas des appelants.
- Même état, `TZ=UTC rtk proxy npx vitest run …` → **14 failed | 5 passed (19)**, exit=1.
- Échecs types : `expected [ '2026-07-04', '2026-07-09' ] to deeply equal [ '2026-07-05', '2026-07-10' ]` (3 drawers) ; `expected 8 to be 9` (indexEventsByResource, buildMinimapBuckets) ; `expected '2026-06-30' to be '2026-07-01'` (computeRange) ; `expected +0 to be 1` (useDashboardData, série).
- Après migration : `env -u TZ rtk proxy npx vitest run src/lib src/components/dashboard src/components/timeline src/components/products src/components/events src/components/__tests__/date-time-semantics.test.tsx src/hooks` → **53 files / 840 tests passed**, exit=0.

**Gate complet** : `rtk proxy ./scripts/test-quiet.sh frontend` (next dev arrêté avant) → exit=0 ; build `✓ Compiled successfully`, `Generating static pages (52/52)` ; Vitest **128 files / 1587 tests passed** (le fichier TZ du fichier n'affecte donc pas le reste de la suite) ; typecheck OK ; lint `✔ No ESLint warnings or errors`.
- `rtk proxy npx tsc --noEmit` → exit=0 ; `prettier --check` + `eslint` sur les 17 fichiers → exit=0 / exit=0.
- `rtk proxy npx vitest run src/__tests__/e2e-rate-limit-budget.test.ts` : 1er passage **5 failed | 22 passed** pendant que #685 éditait ce fichier (` M` au `git status`, échecs sur ses sources synthétiques « boucle annotée », aucune mention de ma spec). Rejoué après les commits #685 (`062c903`, `6eee23e`) → **37/37 passed**. Ma spec n'émet ni register, ni login, ni reset.

**E2E** (pile `s89e2e` backend `:8086` healthy après 200 s ; `NEXT_PUBLIC_API_URL=/api E2E_API_PROXY_TARGET=http://localhost:8086 rtk proxy npx next dev -p 3100`, webpack ; oracles `/api/auth/me`=**401**, `/fr/login`=**200**) :
- `sprint-89-local-date-west.spec.ts` (timezoneId `America/New_York`, compte PROD `storageState`) : 1er passage rouge sur `timeline-screen` (page restée sur « Chargement… »), corrigé par `ensureAuthenticated` avant `goto` (séquence de `gotoTimeline`) → **6 passed (1 spec + 5 setup)**.
- **A/B E2E** : `parseLocalDate` remplacé temporairement par `new Date(value)` → **1 failed** : `Expected: "2026-09-17" / Received: "2026-09-16"` sur le `datetime` du dashboard ; restauré (grep `AB-TEMP-652` = 0), puis re-vert.
- La spec vérifie aussi côté API que le backend a persisté `startDate === civil` (seed au format `new Date(iso).toISOString()`).
- **Liste grep complète** (18 specs du briefing + la nouvelle) : `timeline-mobile timeline sprint-85-timeline-group-head sprint-85-timeline-sidebar sprint-84-section-titles sprint-61-archived-events sprint-63-de-overflow-audit sprint-85-timeline-toolbar products sprint-42-events sprint-71-edit-preview-pinned sprint-86-event-category sprint-82-recurrence-capped-hint golden-path sprint-62-control-focus-contrast sprint-73-tablet-sidebar sprint-73-model-vs-rendered sprint-62-select-focus-indicator sprint-89-local-date-west` → **170 passed / 0 failed / 0 skipped (4.0 min)**, 2 workers, aucun `doesn't exist` ni `did not match`.
- Mon propre grep des testids touchés a trouvé 3 specs absentes de la liste du briefing : `auth-guard auth-signature categories` → **30 passed / 0 failed / 8 skipped** (skips = `test.skip(...)` conditionnels existants, `auth-signature.spec.ts:127/301/331`, `auth-guard.spec.ts:202`).

## Signaux mémoire

- `[MEMORY:decision]` Context : #652, `LocalDate` backend (`startDate/endDate/recurrenceEndDate`) relue par `new Date("YYYY-MM-DD")` = minuit UTC, donc la veille à l'ouest de Greenwich sur dashboard, produits et frise. Decision : option A, date CIVILE lue à minuit LOCAL via le helper unique `parseLocalDate` / `parseLocalIsoDate` de `frontend/src/lib/date-iso.ts`. Interdiction de `new Date(<LocalDate>)` chez les appelants. Frontière documentée en JSDoc : LocalDateTime serveur → `parseServerDateTime` (DEC-S83-004), date légale → `timeZone:'UTC'` (DEC-S75-001), instants → `new Date`. Why : le libellé, le `datetime` et la géométrie de frise nomment le même jour que l'utilisateur a saisi, quel que soit le fuseau. L'option « tout en UTC » aurait décalé la frise par rapport au `now` local.
- `[MEMORY:pattern]` Problem : un test de fuseau qui force `process.env.TZ` en `beforeAll` reste vacant si une `Date` locale est construite au niveau MODULE (évaluée avant le hook, dans le fuseau ambiant). Solution : aucune `new Date(y,m,d)` au top-level, fabriques `now()`/`civil()` appelées dans les tests, et assertion de non-vacance (`getTimezoneOffset() > 0` + lecture naïve qui recule d'un jour). Anti-pattern : `const NOW = new Date(2026, 6, 15)` en tête d'un fichier qui force `TZ`.
- `[MEMORY:pitfall]` Context : `npx next dev … > log 2>&1` lancé en tâche de fond sous le hook RTK. Le log ne contenait qu'un résumé (« Next.js Build / Errors: 1 »), sans le message d'erreur (en fait `:3000` occupé), et `rtk proxy cat log` ne le restituait pas : la sortie est résumée À LA SOURCE. Solution : `rtk proxy npx next dev …` d'emblée. Prevention : étendre PIT-S75-002 aux serveurs de fond, dont le log est la seule trace.
- `[MEMORY:pitfall]` Context : `:3000` pris pendant la tâche par le `next-server` standalone d'un AUTRE projet du poste (EdelWheels), qui répondait 404 aux deux oracles. Solution : `lsof -a -p <pid> -d cwd` pour identifier le propriétaire, puis `:3100`, seul autre port présent dans `APP_CORS_ALLOWED_ORIGINS` du conteneur e2e (`docker inspect … Config.Env`). Prevention : un 404/404 sur les oracles ≠ proxy absent tant que le propriétaire du port n'est pas identifié (variante de PIT-S60-008).

## Recommandations suite

- `RECOMMAND_FOLLOWUP:` `frontend/src/components/products/ProductDrawer.tsx:209` — `date: new Date(firstEventDate)` écrit `YYYY-MM-DDT00:00:00.000Z`. Ce n'est PAS la même classe de défaut : lecture UTC + sérialisation UTC donnent le bon jour dans tout fuseau. L'E2E le montre au format identique (`startDate === civil` côté API). Le résultat repose toutefois sur la tolérance du `LocalDateDeserializer` Jackson envers un `Z`, et le contrat Zod est `date: z.date()`. Envoyer la chaîne `YYYY-MM-DD` telle quelle serait plus robuste, mais touche `eventCreationSchema` (zod_dto_sync) → issue XS dédiée, pas un correctif trivial ici.
- `RECOMMAND_FOLLOWUP:` `frontend/src/utils/time-utils.ts` — `calculateRemainingTime` n'a aucun appelant (`grep -rn calculateRemainingTime src app` : 1 seule ligne, sa définition), et fait `new Date(endDateValue)` sur une chaîne. Code mort à supprimer, ou à migrer vers `parseLocalDate` s'il est rebranché.
- `RECOMMAND_FOLLOWUP:` E2E `timezoneId` sur les vues mobiles (`TimelineBottomSheet`, `ProductCarousel`, `CompactAgenda`) — aujourd'hui couvertes seulement en Vitest sous New_York.
- `ABSORBED:` `frontend/src/components/products/ProductSparkline.tsx:46` — `new Date(raw)` → `parseLocalDate(raw)` (même lecture de `LocalDate`, 1 ligne + import), sans test de fuseau dédié.
- Pas de RECOMMAND_TEST_RUNNER car la suite frontend complète, la liste grep E2E et 3 specs supplémentaires ont été jouées ici.
- Pas de RECOMMAND_DB_EXPERT car aucun schéma ni aucune migration ne sont touchés.
- Pas de RECOMMAND_ZOD_DTO_SYNC car aucun contrat Zod/DTO n'a changé (lecture seule côté client).

STATUS: COMPLETED
