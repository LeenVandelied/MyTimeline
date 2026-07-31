# MyTimeline — Audit d'accessibilité (v4.2)

> Périmètre : 5 écrans clés. Référentiel : **WCAG 2.1 AA**.
> Contraste cible — texte normal **4.5:1**, gros texte / composants UI **3:1**.
> Légende verdict : ✅ conforme · ⚠️ à corriger (non bloquant) · ❌ bloquant.
>
> Voir aussi l'écran visuel **« Audit a11y.dc.html »** (parcours clavier
> annoté de la Vue Timeline + tableau de synthèse).

---

## 1 · Tableau de synthèse — écran × point audité

| Point audité | Vue Timeline | Drawer Produit | Mobile Form | Mobile Réglages | Dialogs Confirm. |
|---|:--:|:--:|:--:|:--:|:--:|
| **Contraste texte ≥ 4.5:1** | ⚠️ | ✅ | ✅ | ✅ | ✅ |
| **Contraste UI/icônes ≥ 3:1** | ⚠️ | ✅ | ✅ | ✅ | ✅ |
| **Ordre de tabulation logique** | ⚠️ | ✅ | ✅ | ✅ | ✅ |
| **Pas de tab-trap involontaire** | ✅ | ✅ | ✅ | ⚠️ | ✅ |
| **Primaire atteignable en N tab clairs** | ⚠️ | ✅ | ✅ | ✅ | ✅ |
| **ARIA rôles / état** | ❌ | ⚠️ | ⚠️ | ⚠️ | ⚠️ |
| **Lisible au lecteur d'écran** | ❌ | ✅ | ✅ | ⚠️ | ✅ |
| **Focus visible (2px accent / offset 2px)** | ⚠️ | ✅ | ✅ | ✅ | ✅ |
| **Touch targets ≥ 44×44 px** | — | — | ⚠️ | ⚠️ | ⚠️ |
| **Alternative clavier aux gestes** | ✅ | — | ✅ | ⚠️ | — |

---

## 2 · Recommandations détaillées (chaque ⚠️ / ❌)

### Vue Timeline (desktop) — l'écran le plus complexe

C'est le cas le plus dur : la frise est dessinée en `React.createElement`
(barres = `<div onClick>`), donc invisible au clavier et au lecteur d'écran
en l'état. Les raccourcis globaux (`T` `[` `]` `+` `-` `F` `Esc`) existent
déjà et sont documentés dans la sidebar — bonne base, mais insuffisante.

- ❌ **Frise non exposée.** Envelopper le scroller dans
  `<section role="region" aria-label="Frise chronologique" tabindex="0"
  aria-describedby="tl-help">`. Le `tabindex="0"` rend la frise focusable et
  active les raccourcis sans dépendre d'un focus global. `tl-help` pointe vers
  le pavé de raccourcis (déjà présent en bas de sidebar).
- ❌ **Barres d'événements non navigables.** Donner à chaque barre
  `role="button" tabindex="0"` + un `aria-label` agrégé **lu en un coup** :
  `« Assurance auto, durée, 14 mai → 18 avril, récurrent chaque année, en cours »`.
  Câbler `keydown` Enter/Espace → même action que le clic (ouvrir le panneau
  détail). Navigation ↑/↓ entre lanes, ←/→ entre événements d'une lane.
