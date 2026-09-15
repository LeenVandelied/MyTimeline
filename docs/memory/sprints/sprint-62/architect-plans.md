# Mini-plans architect — Sprint 62

> Généré par `/sprint start 62` (architect spawné à la demande du dev — `/sprint plan` n'avait
> persisté aucun plan). Lu par la Phase 4 pour injection dans le HEAD des briefings fullstack-dev.
>
> **Vérification terrain effectuée** : les 3 pistes techniques des issues ont été confrontées au
> code. Deux sont fausses, une est partielle. Les corrections sont dans `etat_reel_du_code`.

## Verdicts de vérification des pistes

| Issue | Piste de l'issue | Verdict |
|---|---|---|
| #413 | `frontend/src/app/[locale]/layout.tsx` porte le `<html lang>` | **FAUSSE** — `frontend/src/app/` n'existe pas (app router = `frontend/app/`), et le `<html>` est dans le layout **racine** `frontend/app/layout.tsx:41`, où `locale` n'est pas accessible |
| #414 | `select.tsx`, consommateurs `ProductDrawer`/`EventEditForm`/`PreferencesSection` | **PARTIELLE** — 6 consommateurs réels, et `EventEditForm` n'importe PAS `ui/select`. `data-highlighted` n'est pas stylé ; `select.tsx:135` porte `focus:` (= `:focus`, pas `:focus-visible`) |
| #415 | `core.css` L134/L149, `--shadow-focus`, deux composants « en production » | **CONFIRMÉE sur le CSS** (règles réelles L142/L157, token `spacing.css:36`) — **FAUSSE sur « en production »** : `<Radio>` n'a aucun consommateur applicatif (seul `radio.stories.tsx`). Seul `<Switch>` est monté, une fois, dans `EventEditForm.tsx:624` |

## Blast radius des tokens (risque principal de #415)

- `--shadow-focus` — 5 sites, tous dans `core.css` (L68, L90, L131, L142, L157), **aucun consommateur
  TSX** hors radio/switch → voie à faible risque.
- `--color-accent-soft` — 9+ sites hors `--shadow-focus` : `base.css:130` (`::selection`),
  `core.css:108`, `landing.css:75`, `animations.css:63`, `button.tsx:46,49`,
  `dropdown-menu.tsx:135,153,189,272`, `select.tsx:135`, `AvatarUpload.tsx:183`.
  **NE PAS TOUCHER CE TOKEN.**

## Outillage : ce qui manque réellement

- **`PAT-S58-002` (lecture de pixel) n'est implémenté nulle part.** `frontend/e2e/support/contrast.ts`
  fait du `getComputedStyle` ; son `getImageData` (L138) ne sert qu'à normaliser une chaîne couleur
  sur un canvas 1×1. Un dev qui lit « méthode : PAT-S58-002 » et voit ce `getImageData` **croira que
  la sonde existe**. Elle est à écrire.
- **`frontend/playwright.config.ts:27-43` n'a que les projets `setup` + `chromium`.** Ni firefox ni
  webkit → les critères d'acceptation de #414 sont inexécutables en l'état.
- `frontend/src/styles/__tests__/control-border-tier.test.ts:53-55` surveille `.mt-check__box`,
  `.mt-radio__dot`, `.mt-switch__track` : ne lit que les déclarations `border*` du sélecteur exact.
  Ajouter une règle sœur `:focus-visible` ne le casse pas ; renommer le sélecteur si.

## Matrice de conflits + vagues

| paire | fichiers en commun |
|---|---|
| #413 ↔ #414 | aucun |
| #413 ↔ #415 | aucun |
| #414 ↔ #415 | **aucun fichier source** (#414 = `select.tsx` Tailwind TSX ; #415 = `core.css` + `spacing.css`). Recoupement indirect sur `--color-accent-soft` seulement si #414 remonte le token — interdit par le plan |
| #414 ↔ #415 (tests) | `frontend/e2e/support/pixel.ts` (à créer) si les deux l'écrivent ; `playwright.config.ts` exclusif à #414 |

```
V1 (parallèle) : #413 ─┐
                 #415 ─┤  aucun fichier commun
V2 (après #415) : #414 ─┘  réutilise e2e/support/pixel.ts livré par #415
```

Séquencement **#415 → #414** : #415 (size S, périmètre fermé) livre la sonde pixel `PAT-S58-002` que
#414 (size M, périmètre ouvert) réutilise au lieu de la réécrire. En parallèle, les deux écriraient
deux sondes concurrentes sur le même fichier.

## Mini-plans YAML

