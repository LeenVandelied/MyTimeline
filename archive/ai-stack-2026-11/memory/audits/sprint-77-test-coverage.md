# Audit tests — Sprint 77

> Généré en fin de Phase 6, le 2026-09-05. Base : `origin/dev` @ `82d66b9`, branche `sprint/77`.
> **Tous les chiffres ci-dessous ont été obtenus par le lead en rejouant les suites lui-même**, code
> de sortie lu à chaque fois (`PIT-S45-003` : RTK ment sur les résumés de test). Les runs repris d'un
> agent sans re-vérification sont explicitement étiquetés comme tels.

## Couverture par issue

Ce sprint **ne touche aucune règle métier** : les 5 issues portent « BR impactées : Aucune » dans
leur énoncé, et le diff ne contient ni migration, ni entité, ni endpoint. Le tableau canonique par
`BR-XX` serait donc vide et trompeur ; il est remplacé par une couverture par issue.

| Issue | Nature | Flux inter-systèmes | Test unitaire | Garde statique | E2E | Contrôle négatif armé |
|---|---|:---:|:---:|:---:|:---:|:---:|
| #457 | garde-fou focus TSX | NON | ✅ 19 cas | ✅ lexeur sur 122 `.tsx` | ⚠ sans objet | ✅ **rejoué par le lead** |
| #533 | traduction 22 titres légaux | NON | ✅ 76 cas (parité + non-identité) | ✅ allowlist de cognats bornée | ✅ via #532 | ✅ **rejoué par le lead** |
| #191 | thème Storybook + `DateStamp` | NON | ✅ suite vitest | ✅ bascule sur 160 contrôles | ⚠ absent — voir Écarts | ✅ vérifié par le lead |
| #532 | rampe typo pages légales | NON | ⚠ sans objet (CSS) | — | ✅ 12/12 **rejoué par le lead** | ✅ intégré à la spec |
| #294 | captures de référence | NON | ⚠ sans objet | ✅ config de tolérance calibrée | ✅ 11/11 **rejoué par le lead** | ✅ committé dans la spec |

Aucune issue ne décrit un flux traversant 2 systèmes ou 2 rôles : **aucun E2E métier n'est donc
exigible** au titre de la règle « cross-system flow ⇒ E2E métier obligatoire ».

## Résultats des runs — tous joués par le lead, codes de sortie lus

| Suite | Résultat | Code de sortie |
|---|---|:---:|
| Backend (`./mvnw test`) | **566 tests**, 75 classes, 0 failure, 0 error, 0 skipped | **0** |
| Frontend Vitest | **1296 tests**, 112 fichiers, 0 échec | **0** |
| `tsc --noEmit` | 0 erreur | **0** |
| `next lint` | 0 erreur | **0** |
| `next build` | compilé, 52 pages générées | **0** |
| E2E `sprint-77-theme-visual` | **11 passed** (8,6 s), armement inclus | **0** |
| E2E `sprint-76-legal-visual` | **12 passed** (11,5 s), auto-contrôles du harnais inclus | **0** |

Repris d'un agent, **non rejoué par le lead** : `sprint-75-legal-pages` 28/28 exit 0 (rapporté dans
`issue-532-done.md`).

### Un faux vert que le lead a produit, et corrigé

Le premier run de `sprint-77-theme-visual` conduit par le lead est sorti **exit 0** — mais la sortie
disait **« 1 passed, 11 did not run »**. Cause : `--no-deps` omis, donc Playwright a joué le projet
`setup`, qui tente de provisionner des comptes contre un backend inexistant ; les 11 tests visuels
ont été sautés sans que le code de sortie le dise. **Un code de sortie ne suffit pas : il faut lire
le compte de tests réellement exécutés.** Le run a été refait avec `--no-deps` → 11/11.

## Tests créés par le sprint

- `frontend/src/styles/__tests__/tsx-focus-utility.test.ts` (541 l., 19 cas) — #457
- `frontend/src/lib/legal-pages.test.ts` étendu de 60 → **76 cas** — #533
- `frontend/e2e/sprint-77-theme-visual.spec.ts` (519 l., 11 tests) + 10 références PNG — #294
- `frontend/e2e/sprint-76-legal-visual.spec.ts` — test de caractérisation **retourné** en garde
  anti-régression, 4 tests au lieu de 2 — #532
- `frontend/playwright.config.ts` — première configuration de diff visuel du dépôt. ⚠ Posée d'abord
  en clé `expect` globale, **redescendue au point d'appel au cycle 2** (cf. section Cycle 2) : la
  config ne porte plus de clé `expect`, la tolérance vit dans la spec qui la demande.
