# Issue #417 — [BUG] Contour de focus rogné dans `.mt-zoom` et le tablist des réglages

Sprint 74, vague 1 (parallèle). Taille XS. `epic:design` / `priority:P3`.

## Commits

- `0c40f9d` — implémentation initiale (fullstack-dev), 4 fichiers
- `801dadd` — **retournement de la zone A par le lead après mesure au navigateur** (cf. §
  « Zone A — remède changé »)

## Zone A — remède CHANGÉ après mesure au navigateur

**Ce que le fullstack-dev avait livré** (`0c40f9d`) : `.mt-zoom__btn:focus-visible{
outline-offset:-2px}`, la piste prescrite par l'énoncé, plus un override
`.mt-tlm .mt-zoom__btn:focus-visible{outline-offset:2px}` pour préserver le cas mobile.

**Pourquoi c'était le mauvais remède.** La vérification navigateur du lead a réalisé le risque
que l'issue énonçait elle-même (« vérifier qu'il ne recouvre pas le libellé sur les cibles les
plus étroites ») :

- `.mt-zoom__btn` mesure **30 × 16,5 px** ; l'icône `<svg>` mesure **14 × 14 px**
- un trait inset de 2 px ne laisse que **8,5 px** libres → l'icône déborde du trait en **haut,
  bas et gauche**
- aucune valeur inset ne s'en sort : `-1px` → 10,5 px, `0` → 12,5 px, toujours < 14 px.
  **Le problème est la hauteur du bouton, pas la valeur de l'offset.**

Le fullstack-dev n'avait aucun moyen de le voir : le briefing lui interdisait le navigateur
(working tree partagé), et il avait explicitement listé ce point comme non vérifié. Son
raisonnement écrit supposait « un glyphe mono de 15px » — ce sont en réalité des icônes SVG.

**Remède retenu** (`801dadd`, arbitré avec le développeur) : retirer `overflow:hidden` de
`.mt-zoom` et porter l'arrondi sur `.mt-zoom__btn:first-child` / `:last-child`. Le contour du
DS (+2 px) peint alors **dehors**, sur ses 4 côtés, sans toucher l'icône. C'est exactement ce
que #226 appliquait déjà en contexte `.mt-tlm` : même cause (le clip du groupe), même
correctif, **un seul motif dans le DS** au lieu de deux.

Conséquences : l'override `.mt-tlm .mt-zoom__btn:focus-visible{outline-offset:2px}` devient
inutile et disparaît ; `.mt-tlm .mt-zoom{overflow:visible}` est conservée en garde et annotée.

### Vérification navigateur du remède (focus armé au clavier réel)

- **desktop 1440 px** : `.mt-zoom` ne figure plus parmi les ancêtres clippants ; le seul
  restant est `.mt-tlv`, qui ne rogne **aucun** des 4 côtés. Contour à `+2px`, hors du bouton,
  icône intacte.
