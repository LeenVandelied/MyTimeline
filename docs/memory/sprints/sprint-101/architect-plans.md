# Mini-plans — Sprint 101

> Rédigés par le LEAD au démarrage (2026-09-21) : aucun `/sprint plan` pour ce sprint. Énoncés
> contre-vérifiés dans le code avant spawn.

**Périmètre arbitré par le dev (2026-09-21) :** les 5 issues du milestone Sprint 101 (#102) —
#733 et #735 (étiquetées) + #754, #757, #758 (étiquette `sprint-101` posée par le lead au démarrage).
Deux thèmes : auth frontend (#733, #735) et contrôles mobiles/dialogues (#754, #757, #758).
Cohésion ≈ 0.40 (2 packs disjoints, chacun cohérent en interne) — assumée par le dev.

**Arbitrage dev #733 (2026-09-21) :** sur un 403, toast « Accès refusé » **sans redirection** ;
la clé `auth.forbiddenRedirect` est renommée et les 4 locales corrigées.

**Vagues :**
- V1 = agent A (#733 puis #735, Vitest seul, 2 commits) ∥ ui-design (arbitrage #754 + #757) puis
  agent B (#754 puis #757, **Playwright exclusif**, 2 commits — même fichier `ui/dialog.tsx`).
- V2 = agent C (#758, Playwright, après libération par B).
**Migrations Flyway :** aucune.

**Contre-vérification des énoncés (lead) :**
- #733 : `apiClient.ts:218-240`, branche 403 = toast `API_ERROR_KEYS.forbidden` + `window.location.href`
  vers `/{locale}/login` après 1,5 s, partage le verrou `isRedirecting` avec le 401. Backend : un 403
  n'est émis que par `SecurityConfig.accessDeniedHandler` (`hasAuthority("ROLE_USER")`,
  `AccessDeniedException` d'ownership dans `EventController`) et `ProductController` (ownership) ;
  CSRF désactivé → un 403 n'est JAMAIS une session morte. Clé citée par `apiErrorMessages.ts:42,56`
  (repli FR en dur) et `ApiErrorTranslatorBridge.intl.test.tsx:45,58`. Commentaire à mettre à jour
  dans `e2e/sprint-95-toast-overlap.spec.ts:97` (« 401 et 403 redirigent » devient faux).
  Groupe `errors.forbidden` (title/description/backHome) utilisé par `app/[locale]/error.tsx` : NE PAS
  le toucher (écran, pas toast).
- #735 : `lib/schemas/auth.ts:52-53` `/[A-Z]/`, `/[0-9]/` confirmé ; bloc `describe('divergence
  ASCII/Unicode…')` à `password-policy.test.ts:145` ; JSDoc ⚠ `PasswordStrength.tsx:27`.
- #754 : la croix de `DialogContent` (`ui/dialog.tsx:73`) est une icône 16×16 **sans padding** →
  cible tactile ~16 px dans TOUS les dialogues/bottom sheets : c'est un candidat que l'énoncé ne
  liste pas, et c'est le même élément que #757 → même agent, #754 d'abord. 14 `size="sm"` dans
  dashboard/products/timeline.
- #757 : ancre `sticky top-0 z-10 order-first -mb-4 h-0` (`dialog.tsx:72`), croix `opacity-70`
  sans fond. Oracles : croix à `sheet.y + 16` à `scrollTop` 0.
- #758 : `dashboard/page.tsx:191` `flex flex-1 overflow-hidden` + `:198` grille `overflow-y-auto`.
  Le padding de réserve est sur `shell-main` (`AppShell.tsx:373`, `max-md:pb-…`) → il est HORS du
  conteneur défilant interne : recouvrement probable à 740×390 (740 < 768 → FAB présent). À MESURER.

```yaml
issue_733:
  fichiers_cles:
    - "frontend/src/services/apiClient.ts"
    - "frontend/src/services/apiErrorMessages.ts"
    - "frontend/public/locales/{de,en,es,fr}/errors.json"
    - "frontend/src/services/apiClient.test.ts, ApiErrorTranslatorBridge.intl.test.tsx, apiErrorMessages.test.ts"
  couches_touchees: ["frontend"]
  strategie_test: "unit (Vitest apiClient : 403 → toast forbidden, AUCUN setHref, verrou isRedirecting non pris)"
  risque_regression: "401 doit toujours rediriger ; test i18n des namespaces (clés identiques dans les 4 locales)"
  ordre_ecriture: "test rouge → clé renommée (4 locales + repli FR) → branche 403 sans redirection + commentaire justificatif"
  zod_dto_sync: "NON"
  possibly_done: false
  etat_reel_du_code: "(aucune evidence) — redirection 403 présente, libellé faux dans les 4 locales"
issue_735:
  fichiers_cles:
    - "frontend/src/lib/schemas/auth.ts"
    - "frontend/src/lib/schemas/password-policy.test.ts"
    - "frontend/src/components/settings/PasswordStrength.tsx"
  couches_touchees: ["frontend"]
  strategie_test: "unit (Vitest) : bloc divergence SUPPRIMÉ, test positif Ωabcdefg١ sur les 3 schémas + meetsPolicy"
  risque_regression: "invariant #508 (refusé serveur ⇒ jamais strong/medium) ; drapeau `u` requis pour \\p{…}"
  ordre_ecriture: "tests positifs rouges → regex \\p{Lu}/u, \\p{Nd}/u → suppression bloc + JSDoc ⚠"
  zod_dto_sync: "NON"
  possibly_done: false
  etat_reel_du_code: "(aucune evidence) — regex ASCII confirmées"
issue_754:
  fichiers_cles:
    - "frontend/src/components/ui/dialog.tsx (croix)"
    - "frontend/src/components/products/ProductDrawer.tsx, categories/CategoryDrawer.tsx, NewEventDrawer, DeleteConfirmDialog (pieds)"
    - "frontend/e2e/sprint-101-touch-targets.spec.ts (nouveau, motif PAT-S99-001)"
  couches_touchees: ["frontend"]
  strategie_test: "E2E mesure à 375 px (rouge d'abord) + Vitest consommateurs"
  risque_regression: "sprint-95-toast-overlap (géométrie des sheets, croix à +16), sprint-100-dialog-close-reachable, sprint-99-touch-targets, desktop inchangé (≥ 768)"
  ordre_ecriture: "arbitrage ui-design → spec de mesure rouge → correctifs max-md: → A/B specs qui citent"
  zod_dto_sync: "NON"
  possibly_done: false
  etat_reel_du_code: "(aucune evidence) — pieds en taille par défaut (36 px), croix 16 px"
issue_757:
  fichiers_cles:
    - "frontend/src/components/ui/dialog.tsx"
  couches_touchees: ["frontend"]
  strategie_test: "E2E contraste de la croix sur contenu défilé, thèmes clair ET sombre ; géométrie à défilement nul inchangée"
  risque_regression: "mêmes oracles que #754 ; les 8 consommateurs de DialogContent"
  ordre_ecriture: "après #754 (croix déjà agrandie) → fond/bande selon arbitrage → mesure"
  zod_dto_sync: "NON"
  possibly_done: false
  etat_reel_du_code: "(aucune evidence)"
issue_758:
  fichiers_cles:
    - "frontend/app/[locale]/(app)/dashboard/page.tsx"
    - "frontend/src/components/layout/AppShell.tsx"
    - "frontend/e2e/sprint-100-fab-clearance.spec.ts (étendre)"
  couches_touchees: ["frontend"]
  strategie_test: "E2E mesure à 740×390 (sonde + témoin, PAT-S100-001) ; correctif seulement si recouvrement mesuré"
  risque_regression: "dashboard.page.test (profils), specs qui citent dashboard-landscape / shell-main"
  ordre_ecriture: "mesure → (si rouge) réserve dans le conteneur défilant interne → même mesure verte"
  zod_dto_sync: "NON"
  possibly_done: false
  etat_reel_du_code: "(aucune evidence) — réserve hors du conteneur défilant interne, recouvrement probable"
```
