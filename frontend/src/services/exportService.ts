import apiClient from './apiClient'
import { safeErrorMessage } from '@/lib/safe-error'
import {
  exportJobResponseSchema,
  type ExportFormat,
  type ExportJobResponse,
} from '@/lib/schemas/export'

/**
 * #59 — Client de l'export RGPD, aligné sur le CONTRAT BACKEND FIGÉ #58.
 * Base path backend : `/api/export`. `apiClient` (axios) porte déjà `/api` via
 * `baseURL` (cf. autres services : `/users`, `/me`) et `withCredentials` (cookie
 * JWT HttpOnly). L'identité est TOUJOURS dérivée du JWT côté backend, jamais d'un
 * paramètre.
 *
 * | GET  /export?format=JSON|MARKDOWN      | sync — fichier immédiat (blob)      |
 * | POST /export?format=ZIP|CSV            | async — 202 + ExportJobResponse     |
 * | GET  /export/job/{jobId}              | polling statut                       |
 * | GET  /export/download/{jobId}?token=… | téléchargement fichier async         |
 *
 * ⚠ Sécurité logs (cf. apiClient) : ne JAMAIS logger l'objet axios brut
 * (headers = Authorization/cookies, body = données perso). On se limite à
 * `safeErrorMessage`.
 */

/** Fichier téléchargé (blob + nom de fichier extrait du `Content-Disposition`). */
export interface DownloadedFile {
  blob: Blob
  filename: string
}

/** Nom de fichier par défaut si le header `Content-Disposition` est absent. */
const fallbackFilename = (format: ExportFormat): string => {
  const ext = format === 'MARKDOWN' ? 'md' : format.toLowerCase()
  return `mytimeline-export.${ext}`
}

/** Extrait `filename="…"` d'un header `Content-Disposition`, sinon `null`. */
const filenameFromDisposition = (disposition: unknown): string | null => {
  if (typeof disposition !== 'string') return null
  const match = disposition.match(/filename\*?=(?:UTF-8'')?"?([^";]+)"?/i)
  return match ? decodeURIComponent(match[1]) : null
}

/**
 * Export SYNCHRONE inline (JSON/MARKDOWN). `GET /export?format=…`, `responseType:
 * 'blob'`. Retourne le blob + le nom de fichier (header ou fallback). Rejette sur
 * erreur réseau/HTTP (l'appelant gère l'état d'erreur).
 */
export const exportInline = async (format: ExportFormat): Promise<DownloadedFile> => {
  try {
    const response = await apiClient.get('/export', {
      params: { format },
      responseType: 'blob',
    })
    const filename =
      filenameFromDisposition(response.headers?.['content-disposition']) ??
      fallbackFilename(format)
    return { blob: response.data as Blob, filename }
  } catch (error) {
    console.error("Erreur lors de l'export inline :", safeErrorMessage(error))
    throw error
  }
}

/**
 * Soumet un job d'export ASYNCHRONE (ZIP/CSV). `POST /export?format=…` → 202 +
 * `ExportJobResponse`. La réponse est validée par Zod (contrat figé #58).
 */
export const submitAsyncExport = async (format: ExportFormat): Promise<ExportJobResponse> => {
  try {
    const response = await apiClient.post('/export', null, { params: { format } })
    return exportJobResponseSchema.parse(response.data)
  } catch (error) {
    console.error("Erreur lors de la soumission de l'export :", safeErrorMessage(error))
    throw error
  }
}

/**
 * Statut d'un job (polling). `GET /export/job/{jobId}` → `ExportJobResponse`
 * (200) ou 404 (job inconnu/d'autrui). La réponse est validée par Zod.
 */
export const getExportJob = async (jobId: string): Promise<ExportJobResponse> => {
  try {
    const response = await apiClient.get(`/export/job/${jobId}`)
    return exportJobResponseSchema.parse(response.data)
  } catch (error) {
    console.error("Erreur lors du polling de l'export :", safeErrorMessage(error))
    throw error
  }
}

/**
 * Télécharge le fichier d'un job terminé. `downloadUrl` provient de
 * `ExportJobResponse` et porte déjà le token signé 24h (ex. `/api/export/download/
 * {jobId}?token=…`). `apiClient` ajoutant déjà `/api` via `baseURL`, on retire le
 * préfixe `/api` en tête pour éviter un double `/api/api`. Le cookie JWT est
 * envoyé (`withCredentials`) — défense en profondeur backend (auth + token +
 * ownership). Rejette sur token expiré/altéré (404).
 */
export const downloadAsyncExport = async (downloadUrl: string): Promise<DownloadedFile> => {
  try {
    const path = downloadUrl.replace(/^\/api(?=\/)/, '')
    const response = await apiClient.get(path, { responseType: 'blob' })
    const filename =
      filenameFromDisposition(response.headers?.['content-disposition']) ??
      'mytimeline-export'
    return { blob: response.data as Blob, filename }
  } catch (error) {
    console.error("Erreur lors du téléchargement de l'export :", safeErrorMessage(error))
    throw error
  }
}

/**
 * Déclenche le téléchargement navigateur d'un blob (crée un lien objet éphémère,
 * clic programmatique, révocation). Isolé pour testabilité/réutilisation.
 */
export const triggerBrowserDownload = ({ blob, filename }: DownloadedFile): void => {
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = filename
  document.body.appendChild(anchor)
  anchor.click()
  anchor.remove()
  URL.revokeObjectURL(url)
}
