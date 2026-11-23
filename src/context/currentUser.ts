import { createContext, useContext } from 'react'
import type { LoginRequest, RegisterRequest, User } from '../types'

// « Contexte » React = une valeur partagée par tous les composants, sans la passer de parent en enfant.
// Ici : qui est connecté, et qui suit-il (pour afficher les boutons Suivre / Abonné).
// Le composant qui fournit cette valeur est CurrentUserProvider.tsx.

export interface CurrentUserValue {
  /** Utilisateur connecté, ou null. */
  user: User | null
  /** true pendant la reprise de session au chargement de la page. */
  loading: boolean
  error: string | null
  /** Identifiants des personnes que l'utilisateur suit (vient de Neo4j). */
  followingIds: ReadonlySet<string>
  /**
   * Compteur incrémenté à chaque abonnement / désabonnement.
   * Les pages qui dépendent du graphe (fil, suggestions, profils) s'en servent pour se recharger.
   */
  graphVersion: number
  /** Connexion (POST /auth/login). Lève une ApiError si les identifiants sont faux. */
  login(input: LoginRequest): Promise<void>
  /** Inscription (POST /auth/register), puis connexion automatique. */
  register(input: RegisterRequest): Promise<void>
  logout(): void
  retry(): void
  follow(targetId: string): Promise<void>
  unfollow(targetId: string): Promise<void>
}

export const CurrentUserContext = createContext<CurrentUserValue | null>(null)

export function useCurrentUser(): CurrentUserValue {
  const value = useContext(CurrentUserContext)
  if (!value) throw new Error('useCurrentUser doit être utilisé sous <CurrentUserProvider>')
  return value
}

/** Pour les pages réservées à un utilisateur connecté : `user` n'est jamais null. */
export function useLoggedUser() {
  const value = useCurrentUser()
  if (!value.user) throw new Error('Aucun utilisateur connecté')
  return { ...value, user: value.user }
}