- `frontend/app/fonts.ts` + `frontend/src/styles/__tests__/storybook-font-shell.test.ts` (9 cas) —
  cycle 2, extraction de la dérivation `--font-ui` partagée entre l'app et Storybook.

## Contrôles négatifs — chacun rejoué indépendamment par le lead

| Garde | Mutation jouée | Résultat |
|---|---|---|
| #457 `tsx-focus-utility` | `ring-2` injecté dans `ui/switch.tsx` (disque, restauré) | **exit 1**, 1 failed / 18 passed |
| #533 `legal-pages` | `de/privacy.cookies.title` remis en français | **exit 1**, 3 failed / 73 passed ; `shasum` identique après restauration |
| #191 `DateStamp` | « Mittwoch » injecté dans une cellule | **+33 px détectés** |
| #532 rampe légale | composé allemand démesuré, césure coupée | page **+574 px**, `h1` **+590 px** détectés |
| #294 diff visuel | `letter-spacing` sur le hero | **11 878 px différents (ratio 0,01)** → rouge |

## Écarts assumés — écrits, non tus

1. **#191 n'a aucun E2E.** Le correctif `DateStamp` est prouvé par mesure navigateur (lead + agent,
   7 paliers × 2 thèmes plus un balayage continu 700→2600 px), mais **aucun test du dépôt ne garde
   ce comportement**. L'agent l'a signalé lui-même en `RECOMMAND_FOLLOWUP`. Les seuils 34/52 px sont
   calibrés sur Archivo 500 aux tailles actuelles : un changement de fonte, de graisse ou de `px-*`
   les invalide, et **rien ne l'empêche mécaniquement**.
2. **[RÉSOLU — voir « Verdict CI » en fin de document] Le critère « vert en CI » de #294 n'était pas
   vérifiable au moment de la rédaction.** Aucune CI ne tourne sur
   les branches `sprint/N` (`PIT-S64-008`) : il sera tranché à l'ouverture de la PR. Les références
   sont générées en `jammy` (22.04) alors que `ubuntu-latest` est `noble` (24.04) ; Playwright nomme
   les deux `linux`, donc elles **seront comparées** et un écart de rastérisation produirait un vrai
   diff. Aucune tolérance raisonnable ne l'absorberait — le remède serait de régénérer sur l'image
   du runner, pas d'élargir le ratio.
3. **Suite E2E complète non jouée.** Seules les 3 specs concernées par le diff l'ont été
   (`PIT-S62-011` : deux runs complets rapprochés ne peuvent pas passer, bucket de rate-limit).
   Les ~40 autres specs n'ont pas tourné sur cet état de la branche.
4. **Aucun backend vivant pendant les E2E.** Les 5 écrans de #294 et les 2 pages légales sont
   publics ; l'oracle `/api/auth/me` rendait **500** (rewrite présent, aucun backend à l'écoute) et
   non 401. Sans objet pour ces specs, mais aucun parcours authentifié n'a été exercé.
5. **`::placeholder` du `Textarea` non conforme** — 2,82:1 en clair, 2,99:1 en sombre (mesuré par
   l'agent, **confirmé par le lead**). Les jetons sont intervertis entre thèmes. Hors périmètre des
   5 issues, parti en follow-up. Aucune référence PNG ne le fige (les 10 captures ne contiennent que
   des `Input`).
6. **25 écarts d'alignement pixel** relevés sur 32 contrôles vs `core.css` (#191, critère 3 de
   l'issue) — **documentés, volontairement non corrigés** : le dépôt acte `.mt-*` comme spécimen
   parallèle de `ui/*`, et les corriger toucherait tous les formulaires juste avant que #294 ne grave
   ses références.
7. **Angles morts non couverts après le sprint** : états hover/focus jamais déclenchés en mesure ;
   alignement pixel des 21 autres composants ; contraste des surfaces sombres entre elles.

## Couverture E2E des nouveaux `data-testid`

**Sans objet** : le diff n'introduit aucun nouveau `data-testid` (vérifié sur
`git diff origin/dev...HEAD -- '*.tsx'`). Le check heuristique de la Phase 8 n'avait donc rien à
comparer — ce n'est pas un « OK », c'est une absence de matière.

## Cycle 2 — corrections de review (`823a1f2`), rejouées par le lead

Deux constats **majeurs** (aucun critique) ont été corrigés puis re-vérifiés. Chiffres après
correctifs, codes de sortie lus :

