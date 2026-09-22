# Issue #301 — Écran frise/timeline complet (/timeline)

commits: [62558b6]

> ⚠ Subagent fullstack-dev COUPÉ par limite de session (API error, reset 14h) avant
> commit/retour. Travail retrouvé intact dans le working tree (spawn-ref aa1839d),
> vérifié + nettoyé + commité par le LEAD. Pas de perte. Cf. section « Récupération ».

resume:
- Objectif: remplacer le placeholder `/timeline` (#210) par la frise chronologique RÉELLE
  sous le shell applicatif, sans réécrire ni dupliquer les composants de frise.
- Fichiers: `frontend/app/[locale]/(app)/timeline/page.tsx` (TimelinePlaceholder → TimelinePage),
  `page.test.tsx` (NEW, 6 tests), `AppShell.test.tsx` (+1 test nav active),
  4× `public/locales/*/shell.json` (comingSoon → emptyTitle/emptyBody).
- Montage: `TimelineEditHost` (host S42 → TimelineResponsive desktop/mobile portrait/paysage
  #55/#63/#64) — ZÉRO réécriture des composants de frise (AC respecté).
- Garde d'auth defense-in-depth conservée (`useAuthGuard`, calquée dashboard).
- Réfs erronées à #166 purgées du commentaire du placeholder (AC explicite).
- BR touchées: aucune BR nouvelle (affichage ; archivés exclus = BR-EVE-011 via useDashboardData).

[MEMORY:decision] **DEC-S44-001 — Source de données de `/timeline` = frise GLOBALE multi-produits
via `useDashboardData`.** Le mini-plan architect proposait `useProductsWithEvents` ; le subagent a
retenu `useDashboardData` (agrégation canonique #80, elle-même adossée à `useProductsWithEvents` #48)
qui aplatit déjà TOUS les produits en `events` (FullCalendarEvent, archivés exclus) + `resources`
(une lane par produit). Motif : réutilisation de la dérivation flatMap/mapToFullCalendarEvent
existante → zéro duplication. **Le risque « resources non dédupliquées » signalé au plan ne
s'applique pas** : `resources` = `products.map` (clé `product.id` unique) → aucune collision de
lane/position dans `zoom.ts`. INVARIANT respecté : TimelineEditHost sous `<AuthProvider>` (providers
racine), identique au dashboard qui monte déjà ce host.

data-testids nouveaux: `timeline-screen`, `timeline-host`, `timeline-data-loading`, `timeline-empty`
(+ `timeline-loading` préexistant conservé). ⚠ AUCUN n'est référencé dans une spec Playwright
→ traité en Phase 8 (coverage E2E).

tests:
- Suite frontend COMPLÈTE: **477 passed / 0 failed** (vérifié par le lead, pas le subagent).
- `npx tsc --noEmit`: 0 erreur. `npx eslint` (fichiers touchés): 0 issue (garde-fou PIT-S41-005 —
  le build CI attrape ce que vitest ignore).
- page.test.tsx (6): garde auth (spinner restauration / rien si anonyme), loading données,
  état vide (0 produit), montage host avec données agrégées, non-régression placeholder absent.
- AppShell.test.tsx (+1): `aria-current=page` sur le lien Timeline au segment `/timeline`.
- E2E: NON exécuté (gate CI only, stack down — cf. [[mytimeline-e2e-ci-only-gate]]).

## Récupération (incident subagent)
- Crash: limite de session API pendant la phase « typecheck + lint + full suite » (rien de technique).
- Travail retrouvé non commité: 7 fichiers. Aucune perte (spawn-ref `aa1839d` → diff intact).
- **2 artefacts parasites nettoyés par le lead avant commit** :
  1. `frontend/docs/memory/sprints/sprint-44/spawn-ref-sprint44.txt` — dérive de cwd du subagent
     (`git rev-parse HEAD > docs/...` exécuté DEPUIS `frontend/`) → arborescence fantôme
     `frontend/docs/`. Supprimée. Confirme [[sprint-subagent-worktree-cwd]].
  2. `frontend/.eslintcache` SUPPRIMÉ par le run de lint (fichier tracké) → restauré via
     `git checkout --`. Churn connu = issue **#262** (untrack .eslintcache), hors scope S44.
- Vérifications lead post-récupération: parité i18n 4 locales OK (mêmes clés fr/en/es/de),
  aucune clé orpheline (`comingSoon` ne subsiste que dans une assertion de non-régression).

recommandations suite:
- RECOMMAND_FOLLOWUP: couverture E2E des 4 testids `/timeline` (`timeline-screen`/`timeline-host`/
  `timeline-empty`/`timeline-data-loading`) — aucune spec ne les référence [triage S | events].
  (À arbitrer en Phase 8 / triage sprint end ; cf. précédent #304.)
- Pas de RECOMMAND_DB_EXPERT (aucune migration), pas de RECOMMAND_SECURITY (aucune surface auth
  nouvelle — garde inchangée, #302 traite la garde serveur hors sprint).
- Note V2 (#300): `AppShell.tsx` n'a PAS été modifié par #301 (seul son test l'a été) → pas de
  conflit résiduel pour la Vague 2 sur ce fichier.

STATUS: COMPLETED
