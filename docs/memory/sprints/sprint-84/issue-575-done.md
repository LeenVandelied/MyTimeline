# Issue #575 — Le titre de section avalé par le style eyebrow sur 8 emplacements (+ casse des libellés de nav, DEC-S84-002)

## Résumé

**Objectif.** Rendre aux 8 sections un vrai titre (display 600, sentence case, `--text-sm`, encre pleine) au lieu de l'eyebrow mono capitales `ink-faint` ; absorber la casse des libellés de nav (maquette `App.dc.html` : mono, capitales, `.06em`).

**Fichiers clés.**
- Titres : `frontend/src/components/dashboard/{WeekAgenda,KpiMarginalia,ProductList,CompactAgenda,ProductCarousel,DensityRibbon}.tsx`, `frontend/src/components/products/ProductDetailView.tsx`.
- Nav : `frontend/src/components/layout/AppShell.tsx`, `frontend/src/components/settings/SettingsShell.tsx`, nouvelle classe `.mt-nav-label` dans `frontend/src/styles/ds/components/i18n.css` (§2bis).
- i18n : `dashboard.density.title` ajoutée dans `frontend/public/locales/{fr,en,de,es}/dashboard.json`.
- Docs : commentaire périmé corrigé dans `frontend/src/styles/ds/tokens/base.css:55` (« bascule display→mono voulue sur les 5 titres du dashboard ») ; 1 paragraphe ajouté à `frontend/src/styles/ds/readme.md` (titres ≠ eyebrows ; nav en `.mt-nav-label`).

