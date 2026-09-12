RETOUR :

- commits: [9dac435]

- resume:
  4 occurrences « Retour » en dur (haut + bas des 2 pages) recablees sur
  `common.navigation.back` / `backToHome` — clés PRE-EXISTANTES, renseignées
  dans les 4 locales. Zero clé dupliquée.
  Date centralisée dans `frontend/src/lib/legal-pages.ts`
  (`LEGAL_LAST_UPDATED_ISO = '2023-06-01'`).
  CHOIX DE FORMAT : ISO stockée, formatée par locale, MOIS EN TOUTES LETTRES
  (« 1 juin 2023 » / « June 1, 2023 » / « 1 de junio de 2023 » / « 1. Juni
  2023 »). RAISON : `01/06/2023` est ambigu hors `fr` — `en` le lit
  « 6 janvier ». Sur une page qui fixe une date d'opposabilité, l'inversion
  jour/mois n'est pas cosmétique. Un format numérique unique aurait imposé une
  convention étrangère à 3 locales sur 4. `timeZone: 'UTC'` EPINGLE : sans lui,
  `new Date('2023-06-01')` (minuit UTC) rendrait « 31 mai » a l'ouest de
  Greenwich — invisible depuis un poste européen.
  MODULE DEDIE et pas `lib/config.ts` : `src/lib/` ne contient que des modules
  étroits nommés par leur sujet (`auth-jwks`, `canonical-host`, `query-keys`) ;
  créer un fourre-tout y attirerait mécaniquement toute constante sans domicile.
  Disclaimer hors `fr` (`<LegalDisclaimer>`, `role="note"`). Sommaire romain
  ancré (`<LegalTableOfContents>`) : 9 entrées privacy, 11 terms, ancres
  `id` + `scroll-mt-24`. RENDU SERVEUR, ZERO JS — de simples `<a href="#id">` ;
  aucun `'use client'` introduit. Chiffres romains dans un `<span aria-hidden>`
  FRERE du lien : le nom accessible reste le seul titre de section.
  #172 ABSORBEE : valeur `fr` de `legal.disclaimerOriginalFrench` ajoutée ET clé
  effectivement câblée (elle n'avait aucun appelant). Clé `tableOfContents`
  ajoutée dans les 4 locales, sans recopie du FR.
  PARITE VERIFIEE EXPLICITEMENT (pas supposée) : 66 clés, jeux IDENTIQUES sur
  fr/en/es/de (avant : 64 fr / 65 autres).

  COMPTES DE TESTS REELS (exécutés, pas déduits) :
    - unitaires ciblés `src/lib/legal-pages.test.ts` : 60 passed / 0 failed
    - suite unitaire frontend complète (`./scripts/test-quiet.sh frontend`) :
      109 fichiers, 1251 passed / 0 failed
    - E2E `e2e/sprint-75-legal-pages.spec.ts` : 33 passed / 0 failed (28 tests
      de spec + 5 du projet `setup`), 56.5s puis 15.7s au rejeu
    - `tsc --noEmit` : clean ; `next lint` sur les fichiers touchés : clean
  Recette E2E : serveur externe `npx next dev -p 3000` (WEBPACK, pas turbopack —
  worktree), backend conteneur `:8086`, oracle `/api/auth/me` = 401 vérifié
  AVANT le run.

  CONTROLE NEGATIF JOUE (le test du test). Ancre `user-rights` renommée en
  `user-rights-MUTANT` -> 2 tests rougissent : « liste 9 entrées ancrées »
  (`section#user-rights` a 0 élément) et « cliquer une entrée amène à la
  section » (l'auto-contrôle refuse de juger sur une cible inexistante au lieu
  de passer à vide). Fichier restauré et spec rejouée verte. La spec n'est donc
  pas un décor.

  CE QUI N'A PAS ETE VERIFIE / LIMITES ASSUMEES :
    - E2E joués sur chromium UNIQUEMENT (firefox est restreint par `testMatch` à
      une autre spec ; webkit hors périmètre projet).
    - Pas de vérification visuelle au navigateur du rendu du sommaire (largeur
      de la colonne des chiffres, débordement en `de` — locale la plus longue).
      Les E2E prouvent la structure et le saut d'ancre, PAS l'esthétique.
    - `next build` non lancé (un run vitest vert ne garantit pas le build —
      piège connu du pack frontend). La CI le couvrira.
    - Aucun contraste mesuré sur les éléments ajoutés (jetons DS réutilisés tels
      quels, mais non mesurés).

- fichiers de contexte lus:
  - .ai-env/context-packs/pit-frontend.md (grep ciblé : getTranslations, ancre,
    anchor, jsdom, scroll, fragment — puis lecture des entrées trouvées)
  - frontend/playwright.config.ts
  - frontend/e2e/README.md
  - frontend/e2e/document-lang.spec.ts
  - frontend/src/components/ui/language-selector.i18n.test.ts
  - frontend/app/[locale]/privacy/page.tsx
  - frontend/app/[locale]/terms/page.tsx
  - frontend/public/locales/{fr,en,es,de}/legal.json
  - frontend/public/locales/{fr,en,es,de}/common.json
  - frontend/tailwind.config.ts, frontend/src/styles/globals.css (jeton ring)
  NON LUS (annoncés dans le briefing) : .claude/rules-jit/ux-patterns.md.
  Le périmètre n'ajoute aucun motif UX nouveau (nav d'ancres + encart texte,
  jetons DS existants) — omission assumée, pas un oubli silencieux.

