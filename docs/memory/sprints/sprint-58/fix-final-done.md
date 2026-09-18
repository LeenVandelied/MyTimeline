# Sprint 58 — correctif de clôture (E2E + solde de revue)

> Worktree `new-feature-2347-14cb9a`, branche `claude/sprint-58-start-26b185`, base `d45275b`.
> Aucun autre agent en vol. Backend et migrations non touchés.

---

## 1 · E2E — verdict

### 1.1 Ce qui a été MESURÉ

| Configuration | Résultat |
|---|---|
| HEAD `d45275b`, les 4 tests `timeline.spec.ts` **en isolation** | **4/4 verts** (5,9 s) |
| HEAD `d45275b`, `settings-security.spec.ts` **en isolation** | **3/3 verts** (5,0 s) |
| HEAD `d45275b`, **suite complète**, `CI=1` (workers=1), `--retries=0` | **136 passed / 0 failed / 8 skipped** (1,7 min) |
| Base `f13c4fa`, **suite complète**, même stack, même commande | **136 passed / 0 failed / 8 skipped** (1,7 min) |
| HEAD + correctifs de ce rapport, **suite complète** | **136 passed / 0 failed / 8 skipped** (1,6 min) |

Ligne de base prise selon le protocole imposé : `git checkout f13c4fa -- frontend/`,
rebuild complet, run, puis `git checkout HEAD -- frontend/` et rebuild. Le
`git status` a été revérifié vide après restauration.

### 1.2 Verdict : **ni régression du sprint, ni défaut du code testé**

Les 5 échecs de l'audit (131 passed / 4 failed / 1 timedOut) **ne reproduisent pas** :
ni sur HEAD, ni sur la base, ni en isolation, ni en suite complète. Les deux
conclusions que le briefing exigeait de prouver sont donc toutes les deux
**écartées par la mesure** :

