# Issue #452 — Borne temporelle d'expansion de récurrence (backend)

## Ce qui a été fait

Ajout d'un **horizon temporel** à l'expansion de récurrence, en **complément** de
`MAX_OCCURRENCES = 4000` (jamais en remplacement), + migration de données V16.
**Backend uniquement** — aucun fichier `frontend/**` touché, `EventCreationRequest` intact,
**BR-EVE-012 inchangée** (`recurrenceEndDate` reste hors du DTO de création).

### Fichiers

| Fichier | Nature |
|---|---|
| `backend/src/main/java/com/matimeline/eventmanager/domain/models/RecurrenceExpansion.java` | + constante `MAX_UNBOUNDED_EXPANSION_YEARS = 5` (domaine PUR, aucun import framework) |
| `backend/src/main/java/com/matimeline/eventmanager/application/services/RecurrenceExpansionServiceImpl.java` | horizon appliqué aux séries sans date de fin |
| `backend/src/main/java/com/matimeline/eventmanager/domain/ports/services/RecurrenceExpansionService.java` | javadoc du contrat mise à jour |
| `backend/src/test/java/com/matimeline/eventmanager/application/services/RecurrenceExpansionServiceImplTest.java` | 3 tests #452 ; 2 anciens tests « unbounded → 4000 » réécrits (ils encodaient le bug) |
| `backend/src/main/resources/db/migration/V16__delete_unbounded_recurring_events.sql` | migration de DONNÉES (aucun changement de structure) |

## Borne choisie : 5 ans — justification chiffrée

`MAX_OCCURRENCES` est exprimé en **compte**, donc sa portée temporelle explose avec la taille
de l'unité. Effet de l'horizon sur une série **sans date de fin** (mesuré par les tests) :

