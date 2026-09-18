'use client'

import { useState } from 'react'
import { useForm, type UseFormReturn } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useLocale, useTranslations } from 'next-intl'
import { useRouter } from 'next/navigation'
import toast from 'react-hot-toast'
import { useSettings } from '@/hooks/useSettings'
import { useAuth } from '@/contexts/AuthContext'
import { createDeleteAccountSchema, type DeleteAccountFormValues } from '@/lib/schemas/settings'

export type DeleteStep = 'warn' | 'confirm'

export interface DeleteAccountFlow {
  step: DeleteStep
  username: string
  form: UseFormReturn<DeleteAccountFormValues>
  isPending: boolean
  goConfirm: () => void
  goWarn: () => void
  submit: (values: DeleteAccountFormValues) => Promise<void>
  reset: () => void
}

/**
 * #87 — Logique du flux de suppression de compte (BR-AUT-001), extraite de
 * `AccountSection` (#86) pour être partagée entre le Dialog desktop et le
 * BottomSheet mobile. Aucune duplication : le state machine (warn -> confirm),
 * le formulaire RHF+Zod (re-saisie du username) et la mutation `deleteAccount`
 * vivent ici ; la présentation (`DeleteAccountSteps`) et le conteneur
 * (Dialog / BottomSheet) sont fournis par l'appelant.
 *
 * Sur succès : le backend efface le cookie JWT (204) -> on nettoie l'état client
 * (`logout`) puis on redirige vers `/login` localisé.
 */
export function useDeleteAccountFlow(): DeleteAccountFlow {
  const t = useTranslations('settings')
  const tRoot = useTranslations()
  const { deleteAccount } = useSettings()
  const { logout, user } = useAuth()
  const router = useRouter()
  const locale = useLocale()

  const username = user?.username ?? ''
  const [step, setStep] = useState<DeleteStep>('warn')

  const form = useForm<DeleteAccountFormValues>({
    resolver: zodResolver(createDeleteAccountSchema(tRoot, username)),
    defaultValues: { confirmUsername: '' },
  })

  const submit = async (values: DeleteAccountFormValues) => {
    try {
      await deleteAccount.mutateAsync(values.confirmUsername)
      toast.success(t('account.delete.done'))
      await logout()
      router.replace(`/${locale}/login`)
    } catch {
      form.setError('confirmUsername', { message: t('common.genericError') })
    }
  }

  const reset = () => {
    setStep('warn')
    form.reset({ confirmUsername: '' })
  }

  return {
    step,
    username,
    form,
    isPending: deleteAccount.isPending,
    goConfirm: () => setStep('confirm'),
    goWarn: () => setStep('warn'),
    submit,
    reset,
  }
}

export default useDeleteAccountFlow
