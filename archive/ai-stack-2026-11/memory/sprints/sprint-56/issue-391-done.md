# Issue #391 — [BUG] `timeline-loading` est du code mort inatteignable

**Sprint :** 56 | **Vague :** 3 (seul, dernier) | **Triage :** S (l'issue annonçait XS)
**Commit :** `f1a6827` | **Base spawn :** `c87034d`
**Fichiers (3, +70/-63) :** `timeline/page.tsx`, `timeline/page.test.tsx`, `e2e/timeline.spec.ts`
**Décision :** tranchée par le développeur — suppression de la branche morte, `app-shell-loading`
testid canonique unique.

---

## Livré

- **`page.tsx`** — branche `if (loading) return <div data-testid="timeline-loading">` **supprimée** ;
  `const { user } = useAuthGuard()` (plus de `loading` destructuré) ; commentaire d'en-tête
  réécrit sur le contrat réel (le shell porte le chargement de session).
  **Conservés comme demandé** : `if (!user) return null` (garde defense-in-depth) et
  `timeline-data-loading` (ligne 79, testid différent et atteignable).
- **`page.test.tsx`** — le test « affiche le spinner de restauration tant que loading » est
  **retiré**, pas réécrit. Doc-comment mis à jour + note anti-réintroduction.
- **`e2e/timeline.spec.ts`** — `test.skip()` **levé et réécrit** : gate `/api/auth/me` →
  `app-shell-loading` visible + `role=status` + **stable** → `timeline-screen` count 0 →
  `timeline-loading` count 0 → release → shell-loading 0, `timeline-screen` visible,
  `timeline-loading` toujours 0. Bloc de commentaire ~912-927 réécrit (état actuel, plus
  l'historique du skip). Diff confiné aux lignes 912-963, 5 hunks — rien de #392/#395 touché.

## Preuve

- Test levé : **PASS** (6/6, 12 s).
- **Sensibilité** : gate retirée → **FAIL (1)** ligne 952 sur l'assertion de stabilité.
  ⚠ Mesure importante : **sans le `waitForTimeout` + re-assert, le test serait resté VERT sans
  la gate** (le premier `toBeVisible` peut attraper le spinner au vol). C'est donc bien
  l'assertion de stabilité qui porte la preuve, pas le `toBeVisible` seul.
- Non-régression : `timeline.spec.ts` + `timeline-mobile.spec.ts` = **47 PASS / 0 FAIL** (74 s).
  Baseline vague 2 = 46 → **+1** (le test réactivé).
- Unitaires front : 92 fichiers / **839 tests, 0 échec** (840 avant : 1 test retiré ;
  `page.test.tsx` 6 → 5).
- Backend : **452 tests, 0 échec** (intouché).
- `npx tsc --noEmit` 0 erreur ; `eslint` sur les 3 fichiers : 0 issue.

**Non vérifié :** `next build`, suite E2E complète hors les 2 specs timeline, et les 3 specs
forgot/reset-password déjà rouges à la base (non touchées, non relancées).

## Signaux mémoire

- **[MEMORY:pitfall]** Un test unitaire qui rend un composant **en isolation, hors de son
  shell/layout** peut couvrir une branche structurellement inatteignable en production — la
  couverture verte a fait survivre `timeline-loading` pendant 3 sprints. → Supprimer test et
  branche ensemble ; poser le contrat au niveau où l'état est réellement atteignable.
  **Prévention : pour toute branche de garde (auth/loading), vérifier que l'ancêtre qui monte le
  composant ne l'intercepte pas déjà. Un test RTL de branche de garde sur une page sous shell
  est suspect par défaut.**
- **[MEMORY:pattern]** Un E2E d'état **transitoire** reste vert même sans son mécanisme de gate
  (il constate un écran déjà chargé) → il ne prouve rien. → Asserter la **stabilité**
  (assert visible → pause bornée → re-assert visible) ; c'est la seule assertion qui rougit
  quand la gate saute. Anti-pattern : `toBeVisible()` + `toHaveCount(0)` seuls, tous deux
  trivialement verts au premier poll réussi.
- **[MEMORY:decision]** #391 : branche morte supprimée plutôt que testid renommé —
  `app-shell-loading` devient le testid canonique unique du chargement de session. Renommer
  aurait produit deux éléments portant le même testid.
- **[MEMORY:bug]** `npx playwright test` sans `E2E_API_PROXY_TARGET` → `/api/*` non réécrit par
  Next, POST register en 404, `auth.setup.ts` échoue avec un message qui oriente à tort vers
  rate-limit/CORS. Le `webServer` de `playwright.config.ts` lance `npm run dev` **nu**, sans ces
  variables. Recette : lancer le dev à part avec
  `NEXT_PUBLIC_API_URL=/api E2E_API_PROXY_TARGET=http://localhost:8080 npm run dev -- -p 3000`
  + `PLAYWRIGHT_BASE_URL=http://localhost:3000` (**port 3000 impérativement** — le CORS backend
  fige `http://localhost:3000`). Règle : ne jamais laisser Playwright démarrer son propre
  `webServer` sur ce projet.

## Recommandations suite

- `RECOMMAND_FOLLOWUP` (XS) — `playwright.config.ts:45-50` : le `webServer` `npm run dev` sans
  `E2E_API_PROXY_TARGET`/`NEXT_PUBLIC_API_URL` rend `npx playwright test` nu systématiquement
  rouge au setup, avec un message trompeur. Injecter `env` dans le bloc `webServer`, ou
  documenter l'interdiction.
- Pas de `RECOMMAND_TEST_RUNNER` (839 unitaires / 17 s, 47 E2E / 74 s — sous les seuils).
- Pas de `RECOMMAND_DB_EXPERT`, pas de `RECOMMAND_SECURITY` : aucune migration, aucun changement
  d'auth (la garde `!user` est inchangée).

STATUS: COMPLETED
