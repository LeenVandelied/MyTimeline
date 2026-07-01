import { z } from 'zod'

/**
 * #53 — Source unique des schémas Zod auth (Login / Register / ForgotPassword /
 * ResetPassword). Avant : schémas inline dupliqués dans chaque page (fragile),
 * `RegisterData` sans validation client (anti-pattern A12). On centralise ici.
 *
 * Deux familles d'API :
 *  - Schémas « bruts » sans message (`*Schema`) : utilisés côté service pour
 *    parser/valider un payload (cf. `authService.login`), messages non affichés.
 *  - Factories i18n (`create*Schema(t)`) : utilisées dans les formulaires RHF où
 *    les messages d'erreur doivent être traduits (next-intl `useTranslations()`).
 *
 * Contraintes alignées BR-AUT-003 (br-auth) : username 3..20, email valide,
 * password ≥ 6. Les DTOs backend sont `{username,password}` (login),
 * `{name,username,email,password}` (register), `{email}` (forgot),
 * `{token,newPassword}` (reset, contrat #49).
 */

/** Fonction de traduction next-intl (`useTranslations()` racine). */
type Translate = (key: string) => string

/* ---------------------------------------------------------------------------
   Login (BR-AUT-004)
   --------------------------------------------------------------------------- */

export const LoginSchema = z.object({
  username: z.string().min(3),
  password: z.string().min(6),
})

export type LoginData = z.infer<typeof LoginSchema>

export const createLoginSchema = (t: Translate) =>
  z.object({
    username: z.string().min(3, { message: t('validation.username.min') }),
    password: z.string().min(6, { message: t('validation.password.min') }),
  })

export type LoginFormValues = z.infer<ReturnType<typeof createLoginSchema>>

/* ---------------------------------------------------------------------------
   Register (BR-AUT-003) — username 3..20, email valide, password ≥ 6.
   `name` ≠ `username` : champs distincts (cf. fix #40 / A11).
   --------------------------------------------------------------------------- */

export const RegisterSchema = z.object({
  name: z.string().min(3).max(20),
  username: z.string().min(3).max(20),
  email: z.string().email(),
  password: z.string().min(6),
})

export type RegisterData = z.infer<typeof RegisterSchema>

/**
 * Variante formulaire : ajoute `confirmPassword` (UX, non envoyé au backend) +
 * contraintes de complexité (majuscule/chiffre) déjà présentes dans l'UI.
 */
export const createRegisterFormSchema = (t: Translate) =>
  z
    .object({
      name: z
        .string()
        .min(3, { message: t('validation.name.min') })
        .max(20, { message: t('validation.name.max') }),
      username: z
        .string()
        .min(3, { message: t('validation.username.min') })
        .max(20, { message: t('validation.username.max') }),
      email: z.string().email({ message: t('validation.email.invalid') }),
      password: z
        .string()
        .min(6, { message: t('validation.password.min') })
        .regex(/[A-Z]/, { message: t('validation.password.uppercase') })
        .regex(/[0-9]/, { message: t('validation.password.number') }),
      confirmPassword: z.string(),
    })
    .refine((data) => data.password === data.confirmPassword, {
      message: t('validation.password.match'),
      path: ['confirmPassword'],
    })

export type RegisterFormValues = z.infer<ReturnType<typeof createRegisterFormSchema>>

/* ---------------------------------------------------------------------------
   Forgot password (contrat #49) — body {email}.
   --------------------------------------------------------------------------- */

export const ForgotPasswordSchema = z.object({
  email: z.string().email(),
})

export type ForgotPasswordData = z.infer<typeof ForgotPasswordSchema>

export const createForgotPasswordSchema = (t: Translate) =>
  z.object({
    email: z.string().email({ message: t('validation.email.invalid') }),
  })

/* ---------------------------------------------------------------------------
   Reset password (contrat #49) — body {token, newPassword}. Le `token` vient du
   lien email (query param) ; le formulaire ne saisit que le mot de passe.
   --------------------------------------------------------------------------- */

export const ResetPasswordSchema = z.object({
  token: z.string().min(1),
  newPassword: z.string().min(6),
})

export type ResetPasswordData = z.infer<typeof ResetPasswordSchema>

/** Schéma formulaire : `newPassword` + confirmation (le token est hors formulaire). */
export const createResetPasswordFormSchema = (t: Translate) =>
  z
    .object({
      newPassword: z
        .string()
        .min(6, { message: t('validation.password.min') })
        .regex(/[A-Z]/, { message: t('validation.password.uppercase') })
        .regex(/[0-9]/, { message: t('validation.password.number') }),
      confirmPassword: z.string(),
    })
    .refine((data) => data.newPassword === data.confirmPassword, {
      message: t('validation.password.match'),
      path: ['confirmPassword'],
    })

export type ResetPasswordFormValues = z.infer<ReturnType<typeof createResetPasswordFormSchema>>
