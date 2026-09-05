# Exécution E2E — Sprint 72

Lancée par le lead **après** l'ouverture de la PR #512, à la demande du dev.
C'était un trou identifié dans l'audit initial : il est desormais comble.

## Environnement monte

Chemin le plus court du runbook S47/S61, avec une adaptation importante :

- **Postgres e2e** : conteneur `sprint-plan-5-9ef090-postgres-e2e-1` deja actif sur
  `:5435`, base `eventmanager_e2e` a **15 migrations (V1..V15)**. Reutilise tel quel.
- **Backend : construit depuis HEAD** (`./mvnw package -DskipTests`), lance en
  `java -jar` sur `:8086` avec `SPRING_PROFILES_ACTIVE=dev,e2e`,
  `RATE_LIMIT_ENABLED=false`, `--app.cors.allowed-origins=...:3000,...:3100`.
  **Point decisif** : le conteneur `backend-e2e` deja present a ete ECARTE, son image
  etant anterieure a #142 — l'utiliser aurait teste l'ancien code et rendu un vert
  sans valeur.
- **Frontend** : `rtk proxy npx next dev -p 3100` (PAS `npm run dev` — le
  `--turbopack` du script infere un mauvais workspace root en worktree et rend des 500).
  `NEXT_PUBLIC_API_URL=/api`, `E2E_API_PROXY_TARGET=http://localhost:8086`.
- Oracles verifies avant lancement : `:3100/api/auth/me` → **401** (proxy actif, pas
  404), `/fr/register` → **200**, `:8086/api/test-support/...` → **404** (profil e2e actif).

## Resultat

**243 passed · 1 failed · 9 skipped** — 8,7 min, `--workers=1`, 253 tests.

### Premier run : echec de setup, cause environnementale

Le 1er run est mort au projet `setup` (`provision shared`), **248 tests non executes**.
Diagnostic mesure, pas suppose : `expect(getByTestId('dashboard')).toBeVisible()` a un
timeout de 5 s, or le **premier** hit `/fr/dashboard` a pris **4172 ms** (compilation
webpack 3,4 s) contre 72 / 59 / 35 ms ensuite. Les 3 provisions suivantes sont passees.
Artefact de compilation a froid de `next dev`, sans rapport avec le code.
Relance a chaud : setup vert.

### L'unique echec restant est un test INSTABLE, pas une regression

`sprint-62-select-focus-indicator.spec.ts:551` — « NewEventDrawer / product-trigger,
popover PEINT (mobile, .mt-sheet), light ». Timeout de 30 s en attente de
`[role="option"][data-highlighted]`.

**Preuve que ce n'est pas une regression du sprint** : le spec rejoue seul **sur le
meme commit** rend **25/25 vert**. Meme code, deux verdicts → instabilite, pas
regression. Aucun besoin de comparer a `origin/dev`.
Corroboration : aucun des 30 fichiers modifies n'est sur ce chemin (ni drawer, ni
select, ni CSS), et le **jumeau desktop** du meme test est passe dans le run rouge.

## Ce que cette execution prouve pour le sprint

- **#142** : `forgot-password.spec.ts` — « parcours complet full-stack » (forgot → lien
  tokenise → reset → login) **passe contre un backend construit depuis HEAD**. Le
  nouveau parametre `locale` du port et du DTO ne casse pas le flux.
  `reset-password-failures.spec.ts` (2 tests) passe egalement.
- **#72** : `timeline.spec.ts` (29), `products.spec.ts` (3), `document-lang.spec.ts` (13),
  `golden-path.spec.ts`, les specs dashboard et `sprint-63-de-overflow-audit` passent —
  aucune regression d'affichage introduite par les classes DS et `Intl.NumberFormat`.

## Ce que cette execution ne prouve TOUJOURS pas

- **Le contenu localise des emails.** Aucun E2E n'observe le rendu : `BREVO_API_KEY`
  est absente, l'adapter est NO-OP. Le parcours reset fonctionne, mais **personne n'a
  vu le template DE ou ES**. C'est la limite de fond de #142, inchangee.
- Le delta visuel de #72 (`EventPreviewTimeline` 15px → 13px) et le `nowrap` en `de`
  ne sont pas cibles par une assertion dediee.

## Traces

Logs dans le scratchpad de session : `e2e-run.log` (1er run), `e2e-run2.log` (run
complet), `e2e-s62.log` (rejeu isole), `backend-e2e.log`, `frontend-e2e.log`.
