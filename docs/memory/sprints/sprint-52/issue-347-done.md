# Issue #347 — Header landing, débordement 768–1023 px

commits: 9c570e1c65f832513ea68b0474c9d40c37029ffd

pack_lu: OUI — cp-frontend.md §« Design system « Graphite » (`src/styles/ds/`) » (+ §« Tests (Vitest + RTL) — pièges »)

resume: bascule burger remontée `md` (768) → `lg` (1024). Fichiers : `HeaderSection.tsx` (+`LG_BREAKPOINT_QUERY`, nav/groupe secondaire/burger/gap/h-9), `LandingMobileMenu.tsx` (overlay+panneau `lg:hidden`), `HeaderSection.test.tsx` (+2 tests), `e2e/landing-mobile-menu.spec.ts` (+9 tests). MESURÉ, pas supposé : largeur des 3 blocs à 768 px = logo 234 + nav 322,5 + groupe droit 298,8 = 855,1 pour 736 utiles (fr). Les 3 blocs sont DÉJÀ à leur min-content (logo sur 2 lignes) → aucun bloc « seul coupable », d'où le retrait de blocs plutôt qu'un rétrécissement.

arbitrage (3 options de l'issue, les 2 rivales SIMULÉES au navigateur avant de trancher) :
- retenue — bascule `lg` : 0 débordement, marge 223–258 px, logo revenu sur 1 ligne
- rejetée — seul le groupe droit bascule : 0 débordement mais **marge 0 px dans les 4 locales**, logo toujours sur 2 lignes → tenait à la longueur d'un libellé près
- rejetée — retour à la ligne : ne traite pas la cause, header multi-lignes

verification_navigateur: FAITE. Chromium via script Playwright, dev server du worktree. 24 combinaisons (320/375/390/768/820/1024 × fr/en/de/es) : `scrollWidth - clientWidth = 0` partout, avant ET après. Avant correctif, reproduit : fr +103, de +90, es +108 à 768 px. Thèmes clair ET sombre vérifiés à 768/820/1024 × 4 locales. Frontière exacte mesurée : à 1023 `matchMedia('(min-width:64rem)')=false` + burger `flex` + nav `none` ; à 1024 l'inverse — JS et CSS basculent au même pixel. Panneau ouvert à 1023 puis passage à 1024 → `count=0` et `aria-expanded=false`, et pas de réapparition au retour à 1023 (l'ÉTAT est remis à faux, pas seulement masqué). Captures header inspectées à 768/de, 820/es-sombre, 1024/fr.

