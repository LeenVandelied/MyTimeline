# Suivi #347 — débordement 1 px à 320 px en `de`

commits: 9350a77

verdict_origine: **PRÉ-EXISTANT, révélé par le nouveau test** (pas causé par #347).
Preuve = mesure, pas raisonnement : la spec `landing-mobile-menu.spec.ts` du HEAD
exécutée contre le serveur de `origin/dev` (a2d8e8e — seuil encore `md`, zéro
changement #347) dans `mcr.microsoft.com/playwright:v1.61.1-jammy` sort la chaîne
d'erreur IDENTIQUE à la CI : `débordement à 320 px en de : scrollWidth=321 > 320`.
Le même conteneur sur le HEAD sprint/52 avant correctif : 321 aussi. Identiques
→ #347 n'y est pour rien. Ce qui bascule est l'OS : #347 n'a fait qu'étendre
l'assertion de 375 px aux 6 paliers × 4 locales, ce qui l'a rendu visible.

element_fautif: groupe droit du header `div.flex.items-center.gap-2` —
bord droit 321 px pour 320 de viewport (+1). À 320 px le header a 288 px utiles
(`px-4`) et empile 3 blocs incompressibles : logo 122 (`whitespace-nowrap`, #334)
+ CTA + `gap-2` 8 + burger 44. Mesuré sous Linux, largeur du CTA par locale :

    locale | CTA | requis | bord droit | marge avant débordement
    en     |  92 | 266    | 304        | 16 px
    fr     | 117 | 291    | 307        | 13 px
    es     | 126 | 300    | 316        |  4 px   <- à 4 px du même échec
    de     | 131 | 305    | 321        | -1 px   <- ÉCHEC CI

resume: correctif sur le PALIER, pas sur la locale — corriger `de` seul aurait
laissé `es` à 4 px du même basculement d'OS. Sous `max-[360px]` le CTA reprend
les métriques horizontales de la taille `sm` du DS (`px-3` + `text-xs`,
cf. `button.tsx`) SANS sa hauteur `h-8` : `h-11` reste, la cible tactile 44 px
de #334 est préservée ; `gap-2` → `gap-1`. Les 4 locales finissent à 304 px,
dans la boîte de contenu, 16 px de marge. Seuil purement CSS, aucun `matchMedia`
ne le double (contrairement à `lg`, non touché). Ligne 134 (`hover:bg-accent` +
`hover:text-accent-ink`) NON touchée. Test non affaibli : aucune tolérance,
aucune locale retirée, aucun skip.

tests:
- `npx playwright test landing-mobile-menu.spec.ts --no-deps` dans
  **`playwright:v1.61.1-jammy`** (serveur `npm run dev` sur l'hôte, comme en CI)
  → **21/21 passed**, dont `320 px — les 4 locales` et les 5 autres paliers.
- Même commande contre le serveur `origin/dev` **avant** correctif → **1 failed**,
  erreur identique à la CI (= l'instrument reproduit bien le défaut).
- Géométrie re-mesurée à 320/360/375/390 × 4 locales : écart 0 partout ;
  360/375/390 au pixel identiques à avant (CTA 131/126/117/92).
- `./scripts/test-quiet.sh frontend` (macOS) → **825 passed / 0 failed**,
  dont les gardes AST `landing.hover-pairing` et `button.hover-pairing`.
- `npx tsc --noEmit` → 0 erreur.

environnement_ci_reproduit: **OUI, partiellement** — navigateur + polices Ubuntu
via l'image `playwright:v1.61.1-jammy` (Docker), serveur Next servi depuis l'hôte
macOS et atteint par `host.docker.internal`. Le rendu (seule variable en cause)
est donc bien celui de Linux ; validé par le fait que le conteneur reproduit
l'échec CI au caractère près. Ce n'est PAS `ubuntu-latest` du runner GitHub :
l'image jammy peut avoir un jeu de polices légèrement différent.

non_couvert:
- Le vrai runner `ubuntu-latest` n'a pas été utilisé — seule la CI sur la PR le
  fera. Le correctif rend 16 px de marge (vs -1), la sensibilité aux polices est
  donc très réduite, mais **non nulle et non vérifiée sur le runner réel**.
- Rendu visuel du CTA rétréci à 320 px **non inspecté à l'œil** (pas de
  screenshot revu) : seules les largeurs sont mesurées. `text-xs` = 15 px DS.
- Aucun contrôle de contraste refait sur le CTA rétréci (taille change, pas les
  couleurs — a priori sans effet, non mesuré).
- Les autres specs E2E (105 tests) n'ont pas été rejouées : seul le header de la
  landing est touché, mais je ne l'ai pas prouvé.
- La suite backend n'a pas été lancée (aucun fichier backend touché).

recommandations suite: aucune.

## PIT à retenir

Mesurer un débordement de mise en page **sur macOS uniquement ne prouve rien** :
les métriques de police diffèrent de Linux, et `de` est la locale la plus large.
#334 (S49) puis #347 (S52) ont tous deux conclu « écart 0 partout » depuis macOS ;
les deux fois la CI Ubuntu a démenti. Tout budget de largeur doit être mesuré
dans l'image Playwright, et viser une marge à deux chiffres — un correctif qui
laisse 0 à 4 px de marge (ici `es`) est un échec CI en attente.
