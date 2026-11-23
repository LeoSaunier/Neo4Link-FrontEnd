import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react'
import { api, ApiError } from '../api'
import { errorMessage } from '../lib/format'
import type { LoginRequest, RegisterRequest, User } from '../types'
import { CurrentUserContext, type CurrentUserValue } from './currentUser'

// Après la connexion, l'identifiant de l'utilisateur est gardé dans le navigateur (localStorage)
// pour que la session survive à un rechargement de la page.
// Le back n'utilise pas de jeton : les requêtes envoient simplement cet identifiant (author_id, user_id).
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
    // tant pis : il faudra se reconnecter au prochain chargement
  }
}

export function CurrentUserProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [followingIds, setFollowingIds] = useState<ReadonlySet<string>>(new Set())
  const [loading, setLoading] = useState(() => readStoredId() !== null)
  const [error, setError] = useState<string | null>(null)
  const [graphVersion, setGraphVersion] = useState(0)
  const [attempt, setAttempt] = useState(0)

  /** Oublie l'utilisateur courant (déconnexion, ou compte qui n'existe plus). */
  const reset = useCallback(() => {
    storeId(null)
    setUser(null)
    setFollowingIds(new Set())
    setLoading(false)
    setError(null)
  }, [])

  /** Ouvre la session : mémorise l'utilisateur et charge ses abonnements depuis Neo4j. */
  const openSession = useCallback(async (loggedUser: User) => {
    const following = await api.getFollowing(loggedUser._id)
    storeId(loggedUser._id)
    setUser(loggedUser)
    setFollowingIds(new Set(following.map((u) => u._id)))
    setError(null)
  }, [])

  // Au chargement de la page : reprendre la session enregistrée, s'il y en a une.
  useEffect(() => {
    const storedId = readStoredId()
    if (!storedId) return
    let cancelled = false
    Promise.all([api.getUser(storedId), api.getFollowing(storedId)])
      .then(([storedUser, following]) => {
        if (cancelled) return
        setUser(storedUser)
        setFollowingIds(new Set(following.map((u) => u._id)))
      })
      .catch((err: unknown) => {
        if (cancelled) return
        if (err instanceof ApiError && err.status === 404) {
          reset() // compte disparu (ex. créé dans l'API simulée avant un rechargement)
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
  }, [attempt, reset])

  const login = useCallback(
    async (input: LoginRequest) => {
      const loggedUser = await api.login(input) // lève une ApiError si les identifiants sont faux
      await openSession(loggedUser)
    },
    [openSession],
  )

  const register = useCallback(
    async (input: RegisterRequest) => {
      const newUser = await api.register(input)
      await openSession(newUser)
    },
    [openSession],
  )

  const retry = useCallback(() => {
    setLoading(true)
    setError(null)
    setAttempt((n) => n + 1)
  }, [])

  const userId = user?._id

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
    () => ({ user, loading, error, followingIds, graphVersion, login, register, logout: reset, retry, follow, unfollow }),
    [user, loading, error, followingIds, graphVersion, login, register, reset, retry, follow, unfollow],
  )

  return <CurrentUserContext.Provider value={value}>{children}</CurrentUserContext.Provider>
}
