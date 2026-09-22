# Issue #623 — Ruban du tableau de bord : 30 prochains jours, règle graduée, viewport déplaçable

## Commits

- `be0280ed` ✨ feat(dashboard): ruban des 30 prochains jours avec règle et viewport déplaçable (#623) — 11 fichiers, +1278/−59

## Résumé

Implémente l'arbitrage DEC-S108-003 (source : `maquette-dashboard.md` § Hero).

Fichiers :
- `frontend/src/components/dashboard/densityWindow.ts` (NOUVEAU, pur) : `rulerTicks` (0,5,…,30 + ancrage start/center/end), `dayToPct`, `viewportDays` (9), `maxViewportStart` (21), `clampViewportStart`, `dragViewportStart` (px → jours, `Δx / largeur × 30`, borné ; largeur 0 → immobile), `keyToViewportStart` (←/↓ −1, →/↑ +1, PageDown/PageUp ∓7, Home/End, part de la position ARRONDIE), `addCalendarDays`.
- `frontend/src/components/dashboard/DensityRibbon.tsx` :
  - fenêtre FUTURE : `from` = aujourd'hui à minuit (mémoïsé sur le jour civil y/m/d, plus sur la référence `now`) ; `buildDensityBuckets(events, from, from, rangeDays)` — contrat de la fonction INCHANGÉ (`isToday` compare des `toDateString`, le 1er bucket est aujourd'hui) ;
  - trait TODAY au bord GAUCHE du 1er bucket (`left-0 w-0.5`), plus centré ;
  - règle `h-4.5` (18 px) au-dessus de la piste, libellés `.mt-eyebrow` en `absolute top-1`, `aria-hidden` ;
  - desktop : bloc `h-24` = règle + `mt-1` + piste (`flex-1`, 74 px). Piste = barres `role="img"` + viewport FRÈRE (`role="slider"`, pas enfoui dans l'img) ;
  - viewport : `tabIndex=0`, `aria-valuemin 0 / max 21 / now` arrondi, `aria-valuetext` = plage lisible, `aria-label` i18n ; `border-[1.5px] border-accent bg-accent/9 rounded-sm -top-1 -bottom-1 z-10 touch-none select-none`, `cursor-grab`/`cursor-grabbing` ; pointeur : `setPointerCapture`, origine = position au moment de la saisie, fin (up/cancel/lostcapture) → calage au jour ; clic non principal de souris ignoré ; focus = contour DS global `:focus-visible` (aucune classe `outline-*`) ;
  - scrollable (mobile portrait + paysage) : aucun viewport ; la règle est DANS le rail `overflow-x-auto` (contenu de largeur `30×12 + 29 px`), elle défile avec les barres ; libellé = fenêtre complète J0 → J+30 ;
  - libellé d'en-tête `rangeLabel` remplacé par `t('window', { range })`, `range` = `Intl.DateTimeFormat#formatRange` (séparateur localisé, mois commun fusionné). Reste le 1er `span.font-mono` du ruban (référence mono de `sprint-84-section-titles`). Testid `dashboard-density-range`.
- `frontend/public/locales/{fr,en,es,de}/dashboard.json` (section `density` seulement) : `label` et `eyebrow` au futur (« 30 prochains jours », « Next 30 days », « Próximos 30 días », « Nächste 30 Tage ») ; nouvelles clés `today` (« Auj. », « Today », « Hoy », « Heute » — capitales par CSS), `window` (« Fenêtre · {range} »…), `viewport` (« Fenêtre d’aperçu de {days} jours »…).
- `frontend/app/[locale]/(app)/dashboard/loading.tsx` : le bloc barres `h-24` devient `flex h-24 flex-col gap-1` = règle `h-4.5` + barres `flex-1` (même hauteur, même structure).
- Les 3 usages de `page.tsx` (paysage scrollable, portrait scrollable, desktop) : aucune modification de props nécessaire ; vérifiés par `page.test.tsx` et `dashboard-landscape.test.tsx` (verts).

Nouveaux testids : `dashboard-density-ruler`, `-tick`, `-viewport`, `-range`, `-track`, `-plot` — tous cités par `e2e/sprint-108-density-ribbon.spec.ts`.

## Tests (résultats)

- `densityWindow.test.ts` : 22 tests (graduations, ancrages, bornes, px→jours, clavier, jours civils + DST).
- `DensityRibbon.window.test.tsx` : 26 tests, VRAIS messages 4 locales + `onError` (PIT-S63-006) : fenêtre future (hier exclu, J+3 et J+29 comptés), trait TODAY à gauche, sur-titre / aria-label fr, 7 libellés exacts, positions et ancrages, `.mt-eyebrow` sans utilitaire de taille, libellé du jour ×3 locales, attributs du slider, clavier (→, PageUp, End, borne, ←, Home, borne), touche non gérée non consommée, glisser (continu, clamp, calage au lâcher à 3,25 j → J+3, 2e glisser depuis la position courante, cancel), toucher, clic droit ignoré, `touch-none` sur le viewport seul, slider hors `role="img"`, classes de style, scrollable (pas de slider, libellé J0→J+30, règle dans le rail, largeur 389 px), budget `h-24` unique, compte vide ×4 locales. Polyfill `PointerEvent` LOCAL au fichier (jsdom 25 n'en a pas → `clientX` perdu).
- `loading.test.tsx` : +1 test (bloc `h-24` unique = règle `h-4.5` + barres).
- Armement : 6 mutations, toutes détectées (fenêtre passée −29 : 13 rouges ; pas de calage au lâcher ; `touch-none` sur la piste ; drag sans clamp ; origine du glisser à 0 ; clic droit accepté : 1 rouge chacune).
- Ciblés dashboard : 13 fichiers verts. Suite complète `npx vitest run` : **165 fichiers, 2135/2135 verts**, aucune ligne stderr/act sur les fichiers dashboard.
- `tsc --noEmit` exit 0 (e2e inclus) ; `rtk proxy npm run lint` : 0 warning/erreur ; `rtk proxy npm run format:check` : conforme.
- Tests existants qui citent la surface (`dashboard-components`, `dashboard-mobile`, `intl-formats`, `section-titles`, `DensityRibbon.intl`, `page.test`) : verts SANS modification.
- E2E `frontend/e2e/sprint-108-density-ribbon.spec.ts` : **NON exécutée** (consigne). 6 tests : règle 1280×800 (7 libellés, `innerText` « AUJ. », bords gauche/droit ±1 px, pas de chevauchement, 10 px capitales, trait TODAY à gauche) ; glisser souris (curseur grab/grabbing, `touch-action` none sur le viewport / auto sur la piste, +3 j, clamp droit 21 et bord droit, clamp gauche 0, lâcher à 5,4 j → J+5 et position 5/30) ; clavier + contour de focus 2px solid ; hauteur ; données stubbées (hier exclu, J+3 compté, sur-titre) ; 375 px (pas de viewport, libellé J0→J+30, rail qui défile réellement, règle qui suit le défilement, pas de débordement de page). Compte vide = stub `[]` dans 5 tests sur 6.

## Hauteur avant / après (1280×800)

- Par construction : bloc des barres AVANT = `h-24` = 96 px ; bloc règle + barres APRÈS = `h-24` = 96 px (18 + 4 + 74). Les autres composantes de la carte (bordure, `p-4`, en-tête, `gap-2`) sont inchangées → hauteur de carte identique si l'en-tête ne passe pas à la ligne.
- En-tête : le libellé passe de « 23 août — 22 sept. » (~18 car.) à « Fenêtre · 22 sept. – 1 oct. » (~27 car., mono 13 px ≈ +70 px de large). À 1280 px il reste de la place (estimation, NON mesurée).
- **Non mesuré au navigateur** : l'oracle est le test `hauteur` de la spec E2E (bloc = 96 ±0,5 px ; carte ≤ en-tête + 8 + 96 + 34 + 1 ; h2 `dashboard-product-list` ≤ 800 ; annotation `hauteur-ruban` avec les px réels).
- Risque mobile 375 px (estimation) : le libellé plus long peut faire passer « Ouvrir la frise » sur une ligne à part → carte +~24 px en portrait. Aucune spec ne borne cette hauteur ; `sprint-84` (375 px `de`) ne teste que le débordement.

## Décision de mutualisation Minimap : NON partagée

`components/timeline/Minimap.tsx` n'est pas touchée (tests `timeline/**` verts sans modification). Raisons :
- sémantique différente : Minimap RECENTRE la fenêtre sur le point cliqué de la piste (seek absolu) ; le ruban DÉPLACE la fenêtre du delta depuis la saisie (maquette) ;
- unités et état différents : Minimap est contrôlée (`onSeek`, fraction [0..1], capture sur la PISTE) ; le ruban a un état local en jours entiers/continus, capture sur le VIEWPORT, calage au lâcher, clavier ±1 j / ±7 j ;
- la part réellement commune se réduit à ~10 lignes de capture de pointeur ; un hook partagé aurait exigé de changer la forme des callbacks de Minimap (risque architect : frise virtualisée + zoom) pour un gain nul.
La logique réutilisable est isolée en fonctions pures (`densityWindow.ts`), réutilisables si la Minimap migre un jour.

## Écarts à la maquette

1. Taille des libellés de règle : `.mt-eyebrow` = 10 px (maquette 9 px). L'échelle `--text-*` commence à 13 px ; `.mt-eyebrow` est le plus petit pas mono du DS, et il porte déjà mono + capitales + `ink-muted` + `nowrap` + tracking détendu en `de`. Pas de `text-[9px]` hors DS.
2. Rayon du viewport `rounded-sm` = 5 px (maquette 6 px ; DS : 5 ou 7) — même token que `.mt-minimap__vp`. Fond `bg-accent/9` (mélange oklab de Tailwind, maquette `srgb`) : écart de teinte négligeable, non mesuré.
3. Calage au jour au LÂCHER (la maquette garde la position continue) : la position affichée coïncide avec le libellé et `aria-valuenow`.
4. Libellé de plage via `formatRange` : fusionne le mois commun (« 3–12 oct. ») au lieu de `fmtShort – fmtShort` ; séparateur localisé.
5. Clavier (absent de la maquette) : `role="slider"` APG (←/→ et ↑/↓ ±1, PageUp/PageDown ±7, Home/End).
6. Conservés (arbitrage) : histogramme de densité, pas de barres d'événements empilées ; aucune synchronisation (pas de frise sur le dashboard).

## Non vérifié

- Aucun rendu navigateur : hauteur de carte, glisser réel, chevauchement des libellés (notamment `de`/`es` en mobile 389 px de rail, ~65 px entre libellés, « 22. OKT. » ≈ 55 px à 10 px mono), contour de focus — prouvés seulement par la spec E2E non jouée.
- Contraste du bord `accent` 1,5 px sur `surface` (1.4.11 ≥ 3:1) : non mesuré ici ; même couple que `.mt-minimap__vp` et que le trait TODAY.
- Le test « contour de focus » de la spec suppose que `locator.focus()` sur une page sans clic préalable déclenche `:focus-visible` sous Chromium ; s'il rougit, c'est l'heuristique du navigateur, pas le composant (remplacer par `Tab` jusqu'au slider).
- `sprint-97-ink-faint-contrast` balaie le dashboard : les libellés 10 px `ink-muted` sont nouveaux sur cette page (même couple que les autres `.mt-eyebrow`).

## Signaux mémoire

- [MEMORY:pitfall] Context: jsdom 25 n'expose pas `PointerEvent` : `fireEvent.pointerDown/Move(el, { clientX })` retombe sur un `Event` nu, `e.clientX` vaut `undefined`, un calcul px→jours donne `NaN` puis 0 — le test de glisser passe « vert » sans rien prouver ou rougit sans raison. Solution: polyfill LOCAL au fichier (`class extends MouseEvent` avec `pointerId`/`pointerType`, `vi.stubGlobal` en `beforeAll`, `vi.unstubAllGlobals` en `afterAll`) + espion `getBoundingClientRect` sur la piste. Prevention: tout test pointeur doit asserter un DÉPLACEMENT non nul (pas seulement l'état « en glisser »).
- [MEMORY:pitfall] Context: `Intl.DateTimeFormat#formatRange` insère des espaces fines (U+2009) autour du tiret ; `toHaveTextContent` (jest-dom) normalise les blancs du REÇU mais pas de l'attendu → échec « attendu == reçu » à l'affichage. Solution: comparer `el.textContent` avec `toBe`. (Playwright `toHaveText` normalise les deux côtés.)
- [MEMORY:pattern] Problem: un contrôle interactif (slider) superposé à un graphique `role="img"`. Solution: le rendre FRÈRE du `role="img"` dans un conteneur `relative`, jamais enfant (les descendants d'un `img` sont présentationnels) ; test RTL `expect(img).not.toContainElement(slider)`.
- [MEMORY:decision] Context: viewport déplaçable du ruban dashboard (#623) vs viewport de la Minimap. Decision: pas de hook partagé ; géométrie en fonctions pures `densityWindow.ts`. Why: seek absolu recentré (Minimap, contrôlée, fraction) ≠ delta depuis la saisie (ruban, état local, jours, calage) ; mutualiser imposait de changer le contrat de Minimap dont dépend la frise.

## Recommandations suite

- RECOMMAND_FOLLOWUP: le ruban ne compte que le DÉBUT d'origine des événements (`buildDensityBuckets`). Avec la fenêtre désormais FUTURE, une série récurrente née avant aujourd'hui (contrat annuel, abonnement mensuel) n'y apparaît jamais, alors que « En bref » et la frise projettent ses occurrences (`nextStart`, #603). Projeter les occurrences dans la fenêtre (mêmes règles BR-EVE-006/012). [S | frontend/dashboard]
- RECOMMAND_FOLLOWUP: vérifier en mobile portrait 375 px (fr, de) la hauteur de la carte : le libellé « Fenêtre · … » plus long peut renvoyer « Ouvrir la frise » sur une 3e ligne d'en-tête ; si oui, raccourcir le libellé mobile ou le placer sous la règle. [XS | frontend/dashboard]
- Pas de RECOMMAND_TEST_RUNNER : `sprint-108-density-ribbon` + `sprint-84-section-titles` + `sprint-106-product-detail` (squelette vs ruban réel, ±6 px en y) sont à jouer par le lead dans la passe E2E.

STATUS: COMPLETED
