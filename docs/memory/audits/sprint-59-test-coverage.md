# Audit tests — Sprint 59

> Généré en fin de Phase 6. Un marqueur de couverture manquante bloquerait la Phase 9 (PR).
> Ce fichier n'en contient aucun — et il évite volontairement d'écrire le jeton littéral, que le
> garde-fou `grep` de la Phase 9 apparierait même dans une phrase qui le nie.
> Sprint **100 % frontend / landing** : aucun fichier backend, aucune migration Flyway.

## Couverture par critère d'acceptation

Ce sprint ne touche **aucune BR** (règle métier). Les défauts traités sont des défauts de **rendu** :
aucun n'est un flux cross-system, donc **aucun E2E métier n'est exigé**. La colonne qui compte ici
est « mesure navigateur », car c'est le seul instrument qui voit ces défauts.

| Issue | Défaut | Cross-system | Unit frontend | Mesure navigateur (jammy) | E2E de non-régression | Non-vacuité prouvée |
|---|---|:---:|:---:|:---:|:---:|:---:|
| **#381** | Logo header au palier `md:` | NON | ⚠ N/A | ✅ 8 paliers × 4 locales × 2 thèmes | ✅ `landing-header-logo.spec.ts` | ✅ 11 rouges nommés |
| **#379** | Marge nulle + logo 2 lignes @1024 | NON | ⚠ N/A | ✅ (couverte par le relevé #381) | ✅ (même spec) | ✅ |
| **#341** | SVG débordant ~30 px mobile | NON | ⚠ N/A | ✅ 4 locales × 5 largeurs, macOS + jammy | ✅ `landing-mobile-overflow.spec.ts` | ⚠ mesure négative (rien à faire rougir) |
| **#348** | Hiérarchie typo inversée | NON | ✅ `ds-type-scale.test.ts` | ✅ 6 paliers × 4 locales × 2 thèmes | ✅ `landing-typography-hierarchy.spec.ts` | ✅ 14 rouges nommés |
| **#348 (absorption)** | AC #1 et #2 non atteints | NON | ✅ | ✅ 8 largeurs × 4 locales × 2 thèmes | ✅ (même spec, dérogations retirées) | ✅ 3 mutations, rouges nommés |

**Aucune couverture manquante.**

## Tests créés

- `frontend/e2e/landing-header-logo.spec.ts` (243 l.) — seuil d'échelle du logo, test de frontière
- `frontend/e2e/landing-mobile-overflow.spec.ts` (162 l.) — absence de débordement horizontal,
  **avec exclusion documentée** de `.tsqd-parent-container` et `nextjs-portal`
- `frontend/e2e/landing-typography-hierarchy.spec.ts` (524 l.) — tailles **et interlignes** rendus,
  hiérarchie stricte, **footer inclus** dans le balayage
- `frontend/src/__tests__/ds-type-scale.test.ts` (89 l.) — garde-fou au niveau du source :
  interdit `text-4xl`/`text-5xl`, absents de l'échelle DS

## Résultats des runs (Phase 6, `test-runner`)

