[BRIEFING ISSUE #72]

## Garde-fou repertoire (LIRE EN PREMIER)
Tu travailles dans un WORKTREE. Avant toute action :
  cd /Users/herrh/VSProjects/MyTimeline/.claude/worktrees/sprint-69-d576fe
Verifie : `git rev-parse --show-toplevel` doit rendre ce chemin exact, et
`git branch --show-current` doit rendre `claude/sprint-start-72-320b8d`.
Si ce n'est pas le cas, STOP et remonte l'ecart. Ne travaille JAMAIS dans
/Users/herrh/VSProjects/MyTimeline (repo principal).

## Issue
[FEATURE] i18n : formats dates/nombres localises (Intl)

## AVERTISSEMENT — l'enonce de l'issue est PERIME
L'issue a ete redigee quand le code formatait les dates en dur via `dayjs`. Ce n'est
plus vrai. Le lead a verifie l'etat reel sur HEAD le 2026-09-04 :

DEJA LIVRE — NE PAS REFAIRE, NE PAS RE-AUDITER :
- `Intl.DateTimeFormat(locale, ...)` est utilise dans ~15 composants, la locale venant
  de `useLocale()` (next-intl). Points 1 et 5 de l'issue : faits.
- `dayjs` : **zero** occurrence dans `frontend/src`. `date-fns` : **zero** occurrence
  (ni import, ni `package.json`). Point 4 de l'issue : fait. Ne lance pas de
  desinstallation, il n'y a rien a desinstaller.

PERIMETRE REEL DE CETTE ISSUE — c'est le seul travail attendu :
1. **`Intl.NumberFormat` : zero occurrence dans tout le frontend.** Les nombres sont
   rendus bruts. Points de rendu identifies par le lead (liste de depart, pas
   exhaustive — verifie et complete) :
     - `components/dashboard/ProductCarousel.tsx:81`  `{count}`
     - `components/dashboard/ProductList.tsx:61`      `{count}`
     - `components/products/ProductDetailView.tsx:135,143` `{counts.active}` / `{counts.archived}`
     - `components/dashboard/DensityRibbon.tsx:88,121` `${b.count}` (dans un `title`)
2. **Les classes du Design System `mt-date--short` / `mt-num` sont appliquees dans
   ZERO composant.** Elles sont pourtant definies dans
   `frontend/src/styles/ds/components/i18n.css` et cette feuille EST bien chargee
   (`frontend/src/styles/globals.css:31`). Le code utilise a la place des utilitaires
   Tailwind ad-hoc (`font-mono ... tabular-nums`) qui font double emploi.
3. La convention posee par `i18n.css` est `<time datetime="..." class="mt-date--short">`.
   Il n'y a que **2** balises `<time>` dans tout le frontend
   (`dashboard/WeekAgenda.tsx:53`, `events/EventPreviewTimeline.tsx:243`).
4. Tests sur les 4 locales (fr/en/es/de) pour les affichages que tu modifies.

## Jugement attendu de ta part (ne pas appliquer mecaniquement)
Ne colle pas `mt-num` sur tout ce qui contient un chiffre. Ces classes servent
l'alignement en colonne et l'isolation bidi : elles ont du sens sur une date, un
compteur, une valeur tabulaire — pas sur un mot qui contient un nombre.
De meme pour `Intl.NumberFormat` : sur de petits compteurs entiers, le gain est nul
en fr/en/es/de. **Si tu conclus qu'un point de rendu n'a pas besoin d'etre change,
dis-le explicitement dans ton rapport avec la raison** — c'est une conclusion valable
et utile, pas un echec. Ce qui n'est pas acceptable, c'est de ne pas trancher.
La ou tu remplaces des utilitaires Tailwind par une classe DS, verifie que le rendu
ne change pas (taille, casse, graisse) : `.mt-date--short` impose `text-transform:
uppercase` et `font-size:11px`, ce que `font-mono tabular-nums` ne faisait pas.

## Plan d'implementation
inventaire verifie -> classes DS la ou elles ont du sens -> `Intl.NumberFormat` la ou
il a du sens -> tests 4 locales -> verification de non-regression FR.

## Piege connu de ce depot (PIT)
Les tests unitaires tournent sous jsdom. Un test qui asserte une chaine formatee est
valable ; un test qui pretendrait verifier une mise en page (largeur, alignement,
scroll) ne prouve rien sous jsdom. Reste sur des assertions de contenu textuel.
Attention aussi aux tests existants qui assertent des chaines FR en dur : si tu
changes un format, ils tomberont — c'est un signal, pas un obstacle a contourner.

## Triage
Taille: M (reduite de fait par le perimetre deja livre)
Modele: opus
Effort: high
