import { describe, expect, it } from 'vitest'

import {
  PASSWORD_POLICY,
  RegisterSchema,
  ResetPasswordSchema,
  createLoginSchema,
  createRegisterFormSchema,
  createResetPasswordFormSchema,
} from '@/lib/schemas/auth'
import { createChangePasswordSchema } from '@/lib/schemas/settings'

/**
 * #148 — Politique de mot de passe UNIQUE (BR-AUT-003).
 *
 * Pendant frontend de `PasswordPolicyTest` côté backend. Le point central n'est
 * pas « le schéma rejette les mots de passe faibles » mais « les trois schémas
 * de création/modification tranchent IDENTIQUEMENT », et « le login ne les
 * applique pas » — la divergence était le bug d'origine.
 */

/** `t` d'identité : l'assertion porte sur la CLÉ i18n, pas sur sa traduction. */
const t = (key: string) => key

/** Hors politique : trop court, sans majuscule, sans chiffre, et l'ancien min 6. */
const OUT_OF_POLICY = ['Ab1', 'Secret1', 'secret60', 'SecretAbc', 'abcdef']
const COMPLIANT = ['Secret60', 'MotDePasse2026', 'Abcdefg1']

const registerForm = createRegisterFormSchema(t)
const resetForm = createResetPasswordFormSchema(t)
const changeForm = createChangePasswordSchema(t)

const registerAccepts = (password: string) =>
  registerForm.safeParse({
    name: 'Valid Name',
    username: 'validUser',
    email: 'valid@example.com',
    password,
    confirmPassword: password,
  }).success

const resetAccepts = (newPassword: string) =>
  resetForm.safeParse({ newPassword, confirmPassword: newPassword }).success

const changeAccepts = (newPassword: string) =>
  changeForm.safeParse({
    oldPassword: 'anythingLegacy',
    newPassword,
    confirmPassword: newPassword,
  }).success

describe('Politique de mot de passe (BR-AUT-003, #148)', () => {
  it('expose exactement la règle du backend (StrongPasswordValidator)', () => {
    expect(PASSWORD_POLICY.minLength).toBe(8)
    expect(PASSWORD_POLICY.maxLength).toBe(100)
  })

  describe.each(OUT_OF_POLICY)('mot de passe hors politique : %s', (password) => {
    it('est refusé à l’inscription', () => expect(registerAccepts(password)).toBe(false))
    it('est refusé à la réinitialisation', () => expect(resetAccepts(password)).toBe(false))
    it('est refusé au changement', () => expect(changeAccepts(password)).toBe(false))
  })

  describe.each(COMPLIANT)('mot de passe conforme : %s', (password) => {
    it('est accepté à l’inscription', () => expect(registerAccepts(password)).toBe(true))
    it('est accepté à la réinitialisation', () => expect(resetAccepts(password)).toBe(true))
    it('est accepté au changement', () => expect(changeAccepts(password)).toBe(true))
  })

  it.each([...OUT_OF_POLICY, ...COMPLIANT])(
    'register, reset et change-password tranchent identiquement (%s)',
    (password) => {
      const verdict = registerAccepts(password)
      expect(resetAccepts(password)).toBe(verdict)
      expect(changeAccepts(password)).toBe(verdict)
    },
  )

  it('rejette un mot de passe plus long que ce que le login accepte', () => {
    const tooLong = `A1${'a'.repeat(PASSWORD_POLICY.maxLength)}`
    expect(registerAccepts(tooLong)).toBe(false)
    expect(resetAccepts(tooLong)).toBe(false)
    expect(changeAccepts(tooLong)).toBe(false)
  })

  it('signale la règle via les clés i18n attendues', () => {
    const issues = registerForm.safeParse({
      name: 'Valid Name',
      username: 'validUser',
      email: 'valid@example.com',
      password: 'abcdef',
      confirmPassword: 'abcdef',
    })
    expect(issues.success).toBe(false)
    const keys = issues.success ? [] : issues.error.issues.map((i) => i.message)
    expect(keys).toContain('validation.password.min')
    expect(keys).toContain('validation.password.uppercase')
    expect(keys).toContain('validation.password.number')
  })

  describe('le login n’applique PAS la politique', () => {
    const loginForm = createLoginSchema(t)

    it.each(['abcdef', 'secret', 'Secret1'])(
      'accepte le mot de passe historique %s (comptes antérieurs à #148)',
      (password) => {
        expect(loginForm.safeParse({ username: 'legacyUser', password }).success).toBe(true)
      },
    )

    it('annonce 6 caractères, pas 8, via une clé de message dédiée', () => {
      const res = loginForm.safeParse({ username: 'legacyUser', password: 'abc' })
      expect(res.success).toBe(false)
      const keys = res.success ? [] : res.error.issues.map((i) => i.message)
      expect(keys).toContain('validation.password.loginMin')
      expect(keys).not.toContain('validation.password.min')
    })
  })

  describe('schémas bruts de contrat (parsing service)', () => {
    it.each(OUT_OF_POLICY)('RegisterSchema refuse %s', (password) => {
      expect(
        RegisterSchema.safeParse({
          name: 'Valid Name',
          username: 'validUser',
          email: 'valid@example.com',
          password,
        }).success,
      ).toBe(false)
    })

    it.each(OUT_OF_POLICY)('ResetPasswordSchema refuse %s', (newPassword) => {
      expect(ResetPasswordSchema.safeParse({ token: 'tok', newPassword }).success).toBe(false)
    })
  })
})