| Gate | Avant cycle 2 | **Après cycle 2** | Code de sortie |
|---|---|---|:---:|
| Frontend Vitest | 1296 tests / 112 fichiers | **1313 tests / 113 fichiers** (+17) | **0** |
| `tsc --noEmit` | 0 | 0 | **0** |
| `next lint` | 0 | 0 | **0** |
| `next build` | compilé | compilé | **0** |
| `storybook build` | non joué | **compilé** (nouveau gate, config Storybook touchée) | **0** |
| E2E `sprint-77-theme-visual` | 11 passed | **11 passed** | **0** |

Backend non rejoué au cycle 2 : le correctif ne touche aucun fichier `backend/` (566/566 restent
valides sur un diff frontend pur).

**Ce que les correctifs ont changé :**
- La tolérance de diff visuel descend de la config globale au **point d'appel** (constante dans la
  spec). Le projet Playwright dédié a été écarté à raison : le gabarit de nom porte `{projectName}`,
  il aurait renommé donc invalidé les 10 PNG.
- La dérivation `--font-ui` est **extraite** dans `frontend/app/fonts.ts`, importée par
  `layout.tsx` et `.storybook/preview.ts` — la dérive devient impossible plutôt que surveillée, et
  une garde de 9 tests détecte un retour en arrière.
- Le commentaire faux de `tsx-focus-utility.test.ts` est corrigé **par la mesure** : `` `ring-${n}` ``
  fait bien rougir la garde, contrairement à ce qu'il affirmait. 8 cas figent désormais le
  comportement dans les deux sens.

L'armement du diff visuel reste prouvé : le test d'armement fait partie des 11, son passage atteste
que la mutation typographique est toujours détectée.

## Conclusion

Les 7 gates du sprint sont verts avec codes de sortie lus, et les 5 contrôles négatifs ont été
rejoués indépendamment par le lead plutôt que repris des rapports d'agents. Les écarts ci-dessus
sont assumés et nommés ; aucun n'est bloquant pour l'ouverture de la PR.

**Prêt pour PR.** Les corrections de review sont livrées et re-vérifiées par le lead (cycle 2
ci-dessus). Aucun constat critique n'a été émis ; les 3 mineurs laissés en l'état sont nommés dans
`review-fixes-done.md` avec leur raison.


---

## Verdict CI — le risque annoncé s'est réalisé, puis a été soldé

**Run 1 (`0568da7`) — ÉCHEC du job `e2e`, 7 failed / 302 passed.**
Exactement le risque écrit dans l'écart n°2. Les 4 cartes auth ont rougi : `login-light` 717 px,
`register-light` 1259 px, plus `forgot-password` et `reset-password` — **ratio 0,01 contre une
tolérance de 0,002**. Cause : références générées en `jammy` 22.04, runner mesuré en **Ubuntu
24.04.4** (`noble`), même suffixe `linux` donc comparaison réelle. Les 6 autres jobs verts, et les
302 autres tests passants : le reste du sprint était validé.

**La tolérance n'a PAS été élargie.** L'écart environnemental (0,01) vaut le même ordre de grandeur
que la plus petite régression que la spec doit détecter (`letter-spacing 0.010em` = 0,0117) :
l'élargir aurait rendu la spec structurellement incapable d'échouer. Remède appliqué, celui que la
PR annonçait : régénérer sur l'image du runner.

**Piège rencontré pendant la régénération, et documenté dans la spec.**
`--update-snapshots` **écrase** les références existantes : la première passe a gravé la mutation
d'interlettrage du test d'armement dans `landing-hero-light.png`, rendue fausse pour toute la suite
(13 058 px d'écart au run de vérification, ratio 0,02). La garde `existsSync` protège d'une
**création** accidentelle, pas d'un **écrasement**. Détecté en rejouant la suite **sans**
`--update-snapshots` plutôt qu'en se fiant au fait que 8 PNG avaient été écrits. Régénération
correcte : `--update-snapshots --grep-invert "armement"`. La marche à suivre est désormais en tête
du bloc d'armement de la spec.

**Run 2 (`e513450`) — SUCCÈS, 7 jobs sur 7**, `e2e` compris.

| Job | Run 1 (`0568da7`) | Run 2 (`e513450`) |
|---|---|---|
| `backend` | ✅ | ✅ |
| `frontend` | ✅ | ✅ |
| **`e2e`** | ❌ 7 failed / 302 passed | **✅** |
| `security` | ✅ | ✅ |
| `flyway-smoke` | ✅ | ✅ |
| `secret-scan` | ✅ | ✅ |
| `ai-env-packs` | ✅ | ✅ |

Les références sont désormais alignées sur `ubuntu-latest` = noble 24.04. **Fragilité durable, non
résolue** : un futur bump d'`ubuntu-latest` (26.04) rougira de la même façon et imposera une
nouvelle régénération. C'est le coût assumé de références PNG commitées.
