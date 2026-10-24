# Audit tests — Sprint 110

> Écrit en fin de Phase 6 par le lead (2026-09-24). Aucune ligne bloquante.

## Couverture par issue (aucune BR métier : sprint design system / écrans d'erreur)

| Issue | Description | Cross-system flow | Unit frontend | E2E parcours | E2E métier |
|----|-------------|:---:|:---:|:---:|:---:|
| #627 | 404 « éphéméride » datée, 2 exemplaires | NON | ✅ `ephemeris.test.ts`, `EphemerisLeaf.test.tsx`, `StateScreen.test.tsx`, `not-found.test.tsx`, `global-not-found.test.tsx` | ✅ `sprint-110-not-found-ephemeris.spec.ts` (4) + `document-lang.spec.ts` (404 ×5) | N/A (aucune BR) |
| #628 | Référence d'incident (`error.digest`) sur 500/403 | NON | ✅ `error.test.tsx`, `global-error.test.tsx` (avec/sans digest, parité des messages inlinés) | ⚠ N/A — aucune route ne produit de `digest` (erreurs serveur de prod seulement) ; pas de nouveau `data-testid` | N/A |
| #516 | Portée volontaire de `time.mt-num` | NON | ✅ `i18n-intl-classes.test.ts` (régression armée à la main : `color:red` temporaire → rouge) | N/A (aucun changement de rendu) | N/A |

## Tests créés
- `frontend/src/lib/ephemeris.test.ts` — semaine ISO 8601 (fin/début d'année, DST), 4 locales
- `frontend/src/components/shared/EphemerisLeaf.test.tsx` — rendu neutre avant montage, `renderToString` sans chiffre, `aria-hidden`
- `frontend/e2e/sprint-110-not-found-ephemeris.spec.ts` — statut 404, jour = horloge du navigateur, HTML servi sans date, clair/sombre, locale `de`
- Cas ajoutés : `StateScreen.test.tsx`, `not-found.test.tsx`, `global-not-found.test.tsx`, `error.test.tsx`, `global-error.test.tsx`, `i18n-intl-classes.test.ts`

## Résultats runs (lead, HEAD du sprint)
- `next build` (avec `NEXT_PUBLIC_API_URL=/api`) : OK, `Generating static pages (52/52)`, `/_not-found` statique ; HTML servi de `/fr/nope-xyz` : feuillet `data-ephemeris-ready="false"`, 4 espaces insécables, aucun chiffre.
- Vitest complet : 3 exécutions — **1 échec non identifié** au 1er run (2216/2217, log non conservé), puis **2217/2217** ×2. Instabilité consignée, non requalifiée.
- `tsc --noEmit` 0 erreur · `next lint` 0 · `format:check` OK.
- E2E complet (`next start` :3100, backend :8086, `--ignore-snapshots`, darwin) : **602 passés / 2 rouges / 8 sautés / 1 non exécuté** en 8,2 min.
  - `sprint-77-theme-visual:620` (armement de comparaison visuelle) : rouge attendu hors Linux (références `-chromium-linux`).
  - `settings-profile:166` (`toHaveValue` d'un nom, identité d'un autre worker) : **vert en isolé** (avec la spec du sprint, 12/12) ; le sprint ne touche aucun fichier des réglages ni du profil.
- Rendu contrôlé au navigateur : clair, sombre (`.dark` forcée), 375 px en `de` (pas de défilement horizontal).

## Non vérifié
- Rendu réel de la référence d'incident : impossible à provoquer en local (unit seulement).
- Captures visuelles Linux : laissées à la CI de la PR.

## Conclusion
Prêt pour PR.
