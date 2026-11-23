import { Navigate, Outlet } from 'react-router'
import { useCurrentUser } from '../context/currentUser'
import { ErrorBox, Spinner } from './ui'

/** Protège les pages qui ont besoin d'un profil choisi : sinon, redirection vers /login. */
export function RequireUser() {
  const { user, loading, error, retry } = useCurrentUser()
  if (loading) return <Spinner label="Chargement du profil…" />
  if (error) return <ErrorBox error={error} onRetry={retry} />
  if (!user) return <Navigate to="/login" replace />
  return <Outlet />
}
