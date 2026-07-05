import { z } from 'zod'

/**
 * #86 — Schémas Zod des formulaires Réglages. Factories i18n (`create*Schema(t)`)
 * pour messages traduits (next-intl), alignées sur les DTO backend :
 *  - Profil  -> `UserUpdateRequest` : name 3..20, username 3..20, email valide.
 *  - Password -> `ChangePasswordRequest` : oldPassword requis, newPassword >= 6.
 *  - Delete  -> `DeleteAccountRequest` : username (re-saisie de confirmation).
 *
 * ⚠ Ne PAS surcontraindre le contrat backend (pit-auth) : le backend exige
 * newPassword >= 6 SANS règle majuscule/chiffre. On garde >= 6 ici pour ne pas
 * empêcher un compte existant (mot de passe `abcdef`) de le changer.
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
   --------------------------------------------------------------------------- */

export const createChangePasswordSchema = (t: Translate) =>
  z
    .object({
      oldPassword: z.string().min(1, { message: t('validation.password.required') }),
      newPassword: z.string().min(6, { message: t('validation.password.min') }),
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
