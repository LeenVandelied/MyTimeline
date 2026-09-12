# Review batch — Sprint 49

**Agent :** `reviewer` (opus, lecture seule) · **Date :** 2026-07-28
**Périmètre :** `92c14c4` → `24f44a3`, 68 fichiers / +6874 −451 (diff lu via `rtk proxy`, 8509 lignes)
**Verdict initial : `BLOQUANT`** → **résolu** par `8d2ccdd` + `b1ebed4`.

## Le point le plus important : le sprint réintroduisait le défaut qu'il corrigeait

**[CRITIQUE] `LandingMobileMenu.tsx:106`** — `hover:bg-accent-soft hover:text-accent` sur des liens
`text-xs` (15 px) : exactement le couplage `hover:bg-*` + `hover:text-*` que `24f44a3` venait de retirer
de `button.tsx`. Le composant avait été écrit par l'agent #334 **avant** que l'invariant n'existe, et le
garde-fou AST ne couvrait que `button.tsx`.

**Ratio MESURÉ au navigateur** (le reviewer, lui, l'avait seulement calculé et le déclarait) :

| | Avant | Après |
|---|---|---|
| Clair | **3,83:1** 🔴 (seuil 4,5 — 15 px non gras) | **14,44:1** |
| Sombre | 5,43:1 ✅ | 13,06:1 |

Le défaut n'existait **qu'en clair** — le classement CRITIQUE tient quand même.
`hover:text-accent` retiré, `text-ink` conservé ; le survol reste perceptible par la seule surface
(`#ffffff→#dbe9fc` en clair, `#131519→#16263a` en sombre).

**Garde-fou étendu, et mieux conçu que la consigne du lead.** `landing.hover-pairing.test.ts` scanne tout
`components/landing/*.tsx` et n'interdit pas tout `hover:text-*` : il exige que **si surface ET encre
changent au survol, la paire soit la paire sanctionnée** (`hover:bg-accent` + `hover:text-accent-ink`).
Deux occurrences légitimes ont ainsi été **conservées** (`HeaderSection.tsx:78`,
`LandingMobileMenu.tsx:117`, mesurées 4,71 clair / 6,94 sombre). **Le détecteur est lui-même testé**
(3 tests).

## Majeurs — tous fermés

**[MAJEUR] Le livrable principal de #334 n'avait AUCUNE couverture E2E.** Les 4 `data-testid` du burger
avaient **zéro** référence dans `frontend/e2e/`. ⚠ **Le contrôle de couverture du lead avait renvoyé un
faux `OK`** (boucle shell dont l'extraction de variable ne fonctionnait pas) — l'erreur est du lead, le
reviewer l'a rattrapée.
→ `frontend/e2e/landing-mobile-menu.spec.ts`, **10 tests** : ARIA, fermeture (bouton / overlay / Escape
avec focus rendu / ancre), focus-trap dans les 2 sens + balayage complet, `scrollWidth <= clientWidth`
fermé **et** ouvert, fermeture au passage `md`, contraste du panneau repos + survol, clair et sombre.

**[MAJEUR] Un CTA n'était mesuré par aucun test.** À 375 px, `header a[href$="/login"]` est
`display:none` et `landingCtas()` ignorait le panneau → le CTA « Connexion » **déplacé par #334**
échappait aux 12 tests de #337, dans les deux thèmes.
→ `mobileMenuTargets()` ajouté. `menu/connexion` : 4,71 clair (repos et survol) · 6,48 / 6,94 sombre.
Icône de fermeture aussi mesurée (4,97 / 4,90).

**[MAJEUR] Le harnais de contraste se trompait du côté PERMISSIF** — plus grave qu'une absence de test :
- `contrast.ts:108` — `ctx.fillStyle = <invalide>` est un **no-op silencieux** → compositait un **noir
  opaque** et gonflait le ratio. Corrigé par **double sentinelle** : lève au lieu de composer.
- `contrast.ts:150,185` — `effectiveOpacity` calculé mais **jamais appliqué** au compositage ;
  `expectReadable` au survol ne le vérifiait pas → ratio optimiste sur élément semi-transparent.
  Désormais appliqué à l'alpha de l'encre, **erreur du côté sévère**.
- **Preuve** : nouveau test « le harnais ne se trompe plus du côté permissif » — opacité 0,3 injectée →
  ratio < 3 **et** l'assertion rougit ; `getComputedStyle` empoisonné → `rejects.toThrow`.

## Mineurs traités (3/7)

- `HeaderSection.tsx:106` — le menu ne se fermait pas au redimensionnement : `menuOpen` restait vrai au
  passage ≥ `md`, panneau masqué par `md:hidden` **mais `useFocusTrap` restait actif** (Escape avalé) et
  le burger disparaissait. Corrigé via le `useMediaQuery` existant.
- `HeaderSection.tsx:108` — `onClose` recréé à chaque rendu → dépendance instable de `useFocusTrap`,
  cleanup rejoué à chaque re-rendu parent = **saut de focus**. `useCallback`.
- `HeaderSection.tsx:97` — `aria-controls` référençait un **id absent du DOM** à l'état fermé (idref
  pendant). Posé seulement à l'ouvert, test unitaire mis à jour.

## Points `[OK]` confirmés par la review

- **Fenêtrage de virtualisation correct** : `segmentIntersectsBand` en intersection fermée, `windowLanes`
  floor/ceil + clamp **sans trou de frontière**, cales préservant la hauteur totale → **aucun événement
  manqué en bord de bande**.
- **Aucune fuite** : rAF annulé, scroll/resize retirés, timer resync purgé au démontage.
- **Débounce 400 ms** : la bande y reste **trop large**, jamais trop étroite → surcoût de rendu, **pas**
  de perte de focus ni d'événement.
- `windowEvents` conserve l'index du modèle complet → navigation clavier #81 et `aria-setsize` intacts.
- i18n : les 3 clés présentes dans **fr/en/es/de**.
- Tokens : `--color-input` → `rule-emphasis` cohérent clair + sombre ; arbitrage décoratif documenté
  in-situ ; `SelectContent` laissé décoratif **défendable** (cadre de popover).
- `contrast.ts` : linéarisation sRGB, pondération 709, +0,05 **conformes**. Seuil 0,04045 vs 0,03928 =
  écart < 1e-5, sans effet.
- `button.tsx` : aucun autre variant ne pose de `hover:text-*` ; **aucune seconde dégradation** du type
  corbeille hors du cas déjà accepté.

## Non vérifié par le reviewer (déclaré)

Rendu navigateur réel (aucun serveur lancé) — ses ratios sont **calculés depuis les tokens**, pas
mesurés ; hauteur de lane vs `--lane-height` ; `tailwind.config.ts` non ouvert.
*(Le correctif a comblé le premier point en mesurant réellement.)*

## Follow-ups issus de la review — hors périmètre, non corrigés

1. `TimelineView.tsx:754,847` — cales `<div>` enfants directs de `role="list"` sans
   `role="presentation"` → `aria-required-children` fragile.
2. `useTimelineViewport.ts:206` — `scroll` en **capture sur `window`** : se déclenche pour **tout**
   scroller de l'app (dialogs, drawers) tant qu'une frise est montée → rAF + lecture de layout par
   rafale. Filtrer sur `scrollEl`/`document`.
3. `ui/dropdown-menu.tsx` (4 occurrences) + `ui/select.tsx` (1) — **même couplage sous `focus:`**
   (`focus:bg-accent focus:text-accent-foreground`). **Confirmées** par grep, défaut identique, latent.

## Signaux mémoire du correctif

- **[MEMORY:pitfall]** Clic E2E sur un composant client **avant hydratation** → « élément introuvable »
  erratique. Solution : `expect(async () => { click; toBeVisible }).toPass()`. **2 runs sont tombés
  dessus sur 2 tests différents** — sur la landing, un introuvable erratique = hydratation, pas le test.
- **[MEMORY:pitfall]** `./scripts/test-quiet.sh e2e` **ne passe pas `--workers=1`** → 4 specs
  `settings-*` rouges (piège n°2 du runbook S47). Solution : préfixer `CI=1`, la config force alors
  1 worker. **Le runbook ne le disait pas pour ce script.**
- **[MEMORY:pattern]** `ctx.fillStyle = <invalide>` est un no-op silencieux → noir opaque composité →
  ratio faussement bon. Analyser depuis **2 sentinelles** et comparer. **Anti-pattern** : comparer au
  noir (accuse à tort le noir réel).

## État final

**688 unitaires / 0 échec** · **92 E2E passed / 0 failed / 1 skipped** (pré-existant) · serveurs arrêtés.
Baseline avant sprint : 68 E2E → **+24 tests, zéro régression**.
