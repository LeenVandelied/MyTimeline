commits: [df93b638be1a9e007acc9acbcc086c9712e9eb80]

resume: `ui/language-selector.tsx` item de locale ACTIVE — `bg-accent text-accent-foreground` → `bg-accent text-accent-ink font-medium focus:bg-accent-hover`. L'item reprend la main sur SA surface au focus, au lieu de subir le `focus:bg-accent-soft` de la base. Piste de #346 (`focus:bg-accent`) ÉVALUÉE puis ÉCARTÉE : les deux options ont été rendues et mesurées, `accent-hover` domine sur les 3 axes (ratio clair 6.08 vs 4.71 — donc 1.58 de marge sur le seuil 4.5 au lieu de 0.21 ; ratio sombre 8.78 vs 6.94 ; delta de surface repos→focus 1.29:1 vs 1.00:1 STRICTEMENT NUL). `accent-hover` est le jeton DS de « un cran plus sombre sur un aplat primaire » (readme DS §Hover/press/focus), déjà apparié à `accent-ink` par `.mt-btn--accent:hover`. Alias shadcn `text-accent-foreground` → jeton DS `text-accent-ink` (même valeur calculée). Commentaire de `ui/dropdown-menu.tsx` corrigé : le consommateur n'est plus « à surveiller », il est tombé.