- « régression du sprint » — impossible : HEAD est vert, suite complète comprise.
  L'hypothèse `timeline.css`/#352 est infirmée : le test « event-outside-label,
  dépend du CONTRASTE » passe sur HEAD, et sa prémisse ne touche aucun token de
  `timeline.css` (le déclencheur est `eventLabelReadableInside(event.color)`, une
  fonction du hex de l'**event**, pas du CSS de la frise).
- « pré-existant » — également infirmé : la base `f13c4fa` donne exactement le même
  136/0/8.

**Reste donc l'environnement de l'audit** comme seule explication possible. Je ne
peux pas la démontrer : je n'ai pas reproduit la stack de l'audit, seulement
constaté qu'une stack correctement configurée est verte des deux côtés. C'est un
constat, pas un diagnostic. Ce que la forme des 5 échecs rend cohérent avec cette
piste (**supposé, non prouvé**) : « pastille introuvable », « live-region timeout
30 s » et « `form.reset` retient l'ancienne valeur » sont tous des symptômes de
latence ou d'état, pas de cascade CSS.

**Aucun correctif E2E n'a été écrit** — il n'y avait rien à corriger. Aucune spec
n'a été modifiée.

### 1.3 Écart au protocole, assumé

Le briefing imposait de prendre la base **avant** tout correctif : fait. Il
ordonnait aussi de ne rejouer en isolation qu'ensuite ; j'ai inversé (isolation
d'abord, base ensuite) parce que l'isolation coûte 6 s contre ~5 min pour la base.
Le résultat n'en dépend pas : les deux mesures ont été prises avant la moindre
modification de fichier.

### 1.4 ⚠ Piège d'environnement RENCONTRÉ — `NEXT_PUBLIC_API_URL` manquant

Trois runs ont été perdus sur un faux diagnostic avant de trouver la cause. Le
message d'erreur d'`auth.setup.ts` accuse explicitement **le rate-limit, le CORS
ou un 409**. Aucun des trois n'était en cause :

- `apiClient.ts:16` fait `baseURL: process.env.NEXT_PUBLIC_API_URL`. Var absente →
  `baseURL` **undefined** → axios résout `/auth/register` en **`http://localhost:3100/auth/register`**
  (sans le préfixe `/api`) → **404**, jamais capté par le watcher de la spec, qui
  ne filtre que les URL contenant `/api/auth/register`. D'où le message
  « AUCUNE réponse POST observée », qui pointe vers RHF et le proxy — deux fausses pistes.
- Un `curl` sur `/api/auth/register` **réussissait** pendant ce temps : il tape le
  rewrite Next, que le client n'utilisait pas. Même famille de piège que le
  CORS/`Origin` du S57 : *un curl vert ne disculpe pas le chemin navigateur.*

Second piège du même run : **`E2E_API_PROXY_TARGET` doit être posé au `next build`**,
pas seulement au `next start`. `rewrites()` est sérialisé dans `routes-manifest.json`
à la compilation ; posé au seul démarrage, `/api/auth/me` répond **404** au lieu de 401.

Recette qui marche, à reporter au runbook :

```bash
E2E_BACKEND_PORT=8086 E2E_POSTGRES_PORT=5436 docker compose --profile e2e up -d backend-e2e
cd frontend
NEXT_PUBLIC_API_URL=/api E2E_API_PROXY_TARGET=http://localhost:8086 npx next build
NEXT_PUBLIC_API_URL=/api E2E_API_PROXY_TARGET=http://localhost:8086 npx next start -p 3100
SKIP_DELEGATION=1 CI=1 PLAYWRIGHT_BASE_URL=http://localhost:3100 npx playwright test
```

Oracle de bonne configuration, à vérifier **avant** de lancer la suite :
`curl -s -o /dev/null -w '%{http_code}' http://localhost:3100/api/auth/me` doit
répondre **401** (pas 404, pas 000).

Troisième piège, mineur : le hook RTK réécrit `npx next dev` et tue le process.
`rtk proxy npx …` est obligatoire pour tout serveur long.

---

## 2 · MAJEUR 1 — `<tr role="link">` de `ProductsListView.tsx:244`

**Mesuré**, Chromium 149 + Firefox 151, clair + sombre, lecture de pixel,
attente 600 ms (piège `transition-colors`), modalité clavier (13 `Tab`,
`:focus-visible === true` asserté, élément non `disabled`).

- Le contour **PEINT** : trait à 3 px du bord de la ligne, `rgb(14,95,196)` clair /
  `rgb(77,155,255)` sombre, **5.93:1 clair / 6.94:1 sombre** contre le fond de page.
  Identique sur les deux moteurs. `border-collapse` ne l'empêche pas.
- **Les deux traits VERTICAUX sont rognés** — par le conteneur
  `div.overflow-x-auto` (`overflow-x` **et** `overflow-y` calculés à `auto`), pas
  par un défaut de peinture : la ligne fait 1126 px dans une boîte de 1128 px, le
  contour à −3 px tombe hors de la zone de défilement.
- **Aucune action.** Les traits horizontaux courent sur toute la largeur et
  délimitent la ligne sans ambiguïté. `ring-*` est interdit par l'arbitrage et
  serait rogné à l'identique (c'est un `box-shadow`) ; un `outline-offset` négatif
  poserait le trait SUR le `border-b` de la ligne.
- Cas **ajouté à la liste des vérifiés** (`a11y-audit.md` §8bis).

⚠ **Piège tombé et corrigé en cours de mesure** : ma première sonde lisait
`getComputedStyle` **immédiatement** après le `Tab` et rapportait
`outline-color: rgb(22,24,29)` (l'encre) — une couleur **interpolée**, exactement le
piège #2 du briefing. La lecture de pixel, faite après 450 ms, donnait déjà le bleu.
Sonde corrigée : lecture après 600 ms, les deux sources concordent.

---

## 3 · MAJEUR 2 — `EventEditForm.tsx:505`, `focus:border-transparent` orphelin

**Retiré**, avec commentaire in-situ expliquant l'appariement défait (l'anneau
remplaçait la bordure escamotée ; le contour du DS est 2 px plus loin et ne bouche
pas le trou).

Tier de bordure **vérifié, pas recopié** : `border-rule-emphasis`, valeur calculée
`rgb(122,126,135)` sur les deux moteurs — la revue disait juste.

**Vérification navigateur après correctif** (Chromium + Firefox, clair + sombre) :

| | repos | focus |
|---|---|---|
| `:focus-visible` | `false` | `true` |
| bordure | `rgb(122,126,135)` 1 px | `rgb(122,126,135)` 1 px — **inchangée** |
| `outline` | `none` | `solid 2px rgb(14,95,196)` clair / `rgb(77,155,255)` sombre, `offset 2px` |

Balayage de pixel au focus, de l'extérieur vers l'intérieur :
`fond · fond · [trait 2 px] · gap 2 px · [bordure 1 px] · remplissage`.
Géométrie exacte attendue. Contraste bordure/remplissage **3.70:1 clair /
4.10:1 sombre** — au-dessus de 3:1 dans les deux thèmes, au repos comme au focus.

---

## 4 · MAJEUR 3 — garde-fou `base-layer.test.ts` : **option (a)**

Assertion écrite. Nouveau `describe` « cascade @layer — contour :focus-visible (#383) »,
2 tests, sur le modèle exact des 5 describes existants (compilation PostCSS réelle
+ témoin de non-régression à vide) :

1. `:focus-visible { outline: … var(--color-focus) }` sort dans **`@layer base`** ;
   `.outline-hidden` sort dans **`@layer utilities`** ; `base` précède `utilities`.
2. Témoin : sur la forme régressée (règle hors layer), le détecteur rougit.

`outline-hidden` a été ajouté au `@source inline(…)` de `FORCE_UTILITIES` pour que
l'utilitaire soit émise sans dépendre du scan de contenu.

**Ce que le test attrape RÉELLEMENT** — écrit noir sur blanc dans le fichier ET
dans `a11y-audit.md` : il verrouille la **layerisation**, donc l'impossibilité que
la règle ressorte du layer et ré-annule les 32 sites. Il **n'attrape pas** la
réintroduction d'un `ring-2` / `focus:ring-*` dans un `.tsx` — il ne lit aucun
composant. L'option « grep sur les `.tsx` » a été écartée : `cn()`, `cva` et les
classes venues de Radix la rendent trompeuse dans les deux sens.

La phrase fautive de `a11y-audit.md` a été remplacée par une description de la
garantie **réelle**, pas supprimée.

⚠ L'exemption « jsdom ne prouve rien » ne s'applique pas ici (`@vitest-environment node`,
parsing de l'AST CSS, aucun rendu) — et le fichier le dit déjà pour les 5 autres describes.

---

## 5 · Les 5 MINEUR

1. **`ui/popover.tsx`** — commentaire in-situ ajouté au-dessus de `Content` : seule
   exception `outline-hidden` du dépôt, « un panneau n'est pas un contrôle », Radix
   pose `tabIndex=-1` et focalise le conteneur. Modèle `base.css` respecté.
2. **`ui/checkbox.stories.tsx:6`** — commentaire refait : plus de `ring-ring`
   (retiré par #383), bordure `border-rule-emphasis` (#352, **vérifié dans
   `checkbox.tsx:25`**, pas recopié de la revue).
3. **`a11y-audit.md`** — décompte aligné sur `base.css` et **écrit** :
   32 sites = 31 nettoyés + 1 exception (`popover.tsx`).
4. **`CategoryDrawer.tsx:326`** — drawer **ouvert au navigateur** (il ne l'avait
   jamais été), 12 pastilles, Chromium + Firefox, clair + sombre, pires
   appariements choisis exprès (`#3E63DD` le plus foncé en clair, `#F2A900` le plus
   clair en sombre). **Distinguables** : bordure sélectionnée vs fond de page
   **8.87–16.03:1**, non sélectionnée vs fond **1.30–1.33:1** (invisible) — c'est
   cet écart qui porte l'état. ⚠ Mais sur `#F2A900` en sombre, la bordure ne
   contraste que **1.61:1** avec son propre remplissage : l'anneau n'est délimité
   que sur sa face externe. Perceptible, `aria-checked` en second rideau, **mais
   fragile** → follow-up proposé (glyphe de coche), pas corrigé ici : ce serait un
   changement de charte, hors périmètre d'un correctif de clôture.
5. **`ui/select.tsx:92`** — **mesuré, NON rogné.** Sur le **premier** item (le cas
   critique : 4 px de padding au-dessus, `overflow: hidden`, rayon 7 px), le
   balayage vertical donne `surface · surface · TRAIT · TRAIT · bordure du panneau` :
   les 2 px peignent **entièrement** et viennent buter sur la bordure. Quatre côtés
   peints, **5.48:1 clair / 7.03:1 sombre**. Identique Chromium et Firefox.
   **Aucun `outline-offset` négatif nécessaire.**
   Le défaut Firefox pré-existant (options de `Select` n'obtenant jamais
   `:focus-visible`) n'est **pas** concerné : ici `fv=true` sur les deux moteurs, ce
   qui confirme au passage que le défaut visait `SelectItem` **dans le formulaire
   d'événement**, pas ce `Select` de tri. Défaut non clos, non traité ici.

---

## 6 · Ce que je n'ai PAS vérifié

- **WebKit / Safari.** Toutes les mesures de ce rapport sont Chromium 149 +
  Firefox 151 uniquement. Le briefing demandait ces deux moteurs pour MAJEUR 1 ;
  je les ai appliqués aussi aux MINEUR 4 et 5, sans étendre à WebKit.
- **Les angles du `SelectContent`** (rayon 7 px) : balayage aux bords à 12 %, 50 %
  et 88 % de la largeur, jamais dans les coins, où un rognage reste géométriquement
  possible.
- **dpr ≠ 1.** Tout est mesuré à densité 1, viewport 1440×900. Un écran fractionnaire
  peut placer le trait autrement (déjà visible ici : sur les pastilles, Chromium
  rapporte des pixels de bordure **mélangés** — 1.07 vs 1.61 pour Firefox sur le
  même appariement — parce que la bordure de 1 px tombe à cheval sur la grille).
- **`forced-colors: active`** : toujours pas rendu dans ce mode (déjà signalé par #383).
- **Viewports mobiles** : aucune mesure. Les pastilles et la ligne de tableau n'ont
  été vues qu'en desktop.
- **La cause exacte des 5 échecs de l'audit.** Je constate qu'ils ne reproduisent
  pas ; je ne les ai pas reproduits, donc je ne les explique pas.
- **`e2e-local-runbook.md` n'a PAS été mis à jour** avec la recette du §1.4 —
  c'est un fichier du Sprint 47, hors périmètre de ce correctif → follow-up.

---

## 7 · Tests de sortie

| Suite | Résultat |
|---|---|
| Backend `./scripts/test-quiet.sh unit` | **462 / 462**, 0 failure, BUILD SUCCESS |
| Frontend `vitest run` | **887 / 887** (94 fichiers) — 885 avant, +2 du garde-fou #383 |
| `tsc --noEmit` | **0 erreur** (les 3 erreurs `.next/types` signalées par #383 ont disparu au rebuild) |
| E2E suite complète, HEAD + correctifs | **136 passed / 0 failed / 8 skipped** |
| `next build` | exit 0, ESLint et TS activés (`ignoreBuildErrors: false`) |

Aucun fichier temporaire laissé dans le dépôt : les scripts de mesure vivent dans
le scratchpad hors repo, `frontend/test-results/` est gitignoré, aucune spec
jetable n'a été créée. `tsc` le confirme.

---

## 8 · Signaux mémoire

- `[MEMORY:pitfall]` **Contexte** : E2E local, `auth.setup.ts` échoue en accusant
  rate-limit / CORS / 409. **Solution** : `NEXT_PUBLIC_API_URL=/api` **et**
  `E2E_API_PROXY_TARGET` doivent être posés au **`next build`**, pas au `next start`
  (`rewrites()` est sérialisé dans `routes-manifest.json`). Sans le premier,
  `apiClient` perd son préfixe `/api` et prend un 404 que le watcher de la spec ne
  voit pas. **Prévention** : oracle `curl /api/auth/me` → **401** avant tout run ;
  404 ou 000 = stack mal configurée, ne pas lire le message de la spec.
- `[MEMORY:pitfall]` **Contexte** : le hook RTK réécrit `npx next dev` / `next start`
  et tue le process en ne laissant qu'un « Errors: 1 ». **Solution** : `rtk proxy`
  devant tout serveur long. **Prévention** : si un log de serveur tient en 3 lignes,
  c'est RTK, pas l'app.
- `[MEMORY:pattern]` **Problème** : mesurer un `outline` au navigateur.
  **Solution** : lecture de pixel après ≥ 450 ms **et** relecture de
  `getComputedStyle` après la même attente — les deux doivent concorder.
  **Anti-pattern** : lire `getComputedStyle` juste après le `Tab` ; on obtient la
  couleur interpolée de `transition-colors` (ici : l'encre au lieu du bleu de focus)
  et on conclut à tort que la règle ne s'applique pas.
- `[MEMORY:decision] **Contexte** : `<tr>` focalisable dont le contour est rogné
  latéralement par un conteneur `overflow-x-auto`. **Décision** : ne rien changer.
  **Pourquoi** : les traits horizontaux délimitent la ligne sur toute sa largeur ;
  `ring-*` est un `box-shadow` rogné à l'identique et interdit par l'arbitrage ; un
  `outline-offset` négatif poserait le trait sur le `border-b` existant.

---

## 9 · Follow-ups recommandés

1. **Pastille `CategoryDrawer` — affordant de sélection robuste** : ajouter un
   glyphe de coche par-dessus la pastille sélectionnée, pour ne plus dépendre d'un
   anneau qui contraste 1.61:1 avec certains remplissages. `[triage S]`
2. **Reporter la recette E2E du §1.4 dans `sprint-47/e2e-local-runbook.md`**
   (pièges `NEXT_PUBLIC_API_URL` et build-time, oracle `curl /api/auth/me`, `rtk proxy`).
   Le runbook est aujourd'hui incomplet sur les deux premiers. `[triage XS]`
3. **Rognage pré-existant de `.mt-zoom` et de la tablist des réglages** (`outline-offset: -2px`),
   ouvert par #383 et toujours non traité. `[triage XS]`
4. **Firefox : options de `SelectItem` du formulaire d'événement sans `:focus-visible`**
   — défaut moteur pré-existant, toujours non clos. `[triage M]`

STATUS: COMPLETED
