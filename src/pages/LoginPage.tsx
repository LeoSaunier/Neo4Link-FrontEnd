import { useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router'
import { api } from '../api'
import { Avatar } from '../components/Avatar'
import { Button, Card, PageHeader } from '../components/ui'
import { DEMO_PASSWORD } from '../config'
import { useCurrentUser } from '../context/currentUser'
import { errorMessage } from '../lib/format'
import { useAsync } from '../lib/useAsync'

const inputClass =
  'w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-neo focus:ring-2 focus:ring-neo/20 focus:outline-none'

/**
 * Connexion (POST /auth/login avec le schéma LoginRequest du back : username + password).
 * En dessous, des boutons de connexion rapide aux comptes de démo, pour changer de compte en un clic
 * pendant la soutenance.
 */
export function LoginPage() {
  const { user: current, login } = useCurrentUser()
  const navigate = useNavigate()
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const demoAccounts = useAsync(() => api.listUsers(), [])

  async function connect(credentials: { username: string; password: string }) {
    setSubmitting(true)
    setError(null)
    try {
      await login(credentials)
      navigate('/')
    } catch (err) {
      setError(errorMessage(err))
      setSubmitting(false)
    }
  }

  function handleSubmit(event: FormEvent) {
    event.preventDefault()
    void connect({ username, password })
  }

  return (
    <div className="space-y-5">
      <PageHeader title="Connexion" subtitle="Le back vérifie le mot de passe haché (bcrypt) stocké dans MongoDB." dbs={['mongodb']} />

      <Card>
        <form onSubmit={handleSubmit} className="space-y-3 p-4">
          <label className="block space-y-1 text-sm">
            <span className="font-medium text-slate-700">Nom d'utilisateur</span>
            <input value={username} onChange={(e) => setUsername(e.target.value)} autoComplete="username" required className={inputClass} />
          </label>
          <label className="block space-y-1 text-sm">
            <span className="font-medium text-slate-700">Mot de passe</span>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
              required
              className={inputClass}
            />
          </label>
          {error && <p className="text-sm text-red-600">{error}</p>}
          <div className="flex items-center justify-between gap-3">
            <Link to="/register" className="text-sm font-medium text-neo hover:underline">
              Créer un compte
            </Link>
            <Button type="submit" disabled={submitting}>
              {submitting ? 'Connexion…' : 'Se connecter'}
            </Button>
          </div>
        </form>
      </Card>

      <section>
        <h2 className="text-sm font-semibold tracking-wide text-slate-500 uppercase">Connexion rapide · comptes de démo</h2>
        <p className="mb-2 text-xs text-slate-400">
          Un clic connecte avec le mot de passe de démo (VITE_DEMO_PASSWORD). Avec le vrai back, il faut que son seed hache ce même mot de passe.
        </p>
        {demoAccounts.error && <p className="text-sm text-slate-500">Liste des comptes indisponible ({demoAccounts.error.message}).</p>}
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          {demoAccounts.data?.map((u) => (
            <button
              key={u._id}
              onClick={() => void connect({ username: u.username, password: DEMO_PASSWORD })}
              disabled={submitting}
              className="text-left disabled:opacity-60"
            >
              <Card className={`flex items-center gap-3 px-3 py-2.5 transition hover:ring-neo ${current?._id === u._id ? 'ring-2 ring-neo' : ''}`}>
                <Avatar id={u._id} name={u.profile.full_name} />
                <div className="min-w-0">
                  <p className="truncate font-semibold text-slate-900">{u.profile.full_name}</p>
                  <p className="truncate text-xs text-slate-500">@{u.username}</p>
                </div>
              </Card>
            </button>
          ))}
        </div>
      </section>
    </div>
  )
}
