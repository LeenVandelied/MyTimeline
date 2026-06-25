# Handoff — Refonte MyTimeline

## Overview
MyTimeline est un assistant d'organisation personnel construit autour d'une **frise
chronologique horizontale** : les *lanes* = produits, l'axe X = le temps, les
événements = des barres. L'utilisateur suit renouvellements, garanties, expirations
et échéances, regroupés par catégorie. Ce bundle couvre la refonte complète : site
public (landing, auth), application connectée (dashboard, frise, produits/catégories,
création d'événement) et états système.

## À propos des fichiers de design
Les fichiers `.dc.html` de ce bundle sont des **références de design réalisées en
HTML** — des prototypes haute-fidélité qui montrent l'apparence et le comportement
visés, **pas du code de production à copier tel quel**. La tâche est de **recréer ces
écrans dans l'environnement du codebase cible** (ici : Next.js 15 + React 18 +
Tailwind 4 + Radix UI + Framer Motion, déjà en place) en suivant ses patterns
établis. Chaque `.dc.html` s'ouvre seul dans un navigateur (format « Design
Component »).

> ⚠️ **Note d'architecture (important pour la prod).** Dans les maquettes, le jeu de
> données (`products` / `categories` / `events`) et les helpers de dates sont
> **dupliqués** dans chaque écran, volontairement, pour que chaque fichier soit
> autonome. En production, **n'introduisez pas cette duplication** : créez une seule
> source de vérité (voir « Modèle de données » et « Helpers » ci-dessous) — un
> module de données / hook partagé + des utilitaires de date partagés, consommés par
> tous les écrans.

## Fidélité
**Haute-fidélité (hifi).** Couleurs, typographie, espacements et interactions sont
finaux et tirés du design system « Graphite » (voir Design Tokens). À recréer au
pixel près avec les composants existants du codebase.

---

## Design system « Graphite »
Système quasi-monochrome (proche Notion Calendar / Linear). La couleur n'apparaît que
comme **donnée d'événement** + un **accent bleu électrique** unique pour
*aujourd'hui / actif*. La typo mono porte tout ce qui est temporel. Clair + sombre.

### Design tokens
**Couleurs — neutres (rampe graphite)**
`#FFFFFF · #FCFCFD · #F3F4F6 · #E6E7EB · #D1D3D9 · #B8BBC2 · #969AA3 · #5E626B ·
#43464D · #24262C · #16181D · #0B0C0E`

**Surfaces / encre (clair)** : bg `#FCFCFD` · surface `#FFFFFF` · surface-2 `#F3F4F6`
· ink `#16181D` · ink-muted `#5E626B` · ink-faint `#969AA3` · rule `#E6E7EB` ·
rule-strong `#D1D3D9`.
**Surfaces / encre (sombre)** : bg `#0B0C0E` · surface `#131519` · surface-2 `#1B1E24`
· ink `#ECEDEF` · ink-muted `#8E9299` · ink-faint `#5E626B` · rule `#20232A` ·
rule-strong `#2E323A`.

**Primaire** = graphite (boutons quasi-noirs `#16181D`, s'inverse en clair sur fond
sombre). **Accent** = bleu électrique `#1170E4` (clair) / `#4D9BFF` (sombre), usage
parcimonieux (today / actif / liens).

**Palette événements curatée (12, AA-tunée 2 modes)**
rouge `#E5484D` · orange `#EE7B30` · ambre `#E3A82B` · citron `#A7B83A` · herbe
`#4FA459` · sarcelle `#2FA7A2` · ciel `#3E8BD6` · cobalt `#3B62D4` · pervenche
`#6C7BE0` · orchidée `#B056A8` · rose `#DD5C97` · graphite `#6B7280`.

**Statut (desaturé, AA)** : success `#237A38` · warning `#8A6311` · danger `#D13B40`
· info `#246FB2` (variantes sombres plus claires).

**Typographie** : **Archivo** (display + UI), **IBM Plex Mono** (tout le temporel :
dates, durées, ID, graduations, micro-labels). Échelle ~1,27 :
**13 / 15 / 17 / 21 / 27 / 35 / 45 / 57**. Poids 400/500/600/700. Tracking serré en
display (-0.02/-0.03em), `0.1–0.16em` majuscules sur les micro-labels mono.

**Espacement** : base-4 avec pas impairs préférés (3·5·7·11·13). Magazine : colonnes
inégales, filets fins plutôt que cartes.

**Rayons** : 3 / 5 / 7 / 10 / 14 (pill réservé aux switches). **Ombres** : subtiles
et rares (xs→lg) ; popovers/modals = md/lg, surfaces au repos = filet 1px.

