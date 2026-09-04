import { z } from 'zod'

import { PASSWORD_POLICY } from '@/lib/schemas/auth'

/**
 * #86 — Schémas Zod des formulaires Réglages. Factories i18n (`create*Schema(t)`)
 * pour messages traduits (next-intl), alignées sur les DTO backend :
 *  - Profil  -> `UserUpdateRequest` : name 3..20, username 3..20, email valide.
 *  - Password -> `ChangePasswordRequest` : oldPassword requis, newPassword conforme
 *    à la politique (cf. ci-dessous).
 *  - Delete  -> `DeleteAccountRequest` : username (re-saisie de confirmation).
 *
 * ⚠ POLITIQUE DE MOT DE PASSE — SOURCE UNIQUE (#148, BR-AUT-003 amendée).
 * Le backend porte la règle via l'annotation `@StrongPassword`
 * (`application/validation/StrongPassword.java`) sur `ChangePasswordRequest.newPassword` :
 * **8..100 caractères + au moins une majuscule + au moins un chiffre**. Le frontend la
 * RÉPLIQUE via `PASSWORD_POLICY` (`schemas/auth.ts`), il ne la redéfinit pas.
 * NE PAS « simplifier » ce schéma vers `min(6)` : l'ancien commentaire disait
 * « le backend exige >= 6 SANS règle majuscule/chiffre » — c'est FAUX depuis #148, et
 * y revenir réintroduirait exactement la divergence multi-politique que #148 a supprimée
 * (le formulaire accepterait un mot de passe que le backend rejette en 400).
 * Le LOGIN reste hors politique (`AuthRequest` : `@NotBlank` + `@Size(max=100)` seulement),
 * pour qu'un compte antérieur à 6 caractères puisse encore se connecter ET se mettre en
 * conformité. Changer la règle = changer `StrongPasswordValidator` + `PASSWORD_POLICY`.
 *
 * ⚠ Convention (cf. `schemas/auth.ts`) : `t` est le traducteur RACINE
 * (`useTranslations()` sans namespace). Les clés sont donc préfixées par leur
 * namespace (`validation.*`, `settings.*`). NE PAS passer un traducteur scopé.
 */

type Translate = (key: string) => string

/* ---------------------------------------------------------------------------
   Profil (PATCH /api/me) — name/username 3..20, email valide.
   --------------------------------------------------------------------------- */

export const createProfileSchema = (t: Translate) =>
  z.object({
    name: z
      .string()
      .min(3, { message: t('validation.name.min') })
      .max(20, { message: t('validation.name.max') }),
    username: z
      .string()
      .min(3, { message: t('validation.username.min') })
      .max(20, { message: t('validation.username.max') }),
    email: z.string().email({ message: t('validation.email.invalid') }),
  })

export type ProfileFormValues = z.infer<ReturnType<typeof createProfileSchema>>

/* ---------------------------------------------------------------------------
   Changement de mot de passe (POST /api/me/change-password).
   `confirmPassword` : UX only (non envoyé). Interdit un nouveau == ancien
   (inutile + signal d'erreur de saisie fréquent).

   #148 — `newPassword` suit la politique UNIQUE `PASSWORD_POLICY` (BR-AUT-003),
   la même que register et reset, et que `@StrongPassword` côté backend.
   `oldPassword` n'est PAS contraint : c'est un mot de passe EXISTANT, qui peut
   dater d'avant le durcissement — le contraindre empêcherait justement un compte
   historique de se mettre en conformité.
   --------------------------------------------------------------------------- */

export const createChangePasswordSchema = (t: Translate) =>
  z
    .object({
      oldPassword: z.string().min(1, { message: t('validation.password.required') }),
      newPassword: z
        .string()
        .min(PASSWORD_POLICY.minLength, { message: t('validation.password.min') })
        .max(PASSWORD_POLICY.maxLength, { message: t('validation.password.max') })
        .regex(PASSWORD_POLICY.uppercase, { message: t('validation.password.uppercase') })
        .regex(PASSWORD_POLICY.digit, { message: t('validation.password.number') }),
      confirmPassword: z.string(),
    })
    .refine((data) => data.newPassword === data.confirmPassword, {
      message: t('validation.password.match'),
      path: ['confirmPassword'],
    })
    .refine((data) => data.newPassword !== data.oldPassword, {
      message: t('validation.password.same'),
      path: ['newPassword'],
    })

export type ChangePasswordFormValues = z.infer<ReturnType<typeof createChangePasswordSchema>>

/* ---------------------------------------------------------------------------
   Suppression de compte (DELETE /api/me) — re-saisie du username exact.
   Le schéma exige que la valeur saisie corresponde au username courant : la
   factory reçoit `expectedUsername` pour valider côté client AVANT l'appel
   (double-sécurité UX ; l'identité réelle reste dérivée du JWT côté backend).
   --------------------------------------------------------------------------- */

export const createDeleteAccountSchema = (t: Translate, expectedUsername: string) =>
  z.object({
    confirmUsername: z.string().refine((value) => value === expectedUsername, {
      message: t('settings.account.delete.mismatch'),
    }),
  })

export type DeleteAccountFormValues = z.infer<ReturnType<typeof createDeleteAccountSchema>>
