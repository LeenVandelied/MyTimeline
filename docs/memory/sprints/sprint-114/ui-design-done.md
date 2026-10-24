# Arbitrage ui-design — Sprint 114, issue #816

Spawné par le lead après la correction de review be209310 (densité de la liste produits entre md et xl).

## Verdict : APPROUVE (sous condition, remplie)
- `docs/design/graphite-handoff.md` §5 l.188-190 fixait « 220×40 px dès `md` » tout en exigeant que la table tienne et que le nom se tronque lisiblement : le seuil `md` contredisait l'invariant de la même note. be209310 corrige le seuil, pas l'invariant.
- Précédent : #608 (S107) avait déjà amendé ce §5 (frise compacte sous `md`) ; passer le seuil à `xl` est du même ordre.
- Titre du prochain événement plafonné à 80 px (`max-w-20`) sous `xl` : classe déjà utilisée sous `sm` (#608), aucun token inventé, texte complet en `title`. Acceptable.
- Condition : amender le handoff dans la même PR → fait par le lead, commit 32aaff7c.
- Réserve non bloquante : `title` n'est lu ni au tactile ni au clavier ; le texte complet reste accessible par le clic de ligne (détail produit).
- Non vérifié par l'agent : `design_handoff_mytimeline/` absent du dépôt.

## Signaux mémoire
- [MEMORY:decision] Seuil de la frise de la liste produits : `xl` (1280 px), pas `md` — à 768 px une frise de 220 px laissait ~27 px au nom (même défaut que #825).

## Recommandations suite
- Pas de RECOMMAND_FOLLOWUP : condition remplie dans la PR.
STATUS: COMPLETED
