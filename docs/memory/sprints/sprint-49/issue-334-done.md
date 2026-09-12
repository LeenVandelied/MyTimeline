# Issue #334 — Header de la landing non responsive (scroll horizontal sur mobile)

**Sprint :** 49 · **Vague :** 2 · **Agent :** `fullstack-dev` (opus) · **Date :** 2026-07-28
**Commit :** `26a4225` — 7 fichiers, +300 / −13.
**Revue design amont :** `design-334-verdict.md` (agent `ui-design`, APPROUVÉ)

## Livré

Burger + panneau off-canvas `LandingMobileMenu.tsx` (créé, calqué sur `MobileDrawer`, `useFocusTrap`
**importé sans modification**), `HeaderSection.tsx` (logo responsive + groupe droit réduit), **4 locales**,
7 nouveaux tests. **Vitest 683/683**, `tsc` 0 erreur.

## 🚨 Le budget du verdict design était faux d'un facteur ~2 — cause vérifiée

Les largeurs **234 px (logo) et 299 px (groupe)** de l'issue **tenaient exactement** (fr, 375 px) ;
`de` = 305. **Mais la cause était mal diagnostiquée** : les 234 px correspondaient à un logo **replié sur
2 lignes**, de largeur intrinsèque **328 px**.

**Racine :** l'échelle typographique du DS Graphite **écrase celle de Tailwind**.

```
--text-2xs 13  --text-xs 15  --text-sm 17  --text-md 21
--text-lg  27  --text-xl 35  --text-2xl 45  --text-3xl 57
```

`text-3xl` = **57 px**, pas 30 px. **`--text-4xl` n'existe pas** — `md:text-4xl` retombe sur le défaut
Tailwind (36 px) et **RÉTRÉCIT** donc le titre au desktop. Vérifié par le lead dans
`frontend/src/styles/ds/tokens/typography.css`.

Conséquence : le `logo ~140 px en text-lg` du verdict design était faux — `text-lg` = 27 px = **155 px**,
soit **2 px de marge réelle en allemand, pas 18**. L'agent a retenu **`text-md` (21 px) = 121 px**.

**Après :** 375 px → **286 (fr) / 299 (de)** pour 343 disponibles. 390 px → idem pour 358.

## Critères d'acceptation — 2/4

| # | Critère | État |
|---|---|---|
| 1 | Aucun scroll horizontal à 375 px | **NON** — le header tient, mais la page garde **29 px (fr) / 62 px (de)** |
| 2 | Header utilisable sur mobile | **OK** — Inscription dans le header ; nav + Connexion + langue dans le panneau, 1 tap |
| 3 | Critère n°8 de #56 validé | **NON** — adossé au critère 1 |
| 4 | Vérifié sur 2 largeurs mobiles | **OK** — 375 et 390, `fr` + `de`, clair + sombre, + 640 / 768 / 1024 en contrôle |

### Le reliquat n'est PAS le header

`scrollWidth` / `clientWidth` mesurés : 375 fr **404/375** · 375 de **437/375** · 390 fr **404/390** ·
390 de **437/390**. **Header seul : tient partout.**

Cause isolée : le `<h2 class="text-3xl">` de `FeaturesSection` fait **57 px** → 437 px de large.
**Headings neutralisés à 27 px : 375/375 et 390/390 exactement** → le `h2` est le **seul** reliquat.

Défaut **distinct et pré-existant**, jusque-là **masqué derrière les 173 px du header**.

## a11y — vérifié au navigateur, pas seulement écrit

`aria-expanded` false→true · `aria-controls` = id du panneau · `role="dialog"` + `aria-modal` +
`aria-labelledby` résolu · burger 44×44 · bouton fermer 44×44 · focus initial dans le panneau · `Tab`
boucle last→first **et** first→last · Escape / overlay / ancre / bouton ferment · focus restauré sur le
burger. Tokens relevés en `getComputedStyle` clair + sombre (`surface` `#fff` / `#131519`,
`rule-emphasis` `#7A7E87` sur les contrôles).

**« Écrit mais non vérifié » : rien.**

## i18n

`menuOpen` / `menuClose` / `menuTitle` × **fr, en, es, de** — les 4 confirmées par **rendu SSR réel**
(`Ouvrir le menu` / `Open menu` / `Abrir el menú` / `Menü öffnen`), zéro fuite de clé.

## Contrôle navigateur

Dev server :3401, `/fr` et `/de` à 375 / 390 / 640 / 768 / 1024, **sombre puis clair** (captures des
deux). Panneau ouvert inspecté dans les deux thèmes.

## Signaux mémoire

