# Issue #634 — [CHORE] EventBar.tsx : couleur littérale hors tokens, dans un composant probablement mort

## Résumé
Objectif : trancher si `EventBar.tsx` (littéral `rgba(15,23,42,0.8)` hors tokens, ligne 35) est mort ou vivant, et agir en conséquence. Recherche d'appelants documentée ci-dessous : composant mort, confirmé par le code lui-même (commentaire `TimelineEditHost.tsx:22`). Supprimé `EventBar.tsx`, `EventBar.stories.tsx`, `Lane.tsx` (n'existait que pour porter `EventBar`, aucun appelant hors sa propre story), `Lane.stories.tsx`, leurs ré-exports dans `timeline/index.ts`, et 3 fixtures devenues orphelines dans `fixtures.tsx` (`sampleResource`, `makeEvent`, `stubEventContent` — n'étaient consommées QUE par les deux stories supprimées). Nettoyé au passage 2 commentaires de `fixtures.tsx` qui citaient `EventBar` comme composant vivant (mentions dans un fichier que j'édite déjà, pas un fichier hors périmètre).
Écart à l'énoncé de l'issue : l'issue et l'architecte notent `rgba`, pas un hex comme le dit le titre GitHub — confirmé, non pertinent puisque le fichier entier disparaît.
Fichiers touchés : `frontend/src/components/timeline/EventBar.tsx` (suppr.), `EventBar.stories.tsx` (suppr.), `Lane.tsx` (suppr.), `Lane.stories.tsx` (suppr.), `index.ts` (édité), `fixtures.tsx` (édité).

## Recherche d'appelants
1. Import direct/relatif de `EventBar` (hors le fichier lui-même et sa story) :
   `grep -rn "EventBar" frontend/src --include="*.ts*" | grep -v EventBar.tsx | grep -v EventBar.stories.tsx`
   → 1 SEUL import réel : `src/components/timeline/Lane.tsx:2` (`import { EventBar } from './EventBar'`). Tous les autres hits sont des commentaires (`EventPill.tsx:14`, `TimelineEditHost.tsx:22`, `fixtures.tsx`, `lib.ts`, `useEventEditConflict.ts`, `EventPreviewTimeline.tsx:31`).
2. Import direct/relatif de `Lane` (mot entier, hors le fichier lui-même et sa story) :
   `grep -rnE "\bLane\b" frontend/src --include="*.ts*" | grep -v Lane.tsx | grep -v Lane.stories.tsx`
   → 0 import réel. `index.ts:10-11` ré-exporte `Lane`/`LaneProps` mais RIEN dans le code de production ne consomme cet export (voir point 3).