verification_navigateur: FAITE. Chromium/Playwright, dev server :3000 démarré PAR MOI (vérifié `lsof` PID 76467 + log « Ready in 1020ms » — pas un port squatté), 375 px, `colorScheme` émulé (pas la classe `dark` forcée), `getComputedStyle` + fonds composités.
- locale active AU FOCUS clavier : **clair 6.08:1** (#ffffff sur #0e5fc4), **sombre 8.78:1** (#0b0c0e sur #76b0ff). Seuil 4.5 (17px/500, pas du grand texte).
- locale active hors focus : 4.71:1 / 6.94:1 (inchangé par ce correctif).
- AVANT correctif, reproduit : 1.23:1 / 1.28:1. Preuve de non-cécité.

tests:
- `npx playwright test e2e/landing-mobile-menu.spec.ts -g "sélecteur de langue" --project=chromium --workers=1 --no-deps` → **2 passed / 0 failed** (2 failed avant correctif)
- même spec ENTIÈRE → **21 passed / 0 failed**
- `./scripts/test-quiet.sh frontend` → **825 passed / 0 failed** (92 fichiers), dont `landing.hover-pairing.test.ts` (6 tests) VERT
- `npx tsc --noEmit` 0 erreur · `eslint` + `prettier --check` sur mes 2 fichiers : 0 problème
- Backend NON démarré, et c'est délibéré : cette spec n'utilise ni `storageState` ni API (`--no-deps` suffit, 21/21 verts le confirment). `docker compose up -d` aurait mappé 5432, déjà tenu par un PostgreSQL LOCAL (PID 1974, vérifié `lsof`) — le piège S52. Rien démarré = rien à arrêter, sauf le dev server, arrêté (port 3000 libéré, vérifié).

arbitrage_focus: OUI, l'indicateur reste perceptible — mais il n'est PAS porté par la surface, et c'est la bonne réponse. PRÉMISSE DE #346 INFIRMÉE : « aucun anneau ne le compense » est faux. `ds/tokens/base.css:52` pose `:focus-visible { outline: 2px solid var(--color-focus); outline-offset: 2px }` HORS `@layer`, donc gagnant sur `outline-hidden` de la base. Mesuré sur cet item : `outline: solid 2px rgb(17,112,228) offset=2px`, `:focus-visible = true` au clavier, `outline: none` hors focus, et le contour est bien PEINT (non rogné par `overflow-x-hidden` — vérifié sur capture). Contraste du contour contre la surface du popover : **4.71:1 clair / 6.48:1 sombre**, au-dessus des 3:1 de WCAG 1.4.11. WCAG 2.4.7 est donc tenu sans rien ajouter. J'ai codé puis RETIRÉ un `focus:inset-ring-2 focus:inset-ring-accent-ink` (mesuré 4.71:1/6.94:1, fonctionnel) : sous le contour DS il fait un SECOND anneau concentrique, absent du DS. Le delta de surface de 1.29:1 est faible en soi ; il n'est pas l'indicateur, il est le retour de survol.
Sur le garde-fou AST — NI l'un NI l'autre n'est fautif, et c'est le point structurant : il raisonne par `className` et reste muet ici (aucun `focus:text-*` dans le mien) à juste titre. Mais il est STRUCTURELLEMENT aveugle à ce défaut : la surface (`focus:bg-accent-soft`, `dropdown-menu.tsx`) et l'encre (`text-accent-ink`, `language-selector.tsx`) vivent dans deux fichiers, donc deux `className`. Aucune analyse par attribut ne les rapprochera. L'élargir ne servirait à rien ; seule la mesure au navigateur attrape cette famille. Documenté dans les deux fichiers.

non_couvert:
- Modalité POINTEUR pure (menu ouvert à la souris) : `:focus-visible = false`, aucun contour — le seul retour au survol de l'item actif est le delta de surface 1.29:1 / 1.27:1. Les items INACTIFS passent eux à `accent-soft` (retour franc). Limite MESURÉE et documentée dans le fichier, non corrigée : ce n'est pas un critère WCAG et l'item actif reste signalé en permanence par son aplat.
- Suite E2E complète : NON lancée (seules `landing-mobile-menu.spec.ts` et mon script de mesure). Les specs qui exigent le backend : non vérifiées par moi.
- Suite backend : NON lancée (aucun fichier Java touché).
- `select.tsx` / `SelectItem`, `DropdownMenuCheckboxItem` / `RadioItem` / `SubTrigger` : non touchés, non re-mesurés. Aucun autre consommateur posant une encre fixe sur un item n'a été recherché exhaustivement — j'ai traité le seul signalé.
- 4 locales : seul `fr` actif a été mesuré (c'est la locale de la page ; la classe est la même pour les 4).
- Vrai appareil tactile, autres navigateurs (Firefox/WebKit) : non testés. `:focus-visible` est une heuristique par moteur — le contour peut se comporter autrement hors Chromium. NON VÉRIFIÉ.
- `frontend/.eslintcache` apparaît supprimé dans le working tree partagé (déjà signalé par #346) : ni committé ni restauré par moi.
- `frontend/test-results/` (artefacts Playwright, gitignoré) laissé sur disque : suppression récursive non exécutée sans accord.

recommandations suite:
- RECOMMAND_FOLLOWUP : vérifier le contour `:focus-visible` sur Firefox et WebKit. Toute la conformité 2.4.7 de l'item actif repose dessus, et il n'est mesuré que sur Chromium.
- RECOMMAND_FOLLOWUP : renommer `landing.hover-pairing.test.ts` (le nom dit « landing » et « hover », le périmètre couvre `ui/` et `focus:`) — déjà recommandé par #346, toujours ouvert.
- Aucune recommandation d'élargir le garde-fou AST : voir `arbitrage_focus`, ce défaut lui est hors de portée par construction.

[MEMORY:pitfall] Contexte : conclure qu'un item perd son indicateur de focus parce que sa classe `focus:bg-*` ne change plus la surface. Solution : lire `getComputedStyle(el).outlineStyle/outlineColor/outlineOffset` ET `el.matches(':focus-visible')` — le DS pose un contour global HORS `@layer` (`ds/tokens/base.css`), qui bat `outline-hidden` et fournit l'indicateur indépendamment du fond. Prévention : l'indicateur de focus n'est pas forcément dans le `className` du composant ; le chercher dans le CSS global avant de proposer un anneau.

[MEMORY:decision] Contexte : garde-fou AST d'appariement fond/encre face à un couplage réparti sur DEUX fichiers (surface dans la base, encre chez l'appelant). Décision : ne PAS l'élargir. Pourquoi : il raisonne par attribut `className` ; deux moitiés dans deux `className` distincts sont hors de portée de toute analyse statique par attribut. Seule la mesure au navigateur couvre cette famille — l'élargir donnerait un faux sentiment de couverture.

STATUS: COMPLETED
