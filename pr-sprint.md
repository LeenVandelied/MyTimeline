## Objectif

**MVP local — la frise redevient utilisable à la souris.** Ce sprint lève le seul défaut vérifié
du parcours cœur qui rendait une action utilisateur *impossible* : un événement posé près du
début de la période était recouvert par l'en-tête de lane sticky, donc non cliquable, sans aucun
défilement permettant de le dégager.

Milestone : **Sprint 56** (#57). Cohésion 0.44. 4 issues, 6 points, **4/4 livrées**.
Périmètre **frontend uniquement** — 0 fichier `.java`, 0 `.sql`, aucune migration Flyway.

## Issues traitées

| Commit | Issue | P/Size | Objet |
|---|---|---|---|
| `9737d5b` | #393 | P3/XS→S | Couleur d'événement par défaut conforme AA + dédup de `DEFAULT_COLOR` |
| `143edc0` | #392 | P2/S | Gouttière de piste : les événements sous l'en-tête sticky redeviennent cliquables |
| `c87034d` | #395 | P2/S | `aria-pressed` sur le bouton plein écran, dérivé de `fullscreenchange` |
| `f1a6827` | #391 | P3/XS→S | Suppression de la branche de chargement morte `timeline-loading` |

> #393 et #391 étaient annoncées XS ; toutes deux se sont révélées plus larges (constante
> dupliquée non citée pour l'une, test unitaire caduc non listé pour l'autre).

## Changements clés

### #392 — gouttière de piste (et non `pointer-events`)

Une gouttière de `--lane-header-w` (168 px) est réservée en tête de rail ; tout le contenu
positionné y est décalé (graduations, week-ends, ligne TODAY, pastilles). À `scrollLeft=0`
l'en-tête occupe exactement la gouttière : aucune pastille ne peut naître sous lui, **à aucun
zoom** (offset en px, indépendant du px/jour).

`pointer-events: none` a été **écarté** : l'en-tête *est* le bouton d'accordéon produit (#195).
Même borné, il aurait laissé la pastille sous un fond opaque — cliquable à l'aveugle, donc
toujours invisible. Un `padDays` dépendant du zoom a également été écarté : `rangeStart` serait
devenu fonction du zoom, défaisant la mémoïsation de #349.

⚠ **Le zoom Année était cassé lui aussi** (66 px < 168), ce que l'issue ne mentionnait pas — elle
ne citait que Trimestre. 3 niveaux sur 5 passaient, ce qui masquait le défaut.

Effet de bord trouvé **au navigateur** (invisible en test) : `buildRulerTicks` émet des
graduations à offset négatif, jusque-là hors rail donc invisibles, que la gouttière faisait
apparaître au-dessus de la colonne produit. Corrigé par un coin sticky sur la règle.

### #393 — `#6366f1` → `#3B62D4`

Ratio mesuré **5,407:1** (contre 4,467, sous le seuil AA de 4,5). Conséquence utilisateur : le
libellé d'un événement sans couleur explicite repasse **dans** la pastille au lieu d'être rejeté
à l'extérieur.

`#4f46e5` (indigo-600) a été écarté malgré sa conformité : indigo Tailwind hors palette DS, alors
que le projet a déjà purgé ses indigos/violets (purge gardée par `landing-palette.test.ts`).
`#3B62D4` (`--evt-cobalt`) appartient à la palette curated et était déjà l'échantillon « AA OK »
d'`EventPill.test.tsx`.

Une **seconde constante `DEFAULT_COLOR` dupliquée** existait dans `EventContent.tsx`, non citée
par l'issue — `EventContent` importe désormais la source unique.

### #395 — état dérivé, pas état optimiste

`aria-pressed` est dérivé de l'événement `fullscreenchange` (+ sync initial au montage), jamais
d'un `setState` dans le handler : l'état plein écran change aussi par Échap natif, F11 et le menu
du navigateur. Le stub E2E, qui mutait l'état sans émettre l'événement, a été rendu fidèle.

### #391 — suppression, pas renommage

La branche `if (loading)` de `timeline/page.tsx` était inatteignable depuis #210 (le shell ne
monte pas `children` tant que `loading || !user`). `app-shell-loading` devient le testid canonique
unique — renommer aurait produit deux éléments portant le même testid.

`if (!user) return null` et `timeline-data-loading` sont **conservés** (garde defense-in-depth et
testid distinct atteignable).

## BR impactées

**BR-EVE-009** uniquement (modèle couleur unique, encre calculée par contraste WCAG). Contrat
inchangé : seule la valeur par défaut change, et elle devient conforme AA.

