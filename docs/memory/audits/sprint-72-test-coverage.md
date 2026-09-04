# Audit tests — Sprint 72

> Genere en fin de Phase 6. Les chiffres ci-dessous ont ete mesures par le lead
> lui-meme a HEAD, pas recopies des rapports d'agent — l'un d'eux s'est revele faux
> sur ce sprint (cf. §Ecarts).

## Couverture par regle metier

| BR | Description | Flux inter-systemes | Unit backend | Integration | Unit frontend | E2E parcours | E2E metier |
|----|-------------|:---:|:---:|:---:|:---:|:---:|:---:|
| BR-AUT-012 | forgot-password : 200 systematique, sans side-channel de timing ; token usage unique | OUI (app + Brevo) | OK (47 nouveaux) | OK (`MockRestServiceServer`) | OK (`authService.test.ts`) | non couvert | **non atteignable — voir ci-dessous** |
| (aucune) | #72 est purement presentationnel : formats de nombres et classes DS. Aucune regle metier touchee. | NON | s.o. | s.o. | OK (2 fichiers, +304 l.) | non couvert | s.o. |

### Pourquoi l'E2E metier de BR-AUT-012 n'est pas fourni

Le flux traverse un tiers (Brevo). En l'absence de `BREVO_API_KEY`, l'adapter est
volontairement NO-OP : aucun email ne part, donc aucun E2E ne peut observer le rendu.
Le prouver reellement demanderait soit une boite de reception de test, soit un double
d'API — **hors perimetre de cette issue, et non fait**. Ce n'est pas une case cochee :
c'est une limite assumee, consignee ici pour ne pas etre relue comme une couverture.

La partie *observable sans tiers* est, elle, couverte : `BrevoEmailServiceLocaleTest`
intercepte le payload HTTP reel et asserte sur `htmlContent` pour les 4 langues.

## Tests crees

- `backend/.../email/PasswordResetEmailTemplateTest.java` — 28 tests (resolution de
  locale totale : null, vide, casse, sous-tag regional `de_AT`, inconnue)
- `backend/.../email/BrevoEmailServiceLocaleTest.java` — 18 tests (payload reel
  intercepte, echappement HTML verifie dans les 4 langues)
- `backend/.../PasswordResetServiceImplTest.java` — +1
- `frontend/src/components/dashboard/intl-formats.test.tsx` — +164 lignes
- `frontend/src/styles/__tests__/i18n-intl-classes.test.ts` — +146 lignes (compile la
  vraie chaine CSS et asserte sur l'AST : sous jsdom, `toHaveClass` ne prouve rien)
- `frontend/src/services/authService.test.ts` — +35 lignes

## Resultats mesures a HEAD (par le lead)

- Backend : `./scripts/test-quiet.sh backend` → **561 tests, 561 passed, 0 failed**
- Frontend : `./scripts/test-quiet.sh frontend` → **106 fichiers, 1168 tests, 0 failed**
- `npx tsc --noEmit` → **0 erreur** (apres le correctif `72d75f3`)
- `npx prettier --check` sur les fichiers touches → conforme
- **E2E Playwright : NON EXECUTES sur ce diff.**

## Check de couverture E2E (heuristique Phase 8)

Verdict brut de l'heuristique : `MAJEUR` sur `dashboard-density-today`.
**Faux positif, verifie** : ce testid existe deja sur `origin/dev`
(`DensityRibbon.tsx` lignes 87 et 120). Il n'apparait en `+` dans le diff que parce
que la ligne `title` adjacente a change. Aucun testid reellement nouveau dans ce sprint.

Rappel de la limite de cet outil : il verifie qu'un testid est **cite** quelque part,
pas qu'une spec passe. Un verdict vert n'aurait rien prouve non plus.

## Ce qui reste non verifie — a ne pas lire comme soldé

1. **Aucun E2E lance** sur ce diff, ni backend ni frontend.
2. **Aucun rendu d'email jamais vu dans un client mail.** Les 4 templates n'existent
   que sous forme de chaines assertees par des tests.
3. **Traductions es/de non relues par un locuteur natif** — redigees d'apres
   `public/locales/*`.
4. **Aucune verification navigateur** du delta visuel de #72 : `EventPreviewTimeline`
   passe de 15px a 13px, et un `white-space:nowrap` a ete ajoute dans un conteneur
   `w-16` (64px) dont la tenue en `de` est **estimee, pas mesuree**.

## Ecarts constates entre rapports d'agent et realite

Le rapport de #72 affirmait « `npx tsc --noEmit` : 0 erreur ». C'etait **faux** :
`i18n-intl-classes.test.ts:65` levait TS2322 (callback `walkDecls` type `false | void`,
la lambda renvoyait la `Map`). L'agent de #142 a signale l'ecart, le lead l'a verifie
et corrige (`72d75f3`). Vitest ne typecheckant pas, la suite verte masquait l'erreur —
seul le job frontend en CI l'aurait attrapee.

## Conclusion

Suites unitaires vertes et typage propre, mesures independamment. Les quatre points
de la section « non verifie » sont des trous connus, dont deux (E2E, rendu mail reel)
meritent un follow-up plutot qu'un blocage de la PR.
