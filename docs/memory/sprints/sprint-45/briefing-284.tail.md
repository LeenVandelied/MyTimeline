## Dependances intra-sprint

- Vague 2. Les vagues 1 (#302, #283) sont **terminees et commitees** sur `sprint/45`.
- Tu consommes l'API `waitForResetToken` livree par #283 (cf. section dependance ci-dessus).
- **Ne modifie pas** : `frontend/middleware.ts`, `frontend/src/lib/auth-guard-paths.ts`,
  `frontend/e2e/auth-guard.spec.ts` (#302) ; `frontend/e2e/forgot-password.spec.ts`,
  `frontend/e2e/support/reset-token.ts`, le package backend `infrastructure/adapters/testsupport/`,
  `.github/workflows/ci.yml` (#283).
  Si le canal de capture te semble bugge, **remonte-le** au lieu de le patcher — c'est la livraison d'une
  autre issue et le lead arbitrera.
- Ta spec doit etre un **NOUVEAU fichier** (ex: `frontend/e2e/reset-password-failures.spec.ts`).

## ADR

Aucun ADR attendu pour cette issue (couverture de test additionnelle, aucune decision d'architecture).
Les ADR du sprint sont deja ecrits : **ADR-004** (garde serveur middleware, #302) et
**ADR-005** (canal token reset e2e, #283). **Ne cree pas d'ADR-004 ni d'ADR-005** — ils existent.
Si tu devais malgre tout en ecrire un, prends le prochain numero libre APRES verification (`ls docs/adr/`).

## Designer

Non applicable — spec de test, aucune UI.

## Contraintes

- Branche cible : `sprint/45` (deja checkout)
- Commit : 1 commit logique, message gitmoji en francais
- `git add` cible sur tes fichiers
- **Les E2E Playwright NE TOURNENT PAS en local sur ce poste** (stack docker down) : le job CI `e2e` est
  le seul gate reel. N'entre pas dans une boucle a essayer de lancer la stack. Ecris la spec avec soin.
- En revanche `tsc --noEmit` et eslint sur `frontend/` DOIVENT etre verts avant ton commit — c'est ta
  seule verification locale possible, ne la saute pas.
- Si volume tests > 500 OU temps > 3min : ne lance pas, retourne `RECOMMAND_TEST_RUNNER`
- Ne PAS modifier `docs/memory/sprint-history.md` (propriete du lead)

## Livrable attendu (format strict, MAX 500 tokens, style caveman)

```
RETOUR :
- commits: [SHA1, ...]
- resume: <objectif + fichiers cles + pitfalls rencontres + tests>
- verifications faites / NON faites: <sois explicite sur ce qui n'a PAS ete execute>
- [MEMORY:*] signaux: <pitfall/pattern/decision/bug si applicables>
- recommandations suite: <RECOMMAND_* ou pitfall subtil>
STATUS: COMPLETED
```

Derniere ligne = `STATUS: COMPLETED` (ou `STATUS: PARTIAL` + section `BLOQUE_SUR`).

Sois honnete sur ce que tu n'as pas pu verifier — la spec ne sera validee qu'en CI, et un rapport qui
surestime la couverture reelle coute plus cher qu'un rapport prudent.