- ⚠️ **Occurrences fantômes** (pointillés, `opacity .65–.7`) sous le seuil
  AA contre le fond. Elles sont **décoratives** (l'occurrence pleine porte
  l'info) → marquer `aria-hidden="true"` ; ne pas compter dans la navigation.
- ⚠️ **Libellés de barres** : texte blanc/`#16181D` calculé par luminance
  (`textOn()`) — OK sur les 12 couleurs curatées, **revérifier** sur teinte
  personnalisée (le picker autorise tout hex). Imposer un garde-fou : si
  contraste < 4.5:1, basculer le libellé hors-barre (déjà fait pour les pins).
- ⚠️ **Ordre de tabulation** : aujourd'hui header → sidebar → frise opaque.
  Cible : sidebar (catégories, toggles) → header (zoom, aujourd'hui, nouvel
  événement) → région frise → minimap. Le bouton primaire « Nouvel événement »
  doit rester atteignable en ≤ 6 tab depuis le chargement.
- ⚠️ **Focus visible** : les barres/pins n'ont pas d'anneau. Ajouter
  `outline:2px solid var(--color-accent); outline-offset:2px;` au `:focus-visible`.

### Drawer Produit (desktop)

Focus-trap + `Escape` déjà câblés (audit DS). Restent les attributs.

- ⚠️ **ARIA** : ajouter `role="dialog" aria-modal="true"`,
  `aria-labelledby` (titre du produit) et `aria-describedby` (sous-titre /
  catégorie). Le `✕` doit avoir `aria-label="Fermer"`.
- ⚠️ Sur le tableau « Sessions actives » : `role="table"` est OK, **ajouter
  `aria-rowcount` et `aria-colcount`** (les lignes peuvent être virtualisées).

### Mobile Form (portrait)

- ⚠️ **ARIA bottom sheet** : `role="dialog" aria-modal="true"` +
  `aria-labelledby`. Le grabber décoratif → `aria-hidden="true"`.
- ⚠️ **Touch targets** : le `✕` de fermeture fait 24–28 px. Conserver le
  visuel mais étendre la **zone cliquable à 44×44** (padding ou
  pseudo-élément). Idem swatches couleur (34 px de haut) : élargir la cible.
- ✅ Labels mono associés à chaque champ (`<label for>` / `aria-labelledby`),
  messages d'erreur reliés par `aria-describedby` + `aria-invalid`.

### Mobile Réglages (drill-down)

- ⚠️ **Gestion du focus au drill** : à l'entrée dans un sous-panneau, déplacer
  le focus sur le titre du panneau (`tabindex="-1"` + `.focus()`) ; au retour,
  restaurer le focus sur la ligne d'origine. Sinon le lecteur d'écran reste
  « coincé » en haut.
- ⚠️ **Tab-trap** : tant qu'un sous-panneau est ouvert en overlay, piéger le
  Tab dedans (même politique que les modaux).
- ⚠️ **Touch targets** : lignes de réglage ≥ 44 px de haut (OK), mais les
  chevrons `›` et toggles doivent avoir 44×44 de cible.
- ⚠️ **Alternative clavier au geste** : le swipe-down de fermeture doit avoir
  un équivalent — bouton « Fermer » visible + `Escape`.

### Dialogs Confirmation (desktop + mobile)

- ⚠️ **ARIA** : pour une confirmation **destructive**, utiliser
  `role="alertdialog"` (et non `dialog`) + `aria-modal="true"` +
  `aria-labelledby` (« Supprimer cet événement ? ») + `aria-describedby`
  (le récap). Le focus initial va sur le bouton **non destructif** (« Annuler »).
- ⚠️ **Touch targets** mobile : `✕` et grabber → zone 44×44 (cf. Mobile Form).
- ✅ Cachet d'éphéméride décoratif → `aria-hidden="true"` (déjà du décor).

---

## 3 · Parcours clavier — Vue Timeline (le test le plus dur)

Séquence cible, avec ce que le lecteur d'écran annonce à chaque étape.
(Détaillé visuellement dans « Audit a11y.dc.html ».)

1. **Tab** → entre dans la sidebar, première catégorie.
   → *« Véhicules, bouton, activé, filtre catégorie, 1 sur 7 »*
2. **Tab ×n** → parcourt catégories puis les boutons header.
   → *« Zoom avant, bouton » … « Aujourd'hui, bouton » … « Nouvel événement, bouton »*
3. **Tab** → entre dans la **région frise**.
   → *« Frise chronologique, région. Raccourcis : T aujourd'hui, crochets naviguer, plus-moins zoom, F recadrer »* (via `aria-describedby`)
4. **Tab** → premier événement focusable.
   → *« Assurance auto, en cours, du 14 mai au 18 avril, récurrent chaque année. Bouton. »* (label agrégé — tout en un coup)
5. **→ / ←** → événement suivant / précédent dans la lane (occurrences
   fantômes sautées, `aria-hidden`).
6. **↑ / ↓** → lane précédente / suivante (produit).
7. **Entrée / Espace** → ouvre le panneau détail ; le focus passe sur le
   titre du panneau. → *« Assurance auto, en-tête niveau 2 »*
8. **Échap** → ferme le panneau, focus restauré sur la barre d'origine.

**Critère de réussite** : un utilisateur lecteur d'écran obtient titre +
dates + récurrence + statut **en une seule annonce par événement**, sans
naviguer caractère par caractère ni élément décoratif par élément décoratif.

---

## 4 · ARIA attendu par composant DS

| Composant | Attributs requis |
|---|---|
| **Dialog** | `role="dialog"` (`alertdialog` si destructif), `aria-modal="true"`, `aria-labelledby`, `aria-describedby`, focus-trap, `Escape`, restauration du focus déclencheur |
| **Bottom sheet (mobile)** | idem Dialog + grabber `aria-hidden="true"` + bouton/`Escape` équivalents au swipe |
| **Button / IconButton** | `aria-label` si icône seule ; `aria-pressed` pour les toggles ; `aria-disabled` + `title` pour `data-net="offline"` |
| **Input / Textarea / Select** | `<label for>` ou `aria-labelledby` ; erreurs via `aria-describedby` + `aria-invalid="true"` ; Select = pattern listbox (`aria-activedescendant`, déjà implémenté) |
| **Switch / Checkbox / Radio** | `role` natif + `aria-checked` ; cible ≥ 44×44 sur mobile |
| **Tabs** | `role="tablist"` / `tab` / `tabpanel`, `aria-selected`, flèches ←/→ |
| **Table (Sessions actives)** | `role="table"`, `aria-rowcount`, `aria-colcount`, en-têtes `role="columnheader"` |
| **Tooltip** | révélé au **focus clavier** (`:focus-within`, déjà corrigé), `role="tooltip"` lié par `aria-describedby` |
| **Toast** | `role="status"` (`aria-live="polite"`) — `assertive` si erreur |
| **Sysbanner (offline/timeout/serveur)** | `role="status"` (offline/timeout) ou `role="alert"` (server-error) ; message complet dans `title` car tronqué visuellement |
| **TimelineEventBar** | `role="button"`, `tabindex="0"`, `aria-label` agrégé (titre + dates + récurrence + statut) ; occurrences fantômes `aria-hidden="true"` |
| **Région frise** | `<section role="region" aria-label="Frise chronologique" tabindex="0" aria-describedby="…">` |
| **Icônes décoratives / cachets** | `aria-hidden="true"` |

---

## 5 · Priorisation

1. **Bloquant (❌)** — exposer la frise + rendre les barres navigables/labellisées
   (Vue Timeline). C'est le seul écran réellement inaccessible aujourd'hui.
2. **À corriger (⚠️)** — attributs ARIA des modaux/sheets, gestion du focus au
   drill-down, touch targets 44×44, garde-fou de contraste sur couleur custom.
3. **Vérifications continues** — relancer le contrôle de contraste à chaque
   ajout de teinte et sur les variantes dark (matière qui se perd).

---

## 6 · Bordures de contrôle — WCAG 1.4.11 (≥3:1)

`--color-rule` (1.21:1) et `--color-rule-strong` (1.46:1) sont un tier
**décoratif** : ils ne peuvent pas porter la limite visuelle d'un composant.
Le tier **fonctionnel** est `--color-rule-emphasis` (`--gray-450` `#7A7E87`,
#293) — mesuré **3.97:1** vs `bg` et **4.07:1** vs `surface` en clair,
**4.81:1** / **4.49:1** en sombre.

- ✅ **Bouton secondaire du hero** (`HeroSection`) migré sur ce tier ; il
  n'emprunte plus `ink-muted` (tier texte).
- ✅ **Hors landing — migré en #336** (sprint 49) : `login`, `register`,
  `reset-password`, `forgot-password`, `StateScreen`, `ConflictDialog`,
  `EventEditForm`, `NewEventDrawer`, `BottomSheet`, plus les contrôles du DS
  dans `ds/components/core.css` (bouton outline, bouton icône, input/textarea,
  déclencheur de select, checkbox, radio, piste d'interrupteur).
- ✅ **Pont shadcn** : `--color-input` (globals.css) — qui habille `Input`,
  `SelectTrigger` et `Button variant="outline"` — pointe désormais sur
  `rule-emphasis`. C'est le mécanisme réel derrière les formulaires d'auth ;
  `--color-border` (décoratif) reste sur `--color-rule`.
- ✅ **Conservés sur `rule-strong` — décision, pas oubli** : cadres de
  panneaux flottants (`mt-select__menu`, `SelectContent`, `mt-toast`,
  `mt-dialog`), `mt-badge` (marque statique non focusable), `mt-avatar`
  (cadre d'image), survol de carte (`mt-card--hover`) et lignes d'en-tête de
  tableau (`mt-table th`). Ces filets ne portent la limite d'aucun contrôle :
  1.4.11 ne s'y applique pas.
- 🔒 **Garde-fou** : `src/styles/__tests__/control-border-tier.test.ts`
  (parcours AST PostCSS, PAT-S48-001) échoue si un contrôle retombe sur
  `rule-strong` ou si `--color-input` change de tier.
- ⚠️ **Reste à traiter** : `ds/components/timeline.css` (16 occurrences de
  `rule-strong`) — non arbitré, la frise étant en refonte (#69). À trier
  fonctionnel/décoratif dans un lot dédié.

---

## 7 · Tier accent — `accent` sur `accent-soft` (WCAG 1.4.3, ≥4.5:1)

`--color-accent-soft` est le fond de **tout état actif du produit** ;
`--color-accent` en est l'encre. Le couple était donc à mesurer comme un couple,
et il **échouait en clair** : `#1170E4` sur `#DBE9FC` = **3.83:1**. En sombre il
était conforme (5.43:1) — un défaut mono-thème, invisible à la relecture.

**Correctif (FU1 du Sprint 57)** : `--color-accent` descend d'un cran de la rampe
en clair, `blue-500` → **`blue-600 #0E5FC4`**. Le mode sombre n'est pas touché.
`--color-accent-hover` suit sur un nouveau **`blue-700 #0B4EA4`** (sans quoi
survol et repos auraient été confondus), et `--color-focus` / `--color-ongoing`
suivent l'accent (ils valaient `blue-500` comme lui : les laisser en arrière
aurait fait cohabiter deux bleus voisins sur le même écran).

| Couple | Rôle | Clair avant | Clair après | Sombre (inchangé) |
|---|---|--:|--:|--:|
| `accent` / `accent-soft` | **état actif** (sidebar, onglets, item focalisé) | ❌ 3.83:1 | ✅ **4.94:1** | ✅ 5.43:1 |
| `accent` / `bg` | lien, icône d'accent | ✅ 4.59:1 | ✅ 5.93:1 | ✅ 6.94:1 |
| `accent` / `surface` | lien sur carte / popover | ✅ 4.71:1 | ✅ 6.08:1 | ✅ 6.48:1 |
| `accent-ink` / `accent` | bouton plein, badge « aujourd'hui » | ✅ 4.71:1 | ✅ 6.08:1 | ✅ 6.94:1 |
| `accent-ink` / `accent-hover` | bouton plein survolé | ✅ 6.08:1 | ✅ 7.95:1 | ✅ 8.78:1 |

Aucun couple ne régresse : l'accent ne sert **jamais** d'encre sur fond sombre ni
de fond sous encre sombre en mode clair, donc l'assombrir ne peut qu'augmenter
tous les ratios. `--color-accent-soft` n'a **pas** été éclairci : il porte aussi
`--shadow-focus` (`tokens/spacing.css`) et le fond de `::selection`
(`tokens/base.css`), qui auraient perdu leur visibilité.

**Distinction actif / inactif préservée** — l'état inactif reste
`ink-muted` (`#5E626B`, 6.11:1 sur `surface`) sans fond, le survol
`ink-muted` sur `surface-2` (`#F3F4F6`, 5.55:1). L'actif garde donc ses trois
signaux cumulés : aplat teinté, encre bleue, `font-medium`.

- 🔒 **Point de vérité unique** : la correction vit dans le token, **pas** dans
  les composants. La liste des consommateurs est ouverte — `focus:bg-accent-soft`
  (`ui/dropdown-menu.tsx`) et `hover:bg-accent-soft` (`ui/button.tsx`) posent ce
  couple sur n'importe quel `<a>`, qui hérite `color: var(--color-accent)` de
  `tokens/base.css`. Un token dédié `--color-accent-on-soft` n'aurait couvert que
  les appels déjà écrits.
- ⚠️ **Ratios cités ailleurs devenus conservateurs** (aucun n'annonce un échec,
  ils sous-estiment simplement le réel) : `styles/landing.css` (`.gradient-text`,
  `.nav-link` — 4.59:1 cité), `styles/animations.css` (`.cta-button` — 4.71:1 /
  6.08:1 cités), `components/landing/landing.hover-pairing.test.ts` et
  `components/ui/button.hover-pairing.test.ts` (paire sanctionnée — 4.71:1 cité).
  À rafraîchir dans un lot de documentation.
