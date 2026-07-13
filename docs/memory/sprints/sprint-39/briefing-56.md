[BRIEFING ISSUE #56 — Sprint 39 « Lisibilité Landing »]

## ⚠ Garde-fou worktree (LIRE EN PREMIER — pitfall récurrent sur ce projet)
Tu tournes dans un worktree partagé. AVANT toute action :
```
cd /Users/herrh/VSProjects/MyTimeline/.claude/worktrees/sprint-31-start-44258d
git branch --show-current   # DOIT afficher exactement : sprint/39
```
Si la branche n'est pas `sprint/39` → STOP, ne code rien, retourne STATUS: PARTIAL + BLOQUE_SUR "mauvaise branche/cwd".
Ne travaille QUE dans ce répertoire. Ne touche JAMAIS au repo principal `/Users/herrh/VSProjects/MyTimeline/` hors worktree.

## Issue
**#56 — Frontend : migrer la Landing page sur le DS + décomposer le monolithe**

⚠️ **PÉRIMÈTRE RESTREINT PAR L'ARCHITECTE — SLICE CONTRASTE HERO UNIQUEMENT.**
L'issue GitHub #56 est un L complet (décomposition en 8 sections, animation timeline, footer→pages légales, dédup routes). **Rien de tout ça ce sprint.** Le sprint 39 est « démo-first » : corriger la première impression illisible du hero observée en live.

**CE QUE TU DOIS FAIRE (et RIEN d'autre) :**
1. **Extraire le Hero** du monolithe `frontend/src/components/pages/HomePage.tsx` (bloc `{/* Hero Section */}`, ~lignes 90-126) dans un nouveau composant `frontend/src/components/landing/HeroSection.tsx`. Extraction **non destructive** : `HomePage.tsx` continue de rendre `<HeroSection locale={locale} />` à la place du bloc inline. Les 7 autres sections restent EXACTEMENT en place dans HomePage.tsx — tu n'y touches pas.
2. **Corriger le contraste du hero** en clair ET en sombre pour atteindre **WCAG AA** : texte normal **≥ 4.5:1**, gros texte / composants UI / bordures **≥ 3:1**.
3. **Test RTL** : `HeroSection` rend en clair ET en sombre, textes clés présents, zéro couleur hex hardcodée.

**HORS PÉRIMÈTRE (→ backlog, NE PAS FAIRE) :** décomposer les 7 autres sections, animation timeline horizontale, brancher footer sur pages légales, dédup routes `/[locale]` vs `/[locale]/home`, ajout de dépendance. `framer-motion` est déjà présent mais l'animation est hors slice.

## Plan d'implémentation (architecte, /sprint plan)
```yaml
issue_0056:
  scope: slice-contraste-hero UNIQUEMENT (pas toute la L — reste au backlog)
  fichiers_cles:
    - frontend/src/components/pages/HomePage.tsx        # monolithe ~308 l., source du hero
    - frontend/src/components/landing/HeroSection.tsx   # à créer (extraction hero)
    - frontend/src/styles/ds/tokens/colors.css          # SI un token VALUE doit changer
  couches_touchees: [frontend]
  strategie_test:
    - "RTL: HeroSection rend en clair ET sombre sans couleur hardcodée"
    - "contraste hero WCAG AA (>=4.5:1 texte normal, >=3:1 gros/UI)"
  risque_regression: MOYEN — extraction partielle peut casser layout sections voisines; isoler HeroSection, ne pas toucher les 7 autres blocs
  ordre_ecriture: [extraire HeroSection, brancher tokens clair/sombre, corriger contraste, test RTL]
  possibly_done: false
```

## Triage
Taille: L (réduit à ~M par le slice) · Modèle: opus · Effort: xhigh

## Contexte technique VÉRIFIÉ par le lead (fie-toi à ça, pas de devinette)

### Le système de tokens EST déjà câblé et fonctionne
Le hero utilise DÉJÀ des tokens sémantiques (`bg-bg`, `text-ink`, `text-ink-muted`, `text-accent`, `bg-accent`, `text-accent-ink`, `border-rule`…). Le wiring Tailwind v4 est bon :
- `frontend/src/styles/globals.css` : `@import 'tailwindcss'` + `@import './ds/tokens/colors.css'` + bloc `@theme inline { --color-bg: var(--color-bg); … }` → les utilitaires `bg-bg`/`text-ink`/`text-accent` résolvent et suivent clair/sombre.
- Donc **le problème n'est PAS un wiring manquant, c'est un problème de VALEUR de token ou d'USAGE**.

### Valeurs de tokens actuelles (`frontend/src/styles/ds/tokens/colors.css`)
CLAIR (`:root`) : `--color-bg: #FCFCFD` · `--color-ink: #16181D` · `--color-ink-muted: #5E626B` (gray-500) · `--color-ink-faint: #969AA3` (gray-400) · `--color-accent: #1170E4` (blue-500) · `--color-accent-ink: #FFFFFF` · `--color-rule: #E6E7EB` (gray-100, bordure très claire) · `--color-rule-strong: #D1D3D9`.
SOMBRE (`.dark`) : `--color-bg: #0B0C0E` · `--color-ink: #ECEDEF` · `--color-ink-muted: #8E9299` · `--color-accent: #4D9BFF` (blue-400) · `--color-accent-ink: #0B0C0E`.

### Suspects de contraste dans le hero (à mesurer et corriger si < seuil)
- **Sous-titre** `text-ink-muted text-xl` (HomePage l.96) : gray-500 sur bg quasi-blanc ≈ ~6:1 → probablement OK, vérifie.
- **CTA primaire** `bg-accent … text-accent-ink` (l.99) : blanc sur `#1170E4` ≈ **~4.3:1** → SOUS 4.5:1 pour texte normal, limite pour gros texte (≥3:1 OK car bouton `text-lg`). Vérifie et corrige si le bouton n'est pas « gros texte » (gros = ≥18.66px bold ou ≥24px).
- **Bouton secondaire** `border-rule text-ink` (l.106) : `--color-rule` = gray-100 (`#E6E7EB`) = bordure quasi invisible sur bg → contraste UI < 3:1. Passe sur `border-rule-strong` (ou token plus contrasté) pour rendre la bordure visible ≥ 3:1.
- **Interdit** : aucun texte essentiel ne doit utiliser `text-ink-faint` (~2.8:1, tier décoratif par design, cf. `ds/readme.md`).

### Priorité de correction
1. **Privilégier une correction d'USAGE** (changer la classe token utilisée dans le hero : ex. `border-rule` → `border-rule-strong`). Blast radius = hero seul.
2. **Changer une VALEUR de token dans `colors.css`** SEULEMENT si le token lui-même est sous-AA de façon globale (ex. si `text-accent-ink`/`bg-accent` échoue). Attention : ça impacte toute l'app (c'est acceptable et souhaitable si le token était vraiment sous-AA, mais documente-le). Le fichier `colors.css` t'appartient pour ce sprint.

### Vérification contraste
Calcule les ratios (formule WCAG relative luminance) pour chaque paire texte/fond du hero, clair ET sombre. Documente les ratios avant/après dans ton retour. Si tu peux booter le dev server pour un contrôle visuel, tant mieux, mais ce n'est pas obligatoire — l'analyse statique des ratios suffit pour cette slice.

## Context-pack frontend (conventions RÉELLES — respecter)
- **Next.js 15 App Router**, **React 18.3.1** (⚠ PAS React 19 : `React.use()` n'existe pas), **TS strict** (zéro `any`, zéro `as` injustifié), Tailwind v4, shadcn/ui `new-york`, lucide-react, next-themes (clair/sombre).
- **Server Components par défaut** ; `'use client'` UNIQUEMENT si hooks/handlers. HomePage est déjà `'use client'` (IntersectionObserver). `HeroSection` extrait n'a pas de hook propre → tu PEUX le laisser Server Component (il reçoit `locale` en prop, utilise `useTranslations`/`Button`/`Link`/`Image`). Mais `useTranslations` de next-intl marche en Server Component App Router — OK. Le plus simple/sûr : composant sans `'use client'` recevant `locale: string`. Choisis le plus simple qui compile.
- **i18n** : `useTranslations()`, réutilise les clés EXISTANTES `t('common.landing.hero.title'|'subtitle'|'cta'|'secondary')` et `t('common.login.title')`. AUCUNE string FR hardcodée, AUCUNE nouvelle clé i18n.
- **Éviter les hex inline** → tokens CSS du DS exclusivement.
- **Tests Vitest + RTL** (jsdom). Setup `vitest.setup.ts` mocke `next/font`, `next/navigation`, `matchMedia`. Pour tester le rendu sombre : applique la classe `.dark` ou `[data-theme="dark"]` sur un wrapper, OU vérifie que les classes token theme-aware sont présentes (les valeurs CSS ne sont pas calculées en jsdom — teste donc la présence des classes token + l'absence de hex, pas les ratios calculés).
- ⚠ Un run vitest vert ne garantit pas le build : le code doit compiler en TS strict.

## Dépendances intra-sprint
- Aucune. #146 (auth) tourne en parallèle sur des fichiers disjoints.

## Fichiers que tu possèdes / fichiers INTERDITS
**Tu possèdes :** `frontend/src/components/pages/HomePage.tsx`, `frontend/src/components/landing/**` (nouveau), `frontend/src/styles/ds/tokens/colors.css`, `frontend/src/styles/globals.css`, et un fichier de test `frontend/src/components/landing/HeroSection.test.tsx`.
**INTERDITS (possédés par #146 en parallèle) :** tout `frontend/app/[locale]/{login,register,forgot-password,reset-password}/**`, les primitives `frontend/src/components/ui/{button,input,form}.tsx`. Ne les touche pas.

## ⚠ PROTOCOLE COMMIT — NE COMMITE PAS (crucial : worktree partagé, index git en course)
Deux subagents éditent en parallèle dans le MÊME working tree. Un `git add`/`git commit` concurrent contaminerait les commits (index partagé). Donc :
- **NE FAIS AUCUN `git add`, AUCUN `git commit`.** Laisse tes changements dans le working tree, non stagés.
- Le LEAD sérialise les commits après ton retour.
- Dans ton retour, donne : la **liste exacte des fichiers modifiés/créés** (chemins complets) + un **message de commit gitmoji français** proposé (ex. `:lipstick: Extraire HeroSection + corriger contraste hero WCAG AA (#56)`).

## Tests
Lance les tests frontend de ta zone (pas toute la suite) :
```
./scripts/test-quiet.sh frontend   # si le scope frontend existe
# sinon, cible ton test :
cd frontend && npx vitest run src/components/landing/ 2>&1 | tail -30
```
Rapporte passed/failed. Si la commande de test échoue pour une raison d'infra, dis-le explicitement (ne prétends pas vert).

## Livrable attendu (format strict, MAX 500 tokens, style caveman)
RETOUR :
- fichiers_modifies: [chemins exacts]  ← PAS de SHA (tu ne commites pas)
- commit_msg_propose: ":lipstick: …(#56)"
- resume: <ce qui a été extrait + contrastes corrigés (ratios avant→après clair/sombre) + fichiers>
- contraste: <tableau bref paire texte/fond → ratio avant→après, clair+sombre>
- pitfalls: <si découverts>
- tests: <passed/failed + commande utilisée>
- [MEMORY:*] signaux si applicable (ex. [MEMORY:decision] si un token value a changé globalement)
- recommandations suite: <RECOMMAND_FOLLOWUP pour le reste du L non fait (décompo 7 sections, anim, footer, dédup routes), ou autre>
- STATUS: COMPLETED (ou PARTIAL + BLOQUE_SUR) en dernière ligne
