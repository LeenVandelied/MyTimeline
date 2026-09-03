## Dependances intra-sprint
- **Tu es la VAGUE 2 et la dernière.** #326 est livrée et committée (`22d6eeb`). Tu
  travailles PAR-DESSUS. Ne la refais pas, ne la défais pas.
- Tu peux modifier `timeline.css` et `EventPreviewTimeline.tsx` : la vague 1 a fini.
- Si une correction que tu juges nécessaire remet en cause le mécanisme d'épinglage de
  #326 (portail, `.mt-drawer__preview`), **arrête-toi et remonte-le en
  `STATUS: PARTIAL` + `BLOQUE_SUR`** plutôt que de le réécrire : ce serait un
  arbitrage, pas une correction visuelle.

## Designer
Non applicable au sens habituel : **cette issue EST la revue design**, et la spéc est le
handoff §6. Tu ne demandes pas une validation — tu la produis.

## Contraintes

### Méthode de vérification — LE CŒUR DE L'ISSUE, lis ceci en entier

Cette issue existe **parce que #315 a déduit la conformité de l'usage des tokens au lieu
de la constater**. Reproduire ce raisonnement serait la rater.

Trois pièges mesurés sur ce projet, tous documentés :

1. **Une CI verte ne prouve rien sur ce que voit l'utilisateur** (S48 : 2 CTA rendus à
   1,00:1 de contraste, illisibles, découverts APRÈS une CI verte). Seul un vrai moteur
   de rendu répond à « qu'est-ce qui est affiché ».
2. **Une vérification navigateur peut être verte ET rater l'essentiel** (S53 : une passe
   verte a raté 28 titres, parce que l'échantillon avait été choisi par commodité).
   **Choisis ton échantillon par le RISQUE**, pas par la facilité : les états les plus
   exposés ici sont *récurrent + légende* (le seul cas qui rend connecteur + fantôme),
   *couleur utilisateur très claire* et *très sombre* (l'encre est calculée par
   `contrastInk` — c'est là que ça casse), et *thème sombre* (moins parcouru).
   **Sonde aussi des éléments synthétiques** dont tu connais la réponse attendue, pour
   prouver que ta mesure sait dire NON.
3. **jsdom ne met rien en page** : `getComputedStyle` y rend des valeurs *déclarées*,
   jamais *rendues*, et n'y résout pas la précédence des `@layer` CSS. Un test Vitest ne
   peut donc pas conclure sur ce sujet. ⚠ Piège de mesure connu : un sélecteur ou une
   assertion sur `text-*` peut apparier une valeur de `line-height` au lieu de la taille
   visée — vérifie ce que tu mesures réellement.

**Outillage EXISTANT à réutiliser, ne réécris pas de mesure :**
- `frontend/e2e/support/contrast.ts` — contraste WCAG, troncature, opacité effective.
- `frontend/e2e/landing-cta-contrast.spec.ts` — précédent de spec clair ET sombre.
- `frontend/e2e/sprint-62-control-focus-contrast.spec.ts` — précédent de mesure de style
  calculé sur un contrôle.
- `frontend/e2e/sprint-70-create-preview-pinned.spec.ts` — écrite par la vague 1 ; elle
  ouvre déjà le drawer de création et cible l'aperçu. **Lis-la avant d'écrire la tienne**,
  tu y trouveras le chemin d'ouverture et les préconditions.
- Recette de lancement locale : `docs/memory/sprints/sprint-47/e2e-local-runbook.md`.
  Elle a réellement tourné pendant la vague 1 (6 passed en 5,9 s) — donc elle marche.

**Un test qui ne peut pas échouer ne prouve rien.** Avant de conclure « conforme »,
mute délibérément le code (change un token, retire une règle) et vérifie que ta mesure
VIRE AU ROUGE. La vague 1 l'a fait à deux niveaux ; on n'attend pas moins ici.

### Environnement — À LIRE AVANT TOUTE COMMANDE
- **Worktree git** :
  `/Users/herrh/VSProjects/MyTimeline/.claude/worktrees/traitement-s-xs-parallele-d0ae59`
  **`cd` explicitement dedans au début de CHAQUE commande bash.** Garde-fou :
  `git rev-parse HEAD` doit rendre un descendant de `22d6eeb` (la vague 1).
  Un subagent qui défaut-`cwd` sur le dépôt principal produit de faux KO.
- Branche : `claude/sprint-70-start-b946cb`. **Pas de branche `sprint/70`.**
- `frontend/node_modules` : la vague 1 a lancé `npm ci` dans ce worktree, il devrait être
  présent. S'il manque, réinstalle — un échec de préflight d'environnement **n'est PAS**
  une suite rouge (`PIT-S69-002`).
- **RTK avale la sortie** de `git diff`, `git log`, **et aussi de `playwright test` et
  `vitest --reporter=verbose`** (constat de la vague 1). Préfixe par `rtk proxy` dès que
  la sortie te paraît vide ou tronquée. `git rev-parse` reste fiable.

### Code
- Commit : **1 commit logique**, gitmoji en **français**. `git add` **CIBLÉ** —
  **jamais `git add -A`** (working tree partagé).
- Zéro couleur littérale, zéro z-index littéral : **tokens DS uniquement**. La seule
  couleur littérale légitime du composant est celle choisie par l'utilisateur.
- Chaque correction visuelle doit rester **theme-aware** : si tu touches un token en
  clair, prouve le sombre.
- Ne touche PAS : `backend/**`, `db/migration/**`, `EventDrawer*`, `TimelineEditHost*`,
  `ConflictDialog*`.
- Tout nouveau `data-testid` DOIT être cité dans une spec de `frontend/e2e/`. ⚠ Ce check
  vérifie seulement qu'il est **cité**, pas que la spec passe — ne t'en contente pas.

## Livrable attendu (format strict, MAX 500 tokens, style caveman — pas de prose)

RETOUR :
- commits: [SHA, ...]
- **verification: <TABLEAU point par point>** — une ligne par élément du handoff §6
  (règle, marqueur TODAY, barre pleine, connecteur pointillé, occurrence fantôme,
  légende, variante `.mt-evt--preview`), avec pour chacun : thème clair → **mesure
  chiffrée**, thème sombre → **mesure chiffrée**, verdict CONFORME / ÉCART / NON MESURÉ.
  « NON MESURÉ » est une réponse acceptable ; « conforme » sans chiffre ne l'est pas.
- ecarts_corriges: <liste + fichier:ligne>
- ecarts_non_corriges: <liste + pourquoi>
- echantillon: <ce que tu as mesuré ET ce que tu n'as PAS mesuré — le S53 a été raté
  par un échantillon choisi par commodité>
- preuve_que_la_mesure_sait_dire_NON: <la mutation que tu as faite et ce qui a rougi>
- **fichiers de contexte lus:** <chemins réellement ouverts + ancrage vérifiable pour
  chacun (identifiant de pitfall, numéro de ligne, citation courte)>. **Obligatoire, sera
  auditée.** Si tu n'as pas lu un fichier pointé, écris-le — un aveu est exploitable, une
  affirmation fausse ne l'est pas.
- tests: <commandes + résultat chiffré ; « non lancé » si non lancé>
- [MEMORY:*] signaux
- recommandations suite: <RECOMMAND_* OU négation explicite « Pas de RECOMMAND_X car … »>
- STATUS: COMPLETED en dernière ligne (ou STATUS: PARTIAL + BLOQUE_SUR)