3. Qui importe `Lane`/`EventBar` depuis le barrel `@/components/timeline` (avec ces noms dans l'accolade) :
   `grep -rn "from '@/components/timeline'" frontend/src | grep -v timeline/` puis lecture des accolades importées par chaque appelant de prod (`ProductDetailView`, `dashboard/page.tsx`, `timeline/page.tsx`, `WeekAgenda`, `CompactAgenda`, `DensityRibbon`, `useDashboardData`) → aucun ne cite `Lane`/`EventBar` ; ils importent `TimelineEditHost`, `Resource`, `getWeekRange`, `getEventsInRange`, `buildDensityBuckets`.
4. Imports dynamiques / lazy : `grep -rn "import(.*EventBar\|import(.*Lane\|React.lazy.*EventBar\|React.lazy.*Lane" frontend/src` → 0 résultat.
5. Preuve directe dans le code lui-même (pas seulement une absence) : `TimelineEditHost.tsx:21-23` — commentaire du dev qui a câblé l'édition d'event : « `EventEditForm` (...) ne vivait que dans `EventContent`, monté uniquement via un ancien composant calendrier → `Lane` → `EventBar`, que PLUS AUCUNE page ne rend (régression S17, composant supprimé #350) ». Confirme que la chaîne calendrier→Lane→EventBar est morte depuis #350, pas seulement inatteignable par accident récent.
6. `data-testid` portés par `EventBar`/`Lane` (`timeline-event`, `timeline-resource-row`, `timeline-resource-title`) : `grep -rn "timeline-event\b|timeline-resource-row|timeline-resource-title" frontend/src --include="*.tsx"` → produits INDÉPENDAMMENT par `EventPill.tsx:91` (`timeline-event`), `TimelineView.tsx:352,372` (`timeline-resource-row`/`-title`), `TimelineMobilePortrait.tsx:221,225,251`, `TimelineMobileLandscape.tsx:234,238,261` — tous vivants, tous montés par des pages routées. Les specs E2E (`golden-path.spec.ts`, `timeline.spec.ts`, `sprint-61-archived-events.spec.ts`, etc.) qui ciblent ces testid sont donc satisfaites par ces composants, pas par `EventBar`/`Lane` (piège PIT-S54-002 vérifié : pas qu'une chaîne présente dans un grep, un vrai render alternatif).
7. Storybook : `.storybook/main.ts:21` glob `../src/**/*.stories.@(js|jsx|mjs|ts|tsx)` — pas de référence explicite aux fichiers supprimés, rien à éditer dans la config.
8. Fixtures devenues orphelines après suppression des 2 stories : `sampleResource`, `makeEvent`, `stubEventContent` — vérifié par `grep -rn "\bsampleResource\b\|\bmakeEvent\b\|\bstubEventContent\b" frontend/src` : uniquement consommées par `EventBar.stories.tsx`/`Lane.stories.tsx` (supprimées). `makeDays` et `makePositionedEvent` restent vivantes (`Ruler.stories.tsx`, `TimelineMobile*.stories.tsx`, `EventPill.stories.tsx`, `EventPill.test.tsx`).

Conclusion : `EventBar`/`Lane` inatteignables depuis tout code de production ou test de production ; suppression justifiée.

## Tests
- `./scripts/test-quiet.sh frontend-unit` → 121 fichiers, 1392 tests, tous verts (exit visible via « ✓ Frontend (unitaires) : OK »).
- `npx tsc --noEmit` → `TypeScript: No errors found`, exit=0.
- `npx next lint --file src/components/timeline/index.ts --file src/components/timeline/fixtures.tsx` → `No ESLint warnings or errors`, exit=0.
- `npx prettier --check src/components/timeline/index.ts src/components/timeline/fixtures.tsx` → `All matched files use Prettier code style!`, exit=0.

## E2E à jouer par le lead
Aucune spécifiquement requise pour ce chore : les testid `timeline-event`/`timeline-resource-row`/`timeline-resource-title` restent produits par `EventPill`/`TimelineView`/`TimelineMobilePortrait`/`TimelineMobileLandscape`, non touchés. La suite E2E existante (golden-path, timeline.spec.ts, timeline-mobile.spec.ts, sprint-61/63/82) couvre déjà ces chemins et n'a pas été modifiée par ce commit ; la rejouer en vague relève de la vérification standard de non-régression du lead, pas d'un besoin spécifique à #634.

## Critères d'acceptation
- [x] Le statut du composant est établi par une recherche d'appelants documentée → section ci-dessus, 8 commandes/preuves.
- [x] Aucune couleur littérale ne subsiste hors des fichiers de tokens, dans le périmètre supprimé/modifié → le seul littéral (`rgba(15,23,42,0.8)`) disparaît avec le fichier ; `fixtures.tsx`/`index.ts` ne portent aucune couleur littérale.
- [x] Si suppression : tests et stories retirés en même temps ; typecheck + lint verts → `EventBar.stories.tsx`/`Lane.stories.tsx` supprimées dans le même commit ; aucun fichier `*.test.tsx` n'existait pour `EventBar`/`Lane` (vérifié par `find`) ; tsc/lint/prettier verts ci-dessus.

## Signaux mémoire
[MEMORY:pattern] Problem: composant React ré-exporté par un barrel (`index.ts`) peut sembler vivant par la seule présence de l'export, alors qu'aucun appelant de production ne consomme ce nom depuis le barrel. Solution: après un grep du symbole, vérifier explicitement QUI importe le barrel ET QUELS noms figurent dans son accolade d'import (pas juste que le barrel exporte le nom). Anti-pattern: se fier à `grep -rn NomDuComposant` seul — les commentaires et les ré-exports produisent des faux positifs de "vivant".

## fichiers de contexte lus
- `.ai-env/context-packs/pit-frontend.md` (extrait injecté) — PIT-S54-002 appliqué : vérifié que les testid `timeline-event`/`timeline-resource-row`/`-title` sont réellement RENDUS par `EventPill`/`TimelineView`/`TimelineMobile*` (pas un grep de commentaire), avant de conclure que la suite E2E ne dépend pas d'`EventBar`/`Lane`.
- `frontend/src/components/timeline/TimelineEditHost.tsx:21-23` — commentaire source confirmant "que PLUS AUCUNE page ne rend (régression S17, composant supprimé #350)".
- `.claude/rules/conventions.md` — code EN / commentaires FR respecté dans les éditions de `fixtures.tsx`.
- `docs/memory/decisions.md` DEC-S84-001, DEC-S84-002 — NON LU (hors périmètre XS ; aucune dépendance identifiée entre ces décisions et un chore de suppression de code mort confirmé par le code source lui-même).
- `.ai-env/context-packs/cp-frontend.md` — NON LU (chore XS ponctuel, pas de nouveau pattern frontend introduit ; suppression pure).

## Recommandations suite
- RECOMMAND_FOLLOWUP: `frontend/src/styles/ds/readme.md:153` cite encore "TimelineEventBar"/"TimelineLane" comme composants DS ; à vérifier si ces noms désignent le pattern visuel général (probablement `EventPill`/`TimelineView`, toujours vivants) ou une mention périmée du composant `EventBar.tsx` supprimé. [triage | domaine design]
- Pas de RECOMMAND_TEST_RUNNER car la suite unitaire (1392 tests) a tourné en 24s sans besoin d'isolation.
- Pas de RECOMMAND_DB_EXPERT car aucun changement de schéma/backend.
- Pas de RECOMMAND_SECURITY car suppression de code mort, aucune surface de sécurité touchée.


## Extension post-vague (arbitrage du dev, 2026-09-11)
- `EventContent.tsx` n'avait qu'un importeur, `EventBar.tsx` (vérifié à la base `599b497`) : mort en production dès avant ce sprint. Suppression décidée par le dev et réalisée par le correctif post-vague (cf. `issue-followup-done.md`), avec report préalable de sa couverture (409 #77/#231, prefill `archived` #188) sur `useEventEditConflict.test.tsx` et `TimelineEditHost.test.tsx`.
- Frontière de commit imparfaite : la suppression des 2 fichiers `EventContent*` est dans `89f9aa8` (sujet #577) au lieu de `6edb430` (#634) — `git rm` stagé trop tôt puis `git commit` sans pathspec. Code final correct ; non réécrit (branche poussée, force-push hors périmètre).

STATUS: COMPLETED
