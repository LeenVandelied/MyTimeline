import type { Meta, StoryObj } from '@storybook/react-vite'
import React, { useLayoutEffect, useMemo, useRef } from 'react'
import { TimelineView } from './TimelineView'
import { buildStressDataset } from './stress-fixtures'
import { STORY_LOCALE, STORY_TODAY, withTimelineIntl } from './fixtures'

/**
 * #69 — BANC DE MESURE de la frise desktop (baseline + après virtualisation).
 *
 * Ces stories ne documentent pas un cas d'usage : ce sont les FIXTURES DE MESURE
 * du critère d'acceptation n°1 de l'issue #69 (« mesure baseline documentée à 500
 * ET 1000 événements »). Elles sont pilotées par un script Playwright externe qui
 * lit `window.__mtTimelinePerf` (protocole décrit dans
 * `docs/adr/ADR-007-virtualisation-timeline.md`, section « Méthodologie »).
 *
 * ⚠ CSF : ce fichier n'exporte QUE des stories (tout export de valeur deviendrait
 * une story fantôme). Le générateur de données vit dans `stress-fixtures.ts`.
 */

/** Relevé publié sur `window` par le harnais, lu par le script de mesure. */
export interface TimelinePerfSample {
  eventCount: number
  laneCount: number
  /** ms de GÉNÉRATION du jeu de données — hors périmètre de la frise. */
  datasetMs: number
  /** ms entre le début du 1er rendu React et la fin du commit DOM (layout). */
  commitMs: number
  /** ms entre le début du 1er rendu et la 2e frame après commit (proxy « peint »). */
  paintedMs: number
  /** Pastilles d'événement réellement présentes dans le DOM. */
  pillsInDom: number
  /** Lanes (produits) réellement présentes dans le DOM. */
  laneRowsInDom: number
  /** Nœuds DOM totaux sous la frise. */
  domNodes: number
}

declare global {
  interface Window {
    __mtTimelinePerf?: TimelinePerfSample
  }
}

interface PerfHarnessProps {
  eventCount: number
  laneCount: number
}

/**
 * Enveloppe de mesure : chronomètre le PREMIER rendu (début de rendu React →
 * `useLayoutEffect`, puis double `requestAnimationFrame` pour approcher la frame
 * peinte) et publie le relevé sur `window.__mtTimelinePerf`.
 */
const PerfHarness: React.FC<PerfHarnessProps> = ({ eventCount, laneCount }) => {
  // Génération du jeu de données MESURÉE À PART : elle n'appartient pas au coût
  // de rendu de la frise (elle simule la réponse réseau déjà désérialisée).
  const { events, resources, datasetMs } = useMemo(() => {
    const t0 = performance.now()
    const data = buildStressDataset({ eventCount, laneCount, today: STORY_TODAY })
    return { ...data, datasetMs: performance.now() - t0 }
  }, [eventCount, laneCount])

  const startedAt = useRef(performance.now())

  useLayoutEffect(() => {
    const commitMs = performance.now() - startedAt.current
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        const root = document.querySelector('[data-testid="timeline-view"]')
        window.__mtTimelinePerf = {
          eventCount,
          laneCount,
          datasetMs,
          commitMs,
          paintedMs: performance.now() - startedAt.current,
          pillsInDom: document.querySelectorAll('[data-testid="timeline-event"]').length,
          laneRowsInDom: document.querySelectorAll('[data-testid="timeline-resource-row"]').length,
          domNodes: root ? root.querySelectorAll('*').length : 0,
        }
      })
    })
  }, [eventCount, laneCount, datasetMs])

  return (
    <TimelineView events={events} resources={resources} locale={STORY_LOCALE} today={STORY_TODAY} />
  )
}

const meta = {
  title: 'Timeline/TimelineView (perf #69)',
  component: PerfHarness,
  decorators: [withTimelineIntl],
  parameters: { layout: 'fullscreen' },
  args: { laneCount: 120 },
} satisfies Meta<typeof PerfHarness>

export default meta
type Story = StoryObj<typeof meta>

/** 500 événements sur 120 lanes — premier palier du critère d'acceptation n°1. */
export const Stress500: Story = { args: { eventCount: 500 } }

/** 1000 événements sur 120 lanes — palier de référence du budget de rendu. */
export const Stress1000: Story = { args: { eventCount: 1000 } }
