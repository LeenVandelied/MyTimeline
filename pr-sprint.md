## Objectif

QA visuelle du design system (revue Storybook clair/sombre, captures de référence Playwright), un
garde-fou focus qui couvre enfin le `.tsx`, et les deux follow-ups du Sprint 76 sur les pages
légales.

**Milestone GitHub :** #78 · **Issues (5) :** #457, #533, #191, #532, #294

---

## Issues traitées

| # | Livré | Commit |
|---|---|---|
| #457 | Garde-fou Vitest scannant 122 `.tsx` : rougit sur tout `outline-*` / `ring-*` posé sans le token `--color-focus` | `700a2d8` |
| #533 | 22 intitulés de sections légales traduits en `en`/`es`/`de` + garde de parité étendue | `9d90407` |
| #191 | Bascule de thème Storybook (+ polices réparées) et correctif de débordement de `DateStamp` | `a5046fa`, `119f497` |
| #532 | Rampe typographique responsive sur les titres des pages légales | `52237f4` |
| #294 | Première infrastructure de diff visuel du dépôt : spec + 10 références Linux | `0b5a27c` |
| — | Corrections des 2 constats majeurs de review | `823a1f2` |

---

## Ce que le sprint a réfuté en chemin

Quatre énoncés d'issue se sont révélés faux à la mesure. Ils sont documentés dans les `done.md`
plutôt que corrigés en silence :

- **#533** annonçait « 20 intitulés » restés en français. Le dépôt en portait **64 sur 66**, corps de
  sections compris — soit 192 traductions d'un texte à portée juridique, pas 20. Le périmètre a été
  ramené aux 22 titres sur arbitrage explicite ; les 44 clés de corps partent en follow-up.
- **#532** affirmait que le débordement était « non corrélé à la locale ». Après #533, l'anglais ne
  déborde **plus du tout** et l'allemand déborde **trois fois plus** que le français — et encore à
  640 px, largeur que l'énoncé déclarait saine.
- **#191** annonçait 22 stories : il y en a **80**, sur 26 composants. Et le commentaire de story
  « comme le dashboard » était faux — le seul consommateur de `Ruler`/`DateStamp` est
  `EventPreviewTimeline`, le dashboard ayant son propre `TimelineRuler`.
- **#294** visait `app/[locale]/home/`, qui est un `permanentRedirect` 308, pas la landing.

Deux prémisses de mes propres briefings ont aussi été réfutées par les agents, à raison : un critère
de départage CI qui n'existait pas, et le commentaire de story ci-dessus que j'avais relayé.

---

## Défauts trouvés à côté de leur cible

- **#191** — Storybook n'avait **aucun mécanisme de thème** : le critère « revue en clair ET sombre »
  était structurellement inatteignable. Et les variables `--font-display`/`-ui`/`-mono` valaient la
  **chaîne vide** : les 80 stories étaient rendues en police système.
- **#532** — les `<h2>` allemands débordaient **leur propre boîte** (+121 à +133 px), invisibles au
  balayage `rect.right`. Corriger le seul `<h1>` aurait fermé l'issue sur une page toujours en
  défilement horizontal.
- **#294** — `OfflineBanner` entrait dans la boîte capturée : la référence l'aurait figé et **rougi
  la CI en permanence**.
- **#191** — `::placeholder` du `Textarea` à **2,82:1** (clair) et **2,99:1** (sombre) : les jetons
  sont intervertis entre thèmes. Hors périmètre, parti en follow-up.

---

## Tests

Toutes les suites rejouées par le lead, **codes de sortie lus** :

| Gate | Résultat | Sortie |
|---|---|:---:|
| Backend `./mvnw test` | 566 tests, 75 classes, 0 échec | 0 |
| Frontend Vitest | **1313 tests / 113 fichiers** | 0 |
| `tsc --noEmit` | 0 erreur | 0 |
| `next lint` | 0 erreur | 0 |
| `next build` | compilé, 52 pages | 0 |
| `storybook build` | compilé | 0 |
| E2E `sprint-77-theme-visual` | 11 passed (armement inclus) | 0 |
| E2E `sprint-76-legal-visual` | 12 passed (auto-contrôles inclus) | 0 |

**Les 5 contrôles négatifs ont été rejoués indépendamment** par le lead, pas repris des rapports
d'agents : mutation réelle sur `ui/switch.tsx` → exit 1 ; titre allemand remis en français → exit 1
avec `shasum` identique après restauration ; « Mittwoch » injecté → +33 px ; composé allemand
démesuré → page +574 px ; `letter-spacing` sur le hero → 11 878 px de diff.

Détail complet : `docs/memory/audits/sprint-77-test-coverage.md`.

---

## Review

`reviewer` + `playwright-reviewer`. **Aucun constat critique. Deux majeurs, tous deux corrigés** au
commit `823a1f2` puis re-vérifiés :

1. La tolérance de diff visuel était posée en clé `expect` **globale** — trouvée indépendamment par
   les deux relecteurs. Redescendue au point d'appel ; le projet Playwright dédié a été écarté à
   raison (le gabarit de nom porte `{projectName}` et aurait invalidé les 10 PNG).
2. La dérivation `--font-ui` était **recopiée à la main** de `layout.tsx` vers `preview.ts`, sans
   test de parité. Extraite dans `frontend/app/fonts.ts` : la dérive devient impossible plutôt que
   surveillée, avec une garde de 9 tests vérifiée sur les deux builders.

Trois mineurs laissés en l'état, avec leur raison dans `review-fixes-done.md`.

---

## Écarts assumés — à lire avant de merger

1. **Le critère « vert en CI » de #294 n'a pas pu être vérifié.** Aucune CI ne tourne sur les
   branches `sprint/N` : **cette PR est le premier run réel**. Les 10 références sont générées en
   `jammy` (22.04), `ubuntu-latest` est `noble` (24.04), et Playwright nomme les deux `linux` — elles
   **seront donc comparées**. Si le job `e2e` rougit sur un diff de rastérisation, le remède est de
   **régénérer les références sur l'image du runner**, pas d'élargir le ratio : l'écart serait de
   l'ordre de grandeur des mutations que la spec doit détecter.
2. **#191 n'a aucun E2E.** Le correctif `DateStamp` est prouvé par mesure navigateur, mais aucun test
   du dépôt ne garde ce comportement. Les seuils 34/52 px sont calibrés sur Archivo 500 aux tailles
   actuelles : un changement de fonte ou de `px-*` les invalide, et rien ne l'empêche mécaniquement.
3. **Les 22 traductions juridiques de #533 n'ont pas été relues par un humain.** Le texte a une
   portée juridique ; le `done.md` porte l'avertissement, un follow-up demande la relecture.
4. **Suite E2E complète non jouée** — seules les 3 specs concernées par le diff l'ont été
   (deux runs complets rapprochés ne peuvent pas passer : bucket de rate-limit).
5. **Aucun backend vivant pendant les E2E** : les 7 écrans exercés sont publics, aucun parcours
   authentifié n'a été rejoué.
6. **25 écarts d'alignement pixel** relevés vs `core.css`, documentés et volontairement non corrigés.

---

## Cohésion

Score élevé : les 5 issues portent le même thème (QA visuelle du design system) et 4 sur 5 sont
étiquetées `epic:design`. **Ce sprint n'a pas été planifié par `/sprint plan`** — pas d'entrée
PLANIFIÉ, pas d'`architect-plans.md` : les vagues et mini-plans ont été établis par le lead.
Exécution **strictement séquentielle**, 5 vagues, sur décision du dev.

🤖 Generated with [Claude Code](https://claude.com/claude-code)
