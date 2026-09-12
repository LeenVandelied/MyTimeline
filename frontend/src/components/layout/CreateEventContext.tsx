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
 * Hors provider (tests unitaires, montage hors shell), `useOpenCreateEvent()`
 * rend `null` : le consommateur n'affiche alors AUCUN bouton, plutôt qu'un
 * bouton inerte.
 */
const CreateEventContext = createContext<(() => void) | null>(null)

export interface CreateEventProviderProps {
  /** Ouvre le drawer de création du shell. Identité stable attendue. */
  onOpenCreate: () => void
  children: React.ReactNode
}

export function CreateEventProvider({ onOpenCreate, children }: CreateEventProviderProps) {
  return <CreateEventContext.Provider value={onOpenCreate}>{children}</CreateEventContext.Provider>
}

/** Fonction qui ouvre le drawer de création du shell, ou `null` hors shell. */
export function useOpenCreateEvent(): (() => void) | null {
  return useContext(CreateEventContext)
}
