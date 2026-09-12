import { z } from 'zod'

/**
 * #59 — Schémas Zod de l'export RGPD, alignés sur le CONTRAT BACKEND FIGÉ #58
 * (`ExportJobResponse`, `ExportFormat`, `ExportJobStatus`). Source de vérité :
 *  - backend `application/dtos/ExportJobResponse.java`
 *  - backend `domain/models/export/ExportFormat.java` / `ExportJobStatus.java`
 *
 * ⚠ Sync Zod ↔ DTO (cf. rule zod-dto-sync) : `downloadUrl` et `expiresAt` sont
 * NULLABLE côté backend (non-null uniquement si `status == COMPLETED`). On utilise
 * donc `.nullable()` (jamais `.nullish()`). `expiresAt` est un `LocalDateTime`
 * sérialisé en ISO-8601 SANS offset de zone (référentiel serveur) — string brute
 * ici, interprétée comme UTC à l'affichage (cf. `ExportDataFlow`).
 */

/**
 * Formats d'export. Valeurs UPPERCASE = noms d'enum backend (paramètre `format`
 * transmis tel quel). JSON/MARKDOWN = synchrones (GET inline) ; ZIP/CSV =
 * asynchrones (POST + polling).
 */
export const EXPORT_FORMATS = ['JSON', 'MARKDOWN', 'ZIP', 'CSV'] as const
export const exportFormatSchema = z.enum(EXPORT_FORMATS)
export type ExportFormat = z.infer<typeof exportFormatSchema>

/** Formats à génération inline (réponse HTTP immédiate). Cf. `ExportFormat.isSync()`. */
const SYNC_FORMATS: readonly ExportFormat[] = ['JSON', 'MARKDOWN']
export const isSyncFormat = (format: ExportFormat): boolean => SYNC_FORMATS.includes(format)

/** Cycle de vie d'un job async : PENDING → RUNNING → COMPLETED | FAILED. */
export const exportJobStatusSchema = z.enum(['PENDING', 'RUNNING', 'COMPLETED', 'FAILED'])
export type ExportJobStatus = z.infer<typeof exportJobStatusSchema>

/** Statuts terminaux (arrêt du polling). */
export const isTerminalStatus = (status: ExportJobStatus): boolean =>
  status === 'COMPLETED' || status === 'FAILED'

/**
 * Projection HTTP d'un job d'export async. Matche `ExportJobResponse` :
 * `jobId` (uuid), `status`, `format` (ZIP|CSV pour un job), `downloadUrl`
 * (nullable), `expiresAt` (nullable, ISO string sans offset).
 */
export const exportJobResponseSchema = z.object({
  jobId: z.string().uuid(),
  status: exportJobStatusSchema,
  format: exportFormatSchema,
  downloadUrl: z.string().nullable(),
  expiresAt: z.string().nullable(),
})
export type ExportJobResponse = z.infer<typeof exportJobResponseSchema>