tests:
- `./scripts/test-quiet.sh frontend` → 825 passed / 0 failed (92 fichiers), dont `landing.hover-pairing.test.ts` (garde-fou #346) vert
- `npx vitest run src/components/landing/` (après restauration du contrôle négatif) → 52 passed / 0 failed
- `SKIP_DELEGATION=1 PLAYWRIGHT_BASE_URL=http://localhost:3100 npx playwright test landing-mobile-menu.spec.ts --project=chromium --no-deps --workers=1` → **19 passed / 2 failed**. Les 2 échecs ne sont PAS de mon fait (voir ci-dessous).
- `npm run typecheck` → 0 erreur ; `eslint` + `prettier --check` sur mes 4 fichiers → 0 problème
- CONTRÔLE NÉGATIF exécuté (les tests verts ne prouvent rien tant qu'on ne les a pas vus rouges) : classes de bascule remises à `md:` → **5/5 rouges** ; fichier restauré à l'identique juste après (vérifié : 0 occurrence de `md:flex`/`md:hidden`).

premisses_infirmees:
- « les chiffres du S49 n'ont pas été re-vérifiés » → re-mesurés, ils sont EXACTS (871/858/876 vs 768). Aucune dérive.
- **`en` ne débordait PAS à 768 px** (mesuré 768/768), contrairement à ce que laisse entendre le critère d'acceptation qui liste les 4 locales. Il tenait à 0,1 px près (somme min-content 736,1 pour 736 utiles) — d'où l'ajout des 4 locales au test, `en` étant le cas trompeur qui aurait validé un faux correctif.
- « le débordement s'étend jusqu'à ~1000 px » → mesuré présent à 768 et 820, absent à 1024. Cohérent.

non_couvert:
- **Défaut PRÉ-EXISTANT non corrigé, hors périmètre : à 1024 px le header a 0 px de marge** (somme des blocs = 992 = largeur utile) en `fr` et `es`, et le logo y tombe sur 2 lignes (137 px de haut au lieu de 68) — visible sur la capture 1024/fr, où « Comment ça marche » se coupe aussi. Mesuré identique AVANT et APRÈS mon correctif : mon changement n'affecte rien au-dessus de 1023 px. Le critère « pas de débordement à 1024 » est tenu (0 px), mais sans aucune marge. Ne pas le compter comme réglé.
- Suite E2E complète NON lancée (uniquement `landing-mobile-menu.spec.ts`). Le port 8080 était occupé par le stack Docker de l'agent #372 (`mytimeline-readme-backend-1`) : mon backend a échoué à démarrer (« Port 8080 was already in use ») et je ne l'ai pas tué. Specs landing lancées en `--no-deps` (aucune auth requise). Les autres specs, elles, exigent le backend : NON vérifiées par moi.
- Aucun test sur un vrai appareil tactile ; le palier tablette n'a été validé qu'au clavier/souris via viewport émulé.
- Pas de vérification à 1280+ (hors périmètre de l'issue).

[MEMORY:pitfall] Contexte : E2E lancée en worktree partagé, `curl` renvoyait 401 sur :8080 → « backend prêt ». En réalité mon backend avait échoué (port pris) et je mesurais celui d'un AUTRE agent (conteneur Docker). Solution : vérifier le LOG du process, pas seulement la réponse du port. Prévention : un port qui répond ne prouve pas que c'est VOTRE process qui répond — `lsof -nP -iTCP:<port>` + lecture du log de démarrage.

[MEMORY:pattern] Problème : arbitrer entre plusieurs correctifs CSS sans coder les 3. Solution : simuler chaque option par `addStyleTag` dans Playwright et comparer la MARGE résiduelle (pas seulement « ça déborde ou non ») — ici 0 px vs 223–258 px a tranché entre deux options toutes deux « vertes ». Anti-pattern : choisir sur la seule absence de débordement, qui masque les correctifs qui tiennent à un pixel près.

recommandations suite:
- RECOMMAND_FOLLOWUP : **2 tests E2E rouges dans `landing-mobile-menu.spec.ts` — `sélecteur de langue : la locale active reste lisible`, clair ET sombre.** Mesuré `langue/active (repos)` = 1,23:1 (#ffffff sur #dbe9fc) en clair et 1,28:1 (#0b0c0e sur #16263a) en sombre, seuil 4,5. Cause : le travail EN COURS de #346 sur `ui/dropdown-menu.tsx` (non commité au moment de mon run) — son propre commentaire signale `language-selector.tsx` (item de locale active en `bg-accent text-accent-foreground`) comme « consommateur à surveiller » et renvoie à #353. NON CORRIGÉ par moi : fichier propriété de #346. Preuve que ce n'est pas mon fait : ces tests tournent à 375 px, largeur à laquelle mon diff est un no-op strict (toutes mes classes sont des paliers ≥768, et `md`/`lg` y valent tous deux faux) ; mon diff ne contient AUCUN token de couleur.
- RECOMMAND_FOLLOWUP : marge nulle à 1024 px + logo sur 2 lignes en `fr`/`es` (cf. `non_couvert`). Piste : le logo `text-3xl` (57 px dans le DS Graphite, PAS 30 px) pèse 328 px à lui seul ; réduire son échelle au palier `lg` ou resserrer `space-x-8` de la nav rendrait de la marge. Décision de design, non prise ici.
- `hover:bg-accent hover:text-accent-ink` de `HeaderSection.tsx` (bouton Connexion) : paire laissée STRICTEMENT intacte, elle n'apparaît pas dans mon diff.

STATUS: COMPLETED
