[BRIEFING ISSUE #142]

## Garde-fou repertoire (LIRE EN PREMIER)
Tu travailles dans un WORKTREE. Avant toute action :
  cd /Users/herrh/VSProjects/MyTimeline/.claude/worktrees/sprint-69-d576fe
Verifie : `git rev-parse --show-toplevel` doit rendre ce chemin exact, et
`git branch --show-current` doit rendre `claude/sprint-start-72-320b8d`.
Si ce n'est pas le cas, STOP et remonte l'ecart. Ne travaille JAMAIS dans
/Users/herrh/VSProjects/MyTimeline (repo principal).

## Issue
[FEATURE] i18n du template email de reset (EN/DE/ES)

L'application supporte fr/en/es/de, mais l'email de reinitialisation de mot de passe
est toujours redige en francais.

A faire : une abstraction de locale pour l'envoi d'email + le template de
reinitialisation traduit en EN/DE/ES en plus du FR existant.

Criteres d'acceptation de l'issue :
- Le service d'envoi determine la langue et selectionne le bon template
- Templates traduits disponibles en fr/en/de/es
- Test verifiant la selection du bon template selon la langue

## Etat reel du code (verifie par le lead sur HEAD — ne pas le re-decouvrir)
- `BrevoEmailService.buildPayload` fige le sujet ET le corps HTML en francais.
- `EmailService.sendPasswordResetEmail(String, String, String)` n'a pas de parametre locale.
- Appelant unique en production : `PasswordResetServiceImpl.java:120`.
- **`User.java` (domain/models) n'a AUCUN champ locale. Aucune colonne DB. Le
  `LanguageSelector` frontend est purement URL (`/de/...`), il ne persiste RIEN
  cote serveur.** Ne pars pas du principe qu'une locale utilisateur existe : elle n'existe pas.
- `POST /api/auth/forgot-password` est NON authentifie.
- `ForgotPasswordRequest` (application/dtos) ne porte aujourd'hui que `email`.
- Frontend : `frontend/src/services/authService.ts:43-44` poste `{ email }`.
- Les traductions frontend vivent dans `frontend/public/locales/<locale>/*.json`
  (fr, en, es, de) — utile comme reference de ton et de vocabulaire.

## Decision d'architecture DEJA PRISE par le dev (ne pas rouvrir)
La locale transite par le DTO : `ForgotPasswordRequest` gagne un champ `locale`
**optionnel**, le frontend y met la locale courante (`useLocale()` de next-intl).
Repli sur `fr` si absent, vide, ou non supporte.
- **Ni** `Accept-Language`, **ni** migration Flyway, **ni** colonne `users.locale`.
- Locales supportees : `fr`, `en`, `es`, `de` (cf. `frontend/src/i18n/locales.ts`).

## Plan d'implementation
1. `ForgotPasswordRequest` : champ `locale` optionnel (pas de `@NotBlank`).
2. Port `EmailService` : ajouter la locale a la signature. Mets a jour la javadoc,
   qui affirme aujourd'hui « template FR ».
3. `BrevoEmailService` : sortir sujet + corps des 4 langues d'un catalogue, avec
   resolution defensive (null / vide / inconnue -> fr). L'echappement HTML du nom et
   du lien (`HtmlUtils.htmlEscape`) doit etre conserve dans les 4 langues — c'est
   une protection XSS existante, pas un detail de mise en forme.
4. `PasswordResetServiceImpl` : passer la locale recue jusqu'au port.
5. Frontend `authService.ts` : envoyer la locale. Regarde comment les autres appels
   du fichier recuperent la locale avant d'inventer un mecanisme.
6. Tests unitaires : selection du bon sujet/corps pour chacune des 4 locales,
   + repli sur `fr` pour null / `""` / `"zz"`.

## Contrainte metier non negociable
BR-AUT-005 : `POST /api/auth/forgot-password` repond **200 quoi qu'il arrive**
(anti-enumeration de comptes). Aucune locale — meme absurde — ne doit lever une
exception ni changer le code de reponse ou le timing. Verifie que les tests existants
`PasswordResetServiceImplTest` et `ForgotPasswordAsyncTest` restent verts.

## Triage
Taille: S
Modele: opus
Effort: high