**Mouvement** : `cubic-bezier(.32,.72,0,1)`, sans rebond, 120–280ms (micro 160ms).

**Casse / voix** : sentence case pour labels & boutons ; **MAJUSCULES + letter-spacing
mono** réservé aux micro-labels (eyebrows, en-têtes, badges, graduations). Pas
d'emoji ; seuls glyphes produit autorisés : récurrence `↻` et flèches de frise.

---

## Modèle de données (source de vérité unique en prod)
```ts
type CategoryKey = string;           // ex. "vehicles", ou clé générée pour une catégorie créée
interface Category { key: CategoryKey; label: string; color: string /* hex de la palette 12 */; }

interface Product {
  id: string; name: string;
  category: CategoryKey;             // rattachement modifiable
  createdAt: string;                 // ISO "YYYY-MM-DD"
}

interface MyEvent {
  id: string; title: string;
  productId: string;                 // → Product
  category: CategoryKey;             // dérivé du produit par défaut, surchargeable
  color: string;                     // hex de la palette curatée
  type: "single" | "duration";
  start: string;                     // ISO
  end?: string;                      // ISO, si type === "duration"
  recurrence?: "month" | "year" | null;
}
// Statut calculé : end < today → "expired" ; start ≤ today ≤ end → "ongoing" ; sinon "upcoming".
```
**Catégories par défaut** : Véhicules `#3E8BD6` · Assurance `#6C7BE0` · Santé
`#4FA459` · Alimentation `#E3A82B` · Logement `#B056A8` · Voyage `#2FA7A2` ·
Finances `#DD5C97`.

## Helpers (à mutualiser — pas à dupliquer)
- `addDays/addMonths/addYears(date, n)`, `diffDays(a,b)`
- `nextStart(event)` : prochaine occurrence ≥ aujourd'hui (avance la récurrence)
- `instancesIn(event, windowDays)` : occurrences (incl. récurrentes/fantômes) dans une
  fenêtre — utilisé par frise, dashboard, mini-frises
- `textOn(hex)` : noir `#16181D` ou blanc selon luminance (contraste auto des barres)
- `fmtShort(date)` (« 14 MAI »), `iso(date)` (« 2026-05-14 »)

---

## Traitement visuel des barres d'événement (convention validée)
- **Barre pleine** : fond = couleur de l'événement, **texte au contraste auto**
  (`textOn`). Rayon 6px, ombre xs/sm. Glyphe `↻` en préfixe si récurrent.
- **Ponctuel** : *pin* compact (≈10px) + libellé à droite en encre (≠ barre de durée).
- **Récurrence** : **pas de trame de stries**. Occurrence pleine + **filet pointillé**
  reliant des occurrences fantômes (contours/pastilles en pointillés).
- **Lanes en zébrures** très subtiles (`ink 2.6%`) pour le suivi visuel.
- Le design system local porte cette règle dans `.mt-evt` (composant
  `TimelineEventBar`, prop `--mt-evt-ink` pour l'encre).

---

## Écrans / vues

### 1. Landing (`Landing.dc.html`)
- **But** : présenter le produit, convertir (register).
- **Layout** : page scrollable, max-width 1340px. Hero **asymétrique 30/70** — texte
  éditorial à gauche, **frise animée** à droite (panneau bordé, ruler + 6 lanes,
  barres pleines, curseur TODAY, **auto-scroll en boucle douce** ~52s linéaire,
  masque de fondu sur les bords, `prefers-reduced-motion` respecté).
- **Sections** : nav sticky (logo + liens mono uppercase séparés par filet + langue +
  thème + CTA), hero, « Comment ça marche » = **frise de cas d'usage** (ligne
  horizontale + 4 jalons à pastilles colorées, *remplace* des features 3 colonnes),
  **avis presse pleine largeur** (citations display 33px + attribution mono), bande
  CTA finale, footer.

### 2. Auth (`Auth.dc.html`)
- **But** : connexion / inscription / réinitialisation (un seul écran, 3 modes).
- **Layout asymétrique** : gauche = panneau surface avec frise « journée idéale »
  immobile (ruler horaire + barres) + citation ; droite = formulaire centré (max
  380px).
- **Détails** : onglets login/register/reset ; **erreurs inline** sous le champ en
  texte `danger` (pas de fond rouge) ; états **loading** (spinner + label « Un
  instant… ») et **success** (carte ✓) ; social **relégué** sous « ou continuer
  avec » (petits boutons Google / GitHub) ; langue + thème en haut à droite.

