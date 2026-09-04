# Audit tests — Sprint 75

> Généré en fin de Phase 6. Un `[MISSING]` bloquerait la Phase 9 (PR).

## Couverture par critère d'acceptation

Le sprint ne touche **aucune règle métier** (`BR-*`) : les deux issues sont des chores frontend
(migration d'API i18n dépréciée, finitions de pages légales publiques). Le tableau suit donc les
critères d'acceptation, pas des BR.

| Critère | Cross-system | Unit front | E2E parcours | Build |
|---|:---:|:---:|:---:|:---:|
| #279 — `getRequestConfig` utilise `requestLocale` + `hasLocale` | NON | ✅ | ⚠ N/A | ✅ |
| #279 — 4 locales toujours prérendues | NON | ⚠ N/A | ⚠ N/A | ✅ |
| #60 — bouton « Retour » traduit (4 occurrences) | NON | ✅ | ✅ | ✅ |
| #60 — date de mise à jour centralisée | NON | ✅ | ✅ | ✅ |
| #60 — disclaimer présent hors `fr`, absent en `fr` | NON | ✅ | ✅ | ✅ |
| #60 — sommaire romain + saut d'ancre fonctionnel | NON | ⚠ jsdom impuissant | ✅ | ✅ |
| #172 (absorbée) — parité du namespace `legal` sur 4 locales | NON | ✅ | ⚠ N/A | ✅ |

Aucun flux à 2+ systèmes ou rôles → aucun E2E métier exigé au sens du protocole.

**Le saut d'ancre ne pouvait pas être couvert en unitaire** : jsdom ne résout pas la navigation par
fragment et ne calcule aucune position. C'est la raison pour laquelle une spec E2E a été exigée au
briefing plutôt que laissée à l'appréciation de l'agent.

## Tests créés

- `frontend/src/__tests__/i18n-request-config.test.ts` (#279) — `resolveLocale` a été extraite du
  `getRequestConfig` **pour pouvoir être testée** : sous Vitest, `next-intl/server` se résout sur
  son bundle react-client, où `getRequestConfig` est un stub qui lève. Le default export est donc
  inatteignable en unitaire, alors que c'est précisément la branche de repli dont la sémantique
  change ici — et que `next build` n'exerce pas (il ne prérend que des segments valides).
- `frontend/src/lib/legal-pages.test.ts` (#60) — formatage de date, parité des clés, ancres.
- `frontend/e2e/sprint-75-legal-pages.spec.ts` (#60) — libellé « Retour » en fr et en, présence du
  disclaimer hors `fr`, **saut d'ancre réellement mesuré** (`rect.top` avant/après).

## Résultats des runs (exécutions réelles, pas des citations)

- **Backend** : 561 tests, 561 passed, 0 failed (`./scripts/test-quiet.sh backend`, BUILD SUCCESS)
- **Frontend unitaire** : 1251 passed, 0 failed (109 fichiers)
- **E2E** : 33 passed, 0 failed (28 spec + 5 setup), chromium
- **`next build` global** : exit 0, **52/52 pages statiques**, `/privacy` et `/terms` prérendues sur
  `fr`/`en`/`es`/`de`. Relancé par le lead sur l'arbre complet en fin de vague — la preuve de build
  de #279 avait été rendue sur un arbre partiel et n'était donc pas suffisante.
- **Couverture E2E (heuristique)** : `legal-disclaimer` et `legal-last-updated` référencés — OK.

**Contrôle négatif joué** (#60) : l'ancre `user-rights` a été renommée, 2 tests ont rougi, dont
l'auto-contrôle qui refuse de statuer sur une cible inexistante au lieu de passer à vide. Fichier
restauré, spec rejouée verte. C'est ce qui distingue une spec qui prouve quelque chose d'une spec
qui passe.

## Ce qui n'est PAS couvert (énoncé plutôt que tu)

- **Chromium uniquement** — aucun autre moteur joué sur la spec légale.
- **Aucun contrôle visuel du sommaire** : le débordement possible en `de` (mots longs) n'est pas
  mesuré, et les contrastes des éléments ajoutés (chiffres romains, disclaimer) ne l'ont pas été
  non plus. La mémoire projet retient deux sprints où une CI verte cachait un défaut de contraste.
- **`prettier --check` est rouge**, y compris sur deux fichiers que ce sprint n'a pas touchés
  (`language-selector.i18n.test.ts`, `document-lang.spec.ts`). Condition pré-existante prouvée par
  témoin ; `format:check` n'est câblé dans aucun workflow CI. Non imputable à ce diff, non corrigé
  ici (un `prettier --write` déclencherait `prettier-plugin-tailwindcss` et réordonnerait les
  classes des deux pages, hors périmètre).

## Review batch et cycle 2

Rapport : `docs/memory/sprints/sprint-75/review-batch.md` — **0 CRITIQUE / 0 MAJEUR / 3 MINEUR**.
Le reviewer n'a pas recopié les preuves du briefing : il a recalculé la parité i18n par script sur
les *ensembles* de clés (66/66/66/66, pas un simple comptage), confirmé la signature de `hasLocale`
dans `node_modules/use-intl`, et rejoué build et unitaires en `rtk proxy`.

Les 3 mineurs ont été corrigés (commit `a101ad4`), pas reportés :
1. `LEGAL_SOURCE_LOCALE` n'est plus exportée — aucun appelant hors module, et l'export invitait à
   re-implémenter ailleurs la règle du disclaimer.
2. `resolveLocale` documente son choix de casse (`'FR'` replie sur `fr`).
3. La spec E2E allemande vérifie le second bouton, qu'elle laissait passer alors que `fr` et `en`
   le couvraient.

**Cycle 2** — la mémoire projet impose de relire les commits correctifs (S62 : des gardes non armées
y avaient été trouvées). Pour ces 20 lignes, la relecture a été faite par mesure plutôt que par un
agent : `tsc --noEmit` propre (ce qui prouve qu'aucun appelant externe ne dépendait de l'export
retiré), 64/64 unitaires, E2E 33/33 rejoués, et **contrôle négatif sur l'assertion ajoutée** — cassée
volontairement, le test rougit ; restaurée, il repasse. Une assertion non éprouvée aurait recréé le
défaut exact que ce projet a déjà payé.

## Conclusion

Prêt pour PR. Aucun `[MISSING]`.
