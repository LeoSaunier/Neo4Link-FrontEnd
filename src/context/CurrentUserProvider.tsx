import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react'
import { api, ApiError } from '../api'
import { errorMessage } from '../lib/format'
import type { UserSummary } from '../types'
import { CurrentUserContext, type CurrentUserValue } from './currentUser'

// Il n'y a pas d'authentification dans ce prototype : on « choisit » un profil,
// et son identifiant est gardé dans le navigateur (localStorage) pour survivre aux rechargements.
const STORAGE_KEY = 'neo4link.currentUserId'

function readStoredId(): string | null {
  try {
    return localStorage.getItem(STORAGE_KEY)
  } catch {
    return null // localStorage peut être bloqué (navigation privée…)
  }
}

function storeId(id: string | null) {
  try {
    if (id) localStorage.setItem(STORAGE_KEY, id)
    else localStorage.removeItem(STORAGE_KEY)
  } catch {
    // tant pis : l'utilisateur devra rechoisir son profil au prochain chargement
  }
}

export function CurrentUserProvider({ children }: { children: ReactNode }) {
  const [userId, setUserId] = useState<string | null>(readStoredId)
  const [user, setUser] = useState<UserSummary | null>(null)
  const [followingIds, setFollowingIds] = useState<ReadonlySet<string>>(new Set())
  const [loading, setLoading] = useState(userId !== null)
  const [error, setError] = useState<string | null>(null)
  const [graphVersion, setGraphVersion] = useState(0)
  const [attempt, setAttempt] = useState(0)

  /** Oublie l'utilisateur courant (déconnexion, ou profil qui n'existe plus). */
  const reset = useCallback(() => {
    storeId(null)
    setUserId(null)
    setUser(null)
    setFollowingIds(new Set())
    setLoading(false)
    setError(null)
  }, [])

  // Quand l'utilisateur choisi change : charger son profil (MongoDB + Neo4j) et ses abonnements (Neo4j).
  // `loading` est passé à true par login() / retry(), avant que cet effet ne démarre.
  useEffect(() => {
    if (!userId) return
    let cancelled = false
    Promise.all([api.getUserProfile(userId), api.getFollowing(userId)])
      .then(([profile, following]) => {
        if (cancelled) return
        setUser(profile)
        setFollowingIds(new Set(following.map((u) => u.id)))
      })
      .catch((err: unknown) => {
        if (cancelled) return
        if (err instanceof ApiError && err.status === 404) {
          // Profil disparu (ex. créé dans l'API simulée avant un rechargement) : on revient au choix du profil.
          reset()
        } else {
          setError(errorMessage(err))
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [userId, attempt, reset])

  const login = useCallback(
    (id: string) => {
      if (id === userId) return
      storeId(id)
      setLoading(true) // évite un instant où user = null alors qu'un profil est en cours de chargement
      setError(null)
      setUserId(id)
    },
    [userId],
  )

  const retry = useCallback(() => {
    setLoading(true)
    setError(null)
    setAttempt((n) => n + 1)
  }, [])

  const follow = useCallback(
    async (targetId: string) => {
      if (!userId) return
      await api.follow(userId, targetId)
      setFollowingIds((previous) => new Set(previous).add(targetId))
      setGraphVersion((v) => v + 1)
    },
    [userId],
  )

  const unfollow = useCallback(
    async (targetId: string) => {
      if (!userId) return
      await api.unfollow(userId, targetId)
      setFollowingIds((previous) => {
        const next = new Set(previous)
        next.delete(targetId)
        return next
      })
      setGraphVersion((v) => v + 1)
    },
    [userId],
  )

  const value = useMemo<CurrentUserValue>(
    () => ({
      user,
      loading,
      error,
      followingIds,
      graphVersion,
      login,
      logout: reset,
      retry,
      follow,
      unfollow,
    }),
    [user, loading, error, followingIds, graphVersion, login, reset, retry, follow, unfollow],
  )

  return <CurrentUserContext.Provider value={value}>{children}</CurrentUserContext.Provider>
}
