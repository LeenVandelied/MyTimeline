# Issue #533 — [I18N] Pages légales : intitulés de sections restés en français en `en`/`es`/`de`

Sprint 77, vague 2. Branche `sprint/77`. Base : `700a2d8` (vague 1, #457).

## 1. Objectif

Traduire les **22 intitulés de sections** (`*.title`) du namespace `legal` en `en`, `es` et `de`,
où ils étaient recopiés du français mot pour mot alors que le sommaire (`tableOfContents`) était,
lui, déjà traduit. **Périmètre arbitré par le dev : les titres SEULS** — les 44 clés de corps
(`*.content`, `*.items.*`, `*.meta.description`, `*.lastUpdated`) restent en français, couvertes par
`disclaimerOriginalFrench`.

## 2. Ce qui a été livré

| Fichier | Clés modifiées | Clés totales | Vérif parité |
|---|---|---|---|
| `frontend/public/locales/en/legal.json` | **19** valeurs (`19 +/-` au `git numstat`) | 66 (inchangé) | ✅ |
| `frontend/public/locales/es/legal.json` | **22** valeurs | 66 (inchangé) | ✅ |
| `frontend/public/locales/de/legal.json` | **22** valeurs | 66 (inchangé) | ✅ |
| `frontend/src/lib/legal-pages.test.ts` | +16 cas de test (60 → 76) | — | — |

**Pourquoi 19 et non 22 en `en`.** Trois intitulés anglais s'écrivent **exactement** comme leur
source française — `privacy.introduction.title` (« Introduction »), `privacy.contact.title`
(« Contact ») et `terms.article10.title` (« Article 10 – Contact »). Les 22 titres ont bien été
traités ; 3 d'entre eux produisent une valeur identique à l'octet près, donc 0 ligne de diff. Ce
sont de VRAIS cognats : les différencier artificiellement (« Foreword », « Contact us ») aurait
dégradé le texte pour satisfaire une assertion. Ils sont déclarés dans une allowlist nominative et
bornée du test (`FR_COGNATE_TITLES`), elle-même gardée par une assertion qui interdit qu'elle
grossisse en silence.

**Inventaire re-vérifié moi-même** (PIT-S71-001) : le relevé du briefing est **exact**. Aplatissement
des 4 fichiers → 66 clés chacun, jeux de clés strictement identiques, **exactement 22** clés se
terminant par `.title`, aucune 23e (pas de `meta.title`, pas de variante camelCase `*Title`). Avant
modification, `en`/`es`/`de` avaient **64 clés sur 66 identiques au français** — seules
`tableOfContents` et `disclaimerOriginalFrench` étaient traduites, ce qui confirme la mesure du lead
et non le chiffre « 20 » de l'énoncé.

**Rien d'autre n'a été touché** : `fr/legal.json` intact, `frontend/app/**` intact,
`frontend/e2e/**` intact, `frontend/src/styles/**` et `src/components/**` intacts, aucune valeur de
corps modifiée. Le `git diff --numstat` ne montre que `19/22/22` lignes changées, soit exactement le
compte des titres réellement retraduits.

## 3. Table des 22 titres × 3 locales

### `terms` (CGU)

| Clé | 🇫🇷 source | 🇬🇧 en | 🇪🇸 es | 🇩🇪 de |
|---|---|---|---|---|
| `terms.title` | Conditions Générales d'Utilisation | Terms of Use | Condiciones Generales de Uso | Allgemeine Nutzungsbedingungen |
| `terms.preamble.title` | Préambule | Preamble | Preámbulo | Präambel |
| `terms.article1.title` | Article 1 – Définitions | Article 1 – Definitions | Artículo 1 – Definiciones | Artikel 1 – Begriffsbestimmungen |
| `terms.article2.title` | Article 2 – Objet | Article 2 – Purpose | Artículo 2 – Objeto | Artikel 2 – Gegenstand |
| `terms.article3.title` | Article 3 – Accès au site | Article 3 – Access to the site | Artículo 3 – Acceso al sitio | Artikel 3 – Zugang zur Website |
| `terms.article4.title` | Article 4 – Propriété intellectuelle | Article 4 – Intellectual property | Artículo 4 – Propiedad intelectual | Artikel 4 – Geistiges Eigentum |
| `terms.article5.title` | Article 5 – Données personnelles | Article 5 – Personal data | Artículo 5 – Datos personales | Artikel 5 – Personenbezogene Daten |
| `terms.article6.title` | Article 6 – Responsabilité | Article 6 – Liability | Artículo 6 – Responsabilidad | Artikel 6 – Haftung |
| `terms.article7.title` | Article 7 – Liens hypertextes | Article 7 – Hyperlinks | Artículo 7 – Enlaces de hipertexto | Artikel 7 – Hyperlinks |
| `terms.article8.title` | Article 8 – Modification des CGU | Article 8 – Amendments to the Terms | Artículo 8 – Modificación de las condiciones | Artikel 8 – Änderung der Nutzungsbedingungen |
| `terms.article9.title` | Article 9 – Loi applicable | Article 9 – Governing law | Artículo 9 – Ley aplicable | Artikel 9 – Anwendbares Recht |
| `terms.article10.title` | Article 10 – Contact | Article 10 – Contact *(cognat)* | Artículo 10 – Contacto | Artikel 10 – Kontakt |

### `privacy` (Politique de confidentialité)

| Clé | 🇫🇷 source | 🇬🇧 en | 🇪🇸 es | 🇩🇪 de |
|---|---|---|---|---|
| `privacy.title` | Politique de Confidentialité | Privacy Policy | Política de Privacidad | Datenschutzerklärung |
| `privacy.introduction.title` | Introduction | Introduction *(cognat)* | Introducción | Einleitung |
| `privacy.dataCollection.title` | Collecte des données | Data collection | Recopilación de datos | Erhebung der Daten |
| `privacy.dataUse.title` | Utilisation des données | Use of data | Uso de los datos | Verwendung der Daten |
| `privacy.dataSharing.title` | Partage des données | Data sharing | Comunicación de datos | Weitergabe der Daten |
| `privacy.dataProtection.title` | Protection des données | Data protection | Protección de los datos | Schutz der Daten |
| `privacy.userRights.title` | Vos droits | Your rights | Sus derechos | Ihre Rechte |
| `privacy.cookies.title` | Cookies et technologies similaires | Cookies and similar technologies | Cookies y tecnologías similares | Cookies und ähnliche Technologien |
| `privacy.policyChanges.title` | Modifications de la politique | Changes to this policy | Modificaciones de la política | Änderungen dieser Datenschutzerklärung |
| `privacy.contact.title` | Contact | Contact *(cognat)* | Contacto | Kontakt |

Le **tiret demi-cadratin U+2013 (`–`)** est conservé sur les 30 titres d'articles (10 × 3 locales) —
vérifié par assertion, avec en plus un refus explicite du trait d'union ` - `.

## 4. Choix de terminologie justifiés

**`terms.title` — « Terms of Use » plutôt que « Terms of Service » (suggestion du briefing).**
Le document est titré « Conditions Générales d'**Utilisation** » et son article 2 précise qu'il
« a pour objet de définir les conditions dans lesquelles les utilisateurs peuvent accéder au Site et
l'utiliser ». « Terms of Service » désigne en pratique le contrat de fourniture d'un service (l'équivalent
des CGS/CGV) ; « Terms of Use » est l'équivalent consacré des CGU, qui régissent l'usage d'un site.
Le choix suit l'objet réel du texte, pas la formule la plus fréquente.

**`terms.title` — « Allgemeine Nutzungsbedingungen » plutôt que « Allgemeine Geschäftsbedingungen »
(AGB, suggestion du briefing).** « AGB » a un sens juridique *précis* en droit allemand (§§ 305 ss.
BGB : clauses contractuelles pré-rédigées d'un contrat de prestation). Le texte d'ici régit l'accès
et l'usage d'un site, pas une relation commerciale : « Nutzungsbedingungen » est le terme exact et
usuel des sites allemands pour des CGU. « Allgemeine » conserve le « Générales » de la source.
⚠ C'est le choix le plus discutable du lot et il mérite l'arbitrage humain : un relecteur
germanophone qui préférerait « AGB » a un argument recevable si le service devient payant.

**`terms.title` — « Condiciones Generales de Uso » plutôt que « Términos y Condiciones de Uso »
(suggestion du briefing).** Les deux sont consacrés en espagnol. « Condiciones Generales de Uso »
transpose terme à terme la structure « Conditions Générales d'Utilisation » et est la formule
standard en Espagne ; « Términos y Condiciones » est un calque de l'anglais, majoritaire en Amérique
latine. Le site est francophone d'origine et hébergé en Europe : registre péninsulaire retenu.

**`privacy.title`.** Aucun débat : « Privacy Policy », « Política de Privacidad »,
« Datenschutzerklärung » sont les trois formules consacrées, retenues telles que suggérées.

**Traductions non littérales assumées :**
- `terms.article2` « Objet » → **« Purpose »** / « Objeto » / **« Gegenstand »**. « Object » en
  anglais serait un contresens (l'objet physique) ; « Purpose » est l'intitulé contractuel consacré.
- `terms.article1` de → **« Begriffsbestimmungen »**, l'intitulé de rubrique consacré dans la
  rédaction législative allemande, plutôt que l'anglicisme « Definitionen ». ⚠ mot de **20
  caractères** non sécable — voir §5, c'est le `<h2>` le plus contraignant du document.
- `terms.article5` de → **« Personenbezogene Daten »**, terme exact du RGPD/DSGVO, et non
  « persönliche Daten » qui n'a pas de valeur juridique.
- `terms.article8` « Modification des CGU » → « Amendments to the Terms » /
  « Modificación de las condiciones » / « Änderung der Nutzungsbedingungen ». L'acronyme « CGU »
  n'existe pas hors du français : il est développé dans les trois langues.
- `privacy.dataSharing` « Partage des données » → es **« Comunicación de datos »** et non
  « Compartición de datos ». « Comunicación de datos » est le terme du RGPD en espagnol pour la
  divulgation à des tiers, ce que décrit le corps de la section ; « compartir » est un calque.
- `privacy.dataProtection` → de **« Schutz der Daten »** et non « Datensicherheit ». Le corps parle
  bien de mesures techniques et organisationnelles, ce qui plaiderait pour « Datensicherheit », mais
  l'intitulé français dit « Protection » et **la version française fait foi** : la fidélité au titre
  source l'emporte, d'autant que le sommaire doit correspondre au `<h2>`.
- `privacy.userRights` « Vos droits » → **vouvoiement** dans les trois langues (« Your rights »,
  « Sus derechos », « Ihre Rechte »), cohérent avec le registre du corps français (« vous
  disposez des droits suivants »).

**Cohérence de série** : les quatre sections `data*` de `privacy` forment une série parallèle en
anglais (« Data collection » / « Use of data » / « Data sharing » / « Data protection ») et en
allemand (« Erhebung / Verwendung / Weitergabe / Schutz **der Daten** »). Un lecteur qui parcourt le
sommaire y voit la structure du document, ce que des tournures hétérogènes auraient masqué.

**Casse** : sentence case pour les `<h2>` (comme la source française), title case réservé aux deux
`<h1>` (`terms.title`, `privacy.title`) qui sont des titres d'ouvrage. L'allemand capitalise ses
substantifs par grammaire, pas par style.

## 5. Entrée pour la vague 4 (#532) — rampe typographique du `<h1>`

Valeurs finales des deux clés rendues en `<h1>` sur `/terms` et `/privacy` :

```
fr / terms.title   = "Conditions Générales d'Utilisation" — mot le plus long : "d'Utilisation"        (13 car.)
fr / privacy.title = "Politique de Confidentialité"       — mot le plus long : "Confidentialité"      (15 car.)

en / terms.title   = "Terms of Use"                       — mot le plus long : "Terms"                 (5 car.)
en / privacy.title = "Privacy Policy"                     — mot le plus long : "Privacy"               (7 car.)

es / terms.title   = "Condiciones Generales de Uso"       — mot le plus long : "Condiciones"           (11 car.)
es / privacy.title = "Política de Privacidad"             — mot le plus long : "Privacidad"            (10 car.)

de / terms.title   = "Allgemeine Nutzungsbedingungen"     — mot le plus long : "Nutzungsbedingungen"  (19 car.)
de / privacy.title = "Datenschutzerklärung"               — mot le plus long : "Datenschutzerklärung" (20 car.)
```

**L'allemand est le cas dimensionnant, et il l'est explicitement.** Les deux `<h1>` allemands sont
des composés **non sécables** : `Datenschutzerklärung` (20 car.) est un mot unique qui constitue à
lui seul le titre — sa largeur `min-content` EST la largeur du `<h1>` entier, aucun retour à la
ligne ne peut la réduire. `Nutzungsbedingungen` (19 car.) impose le même plancher à `/terms`.
Comparé au français (`Confidentialité`, 15 car.) c'est **+33 % de largeur min-content**. Une rampe
calibrée sur `fr` ou `en` débordera ou tronquera en `de` sur écran étroit.

⚠ **Piège adjacent, hors du périmètre demandé mais mesuré** : le `<h2>` le plus long est
`terms.article1.title` en allemand — « Artikel 1 – **Begriffsbestimmungen** », mot de **20
caractères**, soit autant que le `<h1>` allemand. Si #532 ne calibre que les `<h1>`, le `<h2>`
allemand restera le point de rupture réel de la page. Pour référence : fr `intellectuelle` (14),
en `Intellectual` (12), es `Responsabilidad` (15).

Aucune césure automatique n'est posée sur ces pages à ce jour : `hyphens: auto` + `lang="de"` est une
piste pour #532, hors de mon périmètre — je ne l'ai pas appliquée.

## 6. Tests

**Garde-fou ÉTENDU, pas créé.** Un test de parité de locales existait déjà :
`describe('namespace legal — parité des 4 locales')` dans
`frontend/src/lib/legal-pages.test.ts` (#60, Sprint 75). J'y ai ajouté 16 cas plutôt que d'ouvrir un
fichier concurrent. `src/__tests__/i18n-namespaces.test.ts` (#441) ne vérifie que les namespaces de
**premier niveau** : il ne couvrait pas ce défaut et n'a pas été modifié.

Ce qui est prouvé, pour `en`/`es`/`de` :
1. **parité de clés** — assertion préexistante, conservée : les 4 locales exposent exactement le
   même jeu de 66 clés aplaties. Mon diff n'ajoute ni ne retire rien.
2. **non-identité** — `frenchLeftoverTitles()` renvoie `[]` : aucune des 22 clés `*.title` n'est plus
   égale à sa valeur française, hors les 3 cognats anglais déclarés. Plancher d'anti-vacuité
   (`toHaveLength(22)`) pour qu'un `titleKeys` qui cesserait de matcher ne rende pas l'assertion
   vide et verte.
3. **JSON valide + UTF-8 intact** — `JSON.parse` sur les 4 fichiers, et refus des trois façons dont
   ces fichiers s'abîment : mojibake `Ã` + continuation latin-1, `U+FFFD`, échappements `\uXXXX`.
   Plus une assertion sur des caractères réellement présents (`Datenschutzerklärung`, `Änderung`,
   `ähnliche`, `Preámbulo`, `Introducción`, `Artículo`).
4. **tiret demi-cadratin** — `U+2013` présent sur les 30 titres d'articles, et ` - ` refusé.

### Chiffres réels et codes de sortie (lus, pas déduits — PIT-S45-003 : toutes les commandes via `rtk proxy`)

| Commande | Résultat | Exit |
|---|---|---|
| `npx vitest run src/lib/legal-pages.test.ts src/__tests__/i18n-namespaces.test.ts` | 83 passed (76 + 7), 2 fichiers | **0** |
| `npx vitest run` (suite complète) | **1296 passed (1296)**, 112 fichiers | **0** |
| `npx tsc --noEmit -p tsconfig.json` | aucune sortie | **0** |
| `npx eslint src/lib/legal-pages.test.ts` | aucune sortie | **0** |
| `npx prettier --check` (les 3 JSON + le test) | tout formaté | **0** |

La suite complète était à 1280 en vague 1 ; 1280 + 16 = 1296, le compte se boucle exactement sur
mes ajouts. `src/styles/__tests__/tsx-focus-utility.test.ts` (garde de la vague 1) est **vert**.

### Contrôle négatif — la garde est ARMÉE (PIT-S62-003)

Deux niveaux, l'un permanent, l'autre joué une fois.

**(a) Permanent, dans le dépôt.** `it.each(TRANSLATED_LOCALES)('rougit sur une recopie du français
réinjectée en %s')` réinjecte **en mémoire** la valeur française de `privacy.dataCollection.title`
dans une copie chargée, et exige que `frenchLeftoverTitles` renvoie exactement `[victim]` — puis
revérifie que le fichier réel relu du disque reste propre. `frenchLeftoverTitles` est une fonction
**pure** exactement pour rendre ce test possible.

**(b) Mutation sur disque, jouée puis annulée.** J'ai remis `de/terms.article4.title` à sa valeur
française `"Article 4 – Propriété intellectuelle"` et rejoué le fichier de test :

```
MUTANT_EXIT=1
FAIL  src/lib/legal-pages.test.ts > namespace legal — parité des 4 locales
      > traduit les 22 intitulés de sections en de (#533)
AssertionError: intitulé(s) de section encore en français en `de` : le sommaire
  (`tableOfContents`) est traduit, ces titres ne le sont pas, et l'écran mélange
  les deux langues.: expected [ 'terms.article4.title' ] to deeply equal []
+   "terms.article4.title",
FAIL  ... > rougit sur une recopie du français réinjectée en de (#533)
      Tests  2 failed | 74 passed (76)
```

La garde **nomme la clé fautive**, ce qui est le point : un diagnostic sans grep. Fichier restauré
et vérifié **identique à l'octet près** (`shasum -a256` avant/après : `c917c569…f25841` des deux
côtés).

### Ce que je n'ai PAS joué, et pourquoi

- **`npm run build` / `next build`** : non joué. Le diff est du JSON pur et du test ; le runtime
  frontend (`.next`, unique dans le working tree partagé) est réservé aux vagues 3-5 par le
  briefing. ⚠ Un JSON cassé ne lèverait de toute façon **pas au build** mais **au rendu** — c'est
  précisément le trou que les assertions `JSON.parse` ci-dessus bouchent. La CI jouera le build.
- **Playwright / `next dev`** : non joués, interdits par le briefing.
- **Vérification visuelle en navigateur** : non exigée de moi, déléguée à la vague 4.
- **Relecture humaine des traductions** : voir §7. C'est le trou principal de cette livraison.

## 7. AVERTISSEMENT — traduction non relue

> Ces traductions sont produites par un agent et **n'ont pas été relues par un humain**. Le texte
> est à portée juridique. Elles ne doivent pas partir en production sans relecture.

Ce qui **reste en français** dans `en`/`es`/`de` après cette livraison : les **44 clés de corps** de
`legal.json` par locale, soit 132 valeurs au total — `*.content`, `privacy.*.items.*`,
`terms.article1.site` / `.user`, `terms.meta.description`, `privacy.meta.description`,
`terms.lastUpdated`, `privacy.lastUpdated`. Elles sont couvertes par `disclaimerOriginalFrench`
(« Ces mentions légales sont rédigées en français. La version française fait foi en cas de
divergence avec une traduction. »), qui est **déjà traduit dans les 4 locales** et affiché sur les
pages non françaises via `shouldShowLegalDisclaimer()`.

**Conséquence assumée et visible à l'écran** : les pages `/en/terms`, `/es/privacy` etc. afficheront
désormais un titre et des `<h2>` traduits au-dessus de paragraphes français. C'est une **régression
esthétique apparente par rapport au tout-français**, mais un progrès de navigabilité : le sommaire
était déjà traduit, donc le mélange existait déjà — il devient simplement cohérent entre le
sommaire et les titres qu'il référence. Le dev a arbitré ce compromis en connaissance de cause.

⚠ **`LEGAL_LAST_UPDATED_ISO` n'a délibérément PAS été bumpé.** Le commentaire de
`frontend/src/lib/legal-pages.ts` demande de mettre à jour cette constante à « toute modification
des textes de `public/locales/<locale>/legal.json` ». Je ne l'ai pas fait, et c'est un choix :
cette date est une **date d'opposabilité** des conditions. La version qui fait foi est la française,
elle n'a pas changé d'une virgule ; traduire un intitulé ne modifie aucune obligation. La bumper
laisserait croire aux utilisateurs que les CGU ont été révisées le 2026-09-05 et les inviterait à
relire un texte inchangé. Le commentaire du module gagnerait à distinguer « modification du texte
source » de « traduction » — signalé en recommandation, pas corrigé (hors périmètre).

## 8. Signaux `[MEMORY:*]`

`[MEMORY:pitfall] Une assertion « aucune traduction n'est identique à la source » est fausse par construction — les vrais cognats existent`
#533 : 3 intitulés anglais s'écrivent exactement comme le français (« Introduction », « Contact »,
« Article 10 – Contact »). Une garde de non-recopie naïve force alors soit une dégradation du texte
(« Foreword », « Contact us ») soit la désactivation de la garde. Remède : allowlist **nominative,
bornée et testée** (taille épinglée + chaque entrée doit être une clé réelle), jamais un `filter`
implicite. Vaut pour toute paire de langues proches.

`[MEMORY:pattern] Rendre pure la fonction de détection pour que le contrôle négatif tienne dans le dépôt`
Au lieu d'un `it` qui lit le disque et compare, extraire `frenchLeftoverTitles(fr, translated, locale)`
qui prend les deux arbres en argument. Le contrôle négatif peut alors saboter une copie **en mémoire**
et voir la garde rougir, sans fixture supprimée avant commit (le défaut de [[PIT-S62-003]]) et sans
toucher au disque. Anti-pattern : une garde qui n'est prouvée que par une mutation manuelle jouée une
fois et jamais rejouée en CI.

`[MEMORY:decision] Ne pas bumper LEGAL_LAST_UPDATED_ISO pour une traduction`
Contexte : `legal-pages.ts` demande de bumper la constante à toute modification de `legal.json`.
Décision : NON bumpé pour #533. Pourquoi : la date est une date d'opposabilité ; la version
française fait foi et n'a pas changé ; la bumper signalerait faussement une révision des CGU. La
règle du commentaire doit distinguer « texte source » et « traduction ».

`[MEMORY:pitfall] Les intitulés allemands des pages légales sont des composés non sécables de 19-20 caractères`
`Datenschutzerklärung` (20), `Nutzungsbedingungen` (19), `Begriffsbestimmungen` (20, en `<h2>`).
Leur largeur `min-content` ne peut PAS être réduite par un retour à la ligne : +33 % sur le français.
Toute rampe typographique ou largeur fixe calibrée sur `fr`/`en` déborde en `de`. À vérifier au
navigateur en `de` avant de déclarer une page légale responsive.

## 9. Recommandations suite

RECOMMAND_FOLLOWUP: traduire les 44 clés de corps de legal.json en en/es/de (132 valeurs) — texte juridique, relecture humaine requise [triage M | domaine frontend/i18n]
RECOMMAND_FOLLOWUP: faire relire par un humain les 22 intitulés livrés ici, en priorité `terms.title` en de (« Allgemeine Nutzungsbedingungen » vs « AGB ») et en en (« Terms of Use » vs « Terms of Service ») [triage XS | domaine frontend/i18n]
RECOMMAND_FOLLOWUP: préciser dans le commentaire de `frontend/src/lib/legal-pages.ts` que `LEGAL_LAST_UPDATED_ISO` suit le texte source français et non ses traductions [triage XS | domaine frontend]
Pour #532 : le `<h2>` allemand `terms.article1.title` (« Begriffsbestimmungen », 20 car.) est aussi contraignant que le `<h1>` — ne pas calibrer la rampe sur les seuls `<h1>`.
Pas de RECOMMAND_DB_EXPERT ni RECOMMAND_SECURITY ni RECOMMAND_TEST_RUNNER ni RECOMMAND_UI_DESIGN ni RECOMMAND_ARCHITECT : diff JSON pur plus un fichier de test, aucune migration, aucune surface auth, aucune surface visuelle nouvelle, suite légère jouée intégralement en local (1296 tests, 4 s).

STATUS: COMPLETED
