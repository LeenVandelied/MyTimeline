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
 * et une POLITIQUE DE MOT DE PASSE UNIQUE (#148) — voir `PASSWORD_POLICY`
 * ci-dessous. Les DTOs backend sont `{username,password}` (login),
 * `{name,username,email,password}` (register), `{email}` (forgot),
 * `{token,newPassword}` (reset, contrat #49).
 */

/** Fonction de traduction next-intl (`useTranslations()` racine). */
type Translate = (key: string) => string

/* ---------------------------------------------------------------------------
   Politique de mot de passe (BR-AUT-003) — #148
   --------------------------------------------------------------------------- */

/**
 * #148 — Réplique EXACTE de la politique serveur : `@StrongPassword`
 * (`backend/.../application/validation/StrongPasswordValidator.java`).
 * Le backend est la source de vérité ; ces valeurs n'existent ici que pour
 * afficher l'erreur avant l'aller-retour réseau. Toute divergence recrée le bug
 * d'origine (un mot de passe accepté à un endroit, refusé à un autre).
 */
export const PASSWORD_POLICY = {
  minLength: 8,
  maxLength: 100,
  uppercase: /[A-Z]/,
  digit: /[0-9]/,
} as const

/**
 * Applique la politique à un champ mot de passe. Utilisé par TOUS les
 * formulaires de création/modification (register, reset, change-password) —
 * jamais par le login, cf. `createLoginSchema`.
 */
const passwordField = (t: Translate) =>
  z
    .string()
    .min(PASSWORD_POLICY.minLength, { message: t('validation.password.min') })
    .max(PASSWORD_POLICY.maxLength, { message: t('validation.password.max') })
    .regex(PASSWORD_POLICY.uppercase, { message: t('validation.password.uppercase') })
    .regex(PASSWORD_POLICY.digit, { message: t('validation.password.number') })

/** Variante sans i18n, pour les schémas « bruts » de contrat (parsing service). */
const rawPasswordField = () =>
  z
    .string()
    .min(PASSWORD_POLICY.minLength)
    .max(PASSWORD_POLICY.maxLength)
    .regex(PASSWORD_POLICY.uppercase)
    .regex(PASSWORD_POLICY.digit)

/* ---------------------------------------------------------------------------
   Login (BR-AUT-004) — DÉLIBÉRÉMENT HORS de la politique #148.
   Un compte créé avant le durcissement a un mot de passe à 6 caractères : le
   contraindre ici le verrouillerait AVANT même l'appel réseau. Le backend est
   cohérent (`AuthRequest` ne porte ni min ni règle de complexité). D'où la clé
   de message dédiée `validation.password.loginMin` : le formulaire de login ne
   doit pas annoncer « 8 caractères » alors qu'il en accepte 6.
   --------------------------------------------------------------------------- */

export const LoginSchema = z.object({
  username: z.string().min(3),
  password: z.string().min(6),
})

export type LoginData = z.infer<typeof LoginSchema>

export const createLoginSchema = (t: Translate) =>
  z.object({
    username: z.string().min(3, { message: t('validation.username.min') }),
    password: z.string().min(6, { message: t('validation.password.loginMin') }),
  })

export type LoginFormValues = z.infer<ReturnType<typeof createLoginSchema>>

/* ---------------------------------------------------------------------------
   Register (BR-AUT-003) — username 3..20, email valide, mot de passe conforme
   à `PASSWORD_POLICY` (#148 : ≥ 8, une majuscule, un chiffre).
   `name` ≠ `username` : champs distincts (cf. fix #40 / A11).
   --------------------------------------------------------------------------- */

export const RegisterSchema = z.object({
  name: z.string().min(3).max(20),
  username: z.string().min(3).max(20),
  email: z.string().email(),
  password: rawPasswordField(),
})

export type RegisterData = z.infer<typeof RegisterSchema>

/**
 * Variante formulaire : ajoute `confirmPassword` (UX, non envoyé au backend).
 * Le mot de passe passe par `passwordField` — la MÊME règle que reset et
 * change-password, et que le backend (#148).
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
      password: passwordField(t),
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
  newPassword: rawPasswordField(),
})

export type ResetPasswordData = z.infer<typeof ResetPasswordSchema>

/**
 * Schéma formulaire : `newPassword` + confirmation (le token est hors formulaire).
 * #148 — alignement sur la politique UNIQUE : register, reset et change-password
 * appliquent désormais `passwordField`, et le backend (`@StrongPassword` sur
 * `RegisterRequest` / `ResetPasswordRequest` / `ChangePasswordRequest`) tranche
 * à l'identique. Le client ne surcontraint donc plus le contrat backend — il le
 * réplique. Un compte historique en `abcdef` PEUT toujours se réinitialiser : il
 * choisit simplement un mot de passe conforme, et son login n'est pas durci.
 */
export const createResetPasswordFormSchema = (t: Translate) =>
  z
    .object({
      newPassword: passwordField(t),
      confirmPassword: z.string(),
    })
    .refine((data) => data.newPassword === data.confirmPassword, {
      message: t('validation.password.match'),
      path: ['confirmPassword'],
    })

export type ResetPasswordFormValues = z.infer<ReturnType<typeof createResetPasswordFormSchema>>