### 3. Dashboard (`Dashboard.dc.html`)
- **But** : vue d'entrée connectée, 80% de la valeur sans scroll.
- **Layout** : nav latérale 248px (intégrée dans le shell) + contenu.
- **Hero** = **ruban de densité** 30 jours pleine largeur (barres fines colorées,
  ruler, ligne TODAY, **viewport déplaçable** au pointeur, libellé de plage mono).
- **« Cette semaine »** : table dense (date stamp mono, filet couleur, titre +
  produit, « dans N j » / « en cours »). **« En bref »** : stats en **marginalia
  phrasée** (chiffres en mono inline, pas de gros nombres display). **« Tes
  produits »** : liste compacte (pastille, nom, prochain événement, compteur).

### 4. Vue Timeline (`Vue Timeline.dc.html`) — écran cœur
- **But** : frise chronologique **horizontale continue**, scroll latéral, **zoom
  continu** (Cmd/Ctrl + molette) heure→trimestre sur un seul continuum.
- **Layout** : sidebar gauche (accordéons tout plier/déplier, filtres catégories,
  légende, raccourcis) + en-tête (titre, zoom −/+ avec lecture « 1 px = X h »,
  Aujourd'hui, thème, Nouvel événement) + zone frise + **minimap** (waveform +
  viewport déplaçable, synchronisé au scroll).
- **Frise** : règle sticky adaptative (jours→semaines→mois→trimestres), **week-ends**
  filetés, **ligne TODAY** accent. **Lanes en accordéons de catégorie** : en-tête de
  catégorie pliable (chevron ▾/▸, pastille, compteur) ; plié → résumé compact des
  événements ; déplié → lignes produits (empilage interne pour les chevauchements).
- **Interactions** : drag horizontal pour se déplacer ; survol = tooltip riche
  (produit, dates ISO, durée, récurrence) ; clic = **drawer latéral** détail (fiche
  inventaire + Éditer/Archiver) ; raccourcis `T` aujourd'hui, `[` `]` naviguer,
  `+` `-` zoom, `F` recadrer, `Échap` ferme.

### 5. Produits + Catégories (`Produits.dc.html`)
- **But** : catalogue dense + fiche produit + **gestion des catégories**.
- **Liste** : table type catalogue (filets fins), colonnes Produit (pastille + nom +
  catégorie mono) · Prochain événement (titre + date ISO) · **mini-frise 90 j** par
  ligne · nb d'événements. Recherche, tri Nom / Prochain événement. Clic ligne →
  détail.
- **Détail** : en-tête type **fiche d'inventaire** (libellés mono à gauche, valeurs à
  droite, filets) ; **sous-frise dédiée** au produit (fit largeur, TODAY) ; section
  **Historique** (événements passés en gris-désaturé). Actions Nouvel événement /
  Éditer / Archiver.
- **Catégories** (bascule Produits/Catégories) : cartes catégorie (pastille, nom,
  compteur, puces produits, recolorisation depuis la palette) ; **Nouvelle catégorie**
  (nom + couleur) ; **Affecter les produits** (un select de catégorie par produit qui
  met à jour compteurs et puces en direct).

### 6. Création / édition d'événement (`Formulaire Événement.dc.html`)
- **But** : créer/éditer un événement.
- **Layout** : **drawer latéral** (452px) sur fond assombri. **Aperçu live sticky en
  haut** : mini-frise (ruler, TODAY) reflétant en direct couleur / type /
  **récurrence** (connecteur pointillé + occurrence fantôme) + légende prochaine
  occurrence.
- **Champs** : Titre · **Catégorie** (select) · Produit (combobox, sélectionner un
  produit aligne la catégorie) · Type segmenté Ponctuel/Durée · Début (+ Fin si
  durée) avec durée calculée · **Récurrence visuelle** segmentée (Aucune / ↻
  Mensuelle / ↻ Annuelle) · **Couleur** (palette curatée + repli « Personnalisé »
  avec picker). Toast de confirmation.

### 7. États système (`États système.dc.html`)
- **404** « éphéméride » : feuillet daté (jour réel) + « Cette page n'a pas de date
  dans l'almanach » + retour. **500** : incident serveur + réf. mono. **État vide** :
  instruction éditoriale (pas de dessin mignon) + CTA + frise vide en pointillés.
  **Chargement** : squelette en barres horizontales sur une frise. Variante **sombre**
  du 404 incluse. (Présenté sur un canevas pannable.)