Aucun changement backend, aucun changement d'authentification.

## Audit tests

Détail : `docs/memory/audits/sprint-56-test-coverage.md`.

| Suite | Résultat |
|---|---|
| Backend | **452 / 0 échec** |
| Frontend unit | **839 / 0 échec** (92 fichiers) |
| E2E timeline | **47 / 0 échec** |
| `tsc --noEmit` | 0 erreur |
| Coverage-E2E (testids) | OK |

### 4 échecs E2E locaux, tous environnementaux

- **3 connus** — `forgot-password`, `reset-password-failures` (×2) : HTTP 401 sur l'endpoint
  test-only de reset, backend local lancé **sans le profil `e2e`**. Déjà rouges avant ce sprint ;
  aucun de ces fichiers ne référence `timeline`.
- **1 faux positif infirmé** — `golden-path` : `application.properties:93-97` documente que le
  rate limiting est actif par défaut **par IP**, et que le **seul** contexte le désactivant est le
  job CI e2e, précisément parce que le setup Playwright provisionne plusieurs comptes depuis une
  IP unique. Relancé **en isolation** sur le même HEAD : **golden-path passe**. Dans ce même run,
  les 4 étapes de provisioning partent en timeout — le throttle est bien actif localement.

La CI, qui pose `RATE_LIMIT_ENABLED=false` sur son job e2e, est l'arbitre.

## Qualité des tests — 4 pièges « vert qui ne prouve rien » désamorcés

Motif récurrent du projet. Chaque cas a été **mesuré**, pas supposé :

1. **#392** — jsdom ne fait pas de hit-testing → clic Playwright réel sans `force`, oracle mesuré
   (pastille à 150 px sous 168 px recouverts), rouge constaté avant correctif.
2. **#393** — un garde-fou sur littéral recopié reste vert si la constante dérive → assertion sur
   la constante **importée** ; en remettant l'ancienne valeur : exactement 2 échecs.
3. **#395** — la variante naïve (`useState` dans le handler) ne casse **qu'un seul** test, celui
   qui contourne le bouton. Sans ce cas, l'issue aurait été satisfaite par un `aria-pressed` qui
   **ment** à un lecteur d'écran.
4. **#391** — un E2E d'état transitoire reste vert sans sa gate → assertion de **stabilité**
   (visible → pause bornée → toujours visible). Sans elle, mesure faite : le test restait vert
   gate retirée.

## Review

6 `[OK]`, 1 `[MINEUR]`, **aucun bloquant**. Vérification dans le code de la cohérence des deux
repères d'abscisse introduits par #392 (`windowEvents`, `ensureVisible`, synchro minimap,
`scrollToToday`), de l'absence de fuite CSS vers minimap/mobile/preview, du cleanup de l'écoute
`fullscreenchange`, et de la source unique de `DEFAULT_COLOR`.

`[MINEUR]` **non corrigé volontairement** : `timeline.css` porte un `var(--lane-header-w, 160px)`
désynchronisé du token (168 px). **Vérifié pré-existant sur `dev`** — hors périmètre, versé au
triage des follow-ups.

## Non vérifié (déclaré)

- **Thème sombre** : aucune des 4 issues n'a été regardée au navigateur en sombre.
- **Vues mobiles** au navigateur (leurs E2E passent ; les préfixes `mt-tlm`/`mt-tll` ne sont pas
  touchés).
- Vrai plein écran non stubé, F11 réel, lecteur d'écran réel — #395 couvre les 4 chemins **par
  construction**, `fullscreenchange` étant la source de vérité.
- `next build` non relancé après le dernier commit.

## Follow-ups remontés (triage en `/sprint end`)

- `playwright.config.ts` — le `webServer` lance `npm run dev` **nu**, sans
  `E2E_API_PROXY_TARGET`/`NEXT_PUBLIC_API_URL` : `npx playwright test` nu est systématiquement
  rouge au setup, avec un message trompeur orientant vers rate-limit/CORS.
- `application-dev.properties:35` — `app.cors.allowed-origins` figé à `:3000` : l'E2E local
  devient impossible dès que ce port est pris par un autre projet.
- `timeline.css` — fallback `var(--lane-header-w, 160px)` désynchronisé du token (pré-existant).
- Ligne TODAY (`--z-cursor` 20) au-dessus de l'en-tête de lane et du coin de règle
  (`--z-sticky` 10) : convention préexistante, mais un trait bleu traverse la colonne fixe.
  Décision design.

🤖 Generated with [Claude Code](https://claude.com/claude-code)
