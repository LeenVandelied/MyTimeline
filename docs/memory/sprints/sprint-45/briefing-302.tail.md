## Dependances intra-sprint

- Vague 1. Tourne EN PARALLELE de #283 (canal de capture du token de reset en E2E).
- #283 touche : `backend/.../adapters/controllers/`, `backend/.../adapters/email/`,
  `frontend/e2e/support/db.ts`, `frontend/e2e/forgot-password.spec.ts`,
  `frontend/package.json`, `.github/workflows/ci.yml`, `backend/.../application-dev.properties`.
- **NE TOUCHE A AUCUN de ces fichiers.** Si ton travail semble l'exiger, STOP et remonte-le
  dans ton rapport plutot que de modifier le fichier.
- Ta spec E2E doit etre un **NOUVEAU fichier** (ex: `frontend/e2e/auth-guard.spec.ts`).
  N'edite pas `forgot-password.spec.ts` (propriete de #283/#284).

## Designer

Non applicable — aucun nouveau composant visuel. Une redirection serveur, pas d'UI nouvelle.

## Contraintes

- Branche cible : `sprint/45` (deja checkout dans le worktree indique en tete de briefing)
- Commit : 1 commit logique, message gitmoji en francais
- **`git add` CIBLE sur tes fichiers uniquement** (worktree partage avec #283) — jamais `-A`, jamais `.`, jamais `commit -a`
- Tests inline OBLIGATOIRES via `./scripts/test-quiet.sh <scope>` depuis la racine du worktree
- Les E2E Playwright ne tournent PAS en local sur ce poste (stack docker down) : le job CI `e2e` est le
  seul gate reel. Ecris la spec avec soin, elle sera validee en CI. Ne boucle pas a essayer de la lancer localement.
- Si volume tests > 500 OU temps > 3min : ne lance pas, retourne `RECOMMAND_TEST_RUNNER`
- Ne PAS toucher aux fichiers listes en "Dependances intra-sprint"
- Ne PAS modifier `docs/memory/sprint-history.md` (propriete du lead)

## Livrable attendu (format strict, MAX 500 tokens, style caveman)

Ecris ton rapport final dans ce format exact :

```
RETOUR :
- commits: [SHA1, ...]
- resume: <objectif + BR touchees + fichiers cles + pitfalls rencontres + tests>
- [MEMORY:*] signaux: <liste si applicables — pitfall/pattern/decision/bug>
- recommandations suite: <RECOMMAND_SECURITY / RECOMMAND_TEST_RUNNER / RECOMMAND_FOLLOWUP / ou pitfall subtil>
STATUS: COMPLETED
```

Derniere ligne = `STATUS: COMPLETED` (ou `STATUS: PARTIAL` + une section `BLOQUE_SUR` decrivant le blocage).

Note : ce sujet touche l'authentification. Le lead spawnera un `security-expert` en Phase 5 sur ton diff —
signale explicitement `RECOMMAND_SECURITY` et liste les points que tu veux voir audites.
