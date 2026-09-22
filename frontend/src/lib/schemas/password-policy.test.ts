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
import { levelFromPassword, meetsPolicy } from '@/components/settings/PasswordStrength'

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

  /**
   * #735 — Sémantique Unicode du validateur serveur, répliquée char par char.
   *
   * `StrongPasswordValidator` teste `Character.isUpperCase(char)` (Lu +
   * Other_Uppercase) et `Character.isDigit(char)` (Nd) sur chaque unité UTF-16.
   * Chaque cas ci-dessous a été vérifié contre le JDK 21 (jshell). Les deux
   * sens comptent : « accepté serveur ⇒ accepté ici » (sinon on bloque la
   * saisie) ET « refusé serveur ⇒ refusé ici » (sinon invariant #508 rompu).
   */
  describe('alignement Unicode avec le serveur (#735)', () => {
    /** Oméga majuscule + chiffre arabe-indic : le serveur ACCEPTE. */
    const UNICODE_ACCEPTED = '\u03A9abcdefg\u0661'

    it('Ωabcdefg١ est accepté par les trois schémas de formulaire', () => {
      expect(registerAccepts(UNICODE_ACCEPTED)).toBe(true)
      expect(resetAccepts(UNICODE_ACCEPTED)).toBe(true)
      expect(changeAccepts(UNICODE_ACCEPTED)).toBe(true)
    })

    it('Ωabcdefg١ est accepté par les schémas bruts de contrat', () => {
      expect(
        RegisterSchema.safeParse({
          name: 'Valid Name',
          username: 'validUser',
          email: 'valid@example.com',
          password: UNICODE_ACCEPTED,
        }).success,
      ).toBe(true)
      expect(
        ResetPasswordSchema.safeParse({ token: 'tok', newPassword: UNICODE_ACCEPTED }).success,
      ).toBe(true)
    })

    it('meetsPolicy suit (dérivé de PASSWORD_POLICY) et l’indicateur ne le dit pas faible', () => {
      expect(meetsPolicy(UNICODE_ACCEPTED)).toBe(true)
      expect(levelFromPassword(UNICODE_ACCEPTED)).not.toBe('weak')
    })

    // Other_Uppercase : majuscule pour Java, mais PAS de catégorie Lu.
    it.each([
      ['Ⓐ (U+24B6, lettre encerclée)', '\u24B6bcdefg1'],
      ['Ⅰ (U+2160, chiffre romain)', '\u2160bcdefg1'],
    ])('%s compte comme majuscule, comme côté serveur', (_label, password) => {
      expect(meetsPolicy(password)).toBe(true)
      expect(resetAccepts(password)).toBe(true)
    })

    // Refusés par le serveur : ils ne doivent JAMAIS passer ici.
    it.each([
      // Hors BMP : paire de substitution, aucune moitié n'est majuscule/chiffre en Java.
      ['𝐀 (U+1D400) seule majuscule', '\u{1D400}bcdefg1'],
      ['𝟎 (U+1D7CE) seul chiffre', 'Abcdefg\u{1D7CE}'],
      // Titlecase (Lt) : Character.isUpperCase('ǅ') = false.
      ['ǅ (U+01C5, titlecase) seule « majuscule »', '\u01C5bcdefg1'],
      // Exposant : catégorie No, pas Nd → Character.isDigit('²') = false.
      ['² (U+00B2, exposant) seul « chiffre »', 'Abcdefg\u00B2'],
    ])('%s : refusé partout, et affiché faible (invariant #508)', (_label, password) => {
      expect(meetsPolicy(password)).toBe(false)
      expect(levelFromPassword(password)).toBe('weak')
      expect(registerAccepts(password)).toBe(false)
      expect(resetAccepts(password)).toBe(false)
      expect(changeAccepts(password)).toBe(false)
      expect(ResetPasswordSchema.safeParse({ token: 'tok', newPassword: password }).success).toBe(
        false,
      )
    })
  })
})
