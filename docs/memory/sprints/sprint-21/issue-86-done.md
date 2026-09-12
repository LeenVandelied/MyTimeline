# Issue #86 — Frontend Réglages desktop (4 chapitres)

**Vague :** 1 (frontend, parallèle avec #75)
**Commit :** 43d9e14 `:sparkles: #86 Réglages desktop 4 chapitres (Profil / Sécurité / Préférences / Compte)`
**Statut vérifié :** commit sur `sprint/21` (worktree), 39 fichiers, uniquement frontend. Travail complet et committé sur la bonne branche.

## Résumé
Page `/settings` desktop, 4 chapitres (Profil/Sécurité/Préférences/Compte). BR-AUT-001 respectée (suppression compte = re-saisie username, identité dérivée du JWT côté backend).

Fichiers clés (worktree) :
- `frontend/app/[locale]/settings/page.tsx` (garde auth + shell)
- `frontend/src/components/settings/` : `SettingsShell` (tablist vertical a11y), `ProfileSection`, `SecuritySection`, `PreferencesSection`, `AccountSection`, `AvatarUpload` (crop canvas, zéro dépendance), `PasswordStrength`, `SessionList`
- `frontend/src/hooks/` : `useSettings`, `useSessionManager`, `useDensity` (logique séparée présentation → réutilisable mobile #87)
- `frontend/src/services/` : `userService.ts`, `sessionService.ts`
- `frontend/src/lib/schemas/settings.ts`, `frontend/src/types/settings.ts`, `query-keys.ts` (+`sessions`)
- `frontend/src/styles/globals.css` (`data-density`), `dashboard/page.tsx` (lien Réglages)
- i18n : `public/locales/{fr,en,es,de}/settings.json` + `common.buttons.settings` + `validation.password.same`

## Endpoints backend
- **Confirmés existants** : `PATCH /api/me`, `POST /api/me/change-password`, `GET /api/sessions`, `DELETE /api/sessions/{id}` et `/others`, `DELETE /api/me`.
- **Manquants stubés** (service rejette + `// TODO backend`) : `POST/DELETE /api/me/avatar` (#75 — livré ce sprint, à brancher), `GET /api/me/export`. UI non bloquée → toast « à venir ».

## Tests
Vitest 31 (7 fichiers : sections + hook sessions + navigation shell). Suite complète 249 passés, 0 régression. 1 spec Playwright `e2e/settings-navigation.spec.ts` amorcée (nécessite backend CI). tsc propre.

## [MEMORY:*]
- **[MEMORY:pitfall]** Subagent lancé depuis worktree `.claude/worktrees/*` (branche `sprint/21`) : Bash sans chemin worktree explicite défaut-cwd sur repo PRINCIPAL (`~/VSProjects/MyTimeline`, `dev`). Tous les Write ciblaient le repo principal → mauvaise branche ; recopié + committé dans le worktree. Prévention : `git rev-parse --show-toplevel` AVANT tout Write/commit, chemin absolu worktree pour toutes les écritures. → réf [[sprint-subagent-worktree-cwd]].
- **[MEMORY:pattern]** Factories Zod i18n `create*Schema(t)` : `t` DOIT être le traducteur RACINE `useTranslations()` (clés préfixées `validation.*`, `settings.*`), jamais scopé `useTranslations('validation')` (sinon double préfixe `validation.validation.*`). Aligné convention `schemas/auth.ts`.

## Recommandations suite
- RECOMMAND_FOLLOWUP : brancher `POST/DELETE /api/me/avatar` (#75, contrat `avatarUrl`) et `GET /api/me/export` dans `userService.ts` (TODO en place) — le #75 est livré, l'avatar peut être branché dès #87 ou en follow-up.
- RECOMMAND_SECURITY : chapitre Sécurité (mot de passe + révocation sessions) → audit sécurité recommandé (déjà : aucun secret loggé, erreurs mappées inline, pas de PII en storage sauf densité non-PII).
- Lint non exécutable dans l'env (`eslint-plugin-storybook` absent) — préexistant, hors scope.

## Note orchestration
Résidus #86 sur repo principal `dev` (15 fichiers untracked, doublons du commit worktree) — nettoyage scopé en attente de confirmation dev.

STATUS: COMPLETED
