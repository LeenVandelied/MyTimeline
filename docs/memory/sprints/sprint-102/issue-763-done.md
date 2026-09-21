# #763 — Le test des cibles tactiles des réglages ne voit pas les interrupteurs

## Résumé
Commit `67ee5618`. `frontend/e2e/sprint-99-touch-targets.spec.ts` : le sélecteur de `measureControls` inclut maintenant `[role="switch"]`, `[role="checkbox"]` et `label.mt-switch` (même liste que `sprint-101-touch-targets.spec.ts:66-80`). En-tête de la spec complété. Ajout d'un test permanent séparé, la sonde « interrupteur injecté ». Aucun code de production modifié. Aucun contrôle nouveau apparu dans les réglages : aujourd'hui aucun `Switch` ni `Checkbox` n'y est monté, donc la spec reste verte sur l'état actuel sans aucune correction.

## Mesures
- Sonde (critère 3, prouvé et pas seulement affirmé) : un `<label class="mt-switch" data-testid="zz-probe-switch">` au balisage exact de `ui/switch.tsx` (input `role="switch"` + piste `aria-hidden`, sans libellé) est injecté en tête de `settings-page` à 375 px.
  - Avec le nouveau sélecteur : `[#763 sonde] label[zz-probe-switch]=38.0x22.0`. La mesure le voit une fois, par le label (l'input 0×0 reste filtré), et le classe sous 44 px. Test vert.
  - Contrôle négatif (copie jetable `e2e/zz-s102-neg.spec.ts` avec l'ancien sélecteur, supprimée ensuite) : `Expected length: 1 / Received length: 0`. La sonde rougit, donc avant #763 un interrupteur passait vert par omission.
- La sonde est gardée comme test permanent : c'est un test séparé, l'injection ne touche pas les mesures des autres tests (nouvelle page à chaque test).
- Mesures réelles inchangées. Par exemple l'index : `settings-back` 44×44, 4 chapitres 341×56.3. Les chapitres profil, sécurité, préférences et compte sont tous à 44 px et au-dessus.

## Fichiers
- `frontend/e2e/sprint-99-touch-targets.spec.ts` (+48 lignes)

## Tests
- `cd frontend && SKIP_DELEGATION=1 PLAYWRIGHT_BASE_URL=http://localhost:3000 npx playwright test e2e/sprint-99-touch-targets.spec.ts --project=chromium --ignore-snapshots`
  - Run 1 : 13 passed, 1 failed. `compte : export…` a échoué sur `ensureAuthenticated`, `getByTestId('dashboard')` introuvable en 5 s : c'est le premier hit à froid sous `next dev` (cas prévu par le briefing).
  - Run 2 à chaud : **14 passed** (5 setup + 9 tests, dont la sonde).
- Contrôle négatif : 1 failed (attendu), 5 setup passed.
- Specs qui citent ce qui est modifié : seul le fichier de spec lui-même a changé, aucun testid, aucune classe ni aucun composant de production. `label.mt-switch` est cité par `sprint-99-touch-targets` et `sprint-101-touch-targets` ; les deux ont été joués (sprint-101 au titre de #764 : vert).
- `npx tsc --noEmit` OK · `npx eslint` OK · `rtk proxy npx prettier --check` EXIT=0 · `git status --porcelain | grep darwin` vide.

## Retour de review
- MINEUR corrigé (commit `1c3bc02f`) : le label de la sonde a maintenant une taille FIXE en style inline (`display:inline-block;width:38px;height:22px;overflow:hidden`), vérifiée à 38×22. La sonde ne dépend plus du CSS de `.mt-switch`.
  - Spec sprint-99 à chaud : **14 passed** (`[#763 sonde] label[zz-probe-switch]=38.0x22.0`). La première passe, à froid, avait eu 2 rouges dans `setup` (`provision shared/pwd`, rendu `toBeVisible` à froid, cas connu).
  - Contrôle négatif avec l'ancien sélecteur : rouge, `Received length: 0`.
  - Serveur arrêté par son PID, port 3000 libre.

## Écarts d'énoncé
- Aucun sur le fond. L'exemption `closest('[aria-hidden="true"]')` et le filtre d'opacité de sprint-101 n'ont PAS été portés dans sprint-99 (hors énoncé). Sans conséquence aujourd'hui : la piste `aria-hidden` du Switch n'est pas appariée par le sélecteur.

fichiers de contexte lus:
- `.ai-env/context-packs/pit-frontend.md` : PIT-S101-003 (l.1683, « ne voit pas `ui/switch.tsx` »), PIT-S101-001 (l.1675), PIT-S99-001..003 (titres l.1647-1655)
- `docs/memory/patterns.md` : PAT-S99-001 (l.962), PAT-S101-001 (l.968)
- `docs/memory/decisions.md` : DEC-S99-002 (l.1093), DEC-S101-003 (l.1108) (titres seulement)
- `frontend/e2e/sprint-101-touch-targets.spec.ts` : l.56-80 (sélecteur de référence)
- `frontend/src/components/ui/switch.tsx`, `frontend/src/styles/ds/components/core.css` l.179-196 (piste 38×22, input 0×0)
- `frontend/playwright.config.ts` : `assertWebServerEnv()`
- `docs/memory/sprints/sprint-101/issue-758-done.md` : NON LU ; `arbitrage-ui-design-754-757.md` : NON LU

## Signaux mémoire
- [MEMORY:pattern] Problem: prouver qu'un sélecteur de mesure couvre un contrôle absent de l'écran aujourd'hui. Solution: sonde = injecter le balisage exact du composant (taille connue < seuil), asserter qu'elle est vue une fois ET signalée, puis rejouer avec l'ancien sélecteur dans une copie jetable pour la voir rougir. Anti-pattern: affirmer « un interrupteur ajouté serait mesuré » sur la seule lecture du sélecteur.
- PIT-S101-003 peut être marqué comme résolu pour `sprint-99-touch-targets`.

## Recommandations suite
- Pas de RECOMMAND_FOLLOWUP bloquant. Optionnel : factoriser `measureControls` dans `e2e/support/` (3 copies : sprint-99, sprint-101, sprint-102), pour qu'une future correction de sélecteur ne diverge plus.
- Pas de RECOMMAND_UI_DESIGN car aucune correction visuelle de production.
- Pas de RECOMMAND_DB_EXPERT car aucune donnée ni migration.
- Pas de RECOMMAND_TEST_RUNNER car la spec a été jouée ici (14/14 à chaud).
- Pas de RECOMMAND_SECURITY car c'est une modification de test sans surface sensible.

STATUS: COMPLETED
