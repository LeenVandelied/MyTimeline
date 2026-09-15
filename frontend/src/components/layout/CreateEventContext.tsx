'use client'

import React, { createContext, useContext } from 'react'

/**
 * #602 — Accès, depuis un écran enveloppé, au déclencheur de création du SHELL.
 *
 * `AppShell` possède l'unique état `showCreate` et l'unique `NewEventDrawer`
 * (montage conditionnel, revue PR #313). Un écran qui veut son propre bouton
 * « Nouvel événement » (la barre d'outils de `/timeline`, DEC-S85-003) ne doit
 * NI dupliquer cet état NI monter un second drawer : il reçoit ici la fonction
 * qui ouvre CELUI du shell.
 *
 * La valeur est la fonction elle-même, d'identité STABLE (`useCallback` à deps
 * vides dans `AppShell`, même motif que `closeCreate`, BUG-S44-001) : un
 * consommateur mémoïsé n'est pas re-rendu quand le shell change de thème ou de
 * pathname.
 *
 * #605 — PRÉREMPLI : `open({ productId })` ouvre le drawer avec ce produit déjà
 * choisi (détail produit, handoff §5). Sans option, le drawer s'ouvre vierge.
 *
 * PIÈGE DU `onClick={open}` : passée telle quelle en gestionnaire, la fonction
 * reçoit l'événement souris comme `options`. Deux gardes, volontairement cumulées :
 *   - au typage, `CreateEventOptions` n'a aucune propriété commune avec un
 *     `MouseEvent` → `tsc` refuse `onClick={open}` (les appelants enveloppent :
 *     `() => open()`) ;
 *   - à l'exécution, le shell normalise l'argument par `toCreateEventPrefill`, qui
 *     n'accepte qu'un objet SIMPLE portant un `productId` chaîne non vide. Un appel
 *     non typé (JS, cast, test) retombe sur un drawer vierge, jamais sur un produit
 *     `undefined` ou un objet événement stocké dans l'état.
 *
 * Hors provider (tests unitaires, montage hors shell), `useOpenCreateEvent()`
 * rend `null` : le consommateur n'affiche alors AUCUN bouton, plutôt qu'un
 * bouton inerte.
 */
export interface CreateEventOptions {
  /** Produit présélectionné dans le drawer (ignoré s'il n'est pas dans la liste chargée). */
  productId?: string
}

export type OpenCreateEvent = (options?: CreateEventOptions) => void

/**
 * Extrait le `productId` d'un argument d'ouverture NON FIABLE. Rend `undefined` pour
 * tout ce qui n'est pas un objet simple (`MouseEvent`, événement synthétique React,
 * `null`, chaîne…) ou dont le `productId` n'est pas une chaîne non vide.
 */
export function toCreateEventPrefill(value: unknown): string | undefined {
  if (typeof value !== 'object' || value === null) return undefined
  const prototype: unknown = Object.getPrototypeOf(value)
  if (prototype !== Object.prototype && prototype !== null) return undefined
  const productId: unknown = (value as { productId?: unknown }).productId
  return typeof productId === 'string' && productId.length > 0 ? productId : undefined
}

const CreateEventContext = createContext<OpenCreateEvent | null>(null)

export interface CreateEventProviderProps {
  /** Ouvre le drawer de création du shell. Identité stable attendue. */
  onOpenCreate: OpenCreateEvent
  children: React.ReactNode
}

export function CreateEventProvider({ onOpenCreate, children }: CreateEventProviderProps) {
  return <CreateEventContext.Provider value={onOpenCreate}>{children}</CreateEventContext.Provider>
}

/** Fonction qui ouvre le drawer de création du shell, ou `null` hors shell. */
export function useOpenCreateEvent(): OpenCreateEvent | null {
  return useContext(CreateEventContext)
}
