# Audit de conformité maquettes ↔ production — 7 septembre 2026

> **Instantané daté.** Ce document décrit l'état constaté le 7 septembre 2026. Il ne se met
> pas à jour tout seul : la source de vérité vivante, ce sont les **59 issues** ouvertes ce
> jour-là. Quand elles se ferment, ce document se périme — le consulter pour comprendre
> *pourquoi* la dette existe, pas pour savoir *où elle en est*.

**Méthode.** Confrontation du code de production au **handoff écrit** du projet Claude Design
« Refonte graphique MyTimeline » (`design_handoff_mytimeline/README.md`), écran par écran,
plutôt qu'à une comparaison d'images. C'est ce qui a permis de trouver des écarts structurels
qu'une capture ne montre pas.

**Rapport mis en page** (mêmes constats, filtrables) :
<https://claude.ai/code/artifact/04c3e981-a7bc-4cb5-9772-2c828d926b01>

---

## Résultat

| | |
|---|---|
| Écarts constatés | **76** |
| Points à arbitrer | **12** |
| Écrans audités | **8** |
| Tokens dérivés | **1 sur ~140** |
| Issues ouvertes | **59** (#574–#634) |

**Les fondations sont fidèles.** Un seul token diverge sur plus de 140 — `--color-accent`
vaut `blue-600` en local au lieu de `blue-500`, un assombrissement a11y délibéré. Les polices,
l'échelle typographique, les rayons, les ombres et les tokens de frise sont exacts.
**La dérive est entièrement dans les écrans.**

### Les deux projets Claude Design — piège documenté

MyTimeline a **deux** projets Claude Design, et les confondre fait conclure à tort que des
écrans n'ont jamais été dessinés :

| Projet | UUID | Contenu |
|---|---|---|
| **Refonte graphique MyTimeline** — *les maquettes* | `e8ce9db5-cc08-42a5-8585-76e13a43f2f8` | 29 `.dc.html` + le handoff + ~50 captures |
| **MyTimeline Design System** | `2b7a7a3d-0e83-482c-bdaa-9f457487a0d1` | tokens + 27 composants |

⚠️ L'API `list_projects` ne renvoie **que les projets de type design-system**. Le projet des
maquettes n'y apparaît jamais : il faut l'adresser par son UUID. Ne jamais déduire le
périmètre du design depuis cette liste.

---

## Les quatre motifs transversaux

Les écarts individuels comptent moins que les mécanismes qui les produisent.

> ⚠️ Ces quatre issues ne couvrent que **8 des 76 écarts**. Elles corrigent ; elles ne
> construisent rien. Le gros du volume est dans les lots par écran.

### 1. L'ombre au repos contre le filet — [#574](https://github.com/LeenVandelied/MyTimeline/issues/574)

La charte impose un filet 1 px sur les surfaces au repos et réserve les ombres aux popovers et
modales. Le commentaire du token le dit : *« rules come first »* (`ds/tokens/spacing.css:3-4,31`).
Pourtant `shadow-lg` est posée au repos sur **8 surfaces** : landing (3), pages Auth (4),
pages légales (2 — qui portent déjà un filet). Sur `FeaturesSection.tsx:65`, l'ombre *diminue*
au survol : l'effet est inversé.

**Réglages est le seul écran indemne** des trois premiers motifs — s'en servir comme référence.

### 2. Le titre avalé par l'eyebrow — [#575](https://github.com/LeenVandelied/MyTimeline/issues/575)

Huit titres de section sont rendus en `text-ink-faint text-2xs font-mono tracking-widest
uppercase` — 13 px, gris pâle — au lieu de titres display sentence case. C'est la principale
raison pour laquelle le tableau de bord lit à plat.

L'ambiguïté de la charte (« MAJUSCULES + mono réservé aux eyebrows, **en-têtes**, badges,
graduations ») est tranchée par le code lui-même :

1. aucune classe `.mt-*` en mono-capitales ne porte un nom de titre — `.mt-table th`,
   `.mt-lane__cat`, `.mt-tlv__group-head`, `.mt-label` sont des en-têtes de colonne, de groupe
   ou de champ ;
