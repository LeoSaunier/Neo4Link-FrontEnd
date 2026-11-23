import { useSyncExternalStore } from 'react'
import type { DbTraceEntry } from '../types'

// Journal des requêtes HTTP envoyées par le front, affiché dans le panneau « Coulisses ».
// Chaque appel à l'API (réelle ou simulée) ajoute une entrée ici.
//
// C'est un petit "store" en dehors de React : une liste + des abonnés.
// Les composants le lisent avec le hook useTraces(), qui les redessine à chaque ajout.

export interface RequestTrace {
  id: number
  method: string
  path: string
  /** Code HTTP, ou 'réseau' si le back n'a pas répondu du tout. */
  status: number | 'réseau'
  /** Durée totale vue par le navigateur. */
  duration_ms: number
  at: Date
  source: 'mock' | 'api'
  /** Détail des requêtes en base, ou null si le back ne l'a pas fourni (en-tête X-Db-Trace). */
  db: DbTraceEntry[] | null
}

const MAX_ENTRIES = 50

let entries: RequestTrace[] = []
let nextId = 1
const listeners = new Set<() => void>()

function notify() {
  for (const listener of listeners) listener()
}

export function addTrace(trace: Omit<RequestTrace, 'id' | 'at'>) {
  // On crée un nouveau tableau (au lieu de modifier l'ancien) pour que React voie le changement.
  entries = [{ ...trace, id: nextId++, at: new Date() }, ...entries].slice(0, MAX_ENTRIES)
  notify()
}

export function clearTraces() {
  entries = []
  notify()
}

function subscribe(listener: () => void) {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}

function getSnapshot() {
  return entries
}

/** Hook React : renvoie la liste des requêtes, la plus récente en premier. */
export function useTraces() {
  return useSyncExternalStore(subscribe, getSnapshot)
}
