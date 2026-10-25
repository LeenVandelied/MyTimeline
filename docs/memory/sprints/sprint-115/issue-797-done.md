# Issue #797 — Landing : la frise ne promet plus de rappels — DONE

## Résumé
La frise « Comment ça marche » (`common.landing.howItWorks`) promettait un rappel avant chaque échéance ; aucun rappel ni notification n'existe (backend : 0 occurrence `remind|rappel` dans `backend/src/main` hors un faux positif `JwtService`). Commit `49e712d1` (parent `42745fe0`).

Chaînes changées, 4 locales (5 par locale, pas 4 : le titre du jalon `milestones.reminder.title` — « Vous êtes prévenu à temps » / « You are warned in time » / « Te avisamos a tiempo » / « Rechtzeitig informiert » — promettait aussi un avertissement actif et échappait au grep du briefing, `prévien` ne matche pas `prévenu`) :

| clé | fr | en | es | de |
|---|---|---|---|---|
| title | La même frise, du premier coup d'œil à l'échéance. | One timeline, from first glance to deadline. | La misma cronología, del primer vistazo al vencimiento. | Eine Zeitleiste, vom ersten Blick bis zur Frist. |
| subtitle (fin) | de l'échéance vue de loin jusqu'au renouvellement. | from a deadline seen from afar to the renewal. | desde el vencimiento visto de lejos hasta la renovación. | von der Frist am Horizont bis zur Verlängerung. |
| milestones.reminder.tag | −30 jours · en vue | −30 days · in sight | −30 días · a la vista | −30 Tage · in Sicht |
| milestones.reminder.title | Vous la voyez venir | You see it coming | Lo ves venir | Sie sehen es kommen |
| milestones.reminder.text | Chaque échéance est posée sur la frise à sa date : vous la voyez approcher, jamais après coup. | Every deadline sits on the timeline at its date: you watch it approach, never after the fact. | Cada vencimiento ocupa su fecha en la cronología: lo ves acercarse, nunca a destiempo. | Jede Frist steht an ihrem Datum auf der Zeitleiste: Sie sehen sie näherkommen — nie im Nachhinein. |

Clé `reminder`, `MILESTONES`, rôle `sky` et tous les `data-testid` inchangés.

## Décision
Décision dev du 2026-10-25 (démarrage S115) : **REFORMULER**. Aucun développement de rappels. Le jalon décrit l'échéance vue à l'avance sur la frise (passif), plus aucun envoi actif. Consignée dans le message du commit `49e712d1` et dans la JSDoc de `HowItWorksSection.tsx`.

## Fichiers
- `frontend/public/locales/{fr,en,es,de}/common.json` — 5 valeurs `landing.howItWorks` par locale.
- `frontend/src/components/landing/HowItWorksSection.tsx` — JSDoc uniquement (mention #797, « ne pas réintroduire de promesse d'envoi »).
- `frontend/src/components/landing/HowItWorksSection.test.tsx` — +4 tests (1 par locale) : texte RENDU sans `rappel|prévenu|prévien|remind|warned|notif|alert|recordatorio|avisamos|erinnerung|informiert`. Armement : les blocs `howItWorks` de HEAD~ contiennent 6 occurrences/locale de la regex (`git show 42745fe0:…`), dont le titre rendu « du rappel » → le test aurait rougi.

Balayage `/usr/bin/grep -rniE 'rappel|remind|erinner|recordat|notif|alert|prévien|avis'` sur `public/locales/*/` après correctif : seules restent les clés `"reminder"` (non rendues). Hors landing, non touché :
- `legal.json:116` (4 locales) — « Nous vous informerons… par le biais d'un avis » : engagement légal de la politique de confidentialité, non une fonction produit ; NB texte FR non traduit dans en/es/de (défaut préexistant, hors périmètre).
- `es/common.json` `legalNotice: "Aviso legal"` — faux positif (mentions légales).
- `common.json:33/73` `recurringWarning` — avertissement UI de suppression, faux positif.
Aucune chaîne en dur `rappel|remind|notif|alert` dans `src/components/landing/` ni `app/[locale]/`.

E2E : `sprint-103-use-case-frieze.spec.ts` et `landing-typography-hierarchy.spec.ts` n'assertent aucun texte littéral de la frise (sélecteurs par testid ; « Comment ça marche » seulement en commentaire) → non modifiés.

## Tests
- `npx vitest run src/components/landing` : 8 fichiers, 65/65 verts (HowItWorksSection 15 tests, dont 4 nouveaux).
- `npx vitest run` (suite complète) : 177 fichiers, 2326/2326 verts, 34,2 s.
- `rtk proxy npx prettier --check` sur les 6 fichiers : conforme.
- `npx next lint --file` HowItWorksSection.tsx + .test.tsx : 0 warning/erreur.
- `npx tsc --noEmit` : aucune sortie d'erreur.
- Playwright / serveur Next : NON lancés (interdits). `sprint-103-use-case-frieze` à rejouer par le lead.

## Signaux mémoire
- [MEMORY:pitfall] Context: regex de balayage du briefing `prévien` ne matche pas le participe `prévenu` ; le titre de jalon « Vous êtes prévenu à temps » (et ses 3 traductions sans mot-racine « rappel ») promettait aussi l'envoi. Solution: relire chaque valeur du bloc i18n entier, pas seulement les lignes grep. Prevention: un balayage de promesse se fait par SENS (relecture du bloc rendu) + regex, et la regex inclut participes et formules des 4 langues (`prévenu`, `warned`, `avisamos`, `informiert`).
- [MEMORY:decision] Context: #797 frise landing promettant des rappels inexistants. Decision: reformuler (voir venir l'échéance sur la frise), clé `reminder` conservée. Why: décision dev 2026-10-25, aucune fonction de rappel au backlog immédiat ; garde-fou Vitest sur le texte rendu.

## Recommandations suite
- RECOMMAND_FOLLOWUP: `legal.json:116` en/es/de contient le texte FRANÇAIS de la politique de confidentialité (non traduit) [triage XS | domaine frontend/i18n]
- Pas de RECOMMAND_TEST_RUNNER : suite Vitest complète jouée (2326/2326) ; seul `sprint-103-use-case-frieze` reste au lead, qui l'a prévu.
- Pas de RECOMMAND_DB_EXPERT : aucun changement backend ni schéma.
- Pas de RECOMMAND_UI_DESIGN : longueurs de chaînes comparables aux précédentes (texte fr 94 vs 71 caractères ; de 98 vs 82, mesuré Python) — à confirmer visuellement par le rejeu E2E du lead (grille 4 colonnes ≥ lg).

fichiers de contexte lus: briefing-797.md (l.1-44) ; cp-frontend (inline prompt, § i18n) ; pit-frontend.md (PIT-S112-007 l.1872, PIT-S97-003 l.1632, PIT-S103-002 l.1728 via grep) ; sprint-103/issue-612-done.md (l.15, l.23-24) ; HowItWorksSection.tsx (l.1-104) ; HowItWorksSection.test.tsx (l.1-60, fin) ; e2e/sprint-103-use-case-frieze.spec.ts (grep l.12, l.283-351)

STATUS: COMPLETED
