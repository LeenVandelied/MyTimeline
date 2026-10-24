# Extrait maquette — Landing, section « Comment ça marche » et bande « avis »

> Lu par le lead le 2026-09-22 via DesignSync `get_file` sur le projet des maquettes
> `e8ce9db5-cc08-42a5-8585-76e13a43f2f8`, fichier `Landing.dc.html` (racine du projet).
> Les sous-agents n'ont pas accès à DesignSync : **ce fichier est leur source de vérité**.
> Extrait factuel (styles inline recopiés), pas d'interprétation hors section « Arbitrages ».

## 1. Section « Comment ça marche » (cible #612)

Conteneur : `<section id="produit" style="max-width:1340px;margin:0 auto;padding:40px 40px 64px;">`

| Élément | Style maquette |
|---|---|
| Surtitre « Comment ça marche » | `font-family:var(--font-mono); font-size:11px; letter-spacing:.16em; text-transform:uppercase; color:var(--color-ink-muted); margin-bottom:10px` |
| `h2` « La même frise, du rappel à l'échéance. » | `font-family:var(--font-display); font-size:35px; font-weight:600; letter-spacing:-.02em; margin:0 0 8px; max-width:680px; text-wrap:balance` — **aligné à gauche** (pas de `text-center`) |
| Paragraphe | `font-size:16px; color:var(--color-ink-muted); max-width:560px; margin:0 0 44px` — texte : « Chaque événement vit sa vie sur la frise. Voici comment MyTimeline t'accompagne, du premier rappel jusqu'au renouvellement. » |
| Conteneur frise | `position:relative` |
| Ligne horizontale | `position:absolute; left:0; right:0; top:11px; height:1px; background:var(--color-rule-strong)` |
| Grille jalons | `display:grid; grid-template-columns:repeat(4,1fr); gap:28px` |
| Jalon | `position:relative` (div) |
| Pastille | `display:block; width:14px; height:14px; border-radius:4px; background:<couleur>; box-shadow:0 0 0 4px var(--color-bg); margin-bottom:18px` (le halo `--color-bg` « coupe » la ligne autour de la pastille) |
| Étiquette | `font-family:var(--font-mono); font-size:10.5px; letter-spacing:.08em; text-transform:uppercase; color:var(--color-accent); margin-bottom:7px` — **voir arbitrage A1 : PAS d'accent** |
| Titre du jalon | `font-family:var(--font-display); font-size:18px; font-weight:600; margin-bottom:6px` |
| Texte | `font-size:14px; line-height:1.5; color:var(--color-ink-muted)` |

Contenu des 4 jalons (FR, maquette) :

| # | Étiquette | Titre | Texte | Couleur maquette | Entrée `EVENT_PALETTE` |
|---|---|---|---|---|---|
| 1 | −30 jours · rappel | On te prévient à temps | Un rappel avant chaque échéance, calé sur la frise — jamais après coup. | `#3E8BD6` | `sky` (`--evt-sky`) |
| 2 | ↻ récurrence | Les renouvellements se répètent | Assurance, abonnement, prime : pose la récurrence une fois, elle se reporte seule. | `#6C7BE0` | `periwinkle` (`--evt-periwinkle`) |
| 3 | durée · garantie | Visualise les couvertures | Garanties et baux s'affichent en barres pleines : tu vois d'un œil ce qui court. | `#4FA459` | `grass` (`--evt-grass`) |
| 4 | J0 · échéance | Rien ne t'échappe | DLUO, expirations de papiers, deadlines : tout converge sur une seule vue. | `#E3A82B` | `amber` (`--evt-amber`) |

Les 4 hex sont **exactement** ceux de `frontend/src/lib/event-palette.ts:52-65` (vérifié par le lead).
Peindre via `var(--evt-*)` (règle de `event-palette.ts:14`), pas via le hex.

**Rendu mobile : la maquette n'en définit aucun** (grille 4 colonnes fixe). Voir arbitrage A2.

## 2. Bande « On en parle » (`id="avis"`) — pour mémoire (#613 la RETIRE)

`<section id="avis">` fond `--color-surface`, `max-width:1040px`, 3 `<figure>` : `blockquote` display
33 px / 500, `figcaption` mono 11 px uppercase `ink-muted`. **Les 3 citations de la maquette sont des
sources inventées** (« La Revue du Quotidien », « Cahier des Outils », « Pratique & Méthode ») — elles ne
doivent PAS être reprises. Arbitrage dev S103 : la section témoignages est retirée (commentaire sur #613).

## 3. Nav de la maquette — pour mémoire (hors S103)

Liens : `Produit` (`#produit`) · `Avis` (`#avis`) · `Démo`. La refonte de la nav est au **Sprint 104**.
Au S103 : retirer seulement les liens devenus morts (`#testimonials` par #613, `#features` par #612)
et **garder `id="how-it-works"`** (CTA secondaire du hero + harnais E2E) — ne PAS renommer en `#produit`.

## 4. Arbitrages dev (2026-09-22, démarrage S103)

- **A1 — Accent (#615 prime sur la maquette).** Les étiquettes mono des jalons passent en
  `text-ink-muted` (rampe graphite), PAS en `text-accent` comme dans la maquette. L'accent reste sur
  liens, CTA et marqueur TODAY. Le surtitre du hero (`--color-accent` dans la maquette ET dans le code)
  est **hors périmètre** de #615 : le signaler en suite (`RECOMMAND_FOLLOWUP`), ne pas le modifier.
- **A2 — Mobile < 640 px : frise VERTICALE.** Filet vertical à gauche, jalons empilés, pastille posée sur
  le filet (même halo `--color-bg`). À partir de `sm` (640 px) : ligne horizontale + grille 4 colonnes
  (ou 2×2 entre 640 et `lg` si 4 colonnes ne tiennent pas — à mesurer, pas à supposer ; la ligne
  horizontale ne doit alors pas traverser un jalon).
- **A3 — Vagues.** Deux agents séquentiels (HeaderSection/FooterSection/HomePage partagés par
  #354, #612, #613) : A = #354 puis #613 ; B = #612 puis #615.
