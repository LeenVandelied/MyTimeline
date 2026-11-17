# Issue #700 — Grille de vérification lecteur d'écran (VoiceOver macOS / iOS, NVDA)

> À remplir par le dev (volet manuel de #700, l'issue reste ouverte). Préparée au Sprint 112
> sur `sprint/112` (HEAD du commit #700). Textes attendus lus dans `frontend/public/locales/fr/*.json`
> (locale `fr`), jamais reformulés. Composants : `frontend/src/components/shared/EmptyState.tsx`,
> `frontend/src/components/shared/LoadingSkeleton.tsx`.

## Ce qui est vérifié, et pourquoi c'est fragile

- `EmptyState` : région `role="status"` (live polie) qui couvre **le titre (+ description)
  seulement** ; le bouton d'action est rendu À CÔTÉ de la région. Attendu : le message est
  annoncé, **le libellé du bouton ne l'est PAS dans la même annonce**.
- `LoadingSkeleton` : conteneur `role="status"` avec le libellé en `sr-only` à l'intérieur, les
  blocs gris en `aria-hidden`, **aucun `aria-busy`** (Sprint 90 : VoiceOver retenait l'annonce).
  Attendu : le libellé est annoncé à l'apparition du squelette, rien d'autre (pas de « groupe »,
  pas de bruit des blocs).
- Risque signalé par l'issue : ces deux régions sont **insérées dans le DOM déjà remplies**.
  Plusieurs lecteurs d'écran n'annoncent une région live que si son CONTENU change après
  qu'elle a été vue. Une case « non annoncé » ici est donc un résultat plausible, pas une
  erreur de manipulation.
- ⚠ Un squelette présent dans le **HTML du premier chargement** (rechargement complet, F5) n'est
  PAS une insertion : aucun lecteur d'écran n'est censé l'annoncer. Chaque ligne ci-dessous
  indique donc un parcours d'**insertion** (navigation côté client, changement d'onglet, requête
  qui part après le montage). Ne pas conclure « non annoncé » sur un rechargement complet.

## Préparation

1. **Compte** : créer un compte NEUF sur `/fr/register` (aucun produit, aucune catégorie
   personnelle, aucun événement). Ne pas utiliser les comptes E2E (`PROD`, `SHARED`…) : ils sont
   partagés par la suite Playwright et recyclés à chaque run. Noter si le compte neuf porte des
   catégories système (l'état vide Catégories n'est atteignable que si la liste est VIDE).
2. **Serveur** : un build de production (`next build` + `next start`), pas `next dev` (en dev,
   les squelettes de segment ne sont pas peints faute de préchargement — 4 faux rouges connus).
3. **Ralentir le réseau** (pour laisser le temps d'entendre le squelette) :
   - macOS Chrome / Edge (VoiceOver, et NVDA sous Windows) : DevTools → Network → « Slow 3G »
     (ou profil personnalisé 2 000 ms de latence), cache désactivé ;
   - macOS Safari : Web Inspector → Network → icône de limitation, ou Network Link Conditioner
     (Xcode Additional Tools) profil « 3G » ;
   - iOS Safari : Réglages → Développeur → Network Link Conditioner → « 3G » ou « Very Bad
     Network » (menu Développeur visible une fois l'iPhone branché à Xcode).
4. **Lecteurs** : VoiceOver macOS (Safari de préférence, puis Chrome), VoiceOver iOS (Safari),
   NVDA (Firefox et Chrome, Windows). Verbosité par défaut. Noter la version de chacun.
5. **Consigne d'écoute** : placer le curseur VO / NVDA sur l'élément qui déclenche l'action
   (onglet, lien de navigation), activer, **ne plus toucher** pendant 5 s, noter mot pour mot
   ce qui est lu.

Légende des cases : `OK` annoncé comme attendu · `KO-silence` rien d'annoncé · `KO-bouton` le
libellé du bouton est lu avec le message · `KO-bruit` autre chose lu en plus (préciser) ·
`N/A` non atteignable (préciser pourquoi).

## A. États vides (`EmptyState`)

| # | État (testid) | Parcours pour le provoquer (insertion) | Doit être annoncé | Ne doit PAS être annoncé dans la même annonce | VO macOS | VO iOS | NVDA |
|---|---|---|---|---|---|---|---|
| A1 | Produits, liste vide (`products-empty`) | Compte neuf, `/fr/dashboard` → lien « Produits » de la navigation (navigation client) ; réseau ralenti pour que la liste arrive APRÈS le montage | « Ajoute un premier produit pour suivre ses échéances. » | « Ajouter un produit » (CTA) | | | |
| A2 | Catégories vides (`categories-empty`) | `/fr/products` → onglet « Catégories » (le GET des catégories part au changement d'onglet) | « Crée une catégorie pour regrouper tes produits. » | « Créer une catégorie » (CTA) | | | |
| A3 | Recherche sans résultat (`products-empty-search`) | Compte avec ≥ 1 produit, `/fr/products`, taper `zzz` dans la recherche (insertion sans réseau) | « Aucun produit ne correspond à ta recherche. » | « Effacer la recherche » | | | |
| A4 | Archivés vides (`products-archived-empty`) | `/fr/products` → onglet « Archivés » | « Aucun produit archivé. » | — (pas d'action) | | | |
| A5 | Dashboard, liste produits vide (`dashboard-product-list-empty`, ≥ 768 px) | Compte neuf, `/fr/products` → lien « Tableau de bord » | « Ajoute un premier produit pour suivre ses échéances » | « Aller aux produits » | | | |
| A6 | Dashboard, agenda de la semaine vide (`dashboard-week-agenda-empty`, ≥ 768 px) | Compte avec 1 produit SANS événement cette semaine, navigation client vers « Tableau de bord » | « Rien cette semaine : ajoute un événement pour le suivre ici » | « Ajouter un événement » | | | |
| A7 | Dashboard mobile, carrousel produits vide (`dashboard-product-carousel-empty`, portrait < 768 px) | iPhone / fenêtre étroite, compte neuf, navigation client vers le tableau de bord | « Ajoute un premier produit pour suivre ses échéances » | « Aller aux produits » | | | |
| A8 | Dashboard mobile, agenda compact vide (`dashboard-compact-agenda-empty`, portrait) | iPhone / fenêtre étroite, compte avec 1 produit sans événement aujourd'hui ni demain | « Rien aujourd'hui ni demain : ajoute un événement pour le suivre ici » | « Ajouter un événement » | | | |
| A9 | Frise vide (`timeline-empty`) | Compte neuf, lien « Timeline » de la navigation | « Ajoutez un premier produit pour tracer votre frise » puis « Chaque produit occupe une ligne ; ses événements s'y placent dans le temps. » | « Créer un produit » | | | |

## B. Squelettes de chargement (`LoadingSkeleton`)

| # | Squelette (testid) | Parcours pour le provoquer (insertion) | Doit être annoncé | VO macOS | VO iOS | NVDA |
|---|---|---|---|---|---|---|
| B1 | Segment Produits (`products-loading-skeleton`, `app/[locale]/(app)/products/loading.tsx`) | Réseau ralenti, depuis le tableau de bord : lien « Produits » de la navigation | « Chargement des produits… » | | | |
| B2 | Liste produits, requête (`products-loading`) | Réseau ralenti ; la page s'affiche puis attend le GET de la liste (visible surtout après B1) | « Chargement des produits… » | | | |
| B3 | Catégories (`categories-loading`) | Réseau ralenti, `/fr/products` → onglet « Catégories » (première ouverture de la session, sinon cache 30 s) | « Chargement des catégories… » | | | |
| B4 | Archivés (`products-archived-loading`) | Réseau ralenti, onglet « Archivés » (première ouverture) | « Chargement des produits archivés… » | | | |
| B5 | Segment fiche produit (`product-detail-loading-skeleton`) | Réseau ralenti + cache vidé, clic sur une ligne de la liste produits (visible au PREMIER chargement du code de la fiche uniquement) | « Chargement du produit… » | | | |
| B6 | Fiche produit, requête (`product-detail-loading`) | Réseau ralenti, ouvrir une fiche produit depuis la liste | « Chargement du produit… » | | | |
| B7 | Segment Tableau de bord (`dashboard-loading-skeleton`) | Réseau ralenti, depuis `/fr/products` : lien « Tableau de bord » | « Chargement en cours » | | | |
| B8 | Segment Timeline (`timeline-loading-skeleton`) | Réseau ralenti, lien « Timeline » de la navigation | « Chargement… » | | | |
| B9 | Frise, requête (`timeline-data-loading`) | Réseau ralenti, sur la Timeline après B8 (attente des données) | « Chargement… » | | | |
| B10 | Segment Réglages (`settings-loading-skeleton`) | Réseau ralenti, lien « Réglages » | « Chargement… » | | | |

Points d'attention en B : B8, B9 et B10 annoncent le même mot générique « Chargement… »
(`shell.timeline.loading`, `settings.loading`) ; noter s'il est jugé suffisant — c'est une
remarque de contenu, pas un défaut de la région. Si un squelette ne reste affiché que quelques
dizaines de ms malgré le ralentissement, noter `N/A (trop bref)` plutôt que `KO-silence`.

## C. Retour du focus (contrôle d'écoute facultatif)

Déjà couvert en E2E réel (`frontend/e2e/sprint-112-focus-return.spec.ts`, 8 tests). Contrôle
d'écoute optionnel : après fermeture du tiroir, le lecteur doit lire le bouton qui reprend le
focus, jamais « page » / « contenu web » (signe d'un focus perdu sur `body`).

| # | Parcours | Doit être lu à la fermeture | VO macOS | VO iOS | NVDA |
|---|---|---|---|---|---|
| C1 | A1, activer « Ajouter un produit », puis « Annuler » | « Ajouter un produit, bouton » | | | |
| C2 | A1, créer un produit | « Nouveau produit, bouton » (éventuellement précédé de « Ajouter un produit » si la liste arrive après la fermeture) | | | |
| C3 | A2, activer « Créer une catégorie », puis Échap | « Créer une catégorie, bouton » | | | |
| C4 | A2, créer une catégorie | « Nouvelle catégorie, bouton » | | | |

## Suite à donner selon le résultat

- Toutes les cases A/B à `OK` : cocher le critère « rapport de vérification manuelle » de #700
  en joignant ce tableau rempli ; aucun changement de code.
- Au moins un `KO-silence` sur A ou B : appliquer le correctif prévu par l'issue — région live
  **permanente** (présente dans le DOM dès le montage du conteneur parent, vide), dont le
  contenu est ÉCRIT après le montage — dans `EmptyState` et/ou `LoadingSkeleton`, puis rejouer
  les lignes KO. Ne pas le faire par anticipation (arbitrage du 2026-09-24).
- `KO-bouton` : la séparation région / action de `EmptyState` (Sprint 90) est contournée par le
  lecteur ; noter lequel et sa version avant toute modification.

Versions testées : VoiceOver macOS ____ (macOS ____, navigateur ____) · VoiceOver iOS ____
(iOS ____) · NVDA ____ (navigateur ____). Date : ____ . Testeur : ____ .