| Unité | Avant (#54) | Après (#452) |
|---|---|---|
| WEEK | 4000 occ / ~77 ans | **261 occ / 5 ans** |
| MONTH | 4000 occ / ~333 ans | **61 occ / 5 ans** |
| YEAR | 4000 occ / 4000 ans | **6 occ / 5 ans** |

Pourquoi 5 : une récurrence sans date de fin est *indéfinie*, rien ne permet d'en déduire une
portée — il faut donc en choisir une. 5 ans couvre les horizons de planification réalistes d'une
frise produit, et garde la série la plus dense (hebdomadaire) à 261 occurrences ≈ **6,5 %** du
garde-fou mémoire de 4000. Constante nommée + javadoc, pas de littéral nu.

## Décision de conception : l'horizon borne les séries SANS date de fin, pas les bornes explicites

Le briefing disait « et plus généralement pour empêcher toute expansion déraisonnablement
longue ». **Je n'ai pas appliqué l'horizon aux `recurrenceEndDate` explicites**, pour une raison
technique, pas de préférence : à 5 ans, la série la plus dense fait 261 occurrences, donc si
l'horizon s'appliquait aussi aux bornes explicites, **`MAX_OCCURRENCES = 4000` deviendrait
inatteignable en toute circonstance** — c'est-à-dire supprimé de fait. Or la contrainte du
briefing est « en complément, **pas en remplacement** », et « le plafond de 4000 n'est PAS remis
en cause ».

Répartition retenue, où les deux bornes restent vivantes et testées :
- **sans** `recurrenceEndDate` → horizon 5 ans (le cas du bug) ;
- **avec** `recurrenceEndDate` → borne honorée telle quelle, `MAX_OCCURRENCES` reste le garde-fou
  mémoire/CPU (couvert par les 2 tests `boundedExactlyAtCap` / `boundedBeyondCap`, inchangés).

Effet de bord assumé : un utilisateur peut encore poser en PATCH une `recurrenceEndDate` très
lointaine (hebdomadaire → 4000 occ / ~77 ans). C'est une **intention explicite**, pas le défaut
silencieux décrit par l'issue. **Si le dev veut aussi rogner les bornes explicites**, c'est un
changement d'une ligne (`effectiveEnd = min(recurrenceEndDate, horizon)`) mais il faut alors
acter que `MAX_OCCURRENCES` devient du code mort — à trancher, je ne l'ai pas fait d'office.

## Décision `capped`

**`capped = true` quand la troncature vient de l'horizon temporel.** Raison : `capped` signifie
« la série est tronquée, il existerait d'autres occurrences au-delà » — sémantique identique que
la troncature vienne du compte ou de la durée. Une série indéfinie étant infinie par définition,
elle est **toujours** tronquée.

Conséquence importante : **aucun changement de contrat** pour les consommateurs #67/#439 — avant
#452 une série sans date de fin rendait déjà `capped=true`. Seul le **volume** rendu change.
Couvert par assertion dans `unbounded_stopsAtTemporalHorizon_whateverTheUnit`.

## Tests réellement lancés

- `./mvnw clean test` (suite backend complète, depuis le worktree) :
  **`Tests run: 465, Failures: 0, Errors: 0, Skipped: 0` — `BUILD SUCCESS`, `MAVEN_EXIT=0`.**
- **Contrôle négatif joué** (PIT-S62-003) : horizon neutralisé (5 → 400 ans) ⇒ **4 échecs**
  sur les nouveaux tests. Fichier restauré, vérifié (`= 5`, aucun `.bak` résiduel).
  - Limite honnête : l'assertion de portée est exprimée **relativement à la constante**, elle ne
    peut donc pas détecter qu'on a relevé la constante. C'est
    `unbounded_sameHorizonAcrossUnits_butDifferentOccurrenceCounts` qui joue ce rôle : il fige les
    comptes **exacts** 261/61/6, et rougit à tout changement de valeur.
- Migration V16 : **appliquée réellement** par les tests d'intégration Testcontainers
  (`Successfully applied 16 migrations … now at version v16`).

## MIGRATION À CONFIRMER

**Fichier** : `backend/src/main/resources/db/migration/V16__delete_unbounded_recurring_events.sql`

**DELETE exact, verbatim :**

```sql
delete from events
where is_recurring is true
  and recurrence_end_date is null;
```

Précédé d'un bloc `do $$ … $$` qui ne fait que **compter** et émettre un `raise notice` (nombre
de lignes qui vont être supprimées). Aucun `TRUNCATE`, aucun `DROP`, aucun `ALTER`, aucun `DELETE`
sans `WHERE`.

**Ciblage prouvé sur un Postgres 16 JETABLE** (conteneur créé puis détruit ; la base de dev
`eventmanager` et le port 5432 n'ont **pas** été touchés), 5 lignes couvrant la matrice :

| Ligne semée | `is_recurring` | `recurrence_end_date` | `archived` | Résultat |
|---|---|---|---|---|
| A | `true` | `null` | false | **SUPPRIMÉE** |
| B | `true` | `null` | **true** | **SUPPRIMÉE** |
| C | `true` | `2027-01-01` | false | survit |
| D | `false` | `null` | false | survit |
| E | `null` | `null` | false | survit |

`DELETE 2` puis, en rejeu, `DELETE 0` (**idempotente**).

**Points à valider par le dev :**
1. Les lignes **archivées** répondant au prédicat sont supprimées elles aussi (ligne B). Réactivées,
   elles reproduiraient exactement la série non bornée. Documenté dans l'en-tête du `.sql`.
2. `is_recurring IS NULL` n'est **pas** ciblé (`is true` strict) — cohérent avec V11 qui traite
   déjà `is_recurring is not true`.
3. **Irréversible** : aucune sauvegarde des lignes, aucun rollback possible. Écrit tel quel dans
   l'en-tête du fichier.

**Aucun changement de structure n'est nécessaire** : `ddl-auto=validate` reste satisfait, le
mapping `EventEntity` est inchangé. Aucune table enfant ne référence `events` (vérifié : aucune
colonne `event_id` dans V1..V15), le DELETE est mono-table et ne laisse aucun orphelin.

## Réserve importante — le service reste du CODE ORPHELIN

`RecurrenceExpansionService` **n'a toujours aucun appelant** dans `backend/src/main` (vérifié par
grep des appels, pas des déclarations) : seul son test unitaire le référence. **[[PIT-S61-006]]
tient toujours.** Vérifié aussi côté frontend : `timeline/lib.ts` rend une barre unique par
événement et `previewTimeline.ts` une seule occurrence fantôme (bornée à `MAX_OCCURRENCE_STEPS`).