```yaml
issue_413:
  fichiers_cles:
    - "frontend/app/layout.tsx"            # ligne 41 : lang="fr" en dur — LE site réel
    - "frontend/app/[locale]/layout.tsx"   # ligne 20 : `locale` disponible ici, pas en racine
    - "frontend/src/i18n/locales.ts"       # SUPPORTED_LOCALES / DEFAULT_LOCALE
    - "frontend/e2e/settings-preferences.spec.ts"  # modèle de nav locale
  couches_touchees: ["frontend"]
  strategie_test: "unit+E2E"
  risque_regression: "Passer par headers() en racine casse generateStaticParams() de [locale]/layout.tsx:9 et bascule toute l'app en rendu dynamique."
  ordre_ecriture: >
    1) Trancher le mécanisme AVANT de coder — la piste de l'issue est inapplicable telle quelle.
    Trois voies : (a) déplacer <html>/<body> dans app/[locale]/layout.tsx et réduire
    app/layout.tsx (impose de traiter app/page.tsx et app/error.tsx, hors [locale]) ;
    (b) headers() en racine (coût SSG) ; (c) composant client posant document.documentElement.lang
    (rustine : le HTML SSR reste faux, insuffisant pour WCAG 3.1.1 strict).
    2) Implémenter. 3) E2E sur les 4 locales. 4) Vérification navigateur.
  zod_dto_sync: "NON"
  verification_navigateur: >
    Charger /fr/login, /en/login, /es/login, /de/register ; lire document.documentElement.lang ET
    view-source (l'attribut doit être correct dans le HTML SSR, pas seulement après hydratation).
    Consigner les 4 valeurs.
  pieges_a_citer: ["PAT-S58-003"]
  possibly_done: false
  etat_reel_du_code: |
    frontend/app/layout.tsx:41 -> lang="fr" littéral, dans le layout RACINE.
    frontend/app/[locale]/layout.tsx ne rend aucun <html> et est le seul à connaître `locale` (l.20).
    frontend/src/app/ n'existe pas : la piste de l'issue pointe un chemin fantôme.
    Aucune assertion de lang dans e2e/ ni en unitaire.

issue_415:
  fichiers_cles:
    - "frontend/src/styles/ds/components/core.css"   # 114, 131, 133-142, 146-157
    - "frontend/src/styles/ds/tokens/spacing.css"    # 36 : --shadow-focus
    - "frontend/src/styles/__tests__/control-border-tier.test.ts"  # 53-55
    - "frontend/src/components/EventEditForm.tsx"    # 624 : SEUL montage réel d'un Switch
    - "frontend/e2e/sprint-61-archived-events.spec.ts"  # 179 : accès au toggle archivage
    - "frontend/e2e/support/contrast.ts"             # base à étendre (PAS de lecture de pixel dedans)
  couches_touchees: ["frontend"]
  strategie_test: "unit+E2E"
  risque_regression: >
    Toucher --color-accent-soft casserait ::selection (base.css:130), le hover des boutons
    (button.tsx:46,49), le focus de dropdown-menu (4 sites) et select.tsx:135 — INTERDIT.
    Modifier --shadow-focus n'atteint que core.css:68/90/131/142/157, tous sans consommateur TSX
    hors radio/switch : c'est la voie à faible risque.
  ordre_ecriture: >
    1) Écrire d'abord frontend/e2e/support/pixel.ts (PAT-S58-002 : page.screenshot({clip}) ->
    createImageBitmap -> getImageData DANS la page) — il n'existe pas, contrast.ts ne fait que du
    getComputedStyle. 2) Sonde ROUGE sur le Switch d'EventEditForm (baseline 1,23:1 / 1,19:1).
    3) Corriger core.css. 4) Sonde verte clair + sombre. 5) Rejouer control-border-tier.test.ts.
    Ne PAS toucher --color-accent-soft.
  zod_dto_sync: "NON"
  verification_navigateur: >
    /fr/timeline -> ouvrir EventEditForm sur un événement existant -> Tab jusqu'à
    [data-testid="event-form-archived-toggle"] -> asserter matches(':focus-visible')===true et
    non disabled -> attendre >=450 ms -> lecture de pixel du liseré contre son fond adjacent,
    en clair ET en sombre, ratio >=3:1. Vérifier aussi que la hitbox du label reste cliquable si
    l'<input> est redimensionné.
  pieges_a_citer: ["PIT-S58-001", "PIT-S58-002", "PAT-S58-002", "DEC-S58-001", "DEC-S58-003"]
  possibly_done: false
  etat_reel_du_code: |
    core.css:142 et :157 posent bien box-shadow:var(--shadow-focus) comme UNIQUE indicateur, et
    spacing.css:36 = 0 0 0 3px var(--color-accent-soft). Le défaut est intact.
    MAIS : <Radio> n'a aucun consommateur applicatif (seul radio.stories.tsx) — l'issue et
    decisions.md:437 affirment à tort qu'il est "en production". Seul Switch est monté, une fois,
    dans EventEditForm.tsx:624. Le périmètre "production" réel de cette issue = le switch.

issue_414:
  fichiers_cles:
    - "frontend/src/components/ui/select.tsx"        # 135 : focus:bg-accent-soft, PAS de data-highlighted
    - "frontend/src/styles/ds/tokens/base.css"       # 145 : la règle :focus-visible @layer base
    - "frontend/playwright.config.ts"                # 27-43 : chromium SEUL, pas de firefox
    - "frontend/src/components/settings/PreferencesSection.tsx"   # 63,80 — montage réel
    - "frontend/src/components/products/ProductDrawer.tsx"        # montage réel
    - "frontend/src/components/events/NewEventDrawer.tsx"         # montage réel
    - "frontend/e2e/landing-mobile-menu.spec.ts"     # 348-365 : sonde data-highlighted à recopier
  couches_touchees: ["frontend"]
  strategie_test: "E2E"
  risque_regression: >
    Un indicateur adossé à data-highlighted qui se superpose au contour @layer base produirait deux
    indicateurs concentriques, motif rejeté par DEC-S58-001.
  ordre_ecriture: >
    1) PHASE VERDICT (aucun code applicatif) : ajouter un projet firefox à playwright.config.ts,
    rejouer la sonde du modèle landing-mobile-menu.spec.ts:354-363 sur les montages RÉELS
    (PreferencesSection, ProductDrawer, NewEventDrawer — corriger l'issue : EventEditForm
    n'importe pas ui/select). Consigner le verdict. 2) SI confirmé : styler data-highlighted dans
    select.tsx (variante Tailwind data-[highlighted]:), sans ring-*, sans outline-none,
    sans toucher --color-accent-soft. 3) Sonde pixel >=3:1 clair + sombre.
    Si INFIRMÉ : ne rien coder, rapporter, et proposer la correction de #383 sur ce point.
  zod_dto_sync: "NON"
  verification_navigateur: >
    Firefox : /fr/settings -> chapitre Préférences -> ouvrir [data-testid="pref-language"] au
    CLAVIER (Enter/Space, jamais la souris) -> ArrowDown -> asserter data-highlighted présent ->
    attendre >=450 ms -> lecture de pixel de l'indicateur contre le fond du popover (PIT-S58-001 :
    ne PAS remonter le DOM pour le fond, le SelectContent est portalisé). Répéter clair + sombre,
    puis Chromium en non-régression.
  pieges_a_citer: ["PIT-S58-001", "PIT-S58-002", "PAT-S58-002", "DEC-S58-001"]
  possibly_done: false
  etat_reel_du_code: |
    select.tsx:135 : "... focus:bg-accent-soft data-disabled:pointer-events-none ..." — aucune
    variante data-[highlighted], et `focus:` = :focus (pas :focus-visible). Le seul contour
    attendu vient de ds/tokens/base.css:145 (@layer base).
    playwright.config.ts n'a QUE les projets `setup` et `chromium` : le critère "Firefox 151" et
    "non régressé sur WebKit" est aujourd'hui inexécutable dans le harnais.
```

