# Issue #516 — sélecteur time.mt-num n'atteint pas les span.mt-num

## Résumé
Décision : **(b)** — documenter que la neutralisation est volontairement limitée à `time`, adapter le test pour qu'il ne prétende plus couvrir les `<span>`.

Les 4 constats du lead vérifiés avant d'agir :
1. Confirmé — `frontend/src/styles/globals.css:16-31` importe `i18n.css` (et les autres fichiers DS) en `@import` nu, aucun n'est enveloppé dans un `@layer`. Hors layer bat toujours `@layer utilities`.
2. Confirmé — élargir `color:inherit` à `.mt-num` nu écraserait `text-ink-muted`/`text-ink`/`text-accent` posés sur les mêmes éléments (`StateScreen.tsx:82`, `KpiMarginalia.tsx:39/82/83`, `ProductList.tsx:115`, `ProductCarousel.tsx:129`, `ProductsListView.tsx:451`).
3. Confirmé — `i18n-intl-classes.test.ts:106-121` (avant modif) pose déjà l'invariant « `.mt-num` ne pose pas de couleur » ; l'option (a) l'aurait contredit.
4. Confirmé, avec correction du motif honnête — aucun `<a class="mt-num">` ni `<time>` imbriqué dans un `<a>` dans tout le dépôt (`/usr/bin/grep -rn "mt-num" frontend/src frontend/app` + `/usr/bin/grep -rn "<time" frontend/src frontend/app`, tous les usages listés). Mais le commentaire original (« time[] hérite des couleurs ; on neutralise l'éventuel style natif ») était **inexact** : `<time>` n'a en réalité AUCUN style natif de couleur/soulignement (contrairement à `<a>`). La règle est réellement défensive contre un cas hypothétique futur (un `<time class="mt-num">` placé dans un lien), pas une neutralisation d'un style natif existant sur `<time>` lui-même.

Fichiers modifiés :
- `frontend/src/styles/ds/components/i18n.css` — commentaire au-dessus de `time.mt-date--short, time.mt-date--long, time.mt-num{...}` réécrit : pourquoi la portée reste `time`-préfixée, pourquoi `<time>` n'a pas de style natif à neutraliser (motif honnête), pourquoi élargir à `.mt-num` nu serait une régression de couleur immédiate (hors layer). La règle CSS elle-même n'a **pas changé**.
- `frontend/src/styles/__tests__/i18n-intl-classes.test.ts` — nouveau test `#516 — color/text-decoration ne sont neutralisés QUE sur time.mt-num (jamais .mt-num nu ni span.mt-num)` : parcourt l'AST compilé, vérifie qu'aucun sélecteur `span.mt-num`/`p.mt-num`/`div.mt-num`/`a.mt-num` n'existe, que `.mt-num` nu ne déclare ni `color` ni `text-decoration`, et que `time.mt-num` déclare bien les deux. Commentaire ajouté sur le test existant (`props.get('color')`) précisant qu'il ne prouve PAS la neutralité du `.mt-num` nu (propsOf fusionne `time.mt-num`), et pointeur vers le nouveau test.
- `frontend/src/styles/ds/readme.md` / `a11y-audit.md` — **non touchés** : `/usr/bin/grep` confirme qu'aucun des deux ne mentionne `mt-num`/`time`/`text-decoration`, rien à corriger.

Régression vérifiée : ajout temporaire de `color:red` sur `.mt-num` nu → le nouveau test échoue bien (`bareDecls.has('color')` passe à `true`) ; revert confirmé par `git diff --stat` (aucun résidu).

## Tests
- `cd frontend && npx vitest run src/styles/__tests__/i18n-intl-classes.test.ts src/components/dashboard/KpiMarginalia.intl.test.tsx src/components/dashboard/intl-formats.test.tsx` → **43/43 passés** (6 dans i18n-intl-classes.test.ts, dont le nouveau test #516).
- `cd frontend && npx tsc --noEmit` → **0 erreur** (piège connu du fichier : `walkDecls` en corps-expression casse `tsc` — corrigé en corps-bloc dès l'écriture, comme documenté en commentaire dans le fichier lui-même).
- `cd frontend && rtk proxy npx prettier --check src/styles/ds/components/i18n.css src/styles/__tests__/i18n-intl-classes.test.ts` → reformaté une fois (`--write`) puis **conforme**.
- `./scripts/test-quiet.sh frontend-unit` → **2190/2191 passés**, 1 échec dans `app/[locale]/not-found.test.tsx` (`state-screen-code` testid) : touche StateScreen/404, hors périmètre (#627 en cours en parallèle) — signalé, non corrigé.
- Pas de Playwright, pas de `next dev`/`next build` (hors périmètre de cette issue).

## Fichiers de contexte lus
- `frontend/src/styles/ds/components/i18n.css` (lu en entier, section 7 + ligne 197-198 avant/après édit)
- `frontend/src/styles/globals.css` (lignes 1-40, imports/@layer)
- `frontend/src/styles/__tests__/i18n-intl-classes.test.ts` (lu en entier avant et après édit)
- `frontend/src/styles/ds/readme.md`, `frontend/src/styles/ds/a11y-audit.md` — grep seulement (0 hit `mt-num`), NON LUS en entier (inutile, hors périmètre confirmé par le grep)
- `.ai-env/context-packs/pit-frontend.md` — extrait inline fourni dans le briefing (PIT-S53-001/002/005), NON LU au-delà de l'extrait

## Signaux mémoire
Aucun. Le bug/pitfall/décision est déjà entièrement capturé par ce commit et son message ; pas de nouveau pattern transverse à consolider.

## Recommandations suite
- Pas de RECOMMAND_DB_EXPERT : aucun schéma/migration concerné, tâche CSS/DS pure.
- Pas de RECOMMAND_SECURITY : aucune surface auth/donnée personnelle/API externe touchée.
- Pas de RECOMMAND_TEST_RUNNER : suite ciblée + `test-quiet.sh frontend-unit` déjà exécutés en direct, taille XS.
- Pas de RECOMMAND_UI_DESIGN : aucun changement de rendu (règle CSS inchangée, seul le commentaire et le test évoluent).

STATUS: COMPLETED
