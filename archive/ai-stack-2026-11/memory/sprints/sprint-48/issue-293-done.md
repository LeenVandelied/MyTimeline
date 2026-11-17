# Issue #293 — Token DS `--color-rule-emphasis` (bordures fonctionnelles AA ≥3:1)

**Sprint :** 48 · **Vague :** 1 · **Taille :** S · **Priorité :** P2 · **Epic :** `epic:design`
**Commit :** `e9a56df8fd48c8c18ad59f61e03e92851ffc74db`
**Branche :** `sprint/48` · **spawn-ref :** `417e5d71ecf2c8737a71374a1ffb858c2b157e2b`

## Objectif

Doter la charte Graphite d'un tier de bordure **fonctionnelle** atteignant le seuil WCAG 1.4.11 (≥3:1),
et supprimer l'emprunt au tier TEXTE (`--color-ink-muted`) fait au S39 faute de token adéquat (DEC-S39-001).

## Solution livrée

- **Nouveau palier de rampe** `--gray-450: #7A7E87` — **milieu arithmétique exact** de `gray-400` (150,154,163)
  et `gray-500` (94,98,107) → (122,126,135). Zéro hex arbitraire dans le bloc sémantique.
- **`--color-rule-emphasis: var(--gray-450)`** déclaré dans `:root` **ET** dans `.dark` —
  **même valeur dans les deux modes, non inversé** (choix documenté en commentaire `colors.css:102`).
- Exposé à Tailwind v4 via `@theme inline` (`globals.css:50`) → utilitaire `border-rule-emphasis`.
- `HeroSection.tsx:44` migré `border-ink-muted` → `border-rule-emphasis` ; docstring L17 réécrite.
- Documenté : tableau des 3 tiers dans `ds/readme.md`, §6 dans `ds/a11y-audit.md`.

## Ratios mesurés (WCAG 2.1, sRGB linéarisé) — **re-vérifiés indépendamment par le lead**

| Combinaison | Ratio | Seuil 3:1 |
|---|---|---|
| clair vs `--color-bg` `#FCFCFD` | **3.97** | ✅ |
| clair vs `--color-surface` `#FFFFFF` | **4.07** | ✅ |
| sombre vs `--color-bg` `#0B0C0E` | **4.81** | ✅ |
| sombre vs `--color-surface` `#131519` | **4.49** | ✅ |

Marge minimale 3.97 — aucun ratio limite. Hiérarchie préservée : le token reste **sous** `ink-muted`
dans les deux modes (4.07 < 6.11 clair ; 4.49 < 5.85 sombre) → il ne concurrence pas le tier texte.
Bonus mesuré : 3.70 vs `surface-2` clair / 4.10 sombre → viable pour les inputs (cf. follow-up).

## ⚠ Correction d'une hypothèse fausse du briefing lead