## Points de vigilance (architect)

**Non vérifié par l'architect (pas de navigateur) :** aucun ratio mesuré — les 1,23:1 / 1,19:1 sont
repris des issues et de `DEC-S58-001`, non reproduits. Le bug Firefox de #414 n'est **ni confirmé ni
infirmé** : le verdict est le premier livrable de l'issue, pas un acquis.

1. **#413 n'est pas « un correctif d'une balise » (size S annoncé).** Le mécanisme demandé est
   inapplicable : `locale` n'existe pas dans le layout racine. Les trois voies coûtent plus que S,
   et l'une sacrifie le SSG. Arbitrage dev requis avant implémentation.
2. **#414 demande Firefox + WebKit alors que le harnais est chromium-only.** Size M sous-estimé.
   Repli possible : restreindre le projet firefox à la seule nouvelle spec via `testMatch`.
3. **`PAT-S58-002` n'est pas outillé** — mémo trompeur, à dire explicitement dans les briefings.
4. **#415 repose sur un fait faux** (« les deux composants sont en production »). `Radio` est mort
   côté applicatif ; `docs/memory/decisions.md:437` propage l'erreur.
5. **CI verte ≠ page correcte (S48/S53).** jsdom ne résout ni `@layer` ni la peinture — exactement
   le mécanisme en cause dans les 3 issues. Aucune ne peut être déclarée livrée sur CI verte seule.
6. Exiger que chaque spec ajoutée soit **exécutée et son output consigné**, pas seulement citée
   (cf. `coverage-check-vert-ne-prouve-rien`).
