# Sprint 83 — Traitement des signaux RECOMMAND_UI_DESIGN (et renvoi pour RECOMMAND_TEST_RUNNER)

> Rédigé au `/sprint end 83`. Le contrôle `check-sprint-completeness.sh` avait bloqué la
> clôture sur 7 signaux non tracés (3 × `RECOMMAND_TEST_RUNNER`, 4 × `RECOMMAND_UI_DESIGN`).
> Les `RECOMMAND_UI_DESIGN` étaient **réellement** non traités : trois issues de charte
> livrées sans que personne n'ait regardé le rendu. Ce document dit ce qui a été fait, et ce
> qui reste ouvert.

## 1. RECOMMAND_TEST_RUNNER (#518, #578, #642)

Traité par le lead ; détail et chiffres dans **`test-runner-par-le-lead.md`** (même dossier).

## 2. RECOMMAND_UI_DESIGN (#518, #574, #578, #642) — revue de charte + vérification navigateur

### 2a. Revue `ui-design` (subagent, lecture seule) — verdict : 2 ÉCART / 3 CONFORME / 1 INDÉTERMINÉ

| Q | Sujet | Verdict ui-design | Suite donnée |
|---|---|---|---|
| Q1 | Cartes auth : filet + `shadow-xs` (#574) | INDÉTERMINÉ | **Tranché au navigateur, §2b** |
| Q2 | Pilule de nav active graphite (#578) | ÉCART | **Tranché par la maquette, §2c — le code a raison, la doc DS avait tort** |
| Q3 | Delta 15→13px `SessionList` (#518) | CONFORME | 13 et 15 sont deux paliers consécutifs de l'échelle (`readme.md:67`) ; dates en mono = principe de la charte. Rendu non observé (exige un compte). |
| Q4 | `ThemeToggle` (#642) | CONFORME (tokens) + ÉCART (duplication) | Contrastes **mesurés au navigateur, §2b**. Duplication → follow-up. |
| Q5 | `HeroSection` `rounded-xl` | CONFORME | Cadre d'image, pas une carte : le plafond de 10px ne s'applique pas. |

### 2b. Vérification navigateur par le lead (Chromium, `next start` de PRODUCTION, 1280×900)

Mesures sur les valeurs **calculées par le navigateur** (`getComputedStyle`), pas sur les tokens déclarés.

**Carte `/fr/login`**

| | Clair | Sombre |
|---|---|---|
| Fond carte / fond page | #FFFFFF / #FCFCFD → **≈1,01:1** | #131519 / #0B0C0E → **1,07:1** |
| Filet vs page | #E6E7EB → ≈1,21:1 | #20232A → **1,24:1** |
| `shadow-xs` calculée | `rgba(16,18,29,.06) 0 1px 2px` | `rgba(0,0,0,.40) 0 1px 2px` |
| Lisible à l'œil | **Oui** — c'est le filet qui délimite | **Oui** — c'est le fond de la carte qui délimite |

Constat non vu par l'agent de #574 : **`shadow-xs` est pratiquement inerte en sombre** (ombre
noire sur fond quasi noir). L'ombre n'est donc ce qui rend la carte lisible **dans aucun des deux
thèmes** ; elle ajoute au plus un liseré inférieur en clair. Aucun de ces ratios n'atteint 3:1,
mais WCAG 1.4.11 vise les limites nécessaires pour **identifier un composant d'interface** — un
conteneur de carte n'en est pas un, les champs du formulaire portent leurs propres bordures.
**Verdict : lisible dans les deux thèmes ; `shadow-xs` est redondante, pas nuisible.**

**`ThemeToggle` (`auth-theme-toggle`)**

| | Clair | Sombre |
|---|---|---|
| Icône / fond | #16181D / #FCFCFD → **17,3:1** | #ECEDEF / #0B0C0E → **16,7:1** |
| Anneau `:focus-visible` (vraie navigation clavier) | 2px #0E5FC4, décalé 2px → **5,93:1** | 2px #4D9BFF, décalé 2px → **6,94:1** |

Une première lecture visuelle à l'échelle 0,8 laissait croire l'icône pâle en sombre : **fausse**,
réfutée par la mesure (réduction d'une icône de 16px à trait fin). Un focus programmatique
(`el.focus({focusVisible:true})`) ne déclenche PAS `:focus-visible` et rend « outline none » —
un faux négatif ; seule la touche Tab a donné une mesure valide.

**Constat nouveau — la bannière réseau recouvre le coin haut-droit.** Quand l'API est
injoignable, `network-banner` (sticky, `z-index: 80`, 32px) recouvre les **16px supérieurs** de la
bascule de thème **et** du sélecteur de langue (même conteneur `absolute; top:16px`). Test de
toucher : haut du bouton → bannière ; centre et bas → bouton. Le contrôle reste utilisable et le
focus reste partiellement visible (conforme à WCAG 2.4.11 AA, pas à 2.4.12 AAA).
**Antérieur au sprint** pour le sélecteur de langue ; #642 en hérite en se plaçant à côté.
N'apparaît que lorsque l'API est en panne — donc invisible pour `sprint-77-theme-visual`, qui
masque justement cette bannière (PIT-S77-010).

### 2c. La maquette consultée — #578 confirmée, la doc du DS corrigée

La revue ui-design relevait que `colors.css:74-90` désignait l'accent comme « l'encre de TOUT
état actif (lien de sidebar `AppShell`, onglet de `SettingsShell`…) », à l'inverse de ce que #578
a livré. L'agent de #578 n'avait pas ouvert la maquette ; l'issue l'affirmait sans la citer.

Lecture de `design_handoff_mytimeline/App.dc.html` (projet Claude Design
`e8ce9db5-cc08-42a5-8585-76e13a43f2f8`, via `DesignSync`, lecture seule) :

```css
.app-nav.is-active,.app-nav.is-active:hover{background:var(--color-primary);color:var(--color-primary-ink)}
```
et le bouton « Nouvel événement » : `background:var(--color-accent);color:var(--color-accent-ink)`.
Les libellés de nav : `font-family:var(--font-mono); text-transform:uppercase; letter-spacing:.06em`.

**#578 est conforme à la maquette** sur les deux points livrés. C'est le commentaire de
`colors.css`, écrit au S57 d'après le précédent interne, qui était faux : corrigé dans ce même
lot. La phrase du `README.md` du handoff (« accent pour aujourd'hui / actif ») est ambiguë et
contredite par son propre écran — le `.dc.html` fait foi.
Le point 3 de #578, laissé à **#575**, est confirmé réel : la maquette veut bien des libellés de
nav en mono capitales espacées.

## 3. Ce qui reste NON vérifié

- **Écrans authentifiés** (`SessionList`, sidebar `AppShell`, `SettingsShell`) : pas observés au
  navigateur — le backend e2e n'était plus disponible. Le delta 15→13px de `SessionList` et la
  pilule graphite en sombre restent jugés sur la charte et la maquette, pas sur un rendu.
- **Aucun lecteur d'écran réel** sur les `<time>` de #518.
- Métriques de largeur du header : macOS seulement ; c'est `landing-header-logo.spec.ts` en CI
  qui tranche.
- Références visuelles régénérées **sans backend** (écrans publics, `--no-deps`, conforme à la
  recette) : la CI, qui tourne avec un backend, reste l'arbitre final.

## Recommandations suite

- `RECOMMAND_FOLLOWUP` : retirer `shadow-xs` des 4 cartes auth ou l'assumer explicitement — inerte
  en sombre, redondante en clair `[XS | frontend]`.
- `RECOMMAND_FOLLOWUP` : décaler le conteneur langue/thème des pages auth sous la bannière réseau
  (ou réserver sa hauteur) — le recouvrement de 16px est antérieur au sprint `[XS | frontend]`.
- `RECOMMAND_FOLLOWUP` : converger les 3 gabarits de bascule de thème (`ThemeToggle`, `AppShell`,
  `MobileDrawer`) `[S | frontend]`.
- `RECOMMAND_FOLLOWUP` : vérification navigateur des écrans authentifiés du sprint (`SessionList`
  15→13px, pilule de nav en sombre) `[XS | frontend]`.
- Pas de nouveau `RECOMMAND_UI_DESIGN` : la revue de charte a eu lieu (§2a) et ses deux ÉCART sont
  traités (§2b, §2c) ou suivis.
- Pas de nouveau `RECOMMAND_TEST_RUNNER` : suites jouées par le lead, résultats au §1.

STATUS: COMPLETED
