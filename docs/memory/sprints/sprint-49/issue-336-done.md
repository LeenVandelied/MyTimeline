# Issue #336 — Dette WCAG AA sur les bordures de contrôle hors landing

**Sprint :** 49 · **Vague :** 1 · **Agent :** `fullstack-dev` (opus) · **Date :** 2026-07-28
**Commit :** `cc2dc8f` — `:lipstick: fix(a11y): migre les bordures de contrôle sur le tier fonctionnel (#336)`
18 fichiers, +215 / −44. `git add` ciblé (travail de #69/#335 présent dans l'arbre, non emporté).

## Objectif

Migrer les bordures **fonctionnelles** de `--color-rule-strong` (1.46:1, sous le seuil WCAG 1.4.11) vers
`--color-rule-emphasis` (livré par #293 au Sprint 48, appliqué jusque-là au seul hero de la landing).

## 🚨 Le briefing du lead se trompait — correction établie et vérifiée

Le briefing affirmait, en « correction » du corps de l'issue : « les formulaires auth ont **ZÉRO**
`border-rule-strong` en TSX ». **C'est faux.** Ils en portaient **10** (`login` 2, `register` 5,
`reset-password` 2, `forgot-password` 1).

**Cause :** le grep du lead était restreint à `frontend/src/**` et a raté `frontend/app/**` —
l'App Router vit sous `frontend/app/`, hors de `src/`. **Le corps de l'issue avait raison**, et
`a11y-audit.md` §6 nommait déjà ces formulaires.

**Vérifié après coup par le lead** sur la base `92c14c4`, depuis la racine du dépôt :

| Zone | Occurrences `border-rule-strong` |
|---|---|
| `frontend/src/**` | 21 (dont 19 en composants, 1 `a11y-audit.md`, 1 `StateScreen.test.tsx`) |
| `frontend/app/**` | **14** (10 en pages `.tsx` + 4 en `.test.tsx`) |
| **Total base** | **35** |

Le « ~30 » de l'issue était la bonne estimation ; le « 33 » du briefing sous-comptait.
Idem pour les tests : l'issue annonçait **4** (les 4 pages auth), le briefing en annonçait **1** — le
compte réel est **5** (les 4 auth + `StateScreen.test.tsx`), même angle mort.

## Mécanisme réel — cité par personne, ni l'issue ni le briefing

`frontend/src/styles/globals.css` **l.105** : `--color-input: var(--color-rule-strong)`.

C'est le **pont shadcn** qui habille `Input`, `SelectTrigger` et `Button variant="outline"` — donc tout
champ **sans** override de `className`. C'est lui qui décide des bordures de champ, pas les `className`.
**Migré.** `--color-border` (tier décoratif) laissé sur `--color-rule`.

## Arbitrage `core.css` — 7 migrées / 7 laissées (décision, pas migration incomplète)

**Fonctionnelles → `rule-emphasis`** (la bordure EST l'affordance) :
`.mt-btn--secondary` (outline) · `.mt-iconbtn` (pas de libellé) · `.mt-input` / `.mt-textarea` ·
`.mt-select__trigger` · `.mt-check__box` · `.mt-radio__dot` · `.mt-switch__track` (le remplissage
`surface-2` est à ~1.03:1 — le contour est la seule limite visuelle).

**Décoratives → restent `rule-strong`** :
`.mt-select__menu`, `.mt-toast`, `.mt-dialog` (cadres de panneaux flottants — l'élévation porte la
présence) · `.mt-badge` (marque statique non focusable) · `.mt-avatar` (cadre d'image) ·
`.mt-card--hover` (survol ; la carte s'identifie par son contenu) · `.mt-table th` (le readme DS nomme
les lignes de tableau comme le cas canonique décoratif).

Arbitrage **commenté dans le fichier**.

## Inventaire final

- **25/29 occurrences TSX migrées** (15 des 19 en `src/components`, + 10/10 en `app/[locale]/`)
- **4 laissées volontairement** : les `SelectContent` (`EventEditForm` ×3, `NewEventDrawer` ×1) —
  panneaux flottants, cohérence avec `.mt-select__menu`
- **7/14 déclarations CSS migrées**
- **+1 token migré** : `--color-input`

État vérifié par le lead sur `HEAD` : les 4 `SelectContent` sont bien les seules occurrences
applicatives restantes ; les autres références résiduelles sont les **assertions négatives** ajoutées
dans les 5 tests.

## Tests

- **5 tests mis à jour** (pas 4, pas 1) : `StateScreen.test.tsx` + les 4 tests de page auth qui
  assertaient `.bg-surface-2.border-rule-strong`. Assertions négatives ajoutées.
- **+1 test créé** : `frontend/src/styles/__tests__/control-border-tier.test.ts` (107 l.) — parcours AST
  PostCSS (réemploi de `PAT-S48-001`), liste blanche de sélecteurs de contrôle + témoin négatif.
  **Test de mutation effectué : il rougit bien** quand on remet un contrôle sur `rule-strong` ou quand
  `--color-input` change de tier.
- **Résultats :** 655/655 Vitest, 28/28 sur le périmètre de l'issue.
- `PIT-S48-002` évité : remplacement via `perl` conditionnel, aucun `emphasis-emphasis` produit (vérifié).

## Contrôle navigateur — ratios MESURÉS (`getComputedStyle`), pas supposés

`next dev` :3336 + Storybook :6336.

| Fond | Clair | Sombre |
|---|---|---|
| `bg` | **3.97** | **4.81** |
| `surface` | **4.07** | **4.49** |
| `surface-2` | **3.70** | **4.10** |

Tous ≥ 3:1. **`surface-2` (3.70, le pire cas) n'avait PAS été mesuré au Sprint 48** — point nouveau.

- `/fr/login` : 4.07 clair / 4.49 sombre (2 champs) · `/fr/register` : 4.07 / 4.49 (5 champs).
  Captures clair + sombre : bordures visibles, aucune régression de mise en page.
- Storybook : radio décoché **3.97**, switch off **3.97**, bouton outline **3.97** clair / **4.81** sombre
  — prouve que le chemin `--color-input` fonctionne. **Avant : 1.46.**
- Seule erreur console : `/auth/me` 404 (backend éteint), sans rapport.

## Critères d'acceptation

| # | Critère | État |
|---|---|---|
| 1 | Bordures fonctionnelles sur `--color-rule-emphasis` | **OK** |
| 2 | Contraste ≥ 3:1 (WCAG 1.4.11) | **OK** — mesuré, pas supposé |
| 3 | Tests assertant `border-rule-strong` mis à jour | **OK** — 5 trouvés |
| 4 | Validation visuelle clair/sombre auth + formulaire d'événement | **NON tenu intégralement** |

**Détail du critère 4 :** l'auth est validée en rendu réel clair + sombre. **`EventEditForm` n'a pas été
ouvert** : il exige une session, donc le backend, donc Docker — que **le briefing du lead interdisait
explicitement** (« ne lance pas la suite backend »). Contrainte créée par le lead, pas défaut de l'agent.
**Atténuation :** ses champs utilisent l'utilitaire **identique** (`bg-surface-2 border-rule-emphasis`)
dont le couple exact a été mesuré en navigateur (3.70 clair / 4.10 sombre). Le **contraste est prouvé** ;
le **risque visuel/layout propre à ce formulaire** ne l'est pas.
→ **À couvrir en Phase 6 (E2E) ou par contrôle navigateur du lead avant PR.**

## `a11y-audit.md` §6

**Mis à jour** : le ⚠️ devient ✅, avec la liste explicite des filets laissés décoratifs, le garde-fou
(test AST), et un ⚠️ résiduel sur `timeline.css`.

## Signaux mémoire

- **[MEMORY:pitfall]** Inventaire d'issue frontend : un grep sur `frontend/src/**` **rate**
  `frontend/app/**` (App Router hors `src/`). Le briefing #336 a ainsi « corrigé » l'issue **dans le
  mauvais sens** et sous-compté 10 occurrences + 4 tests. Prévention : toujours grep
  `frontend/src frontend/app` **ensemble**. Le piège était **déjà en mémoire projet** (« chemins
  fantômes, app router = `frontend/app/` ») — la rechute a eu lieu quand même.
- **[MEMORY:decision]** `--color-input` (shadcn) = tier **fonctionnel** ; `--color-border` = tier
  **décoratif**. C'est ce pont qui décide des bordures de champ, pas les `className`.
- **[MEMORY:pattern]** `PAT-S48-001` réutilisé sur un invariant de **token** (et non de cascade) :
  liste blanche de sélecteurs de contrôle + parcours AST + témoin négatif + test de mutation.

## Recommandations suite

**`RECOMMAND_UI_DESIGN`** — non bloquant, à trancher avant merge : les bordures de champ deviennent
nettement plus contrastées sur **toute** l'application (l'issue prévoyait « à valider auprès du design
avant merge »). Deux cas limites assumés par l'agent : `.mt-switch__track` (migré) et `.mt-card--hover`
(laissé).

**`RECOMMAND_FOLLOWUP`**
1. `ds/components/timeline.css` — 16 `rule-strong` non arbitrés (frise en refonte par #69). Taille **S**, `epic:design`.
2. `frontend/src/styles/landing.css` — **3 occurrences de `rule-strong`**, périmètre #335, non touchées comme instruit. À arbitrer.
3. Incohérence DS : `.mt-check__box` **n'a aucun consommateur applicatif** ; la vraie checkbox
   (`ui/checkbox.tsx`) est shadcn sur `border-primary` (mesuré 17.32:1 — conforme mais hors charte, le
   readme prévoit `rule-emphasis`). Taille **XS/S**.

**ABSORBED :** aucune.

STATUS: PARTIAL

---

## Traitement du `RECOMMAND_UI_DESIGN` — clôture 2026-07-28

**Non spawné, et voici pourquoi.** L'impact visuel large était **anticipé et accepté par l'issue
elle-même** (« à valider auprès du design avant merge »), et il va dans le sens de la **conformité** :
les bordures de contrôle passent de 1,46:1 à ≥ 3,70:1, mesuré sur 6 fonds. Aucun arbitrage n'annule ce
gain.

Les 2 cas limites signalés par l'agent ont été **revus par le reviewer batch** (`review-batch.md`), qui
juge l'arbitrage fonctionnel/décoratif **cohérent** et le choix de laisser `SelectContent` /
`.mt-select__menu` décoratifs **défendable** (cadre de popover, l'élévation porte la présence).

Une **dégradation** est apparue plus tard, du fait du correctif `button.tsx` et non de cette issue :
icône corbeille des catégories 4,76 → **3,87:1** en clair. Reste ≥ 3:1 (WCAG 1.4.11, non-texte).
**Signalée, non masquée**, et consignée dans le corps de la PR.

⇒ **Signal traité par revue croisée**, pas par spawn d'un `ui-design` supplémentaire.
