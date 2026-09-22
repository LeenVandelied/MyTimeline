# Absorption tardive 1/2 — Double chrome du dashboard sur tablette (768-1023)

**Sprint :** 73 | **Origine :** triage Phase 4 de `/sprint end 73`, arbitrage dev = « absorber »
**Objet :** corriger, AVANT merge, le défaut confirmé introduit par #298.

## Commits
- `46471bf` — 2 fichiers, +163 / −36

## Résumé
- `frontend/app/[locale]/(app)/dashboard/page.tsx` : header passé de `lg:hidden` à
  **`md:hidden`** + `data-testid="dashboard-header"`.
  Classe finale : `bg-surface border-rule sticky top-0 z-10 border-b md:hidden`
- `frontend/e2e/sprint-73-tablet-sidebar.spec.ts` : +120 lignes de non-régression

Tests : `./scripts/test-quiet.sh frontend` **1181 passed / 106 fichiers / 0 échec** ;
`tsc --noEmit` 0, eslint 0, prettier OK.

## Inventaire header vs sidebar sur 768-1023 (exigé pour prouver l'absence de perte)
| Élément du header | Équivalent sidebar | Verdict |
|---|---|---|
| `LanguageSelector` | pied sidebar, **même composant** | doublon → supprimé du header |
| lien Réglages `dashboard-settings-link` | `shell-sidebar-settings-link` | doublon → supprimé |
| logout header | `shell-sidebar-logout` | doublon → supprimé |
| hamburger `dashboard-mobile-menu-button` | — | porte **son propre `md:hidden`** (page.tsx:153), jamais peint ≥ 768. **Vérifié par E2E** (`toBeHidden` à 768/1023/1024), pas supposé |
| titre d'écran `dashboard.title` | — | seul élément sans équivalent, mais **déjà absent ≥ lg** (le header était déjà `lg:hidden`). Contexte porté par `aria-current="page"` de la nav sidebar + `GreetingHeader`. Pas de régression propre à la plage tablette |

**Conclusion : aucune perte fonctionnelle.**

### Écart de périmètre assumé et déclaré
Les 3 contrôles vivaient dans un `hidden md:flex` **à l'intérieur** d'un header devenu
`md:hidden` : ils devenaient donc **impeignables à toute largeur** (famille PIT-S66-001).
Ils ont été supprimés, ainsi que 5 imports devenus morts (`Link`, `Button`,
`LanguageSelector`, `Settings`, `LogOut`). Laisser du code mort aurait été le choix le plus
trompeur des deux.

## Invariant final
« **Exactement UNE chrome de navigation peinte à toute largeur** — `< md` le header de
l'écran, `>= md` la sidebar du shell ; jamais zéro, jamais deux. »

Le commentaire du header a été entièrement réécrit (états réels post-#298 + inventaire +
justification de la suppression), et le JSDoc de tête corrigé également — il décrivait encore
les contrôles `hidden md:flex`.

## E2E — exécutée, et **falsifiée**
`sprint-73-tablet-sidebar.spec.ts` : **14/14 passed, 0 failed** (27,8 s, workers=1,
oracle `/api/auth/me` = 401).

**Contrôle de falsification** : la même spec rejouée sur le code **d'avant** le correctif
échoue — `chrome de navigation unique à 768 px` → `Expected: 1 / Received: 2` sur le lien
« Réglages ». L'oracle voit donc réellement le défaut ; ce n'est pas un test qui passe à vide.

## Non vérifié (déclaré)
- Suite E2E complète non relancée par le subagent (seul son fichier exercé) — **relancée
  ensuite par le lead**, cf. audit.
- `dashboard-header` masqué ≥ md non prouvé isolément sur l'ancien code (le testid n'y
  existait pas → `toBeHidden` y passait à vide) ; c'est le **compte à 1** qui porte la preuve.
- Rendu navigateur réel non inspecté (dark mode, hauteur utile gagnée par la suppression du
  header 56px sur tablette).
- Aucun test unitaire de la page dashboard n'existe (`page.test.tsx` absent). Seule référence
  externe à `dashboard-settings-link` = un commentaire dans `settings-navigation.spec.ts`,
  pas un locator.
- Blast radius grepé (PIT-S73-003) : aucun autre spec ne charge `/dashboard` entre 768 et
  1023 (viewport par défaut 1280 ; le 844 de `timeline-mobile` / `sprint-66` est une
  **hauteur**, pas une largeur). Non re-exécutés par le subagent.

## Écart au briefing (déclaré)
`.claude/rules-jit/ux-patterns.md` non lu — **oubli du subagent, pas un chemin fantôme** :
ce fichier-là existe bien (contrairement à `frontend.md`, cf. PIT-S73-005).

## Signaux mémoire
`[MEMORY:pitfall]` — Deux subagents en fan-out sur le MÊME worktree lancent chacun `next dev`
+ Playwright. Symptôme observé : `.next` corrompu en cours de run
(`Cannot find module './vendor-chunks/@tanstack.js'`, 500 sur `/fr/dashboard`) → 6 tests
rouges avec `getByTestId('dashboard') not found`, **diagnostic qui accuse faussement le code
de la page**. Puis 3 runs perdus sur le verrou `e2e/.auth/run.lock` (dont un timeout de 180 s
sur `provision prod`). **Prévention : sérialiser les runs E2E entre subagents d'une même
vague, ou ne pas paralléliser deux agents ayant tous deux besoin de la stack E2E.**

`[MEMORY:pitfall]` — Sous le hook RTK, l'invocation Playwright est réécrite en
`--reporter=json` et la sortie est **tronquée à 2000 caractères**, y compris redirigée vers un
fichier. Un `exit=0` sans chiffres lisibles n'est **pas** une preuve. Solution :
`PLAYWRIGHT_JSON_OUTPUT_NAME=<path>` — Playwright écrit le rapport lui-même, hors du pipe.

`[MEMORY:pattern]` — Prouver l'absence de doublon quand les deux chromes portent des
`data-testid` DIFFÉRENTS : compter par **nom accessible**
(`getByRole(..., { name, exact: true })`), seul point commun — `getByRole` n'apparie que les
nœuds exposés à l'arbre d'accessibilité, donc le compte reflète ce qui est peint.
Anti-pattern : `toBeVisible()` (passe avec 2 occurrences) et le compte par testid (ne peut
structurellement jamais voir un doublon inter-chrome).

## Recommandations suite
`RECOMMAND_FOLLOWUP` — `settings-back` (`lg:hidden`) coexiste toujours avec la sidebar sur
768-1023. **Déjà arbitré au triage → issue #521** (backlog libre, sans milestone).
Aucune autre.

STATUS: COMPLETED
