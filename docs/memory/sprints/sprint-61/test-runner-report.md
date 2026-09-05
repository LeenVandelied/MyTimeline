# Rapport test-runner — Sprint 61 (Phase 6)

> Artefact du spécialiste `test-runner` spawné par le lead, en réponse aux `RECOMMAND_TEST_RUNNER`
> émis par les done.md de **#307** et **#230** (les 5 specs E2E du sprint n'avaient jamais été
> exécutées — seule leur compilation TypeScript était prouvée).

## 1. Passe déléguée à l'agent `test-runner` — verdict `PARTIAL`

| Suite | Résultat | Exit |
|---|---|---|
| Vitest frontend | 920 / 920 | 0 |
| `tsc --noEmit` | 0 erreur | 0 |
| `eslint` | 0 issue | 0 |
| `next build` | OK | 0 |
| **E2E** | **0 / 5 — NOT_RUN** | — |

**Cause du blocage E2E** : `auth.setup.ts` échouait sur un 500 de `/fr/register`. Turbopack (forcé
par le script `npm run dev`) inférait un **mauvais workspace root** — il pointait sur un AUTRE
worktree (`new-feature-2347-14cb9a`) parce que plusieurs lockfiles coexistent dans les worktrees
voisins. Erreur remontée : `ENOENT app-build-manifest.json`. Conséquence : **0 spec ne démarrait**.

L'agent a conclu que le correctif exigeait soit un `turbopack.root` explicite dans la config (donc
une modification du dépôt), soit la suppression de lockfiles (destructif), et s'est arrêté là.

## 2. Reprise par le lead — E2E réellement exécutées

Le blocage se contournait **sans toucher au dépôt** :

- **Backend** : réutilisation du conteneur déjà debout `mytimeline-e2e-backend-e2e-1` sur **`:8086`**
  (`SPRING_PROFILES_ACTIVE=dev,e2e`, CORS incluant `:3100`, `RATE_LIMIT_ENABLED=false`, base
  `eventmanager_e2e`). Profil `e2e` confirmé par le diagnostic du runbook S47 : `404` sur
  `/api/test-support/password-reset-token` (un `401` aurait signifié le contraire).
- **Frontend** : `rtk proxy npx next dev -p 3100` — webpack au lieu de turbopack, donc pas
  d'inférence de root. Le préfixe `rtk proxy` est nécessaire : le wrapper perturbe le serveur **et**
  avale ses logs, y compris à travers une redirection vers fichier.
- Readiness vérifiée sur `GET :3100/api/auth/me` → **401** (prouve que le proxy `/api` atteint bien
  le backend, pas seulement que Next répond).

## 3. Ce que la première exécution réelle a révélé

Les specs **ne passaient pas**. Deux défauts, tous deux **côté test** :

1. **`sprint-61-archived-events.spec.ts`** — le clic ciblait l'`<input>` du `Switch`, rendu
   inactionnable par `core.css:146` (`position:absolute; opacity:0; width:0; height:0`).
   La convention correcte — cliquer le `<label>` parent — était **déjà établie et documentée** dans
   `sprint-42-events.spec.ts:246-250` ; la spec neuve ne l'avait pas suivie.
2. **`sprint-42-events.spec.ts:251`** — **vraie régression de comportement**, voulue : #230 fait que
   cocher le toggle n'applique plus l'état directement mais ouvre la confirmation ; la case reste
   décochée jusqu'à validation. La spec assertait l'ancien flux. Mise à jour pour passer par le
   dialog, et son commentaire « pas de vue archivés » rafraîchi (périmé depuis #307).

Corrigé en **`afdcfb5`**.

## 4. Résultats finaux (après correctifs de spec puis correctifs de review)

| Suite | Résultat | Exit |
|---|---|---|
| Vitest frontend | **937 / 937** | 0 |
| `tsc` · `eslint` · `next build` | 0 · 0 · OK | 0 |
| E2E — specs du sprint + `sprint-42` | **13 / 13** | 0 |
| **E2E — suite complète** | **174 passed / 0 failed / 8 skipped** | 0 |
| Backend | **non rejoué** — zéro fichier `backend/**` au diff | — |

**Aucune régression** hors du parcours produit (`timeline/**` sert aussi le dashboard).

## 5. Leçon

Le check de couverture E2E de la Phase 8 était **VERT avant ces corrections** (« 10 testids ajoutés,
0 sans spec »). Il prouve qu'un testid est *cité* par une spec, jamais qu'elle *passe*. Un sprint
dont les E2E n'ont pas tourné n'a aucune garantie E2E, quelle que soit la couleur de ce check — et
le vert des autres suites (920 Vitest, build OK) rend l'illusion très convaincante.

Corollaire : un `RECOMMAND_TEST_RUNNER` se traite en **exécutant**, pas en constatant. Et quand un
audit délégué conclut « impossible », vérifier soi-même : ici le blocage annoncé se contournait en
une commande.

Détail complet : `docs/memory/audits/sprint-61-test-coverage.md`.
