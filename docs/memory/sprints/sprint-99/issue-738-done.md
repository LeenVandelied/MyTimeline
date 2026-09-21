# #738 — Cibles tactiles 44 px des réglages mobiles (Sprint 99, vague 2)

## Résumé

DEC-S99-001 appliquée telle quelle.
- Primitives : `Input` et `SelectTrigger` reçoivent `max-md:h-11`, `SelectItem` reçoit `max-md:min-h-11`. On a pris `min-h` et pas le `max-md:py-3` proposé : à 375 px l'option mesurait 36,28 px avant correction (et non 32). Avec `min-h`, le seuil ne dépend plus des métriques de police.
- `ui/button.tsx` n'est PAS modifié. Les 17 `<Button>` des écrans de réglages reçoivent `SETTINGS_TOUCH_BUTTON` (`max-md:h-11`). Le bouton `avatar-delete` (`size="icon"`) reçoit `SETTINGS_TOUCH_ICON_BUTTON` (`max-md:h-11 max-md:w-11`). Les deux constantes sont dans le nouveau `settings/touchTarget.ts`, qui documente la raison de ce choix. `settings/page.tsx` était déjà en `h-11 w-11` : rien à changer.
- Contrôle natif corrigé : le curseur `avatar-zoom` (`input type=range`) mesurait 16 px et reçoit `max-md:h-11`.
- Contrôles natifs mesurés sans correction : `settings-index-*` (56 px), `mobile-settings-back` (44), `delete-account-sheet-close` (44) et `avatar-dropzone` (150).
- Hors mobile : `SettingsShell` (onglets, rendu seulement au desktop), non concerné.

Commits : `8dc84e0d` (correctif), `4d9d7e81` (spec E2E), `fb54ec2a` (oracle TALL de `sprint-95-toast-overlap` + JSDoc `toaster.tsx`, après arbitrage).

## Fichiers
- frontend/src/components/ui/input.tsx
- frontend/src/components/ui/select.tsx
- frontend/src/components/settings/touchTarget.ts (nouveau)
- frontend/src/components/settings/{AvatarUpload,SessionList,AccountSection,ExportDataFlow,DeleteAccountSteps,ProfileSection,SecuritySection}.tsx
- frontend/e2e/sprint-99-touch-targets.spec.ts (nouveau)
- frontend/e2e/sprint-95-toast-overlap.spec.ts (régime TALL, en-tête JSDoc) — après arbitrage
- frontend/src/components/ui/toaster.tsx (JSDoc § recouvrements résiduels) — après arbitrage

## Mesures (`getBoundingClientRect`, Chromium darwin, dpr 1)

| Contrôle | 375 avant | 375 après | 1280 après (= avant) |
|---|---|---|---|
| Input (`profile-*`, `password-*`, `delete-account-username`) | 36 | 44 | 36 |
| SelectTrigger (`pref-*`, `export-format`) | 36 | 44 | 36 |
| SelectItem (options ouvertes) | 36,28 | 44 | 36,28 |
| Button default (`profile-submit`, `password-submit`, `export-*`, `delete-account-*`) | 36 | 44 | 36 |
| Button sm (`revoke-session-*`, `revoke-other-sessions`, annuler/appliquer du recadrage) | 32 | 44 | 32 |
| Button icon `avatar-delete` | 36×36 | 44×44 | 36×36 |
| `avatar-zoom` (range) | 16 | 44 | non mesuré |
| `settings-index-*` / `mobile-settings-back` / `settings-back` / ✕ du sheet | 56 / 44 / 44 / 44 | inchangés | — |

