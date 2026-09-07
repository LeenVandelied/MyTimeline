import { describe, it, expect } from 'vitest'
import type { AxiosAdapter, AxiosResponse, InternalAxiosRequestConfig } from 'axios'
import apiClient from '@/services/apiClient'

/**
 * #215 — Garde de non-régression sur le traitement des corps `FormData`.
 *
 * LE DÉFAUT COUVERT. `apiClient` pose `Content-Type: application/json` au niveau
 * de l'instance. Pour un corps `FormData`, axios ne se contente pas de laisser
 * l'en-tête : son `transformRequest` par défaut fait
 * `hasJSONContentType ? JSON.stringify(formDataToJSON(data)) : data`. Le fichier
 * était donc converti en JSON et jamais envoyé comme fichier ; `POST
 * /api/me/avatar` (`consumes = multipart/form-data`) répondait **415**. Le
 * symptôme était muet côté client (aucune exception, juste une erreur serveur),
 * et le seul autre garde-fou était un E2E — resté `test.fixme` des mois durant.
 *
 * ON MESURE LA SORTIE DU PIPELINE, PAS L'INTERCEPTEUR. Un adaptateur factice
 * capture la config APRÈS les intercepteurs de requête ET après
 * `transformRequest` : c'est le seul point où « le fichier est-il toujours un
 * fichier ? » a un sens.
 */

interface CapturedRequest {
  readonly config: InternalAxiosRequestConfig
}

const captureRequest = async (url: string, body: unknown): Promise<CapturedRequest> => {
  const previousAdapter = apiClient.defaults.adapter
  let captured: InternalAxiosRequestConfig | null = null

  const spyAdapter: AxiosAdapter = (config) => {
    captured = config
    const response: AxiosResponse = {
      data: {},
      status: 200,
      statusText: 'OK',
      headers: {},
      config,
    }
    return Promise.resolve(response)
  }

  apiClient.defaults.adapter = spyAdapter
  try {
    await apiClient.post(url, body)
  } finally {
    apiClient.defaults.adapter = previousAdapter
  }

  if (captured === null) throw new Error("l'adaptateur factice n'a pas été appelé")
  return { config: captured }
}

describe('apiClient — corps multipart (FormData)', () => {
  it("n'envoie PAS un FormData en application/json (sinon 415 backend)", async () => {
    const formData = new FormData()
    formData.append('file', new Blob([new Uint8Array([1, 2, 3])], { type: 'image/png' }), 'a.png')

    const { config } = await captureRequest('/me/avatar', formData)

    // 1. L'en-tête JSON de l'instance a été retiré.
    //
    //    ⚠ CE QU'ON N'ASSERTE PAS, ET POURQUOI. À ce point du pipeline le
    //    Content-Type vaut `application/x-www-form-urlencoded` : `dispatchRequest`
    //    pose ce défaut sur tout POST/PUT/PATCH dépourvu d'en-tête (en mode
    //    « ne pas écraser »). Ce n'est PAS ce qui part sur le réseau — l'étape
    //    suivante, `helpers/resolveConfig.js`, fait `setContentType(undefined)`
    //    pour un corps FormData afin que le navigateur pose lui-même
    //    `multipart/form-data` AVEC la boundary. Cette étape appartient aux
    //    adaptateurs xhr/fetch, que l'adaptateur factice court-circuite : asserter
    //    `multipart` ici mesurerait le faux étage. L'en-tête réellement émis est
    //    couvert par l'E2E `settings-profile.spec.ts` (navigateur réel).
    //
    //    La régression à empêcher est le RETOUR du JSON, seul cas qui détruit le
    //    corps (cf. assertion 2). C'est donc exactement ce qu'on asserte.
    expect(config.headers.getContentType()).not.toContain('application/json')

    // 2. Le corps est TOUJOURS un FormData. C'est l'assertion qui compte : si
    //    l'en-tête JSON revenait, axios aurait déjà remplacé le fichier par une
    //    chaîne JSON ici.
    expect(config.data).toBeInstanceOf(FormData)
    expect(typeof config.data).not.toBe('string')
  })

  it('neutralise le timeout global sur un FormData (#76 — upload lent légitime)', async () => {
    const formData = new FormData()
    formData.append('file', new Blob(['x']), 'a.png')

    const { config } = await captureRequest('/me/avatar', formData)

    expect(config.timeout).toBe(0)
  })

  it('laisse INTACTS les appels JSON (la suppression est bornée au FormData)', async () => {
    const { config } = await captureRequest('/me', { name: 'Ada' })

    expect(config.headers.getContentType()).toContain('application/json')
    expect(config.data).toBe(JSON.stringify({ name: 'Ada' }))
    // Le timeout par défaut (#76) n'est pas neutralisé hors multipart.
    expect(config.timeout).toBeGreaterThan(0)
  })
})
