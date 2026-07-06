# Issue #197 — ux-patterns.md (formalisation patterns clavier Timeline)

commits: [b113fef] (HEAD sprint/24 après amend ; message identique)

## resume
Créé `.claude/rules-jit/ux-patterns.md` (10 sections) documentant le pattern RÉEL
livré par #81 (518aa86), pas un idéal :
1. Region landmark [LIVRÉ] 2. Roving tabindex PAT-S24-roving-resource-keyed [LIVRÉ]
3. Navigation flèches ←→↑↓/Home/End + Entrée natif [LIVRÉ] 4. Focus-trap drawer
[LIVRÉ] 5. Raccourcis T/[/]/+/-/F/Échap [LIVRÉ] + `?` [PRÉVU] 6. aria-live polite
[LIVRÉ] 7. scrollIntoView après focus PIT-S24 [LIVRÉ] 8. aria-label agrégé [LIVRÉ]
9. Écarts connus 10. Checklist ui-design.

Écarts consignés vs code #81 :
- `?` (aide) NON câblé au clavier : pas de `case '?'` dans le handler global ;
  l'aide est un tooltip hover/focus (`.mt-tlv__help-pop role=tooltip`). Statut
  PRÉVU. Décision demandée (câbler OU acter hover-only + retirer `?` de la liste).
- `EventPill.tsx:100` span titre `aria-hidden` toujours actif même seul texte
  visible. Inoffensif (aria-label du bouton couvre). Statut : MINEUR toléré,
  correctif trivial facultatif → issue de suivi, PAS de correctif dans #197
  (périmètre EventPill/TimelineView figé, dépendance #81/#82).

Aucune modif de code clavier (#81 figé). Aucun test ajouté : les 3 gaps de
couverture repérés (←→ inter-lanes, cyclage Tab drawer + restore focus,
raccourcis T/[/]/-) sont NON bloquants et touchent des fichiers hors périmètre
(TimelineView.test.tsx édite le comportement figé) → tracés en §9 comme suivi.
Suite frontend : 325/325 verte (inchangée, doc-only).

Note infra : `.claude/` est gitignoré (.gitignore:100, outillage local). `ux-patterns.md`
force-ajouté (`git add -f`) — SEUL fichier rules-jit tracké. Les autres packs
rules-jit restent locaux. À surveiller : le référentiel partagé vit désormais dans
un dir globalement ignoré.

## [MEMORY:*] signaux
[MEMORY:decision] Context: #197 doit stocker un référentiel a11y partagé (ux-patterns.md)
mais `.claude/` est intégralement gitignoré (.gitignore:100, tooling local).
Decision: force-add (`git add -f`) du SEUL `.claude/rules-jit/ux-patterns.md`, sans
lever l'ignore global ni tracker les autres packs rules-jit. Why: garder l'exception
minimale ; ne pas embarquer par surprise backend.md/frontend.md/etc. (locaux). À
réévaluer si d'autres rules-jit doivent devenir partagés (alors : négation gitignore ciblée).
[MEMORY:pattern] Réf. canonique PAT-S24-roving-resource-keyed désormais formalisée
dans ux-patterns.md §2 (roving keyé par ID stable, index dérivé via Map id→index,
jamais d'index brut en state). Anti-pattern `{lane,evt}` documenté (régression MAJEUR-2).

## recommandations suite
RECOMMAND_UI_DESIGN : valider Timeline vs `.claude/rules-jit/ux-patterns.md`
(re-validation formelle par le lead ; checklist §10 fournie pour trancher
« conforme / réserves levées »). La RÉSERVE historique (réf. `EventDrawer.tsx:12`
« ux-patterns.md absent ») est désormais résolue côté référentiel.
RECOMMAND_FOLLOWUP : statuer sur `?` (câbler `case '?'` ouvrant le pop d'aide OU
acter aide « hover/focus only » et retirer `?` de la liste des raccourcis) [frontend].
RECOMMAND_FOLLOWUP : (facultatif) `EventPill.tsx:100` retirer `aria-hidden` quand
`readableInside` ; et compléter couverture tests §9 [frontend].
Pas de RECOMMAND_TEST_RUNNER ni RECOMMAND_DB_EXPERT.

STATUS: COMPLETED