**Choix et raisons.**
1. **Style titre = utilitaires** `text-ink font-display text-sm font-semibold`, pas de nouvelle classe DS. Même approche que le `h1` de `GreetingHeader`. Une classe `.mt-section-title` serait hors layer et battrait en silence toute utilitaire posée à côté (PIT-S53-003). `font-display` et `font-semibold` doublent volontairement la règle `h2` de `base.css` (`@layer base`) pour que l'intention soit lisible.
2. **Taille `--text-sm` (17px)** : c'est le plus petit palier qui lit comme un titre, et il reste sous le `h1` du dashboard (`text-md`, 21px) comme sous celui du détail produit (`text-xl`, 35px). **Interligne** : `text-sm` apparie un `line-height` (PIT-S53-001), mais sur un `h1..h6` la règle hors layer de `base.css` le ramène à 1.08. Ce couple n'est donc sûr que sur un titre, et c'est écrit à l'endroit du code (`WeekAgenda.tsx`). Delta de hauteur estimé : environ +4px par titre (14 → 18,4px).
3. **Eyebrow conservé seulement là où il porte une information.** Il y a 2 cas : `DensityRibbon` (fenêtre « Densité · 30 jours ») et l'historique de `ProductDetailView` (compteur BR-EVE-011, sorti du `h2` où il était fondu). Les deux passent par `.mt-eyebrow`, placée au-dessus du `h2`. Sur les 6 autres sections, l'ancien eyebrow ne portait que le libellé du titre lui-même : il n'y avait rien à conserver, et je n'ai pas inventé d'eyebrow (plage de la semaine, compteur de produits…) sans maquette.
4. **DensityRibbon:71 qualifié : oui, c'est l'intitulé de section.** Ce `<span>` était le seul intitulé du ruban, qui n'avait aucun titre. J'ai ajouté un `h2` « Aperçu de la frise » (texte de la maquette cité par l'issue) et une clé dans les 4 locales : en « Timeline overview », de « Zeitachse im Überblick » (aligné sur nav `Zeitachse`), es « Vista de la cronología » (aligné sur nav `Cronología`). J'ai ajouté `flex-wrap` sur l'en-tête, parce qu'en `de` à 375px le titre et la plage ne tiennent pas sur une ligne (estimation arithmétique, pas une mesure).
5. **Nav : `.mt-nav-label` et non `.mt-eyebrow`.** `.mt-eyebrow` pose `color: ink-muted` et `font-size: 10px` hors layer : elle battrait l'encre `text-primary-ink` de la pilule active (DEC-S83-005) et la rendrait illisible. `.mt-nav-label` ne pose que police mono, capitales et `var(--tracking-wide)` (= `.06em`, la valeur exacte de la maquette), avec une détente `.02em` sous `[lang="de"]`/`:lang(de)`, comme `.mt-eyebrow`. **Taille** : `text-2xs` (13px). L'échelle n'a pas de 12px, j'ai pris le token le plus proche. État actif et couleurs non touchés. Le libellé reste le 1er `<span>` du lien, parce que `e2e/sprint-73-tablet-sidebar.spec.ts:144` le cible.
6. **Libellé de section « Navigation »** : il n'existe pas dans le produit (la nav n'a qu'un `aria-label`), je ne l'ai pas ajouté.

**Écarts à l'énoncé / au briefing.**
- La CA « motif GreetingHeader, pas un titre nu » est appliquée sur 2 sections sur 8. Les 6 autres ont un titre nu, faute d'information à porter en eyebrow (voir CA 2). C'est un arbitrage à confirmer par le lead ou le Designer.
- L'eyebrow du `GreetingHeader` n'a **pas** été basculé sur `.mt-eyebrow` : le rendu aurait changé (13px/`ink-faint`/`.16em` → 10px/`ink-muted`/`.08em`), ce qui est interdit par le briefing. **Conséquence visible** : sur le dashboard, l'eyebrow « APERÇU » (13px) côtoie celui du ruban « DENSITÉ · 30 JOURS » (10px). Il y a donc une incohérence d'eyebrow sur le même écran, signalée en follow-up.
- Pour la même raison (rendu non identique : 13px → 10px), `CompactAgenda:88/:103`, `MobileDrawer:81/:88` et `timeline/page.tsx:60` ne sont pas touchés. Les intertitres « Aujourd'hui/Demain » sont des en-têtes de groupe, un usage légitime du mono capitales ; un test verrouille qu'ils le restent.
- Les `<dt>` de la fiche produit (`ProductDetailView:316/:337`, capitales espacées) sont des étiquettes de champ : je ne les ai pas touchés.
- Le lien « Réglages » du pied de sidebar reste en sentence case : il n'est pas dans la `<nav>`, et le périmètre du briefing est « libellé rendu vers `:248` ». Point à trancher (voir follow-up).

## Tests

- `npx vitest run` ciblé (11 fichiers : `src/components/dashboard/`, `AppShell.test.tsx`, `SettingsShell.test.tsx`, `ProductDetailView.test.tsx`, `section-titles.test.tsx`, `nav-label-class.test.ts`) → **138/138 verts**, exit 0.
- `./scripts/test-quiet.sh frontend-unit` → **1432 passés / 1 échec / 1433**, 124 fichiers, exit 1. **L'échec n'est pas dans mon périmètre** : `src/lib/event-palette.test.ts` (#577, fichier non suivi, en cours) rougit sur `components/ui/palette-color-picker.test.tsx` (#577, non suivi), qui cite 6 couleurs de la palette. Tous mes fichiers sont verts.
- `npx tsc --noEmit` (via `rtk proxy`) → exit 0.
- `npx eslint <15 fichiers ts/tsx touchés, spec E2E incluse>` → exit 0 ; `npx next lint --file …` (14 fichiers) → « No ESLint warnings or errors », exit 0.
- `npx prettier --check <22 fichiers touchés>` (via `rtk proxy`) → « All matched files use Prettier code style! », exit 0.
- Tests ajoutés/modifiés :
  - `section-titles.test.tsx` (nouveau, 14 tests) : 6 `h2` en classes titre, sans aucune classe eyebrow ; états vides ; intertitres CompactAgenda inchangés ; ordre eyebrow→titre du ruban ; eyebrow sans utilitaire concurrente ; GreetingHeader intact ; `h1 text-md` > `h2 text-sm`. S'y ajoute une **garde statique repo-wide** : aucun `<h1..h6>` de `src/`+`app/` ne porte `uppercase|tracking-widest|font-mono`. Elle a un contrôle négatif (elle détecte les deux formes d'origine, dont celle SANS `font-mono` qui avait échappé à l'architecte) et des seuils anti-vacuité (>100 fichiers, >20 titres lus).
  - `nav-label-class.test.ts` (nouveau, 5 tests, PostCSS+Tailwind compilés) : `.mt-nav-label` est hors layer et pose mono + capitales + `var(--tracking-wide)` ; `--tracking-wide` gagnant = `0.06em` ; ni `color`, ni `font-size`, ni `font-weight`, ni `line-height` ; règle DE à `.02em` ; contrôle montrant que `.mt-eyebrow` pose `color` + `10px`.
  - `AppShell.test.tsx` +2, `SettingsShell.test.tsx` +1, `ProductDetailView.test.tsx` +2 et 1 adapté (le compteur BR-EVE-011 est lu sur `product-detail-history-count` au lieu du `h2`).

## E2E à jouer par le lead

**`frontend/e2e/sprint-84-section-titles.spec.ts`** (écrite, **jamais exécutée**). Compte PROD, mesures `getComputedStyle`, aucune capture. Ce que la spec doit prouver :
- dashboard 1280×800, **clair ET sombre** (vérifie `.dark` avant de mesurer) : les 4 `h2` (ruban, semaine, en bref, produits) sont en police du `h1`, ≠ mono, 600, 17px, casse `none`, couleur = celle du `h1`, interligne 18,36px (1.08), et chacun tient sous 800px de hauteur (proxy de « 80 % sans scroll ») ; un seul `h1` visible ;
- ruban, 4 locales : eyebrow au-dessus du titre, mono, 10px, capitales, letter-spacing 0,8px (0,2px en `de`) ; précondition `<html lang>` = locale ;
- sidebar 1280, 4 locales : libellés mono, capitales, 13px, letter-spacing 0,78px (0,26px en `de`), non tronqués, dans la sidebar ; la couleur du libellé actif = celle du lien (pilule) ;
- Réglages fr/de à 768/1024/1280 : onglets mono capitales, pas de débordement de page. Le débordement interne de la tablist est **journalisé en annotation**, pas asserté : c'est lui qui confirme ou réfute mon estimation de ~500px en `de`.
- dashboard mobile 375×812 en `de` : ruban et `h2` sans débordement, pas de débordement de page ;
- détail produit (produit seedé, nom court) : 2 `h2` conformes ; le compteur est un eyebrow au-dessus du titre et contient « 1 ».

**Specs existantes à surveiller** (lues, risque jugé faible) :
- `e2e/sprint-73-tablet-sidebar.spec.ts` : cible `locator('span').first()` du lien. Ce span est bien toujours le libellé, avec `hidden lg:inline` conservé.
- `e2e/settings-breakpoints.spec.ts` et `e2e/sprint-63-de-overflow-audit.spec.ts` (settings) : ils ne mesurent que le débordement de page et la largeur de la sidebar. La tablist est `overflow-x-auto`, donc un conteneur légitime pour l'audit.
- `e2e/settings-navigation.spec.ts` : ne passe que par des testids.

Aucune référence visuelle `*-snapshots/*.png` ne couvre le dashboard, la sidebar, les Réglages ou le détail produit (seules les pages auth et la landing en ont). Aucune ne devrait rougir.

## Critères d'acceptation

- [x] **Les 8 `h2` rendent un titre sentence case lisible en `--color-ink`** : **tenu dans le code** (7 `h2` convertis + 1 `h2` créé pour le ruban). Preuve : `section-titles.test.tsx`, `ProductDetailView.test.tsx`, garde statique à 0 fautif. **Rendu au navigateur non vérifié** : c'est la spec E2E ci-dessus.
- [~] **Motif `GreetingHeader` (eyebrow au-dessus du titre), pas un titre nu** : **partiel**. Appliqué sur les 2 sections dont l'eyebrow portait une information (ruban : fenêtre en jours ; historique : compteur). Les 6 autres ont un titre nu, parce que leur ancien eyebrow n'était que le titre lui-même ; en ajouter un aurait voulu dire inventer du contenu hors maquette. À arbitrer.
- [x] **Hiérarchie cohérente entre `h1` et `h2`** : **tenu dans le code**. Dashboard `h1` 21px/500 > `h2` 17px/600 ; détail produit `h1` 35px > `h2` 17px. Preuve unitaire sur les classes ; la preuve navigateur est dans la spec E2E (`h2.fontSize < h1.fontSize`).
- [ ] **Vérifié en clair, en sombre et en allemand** : **non tenu par moi**, comme prévu au briefing. La spec E2E couvre clair/sombre (dashboard) et `de` (ruban, nav, Réglages, mobile 375). La vérification navigateur et la revue de charte restent au lead.

**Non vérifié** : aucun rendu réel (pas de navigateur, pas de build) ; les largeurs allemandes sont des estimations (Plex Mono à 0,6em par glyphe) ; les traductions en/de/es de « Aperçu de la frise » n'ont pas été relues par un natif.

## Signaux mémoire

- [MEMORY:pitfall] Context: un eyebrow DS (`.mt-eyebrow`, hors layer) pose `color` et `font-size`. Posé sur le libellé d'un lien actif, il écrase l'encre héritée de la pilule (`text-primary-ink`) : contraste détruit, sans erreur ni test rouge. Solution: une classe dédiée qui ne pose ni couleur, ni taille, ni graisse (`.mt-nav-label`), avec un test PostCSS qui interdit ces propriétés. Prevention: avant de réutiliser une classe `.mt-*` sur un élément dont un ancêtre pilote la couleur par état, lister ses déclarations compilées ; toute propriété héritable qu'elle pose coupe l'héritage.
- [MEMORY:pattern] Problem: un balayage « titres en style eyebrow » par grep sur `font-mono` avait raté 2 sites sur 8 (ProductDetailView, sans `font-mono`). Solution: une garde statique repo-wide sur `<h1..h6>` avec l'union des marqueurs (`uppercase|tracking-widest|font-mono`), plus un contrôle négatif sur les deux formes réelles et des seuils anti-vacuité. Anti-pattern: une garde qui ne teste qu'un marqueur, ou dont le balayage vide rend `[]`.
- [MEMORY:decision] Context: #575 demandait « motif GreetingHeader » sur 8 titres, mais 6 d'entre eux n'avaient aucune information hors du titre. Decision: eyebrow gardé seulement là où il porte une donnée (ruban, compteur d'historique) ; pas d'eyebrow décoratif inventé. Why: la maquette n'est pas dans le dépôt, et inventer un contenu serait un arbitrage Designer.

## fichiers de contexte lus

- `docs/memory/sprints/sprint-84/briefing-575.md` — NON LU sur disque (contenu identique reçu inline dans le prompt, qui fait foi).
- `.ai-env/context-packs/pit-frontend.md` — extrait inline (PIT-S22-001, PIT-S41-005, PIT-S53-001/002/003, PIT-S63-013) + grep ciblé : lus `PIT-S73-001` (l.815), `PIT-S77-013` (l.968), `PIT-S77-015` (l.976).
- `.ai-env/context-packs/cp-frontend.md` — NON LU (périmé, #661 ; code lu directement).
- `.claude/rules/frontend-stack.md` / `.claude/rules/conventions.md` — NON LUS en fichier (conventions appliquées depuis le briefing et le CLAUDE.md projet : code EN, commentaires FR, 4 locales).
- `docs/memory/decisions.md` — lus `DEC-S83-002` (l.795), `DEC-S83-005` (l.813), `DEC-S84-001` (l.819), `DEC-S84-002` (l.825).
- `frontend/src/styles/ds/components/i18n.css` — §2 eyebrows l.37-53 (`.mt-eyebrow{…font-size:10px…color:var(--color-ink-muted)}`).
- `frontend/src/styles/ds/tokens/typography.css` — `--text-sm: 17px` l.14, `--tracking-wide: 0.06em` l.32.
- `frontend/src/styles/ds/tokens/base.css` — `h1..h6 { line-height }` hors layer l.60, `@layer base` h1..h6 l.78-85.
- `frontend/src/styles/ds/components/core.css` — `.mt-label` l.58, `.mt-toast__title` l.290, `.mt-dialog__title` l.311.
- `frontend/src/styles/globals.css` — l.1-40 (imports DS non layerisés), l.120-200 (`@theme`, commentaire #339).
- `frontend/src/styles/__tests__/i18n-intl-classes.test.ts` — modèle PostCSS (`compile`, `layerChain`).
- `frontend/e2e/sprint-63-de-overflow-audit.spec.ts` — l.140-421 (`measure`, `expectNoPageOverflow`, exclusion des conteneurs `overflow-x`).
- `frontend/e2e/sprint-73-tablet-sidebar.spec.ts` — l.60-222 (`navLabel = …locator('span').first()` l.144).
- `frontend/e2e/settings-navigation.spec.ts` — l.15-57 (testids seulement).
- `frontend/e2e/settings-breakpoints.spec.ts` — lecture par grep des assertions (largeur sidebar, débordement de page l.244).
- `gh issue view 575` — corps + commentaire DEC-S84-002 (maquette `App.dc.html`).
- Maquettes `design_handoff_mytimeline` — NON LUES (hors dépôt) ; seules les valeurs recopiées dans l'issue ont été utilisées.

## Recommandations suite

- RECOMMAND_FOLLOWUP: harmoniser l'eyebrow de `GreetingHeader` (13px/`ink-faint`/`.16em`) avec `.mt-eyebrow` (10px/`ink-muted`/`.08em`) : les deux cohabitent désormais sur le dashboard. C'est un arbitrage Designer sur la taille canonique des eyebrows [S | design]
- RECOMMAND_FOLLOWUP: trancher la casse du lien « Réglages » du pied de sidebar (`AppShell.tsx:283`), qui a le même gabarit que les liens de nav mais reste en sentence case, hors `<nav>` [XS | design]
- RECOMMAND_FOLLOWUP: confirmer avec la maquette si les 6 sections sans eyebrow (semaine, en bref, produits, agenda compact, carrousel, frise produit) doivent en porter un informatif (plage de la semaine, compteurs) [S | design]
- RECOMMAND_FOLLOWUP: les autres eyebrows faits main (`CompactAgenda:88/:103`, `MobileDrawer:81/:88`, `timeline/page.tsx:60`, `ProductDetailView` `<dt>` et badge « archivé ») ne se détendent pas en allemand ; les basculer demande un arbitrage de taille (13 → 10px) [S | design]
- RECOMMAND_FOLLOWUP: faire relire par un natif les traductions en/de/es de `dashboard.density.title` (« Aperçu de la frise ») [XS | i18n]
- Pas de RECOMMAND_TEST_RUNNER car la suite Vitest a été jouée en entier et l'E2E est réservée au lead.
- Pas de RECOMMAND_DB_EXPERT car aucune couche backend ni schéma n'est touché.


## Absorbé par le lead (post-vague, `ededd26`)
- La spec `e2e/sprint-84-section-titles.spec.ts:256` (dashboard mobile, allemand, 375 px) rougissait au 1er run complet : page 377 px. Cause mesurée par sonde Playwright : `add-product-button` (`nowrap`) repoussé par `GreetingHeader` (flex item sans `min-w-0`, nom E2E sans espace). **Indépendant de la locale et préexistant** (fr déborde plus : 390/394 px ; `page.tsx` et `GreetingHeader` non touchés par la vague). Cf. PIT-S63-013 (faux débordement d'identifiant) — ici le défaut adjacent est réel : un vrai nom long déborderait pareil.
- Correctif XS : `min-w-0` sur le `<header>` + `break-words` sur le `h1`. Mesuré 375/375 sur 2 comptes × fr/de ; spec rejouée 23/23.
- Arbitrages du dev (2026-09-11) : eyebrow seulement là où il informe (2/8) — **gardé tel quel** ; follow-up « confirmer section par section avec la maquette ».

STATUS: COMPLETED