## Tests
- Spec `e2e/sprint-99-touch-targets.spec.ts` : 13/13 verts. À 375 px : index, profil (avec un avatar simulé, puis le recadrage), sécurité (2 sessions simulées), préférences avec les 3 menus ouverts, compte. Dans le compte, 5 états de l'export (confirm, sync prêt, async prêt, expiré, erreur), simulés par `page.route`, puis les 2 étapes du sheet de suppression. À 1280 px : 3 tests « desktop inchangé ». Les contrôles sont listés par requête DOM, et chaque étape exige un nombre minimal de contrôles mesurés (garde anti-vacuité).
- CONTRÔLE NÉGATIF, sans `git stash` : `git checkout HEAD~1 -- <9 sources>` sur la spec, puis restauration par `git checkout HEAD -- frontend/src`. Résultat : **4 tests rouges, 9 verts**. Les 4 rouges sont profil, sécurité, préférences et compte, avec 14 étapes fautives. Les tests index et desktop restent verts, ce qui est légitime : l'index était déjà conforme et le desktop n'a pas changé.
- Replay de 41 specs : les 19 de la liste du lead, plus toute spec citant un testid d'un consommateur d'Input ou de Select, trouvée avec `/usr/bin/grep -rlFf`. Résultat : **280 passed, 6 failed, 8 skipped**.
  - `sprint-90-first-contact` ×4 : déjà connu sous `next dev`, sans rapport avec ce sprint.
  - `sprint-77-theme-visual:620` (armement) : la référence `landing-hero-light-chromium-darwin.png` est absente sur macOS. Environnemental, sans lien avec le code.
  - **`sprint-95-toast-overlap:359` (TALL 390×844) : IMPUTABLE à #738.** Comparaison A/B, 2 runs de chaque côté : primitives d'avant → 9/9 verts ; après → 1 rouge. Le contenu du `ProductDrawer` passe de 702 à 726 px (3 contrôles × 8 px). La sheet monte de 141 à 117 px, la croix de 158 à 134 px. Le recouvrement avec la carte du toast (72 à 137 px) passe de 0 à 3,5 px. Les régimes MID et SHORT sont inchangés (16 et 14,4 px), et la sortie de secours (b/c) reste verte. Cette spec encode la décision B de #714 (« NUL sur TALL »). Oracle réécrit après décision du dev : voir § Arbitrage.
- Vitest `src/components/ui src/components/settings` : 157 passés, 0 échec. Aucun test ne vérifie de classe de hauteur, rien à adapter.
- `npx tsc --noEmit -p .` : OK.
- `rtk proxy npx prettier --check` : OK.
- `rtk proxy npx next lint --file …` : 0 erreur. Sous RTK nu, le résumé affichait « Errors: 1 » à tort.

