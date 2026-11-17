# Issue #381 — logo du header resté au palier `md:` — Sprint 59, vague 1

commits: `b722c10` — `:lipstick: fix(landing): aligner l'échelle du logo du header sur un palier unique (#381)`
fichiers: `frontend/src/components/landing/HeaderSection.tsx` (+73/-22),
`frontend/e2e/landing-header-logo.spec.ts` (nouveau, 243 lignes)
sentinel briefing: `SENTINEL-SPRINT59-381-KGXQ7` ✅ (contexte bien reçu)

## Résultat central — l'hypothèse de l'issue est DÉMENTIE par la mesure

Mesure dans `mcr.microsoft.com/playwright:v1.61.1-jammy`, **8 paliers × 4 locales × 2 thèmes**.

**Entre 768 et 1023 px — le périmètre annoncé par l'issue — il n'y a AUCUN défaut.** Identique
dans les 4 locales et les 2 thèmes : logo **57 px sur 1 ligne**, 330 px de large, marge
**223-262 px**, `scrollWidth == clientWidth`.

Cause : le `container` Tailwind plafonne la largeur utile à 736 px à ce palier, et la nav est
masquée — les deux annulent le défaut attendu.

**Le vrai défaut est à 1024 px, soit 1 px hors du périmètre annoncé** (avant → après) :

| locale | avant | après |
|---|---|---|
| `fr` | **2 lignes**, marge **0** | 1 ligne, 159 px, marge **58,5** |
| `de` | **2 lignes**, marge **0** | 1 ligne, 159 px, marge **82** |
| `es` | **2 lignes**, marge **0** | 1 ligne, 159 px, marge **72** |
| `en` | 1 ligne, marge 61 | 1 ligne, 159 px, marge **146,5** |

Hauteur du header `fr`/`de`/`es` : **184,8 → 90 px**. Palier 768-1023 : 116,4 → 92 px.
À 1280 px : marges 186,5-274,5. **320 / 375 / 390 px inchangés au pixel** (21 px, 122 px) — `sm`
vaut 640, ces paliers ne sont pas touchés.

## Arbitrage `ui-design` confronté à la mesure

- **Ratio largeur/fonte CONFIRMÉ** : 5,79 mesuré contre 5,76 extrapolé ; 159 px contre ~155 prédits.
- **Marge à 1024 px en `fr` DÉMENTIE** : ~216 px prédits, **58,5 px mesurés**. Cause de l'écart :
  la nav `fr` fait **409 px**, pas 322,5 — ce chiffre venait d'un autre palier.
- Le correctif tient quand même : 58,5 px reste **à deux chiffres**, au-dessus de la zone à risque
  0-4 px de `PIT-S52-001`.

## Preuve de non-vacuité du test

Anciennes classes réintroduites → **11 rouges**, dont
`mesuré 2 ligne(s), boîte 305.9x136.8px` (`fr`/`de`/`es` à 1024 px).
**`scrollWidth <= clientWidth` seul restait VERT** sur le défaut réel — la prédiction de l'issue
sur l'aveuglement de cette assertion est donc, elle, vérifiée.

## Tests

- `npx tsc --noEmit` → 0 erreur
- vitest → **887/887**
- specs `landing-*` dans jammy → **64/64**

## non_couvert

- **jammy ≠ `ubuntu-latest` GitHub** (jeu de polices possiblement différent). **Rien n'est poussé,
  la CI réelle n'a pas tourné.**
- Seules les specs `landing-*` ont été rejouées. **`golden-path`, `categories`, `products`,
  `settings-*` NON rejouées** alors que le header perd 24 à 95 px de haut. Atténuation : le header
  est **non sticky** (vérifié), donc pas d'offset d'ancre — mais un clic en coordonnées reste non
  vérifié.
- Bascule `sm` testée à 639/640 en `de` seulement ; rien entre 640 et 767.
- **Rendu esthétique non jugé** (aucune capture revue) — le verdict `ui-design` est pris pour acquis.
- Le logo n'est couvert par **aucune spec de contraste**, ni avant ni après. 27 px gras reste
  « grand texte » WCAG, seuil inchangé — non re-mesuré.
- À 320 px en `de`, la marge logo↔groupe droit est de **5 px** — zone à risque « 0-4 px ».
  Antérieur, terrain de #347, inchangé ici.

## [MEMORY:*]

- **[MEMORY:pitfall]** Un désalignement de paliers ne prédit **pas** où le défaut sort. #381
  localisait le défaut entre 768 et 1023 px par lecture du code seul ; la mesure jammy l'y trouve
  **absent** et le trouve **à 1024 px** (2 lignes, marge 0, `fr`/`de`/`es`). Le `container` Tailwind
  plafonne la largeur utile et peut annuler le défaut attendu. **Prévention : mesurer les DEUX
  côtés du seuil suivant.**
- **[MEMORY:pattern]** Prouver qu'un test de mise en page n'est pas vacuous : réintroduire les
  classes fautives, relancer, exiger des **rouges nommés**. Anti-pattern : livrer un garde-fou vert
  sans l'avoir vu rougir — ici `scrollWidth <= clientWidth` est resté vert sur le défaut réel.
- **[MEMORY:decision]** Wordmark hérité à 57 px → palier unique `text-md sm:text-lg` +
  `whitespace-nowrap` partout. Motif : 57 px imposait un header de 184,8 px et **0 px de marge à
  1024 px dans 3 locales sur 4**.

## Recommandations suite

- `RECOMMAND_FOLLOWUP` : `FooterSection.tsx:38` rend « Ma Timeline » en `text-2xl` (45 px), soit
  désormais **1,7×** le wordmark du header (27 px). Vérifié, hors périmètre.
  [triage XS | domaine design]
- `RECOMMAND_FOLLOWUP` : le logo du header est un `<div>`, **pas un lien vers l'accueil**. Écart
  UX/a11y distinct, non corrigé en douce. [triage XS | domaine frontend/a11y]
- **`RECOMMAND_TEST_RUNNER`** : rejouer la suite E2E complète, specs authentifiées incluses.
- ⚠ **BLOQUANT POUR #379** : sa prémisse — « marge nulle et logo sur 2 lignes à 1024 px en `fr`/`es` »
  — est **résolue par ce commit** (marges 58,5 à 146,5 px, 1 ligne partout). `space-x-8` laissée
  intacte. **#379 doit être re-cadrée ou fermée sur ce relevé.**

STATUS: COMPLETED