Le briefing affirmait (conclusion #2) qu'**une valeur unique partagée clair/sombre ne pouvait pas passer**.
**C'est faux, et le dev l'a démontré.** Le lead avait sur-généralisé à partir de candidats qui échouaient
chacun d'un côté (`gray-400` échoue en clair 2.75, `gray-500` échoue en sombre 2.99) — mais il existe une
**fenêtre de luminance commune** L ∈ [0.123, 0.292] où les deux contraintes tiennent simultanément.
`#7A7E87` (L ≈ 0.208) est dedans. Le lead a recalculé les 4 ratios : **confirmés**.
Les autres chiffres du briefing (rule 1.24, rule-strong 1.50, ink-muted 6.11) ont été vérifiés conformes par le dev.

## Critères d'acceptation

- [x] Token défini clair+sombre dans `colors.css` + exposé via `@theme` (`globals.css`)
- [x] Contraste ≥3:1 vérifié vs `bg` ET `surface`, clair+sombre (4/4, double vérification)
- [x] HeroSection migré `border-ink-muted` → `border-rule-emphasis`
- [x] Documenté dans `ds/readme.md` (tier fonctionnel vs `rule` décoratif)

## Fichiers touchés (6)

- `frontend/src/styles/ds/tokens/colors.css` (+14)
- `frontend/src/styles/globals.css` (+2) — mapping shadcn `--color-border` **non touché** (consigne respectée)
- `frontend/src/components/landing/HeroSection.tsx` (+12/-7) — L44 + docstring
- `frontend/src/components/landing/HeroSection.test.tsx` (+12)
- `frontend/src/styles/ds/readme.md` (+26)
- `frontend/src/styles/ds/a11y-audit.md` (+18)

Périmètre respecté : `HomePage.tsx` intact, `HeroSection.tsx:32` (`<Link passHref>`, #295) intact.

## Tests

`./scripts/test-quiet.sh frontend` → **599/599 OK** (69 fichiers).
Test hero durci : assert `border-rule-emphasis` + `not.toMatch(border-ink-muted)` + cadre décoratif reste `border-rule` nu.
Vérification supplémentaire hors jsdom : compilation Tailwind headless (postcss) confirme l'émission de
`.border-rule-emphasis { border-color: var(--color-rule-emphasis) }` résolvant `#7A7E87`.

**NON vérifié (déclaré par le dev) :** rendu visuel réel (pas de `next build`, pas de capture navigateur) ;
aucune spec E2E ne couvre la bordure du hero.

## Signaux mémoire

- `[MEMORY:decision]` **DEC-S48-293** — tier bordure fonctionnelle = `--color-rule-emphasis` `#7A7E87` (`--gray-450`),
  **non inversé** en sombre. Motif : seul palier ≥3:1 contre les 4 fonds ; l'inversion (gray-500 clair / gray-400 sombre)
  produirait des valeurs égales à `ink-muted` → token redondant, et `gray-500` en sombre tombe à 2.99 (échec).
- `[MEMORY:pitfall]` **Contraste bi-mode : la contrainte serrée change de fond selon le mode.** En clair c'est `bg`
  (plus sombre que `surface`) ; en sombre c'est `surface` (plus clair que `bg`). **Valider les 4 combinaisons, jamais 2.**
  Corollaire : ne pas conclure « impossible en valeur unique » sans chercher la fenêtre de luminance commune.
- `[MEMORY:pitfall]` **Tailwind v4 scanne les commentaires.** Citer `border-ink-muted` dans une docstring ou un test
  regénère l'utilitaire mort. Docstring hero reformulée pour citer le token, pas la classe.
- `[MEMORY:pattern]` **Assertion de classe en regex :** `\bborder-rule\b` matche `border-rule-emphasis`
  (le `-` est une frontière de mot) → faux positif. Utiliser `(?![-\w])`.

## Recommandations suite

Aucun `RECOMMAND_*` bloquant. Pour **#56 (vague 2)** : `border-rule-emphasis` est disponible et testé,
réutilisable tel quel sur les boutons outline de `HomePage.tsx`.

**RECOMMAND_FOLLOWUP — dette AA sur les bordures de contrôle hors hero [triage M | domaine frontend/design]**
`border-rule-strong` (1.46:1) sert de bordure fonctionnelle sur ~30 occurrences, toutes sous le seuil 1.4.11 :
champs `login`/`register`/`reset-password`/`forgot-password`, `StateScreen.tsx:49`, `ConflictDialog.tsx:199,223`,
`EventEditForm.tsx` (~14), `NewEventDrawer.tsx:206,213`, `BottomSheet.tsx:132`.
Migration = **M** (impact visuel large + 4 tests assertant `.bg-surface-2.border-rule-strong` à mettre à jour).
Inventaire consigné en §6 de `ds/a11y-audit.md`.

**ABSORBED :** §6 ajoutée à `ds/a11y-audit.md` (tableau des 3 tiers + inventaire de la dette) — hors critères
d'acceptation, mais §5.3 du fichier réclame « relancer le contrôle de contraste à chaque ajout de teinte ».

STATUS: COMPLETED
