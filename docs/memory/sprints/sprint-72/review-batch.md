# Review batch — Sprint 72

Reviewer spawne par le lead sur `origin/dev..HEAD`.
**Verdict : 0 CRITIQUE, 0 MAJEUR, 3 MINEURS.**

## Points verifies sains (les 5 mis en priorite par le lead)

- **BR-AUT-012** — `PasswordResetEmailTemplate.resolve()` est total : null, blanc,
  espaces, casse, sous-tag regional (`de_AT`, `es-419`), inconnu (`zz`) et chaine
  bruitee (`fr;DROP`) retombent tous sur FR. Aucun `throw`, aucune I/O.
- **XSS** — `HtmlUtils.htmlEscape` applique une seule fois, AVANT le rendu, sur le
  meme chemin pour les 4 langues. Les arguments de `String.format` ne sont pas
  reinterpretes comme specificateurs de format.
- **Hexagonal** — le port `EmailService` prend un `String`, zero import Spring/JPA ;
  la resolution vit cote adapter.
- **Fuite PII / secret** — seul `log.error(ex.getClass().getSimpleName())` en cas
  d'echec d'envoi. Ni email, ni token, ni locale, ni cle API loggés.
- **Filtrage client** — `authService.ts` filtre par `isSupportedLocale()` (type guard)
  avant envoi ; champ omis si non supporte. Pas de `any`, pas de `as` gratuit.

## Mineurs — traitement

### 1. Etiquettes BR-AUT-005 restantes — **CORRIGE** (`27cba3a`)
`cf49e2e` n'avait corrige qu'une partie des references alors que la javadoc laissait
entendre une correction globale. 8 occurrences corrigees.

Deux laissees volontairement, et la javadoc le dit desormais :
- `V6__create_password_reset_tokens.sql` — **migration Flyway deja appliquee**.
  Modifier son texte, meme un commentaire, change son checksum et fait echouer la
  validation au demarrage sur toute base existante. **Le reviewer n'avait pas vu ce
  piege** : appliquer sa recommandation telle quelle aurait casse le boot.
- `AuthController` (chemin login) — BR-AUT-005 y est la bonne regle.

### 2. `@Size(max=16)` sur `ForgotPasswordRequest.locale` — **NON APPLIQUE**, arbitre
Le reviewer propose une defense en profondeur contre une chaine arbitrairement longue.
Arbitrage du lead : **on garde le champ sans contrainte**.
- Le choix est deliberé et documente dans la javadoc du DTO : sur un endpoint non
  authentifie, aucune valeur d'entree ne doit produire autre chose qu'un 200.
  Ajouter `@Size` cree un nouveau chemin 400 pour un champ optionnel — risque de
  compatibilite client reel, benefice nul.
- L'argument cout CPU est faible : la valeur n'est ni loggee ni concatenee, elle sert
  de cle de lookup sur 4 tags ; la taille du corps est deja bornee par Spring, et le
  rate-limit 5/min/IP s'applique.
→ conserve comme follow-up eventuel, pas comme dette.

### 3. Selecteur `time.mt-num` (`i18n.css:153`) — **NON APPLIQUE**, follow-up
Constat exact : la regle `text-decoration:none; color:inherit` ne s'applique qu'aux
`<time>`, pas aux `<span className="mt-num">` de `KpiMarginalia` / `ProductList` /
`ProductCarousel` / `StateScreen`. Sans effet en pratique (un `span` n'a aucun style
natif a neutraliser), mais le test valide la presence de la declaration sur la classe
sans verifier qu'elle atteint les `span`.
`i18n.css` est un fichier du Design System, explicitement hors perimetre du briefing
de #72. → follow-up.

## Non verifie par le reviewer

Suites completes (il n'a rejoue que les tests touches par le diff — le lead a mesure
561/561 et 1168/1168 de son cote) ; rendu reel des templates es/de dans un client
mail ; qualite linguistique es/de ; comportement Brevo reel ; E2E forgot-password.
