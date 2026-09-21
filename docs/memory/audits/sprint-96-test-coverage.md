# Audit tests — Sprint 96

> Généré en fin de Phase 6. Thème : « Contrôles atteignables au doigt » — 4 corrections
> frontend (a11y / géométrie / stabilité de test). **Aucune règle métier touchée, aucune
> migration Flyway** : la grille de couverture est donc exprimée en critères d'acceptation
> vérifiables, pas en BR-XX.

## Couverture par critère d'acceptation

| Issue | Critère | Cross-system | Unit backend | Vitest frontend | E2E mesuré | Preuve |
|---|---|:---:|:---:|:---:|:---:|---|
| #665 | Pastilles + « Personnalisé » ≥ 44×44 à 375 px | NON | N/A | N/A | ✅ | `sprint-96-palette-geometry.spec.ts` — 6/6 (3 surfaces × clair/sombre) |
| #665 | Aucune pastille orpheline aux 3 largeurs réelles | NON | N/A | N/A | ✅ | `sprint-96-palette-geometry.spec.ts` — mobile 375 px ET desktop 1280 px (bloc ajouté en cycle de review, commit `7301c1b7`) ; défaut reproduit AVANT correction (11+1 / 11+1 / 10+2) |
| #665 | Desktop : TAILLE inchangée (la DISPOSITION change volontairement, 11+1 → 6+6) | NON | N/A | N/A | ✅ | 28×28 et 153×28 identiques avant/après ; non-régression 28×28 désormais assertée à 1280 px |
| #633 | Bouton retour ≥ 44 px de cible effective | NON | N/A | ✅ 1876/1876 | ✅ | `settings-mobile.spec.ts` — 7/7, exécutée en vague 2 (`boundingBox` @375) |
| #633 | L'en-tête absorbe l'agrandissement | NON | N/A | N/A | ✅ | même spec, assertion de non-débordement |
| #633 | Balayage « aucune autre cible < 44 px » | NON | N/A | N/A | ⚠ | **INFIRMÉ** : 3 familles sous le seuil trouvées → follow-ups (voir §Écarts) |
| #702 | Cause de l'instabilité identifiée | NON | N/A | N/A | ✅ | sonde `focusin` : restitution différée du `Select` Radix à t≈28-29 ms |
| #702 | 10 runs isolés sans échec | NON | N/A | N/A | ✅ | 6 échecs/10 avant → 0/10 après, invocations séquentielles |
| #702 | Le produit ne perd pas le focus (anti-masquage) | NON | N/A | N/A | ✅ | focus tenu 1,5 s ; oracle en lecture UNIQUE non réessayée |
| #656 | Conteneur langue/thème non recouvert, bannière active | NON | N/A | N/A | ✅ | `sprint-96-auth-banner-overlap.spec.ts` — 37/37, bannière forcée (500 sur `/api/auth/me`) |
| #656 | Cible AA/AAA clarifiée | NON | N/A | N/A | ✅ | décision AAA consignée, motif chiffré (2.5.8 : 24 px restants = seuil AA sans marge) |

Aucun flux 2+ systèmes/rôles dans ce sprint ⇒ aucun E2E métier requis.

## Tests créés / modifiés

