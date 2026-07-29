[BRIEFING UI-DESIGN — Sprint 53, issue #339 — VERDICT PRÉ-IMPLÉMENTATION]

## Où travailler (garde-fou)
Répertoire de travail OBLIGATOIRE : `/Users/herrh/VSProjects/MyTimeline/.claude/worktrees/nice-liskov-6059da`
Fais `cd` dessus explicitement en premier. Vérifie `git rev-parse --short HEAD` → doit valoir `2966994`.
Si tu vois autre chose, ARRÊTE et signale-le : tu es dans le mauvais dépôt.
⚠ `git log` et `git diff` sont filtrés par un hook RTK sur ce projet (les merges disparaissent, le diff
sort vide). Utilise `rtk proxy git log ...` / `rtk proxy git diff ...` si tu as besoin de l'historique.

## Ton rôle ici
Tu es **lecture seule**. Tu n'écris AUCUN code, AUCUN CSS. Tu rends un **verdict d'approche** que le
fullstack-dev appliquera ensuite. Ne propose pas de patch — propose une règle de décision.

## L'issue #339 (BUG, P2, size S, epic:design)
`frontend/src/styles/ds/tokens/base.css` déclare, **hors de tout `@layer`** (lignes 21-27) :

```css
h1, h2, h3, h4, h5, h6 {
  font-family: var(--font-display);
  font-weight: var(--weight-semibold);
  line-height: var(--leading-tight);
  letter-spacing: var(--tracking-tight);
  margin: 0;
}
```

Le CSS non-layerisé bat TOUJOURS le CSS layerisé, quelle que soit la spécificité. Les utilitaires
Tailwind vivent dans `@layer utilities`. Donc **tout `mb-*` / `mt-*` / `font-*` posé sur un titre est
silencieusement annulé** aujourd'hui.

Le S48 avait layerisé **uniquement** la règle sur `<a>` (cf. `DEC-S48-002`, et le commentaire de
cascade lignes 35-43 de `base.css`), précisément par peur des décalages de mise en page. Cette dette
est celle que #339 doit solder.

### Critères d'acceptation de l'issue
- [ ] **Décision prise sur l'approche** (layeriser `h1..h6` en bloc, OU migrer propriété par propriété
      / surface par surface avec vérification visuelle) ← **c'est TON livrable**
- [ ] Les classes `mb-*`/`font-*` sur des titres produisent l'effet attendu
- [ ] Aucune régression visuelle (landing, dashboard, etc.)
- [ ] Cas `FooterSection.tsx` corrigé et vérifié

## Faits déjà établis par le lead — ne les re-mesure pas, appuie-toi dessus
1. `base.css:21-27` : la règle `h1..h6` est bien hors layer. Premier `@layer base {` à la ligne 44.
2. **Dérive de ligne dans l'issue** : elle cite `FooterSection.tsx:41`. Le vrai `<h4 className="text-ink
   mb-3 font-bold">` est aux lignes **43, 63 et 78** — trois occurrences, pas une.
3. **Rayon de souffle : ~38 titres** portent un `mb-*`/`mt-*`/`font-*` aujourd'hui inopérant, répartis
   sur `components/landing/`, `components/dashboard/`, `components/settings/`, `components/products/`,
   `components/timeline/`, `components/shared/`.
4. Il existe un garde-fou de cascade **déjà écrit et de bonne qualité** :
   `frontend/src/styles/__tests__/base-layer.test.ts`. Il compile la vraie chaîne
   (`globals.css` + `@import 'tailwindcss'`) via PostCSS + `@tailwindcss/postcss`, puis assert sur
   l'AST que la règle `a` est dans `@layer base`, que les utilitaires sont dans `@layer utilities`, et
   que l'ordre déclaré met `base` avant `utilities`. Il porte un second test « le détecteur ne passe
   pas à vide ». **C'est le patron à étendre pour `h1..h6`** — lis-le avant de te prononcer.

