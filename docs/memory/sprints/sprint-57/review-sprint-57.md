# Review batch — Sprint 57

**Diff :** `origin/dev...HEAD` (4 commits) | **Reviewer :** batch, lecture seule | **Date :** 2026-07-31
**Verdict :** `MERGEABLE` — 0 CRITIQUE, 0 MAJEUR, 4 MINEURS

## Constats

| Sév. | Emplacement | Constat | Suite |
|---|---|---|---|
| MINEUR | `AuthController.java:202` | Cookie `jwt=` **vide** → `extractUsername("")` lève `IllegalArgumentException`, **hors** hiérarchie `JwtException` (`JwtService.java:176`, pas de garde blank) → retombe en `catch (Exception)` = **500** + stacktrace. Identique sur `/refresh:334` → **pas de nouveau side-channel entre les deux endpoints**, l'alignement visé par #312 est atteint ; mais le 500 distingue toujours « token vide » de « token invalide ». | follow-up |
| MINEUR | `auth-guard-paths.ts:147` | **Le garde-fou #318 ne normalise pas la casse.** Un dossier `(app)/Billing/` déclaré verbatim dans `PROTECTED_APP_SEGMENTS` rend le test **vert**, alors qu'`isProtectedPathname` compare `segment.toLowerCase()` à une liste non normalisée → `/fr/Billing` (routé par Next, sensible à la casse) **non protégé**, sans que le garde-fou bronche. | **corrigé dans le sprint** |
| MINEUR | `auth-guard-paths.test.ts:482` | Le garde-fou ne scanne que `(app)/` : une route connectée créée hors du groupe reste invisible **et** `expect(extraSegments).toEqual([])` reste vert. Limite documentée (`auth-guard-paths.ts:60-69`) mais non couverte. | follow-up (déjà signalé par #318) |
| MINEUR | `(app)/settings/page.tsx:161` | `<main data-testid="settings-page">` imbriqué dans le `<main data-testid="shell-main">` d'`AppShell.tsx:245` → **2 landmarks `main`**. Pré-existant (dashboard et products font pareil), settings s'y ajoute. | follow-up |

## Vérifié et conforme

- **#312 — ordre des `catch`** : `JwtException` placée **après** `ExpiredJwtException` /
  `MalformedJwtException` → compile, les deux catchs spécifiques restent atteignables, comportement
  inchangé.
- **#312 — parité `/refresh`** : corps **strictement identique** (`401` +
  `Map.of("error", ErrorCode.UNAUTHORIZED.getCode())`), aucun libellé distinctif.
  `SignatureException` (⊂ `security.SecurityException` ⊂ `JwtException`) désormais captée.
- **#299 — garde d'auth (point le plus risqué du sprint)** : `AppShell.tsx:85` appelle
  `useAuthGuard()` et `AppShell.tsx:119-133` fait un **`return` précoce** (spinner
  `app-shell-loading`) tant que `loading || !user`, **avant** le rendu de `{children}`
  (`AppShell.tsx:245`). `children` n'est jamais monté pour un anonyme → **aucune fenêtre de rendu**
  du contenu Réglages. La suppression de la garde locale ne rouvre rien ; le middleware (307) coupe
  déjà en amont.
- **#299/#318 — garde serveur** : `middleware.ts:114` consomme `isProtectedPathname` →
  `PROTECTED_SEGMENTS` = `PROTECTED_APP_SEGMENTS` (contient `settings`) ∪ `[]`. `/fr/settings` et
  `/en/settings` ancrés par test explicite ; URL inchangée malgré le déplacement de fichier.
- **#299 — a11y tablist** : `role=tablist` + `aria-orientation=horizontal`, `role=tab` /
  `aria-selected` / `aria-controls=settings-panel-<id>` ↔ `id` / `aria-labelledby` cohérents ;
  roving `tabIndex` + `focus()` sur l'id cible ; ←/→ primaires, ↑/↓ alias
  (`settings-navigation.spec.ts:51` reste vert) ; `overflow-x-auto` sans `flex-wrap` préserve
  l'ordre visuel.
- **#398 — propagation du testid** : `select.tsx:131-138`, `SelectItem` fait `{...props}` sur
  `SelectPrimitive.Item`, qui rend l'élément `[role=option]` du portail → le testid atterrit bien
  dessus. *(Lecture de code, pas exécution.)*
- **#318 — anti-faux-vert** : logique pure éprouvée sur entrées fabriquées dans les deux sens,
  `(groupe)` / `[param]` en `unsupported` (refus de conclure), `_x/` + `@slot/` ignorés à raison,
  chemin résolu via `import.meta.url`, profondeur 2 vérifiée et non supposée. Vitest ciblé : 49/49.
- **Hexagonal** : modification backend confinée à `infrastructure/adapters/controllers`,
  `domain/` intact.
- **TS strict** : zéro `any`, zéro `as` non justifié.
- **E2E (statique)** : aucune spec n'assertait `settings-back` ni `settings-loading` ;
  `settings-page` conservé ; plus aucun sélecteur par libellé i18n dans `settings-preferences.spec.ts`.

## Non vérifié (déclaré par le reviewer)

- Compilation et suite JUnit backend **non exécutées** (`mvn` non lancé) → couvert par l'audit Phase 6.
- E2E **non exécutés** → la propagation du `data-testid` Radix est établie par lecture de
  `select.tsx`, pas à l'exécution → couvert par l'audit Phase 6.
- Rendu visuel des onglets horizontaux non observé au navigateur → couvert par la vérification
  navigateur de #299 (4 paliers × clair/sombre, observés).
- Contraste `text-accent` / `bg-accent-soft` non re-mesuré (pré-existant, hors périmètre) →
  mesuré par #299 : **3.83:1**, sous AA.

## Bruit écarté d'avance (non compté comme constat)

Rename `settings/page.tsx` attribué au commit `1651f9a` de #312 (working tree partagé) ;
`npm run lint` rouge en local sur `next-env.d.ts` ; bug i18n `DensityRibbon`.