- **mobile 390 px** : boutons à 44 px (hitbox #226), seul ancêtre clippant `.mt-tlm`,
  **0 côté rogné**.
- **contre-épreuve du fond** (ce que `overflow:hidden` gardait) : bouton rempli d'une couleur
  franche et agrandi 8×, le fond **suit l'arrondi** — aucun débordement carré.
- contrastes : **6,08:1** clair (`#0E5FC4` sur `#FFFFFF`) / **6,48:1** sombre (`#4D9BFF` sur
  `#131519`), et **5,53:1** contre le fond de toolbar.

## Zone B — l'énoncé ET mon briefing se trompaient de composant

**Correction à porter au crédit du fullstack-dev, contre les deux sources qu'il avait.**

Le tablist des réglages (`SettingsShell.tsx:64`) **n'utilise pas** `.mt-tabs` / `.mt-tab` : il
est composé d'utilitaires Tailwind bruts (`flex h-11 shrink-0 … rounded-md px-3`). `.mt-tab`
(`core.css:251-260`) sert aux onglets **produits** (`ui/tabs.tsx`, consommé par
`ProductDetailView` et `products/page.tsx`). Le briefing du lead affirmait le contraire et
aurait fait corriger un composant voisin en laissant le vrai défaut en place. `.mt-tab` n'a
donc **pas** été modifié.

**Remède retenu** — `core.css:262` :
`.mt-tablist-scroll > [role='tab']:focus-visible{outline-offset:-2px;}`, plus la classe
`mt-tablist-scroll` ajoutée au `<nav>` (`SettingsShell.tsx:67`). Le nav n'avait aucune classe
DS : sans point d'accroche, le correctif ne pouvait pas exister côté CSS seul.

**Écart de périmètre assumé.** Le briefing n'autorisait `SettingsShell.tsx` que pour un remède
« côté conteneur ». L'agent l'a édité pour un simple nom de classe, l'a signalé explicitement,
et n'a introduit ni valeur en dur ni impact i18n/layout. L'alternative conteneur (padding
vertical de 4 px pour libérer les 4 px de contour) a été écartée : géométrie « pile-poil »
donc fragile (cf. le cas `SelectContent` du §8bis de `a11y-audit.md`), et elle décale les
onglets par rapport à la colonne de contenu.

## Arbitrage face à `a11y-audit.md:326` (la contradiction signalée dans le briefing)

L'objection du cas `<tr>` — « l'offset négatif poserait le trait SUR la bordure `border-b` » —
**tient**, et c'est précisément la raison de ne pas toucher `.mt-tab` (son `border-bottom`
d'accent porte l'état sélectionné, et il n'a que 1 px de padding latéral).

Elle **ne s'applique pas** aux onglets des réglages : pastilles `rounded-md` **sans bordure**,
`h-11`, `px-3` → à −2 px le trait est à 2 px du bord de la pastille et à 10 px du libellé.
Arbitrage consigné dans `a11y-audit.md` §8ter.

## Vérifié (commandes réellement exécutées)

- `npx tsc --noEmit` → `No errors found`
- `npx eslint src/components/settings/SettingsShell.tsx` → `No issues found`
- `npx vitest run SettingsShell.test.tsx base-layer.test.ts control-border-tier.test.ts`
  → **51 passés / 0 échec**
- `git show --stat` → 4 fichiers, tous du périmètre

Aucun test unitaire n'a été écrit **délibérément** : jsdom ne peint pas et ne fait pas de
layout, « 4 côtés peints » n'y est pas observable. Un test vert aurait été une fausse preuve.

## NON vérifié — les critères d'acceptation 1, 2 et 3 restent OUVERTS

- ~~Rendu navigateur~~ → **FAIT par le lead** après coup, dans les deux thèmes, sur les deux
  zones. Résultats ci-dessus et dans `docs/memory/audits/sprint-74-test-coverage.md`. Les
  ratios estimés par le fullstack-dev depuis les tokens sont confirmés **à 0,02 près**.
- Reste non vérifié : le comportement en `:hover` **simultané** au focus (le fond passe à
  `--color-surface-2`, non mesuré), et le mode `forced-colors: active`.
- ⚠ **Sources non lues.** L'agent a travaillé sur les résumés inlinés dans le briefing, pas sur
  `docs/memory/sprints/sprint-58/design-arbitrage-383-352.md` ni sur les entrées
  `pit-frontend.md` (`PIT-S58-001`, `PIT-S62-007`, `PIT-S53-001/004`, `PIT-S63-005`). Il l'a
  déclaré. À garder en tête si un arbitrage de charte est rediscuté.

## Checklist navigateur pour le lead (les deux thèmes, `next-themes`)

1. **Zoom desktop** — `/{locale}/dashboard`, timeline chargée. Sélecteur `.mt-zoom__btn` (deux,
   `+` et `−`, encadrant `[data-testid="timeline-zoom-level"]`). Tab depuis le header jusqu'aux
   boutons de zoom. Observer : trait bleu **fermé sur 4 côtés**, à 2 px à l'intérieur du bouton,
   **sans toucher le glyphe**. Bouton 30 px, glyphe mono 15 px — c'est le point de rupture le
   plus probable ; si le trait mord le glyphe, passer à `-1px`.
2. **Zoom mobile** — même route, viewport < 768 px (`.mt-tlm`, `TimelineMobilePortrait`) :
   **non-régression**, le contour doit rester **à l'extérieur** (+2 px) et sur 4 côtés.
3. **Onglets réglages** — `/{locale}/settings`. Sélecteur
   `[data-testid="settings-tablist"] > button[role="tab"]`. Tab jusqu'au tablist (un seul onglet
   tabbable, `tabIndex` roving), puis ←/→. ⚠ Les flèches déplacent focus **et** sélection : le
   contour est **toujours** sur l'onglet sélectionné, donc **toujours sur `bg-accent-soft`** —
   c'est le couple de contraste à mesurer. Observer 4 côtés, y compris sur le **premier** onglet
   (bord gauche du conteneur) et, après avoir **fait défiler** le tablist en locale `de` ou `en`
   (libellés longs), sur le **dernier**.
4. **Onglets produits** (`.mt-tab`, `/{locale}/products`) : **non modifiés**, contrôler qu'ils
   sont inchangés.

## Signaux mémoire

[MEMORY:pitfall] Un `overflow-x-auto` Tailwind fait calculer `overflow-y` à `auto` : la boîte
de défilement rogne le contour de focus **haut/bas** des enfants, pas seulement gauche/droite —
symptôme « 1 côté peint sur 4 » qui n'a rien d'horizontal.

[MEMORY:pitfall] Un énoncé d'issue peut nommer le mauvais composant : « le tablist des
réglages » ne passe pas par `.mt-tab` du DS (utilitaires Tailwind bruts). Vérifier par `grep`
du sélecteur **dans le `.tsx`** avant d'éditer le CSS nommé par l'issue — sinon on corrige un
composant voisin et on laisse le vrai bug. Ici le briefing du lead relayait l'erreur : une
recon de lead n'immunise pas contre ça.

[MEMORY:decision] `outline-offset` négatif est réservé aux cibles **sans bordure porteuse
d'état** : posé sur `.mt-zoom__btn` et les onglets des réglages, refusé sur `.mt-tab` et le
`<tr>` du §8bis (leur `border-bottom` porte la sélection / la limite de ligne).

## Recommandations suite

- **RECOMMAND_UI_DESIGN : oui, souhaitable** — le trait à −2 px sur un bouton de 30 px pour un
  glyphe de 15 px est le seul point où l'arbitrage `-2px` vs `-1px` mérite un œil de charte, et
  il n'est pas tranchable sans rendu.
- **Pas de RECOMMAND_SECURITY** : changement purement CSS + un nom de classe, aucune donnée,
  aucun endpoint, aucune dépendance.
- **Pas de RECOMMAND_DB_EXPERT** : aucune migration.
- **Pas de RECOMMAND_TEST_RUNNER** : aucune suite lourde en jeu, et jsdom ne peut pas prouver
  cette issue.

## Follow-up proposé

`.mt-tab` (onglets produits, `core.css:260`, `outline-offset:3px`) — non vérifié au navigateur,
potentiellement rogné lui aussi selon son conteneur ; son remède ne peut **pas** être l'offset
négatif (recouvrement du soulignement d'accent), il faut une autre piste (p. ex. marge de
défilement sur le conteneur). [triage XS | domaine frontend/a11y]

ABSORBED : aucune.

STATUS: COMPLETED
