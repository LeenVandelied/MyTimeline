# Issue #627 — 404 « éphéméride » (Sprint 110, vague 1)

Commit : `9cb3e062` (16 fichiers, tous dans le périmètre + 1 absorbé).

## Résumé

**Objectif** : remplacer l'écran 404 générique (code « 404 » + boussole + « Page introuvable ») par l'éphéméride
du handoff : feuillet daté du jour réel + « Cette page n'a pas de date dans l'almanach. » + lien de retour.

**Décisions**
- **Date après montage** : `EphemerisLeaf` (client) a un premier rendu NEUTRE (4 lignes en espaces insécables,
  dimensions réservées, `data-ephemeris-ready="false"`, pas de `datetime`), puis pose `new Date()` du navigateur
  dans un `useEffect`. Pas de `headers()`, pas de `dynamic` : `/_not-found` reste prérendu. `data-ephemeris-ready`
  sert de barrière d'hydratation nommée aux E2E (PIT-S83-001).
- **Helper pur** `frontend/src/lib/ephemeris.ts` (aucun helper de semaine ISO dans `src/lib/`, `date-iso.ts` n'a
  que `toLocalIsoDate`, réutilisé pour `datetime`) : `isoWeekNumber(date)` (ISO 8601 sur le jour civil LOCAL, calcul
  en UTC pour éviter les jours de 23/25 h) et `ephemerisParts(date, locale)` (un seul `formatToParts` pour jour 2
  chiffres / mois / année + un formateur `weekday`). Majuscules par CSS `uppercase`.
- **`StateScreen` étendu** : props `eyebrow?` (`.mt-eyebrow` seule) et `aside?`. Avec `aside` : colonne sur mobile,
  rangée à `sm`, `gap-7` (28 px maquette), texte à gauche, `<h1>` conservé (`text-lg` = 27 px, maquette 25 px),
  `icon` et `code` non rendus. Sans `aside` : branche d'origine inchangée (`{eyebrowNode}` vaut `null`) → 500/403
  identiques (test dédié).
- **Couleurs** : `ink-faint` de la maquette (sur-titre, « Semaine N ») remplacé par `ink-muted` — DEC-S97-001
  (`a11y-audit.md` §10 : `ink-faint` ne porte plus aucun texte, 2,75:1 / 3,20:1). Mois en `text-accent` : 5,93:1
  clair / 6,94:1 sombre sur `bg` (recalculé avec `#0E5FC4`, `#4D9BFF`, `#FCFCFD`, `#0B0C0E` du dépôt).
  Feuillet : `bg-bg` + `border-rule-strong` comme la maquette.
- **Voix** : vouvoiement en fr (décision du lead) et de (Sie). **es reste au tutoiement** (« buscas », « Vuelve ») :
  ⚠ prémisse du lead partiellement fausse pour es — dans `es/errors.json`, `notFound`/`forbidden`/`crash`
  tutoient déjà (seuls `auth.*`/`network.*` vouvoient) ; j'ai aligné sur les écrans d'erreur voisins.
- **Libellés** (`notFound.eyebrow|title|description|week|backHome`) :
  fr « Erreur 404 » / « Cette page n'a pas de date dans l'almanach. » / « Semaine {week} » ;
  en « Error 404 » / « This page isn't in the almanac. » / « Week {week} » ;
  es « Error 404 » / « Esta página no figura en el almanaque. » / « Semana {week} » ;
  de « Fehler 404 » / « Für diese Seite gibt es kein Kalenderblatt. » / « KW {week} » (Kalenderblatt = le feuillet
  lui-même ; « Almanach » est désuet en allemand). Recopiés à l'identique dans `MESSAGES` de
  `global-not-found-screen.tsx` — un test compare désormais le rendu aux 4 `errors.json` (dérive = rouge).