- `frontend/e2e/sprint-96-palette-geometry.spec.ts` (neuf, #665) — 6 tests
- `frontend/e2e/sprint-96-auth-banner-overlap.spec.ts` (neuf, #656) — 37 tests
- `frontend/e2e/settings-mobile.spec.ts` (+53 lignes, #633) — spec de géométrie du bouton retour
- `frontend/e2e/sprint-84-palette.spec.ts` (#702) — attente déterministe + oracle de durabilité
- `frontend/e2e/sprint-95-toast-overlap.spec.ts` (#665) — réparée après rupture par la nouvelle grille

## Résultats de runs (mesurés, pas annoncés)

- **Vitest frontend** : 1876 / 1876, 0 échec (#633)
- **`test-quiet.sh frontend`** (build + Vitest + tsc + lint) : vert (#665, #656)
- **Format** : `./node_modules/.bin/prettier --check .` (binaire DIRECT) vert sur le dépôt entier
- **E2E, suite complète (vague 3)** : 450 passed / 10 failed / 8 skipped
  - Les 10 « failed » sont `sprint-77-theme-visual` : références `-darwin` inexistantes sur macOS.
    Rejoués seuls, ils rendent 16 « passed » **VIDES** (PIT-S95-003). Les 10 PNG générés ont été
    supprimés, et ces tests sont **retranchés du décompte** : portée réelle **440 passed / 0 failed**.
  - Campagne de contrôle `--ignore-snapshots` : 459 passed / 1 failed — l'unique rouge est un
    contrôle d'armement que ce drapeau défait structurellement.
- **Runs groupés intermédiaires** : 31/31 (vague 1), 67/67 (vague 2)
- `git status --porcelain | /usr/bin/grep darwin` : **vide** à la clôture (aucun PNG parasite commité)

## Correction issue de la review batch (Phase 7)

La review a trouvé **1 MAJEUR**, confirmé par le lead sur les fichiers réels avant dispatch :
la spec de garde de #665 ne tournait **qu'à 375 px**, alors que la JSDoc du composant documente
le défaut MESURÉ à **1280 px** (`CategoryDrawer` 11+1 — « exactement le défaut de l'issue »).
Le critère d'acceptation principal de #665 n'était donc pas gardé là où le défaut avait été
constaté. **La première version de cet audit affirmait ce critère couvert : c'était faux.**

Corrigé par le commit `7301c1b7` : bloc desktop 1280×900 sur les 3 surfaces (découpage 6+6, aucune
ligne orpheline, ordre de lecture = ordre DOM, non-régression 28×28). Armement démontré par
contrôle négatif — une sonde jetable réinjectant la mise en page pré-#665 rend **402 px 11+1 /
402 px 11+1 / 377 px 10+2** à 1280, identique aux cotes de la JSDoc, qui ont donc maintenant une
mesure derrière elles. Runs : spec seule 14/14 ; specs citant la surface 64/64 (deux runs).
Aucune ligne de comportement modifiée dans `frontend/src/` (vérifié par le lead) — commentaires
et specs uniquement.

Aucun CRITIQUE. 1 MINEUR non traité (bloc de commentaire de #656 dupliqué 4×) → follow-up.
Un cycle 2 de review a été lancé sur ce commit de correction (les corrections de review doivent
elles-mêmes être relues — au S62 des gardes non armées ont été trouvées exactement là).

## Contrôle coverage-E2E (Phase 8)

`0` nouveau `data-testid` dans le diff `*.tsx` ⇒ la vérification heuristique est **vacante** sur ce
sprint : elle ne prouve rien ici. La preuve de couverture réelle est la colonne « E2E mesuré »
ci-dessus, dont chaque ligne renvoie à une spec effectivement exécutée avec son décompte.

## Écarts d'énoncé constatés (documentés, non corrigés)

- **#633** — l'énoncé affirme « une exception ». Faux : `settings-back`
  (`app/[locale]/(app)/settings/page.tsx:51-59`, `size="icon"` = 36 px, `lg:hidden`) est rendu sur
  le MÊME écran ; plus les primitives shadcn partagées (`Button` 36, `size="sm"` 32, `Input` /
  `SelectTrigger` 36) et le grabber `BottomSheet` (28). Le 3e critère est **infirmé, pas rempli**.
- **#665** — l'énoncé ne signalait la ligne orpheline que sur le tiroir catégorie ; elle était
  présente sur les **trois** surfaces. `popoverPicker.tsx` n'est pas un 4e consommateur.
- **#656** — la cause réelle n'est pas dans l'énoncé : la racine des pages auth était
  `position: static`, donc le conteneur `absolute top-4` s'ancrait au bloc conteneur initial.

## Non vérifié (assumé)

- **Références visuelles Linux** : invérifiables sur macOS. Seule la CI Linux peut les trancher.
- **Largeurs 640–1279 px** : non gardées. Le raisonnement dit que `grid-cols-6` y tient par
  construction, mais aucune mesure ne le couvre — c'est un raisonnement, pas une preuve.
- **Rendu CI Linux du bloc desktop** ajouté en cycle de review : non vérifié (macOS/Chromium seul).
- Le 10/10 de #702 vaut **pour ce poste** ; aucune mesure de stabilité sur la CI Linux.
- Firefox / WebKit, locale `de`, projet `rate-limit-armed` (gated derrière chromium, `did not run`).
- `test-quiet.sh frontend` non relancé après le commit de #702 (il n'a modifié aucun fichier `src/`).

## Conclusion

Prêt pour PR. Aucun trou de couverture bloquant sur le périmètre livré. Deux réserves à porter
dans le corps de la PR : les références visuelles ne sont validables qu'en CI Linux, et le 3e
critère de #633 est explicitement infirmé plutôt que satisfait.
