# Revue de charte `ui-design` — Sprint 85

> Spécialiste `ai-env:ui-design` lancé par le lead en fin de sprint (Phase 7), en réponse aux
> 3 signaux `RECOMMAND_UI_DESIGN` de #592, #601 et #602. Source de vérité visuelle :
> `docs/memory/sprints/sprint-85/maquette-vue-timeline.md` (extrait du `.dc.html`).
> Verdict brut de l'agent, plus l'arbitrage du lead sur le point resté indéterminé.

**BILAN : 1 ÉCART / 8 CONFORME / 1 INDÉTERMINÉ** (l'indéterminé a été tranché par le lead, puis corrigé).

| # | Point | Verdict | Justification |
|---|---|---|---|
| 1 | Ligne de filtre masquée : barré + `ink-muted` + pastille en contour, au lieu de `opacity:.4` | CONFORME | 6,11:1 / 5,85:1 contre 2,52:1 pour la maquette ; le signal visuel de la maquette (pastille en contour) est conservé et l'état ne repose pas sur la seule couleur — `timeline.css:530-537` |
| 2 | `ink-muted` au lieu de `ink-faint` pour le texte de sidebar et le compteur | CONFORME | `ink-faint` mesuré 2,82:1 / 2,99:1, sous le seuil ; substitution locale correcte. **Mais `ink-faint` reste utilisé comme texte ailleurs** (eyebrow de `timeline/page.tsx`) → décision de charte globale, hors de ce sprint |
| 3 | Pastille sans couleur : contour `rule-strong` à 1,36:1 / 1,30:1 | CONFORME | Le libellé est toujours adjacent (sidebar et en-tête) : la pastille n'est pas seule porteuse d'information → tier décoratif, hors WCAG 1.4.11. Cohérent avec DEC-S85-006 |
| 4 | Gouttière 168 px (`--lane-header-w`) au lieu de 176 px | **ÉCART** | Le `.dc.html` fait foi, mais la constante est partagée par lanes / règle / pastilles (#392) et vit en prod hors de ce sprint → correction = suite dédiée avec audit d'impact, pas un fix isolé de #601 |
| 5 | Résumé plié `max(6, durée)` au lieu de `max(4, durée)` / 6 px ponctuel | CONFORME | Écart de 2 px, alignement en x sur les pastilles préservé — `timeline.css:233` |
| 6 | Hiérarchie en-tête de catégorie vs en-tête de lane | INDÉTERMINÉ → **tranché par le lead** | L'agent ne pouvait pas conclure : l'extrait de maquette ne couvrait pas les lanes. Le lead a relu le `.dc.html` : lane = `surface` + `500` + retrait de 30 px, catégorie = `surface-2` + `600`. En prod les deux étaient identiques → **section B-bis ajoutée à l'extrait** et correctif livré (`1fb477a`) |
| 7 | Boutons de barre d'outils 26/32 px + `rule-emphasis` au lieu de 38 px | CONFORME | Même arbitrage que `.mt-zoom` et le segmenté (#352) : sur une barre `surface-2`, un cadre `rule-strong` ne détache pas (delta ~1,05:1) ; bascule de la minimap en 2e ligne sous 700 px mesurée sans débordement |
| 8 | « Nouvel événement » en `bg-accent hover:bg-accent-hover text-accent-ink` | CONFORME | `Button` n'a pas de variante `accent` ; ce trio est la convention du DS (nav du shell, `ProductsListView`, `CategoriesView`, `AddProductButton`…) |
| 9 | Légende réduite à « Événement » (DEC-S85-002) | CONFORME | Fidèle à la maquette. Note non bloquante : la pastille de légende (radius 4, accent fixe) diffère du rendu réel des barres (radius 6, couleur par événement) — écart déjà présent dans la maquette, pas introduit ici |
| 10 | Thème sombre, focus, rayons, tokens | CONFORME | `.dark` / `[data-theme=dark]` couvrent `rule-emphasis`, `ink-muted`, `surface-2`, `focus`, `accent` ; `--color-focus` posé sur tous les interactifs neufs ; aucun hex en dur dans les CSS ajoutées |

## Vérification navigateur du lead (compléments demandés par la revue)

- `/timeline` en clair et en sombre à 1280 px : hiérarchie catégorie/lane lisible dans les deux thèmes
  (clair `#FFFFFF` vs `#F3F4F6`, sombre `#131519` vs `#1B1E24` ; la graisse et le retrait portent le reste).
- Filtre : catégorie masquée barrée, son groupe retiré de la frise ; repli : barrette de résumé rendue dans la piste.
- 900 px : bouton « Filtres » et panneau superposé fonctionnels.
- Dashboard sondé : 0 sidebar, 0 bouton « Aujourd'hui », 0 bouton « Nouvel événement » (DEC-S85-005 respectée).
- Anneau de focus obtenu par une **vraie tabulation** depuis `body` (jamais `focus()`, cf. PIT-S83-014) :
  2 px, `:focus-visible` actif sur l'en-tête de lane.

## Suites ouvertes par cette revue

- Gouttière 168 → 176 px avec audit d'impact (règle, pastilles, minimap) — non fait dans ce sprint.
- `--color-ink-faint` sous le seuil partout où il porte du texte — décision de charte, dépasse le sprint.