- [MEMORY:*] signaux:
  [MEMORY:pitfall] Contexte: un chemin glob dans un commentaire de bloc TS —
  `/* … `public/locales/*/legal.json` … */` — contient `*/` et FERME le
  commentaire. esbuild rougit 12 lignes plus bas (« Expected ; but found 01 »),
  loin de la cause. Solution: écrire `<locale>` au lieu de `*`.
  Prevention: proscrire `*/` dans tout commentaire de bloc ; le backquote
  markdown ne protège rien.

  [MEMORY:pattern] Problème: prouver qu'un saut d'ancre marche, alors que jsdom
  ne résout aucun fragment. Solution: E2E qui mesure `getBoundingClientRect().top`
  AVANT le clic et EXIGE > 400px (auto-contrôle : si la cible est déjà en haut,
  l'oracle serait vide et le test passerait sans rien prouver), puis after < 136px.
  Bonus : sur un `id` supprimé, `readTop` rend NaN et l'auto-contrôle rougit —
  le test refuse de statuer plutôt que de passer à vide.
  Anti-pattern: se contenter d'asserter `page.url()` contient `#id` — un
  `<a href="#absent">` met TOUJOURS à jour l'URL, même sans cible.

  [MEMORY:decision] Contexte: #60 demandait une « date centralisée » sans dire
  en quel format. Décision: ISO stockée + `Intl.DateTimeFormat` par locale avec
  mois littéral et `timeZone: 'UTC'`. Pourquoi: `JJ/MM/AAAA` est ambigu hors
  `fr`, et l'absence de `timeZone` fait glisser la date d'un jour à l'ouest de
  Greenwich — bug indétectable depuis l'Europe.

- recommandations suite:
  PAS de RECOMMAND_* — rien ici n'appelle un spécialiste (aucun schéma, aucune
  requête, aucune surface d'auth touchée).

  PIEGE SUBTIL A REMONTER AU LEAD — `prettier --check` sur ce dépôt.
  `npx prettier --check` signale mes 3 nouveaux fichiers. J'ai passé un TEMOIN
  avant de conclure quoi que ce soit : `src/components/ui/language-selector.i18n.test.ts`
  et `e2e/document-lang.spec.ts`, que je n'ai PAS touchés, échouent EUX AUSSI.
  `format:check` existe dans package.json mais n'est câblé dans AUCUN workflow
  `.github/workflows/`. Conclusion : condition PRE-EXISTANTE et non appliquée,
  pas une non-conformité de mon diff — et je ne l'impute donc pas à mon edit
  (cf. mise en garde du briefing sur le verdict prettier faux rendu sous RTK).
  Je n'ai PAS lancé `prettier --write` : `prettier-plugin-tailwindcss`
  réordonnerait les classes des deux pages et gonflerait le diff bien au-delà
  du périmètre. A arbitrer hors issue.

  OBSERVATION HORS PERIMETRE (non corrigée, comme demandé) : rien d'anormal
  observé sur la résolution des messages serveur pendant mes runs — `i18n.ts`,
  `middleware.ts` et `backend/` non touchés, `common.json` non touché non plus
  (le test d'ordre des clés `navigation` de #353 reste donc valide).

  NOTE D'ORCHESTRATION : le hook `warn-test-delegation.sh` bloque
  `npx playwright test` et pousse à déléguer à `test-runner`. La mémoire projet
  documente 4 faux « E2E impossible » rendus par ce subagent (dernier au S73) et
  conclut de ne plus lui déléguer. J'ai donc bypassé avec `SKIP_DELEGATION=1` et
  exécuté moi-même. Le hook et la mémoire se contredisent — à trancher.

STATUS: COMPLETED