## Ce que je te demande précisément

### Q1 — Quelles propriétés doivent rester gagnantes, quelles propriétés doivent céder ?
La règle pose 5 propriétés : `font-family`, `font-weight`, `line-height`, `letter-spacing`, `margin`.
Elles n'ont pas le même statut dans un design system :
- `font-family: var(--font-display)` est une **identité de marque** — un `mb-3` ne doit jamais la toucher,
  mais une utilitaire `font-sans` explicite devrait-elle pouvoir gagner ?
- `margin: 0` est un **reset**, pas une intention typographique.
- `font-weight: var(--weight-semibold)` est un **défaut** que `font-bold` doit visiblement pouvoir écraser
  (c'est exactement le cas `FooterSection` de l'issue).
Tranche pour chacune : « doit céder devant une utilitaire explicite » ou « doit rester gagnante ».

### Q2 — Bloc ou incrémental ?
Layeriser les 5 propriétés d'un coup réactive les ~38 sites simultanément. Est-ce le bon geste au vu de
la charte, ou faut-il scinder (p. ex. `margin` + `font-weight` dans `@layer base`, le reste hors layer,
ou tout dans `base` mais avec correction ciblée des sites qui bougent mal) ? Donne une recommandation
UNIQUE et défendable, pas un menu.

### Q3 — Liste des surfaces à inspecter à l'œil, par ordre de risque
À partir des ~38 sites, dis-moi **lesquels vont visiblement bouger** et lesquels sont neutres
(p. ex. un `font-semibold` utilitaire sur un titre déjà `semibold` = aucun changement). Classe par
risque décroissant. Cette liste devient la check-list de vérification navigateur clair+sombre du sprint.
C'est le livrable le plus utile pour la suite — sois concret, cite `fichier:ligne`.

### Q4 — Pièges de la charte
Y a-t-il des titres qui s'appuient AUJOURD'HUI sur `margin: 0` pour leur mise en page (p. ex. dans un
flex/grid avec `gap`, où une marge réactivée créerait un double espacement) ? Cite-les.
Regarde en particulier `components/timeline/` (`mt-drawer__title`, `mt-sheet__title`) et
`components/dashboard/` (titres `text-2xs uppercase` en `font-mono`).

## Sources à lire
- `frontend/src/styles/ds/tokens/base.css` (la règle + le commentaire de cascade lignes 35-43)
- `frontend/src/styles/ds/tokens/typography.css` et `fonts.css` (ce que la charte prévoit)
- `frontend/src/styles/__tests__/base-layer.test.ts` (le garde-fou à étendre)
- `docs/design/graphite-handoff.md` (la charte)
- `frontend/src/styles/ds/components/*.css` (les classes `mt-*` du DS — attention, `mt-` ici est le
  préfixe **MyTimeline**, PAS l'utilitaire Tailwind `margin-top`. Ne confonds pas.)
- Les fichiers cités en fait n°3.

## Rappel de posture (règle projet)
Pars du principe que l'énoncé de l'issue est incomplet et cherche la preuve du contraire.
« Je n'ai pas vérifié » est une réponse valide et préférable à une affirmation confiante non fondée.
Si tu ne peux pas trancher une question sans rendre la page dans un navigateur, DIS-LE explicitement
plutôt que de deviner — la vérification navigateur est déjà prévue en aval.

## Format de retour (STRICT, ~600 tokens max, style télégraphique, pas de prose)
```
VERDICT #339
Q1 propriétés: <par propriété — CÈDE | RESTE GAGNANTE + 1 raison courte>
Q2 approche: <recommandation unique + raison en 2 lignes>
Q3 surfaces à l'œil (risque décroissant):
  1. <fichier:ligne> — <ce qui bouge>
  ...
Q4 pièges margin:0 structurel: <fichier:ligne — pourquoi> | AUCUN
NON VÉRIFIÉ: <ce que tu n'as pas pu établir sans navigateur>
STATUS: COMPLETED
```
