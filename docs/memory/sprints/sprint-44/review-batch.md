# Revue batch — Sprint 44

## Reviewer (diff origin/dev..HEAD, frontend-only)
**VERDICT : PRÊT MERGE — 0 CRITIQUE, 0 MAJEUR, 2 MINEURS.**

### [OK] — points de vigilance vérifiés sans finding
- **Non-régression `EventEditForm`** (risque n°1 du sprint) : `mode` défaut `'edit'` ; AUCUN call site existant
  (`EventContent`, `TimelineEditHost`, `EventDrawer`, `ConflictDialog`) ne passe le prop → comportement inchangé (grep).
- **Invalidation TanStack** : préfixe `queryKeys.products.all` (`['products']`) couvre bien
  `products.withEvents(userId)` (`['products',{userId,withEvents:true}]`) → l'event créé remonte dans la frise (AC #300).
- **Payload create ↔ `EventCreationRequest.java`** vérifié champ à champ : name/date/durationValue/durationUnit/
  productId présents ; `archived`/`endDate`/`recurrenceEndDate` absents (BR-EVE-013/014) ; neutres `0/days` sur `single`.
- **DS tokens** : `.mt-drawer` 420px INTACT, `.mt-drawer--form` via `--drawer-width-form`, aucun `w-[Npx]`,
  classes `.mt-sheet*`/`.mt-drawer__close--touch` existantes réutilisées.
- **`useDashboardData` (#301)** : zéro duplication flatMap ; `resources` keyé `product.id` → pas de collision de lane.
- **a11y** : `useFocusTrap(onEscape)` + `AppShell.closeCreate` en `useCallback([])` → pas de vol de focus
  (BUG-S44-001 évité). Cibles 44×44 confirmées CSS.
- **i18n** : parité `shell.createDrawer.*` / `shell.timeline.*` sur fr/en/es/de ; aucune clé orpheline
  (`createDialog`/`comingSoon`) référencée en prod.
- **TS strict** : zéro `any` ; seul `as const` justifié.

### Résolution des 2 MINEURS (lead — vérifiés à la source avant action)
> ⚠ Le reviewer a cité des lignes inexistantes (1127/1146 pour un fichier de 232 lignes) — **les défauts
> eux-mêmes sont réels**, lignes réelles 146 et 165. Numéros de ligne du reviewer non fiables, contenu fiable.

1. **[MINEUR] Double annonce lecteur d'écran** (`NewEventDrawer.tsx:165`) — **CORRIGÉ (`96c9854`)**.
   `<Spinner label={...} />` rend un `<span class="sr-only">` sous `role="status"` ; accompagné d'un `<span>`
   visible portant le MÊME texte → annonce en double. Fix : `aria-hidden="true"` sur le spinner décoratif,
   **convention déjà établie dans le repo** (`ExportDataFlow.tsx:144`, cas identique). Cohérent avec
   [[PAT-S41-002]] (le rendu visible unique du libellé prime ; la copie décorative est masquée).
   Vérifié : 17 tests NewEventDrawer verts, tsc OK, eslint OK.

2. **[MINEUR] `mt-drawer__subtitle` non conditionné en mode sheet** (`NewEventDrawer.tsx:146`) —
   **ACCEPTÉ + DOCUMENTÉ, pas de correction.** Le composant bascule bien toutes ses autres classes
   (`__overlay`/`__header`/`__title`) entre `.mt-sheet` et `.mt-drawer`, mais `__subtitle` reste inconditionnel.
   **Vérification lead : sans effet visuel.** `.mt-drawer__subtitle` (timeline.css:174) est une classe AUTONOME
   (font-family/size/letter-spacing/color) **non scopée à un parent** → elle rend identiquement dans `.mt-sheet`.
   `.mt-sheet__subtitle` n'existe pas ; en créer une par pureté de nommage = duplication CSS sans gain.
   Incohérence de nommage assumée.

## Spécialistes NON spawnés (justifié)
- **db-expert** : aucune migration, aucun `.sql`, sprint frontend-only.
- **security-expert** : aucune surface auth nouvelle (garde `useAuthGuard` inchangée ; la garde serveur est
  #302, hors sprint). Le chemin create réutilise `POST /api/events` (ownership productId déjà couvert BR-EVE-008).
- **test-runner** : suite complète déjà exécutée par le lead (496/496 + tsc + eslint) ; le re-spawner sur un
  périmètre frontend-only n'apporterait rien (backend intouché → CI le couvre).

STATUS: COMPLETED
