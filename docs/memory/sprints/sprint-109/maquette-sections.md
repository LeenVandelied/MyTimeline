# Extrait maquette — en-têtes de section (projet Claude Design `e8ce9db5…`)

> Relevé par le lead au `/sprint start 109` (2026-09-23) via `DesignSync get_file` sur
> `design_handoff_mytimeline/Dashboard.dc.html`, `Mobile Dashboard.dc.html` (racine du projet) et
> `design_handoff_mytimeline/Produits.dc.html`. Les subagents n'ont pas `DesignSync` : **ce fichier fait foi**
> pour #632 et #664. Extrait factuel, sans réinterprétation.

## Constat #664 : aucune section n'a de sur-titre dans la maquette

Le seul sur-titre de section de tout le tableau de bord est celui du hero (« 30 prochains jours », mono 10 px,
`.12em`, capitales, `ink-faint`), déjà livré via `DensityRibbon` (`.mt-eyebrow`). Les autres sections ont un
titre display 17 px (desktop) / 16 px (mobile), weight 600, et, pour certaines, un **compteur aligné à droite
du titre** (`display:flex; align-items:baseline; justify-content:space-between`) :

| Section maquette | Composant prod | Élément à droite du titre |
|---|---|---|
| « Cette semaine » (desktop) | `WeekAgenda` | `{n} événements` — mono **11 px**, `ink-muted`, sans capitales ; n = nb de lignes affichées |
| « Cette semaine » (mobile) | `CompactAgenda` | `{n} évén.` — mono **10 px**, `ink-muted` |
| « En bref » | `KpiMarginalia` | **rien** (titre seul) |
| « Tes produits » (desktop) | `ProductList` | `{n} produits` — mono 11 px, `ink-muted` ; n = nb total de produits |
| « Tes produits » (mobile) | `ProductCarousel` | `{n} produits` — mono 10 px, `ink-muted` |
| « Frise du produit » | `ProductDetailView` (sous-frise) | plage de dates `{début} – {fin}` (fmtShort « 12 AOÛ ») — mono 11 px, `ink-muted` |
| « Historique » | `ProductDetailView` (historique) | **rien** dans la maquette ; la prod a un compteur en eyebrow AU-DESSUS (DEC-S84-004) — **hors périmètre, conservé** (arbitrage dev S109) |

La maquette mobile n'a ni « agenda compact » ni « carrousel » propres : elle réutilise les listes « Cette semaine »
et « Tes produits ». La correspondance ci-dessus est donc par rôle.

**Arbitrage dev (2026-09-23)** : ajouter les compteurs à droite là où la maquette en a (semaine desktop + mobile,
produits desktop + mobile, plage de la frise produit) ; documenter l'absence voulue de sur-titre pour les 6 sections ;
« En bref » inchangé ; Historique inchangé.

## #632 : en-tête de date du tableau de bord

Maquette desktop : date au-dessus du « Bonjour, Camille » en `font-mono 10px; letter-spacing:.12em; uppercase;
color: ink-muted`. = la définition de `.mt-eyebrow` (10 px, `ink-muted`). **Le point laissé ouvert au S84
(« deux tailles d'eyebrow sur le dashboard, arbitrage designer ») est tranché par la maquette : `GreetingHeader`
passe sur `.mt-eyebrow`.** (Mobile : 9 px `ink-faint`, variante non reprise ; une seule classe.)

Les libellés de nav (« Navigation », 10 px `.14em` `ink-faint`) et « LANGUE » (10 px `.1em`) de la maquette sont
des eyebrows de navigation : déjà traités par `.mt-nav-label` (S84), hors périmètre.
