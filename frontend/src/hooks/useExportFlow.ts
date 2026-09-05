'use client'

import { useCallback, useEffect, useState } from 'react'
import { useMutation, useQuery } from '@tanstack/react-query'
import { queryKeys } from '@/lib/query-keys'
import {
  downloadAsyncExport,
  exportInline,
  getExportJob,
  submitAsyncExport,
  triggerBrowserDownload,
} from '@/services/exportService'
import {
  isSyncFormat,
  type ExportFormat,
  type ExportJobResponse,
} from '@/lib/schemas/export'

/**
 * #59 — Machine à états du flux d'export RGPD en 3 étapes, alignée sur le contrat
 * backend figé #58. Découplée de la présentation (`ExportDataFlow`) pour la
 * testabilité et la réutilisation mobile/desktop.
 *
 * Étapes ⇄ phases :
 *  - `confirm`   (étape 1) : choix du format + explication.
 *  - `preparing` (étape 2) : formats async uniquement — POST + polling du job.
 *    Les formats SYNC (JSON/MARKDOWN) sautent cette étape (téléchargement direct).
 *  - `ready`     (étape 3) : sync = fichier déjà téléchargé ; async = lien + expiration.
 *  - `error`     : erreur réseau OU job `FAILED`.
 *
 * Polling : `refetchInterval` TanStack Query v5 (4 s, borne 3-5 s de l'AC), qui
 * s'arrête de lui-même sur un statut terminal (`COMPLETED`/`FAILED`).
 */

export type ExportPhase = 'confirm' | 'preparing' | 'ready' | 'error'

/** Clé i18n de l'erreur courante (namespace `export.errors.*`). */
export type ExportErrorKey = 'network' | 'jobFailed'

const POLL_INTERVAL_MS = 4000

export interface UseExportFlowResult {
  format: ExportFormat
  setFormat: (format: ExportFormat) => void
  phase: ExportPhase
  /** Statut du job async courant (pour l'affichage de progression), si applicable. */
  jobStatus: ExportJobResponse['status'] | null
  /** Job terminé (async COMPLETED) : porte `downloadUrl` + `expiresAt`. */
  completedJob: ExportJobResponse | null
  /** Clé i18n d'erreur si `phase === 'error'`. */
  errorKey: ExportErrorKey | null
  /** Une requête (sync GET / async POST / download) est en cours. */
  isBusy: boolean
  /** Démarre l'export pour le format courant (étape 1 → 2/3). */
  start: () => void
  /** Télécharge le fichier d'un job async terminé (étape 3). */
  downloadCompleted: () => void
  /** Revient à l'étape 1 (relance / après erreur / lien expiré). */
  reset: () => void
}

export function useExportFlow(): UseExportFlowResult {
  const [format, setFormat] = useState<ExportFormat>('JSON')
  const [phase, setPhase] = useState<ExportPhase>('confirm')
  const [jobId, setJobId] = useState<string | null>(null)
  const [completedJob, setCompletedJob] = useState<ExportJobResponse | null>(null)
  const [errorKey, setErrorKey] = useState<ExportErrorKey | null>(null)

  /* --- Sync (JSON/MARKDOWN) : GET blob + téléchargement direct --------------- */
  const inlineMutation = useMutation({
    mutationFn: (f: ExportFormat) => exportInline(f),
    onSuccess: (file) => {
      triggerBrowserDownload(file)
      setPhase('ready')
    },
    onError: () => {
      setErrorKey('network')
      setPhase('error')
    },
  })

  /* --- Async (ZIP/CSV) : POST → job → polling ------------------------------- */
  const submitMutation = useMutation({
    mutationFn: (f: ExportFormat) => submitAsyncExport(f),
    onSuccess: (job) => {
      // Job potentiellement déjà terminé au retour (peu probable) : géré par l'effet.
      setJobId(job.jobId)
      setPhase('preparing')
    },
    onError: () => {
      setErrorKey('network')
      setPhase('error')
    },
  })

  const jobQuery = useQuery({
    queryKey: queryKeys.export.job(jobId ?? ''),
    queryFn: () => getExportJob(jobId as string),
    enabled: Boolean(jobId) && phase === 'preparing',
    // Arrêt automatique du polling sur statut terminal.
    refetchInterval: (query) => {
      const status = query.state.data?.status
      return status === 'COMPLETED' || status === 'FAILED' ? false : POLL_INTERVAL_MS
    },
  })

  // Transitions à partir du résultat du polling.
  useEffect(() => {
    if (phase !== 'preparing') return
    const data = jobQuery.data
    if (data?.status === 'COMPLETED') {
      setCompletedJob(data)
      setPhase('ready')
    } else if (data?.status === 'FAILED') {
      setErrorKey('jobFailed')
      setPhase('error')
    }
  }, [jobQuery.data, phase])

  // Erreur réseau pendant le polling (ex. 404 job introuvable).
  useEffect(() => {
    if (phase === 'preparing' && jobQuery.isError) {
      setErrorKey('network')
      setPhase('error')
    }
  }, [jobQuery.isError, phase])

  /* --- Téléchargement du fichier async terminé (étape 3) -------------------- */
  const downloadMutation = useMutation({
    mutationFn: (downloadUrl: string) => downloadAsyncExport(downloadUrl),
    onSuccess: (file) => triggerBrowserDownload(file),
    onError: () => {
      // Token expiré/altéré (24h) ou réseau : on bascule en erreur pour proposer
      // une relance (nouvelle demande).
      setErrorKey('network')
      setPhase('error')
    },
  })

  const start = useCallback(() => {
    setErrorKey(null)
    setCompletedJob(null)
    setJobId(null)
    if (isSyncFormat(format)) {
      inlineMutation.mutate(format)
    } else {
      submitMutation.mutate(format)
    }
  }, [format, inlineMutation, submitMutation])

  const downloadCompleted = useCallback(() => {
    if (completedJob?.downloadUrl) {
      downloadMutation.mutate(completedJob.downloadUrl)
    }
  }, [completedJob, downloadMutation])

  const reset = useCallback(() => {
    setPhase('confirm')
    setJobId(null)
    setCompletedJob(null)
    setErrorKey(null)
  }, [])

  return {
    format,
    setFormat,
    phase,
    jobStatus: phase === 'preparing' ? (jobQuery.data?.status ?? 'PENDING') : null,
    completedJob,
    errorKey,
    isBusy:
      inlineMutation.isPending || submitMutation.isPending || downloadMutation.isPending,
    start,
    downloadCompleted,
    reset,
  }
}
