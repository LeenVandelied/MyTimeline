# Issue #279 — migration i18n.ts requestLocale/hasLocale

RETOUR :

- commits: [b24bd21]

- resume:
  - `frontend/i18n.ts` — `getRequestConfig(async ({requestLocale}) => …)`, `await` la Promise,
    valide via `hasLocale(SUPPORTED_LOCALES, …)` importé de `next-intl` (pas `/server`).
  - Liste locales NON réinventée : réutilise `@/i18n/locales` (`SUPPORTED_LOCALES`/`DEFAULT_LOCALE`,
    source unique #235). Repli `fr` conservé. Retour inclut toujours `locale`.
  - `loadMessages` INCHANGÉE (signature + comportement) — `app/[locale]/layout.tsx` en dépend.
  - Durcissement de fait : ancien `locale || 'fr'` acceptait toute chaîne non vide ; le segment
    `[locale]` étant un attrape-tout (`/unknown.txt`), on chargeait un répertoire inexistant →
    page muette. `hasLocale` replie maintenant sur `fr`.
  - `resolveLocale` extraite + exportée UNIQUEMENT pour testabilité (cf. pitfall ci-dessous).
  - PREUVE BUILD : `next build` exit 0, **52/52 pages statiques, 4 locales (fr/en/es/de) prérendues
    sur chaque route**, `privacy` et `terms` incluses. Nombre de pages inchangé.
  - PREUVE TESTS : suite frontend 108 fichiers / 1191 tests verts (avant : 107/1187 → +1/+4 = les
    miens). Lint OK sur mes 2 fichiers.
  - RÉSERVE HONNÊTE : le `next build` complet a tourné quand l'arbre ne contenait QUE mon
    `i18n.ts`. Après l'extraction de `resolveLocale`, un re-build est BLOQUÉ par
    `src/lib/legal-pages.ts` (issue #60, autre agent, 29 erreurs de syntaxe en cours d'écriture) —
    pas par moi. Delta re-prouvé autrement : tsc isolé sur mes 2 fichiers = 0 erreur, + vitest vert.

- fichiers de contexte lus:
  - `.ai-env/context-packs/pit-frontend.md` (grep i18n/next-intl → PIT-S34-001, PIT-S33-002)
  - `frontend/i18n.ts`, `frontend/middleware.ts`, `frontend/next.config.mjs`
  - `frontend/src/i18n/locales.ts`, `frontend/tsconfig.json`, `frontend/package.json`
  - `node_modules/next-intl/dist/types/server/react-server/getRequestConfig.d.ts`
  - `node_modules/use-intl/dist/types/core/hasLocale.d.ts`, `core/index.d.ts`

- [MEMORY:*] signaux:
  - [MEMORY:pitfall] Contexte: tester le `default export` de `i18n.ts` sous Vitest.
    Vitest résout `next-intl/server` sur le bundle **react-client**, où `getRequestConfig` est un
    stub qui lève « not supported in Client Components » — 3 tests rouges d'emblée.
    Solution: extraire la logique pure (`resolveLocale`) et la tester ; le default export reste
    couvert par `next build`. Prévention: ne pas promettre de test unitaire sur un artefact RSC-only.
  - [MEMORY:pitfall] Contexte: `rtk` ne mange pas que `git diff`. `npx next build` filtré a renvoyé
    « **2 routes (1 static, 1 dynamic)** » en 8.2s, et **la redirection `> log` capture la sortie
    RÉSUMÉE** (fichier de 5 lignes) — le vrai build fait 52/52 pages et 99 lignes.
    Un `tail`/`Read` sur ce log confirme donc le faux chiffre. Solution: `rtk proxy npx next build`.
    Prévention: sur toute commande dont la sortie EST la preuve, passer par `rtk proxy` d'emblée ;
    rediriger vers un fichier ne désamorce PAS le filtre.
  - [MEMORY:bug] Cause: énoncé #279 affirmait « non-impactant au runtime, indépendant de
    getRequestConfig ». FAUX — `createNextIntlPlugin('./i18n.ts')` en fait le request-config actif.
    Confirme le pitfall S74 « énoncés d'issue périmés » ; le lead avait déjà redressé le tir.

- recommandations suite:
  - Arbre PARTAGÉ : `frontend/src/lib/legal-pages.ts` (#60) était syntaxiquement invalide au moment
    de mes vérifs → `tsc`/`next build` globaux ROUGES pour une cause étrangère à #279. Que le lead
    ne m'impute pas ces 29 erreurs, et relance un `next build` global en fin de vague 1.
  - Pas de RECOMMAND_TEST_RUNNER ni RECOMMAND_DB_EXPERT : suite unitaire légère (24s), zéro DB.
  - Aucun E2E requis : aucun `data-testid` ajouté, aucun rendu visuel modifié.

STATUS: COMPLETED
