# Issue #299 — [FEATURE] Intégrer settings/ sous le shell applicatif

**Sprint :** 57 | **Vague :** 1 (parallèle avec #312) | **Taille :** S | **Domaine :** design / auth
**Commit :** `6c830eb` — `:lipstick: feat(settings): intégrer les Réglages sous le shell applicatif (#299)`

> ⚠ Le `git mv` (rename R100 `settings/page.tsx → (app)/settings/page.tsx`) a été **avalé par le
> commit `1651f9a` de #312**. `6c830eb` ne porte que les 7 modifications de contenu. L'état de
> l'arbre est correct ; seule l'attribution est fausse. Cf. pitfall plus bas.

## Objectif

Supprimer la rupture de structure entre le dashboard et les réglages : `settings` vivait hors du
route group `(app)/` avec son propre chrome et sa propre nav verticale de 220 px.

## Structure retenue (arbitrage `ui-design`, appliquée sans dérive)

`settings` passe sous `(app)/` — **URL `/[locale]/settings` inchangée** (un route group est
transparent). La sidebar `AppShell` devient la **seule** nav verticale. `SettingsShell` est conservé
(pattern tablist intact) mais sa nav 220 px devient une **barre d'onglets horizontale**.

## Fichiers

| Fichier | Changement |
|---|---|
| `app/[locale]/(app)/settings/page.tsx` | déplacé + réécrit : garde d'auth locale, `settings-loading`, `LanguageSelector` et header `border-b` pleine largeur supprimés ; `settings-back` conservé en `lg:hidden` ; un seul `<h1>` |
| `src/components/settings/SettingsShell.tsx` | nav verticale → onglets horizontaux (`flex-row`, `overflow-x-auto`, jamais `flex-wrap`), `aria-orientation="horizontal"`, items `h-11 shrink-0`, **classes de couleur inchangées** |
| `src/components/settings/SettingsShell.test.tsx` | cas `aria-orientation` adapté + cas ←/→ ajouté |
| `src/lib/auth-guard-paths.ts` (+ `.test.ts`) | garde de routes, cf. section dédiée |
| `src/components/layout/AppShell.tsx` | JSDoc corrigé (il affirmait que settings restait hors du groupe) |
| `app/[locale]/(app)/layout.tsx` | JSDoc corrigé (idem) |

`src/components/settings/mobile/**` : **inchangé**. Tous les `data-testid` du contrat : **préservés**.

## ARIA / clavier

Tablist conservé (les chapitres commutent un panneau dans la même URL — une nav de liens aurait été
sémantiquement faux). `←/→` deviennent les touches primaires (orientation horizontale, WAI-ARIA APG),
`↑/↓` **conservées en alias** parce que `settings-navigation.spec.ts:51` asserte `ArrowUp`.
`Home`/`End` et le roving `tabIndex` inchangés.

## Garde de routes (dépendance dure vers #318)

- `PROTECTED_APP_SEGMENTS = ['dashboard', 'products', 'settings', 'timeline']`
- `PROTECTED_EXTRA_SEGMENTS = []` — constante **conservée** avec un JSDoc expliquant pourquoi elle
  est vide (ne pas la supprimer : #318 doit pouvoir asserter qu'elle l'est)
- `PROTECTED_SEGMENTS` inchangé **en valeur**

Preuves que `/settings` reste protégé : test unitaire ajouté
(`isProtectedPathname('/fr/settings')` et `/en/settings` → `true`) ; `auth-guard.spec.ts:29` liste
`/fr/settings` et passe (307 vers login) ; observé en direct — navigation vers `/fr/settings` sans
cookie atterrit sur `/fr/login`.

> Conséquence pour **#318** : la synchronisation des constantes est faite. Il reste **le cœur de
> l'issue** — le test filesystem `readdirSync` qui échoue si l'arborescence diverge. Et le terrain
> est désormais propre : `(app)/` contient exactement les 4 segments de `PROTECTED_APP_SEGMENTS`.

## Vérification navigateur (stack réelle : Next dev :3000 → backend docker :8080, compte réel)

**Vu, clair ET sombre :**

| Palier | Observé |
|---|---|
| 390 | 0 sidebar, `settings-index` monté, `settings-tablist` **absent du DOM**, retour visible |
| 768 | 0 sidebar, 0 nav verticale, onglets horizontaux w=720 pleine largeur, retour visible |
| 1024 | sidebar 248 px, retour masqué, contenu 776 = 1024 − 248, **exactement 1 nav verticale** |
| 1280 | idem, contenu 1032, tablist 984, **0 scroll horizontal** |

Débordement des onglets : locale **DE** (libellés les plus longs) à 768 px = 484/720 px, pas de
scroll. À 390 px le tablist déborde mais scrolle **dans son conteneur** (475 > 358), la page ne
scrolle pas. Clavier navigateur : ←/→ et ↑/↓ commutent onglet + panneau. `NewEventDrawer` ouvert
depuis `/settings` : s'ouvre, focus piégé sur close, Échap restaure le focus, 0 erreur.

## Contrastes — MESURÉS (ratios réels sur couleurs composites)

| | Ratio | Verdict |
|---|---|---|
| Clair — onglet **actif** `#1170E4` / `#DBE9FC` | **3.83:1** | ⚠ **ÉCHEC** (17px/500 → AA exige 4.5) |
| Clair — onglet inactif `#5E626B` / `#FCFCFD` | 5.96:1 | ✅ |
| Sombre — onglet actif `#4D9BFF` / `#16263A` | 5.43:1 | ✅ |
| Sombre — onglet inactif `#8E9299` / `#0B0C0E` | 6.26:1 | ✅ |

**L'échec est PRÉ-EXISTANT, pas introduit par #299** : le lien actif de la sidebar `AppShell` mesure
**exactement 3.83:1**, même couple `bg-accent-soft` / `text-accent`, que l'arbitrage designer
imposait de reprendre à l'identique. Dette du design system, pas régression de cette issue.

## Tests

- Unitaires frontend : **842/842** vert (suite complète)
- E2E : **37/37** vert, 0 échec, 34 s en `--workers=1` (6 specs settings + `auth-guard.spec.ts` + setup)
- `tsc` : vert — `next build` : vert, route `/[locale]/settings` toujours SSG sur 4 locales

⚠ `npm run lint` sort 1 **en local**, uniquement sur `next-env.d.ts` (triple-slash-reference, fichier
généré et tracké, non touché par cette issue). La CI est verte sur ce même fichier au commit de base
`6f89c87` → artefact d'environnement local, pas une régression. **À confirmer en CI.**

## Pitfalls

`[MEMORY:pitfall]` — **Un `git mv` stagé est du butin pour le commit du voisin.** Contexte : fan-out
`/sprint`, 1 working tree partagé. Un `git mv` laisse un rename **stagé dans l'index commun** ;
l'agent #312 a committé et a emporté ce rename frontend dans `1651f9a`. Remède appliqué : constater
via `git show --name-status`, **ne pas re-mover**, committer les modifications de contenu par-dessus.
Prévention : ne pas laisser un `git mv` stagé — committer le déplacement seul immédiatement, ou
faire le move juste avant le commit final. Complémentaire du pitfall de #312 (`git commit` sans
pathspec commite tout l'index).

`[MEMORY:decision]` — **Un seul `<h1>` à tous les paliers.** La section CHROME de l'arbitrage exige
de garder le `<h1>` ; la section PALIERS dit « header `lg:hidden` disparaît ». Les deux ensemble
imposeraient 2 `<h1>` dans le DOM. CHROME a été traitée comme normative, PALIERS comme descriptive :
seul `settings-back` est `lg:hidden`, pas tout le header.

## Recommandations suite

- **`RECOMMAND_FOLLOWUP` — contraste DS (le plus important)** : `text-accent` sur `bg-accent-soft`
  = **3.83:1** en clair, sous AA, sur **tout état actif** du produit (sidebar `AppShell` + onglets
  settings). Correctif = **token**, pas composant. **3ᵉ incident de contraste du projet** (après S48
  et S53). Dépasse le périmètre de #299.
- `RECOMMAND_FOLLOWUP` — bug i18n `DensityRibbon` : `{days}` non fourni, `IntlError` à chaque rendu
  du dashboard (`src/components/dashboard/DensityRibbon.tsx:54` et `:167`). Pré-existant, hors scope.
- `RECOMMAND_FOLLOWUP` — `npm run lint` local rouge sur `next-env.d.ts` : divergence local/CI à
  trancher (ignore eslint ou régénération).
- Rien à signaler pour **#398** : `settings-preferences.spec.ts` n'a pas été éditée et passe verte.

**Non vérifié (déclaré) :** rien en CI (local uniquement) ; E2E joués contre le backend docker du
sprint 52, pas un build de cette branche — acceptable, le changement est 100 % frontend.

STATUS: COMPLETED
