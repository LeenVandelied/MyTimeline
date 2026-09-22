# Issue #532 — `<h1>` des pages légales : débordement sous 640 px (Sprint 77, vague 4)

## 1. Objectif

Supprimer le débordement horizontal des pages `/privacy` et `/terms` causé par un `<h1>` à
`text-3xl` (**57 px** dans l'échelle du DS), dans les 4 locales, et solder le test de
caractérisation que le Sprint 76 avait laissé comme marqueur de dette.

## 2. RE-MESURE AVANT correctif — l'énoncé de l'issue est PÉRIMÉ

Instrument : Chromium (Playwright), `next dev` (webpack, port 3000), 4 locales × 5 largeurs,
largeur du viewport **refixée explicitement juste avant chaque mesure**. Balayage
`rect.right > clientWidth` avec exclusion des défileurs et de l'outillage de dev
(`e2e/support/dev-tooling.ts`, [[PIT-S59-002]]) mais **pas** de `<body>` ([[PIT-S63-012]]),
plus la sonde de défilement réel `window.scrollTo(5000, y)` → `scrollX`.
Script : `scratchpad/measure.js`, relevé brut : `scratchpad/before.json`.

Débordement de PAGE (`scrollWidth − clientWidth`, en px ; `maxScrollX` identique à chaque ligne) :

| locale | page | 320 | 375 | 414 | 640 | 768 |
|---|---|---|---|---|---|---|
| `fr` | /privacy | **+177** | **+122** | **+83** | 0 | 0 |
| `fr` | /terms | **+107** | **+52** | **+13** | 0 | 0 |
| `en` | /privacy | 0 | 0 | 0 | 0 | 0 |
| `en` | /terms | 0 | 0 | 0 | 0 | 0 |
| `es` | /privacy | **+64** | **+9** | 0 | 0 | 0 |
| `es` | /terms | **+116** | **+61** | **+22** | 0 | 0 |
| `de` | /privacy | **+379** | **+324** | **+285** | **+59** | 0 |
| `de` | /terms | **+395** | **+340** | **+301** | **+75** | 0 |

**En quoi l'énoncé était périmé.** L'issue affirme un débordement « non corrélé à la locale »
et donne `fr +122 / en +109 / es +111 / de +124` @375 px sur `/privacy`. Ces chiffres ont été
relevés quand les 4 locales affichaient le **même titre français** ; la vague 2 (#533, `9d90407`)
a traduit les titres. Après traduction :

- **`en` n'a plus AUCUN débordement**, à aucune largeur (« Privacy Policy », « Terms of Use ») —
  l'issue lui prêtait +109 px ;
- **`de` est le cas dimensionnant**, avec un facteur ~3 sur `fr` (+324 contre +122 @375) et
  **un débordement qui survit à 640 px** (+59 / +75), largeur que l'issue déclarait saine ;
- le seul mot « Datenschutzerklärung » mesure **581 px** à 57 px, « Nutzungsbedingungen » **597 px** ;
  aucune largeur mobile ne peut les contenir à cette taille.

Seul le `fr` @375 (+122) recoupe encore l'issue. Le tableau de l'énoncé n'a donc servi qu'à
comprendre l'intention ([[PIT-S71-001]]).

**SECOND FAUTIF, non prévu par l'issue et invisible au balayage.** En neutralisant le `<h1>`, la
page `de` déborde ENCORE de +72 px (`/privacy`) et +84 px (`/terms`) à 320 px, **avec zéro fautif
au balayage `rect.right`** : ce sont les `<h2>` de section (`text-xl`, 35 px) dont les composés
allemands débordent **leur propre boîte** — un texte qui déborde sa boîte n'élargit pas son
rectangle, seul `scrollWidth > clientWidth` le voit. Mesuré (`scratchpad/third.js`) :

| élément | texte | scrollWidth / clientWidth @320 |
|---|---|---|
| `h2.text-xl` `/privacy` | « Änderungen dieser Datenschutzerklärung » | 343 / 222 (+121) |
| `h2.text-xl` `/terms` | « Artikel 8 – Änderung der Nutzungsbedingungen » | 355 / 222 (+133) |
| `h2.text-xl` `/terms` | « Artikel 1 – Begriffsbestimmungen » | 354 / 222 (+132) |

Corriger le seul `<h1>` aurait donc laissé la page allemande en défilement horizontal : les `<h2>`
sont entrés dans le périmètre pour cette raison, mesure à l'appui.

## 3. Le correctif — rampe typographique responsive + repli d'en-tête + filet

`frontend/app/[locale]/privacy/page.tsx` et `frontend/app/[locale]/terms/page.tsx` :

```
- <div className="flex items-center mb-6">
+ <div className="flex flex-wrap items-center gap-y-2 mb-6">
- <h1 className="text-3xl font-bold gradient-text">
+ <h1 className="w-full min-w-0 break-words hyphens-auto text-xl font-bold gradient-text
+                sm:w-auto md:text-2xl lg:text-3xl">
- <h2 className="text-xl font-semibold mb-4">                       (× 9 + × 11)
+ <h2 className="text-xl font-semibold mb-4 break-words hyphens-auto">
```

**La rampe : 35 / 45 / 57 px** (`text-xl` → `md:text-2xl` → `lg:text-3xl`), les trois derniers
paliers de l'échelle DS (13/15/17/21/27/35/45/57). Pourquoi ces paliers :

- c'est **exactement la rampe déjà retenue pour le `<h1>` de la landing**
  (`src/components/landing/HeroSection.tsx:88`) — les deux familles de pages s'accordent au lieu
  de diverger ;
- **on ne descend pas sous 35 px** : les `<h2>` de section valent `text-xl` (35 px, mesuré) ; un
  `<h1>` à 27 px inverserait la hiérarchie typographique ;
- **57 px est conservé à partir de `lg`** : le rendu desktop est strictement inchangé ;
- l'échelle DS **s'arrête à `text-3xl`** — `text-4xl`/`text-5xl` retombent sur les défauts
  Tailwind (36/48 px), donc PLUS PETIT (`src/__tests__/ds-type-scale.test.ts`). La rampe reste
  donc bornée en haut par `text-3xl`.

**Le repli** (`flex-wrap` + `w-full sm:w-auto`) donne au titre toute la largeur de contenu sous
640 px : **288 px @320** au lieu de 186 px à côté du bouton « Retour ». Sans lui, la seule rampe
coupait « Confidentialité » (234 px à 35 px) en plein mot **en français** dès 320 px — mesuré,
candidat A de `scratchpad/candidates.js`. À partir de `sm`, le titre revient sur la ligne du bouton :
la mise en page desktop et tablette est inchangée.

**Le filet** `min-w-0` + `break-words` : le `<h1>` est enfant DIRECT d'un flex, donc `break-words`
seul ne réduit pas min-content ([[PIT-S73-001]]). Le couple garantit qu'aucune longueur de titre
future ne peut remettre la page en défilement horizontal. Sur les `<h2>` (blocs, pas des items de
flex) `break-words` suffit seul.

**`hyphens-auto`, et ce qu'il change réellement.** L'attribut `lang` est posé sur `<html>`
(`app/[locale]/layout.tsx:50`), donc la césure est possible. **Mesuré** (`scratchpad/armed.js`,
rects de ligne via `Range.getClientRects()`) sur `/de/privacy` @320 :
`hyphens:auto` → 3 rects `[235,4 · 11,7 · 121,4]` (le rect de 11,7 px **est le tiret**),
`hyphens:none` → 2 rects `[282,9 · 73,9]`. Chromium coupe donc « Datenschutz-erklärung » à la
syllabe au lieu de trancher en plein mot. C'est une **amélioration progressive** : là où le moteur
n'a pas de dictionnaire (runner CI possiblement), on retombe sur `break-words`, sans débordement.

**Ce que j'ai écarté :**

- `min-w-0 + break-words` SEUL, sans rampe (piste de l'issue) : supprime le débordement mais laisse
  le titre à 57 px, coupé en plein mot sur 246 px de haut ;
- descendre la rampe à 27 px sous `sm` (candidat C, mesuré) : supprime toute césure allemande mais
  **inverse la hiérarchie** (h1 27 px < h2 35 px) ;
- ramper aussi les `<h2>` (27/35) : cohérent, mais ne suffisait pas — à 27 px « Begriffsbestimmungen »
  fait encore 273 px pour 222 px disponibles. `break-words` est le seul correctif qui tienne à 320 px ;
- forcer le titre sur sa propre ligne à TOUTES les largeurs (`flex-basis:100%`) : refonte visible
  du desktop, hors mandat.

**Portée de la décision de charte.** Elle vaut pour **ces deux pages seulement**. `text-3xl` n'est
employé ailleurs que par la landing (`HeroSection`, déjà rampé ; `HeaderSection`, commentaires
historiques) — grep `text-3xl` sur `app/` + `src/` : 2 occurrences légales, 2 landing, le reste en
tokens/tests/commentaires. **Ce que ce choix laisse ouvert** : les autres `<h1>`/`<h2>` du produit
(dashboard, auth, réglages) n'ont PAS été mesurés en `de` ; rien ne dit qu'ils tiennent à 320 px.
Cf. recommandations.

## 4. RE-MESURE APRÈS correctif

Même instrument, mêmes locales, mêmes largeurs (`scratchpad/after.json`) :

| locale | page | 320 | 375 | 414 | 640 | 768 |
|---|---|---|---|---|---|---|
| `fr` | /privacy · /terms | 0 · 0 | 0 · 0 | 0 · 0 | 0 · 0 | 0 · 0 |
| `en` | /privacy · /terms | 0 · 0 | 0 · 0 | 0 · 0 | 0 · 0 | 0 · 0 |
| `es` | /privacy · /terms | 0 · 0 | 0 · 0 | 0 · 0 | 0 · 0 | 0 · 0 |
| `de` | /privacy · /terms | 0 · 0 | 0 · 0 | 0 · 0 | 0 · 0 | 0 · 0 |

**40 combinaisons : `scrollWidth == clientWidth`, `maxScrollX == 0`, liste de fautifs vide.**
Taille rendue du `<h1>` : 35 px < 640, 35 px @640 (le palier `md` est à 768), 45 px @768, 57 px
à partir de 1024 — inchangé au desktop.

**Instrument RE-ARMÉ après correctif** (un « 0 » non armé ne vaut rien, [[PIT-S62-003]]).
La sonde d'origine (mot insécable injecté) ne suffit plus : le filet l'absorbe, ce qui est le
comportement voulu. On retire donc le filet à l'exécution
(`overflow-wrap:normal; min-width:auto; width:auto; font-size:57px`) et le défaut revient, détecté :

| cas | débordement rétabli | fautif vu |
|---|---|---|
| `de`/privacy @320 · @375 | +277 · +222 | `h1` |
| `de`/terms @320 · @375 | +293 · +238 | `h1` |
| `fr`/privacy @320 · @375 | +77 · +22 | `h1` |

## 5. Sort du test de caractérisation S76

**RETOURNÉ en garde anti-régression**, pas seulement supprimé (`e2e/sprint-76-legal-visual.spec.ts`) :

- `KNOWN_PAGE_OVERFLOW` et son commentaire de 40 lignes : **supprimés**, remplacés par un bloc qui
  documente le correctif et le relevé avant/après ([[PIT-S63-009]] : un marqueur de dette laissé en
  place fige le périmètre de l'issue suivante) ;
- le test `— le seul débordement de page reste le <h1> pré-existant` : **remplacé** par
  `— aucun débordement de page à {320|375}px (#532)`, soit **2 largeurs × 2 pages = 4 tests**
  (l'ancien en comptait 2). Il asserte : liste de fautifs vide **sur toute la page** (plus de filtre
  `inScope`), `scrollWidth ≤ clientWidth`, `maxScrollX === 0` ;
- **contrôle négatif intégré** au test : le filet est retiré à l'exécution et le `<h1>` DOIT
  reparaître dans la liste des fautifs, sinon la garde ne mesure rien ;
- la largeur du viewport est **refixée juste avant la mesure** (piège de mesure rencontré ce sprint) ;
- deux commentaires devenus faux ont été corrigés : celui du verrou de périmètre de #527 et celui de
  l'auto-contrôle (« référence prise sur le périmètre parce que le `<h1>` déborde déjà »).

Sans cette mise à jour, la CI serait rouge : le test figeait le défaut et rougissait à sa correction.

## 6. E2E joués

**Recette exacte** (chemin 2 de `playwright.config.ts` — serveur déjà lancé, donc **webpack**,
pas turbopack ; en worktree turbopack infère un mauvais workspace root, [[PIT-S61-007]]) :

```
cd frontend
NEXT_PUBLIC_API_URL=/api E2E_API_PROXY_TARGET=http://localhost:8085 npx next dev -p 3000
# oracle proxy : curl -s -o /dev/null -w '%{http_code}' http://localhost:3000/api/auth/me → 401 (OK)
SKIP_DELEGATION=1 PLAYWRIGHT_BASE_URL=http://localhost:3000 \
  npx playwright test e2e/<spec> --project=chromium --no-deps --reporter=list
```

`--no-deps` écarte le projet `setup` : ces deux pages sont **publiques** et aucune des deux specs
n'utilise de `storageState` (vérifié par grep). Aucun compte E2E n'a donc été provisionné, aucun
budget `register` consommé ([[PIT-S62-011]]). Le conteneur backend disponible (`:8085`) porte une
image du **2026-08-30**, antérieure au sprint ([[PIT-S72-005]]) — il n'a servi qu'à satisfaire
l'oracle du proxy, aucun test ne dépend de lui.

| spec | résultat | durée | code de sortie |
|---|---|---|---|
| `e2e/sprint-76-legal-visual.spec.ts` | **12 passed / 0 failed** | 12,0 s | **0** |
| `e2e/sprint-75-legal-pages.spec.ts` | **28 passed / 0 failed** | 8,9 s | **0** |

La spec S76 était la **dette du sprint** : #457 (vague 1) a modifié
`src/components/legal/legal-table-of-contents.tsx:52` (retrait de `ring-2 ring-ring
focus-visible:outline-none`), surface exactement couverte par cette spec, et aucun E2E n'avait tourné
depuis. **Elle est verte** : les 4 tests de contraste (chiffres romains, liens du sommaire,
disclaimer, thèmes clair ET sombre) passent sur le code de #457, ainsi que les 2 auto-contrôles du
harnais. La dette est soldée.

**CE QUE JE N'AI PAS JOUÉ** : la suite E2E complète (≈240 tests) — consigne de ciblage + budget
`register` 5/min/IP. Les autres specs ne touchent pas les pages légales (grep `privacy|terms` sur
`e2e/` : seulement ces 2 fichiers). Firefox/WebKit non joués (le projet `firefox` est restreint à
une seule spec sans rapport). Aucune capture de référence visuelle n'existe encore pour ces pages
(#294, vague suivante).

## 7. Tests

| commande | résultat | code de sortie |
|---|---|---|
| `npx vitest run` | **112 fichiers / 1296 tests passed** en 17,0 s | **0** |
| `npx tsc --noEmit` | aucune erreur | **0** |
| `npx next lint` | `✔ No ESLint warnings or errors` | **0** |
| `npx next build` | build complet, `/[locale]/privacy` et `/[locale]/terms` prérendues SSG × 4 locales | **0** |

`npx prettier --check` signale les 2 pages — **mais elles étaient DÉJÀ non conformes avant mon
commit** (vérifié en rejouant `prettier --check` sur les versions `HEAD`). Prettier n'est pas dans
`ci.yml`. Je ne reformate pas : ce serait du bruit hors périmètre.

Aucune CI ne tourne sur `sprint/77` ([[PIT-S64-008]]) : ces runs locaux sont le gate.

## 8. Signaux `[MEMORY:*]`

`[MEMORY:pitfall]` **Un commentaire JSX `{/* … */` sans son `}` fermant fait dire à SWC
« Unterminated regexp literal » en désignant une ligne SITUÉE PLUS BAS.** Contexte : commentaire de
décision de 33 lignes inséré dans le JSX ; les deux pages sont tombées en 500 avec un curseur pointé
sur `</div>` quatre lignes après le vrai défaut. Le `{` non refermé fait lire `/* …` comme le début
d'une **regexp**, et un commentaire court (`{/* x */`) « fonctionne » par accident car il forme une
regexp syntaxiquement close — d'où un piège qui ne se manifeste que sur les commentaires longs.
Prévention : après insertion d'un bloc `{/* … */}` généré par script, vérifier la fermeture `*/}`
et exiger un 200 sur la route avant de mesurer quoi que ce soit. Diagnostic : bisection sur le
serveur de dev (3 min), pas relecture.

`[MEMORY:pitfall]` **Un balayage `rect.right > clientWidth` ne voit pas un texte qui déborde SA
PROPRE boîte.** Le débordement de page allemand résiduel (+72 / +84 px @320) provenait de `<h2>`
dont le `scrollWidth` dépasse le `clientWidth` sans que leur rectangle grandisse : le balayage
rendait **zéro fautif** alors que `documentElement.scrollWidth` était bien supérieur. Un balayage
qui rend « 0 fautif » alors que la page déborde n'est pas un faux positif de la page : c'est un
angle mort de l'instrument. Prévention : joindre au balayage une passe
`scrollWidth > clientWidth` sur tous les éléments avant de conclure.

`[MEMORY:pattern]` **Rampe typographique responsive sur l'échelle DS** : `text-xl md:text-2xl
lg:text-3xl` (35/45/57) + `min-w-0 break-words` (le titre est enfant de flex) + repli d'en-tête
`flex-wrap` / `w-full sm:w-auto` + `hyphens-auto` (l'attribut `lang` est déjà posé sur `<html>`).
Anti-pattern : descendre la rampe sous la taille des `<h2>` de la même page (hiérarchie inversée),
et croire qu'un `break-words` seul suffit sur un item de flex.

`[MEMORY:business-rule]` Aucune règle métier touchée.

## 9. Recommandations suite

`RECOMMAND_FOLLOWUP` : doter le balayage de débordement partagé (`e2e/sprint-76-legal-visual.spec.ts`
et les 3 specs qui portent le même motif) d'une passe `scrollWidth > clientWidth`, pour attraper les
textes qui débordent leur boîte sans élargir leur rectangle — angle mort mesuré ici sur les `<h2>`
allemands. `[triage S | domaine frontend]`

`RECOMMAND_FOLLOWUP` : auditer en `de` @320 px les autres surfaces à gros titres (dashboard, auth,
réglages, landing) — la présente issue n'a mesuré QUE les deux pages légales, et rien ne dit que les
composés allemands y tiennent. `[triage M | domaine frontend]`

`RECOMMAND_FOLLOWUP` : décider si la rampe `text-xl md:text-2xl lg:text-3xl` doit devenir la règle
de charte pour TOUS les `<h1>` du produit (elle est aujourd'hui dupliquée entre `HeroSection` et les
2 pages légales) plutôt qu'un choix répété page par page. `[triage S | domaine design-system]`

`RECOMMAND_TEST_RUNNER` : aucun besoin, les 2 specs ciblées ont été jouées ici avec leurs codes de sortie.
`RECOMMAND_DB_EXPERT` : sans objet, aucune couche persistance ni migration touchée.
`RECOMMAND_SECURITY_EXPERT` : sans objet, aucune surface d'authentification ni de donnée personnelle touchée.
`RECOMMAND_ARCHITECT` : sans objet, aucun choix structurant hors charte typographique déjà tranchée ci-dessus.

STATUS: COMPLETED
