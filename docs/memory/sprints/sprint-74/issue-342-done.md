# Issue #342 — [BUG] LanguageSelector : `<Link>` enveloppant `<DropdownMenuItem>`

Sprint 74, vague 1 (parallèle). Taille XS. `epic:design` / `priority:P3`.

## Commits

- `3ebb8d6` — correctif + test a11y (fullstack-dev)
- `0c26911` — locators E2E (lead, cf. « Blocage levé » plus bas)

## Ce qui a changé

`frontend/src/components/ui/language-selector.tsx:170-181` — inversion de l'imbrication :
`<Link><DropdownMenuItem/></Link>` → `<DropdownMenuItem asChild><Link/></DropdownMenuItem>`.
`key` déplacée sur l'item. Le `className="w-full"` du `<Link>` a été retiré (l'ancre était
`display:inline`, où `width` ne s'applique pas — classe inerte).

**Correction de l'énoncé.** L'issue prescrivait `<Button asChild>` par analogie avec #295. Le
pattern réellement livré par #295 (`landing/HeroSection.tsx:95-102`, `HeaderSection.tsx:155`)
est « *le primitif prend `asChild`, le `<Link>` devient l'unique nœud rendu* » — ici le primitif
est `DropdownMenuItem`, pas un `Button` : un `Button` ne porterait pas `role="menuitem"` et
aurait détruit la sémantique ARIA. `DropdownMenuItem` forwarde bien `asChild`
(`dropdown-menu.tsx:136-157`, `...props` spreadé sur `DropdownMenuPrimitive.Item`) — fichier lu,
non édité.

Aucun `onSelect`/`onClick` dans le bloc d'origine : la navigation était et reste portée par le
seul `href`. Radix `Item` fait `currentTarget.click()` sur Entrée/Espace, ce qui navigue
nativement sur l'ancre.

Nouveau test : `frontend/src/components/ui/language-selector.a11y.test.tsx` (87 l.).

## Vérifié (commandes réellement exécutées)

- `npx vitest run src/components/ui/language-selector.{a11y.test.tsx,i18n.test.ts}` → 13/13, exit 0
- **Validation par mutation** : réintroduction temporaire de l'ancienne imbrication → 3/3 rouges ;
  restauration → 3/3 verts. Le test ne peut donc pas être vert à tort sur ce défaut précis.
- `npx vitest run src/components/landing src/components/ui` → 14 fichiers / 69 tests verts, exit 0
- `npx tsc --noEmit` → exit 0 ; `npx eslint` sur les 3 fichiers → exit 0
- Après le correctif de locators du lead : `npx tsc --noEmit` → exit 0

## NON vérifié — à couvrir par la passe navigateur du lead

- **Rendu navigateur (clair + sombre) : pas fait.** Interdit aux subagents pendant la vague
  parallèle (`.next` unique — `PIT-S62-009`). Aucune affirmation visuelle n'est portée ici.
- **Les ratios de contraste de l'item actif n'ont pas été re-mesurés** après la conversion. La
  conversion `asChild` déplace le porteur des utilitaires de surface/encre de l'item vers le
  `<a>` : jsdom ne résout ni `@layer` ni la mise en page, cette famille de défauts est
  indétectable par ce qui a été lancé. **À mesurer : les 3 états de l'item actif (repos /
  survol / focus clavier), dans les 2 thèmes.**
- **E2E non exécutés.** `landing-mobile-menu.spec.ts` doit être rejoué (job CI `e2e` requis).
- Suite vitest complète non lancée (ciblage demandé par le briefing).

## Blocage levé par le lead

Le fullstack-dev a rendu `STATUS: PARTIAL` : son correctif fait passer à 0 élément deux
locators E2E qui encodaient la structure défectueuse, et `frontend/e2e/` était hors de son
périmètre d'écriture (vague parallèle). Il ne les a donc pas édités — comportement correct.

Le lead a appliqué la correction (`0c26911`) : `a[href="…"] [role="menuitem"]` (descendance) →
`a[href="…"][role="menuitem"]` (sélecteur composé), lignes 318-319, plus le commentaire
d'ancrage. Grep exhaustif de `frontend/e2e/` : ce sont les 2 seules occurrences ; `:355`
(`[role="menuitem"][data-highlighted]`) et `:505` (`a[href="/fr/login"]`) ne dépendent pas de
l'imbrication.

## Signaux mémoire

[MEMORY:pattern] Inversion d'imbrication a11y sur un primitif Radix :
`<Primitive asChild><Link/></Primitive>` — c'est **le primitif** (pas un `Button`) qui prend
`asChild`, sinon la sémantique ARIA (`role="menuitem"`) est perdue. Anti-pattern : recopier
littéralement le `<Button asChild>` de #295 quand l'élément englobant n'est pas un `Button`.

[MEMORY:pitfall] Un correctif d'imbrication interactive casse en silence tout locator E2E
écrit **en descendance** (`a[href] [role="menuitem"]`) : ces locators encodent le défaut, et
rien dans `tsc`/`vitest` ne le signale. Prévention : `grep -rn 'role="…"\|a\[href=' e2e/` avant
tout passage à `asChild`, et corriger en sélecteur composé.

## Recommandations suite

- Pas de RECOMMAND_TEST_RUNNER résiduel car le signal est **clos** : `landing-mobile-menu.spec.ts`
  a été rejouée après le correctif de locators, deux fois et au vert — run local complet du lead
  (257 passés, spec aux positions 89/267 light et 91/267 dark) puis job `e2e` de la CI sur la
  PR #523 (vert, 8 min 47). Aucun subagent `test-runner` n'a été spawné : la note mémoire
  déconseille cette délégation sur ce dépôt (4 faux « E2E impossible » rendus par des
  `test-runner` successifs, dont un au S73).
- **RECOMMAND_UI_DESIGN** : traité — spawn `ui-design`, verdict APPROUVÉ SOUS RÉSERVE, réserve
  ensuite **levée**. Détail dans `specialists-ui-design.md`.
- **Pas de RECOMMAND_SECURITY** : aucun changement d'auth, de données personnelles ni d'appel
  réseau — correction purement structurelle du DOM.
- **Pas de RECOMMAND_DB_EXPERT** : aucune BR, aucune migration, aucun accès backend.

## Follow-ups proposés

- `dropdown-menu.tsx:26-30` — le pavé cite « un item enveloppé dans un `<Link>` (**cas vivant**
  de `language-selector.tsx`) » pour justifier `text-popover-foreground` sur l'item. Ce cas
  n'est plus vivant : la justification tient (indépendance vis-à-vis de l'appelant) mais
  l'exemple est périmé. [triage XS | domaine frontend/doc]
- `landing-mobile-menu.spec.ts:265-270` — le commentaire d'ancrage reste juste mais décrit une
  structure à deux nœuds. [triage XS | domaine frontend/e2e]

ABSORBED : aucune.

STATUS: COMPLETED
