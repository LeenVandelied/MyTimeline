## Sprint 26 — Résilience réseau + pages d'états système

Cohésion 0.71 · 2 issues (transversal frontend, 0 BR métier) · migrations Flyway : aucune.

### Issues livrées
- **#76** — Bus d'état réseau + bannière offline/timeout/erreur serveur
- **#57** — Pages d'états système (404/403/500/vide/loading) clair + sombre

### Changements clés

**#76 — Résilience réseau**
- `NetworkStatusContext` (bus React, `useSyncExternalStore`, SSR-safe) + store observable `networkStatus.ts` pont axios↔React.
- `OfflineBanner` : 4 états (offline / retrying / timeout / server-error), sticky, `role=status` (offline/retrying) vs `role=alert` (timeout/server-error), « Réessayer » sur timeout/5xx uniquement.
- `apiClient` : timeout 15s, **exemption uploads multipart** (`FormData` → pas de timeout, préserve #215), classification `ECONNABORTED`→timeout / `≥500`→server-error, clear sur réponse OK.
- Boutons submit/delete `disabled` hors ligne (avec hint a11y).
- Namespace i18n `network` (fr/en/es/de).

**#57 — Pages d'états**
- `app/[locale]/not-found.tsx` (404 locale-aware), `app/[locale]/error.tsx` (crash boundary `'use client'`, branche 403/500), `app/error.tsx` (filet global racine), `dashboard/loading.tsx`.
- Composants partagés `StateScreen`, `EmptyState`, `LoadingSkeleton` (variants list/cards/timeline).
- Intégrations réelles : `ProductList` (EmptyState), écran de chargement dashboard (LoadingSkeleton). Tokens Graphite, clair + sombre.

### Correctif notable (détecté en review lead)
Régression SSG introduite par #76 puis corrigée (`7ad5f36`) : `OfflineBanner` (`useTranslations`) était monté au **layout racine**, hors `NextIntlClientProvider` → `next build` plantait au prerender (0/26 pages). Provider + bannière déplacés sous `[locale]/layout.tsx`. Build revenu à **26/26 pages**. (La base `origin/dev` build proprement dans le même env — régression confirmée S26, non pré-existante.)

### BR impactées
Aucune (features transversales, hors domaine métier).

### Tests
- Backend : **280/280** (inchangé, sprint 100% frontend).
- Frontend (Vitest/RTL) : **383/383** (base 344 → +39 tests S26).
- `next build` : **exit 0, 26/26 pages statiques**, 0 erreur prerender.
- E2E Playwright : non exécuté en local (binaire absent) → tourne en CI. **Aucun spec ne couvre encore les écrans S26.**

### Reviews (batch)
- **reviewer** : 0 CRITIQUE / 1 MAJEUR / 4 MINEUR. 3 MINEUR corrigés (`6032d97` : token skeleton, timeout `ECONNABORTED`, parité a11y delete). MAJEUR (mismatch locales layout `fr,en` vs middleware `fr,en,es,de`) = **pré-existant** → follow-up.
- **ui-design** : APPROUVÉ AVEC RÉSERVES. RÉSERVE 1 corrigée ; RÉSERVE 2 (strings inline `app/error.tsx` hors provider i18n) = exception justifiée à documenter.

### Suivi post-merge (non bloquant)
- **`/create-e2e`** : 10 nouveaux `data-testid` sans spec E2E (parcours offline réel + pages 404/500).
- Follow-ups à trancher en triage `/sprint end` : alignement locales layout↔middleware (es/de inatteignables), helper locale partagé, filtre `refetchQueries` du retry, documentation exception i18n root error boundary.

### Audit détaillé
`docs/memory/audits/sprint-26-test-coverage.md`

🤖 Generated with [Claude Code](https://claude.com/claude-code)