**Conséquence à assumer : personne ne développe 4000 occurrences aujourd'hui.** Le symptôme décrit
par l'issue (« la frise s'étale sur des siècles ») n'est donc **pas** produit par ce chemin de code
en l'état. Ce correctif est un **durcissement préventif** : il assainit la borne avant que #439/#67
ne câblent le service. Je ne peux pas affirmer qu'il fait disparaître un symptôme observable
aujourd'hui, et je ne l'affirme pas.

## Non fait / non vérifié

- Le flag `capped` n'est **exposé dans aucune réponse d'API** (c'est le périmètre de #439/#67, hors
  scope ici). Je ne l'ai pas ajouté.
- Aucun test d'intégration bout-en-bout de l'horizon : impossible sans appelant (voir réserve).
- Aucun E2E, aucun test frontend lancé — issue backend pure.
- La valeur 5 ans n'a été validée par **aucun utilisateur** : c'est un choix défendable, pas une
  mesure d'usage.

## Signaux

- `[MEMORY:decision]` Contexte : #452 exige une borne temporelle « en complément » de
  `MAX_OCCURRENCES`. Décision : l'horizon (5 ans) ne borne que les séries **sans** date de fin ;
  une `recurrenceEndDate` explicite reste honorée sous le seul plafond de 4000. Pourquoi : appliquer
  l'horizon partout rendrait `MAX_OCCURRENCES` **inatteignable**, donc mort — ce que la contrainte
  « pas en remplacement » interdit.
- `[MEMORY:pitfall]` Contexte : contrôle négatif Maven — neutraliser une constante, lancer les
  tests, restaurer le fichier par `mv` d'une copie `cp`. Solution : le `cp` **ne préserve pas la
  mtime**, la source restaurée devient donc **plus ancienne** que le `.class` compilé pendant le
  contrôle → Maven saute la recompilation et le run SUIVANT rougit sur du bytecode périmé (mesuré :
  4 faux échecs, `javap -constants` montrait `= 400` alors que la source disait `= 5`). Aggravé par
  le fait qu'une `static final int` est **inlinée** dans les classes appelantes. Prévention : après
  tout contrôle négatif qui restaure un fichier, `touch` la source ou lancer `clean`, et confirmer
  par `javap -constants` plutôt que par la lecture de la source. Famille [[PIT-S60-005]]
  (environnement laissé dégradé, invisible à `git status`).
- `[MEMORY:business-rule]` BR-EVE-012 (complément) : une récurrence sans `recurrenceEndDate` est
  développée sur **5 ans** max (`MAX_UNBOUNDED_EXPANSION_YEARS`), `capped=true`. Une
  `recurrenceEndDate` explicite est honorée intégralement, sous le seul plafond
  `MAX_OCCURRENCES=4000`. Le DTO de création reste **sans** `recurrenceEndDate` (inchangé).

## Recommandations suite

- **RECOMMAND_DB_EXPERT** — migration V16 destructive (`DELETE` de lignes, irréversible).
  À relire : le prédicat, le traitement des lignes archivées, l'absence de table enfant.
- **Pas de RECOMMAND_TEST_RUNNER** — suite backend complète lancée et lue ici (465/465, exit 0).
- **Pas de RECOMMAND_FOLLOWUP nouveau** — le seul hors-scope trouvé (service orphelin) est **déjà
  suivi** par #439/#67, je n'ouvre pas de doublon.

STATUS: COMPLETED