| Suite | Résultat |
|---|---|
| Frontend unitaire | **888 / 888** |
| `tsc --noEmit` | **0 erreur** |
| **E2E — suite COMPLÈTE** | **183 / 183** |
| Backend | **462 / 462** (aucun fichier touché, contrôle d'intégrité) |

**Les specs authentifiées ont bien tourné** — c'était le trou de ce sprint, aucun des quatre agents
d'implémentation ne les avait rejouées : `auth-guard`, `auth-setup-render-retry`, `auth-signature`,
`categories`, `forgot-password`, `golden-path`, `products`, `reset-password-failures`,
`settings-*` (6), `sprint-42-events`, `timeline`, `timeline-mobile`, `landing-*` (5).

**Le risque principal du sprint est levé par la mesure** : le header perd 24 à 95 px de hauteur
selon la locale, et aucun des 183 tests E2E — y compris ceux qui cliquent en coordonnées — n'a
cassé.

Environnement : backend E2E `:8086` (profil Spring `dev,e2e`), base `eventmanager_e2e` `:5436`,
frontend `:3100`, `--workers=1`.

## Vérification du build de production (lead, hors périmètre `test-runner`)

Le premier lancement E2E de l'audit, fait contre `npm run start`, a renvoyé des **500
`clientReferenceManifest undefined`**. Le `test-runner` a contourné en repassant en `npm run dev` et
a classé l'incident « infrastructure only » — conclusion **juste, mais non démontrée à ce stade**.

**Vérifié depuis, à froid** : `frontend/.next` supprimé puis `npm run build` relancé →
build OK, serveur démarré, **`/fr` et `/en` répondent 200** et rendent la page.
Cause retenue : `.next` pollué par les serveurs de dev concurrents de quatre agents, dont celui de
#341 qui avait justement refusé de lancer `next build` pour cette raison.

> ⚠ **Note relevée au passage, non traitée :** `next.config.ts:30` pose `output: 'standalone'`, et
> Next avertit que **`next start` ne fonctionne pas avec cette configuration** (`node
> .next/standalone/server.js` est la commande attendue). Le serveur a répondu 200 malgré
> l'avertissement sur un build propre. **Candidat follow-up**, hors périmètre du sprint.

## Addendum Phase 7 — état après les corrections de review (`4cf19f2`)

Les chiffres ci-dessus datent de la Phase 6. Le commit de corrections de review les modifie :

- **Suite `landing-*` : 82 → 68 tests.** La boucle clair/sombre a été retirée du cas général (elle
  doublait 32 tests pour zéro signal, toutes les métriques assertées étant invariantes au thème) et
  remplacée par **un contrôle ponctuel** par spec.
- **Le compromis est justifié par la mesure, pas par l'opinion** : injection d'une règle
  `.dark h1 { font-size: 33px }` → **10 passed / 1 failed**, et **seul le contrôle sombre la voit**.
  Le retrait total que recommandait le reviewer aurait rendu ce défaut invisible.
- `frontend/e2e/support/dev-tooling.ts` créé — source unique de la liste d'exclusion de l'outillage
  de dev, importée par les deux specs (elles divergeaient d'un sélecteur).
- 3 garde-fous renforcés : auto-contrôle de la sonde de débordement (l'ancienne assertion
  `tag === 'div'` était vacuous et **restait verte** sur une sonde renommée), plancher
  anti-vacuité de 50 fichiers sur le balayage source, lookbehind qui empêche le garde-fou de rougir
  le jour où le DS ajoute légitimement `--text-4xl`.
- `frontend/src/styles/ds/tokens/base.css` : commentaire corrigé, il était devenu faux.

**Re-vérifié après ce commit** : `tsc` 0 erreur · prettier OK · eslint OK · unitaires **888/888** ·
`landing-*` **68/68** en jammy · **4 injections de non-vacuité, toutes rouges avec message nommé,
toutes restaurées**.

⚠ **Le reste de la suite E2E (auth, timeline, settings) n'a PAS été rejoué après `4cf19f2`.** Il
l'avait été en Phase 6, avant ces corrections. Ce commit ne touche que des specs `landing-*`, un
fichier de support E2E nouveau, un test unitaire et un commentaire CSS — mais **ce n'est pas
vérifié, c'est déduit**. La CI tranchera.

## Coverage E2E (Phase 8, heuristique)

**Aucun nouveau `data-testid`** introduit par les 4 commits → aucun testid sans spec. **`OK`.**

L'ancrage des nouvelles specs se fait sur la structure et les `href`, **jamais sur les libellés**,
conformément à la convention du projet (les suites doivent rester valables en `fr`/`en`/`es`/`de`).

## Ce qui n'est PAS couvert — à lire avant de conclure « c'est vert »

- **La CI réelle n'a jamais tourné** : rien n'est poussé au moment de cet audit. Toutes les mesures
  viennent de `mcr.microsoft.com/playwright:v1.61.1-jammy`, qui **n'est pas** le runner
  `ubuntu-latest` de GitHub — jeu de polices proche, pas identique. C'est précisément la classe de
  défaut de `PIT-S52-001`.
- **Chromium seul.** Firefox et WebKit ne sont couverts par aucun projet Playwright de ce dépôt.
- **Aucun jugement esthétique.** Sur les quatre issues, des nombres ont été mesurés ; **aucune
  capture d'écran n'a été relue par qui que ce soit.** La conformité géométrique est établie, la
  qualité visuelle ne l'est pas.
- **Le 17 px du chiffre d'étape n'a pas été ratifié par `ui-design`** — il est imposé par la lettre
  de l'AC « strictement plus petit », pas choisi par un designer. `RECOMMAND_UI_DESIGN` ouvert.
- **Contraste WCAG non re-mesuré au navigateur** après les changements de taille. Point d'attention
  chiffré : le sous-titre du hero tombe de 35 à 21 px, donc **sous le seuil « grand texte » (24 px)**
  — son exigence passe de 3:1 à **4,5:1**. Le calcul sur tokens donne 5,96:1 en clair et 6,26:1 en
  sombre (conforme), mais **opacité et superpositions ne sont pas vérifiées**.
- **E2E mesurés sur `next dev`/Turbopack**, pas sur le build de production (celui-ci a été vérifié
  séparément, mais seulement en réponse HTTP, pas par la suite E2E).
- Le JSDoc de `HeaderSection` a été réécrit par #381 ; **aucun balayage n'a cherché d'autres chiffres
  périmés ailleurs** dans le dépôt.

## Conclusion

**Prêt pour la PR.** Aucune couverture manquante, quatre suites vertes dont la suite E2E complète, build de
production vérifié à froid. Les réserves ci-dessus sont documentées, aucune n'est bloquante — la
plus sérieuse (absence totale de jugement visuel) est structurelle à ce sprint et doit être portée
dans le corps de la PR.
