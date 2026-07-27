# ADR-006 — Route canonique de la landing : `/[locale]`

- Statut : Accepté
- Date : 2026-07-27
- Contexte : Sprint 48, issue #56 (décomposition de la landing + migration DS)

## Contexte

Deux routes rendaient **le même composant** `HomePage`, sans redirection ni
canonicalisation entre elles :

- `frontend/app/[locale]/page.tsx` — 6 lignes, `return <HomePage params={…} />`,
  avec un commentaire assumant le doublon (« Au lieu de rediriger, cette page
  fait la même chose que home/page.tsx ») ;
- `frontend/app/[locale]/home/page.tsx` — 6 lignes, strictement identique.

Deux URLs servaient donc un contenu identique en 200 (`/fr` et `/fr/home`) :
contenu dupliqué pour les moteurs de recherche, et ambiguïté pour tout
développeur ajoutant un lien vers l'accueil.

**Contre-intuitivement, c'est `/[locale]/home` qui était la route câblée de
fait.** Références internes trouvées (scan du dépôt) :

| Fichier | Usage |
|---|---|
| `frontend/app/page.tsx` | `redirect('/fr/home')` — la racine du site |
| `frontend/app/[locale]/(app)/dashboard/page.tsx` | `router.push(\`/${locale}/home\`)` |
| `frontend/app/[locale]/error.tsx` | lien de retour |
| `frontend/app/[locale]/not-found.tsx` | lien de retour |
| `frontend/app/error.tsx` | lien de retour |

Plus 5 assertions unitaires (`not-found.test.tsx`, `[locale]/error.test.tsx`,
`app/error.test.tsx`) et 1 entrée E2E (`e2e/auth-guard.spec.ts`, `PUBLIC_PATHS`)
verrouillant ces URLs.

## Décision

**`/[locale]` est la route canonique de la landing.** `/[locale]/home` est
conservée et **redirige en permanence** (308) vers `/[locale]`, via
`permanentRedirect()` de `next/navigation`.

Motifs :

1. **`/fr` est la racine de la locale**, au sens de `next-intl` configuré en
   `localePrefix: 'always'`. C'est l'URL qu'un visiteur tape, qu'un partage
   produit et vers laquelle pointeront les liens entrants. Faire de la racine de
   la locale une simple redirection vers un sous-segment est un anti-pattern SEO :
   on déplace l'autorité de l'URL naturelle vers une URL arbitraire.
2. **`/home` est un segment redondant** pour une page d'accueil : l'information
   « accueil » est déjà portée par la racine.
3. **La chaîne de redirection disparaît.** Avant : `/` → `/fr/home` (et `/fr`
   servait un doublon). Après : `/` → `/fr`, point final. Sous l'option inverse,
   `/fr` aurait dû rediriger vers `/fr/home`, laissant deux sauts pour un
   visiteur arrivant sur `/`.
4. **Le coût de bascule est borné et entièrement interne** : 5 `href`/`push`,
   5 assertions unitaires, 1 entrée E2E — tous énumérés ci-dessus, aucun hors
   du dépôt.

### Redirection, pas suppression

Aucune des deux routes n'est supprimée. Des liens entrants vers `/fr/home`
peuvent exister hors du dépôt (indexation, signets, partages) et doivent
continuer à aboutir.

### Pourquoi 308 (`permanentRedirect`) et non 307

Consolider l'autorité SEO sur `/[locale]` est l'objet même de cet ADR : un 307
temporaire indique aux moteurs de conserver l'ancienne URL dans l'index, ce qui
perpétuerait le doublon qu'on cherche à supprimer.

**Contrepartie assumée : un 308 est mis en cache durablement par les
navigateurs.** Revenir sur cette décision ne suffirait pas à « réparer » les
clients ayant déjà mis la redirection en cache — il faudrait servir un 307 vers
la nouvelle cible pendant une période de purge. C'est le coût d'un choix
délibérément durable, pas un oubli.

## Alternatives rejetées

- **`/[locale]/home` canonique (statu quo câblé).** Zéro churn de test, et c'est
  son seul avantage. Elle fige la racine de locale en simple redirection, garde
  un segment `/home` redondant et laisse `/` à deux sauts de la landing.
  Choisir cette option revenait à sélectionner l'URL techniquement inférieure
  pour éviter de modifier onze lignes de test mécaniques.
- **Supprimer `/[locale]/home`.** Interdit par l'issue et par le bon sens :
  404 sur des liens entrants existants.
- **Réécriture (`rewrite`) plutôt que redirection.** Servirait le même contenu
  sous deux URLs en 200 : c'est exactement le doublon de départ.

## Conséquences

- `frontend/app/[locale]/home/page.tsx` ne rend plus rien : il appelle
  `permanentRedirect(\`/${locale}\`)`.
- `frontend/app/page.tsx` redirige désormais vers `/fr` (et non `/fr/home`).
- Les 4 liens de retour applicatifs (`error.tsx` ×2, `not-found.tsx`,
  `dashboard/page.tsx`) pointent sur `/${locale}`.
- `e2e/auth-guard.spec.ts` — `PUBLIC_PATHS` teste `/fr` au lieu de `/fr/home` :
  l'assertion du fichier est `status === 200`, or `/fr/home` répond désormais 308.
  Sans ce changement, la spec E2E rougirait.
- `src/lib/auth-guard-paths.ts` est **inchangé** : `/fr/home` reste un chemin
  public non protégé (il doit pouvoir être atteint pour être redirigé), et son
  test unitaire reste valide tel quel.
- Les `data-testid` des liens de retour (`not-found-home-link`,
  `global-error-home-link`, `error-home-link`) sont **conservés** : seul leur
  `href` change, les sélecteurs E2E existants restent valides.