### 8. Shell d'application (`App.dc.html`) — point d'entrée
- **But** : maquette globale du site final. **Nav latérale persistante** (Tableau de
  bord / Timeline / Produits, actif en surbrillance via classe `.is-active`), bouton
  Nouvel événement (ouvre le formulaire **en overlay** dans le shell), langue,
  profil (avatar carré), thème.
- **Composition** : monte l'écran actif via `dc-import` en **mode `embedded`** (la nav
  interne en double et les bascules de thème des écrans sont masquées ; le thème est
  hérité du shell). Le clic « Éditer » d'un événement (frise) ouvre l'overlay de
  formulaire. *Équivalent prod* : un layout applicatif + routeur (`/dashboard`,
  `/timeline`, `/products`) ; le formulaire = route modale.

---

## Interactions & comportements (transversal)
- **Thème clair/sombre** : classe sur la racine, tous les tokens en `var(--*)`.
- **Zoom frise** : continu, ancré sous le curseur ; lecture textuelle mono.
- **Minimap / viewport / ruban dashboard** : déplaçables au pointeur, synchronisés au
  scroll de la frise.
- **Accordéons catégorie** : pliage au clic sur l'en-tête (le panneau de scroll ignore
  ces en-têtes pour ne pas démarrer un pan).
- **Drawers** : slide-in `cubic-bezier(.32,.72,0,1)` ~220ms, fermeture par croix /
  scrim / Échap.
- **Formulaire** : validation e-mail inline ; preview live ; récurrence visuelle.
- **Responsive** (à implémenter en prod) : desktop plein écran ; tablette sidebar
  repliable ; mobile frise horizontale conservée (1–2 lanes), pinch-zoom natif.

## State management (par écran)
- **Timeline** : `pxPerDay` (zoom), `scrollLeft`, `collapsed{cat}`, `hiddenCats{}`,
  `selectedEvent`, `hover`, `theme`.
- **Produits** : `view` (list/detail/categories), `selectedProduct`, `search`, `sort`,
  `categories[]`, `products[]` (cat modifiable), form nouvelle catégorie.
- **Formulaire** : `title, category, productId, type, start, end, recurrence, color,
  customColor`, `loading`, `success`.
- **Auth** : `mode, name, email, password, error, loading, success`.
- **Shell** : `route`, `theme`, `lang`, `showCreate`.
- Données : à terme via fetch/API (entités Product, Event, Category, User) + i18n
  FR/EN/ES/DE (prévoir +30% d'élasticité pour l'allemand).

## Composants du design system (réutiliser tels quels)
Namespace runtime `MyTimelineDesignSystem_2b7a7a` (source : projet design system).
- **Boutons** : Button (primary/secondary/ghost/accent/danger ; sm/md/lg), IconButton
- **Formulaires** : Input, Textarea, Select (combobox a11y), Checkbox, Radio, Switch
- **Affichage** : Badge, Tag, Avatar, Card
- **Feedback** : Toast, Tooltip, Dialog (focus trap, Échap)
- **Navigation** : Tabs
- **Frise** : TimelineRuler, TimelineLane, TimelineEventBar, TimelineCursor,
  TimelineMinimap, TimelineZoomControls, DateStamp, EventPill, RecurrenceBadge
- **Icônes** : Icon (set maison stroke 1.5 : timeline, event, duration, milestone,
  today, recurrence, minimap, ruler, deadline, reminder, filter, archive, search,
  logo, + marques catégories). Fallback Lucide stroke 1.5.

## Assets
Aucun bitmap. Icônes = composant `Icon` (SVG maison). Polices via Google Fonts
(Archivo + IBM Plex Mono) — vendoriser en `.woff2` pour l'offline en prod.

## Fichiers (dans ce bundle)
- `App.dc.html` — shell applicatif (point d'entrée, compose les écrans)
- `Vue Timeline.dc.html` — frise (écran cœur)
- `Dashboard.dc.html` — tableau de bord
- `Produits.dc.html` — liste + détail + catégories
- `Formulaire Événement.dc.html` — création/édition (drawer + aperçu)
- `Landing.dc.html` — site public
- `Auth.dc.html` — connexion/inscription/réinitialisation
- `États système.dc.html` — 404 / 500 / vide / chargement
- `CLAUDE.md` — conventions projet (langue, traitement des barres, ADN frise)

> Le **design system** (tokens CSS + bundle de composants) vit dans le projet
> `MyTimelineDesignSystem` lié ; chaque `.dc.html` le charge depuis
> `_ds/mytimeline-design-system-…/`. En prod, mappez ces tokens/composants sur le
> design system du codebase cible (ou portez ceux-ci).