- **[MEMORY:pitfall]** **L'échelle typo Graphite écrase celle de Tailwind** (`text-3xl` = 57 px,
  `text-lg` = 27 px, **pas de `text-4xl`/`5xl`** → `md:text-4xl` **rétrécit** le titre). **Tout budget de
  largeur calculé sur les valeurs Tailwind est faux d'un facteur ~2.** C'est ce qui a faussé le verdict
  design de #334.
- **[MEMORY:pitfall]** Panneau navigateur d'agent : `innerHeight` (946) ≠ `clientHeight` (812) → un
  `fixed inset-y-0` **paraît** dépasser l'écran. Artefact d'outillage, vérifié en redimensionnant le
  panneau à `clientHeight`. *(Même famille que le `document.hidden` rencontré par le lead sur #335.)*
- **[MEMORY:pitfall]** Éditer `public/locales/*.json` sous dev server → payload i18n client périmé +
  `MISSING_MESSAGE` + hydratation cassée. **Rechargement dur obligatoire.**
- **[MEMORY:decision]** `MobileDrawer` **non généralisé** (couplé au dashboard) → composant landing
  dédié ; seul `useFocusTrap` est mutualisé.

## Recommandations suite

- Les **clics souris de l'automatisation n'atteignaient pas les handlers React** (`el.click()` en JS,
  oui). Valider les interactions par JS, pas par clic simulé.
- `.next` **partagé avec #69** : une corruption de manifeste Turbopack a exigé un restart
  (aucun `rm -rf` effectué).

**`RECOMMAND_FOLLOWUP`**
- **(a) P1 / S — BLOQUE LE CRITÈRE 1 DE #334.** `text-3xl md:text-4xl` sur **5 `h2`** de la landing
  (`CtaSection`, `FeaturesSection`, `HowItWorksSection`, `MobileAppSection`, `TestimonialSection`) :
  57 px en mobile → débordement, et `md:text-4xl` (36 px, **hors échelle DS**) **rétrécit** au desktop.
  **Remède validé en navigateur : 27 px → 375/375 et 390/390 exactement.** Arbitrage `ui-design` requis
  (changement visible sur 5 sections).
- **(b) P2 / S** — le header déborde **aussi entre ~768 et ~1000 px** (à 768 : 842 px pour 725 dispo).
  Pré-existant, **inchangé** par l'agent (vérifié : `whitespace-nowrap` borné à `< md` exprès).
- **(c) P2 / XS** — `language-selector.tsx:29` : chaîne **française en dur** « Changer de langue » rendue
  en `de`/`en`/`es`. S'ajoute au `h-9 w-9` (36 px) déjà connu.

## ABSORBED

Aucune.

## E2E

**Non exécutables** : backend éteint → 4 échecs de provisioning `auth.setup.ts`, 64 tests non lancés.
**Pas une régression de l'agent.** *(Note du lead : Docker répond et les images sont en cache — le filet
E2E est récupérable en Phase 6, cf. `docs/memory/sprints/sprint-47/e2e-local-runbook.md`.)*

STATUS: PARTIAL
BLOQUE_SUR: critères 1 et 3 — débordement résiduel 29 px (fr) / 62 px (de) causé par le h2 `text-3xl` de
FeaturesSection, hors périmètre header et non couvert par le verdict design (changement de taille visible
sur 5 sections). Remède mesuré, prêt à trancher.

---

## ✅ BLOCAGE LEVÉ — 2026-07-28, en fin de sprint

Le `BLOQUE_SUR` ci-dessus est **périmé**. Décision dev : corriger dans le sprint.

- `8d615e2` — les 5 `h2` passent de `text-3xl md:text-4xl` (57 → 36 px, **inversé**) à
  `text-lg leading-tight md:text-xl` (27 → 35 px, tokens DS). 5 accroches et 2 `h3` de carte démotés en
  `text-md md:text-lg` — sans quoi le `h2` serait passé **sous** son propre sous-titre.
  Arbitrage : `design-h2-verdict.md`.
- `4442006` — dernière source de débordement isolée par mesure : `MobileAppSection` avait une rangée
  `flex space-x-4` non wrappable (min-content 347 px en `fr`, **450 px en `es`**). Passée en
  `flex flex-wrap gap-4`.

**Mesure Playwright finale** (`document.fonts.ready`, `scrollWidth`/`clientWidth`) :
`fr`/`de`/`es` × 320/375/390 px → **tous exactement N/N**.

⇒ **Critères 1 et 3 de #334 REMPLIS. Critère n°8 de #56 fermé.**

Reste hors périmètre : débordement à **768 px** (+90 à +108 px selon la locale), groupe droit du header
au palier `md`. **Pré-existant**, vérifié inchangé par ce sprint → follow-up.

STATUS: COMPLETED
