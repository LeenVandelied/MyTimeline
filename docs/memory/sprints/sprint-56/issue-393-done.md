RETOUR :
- commits: (voir git log — 1 commit logique)
- resume: DEFAULT_COLOR '#6366f1' -> '#3B62D4' (--evt-cobalt, palette event Graphite).
  Ratio MESURE 5.407:1 (encre blanche) vs 4.467:1 avant. Dedup: EventContent.tsx
  redeclarait sa propre const DEFAULT_COLOR (jamais citee par l'issue) -> importe
  desormais celle de types/event.ts (source unique).

- DECISION COULEUR (pourquoi pas #4f46e5 suggere par l'issue) :
  les deux passent AA (#4f46e5 = 6.288:1, #3B62D4 = 5.407:1). Retenu #3B62D4 car
  il appartient a la palette event curated 12 tons du DS Graphite
  (ds/tokens/colors.css --evt-cobalt, exposee --color-evt-cobalt dans globals.css).
  Le projet a deja purge ses indigos/violets hors palette (landing.css +
  landing-palette.test.ts qui garde cette purge) : reprendre un indigo Tailwind
  (#4f46e5) rouvrait exactement cette dette. Bonus : teinte voisine de l'ancienne
  -> decalage visuel minime sur les events existants sans couleur.
  Confirmation independante : EventPill.test.tsx utilisait DEJA #3B62D4 comme
  echantillon canonique "contraste OK dedans" avant cette issue.

- MESURE (outillage du projet, pas calcul de tete) :
  probe temporaire important contrastRatio/contrastInk (src/lib/color.ts) et
  eventLabelReadableInside (components/timeline/lib.ts), supprimee apres mesure :
    #6366f1  dark=4.381 light=4.467 best=4.467 readableInside=FALSE
    #4f46e5  dark=3.112 light=6.288 best=6.288 readableInside=true
    #3B62D4  dark=3.619 light=5.407 best=5.407 readableInside=TRUE
  Les inks sont INK_DARK #0B0C0E / INK_LIGHT #FFFFFF (pas noir pur).

- VERIFICATION — mode honnete : PAS de verification navigateur.
  Substitut assume (autorise par le briefing) = assertion contraste + test de RENDU :
  1. lib-a11y.test.ts : eventLabelReadableInside(DEFAULT_COLOR) === true, sur la
     constante IMPORTEE (pas un litteral recopie).
  2. EventPill.test.tsx : rendu d'un event a DEFAULT_COLOR -> titre DEDANS sans
     aria-hidden ET absence de timeline-event-outside-label.
  Test de sensibilite (anti-test-vacuous) : DEFAULT_COLOR remis temporairement a
  '#6366f1' -> exactement 2 echecs, les 2 nouveaux garde-fous. Valeur restauree.

- TESTS MIS A JOUR (distinction demandee par le briefing) :
  - types/event.test.ts:87 "fallback color par defaut" -> assertion sur DEFAULT_COLOR
    importe (etait '#6366f1' en dur) — c'etait "le defaut vaut X" -> MAJ.
  - NewEventDrawer.test.tsx:255 (NON cite par l'issue ni par le briefing, trouve en
    grep) -> payload create attendait color '#6366f1' en dur ; le drawer pre-remplit
    avec DEFAULT_COLOR (#300) -> assertion portee sur la constante.
  - lib-a11y.test.ts:93 "indigo par defaut #6366f1 -> false" : ASSERTION CONSERVEE
    (l'echantillon reste non conforme), seuls le libelle et le commentaire reformules
    ("indigo #6366f1", echantillon non conforme, plus "la couleur par defaut").
  - EventPill.test.tsx:109 + fixtures.tsx:41/67 : valeurs #6366f1 LAISSEES telles
    quelles (inputs explicites exercant le chemin "libelle dehors"), commentaires
    precises pour ne pas les resynchroniser un jour avec le defaut.
  - color.test.ts:59 : intouche (input explicite dans une liste d'echantillons).

- SUITES : frontend 92 fichiers / 838 tests OK ; backend 452 tests OK ;
  npx tsc --noEmit -> 0 erreur.

- [MEMORY:pitfall] Contexte: constante "par defaut" dupliquee — DEFAULT_COLOR
  declaree dans types/event.ts (exportee) ET redeclaree en local dans
  EventContent.tsx, ironiquement sous un commentaire "#150 modele couleur unique".
  Un fix de valeur cite par une issue n'aurait touche qu'une des deux -> deux
  "defauts" divergents selon le composant. Solution: import de la source unique.
  Prevention: sur toute issue "changer une valeur par defaut", grep la VALEUR
  litterale en plus du nom de la constante — la copie n'a pas toujours le meme nom.

- [MEMORY:pattern] Probleme: un test de garde-fou sur une valeur (couleur, seuil)
  ecrit avec un litteral recopie ne prouve rien — il reste vert si la constante
  derive. Solution: asserter sur la CONSTANTE IMPORTEE, puis verifier la sensibilite
  en remettant temporairement la mauvaise valeur (doit echouer). Anti-pattern:
  expect(mapped.color).toBe('#3B62D4').

- recommandations suite: RECOMMAND_FOLLOWUP (commentaires obsoletes, fichiers hors
  de mon perimetre car propriete #392 / vague 3) :
  - frontend/src/components/timeline/TimelineView.test.tsx:378
    `color: '#6366f1', // 4.47:1 max -> fallback dehors` : l'assertion reste valide
    (echantillon non conforme) mais le commentaire laisse croire au defaut de l'app.
  - frontend/e2e/timeline.spec.ts:942 : commentaire citant DEFAULT_COLOR = #6366f1
    et son ratio 4.467 -> factuellement faux depuis ce commit.
STATUS: COMPLETED
