# Issue #768 — Factoriser la fonction de mesure des cibles tactiles recopiée dans trois specs E2E

## Commits

- `00da5ecf` :recycle: test(e2e): mesure des cibles tactiles factorisée dans support/touch-targets (#768) — auteur de Laforcade Loïc, 4 fichiers (`git show --stat` vérifié : aucun fichier d'un autre agent).

## Résumé

- Objectif : une seule copie de `measureControls` / `expectAllTouchable` / `measureHitbox` / `expectHitbox`, importée par les 3 specs, sans changer ce que mesure chacune.
- Fichiers : `frontend/e2e/support/touch-targets.ts` (nouveau, 260 l.) ; `frontend/e2e/sprint-99-touch-targets.spec.ts`, `sprint-101-…`, `sprint-102-…` (copies locales supprimées, −345 l.).
- API exportée : `MIN_TARGET` (44), `EPS` (0.01), `Measured`, `MeasureOptions`, `TouchTargetOptions` (`tag` obligatoire = préfixe de log), `BOX_ONLY`, `measureControls(root, options?)`, `isUndersized(m)`, `expectAllTouchable(step, root, min, options)`, `measureHitbox(target)`, `expectHitbox(label, target, { tag })`. Pour #767/#830 : `expectAllTouchable('…', racine, N, { tag: '#767' })` (profil complet par défaut) et `expectHitbox` pour une cible `::before`.
- Décision : les copies divergeaient sur 3 règles, pas 2. sprint-101/102 exemptent `[aria-hidden="true"]`, comptent la hitbox `::before`, ET écartent `opacity: 0` / `display: none` ; sprint-99 ne fait rien de cela (l'issue ne citait pas le 3e écart). Donc 3 options indépendantes (`exemptAriaHidden`, `countPseudoHitbox`, `strictVisibility`, défaut `true` = profil complet). sprint-99 passe `{ tag: '#738', ...BOX_ONLY }` ; 101/102 `{ tag: '#754' }` / `{ tag: '#764' }`.
- #763 : le sélecteur (`[role=switch]`, `[role=checkbox]`, `label.mt-switch`) est désormais unique. La sonde d'interrupteur (taille fixe 38×22 en style inline, `1c3bc02f`) est restée dans sprint-99, inchangée ; elle appelle `measureControls(root, TOUCH)` du module et protège donc aussi 101/102.
- Seul écart voulu : les logs de sprint-99/101 affichent la largeur en `toFixed(1)` (avant : `Math.round`), comme sprint-102 le faisait déjà. Ça ne touche aucune assertion.
- MESURÉ : avant 23 passed ; après 23 passed ×2. Lignes de mesure `[#…]` : 40 avant, 40 après (16 `#738`, 1 `#763`, 19 `#754`, 4 `#764`). Contrôles mesurés : 226 avant, 226 après. Libellés et tailles identiques après normalisation (UUID/suffixes `unique()`, largeur arrondie). Seul écart : un arrondi 142,5 → 143 contre 142, dû à l'arrondi bancaire du script de comparaison.
- MESURÉ (expérience jetable, non committée) : sprint-99 sous profil complet → 14 passed, 17 lignes `#738`/`#763`, identiques au profil BOX_ONLY. Aligner sprint-99 sur le profil complet ne changerait donc rien AUJOURD'HUI. Je ne l'ai pas fait : le briefing demande une option explicite plutôt qu'un changement de ce que mesure une spec.
- fichiers de contexte lus: `docs/memory/sprints/sprint-112/briefing-768.md`, `frontend/e2e/sprint-99-touch-targets.spec.ts`, `frontend/e2e/sprint-101-touch-targets.spec.ts`, `frontend/e2e/sprint-102-touch-targets.spec.ts`, `frontend/e2e/support/fixtures.ts`, `frontend/e2e/support/timeline-lanes.ts` (en-tête, pour le style), `frontend/playwright.config.ts` (projets), commit `1c3bc02f` (stat + message).

## Tests

- Oracles : `/api/auth/me` = 401, `/fr/login` = 200 sur :3100.
- AVANT : `SKIP_DELEGATION=1 PLAYWRIGHT_BASE_URL=http://localhost:3100 rtk proxy npx playwright test e2e/sprint-99-touch-targets.spec.ts e2e/sprint-101-touch-targets.spec.ts e2e/sprint-102-touch-targets.spec.ts --reporter=line` → 23 passed (9,3 s), log `/tmp/s112-768-e2e-before.log`.
- APRÈS, même commande ×2 (15 s d'écart) → 23 passed (9,2 s) puis 23 passed (9,0 s), 0 failed / flaky / did not run. Logs : `/tmp/s112-768-e2e-after1.log`, `/tmp/s112-768-e2e-after2.log`.
- Expérience profil complet sur sprint-99 : 14 passed, log `/tmp/s112-768-e2e-s99full.log` (fichier restauré ensuite, le commit contient `BOX_ONLY`).
- `npx tsc --noEmit` (le tsconfig inclut `e2e/`) → 0 erreur. `npx next lint --file` ×4 → 0 warning, 0 erreur. `rtk proxy npx prettier --check` ×4 → OK. `npx vitest run src/__tests__/e2e-rate-limit-budget.test.ts` → 37/37 (aucun login ni register ajouté).
- PAS vérifié : Firefox (le projet ne matche pas ces specs), la CI Linux, la suite E2E complète. Les tests comptés incluent 5 tests du projet `setup` (18 tests propres aux 3 specs). Aucun contrôle négatif rejoué contre le module (par ex. retirer `label.mt-switch` pour voir la sonde rougir) : il avait été fait au S102 sur la copie locale, et le sélecteur est recopié à l'identique.

## Critères d'acceptation

- [x] Les trois fonctions (et `measureHitbox`) existent en un seul exemplaire dans `frontend/e2e/support/touch-targets.ts`. Preuve : `grep "function measureControls\|function expectAllTouchable\|function expectHitbox" frontend/e2e` → ce module seul.
- [x] Les 3 specs importent le module, sans copie locale (diff : −345 l. dans les specs).
- [x] L'exemption `aria-hidden` et la mesure `::before` restent actives dans sprint-101/102 (profil par défaut). Les logs après refactor montrent `button[event-form-recurring-toggle](::before)` et les 7 lignes `hitbox` avec leurs 4 coins, identiques à l'avant.
- [x] La sonde #763 est conservée : test « sonde : un interrupteur injecté… » vert ×3, ligne `[#763 sonde]` présente ; son style inline 38×22 n'est pas touché.
- [x] Les 3 specs passent après factorisation : 23/23 ×2, 226 contrôles et 40 lignes de mesure égaux avant/après.

## Signaux mémoire

- [MEMORY:pitfall] Contexte : l'issue #768 décrivait 2 divergences entre les copies de `measureControls` (aria-hidden, `::before`). La lecture du code en montre 3 : sprint-101/102 écartent aussi `opacity: 0` / `display: none`. Solution : 3 options indépendantes, profil BOX_ONLY pour sprint-99. Prévention : avant de factoriser des copies, les comparer ligne à ligne plutôt que de se fier à la liste d'écarts de l'issue.
- [MEMORY:pattern] Problème : prouver qu'une factorisation E2E ne change pas ce qui est mesuré. Solution : logs de mesure structurés `[tag étape] libellé=LxH | …` avant/après, normalisés (UUID, suffixes `unique()`, arrondi), puis comparés au nombre de lignes et de contrôles. Un « même nombre de tests verts » ne prouve rien, car la garde anti-vacuité est un minimum. Anti-pattern : comparer seulement `N passed`.
- [MEMORY:decision] Contexte : #768. Décision : `support/touch-targets.ts` a pour défaut le profil complet ; sprint-99 garde `BOX_ONLY` en non-régression. Pourquoi : la factorisation ne devait rien changer à ce que mesure une spec. L'alignement serait neutre aujourd'hui (mesuré), mais il reste une décision à part.

## Recommandations suite

- Pas de RECOMMAND_DB_EXPERT : aucun schéma ni requête touchés, specs E2E seulement.
- Pas de RECOMMAND_SECURITY : code de test uniquement, aucune surface auth ou donnée.
- Pas de RECOMMAND_UI_DESIGN : aucun composant ni style modifié.
- Pas de RECOMMAND_TEST_RUNNER : les 3 specs ont été exécutées (1 run avant, 2 après), plus tsc, lint, prettier et le test de budget.
- RECOMMAND_FOLLOWUP: aligner `sprint-99-touch-targets` sur le profil complet (retirer `BOX_ONLY`). Mesuré neutre aujourd'hui (17 lignes identiques). Décider si l'exemption `aria-hidden` et `::before` doivent aussi valoir pour les réglages. [XS | frontend/e2e]
- RECOMMAND_FOLLOWUP: #767 et #830 doivent importer `expectAllTouchable` / `expectHitbox` de `e2e/support/touch-targets.ts` (tag de log obligatoire), pas en écrire une 4e copie. À rappeler dans leurs briefings. [XS | frontend/e2e]

STATUS: COMPLETED