2. les vrais titres du DS sont en display semi-gras : `.mt-dialog__title`, `.mt-toast__title` ;
3. le motif correct existe déjà dans le produit — `GreetingHeader.tsx:44-50` pose un eyebrow
   **au-dessus** d'un vrai titre.

### 3. Trois palettes concurrentes — [#577](https://github.com/LeenVandelied/MyTimeline/issues/577)

| | |
|---|---|
| Les 12 tokens `--evt-*` | reproduisent exactement la palette du handoff — **utilisés par aucun sélecteur** |
| `CATEGORY_SWATCHES` | bon motif (12 pastilles + repli), mais **10 valeurs sur 12 divergent** |
| Formulaire d'événement | **aucune palette** — sélecteur hexadécimal libre en permanence |

Le contraste reste garanti, mais par calcul dynamique de l'encre, pas par restriction de la
palette : c'est la cohérence chromatique qui est perdue, pas la lisibilité.

⚠️ **Migration de données.** Les catégories existantes portent déjà des couleurs de l'ancienne
palette. Changer la palette ne change pas les valeurs stockées — trancher avant de coder.

### 4. Le précédent interne a remplacé la maquette — [#578](https://github.com/LeenVandelied/MyTimeline/issues/578)

**C'est la cause racine**, les trois autres motifs en étant en partie des symptômes.

