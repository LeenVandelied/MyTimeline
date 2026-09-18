# Issue #312 — [SECURITY] Aligner /me sur /refresh : catch JwtException → 401

**Sprint :** 57 | **Vague :** 1 (parallèle avec #299) | **Taille :** XS | **Domaine :** auth
**Commit :** `1651f9a` — `:lock: fix(auth): aligner /me sur /refresh — SignatureException 401 au lieu de 500 (#312)`

## Objectif

`GET /api/auth/me` renvoyait **500** sur `SignatureException` (token altéré ou signé avec une autre
clé), là où `POST /api/auth/refresh` renvoie **401**. Side-channel mineur : la différence de code
retour révèle le type d'échec de parsing. Confirmé par `security-expert` en revue S43, laissé hors
scope de #289.

## Ce qui a été fait

`AuthController.getUserDetails` : ajout d'un `catch (JwtException e)` **après** les catchs existants
`ExpiredJwtException` / `MalformedJwtException` — l'ordre est contraint par le langage, ces deux
exceptions sont des sous-types de `JwtException` et un catch de la superclasse placé avant les
rendrait inatteignables (erreur de compilation). Le nouveau catch est placé **avant**
`catch (Exception)`, et capte `SignatureException` ainsi que tout autre `JwtException` non couvert.

Comportement des deux catchs spécifiques : **inchangé**.

## Parité avec /refresh — vérifiée

Les deux endpoints renvoient désormais littéralement :
```java
ResponseEntity.status(UNAUTHORIZED).body(Map.of("error", ErrorCode.UNAUTHORIZED.getCode()))
```
soit `{"error":"unauthorized"}`. La constante `ErrorCode.UNAUTHORIZED` était déjà partagée — aucune
nouvelle constante introduite, aucun risque de divergence de libellé (qui aurait recréé le
side-channel que l'issue ferme).

## BR touchées

- **BR-AUT-008** (`/me` retourne l'utilisateur courant sans secret) — le follow-up S43 explicitement
  listé comme « reste ouvert » dans le pack `br-auth.md` est maintenant fermé.
- **BR-AUT-009** (`/refresh` exige un token valide) — sert de référence de parité, non modifiée.
- Anti-pattern **A4** (`catch (Exception)` fuyant) — réduit sur `/me`, pas supprimé (le catch
  générique subsiste en dernier recours).

## Tests

| Test | Rôle |
|---|---|
| `me_withInvalidSignature_returns401Generic` | miroir de `refresh_withInvalidSignature_returns401AndDoesNotReissue` |
| `me_withExpiredToken_returns401Generic` | non-régression `ExpiredJwtException` |
| `me_withMalformedToken_returns401Generic` | non-régression `MalformedJwtException` |

Harnais : `standaloneSetup`, identique à celui du test `/refresh` copié. Justification retenue : le
parsing et l'ownership sont gérés par le contrôleur lui-même, il n'y a pas de 401/403 imposé par la
chaîne Spring Security à couvrir ici. (Le pack `cp-backend.md` avertit que `standaloneSetup` bypasse
Spring Security et produit des faux verts pour les cas *Security-imposés* — non applicable ici.)

**Résultats :** backend complet **455/455** (0 failure, 0 error). Scope `AuthController*Test` : **19/19**.

## Pitfalls

`[MEMORY:pitfall]` — **Worktree partagé : `git add` ciblé ne suffit pas, `git commit` non plus.**
Contexte : sprint 57, vague 1, #312 (backend) et #299 (frontend) sur le même working tree.
Le subagent a bien fait un `git add` ciblé sur ses 2 fichiers backend, mais `git commit` **sans
pathspec commite tout l'index** — il a donc absorbé le renommage
`frontend/app/[locale]/settings/page.tsx → (app)/settings/page.tsx` que #299 avait déjà indexé.
Impact réel : **nul sur le contenu** (déplacement pur, 0 ligne de diff ; vérifié par
`git show --stat 1651f9a`), uniquement une attribution de commit erronée.
Prévention : sur worktree partagé, utiliser `git commit -- <file1> <file2>` (pathspec sur le
**commit**, pas seulement sur le `add`). À ajouter au briefing type de fan-out.
Cf. mémoire existante « Commits parallèles worktree partagé » — elle couvrait `git add -A` mais pas
ce cas-ci.

## Recommandations suite

Aucune côté backend. Aucun `RECOMMAND_SECURITY`, `RECOMMAND_DB_EXPERT`, `RECOMMAND_TEST_RUNNER` ni
`RECOMMAND_UI_DESIGN` — le périmètre est un catch + 3 tests, sans migration ni surface d'interface.

Signal traité par le lead : le renommage mal attribué a été vérifié (`git show --stat`), le contenu
est correct et #299 conserve ses modifications de contenu non indexées. Aucune opération git
corrective engagée sur un working tree encore actif.

STATUS: COMPLETED
