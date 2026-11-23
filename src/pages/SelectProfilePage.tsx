import { useState } from 'react'
import { useNavigate } from 'react-router'
import { api } from '../api'
import { Avatar } from '../components/Avatar'
import { CreateUserForm } from '../components/CreateUserForm'
import { PlusIcon } from '../components/icons'
import { Button, Card, ErrorBox, PageHeader, Spinner } from '../components/ui'
import { useCurrentUser } from '../context/currentUser'
import { useAsync } from '../lib/useAsync'
import type { UserSummary } from '../types'

/**
 * Choix du profil. Pas de mot de passe : c'est un prototype de démonstration,
 * on « se connecte en tant que » n'importe quel membre.
 */
export function SelectProfilePage() {
  const { user: current, login } = useCurrentUser()
  const navigate = useNavigate()
  const users = useAsync(() => api.listUsers(), [])
  const [creating, setCreating] = useState(false)

  function choose(id: string) {
    login(id)
    navigate('/')
  }

  // Regroupe les profils par service : { "R&D": [...], "Commercial": [...] }
  const byDepartment = new Map<string, UserSummary[]>()
  for (const u of users.data ?? []) {
    byDepartment.set(u.department, [...(byDepartment.get(u.department) ?? []), u])
  }

  return (
    <div className="space-y-5">
      <PageHeader
        title="Choisissez un profil"
        subtitle="Pas de mot de passe : c'est une démo. Chaque profil est un document MongoDB et un nœud Neo4j."
        dbs={['mongodb']}
      />

      {creating ? (
        <CreateUserForm
          onCancel={() => setCreating(false)}
          onCreated={(user) => {
            login(user.id)
            navigate('/people') // un nouveau profil ne suit personne : direction l'annuaire
          }}
        />
      ) : (
        <Button variant="secondary" onClick={() => setCreating(true)}>
          <PlusIcon className="size-4" /> Créer un nouveau profil
        </Button>
      )}

      {users.loading && !users.data && <Spinner />}
      {users.error && <ErrorBox error={users.error} onRetry={users.reload} />}

      {[...byDepartment.entries()].map(([department, members]) => (
        <section key={department}>
          <h2 className="mb-2 text-sm font-semibold tracking-wide text-slate-500 uppercase">
            {department} · {members.length}
          </h2>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            {members.map((u) => (
              <button key={u.id} onClick={() => choose(u.id)} className="text-left">
                <Card
                  className={`flex items-center gap-3 px-3 py-2.5 transition hover:ring-neo ${
                    current?.id === u.id ? 'ring-2 ring-neo' : ''
                  }`}
                >
                  <Avatar user={u} />
                  <div className="min-w-0">
                    <p className="truncate font-semibold text-slate-900">{u.display_name}</p>
                    <p className="truncate text-xs text-slate-500">{u.job_title}</p>
                  </div>
                </Card>
              </button>
            ))}
          </div>
        </section>
      ))}
    </div>
  )
}