L'état de navigation actif — pilule bleu pâle au lieu de la pilule graphite — naît dans
`SettingsShell.tsx:93`, introduit le 5 juillet 2026 par le commit `43d9e14` (#86). `AppShell.tsx:222-224`
l'a ensuite recopié, et le **documente explicitement** en commentaire (`:91-93`) : la classe est
*« calquée sur SettingsShell »*. La maquette n'est pas mentionnée.

Chaque écran s'est aligné sur son voisin interne plutôt que sur la référence. Le projet de
maquettes n'a d'ailleurs pas été modifié depuis le **24 juin 2026**, soit une vingtaine de sprints :
la référence a cessé d'être consultée *et* d'être mise à jour.

---

## Écarts par écran

Chaque issue nomme les écarts qu'elle couvre. **43 issues pour 68 écarts** : les constats qui
relèvent du même geste ont été regroupés.

### Vue Timeline — 19 écarts, 11 issues

L'écran cœur, celui que le handoff appelle « l'ADN » du produit.

| Constat | Issue |
|---|---|
| Sidebar absente : ni filtres par catégorie, ni légende couleur, ni pliage global | [#592](https://github.com/LeenVandelied/MyTimeline/issues/592) |
| Zoom discret à 5 paliers au lieu du continuum heure→trimestre | [#593](https://github.com/LeenVandelied/MyTimeline/issues/593) |
| Événement ponctuel rendu comme une barre, pas comme un pin ~10 px | [#594](https://github.com/LeenVandelied/MyTimeline/issues/594) |
| Ni glyphe `↻` ni occurrences fantômes (le CSS existe, câblé au seul aperçu du formulaire) | [#595](https://github.com/LeenVandelied/MyTimeline/issues/595) |
| Zébrures de lanes remplacées par une grille verticale de jours | [#596](https://github.com/LeenVandelied/MyTimeline/issues/596) |
| `F` fait plein écran au lieu de recadrer — et rien ne recadre | [#597](https://github.com/LeenVandelied/MyTimeline/issues/597) |
| Pas de déplacement par glisser horizontal | [#598](https://github.com/LeenVandelied/MyTimeline/issues/598) |
| Aucun tooltip au survol (l'info n'existe que pour les lecteurs d'écran) | [#599](https://github.com/LeenVandelied/MyTimeline/issues/599) |
| Drawer amputé : ni durée, ni récurrence, ni Archiver, dates non ISO | [#600](https://github.com/LeenVandelied/MyTimeline/issues/600) |
| En-têtes de catégorie sans pastille ni compteur, repli qui n'affiche rien | [#601](https://github.com/LeenVandelied/MyTimeline/issues/601) |
| Ni bouton Aujourd'hui ni bouton Nouvel événement dans la barre d'outils | [#602](https://github.com/LeenVandelied/MyTimeline/issues/602) |

**Conforme** : règle sticky adaptative, week-ends filetés, ligne TODAY, tokens de frise exacts
(46/168/44 px), rayon 6 px, cinq raccourcis sur six — et surtout l'**encre à contraste
automatique** sur les barres, précisément le point arbitré contre la direction « pastel +
stries » rejetée par le handoff.

### Produits & Catégories — 10 écarts, 7 issues

| Constat | Issue |
|---|---|
| « Dernière activité » regarde le passé là où le spec veut le prochain événement (+ tri, + compteur) | [#603](https://github.com/LeenVandelied/MyTimeline/issues/603) |
| « Affecter les produits » absent, pas de puces produits sur les cartes | [#604](https://github.com/LeenVandelied/MyTimeline/issues/604) |
| « Supprimer » archive en réalité (soft delete) ; aucune action Nouvel événement | [#605](https://github.com/LeenVandelied/MyTimeline/issues/605) |
| La fiche d'inventaire n'utilise pas le motif `.mt-drawer__row` du DS | [#606](https://github.com/LeenVandelied/MyTimeline/issues/606) |
| Désaturation ni sur les événements passés, ni sur les lignes | [#607](https://github.com/LeenVandelied/MyTimeline/issues/607) |
| Mini-frise 90 jours masquée sous le palier tablette | [#608](https://github.com/LeenVandelied/MyTimeline/issues/608) |
| En-têtes de colonnes hors motif `.mt-table`, catégorie non fusionnée | [#609](https://github.com/LeenVandelied/MyTimeline/issues/609) |

### Landing — 9 écarts, 7 issues

L'écran le plus éloigné de sa maquette, et le premier que voit un visiteur.

| Constat | Issue |
|---|---|
| Hero en 50/50 avec image statique au lieu du 30/70 avec frise animée | [#610](https://github.com/LeenVandelied/MyTimeline/issues/610) |
| Frise du hero = placeholder assumé (5 pastilles, boucle 6 s au lieu de 52 s) | [#611](https://github.com/LeenVandelied/MyTimeline/issues/611) |
| Deux sections redondantes au lieu de la frise de cas d'usage à 4 jalons | [#612](https://github.com/LeenVandelied/MyTimeline/issues/612) |
| Avis presse pleine largeur rendus en trois cartes de témoignages | [#613](https://github.com/LeenVandelied/MyTimeline/issues/613) |
| Navigation non sticky, liens hors traitement du spec | [#614](https://github.com/LeenVandelied/MyTimeline/issues/614) |
| Accent bleu employé comme ornement (perd sa fonction de signal) | [#615](https://github.com/LeenVandelied/MyTimeline/issues/615) |
| `max-width: 1340px` absente — la page s'étale jusqu'à 1536 px | [#616](https://github.com/LeenVandelied/MyTimeline/issues/616) |

`HeroTimelineAnimation.tsx:6-9` se déclare lui-même hors spec : *« cette animation n'est PAS
spécifiée au design system, elle sera probablement remplacée »*.

### Formulaire Événement — 9 écarts, 6 issues

| Constat | Issue |
|---|---|
| **Le champ Catégorie n'existe pas** — seul écart touchant le contrat backend | [#617](https://github.com/LeenVandelied/MyTimeline/issues/617) |
| Deux surfaces divergentes (création 452 px par token / édition 480 px en dur) | [#618](https://github.com/LeenVandelied/MyTimeline/issues/618) |
| Type et récurrence en déroulant au lieu de segmenté | [#619](https://github.com/LeenVandelied/MyTimeline/issues/619) |
| Durée calculée jamais affichée | [#620](https://github.com/LeenVandelied/MyTimeline/issues/620) |
| Aucun toast de confirmation (aucune lib dans le dépôt — ferme #460) | [#621](https://github.com/LeenVandelied/MyTimeline/issues/621) |
| Ordre des champs divergent | [#622](https://github.com/LeenVandelied/MyTimeline/issues/622) |

**Conforme** : l'aperçu live rend la récurrence exactement comme la charte l'exige — fantôme en
contour pointillé, connecteur en tirets, glyphe `↻`, **aucune trame de stries**. C'est le seul
endroit du produit où la règle ayant fait rejeter la direction « pastel + stries » est
pleinement appliquée.

### États système, shell & pages légales — 5 écarts, 5 issues

| Constat | Issue |
|---|---|
| 404 générique au lieu de l'éphéméride datée (`StateScreen` n'a pas de prop date) | [#627](https://github.com/LeenVandelied/MyTimeline/issues/627) |
| `error.digest` disponible mais jamais affiché — aucune référence d'incident | [#628](https://github.com/LeenVandelied/MyTimeline/issues/628) |
| Le squelette de chargement en frise existe mais n'est monté sur aucune route | [#629](https://github.com/LeenVandelied/MyTimeline/issues/629) |
| États vides sans frise pointillée, composant utilisé à un seul endroit | [#630](https://github.com/LeenVandelied/MyTimeline/issues/630) |
| Création d'événement pas en route modale : URL inchangée, Retour inopérant | [#631](https://github.com/LeenVandelied/MyTimeline/issues/631) |

**Conforme** : **zéro emoji** dans tout le produit (balayage Unicode complet), seul `↻` apparaît.

### Tableau de bord — 4 écarts, 2 issues

| Constat | Issue |
|---|---|
| Ruban de densité sans règle ni viewport déplaçable | [#623](https://github.com/LeenVandelied/MyTimeline/issues/623) |
| Frise complète dupliquée, pas de bouton « Ouvrir la frise », CTA inversés | [#624](https://github.com/LeenVandelied/MyTimeline/issues/624) |

**Conforme** : « En bref » rend bien la marginalia phrasée du spec (valeurs mono inline, filets,
pas de gros nombre display), sidebar 248 px, avatar carré, ligne TODAY.

### Auth — 6 écarts, 2 issues propres

Quatre écarts sont absorbés ailleurs : l'ombre par #574, les 4 routes et le state `mode` par
#579, le thème par #587.

| Constat | Issue |
|---|---|
| Layout asymétrique absent, formulaire à 448 px au lieu de 380 | [#625](https://github.com/LeenVandelied/MyTimeline/issues/625) |
| État de succès en texte plat au lieu d'une carte avec coche | [#626](https://github.com/LeenVandelied/MyTimeline/issues/626) |

**Conforme** : erreurs inline en texte `danger` sans fond rouge, exactement le traitement
demandé. Et `username` plutôt qu'`email` est une **règle métier tracée**, pas une dérive.

### Mobile, responsive, a11y, multilingue & RTL — 6 écarts, 3 issues propres

Le bloc le plus sain : la contrainte la plus dure du handoff — **« frise = ADN », conservée sur
mobile, jamais de grille qui wrap** — est tenue.

| Constat | Issue |
|---|---|
| Le filet d'élasticité allemande du DS (`.mt-eyebrow`) n'est câblé nulle part | [#632](https://github.com/LeenVandelied/MyTimeline/issues/632) |
| Cible tactile du bouton retour des réglages mobiles à 36 px | [#633](https://github.com/LeenVandelied/MyTimeline/issues/633) |
| Couleur littérale hors tokens dans `EventBar.tsx` (composant probablement mort) | [#634](https://github.com/LeenVandelied/MyTimeline/issues/634) |

RTL et breakpoints relèvent d'arbitrages (#589, #588).

---

## Les 12 arbitrages

Ce sont des **questions**, pas des tâches. Quatre d'entre elles bloquent des lots entiers.

| Question | Issue | Bloque |
|---|---|---|
| Auth : 4 routes ou 1 écran à 3 onglets ? | [#579](https://github.com/LeenVandelied/MyTimeline/issues/579) | lot Auth |
| Connexion Google / GitHub : planifier ou retirer du spec ? | [#580](https://github.com/LeenVandelied/MyTimeline/issues/580) | — |
| Copie des états de chargement : générique ou contextuelle ? | [#581](https://github.com/LeenVandelied/MyTimeline/issues/581) | — |
| Les 7 catégories par défaut n'existent pas : seeder, suggérer ou assumer le vide ? | [#582](https://github.com/LeenVandelied/MyTimeline/issues/582) | #617, dépend de #577 |
| Récurrence hebdomadaire hors mock : acter la divergence | [#583](https://github.com/LeenVandelied/MyTimeline/issues/583) | #619 |
| Champ Produit : `Select` ou combobox filtrant ? | [#584](https://github.com/LeenVandelied/MyTimeline/issues/584) | — |
| Métrique « jour de série » hors spec | [#585](https://github.com/LeenVandelied/MyTimeline/issues/585) | — |
| Landing : 2 sections hors spec, dont une annonce d'apps mobiles inexistantes | [#586](https://github.com/LeenVandelied/MyTimeline/issues/586) | #610 |
| Bascule de thème hors connexion : globale ou réservée au shell ? | [#587](https://github.com/LeenVandelied/MyTimeline/issues/587) | landing, auth, frise |
| Breakpoints ad hoc : Tailwind ou tokens `--bp-*` ? | [#588](https://github.com/LeenVandelied/MyTimeline/issues/588) | lot Mobile |
| RTL : dette préventive assumée ou périmètre livrable ? | [#589](https://github.com/LeenVandelied/MyTimeline/issues/589) | — |
| Frise : thème et bouton « Nouvel événement » dans l'en-tête | [#590](https://github.com/LeenVandelied/MyTimeline/issues/590) | — |

---

## Ce que cet audit ne prouve pas

- **Aucun rendu n'a été observé.** Ni la production — un certificat Let's Encrypt de *test*
  couplé à HSTS rendait le site inaccessible dans Chrome ce jour-là — ni les prototypes. Les
  contrastes réels, les débordements en allemand et le ressenti des gestes tactiles se mesurent
  en navigateur.
- **Les `.dc.html` n'ont pas été ouverts.** Ils sont hors dépôt et lourds. Les arbitrages fins
  (teinte exacte de la pilule, correspondance des breakpoints) reposent sur le texte du handoff.
- **Cinq maquettes n'ont pas de spec écrit** : Réglages, Page Légale, Bannière Offline, Dialogs
  de confirmation, États transactionnels. Jugées sur les conventions transversales seules.
  « États transactionnels » n'a d'ailleurs **aucun équivalent identifiable dans le code**.
- **Les priorités sont uniformes, donc fausses.** Presque tout est en P2. La largeur maximale de
  la landing et la sidebar de la frise ne pèsent pas la même chose ; un vrai passage de
  priorisation reste à faire, et il demande un arbitrage produit.
- **Les comptages ne sont pas des poids.** 19 écarts sur la frise ne la rendent pas 19 fois pire
  que le formulaire, dont l'unique champ Catégorie manquant touche le contrat backend.

## Deux erreurs commises pendant l'audit, corrigées

1. **Le mauvais projet a été audité en première passe**, conduisant à affirmer à tort que la
   landing, les produits, les réglages et le mobile n'avaient jamais été dessinés. Cause :
   `list_projects` ne renvoie que les projets de type design-system (voir plus haut).
2. **« En bref » a été signalé comme non conforme** sur lecture d'une capture, alors que le code
   rend la marginalia phrasée attendue. Réfuté preuve à l'appui.

---

## Ordre de traitement proposé

1. **Rendre le site accessible.** Certificat de test + HSTS : tant que ce point tient, aucun
   écart n'a d'importance pratique. Pas d'issue — manipulation sur l'hôte.
2. **Les quatre motifs transversaux** (#574, #575, #577, #578) — meilleur rapport effet/effort.
3. **Les arbitrages, avant tout code** (#579–#590) — ils changent ce qu'il faut construire.
4. **La frise et le formulaire** (#592–#602, #617–#622) — le cœur du produit, le seul lot qui
   touche le backend.
5. **La landing** (#610–#616) — la plus éloignée, mais aussi la seule page publique. Si
   l'objectif est de montrer le produit, elle remonte en tête.

### Dépendances à respecter

- **#618 avant tout le reste du formulaire** — sinon chaque correctif s'applique deux fois.
- **#575 avant #632** — sinon on câble `.mt-eyebrow` sur des éléments voués à changer de nature.
- **#579 avant #625** — sinon le panneau Auth est construit quatre fois.
- **#577 avant #582** — seeder avant d'avoir arbitré la palette figerait de mauvaises valeurs.