## Arbitrage sprint-95-toast-overlap (décision du dev, 2026-09-21)
- Décision : ACCEPTER le recouvrement à 390×844 et réécrire l'oracle. C'est une extension de la décision B de #714. Cause : #738 / DEC-S99-001 (champs à 44 px en mobile, +24 px de contenu du `ProductDrawer`).
- Nouvel oracle TALL :
  - recouvrement STRICTEMENT dans ]0 ; hauteur de la croix[ ;
  - haut de la croix sous le haut de la carte (72 px + EPSILON, valeur de layout pur) ;
  - contenu < 92vh conservé : 726 < 776, la sheet reste libre ;
  - assertions de bande d'overlay et de sortie de secours inchangées.
- Marge de police : la mesure donne 3,5 px sur darwin. La borne basse ne tolère donc qu'environ 3,5 px de carte plus courte sous Linux. C'est documenté dans la spec, avec la consigne de relire la JSDoc plutôt qu'élargir la borne à 0.
- JSDoc de `toaster.tsx` : trois régimes remesurés après #738.
  - 844 : sheet à 117 px, croix à 134–150, recouvrement 3,5 px.
  - 740 : sheet à 59 px, croix à 76–92, recouvrement total.
  - 667 : sheet clampée à 53 px, croix à 70–86, recouvrement 14 px.
  - Bande MID corrigée : 0–59 px au lieu de 0–67. Cette valeur était déjà périmée avant #738 (mesurée à 59 sur le code d'avant).
- Rejeu après réécriture (oracles 401/200 vérifiés) :
  - `sprint-95-toast-overlap` complet (3 régimes + sortie de secours) ×3 : **9/9, 9/9, 9/9**, recouvrement TALL = 3,5 px à chaque run ;
  - `sprint-99-touch-targets` : **13/13**.
- Contrôle négatif du nouvel oracle : `git checkout 8dc84e0d~1 -- ui/input.tsx ui/select.tsx`, puis restauration par `git checkout HEAD --`. Résultat : **1 rouge / 8 verts**. Le test TALL échoue avec « recouvrement doit être NON NUL » (recouvrement 0,0 px, croix y=158, contenu 702 px).

## Écarts d'énoncé
- SelectItem : `max-md:min-h-11` au lieu de `max-md:py-3`. La valeur de départ mesurée est 36,28 px et non 32. `min-h` garantit 44 sans dépendre de la police.
- Il y a 17 boutons à modifier et non 18 : le 18e (`settings/page.tsx`) était déjà conforme.
- Ajout hors inventaire : le curseur `avatar-zoom` (16 px).
- La valeur de l'option desktop, supposée à 32 dans le plan, est en réalité 36,28 px. La spec l'asserte avec `toBeCloseTo(36.28, 1)`.

## Non vérifié
- Firefox/WebKit, dpr > 1 et CI Linux : les hauteurs d'option et de carte de toast dépendent de la police. Sous Linux, la borne basse du TALL de `sprint-95` n'a que ≈ 3,5 px de marge : non vérifié hors darwin.
- Consommateurs hors réglages (NewEventDrawer, CategoryDrawer, DeleteConfirmDialog, pages d'auth) : leurs specs sont vertes, mais aucune mesure visuelle ni capture de l'agrandissement mobile.
- Tablette 768–1023 : aucune mesure. `max-md:` y est inactif par construction.
- `export-download`, `export-relaunch` et `export-retry` sont mesurés avec des réponses simulées, pas contre le vrai backend async.

## Signaux mémoire
- [MEMORY:pitfall] Contexte : spec E2E qui simule deux jobs d'export successifs avec le même `jobId`. Solution : un id par étape. Prévention : TanStack Query met en cache `queryKeys.export.job(jobId)`. Réutiliser l'id rend l'ancienne réponse `COMPLETED` : l'état « expiré » n'apparaît jamais et `toBeVisible` échoue sans message clair.
- [MEMORY:pattern] Problème : prouver qu'une cible tactile est conforme sans lister les testids à la main. Solution : requête DOM (`button, a[href], input:not([type=hidden]), [role=button|combobox|option]`), mesure par `getBoundingClientRect`, exemptions nommées en commentaire, plus un nombre minimal de contrôles par étape (anti-vacuité). Anti-pattern : liste de testids figée, qui reste verte quand un nouveau bouton non conforme apparaît.
- [MEMORY:decision] Contexte : #738 fait effleurer à la croix du ProductDrawer la carte du toast à 390×844. Décision : recouvrement ≈ 3,5 px accepté, extension de la décision B #714 ; oracle TALL encadré ]0 ; hauteur croix[. Pourquoi : la sortie de secours (tap sur la bande d'overlay) reste intacte, et les cibles 44 px priment.
- [MEMORY:pitfall] Contexte : grossir une primitive partagée (Input/Select) « acceptée hors réglages ». Solution : A/B sur les specs géométriques. Prévention : `sprint-95-toast-overlap` encode une géométrie de sheet au pixel près (décision B #714). +8 px par champ × 3 champs suffisent à la faire basculer.

## Recommandations suite
- Pas de RECOMMAND_DB_EXPERT : aucun changement de schéma ni de requête (frontend seul).
- Pas de RECOMMAND_SECURITY : aucune surface d'auth ni de données modifiée ; classes CSS seulement.
- Pas de RECOMMAND_TEST_RUNNER : les 41 specs impactées ont été rejouées ici ; seule `sprint-90` est à rejouer par le lead sous `next build`, comme prévu.
- Pas de RECOMMAND_UI_DESIGN : l'arbitrage `sprint-95-toast-overlap` est tranché par le dev (voie 1, oracle réécrit, `fb54ec2a`) ; le seul point ouvert est la marge de police de la borne basse TALL sous Linux, que la CI tranchera.
- RECOMMAND_FOLLOWUP: balayage mobile < 44 px hors réglages, NON mesuré ici. Candidats connus : `Button size="sm"` des écrans dashboard/produits (`CompactAgenda`, `DensityRibbon`, `ProductCarousel`, `WeekAgenda`, `TimelineView`, `ProductsListView`) ; boutons default (36 px) des pieds de `ProductDrawer`, `NewEventDrawer`, `CategoryDrawer` et `DeleteConfirmDialog` ; `SelectItem` et `Input` y sont désormais à 44 px [triage M]

fichiers de contexte lus: ui-design-738-739.md (en entier : « Objection du lead », décisions DEC-S99-001/002) ; pit-frontend.md (ciblé : PIT-S41-001 l.1697 sur la hitbox PAT-S24-002 rognée, storageState l.1433 ; `twMerge`/`tailwind-merge`/`settings-mobile` : 0 occurrence) ; a11y-audit.md §« Mobile Réglages » l.94 et grabber exempté (DEC-S99-002) l.~113, §8bis l.330 (SelectContent non rogné) ; playwright.config.ts en-tête (#427, variables proxy obligatoires)

STATUS: COMPLETED
