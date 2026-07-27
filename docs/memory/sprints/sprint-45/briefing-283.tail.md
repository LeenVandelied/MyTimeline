## Dependances intra-sprint

- Vague 1. Tourne EN PARALLELE de #302 (garde serveur middleware).
- #302 touche : `frontend/middleware.ts`, `frontend/src/hooks/useAuthGuard.ts`,
  `frontend/src/components/layout/AppShell.tsx`, `frontend/app/[locale]/(app)/**`,
  et cree une NOUVELLE spec `frontend/e2e/auth-guard.spec.ts`.
  **NE TOUCHE A AUCUN de ces fichiers.**
- **Tu livres pour #284** (vague 2) : l'issue #284 ecrira les specs E2E des cas d'echec du flux
  reset-password et **consommera le canal de capture que tu produis**. En consequence :
  - Expose une API de capture propre et documentee cote support E2E
    (ex: `frontend/e2e/support/reset-token.ts` avec une fonction equivalente a l'actuelle
    `waitForResetToken(email, timeoutMs)`).
  - **Conserve une signature utilisable telle quelle**, et documente-la en tete de fichier.
  - Mentionne explicitement cette API dans ton rapport final — le lead la transmettra a #284.
- `frontend/package.json` : tu en es proprietaire cette vague. #302 n'y touche pas.

## Designer

Non applicable — outillage de test, aucune UI.

## Contraintes

- Branche cible : `sprint/45` (deja checkout dans le worktree indique en tete de briefing)
- Commit : 1 commit logique, message gitmoji en francais
- **`git add` CIBLE sur tes fichiers uniquement** (worktree partage avec #302) — jamais `-A`, jamais `.`, jamais `commit -a`
- Tests inline OBLIGATOIRES via `./scripts/test-quiet.sh <scope>` depuis la racine du worktree.
  Le backend se teste aussi via `backend/./mvnw` si besoin.
- Les E2E Playwright ne tournent PAS en local sur ce poste (stack docker down) : le job CI `e2e` est le
  seul gate reel. Ecris la spec avec soin, elle sera validee en CI. Ne boucle pas a essayer de la lancer localement.
- Le test d'absence de bean hors profil `e2e` (exigence 1 de la decision) est un test **backend**, lui
  DOIT tourner en local et etre vert avant ton commit.
- Si volume tests > 500 OU temps > 3min : ne lance pas, retourne `RECOMMAND_TEST_RUNNER`
- Ne PAS modifier `docs/memory/sprint-history.md` (propriete du lead)
- Modification de `.github/workflows/ci.yml` : **uniquement** la variable du job e2e. Toute autre
  modification de CI est hors scope — remonte-la en `RECOMMAND_FOLLOWUP`.

## Livrable attendu (format strict, MAX 500 tokens, style caveman)

```
RETOUR :
- commits: [SHA1, ...]
- resume: <objectif + fichiers cles + pitfalls rencontres + tests>
- API pour #284: <signature exacte + chemin du module de capture du token>
- [MEMORY:*] signaux: <liste si applicables — pitfall/pattern/decision/bug>
- recommandations suite: <RECOMMAND_SECURITY / RECOMMAND_TEST_RUNNER / RECOMMAND_FOLLOWUP / ou pitfall subtil>
STATUS: COMPLETED
```

Derniere ligne = `STATUS: COMPLETED` (ou `STATUS: PARTIAL` + une section `BLOQUE_SUR` decrivant le blocage).

Note : endpoint test-only sur un flux d'authentification. Le lead spawnera un `security-expert` en Phase 5 —
signale `RECOMMAND_SECURITY` et liste les points a auditer (exposition du profil, fuite du token).
