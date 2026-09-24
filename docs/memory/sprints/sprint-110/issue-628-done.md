## Résumé
`error.digest` était typé/disponible mais jamais rendu (servait seulement à `isForbiddenError`). Ajouté un composant
partagé `IncidentReference` (`frontend/src/components/shared/StateScreen.tsx`) rendu après le bouton primaire, dans
`actions`, sur `[locale]/error.tsx` (branches 500 ET 403) et `global-error.tsx` (500). Rien si `digest` absent/vide
(dev, erreurs CLIENT) — pas de libellé orphelin. Libellé explicite dans les 4 locales (`crash.incidentRef` +
`forbidden.incidentRef` dans `errors.json`, copie identique dans les `MESSAGES` inlinés de `global-error.tsx`).
Valeur en `.mt-num` (mono, DS), `text-2xs` (13px, token le plus proche des 11px maquette — convention déjà utilisée
par `HowItWorksSection`), `text-ink-muted` (DEC-S97-001, pas `ink-faint`), `break-all` + `select-all`.
Décision : composant unique partagé (pas duplication de markup) → « traitement identique » garanti par construction,
pas juste par convention.

## Sécurité du digest
Preuve lue dans le Next installé (`node_modules/next/package.json` : 15.5.25, `^15.2.4` du repo) :
- `node_modules/next/dist/server/app-render/create-error-handler.js:130` (et lignes 87/190) :
  `err.digest = stringHash(err.message + (err.stack || '')).toString()` — le digest est un HASH d'un texte, jamais
  le texte lui-même.
- `node_modules/next/dist/compiled/string-hash/index.js` : implémentation DJB2 (`r=r*33^charCode`, `r>>>0`) — entier
  32 bits non signé, fonction à sens unique (non réversible), aucune donnée du message/stack n'est récupérable.
- `node_modules/next/dist/lib/error-telemetry-utils.js:23-27` (`createDigestWithErrorCode`) : peut suffixer
  `@<__NEXT_ERROR_CODE>`, un code d'erreur INTERNE Next (enum framework type `E123`), pas du contenu utilisateur.
- `getDigestForWellKnownError` (mêmes lignes 51-64) : pour `NEXT_REDIRECT` / `DYNAMIC_SERVER_USAGE` /
  bailout-CSR / prerender-interrupted, la fonction renvoie `error.digest` directement SANS passer par
  `create-error-handler`'s boundary d'erreur applicative — ces digests n'atteignent pas `error.tsx`/`global-error.tsx`
  dans le flux normal (ce sont des mécanismes de contrôle de rendu, pas des erreurs affichées à l'utilisateur) ;
  je n'ai pas trouvé de chemin qui les fasse remonter à ces boundaries dans ce code.
- Aucun `dangerouslySetInnerHTML` utilisé (rendu React classique).

## Tests
- `cd frontend && npx vitest run "app/[locale]/error.test.tsx" app/global-error.test.tsx app/global-not-found.test.tsx src/components/shared/StateScreen.test.tsx` → **42 passed / 0 failed**, 0 ligne stderr (vérifié via redirection dédiée).
- `cd frontend && npx tsc --noEmit` → aucune erreur.
- `cd frontend && npx next lint --file <10 fichiers touchés>` → aucun warning/erreur ESLint.
- `cd frontend && rtk proxy npx prettier --check <10 fichiers>` → 1 écart (`global-error.test.tsx`, mise en page d'une ligne) corrigé via `--write`, re-check vert.
- Nouveaux tests ajoutés : `[locale]/error.test.tsx` (avec/sans digest × 500/403, 4 cas) ; `global-error.test.tsx`
  (avec/sans digest, + parité `incidentRef` inliné vs `crash.incidentRef` des 4 `errors.json`, 6 cas).
- Aucun nouveau `data-testid` non couvert par une spec E2E : les testids ajoutés (`error-incident-ref[-value]`,
  `global-error-incident-ref[-value]`) ne sont interrogés que par les tests Vitest ci-dessus (requête par texte/rôle
  ailleurs), conformément à la consigne « ne pas déclencher de faux signal coverage-e2e ».
- Pas d'E2E, pas de `next build`/`next dev`/`next start` joués par moi (laissé au lead, cf. briefing).

## Fichiers de contexte lus
- `frontend/app/[locale]/error.tsx` — lu intégralement, branches 500/403 (`error.tsx:31-78` avant modif).
- `frontend/app/global-error.tsx` — lu intégralement, doc `#413` sur l'absence de provider next-intl (`:20-51`).
- `frontend/src/lib/state-errors.ts` — lu intégralement (`isForbiddenError`, `FORBIDDEN_PATTERN` `:20`).
- `frontend/src/components/shared/StateScreen.tsx` — lu intégralement (props `eyebrow`/`aside` de #627, `:31-49`).
- `frontend/app/[locale]/error.test.tsx`, `frontend/app/global-error.test.tsx`, `frontend/app/global-not-found.test.tsx` — lus intégralement, approche parité JSON réutilisée (`global-not-found.test.tsx:112-130`).
- `frontend/public/locales/{fr,en,es,de}/errors.json` — lus intégralement, sections `forbidden`/`crash`.
- `docs/memory/sprints/sprint-110/maquette-etats-systeme.md` — NON LU en entier : la section pertinente (rangée
  d'actions, `<span>` réf. mono 11px après bouton primaire) est déjà résumée verbatim dans le briefing (§ Spécification
  visuelle) — ancrage : `réf. {{ ref }}` en mono 11 px, valeur `MT-2026-1234` FACTICE citée dans le briefing.
- `frontend/src/styles/ds/tokens/typography.css` — lu (`--text-2xs: 13px` ligne 12, pas de token 11px).
- `frontend/src/components/landing/HowItWorksSection.tsx:42` — lu (commentaire « surtitre 11 px → text-2xs (13) »),
  justifie le choix de `text-2xs` plutôt qu'un px hardcodé.
- `frontend/src/styles/ds/components/i18n.css:187-210` (`.mt-num`) — lu, confirme portée générique (pas limitée à
  `time.mt-num`, cf. commentaire #516 `:197-209`).
- `node_modules/next/dist/server/app-render/create-error-handler.js`, `.../lib/error-telemetry-utils.js`,
  `.../compiled/string-hash/index.js` — lus intégralement (preuve sécurité, cf. section dédiée), version 15.5.25.

## Signaux mémoire
[MEMORY:pattern] Problem: composant de référence d'incident (`error.digest`) à afficher identiquement sur 2 écrans
qui ne partagent ni provider i18n ni structure JSX. Solution: extraire un composant pur partagé
(`IncidentReference`, `StateScreen.tsx`) prenant `digest`/`label` déjà résolus — garantit l'identité de traitement
par construction plutôt que par copier-coller synchronisé à la main. Anti-pattern: dupliquer le JSX du span dans
les deux fichiers (dérive silencieuse garantie au prochain sprint).

## Recommandations suite
- Pas de RECOMMAND_DB_EXPERT : aucun schéma/migration touché.
- Pas de RECOMMAND_SECURITY : preuve digest = hash non réversible + code d'erreur interne uniquement, consignée ci-dessus ; pas de nouvelle surface.
- Pas de RECOMMAND_TEST_RUNNER : suite ciblée (42 tests) suffisante pour XS, jouée en direct.
- Pas de RECOMMAND_UI_DESIGN : rendu suit les tokens DS existants (`text-2xs`, `text-ink-muted`, `.mt-num`), aucune valeur hex/px inventée.

STATUS: COMPLETED
