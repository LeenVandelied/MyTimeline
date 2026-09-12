# Issue #142 — i18n du template email de reset (EN/DE/ES)

**Commit :** `cf49e2e` — 14 fichiers, +491/-44
(verifie par le lead : cote frontend, uniquement `authService.ts`, son test et
`app/[locale]/forgot-password/page.tsx` — aucune incursion dans les fichiers de #72.)

## Livre

- **[NEW]** `infrastructure/adapters/email/PasswordResetEmailTemplate.java` — enum
  catalogue fr/en/es/de (sujet + corps HTML). `resolve()` est **total** : null, vide,
  casse differente, sous-tag regional (`de_AT`) et locale inconnue retombent sur FR.
  Zero I/O, zero exception — c'est ce qui tient BR-AUT-012.
- **[PORT]** `EmailService.sendPasswordResetEmail(..., String locale)` et
  `PasswordResetService.requestReset(email, locale)` — `String` neutre, le domaine
  ne recoit aucun type framework (hexagonal respecte).
- **[DTO]** `ForgotPasswordRequest.locale` optionnel, **sans aucune contrainte Bean
  Validation**. Choix deliberé et correct : un `@Size` aurait transforme une locale
  absurde en `400`, or BR-AUT-012 interdit tout ecart de code de reponse sur cet
  endpoint.
- **[INFRA]** `BrevoEmailService` : sujet + corps tires du catalogue ;
  `HtmlUtils.htmlEscape` applique AVANT rendu, donc identique dans les 4 langues
  (prouve par test — la protection XSS n'a pas ete perdue en route).
- **[FRONT]** `authService.forgotPassword(email, locale?)` : locale de la route,
  filtree par `isSupportedLocale`, omise si non supportee. La page passe la `locale`
  deja en scope via `use(params)` — aucun mecanisme nouveau invente.

## Correction d'etiquette de regle metier

La javadoc attribuait l'anti-enumeration de forgot-password a **BR-AUT-005**, qui est
en realite « echec d'authentification -> 401 ». La bonne regle est **BR-AUT-012**.
Etiquettes corrigees dans les 6 fichiers touches, avec note « ne pas reintroduire ».
Le lead avait lui-meme recopie cette erreur depuis le code dans le premier briefing,
et l'a corrigee avant le spawn.

## Tests

- Backend : **561/561 OK** (`./scripts/test-quiet.sh backend`), dont **47 nouveaux** —
  `PasswordResetEmailTemplateTest` (28), `BrevoEmailServiceLocaleTest` (18, payload
  reel intercepte via `MockRestServiceServer`), +1 dans `PasswordResetServiceImplTest`.
- Frontend : 1168/1168 OK.

## Piege rencontre

La 1re version de `BrevoEmailServiceLocaleTest` assertait sur le body JSON brut →
faux rouge : `to.name` porte volontairement le nom **non echappe** (ce n'est pas du
HTML, Brevo le serialise). Assertions recentrees sur le champ `htmlContent` parse.

## Ce qui n'a PAS ete verifie

- **Aucun E2E lance.**
- **Aucun envoi Brevo reel** : `BREVO_API_KEY` absente, le chemin est NO-OP. Les
  4 rendus n'ont donc **jamais ete vus dans un client mail**.
- **Traductions es/de non relues par un locuteur** — redigees d'apres
  `public/locales/*` (vouvoiement DE conserve).

## Signaux memoire

- `[MEMORY:pitfall]` — Une reference « BR-XX » dans un commentaire n'est pas une
  preuve. Ici 6 fichiers propageaient BR-AUT-005 pour une regle qui est BR-AUT-012.
  Verifier dans `br-auth.md` avant de la reprendre.
- `[MEMORY:decision]` — Aucune locale utilisateur en base (`User` sans champ,
  `LanguageSelector` purement URL) : la locale est portee par le DTO, repli `fr` cote
  adapter. Pas de migration ; l'endpoint est non authentifie, donc la route du client
  est la seule source de langue fiable.

## Recommandations suite

- `RECOMMAND_FOLLOWUP` : la duree « 15 minutes » est codee en dur dans les 4 templates
  alors que `app.password-reset.token-validity-minutes` est configurable — divergence
  silencieuse si la propriete change. [XS | auth]
- `RECOMMAND_FOLLOWUP` : faire relire les traductions es/de par un locuteur, et voir
  au moins un rendu reel dans un client mail. [XS | auth]
- Signale par cet agent et **confirme par le lead** : `i18n-intl-classes.test.ts:65`
  cassait `tsc --noEmit` (TS2322), introduit par `afd164c` (#72). Corrige par le lead
  en `72d75f3`. Le rapport de #72 affirmait « tsc 0 erreur » — c'etait faux.

STATUS: COMPLETED
