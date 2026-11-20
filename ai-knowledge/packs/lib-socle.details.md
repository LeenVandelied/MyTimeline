# Annexe : lib-socle

## Index des fichiers {#files-index}

| Fichier | Faits | Sortes |
|---|---|---|
| `frontend:lib/color.ts` | 10 | convention 9, suspicious 1 |
| `frontend:lib/date-iso.ts` | 8 | convention 8 |
| `frontend:lib/density.test.ts` | 5 | test_case 5 |
| `frontend:lib/event-palette.ts` | 5 | convention 5 |
| `frontend:lib/query-keys.ts` | 5 | convention 5 |
| `frontend:lib/touchTarget.ts` | 3 | convention 2, suspicious 1 |
| `frontend:lib/ephemeris.test.ts` | 2 | test_case 2 |
| `frontend:lib/touchTarget.test.ts` | 2 | test_case 2 |
| `frontend:lib/state-errors.test.ts` | 1 | test_case 1 |
| `frontend:lib/utils.ts` | 1 | convention 1 |

## Lignes rétrogradées {#t-demoted_lines}

| Section | Ligne | Motif |
|---|---|---|
| rules | - Selon la javadoc, aucune autre liste de couleurs de palette ne doit exister dans src, la palette de 12 entrées étant le miroir des tokens CSS. [#3eadc1c5b7d5068e-1] [#3eadc1c5b7d5068e-2] | deducible |
| rules | - Un accesseur de rôle de palette lève une Error si le rôle est inconnu, et la recherche par hex compare en majuscules. [#1c1c91953c0de98b-1] [#76bdef6e2c15cc0a-1] | deducible |
| rules | - Les cibles tactiles mobiles sont des classes max-md posées par le consommateur, pas dans la primitive Button. [#41f7c040c9ac6456-1] | deducible |
| rules | - Les classes se composent avec cn (clsx puis twMerge). [#fd3fcc3a2c57fd6d-1] | deducible |

## Faits suspects {#t-suspicious}

| Pointeur | Énoncé | Fait |
|---|---|---|
| `frontend:lib/color.ts:295-296` | Un commentaire signale que les encres du glyphe ne sont pas INK_LIGHT et INK_DARK, et interdit de citer un ratio calculé avec d'autres constantes. | [#8e728c68971fbc0a-1] |
| `frontend:lib/touchTarget.ts:36-38` | Un commentaire signale qu'un ancêtre en overflow hidden ou auto, à moins de 6 px de la boîte, rognerait le pseudo-élément. | [#af507d03675aeccb-1] |

## Conventions {#t-convention}

| Pointeur | Énoncé | Fait |
|---|---|---|
| `frontend:lib/color.ts:61-62` | La fonction de contraste valide le hex avec HEX_RE et renvoie la variable CSS var(--color-ink) si la valeur est absente ou invalide. | [#21cc456704d9af76-1] |
| `frontend:lib/color.ts:65` | L'encre de texte se choisit en comparant le ratio WCAG contre INK_DARK et INK_LIGHT, l'égalité retenant la couleur sombre. | [#21cc456704d9af76-2] |
| `frontend:lib/color.ts:148` | Une marge de quantification de 0.05 s'ajoute à la cible WCAG 1.4.11 de 3:1 pour les traits peints en couleur utilisateur. | [#1266f33ac81e3c53-1] |
| `frontend:lib/color.ts:161` | Commentaire : Les surfaces de thème sont des constantes miroir des tokens CSS, et un test relit colors.css pour verrouiller l'égalité. | [#d8f1105597b0de72-1] |
| `frontend:lib/color.ts:222` | Une fonction de plancher de contraste renvoie la couleur d'origine si un hex est invalide, sans la normaliser. | [#2db98241f4b8dec7-1] |
| `frontend:lib/color.ts:227` | Le cas déjà conforme rend la chaîne d'origine et non sa forme normalisée par mixHex, pour que la comparaison de chaînes reste stable. | [#2db98241f4b8dec7-2] |
| `frontend:lib/color.ts:229-232` | Le plancher de contraste se calcule par balayage linéaire de 256 pas, et le ratio est vérifié sur le hex arrondi renvoyé. | [#2db98241f4b8dec7-3] |
| `frontend:lib/color.ts:324-329` | L'encre d'un glyphe se choisit par maximisation du ratio WCAG entre deux constantes hex, et une version renvoie un token CSS var(--gray-900) ou var(--gray-0). | [#048322ddd6de0a7b-1] |
| `frontend:lib/color.ts:336` | La variante swatchGlyphInkVar exprime le choix de glyphe en token DS de palette brut, le hex ne sortant pas dans le DOM. | [#745079ce569aa502-1] |
| `frontend:lib/date-iso.ts:4` | Javadoc : Une date affichée se rend en balise time dont l'attribut datetime est dérivé de la même date que le libellé, selon la convention du design system. | [#2a34364f86c74c56-1] |
| `frontend:lib/date-iso.ts:31-36` | Une date sans heure se sérialise en YYYY-MM-DD à partir des composantes locales de la Date, et renvoie null si la date est invalide. | [#2a34364f86c74c56-2] |
| `frontend:lib/date-iso.ts:62` | Javadoc : Un appelant ne doit pas écrire new Date sur une date civille backend, il passe par les helpers du module. | [#895ff383e6631fc3-1] |
| `frontend:lib/date-iso.ts:73` | Une chaîne LocalDate au format YYYY-MM-DD strict se lit via parseLocalIsoDate, qui renvoie null si la valeur est absente ou mal formée. | [#d0987d79ff55258e-1] |
| `frontend:lib/date-iso.ts:94` | parseLocalDate rend toujours une Date, éventuellement invalide, et laisse passer tel quel un horodatage complet à new Date. | [#895ff383e6631fc3-2] |
| `frontend:lib/date-iso.ts:98-100` | Un instant complet s'exprime en ISO UTC via toISOString, et renvoie null si la Date est invalide. | [#f70072c348f08622-1] |
| `frontend:lib/date-iso.ts:128-135` | Un horodatage backend naïf reçoit le suffixe Z sauf s'il porte déjà un offset, puis se lit via new Date. | [#aaf0e11be7d28585-1] |
| `frontend:lib/date-iso.ts:149-162` | Le rendu d'un horodatage backend produit un libellé Intl.DateTimeFormat et une valeur machine ISO issus d'un seul parsing. | [#20c5f70dd72da5a5-1] |
| `frontend:lib/event-palette.ts:1-26` | Javadoc : Aucune autre liste de couleurs de palette ne doit exister dans src, la source unique est le miroir verrouillé par test sur les tokens CSS. | [#3eadc1c5b7d5068e-1] |
| `frontend:lib/event-palette.ts:47` | Javadoc : Le hex d'une entrée de palette est en majuscules, forme canonique émise par les sélecteurs. | [#ced66db46051a5ed-1] |
| `frontend:lib/event-palette.ts:52` | La palette est un tableau readonly constant de 12 entrées ordonnées comme les déclarations de tokens CSS, et les pastilles se peignent via var(--evt-*). | [#3eadc1c5b7d5068e-2] |
| `frontend:lib/event-palette.ts:73-77` | Un accesseur de rôle de palette lève une Error si le rôle est inconnu, plutôt que de rendre undefined. | [#1c1c91953c0de98b-1] |
| `frontend:lib/event-palette.ts:87-91` | La recherche d'entrée de palette compare en majuscules, renvoie undefined pour une valeur absente ou hors palette, et ne réécrit rien. | [#76bdef6e2c15cc0a-1] |
| `frontend:lib/query-keys.ts:16-17` | Javadoc : Les clés sont déclarées as const pour obtenir des tuples typés plutôt que string[], afin de sécuriser le matching de invalidateQueries. | [#ff67c49c246ab37a-1] |
| `frontend:lib/query-keys.ts:19-22` | Les query keys TanStack Query sont centralisées dans un objet queryKeys par domaine, avec une clé all, et des factories detail en tuples. | [#ce8c3a1a7449d1bc-1] |
| `frontend:lib/query-keys.ts:28` | Une clé scopée par utilisateur place l'objet de paramètres en dernière position du tuple, sous le préfixe du domaine. | [#8188c0e1b7257ac6-1] |
| `frontend:lib/query-keys.ts:34` | Commentaire : Une clé archivée se place sous le préfixe products pour que l'invalidation du domaine la rafraîchisse. | [#26a56a610d7c1fc3-1] |
| `frontend:lib/query-keys.ts:49` | Une clé de preview porte les paramètres débouncés dans l'objet params en dernier élément du tuple. | [#aa57a64210636b95-1] |
| `frontend:lib/touchTarget.ts:24` | Les cibles tactiles mobiles sont des constantes de classes Tailwind préfixées max-md, posées en className par le consommateur et non dans la primitive Button. | [#41f7c040c9ac6456-1] |
| `frontend:lib/touchTarget.ts:40-41` | Les rangées denses étendent la zone tactile par une pseudo-élément before de 44 px centré, avec relative posé sans préfixe comme ancre. | [#d79dd29c383eb6eb-1] |
| `frontend:lib/utils.ts:4-6` | L'helper cn compose les classes avec clsx puis les fusionne via twMerge. | [#fd3fcc3a2c57fd6d-1] |
