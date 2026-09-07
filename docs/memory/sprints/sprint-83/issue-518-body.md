=====ISSUE #518
[FEATURE] ~15 composants rendent des dates dans un span au lieu d'un time datetime
---
## Contexte
Le Design System (`i18n.css` §7) définit une convention claire pour l'affichage des
dates dans l'interface : elles doivent être rendues avec la balise sémantique
`<time datetime="...">` (portant l'attribut `datetime` et une classe `mt-date--*`),
et non un simple `<span>`. Cette convention garantit que les dates sont exposées comme
telles aux technologies d'assistance (lecteurs d'écran) et respectent les standards
d'accessibilité HTML.

Or l'état réel du code s'écarte largement de cette convention : il n'existe que **2**
balises `<time>` dans tout le frontend, alors qu'environ **15 composants** affichent
des dates dans un simple `<span>` — notamment `ProductDetailView` (ligne 401),
`ProductsListView` (ligne 295), `SessionList`, `ExportDataFlow`, `CompactAgenda`, ainsi
que les drawers de la timeline. Conséquence : perte de sémantique HTML et
d'accessibilité (une date affichée dans un `<span>` n'est pas identifiable comme une
date par un lecteur d'écran), en plus d'une convention DS non respectée à grande
échelle.

## À faire
Recenser l'ensemble des composants affichant une date dans un `<span>` et les migrer
vers `<time datetime="..." class="mt-date--*">`, conformément à la convention DS
définie dans `i18n.css` §7. Vu le volume (~15 composants), prévoir un découpage en
plusieurs sous-tâches ou PR par zone fonctionnelle (produits, sessions, export,
timeline/drawers) plutôt qu'un unique gros changement.

## BR impactées
Aucune.

## Critères d'acceptation
- [ ] Liste exhaustive des composants concernés confirmée (au moins les 5 cités :
      `ProductDetailView`, `ProductsListView`, `SessionList`, `ExportDataFlow`,
      `CompactAgenda`, + les drawers de la timeline).
- [ ] Chaque composant listé migre son affichage de date d'un `<span>` vers
      `<time datetime="..." class="mt-date--*">`, sans régression visuelle.
- [ ] L'attribut `datetime` porte une valeur ISO 8601 valide correspondant à la date
      affichée.
- [ ] Un test (unitaire ou E2E) vérifie qu'au moins les composants les plus visibles
      utilisent bien `<time>` avec `datetime`, pour éviter une régression future.

## Piste technique
Convention définie dans `frontend/src/styles/ds/components/i18n.css` §7. Composants
identifiés à migrer : `ProductDetailView.tsx:401`, `ProductsListView.tsx:295`,
`SessionList`, `ExportDataFlow`, `CompactAgenda`, drawers de la timeline (à recenser
précisément en début de tâche).

## Dépendances
Aucune, mais gagnerait à être découpée en plusieurs issues plus petites une fois le
recensement exhaustif fait (volume ~15 composants).

## Risques techniques
Risque de régression visuelle si le style appliqué à `<span>` (marges, display inline)
n'est pas identique par défaut à celui d'un `<time>` — vérifier au cas par cas. Volume
important : risque d'oubli de composants lors du recensement initial.

## Estimation
M — ~15 composants à migrer, recensement + risque de régression visuelle à vérifier
composant par composant ; à considérer comme candidat au découpage en sous-issues.

## Origine
Sprint 72 — `docs/memory/sprints/sprint-72/issue-72-done.md`

