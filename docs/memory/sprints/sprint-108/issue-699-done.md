# Issue #699 — Arbitrages design : cible tactile de « Ouvrir la frise » et couleur de la piste vide

Traitée par le lead, sans subagent : deux décisions de design, aucune ligne de code.

## Commits
- Aucun commit de code. Décisions consignées dans `docs/memory/decisions.md` (commit docs du sprint).

## Résumé
- **Point 1, cible tactile** : DEC-S108-001. La boîte visible reste en `size="sm"` (32 px) et la zone tactile passe à 44×44 sous 768 px par `TOUCH_TARGET_HITBOX`. Cet état a été livré par #754 (S102) et vérifié par le lead dans `DensityRibbon.tsx` (lien `dashboard-open-timeline`). Il est gardé par `e2e/sprint-101-touch-targets.spec.ts`, rejouée verte au S108.
- **Point 2, piste vide** : DEC-S108-002. `border-rule-emphasis` est conservé, par cohérence avec `.mt-evt-connector` et parce que le token n'est pas inversé en sombre. `rule-strong` (1,46:1) est écarté. L'exception à l'usage « fonctionnel » du token est documentée.
- Critère « si un changement est décidé, mesure au navigateur » : sans objet, aucun changement n'a été décidé.
- Arbitré par le dev au démarrage du sprint (2026-09-22), option recommandée retenue sur les deux points.

## Signaux mémoire
- Aucun.

## Recommandations suite
- Aucune. Pas de RECOMMAND_UI_DESIGN, car la décision a été prise par le dev.

STATUS: COMPLETED
