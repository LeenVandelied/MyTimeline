# Audit tests — Sprint 109

> Généré en fin de Phase 6. Tableau de bord : sur-titres `.mt-eyebrow` et élasticité allemande (#632), compteurs à droite des titres de section (#664), nettoyage post-S90 (#697).

## Couverture par règle / décision

| Règle | Description | Flux multi-systèmes | Unit backend | Intégration | Vitest frontend | E2E parcours | E2E métier |
|----|-------------|:---:|:---:|:---:|:---:|:---:|:---:|
| #632 / handoff « +30 % allemand » | Sur-titres mono capitales via `.mt-eyebrow` (`.02em` en `de`), badge « archivé » détendu en `:lang(de)`, 6 utilitaires DS documentés dormants | NON | N/A | N/A | ✅ `eyebrow-consumers.test.tsx` (9, dont scan source), `section-titles.test.tsx` ; 4/4 mutations détectées | ✅ `sprint-84-section-titles`, `sprint-97-ink-faint-contrast`, `sprint-63-de-overflow-audit` | ✅ sonde lead : `letter-spacing` 0,2 px en `de` contre 0,8 px en `fr`, 0 débordement |
| #664 / maquette S109 | Aucun sur-titre sur les 6 sections ; compteurs « n événements » / « n produits » à droite (desktop + mobile), plage de la sous-frise produit, rien sur « En bref » ni l'historique | NON | N/A | N/A | ✅ `section-counts.test.tsx` (16, vrais messages fr/de), `eventSpan.test.ts` (9), `ProductDetailView.test.tsx` (+3) ; 6/7 mutations détectées, la 7e est équivalente | ✅ `sprint-109-section-counts` (8) | ✅ textes exacts fr/de, tenue à 375 px, plage formatée par le navigateur |
| BR-EVE-011 | Archivés exclus : la plage suit l'onglet actif / archivé / tous, comme la frise | NON | N/A | N/A | ✅ `eventSpan.test.ts` | ✅ | N/A |
| #697 / DEC-S56-003 | Branches de chargement inatteignables supprimées ; attentes E2E repointées sur les testids de chargement réellement montés | NON | N/A | N/A | ✅ suite complète (parité des locales, pages products) | ✅ `sprint-100-fab-clearance`, `sprint-90-first-contact`, `sprint-106-product-detail` | N/A |
| #632 (lead) | Squelette de la salutation recalé sur l'eyebrow à 10 px (tolérance 6 px) | NON | N/A | N/A | ✅ `dashboard/loading.test.tsx` | ✅ `sprint-106-product-detail` (rouge avant 821c0c31, vert après) | N/A |

Aucun flux multi-systèmes : sprint 100 % frontend, sans endpoint ni migration.

## Tests créés
- `frontend/src/styles/__tests__/eyebrow-consumers.test.tsx` (#632)
- `frontend/src/components/dashboard/section-counts.test.tsx`, `frontend/src/components/products/eventSpan.test.ts` (#664)
- `frontend/e2e/sprint-109-section-counts.spec.ts` (#664)

## Résultats des runs (rejoués par le lead sur HEAD `821c0c31`)
- Vitest : 168 fichiers, **2173/2173**. tsc 0, `format:check` vert, lint vert (agents). `next build` OK, avant et après le correctif du squelette.
- E2E suite complète, contre `next build` + `next start` `:3107` (relais `:8187` → backend `:8086`) : **589 passés / 9 sautés / 11 rouges**. 10 rouges = captures `sprint-77-theme-visual` sans référence darwin (connu, macOS ; PNG générés supprimés). Le 11e, `sprint-106-product-detail` (squelette du dashboard décalé de 6,34 px pour 6 tolérés), **était une régression du sprint** : la salutation perd 6,3 px avec `.mt-eyebrow`. Corrigée en `821c0c31`. `sprint-101-fab-landscape:271` (#769), rouge aux S105-S108, passe dans ce run.
- Après correctif, 7 specs (nouvelle + les plus exposées : `sprint-106`, `sprint-84-section-titles`, `sprint-63-de-overflow-audit`, `sprint-97-ink-faint-contrast`, `sprint-100-fab-clearance`, `sprint-90-first-contact`) en `--repeat-each=3` : **245/245**.
- Sonde lead jetable (supprimée) : dashboard, tiroir mobile, Frise et fiche produit en `de` 1280 clair et sombre, `de` 375 clair, `fr` 375 sombre, avec des noms allemands longs : `scrollWidth` du document = viewport partout, aucun compteur ni titre ne déborde. Les dates de droite du ruban à 375 px sont dans son conteneur défilant horizontal (comme la maquette mobile).
- Revue groupée : 0 critique / 0 majeur / 3 mineurs (non corrigés, voir le corps de la PR).

## Non vérifié
- Suite E2E complète non rejouée APRÈS `821c0c31` : seules les 7 specs ci-dessus l'ont été. La CI rejoue tout.
- Firefox, WebKit. Paysage mobile et bande 768–1023 px non couverts par la nouvelle spec (suivi signalé par l'agent #664).
- Taille des compteurs : 13 px (plus petit palier du DS) au lieu des 11/10 px de la maquette, écart assumé.

## Défaut préexistant relevé pendant la vérification
- `ProductList` (dashboard desktop) : avec un nom long et un « prochain événement » long, le nom du produit s'écrase à « K. » voire disparaît. Lignes non modifiées par ce sprint ; aucune issue ouverte ne le couvre. Proposé au triage de clôture.

## Conclusion
Prêt pour la PR. Aucun manque bloquant dans le tableau de couverture.