- **Bouton de retour** : `/${locale}` sert la LANDING, y compris connecté (`middleware.ts` ne redirige que les
  anonymes des routes protégées ; `app/[locale]/page.tsx` rend `HomePage` sans redirection). Donc libellé
  `backHome` conservé (« Retour à l'accueil »), pas « Revenir à aujourd'hui ». La fin de phrase de la maquette
  (« Reviens à aujourd'hui ») est adaptée : « Revenez à l'accueil — c'est toujours une valeur sûre. » `href` inchangé.
- **Joignabilité** (vérifiée) : seul `app/[locale]/layout.tsx:44` appelle `notFound()`. Sonde sur un serveur
  MyTimeline déjà lancé (`:3100`, worktree sprint-105, non démarré par moi) : `GET /fr/nope-s110` → 404 +
  `data-testid="global-not-found-screen"`. Toute URL inconnue sert donc `global-not-found-screen` ;
  `[locale]/not-found.tsx` n'est atteint par aucune page. Consigné en commentaire dans les deux fichiers.
- **Thème de `global-not-found-screen`** : toujours clair, non touché (décision #413).

**Fichiers clés** : `frontend/src/lib/ephemeris.ts`, `frontend/src/components/shared/EphemerisLeaf.tsx`,
`frontend/src/components/shared/StateScreen.tsx`, `frontend/app/[locale]/not-found.tsx`,
`frontend/app/global-not-found-screen.tsx`, `frontend/public/locales/{fr,en,es,de}/errors.json`,
`frontend/e2e/sprint-110-not-found-ephemeris.spec.ts` (+ tests unitaires associés).

**ABSORBED** : `frontend/e2e/document-lang.spec.ts:127` (désormais l.127-130) assertait le titre allemand `Seite nicht gefunden` → aligné
sur « Für diese Seite gibt es kein Kalenderblatt. » (conséquence directe du changement de libellé ; `href="/de"`
ligne 131 intact).

## Tests

- `npx vitest run` ciblé (ephemeris, EphemerisLeaf, StateScreen, not-found, global-not-found, intl-formats,
  error, global-error) : **8 fichiers, 80 tests verts**, aucun stderr.
- `./scripts/test-quiet.sh frontend-unit` : **170 fichiers, 2207 tests verts**.
- `npx tsc --noEmit` : 0 erreur.
- `npx next lint --file …` (12 fichiers) : 0 erreur (1 erreur `no-html-link-for-pages` corrigée dans mon test).
- `rtk proxy npx prettier --check` (16 fichiers) : conformes.
- `SKIP_DELEGATION=1 PLAYWRIGHT_BASE_URL=http://localhost:3999 npx playwright test e2e/sprint-110-not-found-ephemeris.spec.ts --list` :
  4 tests chromium listés (+ 3 setup). **Non exécutée** (consigne) — à jouer par le lead contre `next build`+`next start` :
  HTML servi sans date, jour du navigateur + `datetime`, rangée feuillet/titre, couleurs clair ≠ sombre sous `.dark`,
  `/de/…` en allemand. `document-lang.spec.ts` à rejouer aussi (titre modifié).
- **NON vérifié** : rendu visuel réel (aucun navigateur lancé), `next build` (décompte `Generating static pages`
  attendu inchangé : aucune API dynamique ajoutée), mobile (< `sm`).

## Fichiers de contexte lus

- `docs/memory/sprints/sprint-110/maquette-etats-systeme.md` — section 404 (feuillet 150 px, 62 px, `gap:28px`)
- `docs/design/graphite-handoff.md:213-215` — « 404 « éphéméride » : feuillet daté (jour réel) »
- `frontend/src/styles/ds/a11y-audit.md:123` — « Cachet d'éphéméride décoratif → `aria-hidden` » ; §10 l.522-550 (DEC-S97-001 `ink-faint`)
- `.ai-env/context-packs/pit-frontend.md` — PIT-S62-005 (l.538), PIT-S62-006 (l.541), PIT-S83-001 (l.1148), PIT-S95-001 (l.1556), PIT-S108-002 (l.1805) ; extrait inliné du briefing (PIT-S53-001/002, PIT-S84-002, PIT-S83-007)
- `frontend/playwright.config.ts:20-95` — garde-fou `webServer`, projets `setup`/`chromium`
- `frontend/e2e/document-lang.spec.ts:1-130` — oracle HTML servi, `/de/nope` après hydratation
- `frontend/src/styles/ds/components/i18n.css:60-70, 180-200` — `.mt-eyebrow`, `.mt-num` (lu, NON modifié)
- `frontend/src/styles/ds/tokens/base.css:40-90` — règle `h1..h6` (display, 600, tracking-tight, leading 1.08)
- `frontend/src/styles/ds/tokens/colors.css:60-75, 144-152` — `ink-faint`, sélecteur `.dark`
- `frontend/src/styles/ds/tokens/typography.css`, `spacing.css`, `globals.css:116-185` — échelle `text-*` (lg = 27 px), radius, spacing
- `frontend/src/lib/date-iso.ts:1-60` — `toLocalIsoDate`
- `frontend/middleware.ts:100-165`, `frontend/app/[locale]/page.tsx`, `frontend/src/components/pages/HomePage.tsx` — pas de redirection connecté
- `frontend/src/styles/__tests__/eyebrow-consumers.test.tsx` — convention `.mt-eyebrow` seule
- `.ai-env/context-packs/cp-frontend.md` — NON LU en entier (extrait inliné du briefing seulement)

## Signaux mémoire

- `[MEMORY:pitfall]` Context : un test « le HTML SSR ne contient pas de date » écrit `expect(html).not.toMatch(/\d/)` rougit
  à tort — les classes Tailwind arbitraires (`w-[150px]`, `px-2.5`, `text-[62px]`) contiennent des chiffres. Solution :
  retirer les balises (`html.replace(/<[^>]*>/g, '')`) avant l'assertion. Prevention : toute assertion « aucun chiffre »
  sur du HTML porte sur le TEXTE, jamais sur le balisage (idem dans la spec E2E).
- `[MEMORY:decision]` Context : la maquette `États système` peint le sur-titre du 404 et « Semaine N » en `ink-faint`.
  Decision : `ink-muted`. Why : DEC-S97-001 — `ink-faint` ne porte plus aucun texte (≤ 3,20:1) ; une maquette
  antérieure à #670 ne prévaut pas sur une décision d'accessibilité mesurée.
- `[MEMORY:pattern]` Problem : afficher « aujourd'hui » dans un écran PRÉRENDU (`/_not-found`). Solution : premier rendu
  neutre à dimensions réservées + date posée en `useEffect` + attribut `data-*-ready` comme barrière E2E ; preuve =
  `renderToString` (unitaire) et `request.get` (E2E) sans aucun chiffre dans le texte du composant. Anti-pattern :
  `new Date()` pendant le rendu (date du build servie indéfiniment + mismatch d'hydratation).

## Recommandations suite

- Pas de RECOMMAND_DB_EXPERT : aucun changement backend ni schéma.
- Pas de RECOMMAND_SECURITY : écran statique sans donnée utilisateur ni entrée.
- Pas de RECOMMAND_TEST_RUNNER : TRAITÉ PAR LE LEAD (signal initial : specs non jouées) — suite E2E complète jouée contre `next build`+`next start` :3100, 602 passés dont les 4 de `sprint-110-not-found-ephemeris` et les 5 tests 404 de `document-lang` (cf. audit sprint-110).
- Pas de RECOMMAND_UI_DESIGN : TRAITÉ PAR LE LEAD (signal initial : feuillet `bg-bg` fondu dans la page) — arbitré `bg-surface` (commit 0aadfa68), rendu contrôlé au navigateur en clair, en sombre et à 375 px (de), sans défilement horizontal.
- RECOMMAND_FOLLOWUP: `app/[locale]/not-found.tsx` n'est atteint par aucune route (aucun `notFound()` hors layout) — décider de le garder (futurs `notFound()` de pages) ou de le retirer, et l'indiquer dans l'issue [triage S]
- RECOMMAND_FOLLOWUP: libellé du bouton « Revenir à aujourd'hui » (maquette, vers le tableau de bord) non appliqué car `/${locale}` sert la landing même connecté ; un lien vers `/${locale}/dashboard` pour les connectés exigerait de connaître la session sur un écran prérendu [triage S]

STATUS: COMPLETED
