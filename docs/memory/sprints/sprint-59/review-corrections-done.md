# Corrections de review — Sprint 59 (Phase 7, cycle unique)

commits: `4cf19f2`

**1 MAJEUR + 6 MINEURS traités. Aucun cycle de re-review nécessaire.**

## [MAJEUR] Boucle `SCHEMES` — compromis appliqué, et JUSTIFIÉ PAR LA MESURE

Le reviewer recommandait le **retrait total** de la couverture du thème sombre. Le lead a imposé un
compromis : cas général en mono-thème + **un contrôle ponctuel** en sombre par spec.

**La mesure donne raison au compromis, contre le reviewer :** en injectant une règle
`.dark h1 { font-size: 33px }` → **10 passed / 1 failed**. **Seul le contrôle sombre la voit.**
Un retrait total, comme recommandé, n'aurait jamais vu ce défaut.

Implémentation : mesure en clair → `emulateMedia(dark)` → **égalité stricte de TOUTES les
métriques**. Le contrôle **asserte la présence de `.dark` sur `<html>`** avant de re-mesurer —
sans quoi il comparerait clair à clair et serait vacuous. Choix commenté en tête des deux fichiers
(« NE PAS rétablir »).

Suite `landing-*` : **82 → 68 tests** (typo 18→11, header-logo 18→11).

## [MINEUR] × 6

2. **`HeaderSection.tsx` re-mesuré en jammy** — un seul chiffre conservé, daté et sourcé, avec un
   tableau des 4 locales. Ajout explicite : les deux grandeurs sont **la même** (2 items flex,
   `justify-between`, nav en `display:none`).
   **Verdict : « 281 → 7 px » était PÉRIMÉ. La valeur est 5 px.**
3. **`frontend/e2e/support/dev-tooling.ts` créé**, importé par les deux specs.
   `landing-mobile-overflow` gagne `#__next-build-watcher` — la divergence est soldée, une seule
   source.
4. **Auto-contrôle** : champ `id` ajouté au relevé, assertion sur `#overflow-self-check`.
5. **`OUT_OF_SCALE`** : lookbehind `(?<!-)` → `--text-4xl` n'apparie plus. **Contre-épreuve faite** :
   token `--text-4xl` ajouté → garde-fou **VERT**.
6. **`walk()`** : `existsSync` + **plancher anti-vacuité `files.length > 50`** (316 fichiers réels) —
   le test ne peut plus passer en balayant zéro fichier.
7. **`leading-tight` retiré des `h1`/`h2`** de `HeroSection` et `HowItWorksSection` **uniquement**.
   **Aucun `leading-*` de `<p>` ou `<span>` touché.** `base.css:43` (« les 6 seuls titres ») corrigé
   — le commentaire devenait faux.

## Mesures

**Header à 320 px, jammy v1.61.1, 2026-08-16** (288 px utiles) :

| locale | requis | marge |
|---|---|---|
| `en` | 248 | 40 px |
| `fr` | 270 | 18 px |
| `es` | 278 | 10 px |
| **`de`** | **283** | **5 px** |

Logo 122 px partout, bord droit du groupe à 304 (16 px d'écran),
`scrollWidth == clientWidth == 320`.

## Non-vacuité — 4 injections, toutes rouges avec message nommé, toutes restaurées

- Chiffre d'étape en `text-lg` → rouge sur 4 locales × 8 paliers
- **Sonde renommée → rouge** (l'ancienne assertion `tag === 'div'` aurait été **VERTE**)
- Classe `text-4xl` → rouge
- **Règle `.dark h1 { font-size: 33px }` → 10 passed / 1 failed** — justification chiffrée du compromis

## Tests

`tsc` 0 erreur · prettier OK · eslint OK · unitaires **888/888** · `landing-*` **68/68** en jammy

## non_couvert

- jammy ≠ runner `ubuntu-latest` — **CI réelle non lancée**.
- **Seules les specs `landing-*` ont tourné** ; auth, timeline, settings non rejoués après ce commit
  (ils l'avaient été en Phase 6, avant ces corrections).
- Le contrôle sombre ne couvre **qu'1 palier × 1 locale par spec** (768/`de` et 1024/`de`) — c'est
  le compromis assumé, pas une couverture.
- « Aucune règle `.dark` ne touche `font-*` » vérifié **par grep** sur `src/styles/**`, **pas** par
  balayage des styles calculés sur tous les éléments.
- Les 4 `leading-tight` inertes restants non touchés (hors périmètre).

## [MEMORY:*]

- **[MEMORY:pitfall]** **Turbopack a servi un chunk CSS périmé** après édition de `globals.css` : la
  première passe du test `.dark` est sortie **22 passed = FAUX VERT**. `touch` et rechargement n'ont
  rien changé ; **seul un redémarrage du serveur de dev** a compilé la règle. Prévention : avant de
  conclure « le défaut injecté n'est pas vu », **`curl` le chunk CSS servi** et vérifier que
  l'injection y figure.
- **[MEMORY:pitfall]** Le port 3100 répondait **500** depuis un `next-server` du **même worktree**,
  mais cassé — **PIT-S52-002 confirmé une fois de plus**. Serveur propre monté sur 3123.

## Recommandations suite

- `RECOMMAND_FOLLOWUP` : 4 `leading-tight` inertes restants sur des `h2` (`CtaSection:38`,
  `TestimonialSection:21`, `MobileAppSection:28`, `FeaturesSection:29`) — même motif que le point 7.
  [triage XS]
- `RECOMMAND_FOLLOWUP` : **la marge du header en `de` à 320 px vaut 5 px, sous le plancher « deux
  chiffres » de `PIT-S52-001`.** Le prochain élargissement du groupe droit la fait basculer.
  [triage S]

STATUS: COMPLETED
